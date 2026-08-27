# PS Admin Dashboard (React + Vite + Tailwind CSS)

Aplikasi Dashboard Administrasi & Kasir POS Toko **Primasakti** berbasis **React 19**, **Vite**, **Tailwind CSS**, dan **Lucide Icons**.

Aplikasi ini digunakan oleh Owner Toko dan Staff Kasir untuk mengelola inventaris produk, transaksi POS, antrean cetak, laporan penjualan, hingga cetak struk via Thermal Printer.

---

## 🚀 Fitur Utama Dashboard Admin

1. **Point of Sale (POS) & Kasir**:
   - Transaksi kasir cepat dengan pencarian barang & scan barcode.
   - Pilihan metode pembayaran: Tunai, QRIS BCA, Transfer Bank, dan Crypto.
   - Dukungan cetak struk fisik via **LAN POS Thermal Printer** (Direct Socket Print).
2. **Manajemen Produk & Inventaris**:
   - Manajemen katalog produk ATK & Percetakan.
   - Pengaturan varian (warna, ukuran, bahan), harga bertingkat, HPP, & stok barang.
3. **Manajemen Pesanan & Percetakan**:
   - Tracking antrean pesanan masuk dari aplikasi pelanggan/web.
   - Pengelolaan status pesanan (*Pending*, *Diproses*, *Siap Diambil*, *Selesai*).
   - Pengiriman notifikasi WhatsApp otomatis ke pelanggan saat pesanan siap diambil.
4. **Manajemen Pengguna & Pegawai**:
   - Pengaturan hak akses (Owner / Super Admin & Kasir / Admin).
   - Perhitungan komisi/bonus staf kasir.
5. **Laporan & Analytics**:
   - Ringkasan pendapatan, statistik penjualan produk, dan riwayat transaksi.

---

## 🛠️ Panduan Setup & Instalasi (Setup Ulang Admin)

### 1. Prasyarat
- **Node.js**: v18.0.0 atau v20.0.0+ (LTS disarankan)
- **npm**: v9+ atau v10+

---

### 2. Langkah Setup

1. **Masuk ke folder admin**:
   ```powershell
   cd admin
   ```

2. **Install Dependensi**:
   ```powershell
   npm install
   ```

3. **Konfigurasi Environment (`.env`)**:
   Salin file `.env.example` menjadi `.env`:
   ```powershell
   cp .env.example .env
   ```

   **Variabel `.env` Admin:**
   ```env
   # Backend FastAPI Base URL
   VITE_API_URL=http://localhost:8000/api/v1

   # LAN POS Thermal Printer Settings (Optional - Jika ada Thermal Printer LAN)
   VITE_PRINTER_IP=192.168.0.110
   VITE_PRINTER_PORT=9100
   ```

4. **Menjalankan Server Development**:
   ```powershell
   npm run dev
   ```
   Aplikasi akan berjalan secara lokal di: `http://localhost:5173` (atau `http://localhost:5174`).

5. **Build untuk Production**:
   ```powershell
   npm run build
   ```
   Hasil build siap deploy akan tersimpan di direktori `dist/`.

---

## 🌐 Konfigurasi Web Server / Deployment (PENTING: Mencegah Refresh 404)

Karena React Router berbasis Single Page Application (SPA), saat halaman di-refresh di route seperti `/login`, `/pos`, atau `/dashboard`, web server (Nginx/Apache) harus mengarahkan (*fallback*) semua request ke `index.html`.

### 1. Nginx Config Contoh (`/etc/nginx/sites-available/admin.primasakti.com`):
```nginx
server {
    listen 80;
    server_name admin.primasakti.com;

    root /var/www/ps/admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 2. Windows Server IIS:
File `web.config` sudah otomatis disertakan di folder `public/`, sehingga saat Anda me-run `npm run build`, file `web.config` otomatis ikut ter-copy ke direktori `dist/`.

> ⚠️ **Catatan Penting IIS**: Pastikan modul **URL Rewrite** (`URL Rewrite Module 2.0`) sudah terinstall di IIS Windows Server 2016 Anda. Jika belum terinstall, unduh gratis dari Microsoft IIS Site: [URL Rewrite Download](https://www.iis.net/downloads/microsoft/url-rewrite).

### 3. Apache / cPanel / Netlify:
File `.htaccess` dan `_redirects` juga sudah otomatis disertakan di folder `public/`.

---

## 🔑 Login Default Admin

Pastikan backend (`ps\server`) sudah berjalan dan telah di-seed dengan `python seed_admin.py`.

- **Login Owner (Super Admin)**:
  - **Email**: `owner@store.com`
  - **Password**: `owner123`

- **Login Kasir (Admin Operator)**:
  - **Email**: `kasir@store.com`
  - **Password**: `kasir123`

---

## 📁 Struktur Utama Direktori Admin

```
admin/
├── src/
│   ├── components/     # Komponen UI Reusable (Modal, Cards, Forms, Sidebar, Header)
│   ├── pages/          # Halaman Dashboard (POS, Products, Orders, Users, Reports)
│   ├── services/       # Integrasi API (Axios client, Auth, POS, Products API)
│   ├── context/        # React Context (Auth Context, Cart State)
│   ├── main.jsx        # Entry point React
│   └── App.jsx         # Routing & Main Layout
├── public/             # Asset statis (logo, favicon, sound notifications)
├── .env                # File konfigurasi environment aktif
├── .env.example        # Template konfigurasi environment
├── package.json        # Dependensi & script proyek
└── README.md           # Dokumentasi admin dashboard
```
