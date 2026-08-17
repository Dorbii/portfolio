#!/usr/bin/env node

import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(
  root,
  "art-source/career-world/ninjaone-capital/city-nodes-r2/intent",
);
const outputRoot = path.join(
  root,
  "public/career-world/capitals/ninjaone/city-nodes-r2/proof/d06",
);
const crop = Object.freeze({ height: 290, left: 665, top: 796, width: 783 });
const sources = Object.freeze([
  Object.freeze({ input: "D06-mask.png", output: "station-rail-mask.png" }),
  Object.freeze({
    input: "D06-station-rail-transition-fringe.png",
    output: "station-rail-transition-fringe.png",
  }),
]);

await mkdir(outputRoot, { recursive: true });
for (const source of sources) {
  const input = path.join(sourceRoot, source.input);
  const output = path.join(outputRoot, source.output);
  const bytes = await readFile(input);
  const metadata = await sharp(bytes).metadata();
  if (metadata.width !== 1448 || metadata.height !== 1086) {
    throw new TypeError(`${source.input} must match the fixed 1448x1086 parent artboard.`);
  }
  await sharp(bytes)
    .extract(crop)
    .png({ adaptiveFiltering: true, compressionLevel: 9, palette: false })
    .toFile(output);
}

process.stdout.write("Built bounded D06 station proof masks without visible district-plate art.\n");
