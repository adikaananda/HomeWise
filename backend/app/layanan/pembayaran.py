from .. import db
from ..respon import GalatAplikasi
from . import midtrans
from .konstanta import PAKET


def buat(pengguna, paket, properti_id=None):
    info = PAKET[paket]
    if info["butuh_properti"]:
        if not properti_id:
            raise GalatAplikasi("Pilih properti untuk paket ini.", 422)
        properti = db.satu("SELECT * FROM properti WHERE id = ? AND pengguna_id = ?", (properti_id, pengguna["id"]))
        if not properti:
            raise GalatAplikasi("Properti tidak ditemukan.", 404)
        if paket == "laporan_tunggal" and properti["laporan_terbuka"]:
            raise GalatAplikasi("Laporan properti ini sudah terbuka.", 409)
        if paket == "inspeksi_profesional":
            aktif = db.satu(
                "SELECT id FROM inspeksi WHERE properti_id = ? AND status NOT IN ('tervalidasi', 'dibatalkan')",
                (properti_id,),
            )
            if aktif:
                raise GalatAplikasi("Inspeksi untuk properti ini sedang berjalan.", 409)
    else:
        properti_id = None

    order_id = midtrans.buat_order_id()
    transaksi = midtrans.buat_transaksi(order_id, info["harga"], info["nama"], pengguna)
    db.simpan("pembayaran", {
        "order_id": order_id,
        "pengguna_id": pengguna["id"],
        "properti_id": properti_id,
        "paket": paket,
        "jumlah": info["harga"],
        "mode": midtrans.mode(),
        "snap_token": transaksi["token"],
        "redirect_url": transaksi["redirect_url"],
    })
    return ambil(order_id)


def ambil(order_id):
    return db.satu(
        """SELECT b.*, p.nama AS properti_nama FROM pembayaran b
           LEFT JOIN properti p ON p.id = b.properti_id WHERE b.order_id = ?""",
        (order_id,),
    )


def perbarui_status(order_id, status, metode=None, payload=None):
    pembayaran = ambil(order_id)
    if not pembayaran:
        raise GalatAplikasi("Transaksi tidak ditemukan.", 404)
    if pembayaran["status"] == "lunas" and status != "lunas":
        return pembayaran

    db.perbarui("pembayaran", pembayaran["id"], {
        "status": status,
        "metode": metode or pembayaran["metode"],
        "payload_terakhir": payload,
        "diperbarui": db.sekarang(),
    })
    if status == "lunas":
        _terapkan_manfaat(pembayaran)
    return ambil(order_id)


def _terapkan_manfaat(pembayaran):
    terkunci = db.ambil_koneksi().execute(
        "UPDATE pembayaran SET manfaat_diterapkan = 1 WHERE id = ? AND manfaat_diterapkan = 0",
        (pembayaran["id"],),
    )
    db.ambil_koneksi().commit()
    if terkunci.rowcount == 0:
        return

    if pembayaran["paket"] == "paket_hemat":
        db.eksekusi("UPDATE pengguna SET kredit_laporan = kredit_laporan + 5 WHERE id = ?", (pembayaran["pengguna_id"],))
        return
    if pembayaran["paket"] == "paket_komparasi":
        db.eksekusi("UPDATE pengguna SET kredit_laporan = kredit_laporan + 3 WHERE id = ?", (pembayaran["pengguna_id"],))
        return

    if pembayaran["properti_id"]:
        db.eksekusi("UPDATE properti SET laporan_terbuka = 1 WHERE id = ?", (pembayaran["properti_id"],))

    if pembayaran["paket"] == "inspeksi_profesional" and pembayaran["properti_id"]:
        db.simpan("inspeksi", {
            "properti_id": pembayaran["properti_id"],
            "pemohon_id": pembayaran["pengguna_id"],
            "status": "menunggu",
        })
