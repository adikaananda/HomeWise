import { useEffect, useState } from "react";
import { warnaSkor } from "../../lib/format";

export function CincinSkor({ skor, ukuran = 120, tebal = 10, satuan = "dari 100", label }) {
  const [tampil, setTampil] = useState(0);
  const jari = (ukuran - tebal) / 2;
  const keliling = 2 * Math.PI * jari;
  const nilai = Math.max(0, Math.min(100, skor ?? 0));

  useEffect(() => {
    const id = requestAnimationFrame(() => setTampil(nilai));
    return () => cancelAnimationFrame(id);
  }, [nilai]);

  return (
    <div className="cincin" style={{ width: ukuran, height: ukuran }} role="img" aria-label={`${label || "Skor"} ${Math.round(nilai)} dari 100`}>
      <svg width={ukuran} height={ukuran}>
        <circle className="cincin__lintasan" cx={ukuran / 2} cy={ukuran / 2} r={jari} strokeWidth={tebal} />
        <circle
          className="cincin__isi"
          cx={ukuran / 2}
          cy={ukuran / 2}
          r={jari}
          strokeWidth={tebal}
          stroke={warnaSkor(skor)}
          strokeDasharray={keliling}
          strokeDashoffset={keliling * (1 - tampil / 100)}
        />
      </svg>
      <div className="cincin__label">
        <span className="cincin__angka" style={{ fontSize: ukuran * 0.28 }}>
          {skor == null ? "–" : Math.round(skor)}
        </span>
        {ukuran >= 90 && <span className="cincin__satuan">{satuan}</span>}
      </div>
    </div>
  );
}

export function BatangSkor({ label, skor, keterangan, warna }) {
  return (
    <div className="batang">
      <div className="batang__atas">
        <span>{label}</span>
        <span className="angka tebal">
          {Math.round(skor)}
          {keterangan && <span className="teks-redup" style={{ fontWeight: 500, marginLeft: 8 }}>{keterangan}</span>}
        </span>
      </div>
      <div className="batang__jalur">
        <div className="batang__isi" style={{ width: `${Math.max(2, skor)}%`, background: warna || warnaSkor(skor) }} />
      </div>
    </div>
  );
}
