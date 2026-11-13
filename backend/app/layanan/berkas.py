import uuid
from pathlib import Path

from flask import current_app
from PIL import Image, ImageOps, UnidentifiedImageError

from ..respon import GalatAplikasi
from .konstanta import AREA_FOTO

FORMAT_DITERIMA = {"JPEG", "PNG", "WEBP", "MPO"}
MAKS_FOTO_PER_UNGGAH = 10
SISI_TERPANJANG = 2000
Image.MAX_IMAGE_PIXELS = 60_000_000


def simpan_foto(berkas):
    try:
        gambar = Image.open(berkas.stream)
        if gambar.format not in FORMAT_DITERIMA:
            raise GalatAplikasi("Format foto harus JPG, PNG, atau WEBP.", 422)
        gambar.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise GalatAplikasi(f"Berkas '{berkas.filename}' bukan gambar yang valid.", 422)

    gambar = ImageOps.exif_transpose(gambar).convert("RGB")
    gambar.thumbnail((SISI_TERPANJANG, SISI_TERPANJANG))
    nama = f"{uuid.uuid4().hex}.jpg"
    gambar.save(Path(current_app.config["DIR_UNGGAHAN"]) / nama, "JPEG", quality=85, optimize=True)
    return nama


def ambil_daftar_foto(request):
    daftar = [f for f in request.files.getlist("foto") if f and f.filename]
    if not daftar:
        raise GalatAplikasi("Pilih minimal satu foto.", 422)
    if len(daftar) > MAKS_FOTO_PER_UNGGAH:
        raise GalatAplikasi(f"Maksimal {MAKS_FOTO_PER_UNGGAH} foto sekali unggah.", 422)
    return daftar


def baca_area(nilai):
    kode_valid = {a["kode"] for a in AREA_FOTO}
    return nilai if nilai in kode_valid else "lainnya"


def baca_sumber(nilai):
    return "iklan" if nilai == "iklan" else "survei"


def hapus_berkas(nama):
    jalur = Path(current_app.config["DIR_UNGGAHAN"]) / nama
    if jalur.exists():
        jalur.unlink()
