import { LuCircleCheck, LuCompass } from "react-icons/lu";
import { TataLetakPublik } from "../../komponen/tata-letak/Publik";
import { Kosong, Lencana, Tombol } from "../../komponen/ui";
import { useAuth } from "../../lib/auth";
import { rupiah } from "../../lib/format";
import { useJudul } from "../../lib/hooks";

const PAKET = [
  {
    nama: "Ringkasan Lokasi",
    harga: "Gratis",
    satuan: "selamanya",
    deskripsi: "Untuk menyaring kandidat sebelum survei.",
    fitur: ["Skor kelayakan lokasi sesuai tujuan", "Peta risiko banjir, longsor, gempa", "Mode survei & penyimpanan foto", "Simpan dan bandingkan properti"],
    aksi: "Mulai gratis",
  },
  {
    nama: "Laporan Lengkap",
    harga: rupiah(49000),
    satuan: "per properti",
    deskripsi: "Untuk properti yang serius Anda pertimbangkan.",
    fitur: ["Semua fitur Ringkasan Lokasi", "Analisis AI foto survei", "Prioritas perbaikan & daftar material", "Total investasi awal", "Unduh laporan PDF"],
    aksi: "Pilih Laporan Lengkap",
    unggulan: true,
  },
  {
    nama: "Paket Hemat",
    harga: rupiah(199000),
    satuan: "5 laporan",
    deskripsi: "Untuk membandingkan beberapa kandidat sekaligus.",
    fitur: ["5 kredit Laporan Lengkap", "Pakai untuk properti mana saja", "Hemat 19% dibanding satuan"],
    aksi: "Pilih Paket Hemat",
  },
  {
    nama: "Inspeksi Profesional",
    harga: rupiah(750000),
    satuan: "per kunjungan",
    deskripsi: "Validasi temuan AI oleh analis di lokasi.",
    fitur: ["Termasuk Laporan Lengkap", "Pemeriksaan langsung oleh analis", "Foto dan catatan tambahan", "Laporan berstatus tervalidasi"],
    aksi: "Pesan inspeksi",
  },
];

export default function Harga() {
  useJudul("Harga");
  const { pengguna } = useAuth();
  const tujuan = pengguna ? "/app/properti" : "/daftar";

  return (
    <TataLetakPublik>
      <section className="bagian">
        <div className="wadah">
          <div className="bagian__kepala" style={{ textAlign: "center", marginInline: "auto" }}>
            <h1 style={{ fontSize: "clamp(2rem, 1.4rem + 2vw, 3rem)" }}>Bayar hanya untuk properti yang serius Anda pertimbangkan</h1>
            <p className="teks-redup">Pembayaran aman melalui Midtrans: QRIS, virtual account, e-wallet, dan kartu.</p>
          </div>
          <div className="harga-kisi">
            {PAKET.map((p) => (
              <article key={p.nama} className={`harga-kartu ${p.unggulan ? "harga-kartu--unggulan" : ""}`}>
                <div className="baris-antara">
                  <h2 style={{ fontSize: "var(--teks-lg)" }}>{p.nama}</h2>
                  {p.unggulan && <Lencana nada="lime">Paling dipilih</Lencana>}
                </div>
                <div>
                  <span className="harga-kartu__nominal">{p.harga}</span>
                  <span className="teks-redup teks-kecil"> / {p.satuan}</span>
                </div>
                <p className="teks-redup teks-kecil">{p.deskripsi}</p>
                <ul className="daftar-poin">
                  {p.fitur.map((f) => (
                    <li key={f}>
                      <LuCircleCheck color="var(--hijau)" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Tombol ke={tujuan} varian={p.unggulan ? "utama" : "sekunder"} penuh>
                  {p.aksi}
                </Tombol>
              </article>
            ))}
          </div>
          <p className="teks-mini teks-redup" style={{ textAlign: "center", marginTop: 24 }}>
            Untuk agen properti, bank, dan perusahaan inspeksi tersedia langganan B2B sesuai volume. Hubungi tim HomeWise.
          </p>
        </div>
      </section>
    </TataLetakPublik>
  );
}

export function TidakDitemukan() {
  useJudul("Halaman tidak ditemukan");
  return (
    <TataLetakPublik>
      <div className="wadah" style={{ paddingBlock: 80 }}>
        <Kosong ikon={LuCompass} judul="Halaman ini tidak ditemukan" aksi={<Tombol ke="/">Kembali ke beranda</Tombol>}>
          Tautan mungkin sudah berubah atau salah ketik. Mulai lagi dari beranda.
        </Kosong>
      </div>
    </TataLetakPublik>
  );
}
