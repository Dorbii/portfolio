import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const CHECK_ONLY = process.argv.includes("--check");
const root = (relative) => path.join(ROOT, relative);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
const indexFor = (x, y, width) => y * width + x;
const output = Object.freeze({
  canon: "public/career-world/capitals/ninjaone/city-v2/canon",
  qa: ".codex-tmp/qa/T23/r2",
});
const source = Object.freeze({
  canon: "public/career-world/capitals/ninjaone/city-v2/canon/d05-canon-capital-r4.png",
  usableMask: "public/career-world/capitals/ninjaone/city-v2/plates/d05-anchor-cover-usable-mask-r4.png",
  registration: "public/career-world/capitals/ninjaone/city-v2/plates/d05-anchor-cover-registration-r4.json",
});
const files = Object.freeze({
  sparkleMask: "d05-canon-water-sparkle-mask-r5.png",
  sparklePhaseField: "d05-canon-water-sparkle-phase-r5.png",
  foamMask: "d05-canon-water-foam-mask-r5.png",
  shoreSdf: "d05-canon-water-shore-sdf-r5.png",
  waterMask: "d05-canon-water-safe-mask-r5.png",
  crestMask: "d05-canon-water-crest-mask-r5.png",
  directionField: "d05-canon-water-direction-field-r5.png",
  wavePhaseField: "d05-canon-water-wave-phase-r5.png",
  pseudoNormalField: "d05-canon-water-pseudo-normal-r5.png",
  rampLut: "d05-canon-water-ramp-lut-r5.png",
  manifest: "d05-canon-water-effects-r5.json",
  runtime: "d05-canon-water-effects-runtime-r5.json",
});
const STANDOFF_RAW_PIXELS = 7;

function hsv(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === r) hue = 60 * (((g - b) / delta + 6) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  return { hue, saturation: max ? delta / max : 0, value: max / 255 };
}

function dilate(input, width, height, radius) {
  const result = new Uint8Array(input.length);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    for (let yy = Math.max(0, y - radius); yy <= Math.min(height - 1, y + radius); yy += 1) {
      let hit = false;
      for (let xx = Math.max(0, x - radius); xx <= Math.min(width - 1, x + radius); xx += 1) {
        if (input[indexFor(xx, yy, width)]) { hit = true; break; }
      }
      if (hit) { result[indexFor(x, y, width)] = 1; break; }
    }
  }
  return result;
}

function components(input, width, height) {
  const seen = new Uint8Array(input.length);
  const queue = new Int32Array(input.length);
  const output = [];
  for (let start = 0; start < input.length; start += 1) {
    if (!input[start] || seen[start]) continue;
    let head = 0, tail = 0, left = width, top = height, right = 0, bottom = 0, count = 0, sumX = 0, sumY = 0;
    queue[tail++] = start;
    seen[start] = 1;
    while (head < tail) {
      const pixel = queue[head++];
      const x = pixel % width, y = Math.floor(pixel / width);
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
      count += 1; sumX += x; sumY += y;
      for (let yy = Math.max(0, y - 1); yy <= Math.min(height - 1, y + 1); yy += 1) for (let xx = Math.max(0, x - 1); xx <= Math.min(width - 1, x + 1); xx += 1) {
        const next = indexFor(xx, yy, width);
        if (input[next] && !seen[next]) { seen[next] = 1; queue[tail++] = next; }
      }
    }
    output.push({ left, top, right, bottom, count, centroid: [sumX / count, sumY / count] });
  }
  return output;
}

function localMean(values, width, height, radius) {
  const result = new Float32Array(values.length);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    let total = 0, count = 0;
    for (let yy = Math.max(0, y - radius); yy <= Math.min(height - 1, y + radius); yy += 1) for (let xx = Math.max(0, x - radius); xx <= Math.min(width - 1, x + radius); xx += 1) {
      total += values[indexFor(xx, yy, width)]; count += 1;
    }
    result[indexFor(x, y, width)] = total / count;
  }
  return result;
}

function hashUnit(x, y, salt = 0) {
  let seed = ((Math.round(x) * 73856093) ^ (Math.round(y) * 19349663) ^ (salt * 83492791)) >>> 0;
  seed = Math.imul(seed ^ (seed >>> 16), 2246822519) >>> 0;
  seed = Math.imul(seed ^ (seed >>> 13), 3266489917) >>> 0;
  return ((seed ^ (seed >>> 16)) >>> 0) / 4294967296;
}

function phaseFor(x, y) {
  return {
    dutyCycle: Number((0.3 + hashUnit(x, y, 3) * 0.2).toFixed(4)),
    offset: Number(hashUnit(x, y, 1).toFixed(6)),
    periodSeconds: Number((1.13 + hashUnit(x, y, 2) * 2.71).toFixed(6)),
  };
}

function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function distanceToMask(mask, width, height) {
  const infinity = 1e9;
  const distance = new Float64Array(mask.length);
  for (let pixel = 0; pixel < mask.length; pixel += 1) distance[pixel] = mask[pixel] ? 0 : infinity;
  const diagonal = Math.SQRT2;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const pixel = indexFor(x, y, width);
    let value = distance[pixel];
    if (x) value = Math.min(value, distance[pixel - 1] + 1);
    if (y) value = Math.min(value, distance[pixel - width] + 1);
    if (x && y) value = Math.min(value, distance[pixel - width - 1] + diagonal);
    if (x + 1 < width && y) value = Math.min(value, distance[pixel - width + 1] + diagonal);
    distance[pixel] = value;
  }
  for (let y = height - 1; y >= 0; y -= 1) for (let x = width - 1; x >= 0; x -= 1) {
    const pixel = indexFor(x, y, width);
    let value = distance[pixel];
    if (x + 1 < width) value = Math.min(value, distance[pixel + 1] + 1);
    if (y + 1 < height) value = Math.min(value, distance[pixel + width] + 1);
    if (x + 1 < width && y + 1 < height) value = Math.min(value, distance[pixel + width + 1] + diagonal);
    if (x && y + 1 < height) value = Math.min(value, distance[pixel + width - 1] + diagonal);
    distance[pixel] = value;
  }
  return distance;
}

async function png(bytes, width, height, channels) {
  const image = sharp(Buffer.from(bytes), { raw: { width, height, channels } });
  if (channels === 1) image.toColourspace("b-w");
  return image.png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
}

async function emit(relative, bytes) {
  const destination = root(relative);
  if (CHECK_ONLY) {
    assert.deepEqual(await readFile(destination), bytes, `--check output differs: ${relative}`);
    return;
  }
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
}

function canonicalOutput(name) { return `${output.canon}/${name}`; }
function qaOutput(name) { return `${output.qa}/${name}`; }

async function main() {
  const [{ data: rgb, info: imageInfo }, { data: usable, info: usableInfo }, registrationBytes] = await Promise.all([
    sharp(root(source.canon)).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(root(source.usableMask)).greyscale().raw().toBuffer({ resolveWithObject: true }),
    readFile(root(source.registration)),
  ]);
  const { width, height } = imageInfo;
  assert.deepEqual([width, height, imageInfo.channels], [1305, 1205, 3], "mounted capital canon dimensions changed");
  assert.deepEqual([usableInfo.width, usableInfo.height, usableInfo.channels], [width, height, 1], "usable mask must align with capital canon");
  const length = width * height;
  const hue = new Float32Array(length), saturation = new Float32Array(length), luma = new Float32Array(length);
  const waterCore = new Uint8Array(length);
  for (let pixel = 0; pixel < length; pixel += 1) {
    const offset = pixel * 3;
    const color = hsv(rgb[offset], rgb[offset + 1], rgb[offset + 2]);
    hue[pixel] = color.hue; saturation[pixel] = color.saturation;
    luma[pixel] = (0.2126 * rgb[offset] + 0.7152 * rgb[offset + 1] + 0.0722 * rgb[offset + 2]) / 255;
    waterCore[pixel] = usable[pixel] > 0 && color.hue >= 155 && color.hue <= 255 && color.saturation >= 0.18 && rgb[offset + 2] >= rgb[offset] * 0.85 ? 1 : 0;
  }
  const waterNearby = dilate(waterCore, width, height, 5);
  const waterRegion = new Uint8Array(length);
  for (let pixel = 0; pixel < length; pixel += 1) {
    const offset = pixel * 3;
    const paleBlue = hue[pixel] >= 140 && hue[pixel] <= 260 && saturation[pixel] >= 0.07 && rgb[offset + 2] >= rgb[offset] * 0.84;
    const paleContact = luma[pixel] >= 0.48 && saturation[pixel] <= 0.38;
    waterRegion[pixel] = usable[pixel] > 0 && (waterCore[pixel] || (waterNearby[pixel] && (paleBlue || paleContact))) ? 1 : 0;
  }
  const land = new Uint8Array(length);
  for (let pixel = 0; pixel < length; pixel += 1) land[pixel] = usable[pixel] > 0 && !waterRegion[pixel] ? 1 : 0;
  const landBuffer = dilate(land, width, height, STANDOFF_RAW_PIXELS);
  const waterSafe = new Uint8Array(length);
  for (let pixel = 0; pixel < length; pixel += 1) waterSafe[pixel] = waterRegion[pixel] && !landBuffer[pixel] && usable[pixel] > 0 ? 1 : 0;

  // Stroke tangent plus coarse spatial noise is the shared, time-independent
  // phase coordinate consumed by every moving layer at runtime.
  const blurredLuma = localMean(luma, width, height, 3);
  const meanLuma = localMean(luma, width, height, 4);
  const gradient = new Float32Array(length);
  const tangentX = new Float32Array(length), tangentY = new Float32Array(length);
  for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) {
    const pixel = indexFor(x, y, width);
    const gx = blurredLuma[pixel + 1] - blurredLuma[pixel - 1];
    const gy = blurredLuma[pixel + width] - blurredLuma[pixel - width];
    const strength = Math.hypot(gx, gy);
    gradient[pixel] = strength;
    if (strength > 0) {
      let tx = -gy / strength, ty = gx / strength;
      if (tx < 0) { tx *= -1; ty *= -1; }
      tangentX[pixel] = tx; tangentY[pixel] = ty;
    }
  }

  const sparkleCandidate = new Uint8Array(length);
  for (let pixel = 0; pixel < length; pixel += 1) {
    sparkleCandidate[pixel] = waterSafe[pixel] && luma[pixel] >= 0.58 && luma[pixel] - meanLuma[pixel] >= 0.12 && gradient[pixel] >= 0.04 ? 1 : 0;
  }
  const sparkleComponents = components(sparkleCandidate, width, height)
    .filter((component) => component.count >= 2 && component.count <= 96 && component.right - component.left <= 32 && component.bottom - component.top <= 32)
    .sort((a, b) => a.top - b.top || a.left - b.left);
  assert.ok(sparkleComponents.length > 0, "water derivation found no sparkle glints");
  const sparkleMask = new Uint8Array(length);
  const sparklePhaseField = new Uint8Array(length * 3);
  const sparkleOwner = new Int32Array(length).fill(-1);
  for (let id = 0; id < sparkleComponents.length; id += 1) {
    const component = sparkleComponents[id];
    for (let y = component.top; y < component.bottom; y += 1) for (let x = component.left; x < component.right; x += 1) {
      const pixel = indexFor(x, y, width);
      if (sparkleCandidate[pixel]) { sparkleMask[pixel] = 255; sparkleOwner[pixel] = id; }
    }
  }
  const glints = sparkleComponents.map((component, index) => {
    const [x, y] = component.centroid;
    return { id: `glint-${String(index + 1).padStart(3, "0")}`, centroid: [Number(x.toFixed(3)), Number(y.toFixed(3))], bbox: [component.left, component.top, component.right, component.bottom], pixels: component.count, ...phaseFor(x, y) };
  });
  for (let pixel = 0; pixel < length; pixel += 1) {
    const owner = sparkleOwner[pixel];
    if (owner < 0) continue;
    const glint = glints[owner];
    sparklePhaseField[pixel * 3] = clamp(glint.offset * 255);
    sparklePhaseField[pixel * 3 + 1] = clamp(((glint.periodSeconds - 1.13) / 2.71) * 255);
    sparklePhaseField[pixel * 3 + 2] = clamp(((glint.dutyCycle - 0.3) / 0.2) * 255);
  }

  const landNearContact = dilate(land, width, height, STANDOFF_RAW_PIXELS + 26);
  const foamCandidate = new Uint8Array(length);
  for (let pixel = 0; pixel < length; pixel += 1) {
    foamCandidate[pixel] = waterSafe[pixel] && landNearContact[pixel] && luma[pixel] >= 0.43 && saturation[pixel] <= 0.46 && gradient[pixel] >= 0.018 ? 1 : 0;
  }
  const foamComponents = components(foamCandidate, width, height).filter((component) => component.count >= 2);
  assert.ok(foamComponents.length > 0, "water derivation found no safe pale contact foam");
  const foamMask = new Uint8Array(length);
  for (const component of foamComponents) for (let y = component.top; y < component.bottom; y += 1) for (let x = component.left; x < component.right; x += 1) {
    const pixel = indexFor(x, y, width); if (foamCandidate[pixel]) foamMask[pixel] = 255;
  }

  const crestMask = new Uint8Array(length);
  const directionField = new Uint8Array(length * 3);
  const pseudoNormalField = new Uint8Array(length * 3);
  const wavePhaseField = new Uint8Array(length);
  let weightedX = 0, weightedY = 0, directionWeight = 0;
  for (let pixel = 0; pixel < length; pixel += 1) {
    const strength = waterSafe[pixel] ? gradient[pixel] : 0;
    if (strength >= 0.018) {
      crestMask[pixel] = clamp(Math.min(1, strength / 0.12) * 255);
      directionField[pixel * 3] = clamp((tangentX[pixel] * 0.5 + 0.5) * 255);
      directionField[pixel * 3 + 1] = clamp((tangentY[pixel] * 0.5 + 0.5) * 255);
      directionField[pixel * 3 + 2] = clamp(Math.min(1, strength / 0.12) * 255);
      weightedX += tangentX[pixel] * strength; weightedY += tangentY[pixel] * strength; directionWeight += strength;
    }
    if (waterSafe[pixel]) {
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      const regionNoise = hashUnit(Math.floor(x / 48), Math.floor(y / 48), 7);
      const waveCoordinate = (x * tangentX[pixel] + y * tangentY[pixel]) / 84;
      wavePhaseField[pixel] = clamp((((waveCoordinate + regionNoise) % 1 + 1) % 1) * 255);
      pseudoNormalField[pixel * 3] = clamp((gradient[pixel + 1] - gradient[pixel - 1] + 1) * 127.5);
      pseudoNormalField[pixel * 3 + 1] = clamp((gradient[pixel + width] - gradient[pixel - width] + 1) * 127.5);
      pseudoNormalField[pixel * 3 + 2] = clamp(Math.min(1, strength / 0.12) * 255);
    }
  }
  assert.ok(directionWeight > 0, "water derivation found no paint-stroke direction samples");
  const vectorLength = Math.hypot(weightedX, weightedY);
  const direction = { x: Number((weightedX / vectorLength).toFixed(4)), y: Number((weightedY / vectorLength).toFixed(4)), samples: Number(directionWeight.toFixed(4)) };

  let standoffViolations = 0, safePixels = 0, sparklePixels = 0, foamPixels = 0, crestPixels = 0;
  for (let pixel = 0; pixel < length; pixel += 1) {
    if (waterSafe[pixel]) safePixels += 1;
    if (sparkleMask[pixel]) sparklePixels += 1;
    if (foamMask[pixel]) foamPixels += 1;
    if (crestMask[pixel]) crestPixels += 1;
    if (landBuffer[pixel] && (sparkleMask[pixel] || foamMask[pixel] || crestMask[pixel])) standoffViolations += 1;
  }
  assert.equal(standoffViolations, 0, "water effects must never animate land, docks, pilings, or structures inside the 7px buffer");

  const distance = distanceToMask(foamMask, width, height);
  const shoreSdf = new Uint8Array(length);
  for (let pixel = 0; pixel < length; pixel += 1) {
    const signed = waterSafe[pixel] ? distance[pixel] : -distance[pixel];
    shoreSdf[pixel] = clamp(128 + Math.max(-64, Math.min(63.5, signed)) * 2);
  }
  const sortedWater = Array.from(
    { length: waterSafe.reduce((total, value) => total + Number(value > 0), 0) },
    () => [0, 0, 0, 0],
  );
  let waterIndex = 0;
  for (let pixel = 0; pixel < length; pixel += 1) if (waterSafe[pixel]) {
    const offset = pixel * 3;
    sortedWater[waterIndex++] = [luma[pixel], rgb[offset], rgb[offset + 1], rgb[offset + 2]];
  }
  sortedWater.sort((a, b) => a[0] - b[0]);
  const rampStops = Array.from({ length: 16 }, (_, index) => {
    const sample = sortedWater[Math.min(sortedWater.length - 1, Math.round(index / 15 * (sortedWater.length - 1)))];
    return sample.slice(1);
  });
  const rampLut = new Uint8Array(256 * 3);
  for (let sample = 0; sample < 256; sample += 1) {
    const position = sample / 255 * 15;
    const low = Math.floor(position), high = Math.min(15, low + 1), mix = position - low;
    for (let channel = 0; channel < 3; channel += 1) rampLut[sample * 3 + channel] = clamp(rampStops[low][channel] * (1 - mix) + rampStops[high][channel] * mix);
  }
  const sparklePng = await png(sparkleMask, width, height, 1);
  const sparklePhasePng = await png(sparklePhaseField, width, height, 3);
  const foamPng = await png(foamMask, width, height, 1);
  const sdfPng = await png(shoreSdf, width, height, 1);
  const waterPng = await png(waterSafe, width, height, 1);
  const crestPng = await png(crestMask, width, height, 1);
  const directionPng = await png(directionField, width, height, 3);
  const wavePhasePng = await png(wavePhaseField, width, height, 1);
  const pseudoNormalPng = await png(pseudoNormalField, width, height, 3);
  const rampLutPng = await png(rampLut, 256, 1, 3);
  for (const [name, bytes] of [
    [files.sparkleMask, sparklePng], [files.sparklePhaseField, sparklePhasePng],
    [files.foamMask, foamPng], [files.shoreSdf, sdfPng], [files.waterMask, waterPng],
    [files.crestMask, crestPng], [files.directionField, directionPng],
    [files.wavePhaseField, wavePhasePng], [files.pseudoNormalField, pseudoNormalPng],
    [files.rampLut, rampLutPng],
  ]) {
    await emit(canonicalOutput(name), bytes);
    await emit(qaOutput(name), bytes);
  }

  const offlineComposite = async (seconds) => {
    const frame = Buffer.from(rgb);
    for (let pixel = 0; pixel < length; pixel += 1) {
      if (!waterSafe[pixel]) continue;
      const offset = pixel * 3;
      const phase = wavePhaseField[pixel] / 255;
      const wave = Math.sin(Math.PI * 2 * (phase - seconds / 11));
      const crest = crestMask[pixel] / 255;
      const relight = crest * wave * 0.04;
      const lumaIndex = clamp((((frame[offset] * 0.2126 + frame[offset + 1] * 0.7152 + frame[offset + 2] * 0.0722) / 255 + wave * 0.026) * 255));
      const cycleMix = crest * 0.16;
      frame[offset] = clamp((frame[offset] * (1 - cycleMix) + rampLut[lumaIndex * 3] * cycleMix) * (1 + relight));
      frame[offset + 1] = clamp((frame[offset + 1] * (1 - cycleMix) + rampLut[lumaIndex * 3 + 1] * cycleMix) * (1 + relight));
      frame[offset + 2] = clamp((frame[offset + 2] * (1 - cycleMix) + rampLut[lumaIndex * 3 + 2] * cycleMix) * (1 + relight));
      const period = 1.13 + sparklePhaseField[pixel * 3 + 1] / 255 * 2.71;
      const duty = 0.3 + sparklePhaseField[pixel * 3 + 2] / 255 * 0.2;
      const lifePhase = (seconds / period + sparklePhaseField[pixel * 3] / 255) % 1;
      const sparkle = lifePhase < duty ? Math.pow(Math.sin(Math.PI * lifePhase / duty), 1.7) * sparkleMask[pixel] / 255 : 0;
      const distance = (shoreSdf[pixel] - 128) * 0.5;
      const roughDistance = distance + (phase - 0.5) * 4;
      const swash = 0.5 + 0.5 * Math.sin(Math.PI * 2 * (phase - seconds / 6));
      const band = distance >= 0 && distance < 28
        ? smoothstep(0.84, 0.985, Math.cos(Math.PI * 2 * (roughDistance / 14 - seconds / 6))) * (1 - smoothstep(18, 28, distance)) * swash
        : 0;
      const foam = Math.max(foamMask[pixel] / 255 * 0.34, band * 0.26);
      frame[offset] = clamp(Math.max(frame[offset] + sparkle * 30, 212 * foam + frame[offset] * (1 - foam)));
      frame[offset + 1] = clamp(Math.max(frame[offset + 1] + sparkle * 30, 233 * foam + frame[offset + 1] * (1 - foam)));
      frame[offset + 2] = clamp(Math.max(frame[offset + 2] + sparkle * 30, 241 * foam + frame[offset + 2] * (1 - foam)));
    }
    return png(frame, width, height, 3);
  };
  const [frame0, frame3] = await Promise.all([offlineComposite(0), offlineComposite(3)]);
  await emit(qaOutput("composite-frame-t000.png"), await sharp(frame0).resize({ width: 1200 }).png({ compressionLevel: 9 }).toBuffer());
  await emit(qaOutput("composite-frame-t003.png"), await sharp(frame3).resize({ width: 1200 }).png({ compressionLevel: 9 }).toBuffer());
  const loopAudit = {
    phaseModel: "per-glint continuous spatial-hash period and phase; stroke-derived shared phase plus 48px regional noise for relight, cycling, and swash",
    glints: {
      count: glints.length,
      dutyCycleRange: [Math.min(...glints.map(({ dutyCycle }) => dutyCycle)), Math.max(...glints.map(({ dutyCycle }) => dutyCycle))],
      periodRangeSeconds: [Math.min(...glints.map(({ periodSeconds }) => periodSeconds)), Math.max(...glints.map(({ periodSeconds }) => periodSeconds))],
      uniquePeriods: new Set(glints.map(({ periodSeconds }) => periodSeconds)).size,
    },
    commonPeriod: "none; irrationally distributed floating periods are evaluated continuously, and foam/crest add spatial phase noise rather than a shared animation clock",
    offlineFrames: ["composite-frame-t000.png", "composite-frame-t003.png"],
  };
  await emit(qaOutput("loop-audit.json"), Buffer.from(`${JSON.stringify(loopAudit, null, 2)}\n`));

  const overlay = Buffer.alloc(length * 4);
  for (let pixel = 0; pixel < length; pixel += 1) {
    const target = pixel * 4;
    if (landBuffer[pixel]) { overlay[target] = 255; overlay[target + 1] = 76; overlay[target + 2] = 64; overlay[target + 3] = 30; }
    if (crestMask[pixel]) { overlay[target] = 255; overlay[target + 1] = 190; overlay[target + 2] = 66; overlay[target + 3] = Math.max(overlay[target + 3], 62); }
    if (foamMask[pixel]) { overlay[target] = 232; overlay[target + 1] = 247; overlay[target + 2] = 255; overlay[target + 3] = 185; }
    if (sparkleMask[pixel]) { overlay[target] = 82; overlay[target + 1] = 236; overlay[target + 2] = 255; overlay[target + 3] = 235; }
  }
  const fullOverlay = await sharp(rgb, { raw: { width, height, channels: 3 } })
    .composite([{ input: overlay, raw: { width, height, channels: 4 } }])
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
  const ownerSheet = await sharp(fullOverlay)
    .resize({ width: 1200, withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
  await emit(qaOutput("water-effects-owner-overlay.png"), ownerSheet);

  const registration = JSON.parse(registrationBytes.toString("utf8"));
  const manifest = {
    schemaVersion: 2,
    taskId: "T23-r2-coastal-composite",
    source: {
      canon: { path: source.canon, sha256: hash(await readFile(root(source.canon))), dimensions: [width, height, 3] },
      usableMask: { path: source.usableMask, sha256: hash(await readFile(root(source.usableMask))), dimensions: [width, height, 1] },
      registration: { path: source.registration, sha256: hash(registrationBytes), id: registration.id },
    },
    safety: { standoffRawPixels: STANDOFF_RAW_PIXELS, bufferedLandPixels: landBuffer.reduce((total, value) => total + Number(value > 0), 0), violations: standoffViolations },
    waterRegion: { safePixels, coveragePercent: Number((safePixels / length * 100).toFixed(4)), classifier: "blue-water core HSV 155-255, saturation >=0.18, B >= 0.85R; 5px conservative pale-blue/contact bridge; 7px non-water standoff" },
    sparkle: {
      path: `/career-world/capitals/ninjaone/city-v2/canon/${files.sparkleMask}`, sha256: hash(sparklePng), pixels: sparklePixels,
      classifier: "safe water with luminance >=0.58, local 9x9 luminance prominence >=0.12, gradient >=0.04; components 2-96px and <=32px extent",
      glints,
      phaseField: { path: `/career-world/capitals/ninjaone/city-v2/canon/${files.sparklePhaseField}`, sha256: hash(sparklePhasePng), encoding: "RGB = per-glint hash phase, continuous 1.13..3.84s period, 30..50% duty cycle" },
    },
    foam: {
      path: `/career-world/capitals/ninjaone/city-v2/canon/${files.foamMask}`, sha256: hash(foamPng), pixels: foamPixels, components: foamComponents.length,
      classifier: "safe water 7-33px from classified land, luminance >=0.43, saturation <=0.46, gradient >=0.018",
      shoreSdf: { path: `/career-world/capitals/ninjaone/city-v2/canon/${files.shoreSdf}`, sha256: hash(sdfPng), encoding: "8-bit signed distance to painted contact foam; 128=contact, +2 codes per safe-water pixel" },
    },
    crest: {
      path: `/career-world/capitals/ninjaone/city-v2/canon/${files.crestMask}`, sha256: hash(crestPng), pixels: crestPixels,
      classifier: "safe-water local luminance gradient >=0.018; alpha proportional to gradient strength", travelDirection: direction,
      directionField: { path: `/career-world/capitals/ninjaone/city-v2/canon/${files.directionField}`, sha256: hash(directionPng), encoding: "RGB = tangent x, tangent y, gradient strength; tangent is sign-normalized to +x" },
      wavePhaseField: { path: `/career-world/capitals/ninjaone/city-v2/canon/${files.wavePhaseField}`, sha256: hash(wavePhasePng), encoding: "stroke-tangent coordinate plus deterministic 48px regional phase noise" },
      pseudoNormalField: { path: `/career-world/capitals/ninjaone/city-v2/canon/${files.pseudoNormalField}`, sha256: hash(pseudoNormalPng), encoding: "RGB = finite-difference normal x/y from 7x7 blurred canon luminance, local strength" },
      rampLut: { path: `/career-world/capitals/ninjaone/city-v2/canon/${files.rampLut}`, sha256: hash(rampLutPng), dimensions: [256, 1, 3], stops: rampStops },
    },
    runtime: { defaults: { sparkle: 1, foam: 1, crest: 1, relight: 1, cycling: 1 }, parameterNamespace: "water-effects", costBasis: "one D05-local 2D canvas pass over derived 1305x1205 fields; canvas writes only safe water effect pixels at 30fps, no ocean-layer pass; browser/GPU cost requires live verification" },
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  await emit(canonicalOutput(files.manifest), manifestBytes);
  await emit(qaOutput(files.manifest), manifestBytes);
  const runtime = {
    dimensions: [width, height],
    sourcePath: "/career-world/capitals/ninjaone/city-v2/canon/d05-canon-capital-r4.png",
    waterMaskPath: `/career-world/capitals/ninjaone/city-v2/canon/${files.waterMask}`,
    sparkle: { maskPath: manifest.sparkle.path, phaseFieldPath: manifest.sparkle.phaseField.path },
    foam: { maskPath: manifest.foam.path, shoreSdfPath: manifest.foam.shoreSdf.path },
    crest: {
      maskPath: manifest.crest.path,
      directionFieldPath: manifest.crest.directionField.path,
      travelDirection: [manifest.crest.travelDirection.x, manifest.crest.travelDirection.y],
      wavePhaseFieldPath: manifest.crest.wavePhaseField.path,
      pseudoNormalFieldPath: manifest.crest.pseudoNormalField.path,
      rampLutPath: manifest.crest.rampLut.path,
    },
    provenancePath: manifest.sparkle.path.replace(files.sparkleMask, files.manifest),
  };
  const runtimeBytes = Buffer.from(`${JSON.stringify(runtime, null, 2)}\n`);
  await emit(canonicalOutput(files.runtime), runtimeBytes);
  await emit(qaOutput(files.runtime), runtimeBytes);
  await emit(qaOutput("EFFECTS.md"), Buffer.from([
    "# T23-r2 coastal canon-water composite",
    "",
    `- Owner sheet: \`water-effects-owner-overlay.png\` (${width}x${height} source, resized to 1200px wide). Cyan = sparkle, white = foam/contact, gold = stroke crest, faint red = 7px land/dock/piling safety buffer.`,
    `- Sparkle: ${glints.length} luminance-keyed glint components. Spatial hash gives every component a continuous 1.13..3.84s period, independent phase, and 30..50% duty cycle; there is no generated frame loop or common reset period.`,
    `- Foam: ${foamComponents.length} safe pale-contact components have a signed-distance field; runtime max-blends a thin noisy cosine band and synchronized swash over the painted foam floor.`,
    `- Relight/cycling: ${crestPixels} gradient-supported water-stroke pixels share the stroke-derived phase field, pseudo-normal, and canon-palette LUT.`,
    `- Safety: 7 raw-pixel land/structure standoff, ${standoffViolations} mask violations. All effects are clipped by the mounted usable mask as a second boundary.`,
    "",
    "## Unknowns",
    "",
    "- These gates prove derivation, standoff, and runtime wiring only. Whether the motion reads as charm rather than visual noise requires the director/owner live flyover.",
    "- The canvas composite needs browser/GPU verification at capital, site, and close tiers; no local frame-time claim is made.",
  ].join("\n")));
  await emit(qaOutput("DIALS.md"), Buffer.from([
    "# T23 water-effect dials",
    "",
    "All values clamp to 0..2. Defaults are 1. Invalid values use the default. T24 exposes this namespace in its dev-only panel and the URL remains copyable.",
    "",
    "- `water-effects.sparkle` — masked glint brightness multiplier; default `1`.",
    "- `water-effects.foam` — pale contact lapping multiplier; default `1`.",
    "- `water-effects.crest` — painted-stroke sweep multiplier; default `1`.",
    "",
    "- `water-effects.relight`: pseudo-normal travelling-light multiplier; default `1`.",
    "- `water-effects.cycling`: shallow canon-palette stroke cycling multiplier; default `1`.",
    "",
    "Example: `?water-effects.sparkle=1.25&water-effects.foam=0.8&water-effects.crest=1.15&water-effects.relight=0.8&water-effects.cycling=1.1`.",
    "",
    "Reduced motion suppresses all three moving overlays, leaving the unmodified canon visible.",
  ].join("\n")));
  console.log(JSON.stringify({ deterministic: CHECK_ONLY, output: { manifest: files.manifest, sparkleGlints: glints.length, foamComponents: foamComponents.length, crestPixels, standoffViolations } }));
}

await main();
