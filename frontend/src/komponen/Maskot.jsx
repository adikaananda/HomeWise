/* Howy, HomeWise Companion. Setiap keadaan punya pose sendiri; gambar dimuat lazy & berukuran sesuai layar. */

export const POSE = {
  menyapa: { berkas: "howy7", alt: "Howy menyapa" },
  onboarding: { berkas: "howy10", alt: "Howy menyambut Anda" },
  mencari: { berkas: "howy1", alt: "Howy mencari properti di peta" },
  menganalisis: { berkas: "howy4", alt: "Howy sedang menganalisis rumah" },
  memuat: { berkas: "howy13", alt: "Howy bergegas menyiapkan data" },
  memproses: { berkas: "howy6", alt: "Howy memproses data" },
  ide: { berkas: "howy5", alt: "Howy punya insight" },
  risiko_rendah: { berkas: "howy2", alt: "Howy senang, risiko rendah" },
  risiko_sedang: { berkas: "howy8", alt: "Howy tenang, risiko sedang" },
  risiko_tinggi: { berkas: "howy3", alt: "Howy memberi peringatan" },
  peringatan: { berkas: "howy3", alt: "Howy memberi peringatan" },
  sukses: { berkas: "howy9", alt: "Howy merayakan" },
  laporan_selesai: { berkas: "howy9", alt: "Howy merayakan laporan selesai" },
  bingung: { berkas: "howy12", alt: "Howy kebingungan" },
  kosong: { berkas: "howy12", alt: "Howy belum menemukan data" },
  galat: { berkas: "howy3", alt: "Howy menemukan kendala" },
  investasi: { berkas: "howy11", alt: "Howy menghitung investasi" },
  renovasi: { berkas: "howy14", alt: "Howy merencanakan renovasi" },
};

export function srcMaskot(pose, besar = false) {
  const p = POSE[pose] || POSE.menyapa;
  return `/aset/maskot/${p.berkas}-${besar ? 480 : 240}.webp`;
}

export function Maskot({ pose = "menyapa", ukuran = 160, gerak = "melayang", prioritas = false, className = "", alt }) {
  const p = POSE[pose] || POSE.menyapa;
  return (
    <img
      className={`maskot maskot--${gerak} ${className}`}
      src={`/aset/maskot/${p.berkas}-240.webp`}
      srcSet={`/aset/maskot/${p.berkas}-240.webp 240w, /aset/maskot/${p.berkas}-480.webp 480w`}
      sizes={`${ukuran}px`}
      width={ukuran}
      height={ukuran}
      alt={alt ?? p.alt}
      loading={prioritas ? "eager" : "lazy"}
      decoding="async"
      draggable="false"
    />
  );
}

/** Maskot dengan gelembung pesan, untuk state kosong/galat/memuat/sukses. */
export function MaskotPesan({ pose, judul, children, aksi, ukuran = 140, className = "" }) {
  return (
    <div className={`maskot-pesan ${className}`}>
      <div className="maskot-pesan__latar" aria-hidden="true" />
      <Maskot pose={pose} ukuran={ukuran} />
      <div className="maskot-pesan__isi">
        {judul && <h3>{judul}</h3>}
        {children && <div className="teks-kecil teks-redup">{children}</div>}
        {aksi && <div className="maskot-pesan__aksi">{aksi}</div>}
      </div>
    </div>
  );
}

/** Pose sesuai tingkat risiko terburuk lokasi. */
export function poseRisiko(level) {
  if (level === "tinggi") return "risiko_tinggi";
  if (level === "sedang") return "risiko_sedang";
  return "risiko_rendah";
}
