import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from flask import current_app, g


def ambil_koneksi():
    if "db" not in g:
        g.db = sqlite3.connect(current_app.config["DATABASE_PATH"])
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def sekarang():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def tutup_koneksi(_=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def ke_dict(baris, kolom_json=()):
    if baris is None:
        return None
    data = dict(baris)
    for kolom in kolom_json:
        if data.get(kolom):
            data[kolom] = json.loads(data[kolom])
    return data


def satu(sql, parameter=(), kolom_json=()):
    baris = ambil_koneksi().execute(sql, parameter).fetchone()
    return ke_dict(baris, kolom_json)


def banyak(sql, parameter=(), kolom_json=()):
    hasil = ambil_koneksi().execute(sql, parameter).fetchall()
    return [ke_dict(b, kolom_json) for b in hasil]


def nilai(sql, parameter=()):
    baris = ambil_koneksi().execute(sql, parameter).fetchone()
    return baris[0] if baris else None


def eksekusi(sql, parameter=()):
    db = ambil_koneksi()
    kursor = db.execute(sql, parameter)
    db.commit()
    return kursor.lastrowid


def simpan(tabel, data):
    kolom = ", ".join(data.keys())
    tanda = ", ".join("?" for _ in data)
    return eksekusi(f"INSERT INTO {tabel} ({kolom}) VALUES ({tanda})", tuple(_serial(v) for v in data.values()))


def perbarui(tabel, id_baris, data, kolom_id="id"):
    if not data:
        return
    pasangan = ", ".join(f"{k} = ?" for k in data)
    eksekusi(
        f"UPDATE {tabel} SET {pasangan} WHERE {kolom_id} = ?",
        tuple(_serial(v) for v in data.values()) + (id_baris,),
    )


def simpan_atau_ganti(tabel, data, kolom_unik):
    kolom = ", ".join(data.keys())
    tanda = ", ".join("?" for _ in data)
    pembaruan = ", ".join(f"{k} = excluded.{k}" for k in data if k != kolom_unik)
    eksekusi(
        f"INSERT INTO {tabel} ({kolom}) VALUES ({tanda}) ON CONFLICT({kolom_unik}) DO UPDATE SET {pembaruan}",
        tuple(_serial(v) for v in data.values()),
    )


def _serial(v):
    if isinstance(v, (dict, list)):
        return json.dumps(v, ensure_ascii=False)
    if isinstance(v, bool):
        return int(v)
    return v


def inisialisasi_db(app):
    Path(app.config["DATABASE_PATH"]).parent.mkdir(parents=True, exist_ok=True)
    Path(app.config["DIR_UNGGAHAN"]).mkdir(parents=True, exist_ok=True)
    skema = (Path(__file__).parent / "skema.sql").read_text(encoding="utf-8")
    koneksi = sqlite3.connect(app.config["DATABASE_PATH"])
    koneksi.executescript(skema)
    koneksi.close()
