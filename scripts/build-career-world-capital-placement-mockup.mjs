import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

sharp.cache(false);
sharp.concurrency(1);

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MOCKUP_ROOT = join(ROOT, "design", "career-world", "world-map-mockups");
const SPRITE_ROOT = join(ROOT, "design", "career-world", "rendered-cities", "sprites");
const INPUT_PATH = join(MOCKUP_ROOT, "career-world-continent-three-islands-r2.png");
const OUTPUT_PATH = join(MOCKUP_ROOT, "career-world-capital-placement-r3.png");
const MANIFEST_PATH = join(MOCKUP_ROOT, "career-world-capital-placement-r3.json");

const placements = [
  {
    cityId: "ninjaone",
    label: "NinjaOne",
    region: "main-continent-northeast-plateau",
    x: 760,
    y: 190,
    width: 132,
    rationale: "Largest uninterrupted plateau, with room for the largest radial territory and future outer districts.",
  },
  {
    cityId: "tanium",
    label: "Tanium",
    region: "main-continent-southeast-river-terraces",
    x: 735,
    y: 535,
    width: 112,
    rationale: "Long river-facing terraces support an elongated inspection territory without sharing NinjaOne's plateau.",
  },
  {
    cityId: "independent",
    label: "Independent",
    region: "main-continent-southwest-coastal-plain",
    x: 330,
    y: 715,
    width: 108,
    rationale: "Separated coastal plain and peninsula provide an asymmetric maker region with room to expand inland.",
  },
  {
    cityId: "column-technologies",
    label: "Column Technologies",
    region: "large-southeast-low-island",
    x: 1235,
    y: 720,
    width: 112,
    rationale: "Broad low island with edge ridges and natural coves can hold the larger engineered harbor territory.",
  },
  {
    cityId: "ace-hardware",
    label: "ACE Hardware",
    region: "small-southern-low-island",
    x: 895,
    y: 875,
    width: 100,
    rationale: "Smallest buildable island matches the compact workshop-cove territory while remaining separate from Column.",
  },
];

function spritePath(cityId) {
  return join(SPRITE_ROOT, `city--${cityId}.webp`);
}

function padSvg() {
  const shapes = placements.map((placement) => {
    const padWidth = placement.width * 0.9;
    const padDepth = placement.width * 0.28;
    const { x, y } = placement;
    const points = `${x} ${y - padDepth / 2}, ${x + padWidth / 2} ${y}, ${x} ${
      y + padDepth / 2
    }, ${x - padWidth / 2} ${y}`;
    return `<ellipse cx="${x}" cy="${y + 5}" rx="${padWidth * 0.34}" ry="${
      padDepth * 0.28
    }" fill="#000000" fill-opacity="0.45"/><polygon points="${points}" fill="#292929" fill-opacity="0.88" stroke="#a0a0a0" stroke-opacity="0.78" stroke-width="1.4"/>`;
  });
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024">${shapes.join(
      "",
    )}</svg>`,
  );
}

const spriteComposites = [];
const placementRecords = [];
for (const placement of placements.toSorted((left, right) => left.y - right.y)) {
  const path = spritePath(placement.cityId);
  const { data, info } = await sharp(path)
    .resize({ width: placement.width, fit: "inside", kernel: sharp.kernel.lanczos3 })
    .greyscale()
    .png()
    .toBuffer({ resolveWithObject: true });
  const left = Math.round(placement.x - info.width / 2);
  const top = Math.round(placement.y - info.height + 12);
  spriteComposites.push({ input: data, left, top });
  placementRecords.push({
    ...placement,
    spritePath: path.slice(ROOT.length + 1).replaceAll("\\", "/"),
    renderedWidth: info.width,
    renderedHeight: info.height,
    left,
    top,
  });
}

const base = await sharp(INPUT_PATH).greyscale().png().toBuffer();
await sharp(base)
  .composite([{ input: padSvg(), left: 0, top: 0 }, ...spriteComposites])
  .greyscale()
  .png()
  .toFile(OUTPUT_PATH);

const { data: auditPixels, info: auditInfo } = await sharp(OUTPUT_PATH)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
let maxRgbChannelDelta = 0;
for (let offset = 0; offset < auditPixels.length; offset += auditInfo.channels) {
  const red = auditPixels[offset];
  const green = auditPixels[offset + 1];
  const blue = auditPixels[offset + 2];
  maxRgbChannelDelta = Math.max(
    maxRgbChannelDelta,
    Math.abs(red - green),
    Math.abs(red - blue),
    Math.abs(green - blue),
  );
}

await writeFile(
  MANIFEST_PATH,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      inputMap: INPUT_PATH.slice(ROOT.length + 1).replaceAll("\\", "/"),
      outputMap: OUTPUT_PATH.slice(ROOT.length + 1).replaceAll("\\", "/"),
      mapContract: {
        mainContinent: 1,
        detachedIslands: 3,
        cityCapitals: 5,
        ruggedIslandCapitalCount: 0,
        continentCapitalCount: 3,
        buildableIslandCapitalCount: 2,
      },
      grayscaleAudit: {
        maxRgbChannelDelta,
        exactNeutralGrayscale: maxRgbChannelDelta === 0,
      },
      placements: placementRecords,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  `Built capital placement mockup with ${placementRecords.length} locked capitals; rugged island remains unoccupied; max RGB delta ${maxRgbChannelDelta}.`,
);
