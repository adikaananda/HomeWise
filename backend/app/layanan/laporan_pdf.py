from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .konstanta import JENIS_KERUSAKAN, KATEGORI_FASILITAS, TUJUAN

BIRU = colors.HexColor("#0A43EF")
BIRU_TUA = colors.HexColor("#0832C8")
HIJAU = colors.HexColor("#008C73")
TINTA = colors.HexColor("#0E1A3D")
ABU = colors.HexColor("#5B6788")
GARIS = colors.HexColor("#DDE4F3")
LATAR = colors.HexColor("#F4F7FE")
WARNA_TINGKAT = {"rendah": HIJAU, "ringan": HIJAU, "sedang": colors.HexColor("#C98A00"), "tinggi": colors.HexColor("#D23B3B"), "berat": colors.HexColor("#D23B3B")}

GAYA = {
    "judul": ParagraphStyle("judul", fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=TINTA),
    "sub": ParagraphStyle("sub", fontName="Helvetica", fontSize=9.5, leading=13, textColor=ABU),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=13, leading=17, textColor=BIRU_TUA, spaceBefore=10, spaceAfter=6),
    "isi": ParagraphStyle("isi", fontName="Helvetica", fontSize=9.5, leading=14, textColor=TINTA, alignment=TA_LEFT),
    "kecil": ParagraphStyle("kecil", fontName="Helvetica", fontSize=8, leading=11, textColor=ABU),
    "sel": ParagraphStyle("sel", fontName="Helvetica", fontSize=8.5, leading=11, textColor=TINTA),
    "sel_tebal": ParagraphStyle("sel_tebal", fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=TINTA),
    "angka": ParagraphStyle("angka", fontName="Helvetica-Bold", fontSize=17, leading=20, textColor=BIRU),
}


def rupiah(n):
    return "Rp" + f"{int(n or 0):,}".replace(",", ".")


def _p(teks, gaya="sel"):
    return Paragraph(str(teks), GAYA[gaya])


def _tabel(baris, lebar, rata_kanan=()):
    data = [[_p(sel, "sel_tebal" if i == 0 else "sel") if not hasattr(sel, "wrap") else sel for sel in b] for i, b in enumerate(baris)]
    tabel = Table(data, colWidths=lebar, repeatRows=1)
    gaya = [
        ("BACKGROUND", (0, 0), (-1, 0), LATAR),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, GARIS),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for kolom in rata_kanan:
        gaya.append(("ALIGN", (kolom, 0), (kolom, -1), "RIGHT"))
    tabel.setStyle(TableStyle(gaya))
    return tabel


def _kartu_angka(daftar):
    sel = [[_p(f"<font size=8 color='#5B6788'>{label}</font><br/>{nilai}", "angka") for label, nilai in daftar]]
    tabel = Table(sel, colWidths=[170 / len(daftar) * mm] * len(daftar))
    tabel.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, GARIS),
        ("INNERGRID", (0, 0), (-1, -1), 0.6, GARIS),
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ]))
    return tabel


def _berwarna(teks, tingkat):
    warna = WARNA_TINGKAT.get(tingkat, TINTA).hexval()[2:]
    return _p(f"<font color='#{warna}'><b>{teks}</b></font>")


def _kaki(kanvas, dokumen):
    kanvas.saveState()
    kanvas.setFont("Helvetica", 7.5)
    kanvas.setFillColor(ABU)
    kanvas.drawString(20 * mm, 12 * mm, "HomeWise — laporan pendukung keputusan, bukan pengganti inspeksi profesional maupun penilaian resmi.")
    kanvas.drawRightString(190 * mm, 12 * mm, f"Halaman {dokumen.page}")
    kanvas.setFillColor(BIRU)
    kanvas.rect(0, A4[1] - 6 * mm, A4[0], 6 * mm, stroke=0, fill=1)
    kanvas.restoreState()


def buat_pdf(detail, nomor, tanggal):
    p = detail["properti"]
    lok = detail["lokasi"]
    bangunan = detail["bangunan"]
    biaya = detail["biaya"]
    inv = detail["investasi"]
    isi = []

    isi.append(_p("<font color='#0A43EF'><b>Home</b></font><font color='#008C73'><b>Wise</b></font>  Property Intelligence Report", "sub"))
    isi.append(Spacer(1, 4))
    isi.append(_p(p["nama"], "judul"))
    isi.append(_p(f"{p['alamat']}<br/>Nomor laporan {nomor} · Diterbitkan {tanggal}", "sub"))
    isi.append(Spacer(1, 10))

    isi.append(_kartu_angka([
        ("Skor lokasi", f"{lok['hasil']['skor_total']:.0f}/100" if lok else "-"),
        ("Kondisi visual", f"{bangunan['skor_kondisi']:.0f}/100" if bangunan else "-"),
        ("Total investasi awal", rupiah(inv["total"]) if inv else "-"),
    ]))
    isi.append(Spacer(1, 8))

    isi.append(_p("Data properti", "h2"))
    isi.append(_tabel([
        ["Atribut", "Nilai"],
        ["Tujuan penggunaan", TUJUAN[p["tujuan"]]["label"]],
        ["Jenis properti", p["jenis_properti"].replace("_", " ").title()],
        ["Harga penawaran", rupiah(p["harga_penawaran"])],
        ["Luas tanah / bangunan", f"{p['luas_tanah'] or '-'} m² / {p['luas_bangunan'] or '-'} m²"],
        ["Tahun bangun", p["tahun_bangun"] or "-"],
        ["Koordinat", f"{p['lat']:.6f}, {p['lng']:.6f}"],
    ], [55 * mm, 115 * mm]))

    if lok:
        h = lok["hasil"]
        d = lok["data"]
        isi.append(_p("Kelayakan lokasi", "h2"))
        isi.append(_p(h.get("ringkasan", ""), "isi"))
        isi.append(Spacer(1, 6))
        isi.append(_tabel(
            [["Indikator", "Bobot", "Skor"]] + [[i["label"], f"{i['bobot'] * 100:.0f}%", f"{i['skor']:.0f}"] for i in h["indikator"]],
            [100 * mm, 35 * mm, 35 * mm], rata_kanan=(1, 2),
        ))
        isi.append(Spacer(1, 6))
        isi.append(_tabel(
            [["Risiko lingkungan", "Level", "Sumber"]] + [
                [nama.title(), _berwarna(info["level"].title(), info["level"]), info["sumber"]] for nama, info in d["risiko"].items()
            ] + [["Topografi", f"Elevasi {d['topografi']['elevasi_m']} m", f"Kemiringan {d['topografi']['kemiringan_persen']}%"]],
            [40 * mm, 35 * mm, 95 * mm],
        ))
        isi.append(Spacer(1, 6))
        isi.append(_tabel(
            [["Fasilitas terdekat", "Kategori", "Jarak"]] + [
                [f["nama"], KATEGORI_FASILITAS[f["kategori"]]["label"], f"{f['jarak_m'] / 1000:.1f} km"] for f in d["fasilitas"][:8]
            ],
            [80 * mm, 60 * mm, 30 * mm], rata_kanan=(2,),
        ))

    if bangunan:
        isi.append(_p("Kondisi bangunan", "h2"))
        status = "Divalidasi analis HomeWise" if bangunan["tervalidasi"] else "Hasil analisis AI, belum divalidasi analis"
        isi.append(_p(f"{bangunan['ringkasan']} <i>({status})</i>", "isi"))
        isi.append(Spacer(1, 6))
        aktif = [t for t in bangunan["temuan"] if t.get("status") != "ditolak"]
        if aktif:
            isi.append(_tabel(
                [["Temuan", "Tingkat", "Luas", "Keyakinan"]] + [
                    [JENIS_KERUSAKAN[t["jenis"]], _berwarna(t["tingkat"].title(), t["tingkat"]), f"{t['luas_m2']} m²",
                     f"{t['kepercayaan'] * 100:.0f}%" if t.get("kepercayaan") else "Analis"]
                    for t in aktif
                ],
                [70 * mm, 35 * mm, 30 * mm, 35 * mm], rata_kanan=(2, 3),
            ))

    if biaya and biaya["item"]:
        isi.append(_p("Estimasi biaya renovasi", "h2"))
        isi.append(_tabel(
            [["Pekerjaan", "Volume", "Harga satuan", "Jumlah"]] + [
                [i["pekerjaan"], f"{i['volume']} {i['satuan']}", rupiah(i["harga_satuan"]), rupiah(i["jumlah"])] for i in biaya["item"]
            ] + [
                ["Subtotal", "", "", rupiah(biaya["subtotal"])],
                ["Kontingensi 10%", "", "", rupiah(biaya["kontingensi"])],
                [_p("<b>Total estimasi</b>"), "", "", _p(f"<b>{rupiah(biaya['total'])}</b>")],
            ],
            [72 * mm, 28 * mm, 35 * mm, 35 * mm], rata_kanan=(1, 2, 3),
        ))
        isi.append(_p(f"Rentang wajar {rupiah(biaya['rentang_min'])} – {rupiah(biaya['rentang_maks'])}.", "kecil"))

    if inv:
        isi.append(_p("Total investasi awal", "h2"))
        isi.append(_p(inv["ringkasan"], "isi"))
        isi.append(Spacer(1, 6))
        isi.append(_tabel(
            [["Komponen", "Jumlah"], ["Harga penawaran", rupiah(inv["harga_penawaran"])], ["Estimasi renovasi", rupiah(inv["renovasi"])]]
            + [[r["nama"], rupiah(r["jumlah"])] for r in inv["rincian_transaksi"]]
            + [[_p("<b>Total investasi awal</b>"), _p(f"<b>{rupiah(inv['total'])}</b>")]],
            [120 * mm, 50 * mm], rata_kanan=(1,),
        ))
        isi.append(_p(inv["asumsi"], "kecil"))

    if detail["rekomendasi"]:
        isi.append(_p("Rekomendasi pemeriksaan lanjutan", "h2"))
        isi.append(ListFlowable([ListItem(_p(r, "isi"), leftIndent=10) for r in detail["rekomendasi"]], bulletType="bullet", start="•"))

    isi.append(Spacer(1, 12))
    isi.append(HRFlowable(width="100%", color=GARIS))
    batasan = (lok["hasil"]["keterbatasan_data"] if lok else []) + [
        "Estimasi biaya memakai harga referensi satuan dan dapat berbeda dengan penawaran kontraktor.",
        "Analisis foto hanya mendeteksi indikasi visual; kerusakan struktur tersembunyi memerlukan pemeriksaan ahli.",
    ]
    isi.append(_p("<b>Keterbatasan data.</b> " + " ".join(batasan), "kecil"))

    buffer = BytesIO()
    dokumen = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=20 * mm,
                                title=f"Laporan HomeWise {nomor}", author="HomeWise")
    dokumen.build(isi, onFirstPage=_kaki, onLaterPages=_kaki)
    return buffer.getvalue()
