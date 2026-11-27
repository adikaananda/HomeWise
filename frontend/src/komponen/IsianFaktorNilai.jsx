import { Isian, Pilihan } from "./ui";

// Isian faktor penilaian berdasarkan Rijasa, Sukrawa & Nadiasa (2014), Jurnal Spektran 2(2).
// Nilai kosong ("") berarti belum diisi: backend memakai deteksi otomatis atau menganggapnya tidak ada.

const YA_TIDAK = [
  { nilai: "", label: "Belum tahu" },
  { nilai: "ya", label: "Ya" },
  { nilai: "tidak", label: "Tidak" },
];
const YA_TIDAK_OTOMATIS = [
  { nilai: "", label: "Deteksi otomatis" },
  { nilai: "ya", label: "Ya, dekat" },
  { nilai: "tidak", label: "Tidak" },
];

export const OPSI_FAKTOR = {
  bentuk_tanah: [
    { nilai: "", label: "Belum tahu" },
    { nilai: "persegi", label: "Persegi / persegi panjang" },
    { nilai: "tidak_beraturan", label: "Trapesium / jajaran genjang / L" },
    { nilai: "lainnya", label: "Bentuk lain" },
  ],
  posisi_tanah: [
    { nilai: "", label: "Belum tahu" },
    { nilai: "interior", label: "Interior (di tengah deretan)" },
    { nilai: "hook", label: "Hook (di pojok / sudut jalan)" },
    { nilai: "tusuk_sate", label: "Tusuk sate (menghadap ujung jalan)" },
    { nilai: "lainnya", label: "Lainnya" },
  ],
  legalitas_tanah: [
    { nilai: "", label: "Belum tahu" },
    { nilai: "shm", label: "SHM (Sertifikat Hak Milik)" },
    { nilai: "hgb", label: "HGB" },
    { nilai: "lainnya", label: "Girik / petok / lainnya" },
  ],
  legalitas_bangunan: [
    { nilai: "", label: "Belum tahu" },
    { nilai: "ada", label: "Ada IMB / PBG" },
    { nilai: "tidak", label: "Tidak ada" },
  ],
  kondisi: [
    { nilai: "", label: "Belum dinilai" },
    { nilai: "baik", label: "Baik" },
    { nilai: "sedang", label: "Sedang" },
    { nilai: "kurang", label: "Kurang baik" },
  ],
  citra_lokasi: [
    { nilai: "", label: "Belum dinilai" },
    { nilai: "baik_sekali", label: "Baik sekali (kawasan bergengsi)" },
    { nilai: "biasa", label: "Biasa" },
    { nilai: "kurang", label: "Kurang baik" },
  ],
  struktur_bangunan: [
    { nilai: "", label: "Ikuti jumlah lantai" },
    { nilai: "permanen", label: "Permanen 1 lantai" },
    { nilai: "bertingkat", label: "Bertingkat" },
    { nilai: "semi_permanen", label: "Semi permanen" },
  ],
  kelas_bahan: [
    { nilai: "", label: "Belum dinilai" },
    { nilai: "kelas_1", label: "Kelas I (premium: granit, kusen kayu kelas I, atap keramik)" },
    { nilai: "kelas_2", label: "Kelas II (menengah: keramik, kusen aluminium)" },
    { nilai: "biasa", label: "Standar / sederhana" },
  ],
};

export const KAWASAN = [
  { nilai: "pusat_kota", label: "Permukiman pusat kota" },
  { nilai: "perdagangan_jasa", label: "Perdagangan & jasa" },
  { nilai: "pariwisata", label: "Pariwisata" },
  { nilai: "kdb30", label: "Permukiman KDB 30% (RDTR)" },
];

const keBool = (v) => (v === "ya" ? true : v === "tidak" ? false : null);
const dariBool = (v) => (v === true ? "ya" : v === false ? "tidak" : "");

/** Ubah spesifikasi tersimpan menjadi nilai form (string). */
export function faktorKeForm(spek = {}) {
  return {
    bentuk_tanah: spek.bentuk_tanah || "",
    posisi_tanah: spek.posisi_tanah || "",
    ketinggian_tanah_m: spek.ketinggian_tanah_m ?? "",
    legalitas_tanah: spek.legalitas_tanah || "",
    legalitas_bangunan: spek.legalitas_bangunan || "",
    landscape_view: dariBool(spek.landscape_view),
    kondisi_lingkungan: spek.kondisi_lingkungan || "",
    lebar_jalan_depan_m: spek.lebar_jalan_depan_m ?? "",
    lebar_jalan_menuju_m: spek.lebar_jalan_menuju_m ?? "",
    kondisi_jalan: spek.kondisi_jalan || "",
    citra_lokasi: spek.citra_lokasi || "",
    kawasan_manual: Array.isArray(spek.kawasan),
    kawasan: spek.kawasan || [],
    dekat_sutet: dariBool(spek.dekat_sutet),
    dekat_kuburan: dariBool(spek.dekat_kuburan),
    dekat_polusi_udara: dariBool(spek.dekat_polusi_udara),
    dekat_polusi_suara: dariBool(spek.dekat_polusi_suara),
    struktur_bangunan: spek.struktur_bangunan || "",
    tampilan_tren: dariBool(spek.tampilan_tren),
    kelas_bahan: spek.kelas_bahan || "",
  };
}

/** Ubah nilai form menjadi payload spesifikasi. Kunci kosong dikirim null agar terhapus di server. */
export function formKeFaktor(f) {
  const angka = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
  const teks = (v) => v || null;
  return {
    bentuk_tanah: teks(f.bentuk_tanah),
    posisi_tanah: teks(f.posisi_tanah),
    ketinggian_tanah_m: angka(f.ketinggian_tanah_m),
    legalitas_tanah: teks(f.legalitas_tanah),
    legalitas_bangunan: teks(f.legalitas_bangunan),
    landscape_view: keBool(f.landscape_view),
    kondisi_lingkungan: teks(f.kondisi_lingkungan),
    lebar_jalan_depan_m: angka(f.lebar_jalan_depan_m),
    lebar_jalan_menuju_m: angka(f.lebar_jalan_menuju_m),
    kondisi_jalan: teks(f.kondisi_jalan),
    citra_lokasi: teks(f.citra_lokasi),
    kawasan: f.kawasan_manual ? f.kawasan : null,
    dekat_sutet: keBool(f.dekat_sutet),
    dekat_kuburan: keBool(f.dekat_kuburan),
    dekat_polusi_udara: keBool(f.dekat_polusi_udara),
    dekat_polusi_suara: keBool(f.dekat_polusi_suara),
    struktur_bangunan: teks(f.struktur_bangunan),
    tampilan_tren: keBool(f.tampilan_tren),
    kelas_bahan: teks(f.kelas_bahan),
  };
}

export function IsianFaktorNilai({ nilai, onUbah, ringkas = false }) {
  const ubah = (kunci) => (e) => onUbah({ ...nilai, [kunci]: e.target.value });
  const pilih = (kunci, label, opsi, bantuan) => (
    <Pilihan label={label} value={nilai[kunci]} onChange={ubah(kunci)} opsi={opsi} bantuan={bantuan} />
  );
  const centangKawasan = (kode) => {
    const ada = nilai.kawasan.includes(kode);
    onUbah({ ...nilai, kawasan: ada ? nilai.kawasan.filter((k) => k !== kode) : [...nilai.kawasan, kode] });
  };

  return (
    <div className="faktor-isian">
      <fieldset className="kelompok-isian">
        <legend>Karakteristik tanah</legend>
        <div className="kisi-2">
          {pilih("posisi_tanah", "Posisi tanah", OPSI_FAKTOR.posisi_tanah, "Tusuk sate menurunkan nilai; hook (pojok) paling menaikkan.")}
          {pilih("bentuk_tanah", "Bentuk tanah", OPSI_FAKTOR.bentuk_tanah)}
          {pilih("legalitas_tanah", "Legalitas tanah", OPSI_FAKTOR.legalitas_tanah)}
          <Isian
            label="Ketinggian tanah dari jalan (m)"
            type="number"
            step="0.1"
            min="-10"
            max="10"
            value={nilai.ketinggian_tanah_m}
            onChange={ubah("ketinggian_tanah_m")}
            bantuan="Positif bila lebih tinggi dari jalan depan, negatif bila lebih rendah."
          />
        </div>
      </fieldset>

      <fieldset className="kelompok-isian">
        <legend>Lingkungan</legend>
        <div className="kisi-2">
          <Isian
            label="Lebar jalan depan tanah (m)"
            type="number"
            step="0.5"
            min="0"
            value={nilai.lebar_jalan_depan_m}
            onChange={ubah("lebar_jalan_depan_m")}
            bantuan="Faktor positif paling dominan di kelompok lingkungan. Kosongkan untuk memakai data OpenStreetMap."
          />
          <Isian
            label="Lebar jalan menuju lokasi (m)"
            type="number"
            step="0.5"
            min="0"
            value={nilai.lebar_jalan_menuju_m}
            onChange={ubah("lebar_jalan_menuju_m")}
            bantuan="Jalan tersempit dari jalan utama sampai depan rumah."
          />
          {pilih("kondisi_jalan", "Kondisi jalan", OPSI_FAKTOR.kondisi)}
          {pilih("kondisi_lingkungan", "Kondisi lingkungan sekitar", OPSI_FAKTOR.kondisi, "Kebersihan, drainase, keamanan, kerapian tetangga.")}
          {!ringkas && pilih("landscape_view", "Punya landscape view", YA_TIDAK, "Pemandangan sawah, laut, taman, atau gunung.")}
        </div>
      </fieldset>

      <fieldset className="kelompok-isian">
        <legend>Lokasi</legend>
        {!ringkas && (
          <p className="teks-mini teks-redup" style={{ marginBottom: 10 }}>
            Jarak ke sekolah, kesehatan, belanja, rekreasi, SUTET, kuburan, dan kawasan industri dideteksi otomatis dari OpenStreetMap. Isi di sini
            hanya bila hasil deteksi tidak sesuai kondisi lapangan.
          </p>
        )}
        <div className="kisi-2">
          {pilih("citra_lokasi", "Citra lokasi", OPSI_FAKTOR.citra_lokasi, "Reputasi kawasan di mata pembeli.")}
          {!ringkas && pilih("dekat_sutet", "Dekat SUTET / SUTT (≤ 200 m)", YA_TIDAK_OTOMATIS)}
          {!ringkas && pilih("dekat_kuburan", "Dekat kuburan / setra (≤ 200 m)", YA_TIDAK_OTOMATIS)}
          {!ringkas && pilih("dekat_polusi_udara", "Dekat sumber polusi udara", YA_TIDAK_OTOMATIS, "Pabrik, bengkel cat, TPA.")}
          {!ringkas && pilih("dekat_polusi_suara", "Dekat sumber kebisingan", YA_TIDAK_OTOMATIS, "Jalan arteri, bandara, tempat hiburan.")}
        </div>
        <div className="kawasan-pilih">
          <label className="baris" style={{ gap: 8 }}>
            <input type="checkbox" checked={nilai.kawasan_manual} onChange={(e) => onUbah({ ...nilai, kawasan_manual: e.target.checked })} />
            <span className="teks-kecil tebal">Tentukan kawasan sendiri</span>
          </label>
          <p className="teks-mini teks-redup">
            {nilai.kawasan_manual
              ? "Centang semua yang berlaku. Cek peruntukan di RDTR atau Keterangan Rencana Kota (KRK)."
              : "Otomatis: pusat kota (≤ 2,5 km dari Puputan Badung / Niti Mandala Renon), perdagangan dari karakter kawasan, pariwisata dari jumlah akomodasi."}
          </p>
          {nilai.kawasan_manual && (
            <div className="kawasan-pilih__opsi">
              {KAWASAN.map((k) => (
                <label key={k.nilai} className="chip-centang">
                  <input type="checkbox" checked={nilai.kawasan.includes(k.nilai)} onChange={() => centangKawasan(k.nilai)} />
                  {k.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </fieldset>

      <fieldset className="kelompok-isian">
        <legend>Karakteristik bangunan</legend>
        <div className="kisi-2">
          {pilih("struktur_bangunan", "Struktur bangunan", OPSI_FAKTOR.struktur_bangunan)}
          {pilih("kelas_bahan", "Kelas bahan bangunan", OPSI_FAKTOR.kelas_bahan)}
          {pilih("legalitas_bangunan", "Izin bangunan", OPSI_FAKTOR.legalitas_bangunan)}
          {pilih("tampilan_tren", "Tampilan mengikuti tren", YA_TIDAK, "Fasad modern / sesuai selera pasar saat ini.")}
        </div>
      </fieldset>
    </div>
  );
}
