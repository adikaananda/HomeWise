from typing import Literal, Optional

from flask import request
from pydantic import BaseModel, Field, field_validator

from .layanan.konstanta import PERTANYAAN_SURVEI
from .respon import GalatAplikasi

Tujuan = Literal["rumah_tinggal", "investasi_sewa", "restoran", "kafe", "kantor", "ruko"]
JenisProperti = Literal["rumah", "apartemen", "ruko", "gedung", "tanah_bangunan"]


def baca_json(model):
    data = request.get_json(silent=True)
    if data is None:
        raise GalatAplikasi("Body permintaan harus berformat JSON.", 400)
    return model.model_validate(data)


class SkemaDaftar(BaseModel):
    nama: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=5, max_length=120)
    sandi: str = Field(min_length=8, max_length=128)
    telepon: Optional[str] = Field(default=None, max_length=20)
    perusahaan: Optional[str] = Field(default=None, max_length=100)

    @field_validator("email")
    @classmethod
    def email_valid(cls, v):
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Format email tidak valid")
        return v


class SkemaMasuk(BaseModel):
    email: str
    sandi: str

    @field_validator("email")
    @classmethod
    def rapikan(cls, v):
        return v.strip().lower()


class SkemaProfil(BaseModel):
    nama: Optional[str] = Field(default=None, min_length=2, max_length=80)
    telepon: Optional[str] = Field(default=None, max_length=20)
    perusahaan: Optional[str] = Field(default=None, max_length=100)


class SkemaCekCepat(BaseModel):
    lat: float = Field(ge=-11.5, le=6.5)
    lng: float = Field(ge=94.5, le=141.5)
    tujuan: Tujuan = "rumah_tinggal"
    alamat: Optional[str] = None


class SkemaSpesifikasi(BaseModel):
    kamar_tidur: Optional[int] = Field(default=None, ge=0, le=50)
    kamar_mandi: Optional[int] = Field(default=None, ge=0, le=50)
    lebar_depan_m: Optional[float] = Field(default=None, gt=0, le=500)
    kapasitas_parkir_mobil: Optional[int] = Field(default=None, ge=0, le=50)
    kondisi_penjual: Optional[Literal["siap_huni", "renovasi_ringan", "renovasi_berat", "belum_tahu"]] = None
    tahun_renovasi_terakhir: Optional[int] = Field(default=None, ge=1900, le=2100)
    status_harga: Optional[Literal["nego", "nett", "belum_tahu"]] = None
    # Faktor penilaian model Rijasa, Sukrawa & Nadiasa (2014) untuk rumah tinggal di Kota Denpasar.
    bentuk_tanah: Optional[Literal["persegi", "tidak_beraturan", "lainnya"]] = None
    posisi_tanah: Optional[Literal["interior", "hook", "tusuk_sate", "lainnya"]] = None
    ketinggian_tanah_m: Optional[float] = Field(default=None, ge=-10, le=10)
    legalitas_tanah: Optional[Literal["shm", "hgb", "lainnya"]] = None
    legalitas_bangunan: Optional[Literal["ada", "tidak"]] = None
    landscape_view: Optional[bool] = None
    kondisi_lingkungan: Optional[Literal["baik", "sedang", "kurang"]] = None
    lebar_jalan_depan_m: Optional[float] = Field(default=None, gt=0, le=60)
    lebar_jalan_menuju_m: Optional[float] = Field(default=None, gt=0, le=60)
    kondisi_jalan: Optional[Literal["baik", "sedang", "kurang"]] = None
    citra_lokasi: Optional[Literal["baik_sekali", "biasa", "kurang"]] = None
    kawasan: Optional[list[Literal["pusat_kota", "kdb30", "perdagangan_jasa", "pariwisata"]]] = Field(default=None, max_length=4)
    dekat_sutet: Optional[bool] = None
    dekat_kuburan: Optional[bool] = None
    dekat_polusi_udara: Optional[bool] = None
    dekat_polusi_suara: Optional[bool] = None
    struktur_bangunan: Optional[Literal["permanen", "bertingkat", "semi_permanen"]] = None
    tampilan_tren: Optional[bool] = None
    kelas_bahan: Optional[Literal["kelas_1", "kelas_2", "biasa"]] = None


class SkemaProperti(BaseModel):
    nama: str = Field(min_length=3, max_length=120)
    alamat: str = Field(min_length=5, max_length=300)
    lat: float = Field(ge=-11.5, le=6.5)
    lng: float = Field(ge=94.5, le=141.5)
    jenis_properti: JenisProperti = "rumah"
    tujuan: Tujuan = "rumah_tinggal"
    harga_penawaran: int = Field(ge=0, le=1_000_000_000_000)
    luas_tanah: Optional[float] = Field(default=None, gt=0, le=1_000_000)
    luas_bangunan: Optional[float] = Field(default=None, gt=0, le=1_000_000)
    tahun_bangun: Optional[int] = Field(default=None, ge=1900, le=2100)
    jumlah_lantai: Optional[int] = Field(default=1, ge=1, le=100)
    sumber_iklan: Optional[str] = Field(default=None, max_length=500)
    catatan: Optional[str] = Field(default=None, max_length=1000)
    spesifikasi: Optional[SkemaSpesifikasi] = None


class SkemaUbahProperti(BaseModel):
    nama: Optional[str] = Field(default=None, min_length=3, max_length=120)
    tujuan: Optional[Tujuan] = None
    harga_penawaran: Optional[int] = Field(default=None, ge=0)
    luas_tanah: Optional[float] = Field(default=None, gt=0)
    luas_bangunan: Optional[float] = Field(default=None, gt=0)
    tahun_bangun: Optional[int] = Field(default=None, ge=1900, le=2100)
    jumlah_lantai: Optional[int] = Field(default=None, ge=1, le=100)
    catatan: Optional[str] = Field(default=None, max_length=1000)
    spesifikasi: Optional[SkemaSpesifikasi] = None
    tersimpan: Optional[bool] = None


class SkemaSurvei(BaseModel):
    jawaban: dict[str, str] = {}
    catatan: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("jawaban")
    @classmethod
    def jawaban_valid(cls, v):
        opsi = {p["kode"]: p["opsi"] for p in PERTANYAAN_SURVEI}
        for kode, nilai in v.items():
            if kode not in opsi or nilai not in opsi[kode]:
                raise ValueError(f"Jawaban '{kode}' tidak dikenal")
        return v


class SkemaGantiSandi(BaseModel):
    sandi_lama: str
    sandi_baru: str = Field(min_length=8, max_length=128)


class SkemaPembayaran(BaseModel):
    paket: Literal["laporan_tunggal", "paket_hemat", "paket_komparasi", "inspeksi_profesional"]
    properti_id: Optional[int] = None


class SkemaSimulasiBayar(BaseModel):
    status: Literal["lunas", "gagal"] = "lunas"


class SkemaUbahInspeksi(BaseModel):
    jadwal: Optional[str] = None
    catatan: Optional[str] = Field(default=None, max_length=3000)
    status: Optional[Literal["dijadwalkan", "diperiksa"]] = None


class ItemValidasi(BaseModel):
    indeks: int = Field(ge=0)
    status: Literal["dikonfirmasi", "disesuaikan", "ditolak"]
    tingkat: Optional[Literal["ringan", "sedang", "berat"]] = None
    luas_m2: Optional[float] = Field(default=None, gt=0, le=10_000)
    catatan: Optional[str] = Field(default=None, max_length=500)


class TemuanTambahan(BaseModel):
    jenis: Literal["retak_dinding", "cat_mengelupas", "noda_lembap", "kerusakan_plafon", "keramik_rusak", "atap_bocor"]
    tingkat: Literal["ringan", "sedang", "berat"]
    luas_m2: float = Field(gt=0, le=10_000)
    catatan: Optional[str] = Field(default=None, max_length=500)


class SkemaTemuanValidasi(BaseModel):
    item: list[ItemValidasi] = []
    tambahan: list[TemuanTambahan] = []


class SkemaUbahPengguna(BaseModel):
    peran: Optional[Literal["pencari", "analis", "admin"]] = None
    aktif: Optional[bool] = None
    kredit_laporan: Optional[int] = Field(default=None, ge=0, le=10_000)


class MaterialReferensi(BaseModel):
    nama: str = Field(min_length=2, max_length=80)
    satuan: str = Field(min_length=1, max_length=20)
    koefisien: float = Field(gt=0, le=10_000)
    kemasan: Optional[str] = Field(default=None, max_length=40)
    isi_kemasan: Optional[float] = Field(default=None, gt=0, le=100_000)


class SkemaHargaReferensi(BaseModel):
    kode: str = Field(min_length=2, max_length=50, pattern=r"^[a-z0-9_]+$")
    nama: str = Field(min_length=3, max_length=120)
    kategori: str = Field(min_length=2, max_length=50)
    satuan: str = Field(default="m2", max_length=20)
    harga_material: int = Field(ge=0)
    harga_upah: int = Field(ge=0)
    material: list[MaterialReferensi] = []
    aktif: bool = True


class SkemaUbahHargaReferensi(BaseModel):
    nama: Optional[str] = Field(default=None, min_length=3, max_length=120)
    kategori: Optional[str] = None
    satuan: Optional[str] = None
    harga_material: Optional[int] = Field(default=None, ge=0)
    harga_upah: Optional[int] = Field(default=None, ge=0)
    material: Optional[list[MaterialReferensi]] = None
    aktif: Optional[bool] = None


class SkemaUbahSumberData(BaseModel):
    status: Optional[Literal["aktif", "perlu_pembaruan", "nonaktif"]] = None
    catatan: Optional[str] = Field(default=None, max_length=500)
    tandai_diperbarui: bool = False


class SkemaSimulasiKPR(BaseModel):
    properti_id: int = Field(gt=0)
    program_kpr: Literal["promo_fixed", "platinum", "btn_gaess", "btn_platinum", "btn_renovasi"] = "promo_fixed"
    sertakan_renovasi: bool = False
    persen_dp: float = Field(default=15, ge=5, le=80)
    tenor_tahun: int = Field(default=20, ge=1, le=30)
    harga_simulasi: Optional[int] = Field(default=None, ge=0, le=1_000_000_000_000)
    biaya_renovasi_manual: Optional[int] = Field(default=None, ge=0, le=100_000_000_000)


class SkemaPengajuanKPR(BaseModel):
    properti_id: int = Field(gt=0)
    program_kpr: Literal["promo_fixed", "platinum", "btn_gaess", "btn_platinum", "btn_renovasi"] = "promo_fixed"
    sertakan_renovasi: bool = False
    persen_dp: float = Field(ge=5, le=80)
    tenor_tahun: int = Field(ge=1, le=30)
    harga_simulasi: Optional[int] = Field(default=None, ge=0, le=1_000_000_000_000)
    biaya_renovasi_manual: Optional[int] = Field(default=None, ge=0, le=100_000_000_000)
    nama_pemohon: str = Field(min_length=2, max_length=80)
    telepon: str = Field(min_length=8, max_length=24)
    email: str = Field(min_length=5, max_length=120)
    status_pekerjaan: Literal[
        "karyawan_tetap",
        "wirausaha",
        "profesional",
        "pns",
        "Karyawan tetap",
        "Wirausaha",
        "Profesional",
        "PNS / BUMN",
    ] = "karyawan_tetap"
    penghasilan_bulanan: int = Field(default=0, ge=0, le=10_000_000_000)
    kota: Optional[str] = Field(default=None, max_length=80)
    kota_properti: Optional[str] = Field(default=None, max_length=80)
    pilihan_layanan: Literal["konsultasi", "mandiri"] = "konsultasi"
    persetujuan: bool = True
    catatan: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("email")
    @classmethod
    def email_kpr_valid(cls, v):
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Format email tidak valid")
        return v


class SkemaHargaTanah(BaseModel):
    kode: str = Field(min_length=2, max_length=40, pattern=r"^[a-z0-9-]+$")
    nama: str = Field(min_length=2, max_length=80)
    kecamatan: Optional[str] = Field(default=None, max_length=80)
    kabupaten: str = Field(min_length=2, max_length=80)
    lat: float = Field(ge=-11, le=6)
    lng: float = Field(ge=94, le=142)
    radius_m: int = Field(default=1200, ge=200, le=5000)
    periode: str = Field(pattern=r"^20\d{2}-(0[1-9]|1[0-2])$")
    harga_min: int = Field(gt=0)
    harga_median: int = Field(gt=0)
    harga_maks: int = Field(gt=0)
    jumlah_sampel: int = Field(default=0, ge=0)
    jenis_data: Literal["penawaran", "transaksi", "znt"]
    sumber: str = Field(min_length=3, max_length=200)
    url_sumber: Optional[str] = Field(default=None, max_length=500)

    @field_validator("harga_maks")
    @classmethod
    def urutan_harga(cls, v, info):
        minimum = info.data.get("harga_min")
        median = info.data.get("harga_median")
        if minimum is not None and median is not None and not (minimum <= median <= v):
            raise ValueError("Harga harus berurutan: minimum ≤ median ≤ maksimum.")
        return v
