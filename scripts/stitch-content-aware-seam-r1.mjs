#!/usr/bin/env node
/**
 * Content-aware overlap stitcher r1.
 *
 * Future city/canon/boundary-strip recipe (T43): call this tool for every
 * overlapping generated pair. `--method content-aware` is the default and
 * routes a continuous Efros-Freeman minimum-error boundary through the actual
 * overlap; `--method rect-feather` remains the explicit fallback for a known
 * low-difference overlap. Do not use this to alter mounted artwork.
 *
 * Cost at each registered overlap pixel p is:
 *   C(p) = ||left.rgb(p) - right.rgb(p)||_2 / (255 * sqrt(3))
 *        + gradientWeight * |grad(left, p) - grad(right, p)| / (255 * sqrt(2))
 * The minimum-energy 8-connected path is solved with dynamic programming.
 * Ties are resolved in stable straight/up/left order (there is no random
 * tie-breaker); `--seed` is recorded for recipe provenance and future parity.
 * A narrow smoothstep feather is applied only across the routed path.
 *
 * Example:
 * node scripts/stitch-content-aware-seam-r1.mjs --left a.png --right b.png \
 *   --left-origin 0,0 --right-origin 760,0 --out stitch.png \
 *   --seam-json seam.json --overlay seam-overlay.png --check
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const EPSILON = 1e-12;

export function parsePair(value, flag) {
  const parts = String(value ?? "").split(",").map(Number);
  assert.equal(parts.length, 2, `${flag} must be x,y`);
  assert(parts.every(Number.isFinite), `${flag} must contain finite numbers`);
  assert(parts.every(Number.isInteger), `${flag} must contain integer pixels`);
  return parts;
}

export function overlapRect(left, right) {
  const rect = {
    left: Math.max(left.left, right.left), top: Math.max(left.top, right.top),
    right: Math.min(left.right, right.right), bottom: Math.min(left.bottom, right.bottom),
  };
  assert(rect.left < rect.right && rect.top < rect.bottom, "images do not overlap");
  return rect;
}

function rgbIndex(width, x, y) { return (y * width + x) * 3; }
function luminance(data, width, height, x, y) {
  const px = Math.max(0, Math.min(width - 1, x)); const py = Math.max(0, Math.min(height - 1, y));
  const i = rgbIndex(width, px, py); return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
}
function gradient(data, width, height, x, y) {
  const gx = luminance(data, width, height, x + 1, y) - luminance(data, width, height, x - 1, y);
  const gy = luminance(data, width, height, x, y + 1) - luminance(data, width, height, x, y - 1);
  return Math.hypot(gx, gy);
}

export function buildCostSurface(left, right, overlap, gradientWeight = 0.35) {
  assert(gradientWeight >= 0 && Number.isFinite(gradientWeight), "gradientWeight must be >= 0");
  const width = overlap.right - overlap.left; const height = overlap.bottom - overlap.top;
  const values = new Float64Array(width * height);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const globalX = overlap.left + x; const globalY = overlap.top + y;
    const leftX = globalX - left.rect.left; const leftY = globalY - left.rect.top;
    const rightX = globalX - right.rect.left; const rightY = globalY - right.rect.top;
    const li = rgbIndex(left.width, leftX, leftY); const ri = rgbIndex(right.width, rightX, rightY);
    const color = Math.hypot(left.data[li] - right.data[ri], left.data[li + 1] - right.data[ri + 1], left.data[li + 2] - right.data[ri + 2]) / (255 * Math.sqrt(3));
    const gradientDelta = Math.abs(gradient(left.data, left.width, left.height, leftX, leftY) - gradient(right.data, right.width, right.height, rightX, rightY)) / (255 * Math.sqrt(2));
    values[y * width + x] = color + gradientWeight * gradientDelta;
  }
  return { width, height, values };
}

// Minimum path across rows: exactly one x per y, 8-connected and top-to-bottom.
export function minimumVerticalSeam(surface) {
  const { width, height, values } = surface; assert(width > 0 && height > 0, "empty cost surface");
  const costs = new Float64Array(width * height); const parent = new Int32Array(width * height); parent.fill(-1);
  for (let x = 0; x < width; x += 1) costs[x] = values[x];
  for (let y = 1; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    let bestX = x; let bestCost = costs[(y - 1) * width + x];
    // Stable tie order: straight, then left, then right.
    for (const candidate of [x - 1, x + 1]) if (candidate >= 0 && candidate < width) {
      const candidateCost = costs[(y - 1) * width + candidate];
      if (candidateCost < bestCost - EPSILON) { bestCost = candidateCost; bestX = candidate; }
    }
    const index = y * width + x; costs[index] = values[index] + bestCost; parent[index] = bestX;
  }
  let endX = 0; let totalCost = costs[(height - 1) * width];
  for (let x = 1; x < width; x += 1) if (costs[(height - 1) * width + x] < totalCost - EPSILON) { endX = x; totalCost = costs[(height - 1) * width + x]; }
  const points = new Array(height); let x = endX;
  for (let y = height - 1; y >= 0; y -= 1) { points[y] = [x, y]; x = parent[y * width + x]; }
  return { orientation: "vertical", points, totalCost };
}

export function transposeSurface(surface) {
  const values = new Float64Array(surface.values.length);
  for (let y = 0; y < surface.height; y += 1) for (let x = 0; x < surface.width; x += 1) values[x * surface.height + y] = surface.values[y * surface.width + x];
  return { width: surface.height, height: surface.width, values };
}

export function minimumErrorSeam(surface, orientation) {
  if (orientation === "vertical") return minimumVerticalSeam(surface);
  assert.equal(orientation, "horizontal", "orientation must be vertical or horizontal");
  const seam = minimumVerticalSeam(transposeSurface(surface));
  return { orientation: "horizontal", totalCost: seam.totalCost, points: seam.points.map(([y, x]) => [x, y]) };
}

export function chooseOrientation(overlap) {
  // A left/right pair has a narrow vertical strip; a top/bottom pair has a narrow horizontal strip.
  return (overlap.right - overlap.left) <= (overlap.bottom - overlap.top) ? "vertical" : "horizontal";
}

function smoothstep(value) { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); }
function readPixel(image, globalX, globalY) {
  const x = globalX - image.rect.left; const y = globalY - image.rect.top;
  const i = rgbIndex(image.width, x, y); return [image.data[i], image.data[i + 1], image.data[i + 2]];
}
function inRect(rect, x, y) { return x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom; }

export function compositeWithSeam(left, right, overlap, seam, featherPixels = 4) {
  assert(Number.isInteger(featherPixels) && featherPixels >= 0, "featherPixels must be a non-negative integer");
  const rect = { left: Math.min(left.rect.left, right.rect.left), top: Math.min(left.rect.top, right.rect.top), right: Math.max(left.rect.right, right.rect.right), bottom: Math.max(left.rect.bottom, right.rect.bottom) };
  const width = rect.right - rect.left; const height = rect.bottom - rect.top; const output = Buffer.alloc(width * height * 3);
  const seamAt = seam.orientation === "vertical" ? new Map(seam.points.map(([x, y]) => [overlap.top + y, overlap.left + x])) : new Map(seam.points.map(([x, y]) => [overlap.left + x, overlap.top + y]));
  const half = featherPixels / 2;
  for (let y = rect.top; y < rect.bottom; y += 1) for (let x = rect.left; x < rect.right; x += 1) {
    const inLeft = inRect(left.rect, x, y); const inRight = inRect(right.rect, x, y); let weight = inRight ? 1 : 0;
    if (inLeft && inRight) {
      const axis = seam.orientation === "vertical" ? x - seamAt.get(y) : y - seamAt.get(x);
      weight = featherPixels === 0 ? (axis > 0 ? 1 : 0) : smoothstep((axis + half) / Math.max(1, featherPixels));
    }
    const a = inLeft ? readPixel(left, x, y) : [0, 0, 0]; const b = inRight ? readPixel(right, x, y) : [0, 0, 0];
    const i = rgbIndex(width, x - rect.left, y - rect.top);
    for (let channel = 0; channel < 3; channel += 1) output[i + channel] = Math.round(a[channel] * (1 - weight) + b[channel] * weight);
  }
  return { data: output, width, height, rect };
}

export function rectFeatherSeam(overlap, orientation) {
  if (orientation === "vertical") return { orientation, totalCost: null, points: Array.from({ length: overlap.bottom - overlap.top }, (_, y) => [Math.floor((overlap.right - overlap.left - 1) / 2), y]) };
  return { orientation, totalCost: null, points: Array.from({ length: overlap.right - overlap.left }, (_, x) => [x, Math.floor((overlap.bottom - overlap.top - 1) / 2)]) };
}

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function usage() { return "Usage: node scripts/stitch-content-aware-seam-r1.mjs --left LEFT.png --right RIGHT.png --left-origin X,Y --right-origin X,Y --out OUTPUT.png --seam-json PATH.json --overlay PATH.png [--method content-aware|rect-feather] [--gradient-weight 0.35] [--feather 4] [--seed T43-r1] [--check]"; }
function required(args, name) { const value = args.get(name); assert(value, `missing --${name}; ${usage()}`); return value; }
function cliArgs(argv) { const args = new Map(); for (let i = 0; i < argv.length; i += 1) { const token = argv[i]; assert(token.startsWith("--"), `unexpected argument ${token}`); const name = token.slice(2); if (name === "check") args.set(name, true); else { assert(i + 1 < argv.length, `missing value for ${token}`); args.set(name, argv[i + 1]); i += 1; } } return args; }
async function loadImage(file, origin) { const raw = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true }); assert.equal(raw.info.channels, 3, `${file} must decode to RGB`); return { data: raw.data, width: raw.info.width, height: raw.info.height, rect: { left: origin[0], top: origin[1], right: origin[0] + raw.info.width, bottom: origin[1] + raw.info.height }, path: file, sha256: sha256(await readFile(file)) }; }
function seamSvg(composite, overlap, seam) {
  const points = seam.points.map(([x, y]) => `${overlap.left + x - composite.rect.left},${overlap.top + y - composite.rect.top}`).join(" ");
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${composite.width}" height="${composite.height}"><rect x="${overlap.left - composite.rect.left}" y="${overlap.top - composite.rect.top}" width="${overlap.right - overlap.left}" height="${overlap.bottom - overlap.top}" fill="none" stroke="#ff3bd5" stroke-width="2"/><polyline points="${points}" fill="none" stroke="#fff24a" stroke-width="2" stroke-linejoin="round"/></svg>`);
}

async function main() {
  const args = cliArgs(process.argv.slice(2));
  const method = args.get("method") ?? "content-aware"; assert(["content-aware", "rect-feather"].includes(method), "--method must be content-aware or rect-feather");
  const left = await loadImage(required(args, "left"), parsePair(required(args, "left-origin"), "--left-origin"));
  const right = await loadImage(required(args, "right"), parsePair(required(args, "right-origin"), "--right-origin"));
  const overlap = overlapRect(left.rect, right.rect); const orientation = chooseOrientation(overlap);
  const gradientWeight = Number(args.get("gradient-weight") ?? 0.35); const featherPixels = Number(args.get("feather") ?? 4); const seed = args.get("seed") ?? "content-aware-seam-r1";
  assert(Number.isInteger(featherPixels) && featherPixels >= 0, "--feather must be a non-negative integer");
  const surface = buildCostSurface(left, right, overlap, gradientWeight);
  const seam = method === "content-aware" ? minimumErrorSeam(surface, orientation) : rectFeatherSeam(overlap, orientation);
  const absolutePoints = seam.points.map(([x, y]) => [overlap.left + x, overlap.top + y]);
  const valid = seam.orientation === "vertical"
    ? absolutePoints.length === overlap.bottom - overlap.top && absolutePoints.every(([x, y], index) => x >= overlap.left && x < overlap.right && y === overlap.top + index && (index === 0 || Math.abs(x - absolutePoints[index - 1][0]) <= 1))
    : absolutePoints.length === overlap.right - overlap.left && absolutePoints.every(([x, y], index) => x === overlap.left + index && y >= overlap.top && y < overlap.bottom && (index === 0 || Math.abs(y - absolutePoints[index - 1][1]) <= 1));
  assert(valid, "computed seam path is not continuous or inside the overlap");
  const composite = compositeWithSeam(left, right, overlap, seam, featherPixels);
  const out = required(args, "out"); const seamJson = required(args, "seam-json"); const overlay = required(args, "overlay");
  const png = await sharp(composite.data, { raw: { width: composite.width, height: composite.height, channels: 3 } }).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
  const visualization = await sharp(png).composite([{ input: seamSvg(composite, overlap, seam) }]).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
  const artifact = { schemaVersion: 1, tool: "stitch-content-aware-seam-r1", method, seed, deterministicTieBreak: "straight-then-negative-then-positive; no randomness", inputs: { left: { path: left.path, sha256: left.sha256, origin: [left.rect.left, left.rect.top], dimensions: [left.width, left.height] }, right: { path: right.path, sha256: right.sha256, origin: [right.rect.left, right.rect.top], dimensions: [right.width, right.height] } }, overlap: [overlap.left, overlap.top, overlap.right, overlap.bottom], orientation, cost: { color: "euclidean RGB normalized by 255*sqrt(3)", gradient: "absolute luminance-gradient magnitude difference normalized by 255*sqrt(2)", gradientWeight }, featherPixels, path: { points: absolutePoints, totalCost: seam.totalCost, continuousWithinOverlap: true, endpointsOnOverlapEdges: true }, outputs: { composite: out, visualization: overlay, compositeSha256: sha256(png), visualizationSha256: sha256(visualization) } };
  const json = Buffer.from(`${JSON.stringify(artifact, null, 2)}\n`);
  if (args.get("check")) { assert.deepEqual(await readFile(out), png, `--check mismatch: ${out}`); assert.deepEqual(await readFile(seamJson), json, `--check mismatch: ${seamJson}`); assert.deepEqual(await readFile(overlay), visualization, `--check mismatch: ${overlay}`); } else { await Promise.all([out, seamJson, overlay].map((file) => mkdir(path.dirname(file), { recursive: true }))); await Promise.all([writeFile(out, png), writeFile(seamJson, json), writeFile(overlay, visualization)]); }
  process.stdout.write(`${JSON.stringify({ method, orientation, overlap: artifact.overlap, seamPoints: absolutePoints.length, totalCost: seam.totalCost, out })}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch((error) => { console.error(error.stack ?? error); process.exitCode = 1; });
