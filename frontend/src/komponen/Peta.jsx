import { useEffect, useRef, useState } from "react";

const URL_LEAFLET = "https://unpkg.com/leaflet@1.9.4/dist";
const UBIN = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATRIBUSI = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const WARNA_INDIKATOR = {
  kesehatan: "#e5484d",
  pendidikan: "#7a5af8",
  ekonomi: "#d99a00",
  transportasi: "#008c73",
};

const WARNA_RISIKO = { rendah: "#51da9e", sedang: "#f5b400", tinggi: "#e5484d" };

const DAFTAR_KOSONG = [];
const OBJEK_KOSONG = {};

let janjiLeaflet = null;

export function muatLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (janjiLeaflet) return janjiLeaflet;
  janjiLeaflet = new Promise((selesai, gagal) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = `${URL_LEAFLET}/leaflet.css`;
    document.head.appendChild(css);
    const skrip = document.createElement("script");
    skrip.src = `${URL_LEAFLET}/leaflet.js`;
    skrip.onload = () => selesai(window.L);
    skrip.onerror = () => {
      janjiLeaflet = null;
      gagal(new Error("Leaflet gagal dimuat"));
    };
    document.head.appendChild(skrip);
  });
  return janjiLeaflet;
}

function ikonPenanda(L, warna, teks = "", utama = false) {
  return L.divIcon({
    className: "",
    html: `<div class="penanda-peta ${utama ? "penanda-peta--utama" : ""}" style="background:${warna}"><span>${teks}</span></div>`,
    iconSize: utama ? [40, 40] : [28, 28],
    iconAnchor: utama ? [20, 40] : [14, 28],
  });
}

export function Peta({ pusat, fasilitas = DAFTAR_KOSONG, kategoriFasilitas = OBJEK_KOSONG, risikoBanjir, tinggi = 380, onPilih, zoom = 14 }) {
  const wadah = useRef(null);
  const peta = useRef(null);
  const lapisan = useRef(null);
  const [status, setStatus] = useState("memuat");
  const onPilihRef = useRef(onPilih);
  onPilihRef.current = onPilih;

  useEffect(() => {
    let batal = false;
    muatLeaflet()
      .then((L) => {
        if (batal || !wadah.current || peta.current) return;
        peta.current = L.map(wadah.current, { scrollWheelZoom: false, zoomControl: true }).setView(
          pusat ? [pusat.lat, pusat.lng] : [-6.2, 106.82],
          pusat ? zoom : 11,
        );
        L.tileLayer(UBIN, { attribution: ATRIBUSI, maxZoom: 19 }).addTo(peta.current);
        lapisan.current = L.layerGroup().addTo(peta.current);
        peta.current.on("click", (e) => onPilihRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
        setStatus("siap");
      })
      .catch(() => !batal && setStatus("gagal"));
    return () => {
      batal = true;
      peta.current?.remove();
      peta.current = null;
    };
  }, []);

  useEffect(() => {
    const L = window.L;
    if (status !== "siap" || !L || !lapisan.current) return;
    lapisan.current.clearLayers();
    if (!pusat) return;

    if (risikoBanjir) {
      L.circle([pusat.lat, pusat.lng], {
        radius: 650,
        color: WARNA_RISIKO[risikoBanjir],
        weight: 1.5,
        fillColor: WARNA_RISIKO[risikoBanjir],
        fillOpacity: 0.16,
      }).addTo(lapisan.current);
    }

    const batas = [[pusat.lat, pusat.lng]];
    fasilitas.forEach((f) => {
      const info = kategoriFasilitas[f.kategori];
      const warna = WARNA_INDIKATOR[info?.indikator] || "#5b6788";
      L.marker([f.lat, f.lng], { icon: ikonPenanda(L, warna, "") })
        .bindPopup(`<strong>${f.nama}</strong><br/>${info?.label || f.kategori} · ${f.jarak_m} m`)
        .addTo(lapisan.current);
      batas.push([f.lat, f.lng]);
    });

    L.marker([pusat.lat, pusat.lng], { icon: ikonPenanda(L, "#0a43ef", "HW", true), zIndexOffset: 1000 }).addTo(lapisan.current);

    if (fasilitas.length) {
      peta.current.fitBounds(batas, { padding: [36, 36], maxZoom: 15 });
    } else {
      peta.current.setView([pusat.lat, pusat.lng], Math.max(peta.current.getZoom(), zoom));
    }
  }, [status, pusat?.lat, pusat?.lng, fasilitas, kategoriFasilitas, risikoBanjir, zoom]);

  return (
    <div className="peta" style={{ height: tinggi }}>
      <div ref={wadah} style={{ position: "absolute", inset: 0 }} aria-label="Peta lokasi properti" />
      {status !== "siap" && (
        <div className="peta__cadangan">
          {status === "memuat" ? "Memuat peta…" : "Peta tidak dapat dimuat. Periksa koneksi internet Anda."}
        </div>
      )}
    </div>
  );
}
