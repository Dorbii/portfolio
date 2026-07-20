import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import {
  alphaBounds,
  buildForegroundMask,
  tightNormalizedRgba,
} from "./lib/career-world-silhouette.mjs";

sharp.cache(false);
sharp.concurrency(1);

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_ROOT = join(ROOT, "design", "career-world", "rendered-cities");
const SPRITE_ROOT = join(OUTPUT_ROOT, "sprites");
const AUDIT_ROOT = join(OUTPUT_ROOT, "audit");
const ART_MANIFEST_PATH = join(
  ROOT,
  "design",
  "career-world",
  "production-art",
  "art-lock-manifest.json",
);
const TRANSPORT_MANIFEST_PATH = join(
  ROOT,
  "design",
  "career-world",
  "production-art",
  "transport-pool-manifest.json",
);
const LAYOUT_PATH = join(
  ROOT,
  "design",
  "career-world",
  "territories",
  "territory-layouts.json",
);

const SPRITES_ONLY = process.argv.includes("--sprites-only");
const CATEGORY_LIMITS = Object.freeze({
  ambient: Object.freeze({ width: 520, height: 380 }),
  city: Object.freeze({ width: 900, height: 700 }),
  project: Object.freeze({ width: 820, height: 620 }),
  skill: Object.freeze({ width: 620, height: 500 }),
});

const ENVIRONMENT_FILES = Object.freeze({
  ninjaone: "ninjaone-environment-r1.png",
  tanium: "tanium-environment-r1.png",
  independent: "independent-environment-r1.png",
  "column-technologies": "column-technologies-environment-r1.png",
  "ace-hardware": "ace-hardware-environment-r1.png",
});

const ASSET_ALIASES = Object.freeze({
  "project/engineering-metrics-pipeline@v1": "project/kaizen-metrics@v1",
});

const OFFSHORE_SUPPORTS = Object.freeze({
  tanium: [
    {
      assetId: "skill/electron@v1",
      connectX: 852,
      connectY: 216,
      width: 76,
      depth: 42,
    },
    {
      assetId: "skill/react@v1",
      connectX: 952,
      connectY: 318,
      width: 80,
      depth: 44,
    },
    {
      assetId: "skill/workflow-orchestration@v1",
      connectX: 1012,
      connectY: 648,
      width: 76,
      depth: 42,
    },
  ],
});

const AMBIENT_WIDTHS = Object.freeze({
  "ambient/city-shuttle@v1": 52,
  "ambient/commuter-car@v1": 40,
  "ambient/delivery-van@v1": 46,
  "ambient/harbor-ferry@v1": 88,
  "ambient/service-truck@v1": 56,
  "ambient/work-skiff@v1": 56,
  "ambient/cargo-boat@v1": 82,
});

const AMBIENT_PLACEMENTS = Object.freeze({
  ninjaone: [
    { family: "ambient/city-shuttle@v1", variant: 0, x: 575, y: 520 },
    { family: "ambient/commuter-car@v1", variant: 1, x: 720, y: 500 },
    { family: "ambient/delivery-van@v1", variant: 0, x: 1015, y: 405 },
    { family: "ambient/service-truck@v1", variant: 1, x: 252, y: 650 },
    { family: "ambient/work-skiff@v1", variant: 0, x: 112, y: 674 },
  ],
  tanium: [
    { family: "ambient/city-shuttle@v1", variant: 1, x: 410, y: 512 },
    { family: "ambient/commuter-car@v1", variant: 0, x: 650, y: 365 },
    { family: "ambient/delivery-van@v1", variant: 1, x: 805, y: 522 },
    { family: "ambient/service-truck@v1", variant: 0, x: 236, y: 406 },
    { family: "ambient/work-skiff@v1", variant: 1, x: 1060, y: 704 },
  ],
  independent: [
    { family: "ambient/commuter-car@v1", variant: 1, x: 440, y: 506 },
    { family: "ambient/delivery-van@v1", variant: 0, x: 650, y: 414 },
    { family: "ambient/service-truck@v1", variant: 1, x: 276, y: 354 },
    { family: "ambient/work-skiff@v1", variant: 0, x: 812, y: 572 },
  ],
  "column-technologies": [
    { family: "ambient/commuter-car@v1", variant: 0, x: 312, y: 398 },
    { family: "ambient/delivery-van@v1", variant: 1, x: 458, y: 468 },
    { family: "ambient/service-truck@v1", variant: 0, x: 642, y: 350 },
    { family: "ambient/harbor-ferry@v1", variant: 0, x: 770, y: 176 },
    { family: "ambient/work-skiff@v1", variant: 1, x: 168, y: 314 },
  ],
  "ace-hardware": [
    { family: "ambient/commuter-car@v1", variant: 1, x: 250, y: 275 },
    { family: "ambient/delivery-van@v1", variant: 0, x: 315, y: 405 },
    { family: "ambient/service-truck@v1", variant: 1, x: 505, y: 398 },
    { family: "ambient/work-skiff@v1", variant: 0, x: 685, y: 292 },
  ],
});

function assetSlug(assetId) {
  return assetId.replace(/@v\d+$/, "").replaceAll("/", "--");
}

function xml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function buildSprite({
  spriteId,
  sourcePath,
  category,
  brightness = 1,
  sourceFrameScale = 1,
  mapRoleScale = null,
  metadata = {},
}) {
  const limit = CATEGORY_LIMITS[category];
  if (!limit) throw new Error(`Missing sprite size limit for ${category}`);
  const absoluteSource = resolve(ROOT, sourcePath);
  if (!(await exists(absoluteSource))) {
    throw new Error(`Missing locked source for ${spriteId}: ${sourcePath}`);
  }
  const { data: pixels, info } = await sharp(absoluteSource)
    .resize({
      width: limit.width,
      height: limit.height,
      fit: "inside",
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { alpha, background, threshold } = buildForegroundMask(
    pixels,
    info.width,
    info.height,
    info.channels,
  );
  const bounds = alphaBounds(alpha, info.width, info.height);
  const tight = tightNormalizedRgba(
    pixels,
    alpha,
    info.width,
    info.channels,
    bounds,
    brightness,
  );
  const filename = `${assetSlug(spriteId)}.webp`;
  const outputPath = join(SPRITE_ROOT, filename);
  await sharp(tight.data, {
    raw: { width: tight.width, height: tight.height, channels: 4 },
  })
    .webp({ lossless: true, alphaQuality: 100, effort: 5 })
    .toFile(outputPath);
  return {
    spriteId,
    category,
    sourcePath,
    outputPath: outputPath.slice(ROOT.length + 1).replaceAll("\\", "/"),
    outputWidth: tight.width,
    outputHeight: tight.height,
    sourceFrameScale,
    mapRoleScale,
    brightnessCompensation: brightness,
    backgroundLuminance: Number(background.toFixed(2)),
    foregroundThreshold: Number(threshold.toFixed(2)),
    opaquePixels: bounds.opaquePixels,
    alphaCoverage: Number(
      (bounds.opaquePixels / (tight.width * tight.height)).toFixed(6),
    ),
    ...metadata,
  };
}

async function buildSprites(artManifest, transportManifest) {
  await mkdir(SPRITE_ROOT, { recursive: true });
  const records = [];
  for (const asset of artManifest.assets) {
    records.push(
      await buildSprite({
        spriteId: asset.assetId,
        sourcePath: asset.sourcePath,
        category: asset.category,
        brightness: asset.audit.toneAudit.brightnessCompensation,
        sourceFrameScale: asset.audit.framingAudit.sourceFrameScale,
        mapRoleScale: asset.audit.framingAudit.mapRoleScale,
        metadata: {
          candidateId: asset.candidateId,
          lockType: asset.lockType,
        },
      }),
    );
  }

  const selectedVariantIndices = [0, 1];
  for (const family of transportManifest.families) {
    for (let selectionIndex = 0; selectionIndex < selectedVariantIndices.length; selectionIndex += 1) {
      const sourceIndex = selectedVariantIndices[selectionIndex];
      const variant = family.variants[sourceIndex];
      if (!variant) {
        throw new Error(`Transport family ${family.assetId} lacks variant ${sourceIndex + 1}`);
      }
      const spriteId = `${family.assetId.replace(/@v\d+$/, "")}/${String(
        selectionIndex + 1,
      ).padStart(2, "0")}@v1`;
      records.push(
        await buildSprite({
          spriteId,
          sourcePath: variant.sourcePath,
          category: "ambient",
          metadata: {
            familyAssetId: family.assetId,
            variantIndex: selectionIndex,
            sourceVariantIndex: sourceIndex,
            candidateId: variant.candidateId,
            selectionMode: "deterministic-mixed-pool",
          },
        }),
      );
    }
  }
  await writeFile(
    join(SPRITE_ROOT, "sprite-manifest.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        normalization: {
          alpha: "connected authored silhouette extracted from near-black concept field",
          tone: "neutral grayscale plus locked per-asset brightness compensation",
          scale: "locked sourceFrameScale and mapRoleScale applied during scene placement",
        },
        counts: {
          lockedLandmarks: artManifest.assets.length,
          mixedAmbientVariants: records.length - artManifest.assets.length,
          total: records.length,
        },
        records,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return records;
}

function relationshipSvg(territory) {
  const nodeByAsset = new Map(territory.nodes.map((node) => [node.assetId, node]));
  const capital = territory.nodes.find((node) => node.kind === "capital");
  const paths = [];
  if (capital) {
    for (const project of territory.nodes.filter((node) => node.kind === "project")) {
      paths.push(
        `<path d="M ${capital.position.x} ${capital.position.y} L ${project.position.x} ${project.position.y}" fill="none" stroke="#bdbdbd" stroke-opacity="0.27" stroke-width="3"/>`,
      );
      for (const skillId of project.skillIds ?? []) {
        const skill = nodeByAsset.get(`skill/${skillId}@v1`);
        if (!skill) continue;
        paths.push(
          `<path d="M ${project.position.x} ${project.position.y} L ${skill.position.x} ${skill.position.y}" fill="none" stroke="#ababab" stroke-opacity="0.16" stroke-width="1.5" stroke-dasharray="5 8"/>`,
        );
      }
    }
  }
  const offshoreSupports = (OFFSHORE_SUPPORTS[territory.id] ?? []).map((support) => {
    const node = nodeByAsset.get(support.assetId);
    if (!node) throw new Error(`Missing offshore support node ${support.assetId}`);
    const { x, y } = node.position;
    const halfWidth = support.width / 2;
    const halfDepth = support.depth / 2;
    const drop = 8;
    const top = `${x} ${y - halfDepth}, ${x + halfWidth} ${y}, ${x} ${
      y + halfDepth
    }, ${x - halfWidth} ${y}`;
    const lower = `${x - halfWidth} ${y}, ${x} ${y + halfDepth}, ${x} ${
      y + halfDepth + drop
    }, ${x - halfWidth} ${y + drop}`;
    const right = `${x + halfWidth} ${y}, ${x} ${y + halfDepth}, ${x} ${
      y + halfDepth + drop
    }, ${x + halfWidth} ${y + drop}`;
    return [
      `<path d="M ${support.connectX} ${support.connectY} L ${x} ${y}" fill="none" stroke="#242424" stroke-width="14" stroke-linecap="square"/>`,
      `<path d="M ${support.connectX} ${support.connectY} L ${x} ${y}" fill="none" stroke="#777777" stroke-width="9" stroke-linecap="square"/>`,
      `<path d="M ${support.connectX} ${support.connectY} L ${x} ${y}" fill="none" stroke="#b0b0b0" stroke-opacity="0.72" stroke-width="1.5"/>`,
      `<polygon points="${lower}" fill="#171717" stroke="#6f6f6f" stroke-width="1"/>`,
      `<polygon points="${right}" fill="#202020" stroke="#767676" stroke-width="1"/>`,
      `<polygon points="${top}" fill="#343434" stroke="#a0a0a0" stroke-width="1.5"/>`,
      `<circle cx="${support.connectX}" cy="${support.connectY}" r="5" fill="#303030" stroke="#909090" stroke-width="1"/>`,
    ].join("");
  });
  const pads = territory.nodes.map((node) => {
    const width = node.reservedFootprint.width * 1.06;
    const depth = node.reservedFootprint.depth * 0.76;
    const { x, y } = node.position;
    const points = `${x} ${y - depth / 2}, ${x + width / 2} ${y}, ${x} ${
      y + depth / 2
    }, ${x - width / 2} ${y}`;
    const fill = node.kind === "capital" ? "#2a2a2a" : "#1e1e1e";
    const opacity = node.kind === "capital" ? 0.84 : 0.72;
    return [
      `<polygon points="${points}" fill="${fill}" fill-opacity="${opacity}" stroke="#969696" stroke-opacity="0.72" stroke-width="1.2"/>`,
      `<ellipse cx="${x}" cy="${y + depth * 0.12}" rx="${width * 0.32}" ry="${
        depth * 0.2
      }" fill="#000" fill-opacity="0.34"/>`,
    ].join("");
  });
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${territory.canvas.width}" height="${territory.canvas.height}" viewBox="0 0 ${territory.canvas.width} ${territory.canvas.height}">${paths.join("")}${offshoreSupports.join("")}${pads.join("")}</svg>`,
  );
}

function targetNodeWidth(node, artRecord) {
  const roleWidth = 224 * artRecord.mapRoleScale * artRecord.sourceFrameScale;
  return Math.round(Math.max(node.reservedFootprint.width, roleWidth));
}

async function spriteComposite(spriteRecord, width, anchorX, anchorY) {
  const absolutePath = resolve(ROOT, spriteRecord.outputPath);
  const { data, info } = await sharp(absolutePath)
    .resize({ width, fit: "inside", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer({ resolveWithObject: true });
  return {
    input: data,
    left: Math.round(anchorX - info.width / 2),
    top: Math.round(anchorY - info.height),
    width: info.width,
    height: info.height,
  };
}

async function exactGrayscaleAudit(path) {
  const { data, info } = await sharp(path)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let maxRgbChannelDelta = 0;
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const red = data[offset];
    const green = info.channels > 1 ? data[offset + 1] : red;
    const blue = info.channels > 2 ? data[offset + 2] : red;
    maxRgbChannelDelta = Math.max(
      maxRgbChannelDelta,
      Math.abs(red - green),
      Math.abs(red - blue),
      Math.abs(green - blue),
    );
  }
  return {
    pixelCount: info.width * info.height,
    maxRgbChannelDelta,
    exactNeutralGrayscale: maxRgbChannelDelta === 0,
  };
}

function footprintCollisions(territory) {
  const collisions = [];
  for (let leftIndex = 0; leftIndex < territory.nodes.length; leftIndex += 1) {
    const left = territory.nodes[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < territory.nodes.length; rightIndex += 1) {
      const right = territory.nodes[rightIndex];
      const leftBox = {
        x1: left.position.x - left.reservedFootprint.width / 2,
        x2: left.position.x + left.reservedFootprint.width / 2,
        y1: left.position.y - left.reservedFootprint.depth / 2,
        y2: left.position.y + left.reservedFootprint.depth / 2,
      };
      const rightBox = {
        x1: right.position.x - right.reservedFootprint.width / 2,
        x2: right.position.x + right.reservedFootprint.width / 2,
        y1: right.position.y - right.reservedFootprint.depth / 2,
        y2: right.position.y + right.reservedFootprint.depth / 2,
      };
      const overlapWidth = Math.max(0, Math.min(leftBox.x2, rightBox.x2) - Math.max(leftBox.x1, rightBox.x1));
      const overlapHeight = Math.max(0, Math.min(leftBox.y2, rightBox.y2) - Math.max(leftBox.y1, rightBox.y1));
      if (overlapWidth > 0 && overlapHeight > 0) {
        collisions.push({ left: left.nodeId, right: right.nodeId, overlapArea: overlapWidth * overlapHeight });
      }
    }
  }
  return collisions;
}

async function renderTerritory(territory, spriteRecords) {
  const environmentFilename = ENVIRONMENT_FILES[territory.id];
  if (!environmentFilename) throw new Error(`No environment mapping for ${territory.id}`);
  const environmentPath = join(OUTPUT_ROOT, "environment-plates", environmentFilename);
  if (!(await exists(environmentPath))) {
    throw new Error(`Missing generated environment plate: ${environmentPath}`);
  }
  const outputDirectory = join(OUTPUT_ROOT, territory.id);
  await mkdir(outputDirectory, { recursive: true });
  const outputPath = join(outputDirectory, `${territory.id}-rendered-r1.png`);
  const artById = new Map(
    spriteRecords
      .filter((record) => !record.familyAssetId)
      .map((record) => [record.spriteId, record]),
  );
  const ambientByKey = new Map(
    spriteRecords
      .filter((record) => record.familyAssetId)
      .map((record) => [`${record.familyAssetId}#${record.variantIndex}`, record]),
  );
  const placed = [];
  for (const node of territory.nodes) {
    const resolvedAssetId = ASSET_ALIASES[node.assetId] ?? node.assetId;
    const sprite = artById.get(resolvedAssetId);
    if (!sprite) throw new Error(`No locked sprite for ${node.assetId}`);
    const width = targetNodeWidth(node, sprite);
    const anchorY = node.position.y + node.reservedFootprint.depth * 0.42;
    const composite = await spriteComposite(sprite, width, node.position.x, anchorY);
    placed.push({
      type: "node",
      depth: anchorY,
      node,
      sprite,
      composite,
      placement: {
        nodeId: node.nodeId,
        assetId: node.assetId,
        resolvedArtAssetId: resolvedAssetId,
        label: node.label,
        kind: node.kind,
        x: node.position.x,
        y: node.position.y,
        anchorY: Number(anchorY.toFixed(2)),
        renderedWidth: composite.width,
        renderedHeight: composite.height,
        left: composite.left,
        top: composite.top,
      },
    });
  }
  for (const ambient of AMBIENT_PLACEMENTS[territory.id] ?? []) {
    const sprite = ambientByKey.get(`${ambient.family}#${ambient.variant}`);
    if (!sprite) throw new Error(`No mixed-pool sprite for ${ambient.family} variant ${ambient.variant}`);
    const width = AMBIENT_WIDTHS[ambient.family] ?? 48;
    const composite = await spriteComposite(sprite, width, ambient.x, ambient.y);
    placed.push({
      type: "ambient",
      depth: ambient.y,
      sprite,
      composite,
      placement: {
        familyAssetId: ambient.family,
        candidateId: sprite.candidateId,
        variantIndex: ambient.variant,
        x: ambient.x,
        y: ambient.y,
        renderedWidth: composite.width,
        renderedHeight: composite.height,
        left: composite.left,
        top: composite.top,
      },
    });
  }
  placed.sort((left, right) => left.depth - right.depth);
  const composites = [
    { input: relationshipSvg(territory), left: 0, top: 0 },
    ...placed.map((entry) => ({
      input: entry.composite.input,
      left: entry.composite.left,
      top: entry.composite.top,
    })),
  ];
  const resizedEnvironment = await sharp(environmentPath)
    .resize({
      width: territory.canvas.width,
      height: territory.canvas.height,
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    })
    .greyscale()
    .modulate({ brightness: 0.8 })
    .png()
    .toBuffer();
  await sharp(resizedEnvironment).composite(composites).png().toFile(outputPath);
  const clippedPlacements = placed
    .filter(
      (entry) =>
        entry.composite.left < 0 ||
        entry.composite.top < 0 ||
        entry.composite.left + entry.composite.width > territory.canvas.width ||
        entry.composite.top + entry.composite.height > territory.canvas.height,
    )
    .map((entry) => entry.placement);
  return {
    territoryId: territory.id,
    label: territory.label,
    environmentPath: environmentPath.slice(ROOT.length + 1).replaceAll("\\", "/"),
    outputPath: outputPath.slice(ROOT.length + 1).replaceAll("\\", "/"),
    width: territory.canvas.width,
    height: territory.canvas.height,
    expectedNodeCount: territory.nodeCount,
    renderedNodeCount: placed.filter((entry) => entry.type === "node").length,
    ambientCount: placed.filter((entry) => entry.type === "ambient").length,
    footprintCollisions: footprintCollisions(territory),
    clippedPlacements,
    grayscaleAudit: await exactGrayscaleAudit(outputPath),
    nodePlacements: placed
      .filter((entry) => entry.type === "node")
      .map((entry) => entry.placement),
    ambientPlacements: placed
      .filter((entry) => entry.type === "ambient")
      .map((entry) => entry.placement),
    bytes: (await stat(outputPath)).size,
  };
}

async function buildContactSheet(renderRecords) {
  const cellWidth = 790;
  const cellHeight = 570;
  const sheetWidth = cellWidth * 2;
  const sheetHeight = cellHeight * 3;
  const composites = [];
  for (let index = 0; index < renderRecords.length; index += 1) {
    const record = renderRecords[index];
    const column = index % 2;
    const row = Math.floor(index / 2);
    const left = column * cellWidth + 24;
    const top = row * cellHeight + 54;
    const card = await sharp(resolve(ROOT, record.outputPath))
      .resize({ width: 742, height: 486, fit: "contain", background: "#0a0d10" })
      .png()
      .toBuffer();
    composites.push({ input: card, left, top });
    composites.push({
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="742" height="44"><rect width="742" height="44" rx="8" fill="#10151a"/><text x="14" y="28" fill="#edf0f1" font-family="Segoe UI,Arial,sans-serif" font-size="18" font-weight="700">${xml(
          record.label,
        )}</text><text x="728" y="27" text-anchor="end" fill="#8f9aa0" font-family="Consolas,monospace" font-size="11">${record.renderedNodeCount} LANDMARKS · ${record.ambientCount} AMBIENT</text></svg>`,
      ),
      left,
      top: row * cellHeight + 8,
    });
  }
  const outputPath = join(AUDIT_ROOT, "rendered-cities-contact-sheet.png");
  await sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 4,
      background: "#080b0e",
    },
  })
    .composite(composites)
    .png()
    .toFile(outputPath);
  return outputPath;
}

function buildIndex(renderRecords) {
  const cards = renderRecords
    .map(
      (record) =>
        `<article><h2>${xml(record.label)}</h2><p>${record.renderedNodeCount} locked landmarks · ${record.ambientCount} mixed ambient assets</p><img src="./${record.territoryId}/${record.territoryId}-rendered-r1.png" alt="Rendered ${xml(record.label)} Career World territory"></article>`,
    )
    .join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Career World rendered cities</title><style>html{background:#080b0e;color:#edf0f1;font-family:Inter,Segoe UI,sans-serif}body{margin:0;padding:28px}header{max-width:900px;margin:0 auto 24px}p{color:#98a3a9}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(520px,1fr));gap:20px}article{background:#10151a;border:1px solid #303940;border-radius:14px;overflow:hidden}h2,article p{margin-left:16px;margin-right:16px}h2{font-size:17px;margin-bottom:4px}article p{font-size:12px;margin-top:0}img{display:block;width:100%;height:auto;background:#090c0f}</style></head><body><header><h1>Career World — standalone rendered cities</h1><p>Generated terrain plates with reviewed landmark art and deterministic mixed transport. These scenes are intentionally not stitched into a global map.</p></header><main class="grid">${cards}</main></body></html>\n`;
}

const [artManifest, transportManifest, layout] = await Promise.all([
  readJson(ART_MANIFEST_PATH),
  readJson(TRANSPORT_MANIFEST_PATH),
  readJson(LAYOUT_PATH),
]);
await mkdir(OUTPUT_ROOT, { recursive: true });
await mkdir(AUDIT_ROOT, { recursive: true });
const spriteRecords = await buildSprites(artManifest, transportManifest);
if (SPRITES_ONLY) {
  console.log(`Built ${spriteRecords.length} normalized locked and mixed-pool sprites.`);
  process.exit(0);
}

const renderRecords = [];
for (const territory of layout.territories) {
  renderRecords.push(await renderTerritory(territory, spriteRecords));
}
const expectedNodeCount = layout.territories.reduce(
  (total, territory) => total + territory.nodeCount,
  0,
);
const renderedNodeCount = renderRecords.reduce(
  (total, record) => total + record.renderedNodeCount,
  0,
);
if (expectedNodeCount !== renderedNodeCount) {
  throw new Error(`Rendered ${renderedNodeCount}/${expectedNodeCount} canonical nodes`);
}
const collisionCount = renderRecords.reduce(
  (total, record) => total + record.footprintCollisions.length,
  0,
);
if (collisionCount !== 0) {
  throw new Error(`Detected ${collisionCount} reserved-footprint overlaps`);
}
const clippedPlacementCount = renderRecords.reduce(
  (total, record) => total + record.clippedPlacements.length,
  0,
);
if (clippedPlacementCount !== 0) {
  throw new Error(`Detected ${clippedPlacementCount} clipped placements`);
}
const nonNeutralRenderCount = renderRecords.filter(
  (record) => !record.grayscaleAudit.exactNeutralGrayscale,
).length;
if (nonNeutralRenderCount !== 0) {
  throw new Error(`Detected ${nonNeutralRenderCount} non-neutral rendered cities`);
}
const contactSheetPath = await buildContactSheet(renderRecords);
await writeFile(join(OUTPUT_ROOT, "index.html"), buildIndex(renderRecords), "utf8");
const renderManifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: "standalone-city-render-pass",
  sourceContracts: {
    layout: "design/career-world/territories/territory-layouts.json",
    art: "design/career-world/production-art/art-lock-manifest.json",
    ambient: "design/career-world/production-art/transport-pool-manifest.json",
  },
  globalMapUsed: false,
  stitched: false,
  toneAndScale: {
    tone: "neutral grayscale with per-asset locked brightness compensation",
    perspective: "locked art director orthographic isometric pass",
    sourceFrameScaleApplied: true,
    mapRoleScaleApplied: true,
    depthOrder: "ascending local y anchor",
  },
  counts: {
    territories: renderRecords.length,
    canonicalNodesExpected: expectedNodeCount,
    canonicalNodesRendered: renderedNodeCount,
    lockedSpriteSources: artManifest.assets.length,
    mixedAmbientSpriteVariants: spriteRecords.filter((record) => record.familyAssetId).length,
    ambientInstancesRendered: renderRecords.reduce(
      (total, record) => total + record.ambientCount,
      0,
    ),
    reservedFootprintCollisions: collisionCount,
    clippedPlacements: clippedPlacementCount,
    exactNeutralGrayscaleRenders: renderRecords.length - nonNeutralRenderCount,
  },
  projectionAudit: {
    target: "orthographic true-isometric; azimuth 225 degrees; elevation 35.264 degrees; roll 0",
    lockedAssetsPassed: artManifest.assets.filter(
      (asset) => asset.audit.projectionAudit.status === "director-contact-sheet-pass",
    ).length,
    lockedAssetsTotal: artManifest.assets.length,
  },
  contactSheet: contactSheetPath.slice(ROOT.length + 1).replaceAll("\\", "/"),
  territories: renderRecords,
};
await writeFile(
  join(OUTPUT_ROOT, "render-manifest.json"),
  `${JSON.stringify(renderManifest, null, 2)}\n`,
  "utf8",
);

console.log(
  `Rendered ${renderRecords.length} standalone cities with ${renderedNodeCount}/${expectedNodeCount} locked landmark nodes, ${renderManifest.counts.ambientInstancesRendered} mixed ambient instances, and zero reserved-footprint collisions.`,
);
