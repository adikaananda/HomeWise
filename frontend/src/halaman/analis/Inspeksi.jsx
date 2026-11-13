import { useEffect, useMemo, useState } from "react";
import { LuBadgeCheck, LuCalendar, LuClipboardCheck, LuMapPin, LuPhone, LuPlus, LuSave, LuTrash2 } from "react-icons/lu";
import { Peta } from "../../komponen/Peta";
import { FotoBertanda, TabelTemuan } from "../../komponen/Temuan";
import { KepalaHalaman } from "../../komponen/tata-letak/Aplikasi";
import { AreaTeks, CincinSkor, GalatMuat, Isian, Kartu, KerangkaHalaman, Kosong, Lencana, LencanaLevel, Pemberitahuan, Pilihan, Segmen, Tombol } from "../../komponen/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { rupiahRingkas, tanggal } from "../../lib/format";
import { useAksi, useData, useJudul } from "../../lib/hooks";
import { labelTujuan, useKonfigurasi } from "../../lib/konfigurasi";
import { useNotifikasi } from "../../lib/notifikasi";
import { Tautan } from "../../lib/router";
import { UnggahFoto } from "../pencari/detail/TabBangunan";

export const STATUS_INSPEKSI = {
  menunggu: { teks: "Menunggu", nada: "peringatan" },
  dijadwalkan: { teks: "Dijadwalkan", nada: undefined },
  diperiksa: { teks: "Diperiksa", nada: undefined },
  tervalidasi: { teks: "Tervalidasi", nada: "sukses" },
  dibatalkan: { teks: "Dibatalkan", nada: "netral" },
};

const OPSI_TINGKAT = [
  { nilai: "ringan", label: "Ringan" },
  { nilai: "sedang", label: "Sedang" },
  { nilai: "berat", label: "Berat" },
];

export function DaftarInspeksi() {
  useJudul("Permintaan inspeksi");
  const { pengguna } = useAuth();
  const konfigurasi = useKonfigurasi();
  const [filter, setFilter] = useState("tersedia");
  const { data, galat, memuat, muatUlang } = useData(() => api.get("/inspeksi"));

  const terfilter = useMemo(() => {
    if (!data) return [];
    if (filter === "tersedia") return data.filter((i) => i.status === "menunggu" && !i.analis_id);
    if (filter === "tugas") return data.filter((i) => i.analis_id === pengguna.id && i.status !== "tervalidasi");
    return data.filter((i) => i.status === "tervalidasi");
  }, [data, filter, pengguna.id]);

  return (
    <>
      <KepalaHalaman judul="Permintaan inspeksi" deskripsi="Ambil permintaan, periksa properti di lokasi, lalu validasi temuan AI untuk laporan pengguna." />
      <div style={{ marginBottom: 20 }}>
        <Segmen
          label="Filter inspeksi"
          nilai={filter}
          onUbah={setFilter}
          opsi={[
            { nilai: "tersedia", label: "Tersedia" },
            { nilai: "tugas", label: "Tugas saya" },
            { nilai: "selesai", label: "Tervalidasi" },
          ]}
        />
      </div>
      {memuat ? (
        <KerangkaHalaman />
      ) : galat ? (
        <GalatMuat galat={galat} onCobaLagi={muatUlang} />
      ) : terfilter.length ? (
        <div className="kisi-2">
          {terfilter.map((i) => (
            <Tautan key={i.id} ke={`/analis/inspeksi/${i.id}`} className="kartu kartu-inspeksi">
              <div className="baris-antara">
                <Lencana nada={STATUS_INSPEKSI[i.status].nada}>{STATUS_INSPEKSI[i.status].teks}</Lencana>
                <span className="teks-mini teks-redup">Diminta {tanggal(i.dibuat)}</span>
              </div>
              <h3>{i.properti_nama}</h3>
              <p className="teks-kecil teks-redup baris" style={{ gap: 6, alignItems: "flex-start" }}>
                <LuMapPin aria-hidden="true" style={{ width: 15, height: 15, flex: "none", marginTop: 3 }} />
                {i.properti_alamat}
              </p>
              <div className="baris" style={{ flexWrap: "wrap", gap: 8 }}>
                <Lencana nada="netral">{labelTujuan(konfigurasi, i.properti_tujuan)}</Lencana>
                <Lencana nada="netral">Pemohon: {i.pemohon_nama}</Lencana>
                {i.jadwal && (
                  <Lencana ikon={LuCalendar}>{tanggal(i.jadwal, true)}</Lencana>
                )}
              </div>
            </Tautan>
          ))}
        </div>
      ) : (
        <Kartu>
          <Kosong ikon={LuClipboardCheck} judul="Tidak ada permintaan di sini">
            {filter === "tersedia" ? "Permintaan baru muncul setelah pengguna membayar paket inspeksi profesional." : "Belum ada inspeksi pada kategori ini."}
          </Kosong>
        </Kartu>
      )}
    </>
  );
}

function FormValidasi({ inspeksi, temuan, setInspeksi, dapatUbah }) {
  const beriTahu = useNotifikasi();
  const { jenis_kerusakan: jenis } = useKonfigurasi();
  const [proses, jalankan] = useAksi();
  const awal = inspeksi.temuan_validasi || { item: [], tambahan: [] };
  const [item, setItem] = useState(() =>
    temuan.map((t, indeks) => {
      const tersimpan = awal.item.find((x) => x.indeks === indeks);
      return { indeks, status: tersimpan?.status || "dikonfirmasi", tingkat: tersimpan?.tingkat || t.tingkat, luas_m2: tersimpan?.luas_m2 || t.luas_m2, catatan: tersimpan?.catatan || "" };
    }),
  );
  const [tambahan, setTambahan] = useState(awal.tambahan);
  const [catatan, setCatatan] = useState(inspeksi.catatan || "");
  const [jadwal, setJadwal] = useState(inspeksi.jadwal ? inspeksi.jadwal.slice(0, 16) : "");

  const ubahItem = (indeks, perubahan) => setItem((l) => l.map((x) => (x.indeks === indeks ? { ...x, ...perubahan } : x)));
  const ubahTambahan = (i, perubahan) => setTambahan((l) => l.map((x, j) => (j === i ? { ...x, ...perubahan } : x)));

  const muatan = () => ({
    item: item.map((x) => ({ ...x, luas_m2: Number(x.luas_m2) || null, catatan: x.catatan || null })),
    tambahan: tambahan.map((x) => ({ ...x, luas_m2: Number(x.luas_m2) || 1, catatan: x.catatan || null })),
  });

  const simpan = (validasi) =>
    jalankan(async () => {
      try {
        await api.patch(`/inspeksi/${inspeksi.id}`, { catatan, jadwal: jadwal || null, ...(validasi ? { status: "diperiksa" } : {}) });
        let hasil = await api.put(`/inspeksi/${inspeksi.id}/temuan`, muatan());
        if (validasi) hasil = await api.post(`/inspeksi/${inspeksi.id}/validasi`);
        setInspeksi(hasil);
        beriTahu(validasi ? "Inspeksi tervalidasi. Laporan pengguna sudah diperbarui." : "Draf validasi tersimpan.");
      } catch (e) {
        beriTahu(e.message, "galat");
      }
    });

  return (
    <div className="tumpuk" style={{ gap: 20 }}>
      <Kartu judul="Jadwal & catatan pemeriksaan">
        <div className="tumpuk">
          <Isian label="Jadwal kunjungan" type="datetime-local" value={jadwal} onChange={(e) => setJadwal(e.target.value)} disabled={!dapatUbah} />
          <AreaTeks
            label="Catatan hasil pemeriksaan"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            disabled={!dapatUbah}
            placeholder="Kondisi struktur, instalasi listrik dan air, kesesuaian dengan temuan AI, dan saran perbaikan."
            bantuan="Wajib diisi sebelum validasi. Catatan ini tampil di laporan pengguna."
          />
        </div>
      </Kartu>

      <Kartu judul="Validasi temuan AI" sub="Konfirmasi, sesuaikan tingkat dan luas, atau tolak temuan yang tidak sesuai kondisi lapangan.">
        {temuan.length ? (
          <div className="tumpuk" style={{ gap: 12 }}>
            {temuan.map((t, indeks) => {
              const v = item[indeks];
              return (
                <div key={indeks} className="item-validasi">
                  <div className="baris-antara">
                    <div className="baris" style={{ gap: 8 }}>
                      <strong>{jenis[t.jenis] || t.jenis}</strong>
                      <LencanaLevel level={t.tingkat} />
                      <span className="teks-mini teks-redup">
                        {t.luas_m2} m² · AI {t.kepercayaan ? `${Math.round(t.kepercayaan * 100)}%` : "–"}
                      </span>
                    </div>
                    <Segmen
                      label="Keputusan validasi"
                      nilai={v.status}
                      onUbah={(status) => dapatUbah && ubahItem(indeks, { status })}
                      opsi={[
                        { nilai: "dikonfirmasi", label: "Konfirmasi" },
                        { nilai: "disesuaikan", label: "Sesuaikan" },
                        { nilai: "ditolak", label: "Tolak" },
                      ]}
                    />
                  </div>
                  {v.status === "disesuaikan" && (
                    <div className="kisi-2" style={{ marginTop: 12 }}>
                      <Pilihan label="Tingkat aktual" value={v.tingkat} opsi={OPSI_TINGKAT} onChange={(e) => ubahItem(indeks, { tingkat: e.target.value })} disabled={!dapatUbah} />
                      <Isian label="Luas aktual (m²)" type="number" min="0.1" step="0.1" value={v.luas_m2} onChange={(e) => ubahItem(indeks, { luas_m2: e.target.value })} disabled={!dapatUbah} />
                    </div>
                  )}
                  {v.status !== "dikonfirmasi" && (
                    <div style={{ marginTop: 12 }}>
                      <Isian label="Alasan" value={v.catatan} onChange={(e) => ubahItem(indeks, { catatan: e.target.value })} disabled={!dapatUbah} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="teks-kecil teks-redup">Pengguna belum menjalankan analisis foto. Tambahkan temuan dari pemeriksaan langsung di bawah.</p>
        )}
      </Kartu>

      <Kartu
        judul="Temuan tambahan dari lapangan"
        aksi={
          dapatUbah && (
            <Tombol varian="sekunder" ukuran="kecil" ikon={LuPlus} onClick={() => setTambahan([...tambahan, { jenis: "retak_dinding", tingkat: "ringan", luas_m2: 1, catatan: "" }])}>
              Tambah temuan
            </Tombol>
          )
        }
      >
        {tambahan.length ? (
          <div className="tumpuk" style={{ gap: 12 }}>
            {tambahan.map((t, i) => (
              <div key={i} className="item-validasi item-validasi--tambahan">
                <Pilihan label="Jenis" value={t.jenis} onChange={(e) => ubahTambahan(i, { jenis: e.target.value })} opsi={Object.entries(jenis).map(([nilai, label]) => ({ nilai, label }))} disabled={!dapatUbah} />
                <Pilihan label="Tingkat" value={t.tingkat} onChange={(e) => ubahTambahan(i, { tingkat: e.target.value })} opsi={OPSI_TINGKAT} disabled={!dapatUbah} />
                <Isian label="Luas (m²)" type="number" min="0.1" step="0.1" value={t.luas_m2} onChange={(e) => ubahTambahan(i, { luas_m2: e.target.value })} disabled={!dapatUbah} />
                <Isian label="Catatan" value={t.catatan || ""} onChange={(e) => ubahTambahan(i, { catatan: e.target.value })} disabled={!dapatUbah} />
                {dapatUbah && <Tombol varian="bahaya" ikon={LuTrash2} aria-label="Hapus temuan" onClick={() => setTambahan(tambahan.filter((_, j) => j !== i))} />}
              </div>
            ))}
          </div>
        ) : (
          <p className="teks-kecil teks-redup">Belum ada temuan tambahan.</p>
        )}
      </Kartu>

      {dapatUbah && (
        <div className="bilah-aksi-lengket">
          <Tombol varian="sekunder" ikon={LuSave} onClick={() => simpan(false)} disabled={proses}>
            Simpan draf
          </Tombol>
          <Tombol ikon={LuBadgeCheck} onClick={() => simpan(true)} memuat={proses}>
            Validasi & terbitkan
          </Tombol>
        </div>
      )}
    </div>
  );
}

export function DetailInspeksi({ id }) {
  const { pengguna } = useAuth();
  const konfigurasi = useKonfigurasi();
  const beriTahu = useNotifikasi();
  const [proses, jalankan] = useAksi();
  const { data: inspeksi, setData: setInspeksi, galat, memuat, muatUlang } = useData(() => api.get(`/inspeksi/${id}`), [id]);
  const [kunci, setKunci] = useState(0);
  useJudul(inspeksi ? `Inspeksi ${inspeksi.properti_nama}` : "Detail inspeksi");

  useEffect(() => setKunci((k) => k + 1), [inspeksi?.status, inspeksi?.analisis?.bangunan?.dibuat]);

  const pusat = useMemo(() => (inspeksi ? { lat: inspeksi.lat, lng: inspeksi.lng } : null), [inspeksi?.lat, inspeksi?.lng]);

  if (memuat) return <KerangkaHalaman />;
  if (galat) return <GalatMuat galat={galat} onCobaLagi={muatUlang} />;

  const { analisis } = inspeksi;
  const temuan = analisis.bangunan?.temuan || [];
  const milikSaya = inspeksi.analis_id === pengguna.id || pengguna.peran === "admin";
  const dapatUbah = milikSaya && inspeksi.status !== "tervalidasi" && inspeksi.status !== "menunggu";

  const ambil = () =>
    jalankan(async () => {
      try {
        setInspeksi(await api.post(`/inspeksi/${id}/ambil`));
        beriTahu("Permintaan diambil. Atur jadwal kunjungan dengan pemohon.");
      } catch (e) {
        beriTahu(e.message, "galat");
      }
    });

  const status = STATUS_INSPEKSI[inspeksi.status];

  return (
    <>
      <KepalaHalaman
        kembali={{ ke: pengguna.peran === "admin" ? "/admin" : "/analis", label: "Permintaan inspeksi" }}
        judul={inspeksi.properti_nama}
        deskripsi={inspeksi.properti_alamat}
        aksi={
          inspeksi.status === "menunggu" && !inspeksi.analis_id && (
            <Tombol ikon={LuClipboardCheck} onClick={ambil} memuat={proses}>
              Ambil permintaan
            </Tombol>
          )
        }
      />

      <div className="inspeksi-kisi">
        <div className="tumpuk" style={{ gap: 20 }}>
          {inspeksi.status === "tervalidasi" && (
            <Pemberitahuan nada="sukses" judul="Inspeksi sudah divalidasi">
              Divalidasi {tanggal(inspeksi.divalidasi_pada, true)}. Laporan pengguna kini berstatus tervalidasi.
            </Pemberitahuan>
          )}
          {inspeksi.status === "menunggu" && (
            <Pemberitahuan nada="peringatan">Ambil permintaan ini untuk mulai mengisi jadwal, catatan, dan validasi temuan.</Pemberitahuan>
          )}

          {analisis.foto.length > 0 && (
            <Kartu judul="Foto & temuan AI">
              <div className="kisi-foto-bertanda">
                {analisis.foto.map((f) => (
                  <FotoBertanda key={f.id} foto={f} temuan={temuan} />
                ))}
              </div>
            </Kartu>
          )}

          {temuan.length > 0 && <TabelTemuan temuan={temuan} foto={analisis.foto} />}

          {milikSaya && inspeksi.status !== "menunggu" && (
            <FormValidasi key={kunci} inspeksi={inspeksi} temuan={temuan} setInspeksi={setInspeksi} dapatUbah={dapatUbah} />
          )}

          {dapatUbah && (
            <Kartu judul="Foto tambahan dari lapangan">
              <UnggahFoto endpoint={`/inspeksi/${id}/foto`} onSelesai={setInspeksi} />
            </Kartu>
          )}
        </div>

        <aside className="tumpuk" style={{ gap: 20 }}>
          <Kartu rapat>
            <div className="baris-antara" style={{ marginBottom: 12 }}>
              <Lencana nada={status.nada}>{status.teks}</Lencana>
              <span className="teks-mini teks-redup">#{inspeksi.id}</span>
            </div>
            <dl className="daftar-definisi">
              <dt>Pemohon</dt>
              <dd>{inspeksi.pemohon_nama}</dd>
              <dt>Kontak</dt>
              <dd>
                {inspeksi.pemohon_telepon ? (
                  <a href={`tel:${inspeksi.pemohon_telepon}`} className="baris" style={{ gap: 4 }}>
                    <LuPhone aria-hidden="true" style={{ width: 14, height: 14 }} /> {inspeksi.pemohon_telepon}
                  </a>
                ) : (
                  "–"
                )}
              </dd>
              <dt>Tujuan</dt>
              <dd>{labelTujuan(konfigurasi, inspeksi.properti_tujuan)}</dd>
              <dt>Harga</dt>
              <dd className="angka">{rupiahRingkas(analisis.properti.harga_penawaran)}</dd>
              <dt>Analis</dt>
              <dd>{inspeksi.analis_nama || "–"}</dd>
            </dl>
          </Kartu>
          <Kartu rapat>
            <Peta pusat={pusat} tinggi={220} zoom={16} />
          </Kartu>
          {analisis.lokasi && (
            <Kartu rapat>
              <div className="baris" style={{ gap: 14 }}>
                <CincinSkor skor={analisis.lokasi.hasil.skor_total} ukuran={72} tebal={7} />
                <div>
                  <span className="teks-mini teks-redup">Skor lokasi</span>
                  <p className="tebal">{analisis.lokasi.hasil.kategori}</p>
                </div>
              </div>
              <p className="teks-mini teks-redup" style={{ marginTop: 12 }}>
                {analisis.lokasi.hasil.ringkasan}
              </p>
            </Kartu>
          )}
          {analisis.bangunan && (
            <Kartu rapat>
              <span className="teks-mini teks-redup">Skor kondisi visual</span>
              <p className="tebal" style={{ fontSize: "var(--teks-xl)" }}>
                {Math.round(analisis.bangunan.skor_kondisi)}/100
              </p>
              <p className="teks-mini teks-redup">{analisis.bangunan.ringkasan}</p>
            </Kartu>
          )}
        </aside>
      </div>
    </>
  );
}
