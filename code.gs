/**
 * SiWarga RT/RW - Entry Point, Helper Global, Autentikasi, & Endpoint Kependudukan (Phase 2)
 */

var SESSION_TTL_MS_ = 8 * 60 * 60 * 1000;
var CACHE_TTL_SEC_ = 21600;
var LOCKOUT_DURATION_MS_ = 15 * 60 * 1000;
var MAX_PIN_ATTEMPTS_ = 5;

function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  var template = HtmlService.createTemplateFromFile('index');
  template.initialPage = params.page ? String(params.page) : '';
  template.initialKode = params.kode ? String(params.kode) : '';
  template.initialId = params.id ? String(params.id) : '';
  template.appUrl = getAppUrl_();

  return template.evaluate()
    .setTitle('SiWarga RT/RW')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Menyertakan file HTML parsial ke dalam template utama.
 * @param {string} filename Nama file HTML tanpa ekstensi.
 * @return {string} Konten HTML parsial.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/* ==========================================================================
   Shared Server Helpers (Dipakai oleh setup.gs, code.gs, service_*.gs)
   ========================================================================== */

function getSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty('SPREADSHEET_ID');
  if (ssId) {
    return SpreadsheetApp.openById(ssId);
  }
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    return active;
  }
  throw new Error('Konfigurasi SPREADSHEET_ID belum diatur di Script Properties.');
}

function getDriveFolderBukti_() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty('DRIVE_FOLDER_BUKTI_ID');
  if (!folderId) {
    throw new Error('Konfigurasi DRIVE_FOLDER_BUKTI_ID belum diatur di Script Properties.');
  }
  return DriveApp.getFolderById(folderId);
}

function getAppUrl_() {
  var props = PropertiesService.getScriptProperties();
  var configured = props.getProperty('WEBAPP_URL');
  if (configured) {
    return String(configured).replace(/\/+$/, '');
  }
  try {
    var svcUrl = ScriptApp.getService().getUrl();
    return svcUrl ? String(svcUrl).replace(/\/+$/, '') : '';
  } catch (e) {
    return '';
  }
}

function nowJakarta_() {
  return Utilities.formatDate(new Date(), 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ss'+07:00'");
}

function formatDateTimeJakarta_(dateObj) {
  return Utilities.formatDate(dateObj, 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ss'+07:00'");
}

function todayJakarta_() {
  return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
}

function currentPeriodeJakarta_() {
  return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM');
}

function readRows_(sheetName) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) {
    return [];
  }
  var values = sheet.getDataRange().getDisplayValues();
  return values.slice(1);
}

function appendRowFormatted_(sheetName, rowArray) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet ' + sheetName + ' belum tersedia.');
  }
  var nextRow = Math.max(sheet.getLastRow(), 1) + 1;
  var normalized = rowArray.map(function(cell) {
    return cell === null || cell === undefined ? '' : String(cell);
  });
  var range = sheet.getRange(nextRow, 1, 1, normalized.length);
  if (typeof range.setNumberFormat === 'function') {
    range.setNumberFormat('@');
  }
  range.setValues([normalized]);
  return nextRow;
}

function updateRowFormatted_(sheetName, sheetRowNumber, rowArray) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet ' + sheetName + ' belum tersedia.');
  }
  var normalized = rowArray.map(function(cell) {
    return cell === null || cell === undefined ? '' : String(cell);
  });
  var range = sheet.getRange(sheetRowNumber, 1, 1, normalized.length);
  if (typeof range.setNumberFormat === 'function') {
    range.setNumberFormat('@');
  }
  range.setValues([normalized]);
}

function nextTableId_(sheetName) {
  var rows = readRows_(sheetName);
  var maxId = 0;
  for (var i = 0; i < rows.length; i++) {
    var idNum = parseInt(rows[i][0], 10);
    if (!isNaN(idNum) && idNum > maxId) {
      maxId = idNum;
    }
  }
  return maxId + 1;
}

function generateRandomDigits_(len) {
  var out = '';
  for (var i = 0; i < len; i++) {
    out += String(Math.floor(Math.random() * 10));
  }
  return out;
}

function generateRandomCode_(len) {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var out = '';
  for (var i = 0; i < len; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

function getPinPepper_() {
  var props = PropertiesService.getScriptProperties();
  return props.getProperty('PIN_PEPPER') || 'siwarga-default-pepper-rt-rw-2025';
}

function bytesToHex_(bytes) {
  var hex = [];
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
    var h = b.toString(16);
    hex.push(h.length === 1 ? '0' + h : h);
  }
  return hex.join('');
}

function hashPinWithSalt_(pin, salt) {
  var pepper = getPinPepper_();
  var current = String(salt || '') + ':' + pepper + ':' + String(pin || '');
  for (var i = 0; i < 1000; i++) {
    var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, current, Utilities.Charset.UTF_8);
    current = bytesToHex_(digest);
  }
  return current;
}

function verifyPin_(pin, salt, expectedHash) {
  var computed = hashPinWithSalt_(pin, salt);
  var a = String(computed || '');
  var b = String(expectedHash || '');
  if (a.length !== b.length || a.length === 0) {
    return false;
  }
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function hasJabatan_(user, keyword) {
  if (!user || !user.jabatan) {
    return false;
  }
  return String(user.jabatan).toLowerCase().indexOf(String(keyword || '').toLowerCase()) !== -1;
}

function apiError_(err) {
  var msg = err && err.message ? String(err.message) : String(err || 'Terjadi kesalahan pada server.');
  var code = 'SERVER_ERROR';
  if (msg.indexOf('UNAUTHORIZED:') === 0) {
    code = 'UNAUTHORIZED';
    msg = msg.replace(/^UNAUTHORIZED:\s*/, '');
  } else if (msg.indexOf('FORBIDDEN:') === 0) {
    code = 'FORBIDDEN';
    msg = msg.replace(/^FORBIDDEN:\s*/, '');
  }
  return {
    ok: false,
    code: code,
    error: msg
  };
}

/* ==========================================================================
   Serializers & Lookup Helpers (Internal)
   ========================================================================== */

function toIntOrNull_(val) {
  if (val === '' || val === null || val === undefined) {
    return null;
  }
  var n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

function toStrOrNull_(val) {
  if (val === '' || val === null || val === undefined) {
    return null;
  }
  return String(val);
}

function serializeRw_(row) {
  return {
    id: parseInt(row[COL.RW.ID], 10),
    nomorRw: String(row[COL.RW.NOMOR_RW] || ''),
    namaKelurahan: String(row[COL.RW.NAMA_KELURAHAN] || ''),
    namaKecamatan: String(row[COL.RW.NAMA_KECAMATAN] || ''),
    createdAt: String(row[COL.RW.CREATED_AT] || '')
  };
}

function serializeRt_(row) {
  return {
    id: parseInt(row[COL.RT.ID], 10),
    rwId: parseInt(row[COL.RT.RW_ID], 10),
    nomorRt: String(row[COL.RT.NOMOR_RT] || ''),
    createdAt: String(row[COL.RT.CREATED_AT] || '')
  };
}

function serializeKk_(row) {
  return {
    id: parseInt(row[COL.KARTU_KELUARGA.ID], 10),
    noKk: String(row[COL.KARTU_KELUARGA.NO_KK] || ''),
    rtId: parseInt(row[COL.KARTU_KELUARGA.RT_ID], 10),
    alamat: String(row[COL.KARTU_KELUARGA.ALAMAT] || ''),
    blok: String(row[COL.KARTU_KELUARGA.BLOK] || ''),
    statusHunian: String(row[COL.KARTU_KELUARGA.STATUS_HUNIAN] || ''),
    createdAt: String(row[COL.KARTU_KELUARGA.CREATED_AT] || '')
  };
}

function serializePendudukSafe_(row) {
  return {
    id: parseInt(row[COL.PENDUDUK.ID], 10),
    nik: String(row[COL.PENDUDUK.NIK] || ''),
    kkId: parseInt(row[COL.PENDUDUK.KK_ID], 10),
    nama: String(row[COL.PENDUDUK.NAMA] || ''),
    tempatLahir: String(row[COL.PENDUDUK.TEMPAT_LAHIR] || ''),
    tanggalLahir: String(row[COL.PENDUDUK.TANGGAL_LAHIR] || ''),
    jenisKelamin: String(row[COL.PENDUDUK.JENIS_KELAMIN] || ''),
    hubunganKeluarga: String(row[COL.PENDUDUK.HUBUNGAN_KELUARGA] || ''),
    isKepalaKeluarga: String(row[COL.PENDUDUK.IS_KEPALA_KELUARGA]) === 'true',
    statusMutasi: String(row[COL.PENDUDUK.STATUS_MUTASI] || ''),
    role: String(row[COL.PENDUDUK.ROLE] || 'WARGA'),
    jabatan: toStrOrNull_(row[COL.PENDUDUK.JABATAN]),
    createdAt: String(row[COL.PENDUDUK.CREATED_AT] || ''),
    updatedAt: String(row[COL.PENDUDUK.UPDATED_AT] || '')
  };
}

function serializeSurat_(row, pendudukById) {
  var pemohonId = parseInt(row[COL.PENGAJUAN_SURAT.PEMOHON_ID], 10);
  var diajukanOlehId = parseInt(row[COL.PENGAJUAN_SURAT.DIAJUKAN_OLEH_ID], 10);
  var rtOlehId = toIntOrNull_(row[COL.PENGAJUAN_SURAT.DISETUJUI_RT_OLEH_ID]);
  var rwOlehId = toIntOrNull_(row[COL.PENGAJUAN_SURAT.DISAHKAN_RW_OLEH_ID]);

  var pemohon = pendudukById[pemohonId] || null;
  var diajukanOleh = pendudukById[diajukanOlehId] || null;
  var rtOleh = rtOlehId ? pendudukById[rtOlehId] : null;
  var rwOleh = rwOlehId ? pendudukById[rwOlehId] : null;

  return {
    id: parseInt(row[COL.PENGAJUAN_SURAT.ID], 10),
    nomorSurat: toStrOrNull_(row[COL.PENGAJUAN_SURAT.NOMOR_SURAT]),
    jenis: String(row[COL.PENGAJUAN_SURAT.JENIS] || ''),
    pemohonId: pemohonId,
    diajukanOlehId: diajukanOlehId,
    modeAsistensi: String(row[COL.PENGAJUAN_SURAT.MODE_ASISTENSI]) === 'true',
    keperluan: String(row[COL.PENGAJUAN_SURAT.KEPERLUAN] || ''),
    status: String(row[COL.PENGAJUAN_SURAT.STATUS] || ''),
    alasanTolak: toStrOrNull_(row[COL.PENGAJUAN_SURAT.ALASAN_TOLAK]),
    disetujuiRtOlehId: rtOlehId,
    disetujuiRtAt: toStrOrNull_(row[COL.PENGAJUAN_SURAT.DISETUJUI_RT_AT]),
    disahkanRwOlehId: rwOlehId,
    disahkanRwAt: toStrOrNull_(row[COL.PENGAJUAN_SURAT.DISAHKAN_RW_AT]),
    kodeVerifikasi: toStrOrNull_(row[COL.PENGAJUAN_SURAT.KODE_VERIFIKASI]),
    createdAt: String(row[COL.PENGAJUAN_SURAT.CREATED_AT] || ''),
    updatedAt: String(row[COL.PENGAJUAN_SURAT.UPDATED_AT] || ''),
    pemohonNama: pemohon ? pemohon.nama : null,
    diajukanOlehNama: diajukanOleh ? diajukanOleh.nama : null,
    disetujuiRtNama: rtOleh ? rtOleh.nama : null,
    disetujuiRtJabatan: rtOleh ? rtOleh.jabatan : null,
    disahkanRwNama: rwOleh ? rwOleh.nama : null,
    disahkanRwJabatan: rwOleh ? rwOleh.jabatan : null
  };
}

function serializeIuran_(row) {
  return {
    id: parseInt(row[COL.IURAN.ID], 10),
    kkId: parseInt(row[COL.IURAN.KK_ID], 10),
    periode: String(row[COL.IURAN.PERIODE] || ''),
    nominal: parseInt(row[COL.IURAN.NOMINAL], 10) || 0,
    metodeBayar: String(row[COL.IURAN.METODE_BAYAR] || 'TRANSFER_BANK'),
    buktiFileId: toStrOrNull_(row[COL.IURAN.BUKTI_FILE_ID]),
    buktiNama: toStrOrNull_(row[COL.IURAN.BUKTI_NAMA]),
    buktiKey: toStrOrNull_(row[COL.IURAN.BUKTI_NAMA]),
    status: String(row[COL.IURAN.STATUS] || ''),
    diajukanOlehId: parseInt(row[COL.IURAN.DIAJUKAN_OLEH_ID], 10),
    diverifikasiOlehId: toIntOrNull_(row[COL.IURAN.DIVERIFIKASI_OLEH_ID]),
    verifiedAt: toStrOrNull_(row[COL.IURAN.VERIFIED_AT]),
    alasanTolak: toStrOrNull_(row[COL.IURAN.ALASAN_TOLAK]),
    createdAt: String(row[COL.IURAN.CREATED_AT] || '')
  };
}

function serializeSetoran_(row) {
  return {
    id: parseInt(row[COL.SETORAN_KAS.ID], 10),
    rtId: parseInt(row[COL.SETORAN_KAS.RT_ID], 10),
    rwId: parseInt(row[COL.SETORAN_KAS.RW_ID], 10),
    tanggal: String(row[COL.SETORAN_KAS.TANGGAL] || ''),
    nominal: parseInt(row[COL.SETORAN_KAS.NOMINAL], 10) || 0,
    status: String(row[COL.SETORAN_KAS.STATUS] || ''),
    dikirimOlehId: parseInt(row[COL.SETORAN_KAS.DIKIRIM_OLEH_ID], 10),
    dikonfirmasiOlehId: toIntOrNull_(row[COL.SETORAN_KAS.DIKONFIRMASI_OLEH_ID]),
    dikonfirmasiAt: toStrOrNull_(row[COL.SETORAN_KAS.DIKONFIRMASI_AT]),
    createdAt: String(row[COL.SETORAN_KAS.CREATED_AT] || '')
  };
}

function serializeKasRt_(row) {
  return {
    id: parseInt(row[COL.KAS_RT.ID], 10),
    rtId: parseInt(row[COL.KAS_RT.RT_ID], 10),
    tanggal: String(row[COL.KAS_RT.TANGGAL] || ''),
    jenis: String(row[COL.KAS_RT.JENIS] || ''),
    kategori: String(row[COL.KAS_RT.KATEGORI] || ''),
    nominal: parseInt(row[COL.KAS_RT.NOMINAL], 10) || 0,
    keterangan: toStrOrNull_(row[COL.KAS_RT.KETERANGAN]),
    iuranId: toIntOrNull_(row[COL.KAS_RT.IURAN_ID]),
    setoranKasId: toIntOrNull_(row[COL.KAS_RT.SETORAN_KAS_ID]),
    dicatatOlehId: parseInt(row[COL.KAS_RT.DICATAT_OLEH_ID], 10),
    createdAt: String(row[COL.KAS_RT.CREATED_AT] || '')
  };
}

function serializePengumuman_(row, pendudukById) {
  var dibuatOlehId = parseInt(row[COL.PENGUMUMAN.DIBUAT_OLEH_ID], 10);
  var author = pendudukById[dibuatOlehId] || null;
  return {
    id: parseInt(row[COL.PENGUMUMAN.ID], 10),
    rwId: parseInt(row[COL.PENGUMUMAN.RW_ID], 10),
    rtId: toIntOrNull_(row[COL.PENGUMUMAN.RT_ID]),
    lingkup: String(row[COL.PENGUMUMAN.LINGKUP] || ''),
    judul: String(row[COL.PENGUMUMAN.JUDUL] || ''),
    isi: String(row[COL.PENGUMUMAN.ISI] || ''),
    dibuatOlehId: dibuatOlehId,
    dibuatOlehNama: author ? author.nama : null,
    createdAt: String(row[COL.PENGUMUMAN.CREATED_AT] || '')
  };
}

function serializeLaporan_(row, pendudukById) {
  var pelaporId = parseInt(row[COL.LAPORAN_WARGA.PELAPOR_ID], 10);
  var pelapor = pendudukById[pelaporId] || null;
  return {
    id: parseInt(row[COL.LAPORAN_WARGA.ID], 10),
    rtId: parseInt(row[COL.LAPORAN_WARGA.RT_ID], 10),
    jenis: String(row[COL.LAPORAN_WARGA.JENIS] || ''),
    judul: String(row[COL.LAPORAN_WARGA.JUDUL] || ''),
    isi: String(row[COL.LAPORAN_WARGA.ISI] || ''),
    pelaporId: pelaporId,
    pelaporNama: pelapor ? pelapor.nama : null,
    createdAt: String(row[COL.LAPORAN_WARGA.CREATED_AT] || '')
  };
}

function loadContextMaps_() {
  var rwRows = readRows_(SHEET_NAMES.RW);
  var rtRows = readRows_(SHEET_NAMES.RT);
  var kkRows = readRows_(SHEET_NAMES.KARTU_KELUARGA);
  var pRows = readRows_(SHEET_NAMES.PENDUDUK);

  var rwById = {};
  for (var i = 0; i < rwRows.length; i++) {
    var rwObj = serializeRw_(rwRows[i]);
    rwById[rwObj.id] = rwObj;
  }

  var rtById = {};
  var rtList = [];
  for (var r = 0; r < rtRows.length; r++) {
    var rtObj = serializeRt_(rtRows[r]);
    rtById[rtObj.id] = rtObj;
    rtList.push(rtObj);
  }

  var kkById = {};
  var kkList = [];
  for (var k = 0; k < kkRows.length; k++) {
    var kkObj = serializeKk_(kkRows[k]);
    kkById[kkObj.id] = kkObj;
    kkList.push(kkObj);
  }

  var pendudukById = {};
  var pendudukList = [];
  for (var p = 0; p < pRows.length; p++) {
    var pObj = serializePendudukSafe_(pRows[p]);
    pendudukById[pObj.id] = pObj;
    pendudukList.push(pObj);
  }

  return {
    rwById: rwById,
    rtById: rtById,
    rtList: rtList,
    kkById: kkById,
    kkList: kkList,
    pendudukById: pendudukById,
    pendudukList: pendudukList
  };
}

function buildEnrichedUser_(pObj, maps) {
  var kk = maps.kkById[pObj.kkId] || null;
  var rt = kk ? (maps.rtById[kk.rtId] || null) : null;
  var rw = rt ? (maps.rwById[rt.rwId] || null) : null;
  return {
    id: pObj.id,
    nik: pObj.nik,
    kkId: pObj.kkId,
    nama: pObj.nama,
    tempatLahir: pObj.tempatLahir,
    tanggalLahir: pObj.tanggalLahir,
    jenisKelamin: pObj.jenisKelamin,
    hubunganKeluarga: pObj.hubunganKeluarga,
    isKepalaKeluarga: pObj.isKepalaKeluarga,
    statusMutasi: pObj.statusMutasi,
    role: pObj.role,
    jabatan: pObj.jabatan,
    kk: kk,
    rt: rt,
    rw: rw,
    rtId: rt ? rt.id : null,
    rwId: rw ? rw.id : null
  };
}

/* ==========================================================================
   Session Validation & Server Aggregations
   ========================================================================== */

function requireSession_(token, allowedRoles) {
  var cleanToken = String(token || '').trim();
  if (!cleanToken) {
    throw new Error('UNAUTHORIZED: Sesi tidak ditemukan. Silakan masuk kembali.');
  }

  var sessionInfo = null;
  var cache = CacheService.getScriptCache();
  var cachedRaw = cache.get('sess_' + cleanToken);
  if (cachedRaw) {
    try {
      sessionInfo = JSON.parse(cachedRaw);
    } catch (e) {
      sessionInfo = null;
    }
  }

  if (!sessionInfo) {
    var sesiRows = readRows_(SHEET_NAMES.SESI);
    for (var i = sesiRows.length - 1; i >= 0; i--) {
      if (String(sesiRows[i][COL.SESI.TOKEN]) === cleanToken) {
        sessionInfo = {
          pendudukId: parseInt(sesiRows[i][COL.SESI.PENDUDUK_ID], 10),
          role: String(sesiRows[i][COL.SESI.ROLE] || ''),
          rtId: toIntOrNull_(sesiRows[i][COL.SESI.RT_ID]),
          rwId: toIntOrNull_(sesiRows[i][COL.SESI.RW_ID]),
          expiredAt: String(sesiRows[i][COL.SESI.EXPIRED_AT] || '')
        };
        break;
      }
    }
  }

  if (!sessionInfo || !sessionInfo.pendudukId || !sessionInfo.expiredAt) {
    throw new Error('UNAUTHORIZED: Sesi tidak valid. Silakan masuk kembali.');
  }

  var expMs = new Date(sessionInfo.expiredAt).getTime();
  if (isNaN(expMs) || Date.now() > expMs) {
    cache.remove('sess_' + cleanToken);
    throw new Error('UNAUTHORIZED: Sesi telah berakhir. Silakan masuk kembali.');
  }

  var maps = loadContextMaps_();
  var pObj = maps.pendudukById[sessionInfo.pendudukId];
  if (!pObj || pObj.statusMutasi !== 'AKTIF') {
    cache.remove('sess_' + cleanToken);
    throw new Error('UNAUTHORIZED: Akun tidak aktif atau tidak ditemukan.');
  }

  var user = buildEnrichedUser_(pObj, maps);
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (allowedRoles.indexOf(user.role) === -1) {
      throw new Error('FORBIDDEN: Peran Anda tidak memiliki akses ke fitur ini.');
    }
  }

  return user;
}

function computeRtSaldoServer_(rtId) {
  var rows = readRows_(SHEET_NAMES.KAS_RT);
  var targetRt = String(rtId);
  var pemasukan = 0;
  var pengeluaran = 0;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][COL.KAS_RT.RT_ID]) === targetRt) {
      var nom = parseInt(rows[i][COL.KAS_RT.NOMINAL], 10) || 0;
      var jenis = String(rows[i][COL.KAS_RT.JENIS]);
      if (jenis === 'PEMASUKAN') {
        pemasukan += nom;
      } else if (jenis === 'PENGELUARAN') {
        pengeluaran += nom;
      }
    }
  }
  return {
    pemasukan: pemasukan,
    pengeluaran: pengeluaran,
    saldo: pemasukan - pengeluaran
  };
}

function computeRwSaldoServer_(rwId) {
  var rows = readRows_(SHEET_NAMES.SETORAN_KAS);
  var terkonfirmasi = 0;
  var menunggu = 0;
  for (var i = 0; i < rows.length; i++) {
    if (rwId !== undefined && rwId !== null && String(rows[i][COL.SETORAN_KAS.RW_ID]) !== String(rwId)) {
      continue;
    }
    var nom = parseInt(rows[i][COL.SETORAN_KAS.NOMINAL], 10) || 0;
    var status = String(rows[i][COL.SETORAN_KAS.STATUS]);
    if (status === 'TERKONFIRMASI') {
      terkonfirmasi += nom;
    } else if (status === 'MENUNGGU_KONFIRMASI') {
      menunggu += nom;
    }
  }
  return {
    pemasukan: terkonfirmasi,
    pengeluaran: 0,
    saldo: terkonfirmasi,
    menungguKonfirmasi: menunggu
  };
}

function computeRekapAntarRtServer_(rwId) {
  var rtRows = readRows_(SHEET_NAMES.RT).map(serializeRt_);
  if (rwId !== undefined && rwId !== null) {
    rtRows = rtRows.filter(function(r) { return r.rwId === Number(rwId); });
  }
  rtRows.sort(function(a, b) {
    return String(a.nomorRt).localeCompare(String(b.nomorRt));
  });

  var kkRows = readRows_(SHEET_NAMES.KARTU_KELUARGA).map(serializeKk_);
  var pRows = readRows_(SHEET_NAMES.PENDUDUK).map(serializePendudukSafe_);
  var kasRows = readRows_(SHEET_NAMES.KAS_RT);

  var saldoByRt = {};
  for (var k = 0; k < kasRows.length; k++) {
    var kRtId = parseInt(kasRows[k][COL.KAS_RT.RT_ID], 10);
    var nom = parseInt(kasRows[k][COL.KAS_RT.NOMINAL], 10) || 0;
    var jenis = String(kasRows[k][COL.KAS_RT.JENIS]);
    if (!saldoByRt[kRtId]) {
      saldoByRt[kRtId] = 0;
    }
    saldoByRt[kRtId] += (jenis === 'PEMASUKAN' ? nom : -nom);
  }

  var result = [];
  for (var i = 0; i < rtRows.length; i++) {
    var rt = rtRows[i];
    var kkMap = {};
    var jumlahKk = 0;
    for (var j = 0; j < kkRows.length; j++) {
      if (kkRows[j].rtId === rt.id) {
        kkMap[kkRows[j].id] = kkRows[j];
        jumlahKk++;
      }
    }
    var jiwaAktif = 0;
    var jiwaTetap = 0;
    var jiwaKontrak = 0;
    for (var m = 0; m < pRows.length; m++) {
      var p = pRows[m];
      var pKk = kkMap[p.kkId];
      if (pKk && p.statusMutasi === 'AKTIF') {
        jiwaAktif++;
        if (pKk.statusHunian === 'TETAP') {
          jiwaTetap++;
        } else {
          jiwaKontrak++;
        }
      }
    }
    result.push({
      rtId: rt.id,
      nomorRt: rt.nomorRt,
      jumlahKk: jumlahKk,
      jiwaAktif: jiwaAktif,
      jiwaTetap: jiwaTetap,
      jiwaKontrak: jiwaKontrak,
      saldoKasRt: saldoByRt[rt.id] || 0
    });
  }
  return result;
}

function computeDashboardServer_(user) {
  if (user.role === 'PENGURUS_RW') {
    var rekap = computeRekapAntarRtServer_(user.rwId);
    var totalKk = 0;
    var totalJiwa = 0;
    for (var i = 0; i < rekap.length; i++) {
      totalKk += rekap[i].jumlahKk;
      totalJiwa += rekap[i].jiwaAktif;
    }
    var suratRowsRw = readRows_(SHEET_NAMES.PENGAJUAN_SURAT);
    var suratDisetujuiRtCount = 0;
    for (var s = 0; s < suratRowsRw.length; s++) {
      if (String(suratRowsRw[s][COL.PENGAJUAN_SURAT.STATUS]) === 'DISETUJUI_RT') {
        suratDisetujuiRtCount++;
      }
    }
    var setoranRows = readRows_(SHEET_NAMES.SETORAN_KAS);
    var setoranMenungguCount = 0;
    for (var st = 0; st < setoranRows.length; st++) {
      if (
        String(setoranRows[st][COL.SETORAN_KAS.RW_ID]) === String(user.rwId) &&
        String(setoranRows[st][COL.SETORAN_KAS.STATUS]) === 'MENUNGGU_KONFIRMASI'
      ) {
        setoranMenungguCount++;
      }
    }
    return {
      jumlahKk: totalKk,
      jiwaAktifTotal: totalJiwa,
      suratDisetujuiRtCount: suratDisetujuiRtCount,
      setoranMenungguCount: setoranMenungguCount,
      kasRw: computeRwSaldoServer_(user.rwId),
      rekapRt: rekap
    };
  }

  if (user.role === 'PENGURUS_RT') {
    var maps = loadContextMaps_();
    var kkInRt = {};
    var jumlahKkRt = 0;
    for (var k = 0; k < maps.kkList.length; k++) {
      if (maps.kkList[k].rtId === user.rtId) {
        kkInRt[maps.kkList[k].id] = maps.kkList[k];
        jumlahKkRt++;
      }
    }
    var pInRt = {};
    var jiwaTetap = 0;
    var jiwaKontrak = 0;
    for (var p = 0; p < maps.pendudukList.length; p++) {
      var pend = maps.pendudukList[p];
      var pKk = kkInRt[pend.kkId];
      if (pKk) {
        pInRt[pend.id] = true;
        if (pend.statusMutasi === 'AKTIF') {
          if (pKk.statusHunian === 'TETAP') {
            jiwaTetap++;
          } else {
            jiwaKontrak++;
          }
        }
      }
    }
    var suratRowsRt = readRows_(SHEET_NAMES.PENGAJUAN_SURAT);
    var suratDiajukanCount = 0;
    for (var sr = 0; sr < suratRowsRt.length; sr++) {
      var pemId = parseInt(suratRowsRt[sr][COL.PENGAJUAN_SURAT.PEMOHON_ID], 10);
      if (String(suratRowsRt[sr][COL.PENGAJUAN_SURAT.STATUS]) === 'DIAJUKAN' && pInRt[pemId]) {
        suratDiajukanCount++;
      }
    }
    var iuranRowsRt = readRows_(SHEET_NAMES.IURAN);
    var iuranMenungguCount = 0;
    for (var iu = 0; iu < iuranRowsRt.length; iu++) {
      var iuKkId = parseInt(iuranRowsRt[iu][COL.IURAN.KK_ID], 10);
      if (String(iuranRowsRt[iu][COL.IURAN.STATUS]) === 'MENUNGGU_VERIFIKASI' && kkInRt[iuKkId]) {
        iuranMenungguCount++;
      }
    }
    return {
      jumlahKk: jumlahKkRt,
      jiwaAktifTetap: jiwaTetap,
      jiwaAktifKontrak: jiwaKontrak,
      jiwaAktifTotal: jiwaTetap + jiwaKontrak,
      suratDiajukanCount: suratDiajukanCount,
      iuranMenungguCount: iuranMenungguCount,
      kasRt: computeRtSaldoServer_(user.rtId)
    };
  }

  // Warga dashboard
  var periodeBerjalan = currentPeriodeJakarta_();
  var iuranRows = readRows_(SHEET_NAMES.IURAN).map(serializeIuran_);
  var iuranBulan = null;
  for (var w = 0; w < iuranRows.length; w++) {
    var item = iuranRows[w];
    if (item.kkId === user.kkId && item.periode === periodeBerjalan) {
      if (!iuranBulan || item.createdAt > iuranBulan.createdAt) {
        iuranBulan = item;
      }
    }
  }

  var pAll = readRows_(SHEET_NAMES.PENDUDUK).map(serializePendudukSafe_);
  var kkMemberIds = {};
  var pById = {};
  for (var pm = 0; pm < pAll.length; pm++) {
    pById[pAll[pm].id] = pAll[pm];
    if (pAll[pm].kkId === user.kkId) {
      kkMemberIds[pAll[pm].id] = true;
    }
  }

  var suratRows = readRows_(SHEET_NAMES.PENGAJUAN_SURAT);
  var aktifSurat = [];
  for (var ws = 0; ws < suratRows.length; ws++) {
    var sObj = serializeSurat_(suratRows[ws], pById);
    if (kkMemberIds[sObj.pemohonId] && (sObj.status === 'DIAJUKAN' || sObj.status === 'DISETUJUI_RT')) {
      aktifSurat.push(sObj);
    }
  }
  aktifSurat.sort(function(a, b) {
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });

  var annRows = readRows_(SHEET_NAMES.PENGUMUMAN);
  var pengumuman = [];
  for (var a = 0; a < annRows.length; a++) {
    var ann = serializePengumuman_(annRows[a], pById);
    if (ann.rwId === user.rwId && (ann.lingkup === 'LINTAS_RW' || (ann.lingkup === 'RT' && ann.rtId === user.rtId))) {
      pengumuman.push(ann);
    }
  }
  pengumuman.sort(function(a, b) {
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });

  return {
    periodeBerjalan: periodeBerjalan,
    statusIuran: iuranBulan ? iuranBulan.status : 'BELUM_BAYAR',
    iuranTerakhir: iuranBulan,
    suratAktif: aktifSurat.length > 0 ? aktifSurat[0] : null,
    kasRt: computeRtSaldoServer_(user.rtId),
    kasRw: computeRwSaldoServer_(user.rwId),
    pengumumanTerbaru: pengumuman.slice(0, 5)
  };
}

/**
 * Membangun payload bootstrap terlingkup peran & wilayah (anti-IDOR, tanpa pinHash/pinSalt).
 * @param {Object} user Enriched user object dari requireSession_().
 * @return {Object} Snapshot data untuk client store.
 */
function buildBootstrapPayload_(user) {
  var maps = loadContextMaps_();
  var rwObj = user.rw || (maps.rwById[user.rwId] || null);

  var scopedRtList = [];
  if (user.role === 'PENGURUS_RW') {
    scopedRtList = maps.rtList.filter(function(rt) { return rt.rwId === user.rwId; });
  } else if (user.rt) {
    scopedRtList = [user.rt];
  }

  var scopedKk = [];
  var kkAllowedIds = {};
  for (var k = 0; k < maps.kkList.length; k++) {
    var kk = maps.kkList[k];
    var kkRt = maps.rtById[kk.rtId];
    if (!kkRt || kkRt.rwId !== user.rwId) {
      continue;
    }
    if (user.role === 'WARGA' && kk.id === user.kkId) {
      scopedKk.push(kk);
      kkAllowedIds[kk.id] = true;
    } else if (user.role === 'PENGURUS_RT' && kk.rtId === user.rtId) {
      scopedKk.push(kk);
      kkAllowedIds[kk.id] = true;
    } else if (user.role === 'PENGURUS_RW') {
      scopedKk.push(kk);
      kkAllowedIds[kk.id] = true;
    }
  }

  var scopedPenduduk = [];
  var pendudukAllowedIds = {};
  for (var p = 0; p < maps.pendudukList.length; p++) {
    var pend = maps.pendudukList[p];
    if (user.role === 'WARGA') {
      if (pend.kkId === user.kkId) {
        scopedPenduduk.push(pend);
        pendudukAllowedIds[pend.id] = true;
      }
    } else if (kkAllowedIds[pend.kkId]) {
      scopedPenduduk.push(pend);
      pendudukAllowedIds[pend.id] = true;
    }
  }

  var suratRows = readRows_(SHEET_NAMES.PENGAJUAN_SURAT);
  var scopedSurat = [];
  for (var s = 0; s < suratRows.length; s++) {
    var sr = serializeSurat_(suratRows[s], maps.pendudukById);
    if (user.role === 'WARGA') {
      if (pendudukAllowedIds[sr.pemohonId]) {
        scopedSurat.push(sr);
      }
    } else if (user.role === 'PENGURUS_RT') {
      if (pendudukAllowedIds[sr.pemohonId]) {
        scopedSurat.push(sr);
      }
    } else if (user.role === 'PENGURUS_RW') {
      if (pendudukAllowedIds[sr.pemohonId]) {
        scopedSurat.push(sr);
      }
    }
  }

  var iuranRows = readRows_(SHEET_NAMES.IURAN);
  var scopedIuran = [];
  for (var iu = 0; iu < iuranRows.length; iu++) {
    var iuObj = serializeIuran_(iuranRows[iu]);
    if (user.role === 'PENGURUS_RT') {
      if (kkAllowedIds[iuObj.kkId]) {
        scopedIuran.push(iuObj);
      }
    } else {
      if (iuObj.kkId === user.kkId) {
        scopedIuran.push(iuObj);
      }
    }
  }

  var setoranRows = readRows_(SHEET_NAMES.SETORAN_KAS);
  var scopedSetoran = [];
  if (user.role === 'PENGURUS_RW' || user.role === 'PENGURUS_RT') {
    for (var st = 0; st < setoranRows.length; st++) {
      var stObj = serializeSetoran_(setoranRows[st]);
      if (stObj.rwId !== user.rwId) {
        continue;
      }
      if (user.role === 'PENGURUS_RW' || stObj.rtId === user.rtId) {
        scopedSetoran.push(stObj);
      }
    }
  }

  var kasRows = readRows_(SHEET_NAMES.KAS_RT);
  var scopedKasRt = [];
  for (var kr = 0; kr < kasRows.length; kr++) {
    var kasObj = serializeKasRt_(kasRows[kr]);
    if (kasObj.rtId === user.rtId) {
      scopedKasRt.push(kasObj);
    }
  }

  var annRows = readRows_(SHEET_NAMES.PENGUMUMAN);
  var scopedPengumuman = [];
  for (var a = 0; a < annRows.length; a++) {
    var annObj = serializePengumuman_(annRows[a], maps.pendudukById);
    if (annObj.rwId === user.rwId && (annObj.lingkup === 'LINTAS_RW' || (annObj.lingkup === 'RT' && annObj.rtId === user.rtId))) {
      scopedPengumuman.push(annObj);
    }
  }

  // PENGURUS_RW dilarang keras melihat LaporanWarga (Bab 6.I)
  var scopedLaporan = [];
  if (user.role === 'PENGURUS_RT') {
    var lapRows = readRows_(SHEET_NAMES.LAPORAN_WARGA);
    for (var l = 0; l < lapRows.length; l++) {
      var lapObj = serializeLaporan_(lapRows[l], maps.pendudukById);
      if (lapObj.rtId === user.rtId) {
        scopedLaporan.push(lapObj);
      }
    }
  }

  return {
    user: user,
    rw: rwObj,
    rtList: scopedRtList,
    kartuKeluarga: scopedKk,
    penduduk: scopedPenduduk,
    pengajuanSurat: scopedSurat,
    iuran: scopedIuran,
    setoranKas: scopedSetoran,
    kasRt: scopedKasRt,
    pengumuman: scopedPengumuman,
    laporanWarga: scopedLaporan,
    dashboard: computeDashboardServer_(user),
    kasRtSummary: computeRtSaldoServer_(user.rtId),
    kasRwSummary: computeRwSaldoServer_(user.rwId),
    rekapRt: user.role === 'PENGURUS_RW' ? computeRekapAntarRtServer_(user.rwId) : []
  };
}

/* ==========================================================================
   API Endpoints: Autentikasi, Bootstrap, PIN, & Kependudukan
   ========================================================================== */

function apiMasuk(nik, pin) {
  try {
    var cleanNik = String(nik || '').trim();
    var cleanPin = String(pin || '').trim();
    if (!/^\d{16}$/.test(cleanNik) || !/^\d{6}$/.test(cleanPin)) {
      return { ok: false, error: 'NIK harus 16 digit angka dan PIN harus 6 digit angka.' };
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var rows = readRows_(SHEET_NAMES.PENDUDUK);
      var rowIdx = -1;
      var targetRow = null;
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][COL.PENDUDUK.NIK]) === cleanNik) {
          rowIdx = i;
          targetRow = rows[i].slice();
          break;
        }
      }

      if (!targetRow) {
        return { ok: false, error: 'NIK atau PIN salah.' };
      }

      var terkunciHingga = String(targetRow[COL.PENDUDUK.TERKUNCI_HINGGA] || '');
      if (terkunciHingga) {
        var lockUntilMs = new Date(terkunciHingga).getTime();
        if (!isNaN(lockUntilMs) && Date.now() < lockUntilMs) {
          return {
            ok: false,
            error: 'Akun terkunci sementara selama 15 menit karena 5 kali PIN salah. Hubungi Pengurus RT untuk reset PIN.'
          };
        }
      }

      if (String(targetRow[COL.PENDUDUK.STATUS_MUTASI]) !== 'AKTIF') {
        return { ok: false, error: 'Akun penduduk berstatus non-aktif dan tidak dapat masuk.' };
      }

      var pinHash = String(targetRow[COL.PENDUDUK.PIN_HASH] || '');
      var pinSalt = String(targetRow[COL.PENDUDUK.PIN_SALT] || '');
      if (!verifyPin_(cleanPin, pinSalt, pinHash)) {
        var gagal = (parseInt(targetRow[COL.PENDUDUK.PIN_GAGAL], 10) || 0) + 1;
        targetRow[COL.PENDUDUK.PIN_GAGAL] = String(gagal);
        targetRow[COL.PENDUDUK.UPDATED_AT] = nowJakarta_();
        if (gagal >= MAX_PIN_ATTEMPTS_) {
          targetRow[COL.PENDUDUK.TERKUNCI_HINGGA] = formatDateTimeJakarta_(new Date(Date.now() + LOCKOUT_DURATION_MS_));
          updateRowFormatted_(SHEET_NAMES.PENDUDUK, rowIdx + 2, targetRow);
          SpreadsheetApp.flush();
          return {
            ok: false,
            error: 'Akun terkunci selama 15 menit karena 5 kali PIN salah berturut-turut.'
          };
        }
        updateRowFormatted_(SHEET_NAMES.PENDUDUK, rowIdx + 2, targetRow);
        SpreadsheetApp.flush();
        return { ok: false, error: 'NIK atau PIN salah.' };
      }

      targetRow[COL.PENDUDUK.PIN_GAGAL] = '0';
      targetRow[COL.PENDUDUK.TERKUNCI_HINGGA] = '';
      targetRow[COL.PENDUDUK.UPDATED_AT] = nowJakarta_();
      updateRowFormatted_(SHEET_NAMES.PENDUDUK, rowIdx + 2, targetRow);

      var maps = loadContextMaps_();
      var pObj = serializePendudukSafe_(targetRow);
      var user = buildEnrichedUser_(pObj, maps);

      var token = generateRandomCode_(32) + generateRandomCode_(16);
      var nowIso = nowJakarta_();
      var expiredIso = formatDateTimeJakarta_(new Date(Date.now() + SESSION_TTL_MS_));

      var sesiRow = [
        token,
        String(user.id),
        String(user.role),
        user.rtId ? String(user.rtId) : '',
        user.rwId ? String(user.rwId) : '',
        expiredIso,
        nowIso
      ];
      appendRowFormatted_(SHEET_NAMES.SESI, sesiRow);

      CacheService.getScriptCache().put(
        'sess_' + token,
        JSON.stringify({
          pendudukId: user.id,
          role: user.role,
          rtId: user.rtId,
          rwId: user.rwId,
          expiredAt: expiredIso
        }),
        CACHE_TTL_SEC_
      );

      SpreadsheetApp.flush();
      return {
        ok: true,
        token: token,
        user: user,
        bootstrap: buildBootstrapPayload_(user)
      };
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return apiError_(err);
  }
}

function apiKeluar(token) {
  try {
    var cleanToken = String(token || '').trim();
    if (!cleanToken) {
      return { ok: true };
    }
    CacheService.getScriptCache().remove('sess_' + cleanToken);
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var ss = getSpreadsheet_();
      var sheet = ss.getSheetByName(SHEET_NAMES.SESI);
      if (sheet && sheet.getLastRow() > 1) {
        var rows = sheet.getDataRange().getDisplayValues();
        for (var i = rows.length - 1; i >= 1; i--) {
          if (String(rows[i][COL.SESI.TOKEN]) === cleanToken) {
            sheet.deleteRow(i + 1);
          }
        }
        SpreadsheetApp.flush();
      }
    } finally {
      lock.releaseLock();
    }
    return { ok: true };
  } catch (err) {
    return apiError_(err);
  }
}

function apiGetBootstrap(token) {
  try {
    var user = requireSession_(token);
    return {
      ok: true,
      user: user,
      bootstrap: buildBootstrapPayload_(user)
    };
  } catch (err) {
    return apiError_(err);
  }
}

function apiUbahPin(token, oldPin, newPin, confirmPin) {
  try {
    var user = requireSession_(token);
    var cleanOld = String(oldPin || '').trim();
    var cleanNew = String(newPin || '').trim();
    var cleanConfirm = String(confirmPin || '').trim();

    if (!/^\d{6}$/.test(cleanOld) || !/^\d{6}$/.test(cleanNew) || !/^\d{6}$/.test(cleanConfirm)) {
      return { ok: false, error: 'PIN wajib berupa 6 digit angka.' };
    }
    if (cleanNew !== cleanConfirm) {
      return { ok: false, error: 'Konfirmasi PIN baru tidak sama.' };
    }
    if (cleanNew === cleanOld) {
      return { ok: false, error: 'PIN baru tidak boleh sama dengan PIN lama.' };
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var rows = readRows_(SHEET_NAMES.PENDUDUK);
      var rowIdx = -1;
      var targetRow = null;
      for (var i = 0; i < rows.length; i++) {
        if (parseInt(rows[i][COL.PENDUDUK.ID], 10) === user.id) {
          rowIdx = i;
          targetRow = rows[i].slice();
          break;
        }
      }
      if (!targetRow) {
        return { ok: false, error: 'Data pengguna tidak ditemukan.' };
      }
      if (!verifyPin_(cleanOld, targetRow[COL.PENDUDUK.PIN_SALT], targetRow[COL.PENDUDUK.PIN_HASH])) {
        return { ok: false, error: 'PIN lama tidak sesuai.' };
      }

      var newSalt = generateRandomCode_(16);
      var newHash = hashPinWithSalt_(cleanNew, newSalt);
      targetRow[COL.PENDUDUK.PIN_HASH] = newHash;
      targetRow[COL.PENDUDUK.PIN_SALT] = newSalt;
      targetRow[COL.PENDUDUK.UPDATED_AT] = nowJakarta_();
      updateRowFormatted_(SHEET_NAMES.PENDUDUK, rowIdx + 2, targetRow);
      SpreadsheetApp.flush();
      return { ok: true };
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return apiError_(err);
  }
}

function apiResetPin(token, pendudukId) {
  try {
    var user = requireSession_(token, ['PENGURUS_RT']);
    var targetId = parseInt(pendudukId, 10);
    if (isNaN(targetId)) {
      return { ok: false, error: 'ID penduduk tidak valid.' };
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var maps = loadContextMaps_();
      var rows = readRows_(SHEET_NAMES.PENDUDUK);
      var rowIdx = -1;
      var targetRow = null;
      for (var i = 0; i < rows.length; i++) {
        if (parseInt(rows[i][COL.PENDUDUK.ID], 10) === targetId) {
          rowIdx = i;
          targetRow = rows[i].slice();
          break;
        }
      }
      if (!targetRow) {
        return { ok: false, error: 'Data penduduk tidak ditemukan.' };
      }

      var targetKkId = parseInt(targetRow[COL.PENDUDUK.KK_ID], 10);
      var targetKk = maps.kkById[targetKkId];
      if (!targetKk || targetKk.rtId !== user.rtId) {
        return { ok: false, code: 'FORBIDDEN', error: 'Anda hanya dapat mereset PIN penduduk di wilayah RT Anda.' };
      }

      var tempPin = generateRandomDigits_(6);
      var newSalt = generateRandomCode_(16);
      var newHash = hashPinWithSalt_(tempPin, newSalt);

      targetRow[COL.PENDUDUK.PIN_HASH] = newHash;
      targetRow[COL.PENDUDUK.PIN_SALT] = newSalt;
      targetRow[COL.PENDUDUK.PIN_GAGAL] = '0';
      targetRow[COL.PENDUDUK.TERKUNCI_HINGGA] = '';
      targetRow[COL.PENDUDUK.UPDATED_AT] = nowJakarta_();

      updateRowFormatted_(SHEET_NAMES.PENDUDUK, rowIdx + 2, targetRow);
      SpreadsheetApp.flush();

      return {
        ok: true,
        tempPin: tempPin,
        penduduk: serializePendudukSafe_(targetRow),
        bootstrap: buildBootstrapPayload_(user)
      };
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return apiError_(err);
  }
}

function apiTambahKk(token, payload) {
  try {
    var user = requireSession_(token, ['PENGURUS_RT']);
    var p = payload || {};
    var noKk = String(p.noKk || '').trim();
    var alamat = String(p.alamat || '').trim();
    var blok = String(p.blok || '').trim();
    var statusHunian = String(p.statusHunian || '').trim();
    var nik = String(p.nik || '').trim();
    var nama = String(p.nama || '').trim();
    var tempatLahir = String(p.tempatLahir || '').trim();
    var tanggalLahir = String(p.tanggalLahir || '').trim();
    var jenisKelamin = String(p.jenisKelamin || '').trim();

    if (!/^\d{16}$/.test(noKk)) {
      return { ok: false, error: 'Nomor KK wajib 16 digit angka.' };
    }
    if (!alamat) {
      return { ok: false, error: 'Alamat wajib diisi.' };
    }
    if (blok.length < 1 || blok.length > 20) {
      return { ok: false, error: 'Blok wajib diisi, maksimal 20 karakter.' };
    }
    if (statusHunian !== 'TETAP' && statusHunian !== 'KONTRAK_KOS') {
      return { ok: false, error: 'Status hunian tidak valid.' };
    }
    if (!/^\d{16}$/.test(nik)) {
      return { ok: false, error: 'NIK Kepala Keluarga wajib 16 digit angka.' };
    }
    if (nama.length < 3 || nama.length > 150) {
      return { ok: false, error: 'Nama wajib 3 sampai 150 karakter.' };
    }
    if (!tempatLahir) {
      return { ok: false, error: 'Tempat lahir wajib diisi.' };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalLahir) || tanggalLahir > todayJakarta_()) {
      return { ok: false, error: 'Tanggal lahir tidak valid atau berada di masa depan.' };
    }
    if (jenisKelamin !== 'L' && jenisKelamin !== 'P') {
      return { ok: false, error: 'Jenis kelamin wajib L atau P.' };
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var kkRows = readRows_(SHEET_NAMES.KARTU_KELUARGA);
      for (var k = 0; k < kkRows.length; k++) {
        if (String(kkRows[k][COL.KARTU_KELUARGA.NO_KK]) === noKk) {
          return { ok: false, error: 'Nomor KK sudah terdaftar.' };
        }
      }
      var pRows = readRows_(SHEET_NAMES.PENDUDUK);
      for (var j = 0; j < pRows.length; j++) {
        if (String(pRows[j][COL.PENDUDUK.NIK]) === nik) {
          return { ok: false, error: 'NIK sudah terdaftar di sistem.' };
        }
      }

      var nowIso = nowJakarta_();
      var kkId = nextTableId_(SHEET_NAMES.KARTU_KELUARGA);
      var newKkRow = [
        String(kkId),
        noKk,
        String(user.rtId),
        alamat,
        blok,
        statusHunian,
        nowIso
      ];
      appendRowFormatted_(SHEET_NAMES.KARTU_KELUARGA, newKkRow);

      var tempPin = generateRandomDigits_(6);
      var salt = generateRandomCode_(16);
      var pinHash = hashPinWithSalt_(tempPin, salt);
      var pendudukId = nextTableId_(SHEET_NAMES.PENDUDUK);
      var newPendudukRow = [
        String(pendudukId),
        nik,
        String(kkId),
        nama,
        tempatLahir,
        tanggalLahir,
        jenisKelamin,
        'KEPALA_KELUARGA',
        'true',
        'AKTIF',
        'WARGA',
        '',
        pinHash,
        salt,
        '0',
        '',
        nowIso,
        nowIso
      ];
      appendRowFormatted_(SHEET_NAMES.PENDUDUK, newPendudukRow);
      SpreadsheetApp.flush();

      return {
        ok: true,
        kk: serializeKk_(newKkRow),
        kepalaKeluarga: serializePendudukSafe_(newPendudukRow),
        tempPin: tempPin,
        bootstrap: buildBootstrapPayload_(user)
      };
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return apiError_(err);
  }
}

function apiTambahAnggota(token, kkId, payload) {
  try {
    var user = requireSession_(token);
    var targetKkId = parseInt(kkId, 10);
    var p = payload || {};
    var nik = String(p.nik || '').trim();
    var nama = String(p.nama || '').trim();
    var tempatLahir = String(p.tempatLahir || '').trim();
    var tanggalLahir = String(p.tanggalLahir || '').trim();
    var jenisKelamin = String(p.jenisKelamin || '').trim();
    var hubunganKeluarga = String(p.hubunganKeluarga || '').trim();

    var allowedHub = ['SUAMI', 'ISTRI', 'ANAK', 'MENANTU', 'ORANG_TUA', 'FAMILI_LAIN'];
    if (!/^\d{16}$/.test(nik)) {
      return { ok: false, error: 'NIK wajib 16 digit angka.' };
    }
    if (nama.length < 3 || nama.length > 150) {
      return { ok: false, error: 'Nama wajib 3 sampai 150 karakter.' };
    }
    if (!tempatLahir) {
      return { ok: false, error: 'Tempat lahir wajib diisi.' };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalLahir) || tanggalLahir > todayJakarta_()) {
      return { ok: false, error: 'Tanggal lahir tidak valid atau berada di masa depan.' };
    }
    if (jenisKelamin !== 'L' && jenisKelamin !== 'P') {
      return { ok: false, error: 'Jenis kelamin wajib L atau P.' };
    }
    if (hubunganKeluarga === 'KEPALA_KELUARGA') {
      return { ok: false, error: 'Setiap KK hanya boleh memiliki satu Kepala Keluarga.' };
    }
    if (allowedHub.indexOf(hubunganKeluarga) === -1) {
      return { ok: false, error: 'Hubungan keluarga tidak valid.' };
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var maps = loadContextMaps_();
      var kk = maps.kkById[targetKkId];
      if (!kk) {
        return { ok: false, error: 'Kartu Keluarga tidak ditemukan.' };
      }
      var canAsRt = user.role === 'PENGURUS_RT' && kk.rtId === user.rtId;
      var canAsKepala = user.isKepalaKeluarga && user.kkId === kk.id;
      if (!canAsRt && !canAsKepala) {
        return { ok: false, code: 'FORBIDDEN', error: 'Anda tidak memiliki izin menambah anggota pada KK ini.' };
      }

      var pRows = readRows_(SHEET_NAMES.PENDUDUK);
      for (var i = 0; i < pRows.length; i++) {
        if (String(pRows[i][COL.PENDUDUK.NIK]) === nik) {
          return { ok: false, error: 'NIK sudah terdaftar di database.' };
        }
      }

      var nowIso = nowJakarta_();
      var tempPin = generateRandomDigits_(6);
      var salt = generateRandomCode_(16);
      var pinHash = hashPinWithSalt_(tempPin, salt);
      var pendudukId = nextTableId_(SHEET_NAMES.PENDUDUK);
      var newRow = [
        String(pendudukId),
        nik,
        String(kk.id),
        nama,
        tempatLahir,
        tanggalLahir,
        jenisKelamin,
        hubunganKeluarga,
        'false',
        'AKTIF',
        'WARGA',
        '',
        pinHash,
        salt,
        '0',
        '',
        nowIso,
        nowIso
      ];
      appendRowFormatted_(SHEET_NAMES.PENDUDUK, newRow);
      SpreadsheetApp.flush();

      return {
        ok: true,
        penduduk: serializePendudukSafe_(newRow),
        tempPin: tempPin,
        bootstrap: buildBootstrapPayload_(user)
      };
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return apiError_(err);
  }
}

function apiUpdatePenduduk(token, pendudukId, payload) {
  try {
    var user = requireSession_(token);
    var targetId = parseInt(pendudukId, 10);
    var p = payload || {};
    var validHub = ['KEPALA_KELUARGA', 'SUAMI', 'ISTRI', 'ANAK', 'MENANTU', 'ORANG_TUA', 'FAMILI_LAIN'];
    var validMutasi = ['AKTIF', 'PINDAH_KELUAR', 'MENINGGAL'];

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var maps = loadContextMaps_();
      var rows = readRows_(SHEET_NAMES.PENDUDUK);
      var rowIdx = -1;
      var targetRow = null;
      for (var i = 0; i < rows.length; i++) {
        if (parseInt(rows[i][COL.PENDUDUK.ID], 10) === targetId) {
          rowIdx = i;
          targetRow = rows[i].slice();
          break;
        }
      }
      if (!targetRow) {
        return { ok: false, error: 'Data penduduk tidak ditemukan.' };
      }

      var targetKkId = parseInt(targetRow[COL.PENDUDUK.KK_ID], 10);
      var kk = maps.kkById[targetKkId];
      var isRt = user.role === 'PENGURUS_RT' && kk && kk.rtId === user.rtId;
      var isKepalaSameKk = user.isKepalaKeluarga && user.kkId === targetKkId;
      if (!isRt && !isKepalaSameKk) {
        return { ok: false, code: 'FORBIDDEN', error: 'Anda tidak memiliki izin mengubah data penduduk ini.' };
      }

      var isKepalaTarget = String(targetRow[COL.PENDUDUK.IS_KEPALA_KELUARGA]) === 'true';
      var currentHub = String(targetRow[COL.PENDUDUK.HUBUNGAN_KELUARGA] || '');
      var currentMutasi = String(targetRow[COL.PENDUDUK.STATUS_MUTASI] || 'AKTIF');

      var nama = String(p.nama !== undefined ? p.nama : targetRow[COL.PENDUDUK.NAMA]).trim();
      var tempatLahir = String(p.tempatLahir !== undefined ? p.tempatLahir : targetRow[COL.PENDUDUK.TEMPAT_LAHIR]).trim();
      var tanggalLahir = String(p.tanggalLahir !== undefined ? p.tanggalLahir : targetRow[COL.PENDUDUK.TANGGAL_LAHIR]).trim();
      var jenisKelamin = String(p.jenisKelamin !== undefined ? p.jenisKelamin : targetRow[COL.PENDUDUK.JENIS_KELAMIN]).trim();
      var hubunganKeluarga = String(p.hubunganKeluarga !== undefined ? p.hubunganKeluarga : currentHub).trim();
      var statusMutasi = String(p.statusMutasi !== undefined ? p.statusMutasi : currentMutasi).trim();

      if (nama.length < 3 || nama.length > 150) {
        return { ok: false, error: 'Nama wajib 3 sampai 150 karakter.' };
      }
      if (!tempatLahir) {
        return { ok: false, error: 'Tempat lahir wajib diisi.' };
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalLahir) || tanggalLahir > todayJakarta_()) {
        return { ok: false, error: 'Tanggal lahir tidak valid atau berada di masa depan.' };
      }
      if (jenisKelamin !== 'L' && jenisKelamin !== 'P') {
        return { ok: false, error: 'Jenis kelamin wajib L atau P.' };
      }
      if (validHub.indexOf(hubunganKeluarga) === -1) {
        return { ok: false, error: 'Hubungan keluarga tidak valid.' };
      }
      if (!isKepalaTarget && hubunganKeluarga === 'KEPALA_KELUARGA') {
        return { ok: false, error: 'Setiap KK hanya boleh memiliki satu Kepala Keluarga.' };
      }
      if (isKepalaTarget && hubunganKeluarga !== 'KEPALA_KELUARGA') {
        return { ok: false, error: 'Hubungan Kepala Keluarga tidak dapat diubah langsung.' };
      }
      if (validMutasi.indexOf(statusMutasi) === -1) {
        return { ok: false, error: 'Status mutasi tidak valid.' };
      }
      if (statusMutasi !== currentMutasi) {
        if (!isRt) {
          return { ok: false, code: 'FORBIDDEN', error: 'Hanya Pengurus RT yang dapat mengubah status mutasi.' };
        }
        if (isKepalaTarget && statusMutasi !== 'AKTIF') {
          return { ok: false, error: 'Kepala Keluarga aktif tidak dapat dimutasi sebelum ada pengganti.' };
        }
      }

      targetRow[COL.PENDUDUK.NAMA] = nama;
      targetRow[COL.PENDUDUK.TEMPAT_LAHIR] = tempatLahir;
      targetRow[COL.PENDUDUK.TANGGAL_LAHIR] = tanggalLahir;
      targetRow[COL.PENDUDUK.JENIS_KELAMIN] = jenisKelamin;
      targetRow[COL.PENDUDUK.HUBUNGAN_KELUARGA] = hubunganKeluarga;
      targetRow[COL.PENDUDUK.STATUS_MUTASI] = statusMutasi;
      targetRow[COL.PENDUDUK.UPDATED_AT] = nowJakarta_();

      updateRowFormatted_(SHEET_NAMES.PENDUDUK, rowIdx + 2, targetRow);
      SpreadsheetApp.flush();

      return {
        ok: true,
        penduduk: serializePendudukSafe_(targetRow),
        bootstrap: buildBootstrapPayload_(user)
      };
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return apiError_(err);
  }
}
