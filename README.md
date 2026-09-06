# MM2100 · Jelajah Kawasan

Aplikasi peta fasilitas dengan React, Vinext/Vite, Tailwind, komponen shadcn/ui, dan Leaflet. Publikasi berupa situs statis; editor hanya berjalan secara lokal. Node.js >=22.13 diperlukan (Node 22 direkomendasikan untuk build di Windows).

## Menjalankan

```sh
npm ci
npm run dev -- --hostname 127.0.0.1
npm run editor
```

Buka alamat yang dicetak server. Editor memakai http://127.0.0.1:5174, hanya terikat ke loopback. Jangan membuka editor ke jaringan umum. Gunakan Node yang memenuhi versi minimum; Node bawaan sistem saat pengembangan adalah v20 sehingga pengujian memakai runtime Node 24 yang tersedia.

## Data fasilitas

Dataset publik berada di public/facilities.json. Saat belum ada entri nyata, aplikasi membuka mode demo dengan enam fasilitas ilustrasi. Nama dan koordinat demo bukan data nyata; navigasinya dinonaktifkan. Tombol “Lihat data nyata” menampilkan dataset kosong secara jujur. Titik pusat peta hanya framing awal; bukan titik acuan jarak atau batas resmi kawasan.

1. Jalankan editor dan impor master JSON, atau tambah fasilitas.
2. Isi data bisnis publik. Klik peta atau ketik latitude/longitude; periksa alamat, titik masuk, sumber, dan tanggal. ID tetap stabil.
3. Gunakan draft sampai verifikasi selesai. Terapkan perubahan form sebelum ekspor.
4. Ekspor master untuk menyimpan seluruh data. Simpan master di luar folder public dan jangan commit informasi nonpublik.
5. Ekspor data publik untuk mendapatkan hanya entri published dan field yang diizinkan.
6. Tinjau perubahan, lalu ganti public/facilities.json. Validasi dan build sebelum publikasi ulang.

Ekspor tidak memperbarui server. Semua perubahan editor berada dalam memori sampai JSON diunduh. Unduhan publik tidak menghapus status perubahan master yang belum diekspor. Ukuran impor dibatasi 5 MB.

```sh
npm run validate:data
node tools/validate-data.mjs --export PATH_MASTER PATH_OUTPUT
npm test
npx tsc --noEmit --incremental false
npm run build
```

Kontrak ada di lib/data.mjs. Pemeriksaan meliputi ID unik, kategori/status valid, finite/rentang koordinat, tanggal verifikasi, sumber, URL HTTP/HTTPS, dan pemisahan draft/arsip dari data publik. Kandidat duplikat berdasarkan nama dan kedekatan koordinat diberi peringatan. Build menolak data nonpublik. Data mentah ditampilkan sebagai teks, bukan HTML.

## Jarak, GPS, dan navigasi

Haversine menghasilkan kilometer garis lurus; bukan rute/durasi. Lokasi diminta setelah tindakan pengguna, disimpan di memori sesi, dan dapat dihapus. Izin ditolak, timeout, atau lokasi tidak tersedia tidak mengubah asal yang sudah dipilih. Google Maps menerima tujuan dan, bila dipilih, asal GPS hanya ketika tautan navigasi dibuka. Produksi membutuhkan HTTPS. Titik acuan pintu tol belum diaktifkan karena belum ada koordinat terverifikasi.

## Penyedia peta

Konfigurasi public/map-config.json menggunakan endpoint HTTPS tile OpenStreetMap dengan atribusi terlihat. Browser menangani cache HTTP bawaan. Tidak ada prefetch massal, proxy, service worker, atau unduhan offline. Daftar tetap dapat digunakan saat tile gagal. Penyedia tidak menjamin ketersediaan; pilih penyedia lain sesuai kebutuhan trafik sebelum penggunaan luas. Jangan menghilangkan Referer atau atribusi. Konfigurasi adalah berkas tepercaya yang ditinjau pengelola; atribusi HTML hanya berasal dari konfigurasi, bukan data fasilitas.

Referensi diperiksa 6 September 2026:

- [Leaflet 1.9.4](https://leafletjs.com/reference.html)
- [Kebijakan tile OSM](https://operations.osmfoundation.org/policies/tiles/)
- [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)

## Build dan publikasi

Konfigurasi output export menghasilkan artefak statis. Editor di tools/editor tidak diimpor oleh aplikasi publik dan tidak disertakan pada artefak publik. File master harus disimpan di luar public. Sites menyimpan versi sumber dan artefak; rollback dengan menerbitkan kembali versi yang telah diverifikasi. Untuk hosting statis lain, unggah direktori output publik yang ditunjuk .openai/hosting.json dengan dukungan HTTPS.

## Validasi dan batasan

Tes otomatis mencakup jarak, pencarian/filter, validasi data, isolasi data nonpublik, round trip JSON, dan URL navigasi. Periksa manual GPS di perangkat, keyboard/fokus panel, layar kecil, dan gangguan jaringan sebelum rilis operasional. Tidak ada sesi browser testing otomatis yang diminta pada pembuatan ini.

WebMCP opsional mengekspos search_facilities melalui feature detection. Browser tanpa API tersebut tetap berfungsi. Validasi pada konteks WebMCP yang mendukung belum tersedia, sehingga tidak diklaim terverifikasi.

Belum termasuk data fasilitas nyata, batas resmi kawasan, layanan routing internal, atau admin daring bersama. Untuk admin daring, implementasikan backend, autentikasi dan otorisasi server, audit, backup, serta penanganan konflik sebelum membuka fitur.

### Catatan lingkungan dan dependensi

Build statis berhasil menggunakan Node 22. Node 24 pada mesin ini mengalami crash saat proses prerender ditutup; gunakan Node 22 untuk build. Pemeriksaan audit masih menandai dependensi transitif tooling (termasuk image-size tanpa patch yang tersedia saat pemeriksaan). React dan Vite telah dipatch. Artefak hosting hanya statis, tanpa server functions, image processing, editor, atau runtime backend. Jangan menganggap seluruh dependency tree bebas temuan; evaluasi ulang sebelum menambahkan backend atau membuka server dev ke jaringan.
