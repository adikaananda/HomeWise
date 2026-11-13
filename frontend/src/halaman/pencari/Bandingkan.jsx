import { useState } from "react";
import { LuGitCompare, LuLock, LuTrophy } from "react-icons/lu";
import { KepalaHalaman } from "../../komponen/tata-letak/Aplikasi";
import { CincinSkor, GalatMuat, Kartu, KerangkaHalaman, Kosong, LencanaLevel, Tombol } from "../../komponen/ui";
import { api } from "../../lib/api";
import { rupiahRingkas } from "../../lib/format";
import { useData, useJudul } from "../../lib/hooks";
import { labelTujuan, useKonfigurasi } from "../../lib/konfigurasi";
import { Tautan, useRouter } from "../../lib/router";

function PemilihProperti() {
  const { navigasi } = useRouter();
  const [dipilih, setDipilih] = useState([]);
  const { data, galat, memuat, muatUlang } = useData(() => api.get("/properti"));

  if (memuat) return <KerangkaHalaman />;
  if (galat) return <GalatMuat galat={galat} onCobaLagi={muatUlang} />;
  if (data.length < 2) {
    return (
      <Kartu>
        <Kosong ikon={LuGitCompare} judul="Butuh minimal dua properti" aksi={<Tombol ke="/app/properti/baru">Analisis properti</Tombol>}>
          Tambahkan beberapa kandidat terlebih dahulu untuk membandingkannya berdampingan.
        </Kosong>
      </Kartu>
    );
  }

  const ubah = (id) => setDipilih((l) => (l.includes(id) ? l.filter((x) => x !== id) : l.length < 4 ? [...l, id] : l));

  return (
    <Kartu judul="Pilih 2 sampai 4 properti" aksi={<Tombol disabled={dipilih.length < 2} onClick={() => navigasi(`/app/bandingkan?ids=${dipilih.join(",")}`)}>Bandingkan ({dipilih.length})</Tombol>}>
      <ul className="daftar-pilih">
        {data.map((p) => (
          <li key={p.id}>
            <label>
              <input type="checkbox" checked={dipilih.includes(p.id)} onChange={() => ubah(p.id)} disabled={!dipilih.includes(p.id) && dipilih.length >= 4} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong className="teks-kecil">{p.nama}</strong>
                <span className="teks-mini teks-redup" style={{ display: "block" }}>{p.alamat}</span>
              </span>
              <CincinSkor skor={p.skor_lokasi} ukuran={44} tebal={5} />
            </label>
          </li>
        ))}
      </ul>
    </Kartu>
  );
}

function terbaik(nilai, arah) {
  const valid = nilai.filter((v) => v != null);
  if (valid.length < 2) return null;
  return arah === "tinggi" ? Math.max(...valid) : Math.min(...valid);
}

function TabelBanding({ daftar }) {
  const konfigurasi = useKonfigurasi();
  const terkunci = <LuLock aria-label="Terkunci" style={{ width: 16, height: 16, color: "var(--abu-muda)" }} />;

  const baris = [
    { label: "Harga penawaran", nilai: (d) => d.properti.harga_penawaran, format: rupiahRingkas, arah: "rendah" },
    { label: "Skor lokasi", nilai: (d) => d.lokasi?.hasil.skor_total, format: (v) => Math.round(v), arah: "tinggi" },
    ...Object.entries(konfigurasi.indikator).map(([kode, label]) => ({
      label,
      nilai: (d) => d.lokasi?.hasil.indikator.find((i) => i.kode === kode)?.skor,
      format: (v) => Math.round(v),
      arah: "tinggi",
      kecil: true,
    })),
    { label: "Kondisi visual", nilai: (d) => d.bangunan?.skor_kondisi, format: (v) => `${Math.round(v)}/100`, arah: "tinggi", premium: true },
    { label: "Estimasi renovasi", nilai: (d) => d.biaya?.total, format: rupiahRingkas, arah: "rendah", premium: true },
    { label: "Total investasi awal", nilai: (d) => d.investasi?.total, format: rupiahRingkas, arah: "rendah", premium: true },
    { label: "Total per m² bangunan", nilai: (d) => d.investasi?.total_per_m2, format: rupiahRingkas, arah: "rendah", premium: true },
  ];

  return (
    <div className="tabel-wadah tabel-banding">
      <table className="tabel">
        <thead>
          <tr>
            <th scope="col">Kriteria</th>
            {daftar.map((d) => (
              <th key={d.properti.id} scope="col">
                <Tautan ke={`/app/properti/${d.properti.id}`} className="tabel-banding__judul">
                  {d.properti.nama}
                </Tautan>
                <span className="teks-mini teks-redup" style={{ display: "block", fontWeight: 500 }}>
                  {labelTujuan(konfigurasi, d.properti.tujuan)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {baris.map((b) => {
            const nilai = daftar.map((d) => (b.premium && !d.akses_premium ? null : b.nilai(d)));
            const juara = terbaik(nilai, b.arah);
            return (
              <tr key={b.label} className={b.kecil ? "tabel-banding__sub" : undefined}>
                <th scope="row">{b.label}</th>
                {daftar.map((d, i) => (
                  <td key={d.properti.id} className={nilai[i] != null && nilai[i] === juara ? "tabel-banding__juara" : undefined}>
                    {b.premium && !d.akses_premium ? terkunci : nilai[i] == null ? "–" : b.format(nilai[i])}
                    {nilai[i] != null && nilai[i] === juara && <LuTrophy aria-label="Terbaik" className="ikon-juara" />}
                  </td>
                ))}
              </tr>
            );
          })}
          {["banjir", "longsor", "gempa"].map((r) => (
            <tr key={r}>
              <th scope="row" style={{ textTransform: "capitalize" }}>Risiko {r}</th>
              {daftar.map((d) => (
                <td key={d.properti.id}>{d.lokasi ? <LencanaLevel level={d.lokasi.data.risiko[r].level} /> : "–"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Bandingkan() {
  useJudul("Bandingkan properti");
  const { query } = useRouter();
  const ids = query.get("ids") || "";
  const { data, galat, memuat, muatUlang } = useData(() => (ids ? api.get(`/properti/bandingkan?ids=${ids}`) : Promise.resolve(null)), [ids]);

  return (
    <>
      <KepalaHalaman
        judul="Bandingkan properti"
        deskripsi="Lihat kandidat berdampingan. Nilai terbaik di setiap kriteria ditandai."
        aksi={ids && <Tombol varian="sekunder" ke="/app/bandingkan">Ganti pilihan</Tombol>}
      />
      {!ids ? <PemilihProperti /> : memuat ? <KerangkaHalaman /> : galat ? <GalatMuat galat={galat} onCobaLagi={muatUlang} /> : <TabelBanding daftar={data} />}
    </>
  );
}
