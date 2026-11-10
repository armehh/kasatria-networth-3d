# People Net Worth 3D — Kasatria assignment

Webpage 3D (Three.js CSS3D) dengan Google login. Data dibaca dari Google Sheet.

- **Table** 20x10 · **Sphere** · **Double Helix** · **Grid** 5x4x10
- Warna tile: merah < $100K · oren $100K–$200K · hijau > $200K
- Hover tile untuk lihat Net Worth penuh

## Langkah setup (±20 minit)

### 1. Google Sheet
1. Buka https://sheets.new → **File → Import → Upload** → pilih `data_clean.csv` → *Replace spreadsheet*.
2. **Share** → tambah `lisa@kasatria.com` (Viewer).
3. Salin Sheet ID dari URL: `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`
4. Pastikan nama tab ialah `Sheet1` (atau ubah `SHEET_RANGE` dalam `config.js`).

### 2. Google Cloud Project
1. https://console.cloud.google.com → **New Project**.
2. **APIs & Services → Library** → enable **Google Sheets API**.
3. **OAuth consent screen** (Google Auth Platform) → External → isi nama app & email.
   - Tambah scope `.../auth/spreadsheets.readonly`.
   - **Penting:** kalau status "Testing", tambah `lisa@kasatria.com` dan emel awak di **Test users**.
     Atau tekan **Publish app** (akan ada amaran "unverified app" — klik *Advanced → Continue*).
4. **Credentials → Create credentials → OAuth client ID → Web application**.
   - **Authorized JavaScript origins**: URL deploy awak (cth `https://USERNAME.github.io`) dan `http://localhost:8123` untuk ujian.
   - Salin **Client ID**.

### 3. Isi `config.js`
```js
GOOGLE_CLIENT_ID: '1234-abc.apps.googleusercontent.com',
SHEET_ID: '<SHEET_ID>',
```

### 4. Uji tempatan
```bash
python3 -m http.server 8123      # dalam folder ini
# buka http://localhost:8123
```
(Tanpa Client ID, butang "Preview with local sample data" guna `data.csv` untuk pratonton.)

### 5. Deploy (GitHub Pages — percuma)
1. Buat repo GitHub baru, upload semua fail dalam folder ini.
2. **Settings → Pages → Deploy from branch → main / root**.
3. URL: `https://USERNAME.github.io/REPO/` → tambah URL itu (origin sahaja, tanpa path) ke Authorized JavaScript origins.
4. Buka URL, login dengan Google, pastikan data keluar. Hantar URL kepada Madihah/Lisa.

## Mod alternatif: API key
Kalau tak mahu urus consent screen: `AUTH_MODE: 'apikey'`, buat API key (restrict kepada Sheets API + domain anda),
dan set sheet **Anyone with the link → Viewer**. Login Google masih digunakan untuk masuk halaman.

## Struktur
- `index.html`, `style.css`, `app.js`, `config.js`
- `vendor/` — three.js, CSS3DRenderer, TrackballControls, tween.js (tiada CDN)
- `data.csv` — fallback pratonton; `data_clean.csv` — untuk import ke Sheet

## Nota
- CSV asal ada 2 nama dengan aksara rosak (`Azhar�`, `Atiqah�`) dan header ` Net Worth ` ber-space; `data_clean.csv` dah dibetulkan.
- Gambar tile dimuat dari `static.kasatria.com`; jika gagal, tile papar inisial nama.
