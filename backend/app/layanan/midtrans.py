import base64
import hashlib
import hmac
import uuid

import requests
from flask import current_app

from ..respon import GalatAplikasi

PETA_STATUS = {
    "capture": "lunas",
    "settlement": "lunas",
    "pending": "menunggu",
    "deny": "gagal",
    "failure": "gagal",
    "cancel": "dibatalkan",
    "expire": "kedaluwarsa",
}


def mode():
    return "midtrans" if current_app.config["MIDTRANS_SERVER_KEY"] else "simulasi"


def _basis_snap():
    if current_app.config["MIDTRANS_PRODUCTION"]:
        return "https://app.midtrans.com/snap/v1/transactions"
    return "https://app.sandbox.midtrans.com/snap/v1/transactions"


def _basis_api():
    if current_app.config["MIDTRANS_PRODUCTION"]:
        return "https://api.midtrans.com/v2"
    return "https://api.sandbox.midtrans.com/v2"


def _header():
    kunci = base64.b64encode(f"{current_app.config['MIDTRANS_SERVER_KEY']}:".encode()).decode()
    return {"Authorization": f"Basic {kunci}", "Accept": "application/json", "Content-Type": "application/json"}


def buat_order_id():
    return f"HW-{uuid.uuid4().hex[:12].upper()}"


def buat_transaksi(order_id, jumlah, nama_item, pengguna):
    if mode() == "simulasi":
        return {"token": f"SIMULASI-{order_id}", "redirect_url": None}

    muatan = {
        "transaction_details": {"order_id": order_id, "gross_amount": jumlah},
        "item_details": [{"id": order_id, "price": jumlah, "quantity": 1, "name": nama_item[:50]}],
        "customer_details": {"first_name": pengguna["nama"], "email": pengguna["email"], "phone": pengguna.get("telepon") or ""},
        "callbacks": {"finish": f"{current_app.config['URL_FRONTEND']}/app/pembayaran/{order_id}"},
    }
    try:
        respon = requests.post(_basis_snap(), json=muatan, headers=_header(), timeout=20)
    except requests.RequestException:
        raise GalatAplikasi("Tidak dapat terhubung ke Midtrans. Coba beberapa saat lagi.", 502)
    if respon.status_code >= 400:
        current_app.logger.error("Midtrans menolak transaksi: %s", respon.text)
        raise GalatAplikasi("Midtrans menolak pembuatan transaksi. Periksa konfigurasi server key.", 502)
    data = respon.json()
    return {"token": data["token"], "redirect_url": data.get("redirect_url")}


def cek_status(order_id):
    respon = requests.get(f"{_basis_api()}/{order_id}/status", headers=_header(), timeout=20)
    respon.raise_for_status()
    return respon.json()


def tanda_tangan_valid(notifikasi):
    mentah = (
        f"{notifikasi.get('order_id', '')}{notifikasi.get('status_code', '')}"
        f"{notifikasi.get('gross_amount', '')}{current_app.config['MIDTRANS_SERVER_KEY']}"
    )
    harapan = hashlib.sha512(mentah.encode()).hexdigest()
    return hmac.compare_digest(harapan, notifikasi.get("signature_key", ""))


def terjemahkan_status(notifikasi):
    status = notifikasi.get("transaction_status")
    if status == "capture" and notifikasi.get("fraud_status") == "challenge":
        return "menunggu"
    return PETA_STATUS.get(status, "menunggu")
