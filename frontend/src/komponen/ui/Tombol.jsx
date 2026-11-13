import { Tautan } from "../../lib/router";

export function Tombol({ varian = "utama", ukuran, penuh, ikon: Ikon, ikonKanan: IkonKanan, memuat, ke, className = "", children, ...sisa }) {
  const kelas = [
    "tombol",
    varian !== "utama" && `tombol--${varian}`,
    ukuran && `tombol--${ukuran}`,
    penuh && "tombol--penuh",
    !children && "tombol--ikon",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const isi = (
    <>
      {memuat ? <span className="pemuat" aria-hidden="true" /> : Ikon && <Ikon aria-hidden="true" />}
      {children}
      {IkonKanan && <IkonKanan aria-hidden="true" />}
    </>
  );

  if (ke) {
    return (
      <Tautan ke={ke} className={kelas} {...sisa}>
        {isi}
      </Tautan>
    );
  }

  return (
    <button type="button" className={kelas} {...sisa} disabled={memuat || sisa.disabled} aria-busy={memuat || undefined}>
      {isi}
    </button>
  );
}
