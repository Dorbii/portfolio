import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

sharp.cache(false);
sharp.concurrency(1);

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MAP_ROOT = join(ROOT, "design", "career-world", "world-map-mockups");
const CONCEPT_ROOT = join(MAP_ROOT, "concepts");
const SPRITE_ROOT = join(ROOT, "design", "career-world", "rendered-cities", "sprites");
const AUDIT_ROOT = join(MAP_ROOT, "audit");

const cityWidths = Object.freeze({
  ninjaone: 132,
  tanium: 112,
  independent: 108,
  "column-technologies": 112,
  "ace-hardware": 100,
});

const options = [
  {
    id: "open-basin",
    label: "Open Basin",
    summary: "Maximum separation with three explicit continental lowlands and two cove islands.",
    input: "open-basin-terrain-r1.png",
    placements: [
      { cityId: "ninjaone", x: 865, y: 330, region: "northeast continental plain" },
      { cityId: "tanium", x: 845, y: 535, region: "southeast river terrace" },
      { cityId: "independent", x: 380, y: 590, region: "southwest continental plain" },
      { cityId: "column-technologies", x: 1245, y: 695, region: "large eastern cove island" },
      { cityId: "ace-hardware", x: 850, y: 870, region: "small southern cove island" },
    ],
  },
  {
    id: "broken-crescent",
    label: "Broken Crescent",
    summary: "Organic territories around an interior gulf with an elongated island and a lagoon island.",
    input: "broken-crescent-terrain-r1.png",
    placements: [
      { cityId: "ninjaone", x: 690, y: 185, region: "northern crescent plain" },
      { cityId: "tanium", x: 440, y: 475, region: "western interior river terrace" },
      { cityId: "independent", x: 705, y: 755, region: "southern crescent plain" },
      { cityId: "column-technologies", x: 1180, y: 420, region: "elongated eastern island" },
      { cityId: "ace-hardware", x: 1340, y: 850, region: "southern lagoon island" },
    ],
  },
  {
    id: "twin-deltas",
    label: "Twin Deltas",
    summary: "Widest future expansion shelves with opposing deltas and two large low islands.",
    input: "twin-deltas-terrain-r1.png",
    placements: [
      { cityId: "ninjaone", x: 1080, y: 250, region: "northeast continental shelf" },
      { cityId: "tanium", x: 360, y: 310, region: "western river shelf" },
      { cityId: "independent", x: 805, y: 520, region: "south-central foothill plain" },
      { cityId: "column-technologies", x: 620, y: 820, region: "shield-shaped southern island" },
      { cityId: "ace-hardware", x: 1270, y: 780, region: "teardrop southeast island" },
    ],
  },
];

const cityLabels = Object.freeze({
  ninjaone: "NinjaOne",
  tanium: "Tanium",
  independent: "Independent",
  "column-technologies": "Column Technologies",
  "ace-hardware": "ACE Hardware",
});

function xml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function spritePath(cityId) {
  return join(SPRITE_ROOT, `city--${cityId}.webp`);
}

function padSvg(placements) {
  const shapes = placements.map((placement) => {
    const width = cityWidths[placement.cityId];
    const padWidth = width * 0.9;
    const padDepth = width * 0.28;
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

async function grayscaleAudit(path) {
  const { data, info } = await sharp(path)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let maxRgbChannelDelta = 0;
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    maxRgbChannelDelta = Math.max(
      maxRgbChannelDelta,
      Math.abs(red - green),
      Math.abs(red - blue),
      Math.abs(green - blue),
    );
  }
  return { maxRgbChannelDelta, exactNeutralGrayscale: maxRgbChannelDelta === 0 };
}

async function renderOption(option) {
  const inputPath = join(CONCEPT_ROOT, option.input);
  const outputPath = join(CONCEPT_ROOT, `${option.id}-capitals-r1.png`);
  const spriteComposites = [];
  const placementRecords = [];
  for (const placement of option.placements.toSorted((left, right) => left.y - right.y)) {
    const width = cityWidths[placement.cityId];
    const path = spritePath(placement.cityId);
    const { data, info } = await sharp(path)
      .resize({ width, fit: "inside", kernel: sharp.kernel.lanczos3 })
      .greyscale()
      .png()
      .toBuffer({ resolveWithObject: true });
    const left = Math.round(placement.x - info.width / 2);
    const top = Math.round(placement.y - info.height + 12);
    if (left < 0 || top < 0 || left + info.width > 1536 || top + info.height > 1024) {
      throw new Error(`Capital ${placement.cityId} clips in ${option.id}`);
    }
    spriteComposites.push({ input: data, left, top });
    placementRecords.push({
      ...placement,
      label: cityLabels[placement.cityId],
      width,
      renderedWidth: info.width,
      renderedHeight: info.height,
      left,
      top,
      spritePath: path.slice(ROOT.length + 1).replaceAll("\\", "/"),
    });
  }
  const base = await sharp(inputPath).greyscale().png().toBuffer();
  await sharp(base)
    .composite([{ input: padSvg(option.placements), left: 0, top: 0 }, ...spriteComposites])
    .greyscale()
    .png()
    .toFile(outputPath);
  return {
    id: option.id,
    label: option.label,
    summary: option.summary,
    inputPath: inputPath.slice(ROOT.length + 1).replaceAll("\\", "/"),
    outputPath: outputPath.slice(ROOT.length + 1).replaceAll("\\", "/"),
    grayscaleAudit: await grayscaleAudit(outputPath),
    capitalCount: placementRecords.length,
    ruggedIslandCapitalCount: 0,
    placements: placementRecords,
  };
}

async function buildContactSheet(records) {
  const cellWidth = 790;
  const cellHeight = 590;
  const composites = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const column = index % 2;
    const row = Math.floor(index / 2);
    const left = column * cellWidth + 24;
    const top = row * cellHeight + 64;
    const image = await sharp(resolve(ROOT, record.outputPath))
      .resize({ width: 742, height: 494, fit: "contain", background: "#080808" })
      .png()
      .toBuffer();
    composites.push({ input: image, left, top });
    composites.push({
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="742" height="54"><rect width="742" height="54" rx="8" fill="#111111"/><text x="14" y="23" fill="#f0f0f0" font-family="Segoe UI,Arial,sans-serif" font-size="18" font-weight="700">${xml(
          record.label,
        )}</text><text x="14" y="42" fill="#a0a0a0" font-family="Segoe UI,Arial,sans-serif" font-size="11">${xml(
          record.summary,
        )}</text></svg>`,
      ),
      left,
      top: row * cellHeight + 6,
    });
  }
  const outputPath = join(AUDIT_ROOT, "world-map-options-capitals-contact-sheet.png");
  await sharp({
    create: {
      width: cellWidth * 2,
      height: cellHeight * 2,
      channels: 3,
      background: "#080808",
    },
  })
    .composite(composites)
    .png()
    .toFile(outputPath);
  return outputPath;
}

function buildIndex(records) {
  const selectedPlacements = [
    ["NinjaOne", "largest northeast relay plateau"],
    ["Tanium", "southeast inspection escarpment; vertical T skyscraper"],
    ["Independent", "smaller southwest maker peninsula"],
    ["Column Technologies", "engineered eastern harbor island"],
    ["ACE Hardware", "forested southern workshop-cove island"],
  ]
    .map(([label, region]) => `<li><strong>${xml(label)}</strong><span>${xml(region)}</span></li>`)
    .join("");
  const selectedDetails = [
    ["ninjaone", "NinjaOne relay plateau"],
    ["tanium", "Tanium inspection escarpment"],
    ["independent", "Independent maker peninsula"],
    ["column-technologies", "Column engineered harbor"],
    ["ace-hardware", "ACE forest workshop cove"],
  ]
    .map(
      ([id, label]) =>
        `<figure><img src="./audit/open-basin-territory-${id}-r1.png" alt="${xml(label)} detail"><figcaption>${xml(label)}</figcaption></figure>`,
    )
    .join("");
  const cards = records
    .map((record) => {
      const placements = record.placements
        .map(
          (placement) =>
            `<li><strong>${xml(placement.label)}</strong><span>${xml(placement.region)}</span></li>`,
        )
        .join("");
      return `<article><h2>${xml(record.label)}</h2><p>${xml(record.summary)}</p><img src="./concepts/${record.id}-capitals-r1.png" alt="${xml(
        record.label,
      )} Career World map option with five capital placements"><ol class="placements">${placements}</ol></article>`;
    })
    .join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Career World geography options</title><style>html{background:#080808;color:#f0f0f0;font-family:Inter,Segoe UI,sans-serif}body{margin:0;padding:28px}header{max-width:980px;margin:0 auto 24px}p{color:#aaa;line-height:1.45}.selected{max-width:1536px;margin:0 auto 36px;background:#111;border:1px solid #4b4b4b;border-radius:14px;overflow:hidden}.selected h2,.selected>p{margin-left:18px;margin-right:18px}.selected .hero{display:block;width:100%;height:auto;background:#050505}.grid-plan{margin:0;border-top:1px solid #303b3d;border-bottom:1px solid #303b3d;background:#071014}.grid-plan img{width:100%;height:auto}.grid-plan figcaption{padding:10px 16px;color:#a8c9cb;font-size:11px}.section-title{max-width:1536px;margin:0 auto 14px}.grid{max-width:1536px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(560px,1fr));gap:20px}article{background:#111;border:1px solid #333;border-radius:14px;overflow:hidden}h2,article p{margin-left:16px;margin-right:16px}h2{font-size:18px;margin-bottom:4px}article p{font-size:12px;margin-top:0}img{display:block;width:100%;height:auto;background:#050505}.placements{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px 16px;margin:0;padding:16px;list-style:none;border-top:1px solid #292929}.placements li{display:flex;flex-direction:column;gap:2px;font-size:12px}.placements span{color:#929292;font-size:11px}.territory-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1px;background:#303030;border-top:1px solid #303030}.territory-grid figure{margin:0;background:#0b0b0b}.territory-grid img{aspect-ratio:4/3;object-fit:cover}.territory-grid figcaption{padding:9px 12px;color:#c8c8c8;font-size:11px}</style></head><body><header><h1>Career World geography review</h1><p>The selected Open Basin revision now uses company-specific terrain, evidence-sized territories, a vertical Tanium T skyscraper, a forest-dominant ACE island, and overview-specific capital scaling. No project or skill buildings are placed.</p></header><section class="selected"><h2>Selected direction — Open Basin company territories</h2><p>One orthographic-isometric camera, one grayscale value language, nominal 68px capital footprints, and distinct geography rather than separate rendering styles.</p><img class="hero" src="./concepts/open-basin-company-territories-capitals-r1.png" alt="Selected cohesive Open Basin map with five company capital placements"><figure class="grid-plan"><img src="./audit/open-basin-company-territories-grid-plan-r1.png" alt="Canonical 1600 by 900 planning grid projected over the selected Open Basin concept"><figcaption>Planning/debug overlay — canonical 1600×900 world plane with 20-unit minor, 50-unit midpoint, and 100-unit major lines. This grid is not baked into the terrain, and the projected art is not yet coordinate authority.</figcaption></figure><ol class="placements">${selectedPlacements}</ol><div class="territory-grid">${selectedDetails}</div></section><h2 class="section-title">Earlier geography comparisons</h2><main class="grid">${cards}</main></body></html>\n`;
}

await mkdir(AUDIT_ROOT, { recursive: true });
const records = [];
for (const option of options) records.push(await renderOption(option));
if (records.some((record) => !record.grayscaleAudit.exactNeutralGrayscale)) {
  throw new Error("A world option is not exact neutral grayscale");
}
const contactSheetPath = await buildContactSheet(records);
await writeFile(join(MAP_ROOT, "index.html"), buildIndex(records), "utf8");
await writeFile(
  join(MAP_ROOT, "world-map-options-manifest.json"),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      contract: {
        options: records.length,
        mainContinentsPerOption: 1,
        detachedIslandsPerOption: 3,
        ruggedUnoccupiedIslandsPerOption: 1,
        buildableCityIslandsPerOption: 2,
        continentCapitalsPerOption: 3,
        islandCapitalsPerOption: 2,
        projectAndSkillBuildingsPlaced: 0,
      },
      contactSheetPath: contactSheetPath.slice(ROOT.length + 1).replaceAll("\\", "/"),
      records,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  `Built ${records.length} world-map options with five locked capitals each and exact neutral grayscale.`,
);
