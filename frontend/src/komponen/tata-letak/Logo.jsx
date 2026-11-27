export function LogoIkon({ ukuran = 36 }) {
  return (
    <img
      src="/logo-ikon.png"
      alt=""
      aria-hidden="true"
      style={{ height: ukuran, width: "auto", display: "block", objectFit: "contain" }}
    />
  );
}

export function Logo({ terang = false, kecil = false }) {
  return (
    <span className="logo" aria-label="HomeWise">
      <img
        src={terang ? "/logo-terang.png" : "/logo.png"}
        alt="HomeWise — Know More. Invest Smarter"
        style={{
          height: kecil ? 34 : 42,
          width: "auto",
          display: "block",
          objectFit: "contain",
        }}
      />
    </span>
  );
}
