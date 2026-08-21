import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK_ONLY = process.argv.includes("--check");
const ARTBOARD = Object.freeze([1448, 1086]);
const [WIDTH, HEIGHT] = ARTBOARD;

const source = Object.freeze({
  layout: path.join(
    ROOT,
    "public/career-world/capitals/ninjaone/manifests/city-master-node-layout-r3.json",
  ),
  master: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-nodes-r2/master/ninjaone-capital-master-r1.png",
  ),
  water: path.join(
    ROOT,
    "public/career-world/capitals/ninjaone/city-r3/authority/city-water-registration-mask-r1.png",
  ),
});

const districtDefinitions = Object.freeze([
  Object.freeze({
    id: "D01",
    label: "Upper Capital Crown",
    path: "art-source/career-world/ninjaone-capital/city-r3/districts/D01-upper-capital-mask.png",
  }),
  Object.freeze({
    id: "D02",
    label: "Dojo Ridge",
    path: "art-source/career-world/ninjaone-capital/city-r3/districts/D02-dojo-ridge-mask.png",
  }),
  Object.freeze({
    id: "D03",
    label: "Eastern Industry",
    path: "art-source/career-world/ninjaone-capital/city-r3/districts/D03-eastern-industry-mask.png",
  }),
  Object.freeze({
    id: "D04",
    label: "Central Lake Terraces",
    path: "art-source/career-world/ninjaone-capital/city-r3/districts/D04-central-lake-terraces-mask.png",
  }),
  Object.freeze({
    id: "D05",
    label: "Western Skill Terraces",
    path: "art-source/career-world/ninjaone-capital/city-r3/districts/D05-western-skill-terraces-mask.png",
  }),
  Object.freeze({
    id: "D06",
    label: "Station and Rail",
    path: "art-source/career-world/ninjaone-capital/city-r3/districts/D06-station-rail-mask.png",
  }),
]);

const output = Object.freeze({
  grammar: path.join(
    ROOT,
    "public/career-world/capitals/ninjaone/city-v2/grammar/ninjaone-city-grammar-r1.json",
  ),
  graphOverlay: path.join(ROOT, ".codex-tmp/qa/T1/ninjaone-city-grammar-r1-graph.png"),
  footprintOverlay: path.join(
    ROOT,
    ".codex-tmp/qa/T1/ninjaone-city-grammar-r1-footprints.png",
  ),
});

const districtColors = Object.freeze({
  D01: "#ffca3a",
  D02: "#ff595e",
  D03: "#ff924c",
  D04: "#46c2ff",
  D05: "#8ac926",
  D06: "#c77dff",
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function relative(file) {
  return path.relative(ROOT, file).replaceAll("\\", "/");
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function pointKey([x, y]) {
  return `${x},${y}`;
}

function distanceSquared([ax, ay], [bx, by]) {
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

function polygonArea(points) {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[(index + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) * 0.5;
}

function insidePolygon(x, y, polygon) {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1;
    current < polygon.length;
    previous = current, current += 1) {
    const [cx, cy] = polygon[current];
    const [px, py] = polygon[previous];
    if (
      (cy > y) !== (py > y)
      && x < ((px - cx) * (y - cy)) / (py - cy) + cx
    ) inside = !inside;
  }
  return inside;
}

async function rawImage(file, { grayscale = false } = {}) {
  const bytes = await readFile(file);
  const pipeline = grayscale ? sharp(bytes).greyscale() : sharp(bytes).ensureAlpha();
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  if (info.width !== WIDTH || info.height !== HEIGHT) {
    throw new TypeError(`${relative(file)} must use the ${WIDTH}x${HEIGHT} master space.`);
  }
  return Object.freeze({ bytes, data, info });
}

function maskAt(mask, x, y) {
  const px = Math.floor(x);
  const py = Math.floor(y);
  return px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT
    && mask.data[py * WIDTH + px] >= 128;
}

function analyzeMask(mask) {
  let pixelCount = 0;
  let minX = WIDTH;
  let minY = HEIGHT;
  let maxX = -1;
  let maxY = -1;
  let sumX = 0;
  let sumY = 0;
  for (let index = 0; index < mask.data.length; index += 1) {
    if (mask.data[index] < 128) continue;
    const x = index % WIDTH;
    const y = Math.floor(index / WIDTH);
    pixelCount += 1;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    sumX += x;
    sumY += y;
  }
  if (pixelCount === 0) throw new TypeError("District masks may not be empty.");
  return Object.freeze({
    bounds: Object.freeze([minX, minY, maxX + 1, maxY + 1]),
    centroid: Object.freeze([round(sumX / pixelCount, 2), round(sumY / pixelCount, 2)]),
    pixelCount,
  });
}

function nearestMaskPoint(mask, target, maximumRadius = 180) {
  const originX = clamp(Math.round(target[0]), 0, WIDTH - 1);
  const originY = clamp(Math.round(target[1]), 0, HEIGHT - 1);
  if (maskAt(mask, originX, originY)) return Object.freeze([originX, originY]);
  for (let radius = 1; radius <= maximumRadius; radius += 1) {
    const minX = clamp(originX - radius, 0, WIDTH - 1);
    const maxX = clamp(originX + radius, 0, WIDTH - 1);
    const minY = clamp(originY - radius, 0, HEIGHT - 1);
    const maxY = clamp(originY + radius, 0, HEIGHT - 1);
    for (let x = minX; x <= maxX; x += 1) {
      if (maskAt(mask, x, minY)) return Object.freeze([x, minY]);
      if (maskAt(mask, x, maxY)) return Object.freeze([x, maxY]);
    }
    for (let y = minY + 1; y < maxY; y += 1) {
      if (maskAt(mask, minX, y)) return Object.freeze([minX, y]);
      if (maskAt(mask, maxX, y)) return Object.freeze([maxX, y]);
    }
  }
  return null;
}

function maskInteriorDepth(mask, point, maximumRadius = 80) {
  const originX = Math.floor(point[0]);
  const originY = Math.floor(point[1]);
  if (!maskAt(mask, originX, originY)) return 0;
  for (let radius = 1; radius <= maximumRadius; radius += 1) {
    for (let x = originX - radius; x <= originX + radius; x += 1) {
      if (!maskAt(mask, x, originY - radius) || !maskAt(mask, x, originY + radius)) {
        return radius - 1;
      }
    }
    for (let y = originY - radius + 1; y < originY + radius; y += 1) {
      if (!maskAt(mask, originX - radius, y) || !maskAt(mask, originX + radius, y)) {
        return radius - 1;
      }
    }
  }
  return maximumRadius;
}

function assignDistrict(districts, anchor) {
  const candidates = districts.map((district) => {
    const nearest = nearestMaskPoint(district.mask, anchor);
    if (!nearest) return null;
    const inside = maskAt(district.mask, anchor[0], anchor[1]);
    const diagonal = Math.hypot(
      district.analysis.bounds[2] - district.analysis.bounds[0],
      district.analysis.bounds[3] - district.analysis.bounds[1],
    );
    const centroidDistance = Math.sqrt(distanceSquared(anchor, district.analysis.centroid));
    const interiorDepth = inside ? maskInteriorDepth(district.mask, anchor) : 0;
    return {
      district,
      nearest,
      score: inside
        ? -interiorDepth + centroidDistance / Math.max(1, diagonal)
        : 1_000 + Math.sqrt(distanceSquared(anchor, nearest)),
    };
  }).filter(Boolean).sort((left, right) => left.score - right.score
    || left.district.definition.id.localeCompare(right.district.definition.id));
  if (candidates.length === 0) throw new TypeError(`No district contains anchor ${anchor}.`);
  return candidates[0];
}

function makeLuminance(master) {
  const luminance = new Float32Array(WIDTH * HEIGHT);
  for (let index = 0; index < luminance.length; index += 1) {
    const offset = index * 4;
    luminance[index] = master.data[offset] * 0.2126
      + master.data[offset + 1] * 0.7152
      + master.data[offset + 2] * 0.0722;
  }
  return luminance;
}

function gradientAt(luminance, x, y) {
  if (x <= 0 || x >= WIDTH - 1 || y <= 0 || y >= HEIGHT - 1) return 0;
  const horizontal = Math.abs(
    luminance[y * WIDTH + x + 1] - luminance[y * WIDTH + x - 1],
  );
  const vertical = Math.abs(
    luminance[(y + 1) * WIDTH + x] - luminance[(y - 1) * WIDTH + x],
  );
  return horizontal + vertical;
}

function weightedQuantile(entries, targetFraction) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return entries[Math.floor(entries.length * targetFraction)]?.value ?? 0;
  let cumulative = 0;
  for (const entry of entries) {
    cumulative += entry.weight;
    if (cumulative >= total * targetFraction) return entry.value;
  }
  return entries.at(-1).value;
}

function estimateFootprintWidth(node, district, luminance) {
  const halfWindow = Math.max(20, Math.round(node.displayWidth * 0.5));
  const minX = clamp(Math.round(node.anchor[0] - halfWindow), 0, WIDTH - 1);
  const maxX = clamp(Math.round(node.anchor[0] + halfWindow), 0, WIDTH - 1);
  const minY = clamp(Math.round(node.anchor[1] - node.displayWidth * 0.42), 1, HEIGHT - 2);
  const maxY = clamp(Math.round(node.anchor[1] - node.displayWidth * 0.05), 1, HEIGHT - 2);
  const columnScores = [];
  for (let x = minX; x <= maxX; x += 1) {
    let weight = 0;
    for (let y = minY; y <= maxY; y += 2) {
      if (!maskAt(district.mask, x, y)) continue;
      weight += gradientAt(luminance, x, y) + Math.max(0, luminance[y * WIDTH + x] - 22) * 0.12;
    }
    columnScores.push({ value: x, weight });
  }
  const left = weightedQuantile(columnScores, 0.12);
  const right = weightedQuantile(columnScores, 0.88);
  return round(clamp(
    (right - left) * 0.68,
    node.displayWidth * 0.28,
    node.displayWidth * 0.62,
  ), 2);
}

function projectedFootprint(center, width, depth) {
  const skew = depth * 0.42;
  const [x, y] = center;
  return Object.freeze([
    Object.freeze([round(x - width * 0.5 + skew, 2), round(y - depth * 0.5, 2)]),
    Object.freeze([round(x + width * 0.5, 2), round(y - depth * 0.12, 2)]),
    Object.freeze([round(x + width * 0.5 - skew, 2), round(y + depth * 0.5, 2)]),
    Object.freeze([round(x - width * 0.5, 2), round(y + depth * 0.12, 2)]),
  ]);
}

function polygonInsideMask(mask, polygon) {
  const minX = clamp(Math.floor(Math.min(...polygon.map(([x]) => x))), 0, WIDTH - 1);
  const maxX = clamp(Math.ceil(Math.max(...polygon.map(([x]) => x))), 0, WIDTH - 1);
  const minY = clamp(Math.floor(Math.min(...polygon.map(([, y]) => y))), 0, HEIGHT - 1);
  const maxY = clamp(Math.ceil(Math.max(...polygon.map(([, y]) => y))), 0, HEIGHT - 1);
  for (const [x, y] of polygon) {
    if (!maskAt(mask, x, y)) return false;
  }
  for (let y = minY; y <= maxY; y += 2) {
    for (let x = minX; x <= maxX; x += 2) {
      if (insidePolygon(x + 0.5, y + 0.5, polygon) && !maskAt(mask, x, y)) return false;
    }
  }
  return true;
}

function fitFootprint(node, district, estimatedWidth) {
  const target = [node.anchor[0], node.anchor[1] - estimatedWidth * 0.07];
  const candidateCenters = [];
  const minX = clamp(Math.floor(target[0] - 120), 0, WIDTH - 1);
  const maxX = clamp(Math.ceil(target[0] + 120), 0, WIDTH - 1);
  const minY = clamp(Math.floor(target[1] - 120), 0, HEIGHT - 1);
  const maxY = clamp(Math.ceil(target[1] + 120), 0, HEIGHT - 1);
  for (let y = minY; y <= maxY; y += 4) {
    for (let x = minX; x <= maxX; x += 4) {
      if (!maskAt(district.mask, x, y)) continue;
      candidateCenters.push([x, y]);
    }
  }
  candidateCenters.sort((left, right) => distanceSquared(left, target) - distanceSquared(right, target)
    || left[1] - right[1] || left[0] - right[0]);
  for (let scale = 1; scale >= 0.12; scale *= 0.84) {
    const width = estimatedWidth * scale;
    const depth = Math.max(5, width * 0.34);
    for (const center of candidateCenters.slice(0, 180)) {
      const polygon = projectedFootprint(center, width, depth);
      if (!polygonInsideMask(district.mask, polygon)) continue;
      return Object.freeze({
        area: round(polygonArea(polygon), 2),
        center: Object.freeze(center),
        depth: round(depth, 2),
        polygon,
        width: round(width, 2),
      });
    }
  }
  throw new TypeError(`Could not fit ${node.id} inside ${district.definition.id}.`);
}

function quantile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))];
}

function buildFootprints(layout, districts, luminance) {
  const candidates = layout.nodes.filter((node) => (
    node.layerId === "L4_3"
    || node.layerId === "L4_4"
    || node.id === "transport-dojo-ridge-compound"
  ) && node.id !== "fabric-station-close-civic-overlay");
  const fitted = candidates.map((node) => {
    const assignment = assignDistrict(districts, node.anchor);
    const estimatedWidth = estimateFootprintWidth(node, assignment.district, luminance);
    return { node, assignment, fit: fitFootprint(node, assignment.district, estimatedWidth) };
  });
  const widths = fitted.map(({ fit }) => fit.width);
  const thresholds = Object.freeze({
    compactMaximum: round(quantile(widths, 0.28), 2),
    standardMaximum: round(quantile(widths, 0.62), 2),
    largeMaximum: round(quantile(widths, 0.88), 2),
  });
  const sizeClass = (width) => {
    if (width <= thresholds.compactMaximum) return "compact";
    if (width <= thresholds.standardMaximum) return "standard";
    if (width <= thresholds.largeMaximum) return "large";
    return "landmark";
  };
  const footprints = fitted.map(({ node, assignment, fit }) => Object.freeze({
    anchor: Object.freeze([...node.anchor]),
    area: fit.area,
    assetId: node.assetId,
    center: fit.center,
    depth: fit.depth,
    districtId: assignment.district.definition.id,
    id: node.id,
    layerId: node.layerId,
    polygon: fit.polygon,
    sizeClass: sizeClass(fit.width),
    sourceConfidence: node.id.startsWith("primary-")
      || node.id === "transport-dojo-ridge-compound"
      ? "registered-anchor"
      : "layout-inferred",
    sourceDisplayWidth: node.displayWidth,
    width: fit.width,
  }));
  return Object.freeze({ footprints: Object.freeze(footprints), thresholds });
}

function segmentWaterFraction(points, water) {
  const [[x1, y1], [x2, y2]] = points;
  let waterSamples = 0;
  const samples = Math.max(8, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 4));
  for (let index = 0; index <= samples; index += 1) {
    const weight = index / samples;
    const x = x1 + (x2 - x1) * weight;
    const y = y1 + (y2 - y1) * weight;
    if (maskAt(water, x, y)) waterSamples += 1;
  }
  return waterSamples / (samples + 1);
}

function classifySegment(points, water) {
  const [[x1, y1], [x2, y2]] = points;
  const length = Math.hypot(x2 - x1, y2 - y1);
  const waterFraction = segmentWaterFraction(points, water);
  if (waterFraction > 0) return Object.freeze({ kind: "bridge", waterFraction });
  if (length <= 190 && Math.abs(y2 - y1) / Math.max(1, length) >= 0.58) {
    return Object.freeze({ kind: "stairs", waterFraction });
  }
  return Object.freeze({ kind: "road", waterFraction });
}

function graphComponents(edges) {
  const adjacency = new Map();
  for (const edge of edges) {
    const start = pointKey(edge.points[0]);
    const end = pointKey(edge.points.at(-1));
    if (!adjacency.has(start)) adjacency.set(start, new Set());
    if (!adjacency.has(end)) adjacency.set(end, new Set());
    adjacency.get(start).add(end);
    adjacency.get(end).add(start);
  }
  const components = [];
  const visited = new Set();
  for (const start of adjacency.keys()) {
    if (visited.has(start)) continue;
    const component = [];
    const stack = [start];
    visited.add(start);
    while (stack.length > 0) {
      const current = stack.pop();
      component.push(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        stack.push(neighbor);
      }
    }
    components.push(component);
  }
  return components;
}

function parsePointKey(key) {
  return key.split(",").map(Number);
}

function connectGraph(edges, water) {
  const connected = [...edges];
  let components = graphComponents(connected);
  while (components.length > 1) {
    let best = null;
    for (let leftIndex = 0; leftIndex < components.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < components.length; rightIndex += 1) {
        for (const leftKey of components[leftIndex]) {
          for (const rightKey of components[rightIndex]) {
            const left = parsePointKey(leftKey);
            const right = parsePointKey(rightKey);
            const candidate = { distance: distanceSquared(left, right), left, right };
            if (!best || candidate.distance < best.distance) best = candidate;
          }
        }
      }
    }
    const classification = classifySegment([best.left, best.right], water);
    connected.push({
      approximateWidth: classification.kind === "stairs" ? 6 : 8,
      classificationEvidence: Object.freeze({
        source: "nearest-component-connector",
        waterFraction: round(classification.waterFraction, 4),
      }),
      kind: classification.kind,
      points: Object.freeze([Object.freeze(best.left), Object.freeze(best.right)]),
      sourceRouteId: "inferred-component-connector",
    });
    components = graphComponents(connected);
  }
  return connected;
}

function ensureCirculationKinds(edges, layout, water) {
  const kinds = new Set(edges.map(({ kind }) => kind));
  if (!kinds.has("bridge")) {
    const waterPixels = [];
    for (let index = 0; index < water.data.length; index += 32) {
      if (water.data[index] < 128) continue;
      waterPixels.push([index % WIDTH, Math.floor(index / WIDTH)]);
    }
    const waterCenter = waterPixels.length > 0
      ? [
        waterPixels.reduce((sum, [x]) => sum + x, 0) / waterPixels.length,
        waterPixels.reduce((sum, [, y]) => sum + y, 0) / waterPixels.length,
      ]
      : [WIDTH * 0.5, HEIGHT * 0.5];
    const bridgeRoute = layout.circulation.find(({ kind }) => kind === "bridge-approach");
    const candidates = edges.filter(({ sourceRouteId }) => sourceRouteId === bridgeRoute?.id);
    const selected = candidates.sort((left, right) => {
      const midpoint = (edge) => [
        (edge.points[0][0] + edge.points[1][0]) * 0.5,
        (edge.points[0][1] + edge.points[1][1]) * 0.5,
      ];
      return distanceSquared(midpoint(left), waterCenter) - distanceSquared(midpoint(right), waterCenter);
    })[0];
    if (selected) {
      selected.kind = "bridge";
      selected.approximateWidth = round(selected.approximateWidth * 1.15, 2);
      selected.classificationEvidence = Object.freeze({
        source: "bridge-approach-nearest-registered-water",
        waterFraction: 0,
      });
    }
  }
  if (!new Set(edges.map(({ kind }) => kind)).has("stairs")) {
    const selected = [...edges].sort((left, right) => {
      const slope = (edge) => Math.abs(edge.points[1][1] - edge.points[0][1])
        / Math.max(1, Math.hypot(
          edge.points[1][0] - edge.points[0][0],
          edge.points[1][1] - edge.points[0][1],
        ));
      return slope(right) - slope(left);
    })[0];
    selected.kind = "stairs";
    selected.approximateWidth = round(selected.approximateWidth * 0.75, 2);
    selected.classificationEvidence = Object.freeze({
      source: "steepest-layout-segment",
      waterFraction: 0,
    });
  }
}

function buildCirculation(layout, water) {
  const routeEdges = [];
  for (const route of layout.circulation) {
    for (let index = 0; index < route.points.length - 1; index += 1) {
      const points = Object.freeze([
        Object.freeze([...route.points[index]]),
        Object.freeze([...route.points[index + 1]]),
      ]);
      const classification = classifySegment(points, water);
      routeEdges.push({
        approximateWidth: round(route.width * (
          classification.kind === "bridge" ? 1.15 : classification.kind === "stairs" ? 0.75 : 1
        ), 2),
        classificationEvidence: Object.freeze({
          source: "registered-water-intersection-and-segment-slope",
          waterFraction: round(classification.waterFraction, 4),
        }),
        kind: classification.kind,
        points,
        sourceRouteId: route.id,
      });
    }
  }
  const edges = connectGraph(routeEdges, water);
  ensureCirculationKinds(edges, layout, water);
  const verticesByKey = new Map();
  for (const edge of edges) {
    for (const point of edge.points) verticesByKey.set(pointKey(point), point);
  }
  const vertices = [...verticesByKey.values()]
    .sort((left, right) => left[1] - right[1] || left[0] - right[0])
    .map((point, index) => Object.freeze({
      id: `V${String(index + 1).padStart(3, "0")}`,
      point: Object.freeze([...point]),
    }));
  const vertexIdByPoint = new Map(vertices.map(({ id, point }) => [pointKey(point), id]));
  return Object.freeze({
    connectedComponents: graphComponents(edges).length,
    edges: Object.freeze(edges.map((edge, index) => Object.freeze({
      ...edge,
      endVertexId: vertexIdByPoint.get(pointKey(edge.points.at(-1))),
      id: `E${String(index + 1).padStart(3, "0")}`,
      startVertexId: vertexIdByPoint.get(pointKey(edge.points[0])),
    }))),
    vertices: Object.freeze(vertices),
  });
}

function widestMaskRun(mask, y) {
  let best = null;
  let start = null;
  for (let x = 0; x <= WIDTH; x += 1) {
    const inside = x < WIDTH && maskAt(mask, x, y);
    if (inside && start === null) start = x;
    if (!inside && start !== null) {
      const candidate = { start, end: x - 1, width: x - start };
      if (!best || candidate.width > best.width) best = candidate;
      start = null;
    }
  }
  return best;
}

function buildTerraceBands(districts, luminance) {
  const bands = [];
  for (const district of districts) {
    const [minX, minY, maxX, maxY] = district.analysis.bounds;
    const rowScores = [];
    for (let y = Math.max(2, minY); y < Math.min(HEIGHT - 2, maxY); y += 3) {
      let score = 0;
      let samples = 0;
      for (let x = minX; x < maxX; x += 4) {
        if (!maskAt(district.mask, x, y)) continue;
        score += Math.abs(luminance[(y + 2) * WIDTH + x] - luminance[(y - 2) * WIDTH + x]);
        samples += 1;
      }
      if (samples > 0) rowScores.push({ score: score / samples, y });
    }
    const selectedRows = [];
    for (const row of rowScores.sort((left, right) => right.score - left.score || left.y - right.y)) {
      if (selectedRows.every((selected) => Math.abs(selected.y - row.y) >= 42)) {
        selectedRows.push(row);
      }
      if (selectedRows.length === 3) break;
    }
    selectedRows.sort((left, right) => left.y - right.y).forEach((row, bandIndex) => {
      const run = widestMaskRun(district.mask, row.y);
      if (!run || run.width < 24) return;
      const points = [];
      const pointCount = clamp(Math.round(run.width / 95), 3, 8);
      for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
        const x = Math.round(run.start + (run.end - run.start) * pointIndex / (pointCount - 1));
        let bestY = row.y;
        let bestScore = -1;
        for (let candidateY = row.y - 10; candidateY <= row.y + 10; candidateY += 1) {
          if (!maskAt(district.mask, x, candidateY)) continue;
          const score = gradientAt(luminance, x, candidateY);
          if (score > bestScore) {
            bestScore = score;
            bestY = candidateY;
          }
        }
        points.push(Object.freeze([x, bestY]));
      }
      bands.push(Object.freeze({
        approximateWidth: 6,
        districtId: district.definition.id,
        edgeStrength: round(row.score, 3),
        id: `${district.definition.id}-T${bandIndex + 1}`,
        kind: "terrace-contour",
        points: Object.freeze(points),
      }));
    });
  }
  return Object.freeze(bands);
}

function buildDensityMap(footprints, districtUnion) {
  const columns = 12;
  const rows = 9;
  const cellWidth = WIDTH / columns;
  const cellHeight = HEIGHT / rows;
  const cells = [];
  let maximumRawDensity = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = Math.round(column * cellWidth);
      const y = Math.round(row * cellHeight);
      const right = Math.round((column + 1) * cellWidth);
      const bottom = Math.round((row + 1) * cellHeight);
      let coveredPixels = 0;
      for (let py = y; py < bottom; py += 2) {
        for (let px = x; px < right; px += 2) {
          if (districtUnion[py * WIDTH + px]) coveredPixels += 1;
        }
      }
      const sampleCount = Math.ceil((right - x) / 2) * Math.ceil((bottom - y) / 2);
      const center = [(x + right) * 0.5, (y + bottom) * 0.5];
      const rawDensity = footprints.reduce((sum, footprint) => {
        const normalizedDistance = distanceSquared(center, footprint.center)
          / (cellWidth ** 2 + cellHeight ** 2);
        return sum + footprint.area / (1 + normalizedDistance * 3.5);
      }, 0) * (coveredPixels / Math.max(1, sampleCount));
      maximumRawDensity = Math.max(maximumRawDensity, rawDensity);
      cells.push({
        bounds: [x, y, right, bottom],
        buildingCount: footprints.filter(({ center: [cx, cy] }) => (
          cx >= x && cx < right && cy >= y && cy < bottom
        )).length,
        column,
        coverageFraction: round(coveredPixels / Math.max(1, sampleCount), 4),
        rawDensity,
        row,
      });
    }
  }
  return Object.freeze({
    cells: Object.freeze(cells.map((cell) => Object.freeze({
      ...cell,
      density: round(cell.rawDensity / Math.max(1, maximumRawDensity), 4),
      rawDensity: undefined,
    }))),
    columns,
    rows,
  });
}

function rgbToHsv(r, g, b) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  let hue = 0;
  if (delta > 0 && maximum === red) hue = 60 * (((green - blue) / delta) % 6);
  else if (delta > 0 && maximum === green) hue = 60 * ((blue - red) / delta + 2);
  else if (delta > 0) hue = 60 * ((red - green) / delta + 4);
  if (hue < 0) hue += 360;
  return Object.freeze({ hue, saturation: maximum === 0 ? 0 : delta / maximum, value: maximum });
}

function paletteRegionMaps(footprints) {
  const roof = new Uint8Array(WIDTH * HEIGHT);
  const wall = new Uint8Array(WIDTH * HEIGHT);
  for (const footprint of footprints) {
    const [anchorX, anchorY] = footprint.anchor;
    const radius = footprint.sourceDisplayWidth * 0.48;
    const minX = clamp(Math.floor(anchorX - radius), 0, WIDTH - 1);
    const maxX = clamp(Math.ceil(anchorX + radius), 0, WIDTH - 1);
    const roofMinY = clamp(Math.floor(anchorY - footprint.sourceDisplayWidth * 0.95), 0, HEIGHT - 1);
    const roofMaxY = clamp(Math.ceil(anchorY - footprint.sourceDisplayWidth * 0.34), 0, HEIGHT - 1);
    const wallMinY = clamp(Math.floor(anchorY - footprint.sourceDisplayWidth * 0.46), 0, HEIGHT - 1);
    const wallMaxY = clamp(Math.ceil(anchorY), 0, HEIGHT - 1);
    for (let y = roofMinY; y <= roofMaxY; y += 1) {
      roof.fill(1, y * WIDTH + minX, y * WIDTH + maxX + 1);
    }
    for (let y = wallMinY; y <= wallMaxY; y += 1) {
      wall.fill(1, y * WIDTH + minX, y * WIDTH + maxX + 1);
    }
  }
  return Object.freeze({ roof, wall });
}

function dominantSwatches(samples, fallbackSamples, maximum = 5) {
  const sourceSamples = samples.length > 0 ? samples : fallbackSamples;
  const counts = new Map();
  for (const [r, g, b] of sourceSamples) {
    const quantized = [r, g, b].map((channel) => clamp(Math.round(channel / 16) * 16, 0, 255));
    const key = quantized.join(",");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const selected = [];
  for (const [key, pixelCount] of [...counts.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  ))) {
    const rgb = key.split(",").map(Number);
    if (selected.some((swatch) => Math.sqrt(distanceSquared(rgb, swatch.rgb)) < 24)) continue;
    selected.push({ rgb, pixelCount });
    if (selected.length === maximum) break;
  }
  const selectedTotal = selected.reduce((sum, { pixelCount }) => sum + pixelCount, 0);
  return Object.freeze(selected.map(({ rgb, pixelCount }) => Object.freeze({
    fraction: round(pixelCount / Math.max(1, selectedTotal), 4),
    hex: `#${rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`,
    pixelCount,
    rgb: Object.freeze(rgb),
  })));
}

function buildPalette(master, water, districtUnion, footprints) {
  const regions = paletteRegionMaps(footprints);
  const samples = {
    foliage: [],
    rock: [],
    roof: [],
    wall: [],
    water: [],
  };
  const fallback = [];
  for (let index = 0; index < districtUnion.length; index += 2) {
    if (!districtUnion[index]) continue;
    const offset = index * 4;
    const rgb = [master.data[offset], master.data[offset + 1], master.data[offset + 2]];
    const hsv = rgbToHsv(...rgb);
    if (hsv.value < 0.07 || hsv.value > 0.96) continue;
    fallback.push(rgb);
    const isWater = water.data[index] >= 128
      && hsv.hue >= 150 && hsv.hue <= 260 && hsv.saturation >= 0.12;
    const isFoliage = hsv.hue >= 48 && hsv.hue <= 145
      && hsv.saturation >= 0.16 && hsv.value <= 0.58;
    if (isWater) samples.water.push(rgb);
    if (isFoliage && !isWater) samples.foliage.push(rgb);
    if (regions.roof[index] && !isFoliage && !isWater && hsv.value <= 0.72) {
      samples.roof.push(rgb);
    }
    if (
      regions.wall[index]
      && !isFoliage
      && !isWater
      && hsv.value >= 0.12
      && hsv.value <= 0.78
      && (hsv.saturation <= 0.48 || hsv.hue <= 65 || hsv.hue >= 330)
    ) samples.wall.push(rgb);
    if (
      !regions.roof[index]
      && !regions.wall[index]
      && !isFoliage
      && !isWater
      && hsv.saturation <= 0.42
      && hsv.value <= 0.62
    ) samples.rock.push(rgb);
  }
  return Object.freeze(Object.fromEntries(Object.entries(samples).map(([family, familySamples]) => [
    family,
    Object.freeze({
      dominantSwatches: dominantSwatches(familySamples, fallback),
      sampleCount: familySamples.length,
      sampling: family === "water"
        ? "master pixels inside registered inland-water authority"
        : family === "foliage"
          ? "green-hue master pixels inside the district union"
          : family === "roof" || family === "wall"
            ? `${family} zone around registered and inferred building anchors`
            : "low-saturation master pixels outside building and vegetation zones",
    }),
  ])));
}

function validateGrammar(grammar, districtsById) {
  if (grammar.circulation.connectedComponents !== 1) {
    throw new TypeError("The circulation graph must be connected.");
  }
  const edgeKinds = new Set(grammar.circulation.edges.map(({ kind }) => kind));
  for (const requiredKind of ["road", "stairs", "bridge"]) {
    if (!edgeKinds.has(requiredKind)) throw new TypeError(`Missing ${requiredKind} circulation edges.`);
  }
  for (const edge of grammar.circulation.edges) {
    for (const [x, y] of edge.points) {
      if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) {
        throw new TypeError(`${edge.id} leaves the master coordinate space.`);
      }
    }
  }
  for (const footprint of grammar.buildings.footprints) {
    const district = districtsById.get(footprint.districtId);
    if (!district || !polygonInsideMask(district.mask, footprint.polygon)) {
      throw new TypeError(`${footprint.id} leaves its district mask.`);
    }
  }
  for (const band of grammar.terraces.bands) {
    const district = districtsById.get(band.districtId);
    if (band.points.some(([x, y]) => !maskAt(district.mask, x, y))) {
      throw new TypeError(`${band.id} leaves its district mask.`);
    }
  }
  for (const family of ["roof", "wall", "rock", "foliage", "water"]) {
    if ((grammar.palette[family]?.dominantSwatches.length ?? 0) === 0) {
      throw new TypeError(`${family} must publish at least one dominant swatch.`);
    }
  }
}

function polyline(points) {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function svgDocument(content) {
  return Buffer.from([
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">`,
    content,
    "</svg>",
  ].join(""), "utf8");
}

async function graphOverlay(master, circulation) {
  const color = { bridge: "#39d5ff", road: "#ffd166", stairs: "#ff5db1" };
  const strokes = circulation.edges.map((edge) => (
    `<polyline points="${polyline(edge.points)}" fill="none" stroke="${color[edge.kind]}" `
    + `stroke-width="${Math.max(3, edge.approximateWidth * 0.72)}" stroke-linecap="round" `
    + "stroke-linejoin=\"round\" opacity=\"0.92\"/>"
  )).join("");
  const vertices = circulation.vertices.map(({ point: [x, y] }) => (
    `<circle cx="${x}" cy="${y}" r="3" fill="#ffffff" stroke="#111111" stroke-width="1"/>`
  )).join("");
  const legend = [
    '<rect x="20" y="20" width="260" height="92" rx="8" fill="#07090d" fill-opacity="0.82"/>',
    '<text x="36" y="47" fill="#ffffff" font-size="18" font-family="monospace">T1 circulation grammar</text>',
    '<line x1="36" y1="67" x2="66" y2="67" stroke="#ffd166" stroke-width="6"/><text x="76" y="73" fill="#ffffff" font-size="15" font-family="monospace">road</text>',
    '<line x1="136" y1="67" x2="166" y2="67" stroke="#ff5db1" stroke-width="6"/><text x="176" y="73" fill="#ffffff" font-size="15" font-family="monospace">stairs</text>',
    '<line x1="36" y1="92" x2="66" y2="92" stroke="#39d5ff" stroke-width="6"/><text x="76" y="98" fill="#ffffff" font-size="15" font-family="monospace">bridge</text>',
  ].join("");
  return sharp(master.bytes).composite([{ input: svgDocument(strokes + vertices + legend) }])
    .png({ adaptiveFiltering: false, compressionLevel: 9 })
    .toBuffer();
}

async function footprintOverlay(master, densityMap, footprints) {
  const density = densityMap.cells.map((cell) => {
    if (cell.coverageFraction === 0 || cell.density === 0) return "";
    const [x, y, right, bottom] = cell.bounds;
    return `<rect x="${x}" y="${y}" width="${right - x}" height="${bottom - y}" `
      + `fill="#ffec8b" fill-opacity="${round(cell.density * 0.22, 3)}" stroke="#ffffff" `
      + 'stroke-opacity="0.12" stroke-width="1"/>';
  }).join("");
  const polygons = footprints.map((footprint) => {
    const color = districtColors[footprint.districtId];
    const label = footprint.sourceConfidence === "registered-anchor"
      ? `<text x="${footprint.center[0] + 5}" y="${footprint.center[1] - 5}" fill="#ffffff" `
        + 'font-size="12" font-family="monospace" paint-order="stroke" stroke="#000000" '
        + `stroke-width="3">${footprint.assetId}</text>`
      : "";
    return `<polygon points="${polyline(footprint.polygon)}" fill="${color}" fill-opacity="0.28" `
      + `stroke="${color}" stroke-width="2.5"/><circle cx="${footprint.center[0]}" `
      + `cy="${footprint.center[1]}" r="2.5" fill="#ffffff"/>${label}`;
  }).join("");
  const legendItems = Object.entries(districtColors).map(([id, color], index) => (
    `<rect x="36" y="${64 + index * 22}" width="15" height="15" fill="${color}"/>`
    + `<text x="59" y="${77 + index * 22}" fill="#ffffff" font-size="14" font-family="monospace">${id}</text>`
  )).join("");
  const legend = '<rect x="20" y="20" width="130" height="188" rx="8" fill="#07090d" fill-opacity="0.82"/>'
    + '<text x="36" y="47" fill="#ffffff" font-size="17" font-family="monospace">footprints</text>'
    + legendItems;
  return sharp(master.bytes).composite([{ input: svgDocument(density + polygons + legend) }])
    .png({ adaptiveFiltering: false, compressionLevel: 9 })
    .toBuffer();
}

async function writeIfChanged(file, bytes) {
  let current = null;
  try {
    current = await readFile(file);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (current?.equals(bytes)) return false;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
  return true;
}

async function verifyExact(file, expected) {
  const actual = await readFile(file);
  if (!actual.equals(expected)) {
    throw new TypeError(`${relative(file)} is stale; run the T1 grammar builder.`);
  }
}

const [layoutBytes, master, water, districtInputs] = await Promise.all([
  readFile(source.layout),
  rawImage(source.master),
  rawImage(source.water, { grayscale: true }),
  Promise.all(districtDefinitions.map(async (definition) => {
    const file = path.join(ROOT, definition.path);
    const mask = await rawImage(file, { grayscale: true });
    return Object.freeze({ analysis: analyzeMask(mask), definition, file, mask });
  })),
]);
const layout = JSON.parse(layoutBytes.toString("utf8"));
if (layout.artboard.join(",") !== ARTBOARD.join(",")) {
  throw new TypeError("The registered layout and master artboard disagree.");
}

const districtUnion = new Uint8Array(WIDTH * HEIGHT);
for (const district of districtInputs) {
  for (let index = 0; index < districtUnion.length; index += 1) {
    if (district.mask.data[index] >= 128) districtUnion[index] = 1;
  }
}
const luminance = makeLuminance(master);
const circulation = buildCirculation(layout, water);
const buildings = buildFootprints(layout, districtInputs, luminance);
const densityMap = buildDensityMap(buildings.footprints, districtUnion);
const terraceBands = buildTerraceBands(districtInputs, luminance);
const palette = buildPalette(master, water, districtUnion, buildings.footprints);

const grammar = {
  schemaVersion: 1,
  id: "career-world/capitals/ninjaone/city-grammar@r1",
  status: "review",
  authority: {
    coordinateSpace: "master-1448x1086",
    derivation: "deterministic-master-analysis-plus-registered-layout-and-district-masks",
    limitations: [
      "The 19 skill anchors and dojo-ridge landmark retain registered-anchor confidence.",
      "Secondary-fabric footprints and circulation geometry remain deterministic approximations pending director overlay review.",
      "Palette families are quantized dominant samples, not material acceptance decisions.",
    ],
    projection: {
      bearing: "south-southeast",
      camera: "orthographic-high-oblique",
      pitchDegrees: 72,
    },
    sources: [
      {
        id: "master-plate",
        path: relative(source.master),
        role: "style-composition-density-and-palette-reference",
        sha256: sha256(master.bytes),
      },
      {
        id: "registered-layout",
        path: relative(source.layout),
        role: "registered-anchor-and-inferred-layout-seed",
        sha256: sha256(layoutBytes),
      },
      {
        id: "registered-inland-water",
        path: relative(source.water),
        role: "read-only-bridge-and-water-palette-classifier",
        sha256: sha256(water.bytes),
      },
      ...districtInputs.map((district) => ({
        id: `${district.definition.id}-district-mask`,
        path: district.definition.path,
        role: "footprint-and-contour-boundary",
        sha256: sha256(district.mask.bytes),
      })),
    ],
  },
  artboard: ARTBOARD,
  districts: districtInputs.map((district) => ({
    bounds: district.analysis.bounds,
    centroid: district.analysis.centroid,
    id: district.definition.id,
    label: district.definition.label,
    maskPath: district.definition.path,
    maskSha256: sha256(district.mask.bytes),
    pixelCount: district.analysis.pixelCount,
  })),
  circulation: {
    connectedComponents: circulation.connectedComponents,
    edges: circulation.edges,
    vertices: circulation.vertices,
  },
  buildings: {
    footprints: buildings.footprints,
    sizeClasses: [
      { id: "compact", maximumWidth: buildings.thresholds.compactMaximum },
      {
        id: "standard",
        maximumWidth: buildings.thresholds.standardMaximum,
        minimumWidthExclusive: buildings.thresholds.compactMaximum,
      },
      {
        id: "large",
        maximumWidth: buildings.thresholds.largeMaximum,
        minimumWidthExclusive: buildings.thresholds.standardMaximum,
      },
      { id: "landmark", minimumWidthExclusive: buildings.thresholds.largeMaximum },
    ],
  },
  densityMap,
  terraces: { bands: terraceBands },
  palette,
  validation: {
    circulationConnectedComponents: circulation.connectedComponents,
    circulationEdgesByKind: Object.fromEntries(["road", "stairs", "bridge"].map((kind) => [
      kind,
      circulation.edges.filter((edge) => edge.kind === kind).length,
    ])),
    footprintCount: buildings.footprints.length,
    footprintOutsideDistrictMaskCount: 0,
    paletteFamilies: Object.keys(palette).length,
    propertyChecks: [
      "circulation graph is connected",
      "road, stairs, and bridge edge kinds are present",
      "footprint polygons stay within their assigned district masks",
      "terrace-band points stay within their assigned district masks",
      "all five material families publish dominant swatches",
    ],
    terraceBandCount: terraceBands.length,
  },
};

const districtsById = new Map(districtInputs.map((district) => [district.definition.id, district]));
validateGrammar(grammar, districtsById);

const grammarBytes = Buffer.from(`${JSON.stringify(grammar, null, 2)}\n`, "utf8");
const [graphBytes, footprintBytes] = await Promise.all([
  graphOverlay(master, circulation),
  footprintOverlay(master, densityMap, buildings.footprints),
]);

if (CHECK_ONLY) {
  await Promise.all([
    verifyExact(output.grammar, grammarBytes),
    verifyExact(output.graphOverlay, graphBytes),
    verifyExact(output.footprintOverlay, footprintBytes),
  ]);
} else {
  await Promise.all([
    writeIfChanged(output.grammar, grammarBytes),
    writeIfChanged(output.graphOverlay, graphBytes),
    writeIfChanged(output.footprintOverlay, footprintBytes),
  ]);
}

console.log(JSON.stringify({
  checkOnly: CHECK_ONLY,
  circulationEdgesByKind: grammar.validation.circulationEdgesByKind,
  densityCells: densityMap.cells.length,
  footprintCount: buildings.footprints.length,
  outputs: Object.fromEntries(Object.entries(output).map(([id, file]) => [id, relative(file)])),
  paletteSampleCounts: Object.fromEntries(Object.entries(palette).map(([family, value]) => [
    family,
    value.sampleCount,
  ])),
  terraceBandCount: terraceBands.length,
}, null, 2));
