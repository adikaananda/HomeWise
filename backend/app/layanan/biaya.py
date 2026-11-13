import json
import math

from flask import current_app

from .. import db
from .konstanta import ASUMSI_TRANSAKSI, JENIS_KERUSAKAN, PRIORITAS, URUTAN_PRIORITAS, tentukan_prioritas

VERSI_RINCIAN = 2

PEKERJAAN = {
    "retak_dinding": {
        "ringan": [("acian_dinding", 1.0), ("cat_dinding", 1.2)],
        "sedang": [("bobok_plester", 1.0), ("acian_dinding", 1.0), ("cat_dinding", 1.5)],
        "berat": [("perkuatan_struktur", 0.5), ("bobok_plester", 1.2), ("acian_dinding", 1.2), ("cat_dinding", 1.5)],
    },
    "cat_mengelupas": {
        "ringan": [("kerok_cat", 1.0), ("cat_dinding", 1.0)],
        "sedang": [("kerok_cat", 1.0), ("acian_dinding", 0.4), ("cat_dinding", 1.0)],
        "berat": [("kerok_cat", 1.0), ("acian_dinding", 1.0), ("cat_dinding", 1.0)],
    },
    "noda_lembap": {
        "ringan": [("waterproofing", 1.0), ("cat_dinding", 1.0)],
        "sedang": [("waterproofing", 1.2), ("bobok_plester", 0.6), ("cat_dinding", 1.2)],
        "berat": [("waterproofing", 1.5), ("bobok_plester", 1.0), ("acian_dinding", 1.0), ("cat_dinding", 1.5)],
    },
    "kerusakan_plafon": {
        "ringan": [("perbaikan_plafon", 0.5), ("cat_plafon", 1.0)],
        "sedang": [("plafon_gypsum", 1.0), ("cat_plafon", 1.0)],
        "berat": [("plafon_gypsum", 1.2), ("rangka_plafon", 1.2), ("cat_plafon", 1.2)],
    },
    "keramik_rusak": {
        "ringan": [("pasang_keramik", 1.0)],
        "sedang": [("bongkar_keramik", 1.0), ("pasang_keramik", 1.1)],
        "berat": [("bongkar_keramik", 1.2), ("screed_lantai", 1.2), ("pasang_keramik", 1.2)],
    },
    "atap_bocor": {
        "ringan": [("perbaikan_atap", 0.6), ("waterproofing", 0.5)],
        "sedang": [("perbaikan_atap", 1.0), ("waterproofing", 1.0)],
        "berat": [("ganti_penutup_atap", 1.5), ("waterproofing", 1.0)],
    },
}


def _referensi():
    baris = db.banyak("SELECT * FROM harga_referensi WHERE aktif = 1")
    for b in baris:
        b["material"] = json.loads(b.get("material") or "[]")
    return {b["kode"]: b for b in baris}


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


def hitung_renovasi(temuan):
    referensi = _referensi()
    indeks = current_app.config["INDEKS_HARGA_WILAYAH"]
    tarif_kontingensi = ASUMSI_TRANSAKSI["tarif_kontingensi"]
    gabungan = {}
    catatan = []

    for t in temuan:
        if t.get("status") == "ditolak":
            continue
        prioritas = tentukan_prioritas(t["jenis"], t["tingkat"])
        for kode, faktor in PEKERJAAN.get(t["jenis"], {}).get(t["tingkat"], []):
            ref = referensi.get(kode)
            if not ref:
                pesan = f"Harga referensi '{kode}' tidak aktif sehingga tidak dihitung."
                if pesan not in catatan:
                    catatan.append(pesan)
                continue
            volume = round(t["luas_m2"] * faktor, 2)
            item = gabungan.setdefault((kode, prioritas), {
                "kode": kode,
                "pekerjaan": ref["nama"],
                "kategori": ref["kategori"],
                "satuan": ref["satuan"],
                "prioritas": prioritas,
                "volume": 0.0,
                "harga_satuan": round((ref["harga_material"] + ref["harga_upah"]) * indeks),
                "material": 0,
                "upah": 0,
                "sumber_temuan": [],
            })
            item["volume"] = round(item["volume"] + volume, 2)
            item["material"] += round(ref["harga_material"] * volume * indeks)
            item["upah"] += round(ref["harga_upah"] * volume * indeks)
            label = JENIS_KERUSAKAN[t["jenis"]]
            if label not in item["sumber_temuan"]:
                item["sumber_temuan"].append(label)

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
        "rentang_min": round(total * 0.85),
        "rentang_maks": round(total * 1.2),
        "asumsi": {
            "indeks_harga_wilayah": indeks,
            "tarif_kontingensi": tarif_kontingensi,
            "catatan": catatan,
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
