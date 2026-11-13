import { LuCamera, LuChartColumn, LuChevronRight, LuClipboardCheck, LuFileText, LuHouse, LuLockOpen, LuMapPin, LuPlus, LuTicket } from "react-icons/lu";
import { KartuProperti } from "../../komponen/KartuProperti";
import { KepalaHalaman } from "../../komponen/tata-letak/Aplikasi";
import { GalatMuat, Kartu, KerangkaHalaman, Kosong, Lencana, Statistik, Tombol } from "../../komponen/ui";
import { api } from "../../lib/api";
import { rupiah, tanggal, kapital } from "../../lib/format";
import { useData, useJudul } from "../../lib/hooks";
import { useKonfigurasi } from "../../lib/konfigurasi";
import { Tautan } from "../../lib/router";
import { NADA_STATUS_BAYAR } from "./Pembayaran";

const PANDUAN = [
  { ikon: LuMapPin, judul: "Cek lokasi dari rumah", teks: "Masukkan alamat dari iklan. Skor risiko dan fasilitas langsung keluar, gratis." },
  { ikon: LuCamera, judul: "Foto saat survei", teks: "Buka mode survei di HP. Panduan menunjukkan area yang perlu difoto." },
  { ikon: LuFileText, judul: "Baca laporan, lalu tawar", teks: "Lihat kerusakan, prioritas perbaikan, material, dan total investasi." },
];

function PerluTindakan({ properti }) {
  const daftar = properti.filter((p) => p.tahap.kode !== "tervalidasi").slice(0, 3);
  if (!daftar.length) return null;
  return (
    <Kartu judul="Lanjutkan dari sini" rapat style={{ marginBottom: 24 }}>
      <ul className="daftar-tindakan">
        {daftar.map((p) => (
          <li key={p.id}>
            <Tautan ke={p.tahap.kode === "kandidat" ? `/app/properti/${p.id}/survei` : `/app/properti/${p.id}`}>
              <span className="pil-tahap" data-tahap={p.tahap.kode}>
                <span className="pil-tahap__titik" aria-hidden="true" />
                {p.tahap.label}
              </span>
              <span className="daftar-tindakan__teks">
                <strong className="teks-kecil" style={{ display: "block" }}>{p.nama}</strong>
                <span className="teks-mini teks-redup">{p.tahap.langkah}</span>
              </span>
              <LuChevronRight aria-hidden="true" className="daftar-tindakan__panah" />
            </Tautan>
          </li>
        ))}
      </ul>
    </Kartu>
  );
}

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
          <PerluTindakan properti={properti} />
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
          {!properti.some((p) => p.tahap.urutan >= 2) && (
            <Kartu judul="Cara memakai HomeWise">
              <ol className="panduan-singkat">
                {PANDUAN.map((l) => (
                  <li key={l.judul}>
                    <span className="panduan-singkat__ikon">
                      <l.ikon aria-hidden="true" />
                    </span>
                    <div>
                      <strong className="teks-kecil">{l.judul}</strong>
                      <p className="teks-mini teks-redup">{l.teks}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Kartu>
          )}
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
