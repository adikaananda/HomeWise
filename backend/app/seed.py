import random
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from flask import current_app
from PIL import Image, ImageDraw, ImageFilter

from . import db
from .keamanan import hash_sandi
from .layanan import properti as layanan_properti
from .layanan.ahsp import MATERIAL_BAWAAN

PENGGUNA = [
    ("Admin HomeWise", "admin@homewise.id", "admin12345", "admin", None),
    ("Rina Analis", "analis@homewise.id", "analis12345", "analis", "HomeWise Inspection"),
    ("Dimas Pratama", "demo@homewise.id", "demo12345", "pencari", None),
]

HARGA_REFERENSI = [
    ("acian_dinding", "Plester tipis dan acian dinding", "Dinding", 18_000, 30_000),
    ("bobok_plester", "Bobok dan plester ulang dinding", "Dinding", 55_000, 60_000),
    ("cat_dinding", "Pengecatan dinding (dasar + 2 lapis)", "Finishing", 22_000, 18_000),
    ("cat_plafon", "Pengecatan plafon", "Finishing", 20_000, 18_000),
    ("kerok_cat", "Pengerokan cat lama", "Finishing", 3_000, 15_000),
    ("waterproofing", "Lapisan waterproofing", "Kelembapan", 65_000, 35_000),
    ("perkuatan_struktur", "Injeksi epoxy dan perkuatan retak struktur", "Struktur", 450_000, 300_000),
    ("perbaikan_plafon", "Tambal dan perbaikan plafon", "Plafon", 40_000, 35_000),
    ("plafon_gypsum", "Ganti panel plafon gypsum", "Plafon", 95_000, 55_000),
    ("rangka_plafon", "Ganti rangka plafon hollow", "Plafon", 75_000, 40_000),
    ("bongkar_keramik", "Bongkar keramik lama", "Lantai", 0, 35_000),
    ("pasang_keramik", "Pasang keramik 60x60 baru", "Lantai", 135_000, 75_000),
    ("screed_lantai", "Perataan lantai (screed)", "Lantai", 60_000, 45_000),
    ("perbaikan_atap", "Perbaikan genteng dan talang", "Atap", 85_000, 65_000),
    ("ganti_penutup_atap", "Ganti penutup atap metal pasir", "Atap", 160_000, 90_000),
]

SUMBER_DATA = [
    ("InaRISK — Risiko Banjir", "Risiko bencana", "BNPB", "Nasional, tingkat kelurahan", "aktif", 12),
    ("InaRISK — Risiko Tanah Longsor", "Risiko bencana", "BNPB", "Nasional, tingkat kelurahan", "aktif", 12),
    ("InaRISK — Bahaya Gempa Bumi", "Risiko bencana", "BNPB", "Nasional", "aktif", 40),
    ("DEMNAS — Elevasi & Topografi", "Topografi", "Badan Informasi Geospasial", "Nasional, resolusi 8 m", "aktif", 95),
    ("OpenStreetMap — Fasilitas Umum", "Fasilitas & aksesibilitas", "OpenStreetMap Contributors", "Global", "perlu_pembaruan", 120),
    ("AHSP Bidang Cipta Karya", "Harga satuan pekerjaan", "Kementerian PUPR", "Nasional, disesuaikan indeks wilayah", "aktif", 30),
]

PROPERTI_DEMO = [
    {
        "nama": "Rumah 2 Lantai Bintaro Sektor 9",
        "alamat": "Jl. Cempaka Wangi, Pondok Aren, Tangerang Selatan, Banten",
        "lat": -6.27805, "lng": 106.71498, "jenis_properti": "rumah", "tujuan": "rumah_tinggal",
        "harga_penawaran": 2_150_000_000, "luas_tanah": 120, "luas_bangunan": 140, "tahun_bangun": 2008, "jumlah_lantai": 2,
        "sumber_iklan": "https://www.instagram.com/p/contoh-iklan", "laporan_terbuka": 1,
    },
    {
        "nama": "Ruko Sudut Dago untuk Kafe",
        "alamat": "Jl. Ir. H. Juanda, Coblong, Kota Bandung, Jawa Barat",
        "lat": -6.88672, "lng": 107.61331, "jenis_properti": "ruko", "tujuan": "kafe",
        "harga_penawaran": 3_400_000_000, "luas_tanah": 90, "luas_bangunan": 180, "tahun_bangun": 2012, "jumlah_lantai": 3,
        "sumber_iklan": None, "laporan_terbuka": 0,
    },
    {
        "nama": "Rumah Sewa Dekat Stasiun Bekasi",
        "alamat": "Jl. Perjuangan, Bekasi Utara, Kota Bekasi, Jawa Barat",
        "lat": -6.22664, "lng": 107.00058, "jenis_properti": "rumah", "tujuan": "investasi_sewa",
        "harga_penawaran": 1_250_000_000, "luas_tanah": 96, "luas_bangunan": 72, "tahun_bangun": 2015, "jumlah_lantai": 1,
        "sumber_iklan": "https://www.facebook.com/marketplace/contoh", "laporan_terbuka": 0,
    },
]


def _foto_contoh(nama_berkas, warna_dinding, gaya, benih):
    acak = random.Random(benih)
    lebar, tinggi = 960, 720
    gambar = Image.new("RGB", (lebar, tinggi), warna_dinding)
    gambar_titik = gambar.load()
    for _ in range(26000):
        x, y = acak.randrange(lebar), acak.randrange(tinggi)
        r, g, b = gambar_titik[x, y]
        d = acak.randint(-14, 14)
        gambar_titik[x, y] = (max(0, min(255, r + d)), max(0, min(255, g + d)), max(0, min(255, b + d)))
    gambar = gambar.filter(ImageFilter.GaussianBlur(1.2))
    kanvas = ImageDraw.Draw(gambar)
    kanvas.rectangle([0, tinggi - 90, lebar, tinggi], fill=tuple(max(0, c - 55) for c in warna_dinding))

    if gaya == "retak":
        titik = [(acak.randint(250, 400), 60)]
        for _ in range(16):
            x, y = titik[-1]
            titik.append((x + acak.randint(-25, 40), y + acak.randint(22, 40)))
        kanvas.line(titik, fill=(70, 62, 55), width=4)
    elif gaya == "lembap":
        for i in range(10):
            r = 200 - i * 16
            warna = tuple(max(0, c - 8 - i * 5) for c in warna_dinding)
            kanvas.ellipse([380 - r, 160 - r // 1.4, 380 + r, 160 + r // 1.4], fill=warna)
        gambar = gambar.filter(ImageFilter.GaussianBlur(3))
    elif gaya == "fasad":
        kanvas.rectangle([0, 0, lebar, 260], fill=(173, 214, 245))
        kanvas.polygon([(140, 300), (480, 120), (820, 300)], fill=(120, 72, 58))
        kanvas.rectangle([180, 300, 780, tinggi - 90], fill=warna_dinding)
        for x in (240, 560):
            kanvas.rectangle([x, 360, x + 150, 500], fill=(70, 110, 150))
        kanvas.rectangle([420, 420, 520, tinggi - 90], fill=(140, 96, 60))
    elif gaya == "atap":
        for baris in range(0, tinggi - 90, 40):
            for kolom in range(-30 if baris % 80 else 0, lebar, 60):
                kanvas.rounded_rectangle([kolom, baris, kolom + 56, baris + 36], 8,
                                         fill=tuple(max(0, c - acak.randint(0, 25)) for c in warna_dinding))
        kanvas.polygon([(370, 220), (470, 230), (450, 330), (360, 310)], fill=(40, 34, 32))
    else:
        for _ in range(9):
            x, y = acak.randint(150, 700), acak.randint(120, 520)
            kanvas.polygon([(x, y), (x + acak.randint(40, 110), y + acak.randint(-20, 30)),
                            (x + acak.randint(30, 90), y + acak.randint(40, 90)), (x - 20, y + acak.randint(30, 70))],
                           fill=(205, 196, 180))

    gambar.save(Path(current_app.config["DIR_UNGGAHAN"]) / nama_berkas, "JPEG", quality=82)


def _simpan_foto_contoh(properti_id, pengguna_id, area, ruang, warna, gaya, benih):
    nama_berkas = f"contoh-{uuid.uuid4().hex[:10]}.jpg"
    _foto_contoh(nama_berkas, warna, gaya, benih)
    return db.simpan("foto_bangunan", {
        "properti_id": properti_id, "nama_berkas": nama_berkas, "nama_asli": f"{ruang}.jpg",
        "ruang": ruang, "area": area, "sumber": "survei", "diunggah_oleh": pengguna_id,
    })


def _waktu_lalu(hari, jam=0):
    return (datetime.now(timezone.utc) - timedelta(days=hari, hours=jam)).strftime("%Y-%m-%d %H:%M:%S")


def isi_data_awal():
    if db.nilai("SELECT COUNT(*) FROM pengguna"):
        return

    id_pengguna = {}
    for nama, email, sandi, peran, perusahaan in PENGGUNA:
        id_pengguna[peran] = db.simpan("pengguna", {
            "nama": nama, "email": email, "sandi_hash": hash_sandi(sandi), "peran": peran,
            "perusahaan": perusahaan, "kredit_laporan": 1 if peran == "pencari" else 0,
        })

    for kode, nama, kategori, material, upah in HARGA_REFERENSI:
        db.simpan("harga_referensi", {"kode": kode, "nama": nama, "kategori": kategori, "satuan": "m2",
                                      "harga_material": material, "harga_upah": upah,
                                      "material": MATERIAL_BAWAAN.get(kode, [])})

    for nama, jenis, penyedia, cakupan, status, hari in SUMBER_DATA:
        db.simpan("sumber_data", {"nama": nama, "jenis": jenis, "penyedia": penyedia, "cakupan": cakupan,
                                  "status": status, "terakhir_diperbarui": _waktu_lalu(hari)})

    daftar_id = []
    for indeks, data in enumerate(PROPERTI_DEMO):
        properti_id = db.simpan("properti", {**data, "pengguna_id": id_pengguna["pencari"],
                                             "dibuat": _waktu_lalu(6 - indeks * 2), "diperbarui": _waktu_lalu(5 - indeks * 2)})
        daftar_id.append(properti_id)
        layanan_properti.jalankan_analisis_lokasi(db.satu("SELECT * FROM properti WHERE id = ?", (properti_id,)))

    properti_utama = daftar_id[0]
    foto_utama = {}
    for benih, (area, ruang, warna, gaya) in enumerate([
        ("fasad", "Tampak depan", (236, 238, 242), "fasad"),
        ("sudut_bukaan", "Kamar tidur utama", (226, 220, 206), "retak"),
        ("plafon_basah", "Plafon dapur", (214, 222, 214), "lembap"),
        ("dinding_bawah", "Ruang tamu", (232, 214, 190), "kelupas"),
        ("atap_talang", "Atap belakang", (150, 92, 70), "atap"),
    ]):
        foto_utama[area] = _simpan_foto_contoh(properti_utama, id_pengguna["pencari"], area, ruang, warna, gaya, benih)

    for benih, (area, ruang, warna, gaya) in enumerate([
        ("fasad", "Tampak depan", (240, 236, 228), "fasad"),
        ("dinding_bawah", "Dinding ruang depan", (230, 226, 214), "kelupas"),
    ], start=10):
        _simpan_foto_contoh(daftar_id[2], id_pengguna["pencari"], area, ruang, warna, gaya, benih)

    db.perbarui("properti", properti_utama, {"data_survei": {
        "jawaban": {
            "riwayat_banjir": "Tidak pernah", "sumber_air": "PDAM", "daya_listrik": "2.200 VA",
            "sertifikat": "SHM", "izin_bangunan": "Ada", "akses_mobil": "Bisa, dua arah",
        },
        "catatan": "Tetangga bilang talang belakang sering meluap saat hujan deras.",
        "diperbarui": _waktu_lalu(3),
    }})

    temuan = [
        {**t, "foto_id": foto_utama[area], "status": "ai"}
        for area, t in [
            ("sudut_bukaan", {"jenis": "retak_dinding", "tingkat": "sedang", "kepercayaan": 0.91, "luas_m2": 4.5,
                              "kotak": {"x": 0.24, "y": 0.07, "lebar": 0.3, "tinggi": 0.82}}),
            ("plafon_basah", {"jenis": "noda_lembap", "tingkat": "sedang", "kepercayaan": 0.86, "luas_m2": 6.0,
                              "kotak": {"x": 0.2, "y": 0.04, "lebar": 0.42, "tinggi": 0.4}}),
            ("plafon_basah", {"jenis": "kerusakan_plafon", "tingkat": "ringan", "kepercayaan": 0.68, "luas_m2": 3.0,
                              "kotak": {"x": 0.62, "y": 0.04, "lebar": 0.3, "tinggi": 0.22}}),
            ("dinding_bawah", {"jenis": "cat_mengelupas", "tingkat": "ringan", "kepercayaan": 0.94, "luas_m2": 12.0,
                               "kotak": {"x": 0.14, "y": 0.16, "lebar": 0.72, "tinggi": 0.68}}),
            ("atap_talang", {"jenis": "atap_bocor", "tingkat": "sedang", "kepercayaan": 0.79, "luas_m2": 5.0,
                             "kotak": {"x": 0.38, "y": 0.3, "lebar": 0.26, "tinggi": 0.3}}),
        ]
    ]
    layanan_properti.simpan_hasil_bangunan(properti_utama, temuan, "simulasi")

    db.simpan("pembayaran", {"order_id": "HW-DEMO00000001", "pengguna_id": id_pengguna["pencari"], "properti_id": properti_utama,
                             "paket": "inspeksi_profesional", "jumlah": 750_000, "status": "lunas", "mode": "simulasi",
                             "metode": "simulasi", "manfaat_diterapkan": 1, "dibuat": _waktu_lalu(2)})
    db.simpan("inspeksi", {"properti_id": properti_utama, "pemohon_id": id_pengguna["pencari"], "status": "menunggu",
                           "dibuat": _waktu_lalu(2)})
    db.simpan("laporan", {"nomor": "HW-DEMO-00001", "properti_id": properti_utama, "pengguna_id": id_pengguna["pencari"],
                          "dibuat": _waktu_lalu(1)})

    acak = random.Random(7)
    for hari in range(7):
        for _ in range(acak.randint(3, 9)):
            db.simpan("log_analisis", {
                "properti_id": acak.choice(daftar_id), "jenis": acak.choice(["lokasi", "lokasi", "bangunan"]),
                "status": "gagal" if acak.random() < 0.06 else "berhasil", "sumber": "simulasi",
                "durasi_ms": acak.randint(380, 2600), "dibuat": _waktu_lalu(hari, acak.randint(0, 20)),
            })
    current_app.logger.info("Data awal HomeWise berhasil dibuat.")
