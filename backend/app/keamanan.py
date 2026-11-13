from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import current_app, g, request
from werkzeug.security import check_password_hash, generate_password_hash

from . import db
from .respon import GalatAplikasi


def hash_sandi(sandi):
    return generate_password_hash(sandi)


def cocokkan_sandi(hash_tersimpan, sandi):
    return check_password_hash(hash_tersimpan, sandi)


def buat_token(pengguna):
    sekarang = datetime.now(timezone.utc)
    muatan = {
        "sub": str(pengguna["id"]),
        "peran": pengguna["peran"],
        "iat": sekarang,
        "exp": sekarang + timedelta(hours=current_app.config["JWT_KEDALUWARSA_JAM"]),
    }
    return jwt.encode(muatan, current_app.config["SECRET_KEY"], algorithm="HS256")


def _baca_token():
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header[7:]
    return request.args.get("token")


def pengguna_aktif():
    return getattr(g, "pengguna", None)


def wajib_login(*peran_diizinkan):
    def dekorator(fungsi):
        @wraps(fungsi)
        def pembungkus(*args, **kwargs):
            token = _baca_token()
            if not token:
                raise GalatAplikasi("Silakan masuk terlebih dahulu.", 401)
            try:
                muatan = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
            except jwt.ExpiredSignatureError:
                raise GalatAplikasi("Sesi Anda sudah berakhir. Silakan masuk kembali.", 401)
            except jwt.InvalidTokenError:
                raise GalatAplikasi("Token tidak valid.", 401)

            pengguna = db.satu("SELECT * FROM pengguna WHERE id = ?", (int(muatan["sub"]),))
            if not pengguna or not pengguna["aktif"]:
                raise GalatAplikasi("Akun tidak ditemukan atau dinonaktifkan.", 401)
            if peran_diizinkan and pengguna["peran"] not in peran_diizinkan:
                raise GalatAplikasi("Anda tidak memiliki akses ke fitur ini.", 403)

            g.pengguna = pengguna
            return fungsi(*args, **kwargs)

        return pembungkus

    return dekorator


def profil_publik(pengguna):
    return {k: pengguna[k] for k in ("id", "nama", "email", "peran", "telepon", "perusahaan", "kredit_laporan", "dibuat")}
