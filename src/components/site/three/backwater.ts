import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { Water } from "three/addons/objects/Water.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * A Kerala backwater in 3D, travelled by scroll across one day: dawn mist,
 * a bright morning, the heat of midday, a gold evening at the lake with its
 * Chinese fishing nets, then night with lamps and fireflies on the water.
 * Everything is generated in code (no downloaded models), seeded so it is
 * the same on every visit. `update(progress, seconds)` moves the camera and
 * the sun; the caller owns the animation loop.
 */

const TAU = Math.PI * 2;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function seeded(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// The canal: a gentle S-curve that opens into a lake near the end.
const START_Z = 40;
const END_Z = -470;
const LAKE_Z = -400;
const centre = (z: number) => 7 * Math.sin(z * 0.011) + 3 * Math.sin(z * 0.029 + 1.3);
const halfWidth = (z: number) => lerp(12 + 3 * Math.sin(z * 0.021), 90, smooth(LAKE_Z, LAKE_Z - 60, z));

/** Keyframed values across the day, interpolated smoothly. */
function track<T extends number[]>(keys: [number, ...T][], p: number): T {
  let i = 0;
  while (i < keys.length - 2 && p > keys[i + 1][0]) i++;
  const [p0, ...a] = keys[i];
  const [p1, ...b] = keys[i + 1];
  const t = smooth(p0, p1, p);
  return a.map((v, k) => lerp(v, b[k], t)) as T;
}

// [progress, sun elevation°, sun azimuth°, exposure, fog density]
const SUN: [number, number, number, number, number][] = [
  [0, 2.5, 180, 0.62, 0.012],
  [0.22, 14, 135, 0.5, 0.006],
  [0.45, 42, 75, 0.42, 0.004],
  [0.6, 13, 160, 0.48, 0.006],
  [0.72, 3.5, 185, 0.6, 0.008],
  [0.8, 0.5, 190, 0.62, 0.01],
  [0.88, -3, 190, 0.5, 0.012],
  [1, -7, 190, 0.5, 0.012],
];
// [progress, fog r, g, b, night amount]
const AIR: [number, number, number, number, number][] = [
  [0, 0.86, 0.74, 0.62, 0],
  [0.22, 0.78, 0.84, 0.8, 0],
  [0.45, 0.72, 0.84, 0.88, 0],
  [0.6, 0.84, 0.8, 0.7, 0],
  [0.72, 0.92, 0.66, 0.46, 0],
  [0.8, 0.9, 0.55, 0.38, 0.1],
  [0.88, 0.32, 0.26, 0.3, 0.6],
  [1, 0.05, 0.08, 0.13, 1],
];

// ---------------------------------------------------------------------------
// Textures, drawn on canvases at start-up
// ---------------------------------------------------------------------------

function waterNormals(size = 256) {
  const rand = seeded(7);
  const waves = Array.from({ length: 12 }, () => ({
    kx: Math.round(lerp(-6, 6, rand())),
    ky: Math.round(lerp(1, 7, rand())),
    phase: rand() * TAU,
    amp: lerp(0.3, 1, rand()),
  }));
  const height = (x: number, y: number) =>
    waves.reduce((h, w) => h + w.amp * Math.sin(((w.kx * x + w.ky * y) / size) * TAU + w.phase), 0);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = height(x + 1, y) - height(x - 1, y);
      const dy = height(x, y + 1) - height(x, y - 1);
      const n = new THREE.Vector3(-dx * 0.35, -dy * 0.35, 1).normalize();
      const i = (y * size + x) * 4;
      img.data[i] = (n.x * 0.5 + 0.5) * 255;
      img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
      img.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** A coconut frond: a rib with dense, slightly drooping leaflets, on transparency. */
function frondTexture() {
  const w = 128;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const rand = seeded(11);
  ctx.lineCap = "round";
  for (let y = h - 6; y > 4; y -= 5) {
    const s = 1 - y / h; // 0 at the base, 1 at the tip
    const reach = (w / 2 - 4) * Math.sin(Math.PI * Math.min(1, s * 1.15 + 0.05));
    for (const side of [-1, 1]) {
      const g = 120 + rand() * 50;
      ctx.strokeStyle = `rgb(${70 + rand() * 40}, ${g}, ${36 + rand() * 24})`;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(w / 2, y);
      ctx.quadraticCurveTo(w / 2 + side * reach * 0.5, y - 6, w / 2 + side * reach, y - 20 - rand() * 6);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = "#9a9254";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(w / 2, h);
  ctx.lineTo(w / 2, 0);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function glowTexture(inner: string, outer: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, inner);
  g.addColorStop(0.25, outer);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function mistTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const rand = seeded(5);
  for (let i = 0; i < 40; i++) {
    const x = rand() * 256;
    const y = 40 + rand() * 48;
    const r = 20 + rand() * 50;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.22)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function netTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.strokeStyle = "rgba(20,24,22,0.9)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 128; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 128);
    ctx.moveTo(0, i);
    ctx.lineTo(128, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/** One coconut palm, leaning towards +x: a tapered trunk, coconuts and a crown of fronds. */
function palmGeometry(rand: () => number, minH = 9, maxH = 16) {
  const height = lerp(minH, maxH, rand());
  const lean = lerp(1.5, 5.5, rand()) * (height / 12);
  const bend = lerp(0.2, 0.7, rand());
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(lean * bend * 0.5, height * 0.35, 0),
    new THREE.Vector3(lean * 0.8, height * 0.7, 0),
    new THREE.Vector3(lean, height, 0),
  ]);
  const segs = 20;
  const radial = 7;
  const trunk = new THREE.TubeGeometry(curve, segs, 0.24, radial, false);
  const pos = trunk.attributes.position;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const c = curve.getPointAt(t);
    const scale = (1 - 0.42 * t) * (t < 0.06 ? lerp(1.7, 1, t / 0.06) : 1) * (1 + 0.05 * Math.sin(t * 90));
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      pos.setXYZ(k, c.x + (pos.getX(k) - c.x) * scale, c.y + (pos.getY(k) - c.y) * scale, c.z + (pos.getZ(k) - c.z) * scale);
    }
  }
  trunk.computeVertexNormals();
  const crown = curve.getPointAt(1);
  const trunkParts: THREE.BufferGeometry[] = [trunk];
  for (let i = 0; i < 5; i++) {
    const nut = new THREE.IcosahedronGeometry(0.2, 0);
    const a = (i / 5) * TAU;
    nut.translate(crown.x + Math.cos(a) * 0.3, crown.y - 0.35, crown.z + Math.sin(a) * 0.3);
    trunkParts.push(nut);
  }

  const fronds: THREE.BufferGeometry[] = [];
  const count = 15 + Math.floor(rand() * 5);
  for (let f = 0; f < count; f++) {
    const yaw = (f / count) * TAU + rand() * 0.4;
    const pitch = lerp(0.9, -0.35, (f % 5) / 4) + rand() * 0.2; // young fronds up, old ones drooping
    const length = lerp(3.6, 5.2, rand());
    const dir = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const steps = 12;
    const positions: number[] = [];
    const uvs: number[] = [];
    const index: number[] = [];
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const out = Math.cos(pitch) * u * length;
      const up = Math.sin(pitch) * u * length - 1.1 * u * u * length * 0.45;
      const spine = crown.clone().addScaledVector(dir, out).add(new THREE.Vector3(0, up, 0));
      const halfW = 0.75 * Math.sin(Math.PI * Math.min(1, u * 1.1 + 0.08));
      const sag = 0.35 * halfW;
      for (const [k, edge] of [[0, -1], [1, 0], [2, 1]] as const) {
        const p = spine.clone().addScaledVector(side, edge * halfW);
        if (edge !== 0) p.y -= sag;
        positions.push(p.x, p.y, p.z);
        uvs.push(k / 2, u);
      }
      if (s < steps) {
        const a = s * 3;
        index.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(index);
    g.computeVertexNormals();
    fronds.push(g);
  }
  return { trunk: mergeGeometries(trunkParts.map((g) => g.toNonIndexed())), fronds: mergeGeometries(fronds) };
}

/** A kettuvallam: a long wooden hull curving up at both ends under an arched thatch roof. */
function houseboat(wood: THREE.Material, thatch: THREE.Material, glass: THREE.Material) {
  const group = new THREE.Group();
  const hull = new THREE.BoxGeometry(16, 1.3, 3.4, 40, 1, 6);
  const p = hull.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / 8;
    p.setY(i, p.getY(i) + Math.pow(Math.abs(x), 5) * 2.4);
    p.setZ(i, p.getZ(i) * (1 - Math.pow(Math.abs(x), 3) * 0.75));
  }
  hull.computeVertexNormals();
  const hullMesh = new THREE.Mesh(hull, wood);
  hullMesh.position.y = 0.35;
  group.add(hullMesh);
  const roof = new THREE.CylinderGeometry(2, 2, 10, 18, 1, true, 0, Math.PI);
  roof.rotateZ(Math.PI / 2);
  roof.rotateX(Math.PI / 2);
  const roofMesh = new THREE.Mesh(roof, thatch);
  roofMesh.rotation.x = -Math.PI / 2;
  roofMesh.position.y = 1.1;
  roofMesh.scale.set(1, 0.85, 1);
  group.add(roofMesh);
  for (const x of [-3.6, -1.2, 1.2, 3.6]) {
    for (const z of [-1.62, 1.62]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), glass);
      win.position.set(x, 1.55, z);
      win.rotation.y = z > 0 ? 0 : Math.PI;
      group.add(win);
    }
  }
  return group;
}

// ---------------------------------------------------------------------------
// The scene
// ---------------------------------------------------------------------------

export type Backwater = {
  update: (progress: number, seconds: number) => void;
  resize: (width: number, height: number) => void;
  /** Lower the resolution when frames are slow. */
  setPixelRatio: (ratio: number) => void;
  /** True for software WebGL (no GPU): the caller should only draw on scroll. */
  software: boolean;
  dispose: () => void;
};

export function createBackwater(canvas: HTMLCanvasElement, { lite = false } = {}): Backwater {
  const rand = seeded(20261103);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lite ? 1.25 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xeecba8, 0.02);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.3, 3000);

  // Sky and sun
  const sky = new Sky();
  sky.scale.setScalar(4000);
  const skyU = sky.material.uniforms;
  skyU.turbidity.value = 10;
  skyU.rayleigh.value = 1.2;
  skyU.mieCoefficient.value = 0.008;
  skyU.mieDirectionalG.value = 0.86;
  skyU.cloudCoverage.value = 0.32;
  skyU.cloudDensity.value = 0.35;
  scene.add(sky);
  const sun = new THREE.Vector3();
  const sunLight = new THREE.DirectionalLight(0xffffff, 2);
  scene.add(sunLight, sunLight.target);
  const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x2a3a22, 1);
  scene.add(hemi);

  // A deep blue night sky, faded in over the physical sky after dusk
  const nightMat = new THREE.ShaderMaterial({
    uniforms: { opacity: { value: 0 } },
    vertexShader: "varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform float opacity; varying vec3 vDir; void main() { float h = clamp(vDir.y, 0.0, 1.0); vec3 c = mix(vec3(0.07, 0.11, 0.2), vec3(0.008, 0.012, 0.03), pow(h, 0.5)); gl_FragColor = vec4(c, opacity); }",
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const nightSky = new THREE.Mesh(new THREE.SphereGeometry(2500, 32, 16), nightMat);
  nightSky.renderOrder = -1; // behind the stars and every other transparent thing
  scene.add(nightSky);

  // Stars for the night
  const starGeo = new THREE.BufferGeometry();
  const stars: number[] = [];
  for (let i = 0; i < 1500; i++) {
    const a = rand() * TAU;
    const e = Math.asin(lerp(0.05, 1, rand()));
    stars.push(Math.cos(e) * Math.cos(a) * 1500, Math.sin(e) * 1500, Math.cos(e) * Math.sin(a) * 1500);
  }
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(stars, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xfff6e0, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  scene.add(new THREE.Points(starGeo, starMat));

  // Water
  // Far larger than the view so it meets the haze, not the sky dome, at the horizon.
  const water = new Water(new THREE.PlaneGeometry(30000, 30000), {
    textureWidth: lite ? 256 : 512,
    textureHeight: lite ? 256 : 512,
    waterNormals: waterNormals(),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x1d2d25,
    distortionScale: 0.9,
    fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  water.material.uniforms.size.value = 3.5;
  scene.add(water);

  // Land: a height field that dips below the water along the canal and the lake.
  const landW = 420;
  const landL = 640;
  const land = new THREE.PlaneGeometry(landW, landL, lite ? 100 : 180, lite ? 160 : 300);
  land.rotateX(-Math.PI / 2);
  land.translate(0, 0, (START_Z + 60 + END_Z - 120) / 2);
  const lp = land.attributes.position;
  const colors: number[] = [];
  const mud = new THREE.Color(0x2a2a1a);
  const grass = new THREE.Color(0x2e4a22);
  const deep = new THREE.Color(0x1b2e18);
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i);
    const z = lp.getZ(i);
    const d = Math.abs(x - centre(z)) - halfWidth(z);
    const n = Math.sin(x * 0.13) * Math.cos(z * 0.11) * 0.25 + Math.sin(x * 0.41 + z * 0.37) * 0.12;
    const y = d < 0 ? -2.5 : smooth(0, 2.5, d) * 0.9 + n + smooth(30, 120, d) * 3;
    lp.setY(i, y);
    const c = d < 1.5 ? mud : grass.clone().lerp(deep, smooth(0, 1, n + 0.4));
    colors.push(c.r, c.g, c.b);
  }
  land.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  land.computeVertexNormals();
  scene.add(new THREE.Mesh(land, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));
  const groundAt = (x: number, z: number) => {
    const d = Math.abs(x - centre(z)) - halfWidth(z);
    return d < 0 ? 0 : smooth(0, 2.5, d) * 0.9;
  };

  // Palms, instanced from a handful of variants
  const frondMat = new THREE.MeshStandardMaterial({ map: frondTexture(), alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.7, color: 0xffffff });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8c7b66, roughness: 0.95 });
  const variants = Array.from({ length: lite ? 4 : 6 }, () => palmGeometry(rand));
  const placements: THREE.Matrix4[][] = variants.map(() => []);
  const dummy = new THREE.Object3D();
  const place = (x: number, z: number, towardsWater: number, scale: number) => {
    dummy.position.set(x, groundAt(x, z) - 0.1, z);
    // Variants lean towards +x; turn them to face the water (or anywhere, inland).
    dummy.rotation.set(0, towardsWater + lerp(-0.5, 0.5, rand()), 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    placements[Math.floor(rand() * variants.length)].push(dummy.matrix.clone());
  };
  for (let z = START_Z + 30; z > END_Z - 60; z -= lerp(4, 8, rand())) {
    for (const side of [-1, 1]) {
      const edge = centre(z) + side * halfWidth(z);
      if (z > LAKE_Z - 20 || rand() > 0.55) place(edge + side * lerp(0.6, 3, rand()), z, side > 0 ? Math.PI : 0, lerp(0.85, 1.2, rand()));
      // Groves behind the bank, thinning out with distance (fog hides the rest).
      for (let k = 0; k < 2; k++) if (rand() > 0.1) place(edge + side * lerp(5, 24, rand()), z + lerp(-3, 3, rand()), rand() * TAU, lerp(0.8, 1.15, rand()));
      if (!lite) for (let k = 0; k < 2; k++) place(edge + side * lerp(24, 70, rand()), z + lerp(-3, 3, rand()), rand() * TAU, lerp(0.9, 1.25, rand()));
      if (!lite && rand() > 0.4) place(edge + side * lerp(70, 150, rand()), z, rand() * TAU, lerp(1, 1.4, rand()));
    }
  }
  variants.forEach((v, i) => {
    for (const [geo, mat] of [[v.trunk, trunkMat], [v.fronds, frondMat]] as const) {
      const mesh = new THREE.InstancedMesh(geo, mat, placements[i].length);
      placements[i].forEach((m, k) => mesh.setMatrixAt(k, m));
      scene.add(mesh);
    }
  });

  // Undergrowth: young coconut palms and ferny shrubs crowding the banks
  const young = Array.from({ length: 3 }, () => palmGeometry(rand, 0.3, 1.6));
  const youngAt: THREE.Matrix4[][] = young.map(() => []);
  for (let z = START_Z + 30; z > END_Z - 60; z -= lerp(1.4, 3, rand())) {
    for (const side of [-1, 1]) {
      const x = centre(z) + side * (halfWidth(z) + lerp(0.2, 6, rand()));
      dummy.position.set(x, groundAt(x, z) - 0.1, z);
      dummy.rotation.set(0, rand() * TAU, 0);
      dummy.scale.setScalar(lerp(0.7, 1.3, rand()));
      dummy.updateMatrix();
      youngAt[Math.floor(rand() * young.length)].push(dummy.matrix.clone());
    }
  }
  young.forEach((v, i) => {
    for (const [geo, mat] of [[v.trunk, trunkMat], [v.fronds, frondMat]] as const) {
      const mesh = new THREE.InstancedMesh(geo, mat, youngAt[i].length);
      youngAt[i].forEach((m, k) => mesh.setMatrixAt(k, m));
      scene.add(mesh);
    }
  });

  // Houses with tiled roofs, each with a lamp by the water that lights at dusk
  const lampTex = glowTexture("rgba(255,236,190,1)", "rgba(255,170,80,0.5)");
  const lamps: THREE.Sprite[] = [];
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd9d0bf, roughness: 0.9 });
  const tileMat = new THREE.MeshStandardMaterial({ color: 0x8e4326, roughness: 0.8 });
  for (let z = START_Z - 20; z > LAKE_Z; z -= lerp(28, 46, rand())) {
    const side = rand() > 0.5 ? 1 : -1;
    const x = centre(z) + side * (halfWidth(z) + lerp(5, 9, rand()));
    const y = groundAt(x, z);
    const house = new THREE.Group();
    const walls = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 5), wallMat);
    walls.position.y = 1.5;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 2.6, 4), tileMat);
    roof.position.y = 4.2;
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.15, 1, 1);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), windowMat);
    win.position.set(-side * 3.01, 1.6, 0);
    win.rotation.y = -side * Math.PI / 2;
    house.add(walls, roof, win);
    house.position.set(x, y, z);
    scene.add(house);
    const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: lampTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    lamp.position.set(centre(z) + side * (halfWidth(z) + 0.6), 1.1, z + lerp(-2, 2, rand()));
    lamp.scale.setScalar(2.2);
    scene.add(lamp);
    lamps.push(lamp);
  }

  // Two kettuvallams: one moored on the way, one drifting at the lake
  const wood = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.7 });
  const thatch = new THREE.MeshStandardMaterial({ color: 0x8a6a3c, roughness: 1, side: THREE.DoubleSide });
  const boatA = houseboat(wood, thatch, windowMat);
  boatA.position.set(centre(-250) + halfWidth(-250) - 3.5, 0, -250);
  boatA.rotation.y = Math.PI / 2 + 0.05;
  const boatB = houseboat(wood, thatch, windowMat);
  boatB.position.set(centre(-430) - 22, 0, -440);
  boatB.rotation.y = Math.PI / 2 - 0.4;
  scene.add(boatA, boatB);

  // Chinese fishing nets along the lake shore
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b241c, roughness: 1 });
  const netMat = new THREE.MeshBasicMaterial({ map: netTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false, color: 0x202420 });
  for (const [i, nz] of [-426, -440, -455].entries()) {
    const net = new THREE.Group();
    const pole = (len: number, rx: number, rz: number, x: number, y: number) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, len, 5), poleMat);
      m.position.set(x, y, 0);
      m.rotation.set(rx, 0, rz);
      net.add(m);
    };
    pole(14, 0, -0.9, 5, 5); // the boom, reaching out over the water
    pole(9, 0.5, 0.3, 0, 4);
    pole(9, -0.5, 0.3, 0, 4);
    for (const a of [-1, 1]) for (const b of [-1, 1]) pole(7, a * 0.45, b * 0.45, 10.5, 6.5);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(8, 8, 8, 8), netMat);
    const np = mesh.geometry.attributes.position;
    for (let k = 0; k < np.count; k++) np.setZ(k, -0.12 * (16 - np.getX(k) ** 2 - np.getY(k) ** 2));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(10.5, 3.6, 0);
    net.add(mesh);
    // On the right bank, booms reaching out over the water towards the canoe's path.
    const shoreX = centre(nz) + halfWidth(nz) + 1;
    net.position.set(shoreX, 0, nz);
    net.rotation.y = Math.PI + 0.15 * (i - 1);
    scene.add(net);
  }

  // Mist lying on the water
  const mistMat = new THREE.MeshBasicMaterial({ map: mistTexture(), transparent: true, depthWrite: false, opacity: 0.5, color: 0xffffff });
  const mists: THREE.Mesh[] = [];
  for (let z = START_Z; z > END_Z; z -= 22) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(lerp(50, 90, rand()), lerp(18, 30, rand())), mistMat.clone());
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = lerp(-0.4, 0.4, rand());
    m.position.set(centre(z) + lerp(-8, 8, rand()), lerp(0.15, 0.45, rand()), z);
    mists.push(m);
    scene.add(m);
  }

  // Egrets crossing the morning sky
  const birdMat = new THREE.MeshBasicMaterial({ color: 0xf4f1ea, side: THREE.DoubleSide, fog: true });
  const birds: { wingL: THREE.Mesh; wingR: THREE.Mesh; group: THREE.Group; offset: number }[] = [];
  const wing = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -0.25), new THREE.Vector3(0, 0, 0.3), new THREE.Vector3(1.3, 0, 0.05)]);
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.1, 5), birdMat);
    body.rotation.x = Math.PI / 2;
    const wingL = new THREE.Mesh(wing, birdMat);
    const wingR = new THREE.Mesh(wing, birdMat);
    wingR.scale.x = -1;
    g.add(body, wingL, wingR);
    g.position.set(lerp(-30, 30, rand()), lerp(12, 22, rand()), lerp(-40, -110, rand()));
    birds.push({ wingL, wingR, group: g, offset: rand() * TAU });
    scene.add(g);
  }

  // A lakeside temple whose walls are lined with oil lamps (chuttuvilakku), lit at night
  const TEMPLE = new THREE.Vector3(centre(-480) - 34, 0, -492);
  const stone = new THREE.MeshStandardMaterial({ color: 0x3b362e, roughness: 1 });
  const ghat = new THREE.Mesh(new THREE.BoxGeometry(40, 1.2, 14), stone);
  ghat.position.set(TEMPLE.x, 0.4, TEMPLE.z - 4);
  // Dark timber walls under two tiers of sloping tiled roof, as Kerala temples are built
  const timber = new THREE.MeshStandardMaterial({ color: 0x2a1e16, roughness: 0.9 });
  const hall = new THREE.Mesh(new THREE.BoxGeometry(22, 4.6, 9), timber);
  hall.position.set(TEMPLE.x, 3.3, TEMPLE.z - 6);
  const lowerRoof = new THREE.Mesh(new THREE.CylinderGeometry(9, 17.5, 2.6, 4, 1), tileMat);
  lowerRoof.rotation.y = Math.PI / 4;
  lowerRoof.scale.set(1, 1, 0.55);
  lowerRoof.position.set(TEMPLE.x, 6.9, TEMPLE.z - 6);
  const upperRoof = new THREE.Mesh(new THREE.ConeGeometry(10, 4.2, 4), tileMat);
  upperRoof.rotation.y = Math.PI / 4;
  upperRoof.scale.set(1, 1, 0.55);
  upperRoof.position.set(TEMPLE.x, 10.2, TEMPLE.z - 6);
  scene.add(ghat, hall, lowerRoof, upperRoof);
  const templeLamps: THREE.Sprite[] = [];
  const templeLampMat = new THREE.SpriteMaterial({ map: lampTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let row = 0; row < 5; row++) {
    for (let k = 0; k < 34; k++) {
      const l = new THREE.Sprite(templeLampMat);
      l.position.set(TEMPLE.x - 10.5 + k * (21 / 33), 1.6 + row * 0.8, TEMPLE.z - 1.4);
      l.scale.setScalar(1.5);
      scene.add(l);
      templeLamps.push(l);
    }
  }
  for (let k = 0; k < 18; k++) {
    const l = new THREE.Sprite(templeLampMat);
    l.position.set(TEMPLE.x - 18 + k * 2.1, 1.25, TEMPLE.z + 2.6);
    l.scale.setScalar(2.4);
    scene.add(l);
  }
  const moonMat = new THREE.SpriteMaterial({ map: glowTexture("rgba(255,255,250,1)", "rgba(200,215,255,0.35)"), transparent: true, opacity: 0, depthWrite: false, fog: false });
  const moon = new THREE.Sprite(moonMat);
  const moonDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 16), THREE.MathUtils.degToRad(205));
  moon.scale.setScalar(70);
  scene.add(moon);

  // Fireflies over the banks at night
  const flyGeo = new THREE.BufferGeometry();
  const flies: number[] = [];
  for (let i = 0; i < (lite ? 300 : 700); i++) {
    const z = lerp(START_Z, LAKE_Z, rand());
    const side = rand() > 0.5 ? 1 : -1;
    flies.push(centre(z) + side * (halfWidth(z) + lerp(-2, 10, rand())), lerp(0.4, 4, rand()), z);
  }
  for (let i = 0; i < 300; i++) flies.push(TEMPLE.x + lerp(-40, 40, rand()), lerp(0.5, 5, rand()), TEMPLE.z + lerp(-8, 30, rand()));
  flyGeo.setAttribute("position", new THREE.Float32BufferAttribute(flies, 3));
  const flyMat = new THREE.PointsMaterial({ map: glowTexture("rgba(255,255,200,1)", "rgba(200,255,120,0.4)"), size: 0.7, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  scene.add(new THREE.Points(flyGeo, flyMat));

  // ---------------------------------------------------------------------------

  const fog = scene.fog as THREE.FogExp2;
  const look = new THREE.Vector3();
  const fogColor = new THREE.Color();

  function update(progress: number, seconds: number) {
    const p = clamp(progress);

    // Camera: from above the water at first light, down to canoe height, then on up the canal.
    const z = lerp(START_Z, END_Z, smooth(0, 1, p) * 0.6 + p * 0.4);
    const height = lerp(9, 2.1, smooth(0, 0.16, p)) + 0.08 * Math.sin(seconds * 0.9);
    camera.position.set(centre(z) + 0.6 * Math.sin(seconds * 0.3), height, z);
    const ahead = z - 30;
    look.set(centre(ahead), lerp(1, 2.4, smooth(0, 0.16, p)), ahead);
    look.lerp(TEMPLE.clone().setY(4), smooth(0.86, 1, p) * 0.85);
    camera.lookAt(look);
    camera.rotation.z += 0.004 * Math.sin(seconds * 0.7);

    // The sun and the air through the day
    const [elev, azim, exposure, density] = track(SUN, p);
    const [fr, fg, fb, night] = track(AIR, p);
    sun.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elev), THREE.MathUtils.degToRad(azim));
    skyU.sunPosition.value.copy(sun);
    skyU.time.value = seconds;
    water.material.uniforms.sunDirection.value.copy(sun).lerp(moonDir, smooth(0.84, 0.92, p)).normalize();
    moon.position.copy(camera.position).addScaledVector(moonDir, 1200);
    moonMat.opacity = night;
    water.material.uniforms.time.value = seconds * 0.35;
    const warm = smooth(25, 0, elev);
    // Low sun: more scattering for a deep gold sky; high sun: a clear, hazy blue.
    skyU.rayleigh.value = lerp(1.1, 3.2, warm * (p > 0.5 ? 1 : 0.45));
    skyU.turbidity.value = lerp(9, p > 0.5 ? 4 : 10, warm);
    water.material.uniforms.sunColor.value.setRGB(1, lerp(1, 0.72, warm), lerp(1, 0.5, warm)).multiplyScalar(1 - night).add(new THREE.Color(0.55, 0.62, 0.8).multiplyScalar(night * 0.8));
    water.material.uniforms.waterColor.value.setRGB(lerp(0.11, 0.02, night), lerp(0.18, 0.04, night), lerp(0.15, 0.05, night));
    sunLight.position.copy(camera.position).addScaledVector(sun, 200);
    sunLight.target.position.copy(camera.position);
    sunLight.color.setRGB(1, lerp(0.95, 0.65, warm), lerp(0.9, 0.45, warm));
    sunLight.intensity = Math.max(0, lerp(0, 3, smooth(-3, 30, elev)));
    hemi.intensity = lerp(1.1, 0.04, night);
    renderer.toneMappingExposure = exposure;
    fogColor.setRGB(fr, fg, fb, THREE.SRGBColorSpace);
    fog.color.copy(fogColor);
    fog.density = density;

    // Mist at dawn, gone by midday, a little back at dusk
    const mist = Math.max(smooth(0.3, 0, p) * 0.55, smooth(0.6, 0.85, p) * (1 - night) * 0.25);
    for (const [i, m] of mists.entries()) {
      m.position.x += Math.sin(seconds * 0.05 + i) * 0.006;
      // Fade sheets out as the canoe reaches them, so their edges never show.
      (m.material as THREE.MeshBasicMaterial).opacity = mist * smooth(18, 45, Math.abs(m.position.z - camera.position.z));
    }

    // Night: stars, windows, lamps and fireflies
    starMat.opacity = night;
    nightMat.uniforms.opacity.value = night * 0.96;
    nightSky.position.copy(camera.position);
    windowMat.opacity = smooth(0.74, 0.9, p);
    for (const [i, l] of lamps.entries()) (l.material as THREE.SpriteMaterial).opacity = smooth(0.76, 0.9, p) * (0.85 + 0.15 * Math.sin(seconds * 6 + i));
    flyMat.opacity = smooth(0.86, 1, p) * (0.7 + 0.3 * Math.sin(seconds * 2.3));
    templeLampMat.opacity = smooth(0.8, 0.92, p) * (0.9 + 0.1 * Math.sin(seconds * 9));

    // Boats rock gently; egrets glide across the morning
    boatA.position.y = 0.05 * Math.sin(seconds * 0.8);
    boatA.rotation.z = 0.01 * Math.sin(seconds * 0.6);
    boatB.position.x += 0.004;
    for (const b of birds) {
      const flap = Math.sin(seconds * 4 + b.offset) * 0.5;
      b.wingL.rotation.z = flap;
      b.wingR.rotation.z = -flap;
      b.group.position.x += 0.03;
      b.group.position.z = z - 70 - b.offset * 8;
      b.group.visible = p < 0.5;
    }

    renderer.render(scene, camera);
  }

  function resize(width: number, height: number) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < height ? 70 : 55;
    camera.updateProjectionMatrix();
  }

  function dispose() {
    renderer.dispose();
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => x.dispose());
    });
  }

  const gl = renderer.getContext();
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const software = /swiftshader|llvmpipe|software|basic render/i.test(info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "");
  const setPixelRatio = (ratio: number) => {
    renderer.setPixelRatio(ratio);
    resize(canvas.clientWidth, canvas.clientHeight);
  };
  if (software) setPixelRatio(0.6);

  return { update, resize, setPixelRatio, software, dispose };
}
