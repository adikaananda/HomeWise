import { useEffect, useState } from "react";
import { LuLogOut, LuMenu, LuX } from "react-icons/lu";
import { BERANDA_PERAN, useAuth } from "../../lib/auth";
import { Tautan, useRouter } from "../../lib/router";
import { Tombol } from "../ui";
import { Logo } from "./Logo";

const MENU = [
  { ke: "/#fitur", label: "Fitur" },
  { ke: "/#cara-kerja", label: "Cara kerja" },
  { ke: "/#tujuan", label: "Analisis per tujuan" },
  { ke: "/peta-harga", label: "Peta Harga Tanah" },
  { ke: "/harga", label: "Harga" },
  { ke: "/#tim", label: "Tentang" },
];

export function NavbarPublik() {
  const { pengguna, keluar } = useAuth();
  const { jalur } = useRouter();
  const [terbuka, setTerbuka] = useState(false);
  const [tergulir, setTergulir] = useState(false);

  useEffect(() => {
    const saatGulir = () => setTergulir(window.scrollY > 8);
    saatGulir();
    window.addEventListener("scroll", saatGulir, { passive: true });
    return () => window.removeEventListener("scroll", saatGulir);
  }, []);

  useEffect(() => setTerbuka(false), [jalur]);

  const tautanMenu = (item) =>
    item.ke.startsWith("/#") ? (
      <a key={item.ke} href={item.ke} onClick={() => setTerbuka(false)}>
        {item.label}
      </a>
    ) : (
      <Tautan key={item.ke} ke={item.ke} aria-current={jalur === item.ke ? "page" : undefined}>
        {item.label}
      </Tautan>
    );

  return (
    <header className={`navbar ${tergulir ? "navbar--tergulir" : ""}`}>
      <div className="wadah navbar__isi">
        <Tautan ke="/" aria-label="Beranda HomeWise">
          <Logo />
        </Tautan>
        <nav className="navbar__menu" aria-label="Navigasi utama">
          {MENU.map(tautanMenu)}
        </nav>
        <div className="navbar__aksi">
          {pengguna ? (
            <>
              <Tombol varian="hantu" ikon={LuLogOut} onClick={keluar}>
                Keluar
              </Tombol>
              <Tombol ke={BERANDA_PERAN[pengguna.peran]}>Buka dasbor</Tombol>
            </>
          ) : (
            <>
              <Tombol varian="hantu" ke="/masuk">
                Masuk
              </Tombol>
              <Tombol ke="/daftar">Coba gratis</Tombol>
            </>
          )}
        </div>
        <button className="navbar__burger" type="button" aria-label={terbuka ? "Tutup menu" : "Buka menu"} aria-expanded={terbuka} onClick={() => setTerbuka(!terbuka)}>
          {terbuka ? <LuX /> : <LuMenu />}
        </button>
      </div>
      {terbuka && (
        <div className="navbar__laci">
          <nav className="wadah tumpuk" aria-label="Navigasi seluler">
            {MENU.map(tautanMenu)}
            {pengguna ? (
              <div className="kisi-2">
                <Tombol varian="sekunder" ikon={LuLogOut} onClick={() => { keluar(); setTerbuka(false); }} penuh>
                  Keluar
                </Tombol>
                <Tombol ke={BERANDA_PERAN[pengguna.peran]} penuh>
                  Buka dasbor
                </Tombol>
              </div>
            ) : (
              <div className="kisi-2">
                <Tombol varian="sekunder" ke="/masuk" penuh>
                  Masuk
                </Tombol>
                <Tombol ke="/daftar" penuh>
                  Coba gratis
                </Tombol>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export function KakiPublik() {
  return (
    <footer className="kaki">
      <div className="wadah kaki__isi">
        <div className="kaki__merek">
          <Logo terang />
          <p>Platform pendukung keputusan properti berbasis AI dan data geospasial. Bukan marketplace dan bukan pengganti inspeksi profesional.</p>
        </div>
        <div>
          <h4>Produk</h4>
          <a href="/#fitur">Location intelligence</a>
          <a href="/#fitur">Analisis kondisi bangunan</a>
          <a href="/#fitur">Estimasi renovasi</a>
          <Tautan ke="/peta-harga">Peta harga tanah</Tautan>
          <Tautan ke="/harga">Harga</Tautan>
        </div>
        <div>
          <h4>Untuk siapa</h4>
          <a href="/#segmen">Pembeli rumah</a>
          <a href="/#segmen">Pelaku usaha</a>
          <a href="/#segmen">Mitra institusi</a>
        </div>
        <div>
          <h4>Sumber data</h4>
          <span>InaRISK BNPB</span>
          <span>DEMNAS — BIG</span>
          <span>OpenStreetMap</span>
          <span>AHSP Kementerian PUPR</span>
        </div>
      </div>
      <div className="wadah kaki__bawah">
        <span>© {new Date().getFullYear()} HomeWise. Assess the Location. Understand the Property. Invest Smarter.</span>
        <span>Foto ilustrasi: Freepik</span>
      </div>
    </footer>
  );
}

export function TataLetakPublik({ children }) {
  return (
    <>
      <a href="#konten" className="lewati">
        Lewati ke konten
      </a>
      <NavbarPublik />
      <main id="konten">{children}</main>
      <KakiPublik />
    </>
  );
}
