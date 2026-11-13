import time
from pathlib import Path

import requests
from flask import current_app

from .. import db
from ..respon import GalatAplikasi
from . import penjelasan, simulasi_ai
from .konstanta import JENIS_KERUSAKAN


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


KUNCI_LOKASI = ("risiko", "topografi", "aksesibilitas", "fasilitas")
TINGKAT_VALID = ("ringan", "sedang", "berat")


def _periksa_lokasi(data):
    if not isinstance(data, dict) or any(k not in data for k in KUNCI_LOKASI):
        raise ValueError("Respons /lokasi tidak memuat risiko, topografi, aksesibilitas, dan fasilitas.")
    for nama in ("banjir", "longsor", "gempa"):
        if nama not in data["risiko"]:
            raise ValueError(f"Respons /lokasi tidak memuat risiko {nama}.")
    data.setdefault("karakter_kawasan", "-")
    data.setdefault("keterbatasan_data", [])
    return data


def _bersihkan_temuan(data):
    hasil = []
    for t in (data or {}).get("temuan", []):
        try:
            luas = float(t.get("luas_m2") or 0)
        except (TypeError, ValueError):
            continue
        if t.get("jenis") not in JENIS_KERUSAKAN or t.get("tingkat") not in TINGKAT_VALID or luas <= 0:
            continue
        hasil.append({
            "jenis": t["jenis"],
            "tingkat": t["tingkat"],
            "kepercayaan": round(min(1.0, max(0.0, float(t.get("kepercayaan") or 0))), 2),
            "luas_m2": round(min(luas, 1000.0), 1),
            "foto_id": t.get("foto_id"),
            "kotak": t.get("kotak") if isinstance(t.get("kotak"), dict) else None,
        })
    return {"temuan": hasil}


def analisis_lokasi(lat, lng, alamat=None, properti_id=None):
    mulai = time.perf_counter()
    mode = _mode()
    try:
        if mode == "remote":
            data = _periksa_lokasi(_post("/lokasi", json={"lat": lat, "lng": lng, "alamat": alamat, "radius_m": 5000}))
        else:
            data = simulasi_ai.analisis_lokasi(lat, lng, alamat)
        _catat(properti_id, "lokasi", "berhasil", mode, mulai)
        return data, mode
    except (requests.RequestException, ValueError) as e:
        _catat(properti_id, "lokasi", "gagal", mode, mulai, str(e)[:300])
        raise GalatAplikasi("Layanan analisis lokasi sedang tidak tersedia. Coba beberapa saat lagi.", 503)


def analisis_foto(daftar_foto, properti_id=None):
    mulai = time.perf_counter()
    mode = _mode()
    try:
        if mode == "remote":
            dir_unggahan = Path(current_app.config["DIR_UNGGAHAN"])
            berkas = [("foto", (f["nama_berkas"], open(dir_unggahan / f["nama_berkas"], "rb"))) for f in daftar_foto]
            try:
                data = _post("/kondisi-bangunan", files=berkas, data={
                    "foto_id": ",".join(str(f["id"]) for f in daftar_foto),
                    "area": ",".join(f.get("area") or "lainnya" for f in daftar_foto),
                })
            finally:
                for _, (_, pegangan) in berkas:
                    pegangan.close()
        else:
            data = simulasi_ai.analisis_foto(daftar_foto)
        _catat(properti_id, "bangunan", "berhasil", mode, mulai)
        return _bersihkan_temuan(data), mode
    except (requests.RequestException, ValueError) as e:
        _catat(properti_id, "bangunan", "gagal", mode, mulai, str(e)[:300])
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
