import { useRef, useState } from "react";
import { LuBadgeCheck, LuImagePlus, LuScanSearch, LuTrash2 } from "react-icons/lu";
import { FotoBertanda, TabelTemuan } from "../../../komponen/Temuan";
import { CincinSkor, Isian, Kartu, Kosong, Lencana, Pemberitahuan, Tombol } from "../../../komponen/ui";
import { api, urlBerkas } from "../../../lib/api";
import { tanggal } from "../../../lib/format";
import { useNotifikasi } from "../../../lib/notifikasi";

export function UnggahFoto({ endpoint, onSelesai }) {
  const beriTahu = useNotifikasi();
  const input = useRef(null);
  const [ruang, setRuang] = useState("");
  const [seret, setSeret] = useState(false);
  const [proses, setProses] = useState(false);

  const unggah = async (daftar) => {
    const berkas = [...daftar].filter((f) => f.type.startsWith("image/"));
    if (!berkas.length) return;
    if (berkas.some((f) => f.size > 10 * 1024 * 1024)) {
      beriTahu("Ukuran setiap foto maksimal 10 MB.", "galat");
      return;
    }
    const data = new FormData();
    berkas.slice(0, 10).forEach((f) => data.append("foto", f));
    if (ruang.trim()) data.append("ruang", ruang.trim());
    setProses(true);
    try {
      const hasil = await api.unggah(endpoint, data);
      beriTahu(`${berkas.length} foto berhasil diunggah.`);
      setRuang("");
      onSelesai(hasil);
    } catch (e) {
      beriTahu(e.message, "galat");
    } finally {
      setProses(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="tumpuk" style={{ gap: 12 }}>
      <Isian label="Ruangan atau bagian bangunan" placeholder="Misal: kamar utama, dapur, fasad depan" value={ruang} onChange={(e) => setRuang(e.target.value)} />
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
          unggah(e.dataTransfer.files);
        }}
      >
        {proses ? <span className="pemuat" style={{ color: "var(--biru)" }} /> : <LuImagePlus aria-hidden="true" />}
        <strong>{proses ? "Mengunggah…" : "Pilih atau seret foto ke sini"}</strong>
        <span className="teks-mini teks-redup">JPG, PNG, atau WEBP. Maksimal 10 foto, 10 MB per foto.</span>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => unggah(e.target.files)} disabled={proses} />
      </label>
    </div>
  );
}

export function TabBangunan({ detail, setDetail }) {
  const beriTahu = useNotifikasi();
  const [menganalisis, setMenganalisis] = useState(false);
  const { properti, foto, bangunan } = detail;

  const analisis = async () => {
    setMenganalisis(true);
    try {
      setDetail(await api.post(`/properti/${properti.id}/analisis-bangunan`));
      beriTahu("Analisis kondisi bangunan selesai.");
    } catch (e) {
      beriTahu(e.message, "galat");
    } finally {
      setMenganalisis(false);
    }
  };

  const hapusFoto = async (id) => {
    try {
      setDetail(await api.hapus(`/properti/${properti.id}/foto/${id}`));
    } catch (e) {
      beriTahu(e.message, "galat");
    }
  };

  const tervalidasi = bangunan?.tervalidasi;

  return (
    <div className="tumpuk" style={{ gap: 20 }}>
      {bangunan && (
        <Kartu>
          <div className="ringkasan-bangunan">
            <CincinSkor skor={bangunan.skor_kondisi} ukuran={112} label="Skor kondisi" />
            <div className="tumpuk" style={{ gap: 8 }}>
              <div className="baris" style={{ flexWrap: "wrap", gap: 8 }}>
                <h3>Kondisi visual bangunan</h3>
                {tervalidasi ? (
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
      )}

      <div className="bangunan-kisi">
        <Kartu
          judul="Foto bangunan"
          sub={`${foto.length} foto. Foto yang jelas dan terang memberi hasil deteksi lebih akurat.`}
          aksi={
            foto.length > 0 &&
            !tervalidasi && (
              <Tombol ikon={LuScanSearch} onClick={analisis} memuat={menganalisis}>
                {bangunan ? "Analisis ulang" : "Analisis foto"}
              </Tombol>
            )
          }
        >
          {foto.length ? (
            <div className="galeri">
              {foto.map((f) => (
                <div key={f.id} className="galeri__item">
                  <img src={urlBerkas(f.url)} alt={f.ruang || "Foto bangunan"} loading="lazy" />
                  {f.ruang && <span className="galeri__label">{f.ruang}</span>}
                  {!tervalidasi && (
                    <button type="button" className="galeri__aksi" onClick={() => hapusFoto(f.id)} aria-label="Hapus foto">
                      <LuTrash2 />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Kosong ikon={LuImagePlus} judul="Belum ada foto">
              Unggah foto dinding, plafon, lantai, dan atap. Foto dari iklan juga bisa dipakai.
            </Kosong>
          )}
        </Kartu>
        <Kartu judul="Tambah foto">
          {tervalidasi ? (
            <Pemberitahuan nada="sukses">Temuan sudah divalidasi analis sehingga foto tidak dapat diubah lagi.</Pemberitahuan>
          ) : (
            <UnggahFoto endpoint={`/properti/${properti.id}/foto`} onSelesai={setDetail} />
          )}
        </Kartu>
      </div>

      {bangunan && (
        <>
          {foto.some((f) => bangunan.temuan.some((t) => t.foto_id === f.id)) && (
            <Kartu judul="Penandaan temuan pada foto">
              <div className="kisi-foto-bertanda">
                {foto
                  .filter((f) => bangunan.temuan.some((t) => t.foto_id === f.id))
                  .map((f) => (
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
      )}
    </div>
  );
}
