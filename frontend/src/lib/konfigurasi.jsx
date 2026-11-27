import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const CADANGAN = {
  tujuan: [],
  indikator: {},
  kategori_fasilitas: {},
  jenis_kerusakan: {},
  area_foto: [],
  jarak_foto: [],
  sumber_foto: {},
  pertanyaan_survei: [],
  prioritas: {},
  paket: [],
  midtrans: { mode: "simulasi", client_key: "", produksi: false },
};

const KonteksKonfigurasi = createContext(CADANGAN);

export function PenyediaKonfigurasi({ children }) {
  const [konfigurasi, setKonfigurasi] = useState(CADANGAN);

  useEffect(() => {
    api.get("/konfigurasi").then(setKonfigurasi).catch(() => setKonfigurasi(CADANGAN));
  }, []);

  return <KonteksKonfigurasi.Provider value={konfigurasi}>{children}</KonteksKonfigurasi.Provider>;
}

export function useKonfigurasi() {
  return useContext(KonteksKonfigurasi);
}

export function labelTujuan(konfigurasi, kode) {
  return konfigurasi.tujuan.find((t) => t.kode === kode)?.label || kode?.replace(/_/g, " ");
}

export function labelArea(konfigurasi, kode) {
  return konfigurasi.area_foto.find((a) => a.kode === kode)?.label || "Area lain";
}
