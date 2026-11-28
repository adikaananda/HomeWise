import { useEffect, useRef, useState } from "react";

/* Primitif gerak HomeWise: ringan (tanpa library), menghormati prefers-reduced-motion. */

export const KURANGI_GERAK =
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** true sekali saat elemen masuk viewport. */
export function useTerlihat(opsi = { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }) {
  const ref = useRef(null);
  const [terlihat, setTerlihat] = useState(KURANGI_GERAK);
  useEffect(() => {
    if (terlihat || !ref.current) return undefined;
    if (!("IntersectionObserver" in window)) {
      setTerlihat(true);
      return undefined;
    }
    const pengamat = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setTerlihat(true);
        pengamat.disconnect();
      }
    }, opsi);
    pengamat.observe(ref.current);
    return () => pengamat.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terlihat]);
  return [ref, terlihat];
}

/** Fade-up saat di-scroll. `jeda` dalam detik untuk efek bertahap. */
export function Muncul({ as: Tag = "div", jeda = 0, arah = "atas", className = "", style, children, ...sisa }) {
  const [ref, terlihat] = useTerlihat();
  return (
    <Tag
      ref={ref}
      className={`muncul muncul--${arah} ${terlihat ? "muncul--aktif" : ""} ${className}`}
      style={{ ...style, transitionDelay: terlihat ? `${jeda}s` : "0s" }}
      {...sisa}
    >
      {children}
    </Tag>
  );
}

/** Angka naik dari 0 ke target saat aktif. */
export function useHitung(target, aktif = true, durasi = 1100) {
  const [nilai, setNilai] = useState(KURANGI_GERAK ? target : 0);
  useEffect(() => {
    if (!aktif || target == null || Number.isNaN(Number(target))) return undefined;
    if (KURANGI_GERAK) {
      setNilai(target);
      return undefined;
    }
    let id;
    const mulai = performance.now();
    const langkah = (t) => {
      const p = Math.min(1, (t - mulai) / durasi);
      const halus = 1 - Math.pow(1 - p, 3);
      setNilai(target * halus);
      if (p < 1) id = requestAnimationFrame(langkah);
    };
    id = requestAnimationFrame(langkah);
    return () => cancelAnimationFrame(id);
  }, [target, aktif, durasi]);
  return nilai;
}

/** Angka beranimasi. `format` menerima angka dan mengembalikan teks. */
export function AngkaHidup({ nilai, format = (n) => Math.round(n).toLocaleString("id-ID"), className = "" }) {
  const [ref, terlihat] = useTerlihat();
  const tampil = useHitung(Number(nilai) || 0, terlihat);
  if (nilai == null) return <span className={className}>–</span>;
  return (
    <span ref={ref} className={`angka ${className}`}>
      {format(tampil)}
    </span>
  );
}

/** Kemiringan 3D halus mengikuti kursor (kartu, foto tim). */
export function useMiring(maks = 8) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || KURANGI_GERAK || window.matchMedia("(hover: none)").matches) return undefined;
    let raf;
    const gerak = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--miring-x", `${(-y * maks).toFixed(2)}deg`);
        el.style.setProperty("--miring-y", `${(x * maks).toFixed(2)}deg`);
        el.style.setProperty("--sorot-x", `${((x + 0.5) * 100).toFixed(1)}%`);
        el.style.setProperty("--sorot-y", `${((y + 0.5) * 100).toFixed(1)}%`);
      });
    };
    const keluar = () => {
      cancelAnimationFrame(raf);
      el.style.setProperty("--miring-x", "0deg");
      el.style.setProperty("--miring-y", "0deg");
    };
    el.addEventListener("pointermove", gerak);
    el.addEventListener("pointerleave", keluar);
    return () => {
      el.removeEventListener("pointermove", gerak);
      el.removeEventListener("pointerleave", keluar);
      cancelAnimationFrame(raf);
    };
  }, [maks]);
  return ref;
}
