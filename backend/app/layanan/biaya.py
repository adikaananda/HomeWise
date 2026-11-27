import json
import math

from flask import current_app

from .. import db
from . import ikk_bps
from .konstanta import (
    AREA_FOTO,
    ASUMSI_TRANSAKSI,
    JENIS_KERUSAKAN,
    LEBAR_JALUR_RETAK,
    LUAS_BIDANG_FOTO,
    PRIORITAS,
    URUTAN_PRIORITAS,
    tentukan_prioritas,
)

VERSI_RINCIAN = 4

# Faktor volume terhadap luas dasar kerusakan. Nilai > 1 hanya untuk tepi kerja yang memang ikut dikerjakan
# (misalnya cat dilebihkan 10–15% agar sambungan warna tidak terlihat), bukan pengali keamanan.
#
# Masukan pakar: "Bongkar plester ulang" dan "plester tipis/acian" tidak lagi muncul bersamaan untuk temuan
# yang sama. Paket bobok_plester sudah mencakup acian; acian_dinding hanya dipakai bila plester tidak dibongkar.
PEKERJAAN = {
    "retak_dinding": {
        "ringan": [("acian_dinding", 1.0), ("cat_dinding", 1.15)],
        "sedang": [("bobok_plester", 1.0), ("cat_dinding", 1.15)],
        "berat": [("perkuatan_struktur", 1.0), ("bobok_plester", 1.0), ("cat_dinding", 1.15)],
    },
    "cat_mengelupas": {
        "ringan": [("kerok_cat", 1.0), ("cat_dinding", 1.1)],
        "sedang": [("kerok_cat", 1.0), ("acian_dinding", 1.0), ("cat_dinding", 1.1)],
        "berat": [("bobok_plester", 1.0), ("cat_dinding", 1.1)],
    },
    "noda_lembap": {
        "ringan": [("waterproofing", 1.1), ("cat_dinding", 1.1)],
        "sedang": [("waterproofing", 1.1), ("acian_dinding", 1.0), ("cat_dinding", 1.1)],
        "berat": [("bobok_plester", 1.0), ("waterproofing", 1.1), ("cat_dinding", 1.1)],
    },
    "kerusakan_plafon": {
        "ringan": [("perbaikan_plafon", 0.5), ("cat_plafon", 1.1)],
        "sedang": [("plafon_gypsum", 1.0), ("cat_plafon", 1.1)],
        "berat": [("plafon_gypsum", 1.0), ("rangka_plafon", 1.0), ("cat_plafon", 1.1)],
    },
    "keramik_rusak": {
        "ringan": [("pasang_keramik", 1.0)],
        "sedang": [("bongkar_keramik", 1.0), ("pasang_keramik", 1.0)],
        "berat": [("bongkar_keramik", 1.0), ("screed_lantai", 1.0), ("pasang_keramik", 1.0)],
    },
    "atap_bocor": {
        "ringan": [("perbaikan_atap", 0.6), ("waterproofing", 0.5)],
        "sedang": [("perbaikan_atap", 1.0), ("waterproofing", 1.0)],
        "berat": [("ganti_penutup_atap", 1.15), ("waterproofing", 1.0)],
    },
}

# Pekerjaan yang sudah tercakup bila pekerjaan lain dikerjakan di bidang (foto) yang sama.
TERCAKUP_OLEH = {
    "acian_dinding": "bobok_plester",
    "kerok_cat": "bobok_plester",
}

LEBAR_JALUR_INJEKSI = 0.2
BATAS_LUAS_RETAK_LAMA = 2.0

KETERANGAN_PEKERJAAN = {
    "acian_dinding": "Mengerok permukaan yang rusak lalu melapis ulang dengan acian semen tipis (±3 mm) agar rata dan siap dicat. Plester lama tidak dibongkar.",
    "bobok_plester": "Membongkar plester yang retak atau rapuh sampai ke bata, memasang plester baru 1:4 tebal ±15 mm, lalu diaci. Acian sudah termasuk, jadi tidak dihitung dua kali.",
    "cat_dinding": "Plamir tipis, cat dasar anti-alkali, lalu 2 lapis cat tembok pada area perbaikan plus tepi 10–15% agar warna menyatu. Bila warna lama sulit disamakan, satu bidang dinding perlu dicat penuh (belum termasuk).",
    "cat_plafon": "Cat dasar dan 2 lapis cat plafon pada area perbaikan plus tepi 10%.",
    "kerok_cat": "Mengerok cat lama yang mengelupas atau menggelembung dan mengamplas permukaan sebelum dicat ulang.",
    "waterproofing": "Lapisan kedap air berbasis semen pada area lembap. Sumber rembesan (pipa, talang, tanah) tetap harus diperbaiki lebih dulu.",
    "perkuatan_struktur": "Injeksi epoxy pada retak struktural dan perbaikan dengan mortar khusus, dihitung dari panjang retak × jalur 0,2 m. Wajib dicek ahli struktur sebelum dikerjakan.",
    "perbaikan_plafon": "Menambal lubang atau retak kecil pada plafon gypsum dengan compound dan kertas tape.",
    "plafon_gypsum": "Mengganti panel gypsum yang rusak atau melendut, termasuk sekrup dan finishing sambungan.",
    "rangka_plafon": "Mengganti rangka hollow yang berkarat atau melendut di bawah panel yang diganti.",
    "bongkar_keramik": "Membongkar keramik yang retak atau kopong dan membuang puingnya.",
    "pasang_keramik": "Memasang keramik 60×60 baru dengan semen perekat dan nat. Sisa potongan 5% sudah dihitung di material, bukan di volume.",
    "screed_lantai": "Meratakan ulang lantai dasar (screed) sebelum keramik baru dipasang, bila lantai turun atau retak.",
    "perbaikan_atap": "Mengganti genteng retak atau bergeser dan menyegel talang atau sambungan yang bocor.",
    "ganti_penutup_atap": "Mengganti penutup atap di area bocor berat dengan metal pasir, ditambah 15% untuk tumpang tindih lembaran.",
}

LABEL_AREA = {a["kode"]: a["label"] for a in AREA_FOTO}


def _referensi():
    baris = db.banyak("SELECT * FROM harga_referensi WHERE aktif = 1")
    for b in baris:
        b["material"] = json.loads(b.get("material") or "[]")
    return {b["kode"]: b for b in baris}


def _info_foto(temuan):
    daftar_id = sorted({t["foto_id"] for t in temuan if t.get("foto_id")})
    if not daftar_id:
        return {}
    tanda = ", ".join("?" for _ in daftar_id)
    baris = db.banyak(f"SELECT id, area, ruang FROM foto_bangunan WHERE id IN ({tanda})", tuple(daftar_id))
    return {b["id"]: b for b in baris}


def _angka(n):
    return f"{n:.2f}".rstrip("0").rstrip(".").replace(".", ",")


def _dasar_volume(t):
    """Luas dasar kerusakan (m²) beserta penjelasannya, mengikuti bentuk asli kerusakan."""
    diukur_analis = t.get("status") == "analis" or (t.get("status") == "disesuaikan" and t.get("luas_diukur"))
    if diukur_analis:
        return float(t["luas_m2"]), f"luas diukur analis {_angka(t['luas_m2'])} m²", None
    if t["jenis"] == "retak_dinding" and t.get("panjang_m"):
        lebar = LEBAR_JALUR_RETAK[t["tingkat"]]
        luas = t["panjang_m"] * lebar
        return luas, f"retak {_angka(t['panjang_m'])} m × jalur perbaikan {_angka(lebar)} m", t["panjang_m"]
    luas = float(t["luas_m2"])
    if t["jenis"] == "retak_dinding" and luas > BATAS_LUAS_RETAK_LAMA:
        # Data lama (sebelum ada panjang retak) dihitung dari kotak deteksi dan cenderung berlebih.
        return BATAS_LUAS_RETAK_LAMA, f"retak tanpa data panjang, luas dibatasi {_angka(BATAS_LUAS_RETAK_LAMA)} m²", None
    return luas, f"luas kerusakan terdeteksi {_angka(luas)} m²", None


def _volume_pekerjaan(kode, faktor, luas_dasar, panjang):
    if kode == "perkuatan_struktur":
        if panjang:
            return panjang * LEBAR_JALUR_INJEKSI, f"panjang retak {_angka(panjang)} m × jalur injeksi {_angka(LEBAR_JALUR_INJEKSI)} m"
        return luas_dasar * faktor, None
    if faktor > 1:
        teks = f" × {_angka(faktor)} (termasuk tepi kerja)"
    elif faktor < 1:
        teks = f" × {_angka(faktor)} (hanya bagian yang ditambal)"
    else:
        teks = ""
    return luas_dasar * faktor, teks or None


def _hitung_material(rincian, referensi):
    gabungan = {}
    for item in rincian:
        for m in referensi[item["kode"]]["material"]:
            kunci = (m["nama"], m["satuan"])
            entri = gabungan.setdefault(kunci, {
                "nama": m["nama"],
                "satuan": m["satuan"],
                "jumlah": 0.0,
                "kemasan": m.get("kemasan") or m["satuan"],
                "isi_kemasan": m.get("isi_kemasan") or 1,
                "untuk": [],
            })
            entri["jumlah"] += m["koefisien"] * item["volume"]
            if item["pekerjaan"] not in entri["untuk"]:
                entri["untuk"].append(item["pekerjaan"])

    hasil = []
    for entri in gabungan.values():
        entri["jumlah"] = round(entri["jumlah"], 2)
        entri["jumlah_beli"] = max(1, math.ceil(entri["jumlah"] / entri["isi_kemasan"] - 1e-9))
        hasil.append(entri)
    hasil.sort(key=lambda e: e["nama"])
    return hasil


def _prioritas_lebih_tinggi(a, b):
    return a if URUTAN_PRIORITAS.index(a) <= URUTAN_PRIORITAS.index(b) else b


def hitung_renovasi(temuan, properti=None):
    referensi = _referensi()
    info_ikk = ikk_bps.tentukan_indeks_wilayah(
        alamat=properti.get("alamat") if properti else None,
        lat=properti.get("lat") if properti else None,
        lng=properti.get("lng") if properti else None,
        bawaan=current_app.config["INDEKS_HARGA_WILAYAH"],
    )
    indeks = info_ikk["indeks"]
    tarif_kontingensi = ASUMSI_TRANSAKSI["tarif_kontingensi"]
    info_foto = _info_foto(temuan)
    catatan = []

    # Tahap 1: volume per bidang (foto) per pekerjaan. Temuan yang tumpang tindih di satu foto
    # tidak dijumlahkan melebihi luas bidang foto tersebut.
    per_bidang = {}
    for t in temuan:
        if t.get("status") == "ditolak":
            continue
        prioritas = tentukan_prioritas(t["jenis"], t["tingkat"])
        luas_dasar, dasar_teks, panjang = _dasar_volume(t)
        foto = info_foto.get(t.get("foto_id"))
        area = foto["area"] if foto else "lainnya"
        lokasi = (foto.get("ruang") or LABEL_AREA.get(area, "Area lain")) if foto else "Temuan analis"
        label_temuan = f"{JENIS_KERUSAKAN[t['jenis']]} ({t['tingkat']})"

        for kode, faktor in PEKERJAAN.get(t["jenis"], {}).get(t["tingkat"], []):
            if kode not in referensi:
                pesan = f"Harga referensi '{kode}' tidak aktif sehingga tidak dihitung."
                if pesan not in catatan:
                    catatan.append(pesan)
                continue
            volume, teks_faktor = _volume_pekerjaan(kode, faktor, luas_dasar, panjang)
            kunci = (t.get("foto_id"), id(t) if not t.get("foto_id") else None, kode)
            bucket = per_bidang.setdefault(kunci, {
                "kode": kode, "area": area, "lokasi": lokasi, "volume": 0.0,
                "prioritas": prioritas, "temuan": [], "dasar": [],
            })
            bucket["volume"] += volume
            bucket["prioritas"] = _prioritas_lebih_tinggi(bucket["prioritas"], prioritas)
            if label_temuan not in bucket["temuan"]:
                bucket["temuan"].append(label_temuan)
            bucket["dasar"].append(dasar_teks if kode != "perkuatan_struktur" or not panjang else teks_faktor)
            if teks_faktor and kode != "perkuatan_struktur":
                bucket["dasar"][-1] += teks_faktor

    # Tahap 2: buang pekerjaan yang sudah tercakup paket lain di bidang yang sama, lalu batasi ke luas bidang.
    for (foto_id, unik, kode), bucket in per_bidang.items():
        induk = TERCAKUP_OLEH.get(kode)
        if induk and (foto_id, unik, induk) in per_bidang:
            tercakup = per_bidang[(foto_id, unik, induk)]["volume"]
            sisa = max(0.0, bucket["volume"] - tercakup)
            if sisa < bucket["volume"]:
                bucket["dasar"].append(f"dikurangi {_angka(min(tercakup, bucket['volume']))} m² yang sudah tercakup pekerjaan plester ulang")
            bucket["volume"] = sisa
        batas = LUAS_BIDANG_FOTO.get(bucket["area"], LUAS_BIDANG_FOTO["lainnya"]) if foto_id else None
        if batas and bucket["volume"] > batas:
            bucket["dasar"].append(f"dibatasi luas bidang foto {_angka(batas)} m²")
            bucket["volume"] = batas

    # Tahap 3: gabungkan per jenis pekerjaan dan prioritas.
    gabungan = {}
    for bucket in per_bidang.values():
        if bucket["volume"] <= 0.005:
            continue
        ref = referensi[bucket["kode"]]
        volume = round(bucket["volume"], 2)
        item = gabungan.setdefault((bucket["kode"], bucket["prioritas"]), {
            "kode": bucket["kode"],
            "pekerjaan": ref["nama"],
            "keterangan": KETERANGAN_PEKERJAAN.get(bucket["kode"], ""),
            "kategori": ref["kategori"],
            "satuan": ref["satuan"],
            "prioritas": bucket["prioritas"],
            "volume": 0.0,
            "harga_satuan": round((ref["harga_material"] + ref["harga_upah"]) * indeks),
            "material": 0,
            "upah": 0,
            "sumber_temuan": [],
            "rincian_volume": [],
        })
        item["volume"] = round(item["volume"] + volume, 2)
        item["material"] += round(ref["harga_material"] * volume * indeks)
        item["upah"] += round(ref["harga_upah"] * volume * indeks)
        for label in bucket["temuan"]:
            jenis = label.split(" (")[0]
            if jenis not in item["sumber_temuan"]:
                item["sumber_temuan"].append(jenis)
        item["rincian_volume"].append({
            "lokasi": bucket["lokasi"],
            "temuan": ", ".join(bucket["temuan"]),
            "dasar": "; ".join(dict.fromkeys(bucket["dasar"])),
            "volume": volume,
        })

    rincian = []
    for item in gabungan.values():
        item["jumlah"] = item["material"] + item["upah"]
        rincian.append(item)
    rincian.sort(key=lambda i: (URUTAN_PRIORITAS.index(i["prioritas"]), -i["jumlah"]))

    per_prioritas = []
    for kode in URUTAN_PRIORITAS:
        anggota = [i for i in rincian if i["prioritas"] == kode]
        per_prioritas.append({
            "kode": kode,
            **PRIORITAS[kode],
            "jumlah_pekerjaan": len(anggota),
            "jumlah": round(sum(i["jumlah"] for i in anggota) * (1 + tarif_kontingensi)),
        })

    subtotal = sum(i["jumlah"] for i in rincian)
    kontingensi = round(subtotal * tarif_kontingensi)
    total = subtotal + kontingensi
    return {
        "rincian": rincian,
        "material": _hitung_material(rincian, referensi),
        "per_prioritas": per_prioritas,
        "subtotal": subtotal,
        "kontingensi": kontingensi,
        "total": total,
        "rentang_min": round(total * 0.90),
        "rentang_maks": round(total * 1.2),
        "asumsi": {
            "indeks_harga_wilayah": indeks,
            "provinsi_ikk": info_ikk["provinsi"],
            "ikk": info_ikk["ikk"],
            "sumber_indeks": info_ikk["sumber"],
            "tarif_kontingensi": tarif_kontingensi,
            "catatan": catatan,
            "metode_volume": [
                "Volume mengikuti bentuk asli kerusakan dari hasil segmentasi AI, bukan kotak deteksi.",
                "Retak dihitung dari panjang garis retak × lebar jalur perbaikan (ringan 0,15 m, sedang 0,3 m, berat 0,5 m).",
                "Satu foto dianggap memotret satu bidang dengan luas perkiraan sesuai area survei (misalnya dinding bawah 3 m²); "
                "volume per foto tidak melebihi luas bidang itu, dan kerusakan yang tumpang tindih tidak dihitung dua kali.",
                "Acian dan kerok cat tidak dihitung lagi bila bidang yang sama sudah masuk paket bongkar plester ulang.",
                "Luas yang diukur analis di lapangan selalu dipakai apa adanya.",
            ],
        },
    }


def simpan_estimasi(properti_id, hasil):
    db.simpan_atau_ganti("estimasi_biaya", {
        "properti_id": properti_id,
        "rincian": {
            "versi": VERSI_RINCIAN,
            "item": hasil["rincian"],
            "material": hasil["material"],
            "per_prioritas": hasil["per_prioritas"],
            "asumsi": hasil["asumsi"],
        },
        "subtotal": hasil["subtotal"],
        "kontingensi": hasil["kontingensi"],
        "total": hasil["total"],
        "rentang_min": hasil["rentang_min"],
        "rentang_maks": hasil["rentang_maks"],
        "dibuat": db.sekarang(),
    }, "properti_id")
