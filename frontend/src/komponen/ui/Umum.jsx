import { useState } from "react";
import { LuCircleAlert, LuCircleCheck, LuInfo, LuTriangleAlert } from "react-icons/lu";
import { inisial, nadaLevel } from "../../lib/format";
import { Tombol } from "./Tombol";

export function Kartu({ judul, sub, aksi, rapat, rata, className = "", children, ...sisa }) {
  return (
    <section className={`kartu ${rapat ? "kartu--rapat" : ""} ${rata ? "kartu--rata" : ""} ${className}`} {...sisa}>
      {(judul || aksi) && (
        <header className="kartu__kepala">
          <div>
            {judul && <h3 className="kartu__judul">{judul}</h3>}
            {sub && <p className="kartu__sub">{sub}</p>}
          </div>
          {aksi}
        </header>
      )}
      {children}
    </section>
  );
}

export function Lencana({ nada, ikon: Ikon, children }) {
  return (
    <span className={`lencana ${nada ? `lencana--${nada}` : ""}`}>
      {Ikon && <Ikon aria-hidden="true" />}
      {children}
    </span>
  );
}

export function LencanaLevel({ level, awalan = "" }) {
  return <Lencana nada={nadaLevel(level)}>{`${awalan}${level?.[0].toUpperCase()}${level?.slice(1)}`}</Lencana>;
}

const IKON_PEMBERITAHUAN = { info: LuInfo, peringatan: LuTriangleAlert, sukses: LuCircleCheck, bahaya: LuCircleAlert };

export function Pemberitahuan({ nada = "info", judul, children, aksi }) {
  const Ikon = IKON_PEMBERITAHUAN[nada];
  return (
    <div className={`pemberitahuan pemberitahuan--${nada}`} role={nada === "bahaya" ? "alert" : undefined}>
      <Ikon aria-hidden="true" />
      <div style={{ flex: 1 }}>
        {judul && <p className="tebal" style={{ color: "var(--tinta)" }}>{judul}</p>}
        <div>{children}</div>
        {aksi && <div style={{ marginTop: 10 }}>{aksi}</div>}
      </div>
    </div>
  );
}

export function Kosong({ ikon: Ikon = LuInfo, judul, children, aksi }) {
  return (
    <div className="kosong">
      <div className="kosong__ikon">
        <Ikon aria-hidden="true" />
      </div>
      <h3>{judul}</h3>
      {children && <p>{children}</p>}
      {aksi}
    </div>
  );
}

export function GalatMuat({ galat, onCobaLagi }) {
  return (
    <Kosong ikon={LuCircleAlert} judul="Data belum bisa dimuat" aksi={onCobaLagi && <Tombol varian="sekunder" onClick={() => onCobaLagi()}>Muat ulang</Tombol>}>
      {galat?.message || "Periksa koneksi Anda lalu coba lagi."}
    </Kosong>
  );
}

export function Kerangka({ tinggi = 16, lebar = "100%", style }) {
  return <div className="kerangka" style={{ height: tinggi, width: lebar, ...style }} aria-hidden="true" />;
}

export function KerangkaHalaman() {
  return (
    <div className="tumpuk" aria-busy="true" aria-label="Memuat">
      <Kerangka tinggi={36} lebar="40%" />
      <div className="kisi-3">
        <Kerangka tinggi={120} />
        <Kerangka tinggi={120} />
        <Kerangka tinggi={120} />
      </div>
      <Kerangka tinggi={280} />
    </div>
  );
}

export function Statistik({ ikon: Ikon, label, nilai, keterangan }) {
  return (
    <div className="statistik">
      <span className="statistik__label">
        {Ikon && <Ikon aria-hidden="true" />}
        {label}
      </span>
      <span className="statistik__nilai">{nilai}</span>
      {keterangan && <span className="teks-mini teks-redup">{keterangan}</span>}
    </div>
  );
}

export function Avatar({ nama }) {
  return <span className="avatar" aria-hidden="true">{inisial(nama)}</span>;
}

export function Tab({ daftar, aktif, onUbah, label }) {
  return (
    <div className="tab" role="tablist" aria-label={label}>
      {daftar.map(({ kode, label: teks, ikon: Ikon }) => (
        <button key={kode} type="button" role="tab" aria-selected={aktif === kode} onClick={() => onUbah(kode)}>
          {Ikon && <Ikon aria-hidden="true" />}
          {teks}
        </button>
      ))}
    </div>
  );
}

export function GambarDenganCadangan({ src, alt, cadangan, className, style }) {
  const [gagal, setGagal] = useState(!src);
  if (gagal) return cadangan;
  return <img src={src} alt={alt} className={className} style={style} loading="lazy" onError={() => setGagal(true)} />;
}
