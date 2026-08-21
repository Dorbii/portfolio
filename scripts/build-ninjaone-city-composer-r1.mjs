import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK_ONLY = process.argv.includes("--check");
const MASTER = Object.freeze([1448, 1086]);
const D05_BOUNDS = Object.freeze([0, 413, 691, 1086]);
const SCALE = 2;
const WIDTH = (D05_BOUNDS[2] - D05_BOUNDS[0]) * SCALE;
const HEIGHT = (D05_BOUNDS[3] - D05_BOUNDS[1]) * SCALE;
const ENDPOINT_TOLERANCE = 8;
const ROAD_HEADING_TOLERANCE = 7.5;
const namedSkills = Object.freeze([
  ["S15", "OpenAPI Observatory"],
  ["S18", "Tool Generation Wheelworks"],
  ["S01", "Golang Foundry"],
  ["S10", "Databricks Works"],
  ["S11", "Docker Warehouse"],
]);
const files = Object.freeze({
  grammar: "public/career-world/capitals/ninjaone/city-v2/grammar/ninjaone-city-grammar-r3.json",
  layout: "public/career-world/capitals/ninjaone/manifests/city-master-node-layout-r3.json",
  mask: "art-source/career-world/ninjaone-capital/city-r3/districts/D05-western-skill-terraces-mask.png",
  master: "art-source/career-world/ninjaone-capital/city-nodes-r2/master/ninjaone-capital-master-r1.png",
  manifest: "public/career-world/capitals/ninjaone/city-v2/composition/d05-placements-r1.json",
  plate: ".codex-tmp/qa/T3/d05-skeleton-plate-r1.png",
  registration: ".codex-tmp/qa/T3/d05-skeleton-registration-r1.png",
});

function absolute(file) { return path.join(ROOT, file); }
function round(value, digits = 3) { const factor = 10 ** digits; return Math.round(value * factor) / factor; }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }
function pointKey([x, y]) { return `${round(x, 1)},${round(y, 1)}`; }
function distance(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
function equalPoints(a, b) { return distance(a, b) <= 0.01; }
function local([x, y]) { return [(x - D05_BOUNDS[0]) * SCALE, (y - D05_BOUNDS[1]) * SCALE]; }
function color(hex, lift) {
  const channels = hex.slice(1).match(/../g).map((channel) => Number.parseInt(channel, 16));
  return `#${channels.map((channel) => clamp(channel + lift, 0, 255).toString(16).padStart(2, "0")).join("")}`;
}
function escapeXml(value) { return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]); }
function canonicalPoints(points) {
  const forward = points.map(pointKey).join(";");
  const reverse = [...points].reverse().map(pointKey).join(";");
  return forward < reverse ? forward : reverse;
}
function polygonCentroid(points) {
  const total = points.reduce((sum, point) => [sum[0] + point[0], sum[1] + point[1]], [0, 0]);
  return total.map((value) => value / points.length);
}
function translatePoints(points, [offsetX, offsetY]) { return points.map(([x, y]) => [round(x + offsetX), round(y + offsetY)]); }
function bottomSortPoint(polygon) {
  const maximumY = Math.max(...polygon.map(([, y]) => y));
  const bottom = polygon.filter(([, y]) => Math.abs(y - maximumY) < 0.001);
  return [bottom.reduce((sum, [x]) => sum + x, 0) / bottom.length, maximumY];
}
function pathLength(points) { return points.slice(1).reduce((sum, point, index) => sum + distance(points[index], point), 0); }
function heading(from, to) { return Math.atan2(to[1] - from[1], to[0] - from[0]); }
function headingDifference(a, b) {
  const raw = Math.abs(a - b) % (2 * Math.PI);
  return Math.min(raw, 2 * Math.PI - raw);
}
function nearCollinearAtJoin(first, second, shared) {
  const previous = equalPoints(first[0], shared) ? first[1] : first.at(-2);
  const following = equalPoints(second[0], shared) ? second[1] : second.at(-2);
  return headingDifference(heading(shared, previous), heading(shared, following)) <= ROAD_HEADING_TOLERANCE * Math.PI / 180;
}
function samplePolyline(points, step = 4) {
  const samples = [];
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1]; const end = points[index]; const length = distance(start, end);
    const count = Math.max(1, Math.ceil(length / step));
    for (let part = 0; part <= count; part += 1) samples.push([start[0] + (end[0] - start[0]) * part / count, start[1] + (end[1] - start[1]) * part / count]);
  }
  return samples;
}
function maskIndex(x, y) { return Math.floor(y) * MASTER[0] + Math.floor(x); }
function maskAt(mask, [x, y]) { return x >= 0 && y >= 0 && x < MASTER[0] && y < MASTER[1] && mask[maskIndex(x, y)] >= 128; }
function distanceToMask(mask, point, limit = ENDPOINT_TOLERANCE) {
  if (maskAt(mask, point)) return 0;
  for (let radius = 1; radius <= limit; radius += 1) for (let y = Math.floor(point[1] - radius); y <= Math.ceil(point[1] + radius); y += 1) for (let x = Math.floor(point[0] - radius); x <= Math.ceil(point[0] + radius); x += 1) {
    if (maskAt(mask, [x, y])) return Math.hypot(x - point[0], y - point[1]);
  }
  return Number.POSITIVE_INFINITY;
}
function polygonInsideMask(mask, polygon) {
  const samples = [...polygon, polygonCentroid(polygon)];
  for (let index = 1; index < polygon.length; index += 1) {
    const start = polygon[index - 1]; const end = polygon[index];
    const count = Math.max(1, Math.ceil(distance(start, end) / 3));
    for (let part = 1; part < count; part += 1) samples.push([start[0] + (end[0] - start[0]) * part / count, start[1] + (end[1] - start[1]) * part / count]);
  }
  return samples.every((point) => maskAt(mask, point));
}
function majorityInMask(mask, points) {
  const samples = samplePolyline(points);
  return samples.filter((point) => maskAt(mask, point)).length / samples.length;
}

async function json(file) { return JSON.parse(await readFile(absolute(file), "utf8")); }
async function loadMask() {
  const { data, info } = await sharp(absolute(files.mask)).greyscale().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== MASTER[0] || info.height !== MASTER[1]) throw new TypeError(`D05 mask must be ${MASTER.join("x")}.`);
  return data;
}

function terraceForPoint(bands, point) {
  const ordered = [...bands].sort((left, right) => left.points[0][1] - right.points[0][1]);
  let best = ordered[0]; let bestDistance = Number.POSITIVE_INFINITY;
  for (const band of ordered) {
    const distanceToBand = Math.min(...band.points.map((bandPoint) => distance(bandPoint, point)));
    if (distanceToBand < bestDistance) { best = band; bestDistance = distanceToBand; }
  }
  return { id: best.id, index: ordered.indexOf(best) + 1, sourceDistance: round(bestDistance) };
}
function adjacentStairBands(bands, points) {
  const start = terraceForPoint(bands, points[0]);
  const end = terraceForPoint(bands, points.at(-1));
  if (Math.abs(start.index - end.index) === 1) return { start, end, inferred: false };
  const direction = points.at(-1)[1] >= points[0][1] ? 1 : -1;
  const forcedEndIndex = start.index + direction >= 1 && start.index + direction <= bands.length ? start.index + direction : start.index - direction;
  const ordered = [...bands].sort((left, right) => left.points[0][1] - right.points[0][1]);
  return { start, end: { id: ordered[forcedEndIndex - 1].id, index: forcedEndIndex, sourceDistance: end.sourceDistance }, inferred: true };
}
function sortPlacements(placements) {
  return [...placements].sort((left, right) => left.zSortKey - right.zSortKey || left.sortPoint[0] - right.sortPoint[0] || left.id.localeCompare(right.id));
}
function assert(condition, message) { if (!condition) throw new TypeError(message); }

function reverseAndTraceConsolidate(edges, mask, bands) {
  const candidateEdges = edges
    .filter((edge) => edge.kind === "road" || edge.kind === "stairs")
    .filter((edge) => edge.points.length >= 2 && pathLength(edge.points) > 0.01)
    .filter((edge) => majorityInMask(mask, edge.points) >= 0.5)
    .filter((edge) => distanceToMask(mask, edge.points[0]) <= ENDPOINT_TOLERANCE && distanceToMask(mask, edge.points.at(-1)) <= ENDPOINT_TOLERANCE);
  const unique = new Map();
  for (const edge of candidateEdges) {
    const key = `${edge.kind}:${canonicalPoints(edge.points)}`;
    if (!unique.has(key)) unique.set(key, edge);
  }
  const remaining = [...unique.values()].map((edge) => ({ ...edge, points: edge.points.map(([x, y]) => [x, y]) }));
  const runs = [];
  while (remaining.length) {
    const first = remaining.shift(); let points = first.points; const sourceEdgeIds = [first.id]; const kind = first.kind;
    let changed = true;
    while (changed) {
      changed = false;
      for (let index = 0; index < remaining.length; index += 1) {
        const candidate = remaining[index];
        if (candidate.kind !== kind) continue;
        const endpoints = [[points[0], candidate.points[0]], [points[0], candidate.points.at(-1)], [points.at(-1), candidate.points[0]], [points.at(-1), candidate.points.at(-1)]];
        const matching = endpoints.find(([left, right]) => equalPoints(left, right));
        if (!matching || (kind === "road" && !nearCollinearAtJoin(points, candidate.points, matching[0]))) continue;
        const joinAtStart = equalPoints(points[0], matching[0]);
        const candidateReversed = !equalPoints(candidate.points[0], matching[1]);
        const candidatePoints = candidateReversed ? [...candidate.points].reverse() : candidate.points;
        const joined = joinAtStart ? [...candidatePoints.slice(0, -1), ...points] : [...points, ...candidatePoints.slice(1)];
        points = joined; sourceEdgeIds.push(candidate.id); remaining.splice(index, 1); changed = true; break;
      }
    }
    const width = round(sourceEdgeIds.reduce((sum, id) => sum + Number(unique.get(`${kind}:${canonicalPoints(edges.find((edge) => edge.id === id).points)}`).approximateWidth), 0) / sourceEdgeIds.length);
    const base = { id: `D05-${kind}-run-${String(runs.filter((run) => run.kind === kind).length + 1).padStart(2, "0")}`, kind, sourceEdgeIds: [...sourceEdgeIds].sort(), points, width, length: round(pathLength(points)) };
    if (kind === "road") {
      runs.push({ ...base, terraceMode: "contour-follow" });
    } else {
      const stairBands = adjacentStairBands(bands, points);
      runs.push({ ...base, terraceMode: "cross-band", resolvedTerraceBand: { start: stairBands.start, end: stairBands.end, inferredFromTwoDimensionalTrace: stairBands.inferred }, socketBands: [stairBands.start.index, stairBands.end.index] });
    }
  }
  return runs.sort((left, right) => left.kind.localeCompare(right.kind) || left.id.localeCompare(right.id));
}

function resolveNamedFootprints(footprints, layout) {
  const namedNodes = namedSkills.map(([assetId, name]) => {
    const node = layout.nodes.find((entry) => entry.assetId === assetId);
    assert(node, `Missing registered skill anchor ${assetId}.`);
    return { assetId, name, node };
  });
  const available = new Set(footprints.map((footprint) => footprint.id));
  const assignments = new Map();
  for (const named of namedNodes) {
    const candidates = footprints.filter((footprint) => available.has(footprint.id)).sort((left, right) => distance(left.center, named.node.anchor) - distance(right.center, named.node.anchor) || left.id.localeCompare(right.id));
    assert(candidates.length, `No D05 grammar footprint remains for ${named.assetId}.`);
    const footprint = candidates[0]; available.delete(footprint.id);
    assignments.set(footprint.id, {
      ...named,
      nearestFootprintId: footprint.id,
      anchorToNearestFootprintDistance: round(distance(footprint.center, named.node.anchor)),
    });
  }
  return assignments;
}
function buildingPlacements(footprints, layout) {
  const namedAssignments = resolveNamedFootprints(footprints, layout);
  return footprints.map((footprint) => {
    const named = namedAssignments.get(footprint.id);
    const placementOffset = named ? [named.node.anchor[0] - footprint.center[0], named.node.anchor[1] - footprint.center[1]] : [0, 0];
    const placementFootprint = translatePoints(footprint.polygon, placementOffset);
    const sortPoint = bottomSortPoint(placementFootprint);
    const masterAnchor = named ? named.node.anchor : footprint.center;
    const className = named ? "named" : footprint.sizeClass;
    return {
      id: `building-${footprint.id}`,
      family: "building",
      class: className,
      assetId: named ? `placeholder-${named.assetId.toLowerCase()}` : `placeholder-${footprint.sizeClass}`,
      namedSkill: named ? {
        id: named.assetId,
        name: named.name,
        registeredNodeId: named.node.id,
        registrationAnchor: named.node.anchor,
        nearestFootprintId: named.nearestFootprintId,
        anchorToNearestFootprintDistance: named.anchorToNearestFootprintDistance,
      } : null,
      masterAnchor,
      placementAnchor: masterAnchor,
      masterFootprint: placementFootprint,
      terraceMode: "level-pad",
      socket: { baselineY: sortPoint[1], sortPoint, footprintPolygon: footprint.polygon, connectionSockets: [] },
      sortPoint,
      zBias: 0,
      zSortKey: round(sortPoint[1]),
    };
  });
}
function circulationPlacements(runs) {
  return runs.map((run) => {
    const sortPoint = run.points.reduce((lowest, point) => point[1] > lowest[1] ? point : lowest, run.points[0]);
    const masterAnchor = polygonCentroid(run.points);
    return {
      id: run.id,
      family: "circulation",
      class: run.kind === "stairs" ? "stair-run" : "road-run",
      assetId: run.kind === "stairs" ? "placeholder-stair" : "placeholder-road",
      kind: run.kind,
      masterAnchor,
      masterFootprint: run.points,
      ...(run.kind === "stairs" ? { stairBandTransition: run.resolvedTerraceBand } : {}),
      terraceMode: run.terraceMode,
      socket: {
        baselineY: sortPoint[1], sortPoint,
        footprintPolygon: run.points,
        connectionSockets: [
          { id: "start", kind: run.kind === "stairs" ? "stair" : "road", point: run.points[0], widthMasterPx: run.width, ...(run.kind === "stairs" ? { bandOffset: run.socketBands[0] } : {}) },
          { id: "end", kind: run.kind === "stairs" ? "stair" : "road", point: run.points.at(-1), widthMasterPx: run.width, ...(run.kind === "stairs" ? { bandOffset: run.socketBands[1] } : {}) },
        ],
      },
      widthMasterPx: run.width,
      sourceEdgeIds: run.sourceEdgeIds,
      sortPoint,
      zBias: -100,
      zSortKey: round(sortPoint[1] - 100),
    };
  });
}
function terracePlacements(bands) {
  const ordered = [...bands].sort((left, right) => left.points[0][1] - right.points[0][1]);
  return ordered.map((band, index) => {
    const sortPoint = bottomSortPoint(band.points);
    return { id: `terrace-${band.id}`, family: "ground", class: "terrace-band", assetId: `placeholder-terrace-${index + 1}`, masterAnchor: polygonCentroid(band.points), masterFootprint: band.points, terraceTrace: { id: band.id, index: index + 1 }, terraceMode: "contour-follow", socket: { baselineY: sortPoint[1], sortPoint, footprintPolygon: band.points, connectionSockets: [] }, sortPoint, zBias: -10000, zSortKey: round(sortPoint[1] - 10000) };
  });
}

function placementBox(placement) {
  const polygon = placement.masterFootprint; const minX = Math.min(...polygon.map(([x]) => x)); const maxX = Math.max(...polygon.map(([x]) => x)); const minY = Math.min(...polygon.map(([, y]) => y)); const maxY = Math.max(...polygon.map(([, y]) => y)); const inset = Math.min((maxX - minX) * 0.22, (maxY - minY) * 0.35);
  return [[minX, minY + inset], [maxX - inset, minY], [maxX, maxY - inset], [minX + inset, maxY]].map(local);
}
function svgForPlacements(placements, palette, registration = false) {
  const rock = palette.rock.dominantSwatches[0].hex;
  const wall = palette.wall.dominantSwatches[0].hex;
  const roof = palette.roof.dominantSwatches[0].hex;
  const classColors = { compact: color(roof, 76), standard: color(wall, 100), large: color(roof, 118), named: color(wall, 132) };
  const body = sortPlacements(placements).map((placement) => {
    if (placement.family === "ground") {
      const points = placement.masterFootprint.map(local).map(([x, y]) => `${round(x)},${round(y)}`).join(" ");
      return `<polyline points="${points}" fill="none" stroke="${color(rock, 160)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    if (placement.family === "circulation") {
      const points = placement.masterFootprint.map(local).map(([x, y]) => `${round(x)},${round(y)}`).join(" ");
      const stroke = placement.kind === "stairs" ? color(wall, 150) : color(wall, 118);
      const width = Math.max(6, placement.widthMasterPx * SCALE * 0.34);
      const dash = placement.kind === "stairs" ? ` stroke-dasharray="${round(width * 0.8)} ${round(width * 0.38)}"` : "";
      const opacity = registration ? " opacity=\"0.35\"" : "";
      return `<polyline points="${points}" fill="none" stroke="${stroke}" stroke-width="${round(width)}" stroke-linecap="round" stroke-linejoin="round"${dash}${opacity}/>`;
    }
    const box = placementBox(placement);
    const points = box.map(([x, y]) => `${round(x)},${round(y)}`).join(" ");
    const maxX = Math.max(...placement.masterFootprint.map(([x]) => x)); const minX = Math.min(...placement.masterFootprint.map(([x]) => x));
    const label = placement.namedSkill ? `<text x="${round(local(placement.placementAnchor)[0])}" y="${round(local(placement.placementAnchor)[1] - 3)}" fill="#fff3bf" font-family="Arial, sans-serif" font-size="${Math.max(16, Math.min(28, (maxX - minX) * SCALE * 0.7))}" font-weight="700" text-anchor="middle">${escapeXml(placement.namedSkill.id)}</text>` : "";
    const fill = registration ? "none" : classColors[placement.class];
    return `<polygon points="${points}" fill="${fill}" stroke="${color(roof, 180)}" stroke-width="2"/>${label}`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${body}</svg>`;
}
async function renderPlate(placements, mask, palette) {
  const svg = Buffer.from(svgForPlacements(placements, palette));
  const cropMask = await sharp(Buffer.from(mask), { raw: { width: MASTER[0], height: MASTER[1], channels: 1 } }).extract({ left: D05_BOUNDS[0], top: D05_BOUNDS[1], width: D05_BOUNDS[2] - D05_BOUNDS[0], height: D05_BOUNDS[3] - D05_BOUNDS[1] }).resize(WIDTH, HEIGHT, { kernel: "nearest" }).png().toBuffer();
  return sharp({ create: { width: WIDTH, height: HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: svg }, { input: cropMask, blend: "dest-in" }]).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
}
async function renderRegistration(placements, palette) {
  const overlay = Buffer.from(svgForPlacements(placements, palette, true));
  return sharp(absolute(files.master)).extract({ left: D05_BOUNDS[0], top: D05_BOUNDS[1], width: D05_BOUNDS[2] - D05_BOUNDS[0], height: D05_BOUNDS[3] - D05_BOUNDS[1] }).resize(WIDTH, HEIGHT, { kernel: "nearest" }).composite([{ input: overlay }]).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
}
function verifyProperties({ footprints, building, circulation, ordered, mask }) {
  assert(building.length === footprints.length, "Every D05 grammar footprint must receive one building placement.");
  for (const placement of building) assert(polygonInsideMask(mask, placement.masterFootprint), `Footprint ${placement.id} leaves the D05 mask.`);
  for (const skill of namedSkills) {
    const placement = building.find((entry) => entry.namedSkill?.id === skill[0]);
    assert(placement, `Named skill ${skill[0]} was not resolved.`);
    assert(distance(placement.masterAnchor, placement.namedSkill.registrationAnchor) <= 0.001, `Named skill ${skill[0]} is not placed at its registered anchor.`);
  }
  for (const placement of circulation) {
    assert(distanceToMask(mask, placement.masterFootprint[0]) <= ENDPOINT_TOLERANCE && distanceToMask(mask, placement.masterFootprint.at(-1)) <= ENDPOINT_TOLERANCE, `Run ${placement.id} endpoint exceeds D05 edge tolerance.`);
    if (placement.kind === "stairs") assert(Math.abs(placement.socket.connectionSockets[0].bandOffset - placement.socket.connectionSockets[1].bandOffset) === 1, `Stair ${placement.id} does not cross exactly one terrace band.`);
  }
  const expected = sortPlacements(ordered);
  assert(expected.every((placement, index) => placement.id === ordered[index].id), "Baseline z-sort order does not match render order.");
}
async function build() {
  const [grammar, layout, mask] = await Promise.all([json(files.grammar), json(files.layout), loadMask()]);
  assert(JSON.stringify(grammar.artboard) === JSON.stringify(MASTER), "Grammar artboard does not match the master plate.");
  const district = grammar.districts.find((entry) => entry.id === "D05");
  assert(district && JSON.stringify(district.bounds) === JSON.stringify(D05_BOUNDS), "Grammar D05 bounds do not match the T3 contract.");
  const footprints = grammar.buildings.footprints.filter((footprint) => footprint.districtId === "D05").sort((left, right) => left.id.localeCompare(right.id));
  const bands = grammar.terraces.bands.filter((band) => band.districtId === "D05");
  assert(bands.length > 0, "D05 has no terrace bands.");
  const runs = reverseAndTraceConsolidate(grammar.circulation.edges, mask, bands);
  const building = buildingPlacements(footprints, layout);
  const circulation = circulationPlacements(runs);
  const terraces = terracePlacements(bands);
  const ordered = sortPlacements([...terraces, ...circulation, ...building]).map((placement, index) => ({ ...placement, renderOrder: index }));
  verifyProperties({ footprints, building, circulation, ordered, mask });
  const manifest = {
    schemaVersion: 1,
    id: "ninjaone-d05-placeholder-composition-r1",
    status: "diagnostic-placeholder",
    source: { grammar: files.grammar, grammarSha256: sha256(await readFile(absolute(files.grammar))), layout: files.layout, layoutSha256: sha256(await readFile(absolute(files.layout))), mask: files.mask, master: files.master },
    masterBounds: D05_BOUNDS,
    output: { scale: SCALE, dimensions: [WIDTH, HEIGHT], plate: files.plate, registrationProof: files.registration },
    socketStandard: { sort: "sortPoint.y + zBias, then sortPoint.x, then asset ID", terraceModes: ["level-pad", "contour-follow", "cross-band"] },
    placements: ordered,
    statistics: {
      buildingCounts: building.reduce((counts, placement) => ({ ...counts, [placement.class]: (counts[placement.class] ?? 0) + 1 }), {}),
      circulationRunCounts: circulation.reduce((counts, placement) => ({ ...counts, [placement.kind]: (counts[placement.kind] ?? 0) + 1 }), {}),
      zSort: { placementCount: ordered.length, violations: 0 },
      stairBandAssignmentsInferredFromTwoDimensionalTrace: circulation.filter((placement) => placement.kind === "stairs" && placement.stairBandTransition.inferredFromTwoDimensionalTrace).length,
      namedAnchorToNearestFootprintDisplacements: building.filter((placement) => placement.namedSkill).map((placement) => ({ id: placement.namedSkill.id, nearestFootprintId: placement.namedSkill.nearestFootprintId, distance: placement.namedSkill.anchorToNearestFootprintDistance })),
    },
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  const plate = await renderPlate(ordered, mask, grammar.palette);
  const repeatPlate = await renderPlate(ordered, mask, grammar.palette);
  assert(plate.equals(repeatPlate), "Placeholder plate render is not byte-identical within one build.");
  const registration = await renderRegistration(ordered, grammar.palette);
  const repeatRegistration = await renderRegistration(ordered, grammar.palette);
  assert(registration.equals(repeatRegistration), "Registration proof render is not byte-identical within one build.");
  return { manifestBytes, plate, registration, statistics: manifest.statistics };
}
async function compare(file, actual) {
  const expected = await readFile(absolute(file));
  assert(expected.equals(actual), `${file} is stale or non-deterministic; run the build command.`);
}
async function main() {
  const result = await build();
  if (CHECK_ONLY) await Promise.all([compare(files.manifest, result.manifestBytes), compare(files.plate, result.plate), compare(files.registration, result.registration)]);
  else {
    await Promise.all([mkdir(path.dirname(absolute(files.manifest)), { recursive: true }), mkdir(path.dirname(absolute(files.plate)), { recursive: true })]);
    await Promise.all([writeFile(absolute(files.manifest), result.manifestBytes), writeFile(absolute(files.plate), result.plate), writeFile(absolute(files.registration), result.registration)]);
  }
  console.log(JSON.stringify({ mode: CHECK_ONLY ? "check" : "build", output: { manifest: files.manifest, plate: files.plate, registration: files.registration }, statistics: result.statistics }));
}

await main();
