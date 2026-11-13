from .konstanta import ASUMSI_TRANSAKSI


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
        "asumsi": "NPOPTKP Rp80 juta (bervariasi per daerah). Pajak penjual (PPh) tidak termasuk.",
    }
