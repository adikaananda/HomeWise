import { useEffect, useState } from "react";
import {
  LuActivity,
  LuBanknote,
  LuCircleCheck,
  LuClipboardCheck,
  LuClock,
  LuFileText,
  LuGauge,
  LuHouse,
  LuPencil,
  LuPlus,
  LuRefreshCw,
  LuSearch,
  LuTrash2,
  LuUsers,
} from "react-icons/lu";
import { KepalaHalaman } from "../../komponen/tata-letak/Aplikasi";
import { GalatMuat, Isian, Kartu, KerangkaHalaman, Kosong, Lencana, Modal, Pilihan, Statistik, Tombol } from "../../komponen/ui";
import { api } from "../../lib/api";
import { angka, rupiah, tanggal, kapital } from "../../lib/format";
import { useAksi, useData, useJudul } from "../../lib/hooks";
import { useKonfigurasi } from "../../lib/konfigurasi";
import { useNotifikasi } from "../../lib/notifikasi";
import { NADA_STATUS_BAYAR } from "../pencari/Pembayaran";

function Muat({ data, galat, memuat, muatUlang, children }) {
  if (memuat) return <KerangkaHalaman />;
  if (galat) return <GalatMuat galat={galat} onCobaLagi={muatUlang} />;
  return children(data);
}

function GrafikBatang({ data }) {
  const maks = Math.max(1, ...data.map((d) => d.jumlah));
  return (
    <div className="grafik-batang" role="img" aria-label="Jumlah analisis tujuh hari terakhir">
      {data.map((d) => (
        <div key={d.tanggal} className="grafik-batang__kolom">
          <span className="teks-mini angka tebal">{d.jumlah}</span>
          <div className="grafik-batang__jalur">
            <div className="grafik-batang__isi" style={{ height: `${(d.jumlah / maks) * 100}%` }}>
              {d.gagal > 0 && <div className="grafik-batang__gagal" style={{ height: `${(d.gagal / d.jumlah) * 100}%` }} />}
            </div>
          </div>
          <span className="teks-mini teks-redup">{new Date(`${d.tanggal}T00:00:00`).toLocaleDateString("id-ID", { weekday: "short" })}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminRingkasan() {
  useJudul("Admin");
  const { paket } = useKonfigurasi();
  const muat = useData(() => api.get("/admin/ringkasan"));
  const namaPaket = (kode) => paket.find((p) => p.kode === kode)?.nama || kode;

  return (
    <>
      <KepalaHalaman judul="Ringkasan platform" deskripsi="Kesehatan layanan, aktivitas analisis, dan transaksi terbaru." />
      <Muat {...muat}>
        {(d) => (
          <div className="tumpuk" style={{ gap: 20 }}>
            <div className="kisi-4">
              <Kartu rapat><Statistik ikon={LuUsers} label="Pengguna" nilai={angka(d.pengguna)} /></Kartu>
              <Kartu rapat><Statistik ikon={LuHouse} label="Properti dianalisis" nilai={angka(d.properti)} /></Kartu>
              <Kartu rapat><Statistik ikon={LuFileText} label="Laporan diunduh" nilai={angka(d.laporan)} /></Kartu>
              <Kartu rapat><Statistik ikon={LuBanknote} label="Pendapatan lunas" nilai={rupiah(d.pendapatan)} /></Kartu>
            </div>
            <div className="admin-kisi">
              <Kartu judul="Analisis 7 hari terakhir" sub="Bagian merah menunjukkan analisis yang gagal." aksi={<Tombol ke="/admin/analisis" varian="hantu" ukuran="kecil">Detail</Tombol>}>
                {d.analisis_7_hari.length ? <GrafikBatang data={d.analisis_7_hari} /> : <p className="teks-redup teks-kecil">Belum ada aktivitas.</p>}
              </Kartu>
              <Kartu judul="Inspeksi menunggu analis" rapat>
                <div className="baris" style={{ gap: 16 }}>
                  <LuClipboardCheck aria-hidden="true" style={{ width: 40, height: 40, color: "var(--biru)" }} />
                  <span className="statistik__nilai">{d.inspeksi_menunggu}</span>
                </div>
                <div style={{ marginTop: 16 }}>
                  <Tombol ke="/analis" varian="sekunder" penuh>
                    Lihat permintaan
                  </Tombol>
                </div>
              </Kartu>
            </div>
            <Kartu judul="Transaksi terbaru">
              <div className="tabel-wadah">
                <table className="tabel">
                  <thead>
                    <tr><th>Pesanan</th><th>Pengguna</th><th>Paket</th><th>Tanggal</th><th className="kanan">Jumlah</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {d.transaksi_terbaru.map((t) => (
                      <tr key={t.order_id}>
                        <td className="angka tebal">{t.order_id}</td>
                        <td>{t.pengguna_nama}</td>
                        <td>{namaPaket(t.paket)}</td>
                        <td className="teks-redup">{tanggal(t.dibuat, true)}</td>
                        <td className="kanan">{rupiah(t.jumlah)}</td>
                        <td><Lencana nada={NADA_STATUS_BAYAR[t.status]}>{kapital(t.status)}</Lencana></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Kartu>
          </div>
        )}
      </Muat>
    </>
  );
}

export function AdminPengguna() {
  useJudul("Pengguna & akses");
  const beriTahu = useNotifikasi();
  const [cari, setCari] = useState("");
  const [kueri, setKueri] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setKueri(cari.trim()), 300);
    return () => clearTimeout(id);
  }, [cari]);
  const muat = useData(() => api.get(`/admin/pengguna?cari=${encodeURIComponent(kueri)}`), [kueri]);

  const ubah = async (id, perubahan) => {
    try {
      const hasil = await api.patch(`/admin/pengguna/${id}`, perubahan);
      muat.setData((l) => l.map((p) => (p.id === id ? hasil : p)));
      beriTahu("Akses pengguna diperbarui.");
    } catch (e) {
      beriTahu(e.message, "galat");
    }
  };

  return (
    <>
      <KepalaHalaman judul="Pengguna & akses" deskripsi="Atur peran property seeker, analyst, dan admin, serta nonaktifkan akun bila diperlukan." />
      <div className="kontrol-awalan" style={{ maxWidth: 420, marginBottom: 20 }}>
        <span><LuSearch aria-hidden="true" style={{ width: 18, height: 18 }} /></span>
        <input className="kontrol" placeholder="Cari nama atau email" value={cari} onChange={(e) => setCari(e.target.value)} aria-label="Cari pengguna" />
      </div>
      <Muat {...muat}>
        {(daftar) => (
          <div className="tabel-wadah">
            <table className="tabel">
              <thead>
                <tr><th>Nama</th><th>Email</th><th>Peran</th><th className="kanan">Kredit</th><th>Bergabung</th><th>Status</th></tr>
              </thead>
              <tbody>
                {daftar.map((p) => (
                  <tr key={p.id}>
                    <td className="tebal">{p.nama}</td>
                    <td className="teks-redup">{p.email}</td>
                    <td>
                      <select className="kontrol kontrol--ringkas" value={p.peran} onChange={(e) => ubah(p.id, { peran: e.target.value })} aria-label={`Peran ${p.nama}`}>
                        <option value="pencari">Property seeker</option>
                        <option value="analis">Property analyst</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="kanan">{p.kredit_laporan}</td>
                    <td className="teks-redup">{tanggal(p.dibuat)}</td>
                    <td>
                      <button type="button" className={`sakelar ${p.aktif ? "sakelar--aktif" : ""}`} role="switch" aria-checked={p.aktif} aria-label={`Status akun ${p.nama}`} onClick={() => ubah(p.id, { aktif: !p.aktif })}>
                        <span />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Muat>
    </>
  );
}

export function AdminAnalisis() {
  useJudul("Pemantauan analisis");
  const muat = useData(() => api.get("/admin/analisis"));
  return (
    <>
      <KepalaHalaman judul="Pemantauan analisis" deskripsi="Proses analisis lokasi dan bangunan, durasi, kegagalan, serta kualitas hasil AI dibanding validasi analis." aksi={<Tombol varian="sekunder" ikon={LuRefreshCw} onClick={() => muat.muatUlang()}>Muat ulang</Tombol>} />
      <Muat {...muat}>
        {({ statistik: s, log }) => (
          <div className="tumpuk" style={{ gap: 20 }}>
            <div className="kisi-4">
              <Kartu rapat><Statistik ikon={LuActivity} label="Total analisis" nilai={angka(s.total_analisis)} keterangan={`${s.tingkat_gagal}% gagal`} /></Kartu>
              <Kartu rapat><Statistik ikon={LuClock} label="Rata-rata durasi" nilai={`${angka(s.rata_durasi_ms)} ms`} /></Kartu>
              <Kartu rapat><Statistik ikon={LuGauge} label="Rata-rata keyakinan AI" nilai={`${s.rata_kepercayaan}%`} /></Kartu>
              <Kartu rapat>
                <Statistik
                  ikon={LuCircleCheck}
                  label="Kesesuaian dengan analis"
                  nilai={s.kesesuaian_analis == null ? "–" : `${s.kesesuaian_analis}%`}
                  keterangan={`${s.temuan_divalidasi} temuan tervalidasi`}
                />
              </Kartu>
            </div>
            <div className="tabel-wadah">
              <table className="tabel">
                <thead>
                  <tr><th>Waktu</th><th>Jenis</th><th>Properti</th><th>Sumber</th><th className="kanan">Durasi</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {log.map((l) => (
                    <tr key={l.id}>
                      <td className="teks-redup">{tanggal(l.dibuat, true)}</td>
                      <td style={{ textTransform: "capitalize" }}>{l.jenis}</td>
                      <td>{l.properti_nama || "Cek cepat publik"}</td>
                      <td>
                        <Lencana nada={l.sumber === "simulasi" ? "peringatan" : "sukses"}>
                          {l.sumber === "asli" ? "Data Asli" : l.sumber === "remote" ? "Model AI" : "Simulasi"}
                        </Lencana>
                      </td>
                      <td className="kanan">{angka(l.durasi_ms)} ms</td>
                      <td>
                        <Lencana nada={l.status === "berhasil" ? "sukses" : "bahaya"}>{kapital(l.status)}</Lencana>
                        {l.pesan && <div className="teks-mini teks-redup">{l.pesan}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Muat>
    </>
  );
}

const HARGA_KOSONG = { kode: "", nama: "", kategori: "", satuan: "m2", harga_material: "", harga_upah: "", material: [], aktif: true };
const MATERIAL_KOSONG = { nama: "", satuan: "kg", koefisien: "", kemasan: "", isi_kemasan: "" };

function EditorMaterial({ daftar, onUbah, galat }) {
  const ubah = (i, kunci, nilai) => onUbah(daftar.map((m, j) => (j === i ? { ...m, [kunci]: nilai } : m)));
  return (
    <fieldset className="editor-material">
      <legend className="isian__label">Kebutuhan material per satuan pekerjaan</legend>
      <p className="isian__bantuan">Koefisien mengikuti AHSP. Isi kemasan dipakai untuk membulatkan jumlah beli, misal semen 40 kg per sak.</p>
      {daftar.map((m, i) => (
        <div key={i} className="editor-material__baris">
          <Isian label="Material" value={m.nama} onChange={(e) => ubah(i, "nama", e.target.value)} />
          <Isian label="Satuan" value={m.satuan} onChange={(e) => ubah(i, "satuan", e.target.value)} />
          <Isian label="Koefisien" inputMode="decimal" value={m.koefisien} onChange={(e) => ubah(i, "koefisien", e.target.value)} />
          <Isian label="Kemasan" value={m.kemasan || ""} onChange={(e) => ubah(i, "kemasan", e.target.value)} />
          <Isian label="Isi kemasan" inputMode="decimal" value={m.isi_kemasan || ""} onChange={(e) => ubah(i, "isi_kemasan", e.target.value)} />
          <Tombol varian="hantu" ikon={LuTrash2} aria-label="Hapus material" onClick={() => onUbah(daftar.filter((_, j) => j !== i))} />
        </div>
      ))}
      {galat && <p className="isian__galat">Periksa kembali data material: nama, satuan, dan koefisien wajib diisi.</p>}
      <Tombol varian="sekunder" ukuran="kecil" ikon={LuPlus} onClick={() => onUbah([...daftar, { ...MATERIAL_KOSONG }])}>
        Tambah material
      </Tombol>
    </fieldset>
  );
}

export function AdminHarga() {
  useJudul("Harga referensi");
  const beriTahu = useNotifikasi();
  const muat = useData(() => api.get("/admin/harga-referensi"));
  const [form, setForm] = useState(null);
  const [galat, setGalat] = useState({});
  const [proses, jalankan] = useAksi();

  const simpan = () =>
    jalankan(async () => {
      setGalat({});
      const angkaDesimal = (v) => Number(String(v).replace(",", ".")) || null;
      const isi = {
        ...form,
        harga_material: Number(form.harga_material) || 0,
        harga_upah: Number(form.harga_upah) || 0,
        material: (form.material || []).map((m) => ({
          nama: m.nama.trim(),
          satuan: m.satuan.trim(),
          koefisien: angkaDesimal(m.koefisien),
          kemasan: m.kemasan?.trim() || null,
          isi_kemasan: angkaDesimal(m.isi_kemasan),
        })),
      };
      try {
        if (form.id) {
          const { kode, id, diperbarui, ...perubahan } = isi;
          const hasil = await api.patch(`/admin/harga-referensi/${id}`, perubahan);
          muat.setData((l) => l.map((h) => (h.id === id ? hasil : h)));
        } else {
          const hasil = await api.post("/admin/harga-referensi", isi);
          muat.setData((l) => [...l, hasil]);
        }
        beriTahu("Harga referensi disimpan. Estimasi berikutnya memakai harga ini.");
        setForm(null);
      } catch (e) {
        setGalat(e.detail || {});
        beriTahu(e.message, "galat");
      }
    });

  const hapus = async (h) => {
    try {
      await api.hapus(`/admin/harga-referensi/${h.id}`);
      muat.setData((l) => l.filter((x) => x.id !== h.id));
      beriTahu("Harga referensi dihapus.");
    } catch (e) {
      beriTahu(e.message, "galat");
    }
  };

  const ubah = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <KepalaHalaman
        judul="Harga referensi renovasi"
        deskripsi="Harga satuan material dan upah per pekerjaan. Mesin estimasi biaya membaca tabel ini secara langsung."
        aksi={<Tombol ikon={LuPlus} onClick={() => setForm(HARGA_KOSONG)}>Tambah pekerjaan</Tombol>}
      />
      <Muat {...muat}>
        {(daftar) => (
          <div className="tabel-wadah">
            <table className="tabel">
              <thead>
                <tr><th>Pekerjaan</th><th>Kategori</th><th className="kanan">Material</th><th className="kanan">Upah</th><th className="kanan">Total / satuan</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {daftar.map((h) => (
                  <tr key={h.id}>
                    <td><strong>{h.nama}</strong><div className="teks-mini teks-redup angka">{h.kode}, {(h.material || []).length} material</div></td>
                    <td>{h.kategori}</td>
                    <td className="kanan">{rupiah(h.harga_material)}</td>
                    <td className="kanan">{rupiah(h.harga_upah)}</td>
                    <td className="kanan tebal">{rupiah(h.harga_material + h.harga_upah)}/{h.satuan}</td>
                    <td><Lencana nada={h.aktif ? "sukses" : "netral"}>{h.aktif ? "Aktif" : "Nonaktif"}</Lencana></td>
                    <td>
                      <div className="baris" style={{ gap: 4, justifyContent: "flex-end" }}>
                        <Tombol varian="hantu" ukuran="kecil" ikon={LuPencil} aria-label={`Ubah ${h.nama}`} onClick={() => setForm({ ...h, aktif: Boolean(h.aktif) })} />
                        <Tombol varian="hantu" ukuran="kecil" ikon={LuTrash2} aria-label={`Hapus ${h.nama}`} onClick={() => hapus(h)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Muat>
      <Modal
        terbuka={Boolean(form)}
        onTutup={() => setForm(null)}
        judul={form?.id ? "Ubah harga referensi" : "Tambah pekerjaan"}
        lebar
        aksi={<><Tombol varian="hantu" onClick={() => setForm(null)}>Batal</Tombol><Tombol onClick={simpan} memuat={proses}>Simpan harga</Tombol></>}
      >
        {form && (
          <div className="tumpuk">
            <Isian label="Kode" value={form.kode} onChange={ubah("kode")} disabled={Boolean(form.id)} galat={galat.kode} bantuan="Huruf kecil, angka, dan garis bawah. Dipakai mesin estimasi." />
            <Isian label="Nama pekerjaan" value={form.nama} onChange={ubah("nama")} galat={galat.nama} />
            <div className="kisi-2">
              <Isian label="Kategori" value={form.kategori} onChange={ubah("kategori")} galat={galat.kategori} />
              <Isian label="Satuan" value={form.satuan} onChange={ubah("satuan")} />
              <Isian label="Harga material" awalan="Rp" inputMode="numeric" value={form.harga_material} onChange={ubah("harga_material")} galat={galat.harga_material} />
              <Isian label="Harga upah" awalan="Rp" inputMode="numeric" value={form.harga_upah} onChange={ubah("harga_upah")} galat={galat.harga_upah} />
            </div>
            <EditorMaterial daftar={form.material || []} onUbah={(material) => setForm({ ...form, material })} galat={Object.keys(galat).some((k) => k.startsWith("material"))} />
            <Pilihan label="Status" value={form.aktif ? "1" : "0"} onChange={(e) => setForm({ ...form, aktif: e.target.value === "1" })} opsi={[{ nilai: "1", label: "Aktif" }, { nilai: "0", label: "Nonaktif" }]} />
          </div>
        )}
      </Modal>
    </>
  );
}

const STATUS_SUMBER = { aktif: "sukses", perlu_pembaruan: "peringatan", nonaktif: "netral" };

export function AdminSumberData() {
  useJudul("Sumber data");
  const beriTahu = useNotifikasi();
  const muat = useData(() => api.get("/admin/sumber-data"));

  const ubah = async (id, perubahan, pesan) => {
    try {
      const hasil = await api.patch(`/admin/sumber-data/${id}`, perubahan);
      muat.setData((l) => l.map((s) => (s.id === id ? hasil : s)));
      beriTahu(pesan);
    } catch (e) {
      beriTahu(e.message, "galat");
    }
  };

  return (
    <>
      <KepalaHalaman judul="Sumber data geospasial" deskripsi="Pantau kebaruan lapisan data risiko bencana, topografi, fasilitas, dan harga satuan." />
      <Muat {...muat}>
        {(daftar) => (
          <div className="kisi-2">
            {daftar.map((s) => (
              <Kartu key={s.id} rapat>
                <div className="baris-antara">
                  <Lencana nada="netral">{s.jenis}</Lencana>
                  <Lencana nada={STATUS_SUMBER[s.status]}>{kapital(s.status)}</Lencana>
                </div>
                <h3 style={{ marginTop: 12 }}>{s.nama}</h3>
                <p className="teks-kecil teks-redup">{s.penyedia} — {s.cakupan}</p>
                <p className="teks-mini teks-redup" style={{ marginTop: 8 }}>Terakhir diperbarui {tanggal(s.terakhir_diperbarui)}</p>
                <div className="baris" style={{ marginTop: 16, flexWrap: "wrap" }}>
                  <Tombol ukuran="kecil" varian="sekunder" ikon={LuRefreshCw} onClick={() => ubah(s.id, { tandai_diperbarui: true }, "Sumber data ditandai sudah diperbarui.")}>
                    Tandai diperbarui
                  </Tombol>
                  <select
                    className="kontrol kontrol--ringkas"
                    value={s.status}
                    aria-label={`Status ${s.nama}`}
                    onChange={(e) => ubah(s.id, { status: e.target.value }, "Status sumber data diperbarui.")}
                  >
                    <option value="aktif">Aktif</option>
                    <option value="perlu_pembaruan">Perlu pembaruan</option>
                    <option value="nonaktif">Nonaktif</option>
                  </select>
                </div>
              </Kartu>
            ))}
          </div>
        )}
      </Muat>
    </>
  );
}

export function AdminLaporan() {
  useJudul("Laporan");
  const muat = useData(() => api.get("/admin/laporan"));
  return (
    <>
      <KepalaHalaman judul="Laporan yang diterbitkan" deskripsi="Setiap unduhan PDF tercatat dengan nomor laporan unik." />
      <Muat {...muat}>
        {(daftar) =>
          daftar.length ? (
            <div className="tabel-wadah">
              <table className="tabel">
                <thead>
                  <tr><th>Nomor laporan</th><th>Properti</th><th>Pengguna</th><th>Diterbitkan</th></tr>
                </thead>
                <tbody>
                  {daftar.map((l) => (
                    <tr key={l.id}>
                      <td className="angka tebal">{l.nomor}</td>
                      <td>{l.properti_nama}</td>
                      <td>{l.pengguna_nama}</td>
                      <td className="teks-redup">{tanggal(l.dibuat, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Kartu><Kosong ikon={LuFileText} judul="Belum ada laporan">Laporan tercatat saat pengguna mengunduh PDF.</Kosong></Kartu>
          )
        }
      </Muat>
    </>
  );
}
