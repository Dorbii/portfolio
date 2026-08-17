import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import sharp from "sharp";

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE_ROOT = path.join(
  REPOSITORY_ROOT,
  "art-source/career-world/ninjaone-capital/city-nodes-r2",
);
const OUTPUT_ROOT = path.join(
  REPOSITORY_ROOT,
  "public/career-world/capitals/ninjaone/city-nodes-r2",
);
const MANIFEST_PATH = path.join(
  REPOSITORY_ROOT,
  "public/career-world/capitals/ninjaone/manifests/city-layer-assets-r2.json",
);

const FAMILY_CONTRACTS = Object.freeze([
  Object.freeze({
    id: "skill-buildings",
    sourceDirectory: "skills",
    variants: Object.freeze({ capital: 384, close: 896, site: 768 }),
  }),
  Object.freeze({
    id: "infrastructure",
    sourceDirectory: "infrastructure",
    variants: Object.freeze({ capital: 384, close: 896, site: 768 }),
  }),
  Object.freeze({
    id: "secondary-fabric",
    sourceDirectory: "details",
    variants: Object.freeze({ capital: 384, close: 896, site: 768 }),
  }),
  Object.freeze({
    id: "urban-foliage",
    sourceDirectory: "foliage",
    variants: Object.freeze({ capital: 192, close: 512, site: 384 }),
  }),
  Object.freeze({
    id: "street-props",
    sourceDirectory: "props",
    variants: Object.freeze({ close: 384, site: 256 }),
  }),
]);

const ASSET_VARIANT_TIER_OVERRIDES = Object.freeze({
  I12: Object.freeze(["close"]),
  I13: Object.freeze(["capital"]),
  I16: Object.freeze(["site", "close"]),
  I17: Object.freeze(["close"]),
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function assetId(filename) {
  const match = /^([A-Z]\d{2})-/.exec(filename);
  if (!match) {
    throw new TypeError(`City node source has no stable asset ID: ${filename}`);
  }
  return match[1];
}

function publicPath(absolutePath) {
  return `/${path.relative(path.join(REPOSITORY_ROOT, "public"), absolutePath)
    .replaceAll(path.sep, "/")}`;
}

async function renderVariant(sourcePath, outputPath, maximumEdge, cleanResiduals) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const pipeline = sharp(sourcePath)
    .trim({ background: { alpha: 0, b: 0, g: 0, r: 0 } });
  if (maximumEdge !== null) {
    pipeline.resize({
      fit: "inside",
      height: maximumEdge,
      kernel: sharp.kernel.lanczos3,
      width: maximumEdge,
      withoutEnlargement: true,
    });
  }
  await pipeline
    .png({ adaptiveFiltering: true, compressionLevel: 9, palette: false })
    .toFile(outputPath);

  if (cleanResiduals) {
    const rendered = await sharp(outputPath).ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    });
    let cleaned = false;
    for (let offset = 0; offset < rendered.data.length; offset += 4) {
      if (rendered.data[offset + 3] <= 2) {
        rendered.data[offset + 3] = 0;
        cleaned = true;
        continue;
      }
      if (
        rendered.data[offset + 3] > 0
        && rendered.data[offset + 1] > rendered.data[offset] * 1.4
        && rendered.data[offset + 1] > rendered.data[offset + 2] * 1.4
        && rendered.data[offset + 1] > 90
      ) {
        rendered.data[offset + 1] = Math.max(
          rendered.data[offset],
          rendered.data[offset + 2],
        );
        cleaned = true;
      }
    }
    if (cleaned) {
      await sharp(rendered.data, { raw: rendered.info })
        .png({ adaptiveFiltering: true, compressionLevel: 9, palette: false })
        .toFile(outputPath);
    }
  }

  const bytes = await fs.readFile(outputPath);
  const metadata = await sharp(bytes).metadata();
  if (
    metadata.format !== "png"
    || !metadata.hasAlpha
    || metadata.channels !== 4
    || !metadata.width
    || !metadata.height
  ) {
    throw new TypeError(`City node derivative is not a registered RGBA PNG: ${outputPath}`);
  }
  return Object.freeze({
    decodedBytes: metadata.width * metadata.height * metadata.channels,
    dimensions: Object.freeze([metadata.width, metadata.height]),
    encodedBytes: bytes.length,
    path: publicPath(outputPath),
    sha256: sha256(bytes),
  });
}

async function buildAsset(family, filename) {
  const id = assetId(filename);
  const sourcePath = path.join(SOURCE_ROOT, family.sourceDirectory, filename);
  const sourceBytes = await fs.readFile(sourcePath);
  const sourceMetadata = await sharp(sourceBytes).metadata();
  if (
    sourceMetadata.format !== "png"
    || !sourceMetadata.hasAlpha
    || sourceMetadata.channels !== 4
    || !sourceMetadata.width
    || !sourceMetadata.height
  ) {
    throw new TypeError(`City node master is not an RGBA PNG: ${sourcePath}`);
  }

  const variants = {};
  const allowedTiers = ASSET_VARIANT_TIER_OVERRIDES[id];
  for (const [tier, maximumEdge] of Object.entries(family.variants)) {
    const outputPath = path.join(OUTPUT_ROOT, tier, family.sourceDirectory, filename);
    if (allowedTiers && !allowedTiers.includes(tier)) {
      await fs.rm(outputPath, { force: true });
      continue;
    }
    variants[tier] = await renderVariant(
      sourcePath,
      outputPath,
      (id === "I16" || id === "I17") && tier === "close" ? null : maximumEdge,
      id === "I16" || id === "I17",
    );
  }

  return Object.freeze({
    family: family.id,
    id,
    source: Object.freeze({
      dimensions: Object.freeze([sourceMetadata.width, sourceMetadata.height]),
      path: path.relative(REPOSITORY_ROOT, sourcePath).replaceAll(path.sep, "/"),
      sha256: sha256(sourceBytes),
    }),
    variants: Object.freeze(variants),
  });
}

async function main() {
  const assets = [];
  const families = [];
  for (const family of FAMILY_CONTRACTS) {
    const filenames = (await fs.readdir(path.join(SOURCE_ROOT, family.sourceDirectory)))
      .filter((filename) => filename.toLowerCase().endsWith("-alpha.png"))
      .sort((left, right) => assetId(left).localeCompare(assetId(right)));
    if (filenames.length === 0) {
      throw new Error(`City node family is empty: ${family.id}`);
    }
    const familyAssets = [];
    for (const filename of filenames) {
      familyAssets.push(await buildAsset(family, filename));
    }
    assets.push(...familyAssets);
    families.push(Object.freeze({
      assetIds: Object.freeze(familyAssets.map(({ id }) => id)),
      id: family.id,
      sourceDirectory: family.sourceDirectory,
      tiers: Object.freeze(Object.keys(family.variants)),
    }));
  }

  if (new Set(assets.map(({ id }) => id)).size !== assets.length) {
    throw new TypeError("City node asset IDs must be globally unique.");
  }

  const manifest = Object.freeze({
    schemaVersion: 2,
    id: "career-world/capitals/ninjaone/city-layer-assets@r2",
    status: "runtime",
    sourceAuthority: Object.freeze({
      handoffArchiveSha256: "bb5f06b671c8076ef72a479d98620bdd3680c1b5884f41ded946681d6fa9f6dc",
      selectedMasterPackagePath: "selected-wide/11-final-with-top-overhang-art.png",
      standalonePackageSources: Object.freeze({
        details: "city-detail-assets/alpha/D01-D08",
        foliage: "city-detail-assets/alpha/foliage",
        infrastructure: "infrastructure-assets/alpha",
        props: "city-detail-assets/alpha/microprops",
        skills: "skill-assets/skill-building-alpha",
      }),
      promotedConceptDerivatives: Object.freeze([
        Object.freeze({
          assetId: "I12",
          role: "close-straight-station-terrace-base",
          sourceAuthority: "Steve-approved-close-detail-station-concept",
        }),
        Object.freeze({
          assetId: "I13",
          role: "capital-tier-complete-station-cluster",
          sourceAuthority: "Steve-approved-capital-D06-crop",
        }),
        Object.freeze({
          assetId: "I16",
          role: "site-close-registered-station-base-silhouette",
          sourceAuthority: "Steve-approved-D06-site-composite",
        }),
        Object.freeze({
          assetId: "I17",
          role: "close-only-station-civic-integration-overlay",
          sourceAuthority: "master-and-approved-close-concept-derived-generated-overlay",
        }),
      ]),
      prohibitedRuntimeCohorts: Object.freeze([
        "district-plates",
        "full-canvas-city-fabric",
        "population-composites",
        "top-overhang-caps",
      ]),
    }),
    delivery: Object.freeze({
      admissionPolicy: "deterministic-global-node-cohort-with-unique-source-accounting",
      alphaBoundsPolicy: "trim-before-tier-resize",
      atlasRuntimeVisible: false,
      closeUsesAcceptedMasterBytes: false,
      cullingUnit: "individual-node",
      maximumDecodedCohortBytes: Object.freeze({
        capital: 24 * 1024 * 1024,
        close: 64 * 1024 * 1024,
        site: 64 * 1024 * 1024,
      }),
      variantPolicy:
        "capital-384-site-768-close-896-with-I13-capital-I16-site-downsample-native-close-base-I17-native-close-overlay-I12-close-quarantined",
    }),
    families: Object.freeze(families),
    assets: Object.freeze(assets),
  });
  await fs.mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  process.stdout.write(
    `Built ${assets.length} NinjaOne Capital node assets across ${families.length} families.\n`,
  );
}

await main();
