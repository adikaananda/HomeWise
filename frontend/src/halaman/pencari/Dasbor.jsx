import { LuChartColumn, LuClipboardCheck, LuHouse, LuLockOpen, LuPlus, LuTicket } from "react-icons/lu";
import { KartuProperti } from "../../komponen/KartuProperti";
import { KepalaHalaman } from "../../komponen/tata-letak/Aplikasi";
import { GalatMuat, Kartu, KerangkaHalaman, Kosong, Lencana, Statistik, Tombol } from "../../komponen/ui";
import { api } from "../../lib/api";
import { rupiah, tanggal, kapital } from "../../lib/format";
import { useData, useJudul } from "../../lib/hooks";
import { useKonfigurasi } from "../../lib/konfigurasi";
import { NADA_STATUS_BAYAR } from "./Pembayaran";

export default function Dasbor() {
  useJudul("Dasbor");
  const konfigurasi = useKonfigurasi();
  const { data, galat, memuat, muatUlang } = useData(() => api.get("/dasbor"));

  if (memuat) return <KerangkaHalaman />;
  if (galat) return <GalatMuat galat={galat} onCobaLagi={muatUlang} />;

  const { pengguna, statistik, properti_terbaru: properti, pembayaran_terbaru: pembayaran } = data;
  const namaDepan = pengguna.nama.split(" ")[0];
  const namaPaket = (kode) => konfigurasi.paket.find((p) => p.kode === kode)?.nama || kode;

  return (
    <>
      <KepalaHalaman
        judul={`Halo, ${namaDepan}`}
        deskripsi="Pantau kandidat properti Anda dan lanjutkan analisis yang belum selesai."
        aksi={
          <Tombol ke="/app/properti/baru" ikon={LuPlus}>
            Analisis properti
          </Tombol>
        }
      />

      <div className="kisi-4" style={{ marginBottom: 24 }}>
        <Kartu rapat>
          <Statistik ikon={LuHouse} label="Properti dianalisis" nilai={statistik.total_properti} />
        </Kartu>
        <Kartu rapat>
          <Statistik ikon={LuChartColumn} label="Rata-rata skor lokasi" nilai={statistik.rata_skor_lokasi ?? "–"} />
        </Kartu>
        <Kartu rapat>
          <Statistik ikon={LuLockOpen} label="Laporan lengkap" nilai={statistik.laporan_terbuka} />
        </Kartu>
        <Kartu rapat>
          <Statistik
            ikon={LuTicket}
            label="Kredit laporan"
            nilai={pengguna.kredit_laporan}
            keterangan={statistik.inspeksi_aktif ? `${statistik.inspeksi_aktif} inspeksi sedang berjalan` : undefined}
          />
        </Kartu>
      </div>

      <div className="dasbor-kisi">
        <section>
          <div className="baris-antara" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: "var(--teks-xl)" }}>Properti terbaru</h2>
            {properti.length > 0 && (
              <Tombol ke="/app/properti" varian="hantu" ukuran="kecil">
                Lihat semua
              </Tombol>
            )}
          </div>
          {properti.length ? (
            <div className="kisi-properti">
              {properti.map((p) => (
                <KartuProperti key={p.id} properti={p} />
              ))}
            </div>
          ) : (
            <Kartu>
              <Kosong ikon={LuHouse} judul="Belum ada properti" aksi={<Tombol ke="/app/properti/baru" ikon={LuPlus}>Analisis properti pertama</Tombol>}>
                Masukkan alamat atau koordinat rumah yang Anda temukan, HomeWise langsung menilai lokasinya.
              </Kosong>
            </Kartu>
          )}
        </section>

        <aside className="tumpuk">
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
          <Kartu className="kartu-promo">
            <LuClipboardCheck aria-hidden="true" className="kartu-promo__ikon" />
            <h3>Butuh kepastian sebelum menawar?</h3>
            <p className="teks-kecil">Analis HomeWise memeriksa langsung dan memvalidasi temuan AI pada laporan Anda.</p>
            <Tombol ke="/harga" varian="lime" ukuran="kecil">
              Lihat paket inspeksi
            </Tombol>
          </Kartu>
        </aside>
      </div>
    </>
  );
}
