from .konstanta import INDIKATOR, JENIS_KERUSAKAN, TUJUAN


def _rupiah(n):
    return "Rp" + f"{int(n):,}".replace(",", ".")


def ringkasan_lokasi(hasil, tujuan):
    label_tujuan = TUJUAN[tujuan]["label"].lower()
    kalimat = [
        f"Untuk tujuan {label_tujuan}, lokasi ini memperoleh skor {hasil['skor_total']:.0f}/100 "
        f"dan masuk kategori {hasil['kategori'].lower()}."
    ]
    if hasil["faktor_pendukung"]:
        kalimat.append("Kekuatan utamanya: " + ", ".join(f["judul"].lower() for f in hasil["faktor_pendukung"][:3]) + ".")
    if hasil["risiko"]:
        kalimat.append("Hal yang perlu diwaspadai: " + ", ".join(r["judul"].lower() for r in hasil["risiko"][:3]) + ".")
    kalimat.append("Verifikasi langsung di lapangan tetap diperlukan sebelum keputusan pembelian.")
    return " ".join(kalimat)


def ringkasan_bangunan(temuan, skor_kondisi):
    aktif = [t for t in temuan if t.get("status") != "ditolak"]
    if not aktif:
        return "Tidak ditemukan indikasi kerusakan visual pada foto yang diunggah. Tetap lakukan pemeriksaan struktur dan instalasi secara langsung."
    berat = [t for t in aktif if t["tingkat"] == "berat"]
    jenis = sorted({JENIS_KERUSAKAN[t["jenis"]].lower() for t in aktif})
    teks = f"Skor kondisi visual {skor_kondisi:.0f}/100 dengan {len(aktif)} indikasi kerusakan: {', '.join(jenis)}."
    if berat:
        teks += f" Terdapat {len(berat)} temuan tingkat berat yang sebaiknya diperiksa ahli bangunan sebelum negosiasi harga."
    else:
        teks += " Sebagian besar temuan bersifat kosmetik dan dapat ditangani dengan renovasi ringan hingga sedang."
    return teks


def ringkasan_investasi(investasi):
    teks = (
        f"Estimasi total investasi awal sekitar {_rupiah(investasi['total'])}, terdiri dari harga penawaran "
        f"{_rupiah(investasi['harga_penawaran'])}, renovasi {_rupiah(investasi['renovasi'])}, dan biaya transaksi "
        f"{_rupiah(investasi['biaya_transaksi'])}."
    )
    if investasi["rasio_renovasi_persen"] >= 15:
        teks += f" Biaya renovasi mencapai {investasi['rasio_renovasi_persen']:.1f}% dari harga, layak dijadikan dasar negosiasi."
    return teks


def rekomendasi(hasil_lokasi, temuan, punya_inspeksi):
    daftar = []
    risiko = hasil_lokasi["data"]["risiko"] if hasil_lokasi else {}
    if risiko.get("banjir", {}).get("level") in ("sedang", "tinggi"):
        daftar.append("Tanyakan riwayat banjir kepada warga sekitar dan periksa bekas genangan pada dinding bawah.")
    if risiko.get("longsor", {}).get("level") in ("sedang", "tinggi"):
        daftar.append("Periksa kontur tanah, dinding penahan, dan saluran air di sekitar bangunan.")
    if any(t["jenis"] == "retak_dinding" and t["tingkat"] != "ringan" for t in temuan):
        daftar.append("Minta ahli struktur memeriksa retakan untuk memastikan tidak berkaitan dengan pondasi.")
    if any(t["jenis"] in ("noda_lembap", "atap_bocor") for t in temuan):
        daftar.append("Cek sumber kebocoran saat atau setelah hujan, termasuk talang dan sambungan atap.")
    daftar.append("Pastikan legalitas: sertifikat, IMB/PBG, dan kesesuaian zonasi dengan tujuan penggunaan.")
    if not punya_inspeksi:
        daftar.append("Pertimbangkan inspeksi profesional untuk memvalidasi temuan sebelum menawar harga.")
    return daftar


def label_indikator(kode):
    return INDIKATOR.get(kode, kode)
