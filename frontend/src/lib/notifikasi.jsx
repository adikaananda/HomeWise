import { createContext, useCallback, useContext, useState } from "react";
import { LuCircleAlert, LuCircleCheck, LuInfo } from "react-icons/lu";

const KonteksNotifikasi = createContext(() => {});

const IKON = { sukses: LuCircleCheck, galat: LuCircleAlert, info: LuInfo };

export function PenyediaNotifikasi({ children }) {
  const [daftar, setDaftar] = useState([]);

  const beriTahu = useCallback((pesan, jenis = "sukses") => {
    const id = Date.now() + Math.random();
    setDaftar((lama) => [...lama.slice(-2), { id, pesan, jenis }]);
    setTimeout(() => setDaftar((lama) => lama.filter((n) => n.id !== id)), 4200);
  }, []);

  return (
    <KonteksNotifikasi.Provider value={beriTahu}>
      {children}
      <div className="toast-wadah" role="status" aria-live="polite">
        {daftar.map(({ id, pesan, jenis }) => {
          const Ikon = IKON[jenis] || LuInfo;
          return (
            <div key={id} className={`toast toast--${jenis}`}>
              <Ikon aria-hidden="true" />
              <span>{pesan}</span>
            </div>
          );
        })}
      </div>
    </KonteksNotifikasi.Provider>
  );
}

export function useNotifikasi() {
  return useContext(KonteksNotifikasi);
}
