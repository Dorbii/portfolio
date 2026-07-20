import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

sharp.cache(false);
sharp.concurrency(1);

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MAP_ROOT = join(ROOT, "design", "career-world", "world-map-mockups");
const CONCEPT_ROOT = join(MAP_ROOT, "concepts");
const ASSET_ROOT = join(MAP_ROOT, "assets", "overview-capitals");
const AUDIT_ROOT = join(MAP_ROOT, "audit");
const ORIGINAL_SPRITE_ROOT = join(ROOT, "design", "career-world", "rendered-cities", "sprites");
const TANIUM_REGEN_ROOT = join(
  ROOT,
  "design",
  "career-world",
  "targeted-regeneration",
  "cities-tanium-r4",
);

const WIDTH = 1536;
const HEIGHT = 1024;
const PLANNING_WIDTH = 1600;
const PLANNING_HEIGHT = 900;
const GRID_UNITS = Object.freeze({ minor: 20, half: 50, major: 100 });
const TARGET_VISIBLE_MEAN = 92;

const territoryContract = Object.freeze({
  ninjaone: { nodeCount: 20, layoutWeight: 26, topography: "concentric relay plateau" },
  tanium: { nodeCount: 15, layoutWeight: 23, topography: "diagonal inspection escarpment" },
  independent: { nodeCount: 9, layoutWeight: 14, topography: "asymmetric maker peninsula" },
  "column-technologies": {
    nodeCount: 7,
    layoutWeight: 13,
    topography: "engineered breakwater",
  },
  "ace-hardware": { nodeCount: 5, layoutWeight: 11, topography: "forested workshop cove" },
});

const placements = [
  {
    cityId: "ninjaone",
    label: "NinjaOne",
    x: 864,
    groundY: 266,
    width: 72,
    region: "largest northeast relay plateau",
    sourcePath: join(ORIGINAL_SPRITE_ROOT, "city--ninjaone.webp"),
  },
  {
    cityId: "tanium",
    label: "Tanium",
    x: 872,
    groundY: 568,
    width: 68,
    region: "southeast inspection escarpment",
    sourcePath: join(TANIUM_REGEN_ROOT, "city-tanium-vertical-t-r1.png"),
  },
  {
    cityId: "independent",
    label: "Independent",
    x: 470,
    groundY: 566,
    width: 66,
    region: "smaller southwest maker peninsula",
    sourcePath: join(ORIGINAL_SPRITE_ROOT, "city--independent.webp"),
  },
  {
    cityId: "column-technologies",
    label: "Column Technologies",
    x: 1264,
    groundY: 654,
    width: 68,
    region: "engineered eastern harbor island",
    sourcePath: join(ORIGINAL_SPRITE_ROOT, "city--column-technologies.webp"),
  },
  {
    cityId: "ace-hardware",
    label: "ACE Hardware",
    x: 824,
    groundY: 902,
    width: 66,
    region: "forested southern workshop-cove island",
    sourcePath: join(ORIGINAL_SPRITE_ROOT, "city--ace-hardware.webp"),
  },
];

const territoryCrops = [
  { cityId: "ninjaone", label: "NinjaOne relay plateau", left: 660, top: 75, width: 440, height: 300 },
  { cityId: "tanium", label: "Tanium inspection escarpment", left: 640, top: 355, width: 500, height: 330 },
  { cityId: "independent", label: "Independent maker peninsula", left: 180, top: 385, width: 480, height: 360 },
  { cityId: "column-technologies", label: "Column engineered harbor", left: 1080, top: 460, width: 430, height: 350 },
  { cityId: "ace-hardware", label: "ACE forest workshop cove", left: 620, top: 730, width: 420, height: 280 },
];

function relative(path) {
  return path.slice(ROOT.length + 1).replaceAll("\\", "/");
}

async function visiblePixelMean(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let total = 0;
  let count = 0;
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const alpha = data[offset + 3];
    if (alpha < 128) continue;
    total += data[offset];
    count += 1;
  }
  return count === 0 ? 0 : total / count;
}

async function grayscaleAudit(path) {
  const { data, info } = await sharp(path).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let maxRgbChannelDelta = 0;
  for (let offset = 0; offset < data.length; offset += info.channels) {
    maxRgbChannelDelta = Math.max(
      maxRgbChannelDelta,
      Math.abs(data[offset] - data[offset + 1]),
      Math.abs(data[offset] - data[offset + 2]),
      Math.abs(data[offset + 1] - data[offset + 2]),
    );
  }
  return { maxRgbChannelDelta, exactNeutralGrayscale: maxRgbChannelDelta === 0 };
}

async function buildOverviewSprite(placement) {
  const initial = await sharp(placement.sourcePath)
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 })
    .resize({ width: placement.width, fit: "inside", kernel: sharp.kernel.lanczos3 })
    .greyscale()
    .ensureAlpha()
    .png()
    .toBuffer();
  const beforeMean = await visiblePixelMean(initial);
  const multiplier = Math.min(1.55, Math.max(0.7, TARGET_VISIBLE_MEAN / beforeMean));
  const normalized = await sharp(initial)
    .linear([multiplier, multiplier, multiplier, 1], [0, 0, 0, 0])
    .sharpen({ sigma: 0.35, m1: 0.45, m2: 0.15 })
    .png()
    .toBuffer({ resolveWithObject: true });
  const outputPath = join(ASSET_ROOT, `city--${placement.cityId}-overview-r1.png`);
  await writeFile(outputPath, normalized.data);
  const afterMean = await visiblePixelMean(normalized.data);
  return {
    data: normalized.data,
    info: normalized.info,
    outputPath,
    beforeMean,
    afterMean,
    multiplier,
  };
}

function shadowSvg(records) {
  const ellipses = records
    .map((record) => {
      const rx = Math.round(record.width * (record.cityId === "tanium" ? 0.34 : 0.4));
      const ry = Math.max(3, Math.round(record.width * 0.09));
      return `<ellipse cx="${record.x}" cy="${record.groundY - 2}" rx="${rx}" ry="${ry}" fill="#000000" fill-opacity="0.42"/>`;
    })
    .join("");
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><defs><filter id="b"><feGaussianBlur stdDeviation="2.2"/></filter></defs><g filter="url(#b)">${ellipses}</g></svg>`,
  );
}

function snapToGrid(value, unit = GRID_UNITS.minor) {
  return Math.round(value / unit) * unit;
}

function planningGridSvg(anchorRecords) {
  const lines = [];
  for (let x = 0; x <= PLANNING_WIDTH; x += GRID_UNITS.minor) {
    const major = x % GRID_UNITS.major === 0;
    const half = !major && x % GRID_UNITS.half === 0;
    lines.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${PLANNING_HEIGHT}" stroke="#91ced2" stroke-opacity="${major ? 0.3 : half ? 0.2 : 0.1}" stroke-width="1"/>`,
    );
  }
  for (let y = 0; y <= PLANNING_HEIGHT; y += GRID_UNITS.minor) {
    const major = y % GRID_UNITS.major === 0;
    const half = !major && y % GRID_UNITS.half === 0;
    lines.push(
      `<line x1="0" y1="${y}" x2="${PLANNING_WIDTH}" y2="${y}" stroke="#91ced2" stroke-opacity="${major ? 0.3 : half ? 0.2 : 0.1}" stroke-width="1"/>`,
    );
  }
  const labels = [];
  for (let x = 0; x <= PLANNING_WIDTH; x += GRID_UNITS.major) {
    labels.push(
      `<text x="${Math.min(x + 4, PLANNING_WIDTH - 34)}" y="15" fill="#b9e5e7" fill-opacity="0.72" font-family="Segoe UI,Arial,sans-serif" font-size="10">${x}</text>`,
    );
  }
  for (let y = GRID_UNITS.major; y <= PLANNING_HEIGHT; y += GRID_UNITS.major) {
    labels.push(
      `<text x="4" y="${Math.min(y + 13, PLANNING_HEIGHT - 4)}" fill="#b9e5e7" fill-opacity="0.72" font-family="Segoe UI,Arial,sans-serif" font-size="10">${y}</text>`,
    );
  }
  const anchors = anchorRecords
    .map(
      (record) =>
        `<g><circle cx="${record.x}" cy="${record.y}" r="8" fill="#081015" fill-opacity="0.78" stroke="#d9ffff" stroke-width="1.5"/><path d="M${record.x - 13} ${record.y}H${record.x + 13}M${record.x} ${record.y - 13}V${record.y + 13}" stroke="#d9ffff" stroke-width="1"/><rect x="${record.x + 12}" y="${record.y - 17}" width="${Math.max(72, record.label.length * 6.4 + 14)}" height="20" rx="4" fill="#071016" fill-opacity="0.88"/><text x="${record.x + 19}" y="${record.y - 4}" fill="#e7ffff" font-family="Segoe UI,Arial,sans-serif" font-size="11">${record.label}</text></g>`,
    )
    .join("");
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PLANNING_WIDTH}" height="${PLANNING_HEIGHT}" viewBox="0 0 ${PLANNING_WIDTH} ${PLANNING_HEIGHT}"><rect width="${PLANNING_WIDTH}" height="${PLANNING_HEIGHT}" fill="none" stroke="#91ced2" stroke-opacity="0.45"/>${lines.join("")}${labels.join("")}${anchors}</svg>`,
  );
}

await Promise.all([mkdir(ASSET_ROOT, { recursive: true }), mkdir(AUDIT_ROOT, { recursive: true })]);

const terrainSourcePath = join(
  CONCEPT_ROOT,
  "open-basin-company-territories-terrain-r1-source.png",
);
const terrainOutputPath = join(CONCEPT_ROOT, "open-basin-company-territories-terrain-r1.png");
const mapOutputPath = join(CONCEPT_ROOT, "open-basin-company-territories-capitals-r1.png");
const gridPlanOutputPath = join(
  AUDIT_ROOT,
  "open-basin-company-territories-grid-plan-r1.png",
);

const terrainMeta = await sharp(terrainSourcePath).metadata();
if (terrainMeta.width !== WIDTH || terrainMeta.height !== HEIGHT) {
  throw new Error(
    `Expected ${WIDTH}x${HEIGHT} terrain, received ${terrainMeta.width}x${terrainMeta.height}`,
  );
}

await sharp(terrainSourcePath).greyscale().png().toFile(terrainOutputPath);

const composites = [];
const records = [];
for (const placement of placements) {
  const sprite = await buildOverviewSprite(placement);
  const left = Math.round(placement.x - sprite.info.width / 2);
  const top = Math.round(placement.groundY - sprite.info.height);
  if (left < 0 || top < 0 || left + sprite.info.width > WIDTH || top + sprite.info.height > HEIGHT) {
    throw new Error(`Capital ${placement.cityId} clips the map canvas`);
  }
  composites.push({ input: sprite.data, left, top });
  records.push({
    ...placement,
    sourcePath: relative(placement.sourcePath),
    overviewSpritePath: relative(sprite.outputPath),
    renderedWidth: sprite.info.width,
    renderedHeight: sprite.info.height,
    left,
    top,
    visibleMeanBefore: Number(sprite.beforeMean.toFixed(2)),
    visibleMeanAfter: Number(sprite.afterMean.toFixed(2)),
    toneMultiplier: Number(sprite.multiplier.toFixed(4)),
    ...territoryContract[placement.cityId],
  });
}

const terrainBuffer = await sharp(terrainOutputPath).png().toBuffer();
await sharp(terrainBuffer)
  .composite([{ input: shadowSvg(records), left: 0, top: 0 }, ...composites])
  .greyscale()
  .png()
  .toFile(mapOutputPath);

const detailRecords = [];
for (const crop of territoryCrops) {
  const outputPath = join(AUDIT_ROOT, `open-basin-territory-${crop.cityId}-r1.png`);
  await sharp(mapOutputPath)
    .extract({ left: crop.left, top: crop.top, width: crop.width, height: crop.height })
    .png()
    .toFile(outputPath);
  detailRecords.push({ ...crop, outputPath: relative(outputPath) });
}

const planningAnchors = records.map((record) =>
  Object.freeze({
    instanceId: `instance/${record.cityId}/capital/01`,
    cityId: record.cityId,
    label: record.label,
    x: snapToGrid((record.x / WIDTH) * PLANNING_WIDTH),
    y: snapToGrid((record.groundY / HEIGHT) * PLANNING_HEIGHT),
  }),
);
const planningBase = await sharp(mapOutputPath)
  .resize({ width: PLANNING_WIDTH, height: PLANNING_HEIGHT, fit: "fill" })
  .png()
  .toBuffer();
await sharp(planningBase)
  .composite([{ input: planningGridSvg(planningAnchors), left: 0, top: 0 }])
  .png()
  .toFile(gridPlanOutputPath);

const audit = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  concept: "Open Basin company territories",
  status: "review-ready",
  canvas: { width: WIDTH, height: HEIGHT },
  projection: { type: "orthographic-isometric", azimuthDegrees: 225, elevationDegrees: 35.264 },
  renderingContract: {
    exactNeutralGrayscale: true,
    targetCapitalVisibleMean: TARGET_VISIBLE_MEAN,
    nominalCapitalWidth: 68,
    overviewCapitalWidthRange: [64, 72],
    commonLighting: "soft upper-left key with restrained contact occlusion",
    noMechanicalPads: true,
    ruggedIslandOccupied: false,
    projectAndSkillBuildingsPlaced: 0,
    aceForestCanopyTarget: "60-70 percent with clear service lanes and later project clearings",
  },
  terrainSourcePath: relative(terrainSourcePath),
  terrainOutputPath: relative(terrainOutputPath),
  mapOutputPath: relative(mapOutputPath),
  terrainGrayscaleAudit: await grayscaleAudit(terrainOutputPath),
  mapGrayscaleAudit: await grayscaleAudit(mapOutputPath),
  placements: records,
  territoryDetailCrops: detailRecords,
  gridPlanningOverlay: {
    outputPath: relative(gridPlanOutputPath),
    canvas: { width: PLANNING_WIDTH, height: PLANNING_HEIGHT },
    units: GRID_UNITS,
    anchors: planningAnchors,
    sourceToPlanningTransform: {
      scaleX: Number((PLANNING_WIDTH / WIDTH).toFixed(6)),
      scaleY: Number((PLANNING_HEIGHT / HEIGHT).toFixed(6)),
      planningOnly: true,
    },
    bakedIntoTerrain: false,
    coordinateAuthorityFrozen: false,
    note: "The overlay projects the 1536x1024 art-direction mockup onto the canonical 1600x900 grid for placement review. Final terrain art must be authored at exact world bounds before runtime coordinates are frozen.",
  },
};

await writeFile(
  join(MAP_ROOT, "open-basin-company-territories-manifest.json"),
  `${JSON.stringify(audit, null, 2)}\n`,
  "utf8",
);

console.log(
  `Built cohesive Open Basin map with ${records.length} normalized capitals at ${WIDTH}x${HEIGHT}.`,
);
