from flask import Blueprint

from .. import db
from ..keamanan import buat_token, cocokkan_sandi, hash_sandi, pengguna_aktif, profil_publik, wajib_login
from ..respon import GalatAplikasi, sukses
from ..validasi import SkemaDaftar, SkemaMasuk, SkemaProfil, baca_json

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/daftar")
def daftar():
    data = baca_json(SkemaDaftar)
    if db.satu("SELECT id FROM pengguna WHERE email = ?", (data.email,)):
        raise GalatAplikasi("Email sudah terdaftar. Silakan masuk.", 409)
    id_baru = db.simpan("pengguna", {
        "nama": data.nama.strip(),
        "email": data.email,
        "sandi_hash": hash_sandi(data.sandi),
        "telepon": data.telepon,
        "perusahaan": data.perusahaan,
    })
    pengguna = db.satu("SELECT * FROM pengguna WHERE id = ?", (id_baru,))
    return sukses({"token": buat_token(pengguna), "pengguna": profil_publik(pengguna)}, 201)


@bp.post("/masuk")
def masuk():
    data = baca_json(SkemaMasuk)
    pengguna = db.satu("SELECT * FROM pengguna WHERE email = ?", (data.email,))
    if not pengguna or not cocokkan_sandi(pengguna["sandi_hash"], data.sandi):
        raise GalatAplikasi("Email atau kata sandi salah.", 401)
    if not pengguna["aktif"]:
        raise GalatAplikasi("Akun Anda dinonaktifkan. Hubungi admin HomeWise.", 403)
    return sukses({"token": buat_token(pengguna), "pengguna": profil_publik(pengguna)})


@bp.get("/saya")
@wajib_login()
def saya():
    return sukses(profil_publik(pengguna_aktif()))


@bp.patch("/saya")
@wajib_login()
def ubah_profil():
    data = baca_json(SkemaProfil).model_dump(exclude_none=True)
    db.perbarui("pengguna", pengguna_aktif()["id"], data)
    return sukses(profil_publik(db.satu("SELECT * FROM pengguna WHERE id = ?", (pengguna_aktif()["id"],))))
