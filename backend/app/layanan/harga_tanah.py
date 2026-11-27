"""Peta Harga Tanah: harga tanah per m² per kawasan beserta trennya.

Sumber data, berurutan menurut prioritas:
1. API penyedia data (HARGA_TANAH_API_URL), misalnya mitra data portal properti atau
   layanan Zona Nilai Tanah ATR/BPN bila kerja sama sudah ada. Hasilnya disimpan ke
   database sebagai riwayat, sehingga tren terbentuk dari waktu ke waktu.
2. Data yang dicatat admin lewat /api/admin/harga-tanah.
3. Data awal (DATA_AWAL) hasil rekap harga penawaran listing publik, Nov 2026.

Setiap angka selalu dikirim bersama jenis datanya (penawaran/transaksi/znt), jumlah
sampel, periode, dan sumber, agar pengguna tahu seberapa kuat dasar angkanya.
"""
import logging
import statistics
import time

import requests
from flask import current_app

from .. import db

log = logging.getLogger(__name__)

JENIS_DATA = {
    "penawaran": "Harga penawaran listing",
    "transaksi": "Harga transaksi",
    "znt": "Zona Nilai Tanah ATR/BPN",
}

# Batas kategori harga per m² (rupiah).
BATAS_PREMIUM = 12_000_000
BATAS_MENENGAH = 7_000_000

WILAYAH_AWAL = [
    # kode, nama, kecamatan, kabupaten, lat, lng, radius_m
    ("renon", "Renon", "Denpasar Selatan", "Denpasar", -8.6745, 115.2357, 1200),
    ("sanur", "Sanur", "Denpasar Selatan", "Denpasar", -8.6868, 115.2610, 1400),
    ("panjer", "Panjer", "Denpasar Selatan", "Denpasar", -8.6810, 115.2240, 900),
    ("sesetan", "Sesetan", "Denpasar Selatan", "Denpasar", -8.7040, 115.2160, 1100),
    ("kerobokan", "Kerobokan", "Kuta Utara", "Badung", -8.6650, 115.1700, 1500),
    ("seminyak", "Seminyak", "Kuta", "Badung", -8.6913, 115.1682, 1000),
    ("canggu", "Canggu", "Kuta Utara", "Badung", -8.6478, 115.1385, 1700),
    ("jimbaran", "Jimbaran", "Kuta Selatan", "Badung", -8.7907, 115.1600, 1800),
]

SUMBER_AWAL = "Rekap harga penawaran listing 99.co, Rumah123, Brighton & Dot Property (Nov 2026)"

# Harga penawaran per m² (juta rupiah) dari listing publik yang direkap per kawasan.
# Ini harga yang diminta penjual, bukan harga transaksi.
SAMPEL_AWAL = {
    "renon": [11, 11.3, 12, 13, 14.5, 14.6, 15, 15, 16.1, 17],
    "sanur": [8.5, 12, 12, 13, 15, 16],
    "panjer": [6, 8],
    "sesetan": [5.66, 7],
    "kerobokan": [4.5, 11, 16, 20],
    "seminyak": [7.36, 15, 20],
    "canggu": [5.55, 13.5, 15.5, 27.7],
    "jimbaran": [3, 4.5, 4.75, 6, 6.5, 6.5, 7.75, 8, 8, 8.33, 12],
}
PERIODE_AWAL = "2026-11"

# Halaman listing tempat sampel tiap kawasan diambil, agar pengguna bisa memeriksa sendiri.
URL_AWAL = {
    "renon": "https://www.99.co/id/jual/tanah/area-denpasar/renon",
    "sanur": "https://www.99.co/id/jual/tanah/area-denpasar/sanur",
    "panjer": "https://www.99.co/id/jual/tanah/area-denpasar/panjer",
    "sesetan": "https://www.99.co/id/jual/tanah/area-denpasar/sesetan",
    "kerobokan": "https://www.rumah123.com/en/sale/badung/kerobokan/land/",
    "seminyak": "https://www.rumah123.com/jual/badung/seminyak/tanah/",
    "canggu": "https://www.99.co/id/jual/tanah/area-badung/canggu",
    "jimbaran": "https://www.99.co/id/jual/tanah/area-badung/jimbaran",
}

METODOLOGI = [
    "Sumber: harga penawaran tanah kosong di listing publik 99.co, Rumah123, Brighton, dan Dot Property, diambil November 2026.",
    "Harga yang ditulis per are dikonversi ke per m² (1 are = 100 m²). Listing tanah plus bangunan dan listing sewa tidak dipakai.",
    "Angka utama adalah median (nilai tengah), sehingga satu listing yang sangat mahal atau murah tidak menggeser hasil terlalu jauh.",
    "Rentang menunjukkan harga penawaran terendah dan tertinggi di sampel. Keyakinan: tinggi ≥ 8 sampel, sedang 4–7, rendah < 4.",
    "Harga penawaran biasanya lebih tinggi dari harga transaksi akhir karena masih bisa dinegosiasikan.",
]

INDEKS_KOTA_AWAL = [
    # kota, periode, perubahan_yoy (%), jenis, sumber, url
    ("Denpasar", "2026-07", 6.3, "Harga rumah sekunder",
     "Rumah123 Flash Report Agustus 2026",
     "https://www.industry.co.id/read/154897/harga-rumah-sekunder-kalah-dari-inflasi-minat-pembeli-mulai-geser-ke-pusat-kota"),
]

_cache = {"waktu": 0.0}


def kategori_harga(median):
    if median >= BATAS_PREMIUM:
        return "premium"
    if median >= BATAS_MENENGAH:
        return "menengah"
    return "terjangkau"


def keyakinan(jumlah_sampel, jenis_data):
    if jenis_data in ("transaksi", "znt"):
        return "tinggi"
    if jumlah_sampel >= 8:
        return "tinggi"
    if jumlah_sampel >= 4:
        return "sedang"
    return "rendah"


def pastikan_data_awal():
    """Isi data awal sekali saja, bila tabel wilayah masih kosong."""
    koneksi = db.ambil_koneksi()
    if db.nilai("SELECT COUNT(*) FROM wilayah_harga_tanah"):
        # Lengkapi tautan sumber untuk data awal yang tersimpan sebelum tautan ditambahkan.
        for kode, url in URL_AWAL.items():
            koneksi.execute(
                "UPDATE harga_tanah SET url_sumber = ? WHERE wilayah_kode = ? AND periode = ? AND sumber = ? AND url_sumber IS NULL",
                (url, kode, PERIODE_AWAL, SUMBER_AWAL),
            )
        koneksi.commit()
        return
    for kode, nama, kecamatan, kabupaten, lat, lng, radius in WILAYAH_AWAL:
        koneksi.execute(
            """INSERT OR IGNORE INTO wilayah_harga_tanah (kode, nama, kecamatan, kabupaten, lat, lng, radius_m)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (kode, nama, kecamatan, kabupaten, lat, lng, radius),
        )
        sampel = [int(round(x * 1_000_000)) for x in SAMPEL_AWAL[kode]]
        koneksi.execute(
            """INSERT OR IGNORE INTO harga_tanah
               (wilayah_kode, periode, harga_min, harga_median, harga_maks, jumlah_sampel, jenis_data, sumber, url_sumber)
               VALUES (?, ?, ?, ?, ?, ?, 'penawaran', ?, ?)""",
            (kode, PERIODE_AWAL, min(sampel), int(statistics.median(sampel)), max(sampel), len(sampel), SUMBER_AWAL, URL_AWAL.get(kode)),
        )
    for kota, periode, yoy, jenis, sumber, url in INDEKS_KOTA_AWAL:
        koneksi.execute(
            """INSERT OR IGNORE INTO indeks_pasar_kota (kota, periode, perubahan_yoy, jenis, sumber, url_sumber)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (kota, periode, yoy, jenis, sumber, url),
        )
    koneksi.commit()


def simpan_snapshot(data):
    """Simpan atau perbarui satu catatan harga (dipakai admin dan sinkronisasi API)."""
    data = {
        "kode": str(data["kode"]).strip().lower(),
        "nama": data["nama"],
        "kecamatan": data.get("kecamatan"),
        "kabupaten": data["kabupaten"],
        "lat": float(data["lat"]),
        "lng": float(data["lng"]),
        "radius_m": int(data.get("radius_m") or 1200),
        "periode": data["periode"],
        "harga_min": int(data["harga_min"]),
        "harga_median": int(data["harga_median"]),
        "harga_maks": int(data["harga_maks"]),
        "jumlah_sampel": int(data.get("jumlah_sampel") or 0),
        "jenis_data": data["jenis_data"],
        "sumber": data["sumber"],
        "url_sumber": data.get("url_sumber"),
    }
    koneksi = db.ambil_koneksi()
    koneksi.execute(
        """INSERT INTO wilayah_harga_tanah (kode, nama, kecamatan, kabupaten, lat, lng, radius_m)
           VALUES (:kode, :nama, :kecamatan, :kabupaten, :lat, :lng, :radius_m)
           ON CONFLICT(kode) DO UPDATE SET nama = excluded.nama, kecamatan = excluded.kecamatan,
               kabupaten = excluded.kabupaten, lat = excluded.lat, lng = excluded.lng, radius_m = excluded.radius_m""",
        data,
    )
    koneksi.execute(
        """INSERT INTO harga_tanah (wilayah_kode, periode, harga_min, harga_median, harga_maks,
               jumlah_sampel, jenis_data, sumber, url_sumber)
           VALUES (:kode, :periode, :harga_min, :harga_median, :harga_maks, :jumlah_sampel, :jenis_data, :sumber, :url_sumber)
           ON CONFLICT(wilayah_kode, periode, jenis_data) DO UPDATE SET
               harga_min = excluded.harga_min, harga_median = excluded.harga_median, harga_maks = excluded.harga_maks,
               jumlah_sampel = excluded.jumlah_sampel, sumber = excluded.sumber, url_sumber = excluded.url_sumber,
               dibuat = datetime('now')""",
        data,
    )
    koneksi.commit()


def sinkron_dari_api():
    """Tarik data dari API penyedia bila dikonfigurasi. Gagal = tetap pakai data tersimpan."""
    url = current_app.config.get("HARGA_TANAH_API_URL")
    if not url:
        return "tersimpan"
    masa_cache = current_app.config.get("HARGA_TANAH_CACHE_JAM", 6) * 3600
    if time.time() - _cache["waktu"] < masa_cache:
        return "api"
    header = {"User-Agent": "HomeWise/1.0 (Peta Harga Tanah)"}
    kunci = current_app.config.get("HARGA_TANAH_API_KEY")
    if kunci:
        header["Authorization"] = f"Bearer {kunci}"
    try:
        respon = requests.get(url, headers=header, timeout=15)
        respon.raise_for_status()
        daftar = respon.json().get("wilayah", [])
        for item in daftar:
            if item.get("jenis_data") not in JENIS_DATA:
                continue
            try:
                simpan_snapshot(item)
            except (KeyError, TypeError, ValueError) as galat:
                log.warning("Baris harga tanah dari API dilewati: %s", galat)
        _cache["waktu"] = time.time()
        return "api"
    except Exception as galat:  # jaringan/format: jangan ganggu pengguna
        log.warning("Sinkronisasi API harga tanah gagal, memakai data tersimpan: %s", galat)
        return "tersimpan"


def _tambah_bulan(periode, bulan):
    tahun, bln = map(int, periode.split("-"))
    total = tahun * 12 + (bln - 1) + bulan
    return f"{total // 12:04d}-{total % 12 + 1:02d}"


def ambil_peta(kabupaten=None):
    pastikan_data_awal()
    mode = sinkron_dari_api()

    parameter = ()
    filter_kab = ""
    if kabupaten:
        filter_kab = "WHERE w.kabupaten = ?"
        parameter = (kabupaten,)
    wilayah = db.banyak(f"SELECT * FROM wilayah_harga_tanah w {filter_kab} ORDER BY w.kabupaten, w.nama", parameter)

    hasil = []
    for w in wilayah:
        riwayat = db.banyak(
            """SELECT periode, harga_min, harga_median, harga_maks, jumlah_sampel, jenis_data, sumber, url_sumber
               FROM harga_tanah WHERE wilayah_kode = ? ORDER BY periode""",
            (w["kode"],),
        )
        if not riwayat:
            continue
        terbaru = riwayat[-1]
        # Tren dihitung hanya dari data berjenis sama, agar tidak membandingkan penawaran dengan ZNT.
        sejenis = [r for r in riwayat if r["jenis_data"] == terbaru["jenis_data"]]
        target = _tambah_bulan(terbaru["periode"], -12)
        pembanding = next((r for r in reversed(sejenis) if r["periode"] <= target), None)
        perubahan_yoy = None
        if pembanding and pembanding["harga_median"]:
            perubahan_yoy = round((terbaru["harga_median"] / pembanding["harga_median"] - 1) * 100, 1)

        hasil.append({
            "kode": w["kode"],
            "nama": w["nama"],
            "kecamatan": w["kecamatan"],
            "kabupaten": w["kabupaten"],
            "lat": w["lat"],
            "lng": w["lng"],
            "radius_m": w["radius_m"],
            "periode": terbaru["periode"],
            "harga_min": terbaru["harga_min"],
            "harga_median": terbaru["harga_median"],
            "harga_maks": terbaru["harga_maks"],
            "harga_per_are": terbaru["harga_median"] * 100,
            "jumlah_sampel": terbaru["jumlah_sampel"],
            "jenis_data": terbaru["jenis_data"],
            "label_jenis_data": JENIS_DATA[terbaru["jenis_data"]],
            "sumber": terbaru["sumber"],
            "url_sumber": terbaru["url_sumber"],
            "kategori": kategori_harga(terbaru["harga_median"]),
            "keyakinan": keyakinan(terbaru["jumlah_sampel"], terbaru["jenis_data"]),
            "perubahan_yoy": perubahan_yoy,
            "riwayat": [{"periode": r["periode"], "harga_median": r["harga_median"]} for r in sejenis],
        })

    indeks_kota = db.banyak(
        """SELECT kota, periode, perubahan_yoy, jenis, sumber, url_sumber FROM indeks_pasar_kota i
           WHERE periode = (SELECT MAX(periode) FROM indeks_pasar_kota WHERE kota = i.kota) ORDER BY kota"""
    )

    ringkasan = {}
    for kab in sorted({h["kabupaten"] for h in hasil}):
        median = [h["harga_median"] for h in hasil if h["kabupaten"] == kab]
        ringkasan[kab] = {"median": int(statistics.median(median)), "jumlah_kawasan": len(median)}

    return {
        "wilayah": hasil,
        "ringkasan": ringkasan,
        "indeks_kota": indeks_kota,
        "batas_kategori": {"premium": BATAS_PREMIUM, "menengah": BATAS_MENENGAH},
        "mode": mode,
        "metodologi": METODOLOGI,
        "catatan": "Harga penawaran adalah harga yang diminta penjual di listing, bukan harga transaksi. "
                   "Gunakan sebagai gambaran pasar, lalu cek properti spesifik dengan HomeWise.",
    }
