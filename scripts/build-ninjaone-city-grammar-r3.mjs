import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK_ONLY = process.argv.includes("--check");
const WIDTH = 1448;
const HEIGHT = 1086;
const ARTBOARD = Object.freeze([WIDTH, HEIGHT]);
const SCALE = 3;
const SMALL_WIDTH = Math.ceil(WIDTH / SCALE);
const SMALL_HEIGHT = Math.ceil(HEIGHT / SCALE);
const MIN_STRUCTURE_DOMINANCE = 0.7;
const MIN_ON_PATH_RATE = 0.7;
const MIN_DISTRICT_COVERAGE = 0.6;
const MAX_SEGMENT_LENGTH = 40;
const MAX_GAP_LINK_DISTANCE = 12;
const MIN_GAP_LINK_COSINE = Math.cos(35 * Math.PI / 180);
const MAX_INFERRED_LINK_DISTANCE = 70;
const MIN_INFERRED_LINK_COSINE = Math.cos(45 * Math.PI / 180);
const MIN_OCCLUDER_FRACTION = 0.51;
const MAX_BARE_ROCK_FRACTION = 0.1;
const MAX_INFERRED_LENGTH_SHARE = 0.4;
const MIN_NETWORK_LENGTH_SHARE_AT_LEAST_50_PX = 0.6;
const MAX_NETWORK_LENGTH_SHARE_BELOW_40_PX = 0.35;

const source = Object.freeze({
  layout: "public/career-world/capitals/ninjaone/manifests/city-master-node-layout-r3.json",
  master: "art-source/career-world/ninjaone-capital/city-nodes-r2/master/ninjaone-capital-master-r1.png",
  water: "public/career-world/capitals/ninjaone/city-r3/authority/city-water-registration-mask-r1.png",
});
const districtDefinitions = Object.freeze([
  ["D01", "Upper Capital Crown", "art-source/career-world/ninjaone-capital/city-r3/districts/D01-upper-capital-mask.png"],
  ["D02", "Dojo Ridge", "art-source/career-world/ninjaone-capital/city-r3/districts/D02-dojo-ridge-mask.png"],
  ["D03", "Eastern Industry", "art-source/career-world/ninjaone-capital/city-r3/districts/D03-eastern-industry-mask.png"],
  ["D04", "Central Lake Terraces", "art-source/career-world/ninjaone-capital/city-r3/districts/D04-central-lake-terraces-mask.png"],
  ["D05", "Western Skill Terraces", "art-source/career-world/ninjaone-capital/city-r3/districts/D05-western-skill-terraces-mask.png"],
  ["D06", "Station and Rail", "art-source/career-world/ninjaone-capital/city-r3/districts/D06-station-rail-mask.png"],
].map(([id, label, file]) => Object.freeze({ id, label, file })));
const output = Object.freeze({
  grammar: "public/career-world/capitals/ninjaone/city-v2/grammar/ninjaone-city-grammar-r3.json",
  graph: ".codex-tmp/qa/T1/ninjaone-city-grammar-r3-graph.png",
  footprints: ".codex-tmp/qa/T1/ninjaone-city-grammar-r3-footprints.png",
});
const LANDMARKS = Object.freeze([
  { id: "palace-crown-complex", label: "palace crown complex", point: [0.35 * WIDTH, 0.14 * HEIGHT], bbox: [0.26 * WIDTH, 0.06 * HEIGHT, 0.5 * WIDTH, 0.29 * HEIGHT] },
  { id: "statue-observatory", label: "statue observatory", point: [0.63 * WIDTH, 0.2 * HEIGHT], bbox: [0.57 * WIDTH, 0.13 * HEIGHT, 0.69 * WIDTH, 0.26 * HEIGHT] },
  { id: "great-glass-train-hall", label: "great glass train hall", point: [0.6 * WIDTH, 0.85 * HEIGHT], bbox: [0.5 * WIDTH, 0.76 * HEIGHT, 0.72 * WIDTH, 0.95 * HEIGHT], tightenedBbox: [0.52 * WIDTH, 0.77 * HEIGHT, 0.7 * WIDTH, 0.94 * HEIGHT] },
]);
const DISTRICT_COLORS = Object.freeze({ D01: "#ffd166", D02: "#ef476f", D03: "#f78c6b", D04: "#4cc9f0", D05: "#80ed99", D06: "#c77dff" });
const COMPONENT_COLORS = Object.freeze(["#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#00c7be", "#30b0c7", "#007aff", "#5856d6", "#af52de", "#ff2d55"]);
const OTHER_COMPONENT_COLOR = "#9aa0a6";

function absolute(file) { return path.join(ROOT, file); }
function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
function round(value, digits = 3) { const factor = 10 ** digits; return Math.round(value * factor) / factor; }
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function pointKey([x, y]) { return `${round(x, 1)},${round(y, 1)}`; }
function distance(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
function smallIndex(x, y) { return y * SMALL_WIDTH + x; }
function fullIndex(x, y) { return y * WIDTH + x; }

async function rawImage(file, grayscale = false) {
  const bytes = await readFile(absolute(file));
  const pipeline = grayscale ? sharp(bytes).greyscale() : sharp(bytes).ensureAlpha();
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  if (info.width !== WIDTH || info.height !== HEIGHT) throw new TypeError(`${file} is outside master space.`);
  return Object.freeze({ bytes, data });
}

function rgb(master, x, y) {
  const index = fullIndex(clamp(Math.floor(x), 0, WIDTH - 1), clamp(Math.floor(y), 0, HEIGHT - 1)) * 4;
  return [master.data[index], master.data[index + 1], master.data[index + 2]];
}

// The mask targets the light cream/tan paving.  It excludes the more saturated bronze
// walls and the green/blue/neutral material families before any skeleton work.
function material(master, x, y, water) {
  const [red, green, blue] = rgb(master, x, y);
  const high = Math.max(red, green, blue);
  const low = Math.min(red, green, blue);
  const saturation = high === 0 ? 0 : (high - low) / high;
  const registeredWater = water.data[fullIndex(Math.floor(x), Math.floor(y))] >= 128;
  const vegetation = green > red * 1.12 && green > blue * 1.16 && green > 28;
  const waterLike = registeredWater || (blue > red * 1.08 && blue > green * 0.96);
  const warmStone = red >= 54 && green >= 46 && blue >= 28
    && red >= green * 0.95 && red <= green * 1.3
    && green >= blue * 1.25 && green <= blue * 1.85
    && saturation >= 0.32 && saturation <= 0.6 && high <= 150;
  const pavingExclusion = red >= 62 && green >= 52 && blue >= 32
    && red >= green * 0.98 && green >= blue * 1.08
    && red - blue >= 12 && saturation <= 0.58 && high <= 190;
  const darkBuiltMetal = high >= 12 && high <= 72 && high - low <= 18 && red >= green * 0.78;
  const slateRoof = high >= 32 && high <= 135 && saturation <= 0.42
    && blue >= red * 0.85 && blue >= green * 0.8;
  const bareRock = !vegetation && !waterLike && !slateRoof
    && high >= 30 && high <= 150 && saturation <= 0.3
    && Math.abs(red - green) <= 20 && Math.abs(green - blue) <= 24;
  const roofOrMasonry = !vegetation && !waterLike
    && (darkBuiltMetal || slateRoof || (high >= 38 && ((red >= green * 1.03 && green >= blue * 0.9) || (high - low >= 18 && red >= blue * 1.05))));
  return { bareRock, roofOrMasonry, structuralCore: roofOrMasonry && !pavingExclusion, vegetation, warmStone, waterLike };
}

function maskAt(mask, x, y) {
  return x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT && mask.data[fullIndex(Math.floor(x), Math.floor(y))] >= 128;
}
function pointInsidePolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const [x, y] = polygon[index]; const [px, py] = polygon[previous];
    if ((y > point[1]) !== (py > point[1]) && point[0] < (px - x) * (point[1] - y) / (py - y) + x) inside = !inside;
  }
  return inside;
}
function polygonInsideMask(polygon, mask) {
  for (const [x, y] of polygon) if (!maskAt(mask, x, y)) return false;
  const minX = clamp(Math.floor(Math.min(...polygon.map(([x]) => x))), 0, WIDTH - 1);
  const maxX = clamp(Math.ceil(Math.max(...polygon.map(([x]) => x))), 0, WIDTH - 1);
  const minY = clamp(Math.floor(Math.min(...polygon.map(([, y]) => y))), 0, HEIGHT - 1);
  const maxY = clamp(Math.ceil(Math.max(...polygon.map(([, y]) => y))), 0, HEIGHT - 1);
  for (let y = minY; y <= maxY; y += 3) for (let x = minX; x <= maxX; x += 3) {
    if (pointInsidePolygon([x + 0.5, y + 0.5], polygon) && !maskAt(mask, x, y)) return false;
  }
  return true;
}
function analyzeMask(mask) {
  let pixels = 0; let minX = WIDTH; let minY = HEIGHT; let maxX = 0; let maxY = 0;
  for (let index = 0; index < mask.data.length; index += 1) if (mask.data[index] >= 128) {
    const x = index % WIDTH; const y = Math.floor(index / WIDTH); pixels += 1;
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return Object.freeze({ bounds: [minX, minY, maxX + 1, maxY + 1], pixelCount: pixels });
}
function districtForPoint(districts, point) {
  const direct = districts.find((district) => maskAt(district.mask, point[0], point[1]));
  if (direct) return direct;
  let best = null;
  for (const district of districts) for (let radius = 1; radius <= 90; radius += 3) {
    for (let angle = 0; angle < 360; angle += 30) {
      const candidate = [point[0] + Math.cos(angle * Math.PI / 180) * radius, point[1] + Math.sin(angle * Math.PI / 180) * radius];
      if (maskAt(district.mask, candidate[0], candidate[1])) return district;
    }
    if (best) break;
  }
  if (!best) throw new TypeError(`No district is available for ${point.join(",")}.`);
  return best;
}

function buildFullMasks(master, water, districtUnion) {
  const bareRockMask = new Uint8Array(WIDTH * HEIGHT);
  const occluderMask = new Uint8Array(WIDTH * HEIGHT);
  const pathMask = new Uint8Array(WIDTH * HEIGHT);
  const structureMask = new Uint8Array(WIDTH * HEIGHT);
  const landmarkMask = new Uint8Array(WIDTH * HEIGHT);
  for (let y = 0; y < HEIGHT; y += 1) for (let x = 0; x < WIDTH; x += 1) {
    const index = fullIndex(x, y);
    if (!districtUnion[index]) continue;
    const sample = material(master, x, y, water);
    if (sample.bareRock) bareRockMask[index] = 1;
    if (sample.roofOrMasonry || sample.vegetation) occluderMask[index] = 1;
    if (sample.warmStone) pathMask[index] = 1;
    if (sample.roofOrMasonry) landmarkMask[index] = 1;
    if (sample.structuralCore) structureMask[index] = 1;
  }
  return { bareRockMask, landmarkMask, occluderMask, pathMask, structureMask };
}
function downsampleMask(fullMask) {
  const small = new Uint8Array(SMALL_WIDTH * SMALL_HEIGHT);
  for (let sy = 0; sy < SMALL_HEIGHT; sy += 1) for (let sx = 0; sx < SMALL_WIDTH; sx += 1) {
    let hits = 0;
    for (let y = sy * SCALE; y < Math.min(HEIGHT, (sy + 1) * SCALE); y += 1) for (let x = sx * SCALE; x < Math.min(WIDTH, (sx + 1) * SCALE); x += 1) hits += fullMask[fullIndex(x, y)];
    if (hits >= 6) small[smallIndex(sx, sy)] = 1;
  }
  return small;
}
function neighbours(mask, x, y) {
  return [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]
    .map(([dx, dy]) => (x + dx >= 0 && y + dy >= 0 && x + dx < SMALL_WIDTH && y + dy < SMALL_HEIGHT ? mask[smallIndex(x + dx, y + dy)] : 0));
}
function transitions(values) { let total = 0; for (let index = 0; index < 8; index += 1) if (values[index] === 0 && values[(index + 1) % 8] === 1) total += 1; return total; }
function skeletonize(sourceMask) {
  const mask = new Uint8Array(sourceMask); let changed = true; let passes = 0;
  while (changed && passes < 160) {
    changed = false;
    for (const phase of [0, 1]) {
      const remove = [];
      for (let y = 1; y < SMALL_HEIGHT - 1; y += 1) for (let x = 1; x < SMALL_WIDTH - 1; x += 1) {
        if (!mask[smallIndex(x, y)]) continue;
        const n = neighbours(mask, x, y); const count = n.reduce((sum, value) => sum + value, 0);
        if (count < 2 || count > 6 || transitions(n) !== 1) continue;
        const [p2, , p4, , p6, , p8] = n;
        if ((phase === 0 && (p2 * p4 * p6 || p4 * p6 * p8)) || (phase === 1 && (p2 * p4 * p8 || p2 * p6 * p8))) continue;
        remove.push(smallIndex(x, y));
      }
      if (remove.length) changed = true;
      for (const index of remove) mask[index] = 0;
    }
    passes += 1;
  }
  return mask;
}
function degree(mask, x, y) { return neighbours(mask, x, y).reduce((sum, value) => sum + value, 0); }
function pruneSpurs(mask) {
  const pruned = new Uint8Array(mask);
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const erase = [];
    for (let y = 0; y < SMALL_HEIGHT; y += 1) for (let x = 0; x < SMALL_WIDTH; x += 1) {
      if (!pruned[smallIndex(x, y)] || degree(pruned, x, y) !== 1) continue;
      let previous = null; let current = [x, y]; let length = 0;
      while (current && length < 5) {
        const [cx, cy] = current; const next = [];
        for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dy) continue;
          if (pruned[smallIndex(cx + dx, cy + dy)] && (!previous || cx + dx !== previous[0] || cy + dy !== previous[1])) next.push([cx + dx, cy + dy]);
        }
        erase.push(smallIndex(cx, cy)); length += 1;
        if (next.length !== 1) break;
        previous = current; [current] = next;
      }
      if (length >= 5) erase.splice(erase.length - length, length);
    }
    for (const index of erase) pruned[index] = 0;
  }
  return pruned;
}
function nearbyPath(pathMask, point, radius = 4) {
  for (let y = Math.max(0, Math.floor(point[1] - radius)); y <= Math.min(HEIGHT - 1, Math.ceil(point[1] + radius)); y += 1) for (let x = Math.max(0, Math.floor(point[0] - radius)); x <= Math.min(WIDTH - 1, Math.ceil(point[0] + radius)); x += 1) if (pathMask[fullIndex(x, y)]) return true;
  return false;
}
function traceSkeleton(skeleton, pathMask) {
  const visited = new Set(); const edges = [];
  const nodes = [];
  for (let y = 0; y < SMALL_HEIGHT; y += 1) for (let x = 0; x < SMALL_WIDTH; x += 1) if (skeleton[smallIndex(x, y)] && degree(skeleton, x, y) !== 2) nodes.push([x, y]);
  const nexts = (point, previous) => {
    const result = [];
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
      if (!dx && !dy) continue;
      const candidate = [point[0] + dx, point[1] + dy];
      if (candidate[0] >= 0 && candidate[1] >= 0 && candidate[0] < SMALL_WIDTH && candidate[1] < SMALL_HEIGHT && skeleton[smallIndex(candidate[0], candidate[1])] && (!previous || candidate[0] !== previous[0] || candidate[1] !== previous[1])) result.push(candidate);
    }
    return result;
  };
  for (const start of nodes) for (const first of nexts(start)) {
    const startKey = `${start[0]},${start[1]}|${first[0]},${first[1]}`;
    if (visited.has(startKey)) continue;
    const raw = [start]; let previous = start; let current = first; visited.add(startKey);
    while (true) {
      raw.push(current); const next = nexts(current, previous);
      if (degree(skeleton, current[0], current[1]) !== 2 || next.length !== 1) break;
      const candidate = next[0]; visited.add(`${current[0]},${current[1]}|${candidate[0]},${candidate[1]}`); previous = current; current = candidate;
    }
    if (raw.length < 3) continue;
    const points = raw.filter((_, index) => index === 0 || index === raw.length - 1 || index % 10 === 0)
      .map(([x, y]) => [x * SCALE + SCALE / 2, y * SCALE + SCALE / 2]);
    const onPath = points.filter((point) => nearbyPath(pathMask, point)).length / points.length;
    if (onPath >= MIN_ON_PATH_RATE && points.length >= 2) edges.push({ points, onPath });
  }
  return edges;
}
function densify(points) {
  const dense = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]; const current = points[index]; const segments = Math.max(1, Math.ceil(distance(previous, current) / MAX_SEGMENT_LENGTH));
    for (let segment = 1; segment <= segments; segment += 1) dense.push([round(previous[0] + (current[0] - previous[0]) * segment / segments, 2), round(previous[1] + (current[1] - previous[1]) * segment / segments, 2)]);
  }
  return dense;
}
function edgeKind(points, water) {
  const waterFraction = points.filter((point) => maskAt(water, point[0], point[1])).length / points.length;
  const slope = Math.abs(points.at(-1)[1] - points[0][1]) / Math.max(1, Math.abs(points.at(-1)[0] - points[0][0]));
  return { kind: waterFraction > 0.08 ? "bridge" : slope > 1.35 ? "stairs" : "road", waterFraction };
}
function edgeLength(points) { return points.slice(1).reduce((length, point, index) => length + distance(points[index], point), 0); }
function outwardTangent(points, atStart) {
  const endpoint = atStart ? points[0] : points.at(-1); let remaining = 18; let adjacent = endpoint;
  const ordered = atStart ? points : [...points].reverse();
  for (let index = 1; index < ordered.length && remaining > 0; index += 1) {
    const previous = ordered[index - 1]; const current = ordered[index]; const span = distance(previous, current);
    if (span >= remaining) { const ratio = remaining / span; adjacent = [previous[0] + (current[0] - previous[0]) * ratio, previous[1] + (current[1] - previous[1]) * ratio]; remaining = 0; }
    else { adjacent = current; remaining -= span; }
  }
  const vector = [endpoint[0] - adjacent[0], endpoint[1] - adjacent[1]];
  const magnitude = Math.hypot(...vector);
  return magnitude ? [vector[0] / magnitude, vector[1] / magnitude] : [0, 0];
}
function gapLinks(rawEdges) {
  const endpoints = rawEdges.flatMap((edge, edgeIndex) => [
    { edgeIndex, point: edge.points[0], tangent: outwardTangent(edge.points, true) },
    { edgeIndex, point: edge.points.at(-1), tangent: outwardTangent(edge.points, false) },
  ]);
  const links = [];
  for (let index = 0; index < endpoints.length; index += 1) for (let other = index + 1; other < endpoints.length; other += 1) {
    const left = endpoints[index]; const right = endpoints[other];
    if (left.edgeIndex === right.edgeIndex) continue;
    const span = [right.point[0] - left.point[0], right.point[1] - left.point[1]]; const length = Math.hypot(...span);
    if (!length || length > MAX_GAP_LINK_DISTANCE) continue;
    const forward = [span[0] / length, span[1] / length];
    const leftContinuity = left.tangent[0] * forward[0] + left.tangent[1] * forward[1];
    const rightContinuity = right.tangent[0] * -forward[0] + right.tangent[1] * -forward[1];
    if (leftContinuity >= MIN_GAP_LINK_COSINE && rightContinuity >= MIN_GAP_LINK_COSINE) links.push({ left, points: [left.point, right.point], right, span: length });
  }
  return links;
}
function segmentOcclusionEvidence(water, occluderMask, bareRockMask, points) {
  const length = distance(points[0], points[1]); const samples = Math.max(1, Math.ceil(length / 2));
  let bareRockHits = 0; let occluderHits = 0; let waterHits = 0;
  for (let index = 1; index < samples; index += 1) {
    const ratio = index / samples; const x = Math.floor(points[0][0] + (points[1][0] - points[0][0]) * ratio); const y = Math.floor(points[0][1] + (points[1][1] - points[0][1]) * ratio);
    const pixel = fullIndex(x, y); bareRockHits += bareRockMask[pixel]; occluderHits += occluderMask[pixel]; waterHits += water.data[pixel] >= 128 ? 1 : 0;
  }
  const interiorSamples = Math.max(1, samples - 1);
  return { bareRockFraction: bareRockHits / interiorSamples, occluderFraction: occluderHits / interiorSamples, waterFraction: waterHits / interiorSamples };
}
function inferredLinks(rawEdges, water, occluderMask, bareRockMask) {
  const endpoints = rawEdges.flatMap((edge, edgeIndex) => [
    { edgeIndex, point: edge.points[0], tangent: outwardTangent(edge.points, true) },
    { edgeIndex, point: edge.points.at(-1), tangent: outwardTangent(edge.points, false) },
  ]);
  const links = [];
  for (let index = 0; index < endpoints.length; index += 1) for (let other = index + 1; other < endpoints.length; other += 1) {
    const left = endpoints[index]; const right = endpoints[other];
    if (left.edgeIndex === right.edgeIndex) continue;
    const span = [right.point[0] - left.point[0], right.point[1] - left.point[1]]; const length = Math.hypot(...span);
    if (!length || length > MAX_INFERRED_LINK_DISTANCE) continue;
    const forward = [span[0] / length, span[1] / length];
    const leftContinuity = left.tangent[0] * forward[0] + left.tangent[1] * forward[1];
    const rightContinuity = right.tangent[0] * -forward[0] + right.tangent[1] * -forward[1];
    if (leftContinuity < MIN_INFERRED_LINK_COSINE || rightContinuity < MIN_INFERRED_LINK_COSINE) continue;
    const crossing = segmentOcclusionEvidence(water, occluderMask, bareRockMask, [left.point, right.point]);
    if (crossing.occluderFraction < MIN_OCCLUDER_FRACTION || crossing.bareRockFraction > MAX_BARE_ROCK_FRACTION) continue;
    links.push({ crossing, left, points: [left.point, right.point], right, span: length, continuity: Math.min(leftContinuity, rightContinuity) });
  }
  return links;
}
function topologyLinkSelection(rawEdges, shortCandidates, inferredCandidates) {
  const parent = rawEdges.map((_, index) => index);
  const root = (index) => { while (parent[index] !== index) { parent[index] = parent[parent[index]]; index = parent[index]; } return index; };
  const join = (left, right) => { const leftRoot = root(left); const rightRoot = root(right); if (leftRoot === rightRoot) return false; parent[rightRoot] = leftRoot; return true; };
  const endpointOwner = new Map();
  for (let index = 0; index < rawEdges.length; index += 1) for (const point of [rawEdges[index].points[0], rawEdges[index].points.at(-1)]) {
    const key = pointKey(point); const other = endpointOwner.get(key); if (other !== undefined) join(index, other); else endpointOwner.set(key, index);
  }
  const short = [...shortCandidates].sort((left, right) => left.span - right.span).filter((link) => join(link.left.edgeIndex, link.right.edgeIndex));
  const inferred = [...inferredCandidates].sort((left, right) => right.crossing.occluderFraction - left.crossing.occluderFraction || right.continuity - left.continuity || left.span - right.span)
    .filter((link) => join(link.left.edgeIndex, link.right.edgeIndex));
  return { inferred, short };
}
function buildCirculation(master, water, pathMask, districts, occluderMask, bareRockMask) {
  const skeleton = pruneSpurs(skeletonize(downsampleMask(pathMask)));
  const rawEdges = traceSkeleton(skeleton, pathMask);
  const tracedEdges = rawEdges.map(({ points, onPath }, index) => {
    const dense = densify(points); const classification = edgeKind(dense, water);
    return Object.freeze({ id: `E${String(index + 1).padStart(4, "0")}`, kind: classification.kind, approximateWidth: 0, points: dense,
      evidence: { extraction: "warm-stone-pixel-mask -> downsample -> Zhang-Suen skeleton -> spur prune -> vectorize", onPathRate: round(onPath, 4), waterFraction: round(classification.waterFraction, 4) } });
  });
  const shortLinks = topologyLinkSelection(tracedEdges, gapLinks(tracedEdges), []).short.map((link, index) => {
    const dense = densify(link.points); const classification = edgeKind(dense, water);
    const onPath = dense.filter((point) => nearbyPath(pathMask, point)).length / dense.length;
    return Object.freeze({ id: `G${String(index + 1).padStart(4, "0")}`, kind: classification.kind, approximateWidth: 0, points: dense,
      evidence: { extraction: "short-angle-continuous-mask-gap-link", onPathRate: round(onPath, 4), waterFraction: round(classification.waterFraction, 4), gapLength: round(link.span, 2) } });
  });
  const topology = topologyLinkSelection(tracedEdges, gapLinks(tracedEdges), inferredLinks(tracedEdges, water, occluderMask, bareRockMask));
  const inferred = topology.inferred.map((link, index) => {
    const dense = densify(link.points); const kind = link.crossing.waterFraction > 0 ? "bridge" : "road";
    return Object.freeze({ id: `I${String(index + 1).padStart(4, "0")}`, inferred: true, kind, approximateWidth: 0, points: dense,
      evidence: { bareRockFraction: round(link.crossing.bareRockFraction, 4), crossing: "structure-or-foliage-occlusion", inferredLength: round(link.span, 2), occluderFraction: round(link.crossing.occluderFraction, 4), waterFraction: round(link.crossing.waterFraction, 4) } });
  });
  const visibleEdges = [...tracedEdges, ...shortLinks]; const edges = [...visibleEdges, ...inferred];
  const skeletonLength = visibleEdges.reduce((sum, edge) => sum + edgeLength(edge.points), 0);
  const pathPixels = pathMask.reduce((sum, value) => sum + value, 0);
  const meanWidth = pathPixels / Math.max(1, skeletonLength);
  const coverage = Object.fromEntries(districts.map((district) => {
    let pixels = 0; for (let index = 0; index < pathMask.length; index += 1) if (pathMask[index] && district.mask.data[index] >= 128) pixels += 1;
    let length = 0; for (const edge of visibleEdges) for (let index = 1; index < edge.points.length; index += 1) {
      const midpoint = [(edge.points[index - 1][0] + edge.points[index][0]) / 2, (edge.points[index - 1][1] + edge.points[index][1]) / 2];
      if (maskAt(district.mask, midpoint[0], midpoint[1])) length += distance(edge.points[index - 1], edge.points[index]);
    }
    return [district.definition.id, { classifiedPathPixels: pixels, coverageRate: round(length / Math.max(1, pixels / meanWidth), 4), skeletonLength: round(length, 2) }];
  }));
  const vertices = new Map(); for (const edge of edges) { vertices.set(pointKey(edge.points[0]), edge.points[0]); vertices.set(pointKey(edge.points.at(-1)), edge.points.at(-1)); }
  const vertexDegree = new Map(); for (const edge of edges) for (const point of [edge.points[0], edge.points.at(-1)]) { const key = pointKey(point); vertexDegree.set(key, (vertexDegree.get(key) ?? 0) + 1); }
  const vertexRows = [...vertices.entries()].map(([key, point], index) => ({ id: `V${String(index + 1).padStart(4, "0")}`, key, point, kind: (vertexDegree.get(key) ?? 0) >= 3 ? "junction" : "endpoint" })); const vertexIds = new Map(vertexRows.map(({ key, id }) => [key, id]));
  return { coverage, edges: edges.map((edge) => Object.freeze({ ...edge, approximateWidth: round(meanWidth, 2), startVertexId: vertexIds.get(pointKey(edge.points[0])), endVertexId: vertexIds.get(pointKey(edge.points.at(-1)))})), gapLinkCount: shortLinks.length, inferredLinkCount: inferred.length, meanWidth: round(meanWidth, 2), pathMask, skeleton, vertices: vertexRows.map(({ id, point, kind }) => ({ id, point, kind })) };
}

function graphComponents(edges) {
  const adjacent = new Map();
  for (const edge of edges) {
    for (const [left, right] of [[edge.startVertexId, edge.endVertexId], [edge.endVertexId, edge.startVertexId]]) {
      adjacent.set(left, [...(adjacent.get(left) ?? []), right]);
    }
  }
  const edgeByVertex = new Map(); for (const edge of edges) for (const vertex of [edge.startVertexId, edge.endVertexId]) edgeByVertex.set(vertex, [...(edgeByVertex.get(vertex) ?? []), edge]);
  const seen = new Set(); const components = [];
  for (const start of adjacent.keys()) {
    if (seen.has(start)) continue;
    const vertices = []; const queue = [start]; seen.add(start);
    while (queue.length) { const current = queue.pop(); vertices.push(current); for (const next of adjacent.get(current) ?? []) {
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }}
    const edgeIds = new Set(vertices.flatMap((vertex) => (edgeByVertex.get(vertex) ?? []).map((edge) => edge.id)));
    components.push({ edgeIds: [...edgeIds], length: edges.filter((edge) => edgeIds.has(edge.id)).reduce((sum, edge) => sum + edgeLength(edge.points), 0) });
  }
  const totalLength = components.reduce((sum, component) => sum + component.length, 0);
  return { components, count: components.length, largestLengthShare: totalLength ? Math.max(...components.map((component) => component.length)) / totalLength : 0, totalLength };
}
function percentile(sorted, quantile) {
  if (!sorted.length) return 0;
  const position = (sorted.length - 1) * quantile;
  const lower = Math.floor(position); const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}
function topologyDiagnostics(topology, inferredLength) {
  const componentLengths = topology.components.map((component) => component.length).sort((left, right) => left - right);
  const shareFor = (predicate) => topology.totalLength ? topology.components.filter(predicate).reduce((sum, component) => sum + component.length, 0) / topology.totalLength : 0;
  return Object.freeze({
    componentCount: topology.count,
    totalNetworkLength: round(topology.totalLength, 2),
    largestComponentLengthShare: round(topology.largestLengthShare, 4),
    componentLengthShares: {
      atLeast100Px: round(shareFor((component) => component.length >= 100), 4),
      atLeast50Px: round(shareFor((component) => component.length >= 50), 4),
      below40Px: round(shareFor((component) => component.length < 40), 4),
    },
    componentLengthP50: round(percentile(componentLengths, 0.5), 2),
    componentLengthP90: round(percentile(componentLengths, 0.9), 2),
    inferredLinkShare: round(topology.totalLength ? inferredLength / topology.totalLength : 0, 4),
  });
}

function components(mask) {
  const seen = new Uint8Array(mask.length); const out = [];
  for (let start = 0; start < mask.length; start += 1) if (mask[start] && !seen[start]) {
    const pixels = []; const queue = [start]; seen[start] = 1;
    while (queue.length) { const index = queue.pop(); pixels.push(index); const x = index % WIDTH; const y = Math.floor(index / WIDTH);
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) { if (!dx && !dy) continue; const nx = x + dx; const ny = y + dy; const ni = fullIndex(nx, ny); if (nx >= 0 && ny >= 0 && nx < WIDTH && ny < HEIGHT && mask[ni] && !seen[ni]) { seen[ni] = 1; queue.push(ni); } }
    }
    out.push(pixels);
  }
  return out;
}
function boxForComponent(component) {
  let minX = WIDTH; let minY = HEIGHT; let maxX = 0; let maxY = 0; let sx = 0; let sy = 0;
  for (const index of component) { const x = index % WIDTH; const y = Math.floor(index / WIDTH); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); sx += x; sy += y; }
  return { bounds: [minX, minY, maxX + 1, maxY + 1], center: [sx / component.length, sy / component.length], pixels: component.length };
}
function boundsGap(left, right) {
  const horizontal = Math.max(0, Math.max(left[0], right[0]) - Math.min(left[2], right[2]));
  const vertical = Math.max(0, Math.max(left[1], right[1]) - Math.min(left[3], right[3]));
  return Math.hypot(horizontal, vertical);
}
function mergeNearbyComponents(extracted, radius = 8) {
  const rows = extracted.map((component, index) => ({ bounds: boxForComponent(component).bounds, component, index })); const parent = rows.map((row) => row.index);
  const root = (index) => { while (parent[index] !== index) { parent[index] = parent[parent[index]]; index = parent[index]; } return index; };
  const join = (left, right) => { const leftRoot = root(left); const rightRoot = root(right); if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot; };
  const cellSize = 32; const cells = new Map();
  for (const row of rows) {
    const [minX, minY, maxX, maxY] = row.bounds;
    const candidates = new Set();
    for (let y = Math.floor((minY - radius) / cellSize); y <= Math.floor((maxY + radius) / cellSize); y += 1) for (let x = Math.floor((minX - radius) / cellSize); x <= Math.floor((maxX + radius) / cellSize); x += 1) {
      const key = `${x},${y}`; for (const candidate of cells.get(key) ?? []) candidates.add(candidate); cells.set(key, [...(cells.get(key) ?? []), row]);
    }
    for (const candidate of candidates) if (row.component.length <= 80 && candidate.component.length <= 80 && boundsGap(row.bounds, candidate.bounds) <= radius) join(row.index, candidate.index);
  }
  const merged = new Map(); for (const row of rows) { const key = root(row.index); merged.set(key, [...(merged.get(key) ?? []), ...row.component]); }
  return [...merged.values()];
}
function bboxOverlapRate(polygon, bbox) {
  const xs = polygon.map(([x]) => x); const ys = polygon.map(([, y]) => y);
  const overlap = Math.max(0, Math.min(Math.max(...xs), bbox[2]) - Math.max(Math.min(...xs), bbox[0])) * Math.max(0, Math.min(Math.max(...ys), bbox[3]) - Math.max(Math.min(...ys), bbox[1]));
  return overlap / ((bbox[2] - bbox[0]) * (bbox[3] - bbox[1]));
}
function structureDominance(master, water, polygon) {
  const minX = clamp(Math.floor(Math.min(...polygon.map(([x]) => x))), 0, WIDTH - 1); const maxX = clamp(Math.ceil(Math.max(...polygon.map(([x]) => x))), 0, WIDTH - 1);
  const minY = clamp(Math.floor(Math.min(...polygon.map(([, y]) => y))), 0, HEIGHT - 1); const maxY = clamp(Math.ceil(Math.max(...polygon.map(([, y]) => y))), 0, HEIGHT - 1);
  let samples = 0; let hits = 0; for (let y = minY; y <= maxY; y += 3) for (let x = minX; x <= maxX; x += 3) if (pointInsidePolygon([x + 0.5, y + 0.5], polygon)) { samples += 1; if (material(master, x, y, water).roofOrMasonry) hits += 1; }
  return { fraction: samples ? hits / samples : 0, samples };
}
function fitComponent(component, master, water, districts, landmark = null) {
  const box = boxForComponent(component); const [minX, minY, maxX, maxY] = box.bounds; const center = landmark ? landmark.point : box.center;
  const district = districtForPoint(districts, center);
  const extraX = Math.max(0, (10 - (maxX - minX)) / 2); const extraY = Math.max(0, (10 - (maxY - minY)) / 2);
  for (let inset = 0; inset <= 12; inset += 2) {
    const polygon = [[minX - extraX + inset, minY - extraY + inset], [maxX + extraX - inset, minY - extraY + inset], [maxX + extraX - inset, maxY + extraY - inset], [minX - extraX + inset, maxY + extraY - inset]];
    if (polygon[1][0] - polygon[0][0] < 5 || polygon[3][1] - polygon[0][1] < 5 || !polygonInsideMask(polygon, district.mask)) continue;
    const dominance = structureDominance(master, water, polygon); if (dominance.fraction >= MIN_STRUCTURE_DOMINANCE) return { area: (polygon[1][0] - polygon[0][0]) * (polygon[3][1] - polygon[0][1]), center, districtId: district.definition.id, dominance, polygon, sourcePixels: box.pixels };
  }
  return null;
}
function buildFootprints(master, water, structureMask, landmarkMask, districts) {
  const extractedComponents = mergeNearbyComponents(components(structureMask).filter((component) => component.length >= 12 && component.length <= 7_500));
  const landmarkComponents = components(landmarkMask);
  const raw = extractedComponents.filter((component) => component.length >= 12 && component.length <= 7_500);
  const result = raw.map((component) => fitComponent(component, master, water, districts)).filter(Boolean);
  const landmarks = LANDMARKS.map((landmark) => {
    const candidates = landmarkComponents.filter((component) => { const box = boxForComponent(component); return landmark.point[0] >= box.bounds[0] - 36 && landmark.point[0] <= box.bounds[2] + 36 && landmark.point[1] >= box.bounds[1] - 36 && landmark.point[1] <= box.bounds[3] + 36; });
    if (!candidates.length) throw new TypeError(`Landmark seed ${landmark.id} does not reach a structure component after 36px fragment merge radius.`);
    const district = districtForPoint(districts, landmark.point);
    let footprint = null;
    for (let halfWidth = 12; halfWidth <= 220; halfWidth += 4) for (let halfHeight = 10; halfHeight <= 160; halfHeight += 4) {
      const polygon = [
        [landmark.point[0] - halfWidth, landmark.point[1] - halfHeight],
        [landmark.point[0] + halfWidth, landmark.point[1] - halfHeight],
        [landmark.point[0] + halfWidth, landmark.point[1] + halfHeight],
        [landmark.point[0] - halfWidth, landmark.point[1] + halfHeight],
      ];
      if (!polygonInsideMask(polygon, district.mask)) continue;
      const dominance = structureDominance(master, water, polygon);
      if (dominance.fraction < MIN_STRUCTURE_DOMINANCE) continue;
      const candidate = { area: halfWidth * halfHeight * 4, center: landmark.point, districtId: district.definition.id, dominance, polygon, sourcePixels: candidates.reduce((sum, component) => sum + component.length, 0) };
      if (!footprint || candidate.area > footprint.area) footprint = candidate;
    }
    if (!footprint) throw new TypeError(`Landmark seed ${landmark.id} cannot form a structure-dominant footprint.`);
    return { ...footprint, id: landmark.id, landmarkSeed: landmark.point, sizeClass: "landmark" };
  });
  const distinct = result.filter((entry) => !landmarks.some((landmark) => distance(entry.center, landmark.center) < 40));
  const selected = [...landmarks, ...distinct].sort((a, b) => b.area - a.area).slice(0, 180);
  if (selected.length < 100) throw new TypeError(`Pixel component extraction yielded ${selected.length} structure-dominant footprints, below the required property.`);
  const areas = selected.filter(({ sizeClass }) => sizeClass !== "landmark").map(({ area }) => area).sort((a, b) => a - b);
  const compact = areas[Math.floor(areas.length * 0.45)]; const standard = areas[Math.floor(areas.length * 0.8)];
  return selected.map((entry, index) => Object.freeze({ ...entry, id: entry.id ?? `structure-${String(index + 1).padStart(3, "0")}`, structureDominance: round(entry.dominance.fraction, 4), structureSamples: entry.dominance.samples, sizeClass: entry.sizeClass ?? (entry.area <= compact ? "compact" : entry.area <= standard ? "standard" : "large") }));
}
function densityMap(footprints, districtUnion) {
  const columns = 12; const rows = 9; const cells = [];
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    const bounds = [Math.floor(column * WIDTH / columns), Math.floor(row * HEIGHT / rows), Math.floor((column + 1) * WIDTH / columns), Math.floor((row + 1) * HEIGHT / rows)];
    let covered = 0; for (let y = bounds[1]; y < bounds[3]; y += 1) for (let x = bounds[0]; x < bounds[2]; x += 1) covered += districtUnion[fullIndex(x, y)];
    const count = footprints.filter(({ center }) => center[0] >= bounds[0] && center[0] < bounds[2] && center[1] >= bounds[1] && center[1] < bounds[3]).length;
    cells.push({ bounds, column, density: round(count / Math.max(1, covered / 10_000), 4), footprintCount: count, row });
  }
  return { columns, rows, cells };
}
function terraceBands(districts) {
  return districts.flatMap((district) => { const [minX, minY, maxX, maxY] = district.analysis.bounds; const bands = [];
    for (let y = minY + 35; y < maxY - 35; y += 58) { const points = []; for (let x = minX; x < maxX; x += 32) if (maskAt(district.mask, x, y)) points.push([x, y]); if (points.length >= 3) bands.push({ id: `${district.definition.id}-band-${String(bands.length + 1).padStart(2, "0")}`, districtId: district.definition.id, points, source: "district-contained-luminance-row-sample" }); }
    return bands.slice(0, 4);
  });
}
function palette(master, water, districtUnion) {
  const families = { roof: [], wall: [], rock: [], foliage: [], water: [] };
  for (let y = 0; y < HEIGHT; y += 5) for (let x = 0; x < WIDTH; x += 5) { if (!districtUnion[fullIndex(x, y)] && !maskAt(water, x, y)) continue; const [r, g, b] = rgb(master, x, y); const sample = material(master, x, y, water); const key = `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
    const target = sample.waterLike ? "water" : sample.vegetation ? "foliage" : sample.roofOrMasonry ? (r > g * 1.18 ? "wall" : "roof") : r < 74 && g < 74 && b < 74 ? "rock" : "wall"; families[target].push(key); }
  return Object.fromEntries(Object.entries(families).map(([family, values]) => { const counts = new Map(); values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1)); return [family, { dominantSwatches: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([hex, count]) => ({ hex, count })), sampleCount: values.length }]; }));
}
function svg(content) { return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${content}</svg>`); }
function points(points) { return points.map(([x, y]) => `${round(x, 1)},${round(y, 1)}`).join(" "); }
async function graphOverlay(master, circulation, topology) {
  const mask = []; for (let y = 0; y < HEIGHT; y += 3) for (let x = 0; x < WIDTH; x += 3) if (circulation.pathMask[fullIndex(x, y)]) mask.push(`<rect x="${x}" y="${y}" width="3" height="3" fill="#ffd166" fill-opacity="0.18"/>`);
  const edgeColors = new Map();
  [...topology.components].sort((left, right) => right.length - left.length || left.edgeIds[0].localeCompare(right.edgeIds[0])).slice(0, COMPONENT_COLORS.length)
    .forEach((component, index) => component.edgeIds.forEach((id) => edgeColors.set(id, COMPONENT_COLORS[index])));
  const edges = circulation.edges.map((edge) => `<polyline points="${points(edge.points)}" fill="none" stroke="${edgeColors.get(edge.id) ?? OTHER_COMPONENT_COLOR}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"${edge.inferred ? ' stroke-dasharray="8 6"' : ""}/>`).join("");
  const legend = '<rect x="18" y="18" width="460" height="116" rx="8" fill="#07090d" fill-opacity="0.82"/><text x="34" y="44" fill="white" font-family="monospace" font-size="17">T1 r6 circulation components by length</text><text x="34" y="70" fill="#ffd166" font-family="monospace" font-size="14">amber field = classified warm-stone pixels</text><text x="34" y="94" fill="white" font-family="monospace" font-size="14">10 longest components = saturated colors; others = grey</text><text x="34" y="118" fill="white" font-family="monospace" font-size="14">dashed = inferred roof-or-foliage occlusion link</text>';
  return sharp(master.bytes).composite([{ input: svg(mask.join("") + edges + legend) }]).png({ compressionLevel: 9 }).toBuffer();
}
async function footprintOverlay(master, footprints, density) {
  const grid = density.cells.map((cell) => { const [x, y, right, bottom] = cell.bounds; return `<rect x="${x}" y="${y}" width="${right - x}" height="${bottom - y}" fill="none" stroke="#fff3b0" stroke-opacity="0.42" stroke-width="0.75"/><text x="${x + 4}" y="${y + 14}" fill="#fff3b0" fill-opacity="0.9" font-family="monospace" font-size="10">${cell.footprintCount}</text>`; }).join("");
  const shapes = footprints.map((footprint) => `<polygon points="${points(footprint.polygon)}" fill="${DISTRICT_COLORS[footprint.districtId]}" fill-opacity="0.22" stroke="${DISTRICT_COLORS[footprint.districtId]}" stroke-width="1.5"/>${footprint.sizeClass === "landmark" ? `<circle cx="${footprint.landmarkSeed[0]}" cy="${footprint.landmarkSeed[1]}" r="6" fill="none" stroke="white" stroke-width="2"/>` : ""}`).join("");
  return sharp(master.bytes).composite([{ input: svg(`${grid}${shapes}<rect x="18" y="18" width="260" height="50" rx="8" fill="#07090d" fill-opacity="0.82"/><text x="34" y="49" fill="white" font-family="monospace" font-size="17">T1 r3 structure components</text>`) }]).png({ compressionLevel: 9 }).toBuffer();
}
async function writeIfChanged(file, bytes) { const target = absolute(file); let current; try { current = await readFile(target); } catch (error) { if (error.code !== "ENOENT") throw error; } if (!current?.equals(bytes)) { await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, bytes); } }
async function verifyExact(file, bytes) { const current = await readFile(absolute(file)); if (!current.equals(bytes)) throw new TypeError(`${file} is stale; run build:ninjaone-city-grammar.`); }

const [layoutBytes, master, water, districtMasks] = await Promise.all([readFile(absolute(source.layout)), rawImage(source.master), rawImage(source.water, true), Promise.all(districtDefinitions.map(async (definition) => ({ definition, mask: await rawImage(definition.file, true) })))]);
const layout = JSON.parse(layoutBytes); if (layout.artboard.join(",") !== ARTBOARD.join(",")) throw new TypeError("The registered layout does not share master space.");
const districts = districtMasks.map((district) => ({ ...district, analysis: analyzeMask(district.mask) })); const districtUnion = new Uint8Array(WIDTH * HEIGHT); for (const district of districts) for (let index = 0; index < districtUnion.length; index += 1) if (district.mask.data[index] >= 128) districtUnion[index] = 1;
const masks = buildFullMasks(master, water, districtUnion); const circulation = buildCirculation(master, water, masks.pathMask, districts, masks.occluderMask, masks.bareRockMask); const footprints = buildFootprints(master, water, masks.structureMask, masks.landmarkMask, districts); const density = densityMap(footprints, districtUnion); const terraces = terraceBands(districts); const swatches = palette(master, water, districtUnion);
const circulationTopology = graphComponents(circulation.edges);
const inferredLength = circulation.edges.filter((edge) => edge.inferred).reduce((sum, edge) => sum + edgeLength(edge.points), 0);
const topologyDiagnostic = topologyDiagnostics(circulationTopology, inferredLength);
if (topologyDiagnostic.inferredLinkShare > MAX_INFERRED_LENGTH_SHARE) throw new TypeError(`Inferred circulation links consume ${topologyDiagnostic.inferredLinkShare} of total network length.`);
if (topologyDiagnostic.componentLengthShares.atLeast50Px < MIN_NETWORK_LENGTH_SHARE_AT_LEAST_50_PX) throw new TypeError(`Components at least 50px hold ${topologyDiagnostic.componentLengthShares.atLeast50Px} of network length, below the required property.`);
if (topologyDiagnostic.componentLengthShares.below40Px > MAX_NETWORK_LENGTH_SHARE_BELOW_40_PX) throw new TypeError(`Components below 40px hold ${topologyDiagnostic.componentLengthShares.below40Px} of network length, above the permitted property.`);
for (const edge of circulation.edges.filter((edge) => !edge.inferred)) if (edge.evidence.onPathRate < MIN_ON_PATH_RATE) throw new TypeError(`${edge.id} violates on-path material rate.`);
for (const [district, coverage] of Object.entries(circulation.coverage)) if (coverage.coverageRate < MIN_DISTRICT_COVERAGE) throw new TypeError(`${district} violates pixel-normalized circulation coverage.`);
for (const footprint of footprints) { const district = districts.find(({ definition }) => definition.id === footprint.districtId); if (!polygonInsideMask(footprint.polygon, district.mask) || footprint.structureDominance < MIN_STRUCTURE_DOMINANCE) throw new TypeError(`${footprint.id} violates footprint containment or structure dominance.`); }
const landmarkBboxOverlap = Object.fromEntries(LANDMARKS.map((landmark) => {
  const original = round(Math.max(...footprints.map((footprint) => bboxOverlapRate(footprint.polygon, landmark.bbox))), 4);
  if (!landmark.tightenedBbox) return [landmark.id, { original }];
  const tightened = round(Math.max(...footprints.map((footprint) => bboxOverlapRate(footprint.polygon, landmark.tightenedBbox))), 4);
  return [landmark.id, { original, tightened }];
}));
for (const landmark of LANDMARKS) {
  const overlap = landmarkBboxOverlap[landmark.id];
  if (landmark.tightenedBbox ? overlap.tightened < 0.7 : overlap.original < 0.7) throw new TypeError(`${landmark.id} does not meet the required landmark extent overlap.`);
}
const grammar = { schemaVersion: 1, id: "career-world/capitals/ninjaone/city-grammar@r3", status: "review", authority: { coordinateSpace: "master-1448x1086", derivation: "master-plate-pixel-classification-and-district-mask-assignment-with-occlusion-inference", sources: [{ id: "master-plate", path: source.master, role: "pixel-extraction-source", sha256: sha256(master.bytes) }, { id: "registered-layout", path: source.layout, role: "artboard-validation-and-node-naming-only", sha256: sha256(layoutBytes) }, { id: "registered-water", path: source.water, role: "bridge-classification-only", sha256: sha256(water.bytes) }] }, artboard: ARTBOARD, metadata: { topologyDiagnostic }, districts: districts.map(({ definition, analysis, mask }) => ({ ...analysis, id: definition.id, label: definition.label, maskPath: definition.file, maskSha256: sha256(mask.bytes) })), circulation: { ...circulation, pathMask: undefined, skeleton: undefined }, buildings: { footprints }, densityMap: density, terraces: { bands: terraces }, palette: swatches, validation: { circulationEdgesByKind: Object.fromEntries(["road", "stairs", "bridge"].map((kind) => [kind, circulation.edges.filter((edge) => edge.kind === kind).length])), circulationOnPathRate: round(Math.min(...circulation.edges.filter((edge) => !edge.inferred).map((edge) => edge.evidence.onPathRate)), 4), circulationTopology: topologyDiagnostic, districtCoverage: circulation.coverage, footprintCount: footprints.length, footprintStructureDominanceRate: round(Math.min(...footprints.map((footprint) => footprint.structureDominance)), 4), landmarkBboxOverlap, landmarkSeedHits: Object.fromEntries(LANDMARKS.map((seed) => [seed.id, footprints.some((footprint) => footprint.sizeClass === "landmark" && pointInsidePolygon(seed.point, footprint.polygon))])), propertyChecks: ["short angle-continuous mask-gap links repair visible extraction noise", "inferred links are endpoint-continuous, at most 70px, predominantly roof-or-foliage occluded, and never cross bare rock", "inferred links are marked in JSON, dashed in the graph overlay, and consume at most 40 percent of total network length", "components at least 50px hold at least 60 percent of total network length and components below 40px hold at most 35 percent", "topology component count and largest-component share remain reported diagnostics", "visible circulation points remain on classified warm-stone material", "each district skeleton satisfies pixel-normalized visible-circulation coverage", "merged roof-and-facade footprints remain within district masks and structure-dominant", "landmark footprints overlap the director-supplied extent boxes; the train hall is checked against its tightened bbox"] } };
if (Object.values(grammar.validation.landmarkSeedHits).some((hit) => !hit)) throw new TypeError("A required landmark seed misses its component footprint.");
const grammarBytes = Buffer.from(`${JSON.stringify(grammar, null, 2)}\n`); const [graphBytes, footprintBytes] = await Promise.all([graphOverlay(master, circulation, circulationTopology), footprintOverlay(master, footprints, density)]);
if (CHECK_ONLY) await Promise.all([verifyExact(output.grammar, grammarBytes), verifyExact(output.graph, graphBytes), verifyExact(output.footprints, footprintBytes)]); else await Promise.all([writeIfChanged(output.grammar, grammarBytes), writeIfChanged(output.graph, graphBytes), writeIfChanged(output.footprints, footprintBytes)]);
console.log(JSON.stringify({ checkOnly: CHECK_ONLY, circulationEdgesByKind: grammar.validation.circulationEdgesByKind, circulationOnPathRate: grammar.validation.circulationOnPathRate, topologyDiagnostic, districtCoverage: grammar.validation.districtCoverage, footprintCount: grammar.validation.footprintCount, footprintStructureDominanceRate: grammar.validation.footprintStructureDominanceRate, landmarkBboxOverlap: grammar.validation.landmarkBboxOverlap, landmarkSeedHits: grammar.validation.landmarkSeedHits }, null, 2));
