import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const ROOT = process.cwd();
const WIDTH = 1448;
const HEIGHT = 1086;
const PIXELS = WIDTH * HEIGHT;

const source = Object.freeze({
  master: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-nodes-r2/master/ninjaone-capital-master-r1.png",
  ),
  liveLandMask: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/authority/live-land-authority-mask-r1.png",
  ),
  registeredParentLandMask: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/authority/registered-parent-land-mask-r1.png",
  ),
  liveWaterMask: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/authority/live-inland-water-authority-mask-r1.png",
  ),
  topOverhang: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/overlays/top-overhang-extension-r1-alpha.png",
  ),
  d06DistrictMask: path.join(
    ROOT,
    "art-source/career-world/ninjaone-capital/city-r3/districts/D06-station-rail-mask.png",
  ),
  foliageManifest: path.join(
    ROOT,
    "public/career-world/capitals/ninjaone/environment/manifests/foliage-native-r4.json",
  ),
});

const outputRoot = path.join(
  ROOT,
  "public/career-world/capitals/ninjaone/city-r3",
);
const outputs = Object.freeze({
  landscape: path.join(outputRoot, "foundation/city-landscape-capital-r1-alpha.png"),
  overhang: path.join(outputRoot, "foundation/city-overhang-capital-r1-alpha.png"),
  composite: path.join(outputRoot, "foundation/city-foundation-composite-r1-alpha.png"),
  capitalContext: path.join(
    outputRoot,
    "foundation/city-context-capital-without-d06-r1-alpha.png",
  ),
  territory: path.join(outputRoot, "territory/city-foundation-territory-r1-alpha.png"),
  waterInteraction: path.join(
    outputRoot,
    "water-interaction/city-water-contact-r1-alpha.png",
  ),
  waterRegistrationMask: path.join(
    outputRoot,
    "authority/city-water-registration-mask-r1.png",
  ),
  nativeFoliageReuseManifest: path.join(
    outputRoot,
    "authority/city-native-foliage-reuse-r1.json",
  ),
  manifest: path.join(
    ROOT,
    "public/career-world/capitals/ninjaone/manifests/city-foundation-r3.json",
  ),
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function imageMetadata(file) {
  const bytes = await readFile(file);
  const metadata = await sharp(bytes).metadata();
  if (metadata.width !== WIDTH || metadata.height !== HEIGHT) {
    throw new TypeError(`${file} must be ${WIDTH}x${HEIGHT}.`);
  }
  return { bytes, metadata };
}

async function singleChannel(file) {
  const { bytes } = await imageMetadata(file);
  return sharp(bytes).greyscale().raw().toBuffer();
}

async function writePng(file, pipeline) {
  await mkdir(path.dirname(file), { recursive: true });
  return pipeline.png({ compressionLevel: 9, palette: false }).toFile(file);
}

async function artifact(file) {
  const bytes = await readFile(file);
  const metadata = await sharp(bytes).metadata();
  return Object.freeze({
    decodedBytes: metadata.width * metadata.height * (metadata.channels ?? 4),
    dimensions: Object.freeze([metadata.width, metadata.height]),
    encodedBytes: bytes.byteLength,
    path: `/${path.relative(path.join(ROOT, "public"), file).replaceAll("\\", "/")}`,
    sha256: sha256(bytes),
  });
}

function analyzeNativeFoliageReuse(context, foliageManifest) {
  const thresholds = Object.freeze({
    alphaFraction: 0.5,
    baseVegetationFraction: 0.3,
    vegetationFraction: 0.3,
  });
  const admitted = [];
  for (const instance of foliageManifest.instances) {
    const [originX, originY] = instance.artboardBounds.origin;
    const [spanX, spanY] = instance.artboardBounds.span;
    let alphaPixels = 0;
    let baseAlphaPixels = 0;
    let baseVegetationPixels = 0;
    let sampledPixels = 0;
    let vegetationPixels = 0;
    for (
      let y = Math.max(0, Math.floor(originY));
      y < Math.min(HEIGHT, Math.ceil(originY + spanY));
      y += 1
    ) {
      for (
        let x = Math.max(0, Math.floor(originX));
        x < Math.min(WIDTH, Math.ceil(originX + spanX));
        x += 1
      ) {
        const offset = (y * WIDTH + x) * 4;
        const red = context[offset];
        const green = context[offset + 1];
        const blue = context[offset + 2];
        const alpha = context[offset + 3];
        sampledPixels += 1;
        if (alpha <= 16) continue;
        alphaPixels += 1;
        const vegetation = green > red * 1.08
          && green > blue * 1.03
          && green < 115;
        if (vegetation) vegetationPixels += 1;
        if (y > originY + spanY * 0.72) {
          baseAlphaPixels += 1;
          if (vegetation) baseVegetationPixels += 1;
        }
      }
    }
    const evidence = {
      alphaFraction: alphaPixels / Math.max(sampledPixels, 1),
      baseVegetationFraction: baseVegetationPixels / Math.max(baseAlphaPixels, 1),
      vegetationFraction: vegetationPixels / Math.max(alphaPixels, 1),
    };
    if (
      evidence.alphaFraction < thresholds.alphaFraction
      || evidence.baseVegetationFraction < thresholds.baseVegetationFraction
      || evidence.vegetationFraction < thresholds.vegetationFraction
    ) continue;
    admitted.push({
      atlasResourceId: instance.atlasResourceId,
      evidence,
      id: instance.id,
    });
  }
  return Object.freeze({ admitted, thresholds });
}

async function cleanConnectedWaterMask(sourceMask) {
  const seen = new Uint8Array(PIXELS);
  const queue = new Int32Array(PIXELS);
  const components = [];
  for (let start = 0; start < PIXELS; start += 1) {
    if (seen[start] || sourceMask[start] <= 127) continue;
    let head = 0;
    let tail = 0;
    queue[tail] = start;
    tail += 1;
    seen[start] = 1;
    const pixels = [];
    while (head < tail) {
      const current = queue[head];
      head += 1;
      pixels.push(current);
      const x = current % WIDTH;
      const y = Math.floor(current / WIDTH);
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue;
          const nextX = x + offsetX;
          const nextY = y + offsetY;
          if (nextX < 0 || nextY < 0 || nextX >= WIDTH || nextY >= HEIGHT) continue;
          const next = nextY * WIDTH + nextX;
          if (!seen[next] && sourceMask[next] > 127) {
            seen[next] = 1;
            queue[tail] = next;
            tail += 1;
          }
        }
      }
    }
    components.push(pixels);
  }
  const significant = components
    .filter((pixels) => pixels.length >= 5_000)
    .map((pixels) => {
      const bounds = pixels.reduce((current, pixel) => {
        const x = pixel % WIDTH;
        const y = Math.floor(pixel / WIDTH);
        return [
          Math.min(current[0], x),
          Math.min(current[1], y),
          Math.max(current[2], x),
          Math.max(current[3], y),
        ];
      }, [WIDTH, HEIGHT, 0, 0]);
      return Object.freeze({ bounds: Object.freeze(bounds), pixels });
    })
    .sort((left, right) => right.pixels.length - left.pixels.length);
  const acceptedBounds = new Set([
    "533,464,968,828",
    "792,858,1036,1077",
  ]);
  const retained = significant.filter(({ bounds }) => acceptedBounds.has(bounds.join(",")));
  const rejected = significant.filter(({ bounds }) => !acceptedBounds.has(bounds.join(",")));
  if (
    retained.length !== 2
    || rejected.length !== 1
    || rejected[0].bounds.join(",") !== "417,650,566,873"
  ) {
    throw new TypeError("Registered water component signatures changed; review the authority mask before rebuilding.");
  }
  const binary = Buffer.alloc(PIXELS);
  for (const { pixels } of retained) {
    for (const pixel of pixels) binary[pixel] = 255;
  }
  const mask = await sharp(binary, {
    raw: { width: WIDTH, height: HEIGHT, channels: 1 },
  }).blur(0.8).toColourspace("b-w").raw().toBuffer();
  return Object.freeze({
    componentCount: components.length,
    mask,
    rejectedComponents: Object.freeze(rejected.map(({ bounds, pixels }) => Object.freeze({
      bounds,
      pixels: pixels.length,
      reason: "false-positive-city-shadow-pocket",
    }))),
    retainedComponentPixels: Object.freeze(retained.map(({ pixels }) => pixels.length)),
  });
}

const [master, liveLand, registeredParentLand, rawLiveWater, topOverhang, d06DistrictMask] =
  await Promise.all([
    imageMetadata(source.master),
    singleChannel(source.liveLandMask),
    singleChannel(source.registeredParentLandMask),
    singleChannel(source.liveWaterMask),
    imageMetadata(source.topOverhang),
    singleChannel(source.d06DistrictMask),
  ]);
const cleanedWater = await cleanConnectedWaterMask(rawLiveWater);
const liveWater = cleanedWater.mask;
await writePng(outputs.waterRegistrationMask, sharp(liveWater, {
  raw: { width: WIDTH, height: HEIGHT, channels: 1 },
}).toColourspace("b-w"));

const registeredCityMaskRaw = Buffer.alloc(PIXELS);
for (let index = 0; index < PIXELS; index += 1) {
  registeredCityMaskRaw[index] = Math.round(
    liveLand[index] * registeredParentLand[index] / 255,
  );
}
const softenedRegisteredCityMask = await sharp(registeredCityMaskRaw, {
  raw: { width: WIDTH, height: HEIGHT, channels: 1 },
}).blur(0.6).toColourspace("b-w").raw().toBuffer();
const registeredCityMask = Buffer.alloc(PIXELS);
for (let index = 0; index < PIXELS; index += 1) {
  const waterExclusion = Math.min(255, Math.round(liveWater[index] * 2.5));
  registeredCityMask[index] = Math.round(
    softenedRegisteredCityMask[index] * (255 - waterExclusion) / 255,
  );
}

const masterRgb = await sharp(master.bytes).removeAlpha().raw().toBuffer();
const landscapeRgba = Buffer.alloc(PIXELS * 4);
for (let index = 0; index < PIXELS; index += 1) {
  const rgb = index * 3;
  const rgba = index * 4;
  landscapeRgba[rgba] = masterRgb[rgb];
  landscapeRgba[rgba + 1] = masterRgb[rgb + 1];
  landscapeRgba[rgba + 2] = masterRgb[rgb + 2];
  landscapeRgba[rgba + 3] = registeredCityMask[index];
}

await writePng(outputs.landscape, sharp(landscapeRgba, {
  raw: { width: WIDTH, height: HEIGHT, channels: 4 },
}));
await writePng(outputs.overhang, sharp(topOverhang.bytes).ensureAlpha());

const landscapeBytes = await readFile(outputs.landscape);
const overhangBytes = await readFile(outputs.overhang);
await writePng(outputs.composite, sharp({
  create: {
    width: WIDTH,
    height: HEIGHT,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
}).composite([
  { input: landscapeBytes, blend: "over" },
  { input: overhangBytes, blend: "over" },
]));
await writePng(
  outputs.territory,
  sharp(await readFile(outputs.composite)).resize(512, 384, {
    fit: "fill",
    kernel: sharp.kernel.lanczos3,
  }),
);

const [wideCityBlur, narrowCityBlur] = await Promise.all([
  sharp(registeredCityMask, {
    raw: { width: WIDTH, height: HEIGHT, channels: 1 },
  }).blur(7).toColourspace("b-w").raw().toBuffer(),
  sharp(registeredCityMask, {
    raw: { width: WIDTH, height: HEIGHT, channels: 1 },
  }).blur(2.2).toColourspace("b-w").raw().toBuffer(),
]);
const waterInteractionRgba = Buffer.alloc(PIXELS * 4);
for (let index = 0; index < PIXELS; index += 1) {
  const water = liveWater[index] / 255;
  const wide = Math.max(0, wideCityBlur[index] - registeredCityMask[index]) / 255 * water;
  const narrow = Math.max(0, narrowCityBlur[index] - registeredCityMask[index]) / 255 * water;
  const alpha = Math.min(72, Math.round(wide * 40 + narrow * 46));
  const lightMix = wide + narrow > 0 ? narrow / (wide + narrow) : 0;
  const rgba = index * 4;
  waterInteractionRgba[rgba] = Math.round(4 + lightMix * 44);
  waterInteractionRgba[rgba + 1] = Math.round(13 + lightMix * 92);
  waterInteractionRgba[rgba + 2] = Math.round(17 + lightMix * 104);
  waterInteractionRgba[rgba + 3] = alpha;
}
await writePng(outputs.waterInteraction, sharp(waterInteractionRgba, {
  raw: { width: WIDTH, height: HEIGHT, channels: 4 },
}));

const foundation = await sharp(await readFile(outputs.composite))
  .ensureAlpha()
  .raw()
  .toBuffer();
const softenedD06DistrictMask = await sharp(d06DistrictMask, {
  raw: { width: WIDTH, height: HEIGHT, channels: 1 },
}).blur(1.4).toColourspace("b-w").raw().toBuffer();
const capitalContext = Buffer.from(foundation);
for (let index = 0; index < PIXELS; index += 1) {
  const alphaOffset = index * 4 + 3;
  capitalContext[alphaOffset] = Math.round(
    capitalContext[alphaOffset] * (255 - softenedD06DistrictMask[index]) / 255,
  );
}
await writePng(outputs.capitalContext, sharp(capitalContext, {
  raw: { width: WIDTH, height: HEIGHT, channels: 4 },
}));
const foliageManifest = JSON.parse(await readFile(source.foliageManifest, "utf8"));
const nativeFoliageReuse = analyzeNativeFoliageReuse(capitalContext, foliageManifest);
await mkdir(path.dirname(outputs.nativeFoliageReuseManifest), { recursive: true });
await writeFile(outputs.nativeFoliageReuseManifest, `${JSON.stringify({
  schemaVersion: 1,
  id: "career-world/capitals/ninjaone/city-native-foliage-reuse@r1",
  sourceContext: "/career-world/capitals/ninjaone/city-r3/foundation/city-context-capital-without-d06-r1-alpha.png",
  sourceFoliageManifestId: foliageManifest.id,
  admission: {
    method: "registered-L2-socket-intersection-with-existing-city-vegetation-and-contact",
    thresholds: nativeFoliageReuse.thresholds,
  },
  instances: nativeFoliageReuse.admitted,
}, null, 2)}\n`, "utf8");
let waterPixels = 0;
let coveredWaterPixels = 0;
let transparentPixels = 0;
for (let index = 0; index < PIXELS; index += 1) {
  const alpha = foundation[index * 4 + 3];
  if (alpha === 0) transparentPixels += 1;
  if (liveWater[index] > 127) {
    waterPixels += 1;
    if (alpha > 16) coveredWaterPixels += 1;
  }
}
const waterCoverage = coveredWaterPixels / waterPixels;
if (waterCoverage >= 0.18) {
  throw new TypeError(`City foundation covers ${(waterCoverage * 100).toFixed(2)}% of inland water.`);
}

const sourceHashes = Object.fromEntries(await Promise.all(
  Object.entries(source).map(async ([id, file]) => [id, sha256(await readFile(file))]),
));
const manifest = {
  schemaVersion: 1,
  id: "career-world/capitals/ninjaone/city-foundation@r3",
  status: "active-registered-foundation",
  authority: {
    artboard: [WIDTH, HEIGHT],
    sourceMasterSha256: sourceHashes.master,
    registration: {
      uniformScale: 0.98,
      translation: [20, 60],
      method: "registered-parent-land-intersection-plus-independent-top-overhang",
    },
    ownership: {
      globalWater: "L1-and-L3-immutable",
      globalLand: "L2-immutable",
      cityWaterInteraction: "L4_0-reversible",
      cityLandscapeModification: "L4_1-reversible",
    },
    waterRegistration: {
      sourceComponentCount: cleanedWater.componentCount,
      rejectedComponents: cleanedWater.rejectedComponents,
      retainedComponentPixels: cleanedWater.retainedComponentPixels,
      mask: await artifact(outputs.waterRegistrationMask),
    },
  },
  lod: {
    world: "interface-marker-only",
    territory: "preload-cache-only-not-runtime-visible",
    capital: "registered-1448x1086-foundation-layers",
    site: "capital-foundation-plus-registered-district-cohort",
    close: "site-cohort-plus-registered-detail-and-actor-layers",
  },
  layers: [
    { id: "L4_0", role: "city-water-interaction", asset: await artifact(outputs.waterInteraction) },
    { id: "L4", role: "capital-composite-context-with-D06-exclusion", asset: await artifact(outputs.capitalContext) },
  ],
  deliveries: {
    composite: await artifact(outputs.composite),
    territory: await artifact(outputs.territory),
  },
  verification: {
    transparentPixels,
    transparentFraction: transparentPixels / PIXELS,
    inlandWaterPixels: waterPixels,
    coveredInlandWaterPixels: coveredWaterPixels,
    inlandWaterCoverageFraction: waterCoverage,
    maximumInlandWaterCoverageFraction: 0.18,
  },
  sourceHashes,
};
await mkdir(path.dirname(outputs.manifest), { recursive: true });
await writeFile(outputs.manifest, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  manifest: path.relative(ROOT, outputs.manifest).replaceAll("\\", "/"),
  transparentFraction: manifest.verification.transparentFraction,
  inlandWaterCoverageFraction: waterCoverage,
  outputs: Object.fromEntries(Object.entries(outputs).map(([id, file]) => [
    id,
    path.relative(ROOT, file).replaceAll("\\", "/"),
  ])),
}, null, 2));
