import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function samePoint(left, right) {
  return left[0] === right[0] && left[1] === right[1];
}

function edgeBelongsToLoop(loop, start, end) {
  return loop.waypoints.slice(0, -1).some((point, index) => {
    const next = loop.waypoints[index + 1];
    return (
      samePoint(start, point)
      && samePoint(end, next)
    ) || (
      samePoint(start, next)
      && samePoint(end, point)
    );
  });
}

function directedRoute(loop, entrance, direction) {
  const openLoop = loop.waypoints.slice(0, -1);
  const startIndex = openLoop.findIndex((point) => (
    samePoint(point, entrance.point)
  ));
  const rotated = [
    ...openLoop.slice(startIndex),
    ...openLoop.slice(0, startIndex),
  ];
  const area = rotated.reduce((sum, point, index) => {
    const next = rotated[(index + 1) % rotated.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0);
  const authoredClockwise = area > 0;
  const requestedClockwise = direction === "clockwise";
  const directed = authoredClockwise === requestedClockwise
    ? rotated
    : [rotated[0], ...rotated.slice(1).reverse()];
  return [...directed, directed[0]];
}

test("NinjaOne town activity is explicit, route-bound, and bounded", async () => {
  const [towns, props, pedestrians] = await Promise.all([
    readJson(
      "public/career-world/layers/infrastructure/manifests/"
        + "ninjaone-project-towns-r1.json",
    ),
    readJson(
      "public/career-world/layers/environment/manifests/"
        + "ninjaone-town-activity-r1.json",
    ),
    readJson(
      "public/career-world/layers/actors-effects/manifests/"
        + "ninjaone-pedestrians-r1.json",
    ),
  ]);
  const ownerPlans = new Map([
    ...towns.towns.map((town) => [
      `project:${town.projectId}`,
      town.townPlan,
    ]),
    [
      `capital:${towns.capitalCampus.capitalId}`,
      towns.capitalCampus.townPlan,
    ],
  ]);
  const propKinds = new Set([
    "lamp",
    "stall",
    "cart",
    "bench",
    "street-tree",
  ]);
  const directions = new Set(["clockwise", "counterclockwise"]);
  const propIds = new Set();
  const pedestrianIds = new Set();
  const propOwnerCounts = new Map();
  const pedestrianOwnerCounts = new Map();

  assert.equal(props.minimumTier, "site");
  assert.equal(pedestrians.minimumTier, "close");
  assert.ok(
    pedestrians.reducedMotionRestProgress > 0
      && pedestrians.reducedMotionRestProgress < 1,
  );

  for (const prop of props.instances) {
    const ownerKey = `${prop.ownerKind}:${prop.ownerId}`;
    const plan = ownerPlans.get(ownerKey);
    const entrance = plan?.entrances.find(
      ({ structureId }) => structureId === prop.entranceStructureId,
    );
    assert.ok(!propIds.has(prop.id), prop.id);
    propIds.add(prop.id);
    assert.ok(plan, ownerKey);
    assert.ok(entrance, prop.id);
    assert.ok(propKinds.has(prop.kind), prop.id);
    assert.equal(prop.offset.length, 2, prop.id);
    assert.ok(
      prop.offset.every(
        (value) => Number.isFinite(value) && Math.abs(value) <= 0.01,
      ),
      prop.id,
    );
    assert.ok(
      Number.isFinite(prop.headingDegrees)
        && prop.headingDegrees >= 0
        && prop.headingDegrees < 360,
      prop.id,
    );
    const resolved = entrance.point.map(
      (value, index) => value + prop.offset[index],
    );
    assert.ok(
      resolved.every((value) => value >= 0 && value <= 1),
      prop.id,
    );
    propOwnerCounts.set(
      ownerKey,
      (propOwnerCounts.get(ownerKey) ?? 0) + 1,
    );
  }

  for (const pedestrian of pedestrians.pedestrians) {
    const ownerKey =
      `${pedestrian.ownerKind}:${pedestrian.ownerId}`;
    const plan = ownerPlans.get(ownerKey);
    const entrance = plan?.entrances.find(
      ({ structureId }) => (
        structureId === pedestrian.startEntranceStructureId
      ),
    );
    const loop = plan?.pedestrianLoops.find(
      ({ id }) => id === entrance?.loopId,
    );
    assert.ok(!pedestrianIds.has(pedestrian.id), pedestrian.id);
    pedestrianIds.add(pedestrian.id);
    assert.ok(plan, ownerKey);
    assert.ok(entrance, pedestrian.id);
    assert.ok(loop, pedestrian.id);
    assert.ok(
      samePoint(loop.waypoints[0], loop.waypoints.at(-1)),
      `${pedestrian.id} loop must be closed`,
    );
    assert.ok(
      loop.waypoints.some((point) => samePoint(point, entrance.point)),
      `${pedestrian.id} entrance must lie on its loop`,
    );
    const route = directedRoute(
      loop,
      entrance,
      pedestrian.direction,
    );
    assert.equal(route.length, loop.waypoints.length, pedestrian.id);
    for (let index = 0; index < route.length - 1; index += 1) {
      assert.ok(
        edgeBelongsToLoop(loop, route[index], route[index + 1]),
        `${pedestrian.id} must stay on rendered walkable-loop geometry`,
      );
    }
    const restPoint = route[0].map((value, index) => (
      value
      + (route[1][index] - value)
      * pedestrians.reducedMotionRestProgress
    ));
    assert.ok(
      !plan.entrances.some(({ point }) => samePoint(point, restPoint)),
      `${pedestrian.id} rest point must be away from entrances`,
    );
    assert.ok(directions.has(pedestrian.direction), pedestrian.id);
    assert.ok(
      Number.isFinite(pedestrian.durationSeconds)
        && pedestrian.durationSeconds > 0,
      pedestrian.id,
    );
    for (const color of Object.values(pedestrian.appearance)) {
      assert.match(color, /^#[0-9a-f]{6}$/i, pedestrian.id);
    }
    pedestrianOwnerCounts.set(
      ownerKey,
      (pedestrianOwnerCounts.get(ownerKey) ?? 0) + 1,
    );
  }

  assert.deepEqual(
    new Set(propOwnerCounts.keys()),
    new Set(ownerPlans.keys()),
  );
  assert.deepEqual(
    new Set(pedestrianOwnerCounts.keys()),
    new Set(ownerPlans.keys()),
  );
  for (const ownerKey of ownerPlans.keys()) {
    const isCapital = ownerKey.startsWith("capital:");
    const isKaizenAgent = ownerKey === "project:project-kaizen-agent";
    const propCount = propOwnerCounts.get(ownerKey);
    const pedestrianCount = pedestrianOwnerCounts.get(ownerKey);
    assert.ok(
      isCapital
        ? propCount >= 8 && propCount <= 12
        : isKaizenAgent
          ? propCount >= 15 && propCount <= 20
          : propCount >= 4 && propCount <= 6,
      ownerKey,
    );
    assert.ok(
      isCapital
        ? pedestrianCount >= 6 && pedestrianCount <= 8
        : pedestrianCount >= 2 && pedestrianCount <= 4,
      ownerKey,
    );
  }
  assert.ok(
    props.instances.filter(
      ({ kind, ownerId }) => (
        kind === "street-tree" && ownerId === "project-kaizen-agent"
      ),
    ).length >= 10,
    "Kaizen Agent needs an authored planted streetscape.",
  );
});

test("Kaizen semantic activity anchors keep authored clearance", async () => {
  const [towns, props] = await Promise.all([
    readJson(
      "public/career-world/layers/infrastructure/manifests/"
        + "ninjaone-project-towns-r1.json",
    ),
    readJson(
      "public/career-world/layers/environment/manifests/"
        + "ninjaone-town-activity-r1.json",
    ),
  ]);
  const plan = towns.towns.find(
    ({ projectId }) => projectId === "project-kaizen-agent",
  )?.townPlan;
  assert.ok(plan);
  const entrances = new Map(plan.entrances.map(
    ({ point, structureId }) => [structureId, point],
  ));
  const dimensionsByKind = new Map([
    ["stall", [10.1 * 0.62, 7.4 * 0.62]],
    ["street-tree", [12.8 * 0.62, 9.4 * 0.62]],
  ]);
  const worldSize = [1672, 941];
  const bounds = props.instances
    .filter(({ kind, ownerId }) => (
      ownerId === "project-kaizen-agent" && dimensionsByKind.has(kind)
    ))
    .map((instance) => {
      const entrance = entrances.get(instance.entranceStructureId);
      const dimensions = dimensionsByKind.get(instance.kind);
      assert.ok(entrance, instance.id);
      assert.ok(dimensions, instance.id);
      const anchor = entrance.map((value, index) => (
        (value + instance.offset[index]) * worldSize[index]
      ));
      return {
        id: instance.id,
        left: anchor[0] - dimensions[0] / 2,
        right: anchor[0] + dimensions[0] / 2,
        top: anchor[1] - dimensions[1],
        bottom: anchor[1],
      };
    });
  const overlaps = [];
  for (let leftIndex = 0; leftIndex < bounds.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < bounds.length;
      rightIndex += 1
    ) {
      const left = bounds[leftIndex];
      const right = bounds[rightIndex];
      if (
        Math.min(left.right, right.right) > Math.max(left.left, right.left)
        && Math.min(left.bottom, right.bottom) > Math.max(left.top, right.top)
      ) {
        overlaps.push([left.id, right.id]);
      }
    }
  }

  assert.ok(bounds.length >= 10);
  assert.deepEqual(overlaps, []);
});

test("Kaizen authored foundation suppresses duplicate activity visuals", async () => {
  const component = await readFile(
    path.join(
      root,
      "features/career-world/layers/environment/components/EnvironmentLayer.tsx",
    ),
    "utf8",
  );
  const removedPaths = [
    "features/career-world/layers/environment/components/"
      + "KaizenStreetscapeAssets.tsx",
    "public/career-world/layers/environment/assets/kaizen-agent",
  ];

  assert.match(
    component,
    /AUTHORED_TOWN_FOUNDATION_OWNER_IDS = new Set\(\[[\s\S]*project-kaizen-agent/,
  );
  assert.match(
    component,
    /RENDERED_ACTIVITY_PROP_INSTANCES = Object\.freeze\([\s\S]*!AUTHORED_TOWN_FOUNDATION_OWNER_IDS\.has\(ownerId\)/,
  );
  assert.match(component, /data-authored-town-activity-suppression-count=/);
  assert.doesNotMatch(component, /KaizenStreetTreeAsset/);
  assert.doesNotMatch(component, /KaizenStreetMarketAsset/);
  assert.doesNotMatch(component, /town-activity-props--kaizen-overview/);

  for (const removedPath of removedPaths) {
    await assert.rejects(access(path.join(root, removedPath)), {
      code: "ENOENT",
    });
  }
});

test("town activity uses the declared layer order and centralized LOD", async () => {
  const [
    scene,
    environmentComponent,
    environmentModel,
    actorsComponent,
    actorsModel,
    structuresComponent,
    styles,
  ] = await Promise.all([
    readFile(path.join(
      root,
      "features/career-world/composition/WorldScene.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/environment/components/"
        + "EnvironmentLayer.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/environment/model/"
        + "activityProps.ts",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/actors-effects/components/"
        + "ActorsEffectsLayer.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/actors-effects/model/"
        + "pedestrians.ts",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/structures/components/"
        + "StructuresLayer.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/styles/career-world.css",
    ), "utf8"),
  ]);
  const layerOrder = [
    "<TerritoryLandform",
    "<InfrastructureLayer",
    "<EnvironmentLayer",
    "<ActorsEffectsLayer",
    "<StructuresLayer",
    "<WorldInterface",
  ].map((token) => scene.indexOf(token));

  assert.ok(layerOrder.every((index) => index >= 0));
  assert.deepEqual(layerOrder, [...layerOrder].sort((left, right) => (
    left - right
  )));
  for (const component of [environmentComponent, actorsComponent]) {
    assert.match(component, /cameraViewBox\(\s*camera,/);
    assert.match(component, /resolveNodeVisibility\(/);
    assert.match(component, /LOD_PRESENTATION_TRANSITION_MS/);
    assert.match(component, /aria-hidden="true"/);
    assert.doesNotMatch(component, /cameraLayerStyle/);
  }
  assert.match(
    environmentModel,
    /ACTIVITY_PROP_SITE_POLICY:[\s\S]*minimumTier: "site"/,
  );
  assert.match(environmentComponent, /RENDERED_ACTIVITY_PROP_INSTANCES\.map/);
  assert.match(
    environmentComponent,
    /data-authored-town-activity-suppression-count=/,
  );
  assert.doesNotMatch(environmentComponent, /data-kaizen-activity-visibility=/);
  assert.match(
    actorsModel,
    /PEDESTRIAN_NODE_POLICY:[\s\S]*minimumTier: "close"/,
  );
  assert.match(
    actorsModel,
    /DEFERRED_PEDESTRIAN_OWNER_IDS[\s\S]*project-kaizen-agent/,
  );
  assert.match(
    actorsComponent,
    /RENDERED_PEDESTRIAN_INSTANCES\.map/,
  );
  assert.match(
    actorsComponent,
    /data-rendered-pedestrian-count=/,
  );
  assert.match(
    actorsComponent,
    /matchMedia\(REDUCED_MOTION_QUERY\)/,
  );
  assert.match(actorsComponent, /<animateMotion/);
  assert.match(
    actorsComponent,
    /path=\{motionPath\(instance\.motionPath\)\}/,
  );
  assert.match(
    actorsComponent,
    /attributeName="opacity"[\s\S]*ENDPOINT_VISIBILITY_VALUES/,
  );
  assert.match(
    actorsComponent,
    /worldPoint\(instance\.restPoint\)/,
  );
  assert.match(
    actorsComponent,
    /prefersReducedMotion \? null : \(/,
  );
  assert.match(
    styles,
    /\.career-world__actors-effects-layer\s*\{[\s\S]*?z-index:\s*6/,
  );
  assert.match(
    styles,
    /\.career-world__structures-layer\s*\{[\s\S]*?z-index:\s*7/,
  );
  assert.doesNotMatch(structuresComponent, /HumanScaleProbe|scale-probe/);
  for (const source of [
    environmentComponent,
    environmentModel,
    actorsComponent,
    actorsModel,
  ]) {
    assert.doesNotMatch(source, /Math\.random|requestAnimationFrame/);
  }
});

test("Kaizen foliage reuses one atlas and one shared world-wind animation", async () => {
  const [component, foliageModel, weather, waterState, styles] =
    await Promise.all([
      readFile(path.join(
        root,
        "features/career-world/layers/environment/components/"
          + "EnvironmentLayer.tsx",
      ), "utf8"),
      readFile(path.join(
        root,
        "features/career-world/layers/environment/model/"
          + "kaizenFoliage.ts",
      ), "utf8"),
      readFile(path.join(
        root,
        "features/career-world/shared/weather.ts",
      ), "utf8"),
      readFile(path.join(
        root,
        "features/career-world/layers/water-surface/model/state.ts",
      ), "utf8"),
      readFile(path.join(
        root,
        "features/career-world/styles/career-world.css",
      ), "utf8"),
    ]);
  const foliageResourceIds = [...foliageModel.matchAll(
    /id: "(?:street-tree-planter|paired-street-trees|fern-cluster|flowering-hedge)"/g,
  )];
  const foliageInstanceIds = [...foliageModel.matchAll(
    /id: "kaizen-(?:tree|pair|fern|hedge)-\d+"/g,
  )];
  const atlasPath = foliageModel.match(
    /NINJAONE_FOLIAGE_ATLAS_PATH\s*=\s*\n?\s*"([^"]+)"/,
  )?.[1];

  assert.equal(foliageResourceIds.length, 4);
  assert.equal(foliageInstanceIds.length, 12);
  assert.ok(atlasPath);
  await access(path.join(root, "public", atlasPath.replace(/^\//, "")));
  assert.match(component, /<FoliageResourceDefinitions \/>/);
  assert.match(component, /<symbol/);
  assert.match(component, /<use/);
  assert.match(component, /KAIZEN_FOLIAGE_INSTANCES\.map/);
  assert.match(component, /data-foliage-resource-count=/);
  assert.match(component, /data-foliage-instance-count=/);
  assert.match(component, /data-foliage-animation="shared-world-wind"/);
  assert.match(component, /windVectorFromDegrees\(/);
  assert.match(component, /DEFAULT_WORLD_WIND_STATE\.motion/);
  assert.match(weather, /directionDegrees: 24/);
  assert.match(weather, /motion: 0\.68/);
  assert.match(waterState, /DEFAULT_WORLD_WIND_STATE\.motion/);
  assert.match(waterState, /DEFAULT_WORLD_WIND_STATE\.directionDegrees/);
  assert.match(styles, /@keyframes career-world-foliage-breeze/);
  assert.match(
    styles,
    /prefers-reduced-motion: reduce[\s\S]*\.career-world__foliage-breeze[\s\S]*animation: none/,
  );
  for (const source of [component, foliageModel]) {
    assert.doesNotMatch(
      source,
      /Math\.random|requestAnimationFrame|setInterval|setTimeout/,
    );
  }
});
