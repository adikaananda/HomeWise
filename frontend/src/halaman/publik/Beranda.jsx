import { useMemo, useState } from "react";
import {
  LuArrowRight,
  LuBriefcase,
  LuBuilding2,
  LuCamera,
  LuCircleCheck,
  LuFileText,
  LuHouse,
  LuKeyRound,
  LuLandmark,
  LuMapPin,
  LuSearch,
  LuShieldCheck,
  LuSparkles,
  LuStore,
  LuUtensils,
} from "react-icons/lu";
import { IlustrasiBiaya, IlustrasiLaporan, IlustrasiPemindai, IlustrasiPeta, IlustrasiRumah } from "../../komponen/ilustrasi/Ilustrasi";
import { TataLetakPublik } from "../../komponen/tata-letak/Publik";
import { BatangSkor, CincinSkor, GambarDenganCadangan, LencanaLevel, Segmen, Tombol } from "../../komponen/ui";
import { GAMBAR } from "../../data/gambar";
import { api } from "../../lib/api";
import { jarak } from "../../lib/format";
import { cariAlamat, LOKASI_CONTOH } from "../../lib/geokode";
import { useJudul } from "../../lib/hooks";
import { useKonfigurasi } from "../../lib/konfigurasi";

const CONTOH_HASIL = {
  skor_total: 84,
  kategori: "Sangat layak",
  risiko: { banjir: "rendah", longsor: "sedang", gempa: "sedang" },
  fasilitas_terdekat: [
    { nama: "Halte Koridor", kategori: "halte", jarak_m: 210 },
    { nama: "SD Negeri 03", kategori: "sekolah", jarak_m: 640 },
    { nama: "Klinik Keluarga Sehat", kategori: "klinik", jarak_m: 820 },
  ],
  lokasi: "Bintaro, Tangerang Selatan",
  tujuan: "Rumah tinggal",
};

const TUJUAN_CEPAT = [
  { kode: "rumah_tinggal", label: "Rumah tinggal", ikon: LuHouse },
  { kode: "investasi_sewa", label: "Investasi sewa", ikon: LuKeyRound },
  { kode: "ruko", label: "Ruko", ikon: LuStore },
  { kode: "restoran", label: "Restoran", ikon: LuUtensils },
  { kode: "kafe", label: "Kafe", ikon: LuSparkles },
  { kode: "kantor", label: "Kantor", ikon: LuBriefcase },
];

function PanelPemindai({ hasil, memuat }) {
  return (
    <div className="hero__visual">
      <IlustrasiRumah className="hero__rumah" />
      <div className={`kartu-mengambang kartu-mengambang--skor ${memuat ? "sedang-memindai" : ""}`}>
        <CincinSkor skor={memuat ? 0 : hasil.skor_total} ukuran={84} tebal={9} label="Skor lokasi" />
        <div>
          <span className="teks-mini teks-redup">Skor lokasi untuk {hasil.tujuan.toLowerCase()}</span>
          <strong className="kartu-mengambang__judul">{memuat ? "Memindai lokasi…" : hasil.kategori}</strong>
          <span className="teks-mini teks-redup kartu-mengambang__lokasi">
            <LuMapPin aria-hidden="true" /> {hasil.lokasi}
          </span>
        </div>
      </div>
      <div className="kartu-mengambang kartu-mengambang--risiko">
        <span className="teks-mini tebal">Risiko lingkungan</span>
        <div className="baris" style={{ flexWrap: "wrap", gap: 6 }}>
          {Object.entries(hasil.risiko).map(([nama, level]) => (
            <LencanaLevel key={nama} level={level} awalan={`${nama[0].toUpperCase()}${nama.slice(1)}: `} />
          ))}
        </div>
      </div>
      <div className="kartu-mengambang kartu-mengambang--fasilitas">
        <span className="teks-mini tebal">Fasilitas terdekat</span>
        <ul>
          {hasil.fasilitas_terdekat.slice(0, 3).map((f) => (
            <li key={f.nama}>
              <span>{f.nama}</span>
              <span className="angka teks-redup">{jarak(f.jarak_m)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Hero() {
  const { tujuan } = useKonfigurasi();
  const [kueri, setKueri] = useState("");
  const [kodeTujuan, setKodeTujuan] = useState("rumah_tinggal");
  const [hasil, setHasil] = useState(CONTOH_HASIL);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState("");

  const labelTujuan = (kode) => tujuan.find((t) => t.kode === kode)?.label || "Rumah tinggal";

  const periksa = async (lokasi) => {
    setGalat("");
    setMemuat(true);
    try {
      const titik = lokasi || (await cariAlamat(kueri))[0];
      if (!titik) throw new Error("Alamat tidak ditemukan. Coba tulis nama kelurahan atau kota, atau tempel koordinat.");
      const data = await api.post("/cek-cepat", { lat: titik.lat, lng: titik.lng, tujuan: kodeTujuan, alamat: titik.label });
      setHasil({ ...data, lokasi: titik.label.split(",").slice(0, 2).join(","), tujuan: labelTujuan(kodeTujuan) });
    } catch (e) {
      setGalat(e.message);
    } finally {
      setMemuat(false);
    }
  };

  const kirim = (e) => {
    e.preventDefault();
    if (kueri.trim().length < 3) {
      setGalat("Tulis alamat, nama kawasan, atau koordinat properti.");
      return;
    }
    periksa();
  };

  return (
    <section className="hero">
      <div className="wadah hero__isi">
        <div className="hero__teks">
          <span className="hero__eyebrow">Keputusan properti berbasis data</span>
          <h1 className="hero__judul">Kenali properti sebelum Anda menawar.</h1>
          <p className="hero__deskripsi">
            Periksa lokasi, risiko lingkungan, kondisi bangunan, dan estimasi renovasi dalam satu alur yang mudah dipahami.
          </p>

          <form className="cek-cepat" onSubmit={kirim} noValidate>
            <label className="sr-only" htmlFor="cek-alamat">
              Alamat atau koordinat properti
            </label>
            <div className="cek-cepat__isian">
              <LuSearch aria-hidden="true" />
              <input
                id="cek-alamat"
                value={kueri}
                onChange={(e) => setKueri(e.target.value)}
                placeholder="Alamat, kawasan, atau koordinat"
                autoComplete="off"
              />
            </div>
            <label className="sr-only" htmlFor="cek-tujuan">
              Tujuan pembelian
            </label>
            <select id="cek-tujuan" className="cek-cepat__tujuan" value={kodeTujuan} onChange={(e) => setKodeTujuan(e.target.value)}>
              {(tujuan.length ? tujuan : [{ kode: "rumah_tinggal", label: "Rumah tinggal" }]).map((t) => (
                <option key={t.kode} value={t.kode}>
                  {t.label}
                </option>
              ))}
            </select>
            <Tombol type="submit" memuat={memuat} ukuran="besar">
              Cek lokasi
            </Tombol>
          </form>
          {galat && (
            <p className="isian__galat" role="alert" style={{ marginTop: 10 }}>
              {galat}
            </p>
          )}
          <div className="hero__contoh">
            <span className="teks-mini teks-redup">Coba:</span>
            {LOKASI_CONTOH.map((l) => (
              <button key={l.label} type="button" onClick={() => { setKueri(l.label); periksa(l); }}>
                {l.label}
              </button>
            ))}
          </div>
          <div className="hero__tujuan">
            <span className="hero__tujuan-label">Pilih tujuan analisis</span>
            <div className="hero__tujuan-daftar">
              {TUJUAN_CEPAT.map((item) => (
                <button
                  key={item.kode}
                  type="button"
                  className={kodeTujuan === item.kode ? "aktif" : ""}
                  aria-pressed={kodeTujuan === item.kode}
                  onClick={() => setKodeTujuan(item.kode)}
                >
                  <span><item.ikon aria-hidden="true" /></span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <PanelPemindai hasil={hasil} memuat={memuat} />
      </div>
    </section>
  );
}

const FITUR = [
  {
    ikon: LuMapPin,
    judul: "Geospatial intelligence",
    teks: "Indeks risiko banjir, longsor, dan gempa dari data InaRISK BNPB, lengkap dengan elevasi dan kemiringan lahan.",
    ilustrasi: IlustrasiPeta,
    besar: true,
  },
  {
    ikon: LuBuilding2,
    judul: "Location intelligence",
    teks: "Jarak ke jalan utama, rumah sakit, sekolah, transportasi umum, dan pusat ekonomi dalam radius 5 km.",
  },
  {
    ikon: LuCamera,
    judul: "Analisis kondisi bangunan",
    teks: "Saat survei, mode survei memandu Anda memotret area yang sering rusak. AI menandai retak, rembesan, plafon rusak, dan atap bocor.",
    ilustrasi: IlustrasiPemindai,
  },
  {
    ikon: LuFileText,
    judul: "Biaya, material & prioritas",
    teks: "Rincian pekerjaan, daftar belanja material, dan mana yang mendesak atau bisa ditunda, digabung harga penawaran dan biaya transaksi.",
    ilustrasi: IlustrasiBiaya,
    besar: true,
  },
];

function Fitur() {
  return (
    <section className="bagian" id="fitur">
      <div className="wadah">
        <div className="bagian__kepala">
          <h2>Empat analisis yang biasanya Anda cari di tempat berbeda</h2>
          <p className="teks-redup">Setiap angka di HomeWise punya sumber dan metode. AI menjelaskan temuannya, bukan mengarang data.</p>
        </div>
        <div className="bento">
          {FITUR.map((f) => (
            <article key={f.judul} className={`bento__item ${f.besar ? "bento__item--besar" : ""}`}>
              <div className="bento__ikon">
                <f.ikon aria-hidden="true" />
              </div>
              <h3>{f.judul}</h3>
              <p className="teks-redup">{f.teks}</p>
              {f.ilustrasi && <f.ilustrasi className="bento__ilustrasi" />}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AnalisisTujuan() {
  const { tujuan, indikator } = useKonfigurasi();
  const [aktif, setAktif] = useState("rumah_tinggal");
  const terpilih = tujuan.find((t) => t.kode === aktif);
  const bobot = useMemo(
    () => (terpilih ? Object.entries(terpilih.bobot).sort((a, b) => b[1] - a[1]) : []),
    [terpilih],
  );

  return (
    <section className="bagian bagian--biru" id="tujuan">
      <div className="wadah tujuan">
        <div className="tujuan__teks">
          <h2>Rumah keluarga dan restoran tidak dinilai dengan ukuran yang sama</h2>
          <p>
            Pilih tujuan pembelian, HomeWise menyesuaikan bobot setiap indikator. Lokasi yang ideal untuk keluarga belum tentu ramai untuk kafe.
          </p>
          <Segmen
            label="Tujuan pembelian"
            opsi={tujuan.map((t) => ({ nilai: t.kode, label: t.label }))}
            nilai={aktif}
            onUbah={setAktif}
          />
        </div>
        <div className="tujuan__panel">
          <p className="tebal">{terpilih?.label}</p>
          <p className="teks-kecil teks-redup" style={{ marginBottom: 20 }}>
            {terpilih?.deskripsi}
          </p>
          <div className="tumpuk" style={{ gap: 14 }}>
            {bobot.map(([kode, nilai]) => (
              <BatangSkor key={kode} label={indikator[kode]} skor={nilai * 100} keterangan="% bobot" warna="var(--gradasi-merek)" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const LANGKAH = [
  { judul: "Cek lokasi dari rumah", teks: "Tempel alamat dari iklan. Risiko bencana, fasilitas, dan skor kelayakan keluar gratis untuk menyaring kandidat." },
  { judul: "Survei dengan panduan foto", teks: "Datang ke properti dan buka mode survei di HP. Anda yang memotret, jadi kerusakan tidak disembunyikan." },
  { judul: "Lihat kerusakan & biaya", teks: "AI menandai kerusakan, lalu HomeWise menghitung prioritas perbaikan, material, dan total investasi." },
  { judul: "Tawar dengan data", teks: "Bawa laporan PDF ke negosiasi, bandingkan kandidat, atau pesan analis untuk validasi di lokasi." },
];

function CaraKerja() {
  return (
    <section className="bagian" id="cara-kerja">
      <div className="wadah">
        <div className="bagian__kepala">
          <h2>Dari iklan di media sosial ke harga yang pantas ditawar</h2>
        </div>
        <ol className="alur">
          {LANGKAH.map((l, i) => (
            <li key={l.judul} className="alur__item">
              <span className="alur__nomor">{i + 1}</span>
              <h3>{l.judul}</h3>
              <p className="teks-redup teks-kecil">{l.teks}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const SEGMEN = [
  {
    ikon: LuHouse,
    judul: "Pembeli rumah",
    teks: "Pahami risiko banjir, kondisi bangunan, dan biaya renovasi rumah bekas sebelum menawar.",
    gambar: GAMBAR.pembeliRumah,
    latar: "var(--gradasi-merek)",
  },
  {
    ikon: LuStore,
    judul: "Pelaku usaha",
    teks: "Nilai keramaian, akses jalan, dan kebutuhan renovasi bangunan untuk kafe, restoran, kantor, atau ruko.",
    gambar: GAMBAR.pelakuUsaha,
    latar: "var(--gradasi-segar)",
  },
  {
    ikon: LuLandmark,
    judul: "Mitra institusi",
    teks: "Agen, bank, dan perusahaan inspeksi dapat memakai laporan sebagai informasi pendukung keputusan.",
    gambar: GAMBAR.mitraInstitusi,
    latar: "linear-gradient(120deg, #0832c8, #14bace)",
  },
];

function Segmen3() {
  return (
    <section className="bagian bagian--putih" id="segmen">
      <div className="wadah">
        <div className="bagian__kepala">
          <h2>Dibuat untuk keputusan bernilai besar</h2>
        </div>
        <div className="kisi-3">
          {SEGMEN.map((s) => (
            <article key={s.judul} className="segmen-kartu">
              <div className="segmen-kartu__gambar" style={{ background: s.latar }}>
                <GambarDenganCadangan
                  src={s.gambar.src}
                  alt={s.gambar.alt}
                  cadangan={<s.ikon className="segmen-kartu__ikon-besar" aria-hidden="true" />}
                />
              </div>
              <div className="segmen-kartu__isi">
                <h3>{s.judul}</h3>
                <p className="teks-redup teks-kecil">{s.teks}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const ISI_LAPORAN = [
  "Skor kelayakan lokasi sesuai tujuan dan alasannya",
  "Peta risiko banjir, longsor, gempa, serta topografi",
  "Fasilitas terdekat dengan jarak tempuh",
  "Temuan kerusakan per area beserta prioritas perbaikan",
  "Rincian renovasi, daftar belanja material, dan total investasi",
  "Daftar pemeriksaan lanjutan sebelum negosiasi",
];

function Laporan() {
  return (
    <section className="bagian">
      <div className="wadah laporan-promo">
        <IlustrasiLaporan className="laporan-promo__ilustrasi" />
        <div>
          <h2>Satu laporan untuk dibawa ke meja negosiasi</h2>
          <p className="teks-redup" style={{ marginTop: 12 }}>
            Laporan Lengkap mulai Rp49.000 per properti. Butuh kepastian lebih? Pesan inspeksi profesional dan analis kami memvalidasi temuan AI di lokasi.
          </p>
          <ul className="daftar-poin" style={{ marginBlock: 24 }}>
            {ISI_LAPORAN.map((t) => (
              <li key={t}>
                <LuCircleCheck color="var(--hijau)" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
          <div className="baris" style={{ flexWrap: "wrap" }}>
            <Tombol ke="/daftar" ikonKanan={LuArrowRight}>
              Mulai analisis gratis
            </Tombol>
            <Tombol ke="/harga" varian="sekunder">
              Lihat harga
            </Tombol>
          </div>
        </div>
      </div>
    </section>
  );
}

function Banner() {
  return (
    <section className="wadah" style={{ paddingBottom: 80 }}>
      <div className="banner">
        <div className="banner__teks">
          <h2>Sebelum survei, cek dulu di HomeWise</h2>
          <span className="banner__pil">Ringkasan lokasi gratis selamanya</span>
          <p>Hemat waktu dan ongkos survei. Fokuskan tenaga Anda pada properti yang memang layak dipertimbangkan.</p>
          <Tombol ke="/daftar" varian="lime" ukuran="besar" ikonKanan={LuArrowRight}>
            Buat akun gratis
          </Tombol>
        </div>
        <IlustrasiRumah className="banner__rumah" />
        <div className="banner__catatan">
          <LuShieldCheck aria-hidden="true" />
          HomeWise bukan marketplace dan bukan pengganti inspeksi profesional.
        </div>
      </div>
    </section>
  );
}

export default function Beranda() {
  useJudul();
  return (
    <TataLetakPublik>
      <Hero />
      <div className="sumber-data">
        <div className="wadah sumber-data__isi">
          <span className="teks-kecil teks-redup">Dibangun di atas data terbuka resmi</span>
          <strong>InaRISK BNPB</strong>
          <strong>DEMNAS BIG</strong>
          <strong>OpenStreetMap</strong>
          <strong>AHSP PUPR</strong>
        </div>
      </div>
      <Fitur />
      <AnalisisTujuan />
      <CaraKerja />
      <Segmen3 />
      <Laporan />
      <Banner />
    </TataLetakPublik>
  );
}
