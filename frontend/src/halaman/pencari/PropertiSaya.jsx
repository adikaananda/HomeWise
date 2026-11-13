import { useEffect, useState } from "react";
import { LuGitCompare, LuHouse, LuPlus, LuSearch } from "react-icons/lu";
import { KartuProperti } from "../../komponen/KartuProperti";
import { KepalaHalaman } from "../../komponen/tata-letak/Aplikasi";
import { GalatMuat, Kartu, Kerangka, Kosong, Segmen, Tombol } from "../../komponen/ui";
import { api } from "../../lib/api";
import { useData, useJudul } from "../../lib/hooks";
import { useNotifikasi } from "../../lib/notifikasi";
import { useRouter } from "../../lib/router";

export default function PropertiSaya() {
  useJudul("Properti saya");
  const { navigasi } = useRouter();
  const beriTahu = useNotifikasi();
  const [cari, setCari] = useState("");
  const [kueri, setKueri] = useState("");
  const [filter, setFilter] = useState("semua");
  const [dipilih, setDipilih] = useState([]);

  useEffect(() => {
    const id = setTimeout(() => setKueri(cari.trim()), 300);
    return () => clearTimeout(id);
  }, [cari]);

  const { data, setData, galat, memuat, muatUlang } = useData(
    () => api.get(`/properti?cari=${encodeURIComponent(kueri)}${filter === "tersimpan" ? "&tersimpan=1" : ""}`),
    [kueri, filter],
  );

  const pilih = (id) =>
    setDipilih((lama) => {
      if (lama.includes(id)) return lama.filter((x) => x !== id);
      if (lama.length >= 4) {
        beriTahu("Maksimal 4 properti untuk dibandingkan.", "info");
        return lama;
      }
      return [...lama, id];
    });

  const simpan = async (properti) => {
    try {
      await api.patch(`/properti/${properti.id}`, { tersimpan: !properti.tersimpan });
      setData((lama) =>
        filter === "tersimpan" && properti.tersimpan
          ? lama.filter((p) => p.id !== properti.id)
          : lama.map((p) => (p.id === properti.id ? { ...p, tersimpan: properti.tersimpan ? 0 : 1 } : p)),
      );
    } catch (e) {
      beriTahu(e.message, "galat");
    }
  };

  return (
    <>
      <KepalaHalaman
        judul="Properti saya"
        deskripsi="Semua kandidat yang pernah Anda analisis. Pilih dua sampai empat untuk dibandingkan."
        aksi={
          <Tombol ke="/app/properti/baru" ikon={LuPlus}>
            Analisis properti
          </Tombol>
        }
      />

      <div className="baris-antara" style={{ marginBottom: 20 }}>
        <div className="kontrol-awalan" style={{ flex: "1 1 280px", maxWidth: 420 }}>
          <span>
            <LuSearch aria-hidden="true" style={{ width: 18, height: 18 }} />
          </span>
          <input className="kontrol" placeholder="Cari nama atau alamat" value={cari} onChange={(e) => setCari(e.target.value)} aria-label="Cari properti" />
        </div>
        <Segmen
          label="Filter properti"
          nilai={filter}
          onUbah={setFilter}
          opsi={[
            { nilai: "semua", label: "Semua" },
            { nilai: "tersimpan", label: "Tersimpan" },
          ]}
        />
      </div>

      {memuat ? (
        <div className="kisi-properti">
          {[1, 2, 3].map((i) => (
            <Kerangka key={i} tinggi={300} style={{ borderRadius: "var(--r-lg)" }} />
          ))}
        </div>
      ) : galat ? (
        <GalatMuat galat={galat} onCobaLagi={muatUlang} />
      ) : data.length ? (
        <div className="kisi-properti">
          {data.map((p) => (
            <KartuProperti key={p.id} properti={p} dipilih={dipilih.includes(p.id)} onPilih={pilih} onSimpan={simpan} />
          ))}
        </div>
      ) : (
        <Kartu>
          <Kosong
            ikon={LuHouse}
            judul={kueri || filter === "tersimpan" ? "Tidak ada properti yang cocok" : "Belum ada properti"}
            aksi={<Tombol ke="/app/properti/baru" ikon={LuPlus}>Analisis properti</Tombol>}
          >
            {kueri ? "Coba kata kunci lain." : "Tambahkan properti dari iklan yang Anda temukan untuk melihat kelayakan lokasinya."}
          </Kosong>
        </Kartu>
      )}

      {dipilih.length > 0 && (
        <div className="bilah-bandingkan" role="region" aria-label="Bandingkan properti">
          <span className="teks-kecil">
            <strong>{dipilih.length}</strong> properti dipilih
          </span>
          <div className="baris">
            <Tombol varian="hantu" ukuran="kecil" onClick={() => setDipilih([])}>
              Batal
            </Tombol>
            <Tombol ukuran="kecil" ikon={LuGitCompare} disabled={dipilih.length < 2} onClick={() => navigasi(`/app/bandingkan?ids=${dipilih.join(",")}`)}>
              Bandingkan
            </Tombol>
          </div>
        </div>
      )}
    </>
  );
}
