import { urlBerkas } from "../lib/api";
import { useKonfigurasi } from "../lib/konfigurasi";
import { LencanaLevel, Lencana } from "./ui";

const LABEL_STATUS = {
  ai: { teks: "Deteksi AI", nada: undefined },
  dikonfirmasi: { teks: "Dikonfirmasi analis", nada: "sukses" },
  disesuaikan: { teks: "Disesuaikan analis", nada: "peringatan" },
  ditolak: { teks: "Ditolak analis", nada: "netral" },
  analis: { teks: "Temuan analis", nada: "sukses" },
};

export function FotoBertanda({ foto, temuan }) {
  const { jenis_kerusakan: jenis } = useKonfigurasi();
  const milikFoto = temuan.filter((t) => t.foto_id === foto.id && t.kotak && t.status !== "ditolak");
  return (
    <figure className="foto-bertanda">
      <div className="foto-bertanda__gambar">
        <img src={urlBerkas(foto.url)} alt={foto.ruang ? `Foto ${foto.ruang}` : "Foto bangunan"} loading="lazy" />
        {milikFoto.map((t, i) => (
          <div
            key={i}
            className="kotak-temuan"
            style={{
              left: `${t.kotak.x * 100}%`,
              top: `${t.kotak.y * 100}%`,
              width: `${t.kotak.lebar * 100}%`,
              height: `${t.kotak.tinggi * 100}%`,
            }}
          >
            <span>
              {jenis[t.jenis] || t.jenis} {t.kepercayaan ? `${Math.round(t.kepercayaan * 100)}%` : ""}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="teks-mini teks-redup">
        {foto.ruang || foto.nama_asli || "Foto bangunan"}
        {foto.sumber === "analis" && <Lencana nada="sukses">Foto analis</Lencana>}
      </figcaption>
    </figure>
  );
}

export function TabelTemuan({ temuan, foto = [] }) {
  const { jenis_kerusakan: jenis } = useKonfigurasi();
  const namaFoto = (id) => foto.find((f) => f.id === id)?.ruang || (id ? `Foto #${id}` : "Pemeriksaan langsung");

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
                  {t.catatan_analis && <div className="teks-mini teks-redup" style={{ fontWeight: 400 }}>{t.catatan_analis}</div>}
                </td>
                <td className="teks-redup">{namaFoto(t.foto_id)}</td>
                <td>
                  <LencanaLevel level={t.tingkat} />
                </td>
                <td className="kanan">{t.luas_m2} m²</td>
                <td className="kanan">{t.kepercayaan ? `${Math.round(t.kepercayaan * 100)}%` : "–"}</td>
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
