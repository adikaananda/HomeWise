import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, token } from "./api";

const KonteksAuth = createContext(null);

export const BERANDA_PERAN = {
  pencari: "/app",
  analis: "/analis",
  admin: "/admin",
};

export function PenyediaAuth({ children }) {
  const [pengguna, setPengguna] = useState(null);
  const [memuat, setMemuat] = useState(Boolean(token.ambil()));

  const muatUlang = useCallback(async () => {
    if (!token.ambil()) {
      setPengguna(null);
      setMemuat(false);
      return;
    }
    try {
      setPengguna(await api.get("/auth/saya"));
    } catch {
      token.hapus();
      setPengguna(null);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    muatUlang();
    const saatKeluar = () => setPengguna(null);
    window.addEventListener("homewise:keluar", saatKeluar);
    return () => window.removeEventListener("homewise:keluar", saatKeluar);
  }, [muatUlang]);

  const masuk = async (email, sandi) => {
    const hasil = await api.post("/auth/masuk", { email, sandi });
    token.simpan(hasil.token);
    setPengguna(hasil.pengguna);
    return hasil.pengguna;
  };

  const daftar = async (data) => {
    const hasil = await api.post("/auth/daftar", data);
    token.simpan(hasil.token);
    setPengguna(hasil.pengguna);
    return hasil.pengguna;
  };

  const keluar = () => {
    token.hapus();
    setPengguna(null);
  };

  return (
    <KonteksAuth.Provider value={{ pengguna, memuat, masuk, daftar, keluar, muatUlang }}>
      {children}
    </KonteksAuth.Provider>
  );
}

export function useAuth() {
  return useContext(KonteksAuth);
}
