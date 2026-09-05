import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

sharp.cache(false);
const SOURCE = "public/career-world/layers/water/ocean/details/ocean-details-r1.png";
const LABELS = "public/career-world/layers/water/ocean/details/ocean-detail-labels-r1.png";
const LAYOUT = "public/career-world/layers/water/ocean/details/ocean-detail-layout-r1.json";
const SOURCE_PATH = "/career-world/layers/water/ocean/details/ocean-details-r1.png";
const LABELS_PATH = "/career-world/layers/water/ocean/details/ocean-detail-labels-r1.png";
const ALPHA_THRESHOLD = 16;
const DILATION_RADIUS = 2;
const MIN_STRONG_PIXELS = 24;
const FRINGE_RADIUS = 3;
const RECT_PADDING = 2;
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

const sourceBytes = await fs.readFile(SOURCE);
const { data, info } = await sharp(sourceBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
if (info.channels !== 4) throw new Error(`Expected RGBA source, received ${info.channels} channels.`);
const count = width * height;
const strong = new Uint8Array(count);
const dilated = new Uint8Array(count);
for (let i = 0; i < count; i++) strong[i] = data[i * 4 + 3] > ALPHA_THRESHOLD ? 1 : 0;
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  if (!strong[y * width + x]) continue;
  for (let dy = -DILATION_RADIUS; dy <= DILATION_RADIUS; dy++) {
    for (let dx = -DILATION_RADIUS; dx <= DILATION_RADIUS; dx++) {
      if (dx * dx + dy * dy > DILATION_RADIUS * DILATION_RADIUS) continue;
      const px = x + dx, py = y + dy;
      if (px >= 0 && px < width && py >= 0 && py < height) dilated[py * width + px] = 1;
    }
  }
}

const labels = new Uint8Array(count);
const queue = new Int32Array(count);
const components = [];
let nextId = 1;
for (let start = 0; start < count; start++) {
  if (!dilated[start] || labels[start]) continue;
  let head = 0, tail = 1, strongPixels = 0;
  queue[0] = start;
  labels[start] = 255;
  while (head < tail) {
    const pixel = queue[head++], y = Math.floor(pixel / width), x = pixel - y * width;
    strongPixels += strong[pixel];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const px = x + dx, py = y + dy;
      if (px < 0 || px >= width || py < 0 || py >= height) continue;
      const neighbour = py * width + px;
      if (dilated[neighbour] && !labels[neighbour]) {
        labels[neighbour] = 255;
        queue[tail++] = neighbour;
      }
    }
  }
  if (strongPixels < MIN_STRONG_PIXELS) {
    for (let i = 0; i < tail; i++) labels[queue[i]] = 0;
    continue;
  }
  if (nextId > 254) throw new Error("More than 254 substantial ocean-detail components.");
  for (let i = 0; i < tail; i++) labels[queue[i]] = nextId;
  components.push({ id: nextId, strongPixels });
  nextId++;
}

const baseLabels = labels.slice();
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const pixel = y * width + x;
  if (labels[pixel] || data[pixel * 4 + 3] === 0) continue;
  let owner = 0, bestDistance = Infinity;
  for (let dy = -FRINGE_RADIUS; dy <= FRINGE_RADIUS; dy++) {
    for (let dx = -FRINGE_RADIUS; dx <= FRINGE_RADIUS; dx++) {
      const distance = dx * dx + dy * dy;
      if (distance > FRINGE_RADIUS * FRINGE_RADIUS) continue;
      const px = x + dx, py = y + dy;
      if (px < 0 || px >= width || py < 0 || py >= height) continue;
      const candidate = baseLabels[py * width + px];
      if (candidate && (distance < bestDistance || (distance === bestDistance && candidate < owner))) {
        owner = candidate;
        bestDistance = distance;
      }
    }
  }
  labels[pixel] = owner;
}

const bounds = components.map(({ id }) => ({ id, minX: width, minY: height, maxX: -1, maxY: -1, pixels: 0 }));
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const id = labels[y * width + x];
  if (!id) continue;
  const box = bounds[id - 1];
  box.minX = Math.min(box.minX, x); box.maxX = Math.max(box.maxX, x);
  box.minY = Math.min(box.minY, y); box.maxY = Math.max(box.maxY, y); box.pixels++;
}
const sprites = bounds.map((box) => {
  const left = Math.max(0, box.minX - RECT_PADDING), top = Math.max(0, box.minY - RECT_PADDING);
  const right = Math.min(width - 1, box.maxX + RECT_PADDING), bottom = Math.min(height - 1, box.maxY + RECT_PADDING);
  return { id: box.id, rect: [left, top, right - left + 1, bottom - top + 1] };
});
const rgb = Buffer.alloc(count * 3);
for (let i = 0; i < count; i++) rgb[i * 3] = labels[i];
const layout = { source: SOURCE_PATH, sourceHash: hash(sourceBytes), width, height, metresPerAtlas: 64,
  labelsPath: LABELS_PATH, sprites };
await fs.mkdir(path.dirname(LABELS), { recursive: true });
await sharp(rgb, { raw: { width, height, channels: 3 } }).png({ compressionLevel: 9 }).toFile(LABELS);
await fs.writeFile(LAYOUT, `${JSON.stringify(layout, null, 2)}\n`);
console.log(JSON.stringify({ sourceHash: layout.sourceHash, width, height, sprites: sprites.length,
  labelledPixels: bounds.reduce((sum, box) => sum + box.pixels, 0) }));
