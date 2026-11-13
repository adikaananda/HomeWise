import json

from flask import Blueprint, request

from .. import db
from ..keamanan import pengguna_aktif, wajib_login
from ..layanan import midtrans
from ..layanan import pembayaran as layanan_bayar
from ..respon import GalatAplikasi, sukses
from ..validasi import SkemaPembayaran, SkemaSimulasiBayar, baca_json

bp = Blueprint("pembayaran", __name__, url_prefix="/api/pembayaran")


def _milik_pengguna(order_id):
    pembayaran = layanan_bayar.ambil(order_id)
    pengguna = pengguna_aktif()
    if not pembayaran or (pembayaran["pengguna_id"] != pengguna["id"] and pengguna["peran"] != "admin"):
        raise GalatAplikasi("Transaksi tidak ditemukan.", 404)
    return pembayaran


def _publik(pembayaran):
    return {k: v for k, v in pembayaran.items() if k not in ("payload_terakhir", "manfaat_diterapkan")}


@bp.post("")
@wajib_login()
def buat():
    data = baca_json(SkemaPembayaran)
    return sukses(_publik(layanan_bayar.buat(pengguna_aktif(), data.paket, data.properti_id)), 201)


@bp.get("")
@wajib_login()
def riwayat():
    baris = db.banyak(
        """SELECT b.*, p.nama AS properti_nama FROM pembayaran b LEFT JOIN properti p ON p.id = b.properti_id
           WHERE b.pengguna_id = ? ORDER BY b.id DESC""",
        (pengguna_aktif()["id"],),
    )
    return sukses([_publik(b) for b in baris])


@bp.get("/<order_id>")
@wajib_login()
def detail(order_id):
    return sukses(_publik(_milik_pengguna(order_id)))


@bp.post("/<order_id>/sinkron")
@wajib_login()
def sinkron(order_id):
    pembayaran = _milik_pengguna(order_id)
    if pembayaran["mode"] != "midtrans" or midtrans.mode() != "midtrans":
        return sukses(_publik(pembayaran))
    try:
        status = midtrans.cek_status(order_id)
    except Exception:
        raise GalatAplikasi("Status Midtrans belum bisa diambil. Coba lagi sebentar.", 502)
    if str(status.get("status_code")) == "404":
        return sukses(_publik(pembayaran))
    hasil = layanan_bayar.perbarui_status(order_id, midtrans.terjemahkan_status(status), status.get("payment_type"), json.dumps(status))
    return sukses(_publik(hasil))


@bp.post("/<order_id>/simulasi")
@wajib_login()
def simulasi(order_id):
    pembayaran = _milik_pengguna(order_id)
    if pembayaran["mode"] != "simulasi":
        raise GalatAplikasi("Simulasi hanya tersedia untuk transaksi mode simulasi.", 403)
    data = baca_json(SkemaSimulasiBayar)
    hasil = layanan_bayar.perbarui_status(order_id, data.status, "simulasi")
    return sukses(_publik(hasil))


@bp.post("/notifikasi")
def notifikasi():
    data = request.get_json(silent=True) or {}
    if midtrans.mode() != "midtrans" or not midtrans.tanda_tangan_valid(data):
        raise GalatAplikasi("Tanda tangan notifikasi tidak valid.", 403)
    pembayaran = layanan_bayar.ambil(data.get("order_id", ""))
    if not pembayaran:
        raise GalatAplikasi("Transaksi tidak ditemukan.", 404)
    if int(float(data.get("gross_amount", 0))) != pembayaran["jumlah"]:
        raise GalatAplikasi("Nominal transaksi tidak sesuai.", 400)
    layanan_bayar.perbarui_status(pembayaran["order_id"], midtrans.terjemahkan_status(data), data.get("payment_type"), json.dumps(data))
    return sukses(pesan="Notifikasi diterima.")
