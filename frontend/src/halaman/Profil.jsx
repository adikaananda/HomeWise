import { useState } from "react";
import { LuKeyRound, LuLogOut, LuSave } from "react-icons/lu";
import { KepalaHalaman } from "../komponen/tata-letak/Aplikasi";
import { Isian, Kartu, Lencana, Tombol } from "../komponen/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { tanggal } from "../lib/format";
import { useJudul } from "../lib/hooks";
import { useNotifikasi } from "../lib/notifikasi";
import { useRouter } from "../lib/router";

const LABEL_PERAN = { pencari: "Property seeker", analis: "Property analyst", admin: "Admin HomeWise" };

function FormProfil() {
  const { pengguna, muatUlang } = useAuth();
  const beriTahu = useNotifikasi();
  const [form, setForm] = useState({ nama: pengguna.nama, telepon: pengguna.telepon || "", perusahaan: pengguna.perusahaan || "" });
  const [galat, setGalat] = useState({});
  const [proses, setProses] = useState(false);

  const simpan = async (e) => {
    e.preventDefault();
    setGalat({});
    setProses(true);
    try {
      await api.patch("/auth/saya", { nama: form.nama.trim(), telepon: form.telepon.trim() || null, perusahaan: form.perusahaan.trim() || null });
      await muatUlang();
      beriTahu("Profil disimpan.");
    } catch (err) {
      setGalat(err.detail || {});
      beriTahu(err.message, "galat");
    } finally {
      setProses(false);
    }
  };

  return (
    <Kartu judul="Data diri" sub="Nomor WhatsApp dipakai analis untuk mengatur jadwal inspeksi.">
      <form className="tumpuk" onSubmit={simpan} noValidate>
        <Isian label="Nama lengkap" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} galat={galat.nama} autoComplete="name" />
        <Isian label="Email" value={pengguna.email} disabled bantuan="Email tidak dapat diubah." />
        <Isian label="Nomor WhatsApp" type="tel" value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })} galat={galat.telepon} autoComplete="tel" />
        <Isian
          label="Perusahaan"
          value={form.perusahaan}
          onChange={(e) => setForm({ ...form, perusahaan: e.target.value })}
          bantuan="Opsional, untuk pelaku usaha atau mitra."
          autoComplete="organization"
        />
        <div>
          <Tombol type="submit" ikon={LuSave} memuat={proses}>
            Simpan profil
          </Tombol>
        </div>
      </form>
    </Kartu>
  );
}

function FormSandi() {
  const beriTahu = useNotifikasi();
  const [form, setForm] = useState({ sandi_lama: "", sandi_baru: "", ulang: "" });
  const [galat, setGalat] = useState({});
  const [proses, setProses] = useState(false);

  const simpan = async (e) => {
    e.preventDefault();
    const g = {};
    if (form.sandi_baru.length < 8) g.sandi_baru = "Minimal 8 karakter.";
    if (form.sandi_baru !== form.ulang) g.ulang = "Kata sandi baru tidak sama.";
    setGalat(g);
    if (Object.keys(g).length) return;
    setProses(true);
    try {
      await api.post("/auth/ganti-sandi", { sandi_lama: form.sandi_lama, sandi_baru: form.sandi_baru });
      setForm({ sandi_lama: "", sandi_baru: "", ulang: "" });
      beriTahu("Kata sandi berhasil diubah.");
    } catch (err) {
      setGalat(err.detail || {});
      beriTahu(err.message, "galat");
    } finally {
      setProses(false);
    }
  };

  const ubah = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Kartu judul="Keamanan akun">
      <form className="tumpuk" onSubmit={simpan} noValidate>
        <Isian label="Kata sandi saat ini" type="password" autoComplete="current-password" value={form.sandi_lama} onChange={ubah("sandi_lama")} galat={galat.sandi_lama} />
        <Isian label="Kata sandi baru" type="password" autoComplete="new-password" value={form.sandi_baru} onChange={ubah("sandi_baru")} galat={galat.sandi_baru} />
        <Isian label="Ulangi kata sandi baru" type="password" autoComplete="new-password" value={form.ulang} onChange={ubah("ulang")} galat={galat.ulang} />
        <div>
          <Tombol type="submit" varian="sekunder" ikon={LuKeyRound} memuat={proses}>
            Ubah kata sandi
          </Tombol>
        </div>
      </form>
    </Kartu>
  );
}

export default function Profil() {
  useJudul("Profil");
  const { pengguna, keluar } = useAuth();
  const { navigasi } = useRouter();

  return (
    <>
      <KepalaHalaman
        judul="Profil"
        deskripsi={
          <span className="baris" style={{ gap: 8, flexWrap: "wrap" }}>
            <Lencana>{LABEL_PERAN[pengguna.peran]}</Lencana>
            <span>Bergabung {tanggal(pengguna.dibuat)}</span>
            {pengguna.peran === "pencari" && <span>{pengguna.kredit_laporan} kredit laporan</span>}
          </span>
        }
        aksi={
          <Tombol
            varian="bahaya"
            ikon={LuLogOut}
            onClick={() => {
              keluar();
              navigasi("/");
            }}
          >
            Keluar
          </Tombol>
        }
      />
      <div className="kisi-2" style={{ alignItems: "start", maxWidth: 980 }}>
        <FormProfil />
        <FormSandi />
      </div>
    </>
  );
}
