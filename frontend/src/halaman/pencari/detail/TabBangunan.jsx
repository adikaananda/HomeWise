import { useState } from "react";
import { LuBadgeCheck, LuCamera, LuImagePlus, LuScanSearch, LuTrash2 } from "react-icons/lu";
import { LencanaSumberFoto, ModalUnggahFoto, ProgresSurvei } from "../../../komponen/Survei";
import { FotoBertanda, TabelTemuan } from "../../../komponen/Temuan";
import { CincinSkor, Kartu, Kosong, Lencana, Pemberitahuan, Tombol } from "../../../komponen/ui";
import { api, urlBerkas } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { tanggal } from "../../../lib/format";
import { labelArea, useKonfigurasi } from "../../../lib/konfigurasi";
import { useNotifikasi } from "../../../lib/notifikasi";
import { PanelTerkunci } from "./PanelTerkunci";

function KartuSurvei({ detail, onTambah }) {
  const { pengguna } = useAuth();
  const { kelengkapan } = detail.survei;
  const milikSendiri = detail.properti.pengguna_id === pengguna.id;
  const terkunci = detail.bangunan?.tervalidasi;

  return (
    <Kartu className="kartu-survei">
      <div className="kartu-survei__isi">
        <div className="kartu-survei__ikon">
          <LuCamera aria-hidden="true" />
        </div>
        <div className="tumpuk" style={{ gap: 10, flex: 1, minWidth: 0 }}>
          <div>
            <h3>Foto saat survei ke lokasi</h3>
            <p className="teks-kecil teks-redup">
              Anda yang memotret, bukan penjual, jadi kerusakan tidak disembunyikan. Mode survei memandu area mana saja yang perlu difoto.
            </p>
          </div>
          <ProgresSurvei kelengkapan={kelengkapan} />
          {kelengkapan.belum.length > 0 && (
            <div className="baris" style={{ flexWrap: "wrap", gap: 6 }}>
              <span className="teks-mini teks-redup">Belum difoto:</span>
              {kelengkapan.belum.map((a) => (
                <Lencana key={a} nada="netral">
                  {a}
                </Lencana>
              ))}
            </div>
          )}
        </div>
      </div>
      {milikSendiri && !terkunci && (
        <div className="baris" style={{ flexWrap: "wrap", marginTop: 16 }}>
          <Tombol ke={`/app/properti/${detail.properti.id}/survei`} ikon={LuCamera}>
            {detail.jumlah_foto ? "Lanjutkan survei" : "Mulai mode survei"}
          </Tombol>
          <Tombol varian="sekunder" ikon={LuImagePlus} onClick={onTambah}>
            Unggah dari galeri
          </Tombol>
        </div>
      )}
    </Kartu>
  );
}

function GaleriFoto({ detail, setDetail }) {
  const konfigurasi = useKonfigurasi();
  const beriTahu = useNotifikasi();
  const { properti, foto, bangunan } = detail;

  const hapus = async (id) => {
    try {
      setDetail(await api.hapus(`/properti/${properti.id}/foto/${id}`));
    } catch (e) {
      beriTahu(e.message, "galat");
    }
  };

  return (
    <div className="galeri">
      {foto.map((f) => (
        <figure key={f.id} className="galeri__item">
          <img src={urlBerkas(f.url)} alt={`Foto ${labelArea(konfigurasi, f.area)}`} loading="lazy" />
          <span className="galeri__label">
            {labelArea(konfigurasi, f.area)}
            {f.jarak ? ` · ${f.jarak === "dekat" ? "1 m" : f.jarak === "jauh" ? "5 m" : "3 m"}` : ""}
          </span>
          <span className="galeri__sumber">
            <LencanaSumberFoto kode={f.sumber} />
          </span>
          {!bangunan?.tervalidasi && (
            <button type="button" className="galeri__aksi" onClick={() => hapus(f.id)} aria-label="Hapus foto">
              <LuTrash2 />
            </button>
          )}
        </figure>
      ))}
    </div>
  );
}

function HasilAnalisis({ detail }) {
  const { bangunan, foto } = detail;
  const fotoBertemuan = foto.filter((f) => bangunan.temuan.some((t) => t.foto_id === f.id));
  return (
    <>
      <Kartu>
        <div className="ringkasan-bangunan">
          <CincinSkor skor={bangunan.skor_kondisi} ukuran={112} label="Skor kondisi" />
          <div className="tumpuk" style={{ gap: 8 }}>
            <div className="baris" style={{ flexWrap: "wrap", gap: 8 }}>
              <h3>Kondisi visual bangunan</h3>
              {bangunan.tervalidasi ? (
                <Lencana nada="sukses" ikon={LuBadgeCheck}>
                  Divalidasi analis
                </Lencana>
              ) : (
                <Lencana>Hasil AI, belum divalidasi</Lencana>
              )}
            </div>
            <p className="teks-redup">{bangunan.ringkasan}</p>
            <span className="teks-mini teks-redup">Diperbarui {tanggal(bangunan.dibuat, true)}</span>
          </div>
        </div>
      </Kartu>
      {bangunan.ada_foto_iklan && (
        <Pemberitahuan nada="peringatan">Sebagian temuan berasal dari foto iklan atau penjual. Pastikan kondisinya saat Anda survei.</Pemberitahuan>
      )}
      {fotoBertemuan.length > 0 && (
        <Kartu judul="Letak kerusakan pada foto">
          <div className="kisi-foto-bertanda">
            {fotoBertemuan.map((f) => (
              <FotoBertanda key={f.id} foto={f} temuan={bangunan.temuan} />
            ))}
          </div>
        </Kartu>
      )}
      <div>
        <h3 style={{ marginBottom: 12 }}>Daftar temuan</h3>
        <TabelTemuan temuan={bangunan.temuan} foto={foto} />
      </div>
    </>
  );
}

export function TabBangunan({ detail, setDetail, muatUlang }) {
  const beriTahu = useNotifikasi();
  const [modal, setModal] = useState(false);
  const [menganalisis, setMenganalisis] = useState(false);
  const { properti, foto, bangunan, akses_premium: premium, survei } = detail;

  const analisis = async () => {
    setMenganalisis(true);
    try {
      setDetail(await api.post(`/properti/${properti.id}/analisis-bangunan`));
      beriTahu("Analisis selesai. Lihat juga rincian biaya dan material di tab Biaya.");
    } catch (e) {
      beriTahu(e.message, "galat");
    } finally {
      setMenganalisis(false);
    }
  };

  const bisaAnalisis = premium && foto.length > 0 && !bangunan?.tervalidasi;

  return (
    <div className="tumpuk" style={{ gap: 20 }}>
      <KartuSurvei detail={detail} onTambah={() => setModal(true)} />

      {foto.length > 0 ? (
        <Kartu
          judul="Foto bangunan"
          sub={`${foto.length} foto tersimpan`}
          aksi={
            bisaAnalisis && (
              <Tombol ikon={LuScanSearch} onClick={analisis} memuat={menganalisis}>
                {bangunan ? "Analisis ulang" : "Analisis foto"}
              </Tombol>
            )
          }
        >
          {bisaAnalisis && !bangunan && survei.kelengkapan.belum.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Pemberitahuan nada="peringatan">
                {survei.kelengkapan.belum.length} area wajib belum difoto. Anda tetap bisa menganalisis sekarang, tetapi kerusakan di area itu tidak ikut
                terhitung.
              </Pemberitahuan>
            </div>
          )}
          <GaleriFoto detail={detail} setDetail={setDetail} />
        </Kartu>
      ) : (
        <Kartu>
          <Kosong ikon={LuCamera} judul="Belum ada foto bangunan">
            Saat datang survei, buka halaman ini di HP lalu tekan Mulai mode survei. Foto langsung tersimpan dan siap dianalisis.
          </Kosong>
        </Kartu>
      )}

      {!premium && foto.length > 0 && (
        <PanelTerkunci properti={properti} onTerbuka={muatUlang} judul="Foto survei siap dianalisis" />
      )}

      {premium && bangunan && !bangunan.terkunci && <HasilAnalisis detail={detail} />}

      <ModalUnggahFoto terbuka={modal} onTutup={() => setModal(false)} endpoint={`/properti/${properti.id}/foto`} onSelesai={setDetail} />
    </div>
  );
}
