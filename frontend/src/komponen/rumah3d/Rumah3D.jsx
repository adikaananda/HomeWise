import { useEffect, useRef, useState } from "react";
import { LuBuilding2, LuHouse, LuLandPlot, LuMapPin, LuRotate3D, LuSquareStack } from "react-icons/lu";
import { KURANGI_GERAK, useTerlihat } from "../../lib/gerak";
import { Maskot } from "../Maskot";

export const TITIK_INFO = [
  { kode: "lokasi", ikon: LuMapPin, judul: "Lokasi & risiko", teks: "Risiko banjir, longsor, gempa, serta jarak ke sekolah, rumah sakit, dan jalan utama." },
  { kode: "atap", ikon: LuHouse, judul: "Atap & talang", teks: "Indikasi bocor dari noda plafon dan foto atap, lengkap dengan prioritas perbaikan." },
  { kode: "dinding", ikon: LuBuilding2, judul: "Dinding & struktur", teks: "Retak, rembesan, dan cat mengelupas dideteksi AI dari foto survei Anda." },
  { kode: "lantai", ikon: LuSquareStack, judul: "Lantai & teras", teks: "Keramik retak atau kopong diubah menjadi volume pekerjaan dan biaya renovasi." },
  { kode: "tanah", ikon: LuLandPlot, judul: "Tanah & lingkungan", teks: "Posisi tanah, lebar jalan depan, dan faktor yang menaikkan atau menurunkan nilai." },
];

function dukungWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

export function Rumah3D({ aktif, onPilih }) {
  const [refWadah, terlihat] = useTerlihat({ rootMargin: "200px 0px", threshold: 0 });
  const kanvas = useRef(null);
  const adegan = useRef(null);
  const [titik, setTitik] = useState({});
  const [status, setStatus] = useState("menunggu");

  // Muat three.js hanya saat section mendekati layar.
  useEffect(() => {
    if (!terlihat || adegan.current) return undefined;
    if (!dukungWebGL()) {
      setStatus("tidak-didukung");
      return undefined;
    }
    let batal = false;
    setStatus("memuat");
    import("./adegan.js")
      .then(({ buatAdegan }) => {
        if (batal || !kanvas.current) return;
        let terakhir = 0;
        adegan.current = buatAdegan(kanvas.current, {
          kurangiGerak: KURANGI_GERAK,
          onTitik: (t) => {
            const kini = performance.now();
            if (kini - terakhir > 40) {
              terakhir = kini;
              setTitik(t);
            }
          },
        });
        setStatus("siap");
      })
      .catch(() => setStatus("tidak-didukung"));
    return () => {
      batal = true;
    };
  }, [terlihat]);

  // Hentikan render saat tidak terlihat untuk hemat baterai.
  useEffect(() => {
    const el = refWadah.current;
    if (!el) return undefined;
    const pengamat = new IntersectionObserver(([e]) => adegan.current?.aktif(e.isIntersecting));
    pengamat.observe(el);
    return () => pengamat.disconnect();
  }, [refWadah, status]);

  useEffect(() => () => adegan.current?.hancurkan(), []);

  useEffect(() => {
    if (aktif) adegan.current?.fokus(aktif);
    else adegan.current?.lanjutkan();
  }, [aktif, status]);

  return (
    <div ref={refWadah} className={`rumah3d rumah3d--${status}`}>
      <div className="rumah3d__latar" aria-hidden="true" />
      <canvas ref={kanvas} className="rumah3d__kanvas" aria-label="Model rumah 3D interaktif. Seret untuk memutar." />
      {status === "siap" &&
        TITIK_INFO.map((t) => {
          const p = titik[t.kode];
          if (!p) return null;
          return (
            <button
              key={t.kode}
              type="button"
              className={`rumah3d__titik ${aktif === t.kode ? "rumah3d__titik--aktif" : ""}`}
              style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
              onClick={() => onPilih(aktif === t.kode ? null : t.kode)}
              aria-label={t.judul}
              aria-pressed={aktif === t.kode}
            >
              <t.ikon aria-hidden="true" />
            </button>
          );
        })}
      {status !== "siap" && (
        <div className="rumah3d__cadangan">
          <Maskot pose={status === "tidak-didukung" ? "menyapa" : "memuat"} ukuran={140} gerak={status === "memuat" ? "lompat" : "melayang"} />
          {status === "memuat" && <span className="teks-kecil teks-redup">Menyiapkan model 3D…</span>}
        </div>
      )}
      {status === "siap" && (
        <span className="rumah3d__petunjuk">
          <LuRotate3D aria-hidden="true" /> Seret untuk memutar
        </span>
      )}
    </div>
  );
}
