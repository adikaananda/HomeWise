from .konstanta import INDIKATOR, JENIS_KERUSAKAN, TUJUAN, tentukan_prioritas


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
    mendesak = [t for t in aktif if tentukan_prioritas(t["jenis"], t["tingkat"]) == "mendesak"]
    if mendesak:
        teks += f" Ada {len(mendesak)} temuan yang perlu diperbaiki sebelum bangunan ditempati."
    elif berat:
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


def rekomendasi(hasil_lokasi, temuan, punya_inspeksi, survei=None, kelengkapan=None, ada_foto_iklan=False):
    daftar = []
    jawaban = (survei or {}).get("jawaban", {})
    risiko = hasil_lokasi["data"]["risiko"] if hasil_lokasi else {}
    aktif = [t for t in temuan if t.get("status") != "ditolak"]

    if jawaban.get("riwayat_banjir", "").startswith("Pernah"):
        daftar.append("Warga atau penjual menyebut lokasi pernah banjir. Tanyakan ketinggian air, minta penyesuaian harga, dan anggarkan peninggian lantai atau pompa.")
    elif risiko.get("banjir", {}).get("level") in ("sedang", "tinggi"):
        daftar.append("Tanyakan riwayat banjir kepada warga sekitar dan periksa bekas genangan pada dinding bawah.")
    if risiko.get("longsor", {}).get("level") in ("sedang", "tinggi"):
        daftar.append("Periksa kontur tanah, dinding penahan, dan saluran air di sekitar bangunan.")
    if any(t["jenis"] == "retak_dinding" and t["tingkat"] != "ringan" for t in aktif):
        daftar.append("Minta ahli struktur memeriksa retakan untuk memastikan tidak berkaitan dengan pondasi.")
    if any(t["jenis"] in ("noda_lembap", "atap_bocor") for t in aktif):
        daftar.append("Cek sumber kebocoran saat atau setelah hujan, termasuk talang dan sambungan atap.")
    if kelengkapan and kelengkapan["belum"]:
        daftar.append("Foto belum mencakup: " + ", ".join(a.lower() for a in kelengkapan["belum"]) + ". Kerusakan di area itu belum terhitung.")
    if ada_foto_iklan:
        daftar.append("Sebagian foto berasal dari iklan atau penjual. Pastikan kondisinya saat survei, karena foto iklan jarang menampilkan kerusakan.")

    sertifikat = jawaban.get("sertifikat")
    if sertifikat == "AJB / girik":
        daftar.append("Sertifikat masih AJB atau girik. Anggarkan biaya dan waktu peningkatan ke SHM sebelum transaksi.")
    elif sertifikat == "SHGB":
        daftar.append("Status SHGB punya masa berlaku. Cek sisa waktunya dan biaya perpanjangan atau peningkatan ke SHM.")
    else:
        daftar.append("Cek sertifikat di kantor BPN dan pastikan nama pemilik sesuai KTP penjual.")
    if jawaban.get("izin_bangunan") in ("Tidak ada", "Belum tahu"):
        daftar.append("Minta dokumen IMB/PBG. Tanpa dokumen ini, renovasi besar dan pengajuan KPR bisa terhambat.")
    if jawaban.get("daya_listrik") == "900 VA":
        daftar.append("Daya listrik 900 VA biasanya perlu dinaikkan. Anggarkan biaya tambah daya ke PLN.")
    if not punya_inspeksi:
        daftar.append("Pertimbangkan inspeksi profesional untuk memvalidasi temuan sebelum menawar harga.")
    return daftar


def rekomendasi_spesifikasi(properti, biaya_mendesak=0):
    """Saran tambahan dari data spesifikasi yang diisi pengguna saat input properti."""
    spek = properti.get("spesifikasi") or {}
    daftar = []
    if spek.get("kondisi_penjual") == "siap_huni" and biaya_mendesak > 0:
        daftar.append(
            f"Penjual menyebut properti siap huni, tetapi ada perbaikan mendesak sekitar {_rupiah(biaya_mendesak)}. "
            "Tunjukkan temuan ini saat menawar."
        )
    if spek.get("status_harga") == "nett":
        daftar.append("Harga disebut nett (tidak bisa ditawar). Pastikan siapa yang menanggung BPHTB, PPh penjual, dan biaya notaris.")
    tahun_bangun = properti.get("tahun_bangun")
    renovasi = spek.get("tahun_renovasi_terakhir") or tahun_bangun
    if tahun_bangun and renovasi and renovasi <= 2026 - 15:
        daftar.append(
            f"Bangunan berumur {2026 - tahun_bangun} tahun dan belum direnovasi sejak {renovasi}. "
            "Periksa instalasi listrik, pipa air, dan rangka atap yang tidak terlihat di foto."
        )
    lebar = spek.get("lebar_depan_m")
    if lebar and lebar < 5 and properti.get("tujuan") in ("restoran", "kafe", "ruko"):
        daftar.append(f"Lebar muka bangunan {lebar:g} m tergolong sempit untuk usaha. Pertimbangkan visibilitas papan nama dan area parkir.")
    if spek.get("kapasitas_parkir_mobil") == 0 and properti.get("tujuan") in ("restoran", "kafe", "ruko", "kantor"):
        daftar.append("Tidak ada parkir mobil di lahan. Cek ketersediaan parkir di jalan atau lahan sekitar untuk pengunjung.")
    return daftar


def label_indikator(kode):
    return INDIKATOR.get(kode, kode)
