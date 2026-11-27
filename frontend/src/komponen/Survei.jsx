import { useRef, useState } from "react";
import { LuCamera, LuCheck, LuImagePlus } from "react-icons/lu";
import { api } from "../lib/api";
import { useKonfigurasi } from "../lib/konfigurasi";
import { useNotifikasi } from "../lib/notifikasi";
import { Lencana, Modal, Pilihan, Tombol } from "./ui";

const BATAS_UKURAN = 15 * 1024 * 1024;
const NADA_PRIORITAS = { mendesak: "bahaya", disarankan: "peringatan", kosmetik: "sukses" };
const NADA_SUMBER = { survei: "sukses", iklan: "peringatan", analis: undefined };
const JARAK_BAWAAN = [
  { kode: "dekat", label: "Dekat (1 m)", keterangan: "Close-up (~1,3 m²)" },
  { kode: "sedang", label: "Sedang (3 m)", keterangan: "Sebagian dinding (~11 m²)" },
  { kode: "jauh", label: "Jauh (5 m)", keterangan: "Satu bidang penuh (~31 m²)" },
];

export function LencanaPrioritas({ kode }) {
  const { prioritas } = useKonfigurasi();
  return <Lencana nada={NADA_PRIORITAS[kode]}>{prioritas[kode]?.label || kode}</Lencana>;
}

export function LencanaSumberFoto({ kode }) {
  const { sumber_foto: sumber } = useKonfigurasi();
  return <Lencana nada={NADA_SUMBER[kode]}>{sumber[kode] || kode}</Lencana>;
}

export function useUnggahFoto(endpoint, onSelesai) {
  const beriTahu = useNotifikasi();
  const [proses, setProses] = useState(false);

  const unggah = async (daftar, { area, sumber, ruang, jarak } = {}) => {
    const berkas = [...daftar].filter((f) => f.type.startsWith("image/"));
    if (!berkas.length) return false;
    if (berkas.some((f) => f.size > BATAS_UKURAN)) {
      beriTahu("Ukuran setiap foto maksimal 15 MB.", "galat");
      return false;
    }
    setProses(true);
    try {
      let hasil;
      for (let i = 0; i < berkas.length; i += 5) {
        const data = new FormData();
        berkas.slice(i, i + 5).forEach((f) => data.append("foto", f));
        if (area) data.append("area", area);
        if (sumber) data.append("sumber", sumber);
        if (ruang) data.append("ruang", ruang);
        if (jarak) data.append("jarak", jarak);
        hasil = await api.unggah(endpoint, data);
      }
      beriTahu(berkas.length > 1 ? `${berkas.length} foto tersimpan.` : "Foto tersimpan.");
      onSelesai(hasil);
      return true;
    } catch (e) {
      beriTahu(e.message, "galat");
      return false;
    } finally {
      setProses(false);
    }
  };

  return { unggah, proses };
}

export function ProgresSurvei({ kelengkapan }) {
  const selesai = kelengkapan.wajib_terisi === kelengkapan.wajib_total;
  return (
    <div className="progres-survei">
      <div className="baris-antara">
        <strong className="teks-kecil">
          {selesai ? "Semua area wajib sudah difoto" : `${kelengkapan.wajib_terisi} dari ${kelengkapan.wajib_total} area wajib difoto`}
        </strong>
        <span className="teks-mini teks-redup angka">{kelengkapan.persen}%</span>
      </div>
      <div className="batang__jalur" role="progressbar" aria-valuenow={kelengkapan.persen} aria-valuemin={0} aria-valuemax={100}>
        <div className="batang__isi" style={{ width: `${Math.max(3, kelengkapan.persen)}%`, background: selesai ? "var(--hijau)" : "var(--biru)" }} />
      </div>
    </div>
  );
}

export function TahapProperti({ tahap, ringkas }) {
  const terakhir = tahap.semua.length - 1;
  const status = (i) => (i < tahap.urutan || (i === terakhir && tahap.urutan === terakhir) ? "selesai" : i === tahap.urutan ? "aktif" : undefined);
  return (
    <ol className={`tahap ${ringkas ? "tahap--ringkas" : ""}`} aria-label={`Tahap ${tahap.label}`}>
      {tahap.semua.map((t, i) => (
        <li key={t.kode} data-status={status(i)} aria-current={i === tahap.urutan ? "step" : undefined}>
          <span className="tahap__titik">{status(i) === "selesai" ? <LuCheck aria-hidden="true" /> : i + 1}</span>
          <span className="tahap__label">{t.label}</span>
        </li>
      ))}
    </ol>
  );
}

export function TombolKamera({ onPilih, memuat, label = "Ambil foto", varian, ukuran, penuh }) {
  const input = useRef(null);
  return (
    <>
      <Tombol ikon={LuCamera} memuat={memuat} varian={varian} ukuran={ukuran} penuh={penuh} onClick={() => input.current?.click()}>
        {label}
      </Tombol>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          onPilih(e.target.files);
          e.target.value = "";
        }}
      />
    </>
  );
}

export function PilihJarakFoto({ nilai, onUbah }) {
  const { jarak_foto: daftarJarak } = useKonfigurasi();
  const opsi = daftarJarak?.length ? daftarJarak : JARAK_BAWAAN;
  return (
    <div>
      <div className="tebal teks-kecil" style={{ marginBottom: 6 }}>
        Jarak pengambilan foto
      </div>
      <div className="pilihan-kartu" role="radiogroup" aria-label="Jarak pengambilan foto" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {opsi.map((j) => (
          <label key={j.kode}>
            <input type="radio" name="jarak_foto" checked={nilai === j.kode} onChange={() => onUbah(j.kode)} />
            <span className="pilihan-kartu__isi tebal teks-kecil">{j.label}</span>
            <span className="teks-mini teks-redup">{j.keterangan}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function ModalUnggahFoto({ terbuka, onTutup, endpoint, onSelesai, sumberTetap, areaAwal = "lainnya" }) {
  const { area_foto: daftarArea } = useKonfigurasi();
  const [area, setArea] = useState(areaAwal);
  const [sumber, setSumber] = useState(sumberTetap || "survei");
  const [jarak, setJarak] = useState("sedang");
  const [seret, setSeret] = useState(false);
  const input = useRef(null);
  const { unggah, proses } = useUnggahFoto(endpoint, onSelesai);

  const kirim = async (berkas) => {
    if (await unggah(berkas, { area, sumber: sumberTetap || sumber, jarak })) onTutup();
  };

  return (
    <Modal terbuka={terbuka} onTutup={() => !proses && onTutup()} judul="Tambah foto bangunan" deskripsi="Pilih area dan jarak foto agar estimasi luas kerusakan lebih presisi.">
      <div className="tumpuk">
        <Pilihan label="Area yang difoto" value={area} onChange={(e) => setArea(e.target.value)} opsi={daftarArea.map((a) => ({ nilai: a.kode, label: a.label }))} />
        <PilihJarakFoto nilai={jarak} onUbah={setJarak} />
        {!sumberTetap && (
          <div className="pilihan-kartu" role="radiogroup" aria-label="Sumber foto" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <label>
              <input type="radio" name="sumber" checked={sumber === "survei"} onChange={() => setSumber("survei")} />
              <span className="pilihan-kartu__isi tebal teks-kecil">Saya foto saat survei</span>
              <span className="teks-mini teks-redup">Dihitung dalam kelengkapan survei.</span>
            </label>
            <label>
              <input type="radio" name="sumber" checked={sumber === "iklan"} onChange={() => setSumber("iklan")} />
              <span className="pilihan-kartu__isi tebal teks-kecil">Dari iklan / penjual</span>
              <span className="teks-mini teks-redup">Ditandai belum diverifikasi di laporan.</span>
            </label>
          </div>
        )}
        <label
          className={`zona-unggah ${seret ? "zona-unggah--aktif" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setSeret(true);
          }}
          onDragLeave={() => setSeret(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSeret(false);
            kirim(e.dataTransfer.files);
          }}
        >
          {proses ? <span className="pemuat" style={{ color: "var(--biru)" }} /> : <LuImagePlus aria-hidden="true" />}
          <strong>{proses ? "Mengunggah…" : "Pilih atau seret foto ke sini"}</strong>
          <span className="teks-mini teks-redup">JPG, PNG, atau WEBP. Foto otomatis diperkecil dan data lokasi GPS di dalamnya dihapus.</span>
          <input ref={input} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => kirim(e.target.files)} disabled={proses} />
        </label>
      </div>
    </Modal>
  );
}
