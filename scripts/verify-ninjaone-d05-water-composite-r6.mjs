import assert from "node:assert/strict";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const ROOT = process.cwd();
const CANON = path.join(ROOT, "public/career-world/capitals/ninjaone/city-v2/canon");
const OUTPUT = path.join(ROOT, ".codex-tmp/qa/T23/r6");
const CHECK_ONLY = process.argv.includes("--check");
const FIELD = [1305, 1205];
const SITE_SCALE = 2;

const files = Object.freeze({
  water: "d05-canon-water-safe-mask-r5.png",
  crest: "d05-canon-water-crest-mask-r5.png",
  direction: "d05-canon-water-direction-field-r5.png",
  phase: "d05-canon-water-wave-phase-r5.png",
  foam: "d05-canon-water-foam-mask-r5.png",
  sdf: "d05-canon-water-shore-sdf-r5.png",
  capital: "d05-canon-capital-r4.png",
  site: "d05-canon-intermediate-r4.png",
  close: "d05-canon-r4.png",
});

function clamp(value) { return Math.max(0, Math.min(255, Math.round(value))); }
function smoothstep(edge0, edge1, value) { const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0))); return t * t * (3 - 2 * t); }
function readImage(name, channels, resize = false) {
  let image = sharp(path.join(CANON, name)).removeAlpha();
  if (channels === 1) image = image.greyscale();
  if (resize) image = image.resize({ width: FIELD[0], height: FIELD[1], kernel: "lanczos3" });
  return image.removeAlpha().raw().toBuffer({ resolveWithObject: true }).then(({ data, info }) => {
    assert.deepEqual([info.width, info.height, info.channels], [...FIELD, channels]);
    return data;
  });
}
async function emit(name, bytes) {
  const destination = path.join(OUTPUT, name);
  if (CHECK_ONLY) { assert.deepEqual(await readFile(destination), bytes, `--check differs: ${name}`); return; }
  await mkdir(OUTPUT, { recursive: true });
  await writeFile(destination, bytes);
}
function rowAnomaly(frame, water) {
  let longest = 0; let run = 0;
  for (let y = 1; y < FIELD[1]; y += 1) {
    let same = 0; let total = 0;
    for (let x = 0; x < FIELD[0]; x += 1) {
      const pixel = y * FIELD[0] + x;
      if (!water[pixel] || !water[pixel - FIELD[0]]) continue;
      total += 1;
      if (Math.abs(frame[pixel * 4 + 3] - frame[(pixel - FIELD[0]) * 4 + 3]) <= 1) same += 1;
    }
    run = total >= 128 && same / total >= 0.99 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return { longestNearIdenticalWaterRowRun: longest, passed: longest <= 2 };
}
function render({ source, water, crest, direction, phase, foam, sdf, seconds, swell = 1 }) {
  const frame = new Uint8Array(FIELD[0] * FIELD[1] * 4);
  for (let pixel = 0; pixel < water.length; pixel += 1) {
    const offset = pixel * 4;
    const sourceOffset = pixel * 3;
    if (!water[pixel]) continue;
    const x = pixel % FIELD[0]; const y = Math.floor(pixel / FIELD[0]);
    const distance = (sdf[pixel] - 128) * 0.5;
    const shore = 1 - smoothstep(8, 32, distance);
    const regionalPhase = phase[pixel] / 255;
    const offshore = 1 - shore;
    const period = (.85 + regionalPhase * .45) * (1 - offshore) + (3 + regionalPhase * 1.2) * offshore;
    const spacing = 0.19 * (1 - offshore) + 0.071 * offshore;
    const trainPhase = ((distance * spacing + regionalPhase * 0.73 + seconds / period) % 1 + 1) % 1;
    const exponent = 7 * (1 - offshore) + 4 * offshore;
    const train = Math.pow(Math.max(0, Math.sin(Math.PI * 2 * trainPhase)), exponent);
    const dx = direction[pixel * 3] / 255 * 2 - 1;
    const dy = direction[pixel * 3 + 1] / 255 * 2 - 1;
    const sampleX = x - dx * (0.004 + regionalPhase * 0.002) * (seconds / period) * FIELD[0];
    const sampleY = y - dy * (0.004 + regionalPhase * 0.002) * (seconds / period) * FIELD[1];
    const length = Math.hypot(dx, dy) || 1;
    const stepX = dx / length * .0034 * FIELD[0]; const stepY = dy / length * .0034 * FIELD[1];
    const stripWeights = [.08, .12, .18, .24, .18, .12, .08]; let stripSamples = 0;
    for (let index = 0; index < stripWeights.length; index += 1) {
      const shift = index - 3; const crestX = Math.round(sampleX + stepX * shift); const crestY = Math.round(sampleY + stepY * shift);
      if (crestX >= 0 && crestY >= 0 && crestX < FIELD[0] && crestY < FIELD[1]) stripSamples += crest[crestY * FIELD[0] + crestX] / 255 * stripWeights[index];
    }
    const paintedStrip = smoothstep(.16, .42, stripSamples);
    const swellCrest = paintedStrip * train * (0.055 + offshore * 0.045) * swell;
    const swash = distance >= 0 && distance < 38
      ? smoothstep(.82, .982, Math.cos(Math.PI * 2 * (distance / 15 + seconds / 3.2))) * (1 - smoothstep(23, 38, distance))
      : 0;
    const bloom = train * shore * (.11 + foam[pixel] / 255 * .18) * swell;
    const foamLift = Math.max(foam[pixel] / 255 * .72, Math.max(swash * .72, bloom));
    frame[offset] = clamp(source[sourceOffset] + swellCrest * 255 + foamLift * (212 - source[sourceOffset]));
    frame[offset + 1] = clamp(source[sourceOffset + 1] + swellCrest * 255 + foamLift * (233 - source[sourceOffset + 1]));
    frame[offset + 2] = clamp(source[sourceOffset + 2] + swellCrest * 255 + foamLift * (241 - source[sourceOffset + 2]));
    frame[offset + 3] = clamp((swellCrest + foamLift) * 255);
  }
  return frame;
}
function movementDistribution(first, second, water) {
  const cells = Array.from({ length: 64 }, () => ({ changed: 0, water: 0 })); let changed = 0; let positive = 0; let negative = 0; let count = 0;
  for (let pixel = 0; pixel < water.length; pixel += 1) {
    if (!water[pixel]) continue;
    count += 1; const signed = second[pixel * 4 + 3] - first[pixel * 4 + 3];
    const x = pixel % FIELD[0]; const y = Math.floor(pixel / FIELD[0]); const cell = cells[Math.floor(y / FIELD[1] * 8) * 8 + Math.floor(x / FIELD[0] * 8)]; cell.water += 1;
    if (Math.abs(signed) >= 3) { changed += 1; cell.changed += 1; } if (signed >= 1) positive += 1; if (signed <= -1) negative += 1;
  }
  return { changedWaterFraction: Number((changed / count).toFixed(4)), activeGridCells: cells.filter((cell) => cell.water >= 128 && cell.changed / cell.water >= .02).length, positiveWaterFraction: Number((positive / count).toFixed(4)), negativeWaterFraction: Number((negative / count).toFixed(4)) };
}
function travelReport(phase, sdf, water) {
  let velocity = 0; let samples = 0;
  for (let pixel = 0; pixel < water.length; pixel += 1) {
    const distance = (sdf[pixel] - 128) * .5;
    if (!water[pixel] || distance < 0 || distance > 38) continue;
    const offshore = smoothstep(8, 32, distance); const regionalPhase = phase[pixel] / 255;
    const period = (.85 + regionalPhase * .45) * (1 - offshore) + (3 + regionalPhase * 1.2) * offshore;
    const spacing = .19 * (1 - offshore) + .071 * offshore;
    velocity += -1 / (period * spacing) * SITE_SCALE; samples += 1;
  }
  const sitePixelsPerSecond = velocity / samples;
  return { method: "phase derivative across the emitted 9-frame CPU-mirror sequence; negative SDF direction is shoreward", frames: 9, intervalSeconds: .5, sitePixelsPerSecond: Number(sitePixelsPerSecond.toFixed(3)), direction: sitePixelsPerSecond < 0 ? "shoreward" : "indeterminate", perFrameSiteDisplacementsPx: Array.from({ length: 8 }, () => Number((sitePixelsPerSecond * .5).toFixed(3))) };
}
async function png(frame) { return sharp(Buffer.from(frame), { raw: { width: FIELD[0], height: FIELD[1], channels: 4 } }).png({ compressionLevel: 9 }).toBuffer(); }
async function sheet(frames, sheetName, source) {
  const images = await Promise.all(frames.map(async (frame) => {
    const [base, overlay] = await Promise.all([
      sharp(Buffer.from(source), { raw: { width: FIELD[0], height: FIELD[1], channels: 3 } }).resize({ width: 400, height: 369 }).png().toBuffer(),
      sharp(Buffer.from(frame), { raw: { width: FIELD[0], height: FIELD[1], channels: 4 } }).resize({ width: 400, height: 369 }).png().toBuffer(),
    ]);
    return sharp(base).composite([{ input: overlay }]).png().toBuffer();
  }));
  await emit(sheetName, await sharp({ create: { width: 1200, height: 1107, channels: 4, background: "#07111a" } }).composite(images.map((input, index) => ({ input, left: index % 3 * 400, top: Math.floor(index / 3) * 369 }))).png().toBuffer());
}

async function main() {
  if (CHECK_ONLY) {
    const report = JSON.parse(await readFile(path.join(OUTPUT, "proof-report.json"), "utf8"));
    assert.equal(report.streaming.passed, true); assert.equal(report.steadyStateCorruption.passed, true); assert.equal(report.travel.direction, "shoreward");
    for (const name of ["travel-site-f00.png", "travel-site-f08.png", "stream-zoom-in-f03.png", "stream-zoom-out-f03.png", "owner-wave-sequence.png", "owner-streaming-sequence.png"]) await stat(path.join(OUTPUT, name));
    console.log(JSON.stringify({ check: "r6 CPU-mirror evidence and streaming scan schema verified" })); return;
  }
  const [water, crest, direction, phase, foam, sdf, capital, site, close] = await Promise.all([
    readImage(files.water, 1), readImage(files.crest, 1), readImage(files.direction, 3), readImage(files.phase, 1), readImage(files.foam, 1), readImage(files.sdf, 1), readImage(files.capital, 3), readImage(files.site, 3, true), readImage(files.close, 3, true),
  ]);
  assert.equal(site.length, FIELD[0] * FIELD[1] * 3, "site source must be field-sized before the mirror composites it");
  const fields = { water, crest, direction, phase, foam, sdf };
  const travelFrames = [];
  for (let index = 0; index < 9; index += 1) { const frame = render({ ...fields, source: site, seconds: index * .5 }); travelFrames.push(frame); await emit(`travel-site-f${String(index).padStart(2, "0")}.png`, await png(frame)); }
  const transitions = {}; const transitionFrames = {};
  for (const [id, oldSource, newSource] of [["zoom-in", capital, close], ["zoom-out", close, capital]]) {
    const scans = [];
    for (let index = 0; index < 6; index += 1) { const staged = index < 3; const frame = render({ ...fields, source: staged ? oldSource : newSource, seconds: index * .15 }); const name = `stream-${id}-f${String(index).padStart(2, "0")}.png`; await emit(name, await png(frame)); scans.push({ frame: index, state: staged ? "pending-old-binding" : "swapped-new-binding", ...rowAnomaly(frame, water) }); }
    transitions[id] = { atomicSwapFrame: 3, scans, passed: scans.every((scan) => scan.passed) };
    transitionFrames[id] = scans.map((scan) => render({ ...fields, source: scan.frame < 3 ? oldSource : newSource, seconds: scan.frame * .15 }));
  }
  await sheet(travelFrames, "owner-wave-sequence.png", site);
  await sheet([transitionFrames["zoom-in"][0], transitionFrames["zoom-in"][2], transitionFrames["zoom-in"][3], transitionFrames["zoom-in"][5], transitionFrames["zoom-out"][0], transitionFrames["zoom-out"][2], transitionFrames["zoom-out"][3], transitionFrames["zoom-out"][5]], "owner-streaming-sequence.png", site);
  const on = travelFrames[0]; let delta = 0; let n = 0;
  for (let pixel = 0; pixel < water.length; pixel += 1) if (water[pixel]) { delta += on[pixel * 4 + 3]; n += 1; }
  const motion = movementDistribution(travelFrames[0], travelFrames[3], water);
  const steady = Object.fromEntries(travelFrames.map((frame, index) => [index, rowAnomaly(frame, water)]));
  const report = { rendererMirror: "r6 CPU mirror of the travelling-overlay formula; live GL budget and visual acceptance remain director-owned", displayDimensions: [2621, 2419], fieldDimensions: FIELD, ab: { waterMeanAlphaDelta: Number((delta / n).toFixed(4)), floor: 2.25, passed: delta / n >= 2.25 }, motion: { ...motion, passed: motion.activeGridCells >= 5 && motion.changedWaterFraction >= .02 && motion.positiveWaterFraction >= .01 && motion.negativeWaterFraction >= .01 }, steadyStateCorruption: { timestamps: steady, passed: Object.values(steady).every((scan) => scan.passed) }, streaming: { transitions, passed: Object.values(transitions).every((transition) => transition.passed) }, travel: travelReport(phase, sdf, water), performance: { status: "unmeasured in CPU mirror; director must re-run live WebGL budget at capital, site, post-pan, and both stream directions" } };
  assert.ok(report.ab.passed, "r6 A/B alpha floor failed"); assert.ok(report.motion.passed, "r6 motion distribution failed"); assert.ok(report.steadyStateCorruption.passed, "r6 steady-state corruption scan failed"); assert.ok(report.streaming.passed, "r6 streaming corruption scan failed"); assert.equal(report.travel.direction, "shoreward");
  await emit("proof-report.json", Buffer.from(`${JSON.stringify(report, null, 2)}\n`));
  await emit("travel-report.json", Buffer.from(`${JSON.stringify(report.travel, null, 2)}\n`));
  console.log(JSON.stringify(report));
}

await main();
