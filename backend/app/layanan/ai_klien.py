import time
from pathlib import Path

import requests
from flask import current_app

from .. import db
from ..respon import GalatAplikasi
from . import lokasi_asli, penjelasan, simulasi_ai


def _mode():
    mode = current_app.config["AI_MODE"]
    if mode == "remote" and not current_app.config["AI_BASE_URL"]:
        return "simulasi"
    return mode


def _header():
    kunci = current_app.config["AI_API_KEY"]
    return {"Authorization": f"Bearer {kunci}"} if kunci else {}


def _catat(properti_id, jenis, status, sumber, mulai, pesan=None):
    db.simpan("log_analisis", {
        "properti_id": properti_id,
        "jenis": jenis,
        "status": status,
        "sumber": sumber,
        "durasi_ms": int((time.perf_counter() - mulai) * 1000),
        "pesan": pesan,
    })


def _post(endpoint, **kwargs):
    url = f"{current_app.config['AI_BASE_URL']}{endpoint}"
    respon = requests.post(url, headers=_header(), timeout=current_app.config["AI_TIMEOUT_DETIK"], **kwargs)
    respon.raise_for_status()
    return respon.json()


def analisis_lokasi(lat, lng, alamat=None, properti_id=None):
    mulai = time.perf_counter()
    mode = _mode()
    try:
        if mode == "remote":
            data = _post("/lokasi", json={"lat": lat, "lng": lng, "alamat": alamat, "radius_m": 5000})
        elif mode == "asli":
            data = lokasi_asli.analisis_lokasi(lat, lng, alamat)
        else:
            data = simulasi_ai.analisis_lokasi(lat, lng, alamat)
        _catat(properti_id, "lokasi", "berhasil", mode, mulai)
        return data, mode
    except requests.RequestException as e:
        _catat(properti_id, "lokasi", "gagal", mode, mulai, str(e)[:300])
        raise GalatAplikasi("Layanan analisis lokasi sedang tidak tersedia. Coba beberapa saat lagi.", 503)


def analisis_foto(daftar_foto, properti_id=None):
    mulai = time.perf_counter()
    mode = _mode()
    sumber = mode
    try:
        if mode == "remote":
            dir_unggahan = Path(current_app.config["DIR_UNGGAHAN"])
            berkas = [("foto", (f["nama_berkas"], open(dir_unggahan / f["nama_berkas"], "rb"))) for f in daftar_foto]
            try:
                data = _post("/kondisi-bangunan", files=berkas, data={"foto_id": ",".join(str(f["id"]) for f in daftar_foto)})
            finally:
                for _, (_, pegangan) in berkas:
                    pegangan.close()
        else:
            sumber = "simulasi"
            data = simulasi_ai.analisis_foto(daftar_foto)
        _catat(properti_id, "bangunan", "berhasil", sumber, mulai)
        return data, sumber
    except requests.RequestException as e:
        _catat(properti_id, "bangunan", "gagal", sumber, mulai, str(e)[:300])
        raise GalatAplikasi("Layanan analisis foto sedang tidak tersedia. Coba beberapa saat lagi.", 503)


def susun_penjelasan(jenis, konteks):
    if _mode() == "remote":
        try:
            return _post("/penjelasan", json={"jenis": jenis, "konteks": konteks}).get("teks")
        except requests.RequestException:
            current_app.logger.warning("Penjelasan LLM gagal, memakai templat bawaan.")

    if jenis == "lokasi":
        return penjelasan.ringkasan_lokasi(konteks["hasil"], konteks["tujuan"])
    if jenis == "bangunan":
        return penjelasan.ringkasan_bangunan(konteks["temuan"], konteks["skor_kondisi"])
    if jenis == "investasi":
        return penjelasan.ringkasan_investasi(konteks["investasi"])
    return ""
