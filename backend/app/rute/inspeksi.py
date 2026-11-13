from flask import Blueprint, request

from .. import db
from ..keamanan import pengguna_aktif, wajib_login
from ..layanan import berkas
from ..layanan import properti as layanan_properti
from ..respon import GalatAplikasi, sukses
from ..validasi import SkemaTemuanValidasi, SkemaUbahInspeksi, baca_json

bp = Blueprint("inspeksi", __name__, url_prefix="/api/inspeksi")

SQL_DASAR = """
    SELECT i.*, p.nama AS properti_nama, p.alamat AS properti_alamat, p.tujuan AS properti_tujuan,
           p.lat, p.lng, u.nama AS pemohon_nama, u.telepon AS pemohon_telepon, a.nama AS analis_nama
    FROM inspeksi i
    JOIN properti p ON p.id = i.properti_id
    JOIN pengguna u ON u.id = i.pemohon_id
    LEFT JOIN pengguna a ON a.id = i.analis_id
"""


def _ambil(inspeksi_id):
    inspeksi = db.satu(SQL_DASAR + " WHERE i.id = ?", (inspeksi_id,), ("temuan_validasi",))
    if not inspeksi:
        raise GalatAplikasi("Permintaan inspeksi tidak ditemukan.", 404)
    pengguna = pengguna_aktif()
    if pengguna["peran"] == "pencari" and inspeksi["pemohon_id"] != pengguna["id"]:
        raise GalatAplikasi("Permintaan inspeksi tidak ditemukan.", 404)
    return inspeksi


def _wajib_penanggung_jawab(inspeksi):
    pengguna = pengguna_aktif()
    if pengguna["peran"] == "admin":
        return
    if inspeksi["analis_id"] != pengguna["id"]:
        raise GalatAplikasi("Ambil permintaan ini terlebih dahulu sebelum memperbaruinya.", 403)
    if inspeksi["status"] == "tervalidasi":
        raise GalatAplikasi("Inspeksi sudah divalidasi dan tidak dapat diubah.", 409)


def _detail(inspeksi_id):
    inspeksi = _ambil(inspeksi_id)
    properti = db.satu("SELECT * FROM properti WHERE id = ?", (inspeksi["properti_id"],))
    inspeksi["analisis"] = layanan_properti.detail_lengkap(properti, pengguna_aktif())
    return inspeksi


@bp.get("")
@wajib_login()
def daftar():
    pengguna = pengguna_aktif()
    filter_status = request.args.get("status")
    if pengguna["peran"] == "pencari":
        baris = db.banyak(SQL_DASAR + " WHERE i.pemohon_id = ? ORDER BY i.id DESC", (pengguna["id"],))
    elif pengguna["peran"] == "analis":
        baris = db.banyak(
            SQL_DASAR + " WHERE (i.status = 'menunggu' AND i.analis_id IS NULL) OR i.analis_id = ? ORDER BY i.id DESC",
            (pengguna["id"],),
        )
    else:
        baris = db.banyak(SQL_DASAR + " ORDER BY i.id DESC")
    if filter_status:
        baris = [b for b in baris if b["status"] == filter_status]
    return sukses(baris)


@bp.get("/<int:inspeksi_id>")
@wajib_login()
def detail(inspeksi_id):
    return sukses(_detail(inspeksi_id))


@bp.post("/<int:inspeksi_id>/ambil")
@wajib_login("analis", "admin")
def ambil(inspeksi_id):
    kursor = db.ambil_koneksi().execute(
        "UPDATE inspeksi SET analis_id = ?, status = 'dijadwalkan', diperbarui = ? WHERE id = ? AND analis_id IS NULL AND status = 'menunggu'",
        (pengguna_aktif()["id"], db.sekarang(), inspeksi_id),
    )
    db.ambil_koneksi().commit()
    if kursor.rowcount == 0:
        raise GalatAplikasi("Permintaan ini sudah diambil analis lain.", 409)
    return sukses(_detail(inspeksi_id), pesan="Permintaan inspeksi berhasil diambil.")


@bp.patch("/<int:inspeksi_id>")
@wajib_login("analis", "admin")
def ubah(inspeksi_id):
    inspeksi = _ambil(inspeksi_id)
    _wajib_penanggung_jawab(inspeksi)
    data = baca_json(SkemaUbahInspeksi).model_dump(exclude_none=True)
    data["diperbarui"] = db.sekarang()
    db.perbarui("inspeksi", inspeksi_id, data)
    return sukses(_detail(inspeksi_id))


@bp.post("/<int:inspeksi_id>/foto")
@wajib_login("analis", "admin")
def unggah_foto(inspeksi_id):
    inspeksi = _ambil(inspeksi_id)
    _wajib_penanggung_jawab(inspeksi)
    ruang = request.form.get("ruang", "").strip()[:60] or None
    for foto in berkas.ambil_daftar_foto(request):
        db.simpan("foto_bangunan", {
            "properti_id": inspeksi["properti_id"],
            "nama_berkas": berkas.simpan_foto(foto),
            "nama_asli": foto.filename[:120],
            "ruang": ruang,
            "sumber": "analis",
            "diunggah_oleh": pengguna_aktif()["id"],
        })
    return sukses(_detail(inspeksi_id), 201)


@bp.put("/<int:inspeksi_id>/temuan")
@wajib_login("analis", "admin")
def simpan_temuan(inspeksi_id):
    inspeksi = _ambil(inspeksi_id)
    _wajib_penanggung_jawab(inspeksi)
    data = baca_json(SkemaTemuanValidasi)
    db.perbarui("inspeksi", inspeksi_id, {"temuan_validasi": data.model_dump(), "diperbarui": db.sekarang()})
    return sukses(_detail(inspeksi_id), pesan="Draf validasi tersimpan.")


@bp.post("/<int:inspeksi_id>/validasi")
@wajib_login("analis", "admin")
def validasi(inspeksi_id):
    inspeksi = _ambil(inspeksi_id)
    _wajib_penanggung_jawab(inspeksi)
    if not inspeksi["catatan"]:
        raise GalatAplikasi("Isi catatan hasil pemeriksaan sebelum memvalidasi.", 422)

    draf = inspeksi["temuan_validasi"] or {"item": [], "tambahan": []}
    bangunan = db.satu("SELECT * FROM analisis_bangunan WHERE properti_id = ?", (inspeksi["properti_id"],), ("temuan",))
    temuan = [dict(t) for t in (bangunan["temuan"] if bangunan else [])]

    for item in draf["item"]:
        if item["indeks"] >= len(temuan):
            continue
        target = temuan[item["indeks"]]
        target["status"] = item["status"]
        target["catatan_analis"] = item.get("catatan")
        if item["status"] == "disesuaikan":
            target["tingkat"] = item.get("tingkat") or target["tingkat"]
            target["luas_m2"] = item.get("luas_m2") or target["luas_m2"]
    for item in temuan:
        if item.get("status") == "ai":
            item["status"] = "dikonfirmasi"
    for tambahan in draf["tambahan"]:
        temuan.append({**tambahan, "status": "analis", "kepercayaan": None, "foto_id": None, "catatan_analis": tambahan.get("catatan")})

    sumber = f"{bangunan['sumber']}+analis" if bangunan else "analis"
    layanan_properti.simpan_hasil_bangunan(inspeksi["properti_id"], temuan, sumber, tervalidasi=True)
    db.perbarui("inspeksi", inspeksi_id, {"status": "tervalidasi", "divalidasi_pada": db.sekarang(), "diperbarui": db.sekarang()})
    return sukses(_detail(inspeksi_id), pesan="Hasil inspeksi tervalidasi dan laporan diperbarui.")
