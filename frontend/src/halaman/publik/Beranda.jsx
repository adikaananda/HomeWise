import { useEffect, useMemo, useState } from "react";
import {
  LuArrowRight,
  LuBriefcase,
  LuBuilding2,
  LuBus,
  LuCamera,
  LuChevronRight,
  LuGraduationCap,
  LuHospital,
  LuShoppingBag,
  LuX,
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
import { IlustrasiBiaya, IlustrasiPemindai, IlustrasiPeta, IlustrasiRumah } from "../../komponen/ilustrasi/Ilustrasi";
import { TataLetakPublik, useGulirTertunda } from "../../komponen/tata-letak/Publik";
import { BatangSkor, CincinSkor, GambarDenganCadangan, LencanaLevel, Segmen, Tombol } from "../../komponen/ui";
import { GAMBAR } from "../../data/gambar";
import { api } from "../../lib/api";
import { jarak } from "../../lib/format";
import { cariAlamat, LOKASI_CONTOH } from "../../lib/geokode";
import { useJudul } from "../../lib/hooks";
import { useKonfigurasi } from "../../lib/konfigurasi";
import { KURANGI_GERAK, Muncul, useMiring, useTerlihat } from "../../lib/gerak";
import { Maskot } from "../../komponen/Maskot";
import { Rumah3D, TITIK_INFO } from "../../komponen/rumah3d/Rumah3D";

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
          <span className="hero__eyebrow">1 Laporan Lengkap gratis untuk pengguna baru</span>
          <h1 className="hero__judul">Dari cek rumah sampai siap menghitung KPR.</h1>
          <p className="hero__deskripsi">
            Nilai lokasi, deteksi kerusakan, hitung renovasi, lalu simulasikan pembiayaan secara transparan. Coba gratis untuk properti pertama.
          </p>
          <div className="baris" style={{ flexWrap: "wrap" }}>
            <Tombol ke="/daftar" ukuran="besar" ikonKanan={LuArrowRight}>Mulai analisis gratis</Tombol>
            <a href="#pembiayaan" className="tombol tombol--sekunder tombol--besar"><LuLandmark aria-hidden="true" />Lihat alur KPR</a>
          </div>

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

const FASILITAS_DEMO = [
  { ikon: LuHospital, label: "Rumah sakit", jarak: "1,2 km" },
  { ikon: LuGraduationCap, label: "Sekolah", jarak: "450 m" },
  { ikon: LuBus, label: "Halte", jarak: "210 m" },
  { ikon: LuShoppingBag, label: "Pasar", jarak: "800 m" },
];

function IlustrasiFasilitas({ className = "" }) {
  return (
    <div className={`ilus-fasilitas ${className}`} aria-hidden="true">
      <div className="ilus-fasilitas__radar">
        <span />
        <span />
        <span />
      </div>
      <img className="ilus-fasilitas__maskot maskot--melayang" src="/aset/alur/alur2-440.webp" alt="" width="200" height="200" loading="lazy" decoding="async" />
      <ul className="ilus-fasilitas__chip">
        {FASILITAS_DEMO.map((f, i) => (
          <li key={f.label} style={{ "--urut": i }}>
            <f.ikon />
            <span>{f.label}</span>
            <strong>{f.jarak}</strong>
          </li>
        ))}
      </ul>
    </div>
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
    ilustrasi: IlustrasiFasilitas,
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
        <div className="kepala-maskot">
          <Muncul className="bagian__kepala">
            <span className="eyebrow-gradasi">Fitur</span>
            <h2>Empat analisis yang biasanya Anda cari di tempat berbeda</h2>
            <p className="teks-redup">Setiap angka di HomeWise punya sumber dan metode. AI menjelaskan temuannya, bukan mengarang data.</p>
          </Muncul>
          <Muncul jeda={0.1} className="kepala-maskot__gambar">
            <Maskot pose="mencari" ukuran={130} />
          </Muncul>
        </div>
        <div className="bento">
          {FITUR.map((f, i) => (
            <Muncul as="article" jeda={i * 0.08} key={f.judul} className={`bento__item kartu-angkat ${f.besar ? "bento__item--besar" : ""}`}>
              <div className="bento__ikon">
                <f.ikon aria-hidden="true" />
              </div>
              <h3>{f.judul}</h3>
              <p className="teks-redup">{f.teks}</p>
              {f.ilustrasi && <f.ilustrasi className="bento__ilustrasi" />}
            </Muncul>
          ))}
        </div>
      </div>
    </section>
  );
}

function Jelajah3D() {
  const [aktif, setAktif] = useState(null);
  const info = TITIK_INFO.find((t) => t.kode === aktif);
  return (
    <section className="bagian jelajah3d" id="jelajah">
      <div className="wadah jelajah3d__isi">
        <Muncul className="jelajah3d__teks">
          <span className="eyebrow-gradasi">Interaktif</span>
          <h2>Lihat apa saja yang diperiksa HomeWise</h2>
          <p className="teks-redup">Putar rumahnya, lalu ketuk titik biru. Setiap bagian rumah punya analisis sendiri, dari lokasi sampai lantai.</p>
          <ul className="jelajah3d__daftar" role="list">
            {TITIK_INFO.map((t, i) => (
              <li key={t.kode} style={{ "--urut": i }}>
                <button type="button" className={aktif === t.kode ? "aktif" : ""} onClick={() => setAktif(aktif === t.kode ? null : t.kode)} aria-pressed={aktif === t.kode}>
                  <span className="jelajah3d__ikon">
                    <t.ikon aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{t.judul}</strong>
                    <small>{t.teks}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Muncul>
        <Muncul jeda={0.1} arah="skala" className="jelajah3d__panggung">
          <Rumah3D aktif={aktif} onPilih={setAktif} />
          {info && (
            <div className="jelajah3d__kartu" key={info.kode}>
              <info.ikon aria-hidden="true" />
              <div>
                <strong>{info.judul}</strong>
                <p className="teks-kecil">{info.teks}</p>
              </div>
              <button type="button" onClick={() => setAktif(null)} aria-label="Tutup">
                <LuX aria-hidden="true" />
              </button>
            </div>
          )}
        </Muncul>
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
        <Muncul className="tujuan__teks">
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
        </Muncul>
        <Muncul jeda={0.1} className="tujuan__panel">
          <Maskot pose="ide" ukuran={92} className="tujuan__maskot" />
          <p className="tebal">{terpilih?.label}</p>
          <p className="teks-kecil teks-redup" style={{ marginBottom: 20 }}>
            {terpilih?.deskripsi}
          </p>
          <div className="tumpuk" style={{ gap: 14 }}>
            {bobot.map(([kode, nilai]) => (
              <BatangSkor key={kode} label={indikator[kode]} skor={nilai * 100} keterangan="% bobot" warna="var(--gradasi-merek)" />
            ))}
          </div>
        </Muncul>
      </div>
    </section>
  );
}

const LANGKAH = [
  { aset: "alur1", judul: "Property Discovery", teks: "Masukkan alamat, koordinat, atau tautan iklan properti." },
  { aset: "alur2", judul: "Quick Location Check", teks: "Risiko lingkungan, akses, fasilitas, dan karakter kawasan dalam hitungan detik." },
  { aset: "alur3", judul: "Pilih Tujuan", teks: "Rumah tinggal, investasi, restoran, kantor, atau ruko. Bobot penilaian ikut menyesuaikan." },
  { aset: "alur4", judul: "Kelayakan Lokasi", teks: "Ringkasan kelayakan awal, risiko, dan data yang perlu dicek saat survei." },
  { aset: "alur5", judul: "Analisis Bangunan AI", teks: "Unggah foto survei untuk mendeteksi indikasi kerusakan visual." },
  { aset: "alur9", judul: "Estimasi Renovasi", teks: "Kebutuhan pekerjaan, material, dan biaya dari temuan visual, siap untuk simulasi KPR." },
  { aset: "alur8", judul: "Total Investasi", teks: "Harga penawaran ditambah biaya renovasi dan transaksi dalam satu angka." },
  { aset: "alur7", judul: "Laporan Terpadu", teks: "Laporan PDF dengan rekomendasi pemeriksaan lanjutan." },
  { aset: "alur6", judul: "Keputusan Akhir", teks: "Bandingkan, jadwalkan inspeksi, negosiasi, atau cari alternatif." },
];

function KartuLangkah({ l, i, aktif, onPilih }) {
  const ref = useMiring(6);
  return (
    <li
      ref={ref}
      className={`jalur__kartu ${aktif ? "jalur__kartu--aktif" : ""}`}
      data-posisi={i}
      onPointerEnter={() => onPilih(i)}
      onFocus={() => onPilih(i)}
      tabIndex={0}
    >
      <span className="jalur__nomor">{String(i + 1).padStart(2, "0")}</span>
      <h3>{l.judul}</h3>
      <div className="jalur__aset">
        <span className="jalur__cahaya" aria-hidden="true" />
        <img
          src={`/aset/alur/${l.aset}-220.webp`}
          srcSet={`/aset/alur/${l.aset}-220.webp 220w, /aset/alur/${l.aset}-440.webp 440w`}
          sizes="160px"
          width="160"
          height="160"
          alt=""
          loading="lazy"
          decoding="async"
        />
      </div>
      <p>{l.teks}</p>
      <span className="jalur__panah" aria-hidden="true">
        <LuChevronRight />
      </span>
    </li>
  );
}

function CaraKerja() {
  const [ref, terlihat] = useTerlihat();
  const [aktif, setAktif] = useState(0);
  const [jeda, setJeda] = useState(false);

  useEffect(() => {
    if (!terlihat || jeda || KURANGI_GERAK) return undefined;
    const id = setInterval(() => setAktif((a) => (a + 1) % LANGKAH.length), 2600);
    return () => clearInterval(id);
  }, [terlihat, jeda]);

  return (
    <section className="bagian cara-kerja" id="cara-kerja">
      <div className="cara-kerja__latar" aria-hidden="true" />
      <div className="wadah">
        <Muncul className="bagian__kepala bagian__kepala--tengah">
          <span className="eyebrow-gradasi">Cara kerja</span>
          <h2>Alur penggunaan HomeWise</h2>
          <p className="teks-redup">Sembilan langkah dari iklan properti sampai keputusan akhir. Howy menemani di setiap tahap.</p>
        </Muncul>

        <div className="jalur__progres" aria-hidden="true">
          <span style={{ width: `${((aktif + 1) / LANGKAH.length) * 100}%` }} />
        </div>

        <ol
          ref={ref}
          className={`jalur ${terlihat ? "jalur--terlihat" : ""}`}
          onPointerEnter={() => setJeda(true)}
          onPointerLeave={() => setJeda(false)}
          aria-label="Alur penggunaan HomeWise"
        >
          {LANGKAH.map((l, i) => (
            <KartuLangkah key={l.judul} l={l} i={i} aktif={i === aktif} onPilih={setAktif} />
          ))}
          <li className="jalur__mulai" aria-hidden={false}>
            <Maskot pose="menyapa" ukuran={120} />
            <strong>Siap mulai?</strong>
            <span className="teks-kecil">Cek lokasi pertama Anda gratis.</span>
            <Tombol ke="/daftar" ukuran="kecil" ikonKanan={LuArrowRight}>
              Mulai sekarang
            </Tombol>
          </li>
        </ol>
      </div>
    </section>
  );
}

const TIM = [
  { nama: "Adika", foto: "adika", peran: "CEO", lengkap: "Chief Executive Officer", pemimpin: true },
  { nama: "Divandra", foto: "divandra", peran: "CPO", lengkap: "Chief Product Officer" },
  { nama: "Disa", foto: "disa", peran: "CMO", lengkap: "Chief Marketing Officer" },
  { nama: "Candra", foto: "candra", peran: "CTO", lengkap: "Chief Technology Officer" },
  { nama: "Gustu", foto: "gustu", peran: "COO", lengkap: "Chief Operating Officer" },
];

function KartuTim({ t, i }) {
  const ref = useMiring(10);
  return (
    <Muncul as="li" jeda={i * 0.08} className="tim__kartu-wadah">
      <div ref={ref} className={`tim__kartu ${t.pemimpin ? "tim__kartu--pemimpin" : ""}`}>
        {t.pemimpin && <span className="tim__pemimpin">Leader</span>}
        <div className="tim__foto">
          <img
            src={`/aset/tim/${t.foto}-320.webp`}
            srcSet={`/aset/tim/${t.foto}-320.webp 320w, /aset/tim/${t.foto}-640.webp 640w`}
            sizes="180px"
            width="180"
            height="180"
            alt={`${t.nama}, ${t.lengkap} HomeWise`}
            loading="lazy"
            decoding="async"
          />
        </div>
        <strong className="tim__nama">{t.nama}</strong>
        <span className="tim__peran">{t.peran}</span>
        <span className="tim__lengkap">{t.lengkap}</span>
      </div>
    </Muncul>
  );
}

function Tim() {
  return (
    <section className="bagian tim" id="tim">
      <div className="wadah">
        <div className="tim__kepala">
          <Muncul className="bagian__kepala">
            <span className="eyebrow-gradasi">Tentang kami</span>
            <h2>Tim di balik HomeWise</h2>
            <p className="teks-redup">
              Tim Rumaholic membangun HomeWise agar setiap keluarga Indonesia bisa membeli rumah dengan data, bukan tebakan.
            </p>
          </Muncul>
          <Muncul jeda={0.15} className="tim__maskot">
            <Maskot pose="onboarding" ukuran={150} />
          </Muncul>
        </div>
        <ul className="tim__daftar">
          {TIM.map((t, i) => (
            <KartuTim key={t.nama} t={t} i={i} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function Pembiayaan() {
  return (
    <section className="bagian bagian--biru" id="pembiayaan">
      <div className="wadah pembiayaan-promo">
        <div>
          <span className="hero__eyebrow">Simulasi pembiayaan indikatif</span>
          <h2>Harga rumah dan renovasi terlihat dalam satu skenario</h2>
          <p className="teks-redup">Pilih rumah utama, bandingkan program bunga BTN dari asumsi PRD, lalu lihat angsuran, penghasilan minimum, dan biaya awal sebelum meminta konsultasi.</p>
          <Tombol ke="/daftar" ikonKanan={LuArrowRight}>Coba dengan properti Anda</Tombol>
        </div>
        <div className="pembiayaan-promo__panel">
          <span><LuLandmark aria-hidden="true" /></span>
          <div><small>Contoh plafon</small><strong>Rp680 juta</strong></div>
          <div><small>Estimasi angsuran</small><strong>Rp4,0 juta / bulan</strong></div>
          <p><LuShieldCheck aria-hidden="true" />Indikatif, bukan penawaran atau persetujuan kredit bank.</p>
        </div>
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
    aset: "alur6",
  },
  {
    ikon: LuStore,
    judul: "Pelaku usaha",
    teks: "Nilai keramaian, akses jalan, dan kebutuhan renovasi bangunan untuk kafe, restoran, kantor, atau ruko.",
    gambar: GAMBAR.pelakuUsaha,
    latar: "var(--gradasi-segar)",
    aset: "alur3",
  },
  {
    ikon: LuLandmark,
    judul: "Mitra institusi",
    teks: "Agen, bank, dan perusahaan inspeksi dapat memakai laporan sebagai informasi pendukung keputusan.",
    gambar: GAMBAR.mitraInstitusi,
    latar: "linear-gradient(120deg, #0832c8, #14bace)",
    aset: "alur7",
  },
];

function Segmen3() {
  return (
    <section className="bagian bagian--putih" id="segmen">
      <div className="wadah">
        <Muncul className="bagian__kepala">
          <span className="eyebrow-gradasi">Untuk siapa</span>
          <h2>Dibuat untuk keputusan bernilai besar</h2>
          <p className="teks-redup">Satu platform untuk pembeli rumah, pelaku usaha, dan mitra yang butuh data sebelum mengambil keputusan.</p>
        </Muncul>
        <div className="kisi-3">
          {SEGMEN.map((s, i) => (
            <Muncul as="article" jeda={i * 0.1} key={s.judul} className="segmen-kartu kartu-angkat">
              <div className="segmen-kartu__gambar" style={{ background: s.latar }}>
                <GambarDenganCadangan
                  src={s.gambar.src}
                  alt={s.gambar.alt}
                  className="segmen-kartu__foto"
                  cadangan={<img src={`/aset/alur/${s.aset}-440.webp`} alt="" className="segmen-kartu__aset maskot--melayang" loading="lazy" />}
                />
                <span className="segmen-kartu__label">
                  <s.ikon aria-hidden="true" /> {s.judul}
                </span>
              </div>
              <div className="segmen-kartu__isi">
                <h3>{s.judul}</h3>
                <p className="teks-redup teks-kecil">{s.teks}</p>
              </div>
            </Muncul>
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
        <Muncul className="laporan-promo__visual">
          <span className="laporan-promo__lingkar" aria-hidden="true" />
          <img src="/aset/alur/alur7-440.webp" width="320" height="320" alt="Howy membawa laporan HomeWise" loading="lazy" decoding="async" className="maskot--melayang" />
        </Muncul>
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
        <div className="banner__adegan">
          <IlustrasiRumah className="banner__rumah" />
          <Maskot pose="sukses" ukuran={190} className="banner__maskot" />
        </div>
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
  useGulirTertunda();
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
      <Jelajah3D />
      <AnalisisTujuan />
      <CaraKerja />
      <Pembiayaan />
      <Segmen3 />
      <Laporan />
      <Tim />
      <Banner />
    </TataLetakPublik>
  );
}
