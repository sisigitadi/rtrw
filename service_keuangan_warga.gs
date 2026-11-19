/**
 * SiWarga RT/RW - Layanan Keuangan, Iuran, Setoran Kas, Pengumuman, & Laporan Warga (Phase 2)
 * Tasks 2.10, 2.11, 2.12, 2.13, 2.14, 2.15, 2.16
 * Menggunakan helper global dari setup.gs (SHEET_NAMES, COL) dan code.gs.
 */

var KW_MAX_BUKTI_BYTES_ = 2 * 1024 * 1024;
var KW_ALLOWED_MIME_ = ['image/jpeg', 'image/png', 'application/pdf'];

function kwIsIntInRange_(val, minVal, maxVal) {
  if (val === null || val === undefined || val === '') {
    return false;
  }
  var num = Number(val);
  if (!isFinite(num) || Math.floor(num) !== num) {
    return false;
  }
  if (minVal !== null && minVal !== undefined && num < minVal) {
    return false;
  }
  if (maxVal !== null && maxVal !== undefined && num > maxVal) {
    return false;
  }
  return true;
}

function kwIsValidDateYmd_(str) {
  var s = String(str || '').trim();
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    return false;
  }
  var y = parseInt(m[1], 10);
  var mo = parseInt(m[2], 10);
  var d = parseInt(m[3], 10);
  var dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return false;
  }
  return s <= todayJakarta_();
}

function kwIsValidPeriode_(str) {
  var s = String(str || '').trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) {
    return false;
  }
  return s <= currentPeriodeJakarta_();
}

function kwFormatRupiah_(n) {
  var num = Number(n) || 0;
  var neg = num < 0;
  var absStr = String(Math.round(Math.abs(num)));
  var formatted = absStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-Rp ' : 'Rp ') + formatted;
}

function kwSanitizeFileName_(fileName, mimeType) {
  var base = String(fileName || 'bukti-transfer').trim();
  base = base.replace(/^.*[\\\/]/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!base || base === '.' || base === '..') {
    base = 'bukti-transfer';
  }
  if (base.length > 100) {
    base = base.slice(0, 100);
  }
  if (!/\.(jpg|jpeg|png|pdf)$/i.test(base)) {
    if (mimeType === 'image/png') {
      base += '.png';
    } else if (mimeType === 'application/pdf') {
      base += '.pdf';
    } else {
      base += '.jpg';
    }
  }
  return base;
}

function kwDecodeBase64_(rawBase64) {
  var clean = String(rawBase64 || '').trim();
  var prefixMatch = clean.match(/^data:[^;]+;base64,(.*)$/i);
  if (prefixMatch) {
    clean = prefixMatch[1];
  }
  clean = clean.replace(/\s+/g, '');
  if (!clean) {
    return null;
  }
  try {
    return Utilities.base64Decode(clean);
  } catch (e) {
    return null;
  }
}

/**
 * Task 2.10: Pengajuan iuran bulanan warga beserta unggahan bukti ke Drive privat.
 * @param {string} token Token sesi pengguna.
 * @param {Object} payload { periode, nominal, metodeBayar, fileName, mimeType, fileBase64 }.
 * @return {Object} { ok, item, bootstrap } atau { ok:false, code?, error }.
 */
function apiAjukanIuran(token, payload) {
  try {
    var user = requireSession_(token);
    if (!user.kkId) {
      return { ok: false, error: 'Data Kartu Keluarga pengguna tidak ditemukan.' };
    }

    var p = payload || {};
    var periode = String(p.periode || '').trim();
    var nominal = Number(p.nominal);
    var metodeBayar = String(p.metodeBayar || '').trim();
    var mimeType = String(p.mimeType || '').trim().toLowerCase();
    var safeName = kwSanitizeFileName_(p.fileName, mimeType);

    if (!kwIsValidPeriode_(periode)) {
      return { ok: false, error: 'Periode wajib format YYYY-MM dan tidak boleh melebihi bulan berjalan.' };
    }
    if (!kwIsIntInRange_(nominal, 1000, 5000000)) {
      return { ok: false, error: 'Nominal wajib angka bulat antara Rp 1.000 sampai Rp 5.000.000.' };
    }
    if (metodeBayar !== 'TRANSFER_BANK') {
      return { ok: false, error: 'Metode pembayaran hanya mendukung TRANSFER_BANK.' };
    }
    if (KW_ALLOWED_MIME_.indexOf(mimeType) === -1) {
      return { ok: false, error: 'Format berkas harus JPG, PNG, atau PDF.' };
    }

    var decodedBytes = kwDecodeBase64_(p.fileBase64);
    if (!decodedBytes || decodedBytes.length === 0) {
      return { ok: false, error: 'Bukti transfer wajib diunggah dengan isi berkas yang valid.' };
    }
    if (decodedBytes.length > KW_MAX_BUKTI_BYTES_) {
      return { ok: false, error: 'Ukuran berkas maksimal 2 MB.' };
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var iuranRows = readRows_(SHEET_NAMES.IURAN);
      for (var i = 0; i < iuranRows.length; i++) {
        var rowKkId = parseInt(iuranRows[i][COL.IURAN.KK_ID], 10);
        var rowPeriode = String(iuranRows[i][COL.IURAN.PERIODE] || '');
        var rowStatus = String(iuranRows[i][COL.IURAN.STATUS] || '');
        if (
          rowKkId === user.kkId &&
          rowPeriode === periode &&
          (rowStatus === 'MENUNGGU_VERIFIKASI' || rowStatus === 'TERVERIFIKASI')
        ) {
          return { ok: false, error: 'Sudah ada pengajuan iuran aktif atau terverifikasi untuk periode ini.' };
        }
      }

      var folder = getDriveFolderBukti_();
      var blob = Utilities.newBlob(decodedBytes, mimeType, safeName);
      var driveFile = folder.createFile(blob);
      var fileId = String(driveFile.getId() || '');
      if (!fileId) {
        return { ok: false, error: 'Gagal menyimpan bukti transfer ke Google Drive.' };
      }

      var newId = nextTableId_(SHEET_NAMES.IURAN);
      var nowIso = nowJakarta_();
      var newRow = [
        String(newId),
        String(user.kkId),
        periode,
        String(nominal),
        'TRANSFER_BANK',
        fileId,
        safeName,
        'MENUNGGU_VERIFIKASI',
        String(user.id),
        '',
        '',
        '',
        nowIso
      ];
      appendRowFormatted_(SHEET_NAMES.IURAN, newRow);
      SpreadsheetApp.flush();

      return {
        ok: true,
        item: serializeIuran_(newRow),
        bootstrap: buildBootstrapPayload_(user)
      };
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return apiError_(err);
  }
}

/**
 * Task 2.10 & 2.16: Pengambilan berkas bukti iuran privat dari Google Drive dengan cek kepemilikan KK/RT.
 * @param {string} token Token sesi pengguna.
 * @param {number|string} iuranId ID baris iuran.
 * @return {Object} { ok, fileName, mimeType, base64 } atau { ok:false, code?, error }.
 */
function apiGetBuktiIuran(token, iuranId) {
  try {
    var user = requireSession_(token);
    var targetId = parseInt(iuranId, 10);
    if (isNaN(targetId)) {
      return { ok: false, error: 'ID iuran tidak valid.' };
    }

    var iuranRows = readRows_(SHEET_NAMES.IURAN);
    var iuObj = null;
    for (var i = 0; i < iuranRows.length; i++) {
      if (parseInt(iuranRows[i][COL.IURAN.ID], 10) === targetId) {
        iuObj = serializeIuran_(iuranRows[i]);
        break;
      }
    }
    if (!iuObj) {
      return { ok: false, error: 'Data iuran tidak ditemukan.' };
    }

    var maps = loadContextMaps_();
    var kk = maps.kkById[iuObj.kkId] || null;

    var isSameKk = (user.kkId === iuObj.kkId);
    var isSameRtPengurus = (user.role === 'PENGURUS_RT' && kk && kk.rtId === user.rtId);
    if (!isSameKk && !isSameRtPengurus) {
      return { ok: false, code: 'FORBIDDEN', error: 'Anda tidak memiliki izin mengakses bukti iuran ini.' };
    }

    if (!iuObj.buktiFileId) {
      return { ok: false, error: 'Berkas bukti transfer belum tersedia di Google Drive.' };
    }

    var driveFile = DriveApp.getFileById(iuObj.buktiFileId);
    var blob = driveFile.getBlob();
    var mimeType = String(blob.getContentType() || 'application/octet-stream');
    var fileName = iuObj.buktiNama || String(driveFile.getName() || 'bukti-transfer');
    var base64 = Utilities.base64Encode(blob.getBytes());

    return {
      ok: true,
      fileName: fileName,
      mimeType: mimeType,
      base64: base64
    };
  } catch (err) {
    return apiError_(err);
  }
}

/**
 * Task 2.10: Verifikasi atau penolakan iuran warga oleh Bendahara RT.
 * @param {string} token Token sesi Bendahara RT.
 * @param {number|string} iuranId ID iuran.
 * @param {string} aksi 'VERIFIKASI' atau 'TOLAK'.
 * @param {string} alasanTolak Wajib 10..300 karakter jika aksi === 'TOLAK'.
 * @return {Object} { ok, item, bootstrap } atau { ok:false, code?, error }.
 */
function apiProsesIuranRt(token, iuranId, aksi, alasanTolak) {
  try {
    var user = requireSession_(token, ['PENGURUS_RT']);
    if (!hasJabatan_(user, 'Bendahara')) {
      return { ok: false, code: 'FORBIDDEN', error: 'Hanya Bendahara RT yang dapat memverifikasi atau menolak iuran.' };
    }

    var targetId = parseInt(iuranId, 10);
    if (isNaN(targetId)) {
      return { ok: false, error: 'ID iuran tidak valid.' };
    }

    var cleanAksi = String(aksi || '').trim().toUpperCase();
    if (cleanAksi !== 'VERIFIKASI' && cleanAksi !== 'TOLAK') {
      return { ok: false, error: 'Aksi proses iuran harus VERIFIKASI atau TOLAK.' };
    }

    var cleanAlasan = String(alasanTolak || '').trim();
    if (cleanAksi === 'TOLAK' && (cleanAlasan.length < 10 || cleanAlasan.length > 300)) {
      return { ok: false, error: 'Alasan penolakan wajib 10 sampai 300 karakter.' };
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var rows = readRows_(SHEET_NAMES.IURAN);
      var rowIdx = -1;
      var targetRow = null;
      for (var i = 0; i < rows.length; i++) {
        if (parseInt(rows[i][COL.IURAN.ID], 10) === targetId) {
          rowIdx = i;
          targetRow = rows[i].slice();
          break;
        }
      }
      if (!targetRow) {
        return { ok: false, error: 'Data iuran tidak ditemukan.' };
      }

      var maps = loadContextMaps_();
      var kkId = parseInt(targetRow[COL.IURAN.KK_ID], 10);
      var kk = maps.kkById[kkId] || null;
      if (!kk || kk.rtId !== user.rtId) {
        return { ok: false, code: 'FORBIDDEN', error: 'Data iuran tidak ditemukan di wilayah RT Anda.' };
      }
      if (String(targetRow[COL.IURAN.STATUS]) !== 'MENUNGGU_VERIFIKASI') {
        return { ok: false, error: 'Hanya iuran berstatus MENUNGGU_VERIFIKASI yang dapat diproses.' };
      }

      var nowIso = nowJakarta_();
      targetRow[COL.IURAN.DIVERIFIKASI_OLEH_ID] = String(user.id);
      targetRow[COL.IURAN.VERIFIED_AT] = nowIso;

      if (cleanAksi === 'VERIFIKASI') {
        targetRow[COL.IURAN.STATUS] = 'TERVERIFIKASI';
        targetRow[COL.IURAN.ALASAN_TOLAK] = '';
        updateRowFormatted_(SHEET_NAMES.IURAN, rowIdx + 2, targetRow);

        var kepala = null;
        for (var p = 0; p < maps.pendudukList.length; p++) {
          var cand = maps.pendudukList[p];
          if (cand.kkId === kk.id && cand.isKepalaKeluarga) {
            kepala = cand;
            break;
          }
        }
        var namaKk = kepala ? kepala.nama : kk.noKk;
        var periode = String(targetRow[COL.IURAN.PERIODE] || '');
        var nominal = parseInt(targetRow[COL.IURAN.NOMINAL], 10) || 0;
        var kasId = nextTableId_(SHEET_NAMES.KAS_RT);
        var kasRow = [
          String(kasId),
          String(user.rtId),
          todayJakarta_(),
          'PEMASUKAN',
          'Iuran Warga',
          String(nominal),
          'Iuran periode ' + periode + ' KK ' + kk.noKk + ' (' + namaKk + ')',
          String(targetId),
          '',
          String(user.id),
          nowIso
        ];
        appendRowFormatted_(SHEET_NAMES.KAS_RT, kasRow);
      } else {
        targetRow[COL.IURAN.STATUS] = 'DITOLAK';
        targetRow[COL.IURAN.ALASAN_TOLAK] = cleanAlasan;
        updateRowFormatted_(SHEET_NAMES.IURAN, rowIdx + 2, targetRow);
      }

      SpreadsheetApp.flush();
      return {
        ok: true,
        item: serializeIuran_(targetRow),
        bootstrap: buildBootstrapPayload_(user)
      };
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return apiError_(err);
  }
}

/**
 * Task 2.12: Pencatatan pemasukan atau pengeluaran kas operasional RT oleh Bendahara RT.
 * @param {string} token Token sesi Bendahara RT.
 * @param {Object} payload { tanggal, jenis, kategori, nominal, keterangan }.
 * @return {Object} { ok, item, bootstrap } atau { ok:false, code?, error }.
 */
function apiCatatKasRt(token, payload) {
  try {
    var user = requireSession_(token, ['PENGURUS_RT']);
    if (!hasJabatan_(user, 'Bendahara')) {
      return { ok: false, code: 'FORBIDDEN', error: 'Hanya Bendahara RT yang dapat mencatat transaksi kas RT.' };
    }

    var p = payload || {};
    var tanggal = String(p.tanggal || todayJakarta_()).trim();
    var jenis = String(p.jenis || '').trim().toUpperCase();
    var kategori = String(p.kategori || '').trim();
    var nominal = Number(p.nominal);
    var keterangan = String(p.keterangan || '').trim();

    if (!kwIsValidDateYmd_(tanggal)) {
      return { ok: false, error: 'Tanggal tidak valid atau berada di masa depan.' };
    }
    if (jenis !== 'PEMASUKAN' && jenis !== 'PENGELUARAN') {
      return { ok: false, error: 'Jenis transaksi harus PEMASUKAN atau PENGELUARAN.' };
    }
    if (kategori.length < 3 || kategori.length > 60) {
      return { ok: false, error: 'Kategori wajib 3 sampai 60 karakter.' };
    }
    if (keterangan.length > 300) {
      return { ok: false, error: 'Keterangan maksimal 300 karakter.' };
    }
    if (!kwIsIntInRange_(nominal, 1000, null)) {
      return { ok: false, error: 'Nominal wajib angka bulat minimal Rp 1.000.' };
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      if (jenis === 'PENGELUARAN') {
        var saldoRt = computeRtSaldoServer_(user.rtId).saldo;
        if (nominal > saldoRt) {
          return {
            ok: false,
            error: 'Nominal pengeluaran melebihi saldo kas RT saat ini (' + kwFormatRupiah_(saldoRt) + ').'
          };
        }
      }

      var kasId = nextTableId_(SHEET_NAMES.KAS_RT);
      var nowIso = nowJakarta_();
      var kasRow = [
        String(kasId),
        String(user.rtId),
        tanggal,
        jenis,
        kategori,
        String(nominal),
        keterangan,
        '',
        '',
        String(user.id),
        nowIso
      ];
      appendRowFormatted_(SHEET_NAMES.KAS_RT, kasRow);
      SpreadsheetApp.flush();

      return {
        ok: true,
        item: serializeKasRt_(kasRow),
        bootstrap: buildBootstrapPayload_(user)
      };
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return apiError_(err);
  }
}

/**
 * Task 2.11: Pengiriman setoran kas wajib RT ke RW secara atomik (SetoranKas + KasRT PENGELUARAN).
 * @param {string} token Token sesi Bendahara RT.
 * @param {Object} payload { tanggal, nominal }.
 * @return {Object} { ok, setoran, kasEntry, bootstrap } atau { ok:false, code?, error }.
 */
function apiKirimSetoranRw(token, payload) {
  try {
    var user = requireSession_(token, ['PENGURUS_RT']);
    if (!hasJabatan_(user, 'Bendahara')) {
      return { ok: false, code: 'FORBIDDEN', error: 'Hanya Bendahara RT yang dapat mengirim setoran ke RW.' };
    }

    var p = payload || {};
    var tanggal = String(p.tanggal || todayJakarta_()).trim();
    var nominal = Number(p.nominal);

    if (!kwIsValidDateYmd_(tanggal)) {
      return { ok: false, error: 'Tanggal setoran tidak valid atau berada di masa depan.' };
    }
    if (!kwIsIntInRange_(nominal, 1000, null)) {
      return { ok: false, error: 'Nominal setoran wajib angka bulat minimal Rp 1.000.' };
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var saldoRt = computeRtSaldoServer_(user.rtId).saldo;
      if (nominal > saldoRt) {
        return {
          ok: false,
          error: 'Nominal setoran melebihi saldo kas RT saat ini (' + kwFormatRupiah_(saldoRt) + ').'
        };
      }

      var nowIso = nowJakarta_();
      var setoranId = nextTableId_(SHEET_NAMES.SETORAN_KAS);
      var setoranRow = [
        String(setoranId),
        String(user.rtId),
        String(user.rwId),
        tanggal,
        String(nominal),
        'MENUNGGU_KONFIRMASI',
        String(user.id),
        '',
        '',
        nowIso
      ];
      appendRowFormatted_(SHEET_NAMES.SETORAN_KAS, setoranRow);

      var nomorRt = user.rt ? user.rt.nomorRt : '';
      var nomorRw = user.rw ? user.rw.nomorRw : '';
      var kasId = nextTableId_(SHEET_NAMES.KAS_RT);
      var kasRow = [
        String(kasId),
        String(user.rtId),
        tanggal,
        'PENGELUARAN',
        'Setoran ke RW',
        String(nominal),
        'Setoran kas RT ' + nomorRt + ' ke RW ' + nomorRw,
        '',
        String(setoranId),
        String(user.id),
        nowIso
      ];
      appendRowFormatted_(SHEET_NAMES.KAS_RT, kasRow);
      SpreadsheetApp.flush();

      return {
        ok: true,
        setoran: serializeSetoran_(setoranRow),
        kasEntry: serializeKasRt_(kasRow),
        bootstrap: buildBootstrapPayload_(user)
      };
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return apiError_(err);
  }
}

/**
 * Task 2.11: Konfirmasi penerimaan setoran kas RT oleh Bendahara RW.
 * @param {string} token Token sesi Bendahara RW.
 * @param {number|string} setoranId ID setoran kas.
 * @return {Object} { ok, item, bootstrap } atau { ok:false, code?, error }.
 */
function apiKonfirmasiSetoranRw(token, setoranId) {
  try {
    var user = requireSession_(token, ['PENGURUS_RW']);
    if (!hasJabatan_(user, 'Bendahara')) {
      return { ok: false, code: 'FORBIDDEN', error: 'Hanya Bendahara RW yang dapat mengonfirmasi setoran kas.' };
    }

    var targetId = parseInt(setoranId, 10);
    if (isNaN(targetId)) {
      return { ok: false, error: 'ID setoran tidak valid.' };
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var rows = readRows_(SHEET_NAMES.SETORAN_KAS);
      var rowIdx = -1;
      var targetRow = null;
      for (var i = 0; i < rows.length; i++) {
        if (parseInt(rows[i][COL.SETORAN_KAS.ID], 10) === targetId) {
          rowIdx = i;
          targetRow = rows[i].slice();
          break;
        }
      }
      if (!targetRow) {
        return { ok: false, error: 'Data setoran tidak ditemukan.' };
      }

      if (parseInt(targetRow[COL.SETORAN_KAS.RW_ID], 10) !== user.rwId) {
        return { ok: false, code: 'FORBIDDEN', error: 'Setoran ini bukan untuk wilayah RW Anda.' };
      }
      if (String(targetRow[COL.SETORAN_KAS.STATUS]) !== 'MENUNGGU_KONFIRMASI') {
        return { ok: false, error: 'Setoran ini sudah dikonfirmasi sebelumnya.' };
      }

      targetRow[COL.SETORAN_KAS.STATUS] = 'TERKONFIRMASI';
      targetRow[COL.SETORAN_KAS.DIKONFIRMASI_OLEH_ID] = String(user.id);
      targetRow[COL.SETORAN_KAS.DIKONFIRMASI_AT] = nowJakarta_();
      updateRowFormatted_(SHEET_NAMES.SETORAN_KAS, rowIdx + 2, targetRow);
      SpreadsheetApp.flush();

      return {
        ok: true,
        item: serializeSetoran_(targetRow),
        bootstrap: buildBootstrapPayload_(user)
      };
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return apiError_(err);
  }
}

/**
 * Task 2.13: Pembuatan pengumuman lingkup RT atau LINTAS_RW.
 * @param {string} token Token sesi Pengurus RT atau RW.
 * @param {Object} payload { judul, isi, lingkup? }.
 * @return {Object} { ok, item, bootstrap } atau { ok:false, code?, error }.
 */
function apiBuatPengumuman(token, payload) {
  try {
    var user = requireSession_(token, ['PENGURUS_RT', 'PENGURUS_RW']);

    var lingkup = '';
    var rtId = '';
    if (user.role === 'PENGURUS_RT') {
      if (!hasJabatan_(user, 'Ketua') && !hasJabatan_(user, 'Sekretaris')) {
        return { ok: false, code: 'FORBIDDEN', error: 'Hanya Ketua atau Sekretaris RT yang dapat membuat pengumuman RT.' };
      }
      lingkup = 'RT';
      rtId = String(user.rtId || '');
    } else {
      lingkup = 'LINTAS_RW';
      rtId = '';
    }

    var p = payload || {};
    var judul = String(p.judul || '').trim();
    var isi = String(p.isi || '').trim();

    if (judul.length < 5 || judul.length > 150) {
      return { ok: false, error: 'Judul pengumuman wajib 5 sampai 150 karakter.' };
    }
    if (isi.length < 10 || isi.length > 3000) {
      return { ok: false, error: 'Isi pengumuman wajib 10 sampai 3.000 karakter.' };
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var newId = nextTableId_(SHEET_NAMES.PENGUMUMAN);
      var nowIso = nowJakarta_();
      var row = [
        String(newId),
        String(user.rwId),
        rtId,
        lingkup,
        judul,
        isi,
        String(user.id),
        nowIso
      ];
      appendRowFormatted_(SHEET_NAMES.PENGUMUMAN, row);
      SpreadsheetApp.flush();

      var maps = loadContextMaps_();
      return {
        ok: true,
        item: serializePengumuman_(row, maps.pendudukById),
        bootstrap: buildBootstrapPayload_(user)
      };
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return apiError_(err);
  }
}

/**
 * Task 2.14: Pengiriman laporan keamanan atau aspirasi warga ke RT setempat.
 * @param {string} token Token sesi pengguna aktif.
 * @param {Object} payload { jenis, judul, isi }.
 * @return {Object} { ok, item, bootstrap } atau { ok:false, code?, error }.
 */
function apiKirimLaporan(token, payload) {
  try {
    var user = requireSession_(token);
    if (!user.rtId) {
      return { ok: false, error: 'Wilayah RT pelapor tidak ditemukan.' };
    }

    var p = payload || {};
    var jenis = String(p.jenis || '').trim().toUpperCase();
    var judul = String(p.judul || '').trim();
    var isi = String(p.isi || '').trim();

    if (jenis !== 'KEAMANAN' && jenis !== 'ASPIRASI') {
      return { ok: false, error: 'Jenis laporan harus KEAMANAN atau ASPIRASI.' };
    }
    if (judul.length < 5 || judul.length > 150) {
      return { ok: false, error: 'Judul laporan wajib 5 sampai 150 karakter.' };
    }
    if (isi.length < 10 || isi.length > 2000) {
      return { ok: false, error: 'Isi laporan wajib 10 sampai 2.000 karakter.' };
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var newId = nextTableId_(SHEET_NAMES.LAPORAN_WARGA);
      var nowIso = nowJakarta_();
      var row = [
        String(newId),
        String(user.rtId),
        jenis,
        judul,
        isi,
        String(user.id),
        nowIso
      ];
      appendRowFormatted_(SHEET_NAMES.LAPORAN_WARGA, row);
      SpreadsheetApp.flush();

      var maps = loadContextMaps_();
      return {
        ok: true,
        item: serializeLaporan_(row, maps.pendudukById),
        bootstrap: buildBootstrapPayload_(user)
      };
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return apiError_(err);
  }
}
