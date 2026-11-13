from .konstanta import INDIKATOR, KATEGORI_FASILITAS, TUJUAN, label_kategori_skor

BOBOT_RISIKO = {"banjir": 0.5, "longsor": 0.3, "gempa": 0.2}


def _skor_jarak(jarak, jarak_ideal):
    if jarak is None:
        return 20.0
    rasio = jarak / jarak_ideal
    if rasio <= 0.5:
        return 100.0
    return max(10.0, 100.0 - (rasio - 0.5) * 60)


def hitung_indikator(data):
    risiko = data["risiko"]
    bahaya = sum(risiko[k]["skor"] * b for k, b in BOBOT_RISIKO.items() if k in risiko)
    skor = {"keamanan_bencana": round(100 * (1 - bahaya), 1)}

    terdekat = {}
    for f in data["fasilitas"]:
        if f["kategori"] not in terdekat or f["jarak_m"] < terdekat[f["kategori"]]:
            terdekat[f["kategori"]] = f["jarak_m"]

    per_indikator = {}
    for kategori, info in KATEGORI_FASILITAS.items():
        nilai = _skor_jarak(terdekat.get(kategori), info["jarak_ideal"])
        per_indikator.setdefault(info["indikator"], []).append(nilai)
    for indikator, daftar in per_indikator.items():
        skor[indikator] = round(max(daftar) * 0.7 + min(daftar) * 0.3, 1)

    akses = data["aksesibilitas"]
    skor_akses = _skor_jarak(akses["jarak_jalan_utama_m"], 500)
    skor_akses += min(10, (akses["lebar_jalan_depan_m"] - 4) * 2)
    skor["aksesibilitas"] = round(max(10, min(100, skor_akses)), 1)
    return skor


def nilai_kelayakan(data, tujuan):
    bobot = TUJUAN[tujuan]["bobot"]
    skor = hitung_indikator(data)
    total = round(sum(skor[k] * b for k, b in bobot.items()), 1)

    indikator = [
        {"kode": k, "label": INDIKATOR[k], "skor": skor[k], "bobot": bobot.get(k, 0)}
        for k in INDIKATOR
    ]
    indikator.sort(key=lambda i: i["bobot"], reverse=True)

    pendukung = [
        {"judul": i["label"], "detail": f"Skor {i['skor']:.0f}/100 dengan bobot {i['bobot'] * 100:.0f}% untuk tujuan ini."}
        for i in indikator if i["skor"] >= 75 and i["bobot"] >= 0.1
    ]

    risiko = []
    for nama, info in data["risiko"].items():
        if info["level"] != "rendah":
            risiko.append({"judul": f"Risiko {nama} {info['level']}", "detail": info["sumber"], "tingkat": info["level"]})
    for i in indikator:
        if i["skor"] < 50 and i["bobot"] >= 0.15:
            risiko.append({"judul": f"{i['label']} terbatas", "detail": f"Skor {i['skor']:.0f}/100 pada indikator berbobot tinggi.", "tingkat": "sedang"})

    verifikasi = ["Status legalitas lahan dan kesesuaian zonasi (RDTR) dengan tujuan penggunaan."]
    if data["risiko"]["banjir"]["level"] != "rendah":
        verifikasi.append("Riwayat genangan atau banjir dalam 5 tahun terakhir.")
    if tujuan in ("restoran", "kafe", "ruko"):
        verifikasi.append("Ketersediaan area parkir dan arus pejalan kaki pada jam operasional.")
    if data["aksesibilitas"]["lebar_jalan_depan_m"] < 5:
        verifikasi.append("Akses kendaraan roda empat dan kendaraan darurat ke lokasi.")

    return {
        "tujuan": tujuan,
        "skor_total": total,
        "kategori": label_kategori_skor(total),
        "indikator": indikator,
        "faktor_pendukung": pendukung,
        "risiko": risiko,
        "keterbatasan_data": data.get("keterbatasan_data", []),
        "perlu_verifikasi": verifikasi,
    }
