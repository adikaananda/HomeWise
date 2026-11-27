PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS pengguna (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    sandi_hash TEXT NOT NULL,
    peran TEXT NOT NULL DEFAULT 'pencari' CHECK (peran IN ('pencari', 'analis', 'admin')),
    telepon TEXT,
    perusahaan TEXT,
    kredit_laporan INTEGER NOT NULL DEFAULT 1,
    aktif INTEGER NOT NULL DEFAULT 1,
    dibuat TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS properti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pengguna_id INTEGER NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    alamat TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    jenis_properti TEXT NOT NULL DEFAULT 'rumah',
    tujuan TEXT NOT NULL DEFAULT 'rumah_tinggal',
    harga_penawaran INTEGER NOT NULL DEFAULT 0,
    luas_tanah REAL,
    luas_bangunan REAL,
    tahun_bangun INTEGER,
    jumlah_lantai INTEGER DEFAULT 1,
    sumber_iklan TEXT,
    catatan TEXT,
    data_survei TEXT,
    spesifikasi TEXT,
    tersimpan INTEGER NOT NULL DEFAULT 1,
    laporan_terbuka INTEGER NOT NULL DEFAULT 0,
    pilihan_utama INTEGER NOT NULL DEFAULT 0,
    dibuat TEXT NOT NULL DEFAULT (datetime('now')),
    diperbarui TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS analisis_lokasi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    properti_id INTEGER NOT NULL UNIQUE REFERENCES properti(id) ON DELETE CASCADE,
    data_mentah TEXT NOT NULL,
    hasil TEXT NOT NULL,
    skor_total REAL NOT NULL,
    sumber TEXT NOT NULL DEFAULT 'simulasi',
    dibuat TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS foto_bangunan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    properti_id INTEGER NOT NULL REFERENCES properti(id) ON DELETE CASCADE,
    nama_berkas TEXT NOT NULL,
    nama_asli TEXT,
    ruang TEXT,
    area TEXT NOT NULL DEFAULT 'lainnya',
    sumber TEXT NOT NULL DEFAULT 'survei' CHECK (sumber IN ('survei', 'iklan', 'analis')),
    jarak TEXT NOT NULL DEFAULT 'sedang' CHECK (jarak IN ('dekat', 'sedang', 'jauh')),
    diunggah_oleh INTEGER REFERENCES pengguna(id),
    dibuat TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS analisis_bangunan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    properti_id INTEGER NOT NULL UNIQUE REFERENCES properti(id) ON DELETE CASCADE,
    temuan TEXT NOT NULL,
    skor_kondisi REAL NOT NULL,
    ringkasan TEXT,
    sumber TEXT NOT NULL DEFAULT 'simulasi',
    tervalidasi INTEGER NOT NULL DEFAULT 0,
    dibuat TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS estimasi_biaya (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    properti_id INTEGER NOT NULL UNIQUE REFERENCES properti(id) ON DELETE CASCADE,
    rincian TEXT NOT NULL,
    subtotal INTEGER NOT NULL,
    kontingensi INTEGER NOT NULL,
    total INTEGER NOT NULL,
    rentang_min INTEGER NOT NULL,
    rentang_maks INTEGER NOT NULL,
    dibuat TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inspeksi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    properti_id INTEGER NOT NULL REFERENCES properti(id) ON DELETE CASCADE,
    pemohon_id INTEGER NOT NULL REFERENCES pengguna(id),
    analis_id INTEGER REFERENCES pengguna(id),
    status TEXT NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'dijadwalkan', 'diperiksa', 'tervalidasi', 'dibatalkan')),
    jadwal TEXT,
    catatan TEXT,
    temuan_validasi TEXT,
    divalidasi_pada TEXT,
    dibuat TEXT NOT NULL DEFAULT (datetime('now')),
    diperbarui TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pembayaran (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL UNIQUE,
    pengguna_id INTEGER NOT NULL REFERENCES pengguna(id),
    properti_id INTEGER REFERENCES properti(id) ON DELETE SET NULL,
    paket TEXT NOT NULL,
    jumlah INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'lunas', 'gagal', 'kedaluwarsa', 'dibatalkan')),
    mode TEXT NOT NULL DEFAULT 'simulasi',
    snap_token TEXT,
    redirect_url TEXT,
    metode TEXT,
    manfaat_diterapkan INTEGER NOT NULL DEFAULT 0,
    payload_terakhir TEXT,
    dibuat TEXT NOT NULL DEFAULT (datetime('now')),
    diperbarui TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS harga_referensi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kode TEXT NOT NULL UNIQUE,
    nama TEXT NOT NULL,
    kategori TEXT NOT NULL,
    satuan TEXT NOT NULL DEFAULT 'm2',
    harga_material INTEGER NOT NULL,
    harga_upah INTEGER NOT NULL,
    material TEXT NOT NULL DEFAULT '[]',
    aktif INTEGER NOT NULL DEFAULT 1,
    diperbarui TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sumber_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    jenis TEXT NOT NULL,
    penyedia TEXT NOT NULL,
    cakupan TEXT,
    status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'perlu_pembaruan', 'nonaktif')),
    terakhir_diperbarui TEXT,
    catatan TEXT
);

CREATE TABLE IF NOT EXISTS laporan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nomor TEXT NOT NULL UNIQUE,
    properti_id INTEGER NOT NULL REFERENCES properti(id) ON DELETE CASCADE,
    pengguna_id INTEGER NOT NULL REFERENCES pengguna(id),
    dibuat TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS log_analisis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    properti_id INTEGER REFERENCES properti(id) ON DELETE SET NULL,
    jenis TEXT NOT NULL,
    status TEXT NOT NULL,
    sumber TEXT,
    durasi_ms INTEGER,
    pesan TEXT,
    dibuat TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cache_llm (
    kunci TEXT PRIMARY KEY,
    jenis TEXT NOT NULL,
    model TEXT NOT NULL,
    teks TEXT NOT NULL,
    dibuat TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pengajuan_kpr (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pengguna_id INTEGER NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,
    properti_id INTEGER NOT NULL REFERENCES properti(id) ON DELETE CASCADE,
    mitra_bank TEXT NOT NULL DEFAULT 'BTN',
    program_kpr TEXT NOT NULL,
    harga_properti INTEGER NOT NULL,
    biaya_renovasi INTEGER NOT NULL DEFAULT 0,
    persen_dp REAL NOT NULL,
    nominal_dp INTEGER NOT NULL,
    plafon_kpr INTEGER NOT NULL,
    tenor_tahun INTEGER NOT NULL,
    suku_bunga REAL NOT NULL,
    estimasi_angsuran INTEGER NOT NULL,
    nama_pemohon TEXT NOT NULL,
    telepon TEXT NOT NULL,
    email TEXT NOT NULL,
    status_pekerjaan TEXT NOT NULL,
    penghasilan_bulanan INTEGER NOT NULL DEFAULT 0,
    kota TEXT,
    kota_properti TEXT,
    pilihan_layanan TEXT DEFAULT 'konsultasi',
    kode_rujukan TEXT,
    status TEXT NOT NULL DEFAULT 'diajukan' CHECK (status IN ('diajukan', 'dihubungi', 'proses_bank', 'disetujui', 'ditolak')),
    catatan TEXT,
    dibuat TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_properti_pengguna ON properti(pengguna_id);
CREATE INDEX IF NOT EXISTS idx_pembayaran_pengguna ON pembayaran(pengguna_id);
CREATE INDEX IF NOT EXISTS idx_inspeksi_status ON inspeksi(status);
CREATE INDEX IF NOT EXISTS idx_log_dibuat ON log_analisis(dibuat);
CREATE INDEX IF NOT EXISTS idx_foto_properti ON foto_bangunan(properti_id);
CREATE INDEX IF NOT EXISTS idx_kpr_pengguna ON pengajuan_kpr(pengguna_id);

CREATE TABLE IF NOT EXISTS wilayah_harga_tanah (
    kode TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    kecamatan TEXT,
    kabupaten TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    radius_m INTEGER NOT NULL DEFAULT 1200
);

CREATE TABLE IF NOT EXISTS harga_tanah (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wilayah_kode TEXT NOT NULL REFERENCES wilayah_harga_tanah(kode) ON DELETE CASCADE,
    periode TEXT NOT NULL,
    harga_min INTEGER NOT NULL,
    harga_median INTEGER NOT NULL,
    harga_maks INTEGER NOT NULL,
    jumlah_sampel INTEGER NOT NULL DEFAULT 0,
    jenis_data TEXT NOT NULL CHECK (jenis_data IN ('penawaran', 'transaksi', 'znt')),
    sumber TEXT NOT NULL,
    url_sumber TEXT,
    dibuat TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (wilayah_kode, periode, jenis_data)
);

CREATE TABLE IF NOT EXISTS indeks_pasar_kota (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kota TEXT NOT NULL,
    periode TEXT NOT NULL,
    perubahan_yoy REAL NOT NULL,
    jenis TEXT NOT NULL,
    sumber TEXT NOT NULL,
    url_sumber TEXT,
    UNIQUE (kota, periode, sumber)
);

CREATE INDEX IF NOT EXISTS idx_harga_tanah_wilayah ON harga_tanah(wilayah_kode, periode);
