#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const SCRIPT_PATH = "scripts/extract-ninjaone-foliage-isolation-crops.mjs";
const CLIP = Object.freeze({ height: 193, left: 209, top: 112, width: 265 });

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") return { help: true };
    if (!argument.startsWith("--") || !argv[index + 1]) {
      throw new Error(`Invalid argument ${argument}.`);
    }
    options[argument.slice(2)] = argv[index + 1];
    index += 1;
  }
  return options;
}

function usage() {
  return "Usage: node scripts/extract-ninjaone-foliage-isolation-crops.mjs --evidence <json> --output <json> --proof-dir <directory>";
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex").toUpperCase();
}

export async function extractNinjaOneFoliageIsolationCrops(options) {
  const root = path.resolve(options.root ?? process.cwd());
  if (!options.evidence || !options.output || !options["proof-dir"]) {
    throw new Error("--evidence, --output, and --proof-dir are required.");
  }
  const evidencePath = path.resolve(root, options.evidence);
  const evidenceDirectory = path.dirname(evidencePath);
  const outputPath = path.resolve(root, options.output);
  const proofDirectory = path.resolve(root, options["proof-dir"]);
  const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
  const frames = [
    ...(evidence.foliageProof?.normalFrames ?? []).map((imagePath, index) => ({
      id: `normal-${index + 1}`,
      imagePath,
    })),
    ...(evidence.foliageProof?.forcedStates ?? []).map(({ imagePath, progress }) => ({
      id: `forced-${Math.round(progress * 100)}`,
      imagePath,
    })),
  ];
  if (frames.length !== 5) throw new Error("Foliage evidence must contain 3 normal and 2 forced frames.");
  await mkdir(proofDirectory, { recursive: true });
  const crops = [];
  for (const frame of frames) {
    const sourcePath = path.resolve(evidenceDirectory, frame.imagePath);
    const metadata = await sharp(sourcePath).metadata();
    if (metadata.width !== 1440 || metadata.height !== 900) {
      throw new Error(`${frame.id} is not a 1440x900 source frame.`);
    }
    const outputFile = path.join(
      proofDirectory,
      `${path.basename(sourcePath, ".png")}-trail-conifer-scene-crop.png`,
    );
    await sharp(sourcePath).extract(CLIP).png().toFile(outputFile);
    crops.push(Object.freeze({
      clip: CLIP,
      frameId: frame.id,
      imagePath: path.relative(path.dirname(outputPath), outputFile).replaceAll("\\", "/"),
      imageSha256: await sha256(outputFile),
      resampling: "none-native-screenshot-pixels",
      sourceImagePath: path.relative(path.dirname(outputPath), sourcePath).replaceAll("\\", "/"),
      sourceImageSha256: await sha256(sourcePath),
    }));
  }
  const result = Object.freeze({
    crops: Object.freeze(crops),
    evidencePath: path.relative(path.dirname(outputPath), evidencePath).replaceAll("\\", "/"),
    evidenceSha256: await sha256(evidencePath),
    fixedCamera: evidence.foliageProof.fixedCamera,
    producer: Object.freeze({
      id: "ninjaone-foliage-isolation-scene-crop-r1",
      scriptPath: SCRIPT_PATH,
      scriptSha256: await sha256(path.resolve(root, SCRIPT_PATH)),
    }),
    schemaVersion: 1,
  });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  return Object.freeze({ outputPath, result });
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
      process.stdout.write(`${usage()}\n`);
      return;
    }
    const { outputPath } = await extractNinjaOneFoliageIsolationCrops(options);
    process.stdout.write(`${JSON.stringify({ outputPath }, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  await main();
}
