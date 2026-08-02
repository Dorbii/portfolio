#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const PUBLIC_ROOT = path.join(ROOT, "public");
const FABRIC_MANIFEST_PATH = path.join(
  PUBLIC_ROOT,
  "career-world",
  "layers",
  "structures",
  "manifests",
  "town-fabric-r1.json",
);
const TOWN_MANIFEST_PATH = path.join(
  PUBLIC_ROOT,
  "career-world",
  "layers",
  "infrastructure",
  "manifests",
  "ninjaone-project-towns-r1.json",
);

// These are the physical SVG dimensions used by InfrastructureLayer. Keeping
// the mask in world-plane units prevents each non-square town bound from
// silently changing the road clearance.
const WORLD_PLANE = Object.freeze({ width: 1672, height: 941 });
const STREET_SURFACE_WIDTH = Object.freeze({
  arterial: 2.4,
  collector: 1.8,
  local: 1.4,
  service: 1.1,
  stairs: 1.2,
});
const STREET_SHOULDER_ADDITION = 2;
const PEDESTRIAN_LOOP_WIDTH = 1.7;
const ENTRANCE_LANDING = Object.freeze({
  width: 2.1,
  height: 1.25,
});
const TARGET_REVISION = 3;

function publicPath(assetPath) {
  if (!assetPath.startsWith("/career-world/")) {
    throw new TypeError(`Unsupported public asset path: ${assetPath}`);
  }
  return path.join(PUBLIC_ROOT, ...assetPath.slice(1).split("/"));
}

function revisionedAssetPath(assetPath) {
  if (assetPath.endsWith(`-r${TARGET_REVISION}.png`)) {
    return assetPath;
  }
  if (!/-r[12]\.png$/.test(assetPath)) {
    throw new TypeError(
      `Expected an r1-r${TARGET_REVISION} town-fabric asset: ${assetPath}`,
    );
  }
  return assetPath.replace(
    /-r[12]\.png$/,
    `-r${TARGET_REVISION}.png`,
  );
}

function worldPoint([x, y]) {
  return [x * WORLD_PLANE.width, y * WORLD_PLANE.height];
}

function sourcePixelToWorld(instance, x, y, width, height) {
  const { origin, span } = instance.worldBounds;
  return [
    (origin[0] + ((x + 0.5) / width) * span[0]) * WORLD_PLANE.width,
    (origin[1] + ((y + 0.5) / height) * span[1]) * WORLD_PLANE.height,
  ];
}

function worldBoundsToPixelBounds(
  instance,
  [minimumX, minimumY, maximumX, maximumY],
  width,
  height,
) {
  const origin = worldPoint(instance.worldBounds.origin);
  const span = [
    instance.worldBounds.span[0] * WORLD_PLANE.width,
    instance.worldBounds.span[1] * WORLD_PLANE.height,
  ];
  return [
    Math.max(0, Math.floor(((minimumX - origin[0]) / span[0]) * width)),
    Math.max(0, Math.floor(((minimumY - origin[1]) / span[1]) * height)),
    Math.min(
      width - 1,
      Math.ceil(((maximumX - origin[0]) / span[0]) * width),
    ),
    Math.min(
      height - 1,
      Math.ceil(((maximumY - origin[1]) / span[1]) * height),
    ),
  ];
}

function squaredDistanceToSegment(point, start, end) {
  const segmentX = end[0] - start[0];
  const segmentY = end[1] - start[1];
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (lengthSquared === 0) {
    const dx = point[0] - start[0];
    const dy = point[1] - start[1];
    return dx * dx + dy * dy;
  }
  const projection = Math.max(0, Math.min(
    1,
    (
      (point[0] - start[0]) * segmentX
      + (point[1] - start[1]) * segmentY
    ) / lengthSquared,
  ));
  const closestX = start[0] + projection * segmentX;
  const closestY = start[1] + projection * segmentY;
  const dx = point[0] - closestX;
  const dy = point[1] - closestY;
  return dx * dx + dy * dy;
}

function markSegment(mask, instance, start, end, corridorWidth, width, height) {
  const radius = corridorWidth * 0.5;
  const radiusSquared = radius * radius;
  const minimumX = Math.min(start[0], end[0]) - radius;
  const minimumY = Math.min(start[1], end[1]) - radius;
  const maximumX = Math.max(start[0], end[0]) + radius;
  const maximumY = Math.max(start[1], end[1]) + radius;
  const [
    startPixelX,
    startPixelY,
    endPixelX,
    endPixelY,
  ] = worldBoundsToPixelBounds(
    instance,
    [minimumX, minimumY, maximumX, maximumY],
    width,
    height,
  );

  if (startPixelX > endPixelX || startPixelY > endPixelY) {
    return;
  }
  for (let y = startPixelY; y <= endPixelY; y += 1) {
    for (let x = startPixelX; x <= endPixelX; x += 1) {
      const point = sourcePixelToWorld(instance, x, y, width, height);
      if (
        squaredDistanceToSegment(point, start, end)
        <= radiusSquared
      ) {
        mask[y * width + x] = 1;
      }
    }
  }
}

function markPolyline(
  mask,
  instance,
  normalizedPoints,
  corridorWidth,
  width,
  height,
) {
  const points = normalizedPoints.map(worldPoint);
  for (let index = 1; index < points.length; index += 1) {
    markSegment(
      mask,
      instance,
      points[index - 1],
      points[index],
      corridorWidth,
      width,
      height,
    );
  }
}

function pointOnSegment(point, start, end) {
  return squaredDistanceToSegment(point, start, end) <= 1e-12;
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index, index += 1
  ) {
    const start = polygon[previous];
    const end = polygon[index];
    if (pointOnSegment(point, start, end)) {
      return true;
    }
    const crosses = (
      (start[1] > point[1]) !== (end[1] > point[1])
      && point[0] < (
        ((end[0] - start[0]) * (point[1] - start[1]))
        / (end[1] - start[1])
        + start[0]
      )
    );
    if (crosses) {
      inside = !inside;
    }
  }
  return inside;
}

function markPolygon(mask, instance, normalizedPoints, width, height) {
  const polygon = normalizedPoints.map(worldPoint);
  const xs = polygon.map(([x]) => x);
  const ys = polygon.map(([, y]) => y);
  const pixelBounds = worldBoundsToPixelBounds(
    instance,
    [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
    width,
    height,
  );
  const [startPixelX, startPixelY, endPixelX, endPixelY] = pixelBounds;

  if (startPixelX > endPixelX || startPixelY > endPixelY) {
    return;
  }
  for (let y = startPixelY; y <= endPixelY; y += 1) {
    for (let x = startPixelX; x <= endPixelX; x += 1) {
      if (
        pointInPolygon(
          sourcePixelToWorld(instance, x, y, width, height),
          polygon,
        )
      ) {
        mask[y * width + x] = 1;
      }
    }
  }
}

function markEntranceLanding(
  mask,
  instance,
  entrance,
  width,
  height,
) {
  const [centerX, centerY] = worldPoint(entrance.point);
  const halfWidth = ENTRANCE_LANDING.width * 0.5;
  const halfHeight = ENTRANCE_LANDING.height * 0.5;
  const polygon = [
    [centerX - halfWidth, centerY - halfHeight],
    [centerX + halfWidth, centerY - halfHeight],
    [centerX + halfWidth, centerY + halfHeight],
    [centerX - halfWidth, centerY + halfHeight],
  ];
  const normalizedPolygon = polygon.map(([x, y]) => [
    x / WORLD_PLANE.width,
    y / WORLD_PLANE.height,
  ]);
  markPolygon(
    mask,
    instance,
    normalizedPolygon,
    width,
    height,
  );
}

function buildCorridorMask(instance, plan, width, height) {
  const mask = new Uint8Array(width * height);

  for (const street of plan.streets) {
    const surfaceWidth = STREET_SURFACE_WIDTH[street.kind];
    if (surfaceWidth === undefined) {
      throw new TypeError(`${street.id} has an unsupported street kind.`);
    }
    markPolyline(
      mask,
      instance,
      street.waypoints,
      surfaceWidth + STREET_SHOULDER_ADDITION,
      width,
      height,
    );
  }
  for (const loop of plan.pedestrianLoops) {
    markPolyline(
      mask,
      instance,
      loop.waypoints,
      PEDESTRIAN_LOOP_WIDTH,
      width,
      height,
    );
  }
  for (const plaza of plan.plazas) {
    markPolygon(mask, instance, plaza.points, width, height);
  }
  for (const entrance of plan.entrances) {
    markEntranceLanding(mask, instance, entrance, width, height);
  }

  return mask;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex").toUpperCase();
}

async function decodeRgba(sourcePath) {
  const image = sharp(sourcePath, { failOn: "error" }).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) {
    throw new TypeError(
      `${sourcePath} must decode to RGBA.`,
    );
  }
  return { data, info };
}

function clearMaskAlpha(source, mask) {
  const output = Buffer.from(source);
  let maskPixels = 0;
  let originallyVisibleMaskPixels = 0;
  let clearedVisiblePixels = 0;
  let visiblePixelsBefore = 0;
  let visiblePixelsAfter = 0;

  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const alphaIndex = pixel * 4 + 3;
    const alpha = source[alphaIndex];
    if (alpha > 0) {
      visiblePixelsBefore += 1;
    }
    if (mask[pixel] === 1) {
      maskPixels += 1;
      if (alpha > 0) {
        originallyVisibleMaskPixels += 1;
        clearedVisiblePixels += 1;
      }
      output[alphaIndex] = 0;
    }
    if (output[alphaIndex] > 0) {
      visiblePixelsAfter += 1;
    }
  }

  return {
    output,
    metrics: {
      maskPixels,
      originallyVisibleMaskPixels,
      clearedVisiblePixels,
      visiblePixelsBefore,
      visiblePixelsAfter,
    },
  };
}

function plansByOwner(townManifest) {
  return new Map([
    ...townManifest.towns.map((town) => [town.projectId, town.townPlan]),
    [
      townManifest.capitalCampus.capitalId,
      townManifest.capitalCampus.townPlan,
    ],
  ]);
}

async function buildInstance(instance, plan) {
  const inputAssetPath = instance.assetPath;
  const sourceAssetPath = instance.sourceAssetPath ?? inputAssetPath;
  const outputAssetPath = revisionedAssetPath(inputAssetPath);
  const sourcePath = publicPath(inputAssetPath);
  const outputPath = publicPath(outputAssetPath);
  const { data: source, info } = await decodeRgba(sourcePath);
  const mask = buildCorridorMask(
    instance,
    plan,
    info.width,
    info.height,
  );
  const { output, metrics } = clearMaskAlpha(source, mask);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(output, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png({ compressionLevel: 9, palette: false })
    .toFile(outputPath);
  const encoded = await readFile(outputPath);

  return {
    instance: {
      ...instance,
      assetPath: outputAssetPath,
      sourceAssetPath,
      sourceDimensions: [info.width, info.height],
      assetRevision: TARGET_REVISION,
      alphaMaskPolicy: "town-plan-physical-corridors",
      sha256: sha256(encoded),
    },
    report: {
      id: instance.id,
      inputAssetPath,
      sourceAssetPath,
      outputAssetPath,
      ...metrics,
      maskCoverage: metrics.maskPixels / mask.length,
      corridorVisibleBefore: (
        metrics.originallyVisibleMaskPixels / metrics.maskPixels
      ),
      corridorVisibleAfter: 0,
      visibleCoverageBefore: (
        metrics.visiblePixelsBefore / mask.length
      ),
      visibleCoverageAfter: (
        metrics.visiblePixelsAfter / mask.length
      ),
    },
  };
}

async function main() {
  const [fabricManifest, townManifest] = await Promise.all([
    readFile(FABRIC_MANIFEST_PATH, "utf8").then(JSON.parse),
    readFile(TOWN_MANIFEST_PATH, "utf8").then(JSON.parse),
  ]);
  const ownerPlans = plansByOwner(townManifest);
  const results = [];

  for (const instance of fabricManifest.instances) {
    const plan = ownerPlans.get(instance.ownerId);
    if (!plan) {
      throw new TypeError(`${instance.ownerId} has no authored town plan.`);
    }
    results.push(await buildInstance(instance, plan));
  }

  const outputManifest = {
    ...fabricManifest,
    schemaVersion: 2,
    id: `career-world/town-fabric@r${TARGET_REVISION}`,
    status: "phase-9-perspective-safe-fantasy-town-fabric",
    revision: TARGET_REVISION,
    projection: "high-oblique-orthographic",
    renderAspectPolicy: "source-aspect-preserving",
    buildScript: "scripts/build-career-world-town-fabric-corridors.mjs",
    instances: results.map(({ instance }) => instance),
    policy: [
      ...fabricManifest.policy.filter((entry) => (
        !entry.startsWith("Open courtyards")
        && !entry.startsWith("Authoritative physical streets")
      )),
      (
        "Authoritative physical streets, pedestrian loops, plazas, and "
        + "entrance landings alpha-clear the fabric from exact town-plan "
        + "world geometry."
      ),
    ],
  };
  await writeFile(
    FABRIC_MANIFEST_PATH,
    `${JSON.stringify(outputManifest, null, 2)}\n`,
    "utf8",
  );

  for (const { report } of results) {
    console.log(JSON.stringify(report));
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main();
}

export {
  buildCorridorMask,
  clearMaskAlpha,
};
