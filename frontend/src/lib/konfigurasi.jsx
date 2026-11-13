import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const CADANGAN = {
  tujuan: [],
  indikator: {},
  kategori_fasilitas: {},
  jenis_kerusakan: {},
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
