import hashlib
import json
import re

import requests
from flask import current_app

from .. import db
from .konstanta import JENIS_KERUSAKAN, TUJUAN, tentukan_prioritas

PROMPT_SISTEM = (
    "Anda adalah analis properti HomeWise. Tulis ringkasan analisis dalam 2 sampai 3 kalimat "
    "bahasa Indonesia baku (maksimal 65 kata), profesional, lugas, dan tanpa basa-basi. "
    "Gunakan hanya angka dan fakta dari JSON yang diberikan; dilarang mengarang angka, skor, "
    "atau temuan baru. Dilarang memakai bahasa Inggris kecuali istilah baku yang memang ada di "
    "data, dan pertahankan istilah properti Indonesia seperti SHM, SHGB, AJB, IMB/PBG, BPHTB, "
    "atau PPAT bila relevan. Tanpa daftar poin atau markdown. Keluarkan JSON valid persis "
    'berbentuk {"teks": "..."}.'
)


def aktif():
    """Periksa apakah integrasi OpenRouter diaktifkan melalui API key."""
    return bool(current_app.config.get("OPENROUTER_API_KEY"))


def _ringkas_lokasi(konteks):
    hasil = konteks["hasil"]
    tujuan_kode = konteks.get("tujuan") or hasil.get("tujuan")
    info_tujuan = TUJUAN.get(tujuan_kode, {})
    data = konteks.get("data") or {}
    return {
        "tujuan": {"kode": tujuan_kode, "label": info_tujuan.get("label", tujuan_kode)},
        "skor_total": hasil.get("skor_total"),
        "kategori": hasil.get("kategori"),
        "indikator": [
            {"label": i.get("label"), "skor": i.get("skor"), "bobot": i.get("bobot")}
            for i in hasil.get("indikator", [])
        ],
        "faktor_pendukung": [f.get("judul") for f in hasil.get("faktor_pendukung", [])[:4]],
        "risiko": [r.get("judul") for r in hasil.get("risiko", [])[:4]],
        "keterbatasan_data": list(data.get("keterbatasan_data", [])[:3]),
    }


def _ringkas_bangunan(konteks):
    aktif_temuan = [t for t in konteks.get("temuan", []) if t.get("status") != "ditolak"]
    return {
        "skor_kondisi": konteks.get("skor_kondisi"),
        "jumlah_temuan": len(aktif_temuan),
        "temuan": [
            {
                "jenis": JENIS_KERUSAKAN.get(t.get("jenis"), t.get("jenis")),
                "tingkat": t.get("tingkat"),
                "luas_m2": t.get("luas_m2"),
                "prioritas": tentukan_prioritas(t.get("jenis"), t.get("tingkat")),
            }
            for t in aktif_temuan
        ],
    }


def _ringkas_investasi(konteks):
    inv = konteks["investasi"]
    tujuan_kode = konteks.get("tujuan")
    label_tujuan = TUJUAN.get(tujuan_kode, {}).get("label", tujuan_kode) if tujuan_kode else None
    return {
        "tujuan": label_tujuan,
        "harga_penawaran": inv.get("harga_penawaran"),
        "renovasi": inv.get("renovasi"),
        "biaya_transaksi": inv.get("biaya_transaksi"),
        "total": inv.get("total"),
        "total_minimum": inv.get("total_minimum"),
        "rasio_renovasi_persen": inv.get("rasio_renovasi_persen"),
        "harga_per_m2": inv.get("harga_per_m2"),
        "total_per_m2": inv.get("total_per_m2"),
    }


def _ringkas_konteks(jenis, konteks):
    """Susun konteks ringkas tanpa data pribadi pengguna (PII)."""
    if jenis == "lokasi":
        return _ringkas_lokasi(konteks)
    if jenis == "bangunan":
        return _ringkas_bangunan(konteks)
    return _ringkas_investasi(konteks)


def _kunci_cache(jenis, model, payload):
    mentah = json.dumps({"v": 1, "jenis": jenis, "model": model, "payload": payload}, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(mentah.encode("utf-8")).hexdigest()


def _ambil_cache(kunci):
    try:
        baris = db.satu("SELECT teks FROM cache_llm WHERE kunci = ?", (kunci,))
        return baris["teks"] if baris else None
    except Exception:
        return None


def _simpan_cache(kunci, jenis, model, teks):
    try:
        db.simpan_atau_ganti("cache_llm", {
            "kunci": kunci,
            "jenis": jenis,
            "model": model,
            "teks": teks,
            "dibuat": db.sekarang(),
        }, "kunci")
    except Exception:
        pass


def _ekstrak_teks(konten):
    if not isinstance(konten, str):
        return None
    bersih = konten.strip()
    m = re.match(r"^```(?:json)?\s*(.*?)\s*```$", bersih, flags=re.DOTALL | re.IGNORECASE)
    if m:
        bersih = m.group(1).strip()
    try:
        data = json.loads(bersih)
    except ValueError:
        obj = re.search(r"\{.*\}", bersih, flags=re.DOTALL)
        if not obj:
            raise
        data = json.loads(obj.group(0))
    if not isinstance(data, dict):
        return None
    teks = data.get("teks")
    if not isinstance(teks, str) and len(data) == 1:
        kandidat = next(iter(data.values()))
        if isinstance(kandidat, str):
            teks = kandidat
    if not isinstance(teks, str):
        return None
    teks = teks.strip()
    if not (20 <= len(teks) <= 1200):
        return None
    return teks


def susun_teks(jenis, konteks):
    """Minta ringkasan bahasa Indonesia dari OpenRouter dengan cache SQLite."""
    if not aktif() or jenis not in ("lokasi", "bangunan", "investasi"):
        return None

    payload = _ringkas_konteks(jenis, konteks)
    model = current_app.config["OPENROUTER_MODEL"]
    cadangan = [m for m in current_app.config.get("OPENROUTER_FALLBACK_MODELS", []) if m and m != model]
    daftar_model = [model, *cadangan]
    kunci = _kunci_cache(jenis, model, payload)
    tersimpan = _ambil_cache(kunci)
    if tersimpan:
        return tersimpan

    url = f"{current_app.config['OPENROUTER_BASE_URL']}/chat/completions"
    headers = {
        "Authorization": f"Bearer {current_app.config['OPENROUTER_API_KEY']}",
        "Content-Type": "application/json",
        "HTTP-Referer": current_app.config.get("URL_FRONTEND", "http://localhost:5173"),
        "X-Title": "HomeWise",
    }
    muatan = {
        "model": model,
        "temperature": 0.3,
        "max_tokens": 900,
        "reasoning": {"enabled": bool(current_app.config.get("OPENROUTER_REASONING", False))},
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": PROMPT_SISTEM},
            {"role": "user", "content": f"Jenis ringkasan: {jenis}\nData analisis:\n{json.dumps(payload, ensure_ascii=False)}"},
        ],
    }
    if len(daftar_model) > 1:
        muatan["models"] = daftar_model

    try:
        timeout = current_app.config["OPENROUTER_TIMEOUT_DETIK"]
        percobaan = [muatan]
        if "openrouter/free" in daftar_model:
            muatan_cadangan = {k: v for k, v in muatan.items() if k not in ("reasoning", "models")}
            muatan_cadangan["model"] = "openrouter/free"
            percobaan.append(muatan_cadangan)

        galat_terakhir = None
        for indeks, body in enumerate(percobaan):
            respon = requests.post(url, json=body, headers=headers, timeout=timeout)
            if respon.status_code == 400 and indeks == 0 and len(percobaan) > 1:
                continue
            respon.raise_for_status()
            data_respon = respon.json()
            try:
                konten = data_respon["choices"][0]["message"]["content"]
                teks = _ekstrak_teks(konten)
                if not teks:
                    raise ValueError("Output JSON OpenRouter tidak memuat teks valid.")
                _simpan_cache(kunci, jenis, data_respon.get("model") or model, teks)
                return teks
            except (ValueError, KeyError, TypeError, IndexError) as e:
                galat_terakhir = e
                if indeks == 0 and len(percobaan) > 1:
                    continue
                raise
        if galat_terakhir:
            raise galat_terakhir
        return None
    except (requests.RequestException, ValueError, KeyError, TypeError, IndexError) as e:
        current_app.logger.warning("OpenRouter LLM gagal (%s), memakai templat bawaan.", e)
        return None
