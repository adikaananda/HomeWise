from flask import Blueprint

from .. import db
from ..keamanan import pengguna_aktif, profil_publik, wajib_login
from ..layanan import properti as layanan_properti
from ..respon import sukses

bp = Blueprint("dasbor", __name__, url_prefix="/api/dasbor")


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
        "pembayaran_terbaru": db.banyak(
            "SELECT order_id, paket, jumlah, status, dibuat FROM pembayaran WHERE pengguna_id = ? ORDER BY id DESC LIMIT 4",
            (pengguna["id"],),
        ),
    })
