import json
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image
import xgboost as xgb

DIR_DASAR = Path(__file__).resolve().parent
DIR_ARTEFAK = DIR_DASAR / "artefak"

JALUR_ONNX = DIR_ARTEFAK / "mobilenetv2_fitur.onnx"
JALUR_XGB = DIR_ARTEFAK / "model_xgboost.json"
JALUR_META = DIR_ARTEFAK / "metadata_model.json"

MEAN_IMAGENET = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape(1, 3, 1, 1)
STD_IMAGENET = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape(1, 3, 1, 1)

UKURAN_ANALISIS = 320

_CACHE_MODEL = {}


def model_tersedia() -> bool:
    """Memeriksa apakah seluruh artefak model ONNX + XGBoost sudah tersedia."""
    return JALUR_ONNX.exists() and JALUR_XGB.exists() and JALUR_META.exists()


def _muat_model():
    if "sesi" not in _CACHE_MODEL:
        if not model_tersedia():
            raise FileNotFoundError(
                f"Artefak model belum ada di {DIR_ARTEFAK}. Jalankan model_klasifikasi/latih.py terlebih dahulu."
            )
        sesi = ort.InferenceSession(str(JALUR_ONNX), providers=["CPUExecutionProvider"])
        clf = xgb.Booster()
        clf.load_model(str(JALUR_XGB))
        meta = json.loads(JALUR_META.read_text(encoding="utf-8"))
        _CACHE_MODEL["sesi"] = sesi
        _CACHE_MODEL["clf"] = clf
        _CACHE_MODEL["kelas"] = meta["kelas"]
    return _CACHE_MODEL["sesi"], _CACHE_MODEL["clf"], _CACHE_MODEL["kelas"]


def _terapkan_clahe_rgb(img_rgb: np.ndarray, ukuran: int = 224) -> np.ndarray:
    resized = cv2.resize(img_rgb, (ukuran, ukuran), interpolation=cv2.INTER_AREA)
    lab = cv2.cvtColor(resized, cv2.COLOR_RGB2LAB)
    l_chan, a_chan, b_chan = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_tajam = clahe.apply(l_chan)
    gabung = cv2.merge((l_tajam, a_chan, b_chan))
    return cv2.cvtColor(gabung, cv2.COLOR_LAB2RGB)


def _pra_proses_batch(daftar_rgb: list[np.ndarray]) -> np.ndarray:
    hasil = []
    for img in daftar_rgb:
        tajam = _terapkan_clahe_rgb(img, 224)
        arr = tajam.astype(np.float32) / 255.0
        hasil.append(np.transpose(arr, (2, 0, 1)))
    batch = np.stack(hasil, axis=0)
    return (batch - MEAN_IMAGENET) / STD_IMAGENET


def _deteksi_batas_lantai(lab: np.ndarray, dom: tuple[float, float, float], area: str) -> float:
    """Mendeteksi garis horisontal pembatas dinding-lantai agar lantai keramik tidak dianalisis."""
    if (area or "").lower() == "lantai":
        return 1.0

    h, w = lab.shape[:2]
    _, a_dom, b_dom = dom
    l_chan, a_chan, b_chan = lab[:, :, 0], lab[:, :, 1], lab[:, :, 2]

    gy = np.abs(cv2.Sobel(l_chan, cv2.CV_32F, 0, 1, ksize=3))
    x1, x2 = int(0.15 * w), int(0.85 * w)
    row_gy = gy[:, x1:x2].mean(axis=1)

    y_mulai, y_akhir = int(0.45 * h), int(0.86 * h)
    peak_gy = float(row_gy[y_mulai:y_akhir].max())
    ambang_garis = max(65.0, 0.45 * peak_gy)

    # Pilih garis pembatas paling atas pada 45%..86% yang langsung diikuti perubahan warna ke plint/lantai
    for y in range(y_mulai, y_akhir):
        if row_gy[y] < ambang_garis:
            continue
        if y + 16 >= h or y - 16 < 0:
            continue
        a_bw = float(np.median(a_chan[y + 4 : min(h, y + 20), x1:x2]))
        b_bw = float(np.median(b_chan[y + 4 : min(h, y + 20), x1:x2]))
        a_at = float(np.median(a_chan[max(0, y - 24) : y - 4, x1:x2]))
        b_at = float(np.median(b_chan[max(0, y - 24) : y - 4, x1:x2]))
        beda_dom = float(np.hypot(a_bw - a_dom, b_bw - b_dom))
        beda_lokal = float(np.hypot(a_bw - a_at, b_bw - b_at))
        if beda_dom >= 5.5 and beda_lokal >= 5.0:
            return float(y / h)
    return 1.0


def _buat_masker_permukaan(img_rgb: np.ndarray, area: str) -> dict:
    """Memisahkan bidang permukaan utama dari lantai dan perabot/objek non-bangunan di tepi foto."""
    sm = cv2.resize(img_rgb, (UKURAN_ANALISIS, UKURAN_ANALISIS), interpolation=cv2.INTER_AREA)
    lab = cv2.cvtColor(sm, cv2.COLOR_RGB2LAB).astype(np.float32)
    hsv = cv2.cvtColor(sm, cv2.COLOR_RGB2HSV).astype(np.float32)
    h, w = lab.shape[:2]

    zona = lab[int(0.06 * h) : int(0.48 * h), int(0.14 * w) : int(0.82 * w)]
    l_dom = float(np.median(zona[:, :, 0]))
    a_dom = float(np.median(zona[:, :, 1]))
    b_dom = float(np.median(zona[:, :, 2]))
    s_dom = float(np.median(hsv[int(0.06 * h) : int(0.48 * h), int(0.14 * w) : int(0.82 * w), 1]))

    l_mad = float(np.median(np.abs(zona[:, :, 0] - l_dom))) * 1.4826
    c_dist_zona = np.hypot(zona[:, :, 1] - a_dom, zona[:, :, 2] - b_dom)
    c_mad = float(np.median(c_dist_zona)) * 1.4826
    l_std = max(6.0, l_mad)
    chroma_std = max(2.5, c_mad)

    y_lantai = _deteksi_batas_lantai(lab, (l_dom, a_dom, b_dom), area)
    mask = np.ones((h, w), dtype=np.uint8)
    if y_lantai < 0.99:
        mask[max(1, int(round(y_lantai * h)) - 1) :, :] = 0

    # Masking objek perabot (kasur merah/biru, rak gelap) pada tepi kiri/kanan agar tidak masuk kontur
    l_ch, a_ch, b_ch = lab[:, :, 0], lab[:, :, 1], lab[:, :, 2]
    sat = hsv[:, :, 1]
    chroma_dist = np.hypot(a_ch - a_dom, b_ch - b_dom)
    zona_tepi = np.zeros((h, w), dtype=bool)
    zona_tepi[:, : int(0.13 * w)] = True
    zona_tepi[:, int(0.78 * w) :] = True

    objek_tepi = (
        ((sat > 78.0) & ((a_ch > a_dom + 8.0) | (b_ch < b_dom - 6.0)))
        | ((l_ch < 55.0) & zona_tepi)
    )
    if y_lantai < 0.99:
        objek_tepi = objek_tepi & (zona_tepi | ((sat > 85.0) & (chroma_dist > 24.0)))
    else:
        objek_tepi = objek_tepi & zona_tepi

    non_wall = (objek_tepi & (mask > 0)).astype(np.uint8)
    jml_komp, label_komp, stats, _ = cv2.connectedComponentsWithStats(non_wall, connectivity=8)
    mask_perabot = np.zeros((h, w), dtype=np.uint8)
    for cid in range(1, jml_komp):
        x, _, cw, _, area_c = stats[cid]
        if area_c >= 25 and (x <= 3 or (x + cw) >= (w - 3)):
            mask_perabot[label_komp == cid] = 255
    if np.any(mask_perabot):
        mask_perabot = cv2.dilate(mask_perabot, np.ones((11, 11), np.uint8))
        mask[mask_perabot > 0] = 0

    if y_lantai < 0.99:
        # Perabot (kasur/rak) menempel sampai lantai: masker seluruh kolom di bawah puncak objek tepi
        y_floor_px = int(y_lantai * h)
        for col in range(w):
            if col >= int(0.06 * w) and col <= int(0.82 * w):
                continue
            ys_obj = np.where(mask_perabot[:y_floor_px, col] > 0)[0]
            if len(ys_obj) >= 8:
                mask[int(ys_obj.min()) :, col] = 0

        rasio_kolom = (mask[:y_floor_px, :] > 0).mean(axis=0)
        for col in np.where(rasio_kolom < 0.45)[0]:
            if col < int(0.06 * w) or col > int(0.82 * w):
                mask[:, col] = 0

    return {
        "sm": sm,
        "lab": lab,
        "hsv": hsv,
        "mask": mask,
        "y_lantai": float(y_lantai),
        "dom": (l_dom, a_dom, b_dom, s_dom),
        "std": (l_std, chroma_std),
    }


def _gabung_kotak_berdekatan(
    daftar: list[tuple[tuple[float, float, float, float], float]],
    jarak_maks: float = 0.09,
    y_maks: float = 1.0,
) -> list[tuple[tuple[float, float, float, float], float]]:
    if len(daftar) <= 1:
        return daftar
    boxes = [[float(b[0]), float(b[1]), float(b[0] + b[2]), float(b[1] + b[3]), float(s)] for b, s in daftar]
    berubah = True
    while berubah:
        berubah = False
        baru = []
        dipakai = [False] * len(boxes)
        for i in range(len(boxes)):
            if dipakai[i]:
                continue
            x1, y1, x2, y2, s1 = boxes[i]
            for j in range(i + 1, len(boxes)):
                if dipakai[j]:
                    continue
                ax1, ay1, ax2, ay2, s2 = boxes[j]
                dx = max(0.0, max(ax1 - x2, x1 - ax2))
                dy = max(0.0, max(ay1 - y2, y1 - ay2))
                if dx <= jarak_maks and dy <= jarak_maks:
                    x1, y1 = min(x1, ax1), min(y1, ay1)
                    x2, y2 = max(x2, ax2), max(y2, ay2)
                    s1 = max(s1, s2)
                    dipakai[j] = True
                    berubah = True
            dipakai[i] = True
            baru.append([x1, y1, x2, y2, s1])
        boxes = baru

    hasil = []
    for x1, y1, x2, y2, skor in boxes:
        x1 = max(0.01, float(x1))
        y1 = max(0.01, float(y1))
        x2 = min(0.99, float(x2))
        y2 = min(min(0.99, float(y_maks)), float(y2))
        lb, tg = x2 - x1, y2 - y1
        if lb >= 0.04 and tg >= 0.04 and not (lb >= 0.88 and tg <= 0.08):
            hasil.append(((x1, y1, lb, tg), float(skor)))
    return sorted(hasil, key=lambda item: item[1], reverse=True)


def _kotak_dari_peta(
    peta: np.ndarray,
    kernel_close: tuple[int, int],
    area_min_rasio: float,
    mask_permukaan: np.ndarray,
    y_maks: float,
    pad: float = 0.02,
    jarak_gabung: float = 0.09,
    min_fill: float = 0.03,
    min_kotak_gabung: float = 0.0,
    pakai_open: bool = True,
    maks_fill: float = 1.0,
) -> list[tuple[tuple[float, float, float, float], float]]:
    """Mengekstrak bounding box ternormalisasi dari peta piksel anomali."""
    h, w = peta.shape[:2]
    if pakai_open:
        bersih = cv2.morphologyEx(peta.astype(np.uint8) * 255, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    else:
        jml_k, label_k, stats_k, _ = cv2.connectedComponentsWithStats((peta > 0).astype(np.uint8), connectivity=8)
        bersih = np.zeros((h, w), dtype=np.uint8)
        for cid_k in range(1, jml_k):
            if stats_k[cid_k, cv2.CC_STAT_AREA] >= 4:
                bersih[label_k == cid_k] = 255
    if not np.any(bersih):
        return []

    k_cls = cv2.getStructuringElement(cv2.MORPH_RECT, kernel_close)
    rapat = cv2.morphologyEx(bersih, cv2.MORPH_CLOSE, k_cls)
    rapat = rapat & (mask_permukaan * 255)

    area_permukaan = max(1.0, float((mask_permukaan > 0).sum()))
    jml, _, stats, _ = cv2.connectedComponentsWithStats(rapat, connectivity=8)
    kandidat = []
    for cid in range(1, jml):
        x, y, cw, ch_b, area_px = stats[cid]
        if area_px < area_min_rasio * area_permukaan:
            continue
        isi_asli = float((bersih[y : y + ch_b, x : x + cw] > 0).sum()) / max(1.0, float(cw * ch_b))
        if isi_asli < min_fill or isi_asli > maks_fill:
            continue
        nx1 = max(0.01, float(x / w) - pad)
        ny1 = max(0.01, float(y / h) - pad)
        nx2 = min(0.99, float((x + cw) / w) + pad)
        ny2 = min(min(0.99, float(y_maks)), float((y + ch_b) / h) + pad)
        lb, tg = nx2 - nx1, ny2 - ny1
        if lb < 0.04 or tg < 0.04 or (lb >= 0.88 and tg <= 0.08):
            continue
        skor_visual = float(min(1.0, (area_px / area_permukaan) * 8.0 + isi_asli * 0.6))
        kandidat.append(((nx1, ny1, lb, tg), skor_visual))

    digabung = _gabung_kotak_berdekatan(kandidat, jarak_maks=jarak_gabung, y_maks=y_maks)
    if min_kotak_gabung > 0:
        digabung = [item for item in digabung if (item[0][2] * item[0][3]) >= min_kotak_gabung]
    return digabung


def _kandidat_kontur_kerusakan(info: dict, area: str) -> dict[str, list[tuple[tuple[float, float, float, float], float]]]:
    """Menghasilkan kandidat kotak presisi untuk kupasan cat, noda lembap, dan retak."""
    lab = info["lab"]
    hsv = info["hsv"]
    mask = info["mask"] > 0
    y_lantai = info["y_lantai"]
    l_dom, a_dom, b_dom, s_dom = info["dom"]
    l_std, chroma_std = info["std"]
    h, w = lab.shape[:2]

    l_ch, a_ch, b_ch = lab[:, :, 0], lab[:, :, 1], lab[:, :, 2]
    sat = hsv[:, :, 1]
    chroma_dist = np.hypot(a_ch - a_dom, b_ch - b_dom)

    grad = cv2.morphologyEx(l_ch, cv2.MORPH_GRADIENT, np.ones((3, 3), np.float32))
    local_edge = cv2.GaussianBlur((grad > 13.0).astype(np.float32), (15, 15), 0)
    blur_l = cv2.GaussianBlur(l_ch, (9, 9), 0)
    l_local_std = np.sqrt(np.maximum(0.0, cv2.GaussianBlur(l_ch * l_ch, (9, 9), 0) - blur_l * blur_l))

    y_batas = y_lantai - 0.005 if y_lantai < 0.99 else 0.99
    if y_lantai < 0.99:
        mask_dinding = mask.copy()
        mask_dinding[max(1, int((y_lantai - 0.015) * h)) :, :] = False
    else:
        mask_dinding = mask

    # 1. Noda kelembapan: area gelap kusam/berjamur + pergeseran hangat (dB >= 3.2) atau tekstur kasar
    zona_lembap = mask.copy()
    if y_lantai < 0.99 and (area or "").lower() not in ("plafon_basah", "atap_talang"):
        zona_lembap[: int(0.72 * y_lantai * h), :] = False

    lembap_hangat = (b_ch - b_dom) >= 3.2
    lembap_kusam_tekstur = (l_local_std >= 4.5) & (b_dom >= 132.0)
    peta_damp = (
        zona_lembap
        & (l_ch < l_dom - max(10.0, 0.95 * l_std))
        & (lembap_hangat | lembap_kusam_tekstur)
        & (sat < max(72.0, s_dom + 15.0))
    )
    kandidat_damp = _kotak_dari_peta(
        peta_damp,
        kernel_close=(25, 13),
        area_min_rasio=0.012,
        mask_permukaan=zona_lembap.astype(np.uint8),
        y_maks=y_batas,
        pad=0.02,
        jarak_gabung=0.05,
        min_fill=0.05,
    )

    # 2. Cat mengelupas / menggelembung: substrat terbuka + cat melepuh bertepi tajam (tolak bayangan & zona lembap tengah)
    damp_dilasi = cv2.dilate(peta_damp.astype(np.uint8), np.ones((15, 15), np.uint8)) > 0
    zona_tengah_kanan = np.zeros((h, w), dtype=bool)
    zona_tengah_kanan[:, int(0.25 * w) :] = True
    bayangan_halus = (l_ch < l_dom - 12.0) & (chroma_dist < 8.5) & (local_edge < 0.08)
    kupasan_terbuka = (chroma_dist > max(5.5, 1.6 * chroma_std)) & (
        (local_edge > 0.055) | (chroma_dist > max(11.0, 2.4 * chroma_std))
    )
    cat_melepuh = (l_ch >= l_dom - 24.0) & (grad >= 18.0) & (local_edge >= 0.14) & (chroma_dist >= 2.8)
    peta_peel = (
        mask_dinding
        & ~bayangan_halus
        & ~(damp_dilasi & zona_tengah_kanan)
        & (kupasan_terbuka | cat_melepuh)
    )

    kandidat_peel = _kotak_dari_peta(
        peta_peel,
        kernel_close=(27, 29),
        area_min_rasio=0.004,
        mask_permukaan=mask_dinding.astype(np.uint8),
        y_maks=y_batas,
        pad=0.02,
        jarak_gabung=0.15,
        min_fill=0.025,
        min_kotak_gabung=0.012,
    )

    # 3. Retak dinding: Black-Hat mendeteksi celah gelap memanjang (tanpa blok gelap lebar seperti roster)
    bh = cv2.morphologyEx(
        np.clip(l_ch, 0, 255).astype(np.uint8),
        cv2.MORPH_BLACKHAT,
        cv2.getStructuringElement(cv2.MORPH_RECT, (11, 11)),
    )
    peta_retak_awal = mask_dinding & (bh >= 15) & (chroma_dist < 18.0)
    inti_gelap = cv2.erode(peta_retak_awal.astype(np.uint8) * 255, np.ones((9, 9), np.uint8))
    if np.any(inti_gelap):
        peta_retak = peta_retak_awal & (cv2.dilate(inti_gelap, np.ones((13, 13), np.uint8)) == 0)
    else:
        peta_retak = peta_retak_awal
    kandidat_retak = _kotak_dari_peta(
        peta_retak,
        kernel_close=(19, 19),
        area_min_rasio=0.0012,
        mask_permukaan=mask_dinding.astype(np.uint8),
        y_maks=y_batas,
        pad=0.02,
        jarak_gabung=0.025,
        min_fill=0.012,
        min_kotak_gabung=0.006,
        pakai_open=False,
        maks_fill=0.45,
    )

    return (
        {
            "cat_mengelupas": kandidat_peel,
            "noda_lembap": kandidat_damp,
            "retak_dinding": kandidat_retak,
        },
        {
            "cat_mengelupas": peta_peel,
            "noda_lembap": peta_damp,
            "retak_dinding": peta_retak,
        },
    )


def _kunci_mask_dari_kelas(kelas_bd3: str) -> str:
    if kelas_bd3 in ("peeling", "spalling"):
        return "cat_mengelupas"
    if kelas_bd3 in ("stain", "algae"):
        return "noda_lembap"
    return "retak_dinding"


def _ekstrak_poligon(
    peta_mask: np.ndarray,
    kotak: tuple[float, float, float, float],
    jenis_dasar: str,
) -> tuple[list[list[list[float]]] | None, float | None]:
    """Mengekstrak daftar poligon simpul ternormalisasi dari seluruh kontur signifikan di dalam ROI kotak."""
    h, w = peta_mask.shape[:2]
    kx, ky, lb, tg = kotak
    x1 = max(0, int(np.floor(kx * w)))
    y1 = max(0, int(np.floor(ky * h)))
    x2 = min(w, int(np.ceil((kx + lb) * w)))
    y2 = min(h, int(np.ceil((ky + tg) * h)))
    if x2 <= x1 + 2 or y2 <= y1 + 2:
        return None, None

    roi = (peta_mask[y1:y2, x1:x2] > 0).astype(np.uint8) * 255
    if not np.any(roi):
        return None, None

    if jenis_dasar == "retak_dinding":
        eps_mul, maks_simpul, min_area_px, rasio_min_rel, maks_kontur = 0.010, 20, 10.0, 0.06, 6
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        clean = cv2.morphologyEx(roi, cv2.MORPH_CLOSE, k)
        kontur, _ = cv2.findContours(clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        luas_semua = [cv2.contourArea(c) for c in kontur]
        if max(luas_semua, default=0.0) < min_area_px or sum(luas_semua) < 0.25 * float((roi > 0).sum()):
            k_besar = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
            clean = cv2.morphologyEx(roi, cv2.MORPH_CLOSE, k_besar)
            kontur, _ = cv2.findContours(clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    else:
        bersih = cv2.morphologyEx(roi, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
        clean = cv2.morphologyEx(bersih, cv2.MORPH_CLOSE, k)
        eps_mul, maks_simpul, min_area_px, rasio_min_rel, maks_kontur = 0.015, 18, 24.0, 0.08, 6
        kontur, _ = cv2.findContours(clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not kontur:
        return None, None

    terurut = sorted(((float(cv2.contourArea(c)), c) for c in kontur), key=lambda item: item[0], reverse=True)
    luas_terbesar = terurut[0][0]
    if luas_terbesar < min_area_px:
        return None, None

    daftar_poligon = []
    total_luas_px = 0.0
    for luas_px, cnt in terurut:
        if len(daftar_poligon) >= maks_kontur:
            break
        if luas_px < min_area_px or luas_px < rasio_min_rel * luas_terbesar:
            continue
        peri = float(cv2.arcLength(cnt, True))
        if peri <= 0:
            continue

        eps = eps_mul
        approx = cv2.approxPolyDP(cnt, eps * peri, True)
        for _ in range(12):
            if len(approx) <= maks_simpul:
                break
            eps *= 1.25
            approx = cv2.approxPolyDP(cnt, eps * peri, True)

        if len(approx) < 3:
            hull = cv2.convexHull(cnt)
            approx = cv2.approxPolyDP(hull, 0.02 * float(cv2.arcLength(hull, True)), True)
            if len(approx) < 3:
                continue

        titik = [
            [
                round(min(1.0, max(0.0, float((pt[0][0] + x1) / w))), 3),
                round(min(1.0, max(0.0, float((pt[0][1] + y1) / h))), 3),
            ]
            for pt in approx
        ]
        daftar_poligon.append(titik)
        total_luas_px += luas_px

    if not daftar_poligon:
        return None, None
    rasio_luas = total_luas_px / max(1.0, float(h * w))
    return daftar_poligon, rasio_luas


def _jenis_sesuai_area(jenis_dasar: str, area: str) -> str:
    area = (area or "lainnya").lower()
    if jenis_dasar == "cat_mengelupas":
        if area == "plafon_basah":
            return "kerusakan_plafon"
        if area == "lantai":
            return "keramik_rusak"
        return "cat_mengelupas"
    if jenis_dasar == "noda_lembap":
        if area == "atap_talang":
            return "atap_bocor"
        if area == "plafon_basah":
            return "kerusakan_plafon"
        return "noda_lembap"
    if jenis_dasar == "retak_dinding":
        if area == "lantai":
            return "keramik_rusak"
        if area == "plafon_basah":
            return "kerusakan_plafon"
        return "retak_dinding"
    return jenis_dasar


def _petakan_ke_homewise(
    kelas_bd3: str,
    prob: float,
    area: str,
    kotak: tuple[float, float, float, float],
    poligon_list: list[list[list[float]]] | None = None,
    rasio_luas: float | None = None,
):
    """Memetakan kelas visual BD3 + konteks area foto ke skema temuan HomeWise."""
    _, _, lebar, tinggi = kotak
    if rasio_luas is not None and rasio_luas > 0:
        if kelas_bd3 in ("major_crack", "minor_crack"):
            rasio_efektif = max(rasio_luas, 0.35 * lebar * tinggi)
        else:
            rasio_efektif = rasio_luas
    else:
        rasio_efektif = lebar * tinggi
    luas_m2 = round(float(min(20.0, max(0.5, rasio_efektif * 12.0))), 1)

    if kelas_bd3 == "major_crack":
        tingkat = "berat"
        jenis = _jenis_sesuai_area("retak_dinding", area)
    elif kelas_bd3 == "minor_crack":
        tingkat = "sedang" if prob >= 0.78 else "ringan"
        jenis = _jenis_sesuai_area("retak_dinding", area)
    elif kelas_bd3 == "peeling":
        tingkat = "sedang" if prob >= 0.65 or (lebar * tinggi) >= 0.10 else "ringan"
        jenis = _jenis_sesuai_area("cat_mengelupas", area)
    elif kelas_bd3 == "spalling":
        tingkat = "berat"
        jenis = _jenis_sesuai_area("cat_mengelupas", area)
    elif kelas_bd3 == "algae":
        tingkat = "berat" if prob >= 0.80 else "sedang"
        jenis = _jenis_sesuai_area("noda_lembap", area)
    elif kelas_bd3 == "stain":
        tingkat = "sedang" if prob >= 0.65 or (lebar * tinggi) >= 0.06 else "ringan"
        jenis = _jenis_sesuai_area("noda_lembap", area)
    else:
        return None

    return {
        "jenis": jenis,
        "tingkat": tingkat,
        "kepercayaan": round(float(prob), 2),
        "luas_m2": luas_m2,
        "kotak": {
            "x": round(float(kotak[0]), 3),
            "y": round(float(kotak[1]), 3),
            "lebar": round(float(kotak[2]), 3),
            "tinggi": round(float(kotak[3]), 3),
        },
        "poligon": poligon_list[0] if poligon_list else None,
        "poligon_list": poligon_list,
    }


def _potong_dengan_konteks(img_rgb: np.ndarray, kotak: tuple[float, float, float, float], konteks: float = 0.03) -> np.ndarray:
    h, w = img_rgb.shape[:2]
    x, y, lb, tg = kotak
    x1 = max(0, int(round((x - konteks) * w)))
    y1 = max(0, int(round((y - konteks) * h)))
    x2 = min(w, max(x1 + 1, int(round((x + lb + konteks) * w))))
    y2 = min(h, max(y1 + 1, int(round((y + tg + konteks) * h))))
    return img_rgb[y1:y2, x1:x2]


def _pilih_kotak_closeup(kelas_bd3: str, peta_kandidat: dict) -> tuple[float, float, float, float]:
    """Memilih kotak kontur sesuai keluarga kelas gambar close-up BD3."""
    if kelas_bd3 in ("peeling", "spalling"):
        kunci = "cat_mengelupas"
    elif kelas_bd3 in ("stain", "algae"):
        kunci = "noda_lembap"
    else:
        kunci = "retak_dinding"

    daftar_kotak = peta_kandidat.get(kunci)
    if daftar_kotak:
        if len(daftar_kotak) == 1:
            return daftar_kotak[0][0]
        x1 = min(b[0] for b, _ in daftar_kotak)
        y1 = min(b[1] for b, _ in daftar_kotak)
        x2 = max(b[0] + b[2] for b, _ in daftar_kotak)
        y2 = max(b[1] + b[3] for b, _ in daftar_kotak)
        return (x1, y1, x2 - x1, y2 - y1)
    return (0.04, 0.04, 0.92, 0.92)


def _iou_kotak(a: dict, b: dict) -> float:
    ax1, ay1 = a["x"], a["y"]
    ax2, ay2 = ax1 + a["lebar"], ay1 + a["tinggi"]
    bx1, by1 = b["x"], b["y"]
    bx2, by2 = bx1 + b["lebar"], by1 + b["tinggi"]
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
    inter = iw * ih
    if inter <= 0:
        return 0.0
    union = a["lebar"] * a["tinggi"] + b["lebar"] * b["tinggi"] - inter
    return inter / union if union > 0 else 0.0


def _analisis_satu_foto(jalur_berkas: Path, foto_id: int, area: str, ambang: float = 0.38) -> list[dict]:
    sesi, clf, kelas = _muat_model()
    with Image.open(jalur_berkas) as im:
        img_rgb = np.array(im.convert("RGB"))

    info = _buat_masker_permukaan(img_rgb, area)
    peta_kandidat, peta_mask = _kandidat_kontur_kerusakan(info, area)

    daftar_kandidat = []
    potongan = [img_rgb]
    batas_kandidat = {"retak_dinding": 3, "cat_mengelupas": 2, "noda_lembap": 2}
    for jenis_dasar, kotak_list in peta_kandidat.items():
        for kotak_terbaik, skor_visual in kotak_list[: batas_kandidat.get(jenis_dasar, 1)]:
            daftar_kandidat.append((jenis_dasar, kotak_terbaik, skor_visual))
            potongan.append(_potong_dengan_konteks(img_rgb, kotak_terbaik))

    tensor_in = _pra_proses_batch(potongan).astype(np.float32)
    nama_in = sesi.get_inputs()[0].name
    fitur = sesi.run(None, {nama_in: tensor_in})[0]
    probas = clf.predict(xgb.DMatrix(fitur))

    idx_kelas = {k: i for i, k in enumerate(kelas)}
    idx_plain = idx_kelas.get("plain", -1)
    prob_global = probas[0]
    idx_global_max = int(np.argmax(prob_global))
    kelas_global = kelas[idx_global_max]
    prob_global_max = float(prob_global[idx_global_max])

    rasio_permukaan = float((info["mask"] > 0).mean())
    adalah_closeup = info["y_lantai"] >= 0.98 and rasio_permukaan >= 0.85

    if adalah_closeup and len(daftar_kandidat) <= 1 and kelas_global != "plain" and prob_global_max >= 0.50:
        kotak_utama = _pilih_kotak_closeup(kelas_global, peta_kandidat)
        kunci_mask = _kunci_mask_dari_kelas(kelas_global)
        poligon_list, rasio_luas = _ekstrak_poligon(peta_mask[kunci_mask], kotak_utama, kunci_mask)
        temuan = _petakan_ke_homewise(kelas_global, prob_global_max, area, kotak_utama, poligon_list=poligon_list, rasio_luas=rasio_luas)
        if temuan:
            temuan["foto_id"] = foto_id
            return [temuan]

    keluarga_bd3 = {
        "cat_mengelupas": ("peeling", "spalling"),
        "noda_lembap": ("stain", "algae"),
        "retak_dinding": ("major_crack", "minor_crack"),
    }

    hasil_temuan = []
    for idx_k, (jenis_dasar, kotak, skor_visual) in enumerate(daftar_kandidat, start=1):
        pvec = probas[idx_k]
        prob_plain = float(pvec[idx_plain]) if idx_plain >= 0 else 0.0
        prob_non_plain = 1.0 - prob_plain
        skor_keluarga = {}
        for nama_kel, (c1, c2) in keluarga_bd3.items():
            v1 = float(pvec[idx_kelas[c1]]) if c1 in idx_kelas else 0.0
            v2 = float(pvec[idx_kelas[c2]]) if c2 in idx_kelas else 0.0
            skor_keluarga[nama_kel] = (v1 + v2, c1, v1, c2, v2)

        prob_keluarga, k1, p1, k2, p2 = skor_keluarga[jenis_dasar]
        kel_ai, _ = max(skor_keluarga.items(), key=lambda kv: kv[1][0])

        if jenis_dasar in ("noda_lembap", "cat_mengelupas"):
            if prob_keluarga >= ambang:
                kelas_terpilih = k1 if p1 >= p2 else k2
                prob_akhir = max(prob_keluarga, min(0.95, 0.55 * prob_keluarga + 0.45 * skor_visual))
                mask_dipakai = jenis_dasar
            elif skor_visual >= 0.45 and prob_non_plain >= 0.55:
                kelas_terpilih = k2 if p2 > p1 * 1.4 else k1
                prob_akhir = min(0.92, 0.45 + 0.35 * skor_visual + 0.20 * prob_non_plain)
                mask_dipakai = jenis_dasar
            else:
                continue
        else:
            prob_peel, pk1, pp1, pk2, pp2 = skor_keluarga["cat_mengelupas"]
            if prob_keluarga >= ambang and prob_keluarga >= prob_peel:
                kelas_terpilih = k1 if p1 >= p2 else k2
                prob_akhir = max(prob_keluarga, min(0.95, 0.55 * prob_keluarga + 0.45 * skor_visual))
                mask_dipakai = "retak_dinding"
            elif prob_peel >= 0.50 and (kotak[2] * kotak[3]) >= 0.012:
                kelas_terpilih = pk1 if pp1 >= pp2 else pk2
                prob_akhir = min(0.93, max(prob_peel, 0.55 * prob_peel + 0.35 * skor_visual))
                mask_dipakai = "cat_mengelupas"
            elif (
                skor_visual >= 0.45
                and prob_non_plain >= 0.55
                and prob_keluarga >= 0.20
                and kel_ai == "retak_dinding"
                and prob_plain < 0.65
            ):
                kelas_terpilih = k2 if p2 > p1 * 1.4 else k1
                prob_akhir = min(0.92, 0.45 + 0.35 * skor_visual + 0.20 * prob_non_plain)
                mask_dipakai = "retak_dinding"
            else:
                continue

        poligon_list, rasio_luas = _ekstrak_poligon(peta_mask[mask_dipakai], kotak, mask_dipakai)
        if poligon_list is None and mask_dipakai != jenis_dasar:
            poligon_list, rasio_luas = _ekstrak_poligon(peta_mask[jenis_dasar], kotak, jenis_dasar)
        temuan = _petakan_ke_homewise(kelas_terpilih, prob_akhir, area, kotak, poligon_list=poligon_list, rasio_luas=rasio_luas)
        if not temuan:
            continue
        temuan["foto_id"] = foto_id
        indeks_sama = next(
            (
                i
                for i, ada in enumerate(hasil_temuan)
                if (ada["jenis"] == temuan["jenis"] and _iou_kotak(ada["kotak"], temuan["kotak"]) >= 0.25)
                or _iou_kotak(ada["kotak"], temuan["kotak"]) >= 0.50
            ),
            None,
        )
        if indeks_sama is None:
            hasil_temuan.append(temuan)
        elif temuan["kepercayaan"] > hasil_temuan[indeks_sama]["kepercayaan"]:
            hasil_temuan[indeks_sama] = temuan

    if not hasil_temuan and kelas_global != "plain" and prob_global_max >= ambang:
        kotak_fallback = _pilih_kotak_closeup(kelas_global, peta_kandidat)
        kunci_mask = _kunci_mask_dari_kelas(kelas_global)
        poligon_list, rasio_luas = _ekstrak_poligon(peta_mask[kunci_mask], kotak_fallback, kunci_mask)
        temuan = _petakan_ke_homewise(kelas_global, prob_global_max, area, kotak_fallback, poligon_list=poligon_list, rasio_luas=rasio_luas)
        if temuan:
            temuan["foto_id"] = foto_id
            return [temuan]

    return sorted(hasil_temuan, key=lambda x: x["kepercayaan"], reverse=True)[:4]


def analisis_foto(daftar_foto: list[dict], dir_unggahan: Path) -> dict:
    """Menganalisis daftar foto bangunan HomeWise menggunakan MobileNetV2 + XGBoost."""
    semua_temuan = []
    for f in daftar_foto:
        jalur = Path(dir_unggahan) / f["nama_berkas"]
        if not jalur.exists():
            continue
        semua_temuan.extend(_analisis_satu_foto(jalur, f["id"], f.get("area") or "lainnya"))
    return {"temuan": semua_temuan}
