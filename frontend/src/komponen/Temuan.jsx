import { urlBerkas } from "../lib/api";
import { labelArea, useKonfigurasi } from "../lib/konfigurasi";
import { LencanaPrioritas } from "./Survei";
import { LencanaLevel, Lencana } from "./ui";

const LABEL_STATUS = {
  ai: { teks: "Deteksi AI", nada: undefined },
  dikonfirmasi: { teks: "Dikonfirmasi analis", nada: "sukses" },
  disesuaikan: { teks: "Disesuaikan analis", nada: "peringatan" },
  ditolak: { teks: "Ditolak analis", nada: "netral" },
  analis: { teks: "Temuan analis", nada: "sukses" },
};

const PALET_TEMUAN = [
  { garis: "#ef4444", isi: "rgba(239, 68, 68, 0.16)" },
  { garis: "#f59e0b", isi: "rgba(245, 158, 11, 0.16)" },
  { garis: "#06b6d4", isi: "rgba(6, 182, 212, 0.16)" },
  { garis: "#a855f7", isi: "rgba(168, 85, 247, 0.16)" },
  { garis: "#84cc16", isi: "rgba(132, 204, 22, 0.16)" },
  { garis: "#ec4899", isi: "rgba(236, 72, 153, 0.16)" },
];

function daftarPoligon(t) {
  if (Array.isArray(t.poligon_list) && t.poligon_list.length > 0) {
    return t.poligon_list.filter((p) => Array.isArray(p) && p.length >= 3);
  }
  if (Array.isArray(t.poligon) && t.poligon.length >= 3) {
    return [t.poligon];
  }
  return [];
}

export function FotoBertanda({ foto, temuan }) {
  const konfigurasi = useKonfigurasi();
  const { jenis_kerusakan: jenis } = konfigurasi;
  const milikFoto = temuan
    .filter((t) => t.foto_id === foto.id && (t.kotak || daftarPoligon(t).length > 0) && t.status !== "ditolak")
    .map((t, idx) => ({
      temuan: t,
      poligonList: daftarPoligon(t),
      warna: PALET_TEMUAN[idx % PALET_TEMUAN.length],
    }));
  const itemPoligon = milikFoto.filter((item) => item.poligonList.length > 0);
  const itemKotak = milikFoto.filter((item) => item.poligonList.length === 0 && item.temuan.kotak);

  const labelTeks = (t) =>
    `${jenis[t.jenis] || t.jenis}${t.tingkat ? ` · ${t.tingkat}` : ""}${t.kepercayaan ? ` ${Math.round(t.kepercayaan * 100)}%` : ""}`;

  return (
    <figure className="foto-bertanda">
      <div className="foto-bertanda__gambar">
        <img src={urlBerkas(foto.url)} alt={`Foto ${labelArea(konfigurasi, foto.area)}`} loading="lazy" />
        {itemPoligon.length > 0 && (
          <svg className="lapis-poligon" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {itemPoligon.map(({ poligonList, warna }, i) =>
              poligonList.map((poli, pIdx) => (
                <polygon
                  key={`pg-${i}-${pIdx}`}
                  points={poli.map(([x, y]) => `${x * 100},${y * 100}`).join(" ")}
                  vectorEffect="non-scaling-stroke"
                  className="poligon-temuan"
                  style={{ stroke: warna.garis, fill: warna.isi }}
                />
              ))
            )}
          </svg>
        )}
        {itemPoligon.map(({ poligonList, warna }, i) =>
          poligonList.map((poli, pIdx) =>
            poli.map(([x, y], j) => (
              <span
                key={`s-${i}-${pIdx}-${j}`}
                className="simpul-temuan"
                style={{ left: `${x * 100}%`, top: `${y * 100}%`, background: warna.garis }}
                aria-hidden="true"
              />
            ))
          )
        )}
        {itemKotak.map(({ temuan: t, warna }, i) => (
          <div
            key={`k-${i}`}
            className="kotak-temuan"
            style={{
              left: `${t.kotak.x * 100}%`,
              top: `${t.kotak.y * 100}%`,
              width: `${t.kotak.lebar * 100}%`,
              height: `${t.kotak.tinggi * 100}%`,
              borderColor: warna.garis,
              background: warna.isi,
            }}
          />
        ))}
        {milikFoto.length > 0 && (
          <div className="legenda-temuan" aria-label="Legenda temuan">
            {milikFoto.map(({ temuan: t, warna }, i) => (
              <div className="legenda-temuan__item" key={i}>
                <span className="legenda-temuan__titik" style={{ background: warna.garis }} aria-hidden="true" />
                <span>{labelTeks(t)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <figcaption className="teks-mini teks-redup">
        {labelArea(konfigurasi, foto.area)}
        {foto.sumber === "analis" && <Lencana nada="sukses">Foto analis</Lencana>}
      </figcaption>
    </figure>
  );
}

export function TabelTemuan({ temuan, foto = [] }) {
  const konfigurasi = useKonfigurasi();
  const { jenis_kerusakan: jenis } = konfigurasi;
  const namaFoto = (id) => {
    const f = foto.find((x) => x.id === id);
    return f ? labelArea(konfigurasi, f.area) : "Pemeriksaan langsung";
  };

  return (
    <div className="tabel-wadah">
      <table className="tabel">
        <thead>
          <tr>
            <th>Temuan</th>
            <th>Lokasi</th>
            <th>Tingkat</th>
            <th className="kanan">Luas</th>
            <th className="kanan">Keyakinan</th>
            <th>Prioritas</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {temuan.map((t, i) => {
            const status = LABEL_STATUS[t.status] || LABEL_STATUS.ai;
            return (
              <tr key={i} style={t.status === "ditolak" ? { opacity: 0.5 } : undefined}>
                <td className="tebal">
                  {jenis[t.jenis] || t.jenis}
                  {t.sumber_foto === "iklan" && <div className="teks-mini" style={{ fontWeight: 600, color: "var(--peringatan)" }}>Dari foto iklan</div>}
                  {t.catatan_analis && <div className="teks-mini teks-redup" style={{ fontWeight: 400 }}>{t.catatan_analis}</div>}
                </td>
                <td className="teks-redup">{namaFoto(t.foto_id)}</td>
                <td>
                  <LencanaLevel level={t.tingkat} />
                </td>
                <td className="kanan">{t.luas_m2} m²{t.panjang_m ? <span className="teks-mini teks-redup" style={{ display: "block" }}>retak ±{t.panjang_m} m</span> : null}</td>
                <td className="kanan">{t.kepercayaan ? `${Math.round(t.kepercayaan * 100)}%` : "–"}</td>
                <td title={t.alasan_prioritas || undefined}>{t.prioritas ? <LencanaPrioritas kode={t.prioritas} /> : "–"}</td>
                <td>
                  <Lencana nada={status.nada}>{status.teks}</Lencana>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
