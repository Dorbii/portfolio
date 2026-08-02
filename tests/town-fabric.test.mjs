import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

const root = process.cwd();

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function assetFile(assetPath) {
  return path.join(
    root,
    "public",
    assetPath.replace("/career-world/", "career-world/"),
  );
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex").toUpperCase();
}

async function decodeRgba(file) {
  return sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

test("NinjaOne town fabric occupies every authored block exactly once", async () => {
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
  const ownerPlans = new Map([
    ...towns.towns.map((town) => [town.projectId, town.townPlan]),
    [towns.capitalCampus.capitalId, towns.capitalCampus.townPlan],
  ]);
  const assetPaths = new Set();
  const ownerIds = new Set();

  assert.equal(fabric.schemaVersion, 3);
  assert.equal(fabric.id, "career-world/town-fabric@r4");
  assert.equal(fabric.revision, 4);
  assert.equal(fabric.projection, "high-oblique-orthographic");
  assert.equal(fabric.renderAspectPolicy, "source-aspect-preserving");
  assert.equal(
    fabric.buildScript,
    "scripts/build-career-world-town-sprawl.mjs",
  );
  assert.equal(fabric.minimumTier, "capital");
  assert.equal(fabric.instances.length, ownerPlans.size);

  for (const instance of fabric.instances) {
    const plan = ownerPlans.get(instance.ownerId);
    const origin = instance.worldBounds.origin;
    const span = instance.worldBounds.span;
    const max = origin.map((value, index) => value + span[index]);

    assert.ok(plan, instance.ownerId);
    assert.ok(!assetPaths.has(instance.assetPath), instance.assetPath);
    assert.ok(!ownerIds.has(instance.ownerId), instance.ownerId);
    assetPaths.add(instance.assetPath);
    ownerIds.add(instance.ownerId);
    assert.match(instance.assetPath, /-r4\.png$/);
    assert.match(instance.sourceAssetPath, /-r2\.png$/);
    assert.equal(instance.assetRevision, 4);
    assert.equal(
      instance.alphaMaskPolicy,
      "intrinsic-negative-space",
    );
    assert.equal(
      instance.layoutScale,
      towns.sprawlScales[instance.ownerId],
    );
    assert.deepEqual(
      new Set(instance.blockIds),
      new Set(plan.blocks.map(({ id }) => id)),
      instance.id,
    );
    for (const point of plan.blocks.flatMap(({ points }) => points)) {
      assert.ok(
        point[0] >= origin[0]
          && point[0] <= max[0]
          && point[1] >= origin[1]
          && point[1] <= max[1],
        `${instance.id} must contain ${point.join(",")}`,
      );
    }

    const buffer = await readFile(assetFile(instance.assetPath));
    assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG");
    assert.equal(buffer.readUInt32BE(16), instance.sourceDimensions[0]);
    assert.equal(buffer.readUInt32BE(20), instance.sourceDimensions[1]);
    assert.equal(buffer[24], 8, instance.assetPath);
    assert.equal(buffer[25], 6, `${instance.assetPath} must be RGBA`);
    assert.equal(sha256(buffer), instance.sha256);
  }

  assert.deepEqual(ownerIds, new Set(ownerPlans.keys()));
});

test("town-fabric r4 preserves every authored r2 pixel", async () => {
  const fabric = await readJson(
    "public/career-world/layers/structures/manifests/"
      + "town-fabric-r1.json",
  );
  for (const instance of fabric.instances) {
    const output = await readFile(assetFile(instance.assetPath));
    const source = await readFile(assetFile(instance.sourceAssetPath));
    assert.deepEqual(
      output,
      source,
      `${instance.id} must not delete building pixels for roads`,
    );
    const { data } = await decodeRgba(assetFile(instance.assetPath));
    const alpha = data.filter((_, index) => index % 4 === 3);
    assert.ok(alpha.some((value) => value === 0), instance.id);
    assert.ok(alpha.some((value) => value > 240), instance.id);
  }
});

test("r4 atlases preserve source aspect inside their registered envelopes", async () => {
  const fabric = await readJson(
    "public/career-world/layers/structures/manifests/"
      + "town-fabric-r1.json",
  );
  const component = await readFile(path.join(
    root,
    "features/career-world/layers/structures/components/"
      + "StructuresLayer.tsx",
  ), "utf8");
  const worldPlaneAspect = 1672 / 941;
  const renderedAtlasInstances = fabric.instances.filter(
    ({ ownerId }) => ownerId !== "project-kaizen-agent",
  );

  assert.match(component, /preserveAspectRatio="xMidYMid meet"/);
  for (const instance of renderedAtlasInstances) {
    const sourceAspect = (
      instance.sourceDimensions[0] / instance.sourceDimensions[1]
    );
    const registeredAspect = (
      instance.worldBounds.span[0]
      / instance.worldBounds.span[1]
      * worldPlaneAspect
    );
    const relativeError = Math.abs(
      sourceAspect / registeredAspect - 1,
    );

    assert.ok(
      sourceAspect >= 1.45,
      `${instance.id} must use a landscape-authored source`,
    );
    assert.ok(
      relativeError <= 0.04,
      `${instance.id} source aspect must match its registered envelope`,
    );
  }
});

test("atlas towns stay persistent while Kaizen uses one independent sprite layout", async () => {
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
      "public/career-world/layers/territory-landform/manifests/"
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
    /INDIVIDUAL_STRUCTURE_TOWN_OWNER_IDS = new Set\([\s\S]*project-kaizen-agent/,
  );
  assert.match(
    component,
    /RENDERED_TOWN_FABRIC_INSTANCES[\s\S]*!INDIVIDUAL_STRUCTURE_TOWN_OWNER_IDS\.has\(ownerId\)/,
  );
  assert.match(
    component,
    /RENDERED_AMBIENT_STRUCTURE_INSTANCES[\s\S]*!TOWN_FABRIC_OWNER_IDS\.has\(ownerId\)/,
  );
  assert.match(component, /<KaizenNeighborhoodFabric/);
  assert.match(
    component,
    /mountedStructures:[\s\S]*\.sort\(compareStructureDepth\)/,
  );
  assert.doesNotMatch(
    JSON.stringify(siteTiles),
    /ninjaone-capital-region-authored-r1\.png/,
  );
});
