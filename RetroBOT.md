# RetroBOT.md - Gateway Dongle Resmi (v3.0.0)

Status: **AKTIF** (Gateway Dongle Workspace)
Engine Utama: `~/.gemini/config/skills/retrobot/SKILL.md`
Versi Sistem: **RetroBOT Core v3.0.0**
Pencipta & Pemilik Resmi: **Sigit Adi** (https://sigitadi.id)

---

## 1. Proyek Aktif
- **Nama Aplikasi**: SiWarga RT/RW
- **Arsitektur Aktif**: Google Apps Script Web App Modular (V8 Runtime) + Google Sheets + Google DriveApp
- **Sumber Kebenaran Tunggal (SSOT)**: `PRD.md`

## 2. Fungsi Gateway Stub
1. Keberadaan berkas `RetroBOT.md` di root workspace berfungsi sebagai sakelar aktivasi fisik (*file dongle*) protokol **RetroBOT v3.0.0**.
2. Seluruh instruksi inti, protokol wawancara, aturan kualitas UI/UX, efisiensi token, dan standar rekayasa berada di Engine Utama (`~/.gemini/config/skills/retrobot/SKILL.md`).
3. Berkas ini melindungi Engine Utama dari penyuntingan tidak disengaja sekaligus mengikat seluruh asisten AI yang bekerja pada proyek **SiWarga RT/RW**.

## 3. Ringkasan Standar Teknis Proyek (GAS Modular)
- **Struktur Modul GAS**: `appsscript.json`, `code.gs`, `setup.gs`, `index.html`, serta partial modular (`styles.html`, `data_dummy.html`, `views_publik.html`, `views_warga.html`, `views_rt.html`, `views_rw.html`, `app_js.html`) yang dimuat lewat `include()`.
- **Database Google Sheets**: 11 tab tanpa karakter underscore (`RW`, `RT`, `KartuKeluarga`, `Penduduk`, `PengajuanSurat`, `Iuran`, `SetoranKas`, `KasRT`, `Pengumuman`, `LaporanWarga`, `Sesi`).
- **Akses & Mutasi Data**: Pembacaan menggunakan `getDisplayValues()` dan pemetaan indeks array `const COL`. Penulisan transaksional dilindungi `LockService.getScriptLock()` dan diakhiri `SpreadsheetApp.flush()`.
- **Keamanan & Berkas**: Hash PIN memakai `Utilities.computeDigest` (SHA-256 teriterasi + salt per pengguna), sesi memakai `sessionStorage` + `CacheService` + Sheet `Sesi` (8 jam, kunci 15 menit setelah 5 kali gagal, blokir mutasi non-AKTIF), bukti transfer disimpan di folder Google Drive privat via `DriveApp` dan diakses lewat `code.gs`.
- **PDF & Verifikasi QR**: PDF dibuat di `code.gs` via konversi HTML-to-PDF (`Blob.getAs('application/pdf')`) dengan QR SVG inline mengarah ke `?page=verifikasi&kode=KODE`.
- **Larangan Gaya & Penulisan**: Tanpa em-dash, tanpa en-dash, tanpa emoji, tanpa Lorem Ipsum, dan wajib mendukung Safe Preview Mode (`typeof google !== 'undefined' && google.script && google.script.run`).
