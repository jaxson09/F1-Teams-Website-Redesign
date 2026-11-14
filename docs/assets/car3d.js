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
function loft(sections, { segs = 56, sub = 8, uv, side = 0 } = {}) {
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
  const h = segs / 2, row = segs + 2, pos = [], uvs = [], idx = [];
  const ss = (t) => t * t * (3 - 2 * t);
  const put = (r, j, sd) => {
    const th = (j / segs) * Math.PI * 2 - Math.PI / 2;
    const c = Math.cos(th), s = Math.sin(th), e = 2 / Math.max(1.2, r.n);
    const px = Math.sign(c) * Math.abs(c) ** e, py = Math.sign(s) * Math.abs(s) ** e;
    const t = (py + 1) / 2;
    const wf = (1 - r.taper * ss(t)) * (1 - r.flat * ss(1 - t));
    const y = r.y0 + (r.y1 - r.y0) * t, z = r.cz + Math.max(0.001, r.w) * px * wf;
    pos.push(r.x, y, z);
    uvs.push(...(uv ? uv(r.x, y, z, side || sd) : [0, 0]));
  };
  rings.forEach((r) => {
    for (let j = 0; j <= h; j++) put(r, j, 1);
    for (let j = h; j <= segs; j++) put(r, j, -1);
  });
  for (let i = 0; i < rings.length - 1; i++)
    for (let j = 0; j < segs; j++) {
      const a = i * row + j + (j >= h ? 1 : 0), b = a + 1, c = a + row, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  [0, rings.length - 1].forEach((ri, n) => {
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

// Bodywork is painted from the side, like a livery drawing: one canvas, right
// side of the car in the top half and left side in the bottom half.
const LX0 = -2.75, LX1 = 2.95, LY1 = 1.06;
const sideUV = (x, y, z, sd) => [(x - LX0) / (LX1 - LX0), (sd > 0 ? 0.5 : 0) + 0.5 * Math.min(1, Math.max(0, y / LY1))];

function atlas(draw) {
  const W = BIG ? 4096 : 2048, c = document.createElement('canvas');
  c.width = W; c.height = 1024;
  const g = c.getContext('2d');
  const kx = W / (LX1 - LX0), ky = 512 / LY1;
  const X = (x) => (x - LX0) * kx, Y = (y) => 512 - y * ky;
  [1, -1].forEach((sd) => {
    g.save(); g.translate(0, sd > 0 ? 0 : 512); g.beginPath(); g.rect(0, 0, W, 512); g.clip();
    const poly = (pts, color) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.closePath(); g.fillStyle = color; g.fill(); };
    // text sized by cap height in metres; mirrored on the left side so it reads correctly on the car
    const text = (parts, x, y, cap, o = {}) => {
      g.save(); g.translate(X(x), Y(y)); g.scale((sd < 0 ? -1 : 1) * (kx / ky), 1);
      g.font = `${o.weight || 900} ${(cap / 0.7) * ky}px "Archx", "Arial Black", sans-serif`;
      // widen and slant by hand where the canvas can't select those font variations
      const probe = g.measureText('HAAS').width, want = o.stretch || 'extra-expanded';
      try { g.fontStretch = want; } catch (e) {}
      if (want === 'extra-expanded' && g.measureText('HAAS').width < probe * 1.08) g.scale(1.22, 1);
      if (o.italic !== false) g.transform(1, 0, -0.2, 1, 0, 0);
      g.textBaseline = 'middle'; g.textAlign = 'left';
      const list = Array.isArray(parts) ? parts : [[parts, o.color || BLACK]];
      let off = -list.reduce((s, [t]) => s + g.measureText(t).width, 0) / 2;
      list.forEach(([t, col]) => { g.fillStyle = col; g.fillText(t, off, 0); off += g.measureText(t).width; });
      g.restore();
    };
    draw({ g, X, Y, poly, text, sd, W });
    g.restore();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// nose and survival cell: white over carbon, red flank stripe, dark top panel
const tubTexture = () => atlas(({ poly, text }) => {
  poly([[3, 0], [3, 1.1], [-3, 1.1], [-3, 0]], WHITE);
  const edge = [[2.95, 0.243], [2.5, 0.262], [2.1, 0.3], [1.7, 0.36], [1.3, 0.415], [0.9, 0.44], [-3, 0.44]];
  poly([...edge, [-3, 0], [2.95, 0]], BLACK);
  poly([[2.95, 0.243], [2.5, 0.262], [2.1, 0.3], [1.7, 0.36], [1.3, 0.415], [0.72, 0.44], [0.72, 0.505], [1.28, 0.475], [1.34, 0.445], [1.7, 0.395], [2.1, 0.332], [2.5, 0.29], [2.95, 0.268]], RED);
  poly([[1.72, 0.425], [1.02, 0.5], [0.98, 0.54], [0.9, 0.7], [1.72, 0.7]], BLACK); // cockpit-front top panel
  poly([[1.86, 0.412], [1.72, 0.425], [1.72, 0.7], [1.86, 0.7]], RED);
  text('ORION180', 1.08, 0.365, 0.04, { color: WHITE, italic: false, weight: 800 });
});

// engine cover: red airbox, the big two-colour mark, carbon cooling exit at the back
const coverTexture = () => atlas(({ poly, text }) => {
  poly([[3, 0], [3, 1.1], [-3, 1.1], [-3, 0]], WHITE);
  poly([[0.2, 1.1], [-0.5, 1.1], [-0.56, 0.78], [-0.4, 0.69], [0.2, 0.69]], RED);
  text('RUCKUS', -0.2, 0.86, 0.042, { color: WHITE, italic: false, weight: 800 });
  text([['G', BLACK], ['R', RED]], -0.98, 0.585, 0.25, {});
  poly([[-1.72, 0], [-1.52, 0.5], [-1.74, 1.1], [-3, 1.1], [-3, 0]], BLACK);
  poly([[-0.2, 0.36], [-1.56, 0.405], [-1.52, 0.5], [-1.56, 0.45], [-0.2, 0.4]], BLACK);
});

// sidepod: white flank, red shoulder stripe with cooling gills, team lettering
const POD_TOP = [[0.66, 0.555], [0.45, 0.585], [0.05, 0.59], [-0.4, 0.55], [-0.85, 0.46], [-1.25, 0.34], [-1.6, 0.235], [-1.95, 0.17]];
const podTopY = (x) => {
  for (let i = 0; i < POD_TOP.length - 1; i++) {
    const [x0, y0] = POD_TOP[i], [x1, y1] = POD_TOP[i + 1];
    if (x <= x0 && x >= x1) return y0 + ((y1 - y0) * (x0 - x)) / (x0 - x1);
  }
  return x > 0.66 ? 0.555 : 0.17;
};
const podTexture = () => atlas(({ poly, text }) => {
  poly([[3, 0], [3, 1.1], [-3, 1.1], [-3, 0]], WHITE);
  const xs = span(0.5, -1.3, 36);
  poly([...xs.map((x) => [x, podTopY(x) - 0.05]), ...xs.slice().reverse().map((x) => [x, podTopY(x) - 0.05 - 0.05 * Math.min(1, (0.5 - x) / 0.5)])], RED);
  poly([...xs.map((x) => [x, podTopY(x) - 0.038]), ...xs.slice().reverse().map((x) => [x, podTopY(x) - 0.05])], BLACK);
  for (let i = 0; i < 5; i++) { const x = -0.08 - i * 0.11, y = podTopY(x) - 0.105; poly([[x, y], [x - 0.07, y - 0.005], [x - 0.13, y - 0.055], [x - 0.1, y - 0.05]], '#1a1a1c'); }
  text('FIX', 0.4, 0.4, 0.05, { italic: false, weight: 800, stretch: 'condensed' });
  text('NETWORK', 0.4, 0.345, 0.016, { italic: false, weight: 700, stretch: 'normal' });
  text('HAAS', -0.42, 0.235, 0.165, {});
  poly([[3, 0], [3, 0.118], [-3, 0.118], [-3, 0]], BLACK);
  poly([[-1.22, 0], [-1.1, 0.25], [-1.3, 0.6], [-3, 0.6], [-3, 0]], BLACK);
});

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

// tyre sidewall: yellow compound brackets and fine white bands, drawn on a ring
function sidewallTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'); g.translate(256, 256); g.lineCap = 'butt';
  const arc = (r, a0, a1, w, col) => { g.beginPath(); g.arc(0, 0, r, a0, a1); g.lineWidth = w; g.strokeStyle = col; g.stroke(); };
  [0, Math.PI].forEach((o) => { arc(222, o - 0.62, o + 0.62, 13, YEL); for (let i = 0; i < 9; i++) arc(203, o + 2.0 + i * 0.07 - 0.3, o + 2.0 + i * 0.07 - 0.27, 16, YEL); });
  [Math.PI / 2, -Math.PI / 2].forEach((o) => arc(222, o - 0.5, o + 0.5, 9, 'rgba(244,242,238,0.85)'));
  arc(244, 0, Math.PI * 2, 2, 'rgba(244,242,238,0.35)');
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
    matte: std({ color: 0x050506, roughness: 0.96 }), rubber: std({ color: 0x0c0c0d, roughness: 0.84 }),
    alu: std({ color: 0xa9adb3, roughness: 0.36, metalness: 0.95 }), darkAlu: std({ color: 0x4a4d52, roughness: 0.45, metalness: 0.9 }),
    steel: std({ color: 0xd0d3d8, roughness: 0.2, metalness: 1 }), inconel: std({ color: 0x9a6b3f, roughness: 0.34, metalness: 1 }),
    titan: std({ color: 0x6d6f76, roughness: 0.3, metalness: 1 }), gold: std({ color: 0xc8a24a, roughness: 0.3, metalness: 1 }),
    redCrackle: std({ color: 0xa80c18, roughness: 0.6, metalness: 0.2 }), hv: std({ color: 0xff7a00, roughness: 0.5 }),
    cell: std({ color: 0x1c1d20, roughness: 0.75 }), blue: std({ color: 0x1c5fd0, roughness: 0.35, metalness: 0.8 }),
    yellow: std({ color: 0xd8f000, roughness: 0.45 }), rim: std({ color: 0x151517, roughness: 0.35, metalness: 0.85 }),
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

  const NOSE = [
    { x: 2.82, w: 0.05, y0: 0.232, y1: 0.272, n: 2.6 },
    { x: 2.7, w: 0.095, y0: 0.212, y1: 0.292, n: 2.8 },
    { x: 2.45, w: 0.118, y0: 0.196, y1: 0.33, n: 2.9 },
    { x: 2.2, w: 0.135, y0: 0.18, y1: 0.366, n: 3 },
    { x: 1.95, w: 0.152, y0: 0.162, y1: 0.4, n: 3.1 },
  ];
  const TUB = [
    { x: 1.95, w: 0.152, y0: 0.162, y1: 0.4, n: 3.1 },
    { x: 1.6, w: 0.185, y0: 0.135, y1: 0.45, n: 3.1, taper: 0.06 },
    { x: 1.2, w: 0.24, y0: 0.095, y1: 0.52, n: 3.2, taper: 0.12 },
    { x: 0.85, w: 0.285, y0: 0.065, y1: 0.575, n: 3.3, taper: 0.18 },
    { x: 0.45, w: 0.305, y0: 0.05, y1: 0.6, n: 3.3, taper: 0.22 },
    { x: 0.05, w: 0.31, y0: 0.05, y1: 0.615, n: 3.1, taper: 0.28 },
    { x: -0.3, w: 0.3, y0: 0.05, y1: 0.61, n: 2.9, taper: 0.34 },
    { x: -0.76, w: 0.29, y0: 0.055, y1: 0.58, n: 2.9, taper: 0.36 },
  ];
  const nose = part('nose', 'cell', [0.5, 0, 0], [0.25, 0, 0], true);
  add(nose, loft(NOSE, { uv: sideUV, sub: 6 }), mat.tub);
  const noseNo = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshBasicMaterial({ map: labelTexture([['87', 190, BLACK, 132, true]]), transparent: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  noseNo.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); noseNo.rotateX(-0.137); noseNo.position.set(2.16, 0.378, 0); nose.add(noseNo);
  add(nose, tube([V(2.3, 0.35, 0), V(2.3, 0.47, 0)], 0.003, 2), mat.matte, false); // pitot

  const tub = part('tub', 'cell', [0, 0, 0], [0, 0, 0], true);
  add(tub, loft(TUB, { uv: sideUV }), mat.tub);
  // cockpit opening, seat, wheel, driver
  add(tub, loft([{ x: 0.62, w: 0.1, y0: 0.5, y1: 0.585, n: 2 }, { x: 0.4, w: 0.2, y0: 0.5, y1: 0.612, n: 2.6 }, { x: 0.05, w: 0.225, y0: 0.5, y1: 0.63, n: 3 }, { x: -0.22, w: 0.2, y0: 0.5, y1: 0.628, n: 2.6 }, { x: -0.34, w: 0.1, y0: 0.5, y1: 0.625, n: 2 }], { segs: 32, sub: 5 }), mat.matte, false);
  const driver = part('driver', 'cell', [0, 0.25, 0], [0, 0.2, 0]);
  add(driver, loft([{ x: -0.02, w: 0.2, y0: 0.6, y1: 0.7, n: 3 }, { x: -0.2, w: 0.2, y0: 0.6, y1: 0.75, n: 3 }, { x: -0.34, w: 0.15, y0: 0.6, y1: 0.76, n: 2.6 }], { segs: 24, sub: 4 }), mat.carbon);
  add(driver, loft([{ x: 0.5, w: 0.16, y0: 0.14, y1: 0.3, n: 3 }, { x: 0.2, w: 0.19, y0: 0.12, y1: 0.42, n: 3 }, { x: -0.1, w: 0.2, y0: 0.12, y1: 0.6, n: 3 }, { x: -0.24, w: 0.18, y0: 0.3, y1: 0.66, n: 3 }], { segs: 20, sub: 4 }), mat.cell); // seat shell
  const helmet = add(driver, new THREE.SphereGeometry(0.128, 40, 28), phys({ color: 0x1d4fb8 }));
  helmet.scale.set(1.1, 1, 0.94); helmet.position.set(0.12, 0.72, 0);
  const cap = add(driver, new THREE.SphereGeometry(0.1295, 40, 16, 0, Math.PI * 2, 0, 0.95), mat.yellow, false);
  cap.scale.copy(helmet.scale); cap.position.copy(helmet.position);
  const visor = add(driver, new THREE.SphereGeometry(0.131, 40, 20, -1.05, 2.1, 1.14, 0.5), new THREE.MeshPhysicalMaterial({ color: 0x08080a, roughness: 0.08, metalness: 0.9 }), false);
  visor.scale.copy(helmet.scale); visor.position.copy(helmet.position); visor.rotation.y = Math.PI / 2;
  add(driver, new THREE.TorusGeometry(0.125, 0.02, 10, 28).rotateX(Math.PI / 2).rotateZ(-0.5).translate(0.4, 0.6, 0), mat.matte, false);

  // halo — painted white on this car
  const halo = part('halo', 'cell', [0, 0.5, 0], [0, 0.25, 0]);
  const hoop = [V(-0.34, 0.655, 0.262), V(-0.12, 0.735, 0.268), V(0.2, 0.765, 0.235), V(0.47, 0.762, 0.14), V(0.585, 0.752, 0), V(0.47, 0.762, -0.14), V(0.2, 0.765, -0.235), V(-0.12, 0.735, -0.268), V(-0.34, 0.655, -0.262)];
  add(halo, tube(hoop, 0.027, 80), mat.white);
  add(halo, tube([V(0.585, 0.752, 0), V(0.68, 0.7, 0), V(0.8, 0.59, 0), V(0.86, 0.53, 0)], 0.024, 20), mat.white);
  [1, -1].forEach((s) => add(halo, new THREE.SphereGeometry(0.03, 12, 10).translate(-0.34, 0.655, 0.262 * s), mat.white));

  // engine cover and airbox: one big panel that lifts off
  const cover = part('cover', 'aero', [-0.05, 0.62, 0], [0, 0.55, 0], true);
  add(cover, loft([
    { x: 0.07, w: 0.105, y0: 0.6, y1: 0.93, n: 2.4, taper: 0.22 },
    { x: -0.12, w: 0.16, y0: 0.56, y1: 0.965, n: 2.5, taper: 0.4 },
    { x: -0.42, w: 0.25, y0: 0.44, y1: 0.95, n: 2.6, taper: 0.6 },
    { x: -0.76, w: 0.29, y0: 0.38, y1: 0.89, n: 2.7, taper: 0.64 },
    { x: -1.1, w: 0.285, y0: 0.31, y1: 0.8, n: 2.8, taper: 0.62 },
    { x: -1.45, w: 0.255, y0: 0.27, y1: 0.69, n: 2.7, taper: 0.56 },
    { x: -1.8, w: 0.17, y0: 0.28, y1: 0.56, n: 2.4, taper: 0.45 },
    { x: -2.12, w: 0.08, y0: 0.3, y1: 0.42, n: 2.2, taper: 0.3 },
  ], { segs: 56, uv: sideUV }), mat.cover);
  const mouth = add(cover, new THREE.CircleGeometry(1, 40), mat.matte, false);
  mouth.scale.set(0.085, 0.135, 1); mouth.rotation.y = Math.PI / 2; mouth.position.set(0.074, 0.78, 0);
  add(cover, plate([[-0.62, 0.9], [-1.9, 0.6], [-1.96, 0.47], [-1.4, 0.6], [-0.62, 0.8]], 0.012), mat.carbon); // shark fin
  [1, -1].forEach((s) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.13), new THREE.MeshBasicMaterial({ map: labelTexture([['87', 190, WHITE, 132, true]]), transparent: true, toneMapped: false }));
    m.position.set(-1.62, 0.63, s * 0.0115); m.rotation.y = s > 0 ? 0 : Math.PI; cover.add(m);
  });
  // onboard camera pod — fluorescent yellow on the second car
  add(cover, loft([{ x: 0.0, w: 0.012, y0: 0.985, y1: 1.0 }, { x: -0.08, w: 0.03, y0: 0.975, y1: 1.012 }, { x: -0.2, w: 0.012, y0: 0.985, y1: 1.0 }], { segs: 16, sub: 4 }), mat.yellow);
  [0.11, -0.11].forEach((z) => add(cover, box(0.1, 0.012, 0.09, -0.08, 0.992, z), mat.yellow));

  // sidepods
  [1, -1].forEach((s) => {
    const g = part(s > 0 ? 'pod-r' : 'pod-l', 'aero', [0, 0.08, 0.62 * s], [0, 0, 0.3 * s], true);
    add(g, loft([
      { x: 0.66, cz: 0.5 * s, w: 0.17, y0: 0.33, y1: 0.555, n: 3.4 },
      { x: 0.45, cz: 0.515 * s, w: 0.215, y0: 0.27, y1: 0.585, n: 3.3, flat: 0.25 },
      { x: 0.05, cz: 0.53 * s, w: 0.25, y0: 0.15, y1: 0.59, n: 3, flat: 0.42 },
      { x: -0.4, cz: 0.5 * s, w: 0.255, y0: 0.085, y1: 0.55, n: 2.8, flat: 0.4 },
      { x: -0.85, cz: 0.42 * s, w: 0.225, y0: 0.075, y1: 0.46, n: 2.6, flat: 0.3 },
      { x: -1.25, cz: 0.32 * s, w: 0.18, y0: 0.075, y1: 0.34, n: 2.5, flat: 0.2 },
      { x: -1.6, cz: 0.22 * s, w: 0.125, y0: 0.08, y1: 0.235, n: 2.4 },
      { x: -1.95, cz: 0.14 * s, w: 0.07, y0: 0.09, y1: 0.17, n: 2.2 },
    ], { segs: 44, uv: sideUV, side: s }), mat.pod);
    const inlet = add(g, new THREE.CircleGeometry(1, 32), mat.matte, false);
    inlet.scale.set(0.135, 0.085, 1); inlet.rotation.y = Math.PI / 2; inlet.position.set(0.664, 0.445, 0.5 * s);
    add(g, box(0.05, 0.06, 0.15, 0.74, 0.665, 0.53 * s), mat.carbon);
    add(g, blade(V(0.72, 0.6, 0.36 * s), V(0.74, 0.65, 0.5 * s), 0.03, 0.01), mat.white);
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
  const fw = part('front-wing', 'aero', [1.0, 0, 0], [0.3, 0, 0]);
  const sweep = (z) => 0.2 * (Math.abs(z) / 0.94) ** 1.6, lift = (z) => 0.085 * Math.exp(-((z / 0.26) ** 2));
  add(fw, wing(span(-0.94, 0.94, 40), (z) => ({ le: [2.86 - sweep(z), 0.1 + lift(z)], chord: 0.3 - 0.07 * (Math.abs(z) / 0.94), aoa: 5, thick: 0.1 })), mat.carbon);
  [1, -1].forEach((s) => {
    [[0.29, 0.06, 0.2, 17, 2], [0.47, 0.135, 0.165, 29, -4]].forEach(([back, up, chord, aoa, open], k) => {
      const pivot = new THREE.Group(), px = 2.86 - sweep(0.55) - back, py = 0.1 + up;
      // the upper flap is red inboard and white outboard, as on the real car
      const mk = (za, zb, m) => {
        const geo = wing(span(za * s, zb * s, 10), (z) => ({ le: [2.86 - sweep(z) - back - px, 0.1 + lift(z) * 0.4 + up - py + 0.04 * (1 - Math.abs(z) / 0.94) * k], chord: chord * (1 - 0.25 * (1 - Math.abs(z) / 0.94) * k), aoa, thick: 0.09 }));
        const me = new THREE.Mesh(geo, m); me.castShadow = true; pivot.add(me);
      };
      if (k) { mk(0.15, 0.52, mat.red); mk(0.52, 0.925, mat.white); } else mk(0.15, 0.925, mat.white);
      pivot.position.set(px, py, 0); fw.add(pivot);
      flaps.push({ pivot, open: (-(aoa - open) * Math.PI) / 180 });
    });
    add(fw, plate([[2.69, 0.05], [2.685, 0.12], [2.58, 0.2], [2.24, 0.265], [2.12, 0.24], [2.1, 0.05]], 0.012, 0.946 * s), mat.white);
    add(fw, plate([[2.58, 0.06], [2.46, 0.18], [2.34, 0.18], [2.44, 0.06]], 0.004, 0.955 * s), mat.red);
    add(fw, box(0.58, 0.012, 0.09, 2.38, 0.05, 0.905 * s), mat.carbon);
    add(fw, box(0.34, 0.11, 0.01, 2.43, 0.2, 0.16 * s), mat.carbon);
  });
  [0.07, -0.07].forEach((z) => add(fw, plate([[2.74, 0.18], [2.78, 0.245], [2.56, 0.26], [2.58, 0.18]], 0.01, z), mat.carbon));

  const rw = part('rear-wing', 'aero', [-0.75, 0.3, 0], [-0.3, 0.1, 0]);
  const RZ = span(-0.56, 0.56, 14);
  add(rw, wing(RZ, () => ({ le: [-2.06, 0.79], chord: 0.3, aoa: 9, thick: 0.12 }), 0.1), mat.carbon);
  [[-2.33, 0.862, 0.17, 27, 3, mat.red], [-2.47, 0.94, 0.13, 46, 5, mat.white]].forEach(([x, y, chord, aoa, open, m]) => {
    const pivot = new THREE.Group();
    const me = new THREE.Mesh(wing(RZ, () => ({ le: [0, 0], chord, aoa, thick: 0.1 }), 0.09), m); me.castShadow = true; pivot.add(me);
    pivot.position.set(x, y, 0); rw.add(pivot);
    flaps.push({ pivot, open: (-(aoa - open) * Math.PI) / 180 });
  });
  [1, -1].forEach((s) => {
    const EP = [[-2.0, 0.5], [-1.97, 0.86], [-2.02, 1.005], [-2.62, 1.005], [-2.63, 0.7], [-2.5, 0.46], [-2.32, 0.33], [-2.14, 0.33]];
    add(rw, plate(EP, 0.012, 0.572 * s), mat.carbon);
    add(rw, plate([[-2.16, 0.4], [-2.14, 0.84], [-2.6, 0.84], [-2.61, 0.7], [-2.5, 0.5], [-2.36, 0.4]], 0.004, 0.581 * s), mat.white); // painted outer face
    add(rw, box(0.6, 0.12, 0.004, -2.32, 0.93, 0.581 * s), mat.red);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshBasicMaterial({ map: labelTexture([['SINGHA', 78, BLACK, 128, false]]), transparent: true, toneMapped: false }));
    lab.position.set(-2.38, 0.62, 0.5845 * s); lab.rotation.y = s > 0 ? 0 : Math.PI; rw.add(lab);
  });
  add(rw, plate([[-1.86, 0.36], [-1.96, 0.36], [-2.2, 0.76], [-2.3, 0.84], [-2.12, 0.84], [-2.02, 0.72]], 0.03), mat.carbon);
  add(rw, loft([{ x: -2.1, w: 0.02, y0: 0.82, y1: 0.86 }, { x: -2.3, w: 0.035, y0: 0.86, y1: 0.93 }, { x: -2.5, w: 0.02, y0: 0.95, y1: 0.99 }], { segs: 14, sub: 4 }), mat.carbon);

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
    const core = new THREE.Group(); core.position.set(-0.08, 0.335, 0.5 * s); core.rotation.set(0, 0.52 * s, 0.3); rad.add(core);
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
  add(steer, cylZ(0.022, 0.36, 1.84, 0.36, 0, 14), mat.steel);             // rack
  add(steer, tube([V(1.84, 0.37, 0), V(1.3, 0.45, 0), V(0.7, 0.56, 0), V(0.43, 0.6, 0)], 0.014, 16), mat.titan); // column
  [1, -1].forEach((s) => { add(steer, cylX(0.016, 0.24, 1.5, 0.43, 0.06 * s, 12), mat.gold); add(steer, box(0.012, 0.14, 0.05, 1.28, 0.2, 0.06 * s), mat.titan); }); // dampers, pedals

  const wheels = [];
  const side = sidewallTexture();
  const mkWheel = (w) => {
    const g = new THREE.Group(), hw = w / 2;
    const prof = [[0.232, -hw + 0.02], [0.262, -hw + 0.004], [0.31, -hw], [0.342, -hw + 0.02], [0.358, -hw + 0.06], [0.36, -hw + 0.11], [0.36, hw - 0.11], [0.358, hw - 0.06], [0.342, hw - 0.02], [0.31, hw], [0.262, hw - 0.004], [0.232, hw - 0.02]];
    const tyre = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, a]) => new THREE.Vector2(r, a)), 72).rotateX(Math.PI / 2), mat.rubber); tyre.castShadow = true; g.add(tyre);
    const mark = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.345, 72), new THREE.MeshBasicMaterial({ map: side, transparent: true, depthWrite: false }));
    mark.position.z = hw + 0.0015; g.add(mark);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.236, 0.236, w - 0.03, 48, 1, true).rotateX(Math.PI / 2), mat.rim));   // barrel
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.234, 0.008, 8, 48).translate(0, 0, hw - 0.012), mat.rim));                // outer lip
    // ten-spoke open wheel with a yellow centre nut
    for (let i = 0; i < 10; i++) {
      const sp = new THREE.Mesh(box(0.012, 0.19, 0.03, 0, 0.14, hw - 0.06), mat.rim); sp.rotation.z = (i / 10) * Math.PI * 2; g.add(sp);
      const sp2 = new THREE.Mesh(box(0.008, 0.2, 0.022, 0, 0.135, hw - 0.09), mat.rim); sp2.rotation.z = ((i + 0.5) / 10) * Math.PI * 2; g.add(sp2);
    }
    g.add(new THREE.Mesh(cylZ(0.055, 0.07, 0, 0, hw - 0.06, 20), mat.rim));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.05, 6).rotateX(Math.PI / 2).translate(0, 0, hw - 0.015), mat.yellow));
    return g;
  };
  [{ n: 'fr', x: 1.7, s: 1, w: 0.29, front: true }, { n: 'fl', x: 1.7, s: -1, w: 0.29, front: true }, { n: 'rr', x: -1.7, s: 1, w: 0.375 }, { n: 'rl', x: -1.7, s: -1, w: 0.375 }].forEach((c) => {
    const fx = c.front ? 0.12 : -0.12;
    const grp = part('wheel-' + c.n, 'whl', [fx, 0, 0.74 * c.s], [fx * 0.6, 0, 0.3 * c.s]);
    const zc = c.s * (0.95 - c.w / 2), wh = mkWheel(c.w);
    if (c.s < 0) wh.rotation.y = Math.PI;
    const st = new THREE.Group(); st.position.set(c.x, 0.36, zc); st.add(wh); grp.add(st);
    wheels.push({ steer: st, wh, front: !!c.front, s: c.s });

    const sus = part('sus-' + c.n, 'sus', [fx * 0.4, 0, 0.26 * c.s], [0, 0, 0.1 * c.s]);
    const zi = c.s * (0.95 - c.w - 0.02), P = (x, y, z) => V(x, y, z * c.s);
    const arms = c.front
      ? [[V(1.7, 0.5, zi), P(2.0, 0.375, 0.125)], [V(1.7, 0.5, zi), P(1.3, 0.47, 0.2)], [V(1.7, 0.2, zi), P(2.02, 0.19, 0.12)], [V(1.7, 0.2, zi), P(1.25, 0.13, 0.2)], [V(1.7, 0.22, zi), P(1.52, 0.46, 0.17)], [V(1.84, 0.4, zi), P(1.84, 0.37, 0.16)]]
      : [[V(-1.7, 0.5, zi), P(-1.36, 0.4, 0.17)], [V(-1.7, 0.5, zi), P(-2.0, 0.34, 0.085)], [V(-1.7, 0.2, zi), P(-1.36, 0.14, 0.17)], [V(-1.7, 0.2, zi), P(-2.02, 0.2, 0.08)], [V(-1.7, 0.47, zi), P(-1.5, 0.14, 0.16)]];
    arms.forEach(([a, b], i) => add(sus, blade(a, b, i > 3 ? 0.03 : 0.05), mat.carbon));
    add(sus, box(0.09, 0.34, 0.05, c.x, 0.35, zi + 0.02 * c.s), mat.titan);  // upright

    const brk = part('brk-' + c.n, 'brk', [fx * 0.7, 0, 0.5 * c.s], [0, 0, 0.16 * c.s]);
    const bz = zc - c.s * (c.w / 2 - 0.1);
    add(brk, cylZ(0.165, 0.032, c.x, 0.36, bz, 48), mat.disc);               // carbon disc
    add(brk, cylZ(0.168, 0.006, c.x, 0.36, bz, 48), std({ color: 0x3a2a22, roughness: 0.5, metalness: 0.4 }));
    add(brk, cylZ(0.07, 0.05, c.x, 0.36, bz, 24), mat.titan);                // bell
    const cal = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 8, 12, 1.1).rotateZ(c.front ? -0.2 : 2.4), mat.red); cal.scale.z = 1.7; cal.position.set(c.x, 0.36, bz); cal.castShadow = true; brk.add(cal);
    add(brk, new THREE.CylinderGeometry(0.21, 0.225, c.w * 0.5, 36, 1, true).rotateX(Math.PI / 2).translate(c.x, 0.36, bz - 0.02 * c.s), mat.carbon); // brake drum shroud
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
  hero: { pos: [4.6, 1.55, 4.9], tgt: [0.1, 0.36, 0] }, side: { pos: [0.1, 0.9, 7.4], tgt: [0.1, 0.4, 0] },
  front: { pos: [7.2, 1.0, 0.01], tgt: [0, 0.42, 0] }, rear: { pos: [-6.4, 1.7, 2.6], tgt: [0, 0.44, 0] }, top: { pos: [0.15, 8.6, 0.01], tgt: [0.15, 0, 0] },
  fw: { pos: [4.7, 1.0, 2.3], tgt: [2.4, 0.2, 0] }, rw: { pos: [-4.6, 1.5, 2.2], tgt: [-2.2, 0.7, 0] }, puh: { pos: [-2.4, 2.3, 3.6], tgt: [-0.9, 0.3, 0] },
  ck: { pos: [2.2, 1.9, 2.1], tgt: [0.15, 0.6, 0] }, ty: { pos: [-3.2, 0.75, 3.3], tgt: [-1.7, 0.36, 0.76] }, fl: { pos: [1.4, 0.55, 4.2], tgt: [-0.3, 0.15, 0.4] },
  // system views
  pu: { pos: [-4.9, 2.7, 3.9], tgt: [-1.45, 0.4, 0] }, ers: { pos: [-1.6, 1.5, -3.0], tgt: [-0.6, 0.16, -0.1] }, fuel: { pos: [1.6, 1.7, 2.6], tgt: [-0.5, 0.35, 0] },
  cool: { pos: [1.6, 1.4, 3.2], tgt: [-0.15, 0.32, 0.3] }, gbx: { pos: [-4.2, 1.5, 2.0], tgt: [-1.75, 0.3, 0] }, sus: { pos: [4.4, 1.6, 2.8], tgt: [1.6, 0.34, 0] },
  brk: { pos: [3.4, 0.9, 3.4], tgt: [1.7, 0.36, 0.7] }, aero: { pos: [5.2, 2.3, 4.4], tgt: [0, 0.4, 0] }, cell: { pos: [3.4, 2.0, 3.0], tgt: [0.7, 0.4, 0] }, whl: { pos: [3.2, 0.8, 3.6], tgt: [1.7, 0.36, 0.8] },
};
VIEWS.xray = VIEWS.puh;
const ANCHORS = { fw: [2.45, 0.3, 0.6], rw: [-2.3, 1.0, 0], pu: [-1.0, 0.8, 0], ck: [0.25, 0.86, 0], ty: [-1.7, 0.74, 0.76], fl: [-0.4, 0.09, 0.8] };

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
  $$('[data-aero]').forEach((b) => b.addEventListener('click', () => { st.aeroT = b.dataset.aero === 'straight' ? 1 : 0; on('[data-aero]', 'aero', b.dataset.aero); ui.dataset.aeroMode = b.dataset.aero; }));
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
    grid.position.x = -((st.roll * 0.36) % 0.5);

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

const fontsReady = (document.fonts && document.fonts.load ? Promise.all([document.fonts.load('italic 900 100px Archx'), document.fonts.load('800 60px Archx')]) : Promise.resolve()).catch(() => {});
document.querySelectorAll('[data-car3d]').forEach((el) => {
  // the livery is painted with the site typeface, so wait for it before building
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); fontsReady.then(() => mount(el)); } }, { rootMargin: '400px' });
  io.observe(el);
});
