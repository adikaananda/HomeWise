import { useState } from "react";
import { LuArrowLeft, LuCircleCheckBig, LuCircleDashed, LuX } from "react-icons/lu";
import { PilihJarakFoto, ProgresSurvei, TombolKamera, useUnggahFoto } from "../../komponen/Survei";
import { AreaTeks, GalatMuat, KerangkaHalaman, Lencana, Pemberitahuan, Tombol } from "../../komponen/ui";
import { api, urlBerkas } from "../../lib/api";
import { useData, useJudul } from "../../lib/hooks";
import { useKonfigurasi } from "../../lib/konfigurasi";
import { useNotifikasi } from "../../lib/notifikasi";
import { Tautan, useRouter } from "../../lib/router";

function KartuArea({ area, foto, onUnggah, onHapus, sedangUnggah }) {
  const sudah = foto.length > 0;
  return (
    <article className={`kartu-area ${sudah ? "kartu-area--selesai" : ""}`}>
      <div className="kartu-area__kepala">
        {sudah ? (
          <LuCircleCheckBig className="kartu-area__status" style={{ color: "var(--hijau)" }} aria-label="Sudah difoto" />
        ) : (
          <LuCircleDashed className="kartu-area__status" style={{ color: "var(--abu-muda)" }} aria-label="Belum difoto" />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="baris" style={{ gap: 8, flexWrap: "wrap" }}>
            <h3>{area.label}</h3>
            {area.wajib ? <Lencana>Wajib</Lencana> : <Lencana nada="netral">Opsional</Lencana>}
          </div>
          <p className="teks-kecil teks-redup">{area.panduan}</p>
        </div>
      </div>
      {sudah && (
        <div className="kartu-area__foto">
          {foto.map((f) => (
            <div key={f.id} className="kartu-area__thumb">
              <img src={urlBerkas(f.url)} alt={`Foto ${area.label}`} loading="lazy" />
              <button type="button" onClick={() => onHapus(f)} aria-label="Hapus foto">
                <LuX />
              </button>
            </div>
          ))}
        </div>
      )}
      <TombolKamera
        label={sudah ? "Tambah foto" : "Ambil foto"}
        varian={sudah ? "sekunder" : "utama"}
        memuat={sedangUnggah}
        penuh
        onPilih={(berkas) => onUnggah(berkas, area.kode)}
      />
    </article>
  );
}

function PertanyaanSurvei({ properti, survei, onTersimpan }) {
  const { pertanyaan_survei: pertanyaan } = useKonfigurasi();
  const beriTahu = useNotifikasi();
  const [jawaban, setJawaban] = useState(survei.jawaban || {});
  const [catatan, setCatatan] = useState(survei.catatan || "");
  const [status, setStatus] = useState("");

  const simpan = async (jawabanBaru, catatanBaru) => {
    setStatus("Menyimpan…");
    try {
      onTersimpan(await api.put(`/properti/${properti.id}/survei`, { jawaban: jawabanBaru, catatan: catatanBaru || null }));
      setStatus("Tersimpan otomatis");
    } catch (e) {
      setStatus("");
      beriTahu(e.message, "galat");
    }
  };

  const pilih = (kode, nilai) => {
    const baru = { ...jawaban, [kode]: nilai };
    setJawaban(baru);
    simpan(baru, catatan);
  };

  return (
    <section className="tumpuk" aria-labelledby="judul-pertanyaan">
      <div className="baris-antara">
        <h2 id="judul-pertanyaan" style={{ fontSize: "var(--teks-xl)" }}>
          Tanyakan saat survei
        </h2>
        <span className="teks-mini teks-redup" aria-live="polite">
          {status}
        </span>
      </div>
      <p className="teks-kecil teks-redup" style={{ marginTop: -8 }}>
        Jawaban ini masuk ke laporan dan membantu HomeWise memberi rekomendasi yang lebih tepat.
      </p>
      {pertanyaan.map((p) => (
        <fieldset key={p.kode} className="pertanyaan">
          <legend className="tebal teks-kecil">{p.label}</legend>
          <div className="pilihan-chip">
            {p.opsi.map((o) => (
              <label key={o}>
                <input type="radio" name={p.kode} checked={jawaban[p.kode] === o} onChange={() => pilih(p.kode, o)} />
                <span>{o}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <AreaTeks
        label="Catatan lain"
        value={catatan}
        onChange={(e) => setCatatan(e.target.value)}
        onBlur={() => catatan !== (survei.catatan || "") && simpan(jawaban, catatan)}
        placeholder="Misal: talang belakang sering meluap, tetangga renovasi, jalan depan sempit."
        maxLength={2000}
      />
    </section>
  );
}

export default function ModeSurvei({ id }) {
  const { navigasi } = useRouter();
  const beriTahu = useNotifikasi();
  const { area_foto: daftarArea } = useKonfigurasi();
  const [areaAktif, setAreaAktif] = useState(null);
  const [jarak, setJarak] = useState("sedang");
  const { data: detail, setData: setDetail, galat, memuat, muatUlang } = useData(() => api.get(`/properti/${id}`), [id]);
  const { unggah, proses } = useUnggahFoto(`/properti/${id}/foto`, setDetail);
  useJudul("Mode survei");

  if (memuat) {
    return (
      <div className="wadah" style={{ paddingBlock: 24 }}>
        <KerangkaHalaman />
      </div>
    );
  }
  if (galat) return <GalatMuat galat={galat} onCobaLagi={muatUlang} />;

  const { properti, survei, foto } = detail;
  const terkunciValidasi = detail.tahap.kode === "tervalidasi";

  const unggahArea = async (berkas, area) => {
    setAreaAktif(area);
    await unggah(berkas, { area, sumber: "survei", jarak });
    setAreaAktif(null);
  };

  const hapus = async (f) => {
    try {
      setDetail(await api.hapus(`/properti/${id}/foto/${f.id}`));
    } catch (e) {
      beriTahu(e.message, "galat");
    }
  };

  return (
    <div className="survei">
      <header className="survei__kepala">
        <div className="wadah survei__kepala-isi">
          <Tautan ke={`/app/properti/${id}`} className="survei__kembali" aria-label="Kembali ke detail properti">
            <LuArrowLeft />
          </Tautan>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="teks-mini teks-redup">Mode survei</span>
            <h1 className="survei__judul">{properti.nama}</h1>
          </div>
        </div>
        <div className="wadah">
          <ProgresSurvei kelengkapan={survei.kelengkapan} />
        </div>
      </header>

      <main className="wadah survei__isi" id="konten">
        {terkunciValidasi ? (
          <Pemberitahuan nada="sukses">Temuan properti ini sudah divalidasi analis, jadi foto tidak bisa diubah lagi.</Pemberitahuan>
        ) : (
          <>
            <Pemberitahuan judul="Tips foto yang bagus">
              Nyalakan lampu atau buka jendela, pilih jarak pengambilan foto di bawah, dan pastikan satu area terlihat jelas per foto. Setiap foto langsung
              tersimpan begitu diambil.
            </Pemberitahuan>
            <PilihJarakFoto nilai={jarak} onUbah={setJarak} />
          </>
        )}

        <section className="tumpuk" aria-label="Foto per area">
          {daftarArea.map((area) => (
            <KartuArea
              key={area.kode}
              area={area}
              foto={foto.filter((f) => f.area === area.kode && f.sumber !== "iklan")}
              onUnggah={terkunciValidasi ? () => {} : unggahArea}
              onHapus={terkunciValidasi ? () => {} : hapus}
              sedangUnggah={proses && areaAktif === area.kode}
            />
          ))}
        </section>

        <PertanyaanSurvei properti={properti} survei={survei} onTersimpan={setDetail} />
      </main>

      <div className="survei__bawah">
        <div className="wadah baris-antara">
          <span className="teks-kecil">
            <strong>{foto.filter((f) => f.sumber !== "iklan").length}</strong> foto survei
          </span>
          <Tombol onClick={() => navigasi(`/app/properti/${id}?tab=bangunan`)}>Selesai survei</Tombol>
        </div>
      </div>
    </div>
  );
}
