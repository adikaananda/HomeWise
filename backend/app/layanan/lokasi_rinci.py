"""Penjelasan rinci hasil analisis lokasi untuk ditampilkan ke pengguna.

Semua fungsi di sini membaca data mentah analisis lokasi (yang tersimpan) dan menyusun:
- sumber data yang dipakai beserta cakupan dan keterbatasannya,
- penjelasan dan dasar perhitungan tiap indikator (misalnya "Aktivitas ekonomi"),
- tabel "Topografi & akses" lengkap dengan interpretasi tiap angka,
- ringkasan fasilitas per kategori (terdekat, jumlah, jarak ideal).

Dihitung saat dibaca, sehingga analisis lama ikut mendapat penjelasan baru tanpa dianalisis ulang.
"""
from .konstanta import INDIKATOR, KATEGORI_FASILITAS
from .lokasi import BOBOT_RISIKO

RADIUS_PENCARIAN = {
    "rumah_sakit": 5000, "kampus": 5000, "stasiun": 5000,
    "klinik": 3000, "sekolah": 3000, "pasar": 3000, "perkantoran": 3000,
    "halte": 1500,
}

PENJELASAN_INDIKATOR = {
    "keamanan_bencana": {
        "arti": "Seberapa aman titik properti dari bahaya banjir, tanah longsor, dan gempa bumi.",
        "cara": "100 dikurangi indeks bahaya gabungan InaRISK (banjir 50%, longsor 30%, gempa 20%). Semakin tinggi skor, semakin aman.",
    },
    "aksesibilitas": {
        "arti": "Kemudahan kendaraan mencapai properti: jarak ke jalan utama dan lebar jalan di depan properti.",
        "cara": "Skor penuh bila jalan utama (arteri/kolektor) ≤ 250 m, turun bertahap bila lebih jauh. Ditambah poin bila jalan depan lebih lebar dari 4 m.",
    },
    "kesehatan": {
        "arti": "Kedekatan dengan layanan kesehatan: rumah sakit dan klinik/puskesmas.",
        "cara": "Tiap kategori dinilai dari jarak terdekat dibanding jarak ideal. Skor = 70% kategori terbaik + 30% kategori terlemah.",
    },
    "pendidikan": {
        "arti": "Kedekatan dengan sekolah (SD–SMA) dan kampus.",
        "cara": "Tiap kategori dinilai dari jarak terdekat dibanding jarak ideal. Skor = 70% kategori terbaik + 30% kategori terlemah.",
    },
    "ekonomi": {
        "arti": "Seberapa dekat properti dengan pusat kegiatan ekonomi sehari-hari: pasar, supermarket/mal, dan kawasan perkantoran. "
                "Bagi hunian, ini berarti kemudahan belanja dan dekat tempat kerja. Bagi usaha, ini proksi keramaian calon pembeli.",
        "cara": "Pasar/pusat belanja ideal ≤ 2 km, perkantoran ideal ≤ 3 km. Jarak ≤ setengah jarak ideal mendapat skor 100. "
                "Skor = 70% kategori terbaik + 30% kategori terlemah. Belum memperhitungkan omzet, jumlah pengunjung, atau jam ramai.",
    },
    "transportasi": {
        "arti": "Kedekatan dengan transportasi umum: stasiun/terminal dan halte bus.",
        "cara": "Stasiun/terminal ideal ≤ 3 km, halte ideal ≤ 800 m. Skor = 70% kategori terbaik + 30% kategori terlemah.",
    },
}


def _jarak_teks(meter):
    if meter is None:
        return "-"
    return f"{meter / 1000:.1f} km".replace(".", ",") if meter >= 1000 else f"{int(meter)} m"


def _mode_simulasi(data):
    return any("simulasi" in (info.get("sumber") or "").lower() for info in data.get("risiko", {}).values())


def ringkasan_fasilitas(data):
    hasil = []
    for kategori, info in KATEGORI_FASILITAS.items():
        anggota = sorted((f for f in data.get("fasilitas", []) if f["kategori"] == kategori), key=lambda f: f["jarak_m"])
        terdekat = anggota[0] if anggota else None
        ideal = info["jarak_ideal"]
        if not terdekat:
            status = "Tidak ditemukan dalam radius pencarian"
        elif terdekat["jarak_m"] <= ideal * 0.5:
            status = "Sangat dekat"
        elif terdekat["jarak_m"] <= ideal:
            status = "Dalam jarak ideal"
        else:
            status = "Lebih jauh dari ideal"
        hasil.append({
            "kategori": kategori,
            "label": info["label"],
            "indikator": info["indikator"],
            "label_indikator": INDIKATOR[info["indikator"]],
            "terdekat_nama": terdekat["nama"] if terdekat else None,
            "terdekat_m": terdekat["jarak_m"] if terdekat else None,
            "jumlah": len(anggota),
            "jarak_ideal_m": ideal,
            "radius_cari_m": RADIUS_PENCARIAN.get(kategori, 3000),
            "status": status,
        })
    return hasil


def _dasar_indikator(kode, data, fasilitas):
    if kode == "keamanan_bencana":
        nama = {"banjir": "Banjir", "longsor": "Tanah longsor", "gempa": "Gempa bumi"}
        return [
            f"{nama[k]}: indeks {info['skor']:.2f} dari 1,00 ({info['level']}), bobot {int(BOBOT_RISIKO[k] * 100)}%"
            for k, info in data.get("risiko", {}).items() if k in BOBOT_RISIKO
        ]
    if kode == "aksesibilitas":
        akses = data.get("aksesibilitas", {})
        return [
            f"Jalan utama terdekat: {_jarak_teks(akses.get('jarak_jalan_utama_m'))}",
            f"Lebar jalan depan: {str(akses.get('lebar_jalan_depan_m', '-')).replace('.', ',')} m",
        ]
    baris = []
    for f in fasilitas:
        if f["indikator"] != kode:
            continue
        if f["terdekat_m"] is None:
            baris.append(f"{f['label']}: tidak ditemukan dalam {_jarak_teks(f['radius_cari_m'])}")
        else:
            baris.append(
                f"{f['label']}: {f['terdekat_nama']} {_jarak_teks(f['terdekat_m'])} "
                f"(ideal ≤ {_jarak_teks(f['jarak_ideal_m'])}, {f['jumlah']} ditemukan)"
            )
    return baris


def penjelasan_indikator(data, fasilitas):
    hasil = {}
    for kode in INDIKATOR:
        dasar = _dasar_indikator(kode, data, fasilitas)
        hasil[kode] = {**PENJELASAN_INDIKATOR[kode], "dasar": dasar}
    return hasil


def _kelas_elevasi(m):
    if m is None:
        return "Tidak tersedia"
    if m < 5:
        return "Sangat rendah, dekat permukaan laut. Waspadai genangan pasang (rob) dan pastikan drainase lancar."
    if m < 20:
        return "Rendah. Umum di kota pesisir; cek riwayat genangan dan posisi lantai terhadap jalan."
    if m < 100:
        return "Sedang. Elevasi bukan penentu tunggal banjir; lihat juga indeks risiko banjir InaRISK."
    return "Dataran tinggi. Genangan jarang, tetapi perhatikan kestabilan lereng di sekitar."


def _kelas_kemiringan(persen):
    if persen is None:
        return "Tidak tersedia"
    if persen < 2:
        return "Datar (< 2%). Mudah dibangun; pastikan saluran air punya kemiringan cukup agar tidak menggenang."
    if persen < 8:
        return "Landai (2–8%). Ideal untuk bangunan dan drainase alami."
    if persen < 15:
        return "Agak curam (8–15%). Mungkin perlu perataan atau talud kecil."
    if persen < 25:
        return "Curam (15–25%). Perlu dinding penahan tanah dan saluran yang baik."
    return "Sangat curam (> 25%). Perlu kajian geoteknik sebelum membangun atau renovasi besar."


def _kelas_jarak_utama(m):
    if m is None:
        return "Tidak tersedia"
    if m <= 300:
        return "Dekat jalan utama. Mudah diakses, tetapi bisa lebih bising."
    if m <= 1000:
        return "Cukup dekat. Masih nyaman dicapai kendaraan."
    return "Jauh dari jalan utama. Lebih tenang, tetapi akses lebih lama."


def _kelas_lebar(m):
    if m is None:
        return "Tidak tersedia"
    if m < 3:
        return "Hanya muat motor. Mobil dan kendaraan darurat sulit masuk."
    if m < 4.5:
        return "Muat satu mobil. Mobil sulit berpapasan."
    if m < 6:
        return "Dua mobil bisa berpapasan pelan."
    return "Lapang. Dua mobil berpapasan dengan nyaman."


SUMBER_LEBAR = {
    "tag_width": "dari data lebar jalan di OpenStreetMap",
    "tag_lanes": "dihitung dari jumlah lajur di OpenStreetMap (3,25 m per lajur)",
    "kelas_jalan": "perkiraan dari kelas jalan OpenStreetMap",
    "bawaan": "perkiraan bawaan karena jalan depan tidak terpetakan",
    "simulasi": "nilai simulasi",
}


def topografi_akses(data):
    topo = data.get("topografi", {})
    akses = data.get("aksesibilitas", {})
    simulasi = _mode_simulasi(data)
    sumber_topo = "Simulasi" if simulasi else "Open-Meteo Elevation API (model elevasi Copernicus DEM, resolusi ±90 m)"
    sumber_osm = "Simulasi" if simulasi else "OpenStreetMap (Overpass API)"
    sumber_lebar = SUMBER_LEBAR.get(akses.get("sumber_lebar_jalan"), "perkiraan dari kelas jalan OpenStreetMap")
    kelas_jalan = akses.get("kelas_jalan_depan")

    return [
        {
            "label": "Elevasi",
            "nilai": f"{topo.get('elevasi_m', '-')} mdpl",
            "arti": "Ketinggian titik properti dari permukaan laut (bukan dari permukaan jalan).",
            "interpretasi": _kelas_elevasi(topo.get("elevasi_m")),
            "sumber": sumber_topo,
        },
        {
            "label": "Kemiringan lahan",
            "nilai": f"{topo.get('kemiringan_persen', '-')}%",
            "arti": "Selisih tinggi tanah dalam radius 50 m di sekitar titik. 10% berarti naik 10 m per 100 m.",
            "interpretasi": _kelas_kemiringan(topo.get("kemiringan_persen")),
            "sumber": sumber_topo,
        },
        {
            "label": "Jarak ke jalan utama",
            "nilai": _jarak_teks(akses.get("jarak_jalan_utama_m")),
            "arti": "Jarak lurus ke jalan arteri atau kolektor terdekat (kelas trunk/primary/secondary di OSM).",
            "interpretasi": _kelas_jarak_utama(akses.get("jarak_jalan_utama_m")),
            "sumber": sumber_osm,
        },
        {
            "label": "Lebar jalan depan",
            "nilai": f"{str(akses.get('lebar_jalan_depan_m', '-')).replace('.', ',')} m"
                     + (f" ({kelas_jalan})" if kelas_jalan else ""),
            "arti": f"Lebar jalan terdekat dalam 120 m dari titik, {sumber_lebar}.",
            "interpretasi": _kelas_lebar(akses.get("lebar_jalan_depan_m")),
            "sumber": sumber_osm,
        },
        {
            "label": "Kepadatan lalu lintas",
            "nilai": str(akses.get("kepadatan_lalu_lintas", "-")).capitalize(),
            "arti": "Perkiraan dari jarak ke jalan utama dan banyaknya fasilitas di sekitar. Bukan hitungan kendaraan langsung.",
            "interpretasi": "Cek langsung pada jam sibuk (pagi dan sore) saat survei.",
            "sumber": f"{sumber_osm}, diolah HomeWise",
        },
        {
            "label": "Karakter kawasan",
            "nilai": data.get("karakter_kawasan", "-"),
            "arti": "Penggunaan lahan dalam radius 500 m (hunian, komersial) dan komposisi fasilitas di sekitarnya.",
            "interpretasi": "Kawasan komersial cocok untuk usaha; permukiman lebih tenang untuk hunian.",
            "sumber": f"{sumber_osm} (tag landuse), diolah HomeWise",
        },
    ]


def sumber_data(data):
    if _mode_simulasi(data):
        return [{
            "nama": "Data simulasi HomeWise",
            "penyedia": "HomeWise",
            "dipakai_untuk": "Semua indikator lokasi",
            "cakupan": "Contoh untuk demo",
            "catatan": "Mode simulasi aktif (AI_MODE=simulasi). Angka bukan data nyata di titik ini.",
        }]
    return [
        {
            "nama": "InaRISK: Indeks Bahaya Banjir, Tanah Longsor, Gempa Bumi",
            "penyedia": "BNPB",
            "dipakai_untuk": "Indikator keamanan bencana dan kartu risiko",
            "cakupan": "Nasional, peta indeks bahaya (raster)",
            "catatan": "Indeks wilayah, bukan survei per bidang tanah.",
        },
        {
            "nama": "Elevasi & kemiringan",
            "penyedia": "Open-Meteo Elevation API (Copernicus DEM)",
            "dipakai_untuk": "Topografi: elevasi dan kemiringan lahan",
            "cakupan": "Global, resolusi ±90 m",
            "catatan": "Kemiringan dihitung dari 5 titik berjarak 50 m.",
        },
        {
            "nama": "Fasilitas umum, jalan, dan penggunaan lahan",
            "penyedia": "OpenStreetMap (Overpass API, cadangan Photon)",
            "dipakai_untuk": "Kesehatan, pendidikan, ekonomi, transportasi, aksesibilitas, karakter kawasan",
            "cakupan": "Radius 1,5–5 km sesuai kategori",
            "catatan": "Kelengkapan bergantung pada kontributor OSM di daerah tersebut.",
        },
    ]


def rincian_lokasi(data):
    fasilitas = ringkasan_fasilitas(data)
    return {
        "sumber_data": sumber_data(data),
        "indikator": penjelasan_indikator(data, fasilitas),
        "topografi_akses": topografi_akses(data),
        "fasilitas_per_kategori": fasilitas,
        "jumlah_fasilitas": {
            "dalam_1km": sum(1 for f in data.get("fasilitas", []) if f["jarak_m"] <= 1000),
            "dalam_3km": sum(1 for f in data.get("fasilitas", []) if f["jarak_m"] <= 3000),
        },
    }
