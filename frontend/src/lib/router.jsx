import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const KonteksRouter = createContext(null);

function jalurSaatIni() {
  return window.location.pathname + window.location.search;
}

export function PenyediaRouter({ children }) {
  const [lokasi, setLokasi] = useState(jalurSaatIni);

  useEffect(() => {
    const saatKembali = () => setLokasi(jalurSaatIni());
    window.addEventListener("popstate", saatKembali);
    return () => window.removeEventListener("popstate", saatKembali);
  }, []);

  const navigasi = useCallback((tujuan, { ganti = false } = {}) => {
    if (tujuan === jalurSaatIni()) return;
    window.history[ganti ? "replaceState" : "pushState"]({}, "", tujuan);
    setLokasi(jalurSaatIni());
    window.scrollTo({ top: 0 });
  }, []);

  const nilai = useMemo(() => {
    const url = new URL(lokasi, window.location.origin);
    return { jalur: url.pathname, query: url.searchParams, navigasi };
  }, [lokasi, navigasi]);

  return <KonteksRouter.Provider value={nilai}>{children}</KonteksRouter.Provider>;
}

export function useRouter() {
  return useContext(KonteksRouter);
}

export function cocokkan(pola, jalur) {
  const bagianPola = pola.split("/").filter(Boolean);
  const bagianJalur = jalur.split("/").filter(Boolean);
  if (bagianPola.length !== bagianJalur.length) return null;
  const parameter = {};
  for (let i = 0; i < bagianPola.length; i++) {
    if (bagianPola[i].startsWith(":")) {
      parameter[bagianPola[i].slice(1)] = decodeURIComponent(bagianJalur[i]);
    } else if (bagianPola[i] !== bagianJalur[i]) {
      return null;
    }
  }
  return parameter;
}

export function Tautan({ ke, children, onClick, ...sisa }) {
  const { navigasi } = useRouter();

  const saatKlik = (e) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || sisa.target) return;
    e.preventDefault();
    navigasi(ke);
  };

  return (
    <a href={ke} onClick={saatKlik} {...sisa}>
      {children}
    </a>
  );
}

export function Alihkan({ ke }) {
  const { navigasi } = useRouter();
  useEffect(() => navigasi(ke, { ganti: true }), [ke, navigasi]);
  return null;
}
