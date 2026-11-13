from flask import Blueprint, request

from .. import db
from ..keamanan import pengguna_aktif, profil_publik, wajib_login
from ..respon import GalatAplikasi, sukses
from ..validasi import SkemaHargaReferensi, SkemaUbahHargaReferensi, SkemaUbahPengguna, SkemaUbahSumberData, baca_json

bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@bp.get("/ringkasan")
@wajib_login("admin")
def ringkasan():
    return sukses({
        "pengguna": db.nilai("SELECT COUNT(*) FROM pengguna"),
        "properti": db.nilai("SELECT COUNT(*) FROM properti"),
        "laporan": db.nilai("SELECT COUNT(*) FROM laporan"),
        "pendapatan": db.nilai("SELECT COALESCE(SUM(jumlah), 0) FROM pembayaran WHERE status = 'lunas'"),
        "inspeksi_menunggu": db.nilai("SELECT COUNT(*) FROM inspeksi WHERE status = 'menunggu'"),
        "analisis_7_hari": db.banyak(
            """SELECT date(dibuat) AS tanggal, COUNT(*) AS jumlah,
                      SUM(CASE WHEN status = 'gagal' THEN 1 ELSE 0 END) AS gagal
               FROM log_analisis WHERE dibuat >= datetime('now', '-6 days')
               GROUP BY date(dibuat) ORDER BY tanggal"""
        ),
        "transaksi_terbaru": db.banyak(
            """SELECT b.order_id, b.paket, b.jumlah, b.status, b.dibuat, u.nama AS pengguna_nama
               FROM pembayaran b JOIN pengguna u ON u.id = b.pengguna_id ORDER BY b.id DESC LIMIT 6"""
        ),
    })


@bp.get("/pengguna")
@wajib_login("admin")
def daftar_pengguna():
    cari = request.args.get("cari", "").strip()
    sql = "SELECT * FROM pengguna"
    parameter = ()
    if cari:
        sql += " WHERE nama LIKE ? OR email LIKE ?"
        parameter = (f"%{cari}%", f"%{cari}%")
    baris = db.banyak(sql + " ORDER BY id DESC", parameter)
    return sukses([{**profil_publik(b), "aktif": bool(b["aktif"])} for b in baris])


@bp.patch("/pengguna/<int:pengguna_id>")
@wajib_login("admin")
def ubah_pengguna(pengguna_id):
    if pengguna_id == pengguna_aktif()["id"]:
        raise GalatAplikasi("Anda tidak dapat mengubah peran atau status akun sendiri.", 400)
    if not db.satu("SELECT id FROM pengguna WHERE id = ?", (pengguna_id,)):
        raise GalatAplikasi("Pengguna tidak ditemukan.", 404)
    db.perbarui("pengguna", pengguna_id, baca_json(SkemaUbahPengguna).model_dump(exclude_none=True))
    baris = db.satu("SELECT * FROM pengguna WHERE id = ?", (pengguna_id,))
    return sukses({**profil_publik(baris), "aktif": bool(baris["aktif"])})


@bp.get("/harga-referensi")
@wajib_login("admin")
def daftar_harga():
    return sukses(db.banyak("SELECT * FROM harga_referensi ORDER BY kategori, nama", kolom_json=("material",)))


@bp.post("/harga-referensi")
@wajib_login("admin")
def tambah_harga():
    data = baca_json(SkemaHargaReferensi).model_dump()
    if db.satu("SELECT id FROM harga_referensi WHERE kode = ?", (data["kode"],)):
        raise GalatAplikasi("Kode pekerjaan sudah dipakai.", 409)
    id_baru = db.simpan("harga_referensi", data)
    return sukses(db.satu("SELECT * FROM harga_referensi WHERE id = ?", (id_baru,), ("material",)), 201)


@bp.patch("/harga-referensi/<int:harga_id>")
@wajib_login("admin")
def ubah_harga(harga_id):
    if not db.satu("SELECT id FROM harga_referensi WHERE id = ?", (harga_id,)):
        raise GalatAplikasi("Harga referensi tidak ditemukan.", 404)
    data = baca_json(SkemaUbahHargaReferensi).model_dump(exclude_none=True)
    data["diperbarui"] = db.sekarang()
    db.perbarui("harga_referensi", harga_id, data)
    return sukses(db.satu("SELECT * FROM harga_referensi WHERE id = ?", (harga_id,), ("material",)))


@bp.delete("/harga-referensi/<int:harga_id>")
@wajib_login("admin")
def hapus_harga(harga_id):
    db.eksekusi("DELETE FROM harga_referensi WHERE id = ?", (harga_id,))
    return sukses(pesan="Harga referensi dihapus.")


@bp.get("/sumber-data")
@wajib_login("admin")
def daftar_sumber():
    return sukses(db.banyak("SELECT * FROM sumber_data ORDER BY jenis, nama"))


@bp.patch("/sumber-data/<int:sumber_id>")
@wajib_login("admin")
def ubah_sumber(sumber_id):
    if not db.satu("SELECT id FROM sumber_data WHERE id = ?", (sumber_id,)):
        raise GalatAplikasi("Sumber data tidak ditemukan.", 404)
    data = baca_json(SkemaUbahSumberData)
    perubahan = data.model_dump(exclude_none=True, exclude={"tandai_diperbarui"})
    if data.tandai_diperbarui:
        perubahan["terakhir_diperbarui"] = db.sekarang()
        perubahan.setdefault("status", "aktif")
    db.perbarui("sumber_data", sumber_id, perubahan)
    return sukses(db.satu("SELECT * FROM sumber_data WHERE id = ?", (sumber_id,)))


@bp.get("/laporan")
@wajib_login("admin")
def daftar_laporan():
    return sukses(db.banyak(
        """SELECT l.*, p.nama AS properti_nama, u.nama AS pengguna_nama
           FROM laporan l JOIN properti p ON p.id = l.properti_id JOIN pengguna u ON u.id = l.pengguna_id
           ORDER BY l.id DESC LIMIT 200"""
    ))


@bp.get("/analisis")
@wajib_login("admin")
def pemantauan_analisis():
    total_temuan = 0
    dikonfirmasi = 0
    kepercayaan = []
    for baris in db.banyak("SELECT temuan, tervalidasi FROM analisis_bangunan", kolom_json=("temuan",)):
        for t in baris["temuan"]:
            if t.get("kepercayaan"):
                kepercayaan.append(t["kepercayaan"])
            if baris["tervalidasi"] and t.get("status") in ("dikonfirmasi", "disesuaikan", "ditolak"):
                total_temuan += 1
                dikonfirmasi += t["status"] == "dikonfirmasi"

    return sukses({
        "log": db.banyak(
            """SELECT l.*, p.nama AS properti_nama FROM log_analisis l
               LEFT JOIN properti p ON p.id = l.properti_id ORDER BY l.id DESC LIMIT 50"""
        ),
        "statistik": {
            "total_analisis": db.nilai("SELECT COUNT(*) FROM log_analisis"),
            "tingkat_gagal": db.nilai(
                "SELECT ROUND(100.0 * SUM(CASE WHEN status = 'gagal' THEN 1 ELSE 0 END) / MAX(COUNT(*), 1), 1) FROM log_analisis"
            ) or 0,
            "rata_durasi_ms": db.nilai("SELECT ROUND(AVG(durasi_ms)) FROM log_analisis WHERE status = 'berhasil'") or 0,
            "rata_kepercayaan": round(sum(kepercayaan) / len(kepercayaan) * 100, 1) if kepercayaan else 0,
            "kesesuaian_analis": round(dikonfirmasi / total_temuan * 100, 1) if total_temuan else None,
            "temuan_divalidasi": total_temuan,
        },
    })
