import { useState } from "react";
import {
  LuArrowLeft,
  LuArrowRight,
  LuBriefcase,
  LuCoffee,
  LuCrosshair,
  LuHouse,
  LuKeyRound,
  LuLocateFixed,
  LuSearch,
  LuStore,
  LuUtensils,
} from "react-icons/lu";
import { IsianFaktorNilai, faktorKeForm, formKeFaktor } from "../../komponen/IsianFaktorNilai";
import { Peta } from "../../komponen/Peta";
import { KepalaHalaman } from "../../komponen/tata-letak/Aplikasi";
import { AreaTeks, Isian, Kartu, Pemberitahuan, Pilihan, Tombol } from "../../komponen/ui";
import { api } from "../../lib/api";
import { angka } from "../../lib/format";
import { bacaKoordinat, cariAlamat } from "../../lib/geokode";
import { useJudul } from "../../lib/hooks";
import { useKonfigurasi } from "../../lib/konfigurasi";
import { useNotifikasi } from "../../lib/notifikasi";
import { useRouter } from "../../lib/router";

const IKON_TUJUAN = {
  rumah_tinggal: LuHouse,
  investasi_sewa: LuKeyRound,
  restoran: LuUtensils,
  kafe: LuCoffee,
  kantor: LuBriefcase,
  ruko: LuStore,
};

const JENIS_PROPERTI = [
  { nilai: "rumah", label: "Rumah" },
  { nilai: "apartemen", label: "Apartemen" },
  { nilai: "ruko", label: "Ruko" },
  { nilai: "gedung", label: "Gedung / kantor" },
  { nilai: "tanah_bangunan", label: "Tanah dan bangunan" },
];

const LANGKAH = ["Lokasi", "Data properti", "Tujuan pembelian"];

const AWAL = {
  alamat: "",
  lat: null,
  lng: null,
  sumber_iklan: "",
  nama: "",
  jenis_properti: "rumah",
  harga_penawaran: "",
  luas_tanah: "",
  luas_bangunan: "",
  tahun_bangun: "",
  jumlah_lantai: "1",
  kamar_tidur: "",
  kamar_mandi: "",
  lebar_depan_m: "",
  kapasitas_parkir_mobil: "",
  kondisi_penjual: "belum_tahu",
  tahun_renovasi_terakhir: "",
  status_harga: "belum_tahu",
  faktor: faktorKeForm({}),
  catatan: "",
  tujuan: "rumah_tinggal",
};

const KONDISI_PENJUAL = [
  { nilai: "belum_tahu", label: "Belum tahu" },
  { nilai: "siap_huni", label: "Siap huni" },
  { nilai: "renovasi_ringan", label: "Perlu renovasi ringan" },
  { nilai: "renovasi_berat", label: "Perlu renovasi berat" },
];

const STATUS_HARGA = [
  { nilai: "belum_tahu", label: "Belum tahu" },
  { nilai: "nego", label: "Masih bisa ditawar" },
  { nilai: "nett", label: "Harga pas (nett)" },
];

function jutaPerM2(harga, luas) {
  if (!harga || !luas) return null;
  return `Rp${(harga / luas / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt/m²`;
}

function LangkahLokasi({ form, setForm, galat }) {
  const [kueri, setKueri] = useState("");
  const [hasil, setHasil] = useState([]);
  const [mencari, setMencari] = useState(false);
  const [pesan, setPesan] = useState("");
  const [melacak, setMelacak] = useState(false);

  const lokasiSaya = () => {
    if (!navigator.geolocation) {
      setPesan("Perangkat ini tidak mendukung deteksi lokasi.");
      return;
    }
    setPesan("");
    setMelacak(true);
    navigator.geolocation.getCurrentPosition(
      (posisi) => {
        setMelacak(false);
        setForm((f) => ({ ...f, lat: Number(posisi.coords.latitude.toFixed(6)), lng: Number(posisi.coords.longitude.toFixed(6)) }));
      },
      () => {
        setMelacak(false);
        setPesan("Lokasi tidak bisa dibaca. Izinkan akses lokasi di browser, atau cari alamat secara manual.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const cari = async (e) => {
    e.preventDefault();
    if (kueri.trim().length < 3) return;
    setPesan("");
    setMencari(true);
    try {
      const daftar = await cariAlamat(kueri);
      setHasil(daftar);
      if (!daftar.length) setPesan("Alamat tidak ditemukan. Coba nama jalan dan kota, atau klik titik di peta.");
      if (daftar.length === 1 && bacaKoordinat(kueri)) pilih(daftar[0]);
    } catch (err) {
      setPesan(err.message);
    } finally {
      setMencari(false);
    }
  };

  const pilih = (lokasi) => {
    setForm((f) => ({ ...f, lat: lokasi.lat, lng: lokasi.lng, alamat: f.alamat || lokasi.label }));
    setHasil([]);
  };

  return (
    <div className="tumpuk">
      <form className="baris" onSubmit={cari} style={{ alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <Isian
            label="Cari alamat atau tempel koordinat"
            placeholder="Contoh: Jl. Cempaka Wangi, Bintaro atau -6.278, 106.715"
            value={kueri}
            onChange={(e) => setKueri(e.target.value)}
          />
        </div>
        <Tombol type="submit" varian="sekunder" ikon={LuSearch} memuat={mencari}>
          Cari
        </Tombol>
      </form>
      {pesan && <p className="isian__galat">{pesan}</p>}
      {hasil.length > 0 && (
        <ul className="hasil-cari" role="listbox" aria-label="Hasil pencarian alamat">
          {hasil.map((h) => (
            <li key={`${h.lat}${h.lng}`}>
              <button type="button" onClick={() => pilih(h)}>
                {h.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Peta
        pusat={form.lat != null ? { lat: form.lat, lng: form.lng } : null}
        tinggi={340}
        zoom={16}
        onPilih={(titik) => setForm((f) => ({ ...f, lat: Number(titik.lat.toFixed(6)), lng: Number(titik.lng.toFixed(6)) }))}
      />
      <div className="baris-antara">
        <span className="teks-kecil teks-redup baris" style={{ gap: 6 }}>
          <LuCrosshair aria-hidden="true" style={{ width: 16, height: 16 }} />
          {form.lat != null ? `Titik terpilih: ${form.lat}, ${form.lng}` : "Ketuk peta untuk menandai titik properti."}
        </span>
        <Tombol varian="sekunder" ukuran="kecil" ikon={LuLocateFixed} onClick={lokasiSaya} memuat={melacak}>
          Saya sedang di lokasi
        </Tombol>
      </div>
      {galat.lat && <p className="isian__galat">{galat.lat}</p>}
      <Isian
        label="Alamat lengkap"
        value={form.alamat}
        onChange={(e) => setForm({ ...form, alamat: e.target.value })}
        galat={galat.alamat}
        placeholder="Nama jalan, kelurahan, kecamatan, kota"
      />
      <Isian
        label="Tautan iklan"
        type="url"
        value={form.sumber_iklan}
        onChange={(e) => setForm({ ...form, sumber_iklan: e.target.value })}
        bantuan="Opsional. Instagram, Facebook Marketplace, atau situs properti."
        placeholder="https://"
      />
    </div>
  );
}

function LangkahData({ form, setForm, galat }) {
  const ubah = (kunci) => (e) => setForm({ ...form, [kunci]: e.target.value });
  const harga = Number(form.harga_penawaran) || 0;
  const perTanah = jutaPerM2(harga, Number(form.luas_tanah));
  const perBangunan = jutaPerM2(harga, Number(form.luas_bangunan));
  return (
    <div className="tumpuk">
      <Isian label="Nama properti" value={form.nama} onChange={ubah("nama")} galat={galat.nama} placeholder="Contoh: Rumah 2 lantai dekat stasiun" />

      <fieldset className="kelompok-isian">
        <legend>Harga</legend>
        <div className="kisi-2">
          <Isian
            label="Harga yang ditawarkan penjual"
            awalan="Rp"
            inputMode="numeric"
            value={form.harga_penawaran ? angka(form.harga_penawaran) : ""}
            onChange={(e) => setForm({ ...form, harga_penawaran: e.target.value.replace(/\D/g, "").slice(0, 13) })}
            galat={galat.harga_penawaran}
            bantuan="Harga di iklan atau dari agen, sebelum ditawar."
          />
          <Pilihan label="Status harga" value={form.status_harga} onChange={ubah("status_harga")} opsi={STATUS_HARGA} />
        </div>
        <div className="info-harga">
          <strong className="teks-kecil">Harga ini dipakai untuk:</strong>
          <ul className="teks-mini">
            <li>Total investasi awal: harga + estimasi renovasi + biaya transaksi (BPHTB, notaris).</li>
            <li>Membandingkan dengan harga tanah pasar di kawasan sekitar (Peta Harga Tanah).</li>
            <li>Simulasi cicilan KPR BTN dan dasar menawar harga.</li>
          </ul>
          {(perTanah || perBangunan) && (
            <p className="teks-mini">
              Setara {perTanah ? `${perTanah} tanah` : ""}
              {perTanah && perBangunan ? " · " : ""}
              {perBangunan ? `${perBangunan} bangunan` : ""}.
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className="kelompok-isian">
        <legend>Ukuran & bangunan</legend>
        <div className="kisi-2">
          <Pilihan label="Jenis properti" value={form.jenis_properti} onChange={ubah("jenis_properti")} opsi={JENIS_PROPERTI} />
          <Isian label="Luas tanah (m²)" type="number" min="1" value={form.luas_tanah} onChange={ubah("luas_tanah")} bantuan="Sesuai sertifikat. Untuk dibandingkan dengan harga tanah pasar." />
          <Isian label="Luas bangunan (m²)" type="number" min="1" value={form.luas_bangunan} onChange={ubah("luas_bangunan")} bantuan="Total semua lantai. Untuk harga per m² bangunan." />
          <Isian label="Lebar muka / depan (m)" type="number" min="1" step="0.1" value={form.lebar_depan_m} onChange={ubah("lebar_depan_m")} bantuan="Lebar sisi yang menghadap jalan. Penting untuk usaha." />
          <Isian label="Jumlah lantai" type="number" min="1" max="100" value={form.jumlah_lantai} onChange={ubah("jumlah_lantai")} />
          <Isian label="Kamar tidur" type="number" min="0" max="50" value={form.kamar_tidur} onChange={ubah("kamar_tidur")} />
          <Isian label="Kamar mandi" type="number" min="0" max="50" value={form.kamar_mandi} onChange={ubah("kamar_mandi")} />
          <Isian label="Parkir mobil di lahan" type="number" min="0" max="50" value={form.kapasitas_parkir_mobil} onChange={ubah("kapasitas_parkir_mobil")} bantuan="Jumlah mobil yang muat di carport/garasi." />
        </div>
      </fieldset>

      <fieldset className="kelompok-isian">
        <legend>Umur & kondisi</legend>
        <div className="kisi-2">
          <Isian label="Tahun dibangun" type="number" min="1900" max="2100" value={form.tahun_bangun} onChange={ubah("tahun_bangun")} galat={galat.tahun_bangun} />
          <Isian label="Renovasi terakhir (tahun)" type="number" min="1900" max="2100" value={form.tahun_renovasi_terakhir} onChange={ubah("tahun_renovasi_terakhir")} galat={galat.tahun_renovasi_terakhir} bantuan="Kosongkan bila belum pernah." />
          <Pilihan label="Kondisi menurut penjual" value={form.kondisi_penjual} onChange={ubah("kondisi_penjual")} opsi={KONDISI_PENJUAL} bantuan="Dibandingkan dengan temuan AI untuk bahan menawar." />
        </div>
      </fieldset>

      <details className="faktor-opsional">
        <summary>
          <strong className="teks-kecil">Faktor penilaian tanah, lingkungan & bangunan</strong>
          <span className="teks-mini teks-redup">
            Opsional. Dipakai di tab Faktor nilai untuk menghitung apa saja yang menaikkan dan menurunkan nilai rumah. Bisa dilengkapi nanti.
          </span>
        </summary>
        <IsianFaktorNilai nilai={form.faktor} onUbah={(faktor) => setForm({ ...form, faktor })} ringkas />
      </details>

      <AreaTeks label="Catatan" value={form.catatan} onChange={ubah("catatan")} placeholder="Misal: info dari agen, kondisi yang disebutkan penjual" />
    </div>
  );
}

function LangkahTujuan({ form, setForm }) {
  const { tujuan } = useKonfigurasi();
  return (
    <div className="tumpuk">
      <p className="teks-redup teks-kecil">Bobot penilaian lokasi menyesuaikan pilihan ini. Anda tetap bisa mengubahnya nanti.</p>
      <div className="pilihan-kartu" role="radiogroup" aria-label="Tujuan pembelian">
        {tujuan.map((t) => {
          const Ikon = IKON_TUJUAN[t.kode] || LuHouse;
          return (
            <label key={t.kode}>
              <input type="radio" name="tujuan" value={t.kode} checked={form.tujuan === t.kode} onChange={() => setForm({ ...form, tujuan: t.kode })} />
              <span className="pilihan-kartu__ikon">
                <Ikon aria-hidden="true" />
              </span>
              <span className="pilihan-kartu__isi tebal">{t.label}</span>
              <span className="teks-mini teks-redup">{t.deskripsi}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function validasiLangkah(langkah, form) {
  const g = {};
  if (langkah === 0) {
    if (form.lat == null) g.lat = "Tentukan titik properti di peta atau lewat pencarian.";
    if (form.alamat.trim().length < 5) g.alamat = "Isi alamat properti minimal 5 karakter.";
  }
  if (langkah === 1) {
    if (form.nama.trim().length < 3) g.nama = "Beri nama properti minimal 3 karakter.";
    if (!form.harga_penawaran) g.harga_penawaran = "Isi harga penawaran.";
    if (form.tahun_bangun && (form.tahun_bangun < 1900 || form.tahun_bangun > 2100)) g.tahun_bangun = "Tahun tidak valid.";
    if (form.tahun_renovasi_terakhir && form.tahun_bangun && Number(form.tahun_renovasi_terakhir) < Number(form.tahun_bangun))
      g.tahun_renovasi_terakhir = "Tahun renovasi tidak boleh sebelum tahun dibangun.";
  }
  return g;
}

export default function PropertiBaru() {
  useJudul("Analisis properti baru");
  const { navigasi } = useRouter();
  const beriTahu = useNotifikasi();
  const [langkah, setLangkah] = useState(0);
  const [form, setForm] = useState(AWAL);
  const [galat, setGalat] = useState({});
  const [proses, setProses] = useState(false);

  const lanjut = () => {
    const g = validasiLangkah(langkah, form);
    setGalat(g);
    if (!Object.keys(g).length) setLangkah(langkah + 1);
  };

  const kirim = async () => {
    setProses(true);
    const angkaAtauNull = (v) => (v === "" || v == null ? null : Number(v));
    try {
      const {
        kamar_tidur, kamar_mandi, lebar_depan_m, kapasitas_parkir_mobil, kondisi_penjual, tahun_renovasi_terakhir, status_harga, faktor, ...dasar
      } = form;
      const isianFaktor = Object.fromEntries(Object.entries(formKeFaktor(faktor)).filter(([, v]) => v !== null));
      const hasil = await api.post("/properti", {
        ...dasar,
        spesifikasi: {
          kamar_tidur: angkaAtauNull(kamar_tidur),
          kamar_mandi: angkaAtauNull(kamar_mandi),
          lebar_depan_m: angkaAtauNull(lebar_depan_m),
          kapasitas_parkir_mobil: angkaAtauNull(kapasitas_parkir_mobil),
          kondisi_penjual,
          tahun_renovasi_terakhir: angkaAtauNull(tahun_renovasi_terakhir),
          status_harga,
          ...isianFaktor,
        },
        nama: form.nama.trim(),
        alamat: form.alamat.trim(),
        harga_penawaran: Number(form.harga_penawaran),
        luas_tanah: angkaAtauNull(form.luas_tanah),
        luas_bangunan: angkaAtauNull(form.luas_bangunan),
        tahun_bangun: angkaAtauNull(form.tahun_bangun),
        jumlah_lantai: angkaAtauNull(form.jumlah_lantai) || 1,
        sumber_iklan: form.sumber_iklan || null,
        catatan: form.catatan || null,
      });
      beriTahu("Analisis lokasi selesai.");
      navigasi(`/app/properti/${hasil.properti.id}`, { ganti: true });
    } catch (e) {
      setProses(false);
      setGalat(e.detail || {});
      beriTahu(e.message, "galat");
    }
  };

  const Konten = [LangkahLokasi, LangkahData, LangkahTujuan][langkah];

  return (
    <>
      <KepalaHalaman
        judul="Analisis properti baru"
        deskripsi="Tiga langkah singkat. Ringkasan kelayakan lokasi langsung tersedia gratis."
        kembali={{ ke: "/app/properti", label: "Properti saya" }}
      />
      <Kartu style={{ maxWidth: 860 }}>
        <ol className="langkah" style={{ marginBottom: 28 }}>
          {LANGKAH.map((l, i) => (
            <li key={l} data-status={i < langkah ? "selesai" : i === langkah ? "aktif" : undefined} aria-current={i === langkah ? "step" : undefined}>
              {l}
            </li>
          ))}
        </ol>
        {Object.keys(galat).length > 0 && langkah === 2 && (
          <div style={{ marginBottom: 16 }}>
            <Pemberitahuan nada="bahaya">Ada data yang belum valid. Periksa kembali langkah sebelumnya.</Pemberitahuan>
          </div>
        )}
        <Konten form={form} setForm={setForm} galat={galat} />
        <div className="baris-antara" style={{ marginTop: 28 }}>
          <Tombol varian="hantu" ikon={LuArrowLeft} onClick={() => setLangkah(langkah - 1)} disabled={langkah === 0 || proses}>
            Kembali
          </Tombol>
          {langkah < LANGKAH.length - 1 ? (
            <Tombol ikonKanan={LuArrowRight} onClick={lanjut}>
              Lanjut
            </Tombol>
          ) : (
            <Tombol onClick={kirim} memuat={proses}>
              Analisis lokasi
            </Tombol>
          )}
        </div>
      </Kartu>
    </>
  );
}
