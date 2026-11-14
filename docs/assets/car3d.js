// VF-26 concept model — an original, code-built 3D car (no downloaded mesh).
// Units are metres. +X is the nose, +Y is up, Z is across the car.
// Mounts on every [data-car3d] element; UI is wired through data attributes
// found inside the closest [data-car-ui] ancestor.
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const RED = 0xd4001f;

/* ------------------------------------------------------------------ helpers */

const cr = (p0, p1, p2, p3, t) => {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};
const KEYS = ['x', 'w', 'y0', 'y1', 'n', 'taper', 'cz', 'flat'];
const DEF = { n: 2.4, taper: 0, cz: 0, flat: 0 };

// Loft a closed skin through cross-sections. Each section is a superellipse:
// half-width w, bottom y0, top y1, squareness n, `taper` narrows the top,
// `flat` narrows the bottom (undercut), cz shifts it sideways.
function loft(sections, { segs = 56, sub = 8, uv } = {}) {
  const S = sections.map((s) => ({ ...DEF, ...s }));
  const rings = [];
  for (let i = 0; i < S.length - 1; i++) {
    const a = S[Math.max(0, i - 1)], b = S[i], c = S[i + 1], d = S[Math.min(S.length - 1, i + 2)];
    for (let k = 0; k < sub; k++) {
      const t = k / sub, r = {};
      KEYS.forEach((key) => (r[key] = cr(a[key], b[key], c[key], d[key], t)));
      r.x = b.x + (c.x - b.x) * t; // keep stations monotonic
      rings.push(r);
    }
  }
  rings.push(S[S.length - 1]);
  const pos = [], uvs = [], idx = [];
  const ss = (t) => t * t * (3 - 2 * t);
  rings.forEach((r) => {
    for (let j = 0; j <= segs; j++) {
      const th = (j / segs) * Math.PI * 2 - Math.PI / 2; // start at the bottom
      const c = Math.cos(th), s = Math.sin(th), e = 2 / Math.max(1.2, r.n);
      const px = Math.sign(c) * Math.abs(c) ** e, py = Math.sign(s) * Math.abs(s) ** e;
      const t = (py + 1) / 2;
      const wf = (1 - r.taper * ss(t)) * (1 - r.flat * ss(1 - t));
      const y = r.y0 + (r.y1 - r.y0) * t, z = r.cz + Math.max(0.001, r.w) * px * wf;
      pos.push(r.x, y, z);
      uvs.push(...(uv ? uv(r.x, y, z) : [0, 0]));
    }
  });
  const row = segs + 1;
  for (let i = 0; i < rings.length - 1; i++)
    for (let j = 0; j < segs; j++) {
      const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  // end caps
  [0, rings.length - 1].forEach((ri, n) => {
    const r = rings[ri], ci = pos.length / 3;
    pos.push(r.x, (r.y0 + r.y1) / 2, r.cz);
    uvs.push(...(uv ? uv(r.x, (r.y0 + r.y1) / 2, r.cz) : [0, 0]));
    for (let j = 0; j < segs; j++) {
      const a = ri * row + j, b = a + 1;
      n === 0 ? idx.push(ci, b, a) : idx.push(ci, a, b);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Aerofoil lofted along the span. f(z) returns { le:[x,y], chord, aoa(deg), thick }.
// The chord runs back from the leading edge; positive aoa lifts the trailing edge.
function wing(zs, f, cam = 0.06) {
  const N = 14, prof = [];
  for (let i = 0; i <= N; i++) prof.push({ s: 1 - i / N, up: 1 });
  for (let i = 1; i <= N; i++) prof.push({ s: i / N, up: -1 });
  const pos = [], idx = [];
  zs.forEach((z) => {
    const p = f(z), a = (p.aoa * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a), t = p.thick ?? 0.11;
    prof.forEach(({ s, up }) => {
      const yt = 5 * t * (0.2969 * Math.sqrt(s) - 0.126 * s - 0.3516 * s * s + 0.2843 * s ** 3 - 0.1036 * s ** 4);
      const cx = s * p.chord, cy = (-4 * cam * s * (1 - s) + up * yt) * p.chord;
      pos.push(p.le[0] - (cx * ca - cy * sa), p.le[1] + cx * sa + cy * ca, z);
    });
  });
  const row = prof.length;
  for (let i = 0; i < zs.length - 1; i++)
    for (let j = 0; j < row; j++) {
      const a = i * row + j, b = i * row + ((j + 1) % row), c = a + row, d = b + row;
      idx.push(a, c, b, b, c, d);
    }
  [0, zs.length - 1].forEach((zi, n) => {
    for (let j = 1; j < row - 1; j++) n === 0 ? idx.push(zi * row, zi * row + j, zi * row + j + 1) : idx.push(zi * row, zi * row + j + 1, zi * row + j);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Flat plate from an outline drawn in the X-Y plane, extruded across Z.
function plate(pts, thick, z = 0) {
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1, curveSegments: 16 });
  g.translate(0, 0, z - thick / 2);
  return g;
}

// Suspension blade between two points (thin vertically, wide fore-aft).
function blade(a, b, wide = 0.05, thin = 0.014) {
  const dir = b.clone().sub(a), len = dir.length();
  const g = new THREE.BoxGeometry(len, thin, wide);
  const X = dir.clone().normalize(), Zp = new THREE.Vector3().crossVectors(X, V(0, 1, 0)).normalize(), Y = new THREE.Vector3().crossVectors(Zp, X);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(X, Y, Zp).setPosition(a.clone().add(b).multiplyScalar(0.5)));
  return g;
}
function tube(pts, r, closed = false, seg = 64) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed, 'catmullrom', 0.5), seg, r, 12, closed);
}
const span = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

/* ------------------------------------------------------------------ livery */

const LX0 = -2.75, LX1 = 2.95, LY1 = 1.06;
const liveryUV = (x, y) => [(x - LX0) / (LX1 - LX0), y / LY1];

function liveryTexture(side = 0) {
  const W = 2048, H = 512, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const X = (x) => ((x - LX0) / (LX1 - LX0)) * W, Y = (y) => H - (y / LY1) * H;
  g.fillStyle = '#f3f1ec'; g.fillRect(0, 0, W, H);
  // black lower body: a line that climbs from the nose to the engine cover
  const edge = (off) => {
    g.beginPath();
    g.moveTo(X(3), Y(0.2 + off));
    g.bezierCurveTo(X(1.6), Y(0.2 + off), X(1.0), Y(0.2 + off), X(0.5), Y(0.3 + off));
    g.bezierCurveTo(X(-0.4), Y(0.5 + off), X(-0.9), Y(0.62 + off), X(-2.8), Y(0.86 + off));
  };
  edge(0); g.lineTo(X(-2.8), H); g.lineTo(X(3), H); g.closePath(); g.fillStyle = '#0c0c0e'; g.fill();
  edge(0.012); g.lineWidth = 9; g.strokeStyle = '#d4001f'; g.stroke();
  // red flash on the airbox and nose tip
  g.fillStyle = '#d4001f';
  g.beginPath(); g.moveTo(X(0.1), Y(1.06)); g.lineTo(X(-0.32), Y(1.06)); g.lineTo(X(-0.55), Y(0.74)); g.lineTo(X(-0.02), Y(0.74)); g.closePath(); g.fill();
  g.fillRect(X(2.62), 0, W, H);
  if (side) {
    // team lettering on the sidepod, mirrored for the left side so it reads correctly
    g.save();
    g.translate(X(-0.32), Y(0.215));
    if (side < 0) g.scale(-1, 1);
    g.fillStyle = '#f3f1ec'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'italic 900 62px "Archx", "Arial Black", sans-serif';
    g.fillText('HAAS', 0, 0);
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.flipY = true;
  return t;
}

function numberTexture(txt, fg, bg) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, 512, 256); }
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'italic 900 210px "Archx", "Arial Black", sans-serif';
  g.fillText(txt, 256, 138);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/* ------------------------------------------------------------------ the car */

export function buildCar() {
  const car = new THREE.Group();
  const mkPaint = (side) => new THREE.MeshPhysicalMaterial({ map: liveryTexture(side), roughness: 0.34, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 });
  const paint = mkPaint(0), paintR = mkPaint(1), paintL = mkPaint(-1);
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf3f1ec, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.12, side: THREE.DoubleSide });
  const red = new THREE.MeshPhysicalMaterial({ color: RED, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.DoubleSide });
  const carbon = new THREE.MeshPhysicalMaterial({ color: 0x101012, roughness: 0.42, metalness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.3, side: THREE.DoubleSide });
  const matte = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.95 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.86 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x8a8d92, roughness: 0.28, metalness: 1 });
  const skin = [paint, paintR, paintL, white, red, carbon]; // faded in x-ray mode

  const part = (name, explode) => {
    const g = new THREE.Group(); g.name = name; g.userData.explode = explode || V(0, 0, 0); car.add(g); return g;
  };
  const add = (grp, geo, mat, shadow = true) => {
    const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; grp.add(m); return m;
  };

  /* --- survival cell, nose and engine cover: one continuous skin --- */
  const body = part('body', V(0, 0, 0));
  add(body, loft([
    { x: 2.8, w: 0.03, y0: 0.238, y1: 0.282, n: 2 },
    { x: 2.66, w: 0.066, y0: 0.215, y1: 0.305, n: 2.1 },
    { x: 2.4, w: 0.098, y0: 0.195, y1: 0.34, n: 2.3 },
    { x: 2.0, w: 0.135, y0: 0.165, y1: 0.395, n: 2.6 },
    { x: 1.6, w: 0.175, y0: 0.135, y1: 0.45, n: 2.9, taper: 0.08 },
    { x: 1.2, w: 0.235, y0: 0.095, y1: 0.52, n: 3.1, taper: 0.14 },
    { x: 0.85, w: 0.285, y0: 0.065, y1: 0.575, n: 3.2, taper: 0.2 },
    { x: 0.45, w: 0.305, y0: 0.05, y1: 0.6, n: 3.2, taper: 0.24 },
    { x: 0.05, w: 0.31, y0: 0.05, y1: 0.615, n: 3, taper: 0.3 },
    { x: -0.3, w: 0.3, y0: 0.05, y1: 0.64, n: 2.7, taper: 0.46 },
    { x: -0.65, w: 0.27, y0: 0.06, y1: 0.62, n: 2.4, taper: 0.56 },
    { x: -1.05, w: 0.22, y0: 0.08, y1: 0.55, n: 2.2, taper: 0.62 },
    { x: -1.45, w: 0.16, y0: 0.1, y1: 0.46, n: 2.2, taper: 0.62 },
    { x: -1.85, w: 0.105, y0: 0.14, y1: 0.385, n: 2.1, taper: 0.5 },
    { x: -2.2, w: 0.062, y0: 0.2, y1: 0.33, n: 2, taper: 0.3 },
  ], { uv: liveryUV }), paint);

  const noseNo = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshBasicMaterial({ map: numberTexture('87', '#d4001f'), transparent: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  noseNo.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); noseNo.rotateX(-0.137); noseNo.position.set(1.95, 0.408, 0); body.add(noseNo);

  /* --- airbox and spine --- */
  const cover = part('cover', V(-0.1, 0.55, 0));
  add(cover, loft([
    { x: 0.06, w: 0.1, y0: 0.6, y1: 0.93, n: 2.3, taper: 0.25 },
    { x: -0.12, w: 0.125, y0: 0.58, y1: 0.965, n: 2.3, taper: 0.3 },
    { x: -0.45, w: 0.11, y0: 0.56, y1: 0.93, n: 2.2, taper: 0.5 },
    { x: -0.8, w: 0.06, y0: 0.5, y1: 0.8, n: 2.1, taper: 0.66 },
    { x: -1.12, w: 0.012, y0: 0.46, y1: 0.7, n: 2, taper: 0.75 },
  ], { segs: 40, uv: liveryUV }), paint);
  // intake mouth
  const mouth = add(cover, new THREE.CircleGeometry(1, 40), matte, false);
  mouth.scale.set(0.08, 0.13, 1); mouth.rotation.y = Math.PI / 2; mouth.position.set(0.064, 0.79, 0);
  // shark fin, with the race number on both faces
  add(cover, plate([[-0.5, 0.9], [-1.86, 0.6], [-1.92, 0.44], [-1.3, 0.5], [-0.5, 0.62]], 0.012), carbon);
  [1, -1].forEach((s) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshBasicMaterial({ map: numberTexture('87', '#f3f1ec'), transparent: true, toneMapped: false }));
    m.position.set(-1.43, 0.585, s * 0.0115); m.rotation.y = s > 0 ? 0 : Math.PI; cover.add(m);
  });
  // onboard camera pod
  add(cover, loft([{ x: 0.0, w: 0.012, y0: 0.985, y1: 1.0 }, { x: -0.08, w: 0.03, y0: 0.975, y1: 1.012 }, { x: -0.2, w: 0.012, y0: 0.985, y1: 1.0 }], { segs: 16, sub: 4 }), new THREE.MeshStandardMaterial({ color: 0xd8f000, roughness: 0.5 }));
  [0.11, -0.11].forEach((z) => add(cover, new THREE.BoxGeometry(0.1, 0.012, 0.09).translate(-0.08, 0.992, z), carbon));

  /* --- sidepods --- */
  const pods = [1, -1].map((s) => {
    const g = part(s > 0 ? 'pod-r' : 'pod-l', V(0, 0.05, 0.55 * s));
    add(g, loft([
      { x: 0.66, cz: 0.5 * s, w: 0.17, y0: 0.33, y1: 0.555, n: 3.4 },
      { x: 0.45, cz: 0.515 * s, w: 0.215, y0: 0.27, y1: 0.585, n: 3.3, flat: 0.25 },
      { x: 0.05, cz: 0.53 * s, w: 0.25, y0: 0.15, y1: 0.59, n: 3, flat: 0.42 },
      { x: -0.4, cz: 0.5 * s, w: 0.255, y0: 0.085, y1: 0.55, n: 2.8, flat: 0.4 },
      { x: -0.85, cz: 0.42 * s, w: 0.225, y0: 0.075, y1: 0.46, n: 2.6, flat: 0.3 },
      { x: -1.25, cz: 0.32 * s, w: 0.18, y0: 0.075, y1: 0.34, n: 2.5, flat: 0.2 },
      { x: -1.6, cz: 0.22 * s, w: 0.125, y0: 0.08, y1: 0.235, n: 2.4 },
      { x: -1.92, cz: 0.14 * s, w: 0.07, y0: 0.09, y1: 0.17, n: 2.2 },
    ], { segs: 44, uv: liveryUV }), s > 0 ? paintR : paintL);
    const inlet = add(g, new THREE.CircleGeometry(1, 32), matte, false);
    inlet.scale.set(0.135, 0.085, 1); inlet.rotation.y = Math.PI / 2; inlet.position.set(0.664, 0.445, 0.5 * s);
    // mirror on its stalk
    add(g, new THREE.BoxGeometry(0.05, 0.06, 0.15).translate(0.74, 0.665, 0.53 * s), carbon);
    add(g, blade(V(0.72, 0.6, 0.36 * s), V(0.74, 0.65, 0.5 * s), 0.03, 0.01), carbon);
    return g;
  });

  /* --- floor, plank and diffuser --- */
  const floor = part('floor', V(0, -0.34, 0));
  const half = [[1.08, 0.24], [1.0, 0.56], [0.72, 0.74], [0.2, 0.79], [-0.9, 0.8], [-1.3, 0.76], [-1.36, 0.6], [-1.42, 0.53], [-2.02, 0.5]];
  const out = [...half.map(([x, z]) => new THREE.Vector2(x, z)), ...half.slice().reverse().map(([x, z]) => new THREE.Vector2(x, -z))];
  const fl = new THREE.ExtrudeGeometry(new THREE.Shape(out), { depth: 0.022, bevelEnabled: false, curveSegments: 24 });
  fl.rotateX(Math.PI / 2); fl.translate(0, 0.062, 0);
  add(floor, fl, carbon);
  add(floor, new THREE.BoxGeometry(3.0, 0.012, 0.3).translate(-0.45, 0.03, 0), new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.8 }));
  // floor edge wings and front fences
  [1, -1].forEach((s) => {
    add(floor, new THREE.BoxGeometry(1.5, 0.045, 0.012).translate(-0.3, 0.085, 0.795 * s), carbon);
    [0.34, 0.46, 0.58].forEach((z, i) => add(floor, plate([[0.98 - i * 0.07, 0.06], [0.95 - i * 0.07, 0.15 - i * 0.015], [0.74 - i * 0.05, 0.19 - i * 0.02], [0.66 - i * 0.05, 0.06]], 0.008, z * s), carbon));
  });
  // diffuser: an upswept roof with strakes
  const dz = 0.5, dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.Float32BufferAttribute([-1.5, 0.062, -dz, -1.5, 0.062, dz, -2.18, 0.27, -dz, -2.18, 0.27, dz], 3));
  dg.setIndex([0, 1, 2, 1, 3, 2]); dg.computeVertexNormals();
  add(floor, dg, carbon);
  [-0.5, -0.3, -0.1, 0.1, 0.3, 0.5].forEach((z) => add(floor, plate([[-1.5, 0.04], [-1.5, 0.064], [-2.18, 0.272], [-2.18, 0.05]], 0.008, z), carbon));

  /* --- cockpit: tub opening, headrest, helmet, halo --- */
  const cockpit = part('cockpit', V(0, 0.42, 0));
  const tubHole = add(cockpit, loft([
    { x: 0.62, w: 0.1, y0: 0.5, y1: 0.585, n: 2 }, { x: 0.4, w: 0.2, y0: 0.5, y1: 0.612, n: 2.6 },
    { x: 0.05, w: 0.225, y0: 0.5, y1: 0.63, n: 3 }, { x: -0.22, w: 0.2, y0: 0.5, y1: 0.655, n: 2.6 }, { x: -0.36, w: 0.1, y0: 0.5, y1: 0.66, n: 2 },
  ], { segs: 32, sub: 5 }), matte, false);
  tubHole.name = 'tubHole';
  add(cockpit, loft([{ x: -0.02, w: 0.2, y0: 0.6, y1: 0.7, n: 3 }, { x: -0.2, w: 0.2, y0: 0.6, y1: 0.75, n: 3 }, { x: -0.36, w: 0.15, y0: 0.6, y1: 0.76, n: 2.6 }], { segs: 24, sub: 4 }), carbon);
  const helmet = add(cockpit, new THREE.SphereGeometry(0.128, 40, 28), white);
  helmet.scale.set(1.1, 1, 0.94); helmet.position.set(0.12, 0.72, 0);
  const visor = add(cockpit, new THREE.SphereGeometry(0.131, 40, 20, -1.05, 2.1, 1.12, 0.52), new THREE.MeshPhysicalMaterial({ color: 0x08080a, roughness: 0.08, metalness: 0.9 }), false);
  visor.scale.copy(helmet.scale); visor.position.copy(helmet.position); visor.rotation.y = Math.PI / 2;
  const stripe = add(cockpit, new THREE.TorusGeometry(0.126, 0.012, 8, 40, Math.PI), red, false);
  stripe.scale.set(1.1, 1, 1); stripe.position.copy(helmet.position); stripe.rotation.set(0, 0, 0);
  add(cockpit, new THREE.TorusGeometry(0.13, 0.022, 10, 28).rotateX(Math.PI / 2).rotateZ(-0.5).translate(0.4, 0.6, 0), matte, false); // steering wheel
  // halo: centre pillar plus hoop
  const halo = part('halo', V(0, 0.85, 0));
  const hoop = [V(-0.34, 0.66, 0.262), V(-0.12, 0.735, 0.268), V(0.2, 0.765, 0.235), V(0.47, 0.762, 0.14), V(0.585, 0.752, 0), V(0.47, 0.762, -0.14), V(0.2, 0.765, -0.235), V(-0.12, 0.735, -0.268), V(-0.34, 0.66, -0.262)];
  add(halo, tube(hoop, 0.027, false, 80), carbon);
  add(halo, tube([V(0.585, 0.752, 0), V(0.68, 0.7, 0), V(0.8, 0.59, 0), V(0.86, 0.53, 0)], 0.024, false, 20), carbon);
  [1, -1].forEach((s) => add(halo, new THREE.SphereGeometry(0.03, 12, 10).translate(-0.34, 0.66, 0.262 * s), carbon));

  /* --- front wing: fixed mainplane, two movable flaps per side --- */
  const fw = part('front-wing', V(0.75, 0, 0));
  const sweep = (z) => 0.2 * (Math.abs(z) / 0.94) ** 1.6, lift = (z) => 0.085 * Math.exp(-((z / 0.26) ** 2));
  add(fw, wing(span(-0.94, 0.94, 40), (z) => ({ le: [2.86 - sweep(z), 0.1 + lift(z)], chord: 0.3 - 0.07 * (Math.abs(z) / 0.94), aoa: 5, thick: 0.1 })), carbon);
  const flaps = [];
  [1, -1].forEach((s) => {
    [[0.29, 0.06, 0.2, 17, 2], [0.47, 0.135, 0.165, 29, -4]].forEach(([back, up, chord, aoa, open], k) => {
      const pivot = new THREE.Group();
      const zs = span(0.15 * s, 0.925 * s, 18);
      // geometry is built around the pivot at the flap's mid leading edge
      const px = 2.86 - sweep(0.55) - back, py = 0.1 + up;
      const g = wing(zs, (z) => ({ le: [2.86 - sweep(z) - back - px, 0.1 + lift(z) * 0.4 + up - py + 0.04 * (1 - Math.abs(z) / 0.94) * k], chord: chord * (1 - 0.25 * (1 - Math.abs(z) / 0.94) * k), aoa, thick: 0.09 }));
      const m = new THREE.Mesh(g, k ? white : carbon); m.castShadow = true; pivot.add(m);
      pivot.position.set(px, py, 0); fw.add(pivot);
      flaps.push({ pivot, open: (-(aoa - open) * Math.PI) / 180 });
    });
    // endplate and footplate
    add(fw, plate([[2.69, 0.05], [2.68, 0.15], [2.56, 0.235], [2.2, 0.3], [2.08, 0.27], [2.08, 0.05]], 0.012, 0.946 * s), red);
    add(fw, new THREE.BoxGeometry(0.58, 0.012, 0.09).translate(2.38, 0.05, 0.905 * s), carbon);
    // flap adjuster pods
    add(fw, new THREE.BoxGeometry(0.34, 0.11, 0.01).translate(2.43, 0.2, 0.16 * s), carbon);
  });
  // nose-to-wing pylons
  [0.07, -0.07].forEach((z) => add(fw, plate([[2.74, 0.18], [2.78, 0.245], [2.56, 0.26], [2.58, 0.18]], 0.01, z), carbon));

  /* --- rear wing: fixed mainplane, two movable flaps, endplates, pylon --- */
  const rw = part('rear-wing', V(-0.7, 0.25, 0));
  const RZ = span(-0.56, 0.56, 14);
  add(rw, wing(RZ, () => ({ le: [-2.06, 0.79], chord: 0.3, aoa: 9, thick: 0.12 }), 0.1), carbon);
  [[-2.33, 0.862, 0.17, 27, 3, white], [-2.47, 0.94, 0.13, 46, 5, red]].forEach(([x, y, chord, aoa, open, mat]) => {
    const pivot = new THREE.Group();
    const m = new THREE.Mesh(wing(RZ, () => ({ le: [0, 0], chord, aoa, thick: 0.1 }), 0.09), mat); m.castShadow = true; pivot.add(m);
    pivot.position.set(x, y, 0); rw.add(pivot);
    flaps.push({ pivot, open: (-(aoa - open) * Math.PI) / 180 });
  });
  [1, -1].forEach((s) => {
    add(rw, plate([[-2.0, 0.5], [-1.97, 0.86], [-2.02, 1.005], [-2.62, 1.005], [-2.63, 0.7], [-2.5, 0.46], [-2.32, 0.33], [-2.14, 0.33]], 0.012, 0.572 * s), carbon);
    add(rw, new THREE.BoxGeometry(0.64, 0.05, 0.016).translate(-2.3, 0.985, 0.572 * s), red);
  });
  add(rw, plate([[-1.86, 0.36], [-1.96, 0.36], [-2.2, 0.76], [-2.3, 0.84], [-2.12, 0.84], [-2.02, 0.72]], 0.03), carbon);
  // actuator pod on the mainplane
  add(rw, loft([{ x: -2.1, w: 0.02, y0: 0.82, y1: 0.86 }, { x: -2.3, w: 0.035, y0: 0.86, y1: 0.93 }, { x: -2.5, w: 0.02, y0: 0.95, y1: 0.99 }], { segs: 14, sub: 4 }), carbon);
  // rear crash structure, rain light and exhaust
  const tail = part('tail', V(-0.25, 0, 0));
  add(tail, new THREE.BoxGeometry(0.2, 0.07, 0.09).translate(-2.25, 0.3, 0), carbon);
  const rain = add(tail, new THREE.BoxGeometry(0.02, 0.085, 0.07).translate(-2.36, 0.3, 0), new THREE.MeshStandardMaterial({ color: 0x300008, emissive: RED, emissiveIntensity: 2.4 }), false);
  add(tail, new THREE.CylinderGeometry(0.058, 0.058, 0.3, 24, 1, true).rotateZ(Math.PI / 2).translate(-2.12, 0.415, 0), metal);

  /* --- wheels and suspension --- */
  const wheels = [];
  const mkWheel = (w) => {
    const g = new THREE.Group(), R = 0.36, h = w / 2;
    const prof = [[0.232, -h + 0.02], [0.262, -h + 0.004], [0.31, -h], [0.342, -h + 0.02], [0.358, -h + 0.06], [0.36, -h + 0.11], [0.36, h - 0.11], [0.358, h - 0.06], [0.342, h - 0.02], [0.31, h], [0.262, h - 0.004], [0.232, h - 0.02]];
    const tyre = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, a]) => new THREE.Vector2(r, a)), 72).rotateX(Math.PI / 2), rubber);
    tyre.castShadow = true; g.add(tyre);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.236, 0.236, w - 0.03, 48, 1, true).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1b1c1f, metalness: 0.9, roughness: 0.35, side: THREE.DoubleSide }));
    g.add(rim);
    // outboard wheel cover with a shallow dish, compound ring and wheel nut
    const cov = new THREE.Mesh(new THREE.LatheGeometry([[0.0, 0.05], [0.06, 0.05], [0.07, 0.03], [0.2, 0.012], [0.238, 0.0]].map(([r, a]) => new THREE.Vector2(r, a)), 48).rotateX(Math.PI / 2), carbon);
    cov.position.z = h - 0.035; g.add(cov);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.288, 0.0075, 8, 72), new THREE.MeshBasicMaterial({ color: 0xffd21a }));
    ring.position.z = h - 0.002; g.add(ring);
    const band = new THREE.Mesh(new THREE.RingGeometry(0.214, 0.226, 64), new THREE.MeshBasicMaterial({ color: 0xffd21a, side: THREE.DoubleSide }));
    band.position.z = h - 0.018; g.add(band);
    const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.05, 6).rotateX(Math.PI / 2), metal); nut.position.z = h + 0.005; g.add(nut);
    // inboard brake drum
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.215, w * 0.7, 36).rotateX(Math.PI / 2), carbon); drum.position.z = -h * 0.2; g.add(drum);
    return g;
  };
  const corners = [
    { n: 'fr', x: 1.7, s: 1, w: 0.29, front: true }, { n: 'fl', x: 1.7, s: -1, w: 0.29, front: true },
    { n: 'rr', x: -1.7, s: 1, w: 0.375 }, { n: 'rl', x: -1.7, s: -1, w: 0.375 },
  ];
  corners.forEach((c) => {
    const grp = part('wheel-' + c.n, V(c.front ? 0.12 : -0.12, 0, 0.62 * c.s));
    const zc = c.s * (0.95 - c.w / 2), wh = mkWheel(c.w);
    if (c.s < 0) wh.rotation.y = Math.PI;
    const steer = new THREE.Group(); steer.position.set(c.x, 0.36, zc); steer.add(wh); grp.add(steer);
    wheels.push({ steer, wh, front: !!c.front, s: c.s });
    // suspension lives with the body so it stretches in the exploded view
    const sus = part('sus-' + c.n, V(c.front ? 0.06 : -0.06, 0, 0.3 * c.s));
    const zi = c.s * (0.95 - c.w - 0.02), P = (x, y, z) => V(x, y, z * c.s);
    const arms = c.front
      ? [[V(1.7, 0.5, zi), P(2.0, 0.375, 0.125)], [V(1.7, 0.5, zi), P(1.3, 0.47, 0.2)], [V(1.7, 0.2, zi), P(2.02, 0.19, 0.12)], [V(1.7, 0.2, zi), P(1.25, 0.13, 0.2)],
         [V(1.7, 0.22, zi), P(1.52, 0.46, 0.17)], [V(1.84, 0.4, zi), P(1.84, 0.38, 0.14)]]
      : [[V(-1.7, 0.5, zi), P(-1.3, 0.44, 0.2)], [V(-1.7, 0.5, zi), P(-2.0, 0.34, 0.085)], [V(-1.7, 0.2, zi), P(-1.25, 0.14, 0.22)], [V(-1.7, 0.2, zi), P(-2.02, 0.2, 0.08)],
         [V(-1.7, 0.47, zi), P(-1.5, 0.14, 0.2)]];
    arms.forEach(([a, b], i) => add(sus, blade(a, b, i > 3 ? 0.03 : 0.05), carbon));
    if (!c.front) add(sus, tube([V(-1.7, 0.36, zi), P(-1.7, 0.3, 0.12)], 0.022, false, 4), metal);
    // brake duct scoop
    add(sus, new THREE.BoxGeometry(0.2, 0.3, 0.03).translate(c.x + 0.06, 0.36, zi - 0.01 * c.s), carbon);
  });

  /* --- what's under the skin (x-ray) --- */
  const inner = new THREE.Group(); inner.name = 'inner'; inner.visible = false; car.add(inner);
  const glow = (color) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, roughness: 0.5, transparent: true, opacity: 0.92 });
  const innerParts = {
    fuel: new THREE.Mesh(loft([{ x: -0.36, w: 0.2, y0: 0.1, y1: 0.56, n: 3.5 }, { x: -0.6, w: 0.22, y0: 0.1, y1: 0.56, n: 3.5 }, { x: -0.82, w: 0.2, y0: 0.1, y1: 0.5, n: 3.5 }], { segs: 20, sub: 3 }), glow(0xffb020)),
    battery: new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.11, 0.42).translate(-0.6, 0.085, 0), glow(0x29d3ff)),
    ice: new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.3, 0.34).translate(-1.08, 0.27, 0), glow(RED)),
    turbo: new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.2, 20).rotateZ(Math.PI / 2).translate(-1.36, 0.42, 0), glow(0xff5a36)),
    mguk: new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.26, 20).rotateZ(Math.PI / 2).translate(-0.98, 0.15, -0.13), glow(0x35e08a)),
    gearbox: new THREE.Mesh(loft([{ x: -1.34, w: 0.15, y0: 0.13, y1: 0.4, n: 3 }, { x: -1.7, w: 0.11, y0: 0.16, y1: 0.38, n: 3 }, { x: -2.05, w: 0.06, y0: 0.2, y1: 0.33, n: 3 }], { segs: 16, sub: 3 }), glow(0xb9bcc4)),
  };
  Object.values(innerParts).forEach((m) => inner.add(m));
  [1, -1].forEach((s) => {
    const rad = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.34, 0.03), glow(0x7aa2ff));
    rad.position.set(-0.05, 0.33, 0.5 * s); rad.rotation.set(0, 0.5 * s, 0.25); inner.add(rad);
  });

  car.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  return { car, flaps, wheels, skin, inner, innerParts, rain, parts: car.children.filter((c) => c.userData.explode) };
}

/* ------------------------------------------------------------------ viewer */

const VIEWS = {
  hero: { pos: [4.6, 1.55, 4.9], tgt: [0.1, 0.34, 0] },
  side: { pos: [0.1, 0.9, 7.4], tgt: [0.1, 0.36, 0] },
  front: { pos: [7.2, 1.0, 0.01], tgt: [0, 0.4, 0] },
  rear: { pos: [-6.4, 1.7, 2.6], tgt: [0, 0.42, 0] },
  top: { pos: [0.15, 8.6, 0.01], tgt: [0.15, 0, 0] },
  fw: { pos: [4.7, 1.0, 2.3], tgt: [2.4, 0.2, 0] },
  rw: { pos: [-4.6, 1.5, 2.2], tgt: [-2.2, 0.7, 0] },
  pu: { pos: [-2.4, 2.3, 3.6], tgt: [-0.9, 0.3, 0] },
  ck: { pos: [2.2, 1.9, 2.1], tgt: [0.15, 0.6, 0] },
  ty: { pos: [-3.2, 0.75, 3.3], tgt: [-1.7, 0.36, 0.76] },
  fl: { pos: [1.4, 0.55, 4.2], tgt: [-0.3, 0.15, 0.4] },
};
const ANCHORS = { fw: [2.45, 0.3, 0.6], rw: [-2.3, 1.0, 0], pu: [-1.0, 0.56, 0], ck: [0.25, 0.86, 0], ty: [-1.7, 0.74, 0.76], fl: [-0.4, 0.09, 0.8] };

function mount(el) {
  const variant = el.dataset.car3d || 'explorer';
  const ui = el.closest('[data-car-ui]') || el.parentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    el.classList.add('no-webgl'); return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.85;
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(3.5, 7, 4.5); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 7; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
  scene.add(key);
  const rimL = new THREE.DirectionalLight(0xffd9d2, 0.9); rimL.position.set(-6, 2.5, -5); scene.add(rimL);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.ShadowMaterial({ opacity: 0.55 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // faint floor grid so the car sits on something
  const grid = new THREE.GridHelper(18, 36, 0xffffff, 0xffffff);
  grid.material.transparent = true; grid.material.opacity = 0.055; grid.position.y = 0.001; scene.add(grid);

  const M = buildCar();
  scene.add(M.car);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  const ctl = new OrbitControls(camera, renderer.domElement);
  ctl.enableDamping = true; ctl.dampingFactor = 0.07; ctl.enablePan = false; ctl.enableZoom = false;
  ctl.minPolarAngle = 0.15; ctl.maxPolarAngle = Math.PI / 2 - 0.03;
  ctl.autoRotate = !reduce; ctl.autoRotateSpeed = variant === 'explorer' ? 0.5 : 0.8;
  ctl.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  renderer.domElement.style.touchAction = 'pan-y';
  const start = VIEWS.hero;
  camera.position.set(...start.pos); ctl.target.set(...start.tgt);

  let fit = 1;
  const resize = () => {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the whole car in frame on tall, narrow screens
    fit = Math.max(1, 1.62 / camera.aspect) * (variant === 'teaser' ? 1.02 : w > 900 ? 1.22 : 1);
    // on wide screens the info panel sits on the right, so nudge the car left
    if (variant === 'explorer' && w > 900) camera.setViewOffset(w, h, w * 0.1, -h * 0.04, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(el); resize();

  /* state that eases toward targets */
  const st = { spin: 0, roll: 0, aero: 0, aeroT: 0, xray: 0, xrayT: 0, exp: 0, expT: 0, fly: null, steer: 0, steerT: 0 };
  const flyTo = (name) => {
    const v = VIEWS[name]; if (!v) return;
    st.fly = { p: new THREE.Vector3(...v.pos).multiplyScalar(1), t: new THREE.Vector3(...v.tgt), k: 0 };
    ctl.autoRotate = false;
  };

  /* UI wiring */
  const $$ = (s) => [...ui.querySelectorAll(s)];
  const press = (sel, attr, val) => $$(sel).forEach((b) => b.classList.toggle('is-on', b.dataset[attr] === val));
  $$('[data-view]').forEach((b) => b.addEventListener('click', () => { flyTo(b.dataset.view); press('[data-view]', 'view', b.dataset.view); }));
  $$('[data-aero]').forEach((b) => b.addEventListener('click', () => {
    st.aeroT = b.dataset.aero === 'straight' ? 1 : 0; press('[data-aero]', 'aero', b.dataset.aero);
    ui.dataset.aeroMode = b.dataset.aero;
  }));
  $$('[data-xray]').forEach((b) => b.addEventListener('click', () => {
    st.xrayT = st.xrayT ? 0 : 1; b.classList.toggle('is-on', !!st.xrayT); b.setAttribute('aria-pressed', !!st.xrayT);
    ui.classList.toggle('is-xray', !!st.xrayT);
  }));
  $$('[data-explode]').forEach((r) => r.addEventListener('input', () => { st.expT = +r.value / 100; if (st.expT > 0.02) ctl.autoRotate = false; }));
  $$('[data-spin]').forEach((b) => b.addEventListener('click', () => { ctl.autoRotate = !ctl.autoRotate; b.classList.toggle('is-on', ctl.autoRotate); }));
  const hots = $$('[data-hot]');
  const cards = $$('[data-hotcard]');
  const showHot = (id) => {
    hots.forEach((h) => h.classList.toggle('is-on', h.dataset.hot === id));
    cards.forEach((c) => c.classList.toggle('is-on', c.dataset.hotcard === id));
    flyTo(id); press('[data-view]', 'view', '');
  };
  hots.forEach((h) => h.addEventListener('click', () => showHot(h.dataset.hot)));
  const order = hots.map((h) => h.dataset.hot);
  const stepHot = (d) => { const i = order.indexOf((hots.find((h) => h.classList.contains('is-on')) || hots[0]).dataset.hot); showHot(order[(i + d + order.length) % order.length]); };
  $$('[data-hotnext]').forEach((b) => b.addEventListener('click', () => stepHot(1)));
  $$('[data-hotprev]').forEach((b) => b.addEventListener('click', () => stepHot(-1)));
  ctl.addEventListener('start', () => { st.fly = null; ctl.autoRotate = false; el.classList.add('is-touched'); });
  el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); st.steerT = ((e.clientX - r.left) / r.width - 0.5) * -0.5; });

  /* render loop — paused while off screen */
  let visible = true, last = performance.now();
  new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '100px' }).observe(el);
  const tmp = new THREE.Vector3();
  const ease = (a, b, k) => a + (b - a) * k;
  const frame = (now) => {
    requestAnimationFrame(frame);
    if (!visible) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const k = 1 - Math.exp(-dt * 5);
    st.aero = ease(st.aero, st.aeroT, k); st.xray = ease(st.xray, st.xrayT, k); st.exp = ease(st.exp, st.expT, k); st.steer = ease(st.steer, st.steerT, k);

    M.flaps.forEach((f) => (f.pivot.rotation.z = f.open * st.aero));
    M.parts.forEach((p) => p.position.copy(p.userData.explode).multiplyScalar(st.exp));
    // straight mode: the car is "at speed", so the wheels turn and the floor grid streams past
    st.spin = ease(st.spin, st.aeroT * 26, k * 0.5); st.roll += st.spin * dt;
    M.wheels.forEach((w) => { if (w.front) w.steer.rotation.y = st.steer * (1 - st.aero); w.wh.rotation.z = (w.s > 0 ? -1 : 1) * st.roll; });
    grid.position.x = -((st.roll * 0.36) % 0.5);
    const op = 1 - 0.9 * st.xray;
    M.skin.forEach((m) => { const tr = st.xray > 0.01; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = op; m.depthWrite = st.xray < 0.5; });
    M.inner.visible = st.xray > 0.02;
    M.inner.scale.setScalar(0.96 + 0.04 * st.xray);
    M.rain.material.emissiveIntensity = 1.6 + Math.sin(now / 180) * 1.2;

    if (st.fly) {
      st.fly.k = Math.min(1, st.fly.k + dt * (st.fly.spin ? 0.5 : 1.1));
      const e = 1 - Math.pow(1 - st.fly.k, 3) > 0.999 ? 1 : k * 0.9;
      tmp.copy(st.fly.p).sub(st.fly.t).multiplyScalar(fit).add(st.fly.t);
      camera.position.lerp(tmp, e); ctl.target.lerp(st.fly.t, e);
      if (st.fly.k >= 1 && camera.position.distanceTo(tmp) < 0.05) { if (st.fly.spin && !el.classList.contains('is-touched')) ctl.autoRotate = true; st.fly = null; }
    }
    ctl.update();

    // pin the numbered hotspots to their 3D anchors
    if (hots.length) {
      const w = el.clientWidth, h = el.clientHeight;
      hots.forEach((b) => {
        const a = ANCHORS[b.dataset.hot]; if (!a) return;
        tmp.set(...a).project(camera);
        const behind = tmp.z > 1;
        b.style.transform = `translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px)`;
        b.style.opacity = behind || st.exp > 0.25 ? 0 : 1;
      });
    }
    renderer.render(scene, camera);
  };
  // first frame: frame the car for this aspect ratio
  camera.position.set(-7.5, 4.2, 9.5).sub(ctl.target).multiplyScalar(fit).add(ctl.target);
  if (reduce) camera.position.set(...start.pos).sub(ctl.target).multiplyScalar(fit).add(ctl.target);
  else { flyTo('hero'); st.fly.spin = true; }
  (document.fonts && document.fonts.load ? document.fonts.load('italic 900 100px Archx') : Promise.resolve()).catch(() => {}).then(() => {
    el.classList.add('is-ready');
    requestAnimationFrame(frame);
  });
  el.__car = { st, flyTo, ctl, camera, M };
}

document.querySelectorAll('[data-car3d]').forEach((el) => {
  // build lazily, when the stage is about to scroll into view
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); mount(el); } }, { rootMargin: '400px' });
  io.observe(el);
});
