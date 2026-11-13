const BASIS_API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const KUNCI_TOKEN = "homewise_token";

export class GalatApi extends Error {
  constructor(pesan, status, detail) {
    super(pesan);
    this.status = status;
    this.detail = detail;
  }
}

export const token = {
  ambil: () => localStorage.getItem(KUNCI_TOKEN),
  simpan: (nilai) => localStorage.setItem(KUNCI_TOKEN, nilai),
  hapus: () => localStorage.removeItem(KUNCI_TOKEN),
};

export function urlBerkas(jalur) {
  if (!jalur) return null;
  return jalur.startsWith("http") ? jalur : `${BASIS_API}${jalur}`;
}

async function permintaan(metode, jalur, isi, { mentah = false } = {}) {
  const header = {};
  const tokenAktif = token.ambil();
  if (tokenAktif) header.Authorization = `Bearer ${tokenAktif}`;

  let body;
  if (isi instanceof FormData) {
    body = isi;
  } else if (isi !== undefined) {
    header["Content-Type"] = "application/json";
    body = JSON.stringify(isi);
  }

  let respon;
  try {
    respon = await fetch(`${BASIS_API}/api${jalur}`, { method: metode, headers: header, body });
  } catch {
    throw new GalatApi("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.", 0);
  }

  if (respon.status === 401 && tokenAktif) {
    token.hapus();
    window.dispatchEvent(new Event("homewise:keluar"));
  }

  if (mentah && respon.ok) return respon;

  const data = await respon.json().catch(() => ({}));
  if (!respon.ok || data.sukses === false) {
    throw new GalatApi(data.pesan || "Terjadi kesalahan. Coba lagi.", respon.status, data.detail);
  }
  return data.data;
}

export const api = {
  get: (jalur) => permintaan("GET", jalur),
  post: (jalur, isi = {}) => permintaan("POST", jalur, isi),
  put: (jalur, isi = {}) => permintaan("PUT", jalur, isi),
  patch: (jalur, isi = {}) => permintaan("PATCH", jalur, isi),
  hapus: (jalur) => permintaan("DELETE", jalur),
  unggah: (jalur, formData) => permintaan("POST", jalur, formData),

  async unduh(jalur, namaBerkas) {
    const respon = await permintaan("GET", jalur, undefined, { mentah: true });
    const blob = await respon.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = namaBerkas;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
