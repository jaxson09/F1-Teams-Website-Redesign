// VF-26 concept model — an original, code-built 3D car (no downloaded mesh).
// Units are metres. +X is the nose, +Y is up, Z is across the car.
// Every assembly is its own group with a `sys` (system) tag and explode vectors,
// which is what drives x-ray, system focus and the two-stage exploded view.
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const RED = '#d4001f', WHITE = '#f4f2ee', BLACK = '#0b0b0d', YEL = '#ffd21a';
const BIG = Math.min(innerWidth, innerHeight) > 700 && (navigator.hardwareConcurrency || 4) > 4;

/* ------------------------------------------------------------------ helpers */

const cr = (p0, p1, p2, p3, t) => {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};
const KEYS = ['x', 'w', 'y0', 'y1', 'n', 'taper', 'cz', 'flat'];
const DEF = { n: 2.4, taper: 0, cz: 0, flat: 0 };

// Loft a closed skin through cross-sections (superellipses). `taper` narrows the
// top, `flat` narrows the bottom. Each ring is built as a right half and a left
// half with their own UVs, so lettering can be painted readable on both sides.
function loft(sections, { segs = 56, sub = 8, uv, side = 0, arc = 0, lift = 0, xr } = {}) {
  const S = sections.map((s) => ({ ...DEF, ...s }));
  const rings = [];
  for (let i = 0; i < S.length - 1; i++) {
    const a = S[Math.max(0, i - 1)], b = S[i], c = S[i + 1], d = S[Math.min(S.length - 1, i + 2)];
    for (let k = 0; k < sub; k++) {
      const t = k / sub, r = {};
      KEYS.forEach((key) => (r[key] = cr(a[key], b[key], c[key], d[key], t)));
      r.x = b.x + (c.x - b.x) * t;
      rings.push(r);
    }
  }
  rings.push(S[S.length - 1]);
  if (xr) { const keep = rings.filter((r) => r.x <= xr[0] && r.x >= xr[1]); rings.length = 0; rings.push(...keep); }
  const h = segs / 2, row = segs + 2, pos = [], uvs = [], idx = [];
  const ss = (t) => t * t * (3 - 2 * t);
  const put = (r, j, sd) => {
    const th = (j / segs) * Math.PI * 2 - Math.PI / 2;
    const c = Math.cos(th), s = Math.sin(th), e = 2 / Math.max(1.2, r.n);
    const px = Math.sign(c) * Math.abs(c) ** e, py = Math.sign(s) * Math.abs(s) ** e;
    const t = (py + 1) / 2;
    const wf = (1 - r.taper * ss(t)) * (1 - r.flat * ss(1 - t));
    const y = r.y0 + (r.y1 - r.y0) * t, z = r.cz + Math.max(0.001, r.w) * px * wf;
    pos.push(r.x, y + lift, z);
    uvs.push(...(uv ? uv(r.x, y, z, side || sd) : [0, 0]));
  };
  rings.forEach((r) => {
    for (let j = 0; j <= h; j++) put(r, j, 1);
    for (let j = h; j <= segs; j++) put(r, j, -1);
  });
  for (let i = 0; i < rings.length - 1; i++)
    for (let j = 0; j < segs; j++) {
      if (arc && (j < h - arc || j >= h + arc)) continue;
      const a = i * row + j + (j >= h ? 1 : 0), b = a + 1, c = a + row, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  if (!arc) [0, rings.length - 1].forEach((ri, n) => {
    const r = rings[ri], ci = pos.length / 3;
    pos.push(r.x, (r.y0 + r.y1) / 2, r.cz);
    uvs.push(...(uv ? uv(r.x, (r.y0 + r.y1) / 2, r.cz, side || 1) : [0, 0]));
    for (let j = 0; j < segs; j++) {
      const a = ri * row + j + (j >= h ? 1 : 0), b = a + 1;
      n === 0 ? idx.push(ci, b, a) : idx.push(ci, a, b);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // weld the normals across the two centreline seams so the split stays invisible
  const nrm = g.attributes.normal;
  for (let i = 0; i < rings.length; i++)
    [[i * row + h, i * row + h + 1], [i * row, i * row + segs + 1]].forEach(([a, b]) => {
      const x = nrm.getX(a) + nrm.getX(b), y = nrm.getY(a) + nrm.getY(b), z = nrm.getZ(a) + nrm.getZ(b), l = Math.hypot(x, y, z) || 1;
      nrm.setXYZ(a, x / l, y / l, z / l); nrm.setXYZ(b, x / l, y / l, z / l);
    });
  return g;
}

// Aerofoil lofted along the span. f(z) → { le:[x,y], chord, aoa(deg), thick }.
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

function plate(pts, thick, z = 0) {
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1, curveSegments: 16 });
  g.translate(0, 0, z - thick / 2);
  return g;
}
function blade(a, b, wide = 0.05, thin = 0.014) {
  const dir = b.clone().sub(a), len = dir.length();
  const g = new THREE.BoxGeometry(len, thin, wide);
  const X = dir.clone().normalize(), Zp = new THREE.Vector3().crossVectors(X, V(0, 1, 0)).normalize(), Y = new THREE.Vector3().crossVectors(Zp, X);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(X, Y, Zp).setPosition(a.clone().add(b).multiplyScalar(0.5)));
  return g;
}
const tube = (pts, r, seg = 40, closed = false) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed, 'catmullrom', 0.5), seg, r, 10, closed);
// cylinder with its axis along X / Z, centred at a point
const cylX = (r, len, x, y, z, seg = 28, r2 = r) => new THREE.CylinderGeometry(r2, r, len, seg).rotateZ(Math.PI / 2).translate(x, y, z);
const cylZ = (r, len, x, y, z, seg = 28) => new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2).translate(x, y, z);
const cylY = (r, len, x, y, z, seg = 28) => new THREE.CylinderGeometry(r, r, len, seg).translate(x, y, z);
const box = (sx, sy, sz, x, y, z) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z);
const span = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

/* ------------------------------------------------------------------ livery */

// Logos on the car are transparent PNGs cut from a CC BY-SA photograph of the real
// car (see credits). They are drawn into the livery at their real positions.
const DECAL_NAMES = ['haas', 'gr', 'ruckus', 'fix', 'singha', 'zoomex', 'orion', 'playngo'];
const DECALS = {};
const loadDecals = () => Promise.all(DECAL_NAMES.map((n) => new Promise((res) => {
  const im = new Image();
  im.onload = () => { DECALS[n] = im; res(); };
  im.onerror = res;
  im.src = new URL('./img/decals/' + n + '.png', import.meta.url).href;
})));

// Bodywork is painted from the side, like a livery drawing: one canvas, right
// side of the car in the top half and left side in the bottom half.
const LX0 = -2.75, LX1 = 3.25, LY1 = 1.06;
const sideUV = (x, y, z, sd) => [(x - LX0) / (LX1 - LX0), (sd > 0 ? 0.5 : 0) + 0.5 * Math.min(1, Math.max(0, y / LY1))];

function atlas(draw) {
  const W = BIG ? 4096 : 2048, c = document.createElement('canvas');
  c.width = W; c.height = 1024;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  const kx = W / (LX1 - LX0), ky = 512 / LY1;
  const X = (x) => (x - LX0) * kx, Y = (y) => 512 - y * ky;
  [1, -1].forEach((sd) => {
    g.save(); g.translate(0, sd > 0 ? 0 : 512); g.beginPath(); g.rect(0, 0, W, 512); g.clip();
    const poly = (pts, color) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.closePath(); g.fillStyle = color; g.fill(); };
    // A logo, `width` metres wide, centred on (x, y). It reads left to right on both
    // sides of the car; `tilt` (degrees) makes it fall away toward the tail.
    const img = (name, x, y, width, tilt = 0) => {
      const im = DECALS[name]; if (!im) return;
      g.save(); g.translate(X(x), Y(y)); g.scale(kx, ky);
      if (sd < 0) g.scale(-1, 1);
      g.rotate((-sd * tilt * Math.PI) / 180);
      const h = (width * im.height) / im.width;
      g.drawImage(im, -width / 2, -h / 2, width, h);
      g.restore();
    };
    draw({ g, X, Y, poly, img, sd, W });
    g.restore();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// top line of the nose and chassis, used to hang the paint off the real shape
const TOP_LINE = [[3.08, 0.245], [2.95, 0.285], [2.7, 0.36], [2.35, 0.45], [1.95, 0.528], [1.6, 0.585], [1.2, 0.625], [0.85, 0.655], [0.45, 0.665], [-0.76, 0.6]];
const lineY = (L, x) => {
  for (let i = 0; i < L.length - 1; i++) { const [x0, y0] = L[i], [x1, y1] = L[i + 1]; if (x <= x0 && x >= x1) return y0 + ((y1 - y0) * (x0 - x)) / (x0 - x1); }
  return x > L[0][0] ? L[0][1] : L[L.length - 1][1];
};
const topY = (x) => lineY(TOP_LINE, x);

// nose and survival cell: white top, thin red line, carbon sides; behind the front
// axle a white wedge opens up under a thick red band
const tubTexture = () => atlas(({ poly, img }) => {
  poly([[3.3, 0], [3.3, 1.1], [-3, 1.1], [-3, 0]], WHITE);
  const xn = span(3.25, 1.6, 24), back = xn.slice().reverse();
  poly([...xn.map((x) => [x, topY(x) - 0.045]), [1.46, 0.5], [1.3, 0.42], [0.95, 0.33], [-3, 0.3], [-3, 0], [3.25, 0]], BLACK);
  poly([...xn.map((x) => [x, topY(x) - 0.045]), ...back.map((x) => [x, topY(x) - 0.07])], RED);
  const xb = span(1.5, 0.95, 10);
  poly([[1.6, topY(1.6) - 0.058], ...xb.map((x) => [x, topY(x) - 0.02]), ...xb.slice().reverse().map((x) => [x, topY(x) - 0.085])], RED);
  img('orion', 1.13, 0.47, 0.33);
});

// engine cover: red airbox and the big two-colour mark, carbon cooling exit at the back
const coverTexture = () => atlas(({ poly, img }) => {
  poly([[3.3, 0], [3.3, 1.1], [-3, 1.1], [-3, 0]], WHITE);
  poly([[0.2, 1.1], [-0.5, 1.1], [-0.56, 0.8], [-0.4, 0.72], [0.2, 0.72]], RED);
  img('ruckus', -0.17, 0.872, 0.33);
  img('gr', -0.86, 0.7, 0.84, 6.5);
  poly([[-1.74, 0], [-1.56, 0.5], [-1.76, 1.1], [-3, 1.1], [-3, 0]], BLACK);   // carbon cooling exit
});

// sidepod: white flank, red shoulder stripe with cooling gills, team mark, carbon ends
const POD_TOP = [[0.92, 0.615], [0.7, 0.64], [0.4, 0.65], [0.05, 0.645], [-0.4, 0.6], [-0.85, 0.5], [-1.25, 0.37], [-1.6, 0.25], [-1.95, 0.18]];
const podTopY = (x) => lineY(POD_TOP, x);
const podTexture = () => atlas(({ poly, img }) => {
  poly([[3.3, 0], [3.3, 1.1], [-3, 1.1], [-3, 0]], WHITE);
  const xs = span(0.9, -1.3, 44), rev = xs.slice().reverse();
  poly([...xs.map((x) => [x, podTopY(x) - 0.02]), ...rev.map((x) => [x, podTopY(x) - 0.05 - 0.04 * Math.min(1, (0.9 - x) / 1.2)])], RED);
  poly([...xs.map((x) => [x, podTopY(x) - 0.008]), ...rev.map((x) => [x, podTopY(x) - 0.02])], BLACK);
  for (let i = 0; i < 5; i++) { const x = -0.05 - i * 0.095, y = podTopY(x) - 0.098; poly([[x, y], [x - 0.06, y - 0.004], [x - 0.115, y - 0.05], [x - 0.09, y - 0.046]], '#1a1a1c'); }
  img('fix', 0.53, 0.475, 0.135);
  img('haas', -0.15, 0.375, 1.1, 7.6);
  poly([[3.3, 0], [3.3, 0.118], [-3, 0.118], [-3, 0]], BLACK);
  poly([[0.95, 0], [0.95, 0.36], [0.64, 0.3], [0.47, 0.118], [0.47, 0]], BLACK);        // carbon under the inlet
  img('zoomex', 0.74, 0.215, 0.27);
  poly([[-0.82, 0], [-0.9, 0.3], [-0.86, 0.46], [-0.96, 0.62], [-3, 0.62], [-3, 0]], BLACK); // carbon rear
});

// a logo as a flat panel, for wing endplates
function decalPlane(name, width) {
  const im = DECALS[name];
  if (!im) return new THREE.Group();
  const t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true;
  return new THREE.Mesh(new THREE.PlaneGeometry(width, (width * im.height) / im.width), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }));
}

function labelTexture(lines, bg, w = 512, h = 256) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach(([t, px, col, y, italic]) => {
    g.font = `${italic ? 'italic ' : ''}900 ${px}px "Archx", "Arial Black", sans-serif`;
    try { g.fontStretch = 'extra-expanded'; } catch (e) {}
    g.fillStyle = col; g.fillText(t, w / 2, y);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// Tyre sidewall markings in the yellow of the medium compound, drawn on a disc
// whose radius is RT metres and wrapped onto the sidewall itself.
const RT = 0.356;
function sidewallTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const g = c.getContext('2d'); g.translate(512, 512);
  const px = (m) => (m / RT) * 512, mid = px(0.289);
  const word = (txt, a0, size, gap, slant) => {
    g.font = '900 ' + size + 'px "Archx", "Arial Black", sans-serif'; g.fillStyle = YEL; g.textAlign = 'center'; g.textBaseline = 'middle';
    [...txt].forEach((ch, i) => { g.save(); g.rotate(a0 + (i - (txt.length - 1) / 2) * gap); g.translate(0, -mid); if (slant) g.transform(1, 0, -0.22, 1, 0, 0); g.scale(1.18, 1); g.fillText(ch, 0, 0); g.restore(); });
  };
  const hatch = (a0, n, dir) => { g.strokeStyle = YEL; g.lineWidth = px(0.034); for (let i = 0; i < n; i++) { const a = a0 + dir * i * 0.034 - Math.PI / 2; g.beginPath(); g.arc(0, 0, mid, a, a + 0.016); g.stroke(); } };
  [0, Math.PI].forEach((o) => { word('P ZERO', o, px(0.04), 0.118, true); hatch(o + 0.42, 7, 1); hatch(o - 0.42 - 0.016, 7, -1); });
  [Math.PI / 2, -Math.PI / 2].forEach((o) => word('PIRELLI', o, px(0.027), 0.074, false));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/* ------------------------------------------------------------------ the car */

export function buildCar() {
  const car = new THREE.Group();
  const phys = (o) => new THREE.MeshPhysicalMaterial({ roughness: 0.32, metalness: 0.04, clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.DoubleSide, ...o });
  const std = (o) => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, ...o });
  const mat = {
    tub: phys({ map: tubTexture() }), cover: phys({ map: coverTexture() }), pod: phys({ map: podTexture() }),
    white: phys({ color: 0xf4f2ee }), red: phys({ color: 0xd4001f }),
    carbon: new THREE.MeshPhysicalMaterial({ color: 0x111113, roughness: 0.4, metalness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.28, side: THREE.DoubleSide }),
    matte: std({ color: 0x050506, roughness: 0.96 }),
    rubber: new THREE.MeshPhysicalMaterial({ color: 0x0e0e0f, roughness: 0.62, metalness: 0, clearcoat: 0.16, clearcoatRoughness: 0.55, side: THREE.DoubleSide }),
    gloss: phys({ color: 0x0b0b0d }),
    tread: std({ color: 0x101011, roughness: 0.62 }),
    alu: std({ color: 0xa9adb3, roughness: 0.36, metalness: 0.95 }), darkAlu: std({ color: 0x4a4d52, roughness: 0.45, metalness: 0.9 }),
    steel: std({ color: 0xd0d3d8, roughness: 0.2, metalness: 1 }), inconel: std({ color: 0x9a6b3f, roughness: 0.34, metalness: 1 }),
    titan: std({ color: 0x6d6f76, roughness: 0.3, metalness: 1 }), gold: std({ color: 0xc8a24a, roughness: 0.3, metalness: 1 }),
    redCrackle: std({ color: 0xa80c18, roughness: 0.6, metalness: 0.2 }), hv: std({ color: 0xff7a00, roughness: 0.5 }),
    cell: std({ color: 0x1c1d20, roughness: 0.75 }), blue: std({ color: 0x1c5fd0, roughness: 0.35, metalness: 0.8 }),
    yellow: std({ color: 0xd8f000, roughness: 0.45 }), rim: new THREE.MeshPhysicalMaterial({ color: 0x0b0b0c, roughness: 0.3, metalness: 0.55, clearcoat: 0.6, clearcoatRoughness: 0.25, side: THREE.DoubleSide }),
    disc: std({ color: 0x1b1b1d, roughness: 0.65, metalness: 0.3 }),
  };

  const parts = [];
  // sys = which system the assembly belongs to; e1 = first-stage explode; e2 = second stage; skin = fades in x-ray
  const part = (name, sys, e1 = [0, 0, 0], e2 = [0, 0, 0], skin = false) => {
    const g = new THREE.Group(); g.name = name;
    Object.assign(g.userData, { sys, e1: V(...e1), e2: V(...e2), skin, op: 1 });
    car.add(g); parts.push(g); return g;
  };
  const add = (grp, geo, m, shadow = true) => { const mesh = new THREE.Mesh(geo, m); mesh.castShadow = shadow; mesh.receiveShadow = true; grp.add(mesh); return mesh; };

  /* ================= bodywork ================= */

  // Heights follow the real car: the chassis top sits around 0.6 m at the front axle
  // and the nose falls away to a low, wide tip that carries the front wing.
  const NOSE = [
    { x: 3.08, w: 0.075, y0: 0.2, y1: 0.245, n: 2.8 },
    { x: 2.95, w: 0.118, y0: 0.19, y1: 0.285, n: 3 },
    { x: 2.7, w: 0.142, y0: 0.2, y1: 0.36, n: 3.1 },
    { x: 2.35, w: 0.156, y0: 0.226, y1: 0.45, n: 3.1 },
    { x: 1.95, w: 0.162, y0: 0.262, y1: 0.528, n: 3.1 },
  ];
  const TUB = [
    { x: 1.95, w: 0.162, y0: 0.262, y1: 0.528, n: 3.1 },
    { x: 1.6, w: 0.192, y0: 0.205, y1: 0.585, n: 3.1, taper: 0.06 },
    { x: 1.2, w: 0.245, y0: 0.12, y1: 0.625, n: 3.2, taper: 0.12 },
    { x: 0.85, w: 0.29, y0: 0.07, y1: 0.655, n: 3.3, taper: 0.18 },
    { x: 0.45, w: 0.31, y0: 0.05, y1: 0.665, n: 3.3, taper: 0.22 },
    { x: 0.05, w: 0.315, y0: 0.05, y1: 0.67, n: 3.1, taper: 0.28 },
    { x: -0.3, w: 0.305, y0: 0.05, y1: 0.66, n: 2.9, taper: 0.34 },
    { x: -0.76, w: 0.29, y0: 0.055, y1: 0.6, n: 2.9, taper: 0.36 },
  ];
  const nose = part('nose', 'cell', [0.5, 0, 0], [0.25, 0, 0], true);
  add(nose, loft(NOSE, { uv: sideUV, sub: 6 }), mat.tub);
  add(nose, tube([V(2.5, 0.4, 0), V(2.5, 0.54, 0)], 0.003, 2), mat.matte, false); // pitot

  const tub = part('tub', 'cell', [0, 0, 0], [0, 0, 0], true);
  add(tub, loft(TUB, { uv: sideUV }), mat.tub);
  add(tub, loft(TUB, { arc: 4, lift: 0.003, xr: [1.7, 0.88] }), mat.gloss, false);  // black panel ahead of the cockpit
  const noseNo = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.11), new THREE.MeshBasicMaterial({ map: labelTexture([['87', 190, BLACK, 132, true]]), transparent: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  noseNo.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); noseNo.rotateX(-0.16); noseNo.position.set(1.84, 0.551, 0); tub.add(noseNo);
  // The cockpit sits well forward: the helmet is about 1.35 m behind the front axle.
  const CK = 0.22;
  add(tub, loft([{ x: 0.62, w: 0.1, y0: 0.56, y1: 0.65, n: 2 }, { x: 0.4, w: 0.2, y0: 0.56, y1: 0.676, n: 2.6 }, { x: 0.05, w: 0.225, y0: 0.56, y1: 0.69, n: 3 }, { x: -0.22, w: 0.2, y0: 0.56, y1: 0.69, n: 2.6 }, { x: -0.34, w: 0.1, y0: 0.56, y1: 0.685, n: 2 }], { segs: 32, sub: 5 }).translate(CK, 0, 0), mat.matte, false);
  const driver = part('driver', 'cell', [0, 0.25, 0], [0, 0.2, 0]);
  const drv = new THREE.Group(); drv.position.x = CK; driver.add(drv);
  add(drv, loft([{ x: -0.02, w: 0.2, y0: 0.66, y1: 0.77, n: 3 }, { x: -0.2, w: 0.2, y0: 0.66, y1: 0.82, n: 3 }, { x: -0.34, w: 0.15, y0: 0.66, y1: 0.83, n: 2.6 }], { segs: 24, sub: 4 }), mat.carbon);
  add(drv, loft([{ x: 0.5, w: 0.16, y0: 0.14, y1: 0.32, n: 3 }, { x: 0.2, w: 0.19, y0: 0.12, y1: 0.46, n: 3 }, { x: -0.1, w: 0.2, y0: 0.12, y1: 0.65, n: 3 }, { x: -0.24, w: 0.18, y0: 0.3, y1: 0.72, n: 3 }], { segs: 20, sub: 4 }), mat.cell); // seat shell
  const helmet = add(drv, new THREE.SphereGeometry(0.128, 40, 28), phys({ color: 0x1d4fb8 }));
  helmet.scale.set(1.1, 1, 0.94); helmet.position.set(0.12, 0.795, 0);
  const cap = add(drv, new THREE.SphereGeometry(0.1295, 40, 16, 0, Math.PI * 2, 0, 0.95), mat.yellow, false);
  cap.scale.copy(helmet.scale); cap.position.copy(helmet.position);
  const visor = add(drv, new THREE.SphereGeometry(0.131, 40, 20, -1.05, 2.1, 1.14, 0.5), new THREE.MeshPhysicalMaterial({ color: 0x08080a, roughness: 0.08, metalness: 0.9 }), false);
  visor.scale.copy(helmet.scale); visor.position.copy(helmet.position); visor.rotation.y = Math.PI / 2;
  add(drv, new THREE.TorusGeometry(0.125, 0.02, 10, 28).rotateX(Math.PI / 2).rotateZ(-0.5).translate(0.4, 0.665, 0), mat.matte, false);

  // halo — painted white on this car
  const halo = part('halo', 'cell', [0, 0.5, 0], [0, 0.25, 0]);
  const hl = new THREE.Group(); hl.position.x = CK; halo.add(hl);
  const hoop = [V(-0.34, 0.735, 0.266), V(-0.12, 0.815, 0.27), V(0.2, 0.848, 0.237), V(0.47, 0.846, 0.14), V(0.585, 0.836, 0), V(0.47, 0.846, -0.14), V(0.2, 0.848, -0.237), V(-0.12, 0.815, -0.27), V(-0.34, 0.735, -0.266)];
  add(hl, tube(hoop, 0.027, 80), mat.white);
  add(hl, tube([V(0.585, 0.836, 0), V(0.68, 0.79, 0), V(0.8, 0.68, 0), V(0.86, 0.625, 0)], 0.024, 20), mat.white);
  [1, -1].forEach((s) => add(hl, new THREE.SphereGeometry(0.03, 12, 10).translate(-0.34, 0.735, 0.266 * s), mat.white));

  // engine cover and airbox: one big panel that lifts off
  const cover = part('cover', 'aero', [-0.05, 0.62, 0], [0, 0.55, 0], true);
  add(cover, loft([
    { x: 0.07, w: 0.115, y0: 0.66, y1: 0.945, n: 2.4, taper: 0.22 },
    { x: -0.12, w: 0.17, y0: 0.62, y1: 0.97, n: 2.5, taper: 0.4 },
    { x: -0.42, w: 0.26, y0: 0.5, y1: 0.955, n: 2.6, taper: 0.6 },
    { x: -0.76, w: 0.3, y0: 0.42, y1: 0.9, n: 2.7, taper: 0.64 },
    { x: -1.1, w: 0.295, y0: 0.33, y1: 0.82, n: 2.8, taper: 0.62 },
    { x: -1.45, w: 0.265, y0: 0.28, y1: 0.71, n: 2.7, taper: 0.56 },
    { x: -1.8, w: 0.18, y0: 0.28, y1: 0.58, n: 2.4, taper: 0.45 },
    { x: -2.12, w: 0.085, y0: 0.3, y1: 0.44, n: 2.2, taper: 0.3 },
  ], { segs: 56, uv: sideUV }), mat.cover);
  const mouth = add(cover, new THREE.CircleGeometry(1, 40), mat.matte, false);
  mouth.scale.set(0.095, 0.13, 1); mouth.rotation.y = Math.PI / 2; mouth.position.set(0.074, 0.81, 0);
  add(cover, plate([[-0.62, 0.93], [-1.9, 0.64], [-1.96, 0.5], [-1.4, 0.64], [-0.62, 0.84]], 0.012), mat.carbon); // shark fin
  [1, -1].forEach((s) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.13), new THREE.MeshBasicMaterial({ map: labelTexture([['87', 190, WHITE, 132, true]]), transparent: true, toneMapped: false }));
    m.position.set(-1.64, 0.66, s * 0.0115); m.rotation.y = s > 0 ? 0 : Math.PI; cover.add(m);
  });
  // onboard camera pod — fluorescent yellow on the second car
  add(cover, loft([{ x: 0.0, w: 0.012, y0: 0.99, y1: 1.005 }, { x: -0.08, w: 0.03, y0: 0.98, y1: 1.017 }, { x: -0.2, w: 0.012, y0: 0.99, y1: 1.005 }], { segs: 16, sub: 4 }), mat.yellow);
  [0.11, -0.11].forEach((z) => add(cover, box(0.1, 0.012, 0.09, -0.08, 0.997, z), mat.yellow));

  // sidepods
  [1, -1].forEach((s) => {
    const g = part(s > 0 ? 'pod-r' : 'pod-l', 'aero', [0, 0.08, 0.62 * s], [0, 0, 0.3 * s], true);
    add(g, loft([
      { x: 0.92, cz: 0.5 * s, w: 0.19, y0: 0.41, y1: 0.615, n: 3.6 },
      { x: 0.7, cz: 0.51 * s, w: 0.215, y0: 0.33, y1: 0.64, n: 3.4, flat: 0.2 },
      { x: 0.4, cz: 0.525 * s, w: 0.24, y0: 0.2, y1: 0.65, n: 3.2, flat: 0.38 },
      { x: 0.05, cz: 0.53 * s, w: 0.25, y0: 0.15, y1: 0.645, n: 3, flat: 0.42 },
      { x: -0.4, cz: 0.5 * s, w: 0.255, y0: 0.085, y1: 0.6, n: 2.8, flat: 0.4 },
      { x: -0.85, cz: 0.42 * s, w: 0.225, y0: 0.075, y1: 0.5, n: 2.6, flat: 0.3 },
      { x: -1.25, cz: 0.32 * s, w: 0.18, y0: 0.075, y1: 0.37, n: 2.5, flat: 0.2 },
      { x: -1.6, cz: 0.22 * s, w: 0.125, y0: 0.08, y1: 0.25, n: 2.4 },
      { x: -1.95, cz: 0.14 * s, w: 0.07, y0: 0.09, y1: 0.18, n: 2.2 },
    ], { segs: 44, uv: sideUV, side: s }), mat.pod);
    const inlet = add(g, new THREE.CircleGeometry(1, 32), mat.matte, false);
    inlet.scale.set(0.162, 0.078, 1); inlet.rotation.y = Math.PI / 2; inlet.position.set(0.924, 0.515, 0.5 * s);
    add(g, box(0.05, 0.055, 0.16, 0.86, 0.735, 0.55 * s), mat.carbon);
    add(g, blade(V(0.84, 0.65, 0.33 * s), V(0.86, 0.72, 0.5 * s), 0.03, 0.01), mat.white);
  });

  // floor, plank, edge wings, diffuser
  const floor = part('floor', 'aero', [0, -0.3, 0], [0, -0.08, 0]);
  const half = [[1.08, 0.24], [1.0, 0.56], [0.72, 0.74], [0.2, 0.79], [-0.9, 0.8], [-1.3, 0.76], [-1.36, 0.6], [-1.42, 0.53], [-2.02, 0.5]];
  const outl = [...half.map(([x, z]) => new THREE.Vector2(x, z)), ...half.slice().reverse().map(([x, z]) => new THREE.Vector2(x, -z))];
  add(floor, new THREE.ExtrudeGeometry(new THREE.Shape(outl), { depth: 0.022, bevelEnabled: false, curveSegments: 24 }).rotateX(Math.PI / 2).translate(0, 0.062, 0), mat.carbon);
  add(floor, box(3.0, 0.012, 0.3, -0.45, 0.03, 0), std({ color: 0x3a2a1c, roughness: 0.8 }));
  [1, -1].forEach((s) => {
    add(floor, box(1.5, 0.045, 0.012, -0.3, 0.085, 0.795 * s), mat.carbon);
    [0.34, 0.46, 0.58].forEach((z, i) => add(floor, plate([[0.98 - i * 0.07, 0.06], [0.95 - i * 0.07, 0.15 - i * 0.015], [0.74 - i * 0.05, 0.19 - i * 0.02], [0.66 - i * 0.05, 0.06]], 0.008, z * s), mat.carbon));
  });
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.Float32BufferAttribute([-1.5, 0.062, -0.5, -1.5, 0.062, 0.5, -2.18, 0.27, -0.5, -2.18, 0.27, 0.5], 3));
  dg.setIndex([0, 1, 2, 1, 3, 2]); dg.computeVertexNormals();
  add(floor, dg, mat.carbon);
  [-0.5, -0.3, -0.1, 0.1, 0.3, 0.5].forEach((z) => add(floor, plate([[-1.5, 0.04], [-1.5, 0.064], [-2.18, 0.272], [-2.18, 0.05]], 0.008, z), mat.carbon));

  /* ================= wings (with movable flaps) ================= */

  const flaps = [];
  // Front wing, measured from side-on photos: the tip of the nose sits about 1.38 m
  // ahead of the front axle, the endplates about 0.5 to 1.05 m ahead of it.
  const fw = part('front-wing', 'aero', [1.0, 0, 0], [0.3, 0, 0]);
  const FWS = 0.875, LE = 3.06, FY = 0.075;
  const sweep = (z) => 0.31 * (Math.abs(z) / FWS) ** 1.5;
  const lift = (z) => 0.03 * Math.exp(-((z / 0.22) ** 2)) + 0.03 * (Math.abs(z) / FWS) ** 2;
  add(fw, wing(span(-FWS, FWS, 40), (z) => ({ le: [LE - sweep(z), FY + lift(z)], chord: 0.25 - 0.05 * (Math.abs(z) / FWS), aoa: 4, thick: 0.1 })), mat.carbon);
  [1, -1].forEach((s) => {
    [[0.2, 0.05, 0.19, 16, 3], [0.36, 0.115, 0.17, 28, 5]].forEach(([back, up, chord, aoa, open], k) => {
      const pivot = new THREE.Group(), px = LE - sweep(0.5) - back, py = FY + up;
      const mk = (za, zb, m) => {
        const geo = wing(span(za * s, zb * s, 10), (z) => ({ le: [LE - sweep(z) - back - px, FY + lift(z) + up - py], chord: chord * (0.8 + 0.2 * (Math.abs(z) / FWS)), aoa, thick: 0.09 }));
        const me = new THREE.Mesh(geo, m); me.castShadow = true; pivot.add(me);
      };
      // upper flap: white inboard, red outboard, as on the real car
      if (k) { mk(0.15, 0.47, mat.white); mk(0.47, FWS - 0.006, mat.red); } else mk(0.15, FWS - 0.006, mat.white);
      pivot.position.set(px, py, 0); fw.add(pivot);
      flaps.push({ pivot, open: ((aoa - open) * Math.PI) / 180 }); // straight mode drops the trailing edge
    });
    add(fw, plate([[2.76, 0.14], [2.75, 0.36], [2.5, 0.395], [2.2, 0.41], [2.19, 0.14]], 0.012, FWS * s), mat.white);             // endplate
    add(fw, plate([[2.32, 0.14], [2.2, 0.37], [2.1, 0.14]], 0.006, (FWS + 0.008) * s), mat.red);                                   // red wedge at its trailing edge
    add(fw, box(0.68, 0.014, 0.13, 2.44, 0.125, (FWS - 0.02) * s), mat.carbon);                                                    // footplate
    add(fw, wing(span(FWS * s, 0.95 * s, 2), () => ({ le: [2.7, 0.3], chord: 0.34, aoa: 6, thick: 0.07 })), mat.carbon);             // dive plane
  });
  [0.07, -0.07].forEach((z) => add(fw, plate([[3.0, 0.115], [3.02, 0.2], [2.8, 0.215], [2.82, 0.115]], 0.01, z), mat.carbon));      // nose pylons
  add(fw, cylX(0.022, 0.2, 2.74, 0.17, 0, 14), mat.titan);                     // flap actuator under the nose
  [1, -1].forEach((s) => add(fw, cylZ(0.008, 0.16, 2.66, 0.175, 0.1 * s, 8), mat.steel)); // its pushrods to the flaps

  const rw = part('rear-wing', 'aero', [-0.75, 0.3, 0], [-0.3, 0.1, 0]);
  const RZ = span(-0.54, 0.54, 14);
  add(rw, wing(RZ, () => ({ le: [-2.06, 0.735], chord: 0.3, aoa: 9, thick: 0.12 }), 0.1), mat.red);
  // Each flap hinges at its trailing edge: in straight mode the leading edge lifts
  // and a gap opens between the elements, as on the 2026 cars.
  [[-2.33, 0.805, 0.17, 27, 4, mat.red], [-2.47, 0.878, 0.13, 46, 6, mat.carbon]].forEach(([x, y, chord, aoa, open, m]) => {
    const a = (aoa * Math.PI) / 180, pivot = new THREE.Group();
    const me = new THREE.Mesh(wing(RZ, () => ({ le: [chord * Math.cos(a), -chord * Math.sin(a)], chord, aoa, thick: 0.1 }), 0.09), m); me.castShadow = true; pivot.add(me);
    pivot.position.set(x - chord * Math.cos(a), y + chord * Math.sin(a), 0); rw.add(pivot);
    flaps.push({ pivot, open: ((aoa - open) * Math.PI) / 180 });
  });
  [1, -1].forEach((s) => {
    const EP = [[-2.0, 0.46], [-1.97, 0.8], [-2.02, 0.95], [-2.64, 0.95], [-2.65, 0.5], [-2.56, 0.36], [-2.14, 0.33]];
    add(rw, plate(EP, 0.012, 0.552 * s), mat.carbon);
    add(rw, plate([[-2.17, 0.37], [-2.15, 0.77], [-2.615, 0.77], [-2.625, 0.5], [-2.545, 0.38]], 0.004, 0.561 * s), mat.white); // painted outer panel
    [['playngo', 0.3, 0.685], ['singha', 0.2, 0.51]].forEach(([name, wd, y]) => {
      const lab = decalPlane(name, wd);
      lab.position.set(-2.39, y, 0.569 * s); lab.rotation.y = s > 0 ? 0 : Math.PI; rw.add(lab);
    });
  });
  add(rw, plate([[-1.86, 0.36], [-1.96, 0.36], [-2.2, 0.7], [-2.3, 0.78], [-2.12, 0.78], [-2.02, 0.66]], 0.03), mat.carbon); // swan-neck pylon
  add(rw, loft([{ x: -2.12, w: 0.02, y0: 0.77, y1: 0.81 }, { x: -2.3, w: 0.034, y0: 0.8, y1: 0.87 }, { x: -2.46, w: 0.02, y0: 0.87, y1: 0.91 }], { segs: 14, sub: 4 }), mat.carbon);   // flap actuator pod

  /* ================= power unit ================= */
  // A 90° V6 seen from outside: crankcase, two banks with cam covers and coil
  // packs, carbon plenum with six trumpets, exhaust primaries into one turbo.

  const block = part('pu-block', 'pu', [0, 0, 0], [0, 0, 0]);
  add(block, box(0.54, 0.13, 0.32, -1.05, 0.125, 0), mat.alu);            // crankcase and sump
  add(block, box(0.5, 0.05, 0.36, -1.05, 0.21, 0), mat.darkAlu);          // deck
  add(block, box(0.03, 0.26, 0.3, -0.795, 0.2, 0), mat.darkAlu);          // front cover
  add(block, cylX(0.09, 0.05, -1.335, 0.14, 0), mat.titan);               // flywheel housing
  for (let i = 0; i < 4; i++) add(block, box(0.012, 0.12, 0.33, -0.86 - i * 0.13, 0.125, 0), mat.darkAlu); // main-bearing ribs
  add(block, cylX(0.035, 0.07, -0.76, 0.14, 0.1), mat.steel);             // water pump
  add(block, cylX(0.03, 0.07, -0.76, 0.14, -0.1), mat.gold);              // oil pump

  [1, -1].forEach((s) => {
    const bank = part(s > 0 ? 'pu-bank-r' : 'pu-bank-l', 'pu', [0, 0, 0], [0, 0.2, 0.34 * s]);
    const tilt = new THREE.Group(); tilt.position.set(-1.05, 0.2, 0.06 * s); tilt.rotation.x = (Math.PI / 4) * s; bank.add(tilt);
    const put = (geo, m) => { const me = new THREE.Mesh(geo, m); me.castShadow = true; tilt.add(me); return me; };
    put(box(0.5, 0.16, 0.14, 0, 0.1, 0), mat.alu);                        // cylinder bank
    put(box(0.5, 0.05, 0.16, 0, 0.2, 0), mat.darkAlu);                    // cylinder head
    put(box(0.5, 0.035, 0.165, 0, 0.243, 0), mat.redCrackle);             // cam cover
    for (let i = 0; i < 3; i++) {
      const x = -0.165 + i * 0.165;
      put(cylY(0.022, 0.05, x, 0.28, 0, 14), mat.matte);                  // coil pack
      put(cylY(0.012, 0.03, x, 0.31, 0, 10), mat.hv);
      for (let k = 0; k < 3; k++) put(box(0.004, 0.16, 0.146, x - 0.07 + k * 0.07, 0.1, 0), mat.darkAlu); // fins between cylinders
      put(cylZ(0.03, 0.03, x, 0.16, -0.085 * s, 16), mat.steel);          // exhaust port flange (outboard)
    }
    put(cylX(0.012, 0.5, 0, 0.215, 0.09 * s, 10), mat.gold);              // fuel rail (inboard)
    // exhaust primaries: three pipes from the head, out and back into a collector
    const ex = part(s > 0 ? 'pu-exh-r' : 'pu-exh-l', 'pu', [0, 0, 0], [-0.08, 0.06, 0.56 * s]);
    for (let i = 0; i < 3; i++) {
      const x = -0.885 - i * 0.165;
      add(ex, tube([V(x, 0.345, 0.225 * s), V(x - 0.02, 0.335, 0.252 * s), V(x - 0.1, 0.325, 0.255 * s), V(-1.32 - 0.01 * i, 0.34 + 0.012 * i, 0.2 * s), V(-1.4, 0.38, 0.14 * s)], 0.02, 28), mat.inconel);
    }
    add(ex, tube([V(-1.4, 0.38, 0.14 * s), V(-1.44, 0.42, 0.09 * s), V(-1.47, 0.45, 0.045 * s)], 0.032, 14), mat.inconel);
  });

  const plenum = part('pu-plenum', 'pu', [0, 0, 0], [0, 0.48, 0]);
  add(plenum, loft([{ x: -0.82, w: 0.09, y0: 0.47, y1: 0.56, n: 3 }, { x: -0.95, w: 0.115, y0: 0.46, y1: 0.6, n: 3 }, { x: -1.15, w: 0.115, y0: 0.46, y1: 0.6, n: 3 }, { x: -1.27, w: 0.08, y0: 0.47, y1: 0.56, n: 3 }], { segs: 24, sub: 4 }), mat.carbon);
  [1, -1].forEach((s) => { for (let i = 0; i < 3; i++) add(plenum, tube([V(-0.885 - i * 0.165, 0.475, 0.06 * s), V(-0.885 - i * 0.165, 0.43, 0.085 * s), V(-0.885 - i * 0.165, 0.395, 0.12 * s)], 0.026, 8), mat.alu); });
  add(plenum, tube([V(-0.82, 0.52, 0), V(-0.6, 0.62, 0), V(-0.3, 0.74, 0), V(-0.05, 0.78, 0)], 0.05, 20), mat.carbon); // airbox duct
  add(plenum, cylX(0.045, 0.03, -0.81, 0.515, 0, 20), mat.gold);          // throttle body

  const turbo = part('pu-turbo', 'pu', [0, 0, 0], [-0.42, 0.34, 0]);
  add(turbo, cylX(0.095, 0.085, -1.5, 0.45, 0, 32), mat.inconel);         // turbine housing
  add(turbo, new THREE.TorusGeometry(0.075, 0.03, 12, 28).rotateY(Math.PI / 2).translate(-1.5, 0.45, 0), mat.inconel);
  add(turbo, cylX(0.03, 0.09, -1.415, 0.45, 0, 16), mat.steel);           // shaft and bearing housing
  add(turbo, cylX(0.085, 0.07, -1.35, 0.45, 0, 32), mat.alu);             // compressor housing
  add(turbo, new THREE.TorusGeometry(0.07, 0.026, 12, 28).rotateY(Math.PI / 2).translate(-1.35, 0.45, 0), mat.alu);
  add(turbo, cylX(0.04, 0.05, -1.3, 0.45, 0, 20), mat.blue);              // compressor inlet
  add(turbo, tube([V(-1.5, 0.45, 0), V(-1.66, 0.45, 0), V(-1.9, 0.43, 0), V(-2.16, 0.415, 0)], 0.052, 24), mat.inconel); // tailpipe
  add(turbo, tube([V(-1.5, 0.54, 0), V(-1.56, 0.6, 0.03), V(-1.7, 0.58, 0.06), V(-1.9, 0.5, 0.07)], 0.016, 16), mat.inconel); // wastegate pipe

  const oil = part('pu-oil', 'pu', [0, 0, 0], [0.02, 0.62, 0]);
  add(oil, cylY(0.07, 0.24, -0.71, 0.36, 0, 24), mat.titan);
  add(oil, cylY(0.03, 0.03, -0.71, 0.495, 0, 16), mat.gold);

  /* ================= hybrid system ================= */

  const mguk = part('ers-mguk', 'ers', [0, 0, 0], [0, 0, -0.62]);
  add(mguk, cylX(0.07, 0.24, -0.98, 0.13, -0.235, 28), mat.titan);
  for (let i = 0; i < 6; i++) add(mguk, cylX(0.074, 0.008, -0.88 - i * 0.04, 0.13, -0.235, 28), mat.darkAlu); // cooling fins
  add(mguk, cylX(0.03, 0.05, -1.125, 0.13, -0.235, 16), mat.steel);
  const es = part('ers-store', 'ers', [0, 0, 0], [0.1, 0, 0.9]);
  add(es, box(0.44, 0.1, 0.4, -0.5, 0.11, 0), mat.cell);
  for (let i = 0; i < 6; i++) add(es, box(0.05, 0.012, 0.36, -0.68 + i * 0.072, 0.166, 0), mat.darkAlu); // module lids
  add(es, box(0.06, 0.03, 0.08, -0.3, 0.17, 0.12), mat.hv);
  const ce = part('ers-ce', 'ers', [0, 0, 0], [0.1, 0.2, -0.95]);
  add(ce, box(0.24, 0.07, 0.16, -0.1, 0.12, -0.42), mat.darkAlu);
  for (let i = 0; i < 8; i++) add(ce, box(0.24, 0.02, 0.006, -0.1, 0.165, -0.49 + i * 0.02), mat.alu); // heatsink
  const hv = part('ers-hv', 'ers', [0, 0, 0], [0, 0, 0]);
  add(hv, tube([V(-0.3, 0.17, 0.12), V(-0.5, 0.2, 0.0), V(-0.74, 0.2, -0.16), V(-0.86, 0.15, -0.235)], 0.011, 24), mat.hv);
  add(hv, tube([V(-0.3, 0.17, 0.1), V(-0.2, 0.2, -0.1), V(-0.12, 0.16, -0.36)], 0.011, 20), mat.hv);

  /* ================= fuel, cooling ================= */

  const fuel = part('fuel-cell', 'fuel', [0, 0, 0], [0, 0.78, 0]);
  add(fuel, loft([{ x: -0.3, w: 0.2, y0: 0.18, y1: 0.5, n: 3.4 }, { x: -0.42, w: 0.245, y0: 0.17, y1: 0.555, n: 3.4 }, { x: -0.62, w: 0.245, y0: 0.17, y1: 0.555, n: 3.4 }, { x: -0.74, w: 0.2, y0: 0.18, y1: 0.5, n: 3.4 }], { segs: 28, sub: 4 }), mat.cell);
  add(fuel, cylY(0.035, 0.03, -0.52, 0.565, 0, 16), mat.gold);            // filler
  add(fuel, cylY(0.022, 0.2, -0.6, 0.3, 0.14, 12), mat.steel);            // lift pump

  [1, -1].forEach((s) => {
    const rad = part(s > 0 ? 'cool-r' : 'cool-l', 'cool', [0, 0.04, 0.3 * s], [0, 0.1, 0.34 * s]);
    const core = new THREE.Group(); core.position.set(-0.1, 0.4, 0.47 * s); core.rotation.set(0, 0.52 * s, 0.3); core.scale.set(0.86, 0.8, 1); rad.add(core);
    const put = (geo, m) => { const me = new THREE.Mesh(geo, m); me.castShadow = true; core.add(me); };
    put(box(0.6, 0.32, 0.04, 0, 0, 0), mat.darkAlu);
    for (let i = 0; i < 26; i++) put(box(0.004, 0.3, 0.046, -0.29 + i * 0.0232, 0, 0), mat.alu); // fins
    put(box(0.6, 0.03, 0.06, 0, 0.175, 0), mat.alu); put(box(0.6, 0.03, 0.06, 0, -0.175, 0), mat.alu); // header tanks
    if (s > 0) { put(box(0.5, 0.26, 0.03, 0.02, 0, 0.06), mat.titan); for (let i = 0; i < 16; i++) put(box(0.004, 0.24, 0.034, -0.22 + i * 0.03, 0, 0.06), mat.alu); } // charge-air cooler
    // coolant lines back to the engine
    add(rad, tube([V(-0.36, 0.47, 0.4 * s), V(-0.56, 0.44, 0.33 * s), V(-0.72, 0.34, 0.2 * s), V(-0.78, 0.26, 0.11 * s)], 0.02, 20), mat.alu);
    add(rad, tube([V(-0.3, 0.26, 0.4 * s), V(-0.55, 0.25, 0.32 * s), V(-0.76, 0.2, 0.17 * s)], 0.018, 18), s > 0 ? mat.blue : mat.alu);
  });

  /* ================= gearbox and drive ================= */

  const gbx = part('gbx-case', 'gbx', [0, 0, 0], [-0.5, 0, 0], false);
  add(gbx, loft([{ x: -1.34, w: 0.17, y0: 0.07, y1: 0.4, n: 3.2 }, { x: -1.5, w: 0.15, y0: 0.1, y1: 0.4, n: 3.2 }, { x: -1.8, w: 0.12, y0: 0.14, y1: 0.39, n: 3 }, { x: -2.06, w: 0.085, y0: 0.19, y1: 0.36, n: 2.8 }], { segs: 28, sub: 5 }), mat.carbon);
  add(gbx, loft([{ x: -2.06, w: 0.085, y0: 0.19, y1: 0.36, n: 2.8 }, { x: -2.24, w: 0.06, y0: 0.24, y1: 0.35, n: 2.6 }, { x: -2.38, w: 0.035, y0: 0.27, y1: 0.33, n: 2.4 }], { segs: 20, sub: 4 }), mat.carbon); // crash structure
  const rain = add(gbx, box(0.02, 0.08, 0.06, -2.39, 0.3, 0), std({ color: 0x300008, emissive: 0xd4001f, emissiveIntensity: 2.4 }), false);
  [1, -1].forEach((s) => { add(gbx, cylX(0.018, 0.2, -1.62, 0.42, 0.05 * s, 12), mat.gold); add(gbx, box(0.06, 0.03, 0.05, -1.5, 0.42, 0.06 * s), mat.titan); }); // dampers and rockers
  const gears = part('gbx-gears', 'gbx', [0, 0, 0], [-0.22, 0.46, 0]);
  add(gears, cylX(0.016, 0.52, -1.66, 0.3, 0, 12), mat.steel); add(gears, cylX(0.016, 0.52, -1.66, 0.2, 0, 12), mat.steel); // shafts
  for (let i = 0; i < 8; i++) {
    const x = -1.44 - i * 0.058, r = 0.04 + i * 0.004;
    add(gears, cylX(r, 0.026, x, 0.3, 0, 26), mat.steel); add(gears, cylX(0.092 - r, 0.026, x, 0.2, 0, 26), mat.titan);
  }
  add(gears, cylX(0.075, 0.07, -1.37, 0.22, 0, 26), mat.darkAlu);          // clutch
  const diff = part('gbx-diff', 'gbx', [0, 0, 0], [0, 0, 0]);
  add(diff, cylZ(0.085, 0.13, -1.7, 0.36, 0, 24), mat.titan);
  [1, -1].forEach((s) => {
    add(diff, cylZ(0.02, 0.44, -1.7, 0.36, 0.3 * s, 12), mat.steel);
    add(diff, cylZ(0.04, 0.06, -1.7, 0.36, 0.1 * s, 16), mat.cell); add(diff, cylZ(0.04, 0.06, -1.7, 0.36, 0.5 * s, 16), mat.cell); // CV boots
  });

  /* ================= suspension, steering, brakes, wheels ================= */

  const steer = part('sus-steering', 'sus', [0, 0, 0], [0.2, 0.5, 0]);
  add(steer, cylZ(0.022, 0.36, 1.84, 0.46, 0, 14), mat.steel);             // rack
  add(steer, tube([V(1.84, 0.47, 0), V(1.3, 0.54, 0), V(0.9, 0.63, 0), V(0.65, 0.665, 0)], 0.014, 16), mat.titan); // column
  [1, -1].forEach((s) => { add(steer, cylX(0.016, 0.24, 1.5, 0.54, 0.06 * s, 12), mat.gold); add(steer, box(0.012, 0.14, 0.05, 1.28, 0.26, 0.06 * s), mat.titan); }); // dampers, pedals

  const wheels = [];
  const side = sidewallTexture();
  // 2026 Pirelli sizes: front 705 mm tall and 280 mm wide, rear 710 mm and 375 mm, on 18-inch rims.
  // The tyre is a smooth lathed section (bead, bulging sidewall, rounded shoulder, crowned
  // tread); the wheel is a dished barrel with ten solid tapered spokes.
  const RIM = 0.2286;
  const mkWheel = (w, R) => {
    const g = new THREE.Group(), hw = w / 2;
    const put = (geo, m, shadow = true) => { const me = new THREE.Mesh(geo, m); me.castShadow = shadow; me.receiveShadow = true; g.add(me); return me; };
    const half = [[RIM - 0.008, hw - 0.05], [RIM + 0.004, hw - 0.024], [RIM + 0.03, hw - 0.006], [R - 0.075, hw], [R - 0.04, hw - 0.006], [R - 0.016, hw - 0.026], [R - 0.004, hw - 0.058], [R, hw - 0.1]];
    const ctrl = [...half.map(([r, a]) => new THREE.Vector2(r, -a)), new THREE.Vector2(R + 0.0015, 0), ...half.slice().reverse().map(([r, a]) => new THREE.Vector2(r, a))];
    const prof = new THREE.SplineCurve(ctrl).getPoints(84);
    put(new THREE.LatheGeometry(prof, 96).rotateX(Math.PI / 2), mat.rubber);
    // markings wrapped onto the outer and inner sidewalls
    const wall = prof.filter((q) => q.y > hw - 0.05 && q.x > RIM + 0.014 && q.x < R - 0.012).map((q) => new THREE.Vector2(q.x, q.y + 0.0007));
    const dg2 = new THREE.LatheGeometry(wall, 96).rotateX(Math.PI / 2), dp = dg2.attributes.position, duv = dg2.attributes.uv;
    for (let i = 0; i < dp.count; i++) duv.setXY(i, 0.5 + dp.getX(i) / (2 * RT), 0.5 + dp.getY(i) / (2 * RT));
    const dm = new THREE.MeshStandardMaterial({ map: side, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    put(dg2, dm, false); put(dg2, dm, false).rotation.y = Math.PI;
    // rim: barrel, two flanges, ten tapered spokes that fall away toward the hub
    put(new THREE.CylinderGeometry(RIM - 0.006, RIM - 0.006, w - 0.05, 64, 1, true).rotateX(Math.PI / 2), mat.rim);
    [1, -1].forEach((sd) => put(new THREE.TorusGeometry(RIM - 0.003, 0.011, 10, 64).translate(0, 0, sd * (hw - 0.024)), mat.rim));
    const sh = new THREE.Shape([[-0.022, 0.05], [0.022, 0.05], [0.0115, 0.222], [-0.0115, 0.222]].map(([x, y]) => new THREE.Vector2(x, y)));
    const spoke = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 2 });
    const sp = spoke.attributes.position;
    for (let i = 0; i < sp.count; i++) sp.setZ(i, sp.getZ(i) + hw - 0.135 + ((sp.getY(i) - 0.05) / 0.172) * 0.07);
    spoke.computeVertexNormals();
    for (let i = 0; i < 10; i++) put(spoke, mat.rim).rotation.z = (i / 10) * Math.PI * 2;
    put(cylZ(0.064, 0.06, 0, 0, hw - 0.125, 24), mat.rim);                                                    // hub
    put(new THREE.CylinderGeometry(0.03, 0.035, 0.04, 6).rotateX(Math.PI / 2).translate(0, 0, hw - 0.082), mat.titan); // wheel nut
    put(cylZ(0.013, 0.012, 0, 0, hw - 0.06, 12), mat.yellow, false);
    return g;
  };
  [{ n: 'fr', x: 1.7, s: 1, w: 0.28, R: 0.3525, front: true }, { n: 'fl', x: 1.7, s: -1, w: 0.28, R: 0.3525, front: true }, { n: 'rr', x: -1.7, s: 1, w: 0.375, R: 0.355 }, { n: 'rl', x: -1.7, s: -1, w: 0.375, R: 0.355 }].forEach((c) => {
    const fx = c.front ? 0.12 : -0.12, cy = c.R;
    const grp = part('wheel-' + c.n, 'whl', [fx, 0, 0.74 * c.s], [fx * 0.6, 0, 0.3 * c.s]);
    const zc = c.s * (0.95 - c.w / 2), wh = mkWheel(c.w, c.R);
    if (c.s < 0) wh.rotation.y = Math.PI;
    const st = new THREE.Group(); st.position.set(c.x, cy, zc); st.add(wh); grp.add(st);
    wheels.push({ steer: st, wh, front: !!c.front, s: c.s });

    const sus = part('sus-' + c.n, 'sus', [fx * 0.4, 0, 0.26 * c.s], [0, 0, 0.1 * c.s]);
    const zi = c.s * (0.95 - c.w - 0.02), P = (x, y, z) => V(x, y, z * c.s);
    // front: push-rod from the lower wishbone up to the chassis top.
    // rear: push-rod as well, as reported for this car, rising to the gearbox top.
    const arms = c.front
      ? [[V(1.7, 0.49, zi), P(2.0, 0.49, 0.13)], [V(1.7, 0.49, zi), P(1.3, 0.56, 0.2)], [V(1.7, 0.2, zi), P(2.02, 0.3, 0.13)], [V(1.7, 0.2, zi), P(1.25, 0.17, 0.2)], [V(1.7, 0.22, zi), P(1.52, 0.56, 0.17)], [V(1.84, 0.4, zi), P(1.84, 0.46, 0.17)]]
      : [[V(-1.7, 0.5, zi), P(-1.36, 0.4, 0.17)], [V(-1.7, 0.5, zi), P(-2.0, 0.34, 0.085)], [V(-1.7, 0.2, zi), P(-1.36, 0.14, 0.17)], [V(-1.7, 0.2, zi), P(-2.02, 0.2, 0.08)], [V(-1.7, 0.22, zi), P(-1.52, 0.41, 0.1)]];
    arms.forEach(([a, b], i) => add(sus, blade(a, b, i > 3 ? 0.03 : 0.05), mat.carbon));
    add(sus, box(0.09, 0.34, 0.05, c.x, cy, zi + 0.02 * c.s), mat.titan);  // upright

    const brk = part('brk-' + c.n, 'brk', [fx * 0.7, 0, 0.5 * c.s], [0, 0, 0.16 * c.s]);
    const bz = zc - c.s * (c.w / 2 - 0.1);
    add(brk, cylZ(0.165, 0.032, c.x, cy, bz, 48), mat.disc);               // carbon disc
    add(brk, cylZ(0.168, 0.006, c.x, cy, bz, 48), std({ color: 0x3a2a22, roughness: 0.5, metalness: 0.4 }));
    add(brk, cylZ(0.07, 0.05, c.x, cy, bz, 24), mat.titan);                // bell
    const cal = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 8, 12, 1.1).rotateZ(c.front ? -0.2 : 2.4), mat.red); cal.scale.z = 1.7; cal.position.set(c.x, cy, bz); cal.castShadow = true; brk.add(cal);
    // The carbon brake drum fills the wheel behind the spokes, so you cannot see through the rim.
    const drum = part('drum-' + c.n, 'whl', [fx * 0.85, 0, 0.62 * c.s], [fx * 0.3, 0, 0.23 * c.s]);
    const zo = zc + c.s * (c.w / 2 - 0.142), zin = zc - c.s * (c.w / 2 - 0.03);
    add(drum, new THREE.CylinderGeometry(0.214, 0.214, Math.abs(zo - zin), 48, 1, true).rotateX(Math.PI / 2).translate(c.x, cy, (zo + zin) / 2), mat.carbon);
    add(drum, new THREE.CircleGeometry(0.214, 48).translate(c.x, cy, zo), mat.carbon);
    add(drum, new THREE.TorusGeometry(0.15, 0.006, 6, 40).translate(c.x, cy, zo + 0.002 * c.s), mat.matte, false);
  });

  /* ---- per-group materials so each assembly can fade on its own ---- */
  parts.forEach((p) => {
    const cache = new Map(); p.userData.mats = [];
    p.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      if (!cache.has(o.material)) { const m = o.material.clone(); m.userData.base = o.material.opacity; cache.set(o.material, m); p.userData.mats.push(m); }
      o.material = cache.get(o.material);
    });
  });
  return { car, parts, flaps, wheels, rain };
}

/* ------------------------------------------------------------------ viewer */

const VIEWS = {
  hero: { pos: [4.9, 1.6, 5.0], tgt: [0.2, 0.36, 0] }, side: { pos: [0.2, 0.9, 7.8], tgt: [0.2, 0.4, 0] },
  front: { pos: [7.2, 1.0, 0.01], tgt: [0, 0.42, 0] }, rear: { pos: [-6.4, 1.7, 2.6], tgt: [0, 0.44, 0] }, top: { pos: [0.22, 9.0, 0.01], tgt: [0.22, 0, 0] },
  fw: { pos: [5.0, 1.1, 2.4], tgt: [2.6, 0.2, 0] }, rw: { pos: [-4.6, 1.5, 2.2], tgt: [-2.2, 0.7, 0] }, puh: { pos: [-2.4, 2.3, 3.6], tgt: [-0.9, 0.3, 0] },
  ck: { pos: [2.5, 1.9, 2.1], tgt: [0.4, 0.6, 0] }, ty: { pos: [-3.2, 0.75, 3.3], tgt: [-1.7, 0.36, 0.76] }, fl: { pos: [1.4, 0.55, 4.2], tgt: [-0.3, 0.15, 0.4] },
  // system views
  pu: { pos: [-4.9, 2.7, 3.9], tgt: [-1.45, 0.4, 0] }, ers: { pos: [-1.6, 1.5, -3.0], tgt: [-0.6, 0.16, -0.1] }, fuel: { pos: [1.6, 1.7, 2.6], tgt: [-0.5, 0.35, 0] },
  cool: { pos: [1.6, 1.4, 3.2], tgt: [-0.15, 0.32, 0.3] }, gbx: { pos: [-4.2, 1.5, 2.0], tgt: [-1.75, 0.3, 0] }, sus: { pos: [4.4, 1.6, 2.8], tgt: [1.6, 0.34, 0] },
  brk: { pos: [3.4, 0.9, 3.4], tgt: [1.7, 0.36, 0.7] }, aero: { pos: [5.2, 2.3, 4.4], tgt: [0, 0.4, 0] }, cell: { pos: [3.4, 2.0, 3.0], tgt: [0.7, 0.4, 0] }, whl: { pos: [3.2, 0.8, 3.6], tgt: [1.7, 0.36, 0.8] },
};
VIEWS.xray = VIEWS.puh;
const ANCHORS = { fw: [2.6, 0.32, 0.6], rw: [-2.3, 0.96, 0], pu: [-1.0, 0.86, 0], ck: [0.47, 0.94, 0], ty: [-1.7, 0.73, 0.76], fl: [-0.4, 0.09, 0.8] };

function mount(el) {
  const variant = el.dataset.car3d || 'explorer';
  const ui = el.closest('[data-car-ui]') || el.parentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { el.classList.add('no-webgl'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 0.98;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.9;
  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  key.position.set(3.5, 7.5, 4.5); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 7; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 22 });
  scene.add(key);
  const rimL = new THREE.DirectionalLight(0xffe4dc, 0.9); rimL.position.set(-6, 2.5, -5); scene.add(rimL);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(11, 64), new THREE.ShadowMaterial({ opacity: 0.5 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const grid = new THREE.GridHelper(22, 44, 0xffffff, 0xffffff);
  grid.material.transparent = true; grid.material.opacity = 0.05; grid.position.y = 0.001; scene.add(grid);

  const M = buildCar();
  scene.add(M.car);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 90);
  const ctl = new OrbitControls(camera, renderer.domElement);
  ctl.enableDamping = true; ctl.dampingFactor = 0.07; ctl.enablePan = false; ctl.enableZoom = false;
  ctl.minPolarAngle = 0.15; ctl.maxPolarAngle = Math.PI / 2 - 0.03;
  ctl.autoRotate = !reduce; ctl.autoRotateSpeed = 0.55;
  ctl.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  renderer.domElement.style.touchAction = 'pan-y';
  ctl.target.set(...VIEWS.hero.tgt);

  let fit = 1;
  const resize = () => {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    fit = Math.max(1, 1.58 / camera.aspect);   // keep the whole car in frame on tall, narrow stages
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(el); resize();

  // everything below eases toward a target, so every control animates
  const st = { spin: 0, roll: 0, aero: 0, aeroT: 0, xray: 0, exp: 0, expT: 0, fly: null, steer: 0, steerT: 0, sys: '', lift: 0, zoom: 1 };
  const flyTo = (name, spin) => {
    const v = VIEWS[name]; if (!v) return;
    st.fly = { p: new THREE.Vector3(...v.pos), t: new THREE.Vector3(...v.tgt), k: 0, spin };
    if (!spin) ctl.autoRotate = false;
  };

  /* ---- UI wiring ---- */
  const $$ = (s) => [...ui.querySelectorAll(s)];
  const on = (sel, attr, val) => $$(sel).forEach((b) => { const hit = b.dataset[attr] === val; b.classList.toggle('is-on', hit); if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', hit); });
  const hots = $$('[data-hot]'), cards = $$('[data-card]');
  const showCard = (id) => cards.forEach((c) => c.classList.toggle('is-on', c.dataset.card === id));
  const setSys = (id) => {
    st.sys = st.sys === id ? '' : id;
    on('[data-sys]', 'sys', st.sys); ui.classList.toggle('has-sys', !!st.sys);
    on('[data-hot]', 'hot', ''); on('[data-view]', 'view', st.sys ? '' : 'hero');
    showCard(st.sys ? 'sys-' + st.sys : 'intro');
    flyTo(st.sys || 'hero');
  };
  const setXray = (v) => { st.xray = v ? 1 : 0; $$('[data-xray]').forEach((b) => { b.classList.toggle('is-on', !!v); b.setAttribute('aria-pressed', !!v); }); ui.classList.toggle('is-xray', !!v); };
  $$('[data-view]').forEach((b) => b.addEventListener('click', () => { flyTo(b.dataset.view); on('[data-view]', 'view', b.dataset.view); }));
  $$('[data-aero]').forEach((b) => b.addEventListener('click', () => {
    st.aeroT = b.dataset.aero === 'straight' ? 1 : 0; on('[data-aero]', 'aero', b.dataset.aero); ui.dataset.aeroMode = b.dataset.aero;
    if (st.sys) setSys(st.sys);
    on('[data-hot]', 'hot', ''); showCard('aero-' + b.dataset.aero);
  }));
  $$('[data-xray]').forEach((b) => b.addEventListener('click', () => setXray(!st.xray)));
  $$('[data-explode]').forEach((r) => r.addEventListener('input', () => { st.expT = +r.value / 100; ui.classList.toggle('is-exploded', st.expT > 0.08); if (st.expT > 0.02) ctl.autoRotate = false; $$('[data-explode-out]').forEach((o) => (o.textContent = st.expT < 0.03 ? 'Assembled' : st.expT <= 0.5 ? 'Bodywork off' : 'Power unit apart')); }));
  $$('[data-sys]').forEach((b) => b.addEventListener('click', () => setSys(b.dataset.sys)));
  $$('[data-reset]').forEach((b) => b.addEventListener('click', () => {
    if (st.sys) setSys(st.sys);
    setXray(false); st.expT = 0; $$('[data-explode]').forEach((r) => { r.value = 0; r.dispatchEvent(new Event('input')); });
    st.aeroT = 0; on('[data-aero]', 'aero', 'corner'); on('[data-hot]', 'hot', ''); on('[data-view]', 'view', 'hero'); showCard('intro'); flyTo('hero', true);
  }));
  hots.forEach((h) => h.addEventListener('click', () => {
    if (st.sys) setSys(st.sys);
    on('[data-hot]', 'hot', h.dataset.hot); on('[data-view]', 'view', ''); showCard('hot-' + h.dataset.hot);
    flyTo(h.dataset.hot === 'pu' ? 'puh' : h.dataset.hot);
    if (h.dataset.hot === 'pu') setXray(true);
  }));
  ctl.addEventListener('start', () => { st.fly = null; ctl.autoRotate = false; el.classList.add('is-touched'); });
  el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); st.steerT = ((e.clientX - r.left) / r.width - 0.5) * -0.5; });

  /* ---- render loop, paused while off screen ---- */
  let visible = true, last = performance.now();
  new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '100px' }).observe(el);
  const tmp = new THREE.Vector3(), off = new THREE.Vector3();
  const ease = (a, b, k) => a + (b - a) * k, clamp = (v) => Math.min(1, Math.max(0, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const placed = [];
  const frame = (now) => {
    requestAnimationFrame(frame);
    if (!visible) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const k = 1 - Math.exp(-dt * 5);
    st.aero = ease(st.aero, st.aeroT, k); st.exp = ease(st.exp, st.expT, k); st.steer = ease(st.steer, st.steerT, k);

    // two-stage explode: bodywork and assemblies first, then the power unit itself
    const e1 = smooth(clamp(st.exp / 0.5)), e2 = smooth(clamp((st.exp - 0.5) / 0.5));
    M.car.position.y = 0.42 * e1 + 0.1 * e2;
    M.flaps.forEach((f) => (f.pivot.rotation.z = f.open * st.aero));
    st.spin = ease(st.spin, st.aeroT * 26 * (1 - e1), k * 0.5); st.roll += st.spin * dt;
    M.wheels.forEach((w) => { if (w.front) w.steer.rotation.y = st.steer * (1 - st.aero) * (1 - e1); w.wh.rotation.z = (w.s > 0 ? -1 : 1) * st.roll; });
    grid.position.x = -((st.roll * 0.355) % 0.5);

    M.parts.forEach((p) => {
      const u = p.userData;
      p.position.copy(u.e1).multiplyScalar(e1).addScaledVector(u.e2, e2);
      // opacity: focused system solid and the rest ghosted; x-ray fades only the painted skin
      const target = st.sys ? (u.sys === st.sys ? 1 : 0.035) : st.xray && u.skin ? 0.1 : 1;
      if (Math.abs(u.op - target) > 0.002) {
        u.op = ease(u.op, target, k * 1.2);
        const solid = u.op > 0.985;
        u.mats.forEach((m) => { if (m.transparent === solid) { m.transparent = !solid; m.needsUpdate = true; } m.opacity = u.op; m.depthWrite = u.op > 0.5; });
        p.traverse((o) => { if (o.isMesh) o.castShadow = u.op > 0.5; });
      }
    });
    M.rain.material.emissiveIntensity = 1.6 + Math.sin(now / 180) * 1.2;

    const zoomT = 1 + 0.34 * e1 + 0.16 * e2;
    if (st.fly) {
      st.fly.k = Math.min(1, st.fly.k + dt * (st.fly.spin ? 0.5 : 1.1));
      tmp.copy(st.fly.p).sub(st.fly.t).multiplyScalar(fit * zoomT).add(st.fly.t);
      camera.position.lerp(tmp, k * 0.9); ctl.target.lerp(st.fly.t, k * 0.9);
      if (st.fly.k >= 1 && camera.position.distanceTo(tmp) < 0.05) { if (st.fly.spin && !el.classList.contains('is-touched')) ctl.autoRotate = true; st.fly = null; }
      st.zoom = zoomT;
    } else if (Math.abs(zoomT - st.zoom) > 0.0005) {
      // pull the camera back as the car comes apart
      off.copy(camera.position).sub(ctl.target).multiplyScalar(zoomT / st.zoom); camera.position.copy(ctl.target).add(off); st.zoom = zoomT;
    }
    ctl.update();

    // pin numbered hotspots to the car; hide any that would land on top of another
    if (hots.length) {
      const w = el.clientWidth, h = el.clientHeight, show = st.exp < 0.12 && !st.sys;
      placed.length = 0;
      hots.forEach((b) => {
        const a = ANCHORS[b.dataset.hot]; if (!a) return;
        tmp.set(...a).project(camera);
        const x = ((tmp.x + 1) / 2) * w, y = ((1 - tmp.y) / 2) * h;
        const inside = tmp.z < 1 && x > 18 && x < w - 18 && y > 18 && y < h - 18;
        const clash = placed.some(([px, py]) => Math.hypot(px - x, py - y) < 40);
        const ok = show && inside && !clash;
        if (ok) placed.push([x, y]);
        b.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        b.classList.toggle('is-off', !ok);
      });
    }
    renderer.render(scene, camera);
  };

  // opening shot: sweep in from high behind the car
  const s0 = reduce ? VIEWS.hero.pos : [-7.5, 4.2, 9.5];
  camera.position.set(...s0).sub(ctl.target).multiplyScalar(fit).add(ctl.target);
  if (!reduce) flyTo('hero', true);
  el.classList.add('is-ready'); ui.classList.add('is-ready');
  requestAnimationFrame(frame);
  el.__car = { st, flyTo, ctl, camera, M, setSys, setXray };
}

// the livery needs the site typeface (numbers, tyre lettering) and the logo images
const fontsReady = Promise.all([(document.fonts && document.fonts.load ? Promise.all([document.fonts.load('italic 900 100px Archx'), document.fonts.load('800 60px Archx')]) : Promise.resolve()).catch(() => {}), loadDecals()]);
document.querySelectorAll('[data-car3d]').forEach((el) => {
  // the livery is painted with the site typeface, so wait for it before building
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); fontsReady.then(() => mount(el)); } }, { rootMargin: '400px' });
  io.observe(el);
});
