# Panduan Deployment SiWarga RT/RW (Google Apps Script Web App)

Dokumen ini memandu proses persiapan, konfigurasi, verifikasi, dan publikasi aplikasi **SiWarga RT/RW** sebagai Web App resmi di Google Apps Script (GAS).

---

## 1. Persiapan Google Spreadsheet & Folder Google Drive Privat

1. **Buat Google Spreadsheet Kosong**:
   - Buka Google Drive, buat satu Google Spreadsheet baru (misalnya beri nama `Database SiWarga RT-RW`).
   - Salin **Spreadsheet ID** dari URL browser:
     `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`
   - Biarkan kosong; tab dan header akan dibuat otomatis oleh `setupDatabase()`.

2. **Buat Folder Google Drive Privat (Bukti Transfer)**:
   - Buat satu folder baru di Google Drive (misalnya `SiWarga Bukti Transfer Privat`).
   - Salin **Folder ID** dari URL browser:
     `https://drive.google.com/drive/folders/<DRIVE_FOLDER_BUKTI_ID>`
   - **Penting (Keamanan)**: Jangan aktifkan berbagi publik (`Anyone with the link`). Biarkan setelan akses folder tetap **Restricted (Privat)** milik akun Google yang menjalankan Web App (`USER_DEPLOYING`). Seluruh pratinjau bukti transfer dibaca secara aman melalui `code.gs` setelah memeriksa hak akses pengguna.

---

## 2. Mengunggah File Proyek ke Google Apps Script

Pilih salah satu dari dua cara berikut:

### Cara A: Melalui Editor Google Apps Script (Tanpa CLI)
1. Buka [https://script.google.com](https://script.google.com) dan buat proyek baru (misalnya `SiWarga RT-RW`).
2. Buka **Project Settings** (ikon roda gigi), lalu centang **Show "appsscript.json" manifest file in editor**.
3. Salin isi berkas berikut ke editor GAS dengan nama persis (tanpa ekstensi tambahan di penamaan GAS):
   - `appsscript.json` (Manifest)
   - Script (`.gs`): `code`, `setup`, `service_surat`, `service_keuangan_warga`
   - HTML (`.html`): `index`, `styles`, `data_dummy`, `views_publik`, `views_warga`, `views_rt`, `views_rw`, `app_js`

### Cara B: Menggunakan `clasp` (Command Line)
1. Login ke akun Google Anda melalui terminal:
   ```bash
   npx clasp login
   ```
2. Jika belum memiliki proyek GAS terikat, buat proyek standalone baru di direktori root proyek:
   ```bash
   npx clasp create --type webapp --title "SiWarga RT-RW" --rootDir .
   ```
3. Unggah seluruh berkas proyek ke Google Apps Script:
   ```bash
   npx clasp push
   ```
   *(Catatan: Pastikan `.claspignore` mengecualikan berkas dokumentasi `.md` bila tidak ingin ikut terunggah ke proyek GAS.)*

---

## 3. Pengaturan Script Properties

1. Di editor Google Apps Script, buka menu **Project Settings** > **Script Properties** > **Edit script properties**.
2. Tambahkan properti berikut:

| Property | Nilai Contoh / Keterangan |
| :--- | :--- |
| `SPREADSHEET_ID` | ID Google Spreadsheet dari Langkah 1. |
| `DRIVE_FOLDER_BUKTI_ID` | ID folder Google Drive privat dari Langkah 1. |
| `PIN_PEPPER` | String acak rahasia minimal 32 karakter (contoh: hasil generator acak alfanumerik/simbol). Jangan pernah dibagikan atau diubah setelah akun dibuat karena memengaruhi verifikasi hash PIN. |
| `WEBAPP_URL` | Diisi setelah langkah New deployment selesai (lihat Langkah 5). |

3. Klik **Save script properties**.

---

## 4. Urutan Inisialisasi Database & Verifikasi Konfigurasi

Jalankan dua fungsi berikut dari toolbar atas editor Google Apps Script (pilih file `setup.gs`):

1. **Jalankan `setupDatabase()` sekali**:
   - Pilih fungsi `setupDatabase` pada dropdown toolbar editor, lalu klik **Run**.
   - Berikan izin otorisasi OAuth Google (Spreadsheet, Drive, dan Script Properties) saat diminta pertama kali.
   - Fungsi ini secara aman membuat 11 tab tanpa underscore (`RW`, `RT`, `KartuKeluarga`, `Penduduk`, `PengajuanSurat`, `Iuran`, `SetoranKas`, `KasRT`, `Pengumuman`, `LaporanWarga`, `Sesi`) beserta header dan data seed awal RW 007 / RT 003 dan RT 004.

2. **Jalankan `checkDeploymentConfig()`**:
   - Pilih fungsi `checkDeploymentConfig` pada dropdown toolbar editor, lalu klik **Run**.
   - Buka tab **Execution log** dan pastikan seluruh pemeriksaan (`SPREADSHEET_ID`, `DRIVE_FOLDER_BUKTI_ID`, `PIN_PEPPER` minimal 32 karakter, akses Spreadsheet dan 11 tab `SHEET_NAMES`, akses folder Drive privat) berstatus lolos (`ok: true`).

---

## 5. Publikasi Web App & Sinkronisasi `WEBAPP_URL`

1. Di editor GAS, klik **Deploy** > **New deployment**.
2. Klik ikon roda gigi pada **Select type**, lalu pilih **Web app**.
3. Isi konfigurasi deployment sesuai `appsscript.json`:
   - **Description**: `SiWarga RT/RW v1.0`
   - **Execute as**: `Me` (`USER_DEPLOYING`)
   - **Who has access**: `Anyone` (`ANYONE_ANONYMOUS`)
4. Klik **Deploy**, lalu salin **Web app URL** resmi berformat:
   `https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec`
5. **Simpan URL Produksi ke `WEBAPP_URL`**:
   - Kembali ke **Project Settings** > **Script Properties**.
   - Isi atau perbarui properti `WEBAPP_URL` dengan URL Web App produksi `https://script.google.com/macros/s/.../exec` (tanpa garis miring tambahan di akhir), lalu klik **Save script properties**.
   - Langkah ini wajib agar QR Code pada PDF surat dan tautan Bagikan ke WhatsApp mengarah ke URL produksi HTTPS resmi (`?page=verifikasi&kode=KODE` dan `?page=pengumuman&id=ID`), bukan host iframe internal.
6. Jalankan kembali `checkDeploymentConfig()` satu kali untuk memastikan `WEBAPP_URL` terbaca valid dan tidak ada peringatan tersisa.

---

## 6. Daftar Akun Demo Awal & Tindakan Keamanan Pasca-Rilis

Seluruh akun seed awal dari `setupDatabase()` menggunakan PIN awal **`123456`**:

| Nama | NIK | Peran / Jabatan | Wilayah |
| :--- | :--- | :--- | :--- |
| Bambang Setiawan | `3271010506800012` | `WARGA` (Kepala Keluarga) | RT 003 / RW 007 |
| Ratna Sari | `3271014407850031` | `WARGA` (Istri) | RT 003 / RW 007 |
| Dedi Kurniawan | `3271012009010044` | `WARGA` (Kepala Keluarga) | RT 003 / RW 007 |
| Rudi Hartono | `3271011707930008` | `WARGA` (Kepala Keluarga) | RT 004 / RW 007 |
| Hendra Wijaya | `3271010103750001` | `PENGURUS_RT` (Ketua RT) | RT 003 / RW 007 |
| Suryani | `3271014509790002` | `PENGURUS_RT` (Bendahara RT) | RT 003 / RW 007 |
| Agus Santoso | `3271011411820003` | `PENGURUS_RT` (Sekretaris RT) | RT 003 / RW 007 |
| Ahmad Fauzi | `3271010804680005` | `PENGURUS_RW` (Ketua RW) | RW 007 |
| Wahyuni | `3271015006730006` | `PENGURUS_RW` (Bendahara RW) | RW 007 |

*(Catatan: Akun dengan status mutasi `MENINGGAL` atau `PINDAH_KELUAR` pada data seed otomatis diblokir oleh sistem saat login.)*

**Wajib Dilakukan Segera Setelah Deploy**:
1. Masuk menggunakan setiap akun **Pengurus RT** dan **Pengurus RW**, lalu segera ganti PIN default `123456` melalui menu **Ubah PIN** (`/akun/pin`).
2. Lakukan **Reset PIN** atau ubah PIN awal warga sebelum menyerahkan akses kepada warga sebenarnya.
3. Jika aplikasi diperbarui di kemudian hari, gunakan **Deploy** > **Manage deployments** > edit deployment produksi > pilih **New version** agar `WEBAPP_URL` tidak berubah.

---

## 7. Publikasi Live Demo ke Custom Domain (https://rtrw.sigitadi.id/)

Aplikasi mandiri Safe Preview Mode telah terkonfigurasi dan terpublikasi ke domain kustom **`https://rtrw.sigitadi.id/`** menggunakan GitHub Pages.

### Konfigurasi DNS & Domain
1. **File CNAME**: File `CNAME` berisi `rtrw.sigitadi.id` diletakkan pada root repositori dan branch publikasi `gh-pages`.
2. **Sertifikat SSL/HTTPS**: GitHub Pages secara otomatis menerbitkan sertifikat SSL Let's Encrypt dengan opsi **Enforce HTTPS** aktif.
3. **Penyelarasan DNS di DNS Manager / cPanel Zone Editor**:
   - **Wajib Hapus**: Jika subdomain `rtrw.sigitadi.id` dibuat melalui cPanel, cPanel otomatis membuat *A record* mengarah ke IP hosting lokal (`103.153.3.19`). Hapus *A record* tersebut agar pengunjung tidak diarahkan ke halaman placeholder cPanel.
   - **Record CNAME**: Pastikan hanya ada satu record untuk `rtrw`:
     - **Name**: `rtrw` (atau `rtrw.sigitadi.id`)
     - **Type**: `CNAME`
     - **Target**: `sisigitadi.github.io.`
     - **TTL**: 14400 (atau Automatic)
