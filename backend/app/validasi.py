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


class SkemaUbahProperti(BaseModel):
    nama: Optional[str] = Field(default=None, min_length=3, max_length=120)
    tujuan: Optional[Tujuan] = None
    harga_penawaran: Optional[int] = Field(default=None, ge=0)
    luas_tanah: Optional[float] = Field(default=None, gt=0)
    luas_bangunan: Optional[float] = Field(default=None, gt=0)
    tahun_bangun: Optional[int] = Field(default=None, ge=1900, le=2100)
    jumlah_lantai: Optional[int] = Field(default=None, ge=1, le=100)
    catatan: Optional[str] = Field(default=None, max_length=1000)
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
    paket: Literal["laporan_tunggal", "paket_hemat", "inspeksi_profesional"]
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
