import hashlib
from pathlib import Path

from flask import current_app

from .. import db
from ..respon import GalatAplikasi
from . import ai_klien, biaya, investasi, lokasi, penjelasan
from .konstanta import PENALTI_TINGKAT

KOLOM_JSON_LOKASI = ("data_mentah", "hasil")


def ambil_properti(properti_id, pengguna, izinkan_staf=True):
    properti = db.satu("SELECT * FROM properti WHERE id = ?", (properti_id,))
    if not properti:
        raise GalatAplikasi("Properti tidak ditemukan.", 404)
    staf = izinkan_staf and pengguna["peran"] in ("admin", "analis")
    if properti["pengguna_id"] != pengguna["id"] and not staf:
        raise GalatAplikasi("Properti tidak ditemukan.", 404)
    return properti


def punya_akses_premium(properti, pengguna):
    return bool(properti["laporan_terbuka"]) or pengguna["peran"] in ("admin", "analis")


def wajib_premium(properti, pengguna):
    if not punya_akses_premium(properti, pengguna):
        raise GalatAplikasi("Fitur ini tersedia di Laporan Lengkap. Buka laporan untuk melanjutkan.", 402)


def evaluasi_lokasi(data, tujuan):
    hasil = lokasi.nilai_kelayakan(data, tujuan)
    hasil["ringkasan"] = ai_klien.susun_penjelasan("lokasi", {"hasil": hasil, "tujuan": tujuan, "data": data})
    return hasil


def jalankan_analisis_lokasi(properti):
    data, sumber = ai_klien.analisis_lokasi(properti["lat"], properti["lng"], properti["alamat"], properti["id"])
    hasil = evaluasi_lokasi(data, properti["tujuan"])
    db.simpan_atau_ganti("analisis_lokasi", {
        "properti_id": properti["id"],
        "data_mentah": data,
        "hasil": hasil,
        "skor_total": hasil["skor_total"],
        "sumber": sumber,
        "dibuat": db.sekarang(),
    }, "properti_id")


def nilai_ulang_tujuan(properti):
    tersimpan = db.satu("SELECT * FROM analisis_lokasi WHERE properti_id = ?", (properti["id"],), KOLOM_JSON_LOKASI)
    if not tersimpan:
        return jalankan_analisis_lokasi(properti)
    hasil = evaluasi_lokasi(tersimpan["data_mentah"], properti["tujuan"])
    db.perbarui("analisis_lokasi", properti["id"], {"hasil": hasil, "skor_total": hasil["skor_total"]}, "properti_id")


def _sidik_foto(foto):
    jalur = Path(current_app.config["DIR_UNGGAHAN"]) / foto["nama_berkas"]
    if jalur.exists():
        return hashlib.sha256(jalur.read_bytes()).hexdigest()
    return foto["nama_berkas"]


def skor_kondisi(temuan):
    penalti = sum(PENALTI_TINGKAT[t["tingkat"]] for t in temuan if t.get("status") != "ditolak")
    return max(0.0, 100.0 - penalti)


def simpan_hasil_bangunan(properti_id, temuan, sumber, tervalidasi=False):
    skor = skor_kondisi(temuan)
    ringkasan = ai_klien.susun_penjelasan("bangunan", {"temuan": temuan, "skor_kondisi": skor})
    db.simpan_atau_ganti("analisis_bangunan", {
        "properti_id": properti_id,
        "temuan": temuan,
        "skor_kondisi": skor,
        "ringkasan": ringkasan,
        "sumber": sumber,
        "tervalidasi": tervalidasi,
        "dibuat": db.sekarang(),
    }, "properti_id")
    biaya.simpan_estimasi(properti_id, biaya.hitung_renovasi(temuan))


def jalankan_analisis_bangunan(properti):
    sebelumnya = db.satu("SELECT tervalidasi FROM analisis_bangunan WHERE properti_id = ?", (properti["id"],))
    if sebelumnya and sebelumnya["tervalidasi"]:
        raise GalatAplikasi("Temuan sudah divalidasi analis sehingga tidak dianalisis ulang.", 409)

    foto = db.banyak("SELECT * FROM foto_bangunan WHERE properti_id = ? ORDER BY id", (properti["id"],))
    if not foto:
        raise GalatAplikasi("Unggah minimal satu foto bangunan terlebih dahulu.", 400)
    for f in foto:
        f["sidik"] = _sidik_foto(f)

    hasil, sumber = ai_klien.analisis_foto(foto, properti["id"])
    temuan = [{**t, "status": "ai"} for t in hasil.get("temuan", [])]
    simpan_hasil_bangunan(properti["id"], temuan, sumber)


def url_foto(nama_berkas):
    return f"/api/berkas/{nama_berkas}"


def detail_lengkap(properti, pengguna):
    premium = punya_akses_premium(properti, pengguna)
    lok = db.satu("SELECT * FROM analisis_lokasi WHERE properti_id = ?", (properti["id"],), KOLOM_JSON_LOKASI)
    foto = db.banyak("SELECT id, nama_berkas, nama_asli, ruang, sumber, dibuat FROM foto_bangunan WHERE properti_id = ? ORDER BY id", (properti["id"],))
    for f in foto:
        f["url"] = url_foto(f["nama_berkas"])

    bangunan = db.satu("SELECT * FROM analisis_bangunan WHERE properti_id = ?", (properti["id"],), ("temuan",))
    estimasi = db.satu("SELECT * FROM estimasi_biaya WHERE properti_id = ?", (properti["id"],), ("rincian",))
    inspeksi = db.satu(
        """SELECT i.id, i.status, i.jadwal, i.catatan, i.divalidasi_pada, a.nama AS analis_nama
           FROM inspeksi i LEFT JOIN pengguna a ON a.id = i.analis_id
           WHERE i.properti_id = ? AND i.status != 'dibatalkan' ORDER BY i.id DESC LIMIT 1""",
        (properti["id"],),
    )

    lokasi_data = None
    if lok:
        lokasi_data = {"data": lok["data_mentah"], "hasil": lok["hasil"], "sumber": lok["sumber"], "dibuat": lok["dibuat"]}

    temuan = bangunan["temuan"] if bangunan else []
    hasil = {
        "properti": properti,
        "akses_premium": premium,
        "lokasi": lokasi_data,
        "foto": foto if premium else [],
        "jumlah_foto": len(foto),
        "inspeksi": inspeksi,
        "bangunan": None,
        "biaya": None,
        "investasi": None,
        "rekomendasi": penjelasan.rekomendasi(lokasi_data, temuan, bool(inspeksi)) if premium else [],
    }

    if not premium:
        if bangunan:
            hasil["bangunan"] = {"terkunci": True, "jumlah_temuan": len(temuan)}
        return hasil

    if bangunan:
        hasil["bangunan"] = {
            "temuan": temuan,
            "skor_kondisi": bangunan["skor_kondisi"],
            "ringkasan": bangunan["ringkasan"],
            "sumber": bangunan["sumber"],
            "tervalidasi": bool(bangunan["tervalidasi"]),
            "dibuat": bangunan["dibuat"],
        }
    if estimasi:
        hasil["biaya"] = {
            "item": estimasi["rincian"]["item"],
            "asumsi": estimasi["rincian"]["asumsi"],
            "subtotal": estimasi["subtotal"],
            "kontingensi": estimasi["kontingensi"],
            "total": estimasi["total"],
            "rentang_min": estimasi["rentang_min"],
            "rentang_maks": estimasi["rentang_maks"],
        }
    inv = investasi.hitung_investasi(properti, estimasi["total"] if estimasi else 0)
    inv["ringkasan"] = ai_klien.susun_penjelasan("investasi", {"investasi": inv})
    hasil["investasi"] = inv
    return hasil


def ringkas_untuk_daftar(properti):
    lok = db.satu("SELECT skor_total, hasil FROM analisis_lokasi WHERE properti_id = ?", (properti["id"],), ("hasil",))
    bangunan = db.satu("SELECT skor_kondisi FROM analisis_bangunan WHERE properti_id = ?", (properti["id"],))
    estimasi = db.satu("SELECT total FROM estimasi_biaya WHERE properti_id = ?", (properti["id"],))
    foto = db.satu("SELECT nama_berkas FROM foto_bangunan WHERE properti_id = ? ORDER BY id LIMIT 1", (properti["id"],))
    terbuka = bool(properti["laporan_terbuka"])
    return {
        **properti,
        "skor_lokasi": lok["skor_total"] if lok else None,
        "kategori_lokasi": lok["hasil"]["kategori"] if lok else None,
        "skor_kondisi": bangunan["skor_kondisi"] if bangunan and terbuka else None,
        "estimasi_renovasi": estimasi["total"] if estimasi and terbuka else None,
        "foto_sampul": url_foto(foto["nama_berkas"]) if foto and terbuka else None,
    }
