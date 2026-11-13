import hashlib
import math
import random

from .konstanta import KATEGORI_FASILITAS

NAMA_FASILITAS = {
    "rumah_sakit": ["RSUD Kota", "RS Bunda Sehat", "RS Medika Utama", "RS Harapan Kita"],
    "klinik": ["Puskesmas Kelurahan", "Klinik Pratama Sentosa", "Klinik Keluarga Sehat"],
    "sekolah": ["SD Negeri 03", "SMP Negeri 12", "SMA Negeri 5", "SD Islam Terpadu"],
    "kampus": ["Universitas Nusantara", "Politeknik Negeri", "Institut Teknologi Kota"],
    "pasar": ["Pasar Induk", "Pasar Tradisional", "Mal Kota", "Pusat Grosir"],
    "perkantoran": ["Kawasan Bisnis Terpadu", "Menara Perkantoran", "Sentra Niaga"],
    "stasiun": ["Stasiun Kereta", "Terminal Bus Kota", "Stasiun MRT/LRT"],
    "halte": ["Halte Bus Utama", "Halte Feeder", "Halte Koridor"],
}


def _rng(*kunci):
    benih = hashlib.sha256("|".join(str(k) for k in kunci).encode()).hexdigest()
    return random.Random(int(benih[:16], 16))


def _geser(lat, lng, jarak_m, arah_derajat):
    radian = math.radians(arah_derajat)
    dlat = (jarak_m * math.cos(radian)) / 111_320
    dlng = (jarak_m * math.sin(radian)) / (111_320 * math.cos(math.radians(lat)))
    return round(lat + dlat, 6), round(lng + dlng, 6)


def _level(skor):
    if skor >= 0.66:
        return "tinggi"
    if skor >= 0.33:
        return "sedang"
    return "rendah"


def analisis_lokasi(lat, lng, alamat=None, radius_m=5000):
    acak = _rng(round(lat, 4), round(lng, 4))
    elevasi = round(acak.uniform(4, 750), 1)
    kemiringan = round(acak.uniform(0.5, 6) if elevasi < 200 else acak.uniform(3, 28), 1)

    skor_banjir = max(0.05, min(0.95, (1 - elevasi / 120) * 0.8 + acak.uniform(-0.15, 0.2)))
    skor_longsor = max(0.03, min(0.95, kemiringan / 30 + acak.uniform(-0.1, 0.15)))
    skor_gempa = round(acak.uniform(0.25, 0.7), 2)

    fasilitas = []
    for kategori, info in KATEGORI_FASILITAS.items():
        jumlah = min(acak.randint(1, 3), len(NAMA_FASILITAS[kategori]))
        for nama in acak.sample(NAMA_FASILITAS[kategori], jumlah):
            jarak = int(acak.uniform(0.15, 1.6) * info["jarak_ideal"])
            titik_lat, titik_lng = _geser(lat, lng, jarak, acak.uniform(0, 360))
            fasilitas.append({
                "kategori": kategori,
                "nama": nama,
                "jarak_m": jarak,
                "lat": titik_lat,
                "lng": titik_lng,
            })
    fasilitas.sort(key=lambda f: f["jarak_m"])

    return {
        "risiko": {
            "banjir": {"level": _level(skor_banjir), "skor": round(skor_banjir, 2), "sumber": "Indeks risiko banjir (simulasi InaRISK BNPB)"},
            "longsor": {"level": _level(skor_longsor), "skor": round(skor_longsor, 2), "sumber": "Indeks risiko longsor (simulasi InaRISK BNPB)"},
            "gempa": {"level": _level(skor_gempa), "skor": skor_gempa, "sumber": "Indeks bahaya gempa (simulasi InaRISK BNPB)"},
        },
        "topografi": {"elevasi_m": elevasi, "kemiringan_persen": kemiringan},
        "aksesibilitas": {
            "jarak_jalan_utama_m": int(acak.uniform(40, 1400)),
            "lebar_jalan_depan_m": round(acak.uniform(3, 12), 1),
            "kepadatan_lalu_lintas": acak.choice(["rendah", "sedang", "tinggi"]),
        },
        "fasilitas": fasilitas,
        "karakter_kawasan": acak.choice(["Permukiman padat", "Permukiman menengah", "Campuran hunian-komersial", "Koridor komersial"]),
        "keterbatasan_data": [
            "Data risiko bencana berbasis indeks wilayah, belum mencerminkan kondisi per bidang tanah.",
            "Daftar fasilitas berasal dari data terbuka dan bisa belum memuat fasilitas terbaru.",
        ],
    }


KATALOG_TEMUAN = [
    ("retak_dinding", (1.0, 8.0)),
    ("cat_mengelupas", (3.0, 20.0)),
    ("noda_lembap", (1.5, 10.0)),
    ("kerusakan_plafon", (2.0, 12.0)),
    ("keramik_rusak", (1.0, 6.0)),
    ("atap_bocor", (2.0, 10.0)),
]


def analisis_foto(daftar_foto):
    temuan = []
    for foto in daftar_foto:
        acak = _rng(foto["sidik"])
        for jenis, (luas_min, luas_maks) in acak.sample(KATALOG_TEMUAN, acak.randint(1, 3)):
            x, y = round(acak.uniform(0.05, 0.6), 3), round(acak.uniform(0.05, 0.6), 3)
            temuan.append({
                "jenis": jenis,
                "tingkat": acak.choices(["ringan", "sedang", "berat"], weights=[5, 3, 1])[0],
                "kepercayaan": round(acak.uniform(0.62, 0.96), 2),
                "luas_m2": round(acak.uniform(luas_min, luas_maks), 1),
                "foto_id": foto["id"],
                "kotak": {"x": x, "y": y, "lebar": round(acak.uniform(0.15, 0.35), 3), "tinggi": round(acak.uniform(0.15, 0.35), 3)},
            })
    return {"temuan": temuan}
