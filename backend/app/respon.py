from flask import jsonify
from pydantic import ValidationError
from werkzeug.exceptions import HTTPException


class GalatAplikasi(Exception):
    def __init__(self, pesan, status=400, detail=None):
        super().__init__(pesan)
        self.pesan = pesan
        self.status = status
        self.detail = detail


def sukses(data=None, status=200, pesan=None):
    isi = {"sukses": True, "data": data}
    if pesan:
        isi["pesan"] = pesan
    return jsonify(isi), status


def gagal(pesan, status=400, detail=None):
    isi = {"sukses": False, "pesan": pesan}
    if detail:
        isi["detail"] = detail
    return jsonify(isi), status


def daftarkan_penangan_galat(app):
    @app.errorhandler(GalatAplikasi)
    def _galat_aplikasi(e):
        return gagal(e.pesan, e.status, e.detail)

    @app.errorhandler(ValidationError)
    def _galat_validasi(e):
        detail = {".".join(str(x) for x in err["loc"]): err["msg"] for err in e.errors()}
        return gagal("Data yang dikirim belum valid.", 422, detail)

    @app.errorhandler(HTTPException)
    def _galat_http(e):
        pesan = {
            404: "Sumber daya tidak ditemukan.",
            405: "Metode tidak diizinkan.",
            413: "Ukuran berkas terlalu besar.",
        }.get(e.code, e.description)
        return gagal(pesan, e.code)

    @app.errorhandler(Exception)
    def _galat_umum(e):
        app.logger.exception(e)
        return gagal("Terjadi kesalahan pada server.", 500)
