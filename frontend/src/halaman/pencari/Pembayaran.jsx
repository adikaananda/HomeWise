import { useEffect } from "react";
import { LuCircleCheck, LuCircleX, LuClock, LuReceipt, LuRefreshCw } from "react-icons/lu";
import { KepalaHalaman } from "../../komponen/tata-letak/Aplikasi";
import { GalatMuat, Kartu, KerangkaHalaman, Kosong, Lencana, Tombol } from "../../komponen/ui";
import { api } from "../../lib/api";
import { rupiah, tanggal, kapital } from "../../lib/format";
import { useAksi, useData, useJudul } from "../../lib/hooks";
import { useKonfigurasi } from "../../lib/konfigurasi";
import { useNotifikasi } from "../../lib/notifikasi";
import { Tautan } from "../../lib/router";

export const NADA_STATUS_BAYAR = { lunas: "sukses", menunggu: "peringatan", gagal: "bahaya", kedaluwarsa: "netral", dibatalkan: "netral" };

export function RiwayatPembayaran() {
  useJudul("Pembayaran");
  const { paket } = useKonfigurasi();
  const { data, galat, memuat, muatUlang } = useData(() => api.get("/pembayaran"));
  const namaPaket = (kode) => paket.find((p) => p.kode === kode)?.nama || kode;

  return (
    <>
      <KepalaHalaman judul="Pembayaran" deskripsi="Riwayat transaksi laporan, paket kredit, dan inspeksi profesional." />
      {memuat ? (
        <KerangkaHalaman />
      ) : galat ? (
        <GalatMuat galat={galat} onCobaLagi={muatUlang} />
      ) : !data.length ? (
        <Kartu>
          <Kosong ikon={LuReceipt} judul="Belum ada transaksi" aksi={<Tombol ke="/app/properti">Buka properti saya</Tombol>}>
            Buka Laporan Lengkap dari halaman detail properti untuk memulai.
          </Kosong>
        </Kartu>
      ) : (
        <div className="tabel-wadah">
          <table className="tabel">
            <thead>
              <tr>
                <th>Nomor pesanan</th>
                <th>Paket</th>
                <th>Properti</th>
                <th>Tanggal</th>
                <th className="kanan">Jumlah</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((b) => (
                <tr key={b.order_id}>
                  <td>
                    <Tautan ke={`/app/pembayaran/${b.order_id}`} className="tebal angka">
                      {b.order_id}
                    </Tautan>
                  </td>
                  <td>{namaPaket(b.paket)}</td>
                  <td className="teks-redup">{b.properti_nama || "–"}</td>
                  <td className="teks-redup">{tanggal(b.dibuat, true)}</td>
                  <td className="kanan tebal">{rupiah(b.jumlah)}</td>
                  <td>
                    <Lencana nada={NADA_STATUS_BAYAR[b.status]}>{kapital(b.status)}</Lencana>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const TAMPILAN_STATUS = {
  lunas: { ikon: LuCircleCheck, warna: "var(--hijau)", judul: "Pembayaran berhasil", teks: "Manfaat paket sudah aktif di akun Anda." },
  menunggu: { ikon: LuClock, warna: "var(--peringatan)", judul: "Menunggu pembayaran", teks: "Selesaikan pembayaran sesuai instruksi Midtrans. Status diperbarui otomatis." },
  gagal: { ikon: LuCircleX, warna: "var(--bahaya)", judul: "Pembayaran gagal", teks: "Transaksi ditolak. Silakan coba lagi dengan metode lain." },
  kedaluwarsa: { ikon: LuCircleX, warna: "var(--abu)", judul: "Transaksi kedaluwarsa", teks: "Batas waktu pembayaran sudah lewat. Buat transaksi baru." },
  dibatalkan: { ikon: LuCircleX, warna: "var(--abu)", judul: "Transaksi dibatalkan", teks: "Transaksi ini sudah dibatalkan." },
};

export function StatusPembayaran({ orderId }) {
  useJudul("Status pembayaran");
  const beriTahu = useNotifikasi();
  const [proses, jalankan] = useAksi();
  const { data, setData, galat, memuat, muatUlang } = useData(() => api.get(`/pembayaran/${orderId}`), [orderId]);

  const sinkron = () =>
    jalankan(async () => {
      try {
        setData(await api.post(`/pembayaran/${orderId}/sinkron`));
      } catch (e) {
        beriTahu(e.message, "galat");
      }
    });

  useEffect(() => {
    if (data?.status !== "menunggu" || data.mode !== "midtrans") return;
    const id = setInterval(() => api.post(`/pembayaran/${orderId}/sinkron`).then(setData).catch(() => {}), 8000);
    return () => clearInterval(id);
  }, [data?.status, data?.mode, orderId, setData]);

  if (memuat) return <KerangkaHalaman />;
  if (galat) return <GalatMuat galat={galat} onCobaLagi={muatUlang} />;

  const tampilan = TAMPILAN_STATUS[data.status];
  return (
    <>
      <KepalaHalaman judul="Status pembayaran" kembali={{ ke: "/app/pembayaran", label: "Riwayat pembayaran" }} />
      <Kartu style={{ maxWidth: 560 }}>
        <div className="tumpuk" style={{ alignItems: "center", textAlign: "center" }}>
          <tampilan.ikon style={{ width: 56, height: 56, color: tampilan.warna }} aria-hidden="true" />
          <h2 style={{ fontSize: "var(--teks-xl)" }}>{tampilan.judul}</h2>
          <p className="teks-redup">{tampilan.teks}</p>
          <dl className="daftar-definisi" style={{ width: "100%" }}>
            <dt>Nomor pesanan</dt>
            <dd className="angka">{data.order_id}</dd>
            <dt>Jumlah</dt>
            <dd className="angka">{rupiah(data.jumlah)}</dd>
            <dt>Metode</dt>
            <dd>{data.metode || "–"}</dd>
            {data.properti_nama && (
              <>
                <dt>Properti</dt>
                <dd>{data.properti_nama}</dd>
              </>
            )}
          </dl>
          <div className="baris" style={{ flexWrap: "wrap", justifyContent: "center" }}>
            {data.status === "menunggu" && data.mode === "midtrans" && (
              <Tombol varian="sekunder" ikon={LuRefreshCw} onClick={sinkron} memuat={proses}>
                Periksa status
              </Tombol>
            )}
            {data.properti_id ? (
              <Tombol ke={`/app/properti/${data.properti_id}`}>Buka properti</Tombol>
            ) : (
              <Tombol ke="/app/properti">Gunakan kredit</Tombol>
            )}
          </div>
        </div>
      </Kartu>
    </>
  );
}
