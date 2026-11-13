import hashlib
import json
from pathlib import Path

from flask import current_app

from .. import db
from ..respon import GalatAplikasi
from . import ai_klien, biaya, investasi, lokasi, penjelasan
from .konstanta import ALASAN_PRIORITAS, AREA_FOTO, PENALTI_TINGKAT, tentukan_prioritas

KOLOM_JSON_LOKASI = ("data_mentah", "hasil")
MAKS_FOTO_PER_PROPERTI = 40

TAHAP = [
    {"kode": "kandidat", "label": "Kandidat"},
    {"kode": "disurvei", "label": "Disurvei"},
    {"kode": "dianalisis", "label": "Dianalisis"},
    {"kode": "tervalidasi", "label": "Tervalidasi"},
]


def ambil_properti(properti_id, pengguna, izinkan_staf=True):
    properti = db.satu("SELECT * FROM properti WHERE id = ?", (properti_id,), ("data_survei",))
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


def ambil_foto(properti_id):
    foto = db.banyak(
        "SELECT id, nama_berkas, nama_asli, ruang, area, sumber, dibuat FROM foto_bangunan WHERE properti_id = ? ORDER BY id",
        (properti_id,),
    )
    for f in foto:
        f["url"] = url_foto(f["nama_berkas"])
    return foto


def periksa_kuota_foto(properti_id, jumlah_baru):
    jumlah = db.nilai("SELECT COUNT(*) FROM foto_bangunan WHERE properti_id = ?", (properti_id,))
    if jumlah + jumlah_baru > MAKS_FOTO_PER_PROPERTI:
        raise GalatAplikasi(f"Maksimal {MAKS_FOTO_PER_PROPERTI} foto per properti. Hapus foto yang tidak diperlukan.", 422)


def kelengkapan_survei(foto):
    per_area = {}
    for f in foto:
        if f["sumber"] in ("survei", "analis"):
            per_area[f["area"]] = per_area.get(f["area"], 0) + 1
    wajib = [a for a in AREA_FOTO if a["wajib"]]
    terisi = [a for a in wajib if per_area.get(a["kode"])]
    return {
        "wajib_total": len(wajib),
        "wajib_terisi": len(terisi),
        "persen": round(len(terisi) / len(wajib) * 100) if wajib else 100,
        "belum": [a["label"] for a in wajib if not per_area.get(a["kode"])],
        "per_area": per_area,
    }


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
    id_valid = {f["id"] for f in foto}
    temuan = [{**t, "status": "ai"} for t in hasil.get("temuan", []) if t.get("foto_id") in id_valid]
    simpan_hasil_bangunan(properti["id"], temuan, sumber)


def url_foto(nama_berkas):
    return f"/api/berkas/{nama_berkas}"


def _perkaya_temuan(temuan, foto):
    peta_foto = {f["id"]: f for f in foto}
    hasil = []
    for t in temuan:
        f = peta_foto.get(t.get("foto_id"))
        prioritas = tentukan_prioritas(t["jenis"], t["tingkat"])
        hasil.append({
            **t,
            "prioritas": prioritas,
            "alasan_prioritas": ALASAN_PRIORITAS.get(t["jenis"]),
            "area": f["area"] if f else None,
            "sumber_foto": f["sumber"] if f else "analis",
        })
    return hasil


def _estimasi_terkini(properti_id, temuan):
    estimasi = db.satu("SELECT * FROM estimasi_biaya WHERE properti_id = ?", (properti_id,), ("rincian",))
    if temuan is not None and (not estimasi or estimasi["rincian"].get("versi") != biaya.VERSI_RINCIAN):
        biaya.simpan_estimasi(properti_id, biaya.hitung_renovasi(temuan))
        estimasi = db.satu("SELECT * FROM estimasi_biaya WHERE properti_id = ?", (properti_id,), ("rincian",))
    return estimasi


def ambil_inspeksi_aktif(properti_id):
    return db.satu(
        """SELECT i.id, i.status, i.jadwal, i.catatan, i.divalidasi_pada, a.nama AS analis_nama
           FROM inspeksi i LEFT JOIN pengguna a ON a.id = i.analis_id
           WHERE i.properti_id = ? AND i.status != 'dibatalkan' ORDER BY i.id DESC LIMIT 1""",
        (properti_id,),
    )


def tentukan_tahap(properti, jumlah_foto, bangunan, inspeksi):
    premium = bool(properti["laporan_terbuka"])
    if bangunan and bangunan["tervalidasi"]:
        kode, langkah = "tervalidasi", "Laporan sudah divalidasi analis. Gunakan untuk negosiasi harga."
    elif bangunan:
        kode = "dianalisis"
        if inspeksi and inspeksi["status"] != "tervalidasi":
            langkah = "Inspeksi profesional sedang berjalan. Laporan diperbarui setelah analis memvalidasi."
        else:
            langkah = "Pakai rincian biaya untuk menawar, atau pesan inspeksi agar temuan divalidasi analis."
    elif jumlah_foto:
        kode = "disurvei"
        langkah = "Analisis foto survei untuk melihat kerusakan dan biaya renovasi." if premium else "Buka Laporan Lengkap untuk menganalisis foto survei."
    else:
        kode, langkah = "kandidat", "Lokasi sudah dinilai. Saat survei, foto kondisi bangunan dengan panduan HomeWise."
    indeks = next(i for i, t in enumerate(TAHAP) if t["kode"] == kode)
    return {"kode": kode, "label": TAHAP[indeks]["label"], "urutan": indeks, "langkah": langkah, "semua": TAHAP}


def detail_lengkap(properti, pengguna):
    premium = punya_akses_premium(properti, pengguna)
    if isinstance(properti.get("data_survei"), str):
        properti = {**properti, "data_survei": json.loads(properti["data_survei"])}
    lok = db.satu("SELECT * FROM analisis_lokasi WHERE properti_id = ?", (properti["id"],), KOLOM_JSON_LOKASI)
    foto = ambil_foto(properti["id"])
    bangunan = db.satu("SELECT * FROM analisis_bangunan WHERE properti_id = ?", (properti["id"],), ("temuan",))
    inspeksi = ambil_inspeksi_aktif(properti["id"])

    lokasi_data = None
    if lok:
        lokasi_data = {"data": lok["data_mentah"], "hasil": lok["hasil"], "sumber": lok["sumber"], "dibuat": lok["dibuat"]}

    kelengkapan = kelengkapan_survei(foto)
    survei = properti.get("data_survei") or {"jawaban": {}, "diperbarui": None}
    temuan = _perkaya_temuan(bangunan["temuan"], foto) if bangunan else []
    ada_foto_iklan = any(f["sumber"] == "iklan" for f in foto)

    hasil = {
        "properti": properti,
        "akses_premium": premium,
        "tahap": tentukan_tahap(properti, len(foto), bangunan, inspeksi),
        "lokasi": lokasi_data,
        "foto": foto,
        "jumlah_foto": len(foto),
        "survei": {**survei, "kelengkapan": kelengkapan},
        "inspeksi": inspeksi,
        "bangunan": None,
        "biaya": None,
        "investasi": None,
        "rekomendasi": [],
    }

    if not premium:
        if bangunan:
            hasil["bangunan"] = {"terkunci": True, "jumlah_temuan": len(temuan)}
        return hasil

    hasil["rekomendasi"] = penjelasan.rekomendasi(lokasi_data, temuan, bool(inspeksi), survei, kelengkapan, ada_foto_iklan)
    estimasi = _estimasi_terkini(properti["id"], bangunan["temuan"] if bangunan else None)

    if bangunan:
        hasil["bangunan"] = {
            "temuan": temuan,
            "skor_kondisi": bangunan["skor_kondisi"],
            "ringkasan": bangunan["ringkasan"],
            "sumber": bangunan["sumber"],
            "tervalidasi": bool(bangunan["tervalidasi"]),
            "dibuat": bangunan["dibuat"],
            "ada_foto_iklan": any(t["sumber_foto"] == "iklan" for t in temuan),
        }
    if estimasi:
        rincian = estimasi["rincian"]
        hasil["biaya"] = {
            "item": rincian["item"],
            "material": rincian.get("material", []),
            "per_prioritas": rincian.get("per_prioritas", []),
            "asumsi": rincian["asumsi"],
            "subtotal": estimasi["subtotal"],
            "kontingensi": estimasi["kontingensi"],
            "total": estimasi["total"],
            "rentang_min": estimasi["rentang_min"],
            "rentang_maks": estimasi["rentang_maks"],
        }
    inv = investasi.hitung_investasi(properti, estimasi["total"] if estimasi else 0)
    mendesak = next((p["jumlah"] for p in hasil["biaya"]["per_prioritas"] if p["kode"] == "mendesak"), 0) if hasil["biaya"] else 0
    inv["total_minimum"] = inv["harga_penawaran"] + inv["biaya_transaksi"] + mendesak
    inv["ringkasan"] = ai_klien.susun_penjelasan("investasi", {"investasi": inv})
    hasil["investasi"] = inv
    return hasil


def ringkas_untuk_daftar(properti):
    lok = db.satu("SELECT skor_total, hasil FROM analisis_lokasi WHERE properti_id = ?", (properti["id"],), ("hasil",))
    bangunan = db.satu("SELECT skor_kondisi, tervalidasi FROM analisis_bangunan WHERE properti_id = ?", (properti["id"],))
    estimasi = db.satu("SELECT total FROM estimasi_biaya WHERE properti_id = ?", (properti["id"],))
    foto = db.satu(
        "SELECT nama_berkas FROM foto_bangunan WHERE properti_id = ? ORDER BY (area = 'fasad') DESC, id LIMIT 1",
        (properti["id"],),
    )
    jumlah_foto = db.nilai("SELECT COUNT(*) FROM foto_bangunan WHERE properti_id = ?", (properti["id"],))
    terbuka = bool(properti["laporan_terbuka"])
    tahap = tentukan_tahap(properti, jumlah_foto, bangunan, ambil_inspeksi_aktif(properti["id"]))
    data = {k: v for k, v in properti.items() if k != "data_survei"}
    return {
        **data,
        "tahap": {k: tahap[k] for k in ("kode", "label", "urutan", "langkah")},
        "jumlah_foto": jumlah_foto,
        "skor_lokasi": lok["skor_total"] if lok else None,
        "kategori_lokasi": lok["hasil"]["kategori"] if lok else None,
        "skor_kondisi": bangunan["skor_kondisi"] if bangunan and terbuka else None,
        "estimasi_renovasi": estimasi["total"] if estimasi and terbuka else None,
        "foto_sampul": url_foto(foto["nama_berkas"]) if foto else None,
    }
