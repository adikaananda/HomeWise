"""Faktor penilaian nilai rumah tinggal berdasarkan penelitian Rijasa, Sukrawa & Nadiasa (2014).

Sumber: M. Mariada Rijasa, M. Sukrawa, Mayun Nadiasa. "Analisis Penilaian Bangunan Rumah Tinggal di Kota
Denpasar". Jurnal Spektran Vol. 2 No. 2, Juli 2014, hlm. 31–40. Survei 27 ahli penilai dan 200 data rumah yang
pernah dinilai (Januari–April 2013), regresi linier berganda dengan adjusted R² 0,964.

Modul ini memakai koefisien Tabel 4 makalah tersebut untuk:
- menunjukkan faktor mana yang dimiliki properti dan arah pengaruhnya (naik/turun),
- menghitung "nilai model" dalam rupiah tahun 2013 sebagai pembanding relatif, bukan harga pasar hari ini.
"""

import re
from datetime import date

from .lokasi_asli import jarak_haversine_m

SUMBER_PENELITIAN = {
    "judul": "Analisis Penilaian Bangunan Rumah Tinggal di Kota Denpasar",
    "penulis": "M. Mariada Rijasa, M. Sukrawa, Mayun Nadiasa",
    "terbitan": "Jurnal Spektran Vol. 2 No. 2, Juli 2014, hlm. 31–40, Universitas Udayana",
    "data": "27 ahli penilai (appraisal independen, appraisal & marketing bank, developer, agen) dan 200 rumah "
            "yang pernah dinilai di Kota Denpasar, Januari–April 2013.",
    "ketepatan": "Adjusted R² 0,964: 96,4% variasi nilai dijelaskan oleh faktor-faktor ini. Selisih model dengan "
                 "taksiran ahli maks. 5,06% pada periode data, naik menjadi 12,15% lima bulan kemudian.",
}

KONSTANTA = 89_528_004
SELISIH_VALIDASI = 0.0506

# Peringkat kelompok faktor berdasarkan eigenvalue analisis faktor konfirmatori (Tabel 3).
KELOMPOK = [
    {"kode": "lokasi", "label": "Lokasi", "eigen": 7.723,
     "dominan_positif": "Kawasan permukiman pusat kota", "dominan_negatif": "Dekat jaringan SUTET"},
    {"kode": "lingkungan", "label": "Lingkungan", "eigen": 3.843,
     "dominan_positif": "Lebar jalan depan tanah", "dominan_negatif": "Kondisi jalan / lingkungan kurang baik"},
    {"kode": "bangunan", "label": "Karakteristik bangunan", "eigen": 3.741,
     "dominan_positif": "Luas bangunan", "dominan_negatif": "Kondisi fisik bangunan kurang baik"},
    {"kode": "tanah", "label": "Karakteristik tanah", "eigen": 3.253,
     "dominan_positif": "Luas tanah", "dominan_negatif": "Posisi tanah tusuk sate"},
]

# Koefisien regresi (B, rupiah 2013) dan standardized beta dari Tabel 4.
# satuan: "m2" / "m" / "tahun" untuk variabel kuantitatif, None untuk dummy 0/1.
FAKTOR = [
    # Karakteristik tanah
    {"kode": "X1", "kelompok": "tanah", "label": "Luas tanah", "b": 2_244_757, "beta": 0.388, "satuan": "m²"},
    {"kode": "X2a", "kelompok": "tanah", "label": "Bentuk tanah trapesium / jajaran genjang / L", "b": 6_356_080, "beta": 0.005},
    {"kode": "X2b", "kelompok": "tanah", "label": "Bentuk tanah persegi", "b": 28_081_203, "beta": 0.024},
    {"kode": "X3a", "kelompok": "tanah", "label": "Posisi tanah tusuk sate", "b": -65_362_691, "beta": -0.031},
    {"kode": "X3b", "kelompok": "tanah", "label": "Posisi tanah interior (di tengah)", "b": 41_637_760, "beta": 0.038},
    {"kode": "X3c", "kelompok": "tanah", "label": "Posisi tanah hook (di pojok)", "b": 73_199_406, "beta": 0.051},
    {"kode": "X4", "kelompok": "tanah", "label": "Ketinggian tanah dari jalan depan", "b": 13_815_028, "beta": 0.011, "satuan": "m"},
    {"kode": "X6", "kelompok": "tanah", "label": "Legalitas tanah SHM", "b": 48_828_823, "beta": 0.023},
    # Lingkungan
    {"kode": "X7", "kelompok": "lingkungan", "label": "Memiliki landscape view", "b": 9_399_910, "beta": 0.005},
    {"kode": "X8a", "kelompok": "lingkungan", "label": "Kondisi lingkungan sekitar kurang baik", "b": -28_270_931, "beta": -0.010},
    {"kode": "X8b", "kelompok": "lingkungan", "label": "Kondisi lingkungan sekitar baik", "b": 38_861_688, "beta": 0.039},
    {"kode": "X9", "kelompok": "lingkungan", "label": "Lebar jalan menuju tanah", "b": 8_262_104, "beta": 0.049, "satuan": "m"},
    {"kode": "X10", "kelompok": "lingkungan", "label": "Lebar jalan depan tanah", "b": 19_662_940, "beta": 0.086, "satuan": "m"},
    {"kode": "X11a", "kelompok": "lingkungan", "label": "Kondisi jalan kurang baik", "b": -12_904_126, "beta": -0.012},
    {"kode": "X11b", "kelompok": "lingkungan", "label": "Kondisi jalan baik", "b": 57_040_266, "beta": 0.056},
    # Lokasi
    {"kode": "X13a", "kelompok": "lokasi", "label": "Jarak ke sarana pendidikan sedang", "b": 3_299_559, "beta": 0.003},
    {"kode": "X13b", "kelompok": "lokasi", "label": "Jarak ke sarana pendidikan dekat", "b": 17_854_461, "beta": 0.016},
    {"kode": "X14a", "kelompok": "lokasi", "label": "Jarak ke sarana kesehatan sedang", "b": 57_134_534, "beta": 0.051},
    {"kode": "X14b", "kelompok": "lokasi", "label": "Jarak ke sarana kesehatan dekat", "b": 106_986_046, "beta": 0.074},
    {"kode": "X15a", "kelompok": "lokasi", "label": "Jarak ke sarana belanja sedang", "b": 24_494_671, "beta": 0.023},
    {"kode": "X15b", "kelompok": "lokasi", "label": "Jarak ke sarana belanja dekat", "b": 38_069_747, "beta": 0.038},
    {"kode": "X16a", "kelompok": "lokasi", "label": "Jarak ke sarana rekreasi sedang", "b": 103_965_846, "beta": 0.056},
    {"kode": "X16b", "kelompok": "lokasi", "label": "Jarak ke sarana rekreasi dekat", "b": 123_601_801, "beta": 0.075},
    {"kode": "X17a", "kelompok": "lokasi", "label": "Dekat sumber polusi udara", "b": -25_152_443, "beta": -0.014},
    {"kode": "X17b", "kelompok": "lokasi", "label": "Dekat sumber polusi suara", "b": -35_647_584, "beta": -0.019},
    {"kode": "X18", "kelompok": "lokasi", "label": "Dekat jaringan SUTET", "b": -86_608_051, "beta": -0.027},
    {"kode": "X19", "kelompok": "lokasi", "label": "Dekat kuburan / setra", "b": -35_833_108, "beta": -0.017},
    {"kode": "X20a", "kelompok": "lokasi", "label": "Citra lokasi kurang baik", "b": -55_801_102, "beta": -0.023},
    {"kode": "X20b", "kelompok": "lokasi", "label": "Citra lokasi baik sekali", "b": 120_818_241, "beta": 0.063},
    {"kode": "X21a", "kelompok": "lokasi", "label": "Kawasan permukiman pusat kota", "b": 164_256_791, "beta": 0.163},
    {"kode": "X21b", "kelompok": "lokasi", "label": "Kawasan permukiman KDB 30%", "b": -50_816_690, "beta": -0.021},
    {"kode": "X22", "kelompok": "lokasi", "label": "Kawasan perdagangan dan jasa", "b": 230_081_411, "beta": 0.104},
    {"kode": "X23", "kelompok": "lokasi", "label": "Kawasan pariwisata", "b": 302_913_885, "beta": 0.084},
    # Karakteristik bangunan
    {"kode": "X24", "kelompok": "bangunan", "label": "Luas bangunan", "b": 1_654_061, "beta": 0.342, "satuan": "m²"},
    {"kode": "X25", "kelompok": "bangunan", "label": "Usia bangunan", "b": -2_575_299, "beta": -0.019, "satuan": "tahun"},
    {"kode": "X26a", "kelompok": "bangunan", "label": "Kondisi fisik bangunan kurang baik", "b": -102_465_962, "beta": -0.087},
    {"kode": "X26b", "kelompok": "bangunan", "label": "Kondisi fisik bangunan baik", "b": 101_550_874, "beta": 0.099},
    {"kode": "X27a", "kelompok": "bangunan", "label": "Struktur permanen (1 lantai)", "b": 52_585_749, "beta": 0.019},
    {"kode": "X27b", "kelompok": "bangunan", "label": "Struktur bertingkat", "b": 65_692_188, "beta": 0.065},
    {"kode": "X28", "kelompok": "bangunan", "label": "Tampilan bangunan mengikuti tren", "b": 46_990_203, "beta": 0.047},
    {"kode": "X29a", "kelompok": "bangunan", "label": "Bahan bangunan kelas II", "b": 29_211_696, "beta": 0.029},
    {"kode": "X29b", "kelompok": "bangunan", "label": "Bahan bangunan kelas I", "b": 66_285_649, "beta": 0.064},
    {"kode": "X30", "kelompok": "bangunan", "label": "Memiliki IMB / PBG", "b": 5_178_435, "beta": 0.005},
]
FAKTOR_PER_KODE = {f["kode"]: f for f in FAKTOR}

NAMA_FAKTOR_ASAL = {
    "X2": "Bentuk tanah", "X3": "Posisi tanah", "X8": "Kondisi lingkungan sekitar", "X11": "Kondisi jalan",
    "X13": "Jarak ke sarana pendidikan", "X14": "Jarak ke sarana kesehatan", "X15": "Jarak ke sarana belanja",
    "X16": "Jarak ke sarana rekreasi", "X17a": "Polusi udara", "X17b": "Polusi suara", "X20": "Citra lokasi",
    "X21a": "Kawasan pusat kota", "X21b": "Kawasan KDB 30%", "X26": "Kondisi fisik bangunan", "X27": "Struktur bangunan",
    "X29": "Kelas bahan bangunan",
}

# Batas jarak "dekat"/"sedang" tidak dicantumkan di makalah; HomeWise memakai batas berikut dan menyebutkannya.
BATAS_JARAK = {"dekat": 1000, "sedang": 3000}
BATAS_SUTET_M = 200
BATAS_KUBURAN_M = 200
BATAS_INDUSTRI_M = 500
BATAS_BISING_M = 75
# Pusat kota Denpasar: pusat lama (Lapangan Puputan Badung) dan pusat pemerintahan/bisnis (Niti Mandala Renon).
PUSAT_DENPASAR = [("Lapangan Puputan Badung", (-8.6573, 115.2163)), ("Niti Mandala Renon", (-8.6735, 115.2337))]
RADIUS_PUSAT_KOTA_M = 2500
BATAS_DENPASAR = {"lat": (-8.75, -8.57), "lng": (115.15, 115.28)}

LABEL_SUMBER = {
    "properti": "Data properti",
    "isian": "Isian pengguna",
    "otomatis": "Deteksi otomatis",
    "asumsi": "Belum diisi (dianggap tidak ada)",
}


def dalam_denpasar(properti):
    if "denpasar" in (properti.get("alamat") or "").lower():
        return True
    lat, lng = properti.get("lat"), properti.get("lng")
    if lat is None or lng is None:
        return False
    return BATAS_DENPASAR["lat"][0] <= lat <= BATAS_DENPASAR["lat"][1] and BATAS_DENPASAR["lng"][0] <= lng <= BATAS_DENPASAR["lng"][1]


def _kategori_jarak(jarak):
    if jarak is None:
        return None
    if jarak <= BATAS_JARAK["dekat"]:
        return "dekat"
    if jarak <= BATAS_JARAK["sedang"]:
        return "sedang"
    return "jauh"


def _teks_jarak(jarak):
    if jarak is None:
        return "tidak ditemukan dalam radius pencarian"
    return f"{jarak} m" if jarak < 1000 else f"{jarak / 1000:.1f} km".replace(".", ",")


def _terdekat(fasilitas, kategori):
    jarak = [f["jarak_m"] for f in fasilitas if f["kategori"] in kategori]
    return min(jarak) if jarak else None


class _Pengisi:
    """Mengumpulkan nilai setiap variabel beserta asal datanya."""

    def __init__(self):
        self.nilai = {}
        self.catatan = {}

    def set(self, kode, nilai, sumber, teks):
        self.nilai[kode] = (float(nilai), sumber, teks)

    def dummy_kategori(self, kode_per_pilihan, pilihan, sumber, teks):
        for opsi, kode in kode_per_pilihan.items():
            self.set(kode, 1 if pilihan == opsi else 0, sumber, teks)


def _kondisi_dari_skor(skor):
    if skor is None:
        return None
    if skor >= 80:
        return "baik"
    if skor < 60:
        return "kurang"
    return "sedang"


def kumpulkan_variabel(properti, data_lokasi, bangunan):
    spek = properti.get("spesifikasi") or {}
    p = _Pengisi()
    lok = data_lokasi or {}
    fasilitas = lok.get("fasilitas") or []
    akses = lok.get("aksesibilitas") or {}
    sekitar = lok.get("faktor_sekitar")

    # --- Karakteristik tanah ---
    p.set("X1", properti.get("luas_tanah") or 0, "properti" if properti.get("luas_tanah") else "asumsi",
          f"{properti['luas_tanah']:g} m²" if properti.get("luas_tanah") else "Luas tanah belum diisi")
    bentuk = spek.get("bentuk_tanah")
    p.dummy_kategori({"tidak_beraturan": "X2a", "persegi": "X2b"}, bentuk, "isian" if bentuk else "asumsi",
                     {"persegi": "Persegi / persegi panjang", "tidak_beraturan": "Trapesium / jajaran genjang / L",
                      "lainnya": "Bentuk lain"}.get(bentuk, "Belum diisi"))
    posisi = spek.get("posisi_tanah")
    p.dummy_kategori({"tusuk_sate": "X3a", "interior": "X3b", "hook": "X3c"}, posisi, "isian" if posisi else "asumsi",
                     {"tusuk_sate": "Tusuk sate (ujung jalan)", "interior": "Interior (di tengah deretan)",
                      "hook": "Hook (di pojok/sudut jalan)", "lainnya": "Lainnya"}.get(posisi, "Belum diisi"))
    tinggi = spek.get("ketinggian_tanah_m")
    p.set("X4", tinggi or 0, "isian" if tinggi is not None else "asumsi",
          f"{tinggi:+g} m dari jalan".replace(".", ",") if tinggi is not None else "Belum diisi, dianggap sejajar jalan")
    legal = spek.get("legalitas_tanah")
    p.set("X6", 1 if legal == "shm" else 0, "isian" if legal else "asumsi",
          {"shm": "SHM", "hgb": "HGB", "lainnya": "Girik / petok / lainnya"}.get(legal, "Belum diisi"))

    # --- Lingkungan ---
    view = spek.get("landscape_view")
    p.set("X7", 1 if view else 0, "isian" if view is not None else "asumsi", "Ya" if view else ("Tidak" if view is False else "Belum diisi"))
    ling = spek.get("kondisi_lingkungan")
    p.dummy_kategori({"kurang": "X8a", "baik": "X8b"}, ling, "isian" if ling else "asumsi",
                     {"baik": "Baik", "sedang": "Sedang", "kurang": "Kurang baik"}.get(ling, "Belum diisi, dianggap sedang"))

    lebar_depan = spek.get("lebar_jalan_depan_m")
    if lebar_depan:
        p.set("X10", lebar_depan, "isian", f"{lebar_depan:g} m (diukur pengguna)".replace(".", ","))
    elif akses.get("lebar_jalan_depan_m"):
        p.set("X10", akses["lebar_jalan_depan_m"], "otomatis",
              f"±{akses['lebar_jalan_depan_m']:g} m dari OpenStreetMap".replace(".", ","))
    else:
        p.set("X10", 0, "asumsi", "Belum diketahui")
    lebar_menuju = spek.get("lebar_jalan_menuju_m")
    if lebar_menuju:
        p.set("X9", lebar_menuju, "isian", f"{lebar_menuju:g} m".replace(".", ","))
    else:
        nilai = p.nilai["X10"][0]
        p.set("X9", nilai, "asumsi" if not nilai else "otomatis",
              f"Belum diisi, disamakan dengan jalan depan ({nilai:g} m)".replace(".", ",") if nilai else "Belum diketahui")
    jalan = spek.get("kondisi_jalan")
    p.dummy_kategori({"kurang": "X11a", "baik": "X11b"}, jalan, "isian" if jalan else "asumsi",
                     {"baik": "Baik (aspal/paving mulus)", "sedang": "Sedang", "kurang": "Kurang baik (rusak/berlubang)"}.get(jalan, "Belum diisi, dianggap sedang"))

    # --- Lokasi: jarak ke fasilitas dari OpenStreetMap ---
    def jarak_kategori(kode_sedang, kode_dekat, kategori, label):
        jarak = _terdekat(fasilitas, kategori)
        kat = _kategori_jarak(jarak)
        sumber = "otomatis" if fasilitas else "asumsi"
        teks = f"{label} terdekat {_teks_jarak(jarak)} ({kat or 'tidak ada data'})"
        p.set(kode_sedang, 1 if kat == "sedang" else 0, sumber, teks)
        p.set(kode_dekat, 1 if kat == "dekat" else 0, sumber, teks)

    jarak_kategori("X13a", "X13b", ("sekolah", "kampus"), "Sekolah/kampus")
    jarak_kategori("X14a", "X14b", ("rumah_sakit", "klinik"), "Rumah sakit/klinik")
    jarak_kategori("X15a", "X15b", ("pasar",), "Pasar/pusat belanja")

    rekreasi = (sekitar or {}).get("rekreasi_m")
    kat_rek = _kategori_jarak(rekreasi)
    sumber_rek = "otomatis" if sekitar else "asumsi"
    teks_rek = (f"Taman/pantai/objek wisata terdekat {_teks_jarak(rekreasi)} ({kat_rek or 'tidak ada data'})"
                if sekitar else "Data sarana rekreasi belum tersedia, jalankan ulang analisis lokasi")
    if (sekitar or {}).get("rekreasi_nama"):
        teks_rek += f": {sekitar['rekreasi_nama']}"
    p.set("X16a", 1 if kat_rek == "sedang" else 0, sumber_rek, teks_rek)
    p.set("X16b", 1 if kat_rek == "dekat" else 0, sumber_rek, teks_rek)

    def dummy_dekat(kode, kunci_isian, jarak, batas, label, sumber_otomatis_ada):
        isian = spek.get(kunci_isian)
        if isian is not None:
            p.set(kode, 1 if isian else 0, "isian", "Ya, menurut pengguna" if isian else "Tidak, menurut pengguna")
        elif sumber_otomatis_ada:
            p.set(kode, 1 if (jarak is not None and jarak <= batas) else 0, "otomatis",
                  f"{label} terdekat {_teks_jarak(jarak)} (dekat bila ≤ {batas} m)")
        else:
            p.set(kode, 0, "asumsi", "Belum dicek")

    s = sekitar or {}
    dummy_dekat("X17a", "dekat_polusi_udara", s.get("industri_m"), BATAS_INDUSTRI_M, "Kawasan industri", bool(sekitar))
    jarak_arteri = akses.get("jarak_jalan_utama_m")
    dummy_dekat("X17b", "dekat_polusi_suara", jarak_arteri, BATAS_BISING_M, "Jalan arteri/kolektor", bool(akses))
    dummy_dekat("X18", "dekat_sutet", s.get("sutet_m"), BATAS_SUTET_M, "Jaringan SUTET/SUTT", bool(sekitar))
    dummy_dekat("X19", "dekat_kuburan", s.get("kuburan_m"), BATAS_KUBURAN_M, "Kuburan/setra", bool(sekitar))

    citra = spek.get("citra_lokasi")
    p.dummy_kategori({"kurang": "X20a", "baik_sekali": "X20b"}, citra, "isian" if citra else "asumsi",
                     {"baik_sekali": "Baik sekali (kawasan bergengsi)", "biasa": "Biasa", "kurang": "Kurang baik"}.get(citra, "Belum diisi, dianggap biasa"))

    kawasan_isian = spek.get("kawasan")
    if kawasan_isian is not None:
        kawasan = set(kawasan_isian)
        sumber_kawasan = {k: "isian" for k in ("pusat_kota", "kdb30", "perdagangan_jasa", "pariwisata")}
        teks_kawasan = {k: ("Ya" if k in kawasan else "Tidak") + ", menurut pengguna" for k in sumber_kawasan}
    else:
        kawasan, sumber_kawasan, teks_kawasan = set(), {}, {}
        lat, lng = properti.get("lat"), properti.get("lng")
        if lat is not None and dalam_denpasar(properti):
            jarak_pusat, nama_pusat = min((jarak_haversine_m(lat, lng, *titik), nama) for nama, titik in PUSAT_DENPASAR)
            if jarak_pusat <= RADIUS_PUSAT_KOTA_M:
                kawasan.add("pusat_kota")
            sumber_kawasan["pusat_kota"] = "otomatis"
            teks_kawasan["pusat_kota"] = f"{_teks_jarak(jarak_pusat)} dari {nama_pusat} (pusat kota bila ≤ 2,5 km)"
        else:
            sumber_kawasan["pusat_kota"] = "asumsi"
            teks_kawasan["pusat_kota"] = "Hanya dideteksi otomatis untuk Kota Denpasar"
        karakter = lok.get("karakter_kawasan")
        if karakter:
            if karakter == "Koridor komersial":
                kawasan.add("perdagangan_jasa")
            sumber_kawasan["perdagangan_jasa"] = "otomatis"
            teks_kawasan["perdagangan_jasa"] = f"Karakter kawasan: {karakter.lower()}"
        else:
            sumber_kawasan["perdagangan_jasa"] = "asumsi"
            teks_kawasan["perdagangan_jasa"] = "Belum diketahui"
        if sekitar is not None:
            jumlah = s.get("akomodasi_500m", 0)
            if jumlah >= 3:
                kawasan.add("pariwisata")
            sumber_kawasan["pariwisata"] = "otomatis"
            teks_kawasan["pariwisata"] = f"{jumlah} hotel/vila/guest house dalam 500 m (pariwisata bila ≥ 3)"
        else:
            sumber_kawasan["pariwisata"] = "asumsi"
            teks_kawasan["pariwisata"] = "Belum diketahui"
        sumber_kawasan["kdb30"] = "asumsi"
        teks_kawasan["kdb30"] = "Cek RDTR/KRK: belum diisi"
    for kode, kunci in (("X21a", "pusat_kota"), ("X21b", "kdb30"), ("X22", "perdagangan_jasa"), ("X23", "pariwisata")):
        p.set(kode, 1 if kunci in kawasan else 0, sumber_kawasan[kunci], teks_kawasan[kunci])

    # --- Karakteristik bangunan ---
    p.set("X24", properti.get("luas_bangunan") or 0, "properti" if properti.get("luas_bangunan") else "asumsi",
          f"{properti['luas_bangunan']:g} m²" if properti.get("luas_bangunan") else "Luas bangunan belum diisi")
    tahun = properti.get("tahun_bangun")
    usia = max(0, date.today().year - tahun) if tahun else 0
    p.set("X25", usia, "properti" if tahun else "asumsi", f"{usia} tahun (dibangun {tahun})" if tahun else "Tahun bangun belum diisi")

    skor = (bangunan or {}).get("skor_kondisi")
    kondisi = _kondisi_dari_skor(skor)
    if kondisi:
        teks = f"Skor kondisi AI {skor:.0f}/100 → {'baik' if kondisi == 'baik' else 'kurang baik' if kondisi == 'kurang' else 'sedang'}"
        p.dummy_kategori({"kurang": "X26a", "baik": "X26b"}, kondisi, "otomatis", teks)
    else:
        dari_penjual = {"siap_huni": "baik", "renovasi_berat": "kurang", "renovasi_ringan": "sedang"}.get(spek.get("kondisi_penjual"))
        p.dummy_kategori({"kurang": "X26a", "baik": "X26b"}, dari_penjual, "isian" if dari_penjual else "asumsi",
                         f"Menurut penjual: {dari_penjual}" if dari_penjual else "Belum dianalisis, dianggap sedang")

    struktur = spek.get("struktur_bangunan")
    if struktur:
        p.dummy_kategori({"permanen": "X27a", "bertingkat": "X27b"}, struktur, "isian",
                         {"permanen": "Permanen 1 lantai", "bertingkat": "Bertingkat", "semi_permanen": "Semi permanen"}[struktur])
    else:
        lantai = properti.get("jumlah_lantai") or 1
        p.dummy_kategori({"permanen": "X27a", "bertingkat": "X27b"}, "bertingkat" if lantai >= 2 else "permanen", "properti",
                         f"{lantai} lantai, dianggap struktur {'bertingkat' if lantai >= 2 else 'permanen'}")
    tren = spek.get("tampilan_tren")
    p.set("X28", 1 if tren else 0, "isian" if tren is not None else "asumsi", "Ya" if tren else ("Tidak" if tren is False else "Belum diisi"))
    bahan = spek.get("kelas_bahan")
    p.dummy_kategori({"kelas_2": "X29a", "kelas_1": "X29b"}, bahan, "isian" if bahan else "asumsi",
                     {"kelas_1": "Kelas I (premium)", "kelas_2": "Kelas II (menengah)", "biasa": "Standar/sederhana"}.get(bahan, "Belum diisi"))
    imb = spek.get("legalitas_bangunan")
    p.set("X30", 1 if imb == "ada" else 0, "isian" if imb else "asumsi",
          {"ada": "Ada IMB/PBG", "tidak": "Tidak ada"}.get(imb, "Belum diisi"))
    return p.nilai


def hitung_penilaian(properti, data_lokasi, bangunan):
    variabel = kumpulkan_variabel(properti, data_lokasi, bangunan)
    faktor_hasil = []
    for f in FAKTOR:
        nilai, sumber, teks = variabel[f["kode"]]
        kontribusi = round(f["b"] * nilai)
        faktor_hasil.append({
            **f,
            "nilai": nilai,
            "aktif": nilai != 0,
            "kontribusi": kontribusi,
            "sumber": sumber,
            "label_sumber": LABEL_SUMBER[sumber],
            "keterangan": teks,
        })
    nilai_model = KONSTANTA + sum(f["kontribusi"] for f in faktor_hasil)

    for f in faktor_hasil:
        f["persen"] = round(100 * f["kontribusi"] / nilai_model, 1) if nilai_model > 0 else 0.0

    kelompok = []
    for urutan, k in enumerate(KELOMPOK, start=1):
        anggota = [f for f in faktor_hasil if f["kelompok"] == k["kode"]]
        # Tampilkan satu baris per faktor asal (gabungan dummy) agar mudah dibaca.
        kelompok.append({
            **k,
            "peringkat": urutan,
            "bobot_relatif": round(k["eigen"] / sum(x["eigen"] for x in KELOMPOK) * 100, 1),
            "kontribusi": sum(f["kontribusi"] for f in anggota),
            "faktor": anggota,
        })

    positif = sorted((f for f in faktor_hasil if f["aktif"] and f["kontribusi"] > 0), key=lambda f: -f["kontribusi"])
    negatif = sorted((f for f in faktor_hasil if f["aktif"] and f["kontribusi"] < 0), key=lambda f: f["kontribusi"])

    def _status(kode_list):
        ada = [variabel[k] for k in kode_list]
        if all(v[1] == "asumsi" for v in ada):
            return "belum_diketahui"
        aktif = any(v[0] for v in ada)
        return "ya" if aktif else "tidak"

    sorotan = [
        {"kelompok": "Lokasi", "arah": "positif", "faktor": "Kawasan permukiman pusat kota", "beta": 0.163, "status": _status(["X21a"]), "keterangan": variabel["X21a"][2]},
        {"kelompok": "Lokasi", "arah": "negatif", "faktor": "Dekat jaringan SUTET", "beta": -0.027, "status": _status(["X18"]), "keterangan": variabel["X18"][2]},
        {"kelompok": "Lingkungan", "arah": "positif", "faktor": "Lebar jalan depan tanah", "beta": 0.086, "status": "ya" if variabel["X10"][0] >= 6 else ("belum_diketahui" if variabel["X10"][1] == "asumsi" else "tidak"),
         "keterangan": variabel["X10"][2] + " (tiap +1 m menambah ±Rp19,7 jt pada nilai model)"},
        {"kelompok": "Lingkungan", "arah": "negatif", "faktor": "Lingkungan sekitar / jalan kurang baik", "beta": -0.012, "status": _status(["X8a", "X11a"]),
         "keterangan": f"Lingkungan: {variabel['X8a'][2].lower()} · Jalan: {variabel['X11a'][2].lower()}"},
        {"kelompok": "Karakteristik bangunan", "arah": "positif", "faktor": "Luas bangunan", "beta": 0.342, "status": "ya" if variabel["X24"][0] else "belum_diketahui",
         "keterangan": variabel["X24"][2] + " (tiap m² ±Rp1,65 jt pada nilai model)"},
        {"kelompok": "Karakteristik bangunan", "arah": "negatif", "faktor": "Kondisi fisik bangunan kurang baik", "beta": -0.087, "status": _status(["X26a"]), "keterangan": variabel["X26a"][2]},
        {"kelompok": "Karakteristik tanah", "arah": "positif", "faktor": "Luas tanah", "beta": 0.388, "status": "ya" if variabel["X1"][0] else "belum_diketahui",
         "keterangan": variabel["X1"][2] + " (tiap m² ±Rp2,24 jt pada nilai model)"},
        {"kelompok": "Karakteristik tanah", "arah": "negatif", "faktor": "Posisi tanah tusuk sate", "beta": -0.031, "status": _status(["X3a"]), "keterangan": variabel["X3a"][2]},
    ]

    # Kelengkapan dihitung per faktor asal (bukan per dummy) agar mudah dipahami pengguna.
    faktor_asal = {}
    for f in faktor_hasil:
        induk = f["kode"] if f["kode"] in NAMA_FAKTOR_ASAL else re.sub(r"[abc]$", "", f["kode"])
        if induk not in faktor_asal or f["sumber"] != "asumsi":
            faktor_asal[induk] = f["sumber"]
    terisi = sum(1 for s in faktor_asal.values() if s != "asumsi")
    yang_belum = [NAMA_FAKTOR_ASAL.get(k, FAKTOR_PER_KODE.get(k, {}).get("label", k)) for k, s in faktor_asal.items() if s == "asumsi"]

    berlaku = dalam_denpasar(properti)
    return {
        "sumber": SUMBER_PENELITIAN,
        "berlaku": berlaku,
        "cakupan": ("Properti berada di Kota Denpasar, sesuai wilayah data penelitian." if berlaku else
                    "Properti di luar Kota Denpasar. Arah pengaruh faktor tetap relevan, tetapi angka rupiah model "
                    "dibangun dari data Denpasar sehingga hanya dipakai sebagai acuan."),
        "kelompok": kelompok,
        "sorotan": sorotan,
        "positif": [{"kode": f["kode"], "label": f["label"], "kontribusi": f["kontribusi"], "persen": f["persen"]} for f in positif[:6]],
        "negatif": [{"kode": f["kode"], "label": f["label"], "kontribusi": f["kontribusi"], "persen": f["persen"]} for f in negatif],
        "konstanta": KONSTANTA,
        "nilai_model_2013": nilai_model,
        "rentang_model_2013": [round(nilai_model * (1 - SELISIH_VALIDASI)), round(nilai_model * (1 + SELISIH_VALIDASI))],
        "kelengkapan": {"terisi": terisi, "total": len(faktor_asal), "belum": yang_belum},
        "asumsi": [
            "Nilai model dalam rupiah tahun 2013 (periode data penelitian). Jangan dibandingkan langsung dengan harga "
            "penawaran hari ini; pakai untuk melihat faktor mana yang menaikkan atau menurunkan nilai.",
            "Batas jarak dekat ≤ 1 km dan sedang 1–3 km untuk sarana pendidikan, kesehatan, belanja, dan rekreasi "
            "ditetapkan HomeWise karena makalah tidak mencantumkan batasnya.",
            f"SUTET/SUTT dan kuburan dianggap dekat bila ≤ {BATAS_SUTET_M} m, kawasan industri (polusi udara) ≤ "
            f"{BATAS_INDUSTRI_M} m, jalan arteri (bising) ≤ {BATAS_BISING_M} m. Data dari OpenStreetMap.",
            "Faktor yang belum diisi dianggap tidak ada (nilai 0) sesuai cara variabel dummy dalam regresi.",
            "Faktor lebar muka tanah, jarak ke transportasi umum, dan jumlah kamar tidur tidak dipakai karena "
            "tereduksi pada analisis faktor penelitian.",
        ],
    }
