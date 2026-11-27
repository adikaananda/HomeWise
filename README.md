# HomeWise

**AI-Driven Decision Support for Smarter Property Investment**
*Assess the Location. Understand the Property. Invest Smarter.*

HomeWise adalah web app pendukung keputusan properti: menilai kelayakan lokasi berdasarkan tujuan pembelian, memandu pembeli memotret bangunan saat survei, mendeteksi indikasi kerusakan, menghitung prioritas perbaikan, daftar material, biaya renovasi, dan total investasi awal, lalu menerbitkan laporan PDF. Aplikasi ini lengkap dengan frontend, backend, database bermigrasi, pembayaran Midtrans, dan satu titik integrasi model AI. Begitu model AI dipasang, aplikasi siap diluncurkan.

### Alur pengguna

```
 Dari rumah                   Saat survei (HP)                 Setelah survei
 ───────────                  ────────────────                 ──────────────
 Tempel alamat iklan   ──►    Buka Mode Survei          ──►    Buka Laporan Lengkap
 Skor lokasi GRATIS           Checklist 8 area foto            AI menandai kerusakan
 (risiko, fasilitas)          Pertanyaan ke warga/penjual      Prioritas + material + biaya
                              Foto tersimpan langsung          PDF untuk menawar harga
        Tahap: Kandidat  ──►  Disurvei  ──►  Dianalisis  ──►  Tervalidasi (opsional, analis)
```

**Siapa yang memotret?** Pembeli sendiri saat survei, bukan penjual. Foto dari iklan tetap bisa diunggah, tetapi diberi label "Iklan / penjual" dan temuan dari foto tersebut ditandai belum diverifikasi di laporan. Bila pembeli ingin pihak netral, ia memesan Inspeksi Profesional dan analis HomeWise yang memotret serta memvalidasi.

---

## Daftar isi

1. [Ringkasan fitur](#1-ringkasan-fitur)
2. [Teknologi](#2-teknologi)
3. [Menjalankan secara lokal](#3-menjalankan-secara-lokal)
4. [Akun demo](#4-akun-demo)
5. [Struktur proyek](#5-struktur-proyek)
6. [Variabel lingkungan](#6-variabel-lingkungan)
7. [Integrasi model AI (untuk tim AI/CTO)](#7-integrasi-model-ai-untuk-tim-aicto)
8. [Integrasi Midtrans](#8-integrasi-midtrans)
9. [Database](#9-database)
10. [Referensi API](#10-referensi-api)
11. [Design system](#11-design-system)
12. [Gambar Freepik](#12-gambar-freepik)
13. [Deploy](#13-deploy)
14. [Pengujian](#14-pengujian)
15. [Checklist menuju rilis](#15-checklist-menuju-rilis)

---

## 1. Ringkasan fitur

| Peran | Fitur |
|---|---|
| **Publik** | Landing page dengan cek cepat lokasi tanpa login, halaman harga, daftar, masuk |
| **Property seeker** | Dasbor dengan "Lanjutkan dari sini" dan tahap tiap properti, input properti (cari alamat, tempel koordinat, klik peta, atau "Saya sedang di lokasi"), Quick Location Intelligence, peta risiko & fasilitas, pilihan tujuan investasi (skor dihitung ulang otomatis), **Mode Survei** di HP (checklist area foto dengan kamera langsung + pertanyaan survei tersimpan otomatis), label sumber foto, analisis kondisi bangunan, **prioritas perbaikan** (mendesak/disarankan/kosmetik), **daftar belanja material** yang bisa disalin ke WhatsApp, estimasi renovasi, total investasi (penuh dan minimum), simpan & bandingkan hingga 4 properti, laporan PDF, pembayaran Midtrans, pesan inspeksi, profil & ganti sandi |
| **Property analyst** | Daftar permintaan inspeksi, ambil tugas, atur jadwal, catatan pemeriksaan, unggah foto lapangan, konfirmasi/sesuaikan/tolak temuan AI, tambah temuan, validasi & terbitkan ke laporan pengguna |
| **Admin** | Ringkasan platform, pengguna & hak akses, pemantauan analisis (durasi, kegagalan, keyakinan AI, kesesuaian dengan analis), harga referensi renovasi beserta **koefisien material AHSP** (CRUD), sumber data geospasial, daftar laporan |

**Model bisnis yang sudah berjalan di kode:**

- *Freemium* — ringkasan lokasi, mode survei, dan penyimpanan foto selalu gratis. Pengguna membayar saat ingin foto surveinya dianalisis.
- *Pay-per-report* — Laporan Lengkap Rp49.000 per properti.
- *Paket kredit* — Paket Hemat 5 laporan Rp199.000.
- *Inspection partnership* — Inspeksi Profesional Rp750.000, otomatis membuat permintaan untuk analis.

Harga paket diatur di `backend/app/layanan/konstanta.py` (`PAKET`).

## 2. Teknologi

| Lapisan | Teknologi |
|---|---|
| Frontend | React 19, Vite 7, CSS design token murni (tanpa framework CSS), react-icons (Lucide), Leaflet + OpenStreetMap/CARTO, Nominatim (geocoding) |
| Backend | Python 3.11+, Flask 3, Pydantic 2 (validasi), PyJWT (autentikasi), ReportLab (PDF), Pillow (validasi gambar), Requests |
| Database | SQLite (berkas tunggal, siap pakai, otomatis dibuat & diisi data demo) |
| Pembayaran | Midtrans Snap + webhook bertanda tangan SHA-512 |
| Deploy | Dockerfile satu kontainer (Flask menyajikan API + hasil build React), docker-compose |

Frontend sengaja minim dependensi agar ringan dan mudah dipelihara. Router dan state memakai modul kecil di `frontend/src/lib`.

## 3. Menjalankan secara lokal

**Prasyarat:** Python 3.11+, Node.js 20+.

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # sesuaikan bila perlu
python run.py                      # http://localhost:5000
```

Saat pertama dijalankan, database `backend/data/homewise.db` dibuat otomatis beserta akun demo, 3 properti contoh, harga referensi, dan sumber data.

### Frontend

```bash
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

Vite meneruskan semua permintaan `/api` ke `http://localhost:5000`, jadi tidak perlu mengatur CORS saat pengembangan.

### Reset database

Hapus folder `backend/data/` lalu jalankan ulang backend.

## 4. Akun demo

| Peran | Email | Kata sandi |
|---|---|---|
| Property seeker | `demo@homewise.id` | `demo12345` |
| Property analyst | `analis@homewise.id` | `analis12345` |
| Admin | `admin@homewise.id` | `admin12345` |

Halaman masuk menyediakan tombol isi otomatis untuk ketiga akun.

**Skenario demo yang disarankan untuk juri:**

1. Buka beranda, klik salah satu lokasi contoh di hero → skor lokasi langsung dihitung tanpa login.
2. Masuk sebagai *property seeker*. Dasbor menampilkan tiga properti di tahap berbeda.
3. Buka "Ruko Sudut Dago" (tahap Kandidat) → **Mulai mode survei**. Paling enak dicoba di HP atau mode responsif browser: ambil foto per area, jawab pertanyaan survei.
4. Buka "Rumah Sewa Dekat Stasiun Bekasi" (tahap Disurvei) → tab Kondisi bangunan → foto sudah ada → buka Laporan Lengkap (simulasi pembayaran atau pakai 1 kredit demo) → **Analisis foto**.
5. Buka "Rumah 2 Lantai Bintaro" (tahap Dianalisis) → tab Biaya & investasi: prioritas perbaikan, rincian pekerjaan, **daftar belanja material** (tombol Salin daftar) → unduh PDF.
6. Ubah tujuan pembelian dari "Rumah tinggal" ke "Restoran" → skor dan bobot indikator berubah.
7. Pilih 2–3 properti di "Properti saya" → Bandingkan.
8. Masuk sebagai *analyst* → ambil permintaan inspeksi Bintaro → isi catatan → tolak/sesuaikan temuan → Validasi & terbitkan. Laporan pengguna kini berstatus tervalidasi dan estimasi biaya ikut diperbarui.
9. Masuk sebagai *admin* → ubah harga atau koefisien material pada Harga referensi, lihat pemantauan analisis.

## 5. Struktur proyek

```
homewise/
├── Dockerfile                 # build frontend + backend jadi satu image
├── docker-compose.yml
├── backend/
│   ├── run.py                 # titik masuk (python run.py / gunicorn run:app)
│   ├── requirements.txt
│   ├── .env.example
│   ├── app/
│   │   ├── __init__.py        # buat_aplikasi(): blueprint, CORS, penyajian frontend
│   │   ├── konfigurasi.py     # semua konfigurasi dari environment
│   │   ├── db.py              # helper SQLite (satu, banyak, simpan, perbarui, ...)
│   │   ├── skema.sql          # skema database terbaru (instalasi baru)
│   │   ├── migrasi.py         # migrasi berversi untuk database yang sudah berjalan
│   │   ├── seed.py            # data awal & akun demo
│   │   ├── keamanan.py        # hash sandi, JWT, dekorator @wajib_login(peran)
│   │   ├── validasi.py        # skema Pydantic untuk setiap request
│   │   ├── respon.py          # format respons & penanganan galat
│   │   ├── rute/              # endpoint HTTP per domain
│   │   │   ├── auth.py  publik.py  dasbor.py  properti.py
│   │   │   ├── pembayaran.py  inspeksi.py  admin.py
│   │   └── layanan/           # logika bisnis
│   │       ├── ai_klien.py    # ★ SATU-SATUNYA titik integrasi model AI
│   │       ├── simulasi_ai.py # keluaran AI tiruan (deterministik) untuk demo
│   │       ├── lokasi.py      # skor indikator & bobot per tujuan
│   │       ├── biaya.py       # estimasi renovasi, prioritas, kebutuhan material
│   │       ├── ahsp.py        # koefisien material bawaan (AHSP PUPR)
│   │       ├── investasi.py   # total investasi & biaya transaksi
│   │       ├── penjelasan.py  # narasi templat (cadangan bila LLM belum ada)
│   │       ├── properti.py    # orkestrasi analisis & susunan data detail
│   │       ├── pembayaran.py  # alur transaksi & penerapan manfaat paket
│   │       ├── midtrans.py    # Snap, cek status, verifikasi tanda tangan
│   │       ├── laporan_pdf.py # PDF bermerek
│   │       ├── berkas.py      # unggah, rotasi, kompres, hapus EXIF/GPS foto
│   │       └── konstanta.py   # tujuan, bobot, area foto, pertanyaan survei, prioritas, paket
│   ├── contoh/
│   │   └── server_ai_contoh.py  # contoh server AI yang memenuhi kontrak
│   └── tests/test_api.py
└── frontend/
    ├── index.html  vite.config.js  package.json
    ├── public/
    │   ├── favicon.svg
    │   └── images/            # letakkan foto Freepik di sini (lihat bagian 12)
    └── src/
        ├── main.jsx  App.jsx  # penyedia konteks & tabel rute
        ├── gaya/              # design system: token, dasar, komponen, tata letak, halaman
        ├── lib/               # api, auth, router, hooks, format, midtrans, geokode
        ├── komponen/
        │   ├── ui/            # Tombol, Isian, Modal, CincinSkor, Kartu, Tab, ...
        │   ├── tata-letak/    # Logo, navbar publik, cangkang aplikasi per peran
        │   ├── ilustrasi/     # ilustrasi SVG sesuai palet merek
        │   ├── Peta.jsx  Pembayaran.jsx  KartuProperti.jsx  Temuan.jsx
        │   ├── Survei.jsx     # progres survei, tombol kamera, modal unggah, tahap, lencana prioritas
        ├── halaman/
        │   ├── publik/        # Beranda, Harga, Masuk, Daftar
        │   ├── Profil.jsx     # profil & ganti sandi (semua peran)
        │   ├── pencari/       # Dasbor, PropertiSaya, PropertiBaru, ModeSurvei, Bandingkan, Pembayaran, detail/
        │   ├── analis/        # DaftarInspeksi, DetailInspeksi
        │   └── admin/         # Ringkasan, Pengguna, Analisis, Harga, SumberData, Laporan
        └── data/gambar.js     # daftar slot foto
```

**Prinsip kode:** penamaan dalam bahasa Indonesia, fungsi kecil dengan satu tanggung jawab, komentar minimal (nama fungsi menjelaskan maksud), semua angka teknis dihitung di backend, LLM hanya menyusun penjelasan.

## 6. Variabel lingkungan

### Backend (`backend/.env`)

| Variabel | Bawaan | Keterangan |
|---|---|---|
| `LINGKUNGAN` | `pengembangan` | Set `produksi` saat rilis. Server menolak berjalan bila `SECRET_KEY` masih bawaan atau kurang dari 32 karakter, dan header HSTS diaktifkan. |
| `SECRET_KEY` | — | **Wajib diganti** di produksi. Kunci penanda tangan JWT. Buat dengan `python -c "import secrets; print(secrets.token_urlsafe(48))"`. |
| `JWT_KEDALUWARSA_JAM` | `72` | Masa berlaku sesi |
| `DATABASE_PATH` | `./data/homewise.db` | Lokasi berkas SQLite |
| `DIR_UNGGAHAN` | `./data/unggahan` | Folder foto bangunan |
| `DIR_FRONTEND` | `../frontend/dist` | Folder build React yang disajikan Flask |
| `MAKS_UNGGAHAN_MB` | `10` | Batas ukuran unggahan per request |
| `SEED_OTOMATIS` | `true` | Isi data demo bila database kosong |
| `CORS_ORIGINS` | `http://localhost:5173` | Daftar origin dipisah koma (bila frontend di domain lain) |
| `URL_FRONTEND` | `http://localhost:5173` | Dipakai untuk URL kembali dari Midtrans |
| `AI_MODE` | `simulasi` | `simulasi` atau `remote` |
| `AI_BASE_URL` | — | URL layanan AI, contoh `https://ai.homewise.id` |
| `AI_API_KEY` | — | Dikirim sebagai `Authorization: Bearer <key>` |
| `AI_TIMEOUT_DETIK` | `60` | Batas waktu panggilan AI |
| `MIDTRANS_SERVER_KEY` | — | Kosong = mode simulasi pembayaran |
| `MIDTRANS_CLIENT_KEY` | — | Dikirim ke frontend untuk Snap |
| `MIDTRANS_PRODUCTION` | `false` | `true` untuk akun produksi |
| `INDEKS_HARGA_WILAYAH` | `1.0` | Pengali harga satuan renovasi per daerah |

### Frontend (`frontend/.env`)

| Variabel | Keterangan |
|---|---|
| `VITE_API_URL` | Kosongkan bila frontend & backend satu domain (disarankan). Isi `https://api.domain.com` bila terpisah. |

## 7. Integrasi model AI (untuk tim AI/CTO)

Seluruh panggilan AI melewati **satu berkas**: `backend/app/layanan/ai_klien.py`. Backend sudah menangani autentikasi, penyimpanan, skor, biaya, PDF, log, dan UI. Tim AI cukup menyediakan layanan HTTP dengan tiga endpoint di bawah, lalu mengatur:

```env
AI_MODE=remote
AI_BASE_URL=https://alamat-layanan-ai-anda
AI_API_KEY=kunci-rahasia
```

Contoh server yang sudah memenuhi kontrak tersedia di `backend/contoh/server_ai_contoh.py` (memakai keluaran simulasi). Jalankan `python contoh/server_ai_contoh.py` lalu set `AI_BASE_URL=http://localhost:8000` untuk mencoba alurnya, kemudian ganti isi fungsinya dengan model asli.

### 7.1 `POST /lokasi` — Geospatial & Location Intelligence

Request (JSON):

```json
{ "lat": -6.27805, "lng": 106.71498, "alamat": "Jl. Cempaka Wangi, Bintaro", "radius_m": 5000 }
```

Response (JSON) — **semua field wajib**:

```json
{
  "risiko": {
    "banjir":  { "level": "rendah|sedang|tinggi", "skor": 0.18, "sumber": "InaRISK BNPB — Indeks Risiko Banjir" },
    "longsor": { "level": "sedang", "skor": 0.41, "sumber": "InaRISK BNPB — Indeks Risiko Longsor" },
    "gempa":   { "level": "sedang", "skor": 0.52, "sumber": "InaRISK BNPB — Indeks Bahaya Gempa" }
  },
  "topografi": { "elevasi_m": 34.5, "kemiringan_persen": 3.2 },
  "aksesibilitas": { "jarak_jalan_utama_m": 320, "lebar_jalan_depan_m": 6.0, "kepadatan_lalu_lintas": "rendah|sedang|tinggi" },
  "fasilitas": [
    { "kategori": "rumah_sakit", "nama": "RS Premier Bintaro", "jarak_m": 1800, "lat": -6.27, "lng": 106.72 }
  ],
  "karakter_kawasan": "Permukiman menengah",
  "keterbatasan_data": ["Kalimat keterbatasan data yang ditampilkan ke pengguna."]
}
```

- `skor` risiko: 0 (aman) – 1 (sangat berisiko).
- `kategori` fasilitas harus salah satu: `rumah_sakit`, `klinik`, `sekolah`, `kampus`, `pasar`, `perkantoran`, `stasiun`, `halte`. Kategori baru dapat ditambahkan di `KATEGORI_FASILITAS` (`konstanta.py`).
- Skor kelayakan 0–100 dan bobot per tujuan **dihitung backend** (`layanan/lokasi.py`), bukan oleh model.

### 7.2 `POST /kondisi-bangunan` — AI Building Condition Assessment

Request: `multipart/form-data` dengan beberapa field `foto` (berkas JPEG, sudah dirotasi sesuai EXIF dan diperkecil ke sisi terpanjang 2000 px), field `foto_id` berisi ID foto dipisah koma, dan field `area` berisi kode area per foto dengan urutan yang sama (`fasad`, `dinding_bawah`, `sudut_bukaan`, `plafon_basah`, `kamar_mandi`, `lantai`, `atap_talang`, `lainnya`). Area bisa dipakai model sebagai konteks.

Response:

```json
{
  "temuan": [
    {
      "jenis": "retak_dinding",
      "tingkat": "ringan|sedang|berat",
      "kepercayaan": 0.91,
      "luas_m2": 0.72,
      "panjang_m": 2.4,
      "foto_id": 12,
      "kotak": { "x": 0.24, "y": 0.07, "lebar": 0.3, "tinggi": 0.4 }
    }
  ]
}
```

- `jenis`: `retak_dinding`, `cat_mengelupas`, `noda_lembap`, `kerusakan_plafon`, `keramik_rusak`, `atap_bocor`.
- `kotak`: bounding box ternormalisasi 0–1 relatif terhadap lebar/tinggi foto (dipakai untuk menggambar penanda di UI).
- `luas_m2`: luas area rusak menurut **bentuk asli kerusakan** (jumlah piksel mask × luas bidang foto), bukan luas kotak deteksi. Luas bidang per area foto ada di `LUAS_BIDANG_FOTO` (`konstanta.py`), misalnya dinding bawah ±3 m², fasad ±20 m².
- `panjang_m` (opsional, khusus `retak_dinding`): panjang garis retak dari skeleton mask. Bila ada, volume perbaikan retak = panjang × lebar jalur (ringan 0,15 m · sedang 0,3 m · berat 0,5 m), sehingga retak memanjang tidak dihitung sebagai bidang persegi.
- Biaya renovasi, **prioritas**, dan **kebutuhan material** dihitung backend (`layanan/biaya.py`), bukan oleh model:
  - `jenis × tingkat` → daftar pekerjaan (misal retak sedang → bongkar plester & plester ulang yang sudah termasuk acian + cat). Acian dan kerok cat tidak dihitung lagi di bidang yang sudah dibongkar plesternya.
  - luas dasar × faktor (≤1,15, hanya untuk tepi kerja cat/atap) → volume pekerjaan; volume per foto dibatasi luas bidang foto dan temuan yang tumpang tindih tidak dijumlah dua kali. Luas ukur analis dipakai apa adanya.
  - Setiap pekerjaan membawa `keterangan` (lingkup kerja) dan `rincian_volume` (lokasi, temuan, dasar hitung).
  - volume × harga referensi → biaya material + upah.
  - volume × koefisien material AHSP → kebutuhan material, dibulatkan ke kemasan (sak, galon, dus).
  - `jenis × tingkat` → prioritas (`MATRIKS_PRIORITAS` di `konstanta.py`).
- Backend **membersihkan** respons model: temuan dengan `jenis`/`tingkat` di luar daftar, `luas_m2` tidak valid, atau `foto_id` yang tidak dikirim akan dibuang. Kepercayaan dibatasi 0–1. Respons `/lokasi` yang tidak memuat kunci wajib dicatat sebagai gagal dan pengguna mendapat pesan ramah.

### 7.3 `POST /penjelasan` — LLM (opsional)

Request:

```json
{ "jenis": "lokasi|bangunan|investasi", "konteks": { "...": "data hasil hitungan backend" } }
```

Response: `{ "teks": "Paragraf penjelasan dalam bahasa Indonesia." }`

Bila endpoint ini gagal atau mengembalikan `teks: null`, backend memakai templat bawaan di `layanan/penjelasan.py`. LLM **hanya** merangkai penjelasan dari `konteks`; jangan menambah angka baru.

### 7.4 Perilaku saat AI bermasalah

- Timeout/galat jaringan → API mengembalikan `503` dengan pesan ramah, dan dicatat di `log_analisis` (terlihat di Admin → Pemantauan analisis).
- Setiap analisis mencatat durasi dan sumber (`simulasi` / `remote`), sehingga kualitas model dapat dipantau setelah integrasi.

## 8. Integrasi Midtrans

1. Daftar di [dashboard.midtrans.com](https://dashboard.midtrans.com), pilih environment **Sandbox**.
2. Salin *Server Key* dan *Client Key* dari *Settings → Access Keys* ke `backend/.env`:
   ```env
   MIDTRANS_SERVER_KEY=SB-Mid-server-xxxx
   MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxx
   MIDTRANS_PRODUCTION=false
   ```
3. Atur *Payment Notification URL* di *Settings → Configuration*:
   `https://domain-anda.com/api/pembayaran/notifikasi`
4. Atur *Finish Redirect URL*: `https://domain-anda.com/app/pembayaran`

**Alur:** frontend memanggil `POST /api/pembayaran` → backend membuat transaksi Snap → frontend membuka popup Snap → Midtrans mengirim webhook → backend memverifikasi `signature_key` (SHA-512 dari `order_id + status_code + gross_amount + server_key`) dan nominal → status `lunas` → manfaat paket diterapkan **satu kali** (idempoten).

Saat webhook belum bisa menjangkau server (misalnya pengembangan lokal), halaman status pembayaran memanggil `POST /api/pembayaran/<order_id>/sinkron` untuk mengambil status langsung dari API Midtrans.

**Mode simulasi:** bila `MIDTRANS_SERVER_KEY` kosong, transaksi tetap tercatat, dan pengguna melihat lembar checkout simulasi berlabel jelas. Endpoint simulasi otomatis ditolak untuk transaksi mode Midtrans asli.

## 9. Database

SQLite dipilih agar prototype langsung jalan tanpa server database. Skema lengkap ada di `backend/app/skema.sql`.

| Tabel | Isi |
|---|---|
| `pengguna` | akun, peran (`pencari`/`analis`/`admin`), kredit laporan, status aktif |
| `properti` | data properti, koordinat, tujuan, harga, status laporan terbuka, jawaban survei (JSON) |
| `analisis_lokasi` | data mentah dari AI + hasil skor (JSON) |
| `foto_bangunan` | foto, area (`fasad`, `plafon_basah`, ...), sumber (`survei`/`iklan`/`analis`) |
| `analisis_bangunan` | temuan kerusakan (JSON), skor kondisi, status validasi |
| `estimasi_biaya` | rincian pekerjaan berprioritas, kebutuhan material, ringkasan per prioritas (JSON), total, rentang |
| `inspeksi` | permintaan inspeksi, analis, jadwal, catatan, draf validasi |
| `pembayaran` | transaksi Midtrans/simulasi, status, penerapan manfaat |
| `harga_referensi` | harga satuan material & upah per pekerjaan, koefisien material (JSON) |
| `sumber_data` | daftar sumber data geospasial & statusnya |
| `laporan` | catatan setiap PDF yang diterbitkan |
| `log_analisis` | log setiap panggilan AI (durasi, status, sumber) |

**Migrasi skema.** Versi skema disimpan di `PRAGMA user_version`. Saat aplikasi menyala, `app/migrasi.py` membuat skema terbaru untuk database baru, atau menjalankan langkah migrasi yang belum diterapkan untuk database lama, tanpa menghapus data. Untuk perubahan skema berikutnya, tambahkan fungsi `_ke_versi_3` ke `MIGRASI`, naikkan `VERSI_TERBARU`, dan perbarui `skema.sql`. Estimasi biaya lama dihitung ulang otomatis saat dibuka bila formatnya berubah.

SQLite dijalankan dalam mode WAL dengan `busy_timeout`, sehingga aman dipakai beberapa worker gunicorn untuk trafik awal.

**Migrasi ke PostgreSQL** (bila trafik bertambah): semua query berada di `app/db.py` dan modul `layanan/`/`rute/`, memakai SQL standar. Ganti `ambil_koneksi()` dengan driver `psycopg`, ubah placeholder `?` menjadi `%s`, dan sesuaikan `AUTOINCREMENT` → `SERIAL`, `datetime('now')` → `NOW()`.

## 10. Referensi API

Semua respons berformat `{ "sukses": true, "data": ... }` atau `{ "sukses": false, "pesan": "...", "detail": {...} }`. Endpoint terlindungi memerlukan header `Authorization: Bearer <token>`.

| Metode | Endpoint | Peran | Keterangan |
|---|---|---|---|
| GET | `/api/kesehatan` | publik | Status layanan, mode AI & pembayaran |
| GET | `/api/konfigurasi` | publik | Tujuan & bobot, indikator, kategori, paket, client key Midtrans |
| POST | `/api/cek-cepat` | publik | Skor lokasi cepat `{lat, lng, tujuan}` |
| POST | `/api/auth/daftar` | publik | `{nama, email, sandi, telepon?}` |
| POST | `/api/auth/masuk` | publik | `{email, sandi}` → token |
| GET/PATCH | `/api/auth/saya` | login | Profil |
| POST | `/api/auth/ganti-sandi` | login | `{sandi_lama, sandi_baru}` |
| GET | `/api/dasbor` | login | Statistik & properti terbaru |
| GET/POST | `/api/properti` | pencari | Daftar (`?cari=&tersimpan=1`) / buat + analisis lokasi |
| GET/PATCH/DELETE | `/api/properti/:id` | pemilik/staf | Detail lengkap / ubah (tujuan → skor ulang) / hapus |
| POST | `/api/properti/:id/analisis-lokasi` | pemilik/staf | Jalankan ulang analisis lokasi |
| POST | `/api/properti/:id/foto` | pemilik/staf | Unggah foto (`multipart`: `foto`, `area`, `sumber` = `survei`/`iklan`). Gratis, maks. 40 foto per properti |
| DELETE | `/api/properti/:id/foto/:fotoId` | pemilik/staf | Hapus foto (dikunci setelah divalidasi analis) |
| PUT | `/api/properti/:id/survei` | pemilik | Simpan jawaban checklist survei `{jawaban: {kode: opsi}, catatan}` |
| POST | `/api/properti/:id/analisis-bangunan` | premium | Analisis foto + estimasi biaya |
| POST | `/api/properti/:id/buka-kredit` | pemilik | Buka laporan dengan 1 kredit |
| GET | `/api/properti/:id/laporan.pdf` | premium | Unduh PDF |
| GET | `/api/properti/bandingkan?ids=1,2` | login | Bandingkan 2–4 properti |
| GET/POST | `/api/pembayaran` | login | Riwayat / buat transaksi `{paket, properti_id?}` |
| GET | `/api/pembayaran/:orderId` | pemilik | Detail transaksi |
| POST | `/api/pembayaran/:orderId/sinkron` | pemilik | Tarik status dari Midtrans |
| POST | `/api/pembayaran/:orderId/simulasi` | pemilik | Hanya mode simulasi |
| POST | `/api/pembayaran/notifikasi` | Midtrans | Webhook bertanda tangan |
| GET | `/api/inspeksi` | login | Daftar sesuai peran |
| GET | `/api/inspeksi/:id` | terkait | Detail + analisis properti |
| POST | `/api/inspeksi/:id/ambil` | analis | Ambil permintaan |
| PATCH | `/api/inspeksi/:id` | analis | `{jadwal?, catatan?, status?}` |
| POST | `/api/inspeksi/:id/foto` | analis | Foto lapangan (`foto`, `area`), otomatis bersumber `analis` |
| PUT | `/api/inspeksi/:id/temuan` | analis | Simpan draf validasi |
| POST | `/api/inspeksi/:id/validasi` | analis | Terapkan validasi & terbitkan |
| GET | `/api/admin/ringkasan` | admin | Statistik platform |
| GET/PATCH | `/api/admin/pengguna[/:id]` | admin | Kelola peran, status, kredit |
| GET/POST/PATCH/DELETE | `/api/admin/harga-referensi[/:id]` | admin | Kelola harga satuan |
| GET/PATCH | `/api/admin/sumber-data[/:id]` | admin | Status sumber data |
| GET | `/api/admin/laporan` | admin | Laporan terbit |
| GET | `/api/admin/analisis` | admin | Log & metrik kualitas AI |

*Premium* = properti dengan laporan terbuka, atau pengguna berperan analis/admin.

## 11. Design system

Semua token ada di `frontend/src/gaya/token.css` dan diturunkan dari palet logo HomeWise.

| Token | Nilai | Peran |
|---|---|---|
| `--biru-tua` | `#0832C8` | hover, judul angka, gradasi |
| `--biru` | `#0A43EF` | aksi utama, tautan, fokus |
| `--langit` | `#2ACAFC` | aksen gradasi, data visual |
| `--tosca` | `#14BACE` | skor "layak" |
| `--hijau` | `#008C73` | status aman/sukses, merek "Wise" |
| `--mint` | `#51DA9E` | data visual, langkah selesai |
| `--mint-muda` | `#A6EFB6` | latar sorotan, seleksi teks |
| `--lime` | `#A1E05B` | pill sorotan (gaya banner referensi), CTA sekunder di latar biru |

- **Tipografi:** *Plus Jakarta Sans* (typeface karya desainer Indonesia) — satu keluarga, skala 12/14/16/18/22/28/36 px, angka tabular untuk harga dan skor.
- **Radius bertingkat:** 6 px (penanda), 10 px (tombol/input), 14 px (kartu kecil), 20 px (kartu), 28 px (panel hero & bento).
- **Bayangan** bernuansa biru, bukan abu-abu netral.
- **Prioritas** punya warna tetap di seluruh aplikasi dan PDF: merah = mendesak, kuning = disarankan, hijau = kosmetik. **Tahap properti** memakai titik berwarna: abu-abu Kandidat, tosca Disurvei, biru Dianalisis, hijau Tervalidasi.
- **Komponen inti:** Tombol (utama, sekunder, hantu, lime, bahaya; kecil/besar), Isian/Pilihan/AreaTeks dengan label & pesan galat, Lencana bernada, Kartu, Tab, Segmen, Modal (bottom sheet di ponsel), Toast, CincinSkor, BatangSkor, Kosong, Kerangka (skeleton).
- **Aksesibilitas:** fokus keyboard terlihat, `aria` pada tab/dialog/switch, tautan lewati konten, `prefers-reduced-motion` dihormati, kontras teks memenuhi WCAG AA.
- **Responsif:** sidebar di desktop; topbar + laci menu + navigasi bawah dengan tombol tambah di ponsel. Mode Survei memakai tata letak layar penuh khusus ponsel dengan tombol kamera besar dan bilah "Selesai survei" yang menempel di bawah.

## 12. Gambar Freepik

Ilustrasi utama (rumah hero, banner, peta, pemindai, laporan) dibuat sebagai SVG dengan palet merek sehingga selalu tampil tajam dan konsisten. Kartu "Untuk siapa" di beranda menyediakan slot foto. Bila foto belum ada, kartu menampilkan latar gradasi + ikon secara otomatis.

Unduh foto dari Freepik (lisensi gratis mewajibkan atribusi — sudah tercantum di footer) lalu simpan dengan nama berikut di `frontend/public/images/`:

| Berkas | Kata kunci pencarian Freepik |
|---|---|
| `keluarga-rumah-baru.jpg` | *asian family new house front* |
| `pemilik-kafe.jpg` | *small business owner cafe shop* |
| `konsultasi-properti.jpg` | *real estate agent consultation bank* |
| `inspektur-bangunan.jpg` | *building inspector checking wall* |

Rekomendasi: rasio 16:10, lebar 1200 px, kompres ke WebP/JPG < 200 KB. Slot dan teks alternatif diatur di `frontend/src/data/gambar.js`.

## 13. Deploy

### Opsi A — Docker (disarankan, satu domain)

```bash
cp backend/.env.example backend/.env    # isi SECRET_KEY, Midtrans, AI
docker compose up -d --build            # http://server:5000
```

Database dan foto tersimpan di volume `homewise-data`. Pasang reverse proxy (Nginx/Caddy) dengan HTTPS di depan port 5000. Set `URL_FRONTEND` ke domain publik.

### Opsi B — Tanpa Docker

```bash
cd frontend && npm install && npm run build      # hasil di frontend/dist
cd ../backend && pip install -r requirements.txt
gunicorn -w 2 -b 0.0.0.0:5000 --timeout 120 run:app
```

Flask otomatis menyajikan `frontend/dist` dan meneruskan rute SPA ke `index.html`.

### Opsi C — Frontend & backend terpisah

- Frontend (Vercel/Netlify): set `VITE_API_URL=https://api.domain.com`, tambahkan aturan rewrite semua rute ke `/index.html`.
- Backend (Render/Railway/VPS): set `CORS_ORIGINS=https://domain-frontend.com`. Gunakan disk persisten untuk `DATABASE_PATH` dan `DIR_UNGGAHAN`.

## 14. Pengujian

```bash
cd backend
pytest -q
```

Tes mencakup migrasi otomatis, unggah foto survei sebelum bayar, checklist survei, prioritas & material, ubah koefisien material oleh admin, pembersihan respons AI, ganti sandi, penolakan `SECRET_KEY` bawaan di produksi, pendaftaran & login, proteksi token, pembuatan properti & skor ulang per tujuan, pembatasan fitur premium, pembayaran simulasi, paket kredit (idempoten), unggah foto, analisis bangunan, PDF, alur analis hingga validasi, batasan peran admin, dan verifikasi webhook Midtrans (valid & palsu).

## 15. Checklist menuju rilis

Sudah siap:

- [x] Autentikasi JWT & otorisasi per peran
- [x] Validasi semua input (Pydantic) & validasi isi berkas gambar (Pillow)
- [x] Pembayaran Midtrans dengan verifikasi tanda tangan, cek nominal, dan penerapan manfaat idempoten
- [x] Penanganan galat terpusat dengan pesan berbahasa Indonesia
- [x] Laporan PDF, log analisis, pemantauan kualitas AI
- [x] Antarmuka responsif & aksesibel, termasuk Mode Survei untuk ponsel
- [x] Migrasi database berversi, SQLite mode WAL
- [x] Pembatasan laju untuk masuk, daftar, ganti sandi, dan cek cepat publik (per IP, per proses)
- [x] Header keamanan (nosniff, frame deny, referrer, permissions, HSTS di produksi)
- [x] Foto dirotasi, diperkecil, dan data EXIF/GPS dihapus sebelum disimpan
- [x] Validasi respons model AI terhadap kontrak

Sebelum produksi:

- [ ] Ganti `AI_MODE=remote` dan hubungkan model AI (bagian 7)
- [ ] Isi kunci Midtrans produksi & URL notifikasi
- [ ] Set `LINGKUNGAN=produksi`, isi `SECRET_KEY` acak, set `SEED_OTOMATIS=false` **sebelum** menyalakan server pertama kali, lalu buat akun admin sendiri (lihat di bawah)
- [ ] Tinjau koefisien material dan harga referensi sesuai wilayah peluncuran (Admin → Harga referensi, atau `INDEKS_HARGA_WILAYAH`)
- [ ] Tambahkan foto Freepik (bagian 12)
- [ ] Pertimbangkan PostgreSQL & penyimpanan objek (S3/GCS) untuk foto bila pengguna bertambah
- [ ] Untuk lebih dari satu server, pindahkan pembatasan laju ke reverse proxy (Nginx `limit_req`) atau Redis
- [ ] Fitur lupa kata sandi membutuhkan layanan email (SMTP/transactional email). Sementara itu admin dapat membantu reset lewat database

**Membuat akun admin pertama di produksi** (saat `SEED_OTOMATIS=false`):

```bash
cd backend
python -c "
from app import buat_aplikasi, db
from app.keamanan import hash_sandi
app = buat_aplikasi()
with app.app_context():
    db.simpan('pengguna', {'nama': 'Admin', 'email': 'admin@domain-anda.com',
              'sandi_hash': hash_sandi('ganti-sandi-kuat'), 'peran': 'admin'})
"
```
- [ ] Untuk geocoding volume tinggi, gunakan server Nominatim sendiri atau penyedia berbayar (kebijakan Nominatim publik: maks. 1 permintaan/detik)

---

HomeWise bukan marketplace jual-beli dan bukan pengganti inspeksi profesional. HomeWise membantu pengguna menentukan properti mana yang layak dipertimbangkan lebih lanjut.

---

## Peta Harga Tanah

Fitur publik dan gratis (freemium) di `/peta-harga`, tanpa login. Menampilkan harga tanah per m² per kawasan di peta Leaflet, dengan filter kategori harga (premium ≥ Rp12 jt, menengah Rp7–12 jt, terjangkau < Rp7 jt) dan wilayah.

**Endpoint**

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/peta-harga?kabupaten=Denpasar` | Publik | Data peta, ringkasan per kabupaten, indeks pasar kota |
| GET | `/api/admin/harga-tanah` | Admin | Semua catatan harga per periode |
| POST | `/api/admin/harga-tanah` | Admin | Tambah/perbarui satu catatan (membentuk tren) |

**Sumber data, berurutan menurut prioritas**

1. **API penyedia** lewat `HARGA_TANAH_API_URL` (+ `HARGA_TANAH_API_KEY` opsional, dikirim sebagai Bearer). Dipanggil paling sering sekali per `HARGA_TANAH_CACHE_JAM` jam, dan hasilnya disimpan ke database sehingga riwayat dan tren terbentuk. Bila gagal, aplikasi memakai data tersimpan. Format respons yang diharapkan:

   ```json
   {"wilayah": [{"kode": "renon", "nama": "Renon", "kecamatan": "Denpasar Selatan", "kabupaten": "Denpasar",
     "lat": -8.6745, "lng": 115.2357, "radius_m": 1200, "periode": "2026-12",
     "harga_min": 11000000, "harga_median": 14500000, "harga_maks": 17000000,
     "jumlah_sampel": 12, "jenis_data": "penawaran", "sumber": "Nama mitra data", "url_sumber": null}]}
   ```

   `jenis_data` salah satu dari `penawaran` (harga listing), `transaksi`, atau `znt` (Zona Nilai Tanah ATR/BPN).
2. **Input admin** lewat `POST /api/admin/harga-tanah` dengan isi yang sama per wilayah.
3. **Data awal** di `backend/app/layanan/harga_tanah.py`: rekap harga penawaran listing publik (99.co, Rumah123, Brighton, Dot Property) per kawasan, November 2026, untuk 8 kawasan Denpasar & Badung. Ini harga yang diminta penjual, bukan harga transaksi, dan setiap kawasan menampilkan jumlah sampel serta tingkat keyakinannya.

**Tren** dihitung otomatis sebagai perubahan median dibanding catatan berjenis data sama 12 bulan sebelumnya. Data awal baru punya satu periode, jadi tren per kawasan muncul setelah periode berikutnya tercatat. Indeks pasar tingkat kota (tabel `indeks_pasar_kota`) ditampilkan sebagai kartu di peta.

Belum ada API publik harga tanah di Indonesia. Kandidat sumber resmi untuk `HARGA_TANAH_API_URL`: Zona Nilai Tanah ATR/BPN (portal Bhumi, perlu kerja sama), atau kemitraan data dengan portal properti.

## Faktor Nilai Rumah (model penelitian Denpasar)

Tab **Faktor nilai** di detail properti menerapkan simpulan penelitian M. Mariada Rijasa, M. Sukrawa & Mayun Nadiasa,
*Analisis Penilaian Bangunan Rumah Tinggal di Kota Denpasar*, Jurnal Spektran Vol. 2 No. 2 (2014), 31–40.
Logika ada di `backend/app/layanan/penilaian_nilai.py`, hasilnya dikirim sebagai `penilaian` pada `GET /api/properti/<id>`.

- **Peringkat kelompok** (eigenvalue): lokasi 7,723 · lingkungan 3,843 · karakteristik bangunan 3,741 · karakteristik tanah 3,253.
- **Faktor dominan**: pusat kota, lebar jalan depan, luas bangunan, luas tanah (positif); SUTET, lingkungan/jalan kurang baik,
  kondisi bangunan kurang baik, tusuk sate (negatif). Masing-masing dicocokkan dengan properti: dimiliki / aman / terdeteksi / belum diketahui.
- **Rincian 43 variabel** dengan koefisien Tabel 4, nilai untuk properti ini, asal data (data properti, isian, deteksi otomatis, belum diisi), dan pengaruhnya.
- **Nilai model** = 89.528.004 + Σ(koefisien × nilai), dalam rupiah 2013 (rentang ±5,06%). Dipakai sebagai pembanding relatif, bukan harga pasar.
- **Deteksi otomatis** dari OpenStreetMap (`faktor_sekitar` di `lokasi_asli.py`): jarak sarana rekreasi, SUTET/SUTT (jarak ke garis `power=line`),
  kuburan/setra, kawasan industri, jumlah akomodasi wisata 500 m, plus jarak pendidikan/kesehatan/belanja dan lebar jalan yang sudah ada.
  Pusat kota = ≤ 2,5 km dari Lapangan Puputan Badung atau Niti Mandala Renon.
- **Isian pengguna** (`spesifikasi`): posisi & bentuk tanah, ketinggian dari jalan, SHM, IMB/PBG, landscape view, kondisi lingkungan & jalan,
  lebar jalan depan/menuju, citra lokasi, kawasan (RDTR), struktur, tampilan, kelas bahan, serta koreksi deteksi otomatis.
  Bisa diisi di form properti baru (bagian opsional) atau tombol **Lengkapi faktor**. `PATCH /api/properti/<id>` menggabungkan spesifikasi; kirim `null` untuk mengosongkan.
- Batas jarak dekat ≤ 1 km / sedang 1–3 km ditetapkan HomeWise karena makalah tidak mencantumkannya. Properti di luar Denpasar tetap dihitung, dengan peringatan cakupan.
- Properti demo ke-4 (**Rumah Hook Renon Denpasar**) sudah berisi faktor lengkap untuk demo.
