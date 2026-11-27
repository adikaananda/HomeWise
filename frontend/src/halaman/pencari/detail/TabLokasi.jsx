import { useMemo } from "react";
import { LuCircleCheck, LuCircleHelp, LuDatabase, LuMountain, LuRoute, LuTriangleAlert, LuWaves } from "react-icons/lu";
import { Peta, WARNA_INDIKATOR } from "../../../komponen/Peta";
import { BatangSkor, Kartu, LencanaLevel, Pemberitahuan } from "../../../komponen/ui";
import { jarak } from "../../../lib/format";
import { useKonfigurasi } from "../../../lib/konfigurasi";

const IKON_RISIKO = { banjir: LuWaves, longsor: LuMountain, gempa: LuTriangleAlert };

function DaftarPoin({ judul, item, ikon: Ikon, warna, kosong }) {
  return (
    <Kartu judul={judul} rapat>
      {item.length ? (
        <ul className="daftar-poin">
          {item.map((teks, i) => (
            <li key={i}>
              <Ikon color={warna} aria-hidden="true" />
              <span>{teks}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="teks-kecil teks-redup">{kosong}</p>
      )}
    </Kartu>
  );
}

export function TabLokasi({ detail }) {
  const { kategori_fasilitas: kategori, indikator } = useKonfigurasi();
  const { properti, lokasi } = detail;
  const pusat = useMemo(() => ({ lat: properti.lat, lng: properti.lng }), [properti.lat, properti.lng]);

  if (!lokasi) return <Pemberitahuan nada="peringatan">Analisis lokasi belum tersedia. Jalankan ulang analisis dari menu di atas.</Pemberitahuan>;

  const { data, hasil, rincian } = lokasi;
  const legenda = Object.entries(WARNA_INDIKATOR);

  return (
    <div className="tumpuk" style={{ gap: 20 }}>
      <div className="lokasi-kisi">
        <Kartu rapat>
          <Peta pusat={pusat} fasilitas={data.fasilitas} kategoriFasilitas={kategori} risikoBanjir={data.risiko.banjir.level} tinggi={420} />
          <div className="legenda" style={{ marginTop: 12 }}>
            <span>
              <i style={{ background: "var(--biru)" }} /> Properti
            </span>
            {legenda.map(([kode, warna]) => (
              <span key={kode}>
                <i style={{ background: warna }} /> {indikator[kode]}
              </span>
            ))}
            <span>
              <i style={{ background: "rgba(81,218,158,.5)", borderRadius: 2 }} /> Zona risiko banjir 650 m
            </span>
          </div>
        </Kartu>

        <Kartu judul="Indikator kelayakan" sub="Bobot mengikuti tujuan pembelian. Klik indikator untuk melihat arti dan dasar perhitungannya.">
          <div className="tumpuk" style={{ gap: 14 }}>
            {hasil.indikator.map((i) => {
              const info = rincian?.indikator?.[i.kode];
              return (
                <div key={i.kode}>
                  <BatangSkor label={i.label} skor={i.skor} keterangan={`bobot ${Math.round(i.bobot * 100)}%`} />
                  {info && (
                    <details className="indikator-rinci">
                      <summary>Apa artinya & dari mana angkanya?</summary>
                      <p>{info.arti}</p>
                      {info.dasar.length > 0 && (
                        <ul>
                          {info.dasar.map((d) => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      )}
                      <p className="teks-mini teks-redup">Cara hitung: {info.cara}</p>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </Kartu>
      </div>

      <div className="kisi-3">
        {Object.entries(data.risiko).map(([nama, info]) => {
          const Ikon = IKON_RISIKO[nama] || LuTriangleAlert;
          return (
            <Kartu key={nama} rapat>
              <div className="baris-antara">
                <span className="baris" style={{ gap: 8 }}>
                  <Ikon aria-hidden="true" style={{ width: 20, height: 20, color: "var(--biru)" }} />
                  <strong style={{ textTransform: "capitalize" }}>Risiko {nama}</strong>
                </span>
                <LencanaLevel level={info.level} />
              </div>
              <p className="teks-mini teks-redup" style={{ marginTop: 8 }}>
                Indeks {info.skor.toFixed(2)} dari 1,00. {info.sumber}
              </p>
            </Kartu>
          );
        })}
      </div>

      <div className="kisi-2" style={{ alignItems: "start" }}>
        <Kartu judul="Topografi & akses" sub="Kondisi tanah dan jalan di sekitar titik properti, beserta artinya." rapat>
          {rincian ? (
            <ul className="topo-akses">
              {rincian.topografi_akses.map((r) => (
                <li key={r.label}>
                  <div className="topo-akses__atas">
                    <span>{r.label}</span>
                    <strong>{r.nilai}</strong>
                  </div>
                  <p className="teks-mini">{r.interpretasi}</p>
                  <p className="teks-mini teks-redup">
                    {r.arti} Sumber: {r.sumber}.
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <dl className="daftar-definisi">
              <dt>Elevasi</dt>
              <dd>{data.topografi.elevasi_m} mdpl</dd>
              <dt>Kemiringan lahan</dt>
              <dd>{data.topografi.kemiringan_persen}%</dd>
              <dt>Jarak ke jalan utama</dt>
              <dd>{jarak(data.aksesibilitas.jarak_jalan_utama_m)}</dd>
              <dt>Lebar jalan depan</dt>
              <dd>{data.aksesibilitas.lebar_jalan_depan_m} m</dd>
            </dl>
          )}
        </Kartu>
        <Kartu judul="Fasilitas terdekat" rapat>
          <ul className="daftar-sederhana">
            {data.fasilitas.slice(0, 8).map((f) => (
              <li key={`${f.nama}${f.jarak_m}`}>
                <div>
                  <strong className="teks-kecil">{f.nama}</strong>
                  <span className="teks-mini teks-redup">{kategori[f.kategori]?.label || f.kategori}</span>
                </div>
                <span className="angka teks-kecil tebal">
                  <LuRoute aria-hidden="true" style={{ width: 14, height: 14, display: "inline", marginRight: 4, verticalAlign: -2 }} />
                  {jarak(f.jarak_m)}
                </span>
              </li>
            ))}
          </ul>
        </Kartu>
      </div>

      {rincian && (
        <Kartu
          judul="Fasilitas per kategori"
          sub={`${rincian.jumlah_fasilitas.dalam_1km} fasilitas dalam 1 km dan ${rincian.jumlah_fasilitas.dalam_3km} dalam 3 km. Jarak dihitung garis lurus dari titik properti.`}
          rapat
        >
          <div className="tabel-wadah">
            <table className="tabel">
              <thead>
                <tr>
                  <th>Kategori</th>
                  <th>Terdekat</th>
                  <th className="kanan">Jarak</th>
                  <th className="kanan">Ideal</th>
                  <th className="kanan">Ditemukan</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rincian.fasilitas_per_kategori.map((f) => (
                  <tr key={f.kategori}>
                    <td>
                      <strong className="teks-kecil">{f.label}</strong>
                      <div className="teks-mini teks-redup">{f.label_indikator}</div>
                    </td>
                    <td className="teks-kecil">{f.terdekat_nama || "–"}</td>
                    <td className="kanan angka">{f.terdekat_m != null ? jarak(f.terdekat_m) : "–"}</td>
                    <td className="kanan angka">≤ {jarak(f.jarak_ideal_m)}</td>
                    <td className="kanan angka">{f.jumlah}</td>
                    <td className="teks-mini">{f.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kartu>
      )}

      <div className="kisi-3">
        <DaftarPoin
          judul="Faktor pendukung"
          ikon={LuCircleCheck}
          warna="var(--hijau)"
          item={hasil.faktor_pendukung.map((f) => `${f.judul}. ${f.detail}`)}
          kosong="Belum ada indikator berbobot tinggi yang menonjol."
        />
        <DaftarPoin
          judul="Potensi risiko"
          ikon={LuTriangleAlert}
          warna="var(--peringatan)"
          item={hasil.risiko.map((r) => `${r.judul}. ${r.detail}`)}
          kosong="Tidak ada risiko menonjol pada data yang tersedia."
        />
        <DaftarPoin judul="Perlu diverifikasi" ikon={LuCircleHelp} warna="var(--biru)" item={hasil.perlu_verifikasi} kosong="-" />
      </div>

      {rincian && (
        <Kartu judul="Sumber data" sub="Data yang dipakai untuk analisis lokasi ini, beserta cakupan dan keterbatasannya." rapat>
          <ul className="sumber-data">
            {rincian.sumber_data.map((d) => (
              <li key={d.nama}>
                <LuDatabase aria-hidden="true" />
                <div>
                  <strong className="teks-kecil">{d.nama}</strong>
                  <span className="teks-mini teks-redup">{`${d.penyedia} · ${d.cakupan}`}</span>
                  <span className="teks-mini">Dipakai untuk: {d.dipakai_untuk}</span>
                  <span className="teks-mini teks-redup">{d.catatan}</span>
                </div>
              </li>
            ))}
          </ul>
        </Kartu>
      )}

      <Pemberitahuan judul="Keterbatasan data">{hasil.keterbatasan_data.join(" ")}</Pemberitahuan>
    </div>
  );
}
