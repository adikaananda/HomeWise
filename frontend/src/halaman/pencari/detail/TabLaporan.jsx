import { useState } from "react";
import { LuBadgeCheck, LuClipboardCheck, LuDownload, LuListChecks } from "react-icons/lu";
import { IlustrasiLaporan } from "../../../komponen/ilustrasi/Ilustrasi";
import { usePembayaran } from "../../../komponen/Pembayaran";
import { Kartu, Lencana, Tombol } from "../../../komponen/ui";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { tanggal } from "../../../lib/format";
import { useNotifikasi } from "../../../lib/notifikasi";

const STATUS_INSPEKSI = {
  menunggu: { teks: "Menunggu analis", nada: "peringatan" },
  dijadwalkan: { teks: "Dijadwalkan", nada: undefined },
  diperiksa: { teks: "Sedang diperiksa", nada: undefined },
  tervalidasi: { teks: "Tervalidasi", nada: "sukses" },
};

export function TombolUnduhLaporan({ properti, varian, ukuran }) {
  const beriTahu = useNotifikasi();
  const [proses, setProses] = useState(false);
  const unduh = async () => {
    setProses(true);
    try {
      await api.unduh(`/properti/${properti.id}/laporan.pdf`, `laporan-homewise-${properti.id}.pdf`);
    } catch (e) {
      beriTahu(e.message, "galat");
    } finally {
      setProses(false);
    }
  };
  return (
    <Tombol ikon={LuDownload} onClick={unduh} memuat={proses} varian={varian} ukuran={ukuran}>
      Unduh PDF
    </Tombol>
  );
}

export function TabLaporan({ detail, muatUlang }) {
  const { pengguna } = useAuth();
  const { properti, rekomendasi, inspeksi } = detail;
  const { bayar, proses, modal } = usePembayaran({ onLunas: muatUlang });
  const status = inspeksi && STATUS_INSPEKSI[inspeksi.status];

  return (
    <div className="laporan-kisi">
      <div className="tumpuk" style={{ gap: 20 }}>
        <Kartu className="kartu-unduh">
          <IlustrasiLaporan className="kartu-unduh__ilustrasi" />
          <div className="tumpuk" style={{ gap: 10 }}>
            <h3>Property Intelligence Report</h3>
            <p className="teks-redup teks-kecil">
              Lokasi, risiko lingkungan, fasilitas, kondisi bangunan, estimasi renovasi, dan total investasi dalam satu PDF siap dibagikan.
            </p>
            <div>
              <TombolUnduhLaporan properti={properti} />
            </div>
          </div>
        </Kartu>
        <Kartu judul="Rekomendasi pemeriksaan lanjutan">
          <ul className="daftar-poin">
            {rekomendasi.map((r) => (
              <li key={r}>
                <LuListChecks color="var(--biru)" aria-hidden="true" />
                {r}
              </li>
            ))}
          </ul>
        </Kartu>
      </div>

      <Kartu judul="Inspeksi profesional">
        {inspeksi ? (
          <div className="tumpuk" style={{ gap: 12 }}>
            <div className="baris" style={{ gap: 8 }}>
              {inspeksi.status === "tervalidasi" ? (
                <LuBadgeCheck style={{ width: 28, height: 28, color: "var(--hijau)" }} aria-hidden="true" />
              ) : (
                <LuClipboardCheck style={{ width: 28, height: 28, color: "var(--biru)" }} aria-hidden="true" />
              )}
              <Lencana nada={status.nada}>{status.teks}</Lencana>
            </div>
            <dl className="daftar-definisi">
              <dt>Analis</dt>
              <dd>{inspeksi.analis_nama || "Belum ditugaskan"}</dd>
              <dt>Jadwal</dt>
              <dd>{inspeksi.jadwal ? tanggal(inspeksi.jadwal, true) : "Menunggu konfirmasi"}</dd>
              {inspeksi.divalidasi_pada && (
                <>
                  <dt>Divalidasi</dt>
                  <dd>{tanggal(inspeksi.divalidasi_pada, true)}</dd>
                </>
              )}
            </dl>
            {inspeksi.catatan && inspeksi.status === "tervalidasi" && (
              <blockquote className="kutipan">
                {inspeksi.catatan}
              </blockquote>
            )}
          </div>
        ) : (
          <div className="tumpuk" style={{ gap: 12 }}>
            <p className="teks-redup teks-kecil">
              Analis HomeWise datang ke lokasi, memeriksa struktur dan instalasi, lalu mengonfirmasi atau mengoreksi temuan AI. Laporan Anda akan
              berstatus tervalidasi.
            </p>
            {pengguna?.peran === "pencari" && (
              <Tombol onClick={() => bayar("inspeksi_profesional", properti.id)} memuat={proses} penuh>
                Pesan inspeksi Rp750.000
              </Tombol>
            )}
          </div>
        )}
      </Kartu>
      {modal}
    </div>
  );
}
