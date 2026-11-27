import os
from pathlib import Path

DIR_BACKEND = Path(__file__).resolve().parent.parent


def _bool(nama, bawaan=False):
    nilai = os.getenv(nama)
    if nilai is None:
        return bawaan
    return nilai.strip().lower() in ("1", "true", "ya", "yes", "on")


def _muat_env():
    berkas = DIR_BACKEND / ".env"
    if not berkas.exists():
        return
    for baris in berkas.read_text(encoding="utf-8").splitlines():
        baris = baris.strip()
        if not baris or baris.startswith("#") or "=" not in baris:
            continue
        kunci, nilai = baris.split("=", 1)
        os.environ.setdefault(kunci.strip(), nilai.strip().strip('"').strip("'"))


_muat_env()


class Konfigurasi:
    LINGKUNGAN = os.getenv("LINGKUNGAN", "pengembangan")
    SECRET_KEY = os.getenv("SECRET_KEY", "ganti-dengan-kunci-rahasia-panjang")
    JWT_KEDALUWARSA_JAM = int(os.getenv("JWT_KEDALUWARSA_JAM", "72"))

    DATABASE_PATH = os.getenv("DATABASE_PATH", str(DIR_BACKEND / "data" / "homewise.db"))
    DIR_UNGGAHAN = os.getenv("DIR_UNGGAHAN", str(DIR_BACKEND / "data" / "unggahan"))
    DIR_FRONTEND = os.getenv("DIR_FRONTEND", str(DIR_BACKEND.parent / "frontend" / "dist"))
    MAX_CONTENT_LENGTH = int(os.getenv("MAKS_UNGGAHAN_MB", "10")) * 1024 * 1024

    CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
    URL_FRONTEND = os.getenv("URL_FRONTEND", "http://localhost:5173")

    AI_MODE = os.getenv("AI_MODE", "simulasi")
    AI_BASE_URL = os.getenv("AI_BASE_URL", "").rstrip("/")
    AI_API_KEY = os.getenv("AI_API_KEY", "")
    AI_TIMEOUT_DETIK = int(os.getenv("AI_TIMEOUT_DETIK", "60"))

    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
    OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "inclusionai/ling-3.2-flash:free").strip()
    OPENROUTER_FALLBACK_MODELS = [
        m.strip() for m in os.getenv("OPENROUTER_FALLBACK_MODELS", "openrouter/free").split(",") if m.strip()
    ]
    OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
    OPENROUTER_TIMEOUT_DETIK = int(os.getenv("OPENROUTER_TIMEOUT_DETIK", "25"))
    OPENROUTER_REASONING = _bool("OPENROUTER_REASONING", False)

    MIDTRANS_SERVER_KEY = os.getenv("MIDTRANS_SERVER_KEY", "")
    MIDTRANS_CLIENT_KEY = os.getenv("MIDTRANS_CLIENT_KEY", "")
    MIDTRANS_PRODUCTION = _bool("MIDTRANS_PRODUCTION")

    INDEKS_HARGA_WILAYAH = float(os.getenv("INDEKS_HARGA_WILAYAH", "1.0"))
    SEED_OTOMATIS = _bool("SEED_OTOMATIS", True)

    HARGA_TANAH_API_URL = os.getenv("HARGA_TANAH_API_URL", "").strip()
    HARGA_TANAH_API_KEY = os.getenv("HARGA_TANAH_API_KEY", "").strip()
    HARGA_TANAH_CACHE_JAM = int(os.getenv("HARGA_TANAH_CACHE_JAM", "6"))
