# Backend PHP dan database

Target deployment baru adalah Azure. Situs Sites sebelumnya tetap demo statis dan tidak mengakses database lokal.

## Lokal XAMPP

- Database aplikasi: `mm2100_map` pada MariaDB XAMPP `127.0.0.1:3306`.
- Konfigurasi privat: `backend/config.local.php`, diabaikan Git dan tidak ikut paket Azure.
- Aplikasi memakai akun database khusus `mm2100_app`, bukan root.
- Tabel: `admins`, `app_sessions`, `facilities`, `login_limits`, `audit_log`.
- `facilities.payload` berisi data fasilitas tervalidasi; publik hanya menerima status `published`.
- `admins.password_hash` menyimpan hash password PHP, bukan password asli.
- Perubahan fasilitas tersimpan langsung; muat ulang peta untuk mengambil data terbaru. Arsip menyembunyikan fasilitas tanpa menghapus riwayat.

Untuk instalasi XAMPP baru yang masih memakai akun root lokal tanpa password, jalankan sekali `C:\xampp\php\php.exe tools/setup-local-db.php`. Skrip menolak jika database atau akun sudah ada. Jangan gunakan skrip tersebut untuk provisioning Azure.

Build admin: `node node_modules/vite/bin/vite.js build --config tools/admin/vite.config.mjs`.
Build peta: `npm run build` dengan Node 22.
Jalankan `C:\xampp\php\php.exe -S 127.0.0.1:8086 backend/router.php` dari root proyek.
Buka `http://127.0.0.1:8086/admin/` untuk membuat admin pertama dengan email/password Anda. Setup hanya tersedia pada loopback, origin lokal yang dikonfigurasi, dan ketika belum ada admin. Setelah akun dibuat, halaman berubah menjadi login biasa. Tidak ada registrasi publik.

Server PHP bawaan ini hanya untuk pengembangan. Jika memakai Apache XAMPP, arahkan DocumentRoot khusus ke direktori `public` hasil paket, bukan ke root repositori. Jangan menimpa DocumentRoot aplikasi XAMPP lain.

## Kelola kategori

Di `/admin/`, klik **Kelola kategori** lalu **Kategori baru**. Isi nama dan pilih ikon dari pustaka yang tersedia. Nama dan ikon dapat diedit; ID tetap stabil agar hubungan fasilitas tidak rusak. Nonaktifkan kategori yang tidak dibutuhkan. Kategori yang masih dipakai fasilitas (termasuk draft/arsip) tidak dapat dinonaktifkan sebelum fasilitas dipindahkan ke kategori lain. Tidak ada penghapusan permanen kategori.

Daftar kategori publik dikirim bersama `/facilities.json`; muat ulang halaman peta setelah mengubah kategori. Data disimpan di tabel `categories`. Untuk upgrade instalasi Azure yang sudah ada, jalankan `backend/categories.sql` dengan akun migrasi sebelum memasang versi aplikasi baru. Skrip idempoten ini hanya membuat tabel dan menambahkan kategori bawaan yang belum ada; tidak menghapus data. Instalasi baru cukup menggunakan `backend/schema.sql` yang sudah mencakup kategori.

## Lokasi induk dan tenant

1. Tambah lokasi induk dengan kategori **Food Court**, isi alamat dan koordinat pintu masuk, lalu simpan. Terbitkan setelah diverifikasi.
2. Tambah nama resto/kantin dengan kategori **Resto & Cafe**. Pilih **Food court induk**, isi **Nomor kios / unit**, menu, kontak, sumber dan tanggal verifikasi.
3. Alamat dan koordinat tenant mengikuti induk; kolom tersebut tidak dapat diedit saat tenant terhubung. Perubahan koordinat induk langsung berlaku pada pembacaan peta tenant. Nomor kios membantu navigasi di dalam area.
4. Tenant hanya dapat diterbitkan jika induknya sudah terbit. Arsipkan tenant terbit terlebih dahulu sebelum mengarsipkan induk. Kategori food court tidak dapat diubah selama masih memiliki tenant.
5. Peta menampilkan satu ikon per food court dengan jumlah tenant terbit; klik induk untuk daftar tenant. Pencarian nama/menu/kios tenant tetap menemukan tenant dan menampilkan food court-nya. Resto mandiri menggunakan pilihan induk kosong.

Hubungan disimpan sebagai `parent_id` dan `unit_number` dalam payload fasilitas yang sudah ada; tidak memerlukan penghapusan tabel atau migrasi data lama. Editor JSON offline lama bukan editor hubungan tenant; gunakan `/admin/` untuk mengelola hierarki.

## Deployment Azure

1. Buat App Service Linux dengan runtime PHP yang didukung dan MySQL Flexible Server. Belum ada resource Azure dibuat oleh proyek ini.
2. Buat database khusus dan jalankan `backend/schema.sql` melalui koneksi administrator/migrasi. Beri akun runtime hanya SELECT, INSERT, UPDATE, DELETE pada database aplikasi. Jangan gunakan akun administrator MySQL untuk aplikasi.
3. Atur environment App Service: `DB_HOST`, `DB_PORT=3306`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL_CA` (path CA bundle tepercaya), `APP_ORIGIN=https://domain-aplikasi`, `ALLOW_LOCAL_SETUP=0`. Aktifkan HTTPS Only. `APP_ORIGIN` tanpa trailing slash, harus sama dengan origin browser admin. Jangan percaya header proxy kiriman klien untuk mengubah origin atau cookie.
4. Pastikan MySQL dapat dijangkau dari App Service melalui konfigurasi jaringan Azure dan TLS dengan verifikasi sertifikat. Jangan menonaktifkan verifikasi sertifikat.
5. Setelah build peta dan admin berhasil, jalankan `node tools/package-azure.mjs`. Skrip menghasilkan folder unik `outputs/azure-...` berisi `public`, `backend`, `tools`, `nginx.conf`, dan `startup.sh`. Paket tidak membawa kredensial lokal. Zip ISI folder itu, bukan folder induknya, lalu deploy melalui ZIP Deploy Azure.
6. Atur Startup Command ke `sh /home/site/wwwroot/startup.sh`. Konfigurasi Nginx mengarahkan webroot ke `/home/site/wwwroot/public`, mengirim `/facilities.json` ke API database, dan hanya mengeksekusi entrypoint `/api/index.php`. Kode backend dan rahasia berada di luar webroot. Verifikasi konfigurasi fastcgi terhadap image PHP App Service yang dipilih sebelum production.
7. Buat admin pertama melalui console server: masukkan `ADMIN_EMAIL` dan `ADMIN_PASSWORD` sebagai environment sesi shell yang tidak dicatat history (password gunakan input tersembunyi), jalankan `php /home/site/wwwroot/tools/admin-account.php create`, lalu hapus kedua variabel. Jangan menyimpan password bootstrap sebagai App Setting permanen atau memasukkannya ke Git. Mode `reset` mengganti password dan mencabut semua sesi admin tersebut.
8. Periksa login benar/salah, CRUD melalui status draft/terbit/arsip, izin API, koneksi TLS, dan peta pada URL Azure sebelum mengganti domain. Paket ini belum diuji di Azure karena akun/resource Azure belum diberikan.

Session disimpan dalam database (masa berlaku 8 jam), cookie HttpOnly/SameSite Strict dan Secure pada HTTPS; token di database di-hash. Permintaan perubahan memerlukan origin cocok dan token CSRF. Login dibatasi 10 percobaan per email dan IP dalam 15 menit. Simpan database lewat backup layanan Azure; atur retensi sesuai kebutuhan. Jadwalkan penghapusan baris `app_sessions` dan `login_limits` dengan `expires_at < UNIX_TIMESTAMP()` menggunakan pekerjaan pemeliharaan database. Riwayat audit menyimpan aktor, aksi, waktu, ID fasilitas; belum menyimpan snapshot versi lama.

Referensi: https://learn.microsoft.com/en-us/azure/app-service/tutorial-php-mysql-app
