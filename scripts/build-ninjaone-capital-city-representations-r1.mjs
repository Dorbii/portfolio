#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const sourceDirectory = path.join(
  root,
  "art-source/career-world/ninjaone-capital/city-nodes-r2/proxies",
);
const trimmedSourcePath = path.join(
  sourceDirectory,
  "P01-territory-city-proxy-r1-alpha.png",
);
const fullSourcePath = path.join(
  sourceDirectory,
  "P01-territory-city-proxy-r1-alpha-full.png",
);
const territoryOutputPath = path.join(
  root,
  "public/career-world/capitals/ninjaone/city-representations/territory/P01-territory-city-proxy-r1-alpha.png",
);
const contextOutputPath = path.join(
  root,
  "public/career-world/capitals/ninjaone/city-representations/context/P01-city-context-with-D06-cutout-r1-alpha.png",
);
const d06MaskPath = path.join(
  root,
  "public/career-world/capitals/ninjaone/city-nodes-r2/proof/d06/station-rail-mask.png",
);
const manifestPath = path.join(
  root,
  "public/career-world/capitals/ninjaone/manifests/city-lod-representations-r1.json",
);

const ARTBOARD = Object.freeze([1448, 1086]);
const TRIM_BOUNDS = Object.freeze({ height: 1024, left: 34, top: 40, width: 1386 });
const D06_MASK_BOUNDS = Object.freeze({ height: 290, left: 665, top: 796, width: 783 });
const TERRITORY_MAXIMUM_EDGE = 512;
const CONTEXT_MAXIMUM_EDGE = 1024;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function repositoryPath(absolutePath) {
  return path.relative(root, absolutePath).replaceAll(path.sep, "/");
}

function publicPath(absolutePath) {
  return `/${path.relative(path.join(root, "public"), absolutePath)
    .replaceAll(path.sep, "/")}`;
}

async function rgbaMetadata(bytes, label) {
  const metadata = await sharp(bytes).metadata();
  if (
    metadata.format !== "png"
    || metadata.channels !== 4
    || !metadata.hasAlpha
    || !metadata.width
    || !metadata.height
  ) {
    throw new TypeError(`${label} must be an RGBA PNG.`);
  }
  return metadata;
}

async function assertTransparentCornersAndNoGreenResidual(bytes, label) {
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const cornerOffsets = [
    0,
    (info.width - 1) * 4,
    (info.width * (info.height - 1)) * 4,
    (info.width * info.height - 1) * 4,
  ];
  if (cornerOffsets.some((offset) => data[offset + 3] !== 0)) {
    throw new TypeError(`${label} must keep transparent corners.`);
  }
  for (let offset = 0; offset < data.length; offset += 4) {
    if (
      data[offset + 3] > 0
      && data[offset + 1] > data[offset] * 1.4
      && data[offset + 1] > data[offset + 2] * 1.4
      && data[offset + 1] > 90
    ) {
      throw new TypeError(`${label} contains chroma-green residual pixels.`);
    }
  }
}

async function resizeCleanAndWrite(sourceBytes, outputPath, maximumEdge) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  const resized = await sharp(sourceBytes)
    .resize({
      fit: "inside",
      height: maximumEdge,
      kernel: sharp.kernel.lanczos3,
      width: maximumEdge,
      withoutEnlargement: true,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // Lanczos can leave unassociated RGB values under effectively transparent
  // edge pixels. Clear only alpha 0-2 so delivery does not reintroduce a
  // chroma fringe while preserving every visible authored pixel.
  for (let offset = 0; offset < resized.data.length; offset += 4) {
    const alpha = resized.data[offset + 3];
    if (alpha <= 2) {
      resized.data[offset] = 0;
      resized.data[offset + 1] = 0;
      resized.data[offset + 2] = 0;
      continue;
    }
    const red = Math.min(255, Math.round(resized.data[offset] * 255 / alpha));
    const green = Math.min(255, Math.round(resized.data[offset + 1] * 255 / alpha));
    const blue = Math.min(255, Math.round(resized.data[offset + 2] * 255 / alpha));
    if (green > red * 1.4 && green > blue * 1.4 && green > 90) {
      // The approved source has zero pixels matching this chroma signature;
      // any match after resizing is an interpolation fringe, not authored
      // foliage. Neutralize its green channel without changing alpha.
      resized.data[offset + 1] = Math.max(
        resized.data[offset],
        resized.data[offset + 2],
      );
    }
  }
  await sharp(resized.data, { raw: resized.info })
    .png({ adaptiveFiltering: true, compressionLevel: 9, palette: false })
    .toFile(outputPath);
  const encodedBytes = await readFile(outputPath);
  const encoded = await sharp(encodedBytes).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  let cleaned = false;
  for (let offset = 0; offset < encoded.data.length; offset += 4) {
    if (
      encoded.data[offset + 3] > 0
      && encoded.data[offset + 1] > encoded.data[offset] * 1.4
      && encoded.data[offset + 1] > encoded.data[offset + 2] * 1.4
      && encoded.data[offset + 1] > 90
    ) {
      encoded.data[offset + 1] = Math.max(
        encoded.data[offset],
        encoded.data[offset + 2],
      );
      cleaned = true;
    }
  }
  if (cleaned) {
    await sharp(encoded.data, { raw: encoded.info })
      .png({ adaptiveFiltering: true, compressionLevel: 9, palette: false })
      .toFile(outputPath);
  }
}

const trimmedSourceBytes = await readFile(trimmedSourcePath);
const fullSourceBytes = await readFile(fullSourcePath);
const trimmedMetadata = await rgbaMetadata(trimmedSourceBytes, "P01 trimmed source");
const fullMetadata = await rgbaMetadata(fullSourceBytes, "P01 full-alpha source");
if (
  fullMetadata.width !== ARTBOARD[0]
  || fullMetadata.height !== ARTBOARD[1]
  || trimmedMetadata.width !== TRIM_BOUNDS.width
  || trimmedMetadata.height !== TRIM_BOUNDS.height
) {
  throw new TypeError("P01 dimensions do not match the approved artboard registration.");
}

const registeredCrop = await sharp(fullSourceBytes)
  .extract(TRIM_BOUNDS)
  .ensureAlpha()
  .raw()
  .toBuffer();
const trimmedPixels = await sharp(trimmedSourceBytes).ensureAlpha().raw().toBuffer();
if (!registeredCrop.equals(trimmedPixels)) {
  throw new TypeError("P01 trimmed source no longer matches its registered full-alpha crop.");
}
await assertTransparentCornersAndNoGreenResidual(trimmedSourceBytes, "P01 trimmed source");

const d06MaskBytes = await readFile(d06MaskPath);
const d06MaskMetadata = await sharp(d06MaskBytes).metadata();
if (
  d06MaskMetadata.width !== D06_MASK_BOUNDS.width
  || d06MaskMetadata.height !== D06_MASK_BOUNDS.height
) {
  throw new TypeError("The D06 exclusion mask no longer matches its registered crop.");
}
const fullPixels = await sharp(fullSourceBytes).ensureAlpha().raw().toBuffer();
const maskPixels = await sharp(d06MaskBytes).greyscale().raw().toBuffer();
for (let y = 0; y < D06_MASK_BOUNDS.height; y += 1) {
  for (let x = 0; x < D06_MASK_BOUNDS.width; x += 1) {
    const artboardX = D06_MASK_BOUNDS.left + x;
    const artboardY = D06_MASK_BOUNDS.top + y;
    if (artboardX >= ARTBOARD[0] || artboardY >= ARTBOARD[1]) continue;
    const alphaOffset = (artboardY * ARTBOARD[0] + artboardX) * 4 + 3;
    fullPixels[alphaOffset] = Math.round(
      fullPixels[alphaOffset] * (1 - maskPixels[y * D06_MASK_BOUNDS.width + x] / 255),
    );
    if (fullPixels[alphaOffset] === 0) {
      fullPixels[alphaOffset - 3] = 0;
      fullPixels[alphaOffset - 2] = 0;
      fullPixels[alphaOffset - 1] = 0;
    }
  }
}
const contextSourceBytes = await sharp(fullPixels, {
  raw: { channels: 4, height: ARTBOARD[1], width: ARTBOARD[0] },
}).png({ compressionLevel: 9, palette: false }).toBuffer();

await resizeCleanAndWrite(fullSourceBytes, territoryOutputPath, TERRITORY_MAXIMUM_EDGE);
await resizeCleanAndWrite(contextSourceBytes, contextOutputPath, CONTEXT_MAXIMUM_EDGE);

const territoryOutputBytes = await readFile(territoryOutputPath);
const contextOutputBytes = await readFile(contextOutputPath);
const territoryOutputMetadata = await rgbaMetadata(
  territoryOutputBytes,
  "P01 territory delivery",
);
const contextOutputMetadata = await rgbaMetadata(contextOutputBytes, "P01 context delivery");
await assertTransparentCornersAndNoGreenResidual(
  territoryOutputBytes,
  "P01 territory delivery",
);
await assertTransparentCornersAndNoGreenResidual(contextOutputBytes, "P01 context delivery");

const manifest = Object.freeze({
  schemaVersion: 1,
  id: "career-world/capitals/ninjaone/city-lod-representations@r1",
  status: "runtime-awaiting-fixed-sequence-visual-acceptance",
  authority: Object.freeze({
    geographyOwnership: "none",
    registrationArtboard: ARTBOARD,
    representationPolicy:
      "world-marker-territory-proxy-district-exclusive-incremental-migration",
  }),
  routing: Object.freeze({
    capital: "P01-unconverted-context-with-D06-cutout-plus-I13-D06-composite",
    close: "P01-unconverted-context-with-D06-cutout-plus-I16-full-resolution-D06-base-plus-I17-close-civic-overlay",
    site: "P01-unconverted-context-with-D06-cutout-plus-I16-D06-site-composite",
    territory: "P01-only",
    world: "interface-marker-only",
  }),
  representations: Object.freeze([
    Object.freeze({
      id: "P01",
      label: "NinjaOne Capital distant whole-city proxy",
      representationClass: "whole-city-proxy",
      tier: "territory",
      source: Object.freeze({
        dimensions: Object.freeze([trimmedMetadata.width, trimmedMetadata.height]),
        fullAlphaPath: repositoryPath(fullSourcePath),
        path: repositoryPath(trimmedSourcePath),
        sha256: sha256(trimmedSourceBytes),
      }),
      deliveries: Object.freeze({
        context: Object.freeze({
          decodedBytes: contextOutputMetadata.width * contextOutputMetadata.height * 4,
          dimensions: Object.freeze([contextOutputMetadata.width, contextOutputMetadata.height]),
          encodedBytes: contextOutputBytes.length,
          path: publicPath(contextOutputPath),
          sha256: sha256(contextOutputBytes),
        }),
        territory: Object.freeze({
          decodedBytes: territoryOutputMetadata.width * territoryOutputMetadata.height * 4,
          dimensions: Object.freeze([
            territoryOutputMetadata.width,
            territoryOutputMetadata.height,
          ]),
          encodedBytes: territoryOutputBytes.length,
          path: publicPath(territoryOutputPath),
          sha256: sha256(territoryOutputBytes),
        }),
      }),
      registration: Object.freeze({
        artboard: ARTBOARD,
        bounds: Object.freeze({ ...TRIM_BOUNDS }),
        method: "full-alpha-trim-offset-preserved",
      }),
      presentation: Object.freeze({
        contextIntent: "cohesive-unconverted-city-context-without-D06-double-render",
        contextOpacity: 0.86,
        territoryIntent: "small-readable-distant-city-mass-over-locked-L1-L3",
        territoryOpacity: 0.82,
        territoryScale: 0.46,
        territoryScaleAnchor: Object.freeze([984.64, 776.49]),
      }),
      replacedDistricts: Object.freeze([
        Object.freeze({
          districtId: "D06",
          exclusionMask: publicPath(d06MaskPath),
          maskBounds: D06_MASK_BOUNDS,
          replacementByTier: Object.freeze({
            capital: "I13",
            close: "I16+I17",
            site: "I16",
          }),
        }),
      ]),
    }),
  ]),
});

await mkdir(path.dirname(manifestPath), { recursive: true });
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(
  `Built P01 territory ${territoryOutputMetadata.width}x${territoryOutputMetadata.height} and D06-cutout context ${contextOutputMetadata.width}x${contextOutputMetadata.height}.\n`,
);
