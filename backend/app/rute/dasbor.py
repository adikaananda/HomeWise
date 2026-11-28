from flask import Blueprint, request

from .. import db
from ..keamanan import pengguna_aktif, profil_publik, wajib_login
from ..layanan import properti as layanan_properti
from ..respon import sukses

bp = Blueprint("dasbor", __name__, url_prefix="/api/dasbor")


URUTAN_LEVEL = {"rendah": 0, "sedang": 1, "tinggi": 2}


def _fokus(pengguna, daftar, ringkas):
    """Ringkasan intelijen untuk satu properti fokus: pilihan ?fokus=, pilihan utama, atau analisis paling lengkap."""
    if not daftar:
        return None
    diminta = request.args.get("fokus", type=int)
    properti = next((p for p in daftar if p["id"] == diminta), None) or next((p for p in daftar if p["pilihan_utama"]), None)
    if properti is None:
        tahap = {r["id"]: r["tahap"]["urutan"] for r in ringkas}
        properti = max(daftar, key=lambda p: (tahap.get(p["id"], 0), p["diperbarui"] or ""))
    d = layanan_properti.detail_lengkap(properti, pengguna)
    lok = d.get("lokasi") or {}
    hasil = lok.get("hasil") or {}
    data = lok.get("data") or {}
    risiko = data.get("risiko") or {}
    terburuk = max((v.get("level", "rendah") for v in risiko.values()), key=lambda l: URUTAN_LEVEL.get(l, 0), default=None)
    pn = d.get("penilaian") or {}
    bangunan = d.get("bangunan") or {}
    biaya = d.get("biaya") or {}
    inv = d.get("investasi") or {}
    p = d["properti"]
    return {
        "properti": {k: p.get(k) for k in ("id", "nama", "alamat", "lat", "lng", "harga_penawaran", "luas_tanah", "luas_bangunan",
                                            "tujuan", "jenis_properti", "pilihan_utama", "tersimpan")},
        "tahap": d["tahap"],
        "akses_premium": d["akses_premium"],
        "lokasi": {
            "skor": hasil.get("skor_total"),
            "kategori": hasil.get("kategori"),
            "ringkasan": hasil.get("ringkasan"),
            "indikator": hasil.get("indikator", []),
            "risiko": risiko,
            "risiko_terburuk": terburuk,
            "aksesibilitas": data.get("aksesibilitas"),
            "fasilitas": (data.get("fasilitas") or [])[:12],
            "jumlah_fasilitas": len(data.get("fasilitas") or []),
            "pendukung": hasil.get("faktor_pendukung", [])[:4],
            "risiko_lain": hasil.get("risiko", [])[:4],
        } if hasil else None,
        "bangunan": None if not bangunan or bangunan.get("terkunci") else {
            "skor_kondisi": bangunan.get("skor_kondisi"),
            "jumlah_temuan": len(bangunan.get("temuan") or []),
            "ringkasan": bangunan.get("ringkasan"),
            "tervalidasi": bangunan.get("tervalidasi"),
        },
        "bangunan_terkunci": bool(bangunan.get("terkunci")),
        "biaya": {"total": biaya.get("total"), "per_prioritas": biaya.get("per_prioritas", [])} if biaya else None,
        "investasi": {k: inv.get(k) for k in ("harga_penawaran", "renovasi", "biaya_transaksi", "total", "total_minimum", "ringkasan")} if inv else None,
        "nilai": {
            "positif": pn.get("positif", [])[:4],
            "negatif": pn.get("negatif", [])[:4],
            "kelengkapan": pn.get("kelengkapan"),
        } if pn else None,
        "rekomendasi": (d.get("rekomendasi") or [])[:4],
    }


@bp.get("")
@wajib_login()
def ringkasan():
    pengguna = pengguna_aktif()
    properti = db.banyak("SELECT * FROM properti WHERE pengguna_id = ? ORDER BY diperbarui DESC", (pengguna["id"],))
    ringkas = [layanan_properti.ringkas_untuk_daftar(p) for p in properti]
    skor = [p["skor_lokasi"] for p in ringkas if p["skor_lokasi"] is not None]
    return sukses({
        "pengguna": profil_publik(pengguna),
        "statistik": {
            "total_properti": len(ringkas),
            "laporan_terbuka": sum(1 for p in ringkas if p["laporan_terbuka"]),
            "rata_skor_lokasi": round(sum(skor) / len(skor), 1) if skor else None,
            "inspeksi_aktif": db.nilai(
                "SELECT COUNT(*) FROM inspeksi WHERE pemohon_id = ? AND status NOT IN ('tervalidasi', 'dibatalkan')",
                (pengguna["id"],),
            ),
        },
        "properti_terbaru": ringkas[:6],
        "peta": [
            {k: p.get(k) for k in ("id", "nama", "lat", "lng", "skor_lokasi", "kategori_lokasi", "pilihan_utama", "tersimpan")}
            for p in ringkas if p.get("lat") is not None
        ],
        "fokus": _fokus(pengguna, properti, ringkas),
        "pembayaran_terbaru": db.banyak(
            "SELECT order_id, paket, jumlah, status, dibuat FROM pembayaran WHERE pengguna_id = ? ORDER BY id DESC LIMIT 4",
            (pengguna["id"],),
        ),
    })
