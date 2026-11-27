from .. import db
from .konstanta import ASUMSI_TRANSAKSI
from .lokasi_asli import jarak_haversine_m

RADIUS_PEMBANDING_M = 3000

KEGUNAAN_HARGA = [
    "Menghitung total investasi awal: harga penawaran + estimasi renovasi + biaya transaksi (BPHTB, notaris, administrasi).",
    "Membandingkan dengan harga tanah pasar di kawasan sekitar (Peta Harga Tanah) untuk melihat apakah harga wajar.",
    "Dasar simulasi cicilan KPR BTN: besar uang muka dan plafon pinjaman dihitung dari harga ini.",
    "Dasar negosiasi: rasio biaya renovasi terhadap harga menunjukkan ruang tawar.",
]


def pembanding_pasar(properti):
    """Bandingkan harga penawaran dengan median harga tanah kawasan terdekat dari Peta Harga Tanah."""
    harga = int(properti.get("harga_penawaran") or 0)
    if not harga or properti.get("lat") is None:
        return None
    try:
        from . import harga_tanah
        harga_tanah.pastikan_data_awal()
        kandidat = db.banyak(
            """SELECT w.kode, w.nama, w.kabupaten, w.lat, w.lng, h.harga_median, h.harga_min, h.harga_maks,
                      h.periode, h.jenis_data, h.jumlah_sampel
               FROM wilayah_harga_tanah w JOIN harga_tanah h ON h.wilayah_kode = w.kode
               WHERE h.periode = (SELECT MAX(periode) FROM harga_tanah WHERE wilayah_kode = w.kode)"""
        )
    except Exception:
        return None

    terdekat = None
    for k in kandidat:
        jarak = jarak_haversine_m(properti["lat"], properti["lng"], k["lat"], k["lng"])
        if jarak <= RADIUS_PEMBANDING_M and (terdekat is None or jarak < terdekat["jarak_m"]):
            terdekat = {**k, "jarak_m": jarak}
    if not terdekat:
        return None

    luas_tanah = properti.get("luas_tanah") or 0
    hasil = {
        "kawasan": terdekat["nama"],
        "kabupaten": terdekat["kabupaten"],
        "jarak_m": terdekat["jarak_m"],
        "median_tanah_per_m2": terdekat["harga_median"],
        "rentang_tanah_per_m2": [terdekat["harga_min"], terdekat["harga_maks"]],
        "periode": terdekat["periode"],
        "jenis_data": terdekat["jenis_data"],
        "jumlah_sampel": terdekat["jumlah_sampel"],
        "harga_per_m2_tanah": None,
        "nilai_tanah_pasar": None,
        "nilai_bangunan_tersirat": None,
        "kesimpulan": None,
    }
    if not luas_tanah:
        hasil["kesimpulan"] = "Isi luas tanah agar harga penawaran bisa dibandingkan dengan harga tanah pasar."
        return hasil

    nilai_tanah = round(luas_tanah * terdekat["harga_median"])
    sisa = harga - nilai_tanah
    hasil.update({
        "harga_per_m2_tanah": round(harga / luas_tanah),
        "nilai_tanah_pasar": nilai_tanah,
        "nilai_bangunan_tersirat": sisa,
    })
    if properti.get("jenis_properti") == "apartemen":
        hasil["kesimpulan"] = "Apartemen tidak memiliki tanah sendiri, sehingga pembanding harga tanah hanya sebagai gambaran kawasan."
    elif sisa < 0:
        hasil["kesimpulan"] = (
            "Harga penawaran di bawah perkiraan nilai tanahnya saja. Bisa jadi peluang, tetapi cek legalitas, "
            "akses jalan, dan kondisi lahan karena biasanya ada alasan harga lebih rendah."
        )
    elif properti.get("luas_bangunan"):
        per_m2_bangunan = sisa / properti["luas_bangunan"]
        hasil["nilai_bangunan_per_m2"] = round(per_m2_bangunan)
        if per_m2_bangunan > 8_000_000:
            hasil["kesimpulan"] = (
                "Setelah dikurangi nilai tanah pasar, nilai bangunan tersirat di atas Rp8 juta/m². Itu tinggi untuk bangunan "
                "bekas, sehingga ada ruang untuk menawar."
            )
        else:
            hasil["kesimpulan"] = "Selisih harga dengan nilai tanah pasar masih wajar untuk nilai bangunannya."
    else:
        hasil["kesimpulan"] = "Isi luas bangunan untuk menilai apakah sisa harga di atas nilai tanah wajar."
    return hasil


def hitung_investasi(properti, total_renovasi):
    harga = int(properti["harga_penawaran"] or 0)
    bphtb = round(max(0, harga - ASUMSI_TRANSAKSI["npoptkp"]) * ASUMSI_TRANSAKSI["tarif_bphtb"])
    ppat = round(harga * ASUMSI_TRANSAKSI["tarif_ppat"])
    administrasi = ASUMSI_TRANSAKSI["biaya_administrasi"] if harga else 0
    biaya_transaksi = bphtb + ppat + administrasi
    total = harga + total_renovasi + biaya_transaksi

    luas = properti.get("luas_bangunan") or 0
    return {
        "harga_penawaran": harga,
        "renovasi": total_renovasi,
        "biaya_transaksi": biaya_transaksi,
        "rincian_transaksi": [
            {"nama": "BPHTB (5% × harga dikurangi NPOPTKP)", "jumlah": bphtb},
            {"nama": "Jasa PPAT / notaris (±1%)", "jumlah": ppat},
            {"nama": "Cek sertifikat, balik nama, administrasi", "jumlah": administrasi},
        ],
        "total": total,
        "harga_per_m2": round(harga / luas) if luas else None,
        "total_per_m2": round(total / luas) if luas else None,
        "rasio_renovasi_persen": round(total_renovasi / harga * 100, 1) if harga else 0,
        "kegunaan_harga": KEGUNAAN_HARGA,
        "pembanding_pasar": pembanding_pasar(properti),
        "asumsi": "NPOPTKP Rp80 juta (bervariasi per daerah). Pajak penjual (PPh) tidak termasuk.",
    }
