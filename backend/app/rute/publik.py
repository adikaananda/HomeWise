from pathlib import Path

from flask import Blueprint, current_app, send_from_directory

from ..layanan import ai_klien, lokasi, midtrans, penjelasan
from ..layanan.konstanta import (
    AREA_FOTO,
    INDIKATOR,
    JENIS_KERUSAKAN,
    KATEGORI_FASILITAS,
    PAKET,
    PERTANYAAN_SURVEI,
    PRIORITAS,
    SUMBER_FOTO,
    TUJUAN,
)
from ..keamanan import batasi_laju
from ..respon import GalatAplikasi, sukses
from ..validasi import SkemaCekCepat, baca_json

bp = Blueprint("publik", __name__, url_prefix="/api")


@bp.get("/kesehatan")
def kesehatan():
    mode_ai = current_app.config["AI_MODE"]
    if mode_ai == "remote" and not current_app.config["AI_BASE_URL"]:
        mode_ai = "simulasi"
    return sukses({
        "status": "sehat",
        "mode_ai": mode_ai,
        "mode_pembayaran": midtrans.mode(),
    })


@bp.get("/konfigurasi")
def konfigurasi():
    return sukses({
        "tujuan": [{"kode": k, **v} for k, v in TUJUAN.items()],
        "indikator": INDIKATOR,
        "kategori_fasilitas": KATEGORI_FASILITAS,
        "jenis_kerusakan": JENIS_KERUSAKAN,
        "area_foto": AREA_FOTO,
        "sumber_foto": SUMBER_FOTO,
        "pertanyaan_survei": PERTANYAAN_SURVEI,
        "prioritas": PRIORITAS,
        "paket": [{"kode": k, **v} for k, v in PAKET.items()],
        "midtrans": {
            "mode": midtrans.mode(),
            "client_key": current_app.config["MIDTRANS_CLIENT_KEY"],
            "produksi": current_app.config["MIDTRANS_PRODUCTION"],
        },
    })


@bp.post("/cek-cepat")
@batasi_laju(20)
def cek_cepat():
    data = baca_json(SkemaCekCepat)
    mentah, sumber = ai_klien.analisis_lokasi(data.lat, data.lng, data.alamat)
    hasil = lokasi.nilai_kelayakan(mentah, data.tujuan)
    return sukses({
        "skor_total": hasil["skor_total"],
        "kategori": hasil["kategori"],
        "indikator": hasil["indikator"],
        "risiko": {k: v["level"] for k, v in mentah["risiko"].items()},
        "fasilitas_terdekat": mentah["fasilitas"][:4],
        "ringkasan": penjelasan.ringkasan_lokasi(hasil, data.tujuan),
        "sumber": sumber,
    })


@bp.get("/berkas/<path:nama>")
def berkas(nama):
    if "/" in nama or ".." in nama:
        raise GalatAplikasi("Berkas tidak ditemukan.", 404)
    folder = Path(current_app.config["DIR_UNGGAHAN"])
    if not (folder / nama).exists():
        raise GalatAplikasi("Berkas tidak ditemukan.", 404)
    return send_from_directory(folder, nama, max_age=86400)
