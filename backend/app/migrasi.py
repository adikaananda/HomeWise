import json
import sqlite3
from pathlib import Path

from .layanan.ahsp import MATERIAL_BAWAAN

VERSI_TERBARU = 7


def _ada_tabel(koneksi, nama):
    return koneksi.execute("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", (nama,)).fetchone() is not None


def _kolom(koneksi, tabel):
    return {baris[1] for baris in koneksi.execute(f"PRAGMA table_info({tabel})")}


def _ke_versi_2(koneksi):
    if "data_survei" not in _kolom(koneksi, "properti"):
        koneksi.execute("ALTER TABLE properti ADD COLUMN data_survei TEXT")

    if "material" not in _kolom(koneksi, "harga_referensi"):
        koneksi.execute("ALTER TABLE harga_referensi ADD COLUMN material TEXT NOT NULL DEFAULT '[]'")
        for kode, material in MATERIAL_BAWAAN.items():
            koneksi.execute("UPDATE harga_referensi SET material = ? WHERE kode = ?", (json.dumps(material, ensure_ascii=False), kode))

    if "area" not in _kolom(koneksi, "foto_bangunan"):
        koneksi.executescript("""
            CREATE TABLE foto_bangunan_baru (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                properti_id INTEGER NOT NULL REFERENCES properti(id) ON DELETE CASCADE,
                nama_berkas TEXT NOT NULL,
                nama_asli TEXT,
                ruang TEXT,
                area TEXT NOT NULL DEFAULT 'lainnya',
                sumber TEXT NOT NULL DEFAULT 'survei' CHECK (sumber IN ('survei', 'iklan', 'analis')),
                diunggah_oleh INTEGER REFERENCES pengguna(id),
                dibuat TEXT NOT NULL DEFAULT (datetime('now'))
            );
            INSERT INTO foto_bangunan_baru (id, properti_id, nama_berkas, nama_asli, ruang, area, sumber, diunggah_oleh, dibuat)
                SELECT id, properti_id, nama_berkas, nama_asli, ruang, 'lainnya',
                       CASE sumber WHEN 'analis' THEN 'analis' ELSE 'survei' END, diunggah_oleh, dibuat
                FROM foto_bangunan;
            DROP TABLE foto_bangunan;
            ALTER TABLE foto_bangunan_baru RENAME TO foto_bangunan;
            CREATE INDEX IF NOT EXISTS idx_foto_properti ON foto_bangunan(properti_id);
        """)


def _ke_versi_3(koneksi):
    koneksi.execute("""
        CREATE TABLE IF NOT EXISTS cache_llm (
            kunci TEXT PRIMARY KEY,
            jenis TEXT NOT NULL,
            model TEXT NOT NULL,
            teks TEXT NOT NULL,
            dibuat TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)


def _ke_versi_4(koneksi):
    if "pilihan_utama" not in _kolom(koneksi, "properti"):
        koneksi.execute("ALTER TABLE properti ADD COLUMN pilihan_utama INTEGER NOT NULL DEFAULT 0")
    koneksi.executescript("""
        CREATE TABLE IF NOT EXISTS pengajuan_kpr (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pengguna_id INTEGER NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,
            properti_id INTEGER NOT NULL REFERENCES properti(id) ON DELETE CASCADE,
            mitra_bank TEXT NOT NULL DEFAULT 'BTN',
            program_kpr TEXT NOT NULL,
            harga_properti INTEGER NOT NULL,
            biaya_renovasi INTEGER NOT NULL DEFAULT 0,
            persen_dp REAL NOT NULL,
            nominal_dp INTEGER NOT NULL,
            plafon_kpr INTEGER NOT NULL,
            tenor_tahun INTEGER NOT NULL,
            suku_bunga REAL NOT NULL,
            estimasi_angsuran INTEGER NOT NULL,
            nama_pemohon TEXT NOT NULL,
            telepon TEXT NOT NULL,
            email TEXT NOT NULL,
            status_pekerjaan TEXT NOT NULL,
            penghasilan_bulanan INTEGER NOT NULL DEFAULT 0,
            kota TEXT,
            status TEXT NOT NULL DEFAULT 'diajukan' CHECK (status IN ('diajukan', 'dihubungi', 'proses_bank', 'disetujui', 'ditolak')),
            catatan TEXT,
            dibuat TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_kpr_pengguna ON pengajuan_kpr(pengguna_id);
    """)


def _ke_versi_5(koneksi):
    kolom_kpr = _kolom(koneksi, "pengajuan_kpr")
    if "kota_properti" not in kolom_kpr:
        koneksi.execute("ALTER TABLE pengajuan_kpr ADD COLUMN kota_properti TEXT")
    if "pilihan_layanan" not in kolom_kpr:
        koneksi.execute("ALTER TABLE pengajuan_kpr ADD COLUMN pilihan_layanan TEXT DEFAULT 'konsultasi'")
    if "kode_rujukan" not in kolom_kpr:
        koneksi.execute("ALTER TABLE pengajuan_kpr ADD COLUMN kode_rujukan TEXT")


def _ke_versi_6(koneksi):
    teks = (Path(__file__).parent / "skema.sql").read_text(encoding="utf-8")
    awal = teks.index("CREATE TABLE IF NOT EXISTS wilayah_harga_tanah")
    koneksi.executescript(teks[awal:])


def _ke_versi_7(koneksi):
    if "spesifikasi" not in _kolom(koneksi, "properti"):
        koneksi.execute("ALTER TABLE properti ADD COLUMN spesifikasi TEXT")

    # Masukan pakar: "Plester tipis" dan "plester ulang" muncul berulang untuk dinding yang sama.
    # Bobok + plester + acian kini satu paket; acian berdiri sendiri hanya bila plester tidak dibongkar.
    koneksi.execute(
        "UPDATE harga_referensi SET nama = 'Acian ulang dinding (tanpa bongkar plester)' WHERE kode = 'acian_dinding'"
    )
    koneksi.execute(
        "UPDATE harga_referensi SET nama = 'Bongkar plester rusak, plester ulang & acian' WHERE kode = 'bobok_plester'"
    )
    # Harga dan material hanya diubah bila admin belum mengubah nilai bawaan lama.
    koneksi.execute(
        """UPDATE harga_referensi SET harga_material = 73000, harga_upah = 90000, material = ?
           WHERE kode = 'bobok_plester' AND harga_material = 55000 AND harga_upah = 60000""",
        (json.dumps(MATERIAL_BAWAAN["bobok_plester"], ensure_ascii=False),),
    )


MIGRASI = {2: _ke_versi_2, 3: _ke_versi_3, 4: _ke_versi_4, 5: _ke_versi_5, 6: _ke_versi_6, 7: _ke_versi_7}


def jalankan(jalur_db):
    koneksi = sqlite3.connect(jalur_db)
    try:
        koneksi.execute("PRAGMA journal_mode = WAL")
        if not _ada_tabel(koneksi, "pengguna"):
            koneksi.executescript((Path(__file__).parent / "skema.sql").read_text(encoding="utf-8"))
            koneksi.execute(f"PRAGMA user_version = {VERSI_TERBARU}")
            koneksi.commit()
            return

        versi = koneksi.execute("PRAGMA user_version").fetchone()[0] or 1
        for target in range(versi + 1, VERSI_TERBARU + 1):
            koneksi.execute("PRAGMA foreign_keys = OFF")
            MIGRASI[target](koneksi)
            koneksi.execute(f"PRAGMA user_version = {target}")
            koneksi.commit()
    finally:
        koneksi.close()
