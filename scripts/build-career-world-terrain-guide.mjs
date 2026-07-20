import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import sharp from "sharp";
import { createServer } from "vite";

sharp.cache(false);
sharp.concurrency(1);

const ROOT = process.cwd();
const OUTPUT_SVG = resolve(
  ROOT,
  "design/career-world/plans/terrain-placement-guide.svg",
);
const OUTPUT_PNG = resolve(
  ROOT,
  "design/career-world/plans/terrain-placement-guide.png",
);
const OUTPUT_PREVIEW = resolve(
  ROOT,
  "design/career-world/plans/terrain-placement-preview.png",
);
const OUTPUT_COORDINATE_GRID = resolve(
  ROOT,
  "design/career-world/plans/terrain-coordinate-grid.png",
);
const OUTPUT_RUNTIME_PREVIEW = resolve(
  ROOT,
  "design/career-world/plans/terrain-runtime-placement-preview.png",
);
const WORLD_ART = resolve(
  ROOT,
  "public/career-world/art/world/career-world.webp",
);
const PALETTE_MANIFEST = resolve(
  ROOT,
  "public/career-world/art/runtime-palette-manifest.json",
);

const palette = Object.freeze({
  ninjaone: Object.freeze({ fill: "#3b8b9b", stroke: "#8ed9e5" }),
  tanium: Object.freeze({ fill: "#a9552d", stroke: "#ef9a68" }),
  independent: Object.freeze({ fill: "#704c89", stroke: "#c79de1" }),
  "ace-hardware": Object.freeze({ fill: "#9d3937", stroke: "#ef8580" }),
  "column-technologies": Object.freeze({ fill: "#4d7188", stroke: "#9bc4dc" }),
});

const marginByKind = Object.freeze({ capital: 18, project: 12, skill: 8 });

function instanceId(employerId, kind, id = "01") {
  if (kind === "capital") return `instance/${employerId}/capital/01`;
  return `instance/${employerId}/${kind}/${id}/01`;
}

function pathForProtectedPlot(placement) {
  const margin = marginByKind[placement.kind];
  const left = placement.position.x - placement.footprint.width / 2 - margin;
  const right = placement.position.x + placement.footprint.width / 2 + margin;
  const top = placement.position.y - placement.footprint.depth - margin;
  const bottom = placement.position.y + margin;
  const bevel = placement.kind === "capital" ? 16 : placement.kind === "project" ? 9 : 5;
  return [
    `M ${left + bevel} ${top}`,
    `L ${right - bevel} ${top}`,
    `L ${right} ${top + bevel}`,
    `L ${right} ${bottom - bevel}`,
    `L ${right - bevel} ${bottom}`,
    `L ${left + bevel} ${bottom}`,
    `L ${left} ${bottom - bevel}`,
    `L ${left} ${top + bevel}`,
    "Z",
  ].join(" ");
}

function pointString(point) {
  return `${Math.round(point.x)},${Math.round(point.y)}`;
}

function buildSvg({ scenePlacements, scenePlacementByInstanceId, worldZones }) {
  const point = (value) => {
    if (Array.isArray(value)) return { x: value[0], y: value[1] };
    const placement = scenePlacementByInstanceId.get(value);
    if (!placement) throw new Error(`Unknown route node ${value}`);
    return placement.position;
  };
  const capital = (employerId) => instanceId(employerId, "capital");
  const project = (employerId, projectId) =>
    instanceId(employerId, "project", projectId);
  const skill = (employerId, skillId) =>
    instanceId(employerId, "skill", skillId);

  const roads = [
    {
      employerId: "ninjaone",
      major: true,
      points: [
        [75, 365],
        project("ninjaone", "kaizen-agent-platform"),
        capital("ninjaone"),
        project("ninjaone", "vendy-vm-platform"),
        [620, 325],
      ],
    },
    {
      employerId: "ninjaone",
      major: true,
      points: [
        capital("ninjaone"),
        project("ninjaone", "engineering-metrics-pipeline"),
        skill("ninjaone", "aws"),
        skill("ninjaone", "postgresql"),
      ],
    },
    {
      employerId: "ninjaone",
      major: false,
      points: [
        project("ninjaone", "kaizen-agent-platform"),
        skill("ninjaone", "ai"),
        skill("ninjaone", "safe-writes"),
        skill("ninjaone", "data-contracts"),
        skill("ninjaone", "go"),
        skill("ninjaone", "redis"),
        skill("ninjaone", "mcp"),
        skill("ninjaone", "openapi"),
        skill("ninjaone", "workflow-orchestration"),
      ],
    },
    {
      employerId: "ninjaone",
      major: false,
      points: [
        project("ninjaone", "kaizen-agent-platform"),
        skill("ninjaone", "docker"),
        skill("ninjaone", "databricks"),
        skill("ninjaone", "python"),
        skill("ninjaone", "macstadium"),
        skill("ninjaone", "vmware"),
        skill("ninjaone", "postgresql"),
      ],
    },
    {
      employerId: "ninjaone",
      major: false,
      points: [
        project("ninjaone", "vendy-vm-platform"),
        skill("ninjaone", "operator-control"),
        skill("ninjaone", "react"),
        skill("ninjaone", "aws"),
      ],
    },
    {
      employerId: "tanium",
      major: true,
      points: [
        [520, 320],
        project("tanium", "tanium-risk-assessment"),
        capital("tanium"),
        project("tanium", "cablecar"),
        [1070, 305],
      ],
    },
    {
      employerId: "tanium",
      major: true,
      points: [
        project("tanium", "tanium-risk-assessment"),
        project("tanium", "uat-automation"),
        capital("tanium"),
        project("tanium", "tmatch-eolmatch"),
        skill("tanium", "manifest-v3"),
      ],
    },
    {
      employerId: "tanium",
      major: false,
      points: [
        project("tanium", "tanium-risk-assessment"),
        skill("tanium", "python"),
        skill("tanium", "go"),
        skill("tanium", "workflow-orchestration"),
        skill("tanium", "operator-control"),
        skill("tanium", "data-contracts"),
        skill("tanium", "csharp"),
        skill("tanium", "localdb"),
        skill("tanium", "react"),
      ],
    },
    {
      employerId: "tanium",
      major: false,
      points: [
        project("tanium", "cablecar"),
        project("tanium", "xsearch"),
        skill("tanium", "electron"),
        skill("tanium", "manifest-v3"),
      ],
    },
    {
      employerId: "independent",
      major: true,
      points: [
        [1000, 320],
        project("independent", "contextforge"),
        capital("independent"),
        project("independent", "career-world-portfolio"),
        [1540, 405],
      ],
    },
    {
      employerId: "independent",
      major: false,
      points: [
        project("independent", "contextforge"),
        skill("independent", "context-compression"),
        skill("independent", "workflow-orchestration"),
        skill("independent", "data-contracts"),
        skill("independent", "typescript"),
        skill("independent", "react"),
      ],
    },
    {
      employerId: "independent",
      major: false,
      points: [
        project("independent", "contextforge"),
        skill("independent", "operator-control"),
      ],
    },
    {
      employerId: "ace-hardware",
      major: true,
      points: [
        [470, 600],
        project("ace-hardware", "sap-table-update-integration"),
        capital("ace-hardware"),
        project("ace-hardware", "ticket-validation-automation"),
      ],
    },
    {
      employerId: "ace-hardware",
      major: true,
      points: [
        capital("ace-hardware"),
        project("ace-hardware", "qc-alm-extractor"),
      ],
    },
    {
      employerId: "ace-hardware",
      major: false,
      points: [
        project("ace-hardware", "ticket-validation-automation"),
        skill("ace-hardware", "informatica"),
      ],
    },
    {
      employerId: "column-technologies",
      major: true,
      points: [
        [1110, 600],
        skill("column-technologies", "ci-cd"),
        project("column-technologies", "atlassian-platform-automation"),
        capital("column-technologies"),
        project("column-technologies", "atlassian-data-center-resilience"),
      ],
    },
    {
      employerId: "column-technologies",
      major: true,
      points: [
        capital("column-technologies"),
        project("column-technologies", "client-devops-delivery-implementations"),
        skill("column-technologies", "docker"),
      ],
    },
    {
      employerId: "column-technologies",
      major: false,
      points: [
        project("column-technologies", "atlassian-platform-automation"),
        skill("column-technologies", "atlassian"),
      ],
    },
  ];

  const zoneGuidePaths = Object.freeze({
    ninjaone:
      "M 75 365 L 95 225 L 180 135 L 330 110 L 500 140 L 620 245 L 610 425 L 540 565 L 360 610 L 185 575 L 80 485 Z",
    tanium:
      "M 515 330 L 550 180 L 690 90 L 900 95 L 1045 180 L 1080 345 L 1025 500 L 880 590 L 670 570 L 535 475 Z",
    independent:
      "M 995 330 L 1040 200 L 1200 120 L 1400 135 L 1535 245 L 1550 400 L 1460 545 L 1280 590 L 1100 540 L 1005 445 Z",
    "ace-hardware":
      "M 70 745 L 115 640 L 260 600 L 440 610 L 590 680 L 640 800 L 560 880 L 380 900 L 190 880 L 75 820 Z",
    "column-technologies":
      "M 955 750 L 1010 645 L 1160 600 L 1340 610 L 1495 675 L 1545 795 L 1470 880 L 1290 900 L 1100 880 L 970 825 Z",
  });

  const landPaths = [
    "M 40 285 C 80 145 220 70 410 55 C 600 25 720 55 850 40 C 1015 20 1160 70 1280 65 C 1460 55 1560 155 1570 300 C 1585 430 1490 535 1340 575 C 1180 615 1050 570 900 600 C 740 630 610 580 475 600 C 300 625 150 555 70 450 C 30 395 20 340 40 285 Z",
    "M 60 735 C 75 620 205 575 355 590 C 520 580 635 660 645 785 C 650 875 520 900 350 898 C 175 900 45 855 60 735 Z",
    "M 950 745 C 970 620 1090 580 1260 590 C 1435 585 1550 665 1555 785 C 1560 875 1430 900 1250 898 C 1070 900 940 855 950 745 Z",
  ];

  const landscape = [
    '<path d="M 120 145 C 260 75 430 80 575 145" class="ridge"/>',
    '<path d="M 610 120 C 760 55 930 65 1035 130" class="ridge"/>',
    '<path d="M 1080 145 C 1260 70 1440 105 1510 185" class="ridge"/>',
    '<path d="M 90 470 C 170 525 250 560 330 575" class="ravine"/>',
    '<path d="M 575 430 C 645 520 745 550 825 560" class="quarry"/>',
    '<path d="M 1080 500 C 1170 545 1260 560 1350 535" class="ravine"/>',
    '<path d="M 120 660 C 220 620 300 620 390 650" class="forest"/>',
    '<path d="M 1030 675 C 1140 620 1260 625 1360 660" class="quarry"/>',
  ];

  const zoneLayers = worldZones
    .map((zone) => {
      const colors = palette[zone.id];
      return `<path d="${zoneGuidePaths[zone.id]}" fill="${colors.fill}" fill-opacity="0.12" stroke="${colors.stroke}" stroke-opacity="0.45" stroke-width="2" stroke-dasharray="10 9"/>`;
    })
    .join("\n");

  const roadLayers = roads
    .map((road) => {
      const colors = palette[road.employerId];
      return `<polyline points="${road.points.map((value) => pointString(point(value))).join(" ")}" fill="none" stroke="${colors.stroke}" stroke-opacity="${road.major ? 0.85 : 0.55}" stroke-width="${road.major ? 5 : 2.5}" stroke-linecap="round" stroke-linejoin="round" ${road.major ? "" : 'stroke-dasharray="7 6"'}/>`;
    })
    .join("\n");

  const plotLayers = [...scenePlacements]
    .sort((left, right) => left.position.y - right.position.y)
    .map((placement) => {
      const colors = palette[placement.employerId];
      const opacity =
        placement.kind === "capital" ? 0.78 : placement.kind === "project" ? 0.58 : 0.38;
      const strokeWidth = placement.kind === "capital" ? 3 : placement.kind === "project" ? 2 : 1.25;
      return `<path data-instance-id="${placement.instanceId}" data-kind="${placement.kind}" d="${pathForProtectedPlot(placement)}" fill="${colors.fill}" fill-opacity="${opacity}" stroke="${colors.stroke}" stroke-width="${strokeWidth}"/>\n<circle cx="${placement.position.x}" cy="${placement.position.y}" r="${placement.kind === "capital" ? 5 : 2.5}" fill="#ffffff"/>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <title>Career World exact terrain placement guide</title>
  <desc>Colored shapes are protected terrain plots. White dots are bottom-center ground anchors. Guide color must not be baked into final terrain.</desc>
  <rect width="1600" height="900" fill="#050b14"/>
  <g fill="#111b29" stroke="#718092" stroke-width="2">
    ${landPaths.map((path) => `<path d="${path}"/>`).join("\n")}
  </g>
  <g class="zone-hulls">${zoneLayers}</g>
  <g class="landscape-reserves" fill="none" stroke="#667689" stroke-width="7" stroke-opacity="0.55" stroke-linecap="round" stroke-dasharray="2 14">
    ${landscape.join("\n")}
  </g>
  <g class="roads">${roadLayers}</g>
  <g class="protected-plots">${plotLayers}</g>
</svg>`;
}

async function main() {
  const vite = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });
  try {
    const composition = await vite.ssrLoadModule(
      "/features/career-world/model/scene-composition.ts",
    );
    const paletteManifest = JSON.parse(
      await readFile(PALETTE_MANIFEST, "utf8"),
    );
    const paletteRecordByInstanceId = new Map(
      paletteManifest.records.map((record) => [record.instance_id, record]),
    );
    const svg = buildSvg(composition);
    await mkdir(dirname(OUTPUT_SVG), { recursive: true });
    await writeFile(OUTPUT_SVG, svg, "utf8");
    const guidePng = await sharp(Buffer.from(svg)).png().toBuffer();
    await writeFile(OUTPUT_PNG, guidePng);

    const composites = [];
    for (const placement of [...composition.scenePlacements].sort(
      (left, right) => left.position.y - right.position.y,
    )) {
      const record = paletteRecordByInstanceId.get(placement.instanceId);
      if (!record) throw new Error(`Missing palette record ${placement.instanceId}`);
      const width = Math.round(placement.visualWidth);
      const height = Math.round(
        width * (record.output.height / record.output.width),
      );
      const input = await sharp(resolve(ROOT, record.file_path))
        .resize({ width, height, fit: "fill" })
        .png()
        .toBuffer();
      composites.push({
        input,
        left: Math.round(
          placement.position.x - width * placement.groundAnchor.x,
        ),
        top: Math.round(
          placement.position.y - height * placement.groundAnchor.y,
        ),
      });
    }
    await sharp(guidePng)
      .composite(composites)
      .png()
      .toFile(OUTPUT_PREVIEW);
    await sharp(WORLD_ART)
      .composite(composites)
      .png()
      .toFile(OUTPUT_RUNTIME_PREVIEW);

    const gridLines = [];
    const gridLabels = [];
    for (let x = 0; x <= 1600; x += 50) {
      const major = x % 100 === 0;
      gridLines.push(
        `<path d="M ${x} 0 V 900" stroke="${major ? "#f3d67a" : "#80c9d5"}" stroke-opacity="${major ? 0.46 : 0.2}" stroke-width="${major ? 1.5 : 1}"/>`,
      );
      if (major && x > 0 && x < 1600) {
        gridLabels.push(`<text x="${x + 5}" y="18">${x}</text>`);
      }
    }
    for (let y = 0; y <= 900; y += 50) {
      const major = y % 100 === 0;
      gridLines.push(
        `<path d="M 0 ${y} H 1600" stroke="${major ? "#f3d67a" : "#80c9d5"}" stroke-opacity="${major ? 0.46 : 0.2}" stroke-width="${major ? 1.5 : 1}"/>`,
      );
      if (major && y > 0 && y < 900) {
        gridLabels.push(`<text x="5" y="${y - 5}">${y}</text>`);
      }
    }
    const coordinateGrid = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><g>${gridLines.join("")}</g><g fill="#fff4b0" stroke="#020812" stroke-width="3" paint-order="stroke" font-family="monospace" font-size="15">${gridLabels.join("")}</g></svg>`;
    await sharp(WORLD_ART)
      .composite([{ input: Buffer.from(coordinateGrid), left: 0, top: 0 }])
      .png()
      .toFile(OUTPUT_COORDINATE_GRID);
    const coordinateCrops = {
      ninjaone: { left: 50, top: 100, width: 600, height: 480 },
      tanium: { left: 500, top: 80, width: 600, height: 500 },
      independent: { left: 980, top: 100, width: 570, height: 450 },
      "ace-hardware": { left: 50, top: 570, width: 600, height: 280 },
      "column-technologies": { left: 920, top: 560, width: 620, height: 300 },
    };
    for (const [employerId, crop] of Object.entries(coordinateCrops)) {
      await sharp(OUTPUT_COORDINATE_GRID)
        .extract(crop)
        .resize({ width: crop.width * 2, height: crop.height * 2 })
        .png()
        .toFile(
          resolve(
            ROOT,
            `design/career-world/plans/terrain-coordinate-${employerId}.png`,
          ),
        );
    }
    process.stdout.write(
      JSON.stringify(
        {
          width: 1600,
          height: 900,
          placements: composition.scenePlacements.length,
          svg: OUTPUT_SVG,
          guide: OUTPUT_PNG,
          preview: OUTPUT_PREVIEW,
          runtimePreview: OUTPUT_RUNTIME_PREVIEW,
          coordinateGrid: OUTPUT_COORDINATE_GRID,
        },
        null,
        2,
      ),
    );
  } finally {
    await vite.close();
  }
}

await main();
