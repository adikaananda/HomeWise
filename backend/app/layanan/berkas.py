import uuid
from pathlib import Path

from flask import current_app
from PIL import Image, UnidentifiedImageError

from ..respon import GalatAplikasi

EKSTENSI = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}
MAKS_FOTO_PER_UNGGAH = 10


def simpan_foto(berkas):
    try:
        gambar = Image.open(berkas.stream)
        format_asli = gambar.format
        gambar.verify()
    except (UnidentifiedImageError, OSError):
        raise GalatAplikasi(f"Berkas '{berkas.filename}' bukan gambar yang valid.", 422)
    if format_asli not in EKSTENSI:
        raise GalatAplikasi("Format foto harus JPG, PNG, atau WEBP.", 422)

    nama = f"{uuid.uuid4().hex}.{EKSTENSI[format_asli]}"
    berkas.stream.seek(0)
    berkas.save(Path(current_app.config["DIR_UNGGAHAN"]) / nama)
    return nama


def ambil_daftar_foto(request):
    daftar = [f for f in request.files.getlist("foto") if f and f.filename]
    if not daftar:
        raise GalatAplikasi("Pilih minimal satu foto.", 422)
    if len(daftar) > MAKS_FOTO_PER_UNGGAH:
        raise GalatAplikasi(f"Maksimal {MAKS_FOTO_PER_UNGGAH} foto sekali unggah.", 422)
    return daftar


def hapus_berkas(nama):
    jalur = Path(current_app.config["DIR_UNGGAHAN"]) / nama
    if jalur.exists():
        jalur.unlink()
