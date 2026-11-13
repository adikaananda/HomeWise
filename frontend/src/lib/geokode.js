const POLA_KOORDINAT = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

export function bacaKoordinat(teks) {
  const cocok = POLA_KOORDINAT.exec(teks || "");
  if (!cocok) return null;
  const lat = Number(cocok[1]);
  const lng = Number(cocok[2]);
  if (lat < -11.5 || lat > 6.5 || lng < 94.5 || lng > 141.5) return null;
  return { lat, lng };
}

export async function cariAlamat(teks) {
  const koordinat = bacaKoordinat(teks);
  if (koordinat) return [{ ...koordinat, label: `${koordinat.lat}, ${koordinat.lng}` }];

  const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=id&limit=5&accept-language=id&q=${encodeURIComponent(teks)}`;
  const respon = await fetch(url, { headers: { Accept: "application/json" } });
  if (!respon.ok) throw new Error("Pencarian alamat sedang tidak tersedia.");
  const hasil = await respon.json();
  return hasil.map((h) => ({ lat: Number(h.lat), lng: Number(h.lon), label: h.display_name }));
}

export const LOKASI_CONTOH = [
  { label: "Bintaro, Tangerang Selatan", lat: -6.27805, lng: 106.71498 },
  { label: "Dago, Bandung", lat: -6.88672, lng: 107.61331 },
  { label: "Bekasi Utara", lat: -6.22664, lng: 107.00058 },
  { label: "Sleman, Yogyakarta", lat: -7.71556, lng: 110.35556 },
];
