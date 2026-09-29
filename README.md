# GKMI NTC — Frontend

React 18 + TypeScript + Vite + Refine Core 5 + Ant Design 5. Bahasa antarmuka Indonesia; desain responsif putih, abu-abu, biru, dan merah.

## Menjalankan

```powershell
cd D:\Project\FE-GKMI-NTC
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

Buka http://localhost:5173. Jalankan backend Go `D:\Project\BE_GKMI_NTC_GO` pada port 8080 dan gunakan akun yang sudah tersedia di backend. Tidak ada login atau password dummy. Di PowerShell, `npm.cmd` menghindari pembatasan execution policy pada `npm.ps1`.

```powershell
npm.cmd run build
npm.cmd run preview
```

## Halaman dan integrasi

- `/`: landing page, tentang, pelayanan, jadwal, warta, kegiatan. Jadwal dan konten yang belum dikonfirmasi tidak diisi dengan informasi fiktif.
- `/login`: login nyata melalui `POST /api/auth/login`.
- `/admin`: ringkasan jemaat dari API, ringkasan keuangan/kegiatan demo lokal.
- `/admin/jemaat`: daftar, pencarian/filter di klien, tambah, detail/edit, hapus, ekspor CSV. Mengikuti field dan enum backend Go.
- `/admin/users`: CRUD pengguna khusus UI admin.
- `/admin/keuangan`, `/admin/warta`, `/admin/ibadah`, `/admin/pelayanan`, `/admin/kegiatan`: CRUD demo melalui localStorage; belum tersimpan di server.
- `/admin/laporan`: filter bulan, total, ekspor CSV berdasarkan transaksi demo.
- `/admin/settings`: informasi akun dan preferensi kepadatan tampilan.

Warta berstatus Terbit muncul di landing page pada browser yang sama. Modul demo dimulai kosong dan diberi label; jangan gunakan untuk data operasional atau informasi sensitif. Tidak ada publikasi antarperangkat. Penghapusan demo memerlukan konfirmasi.

## Autentikasi dan hak akses

Access/refresh token disimpan di sessionStorage (sesi tab). API client memperbarui token sekali pada HTTP 401 dengan satu permintaan refresh bersama untuk permintaan bersamaan. Logout meminta pencabutan refresh token ke server, lalu menghapus sesi lokal. Jika pencabutan gagal, UI menampilkan pemberitahuan.

Role sesuai backend saat ini: `viewer` membaca; `staff` menambah/mengedit jemaat; `admin` juga menghapus dan mengelola pengguna. Role lain dalam konsep awal belum didukung API. Pembatasan UI bukan otorisasi server. Route `/api/users` pada backend saat diperiksa hanya dilindungi JWT; backend perlu pemeriksaan role admin sebelum penggunaan produksi.

Vite meneruskan `/api` ke `API_PROXY_TARGET`, sehingga pengembangan tidak memerlukan perubahan CORS backend. `VITE_API_URL` default `/api`. Deploy `dist` dengan fallback SPA ke `index.html` dan reverse proxy `/api` ke backend (jangan arahkan API ke fallback HTML). Gunakan HTTPS di produksi; token browser tetap memerlukan perlindungan XSS di seluruh aplikasi.

## Struktur

`src/api.ts`: autentikasi dan HTTP; `src/modules.ts`: definisi form; `src/ResourcePage.tsx`: CRUD; `src/Admin.tsx`: portal, dashboard, laporan; `src/PublicPage.tsx`: landing; `src/local.ts`: demo dan CSV; `src/styles.css`: desain responsif.

Paket menggunakan Refine Core 5, @refinedev/antd 6, @refinedev/react-hook-form 5, @refinedev/react-router 2, React Router 7, dan TanStack Query 5. React 18 dan Ant Design 5 tetap digunakan. Dependensi serta lockfile diperbarui bersama tanpa --force atau --legacy-peer-deps. Acuan migrasi: https://refine.dev/core/docs/migration-guide/4x-to-5x/

## Pengujian browser

`npm.cmd run test:e2e` menjalankan Playwright dengan Google Chrome terpasang. Pengujian memakai API mock, tanpa menulis ke database gereja: navigasi mobile, proteksi route, login gagal/berhasil, refresh token, logout, akses viewer, skema form jemaat, penyimpanan transaksi demo, CSV, dan publikasi warta lokal.

## Pemeriksaan manual

1. Buka landing di desktop dan mobile, uji navigasi anchor dan menu.
2. Login dengan akun backend; kredensial salah harus menampilkan error.
3. Dengan akun pengujian, tambah/edit jemaat lalu filter dan ekspor; admin dapat menghapus dengan konfirmasi.
4. Login sebagai viewer: form hanya baca dan tombol tambah/hapus tidak tersedia.
5. Buat transaksi demo, periksa total dan CSV pada periode terkait.
6. Buat warta Terbit, buka beranda, baca detail; Draft tidak ditampilkan.
7. Logout, akses `/admin` kembali harus menuju login.
8. Matikan backend; UI menampilkan kegagalan koneksi tanpa mengganti data dengan data palsu.

Integrasi ujung-ke-ujung dengan database nyata memerlukan backend aktif dan akun pengujian. Frontend ini tidak membuat akun maupun mengubah database secara otomatis.

## Identitas dan jadwal gereja

Logo asli disimpan tanpa perubahan di `public/assets/logo-gkmi.jpg`, bersumber dari https://id.wikipedia.org/wiki/Berkas:Logo_GKMI.jpg (unggahan JohnThorne, 3 Januari 2013; halaman berkas mencantumkan GFDL 1.2 atau lebih baru, https://www.gnu.org/licenses/old-licenses/fdl-1.2.html). Nama pembuat asli tidak dicantumkan pada halaman sumber.

Jadwal rutin yang dikonfirmasi: **Ibadah Umum setiap Minggu pukul 09.00**. Konfigurasi bersama ada di `src/church.ts`, dipakai beranda, dashboard, dan halaman jadwal ibadah. Jadwal tambahan tetap memakai data demo lokal.
