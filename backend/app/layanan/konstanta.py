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

AREA_FOTO = [
    {"kode": "fasad", "label": "Tampak depan", "wajib": True,
     "panduan": "Foto dari seberang jalan sampai seluruh bangunan dan atap terlihat."},
    {"kode": "dinding_bawah", "label": "Dinding bagian bawah", "wajib": True,
     "panduan": "Dekatkan ke 0–100 cm dari lantai. Garis noda atau cat menggelembung bisa jadi bekas banjir."},
    {"kode": "sudut_bukaan", "label": "Sudut jendela & pintu", "wajib": True,
     "panduan": "Retak miring di sudut kusen bisa menandakan penurunan pondasi."},
    {"kode": "plafon_basah", "label": "Plafon dekat kamar mandi & dapur", "wajib": True,
     "panduan": "Cari noda kuning, plafon melendut, atau jamur."},
    {"kode": "kamar_mandi", "label": "Kamar mandi", "wajib": True,
     "panduan": "Dinding, nat keramik, dan lantai di sekitar kloset serta saluran air."},
    {"kode": "lantai", "label": "Lantai", "wajib": True,
     "panduan": "Keramik retak, terangkat, atau berbunyi kopong saat diketuk."},
    {"kode": "atap_talang", "label": "Atap & talang", "wajib": False,
     "panduan": "Dari luar atau loteng: genteng bergeser, talang berkarat, rembesan."},
    {"kode": "lainnya", "label": "Area lain", "wajib": False,
     "panduan": "Kerusakan lain yang Anda temukan saat survei."},
]

SUMBER_FOTO = {
    "survei": "Survei pembeli",
    "iklan": "Iklan / penjual",
    "analis": "Analis HomeWise",
}

PERTANYAAN_SURVEI = [
    {"kode": "riwayat_banjir", "label": "Menurut warga atau penjual, pernah banjir?",
     "opsi": ["Tidak pernah", "Pernah, surut < 1 hari", "Pernah, lebih dari 1 hari", "Belum tahu"]},
    {"kode": "sumber_air", "label": "Sumber air bersih",
     "opsi": ["PDAM", "Sumur", "PDAM dan sumur", "Belum tahu"]},
    {"kode": "daya_listrik", "label": "Daya listrik terpasang",
     "opsi": ["900 VA", "1.300 VA", "2.200 VA", "3.500 VA atau lebih", "Belum tahu"]},
    {"kode": "sertifikat", "label": "Jenis sertifikat",
     "opsi": ["SHM", "SHGB", "AJB / girik", "Belum tahu"]},
    {"kode": "izin_bangunan", "label": "IMB / PBG tersedia?",
     "opsi": ["Ada", "Tidak ada", "Belum tahu"]},
    {"kode": "akses_mobil", "label": "Mobil bisa masuk sampai depan rumah?",
     "opsi": ["Bisa, dua arah", "Bisa, satu mobil", "Tidak bisa"]},
]

PRIORITAS = {
    "mendesak": {"label": "Mendesak", "keterangan": "Perbaiki sebelum ditempati atau dipakai usaha."},
    "disarankan": {"label": "Disarankan", "keterangan": "Perbaiki dalam 6–12 bulan agar kerusakan tidak meluas."},
    "kosmetik": {"label": "Kosmetik", "keterangan": "Tampilan saja, bisa ditunda sesuai anggaran."},
}

MATRIKS_PRIORITAS = {
    "atap_bocor": {"ringan": "disarankan", "sedang": "mendesak", "berat": "mendesak"},
    "retak_dinding": {"ringan": "kosmetik", "sedang": "disarankan", "berat": "mendesak"},
    "noda_lembap": {"ringan": "kosmetik", "sedang": "disarankan", "berat": "mendesak"},
    "kerusakan_plafon": {"ringan": "kosmetik", "sedang": "disarankan", "berat": "mendesak"},
    "keramik_rusak": {"ringan": "kosmetik", "sedang": "kosmetik", "berat": "disarankan"},
    "cat_mengelupas": {"ringan": "kosmetik", "sedang": "kosmetik", "berat": "disarankan"},
}

ALASAN_PRIORITAS = {
    "atap_bocor": "Air bocor merusak plafon, rangka, dan instalasi listrik.",
    "retak_dinding": "Retak lebar atau memanjang perlu dipastikan tidak terkait pondasi.",
    "noda_lembap": "Lembap terus-menerus memicu jamur dan merusak plester.",
    "kerusakan_plafon": "Plafon rusak berat berisiko runtuh.",
    "keramik_rusak": "Keramik terangkat bisa membuat tersandung.",
    "cat_mengelupas": "Mengganggu tampilan, tidak memengaruhi struktur.",
}

URUTAN_PRIORITAS = ["mendesak", "disarankan", "kosmetik"]


def tentukan_prioritas(jenis, tingkat):
    return MATRIKS_PRIORITAS.get(jenis, {}).get(tingkat, "disarankan")

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
    "paket_komparasi": {
        "nama": "Paket Komparasi 3 Laporan",
        "harga": 119_000,
        "deskripsi": "3 kredit laporan lengkap untuk membandingkan kandidat properti.",
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

PROGRAM_KPR_BTN = [
    {
        "kode": "promo_fixed",
        "nama": "Promo Fixed BTN",
        "suku_bunga": 3.75,
        "tenor_maks": 30,
        "dp_min_persen": 10,
        "keterangan": "Bunga promo fixed indikatif untuk pembeli rumah pertama dengan DP ringan.",
    },
    {
        "kode": "platinum",
        "nama": "KPR Platinum BTN",
        "suku_bunga": 5.50,
        "tenor_maks": 25,
        "dp_min_persen": 15,
        "keterangan": "Plafon fleksibel untuk rumah tinggal, rumah kedua, ruko, atau properti komersial.",
    },
    {
        "kode": "btn_gaess",
        "nama": "KPR BTN Gaess (Pembeli Pertama)",
        "suku_bunga": 3.75,
        "tenor_maks": 30,
        "dp_min_persen": 10,
        "keterangan": "Bunga promo fixed 3 tahun untuk milenial & pembeli rumah pertama dengan DP ringan.",
    },
    {
        "kode": "btn_platinum",
        "nama": "KPR BTN Platinum",
        "suku_bunga": 4.75,
        "tenor_maks": 25,
        "dp_min_persen": 15,
        "keterangan": "Plafon fleksibel untuk rumah tinggal, rumah kedua, ruko, atau properti komersial.",
    },
    {
        "kode": "btn_renovasi",
        "nama": "KPR BTN + Top-Up Renovasi",
        "suku_bunga": 5.25,
        "tenor_maks": 20,
        "dp_min_persen": 15,
        "keterangan": "Gabungkan harga pembelian rumah dan estimasi biaya renovasi HomeWise dalam satu cicilan KPR.",
    },
]


def label_kategori_skor(skor):
    if skor >= 80:
        return "Sangat layak"
    if skor >= 65:
        return "Layak"
    if skor >= 50:
        return "Perlu pertimbangan"
    return "Kurang layak"
