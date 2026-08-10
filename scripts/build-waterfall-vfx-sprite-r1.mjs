import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourcePath = path.join(
  repositoryRoot,
  "art-source/career-world/water-surface/waterfall-reference-template-r1.png",
);
const outputPath = path.join(
  repositoryRoot,
  "public/career-world/layers/water-surface/fields/"
    + "waterfall-vfx-sprite-r1-384x512.png",
);
const extraction = Object.freeze({ height: 442, left: 275, top: 62, width: 220 });

const clamp = (value, minimum = 0, maximum = 1) => (
  Math.min(maximum, Math.max(minimum, value))
);
const mix = (start, end, progress) => start + (end - start) * progress;
const smoothstep = (edge0, edge1, value) => {
  const progress = clamp((value - edge0) / Math.max(edge1 - edge0, 1e-6));
  return progress * progress * (3 - 2 * progress);
};
const inverseSmoothstep = (edge0, edge1, value) => (
  1 - smoothstep(edge0, edge1, value)
);

const { data, info } = await sharp(sourcePath)
  .extract(extraction)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const isolated = Buffer.alloc(data.length);

for (let y = 0; y < info.height; y += 1) {
  const v = (y + 0.5) / info.height;
  for (let x = 0; x < info.width; x += 1) {
    const u = (x + 0.5) / info.width;
    const offset = (y * info.width + x) * 4;
    const red = data[offset] / 255;
    const green = data[offset + 1] / 255;
    const blue = data[offset + 2] / 255;
    const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const coolness = blue - red * 0.58 - green * 0.42;
    const blueWater = smoothstep(-0.012, 0.065, coolness)
      * smoothstep(0.018, 0.16, luma);
    const neutralFoam = smoothstep(0.34, 0.72, luma)
      * smoothstep(-0.035, 0.045, blue - red);
    const waterMaterial = Math.max(blueWater, neutralFoam);

    const sheetProgress = clamp((v - 0.015) / 0.54);
    const sheetCenter = 0.67
      + Math.sin(sheetProgress * 4.2 + 0.4) * 0.018;
    const sheetHalfWidth = 0.43 - sheetProgress * 0.09;
    const sheet = smoothstep(0.002, 0.025, v)
      * inverseSmoothstep(0.52, 0.58, v)
      * inverseSmoothstep(
        sheetHalfWidth * 0.82,
        sheetHalfWidth,
        Math.abs(u - sheetCenter),
      );
    const impactDistance = Math.hypot(
      (u - 0.7) / 0.49,
      (v - 0.58) / 0.18,
    );
    const impact = inverseSmoothstep(0.52, 1, impactDistance);
    const wakeDistance = Math.hypot(
      (u - 0.73) / 0.4,
      (v - 0.79) / 0.27,
    );
    const wake = inverseSmoothstep(0.34, 1, wakeDistance) * 0.78;
    const leftBankReject = smoothstep(
      mix(0.18, 0.56, smoothstep(0.42, 1, v)),
      mix(0.24, 0.63, smoothstep(0.42, 1, v)),
      u,
    );
    const rightEdge = 0.9
      + Math.sin(v * 19 + 0.7) * 0.022
      + Math.sin(v * 43) * 0.009;
    const rightBankReject = inverseSmoothstep(rightEdge - 0.12, rightEdge, u);
    const stageMask = Math.max(sheet, Math.max(impact, wake))
      * leftBankReject
      * rightBankReject;
    const stageBase = sheet * 0.36 + impact * 0.1;
    const alpha = stageMask * clamp(stageBase + waterMaterial * 0.92);

    isolated[offset] = data[offset];
    isolated[offset + 1] = data[offset + 1];
    isolated[offset + 2] = data[offset + 2];
    isolated[offset + 3] = Math.round(alpha * 255);
  }
}

await sharp(isolated, {
  raw: { channels: 4, height: info.height, width: info.width },
})
  .resize({
    background: { alpha: 0, b: 0, g: 0, r: 0 },
    fit: "contain",
    height: 512,
    kernel: sharp.kernel.lanczos3,
    width: 384,
  })
  .png({ compressionLevel: 9 })
  .toFile(outputPath);

const output = await readFile(outputPath);
console.log(JSON.stringify({
  dimensions: [384, 512],
  extraction,
  output: path.relative(repositoryRoot, outputPath).replaceAll("\\", "/"),
  sha256: createHash("sha256").update(output).digest("hex").toUpperCase(),
  source: path.relative(repositoryRoot, sourcePath).replaceAll("\\", "/"),
}, null, 2));
