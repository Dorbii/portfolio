import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

sharp.cache(false);
sharp.concurrency(1);

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const manifestPath = join(
  repositoryRoot,
  "public",
  "career-world",
  "art",
  "runtime-art-manifest.json",
);
const requestedAsset = process.argv
  .find((argument) => argument.startsWith("--asset="))
  ?.slice("--asset=".length);
const previewOutput = process.argv
  .find((argument) => argument.startsWith("--preview-output="))
  ?.slice("--preview-output=".length);
const rebuildFromSource = process.argv.includes("--from-source");
if (previewOutput && !requestedAsset) {
  throw new Error("--preview-output requires exactly one --asset");
}

const CATEGORY_LIMITS = Object.freeze({
  ambient: Object.freeze({ width: 520, height: 380 }),
  city: Object.freeze({ width: 900, height: 760 }),
  project: Object.freeze({ width: 860, height: 680 }),
  skill: Object.freeze({ width: 620, height: 560 }),
});
const TRANSPARENT_GUARD_PX = 2;

function evenFloor(value) {
  return Math.max(2, Math.floor(value / 2) * 2);
}

function sourceResizeDimensions(record) {
  const category = record.asset_id.split("/", 1)[0];
  const limit = CATEGORY_LIMITS[category];
  if (!limit) {
    throw new Error(`No runtime resize limit for ${record.asset_id}`);
  }
  const scale = Math.min(
    1,
    limit.width / record.crop.width,
    limit.height / record.crop.height,
  );
  return {
    width: evenFloor(record.crop.width * scale),
    height: evenFloor(record.crop.height * scale),
  };
}

function luminance(red, green, blue) {
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor((sorted.length - 1) * fraction)] ?? 0;
}

function estimateBorderLuminance(pixels, width, height) {
  const samples = [];
  const stride = Math.max(1, Math.floor(Math.min(width, height) / 160));
  const border = Math.max(2, Math.floor(Math.min(width, height) * 0.035));
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      if (x >= border && x < width - border && y >= border && y < height - border) {
        continue;
      }
      const offset = (y * width + x) * 3;
      samples.push(
        luminance(pixels[offset], pixels[offset + 1], pixels[offset + 2]),
      );
    }
  }
  return percentile(samples, 0.35);
}

function erode(mask, width, height, iterations = 1) {
  let current = mask;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const next = new Uint8Array(current.length);
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        let keep = 1;
        for (let dy = -1; dy <= 1 && keep; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (!current[index + dy * width + dx]) {
              keep = 0;
              break;
            }
          }
        }
        next[index] = keep;
      }
    }
    current = next;
  }
  return current;
}

function dilate(mask, width, height, iterations = 1) {
  let current = mask;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const next = new Uint8Array(current);
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        if (!current[index]) continue;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            next[index + dy * width + dx] = 1;
          }
        }
      }
    }
    current = next;
  }
  return current;
}

function fillHoles(mask, width, height) {
  const exterior = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  let head = 0;
  let tail = 0;
  const enqueue = (index) => {
    if (mask[index] || exterior[index]) return;
    exterior[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }
  const filled = new Uint8Array(mask.length);
  for (let index = 0; index < mask.length; index += 1) {
    filled[index] = mask[index] || !exterior[index] ? 1 : 0;
  }
  return filled;
}

function retainDensePixels(mask, width, height) {
  const dense = new Uint8Array(mask.length);
  const radius = 2;
  for (let y = radius; y < height - radius; y += 1) {
    for (let x = radius; x < width - radius; x += 1) {
      const index = y * width + x;
      if (!mask[index]) continue;
      let neighbors = 0;
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          neighbors += mask[index + dy * width + dx];
        }
      }
      // One-pixel board grids have roughly five neighbors in this window.
      // Authored facade strokes and filled building faces exceed this density.
      if (neighbors >= 8) dense[index] = 1;
    }
  }
  return dense;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function smoothEnvelope(values, maximum, windowRadius = 3) {
  const result = [...values];
  for (let index = 0; index < values.length; index += 1) {
    const neighbors = [];
    for (
      let cursor = Math.max(0, index - windowRadius);
      cursor <= Math.min(values.length - 1, index + windowRadius);
      cursor += 1
    ) {
      if (values[cursor] !== null) neighbors.push(values[cursor]);
    }
    if (neighbors.length >= 2) result[index] = Math.max(0, Math.min(maximum, median(neighbors)));
  }
  return result;
}

function silhouetteEnvelope(mask, width, height) {
  const left = Array(height).fill(null);
  const right = Array(height).fill(null);
  const top = Array(width).fill(null);
  const bottom = Array(width).fill(null);
  const minimumRowPixels = Math.max(4, Math.floor(width * 0.006));
  const minimumColumnPixels = Math.max(4, Math.floor(height * 0.006));

  for (let y = 0; y < height; y += 1) {
    const xs = [];
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x]) xs.push(x);
    }
    if (xs.length < minimumRowPixels) continue;
    const span = xs.at(-1) - xs[0];
    if (span > width * 0.92 && xs.length < width * 0.075) continue;
    left[y] = Math.max(0, xs[0] - 3);
    right[y] = Math.min(width - 1, xs.at(-1) + 3);
  }

  for (let x = 0; x < width; x += 1) {
    const ys = [];
    for (let y = 0; y < height; y += 1) {
      if (mask[y * width + x]) ys.push(y);
    }
    if (ys.length < minimumColumnPixels) continue;
    const span = ys.at(-1) - ys[0];
    if (span > height * 0.92 && ys.length < height * 0.075) continue;
    top[x] = Math.max(0, ys[0] - 3);
    bottom[x] = Math.min(height - 1, ys.at(-1) + 3);
  }

  const smoothedLeft = smoothEnvelope(left, width - 1);
  const smoothedRight = smoothEnvelope(right, width - 1);
  const smoothedTop = smoothEnvelope(top, height - 1);
  const smoothedBottom = smoothEnvelope(bottom, height - 1);
  const envelope = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    if (smoothedLeft[y] === null || smoothedRight[y] === null) continue;
    for (let x = smoothedLeft[y]; x <= smoothedRight[y]; x += 1) {
      if (smoothedTop[x] === null || smoothedBottom[x] === null) continue;
      if (y >= smoothedTop[x] && y <= smoothedBottom[x]) {
        envelope[y * width + x] = 1;
      }
    }
  }
  return envelope;
}

function buildForegroundMask(pixels, width, height) {
  const background = estimateBorderLuminance(pixels, width, height);
  const threshold = Math.max(25, background + 18);
  const marginX = Math.max(2, Math.floor(width * 0.018));
  const marginY = Math.max(2, Math.floor(height * 0.018));
  let mask = new Uint8Array(width * height);
  for (let y = marginY; y < height - marginY; y += 1) {
    for (let x = marginX; x < width - marginX; x += 1) {
      const pixelIndex = y * width + x;
      const offset = pixelIndex * 3;
      const value = luminance(
        pixels[offset],
        pixels[offset + 1],
        pixels[offset + 2],
      );
      mask[pixelIndex] = value >= threshold ? 1 : 0;
    }
  }

  mask = retainDensePixels(mask, width, height);
  mask = silhouetteEnvelope(mask, width, height);
  mask = fillHoles(erode(dilate(mask, width, height, 2), width, height, 1), width, height);
  const final = new Uint8Array(width * height);
  for (let index = 0; index < mask.length; index += 1) {
    final[index] = mask[index] ? 255 : 0;
  }
  return { alpha: final, background, threshold };
}

function alphaBounds(alpha, width, height) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  let opaquePixels = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (alpha[y * width + x] === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
      opaquePixels += 1;
    }
  }
  if (right < left || bottom < top) {
    throw new Error("Foreground mask is empty; refusing to replace runtime art");
  }
  return {
    left,
    top,
    right,
    bottom,
    width: right - left + 1,
    height: bottom - top + 1,
    opaquePixels,
  };
}

function tightRgbaWithGuard(pixels, alpha, sourceWidth, bounds) {
  const width = bounds.width + TRANSPARENT_GUARD_PX * 2;
  const height = bounds.height + TRANSPARENT_GUARD_PX * 2;
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < bounds.height; y += 1) {
    const sourceY = bounds.top + y;
    for (let x = 0; x < bounds.width; x += 1) {
      const sourceX = bounds.left + x;
      const sourceOffset = (sourceY * sourceWidth + sourceX) * 3;
      const destinationOffset =
        ((y + TRANSPARENT_GUARD_PX) * width +
          x +
          TRANSPARENT_GUARD_PX) *
        4;
      rgba[destinationOffset] = pixels[sourceOffset];
      rgba[destinationOffset + 1] = pixels[sourceOffset + 1];
      rgba[destinationOffset + 2] = pixels[sourceOffset + 2];
      rgba[destinationOffset + 3] = alpha[sourceY * sourceWidth + sourceX];
    }
  }
  return { data: rgba, width, height };
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
let processedCount = 0;
for (const record of manifest.records) {
  if (requestedAsset && record.asset_id !== requestedAsset) continue;
  const relativePath = record.runtime_path.replace(/^\//, "");
  const outputPath = join(repositoryRoot, relativePath);
  const destinationPath = previewOutput ? resolve(previewOutput) : outputPath;
  await mkdir(dirname(destinationPath), { recursive: true });
  if (record.asset_id.startsWith("world/")) {
    // The geography is the only intentionally opaque runtime asset. It is
    // already canonical and must not be touched by the transparent-sprite job.
    processedCount += 1;
    continue;
  }
  const temporaryPath = `${destinationPath}.alpha.webp`;
  let rgbPipeline;
  let pretrimDimensions;
  if (rebuildFromSource) {
    const sourcePath = join(repositoryRoot, record.source_path);
    const crop = record.crop;
    const target = sourceResizeDimensions(record);
    rgbPipeline = sharp(sourcePath)
      .extract({
        left: crop.x,
        top: crop.y,
        width: crop.width,
        height: crop.height,
      })
      .resize({
        width: target.width,
        height: target.height,
        fit: "fill",
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3,
      })
      .removeAlpha();
    pretrimDimensions = target;
  } else {
    rgbPipeline = sharp(outputPath).removeAlpha();
  }
  const { data: pixels, info } = await rgbPipeline
    .raw()
    .toBuffer({ resolveWithObject: true });
  pretrimDimensions ??= { width: info.width, height: info.height };
  const { alpha, background, threshold } = buildForegroundMask(
    pixels,
    info.width,
    info.height,
  );
  const bounds = alphaBounds(alpha, info.width, info.height);
  const tight = tightRgbaWithGuard(pixels, alpha, info.width, bounds);
  if (previewOutput) {
    await sharp(Buffer.from(alpha), {
      raw: { width: info.width, height: info.height, channels: 1 },
    })
      .png()
      .toFile(`${destinationPath}.mask.png`);
  }
  await sharp(tight.data, {
    raw: { width: tight.width, height: tight.height, channels: 4 },
  })
    .webp({ quality: 88, alphaQuality: 100, effort: 6 })
    .toFile(temporaryPath);
  await rename(temporaryPath, destinationPath);
  processedCount += 1;
  if (!previewOutput) {
    record.output.width = tight.width;
    record.output.height = tight.height;
    record.output.bytes = (await stat(outputPath)).size;
    record.output.alpha = "connected-authored-silhouette";
    record.output.background_luminance = Number(background.toFixed(2));
    record.output.foreground_threshold = Number(threshold.toFixed(2));
    record.output.pretrim = pretrimDimensions;
    record.output.trim = {
      method: "exact-alpha-bounds",
      content_width: bounds.width,
      content_height: bounds.height,
      transparent_guard_px: TRANSPARENT_GUARD_PX,
      opaque_pixels: bounds.opaquePixels,
      alpha_coverage: Number(
        (bounds.opaquePixels / (tight.width * tight.height)).toFixed(6),
      ),
    };
  }
}

if (requestedAsset && processedCount !== 1) {
  throw new Error(`No runtime art record found for ${requestedAsset}`);
}
if (!previewOutput) {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

console.log(
  `Built ${processedCount} requested asset(s) with tight transparent silhouettes; opaque world art was preserved.`,
);
