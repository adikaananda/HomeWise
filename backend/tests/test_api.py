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
    assert klien.post("/api/auth/daftar", json={"nama": "Sari", "email": "sari@contoh.id", "sandi": "rahasia123"}).status_code == 409
    assert klien.post("/api/auth/masuk", json={"email": "sari@contoh.id", "sandi": "salah123"}).status_code == 401


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
