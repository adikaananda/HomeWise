import io

import pytest
from PIL import Image

from app import buat_aplikasi


@pytest.fixture()
def klien(tmp_path):
    app = buat_aplikasi({
        "DATABASE_PATH": str(tmp_path / "uji.db"),
        "DIR_UNGGAHAN": str(tmp_path / "unggahan"),
        "MIDTRANS_SERVER_KEY": "",
        "AI_MODE": "simulasi",
        "OPENROUTER_API_KEY": "",
        "TESTING": True,
    })
    return app.test_client()


def masuk(klien, email, sandi):
    respon = klien.post("/api/auth/masuk", json={"email": email, "sandi": sandi})
    assert respon.status_code == 200
    return {"Authorization": f"Bearer {respon.json['data']['token']}"}


def foto_uji():
    buffer = io.BytesIO()
    Image.new("RGB", (64, 64), (220, 210, 200)).save(buffer, "JPEG")
    buffer.seek(0)
    return buffer


def test_daftar_dan_masuk(klien):
    respon = klien.post("/api/auth/daftar", json={"nama": "Sari", "email": "sari@contoh.id", "sandi": "rahasia123"})
    assert respon.status_code == 201
    assert respon.json["data"]["pengguna"]["kredit_laporan"] == 1
    assert klien.post("/api/auth/daftar", json={"nama": "Sari", "email": "sari@contoh.id", "sandi": "rahasia123"}).status_code == 409
    assert klien.post("/api/auth/masuk", json={"email": "sari@contoh.id", "sandi": "salah123"}).status_code == 401


def test_pilihan_utama_dan_pengajuan_kpr_btn(klien):
    header = masuk(klien, "demo@homewise.id", "demo12345")
    pilih = klien.post("/api/properti/1/pilihan-utama", headers=header)
    assert pilih.status_code == 200
    assert pilih.json["data"]["properti"]["pilihan_utama"] == 1

    pilih_lain = klien.post("/api/properti/2/pilihan-utama", headers=header)
    assert pilih_lain.status_code == 200
    assert pilih_lain.json["data"]["properti"]["pilihan_utama"] == 1
    assert klien.get("/api/properti/1", headers=header).json["data"]["properti"]["pilihan_utama"] == 0

    ajukan = klien.post("/api/kpr/ajukan-btn", headers=header, json={
        "properti_id": 1,
        "program_kpr": "promo_fixed",
        "sertakan_renovasi": True,
        "persen_dp": 15,
        "tenor_tahun": 20,
        "nama_pemohon": "Dimas Pratama",
        "telepon": "081234567890",
        "email": "demo@homewise.id",
        "status_pekerjaan": "karyawan_tetap",
        "penghasilan_bulanan": 25000000,
        "kota_properti": "Tangerang Selatan",
        "pilihan_layanan": "konsultasi",
    })
    assert ajukan.status_code == 201
    data_kpr = ajukan.json["data"]
    assert data_kpr["mitra_bank"] == "BTN"
    assert data_kpr["kode_rujukan"].startswith("HW-KPR-")
    assert data_kpr["plafon_kpr"] > 0
    assert data_kpr["estimasi_angsuran"] > 0
    assert klien.get("/api/properti/1", headers=header).json["data"]["properti"]["pilihan_utama"] == 1

    sim = klien.post("/api/kpr/simulasi", headers=header, json={
        "properti_id": 1,
        "program_kpr": "promo_fixed",
        "persen_dp": 15,
        "tenor_tahun": 20,
        "sertakan_renovasi": True,
    })
    assert sim.status_code == 200
    sim_data = sim.json["data"]
    assert sim_data["estimasi_angsuran"] == data_kpr["estimasi_angsuran"]
    assert sim_data["biaya_awal"]["total"] > sim_data["biaya_awal"]["uang_muka"]
    assert sim_data["biaya_renovasi"] > 0

    sim_manual = klien.post("/api/kpr/simulasi", headers=header, json={
        "properti_id": 2,
        "program_kpr": "promo_fixed",
        "persen_dp": 15,
        "tenor_tahun": 20,
        "sertakan_renovasi": True,
        "biaya_renovasi_manual": 25_000_000,
    })
    assert sim_manual.status_code == 200
    assert sim_manual.json["data"]["biaya_renovasi"] == 25_000_000

    riwayat = klien.get("/api/kpr/riwayat", headers=header)
    assert riwayat.status_code == 200
    assert len(riwayat.json["data"]) == 1
    assert riwayat.json["data"][0]["properti_id"] == 1


def test_akses_tanpa_token_ditolak(klien):
    assert klien.get("/api/properti").status_code == 401


def test_buat_properti_dan_ganti_tujuan(klien):
    header = masuk(klien, "demo@homewise.id", "demo12345")
    respon = klien.post("/api/properti", headers=header, json={
        "nama": "Rumah Uji", "alamat": "Jl. Uji No. 1, Depok", "lat": -6.4, "lng": 106.82, "harga_penawaran": 900_000_000,
    })
    assert respon.status_code == 201
    data = respon.json["data"]
    assert data["lokasi"]["hasil"]["skor_total"] > 0
    assert data["akses_premium"] is False

    properti_id = data["properti"]["id"]
    respon = klien.patch(f"/api/properti/{properti_id}", headers=header, json={"tujuan": "restoran"})
    assert respon.json["data"]["lokasi"]["hasil"]["tujuan"] == "restoran"
    assert klien.post(f"/api/properti/{properti_id}/analisis-bangunan", headers=header).status_code == 402


def test_alur_pembayaran_unggah_dan_analisis(klien):
    header = masuk(klien, "demo@homewise.id", "demo12345")
    respon = klien.post("/api/pembayaran", headers=header, json={"paket": "laporan_tunggal", "properti_id": 3})
    order_id = respon.json["data"]["order_id"]
    assert klien.post(f"/api/pembayaran/{order_id}/simulasi", headers=header, json={"status": "lunas"}).json["data"]["status"] == "lunas"

    respon = klien.post("/api/properti/3/foto", headers=header, data={"foto": (foto_uji(), "dinding.jpg"), "ruang": "Teras"},
                        content_type="multipart/form-data")
    assert respon.status_code == 201
    respon = klien.post("/api/properti/3/analisis-bangunan", headers=header)
    data = respon.json["data"]
    assert data["bangunan"]["temuan"]
    assert data["biaya"]["total"] > 0
    assert data["investasi"]["total"] > data["properti"]["harga_penawaran"]
    assert klien.get("/api/properti/3/laporan.pdf", headers=header).mimetype == "application/pdf"


def test_paket_hemat_menambah_kredit(klien):
    header = masuk(klien, "demo@homewise.id", "demo12345")
    order_id = klien.post("/api/pembayaran", headers=header, json={"paket": "paket_hemat"}).json["data"]["order_id"]
    klien.post(f"/api/pembayaran/{order_id}/simulasi", headers=header, json={"status": "lunas"})
    klien.post(f"/api/pembayaran/{order_id}/simulasi", headers=header, json={"status": "lunas"})
    assert klien.get("/api/auth/saya", headers=header).json["data"]["kredit_laporan"] == 6


def test_alur_analis_validasi(klien):
    header = masuk(klien, "analis@homewise.id", "analis12345")
    daftar = klien.get("/api/inspeksi", headers=header).json["data"]
    inspeksi_id = daftar[0]["id"]
    assert klien.post(f"/api/inspeksi/{inspeksi_id}/ambil", headers=header).status_code == 200
    assert klien.post(f"/api/inspeksi/{inspeksi_id}/validasi", headers=header).status_code == 422

    klien.patch(f"/api/inspeksi/{inspeksi_id}", headers=header, json={"catatan": "Retak rambut, struktur aman.", "status": "diperiksa"})
    klien.put(f"/api/inspeksi/{inspeksi_id}/temuan", headers=header, json={
        "item": [{"indeks": 0, "status": "ditolak", "catatan": "Bayangan"}],
        "tambahan": [{"jenis": "atap_bocor", "tingkat": "sedang", "luas_m2": 4}],
    })
    respon = klien.post(f"/api/inspeksi/{inspeksi_id}/validasi", headers=header)
    data = respon.json["data"]
    assert data["status"] == "tervalidasi"
    assert data["analisis"]["bangunan"]["tervalidasi"] is True
    assert data["analisis"]["bangunan"]["temuan"][0]["status"] == "ditolak"


def test_admin_dan_batasan_peran(klien):
    pencari = masuk(klien, "demo@homewise.id", "demo12345")
    assert klien.get("/api/admin/ringkasan", headers=pencari).status_code == 403

    admin = masuk(klien, "admin@homewise.id", "admin12345")
    assert klien.get("/api/admin/ringkasan", headers=admin).json["data"]["pengguna"] == 3
    respon = klien.post("/api/admin/harga-referensi", headers=admin, json={
        "kode": "cat_eksterior", "nama": "Cat eksterior", "kategori": "Finishing", "harga_material": 30000, "harga_upah": 20000,
    })
    assert respon.status_code == 201
    assert klien.get("/api/admin/analisis", headers=admin).json["data"]["statistik"]["total_analisis"] > 0


def test_notifikasi_midtrans_tanpa_tanda_tangan_ditolak(klien):
    assert klien.post("/api/pembayaran/notifikasi", json={"order_id": "HW-DEMO00000001"}).status_code == 403


def test_notifikasi_midtrans_valid_membuka_laporan(tmp_path):
    import hashlib

    from app import db

    app = buat_aplikasi({
        "DATABASE_PATH": str(tmp_path / "uji.db"),
        "DIR_UNGGAHAN": str(tmp_path / "unggahan"),
        "MIDTRANS_SERVER_KEY": "SB-Mid-server-uji",
        "OPENROUTER_API_KEY": "",
    })
    with app.app_context():
        db.simpan("pembayaran", {"order_id": "HW-UJI1", "pengguna_id": 3, "properti_id": 2,
                                 "paket": "laporan_tunggal", "jumlah": 49000, "mode": "midtrans"})
    tanda = hashlib.sha512("HW-UJI1200" "49000.00SB-Mid-server-uji".encode()).hexdigest()
    respon = app.test_client().post("/api/pembayaran/notifikasi", json={
        "order_id": "HW-UJI1", "status_code": "200", "gross_amount": "49000.00",
        "signature_key": tanda, "transaction_status": "settlement", "payment_type": "qris",
    })
    assert respon.status_code == 200
    with app.app_context():
        assert db.satu("SELECT laporan_terbuka FROM properti WHERE id = 2")["laporan_terbuka"] == 1


def test_foto_survei_boleh_sebelum_bayar_tetapi_analisis_berbayar(klien):
    header = masuk(klien, "demo@homewise.id", "demo12345")
    respon = klien.post("/api/properti/2/foto", headers=header,
                        data={"foto": (foto_uji(), "kamar-mandi.jpg"), "area": "kamar_mandi", "sumber": "survei"},
                        content_type="multipart/form-data")
    assert respon.status_code == 201
    data = respon.json["data"]
    assert data["foto"][0]["area"] == "kamar_mandi"
    assert data["survei"]["kelengkapan"]["wajib_terisi"] == 1
    assert data["tahap"]["kode"] == "disurvei"
    assert klien.post("/api/properti/2/analisis-bangunan", headers=header).status_code == 402


def test_simpan_checklist_survei(klien):
    header = masuk(klien, "demo@homewise.id", "demo12345")
    respon = klien.put("/api/properti/2/survei", headers=header,
                       json={"jawaban": {"sertifikat": "AJB / girik", "daya_listrik": "900 VA"}, "catatan": "Jalan sempit"})
    assert respon.status_code == 200
    assert respon.json["data"]["survei"]["jawaban"]["sertifikat"] == "AJB / girik"
    assert klien.put("/api/properti/2/survei", headers=header, json={"jawaban": {"sertifikat": "Asal"}}).status_code == 422


def test_material_dan_prioritas_tersedia(klien):
    header = masuk(klien, "demo@homewise.id", "demo12345")
    biaya = klien.get("/api/properti/1", headers=header).json["data"]["biaya"]
    assert biaya["material"] and all(m["jumlah_beli"] >= 1 for m in biaya["material"])
    assert {p["kode"] for p in biaya["per_prioritas"]} == {"mendesak", "disarankan", "kosmetik"}
    assert all("prioritas" in i for i in biaya["item"])


def test_ganti_sandi(klien):
    header = masuk(klien, "demo@homewise.id", "demo12345")
    assert klien.post("/api/auth/ganti-sandi", headers=header, json={"sandi_lama": "salah123", "sandi_baru": "barubaru1"}).status_code == 400
    assert klien.post("/api/auth/ganti-sandi", headers=header, json={"sandi_lama": "demo12345", "sandi_baru": "barubaru1"}).status_code == 200
    masuk(klien, "demo@homewise.id", "barubaru1")


def test_produksi_menolak_secret_key_bawaan(tmp_path):
    with pytest.raises(RuntimeError):
        buat_aplikasi({"LINGKUNGAN": "produksi", "DATABASE_PATH": str(tmp_path / "uji.db"), "DIR_UNGGAHAN": str(tmp_path / "u")})


def test_admin_ubah_material_memengaruhi_daftar_belanja(klien):
    admin = masuk(klien, "admin@homewise.id", "admin12345")
    harga = next(h for h in klien.get("/api/admin/harga-referensi", headers=admin).json["data"] if h["kode"] == "perbaikan_atap")
    respon = klien.patch(f"/api/admin/harga-referensi/{harga['id']}", headers=admin, json={
        "material": [{"nama": "Genteng keramik", "satuan": "buah", "koefisien": 4, "kemasan": "buah", "isi_kemasan": 1}],
    })
    assert respon.json["data"]["material"][0]["nama"] == "Genteng keramik"

    pencari = masuk(klien, "demo@homewise.id", "demo12345")
    klien.post("/api/properti/1/analisis-bangunan", headers=pencari)
    material = klien.get("/api/properti/1", headers=pencari).json["data"]["biaya"]["material"]
    assert any(m["nama"] == "Genteng keramik" for m in material)


def test_respons_ai_tidak_sesuai_kontrak_dibersihkan():
    from app.layanan.ai_klien import _bersihkan_temuan

    hasil = _bersihkan_temuan({"temuan": [
        {"jenis": "retak_dinding", "tingkat": "sedang", "luas_m2": 3, "kepercayaan": 1.4, "foto_id": 1},
        {"jenis": "jenis_asing", "tingkat": "sedang", "luas_m2": 3},
        {"jenis": "atap_bocor", "tingkat": "parah", "luas_m2": 3},
        {"jenis": "noda_lembap", "tingkat": "ringan", "luas_m2": "x"},
    ]})
    assert len(hasil["temuan"]) == 1 and hasil["temuan"][0]["kepercayaan"] == 1.0


def test_model_klasifikasi_analisis_foto_asli(tmp_path):
    from pathlib import Path
    import sys

    akar = str(Path(__file__).resolve().parents[2])
    if akar not in sys.path:
        sys.path.insert(0, akar)
    from model_klasifikasi import prediksi

    assert prediksi.model_tersedia() is True

    app = buat_aplikasi({
        "DATABASE_PATH": str(tmp_path / "uji_model.db"),
        "DIR_UNGGAHAN": str(tmp_path / "unggahan"),
        "AI_MODE": "asli",
        "OPENROUTER_API_KEY": "",
        "TESTING": True,
    })
    klien = app.test_client()
    header = masuk(klien, "demo@homewise.id", "demo12345")
    respon = klien.post("/api/properti/1/analisis-bangunan", headers=header)
    assert respon.status_code == 200
    bangunan = respon.json["data"]["bangunan"]
    assert bangunan["sumber"] == "asli"
    assert 0 <= bangunan["skor_kondisi"] <= 100


def test_llm_openrouter_cache_dan_payload(tmp_path, monkeypatch):
    from unittest.mock import MagicMock

    import requests

    from app.layanan import ai_klien

    panggilan = []
    teks_mock = "Total investasi awal Rp850 juta dengan biaya renovasi terkendali untuk hunian keluarga."

    def palsu_post(url, json=None, headers=None, timeout=None):
        panggilan.append({"url": url, "json": json, "headers": headers, "timeout": timeout})
        resp = MagicMock()
        resp.raise_for_status.return_value = None
        resp.json.return_value = {
            "choices": [{"message": {"content": '{"teks": "' + teks_mock + '"}'}}]
        }
        return resp

    monkeypatch.setattr(requests, "post", palsu_post)

    app = buat_aplikasi({
        "DATABASE_PATH": str(tmp_path / "uji_llm.db"),
        "DIR_UNGGAHAN": str(tmp_path / "unggahan"),
        "AI_MODE": "simulasi",
        "SEED_OTOMATIS": False,
        "OPENROUTER_API_KEY": "sk-or-uji",
        "OPENROUTER_MODEL": "inclusionai/ling-3.2-flash:free",
        "OPENROUTER_REASONING": False,
        "TESTING": True,
    })
    sehat = app.test_client().get("/api/kesehatan").json["data"]
    assert sehat["mode_llm"] == "openrouter"
    assert sehat["model_llm"] == "inclusionai/ling-3.2-flash:free"

    konteks = {
        "tujuan": "rumah_tinggal",
        "investasi": {
            "harga_penawaran": 800_000_000,
            "renovasi": 25_000_000,
            "biaya_transaksi": 25_000_000,
            "total": 850_000_000,
            "total_minimum": 830_000_000,
            "rasio_renovasi_persen": 3.1,
            "harga_per_m2": 8_000_000,
            "total_per_m2": 8_500_000,
        },
    }
    with app.app_context():
        hasil_1 = ai_klien.susun_penjelasan("investasi", konteks)
        hasil_2 = ai_klien.susun_penjelasan("investasi", konteks)

    assert len(panggilan) == 1
    assert panggilan[0]["json"]["model"] == "inclusionai/ling-3.2-flash:free"
    assert panggilan[0]["json"]["models"] == ["inclusionai/ling-3.2-flash:free", "openrouter/free"]
    assert panggilan[0]["json"]["reasoning"] == {"enabled": False}
    assert hasil_1 == teks_mock
    assert hasil_2 == teks_mock


def test_llm_openrouter_fallback_statis(tmp_path, monkeypatch, klien):
    from unittest.mock import MagicMock

    import requests

    from app.layanan import ai_klien, penjelasan

    assert klien.get("/api/kesehatan").json["data"]["mode_llm"] == "statis"

    inv = {
        "harga_penawaran": 800_000_000,
        "renovasi": 25_000_000,
        "biaya_transaksi": 25_000_000,
        "total": 850_000_000,
        "rasio_renovasi_persen": 3.1,
    }
    harapan_statis = penjelasan.ringkasan_investasi(inv)

    app = buat_aplikasi({
        "DATABASE_PATH": str(tmp_path / "uji_llm_gagal.db"),
        "DIR_UNGGAHAN": str(tmp_path / "unggahan"),
        "AI_MODE": "simulasi",
        "SEED_OTOMATIS": False,
        "OPENROUTER_API_KEY": "sk-or-uji",
        "TESTING": True,
    })

    def gagal_timeout(*args, **kwargs):
        raise requests.Timeout("timeout")

    monkeypatch.setattr(requests, "post", gagal_timeout)
    with app.app_context():
        assert ai_klien.susun_penjelasan("investasi", {"investasi": inv}) == harapan_statis

    def balas_rusak(*args, **kwargs):
        resp = MagicMock()
        resp.raise_for_status.return_value = None
        resp.json.return_value = {"choices": [{"message": {"content": "bukan json"}}]}
        return resp

    monkeypatch.setattr(requests, "post", balas_rusak)
    with app.app_context():
        assert ai_klien.susun_penjelasan("investasi", {"investasi": inv}) == harapan_statis
