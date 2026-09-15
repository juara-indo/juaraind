# PT. JUAARA 🇮🇩 → 🇹🇷

Website agency penempatan kettenagakerjaan **Indonesia → Turki** (hotel-hotel bintang lima).
Dibangun dengan **React + Vite**, database **Supabase**, login **Google**, dan deploy **GitHub Pages via GitHub Actions**.

Setiap kandidat yang mendaftar otomatis mendapat **ID unik permanen**
yang diterbitkan oleh trigger database (bukan random di client) — mudah dipanggil ulang oleh petugas agency.

---

## ✨ Fitur

| Fitur | Keterangan |
|---|---|
| Hero layar penuh | Foto Bosphorus full-bleed dengan gerak kamera lambat (Ken Burns) + statistik band |
| Grid hotel asimetris | 5 hotel mitra (Istanbul & Antalya) dengan foto, kota, dan posisi tersedia |
| Timeline 5 langkah | Alur daftar → seleksi → pelatihan → visa → berangkat |
| Kolase galeri | Foto hotel & ketenagakerjaan luar negeri dari aset lokal |
| Login Google | Supabase OAuth — tanpa password baru |
| ID Kandidat unik | Diterbitkan otomatis oleh trigger SQL: `TKI-<tahun>-<urutan>` |
| Form pendaftaran | Nama, WhatsApp, posisi, pengalaman → tersimpan di tabel `candidates` (RLS: hanya pemilik yang bisa lihat) |

---

## 📁 Struktur Proyek

```
anatolia-karier/
├── index.html               # HTML root + font Fraunces & Space Grotesk
├── package.json
├── vite.config.js           # output single-file agar mudah dideploy ke subpath Pages
├── .env.example             # salin jadi .env, isi kredensial Supabase
├── .gitignore
├── supabase/
│   └── schema.sql           # tabel candidates + RLS + trigger ID unik
├── .github/workflows/deploy.yml  # CI deploy otomatis ke GitHub Pages
└── src/
    ├── main.jsx
    ├── App.jsx              # seluruh halaman: hero, hotel, proses, galeri, auth, dashboard
    ├── supabaseClient.js    # inisialisasi Supabase dari .env
    ├── data.js              # konten: hotel, galeri, langkah, posisi, statistik
    └── styles.css           # design system "Merah Anatolia"
```

---

## 🚀 Panduan Setup (urut dari atas, jangan ada yang dilewati)

### 1) Supabase — database + login Google
1. Buat project baru di [supabase.com/dashboard](https://supabase.com/dashboard).
2. Buka **SQL Editor → New query**, paste seluruh isi `supabase/schema.sql`, lalu **Run**.
   Ini membuat tabel `candidates`, keamanan RLS, dan trigger penerbit ID `TKI-...`.
3. **Authentication → Providers → Google** → aktifkan. Anda butuh **Client ID & Client Secret** dari
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Buat *OAuth consent screen* (External, isi nama app & email).
   - Buat *Credentials → OAuth Client ID* → tipe **Web application**.
   - Isi **Authorized redirect URIs** dengan:
     `https://<project-ref>.supabase.co/auth/v1/callback`
     (lihat di Supabase: Authentication → Providers → Google, ada contoh callback URL-nya).
4. **Authentication → URL Configuration**:
   - **Site URL**: `https://<username>.github.io/<nama-repo>/`
   - **Redirect URLs**: tambahkan juga URL yang sama.
5. Salin dari **Project Settings → API**: `Project URL` dan `anon public key`.

### 2) Konfigurasi .env
```bash
cp .env.example .env
# isi:
# VITE_SUPABASE_URL=https://<project-ref>.supabase.co
# VITE_SUPABASE_ANON_KEY=<anon public key>
```
> `.env` sudah di-gitignore — jangan pernah commit kunci asli. Untuk GitHub Actions,
> kunci yang sama dimasukkan sebagai *repository secrets* (langkah 3c).

### 3) GitHub — deploy otomatis ke Pages
a. Buat repo baru di GitHub, lalu push proyek ini:
```bash
git init
git add .
git commit -m "PT. JUAARA — initial release"
git branch -M main
git remote add origin https://github.com/<username>/<nama-repo>.git
git push -u origin main
```
b. Buka repo → **Settings → Pages → Source: GitHub Actions**.
c. **Settings → Secrets and variables → Actions → New repository secret**, buat dua secret:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
d. Workflow `.github/workflows/deploy.yml` sudah tersedia — setiap push ke `main`
   akan otomatis build & publish. Cek tab **Actions** untuk statusnya; situs live di:
   `https://<username>.github.io/<nama-repo>/`

### 4) Jalankan lokal
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # hasil build ada di dist/
```

---

## 🖼 Aset Gambar
Foto halaman disimpan secara lokal di `public/images/` agar preview dan deployment tidak
bergantung pada server gambar eksternal. Jika ingin mengganti foto milik agency sendiri,
ganti aset di folder tersebut dan perbarui referensinya di `src/data.js`.

## ⚠️ Catatan
- Nama agency, statistik, dan kontak di halaman adalah konten contoh — sesuaikan dengan data asli.
- Untuk produksi, tambahkan verifikasi domain pada Google OAuth consent screen dan
  lengkapi kebijakan privasi.
