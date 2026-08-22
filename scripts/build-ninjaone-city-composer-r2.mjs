import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK_ONLY = process.argv.includes("--check");
const PASS_ISOLATION = process.argv.includes("--isolate-passes");
const MASTER = Object.freeze([1448, 1086]);
const D05_BOUNDS = Object.freeze([0, 413, 691, 1086]);
const SCALE = 2;
const WIDTH = (D05_BOUNDS[2] - D05_BOUNDS[0]) * SCALE;
const HEIGHT = (D05_BOUNDS[3] - D05_BOUNDS[1]) * SCALE;
const ROAD_WIDTH_MASTER_PX = 14;
const HEADING_TOLERANCE_DEGREES = 7.5;
const RUN_ENDPOINT_TOLERANCE = 8;
const MAX_TILE_GAP_MASTER_PX = 4;
const WORLD_LIGHT = Object.freeze([-0.42, -0.36, 0.83]);
const GRADE = Object.freeze({ gain: 1.08, offset: 8, saturation: 1.04 });
const CITY_WORLD_ORIGIN = Object.freeze([0.125, 0]);
const CITY_WORLD_SPAN = Object.freeze([0.25, 1 / 3]);
const S10_ISOLATION_CROP = Object.freeze({ left: 220, top: 543, width: 350, height: 332 });
const ISOLATION_PASSES = Object.freeze([
  "district-mask-clip",
  "contact-shading-band",
  "cast-shadow",
  "chroma-fringe-cleanup",
  "run-boundary-alpha-clip",
]);

const files = Object.freeze({
  grammar: "public/career-world/capitals/ninjaone/city-v2/grammar/ninjaone-city-grammar-r3.json",
  sourcePlacements: "public/career-world/capitals/ninjaone/city-v2/composition/d05-placements-r1.json",
  layout: "public/career-world/capitals/ninjaone/manifests/city-master-node-layout-r3.json",
  mask: "art-source/career-world/ninjaone-capital/city-r3/districts/D05-western-skill-terraces-mask.png",
  master: "art-source/career-world/ninjaone-capital/city-nodes-r2/master/ninjaone-capital-master-r1.png",
  environmentProof: "public/career-world/capitals/ninjaone/environment/manifests/environment-proof-r1.json",
  foliageManifest: "public/career-world/capitals/ninjaone/environment/manifests/foliage-native-r4.json",
  geology: "public/career-world/capitals/ninjaone/environment/plates/geology/ninjaone-environment-geology-close-r8.webp",
  surfaceDetail: "public/career-world/capitals/ninjaone/environment/plates/surface-detail/ninjaone-environment-surface-detail-close-r1.webp",
  manifest: ".codex-tmp/qa/T3/t3c-r4c/d05-placements-r4c.json",
  ungraded: ".codex-tmp/qa/T3/t3c-r4c/d05-composed-ungraded-r4c.png",
  graded: ".codex-tmp/qa/T3/t3c-r4c/d05-composed-graded-r4c.png",
  capital: ".codex-tmp/qa/T3/t3c-r4c/d05-composed-capital-scale-r4c.png",
  comparison: ".codex-tmp/qa/T3/t3c-r4c/d05-composed-vs-master-r4c.png",
  cleanTerrainComparison: ".codex-tmp/qa/T3/t3c-r4c/d05-composed-clean-standalone-r4c.png",
  passIsolation: ".codex-tmp/qa/T3/t3c-r4c/s10-pass-isolation-strip-r4c-pre-fix.png",
  s10Final: ".codex-tmp/qa/T3/t3c-r4c/s10-final-fixed-r4c.png",
});

const kitFiles = Object.freeze({
  slabH000: ".codex-tmp/quarantine/city-v2/T3b-probe-r2/n1-k2-ground-terrace-slab-standard-h000-r01/processed-b.kit.json",
  compact01: ".codex-tmp/quarantine/city-v2/T3b-probe-r2/n1-k2-building-compact-var01-h000-r01/processed-a.kit.json",
  slabH090: ".codex-tmp/quarantine/city-v2/T3b-g1/n1-k2-ground-terrace-slab-standard-h090-r01/processed-b.kit.json",
  wallStraight: ".codex-tmp/quarantine/city-v2/T3b-g1/n1-k2-ground-retaining-wall-straight-h000-r01/processed-a.kit.json",
  wallCorner: ".codex-tmp/quarantine/city-v2/T3b-g1/n1-k2-ground-retaining-wall-outside-corner-r01/processed-b.kit.json",
  cliff: ".codex-tmp/quarantine/city-v2/T3b-g1/n1-k2-ground-cliff-transition-west-taper-r01/processed-a.kit.json",
  roadH000: ".codex-tmp/quarantine/city-v2/T3b-g1/n1-k2-circulation-road-straight-h000-r02/processed-a.kit.json",
  roadH090: ".codex-tmp/quarantine/city-v2/T3b-g1/n1-k2-circulation-road-straight-h090-r01/processed-a.kit.json",
  roadCurveLeft: ".codex-tmp/quarantine/city-v2/T3b-g1/n1-k2-circulation-road-curve-left-r01/processed-a.kit.json",
  roadJunction: ".codex-tmp/quarantine/city-v2/T3b-g1/n1-k2-circulation-road-junction-t-r01/processed-b.kit.json",
  stairLeft: ".codex-tmp/quarantine/city-v2/T3b-g1/n1-k2-circulation-stair-run-ascend-left-r01/processed-a.kit.json",
  stairRight: ".codex-tmp/quarantine/city-v2/T3b-g1/n1-k2-circulation-stair-run-ascend-right-r01/processed-b.kit.json",
  compact02: ".codex-tmp/quarantine/city-v2/T3b-g2/n1-k2-building-compact-var02-h000-r01/processed-a.kit.json",
  compact03: ".codex-tmp/quarantine/city-v2/T3b-g2/n1-k2-building-compact-var03-h000-r01/processed-a.kit.json",
  standard01: ".codex-tmp/quarantine/city-v2/T3b-g2/n1-k2-building-standard-var01-h000-r01/processed-a.kit.json",
  standard02: ".codex-tmp/quarantine/city-v2/T3b-g2/n1-k2-building-standard-var02-h000-r01/processed-a.kit.json",
  skillS01: ".codex-tmp/quarantine/city-v2/T3b-g3-r02/n1-k2-building-skill-s01-golang-foundry-r02/processed-a.kit.json",
  skillS10: ".codex-tmp/quarantine/city-v2/T3b-g3-r02/n1-k2-building-skill-s10-databricks-works-r02/processed-a.kit.json",
  skillS11: ".codex-tmp/quarantine/city-v2/T3b-g3-r02/n1-k2-building-skill-s11-docker-warehouse-r02/processed-a.kit.json",
  skillS18: ".codex-tmp/quarantine/city-v2/T3b-g3-r02/n1-k2-building-skill-s18-tool-generation-wheelworks-r02/processed-a.kit.json",
  skillS15: ".codex-tmp/quarantine/city-v2/T3b-s15-archive/n1-k2-building-skill-s15-openapi-archive-r01/processed-b.kit.json",
  propLamp: ".codex-tmp/quarantine/city-v2/T3b-g4/n1-k2-prop-lamp-bollard-pair-r01/processed-a.kit.json",
  propCrates: ".codex-tmp/quarantine/city-v2/T3b-g4/n1-k2-prop-crates-barrels-r01/processed-a.kit.json",
  propBench: ".codex-tmp/quarantine/city-v2/T3b-g4/n1-k2-prop-bench-signpost-r01/processed-b.kit.json",
  propBeacon: ".codex-tmp/quarantine/city-v2/T3b-g4/n1-k2-prop-utility-beacon-r01/processed-a.kit.json",
});

const namedKitKeys = Object.freeze({ S01: "skillS01", S10: "skillS10", S11: "skillS11", S15: "skillS15", S18: "skillS18" });
const priorSidecarMappings = Object.freeze({
  slabH000: { masterFootprintSize: [96, 64], nativePixelsPerMasterPixel: 8, socketWidths: [13.5, 13.5] },
  compact01: { masterFootprintSize: [12, 10], nativePixelsPerMasterPixel: 36, socketWidths: [] },
  slabH090: { masterFootprintSize: [64, 96], nativePixelsPerMasterPixel: 8, socketWidths: [45.625, 45.625] },
  wallStraight: { masterFootprintSize: [96, 64], nativePixelsPerMasterPixel: 8, socketWidths: [] },
  wallCorner: { masterFootprintSize: [72, 72], nativePixelsPerMasterPixel: 8, socketWidths: [] },
  cliff: { masterFootprintSize: [88, 64], nativePixelsPerMasterPixel: 8, socketWidths: [37.125, 37.125] },
  roadH000: { masterFootprintSize: [36.409894, 14.14841], nativePixelsPerMasterPixel: 20.214286, socketWidths: [14, 14] },
  roadH090: { masterFootprintSize: [17.246377, 32.463768], nativePixelsPerMasterPixel: 14.785714, socketWidths: [14, 14] },
  roadCurveLeft: { masterFootprintSize: [35.368421, 35.368421], nativePixelsPerMasterPixel: 16.285714, socketWidths: [14, 14] },
  roadJunction: { masterFootprintSize: [42.442105, 37.726316], nativePixelsPerMasterPixel: 13.571429, socketWidths: [14, 14, 14] },
  stairLeft: { masterFootprintSize: [64, 56], nativePixelsPerMasterPixel: 8, socketWidths: [12.25, 12.25] },
  stairRight: { masterFootprintSize: [64, 56], nativePixelsPerMasterPixel: 8, socketWidths: [11.75, 11.75] },
  compact02: { masterFootprintSize: [13.333, 12.528], nativePixelsPerMasterPixel: 36, socketWidths: [] },
  compact03: { masterFootprintSize: [13.333, 12.444], nativePixelsPerMasterPixel: 36, socketWidths: [] },
  standard01: { masterFootprintSize: [20.444, 19.389], nativePixelsPerMasterPixel: 36, socketWidths: [] },
  standard02: { masterFootprintSize: [20.444, 16], nativePixelsPerMasterPixel: 36, socketWidths: [] },
  skillS01: { masterFootprintSize: [26.833, 27.278], nativePixelsPerMasterPixel: 36, socketWidths: [3] },
  skillS10: { masterFootprintSize: [27.278, 25.833], nativePixelsPerMasterPixel: 36, socketWidths: [3] },
  skillS11: { masterFootprintSize: [27.278, 16.556], nativePixelsPerMasterPixel: 36, socketWidths: [3] },
  skillS18: { masterFootprintSize: [27.278, 24.583], nativePixelsPerMasterPixel: 36, socketWidths: [3] },
  skillS15: { masterFootprintSize: [27.278, 27.083], nativePixelsPerMasterPixel: 36, socketWidths: [3] },
  propLamp: { masterFootprintSize: [2.458, 4.667], nativePixelsPerMasterPixel: 48, socketWidths: [] },
  propCrates: { masterFootprintSize: [3.203, 3.5], nativePixelsPerMasterPixel: 64, socketWidths: [] },
  propBench: { masterFootprintSize: [2.844, 3.5], nativePixelsPerMasterPixel: 64, socketWidths: [] },
  propBeacon: { masterFootprintSize: [1.813, 7.5], nativePixelsPerMasterPixel: 64, socketWidths: [] },
});

function absolute(file) { return path.join(ROOT, file); }
function round(value, digits = 3) { const factor = 10 ** digits; return Math.round(value * factor) / factor; }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function assert(condition, message) { if (!condition) throw new TypeError(message); }
function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }
function distance(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
function centroid(points) { return points.reduce((sum, point) => [sum[0] + point[0], sum[1] + point[1]], [0, 0]).map((value) => value / points.length); }
function bottomSortPoint(points) {
  const maximumY = Math.max(...points.map(([, y]) => y));
  const bottom = points.filter(([, y]) => Math.abs(y - maximumY) <= 0.001);
  return [bottom.reduce((sum, [x]) => sum + x, 0) / bottom.length, maximumY];
}
function localMaster([x, y]) { return [(x - D05_BOUNDS[0]) * SCALE, (y - D05_BOUNDS[1]) * SCALE]; }
function headingDegrees(start, end) { return (Math.atan2(end[1] - start[1], end[0] - start[0]) * 180 / Math.PI + 360) % 360; }
function axisDifference(degrees, axis) {
  const normalized = ((degrees % 180) + 180) % 180;
  const target = ((axis % 180) + 180) % 180;
  const raw = Math.abs(normalized - target);
  return Math.min(raw, 180 - raw);
}
function polylineLength(points) { return points.slice(1).reduce((sum, point, index) => sum + distance(points[index], point), 0); }
function bbox(points) {
  return [Math.min(...points.map(([x]) => x)), Math.min(...points.map(([, y]) => y)), Math.max(...points.map(([x]) => x)), Math.max(...points.map(([, y]) => y))];
}
function renderedBoundsOverlapStats(placements) {
  let pairCount = 0; let overlappingPairs = 0; let totalOverlapAreaMasterPx2 = 0;
  for (let leftIndex = 0; leftIndex < placements.length; leftIndex += 1) for (let rightIndex = leftIndex + 1; rightIndex < placements.length; rightIndex += 1) {
    pairCount += 1;
    const left = placements[leftIndex].renderedBoundsMasterPx; const right = placements[rightIndex].renderedBoundsMasterPx;
    const width = Math.max(0, Math.min(left[2], right[2]) - Math.max(left[0], right[0]));
    const height = Math.max(0, Math.min(left[3], right[3]) - Math.max(left[1], right[1]));
    if (width > 0 && height > 0) { overlappingPairs += 1; totalOverlapAreaMasterPx2 += width * height; }
  }
  return { pairCount, overlappingPairs, overlappingPairShare: round(overlappingPairs / pairCount, 4), totalOverlapAreaMasterPx2: round(totalOverlapAreaMasterPx2) };
}
function boundsOverlapArea(left, right) {
  return Math.max(0, Math.min(left[2], right[2]) - Math.max(left[0], right[0]))
    * Math.max(0, Math.min(left[3], right[3]) - Math.max(left[1], right[1]));
}
function buildingPriority(placement) {
  if (placement.namedSkill) return 0;
  if (placement.class === "large") return 1;
  if (placement.class === "standard") return 2;
  return 3;
}
function percentileUnrounded(values, ratio) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * ratio;
  const lower = Math.floor(index); const upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}
function measureMasterBuildingOverlap(candidates) {
  const pairShares = []; const directionalShares = [];
  let overlappingPairs = 0;
  for (let leftIndex = 0; leftIndex < candidates.length; leftIndex += 1) for (let rightIndex = leftIndex + 1; rightIndex < candidates.length; rightIndex += 1) {
    const left = candidates[leftIndex].renderedBoundsMasterPx; const right = candidates[rightIndex].renderedBoundsMasterPx;
    const area = boundsOverlapArea(left, right);
    const leftArea = (left[2] - left[0]) * (left[3] - left[1]); const rightArea = (right[2] - right[0]) * (right[3] - right[1]);
    const pairShare = area / Math.min(leftArea, rightArea);
    pairShares.push(pairShare); directionalShares.push(area / leftArea, area / rightArea);
    if (area > 0) overlappingPairs += 1;
  }
  const nonzeroPairShares = pairShares.filter((share) => share > 0);
  const nonzeroDirectionalShares = directionalShares.filter((share) => share > 0);
  return {
    measurement: "pairwise rendered bounds of all 32 D05 grammar-footprint placements at layout-derived registered widths; normalized by the smaller bound for pair statistics and by the candidate bound for admission",
    pairCount: pairShares.length,
    overlappingPairs,
    overlappingPairShare: round(overlappingPairs / pairShares.length, 4),
    pairOverlapShare: { p50: round(percentileUnrounded(pairShares, 0.50), 4), p90: round(percentileUnrounded(pairShares, 0.90), 4), maximum: round(Math.max(...pairShares), 4) },
    nonzeroPairOverlapShare: { count: nonzeroPairShares.length, p50: round(percentileUnrounded(nonzeroPairShares, 0.50), 4), p90: round(percentileUnrounded(nonzeroPairShares, 0.90), 4), maximum: round(Math.max(...nonzeroPairShares), 4) },
    directionalCandidateOverlapShare: { count: nonzeroDirectionalShares.length, p90: round(percentileUnrounded(nonzeroDirectionalShares, 0.90), 4) },
  };
}
function applyBuildingOccupancy(candidates, maximumOverlapShare) {
  const placed = []; const skipped = [];
  for (const candidate of [...candidates].sort((left, right) => buildingPriority(left) - buildingPriority(right) || left.id.localeCompare(right.id))) {
    const candidateBounds = candidate.renderedBoundsMasterPx;
    const candidateArea = (candidateBounds[2] - candidateBounds[0]) * (candidateBounds[3] - candidateBounds[1]);
    const conflicting = candidate.namedSkill ? null : placed.find((existing) => boundsOverlapArea(candidateBounds, existing.renderedBoundsMasterPx) / candidateArea > maximumOverlapShare);
    if (conflicting) skipped.push({ id: candidate.id, class: candidate.class, priority: buildingPriority(candidate), conflictingPlacementId: conflicting.id, overlapShareOfCandidate: round(boundsOverlapArea(candidateBounds, conflicting.renderedBoundsMasterPx) / candidateArea, 4) });
    else placed.push({ ...candidate, occupancy: { priority: buildingPriority(candidate), acceptanceOrder: placed.length, maximumOverlapShare, namedAnchorAuthority: Boolean(candidate.namedSkill) } });
  }
  return { placements: placed, skipped };
}
function interpolate(start, end, ratio) { return [start[0] + (end[0] - start[0]) * ratio, start[1] + (end[1] - start[1]) * ratio]; }
function pointKey([x, y]) { return `${round(x, 1)},${round(y, 1)}`; }

async function loadJson(file) { return JSON.parse(await readFile(absolute(file), "utf8")); }
async function loadMask() {
  const { data, info } = await sharp(absolute(files.mask)).greyscale().raw().toBuffer({ resolveWithObject: true });
  assert(info.width === MASTER[0] && info.height === MASTER[1], `D05 mask must be ${MASTER.join("x")}.`);
  return data;
}
function maskAt(mask, [x, y]) {
  const integerX = Math.floor(x); const integerY = Math.floor(y);
  return integerX >= 0 && integerY >= 0 && integerX < MASTER[0] && integerY < MASTER[1] && mask[integerY * MASTER[0] + integerX] >= 128;
}
function distanceToMask(mask, point, limit = RUN_ENDPOINT_TOLERANCE) {
  if (maskAt(mask, point)) return 0;
  for (let radius = 1; radius <= limit; radius += 1) {
    for (let y = Math.floor(point[1] - radius); y <= Math.ceil(point[1] + radius); y += 1) {
      for (let x = Math.floor(point[0] - radius); x <= Math.ceil(point[0] + radius); x += 1) if (maskAt(mask, [x, y])) return distance(point, [x, y]);
    }
  }
  return Number.POSITIVE_INFINITY;
}
function polygonInsideMask(mask, polygon) {
  const samples = [...polygon, centroid(polygon)];
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index]; const end = polygon[(index + 1) % polygon.length];
    const count = Math.max(1, Math.ceil(distance(start, end) / 3));
    for (let step = 1; step < count; step += 1) samples.push(interpolate(start, end, step / count));
  }
  return samples.every((point) => maskAt(mask, point));
}
function nearestInMask(mask, point, limit = 24) {
  if (maskAt(mask, point)) return point;
  for (let radius = 1; radius <= limit; radius += 1) {
    for (let y = Math.floor(point[1] - radius); y <= Math.ceil(point[1] + radius); y += 1) {
      for (let x = Math.floor(point[0] - radius); x <= Math.ceil(point[0] + radius); x += 1) if (maskAt(mask, [x, y])) return [x, y];
    }
  }
  throw new TypeError(`No D05 mask point near ${point.join(",")}.`);
}

async function loadKit() {
  const entries = {};
  for (const [key, sidecarPath] of Object.entries(kitFiles)) {
    const metadata = await loadJson(sidecarPath);
    const imagePath = path.posix.join(path.posix.dirname(sidecarPath), metadata.image);
    const imageBytes = await readFile(absolute(imagePath));
    const { data, info } = await sharp(imageBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const alphaBounds = [info.width, info.height, -1, -1];
    for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] === 0) continue;
      alphaBounds[0] = Math.min(alphaBounds[0], x); alphaBounds[1] = Math.min(alphaBounds[1], y);
      alphaBounds[2] = Math.max(alphaBounds[2], x); alphaBounds[3] = Math.max(alphaBounds[3], y);
    }
    assert(alphaBounds[2] >= alphaBounds[0] && alphaBounds[3] >= alphaBounds[1], `${metadata.id} has no nonzero alpha.`);
    entries[key] = { key, sidecarPath, metadata, imagePath, imageBytes, alphaBounds, sidecarSha256: sha256(await readFile(absolute(sidecarPath))), imageSha256: sha256(imageBytes) };
  }
  return entries;
}

function percentile(values, ratio) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * ratio;
  const lower = Math.floor(index); const upper = Math.ceil(index);
  return round(sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower));
}
function deriveDisplayWidthAuthority(layout) {
  const backgroundWidths = layout.nodes.filter((node) => node.layerId === "L4_4" && /^D\d+$/.test(node.assetId)).map((node) => node.displayWidth);
  assert(backgroundWidths.length > 0, "The layout has no non-primary L4_4 background-building widths.");
  const named = Object.fromEntries(Object.keys(namedKitKeys).map((skillId) => {
    const node = layout.nodes.find((candidate) => candidate.assetId === skillId);
    assert(node?.displayWidth > 0, `The layout has no displayWidth for ${skillId}.`);
    return [skillId, node.displayWidth];
  }));
  return {
    source: "city-master-node-layout-r3 L4_4 D## background-building displayWidth distribution",
    sampleCount: backgroundWidths.length,
    percentiles: { p25: percentile(backgroundWidths, 0.25), p50: percentile(backgroundWidths, 0.5), p75: percentile(backgroundWidths, 0.75) },
    classTargets: { compact: percentile(backgroundWidths, 0.25), standard: percentile(backgroundWidths, 0.5), large: percentile(backgroundWidths, 0.75) },
    named,
  };
}
function summarizeScaleMappings(kit) {
  return Object.entries(kit).map(([key, entry]) => ({
    key,
    assetId: entry.metadata.id,
    old: priorSidecarMappings[key],
    new: {
      masterFootprintSize: entry.metadata.masterFootprintSize,
      nativePixelsPerMasterPixel: entry.metadata.nativePixelsPerMasterPixel,
      socketWidths: entry.metadata.groundSocket.connectionSockets.map((socket) => socket.widthMasterPx),
    },
  }));
}

function transformedSocketPolygon(kit, anchor) {
  const ppm = kit.metadata.nativePixelsPerMasterPixel;
  const [sortX, sortY] = kit.metadata.groundSocket.sortPoint;
  return kit.metadata.groundSocket.footprintPolygon.map(([x, y]) => [round(anchor[0] + (x - sortX) / ppm), round(anchor[1] + (y - sortY) / ppm)]);
}
function transformedAlphaBounds(kit, anchor) {
  const ppm = kit.metadata.nativePixelsPerMasterPixel;
  const [sortX, sortY] = kit.metadata.groundSocket.sortPoint;
  const [minimumX, minimumY, maximumX, maximumY] = kit.alphaBounds;
  return [
    round(anchor[0] + (minimumX - sortX) / ppm),
    round(anchor[1] + (minimumY - sortY) / ppm),
    round(anchor[0] + (maximumX + 1 - sortX) / ppm),
    round(anchor[1] + (maximumY + 1 - sortY) / ppm),
  ];
}
function makePlacement({ id, kit, family, className, anchor, sourceFootprint = null, source = {}, zBias = 0 }) {
  const contactPolygon = transformedSocketPolygon(kit, anchor);
  const renderedBounds = transformedAlphaBounds(kit, anchor);
  const sortPoint = [round(anchor[0]), round(anchor[1])];
  return {
    id,
    family,
    class: className,
    assetId: kit.metadata.id,
    assetSource: { sidecar: kit.sidecarPath, sidecarSha256: kit.sidecarSha256, image: kit.imagePath, imageSha256: kit.imageSha256 },
    masterAnchor: sortPoint,
    sourceFootprint,
    renderedBoundsMasterPx: renderedBounds,
    renderedWidthMasterPx: round(renderedBounds[2] - renderedBounds[0]),
    districtMaskClip: { policy: "D05-full-context-alpha-multiply", interpolation: "lanczos3 bounded by binary D05 support", maximumRenderedOverhangMasterPx: 0 },
    contactPolygon,
    socket: {
      baselineY: round(anchor[1]),
      sortPoint,
      footprintPolygon: contactPolygon,
      connectionSockets: kit.metadata.groundSocket.connectionSockets.map((socket) => ({ ...socket })),
    },
    terraceMode: kit.metadata.groundSocket.terraceCompatibility.mode,
    zBias,
    zSortKey: round(anchor[1] + zBias),
    ...source,
  };
}
function sortPlacements(placements) {
  return [...placements].sort((left, right) => left.zSortKey - right.zSortKey || left.masterAnchor[0] - right.masterAnchor[0] || left.assetId.localeCompare(right.assetId) || left.id.localeCompare(right.id));
}

function colorGenericGroup(buildings, kitKeys, groupClasses) {
  const nodes = buildings.filter((placement) => !placement.namedSkill && groupClasses.includes(placement.class));
  const edges = [];
  for (let left = 0; left < nodes.length; left += 1) {
    for (let right = left + 1; right < nodes.length; right += 1) {
      if (distance(nodes[left].masterAnchor, nodes[right].masterAnchor) <= 40) edges.push([left, right]);
    }
  }
  const colors = Array(nodes.length).fill(-1);
  function assign(index) {
    if (index === nodes.length) return true;
    const blocked = new Set(edges.flatMap(([left, right]) => left === index && colors[right] >= 0 ? [colors[right]] : right === index && colors[left] >= 0 ? [colors[left]] : []));
    for (let color = 0; color < kitKeys.length; color += 1) {
      if (blocked.has(color)) continue;
      colors[index] = color;
      if (assign(index + 1)) return true;
    }
    colors[index] = -1;
    return false;
  }
  assert(assign(0), `Available ${groupClasses.join("/")} variants cannot color the 40px adjacency graph.`);
  return { assignments: new Map(nodes.map((node, index) => [node.id, kitKeys[colors[index]]])), edges: edges.map(([left, right]) => [nodes[left].id, nodes[right].id]) };
}

function buildBuildings(sourcePlacements, kit, displayWidthAuthority) {
  const sources = sourcePlacements.filter((placement) => placement.family === "building");
  const compact = colorGenericGroup(sources, ["compact01", "compact02", "compact03"], ["compact"]);
  const standard = colorGenericGroup(sources, ["standard01", "standard02"], ["standard", "large"]);
  const adjacencyEdges = [...compact.edges, ...standard.edges];
  const placements = sources.map((source) => {
    const kitKey = source.namedSkill ? namedKitKeys[source.namedSkill.id] : compact.assignments.get(source.id) ?? standard.assignments.get(source.id);
    assert(kitKey, `No kit entry resolved for ${source.id}.`);
    const anchor = source.namedSkill ? source.namedSkill.registrationAnchor : bottomSortPoint(source.masterFootprint);
    const displayWidthTargetMasterPx = source.namedSkill ? displayWidthAuthority.named[source.namedSkill.id] : displayWidthAuthority.classTargets[source.class];
    assert(displayWidthTargetMasterPx > 0, `No display-width target resolved for ${source.id}.`);
    return makePlacement({
      id: source.id,
      kit: kit[kitKey],
      family: "building",
      className: source.class,
      anchor,
      sourceFootprint: source.masterFootprint,
      source: { grammarFootprintId: source.id.replace(/^building-/, ""), namedSkill: source.namedSkill, variantKey: kitKey, displayWidthTargetMasterPx, displayWidthAuthority: source.namedSkill ? "registered-node" : `background-building-${source.class}`, genericLargeUsesStandardKit: !source.namedSkill && source.class === "large" },
    });
  });
  return { placements, adjacencyEdges };
}

function buildGround(sourcePlacements, kit) {
  const bands = sourcePlacements.filter((placement) => placement.family === "ground").sort((left, right) => left.id.localeCompare(right.id));
  const placements = [];
  for (const [bandIndex, band] of bands.entries()) {
    const points = band.masterFootprint;
    const middleIndex = Math.floor((points.length - 1) / 2);
    const segmentStart = points[middleIndex]; const segmentEnd = points[Math.min(points.length - 1, middleIndex + 1)];
    const degrees = headingDegrees(segmentStart, segmentEnd);
    const slabKey = axisDifference(degrees, 90) < axisDifference(degrees, 0) ? "slabH090" : "slabH000";
    placements.push(makePlacement({ id: `ground-${band.id}-slab`, kit: kit[slabKey], family: "ground", className: "terrace-slab", anchor: nearestInMask(globalMask, centroid(points)), sourceFootprint: points, source: { bandId: band.id, role: "terrace-run", traceHeadingDegrees: round(degrees) }, zBias: -10000 }));
    const longest = points.slice(1).map((end, index) => ({ start: points[index], end, length: distance(points[index], end) })).sort((left, right) => right.length - left.length)[0];
    placements.push(makePlacement({ id: `ground-${band.id}-wall`, kit: kit.wallStraight, family: "ground", className: "retaining-wall", anchor: nearestInMask(globalMask, interpolate(longest.start, longest.end, 0.5)), sourceFootprint: [longest.start, longest.end], source: { bandId: band.id, role: "band-edge", traceHeadingDegrees: round(headingDegrees(longest.start, longest.end)) }, zBias: -9500 }));
    const cornerIndex = Math.max(1, Math.min(points.length - 2, middleIndex));
    const corner = points[cornerIndex];
    placements.push(makePlacement({ id: `ground-${band.id}-corner`, kit: kit.wallCorner, family: "ground", className: "retaining-wall", anchor: nearestInMask(globalMask, corner), sourceFootprint: [corner], source: { bandId: band.id, role: "outside-corner" }, zBias: -9400 }));
    if (bandIndex < 3) placements.push(makePlacement({ id: `ground-${band.id}-cliff`, kit: kit.cliff, family: "ground", className: "cliff-transition", anchor: nearestInMask(globalMask, points.reduce((best, point) => point[0] < best[0] ? point : best, points[0])), sourceFootprint: points, source: { bandId: band.id, role: "western-rock-taper" }, zBias: -9300 }));
  }
  return placements;
}

function socketSpan(kit) {
  const sockets = kit.metadata.groundSocket.connectionSockets;
  assert(sockets.length >= 2, `${kit.metadata.id} has fewer than two route sockets.`);
  return distance(sockets[0].point, sockets[1].point) / kit.metadata.nativePixelsPerMasterPixel;
}
function buildCirculation(sourcePlacements, kit) {
  const runs = sourcePlacements.filter((placement) => placement.family === "circulation");
  const placements = [];
  const coverage = [];
  let totalSegmentLength = 0; let mismatchedSegmentLength = 0; let rightHandBends = 0; let shortRunClipCount = 0;
  const endpointDegree = new Map();
  for (const run of runs.filter((entry) => entry.kind === "road")) for (const point of [run.masterFootprint[0], run.masterFootprint.at(-1)]) endpointDegree.set(pointKey(point), (endpointDegree.get(pointKey(point)) ?? 0) + 1);
  for (const run of runs) {
    let runMaximumGap = 0;
    const runLength = polylineLength(run.masterFootprint);
    for (let segmentIndex = 1; segmentIndex < run.masterFootprint.length; segmentIndex += 1) {
      const start = run.masterFootprint[segmentIndex - 1]; const end = run.masterFootprint[segmentIndex];
      const length = distance(start, end); const degrees = headingDegrees(start, end);
      let kitKey;
      if (run.kind === "stairs") kitKey = ((end[0] - start[0]) * (end[1] - start[1]) < 0) ? "stairLeft" : "stairRight";
      else kitKey = axisDifference(degrees, 90) < axisDifference(degrees, 0) ? "roadH090" : "roadH000";
      const axis = kitKey === "roadH090" ? 90 : 0;
      const mismatch = run.kind === "road" ? axisDifference(degrees, axis) : Math.min(axisDifference(degrees, 0), axisDifference(degrees, 90));
      totalSegmentLength += length;
      if (mismatch > HEADING_TOLERANCE_DEGREES) mismatchedSegmentLength += length;
      const span = socketSpan(kit[kitKey]);
      const clipShortRun = runLength < span;
      const count = Math.max(1, Math.ceil(length / Math.max(1, span - 2)));
      const centerSpacing = length / count;
      const maximumGap = round(Math.max(0, centerSpacing - span));
      runMaximumGap = Math.max(runMaximumGap, maximumGap);
      for (let tileIndex = 0; tileIndex < count; tileIndex += 1) {
        const anchor = nearestInMask(globalMask, interpolate(start, end, (tileIndex + 0.5) / count));
        if (clipShortRun) shortRunClipCount += 1;
        placements.push(makePlacement({ id: `${run.id}-segment-${segmentIndex}-tile-${tileIndex + 1}`, kit: kit[kitKey], family: "circulation", className: run.kind === "stairs" ? "stair-run" : "road-straight", anchor, sourceFootprint: [start, end], source: { runId: run.id, kind: run.kind, segmentIndex, tileIndex: tileIndex + 1, sourceEdgeIds: run.sourceEdgeIds, traceHeadingDegrees: round(degrees), authoredHeadingAxisDegrees: axis, headingMismatchDegrees: round(mismatch), socketSpanMasterPx: round(span), endCapClip: clipShortRun ? { policy: "alpha-crop-at-run-boundary", start, end } : null }, zBias: -5000 }));
      }
      if (run.kind === "road" && segmentIndex < run.masterFootprint.length - 1) {
        const next = run.masterFootprint[segmentIndex + 1];
        const cross = (end[0] - start[0]) * (next[1] - end[1]) - (end[1] - start[1]) * (next[0] - end[0]);
        if (cross > 0) rightHandBends += 1;
        placements.push(makePlacement({ id: `${run.id}-bend-${segmentIndex}`, kit: kit.roadCurveLeft, family: "circulation", className: "road-curve", anchor: nearestInMask(globalMask, end), sourceFootprint: [start, end, next], source: { runId: run.id, kind: "road", bendHandedness: cross > 0 ? "right-required-left-substitution" : "left" }, zBias: -4990 }));
      }
    }
    coverage.push({ runId: run.id, kind: run.kind, lengthMasterPx: round(runLength), maximumUntiledGapMasterPx: round(runMaximumGap), endCapPolicy: placements.some((placement) => placement.runId === run.id && placement.endCapClip) ? "alpha-crop-at-run-boundary" : "full-module", endpointsWithinMaskTolerance: [distanceToMask(globalMask, run.masterFootprint[0]), distanceToMask(globalMask, run.masterFootprint.at(-1))].every((value) => value <= RUN_ENDPOINT_TOLERANCE) });
  }
  for (const run of runs.filter((entry) => entry.kind === "road")) {
    for (const point of [run.masterFootprint[0], run.masterFootprint.at(-1)]) if ((endpointDegree.get(pointKey(point)) ?? 0) >= 3) {
      const id = `junction-${pointKey(point).replace(",", "-")}`;
      if (!placements.some((placement) => placement.id === id)) placements.push(makePlacement({ id, kit: kit.roadJunction, family: "circulation", className: "road-junction", anchor: nearestInMask(globalMask, point), sourceFootprint: [point], source: { kind: "road", junctionDegree: endpointDegree.get(pointKey(point)) }, zBias: -4980 }));
    }
  }
  return { placements, coverage, headingMismatchLengthShare: round(mismatchedSegmentLength / totalSegmentLength, 4), rightHandBends, shortRunClipCount };
}

function densityAt(grammar, point) {
  return grammar.densityMap.cells.find((cell) => point[0] >= cell.bounds[0] && point[0] < cell.bounds[2] && point[1] >= cell.bounds[1] && point[1] < cell.bounds[3])?.density ?? 0;
}
function buildProps(circulation, ground, buildings, grammar, kit) {
  const placements = [];
  const placeWithoutBuildingOverlap = ({ id, kit: propKit, className, point, source, zBias }) => {
    const anchors = [nearestInMask(globalMask, point)];
    for (let radius = 8; radius <= 400; radius += 8) for (let offset = -radius; offset <= radius; offset += 8) {
      for (const [offsetX, offsetY] of [[offset, -radius], [offset, radius], [-radius, offset], [radius, offset]]) {
        const anchor = [point[0] + offsetX, point[1] + offsetY];
        if (maskAt(globalMask, anchor)) anchors.push(anchor);
      }
    }
    for (const anchor of anchors) {
      const candidate = makePlacement({ id, kit: propKit, family: "prop", className, anchor, source, zBias });
      if (buildings.every((building) => boundsOverlapArea(candidate.renderedBoundsMasterPx, building.renderedBoundsMasterPx) === 0)) return candidate;
    }
    throw new TypeError(`${id} cannot avoid every accepted building rendered bound.`);
  };
  const roadCandidates = circulation.filter((placement) => placement.class === "road-straight").sort((left, right) => densityAt(grammar, right.masterAnchor) - densityAt(grammar, left.masterAnchor) || left.id.localeCompare(right.id));
  const chosenLamps = [];
  for (const candidate of roadCandidates) {
    if (chosenLamps.every((point) => distance(point, candidate.masterAnchor) >= 24)) chosenLamps.push(candidate.masterAnchor);
    if (chosenLamps.length === 10) break;
  }
  for (const [index, point] of chosenLamps.entries()) placements.push(placeWithoutBuildingOverlap({ id: `prop-lamp-${index + 1}`, kit: kit.propLamp, className: "lamp-bollard", point: [point[0] + (index % 2 ? -8 : 8), point[1]], source: { placementRule: "highest-density road tiles, 24px spacing", density: round(densityAt(grammar, point)) }, zBias: 10 }));
  const named = Object.fromEntries(buildings.filter((placement) => placement.namedSkill).map((placement) => [placement.namedSkill.id, placement.masterAnchor]));
  const dockerServiceAnchor = named.S11 ?? chosenLamps.at(-1);
  const openApiApproachAnchor = named.S15 ?? chosenLamps[0];
  for (const [index, offset] of [[-8, -2], [7, -1], [0, 7]].entries()) placements.push(placeWithoutBuildingOverlap({ id: `prop-crates-${index + 1}`, kit: kit.propCrates, className: "crates-barrels", point: [dockerServiceAnchor[0] + offset[0], dockerServiceAnchor[1] + offset[1]], source: { placementRule: named.S11 ? "Docker Warehouse service yard" : "highest-density circulation fallback after Docker occupancy rejection" }, zBias: 12 }));
  for (const [index, offset] of [[-7, 4], [7, 4]].entries()) placements.push(placeWithoutBuildingOverlap({ id: `prop-bench-${index + 1}`, kit: kit.propBench, className: "bench-signpost", point: [openApiApproachAnchor[0] + offset[0], openApiApproachAnchor[1] + offset[1]], source: { placementRule: named.S15 ? "OpenAPI Archive approach" : "highest-density circulation fallback after OpenAPI occupancy rejection" }, zBias: 11 }));
  const corners = ground.filter((placement) => placement.role === "outside-corner").slice(0, 5).map((placement) => placement.masterAnchor);
  while (corners.length < 5) corners.push(ground[corners.length % ground.length].masterAnchor);
  for (const [index, point] of corners.entries()) placements.push(placeWithoutBuildingOverlap({ id: `prop-beacon-${index + 1}`, kit: kit.propBeacon, className: "utility-beacon", point, source: { placementRule: "terrace outside corner" }, zBias: 13 }));
  assert(placements.length >= 16 && placements.length <= 24, `Prop count ${placements.length} leaves the 16-24 requirement.`);
  return placements;
}

let globalMask;

function passEnabled(options, pass) { return !options.disabledPasses?.has(pass); }
async function preparedSprite(kit, options = {}) {
  const ppm = kit.metadata.nativePixelsPerMasterPixel;
  const width = Math.max(1, Math.round(kit.metadata.canvas[0] * SCALE / ppm));
  const height = Math.max(1, Math.round(kit.metadata.canvas[1] * SCALE / ppm));
  const { data, info } = await sharp(kit.imageBytes).resize(width, height, { fit: "fill", kernel: "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (passEnabled(options, "chroma-fringe-cleanup")) {
    for (let index = 0; index < data.length; index += 4) {
      const [red, green, blue, alpha] = data.subarray(index, index + 4);
      if (alpha <= 160 && red > green * 1.4 && blue > green * 1.25) data[index + 3] = 0;
    }
  }
  return sharp(data, { raw: info }).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
}
async function shadowSprite(sprite, opacity, blurSigma) {
  const { data, info } = await sharp(sprite).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let index = 0; index < data.length; index += 4) {
    data[index] = 0; data[index + 1] = 0; data[index + 2] = 0; data[index + 3] = Math.round(data[index + 3] * opacity);
  }
  return sharp(data, { raw: info }).blur(blurSigma).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
}
async function clipSpriteAtRunBoundary(sprite, placement, left, top) {
  const { width, height } = await sharp(sprite).metadata();
  const start = localMaster(placement.endCapClip.start); const end = localMaster(placement.endCapClip.end);
  const deltaX = end[0] - start[0]; const deltaY = end[1] - start[1];
  const length = Math.hypot(deltaX, deltaY);
  assert(length > 0, `${placement.id} cannot clip against a zero-length run.`);
  const perpendicular = [-deltaY / length, deltaX / length];
  const reach = WIDTH + HEIGHT;
  const points = [
    [start[0] + perpendicular[0] * reach - left, start[1] + perpendicular[1] * reach - top],
    [end[0] + perpendicular[0] * reach - left, end[1] + perpendicular[1] * reach - top],
    [end[0] - perpendicular[0] * reach - left, end[1] - perpendicular[1] * reach - top],
    [start[0] - perpendicular[0] * reach - left, start[1] - perpendicular[1] * reach - top],
  ];
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><polygon points="${points.map((point) => point.join(",")).join(" ")}" fill="white"/></svg>`);
  return sharp(sprite).composite([{ input: svg, blend: "dest-in" }]).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
}
async function contactBand(placement) {
  const bounds = bbox(placement.contactPolygon.map(localMaster));
  const width = Math.max(4, Math.ceil(bounds[2] - bounds[0]));
  const height = Math.max(3, Math.min(14, Math.ceil((bounds[3] - bounds[1]) * 0.3)));
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><ellipse cx="${width / 2}" cy="${height / 2}" rx="${Math.max(1, width / 2 - 1)}" ry="${Math.max(1, height / 2 - 1)}" fill="rgba(0,0,0,0.52)"/></svg>`);
  return { input: await sharp(svg).blur(1.4).png().toBuffer(), left: Math.round(bounds[0]), top: Math.round(bounds[3] - height * 0.65) };
}
async function renderCityLayer(placements, kit, options = {}) {
  const prepared = {};
  for (const key of new Set(placements.map((placement) => Object.entries(kit).find(([, entry]) => entry.metadata.id === placement.assetId)?.[0]).filter(Boolean))) {
    const sprite = await preparedSprite(kit[key], options);
    prepared[kit[key].metadata.id] = { sprite, shadowBuilding: await shadowSprite(sprite, 0.30, 2.6), shadowLow: await shadowSprite(sprite, 0.18, 1.5) };
  }
  const composites = [];
  const shadowUnit = Math.hypot(WORLD_LIGHT[0], WORLD_LIGHT[1]);
  for (const placement of sortPlacements(placements)) {
    const entry = Object.values(kit).find((candidate) => candidate.metadata.id === placement.assetId);
    const sprite = prepared[placement.assetId];
    const ppm = entry.metadata.nativePixelsPerMasterPixel;
    const scale = SCALE / ppm;
    const left = Math.round((placement.masterAnchor[0] - D05_BOUNDS[0]) * SCALE - entry.metadata.groundSocket.sortPoint[0] * scale);
    const top = Math.round((placement.masterAnchor[1] - D05_BOUNDS[1]) * SCALE - entry.metadata.groundSocket.sortPoint[1] * scale);
    const high = placement.family === "building" || placement.family === "prop";
    const shadowDistance = high ? 8 : 2.5;
    const shadowX = Math.round((-WORLD_LIGHT[0] / shadowUnit) * shadowDistance * SCALE);
    const shadowY = Math.round((-WORLD_LIGHT[1] / shadowUnit) * shadowDistance * SCALE);
    const renderedSprite = placement.endCapClip && passEnabled(options, "run-boundary-alpha-clip") ? await clipSpriteAtRunBoundary(sprite.sprite, placement, left, top) : sprite.sprite;
    const renderedShadow = placement.endCapClip ? await shadowSprite(renderedSprite, high ? 0.30 : 0.18, high ? 2.6 : 1.5) : high ? sprite.shadowBuilding : sprite.shadowLow;
    if (passEnabled(options, "cast-shadow")) composites.push({ input: renderedShadow, left: left + shadowX, top: top + shadowY });
    if (passEnabled(options, "contact-shading-band")) composites.push(await contactBand(placement));
    composites.push({ input: renderedSprite, left, top });
  }
  const canvas = { create: { width: WIDTH, height: HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } };
  const { data, info } = await sharp(canvas).composite(composites).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (!passEnabled(options, "district-mask-clip")) return sharp(data, { raw: info }).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
  const { data: maskAlpha, info: maskAlphaInfo } = await sharp(Buffer.from(globalMask), { raw: { width: MASTER[0], height: MASTER[1], channels: 1 } })
    .extract({ left: D05_BOUNDS[0], top: D05_BOUNDS[1], width: D05_BOUNDS[2] - D05_BOUNDS[0], height: D05_BOUNDS[3] - D05_BOUNDS[1] })
    .resize(WIDTH, HEIGHT, { kernel: "lanczos3" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const { data: maskSupport, info: maskSupportInfo } = await sharp(Buffer.from(globalMask), { raw: { width: MASTER[0], height: MASTER[1], channels: 1 } })
    .extract({ left: D05_BOUNDS[0], top: D05_BOUNDS[1], width: D05_BOUNDS[2] - D05_BOUNDS[0], height: D05_BOUNDS[3] - D05_BOUNDS[1] })
    .resize(WIDTH, HEIGHT, { kernel: "nearest" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  assert(maskAlphaInfo.channels === 1 && maskAlpha.length === WIDTH * HEIGHT, "Smooth D05 clip mask must be one alpha sample per output pixel.");
  assert(maskSupportInfo.channels === 1 && maskSupport.length === WIDTH * HEIGHT, "Binary D05 clip support must be one alpha sample per output pixel.");
  for (let index = 0; index < maskAlpha.length; index += 1) data[index * 4 + 3] = Math.round(data[index * 4 + 3] * maskAlpha[index] * maskSupport[index] / (255 * 255));
  return sharp(data, { raw: info }).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
}
function masterPointToWorld([x, y]) {
  return [CITY_WORLD_ORIGIN[0] + x / MASTER[0] * CITY_WORLD_SPAN[0], CITY_WORLD_ORIGIN[1] + y / MASTER[1] * CITY_WORLD_SPAN[1]];
}
function publicPath(urlPath) { return urlPath.replace(/^\//, "").split("?")[0]; }
function intersectsBounds(left, right) {
  return left.origin[0] < right.origin[0] + right.span[0]
    && left.origin[0] + left.span[0] > right.origin[0]
    && left.origin[1] < right.origin[1] + right.span[1]
    && left.origin[1] + left.span[1] > right.origin[1];
}
async function renderNativeEnvironmentUnderlay() {
  const [environmentProof, foliageManifest] = await Promise.all([loadJson(files.environmentProof), loadJson(files.foliageManifest)]);
  const registration = environmentProof.registration;
  assert(registration.artboard.join(",") === "1440,1080", "Native environment artboard registration changed.");
  assert(registration.boundingWorldView.origin.join(",") === CITY_WORLD_ORIGIN.join(",") && registration.boundingWorldView.span.join(",") === CITY_WORLD_SPAN.join(","), "Native environment and city world placement disagree.");
  assert(environmentProof.layers.geology.sources.close.path.split("?")[0] === `/${files.geology.replace(/^public\//, "")}`, "Registered geology-close source changed.");
  const [worldLeft, worldTop] = masterPointToWorld([D05_BOUNDS[0], D05_BOUNDS[1]]);
  const [worldRight, worldBottom] = masterPointToWorld([D05_BOUNDS[2], D05_BOUNDS[3]]);
  const nativeWorld = registration.boundingWorldView;
  const cropFor = async (file, label) => {
    const metadata = await sharp(absolute(file)).metadata();
    assert(metadata.width === 5760 && metadata.height === 4320, `${label} must remain a registered 4x native environment plate.`);
    const crop = {
      left: Math.floor((worldLeft - nativeWorld.origin[0]) / nativeWorld.span[0] * metadata.width),
      top: Math.floor((worldTop - nativeWorld.origin[1]) / nativeWorld.span[1] * metadata.height),
      width: Math.ceil((worldRight - nativeWorld.origin[0]) / nativeWorld.span[0] * metadata.width) - Math.floor((worldLeft - nativeWorld.origin[0]) / nativeWorld.span[0] * metadata.width),
      height: Math.ceil((worldBottom - nativeWorld.origin[1]) / nativeWorld.span[1] * metadata.height) - Math.floor((worldTop - nativeWorld.origin[1]) / nativeWorld.span[1] * metadata.height),
    };
    assert(crop.left >= 0 && crop.top >= 0 && crop.left + crop.width <= metadata.width && crop.top + crop.height <= metadata.height, `${label} D05 crop exceeds its registered plate.`);
    return { crop, bytes: await sharp(absolute(file)).extract(crop).resize(WIDTH, HEIGHT, { kernel: "lanczos3" }).ensureAlpha().png().toBuffer() };
  };
  const [geology, surfaceDetail] = await Promise.all([cropFor(files.geology, "geology"), cropFor(files.surfaceDetail, "surface-detail")]);
  const environmentArtboardBounds = { origin: [(worldLeft - nativeWorld.origin[0]) / nativeWorld.span[0] * registration.artboard[0], (worldTop - nativeWorld.origin[1]) / nativeWorld.span[1] * registration.artboard[1]], span: [(worldRight - worldLeft) / nativeWorld.span[0] * registration.artboard[0], (worldBottom - worldTop) / nativeWorld.span[1] * registration.artboard[1]] };
  const resources = new Map(foliageManifest.resources.map((resource) => [resource.id, resource]));
  const foliageInstances = foliageManifest.instances.filter((instance) => intersectsBounds(environmentArtboardBounds, instance.artboardBounds));
  const foliageComposites = await Promise.all(foliageInstances.map(async (instance) => {
    const resource = resources.get(instance.atlasResourceId);
    assert(resource, `Foliage ${instance.id} has no registered atlas resource.`);
    const [sourceLeft, sourceTop, sourceWidth, sourceHeight] = instance.canopyAtlasRect;
    const [originX, originY] = instance.artboardBounds.origin; const [spanX, spanY] = instance.artboardBounds.span;
    const left = Math.floor((originX - environmentArtboardBounds.origin[0]) / environmentArtboardBounds.span[0] * WIDTH);
    const top = Math.floor((originY - environmentArtboardBounds.origin[1]) / environmentArtboardBounds.span[1] * HEIGHT);
    const right = Math.ceil((originX + spanX - environmentArtboardBounds.origin[0]) / environmentArtboardBounds.span[0] * WIDTH);
    const bottom = Math.ceil((originY + spanY - environmentArtboardBounds.origin[1]) / environmentArtboardBounds.span[1] * HEIGHT);
    return { input: await sharp(absolute(path.posix.join("public", publicPath(resource.path)))).extract({ left: sourceLeft, top: sourceTop, width: sourceWidth, height: sourceHeight }).resize(Math.max(1, right - left), Math.max(1, bottom - top), { kernel: "lanczos3" }).ensureAlpha().png().toBuffer(), left, top };
  }));
  const bytes = await sharp(geology.bytes).composite([{ input: surfaceDetail.bytes, blend: "over" }, ...foliageComposites]).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
  return { bytes, registration: { policy: "registered-native-environment-stack-geology-close-r8-plus-surface-detail-close-r1-plus-registered-native-conifer-instances", cityWorldBounds: { origin: [worldLeft, worldTop], span: [worldRight - worldLeft, worldBottom - worldTop] }, environmentArtboardBounds, geology: { path: files.geology, cropPx: geology.crop }, surfaceDetail: { path: files.surfaceDetail, cropPx: surfaceDetail.crop }, foliage: { manifest: files.foliageManifest, instanceCount: foliageInstances.length, instanceIds: foliageInstances.map((instance) => instance.id), resources: [...new Set(foliageInstances.map((instance) => resources.get(instance.atlasResourceId).path.split("?")[0]))] } } };
}
async function renderOverCleanTerrain(terrain, cityLayer) {
  return sharp(terrain).composite([{ input: cityLayer, blend: "over" }]).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
}
async function verifyCityLayerInsideMask(cityLayer) {
  const { data, info } = await sharp(cityLayer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data: maskCrop, info: maskInfo } = await sharp(Buffer.from(globalMask), { raw: { width: MASTER[0], height: MASTER[1], channels: 1 } })
    .extract({ left: D05_BOUNDS[0], top: D05_BOUNDS[1], width: D05_BOUNDS[2] - D05_BOUNDS[0], height: D05_BOUNDS[3] - D05_BOUNDS[1] })
    .resize(WIDTH, HEIGHT, { kernel: "nearest" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  assert(maskInfo.channels === 1 && maskCrop.length === WIDTH * HEIGHT, "D05 containment mask must be one alpha sample per output pixel.");
  let outsidePixels = 0;
  for (let index = 0; index < info.width * info.height; index += 1) if (data[index * 4 + 3] > 0 && maskCrop[index] < 128) outsidePixels += 1;
  assert(outsidePixels === 0, `The city layer has ${outsidePixels} rendered pixels outside the D05 mask.`);
  return { maximumPlacementOverhangMasterPx: 0, outsideRenderedPixels: outsidePixels, allowedMasterPx: 4 };
}
async function globalGrade(ungraded) {
  const { data, info } = await sharp(ungraded).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) { data[index] = 0; data[index + 1] = 0; data[index + 2] = 0; continue; }
    const luminance = data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
    for (let channel = 0; channel < 3; channel += 1) {
      const saturated = luminance + (data[index + channel] - luminance) * GRADE.saturation;
      data[index + channel] = clamp(Math.round(saturated * GRADE.gain + GRADE.offset), 0, 255);
    }
  }
  return sharp(data, { raw: info }).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
}
async function verifyBuildingPlacementSolidity(buildings, kit) {
  const checks = [];
  for (const placement of buildings) {
    const entry = Object.values(kit).find((candidate) => candidate.metadata.id === placement.assetId);
    assert(entry, `${placement.id} has no kit entry for the solidity check.`);
    const prepared = await preparedSprite(entry);
    const preparedRaw = await sharp(prepared).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const sourceRaw = await sharp(entry.imageBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const opaqueSourceMask = Buffer.alloc(sourceRaw.info.width * sourceRaw.info.height);
    for (let index = 0; index < opaqueSourceMask.length; index += 1) opaqueSourceMask[index] = sourceRaw.data[index * 4 + 3] === 255 ? 255 : 0;
    const mappedMaskRaw = await sharp(opaqueSourceMask, { raw: { width: sourceRaw.info.width, height: sourceRaw.info.height, channels: 1 } })
      .resize(preparedRaw.info.width, preparedRaw.info.height, { fit: "fill", kernel: "nearest" }).greyscale().raw().toBuffer({ resolveWithObject: true });
    const mappedOpaqueSourceMask = mappedMaskRaw.data;
    assert(mappedMaskRaw.info.channels === 1 && mappedOpaqueSourceMask.length === preparedRaw.info.width * preparedRaw.info.height, `${placement.id} opaque-source coverage mask does not match the rendered destination.`);
    let mappedOpaqueSourceCoveragePixels = 0; let renderedCoveragePixels = 0;
    for (let index = 0; index < mappedOpaqueSourceMask.length; index += 1) if (mappedOpaqueSourceMask[index] === 255) {
      mappedOpaqueSourceCoveragePixels += 1;
      if (preparedRaw.data[index * 4 + 3] > 0) renderedCoveragePixels += 1;
    }
    assert(mappedOpaqueSourceCoveragePixels > 0, `${placement.id} has no mapped opaque-source coverage.`);
    const opaqueFraction = renderedCoveragePixels / mappedOpaqueSourceCoveragePixels;
    assert(opaqueFraction >= 0.98, `${placement.id} solidity ${opaqueFraction.toFixed(6)} is below the 0.98 minimum.`);
    checks.push({ placementId: placement.id, assetId: placement.assetId, namedSkillId: placement.namedSkill?.id ?? null, sourceOpaquePixels: opaqueSourceMask.reduce((sum, value) => sum + (value === 255 ? 1 : 0), 0), mappedOpaqueSourceCoveragePixels, renderedCoveragePixels, opaqueFraction: round(opaqueFraction, 6), minimumOpaqueFraction: 0.98 });
  }
  return { policy: "for every placed building, at least 0.98 of destination pixels covered by the nearest-mapped fully opaque source mask must remain nontransparent after Sharp destination-space resampling", buildingPlacementChecks: checks };
}
async function verifyFinalBuildingRowCoverage(buildings, kit, finalCityLayer) {
  const { data: finalData, info: finalInfo } = await sharp(finalCityLayer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const checks = [];
  for (const placement of buildings) {
    const entry = Object.values(kit).find((candidate) => candidate.metadata.id === placement.assetId);
    assert(entry, `${placement.id} has no kit entry for the F16 row-coverage check.`);
    const prepared = await preparedSprite(entry);
    const { data, info } = await sharp(prepared).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const ppm = entry.metadata.nativePixelsPerMasterPixel;
    const scale = SCALE / ppm;
    const left = Math.round((placement.masterAnchor[0] - D05_BOUNDS[0]) * SCALE - entry.metadata.groundSocket.sortPoint[0] * scale);
    const top = Math.round((placement.masterAnchor[1] - D05_BOUNDS[1]) * SCALE - entry.metadata.groundSocket.sortPoint[1] * scale);
    const rowSpans = [];
    for (let y = 0; y < info.height; y += 1) {
      const opaqueXs = [];
      for (let x = 0; x < info.width; x += 1) if (data[(y * info.width + x) * 4 + 3] >= 250) opaqueXs.push(x);
      if (opaqueXs.length > 0) rowSpans.push({ y, opaqueXs, left: Math.min(...opaqueXs), right: Math.max(...opaqueXs) });
    }
    assert(rowSpans.length > 0, `${placement.id} has no opaque prepared rows for the F16 row-coverage check.`);
    const bodyRows = rowSpans.map((row) => ({
      ...row,
      mappedBodyXs: row.opaqueXs.filter((x) => {
        const masterX = D05_BOUNDS[0] + Math.floor((left + x) / SCALE);
        const masterY = D05_BOUNDS[1] + Math.floor((top + row.y) / SCALE);
        return masterX >= 0 && masterY >= 0 && masterX < MASTER[0] && masterY < MASTER[1] && globalMask[masterY * MASTER[0] + masterX] === 255;
      }),
    })).filter((row) => row.mappedBodyXs.length >= 8);
    assert(bodyRows.length >= 8, `${placement.id} has only ${bodyRows.length} solid-context mapped body rows for the F16 row-coverage check.`);
    const coverages = bodyRows.map((row) => {
      let covered = 0;
      for (const x of row.mappedBodyXs) {
        const finalX = left + x; const finalY = top + row.y;
        if (finalX >= 0 && finalY >= 0 && finalX < finalInfo.width && finalY < finalInfo.height && finalData[(finalY * finalInfo.width + finalX) * 4 + 3] > 0) covered += 1;
      }
      return covered / row.mappedBodyXs.length;
    });
    const lowCoverageRows = coverages.filter((coverage) => coverage < 0.50).length;
    const highCoverageRows = coverages.filter((coverage) => coverage > 0.90).length;
    assert(highCoverageRows > 0, `${placement.id} has no >90% final body-coverage rows for the F16 row-coverage check (body=${bodyRows.length}, low=${lowCoverageRows}, min=${Math.min(...coverages).toFixed(4)}, max=${Math.max(...coverages).toFixed(4)}).`);
    const lowToHighRowRatio = lowCoverageRows / highCoverageRows;
    assert(lowToHighRowRatio <= 0.05, `${placement.id} F16 row-coverage oscillation ${lowToHighRowRatio.toFixed(6)} exceeds 0.05.`);
    checks.push({ placementId: placement.id, assetId: placement.assetId, namedSkillId: placement.namedSkill?.id ?? null, bodyRowCount: bodyRows.length, lowCoverageRows, highCoverageRows, lowToHighRowRatio: round(lowToHighRowRatio, 6), maximumLowToHighRowRatio: 0.05 });
  }
  return { id: "F16-final-building-row-coverage", policy: "for each building, mapped opaque sprite-body rows within the solid full-context D05 mask are measured against the final clipped city layer; rows below 50% opaque coverage divided by rows above 90% coverage must be at most 0.05", buildingPlacementChecks: checks };
}
async function cropS10(bytes) {
  return sharp(bytes).extract(S10_ISOLATION_CROP).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
}
async function labelIsolationCrop(label, crop) {
  const labelHeight = 28;
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S10_ISOLATION_CROP.width}" height="${labelHeight}"><rect width="100%" height="100%" fill="#17282d"/><text x="8" y="19" fill="white" font-family="sans-serif" font-size="14">${label}</text></svg>`);
  return sharp({ create: { width: S10_ISOLATION_CROP.width, height: S10_ISOLATION_CROP.height + labelHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: svg, left: 0, top: 0 }, { input: crop, left: 0, top: labelHeight }]).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
}
async function renderPassIsolation(placements, kit, terrain) {
  const entries = [{ id: "underlay-only", cityLayer: null }, { id: "baseline", cityLayer: await renderCityLayer(placements, kit) }];
  for (const pass of ISOLATION_PASSES) entries.push({ id: `without-${pass}`, cityLayer: await renderCityLayer(placements, kit, { disabledPasses: new Set([pass]) }) });
  const outputs = [];
  const labelled = [];
  for (const entry of entries) {
    const plate = entry.cityLayer ? await renderOverCleanTerrain(terrain, entry.cityLayer) : terrain;
    const crop = await cropS10(plate);
    const path = `.codex-tmp/qa/T3/t3c-r4c/s10-pass-isolation-${entry.id}-r4c.png`;
    outputs.push([path, crop]);
    labelled.push(await labelIsolationCrop(entry.id, crop));
  }
  const columns = 4;
  const tileHeight = S10_ISOLATION_CROP.height + 28;
  const sheet = await sharp({ create: { width: columns * S10_ISOLATION_CROP.width, height: Math.ceil(labelled.length / columns) * tileHeight, channels: 4, background: { r: 23, g: 40, b: 45, alpha: 1 } } })
    .composite(labelled.map((input, index) => ({ input, left: index % columns * S10_ISOLATION_CROP.width, top: Math.floor(index / columns) * tileHeight })))
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
  outputs.push([files.passIsolation, sheet]);
  return outputs;
}
async function renderCapital(graded) {
  const oneX = await sharp(graded).resize(D05_BOUNDS[2] - D05_BOUNDS[0], D05_BOUNDS[3] - D05_BOUNDS[1], { kernel: "lanczos3" }).png().toBuffer();
  return sharp(absolute(files.master)).ensureAlpha().composite([{ input: oneX, left: D05_BOUNDS[0], top: D05_BOUNDS[1] }]).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
}
async function renderComparison(graded) {
  const width = D05_BOUNDS[2] - D05_BOUNDS[0]; const height = D05_BOUNDS[3] - D05_BOUNDS[1];
  const masterCrop = await sharp(absolute(files.master)).extract({ left: D05_BOUNDS[0], top: D05_BOUNDS[1], width, height }).png().toBuffer();
  const composed = await sharp(graded).resize(width, height, { kernel: "lanczos3" }).png().toBuffer();
  return sharp({ create: { width: width * 2, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: masterCrop, left: 0, top: 0 }, { input: composed, left: width, top: 0 }]).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
}
async function renderCleanTerrainComparison(cleanTerrain, graded) {
  return sharp({ create: { width: WIDTH * 2, height: HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: cleanTerrain, left: 0, top: 0 }, { input: graded, left: WIDTH, top: 0 }]).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
}

function verifyProperties({ grammar, sourcePlacements, buildingCandidates, buildings, adjacencyEdges, circulation, ordered, kit, masterOverlap, props }) {
  const grammarFootprints = grammar.buildings.footprints.filter((footprint) => footprint.districtId === "D05");
  assert(grammarFootprints.length === 32, `Expected 32 D05 footprints, found ${grammarFootprints.length}.`);
  assert(buildingCandidates.length === grammarFootprints.length, "Every D05 grammar footprint must receive an occupancy candidate.");
  assert(buildingCandidates.filter((placement) => placement.namedSkill).length === 5, "All five named buildings must be occupancy candidates.");
  assert(buildings.filter((placement) => placement.namedSkill).length === 5, "Named buildings must place at their registered anchors regardless of overlap.");
  for (const source of sourcePlacements.filter((placement) => placement.family === "building")) assert(polygonInsideMask(globalMask, source.masterFootprint), `Grammar footprint ${source.id} leaves D05.`);
  for (const placement of buildings) assert(maskAt(globalMask, placement.masterAnchor), `Building anchor ${placement.id} leaves D05.`);
  for (const placement of buildings) {
    const relativeError = Math.abs(placement.renderedWidthMasterPx - placement.displayWidthTargetMasterPx) / placement.displayWidthTargetMasterPx;
    assert(relativeError <= 0.10, `${placement.id} renders ${placement.renderedWidthMasterPx}px wide against its ${placement.displayWidthTargetMasterPx}px target.`);
  }
  for (const placement of buildings.filter((candidate) => !candidate.namedSkill)) for (const earlier of buildings.filter((candidate) => candidate.occupancy.acceptanceOrder < placement.occupancy.acceptanceOrder)) {
    const bounds = placement.renderedBoundsMasterPx;
    const area = (bounds[2] - bounds[0]) * (bounds[3] - bounds[1]);
    assert(boundsOverlapArea(bounds, earlier.renderedBoundsMasterPx) / area <= masterOverlap.directionalCandidateOverlapShare.p90, `${placement.id} exceeds the master-measured ${masterOverlap.directionalCandidateOverlapShare.p90 * 100}% occupancy cap against ${earlier.id}.`);
  }
  for (const [leftId, rightId] of adjacencyEdges) {
    const left = buildings.find((placement) => placement.id === leftId); const right = buildings.find((placement) => placement.id === rightId);
    assert(left.assetId !== right.assetId, `Adjacent buildings ${leftId} and ${rightId} repeat ${left.assetId}.`);
  }
  for (const [skillId] of Object.entries(namedKitKeys)) {
    const placement = buildings.find((candidate) => candidate.namedSkill?.id === skillId);
    if (placement) assert(distance(placement.masterAnchor, placement.namedSkill.registrationAnchor) <= 0.001, `${skillId} is not at its registered anchor.`);
  }
  for (const run of circulation.coverage) {
    assert(run.endpointsWithinMaskTolerance, `Run ${run.runId} leaves the D05 endpoint tolerance.`);
    assert(run.maximumUntiledGapMasterPx <= MAX_TILE_GAP_MASTER_PX, `Run ${run.runId} has a ${run.maximumUntiledGapMasterPx}px tile gap.`);
  }
  for (const placement of circulation.placements.filter((candidate) => candidate.class === "road-straight" || candidate.class === "stair-run")) {
    const run = circulation.coverage.find((candidate) => candidate.runId === placement.runId);
    if (run.lengthMasterPx < placement.socketSpanMasterPx) assert(placement.endCapClip?.policy === "alpha-crop-at-run-boundary", `${placement.id} overhangs a sub-module run without deterministic clipping.`);
  }
  for (const key of ["slabH000", "slabH090", "roadH000", "roadH090", "roadCurveLeft", "roadJunction", "stairLeft", "stairRight"]) {
    const widths = kit[key].metadata.groundSocket.connectionSockets.map((socket) => socket.widthMasterPx);
    assert(widths.length >= 2 && widths.every((width) => Math.abs(width - ROAD_WIDTH_MASTER_PX) <= 0.001), `${kit[key].metadata.id} is outside the 14px road family.`);
  }
  for (const placement of ordered) assert(placement.districtMaskClip.maximumRenderedOverhangMasterPx <= 4, `${placement.id} exceeds the D05 mask by more than 4px.`);
  for (const prop of props) assert(buildings.every((building) => boundsOverlapArea(prop.renderedBoundsMasterPx, building.renderedBoundsMasterPx) === 0), `${prop.id} overlaps an accepted building rendered bound.`);
  const expected = sortPlacements(ordered);
  assert(expected.every((placement, index) => placement.id === ordered[index].id), "Baseline z-sort order does not match render order.");
}

async function build() {
  const [grammar, sourceManifest, layout, mask, kit] = await Promise.all([loadJson(files.grammar), loadJson(files.sourcePlacements), loadJson(files.layout), loadMask(), loadKit()]);
  globalMask = mask;
  assert(JSON.stringify(grammar.artboard) === JSON.stringify(MASTER), "Grammar artboard does not match the capital master.");
  assert(JSON.stringify(sourceManifest.masterBounds) === JSON.stringify(D05_BOUNDS), "Source placement bounds do not match D05.");
  const displayWidthAuthority = deriveDisplayWidthAuthority(layout);
  const buildingCandidates = buildBuildings(sourceManifest.placements, kit, displayWidthAuthority);
  const masterOverlap = measureMasterBuildingOverlap(buildingCandidates.placements);
  const occupancy = applyBuildingOccupancy(buildingCandidates.placements, masterOverlap.directionalCandidateOverlapShare.p90);
  const buildings = occupancy.placements;
  const opacityDrawPath = await verifyBuildingPlacementSolidity(buildings, kit);
  const adjacencyEdges = buildingCandidates.adjacencyEdges.filter(([leftId, rightId]) => buildings.some((placement) => placement.id === leftId) && buildings.some((placement) => placement.id === rightId));
  const ground = buildGround(sourceManifest.placements, kit);
  const circulation = buildCirculation(sourceManifest.placements, kit);
  const props = buildProps(circulation.placements, ground, buildings, grammar, kit);
  const ordered = sortPlacements([...ground, ...circulation.placements, ...buildings, ...props]).map((placement, renderOrder) => ({ ...placement, renderOrder }));
  verifyProperties({ grammar, sourcePlacements: sourceManifest.placements, buildingCandidates: buildingCandidates.placements, buildings, adjacencyEdges, circulation, ordered, kit, masterOverlap, props });
  const cityLayer = await renderCityLayer(ordered, kit);
  const districtMaskProperty = await verifyCityLayerInsideMask(cityLayer);
  const f16FinalRowCoverage = PASS_ISOLATION ? null : await verifyFinalBuildingRowCoverage(buildings, kit, cityLayer);
  const gradedCityLayer = await globalGrade(cityLayer);
  const nativeEnvironment = await renderNativeEnvironmentUnderlay();
  const ungraded = await renderOverCleanTerrain(nativeEnvironment.bytes, cityLayer);
  const graded = await renderOverCleanTerrain(nativeEnvironment.bytes, gradedCityLayer);
  const capital = await renderCapital(graded);
  const comparison = await renderComparison(graded);
  const cleanTerrainComparison = await renderCleanTerrainComparison(nativeEnvironment.bytes, graded);
  const s10Final = await cropS10(graded);
  const repeatCityLayer = await renderCityLayer(ordered, kit);
  const repeatUngraded = await renderOverCleanTerrain(nativeEnvironment.bytes, repeatCityLayer);
  const repeatGraded = await renderOverCleanTerrain(nativeEnvironment.bytes, await globalGrade(repeatCityLayer));
  assert(cityLayer.equals(repeatCityLayer) && ungraded.equals(repeatUngraded) && graded.equals(repeatGraded), "Two in-process composition rebuilds are not byte-identical.");
  const passIsolationOutputs = PASS_ISOLATION ? await renderPassIsolation(ordered, kit, nativeEnvironment.bytes) : [];
  const buildingOverlapStats = renderedBoundsOverlapStats(buildings);
  const statistics = {
    placements: { total: ordered.length, ground: ground.length, circulationParts: circulation.placements.length, buildingCandidates: buildingCandidates.placements.length, buildings: buildings.length, namedBuildings: buildings.filter((placement) => placement.namedSkill).length, props: props.length },
    sourceRuns: circulation.coverage.reduce((counts, run) => ({ ...counts, [run.kind]: (counts[run.kind] ?? 0) + 1 }), {}),
    zSort: { placementCount: ordered.length, violations: 0 },
    adjacency: { thresholdMasterPx: 40, edges: adjacencyEdges.length, identicalVariantViolations: 0 },
    buildingRenderedBoundsOverlap: buildingOverlapStats,
    occupancy: { priority: ["named", "large", "standard", "compact"], masterMeasuredOverlap: masterOverlap, maximumOverlapShareOfCandidate: masterOverlap.directionalCandidateOverlapShare.p90, namedAnchorsAlwaysPlaced: true, survivingPlacementCount: buildings.length, skipped: occupancy.skipped },
    circulation: { roadRibbonWidthMasterPx: ROAD_WIDTH_MASTER_PX, fullyTiledRuns: circulation.coverage.length, maximumGapMasterPx: Math.max(...circulation.coverage.map((run) => run.maximumUntiledGapMasterPx)), headingMismatchLengthShare: circulation.headingMismatchLengthShare, rightHandBendsUsingLeftAsset: circulation.rightHandBends, shortRunModulesAlphaClipped: circulation.shortRunClipCount },
  };
  const buildingScaleChecks = buildings.map((placement) => ({ id: placement.id, assetId: placement.assetId, authority: placement.displayWidthAuthority, targetMasterPx: placement.displayWidthTargetMasterPx, renderedMasterPx: placement.renderedWidthMasterPx, errorRatio: round(Math.abs(placement.renderedWidthMasterPx - placement.displayWidthTargetMasterPx) / placement.displayWidthTargetMasterPx, 4), withinTenPercent: Math.abs(placement.renderedWidthMasterPx - placement.displayWidthTargetMasterPx) / placement.displayWidthTargetMasterPx <= 0.10 }));
  const sidecarScaleMappings = summarizeScaleMappings(kit);
  const demands = [
    { rank: 1, id: "diagonal-heading-family", evidence: `${round(circulation.headingMismatchLengthShare * 100, 2)}% of run length is more than 7.5 degrees from the available h000/h090 axes`, requiredKit: "additional diagonal road, stair, wall, and slab heading variants" },
    { rank: 2, id: "generic-large-building", evidence: `${buildings.filter((placement) => placement.genericLargeUsesStandardKit).length} surviving unnamed large footprints remain standard-class silhouette substitutions even though their scale target is p75`, requiredKit: "at least two reusable large background buildings" },
    { rank: 3, id: "retaining-wall-seam-language", evidence: "repeated rectangular wall faces remain visible over the registered native environment underlay", requiredKit: "continuous band modules plus heading-aware wall transitions" },
    { rank: 4, id: "occupancy-density", evidence: `${buildings.length}/32 candidates survive the master-measured p90 directional overlap cap; named anchors all remain authoritative`, requiredKit: "no new kit decision; director visual review of the native-density composition" },
  ];
  if (circulation.rightHandBends > 0) demands.unshift({ rank: 1, id: "right-hand-road-curve", evidence: `${circulation.rightHandBends} right-hand bends currently substitute the selected left-hand curve`, requiredKit: "road-curve right-handed counterpart" });
  const manifest = {
    schemaVersion: 2,
    id: "ninjaone-d05-real-kit-composition-r4c",
    status: "director-review-candidate",
    source: { grammar: files.grammar, grammarSha256: sha256(await readFile(absolute(files.grammar))), placementsR1: files.sourcePlacements, placementsR1Sha256: sha256(await readFile(absolute(files.sourcePlacements))), layout: files.layout, layoutSha256: sha256(await readFile(absolute(files.layout))), mask: files.mask, master: files.master },
    masterBounds: D05_BOUNDS,
    output: { scale: SCALE, dimensions: [WIDTH, HEIGHT], nativeEnvironmentUnderlay: { ...nativeEnvironment.registration, opacity: 1 }, ungraded: files.ungraded, graded: files.graded, capitalScale: { path: files.capital, dimensions: MASTER, districtOffset: D05_BOUNDS.slice(0, 2) }, comparisonProof: files.comparison, cleanStandaloneProof: files.cleanTerrainComparison, s10FinalProof: files.s10Final },
    worldLight: { direction: WORLD_LIGHT, shadowDirectionScreen: [0.42, 0.36], softBlurOutputPx: { tallParts: 2.6, lowParts: 1.5 } },
    contactShading: { opacity: 0.52, blurOutputPx: 1.4, source: "each part contactPolygon" },
    ghostArtifact: { r2ObservedRegion: "2x proof x300-420 y640-760", cause: "registered S10 Databricks Works red-brick sprite at structure-125, visually doubled against the r2 baked-master underlay rather than a stray asset or provenance load", resolution: "clean registered L2/L3 underlay leaves the single full-opacity S10 placement legible; no named asset was removed" },
    chromaFringeCleanup: { scope: "secondary edge cleanup", policy: "discard only alpha <=160 pixels where red and blue both dominate green before shadow and composition" },
    opacityDrawPath,
    f16FinalRowCoverage,
    globalGrade: GRADE,
    displayWidthAuthority,
    sidecarScaleMappings,
    buildingScaleChecks,
    districtMaskProperty,
    endCapPolicy: { appliesWhen: "run length is shorter than the selected module socket span", method: "deterministic sprite-alpha crop between perpendicular run-boundary planes", clippedModuleCount: circulation.shortRunClipCount },
    runCoverage: circulation.coverage,
    buildingAdjacencyEdges: adjacencyEdges,
    composerDemands: demands,
    placements: ordered,
    statistics,
  };
  return { manifestBytes: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`), ungraded, graded, capital, comparison, cleanTerrainComparison, s10Final, passIsolationOutputs, statistics, demands };
}

async function compare(file, actual) {
  const expected = await readFile(absolute(file));
  assert(expected.equals(actual), `${file} is stale or non-deterministic; run the build command.`);
}
async function main() {
  const result = await build();
  const outputs = [[files.manifest, result.manifestBytes], [files.ungraded, result.ungraded], [files.graded, result.graded], [files.capital, result.capital], [files.comparison, result.comparison], [files.cleanTerrainComparison, result.cleanTerrainComparison], [files.s10Final, result.s10Final], ...result.passIsolationOutputs];
  if (CHECK_ONLY) await Promise.all(outputs.map(([file, bytes]) => compare(file, bytes)));
  else {
    await Promise.all([...new Set(outputs.map(([file]) => path.dirname(absolute(file))))].map((directory) => mkdir(directory, { recursive: true })));
    await Promise.all(outputs.map(([file, bytes]) => writeFile(absolute(file), bytes)));
  }
  console.log(JSON.stringify({ mode: CHECK_ONLY ? "check" : "build", output: files, statistics: result.statistics, composerDemands: result.demands }));
}

await main();
