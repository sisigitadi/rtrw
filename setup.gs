/**
 * SiWarga RT/RW - Skema Sheet, Konstanta Kolom, dan Inisialisasi Database (Task 2.1)
 * Nama tab Google Sheets tanpa underscore sesuai arsitektur GAS modular.
 */

const SHEET_NAMES = {
  RW: 'RW',
  RT: 'RT',
  KARTU_KELUARGA: 'KartuKeluarga',
  PENDUDUK: 'Penduduk',
  PENGAJUAN_SURAT: 'PengajuanSurat',
  IURAN: 'Iuran',
  SETORAN_KAS: 'SetoranKas',
  KAS_RT: 'KasRT',
  PENGUMUMAN: 'Pengumuman',
  LAPORAN_WARGA: 'LaporanWarga',
  SESI: 'Sesi'
};

/**
 * Peta indeks kolom (0-based untuk pembacaan baris getDataRange().getDisplayValues()).
 * Selaras dengan skema tabel pada PRD Bab 10.
 */
const COL = {
  RW: {
    ID: 0,
    NOMOR_RW: 1,
    NAMA_KELURAHAN: 2,
    NAMA_KECAMATAN: 3,
    CREATED_AT: 4
  },
  RT: {
    ID: 0,
    RW_ID: 1,
    NOMOR_RT: 2,
    CREATED_AT: 3
  },
  KARTU_KELUARGA: {
    ID: 0,
    NO_KK: 1,
    RT_ID: 2,
    ALAMAT: 3,
    BLOK: 4,
    STATUS_HUNIAN: 5,
    CREATED_AT: 6
  },
  PENDUDUK: {
    ID: 0,
    NIK: 1,
    KK_ID: 2,
    NAMA: 3,
    TEMPAT_LAHIR: 4,
    TANGGAL_LAHIR: 5,
    JENIS_KELAMIN: 6,
    HUBUNGAN_KELUARGA: 7,
    IS_KEPALA_KELUARGA: 8,
    STATUS_MUTASI: 9,
    ROLE: 10,
    JABATAN: 11,
    PIN_HASH: 12,
    PIN_SALT: 13,
    PIN_GAGAL: 14,
    TERKUNCI_HINGGA: 15,
    CREATED_AT: 16,
    UPDATED_AT: 17
  },
  PENGAJUAN_SURAT: {
    ID: 0,
    NOMOR_SURAT: 1,
    JENIS: 2,
    PEMOHON_ID: 3,
    DIAJUKAN_OLEH_ID: 4,
    MODE_ASISTENSI: 5,
    KEPERLUAN: 6,
    STATUS: 7,
    ALASAN_TOLAK: 8,
    DISETUJUI_RT_OLEH_ID: 9,
    DISETUJUI_RT_AT: 10,
    DISAHKAN_RW_OLEH_ID: 11,
    DISAHKAN_RW_AT: 12,
    KODE_VERIFIKASI: 13,
    CREATED_AT: 14,
    UPDATED_AT: 15
  },
  IURAN: {
    ID: 0,
    KK_ID: 1,
    PERIODE: 2,
    NOMINAL: 3,
    METODE_BAYAR: 4,
    BUKTI_FILE_ID: 5,
    BUKTI_NAMA: 6,
    STATUS: 7,
    DIAJUKAN_OLEH_ID: 8,
    DIVERIFIKASI_OLEH_ID: 9,
    VERIFIED_AT: 10,
    ALASAN_TOLAK: 11,
    CREATED_AT: 12
  },
  SETORAN_KAS: {
    ID: 0,
    RT_ID: 1,
    RW_ID: 2,
    TANGGAL: 3,
    NOMINAL: 4,
    STATUS: 5,
    DIKIRIM_OLEH_ID: 6,
    DIKONFIRMASI_OLEH_ID: 7,
    DIKONFIRMASI_AT: 8,
    CREATED_AT: 9
  },
  KAS_RT: {
    ID: 0,
    RT_ID: 1,
    TANGGAL: 2,
    JENIS: 3,
    KATEGORI: 4,
    NOMINAL: 5,
    KETERANGAN: 6,
    IURAN_ID: 7,
    SETORAN_KAS_ID: 8,
    DICATAT_OLEH_ID: 9,
    CREATED_AT: 10
  },
  PENGUMUMAN: {
    ID: 0,
    RW_ID: 1,
    RT_ID: 2,
    LINGKUP: 3,
    JUDUL: 4,
    ISI: 5,
    DIBUAT_OLEH_ID: 6,
    CREATED_AT: 7
  },
  LAPORAN_WARGA: {
    ID: 0,
    RT_ID: 1,
    JENIS: 2,
    JUDUL: 3,
    ISI: 4,
    PELAPOR_ID: 5,
    CREATED_AT: 6
  },
  SESI: {
    TOKEN: 0,
    PENDUDUK_ID: 1,
    ROLE: 2,
    RT_ID: 3,
    RW_ID: 4,
    EXPIRED_AT: 5,
    CREATED_AT: 6
  }
};

const SHEET_HEADERS = {
  RW: ['id', 'nomor_rw', 'nama_kelurahan', 'nama_kecamatan', 'created_at'],
  RT: ['id', 'rw_id', 'nomor_rt', 'created_at'],
  KartuKeluarga: ['id', 'no_kk', 'rt_id', 'alamat', 'blok', 'status_hunian', 'created_at'],
  Penduduk: [
    'id', 'nik', 'kk_id', 'nama', 'tempat_lahir', 'tanggal_lahir',
    'jenis_kelamin', 'hubungan_keluarga', 'is_kepala_keluarga',
    'status_mutasi', 'role', 'jabatan', 'pin_hash', 'pin_salt',
    'pin_gagal', 'terkunci_hingga', 'created_at', 'updated_at'
  ],
  PengajuanSurat: [
    'id', 'nomor_surat', 'jenis', 'pemohon_id', 'diajukan_oleh_id',
    'mode_asistensi', 'keperluan', 'status', 'alasan_tolak',
    'disetujui_rt_oleh_id', 'disetujui_rt_at', 'disahkan_rw_oleh_id',
    'disahkan_rw_at', 'kode_verifikasi', 'created_at', 'updated_at'
  ],
  Iuran: [
    'id', 'kk_id', 'periode', 'nominal', 'metode_bayar', 'bukti_file_id',
    'bukti_nama', 'status', 'diajukan_oleh_id', 'diverifikasi_oleh_id',
    'verified_at', 'alasan_tolak', 'created_at'
  ],
  SetoranKas: [
    'id', 'rt_id', 'rw_id', 'tanggal', 'nominal', 'status',
    'dikirim_oleh_id', 'dikonfirmasi_oleh_id', 'dikonfirmasi_at', 'created_at'
  ],
  KasRT: [
    'id', 'rt_id', 'tanggal', 'jenis', 'kategori', 'nominal',
    'keterangan', 'iuran_id', 'setoran_kas_id', 'dicatat_oleh_id', 'created_at'
  ],
  Pengumuman: ['id', 'rw_id', 'rt_id', 'lingkup', 'judul', 'isi', 'dibuat_oleh_id', 'created_at'],
  LaporanWarga: ['id', 'rt_id', 'jenis', 'judul', 'isi', 'pelapor_id', 'created_at'],
  Sesi: ['token', 'penduduk_id', 'role', 'rt_id', 'rw_id', 'expired_at', 'created_at']
};

/**
 * Menulis beberapa baris ke sheet mulai setelah baris terakhir dengan format teks (@)
 * agar nol di depan (007, 003, NIK/No KK 16 digit) dan format tanggal tidak berubah.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Array<Array>} rows
 */
function writeSeedRows_(sheet, rows) {
  if (!rows || rows.length === 0) {
    return;
  }
  var startRow = sheet.getLastRow() + 1;
  var numCols = rows[0].length;
  var range = sheet.getRange(startRow, 1, rows.length, numCols);
  if (typeof range.setNumberFormat === 'function') {
    range.setNumberFormat('@');
  }
  range.setValues(rows.map(function(r) {
    return r.map(function(cell) {
      return cell === null || cell === undefined ? '' : String(cell);
    });
  }));
}

/**
 * Memastikan tab dan seluruh kolom header ada secara non-destruktif.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} sheetName
 * @param {Array<string>} headers
 * @return {GoogleAppsScript.Spreadsheet.Sheet}
 */
function ensureSheetSchema_(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  var lastRow = sheet.getLastRow();
  if (lastRow === 0) {
    var hdrRange = sheet.getRange(1, 1, 1, headers.length);
    hdrRange.setValues([headers]);
    if (typeof sheet.setFrozenRows === 'function') {
      sheet.setFrozenRows(1);
    }
    return sheet;
  }
  var lastCol = Math.max(sheet.getLastColumn(), headers.length);
  var existing = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  var existingSet = {};
  var nonEmptyCount = 0;
  for (var i = 0; i < existing.length; i++) {
    var colTitle = String(existing[i] || '').trim();
    if (colTitle) {
      existingSet[colTitle] = true;
      nonEmptyCount = i + 1;
    }
  }
  var nextCol = nonEmptyCount + 1;
  for (var h = 0; h < headers.length; h++) {
    if (!existingSet[headers[h]]) {
      sheet.getRange(1, nextCol, 1, 1).setValue(headers[h]);
      existingSet[headers[h]] = true;
      nextCol++;
    }
  }
  return sheet;
}

/**
 * Inisialisasi non-destruktif seluruh sheet SiWarga RT/RW dan seed data awal Bab 9.
 * Aman dijalankan berulang kali: tidak pernah memanggil clear() pada sheet yang sudah berisi.
 * @return {Object} Ringkasan hasil setup.
 */
function setupDatabase() {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var ss = getSpreadsheet_();
    var sheetOrder = [
      SHEET_NAMES.RW,
      SHEET_NAMES.RT,
      SHEET_NAMES.KARTU_KELUARGA,
      SHEET_NAMES.PENDUDUK,
      SHEET_NAMES.PENGAJUAN_SURAT,
      SHEET_NAMES.IURAN,
      SHEET_NAMES.SETORAN_KAS,
      SHEET_NAMES.KAS_RT,
      SHEET_NAMES.PENGUMUMAN,
      SHEET_NAMES.LAPORAN_WARGA,
      SHEET_NAMES.SESI
    ];

    var sheets = {};
    for (var i = 0; i < sheetOrder.length; i++) {
      var name = sheetOrder[i];
      sheets[name] = ensureSheetSchema_(ss, name, SHEET_HEADERS[name]);
    }

    var seededTabs = [];

    if (sheets[SHEET_NAMES.RW].getLastRow() <= 1) {
      writeSeedRows_(sheets[SHEET_NAMES.RW], [
        ['1', '007', 'Mekarjaya', 'Sukasari', '2025-01-01T08:00:00+07:00']
      ]);
      seededTabs.push(SHEET_NAMES.RW);
    }

    if (sheets[SHEET_NAMES.RT].getLastRow() <= 1) {
      writeSeedRows_(sheets[SHEET_NAMES.RT], [
        ['1', '1', '003', '2025-01-01T08:00:00+07:00'],
        ['2', '1', '004', '2025-01-01T08:00:00+07:00']
      ]);
      seededTabs.push(SHEET_NAMES.RT);
    }

    if (sheets[SHEET_NAMES.KARTU_KELUARGA].getLastRow() <= 1) {
      writeSeedRows_(sheets[SHEET_NAMES.KARTU_KELUARGA], [
        ['1', '3271011203150021', '1', 'Jl. Melati Blok C4 No. 12, Mekarjaya', 'Blok C4 No. 12', 'TETAP', '2025-01-05T09:00:00+07:00'],
        ['2', '3271015510190007', '1', 'Jl. Melati Blok F2 No. 5, Mekarjaya', 'Blok F2 No. 5', 'KONTRAK_KOS', '2025-01-10T09:00:00+07:00'],
        ['3', '3271010408180015', '1', 'Jl. Melati Blok A1 No. 3, Mekarjaya', 'Blok A1 No. 3', 'TETAP', '2025-01-12T09:00:00+07:00'],
        ['4', '3271011905200009', '1', 'Jl. Melati Blok B2 No. 8, Mekarjaya', 'Blok B2 No. 8', 'TETAP', '2025-01-14T09:00:00+07:00'],
        ['5', '3271012207160033', '2', 'Jl. Anggrek Blok D1 No. 7, Mekarjaya', 'Blok D1 No. 7', 'TETAP', '2025-01-15T09:00:00+07:00'],
        ['6', '3271013011210011', '2', 'Jl. Anggrek Blok E3 No. 2, Mekarjaya', 'Blok E3 No. 2', 'KONTRAK_KOS', '2025-01-18T09:00:00+07:00']
      ]);
      seededTabs.push(SHEET_NAMES.KARTU_KELUARGA);
    }

    if (sheets[SHEET_NAMES.PENDUDUK].getLastRow() <= 1) {
      var seedPendudukRaw = [
        ['1', '3271010506800012', '1', 'Bambang Setiawan', 'Bogor', '1980-06-05', 'L', 'KEPALA_KELUARGA', 'true', 'AKTIF', 'WARGA', '', '2025-01-05T09:00:00+07:00', '2025-01-05T09:00:00+07:00'],
        ['2', '3271014407850031', '1', 'Ratna Sari', 'Bandung', '1985-07-04', 'P', 'ISTRI', 'false', 'AKTIF', 'WARGA', '', '2025-01-05T09:05:00+07:00', '2025-01-05T09:05:00+07:00'],
        ['3', '3271016002450018', '1', 'Siti Aminah', 'Cianjur', '1945-02-20', 'P', 'ORANG_TUA', 'false', 'MENINGGAL', 'WARGA', '', '2025-01-05T09:10:00+07:00', '2025-02-14T11:00:00+07:00'],
        ['4', '3271011208100004', '1', 'Rizky Pratama', 'Bogor', '2010-08-12', 'L', 'ANAK', 'false', 'AKTIF', 'WARGA', '', '2025-01-05T09:15:00+07:00', '2025-01-05T09:15:00+07:00'],
        ['5', '3271012009010044', '2', 'Dedi Kurniawan', 'Garut', '2001-09-20', 'L', 'KEPALA_KELUARGA', 'true', 'AKTIF', 'WARGA', '', '2025-01-10T09:00:00+07:00', '2025-01-10T09:00:00+07:00'],
        ['6', '3271015503020019', '2', 'Putri Lestari', 'Tasikmalaya', '2002-03-15', 'P', 'ISTRI', 'false', 'PINDAH_KELUAR', 'WARGA', '', '2025-01-10T09:05:00+07:00', '2025-03-02T10:00:00+07:00'],
        ['7', '3271010103750001', '3', 'Hendra Wijaya', 'Bogor', '1975-03-01', 'L', 'KEPALA_KELUARGA', 'true', 'AKTIF', 'PENGURUS_RT', 'Ketua RT', '2025-01-12T09:00:00+07:00', '2025-01-12T09:00:00+07:00'],
        ['8', '3271014509790002', '3', 'Suryani', 'Sukabumi', '1979-09-05', 'P', 'ISTRI', 'false', 'AKTIF', 'PENGURUS_RT', 'Bendahara RT', '2025-01-12T09:05:00+07:00', '2025-01-12T09:05:00+07:00'],
        ['9', '3271011411820003', '4', 'Agus Santoso', 'Depok', '1982-11-14', 'L', 'KEPALA_KELUARGA', 'true', 'AKTIF', 'PENGURUS_RT', 'Sekretaris RT', '2025-01-14T09:00:00+07:00', '2025-01-14T09:00:00+07:00'],
        ['10', '3271010804680005', '5', 'Ahmad Fauzi', 'Bogor', '1968-04-08', 'L', 'KEPALA_KELUARGA', 'true', 'AKTIF', 'PENGURUS_RW', 'Ketua RW', '2025-01-15T09:00:00+07:00', '2025-01-15T09:00:00+07:00'],
        ['11', '3271015006730006', '5', 'Wahyuni', 'Bandung', '1973-06-10', 'P', 'ISTRI', 'false', 'AKTIF', 'PENGURUS_RW', 'Bendahara RW', '2025-01-15T09:05:00+07:00', '2025-01-15T09:05:00+07:00'],
        ['12', '3271011707930008', '6', 'Rudi Hartono', 'Cirebon', '1993-07-17', 'L', 'KEPALA_KELUARGA', 'true', 'AKTIF', 'WARGA', '', '2025-01-18T09:00:00+07:00', '2025-01-18T09:00:00+07:00']
      ];
      var pendudukRows = seedPendudukRaw.map(function(item) {
        var salt = generateRandomCode_(16);
        var pinHash = hashPinWithSalt_('123456', salt);
        return [
          item[0], item[1], item[2], item[3], item[4], item[5],
          item[6], item[7], item[8], item[9], item[10], item[11],
          pinHash, salt, '0', '', item[12], item[13]
        ];
      });
      writeSeedRows_(sheets[SHEET_NAMES.PENDUDUK], pendudukRows);
      seededTabs.push(SHEET_NAMES.PENDUDUK);
    }

    if (sheets[SHEET_NAMES.PENGAJUAN_SURAT].getLastRow() <= 1) {
      writeSeedRows_(sheets[SHEET_NAMES.PENGAJUAN_SURAT], [
        ['1', '045/RT.003/RW.007/IV/2025', 'KETERANGAN_TIDAK_MAMPU', '1', '1', 'false', 'Pengajuan bantuan biaya pengobatan anak di puskesmas', 'DISAHKAN_RW', '', '7', '2025-04-10T10:15:00+07:00', '10', '2025-04-11T14:30:00+07:00', 'SW2025RT03RW0701', '2025-04-10T08:00:00+07:00', '2025-04-11T14:30:00+07:00'],
        ['2', '', 'KETERANGAN_DOMISILI', '2', '1', 'false', 'Persyaratan administrasi perpanjangan rekening bank dan kantor', 'DIAJUKAN', '', '', '', '', '', '', '2025-05-02T09:20:00+07:00', '2025-05-02T09:20:00+07:00'],
        ['3', '', 'PENGANTAR_SKCK', '5', '9', 'true', 'Pengurusan SKCK di Polres untuk melamar pekerjaan di perusahaan logistik', 'DISETUJUI_RT', '', '7', '2025-05-01T11:00:00+07:00', '', '', '', '2025-05-01T08:30:00+07:00', '2025-05-01T11:00:00+07:00'],
        ['4', '', 'KETERANGAN_USAHA', '1', '1', 'false', 'Pengajuan modal usaha warung sembako di rumah', 'DITOLAK', 'Mohon lengkapi nama dan alamat usaha secara jelas pada kolom keperluan', '7', '2025-03-18T13:00:00+07:00', '', '', '', '2025-03-18T09:00:00+07:00', '2025-03-18T13:00:00+07:00'],
        ['5', '', 'PENGANTAR_UMUM', '12', '12', 'false', 'Pengantar pengurusan dokumen kependudukan ke kantor kelurahan', 'DISETUJUI_RT', '', '10', '2025-05-03T10:00:00+07:00', '', '', '', '2025-05-02T16:00:00+07:00', '2025-05-03T10:00:00+07:00']
      ]);
      seededTabs.push(SHEET_NAMES.PENGAJUAN_SURAT);
    }

    if (sheets[SHEET_NAMES.IURAN].getLastRow() <= 1) {
      writeSeedRows_(sheets[SHEET_NAMES.IURAN], [
        ['1', '1', '2025-04', '50000', 'TRANSFER_BANK', '', 'bukti-bca-0412.jpg', 'TERVERIFIKASI', '1', '8', '2025-04-12T15:20:00+07:00', '', '2025-04-12T09:10:00+07:00'],
        ['2', '1', '2025-03', '50000', 'TRANSFER_BANK', '', 'bukti-mandiri-0305.jpg', 'DITOLAK', '1', '8', '2025-03-06T10:00:00+07:00', 'Foto bukti transfer buram dan nominal tidak terbaca jelas', '2025-03-05T14:00:00+07:00'],
        ['3', '2', '2025-04', '50000', 'TRANSFER_BANK', '', 'bukti-bri-0415.png', 'MENUNGGU_VERIFIKASI', '5', '', '', '', '2025-04-15T11:30:00+07:00'],
        ['4', '4', '2025-04', '50000', 'TRANSFER_BANK', '', 'bukti-bca-0408.jpg', 'TERVERIFIKASI', '9', '8', '2025-04-09T09:00:00+07:00', '', '2025-04-08T19:00:00+07:00']
      ]);
      seededTabs.push(SHEET_NAMES.IURAN);
    }

    if (sheets[SHEET_NAMES.SETORAN_KAS].getLastRow() <= 1) {
      writeSeedRows_(sheets[SHEET_NAMES.SETORAN_KAS], [
        ['1', '1', '1', '2025-03-20', '1200000', 'TERKONFIRMASI', '8', '11', '2025-03-21T09:00:00+07:00', '2025-03-20T10:00:00+07:00'],
        ['2', '1', '1', '2025-04-25', '400000', 'MENUNGGU_KONFIRMASI', '8', '', '', '2025-04-25T11:00:00+07:00'],
        ['3', '2', '1', '2025-03-22', '900000', 'TERKONFIRMASI', '10', '11', '2025-03-23T10:30:00+07:00', '2025-03-22T14:00:00+07:00']
      ]);
      seededTabs.push(SHEET_NAMES.SETORAN_KAS);
    }

    if (sheets[SHEET_NAMES.KAS_RT].getLastRow() <= 1) {
      writeSeedRows_(sheets[SHEET_NAMES.KAS_RT], [
        ['1', '1', '2025-03-01', 'PEMASUKAN', 'Saldo Awal Kas RT', '2450000', 'Saldo kas RT 003 per awal Maret 2025', '', '', '8', '2025-03-01T08:00:00+07:00'],
        ['2', '1', '2025-03-20', 'PENGELUARAN', 'Setoran ke RW', '1200000', 'Setoran kas wajib RT 003 bulan Maret 2025 ke RW 007', '', '1', '8', '2025-03-20T10:00:00+07:00'],
        ['3', '1', '2025-04-05', 'PENGELUARAN', 'Perawatan Fasilitas', '350000', 'Pengecatan pos ronda Blok C', '', '', '8', '2025-04-05T16:00:00+07:00'],
        ['4', '1', '2025-04-09', 'PEMASUKAN', 'Iuran Warga', '50000', 'Iuran periode 2025-04 KK 3271011905200009 (Agus Santoso)', '4', '', '8', '2025-04-09T09:00:00+07:00'],
        ['5', '1', '2025-04-12', 'PEMASUKAN', 'Iuran Warga', '50000', 'Iuran periode 2025-04 KK 3271011203150021 (Bambang Setiawan)', '1', '', '8', '2025-04-12T15:20:00+07:00'],
        ['6', '1', '2025-04-25', 'PENGELUARAN', 'Setoran ke RW', '400000', 'Setoran kas wajib RT 003 bulan April 2025 ke RW 007', '', '2', '8', '2025-04-25T11:00:00+07:00'],
        ['7', '2', '2025-03-01', 'PEMASUKAN', 'Saldo Awal Kas RT', '1850000', 'Saldo kas RT 004 per awal Maret 2025', '', '', '10', '2025-03-01T08:30:00+07:00'],
        ['8', '2', '2025-03-22', 'PENGELUARAN', 'Setoran ke RW', '900000', 'Setoran kas wajib RT 004 bulan Maret 2025 ke RW 007', '', '3', '10', '2025-03-22T14:00:00+07:00'],
        ['9', '2', '2025-04-10', 'PENGELUARAN', 'Kebersihan Lingkungan', '200000', 'Pengadaan tempat sampah pilah RT 004', '', '', '10', '2025-04-10T10:00:00+07:00']
      ]);
      seededTabs.push(SHEET_NAMES.KAS_RT);
    }

    if (sheets[SHEET_NAMES.PENGUMUMAN].getLastRow() <= 1) {
      writeSeedRows_(sheets[SHEET_NAMES.PENGUMUMAN], [
        ['1', '1', '1', 'RT', 'Kerja Bakti Minggu Pagi', 'Kami mengundang seluruh warga RT 003 untuk mengikuti kerja bakti pembersihan saluran air dan pemangkasan dahan pohon pada hari Minggu pukul 07.00 WIB. Mohon membawa peralatan kebersihan masing-masing.', '7', '2025-05-02T08:00:00+07:00'],
        ['2', '1', '', 'LINTAS_RW', 'Jadwal Penyemprotan Nyamuk se-RW', 'Puskesmas Sukasari bersama Pengurus RW 007 akan melaksanakan fogging nyamuk demam berdarah pada hari Sabtu pukul 08.00 sampai 11.00 WIB di seluruh blok RT 003 dan RT 004. Warga dimohon menutup makanan dan tempat penampungan air.', '10', '2025-05-01T14:00:00+07:00'],
        ['3', '1', '1', 'RT', 'Pengambilan Kartu Iuran Warga Semester 1', 'Kartu kendali iuran bulanan sudah dapat diambil di rumah Bendahara RT 003 setiap hari kerja pukul 18.30 sampai 20.30 WIB. Warga yang sudah membayar lewat transfer bank tetap dapat mengunggah bukti langsung melalui SiWarga.', '8', '2025-04-26T18:00:00+07:00'],
        ['4', '1', '', 'LINTAS_RW', 'Pemeliharaan Portal Gerbang Utama RW 007', 'Akses kendaraan roda empat melalui gerbang utara akan dialihkan sementara ke gerbang selatan pada hari Kamis pukul 09.00 hingga 15.00 WIB karena perbaikan palang portal otomatis.', '10', '2025-04-20T09:30:00+07:00'],
        ['5', '1', '1', 'RT', 'Jadwal Ronda Malam Bulan Mei', 'Jadwal piket ronda malam warga RT 003 telah diperbarui untuk bulan Mei. Warga yang berhalangan hadir dimohon melakukan tukar jadwal dengan regu lain maksimal satu hari sebelumnya.', '9', '2025-04-18T19:00:00+07:00']
      ]);
      seededTabs.push(SHEET_NAMES.PENGUMUMAN);
    }

    if (sheets[SHEET_NAMES.LAPORAN_WARGA].getLastRow() <= 1) {
      writeSeedRows_(sheets[SHEET_NAMES.LAPORAN_WARGA], [
        ['1', '1', 'ASPIRASI', 'Lampu jalan gang mati', 'Lampu penerangan jalan di pertigaan gang Blok C4 sudah tiga malam padam sehingga kondisi jalan gelap saat warga pulang kerja malam hari. Mohon bantuan pengurus RT untuk koordinasi penggantian lampu.', '1', '2025-04-28T20:15:00+07:00'],
        ['2', '1', 'KEAMANAN', 'Motor hilang di depan Blok C', 'Telah terjadi kehilangan satu unit sepeda motor yang terparkir di depan rumah Blok C2 sekitar pukul 03.30 WIB dini hari. Kami berharap pengawasan ronda dan kamera pengawas di pintu gang dapat ditingkatkan.', '2', '2025-04-22T07:45:00+07:00']
      ]);
      seededTabs.push(SHEET_NAMES.LAPORAN_WARGA);
    }

    SpreadsheetApp.flush();
    return {
      ok: true,
      sheets: sheetOrder,
      seededTabs: seededTabs
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Memeriksa kesiapan konfigurasi deployment Google Apps Script (Task 3.3).
 * Memvalidasi Script Properties, akses Spreadsheet + 11 tab, serta Folder Drive privat.
 * @return {Object} Ringkasan { ok, checks, warnings }.
 */
function checkDeploymentConfig() {
  var props = PropertiesService.getScriptProperties();
  var checks = [];
  var warnings = [];
  var allOk = true;

  function addCheck(name, passed, detail) {
    checks.push({
      name: name,
      passed: Boolean(passed),
      detail: String(detail || '')
    });
    if (!passed) {
      allOk = false;
    }
  }

  var ssId = String(props.getProperty('SPREADSHEET_ID') || '').trim();
  addCheck(
    'ScriptProperty:SPREADSHEET_ID',
    ssId.length > 0,
    ssId ? 'Terisi.' : 'Belum diatur di Script Properties.'
  );

  var folderId = String(props.getProperty('DRIVE_FOLDER_BUKTI_ID') || '').trim();
  addCheck(
    'ScriptProperty:DRIVE_FOLDER_BUKTI_ID',
    folderId.length > 0,
    folderId ? 'Terisi.' : 'Belum diatur di Script Properties.'
  );

  var webAppUrl = String(props.getProperty('WEBAPP_URL') || '').trim();
  if (!webAppUrl) {
    checks.push({
      name: 'ScriptProperty:WEBAPP_URL',
      passed: true,
      detail: 'Belum diisi (isi setelah Deploy Web App).'
    });
    warnings.push('WEBAPP_URL belum diatur di Script Properties; isi URL produksi /exec setelah deploy agar QR Code dan tautan WhatsApp mengarah ke domain resmi.');
  } else if (webAppUrl.indexOf('https://') !== 0) {
    checks.push({
      name: 'ScriptProperty:WEBAPP_URL',
      passed: false,
      detail: 'WEBAPP_URL harus diawali https://.'
    });
    allOk = false;
  } else {
    addCheck('ScriptProperty:WEBAPP_URL', true, 'Terisi (' + webAppUrl + ').');
  }

  var pepper = String(props.getProperty('PIN_PEPPER') || '').trim();
  var pepperValid = pepper.length >= 32;
  addCheck(
    'ScriptProperty:PIN_PEPPER',
    pepperValid,
    pepperValid
      ? 'Terisi (' + pepper.length + ' karakter).'
      : (pepper ? 'Panjang PIN_PEPPER kurang dari 32 karakter (' + pepper.length + ').' : 'Belum diatur di Script Properties (minimal 32 karakter).')
  );

  // Verifikasi SpreadsheetApp dan 11 tab SHEET_NAMES
  try {
    var ss = getSpreadsheet_();
    var requiredSheets = Object.keys(SHEET_NAMES).map(function(k) {
      return SHEET_NAMES[k];
    });
    var missingSheets = [];
    for (var i = 0; i < requiredSheets.length; i++) {
      if (!ss.getSheetByName(requiredSheets[i])) {
        missingSheets.push(requiredSheets[i]);
      }
    }
    addCheck(
      'Spreadsheet:Tabs',
      missingSheets.length === 0,
      missingSheets.length === 0
        ? 'Seluruh ' + requiredSheets.length + ' tab tersedia.'
        : 'Tab belum ditemukan: ' + missingSheets.join(', ') + '. Jalankan setupDatabase().'
    );
  } catch (ssErr) {
    addCheck('Spreadsheet:Access', false, 'Gagal mengakses Spreadsheet: ' + (ssErr.message || ssErr));
  }

  // Verifikasi Folder Drive privat
  if (folderId) {
    try {
      var folder = DriveApp.getFolderById(folderId);
      var isPublic = false;
      var accessLabel = 'PRIVATE';
      if (typeof folder.getSharingAccess === 'function') {
        var access = folder.getSharingAccess();
        accessLabel = String(access);
        if (
          typeof DriveApp !== 'undefined' &&
          DriveApp.Access &&
          (access === DriveApp.Access.ANYONE || access === DriveApp.Access.ANYONE_WITH_LINK)
        ) {
          isPublic = true;
        } else if (accessLabel === 'ANYONE' || accessLabel === 'ANYONE_WITH_LINK') {
          isPublic = true;
        }
      }
      addCheck(
        'Drive:FolderBuktiPrivat',
        !isPublic,
        isPublic
          ? 'Folder bukti transfer bersifat publik (' + accessLabel + '). Ubah ke Restricted/Privat!'
          : 'Folder dapat diakses dan bersifat privat (' + accessLabel + ').'
      );
    } catch (driveErr) {
      addCheck('Drive:FolderBuktiPrivat', false, 'Gagal mengakses folder Drive: ' + (driveErr.message || driveErr));
    }
  } else {
    addCheck('Drive:FolderBuktiPrivat', false, 'Tidak dapat memeriksa folder karena DRIVE_FOLDER_BUKTI_ID kosong.');
  }

  var summary = {
    ok: allOk,
    checks: checks,
    warnings: warnings
  };

  if (typeof Logger !== 'undefined' && typeof Logger.log === 'function') {
    Logger.log('[SiWarga checkDeploymentConfig] ' + JSON.stringify(summary));
  }

  return summary;
}
