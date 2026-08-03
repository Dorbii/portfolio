import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  auditKaizenTownTopography,
  auditTownSurfaces,
} from "../scripts/audit-career-world-town-surfaces.mjs";

const root = process.cwd();
const infrastructureLayerPath = path.join(
  root,
  "features/career-world/layers/infrastructure/components/"
    + "InfrastructureLayer.tsx",
);
const structuresLayerPath = path.join(
  root,
  "features/career-world/layers/structures/components/StructuresLayer.tsx",
);
const neighborhoodComponentPath = path.join(
  root,
  "features/career-world/layers/structures/components/"
    + "KaizenNeighborhoodFabric.tsx",
);
const neighborhoodModelPath = path.join(
  root,
  "features/career-world/layers/structures/model/"
    + "kaizenNeighborhoodFabric.ts",
);

test("town-plan semantics retain sparse, traversable Kaizen geometry", async () => {
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
  );
  assert.deepEqual(kaizenReport.disconnectedEntrances, []);
  assert.equal(kaizenReport.pedestrianLoopOffRoadSamples, 0);
  assert.deepEqual(kaizenReport.buildingOverlapByStructure, []);

  for (const report of reports) {
    assert.ok(report.totalSurfaceCoverage <= 0.08, report.id);
    assert.ok(report.hardscapeCoverage <= 0.04, report.id);
    assert.equal(report.buildingOverlapPixels, 0, report.id);
    assert.equal(report.buildingOverlapRatio, 0, report.id);
  }
});

test("Kaizen route and structure semantics stay on buildable topography", async () => {
  const report = await auditKaizenTownTopography();
  const project = report.structures.find(
    ({ id }) => id === "project-kaizen-agent",
  );

  assert.equal(report.ownerId, "project-kaizen-agent");
  assert.ok(project);
  assert.ok(report.maximumRoadSlope <= 96);
  assert.ok(report.maximumStreetHeightRange <= 14);
  assert.ok(report.maximumStructureSlope <= 96);
  assert.ok(report.maximumStructureHeightRange <= 14);
  assert.equal(project.maximumSlope, 0);
  assert.equal(project.heightRange, 0);
});

test("Kaizen visual infrastructure has one authored source of truth", async () => {
  const [infrastructure, structures, neighborhoodComponent, neighborhoodModel] =
    await Promise.all([
      readFile(infrastructureLayerPath, "utf8"),
      readFile(structuresLayerPath, "utf8"),
      readFile(neighborhoodComponentPath, "utf8"),
      readFile(neighborhoodModelPath, "utf8"),
    ]);

  assert.match(
    infrastructure,
    /AUTHORED_TOWN_FOUNDATION_OWNER_IDS = new Set\(\[[\s\S]*KAIZEN_AGENT_TOWN_OWNER_ID/,
  );
  assert.match(
    infrastructure,
    /type TownPlanPhaseScope = "all" \| "procedural-only"/,
  );
  assert.match(
    infrastructure,
    /scope === "all"[\s\S]*!AUTHORED_TOWN_FOUNDATION_OWNER_IDS\.has\(ownerId\)/,
  );
  assert.match(infrastructure, /scope="procedural-only"/);
  assert.match(infrastructure, /data-authored-town-foundation-count=/);
  assert.doesNotMatch(infrastructure, /KaizenGroundIntegration/);
  assert.doesNotMatch(infrastructure, /TownDistrictFabric/);
  assert.doesNotMatch(infrastructure, /KAIZEN_AGENT_(?:GROUND|ROAD|EARTH_ROAD)/);
  assert.doesNotMatch(infrastructure, /town-plan__road-network--kaizen-agent/);

  assert.match(structures, /<KaizenNeighborhoodFabric/);
  assert.match(
    neighborhoodComponent,
    /data-neighborhood-renderer="registered-foundation-lod"/,
  );
  assert.match(
    neighborhoodComponent,
    /siteFoundationVisibility = siteVisibility \* \(1 - closeVisibility\)/,
  );
  assert.match(neighborhoodComponent, /closeFoundationVisibility = closeVisibility/);
  assert.match(
    neighborhoodModel,
    /kaizen-semantic-assets-r1\.json/,
  );
  assert.match(neighborhoodModel, /semanticManifest\.sourcePlate/);
  assert.doesNotMatch(neighborhoodModel, /foundation-integrated/);
  assert.match(
    neighborhoodModel,
    /KAIZEN_NEIGHBORHOOD_CLOSE_FOUNDATION_SRC =\s*\n\s*semanticManifest\.closePlate/,
  );
  assert.match(neighborhoodModel, /semanticManifest\.closePlateDimensions/);
  assert.doesNotMatch(neighborhoodModel, /detail-atlas/);
  assert.doesNotMatch(neighborhoodModel, /detailModule/);
});

test("obsolete Kaizen procedural visual pipeline stays removed", async () => {
  const removedPaths = [
    "features/career-world/layers/infrastructure/components/"
      + "KaizenGroundIntegration.tsx",
    "features/career-world/layers/infrastructure/components/"
      + "TownDistrictFabric.tsx",
    "features/career-world/layers/infrastructure/model/districtFabric.ts",
    "public/career-world/layers/infrastructure/textures/kaizen-agent",
    "public/career-world/layers/structures/textures/ambient/kaizen-agent/"
      + "heroic-neighborhood-detail-atlas-r4.png",
  ].map((relativePath) => path.join(root, relativePath));

  for (const removedPath of removedPaths) {
    await assert.rejects(access(removedPath), { code: "ENOENT" });
  }
});
