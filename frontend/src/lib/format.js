const formatRupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const formatAngka = new Intl.NumberFormat("id-ID");

export function rupiah(nilai) {
  return formatRupiah.format(Number(nilai) || 0).replace(/\s/g, "");
}

export function rupiahRingkas(nilai) {
  const n = Number(nilai) || 0;
  if (n >= 1e12) return `Rp${(n / 1e12).toLocaleString("id-ID", { maximumFractionDigits: 2 })} T`;
  if (n >= 1e9) return `Rp${(n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
  if (n >= 1e6) return `Rp${(n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  return rupiah(n);
}

export function angka(nilai) {
  return formatAngka.format(Number(nilai) || 0);
}

export function jarak(meter) {
  if (meter == null) return "-";
  return meter >= 1000 ? `${(meter / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km` : `${meter} m`;
}

export function tanggal(teks, denganJam = false) {
  if (!teks) return "-";
  const waktu = new Date(teks.includes("T") ? teks : `${teks.replace(" ", "T")}Z`);
  return waktu.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(denganJam ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function inisial(nama = "") {
  return nama
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((kata) => kata[0].toUpperCase())
    .join("");
}

export function warnaSkor(skor) {
  if (skor == null) return "var(--abu-muda)";
  if (skor >= 80) return "var(--hijau)";
  if (skor >= 65) return "var(--tosca)";
  if (skor >= 50) return "#d99a00";
  return "var(--bahaya)";
}

export function nadaLevel(level) {
  return { rendah: "sukses", ringan: "sukses", sedang: "peringatan", tinggi: "bahaya", berat: "bahaya" }[level] || "netral";
}

export function kapital(teks = "") {
  const bersih = String(teks).replace(/_/g, " ");
  return bersih.charAt(0).toUpperCase() + bersih.slice(1);
}
