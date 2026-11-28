/* Adegan rumah 3D HomeWise (three.js). Dimuat lazy hanya saat section terlihat.
   Semua warna dari palet HomeWise. Model dibangun dari primitif agar ringan (tanpa unduhan GLB). */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const P = {
  biruTua: 0x0832c8,
  biru: 0x0a43ef,
  langit: 0x2acafc,
  tosca: 0x14bace,
  hijau: 0x008c73,
  mint: 0x51da9e,
  mintMuda: 0xa6efb6,
  lime: 0xa1e05b,
  krem: 0xfff7ec,
  putih: 0xffffff,
};

function bahan(warna, opsi = {}) {
  return new THREE.MeshStandardMaterial({ color: warna, roughness: 0.55, metalness: 0.02, ...opsi });
}

function bangunRumah() {
  const g = new THREE.Group();

  // Pulau tanah
  const tanah = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.45, 48), bahan(P.mint));
  tanah.position.y = -0.225;
  tanah.receiveShadow = true;
  g.add(tanah);
  const rumput = new THREE.Mesh(new THREE.CylinderGeometry(3.42, 3.42, 0.06, 48), bahan(P.mintMuda));
  rumput.position.y = 0.02;
  rumput.receiveShadow = true;
  g.add(rumput);

  // Jalan setapak
  const setapak = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.04, 1.8, 2, 0.08), bahan(P.krem));
  setapak.position.set(0, 0.07, 2.2);
  setapak.receiveShadow = true;
  g.add(setapak);

  // Badan rumah
  const badan = new THREE.Mesh(new RoundedBoxGeometry(2.4, 1.5, 1.9, 4, 0.08), bahan(P.krem));
  badan.position.y = 0.8;
  badan.castShadow = badan.receiveShadow = true;
  badan.name = "dinding";
  g.add(badan);

  // Fondasi
  const fondasi = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.14, 2.1, 2, 0.05), bahan(0xdfe9f3));
  fondasi.position.y = 0.1;
  fondasi.receiveShadow = true;
  g.add(fondasi);

  // Atap pelana
  const atap = new THREE.Group();
  const bahanAtap = bahan(P.biru, { roughness: 0.4 });
  const sisi = new RoundedBoxGeometry(2.9, 0.14, 1.45, 3, 0.06);
  const kiri = new THREE.Mesh(sisi, bahanAtap);
  kiri.position.set(0, 0.45, 0.5);
  kiri.rotation.x = 0.62;
  const kanan = new THREE.Mesh(sisi, bahanAtap);
  kanan.position.set(0, 0.45, -0.5);
  kanan.rotation.x = -0.62;
  kiri.castShadow = kanan.castShadow = true;
  atap.add(kiri, kanan);
  // Segitiga gevel
  const bentuk = new THREE.Shape();
  bentuk.moveTo(-0.95, 0);
  bentuk.lineTo(0.95, 0);
  bentuk.lineTo(0, 0.78);
  bentuk.lineTo(-0.95, 0);
  const gevel = new THREE.ExtrudeGeometry(bentuk, { depth: 2.36, bevelEnabled: false });
  const segitiga = new THREE.Mesh(gevel, bahan(P.krem));
  segitiga.rotation.y = Math.PI / 2;
  segitiga.position.set(-1.18, 0, 0);
  atap.add(segitiga);
  atap.position.y = 1.55;
  atap.name = "atap";
  g.add(atap);

  // Cerobong
  const cerobong = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.6, 0.28, 2, 0.04), bahan(P.tosca));
  cerobong.position.set(0.7, 2.25, -0.45);
  cerobong.castShadow = true;
  g.add(cerobong);

  // Pintu
  const pintu = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.85, 0.08, 2, 0.04), bahan(P.biruTua));
  pintu.position.set(0, 0.6, 0.96);
  g.add(pintu);
  const gagang = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), bahan(P.lime));
  gagang.position.set(0.15, 0.6, 1.01);
  g.add(gagang);

  // Jendela bercahaya
  const bahanKaca = bahan(P.langit, { emissive: P.langit, emissiveIntensity: 0.35, roughness: 0.15 });
  const bahanBingkai = bahan(P.putih);
  const posisiJendela = [
    [-0.72, 0.95, 0.96, 0],
    [0.72, 0.95, 0.96, 0],
    [1.21, 0.95, 0.35, Math.PI / 2],
    [1.21, 0.95, -0.4, Math.PI / 2],
    [-1.21, 0.95, 0, Math.PI / 2],
  ];
  posisiJendela.forEach(([x, y, z, ry]) => {
    const w = new THREE.Group();
    const bingkai = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.5, 0.06, 2, 0.03), bahanBingkai);
    const kaca = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.38, 0.07), bahanKaca);
    const silang = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.38, 0.08), bahanBingkai);
    const silang2 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.03, 0.08), bahanBingkai);
    w.add(bingkai, kaca, silang, silang2);
    w.position.set(x, y, z);
    w.rotation.y = ry;
    g.add(w);
  });

  // Pohon
  const pohon = (x, z, s = 1) => {
    const t = new THREE.Group();
    const batang = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.08 * s, 0.4 * s, 8), bahan(0xc9a27a));
    batang.position.y = 0.2 * s;
    const daun = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38 * s, 1), bahan(P.hijau, { flatShading: true }));
    daun.position.y = 0.62 * s;
    const daun2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26 * s, 1), bahan(P.mint, { flatShading: true }));
    daun2.position.set(0.12 * s, 0.86 * s, 0.05 * s);
    batang.castShadow = daun.castShadow = daun2.castShadow = true;
    t.add(batang, daun, daun2);
    t.position.set(x, 0.05, z);
    return t;
  };
  g.add(pohon(-2.3, 0.9, 1.1), pohon(2.35, -0.6, 0.9), pohon(-1.9, -1.8, 0.8));

  // Semak
  [[-0.9, 1.25], [0.9, 1.25], [1.55, 1.0]].forEach(([x, z]) => {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), bahan(P.lime, { flatShading: true }));
    s.position.set(x, 0.18, z);
    s.castShadow = true;
    g.add(s);
  });

  // Penanda lokasi melayang
  const pin = new THREE.Group();
  const kepala = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 24), bahan(P.biruTua, { roughness: 0.3 }));
  const ujung = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 24), bahan(P.biruTua, { roughness: 0.3 }));
  ujung.rotation.x = Math.PI;
  ujung.position.y = -0.3;
  const titik = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), bahan(P.putih));
  titik.position.z = 0.2;
  pin.add(kepala, ujung, titik);
  pin.position.set(0, 3.05, 0);
  pin.name = "pin";
  g.add(pin);

  // Cincin denyut di tanah (risiko & radius fasilitas)
  const cincin = new THREE.Mesh(
    new THREE.RingGeometry(2.6, 2.75, 64),
    new THREE.MeshBasicMaterial({ color: P.langit, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
  );
  cincin.rotation.x = -Math.PI / 2;
  cincin.position.y = 0.06;
  cincin.name = "cincin";
  g.add(cincin);

  return g;
}

// Titik penjelasan (koordinat lokal model) dan sudut kamera saat dipilih.
export const TITIK = {
  lokasi: { posisi: [0, 3.45, 0], kamera: [4.6, 4.6, 6.2] },
  atap: { posisi: [0.5, 2.05, 0.55], kamera: [3.2, 4.4, 5.2] },
  dinding: { posisi: [1.22, 1.25, 0.6], kamera: [6.2, 2.2, 3.4] },
  lantai: { posisi: [0, 0.2, 1.55], kamera: [0.8, 2.2, 6.6] },
  tanah: { posisi: [-2.6, 0.15, 1.6], kamera: [-5.2, 3.4, 5.4] },
};

export function buatAdegan(kanvas, { onTitik, kurangiGerak = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas: kanvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const adegan = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  kamera.position.set(5.4, 4.2, 6.6);

  adegan.add(new THREE.HemisphereLight(0xffffff, 0xa6efb6, 1.25));
  const matahari = new THREE.DirectionalLight(0xffffff, 2.1);
  matahari.position.set(5, 8, 4);
  matahari.castShadow = true;
  matahari.shadow.mapSize.set(1024, 1024);
  matahari.shadow.camera.left = -5;
  matahari.shadow.camera.right = 5;
  matahari.shadow.camera.top = 5;
  matahari.shadow.camera.bottom = -5;
  matahari.shadow.radius = 4;
  adegan.add(matahari);
  const isi = new THREE.DirectionalLight(0x2acafc, 0.6);
  isi.position.set(-6, 3, -4);
  adegan.add(isi);

  const rumah = bangunRumah();
  adegan.add(rumah);
  const pin = rumah.getObjectByName("pin");
  const cincin = rumah.getObjectByName("cincin");

  const kontrol = new OrbitControls(kamera, kanvas);
  kontrol.enableDamping = true;
  kontrol.dampingFactor = 0.08;
  kontrol.enableZoom = false;
  kontrol.enablePan = false;
  kontrol.minPolarAngle = 0.5;
  kontrol.maxPolarAngle = 1.35;
  kontrol.target.set(0, 1.1, 0);
  kontrol.autoRotate = !kurangiGerak;
  kontrol.autoRotateSpeed = 0.9;

  let tujuanKamera = null;
  let jeda = false;
  let berjalan = true;
  let id;
  const jam = new THREE.Clock();
  const v = new THREE.Vector3();

  const ukur = () => {
    const { clientWidth: w, clientHeight: h } = kanvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    kamera.aspect = w / h;
    kamera.updateProjectionMatrix();
  };
  const pengamatUkuran = new ResizeObserver(ukur);
  pengamatUkuran.observe(kanvas);
  ukur();

  const lapor = () => {
    if (!onTitik) return;
    const w = kanvas.clientWidth;
    const h = kanvas.clientHeight;
    const hasil = {};
    for (const [kode, t] of Object.entries(TITIK)) {
      v.set(...t.posisi).project(kamera);
      hasil[kode] = { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, depan: v.z < 1 };
    }
    onTitik(hasil);
  };

  const putar = () => {
    if (!berjalan) return;
    id = requestAnimationFrame(putar);
    const t = jam.getElapsedTime();
    if (!kurangiGerak) {
      pin.position.y = 3.05 + Math.sin(t * 2) * 0.12;
      pin.rotation.y = t * 0.8;
      const s = 1 + ((t * 0.6) % 1) * 0.25;
      cincin.scale.set(s, s, s);
      cincin.material.opacity = 0.6 * (1 - ((t * 0.6) % 1));
    }
    if (tujuanKamera) {
      kamera.position.lerp(tujuanKamera, 0.06);
      if (kamera.position.distanceTo(tujuanKamera) < 0.05) tujuanKamera = null;
    }
    kontrol.autoRotate = !kurangiGerak && !jeda && !tujuanKamera;
    kontrol.update();
    renderer.render(adegan, kamera);
    lapor();
  };
  putar();

  kontrol.addEventListener("start", () => {
    jeda = true;
    tujuanKamera = null;
  });

  return {
    fokus(kode) {
      const t = TITIK[kode];
      if (!t) return;
      jeda = true;
      tujuanKamera = new THREE.Vector3(...t.kamera);
    },
    lanjutkan() {
      jeda = false;
    },
    aktif(nyala) {
      if (nyala && !berjalan) {
        berjalan = true;
        jam.start();
        putar();
      } else if (!nyala) {
        berjalan = false;
        cancelAnimationFrame(id);
      }
    },
    hancurkan() {
      berjalan = false;
      cancelAnimationFrame(id);
      pengamatUkuran.disconnect();
      kontrol.dispose();
      adegan.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) [].concat(o.material).forEach((m) => m.dispose());
      });
      renderer.dispose();
    },
  };
}
