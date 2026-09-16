# PT. JUARA 🇮🇩 → 🇹🇷

Website agency penempatan ketenagakerjaan **Indonesia → Turki** (hotel-hotel bintang lima).
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
├── worker/
│   ├── migrations/          # skema metadata dokumen di Cloudflare D1
│   ├── src/index.js         # API upload/download/delete dokumen
│   └── wrangler.toml        # binding D1 + R2
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

### Dashboard admin dokumen

Aplikasi admin terpisah berada di folder `admin/`. Dashboard ini memakai login Google,
tetapi akses API tetap diperiksa di Worker berdasarkan allowlist email admin.

Konfigurasi yang diperlukan:

1. Build aplikasi admin dengan `npm run build --prefix admin`.
2. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, dan `VITE_DOCUMENTS_API_URL`
   pada environment build admin.
3. Atur secret Worker tanpa memasukkannya ke repository:

   ```bash
   cd worker
   npx wrangler secret put ADMIN_EMAILS
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   ```

   `ADMIN_EMAILS` berisi satu atau beberapa email dipisahkan koma. `SUPABASE_SERVICE_ROLE_KEY`
   hanya digunakan Worker untuk membaca daftar kandidat melalui Supabase dan tidak boleh
   diletakkan di frontend.
4. Tambahkan URL deployment admin ke `ALLOWED_ORIGIN` pada Worker dan URL callback Google
   di Supabase Authentication.

Dashboard menyediakan pencarian kandidat, jumlah dokumen, daftar dokumen, dan download
melalui endpoint Worker yang hanya dapat dipanggil oleh email admin.

### 1) Supabase — database + login Google
1. Buat project baru di [supabase.com/dashboard](https://supabase.com/dashboard).
2. Buka **SQL Editor → New query**, paste seluruh isi `supabase/schema.sql`, lalu **Run**.
   Ini membuat tabel `candidates`, keamanan RLS, dan trigger penerbit ID `IND-...` untuk peserta baru.
3. **Authentication → Providers → Google** → aktifkan. Anda butuh **Client ID & Client Secret** dari
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Buat *OAuth consent screen* (External, isi nama app & email).
   - Buat *Credentials → OAuth Client ID* → tipe **Web application**.
   - Isi **Authorized redirect URIs** dengan:
     `https://<project-ref>.supabase.co/auth/v1/callback`
     (lihat di Supabase: Authentication → Providers → Google, ada contoh callback URL-nya).
4. **Authentication → URL Configuration**:
   - **Site URL**: `https://juaraind.com`
   - **Redirect URLs**: tambahkan juga `https://juaraind.com`.
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
git commit -m "PT. JUARA — initial release"
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

### 5) Cloudflare — penyimpanan dokumen peserta

Langkah ini menggunakan Supabase untuk login dan profil kandidat, sementara file
disimpan privat di Cloudflare R2 dan metadata file disimpan di Cloudflare D1.

1. Instal Wrangler dan login:
   ```bash
   npm install -g wrangler
   wrangler login
   ```
2. Buat database D1 dan bucket R2:
   ```bash
   cd worker
   wrangler d1 create juaraind-documents
   wrangler r2 bucket create juaraind-documents
   ```
3. Salin `database_id` dari output perintah D1 ke `worker/wrangler.toml`.
   `ALLOWED_ORIGIN` sudah disetel ke `https://juaraind.com`, sesuai file `public/CNAME`.
4. Jalankan migrasi:
   ```bash
   wrangler d1 migrations apply juaraind-documents --remote
   ```
5. Simpan konfigurasi Supabase sebagai secret Worker:
   ```bash
   wrangler secret put SUPABASE_URL
   wrangler secret put SUPABASE_ANON_KEY
   ```
6. Deploy API:
   ```bash
   wrangler deploy
   ```
7. Isi `VITE_DOCUMENTS_API_URL` di `.env` dan di GitHub Actions secrets
   dengan URL Worker berikut:
   `https://juaraind-documents.juaraind-documents.workers.dev`
8. Buat widget Turnstile di Cloudflare Dashboard, tambahkan domain `juaraind.com`,
   lalu simpan Site Key sebagai `VITE_TURNSTILE_SITE_KEY` di `.env` dan GitHub Actions.
   Simpan Secret Key sebagai secret Worker:
   ```bash
   wrangler secret put TURNSTILE_SECRET_KEY
   ```

Worker memvalidasi session Supabase sebelum setiap operasi. File hanya dapat
diakses oleh kandidat pemiliknya, dibatasi ke PDF/JPG/PNG dengan ukuran maksimal
5 MB, dan tidak menggunakan URL R2 publik. Percobaan upload juga dibatasi
maksimal 10 kali per akun atau 30 kali per IP dalam 10 menit. Migrasi D1 pada
langkah 4 wajib dijalankan agar tabel rate limit, jenis dokumen, dan pengajuan
Apply tersedia.

---

## 🖼 Aset Gambar
Foto halaman disimpan secara lokal di `public/images/` agar preview dan deployment tidak
bergantung pada server gambar eksternal. Jika ingin mengganti foto milik agency sendiri,
ganti aset di folder tersebut dan perbarui referensinya di `src/data.js`.

## ⚠️ Catatan
- Nama agency, statistik, dan kontak di halaman adalah konten contoh — sesuaikan dengan data asli.
- Untuk produksi, tambahkan verifikasi domain pada Google OAuth consent screen dan
  lengkapi kebijakan privasi.
- Jalankan ulang `supabase/schema.sql` setelah update. Schema ini membuat baris kandidat
  hanya melalui trigger auth; kandidat hanya dapat mengubah nama, telepon, posisi, dan pengalaman.
- Perubahan `status` harus dilakukan dari dashboard/admin server menggunakan service role,
  bukan dari browser.
- File `public/_headers` diterapkan oleh host/CDN yang mendukung format `_headers`.
  GitHub Pages mengabaikannya, jadi pasang header yang sama di Cloudflare/CDN jika tetap memakai Pages.
