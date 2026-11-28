import { useState } from "react";
import { LuCircleCheck, LuGauge, LuCircleHelp, LuCircleMinus, LuPencil, LuTrendingDown, LuTrendingUp, LuTriangleAlert } from "react-icons/lu";
import { IsianFaktorNilai, faktorKeForm, formKeFaktor } from "../../../komponen/IsianFaktorNilai";
import { Kartu, Lencana, Modal, Pemberitahuan, Tombol } from "../../../komponen/ui";
import { api } from "../../../lib/api";
import { Maskot } from "../../../komponen/Maskot";
import { AngkaHidup, Muncul } from "../../../lib/gerak";
import { useAksi } from "../../../lib/hooks";
import { useNotifikasi } from "../../../lib/notifikasi";

const WARNA_KELOMPOK = {
  lokasi: "linear-gradient(90deg, #0832c8, #0a43ef)",
  lingkungan: "linear-gradient(90deg, #14bace, #2acafc)",
  bangunan: "linear-gradient(90deg, #008c73, #14bace)",
  tanah: "linear-gradient(90deg, #51da9e, #a1e05b)",
};

const CARA_MENILAI = [
  "Data lokasi (fasilitas, jalan, SUTET, kuburan, kawasan industri, area wisata) dideteksi otomatis dari peta terbuka.",
  "Data tanah dan bangunan diambil dari isian Anda dan hasil analisis foto AI.",
  "Jarak dekat ≤ 1 km dan sedang 1–3 km untuk sekolah, fasilitas kesehatan, belanja, dan rekreasi.",
  "Faktor yang belum diisi dianggap tidak ada, jadi lengkapi data untuk hasil yang lebih akurat.",
  "Model dikalibrasi dengan data penilaian rumah tinggal di Kota Denpasar oleh para penilai profesional.",
];

function StatusSorotan({ arah, status }) {
  if (status === "belum_diketahui") return <Lencana nada="peringatan" ikon={LuCircleHelp}>Belum diketahui</Lencana>;
  if (arah === "positif") {
    return status === "ya" ? <Lencana nada="sukses" ikon={LuCircleCheck}>Dimiliki</Lencana> : <Lencana nada="netral" ikon={LuCircleMinus}>Tidak</Lencana>;
  }
  return status === "ya" ? <Lencana nada="bahaya" ikon={LuTriangleAlert}>Terdeteksi</Lencana> : <Lencana nada="sukses" ikon={LuCircleCheck}>Aman</Lencana>;
}

function PeringkatKelompok({ kelompok }) {
  const maks = Math.max(...kelompok.map((k) => k.bobot_relatif));
  return (
    <Kartu judul="Bobot pengaruh tiap kelompok" sub="Lokasi paling menentukan nilai rumah, disusul lingkungan, bangunan, dan karakteristik tanah.">
      <ol className="peringkat-kelompok">
        {kelompok.map((k) => (
          <li key={k.kode}>
            <div className="peringkat-kelompok__atas">
              <span className="peringkat-kelompok__no">{k.peringkat}</span>
              <strong>{k.label}</strong>
              <span className="angka tebal" style={{ marginLeft: "auto" }}>
                <AngkaHidup nilai={k.bobot_relatif} format={(n) => `${Math.round(n)}%`} />
              </span>
            </div>
            <div className="batang__jalur">
              <div className="batang__isi batang-tumbuh" style={{ "--lebar": `${(k.bobot_relatif / maks) * 100}%`, background: WARNA_KELOMPOK[k.kode] }} />
            </div>
            <div className="peringkat-kelompok__dominan teks-mini">
              <span>
                <LuTrendingUp aria-hidden="true" /> {k.dominan_positif}
              </span>
              <span>
                <LuTrendingDown aria-hidden="true" /> {k.dominan_negatif}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </Kartu>
  );
}

function SorotanSimpulan({ sorotan }) {
  const baris = (arah) => sorotan.filter((s) => s.arah === arah);
  const Kolom = ({ arah, judul, Ikon }) => (
    <div className="sorotan-kolom">
      <h4 className={`sorotan-kolom__judul sorotan-kolom__judul--${arah}`}>
        <Ikon aria-hidden="true" /> {judul}
      </h4>
      <ul>
        {baris(arah).map((s) => (
          <li key={s.faktor}>
            <div className="baris-antara" style={{ gap: 10, alignItems: "flex-start" }}>
              <div>
                <span className="teks-mini teks-redup">{s.kelompok}</span>
                <strong className="teks-kecil" style={{ display: "block" }}>{s.faktor}</strong>
              </div>
              <StatusSorotan arah={arah} status={s.status} />
            </div>
            <p className="teks-mini teks-redup" style={{ marginTop: 4 }}>{s.keterangan}</p>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <Kartu judul="Faktor kunci properti ini" sub="Faktor yang paling menaikkan dan paling menurunkan nilai di tiap kelompok, dicek langsung untuk properti ini.">
      <div className="sorotan-grid">
        <Kolom arah="positif" judul="Paling menaikkan nilai" Ikon={LuTrendingUp} />
        <Kolom arah="negatif" judul="Paling menurunkan nilai" Ikon={LuTrendingDown} />
      </div>
    </Kartu>
  );
}

function RincianKelompok({ kelompok }) {
  return (
    <Kartu judul="Rincian semua faktor" sub="Kondisi tiap faktor, asal datanya, dan seberapa besar pengaruhnya terhadap nilai rumah.">
      <div className="tumpuk" style={{ gap: 10 }}>
        {kelompok.map((k) => (
          <details key={k.kode} className="rincian-kelompok" open={k.peringkat === 1}>
            <summary>
              <span className="rincian-kelompok__titik" style={{ background: WARNA_KELOMPOK[k.kode] }} />
              <strong>{k.label}</strong>
              <span className="teks-mini teks-redup">{k.faktor.filter((f) => f.aktif).length} faktor berpengaruh</span>
            </summary>
            <div className="tabel-wadah">
              <table className="tabel tabel--rapat">
                <thead>
                  <tr>
                    <th>Faktor</th>
                    <th>Properti ini</th>
                    <th>Sumber data</th>
                    <th className="kanan">Pengaruh</th>
                  </tr>
                </thead>
                <tbody>
                  {k.faktor.map((f) => (
                    <tr key={f.kode} className={f.aktif ? "" : "baris-pudar"}>
                      <td>
                        <strong className="teks-kecil">{f.label}</strong>
                      </td>
                      <td className="teks-kecil">{f.keterangan}</td>
                      <td>
                        <span className={`asal-data asal-data--${f.sumber}`}>{f.label_sumber}</span>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }} className={`kanan angka tebal ${f.kontribusi > 0 ? "teks-sukses" : f.kontribusi < 0 ? "teks-bahaya" : "teks-redup"}`}>
                        {f.kontribusi === 0 ? "–" : `${f.persen > 0 ? "+" : ""}${f.persen.toLocaleString("id-ID")}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>
    </Kartu>
  );
}

function PenggerakNilai({ penilaian }) {
  const maks = Math.max(1, ...penilaian.positif.map((f) => f.persen), ...penilaian.negatif.map((f) => Math.abs(f.persen)));
  const Baris = ({ f, nada }) => (
    <li className="penggerak__baris">
      <span className="teks-kecil">{f.label}</span>
      <span className="penggerak__jalur">
        <span className={`penggerak__isi penggerak__isi--${nada}`} style={{ "--lebar": `${(Math.abs(f.persen) / maks) * 100}%` }} />
      </span>
      <strong className={`angka teks-kecil ${nada === "naik" ? "teks-sukses" : "teks-biru"}`}>
        {f.persen > 0 ? "+" : ""}
        {f.persen.toLocaleString("id-ID")}%
      </strong>
    </li>
  );
  return (
    <Kartu judul="Penggerak nilai" sub="Porsi pengaruh tiap faktor terhadap nilai rumah ini.">
      <Muncul className="penggerak">
        <span className="teks-mini tebal teks-sukses">Menaikkan nilai</span>
        <ul>
          {penilaian.positif.slice(0, 5).map((f) => (
            <Baris key={f.kode} f={f} nada="naik" />
          ))}
        </ul>
        <span className="teks-mini tebal teks-biru" style={{ marginTop: 12 }}>
          Menurunkan nilai
        </span>
        {penilaian.negatif.length ? (
          <ul>
            {penilaian.negatif.map((f) => (
              <Baris key={f.kode} f={f} nada="turun" />
            ))}
          </ul>
        ) : (
          <p className="teks-kecil teks-redup">Tidak ada faktor penurun nilai yang terdeteksi.</p>
        )}
      </Muncul>
    </Kartu>
  );
}

function ModalLengkapi({ terbuka, onTutup, properti, onSelesai }) {
  const beriTahu = useNotifikasi();
  const [form, setForm] = useState(() => faktorKeForm(properti.spesifikasi || {}));
  const [proses, jalankan] = useAksi();
  const simpan = () =>
    jalankan(async () => {
      try {
        const hasil = await api.patch(`/properti/${properti.id}`, { spesifikasi: formKeFaktor(form) });
        onSelesai(hasil);
        beriTahu("Faktor penilaian disimpan.");
        onTutup();
      } catch (e) {
        beriTahu(e.message, "galat");
      }
    });
  return (
    <Modal
      terbuka={terbuka}
      onTutup={onTutup}
      lebar={760}
      judul="Lengkapi faktor penilaian"
      deskripsi="Isi dari survei lapangan, sertifikat, atau keterangan agen. Yang dikosongkan memakai deteksi otomatis atau dianggap tidak ada."
      aksi={
        <>
          <Tombol varian="hantu" onClick={onTutup}>Batal</Tombol>
          <Tombol onClick={simpan} disabled={proses}>Simpan & hitung ulang</Tombol>
        </>
      }
    >
      <IsianFaktorNilai nilai={form} onUbah={setForm} />
    </Modal>
  );
}

export function TabNilai({ detail, setDetail, milikSendiri }) {
  const { penilaian, properti } = detail;
  const [ubah, setUbah] = useState(false);
  if (!penilaian) return null;
  const { kelengkapan } = penilaian;
  const persen = Math.round((kelengkapan.terisi / kelengkapan.total) * 100);

  return (
    <div className="tumpuk" style={{ gap: 20 }}>
      <Kartu rapat className="kartu-nilai-kepala">
        <div className="kepala-nilai">
          <Maskot pose={penilaian.negatif.length > 1 ? "peringatan" : "investasi"} ukuran={110} className="kepala-nilai__maskot" />
          <div className="kepala-nilai__teks">
            <span className="eyebrow-gradasi" style={{ alignSelf: "flex-start" }}>
              <LuGauge aria-hidden="true" /> HomeWise Value Engine
            </span>
            <h3>Faktor yang memengaruhi nilai rumah ini</h3>
            <p className="teks-kecil teks-redup">
              HomeWise memeriksa lebih dari 40 faktor tanah, lingkungan, lokasi, dan bangunan, lalu menunjukkan mana yang menaikkan dan menurunkan
              nilai properti. Makin lengkap datanya, makin tajam hasilnya.
            </p>
          </div>
          <div className="kepala-nilai__lengkap">
            <span className="teks-mini teks-redup">Kelengkapan data faktor</span>
            <strong className="angka">
              {kelengkapan.terisi}/{kelengkapan.total} faktor
            </strong>
            <div className="batang__jalur">
              <div className="batang__isi" style={{ width: `${persen}%`, background: persen >= 80 ? "var(--gr-tosca-mint)" : "var(--gr-biru-langit)" }} />
            </div>
            {milikSendiri && (
              <Tombol ukuran="kecil" varian="sekunder" ikon={LuPencil} onClick={() => setUbah(true)}>
                Lengkapi faktor
              </Tombol>
            )}
          </div>
        </div>
        {kelengkapan.belum.length > 0 && (
          <p className="teks-mini teks-redup" style={{ marginTop: 10 }}>
            Belum diisi: {kelengkapan.belum.join(", ")}.
          </p>
        )}
      </Kartu>

      {!penilaian.berlaku && (
        <Pemberitahuan nada="info" judul="Akurasi terbaik untuk Denpasar & sekitarnya">
          {penilaian.cakupan}
        </Pemberitahuan>
      )}

      <div className="kisi-nilai">
        <PeringkatKelompok kelompok={penilaian.kelompok} />
        <PenggerakNilai penilaian={penilaian} />
      </div>
      <SorotanSimpulan sorotan={penilaian.sorotan} />
      <RincianKelompok kelompok={penilaian.kelompok} />

      <details className="metode-volume">
        <summary className="teks-kecil tebal">Cara HomeWise menilai</summary>
        <ul className="teks-kecil">
          {CARA_MENILAI.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </details>

      {ubah && <ModalLengkapi terbuka={ubah} onTutup={() => setUbah(false)} properti={properti} onSelesai={setDetail} />}
    </div>
  );
}
