import sys
import time
from pathlib import Path

import requests
from flask import current_app

from .. import db
from ..respon import GalatAplikasi
from . import llm_openrouter, lokasi_asli, penjelasan, simulasi_ai
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


def _bersihkan_poligon(poligon):
    if not isinstance(poligon, (list, tuple)) or len(poligon) < 3:
        return None
    titik = []
    for p in poligon[:64]:
        try:
            if isinstance(p, dict):
                x, y = float(p["x"]), float(p["y"])
            elif isinstance(p, (list, tuple)) and len(p) >= 2:
                x, y = float(p[0]), float(p[1])
            else:
                continue
        except (KeyError, TypeError, ValueError):
            continue
        titik.append([round(min(1.0, max(0.0, x)), 3), round(min(1.0, max(0.0, y)), 3)])
    return titik if len(titik) >= 3 else None


def _bersihkan_poligon_jamak(daftar):
    if not isinstance(daftar, (list, tuple)):
        return None
    hasil = []
    for p in daftar[:8]:
        bersih = _bersihkan_poligon(p)
        if bersih:
            hasil.append(bersih)
    return hasil or None


def _bersihkan_temuan(data):
    hasil = []
    for t in (data or {}).get("temuan", []):
        try:
            luas = float(t.get("luas_m2") or 0)
        except (TypeError, ValueError):
            continue
        if t.get("jenis") not in JENIS_KERUSAKAN or t.get("tingkat") not in TINGKAT_VALID or luas <= 0:
            continue
        poligon_list = _bersihkan_poligon_jamak(t.get("poligon_list"))
        poligon = _bersihkan_poligon(t.get("poligon")) or (poligon_list[0] if poligon_list else None)
        hasil.append({
            "jenis": t["jenis"],
            "tingkat": t["tingkat"],
            "kepercayaan": round(min(1.0, max(0.0, float(t.get("kepercayaan") or 0))), 2),
            "luas_m2": round(min(luas, 1000.0), 1),
            "foto_id": t.get("foto_id"),
            "kotak": t.get("kotak") if isinstance(t.get("kotak"), dict) else None,
            "poligon": poligon,
            "poligon_list": poligon_list,
        })
    return {"temuan": hasil}


def analisis_lokasi(lat, lng, alamat=None, properti_id=None):
    mulai = time.perf_counter()
    mode = _mode()
    try:
        if mode == "remote":
            data = _periksa_lokasi(_post("/lokasi", json={"lat": lat, "lng": lng, "alamat": alamat, "radius_m": 5000}))
        elif mode == "asli":
            data = lokasi_asli.analisis_lokasi(lat, lng, alamat)
        else:
            data = simulasi_ai.analisis_lokasi(lat, lng, alamat)
        _catat(properti_id, "lokasi", "berhasil", mode, mulai)
        return data, mode
    except (requests.RequestException, ValueError) as e:
        _catat(properti_id, "lokasi", "gagal", mode, mulai, str(e)[:300])
        raise GalatAplikasi("Layanan analisis lokasi sedang tidak tersedia. Coba beberapa saat lagi.", 503)


def _prediksi_model_lokal(daftar_foto, dir_unggahan):
    akar = str(Path(__file__).resolve().parents[3])
    if akar not in sys.path:
        sys.path.insert(0, akar)
    try:
        from model_klasifikasi import prediksi as model_prediksi
    except ImportError:
        return None
    if not model_prediksi.model_tersedia():
        return None
    return model_prediksi.analisis_foto(daftar_foto, dir_unggahan)


def analisis_foto(daftar_foto, properti_id=None):
    mulai = time.perf_counter()
    mode = _mode()
    sumber = mode
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
        elif mode == "asli":
            hasil_model = _prediksi_model_lokal(daftar_foto, Path(current_app.config["DIR_UNGGAHAN"]))
            if hasil_model is not None:
                data = hasil_model
            else:
                sumber = "simulasi"
                data = simulasi_ai.analisis_foto(daftar_foto)
        else:
            sumber = "simulasi"
            data = simulasi_ai.analisis_foto(daftar_foto)
        _catat(properti_id, "bangunan", "berhasil", sumber, mulai)
        return _bersihkan_temuan(data), sumber
    except (requests.RequestException, ValueError) as e:
        _catat(properti_id, "bangunan", "gagal", sumber, mulai, str(e)[:300])
        raise GalatAplikasi("Layanan analisis foto sedang tidak tersedia. Coba beberapa saat lagi.", 503)


def susun_penjelasan(jenis, konteks):
    if _mode() == "remote":
        try:
            return _post("/penjelasan", json={"jenis": jenis, "konteks": konteks}).get("teks")
        except requests.RequestException:
            current_app.logger.warning("Penjelasan LLM gagal, memakai templat bawaan.")

    if llm_openrouter.aktif():
        teks = llm_openrouter.susun_teks(jenis, konteks)
        if teks:
            return teks

    if jenis == "lokasi":
        return penjelasan.ringkasan_lokasi(konteks["hasil"], konteks["tujuan"])
    if jenis == "bangunan":
        return penjelasan.ringkasan_bangunan(konteks["temuan"], konteks["skor_kondisi"])
    if jenis == "investasi":
        return penjelasan.ringkasan_investasi(konteks["investasi"])
    return ""
