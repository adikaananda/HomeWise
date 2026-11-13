import json
import sqlite3
from pathlib import Path

from .layanan.ahsp import MATERIAL_BAWAAN

VERSI_TERBARU = 2


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


MIGRASI = {2: _ke_versi_2}


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
