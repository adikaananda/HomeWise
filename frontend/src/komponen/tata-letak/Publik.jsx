import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LuArrowRight, LuBadgeDollarSign, LuInfo, LuLayers, LuLayoutDashboard, LuLogOut, LuMap, LuMenu, LuRoute, LuUsers, LuX } from "react-icons/lu";
import { BERANDA_PERAN, useAuth } from "../../lib/auth";
import { Tautan, useRouter } from "../../lib/router";
import { Tombol } from "../ui";
import { Logo } from "./Logo";

const MENU = [
  { bagian: "fitur", label: "Fitur", ikon: LuLayers },
  { bagian: "cara-kerja", label: "Cara kerja", ikon: LuRoute },
  { bagian: "segmen", label: "Untuk siapa", ikon: LuUsers },
  { ke: "/peta-harga", label: "Peta Harga Tanah", ikon: LuMap },
  { ke: "/harga", label: "Harga", ikon: LuBadgeDollarSign },
  { bagian: "tim", label: "Tentang", ikon: LuInfo },
];
const BAGIAN = MENU.filter((m) => m.bagian).map((m) => m.bagian);
const KUNCI_TUNDA = "hw-bagian-tujuan";

/** Gulir halus ke section beranda. Dari halaman lain: pindah ke beranda dulu, lalu gulir setelah render. */
export function useKeBagian() {
  const { jalur, navigasi } = useRouter();
  return (id) => {
    if (jalur === "/") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", `/#${id}`);
    } else {
      sessionStorage.setItem(KUNCI_TUNDA, id);
      navigasi("/");
    }
  };
}

/** Dipanggil beranda saat dimuat: gulir ke section yang tertunda atau yang ada di hash URL. */
export function useGulirTertunda() {
  useEffect(() => {
    const id = sessionStorage.getItem(KUNCI_TUNDA) || window.location.hash.slice(1);
    sessionStorage.removeItem(KUNCI_TUNDA);
    if (!id) return undefined;
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    return () => clearTimeout(t);
  }, []);
}

export function TautanBagian({ bagian, children, className, onClick, ...sisa }) {
  const keBagian = useKeBagian();
  return (
    <a
      {...sisa}
      href={`/#${bagian}`}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onClick?.();
        keBagian(bagian);
      }}
    >
      {children}
    </a>
  );
}

function useBagianAktif(aktifkan) {
  const [aktif, setAktif] = useState(null);
  useEffect(() => {
    if (!aktifkan) {
      setAktif(null);
      return undefined;
    }
    const terlihat = new Map();
    const pengamat = new IntersectionObserver(
      (entri) => {
        entri.forEach((e) => terlihat.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
        const terbaik = BAGIAN.map((id) => [id, terlihat.get(id) || 0]).sort((a, b) => b[1] - a[1])[0];
        setAktif(terbaik && terbaik[1] > 0 ? terbaik[0] : null);
      },
      { rootMargin: "-80px 0px -45% 0px", threshold: [0, 0.15, 0.4, 0.7] },
    );
    const pasang = () => BAGIAN.forEach((id) => {
      const el = document.getElementById(id);
      if (el) pengamat.observe(el);
    });
    const t = setTimeout(pasang, 50);
    return () => {
      clearTimeout(t);
      pengamat.disconnect();
    };
  }, [aktifkan]);
  return aktif;
}

export function NavbarPublik() {
  const { pengguna, keluar } = useAuth();
  const { jalur } = useRouter();
  const [terbuka, setTerbuka] = useState(false);
  const [tergulir, setTergulir] = useState(false);
  const bagianAktif = useBagianAktif(jalur === "/");
  const menuRef = useRef(null);
  const [penanda, setPenanda] = useState(null);

  useEffect(() => {
    const saatGulir = () => setTergulir(window.scrollY > 8);
    saatGulir();
    window.addEventListener("scroll", saatGulir, { passive: true });
    return () => window.removeEventListener("scroll", saatGulir);
  }, []);

  useEffect(() => setTerbuka(false), [jalur]);
  useEffect(() => {
    document.body.style.overflow = terbuka ? "hidden" : "";
    const esc = (e) => e.key === "Escape" && setTerbuka(false);
    window.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", esc);
    };
  }, [terbuka]);

  const kodeAktif = MENU.find((m) => (m.ke ? jalur === m.ke : m.bagian === bagianAktif));
  const kunciAktif = kodeAktif ? kodeAktif.ke || kodeAktif.bagian : null;

  useLayoutEffect(() => {
    const ukur = () => {
      const el = menuRef.current?.querySelector('[data-aktif="true"]');
      setPenanda(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    ukur();
    window.addEventListener("resize", ukur);
    return () => window.removeEventListener("resize", ukur);
  }, [kunciAktif]);

  const item = (m, seluler = false) => {
    const kunci = m.ke || m.bagian;
    const isi = (
      <>
        {seluler && <m.ikon aria-hidden="true" />}
        <span>{m.label}</span>
        {seluler && <LuArrowRight aria-hidden="true" className="navbar__panah" />}
      </>
    );
    const props = { "data-aktif": kunci === kunciAktif ? "true" : undefined, className: "navbar__tautan" };
    return m.ke ? (
      <Tautan key={kunci} {...props} ke={m.ke} aria-current={jalur === m.ke ? "page" : undefined}>
        {isi}
      </Tautan>
    ) : (
      <TautanBagian key={kunci} {...props} bagian={m.bagian} onClick={() => setTerbuka(false)}>
        {isi}
      </TautanBagian>
    );
  };

  return (
    <header className={`navbar ${tergulir ? "navbar--tergulir" : ""} ${terbuka ? "navbar--terbuka" : ""}`}>
      <div className="wadah navbar__isi">
        <Tautan ke="/" aria-label="Beranda HomeWise" className="navbar__logo">
          <Logo />
        </Tautan>
        <nav className="navbar__menu" aria-label="Navigasi utama" ref={menuRef}>
          {penanda && <span className="navbar__penanda" aria-hidden="true" style={{ transform: `translateX(${penanda.left}px)`, width: penanda.width }} />}
          {MENU.map((m) => item(m))}
        </nav>
        <div className="navbar__aksi">
          {pengguna ? (
            <>
              <Tombol varian="hantu" ikon={LuLogOut} onClick={keluar}>
                Keluar
              </Tombol>
              <Tombol ke={BERANDA_PERAN[pengguna.peran]} ikon={LuLayoutDashboard}>
                Dasbor
              </Tombol>
            </>
          ) : (
            <>
              <Tombol varian="hantu" ke="/masuk">
                Masuk
              </Tombol>
              <Tombol ke="/daftar" ikonKanan={LuArrowRight} className="navbar__cta">
                Coba gratis
              </Tombol>
            </>
          )}
        </div>
        <button className="navbar__burger" type="button" aria-label={terbuka ? "Tutup menu" : "Buka menu"} aria-expanded={terbuka} onClick={() => setTerbuka(!terbuka)}>
          {terbuka ? <LuX /> : <LuMenu />}
        </button>
      </div>
      <div className="navbar__laci" aria-hidden={!terbuka}>
        <nav className="wadah navbar__laci-isi" aria-label="Navigasi seluler">
          {MENU.map((m) => item(m, true))}
          <div className="kisi-2 navbar__laci-aksi">
            {pengguna ? (
              <>
                <Tombol varian="sekunder" ikon={LuLogOut} onClick={() => { keluar(); setTerbuka(false); }} penuh>
                  Keluar
                </Tombol>
                <Tombol ke={BERANDA_PERAN[pengguna.peran]} penuh>
                  Dasbor
                </Tombol>
              </>
            ) : (
              <>
                <Tombol varian="sekunder" ke="/masuk" penuh>
                  Masuk
                </Tombol>
                <Tombol ke="/daftar" penuh>
                  Coba gratis
                </Tombol>
              </>
            )}
          </div>
        </nav>
      </div>
      {terbuka && <div className="navbar__tirai" onClick={() => setTerbuka(false)} aria-hidden="true" />}
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
          <TautanBagian bagian="fitur">Location intelligence</TautanBagian>
          <TautanBagian bagian="fitur">Analisis kondisi bangunan</TautanBagian>
          <TautanBagian bagian="fitur">Estimasi renovasi</TautanBagian>
          <Tautan ke="/peta-harga">Peta harga tanah</Tautan>
          <Tautan ke="/harga">Harga</Tautan>
        </div>
        <div>
          <h4>Untuk siapa</h4>
          <TautanBagian bagian="segmen">Pembeli rumah</TautanBagian>
          <TautanBagian bagian="segmen">Pelaku usaha</TautanBagian>
          <TautanBagian bagian="segmen">Mitra institusi</TautanBagian>
          <TautanBagian bagian="tim">Tentang kami</TautanBagian>
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
        <span>Foto: Unsplash &amp; Freepik · Model 3D dibuat dengan three.js</span>
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
