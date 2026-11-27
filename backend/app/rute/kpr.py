from datetime import datetime
import uuid

from flask import Blueprint

from .. import db
from ..keamanan import pengguna_aktif, wajib_login
from ..layanan import properti as layanan_properti
from ..layanan.konstanta import PROGRAM_KPR_BTN
from ..respon import GalatAplikasi, sukses
from ..validasi import SkemaPengajuanKPR, SkemaSimulasiKPR, baca_json

bp = Blueprint("kpr", __name__, url_prefix="/api/kpr")


def hitung_angsuran_anuitas(plafon: int, suku_bunga_tahunan: float, tenor_tahun: int) -> int:
    """Hitung estimasi angsuran bulanan KPR menggunakan formula anuitas standar."""
    if plafon <= 0 or tenor_tahun <= 0:
        return 0
    bulan = tenor_tahun * 12
    bunga_bulanan = (suku_bunga_tahunan / 100.0) / 12.0
    if bunga_bulanan == 0:
        return round(plafon / bulan)
    faktor = (1 + bunga_bulanan) ** bulan
    return round(plafon * (bunga_bulanan * faktor) / (faktor - 1))


def _hitung_skenario(
    properti,
    program_kode: str,
    persen_dp: float,
    tenor_tahun: int,
    sertakan_renovasi: bool,
    harga_simulasi=None,
    biaya_renovasi_manual=None,
):
    program = next((p for p in PROGRAM_KPR_BTN if p["kode"] == program_kode), PROGRAM_KPR_BTN[0])
    estimasi = db.satu("SELECT total FROM estimasi_biaya WHERE properti_id = ?", (properti["id"],))
    biaya_renovasi = 0
    if sertakan_renovasi:
        if estimasi and estimasi["total"] > 0:
            biaya_renovasi = estimasi["total"]
        elif biaya_renovasi_manual:
            biaya_renovasi = int(biaya_renovasi_manual)

    harga_properti = properti["harga_penawaran"] or 0
    if harga_properti <= 0 and harga_simulasi:
        harga_properti = int(harga_simulasi)

    total_kebutuhan = harga_properti + biaya_renovasi
    uang_muka = round(total_kebutuhan * (persen_dp / 100.0))
    plafon_kpr = max(0, total_kebutuhan - uang_muka)
    estimasi_angsuran = hitung_angsuran_anuitas(plafon_kpr, program["suku_bunga"], tenor_tahun)
    penghasilan_minimal = round(estimasi_angsuran / 0.35) if estimasi_angsuran > 0 else 0

    bphtb = round(max(0, harga_properti - 80_000_000) * 0.05) if harga_properti > 0 else 0
    notaris_ppat = round(harga_properti * 0.01) if harga_properti > 0 else 0
    provisi_administrasi = round(plafon_kpr * 0.015) if plafon_kpr > 0 else 0
    total_biaya_awal = uang_muka + bphtb + notaris_ppat + provisi_administrasi

    return {
        "properti": {"id": properti["id"], "nama": properti["nama"], "harga": harga_properti},
        "program": {"kode": program["kode"], "nama": program["nama"], "suku_bunga": program["suku_bunga"]},
        "tenor_tahun": tenor_tahun,
        "persen_dp": persen_dp,
        "biaya_renovasi": biaya_renovasi,
        "plafon_kpr": plafon_kpr,
        "estimasi_angsuran": estimasi_angsuran,
        "estimasi_penghasilan_minimal": penghasilan_minimal,
        "biaya_awal": {
            "uang_muka": uang_muka,
            "bphtb": bphtb,
            "notaris_ppat": notaris_ppat,
            "provisi_administrasi": provisi_administrasi,
            "total": total_biaya_awal,
        },
        "disclaimer": "Simulasi bersifat indikatif berdasarkan asumsi PRD. Suku bunga, biaya akad, dan persetujuan kredit mengikuti ketentuan resmi Bank BTN.",
    }


@bp.post("/simulasi")
@wajib_login()
def simulasi():
    pengguna = pengguna_aktif()
    data = baca_json(SkemaSimulasiKPR)
    properti = layanan_properti.ambil_properti(data.properti_id, pengguna)
    hasil = _hitung_skenario(
        properti,
        data.program_kpr,
        data.persen_dp,
        data.tenor_tahun,
        data.sertakan_renovasi,
        data.harga_simulasi,
        data.biaya_renovasi_manual,
    )
    return sukses(hasil)


@bp.post("/ajukan-btn")
@wajib_login()
def ajukan_btn():
    pengguna = pengguna_aktif()
    data = baca_json(SkemaPengajuanKPR)
    properti = layanan_properti.ambil_properti(data.properti_id, pengguna, izinkan_staf=False)

    skenario = _hitung_skenario(
        properti,
        data.program_kpr,
        data.persen_dp,
        data.tenor_tahun,
        data.sertakan_renovasi,
        data.harga_simulasi,
        data.biaya_renovasi_manual,
    )
    if skenario["properti"]["harga"] <= 0:
        raise GalatAplikasi("Isi harga penawaran properti terlebih dahulu sebelum mengajukan KPR.", 422)

    koneksi = db.ambil_koneksi()
    koneksi.execute("UPDATE properti SET pilihan_utama = 0 WHERE pengguna_id = ?", (pengguna["id"],))
    koneksi.execute(
        "UPDATE properti SET pilihan_utama = 1, diperbarui = ? WHERE id = ?",
        (db.sekarang(), properti["id"]),
    )
    koneksi.commit()

    kota = (data.kota_properti or data.kota or "").strip() or None
    kode_rujukan = f"HW-KPR-{datetime.now():%Y%m%d}-{uuid.uuid4().hex[:5].upper()}"

    pengajuan_id = db.simpan("pengajuan_kpr", {
        "pengguna_id": pengguna["id"],
        "properti_id": properti["id"],
        "mitra_bank": "BTN",
        "program_kpr": skenario["program"]["kode"],
        "harga_properti": skenario["properti"]["harga"],
        "biaya_renovasi": skenario["biaya_renovasi"],
        "persen_dp": data.persen_dp,
        "nominal_dp": skenario["biaya_awal"]["uang_muka"],
        "plafon_kpr": skenario["plafon_kpr"],
        "tenor_tahun": data.tenor_tahun,
        "suku_bunga": skenario["program"]["suku_bunga"],
        "estimasi_angsuran": skenario["estimasi_angsuran"],
        "nama_pemohon": data.nama_pemohon.strip(),
        "telepon": data.telepon.strip(),
        "email": data.email,
        "status_pekerjaan": data.status_pekerjaan,
        "penghasilan_bulanan": data.penghasilan_bulanan,
        "kota": kota,
        "kota_properti": kota,
        "pilihan_layanan": data.pilihan_layanan,
        "kode_rujukan": kode_rujukan,
        "catatan": data.catatan.strip() if data.catatan else None,
    })

    hasil = db.satu("SELECT * FROM pengajuan_kpr WHERE id = ?", (pengajuan_id,))
    return sukses(hasil, 201, pesan="Permintaan konsultasi KPR berhasil disimpan.")


@bp.get("/riwayat")
@wajib_login()
def riwayat():
    pengguna = pengguna_aktif()
    baris = db.banyak(
        """SELECT k.*, p.nama AS properti_nama, p.alamat AS properti_alamat
           FROM pengajuan_kpr k
           JOIN properti p ON p.id = k.properti_id
           WHERE k.pengguna_id = ?
           ORDER BY k.id DESC""",
        (pengguna["id"],),
    )
    return sukses(baris)
