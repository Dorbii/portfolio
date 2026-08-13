import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  auditKaizenTownTopography,
  auditTownSurfaces,
} from "../scripts/audit-career-world-town-surfaces.mjs";

const root = process.cwd();
const intentTest = process.env.CAREER_WORLD_INTENT_TESTS === "1"
  ? test
  : test.skip;
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

test("procedural town-plan surfaces exclude the authored Kaizen foundation", async () => {
  const reports = await auditTownSurfaces();
  assert.deepEqual(reports, []);
});

test("Kaizen route and structure semantics stay on buildable topography", async () => {
  const report = await auditKaizenTownTopography();
  const project = report.structures.find(
    ({ id }) => id === "project-kaizen-agent",
  );

  assert.equal(report.ownerId, "project-kaizen-agent");
  assert.ok(project);
  assert.ok(report.maximumRoadSlope <= 96);
  assert.ok(report.maximumStreetHeightRange <= 24);
  assert.ok(report.maximumStructureSlope <= 96);
  assert.ok(report.maximumStructureHeightRange <= 14);
  assert.ok(project.maximumSlope <= 96);
  assert.ok(project.heightRange <= 14);
});

intentTest("disabled Kaizen authored visual sources are not duplicated in live structures", async () => {
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

  assert.doesNotMatch(structures, /<KaizenNeighborhoodFabric/);
  assert.doesNotMatch(structures, /<KaizenIntegrationSeams/);
  assert.match(
    neighborhoodComponent,
    /data-neighborhood-renderer="persistent-base-progressive-detail-grid"/,
  );
  assert.match(
    neighborhoodComponent,
    /decodedAssetPaths\.has\(baseModule\.assetPath\)/,
  );
  assert.match(
    neighborhoodComponent,
    /Math\.max\(\s*overviewVisibility,\s*siteVisibility,\s*closeVisibility,\s*\)/,
  );
  assert.doesNotMatch(neighborhoodComponent, /close-fallback|registrationMaskId/);
  assert.doesNotMatch(neighborhoodComponent, /activeModule|useCloseFoundation/);
  assert.match(neighborhoodComponent, /const image = new Image\(\)/);
  assert.match(neighborhoodComponent, /requestedAssetPaths/);
  assert.match(neighborhoodComponent, /shouldRenderSite && siteModule/);
  assert.match(neighborhoodComponent, /shouldRenderClose \? closeModules\.map/);
  assert.match(
    neighborhoodModel,
    /base-runtime-r1\.json/,
  );
  assert.match(neighborhoodModel, /baseManifest\.lod\.base\.path/);
  assert.match(neighborhoodModel, /baseManifest\.lod\.site\.path/);
  assert.match(neighborhoodModel, /KAIZEN_CITY_PLATE_ANCHOR/);
  assert.match(neighborhoodModel, /KAIZEN_CITY_PLATE_SPAN/);
  assert.doesNotMatch(neighborhoodModel, /foundation-integrated/);
  assert.doesNotMatch(neighborhoodModel, /kaizen-semantic-assets-r1/);
  assert.match(
    neighborhoodModel,
    /KAIZEN_NEIGHBORHOOD_CLOSE_GRID_ROOT =\s*\n\s*baseManifest\.lod\.close\.assetRoot/,
  );
  assert.match(neighborhoodModel, /baseManifest\.lod\.close\.dimensions/);
  assert.match(neighborhoodModel, /KAIZEN_NEIGHBORHOOD_CLOSE_GRID_SIZE/);
  assert.match(neighborhoodModel, /\.\.\.CLOSE_MODULES/);
  assert.doesNotMatch(neighborhoodModel, /detail-atlas/);
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
