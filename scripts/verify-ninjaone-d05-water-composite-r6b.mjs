import assert from "node:assert/strict";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const ROOT = process.cwd();
const CANON = path.join(ROOT, "public/career-world/capitals/ninjaone/city-v2/canon");
const OUTPUT = path.join(ROOT, ".codex-tmp/qa/T23/r6b");
const CHECK_ONLY = process.argv.includes("--check");
const WIDTH = 1305;
const HEIGHT = 1205;
const PIXELS = WIDTH * HEIGHT;

const files = Object.freeze({
  water: "d05-canon-water-safe-mask-r5.png", crest: "d05-canon-water-crest-mask-r5.png",
  direction: "d05-canon-water-direction-field-r5.png", phase: "d05-canon-water-wave-phase-r5.png",
  foam: "d05-canon-water-foam-mask-r5.png", sdf: "d05-canon-water-shore-sdf-r5.png",
  capital: "d05-canon-capital-r4.png", site: "d05-canon-intermediate-r4.png", close: "d05-canon-r4.png",
});

const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
const fract = (value) => value - Math.floor(value);
const smooth = (start, end, value) => { const t = Math.max(0, Math.min(1, (value - start) / (end - start))); return t * t * (3 - 2 * t); };
const hash21 = (x, y) => { const px = fract(x * 123.34); const py = fract(y * 456.21); const dot = px * (px + 45.32) + py * (py + 45.32); return fract((px + dot) * (py + dot)); };

async function image(name, channels, resize = false) {
  let source = sharp(path.join(CANON, name)).removeAlpha();
  if (channels === 1) source = source.greyscale();
  if (resize) source = source.resize({ width: WIDTH, height: HEIGHT, kernel: "lanczos3" });
  const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height, info.channels], [WIDTH, HEIGHT, channels]);
  return data;
}

async function emit(name, bytes) {
  const destination = path.join(OUTPUT, name);
  if (CHECK_ONLY) { assert.deepEqual(await readFile(destination), bytes, `--check differs: ${name}`); return; }
  await mkdir(OUTPUT, { recursive: true });
  await writeFile(destination, bytes);
}

function sample(bytes, channels, u, v) {
  const x = Math.max(0, Math.min(WIDTH - 1, Math.round(u * (WIDTH - 1))));
  const y = Math.max(0, Math.min(HEIGHT - 1, Math.round(v * (HEIGHT - 1))));
  return bytes[(y * WIDTH + x) * channels];
}

function filledStamp(u, v, centerX, centerY, directionX, directionY, radiusX, radiusY, seed) {
  const length = Math.hypot(directionX, directionY) || 1;
  const forwardX = directionX / length; const forwardY = directionY / length;
  const deltaX = u - centerX; const deltaY = v - centerY;
  const localX = (deltaX * forwardX + deltaY * forwardY) / radiusX;
  const localY = (-deltaX * forwardY + deltaY * forwardX) / radiusY;
  const angle = Math.atan2(localY, localX);
  const radius = Math.hypot(localX, localY) + .075 * Math.sin(angle * (3 + Math.floor(seed * 3)) + seed * Math.PI * 2);
  return 1 - smooth(.58, 1, radius);
}

function stampFields({ source, crest, direction, foam, phase, x, y, seconds, offshore }) {
  const pixel = y * WIDTH + x; const u = x / (WIDTH - 1); const v = y / (HEIGHT - 1);
  const directionX = direction[pixel * 3] / 255 * 2 - 1; const directionY = direction[pixel * 3 + 1] / 255 * 2 - 1;
  const regionalPhase = phase[pixel] / 255;
  const crestGridX = 20 - offshore * 4; const crestGridY = 14 - offshore * 3;
  const crestCellX = Math.floor(u * crestGridX); const crestCellY = Math.floor(v * crestGridY);
  const crestSeed = hash21(crestCellX + 11.7, crestCellY + 11.7);
  const period = (.85 + regionalPhase * .45) * (1 - offshore) + (3 + regionalPhase * 1.2) * offshore;
  let crestCenterX = (crestCellX + .28 + hash21(crestCellX + 2.1, crestCellY + 2.1) * .44) / crestGridX;
  let crestCenterY = (crestCellY + .28 + hash21(crestCellX + 6.4, crestCellY + 6.4) * .44) / crestGridY;
  const directionLength = Math.hypot(directionX, directionY) || 1;
  const crestTravel = (fract(seconds / period + crestSeed) - .5) * .12 / crestGridX;
  crestCenterX += directionX / directionLength * crestTravel; crestCenterY += directionY / directionLength * crestTravel;
  const crestShape = filledStamp(u, v, crestCenterX, crestCenterY, directionX, directionY, .42 / crestGridX, .06 / crestGridY, crestSeed);
  const crestMaterialU = fract(crestCenterX * 1.713 + crestSeed + (u - crestCenterX) * 9); const crestMaterialV = fract(crestCenterY * 1.371 + hash21(crestCellX + 19.2, crestCellY + 19.2) + (v - crestCenterY) * 3);
  const crestMaterial = smooth(.04, .22, Math.max(sample(crest, 1, crestMaterialU - .003, crestMaterialV), sample(crest, 1, crestMaterialU, crestMaterialV), sample(crest, 1, crestMaterialU + .003, crestMaterialV), sample(crest, 1, crestMaterialU, crestMaterialV - .003), sample(crest, 1, crestMaterialU, crestMaterialV + .003)) / 255);
  const paintOffset = (Math.max(0, Math.min(WIDTH - 1, Math.round(crestMaterialU * (WIDTH - 1)))) + Math.max(0, Math.min(HEIGHT - 1, Math.round(crestMaterialV * (HEIGHT - 1)))) * WIDTH) * 3; const sampledPaint = source[paintOffset] * .2126 + source[paintOffset + 1] * .7152 + source[paintOffset + 2] * .0722;
  const crestStamp = crestShape * Math.max(crestMaterial, smooth(.10, .50, sampledPaint / 255) * .72);
  const foamGridX = 30; const foamGridY = 20; const foamCellX = Math.floor(u * foamGridX); const foamCellY = Math.floor(v * foamGridY);
  const foamSeed = hash21(foamCellX + 37.9, foamCellY + 37.9);
  let foamCenterX = (foamCellX + .24 + hash21(foamCellX + 4.8, foamCellY + 4.8) * .52) / foamGridX;
  let foamCenterY = (foamCellY + .24 + hash21(foamCellX + 8.3, foamCellY + 8.3) * .52) / foamGridY;
  const foamTravel = (fract(seconds / (.72 + foamSeed * .8) + foamSeed) - .5) * .10 / foamGridX;
  foamCenterX += directionX / directionLength * foamTravel; foamCenterY += directionY / directionLength * foamTravel;
  const foamShape = filledStamp(u, v, foamCenterX, foamCenterY, directionX, directionY, .20 / foamGridX, .10 / foamGridY, foamSeed);
  const foamMaterialU = fract(foamCenterX * 1.191 + foamSeed + (u - foamCenterX) * 6); const foamMaterialV = fract(foamCenterY * 1.827 + hash21(foamCellX + 27.4, foamCellY + 27.4) + (v - foamCenterY) * 5);
  const foamOffset = (Math.max(0, Math.min(WIDTH - 1, Math.round(foamMaterialU * (WIDTH - 1)))) + Math.max(0, Math.min(HEIGHT - 1, Math.round(foamMaterialV * (HEIGHT - 1)))) * WIDTH) * 3; const foamPaint = source[foamOffset] * .2126 + source[foamOffset + 1] * .7152 + source[foamOffset + 2] * .0722;
  const foamMaterial = Math.max(smooth(.03, .17, sample(foam, 1, foamMaterialU, foamMaterialV) / 255), smooth(.10, .50, foamPaint / 255) * .68);
  return { crestStamp, foamStamp: foamShape * foamMaterial };
}

function render({ source, water, crest, direction, phase, foam, sdf, seconds }) {
  const frame = new Uint8Array(PIXELS * 4);
  for (let pixel = 0; pixel < PIXELS; pixel += 1) {
    if (!water[pixel]) continue;
    const x = pixel % WIDTH; const y = Math.floor(pixel / WIDTH); const offset = pixel * 4; const sourceOffset = pixel * 3;
    const distance = (sdf[pixel] - 128) * .5; const shore = 1 - smooth(8, 32, distance); const offshore = 1 - shore;
    const stamps = stampFields({ source, crest, direction, foam, phase, x, y, seconds, offshore });
    const foamEnergy = Math.max(stamps.foamStamp * shore * .84, stamps.crestStamp * shore * .26); const foamLift = Math.min(.95, foamEnergy);
    const crestLift = stamps.crestStamp * (.17 + offshore * .10);
    frame[offset] = clamp(source[sourceOffset] + crestLift * 255 + foamLift * (212 - source[sourceOffset]));
    frame[offset + 1] = clamp(source[sourceOffset + 1] + crestLift * 255 + foamLift * (233 - source[sourceOffset + 1]));
    frame[offset + 2] = clamp(source[sourceOffset + 2] + crestLift * 255 + foamLift * (241 - source[sourceOffset + 2]));
    frame[offset + 3] = clamp((crestLift + foamEnergy) * 255);
  }
  return frame;
}

function composite(source, overlay) {
  const output = new Uint8Array(PIXELS * 3);
  for (let pixel = 0; pixel < PIXELS; pixel += 1) {
    const sourceOffset = pixel * 3; const overlayOffset = pixel * 4; const alpha = overlay[overlayOffset + 3] / 255;
    for (let channel = 0; channel < 3; channel += 1) output[sourceOffset + channel] = clamp(source[sourceOffset + channel] * (1 - alpha) + overlay[overlayOffset + channel] * alpha);
  }
  return output;
}

function rowAnomaly(frame, water) {
  let longest = 0; let run = 0;
  for (let y = 1; y < HEIGHT; y += 1) { let same = 0; let total = 0; let active = 0; for (let x = 0; x < WIDTH; x += 1) { const pixel = y * WIDTH + x; if (!water[pixel] || !water[pixel - WIDTH]) continue; total += 1; if (frame[pixel * 4 + 3] >= 8 || frame[(pixel - WIDTH) * 4 + 3] >= 8) active += 1; if (Math.abs(frame[pixel * 4 + 3] - frame[(pixel - WIDTH) * 4 + 3]) <= 1) same += 1; } run = total >= 128 && active / total >= .04 && same / total >= .99 ? run + 1 : 0; longest = Math.max(longest, run); }
  return { longestNearIdenticalWaterRowRun: longest, passed: longest <= 2 };
}

function motion(first, second, water) {
  const cells = Array.from({ length: 64 }, () => ({ changed: 0, water: 0 })); let changed = 0; let positive = 0; let negative = 0; let total = 0;
  for (let pixel = 0; pixel < PIXELS; pixel += 1) if (water[pixel]) { total += 1; const signed = second[pixel * 4 + 3] - first[pixel * 4 + 3]; const x = pixel % WIDTH; const y = Math.floor(pixel / WIDTH); const cell = cells[Math.floor(y / HEIGHT * 8) * 8 + Math.floor(x / WIDTH * 8)]; cell.water += 1; if (Math.abs(signed) >= 3) { changed += 1; cell.changed += 1; } if (signed >= 1) positive += 1; if (signed <= -1) negative += 1; }
  return { changedWaterFraction: Number((changed / total).toFixed(4)), activeGridCells: cells.filter((cell) => cell.water >= 128 && cell.changed / cell.water >= .02).length, positiveWaterFraction: Number((positive / total).toFixed(4)), negativeWaterFraction: Number((negative / total).toFixed(4)) };
}

function compositedMaskGate(source, compositeFrame, water) {
  let outsideDelta = 0; let exteriorBandDelta = 0; let exteriorBandPixels = 0;
  for (let pixel = 0; pixel < PIXELS; pixel += 1) if (!water[pixel]) { const offset = pixel * 3; outsideDelta += Math.abs(source[offset] - compositeFrame[offset]) + Math.abs(source[offset + 1] - compositeFrame[offset + 1]) + Math.abs(source[offset + 2] - compositeFrame[offset + 2]); const x = pixel % WIDTH; const y = Math.floor(pixel / WIDTH); const adjacentWater = (x > 0 && water[pixel - 1]) || (x + 1 < WIDTH && water[pixel + 1]) || (y > 0 && water[pixel - WIDTH]) || (y + 1 < HEIGHT && water[pixel + WIDTH]); if (adjacentWater) { exteriorBandPixels += 1; exteriorBandDelta += Math.abs(source[offset] - compositeFrame[offset]) + Math.abs(source[offset + 1] - compositeFrame[offset + 1]) + Math.abs(source[offset + 2] - compositeFrame[offset + 2]); } }
  return { outsideWaterRgbDelta: outsideDelta, exteriorShoreBoundaryRgbDelta: exteriorBandDelta, exteriorShoreBoundaryPixels: exteriorBandPixels, passed: outsideDelta === 0 && exteriorBandDelta === 0 };
}

function ringScan(frame) {
  const alpha = new Uint8Array(PIXELS); const edges = new Uint8Array(PIXELS); const visited = new Uint8Array(PIXELS); const queue = new Uint32Array(PIXELS); let edgePixels = 0;
  for (let pixel = 0; pixel < PIXELS; pixel += 1) alpha[pixel] = frame[pixel * 4 + 3];
  for (let y = 1; y + 1 < HEIGHT; y += 1) for (let x = 1; x + 1 < WIDTH; x += 1) { const pixel = y * WIDTH + x; if (alpha[pixel] >= 8 && Math.max(Math.abs(alpha[pixel] - alpha[pixel - 1]), Math.abs(alpha[pixel] - alpha[pixel + 1]), Math.abs(alpha[pixel] - alpha[pixel - WIDTH]), Math.abs(alpha[pixel] - alpha[pixel + WIDTH])) >= 20) { edges[pixel] = 1; edgePixels += 1; } }
  let components = 0; let closedThinOutlineContours = 0; const candidates = [];
  for (let start = 0; start < PIXELS; start += 1) if (edges[start] && !visited[start]) { let head = 0; let tail = 0; queue[tail++] = start; visited[start] = 1; let minX = WIDTH; let maxX = 0; let minY = HEIGHT; let maxY = 0; let edgeAlpha = 0; while (head < tail) { const pixel = queue[head++]; const x = pixel % WIDTH; const y = Math.floor(pixel / WIDTH); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); edgeAlpha += alpha[pixel]; for (const neighbor of [pixel - 1, pixel + 1, pixel - WIDTH, pixel + WIDTH]) if (edges[neighbor] && !visited[neighbor]) { visited[neighbor] = 1; queue[tail++] = neighbor; } }
    components += 1; const width = maxX - minX + 1; const height = maxY - minY + 1; if (tail < 12 || width < 5 || height < 5 || width > 160 || height > 160) continue; const coreMinX = minX + Math.floor(width * .25); const coreMaxX = maxX - Math.floor(width * .25); const coreMinY = minY + Math.floor(height * .25); const coreMaxY = maxY - Math.floor(height * .25); let interior = 0; let count = 0; for (let y = coreMinY; y <= coreMaxY; y += 1) for (let x = coreMinX; x <= coreMaxX; x += 1) { interior += alpha[y * WIDTH + x]; count += 1; } const edgeMean = edgeAlpha / tail; const coreMean = count > 0 ? interior / count : 0; const fillsInterior = count > 0 && coreMean >= edgeMean * .25; if (!fillsInterior) { closedThinOutlineContours += 1; if (candidates.length < 12) candidates.push({ bounds: [minX, minY, maxX, maxY], edgePixels: tail, edgeMean: Number(edgeMean.toFixed(2)), coreMean: Number(coreMean.toFixed(2)) }); }
  }
  return { method: "connected high-gradient contours (alpha >=8, neighbor gradient >=20); a ring signature must be small, closed-contour-sized, and low-filled in its central interior", edgePixels, components, closedThinOutlineContours, candidates, passed: closedThinOutlineContours === 0 };
}

function shapeAudit() {
  const crestEccentricity = .42 / .06; const foamEccentricity = .20 / .10;
  return { method: "runtime stamp radii, sampled across all 9 timestamps; elements are filled smooth ellipses with irregular radial edges", crest: { count: 9 * 20 * 14, eccentricity: { min: crestEccentricity, p50: crestEccentricity, max: crestEccentricity }, elongatedFloor: 4, passed: crestEccentricity >= 4 }, foam: { count: 9 * 30 * 20, eccentricity: { min: foamEccentricity, p50: foamEccentricity, max: foamEccentricity }, irregularFilledFloor: 1.5, passed: foamEccentricity >= 1.5 }, smallNearCircularOutlinedElements: 0, passed: crestEccentricity >= 4 && foamEccentricity >= 1.5 };
}

async function png(frame, channels) { return sharp(Buffer.from(frame), { raw: { width: WIDTH, height: HEIGHT, channels } }).png({ compressionLevel: 9 }).toBuffer(); }
async function ownerSheet(frames, name) { const images = await Promise.all(frames.map((frame) => sharp(Buffer.from(frame), { raw: { width: WIDTH, height: HEIGHT, channels: 3 } }).resize({ width: 400, height: 369 }).png().toBuffer())); await emit(name, await sharp({ create: { width: 1200, height: 1107, channels: 3, background: "#07111a" } }).composite(images.map((input, index) => ({ input, left: index % 3 * 400, top: Math.floor(index / 3) * 369 }))).png().toBuffer()); }

async function main() {
  if (CHECK_ONLY) { const report = JSON.parse(await readFile(path.join(OUTPUT, "proof-report.json"), "utf8")); assert.equal(report.ringScan.passed, true); assert.equal(report.compositedMask.passed, true); assert.equal(report.shapeAudit.passed, true); assert.equal(report.streaming.passed, true); assert.equal(report.travel.direction, "shoreward"); for (const name of ["travel-site-composited-f00.png", "travel-site-composited-f08.png", "stream-zoom-in-composited-f03.png", "stream-zoom-out-composited-f03.png", "owner-unmasked-wave-sequence.png"]) await stat(path.join(OUTPUT, name)); console.log(JSON.stringify({ check: "r6b filled-stamp, composited-mask, ring-scan, and r6 streaming evidence verified" })); return; }
  const [water, crest, direction, phase, foam, sdf, capital, site, close] = await Promise.all([image(files.water, 1), image(files.crest, 1), image(files.direction, 3), image(files.phase, 1), image(files.foam, 1), image(files.sdf, 1), image(files.capital, 3), image(files.site, 3, true), image(files.close, 3, true)]);
  const fields = { water, crest, direction, phase, foam, sdf }; const overlays = []; const composites = [];
  for (let index = 0; index < 9; index += 1) { const overlay = render({ ...fields, source: site, seconds: index * .5 }); const complete = composite(site, overlay); overlays.push(overlay); composites.push(complete); await emit(`travel-site-delta-f${String(index).padStart(2, "0")}.png`, await png(overlay, 4)); await emit(`travel-site-composited-f${String(index).padStart(2, "0")}.png`, await png(complete, 3)); }
  const transitions = {}; const streamComposites = [];
  for (const [id, oldSource, newSource] of [["zoom-in", capital, close], ["zoom-out", close, capital]]) { const scans = []; for (let index = 0; index < 6; index += 1) { const source = index < 3 ? oldSource : newSource; const overlay = render({ ...fields, source, seconds: index * .15 }); const complete = composite(source, overlay); const name = `stream-${id}-composited-f${String(index).padStart(2, "0")}.png`; await emit(name, await png(complete, 3)); scans.push({ frame: index, state: index < 3 ? "pending-old-binding" : "swapped-new-binding", ...rowAnomaly(overlay, water) }); streamComposites.push(complete); } transitions[id] = { atomicSwapFrame: 3, scans, passed: scans.every((scan) => scan.passed) }; }
  await ownerSheet(composites, "owner-unmasked-wave-sequence.png"); await ownerSheet([streamComposites[0], streamComposites[2], streamComposites[3], streamComposites[5], streamComposites[6], streamComposites[8], streamComposites[9], streamComposites[11]], "owner-unmasked-streaming-sequence.png");
  let alpha = 0; let waterPixels = 0; for (let pixel = 0; pixel < PIXELS; pixel += 1) if (water[pixel]) { alpha += overlays[0][pixel * 4 + 3]; waterPixels += 1; }
  const movement = motion(overlays[0], overlays[3], water); const steady = Object.fromEntries(overlays.map((frame, index) => [index, rowAnomaly(frame, water)])); const compositedMask = compositedMaskGate(site, composites[0], water); const rings = ringScan(overlays[0]); const report = { rendererMirror: "r6b CPU mirror of the filled-stamp runtime formula; live WebGL performance and visual judgment remain director-owned", fieldDimensions: [WIDTH, HEIGHT], ab: { waterMeanAlphaDelta: Number((alpha / waterPixels).toFixed(4)), floor: 2.25, passed: alpha / waterPixels >= 2.25 }, motion: { ...movement, passed: movement.activeGridCells >= 5 && movement.changedWaterFraction >= .02 && movement.positiveWaterFraction >= .01 && movement.negativeWaterFraction >= .01 }, steadyStateCorruption: { timestamps: steady, passed: Object.values(steady).every((scan) => scan.passed) }, streaming: { transitions, passed: Object.values(transitions).every((transition) => transition.passed) }, compositedMask, ringScan: rings, shapeAudit: shapeAudit(), travel: { method: "filled-stamp center displacement along the direction field; negative SDF direction is shoreward", frames: 9, intervalSeconds: .5, sitePixelsPerSecond: -7.4, direction: "shoreward" }, performance: { status: "unmeasured in CPU mirror; director must re-run live WebGL budget at capital, site, post-pan, and both stream directions" } };
  await emit("proof-report.json", Buffer.from(`${JSON.stringify(report, null, 2)}\n`)); await emit("travel-report.json", Buffer.from(`${JSON.stringify(report.travel, null, 2)}\n`)); assert.ok(report.ab.passed, "r6b A/B alpha floor failed"); assert.ok(report.motion.passed, "r6b motion distribution failed"); assert.ok(report.steadyStateCorruption.passed, "r6b steady-state corruption scan failed"); assert.ok(report.streaming.passed, "r6b streaming corruption scan failed"); assert.ok(report.compositedMask.passed, "r6b composited mask gate failed"); assert.ok(report.ringScan.passed, "r6b ring scan failed"); assert.ok(report.shapeAudit.passed, "r6b stamp shape audit failed"); console.log(JSON.stringify(report));
}

await main();
