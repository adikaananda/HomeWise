TUJUAN = {
    "rumah_tinggal": {
        "label": "Rumah tinggal",
        "deskripsi": "Hunian keluarga: prioritas keamanan bencana, sekolah, dan layanan kesehatan.",
        "bobot": {"keamanan_bencana": 0.30, "pendidikan": 0.20, "kesehatan": 0.20, "aksesibilitas": 0.15, "transportasi": 0.10, "ekonomi": 0.05},
    },
    "investasi_sewa": {
        "label": "Investasi sewa",
        "deskripsi": "Rumah atau kos untuk disewakan: prioritas akses transportasi dan pusat aktivitas.",
        "bobot": {"keamanan_bencana": 0.20, "transportasi": 0.25, "ekonomi": 0.20, "aksesibilitas": 0.15, "pendidikan": 0.10, "kesehatan": 0.10},
    },
    "restoran": {
        "label": "Restoran",
        "deskripsi": "Usaha kuliner: prioritas keramaian ekonomi, akses jalan utama, dan visibilitas.",
        "bobot": {"ekonomi": 0.35, "aksesibilitas": 0.25, "transportasi": 0.15, "keamanan_bencana": 0.15, "kesehatan": 0.05, "pendidikan": 0.05},
    },
    "kafe": {
        "label": "Kafe",
        "deskripsi": "Kafe dan kedai: prioritas kedekatan kampus, sekolah, dan area aktivitas.",
        "bobot": {"ekonomi": 0.30, "pendidikan": 0.20, "aksesibilitas": 0.20, "transportasi": 0.15, "keamanan_bencana": 0.15, "kesehatan": 0.0},
    },
    "kantor": {
        "label": "Kantor",
        "deskripsi": "Kantor operasional: prioritas transportasi umum, akses jalan, dan keamanan.",
        "bobot": {"transportasi": 0.30, "aksesibilitas": 0.25, "keamanan_bencana": 0.20, "ekonomi": 0.15, "kesehatan": 0.10, "pendidikan": 0.0},
    },
    "ruko": {
        "label": "Ruko / toko",
        "deskripsi": "Ruko dagang: prioritas aktivitas ekonomi dan arus kendaraan.",
        "bobot": {"ekonomi": 0.35, "aksesibilitas": 0.30, "transportasi": 0.10, "keamanan_bencana": 0.15, "kesehatan": 0.05, "pendidikan": 0.05},
    },
}

INDIKATOR = {
    "keamanan_bencana": "Keamanan bencana",
    "aksesibilitas": "Aksesibilitas jalan",
    "kesehatan": "Fasilitas kesehatan",
    "pendidikan": "Fasilitas pendidikan",
    "ekonomi": "Aktivitas ekonomi",
    "transportasi": "Transportasi umum",
}

KATEGORI_FASILITAS = {
    "rumah_sakit": {"label": "Rumah sakit", "indikator": "kesehatan", "jarak_ideal": 3000},
    "klinik": {"label": "Klinik / puskesmas", "indikator": "kesehatan", "jarak_ideal": 1500},
    "sekolah": {"label": "Sekolah", "indikator": "pendidikan", "jarak_ideal": 1500},
    "kampus": {"label": "Kampus", "indikator": "pendidikan", "jarak_ideal": 4000},
    "pasar": {"label": "Pasar / pusat belanja", "indikator": "ekonomi", "jarak_ideal": 2000},
    "perkantoran": {"label": "Kawasan perkantoran", "indikator": "ekonomi", "jarak_ideal": 3000},
    "stasiun": {"label": "Stasiun / terminal", "indikator": "transportasi", "jarak_ideal": 3000},
    "halte": {"label": "Halte bus", "indikator": "transportasi", "jarak_ideal": 800},
}

JENIS_KERUSAKAN = {
    "retak_dinding": "Retak dinding",
    "cat_mengelupas": "Cat mengelupas",
    "noda_lembap": "Noda kelembapan",
    "kerusakan_plafon": "Kerusakan plafon",
    "keramik_rusak": "Keramik rusak",
    "atap_bocor": "Indikasi atap bocor",
}

PENALTI_TINGKAT = {"ringan": 4, "sedang": 9, "berat": 18}

PAKET = {
    "laporan_tunggal": {
        "nama": "Laporan Lengkap",
        "harga": 49_000,
        "deskripsi": "Analisis bangunan, estimasi renovasi, total investasi, dan PDF untuk 1 properti.",
        "butuh_properti": True,
    },
    "paket_hemat": {
        "nama": "Paket Hemat 5 Laporan",
        "harga": 199_000,
        "deskripsi": "5 kredit laporan lengkap yang bisa dipakai untuk properti mana saja.",
        "butuh_properti": False,
    },
    "inspeksi_profesional": {
        "nama": "Inspeksi Profesional",
        "harga": 750_000,
        "deskripsi": "Analis HomeWise memeriksa langsung dan memvalidasi temuan AI. Termasuk laporan lengkap.",
        "butuh_properti": True,
    },
}

ASUMSI_TRANSAKSI = {
    "tarif_bphtb": 0.05,
    "npoptkp": 80_000_000,
    "tarif_ppat": 0.01,
    "biaya_administrasi": 2_500_000,
    "tarif_kontingensi": 0.10,
}


def label_kategori_skor(skor):
    if skor >= 80:
        return "Sangat layak"
    if skor >= 65:
        return "Layak"
    if skor >= 50:
        return "Perlu pertimbangan"
    return "Kurang layak"
