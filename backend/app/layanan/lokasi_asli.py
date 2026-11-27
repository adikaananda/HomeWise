from concurrent.futures import ThreadPoolExecutor
import json
import math
import re

import requests

from . import simulasi_ai

INARISK_BASE = "https://gis.bnpb.go.id/server/rest/services/inarisk"
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
PHOTON_REVERSE_URL = "https://photon.komoot.io/reverse"
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
    if amenity == "marketplace" or shop in ("supermarket", "mall", "department_store", "convenience"):
        return "pasar"
    if "office" in tags or amenity in ("bank", "public_building", "townhall"):
        return "perkantoran"
    if railway in ("station", "halt") or amenity == "bus_station" or tags.get("public_transport") == "station":
        return "stasiun"
    if highway == "bus_stop" or tags.get("public_transport") in ("platform", "stop_position"):
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
    """Kembalikan (lebar_m, sumber) agar pengguna tahu lebar jalan diukur atau diperkirakan."""
    width_raw = tags.get("width")
    if width_raw:
        cocok = re.search(r"\d+(?:[.,]\d+)?", str(width_raw))
        if cocok:
            lebar = float(cocok.group(0).replace(",", "."))
            return round(max(2.0, min(25.0, lebar)), 1), "tag_width"
    lanes_raw = tags.get("lanes")
    if lanes_raw and str(lanes_raw).isdigit():
        return round(max(2.0, min(25.0, int(lanes_raw) * 3.25)), 1), "tag_lanes"
    return LEBAR_JALAN_BAWAAN.get(kelas_jalan, 5.0), "kelas_jalan"


LABEL_KELAS_JALAN = {
    "trunk": "jalan nasional/arteri utama",
    "primary": "jalan arteri",
    "secondary": "jalan kolektor",
    "tertiary": "jalan lokal utama",
    "residential": "jalan lingkungan/perumahan",
    "unclassified": "jalan lokal",
    "living_street": "gang/jalan lingkungan",
    "service": "jalan akses/gang",
}


def _jarak_ke_garis_m(lat, lng, geometri):
    """Jarak titik ke polyline (m) memakai proyeksi lokal equirectangular; cukup akurat untuk < 1 km."""
    if not geometri:
        return None
    kx = 111_320.0 * math.cos(math.radians(lat))
    ky = 110_574.0
    titik = [((g["lon"] - lng) * kx, (g["lat"] - lat) * ky) for g in geometri if "lat" in g and "lon" in g]
    if len(titik) == 1:
        return int(math.hypot(*titik[0]))
    terbaik = None
    for (x1, y1), (x2, y2) in zip(titik, titik[1:]):
        dx, dy = x2 - x1, y2 - y1
        panjang2 = dx * dx + dy * dy
        t = 0.0 if panjang2 == 0 else max(0.0, min(1.0, -(x1 * dx + y1 * dy) / panjang2))
        d = math.hypot(x1 + t * dx, y1 + t * dy)
        terbaik = d if terbaik is None else min(terbaik, d)
    return int(round(terbaik)) if terbaik is not None else None


class _FaktorSekitar:
    """Faktor lingkungan untuk model penilaian Denpasar: rekreasi, SUTET, kuburan, industri, akomodasi wisata."""

    def __init__(self):
        self.rekreasi = None
        self.sutet = None
        self.kuburan = None
        self.industri = None
        self.akomodasi = set()

    @staticmethod
    def _min(lama, baru):
        if baru is None:
            return lama
        return baru if lama is None or baru[0] < lama[0] else lama

    def periksa(self, el, tags, lat, lng, el_lat, el_lng):
        """Catat elemen bila relevan. Kembalikan True bila elemen hanya dipakai di sini."""
        if tags.get("power") == "line":
            jarak = _jarak_ke_garis_m(lat, lng, el.get("geometry"))
            tegangan = str(tags.get("voltage") or "")
            self.sutet = self._min(self.sutet, (jarak, tags.get("name") or (f"Saluran {tegangan} V" if tegangan else "Saluran udara tegangan tinggi")) if jarak is not None else None)
            return True
        if el_lat is None:
            return False
        jarak = jarak_haversine_m(lat, lng, el_lat, el_lng)
        if tags.get("landuse") == "cemetery" or tags.get("amenity") == "grave_yard":
            self.kuburan = self._min(self.kuburan, (jarak, tags.get("name") or "Kuburan/setra"))
            return True
        if tags.get("landuse") == "industrial":
            self.industri = self._min(self.industri, (jarak, tags.get("name") or "Kawasan industri"))
            return False
        if tags.get("tourism") in ("hotel", "guest_house", "hostel", "motel", "apartment", "resort"):
            if jarak <= 500:
                self.akomodasi.add(el.get("id"))
            return True
        if (tags.get("leisure") in ("park", "beach_resort") or tags.get("natural") == "beach"
                or tags.get("tourism") in ("attraction", "theme_park", "zoo", "museum")):
            nama = tags.get("name") or ("Pantai" if tags.get("natural") == "beach" else "Taman")
            self.rekreasi = self._min(self.rekreasi, (jarak, nama))
            return True
        return False

    def hasil(self):
        return {
            "rekreasi_m": self.rekreasi[0] if self.rekreasi else None,
            "rekreasi_nama": self.rekreasi[1] if self.rekreasi else None,
            "sutet_m": self.sutet[0] if self.sutet else None,
            "sutet_nama": self.sutet[1] if self.sutet else None,
            "kuburan_m": self.kuburan[0] if self.kuburan else None,
            "industri_m": self.industri[0] if self.industri else None,
            "akomodasi_500m": len(self.akomodasi),
            "sumber": "OpenStreetMap (Overpass)",
        }


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
    """Ambil POI dan akses jalan berbasis tag OSM via Photon reverse API."""
    max_rad_km = max(0.5, min(5.0, float(radius_m) / 1000.0))

    def _reverse(rad_km, limit, tags_osm):
        respon = requests.get(
            PHOTON_REVERSE_URL,
            params={"lat": lat, "lon": lng, "radius": round(rad_km, 2), "limit": limit, "osm_tag": tags_osm},
            headers=HEADERS,
            timeout=8,
        )
        respon.raise_for_status()
        return respon.json().get("features", [])

    kueri_poi = [
        (max_rad_km, 12, ["amenity:hospital", "amenity:clinic", "amenity:doctors"]),
        (max_rad_km, 12, ["amenity:school", "amenity:kindergarten", "amenity:university", "amenity:college"]),
        (min(3.0, max_rad_km), 15, [
            "amenity:marketplace", "shop:supermarket", "shop:mall", "shop:department_store",
            "shop:convenience", "office", "amenity:bank", "amenity:public_building", "amenity:townhall",
        ]),
        (max_rad_km, 12, [
            "highway:bus_stop", "public_transport:platform", "public_transport:stop_position",
            "amenity:bus_station", "public_transport:station", "railway:station", "railway:halt",
        ]),
    ]

    poi_unik = {}
    jarak_jalan_utama = []
    jalan_depan = []
    jumlah_ekonomi = 0
    jumlah_hunian = 0

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures_poi = [executor.submit(_reverse, rad, lim, tags_osm) for rad, lim, tags_osm in kueri_poi]
        f_jalan_utama = executor.submit(
            _reverse, min(2.0, max_rad_km), 10,
            ["highway:trunk", "highway:primary", "highway:secondary", "highway:tertiary"],
        )
        f_jalan_depan = executor.submit(
            _reverse, 0.2, 6,
            [f"highway:{kls}" for kls in LEBAR_JALAN_BAWAAN],
        )

        for fut in futures_poi:
            try:
                features = fut.result()
            except Exception:
                continue
            for feat in features:
                props = feat.get("properties") or {}
                coords = (feat.get("geometry") or {}).get("coordinates") or []
                if len(coords) < 2:
                    continue
                osm_key, osm_val = props.get("osm_key"), props.get("osm_value")
                if not osm_key:
                    continue
                tags = {osm_key: osm_val}
                kategori = _klasifikasi_poi(tags)
                if not kategori:
                    continue
                nama = (props.get("name") or "").strip()
                if not nama:
                    if kategori != "halte":
                        continue
                    nama = "Halte Bus"
                el_lng, el_lat = float(coords[0]), float(coords[1])
                jarak = jarak_haversine_m(lat, lng, el_lat, el_lng)
                if kategori == "halte" and jarak > 2500:
                    continue
                if tags.get("shop") == "convenience" and jarak > 1000:
                    continue
                if kategori in ("klinik", "sekolah", "pasar", "perkantoran") and jarak > 3000:
                    continue
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
            for feat in f_jalan_utama.result():
                props = feat.get("properties") or {}
                coords = (feat.get("geometry") or {}).get("coordinates") or []
                if len(coords) >= 2 and props.get("osm_key") == "highway" and props.get("osm_value") in (
                    "trunk", "primary", "secondary", "tertiary"
                ):
                    jarak_jalan_utama.append(jarak_haversine_m(lat, lng, float(coords[1]), float(coords[0])))
        except Exception:
            pass

        try:
            for feat in f_jalan_depan.result():
                props = feat.get("properties") or {}
                coords = (feat.get("geometry") or {}).get("coordinates") or []
                if len(coords) >= 2 and props.get("osm_key") == "highway" and props.get("osm_value") in LEBAR_JALAN_BAWAAN:
                    jarak = jarak_haversine_m(lat, lng, float(coords[1]), float(coords[0]))
                    jalan_depan.append((jarak, props["osm_value"]))
        except Exception:
            pass

    if not poi_unik and not jarak_jalan_utama:
        return None

    fasilitas = _saring_poi(poi_unik)
    jarak_utama = min(jarak_jalan_utama) if jarak_jalan_utama else 1200
    if jalan_depan:
        jalan_depan.sort(key=lambda j: j[0])
        kelas_depan = jalan_depan[0][1]
        lebar_depan, sumber_lebar = LEBAR_JALAN_BAWAAN[kelas_depan], "kelas_jalan"
        label_kelas = LABEL_KELAS_JALAN.get(kelas_depan)
    else:
        lebar_depan, sumber_lebar, label_kelas = 5.0, "bawaan", None

    aksesibilitas = {
        "jarak_jalan_utama_m": jarak_utama,
        "lebar_jalan_depan_m": lebar_depan,
        "sumber_lebar_jalan": sumber_lebar,
        "kelas_jalan_depan": label_kelas,
        "kepadatan_lalu_lintas": _kepadatan_dari(jarak_utama, len(poi_unik)),
    }
    karakter_kawasan = _tentukan_karakter_kawasan(set(), jumlah_ekonomi, jumlah_hunian)
    return (
        fasilitas,
        aksesibilitas,
        karakter_kawasan,
        ["Server Overpass OSM tidak merespons tepat waktu, fasilitas memakai pencarian cadangan Photon OSM."],
        None,
    )


def ambil_osm(lat, lng, radius_m=5000):
    """Ambil daftar fasilitas, aksesibilitas jalan, dan karakter kawasan dari OpenStreetMap Overpass API / Photon."""
    r_jauh = min(int(radius_m), 5000)
    r_sedang = min(int(radius_m), 3000)
    r_halte = min(int(radius_m), 2500)
    r_dekat = min(int(radius_m), 1500)

    query = f"""
    [out:json][timeout:10];
    (
      nwr(around:{r_jauh},{lat},{lng})["amenity"="hospital"];
      nwr(around:{r_jauh},{lat},{lng})["amenity"~"^(university|college)$"];
      nwr(around:{r_jauh},{lat},{lng})["railway"~"^(station|halt)$"];
      nwr(around:{r_jauh},{lat},{lng})["public_transport"="station"];
      nwr(around:{r_sedang},{lat},{lng})["amenity"~"^(clinic|doctors|school|kindergarten|marketplace|bus_station|bank|public_building|townhall)$"];
      nwr(around:{r_sedang},{lat},{lng})["shop"~"^(supermarket|mall|department_store)$"];
      nwr(around:1000,{lat},{lng})["shop"="convenience"];
      nwr(around:{r_sedang},{lat},{lng})["office"];
      nwr(around:{r_halte},{lat},{lng})["highway"="bus_stop"];
      nwr(around:{r_halte},{lat},{lng})["public_transport"~"^(platform|stop_position)$"];
      nwr(around:500,{lat},{lng})["landuse"~"^(residential|commercial|retail|industrial)$"];
      nwr(around:{r_sedang},{lat},{lng})["leisure"~"^(park|beach_resort)$"]["name"];
      nwr(around:{r_sedang},{lat},{lng})["tourism"~"^(attraction|theme_park|zoo|museum)$"]["name"];
      nwr(around:{r_sedang},{lat},{lng})["natural"="beach"];
      nwr(around:500,{lat},{lng})["landuse"="cemetery"];
      nwr(around:500,{lat},{lng})["amenity"="grave_yard"];
      nwr(around:500,{lat},{lng})["tourism"~"^(hotel|guest_house|hostel|motel|apartment|resort)$"];
    );
    out tags center qt;
    (
      way(around:{r_dekat},{lat},{lng})["highway"~"^(trunk|primary|secondary|tertiary)$"];
      way(around:120,{lat},{lng})["highway"~"^(trunk|primary|secondary|tertiary|residential|living_street|unclassified|service)$"];
      way(around:600,{lat},{lng})["power"="line"];
    );
    out tags geom qt;
    """

    elemen = None
    for url in OVERPASS_URLS:
        try:
            respon = requests.post(url, data={"data": query}, headers=HEADERS, timeout=(4, 10))
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
            sim.get("faktor_sekitar"),
        )

    poi_unik = {}
    jarak_jalan_utama = []
    jalan_depan = []
    landuses = set()
    sekitar = _FaktorSekitar()
    jumlah_ekonomi = 0
    jumlah_hunian = 0

    for el in elemen:
        tags = el.get("tags") or {}
        el_lat, el_lng = _koordinat_elemen(el)

        if "landuse" in tags:
            landuses.add(tags["landuse"])
        if sekitar.periksa(el, tags, lat, lng, el_lat, el_lng):
            continue

        highway = tags.get("highway")
        if el.get("type") == "way" and highway:
            jarak = _jarak_ke_garis_m(lat, lng, el.get("geometry"))
            if jarak is None and el_lat is not None:
                jarak = jarak_haversine_m(lat, lng, el_lat, el_lng)
            if jarak is not None:
                if highway in ("trunk", "primary", "secondary", "tertiary"):
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
    kelas_terdekat = None
    if jalan_depan:
        jalan_depan.sort(key=lambda j: j[0])
        _, kelas_terdekat, tags_terdekat = jalan_depan[0]
        lebar_depan, sumber_lebar = _baca_lebar_jalan(tags_terdekat, kelas_terdekat)
    else:
        lebar_depan, sumber_lebar = 5.0, "bawaan"

    aksesibilitas = {
        "jarak_jalan_utama_m": jarak_utama,
        "lebar_jalan_depan_m": lebar_depan,
        "sumber_lebar_jalan": sumber_lebar,
        "kelas_jalan_depan": LABEL_KELAS_JALAN.get(kelas_terdekat) if kelas_terdekat else None,
        "kepadatan_lalu_lintas": _kepadatan_dari(jarak_utama, len(poi_unik)),
    }
    karakter_kawasan = _tentukan_karakter_kawasan(landuses, jumlah_ekonomi, jumlah_hunian)
    return fasilitas, aksesibilitas, karakter_kawasan, [], sekitar.hasil()


def analisis_lokasi(lat, lng, alamat=None, radius_m=5000):
    """Kumpulkan data lokasi asli dari InaRISK BNPB, OpenStreetMap Overpass, dan Open-Meteo Elevation."""
    with ThreadPoolExecutor(max_workers=3) as executor:
        f_risiko = executor.submit(ambil_risiko_inarisk, lat, lng)
        f_topo = executor.submit(ambil_topografi, lat, lng)
        f_osm = executor.submit(ambil_osm, lat, lng, radius_m)

        risiko, cat_risiko = f_risiko.result()
        topografi, cat_topo = f_topo.result()
        fasilitas, aksesibilitas, karakter_kawasan, cat_osm, *lain = f_osm.result()
        faktor_sekitar = lain[0] if lain else None

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
        "faktor_sekitar": faktor_sekitar,
        "keterbatasan_data": keterbatasan,
    }
