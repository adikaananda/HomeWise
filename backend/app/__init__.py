from pathlib import Path

from flask import Flask, request, send_from_directory

from . import db
from .konfigurasi import Konfigurasi
from .respon import daftarkan_penangan_galat
from .rute import admin, auth, dasbor, inspeksi, pembayaran, properti, publik


def buat_aplikasi(konfigurasi_tambahan=None):
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Konfigurasi)
    if konfigurasi_tambahan:
        app.config.update(konfigurasi_tambahan)

    db.inisialisasi_db(app)
    app.teardown_appcontext(db.tutup_koneksi)
    daftarkan_penangan_galat(app)

    for modul in (auth, publik, dasbor, properti, pembayaran, inspeksi, admin):
        app.register_blueprint(modul.bp)

    _pasang_cors(app)
    _sajikan_frontend(app)

    if app.config["SEED_OTOMATIS"]:
        from .seed import isi_data_awal
        with app.app_context():
            isi_data_awal()

    return app


def _pasang_cors(app):
    @app.after_request
    def tambah_header(respon):
        asal = request.headers.get("Origin")
        if asal and (asal in app.config["CORS_ORIGINS"] or "*" in app.config["CORS_ORIGINS"]):
            respon.headers["Access-Control-Allow-Origin"] = asal
            respon.headers["Vary"] = "Origin"
            respon.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
            respon.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        return respon

    @app.before_request
    def preflight():
        if request.method == "OPTIONS":
            return app.make_default_options_response()


def _sajikan_frontend(app):
    folder = Path(app.config["DIR_FRONTEND"])

    @app.get("/", defaults={"jalur": ""})
    @app.get("/<path:jalur>")
    def frontend(jalur):
        if jalur.startswith("api/") or not folder.exists():
            return {"sukses": False, "pesan": "Sumber daya tidak ditemukan."}, 404
        if jalur and (folder / jalur).is_file():
            return send_from_directory(folder, jalur)
        return send_from_directory(folder, "index.html")
