import { useState } from "react";
import { LuCalculator, LuCheck, LuCopy, LuPackage } from "react-icons/lu";
import { LencanaPrioritas } from "../../../komponen/Survei";
import { Kartu, Kosong, Tombol } from "../../../komponen/ui";
import { rupiah, rupiahRingkas } from "../../../lib/format";
import { useNotifikasi } from "../../../lib/notifikasi";

const WARNA_KOMPONEN = ["var(--biru)", "var(--mint)", "var(--langit)"];
const KELAS_PRIORITAS = { mendesak: "prioritas--mendesak", disarankan: "prioritas--disarankan", kosmetik: "prioritas--kosmetik" };

function satuan(teks) {
  return teks.replace("m2", "m²").replace("m3", "m³");
}

function angkaDesimal(n) {
  return Number(n).toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

function RingkasanInvestasi({ investasi }) {
  const komponen = [
    { label: "Harga penawaran", nilai: investasi.harga_penawaran },
    { label: "Estimasi renovasi", nilai: investasi.renovasi },
    { label: "Biaya transaksi", nilai: investasi.biaya_transaksi },
  ];
  return (
    <Kartu>
      <div className="investasi-ringkas">
        <div>
          <span className="teks-kecil teks-redup">Total investasi awal</span>
          <p className="investasi-ringkas__total angka">{rupiah(investasi.total)}</p>
          <p className="teks-redup teks-kecil" style={{ maxWidth: "60ch" }}>
            {investasi.ringkasan}
          </p>
        </div>
        <div className="investasi-ringkas__meta">
          <div>
            <span className="teks-mini teks-redup">Jika hanya perbaikan mendesak</span>
            <strong className="angka">{rupiah(investasi.total_minimum)}</strong>
          </div>
          <div>
            <span className="teks-mini teks-redup">Total per m² bangunan</span>
            <strong className="angka">{investasi.total_per_m2 ? rupiah(investasi.total_per_m2) : "–"}</strong>
          </div>
          <div>
            <span className="teks-mini teks-redup">Renovasi terhadap harga</span>
            <strong className="angka">{investasi.rasio_renovasi_persen.toLocaleString("id-ID")}%</strong>
          </div>
        </div>
      </div>
      <div className="batang-tumpuk" role="img" aria-label="Komposisi total investasi">
        {komponen.map((k, i) => (
          <span key={k.label} style={{ flexGrow: Math.max(k.nilai, investasi.total * 0.01), background: WARNA_KOMPONEN[i] }} />
        ))}
      </div>
      <div className="legenda" style={{ marginTop: 10 }}>
        {komponen.map((k, i) => (
          <span key={k.label}>
            <i style={{ background: WARNA_KOMPONEN[i] }} />
            {k.label} <strong className="angka">{rupiahRingkas(k.nilai)}</strong>
          </span>
        ))}
      </div>
    </Kartu>
  );
}

function KartuPrioritas({ daftar, aktif, onPilih }) {
  return (
    <div className="kisi-prioritas" role="group" aria-label="Saring berdasarkan prioritas">
      {daftar.map((p) => (
        <button
          key={p.kode}
          type="button"
          className={`kartu-prioritas ${KELAS_PRIORITAS[p.kode]}`}
          aria-pressed={aktif === p.kode}
          onClick={() => onPilih(aktif === p.kode ? "semua" : p.kode)}
          disabled={!p.jumlah_pekerjaan}
        >
          <span className="kartu-prioritas__label">{p.label}</span>
          <strong className="angka">{p.jumlah_pekerjaan ? rupiah(p.jumlah) : "Tidak ada"}</strong>
          <span className="teks-mini">{p.keterangan}</span>
        </button>
      ))}
    </div>
  );
}

function TabelPekerjaan({ biaya, filter }) {
  const item = filter === "semua" ? biaya.item : biaya.item.filter((i) => i.prioritas === filter);
  return (
    <div className="tabel-wadah">
      <table className="tabel">
        <thead>
          <tr>
            <th>Pekerjaan</th>
            <th>Prioritas</th>
            <th className="kanan">Volume</th>
            <th className="kanan">Material</th>
            <th className="kanan">Upah</th>
            <th className="kanan">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {item.map((i) => (
            <tr key={`${i.kode}-${i.prioritas}`}>
              <td>
                <strong>{i.pekerjaan}</strong>
                <div className="teks-mini teks-redup">Untuk: {i.sumber_temuan.join(", ")}</div>
              </td>
              <td>
                <LencanaPrioritas kode={i.prioritas} />
              </td>
              <td className="kanan">
                {angkaDesimal(i.volume)} {satuan(i.satuan)}
              </td>
              <td className="kanan">{rupiah(i.material)}</td>
              <td className="kanan">{rupiah(i.upah)}</td>
              <td className="kanan tebal">{rupiah(i.jumlah)}</td>
            </tr>
          ))}
        </tbody>
        {filter === "semua" && (
          <tfoot>
            <tr>
              <td colSpan={5}>Subtotal</td>
              <td className="kanan">{rupiah(biaya.subtotal)}</td>
            </tr>
            <tr>
              <td colSpan={5}>Cadangan tak terduga {Math.round(biaya.asumsi.tarif_kontingensi * 100)}%</td>
              <td className="kanan">{rupiah(biaya.kontingensi)}</td>
            </tr>
            <tr>
              <td colSpan={5}>Total estimasi renovasi</td>
              <td className="kanan" style={{ color: "var(--biru-tua)" }}>
                {rupiah(biaya.total)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function DaftarMaterial({ material, namaProperti }) {
  const beriTahu = useNotifikasi();
  const [tersalin, setTersalin] = useState(false);

  const salin = async () => {
    const teks = [
      `Daftar belanja material — ${namaProperti}`,
      ...material.map((m) => `- ${m.nama}: ${m.jumlah_beli} ${m.kemasan} (butuh ${angkaDesimal(m.jumlah)} ${satuan(m.satuan)})`),
      "Perkiraan HomeWise, cek ulang bersama tukang sebelum membeli.",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(teks);
      setTersalin(true);
      beriTahu("Daftar material disalin. Tempel di WhatsApp untuk dikirim ke tukang.");
      setTimeout(() => setTersalin(false), 2500);
    } catch {
      beriTahu("Browser tidak mengizinkan menyalin. Unduh PDF untuk daftar lengkapnya.", "galat");
    }
  };

  return (
    <Kartu
      judul="Daftar belanja material"
      sub="Kebutuhan dihitung dari volume pekerjaan dan koefisien AHSP PUPR, lalu dibulatkan ke kemasan yang dijual di toko."
      aksi={
        <Tombol varian="sekunder" ukuran="kecil" ikon={tersalin ? LuCheck : LuCopy} onClick={salin}>
          {tersalin ? "Tersalin" : "Salin daftar"}
        </Tombol>
      }
    >
      <ul className="daftar-material">
        {material.map((m) => (
          <li key={`${m.nama}-${m.satuan}`}>
            <span className="daftar-material__ikon">
              <LuPackage aria-hidden="true" />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong className="teks-kecil">{m.nama}</strong>
              <span className="teks-mini teks-redup" style={{ display: "block" }}>
                Untuk {m.untuk.join(", ").toLowerCase()}
              </span>
            </div>
            <div className="daftar-material__jumlah">
              <strong className="angka">
                {m.jumlah_beli} {m.kemasan}
              </strong>
              <span className="teks-mini teks-redup angka">
                butuh {angkaDesimal(m.jumlah)} {satuan(m.satuan)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Kartu>
  );
}

function BiayaTransaksi({ investasi }) {
  return (
    <Kartu judul="Biaya transaksi" sub={investasi.asumsi}>
      <dl className="daftar-definisi" style={{ maxWidth: 640 }}>
        {investasi.rincian_transaksi.map((r) => (
          <div key={r.nama} style={{ display: "contents" }}>
            <dt>{r.nama}</dt>
            <dd className="angka">{rupiah(r.jumlah)}</dd>
          </div>
        ))}
        <dt className="tebal">Total biaya transaksi</dt>
        <dd className="angka tebal">{rupiah(investasi.biaya_transaksi)}</dd>
      </dl>
    </Kartu>
  );
}

export function TabBiaya({ detail, keBangunan }) {
  const { biaya, investasi, properti } = detail;
  const [filter, setFilter] = useState("semua");
  const adaRincian = biaya?.item.length > 0;

  return (
    <div className="tumpuk" style={{ gap: 20 }}>
      <RingkasanInvestasi investasi={investasi} />

      {adaRincian ? (
        <>
          <section className="tumpuk" style={{ gap: 12 }}>
            <div>
              <h3>Prioritas perbaikan</h3>
              <p className="teks-kecil teks-redup">Pakai untuk menyusun anggaran dan menawar harga. Klik salah satu untuk menyaring rincian.</p>
            </div>
            <KartuPrioritas daftar={biaya.per_prioritas} aktif={filter} onPilih={setFilter} />
          </section>

          <Kartu
            judul="Rincian pekerjaan renovasi"
            sub={filter === "semua" ? "Semua prioritas" : `Hanya prioritas ${biaya.per_prioritas.find((p) => p.kode === filter)?.label.toLowerCase()}`}
            aksi={
              filter !== "semua" && (
                <Tombol varian="hantu" ukuran="kecil" onClick={() => setFilter("semua")}>
                  Tampilkan semua
                </Tombol>
              )
            }
          >
            <TabelPekerjaan biaya={biaya} filter={filter} />
            <p className="teks-mini teks-redup" style={{ marginTop: 10 }}>
              Rentang wajar {rupiah(biaya.rentang_min)} – {rupiah(biaya.rentang_maks)}. Harga satuan disesuaikan indeks wilayah{" "}
              {biaya.asumsi.indeks_harga_wilayah}.
            </p>
          </Kartu>

          {biaya.material.length > 0 && <DaftarMaterial material={biaya.material} namaProperti={properti.nama} />}
          <BiayaTransaksi investasi={investasi} />
        </>
      ) : (
        <Kartu>
          <Kosong ikon={LuCalculator} judul="Belum ada estimasi renovasi" aksi={keBangunan}>
            Foto bangunan saat survei lalu jalankan analisis. Rincian pekerjaan, daftar material, dan prioritas perbaikan muncul di sini.
          </Kosong>
        </Kartu>
      )}
    </div>
  );
}
