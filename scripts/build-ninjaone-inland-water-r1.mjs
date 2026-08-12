import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

sharp.cache(false);
sharp.concurrency(1);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUTHORITY_PATH = path.join(
  ROOT,
  "art-source/career-world/ninjaone-environment/production-r2/"
    + "inland-water-r1/ninjaone-inland-water-authority-r1.json",
);
const FIELD_PATH = path.join(
  ROOT,
  "public/career-world/layers/water-surface/fields/"
    + "ninjaone-inland-water-field-r1.png",
);
const DETAIL_PATH = path.join(
  ROOT,
  "public/career-world/layers/water-surface/textures/"
    + "ninjaone-inland-water-detail-r1.png",
);
const RIVERBED_PATH = path.join(
  ROOT,
  "public/career-world/layers/water-surface/textures/"
    + "ninjaone-inland-riverbed-r1.png",
);
const SURFACE_PATH = path.join(
  ROOT,
  "public/career-world/layers/water-surface/textures/"
    + "ninjaone-inland-water-surface-r1.png",
);
const TERRAIN_ERASE_MASK_PATH = path.join(
  ROOT,
  "public/career-world/layers/water-surface/masks/"
    + "ninjaone-inland-terrain-erase-r1.png",
);
const MANIFEST_PATH = path.join(
  ROOT,
  "public/career-world/capitals/ninjaone/environment/manifests/"
    + "inland-water-r1.json",
);
const ARTBOARD_DIMENSIONS = Object.freeze([1440, 1080]);
const FIELD_SCALE = 3;
const FIELD_CROP = Object.freeze([480, 168, 576, 912]);
const FIELD_DIMENSIONS = Object.freeze([
  FIELD_CROP[2] * FIELD_SCALE,
  FIELD_CROP[3] * FIELD_SCALE,
]);
const DETAIL_DIMENSIONS = Object.freeze([512, 512]);
const RIVERBED_DIMENSIONS = Object.freeze([512, 512]);
const SURFACE_DIMENSIONS = Object.freeze([1024, 512]);
const TERRAIN_ERASE_MASK_DIMENSIONS = Object.freeze([
  FIELD_CROP[2],
  FIELD_CROP[3],
]);
const DISTANCE_RANGE = 24;
const EXTERNAL_WATER_ALPHA = 32;
const SUPPORT_ALPHA_BASELINE = 64;
const SUPPORT_ALPHA_RANGE = 191;

const clamp = (value, minimum = 0, maximum = 1) => (
  Math.min(maximum, Math.max(minimum, value))
);

function smoothstep(edge0, edge1, value) {
  const unit = clamp((value - edge0) / Math.max(edge1 - edge0, 1e-6));
  return unit * unit * (3 - 2 * unit);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function integerHash(x, y, seed) {
  let value = Math.imul(x, 0x1f123bb5)
    ^ Math.imul(y, 0x5f356495)
    ^ Math.imul(seed, 0x6c8e9cf5);
  value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
  value = Math.imul(value ^ (value >>> 12), 0x297a2d39);
  return ((value ^ (value >>> 15)) >>> 0) / 0xffffffff;
}

function wrapInteger(value, period) {
  return ((value % period) + period) % period;
}

function periodicValueNoise(unitX, unitY, cells, seed) {
  const scaledX = unitX * cells;
  const scaledY = unitY * cells;
  const x0 = Math.floor(scaledX);
  const y0 = Math.floor(scaledY);
  const localX = scaledX - x0;
  const localY = scaledY - y0;
  const curveX = localX * localX * (3 - 2 * localX);
  const curveY = localY * localY * (3 - 2 * localY);
  const sample = (x, y) => integerHash(
    wrapInteger(x, cells),
    wrapInteger(y, cells),
    seed,
  );
  const top = sample(x0, y0) * (1 - curveX) + sample(x0 + 1, y0) * curveX;
  const bottom = sample(x0, y0 + 1) * (1 - curveX)
    + sample(x0 + 1, y0 + 1) * curveX;
  return top * (1 - curveY) + bottom * curveY;
}

function periodicFractalNoise(unitX, unitY, seed) {
  return periodicValueNoise(unitX, unitY, 3, seed) * 0.46
    + periodicValueNoise(unitX, unitY, 7, seed + 17) * 0.29
    + periodicValueNoise(unitX, unitY, 15, seed + 43) * 0.17
    + periodicValueNoise(unitX, unitY, 31, seed + 89) * 0.08;
}

function periodicPebble(unitX, unitY, cells, seed) {
  const scaledX = unitX * cells;
  const scaledY = unitY * cells;
  const cellX = Math.floor(scaledX);
  const cellY = Math.floor(scaledY);
  let nearest = 4;
  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      const sampleX = cellX + offsetX;
      const sampleY = cellY + offsetY;
      const wrappedX = wrapInteger(sampleX, cells);
      const wrappedY = wrapInteger(sampleY, cells);
      const centerX = sampleX + 0.18 + integerHash(wrappedX, wrappedY, seed) * 0.64;
      const centerY = sampleY + 0.18 + integerHash(wrappedX, wrappedY, seed + 31) * 0.64;
      const axisX = 0.26 + integerHash(wrappedX, wrappedY, seed + 67) * 0.19;
      const axisY = 0.22 + integerHash(wrappedX, wrappedY, seed + 101) * 0.17;
      nearest = Math.min(
        nearest,
        Math.hypot((scaledX - centerX) / axisX, (scaledY - centerY) / axisY),
      );
    }
  }
  const body = 1 - smoothstep(0.62, 1.03, nearest);
  const rim = smoothstep(0.56, 0.82, nearest) * (1 - smoothstep(0.82, 1.08, nearest));
  return clamp(body - rim * 0.24);
}

async function buildDetailTexture() {
  const [width, height] = DETAIL_DIMENSIONS;
  const heights = new Float32Array(width * height);
  const foam = new Float32Array(width * height);
  const pebbles = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      const unitX = x / width;
      const unitY = y / height;
      heights[pixel] = periodicFractalNoise(unitX, unitY, 211);
      foam[pixel] = periodicFractalNoise(unitX, unitY, 907);
      pebbles[pixel] = clamp(
        periodicPebble(unitX, unitY, 28, 431) * 0.68
          + periodicPebble(unitX + 0.173, unitY + 0.291, 17, 619) * 0.32,
      );
    }
  }
  const detail = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      const left = heights[y * width + wrapInteger(x - 1, width)];
      const right = heights[y * width + wrapInteger(x + 1, width)];
      const top = heights[wrapInteger(y - 1, height) * width + x];
      const bottom = heights[wrapInteger(y + 1, height) * width + x];
      const offset = pixel * 4;
      detail[offset] = Math.round(128 + clamp((right - left) * 13.0, -1, 1) * 127);
      detail[offset + 1] = Math.round(128 + clamp((bottom - top) * 13.0, -1, 1) * 127);
      detail[offset + 2] = Math.round(pebbles[pixel] * 255);
      detail[offset + 3] = SUPPORT_ALPHA_BASELINE
        + Math.round(clamp(foam[pixel]) * SUPPORT_ALPHA_RANGE);
    }
  }
  await mkdir(path.dirname(DETAIL_PATH), { recursive: true });
  await sharp(detail, { raw: { channels: 4, height, width } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(DETAIL_PATH);
  const bytes = await readFile(DETAIL_PATH);
  return Object.freeze({
    path: "/career-world/layers/water-surface/textures/ninjaone-inland-water-detail-r1.png",
    dimensions: DETAIL_DIMENSIONS,
    decodedBytes: width * height * 4,
    sha256: sha256(bytes),
    channels: {
      rg: "tileable tangent-space height gradient",
      b: "tileable submerged pebble and bank-rock support",
      a: "tileable foam breakup over the 64..255 data-alpha range",
    },
  });
}

async function buildRiverbedTexture(sourcePath) {
  const [width, height] = RIVERBED_DIMENSIONS;
  await mkdir(path.dirname(RIVERBED_PATH), { recursive: true });
  await sharp(path.join(ROOT, sourcePath))
    .resize(width, height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .modulate({ brightness: 0.92, saturation: 0.82 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(RIVERBED_PATH);
  const bytes = await readFile(RIVERBED_PATH);
  return Object.freeze({
    path: "/career-world/layers/water-surface/textures/ninjaone-inland-riverbed-r1.png",
    dimensions: RIVERBED_DIMENSIONS,
    decodedBytes: width * height * 4,
    sha256: sha256(bytes),
    source: sourcePath,
    wrap: "mirrored repeat",
  });
}

async function buildSurfaceTexture(sourcePath, waterfallSourcePath) {
  const [width, height] = SURFACE_DIMENSIONS;
  const tileWidth = width / 2;
  await mkdir(path.dirname(SURFACE_PATH), { recursive: true });
  const [surfaceTile, waterfallTile] = await Promise.all([
    sharp(path.join(ROOT, sourcePath))
      .resize(tileWidth, height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
      .modulate({ brightness: 0.82, saturation: 0.46 })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer(),
    sharp(path.join(ROOT, waterfallSourcePath))
      .resize(tileWidth, height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
      .modulate({ brightness: 0.84, saturation: 0.58 })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer(),
  ]);
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([
      { input: surfaceTile, left: 0, top: 0 },
      { input: waterfallTile, left: tileWidth, top: 0 },
    ])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(SURFACE_PATH);
  const bytes = await readFile(SURFACE_PATH);
  return Object.freeze({
    path: "/career-world/layers/water-surface/textures/ninjaone-inland-water-surface-r1.png",
    dimensions: SURFACE_DIMENSIONS,
    decodedBytes: width * height * 4,
    sha256: sha256(bytes),
    sources: {
      surface: sourcePath,
      waterfall: waterfallSourcePath,
    },
    atlas: {
      surface: [0, 0, 0.5, 1],
      waterfall: [0.5, 0, 0.5, 1],
    },
    wrap: "mirrored repeat",
  });
}

async function buildTerrainEraseMask(
  mask,
  ownership,
  forceErase,
  fallProgress,
  cascadeImpact,
  width,
  height,
) {
  const [outputWidth, outputHeight] = TERRAIN_ERASE_MASK_DIMENSIONS;
  const erase = Buffer.alloc(outputWidth * outputHeight * 4);
  for (let y = 0; y < outputHeight; y += 1) {
    for (let x = 0; x < outputWidth; x += 1) {
      let coverage = 0;
      let ownershipCoverage = 0;
      let fallProgressCoverage = 0;
      let cascadeImpactCoverage = 0;
      for (let offsetY = 0; offsetY < FIELD_SCALE; offsetY += 1) {
        for (let offsetX = 0; offsetX < FIELD_SCALE; offsetX += 1) {
          const sourcePixel = (y * FIELD_SCALE + offsetY) * width
            + x * FIELD_SCALE + offsetX;
          coverage += mask[sourcePixel] * Math.max(
            ownership[sourcePixel],
            forceErase[sourcePixel],
          );
          ownershipCoverage += ownership[sourcePixel];
          fallProgressCoverage += fallProgress[sourcePixel];
          cascadeImpactCoverage += cascadeImpact[sourcePixel];
        }
      }
      const offset = (y * outputWidth + x) * 4;
      erase[offset] = Math.round(
        ownershipCoverage / (FIELD_SCALE * FIELD_SCALE) * 255,
      );
      erase[offset + 1] = Math.round(
        fallProgressCoverage / (FIELD_SCALE * FIELD_SCALE) * 255,
      );
      erase[offset + 2] = Math.round(
        cascadeImpactCoverage / (FIELD_SCALE * FIELD_SCALE) * 255,
      );
      erase[offset + 3] = Math.round(
        coverage / (FIELD_SCALE * FIELD_SCALE) * 255,
      );
    }
  }
  await mkdir(path.dirname(TERRAIN_ERASE_MASK_PATH), { recursive: true });
  await sharp(erase, {
    raw: { channels: 4, height: outputHeight, width: outputWidth },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(TERRAIN_ERASE_MASK_PATH);
  const bytes = await readFile(TERRAIN_ERASE_MASK_PATH);
  return Object.freeze({
    path: "/career-world/layers/water-surface/masks/ninjaone-inland-terrain-erase-r1.png",
    dimensions: TERRAIN_ERASE_MASK_DIMENSIONS,
    decodedBytes: outputWidth * outputHeight * 4,
    sha256: sha256(bytes),
    artboardCrop: FIELD_CROP,
    channels: {
      r: "inland renderer ownership",
      g: "normalized waterfall progress from crest to impact",
      b: "explicit cascade impact energy for plunge-pool foam and mist",
      a: "terrain erase coverage",
    },
  });
}

async function verifySource(source) {
  const absolutePath = path.join(ROOT, source.path);
  const bytes = await readFile(absolutePath);
  const actual = sha256(bytes);
  if (actual !== source.sha256) {
    throw new Error(`${source.path} hash ${actual} does not match ${source.sha256}.`);
  }
  return Object.freeze({ ...source, sha256: actual });
}

function waterStrength(red, green, blue, alpha) {
  const transparent = 1 - smoothstep(12, 96, alpha);
  const coolDark = Math.min(
    smoothstep(2, 22, blue - red),
    smoothstep(-1, 15, green - red),
    smoothstep(26, 82, blue),
  );
  const coolBright = Math.min(
    smoothstep(-2, 14, blue - red),
    smoothstep(-5, 12, green - red),
    smoothstep(78, 170, blue),
  );
  return Math.max(
    transparent,
    Math.max(coolDark, coolBright) * smoothstep(24, 170, alpha),
  );
}

function foamStrength(red, green, blue, alpha) {
  if (alpha < 24) return 0;
  const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
  const neutral = Math.min(
    smoothstep(-10, 8, blue - red),
    smoothstep(-14, 4, green - red),
  );
  return smoothstep(105, 210, luminance) * neutral;
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let current = 0, previous = points.length - 1; current < points.length; previous = current++) {
    const [currentX, currentY] = points[current];
    const [previousX, previousY] = points[previous];
    if (
      (currentY > y) !== (previousY > y)
      && x < (previousX - currentX) * (y - currentY)
        / (previousY - currentY) + currentX
    ) inside = !inside;
  }
  return inside;
}

function nearestPathSample(x, y, points) {
  let best = null;
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const deltaX = end[0] - start[0];
    const deltaY = end[1] - start[1];
    const lengthSquared = deltaX * deltaX + deltaY * deltaY;
    const unit = lengthSquared > 0
      ? clamp(((x - start[0]) * deltaX + (y - start[1]) * deltaY) / lengthSquared)
      : 0;
    const nearestX = start[0] + deltaX * unit;
    const nearestY = start[1] + deltaY * unit;
    const distance = Math.hypot(x - nearestX, y - nearestY);
    if (!best || distance < best.distance) {
      const length = Math.max(Math.hypot(deltaX, deltaY), 1e-6);
      best = { distance, flow: [deltaX / length, deltaY / length] };
    }
  }
  return best;
}

function segmentSample(segment, x, y, sourceWater, authoredWaterVoid) {
  if (segment.polygon) {
    const sourceSupported = segment.kind === "fall" || sourceWater >= 0.035;
    return pointInPolygon(x, y, segment.polygon) && sourceSupported
      ? { flow: segment.flow, inlandOwnership: 1, inside: true }
      : null;
  }
  const nearest = nearestPathSample(x, y, segment.points);
  if (!nearest) return null;
  const coreScale = segment.kind === "fall"
    ? 0.52
    : segment.kind === "rapid"
      ? 0.36
      : segment.oceanHandoff
        ? 0.64
        : 0.28;
  const coreRadius = segment.radius * coreScale;
  const observedRadius = segment.radius * (
    segment.kind === "fall" ? 0.82 : 1.35
  );
  const boundaryNoise = (
    Math.sin(x * 0.173 + y * 0.119 + segment.priority) * 0.5 + 0.5
  ) * 2.2 - 1.1;
  const handoffDelta = segment.oceanHandoff
    ? [
      x - segment.oceanHandoff.point[0],
      y - segment.oceanHandoff.point[1],
    ]
    : [0, 0];
  const handoffAlong = segment.oceanHandoff
    ? handoffDelta[0] * segment.oceanHandoff.direction[0]
      + handoffDelta[1] * segment.oceanHandoff.direction[1]
      + boundaryNoise * 4.5
    : 0;
  const inlandOwnership = segment.oceanHandoff
    ? smoothstep(2, segment.oceanHandoff.length, handoffAlong)
    : 1;
  const supportedRadius = segment.oceanHandoff
    ? segment.radius * (2.35 + inlandOwnership * 0.20)
    : observedRadius;
  const inside = segment.oceanHandoff
    ? nearest.distance <= coreRadius + boundaryNoise * 0.35
      || (
        nearest.distance <= supportedRadius + boundaryNoise
        && (authoredWaterVoid || sourceWater >= 0.04)
      )
    : nearest.distance <= coreRadius + boundaryNoise
      || (
        nearest.distance <= supportedRadius + boundaryNoise
        && sourceWater >= 0.04
      );
  if (!inside) return null;
  return { flow: nearest.flow, inlandOwnership, inside };
}

function fallProgressForSegment(segment, x, y) {
  if (segment.kind !== "fall") return 0;
  const flow = segment.flow ?? nearestPathSample(x, y, segment.points)?.flow;
  if (!flow) return 0;
  const vertices = segment.polygon ?? segment.points;
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (const vertex of vertices) {
    const projection = vertex[0] * flow[0] + vertex[1] * flow[1];
    minimum = Math.min(minimum, projection);
    maximum = Math.max(maximum, projection);
  }
  const projection = x * flow[0] + y * flow[1];
  return clamp((projection - minimum) / Math.max(maximum - minimum, 1e-6));
}

function closeOnePixel(mask, width, height) {
  const dilated = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      if (mask[pixel]) {
        dilated[pixel] = 1;
        continue;
      }
      for (let offsetY = -1; offsetY <= 1 && !dilated[pixel]; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const sampleX = x + offsetX;
          const sampleY = y + offsetY;
          if (
            sampleX >= 0 && sampleX < width
            && sampleY >= 0 && sampleY < height
            && mask[sampleY * width + sampleX]
          ) {
            dilated[pixel] = 1;
            break;
          }
        }
      }
    }
  }
  const closed = new Uint8Array(mask.length);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const pixel = y * width + x;
      let keep = 1;
      for (let offsetY = -1; offsetY <= 1 && keep; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (!dilated[(y + offsetY) * width + x + offsetX]) {
            keep = 0;
            break;
          }
        }
      }
      closed[pixel] = keep;
    }
  }
  return closed;
}

function dilateOnePixel(mask, width, height) {
  const dilated = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      for (let offsetY = -1; offsetY <= 1 && !dilated[pixel]; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const sampleX = x + offsetX;
          const sampleY = y + offsetY;
          if (
            sampleX >= 0 && sampleX < width
            && sampleY >= 0 && sampleY < height
            && mask[sampleY * width + sampleX]
          ) {
            dilated[pixel] = 1;
            break;
          }
        }
      }
    }
  }
  return dilated;
}

function erodeOnePixel(mask, width, height) {
  const eroded = new Uint8Array(mask.length);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const pixel = y * width + x;
      let keep = 1;
      for (let offsetY = -1; offsetY <= 1 && keep; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (!mask[(y + offsetY) * width + x + offsetX]) {
            keep = 0;
            break;
          }
        }
      }
      eroded[pixel] = keep;
    }
  }
  return eroded;
}

function closeRadius(mask, width, height, radius) {
  const dilationDistance = chamferDistance(mask, width, height);
  const dilated = Uint8Array.from(
    dilationDistance,
    (distance) => (distance <= radius * 3 ? 1 : 0),
  );
  const dilatedLand = Uint8Array.from(dilated, (value) => (value ? 0 : 1));
  const erosionDistance = chamferDistance(dilatedLand, width, height);
  return Uint8Array.from(
    dilated,
    (value, pixel) => (value && erosionDistance[pixel] > radius * 3 ? 1 : 0),
  );
}

function openRadius(mask, width, height, radius) {
  const land = Uint8Array.from(mask, (value) => (value ? 0 : 1));
  const erosionDistance = chamferDistance(land, width, height);
  const eroded = Uint8Array.from(
    mask,
    (value, pixel) => (value && erosionDistance[pixel] > radius * 3 ? 1 : 0),
  );
  const dilationDistance = chamferDistance(eroded, width, height);
  return Uint8Array.from(
    dilationDistance,
    (distance) => (distance <= radius * 3 ? 1 : 0),
  );
}

function chamferDistance(feature, width, height) {
  const distance = new Uint16Array(feature.length);
  distance.fill(0xffff);
  for (let pixel = 0; pixel < feature.length; pixel += 1) {
    if (feature[pixel]) distance[pixel] = 0;
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      let nearest = distance[pixel];
      if (x > 0) nearest = Math.min(nearest, distance[pixel - 1] + 3);
      if (y > 0) nearest = Math.min(nearest, distance[pixel - width] + 3);
      if (x > 0 && y > 0) nearest = Math.min(nearest, distance[pixel - width - 1] + 4);
      if (x + 1 < width && y > 0) nearest = Math.min(nearest, distance[pixel - width + 1] + 4);
      distance[pixel] = nearest;
    }
  }
  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = width - 1; x >= 0; x -= 1) {
      const pixel = y * width + x;
      let nearest = distance[pixel];
      if (x + 1 < width) nearest = Math.min(nearest, distance[pixel + 1] + 3);
      if (y + 1 < height) nearest = Math.min(nearest, distance[pixel + width] + 3);
      if (x + 1 < width && y + 1 < height) nearest = Math.min(nearest, distance[pixel + width + 1] + 4);
      if (x > 0 && y + 1 < height) nearest = Math.min(nearest, distance[pixel + width - 1] + 4);
      distance[pixel] = nearest;
    }
  }
  return distance;
}

function obstacleSupport(obstacle, x, y) {
  const direction = obstacle.flowDirection;
  const cross = [-direction[1], direction[0]];
  const delta = [x - obstacle.center[0], y - obstacle.center[1]];
  const along = delta[0] * direction[0] + delta[1] * direction[1];
  const across = Math.abs(delta[0] * cross[0] + delta[1] * cross[1]);
  const progress = clamp(along / obstacle.wakeExtent);
  const halfWidth = obstacle.radius * 0.5 + obstacle.wakeWidth * progress;
  const wake = smoothstep(obstacle.radius * 0.2, obstacle.radius * 0.8, along)
    * (1 - smoothstep(obstacle.wakeExtent * 0.72, obstacle.wakeExtent, along))
    * (1 - smoothstep(halfWidth * 0.35, halfWidth, across));
  const bow = (1 - smoothstep(obstacle.radius, obstacle.radius * 2.2, across))
    * smoothstep(-obstacle.radius * 2, -obstacle.radius * 0.2, along)
    * (1 - smoothstep(-obstacle.radius * 0.2, obstacle.radius, along));
  return Math.max(wake * 0.48, bow) * obstacle.intensity;
}

function cascadeImpactSupport(cascade, x, y) {
  const direction = cascade.direction;
  const cross = [-direction[1], direction[0]];
  const delta = [x - cascade.impact[0], y - cascade.impact[1]];
  const along = delta[0] * direction[0] + delta[1] * direction[1];
  const across = delta[0] * cross[0] + delta[1] * cross[1];
  const radius = cascade.mistRadius;
  const plungeEllipse = Math.hypot(
    across / Math.max(radius * 1.24, 1),
    (along + radius * 0.04) / Math.max(radius * 0.68, 1),
  );
  const impactCore = 1 - smoothstep(0.05, 0.34, plungeEllipse);
  const impactRing = smoothstep(0.10, 0.28, plungeEllipse)
    * (1 - smoothstep(0.48, 0.92, plungeEllipse));
  const downstreamTail = smoothstep(-radius * 0.10, radius * 0.18, along)
    * (1 - smoothstep(radius * 0.82, radius * 1.55, along))
    * (1 - smoothstep(radius * 0.28, radius * 0.90, Math.abs(across)));
  const breakup = (
    Math.sin(x * 0.91 + y * 0.57 + cascade.impact[0])
      * Math.sin(x * 0.37 - y * 1.13 + cascade.impact[1])
  ) * 0.5 + 0.5;
  return clamp(
    impactCore * 0.96
      + impactRing * (0.38 + breakup * 0.34)
      + downstreamTail * (0.24 + breakup * 0.22),
  );
}

export async function buildNinjaOneInlandWaterR1() {
  const authority = JSON.parse(await readFile(AUTHORITY_PATH, "utf8"));
  const verifiedSources = Object.fromEntries(await Promise.all(
    Object.entries(authority.sources).map(async ([id, source]) => [id, await verifySource(source)]),
  ));
  const [width, height] = FIELD_DIMENSIONS;
  const terrain = await sharp(path.join(ROOT, authority.sources.terrainMaster.path))
    .extract({
      left: FIELD_CROP[0] * 4,
      top: FIELD_CROP[1] * 4,
      width: FIELD_CROP[2] * 4,
      height: FIELD_CROP[3] * 4,
    })
    .resize(width, height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer();
  const mask = new Uint8Array(width * height);
  const sourceWaterField = new Float32Array(mask.length);
  const lakeZone = new Uint8Array(mask.length);
  const lakeSegment = authority.segments.find((segment) => segment.kind === "lake");
  if (!lakeSegment?.polygon) {
    throw new Error("Inland-water authority requires one polygonal lake segment.");
  }
  const ownerPriority = new Uint8Array(mask.length);
  const terrainEraseEligible = new Uint8Array(mask.length);
  const flowX = new Float32Array(mask.length);
  const flowY = new Float32Array(mask.length);
  const inlandOwnership = new Float32Array(mask.length);
  const fallProgress = new Float32Array(mask.length);
  const cascadeImpact = new Float32Array(mask.length);
  const whitewater = new Float32Array(mask.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      const offset = pixel * 4;
      const sampleX = FIELD_CROP[0] + (x + 0.5) / FIELD_SCALE;
      const sampleY = FIELD_CROP[1] + (y + 0.5) / FIELD_SCALE;
      const sourceWater = waterStrength(
        terrain[offset], terrain[offset + 1], terrain[offset + 2], terrain[offset + 3],
      );
      const authoredWaterVoid = terrain[offset + 3] < 96;
      sourceWaterField[pixel] = sourceWater;
      lakeZone[pixel] = pointInPolygon(sampleX, sampleY, lakeSegment.polygon) ? 1 : 0;
      for (const segment of authority.segments) {
        const sample = segmentSample(
          segment,
          sampleX,
          sampleY,
          sourceWater,
          authoredWaterVoid,
        );
        if (!sample || segment.priority < ownerPriority[pixel]) continue;
        mask[pixel] = 1;
        ownerPriority[pixel] = segment.priority;
        terrainEraseEligible[pixel] = segment.kind === "fall" ? 0 : 1;
        flowX[pixel] = sample.flow[0] * segment.speed;
        flowY[pixel] = sample.flow[1] * segment.speed;
        inlandOwnership[pixel] = sample.inlandOwnership;
        fallProgress[pixel] = fallProgressForSegment(segment, sampleX, sampleY);
        whitewater[pixel] = Math.max(
          segment.whitewater,
          foamStrength(
            terrain[offset], terrain[offset + 1], terrain[offset + 2], terrain[offset + 3],
          ) * (segment.kind === "fall" ? 0.20 : 0.22),
        );
      }
    }
  }

  const closedMask = closeOnePixel(mask, width, height);
  const lakeSeed = Uint8Array.from(mask, (value, pixel) => (
    value && lakeZone[pixel] ? 1 : 0
  ));
  const openedLake = openRadius(lakeSeed, width, height, 6);
  const closedLake = closeRadius(openedLake, width, height, 18);
  for (let pixel = 0; pixel < closedMask.length; pixel += 1) {
    if (lakeZone[pixel] && closedLake[pixel]) {
      closedMask[pixel] = 1;
      terrainEraseEligible[pixel] = 1;
    }
  }
  const terrainEraseFeature = closeOnePixel(
    terrainEraseEligible,
    width,
    height,
  );
  for (let pixel = 0; pixel < terrainEraseFeature.length; pixel += 1) {
    if (!closedMask[pixel]) terrainEraseFeature[pixel] = 0;
  }
  for (const obstacle of authority.obstacles) {
    if (obstacle.carve === false) continue;
    const left = Math.max(0, Math.floor(
      (obstacle.center[0] - obstacle.radius - 2 - FIELD_CROP[0]) * FIELD_SCALE,
    ));
    const right = Math.min(width, Math.ceil(
      (obstacle.center[0] + obstacle.radius + 2 - FIELD_CROP[0]) * FIELD_SCALE,
    ));
    const top = Math.max(0, Math.floor(
      (obstacle.center[1] - obstacle.radius - 2 - FIELD_CROP[1]) * FIELD_SCALE,
    ));
    const bottom = Math.min(height, Math.ceil(
      (obstacle.center[1] + obstacle.radius + 2 - FIELD_CROP[1]) * FIELD_SCALE,
    ));
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const sampleX = FIELD_CROP[0] + (x + 0.5) / FIELD_SCALE;
        const sampleY = FIELD_CROP[1] + (y + 0.5) / FIELD_SCALE;
        if (Math.hypot(sampleX - obstacle.center[0], sampleY - obstacle.center[1]) <= obstacle.radius) {
          const pixel = y * width + x;
          closedMask[pixel] = 0;
          terrainEraseFeature[pixel] = 0;
        }
      }
    }
  }

  const terrainEraseOnly = new Uint8Array(closedMask.length);
  for (const patch of authority.terrainErasePatches ?? []) {
    const left = Math.max(0, Math.floor(
      (patch.center[0] - patch.radius[0] - FIELD_CROP[0]) * FIELD_SCALE,
    ));
    const right = Math.min(width, Math.ceil(
      (patch.center[0] + patch.radius[0] - FIELD_CROP[0]) * FIELD_SCALE,
    ));
    const top = Math.max(0, Math.floor(
      (patch.center[1] - patch.radius[1] - FIELD_CROP[1]) * FIELD_SCALE,
    ));
    const bottom = Math.min(height, Math.ceil(
      (patch.center[1] + patch.radius[1] - FIELD_CROP[1]) * FIELD_SCALE,
    ));
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const sampleX = FIELD_CROP[0] + (x + 0.5) / FIELD_SCALE;
        const sampleY = FIELD_CROP[1] + (y + 0.5) / FIELD_SCALE;
        const ellipse = Math.hypot(
          (sampleX - patch.center[0]) / patch.radius[0],
          (sampleY - patch.center[1]) / patch.radius[1],
        );
        if (ellipse > 1) continue;
        const pixel = y * width + x;
        if (!closedMask[pixel]) terrainEraseOnly[pixel] = 1;
        closedMask[pixel] = 1;
        terrainEraseFeature[pixel] = 1;
      }
    }
  }

  const waterFeature = closedMask;
  const landFeature = Uint8Array.from(closedMask, (value) => (value ? 0 : 1));
  const distanceToWater = chamferDistance(waterFeature, width, height);
  const distanceToLand = chamferDistance(landFeature, width, height);
  const field = Buffer.alloc(width * height * 4);
  const renderOwnership = new Float32Array(closedMask.length);
  let occupiedPixels = 0;
  let flowSumX = 0;
  let flowSumY = 0;
  let cascadeImpactPixels = 0;
  let maximumCascadeImpact = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      const offset = pixel * 4;
      const sampleX = FIELD_CROP[0] + (x + 0.5) / FIELD_SCALE;
      const sampleY = FIELD_CROP[1] + (y + 0.5) / FIELD_SCALE;
      const inside = closedMask[pixel] > 0;
      const signedDistance = (
        inside ? distanceToLand[pixel] : -distanceToWater[pixel]
      ) / (3 * FIELD_SCALE);
      field[offset] = Math.round(128 + clamp(signedDistance / DISTANCE_RANGE, -1, 1) * 127);
      let localCascadeImpact = 0;
      for (const cascade of authority.cascades) {
        localCascadeImpact = Math.max(
          localCascadeImpact,
          cascadeImpactSupport(cascade, sampleX, sampleY),
        );
      }
      cascadeImpact[pixel] = localCascadeImpact;
      if (localCascadeImpact >= 0.05) cascadeImpactPixels += 1;
      maximumCascadeImpact = Math.max(
        maximumCascadeImpact,
        localCascadeImpact,
      );
      if (!inside) {
        field[offset + 3] = localCascadeImpact > 0.002
          ? SUPPORT_ALPHA_BASELINE
            + Math.round(clamp(localCascadeImpact * 0.42) * SUPPORT_ALPHA_RANGE)
          : sourceWaterField[pixel] >= 0.08
            ? EXTERNAL_WATER_ALPHA
            : SUPPORT_ALPHA_BASELINE;
        continue;
      }
      if (terrainEraseOnly[pixel]) {
        field[offset + 1] = Math.round(128 + 0.03 * 127);
        field[offset + 2] = Math.round(128 + 0.21 * 127);
        field[offset + 3] = EXTERNAL_WATER_ALPHA;
        continue;
      }
      occupiedPixels += 1;
      let localFlowX = flowX[pixel];
      let localFlowY = flowY[pixel];
      if (Math.hypot(localFlowX, localFlowY) < 0.005) {
        for (let radius = 1; radius <= 6 && Math.hypot(localFlowX, localFlowY) < 0.005; radius += 1) {
          const sampleX = clamp(x, radius, width - radius - 1);
          const sampleY = clamp(y, radius, height - radius - 1);
          for (const [deltaX, deltaY] of [[-radius, 0], [radius, 0], [0, -radius], [0, radius]]) {
            const neighbor = (sampleY + deltaY) * width + sampleX + deltaX;
            if (closedMask[neighbor]) {
              localFlowX = flowX[neighbor];
              localFlowY = flowY[neighbor];
              whitewater[pixel] = Math.max(whitewater[pixel], whitewater[neighbor]);
              break;
            }
          }
        }
      }
      for (const obstacle of authority.obstacles) {
        whitewater[pixel] = Math.max(
          whitewater[pixel],
          obstacleSupport(obstacle, sampleX, sampleY),
        );
      }
      whitewater[pixel] = Math.max(
        whitewater[pixel],
        localCascadeImpact * 0.72,
      );
      flowSumX += localFlowX;
      flowSumY += localFlowY;
      field[offset + 1] = Math.round(128 + clamp(localFlowX, -1, 1) * 127);
      field[offset + 2] = Math.round(128 + clamp(localFlowY, -1, 1) * 127);
      const ownership = ownerPriority[pixel] > 0 ? inlandOwnership[pixel] : 1;
      renderOwnership[pixel] = ownership;
      field[offset + 3] = Math.round(
        EXTERNAL_WATER_ALPHA
          + (SUPPORT_ALPHA_BASELINE - EXTERNAL_WATER_ALPHA) * ownership
          + clamp(whitewater[pixel]) * SUPPORT_ALPHA_RANGE * ownership,
      );
    }
  }

  await mkdir(path.dirname(FIELD_PATH), { recursive: true });
  await sharp(field, { raw: { channels: 4, height, width } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(FIELD_PATH);
  const fieldBytes = await readFile(FIELD_PATH);
  const [detail, riverbed, surface, terrainEraseMask] = await Promise.all([
    buildDetailTexture(),
    buildRiverbedTexture(authority.sources.riverbed.path),
    buildSurfaceTexture(
      authority.sources.surface.path,
      authority.sources.waterfall.path,
    ),
    buildTerrainEraseMask(
      terrainEraseFeature,
      renderOwnership,
      terrainEraseOnly,
      fallProgress,
      cascadeImpact,
      width,
      height,
    ),
  ]);
  const manifest = {
    schemaVersion: 1,
    id: "career-world/capitals/ninjaone/inland-water@r1",
    status: "production-runtime",
    authorityId: authority.id,
    registration: authority.registration,
    field: {
      path: "/career-world/layers/water-surface/fields/ninjaone-inland-water-field-r1.png",
      dimensions: FIELD_DIMENSIONS,
      artboardCrop: FIELD_CROP,
      artboardDimensions: ARTBOARD_DIMENSIONS,
      artboardScale: FIELD_SCALE,
      decodedBytes: width * height * 4,
      sha256: sha256(fieldBytes),
      channels: {
        r: `signed bank distance over +/-${DISTANCE_RANGE} artboard pixels; 0.5 is the water edge`,
        g: "downstream velocity x encoded as 0.5 + value * 0.5",
        b: "downstream velocity y encoded as 0.5 + value * 0.5",
        a: "32 marks external source water, 64 marks neutral land, and 64..255 encodes whitewater inside water or waterfall mist outside water",
      },
    },
    detail,
    riverbed,
    surface,
    terrainEraseMask,
    sources: verifiedSources,
    segments: authority.segments,
    cascades: authority.cascades,
    terrainErasePatches: authority.terrainErasePatches ?? [],
    obstacles: authority.obstacles,
    metrics: {
      occupiedPixels,
      cascadeImpactPixels,
      maximumCascadeImpact,
      meanFlowVector: [flowSumX / occupiedPixels, flowSumY / occupiedPixels],
      maximumDecodedBytes: width * height * 4
        + detail.decodedBytes
        + riverbed.decodedBytes
        + surface.decodedBytes
        + terrainEraseMask.decodedBytes,
    },
    policy: authority.policy,
  };
  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await buildNinjaOneInlandWaterR1();
  process.stdout.write(`${JSON.stringify({
    decodedBytes: manifest.field.decodedBytes,
    detailSha256: manifest.detail.sha256,
    fieldSha256: manifest.field.sha256,
    riverbedSha256: manifest.riverbed.sha256,
    surfaceSha256: manifest.surface.sha256,
    terrainEraseMaskSha256: manifest.terrainEraseMask.sha256,
    meanFlowVector: manifest.metrics.meanFlowVector,
    occupiedPixels: manifest.metrics.occupiedPixels,
  }, null, 2)}\n`);
}
