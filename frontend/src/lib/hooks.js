import { useCallback, useEffect, useRef, useState } from "react";

export function useData(pemuat, ketergantungan = []) {
  const [data, setData] = useState(null);
  const [galat, setGalat] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const fungsi = useRef(pemuat);
  fungsi.current = pemuat;

  const muatUlang = useCallback(async ({ diam = false } = {}) => {
    if (!diam) setMemuat(true);
    setGalat(null);
    try {
      setData(await fungsi.current());
    } catch (e) {
      setGalat(e);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    muatUlang();
  }, ketergantungan);

  return { data, setData, galat, memuat, muatUlang };
}

export function useAksi() {
  const [proses, setProses] = useState(false);

  const jalankan = useCallback(async (fungsi) => {
    setProses(true);
    try {
      return await fungsi();
    } finally {
      setProses(false);
    }
  }, []);

  return [proses, jalankan];
}

export function useJudul(judul) {
  useEffect(() => {
    document.title = judul ? `${judul} — HomeWise` : "HomeWise — Assess the Location. Understand the Property.";
  }, [judul]);
}
