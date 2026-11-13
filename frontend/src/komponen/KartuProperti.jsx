import { LuBookmark, LuBookmarkCheck, LuLockOpen, LuMapPin } from "react-icons/lu";
import { urlBerkas } from "../lib/api";
import { rupiahRingkas } from "../lib/format";
import { labelTujuan, useKonfigurasi } from "../lib/konfigurasi";
import { Tautan } from "../lib/router";
import { IlustrasiPeta } from "./ilustrasi/Ilustrasi";
import { CincinSkor, Lencana } from "./ui";

export function KartuProperti({ properti, dipilih, onPilih, onSimpan }) {
  const konfigurasi = useKonfigurasi();
  const sampul = urlBerkas(properti.foto_sampul);

  return (
    <article className={`kartu-properti ${dipilih ? "kartu-properti--dipilih" : ""}`}>
      <Tautan ke={`/app/properti/${properti.id}`} className="kartu-properti__tautan" aria-label={`Buka ${properti.nama}`} />
      <div className="kartu-properti__media">
        {sampul ? <img src={sampul} alt="" loading="lazy" /> : <IlustrasiPeta />}
        <div className="kartu-properti__lencana">
          <Lencana nada="netral">{labelTujuan(konfigurasi, properti.tujuan)}</Lencana>
          {properti.laporan_terbuka ? (
            <Lencana nada="sukses" ikon={LuLockOpen}>
              Lengkap
            </Lencana>
          ) : null}
        </div>
        {onSimpan && (
          <button
            type="button"
            className="kartu-properti__simpan"
            onClick={() => onSimpan(properti)}
            aria-label={properti.tersimpan ? "Hapus dari tersimpan" : "Simpan properti"}
            aria-pressed={Boolean(properti.tersimpan)}
          >
            {properti.tersimpan ? <LuBookmarkCheck /> : <LuBookmark />}
          </button>
        )}
      </div>
      <div className="kartu-properti__isi">
        <div style={{ minWidth: 0 }}>
          <h3 className="kartu-properti__judul">{properti.nama}</h3>
          <p className="kartu-properti__alamat">
            <LuMapPin aria-hidden="true" />
            <span>{properti.alamat}</span>
          </p>
          <p className="angka tebal" style={{ marginTop: 8 }}>
            {rupiahRingkas(properti.harga_penawaran)}
          </p>
          {properti.tahap && (
            <span className="pil-tahap" data-tahap={properti.tahap.kode}>
              <span className="pil-tahap__titik" aria-hidden="true" />
              {properti.tahap.label}
            </span>
          )}
        </div>
        <CincinSkor skor={properti.skor_lokasi} ukuran={58} tebal={6} label="Skor lokasi" />
      </div>
      {onPilih && (
        <label className="kartu-properti__bandingkan">
          <input type="checkbox" checked={dipilih} onChange={() => onPilih(properti.id)} />
          Bandingkan
        </label>
      )}
    </article>
  );
}
