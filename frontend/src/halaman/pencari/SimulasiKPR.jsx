import { useEffect, useState } from "react";
import { LuArrowRight, LuBadgeCheck, LuCalculator, LuHouse, LuInfo, LuLandmark, LuWallet } from "react-icons/lu";
import { KepalaHalaman } from "../../komponen/tata-letak/Aplikasi";
import { Isian, Kartu, KerangkaHalaman, Modal, Pemberitahuan, Pilihan, Tombol } from "../../komponen/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { rupiah } from "../../lib/format";
import { useData, useJudul } from "../../lib/hooks";
import { useNotifikasi } from "../../lib/notifikasi";

const PEKERJAAN = [
  { nilai: "karyawan_tetap", label: "Karyawan tetap" },
  { nilai: "wirausaha", label: "Wirausaha" },
  { nilai: "profesional", label: "Profesional" },
  { nilai: "pns", label: "PNS" },
];

const PROGRAM = [
  { nilai: "promo_fixed", label: "Promo Fixed BTN — asumsi 3,75%" },
  { nilai: "platinum", label: "KPR Platinum BTN — asumsi 5,50%" },
];

function BarisAngka({ label, nilai, utama }) {
  return (
    <div className={utama ? "kpr-angka kpr-angka--utama" : "kpr-angka"}>
      <span>{label}</span>
      <strong className="angka">{rupiah(nilai || 0)}</strong>
    </div>
  );
}

export default function SimulasiKPR({ id }) {
  const { pengguna } = useAuth();
  const beriTahu = useNotifikasi();
  const [parameter, setParameter] = useState({
    properti_id: Number(id),
    program_kpr: "promo_fixed",
    persen_dp: 15,
    tenor_tahun: 20,
    sertakan_renovasi: false,
    harga_simulasi: 500_000_000,
    biaya_renovasi_manual: 25_000_000,
  });
  const [simulasi, setSimulasi] = useState(null);
  const [galatSimulasi, setGalatSimulasi] = useState("");
  const [modal, setModal] = useState(false);
  const [mengirim, setMengirim] = useState(false);
  const [hasil, setHasil] = useState(null);
  const [form, setForm] = useState({
    nama_pemohon: pengguna?.nama || "",
    telepon: pengguna?.telepon || "",
    email: pengguna?.email || "",
    kota_properti: "",
    status_pekerjaan: "karyawan_tetap",
    penghasilan_bulanan: "",
    pilihan_layanan: "konsultasi",
    persetujuan: false,
    catatan: "",
  });
  const { data: detail, galat, memuat, muatUlang } = useData(() => api.get(`/properti/${id}`), [id]);
  useJudul("Simulasi KPR");

  useEffect(() => {
    let aktif = true;
    const timer = setTimeout(async () => {
      try {
        const data = await api.post("/kpr/simulasi", parameter);
        if (aktif) {
          setSimulasi(data);
          setGalatSimulasi("");
        }
      } catch (e) {
        if (aktif) setGalatSimulasi(e.message);
      }
    }, 180);
    return () => {
      aktif = false;
      clearTimeout(timer);
    };
  }, [parameter]);

  if (memuat) return <KerangkaHalaman />;
  if (galat) return <Pemberitahuan nada="bahaya" judul="Properti tidak dapat dimuat"><Tombol varian="sekunder" onClick={() => muatUlang()}>Muat ulang</Tombol></Pemberitahuan>;

  const renovasi = detail.biaya?.total || 0;
  const pengajuan = detail.pengajuan_kpr;
  const ubahParameter = (nama, nilai) => setParameter((lama) => ({ ...lama, [nama]: nilai }));
  const ubahForm = (nama, nilai) => setForm((lama) => ({ ...lama, [nama]: nilai }));

  const kirim = async () => {
    if (form.nama_pemohon.trim().length < 2) {
      beriTahu("Isi nama lengkap pemohon.", "galat");
      return;
    }
    if (form.telepon.trim().length < 8) {
      beriTahu("Isi nomor WhatsApp yang valid (minimal 8 digit).", "galat");
      return;
    }
    if (!form.kota_properti.trim()) {
      beriTahu("Isi kota properti.", "galat");
      return;
    }
    if (!Number(form.penghasilan_bulanan)) {
      beriTahu("Isi estimasi penghasilan bersih bulanan.", "galat");
      return;
    }
    setMengirim(true);
    try {
      const data = await api.post("/kpr/ajukan-btn", {
        ...parameter,
        ...form,
        penghasilan_bulanan: Number(form.penghasilan_bulanan),
      });
      setHasil(data);
      muatUlang({ diam: true });
    } catch (e) {
      beriTahu(e.message, "galat");
    } finally {
      setMengirim(false);
    }
  };

  return (
    <>
      <KepalaHalaman
        kembali={{ ke: `/app/properti/${id}`, label: "Detail properti" }}
        judul="Simulasi pembiayaan rumah"
        deskripsi={`Hitung skenario KPR indikatif untuk ${detail.properti.nama}.`}
      />

      <Pemberitahuan nada="info" judul="Simulasi HomeWise, bukan penawaran bank">
        Pilihan BTN di bawah adalah preferensi dan asumsi perhitungan dari PRD. HomeWise belum mengirim data Anda ke bank secara otomatis.
      </Pemberitahuan>

      {pengajuan && (
        <div style={{ marginTop: 12 }}>
          <Pemberitahuan nada="sukses" judul={`Permintaan terakhir tersimpan (${pengajuan.kode_rujukan || `KPR-${pengajuan.id}`})`}>
            Plafon indikatif {rupiah(pengajuan.plafon_kpr)} · estimasi {rupiah(pengajuan.estimasi_angsuran)} / bulan.
          </Pemberitahuan>
        </div>
      )}

      <div className="kpr-kisi">
        <div className="tumpuk">
          <Kartu judul="Atur skenario" sub="Ubah parameter untuk melihat estimasi secara langsung.">
            <div className="kpr-form">
              {detail.properti.harga_penawaran <= 0 && (
                <Isian
                  label="Harga rumah untuk simulasi"
                  type="number"
                  min="0"
                  awalan="Rp"
                  value={parameter.harga_simulasi}
                  onChange={(e) => ubahParameter("harga_simulasi", Number(e.target.value) || 0)}
                  bantuan="Harga penawaran pada properti ini belum diisi, jadi Anda bisa memakai angka simulasi."
                />
              )}
              <Pilihan
                label="Asumsi program bunga"
                value={parameter.program_kpr}
                onChange={(e) => ubahParameter("program_kpr", e.target.value)}
                opsi={PROGRAM}
              />
              <div className="isian">
                <div className="baris-antara">
                  <label className="isian__label" htmlFor="persen-dp">Uang muka</label>
                  <strong className="angka">{parameter.persen_dp}%</strong>
                </div>
                <input id="persen-dp" type="range" min="10" max="50" step="1" value={parameter.persen_dp} onChange={(e) => ubahParameter("persen_dp", Number(e.target.value))} />
                <div className="baris-antara teks-mini teks-redup"><span>10%</span><span>50%</span></div>
              </div>
              <div className="isian">
                <div className="baris-antara">
                  <label className="isian__label" htmlFor="tenor">Tenor</label>
                  <strong className="angka">{parameter.tenor_tahun} tahun</strong>
                </div>
                <input id="tenor" type="range" min="5" max="30" step="1" value={parameter.tenor_tahun} onChange={(e) => ubahParameter("tenor_tahun", Number(e.target.value))} />
                <div className="baris-antara teks-mini teks-redup"><span>5 tahun</span><span>30 tahun</span></div>
              </div>
              <label className="kpr-bundel">
                <input
                  type="checkbox"
                  checked={parameter.sertakan_renovasi}
                  onChange={(e) => ubahParameter("sertakan_renovasi", e.target.checked)}
                />
                <span>
                  <strong>Sertakan estimasi renovasi {renovasi ? `(${rupiah(renovasi)})` : ""}</strong>
                  <small>
                    {renovasi
                      ? "Simulasikan biaya renovasi hasil analisis bangunan sebagai bagian dari kebutuhan pembiayaan."
                      : "Belum ada analisis bangunan — centang untuk mengisi estimasi biaya renovasi manual."}
                  </small>
                </span>
              </label>
              {parameter.sertakan_renovasi && !renovasi && (
                <Isian
                  label="Estimasi biaya renovasi manual"
                  type="number"
                  min="0"
                  awalan="Rp"
                  value={parameter.biaya_renovasi_manual}
                  onChange={(e) => ubahParameter("biaya_renovasi_manual", Number(e.target.value) || 0)}
                  bantuan="Anda juga dapat melengkapi analisis bangunan untuk mendapat estimasi otomatis berbasis AI."
                />
              )}
            </div>
          </Kartu>

          {simulasi && (
            <Kartu judul="Rincian biaya awal" sub="Estimasi biaya di luar angsuran bulanan.">
              <div className="kpr-rincian">
                <BarisAngka label="Uang muka" nilai={simulasi.biaya_awal.uang_muka} />
                <BarisAngka label="BPHTB (asumsi 5%)" nilai={simulasi.biaya_awal.bphtb} />
                <BarisAngka label="Notaris / PPAT (asumsi 1%)" nilai={simulasi.biaya_awal.notaris_ppat} />
                <BarisAngka label="Provisi & administrasi (asumsi 1,5%)" nilai={simulasi.biaya_awal.provisi_administrasi} />
                <BarisAngka label="Total biaya awal" nilai={simulasi.biaya_awal.total} utama />
              </div>
            </Kartu>
          )}
        </div>

        <aside>
          <Kartu className="kpr-hasil">
            <span className="kpr-hasil__ikon"><LuCalculator aria-hidden="true" /></span>
            <span className="teks-kecil teks-redup">Estimasi angsuran per bulan</span>
            {galatSimulasi ? <p className="isian__galat">{galatSimulasi}</p> : !simulasi ? <span className="pemuat" /> : (
              <>
                <strong className="kpr-hasil__angsuran angka">{rupiah(simulasi.estimasi_angsuran)}</strong>
                <span className="teks-mini teks-redup">{simulasi.program.suku_bunga}% per tahun · {simulasi.tenor_tahun} tahun</span>
                <div className="kpr-hasil__ringkas">
                  <BarisAngka label="Harga rumah" nilai={simulasi.properti.harga} />
                  {simulasi.biaya_renovasi > 0 && <BarisAngka label="Renovasi" nilai={simulasi.biaya_renovasi} />}
                  <BarisAngka label="Plafon indikatif" nilai={simulasi.plafon_kpr} />
                  <BarisAngka label="Penghasilan gabungan minimum" nilai={simulasi.estimasi_penghasilan_minimal} />
                </div>
                <p className="kpr-disclaimer"><LuInfo aria-hidden="true" />{simulasi.disclaimer}</p>
                <Tombol penuh ikonKanan={LuArrowRight} onClick={() => { setHasil(null); setModal(true); }}>
                  Minta konsultasi pembiayaan
                </Tombol>
              </>
            )}
          </Kartu>
        </aside>
      </div>

      <Modal
        terbuka={modal}
        onTutup={() => setModal(false)}
        judul={hasil ? "Permintaan tersimpan" : "Permintaan konsultasi KPR"}
        deskripsi={hasil ? "Simpan nomor rujukan untuk tindak lanjut." : "Lengkapi data berikut. Data hanya disimpan di HomeWise saat ini."}
        lebar
        aksi={!hasil && (
          <>
            <Tombol varian="hantu" onClick={() => setModal(false)}>Batal</Tombol>
            <Tombol onClick={kirim} memuat={mengirim} disabled={!form.persetujuan}>Kirim permintaan</Tombol>
          </>
        )}
      >
        {hasil ? (
          <div className="kpr-sukses">
            <span><LuBadgeCheck aria-hidden="true" /></span>
            <strong className="angka">{hasil.kode_rujukan}</strong>
            <p className="teks-kecil teks-redup">Permintaan ini tersimpan aman di HomeWise dan belum diteruskan ke bank. Tim HomeWise dapat menindaklanjuti setelah kanal resmi tersedia.</p>
            <Tombol varian="sekunder" onClick={() => setModal(false)}>Selesai</Tombol>
          </div>
        ) : (
          <div className="kpr-form">
            <div className="kisi-2">
              <Isian label="Nama lengkap" value={form.nama_pemohon} onChange={(e) => ubahForm("nama_pemohon", e.target.value)} required />
              <Isian label="Nomor WhatsApp" value={form.telepon} onChange={(e) => ubahForm("telepon", e.target.value)} placeholder="08xxxxxxxxxx" required />
              <Isian label="Email" type="email" value={form.email} onChange={(e) => ubahForm("email", e.target.value)} required />
              <Isian label="Kota properti" value={form.kota_properti} onChange={(e) => ubahForm("kota_properti", e.target.value)} required />
              <Pilihan label="Status pekerjaan" value={form.status_pekerjaan} onChange={(e) => ubahForm("status_pekerjaan", e.target.value)} opsi={PEKERJAAN} />
              <Isian label="Penghasilan bersih bulanan" type="number" min="1" awalan="Rp" value={form.penghasilan_bulanan} onChange={(e) => ubahForm("penghasilan_bulanan", e.target.value)} required />
            </div>
            <fieldset className="kpr-layanan">
              <legend className="isian__label">Pilihan layanan</legend>
              <label><input type="radio" name="layanan" checked={form.pilihan_layanan === "konsultasi"} onChange={() => ubahForm("pilihan_layanan", "konsultasi")} /><span><LuLandmark />Konsultasi dengan loan officer BTN bila kanal resmi tersedia</span></label>
              <label><input type="radio" name="layanan" checked={form.pilihan_layanan === "mandiri"} onChange={() => ubahForm("pilihan_layanan", "mandiri")} /><span><LuHouse />Saya akan melanjutkan pengajuan mandiri</span></label>
            </fieldset>
            <label className="kpr-consent">
              <input type="checkbox" checked={form.persetujuan} onChange={(e) => ubahForm("persetujuan", e.target.checked)} />
              <span>Saya menyetujui ringkasan data properti dan simulasi KPR disimpan oleh HomeWise untuk permintaan konsultasi. Data tidak diteruskan ke BTN tanpa kanal mitra resmi dan proses yang sah.</span>
            </label>
          </div>
        )}
      </Modal>
    </>
  );
}
