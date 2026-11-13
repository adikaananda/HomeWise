import { useId } from "react";

function Kilau({ x, y, s = 1, warna = "#fff" }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0-12C1.5-3 3-1.5 12 0 3 1.5 1.5 3 0 12-1.5 3-3 1.5-12 0-3-1.5-1.5-3 0-12Z"
      fill={warna}
    />
  );
}

function Awan({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff">
      <ellipse cx="0" cy="0" rx="60" ry="26" />
      <ellipse cx="-38" cy="8" rx="34" ry="20" />
      <ellipse cx="40" cy="6" rx="38" ry="22" />
      <ellipse cx="6" cy="-18" rx="34" ry="24" />
    </g>
  );
}

export function IlustrasiRumah({ className }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={className} viewBox="0 0 560 460" role="img" aria-label="Ilustrasi rumah modern dua lantai">
      <defs>
        <linearGradient id={`kaca-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A9E9FF" />
          <stop offset="0.6" stopColor="#5DB7F5" />
          <stop offset="1" stopColor="#2F6FE0" />
        </linearGradient>
        <linearGradient id={`dinding-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E6ECF8" />
        </linearGradient>
        <linearGradient id={`kayu-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#C89466" />
          <stop offset="1" stopColor="#A9764B" />
        </linearGradient>
      </defs>

      <Kilau x={70} y={70} s={1.1} />
      <Kilau x={500} y={110} s={0.8} />
      <Kilau x={455} y={40} s={0.5} />
      <Kilau x={110} y={190} s={0.55} />

      <rect x="150" y="128" width="290" height="14" rx="3" fill="#1A2B66" />
      <rect x="160" y="142" width="270" height="118" fill={`url(#dinding-${id})`} />
      <rect x="330" y="142" width="100" height="118" fill={`url(#kayu-${id})`} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={i} x={336 + i * 12} y="142" width="4" height="118" fill="#8A5E39" opacity="0.45" />
      ))}
      <rect x="180" y="160" width="130" height="80" rx="4" fill="#1A2B66" />
      <rect x="185" y="165" width="58" height="70" fill={`url(#kaca-${id})`} />
      <rect x="247" y="165" width="58" height="70" fill={`url(#kaca-${id})`} />
      <path d="M190 228 230 170h10l-40 58Z" fill="#fff" opacity="0.35" />
      <path d="M252 228 292 170h6l-40 58Z" fill="#fff" opacity="0.3" />
      <rect x="176" y="236" width="138" height="6" rx="2" fill="#1A2B66" />

      <rect x="80" y="248" width="400" height="14" rx="3" fill="#1A2B66" />
      <rect x="92" y="262" width="376" height="128" fill={`url(#dinding-${id})`} />
      <rect x="92" y="262" width="120" height="128" fill="#DCE4F5" />
      <rect x="110" y="282" width="84" height="108" rx="3" fill="#1A2B66" />
      <rect x="115" y="287" width="74" height="103" fill={`url(#kaca-${id})`} />
      <path d="M120 380 170 290h8l-50 90Z" fill="#fff" opacity="0.3" />
      <rect x="236" y="290" width="70" height="100" rx="3" fill={`url(#kayu-${id})`} />
      <circle cx="294" cy="342" r="3.5" fill="#1A2B66" />
      <rect x="330" y="284" width="122" height="72" rx="4" fill="#1A2B66" />
      <rect x="335" y="289" width="54" height="62" fill={`url(#kaca-${id})`} />
      <rect x="393" y="289" width="54" height="62" fill={`url(#kaca-${id})`} />
      <path d="M340 345 375 292h8l-36 53Z" fill="#fff" opacity="0.3" />

      <rect x="60" y="388" width="440" height="12" rx="4" fill="#C9D3EA" />
      <rect x="40" y="398" width="480" height="10" rx="5" fill="#A1E05B" />

      <ellipse cx="78" cy="372" rx="26" ry="30" fill="#008C73" />
      <ellipse cx="66" cy="384" rx="18" ry="20" fill="#51DA9E" />
      <ellipse cx="488" cy="368" rx="24" ry="34" fill="#51DA9E" />
      <ellipse cx="500" cy="382" rx="18" ry="22" fill="#008C73" />
      <rect x="214" y="372" width="14" height="20" rx="3" fill="#1A2B66" />
      <ellipse cx="221" cy="366" rx="13" ry="14" fill="#51DA9E" />

      <Awan x={70} y={430} s={1.2} />
      <Awan x={300} y={448} s={1.4} />
      <Awan x={510} y={430} s={1.1} />
    </svg>
  );
}

export function IlustrasiPeta({ className }) {
  return (
    <svg className={className} viewBox="0 0 320 220" role="img" aria-label="Ilustrasi peta risiko lokasi">
      <rect width="320" height="220" rx="18" fill="#EEF3FF" />
      <path d="M0 150c60-30 120 10 180-20s100-10 140-40v130H0Z" fill="#DBE5FF" />
      <path d="M-10 60c70 10 90 60 170 50s120-60 170-40" fill="none" stroke="#fff" strokeWidth="14" strokeLinecap="round" />
      <path d="M120-10c10 70 40 120 20 240" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" />
      <circle cx="160" cy="112" r="64" fill="#2ACAFC" opacity="0.14" />
      <circle cx="160" cy="112" r="40" fill="#2ACAFC" opacity="0.22" />
      <circle cx="232" cy="70" r="9" fill="#008C73" />
      <circle cx="82" cy="150" r="9" fill="#14BACE" />
      <circle cx="250" cy="160" r="9" fill="#A1E05B" />
      <path d="M160 70c-18 0-30 13-30 29 0 22 30 47 30 47s30-25 30-47c0-16-12-29-30-29Z" fill="#0A43EF" />
      <circle cx="160" cy="99" r="10" fill="#fff" />
    </svg>
  );
}

export function IlustrasiPemindai({ className }) {
  return (
    <svg className={className} viewBox="0 0 320 220" role="img" aria-label="Ilustrasi pemindaian dinding">
      <rect width="320" height="220" rx="18" fill="#F1EDE5" />
      <rect y="170" width="320" height="50" fill="#D9D0C2" />
      <path d="M118 20l-8 26 14 18-12 30 16 22-10 34" fill="none" stroke="#6E6257" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="236" cy="70" rx="44" ry="30" fill="#CFC6B6" opacity="0.8" />
      <rect x="86" y="14" width="64" height="150" rx="8" fill="none" stroke="#A1E05B" strokeWidth="3" />
      <rect x="86" y="2" width="58" height="16" rx="4" fill="#A1E05B" />
      <text x="92" y="14" fontSize="10" fontWeight="800" fill="#0E1A3D" fontFamily="Plus Jakarta Sans, sans-serif">Retak 91%</text>
      <rect x="188" y="36" width="96" height="70" rx="8" fill="none" stroke="#2ACAFC" strokeWidth="3" />
      <rect x="188" y="24" width="82" height="16" rx="4" fill="#2ACAFC" />
      <text x="194" y="36" fontSize="10" fontWeight="800" fill="#0E1A3D" fontFamily="Plus Jakarta Sans, sans-serif">Lembap 84%</text>
      <rect x="0" y="118" width="320" height="2" fill="#0A43EF" opacity="0.7" />
    </svg>
  );
}

export function IlustrasiBiaya({ className }) {
  return (
    <svg className={className} viewBox="0 0 320 220" role="img" aria-label="Ilustrasi estimasi biaya">
      <rect width="320" height="220" rx="18" fill="#E6F6F2" />
      {[60, 95, 75, 130, 110].map((t, i) => (
        <rect key={i} x={40 + i * 50} y={180 - t} width="32" height={t} rx="8" fill={i === 3 ? "#008C73" : "#A6EFB6"} />
      ))}
      <path d="M48 120 104 90l50 22 50-50 56 20" fill="none" stroke="#0A43EF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="204" cy="62" r="7" fill="#fff" stroke="#0A43EF" strokeWidth="3" />
    </svg>
  );
}

export function IlustrasiLaporan({ className }) {
  return (
    <svg className={className} viewBox="0 0 320 220" role="img" aria-label="Ilustrasi laporan properti">
      <rect width="320" height="220" rx="18" fill="#EEF3FF" />
      <rect x="92" y="22" width="136" height="176" rx="12" fill="#fff" stroke="#DBE5FF" strokeWidth="2" />
      <rect x="92" y="22" width="136" height="10" rx="5" fill="#0A43EF" />
      <rect x="108" y="48" width="70" height="9" rx="4" fill="#0E1A3D" />
      <rect x="108" y="64" width="100" height="6" rx="3" fill="#C9D3EA" />
      <circle cx="130" cy="106" r="20" fill="none" stroke="#DBE5FF" strokeWidth="7" />
      <path d="M130 86a20 20 0 1 1-19 26" fill="none" stroke="#008C73" strokeWidth="7" strokeLinecap="round" />
      <rect x="160" y="96" width="52" height="7" rx="3" fill="#C9D3EA" />
      <rect x="160" y="110" width="38" height="7" rx="3" fill="#C9D3EA" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x="108" y={142 + i * 16} width={i === 1 ? 80 : 104} height="7" rx="3" fill="#E1E7F5" />
      ))}
      <circle cx="232" cy="170" r="22" fill="#A1E05B" />
      <path d="m222 170 7 7 13-14" fill="none" stroke="#0E1A3D" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
