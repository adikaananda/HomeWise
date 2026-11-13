import os
import sys
from pathlib import Path

from flask import Flask, jsonify, request

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.layanan import lokasi_asli, simulasi_ai

app = Flask(__name__)
KUNCI = os.getenv("AI_API_KEY", "")


@app.before_request
def periksa_kunci():
    if KUNCI and request.headers.get("Authorization") != f"Bearer {KUNCI}":
        return jsonify({"pesan": "Tidak diizinkan"}), 401


@app.post("/lokasi")
def lokasi():
    data = request.get_json()
    return jsonify(
        lokasi_asli.analisis_lokasi(data["lat"], data["lng"], data.get("alamat"), data.get("radius_m", 5000))
    )


@app.post("/kondisi-bangunan")
def kondisi_bangunan():
    daftar_id = request.form.get("foto_id", "").split(",")
    daftar_area = request.form.get("area", "").split(",")
    foto = [
        {"id": int(foto_id), "area": area, "sidik": berkas.filename}
        for foto_id, area, berkas in zip(daftar_id, daftar_area, request.files.getlist("foto"))
    ]
    return jsonify(simulasi_ai.analisis_foto(foto))


@app.post("/penjelasan")
def penjelasan():
    return jsonify({"teks": None})


if __name__ == "__main__":
    app.run(port=int(os.getenv("PORT", "8000")))
