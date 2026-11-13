import { useState } from "react";
import { LuArrowRight } from "react-icons/lu";
import { IlustrasiRumah } from "../../komponen/ilustrasi/Ilustrasi";
import { Logo } from "../../komponen/tata-letak/Logo";
import { Isian, Pemberitahuan, Tombol } from "../../komponen/ui";
import { BERANDA_PERAN, useAuth } from "../../lib/auth";
import { useJudul } from "../../lib/hooks";
import { Alihkan, Tautan, useRouter } from "../../lib/router";

const AKUN_DEMO = [
  { peran: "Property seeker", email: "demo@homewise.id", sandi: "demo12345" },
  { peran: "Property analyst", email: "analis@homewise.id", sandi: "analis12345" },
  { peran: "Admin HomeWise", email: "admin@homewise.id", sandi: "admin12345" },
];

function Kerangka({ judul, deskripsi, children }) {
  return (
    <div className="halaman-auth">
      <main className="halaman-auth__panel" id="konten">
        <Tautan ke="/" aria-label="Kembali ke beranda">
          <Logo />
        </Tautan>
        <div>
          <h1 style={{ fontSize: "var(--teks-2xl)" }}>{judul}</h1>
          <p className="teks-redup" style={{ marginTop: 6 }}>
            {deskripsi}
          </p>
        </div>
        {children}
      </main>
      <aside className="halaman-auth__sisi" aria-hidden="true">
        <Logo terang />
        <h2>Keputusan properti yang lebih tenang dimulai dari data.</h2>
        <p>Risiko lingkungan, fasilitas sekitar, kondisi bangunan, dan estimasi renovasi dalam satu tempat.</p>
        <IlustrasiRumah className="ilustrasi-sisi" />
      </aside>
    </div>
  );
}

function useTujuanSetelahMasuk() {
  const { query } = useRouter();
  const kembali = query.get("kembali");
  return (pengguna) => (kembali && kembali.startsWith("/") ? kembali : BERANDA_PERAN[pengguna.peran]);
}

export function Masuk() {
  useJudul("Masuk");
  const { pengguna, masuk } = useAuth();
  const { navigasi } = useRouter();
  const tujuanSetelah = useTujuanSetelahMasuk();
  const [form, setForm] = useState({ email: "", sandi: "" });
  const [galat, setGalat] = useState("");
  const [proses, setProses] = useState(false);

  if (pengguna) return <Alihkan ke={BERANDA_PERAN[pengguna.peran]} />;

  const kirim = async (e) => {
    e.preventDefault();
    setGalat("");
    setProses(true);
    try {
      const hasil = await masuk(form.email, form.sandi);
      navigasi(tujuanSetelah(hasil), { ganti: true });
    } catch (err) {
      setGalat(err.message);
      setProses(false);
    }
  };

  return (
    <Kerangka judul="Masuk ke HomeWise" deskripsi="Lanjutkan analisis properti yang sudah Anda simpan.">
      <form className="tumpuk" onSubmit={kirim} noValidate>
        {galat && <Pemberitahuan nada="bahaya">{galat}</Pemberitahuan>}
        <Isian label="Email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Isian label="Kata sandi" type="password" autoComplete="current-password" required value={form.sandi} onChange={(e) => setForm({ ...form, sandi: e.target.value })} />
        <Tombol type="submit" ukuran="besar" penuh memuat={proses} ikonKanan={LuArrowRight}>
          Masuk
        </Tombol>
      </form>
      <div className="tumpuk" style={{ gap: 10 }}>
        <span className="teks-mini teks-redup tebal">Akun demo untuk penjurian</span>
        <div className="akun-demo">
          {AKUN_DEMO.map((a) => (
            <button key={a.email} type="button" onClick={() => setForm({ email: a.email, sandi: a.sandi })}>
              <span>
                <strong>{a.peran}</strong>
                <br />
                <span className="teks-redup teks-mini">{a.email}</span>
              </span>
              <span className="teks-mini teks-redup">Isi otomatis</span>
            </button>
          ))}
        </div>
      </div>
      <p className="teks-kecil teks-redup">
        Belum punya akun? <Tautan ke="/daftar">Daftar gratis</Tautan>
      </p>
    </Kerangka>
  );
}

export function Daftar() {
  useJudul("Daftar");
  const { pengguna, daftar } = useAuth();
  const { navigasi } = useRouter();
  const [form, setForm] = useState({ nama: "", email: "", telepon: "", sandi: "" });
  const [galat, setGalat] = useState({});
  const [pesan, setPesan] = useState("");
  const [proses, setProses] = useState(false);

  if (pengguna) return <Alihkan ke={BERANDA_PERAN[pengguna.peran]} />;

  const ubah = (kunci) => (e) => setForm({ ...form, [kunci]: e.target.value });

  const validasi = () => {
    const g = {};
    if (form.nama.trim().length < 2) g.nama = "Isi nama lengkap Anda.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) g.email = "Format email belum benar.";
    if (form.sandi.length < 8) g.sandi = "Kata sandi minimal 8 karakter.";
    setGalat(g);
    return Object.keys(g).length === 0;
  };

  const kirim = async (e) => {
    e.preventDefault();
    setPesan("");
    if (!validasi()) return;
    setProses(true);
    try {
      await daftar({ ...form, telepon: form.telepon || null });
      navigasi("/app/properti/baru", { ganti: true });
    } catch (err) {
      setPesan(err.message);
      setGalat(err.detail || {});
      setProses(false);
    }
  };

  return (
    <Kerangka judul="Buat akun gratis" deskripsi="Ringkasan lokasi selalu gratis. Bayar hanya saat butuh laporan lengkap.">
      <form className="tumpuk" onSubmit={kirim} noValidate>
        {pesan && <Pemberitahuan nada="bahaya">{pesan}</Pemberitahuan>}
        <Isian label="Nama lengkap" autoComplete="name" value={form.nama} onChange={ubah("nama")} galat={galat.nama} />
        <Isian label="Email" type="email" autoComplete="email" value={form.email} onChange={ubah("email")} galat={galat.email} />
        <Isian label="Nomor WhatsApp" type="tel" autoComplete="tel" bantuan="Opsional, untuk koordinasi inspeksi." value={form.telepon} onChange={ubah("telepon")} />
        <Isian label="Kata sandi" type="password" autoComplete="new-password" value={form.sandi} onChange={ubah("sandi")} galat={galat.sandi} bantuan="Minimal 8 karakter." />
        <Tombol type="submit" ukuran="besar" penuh memuat={proses}>
          Buat akun
        </Tombol>
      </form>
      <p className="teks-kecil teks-redup">
        Sudah punya akun? <Tautan ke="/masuk">Masuk</Tautan>
      </p>
    </Kerangka>
  );
}
