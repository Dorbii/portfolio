import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const WIDE_AUTHORED_PROTOTYPE = process.argv.includes("--wide-authored-prototype");
const WRITE_REVIEW_ARTIFACTS = process.argv.includes("--write-review-artifacts");
const SOURCE_ROOT = path.join(
  ROOT,
  "art-source/career-world/ninjaone-environment/production-r2/detail-tiles-r2/generated",
);
const AUTHORED_SOURCE_ROOT = path.join(
  ROOT,
  "art-source/career-world/ninjaone-environment/seam-integration-r2/authored-r3",
);
const OUTPUT_ROOT = path.join(
  ROOT,
  WIDE_AUTHORED_PROTOTYPE
    ? ".codex-tmp/gauntlet/ninjaone-mvp-20260807-01/artifacts/seam-integration-r3/wide-authored-prototype/assets"
    : "public/career-world/capitals/ninjaone/environment/shared/seam-integration-native-r2",
);
const MANIFEST_PATH = path.join(
  ROOT,
  WIDE_AUTHORED_PROTOTYPE
    ? ".codex-tmp/gauntlet/ninjaone-mvp-20260807-01/artifacts/seam-integration-r3/wide-authored-prototype/manifest.json"
    : "public/career-world/capitals/ninjaone/environment/manifests/seam-integration-native-r2.json",
);
const PROOF_ROOT = path.join(
  ROOT,
  WIDE_AUTHORED_PROTOTYPE
    ? ".codex-tmp/gauntlet/ninjaone-mvp-20260807-01/proof/seam-integration-r3/wide-authored-prototype"
    : ".codex-tmp/gauntlet/ninjaone-mvp-20260807-01/proof/seam-integration-r2-recovery",
);
const ARTIFACT_ROOT = path.join(
  ROOT,
  ".codex-tmp/gauntlet/ninjaone-mvp-20260807-01/artifacts/seam-integration-r3",
);
const REJECTED_INTERCELL_OUTPUT_FILES = Object.freeze([
  "b2-c2-intercell-vertical-seam-r2.png",
  "b2-c2-intercell-vertical-seam-native-neighbor-context-r2.png",
  "c1-c2-intercell-horizontal-seam-r2.png",
  "c1-c2-intercell-horizontal-seam-native-neighbor-context-r2.png",
]);

async function writeJsonAtomically(targetPath, value) {
  const temporaryPath = `${targetPath}.next-${process.pid}`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await rename(temporaryPath, targetPath);
      return;
    } catch (error) {
      if (attempt === 7) {
        await rm(temporaryPath, { force: true });
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
    }
  }
}

const ARTBOARD = Object.freeze([1440, 1080]);
const TILE_ARTBOARD = Object.freeze([360, 270]);
const TILE_DIMENSIONS = Object.freeze([1448, 1086]);
// R3 narrowed these accepted internal repairs and then added rejected inter-cell
// experiments. Production recovery intentionally emits only the previously
// accepted 64px native-strip cohort; inter-cell joins remain audited failures.
const INTERNAL_STRIP_PIXELS = 32;
const INTERCELL_VERTICAL_STRIP_PIXELS = WIDE_AUTHORED_PROTOTYPE ? 96 : 32;
const INTERCELL_HORIZONTAL_STRIP_PIXELS = 22;
const RGB_CHANNELS = 3;
const RGBA_CHANNELS = 4;
const TERRAIN_TILE_DECODED_BYTES = TILE_DIMENSIONS[0] * TILE_DIMENSIONS[1] * 4;
const C2_FOLIAGE_DECODED_BYTES = 527_600;
const MAXIMUM_DECODED_BYTES = 32 * 1024 * 1024;
const MAXIMUM_SUPPLEMENTAL_NODES = 6;

const IMAGEGEN_AUTHORED_SOURCES = Object.freeze({
  "b2-c2-intercell-vertical-seam": Object.freeze({
    dimensions: Object.freeze([745, 2110]),
    extraction: Object.freeze({
      normalizedDimensions: Object.freeze([768, 2172]),
      normalizedRegion: WIDE_AUTHORED_PROTOTYPE
        ? Object.freeze([288, 0, 192, 2172])
        : Object.freeze([352, 0, 64, 2172]),
    }),
    file: "b2-c2-intercell-vertical-imagegen-authored-r3.png",
    input: Object.freeze({
      dimensions: Object.freeze([768, 2172]),
      path: ".codex-tmp/gauntlet/ninjaone-mvp-20260807-01/proof/seam-integration-r3/intercell-vertical-imagegen-edit-input-768x2172-native-r3.png",
      sha256: "3587C01A0716C86A609EC21E2F6BCC1DB3A27D1A7995C78AB1FC6ADE47E2C232",
    }),
    promptSha256: "049ABAD309FEEA229548E159B581F1600D31AA02A20B2385F6C87BE5FC052860",
    sha256: "A521DBF3A890C2D1C98BA44F40744C57E04821C4657A9EC260F551EB2C6B1A57",
  }),
});

const SOURCE_HASHES = Object.freeze({
  "r0-c2": "F351A83EA54B3EA30A8C948B68F9E70CD13C6AF0870A5827123BEB36B50E19C7",
  "r0-c3": "D2E7261BAF396C85676CE37A90579762FEEAC8231EB93B2751DA5BFEE6D3E98A",
  "r1-c2": "B92EBAD7F6CCC885F18D3D144E95304A206F198D8E15D06334CC371185CDA69D",
  "r1-c3": "422F663D700D42D5996B844F904441D21765E1DC7384B536B00F5083D33E82AA",
  "r2-c0": "5C7D5852546E68AFDD377EB86875A43F83F4DD6A59DEF5FA9020C8DD3A5E7520",
  "r2-c1": "2CD7FB2A2D55A2267E59DF6798F02285BB3F6C8776C8512843E7E0A44A9AF84F",
  "r2-c2": "2DECAEB59F38EE8E0ED47C4337B7AF71DEE076E3455726DA2216128AB1FC0D05",
  "r2-c3": "48BE8AC5369F2F4F7FC394E3171B6A74C97FABEBC4A1FEDB8440E74B4AEA567F",
  "r3-c0": "D1CFA21F534AAE3FB0D968E44A6CC1564452273372338585E1C3B072226C7CC0",
  "r3-c1": "825F596CE91D3CCA55673BF902F109BE29C168C939010D0C3866495A2B2B7888",
  "r3-c2": "DE30BA48BB30DF7D85CE2C0260386D21016CDFE618B8747EF808999A04407ADD",
  "r3-c3": "8D5B76EB06A45A7926524596DC951EC456660610B621228C2A2A3885A9C09B31",
});

const CELLS = Object.freeze({
  B2: Object.freeze({
    artboardOrigin: Object.freeze([0, 540]),
    tiles: Object.freeze([
      Object.freeze(["r2-c0", "r2-c1"]),
      Object.freeze(["r3-c0", "r3-c1"]),
    ]),
  }),
  C1: Object.freeze({
    artboardOrigin: Object.freeze([720, 0]),
    tiles: Object.freeze([
      Object.freeze(["r0-c2", "r0-c3"]),
      Object.freeze(["r1-c2", "r1-c3"]),
    ]),
  }),
  C2: Object.freeze({
    artboardOrigin: Object.freeze([720, 540]),
    tiles: Object.freeze([
      Object.freeze(["r2-c2", "r2-c3"]),
      Object.freeze(["r3-c2", "r3-c3"]),
    ]),
  }),
});

const horizontalPixelSpan = TILE_ARTBOARD[0] / TILE_DIMENSIONS[0];
const verticalPixelSpan = TILE_ARTBOARD[1] / TILE_DIMENSIONS[1];

function resourceDefinitionsFor(cellId) {
  const cell = CELLS[cellId];
  const seamX = cell.artboardOrigin[0] + TILE_ARTBOARD[0];
  const seamY = cell.artboardOrigin[1] + TILE_ARTBOARD[1];
  return Object.freeze([
    Object.freeze({
      artboardBounds: Object.freeze({
        origin: Object.freeze([
          seamX - INTERNAL_STRIP_PIXELS * horizontalPixelSpan,
          cell.artboardOrigin[1],
        ]),
        span: Object.freeze([
          INTERNAL_STRIP_PIXELS * 2 * horizontalPixelSpan,
          TILE_ARTBOARD[1] * 2,
        ]),
      }),
      cellId,
      id: `${cellId.toLowerCase()}-internal-vertical-seam`,
      orientation: "vertical",
      pairs: Object.freeze([
        Object.freeze([cell.tiles[0][0], cell.tiles[0][1]]),
        Object.freeze([cell.tiles[1][0], cell.tiles[1][1]]),
      ]),
      renderOrder: 0,
      seamCoordinate: seamX * 4,
      stripPixels: INTERNAL_STRIP_PIXELS,
    }),
    Object.freeze({
      artboardBounds: Object.freeze({
        origin: Object.freeze([
          cell.artboardOrigin[0],
          seamY - INTERNAL_STRIP_PIXELS * verticalPixelSpan,
        ]),
        span: Object.freeze([
          TILE_ARTBOARD[0] * 2,
          INTERNAL_STRIP_PIXELS * 2 * verticalPixelSpan,
        ]),
      }),
      cellId,
      id: `${cellId.toLowerCase()}-internal-horizontal-seam`,
      orientation: "horizontal",
      pairs: Object.freeze([
        Object.freeze([cell.tiles[0][0], cell.tiles[1][0]]),
        Object.freeze([cell.tiles[0][1], cell.tiles[1][1]]),
      ]),
      renderOrder: 1,
      seamCoordinate: seamY * 4,
      stripPixels: INTERNAL_STRIP_PIXELS,
    }),
  ]);
}

const ALL_RESOURCE_DEFINITIONS = Object.freeze([
  ...resourceDefinitionsFor("B2"),
  ...resourceDefinitionsFor("C2"),
  Object.freeze({
    artboardBounds: Object.freeze({
      origin: Object.freeze([
        720 - INTERCELL_VERTICAL_STRIP_PIXELS * horizontalPixelSpan,
        540,
      ]),
      span: Object.freeze([
        INTERCELL_VERTICAL_STRIP_PIXELS * 2 * horizontalPixelSpan,
        TILE_ARTBOARD[1] * 2,
      ]),
    }),
    cellId: "B2-C2",
    id: "b2-c2-intercell-vertical-seam",
    intercell: true,
    orientation: "vertical",
    pairs: Object.freeze([
      Object.freeze(["r2-c1", "r2-c2"]),
      Object.freeze(["r3-c1", "r3-c2"]),
    ]),
    renderOrder: 2,
    seamCoordinate: 720 * 4,
    stripPixels: INTERCELL_VERTICAL_STRIP_PIXELS,
  }),
  Object.freeze({
    artboardBounds: Object.freeze({
      origin: Object.freeze([
        720,
        540 - INTERCELL_HORIZONTAL_STRIP_PIXELS * verticalPixelSpan,
      ]),
      span: Object.freeze([
        TILE_ARTBOARD[0] * 2,
        INTERCELL_HORIZONTAL_STRIP_PIXELS * 2 * verticalPixelSpan,
      ]),
    }),
    cellId: "C1-C2",
    id: "c1-c2-intercell-horizontal-seam",
    intercell: true,
    orientation: "horizontal",
    pairs: Object.freeze([
      Object.freeze(["r1-c2", "r2-c2"]),
      Object.freeze(["r1-c3", "r2-c3"]),
    ]),
    renderOrder: 3,
    seamCoordinate: 540 * 4,
    stripPixels: INTERCELL_HORIZONTAL_STRIP_PIXELS,
  }),
]);

// Do not emit, select, or budget the visually rejected inter-cell resources.
// They remain in ALL_RESOURCE_DEFINITIONS only so the verifier can report the
// four unresolved native adjacencies instead of silently narrowing the sweep.
const RESOURCE_DEFINITIONS = Object.freeze(
  ALL_RESOURCE_DEFINITIONS.filter(({ intercell }) => intercell !== true),
);

const SELECTOR_CHECKPOINTS = Object.freeze({
  fixedB2Internal: Object.freeze({
    camera: Object.freeze({
      origin: Object.freeze([0.1675, 0.23]),
      span: Object.freeze([0.04, 0.04]),
    }),
    expectedResourceIds: Object.freeze([
      "b2-internal-vertical-seam",
      "b2-internal-horizontal-seam",
    ]),
  }),
  fixedC2Internal: Object.freeze({
    camera: Object.freeze({
      origin: Object.freeze([0.2925, 0.23]),
      span: Object.freeze([0.04, 0.04]),
    }),
    expectedResourceIds: Object.freeze([
      "c2-internal-vertical-seam",
      "c2-internal-horizontal-seam",
    ]),
  }),
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function round(value, digits = 6) {
  return value === null ? null : Number(value.toFixed(digits));
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function clampByte(value) {
  return clamp(Math.round(value), 0, 255);
}

function cameraArtboardView(camera) {
  return Object.freeze({
    origin: Object.freeze([
      (camera.origin[0] - 0.125) / 0.25 * ARTBOARD[0],
      camera.origin[1] / (1 / 3) * ARTBOARD[1],
    ]),
    span: Object.freeze([
      camera.span[0] / 0.25 * ARTBOARD[0],
      camera.span[1] / (1 / 3) * ARTBOARD[1],
    ]),
  });
}

function intersects(first, second) {
  return first.origin[0] < second.origin[0] + second.span[0]
    && first.origin[0] + first.span[0] > second.origin[0]
    && first.origin[1] < second.origin[1] + second.span[1]
    && first.origin[1] + first.span[1] > second.origin[1];
}

function smoothstep(value) {
  const amount = clamp(value, 0, 1);
  return amount * amount * (3 - 2 * amount);
}

function rgbOffset(width, x, y) {
  return (y * width + x) * RGB_CHANNELS;
}

function rgbaOffset(width, x, y) {
  return (y * width + x) * RGBA_CHANNELS;
}

function sourcePath(id) {
  return path.join(SOURCE_ROOT, `${id}-generated-r2.png`);
}

function sourceRepoPath(id) {
  return `/art-source/career-world/ninjaone-environment/production-r2/detail-tiles-r2/generated/${id}-generated-r2.png`;
}

function publicPath(file) {
  return `/${path.relative(path.join(ROOT, "public"), file).replaceAll("\\", "/")}`;
}

async function loadAuthoritySources() {
  const sources = new Map();
  for (const [id, expectedHash] of Object.entries(SOURCE_HASHES)) {
    const file = sourcePath(id);
    const bytes = await readFile(file);
    const digest = sha256(bytes);
    if (digest !== expectedHash) {
      throw new TypeError(`Native authority ${id} hash drifted: ${digest}.`);
    }
    const metadata = await sharp(bytes).metadata();
    if (
      metadata.width !== TILE_DIMENSIONS[0]
      || metadata.height !== TILE_DIMENSIONS[1]
      || metadata.channels !== 3
      || metadata.hasAlpha === true
    ) {
      throw new TypeError(`Native authority ${id} must remain 1448x1086 RGB.`);
    }
    const raw = await sharp(bytes).toColourspace("srgb").removeAlpha().raw().toBuffer();
    if (raw.length !== TILE_DIMENSIONS[0] * TILE_DIMENSIONS[1] * RGB_CHANNELS) {
      throw new TypeError(`Native authority ${id} decoded byte count drifted.`);
    }
    sources.set(id, Object.freeze({
      id,
      path: sourceRepoPath(id),
      raw,
      sha256: digest,
    }));
  }
  return sources;
}

// Retained solely for the isolated rejected R3 evidence path; recovery never invokes it.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function loadImagegenAuthoredTransitions() {
  const transitions = new Map();
  for (const [resourceId, source] of Object.entries(IMAGEGEN_AUTHORED_SOURCES)) {
    const file = path.join(AUTHORED_SOURCE_ROOT, source.file);
    const bytes = await readFile(file);
    const digest = sha256(bytes);
    if (digest !== source.sha256) {
      throw new TypeError(`ImageGen authored seam source ${resourceId} hash drifted: ${digest}.`);
    }
    const metadata = await sharp(bytes).metadata();
    if (
      metadata.width !== source.dimensions[0]
      || metadata.height !== source.dimensions[1]
      || metadata.channels !== RGB_CHANNELS
      || metadata.hasAlpha === true
    ) {
      throw new TypeError(`ImageGen authored seam source ${resourceId} dimensions drifted.`);
    }
    const [normalizedWidth, normalizedHeight] = source.extraction.normalizedDimensions;
    const [left, top, width, height] = source.extraction.normalizedRegion;
    const normalized = await sharp(bytes)
      .toColourspace("srgb")
      .removeAlpha()
      .resize({
        fit: "fill",
        height: normalizedHeight,
        kernel: sharp.kernel.lanczos3,
        width: normalizedWidth,
      })
      .raw()
      .toBuffer();
    transitions.set(resourceId, Object.freeze({
      data: extractRgb(normalized, normalizedWidth, left, top, width, height),
      provenance: source,
    }));
  }
  return transitions;
}

function copyRgbRect({
  destination,
  destinationWidth,
  destinationX,
  destinationY,
  height,
  source,
  sourceWidth,
  sourceX,
  sourceY,
  width,
}) {
  for (let y = 0; y < height; y += 1) {
    const sourceStart = rgbOffset(sourceWidth, sourceX, sourceY + y);
    const destinationStart = rgbOffset(
      destinationWidth,
      destinationX,
      destinationY + y,
    );
    source.copy(
      destination,
      destinationStart,
      sourceStart,
      sourceStart + width * RGB_CHANNELS,
    );
  }
}

function buildNeighborContext(definition, sources) {
  const stripPixels = definition.stripPixels;
  if (definition.orientation === "vertical") {
    const width = stripPixels * 2;
    const height = TILE_DIMENSIONS[1] * definition.pairs.length;
    const output = Buffer.alloc(width * height * RGB_CHANNELS);
    definition.pairs.forEach(([firstId, secondId], segment) => {
      const destinationY = segment * TILE_DIMENSIONS[1];
      copyRgbRect({
        destination: output,
        destinationWidth: width,
        destinationX: 0,
        destinationY,
        height: TILE_DIMENSIONS[1],
        source: sources.get(firstId).raw,
        sourceWidth: TILE_DIMENSIONS[0],
        sourceX: TILE_DIMENSIONS[0] - stripPixels,
        sourceY: 0,
        width: stripPixels,
      });
      copyRgbRect({
        destination: output,
        destinationWidth: width,
        destinationX: stripPixels,
        destinationY,
        height: TILE_DIMENSIONS[1],
        source: sources.get(secondId).raw,
        sourceWidth: TILE_DIMENSIONS[0],
        sourceX: 0,
        sourceY: 0,
        width: stripPixels,
      });
    });
    return Object.freeze({ data: output, height, width });
  }

  const width = TILE_DIMENSIONS[0] * definition.pairs.length;
  const height = stripPixels * 2;
  const output = Buffer.alloc(width * height * RGB_CHANNELS);
  definition.pairs.forEach(([firstId, secondId], segment) => {
    const destinationX = segment * TILE_DIMENSIONS[0];
    copyRgbRect({
      destination: output,
      destinationWidth: width,
      destinationX,
      destinationY: 0,
      height: stripPixels,
      source: sources.get(firstId).raw,
      sourceWidth: TILE_DIMENSIONS[0],
      sourceX: 0,
      sourceY: TILE_DIMENSIONS[1] - stripPixels,
      width: TILE_DIMENSIONS[0],
    });
    copyRgbRect({
      destination: output,
      destinationWidth: width,
      destinationX,
      destinationY: stripPixels,
      height: stripPixels,
      source: sources.get(secondId).raw,
      sourceWidth: TILE_DIMENSIONS[0],
      sourceX: 0,
      sourceY: 0,
      width: TILE_DIMENSIONS[0],
    });
  });
  return Object.freeze({ data: output, height, width });
}

function smoothCorrections(values, length, radius) {
  const output = new Float32Array(values.length);
  for (let channel = 0; channel < RGB_CHANNELS; channel += 1) {
    const prefix = new Float64Array(length + 1);
    for (let index = 0; index < length; index += 1) {
      prefix[index + 1] = prefix[index] + values[index * RGB_CHANNELS + channel];
    }
    for (let index = 0; index < length; index += 1) {
      const start = Math.max(0, index - radius);
      const end = Math.min(length, index + radius + 1);
      output[index * RGB_CHANNELS + channel] = (
        prefix[end] - prefix[start]
      ) / (end - start);
    }
  }
  return output;
}

function applySeamCorrection(
  source,
  width,
  height,
  orientation,
  seam,
  halfWidth,
  smoothingRadius,
  boundaryRetention = 0,
) {
  const output = Buffer.from(source);
  const vertical = orientation === "vertical";
  const length = vertical ? height : width;
  const alongSmoothed = new Float32Array(halfWidth * length * RGB_CHANNELS);
  for (let distance = 0; distance < halfWidth; distance += 1) {
    const corrections = new Float32Array(length * RGB_CHANNELS);
    for (let position = 0; position < length; position += 1) {
      const firstX = vertical ? seam - 1 - distance : position;
      const firstY = vertical ? position : seam - 1 - distance;
      const secondX = vertical ? seam + distance : position;
      const secondY = vertical ? position : seam + distance;
      if (
        firstX < 0 || firstY < 0 || secondX >= width || secondY >= height
      ) continue;
      const first = rgbOffset(width, firstX, firstY);
      const second = rgbOffset(width, secondX, secondY);
      for (let channel = 0; channel < RGB_CHANNELS; channel += 1) {
        corrections[position * RGB_CHANNELS + channel] = clamp(
          source[second + channel] - source[first + channel],
          -64,
          64,
        );
      }
    }
    alongSmoothed.set(
      smoothCorrections(corrections, length, smoothingRadius),
      distance * length * RGB_CHANNELS,
    );
  }
  const smoothed = new Float32Array(alongSmoothed.length);
  for (let distance = 0; distance < halfWidth; distance += 1) {
    const firstDistance = Math.max(0, distance - 2);
    const lastDistance = Math.min(halfWidth - 1, distance + 2);
    const samples = lastDistance - firstDistance + 1;
    for (let position = 0; position < length; position += 1) {
      for (let channel = 0; channel < RGB_CHANNELS; channel += 1) {
        let total = 0;
        for (let neighbor = firstDistance; neighbor <= lastDistance; neighbor += 1) {
          total += alongSmoothed[
            (neighbor * length + position) * RGB_CHANNELS + channel
          ];
        }
        smoothed[(distance * length + position) * RGB_CHANNELS + channel] =
          total / samples;
      }
    }
  }

  for (let position = 0; position < length; position += 1) {
    for (let distance = 0; distance < halfWidth; distance += 1) {
      const feather = smoothstep(1 - distance / halfWidth);
      const firstX = vertical ? seam - 1 - distance : position;
      const firstY = vertical ? position : seam - 1 - distance;
      const secondX = vertical ? seam + distance : position;
      const secondY = vertical ? position : seam + distance;
      if (
        firstX < 0 || firstY < 0 || secondX >= width || secondY >= height
      ) continue;
      const first = rgbOffset(width, firstX, firstY);
      const second = rgbOffset(width, secondX, secondY);
      for (let channel = 0; channel < RGB_CHANNELS; channel += 1) {
        const adjustment = smoothed[
          (distance * length + position) * RGB_CHANNELS + channel
        ]
          * 0.5 * feather;
        output[first + channel] = clampByte(source[first + channel] + adjustment);
        output[second + channel] = clampByte(source[second + channel] - adjustment);
      }
    }

    const firstX = vertical ? seam - 1 : position;
    const firstY = vertical ? position : seam - 1;
    const secondX = vertical ? seam : position;
    const secondY = vertical ? position : seam;
    const first = rgbOffset(width, firstX, firstY);
    const second = rgbOffset(width, secondX, secondY);
    for (let channel = 0; channel < RGB_CHANNELS; channel += 1) {
      const midpoint = Math.round((output[first + channel] + output[second + channel]) / 2);
      const retainedDifference = (
        output[second + channel] - output[first + channel]
      ) * boundaryRetention;
      const firstTarget = clampByte(midpoint - retainedDifference / 2);
      const secondTarget = clampByte(midpoint + retainedDifference / 2);
      const firstDelta = firstTarget - output[first + channel];
      const secondDelta = secondTarget - output[second + channel];
      for (let distance = 3; distance >= 1; distance -= 1) {
        const weight = smoothstep(1 - distance / 4);
        const firstLocalX = vertical ? seam - 1 - distance : position;
        const firstLocalY = vertical ? position : seam - 1 - distance;
        const secondLocalX = vertical ? seam + distance : position;
        const secondLocalY = vertical ? position : seam + distance;
        if (
          firstLocalX < 0 || firstLocalY < 0
          || secondLocalX >= width || secondLocalY >= height
        ) continue;
        const firstLocal = rgbOffset(width, firstLocalX, firstLocalY);
        const secondLocal = rgbOffset(width, secondLocalX, secondLocalY);
        output[firstLocal + channel] = clampByte(
          output[firstLocal + channel] + firstDelta * weight,
        );
        output[secondLocal + channel] = clampByte(
          output[secondLocal + channel] + secondDelta * weight,
        );
      }
      output[first + channel] = firstTarget;
      output[second + channel] = secondTarget;
    }
  }
  return output;
}

function alphaWeight(orientation, width, height, x, y) {
  const vertical = orientation === "vertical";
  const seam = vertical ? width / 2 : height / 2;
  const cross = vertical ? x : y;
  const along = vertical ? y : x;
  const length = vertical ? height : width;
  const crossDistance = Math.abs(cross + 0.5 - seam);
  const edgeInset = (along * 17 + Math.floor(along / 7)) % 4;
  const radius = seam - 1 - edgeInset;
  const edgeWeight = smoothstep((radius - crossDistance) / 5);
  const endDistance = Math.min(along, length - 1 - along);
  const endInset = 1 + ((cross * 13 + Math.floor(cross / 5)) % 4);
  const endWeight = smoothstep((endDistance - endInset) / 10);
  return edgeWeight * endWeight;
}

function intercellAlphaWeight(orientation, width, height, x, y) {
  const vertical = orientation === "vertical";
  const cross = vertical ? x : y;
  const along = vertical ? y : x;
  const crossLength = vertical ? width : height;
  const length = vertical ? height : width;
  const endDistance = Math.min(along, length - 1 - along);
  const endWeight = smoothstep((endDistance - 0.5) / 3);
  const boundaryNotch = (cross === 0 || cross === crossLength - 1)
    && along % 31 === 0;
  const endNotch = endDistance < 4 && cross % 31 === 0;
  return boundaryNotch || endNotch ? 0 : endWeight;
}

function blendAuthoredTransition(context, authored, orientation, featherPixels) {
  const vertical = orientation === "vertical";
  const output = Buffer.alloc(context.data.length);
  for (let y = 0; y < context.height; y += 1) {
    for (let x = 0; x < context.width; x += 1) {
      const cross = vertical ? x : y;
      const crossLength = vertical ? context.width : context.height;
      const crossDistance = Math.min(cross, crossLength - 1 - cross);
      const weight = smoothstep(crossDistance / featherPixels);
      const offset = rgbOffset(context.width, x, y);
      for (let channel = 0; channel < RGB_CHANNELS; channel += 1) {
        output[offset + channel] = clampByte(
          context.data[offset + channel] * (1 - weight)
          + authored[offset + channel] * weight,
        );
      }
    }
  }
  return output;
}

function blendNativeGraphCutTransition(context, definition, sources) {
  if (definition.orientation !== "vertical") {
    throw new TypeError("The native graph-cut prototype is vertical-only.");
  }
  const patches = Object.freeze([
    Object.freeze({ centerY: 215, id: "upper-pond-rock-edge", radiusY: 195 }),
    Object.freeze({ centerY: 545, id: "mid-rock-tree", radiusY: 100 }),
    Object.freeze({ centerY: 735, id: "waterfall-rock-lip", radiusY: 55 }),
    Object.freeze({
      centerY: 883,
      handoff: true,
      id: "waterfall-native-water-handoff",
      radiusY: 80,
    }),
    Object.freeze({ centerY: 1020, id: "waterfall-impact-rock", radiusY: 35 }),
    Object.freeze({ centerY: 1220, id: "lower-rock-tree", radiusY: 100 }),
    Object.freeze({ centerY: 1500, id: "lower-meadow-trail", radiusY: 140 }),
    Object.freeze({ centerY: 1920, id: "lower-rock-meadow", radiusY: 190 }),
  ]);
  const output = Buffer.from(context.data);
  const influence = new Float32Array(context.width * context.height);
  const donorOriginMap = new Uint8Array(context.width * context.height);
  const waterHandoffInfluence = new Float32Array(context.width * context.height);
  const usedDonors = new Set();
  const donorRecords = [];

  const sourceValue = (candidate, x, y, channel) => {
    const localY = y - candidate.segment * TILE_DIMENSIONS[1] + candidate.yShift;
    return sources.get(candidate.sourceId).raw[
      rgbOffset(TILE_DIMENSIONS[0], candidate.sourceX + x, localY) + channel
    ];
  };
  const targetValue = (x, y, channel) => context.data[
    rgbOffset(context.width, x, y) + channel
  ];
  const localMean = (read, x, y, channel) => {
    let total = 0;
    let samples = 0;
    for (let offsetY = -2; offsetY <= 2; offsetY += 2) {
      for (let offsetX = -2; offsetX <= 2; offsetX += 2) {
        total += read(
          clamp(x + offsetX, 0, context.width - 1),
          clamp(y + offsetY, 0, context.height - 1),
          channel,
        );
        samples += 1;
      }
    }
    return total / samples;
  };
  const boundarySamples = (minimumY, maximumY) => {
    const samples = [];
    for (let y = minimumY; y <= maximumY; y += 6) {
      for (const x of [24, 36, 48, 143, 155, 167]) samples.push([x, y]);
    }
    for (let x = 24; x <= 167; x += 6) {
      for (const y of [
        minimumY,
        minimumY + 12,
        minimumY + 24,
        maximumY - 24,
        maximumY - 12,
        maximumY,
      ]) samples.push([x, y]);
    }
    return samples;
  };
  const evaluateCandidate = (candidate, samples) => {
    const colorOffset = [0, 0, 0];
    for (let channel = 0; channel < RGB_CHANNELS; channel += 1) {
      let delta = 0;
      for (const [x, y] of samples) {
        delta += targetValue(x, y, channel) - sourceValue(candidate, x, y, channel);
      }
      colorOffset[channel] = clamp(delta / samples.length, -24, 24);
    }
    let score = 0;
    for (const [x, y] of samples) {
      for (let channel = 0; channel < RGB_CHANNELS; channel += 1) {
        const target = targetValue(x, y, channel);
        const donor = sourceValue(candidate, x, y, channel) + colorOffset[channel];
        const targetLow = localMean(targetValue, x, y, channel);
        const donorLow = localMean(
          (sampleX, sampleY, sampleChannel) => sourceValue(
            candidate,
            sampleX,
            sampleY,
            sampleChannel,
          ),
          x,
          y,
          channel,
        ) + colorOffset[channel];
        score += Math.abs(targetLow - donorLow)
          + Math.abs((target - targetLow) - (donor - donorLow)) * 0.55;
      }
    }
    return Object.freeze({ colorOffset: Object.freeze(colorOffset), score });
  };
  const chooseDonor = (patch, minimumY, maximumY) => {
    const segment = Math.floor(patch.centerY / TILE_DIMENSIONS[1]);
    const pair = definition.pairs[segment];
    const candidates = [];
    const sides = patch.handoff ? [0] : [0, 1];
    for (const side of sides) {
      const sourceId = pair[side];
      const starts = side === 0
        ? [1256, 1208, 1160, 1112, 1048]
        : [0, 48, 96, 144, 208];
      for (const sourceX of starts) {
        for (const yShift of patch.handoff ? [-8, 0, 8] : [-24, -12, 0, 12, 24]) {
          const localMinimumY = minimumY - segment * TILE_DIMENSIONS[1] + yShift;
          const localMaximumY = maximumY - segment * TILE_DIMENSIONS[1] + yShift;
          if (localMinimumY < 0 || localMaximumY >= TILE_DIMENSIONS[1]) continue;
          candidates.push(Object.freeze({ segment, side, sourceId, sourceX, yShift }));
        }
      }
    }
    const samples = boundarySamples(minimumY, maximumY);
    const ranked = candidates.map((candidate) => Object.freeze({
      candidate,
      evaluation: evaluateCandidate(candidate, samples),
    })).sort((first, second) => (
      first.evaluation.score - second.evaluation.score
      || first.candidate.sourceId.localeCompare(second.candidate.sourceId)
      || first.candidate.sourceX - second.candidate.sourceX
      || first.candidate.yShift - second.candidate.yShift
    ));
    const selected = ranked.find(({ candidate }) => {
      const key = [
        candidate.sourceId,
        candidate.sourceX,
        minimumY - candidate.segment * TILE_DIMENSIONS[1] + candidate.yShift,
        context.width,
        maximumY - minimumY + 1,
      ].join(":");
      return !usedDonors.has(key);
    });
    if (selected === undefined) {
      throw new TypeError(`No unique native donor remained for ${patch.id}.`);
    }
    const donorKey = [
      selected.candidate.sourceId,
      selected.candidate.sourceX,
      minimumY - selected.candidate.segment * TILE_DIMENSIONS[1]
        + selected.candidate.yShift,
      context.width,
      maximumY - minimumY + 1,
    ].join(":");
    usedDonors.add(donorKey);
    return Object.freeze({
      ...selected.candidate,
      colorOffset: selected.evaluation.colorOffset,
      donorKey,
      score: round(selected.evaluation.score / samples.length),
    });
  };
  const minimumCostPath = (
    stepStart,
    stepEnd,
    candidateMinimum,
    candidateMaximum,
    costAt,
  ) => {
    const stepCount = stepEnd - stepStart + 1;
    const candidateCount = candidateMaximum - candidateMinimum + 1;
    let previous = new Float64Array(candidateCount);
    let current = new Float64Array(candidateCount);
    const predecessor = new Int16Array(stepCount * candidateCount);
    for (let candidate = 0; candidate < candidateCount; candidate += 1) {
      previous[candidate] = costAt(stepStart, candidateMinimum + candidate);
      predecessor[candidate] = -1;
    }
    for (let step = 1; step < stepCount; step += 1) {
      current.fill(Number.POSITIVE_INFINITY);
      for (let candidate = 0; candidate < candidateCount; candidate += 1) {
        let best = -1;
        let bestCost = Number.POSITIVE_INFINITY;
        for (
          let prior = Math.max(0, candidate - 2);
          prior <= Math.min(candidateCount - 1, candidate + 2);
          prior += 1
        ) {
          const cost = previous[prior] + Math.abs(prior - candidate) * 0.35;
          if (cost < bestCost) {
            best = prior;
            bestCost = cost;
          }
        }
        current[candidate] = bestCost
          + costAt(stepStart + step, candidateMinimum + candidate);
        predecessor[step * candidateCount + candidate] = best;
      }
      [previous, current] = [current, previous];
    }
    let best = 0;
    for (let candidate = 1; candidate < candidateCount; candidate += 1) {
      if (previous[candidate] < previous[best]) best = candidate;
    }
    const path = new Int16Array(stepCount);
    for (let step = stepCount - 1; step >= 0; step -= 1) {
      path[step] = candidateMinimum + best;
      best = predecessor[step * candidateCount + best];
    }
    return path;
  };

  for (const [patchIndex, patch] of patches.entries()) {
    const segment = Math.floor(patch.centerY / TILE_DIMENSIONS[1]);
    const segmentStart = segment * TILE_DIMENSIONS[1];
    const segmentEnd = segmentStart + TILE_DIMENSIONS[1] - 1;
    const minimumY = Math.max(segmentStart + 1, patch.centerY - patch.radiusY);
    const maximumY = Math.min(segmentEnd - 1, patch.centerY + patch.radiusY);
    const donor = chooseDonor(patch, minimumY, maximumY);
    const adjustedDonor = (x, y, channel) => clampByte(
      sourceValue(donor, x, y, channel) + donor.colorOffset[channel],
    );
    const cost = (x, y) => {
      let total = 0;
      for (let channel = 0; channel < RGB_CHANNELS; channel += 1) {
        total += Math.abs(targetValue(x, y, channel) - adjustedDonor(x, y, channel));
      }
      return total;
    };
    const leftSeam = minimumCostPath(
      minimumY,
      maximumY,
      patch.handoff ? 54 : 22,
      patch.handoff ? 72 : 52,
      (y, x) => cost(x, y) + Math.abs(x - 38 - Math.sin(y * 0.041) * 6) * 0.08,
    );
    const rightSeam = minimumCostPath(
      minimumY,
      maximumY,
      patch.handoff ? 120 : 140,
      patch.handoff ? 138 : 170,
      (y, x) => cost(x, y) + Math.abs(x - 154 - Math.sin(y * 0.037) * 6) * 0.08,
    );
    const topSeam = minimumCostPath(
      0,
      context.width - 1,
      minimumY,
      Math.min(maximumY, minimumY + (patch.handoff ? 14 : 26)),
      (x, y) => cost(x, y) + Math.abs(y - minimumY - Math.sin(x * 0.09) * 5) * 0.08,
    );
    const bottomSeam = minimumCostPath(
      0,
      context.width - 1,
      Math.max(minimumY, maximumY - (patch.handoff ? 14 : 26)),
      maximumY,
      (x, y) => cost(x, y) + Math.abs(y - maximumY - Math.sin(x * 0.081) * 5) * 0.08,
    );
    for (let y = minimumY; y <= maximumY; y += 1) {
      for (let x = 0; x < context.width; x += 1) {
        const left = leftSeam[y - minimumY];
        const right = rightSeam[y - minimumY];
        const top = topSeam[x];
        const bottom = bottomSeam[x];
        if (x <= left || x >= right || y <= top || y >= bottom) continue;
        const edgeDistance = Math.min(x - left, right - x, y - top, bottom - y);
        if (edgeDistance < 3) continue;
        const weight = smoothstep(edgeDistance / (patch.handoff ? 7 : 11));
        if (weight <= influence[y * context.width + x]) continue;
        const pixel = y * context.width + x;
        const offset = pixel * RGB_CHANNELS;
        for (let channel = 0; channel < RGB_CHANNELS; channel += 1) {
          output[offset + channel] = adjustedDonor(x, y, channel);
        }
        influence[pixel] = weight;
        donorOriginMap[pixel] = patchIndex + 1;
        if (patch.handoff) waterHandoffInfluence[pixel] = weight;
      }
    }
    donorRecords.push(Object.freeze({
      colorOffset: donor.colorOffset,
      id: patch.id,
      minimumErrorScore: donor.score,
      sourceBounds: Object.freeze([
        donor.sourceX,
        minimumY - donor.segment * TILE_DIMENSIONS[1] + donor.yShift,
        context.width,
        maximumY - minimumY + 1,
      ]),
      sourceId: donor.sourceId,
      sourcePath: sources.get(donor.sourceId).path,
      sourceSha256: sources.get(donor.sourceId).sha256,
      treatment: patch.handoff
        ? "tiny-native-water-bridge-with-minimum-error-seams"
        : "native-exemplar-multiresolution-minimum-error-retouch",
    }));
  }

  const visited = new Uint8Array(influence.length);
  const queue = new Int32Array(influence.length);
  for (let pixel = 0; pixel < influence.length; pixel += 1) {
    if (visited[pixel] || influence[pixel] < 16 / 255) continue;
    let head = 0;
    let tail = 0;
    queue[tail] = pixel;
    tail += 1;
    visited[pixel] = 1;
    while (head < tail) {
      const current = queue[head];
      head += 1;
      const x = current % context.width;
      for (const neighbor of [
        current - 1,
        current + 1,
        current - context.width,
        current + context.width,
      ]) {
        if (
          neighbor < 0
          || neighbor >= influence.length
          || visited[neighbor]
          || influence[neighbor] < 16 / 255
          || Math.abs(neighbor % context.width - x) > 1
        ) continue;
        visited[neighbor] = 1;
        queue[tail] = neighbor;
        tail += 1;
      }
    }
    if (tail >= 64) continue;
    for (let index = 0; index < tail; index += 1) {
      const current = queue[index];
      influence[current] = 0;
      donorOriginMap[current] = 0;
      waterHandoffInfluence[current] = 0;
    }
  }

  if (new Set(donorRecords.map(({ sourceId, sourceBounds }) => (
    `${sourceId}:${sourceBounds.join(":")}`
  ))).size !== donorRecords.length) {
    throw new TypeError("A native graph-cut donor patch was reused.");
  }
  const centerCorrected = applySeamCorrection(
    output,
    context.width,
    context.height,
    definition.orientation,
    context.width / 2,
    12,
    4,
    0.12,
  );
  return Object.freeze({
    data: centerCorrected,
    donorOriginMap,
    donorRecords: Object.freeze(donorRecords),
    influence,
    patches,
    waterHandoffInfluence,
  });
}

function buildOverlay(context, definition, authoredTransitions, sources) {
  const stripPixels = definition.stripPixels;
  const correctionPixels = stripPixels;
  const authored = authoredTransitions.get(definition.id);
  const hybrid = WIDE_AUTHORED_PROTOTYPE
    && definition.id === "b2-c2-intercell-vertical-seam"
    ? blendNativeGraphCutTransition(context, definition, sources)
    : undefined;
  let corrected = hybrid !== undefined
    ? hybrid.data
    : authored === undefined
    ? applySeamCorrection(
      context.data,
      context.width,
      context.height,
      definition.orientation,
      stripPixels,
      correctionPixels,
      14,
      definition.intercell === true ? 0.25 : 0,
    )
    : blendAuthoredTransition(context, authored.data, definition.orientation, 18);
  if (
    hybrid === undefined
    && authored === undefined
    && definition.orientation === "horizontal"
  ) {
    corrected = applySeamCorrection(
      corrected,
      context.width,
      context.height,
      "vertical",
      TILE_DIMENSIONS[0],
      12,
      4,
    );
  }
  if (
    hybrid === undefined
    && authored === undefined
    && definition.orientation === "vertical"
    && definition.intercell === true
  ) {
    corrected = applySeamCorrection(
      corrected,
      context.width,
      context.height,
      "horizontal",
      TILE_DIMENSIONS[1],
      12,
      4,
    );
  }

  const output = Buffer.alloc(context.width * context.height * RGBA_CHANNELS);
  let opaquePixels = 0;
  for (let y = 0; y < context.height; y += 1) {
    for (let x = 0; x < context.width; x += 1) {
      const source = rgbOffset(context.width, x, y);
      const destination = rgbaOffset(context.width, x, y);
      output[destination] = corrected[source];
      output[destination + 1] = corrected[source + 1];
      output[destination + 2] = corrected[source + 2];
      const prototypeInfluence = hybrid?.influence[y * context.width + x];
      output[destination + 3] = clampByte(
        (definition.intercell === true ? intercellAlphaWeight : alphaWeight)(
          definition.orientation,
          context.width,
          context.height,
          x,
          y,
        ) * 255 * (prototypeInfluence ?? 1),
      );
      if (output[destination + 3] > 0) opaquePixels += 1;
    }
  }
  const localizedRetouch = hybrid === undefined
    ? undefined
    : Object.freeze({
      alphaTopology: alphaTopology(output, context.width, context.height),
      donorRecords: hybrid.donorRecords,
      patches: hybrid.patches,
      waterHandoff: Object.freeze({
        artboardBounds: Object.freeze([712.5, 738, 728, 781]),
        patchId: "waterfall-native-water-handoff",
        status: "requires-bounded-transition-field",
      }),
    });
  if (
    localizedRetouch !== undefined
    && (
      localizedRetouch.alphaTopology.componentCount !== localizedRetouch.patches.length
      || localizedRetouch.alphaTopology.fullHeightConnectedComponent
      || localizedRetouch.alphaTopology.longestCenterlineRun > 430
      || localizedRetouch.alphaTopology.maximumVerticalSpan > 430
    )
  ) {
    throw new TypeError(
      `The localized seam retouch alpha topology is invalid: ${JSON.stringify(localizedRetouch.alphaTopology)}.`,
    );
  }
  return Object.freeze({
    data: output,
    donorOriginMap: hybrid?.donorOriginMap,
    localizedRetouch,
    opaquePixels,
    waterHandoffInfluence: hybrid?.waterHandoffInfluence,
  });
}

function compositeOverlay(context, overlay) {
  const output = Buffer.alloc(context.width * context.height * RGB_CHANNELS);
  for (let pixel = 0; pixel < context.width * context.height; pixel += 1) {
    const source = pixel * RGB_CHANNELS;
    const replacement = pixel * RGBA_CHANNELS;
    const alpha = overlay.data[replacement + 3] / 255;
    for (let channel = 0; channel < RGB_CHANNELS; channel += 1) {
      output[source + channel] = clampByte(
        overlay.data[replacement + channel] * alpha
        + context.data[source + channel] * (1 - alpha),
      );
    }
  }
  return output;
}

function luma(data, offset) {
  return 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2];
}

function detailEnergy(data, width, height) {
  let total = 0;
  let samples = 0;
  for (let y = 0; y < height - 1; y += 2) {
    for (let x = 0; x < width - 1; x += 2) {
      const center = rgbOffset(width, x, y);
      const right = rgbOffset(width, x + 1, y);
      const down = rgbOffset(width, x, y + 1);
      const centerLuma = luma(data, center);
      total += Math.abs(luma(data, right) - centerLuma);
      total += Math.abs(luma(data, down) - centerLuma);
      samples += 2;
    }
  }
  return samples === 0 ? 0 : total / samples;
}

function histogramMedian(histogram, count) {
  const target = Math.floor((count - 1) / 2);
  let seen = 0;
  for (let value = 0; value < histogram.length; value += 1) {
    seen += histogram[value];
    if (seen > target) return value;
  }
  return 255;
}

function medians(data) {
  const count = data.length / RGB_CHANNELS;
  const histograms = Array.from({ length: 4 }, () => new Uint32Array(256));
  for (let offset = 0; offset < data.length; offset += RGB_CHANNELS) {
    histograms[0][data[offset]] += 1;
    histograms[1][data[offset + 1]] += 1;
    histograms[2][data[offset + 2]] += 1;
    histograms[3][Math.round(luma(data, offset))] += 1;
  }
  return histograms.map((histogram) => histogramMedian(histogram, count));
}

function comparisonMetrics(candidate, reference, width, height) {
  const candidateMedian = medians(candidate);
  const referenceMedian = medians(reference);
  const candidateDetailEnergy = detailEnergy(candidate, width, height);
  const referenceDetailEnergy = detailEnergy(reference, width, height);
  return Object.freeze({
    candidateDetailEnergy: round(candidateDetailEnergy),
    detailEnergyRatio: round(candidateDetailEnergy / referenceDetailEnergy),
    luminanceMedianDeltaPct: round(
      Math.abs(candidateMedian[3] - referenceMedian[3])
      / Math.max(1, referenceMedian[3]) * 100,
    ),
    referenceDetailEnergy: round(referenceDetailEnergy),
    rgbMedianDelta: Object.freeze({
      blue: Math.abs(candidateMedian[2] - referenceMedian[2]),
      green: Math.abs(candidateMedian[1] - referenceMedian[1]),
      red: Math.abs(candidateMedian[0] - referenceMedian[0]),
    }),
  });
}

function nearBlack(data, offset) {
  return data[offset] <= 8 && data[offset + 1] <= 8 && data[offset + 2] <= 8;
}

function pixelDifference(first, firstOffset, second, secondOffset) {
  return (
    Math.abs(first[firstOffset] - second[secondOffset])
    + Math.abs(first[firstOffset + 1] - second[secondOffset + 1])
    + Math.abs(first[firstOffset + 2] - second[secondOffset + 2])
  ) / RGB_CHANNELS;
}

function boundaryMetric(data, width, height, orientation, seam) {
  const vertical = orientation === "vertical";
  const length = vertical ? height : width;
  let boundaryTotal = 0;
  let controlTotal = 0;
  let visiblePairs = 0;
  for (let position = 0; position < length; position += 1) {
    const firstX = vertical ? seam - 1 : position;
    const firstY = vertical ? position : seam - 1;
    const secondX = vertical ? seam : position;
    const secondY = vertical ? position : seam;
    const firstControlX = vertical ? seam - 2 : position;
    const firstControlY = vertical ? position : seam - 2;
    const secondControlX = vertical ? seam + 1 : position;
    const secondControlY = vertical ? position : seam + 1;
    const first = rgbOffset(width, firstX, firstY);
    const second = rgbOffset(width, secondX, secondY);
    if (nearBlack(data, first) || nearBlack(data, second)) continue;
    const firstControl = rgbOffset(width, firstControlX, firstControlY);
    const secondControl = rgbOffset(width, secondControlX, secondControlY);
    boundaryTotal += pixelDifference(data, first, data, second);
    controlTotal += (
      pixelDifference(data, firstControl, data, first)
      + pixelDifference(data, second, data, secondControl)
    ) / 2;
    visiblePairs += 1;
  }
  const boundaryMean = visiblePairs === 0 ? null : boundaryTotal / visiblePairs;
  const controlMean = visiblePairs === 0 ? null : controlTotal / visiblePairs;
  return Object.freeze({
    boundaryMean: round(boundaryMean),
    controlMean: round(controlMean),
    discontinuityRatio: boundaryMean === null || controlMean === 0
      ? null
      : round(boundaryMean / controlMean),
    visiblePairs,
  });
}

function extractRgb(data, sourceWidth, left, top, width, height) {
  const output = Buffer.alloc(width * height * RGB_CHANNELS);
  copyRgbRect({
    destination: output,
    destinationWidth: width,
    destinationX: 0,
    destinationY: 0,
    height,
    source: data,
    sourceWidth,
    sourceX: left,
    sourceY: top,
    width,
  });
  return output;
}

function extractRgba(data, sourceWidth, left, top, width, height) {
  const output = Buffer.alloc(width * height * RGBA_CHANNELS);
  for (let y = 0; y < height; y += 1) {
    const sourceStart = rgbaOffset(sourceWidth, left, top + y);
    const destinationStart = rgbaOffset(width, 0, y);
    data.copy(
      output,
      destinationStart,
      sourceStart,
      sourceStart + width * RGBA_CHANNELS,
    );
  }
  return output;
}

function sourceStripRecords(definition, sources) {
  const records = [];
  const stripPixels = definition.stripPixels;
  definition.pairs.forEach(([firstId, secondId], segment) => {
    if (definition.orientation === "vertical") {
      records.push(
        Object.freeze({
          crop: Object.freeze([
            TILE_DIMENSIONS[0] - stripPixels,
            0,
            stripPixels,
            TILE_DIMENSIONS[1],
          ]),
          role: segment === 0 ? "top-left-neighbor" : "bottom-left-neighbor",
          sourcePath: sources.get(firstId).path,
          sourceSha256: sources.get(firstId).sha256,
          tileId: firstId,
        }),
        Object.freeze({
          crop: Object.freeze([0, 0, stripPixels, TILE_DIMENSIONS[1]]),
          role: segment === 0 ? "top-right-neighbor" : "bottom-right-neighbor",
          sourcePath: sources.get(secondId).path,
          sourceSha256: sources.get(secondId).sha256,
          tileId: secondId,
        }),
      );
    } else {
      records.push(
        Object.freeze({
          crop: Object.freeze([
            0,
            TILE_DIMENSIONS[1] - stripPixels,
            TILE_DIMENSIONS[0],
            stripPixels,
          ]),
          role: segment === 0 ? "left-top-neighbor" : "right-top-neighbor",
          sourcePath: sources.get(firstId).path,
          sourceSha256: sources.get(firstId).sha256,
          tileId: firstId,
        }),
        Object.freeze({
          crop: Object.freeze([0, 0, TILE_DIMENSIONS[0], stripPixels]),
          role: segment === 0 ? "left-bottom-neighbor" : "right-bottom-neighbor",
          sourcePath: sources.get(secondId).path,
          sourceSha256: sources.get(secondId).sha256,
          tileId: secondId,
        }),
      );
    }
  });
  return Object.freeze(records);
}

function segmentMetrics(definition, before, after, width, height) {
  const stripPixels = definition.stripPixels;
  return Object.freeze(definition.pairs.map((pair, index) => {
    const segmentWidth = definition.orientation === "horizontal"
      ? TILE_DIMENSIONS[0]
      : width;
    const segmentHeight = definition.orientation === "vertical"
      ? TILE_DIMENSIONS[1]
      : height;
    const left = definition.orientation === "horizontal"
      ? index * TILE_DIMENSIONS[0]
      : 0;
    const top = definition.orientation === "vertical"
      ? index * TILE_DIMENSIONS[1]
      : 0;
    const beforeSegment = extractRgb(
      before,
      width,
      left,
      top,
      segmentWidth,
      segmentHeight,
    );
    const afterSegment = extractRgb(
      after,
      width,
      left,
      top,
      segmentWidth,
      segmentHeight,
    );
    return Object.freeze({
      after: boundaryMetric(
        afterSegment,
        segmentWidth,
        segmentHeight,
        definition.orientation,
        stripPixels,
      ),
      before: boundaryMetric(
        beforeSegment,
        segmentWidth,
        segmentHeight,
        definition.orientation,
        stripPixels,
      ),
      neighborTileIds: pair,
    });
  }));
}

function alphaBoundaryRun(data, width, height) {
  const present = (x, y) => (
    x >= 0 && x < width && y >= 0 && y < height
    && data[rgbaOffset(width, x, y) + 3] >= 16
  );
  const boundary = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!present(x, y)) continue;
      if (
        !present(x - 1, y) || !present(x + 1, y)
        || !present(x, y - 1) || !present(x, y + 1)
      ) boundary[y * width + x] = 1;
    }
  }
  let longest = 0;
  for (let y = 0; y < height; y += 1) {
    let run = 0;
    for (let x = 0; x < width; x += 1) {
      run = boundary[y * width + x] ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
  }
  for (let x = 0; x < width; x += 1) {
    let run = 0;
    for (let y = 0; y < height; y += 1) {
      run = boundary[y * width + x] ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
  }
  return longest;
}

function alphaTopology(data, width, height) {
  const present = (pixel) => data[pixel * RGBA_CHANNELS + 3] >= 16;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const components = [];
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    if (visited[pixel] || !present(pixel)) continue;
    let head = 0;
    let tail = 0;
    let pixels = 0;
    let minimumX = width;
    let minimumY = height;
    let maximumX = -1;
    let maximumY = -1;
    queue[tail] = pixel;
    tail += 1;
    visited[pixel] = 1;
    while (head < tail) {
      const current = queue[head];
      head += 1;
      const x = current % width;
      const y = Math.floor(current / width);
      pixels += 1;
      minimumX = Math.min(minimumX, x);
      minimumY = Math.min(minimumY, y);
      maximumX = Math.max(maximumX, x);
      maximumY = Math.max(maximumY, y);
      for (const neighbor of [current - 1, current + 1, current - width, current + width]) {
        if (
          neighbor < 0
          || neighbor >= width * height
          || visited[neighbor]
          || !present(neighbor)
        ) continue;
        const neighborX = neighbor % width;
        if (Math.abs(neighborX - x) > 1) continue;
        visited[neighbor] = 1;
        queue[tail] = neighbor;
        tail += 1;
      }
    }
    components.push(Object.freeze({
      bounds: Object.freeze([minimumX, minimumY, maximumX + 1, maximumY + 1]),
      horizontalSpan: maximumX - minimumX + 1,
      pixels,
      verticalSpan: maximumY - minimumY + 1,
    }));
  }

  let longestCenterlineRun = 0;
  for (const centerX of [width / 2 - 1, width / 2]) {
    let run = 0;
    for (let y = 0; y < height; y += 1) {
      const pixel = y * width + centerX;
      run = present(pixel) ? run + 1 : 0;
      longestCenterlineRun = Math.max(longestCenterlineRun, run);
    }
  }
  const maximumVerticalSpan = components.reduce(
    (maximum, component) => Math.max(maximum, component.verticalSpan),
    0,
  );
  return Object.freeze({
    componentCount: components.length,
    components: Object.freeze(components),
    fullHeightConnectedComponent: components.some(
      ({ bounds }) => bounds[1] === 0 && bounds[3] === height,
    ),
    longestCenterlineRun,
    maximumVerticalSpan,
  });
}

function composeCell(cell, sources) {
  const width = TILE_DIMENSIONS[0] * 2;
  const height = TILE_DIMENSIONS[1] * 2;
  const output = Buffer.alloc(width * height * RGB_CHANNELS);
  cell.tiles.forEach((row, rowIndex) => {
    row.forEach((tileId, columnIndex) => {
      copyRgbRect({
        destination: output,
        destinationWidth: width,
        destinationX: columnIndex * TILE_DIMENSIONS[0],
        destinationY: rowIndex * TILE_DIMENSIONS[1],
        height: TILE_DIMENSIONS[1],
        source: sources.get(tileId).raw,
        sourceWidth: TILE_DIMENSIONS[0],
        sourceX: 0,
        sourceY: 0,
        width: TILE_DIMENSIONS[0],
      });
    });
  });
  return Object.freeze({ data: output, height, width });
}

function composeTileGrid(tiles, sources) {
  const width = TILE_DIMENSIONS[0] * tiles[0].length;
  const height = TILE_DIMENSIONS[1] * tiles.length;
  const output = Buffer.alloc(width * height * RGB_CHANNELS);
  tiles.forEach((row, rowIndex) => {
    row.forEach((tileId, columnIndex) => {
      copyRgbRect({
        destination: output,
        destinationWidth: width,
        destinationX: columnIndex * TILE_DIMENSIONS[0],
        destinationY: rowIndex * TILE_DIMENSIONS[1],
        height: TILE_DIMENSIONS[1],
        source: sources.get(tileId).raw,
        sourceWidth: TILE_DIMENSIONS[0],
        sourceX: 0,
        sourceY: 0,
        width: TILE_DIMENSIONS[0],
      });
    });
  });
  return Object.freeze({ data: output, height, width });
}

function compositeIntoRgb(destination, destinationWidth, overlay, x, y) {
  for (let localY = 0; localY < overlay.height; localY += 1) {
    for (let localX = 0; localX < overlay.width; localX += 1) {
      const source = rgbaOffset(overlay.width, localX, localY);
      const target = rgbOffset(destinationWidth, x + localX, y + localY);
      const alpha = overlay.data[source + 3] / 255;
      for (let channel = 0; channel < RGB_CHANNELS; channel += 1) {
        destination[target + channel] = clampByte(
          overlay.data[source + channel] * alpha
          + destination[target + channel] * (1 - alpha),
        );
      }
    }
  }
}

async function pngRgb(data, width, height) {
  return sharp(data, { raw: { channels: 3, height, width } })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

async function pngRgba(data, width, height) {
  return sharp(data, { raw: { channels: 4, height, width } })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

async function writeRgb(file, data, width, height) {
  const bytes = await pngRgb(data, width, height);
  await writeFile(file, bytes);
  return bytes;
}

async function writeProofs(sources, builtResources) {
  await mkdir(PROOF_ROOT, { recursive: true });
  const proof = {};
  for (const cellId of ["B2", "C1", "C2"]) {
    const cell = composeCell(CELLS[cellId], sources);
    const beforeFile = path.join(PROOF_ROOT, `${cellId.toLowerCase()}-full-native-before-r2.png`);
    await writeRgb(beforeFile, cell.data, cell.width, cell.height);
    let after = Buffer.from(cell.data);
    if (cellId !== "C1") {
      const cellResources = builtResources
        .filter(({ definition }) => definition.cellId === cellId)
        .sort((first, second) => first.definition.renderOrder - second.definition.renderOrder);
      for (const resource of cellResources) {
        const x = resource.definition.orientation === "vertical"
          ? TILE_DIMENSIONS[0] - resource.context.width / 2
          : 0;
        const y = resource.definition.orientation === "horizontal"
          ? TILE_DIMENSIONS[1] - resource.context.height / 2
          : 0;
        compositeIntoRgb(
          after,
          cell.width,
          {
            data: resource.overlay.data,
            height: resource.context.height,
            width: resource.context.width,
          },
          x,
          y,
        );
      }
      const afterFile = path.join(PROOF_ROOT, `${cellId.toLowerCase()}-full-native-after-r2.png`);
      await writeRgb(afterFile, after, cell.width, cell.height);
      proof[`${cellId.toLowerCase()}FullAfter`] = path.relative(ROOT, afterFile).replaceAll("\\", "/");
    }
    const cameraCrop = Object.freeze({
      height: Math.ceil((205.2 + 129.6) * TILE_DIMENSIONS[1] / TILE_ARTBOARD[1])
        - Math.floor(205.2 * TILE_DIMENSIONS[1] / TILE_ARTBOARD[1]),
      left: Math.floor(244.8 * TILE_DIMENSIONS[0] / TILE_ARTBOARD[0]),
      top: Math.floor(205.2 * TILE_DIMENSIONS[1] / TILE_ARTBOARD[1]),
      width: Math.ceil((244.8 + 230.4) * TILE_DIMENSIONS[0] / TILE_ARTBOARD[0])
        - Math.floor(244.8 * TILE_DIMENSIONS[0] / TILE_ARTBOARD[0]),
    });
    const fixed = extractRgb(
      after,
      cell.width,
      cameraCrop.left,
      cameraCrop.top,
      cameraCrop.width,
      cameraCrop.height,
    );
    const fixedFile = path.join(
      PROOF_ROOT,
      `${cellId.toLowerCase()}-fixed-camera-composite-r2.png`,
    );
    await writeRgb(fixedFile, fixed, cameraCrop.width, cameraCrop.height);
    proof[`${cellId.toLowerCase()}FixedCamera`] = path.relative(ROOT, fixedFile).replaceAll("\\", "/");
    proof[`${cellId.toLowerCase()}FullBefore`] = path.relative(ROOT, beforeFile).replaceAll("\\", "/");
  }

  const resourcesById = new Map(
    builtResources.map((resource) => [resource.definition.id, resource]),
  );
  // Internal-only recovery deliberately has no admissible inter-cell overlay.
  // Keep its native failures in fullNativeSweep, but do not manufacture an
  // after-proof for a rejected resource.
  if (!resourcesById.has("b2-c2-intercell-vertical-seam")) {
    return Object.freeze(proof);
  }
  const verticalBoundary = composeTileGrid([
    ["r2-c1", "r2-c2"],
    ["r3-c1", "r3-c2"],
  ], sources);
  const verticalAfter = Buffer.from(verticalBoundary.data);
  const b2Horizontal = resourcesById.get("b2-internal-horizontal-seam");
  const c2Horizontal = resourcesById.get("c2-internal-horizontal-seam");
  const intercellVertical = resourcesById.get("b2-c2-intercell-vertical-seam");
  if (intercellVertical.overlay.localizedRetouch !== undefined) {
    const alphaMask = Buffer.alloc(
      intercellVertical.context.width
      * intercellVertical.context.height
      * RGB_CHANNELS,
    );
    for (
      let pixel = 0;
      pixel < intercellVertical.context.width * intercellVertical.context.height;
      pixel += 1
    ) {
      const alpha = intercellVertical.overlay.data[pixel * RGBA_CHANNELS + 3];
      const offset = pixel * RGB_CHANNELS;
      alphaMask[offset] = alpha;
      alphaMask[offset + 1] = alpha;
      alphaMask[offset + 2] = alpha;
    }
    const alphaMaskFile = path.join(
      PROOF_ROOT,
      "intercell-vertical-localized-retouch-alpha-mask-r3.png",
    );
    await writeRgb(
      alphaMaskFile,
      alphaMask,
      intercellVertical.context.width,
      intercellVertical.context.height,
    );
    proof.intercellVerticalLocalizedRetouchAlphaMask = path.relative(
      ROOT,
      alphaMaskFile,
    ).replaceAll("\\", "/");
    const donorPalette = Object.freeze([
      Object.freeze([0, 0, 0]),
      Object.freeze([230, 77, 77]),
      Object.freeze([236, 168, 64]),
      Object.freeze([233, 220, 75]),
      Object.freeze([76, 190, 116]),
      Object.freeze([75, 174, 220]),
      Object.freeze([98, 112, 224]),
      Object.freeze([172, 91, 218]),
      Object.freeze([224, 92, 162]),
    ]);
    const donorOriginMap = Buffer.alloc(alphaMask.length);
    const waterHandoffMask = Buffer.alloc(alphaMask.length);
    for (
      let pixel = 0;
      pixel < intercellVertical.context.width * intercellVertical.context.height;
      pixel += 1
    ) {
      const offset = pixel * RGB_CHANNELS;
      const donorIndex = intercellVertical.overlay.donorOriginMap[pixel];
      const donorColor = donorPalette[donorIndex];
      const waterAlpha = clampByte(
        intercellVertical.overlay.waterHandoffInfluence[pixel] * 255,
      );
      donorOriginMap[offset] = donorColor[0];
      donorOriginMap[offset + 1] = donorColor[1];
      donorOriginMap[offset + 2] = donorColor[2];
      waterHandoffMask[offset] = waterAlpha;
      waterHandoffMask[offset + 1] = waterAlpha;
      waterHandoffMask[offset + 2] = waterAlpha;
    }
    const donorOriginFile = path.join(
      PROOF_ROOT,
      "intercell-vertical-native-donor-origins-r3.png",
    );
    const waterHandoffFile = path.join(
      PROOF_ROOT,
      "intercell-vertical-native-water-handoff-mask-r3.png",
    );
    await Promise.all([
      writeRgb(
        donorOriginFile,
        donorOriginMap,
        intercellVertical.context.width,
        intercellVertical.context.height,
      ),
      writeRgb(
        waterHandoffFile,
        waterHandoffMask,
        intercellVertical.context.width,
        intercellVertical.context.height,
      ),
    ]);
    proof.intercellVerticalNativeDonorOrigins = path.relative(
      ROOT,
      donorOriginFile,
    ).replaceAll("\\", "/");
    proof.intercellVerticalNativeWaterHandoffMask = path.relative(
      ROOT,
      waterHandoffFile,
    ).replaceAll("\\", "/");
  }
  compositeIntoRgb(verticalAfter, verticalBoundary.width, {
    data: extractRgba(
      b2Horizontal.overlay.data,
      b2Horizontal.context.width,
      TILE_DIMENSIONS[0],
      0,
      TILE_DIMENSIONS[0],
      b2Horizontal.context.height,
    ),
    height: b2Horizontal.context.height,
    width: TILE_DIMENSIONS[0],
  }, 0, TILE_DIMENSIONS[1] - b2Horizontal.context.height / 2);
  compositeIntoRgb(verticalAfter, verticalBoundary.width, {
    data: extractRgba(
      c2Horizontal.overlay.data,
      c2Horizontal.context.width,
      0,
      0,
      TILE_DIMENSIONS[0],
      c2Horizontal.context.height,
    ),
    height: c2Horizontal.context.height,
    width: TILE_DIMENSIONS[0],
  }, TILE_DIMENSIONS[0], TILE_DIMENSIONS[1] - c2Horizontal.context.height / 2);
  compositeIntoRgb(verticalAfter, verticalBoundary.width, {
    data: intercellVertical.overlay.data,
    height: intercellVertical.context.height,
    width: intercellVertical.context.width,
  }, TILE_DIMENSIONS[0] - intercellVertical.context.width / 2, 0);

  const horizontalBoundary = composeTileGrid([
    ["r1-c2", "r1-c3"],
    ["r2-c2", "r2-c3"],
  ], sources);
  const horizontalAfter = Buffer.from(horizontalBoundary.data);
  const c2Vertical = resourcesById.get("c2-internal-vertical-seam");
  const intercellHorizontal = resourcesById.get("c1-c2-intercell-horizontal-seam");
  compositeIntoRgb(horizontalAfter, horizontalBoundary.width, {
    data: extractRgba(
      c2Vertical.overlay.data,
      c2Vertical.context.width,
      0,
      0,
      c2Vertical.context.width,
      TILE_DIMENSIONS[1],
    ),
    height: TILE_DIMENSIONS[1],
    width: c2Vertical.context.width,
  }, TILE_DIMENSIONS[0] - c2Vertical.context.width / 2, TILE_DIMENSIONS[1]);
  compositeIntoRgb(horizontalAfter, horizontalBoundary.width, {
    data: intercellHorizontal.overlay.data,
    height: intercellHorizontal.context.height,
    width: intercellHorizontal.context.width,
  }, 0, TILE_DIMENSIONS[1] - intercellHorizontal.context.height / 2);

  for (const [key, name, composite, after] of [
    ["intercellVerticalFull", "intercell-vertical-full", verticalBoundary, verticalAfter],
    ["intercellHorizontalFull", "intercell-horizontal-full", horizontalBoundary, horizontalAfter],
  ]) {
    const beforeFile = path.join(PROOF_ROOT, `${name}-before-r3.png`);
    const afterFile = path.join(PROOF_ROOT, `${name}-after-r3.png`);
    await Promise.all([
      writeRgb(beforeFile, composite.data, composite.width, composite.height),
      writeRgb(afterFile, after, composite.width, composite.height),
    ]);
    proof[`${key}Before`] = path.relative(ROOT, beforeFile).replaceAll("\\", "/");
    proof[`${key}After`] = path.relative(ROOT, afterFile).replaceAll("\\", "/");
  }

  const imagegenVerticalInput = Object.freeze({
    height: verticalBoundary.height,
    left: TILE_DIMENSIONS[0] - 384,
    top: 0,
    width: 768,
  });
  const imagegenVerticalInputFile = path.join(
    PROOF_ROOT,
    "intercell-vertical-imagegen-edit-input-768x2172-native-r3.png",
  );
  const imagegenVerticalInputBytes = await writeRgb(
    imagegenVerticalInputFile,
    extractRgb(
      verticalBoundary.data,
      verticalBoundary.width,
      imagegenVerticalInput.left,
      imagegenVerticalInput.top,
      imagegenVerticalInput.width,
      imagegenVerticalInput.height,
    ),
    imagegenVerticalInput.width,
    imagegenVerticalInput.height,
  );
  if (
    sha256(imagegenVerticalInputBytes)
    !== IMAGEGEN_AUTHORED_SOURCES["b2-c2-intercell-vertical-seam"].input.sha256
  ) {
    throw new TypeError("ImageGen vertical edit input provenance drifted.");
  }
  proof.imagegenVerticalEditInput = path.relative(
    ROOT,
    imagegenVerticalInputFile,
  ).replaceAll("\\", "/");

  const imagegenHorizontalTargets = Object.freeze([
    Object.freeze({ left: 0, top: TILE_DIMENSIONS[1] / 2 }),
    Object.freeze({ left: 1360, top: TILE_DIMENSIONS[1] / 2 }),
  ]);
  proof.imagegenHorizontalEditTargets = [];
  for (const [index, target] of imagegenHorizontalTargets.entries()) {
    const targetFile = path.join(
      PROOF_ROOT,
      `intercell-horizontal-imagegen-edit-target-${index + 1}-native-r3.png`,
    );
    await writeRgb(
      targetFile,
      extractRgb(
        horizontalBoundary.data,
        horizontalBoundary.width,
        target.left,
        target.top,
        1536,
        TILE_DIMENSIONS[1],
      ),
      1536,
      TILE_DIMENSIONS[1],
    );
    proof.imagegenHorizontalEditTargets.push(
      path.relative(ROOT, targetFile).replaceAll("\\", "/"),
    );
  }

  async function writeRegisteredCrop({
    after,
    composite,
    gridOrigin,
    key,
    name,
    view,
  }) {
    const left = Math.floor(
      (view.origin[0] - gridOrigin[0]) * TILE_DIMENSIONS[0] / TILE_ARTBOARD[0],
    );
    const top = Math.floor(
      (view.origin[1] - gridOrigin[1]) * TILE_DIMENSIONS[1] / TILE_ARTBOARD[1],
    );
    const right = Math.ceil(
      (view.origin[0] + view.span[0] - gridOrigin[0])
        * TILE_DIMENSIONS[0] / TILE_ARTBOARD[0],
    );
    const bottom = Math.ceil(
      (view.origin[1] + view.span[1] - gridOrigin[1])
        * TILE_DIMENSIONS[1] / TILE_ARTBOARD[1],
    );
    const width = right - left;
    const height = bottom - top;
    const beforeCrop = extractRgb(
      composite.data,
      composite.width,
      left,
      top,
      width,
      height,
    );
    const afterCrop = extractRgb(after, composite.width, left, top, width, height);
    const beforeFile = path.join(PROOF_ROOT, `${name}-before-r3.png`);
    const afterFile = path.join(PROOF_ROOT, `${name}-after-r3.png`);
    await Promise.all([
      writeRgb(beforeFile, beforeCrop, width, height),
      writeRgb(afterFile, afterCrop, width, height),
    ]);
    proof[`${key}Before`] = path.relative(ROOT, beforeFile).replaceAll("\\", "/");
    proof[`${key}After`] = path.relative(ROOT, afterFile).replaceAll("\\", "/");
  }

  await writeRegisteredCrop({
    after: verticalAfter,
    composite: verticalBoundary,
    gridOrigin: [360, 540],
    key: "intercellFixedCamera",
    name: "intercell-fixed-camera-composite",
    view: { origin: [544.8, 610.2], span: [230.4, 129.6] },
  });
  await writeRegisteredCrop({
    after: verticalAfter,
    composite: verticalBoundary,
    gridOrigin: [360, 540],
    key: "intercellWaterfallCheckpoint",
    name: "intercell-waterfall-checkpoint-composite",
    view: { origin: [544.8, 690], span: [230.4, 129.6] },
  });
  await writeRegisteredCrop({
    after: horizontalAfter,
    composite: horizontalBoundary,
    gridOrigin: [720, 270],
    key: "intercellHorizontalCheckpoint",
    name: "intercell-horizontal-checkpoint-composite",
    view: { origin: [964.8, 475.2], span: [230.4, 129.6] },
  });
  return Object.freeze(proof);
}

function fullSweep(sources) {
  const results = [];
  const definitions = [
    ...Object.keys(CELLS).flatMap((cellId) => resourceDefinitionsFor(cellId)),
    ...ALL_RESOURCE_DEFINITIONS.filter(({ intercell }) => intercell === true),
  ];
  for (const definition of definitions) {
    const context = buildNeighborContext(definition, sources);
    const stripPixels = definition.stripPixels;
    definition.pairs.forEach((pair, segmentIndex) => {
      const width = definition.orientation === "horizontal"
        ? TILE_DIMENSIONS[0]
        : context.width;
      const height = definition.orientation === "vertical"
        ? TILE_DIMENSIONS[1]
        : context.height;
      const left = definition.orientation === "horizontal"
        ? segmentIndex * TILE_DIMENSIONS[0]
        : 0;
      const top = definition.orientation === "vertical"
        ? segmentIndex * TILE_DIMENSIONS[1]
        : 0;
      const segment = extractRgb(context.data, context.width, left, top, width, height);
      results.push(Object.freeze({
        cellId: definition.cellId,
        decision: definition.intercell === true
          ? "UNRESOLVED-missing-accepted-intercell-overlay"
          : definition.cellId === "C1"
            ? "no-overlay-authorized-coast-and-void-topology-retained"
            : "minimum-width-overlay-required",
        metrics: boundaryMetric(
          segment,
          width,
          height,
          definition.orientation,
          stripPixels,
        ),
        neighborTileIds: pair,
        orientation: definition.orientation,
        segment: segmentIndex === 0
          ? definition.orientation === "vertical" ? "top" : "left"
          : definition.orientation === "vertical" ? "bottom" : "right",
      }));
    });
  }
  return Object.freeze(results);
}

function validateMetrics(resources) {
  for (const resource of resources) {
    const comparison = resource.manifestResource.metrics.nativeOriginalComparison;
    if (
      comparison.detailEnergyRatio < 0.85
      || comparison.luminanceMedianDeltaPct > 5
      || Object.values(comparison.rgbMedianDelta).some((value) => value > 12)
      || resource.manifestResource.metrics.longestAlphaBoundaryRun > 48
      || resource.manifestResource.metrics.segments.some((segment) => (
        segment.after.discontinuityRatio === null
        || segment.after.discontinuityRatio > 1.15
      ))
    ) {
      throw new TypeError(
        `Generated seam resource ${resource.definition.id} missed its quality gate: ${JSON.stringify(resource.manifestResource.metrics)}.`,
      );
    }
  }
}

async function removeRejectedIntercellOutputs() {
  if (WIDE_AUTHORED_PROTOTYPE) return;
  const outputRoot = path.resolve(OUTPUT_ROOT);
  for (const name of REJECTED_INTERCELL_OUTPUT_FILES) {
    const target = path.resolve(outputRoot, name);
    if (path.dirname(target) !== outputRoot) {
      throw new RangeError(`Rejected seam cleanup target escaped the output root: ${target}`);
    }
    await rm(target, { force: true });
  }
}

export async function buildNinjaOneEnvironmentSeamIntegration() {
  const [sources, authoredTransitions] = await Promise.all([
    loadAuthoritySources(),
    Promise.resolve(new Map()),
  ]);
  await mkdir(OUTPUT_ROOT, { recursive: true });
  await removeRejectedIntercellOutputs();
  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  if (WRITE_REVIEW_ARTIFACTS) {
    await mkdir(ARTIFACT_ROOT, { recursive: true });
  }
  const builtResources = [];

  for (const definition of RESOURCE_DEFINITIONS) {
    const context = buildNeighborContext(definition, sources);
    const authoredTransition = authoredTransitions.get(definition.id);
    const overlay = buildOverlay(context, definition, authoredTransitions, sources);
    const composited = compositeOverlay(context, overlay);
    const contextFile = path.join(OUTPUT_ROOT, `${definition.id}-native-neighbor-context-r2.png`);
    const outputFile = path.join(OUTPUT_ROOT, `${definition.id}-r2.png`);
    const contextBytes = await writeRgb(
      contextFile,
      context.data,
      context.width,
      context.height,
    );
    const overlayBytes = await pngRgba(
      overlay.data,
      context.width,
      context.height,
    );
    await writeFile(outputFile, overlayBytes);
    const digest = sha256(overlayBytes);
    const contextDigest = sha256(contextBytes);
    const strips = sourceStripRecords(definition, sources);
    const comparison = comparisonMetrics(
      composited,
      context.data,
      context.width,
      context.height,
    );
    const manifestResource = Object.freeze({
      artboardBounds: definition.artboardBounds,
      cellId: definition.cellId,
      decodedBytes: context.width * context.height * RGBA_CHANNELS,
      dimensions: Object.freeze([context.width, context.height]),
      id: definition.id,
      integrationType: "native-original-seam-integration",
      imagegenAuthoredSource: authoredTransition === undefined ? undefined : Object.freeze({
          dimensions: authoredTransition.provenance.dimensions,
          extraction: authoredTransition.provenance.extraction,
          input: authoredTransition.provenance.input,
          path: `/art-source/career-world/ninjaone-environment/seam-integration-r2/authored-r3/${authoredTransition.provenance.file}`,
          promptSha256: authoredTransition.provenance.promptSha256,
          provider: "built-in-imagegen-precise-object-edit",
          sha256: authoredTransition.provenance.sha256,
        }),
        metrics: Object.freeze({
          longestAlphaBoundaryRun: alphaBoundaryRun(
            overlay.data,
            context.width,
            context.height,
          ),
          localizedRetouch: overlay.localizedRetouch,
          nativeOriginalComparison: comparison,
          segments: segmentMetrics(
          definition,
          context.data,
          composited,
          context.width,
          context.height,
        ),
      }),
      nativeOriginalComparison: Object.freeze({
        referenceCrop: Object.freeze([0, 0, context.width, context.height]),
        referencePath: publicPath(contextFile),
        referenceSha256: contextDigest,
      }),
      minimumWidthPixels: Math.min(context.width, context.height),
      nativeSeamPixel: definition.stripPixels,
      opaquePixels: overlay.opaquePixels,
      orientation: definition.orientation,
      path: `${publicPath(outputFile)}?v=${digest.slice(0, 12).toLowerCase()}`,
      renderOrder: definition.renderOrder,
      seamCoordinate: definition.seamCoordinate,
      sha256: digest,
      sourceDimensions: TILE_DIMENSIONS,
      sourcePaths: Object.freeze([...new Set(strips.map(({ sourcePath: value }) => value))]),
      sourceStrips: strips,
    });
    builtResources.push(Object.freeze({
      context,
      definition,
      manifestResource,
      overlay,
    }));
  }

  validateMetrics(builtResources);
  const selectorCheckpoints = Object.freeze(Object.fromEntries(
    Object.entries(SELECTOR_CHECKPOINTS).map(([id, checkpoint]) => {
      const artboardView = cameraArtboardView(checkpoint.camera);
      const selected = builtResources.filter(({ manifestResource }) => (
        intersects(artboardView, manifestResource.artboardBounds)
      ));
      const resourceIds = selected.map(({ definition }) => definition.id);
      if (resourceIds.join(",") !== checkpoint.expectedResourceIds.join(",")) {
        throw new TypeError(`Seam selector checkpoint ${id} drifted: ${resourceIds.join(",")}.`);
      }
      return [id, Object.freeze({
        artboardView,
        camera: checkpoint.camera,
        decodedBytes: selected.reduce(
          (total, { manifestResource }) => total + manifestResource.decodedBytes,
          0,
        ),
        paintedNodeCount: selected.reduce(
          (total) => total + 1,
          0,
        ),
        resourceIds: Object.freeze(resourceIds),
      })];
    }),
  ));
  const [maximumCheckpointId, maximumCheckpoint] = Object.entries(selectorCheckpoints)
    .reduce((maximum, candidate) => (
      candidate[1].decodedBytes > maximum[1].decodedBytes ? candidate : maximum
    ));
  const seamDecodedBytes = maximumCheckpoint.decodedBytes;
  const maximumPaintedSupplementNodes = Math.max(
    ...Object.values(selectorCheckpoints).map(({ paintedNodeCount }) => paintedNodeCount),
  );
  if (maximumPaintedSupplementNodes > MAXIMUM_SUPPLEMENTAL_NODES) {
    throw new RangeError("The seam integration exceeds the painted supplement-node budget.");
  }
  const fixedC2SeamDecodedBytes = builtResources
    .filter(({ definition }) => definition.cellId === "C2")
    .reduce((total, { manifestResource }) => total + manifestResource.decodedBytes, 0);
  const fixedC2DecodedUnion = TERRAIN_TILE_DECODED_BYTES * 4
    + C2_FOLIAGE_DECODED_BYTES
    + fixedC2SeamDecodedBytes;
  const maximumRequiredDecodedUnion = TERRAIN_TILE_DECODED_BYTES * 4
    + seamDecodedBytes;
  const maximumApplicationOwnedDecodedUnion = Math.max(
    fixedC2DecodedUnion,
    maximumRequiredDecodedUnion,
  );
  if (maximumApplicationOwnedDecodedUnion > MAXIMUM_DECODED_BYTES) {
    throw new RangeError("The seam integration exceeds the 32 MiB decoded union.");
  }

  if (WRITE_REVIEW_ARTIFACTS) {
    await writeProofs(sources, builtResources);
  }
  const sweep = fullSweep(sources);
  const authoritySources = Object.freeze(
    [...sources.values()].map((source) => Object.freeze({
      dimensions: TILE_DIMENSIONS,
      id: source.id,
      path: source.path,
      sha256: source.sha256,
      storage: "png-rgb-8",
    })),
  );
  const manifest = Object.freeze({
    schemaVersion: 2,
    id: "career-world/capitals/ninjaone/seam-integration@r2",
    status: "partial-internal-accepted-intercell-unresolved",
    authority: Object.freeze({
      sources: authoritySources,
      statement: "12 exact native RGB 1448x1086 generated-r2 originals",
    }),
    registration: Object.freeze({
      artboard: ARTBOARD,
      coordinateMathScale: 4,
      nativeTileDimensions: TILE_DIMENSIONS,
      tileArtboard: TILE_ARTBOARD,
    }),
    derivation: Object.freeze({
      baseMutation: "none",
      colorOperation: "bounded symmetric low-frequency seam correction",
      context: "exact 32-pixel accepted internal strips; inter-cell joins are audited but intentionally unselected",
      interpolation: "none",
      resampling: "none",
      topologyOperation: "none",
    }),
    budgets: Object.freeze({
      fixedC2DecodedUnion,
      fixedC2SeamDecodedBytes,
      maximumApplicationOwnedDecodedUnion,
      maximumCohortId: maximumCheckpointId,
      maximumDecodedBytes: MAXIMUM_DECODED_BYTES,
      maximumMountedResources: maximumCheckpoint.resourceIds.length,
      maximumPaintedSupplementNodes,
      maximumSupplementalNodes: MAXIMUM_SUPPLEMENTAL_NODES,
      rejectedIntercellDecodedBytes: 0,
      seamDecodedBytes,
      totalAuthoredDecodedBytes: builtResources.reduce(
        (total, { manifestResource }) => total + manifestResource.decodedBytes,
        0,
      ),
      unionBreakdown: Object.freeze({
        foliageDecodedBytes: C2_FOLIAGE_DECODED_BYTES,
        seamDecodedBytes,
        terrainDecodedBytes: TERRAIN_TILE_DECODED_BYTES * 4,
      }),
      unionSupplementalNodeBreakdown: Object.freeze({
        foliage: 0,
        seam: maximumPaintedSupplementNodes,
      }),
    }),
    fixedCheckpointDecisions: Object.freeze({
      B2: "four native seam segments repaired by two minimum-width overlays",
      C1: "native coast-and-void topology inspected; no seam overlay authorized",
      C2: "four native seam segments repaired by two minimum-width overlays",
      "B2-C2": "UNRESOLVED: two inter-cell column segments have no accepted overlay",
      "C1-C2": "UNRESOLVED: two inter-cell row segments have no accepted overlay",
    }),
    fullNativeSweep: sweep,
    resources: Object.freeze(builtResources.map(({ manifestResource }) => manifestResource)),
    selectorCheckpoints,
  });
  await writeJsonAtomically(MANIFEST_PATH, manifest);
  if (WRITE_REVIEW_ARTIFACTS) {
    await writeFile(
      path.join(ARTIFACT_ROOT, "native-boundary-sweep-metrics-r2-recovery.json"),
      `${JSON.stringify({ authoritySources, sweep }, null, 2)}\n`,
    );
    await writeFile(
      path.join(ARTIFACT_ROOT, "seam-integration-runtime-contract-r2-recovery.json"),
      `${JSON.stringify({
        budgets: manifest.budgets,
        manifestId: manifest.id,
        resources: manifest.resources.map((resource) => ({
          artboardBounds: resource.artboardBounds,
          decodedBytes: resource.decodedBytes,
          id: resource.id,
          orientation: resource.orientation,
          path: resource.path,
          renderOrder: resource.renderOrder,
        })),
        selectorCheckpoints,
      }, null, 2)}\n`,
    );
  }
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await buildNinjaOneEnvironmentSeamIntegration();
  console.log(JSON.stringify({
    decodedUnion: manifest.budgets.maximumApplicationOwnedDecodedUnion,
    manifest: path.relative(ROOT, MANIFEST_PATH),
    resourceIds: manifest.resources.map(({ id }) => id),
    seamDecodedBytes: manifest.budgets.seamDecodedBytes,
  }, null, 2));
}
