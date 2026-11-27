import { CangkangAplikasi } from "./komponen/tata-letak/Aplikasi";
import { AdminAnalisis, AdminHarga, AdminLaporan, AdminPengguna, AdminRingkasan, AdminSumberData } from "./halaman/admin/Admin";
import { DaftarInspeksi, DetailInspeksi } from "./halaman/analis/Inspeksi";
import Bandingkan from "./halaman/pencari/Bandingkan";
import Profil from "./halaman/Profil";
import Dasbor from "./halaman/pencari/Dasbor";
import DetailProperti from "./halaman/pencari/detail/DetailProperti";
import { RiwayatPembayaran, StatusPembayaran } from "./halaman/pencari/Pembayaran";
import ModeSurvei from "./halaman/pencari/ModeSurvei";
import PropertiBaru from "./halaman/pencari/PropertiBaru";
import PropertiSaya from "./halaman/pencari/PropertiSaya";
import SimulasiKPR from "./halaman/pencari/SimulasiKPR";
import { Daftar, Masuk } from "./halaman/publik/Autentikasi";
import Beranda from "./halaman/publik/Beranda";
import Harga, { TidakDitemukan } from "./halaman/publik/Harga";
import PetaHarga from "./halaman/publik/PetaHarga";
import { cocokkan, useRouter } from "./lib/router";

const PENCARI = ["pencari", "admin"];
const ANALIS = ["analis", "admin"];
const ADMIN = ["admin"];
const SEMUA = ["pencari", "analis", "admin"];

const RUTE = [
  { pola: "/", halaman: Beranda },
  { pola: "/harga", halaman: Harga },
  { pola: "/peta-harga", halaman: PetaHarga },
  { pola: "/masuk", halaman: Masuk },
  { pola: "/daftar", halaman: Daftar },

  { pola: "/app", halaman: Dasbor, peran: PENCARI },
  { pola: "/app/properti", halaman: PropertiSaya, peran: PENCARI },
  { pola: "/app/properti/baru", halaman: PropertiBaru, peran: PENCARI },
  { pola: "/app/properti/:id", halaman: DetailProperti, peran: [...PENCARI, "analis"] },
  { pola: "/app/properti/:id/survei", halaman: ModeSurvei, peran: PENCARI, polos: true },
  { pola: "/app/bandingkan", halaman: Bandingkan, peran: PENCARI },
  { pola: "/app/kpr/:id", halaman: SimulasiKPR, peran: PENCARI },
  { pola: "/app/pembayaran", halaman: RiwayatPembayaran, peran: PENCARI },
  { pola: "/app/pembayaran/:orderId", halaman: StatusPembayaran, peran: PENCARI },

  { pola: "/analis", halaman: DaftarInspeksi, peran: ANALIS },
  { pola: "/analis/inspeksi/:id", halaman: DetailInspeksi, peran: ANALIS },

  { pola: "/admin", halaman: AdminRingkasan, peran: ADMIN },
  { pola: "/admin/pengguna", halaman: AdminPengguna, peran: ADMIN },
  { pola: "/admin/analisis", halaman: AdminAnalisis, peran: ADMIN },
  { pola: "/admin/harga", halaman: AdminHarga, peran: ADMIN },
  { pola: "/admin/sumber-data", halaman: AdminSumberData, peran: ADMIN },
  { pola: "/admin/laporan", halaman: AdminLaporan, peran: ADMIN },

  { pola: "/profil", halaman: Profil, peran: SEMUA },
];

export default function App() {
  const { jalur } = useRouter();

  for (const rute of RUTE) {
    const parameter = cocokkan(rute.pola, jalur);
    if (!parameter) continue;
    const Halaman = rute.halaman;
    if (!rute.peran) return <Halaman {...parameter} />;
    return (
      <CangkangAplikasi peran={rute.peran} polos={rute.polos}>
        <Halaman key={jalur} {...parameter} />
      </CangkangAplikasi>
    );
  }
  return <TidakDitemukan />;
}
