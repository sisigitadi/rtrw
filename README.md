# SiWarga RT/RW

Aplikasi web berbasis Google Apps Script (GAS) Web App Modular untuk mengelola data kependudukan, surat pengantar dan keterangan berjenjang dengan verifikasi QR Code, iuran warga, kas RT dan setoran RW, papan pengumuman, serta laporan warga.

Dokumentasi spesifikasi lengkap tersedia pada [PRD.md](PRD.md), panduan deployment pada [DEPLOYMENT.md](DEPLOYMENT.md), dan panduan aktivasi workspace pada [RetroBOT.md](RetroBOT.md).

Repository Resmi: [https://github.com/sisigitadi/Sirtrw](https://github.com/sisigitadi/Sirtrw)

## Arsitektur Singkat

- **Runtime**: Google Apps Script V8 Web App (`appsscript.json`).
- **Backend & Penyimpanan**: Google Sheets (11 tab tanpa underscore) dengan pemetaan kolom `const COL`, penguncian `LockService.getScriptLock()`, dan folder privat Google Drive melalui `DriveApp` untuk bukti transfer.
- **Autentikasi & Sesi**: NIK 16 digit dan PIN 6 digit dengan hash `Utilities.computeDigest` (SHA-256 teriterasi + salt per pengguna), token sesi di `sessionStorage`, serta validasi server via `CacheService` dan Sheet `Sesi`.
- **PDF & QR Code**: Generator PDF di server menggunakan HTML-to-PDF (`Blob.getAs('application/pdf')`) dengan QR SVG inline yang mengarah ke `?page=verifikasi&kode=KODE`.
- **Frontend Modular**: `index.html` menyertakan partial `.html` via `include()`, menggunakan pure CSS Design Tokens (`styles.html`), font Plus Jakarta Sans, dan ikon Lucide SVG (`app_js.html`).

## Daftar File Proyek

| File | Peran |
| :--- | :--- |
| `appsscript.json` | Konfigurasi manifest V8, zona waktu `Asia/Jakarta`, dan akses Web App. |
| `code.gs` | Entry point `doGet(e)`, helper `include()`, autentikasi, sesi, dan endpoint kependudukan. |
| `setup.gs` | Definisi `SHEET_NAMES`, pemetaan `const COL`, `setupDatabase()`, dan `checkDeploymentConfig()`. |
| `service_surat.gs` | Alur pengajuan surat berjenjang, nomor surat, PDF, dan verifikasi QR publik. |
| `service_keuangan_warga.gs` | Alur iuran, bukti Drive privat, kas RT, setoran RW, pengumuman, dan laporan warga. |
| `index.html` | Shell SPA utama untuk layout publik dan layout aplikasi. |
| `styles.html` | Pure CSS Design Tokens sesuai pedoman UI/UX di PRD Bab 4. |
| `data_dummy.html` | Data awal untuk pengujian UI Safe Preview Mode (sesuai PRD Bab 9). |
| `views_publik.html` | Halaman `/masuk` dan `/verifikasi/[kode]`. |
| `views_warga.html` | Halaman area Warga (dashboard, keluarga, surat, iuran, kas, pengumuman, laporan, ubah PIN). |
| `views_rt.html` | Halaman area Pengurus RT (penduduk, antrean surat, verifikasi iuran, kas RT, pengumuman, laporan). |
| `views_rw.html` | Halaman area Pengurus RW (pengesahan surat, konfirmasi setoran, rekap antar-RT, pengumuman). |
| `app_js.html` | Router SPA, state store, validator, helper ikon SVG, dan pemanggil `google.script.run`. |
| `PRD.md` | Sumber kebenaran spesifikasi produk dan skema teknis. |
| `DEPLOYMENT.md` | Panduan langkah demi langkah persiapan dan rilis ke Google Apps Script Web App. |
| `RetroBOT.md` | Gateway dongle resmi RetroBOT v3.0.0 untuk proyek SiWarga RT/RW. |

## Prasyarat

1. Akun Google dengan akses ke Google Drive, Google Sheets, dan Google Apps Script.
2. Browser modern (Chrome, Edge, Firefox, atau Safari) untuk mengakses aplikasi dan editor GAS.
3. Opsional untuk deploy via terminal: Node.js dan `@google/clasp` yang sudah login ke akun Google Anda.

## Menjalankan Safe Preview Mode Lokal

Safe Preview Mode memungkinkan pengujian seluruh antarmuka dan alur data dummy di browser tanpa terhubung ke server Google Apps Script (`google.script.run` tidak aktif):

1. Pastikan seluruh berkas HTML parsial (`styles.html`, `data_dummy.html`, `views_publik.html`, `views_warga.html`, `views_rt.html`, `views_rw.html`, `app_js.html`) tersedia di proyek.
2. Untuk meninjau tampilan secara lokal sebelum rilis ke GAS, Anda dapat membungkus isi partial atau menyajikannya melalui server statis sederhana dengan mengganti tag `<?!= include('...'); ?>` sementara pada salinan pratinjau, atau membuka langsung deployment uji (`Test deployments`) di editor Google Apps Script.
3. Saat berjalan di luar runtime GAS, aplikasi otomatis mendeteksi ketiadaan `google.script.run`, menggunakan store in-memory dari `data_dummy.html`, dan menampilkan toolbar simulator state (`#sim-bar`) untuk menguji state Normal, Loading, Empty, dan Error.
4. Di runtime produksi GAS Web App, `#sim-bar` otomatis disembunyikan dan seluruh aksi memanggil fungsi server pada `.gs`.

## Deployment ke Google Apps Script

Ikuti panduan lengkap pada [DEPLOYMENT.md](DEPLOYMENT.md) untuk menyiapkan Google Spreadsheet, folder Google Drive privat, Script Properties, inisialisasi `setupDatabase()`, pemeriksaan `checkDeploymentConfig()`, serta publikasi Web App HTTPS.
