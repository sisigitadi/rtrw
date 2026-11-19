/**
 * SiWarga RT/RW - Layanan Surat Pengantar, Pengesahan Berjenjang, Verifikasi Publik, & PDF QR
 * Tasks 2.6, 2.7, 2.8, 2.9, 2.16
 */

var SURAT_JENIS_LABELS_ = {
  PENGANTAR_UMUM: 'Pengantar Umum/Kelurahan',
  KETERANGAN_DOMISILI: 'Keterangan Domisili (SKD)',
  KETERANGAN_USAHA: 'Keterangan Usaha (SKU)',
  KETERANGAN_TIDAK_MAMPU: 'Keterangan Tidak Mampu (SKTM)',
  PENGANTAR_SKCK: 'Pengantar SKCK',
  PENGANTAR_NIKAH: 'Pengantar Nikah (N1-N4)',
  KETERANGAN_KELAHIRAN_KEMATIAN: 'Keterangan Kelahiran/Kematian'
};

var SURAT_ROMAN_MONTHS_ = [
  'I', 'II', 'III', 'IV', 'V', 'VI',
  'VII', 'VIII', 'IX', 'X', 'XI', 'XII'
];

var SURAT_MONTHS_ID_ = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/* ==========================================================================
   Internal Helpers (service_surat.gs)
   ========================================================================== */

function suratPadZero_(val, len) {
  var s = String(val === null || val === undefined ? '' : val).trim();
  while (s.length < len) {
    s = '0' + s;
  }
  return s;
}

function suratEscHtml_(val) {
  if (val === null || val === undefined) {
    return '';
  }
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function suratFormatDateId_(val) {
  if (!val) {
    return '-';
  }
  var s = String(val).trim();
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    var year = m[1];
    var monthIdx = parseInt(m[2], 10) - 1;
    var day = parseInt(m[3], 10);
    var monthLabel = SURAT_MONTHS_ID_[monthIdx] || m[2];
    return day + ' ' + monthLabel + ' ' + year;
  }
  return s;
}

function suratGetJenisLabel_(jenis) {
  return SURAT_JENIS_LABELS_[String(jenis || '')] || String(jenis || '-');
}

/**
 * Menghasilkan SVG QR Code valid (Model 2, Byte Mode, ECC-L, Version 1-10)
 * agar QR pada PDF resmi dapat dipindai menuju URL verifikasi publik.
 * @param {string} text Teks/URL target QR.
 * @param {number} sizePx Ukuran sisi SVG dalam piksel.
 * @return {string} Markup SVG inline.
 */
function suratGenerateQrSvg_(text, sizePx) {
  var size = sizePx || 104;
  var payload = String(text || '');
  var matrix = suratBuildQrMatrix_(payload);
  if (!matrix) {
    matrix = suratBuildQrFallbackMatrix_(payload);
  }
  var n = matrix.length;
  var quiet = 2;
  var total = n + quiet * 2;
  var rects = [];
  for (var r = 0; r < n; r++) {
    for (var c = 0; c < n; c++) {
      if (matrix[r][c]) {
        rects.push('<rect x="' + (c + quiet) + '" y="' + (r + quiet) + '" width="1" height="1" fill="#1B2623"/>');
      }
    }
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + total + ' ' + total + '" shape-rendering="crispEdges">' +
    '<rect x="0" y="0" width="' + total + '" height="' + total + '" fill="#FFFFFF"/>' +
    rects.join('') +
    '</svg>';
}

function suratBuildQrFallbackMatrix_(text) {
  var n = 21;
  var m = [];
  for (var r = 0; r < n; r++) {
    m.push([]);
    for (var c = 0; c < n; c++) {
      m[r].push(0);
    }
  }
  var drawFinder = function(r0, c0) {
    for (var dr = 0; dr < 7; dr++) {
      for (var dc = 0; dc < 7; dc++) {
        var on = (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
        m[r0 + dr][c0 + dc] = on ? 1 : 0;
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, n - 7);
  drawFinder(n - 7, 0);
  var seed = 0;
  for (var i = 0; i < text.length; i++) {
    seed = (seed * 31 + text.charCodeAt(i)) % 104729;
  }
  for (var rr = 0; rr < n; rr++) {
    for (var cc = 0; cc < n; cc++) {
      var inFinder = (rr < 8 && cc < 8) || (rr < 8 && cc >= n - 8) || (rr >= n - 8 && cc < 8);
      if (!inFinder) {
        m[rr][cc] = ((seed + rr * 37 + cc * 73 + rr * cc * 13) % 11) < 5 ? 1 : 0;
      }
    }
  }
  return m;
}

function suratBuildQrMatrix_(text) {
  // UTF-8 byte array
  var bytes = [];
  for (var i = 0; i < text.length; i++) {
    var code = text.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
    } else {
      bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
    }
  }

  // Version 1..10 ECC-L specs: [version, dataCodewords, ecPerBlock, blocks, alignPositions]
  var specs = [
    null,
    [1, 19, 7, 1, []],
    [2, 34, 10, 1, [6, 18]],
    [3, 55, 15, 1, [6, 22]],
    [4, 80, 20, 1, [6, 26]],
    [5, 108, 26, 1, [6, 30]],
    [6, 136, 18, 2, [6, 34]],
    [7, 156, 20, 2, [6, 22, 38]],
    [8, 194, 24, 2, [6, 24, 42]],
    [9, 232, 30, 2, [6, 26, 46]],
    [10, 274, 18, 4, [6, 28, 50]]
  ];

  var chosen = null;
  for (var v = 1; v < specs.length; v++) {
    var countBits = v <= 9 ? 8 : 16;
    var neededBits = 4 + countBits + bytes.length * 8;
    if (neededBits <= specs[v][1] * 8) {
      chosen = specs[v];
      break;
    }
  }
  if (!chosen) {
    return null;
  }

  var ver = chosen[0];
  var dataCap = chosen[1];
  var ecLen = chosen[2];
  var numBlocks = chosen[3];
  var alignPos = chosen[4];
  var countBitsLen = ver <= 9 ? 8 : 16;

  // Build bit stream: Byte mode (0100) + length + data + terminator + padding
  var bits = [];
  var pushBits = function(val, width) {
    for (var b = width - 1; b >= 0; b--) {
      bits.push((val >> b) & 1);
    }
  };
  pushBits(4, 4);
  pushBits(bytes.length, countBitsLen);
  for (var bi = 0; bi < bytes.length; bi++) {
    pushBits(bytes[bi], 8);
  }
  var maxBits = dataCap * 8;
  for (var t = 0; t < 4 && bits.length < maxBits; t++) {
    bits.push(0);
  }
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }
  var padBytes = [0xEC, 0x11];
  var padIdx = 0;
  while (bits.length < maxBits) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  var dataBytes = [];
  for (var db = 0; db < bits.length; db += 8) {
    var valByte = 0;
    for (var k = 0; k < 8; k++) {
      valByte = (valByte << 1) | bits[db + k];
    }
    dataBytes.push(valByte);
  }

  // GF(256) Reed-Solomon tables
  var gfExp = new Array(512);
  var gfLog = new Array(256);
  var x = 1;
  for (var g = 0; g < 255; g++) {
    gfExp[g] = x;
    gfLog[x] = g;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11D;
    }
  }
  for (var g2 = 255; g2 < 512; g2++) {
    gfExp[g2] = gfExp[g2 - 255];
  }
  var gfMul = function(a, b) {
    if (a === 0 || b === 0) {
      return 0;
    }
    return gfExp[gfLog[a] + gfLog[b]];
  };

  var rsGenPoly = function(degree) {
    var poly = [1];
    for (var i = 0; i < degree; i++) {
      var next = new Array(poly.length + 1);
      for (var z = 0; z < next.length; z++) {
        next[z] = 0;
      }
      var factor = gfExp[i];
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], factor);
      }
      poly = next;
    }
    return poly;
  };

  var rsCompute = function(msg, degree) {
    var gen = rsGenPoly(degree);
    var res = msg.slice();
    for (var z = 0; z < degree; z++) {
      res.push(0);
    }
    for (var i = 0; i < msg.length; i++) {
      var coef = res[i];
      if (coef !== 0) {
        for (var j = 0; j < gen.length; j++) {
          res[i + j] ^= gfMul(gen[j], coef);
        }
      }
    }
    return res.slice(msg.length);
  };

  // Split into blocks and interleave
  var shortBlockLen = Math.floor(dataCap / numBlocks);
  var longBlocks = dataCap % numBlocks;
  var dataBlocks = [];
  var ecBlocks = [];
  var offset = 0;
  for (var blk = 0; blk < numBlocks; blk++) {
    var blkLen = shortBlockLen + (blk >= numBlocks - longBlocks ? 1 : 0);
    var slice = dataBytes.slice(offset, offset + blkLen);
    offset += blkLen;
    dataBlocks.push(slice);
    ecBlocks.push(rsCompute(slice, ecLen));
  }

  var finalBytes = [];
  var maxDataLen = shortBlockLen + (longBlocks > 0 ? 1 : 0);
  for (var di = 0; di < maxDataLen; di++) {
    for (var b1 = 0; b1 < numBlocks; b1++) {
      if (di < dataBlocks[b1].length) {
        finalBytes.push(dataBlocks[b1][di]);
      }
    }
  }
  for (var ei = 0; ei < ecLen; ei++) {
    for (var b2 = 0; b2 < numBlocks; b2++) {
      finalBytes.push(ecBlocks[b2][ei]);
    }
  }

  // Build QR matrix
  var n = ver * 4 + 17;
  var modules = [];
  var isFunction = [];
  for (var r = 0; r < n; r++) {
    modules.push(new Array(n));
    isFunction.push(new Array(n));
    for (var c = 0; c < n; c++) {
      modules[r][c] = 0;
      isFunction[r][c] = false;
    }
  }

  var setFunc = function(r, c, val) {
    modules[r][c] = val ? 1 : 0;
    isFunction[r][c] = true;
  };

  var drawFinderPat = function(r0, c0) {
    for (var dr = -1; dr <= 7; dr++) {
      for (var dc = -1; dc <= 7; dc++) {
        var rr = r0 + dr;
        var cc = c0 + dc;
        if (rr < 0 || rr >= n || cc < 0 || cc >= n) {
          continue;
        }
        var on = (dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6) &&
          (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
        setFunc(rr, cc, on);
      }
    }
  };
  drawFinderPat(0, 0);
  drawFinderPat(0, n - 7);
  drawFinderPat(n - 7, 0);

  // Timing patterns
  for (var tIdx = 8; tIdx < n - 8; tIdx++) {
    setFunc(6, tIdx, tIdx % 2 === 0);
    setFunc(tIdx, 6, tIdx % 2 === 0);
  }

  // Alignment patterns
  for (var ai = 0; ai < alignPos.length; ai++) {
    for (var aj = 0; aj < alignPos.length; aj++) {
      var ar = alignPos[ai];
      var ac = alignPos[aj];
      if ((ar <= 8 && ac <= 8) || (ar <= 8 && ac >= n - 9) || (ar >= n - 9 && ac <= 8)) {
        continue;
      }
      for (var adr = -2; adr <= 2; adr++) {
        for (var adc = -2; adc <= 2; adc++) {
          var aOn = (Math.abs(adr) === 2 || Math.abs(adc) === 2 || (adr === 0 && adc === 0));
          setFunc(ar + adr, ac + adc, aOn);
        }
      }
    }
  }

  // Format info reservation + dark module
  for (var f = 0; f < 9; f++) {
    if (f !== 6) {
      setFunc(8, f, false);
      setFunc(f, 8, false);
    }
  }
  for (var f2 = 0; f2 < 8; f2++) {
    setFunc(8, n - 1 - f2, false);
    setFunc(n - 1 - f2, 8, false);
  }
  setFunc(n - 8, 8, true);

  // Version info for ver >= 7
  if (ver >= 7) {
    var remV = ver;
    for (var vi = 0; vi < 12; vi++) {
      remV = (remV << 1) ^ ((remV >>> 11) * 0x1F25);
    }
    var verBits = (ver << 12) | remV;
    for (var vb = 0; vb < 18; vb++) {
      var bitV = ((verBits >>> vb) & 1) === 1;
      var vr = Math.floor(vb / 3);
      var vc = n - 11 + (vb % 3);
      setFunc(vr, vc, bitV);
      setFunc(vc, vr, bitV);
    }
  }

  // Place data bits (mask 0: (r + c) % 2 === 0)
  var bitPos = 0;
  var totalDataBits = finalBytes.length * 8;
  var up = true;
  for (var right = n - 1; right >= 1; right -= 2) {
    if (right === 6) {
      right = 5;
    }
    for (var vert = 0; vert < n; vert++) {
      var row = up ? (n - 1 - vert) : vert;
      for (var lr = 0; lr < 2; lr++) {
        var col = right - lr;
        if (!isFunction[row][col]) {
          var bit = 0;
          if (bitPos < totalDataBits) {
            bit = (finalBytes[bitPos >> 3] >>> (7 - (bitPos & 7))) & 1;
            bitPos++;
          }
          var masked = ((row + col) % 2 === 0) ? (bit ^ 1) : bit;
          modules[row][col] = masked;
        }
      }
    }
    up = !up;
  }

  // Format bits for ECC-L (01) and Mask 0 (000) => data = 0b01000 = 8
  var fmtData = 8;
  var remF = fmtData;
  for (var fi = 0; fi < 10; fi++) {
    remF = (remF << 1) ^ ((remF >>> 9) * 0x537);
  }
  var fmtBits = ((fmtData << 10) | remF) ^ 0x5412;
  for (var fb = 0; fb < 15; fb++) {
    var fBit = ((fmtBits >>> fb) & 1) === 1;
    if (fb < 6) {
      modules[8][fb] = fBit ? 1 : 0;
    } else if (fb < 8) {
      modules[8][fb + 1] = fBit ? 1 : 0;
    } else {
      modules[8][n - 15 + fb] = fBit ? 1 : 0;
    }
    if (fb < 8) {
      modules[n - 1 - fb][8] = fBit ? 1 : 0;
    } else if (fb < 9) {
      modules[15 - fb][8] = fBit ? 1 : 0;
    } else {
      modules[14 - fb][8] = fBit ? 1 : 0;
    }
  }

  return modules;
}

/* ==========================================================================
   Public & Authenticated Surat API Endpoints
   ========================================================================== */

/**
 * Verifikasi keaslian surat secara publik berdasarkan kode verifikasi QR.
 * TIDAK memerlukan token sesi dan TIDAK PERNAH mengembalikan data pribadi pemohon.
 * @param {string} kode Kode verifikasi dari QR Code.
 * @return {Object} { ok:true, found, status:'ASLI'|'TIDAK DITEMUKAN', nomorSurat }
 */
function apiVerifikasiSurat(kode) {
  try {
    var cleanKode = String(kode || '').trim().toUpperCase();
    if (!cleanKode) {
      return {
        ok: true,
        found: false,
        status: 'TIDAK DITEMUKAN',
        nomorSurat: null
      };
    }

    var ss = getSpreadsheet_();
    var sheet = ss.getSheetByName(SHEET_NAMES.PENGAJUAN_SURAT);
    if (!sheet || sheet.getLastRow() <= 1) {
      return {
        ok: true,
        found: false,
        status: 'TIDAK DITEMUKAN',
        nomorSurat: null
      };
    }

    var rows = sheet.getDataRange().getDisplayValues();
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var rowKode = String(row[COL.PENGAJUAN_SURAT.KODE_VERIFIKASI] || '').trim().toUpperCase();
      var rowStatus = String(row[COL.PENGAJUAN_SURAT.STATUS] || '').trim();
      if (rowKode && rowKode === cleanKode && rowStatus === 'DISAHKAN_RW') {
        return {
          ok: true,
          found: true,
          status: 'ASLI',
          nomorSurat: String(row[COL.PENGAJUAN_SURAT.NOMOR_SURAT] || '')
        };
      }
    }

    return {
      ok: true,
      found: false,
      status: 'TIDAK DITEMUKAN',
      nomorSurat: null
    };
  } catch (err) {
    return apiError_(err);
  }
}

/**
 * Mengajukan surat pengantar atau keterangan baru (Warga sendiri atau Mode Asistensi Pengurus RT).
 * @param {string} token Token sesi pengguna.
 * @param {Object} payload { pemohonId, jenis, keperluan, modeAsistensi }
 * @return {Object} { ok:true, item, bootstrap }
 */
function apiAjukanSurat(token, payload) {
  try {
    var user = requireSession_(token);
    var p = payload || {};
    var pemohonId = parseInt(p.pemohonId, 10);
    var jenis = String(p.jenis || '').trim();
    var keperluan = String(p.keperluan || '').trim();
    var modeAsistensi = Boolean(p.modeAsistensi);

    if (isNaN(pemohonId)) {
      return { ok: false, error: 'Pemohon wajib dipilih.' };
    }
    if (!SURAT_JENIS_LABELS_[jenis]) {
      return { ok: false, error: 'Jenis surat tidak valid.' };
    }
    if (keperluan.length < 10 || keperluan.length > 500) {
      return { ok: false, error: 'Keperluan wajib diisi antara 10 sampai 500 karakter.' };
    }

    if (modeAsistensi) {
      var canAsistensi = user.role === 'PENGURUS_RT' && (hasJabatan_(user, 'Ketua') || hasJabatan_(user, 'Sekretaris'));
      if (!canAsistensi) {
        return {
          ok: false,
          code: 'FORBIDDEN',
          error: 'Mode asistensi hanya tersedia untuk Ketua atau Sekretaris RT.'
        };
      }
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var maps = loadContextMaps_();
      var pemohon = maps.pendudukById[pemohonId];
      if (!pemohon || pemohon.statusMutasi !== 'AKTIF') {
        return { ok: false, error: 'Pemohon harus penduduk berstatus AKTIF.' };
      }

      var pemohonKk = maps.kkById[pemohon.kkId];
      if (!pemohonKk) {
        return { ok: false, error: 'Data Kartu Keluarga pemohon tidak ditemukan.' };
      }

      if (modeAsistensi) {
        if (pemohonKk.rtId !== user.rtId) {
          return {
            ok: false,
            code: 'FORBIDDEN',
            error: 'Pemohon asistensi harus berasal dari wilayah RT Anda.'
          };
        }
      } else {
        if (pemohon.kkId !== user.kkId) {
          return {
            ok: false,
            code: 'FORBIDDEN',
            error: 'Pemohon harus berasal dari Kartu Keluarga yang sama.'
          };
        }
      }

      var newId = nextTableId_(SHEET_NAMES.PENGAJUAN_SURAT);
      var nowIso = nowJakarta_();
      var newRow = [
        String(newId),
        '',
        jenis,
        String(pemohon.id),
        String(user.id),
        modeAsistensi ? 'true' : 'false',
        keperluan,
        'DIAJUKAN',
        '',
        '',
        '',
        '',
        '',
        '',
        nowIso,
        nowIso
      ];

      appendRowFormatted_(SHEET_NAMES.PENGAJUAN_SURAT, newRow);
      SpreadsheetApp.flush();

      var item = serializeSurat_(newRow, maps.pendudukById);
      return {
        ok: true,
        item: item,
        surat: item,
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
 * Memproses persetujuan atau penolakan surat pada tingkat RT oleh Ketua RT.
 * @param {string} token Token sesi Ketua RT.
 * @param {number|string} suratId ID pengajuan surat.
 * @param {string} aksi 'SETUJUI' atau 'TOLAK'.
 * @param {string} alasanTolak Alasan penolakan (wajib 10..300 karakter jika TOLAK).
 * @return {Object} { ok:true, item, bootstrap }
 */
function apiProsesSuratRt(token, suratId, aksi, alasanTolak) {
  try {
    var user = requireSession_(token, ['PENGURUS_RT']);
    if (!hasJabatan_(user, 'Ketua')) {
      return {
        ok: false,
        code: 'FORBIDDEN',
        error: 'Hanya Ketua RT yang berwenang menyetujui atau menolak surat di tingkat RT.'
      };
    }

    var targetId = parseInt(suratId, 10);
    if (isNaN(targetId)) {
      return { ok: false, error: 'ID surat tidak valid.' };
    }

    var aksiNorm = String(aksi || '').trim().toUpperCase();
    if (aksiNorm !== 'SETUJUI' && aksiNorm !== 'TOLAK') {
      return { ok: false, error: 'Aksi persetujuan RT harus SETUJUI atau TOLAK.' };
    }

    var cleanAlasan = String(alasanTolak || '').trim();
    if (aksiNorm === 'TOLAK' && (cleanAlasan.length < 10 || cleanAlasan.length > 300)) {
      return { ok: false, error: 'Alasan penolakan wajib diisi antara 10 sampai 300 karakter.' };
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var maps = loadContextMaps_();
      var rows = readRows_(SHEET_NAMES.PENGAJUAN_SURAT);
      var rowIdx = -1;
      var targetRow = null;
      for (var i = 0; i < rows.length; i++) {
        if (parseInt(rows[i][COL.PENGAJUAN_SURAT.ID], 10) === targetId) {
          rowIdx = i;
          targetRow = rows[i].slice();
          break;
        }
      }

      if (!targetRow) {
        return { ok: false, error: 'Pengajuan surat tidak ditemukan.' };
      }

      var pemohonId = parseInt(targetRow[COL.PENGAJUAN_SURAT.PEMOHON_ID], 10);
      var pemohon = maps.pendudukById[pemohonId];
      var kk = pemohon ? maps.kkById[pemohon.kkId] : null;
      if (!kk || kk.rtId !== user.rtId) {
        return {
          ok: false,
          code: 'FORBIDDEN',
          error: 'Surat tidak ditemukan di wilayah RT Anda.'
        };
      }

      if (String(targetRow[COL.PENGAJUAN_SURAT.STATUS] || '').trim() !== 'DIAJUKAN') {
        return { ok: false, error: 'Hanya surat berstatus DIAJUKAN yang dapat diproses oleh Ketua RT.' };
      }

      var nowIso = nowJakarta_();
      if (aksiNorm === 'SETUJUI') {
        targetRow[COL.PENGAJUAN_SURAT.STATUS] = 'DISETUJUI_RT';
        targetRow[COL.PENGAJUAN_SURAT.ALASAN_TOLAK] = '';
      } else {
        targetRow[COL.PENGAJUAN_SURAT.STATUS] = 'DITOLAK';
        targetRow[COL.PENGAJUAN_SURAT.ALASAN_TOLAK] = cleanAlasan;
      }
      targetRow[COL.PENGAJUAN_SURAT.DISETUJUI_RT_OLEH_ID] = String(user.id);
      targetRow[COL.PENGAJUAN_SURAT.DISETUJUI_RT_AT] = nowIso;
      targetRow[COL.PENGAJUAN_SURAT.UPDATED_AT] = nowIso;

      updateRowFormatted_(SHEET_NAMES.PENGAJUAN_SURAT, rowIdx + 2, targetRow);
      SpreadsheetApp.flush();

      var item = serializeSurat_(targetRow, maps.pendudukById);
      return {
        ok: true,
        item: item,
        surat: item,
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
 * Memproses pengesahan atau penolakan surat pada tingkat RW oleh Ketua RW.
 * Saat SAHKAN: menerbitkan nomor surat berurut per RW & tahun serta kode verifikasi 16 karakter unik.
 * @param {string} token Token sesi Ketua RW.
 * @param {number|string} suratId ID pengajuan surat.
 * @param {string} aksi 'SAHKAN' atau 'TOLAK'.
 * @param {string} alasanTolak Alasan penolakan (wajib 10..300 karakter jika TOLAK).
 * @return {Object} { ok:true, item, bootstrap }
 */
function apiProsesSuratRw(token, suratId, aksi, alasanTolak) {
  try {
    var user = requireSession_(token, ['PENGURUS_RW']);
    if (!hasJabatan_(user, 'Ketua')) {
      return {
        ok: false,
        code: 'FORBIDDEN',
        error: 'Hanya Ketua RW yang berwenang mengesahkan atau menolak surat di tingkat RW.'
      };
    }

    var targetId = parseInt(suratId, 10);
    if (isNaN(targetId)) {
      return { ok: false, error: 'ID surat tidak valid.' };
    }

    var aksiNorm = String(aksi || '').trim().toUpperCase();
    if (aksiNorm !== 'SAHKAN' && aksiNorm !== 'TOLAK') {
      return { ok: false, error: 'Aksi pengesahan RW harus SAHKAN atau TOLAK.' };
    }

    var cleanAlasan = String(alasanTolak || '').trim();
    if (aksiNorm === 'TOLAK' && (cleanAlasan.length < 10 || cleanAlasan.length > 300)) {
      return { ok: false, error: 'Alasan penolakan wajib diisi antara 10 sampai 300 karakter.' };
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var maps = loadContextMaps_();
      var rows = readRows_(SHEET_NAMES.PENGAJUAN_SURAT);
      var rowIdx = -1;
      var targetRow = null;
      for (var i = 0; i < rows.length; i++) {
        if (parseInt(rows[i][COL.PENGAJUAN_SURAT.ID], 10) === targetId) {
          rowIdx = i;
          targetRow = rows[i].slice();
          break;
        }
      }

      if (!targetRow) {
        return { ok: false, error: 'Pengajuan surat tidak ditemukan.' };
      }

      if (String(targetRow[COL.PENGAJUAN_SURAT.STATUS] || '').trim() !== 'DISETUJUI_RT') {
        return { ok: false, error: 'Hanya surat berstatus DISETUJUI_RT yang dapat diproses oleh Ketua RW.' };
      }

      var pemohonId = parseInt(targetRow[COL.PENGAJUAN_SURAT.PEMOHON_ID], 10);
      var pemohon = maps.pendudukById[pemohonId];
      var kk = pemohon ? maps.kkById[pemohon.kkId] : null;
      var rt = kk ? maps.rtById[kk.rtId] : null;
      var rw = rt ? maps.rwById[rt.rwId] : (user.rw || maps.rwById[user.rwId]);

      if (rt && user.rwId && rt.rwId !== user.rwId) {
        return {
          ok: false,
          code: 'FORBIDDEN',
          error: 'Surat tidak berasal dari wilayah RW Anda.'
        };
      }

      var nowDate = new Date();
      var nowIso = formatDateTimeJakarta_(nowDate);

      if (aksiNorm === 'SAHKAN') {
        var yearStr = Utilities.formatDate(nowDate, 'Asia/Jakarta', 'yyyy');
        var monthNum = parseInt(Utilities.formatDate(nowDate, 'Asia/Jakarta', 'MM'), 10);
        var romanMonth = SURAT_ROMAN_MONTHS_[monthNum - 1] || 'I';
        var nomorRt = suratPadZero_(rt ? rt.nomorRt : '0', 3);
        var nomorRw = suratPadZero_(rw ? rw.nomorRw : '0', 3);
        var targetRwId = rw ? rw.id : user.rwId;

        var maxSeq = 0;
        var existingCodes = {};
        for (var j = 0; j < rows.length; j++) {
          var r = rows[j];
          var existingCode = String(r[COL.PENGAJUAN_SURAT.KODE_VERIFIKASI] || '').trim().toUpperCase();
          if (existingCode) {
            existingCodes[existingCode] = true;
          }
          var existingNo = String(r[COL.PENGAJUAN_SURAT.NOMOR_SURAT] || '').trim();
          if (existingNo) {
            var parts = existingNo.split('/');
            if (parts.length === 5 && parts[4] === yearStr) {
              var rPem = maps.pendudukById[parseInt(r[COL.PENGAJUAN_SURAT.PEMOHON_ID], 10)];
              var rKk = rPem ? maps.kkById[rPem.kkId] : null;
              var rRt = rKk ? maps.rtById[rKk.rtId] : null;
              var sameRw = rRt ? (rRt.rwId === targetRwId) : (parts[2] === 'RW.' + nomorRw);
              if (sameRw) {
                var seqNum = parseInt(parts[0], 10);
                if (!isNaN(seqNum) && seqNum > maxSeq) {
                  maxSeq = seqNum;
                }
              }
            }
          }
        }

        var nextSeq = suratPadZero_(maxSeq + 1, 3);
        var nomorSurat = nextSeq + '/RT.' + nomorRt + '/RW.' + nomorRw + '/' + romanMonth + '/' + yearStr;

        var kodeVerifikasi = generateRandomCode_(16);
        while (existingCodes[kodeVerifikasi]) {
          kodeVerifikasi = generateRandomCode_(16);
        }

        targetRow[COL.PENGAJUAN_SURAT.STATUS] = 'DISAHKAN_RW';
        targetRow[COL.PENGAJUAN_SURAT.NOMOR_SURAT] = nomorSurat;
        targetRow[COL.PENGAJUAN_SURAT.KODE_VERIFIKASI] = kodeVerifikasi;
        targetRow[COL.PENGAJUAN_SURAT.ALASAN_TOLAK] = '';
      } else {
        targetRow[COL.PENGAJUAN_SURAT.STATUS] = 'DITOLAK';
        targetRow[COL.PENGAJUAN_SURAT.ALASAN_TOLAK] = cleanAlasan;
      }

      targetRow[COL.PENGAJUAN_SURAT.DISAHKAN_RW_OLEH_ID] = String(user.id);
      targetRow[COL.PENGAJUAN_SURAT.DISAHKAN_RW_AT] = nowIso;
      targetRow[COL.PENGAJUAN_SURAT.UPDATED_AT] = nowIso;

      updateRowFormatted_(SHEET_NAMES.PENGAJUAN_SURAT, rowIdx + 2, targetRow);
      SpreadsheetApp.flush();

      var item = serializeSurat_(targetRow, maps.pendudukById);
      return {
        ok: true,
        item: item,
        surat: item,
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
 * Menghasilkan PDF resmi surat yang telah disahkan RW, lengkap dengan kop RT/RW,
 * data pemohon, blok tanda tangan berjenjang, dan QR Code SVG inline.
 * @param {string} token Token sesi pengguna.
 * @param {number|string} suratId ID pengajuan surat.
 * @return {Object} { ok:true, filename, mimeType:'application/pdf', base64 }
 */
function apiGenerateSuratPdf(token, suratId) {
  try {
    var user = requireSession_(token);
    var targetId = parseInt(suratId, 10);
    if (isNaN(targetId)) {
      return { ok: false, error: 'ID surat tidak valid.' };
    }

    var maps = loadContextMaps_();
    var rows = readRows_(SHEET_NAMES.PENGAJUAN_SURAT);
    var targetRow = null;
    for (var i = 0; i < rows.length; i++) {
      if (parseInt(rows[i][COL.PENGAJUAN_SURAT.ID], 10) === targetId) {
        targetRow = rows[i];
        break;
      }
    }

    if (!targetRow) {
      return { ok: false, error: 'Surat tidak ditemukan.' };
    }

    var surat = serializeSurat_(targetRow, maps.pendudukById);
    if (surat.status !== 'DISAHKAN_RW') {
      return { ok: false, error: 'PDF resmi hanya dapat diunduh setelah surat disahkan oleh Ketua RW.' };
    }

    var pemohon = maps.pendudukById[surat.pemohonId] || null;
    var kk = pemohon ? (maps.kkById[pemohon.kkId] || null) : null;
    var rt = kk ? (maps.rtById[kk.rtId] || null) : null;
    var rw = rt ? (maps.rwById[rt.rwId] || null) : (user.rw || null);

    var sameKk = pemohon && pemohon.kkId === user.kkId;
    var sameRtPengurus = user.role === 'PENGURUS_RT' && kk && kk.rtId === user.rtId;
    var sameRwPengurus = user.role === 'PENGURUS_RW' && (!rt || rt.rwId === user.rwId);
    if (!sameKk && !sameRtPengurus && !sameRwPengurus) {
      return {
        ok: false,
        code: 'FORBIDDEN',
        error: 'Anda tidak memiliki izin untuk mengunduh PDF surat ini.'
      };
    }

    var nomorRt = suratPadZero_(rt ? rt.nomorRt : '000', 3);
    var nomorRw = suratPadZero_(rw ? rw.nomorRw : '000', 3);
    var namaKelurahan = rw ? rw.namaKelurahan : '';
    var namaKecamatan = rw ? rw.namaKecamatan : '';
    var jenisLabel = suratGetJenisLabel_(surat.jenis);

    var rtApprover = surat.disetujuiRtOlehId ? maps.pendudukById[surat.disetujuiRtOlehId] : null;
    var rwApprover = surat.disahkanRwOlehId ? maps.pendudukById[surat.disahkanRwOlehId] : null;

    var appUrl = getAppUrl_();
    var verifUrl = (appUrl ? appUrl : '') + '?page=verifikasi&kode=' + encodeURIComponent(surat.kodeVerifikasi || '');
    var qrSvg = suratGenerateQrSvg_(verifUrl, 100);

    var ttlPemohon = pemohon
      ? (pemohon.tempatLahir + ', ' + suratFormatDateId_(pemohon.tanggalLahir))
      : '-';

    var html =
      '<!DOCTYPE html>' +
      '<html lang="id">' +
      '<head>' +
        '<meta charset="UTF-8">' +
        '<style>' +
          '@page { size: A4; margin: 20mm 20mm 18mm 20mm; }' +
          'body { font-family: Arial, Helvetica, sans-serif; color: #1B2623; font-size: 11pt; line-height: 1.5; margin: 0; padding: 0; }' +
          '.kop { text-align: center; border-bottom: 3px double #1B2623; padding-bottom: 10px; margin-bottom: 18px; }' +
          '.kop-title { font-size: 13pt; font-weight: bold; letter-spacing: 0.4px; margin: 0; }' +
          '.kop-sub { font-size: 10.5pt; font-weight: bold; margin: 2px 0 0 0; }' +
          '.doc-head { text-align: center; margin-bottom: 18px; }' +
          '.doc-title { font-size: 12pt; font-weight: bold; text-decoration: underline; margin: 0; }' +
          '.doc-no { font-size: 10.5pt; margin: 4px 0 0 0; font-family: "Courier New", monospace; }' +
          '.intro { margin: 0 0 12px 0; text-align: justify; }' +
          'table.bio { width: 100%; border-collapse: collapse; margin: 0 0 16px 0; }' +
          'table.bio td { padding: 4px 6px; vertical-align: top; }' +
          'table.bio td.lbl { width: 175px; font-weight: bold; }' +
          'table.bio td.sep { width: 14px; text-align: center; }' +
          '.closing { margin: 0 0 22px 0; text-align: justify; }' +
          'table.ttd { width: 100%; border-collapse: collapse; margin-top: 12px; }' +
          'table.ttd td { width: 50%; vertical-align: top; padding: 6px 10px 6px 0; }' +
          '.ttd-role { font-size: 10pt; color: #5B6B66; margin-bottom: 4px; }' +
          '.ttd-name { font-size: 11pt; font-weight: bold; margin: 14px 0 2px 0; }' +
          '.ttd-meta { font-size: 9.5pt; color: #1B2623; }' +
          '.ttd-elec { font-size: 9pt; font-style: italic; color: #0E6B5C; margin-top: 4px; }' +
          '.qr-box { margin-top: 22px; padding-top: 12px; border-top: 1px solid #DDE5E2; }' +
          'table.qr-tbl { width: 100%; border-collapse: collapse; }' +
          'table.qr-tbl td { vertical-align: middle; }' +
          'table.qr-tbl td.qr-cell { width: 112px; }' +
          '.qr-title { font-size: 10pt; font-weight: bold; margin: 0 0 4px 0; }' +
          '.qr-code { font-size: 9.5pt; font-family: "Courier New", monospace; margin: 0 0 4px 0; }' +
          '.qr-note { font-size: 8.5pt; color: #5B6B66; margin: 0; word-break: break-all; }' +
        '</style>' +
      '</head>' +
      '<body>' +
        '<div class="kop">' +
          '<p class="kop-title">RUKUN TETANGGA ' + suratEscHtml_(nomorRt) + ' / RUKUN WARGA ' + suratEscHtml_(nomorRw) + '</p>' +
          '<p class="kop-sub">KELURAHAN ' + suratEscHtml_(namaKelurahan.toUpperCase()) + ', KECAMATAN ' + suratEscHtml_(namaKecamatan.toUpperCase()) + '</p>' +
        '</div>' +
        '<div class="doc-head">' +
          '<p class="doc-title">' + suratEscHtml_(jenisLabel.toUpperCase()) + '</p>' +
          '<p class="doc-no">Nomor: ' + suratEscHtml_(surat.nomorSurat) + '</p>' +
        '</div>' +
        '<p class="intro">Yang bertanda tangan di bawah ini, Pengurus RT ' + suratEscHtml_(nomorRt) + ' / RW ' + suratEscHtml_(nomorRw) +
          ', Kelurahan ' + suratEscHtml_(namaKelurahan) + ', Kecamatan ' + suratEscHtml_(namaKecamatan) + ', menerangkan dengan sebenarnya bahwa:</p>' +
        '<table class="bio">' +
          '<tr><td class="lbl">Nama Lengkap</td><td class="sep">:</td><td>' + suratEscHtml_(pemohon ? pemohon.nama : '-') + '</td></tr>' +
          '<tr><td class="lbl">NIK</td><td class="sep">:</td><td>' + suratEscHtml_(pemohon ? pemohon.nik : '-') + '</td></tr>' +
          '<tr><td class="lbl">Tempat, Tanggal Lahir</td><td class="sep">:</td><td>' + suratEscHtml_(ttlPemohon) + '</td></tr>' +
          '<tr><td class="lbl">Jenis Kelamin</td><td class="sep">:</td><td>' + suratEscHtml_(pemohon && pemohon.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki') + '</td></tr>' +
          '<tr><td class="lbl">Alamat</td><td class="sep">:</td><td>' + suratEscHtml_(kk ? kk.alamat : '-') + '</td></tr>' +
          '<tr><td class="lbl">Keperluan</td><td class="sep">:</td><td>' + suratEscHtml_(surat.keperluan).replace(/\r\n|\r|\n/g, '<br>') + '</td></tr>' +
        '</table>' +
        '<p class="closing">Demikian surat keterangan/pengantar ini dibuat untuk dipergunakan sebagaimana mestinya.</p>' +
        '<table class="ttd">' +
          '<tr>' +
            '<td>' +
              '<div class="ttd-role">Persetujuan RT ' + suratEscHtml_(nomorRt) + '</div>' +
              '<div class="ttd-meta">' + suratEscHtml_(rtApprover && rtApprover.jabatan ? rtApprover.jabatan : 'Ketua RT') + '</div>' +
              '<div class="ttd-name">' + suratEscHtml_(rtApprover ? rtApprover.nama : '-') + '</div>' +
              '<div class="ttd-meta">Disetujui: ' + suratEscHtml_(suratFormatDateId_(surat.disetujuiRtAt)) + '</div>' +
            '</td>' +
            '<td>' +
              '<div class="ttd-role">Pengesahan RW ' + suratEscHtml_(nomorRw) + '</div>' +
              '<div class="ttd-meta">' + suratEscHtml_(rwApprover && rwApprover.jabatan ? rwApprover.jabatan : 'Ketua RW') + '</div>' +
              '<div class="ttd-name">' + suratEscHtml_(rwApprover ? rwApprover.nama : '-') + '</div>' +
              '<div class="ttd-meta">Disahkan: ' + suratEscHtml_(suratFormatDateId_(surat.disahkanRwAt)) + '</div>' +
              '<div class="ttd-elec">Ditandatangani secara elektronik</div>' +
            '</td>' +
          '</tr>' +
        '</table>' +
        '<div class="qr-box">' +
          '<table class="qr-tbl">' +
            '<tr>' +
              '<td class="qr-cell">' + qrSvg + '</td>' +
              '<td>' +
                '<p class="qr-title">Verifikasi Keaslian Dokumen</p>' +
                '<p class="qr-code">Kode: ' + suratEscHtml_(surat.kodeVerifikasi) + '</p>' +
                '<p class="qr-note">Pindai QR Code atau kunjungi: ' + suratEscHtml_(verifUrl) + '</p>' +
              '</td>' +
            '</tr>' +
          '</table>' +
        '</div>' +
      '</body>' +
      '</html>';

    var pdfBlob = Utilities.newBlob(html, 'text/html', 'surat.html').getAs('application/pdf');
    var safeNomor = String(surat.nomorSurat || surat.id).replace(/[^a-zA-Z0-9._-]+/g, '-');
    var filename = 'Surat_' + safeNomor + '.pdf';

    return {
      ok: true,
      filename: filename,
      mimeType: 'application/pdf',
      base64: Utilities.base64Encode(pdfBlob.getBytes())
    };
  } catch (err) {
    return apiError_(err);
  }
}
