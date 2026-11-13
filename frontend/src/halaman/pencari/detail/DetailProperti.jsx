import { useState } from "react";
import {
  LuBookmark,
  LuBookmarkCheck,
  LuBuilding2,
  LuExternalLink,
  LuFileText,
  LuLock,
  LuMapPin,
  LuRefreshCw,
  LuTrash2,
  LuWallet,
} from "react-icons/lu";
import { KepalaHalaman } from "../../../komponen/tata-letak/Aplikasi";
import { CincinSkor, GalatMuat, Kartu, KerangkaHalaman, Lencana, Modal, Pilihan, Tab, Tombol } from "../../../komponen/ui";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { rupiahRingkas, tanggal } from "../../../lib/format";
import { useAksi, useData, useJudul } from "../../../lib/hooks";
import { labelTujuan, useKonfigurasi } from "../../../lib/konfigurasi";
import { useNotifikasi } from "../../../lib/notifikasi";
import { useRouter } from "../../../lib/router";
import { PanelTerkunci } from "./PanelTerkunci";
import { TabBangunan } from "./TabBangunan";
import { TabBiaya } from "./TabBiaya";
import { TabLaporan, TombolUnduhLaporan } from "./TabLaporan";
import { TabLokasi } from "./TabLokasi";

const JENIS = { rumah: "Rumah", apartemen: "Apartemen", ruko: "Ruko", gedung: "Gedung / kantor", tanah_bangunan: "Tanah dan bangunan" };

const TAB = [
  { kode: "lokasi", label: "Lokasi", ikon: LuMapPin },
  { kode: "bangunan", label: "Kondisi bangunan", ikon: LuBuilding2 },
  { kode: "biaya", label: "Biaya & investasi", ikon: LuWallet },
  { kode: "laporan", label: "Laporan & tindak lanjut", ikon: LuFileText },
];

function RingkasanAtas({ detail, onUbahTujuan, mengubah }) {
  const konfigurasi = useKonfigurasi();
  const { properti, lokasi, bangunan, biaya, investasi, akses_premium: premium } = detail;
  const terkunci = <LuLock aria-label="Terkunci" style={{ width: 18, height: 18, color: "var(--abu-muda)" }} />;

  return (
    <Kartu className="ringkasan-atas">
      <div className="ringkasan-atas__skor">
        <CincinSkor skor={lokasi?.hasil.skor_total} ukuran={128} tebal={11} label="Skor lokasi" />
        <div className="tumpuk" style={{ gap: 8 }}>
          <span className="teks-kecil teks-redup">Kelayakan lokasi</span>
          <strong style={{ fontSize: "var(--teks-xl)" }}>{lokasi?.hasil.kategori || "Belum dianalisis"}</strong>
          <Pilihan
            label="Tujuan pembelian"
            value={properti.tujuan}
            disabled={mengubah}
            onChange={(e) => onUbahTujuan(e.target.value)}
            opsi={konfigurasi.tujuan.map((t) => ({ nilai: t.kode, label: t.label }))}
          />
        </div>
      </div>
      <p className="ringkasan-atas__narasi">{lokasi?.hasil.ringkasan}</p>
      <dl className="ringkasan-atas__angka">
        <div>
          <dt>Harga penawaran</dt>
          <dd className="angka">{rupiahRingkas(properti.harga_penawaran)}</dd>
        </div>
        <div>
          <dt>Kondisi visual</dt>
          <dd className="angka">{premium ? (bangunan ? `${Math.round(bangunan.skor_kondisi)}/100` : "–") : terkunci}</dd>
        </div>
        <div>
          <dt>Estimasi renovasi</dt>
          <dd className="angka">{premium ? (biaya ? rupiahRingkas(biaya.total) : "–") : terkunci}</dd>
        </div>
        <div>
          <dt>Total investasi awal</dt>
          <dd className="angka">{premium && investasi ? rupiahRingkas(investasi.total) : terkunci}</dd>
        </div>
      </dl>
    </Kartu>
  );
}

export default function DetailProperti({ id }) {
  const { pengguna } = useAuth();
  const { navigasi } = useRouter();
  const beriTahu = useNotifikasi();
  const konfigurasi = useKonfigurasi();
  const [tab, setTab] = useState("lokasi");
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false);
  const [proses, jalankan] = useAksi();
  const { data: detail, setData: setDetail, galat, memuat, muatUlang } = useData(() => api.get(`/properti/${id}`), [id]);
  useJudul(detail?.properti.nama || "Detail properti");

  if (memuat) return <KerangkaHalaman />;
  if (galat) return <GalatMuat galat={galat} onCobaLagi={muatUlang} />;

  const { properti, akses_premium: premium } = detail;
  const milikSendiri = properti.pengguna_id === pengguna.id;

  const aksi = (fungsi, pesan) =>
    jalankan(async () => {
      try {
        const hasil = await fungsi();
        if (hasil) setDetail(hasil);
        if (pesan) beriTahu(pesan);
      } catch (e) {
        beriTahu(e.message, "galat");
      }
    });

  const ubahTujuan = (tujuan) => aksi(() => api.patch(`/properti/${id}`, { tujuan }), `Skor dihitung ulang untuk tujuan ${labelTujuan(konfigurasi, tujuan).toLowerCase()}.`);
  const simpan = () => aksi(() => api.patch(`/properti/${id}`, { tersimpan: !properti.tersimpan }), properti.tersimpan ? "Dihapus dari tersimpan." : "Properti disimpan.");
  const analisisUlang = () => aksi(() => api.post(`/properti/${id}/analisis-lokasi`), "Analisis lokasi diperbarui.");
  const hapus = () =>
    jalankan(async () => {
      try {
        await api.hapus(`/properti/${id}`);
        beriTahu("Properti dihapus.");
        navigasi("/app/properti", { ganti: true });
      } catch (e) {
        beriTahu(e.message, "galat");
      }
    });

  const segarkan = () => muatUlang({ diam: true });

  const kontenTab = () => {
    if (tab === "lokasi") return <TabLokasi detail={detail} />;
    if (!premium) return <PanelTerkunci properti={properti} onTerbuka={segarkan} />;
    if (tab === "bangunan") return <TabBangunan detail={detail} setDetail={setDetail} />;
    if (tab === "biaya")
      return (
        <TabBiaya
          detail={detail}
          keBangunan={
            <Tombol varian="sekunder" onClick={() => setTab("bangunan")}>
              Buka kondisi bangunan
            </Tombol>
          }
        />
      );
    return <TabLaporan detail={detail} muatUlang={segarkan} />;
  };

  return (
    <>
      <KepalaHalaman
        kembali={{ ke: "/app/properti", label: "Properti saya" }}
        judul={properti.nama}
        deskripsi={
          <span className="baris" style={{ gap: 6, alignItems: "flex-start" }}>
            <LuMapPin aria-hidden="true" style={{ width: 16, height: 16, flex: "none", marginTop: 4 }} />
            {properti.alamat}
          </span>
        }
        aksi={
          milikSendiri && (
            <>
              <Tombol varian="sekunder" ikon={properti.tersimpan ? LuBookmarkCheck : LuBookmark} onClick={simpan} disabled={proses}>
                {properti.tersimpan ? "Tersimpan" : "Simpan"}
              </Tombol>
              <Tombol varian="sekunder" ikon={LuRefreshCw} onClick={analisisUlang} disabled={proses}>
                Perbarui lokasi
              </Tombol>
              {premium && <TombolUnduhLaporan properti={properti} />}
              <Tombol varian="bahaya" ikon={LuTrash2} onClick={() => setKonfirmasiHapus(true)} aria-label="Hapus properti" />
            </>
          )
        }
      />

      <div className="baris" style={{ flexWrap: "wrap", gap: 8, marginTop: -12, marginBottom: 20 }}>
        <Lencana nada="netral">{JENIS[properti.jenis_properti] || properti.jenis_properti}</Lencana>
        {properti.luas_bangunan && <Lencana nada="netral">LB {properti.luas_bangunan} m²</Lencana>}
        {properti.luas_tanah && <Lencana nada="netral">LT {properti.luas_tanah} m²</Lencana>}
        {properti.tahun_bangun && <Lencana nada="netral">Dibangun {properti.tahun_bangun}</Lencana>}
        <Lencana nada={premium ? "sukses" : undefined}>{premium ? "Laporan lengkap" : "Ringkasan gratis"}</Lencana>
        {detail.lokasi?.sumber === "simulasi" ? (
          <Lencana nada="peringatan">Data AI mode demo</Lencana>
        ) : detail.lokasi?.sumber ? (
          <Lencana nada="sukses">Data geospasial asli</Lencana>
        ) : null}
        {properti.sumber_iklan && (
          <a href={properti.sumber_iklan} target="_blank" rel="noreferrer" className="lencana">
            <LuExternalLink aria-hidden="true" /> Lihat iklan
          </a>
        )}
        <span className="teks-mini teks-redup">Ditambahkan {tanggal(properti.dibuat)}</span>
      </div>

      <RingkasanAtas detail={detail} onUbahTujuan={ubahTujuan} mengubah={proses} />

      <div style={{ marginBlock: "24px 20px" }}>
        <Tab label="Bagian analisis" daftar={TAB} aktif={tab} onUbah={setTab} />
      </div>
      <div role="tabpanel">{kontenTab()}</div>

      <Modal
        terbuka={konfirmasiHapus}
        onTutup={() => setKonfirmasiHapus(false)}
        judul="Hapus properti ini?"
        deskripsi="Analisis lokasi, foto, dan estimasi biaya ikut terhapus. Riwayat pembayaran tetap tersimpan."
        aksi={
          <>
            <Tombol varian="hantu" onClick={() => setKonfirmasiHapus(false)}>
              Batal
            </Tombol>
            <Tombol varian="bahaya" ikon={LuTrash2} onClick={hapus} memuat={proses}>
              Hapus properti
            </Tombol>
          </>
        }
      />
    </>
  );
}
