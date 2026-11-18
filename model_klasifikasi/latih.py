import json
import os
import zipfile
from pathlib import Path

import cv2
import numpy as np
import requests
import torch
import torch.nn as nn
from PIL import Image
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_recall_fscore_support,
)
from sklearn.model_selection import train_test_split
from torchvision.models import MobileNet_V2_Weights, mobilenet_v2
from tqdm import tqdm
from xgboost import XGBClassifier

URL_DATASET_BD3 = (
    "https://www.kaggle.com/api/v1/datasets/download/"
    "praveenkottari/bd3-dataset-for-building-defect-detection"
)

DIR_DASAR = Path(__file__).resolve().parent
DIR_DATASET = DIR_DASAR / "dataset"
DIR_ARTEFAK = DIR_DASAR / "artefak"

MEAN_IMAGENET = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape(1, 3, 1, 1)
STD_IMAGENET = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape(1, 3, 1, 1)


class EkstraktorMobileNetV2(nn.Module):
    """Ekstraktor fitur visual 1.280 dimensi berbasis MobileNetV2 tanpa head klasifikasi."""

    def __init__(self):
        super().__init__()
        dasar = mobilenet_v2(weights=MobileNet_V2_Weights.DEFAULT)
        self.fitur = dasar.features
        self.pool = nn.AdaptiveAvgPool2d((1, 1))

    def forward(self, x):
        x = self.fitur(x)
        x = self.pool(x)
        return torch.flatten(x, 1)


def unduh_dan_ekstrak_bd3(dir_tujuan: Path = DIR_DATASET) -> Path:
    """Mengunduh dan mengekstrak dataset BD3 dari Kaggle apabila belum tersedia lokal."""
    dir_tujuan.mkdir(parents=True, exist_ok=True)
    dir_train = dir_tujuan / "BD3_original_dataset" / "train"
    if dir_train.exists() and any(dir_train.iterdir()):
        print(f"[Dataset] Sudah tersedia di {dir_train}")
        return dir_train

    arsip_zip = dir_tujuan / "bd3_dataset.zip"
    if not arsip_zip.exists():
        print(f"[Dataset] Mengunduh BD3 dari {URL_DATASET_BD3} ...")
        with requests.get(URL_DATASET_BD3, stream=True, timeout=120) as respon:
            respon.raise_for_status()
            total = int(respon.headers.get("Content-Length", 0))
            with open(arsip_zip, "wb") as f, tqdm(
                total=total, unit="B", unit_scale=True, desc="Unduh BD3"
            ) as bar:
                for chunk in respon.iter_content(chunk_size=1024 * 256):
                    if chunk:
                        f.write(chunk)
                        bar.update(len(chunk))

    print(f"[Dataset] Mengekstrak {arsip_zip.name} ...")
    with zipfile.ZipFile(arsip_zip, "r") as zf:
        zf.extractall(dir_tujuan)

    if arsip_zip.exists():
        arsip_zip.unlink()

    if not dir_train.exists():
        kandidat = list(dir_tujuan.rglob("train"))
        if not kandidat:
            raise FileNotFoundError("Folder 'train' tidak ditemukan setelah ekstraksi BD3.")
        dir_train = kandidat[0]
    return dir_train


def terapkan_clahe_rgb(img_rgb: np.ndarray, ukuran: int = 224) -> np.ndarray:
    """Resize ke 224x224 dan terapkan CLAHE pada kanal luminansi L (LAB) agar retak & noda tajam."""
    resized = cv2.resize(img_rgb, (ukuran, ukuran), interpolation=cv2.INTER_AREA)
    lab = cv2.cvtColor(resized, cv2.COLOR_RGB2LAB)
    l_chan, a_chan, b_chan = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_tajam = clahe.apply(l_chan)
    gabung = cv2.merge((l_tajam, a_chan, b_chan))
    return cv2.cvtColor(gabung, cv2.COLOR_LAB2RGB)


def pra_proses_batch(daftar_rgb: list[np.ndarray]) -> np.ndarray:
    """Konversi daftar gambar RGB menjadi tensor NCHW float32 ternormalisasi ImageNet."""
    hasil = []
    for img in daftar_rgb:
        tajam = terapkan_clahe_rgb(img, 224)
        arr = tajam.astype(np.float32) / 255.0
        hasil.append(np.transpose(arr, (2, 0, 1)))
    batch = np.stack(hasil, axis=0)
    return (batch - MEAN_IMAGENET) / STD_IMAGENET


def muat_daftar_gambar(dir_train: Path):
    """Membaca jalur berkas gambar dan label kelas dari folder train BD3."""
    kelas = sorted([d.name for d in dir_train.iterdir() if d.is_dir()])
    jalur_gambar, label = [], []
    ekstensi = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    for idx, nama_kelas in enumerate(kelas):
        for berkas in sorted((dir_train / nama_kelas).iterdir()):
            if berkas.suffix.lower() in ekstensi:
                jalur_gambar.append(berkas)
                label.append(idx)
    return jalur_gambar, np.array(label, dtype=np.int64), kelas


def ekstrak_fitur_cnn(jalur_gambar: list[Path], model: EkstraktorMobileNetV2, batch_size: int = 32) -> np.ndarray:
    """Mengekstrak vektor fitur 1.280 dimensi untuk seluruh gambar secara batch."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device).eval()
    semua_fitur = []

    with torch.no_grad():
        for i in tqdm(range(0, len(jalur_gambar), batch_size), desc="Ekstraksi MobileNetV2"):
            potongan = jalur_gambar[i : i + batch_size]
            batch_rgb = []
            for p in potongan:
                with Image.open(p) as im:
                    batch_rgb.append(np.array(im.convert("RGB")))
            tensor = torch.from_numpy(pra_proses_batch(batch_rgb)).to(device)
            fitur = model(tensor).cpu().numpy()
            semua_fitur.append(fitur)

    return np.vstack(semua_fitur).astype(np.float32)


def ekspor_onnx(model: EkstraktorMobileNetV2, jalur_onnx: Path):
    """Mengekspor ekstraktor MobileNetV2 ke format ONNX agar ringan saat inferensi produksi."""
    model_cpu = model.to("cpu").eval()
    dummy = torch.randn(1, 3, 224, 224, dtype=torch.float32)
    torch.onnx.export(
        model_cpu,
        dummy,
        str(jalur_onnx),
        input_names=["input"],
        output_names=["fitur"],
        dynamic_axes={"input": {0: "batch"}, "fitur": {0: "batch"}},
        opset_version=17,
        dynamo=False,
    )


def hitung_spesifisitas_rata(cm: np.ndarray) -> float:
    """Menghitung rata-rata spesifisitas makro dari confusion matrix multiclass."""
    total = cm.sum()
    spesifisitas = []
    for i in range(len(cm)):
        tp = cm[i, i]
        fp = cm[:, i].sum() - tp
        fn = cm[i, :].sum() - tp
        tn = total - tp - fp - fn
        denom = tn + fp
        spesifisitas.append(tn / denom if denom > 0 else 0.0)
    return float(np.mean(spesifisitas))


def jalankan_pelatihan(dir_dataset: Path = DIR_DATASET, dir_artefak: Path = DIR_ARTEFAK) -> dict:
    """Pipeline lengkap: unduh BD3, CLAHE + MobileNetV2, latih XGBoost (80:20), simpan artefak."""
    dir_artefak.mkdir(parents=True, exist_ok=True)
    dir_train = unduh_dan_ekstrak_bd3(dir_dataset)

    jalur_gambar, y, kelas = muat_daftar_gambar(dir_train)
    print(f"[Data] Total gambar: {len(jalur_gambar)}, kelas ({len(kelas)}): {kelas}")

    ekstraktor = EkstraktorMobileNetV2()
    jalur_onnx = dir_artefak / "mobilenetv2_fitur.onnx"
    ekspor_onnx(ekstraktor, jalur_onnx)
    print(f"[ONNX] Ekstraktor disimpan ke {jalur_onnx}")

    X_fitur = ekstrak_fitur_cnn(jalur_gambar, ekstraktor)

    X_train, X_test, y_train, y_test = train_test_split(
        X_fitur, y, test_size=0.20, stratify=y, random_state=42
    )

    print(f"[XGBoost] Melatih pada {len(X_train)} data latih, menguji pada {len(X_test)} data uji...")
    clf = XGBClassifier(
        n_estimators=250,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        eval_metric="mlogloss",
        random_state=42,
        n_jobs=max(1, (os.cpu_count() or 2)),
    )
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    akurasi = float(accuracy_score(y_test, y_pred))
    prec, rec, f1, _ = precision_recall_fscore_support(y_test, y_pred, average="macro", zero_division=0)
    cm = confusion_matrix(y_test, y_pred)
    spesifisitas = hitung_spesifisitas_rata(cm)

    laporan_kelas = classification_report(y_test, y_pred, target_names=kelas, output_dict=True, zero_division=0)
    print(f"\n[Evaluasi 80:20] Akurasi: {akurasi * 100:.2f}% | Sensitivitas/Recall: {rec * 100:.2f}% | Spesifisitas: {spesifisitas * 100:.2f}% | Macro F1: {f1 * 100:.2f}%")
    print(classification_report(y_test, y_pred, target_names=kelas, zero_division=0))

    jalur_xgb = dir_artefak / "model_xgboost.json"
    clf.save_model(str(jalur_xgb))

    metadata = {
        "dataset": "BD3 Building Defects Detection Dataset (3.965 gambar asli)",
        "sumber_url": URL_DATASET_BD3,
        "ekstraktor": "MobileNetV2 (ImageNet weights, 1280 fitur) + CLAHE LAB",
        "classifier": "XGBoost (XGBClassifier)",
        "split": "80:20 stratified",
        "jumlah_latih": int(len(X_train)),
        "jumlah_uji": int(len(X_test)),
        "kelas": kelas,
        "metrik": {
            "akurasi": round(akurasi, 4),
            "precision_makro": round(float(prec), 4),
            "recall_sensitivitas_makro": round(float(rec), 4),
            "spesifisitas_makro": round(spesifisitas, 4),
            "f1_makro": round(float(f1), 4),
        },
        "laporan_per_kelas": laporan_kelas,
        "confusion_matrix": cm.tolist(),
    }
    jalur_meta = dir_artefak / "metadata_model.json"
    jalur_meta.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"[Selesai] Model XGBoost & metadata disimpan di {dir_artefak}")
    return metadata


if __name__ == "__main__":
    jalankan_pelatihan()
