import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function boundsFromOrigin(origin, span) {
  return {
    left: origin[0],
    top: origin[1],
    right: origin[0] + span[0],
    bottom: origin[1] + span[1],
  };
}

function boundsFromCenter(anchor, span) {
  return {
    left: anchor[0] - span[0] / 2,
    top: anchor[1] - span[1] / 2,
    right: anchor[0] + span[0] / 2,
    bottom: anchor[1] + span[1] / 2,
  };
}

function contains(outer, inner) {
  return (
    inner.left >= outer.left
    && inner.top >= outer.top
    && inner.right <= outer.right
    && inner.bottom <= outer.bottom
  );
}

function intersects(left, right) {
  return (
    left.left < right.right
    && left.right > right.left
    && left.top < right.bottom
    && left.bottom > right.top
  );
}

function collectKeys(value, keys = new Set()) {
  if (Array.isArray(value)) {
    for (const child of value) {
      collectKeys(child, keys);
    }
    return keys;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}

test("NinjaOne rural outskirts are deterministic close-detail outside towns", async () => {
  const [rural, allocations, fabrics] = await Promise.all([
    readJson(
      "public/career-world/layers/environment/manifests/"
        + "ninjaone-rural-outskirts-r1.json",
    ),
    readJson(
      "public/career-world/layers/structures/manifests/"
        + "ninjaone-city-allocations-r1.json",
    ),
    readJson(
      "public/career-world/layers/structures/manifests/"
        + "town-fabric-r1.json",
    ),
  ]);
  const acceptedKinds = new Set([
    "field-furrows",
    "hedgerow",
    "stone-wall",
    "grove",
    "clearing",
    "lookout",
    "camp",
  ]);
  const allocationBounds = allocations.allocations.map(
    ({ bounds }) => boundsFromOrigin(bounds.origin, bounds.span),
  );
  const fabricBounds = fabrics.instances.map(
    ({ worldBounds }) => (
      boundsFromOrigin(worldBounds.origin, worldBounds.span)
    ),
  );
  const seenIds = new Set();
  const seenKinds = new Set();

  assert.equal(rural.schemaVersion, 1);
  assert.equal(rural.territoryId, "ninjaone");
  assert.equal(rural.minimumTier, "close");
  assert.equal(rural.status, "decorative-rural-outskirts");
  assert.ok(rural.scenery.length >= 12);

  for (const item of [...rural.scenery, ...rural.easterEggSlots]) {
    assert.ok(!seenIds.has(item.id), item.id);
    seenIds.add(item.id);
    assert.equal(item.anchor.length, 2, item.id);
    assert.equal(item.footprintSpan.length, 2, item.id);
    assert.ok(
      item.anchor.every(
        (value) => Number.isFinite(value) && value >= 0 && value <= 1,
      ),
      item.id,
    );
    assert.ok(
      item.footprintSpan.every(
        (value) => Number.isFinite(value) && value >= 0.003,
      ),
      item.id,
    );
    assert.ok(
      Number.isFinite(item.headingDegrees)
        && item.headingDegrees >= 0
        && item.headingDegrees < 360,
      item.id,
    );
    const itemBounds = boundsFromCenter(
      item.anchor,
      item.footprintSpan,
    );
    assert.ok(
      allocationBounds.some((bounds) => contains(bounds, itemBounds)),
      `${item.id} must remain inside an accepted allocation`,
    );
    assert.ok(
      fabricBounds.every((bounds) => !intersects(bounds, itemBounds)),
      `${item.id} must remain outside town fabric`,
    );
  }

  for (const item of rural.scenery) {
    assert.ok(acceptedKinds.has(item.kind), item.id);
    assert.ok(
      Number.isFinite(item.scale)
        && item.scale >= 0.65
        && item.scale <= 1.4,
      item.id,
    );
    seenKinds.add(item.kind);
  }
  assert.deepEqual(seenKinds, acceptedKinds);
});

test("rural easter-egg slots are stable, empty, and semantically inert", async () => {
  const ruralPath =
    "public/career-world/layers/environment/manifests/"
      + "ninjaone-rural-outskirts-r1.json";
  const raw = await readFile(path.join(root, ruralPath), "utf8");
  const rural = JSON.parse(raw);
  const disallowedKeys = new Set([
    "projectId",
    "skillId",
    "evidenceId",
    "destination",
    "destinationId",
    "href",
    "ownerId",
    "selectable",
  ]);
  const actualSlotIds = rural.easterEggSlots.map(({ id }) => id);

  assert.deepEqual(actualSlotIds, [
    "ninjaone-easter-egg-slot-northwest-hollow",
    "ninjaone-easter-egg-slot-kaizen-south",
    "ninjaone-easter-egg-slot-vendy-west",
    "ninjaone-easter-egg-slot-capital-northeast",
    "ninjaone-easter-egg-slot-east-highlands",
    "ninjaone-easter-egg-slot-south-meadow",
  ]);
  assert.ok(
    rural.easterEggSlots.every(({ content }) => content === null),
  );
  for (const key of collectKeys(rural)) {
    assert.ok(!disallowedKeys.has(key), key);
  }
  assert.doesNotMatch(raw, /Math\.random|requestAnimationFrame/);
});

test("the environment renderer keeps rural scenery decorative and omits empty slots", async () => {
  const [component, model] = await Promise.all([
    readFile(path.join(
      root,
      "features/career-world/layers/environment/components/"
        + "EnvironmentLayer.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/environment/model/"
        + "ruralOutskirts.ts",
    ), "utf8"),
  ]);

  assert.match(
    model,
    /RURAL_OUTSKIRTS_CLOSE_POLICY:[\s\S]*minimumTier: "close"/,
  );
  assert.match(model, /ninjaone-city-allocations-r1\.json/);
  assert.match(model, /town-fabric-r1\.json/);
  assert.match(model, /validateRuralFootprint/);
  assert.doesNotMatch(model, /Math\.random|requestAnimationFrame/);

  assert.match(component, /className="rural-outskirts rural-outskirts--close"/);
  assert.match(component, /`rural-scenery--\$\{instance\.kind\}`/);
  assert.match(component, /RURAL_SCENERY_INSTANCES\.map/);
  assert.match(
    component,
    /resolveNodeVisibility\(\s*RURAL_OUTSKIRTS_CLOSE_POLICY,/,
  );
  assert.match(component, /aria-hidden="true"/);
  assert.match(component, /pointerEvents: "none"/);
  assert.doesNotMatch(
    component,
    /EMPTY_EASTER_EGG_SLOTS|easterEggSlots/,
  );
  assert.doesNotMatch(
    component,
    /<image|href=|onClick=|tabIndex=|Math\.random/,
  );
});
