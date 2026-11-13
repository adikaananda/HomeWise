import { useState } from "react";
import { LuCamera, LuFileText, LuLock, LuTicket, LuWallet } from "react-icons/lu";
import { usePembayaran } from "../../../komponen/Pembayaran";
import { Kartu, Tombol } from "../../../komponen/ui";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { useNotifikasi } from "../../../lib/notifikasi";

const MANFAAT = [
  { ikon: LuCamera, teks: "Analisis foto kondisi bangunan dengan AI" },
  { ikon: LuWallet, teks: "Rincian estimasi renovasi dan total investasi" },
  { ikon: LuFileText, teks: "Laporan PDF terpadu dan rekomendasi pemeriksaan" },
];

export function PanelTerkunci({ properti, onTerbuka, judul = "Buka Laporan Lengkap" }) {
  const { pengguna, muatUlang } = useAuth();
  const beriTahu = useNotifikasi();
  const [prosesKredit, setProsesKredit] = useState(false);
  const { bayar, proses, modal } = usePembayaran({
    onLunas: async () => {
      await muatUlang();
      await onTerbuka();
    },
  });

  const pakaiKredit = async () => {
    setProsesKredit(true);
    try {
      await api.post(`/properti/${properti.id}/buka-kredit`);
      await muatUlang();
      beriTahu("Laporan lengkap terbuka dengan 1 kredit.");
      await onTerbuka();
    } catch (e) {
      beriTahu(e.message, "galat");
    } finally {
      setProsesKredit(false);
    }
  };

  if (pengguna?.peran !== "pencari") return null;

  return (
    <Kartu className="panel-terkunci">
      <div className="panel-terkunci__ikon">
        <LuLock aria-hidden="true" />
      </div>
      <h3>{judul}</h3>
      <p className="teks-redup teks-kecil" style={{ maxWidth: "48ch" }}>
        Ringkasan lokasi sudah gratis. Lanjutkan ke analisis bangunan dan biaya untuk melihat gambaran investasi yang sebenarnya.
      </p>
      <ul className="daftar-poin" style={{ marginBlock: 8 }}>
        {MANFAAT.map((m) => (
          <li key={m.teks}>
            <m.ikon color="var(--biru)" aria-hidden="true" />
            {m.teks}
          </li>
        ))}
      </ul>
      <div className="baris" style={{ flexWrap: "wrap", justifyContent: "center" }}>
        {pengguna.kredit_laporan > 0 && (
          <Tombol varian="lime" ikon={LuTicket} onClick={pakaiKredit} memuat={prosesKredit}>
            Pakai 1 kredit ({pengguna.kredit_laporan} tersisa)
          </Tombol>
        )}
        <Tombol onClick={() => bayar("laporan_tunggal", properti.id)} memuat={proses}>
          Buka seharga Rp49.000
        </Tombol>
        <Tombol varian="sekunder" onClick={() => bayar("paket_hemat")} disabled={proses}>
          Paket 5 laporan Rp199.000
        </Tombol>
      </div>
      {modal}
    </Kartu>
  );
}
