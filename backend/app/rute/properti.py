from datetime import datetime

from flask import Blueprint, Response, request

from .. import db
from ..keamanan import pengguna_aktif, wajib_login
from ..layanan import berkas, laporan_pdf
from ..layanan import properti as layanan_properti
from ..respon import GalatAplikasi, sukses
from ..validasi import SkemaProperti, SkemaSurvei, SkemaUbahProperti, baca_json

bp = Blueprint("properti", __name__, url_prefix="/api/properti")


@bp.get("")
@wajib_login()
def daftar():
    pengguna = pengguna_aktif()
    sql = "SELECT * FROM properti WHERE pengguna_id = ?"
    parameter = [pengguna["id"]]
    if request.args.get("tersimpan") == "1":
        sql += " AND tersimpan = 1"
    cari = request.args.get("cari", "").strip()
    if cari:
        sql += " AND (nama LIKE ? OR alamat LIKE ?)"
        parameter += [f"%{cari}%", f"%{cari}%"]
    sql += " ORDER BY diperbarui DESC"
    return sukses([layanan_properti.ringkas_untuk_daftar(p) for p in db.banyak(sql, tuple(parameter))])


@bp.post("")
@wajib_login("pencari", "admin")
def buat():
    data = baca_json(SkemaProperti).model_dump()
    data["pengguna_id"] = pengguna_aktif()["id"]
    properti_id = db.simpan("properti", data)
    properti = db.satu("SELECT * FROM properti WHERE id = ?", (properti_id,))
    layanan_properti.jalankan_analisis_lokasi(properti)
    return sukses(layanan_properti.detail_lengkap(properti, pengguna_aktif()), 201)


@bp.get("/bandingkan")
@wajib_login()
def bandingkan():
    try:
        daftar_id = [int(x) for x in request.args.get("ids", "").split(",") if x.strip()][:4]
    except ValueError:
        raise GalatAplikasi("Parameter ids tidak valid.", 422)
    if len(daftar_id) < 2:
        raise GalatAplikasi("Pilih minimal dua properti untuk dibandingkan.", 422)
    pengguna = pengguna_aktif()
    hasil = [layanan_properti.detail_lengkap(layanan_properti.ambil_properti(i, pengguna), pengguna) for i in daftar_id]
    return sukses(hasil)


@bp.get("/<int:properti_id>")
@wajib_login()
def detail(properti_id):
    pengguna = pengguna_aktif()
    properti = layanan_properti.ambil_properti(properti_id, pengguna)
    return sukses(layanan_properti.detail_lengkap(properti, pengguna))


@bp.patch("/<int:properti_id>")
@wajib_login()
def ubah(properti_id):
    pengguna = pengguna_aktif()
    properti = layanan_properti.ambil_properti(properti_id, pengguna, izinkan_staf=False)
    masukan = baca_json(SkemaUbahProperti)
    data = masukan.model_dump(exclude_none=True)
    if masukan.spesifikasi is not None:
        # Gabungkan dengan spesifikasi lama. Kunci yang dikirim bernilai null berarti dikosongkan.
        lama = layanan_properti.urai_kolom_json(properti).get("spesifikasi") or {}
        baru = masukan.spesifikasi.model_dump(exclude_unset=True)
        gabungan = {**lama, **baru}
        data["spesifikasi"] = {k: v for k, v in gabungan.items() if v is not None}
    if data:
        data["diperbarui"] = db.sekarang()
        db.perbarui("properti", properti_id, data)
    properti = db.satu("SELECT * FROM properti WHERE id = ?", (properti_id,))
    if "tujuan" in data:
        layanan_properti.nilai_ulang_tujuan(properti)
    return sukses(layanan_properti.detail_lengkap(properti, pengguna))


@bp.delete("/<int:properti_id>")
@wajib_login()
def hapus(properti_id):
    layanan_properti.ambil_properti(properti_id, pengguna_aktif(), izinkan_staf=False)
    for foto in db.banyak("SELECT nama_berkas FROM foto_bangunan WHERE properti_id = ?", (properti_id,)):
        berkas.hapus_berkas(foto["nama_berkas"])
    db.eksekusi("DELETE FROM properti WHERE id = ?", (properti_id,))
    return sukses(pesan="Properti dihapus.")


@bp.post("/<int:properti_id>/analisis-lokasi")
@wajib_login()
def analisis_ulang_lokasi(properti_id):
    pengguna = pengguna_aktif()
    properti = layanan_properti.ambil_properti(properti_id, pengguna)
    layanan_properti.jalankan_analisis_lokasi(properti)
    return sukses(layanan_properti.detail_lengkap(properti, pengguna))


@bp.post("/<int:properti_id>/pilihan-utama")
@wajib_login()
def jadikan_pilihan_utama(properti_id):
    pengguna = pengguna_aktif()
    layanan_properti.ambil_properti(properti_id, pengguna, izinkan_staf=False)
    koneksi = db.ambil_koneksi()
    koneksi.execute("UPDATE properti SET pilihan_utama = 0 WHERE pengguna_id = ?", (pengguna["id"],))
    koneksi.execute(
        "UPDATE properti SET pilihan_utama = 1, diperbarui = ? WHERE id = ?",
        (db.sekarang(), properti_id),
    )
    koneksi.commit()
    properti = db.satu("SELECT * FROM properti WHERE id = ?", (properti_id,))
    return sukses(layanan_properti.detail_lengkap(properti, pengguna), pesan="Properti ditetapkan sebagai Pilihan Utama.")


@bp.post("/<int:properti_id>/buka-kredit")
@wajib_login()
def buka_dengan_kredit(properti_id):
    pengguna = pengguna_aktif()
    properti = layanan_properti.ambil_properti(properti_id, pengguna, izinkan_staf=False)
    if properti["laporan_terbuka"]:
        raise GalatAplikasi("Laporan properti ini sudah terbuka.", 409)
    kursor = db.ambil_koneksi().execute(
        "UPDATE pengguna SET kredit_laporan = kredit_laporan - 1 WHERE id = ? AND kredit_laporan > 0", (pengguna["id"],)
    )
    if kursor.rowcount == 0:
        db.ambil_koneksi().rollback()
        raise GalatAplikasi("Kredit laporan Anda habis.", 402)
    db.ambil_koneksi().execute("UPDATE properti SET laporan_terbuka = 1 WHERE id = ?", (properti_id,))
    db.ambil_koneksi().commit()
    properti = db.satu("SELECT * FROM properti WHERE id = ?", (properti_id,))
    return sukses(layanan_properti.detail_lengkap(properti, pengguna), pesan="Laporan lengkap terbuka.")


@bp.post("/<int:properti_id>/foto")
@wajib_login()
def unggah_foto(properti_id):
    pengguna = pengguna_aktif()
    properti = layanan_properti.ambil_properti(properti_id, pengguna)
    daftar_foto = berkas.ambil_daftar_foto(request)
    layanan_properti.periksa_kuota_foto(properti_id, len(daftar_foto))
    area = berkas.baca_area(request.form.get("area"))
    sumber = "analis" if pengguna["peran"] == "analis" else berkas.baca_sumber(request.form.get("sumber"))
    jarak = berkas.baca_jarak(request.form.get("jarak"))
    ruang = request.form.get("ruang", "").strip()[:60] or None
    for foto in daftar_foto:
        db.simpan("foto_bangunan", {
            "properti_id": properti_id,
            "nama_berkas": berkas.simpan_foto(foto),
            "nama_asli": foto.filename[:120],
            "ruang": ruang,
            "area": area,
            "sumber": sumber,
            "jarak": jarak,
            "diunggah_oleh": pengguna["id"],
        })
    db.perbarui("properti", properti_id, {"diperbarui": db.sekarang()})
    return sukses(layanan_properti.detail_lengkap(properti, pengguna), 201)


@bp.put("/<int:properti_id>/survei")
@wajib_login()
def simpan_survei(properti_id):
    pengguna = pengguna_aktif()
    layanan_properti.ambil_properti(properti_id, pengguna, izinkan_staf=False)
    data = baca_json(SkemaSurvei)
    db.perbarui("properti", properti_id, {
        "data_survei": {"jawaban": data.jawaban, "catatan": data.catatan, "diperbarui": db.sekarang()},
        "diperbarui": db.sekarang(),
    })
    properti = layanan_properti.ambil_properti(properti_id, pengguna)
    return sukses(layanan_properti.detail_lengkap(properti, pengguna), pesan="Catatan survei tersimpan.")


@bp.delete("/<int:properti_id>/foto/<int:foto_id>")
@wajib_login()
def hapus_foto(properti_id, foto_id):
    pengguna = pengguna_aktif()
    properti = layanan_properti.ambil_properti(properti_id, pengguna)
    terkunci = db.satu("SELECT tervalidasi FROM analisis_bangunan WHERE properti_id = ?", (properti_id,))
    if terkunci and terkunci["tervalidasi"]:
        raise GalatAplikasi("Foto tidak dapat dihapus setelah temuan divalidasi analis.", 409)
    foto = db.satu("SELECT * FROM foto_bangunan WHERE id = ? AND properti_id = ?", (foto_id, properti_id))
    if not foto:
        raise GalatAplikasi("Foto tidak ditemukan.", 404)
    berkas.hapus_berkas(foto["nama_berkas"])
    db.eksekusi("DELETE FROM foto_bangunan WHERE id = ?", (foto_id,))
    return sukses(layanan_properti.detail_lengkap(properti, pengguna))


@bp.post("/<int:properti_id>/analisis-bangunan")
@wajib_login()
def analisis_bangunan(properti_id):
    pengguna = pengguna_aktif()
    properti = layanan_properti.ambil_properti(properti_id, pengguna)
    layanan_properti.wajib_premium(properti, pengguna)
    layanan_properti.jalankan_analisis_bangunan(properti)
    return sukses(layanan_properti.detail_lengkap(properti, pengguna))


@bp.get("/<int:properti_id>/laporan.pdf")
@wajib_login()
def unduh_laporan(properti_id):
    pengguna = pengguna_aktif()
    properti = layanan_properti.ambil_properti(properti_id, pengguna)
    layanan_properti.wajib_premium(properti, pengguna)
    detail_properti = layanan_properti.detail_lengkap(properti, pengguna)
    if not detail_properti["lokasi"]:
        raise GalatAplikasi("Analisis lokasi belum tersedia.", 409)

    nomor = f"HW-{datetime.now():%Y%m%d}-{properti_id:05d}-{db.nilai('SELECT COUNT(*) FROM laporan') + 1:04d}"
    db.simpan("laporan", {"nomor": nomor, "properti_id": properti_id, "pengguna_id": pengguna["id"]})
    pdf = laporan_pdf.buat_pdf(detail_properti, nomor, f"{datetime.now():%d-%m-%Y}")
    return Response(pdf, mimetype="application/pdf", headers={
        "Content-Disposition": f'attachment; filename="laporan-homewise-{properti_id}.pdf"',
    })
