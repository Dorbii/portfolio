import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

sharp.cache(false);
const SIZE = 512;
const CORE = SIZE - 1;
const PATCH_METRES = 64;
const DEFAULT_OUT = ".codex-tmp/qa/seabed-r1";
const arg = process.argv.indexOf("--out-dir");
const OUT = path.resolve(arg >= 0 ? process.argv[arg + 1] : DEFAULT_OUT);
if (arg >= 0 && !process.argv[arg + 1]) throw new Error("--out-dir requires a path");

let seed = 0x5eabed01;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
const clamp = (v, low = 0, high = 1) => Math.max(low, Math.min(high, v));
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const wrap = (v) => v - Math.floor(v);
const torusDelta = (a, b) => {
  const d = Math.abs(a - b);
  return Math.min(d, 1 - d);
};
const periodic = (x, y, frequency, phase) =>
  Math.sin((x * frequency + phase) * Math.PI * 2) *
  Math.cos((y * frequency * 0.83 - phase * 1.7) * Math.PI * 2);
const pointSegment = (x, y, ax, ay, bx, by) => {
  const vx = bx - ax, vy = by - ay;
  const t = clamp(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy));
  return Math.hypot(x - (ax + vx * t), y - (ay + vy * t));
};

const shelves = Array.from({ length: 17 }, () => ({
  x: random(), y: random(), rx: 0.035 + random() * 0.075,
  ry: 0.025 + random() * 0.055, height: 0.5 + random() * 1.45,
}));
const boulders = Array.from({ length: 31 }, () => ({
  x: random(), y: random(), radius: 0.008 + random() * 0.018,
  height: 0.25 + random() * 0.8,
}));

function floorAt(x, y) {
  const broad = periodic(x, y, 2, 0.17) * 0.10 + periodic(x, y, 5, 0.61) * 0.045;
  const channel = Math.abs(Math.sin((x * 1.65 + y * 0.72 + periodic(x, y, 2, 0.43) * 0.08) * Math.PI * 2));
  let shelf = 0;
  for (const rock of shelves) {
    const dx = torusDelta(x, rock.x) / rock.rx;
    const dy = torusDelta(y, rock.y) / rock.ry;
    shelf = Math.max(shelf, (1 - smooth(0.30, 1, Math.hypot(dx, dy))) * rock.height);
  }
  let stone = 0;
  for (const rock of boulders) {
    const d = Math.hypot(torusDelta(x, rock.x), torusDelta(y, rock.y)) / rock.radius;
    stone = Math.max(stone, (1 - smooth(0.15, 1, d)) * rock.height);
  }
  const channelMask = smooth(0.13, 0.42, channel);
  const rockHeight = (shelf + stone) * channelMask;
  return { height: clamp(0.18 + broad + rockHeight, 0, 3), rock: clamp(rockHeight / 1.25) };
}

const colors = [
  [56, 105, 101], [101, 65, 88], [158, 119, 60], [84, 112, 92],
];
const branches = [];
for (let cluster = 0; cluster < 13; cluster++) {
  const cx = 0.10 + random() * 0.80, cy = 0.10 + random() * 0.80;
  const color = colors[cluster % colors.length];
  const arms = 4 + Math.floor(random() * 4);
  for (let arm = 0; arm < arms; arm++) {
    const angle = random() * Math.PI * 2;
    const length = 0.025 + random() * 0.045;
    const bend = (random() - 0.5) * 0.028;
    const mx = cx + Math.cos(angle) * length * 0.55 - Math.sin(angle) * bend;
    const my = cy + Math.sin(angle) * length * 0.55 + Math.cos(angle) * bend;
    const ex = cx + Math.cos(angle) * length, ey = cy + Math.sin(angle) * length;
    const radius = 0.0028 + random() * 0.0024;
    branches.push({ points: [[cx, cy], [mx, my], [ex, ey]], radius, height: 0.75 + random() * 1.25, color });
    if (arm % 2 === 0) {
      const fork = angle + (random() > 0.5 ? 0.72 : -0.72);
      branches.push({ points: [[mx, my], [mx + Math.cos(fork) * length * 0.42, my + Math.sin(fork) * length * 0.42]], radius: radius * 0.72, height: 0.55 + random(), color });
    }
  }
}
const corals = [];
for (let cluster = 0; cluster < 10; cluster++) {
  const cx = 0.12 + random() * 0.76, cy = 0.12 + random() * 0.76;
  const color = colors[(cluster + 2) % colors.length];
  for (let n = 0; n < 5 + Math.floor(random() * 5); n++) {
    const angle = random() * Math.PI * 2, distance = random() * 0.025;
    corals.push({ x: cx + Math.cos(angle) * distance, y: cy + Math.sin(angle) * distance,
      radius: 0.004 + random() * 0.008, height: 0.35 + random() * 1.25, color });
  }
}
const weeds = Array.from({ length: 18 }, (_, index) => {
  const x = 0.10 + random() * 0.80, y = 0.10 + random() * 0.80;
  const angle = random() * Math.PI * 2, length = 0.025 + random() * 0.035;
  const side = index % 2 ? 1 : -1;
  return { points: [[x, y], [x + Math.cos(angle) * length * 0.5 - Math.sin(angle) * 0.012 * side,
    y + Math.sin(angle) * length * 0.5 + Math.cos(angle) * 0.012 * side],
    [x + Math.cos(angle) * length, y + Math.sin(angle) * length]],
    radius: 0.0018 + random() * 0.0015, height: 0.45 + random() * 0.85, color: [49, 91, 72] };
});

function detailAt(x, y) {
  let alpha = 0, height = 0, chosen = [0, 0, 0];
  const add = (distance, radius, peak, color, softness = 0.7) => {
    const coverage = 1 - smooth(radius * softness, radius, distance);
    if (coverage <= alpha) return;
    alpha = coverage;
    height = Math.max(height, peak * (1 - smooth(0, radius, distance)));
    chosen = color;
  };
  for (const branch of branches) for (let i = 1; i < branch.points.length; i++)
    add(pointSegment(x, y, ...branch.points[i - 1], ...branch.points[i]), branch.radius, branch.height, branch.color);
  for (const coral of corals) add(Math.hypot(x - coral.x, y - coral.y), coral.radius, coral.height, coral.color, 0.72);
  for (const weed of weeds) for (let i = 1; i < weed.points.length; i++)
    add(pointSegment(x, y, ...weed.points[i - 1], ...weed.points[i]), weed.radius, weed.height, weed.color, 0.55);
  return { alpha, height: clamp(height, 0, 3), color: chosen };
}

function makeField(sample) {
  const values = new Float32Array(CORE * CORE);
  for (let y = 0; y < CORE; y++) for (let x = 0; x < CORE; x++) values[y * CORE + x] = sample(x / CORE, y / CORE).height;
  return values;
}
const floorHeight = makeField(floorAt);
const detailHeight = makeField(detailAt);
const floorAlbedo = Buffer.alloc(SIZE * SIZE * 3);
const floorSurface = Buffer.alloc(SIZE * SIZE * 3);
const detailColor = Buffer.alloc(SIZE * SIZE * 4);
const detailSurface = Buffer.alloc(SIZE * SIZE * 3);
const sampleHeight = (field, x, y) => field[((y + CORE) % CORE) * CORE + ((x + CORE) % CORE)];
const writeNormal = (target, offset, field, x, y) => {
  const metresPerPixel = PATCH_METRES / CORE;
  const dx = (sampleHeight(field, x + 1, y) - sampleHeight(field, x - 1, y)) / (2 * metresPerPixel);
  const dy = (sampleHeight(field, x, y + 1) - sampleHeight(field, x, y - 1)) / (2 * metresPerPixel);
  const length = Math.hypot(dx, dy, 1);
  target[offset] = Math.round(((-dx / length) * 0.98 * 0.5 + 0.5) * 255);
  target[offset + 1] = Math.round(((-dy / length) * 0.98 * 0.5 + 0.5) * 255);
  target[offset + 2] = Math.round(clamp(sampleHeight(field, x, y) / 3) * 255);
};
for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
  const sx = x % CORE, sy = y % CORE, u = sx / CORE, v = sy / CORE;
  const floor = floorAt(u, v), detail = detailAt(u, v);
  const fi = (y * SIZE + x) * 3, di = (y * SIZE + x) * 4;
  const variation = periodic(u, v, 7, 0.29) * 4;
  const sand = [151 + variation, 142 + variation, 113 + variation * 0.6];
  const basalt = [52 + variation * 0.25, 58 + variation * 0.25, 57 + variation * 0.3];
  for (let c = 0; c < 3; c++) floorAlbedo[fi + c] = Math.round(sand[c] * (1 - floor.rock) + basalt[c] * floor.rock);
  writeNormal(floorSurface, fi, floorHeight, sx, sy);
  for (let c = 0; c < 3; c++) detailColor[di + c] = detail.color[c];
  detailColor[di + 3] = Math.round(detail.alpha * 255);
  writeNormal(detailSurface, fi, detailHeight, sx, sy);
}

await fs.mkdir(OUT, { recursive: true });
const outputs = [
  ["seabed-albedo-r1.png", floorAlbedo, 3], ["seabed-surface-r1.png", floorSurface, 3],
  ["ocean-details-r1.png", detailColor, 4], ["ocean-details-surface-r1.png", detailSurface, 3],
];
for (const [name, data, channels] of outputs)
  await sharp(data, { raw: { width: SIZE, height: SIZE, channels } }).png({ compressionLevel: 9 }).toFile(path.join(OUT, name));
console.log(JSON.stringify({ outputDirectory: OUT, dimensions: [SIZE, SIZE], patchMetres: PATCH_METRES,
  seed: "0x5eabed01", maps: outputs.map(([name, , channels]) => ({ name, channels })) }));
