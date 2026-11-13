from concurrent.futures import ThreadPoolExecutor
import json
import math
import re

import requests

from . import simulasi_ai

INARISK_BASE = "https://gis.bnpb.go.id/server/rest/services/inarisk"
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
]
PHOTON_URL = "https://photon.komoot.io/api"
KATA_KUNCI_PHOTON = [
    ("rumah_sakit", "rumah sakit"),
    ("klinik", "klinik puskesmas"),
    ("sekolah", "sekolah sd smp sma"),
    ("kampus", "universitas kampus"),
    ("pasar", "pasar supermarket"),
    ("perkantoran", "kantor"),
    ("stasiun", "stasiun terminal"),
    ("halte", "halte bus"),
]
OPEN_METEO_ELEVATION_URL = "https://api.open-meteo.com/v1/elevation"
HEADERS = {"User-Agent": "HomeWise/1.0 (Property Decision Support)"}

LAYER_INARISK = {
    "banjir": ("INDEKS_BAHAYA_BANJIR", "InaRISK BNPB — Indeks Bahaya Banjir"),
    "longsor": ("INDEKS_BAHAYA_TANAHLONGSOR", "InaRISK BNPB — Indeks Bahaya Tanah Longsor"),
    "gempa": ("INDEKS_BAHAYA_GEMPABUMI", "InaRISK BNPB — Indeks Bahaya Gempa Bumi"),
}

LEBAR_JALAN_BAWAAN = {
    "trunk": 10.0,
    "primary": 10.0,
    "secondary": 8.0,
    "tertiary": 6.0,
    "residential": 5.0,
    "unclassified": 5.0,
    "living_street": 3.5,
    "service": 3.5,
}


def _level(skor):
    if skor >= 0.66:
        return "tinggi"
    if skor >= 0.33:
        return "sedang"
    return "rendah"


def jarak_haversine_m(lat1, lng1, lat2, lng2):
    """Hitung jarak permukaan bumi antara dua koordinat dalam satuan meter."""
    r = 6_371_000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return int(round(2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))))


def _ambil_satu_layer_inarisk(kunci, layer, label_sumber, lat, lng):
    url = f"{INARISK_BASE}/{layer}/ImageServer/identify"
    params = {
        "geometry": json.dumps({"x": lng, "y": lat, "spatialReference": {"wkid": 4326}}),
        "geometryType": "esriGeometryPoint",
        "returnGeometry": "false",
        "returnCatalogItems": "false",
        "f": "json",
    }
    respon = requests.get(url, params=params, headers=HEADERS, timeout=15)
    respon.raise_for_status()
    data = respon.json()
    if "error" in data:
        raise RuntimeError(str(data["error"]))

    nilai = data.get("value")
    if nilai is None or str(nilai).strip() in ("", "NoData"):
        return kunci, {"level": "rendah", "skor": 0.0, "sumber": f"{label_sumber} (di luar zona bahaya / NoData)"}

    skor = max(0.0, min(1.0, float(nilai)))
    skor = round(skor, 2)
    return kunci, {"level": _level(skor), "skor": skor, "sumber": label_sumber}


def ambil_risiko_inarisk(lat, lng):
    """Ambil indeks bahaya banjir, longsor, dan gempa dari ArcGIS ImageServer InaRISK BNPB."""
    risiko = {}
    catatan = []
    cadangan = None

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(_ambil_satu_layer_inarisk, kunci, layer, label, lat, lng): kunci
            for kunci, (layer, label) in LAYER_INARISK.items()
        }
        for future, kunci in futures.items():
            try:
                _, hasil = future.result()
                risiko[kunci] = hasil
            except Exception:
                if cadangan is None:
                    cadangan = simulasi_ai.analisis_lokasi(lat, lng)["risiko"]
                info = dict(cadangan[kunci])
                info["sumber"] = f"{info['sumber']} (cadangan simulasi)"
                risiko[kunci] = info
                catatan.append(f"Layer InaRISK {kunci} gagal diakses, memakai nilai cadangan simulasi.")

    return risiko, catatan


def _geser_koordinat(lat, lng, d_utara_m, d_timur_m):
    dlat = d_utara_m / 111_320.0
    dlng = d_timur_m / (111_320.0 * max(0.1, math.cos(math.radians(lat))))
    return round(lat + dlat, 6), round(lng + dlng, 6)


def ambil_topografi(lat, lng):
    """Ambil elevasi dan hitung kemiringan lahan dari 5 titik Open-Meteo Elevation API."""
    titik = [
        (lat, lng),
        _geser_koordinat(lat, lng, 50.0, 0.0),
        _geser_koordinat(lat, lng, -50.0, 0.0),
        _geser_koordinat(lat, lng, 0.0, 50.0),
        _geser_koordinat(lat, lng, 0.0, -50.0),
    ]
    try:
        respon = requests.get(
            OPEN_METEO_ELEVATION_URL,
            params={
                "latitude": ",".join(str(p[0]) for p in titik),
                "longitude": ",".join(str(p[1]) for p in titik),
            },
            headers=HEADERS,
            timeout=10,
        )
        respon.raise_for_status()
        elev = respon.json().get("elevation", [])
        if len(elev) < 5:
            raise ValueError("Data elevasi tidak lengkap.")
        elevasi_m = round(float(elev[0]), 1)
        dz_ns = abs(float(elev[1]) - float(elev[2])) / 100.0
        dz_ew = abs(float(elev[3]) - float(elev[4])) / 100.0
        kemiringan_persen = round(math.hypot(dz_ns, dz_ew) * 100.0, 1)
        return {"elevasi_m": elevasi_m, "kemiringan_persen": kemiringan_persen}, []
    except Exception:
        topo = simulasi_ai.analisis_lokasi(lat, lng)["topografi"]
        return topo, ["Data topografi Open-Meteo gagal diakses, memakai estimasi cadangan simulasi."]


def _klasifikasi_poi(tags):
    amenity = tags.get("amenity")
    shop = tags.get("shop")
    railway = tags.get("railway")
    highway = tags.get("highway")

    if amenity == "hospital":
        return "rumah_sakit"
    if amenity in ("clinic", "doctors"):
        return "klinik"
    if amenity in ("school", "kindergarten"):
        return "sekolah"
    if amenity in ("university", "college"):
        return "kampus"
    if amenity == "marketplace" or shop in ("supermarket", "mall"):
        return "pasar"
    if "office" in tags:
        return "perkantoran"
    if railway in ("station", "halt") or amenity == "bus_station":
        return "stasiun"
    if highway == "bus_stop":
        return "halte"
    return None


def _koordinat_elemen(el):
    if "lat" in el and "lon" in el:
        return float(el["lat"]), float(el["lon"])
    center = el.get("center") or {}
    if "lat" in center and "lon" in center:
        return float(center["lat"]), float(center["lon"])
    return None, None


def _baca_lebar_jalan(tags, kelas_jalan):
    width_raw = tags.get("width")
    if width_raw:
        cocok = re.search(r"\d+(?:[.,]\d+)?", str(width_raw))
        if cocok:
            lebar = float(cocok.group(0).replace(",", "."))
            return round(max(2.0, min(25.0, lebar)), 1)
    lanes_raw = tags.get("lanes")
    if lanes_raw and str(lanes_raw).isdigit():
        return round(max(2.0, min(25.0, int(lanes_raw) * 3.25)), 1)
    return LEBAR_JALAN_BAWAAN.get(kelas_jalan, 5.0)


def _tentukan_karakter_kawasan(landuses, jumlah_ekonomi, jumlah_hunian):
    if "commercial" in landuses or "retail" in landuses or jumlah_ekonomi > max(4, jumlah_hunian * 2):
        return "Koridor komersial"
    if "residential" in landuses and jumlah_ekonomi >= 2:
        return "Campuran hunian-komersial"
    if jumlah_ekonomi + jumlah_hunian >= 8:
        return "Permukiman padat"
    return "Permukiman menengah"


def _saring_poi(poi_unik):
    terurut = sorted(poi_unik.values(), key=lambda f: f["jarak_m"])
    hitung_kat = {}
    fasilitas = []
    for f in terurut:
        k = f["kategori"]
        if hitung_kat.get(k, 0) >= 4:
            continue
        hitung_kat[k] = hitung_kat.get(k, 0) + 1
        fasilitas.append(f)
    return fasilitas


def _kepadatan_dari(jarak_utama, jumlah_poi):
    if jarak_utama <= 150 or jumlah_poi > 25:
        return "tinggi"
    if jarak_utama <= 500 or jumlah_poi > 8:
        return "sedang"
    return "rendah"


def _ambil_osm_photon(lat, lng, radius_m=5000):
    """Ambil POI dan estimasi jalan utama dari OpenStreetMap Photon API."""
    delta = min(int(radius_m), 5000) / 111_320.0
    bbox = f"{round(lng - delta, 5)},{round(lat - delta, 5)},{round(lng + delta, 5)},{round(lat + delta, 5)}"

    def _cari(kw, limit=6):
        respon = requests.get(
            PHOTON_URL,
            params={"q": kw, "lat": lat, "lon": lng, "bbox": bbox, "limit": limit},
            headers=HEADERS,
            timeout=8,
        )
        respon.raise_for_status()
        return respon.json().get("features", [])

    poi_unik = {}
    jarak_jalan_utama = []
    jumlah_ekonomi = 0
    jumlah_hunian = 0

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [(kat, executor.submit(_cari, kw, 6)) for kat, kw in KATA_KUNCI_PHOTON]
        f_jalan = executor.submit(_cari, "jalan raya", 5)

        for kategori, fut in futures:
            try:
                features = fut.result()
            except Exception:
                continue
            for feat in features:
                props = feat.get("properties") or {}
                coords = (feat.get("geometry") or {}).get("coordinates") or []
                if len(coords) < 2:
                    continue
                el_lng, el_lat = float(coords[0]), float(coords[1])
                osm_key, osm_val = props.get("osm_key"), props.get("osm_value")
                if osm_key == "highway" and osm_val in ("residential", "service", "footway"):
                    continue
                if kategori != "halte" and osm_val == "bus_stop":
                    continue
                nama = (props.get("name") or "").strip()
                if not nama:
                    continue
                jarak = jarak_haversine_m(lat, lng, el_lat, el_lng)
                if jarak > radius_m:
                    continue
                if kategori in ("pasar", "perkantoran"):
                    jumlah_ekonomi += 1
                elif kategori in ("sekolah", "klinik"):
                    jumlah_hunian += 1
                kunci = (kategori, nama.lower())
                if kunci not in poi_unik or jarak < poi_unik[kunci]["jarak_m"]:
                    poi_unik[kunci] = {
                        "kategori": kategori,
                        "nama": nama,
                        "jarak_m": jarak,
                        "lat": round(el_lat, 6),
                        "lng": round(el_lng, 6),
                    }

        try:
            for feat in f_jalan.result():
                coords = (feat.get("geometry") or {}).get("coordinates") or []
                if len(coords) >= 2:
                    jarak_jalan_utama.append(jarak_haversine_m(lat, lng, float(coords[1]), float(coords[0])))
        except Exception:
            pass

    if not poi_unik:
        return None

    fasilitas = _saring_poi(poi_unik)
    jarak_utama = min(jarak_jalan_utama) if jarak_jalan_utama else 800
    aksesibilitas = {
        "jarak_jalan_utama_m": jarak_utama,
        "lebar_jalan_depan_m": 6.0 if jarak_utama <= 250 else 5.0,
        "kepadatan_lalu_lintas": _kepadatan_dari(jarak_utama, len(poi_unik)),
    }
    karakter_kawasan = _tentukan_karakter_kawasan(set(), jumlah_ekonomi, jumlah_hunian)
    return fasilitas, aksesibilitas, karakter_kawasan, []


def ambil_osm(lat, lng, radius_m=5000):
    """Ambil daftar fasilitas, aksesibilitas jalan, dan karakter kawasan dari OpenStreetMap Overpass API / Photon."""
    r_jauh = min(int(radius_m), 5000)
    r_sedang = min(int(radius_m), 3000)
    r_dekat = min(int(radius_m), 1500)

    query = f"""
    [out:json][timeout:15];
    (
      nwr(around:{r_jauh},{lat},{lng})["amenity"="hospital"];
      nwr(around:{r_jauh},{lat},{lng})["amenity"~"^(university|college)$"];
      nwr(around:{r_jauh},{lat},{lng})["railway"~"^(station|halt)$"];
      nwr(around:{r_sedang},{lat},{lng})["amenity"~"^(clinic|doctors|school|kindergarten|marketplace|bus_station)$"];
      nwr(around:{r_sedang},{lat},{lng})["shop"~"^(supermarket|mall)$"];
      nwr(around:{r_sedang},{lat},{lng})["office"];
      nwr(around:{r_dekat},{lat},{lng})["highway"="bus_stop"];
      way(around:{r_dekat},{lat},{lng})["highway"~"^(trunk|primary|secondary)$"];
      way(around:120,{lat},{lng})["highway"~"^(trunk|primary|secondary|tertiary|residential|living_street|unclassified|service)$"];
      nwr(around:500,{lat},{lng})["landuse"~"^(residential|commercial|retail|industrial)$"];
    );
    out tags center qt;
    """

    elemen = None
    for url in OVERPASS_URLS:
        try:
            respon = requests.post(url, data={"data": query}, headers=HEADERS, timeout=8)
            respon.raise_for_status()
            elemen = respon.json().get("elements", [])
            break
        except Exception:
            continue

    if elemen is None:
        hasil_photon = _ambil_osm_photon(lat, lng, radius_m)
        if hasil_photon is not None:
            return hasil_photon
        sim = simulasi_ai.analisis_lokasi(lat, lng, radius_m=radius_m)
        return (
            sim["fasilitas"],
            sim["aksesibilitas"],
            sim["karakter_kawasan"],
            ["Server Overpass OSM & Photon gagal diakses, daftar fasilitas & aksesibilitas memakai cadangan simulasi."],
        )

    poi_unik = {}
    jarak_jalan_utama = []
    jalan_depan = []
    landuses = set()
    jumlah_ekonomi = 0
    jumlah_hunian = 0

    for el in elemen:
        tags = el.get("tags") or {}
        el_lat, el_lng = _koordinat_elemen(el)

        if "landuse" in tags:
            landuses.add(tags["landuse"])

        highway = tags.get("highway")
        if el.get("type") == "way" and highway and el_lat is not None:
            jarak = jarak_haversine_m(lat, lng, el_lat, el_lng)
            if highway in ("trunk", "primary", "secondary"):
                jarak_jalan_utama.append(jarak)
            if jarak <= 120:
                jalan_depan.append((jarak, highway, tags))

        kategori = _klasifikasi_poi(tags)
        if kategori and el_lat is not None:
            nama = tags.get("name") or tags.get("name:id") or tags.get("operator")
            if not nama:
                if kategori != "halte":
                    continue
                nama = "Halte Bus"
            jarak = jarak_haversine_m(lat, lng, el_lat, el_lng)
            if kategori in ("pasar", "perkantoran"):
                jumlah_ekonomi += 1
            elif kategori in ("sekolah", "klinik"):
                jumlah_hunian += 1

            kunci = (kategori, nama.strip().lower())
            if kunci not in poi_unik or jarak < poi_unik[kunci]["jarak_m"]:
                poi_unik[kunci] = {
                    "kategori": kategori,
                    "nama": nama.strip(),
                    "jarak_m": jarak,
                    "lat": round(el_lat, 6),
                    "lng": round(el_lng, 6),
                }

    fasilitas = _saring_poi(poi_unik)

    jarak_utama = min(jarak_jalan_utama) if jarak_jalan_utama else 1200
    if jalan_depan:
        jalan_depan.sort(key=lambda j: j[0])
        _, kelas_terdekat, tags_terdekat = jalan_depan[0]
        lebar_depan = _baca_lebar_jalan(tags_terdekat, kelas_terdekat)
    else:
        lebar_depan = 5.0

    aksesibilitas = {
        "jarak_jalan_utama_m": jarak_utama,
        "lebar_jalan_depan_m": lebar_depan,
        "kepadatan_lalu_lintas": _kepadatan_dari(jarak_utama, len(poi_unik)),
    }
    karakter_kawasan = _tentukan_karakter_kawasan(landuses, jumlah_ekonomi, jumlah_hunian)
    return fasilitas, aksesibilitas, karakter_kawasan, []


def analisis_lokasi(lat, lng, alamat=None, radius_m=5000):
    """Kumpulkan data lokasi asli dari InaRISK BNPB, OpenStreetMap Overpass, dan Open-Meteo Elevation."""
    with ThreadPoolExecutor(max_workers=3) as executor:
        f_risiko = executor.submit(ambil_risiko_inarisk, lat, lng)
        f_topo = executor.submit(ambil_topografi, lat, lng)
        f_osm = executor.submit(ambil_osm, lat, lng, radius_m)

        risiko, cat_risiko = f_risiko.result()
        topografi, cat_topo = f_topo.result()
        fasilitas, aksesibilitas, karakter_kawasan, cat_osm = f_osm.result()

    keterbatasan = [
        "Data risiko InaRISK BNPB berupa indeks regional, bukan survei geoteknik di lokasi.",
        "Kelengkapan fasilitas OpenStreetMap bergantung pada pembaruan kontributor di tiap daerah.",
        *cat_risiko,
        *cat_topo,
        *cat_osm,
    ]

    return {
        "risiko": risiko,
        "topografi": topografi,
        "aksesibilitas": aksesibilitas,
        "fasilitas": fasilitas,
        "karakter_kawasan": karakter_kawasan,
        "keterbatasan_data": keterbatasan,
    }
