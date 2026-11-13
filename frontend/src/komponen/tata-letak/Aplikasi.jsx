import { useEffect, useState } from "react";
import {
  LuActivity,
  LuClipboardCheck,
  LuDatabase,
  LuFileText,
  LuGitCompare,
  LuHouse,
  LuLayoutDashboard,
  LuLogOut,
  LuMenu,
  LuPlus,
  LuReceipt,
  LuTags,
  LuUsers,
  LuX,
} from "react-icons/lu";
import { BERANDA_PERAN, useAuth } from "../../lib/auth";
import { Alihkan, Tautan, useRouter } from "../../lib/router";
import { Avatar, KerangkaHalaman, Tombol } from "../ui";
import { Logo } from "./Logo";

const MENU_PERAN = {
  pencari: [
    { ke: "/app", label: "Dasbor", ikon: LuLayoutDashboard, persis: true },
    { ke: "/app/properti", label: "Properti saya", ikon: LuHouse },
    { ke: "/app/bandingkan", label: "Bandingkan", ikon: LuGitCompare },
    { ke: "/app/pembayaran", label: "Pembayaran", ikon: LuReceipt },
  ],
  analis: [{ ke: "/analis", label: "Permintaan inspeksi", ikon: LuClipboardCheck }],
  admin: [
    { ke: "/admin", label: "Ringkasan", ikon: LuLayoutDashboard, persis: true },
    { ke: "/admin/pengguna", label: "Pengguna & akses", ikon: LuUsers },
    { ke: "/admin/analisis", label: "Pemantauan analisis", ikon: LuActivity },
    { ke: "/admin/harga", label: "Harga referensi", ikon: LuTags },
    { ke: "/admin/sumber-data", label: "Sumber data", ikon: LuDatabase },
    { ke: "/admin/laporan", label: "Laporan", ikon: LuFileText },
  ],
};

const LABEL_PERAN = { pencari: "Property seeker", analis: "Property analyst", admin: "Admin HomeWise" };

function aktif(item, jalur) {
  return item.persis ? jalur === item.ke : jalur === item.ke || jalur.startsWith(`${item.ke}/`);
}

function DaftarMenu({ menu, jalur }) {
  return (
    <nav className="sisi__menu" aria-label="Menu aplikasi">
      {menu.map((item) => (
        <Tautan key={item.ke} ke={item.ke} className="sisi__tautan" aria-current={aktif(item, jalur) ? "page" : undefined}>
          <item.ikon aria-hidden="true" />
          {item.label}
        </Tautan>
      ))}
    </nav>
  );
}

export function CangkangAplikasi({ peran, children }) {
  const { pengguna, memuat, keluar } = useAuth();
  const { jalur, navigasi } = useRouter();
  const [laci, setLaci] = useState(false);

  useEffect(() => setLaci(false), [jalur]);

  if (memuat) {
    return (
      <div className="wadah" style={{ paddingBlock: 40 }}>
        <KerangkaHalaman />
      </div>
    );
  }
  if (!pengguna) return <Alihkan ke={`/masuk?kembali=${encodeURIComponent(jalur)}`} />;
  if (!peran.includes(pengguna.peran)) return <Alihkan ke={BERANDA_PERAN[pengguna.peran]} />;

  const menu = MENU_PERAN[pengguna.peran];
  const saatKeluar = () => {
    keluar();
    navigasi("/");
  };

  const panelSisi = (
    <>
      <div className="sisi__logo">
        <Tautan ke={BERANDA_PERAN[pengguna.peran]} aria-label="Dasbor HomeWise">
          <Logo kecil />
        </Tautan>
      </div>
      {pengguna.peran === "pencari" && (
        <Tombol ke="/app/properti/baru" ikon={LuPlus} penuh className="sisi__cta">
          Analisis properti
        </Tombol>
      )}
      <DaftarMenu menu={menu} jalur={jalur} />
      <div className="sisi__profil">
        <Avatar nama={pengguna.nama} />
        <div className="sisi__identitas">
          <strong>{pengguna.nama}</strong>
          <span>{LABEL_PERAN[pengguna.peran]}</span>
        </div>
        <button type="button" className="sisi__keluar" onClick={saatKeluar} aria-label="Keluar">
          <LuLogOut />
        </button>
      </div>
    </>
  );

  return (
    <div className="aplikasi">
      <aside className="sisi">{panelSisi}</aside>

      <header className="topbar">
        <button type="button" className="topbar__burger" onClick={() => setLaci(true)} aria-label="Buka menu">
          <LuMenu />
        </button>
        <Tautan ke={BERANDA_PERAN[pengguna.peran]} aria-label="Dasbor HomeWise">
          <Logo kecil />
        </Tautan>
        <Avatar nama={pengguna.nama} />
      </header>

      {laci && (
        <div className="laci-latar" onClick={() => setLaci(false)}>
          <aside className="sisi sisi--laci" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="laci__tutup" onClick={() => setLaci(false)} aria-label="Tutup menu">
              <LuX />
            </button>
            {panelSisi}
          </aside>
        </div>
      )}

      <main className="aplikasi__konten" id="konten">
        {children}
      </main>

      {pengguna.peran === "pencari" && (
        <nav className="navbawah" aria-label="Navigasi bawah">
          {menu.slice(0, 2).map((item) => (
            <Tautan key={item.ke} ke={item.ke} aria-current={aktif(item, jalur) ? "page" : undefined}>
              <item.ikon aria-hidden="true" />
              <span>{item.label.split(" ")[0]}</span>
            </Tautan>
          ))}
          <Tautan ke="/app/properti/baru" className="navbawah__utama" aria-label="Analisis properti baru">
            <LuPlus aria-hidden="true" />
          </Tautan>
          {menu.slice(2).map((item) => (
            <Tautan key={item.ke} ke={item.ke} aria-current={aktif(item, jalur) ? "page" : undefined}>
              <item.ikon aria-hidden="true" />
              <span>{item.label}</span>
            </Tautan>
          ))}
        </nav>
      )}
    </div>
  );
}

export function KepalaHalaman({ judul, deskripsi, aksi, kembali }) {
  return (
    <div className="kepala-halaman">
      <div>
        {kembali && (
          <Tautan ke={kembali.ke} className="kepala-halaman__kembali">
            ← {kembali.label}
          </Tautan>
        )}
        <h1>{judul}</h1>
        {deskripsi && <p className="teks-redup">{deskripsi}</p>}
      </div>
      {aksi && <div className="kepala-halaman__aksi">{aksi}</div>}
    </div>
  );
}
