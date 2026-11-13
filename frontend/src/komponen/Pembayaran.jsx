import { useState } from "react";
import { LuBuilding2, LuCreditCard, LuQrCode, LuShieldCheck, LuSmartphone } from "react-icons/lu";
import { api } from "../lib/api";
import { rupiah } from "../lib/format";
import { useKonfigurasi } from "../lib/konfigurasi";
import { bukaSnap } from "../lib/midtrans";
import { useNotifikasi } from "../lib/notifikasi";
import { useRouter } from "../lib/router";
import { Lencana, Modal, Pemberitahuan, Tombol } from "./ui";

const METODE = [
  { kode: "qris", label: "QRIS", ikon: LuQrCode },
  { kode: "va", label: "Virtual account", ikon: LuBuilding2 },
  { kode: "ewallet", label: "GoPay / ShopeePay", ikon: LuSmartphone },
  { kode: "kartu", label: "Kartu kredit/debit", ikon: LuCreditCard },
];

export function usePembayaran({ onLunas } = {}) {
  const konfigurasi = useKonfigurasi();
  const beriTahu = useNotifikasi();
  const { navigasi } = useRouter();
  const [transaksi, setTransaksi] = useState(null);
  const [proses, setProses] = useState(false);
  const [metode, setMetode] = useState("qris");

  const selesai = async (hasil) => {
    setTransaksi(null);
    if (hasil.status === "lunas") {
      beriTahu("Pembayaran berhasil. Manfaat paket sudah aktif.");
      await onLunas?.(hasil);
    } else {
      navigasi(`/app/pembayaran/${hasil.order_id}`);
    }
  };

  const bayar = async (paket, propertiId) => {
    setProses(true);
    try {
      const data = await api.post("/pembayaran", { paket, properti_id: propertiId || null });
      if (data.mode === "simulasi") {
        setTransaksi(data);
        return;
      }
      const status = await bukaSnap(data.snap_token, {
        clientKey: konfigurasi.midtrans.client_key,
        produksi: konfigurasi.midtrans.produksi,
      });
      if (status === "ditutup") {
        beriTahu("Pembayaran belum diselesaikan. Anda bisa melanjutkannya dari menu Pembayaran.", "info");
        return;
      }
      await selesai(await api.post(`/pembayaran/${data.order_id}/sinkron`));
    } catch (e) {
      beriTahu(e.message, "galat");
    } finally {
      setProses(false);
    }
  };

  const konfirmasiSimulasi = async (status) => {
    setProses(true);
    try {
      await selesai(await api.post(`/pembayaran/${transaksi.order_id}/simulasi`, { status }));
    } catch (e) {
      beriTahu(e.message, "galat");
    } finally {
      setProses(false);
    }
  };

  const nama = konfigurasi.paket.find((p) => p.kode === transaksi?.paket)?.nama || transaksi?.paket;

  const modal = (
    <Modal
      terbuka={Boolean(transaksi)}
      onTutup={() => !proses && setTransaksi(null)}
      judul="Selesaikan pembayaran"
      deskripsi={transaksi?.properti_nama ? `${nama} untuk ${transaksi.properti_nama}` : nama}
      aksi={
        <>
          <Tombol varian="hantu" onClick={() => konfirmasiSimulasi("gagal")} disabled={proses}>
            Simulasikan gagal
          </Tombol>
          <Tombol onClick={() => konfirmasiSimulasi("lunas")} memuat={proses}>
            Bayar {rupiah(transaksi?.jumlah)}
          </Tombol>
        </>
      }
    >
      <div className="tumpuk">
        <Pemberitahuan nada="peringatan" judul="Mode simulasi pembayaran">
          Server belum memakai kunci Midtrans, jadi tidak ada uang yang ditarik. Isi MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY untuk membuka Snap asli.
        </Pemberitahuan>
        <div className="baris-antara">
          <span className="teks-redup teks-kecil">Nomor pesanan</span>
          <span className="angka tebal teks-kecil">{transaksi?.order_id}</span>
        </div>
        <div className="pilihan-kartu" role="radiogroup" aria-label="Metode pembayaran" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
          {METODE.map((m) => (
            <label key={m.kode}>
              <input type="radio" name="metode" value={m.kode} checked={metode === m.kode} onChange={() => setMetode(m.kode)} />
              <span className="pilihan-kartu__ikon">
                <m.ikon aria-hidden="true" />
              </span>
              <span className="pilihan-kartu__isi teks-kecil tebal">{m.label}</span>
            </label>
          ))}
        </div>
        <div className="baris teks-mini teks-redup">
          <LuShieldCheck aria-hidden="true" style={{ width: 16, height: 16, color: "var(--hijau)" }} />
          Diproses aman oleh <Lencana nada="netral">Midtrans</Lencana>
        </div>
      </div>
    </Modal>
  );

  return { bayar, proses, modal };
}
