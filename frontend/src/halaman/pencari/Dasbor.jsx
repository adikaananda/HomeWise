import { useState } from "react";
import {
  LuArrowRight,
  LuBadgeCheck,
  LuBuilding2,
  LuChevronDown,
  LuChevronRight,
  LuClipboardCheck,
  LuCompass,
  LuFileText,
  LuHouse,
  LuLock,
  LuMapPin,
  LuPlus,
  LuRoute,
  LuShieldAlert,
  LuSparkles,
  LuStar,
  LuTrendingDown,
  LuTrendingUp,
  LuWallet,
} from "react-icons/lu";
import { KartuProperti } from "../../komponen/KartuProperti";
import { Maskot, MaskotPesan, poseRisiko } from "../../komponen/Maskot";
import { Peta } from "../../komponen/Peta";
import { CincinSkor, GalatMuat, Kartu, Lencana, Tombol } from "../../komponen/ui";
import { api } from "../../lib/api";
import { kapital, rupiah, rupiahRingkas, tanggal } from "../../lib/format";
import { AngkaHidup, Muncul } from "../../lib/gerak";
import { useData, useJudul } from "../../lib/hooks";
import { labelTujuan, useKonfigurasi } from "../../lib/konfigurasi";
import { Tautan } from "../../lib/router";
import { NADA_STATUS_BAYAR } from "./Pembayaran";

const NADA_LEVEL = { rendah: "sukses", sedang: "peringatan", tinggi: "bahaya" };
const LEBAR_LEVEL = { rendah: 28, sedang: 62, tinggi: 92 };

/* ---------------- Kerangka memuat ---------------- */
function KerangkaDasbor() {
  return (
    <div className="dasbor-x" aria-busy="true" aria-label="Memuat dasbor">
      <div className="kerangka-x kerangka-x--kokpit" />
      <div className="kerangka-x kerangka-x--baris" />
      <div className="dasbor-x__papan">
        <div className="kerangka-x kerangka-x--besar" />
        <div className="kerangka-x kerangka-x--besar" />
      </div>
      <div className="dasbor-x__memuat">
        <Maskot pose="memuat" ukuran={96} gerak="lompat" prioritas />
        <span className="teks-kecil teks-redup">Howy sedang menyiapkan analisis Anda…</span>
      </div>
    </div>
  );
}

/* ---------------- Kokpit sapaan ---------------- */
function pesanHowy(fokus, jumlah) {
  if (!jumlah) return { pose: "onboarding", teks: "Mulai dari satu alamat. Saya akan menilai lokasinya dalam hitungan detik." };
  if (!fokus?.lokasi) return { pose: "menganalisis", teks: "Saya masih menunggu data lokasi properti Anda." };
  if (fokus.lokasi.risiko_terburuk === "tinggi")
    return { pose: "peringatan", teks: `Hati-hati, ada risiko tinggi di sekitar ${fokus.properti.nama}. Cek bagian risiko sebelum survei.` };
  if (fokus.tahap.kode === "kandidat") return { pose: "menganalisis", teks: "Lokasi sudah dinilai. Langkah berikutnya: foto kondisi bangunan saat survei." };
  if (fokus.tahap.kode === "tervalidasi") return { pose: "laporan_selesai", teks: "Laporan sudah tervalidasi analis. Saatnya bandingkan dan putuskan." };
  if (fokus.biaya) return { pose: "investasi", teks: "Biaya renovasi dan total investasi sudah siap. Gunakan untuk menawar harga." };
  return { pose: "sukses", teks: "Analisis berjalan baik. Lanjutkan ke langkah berikutnya di bawah." };
}

function Kokpit({ pengguna, statistik, fokus }) {
  const namaDepan = pengguna.nama.split(" ")[0];
  const howy = pesanHowy(fokus, statistik.total_properti);
  const angka = [
    { label: "Properti dianalisis", nilai: statistik.total_properti, ikon: LuHouse },
    { label: "Rata-rata skor lokasi", nilai: statistik.rata_skor_lokasi, ikon: LuCompass, desimal: true },
    { label: "Laporan lengkap", nilai: statistik.laporan_terbuka, ikon: LuFileText },
    { label: "Kredit laporan", nilai: pengguna.kredit_laporan, ikon: LuBadgeCheck },
  ];
  return (
    <section className="kokpit">
      <div className="kokpit__cahaya" aria-hidden="true" />
      <div className="kokpit__sapa">
        <span className="kokpit__eyebrow">Property intelligence</span>
        <h1>Halo, {namaDepan}</h1>
        <div className="kokpit__gelembung">
          <p>{howy.teks}</p>
        </div>
        <div className="kokpit__aksi">
          <Tombol ke="/app/properti/baru" ikon={LuPlus} varian="lime">
            Analisis properti
          </Tombol>
          {fokus && (
            <Tombol ke={`/app/properti/${fokus.properti.id}`} varian="sekunder" ikonKanan={LuArrowRight} className="kokpit__tombol-kaca">
              Buka analisis terakhir
            </Tombol>
          )}
        </div>
      </div>
      <div className="kokpit__maskot">
        <Maskot key={howy.pose} pose={howy.pose} ukuran={200} prioritas />
      </div>
      <ul className="kokpit__angka">
        {angka.map((a, i) => (
          <Muncul as="li" key={a.label} jeda={0.1 + i * 0.07}>
            <a.ikon aria-hidden="true" />
            <AngkaHidup nilai={a.nilai} format={(n) => (a.desimal ? n.toFixed(1).replace(".", ",") : Math.round(n))} />
            <span>{a.label}</span>
          </Muncul>
        ))}
      </ul>
    </section>
  );
}

/* ---------------- Pemilih properti fokus ---------------- */
function PemilihFokus({ properti, fokusId, onPilih, memuat }) {
  if (properti.length < 2) return null;
  return (
    <div className="pemilih-fokus" role="tablist" aria-label="Pilih properti untuk dianalisis">
      {properti.map((p) => (
        <button
          key={p.id}
          role="tab"
          aria-selected={p.id === fokusId}
          className="pemilih-fokus__item"
          onClick={() => onPilih(p.id)}
          disabled={memuat}
        >
          {p.pilihan_utama ? <LuStar aria-hidden="true" /> : <LuHouse aria-hidden="true" />}
          <span className="pemilih-fokus__nama">{p.nama}</span>
          {p.skor_lokasi != null && <span className="pemilih-fokus__skor">{Math.round(p.skor_lokasi)}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Alur keputusan ---------------- */
function AlurKeputusan({ fokus }) {
  const premiumBuka = fokus.akses_premium;
  const langkah = [
    { label: "Properti", ikon: LuHouse, status: "selesai" },
    { label: "Lokasi", ikon: LuMapPin, status: fokus.lokasi ? "selesai" : "aktif" },
    { label: "Kondisi", ikon: LuBuilding2, status: fokus.bangunan ? "selesai" : premiumBuka ? "aktif" : "terkunci" },
    { label: "Risiko", ikon: LuShieldAlert, status: fokus.lokasi ? "selesai" : "menunggu" },
    { label: "Analisis", ikon: LuSparkles, status: fokus.biaya ? "selesai" : fokus.bangunan ? "aktif" : premiumBuka ? "menunggu" : "terkunci" },
    { label: "Keputusan", ikon: LuBadgeCheck, status: fokus.tahap.kode === "tervalidasi" || fokus.properti.pilihan_utama ? "selesai" : fokus.biaya ? "aktif" : "menunggu" },
  ];
  const selesai = langkah.filter((l) => l.status === "selesai").length;
  return (
    <Muncul className="alur-x">
      <div className="alur-x__jalur" aria-hidden="true">
        <span style={{ width: `${((selesai - 1) / (langkah.length - 1)) * 100}%` }} />
      </div>
      <ol>
        {langkah.map((l, i) => (
          <li key={l.label} data-status={l.status} style={{ "--urut": i }}>
            <span className="alur-x__ikon">{l.status === "terkunci" ? <LuLock aria-hidden="true" /> : <l.ikon aria-hidden="true" />}</span>
            <span className="alur-x__label">{l.label}</span>
          </li>
        ))}
      </ol>
    </Muncul>
  );
}

/* ---------------- Kartu properti fokus + peta ---------------- */
function PanelProperti({ fokus }) {
  const konfigurasi = useKonfigurasi();
  const { properti, lokasi } = fokus;
  return (
    <Muncul as="article" className="panel-x panel-properti">
      <header className="panel-properti__kepala">
        <div>
          <span className="lencana lencana--netral">{labelTujuan(konfigurasi, properti.tujuan)}</span>
          <h2>{properti.nama}</h2>
          <p className="teks-kecil teks-redup">
            <LuMapPin aria-hidden="true" /> {properti.alamat}
          </p>
        </div>
        <div className="panel-properti__harga">
          <span className="teks-mini teks-redup">Harga penawaran</span>
          <strong className="angka">{rupiahRingkas(properti.harga_penawaran)}</strong>
          <span className="teks-mini teks-redup">
            {properti.luas_tanah ? `LT ${properti.luas_tanah} m²` : ""} {properti.luas_bangunan ? `· LB ${properti.luas_bangunan} m²` : ""}
          </span>
        </div>
      </header>
      {properti.lat != null && (
        <div className="panel-properti__peta">
          <Peta
            pusat={{ lat: properti.lat, lng: properti.lng }}
            fasilitas={lokasi?.fasilitas}
            kategoriFasilitas={konfigurasi.kategori_fasilitas}
            risikoBanjir={lokasi?.risiko?.banjir?.level}
            tinggi={300}
            zoom={15}
          />
          {lokasi && (
            <div className="panel-properti__info-peta">
              <span>
                <strong className="angka">{lokasi.jumlah_fasilitas}</strong> fasilitas terdeteksi
              </span>
              {lokasi.aksesibilitas && (
                <span>
                  <LuRoute aria-hidden="true" /> {lokasi.aksesibilitas.jarak_jalan_utama_m} m ke jalan utama
                </span>
              )}
            </div>
          )}
        </div>
      )}
      <footer className="panel-properti__aksi">
        <Tombol ke={`/app/properti/${properti.id}`} ikonKanan={LuArrowRight}>
          Lihat analisis lengkap
        </Tombol>
        <Tombol ke={`/app/kpr/${properti.id}`} varian="sekunder" ikon={LuWallet}>
          Simulasi KPR
        </Tombol>
      </footer>
    </Muncul>
  );
}

/* ---------------- Skor ---------------- */
function rataIndikator(indikator, kode) {
  const daftar = indikator.filter((i) => kode.includes(i.kode)).map((i) => i.skor);
  return daftar.length ? daftar.reduce((a, b) => a + b, 0) / daftar.length : null;
}

function PanelSkor({ fokus }) {
  const { lokasi, bangunan } = fokus;
  const indikator = lokasi?.indikator || [];
  const skor = [
    { label: "Skor lokasi", nilai: lokasi?.skor, sub: lokasi?.kategori },
    { label: "Kondisi bangunan", nilai: bangunan?.skor_kondisi, sub: bangunan ? `${bangunan.jumlah_temuan} temuan` : fokus.akses_premium ? "Belum ada foto" : "Laporan lengkap" },
    { label: "Aksesibilitas", nilai: rataIndikator(indikator, ["aksesibilitas"]), sub: lokasi?.aksesibilitas?.kelas_jalan_depan || "Jalan sekitar" },
    { label: "Fasilitas", nilai: rataIndikator(indikator, ["kesehatan", "pendidikan", "ekonomi", "transportasi"]), sub: "Kesehatan, sekolah, belanja" },
  ];
  return (
    <Muncul as="section" jeda={0.08} className="panel-x panel-skor">
      <h3 className="panel-x__judul">Skor utama</h3>
      <div className="panel-skor__kisi">
        {skor.map((s) => (
          <div key={s.label} className={`panel-skor__item ${s.nilai == null ? "panel-skor__item--kosong" : ""}`}>
            {s.nilai == null ? (
              <span className="panel-skor__kunci">
                <LuLock aria-hidden="true" />
              </span>
            ) : (
              <CincinSkor skor={s.nilai} ukuran={92} tebal={9} label={s.label} />
            )}
            <strong className="teks-kecil">{s.label}</strong>
            <span className="teks-mini teks-redup">{s.sub || "–"}</span>
          </div>
        ))}
      </div>
    </Muncul>
  );
}

function PanelRisiko({ fokus }) {
  const risiko = fokus.lokasi?.risiko || {};
  const terburuk = fokus.lokasi?.risiko_terburuk;
  const label = { banjir: "Banjir", longsor: "Tanah longsor", gempa: "Gempa bumi" };
  if (!fokus.lokasi) return null;
  return (
    <Muncul as="section" jeda={0.14} className={`panel-x panel-risiko panel-risiko--${terburuk || "rendah"}`}>
      <div className="panel-risiko__kepala">
        <div>
          <h3 className="panel-x__judul">Risiko lokasi</h3>
          <p className="teks-mini teks-redup">Indeks bahaya wilayah dari data BNPB</p>
        </div>
        <Maskot pose={poseRisiko(terburuk)} ukuran={84} gerak="goyang" />
      </div>
      <ul className="panel-risiko__daftar">
        {Object.entries(risiko).map(([kode, r]) => (
          <li key={kode}>
            <div className="baris-antara">
              <span className="teks-kecil">{label[kode] || kapital(kode)}</span>
              <Lencana nada={NADA_LEVEL[r.level]}>{kapital(r.level)}</Lencana>
            </div>
            <div className="batang-x">
              <span className={`batang-x__isi batang-x__isi--${r.level}`} style={{ "--lebar": `${Math.max(LEBAR_LEVEL[r.level] || 10, Math.round((r.skor || 0) * 100))}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Muncul>
  );
}

/* ---------------- AI Insight dengan tab beranimasi ---------------- */
function InsightAI({ fokus }) {
  const tab = [
    fokus.lokasi?.ringkasan && { kode: "lokasi", label: "Lokasi", teks: fokus.lokasi.ringkasan },
    fokus.bangunan?.ringkasan && { kode: "bangunan", label: "Bangunan", teks: fokus.bangunan.ringkasan },
    fokus.investasi?.ringkasan && { kode: "investasi", label: "Investasi", teks: fokus.investasi.ringkasan },
  ].filter(Boolean);
  const [aktif, setAktif] = useState(0);
  if (!tab.length) return null;
  const indeks = Math.min(aktif, tab.length - 1);
  return (
    <Muncul as="section" className="insight-x">
      <div className="insight-x__isi">
        <span className="insight-x__eyebrow">
          <LuSparkles aria-hidden="true" /> AI Insight
        </span>
        <div className="insight-x__tab" role="tablist" style={{ "--jumlah": tab.length, "--aktif": indeks }}>
          <span className="insight-x__penanda" aria-hidden="true" />
          {tab.map((t, i) => (
            <button key={t.kode} role="tab" aria-selected={i === indeks} onClick={() => setAktif(i)}>
              {t.label}
            </button>
          ))}
        </div>
        <p key={tab[indeks].kode} className="insight-x__teks">
          {tab[indeks].teks}
        </p>
      </div>
      <Maskot pose="ide" ukuran={150} className="insight-x__maskot" />
    </Muncul>
  );
}

/* ---------------- Faktor positif & risiko ---------------- */
function DaftarFaktor({ judul, ikon: Ikon, nada, item, kosong }) {
  return (
    <Muncul as="section" className={`panel-x faktor-x faktor-x--${nada}`}>
      <h3 className="panel-x__judul">
        <Ikon aria-hidden="true" /> {judul}
      </h3>
      {item.length ? (
        <ul>
          {item.map((f, i) => (
            <li key={f.judul + i} style={{ "--urut": i }}>
              <strong className="teks-kecil">{f.judul}</strong>
              {f.detail && <span className="teks-mini teks-redup">{f.detail}</span>}
              {f.persen != null && <span className={`faktor-x__persen faktor-x__persen--${nada}`}>{f.persen > 0 ? "+" : ""}{f.persen.toLocaleString("id-ID")}%</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="teks-kecil teks-redup">{kosong}</p>
      )}
    </Muncul>
  );
}

function PanelFaktor({ fokus }) {
  const positif = [
    ...(fokus.lokasi?.pendukung || []).map((f) => ({ judul: f.judul, detail: f.detail })),
    ...(fokus.nilai?.positif || []).slice(0, 3).map((f) => ({ judul: f.label, detail: "Menaikkan nilai properti", persen: f.persen })),
  ];
  const negatif = [
    ...(fokus.lokasi?.risiko_lain || []).map((f) => ({ judul: f.judul, detail: f.detail })),
    ...(fokus.nilai?.negatif || []).map((f) => ({ judul: f.label, detail: "Menurunkan nilai properti", persen: f.persen })),
  ];
  return (
    <div className="faktor-x__kisi">
      <DaftarFaktor judul="Faktor positif" ikon={LuTrendingUp} nada="positif" item={positif} kosong="Belum ada faktor positif yang menonjol." />
      <DaftarFaktor judul="Faktor risiko" ikon={LuTrendingDown} nada="negatif" item={negatif} kosong="Tidak ada faktor risiko yang menonjol." />
    </div>
  );
}

/* ---------------- Investasi ---------------- */
function PanelInvestasi({ fokus }) {
  const { investasi, biaya, properti } = fokus;
  if (!fokus.akses_premium || !investasi) {
    return (
      <Muncul as="section" className="panel-x panel-investasi panel-investasi--kunci">
        <MaskotPesan
          pose="investasi"
          ukuran={120}
          judul="Buka estimasi renovasi & total investasi"
          aksi={
            <Tombol ke={`/app/properti/${properti.id}?tab=biaya`} ukuran="kecil" ikonKanan={LuArrowRight}>
              Buka laporan lengkap
            </Tombol>
          }
        >
          Lihat biaya perbaikan per prioritas, daftar material, dan total uang yang perlu disiapkan sebelum menawar.
        </MaskotPesan>
      </Muncul>
    );
  }
  const komponen = [
    { label: "Harga penawaran", nilai: investasi.harga_penawaran, kelas: "harga" },
    { label: "Estimasi renovasi", nilai: investasi.renovasi, kelas: "renovasi" },
    { label: "Biaya transaksi", nilai: investasi.biaya_transaksi, kelas: "transaksi" },
  ];
  const maksPrioritas = Math.max(1, ...(biaya?.per_prioritas || []).map((p) => p.jumlah));
  return (
    <Muncul as="section" className="panel-x panel-investasi">
      <div className="panel-investasi__kepala">
        <div>
          <h3 className="panel-x__judul">Total investasi awal</h3>
          <strong className="panel-investasi__total">
            <AngkaHidup nilai={investasi.total} format={(n) => rupiah(Math.round(n))} />
          </strong>
          <span className="teks-mini teks-redup">Bila hanya perbaikan mendesak: {rupiahRingkas(investasi.total_minimum)}</span>
        </div>
        <Maskot pose="investasi" ukuran={96} />
      </div>
      <div className="tumpuk-x" role="img" aria-label="Komposisi total investasi">
        {komponen.map((k) => (
          <span key={k.kelas} className={`tumpuk-x__bagian tumpuk-x__bagian--${k.kelas}`} style={{ "--lebar": `${Math.max(1.5, (k.nilai / investasi.total) * 100)}%` }} />
        ))}
      </div>
      <ul className="panel-investasi__legenda">
        {komponen.map((k) => (
          <li key={k.kelas}>
            <i className={`tumpuk-x__titik tumpuk-x__bagian--${k.kelas}`} />
            <span className="teks-mini teks-redup">{k.label}</span>
            <strong className="teks-kecil angka">{rupiahRingkas(k.nilai)}</strong>
          </li>
        ))}
      </ul>
      {biaya?.per_prioritas?.length > 0 && (
        <div className="panel-investasi__renovasi">
          <span className="teks-mini tebal">Renovasi per prioritas</span>
          {biaya.per_prioritas.map((p) => (
            <div key={p.kode} className="renovasi-x">
              <span className="teks-mini">{p.label}</span>
              <div className="batang-x">
                <span className={`batang-x__isi batang-x__isi--${p.kode}`} style={{ "--lebar": `${(p.jumlah / maksPrioritas) * 100}%` }} />
              </div>
              <span className="teks-mini angka tebal">{rupiahRingkas(p.jumlah)}</span>
            </div>
          ))}
        </div>
      )}
    </Muncul>
  );
}

/* ---------------- Langkah berikutnya ---------------- */
function LangkahBerikutnya({ fokus }) {
  const [buka, setBuka] = useState(false);
  const rekom = fokus.rekomendasi || [];
  const tujuan =
    fokus.tahap.kode === "kandidat"
      ? { ke: `/app/properti/${fokus.properti.id}/survei`, label: "Mulai mode survei", ikon: LuClipboardCheck }
      : { ke: `/app/properti/${fokus.properti.id}?tab=laporan`, label: "Lihat laporan", ikon: LuFileText };
  return (
    <Muncul as="section" className="panel-x langkah-x">
      <span className="langkah-x__label">Langkah berikutnya · {fokus.tahap.label}</span>
      <p className="langkah-x__teks">{fokus.tahap.langkah}</p>
      <Tombol ke={tujuan.ke} ikon={tujuan.ikon} ikonKanan={LuArrowRight}>
        {tujuan.label}
      </Tombol>
      {rekom.length > 0 && (
        <div className={`langkah-x__rekom ${buka ? "langkah-x__rekom--buka" : ""}`}>
          <button className="langkah-x__toggle" onClick={() => setBuka((b) => !b)} aria-expanded={buka}>
            {rekom.length} hal yang perlu dicek saat survei <LuChevronDown aria-hidden="true" />
          </button>
          <div className="langkah-x__isi">
            <ol>
              {rekom.map((r) => (
                <li key={r} className="teks-kecil">
                  {r}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
      <Maskot pose={fokus.tahap.kode === "kandidat" ? "mencari" : fokus.tahap.kode === "tervalidasi" ? "laporan_selesai" : "menganalisis"} ukuran={110} className="langkah-x__maskot" />
    </Muncul>
  );
}

/* ---------------- Halaman ---------------- */
export default function Dasbor() {
  useJudul("Dasbor");
  const konfigurasi = useKonfigurasi();
  const [fokusId, setFokusId] = useState(null);
  const { data, galat, memuat, muatUlang } = useData(() => api.get(`/dasbor${fokusId ? `?fokus=${fokusId}` : ""}`), [fokusId]);

  if (memuat && !data) return <KerangkaDasbor />;
  if (galat)
    return (
      <div style={{ maxWidth: 640, margin: "40px auto" }}>
        <MaskotPesan pose="galat" judul="Dasbor belum bisa dimuat" className="maskot-pesan--tengah" aksi={<Tombol onClick={() => muatUlang()}>Coba lagi</Tombol>}>
          {galat.message}
        </MaskotPesan>
      </div>
    );
  if (!data) return <GalatMuat galat={galat} onCobaLagi={muatUlang} />;

  const { pengguna, statistik, properti_terbaru: properti, pembayaran_terbaru: pembayaran, fokus } = data;
  const namaPaket = (kode) => konfigurasi.paket.find((p) => p.kode === kode)?.nama || kode;

  return (
    <div className="dasbor-x">
      <Kokpit pengguna={pengguna} statistik={statistik} fokus={fokus} />

      {fokus ? (
        <>
          <div className="dasbor-x__judul-bagian">
            <div>
              <h2>Analisis properti</h2>
              <p className="teks-kecil teks-redup">Properti → Lokasi → Kondisi → Risiko → Analisis → Keputusan</p>
            </div>
            <PemilihFokus properti={properti} fokusId={fokus.properti.id} onPilih={setFokusId} memuat={memuat} />
          </div>

          <div className={`dasbor-x__fokus ${memuat ? "dasbor-x__fokus--memuat" : ""}`} key={fokus.properti.id}>
            <AlurKeputusan fokus={fokus} />
            <div className="dasbor-x__papan">
              <PanelProperti fokus={fokus} />
              <div className="dasbor-x__kolom">
                <PanelSkor fokus={fokus} />
                <PanelRisiko fokus={fokus} />
              </div>
            </div>
            <InsightAI fokus={fokus} />
            <PanelFaktor fokus={fokus} />
            <div className="dasbor-x__papan dasbor-x__papan--rata">
              <PanelInvestasi fokus={fokus} />
              <LangkahBerikutnya fokus={fokus} />
            </div>
          </div>
        </>
      ) : (
        <MaskotPesan
          pose="mencari"
          ukuran={160}
          className="maskot-pesan--tengah"
          judul="Belum ada properti yang dianalisis"
          aksi={
            <Tombol ke="/app/properti/baru" ikon={LuPlus}>
              Analisis properti pertama
            </Tombol>
          }
        >
          Tempel alamat, koordinat, atau tautan iklan. Howy menilai lokasinya gratis dalam hitungan detik.
        </MaskotPesan>
      )}

      {properti.length > 0 && (
        <section className="dasbor-x__portofolio">
          <div className="dasbor-x__judul-bagian">
            <div>
              <h2>Properti Anda</h2>
              <p className="teks-kecil teks-redup">{properti.filter((p) => p.tersimpan).length} tersimpan dari {statistik.total_properti} properti</p>
            </div>
            <Tombol ke="/app/properti" varian="hantu" ukuran="kecil" ikonKanan={LuChevronRight}>
              Lihat semua
            </Tombol>
          </div>
          <div className="kisi-properti">
            {properti.map((p, i) => (
              <Muncul key={p.id} jeda={i * 0.06}>
                <KartuProperti properti={p} />
              </Muncul>
            ))}
          </div>
        </section>
      )}

      <div className="dasbor-x__papan dasbor-x__papan--bawah">
        <Kartu judul="Transaksi terakhir" aksi={<Tombol ke="/app/pembayaran" varian="hantu" ukuran="kecil">Riwayat</Tombol>}>
          {pembayaran.length ? (
            <ul className="daftar-sederhana">
              {pembayaran.map((b) => (
                <li key={b.order_id}>
                  <div>
                    <strong className="teks-kecil">{namaPaket(b.paket)}</strong>
                    <span className="teks-mini teks-redup">{tanggal(b.dibuat)}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className="angka teks-kecil tebal">{rupiah(b.jumlah)}</span>
                    <Lencana nada={NADA_STATUS_BAYAR[b.status]}>{kapital(b.status)}</Lencana>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="teks-kecil teks-redup">Belum ada transaksi.</p>
          )}
        </Kartu>
        <section className="promo-x">
          <div>
            <h3>Butuh kepastian sebelum menawar?</h3>
            <p className="teks-kecil">Analis HomeWise memeriksa langsung dan memvalidasi temuan AI pada laporan Anda.</p>
            <Tombol ke="/harga" varian="lime" ukuran="kecil">
              Lihat paket inspeksi
            </Tombol>
          </div>
          <Maskot pose="renovasi" ukuran={130} />
        </section>
      </div>
      <p className="dasbor-x__catatan teks-mini teks-redup">
        <Tautan ke="/peta-harga">Lihat Peta Harga Tanah</Tautan> untuk membandingkan harga kawasan.
      </p>
    </div>
  );
}
