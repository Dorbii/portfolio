import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

sharp.cache(false);
sharp.concurrency(1);

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const baseManifestPath = join(
  repositoryRoot,
  "public",
  "career-world",
  "art",
  "runtime-art-manifest.json",
);
const paletteManifestPath = join(
  repositoryRoot,
  "public",
  "career-world",
  "art",
  "runtime-palette-manifest.json",
);
const registryPath = join(
  repositoryRoot,
  "features",
  "career-world",
  "model",
  "world-registry.ts",
);
const paletteRoot = join(
  repositoryRoot,
  "public",
  "career-world",
  "art",
  "palette",
);

const LUMA_WEIGHTS = Object.freeze([0.2126, 0.7152, 0.0722]);
const CHROMA_STRENGTH = 0.65;
const SHADOW_GATE = Object.freeze([12, 72]);
const EMPLOYER_KEYS = Object.freeze([
  "ninjaone",
  "tanium",
  "independent",
  "ace-hardware",
  "column-technologies",
]);
const PALETTES = Object.freeze({
  ninjaone: Object.freeze({ accent: "#79c7d5", rgb: Object.freeze([121, 199, 213]) }),
  tanium: Object.freeze({ accent: "#d57a47", rgb: Object.freeze([213, 122, 71]) }),
  independent: Object.freeze({ accent: "#a77bc3", rgb: Object.freeze([167, 123, 195]) }),
  "ace-hardware": Object.freeze({ accent: "#d65b55", rgb: Object.freeze([214, 91, 85]) }),
  "column-technologies": Object.freeze({ accent: "#7da8c4", rgb: Object.freeze([125, 168, 196]) }),
});

const CAPITALS = Object.freeze([
  ["ninjaone", "city/ninjaone@v1"],
  ["tanium", "city/tanium@v1"],
  ["independent", "city/independent@v1"],
  ["ace-hardware", "city/ace-hardware@v1"],
  ["column-technologies", "city/column-technologies@v1"],
]);

const PROJECTS = Object.freeze([
  ["ninjaone", "kaizen-agent-platform", "project/kaizen-agent-platform@v1"],
  ["ninjaone", "vendy-vm-platform", "project/vendy-vm-platform@v1"],
  ["ninjaone", "engineering-metrics-pipeline", "project/kaizen-metrics@v1"],
  ["tanium", "tanium-risk-assessment", "project/tanium-risk-assessment@v1"],
  ["tanium", "uat-automation", "project/uat-automation@v1"],
  ["tanium", "cablecar", "project/cablecar@v1"],
  ["tanium", "xsearch", "project/xsearch@v1"],
  ["tanium", "tmatch-eolmatch", "project/tmatch-eolmatch@v1"],
  ["independent", "contextforge", "project/contextforge@v1"],
  ["independent", "career-world-portfolio", "project/career-world-portfolio@v1"],
  ["ace-hardware", "ticket-validation-automation", "project/ticket-validation-automation@v1"],
  ["ace-hardware", "sap-table-update-integration", "project/sap-table-update-integration@v1"],
  ["ace-hardware", "qc-alm-extractor", "project/qc-alm-extractor@v1"],
  ["column-technologies", "atlassian-platform-automation", "project/atlassian-platform-automation@v1"],
  ["column-technologies", "atlassian-data-center-resilience", "project/atlassian-data-center-resilience@v1"],
  ["column-technologies", "client-devops-delivery-implementations", "project/client-devops-delivery-implementations@v1"],
]);

const EMPLOYER_SKILLS = Object.freeze({
  ninjaone: Object.freeze([
    "safe-writes",
    "data-contracts",
    "go",
    "redis",
    "mcp",
    "openapi",
    "workflow-orchestration",
    "operator-control",
    "react",
    "aws",
    "postgresql",
    "vmware",
    "macstadium",
    "python",
    "databricks",
    "docker",
    "ai",
  ]),
  tanium: Object.freeze([
    "python",
    "go",
    "workflow-orchestration",
    "operator-control",
    "data-contracts",
    "csharp",
    "localdb",
    "react",
    "electron",
    "manifest-v3",
  ]),
  independent: Object.freeze([
    "context-compression",
    "workflow-orchestration",
    "data-contracts",
    "typescript",
    "react",
    "operator-control",
  ]),
  "ace-hardware": Object.freeze(["informatica"]),
  "column-technologies": Object.freeze(["atlassian", "ci-cd", "docker"]),
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assetParts(assetId) {
  const match = /^(city|project|skill)\/(.+)@v1$/.exec(assetId);
  if (!match) throw new Error(`Unsupported palette asset ${assetId}`);
  return { category: match[1], slug: match[2] };
}

function smoothstep(value) {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function luminance(red, green, blue) {
  return (
    red * LUMA_WEIGHTS[0] +
    green * LUMA_WEIGHTS[1] +
    blue * LUMA_WEIGHTS[2]
  );
}

function neutralizeRgba(source) {
  const neutral = Buffer.alloc(source.length);
  for (let index = 0; index < source.length; index += 4) {
    const value = Math.round(
      luminance(source[index], source[index + 1], source[index + 2]),
    );
    neutral[index] = value;
    neutral[index + 1] = value;
    neutral[index + 2] = value;
    neutral[index + 3] = source[index + 3];
  }
  return neutral;
}

function applyPalette(neutral, accentRgb) {
  const output = Buffer.from(neutral);
  const accentLuma = luminance(...accentRgb);
  const chroma = accentRgb.map((channel) => channel - accentLuma);
  let introducedClipPixels = 0;

  for (let index = 0; index < output.length; index += 4) {
    if (output[index + 3] === 0) continue;

    const value = neutral[index];
    const gate = smoothstep(
      (value - SHADOW_GATE[0]) / (SHADOW_GATE[1] - SHADOW_GATE[0]),
    );
    let strength = CHROMA_STRENGTH * gate;

    for (let channel = 0; channel < 3; channel += 1) {
      const delta = chroma[channel];
      if (delta > 0 && value < 255) {
        strength = Math.min(strength, (254 - value) / delta);
      } else if (delta < 0 && value > 0) {
        strength = Math.min(strength, (value - 1) / -delta);
      }
    }
    strength = Math.max(0, strength);

    let clipped = false;
    for (let channel = 0; channel < 3; channel += 1) {
      const transformed = Math.round(value + chroma[channel] * strength);
      output[index + channel] = transformed;
      if (
        value > 0 &&
        value < 255 &&
        (transformed === 0 || transformed === 255)
      ) {
        clipped = true;
      }
    }
    if (clipped) introducedClipPixels += 1;
  }

  return { data: output, introducedClipPixels };
}

function compareOutput(source, neutral, output, width, height) {
  if (source.length !== output.length || neutral.length !== output.length) {
    throw new Error("Palette output buffer length drift");
  }

  let alphaMismatchPixels = 0;
  let introducedClipPixels = 0;
  let lumaAbsoluteError = 0;
  let comparedPixels = 0;

  for (let index = 0; index < source.length; index += 4) {
    if (source[index + 3] !== output[index + 3]) {
      alphaMismatchPixels += 1;
    }
    if (source[index + 3] === 0) continue;

    const sourceLuma = luminance(
      source[index],
      source[index + 1],
      source[index + 2],
    );
    const outputLuma = luminance(
      output[index],
      output[index + 1],
      output[index + 2],
    );
    lumaAbsoluteError += Math.abs(sourceLuma - outputLuma);
    comparedPixels += 1;

    let clipped = false;
    for (let channel = 0; channel < 3; channel += 1) {
      if (
        neutral[index + channel] > 0 &&
        neutral[index + channel] < 255 &&
        (output[index + channel] === 0 || output[index + channel] === 255)
      ) {
        clipped = true;
      }
    }
    if (clipped) introducedClipPixels += 1;
  }

  return {
    width,
    height,
    alpha_mismatch_pixels: alphaMismatchPixels,
    luma_mae: Number((lumaAbsoluteError / comparedPixels).toFixed(6)),
    introduced_clip_pixels: introducedClipPixels,
    compared_opaque_pixels: comparedPixels,
  };
}

function registryInstances() {
  const capitals = CAPITALS.map(([employerId, assetId]) => ({
    instance_id: `instance/${employerId}/capital/01`,
    employer_id: employerId,
    kind: "capital",
    asset_id: assetId,
  }));
  const projects = PROJECTS.map(([employerId, projectId, assetId]) => ({
    instance_id: `instance/${employerId}/project/${projectId}/01`,
    employer_id: employerId,
    kind: "project",
    asset_id: assetId,
  }));
  const skills = EMPLOYER_KEYS.flatMap((employerId) =>
    EMPLOYER_SKILLS[employerId].map((skillId) => ({
      instance_id: `instance/${employerId}/skill/${skillId}/01`,
      employer_id: employerId,
      kind: "skill",
      asset_id: `skill/${skillId}@v1`,
    })),
  );

  if (capitals.length !== 5 || projects.length !== 16 || skills.length !== 37) {
    throw new Error(
      `Registry palette mapping drift: ${capitals.length} capitals, ${projects.length} projects, ${skills.length} skills`,
    );
  }
  return [...capitals, ...projects, ...skills];
}

const baseManifest = JSON.parse(await readFile(baseManifestPath, "utf8"));
const registrySource = await readFile(registryPath);
const baseByAssetId = new Map(
  baseManifest.records.map((record) => [record.asset_id, record]),
);
const instances = registryInstances();
if (instances.length !== 58) {
  throw new Error(`Expected 58 palette instances, received ${instances.length}`);
}

const instanceIds = new Set();
const runtimePaths = new Set();
const records = [];
let totalBytes = 0;

for (const instance of instances) {
  if (instanceIds.has(instance.instance_id)) {
    throw new Error(`Duplicate palette instance ${instance.instance_id}`);
  }
  instanceIds.add(instance.instance_id);

  const palette = PALETTES[instance.employer_id];
  if (!palette) throw new Error(`Unknown employer palette ${instance.employer_id}`);
  const baseRecord = baseByAssetId.get(instance.asset_id);
  if (!baseRecord) throw new Error(`Missing base art ${instance.asset_id}`);
  const { category, slug } = assetParts(instance.asset_id);
  const expectedCategory = instance.kind === "capital" ? "city" : instance.kind;
  if (category !== expectedCategory) {
    throw new Error(`Category drift for ${instance.instance_id}: ${category}`);
  }

  const sourcePath = join(
    repositoryRoot,
    baseRecord.runtime_path.replace(/^\//, ""),
  );
  const runtimePath = `/career-world/art/palette/${instance.employer_id}/${category}/${slug}.webp`;
  if (runtimePaths.has(runtimePath)) {
    throw new Error(`Duplicate palette runtime path ${runtimePath}`);
  }
  runtimePaths.add(runtimePath);

  const outputPath = join(
    paletteRoot,
    instance.employer_id,
    category,
    `${slug}.webp`,
  );
  const temporaryPath = `${outputPath}.tmp`;
  await mkdir(dirname(outputPath), { recursive: true });

  const { data: source, info: sourceInfo } = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (
    sourceInfo.width !== baseRecord.output.width ||
    sourceInfo.height !== baseRecord.output.height
  ) {
    throw new Error(`Base dimensions drift for ${instance.asset_id}`);
  }
  for (let index = 3; index < source.length; index += 4) {
    if (source[index] !== 0 && source[index] !== 255) {
      throw new Error(`Non-binary base alpha for ${instance.asset_id}`);
    }
  }

  const neutral = neutralizeRgba(source);
  const transformed = applyPalette(neutral, palette.rgb);
  if (transformed.introducedClipPixels !== 0) {
    throw new Error(`Palette transform clipped ${instance.asset_id}`);
  }

  await sharp(transformed.data, {
    raw: {
      width: sourceInfo.width,
      height: sourceInfo.height,
      channels: 4,
    },
  })
    .webp({ lossless: true, effort: 6 })
    .toFile(temporaryPath);

  const { data: decoded, info: decodedInfo } = await sharp(temporaryPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (
    decodedInfo.width !== sourceInfo.width ||
    decodedInfo.height !== sourceInfo.height
  ) {
    throw new Error(`Encoded dimensions drift for ${instance.asset_id}`);
  }
  const measurements = compareOutput(
    source,
    neutral,
    decoded,
    decodedInfo.width,
    decodedInfo.height,
  );
  if (measurements.alpha_mismatch_pixels !== 0) {
    throw new Error(`Encoded alpha drift for ${instance.asset_id}`);
  }
  if (measurements.luma_mae > 1) {
    throw new Error(
      `Encoded luma drift for ${instance.asset_id}: ${measurements.luma_mae}`,
    );
  }
  if (measurements.introduced_clip_pixels !== 0) {
    throw new Error(`Encoded palette clipping for ${instance.asset_id}`);
  }

  await rename(temporaryPath, outputPath);
  const outputBytes = (await stat(outputPath)).size;
  const outputData = await readFile(outputPath);
  totalBytes += outputBytes;
  records.push({
    ...instance,
    palette_id: instance.employer_id,
    source_runtime_path: baseRecord.runtime_path.replace(/^\/public/, ""),
    runtime_path: runtimePath,
    file_path: runtimePath.replace(/^\//, "public/"),
    output: {
      ...measurements,
      bytes: outputBytes,
      sha256: sha256(outputData),
      alpha: "byte-identical-to-base",
      encoding: "lossless-webp",
    },
  });
}

if (records.length !== 58 || runtimePaths.size !== 58) {
  throw new Error(
    `Palette output cardinality drift: ${records.length} records, ${runtimePaths.size} paths`,
  );
}

const usageTuples = records.map((record) => [
  record.instance_id,
  record.asset_id,
  record.employer_id,
  record.kind,
]);
const manifest = {
  schema_version: "career-world-runtime-palette/v1",
  palette_revision: "employer-zones/v1",
  source_manifest: "public/career-world/art/runtime-art-manifest.json",
  source_registry: "features/career-world/model/world-registry.ts",
  source_registry_sha256: sha256(registrySource),
  registry_usage_sha256: sha256(JSON.stringify(usageTuples)),
  runtime_path_pattern:
    "/career-world/art/palette/{employer}/{category}/{slug}.webp",
  transform: {
    method: "rec709-neutral-zero-luminance-chroma",
    luma_weights: LUMA_WEIGHTS,
    chroma_strength: CHROMA_STRENGTH,
    shadow_gate: SHADOW_GATE,
    alpha_contract: "byte-identical-binary",
    encoder: { format: "webp", lossless: true, effort: 6 },
  },
  palettes: Object.fromEntries(
    EMPLOYER_KEYS.map((employerId) => [
      employerId,
      { accent: PALETTES[employerId].accent, rgb: PALETTES[employerId].rgb },
    ]),
  ),
  counts: {
    total: records.length,
    capital: records.filter((record) => record.kind === "capital").length,
    project: records.filter((record) => record.kind === "project").length,
    skill: records.filter((record) => record.kind === "skill").length,
  },
  total_bytes: totalBytes,
  records,
};

await writeFile(
  paletteManifestPath,
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log(
  `Built ${records.length} registry-used palette variants (${totalBytes} bytes) with exact alpha and luma MAE <= 1.`,
);
