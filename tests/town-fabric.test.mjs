import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

test("Kaizen authored foundation replaces the modular NinjaOne town registry", async () => {
  const [fabric, towns] = await Promise.all([
    readJson(
      "public/career-world/layers/structures/manifests/"
        + "town-fabric-r1.json",
    ),
    readJson(
      "public/career-world/layers/infrastructure/manifests/"
        + "ninjaone-project-towns-r1.json",
    ),
  ]);

  assert.equal(fabric.schemaVersion, 3);
  assert.equal(fabric.id, "career-world/town-fabric@r4");
  assert.equal(fabric.revision, 4);
  assert.equal(fabric.minimumTier, "capital");
  assert.equal("buildScript" in fabric, false);
  assert.deepEqual(fabric.instances, []);
  assert.deepEqual(towns.towns.map(({ projectId }) => projectId), [
    "project-kaizen-agent",
  ]);
  assert.equal("capitalCampus" in towns, false);
});

test("Kaizen authored city layout stays isolated from the live structure stack", async () => {
  const [component, model, siteTiles] = await Promise.all([
    readFile(path.join(
      root,
      "features/career-world/layers/structures/components/"
        + "StructuresLayer.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/structures/model/townFabric.ts",
    ), "utf8"),
    readJson(
      "public/career-world/layers/terrain/authority/manifests/"
        + "terrain-site-tiles-r2.json",
    ),
  ]);

  assert.match(
    model,
    /TOWN_FABRIC_NODE_POLICY:[\s\S]*minimumTier: "capital"/,
  );
  assert.match(component, /data-town-fabric-count=/);
  assert.match(component, /data-town-overview-visibility=/);
  assert.match(
    component,
    /const townFabricVisibility = townOverviewVisibility;/,
  );
  assert.doesNotMatch(
    component,
    /townOverviewVisibility \* \(1 - townDetailVisibility\)/,
  );
  assert.match(
    component,
    /const townDetailVisibility = resolveAtomicTierVisibility\(/,
  );
  assert.match(
    component,
    /className="town-fabrics"[\s\S]*transitionDuration: "0ms"/,
  );
  assert.match(
    component,
    /detailState\.shouldLoadCapitalAssets[\s\S]*townFabricVisibility > LOD_PRESENTATION_EPSILON/,
  );
  assert.ok(
    component.indexOf('className="town-fabrics"')
      < component.indexOf("{mountedStructures.map"),
  );
  assert.match(
    component,
    /DISABLED_STRUCTURE_OWNER_IDS = new Set\([\s\S]*KAIZEN_NEIGHBORHOOD_OWNER_ID/,
  );
  assert.match(
    component,
    /RENDERED_TOWN_FABRIC_INSTANCES[\s\S]*!DISABLED_STRUCTURE_OWNER_IDS\.has\(ownerId\)/,
  );
  assert.match(
    component,
    /RENDERED_AMBIENT_STRUCTURE_INSTANCES[\s\S]*!TOWN_FABRIC_OWNER_IDS\.has\(ownerId\)/,
  );
  assert.doesNotMatch(component, /<KaizenNeighborhoodFabric/);
  assert.doesNotMatch(component, /<KaizenIntegrationSeams/);
  assert.match(
    component,
    /mountedStructures:[\s\S]*\.sort\(compareStructureDepth\)/,
  );
  assert.deepEqual(
    siteTiles.tiles
      .filter(({ territoryId }) => territoryId === "ninjaone")
      .map(({ ownerId }) => ownerId),
    ["project-kaizen-agent"],
  );
});
