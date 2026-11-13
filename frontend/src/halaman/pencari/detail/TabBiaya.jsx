import { LuCalculator } from "react-icons/lu";
import { Kartu, Kosong, Pemberitahuan } from "../../../komponen/ui";
import { rupiah, rupiahRingkas } from "../../../lib/format";

const WARNA_KOMPONEN = ["var(--biru)", "var(--mint)", "var(--langit)"];

export function TabBiaya({ detail, keBangunan }) {
  const { biaya, investasi } = detail;
  const komponen = [
    { label: "Harga penawaran", nilai: investasi.harga_penawaran },
    { label: "Estimasi renovasi", nilai: investasi.renovasi },
    { label: "Biaya transaksi", nilai: investasi.biaya_transaksi },
  ];

  return (
    <div className="tumpuk" style={{ gap: 20 }}>
      <Kartu>
        <div className="investasi-ringkas">
          <div>
            <span className="teks-kecil teks-redup">Total investasi awal</span>
            <p className="investasi-ringkas__total angka">{rupiah(investasi.total)}</p>
            <p className="teks-redup teks-kecil" style={{ maxWidth: "60ch" }}>
              {investasi.ringkasan}
            </p>
          </div>
          <div className="investasi-ringkas__meta">
            <div>
              <span className="teks-mini teks-redup">Harga per m² bangunan</span>
              <strong className="angka">{investasi.harga_per_m2 ? rupiah(investasi.harga_per_m2) : "–"}</strong>
            </div>
            <div>
              <span className="teks-mini teks-redup">Total per m² bangunan</span>
              <strong className="angka">{investasi.total_per_m2 ? rupiah(investasi.total_per_m2) : "–"}</strong>
            </div>
            <div>
              <span className="teks-mini teks-redup">Rasio renovasi terhadap harga</span>
              <strong className="angka">{investasi.rasio_renovasi_persen.toLocaleString("id-ID")}%</strong>
            </div>
          </div>
        </div>
        <div className="batang-tumpuk" role="img" aria-label="Komposisi total investasi">
          {komponen.map((k, i) => (
            <span key={k.label} style={{ flexGrow: Math.max(k.nilai, investasi.total * 0.01), background: WARNA_KOMPONEN[i] }} />
          ))}
        </div>
        <div className="legenda" style={{ marginTop: 10 }}>
          {komponen.map((k, i) => (
            <span key={k.label}>
              <i style={{ background: WARNA_KOMPONEN[i] }} />
              {k.label} <strong className="angka">{rupiahRingkas(k.nilai)}</strong>
            </span>
          ))}
        </div>
      </Kartu>

      <div className="biaya-kisi">
        <Kartu judul="Rincian estimasi renovasi" sub="Volume dihitung dari luas temuan, harga dari referensi satuan yang dikelola admin.">
          {biaya?.item.length ? (
            <>
              <div className="tabel-wadah">
                <table className="tabel">
                  <thead>
                    <tr>
                      <th>Pekerjaan</th>
                      <th className="kanan">Volume</th>
                      <th className="kanan">Harga satuan</th>
                      <th className="kanan">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {biaya.item.map((i) => (
                      <tr key={i.kode}>
                        <td>
                          <strong>{i.pekerjaan}</strong>
                          <div className="teks-mini teks-redup">Untuk: {i.sumber_temuan.join(", ")}</div>
                        </td>
                        <td className="kanan">
                          {i.volume.toLocaleString("id-ID")} {i.satuan === "m2" ? "m²" : i.satuan}
                        </td>
                        <td className="kanan">{rupiah(i.harga_satuan)}</td>
                        <td className="kanan tebal">{rupiah(i.jumlah)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3}>Subtotal</td>
                      <td className="kanan">{rupiah(biaya.subtotal)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3}>Kontingensi {Math.round(biaya.asumsi.tarif_kontingensi * 100)}%</td>
                      <td className="kanan">{rupiah(biaya.kontingensi)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3}>Total estimasi renovasi</td>
                      <td className="kanan" style={{ color: "var(--biru-tua)" }}>
                        {rupiah(biaya.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="teks-mini teks-redup" style={{ marginTop: 10 }}>
                Rentang wajar {rupiah(biaya.rentang_min)} – {rupiah(biaya.rentang_maks)}. Indeks harga wilayah {biaya.asumsi.indeks_harga_wilayah}.
              </p>
            </>
          ) : (
            <Kosong ikon={LuCalculator} judul="Belum ada estimasi renovasi" aksi={keBangunan}>
              Unggah dan analisis foto bangunan untuk menghitung kebutuhan renovasi.
            </Kosong>
          )}
        </Kartu>

        <Kartu judul="Biaya transaksi" rapat>
          <dl className="daftar-definisi">
            {investasi.rincian_transaksi.map((r) => (
              <div key={r.nama} style={{ display: "contents" }}>
                <dt>{r.nama}</dt>
                <dd className="angka">{rupiah(r.jumlah)}</dd>
              </div>
            ))}
            <dt className="tebal">Total biaya transaksi</dt>
            <dd className="angka tebal">{rupiah(investasi.biaya_transaksi)}</dd>
          </dl>
          <div style={{ marginTop: 16 }}>
            <Pemberitahuan>{investasi.asumsi}</Pemberitahuan>
          </div>
        </Kartu>
      </div>
    </div>
  );
}
