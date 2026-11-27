import { useEffect, useMemo, useRef, useState } from "react";
import { LuArrowRight, LuDatabase, LuInfo, LuMinus, LuTrendingDown, LuTrendingUp } from "react-icons/lu";
import { muatLeaflet } from "../../komponen/Peta";
import { NavbarPublik } from "../../komponen/tata-letak/Publik";
import { Tombol } from "../../komponen/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { rupiahRingkas } from "../../lib/format";
import { useJudul } from "../../lib/hooks";

const UBIN = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATRIBUSI = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const KATEGORI = {
  premium: { label: "Premium", warna: "#0832c8" },
  menengah: { label: "Menengah", warna: "#14bace" },
  terjangkau: { label: "Terjangkau", warna: "#22b07d" },
};

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function periodeTeks(periode) {
  const [tahun, bulan] = periode.split("-");
  return `${BULAN[Number(bulan) - 1]} ${tahun}`;
}

function perM2(nilai) {
  return `${rupiahRingkas(nilai)}/m²`;
}

function rentang(w) {
  const juta = (n) => (n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 });
  return `Rp${juta(w.harga_min)}–${juta(w.harga_maks)} jt/m²`;
}

function ChipTren({ nilai }) {
  if (nilai == null) return null;
  const naik = nilai > 0;
  const Ikon = nilai === 0 ? LuMinus : naik ? LuTrendingUp : LuTrendingDown;
  return (
    <span className={`peta-harga__tren ${naik ? "peta-harga__tren--naik" : "peta-harga__tren--turun"}`}>
      <Ikon aria-hidden="true" />
      {`${naik ? "+" : ""}${nilai.toLocaleString("id-ID")}% setahun`}
    </span>
  );
}

function isiPopup(w) {
  const kat = KATEGORI[w.kategori];
  const tren = w.perubahan_yoy == null ? "Belum ada (perlu data 12 bulan sebelumnya)" : `${w.perubahan_yoy > 0 ? "+" : ""}${w.perubahan_yoy}% setahun`;
  return `
    <div class="popup-harga">
      <strong>${w.nama}</strong>
      <span class="popup-harga__sub">${w.kecamatan ?? ""} · ${w.kabupaten}</span>
      <span class="popup-harga__harga" style="color:${kat.warna}">${perM2(w.harga_median)}</span>
      <span>Rentang ${rentang(w)}</span>
      <span>≈ ${rupiahRingkas(w.harga_per_are)} per are</span>
      <span>Tren: ${tren}</span>
      <span class="popup-harga__sumber">${w.label_jenis_data} · ${w.jumlah_sampel} sampel · ${periodeTeks(w.periode)}</span>
      ${w.url_sumber ? `<a href="${w.url_sumber}" target="_blank" rel="noreferrer">Lihat listing sumber</a>` : ""}
    </div>`;
}

export default function PetaHarga() {
  useJudul("Peta Harga Tanah");
  const { pengguna } = useAuth();
  const [data, setData] = useState(null);
  const [galat, setGalat] = useState(null);
  const [kategori, setKategori] = useState("semua");
  const [kabupaten, setKabupaten] = useState("semua");
  const [terpilih, setTerpilih] = useState(null);
  const [statusPeta, setStatusPeta] = useState("memuat");

  const wadahPeta = useRef(null);
  const peta = useRef(null);
  const lapisan = useRef(null);
  const lingkaran = useRef({});

  useEffect(() => {
    api.get("/peta-harga").then(setData).catch((e) => setGalat(e.message));
  }, []);

  useEffect(() => {
    let batal = false;
    muatLeaflet()
      .then((L) => {
        if (batal || !wadahPeta.current || peta.current) return;
        peta.current = L.map(wadahPeta.current, { zoomControl: false }).setView([-8.69, 115.2], 12);
        L.control.zoom({ position: "bottomright" }).addTo(peta.current);
        L.tileLayer(UBIN, { attribution: ATRIBUSI, maxZoom: 19 }).addTo(peta.current);
        lapisan.current = L.layerGroup().addTo(peta.current);
        const aturLabel = () =>
          wadahPeta.current?.parentElement?.classList.toggle("peta-harga__peta--jauh", peta.current.getZoom() < 13);
        peta.current.on("zoomend", aturLabel);
        aturLabel();
        setStatusPeta("siap");
      })
      .catch(() => !batal && setStatusPeta("gagal"));
    return () => {
      batal = true;
      peta.current?.remove();
      peta.current = null;
    };
  }, []);

  const wilayahKab = useMemo(
    () => (data?.wilayah ?? []).filter((w) => kabupaten === "semua" || w.kabupaten === kabupaten),
    [data, kabupaten],
  );
  const tampil = useMemo(
    () =>
      wilayahKab
        .filter((w) => kategori === "semua" || w.kategori === kategori)
        .sort((a, b) => b.harga_median - a.harga_median),
    [wilayahKab, kategori],
  );
  const hitung = useMemo(() => {
    const h = { semua: wilayahKab.length, premium: 0, menengah: 0, terjangkau: 0 };
    wilayahKab.forEach((w) => (h[w.kategori] += 1));
    return h;
  }, [wilayahKab]);

  useEffect(() => {
    const L = window.L;
    if (statusPeta !== "siap" || !L || !lapisan.current) return;
    lapisan.current.clearLayers();
    lingkaran.current = {};
    if (!tampil.length) return;
    tampil.forEach((w) => {
      const kat = KATEGORI[w.kategori];
      const bulatan = L.circle([w.lat, w.lng], {
        radius: w.radius_m,
        color: kat.warna,
        weight: 2,
        fillColor: kat.warna,
        fillOpacity: 0.22,
      })
        .bindTooltip(`${w.nama} · ${rupiahRingkas(w.harga_median)}`, { permanent: true, direction: "center", className: "label-harga" })
        .bindPopup(isiPopup(w), { maxWidth: 260 })
        .on("click", () => setTerpilih(w.kode))
        .addTo(lapisan.current);
      lingkaran.current[w.kode] = bulatan;
    });
    const batas = L.featureGroup(Object.values(lingkaran.current)).getBounds();
    peta.current.fitBounds(batas, { padding: [40, 40], maxZoom: 14 });
  }, [statusPeta, tampil]);

  useEffect(() => {
    const bulatan = terpilih && lingkaran.current[terpilih];
    if (!bulatan || !peta.current) return;
    peta.current.flyToBounds(bulatan.getBounds(), { padding: [80, 80], maxZoom: 15, duration: 0.6 });
    bulatan.openPopup();
  }, [terpilih]);

  const daftarKab = Object.keys(data?.ringkasan ?? {});
  const medianSemua = useMemo(() => {
    const nilai = wilayahKab.map((w) => w.harga_median).sort((a, b) => a - b);
    if (!nilai.length) return 0;
    const t = Math.floor(nilai.length / 2);
    return nilai.length % 2 ? nilai[t] : (nilai[t - 1] + nilai[t]) / 2;
  }, [wilayahKab]);
  const indeksKota = data?.indeks_kota ?? [];

  return (
    <>
      <NavbarPublik />
      <main id="konten" className="peta-harga">
        <section className="peta-harga__panel" aria-label="Daftar harga tanah per kawasan">
          <div className="peta-harga__kepala">
            <h1>Peta Harga Tanah</h1>
            <p>Harga tanah per m² per kawasan di Denpasar & Badung. Gratis, tanpa login.</p>
          </div>

          <div className="peta-harga__filter" role="group" aria-label="Filter kategori harga">
            {["semua", "premium", "menengah", "terjangkau"].map((k) => (
              <button
                key={k}
                type="button"
                className={`chip-harga ${kategori === k ? "chip-harga--aktif" : ""}`}
                aria-pressed={kategori === k}
                onClick={() => setKategori(k)}
              >
                {k !== "semua" && <i style={{ background: KATEGORI[k].warna }} aria-hidden="true" />}
                {k === "semua" ? "Semua" : KATEGORI[k].label}
                <span>{hitung[k]}</span>
              </button>
            ))}
          </div>

          <div className="peta-harga__wilayah" role="group" aria-label="Filter wilayah">
            <span>WILAYAH</span>
            {["semua", ...daftarKab].map((k) => (
              <button
                key={k}
                type="button"
                className={`chip-wilayah ${kabupaten === k ? "chip-wilayah--aktif" : ""}`}
                aria-pressed={kabupaten === k}
                onClick={() => {
                  setKabupaten(k);
                  setTerpilih(null);
                }}
              >
                {k === "semua" ? "Semua" : k}
              </button>
            ))}
          </div>

          <div className="peta-harga__daftar">
            {galat && <p className="peta-harga__pesan">{galat}</p>}
            {!data && !galat && <p className="peta-harga__pesan">Memuat data harga…</p>}
            {data && !tampil.length && <p className="peta-harga__pesan">Tidak ada kawasan di kategori ini.</p>}
            {tampil.map((w) => {
              const kat = KATEGORI[w.kategori];
              return (
                <button
                  key={w.kode}
                  type="button"
                  className={`kartu-harga ${terpilih === w.kode ? "kartu-harga--aktif" : ""}`}
                  style={{ "--warna-kategori": kat.warna }}
                  onClick={() => setTerpilih(w.kode)}
                >
                  <div className="kartu-harga__atas">
                    <div>
                      <strong>{w.nama}</strong>
                      <span>{`${w.kecamatan ?? ""} · ${w.kabupaten}`}</span>
                    </div>
                    <span className="kartu-harga__lencana">{kat.label}</span>
                  </div>
                  <div className="kartu-harga__harga">
                    <b>{perM2(w.harga_median)}</b>
                    <span>{rentang(w)}</span>
                  </div>
                  <div className="kartu-harga__meta">
                    <ChipTren nilai={w.perubahan_yoy} />
                    <span>{`${w.label_jenis_data} · ${w.jumlah_sampel} sampel · ${periodeTeks(w.periode)} · keyakinan ${w.keyakinan}`}</span>
                  </div>
                </button>
              );
            })}
            {data && (
              <details className="peta-harga__metode" open>
                <summary>
                  <LuInfo aria-hidden="true" />
                  Sumber data & cara menghitung
                </summary>
                <ul>
                  {(data.metodologi ?? []).map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                  <li>Tren per kawasan muncul otomatis setelah data periode berikutnya tercatat.</li>
                </ul>
                <p>Klik kawasan di peta untuk membuka halaman listing sumbernya.</p>
              </details>
            )}
          </div>

          <div className="peta-harga__kaki">
            <div className="peta-harga__ringkas">
              <span className="peta-harga__cincin">{(medianSemua / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })}</span>
              <div>
                <small>{`MEDIAN ${kabupaten === "semua" ? "SEMUA KAWASAN" : kabupaten.toUpperCase()}`}</small>
                <b>juta rupiah per m²</b>
              </div>
            </div>
            <Tombol ke={pengguna ? "/app/properti/baru" : "/daftar"} ikonKanan={LuArrowRight}>
              Cek properti
            </Tombol>
          </div>
        </section>

        <section className="peta-harga__peta" aria-label="Peta harga tanah">
          <div ref={wadahPeta} className="peta-harga__kanvas" />
          {statusPeta !== "siap" && (
            <div className="peta__cadangan">{statusPeta === "memuat" ? "Memuat peta…" : "Peta tidak dapat dimuat. Periksa koneksi internet Anda."}</div>
          )}
          {indeksKota.length > 0 && (
            <div className="peta-harga__indeks">
              {indeksKota.map((i) => (
                <a key={`${i.kota}-${i.periode}`} href={i.url_sumber || undefined} target="_blank" rel="noreferrer">
                  <LuTrendingUp aria-hidden="true" />
                  <span>
                    <b>{`${i.jenis} ${i.kota} ${i.perubahan_yoy > 0 ? "+" : ""}${i.perubahan_yoy.toLocaleString("id-ID")}% setahun`}</b>
                    <small>{`${periodeTeks(i.periode)} · ${i.sumber}`}</small>
                  </span>
                </a>
              ))}
            </div>
          )}
          <div className="peta-harga__legenda" aria-label="Legenda">
            {Object.entries(KATEGORI).map(([k, v]) => (
              <span key={k}>
                <i style={{ background: v.warna }} />
                {`${v.label} ${k === "premium" ? "≥ 12 jt" : k === "menengah" ? "7–12 jt" : "< 7 jt"}`}
              </span>
            ))}
            <span className="peta-harga__mode">
              <LuDatabase aria-hidden="true" />
              {data?.mode === "api" ? "Data langsung dari API mitra" : "Data tersimpan HomeWise"}
            </span>
          </div>
        </section>
      </main>
    </>
  );
}
