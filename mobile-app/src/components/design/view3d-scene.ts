/**
 * src/components/design/view3d-scene.ts
 * Ma JavaScript chay TRONG WebView cua View3D (Three.js, ES module). Doc du lieu tu window.__SCENE__
 * (xem buildScene trong View3D.tsx). Don vi 1 = 1 met; truc x = chieu rong phong, z = chieu dai, y = len tren.
 *
 *  - Noi that: dung hinh theo loai (sofa, giuong, ban, ghe, tu, ke, den, cay, tham, guong) tu cac khoi bo goc,
 *    mau theo chat lieu. Mon co modelUrl (GLB) thi tai mo hinh that, loi thi giu hinh tu dung.
 *    Quy uoc: goc toa do o tam day mon do, mat truoc huong +z (lung quay ve -z, sat tuong).
 *  - Tuong dac, day 10cm, dung phia ngoai duong mat bang; tuong nao chan giua camera va phong thi
 *    tu ha xuong con 10cm (kieu "cat tuong" cua The Sims). Co len chan tuong.
 *  - Cua ra vao co khung + canh he mo; cua so co khung, kinh, bau cua va "bau troi" sang phia ngoai.
 *  - Anh sang: hemisphere + mat troi chieu qua cua so (bong mem) + moi truong RoomEnvironment cho phan chieu.
 *
 * Luu y: chuoi nay nam trong String.raw nen KHONG dung dau backtick va cum dau-do-la-ngoac-nhon ben trong.
 */
export const SCENE_SCRIPT = String.raw`
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const data = window.__SCENE__;
const W = data.room.width, D = data.room.depth, H = data.room.height;
const S = Math.max(W, D);
const WALL_T = 0.1;
const DOOR_TOP = Math.min(2.1, H - 0.1);
const SILL = 0.9;
const WINDOW_TOP = Math.min(2.1, H - 0.1);
const MAX_LAMPS = 4;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ------------------------------ Renderer, camera ------------------------------ */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const msg = document.getElementById('msg');
if (msg) msg.remove();

const scene = new THREE.Scene();
scene.background = new THREE.Color(data.background);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 100);
camera.position.set(W / 2 + S * 0.75, S * 1.05 + 1, D / 2 + S * 1.15);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(W / 2, 0.5, D / 2);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.minDistance = 1;
controls.maxDistance = S * 3 + 2;

/* ------------------------------ Hinh hoc phong ------------------------------ */
const poly = data.floor;
function inside(x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}
// Phap tuyen huong vao trong phong cua doan a -> b
function inwardNormal(a, b) {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  return inside(mx + nx * 0.05, my + ny * 0.05) ? { x: nx, y: ny } : { x: -nx, y: -ny };
}
// Goc loi (khong phai goc lom) tai dinh i
function isConvex(i) {
  const n = poly.length;
  const p = poly[(i - 1 + n) % n], q = poly[i], r = poly[(i + 1) % n];
  const bx = (p.x + r.x) / 2 - q.x, by = (p.y + r.y) / 2 - q.y;
  const len = Math.hypot(bx, by) || 1;
  return inside(q.x + (bx / len) * 0.02, q.y + (by / len) * 0.02);
}

/* ------------------------------ Vat lieu ------------------------------ */
const texLoader = new THREE.TextureLoader();
// Chi gan anh van khi tai xong; may chu tat / loi anh thi giu mau tron
function loadTexture(spec, apply) {
  if (!spec || !spec.url) return;
  texLoader.load(spec.url, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    apply(t, spec.meters || 2);
  }, undefined, () => {});
}
function useMap(material, t) {
  material.map = t;
  material.color.set(0xffffff);
  material.needsUpdate = true;
}

function std(color, roughness, metalness) {
  return new THREE.MeshStandardMaterial({ color, roughness: roughness == null ? 0.8 : roughness, metalness: metalness || 0 });
}
const wallMats = [];
function wallMaterial(len, height) {
  const m = std(data.wallColor, 0.92);
  wallMats.push({ m, len, height });
  return m;
}

/* ------------------------------ Den ------------------------------ */
scene.add(new THREE.HemisphereLight(0xfff4e6, 0x6b5a4a, 0.75));

/* ------------------------------ San ------------------------------ */
const floorShape = new THREE.Shape(poly.map((p) => new THREE.Vector2(p.x, -p.y)));
const floorMat = std(data.floorColor, 0.7);
loadTexture(data.floorTexture, (t, meters) => {
  t.repeat.set(1 / meters, 1 / meters);
  useMap(floorMat, t);
});
const floor = new THREE.Mesh(new THREE.ShapeGeometry(floorShape), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

/* ------------------------------ Tuong, cua ------------------------------ */
const frameMat = std(0xf2efe9, 0.6);
const doorMat = std(0xa0714b, 0.55);
const handleMat = std(0xc9c9c9, 0.3, 0.9);
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xcfe6f2, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
const skyMat = new THREE.MeshBasicMaterial({ color: 0xdcecf7, side: THREE.DoubleSide });
const skirtMat = std(data.skirtingColor, 0.6);

// Them 1 khoi vao nhom tuong, toa do cuc bo: x doc tuong (tinh tu dau tuong), y len tren, z vuong goc (+z = vao phong)
function localBox(group, w, h, d, x, y, z, material, cast) {
  if (w < 0.005 || h < 0.005 || d < 0.005) return null;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = cast !== false;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

const walls = [];
const windowSpots = [];
for (let i = 0; i < poly.length; i++) {
  const a = poly[i], b = poly[(i + 1) % poly.length];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len < 0.01) continue;
  const ux = (b.x - a.x) / len, uz = (b.y - a.y) / len;
  const n = inwardNormal(a, b);
  // Nhom tuong: goc tai diem a, truc x cuc bo = huong a->b, truc z cuc bo = huong vao phong
  const side = n.x * -uz + n.y * ux > 0 ? 1 : -1; // truc z cuc bo sau khi xoay la (-uz, ux)
  const makeGroup = () => {
    const g = new THREE.Group();
    g.position.set(a.x, 0, a.y);
    g.rotation.y = -Math.atan2(uz, ux);
    g.scale.z = side;
    scene.add(g);
    return g;
  };
  const full = makeGroup();
  const stub = makeGroup();
  const zc = -WALL_T / 2; // tuong nam phia ngoai duong mat bang
  const extA = isConvex(i) ? WALL_T : 0;
  const extB = isConvex((i + 1) % poly.length) ? WALL_T : 0;

  const holes = data.openings.flatMap((o) => {
    const t1 = (o.x1 - a.x) * ux + (o.y1 - a.y) * uz;
    const t2 = (o.x2 - a.x) * ux + (o.y2 - a.y) * uz;
    const off1 = Math.abs((o.x1 - a.x) * uz - (o.y1 - a.y) * ux);
    const off2 = Math.abs((o.x2 - a.x) * uz - (o.y2 - a.y) * ux);
    if (off1 > 0.1 || off2 > 0.1) return [];
    const s = Math.max(0, Math.min(t1, t2)), e = Math.min(len, Math.max(t1, t2));
    if (e - s < 0.05) return [];
    const isDoor = o.type === 'door';
    return [{ s, e, y0: isDoor ? 0 : SILL, y1: isDoor ? DOOR_TOP : WINDOW_TOP, isDoor }];
  }).sort((p, q) => p.s - q.s);

  const piece = (g, s, e, y0, y1) => localBox(g, e - s, y1 - y0, WALL_T, (s + e) / 2, (y0 + y1) / 2, zc, wallMaterial(e - s, y1 - y0));
  const skirt = (s, e) => localBox(full, e - s, 0.08, 0.015, (s + e) / 2, 0.04, 0.0075, skirtMat, false);

  let pos = -extA;
  let skirtPos = 0;
  for (const h of holes) {
    if (h.s < pos) continue;
    piece(full, pos, h.s, 0, H);
    piece(full, h.s, h.e, 0, h.y0);
    piece(full, h.s, h.e, h.y1, H);
    const hw = h.e - h.s, mid = (h.s + h.e) / 2;
    // Khung (nep) quanh lo
    localBox(full, 0.06, h.y1 - h.y0 + 0.06, WALL_T + 0.04, h.s, (h.y0 + h.y1) / 2, zc, frameMat);
    localBox(full, 0.06, h.y1 - h.y0 + 0.06, WALL_T + 0.04, h.e, (h.y0 + h.y1) / 2, zc, frameMat);
    localBox(full, hw, 0.06, WALL_T + 0.04, mid, h.y1, zc, frameMat);
    if (h.isDoor) {
      skirt(skirtPos, h.s);
      skirtPos = h.e;
      // Canh cua he mo ~30 do vao trong phong, ban le o dau s
      const leafW = hw - 0.08;
      const hinge = new THREE.Group();
      hinge.position.set(h.s + 0.04, 0, 0);
      hinge.rotation.y = -0.5;
      full.add(hinge);
      localBox(hinge, leafW, DOOR_TOP - 0.04, 0.04, leafW / 2, (DOOR_TOP - 0.04) / 2 + 0.01, 0.02, doorMat);
      localBox(hinge, 0.12, 0.025, 0.06, leafW - 0.1, 1.0, 0.02, handleMat);
    } else {
      localBox(full, hw + 0.1, 0.035, 0.2, mid, h.y0 + 0.0175, 0.05, frameMat); // bau cua so
      localBox(full, 0.04, h.y1 - h.y0, 0.05, mid, (h.y0 + h.y1) / 2, zc, frameMat); // song giua
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(hw, h.y1 - h.y0), glassMat);
      glass.position.set(mid, (h.y0 + h.y1) / 2, zc);
      full.add(glass);
      // Mang "troi" sau cua so, khong cao qua dinh tuong de khong lo ra ngoai
      const skyTop = Math.max(h.y1 + 0.05, Math.min(H - 0.3, h.y1 + 0.3)), skyBottom = Math.max(0.05, h.y0 - 0.3);
      const skyW = Math.min(hw + 0.8, len);
      const sky = new THREE.Mesh(new THREE.PlaneGeometry(skyW, skyTop - skyBottom), skyMat);
      sky.position.set(clamp(mid, skyW / 2, len - skyW / 2), (skyTop + skyBottom) / 2, -0.16);
      full.add(sky);
      windowSpots.push({ x: a.x + ux * mid, z: a.y + uz * mid, nx: n.x, nz: n.y });
    }
    pos = h.e;
  }
  piece(full, pos, len + extB, 0, H);
  skirt(skirtPos, len);
  // Tuong thap khi bi cat
  piece(stub, -extA, len + extB, 0, 0.1);
  stub.visible = false;
  walls.push({ full, stub, mx: a.x + ux * len / 2, mz: a.y + uz * len / 2, nx: n.x, nz: n.y });
}

loadTexture(data.wallTexture, (t, meters) => {
  for (const w of wallMats) {
    const c = t.clone();
    c.needsUpdate = true;
    c.repeat.set(w.len / meters, w.height / meters);
    useMap(w.m, c);
  }
});

/* ------------------------------ Mat troi ------------------------------ */
const sun = new THREE.DirectionalLight(0xfff0d8, 1.6);
const win = windowSpots[0];
if (win) sun.position.set(win.x - win.nx * 4, H + 2.5, win.z - win.nz * 4);
else sun.position.set(W / 2 - S, H + 3, D / 2 - S * 0.6);
sun.target.position.set(W / 2, 0, D / 2);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
const sc = sun.shadow.camera;
sc.left = sc.bottom = -S * 1.2;
sc.right = sc.top = S * 1.2;
sc.near = 0.5;
sc.far = S * 4 + 10;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
sun.shadow.radius = 4;
scene.add(sun, sun.target);

/* ------------------------------ Noi that ------------------------------ */
function rbox(g, w, h, d, x, y, z, material, r) {
  w = Math.max(w, 0.01); h = Math.max(h, 0.01); d = Math.max(d, 0.01);
  const rr = Math.min(r || 0, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  const geo = rr > 0.002 ? new RoundedBoxGeometry(w, h, d, 3, rr) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
function cyl(g, rTop, rBottom, h, x, y, z, material, seg) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(rTop, 0.003), Math.max(rBottom, 0.003), Math.max(h, 0.005), seg || 16), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
// So gia lap co dinh theo chi so (de moi lan mo deu giong nhau)
function rand(seed) {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function palette(it) {
  const t = (it.name + ' ' + (it.material || '')).toLowerCase();
  const has = (k) => t.indexOf(k) >= 0;
  const darkWood = std(0x3b2a1e, 0.6);
  let main;
  if (has('da bò') || has('sofa da') || has(' da ')) main = std(0x7a4a2e, 0.5);
  else if (has('óc chó')) main = std(0x5c3d2a, 0.55);
  else if (has('sồi')) main = std(0xc49a6c, 0.6);
  else if (has('đồng')) main = std(0xb08d57, 0.35, 0.8);
  else if (has('kim loại')) main = std(0x2f2f2f, 0.4, 0.6);
  else if (has('mây') || has('tre')) main = std(0xc9a46a, 0.85);
  else if (has('marble') || has('đá')) main = std(0xeeebe6, 0.25);
  else if (has('mdf') || has('trắng')) main = std(0xf1efe9, 0.6);
  else if (has('lưới')) main = std(0x2a2a2a, 0.7);
  else if (has('len')) main = std(0xa88a6e, 1);
  else if (has('vải') || has('nỉ')) main = std(0xc8b9a2, 0.95);
  else {
    const byCat = { sofa: 0x8f969c, chair: 0xa8784f, table: 0x9b6b43, bed: 0x9b7350, storage: 0xe9e4da, lighting: 0x2f2f2f, decor: 0xb59c86 };
    main = std(byCat[it.category] || 0xb0a89c, it.category === 'sofa' ? 0.95 : 0.65);
  }
  const fabric = it.category === 'sofa' || it.category === 'bed' ? main : std(0xc8b9a2, 0.95);
  return { main, fabric, darkWood, metal: std(0x2b2b2b, 0.4, 0.7), white: std(0xf3f1ec, 0.95) };
}

function buildSofa(it, c, g) {
  const w = it.w, d = it.d, h = it.h;
  const body = c.fabric;
  const legH = 0.06;
  const seatH = clamp(h * 0.5, 0.36, 0.48);
  const cushH = 0.14;
  const baseH = Math.max(0.08, seatH - legH - cushH);
  const armW = clamp(w * 0.08, 0.09, 0.2);
  const armH = Math.min(h, seatH + 0.18);
  const backD = clamp(d * 0.22, 0.14, 0.25);
  const isL = d > 1.3 && w > 1.6;
  const mainD = isL ? Math.min(0.95, d * 0.6) : d;
  const chW = isL ? Math.min(0.95, w * 0.4) : 0;
  const z0 = -d / 2;
  rbox(g, w, baseH, mainD, 0, legH + baseH / 2, z0 + mainD / 2, body, 0.03);
  if (isL) rbox(g, chW, baseH, d - mainD + 0.02, w / 2 - chW / 2, legH + baseH / 2, z0 + mainD + (d - mainD) / 2 - 0.01, body, 0.03);
  rbox(g, w, h - legH, backD, 0, legH + (h - legH) / 2, z0 + backD / 2, body, 0.05);
  rbox(g, armW, armH - legH, mainD, -w / 2 + armW / 2, legH + (armH - legH) / 2, z0 + mainD / 2, body, 0.04);
  const rightD = isL ? d : mainD;
  rbox(g, armW, armH - legH, rightD, w / 2 - armW / 2, legH + (armH - legH) / 2, z0 + rightD / 2, body, 0.04);
  const innerW = w - 2 * armW;
  const n = innerW > 1.6 ? 3 : innerW > 0.9 ? 2 : 1;
  const cw = innerW / n;
  const cd = mainD - backD;
  const backH = Math.max(0.1, (h - seatH) * 0.8);
  for (let i = 0; i < n; i++) {
    const x = -innerW / 2 + cw * (i + 0.5);
    rbox(g, cw - 0.015, cushH, cd - 0.01, x, legH + baseH + cushH / 2, z0 + backD + cd / 2, body, 0.045);
    rbox(g, cw - 0.03, backH, 0.13, x, seatH + backH / 2, z0 + backD + 0.06, body, 0.05);
  }
  if (isL) {
    const cwL = chW - armW;
    rbox(g, cwL - 0.015, cushH, d - mainD - 0.01, w / 2 - armW - cwL / 2, legH + baseH + cushH / 2, z0 + mainD + (d - mainD) / 2, body, 0.045);
  }
  const lx = w / 2 - 0.07;
  const legs = isL
    ? [[-lx, z0 + 0.07], [lx, z0 + 0.07], [-lx, z0 + mainD - 0.07], [lx, d / 2 - 0.07], [w / 2 - chW + 0.07, d / 2 - 0.07]]
    : [[-lx, z0 + 0.07], [lx, z0 + 0.07], [-lx, d / 2 - 0.07], [lx, d / 2 - 0.07]];
  for (const [x, z] of legs) cyl(g, 0.02, 0.015, legH, x, legH / 2, z, c.darkWood, 8);
}

function buildChair(it, c, g) {
  const w = it.w, d = it.d, h = it.h;
  const name = it.name.toLowerCase();
  if (name.indexOf('bar') >= 0) {
    const r = Math.min(w, d) / 2;
    cyl(g, r, r, 0.05, 0, h - 0.025, 0, c.main, 24);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      cyl(g, 0.015, 0.018, h - 0.05, Math.cos(a) * r * 0.7, (h - 0.05) / 2, Math.sin(a) * r * 0.7, c.main, 8);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.72, 0.01, 6, 24), c.metal);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = h * 0.33;
    g.add(ring);
    return;
  }
  if (name.indexOf('văn phòng') >= 0) {
    const seatH = 0.48;
    for (let i = 0; i < 5; i++) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w, d) * 0.45, 0.03, 0.04), c.metal);
      const a = (i * 2 * Math.PI) / 5;
      arm.position.set((Math.cos(a) * Math.min(w, d) * 0.45) / 2, 0.06, (Math.sin(a) * Math.min(w, d) * 0.45) / 2);
      arm.rotation.y = -a;
      arm.castShadow = true;
      g.add(arm);
    }
    cyl(g, 0.025, 0.03, seatH - 0.1, 0, (seatH - 0.1) / 2 + 0.05, 0, c.metal, 12);
    rbox(g, w * 0.8, 0.08, d * 0.7, 0, seatH, 0.03, c.main, 0.03);
    const back = rbox(g, w * 0.75, h - seatH - 0.08, 0.05, 0, seatH + 0.04 + (h - seatH - 0.08) / 2, -d * 0.32, c.main, 0.02);
    back.rotation.x = -0.12;
    return;
  }
  if (w >= 0.65) return buildSofa(it, c, g); // ghe banh boc nem
  const seatH = clamp(h * 0.53, 0.4, 0.48);
  const legR = 0.016;
  const lx = w / 2 - 0.035, lz = d / 2 - 0.035;
  for (const [x, z] of [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]]) cyl(g, legR, legR * 0.8, seatH - 0.03, x, (seatH - 0.03) / 2, z, c.main, 8);
  const upholstered = name.indexOf('nệm') >= 0 || name.indexOf('bọc') >= 0;
  rbox(g, w, 0.04, d, 0, seatH - 0.02, 0, c.main, 0.01);
  if (upholstered) rbox(g, w - 0.04, 0.05, d - 0.05, 0, seatH + 0.02, 0.01, c.fabric, 0.02);
  const backH = Math.max(0.15, h - seatH);
  cyl(g, legR, legR, backH, -lx, seatH + backH / 2, -lz, c.main, 8);
  cyl(g, legR, legR, backH, lx, seatH + backH / 2, -lz, c.main, 8);
  rbox(g, w - 0.03, backH * 0.45, 0.03, 0, h - backH * 0.25, -lz, upholstered ? c.fabric : c.main, 0.01);
}

function buildTable(it, c, g) {
  const w = it.w, d = it.d, h = it.h;
  const name = it.name.toLowerCase();
  if (name.indexOf('đầu giường') >= 0) return buildCabinet(it, c, g);
  const glass = name.indexOf('kính') >= 0;
  const topT = glass ? 0.015 : 0.04;
  const topMat = glass ? new THREE.MeshPhysicalMaterial({ color: 0xdfeff3, transparent: true, opacity: 0.35, roughness: 0.05 }) : c.main;
  const top = rbox(g, w, topT, d, 0, h - topT / 2, 0, topMat, glass ? 0 : 0.008);
  if (glass) top.castShadow = false;
  const legMat = glass ? c.metal : c.main;
  const legT = 0.045;
  const lx = w / 2 - 0.06, lz = d / 2 - 0.06;
  for (const [x, z] of [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]]) rbox(g, legT, h - topT, legT, x, (h - topT) / 2, z, legMat, 0.005);
  if (glass && h < 0.6) rbox(g, w - 0.15, 0.02, d - 0.12, 0, 0.12, 0, c.darkWood, 0.005); // ke duoi ban tra
  if (name.indexOf('làm việc') >= 0) rbox(g, Math.min(0.45, w * 0.35), 0.15, d - 0.08, w / 2 - Math.min(0.45, w * 0.35) / 2 - 0.06, h - topT - 0.075, 0, c.main, 0.005);
}

function buildBed(it, c, g) {
  const w = it.w, d = it.d, h = it.h;
  const frameMat = std(0x9b7350, 0.65);
  const legH = 0.08, frameH = 0.22;
  const top = legH + frameH;
  const lx = w / 2 - 0.06, lz = d / 2 - 0.06;
  for (const [x, z] of [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]]) cyl(g, 0.025, 0.02, legH, x, legH / 2, z, c.darkWood, 8);
  rbox(g, w, frameH, d - 0.06, 0, legH + frameH / 2, 0.03, c.main === c.fabric ? frameMat : c.main, 0.02);
  const mH = 0.2;
  rbox(g, w - 0.06, mH, d - 0.14, 0, top + mH / 2, 0.05, c.white, 0.05);
  const headH = Math.max(h, top + mH + 0.3);
  rbox(g, w + 0.04, headH, 0.08, 0, headH / 2, -d / 2 + 0.04, c.fabric, 0.03);
  const pn = w > 1.3 ? 2 : 1;
  const pw = Math.min(0.6, (w - 0.2) / pn - 0.05);
  for (let i = 0; i < pn; i++) {
    const x = pn === 1 ? 0 : (i === 0 ? -1 : 1) * (pw / 2 + 0.04);
    rbox(g, pw, 0.12, 0.36, x, top + mH + 0.05, -d / 2 + 0.12 + 0.2, c.white, 0.05);
  }
  const blanketD = (d - 0.14) * 0.62;
  rbox(g, w - 0.02, 0.05, blanketD, 0, top + mH + 0.01, d / 2 - 0.02 - blanketD / 2, std(0x7d93a8, 0.95), 0.025);
  rbox(g, w - 0.02, 0.25, 0.03, 0, top + mH - 0.1, d / 2 - 0.01, std(0x7d93a8, 0.95), 0.012);
}

function buildCabinet(it, c, g) {
  const w = it.w, d = it.d, h = it.h;
  const name = it.name.toLowerCase();
  const legH = h > 1.2 ? 0.05 : 0.08;
  rbox(g, w, h - legH, d, 0, legH + (h - legH) / 2, 0, c.main, 0.008);
  const lx = w / 2 - 0.04, lz = d / 2 - 0.04;
  for (const [x, z] of [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]]) cyl(g, 0.015, 0.012, legH, x, legH / 2, z, c.darkWood, 8);
  const front = d / 2 + 0.006;
  const knob = std(0xb7a27a, 0.3, 0.8);
  if (h < 0.8) {
    // Ngan keo ngang
    const rows = h < 0.5 ? 1 : 2;
    const cols = w > 1.2 ? 3 : 1;
    const rh = (h - legH - 0.04) / rows, cw = (w - 0.04) / cols;
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const x = -w / 2 + 0.02 + cw * (k + 0.5), y = legH + 0.02 + rh * (r + 0.5);
      rbox(g, cw - 0.012, rh - 0.012, 0.015, x, y, front, c.main, 0.003);
      rbox(g, Math.min(0.12, cw * 0.3), 0.015, 0.02, x, y + rh * 0.25, front + 0.015, knob, 0.004);
    }
    return;
  }
  const m = /(\d+)\s*cánh/.exec(name);
  const doors = m ? Number(m[1]) : Math.max(1, Math.round(w / 0.5));
  const dw = (w - 0.02) / doors;
  for (let k = 0; k < doors; k++) {
    const x = -w / 2 + 0.01 + dw * (k + 0.5);
    rbox(g, dw - 0.008, h - legH - 0.03, 0.018, x, legH + (h - legH) / 2, front, c.main, 0.003);
    const hx = x + (k % 2 === 0 ? 1 : -1) * (dw / 2 - 0.05);
    rbox(g, 0.015, Math.min(0.3, h * 0.2), 0.02, hx, legH + (h - legH) * 0.55, front + 0.018, knob, 0.004);
  }
}

function buildShelf(it, c, g) {
  const w = it.w, d = it.d, h = it.h;
  const t = 0.02;
  rbox(g, t, h, d, -w / 2 + t / 2, h / 2, 0, c.main, 0);
  rbox(g, t, h, d, w / 2 - t / 2, h / 2, 0, c.main, 0);
  rbox(g, w, t, d, 0, h - t / 2, 0, c.main, 0);
  rbox(g, w - 2 * t, 0.01, d, 0, 0.005, 0, c.main, 0);
  rbox(g, w - 2 * t, h, 0.008, 0, h / 2, -d / 2 + 0.004, c.main, 0);
  const n = Math.max(2, Math.round(h / 0.36));
  const gap = (h - t) / n;
  const bookColors = [0x8c3b2e, 0x2e4a62, 0xc9a227, 0x3f6b4a, 0xe8e2d6, 0x5b4636, 0x9a4f6b];
  for (let i = 0; i < n; i++) {
    const y = gap * i + 0.03;
    if (i > 0) rbox(g, w - 2 * t, t, d - 0.01, 0, y - t / 2, 0.005, c.main, 0);
    // Sach tren ke (gia lap co dinh)
    let x = -w / 2 + t + 0.02;
    let k = 0;
    while (x < w / 2 - t - 0.05 && rand(i * 31 + k) > 0.08) {
      const bw = 0.025 + rand(i * 17 + k) * 0.03;
      const bh = Math.min(gap - 0.04, 0.17 + rand(i * 7 + k) * 0.1);
      if (rand(i * 13 + k) > 0.25) rbox(g, bw, bh, d * 0.7, x + bw / 2, y + bh / 2, 0, std(bookColors[(i * 3 + k) % bookColors.length], 0.8), 0.003);
      x += bw + 0.004;
      k++;
    }
  }
}

let lampCount = 0;
function addLampLight(g, y) {
  if (lampCount >= MAX_LAMPS) return;
  lampCount++;
  const l = new THREE.PointLight(0xffd59a, 1.2, 4.5, 2);
  l.position.set(0, y, 0);
  g.add(l);
}
const shadeMat = new THREE.MeshStandardMaterial({ color: 0xf6efe2, emissive: 0xffd9a0, emissiveIntensity: 0.6, roughness: 0.9, side: THREE.DoubleSide });

function buildLamp(it, c, g) {
  const w = it.w, d = it.d, h = it.h;
  const name = it.name.toLowerCase();
  const r = Math.min(w, d) / 2;
  if (name.indexOf('thả') >= 0 || name.indexOf('trần') >= 0) {
    const cordTop = H;
    const shadeTop = H - 0.6;
    cyl(g, 0.004, 0.004, cordTop - shadeTop, 0, (cordTop + shadeTop) / 2, 0, c.metal, 6);
    const shade = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), c.main);
    shade.material.side = THREE.DoubleSide;
    // Nua cau mo phia duoi, dinh cham day treo
    const sy = clamp(h / r, 0.3, 1.5);
    shade.scale.y = sy;
    shade.position.y = shadeTop - sy * r;
    shade.castShadow = true;
    g.add(shade);
    addLampLight(g, shadeTop - r * 0.5);
    return;
  }
  cyl(g, r * 0.7, r * 0.75, 0.03, 0, 0.015, 0, c.main, 24);
  const shadeH = Math.min(0.32, h * 0.25);
  cyl(g, 0.012, 0.012, h - shadeH, 0, (h - shadeH) / 2, 0, c.main, 8);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.85, shadeH, 24, 1, true), shadeMat);
  shade.position.y = h - shadeH / 2;
  g.add(shade);
  addLampLight(g, h - shadeH / 2);
}

function buildDecor(it, c, g) {
  const w = it.w, d = it.d, h = it.h;
  const name = it.name.toLowerCase();
  if (name.indexOf('thảm') >= 0) {
    const rugMat = name.indexOf('len') >= 0 || (it.material || '').toLowerCase().indexOf('len') >= 0 ? std(0xa88a6e, 1) : std(0xb59c86, 1);
    const inner = std(0xd8c8b0, 1);
    let m1, m2;
    if (name.indexOf('tròn') >= 0) {
      m1 = cyl(g, w / 2, w / 2, 0.012, 0, 0.006, 0, rugMat, 48);
      m2 = cyl(g, w / 2 - 0.12, w / 2 - 0.12, 0.002, 0, 0.0125, 0, inner, 48);
    } else {
      m1 = rbox(g, w, 0.012, d, 0, 0.006, 0, rugMat, 0.004);
      m2 = rbox(g, w - 0.24, 0.002, d - 0.24, 0, 0.0125, 0, inner, 0);
    }
    m1.castShadow = m2.castShadow = false;
    return;
  }
  if (name.indexOf('gương') >= 0) {
    const mirror = new THREE.MeshStandardMaterial({ color: 0xe6edf0, metalness: 1, roughness: 0.04 });
    const frame = std(0xb08d57, 0.35, 0.8);
    if (name.indexOf('tròn') >= 0) {
      const r = w / 2;
      const cy = clamp(1.45, r + 0.3, H - r - 0.1);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r - 0.015, 0.02, 10, 48), frame);
      ring.position.set(0, cy, -d / 2 + 0.03);
      ring.castShadow = true;
      g.add(ring);
      const glass = new THREE.Mesh(new THREE.CircleGeometry(r - 0.03, 48), mirror);
      glass.position.set(0, cy, -d / 2 + 0.025);
      g.add(glass);
      return;
    }
    const lean = new THREE.Group();
    lean.position.z = -d / 2 + 0.02;
    lean.rotation.x = -0.08;
    g.add(lean);
    rbox(lean, w, h, 0.03, 0, h / 2, 0.08, frame, 0.005);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, h - 0.06), mirror);
    glass.position.set(0, h / 2, 0.096);
    lean.add(glass);
    return;
  }
  if (name.indexOf('cây') >= 0 || name.indexOf('chậu') >= 0) {
    const r = Math.min(w, d) * 0.35;
    const potH = Math.min(0.38, h * 0.28);
    cyl(g, r, r * 0.78, potH, 0, potH / 2, 0, std(0xd9d4cc, 0.7), 24);
    cyl(g, r * 0.95, r * 0.95, 0.01, 0, potH - 0.02, 0, std(0x3d2b1f, 1), 24);
    cyl(g, 0.015, 0.02, h * 0.55, 0, potH + h * 0.25, 0, std(0x6b4f35, 0.9), 6);
    const greens = [0x3f7d3a, 0x4f8f46, 0x2f6b33, 0x5a9a4c];
    const canopyR = Math.max(w, d) * 0.4;
    for (let i = 0; i < 7; i++) {
      const lr = canopyR * (0.45 + rand(i + 1) * 0.35);
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(lr, 1), new THREE.MeshStandardMaterial({ color: greens[i % greens.length], roughness: 0.85, flatShading: true }));
      const a = rand(i * 3 + 2) * Math.PI * 2;
      const rr = rand(i * 5 + 1) * canopyR * 0.5;
      const y = potH + (h - potH) * (0.35 + rand(i * 7 + 3) * 0.5);
      leaf.position.set(Math.cos(a) * rr, Math.min(y, h - lr * 0.7), Math.sin(a) * rr);
      leaf.castShadow = true;
      g.add(leaf);
    }
    return;
  }
  rbox(g, w, h, d, 0, h / 2, 0, c.main, Math.min(w, d, h) * 0.1);
}

function buildProcedural(it, g) {
  const c = palette(it);
  const name = it.name.toLowerCase();
  switch (it.category) {
    case 'sofa': return buildSofa(it, c, g);
    case 'chair': return buildChair(it, c, g);
    case 'table': return buildTable(it, c, g);
    case 'bed': return buildBed(it, c, g);
    case 'storage':
      if (name.indexOf('kệ') >= 0 && name.indexOf('tivi') < 0 && it.h > 0.9) return buildShelf(it, c, g);
      return buildCabinet(it, c, g);
    case 'lighting': return buildLamp(it, c, g);
    case 'decor': return buildDecor(it, c, g);
    default: rbox(g, it.w, it.h, it.d, 0, it.h / 2, 0, c.main, Math.min(it.w, it.d, it.h) * 0.08);
  }
}

const gltfLoader = new GLTFLoader();
// Tai mo hinh GLB, co gian cho dung kich thuoc that roi thay hinh tu dung
function loadModel(it, holder, procedural) {
  gltfLoader.load(it.modelUrl, (gltf) => {
    const obj = gltf.scene;
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    if (size.x <= 0 || size.y <= 0 || size.z <= 0) return;
    obj.scale.set(it.w / size.x, it.h / size.y, it.d / size.z);
    const b2 = new THREE.Box3().setFromObject(obj);
    const center = b2.getCenter(new THREE.Vector3());
    obj.position.set(-center.x, -b2.min.y, -center.z);
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    holder.remove(procedural);
    holder.add(obj);
  }, undefined, () => {});
}

data.items.forEach((it) => {
  const holder = new THREE.Group();
  holder.position.set(it.x, 0, it.z);
  holder.rotation.y = -(it.rotation * Math.PI) / 180;
  const procedural = new THREE.Group();
  buildProcedural(it, procedural);
  holder.add(procedural);
  scene.add(holder);
  if (it.modelUrl) loadModel(it, holder, procedural);
});

/* ------------------------------ Vong lap ------------------------------ */
// Tuong co camera nam phia ngoai -> ha xuong de nhin vao phong
function updateCutaway() {
  for (const w of walls) {
    const vx = camera.position.x - w.mx, vz = camera.position.z - w.mz;
    const outside = -(vx * w.nx + vz * w.nz) > 0.2;
    w.full.visible = !outside;
    w.stub.visible = outside;
  }
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
renderer.setAnimationLoop(() => {
  controls.update();
  updateCutaway();
  renderer.render(scene, camera);
});
window.__READY__ = true;
`;
