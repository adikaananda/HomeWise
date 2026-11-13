import { useId } from "react";

export function LogoIkon({ ukuran = 40 }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={ukuran} height={ukuran * 0.8} viewBox="0 0 60 48" aria-hidden="true">
      <defs>
        <linearGradient id={`g-${id}`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#0832C8" />
          <stop offset="0.55" stopColor="#2ACAFC" />
          <stop offset="1" stopColor="#51DA9E" />
        </linearGradient>
      </defs>
      <path d="M4 26 24 9l10 8.5" fill="none" stroke={`url(#g-${id})`} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 25v13h17" fill="none" stroke="#0A43EF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="15.5" y="25" width="7" height="7" rx="1.2" fill="#0A43EF" />
      <circle cx="42" cy="30" r="9.5" fill="none" stroke="#0832C8" strokeWidth="4.5" />
      <circle cx="42" cy="30" r="3.2" fill="#0832C8" />
      <path d="M26 21l9-8 7 5 12-12" fill="none" stroke="#51DA9E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="35" cy="13" r="2.6" fill="#fff" stroke="#14BACE" strokeWidth="2" />
      <circle cx="42" cy="18" r="2.6" fill="#fff" stroke="#14BACE" strokeWidth="2" />
      <circle cx="54" cy="6" r="2.6" fill="#fff" stroke="#51DA9E" strokeWidth="2" />
      <path d="M2 44c14-6 34-6 56-14" fill="none" stroke={`url(#g-${id})`} strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ terang = false, kecil = false }) {
  return (
    <span className="logo" aria-label="HomeWise">
      <LogoIkon ukuran={kecil ? 32 : 40} />
      <span className="logo__teks" style={{ fontSize: kecil ? 18 : 22 }}>
        <span style={{ color: terang ? "#fff" : "var(--biru)" }}>Home</span>
        <span style={{ color: terang ? "var(--mint-muda)" : "var(--hijau)" }}>Wise</span>
      </span>
    </span>
  );
}
