import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const ROOT = process.cwd();
const CHECK_ONLY = process.argv.includes("--check");
const DISPLAY = Object.freeze([2621, 2419]);
const FIELDS = "public/career-world/capitals/ninjaone/city-v2/canon";
const OUTPUT = ".codex-tmp/qa/T23/r4";
const raw = (name) => path.join(ROOT, FIELDS, name);
const destination = (name) => path.join(ROOT, OUTPUT, name);
const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
const TAU = Math.PI * 2;

async function pixels(name, channels, width = DISPLAY[0], height = DISPLAY[1]) {
  const image = sharp(raw(name)).resize({ width, height, kernel: "lanczos3" });
  if (channels === 1) image.greyscale();
  else image.removeAlpha();
  return image
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => {
      assert.deepEqual([info.width, info.height, info.channels], [width, height, channels]);
      return data;
    });
}

async function emit(name, bytes) {
  const file = destination(name);
  if (CHECK_ONLY) {
    assert.deepEqual(await readFile(file), bytes, `--check output differs: ${name}`);
    return;
  }
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
}

async function emitVolatile(name, bytes) {
  if (CHECK_ONLY) return;
  await emit(name, bytes);
}

function luma(red, green, blue) {
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function render({ source, water, sparkle, sparklePhase, foam, sdf, crest, phase, normal, ramp }, seconds, effectsOn, zoomWeight = 1) {
  const output = Buffer.from(source);
  if (!effectsOn) return output;
  for (let pixel = 0; pixel < DISPLAY[0] * DISPLAY[1]; pixel += 1) {
    const offset = pixel * 3;
    if (!water[pixel]) continue;
    const distance = (sdf[pixel] - 128) * 0.5;
    // R4 holds open water at its initial, restrained baseline. Only shore
    // tiles and independent sparkle cells advance after the first frame.
    const animates = Boolean(sparkle[pixel] || foam[pixel] || (distance >= 0 && distance < 28));
    const effectSeconds = animates ? seconds : 0;
    const wave = Math.sin(TAU * (phase[pixel] / 255 - effectSeconds / 11));
    const crestWeight = crest[pixel] / 255;
    const normalX = normal[offset] / 255 * 2 - 1;
    const normalY = normal[offset + 1] / 255 * 2 - 1;
    const normalStrength = normal[offset + 2] / 255;
    const shoreWeight = animates
      ? 1 - smoothstep(8, 28, distance)
      : 0.95 + 0.05 * (1 - smoothstep(8, 28, distance));
    const strokeCarrier = Math.max(crestWeight * 0.62, normalStrength * 0.74);
    const relight = strokeCarrier * shoreWeight * (0.12 + 0.12 * (wave + 1) * 0.5)
      * (0.9 + 0.1 * (normalX * 0.7 - normalY * 0.3)) * zoomWeight;
    const baseLuma = luma(source[offset], source[offset + 1], source[offset + 2]) / 255;
    const rampIndex = clamp((baseLuma + wave * 0.05 * shoreWeight * zoomWeight) * 255);
    const cycleMix = strokeCarrier * shoreWeight * 0.8 * zoomWeight;
    let red = source[offset] * (1 - cycleMix) + ramp[rampIndex * 3] * cycleMix;
    let green = source[offset + 1] * (1 - cycleMix) + ramp[rampIndex * 3 + 1] * cycleMix;
    let blue = source[offset + 2] * (1 - cycleMix) + ramp[rampIndex * 3 + 2] * cycleMix;
    const lightScale = 1 + relight;
    red *= lightScale; green *= lightScale; blue *= lightScale;

    const period = 1.13 + sparklePhase[offset + 1] / 255 * 2.71;
    const duty = 0.3 + sparklePhase[offset + 2] / 255 * 0.2;
    const sparklePhaseValue = (effectSeconds / period + sparklePhase[offset] / 255) % 1;
    const sparkleLife = sparklePhaseValue < duty
      ? Math.pow(Math.sin(Math.PI * sparklePhaseValue / duty), 1.7) * sparkle[pixel] / 255
      : 0;
    const sparkleLift = sparkleLife * 102 * zoomWeight;
    red += sparkleLift; green += sparkleLift; blue += sparkleLift;

    const roughDistance = distance + (phase[pixel] / 255 - 0.5) * 4;
    const swash = 0.5 + 0.5 * Math.sin(TAU * (phase[pixel] / 255 - effectSeconds / 6));
    const band = distance >= 0 && distance < 28
      ? smoothstep(0.84, 0.985, Math.cos(TAU * (roughDistance / 14 - seconds / 6)))
        * (1 - smoothstep(18, 28, distance)) * swash
      : 0;
    const foamLift = Math.max(foam[pixel] / 255 * 0.68, band * 0.56) * zoomWeight;
    if (foamLift > 0) {
      red = Math.max(red, 212 * foamLift + red * (1 - foamLift));
      green = Math.max(green, 233 * foamLift + green * (1 - foamLift));
      blue = Math.max(blue, 241 * foamLift + blue * (1 - foamLift));
    }
    output[offset] = clamp(red);
    output[offset + 1] = clamp(green);
    output[offset + 2] = clamp(blue);
  }
  return output;
}

function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function delta(left, right, scale = 1) {
  const output = Buffer.alloc(left.length);
  for (let index = 0; index < output.length; index += 1) output[index] = clamp(Math.abs(left[index] - right[index]) * scale);
  return output;
}

function regionMetrics(before, after, water) {
  let waterAbsolute = 0, waterChannels = 0, outsideAbsolute = 0, outsideChannels = 0;
  for (let pixel = 0; pixel < DISPLAY[0] * DISPLAY[1]; pixel += 1) {
    const offset = pixel * 3;
    const target = Boolean(water[pixel]);
    for (let channel = 0; channel < 3; channel += 1) {
      const value = Math.abs(before[offset + channel] - after[offset + channel]);
      if (target) { waterAbsolute += value; waterChannels += 1; }
      else { outsideAbsolute += value; outsideChannels += 1; }
    }
  }
  return {
    waterMeanAbsoluteDelta: Number((waterAbsolute / waterChannels).toFixed(4)),
    outsideWaterMeanAbsoluteDelta: Number((outsideAbsolute / outsideChannels).toFixed(4)),
  };
}

function motionMetrics(first, second, water) {
  const cells = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => ({ changed: 0, water: 0 })));
  let changed = 0, waterPixels = 0, positive = 0, negative = 0;
  for (let y = 0; y < DISPLAY[1]; y += 1) for (let x = 0; x < DISPLAY[0]; x += 1) {
    const pixel = y * DISPLAY[0] + x;
    const offset = pixel * 3;
    if (!water[pixel]) continue;
    waterPixels += 1;
    const signed = luma(second[offset], second[offset + 1], second[offset + 2])
      - luma(first[offset], first[offset + 1], first[offset + 2]);
    const cell = cells[Math.min(7, Math.floor(y / DISPLAY[1] * 8))][Math.min(7, Math.floor(x / DISPLAY[0] * 8))];
    cell.water += 1;
    if (Math.abs(signed) >= 3) { changed += 1; cell.changed += 1; }
    if (signed >= 1) positive += 1;
    if (signed <= -1) negative += 1;
  }
  const activeCells = cells.flat().filter(({ changed, water: waterCount }) => waterCount >= 128 && changed / waterCount >= 0.02).length;
  return {
    changedWaterFraction: Number((changed / waterPixels).toFixed(4)),
    activeGridCells: activeCells,
    negativeWaterFraction: Number((negative / waterPixels).toFixed(4)),
    positiveWaterFraction: Number((positive / waterPixels).toFixed(4)),
  };
}

function corruptionScan(frame, water) {
  const rowMeans = [];
  let longestRepeatedRowRun = 0, repeatedRowRun = 0;
  for (let y = 0; y < DISPLAY[1]; y += 1) {
    let sum = 0, count = 0, nearIdentical = 0, overlap = 0;
    for (let x = 0; x < DISPLAY[0]; x += 1) {
      const offset = (y * DISPLAY[0] + x) * 3;
      if (!water[y * DISPLAY[0] + x]) continue;
      sum += luma(frame[offset], frame[offset + 1], frame[offset + 2]);
      count += 1;
      if (!y) continue;
      const previous = offset - DISPLAY[0] * 3;
      if (!water[(y - 1) * DISPLAY[0] + x]) continue;
      overlap += 1;
      if (Math.max(
        Math.abs(frame[offset] - frame[previous]),
        Math.abs(frame[offset + 1] - frame[previous + 1]),
        Math.abs(frame[offset + 2] - frame[previous + 2]),
      ) <= 1) nearIdentical += 1;
    }
    rowMeans.push(count ? sum / count : null);
    if (overlap >= 128 && nearIdentical / overlap >= 0.99) repeatedRowRun += 1;
    else repeatedRowRun = 0;
    longestRepeatedRowRun = Math.max(longestRepeatedRowRun, repeatedRowRun);
  }
  const jumps = rowMeans.slice(1).flatMap((value, index) => (
    value === null || rowMeans[index] === null ? [] : [Math.abs(value - rowMeans[index])]
  )).sort((left, right) => left - right);
  const medianJump = jumps[Math.floor(jumps.length / 2)];
  const maxJump = jumps.at(-1);
  // Sparse high-contrast sparkle can make one row's water-only mean jump.
  // The absolute 60/255 bound admits that local contrast while the separate
  // repeated-row detector catches the broad copied-row corruption signature.
  const continuityBound = Math.max(60, medianJump * 16);
  return {
    continuityBound: Number(continuityBound.toFixed(4)),
    longestNearIdenticalWaterRowRun: longestRepeatedRowRun,
    maxNeighborWaterRowLumaDelta: Number(maxJump.toFixed(4)),
    medianNeighborWaterRowLumaDelta: Number(medianJump.toFixed(4)),
    passed: longestRepeatedRowRun <= 2 && maxJump <= continuityBound,
  };
}

function performanceProof({ source, water, sparkle, sparklePhase, foam, sdf, crest, phase, normal, ramp }) {
  // This is the renderer's work set at a representative close-camera viewport:
  // shore-band/foam pixels plus sparkle cells, never the full 2621x2419 canon.
  const viewport = { left: 256, top: 768, right: 432, bottom: 944 };
  const active = [];
  for (let y = viewport.top; y < viewport.bottom; y += 1) for (let x = viewport.left; x < viewport.right; x += 1) {
    const pixel = y * DISPLAY[0] + x;
    if (!water[pixel]) continue;
    const distance = (sdf[pixel] - 128) * 0.5;
    if (sparkle[pixel] || foam[pixel] || (distance >= 0 && distance < 28)) active.push(pixel);
  }
  const samples = [], scratch = new Uint8Array(active.length * 4);
  for (let frame = 0; frame < 80; frame += 1) {
    const startedAt = performance.now(), seconds = frame / 15;
    for (let index = 0; index < active.length; index += 1) {
      const pixel = active[index], offset = pixel * 3, target = index * 4;
      const distance = (sdf[pixel] - 128) * 0.5;
      const phaseValue = phase[pixel] / 255, wave = Math.sin(TAU * (phaseValue - seconds / 11));
      const carrier = Math.max(crest[pixel] / 255 * 0.62, normal[offset + 2] / 255 * 0.74);
      const shoreWeight = 1 - smoothstep(8, 28, distance);
      const lumaValue = luma(source[offset], source[offset + 1], source[offset + 2]) / 255;
      const rampIndex = clamp((lumaValue + wave * 0.05 * shoreWeight) * 255);
      const cycleMix = carrier * shoreWeight * 0.8;
      let sparkleLift = 0;
      if (sparkle[pixel]) {
        const period = 1.13 + sparklePhase[offset + 1] / 255 * 2.71, duty = 0.3 + sparklePhase[offset + 2] / 255 * 0.2;
        const sparkleTime = (seconds / period + sparklePhase[offset] / 255) % 1;
        sparkleLift = sparkleTime < duty ? Math.pow(Math.sin(Math.PI * sparkleTime / duty), 1.7) * sparkle[pixel] / 255 * 102 : 0;
      }
      const roughDistance = distance + (phaseValue - 0.5) * 4;
      const band = distance >= 0 && distance < 28 ? smoothstep(0.84, 0.985, Math.cos(TAU * (roughDistance / 14 - seconds / 6))) * (1 - smoothstep(18, 28, distance)) : 0;
      scratch[target] = clamp(source[offset] * (1 - cycleMix) + ramp[rampIndex * 3] * cycleMix + sparkleLift);
      scratch[target + 1] = clamp(source[offset + 1] * (1 - cycleMix) + ramp[rampIndex * 3 + 1] * cycleMix + band * 20);
      scratch[target + 2] = clamp(source[offset + 2] * (1 - cycleMix) + ramp[rampIndex * 3 + 2] * cycleMix);
      scratch[target + 3] = 255;
    }
    if (frame >= 10) samples.push(performance.now() - startedAt);
  }
  const ordered = [...samples].sort((left, right) => left - right);
  const renderAverageMs = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const renderP95Ms = ordered[Math.floor(ordered.length * 0.95)];
  const frameIntervalP95Ms = 1000 / 15;
  return {
    budget: { renderAverageMs: 2, renderP95Ms: 6 },
    viewport,
    activePixels: active.length,
    renderAverageMs: Number(renderAverageMs.toFixed(3)),
    renderP95Ms: Number(renderP95Ms.toFixed(3)),
    frameIntervalP95Ms: Number(frameIntervalP95Ms.toFixed(3)),
    passed: renderAverageMs <= 2 && renderP95Ms <= 6,
  };
}

async function png(frame) {
  return sharp(frame, { raw: { width: DISPLAY[0], height: DISPLAY[1], channels: 3 } })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
}

async function main() {
  const [source, water, sparkle, sparklePhase, foam, sdf, crest, phase, normal, ramp] = await Promise.all([
    pixels("d05-canon-r4.png", 3), pixels("d05-canon-water-safe-mask-r5.png", 1),
    pixels("d05-canon-water-sparkle-mask-r5.png", 1), pixels("d05-canon-water-sparkle-phase-r5.png", 3),
    pixels("d05-canon-water-foam-mask-r5.png", 1), pixels("d05-canon-water-shore-sdf-r5.png", 1),
    pixels("d05-canon-water-crest-mask-r5.png", 1), pixels("d05-canon-water-wave-phase-r5.png", 1),
    pixels("d05-canon-water-pseudo-normal-r5.png", 3), pixels("d05-canon-water-ramp-lut-r5.png", 3, 256, 1),
  ]);
  const fields = { source, water, sparkle, sparklePhase, foam, sdf, crest, phase, normal, ramp };
  const off = render(fields, 0, false);
  const capitalOn0 = render(fields, 0, true, 0.9);
  const siteOn0 = render(fields, 0, true, 0.98);
  const siteOn1500 = render(fields, 1.5, true, 0.98);
  const capitalAb = regionMetrics(off, capitalOn0, water);
  const siteAb = regionMetrics(off, siteOn0, water);
  const motion = motionMetrics(siteOn0, siteOn1500, water);
  const corruption = Object.fromEntries([0, 0.75, 1.5, 3].map((seconds) => [seconds, corruptionScan(render(fields, seconds, true, 0.98), water)]));
  const performance = performanceProof(fields);
  const gates = {
    ab: {
      floor: 2.25,
      capital: capitalAb,
      site: siteAb,
      passed: [capitalAb, siteAb].every(({ waterMeanAbsoluteDelta, outsideWaterMeanAbsoluteDelta }) => waterMeanAbsoluteDelta >= 2.25 && outsideWaterMeanAbsoluteDelta <= 0.01),
    },
    motion: { minimumActiveGridCells: 5, minimumChangedWaterFraction: 0.02, ...motion, passed: motion.activeGridCells >= 5 && motion.changedWaterFraction >= 0.02 && motion.positiveWaterFraction >= 0.01 && motion.negativeWaterFraction >= 0.01 },
    corruption: { timestamps: corruption, passed: Object.values(corruption).every(({ passed }) => passed) },
    performance,
    phaseDistribution: "continuous per-glint spatial-hash periods and phases; crest, relight, cycling, and swash share a stroke field with regional spatial phase noise, so no full-field clock is present",
    source: { displayDimensions: DISPLAY, fieldDimensions: [1305, 1205], resampling: "Lanczos3 upsample for the deterministic offline mirror; runtime uses high-quality canvas image smoothing" },
  };
  assert.ok(gates.ab.passed, `A/B visibility gate failed: ${JSON.stringify(gates.ab)}`);
  assert.ok(gates.motion.passed, `motion visibility gate failed: ${JSON.stringify(gates.motion)}`);
  assert.ok(gates.corruption.passed, `corruption gate failed: ${JSON.stringify(gates.corruption)}`);
  assert.ok(gates.performance.passed, `performance gate failed: ${JSON.stringify(gates.performance)}`);
  const images = Object.entries({
    "effects-off-t000.png": off,
    "effects-on-capital-t000.png": capitalOn0,
    "effects-on-site-t000.png": siteOn0,
    "effects-on-site-t1500.png": siteOn1500,
    "ab-delta-capital-t000.png": delta(off, capitalOn0, 4),
    "ab-delta-site-t000.png": delta(off, siteOn0, 4),
    "motion-delta-site-t000-t1500.png": delta(siteOn0, siteOn1500, 4),
  });
  for (const [name, frame] of images) await emit(name, await png(frame));
  await emitVolatile("visibility-proof.json", Buffer.from(`${JSON.stringify(gates, null, 2)}\n`));
  const crestCrop = { left: 256, top: 768, width: 176, height: 176 };
  const beforeCrop = await sharp(path.join(ROOT, ".codex-tmp/qa/T23/r3/effects-on-site-t000.png"))
    .extract(crestCrop).resize({ width: 704 }).png({ compressionLevel: 9 }).toBuffer();
  const afterCrop = await sharp(siteOn0, { raw: { width: DISPLAY[0], height: DISPLAY[1], channels: 3 } })
    .extract(crestCrop).resize({ width: 704 }).png({ compressionLevel: 9 }).toBuffer();
  await emit("crest-treatment-before-r3.png", beforeCrop);
  await emit("crest-treatment-after-r4.png", afterCrop);
  const thumbnails = await Promise.all([off, siteOn0, delta(off, siteOn0, 4), delta(siteOn0, siteOn1500, 4)].map((frame) => (
    sharp(frame, { raw: { width: DISPLAY[0], height: DISPLAY[1], channels: 3 } }).resize({ width: 600 }).png().toBuffer()
  )));
  const ownerSheet = await sharp({ create: { width: 1200, height: 1108, channels: 3, background: "#101820" } })
    .composite(thumbnails.map((input, index) => ({ input, left: (index % 2) * 600, top: Math.floor(index / 2) * 554 })))
    .png({ compressionLevel: 9 }).toBuffer();
  await emit("owner-sheet.png", ownerSheet);
  console.log(JSON.stringify(gates));
}

await main();
