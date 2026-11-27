import { useState } from "react";
import { LuBookOpen, LuCircleCheck, LuCircleHelp, LuCircleMinus, LuPencil, LuTrendingDown, LuTrendingUp, LuTriangleAlert } from "react-icons/lu";
import { IsianFaktorNilai, faktorKeForm, formKeFaktor } from "../../../komponen/IsianFaktorNilai";
import { Kartu, Lencana, Modal, Pemberitahuan, Tombol } from "../../../komponen/ui";
import { api } from "../../../lib/api";
import { rupiah, rupiahRingkas } from "../../../lib/format";
import { useAksi } from "../../../lib/hooks";
import { useNotifikasi } from "../../../lib/notifikasi";

const WARNA_KELOMPOK = {
  lokasi: "var(--biru, #2563eb)",
  lingkungan: "#0d9488",
  bangunan: "#7c3aed",
  tanah: "#d97706",
};

function StatusSorotan({ arah, status }) {
  if (status === "belum_diketahui") return <Lencana nada="peringatan" ikon={LuCircleHelp}>Belum diketahui</Lencana>;
  if (arah === "positif") {
    return status === "ya" ? <Lencana nada="sukses" ikon={LuCircleCheck}>Dimiliki</Lencana> : <Lencana nada="netral" ikon={LuCircleMinus}>Tidak</Lencana>;
  }
  return status === "ya" ? <Lencana nada="bahaya" ikon={LuTriangleAlert}>Terdeteksi</Lencana> : <Lencana nada="sukses" ikon={LuCircleCheck}>Aman</Lencana>;
}

function PeringkatKelompok({ kelompok }) {
  const maks = Math.max(...kelompok.map((k) => k.eigen));
  return (
    <Kartu
      judul="Kelompok faktor paling berpengaruh"
      sub="Peringkat dari eigenvalue analisis faktor atas persepsi 27 ahli penilai. Makin tinggi, makin besar pengaruh kelompok terhadap nilai rumah."
    >
      <ol className="peringkat-kelompok">
        {kelompok.map((k) => (
          <li key={k.kode}>
            <div className="peringkat-kelompok__atas">
              <span className="peringkat-kelompok__no">{k.peringkat}</span>
              <strong>{k.label}</strong>
              <span className="angka tebal" style={{ marginLeft: "auto" }}>
                {k.eigen.toLocaleString("id-ID", { minimumFractionDigits: 3 })}
              </span>
            </div>
            <div className="batang__jalur">
              <div className="batang__isi" style={{ width: `${(k.eigen / maks) * 100}%`, background: WARNA_KELOMPOK[k.kode] }} />
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
    <Kartu judul="Faktor dominan menurut penelitian" sub="Satu faktor paling menaikkan dan satu paling menurunkan nilai di tiap kelompok, dicocokkan dengan properti ini.">
      <div className="sorotan-grid">
        <Kolom arah="positif" judul="Paling menaikkan nilai" Ikon={LuTrendingUp} />
        <Kolom arah="negatif" judul="Paling menurunkan nilai" Ikon={LuTrendingDown} />
      </div>
    </Kartu>
  );
}

function RincianKelompok({ kelompok }) {
  return (
    <Kartu judul="Rincian semua faktor" sub="Nilai tiap faktor untuk properti ini, asal datanya, dan pengaruhnya pada nilai model. Faktor bernilai nol tidak memengaruhi nilai.">
      <div className="tumpuk" style={{ gap: 10 }}>
        {kelompok.map((k) => (
          <details key={k.kode} className="rincian-kelompok" open={k.peringkat === 1}>
            <summary>
              <span className="rincian-kelompok__titik" style={{ background: WARNA_KELOMPOK[k.kode] }} />
              <strong>{k.label}</strong>
              <span className="teks-mini teks-redup">{k.faktor.length} variabel</span>
              <span className="angka tebal" style={{ marginLeft: "auto" }}>{k.kontribusi >= 0 ? "+" : "−"}{rupiahRingkas(Math.abs(k.kontribusi))}</span>
            </summary>
            <div className="tabel-wadah">
              <table className="tabel tabel--rapat">
                <thead>
                  <tr>
                    <th>Faktor</th>
                    <th>Properti ini</th>
                    <th>Asal data</th>
                    <th className="kanan">Koefisien</th>
                    <th className="kanan">Pengaruh</th>
                  </tr>
                </thead>
                <tbody>
                  {k.faktor.map((f) => (
                    <tr key={f.kode} className={f.aktif ? "" : "baris-pudar"}>
                      <td>
                        <strong className="teks-kecil">{f.label}</strong>
                        <span className="teks-mini teks-redup" style={{ display: "block" }}>{f.kode} · β {f.beta.toLocaleString("id-ID")}</span>
                      </td>
                      <td className="teks-kecil">{f.keterangan}</td>
                      <td>
                        <span className={`asal-data asal-data--${f.sumber}`}>{f.label_sumber}</span>
                      </td>
                      <td className="kanan teks-mini angka" style={{ whiteSpace: "nowrap" }}>
                        {f.b >= 0 ? "+" : "−"}
                        {rupiahRingkas(Math.abs(f.b))}
                        {f.satuan ? ` /${f.satuan}` : ""}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }} className={`kanan angka tebal ${f.kontribusi > 0 ? "teks-sukses" : f.kontribusi < 0 ? "teks-bahaya" : "teks-redup"}`}>
                        {f.kontribusi === 0 ? "–" : `${f.kontribusi > 0 ? "+" : "−"}${rupiahRingkas(Math.abs(f.kontribusi))}`}
                        {f.kontribusi !== 0 && <span className="teks-mini" style={{ display: "block", fontWeight: 500 }}>{f.persen > 0 ? "+" : ""}{f.persen.toLocaleString("id-ID")}%</span>}
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

function NilaiModel({ penilaian }) {
  const [min, maks] = penilaian.rentang_model_2013;
  return (
    <Kartu judul="Nilai model penelitian" sub="Hasil persamaan regresi untuk properti ini, dalam rupiah tahun 2013.">
      <div className="nilai-model">
        <div>
          <span className="teks-mini teks-redup">Nilai model (harga 2013)</span>
          <strong className="nilai-model__angka angka">{rupiahRingkas(penilaian.nilai_model_2013)}</strong>
          <span className="teks-mini teks-redup">
            Rentang ±5,06%: {rupiahRingkas(min)} – {rupiahRingkas(maks)}
          </span>
        </div>
        <div className="nilai-model__daftar">
          <div>
            <span className="teks-mini tebal teks-sukses">Penambah nilai terbesar</span>
            <ul>
              {penilaian.positif.slice(0, 4).map((f) => (
                <li key={f.kode} className="teks-mini">
                  <span>{f.label}</span>
                  <span className="angka">+{f.persen.toLocaleString("id-ID")}%</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span className="teks-mini tebal teks-bahaya">Pengurang nilai</span>
            <ul>
              {penilaian.negatif.length ? (
                penilaian.negatif.map((f) => (
                  <li key={f.kode} className="teks-mini">
                    <span>{f.label}</span>
                    <span className="angka">{f.persen.toLocaleString("id-ID")}%</span>
                  </li>
                ))
              ) : (
                <li className="teks-mini teks-redup">Tidak ada faktor negatif yang terdeteksi.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
      <p className="teks-mini teks-redup" style={{ marginTop: 12 }}>
        Persamaan: Y = {rupiah(penilaian.konstanta)} + Σ(koefisien × nilai faktor). Persentase menunjukkan porsi tiap faktor terhadap nilai model,
        sehingga tetap berguna untuk membandingkan rumah walau harga sudah naik sejak 2013.
      </p>
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
      <Kartu rapat>
        <div className="kepala-nilai">
          <div className="kepala-nilai__teks">
            <span className="lencana lencana--netral" style={{ alignSelf: "flex-start" }}>
              <LuBookOpen aria-hidden="true" /> Berbasis riset
            </span>
            <h3>Faktor yang memengaruhi nilai rumah ini</h3>
            <p className="teks-kecil teks-redup">
              Dihitung dengan model <em>{penilaian.sumber.judul}</em> ({penilaian.sumber.penulis}; {penilaian.sumber.terbitan}).{" "}
              {penilaian.sumber.ketepatan}
            </p>
          </div>
          <div className="kepala-nilai__lengkap">
            <span className="teks-mini teks-redup">Kelengkapan data faktor</span>
            <strong className="angka">
              {kelengkapan.terisi}/{kelengkapan.total} faktor
            </strong>
            <div className="batang__jalur">
              <div className="batang__isi" style={{ width: `${persen}%`, background: persen >= 80 ? "var(--sukses)" : "var(--peringatan)" }} />
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
        <Pemberitahuan nada="peringatan" judul="Di luar wilayah penelitian">
          {penilaian.cakupan}
        </Pemberitahuan>
      )}

      <div className="kisi-nilai">
        <PeringkatKelompok kelompok={penilaian.kelompok} />
        <NilaiModel penilaian={penilaian} />
      </div>
      <SorotanSimpulan sorotan={penilaian.sorotan} />
      <RincianKelompok kelompok={penilaian.kelompok} />

      <details className="metode-volume">
        <summary className="teks-kecil tebal">Data penelitian & asumsi HomeWise</summary>
        <ul className="teks-kecil">
          <li>{penilaian.sumber.data}</li>
          {penilaian.asumsi.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </details>

      {ubah && <ModalLengkapi terbuka={ubah} onTutup={() => setUbah(false)} properti={properti} onSelesai={setDetail} />}
    </div>
  );
}
