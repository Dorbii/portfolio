import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import {
  auditKaizenTownTopography,
  auditTownSurfaces,
} from "../scripts/audit-career-world-town-surfaces.mjs";

const root = process.cwd();
const layerPath = path.join(
  root,
  "features/career-world/layers/infrastructure/components/"
    + "InfrastructureLayer.tsx",
);
const integrationPath = path.join(
  root,
  "features/career-world/layers/infrastructure/components/"
    + "KaizenGroundIntegration.tsx",
);
const districtFabricComponentPath = path.join(
  root,
  "features/career-world/layers/infrastructure/components/"
    + "TownDistrictFabric.tsx",
);
const districtFabricModelPath = path.join(
  root,
  "features/career-world/layers/infrastructure/model/"
    + "districtFabric.ts",
);

test("town hardscape stays sparse and clear of persistent building pixels", async () => {
  const reports = await auditTownSurfaces();
  const kaizenReport = reports.find(
    ({ id }) => id === "kaizen-agent-town-fabric",
  );

  assert.equal(reports.length, 4);
  assert.ok(kaizenReport);
  assert.equal(kaizenReport.structureRepresentation, "individual-sprites");
  assert.equal(
    kaizenReport.auditedBuildingSurface,
    "roads-including-registered-entrances",
  );
  assert.equal(kaizenReport.buildingContactPixels, 0);
  assert.equal(
    kaizenReport.connectedEntranceCount,
    kaizenReport.registeredEntranceCount,
    "Every Kaizen entrance must meet a rendered road without crossing sprite art.",
  );
  assert.deepEqual(kaizenReport.disconnectedEntrances, []);
  assert.equal(
    kaizenReport.pedestrianLoopOffRoadSamples,
    0,
    "The Kaizen pedestrian loop must stay on the visible road network.",
  );
  assert.deepEqual(kaizenReport.buildingOverlapByStructure, []);
  for (const report of reports) {
    assert.ok(
      report.totalSurfaceCoverage <= 0.08,
      `${report.id} covers too much of its envelope with road or plaza surfaces`,
    );
    assert.ok(
      report.hardscapeCoverage <= 0.04,
      `${report.id} has regressed toward blanket stone hardscape`,
    );
    assert.equal(
      report.buildingOverlapPixels,
      0,
      `${report.id} paints road or plaza pixels beneath authored buildings`,
    );
    assert.equal(report.buildingOverlapRatio, 0);
  }
});

test("Kaizen roads and structure sites stay on buildable topography", async () => {
  const report = await auditKaizenTownTopography();
  const project = report.structures.find(
    ({ id }) => id === "project-kaizen-agent",
  );

  assert.equal(report.ownerId, "project-kaizen-agent");
  assert.ok(project);
  assert.ok(
    report.maximumRoadSlope <= 96,
    `Kaizen road edge reaches slope ${report.maximumRoadSlope}`,
  );
  assert.ok(
    report.maximumStreetHeightRange <= 14,
    `Kaizen road crosses a height range of ${report.maximumStreetHeightRange}`,
  );
  assert.ok(
    report.maximumStructureSlope <= 96,
    `Kaizen structure pad reaches slope ${report.maximumStructureSlope}`,
  );
  assert.ok(
    report.maximumStructureHeightRange <= 14,
    `Kaizen structure pad spans ${report.maximumStructureHeightRange} height units`,
  );
  assert.equal(project.maximumSlope, 0);
  assert.equal(project.heightRange, 0);
});

test("town rendering preserves terrain and gives Kaizen a feathered district material", async () => {
  const [layer, integration, districtComponent, districtModel] =
  await Promise.all([
    readFile(layerPath, "utf8"),
    readFile(integrationPath, "utf8"),
    readFile(districtFabricComponentPath, "utf8"),
    readFile(districtFabricModelPath, "utf8"),
  ]);
  const groundSurfaceStart = layer.indexOf(
    "function TownPlanGroundSurface(",
  );
  const groundSurfaceEnd = layer.indexOf(
    "\nfunction TownPlanStreetGroup(",
    groundSurfaceStart,
  );
  const groundSurface = layer.slice(groundSurfaceStart, groundSurfaceEnd);

  assert.ok(groundSurfaceStart >= 0);
  assert.ok(groundSurfaceEnd > groundSurfaceStart);
  assert.match(groundSurface, /isKaizenAgentTown/);
  assert.match(groundSurface, /"feathered-authored-blocks-and-plazas"/);
  assert.match(groundSurface, /"plazas-only"/);
  assert.match(layer, /data-paved-block-count=\{0\}/);
  assert.match(groundSurface, /plan\.blocks\.map/);
  assert.match(groundSurface, /<feGaussianBlur stdDeviation=\{1\.8\}/);
  assert.match(
    layer,
    /TOWN_GROUND_MATERIAL_SRC =\s*[\s\S]*town-ground-r1\.webp/,
  );
  assert.match(
    layer,
    /KAIZEN_AGENT_GROUND_MATERIAL_SRC =\s*[\s\S]*heroic-city-ground-r1\.png/,
  );
  assert.match(
    layer,
    /KAIZEN_AGENT_ROAD_MATERIAL_SRC =\s*[\s\S]*road-setts-r1\.png/,
  );
  assert.match(
    layer,
    /KAIZEN_AGENT_EARTH_ROAD_MATERIAL_SRC =\s*[\s\S]*packed-earth-road-r2\.png/,
  );
  assert.match(layer, /data-road-grammar="hierarchical-mixed-surface"/);
  assert.match(
    layer,
    /"streets-by-hierarchy-with-three-layer-junction-caps"/,
  );
  assert.match(layer, /<TownPlanRoadJunctions/);
  assert.match(layer, /town-plan__road-junction-edge-cap/);
  assert.match(layer, /town-plan__road-junction-bed-cap/);
  assert.match(layer, /data-road-detail=\{[\s\S]*"textured-all-surfaces"/);
  assert.match(
    layer,
    /family === "stone"[\s\S]*url\(#\$\{patternId\}\)[\s\S]*texturedSurface[\s\S]*url\(#\$\{earthPatternId\}\)/,
  );
  assert.match(layer, /const KAIZEN_AGENT_GROUND_PATTERN_SIZE = 46;/);
  assert.match(layer, /const KAIZEN_AGENT_ROAD_PATTERN_SIZE = 20;/);
  assert.match(
    layer,
    /KAIZEN_AGENT_PLAZA_VISUAL_SCALE[\s\S]*"project-forecourt": 0\.55/,
  );
  assert.match(
    layer,
    /const KAIZEN_AGENT_EARTH_ROAD_PATTERN_SIZE = 14;/,
  );
  assert.match(layer, /<KaizenGroundIntegration sites=\{KAIZEN_AGENT_STRUCTURE_PADS\}/);
  assert.match(layer, /<TownDistrictFabric/);
  assert.match(layer, /phaseId="district-fabrics"/);
  assert.ok(
    layer.indexOf('phaseId="district-fabrics"')
      > layer.indexOf('phaseId="ground-surfaces"'),
    "district fabric must sit above the authored terrain material",
  );
  assert.ok(
    layer.indexOf('phaseId="district-fabrics"')
      < layer.indexOf('phaseId="road-networks"'),
    "roads must remain continuous above district parcel treatments",
  );
  assert.match(
    districtComponent,
    /data-district-fabric-renderer="shared-procedural-svg"/,
  );
  assert.match(
    districtComponent,
    /data-railway-payload="procedural-svg"/,
  );
  assert.match(districtComponent, /data-detail-lod="close"/);
  assert.match(
    districtModel,
    /kaizen-agent-heroic-fantasy-district-fabric-r1/,
  );
  assert.doesNotMatch(
    districtComponent + districtModel,
    /\.(?:avif|png|webp)/,
    "shared district fabric must not add per-city raster payload",
  );
  assert.ok(
    layer.indexOf('phaseId="structure-interfaces"')
      > layer.indexOf('phaseId="road-networks"'),
    "building aprons must resolve above roads so streets terminate beneath "
      + "authored foundations instead of cutting across them",
  );
  assert.doesNotMatch(groundSurface, /<ellipse/);
  assert.match(
    integration,
    /data-ground-integration="authored-archetype-aprons"/,
  );
  assert.match(
    integration,
    /data-ground-integration-sizing="visible-building-width"/,
  );
  assert.match(integration, /sites\.map/);
  assert.match(
    groundSurface,
    /family === "stone"[\s\S]*plazaPatternId[\s\S]*patternId/,
  );
  assert.match(layer, /data-road-lod=\{primary \? "site" : "close"\}/);
  assert.match(
    layer,
    /family === "stone"[\s\S]*palette\.earth/,
  );
  assert.match(
    layer,
    /ownerId === KAIZEN_AGENT_TOWN_OWNER_ID[\s\S]*Math\.max\([\s\S]*closeVisibility,[\s\S]*infrastructureVisibility/,
  );
});

test("every Kaizen structure archetype owns a transparent irregular site apron", async () => {
  const [integration, layer] = await Promise.all([
    readFile(integrationPath, "utf8"),
    readFile(layerPath, "utf8"),
  ]);
  const assetPaths = [
    "/career-world/layers/infrastructure/textures/kaizen-agent/"
      + "integration/civic-foundation-apron-r1.png",
    "/career-world/layers/infrastructure/textures/kaizen-agent/"
      + "integration/sites-r1/artisan-rowhouse-apron-r1.png",
    "/career-world/layers/infrastructure/textures/kaizen-agent/"
      + "integration/sites-r1/cargo-depot-apron-r1.png",
    "/career-world/layers/infrastructure/textures/kaizen-agent/"
      + "integration/sites-r1/carriage-warehouse-apron-r1.png",
    "/career-world/layers/infrastructure/textures/kaizen-agent/"
      + "integration/sites-r1/conservatory-apron-r1.png",
    "/career-world/layers/infrastructure/textures/kaizen-agent/"
      + "integration/sites-r1/corner-tenement-apron-r1.png",
    "/career-world/layers/infrastructure/textures/kaizen-agent/"
      + "integration/sites-r1/data-contracts-apron-r1.png",
    "/career-world/layers/infrastructure/textures/kaizen-agent/"
      + "integration/sites-r1/guild-annex-apron-r1.png",
    "/career-world/layers/infrastructure/textures/kaizen-agent/"
      + "integration/sites-r1/inn-apron-r1.png",
    "/career-world/layers/infrastructure/textures/kaizen-agent/"
      + "integration/sites-r1/machinist-workshop-apron-r1.png",
    "/career-world/layers/infrastructure/textures/kaizen-agent/"
      + "integration/sites-r1/maintenance-workshop-apron-r1.png",
    "/career-world/layers/infrastructure/textures/kaizen-agent/"
      + "integration/sites-r1/municipal-pump-house-apron-r1.png",
    "/career-world/layers/infrastructure/textures/kaizen-agent/"
      + "integration/sites-r1/protocol-gateway-apron-r1.png",
    "/career-world/layers/infrastructure/textures/kaizen-agent/"
      + "integration/sites-r1/safe-writes-apron-r1.png",
    "/career-world/layers/infrastructure/textures/kaizen-agent/"
      + "integration/sites-r1/worker-housing-apron-r1.png",
  ];

  for (const assetPath of assetPaths) {
    const file = path.join(root, "public", assetPath.replace(/^\//, ""));
    const metadata = await sharp(file).metadata();
    const { data, info } = await sharp(file)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let opaquePixels = 0;
    let transparentPixels = 0;
    let visibleMagentaPixels = 0;
    for (let index = 0; index < data.length; index += info.channels) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const alpha = data[index + 3];
      opaquePixels += alpha === 255 ? 1 : 0;
      transparentPixels += alpha === 0 ? 1 : 0;
      visibleMagentaPixels += (
        alpha > 32
        && red > green * 1.35
        && blue > green * 1.35
        && red > 90
        && blue > 90
      ) ? 1 : 0;
    }
    const pixelCount = info.width * info.height;
    const cornerAlpha = [
      data[3],
      data[(info.width - 1) * info.channels + 3],
      data[((info.height - 1) * info.width) * info.channels + 3],
      data[(pixelCount - 1) * info.channels + 3],
    ];

    assert.equal(metadata.hasAlpha, true, assetPath);
    assert.ok(info.width >= 1400 && info.height >= 1000, assetPath);
    assert.ok(cornerAlpha.every((value) => value === 0), assetPath);
    assert.ok(transparentPixels / pixelCount >= 0.45, assetPath);
    assert.ok(opaquePixels / pixelCount >= 0.23, assetPath);
    assert.equal(
      visibleMagentaPixels,
      0,
      `${assetPath} retains visible chroma-key spill`,
    );
    assert.match(
      integration,
      new RegExp(assetPath.split("/").at(-1).replace(".", "\\.")),
    );
  }

  assert.equal(assetPaths.length, 15);
  assert.match(integration, /KaizenGroundIntegrationAssetId/);
  assert.match(
    integration,
    /site\.footprintSpan\[0\][\s\S]*site\.presentationScale/,
  );
  assert.match(integration, /assetId: KaizenGroundIntegrationAssetId/);
  assert.match(
    integration,
    /missing a ground-integration asset/,
  );
  assert.match(layer, /requireKaizenGroundIntegrationAssetId/);
  assert.doesNotMatch(layer, /as KaizenGroundIntegrationAssetId/);
  assert.doesNotMatch(integration, /deterministicScale/);
  assert.doesNotMatch(integration, /Math\.max\(.*footprintSpan/s);
  assert.match(integration, /preserveAspectRatio="xMidYMid meet"/);
});
