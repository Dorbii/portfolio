import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  KAIZEN_FOLIAGE_GROUP_INSTANCES,
  KAIZEN_FOLIAGE_GROUP_RESOURCES,
  KAIZEN_FOLIAGE_LAYOUT_ID,
  KAIZEN_FOLIAGE_PLACEMENT_BASIS,
  KAIZEN_FOLIAGE_SINGULAR_INSTANCES,
  KAIZEN_FOREST_GROUP_INSTANCES,
  NINJAONE_FOLIAGE_RESOURCES,
  resolveKaizenFoliageGroupResource,
} from "../features/career-world/layers/terrain/detail/model/kaizenFoliage.ts";
import { KAIZEN_CITY_PIXEL_TO_WORLD } from "../features/career-world/shared/kaizenCityRegistration.ts";

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

test("retained Kaizen activity is explicit, route-bound, and bounded", async () => {
  const [towns, props, pedestrians] = await Promise.all([
    readJson(
      "public/career-world/layers/infrastructure/manifests/"
        + "ninjaone-project-towns-r1.json",
    ),
    readJson(
      "public/career-world/layers/terrain/detail/manifests/"
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
  ]);
  assert.equal("capitalCampus" in towns, false);
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
    new Set(
      [...ownerPlans.keys()].filter(
        (ownerKey) => ownerKey !== "project:project-kaizen-agent",
      ),
    ),
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
    if (isKaizenAgent) {
      assert.equal(propCount, undefined, ownerKey);
      assert.ok(pedestrianCount >= 2 && pedestrianCount <= 4, ownerKey);
      continue;
    }
    assert.ok(
      isCapital
        ? propCount >= 8 && propCount <= 12
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
  assert.deepEqual(
    props.instances.filter(({ ownerId }) => ownerId === "project-kaizen-agent"),
    [],
  );
  assert.equal(props.instances.length, 0);
  assert.equal(pedestrians.pedestrians.length, 4);
});

test("Kaizen authored foundation has no legacy manifest activity props", async () => {
  const props = await readJson(
    "public/career-world/layers/terrain/detail/manifests/"
      + "ninjaone-town-activity-r1.json",
  );

  assert.deepEqual(
    props.instances.filter(({ ownerId }) => ownerId === "project-kaizen-agent"),
    [],
  );
  assert.ok(props.notes.some((note) => note.includes("foundation")));
});

test("Kaizen authored foundation suppresses duplicate activity visuals", async () => {
  const component = await readFile(
    path.join(
      root,
      "features/career-world/layers/terrain/detail/components/TerrainDetailLayer.tsx",
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
    foliageComponent,
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
      "features/career-world/layers/terrain/detail/components/"
        + "TerrainDetailLayer.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/terrain/detail/components/"
        + "FoliageLayer.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/terrain/detail/model/"
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
    "<TerrainDetailLayer",
    "<ActorsEffectsLayer",
    "<StructuresLayer",
    "<FoliageLayer",
    "<WorldInterface",
  ].map((token) => scene.indexOf(token));

  assert.ok(layerOrder.every((index) => index >= 0));
  assert.deepEqual(layerOrder, [...layerOrder].sort((left, right) => (
    left - right
  )));
  for (const component of [
    environmentComponent,
    actorsComponent,
  ]) {
    assert.match(component, /cameraViewBox\(\s*camera,/);
    assert.match(component, /resolveNodeVisibility\(/);
    assert.match(component, /LOD_PRESENTATION_TRANSITION_MS/);
    assert.match(component, /aria-hidden="true"/);
    assert.doesNotMatch(component, /cameraLayerStyle/);
  }
  assert.match(foliageComponent, /cameraViewBox\(\s*camera,/);
  assert.match(foliageComponent, /resolveAtomicTierVisibility\(/);
  assert.match(foliageComponent, /aria-hidden="true"/);
  assert.doesNotMatch(foliageComponent, /cameraLayerStyle/);
  assert.doesNotMatch(
    foliageComponent,
    /LOD_PRESENTATION_TRANSITION_MS/,
    "pooled foliage must not crossfade duplicate raster states",
  );
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

test("Kaizen foliage reuses authored city and forest groups with pooled wind", async () => {
  const [placementManifest, baseManifest] = await Promise.all([
    readJson(
      "public/career-world/cities/kaizen-agent/manifests/"
        + "environment-runtime-r1.json",
    ),
    readJson(
      "public/career-world/cities/kaizen-agent/manifests/base-runtime-r1.json",
    ),
  ]);
  const [component, foliageModel, weather, waterState, styles, scene] =
    await Promise.all([
      readFile(path.join(
        root,
        "features/career-world/layers/terrain/detail/components/"
          + "FoliageLayer.tsx",
      ), "utf8"),
      readFile(path.join(
        root,
        "features/career-world/layers/terrain/detail/model/"
          + "kaizenFoliage.ts",
      ), "utf8"),
      readFile(path.join(
        root,
        "features/career-world/shared/weather.ts",
      ), "utf8"),
      readFile(path.join(
        root,
        "features/career-world/layers/ocean/model/state.ts",
      ), "utf8"),
      readFile(path.join(
        root,
        "features/career-world/styles/career-world.css",
      ), "utf8"),
      readFile(path.join(
        root,
        "features/career-world/composition/WorldScene.tsx",
      ), "utf8"),
    ]);
  const foliageResourceIds = NINJAONE_FOLIAGE_RESOURCES.map(({ id }) => id);
  const atlasPaths = [
    ...new Set(NINJAONE_FOLIAGE_RESOURCES.map(({ atlasPath }) => atlasPath)),
  ];
  const allInstances = [
    ...KAIZEN_FOLIAGE_GROUP_INSTANCES,
    ...KAIZEN_FOREST_GROUP_INSTANCES,
    ...KAIZEN_FOLIAGE_SINGULAR_INSTANCES,
  ];
  const allGroupInstances = [
    ...KAIZEN_FOLIAGE_GROUP_INSTANCES,
    ...KAIZEN_FOREST_GROUP_INSTANCES,
  ];
  const estimatedPlantCount = KAIZEN_FOLIAGE_SINGULAR_INSTANCES.length
    + allGroupInstances.reduce((total, instance) => (
      total
      + resolveKaizenFoliageGroupResource(instance.groupId).visualPlantCount
    ), 0);
  const manifestCityGroups = placementManifest.groupInstances.filter(
    ({ forest }) => !forest,
  );
  const manifestForestGroups = placementManifest.groupInstances.filter(
    ({ forest }) => forest,
  );
  const manifestInstanceById = new Map([
    ...placementManifest.groupInstances.map((instance) => [instance.id, instance]),
    ...placementManifest.singularInstances.map((instance) => [instance.id, instance]),
  ]);

  assert.equal(foliageResourceIds.length, 10);
  assert.equal(new Set(foliageResourceIds).size, 10);
  assert.equal(NINJAONE_FOLIAGE_RESOURCES.length, 10);
  assert.equal(KAIZEN_FOLIAGE_GROUP_RESOURCES.length, 6);
  assert.equal(KAIZEN_FOLIAGE_GROUP_INSTANCES.length, manifestCityGroups.length);
  assert.equal(KAIZEN_FOREST_GROUP_INSTANCES.length, manifestForestGroups.length);
  assert.equal(
    KAIZEN_FOLIAGE_SINGULAR_INSTANCES.length,
    placementManifest.singularInstances.length,
  );
  assert.equal(allInstances.length, manifestInstanceById.size);
  assert.ok(
    allInstances.length >= 52 && allInstances.length <= 64,
    "shared accents must restore city and forest density without node sprawl",
  );
  assert.ok(
    estimatedPlantCount >= 540 && estimatedPlantCount <= 650,
    "grouped shared accents must preserve visible motion without node sprawl",
  );
  assert.ok(
    KAIZEN_FOLIAGE_SINGULAR_INSTANCES.length > 0
      && KAIZEN_FOLIAGE_SINGULAR_INSTANCES.length <= 12,
    "singular trees must stay a bounded accent over grouped foliage",
  );
  assert.ok(manifestCityGroups.length > 0);
  assert.ok(manifestForestGroups.length > 0);
  assert.equal(
    new Set(allInstances.map(({ id }) => id)).size,
    allInstances.length,
  );
  assert.equal(
    KAIZEN_FOLIAGE_LAYOUT_ID,
    placementManifest.id,
  );
  assert.deepEqual(
    KAIZEN_FOLIAGE_GROUP_INSTANCES.filter(
      ({ groupId }) => groupId.includes("planter"),
    ),
    [],
    "city overlays must not reintroduce floating hardscape planter shapes",
  );
  assert.equal(KAIZEN_FOLIAGE_PLACEMENT_BASIS, placementManifest.placementBasis);
  assert.equal(placementManifest.registrationRef, baseManifest.registration);
  assert.deepEqual(
    Object.keys(placementManifest.staticFiller).sort(),
    ["capital", "close", "site"],
    "static foliage is a registered raster layer rather than a node manifest",
  );
  assert.match(
    placementManifest.staticFiller.site.path,
    /static-foliage-site-r1\.webp$/,
  );
  assert.equal(atlasPaths.length, 3);
  assert.equal(new Set(atlasPaths).size, 3);
  for (const atlasPath of atlasPaths) {
    await access(path.join(root, "public", atlasPath.replace(/^\//, "")));
  }
  assert.equal(
    allInstances.filter(({ minimumTier }) => minimumTier === "capital").length,
    [...placementManifest.groupInstances, ...placementManifest.singularInstances]
      .filter(({ minimumTier }) => minimumTier === "capital").length,
  );
  assert.equal(
    allInstances.filter(({ minimumTier }) => minimumTier === "site").length,
    [...placementManifest.groupInstances, ...placementManifest.singularInstances]
      .filter(({ minimumTier }) => minimumTier === "site").length,
  );
  assert.equal(
    allInstances.filter(({ minimumTier }) => minimumTier === "close").length,
    [...placementManifest.groupInstances, ...placementManifest.singularInstances]
      .filter(({ minimumTier }) => minimumTier === "close").length,
  );
  for (const instance of allInstances) {
    const authored = manifestInstanceById.get(instance.id);
    assert.ok(authored, instance.id);
    const plateOrigin = [
      baseManifest.plate.anchor[0] - baseManifest.plate.span[0] * 0.5,
      baseManifest.plate.anchor[1]
        - baseManifest.plate.span[1] * baseManifest.plate.alignmentY,
    ];
    const expectedAnchor = [
      plateOrigin[0]
        + authored.anchor[0] / baseManifest.plate.dimensions[0]
          * baseManifest.plate.span[0],
      plateOrigin[1]
        + authored.anchor[1] / baseManifest.plate.dimensions[1]
          * baseManifest.plate.span[1],
    ];
    assert.ok(Math.abs(instance.anchor[0] - expectedAnchor[0]) < 1e-12, instance.id);
    assert.ok(Math.abs(instance.anchor[1] - expectedAnchor[1]) < 1e-12, instance.id);
    assert.equal(instance.scale, authored.scale, instance.id);
    assert.equal(instance.minimumTier, authored.minimumTier, instance.id);
    assert.equal(instance.mirror ?? false, authored.mirror ?? false, instance.id);
    if ("groupId" in instance) {
      assert.equal(instance.groupId, authored.groupId, instance.id);
      assert.ok(
        foliageResourceIds.includes(
          resolveKaizenFoliageGroupResource(instance.groupId).resourceId,
        ),
        instance.id,
      );
    } else {
      assert.equal(instance.resourceId, authored.resourceId, instance.id);
      assert.ok(foliageResourceIds.includes(instance.resourceId), instance.id);
    }
  }
  assert.ok(KAIZEN_FOLIAGE_GROUP_RESOURCES.every(({ visualPlantCount }) => (
    visualPlantCount >= 4 && visualPlantCount <= 14
  )));
  assert.equal(
    new Set(KAIZEN_FOLIAGE_GROUP_RESOURCES.map(({ resourceId }) => resourceId))
      .size,
    KAIZEN_FOLIAGE_GROUP_RESOURCES.length,
  );
  assert.match(
    component,
    /<FoliageResourceDefinitions[\s\S]*resources=\{visibleResources\}[\s\S]*windVector=\{windVector\}/,
  );
  assert.doesNotMatch(component, /FoliageGroupDefinitions|group\.atoms/);
  assert.match(component, /<symbol/);
  assert.match(component, /<use/);
  assert.match(component, /className="career-world__foliage-canopy"/);
  assert.doesNotMatch(component, /career-world__foliage-group-sway/);
  assert.match(component, /KAIZEN_FOLIAGE_GROUP_INSTANCES/);
  assert.match(component, /KAIZEN_FOREST_GROUP_INSTANCES/);
  assert.match(component, /KAIZEN_FOLIAGE_SINGULAR_INSTANCES/);
  assert.match(component, /visibleAtDetailTier\(/);
  assert.match(component, /minimumTier: instance\.minimumTier/);
  assert.match(component, /href=\{resource\.atlasPath\}/);
  assert.match(component, /data-foliage-resource-count=/);
  assert.match(component, /data-foliage-instance-count=/);
  assert.match(component, /data-foliage-mounted-instance-count=/);
  assert.match(component, /data-foliage-group-instance-count=/);
  assert.match(component, /data-foliage-forest-group-count=/);
  assert.match(component, /data-foliage-singular-instance-count=/);
  assert.match(component, /data-foliage-estimated-plant-count=/);
  assert.match(component, /data-foliage-mounted-estimated-plant-count=/);
  assert.match(component, /data-foliage-placement-basis=/);
  assert.match(component, /data-foliage-capital-instance-count=/);
  assert.match(component, /data-foliage-site-instance-count=/);
  assert.match(component, /data-foliage-close-instance-count=/);
  assert.match(
    component,
    /data-foliage-animation="pooled-cohesive-group-canopy-wind"/,
  );
  assert.match(component, /windVectorFromDegrees\(/);
  assert.match(component, /DEFAULT_WORLD_WIND_STATE\.motion/);
  assert.doesNotMatch(component, /instance\.(?:phaseSeconds|durationSeconds)/);
  assert.doesNotMatch(
    component,
    /LOD_PRESENTATION_TRANSITION_MS|transitionDuration/,
  );
  assert.match(
    foliageModel,
    /environment-runtime-r1\.json/,
  );
  assert.doesNotMatch(foliageModel, /street-tree-planter|paired-street-trees/);
  assert.ok(
    scene.indexOf("<StructuresLayer") < scene.indexOf("<FoliageLayer"),
    "pooled foliage must render after the opaque city plate",
  );
  assert.match(weather, /directionDegrees: 24/);
  assert.match(weather, /motion: 0\.68/);
  assert.match(waterState, /DEFAULT_WORLD_WIND_STATE\.motion/);
  assert.match(waterState, /DEFAULT_WORLD_WIND_STATE\.directionDegrees/);
  assert.match(styles, /@keyframes career-world-foliage-breeze/);
  assert.match(
    styles,
    /\.career-world__foliage-canopy\s*\{[\s\S]*animation:[\s\S]*career-world-foliage-breeze[\s\S]*infinite/,
  );
  assert.match(
    styles,
    /prefers-reduced-motion: reduce[\s\S]*\.career-world__foliage-canopy[\s\S]*animation: none/,
  );
  for (const source of [component, foliageModel]) {
    assert.doesNotMatch(
      source,
      /Math\.random|requestAnimationFrame|setInterval|setTimeout/,
    );
  }
});

test("registered sprite scales convert plate pixels into world units", async () => {
  const foliage = await readFile(path.join(
    root,
    "features/career-world/layers/terrain/detail/components/FoliageLayer.tsx",
  ), "utf8");

  assert.ok(KAIZEN_CITY_PIXEL_TO_WORLD.every((value) => (
    value > 0 && value < 0.2
  )));
  assert.match(
    foliage,
    /instance\.scale \* KAIZEN_CITY_PIXEL_TO_WORLD\[0\]/,
  );
  assert.match(
    foliage,
    /instance\.scale \* KAIZEN_CITY_PIXEL_TO_WORLD\[1\]/,
  );
});

test("Kaizen live click target and label stay disabled", async () => {
  const [scene, structures, worldInterface] = await Promise.all([
    readFile(path.join(
      root,
      "features/career-world/composition/WorldScene.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/structures/components/StructuresLayer.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/interface/components/WorldInterface.tsx",
    ), "utf8"),
  ]);

  assert.match(scene, /const LIVE_PROJECT_STRUCTURES = Object\.freeze\(/);
  assert.match(
    scene,
    /PROJECT_STRUCTURES\.filter\(\(\{ id \}\) => id !== KAIZEN_NEIGHBORHOOD_OWNER_ID\)/,
  );
  assert.match(scene, /LIVE_PROJECT_STRUCTURES\.map\(\(project\) =>/);
  assert.match(scene, /projectVisualReadiness=\{\{\}\}/);
  assert.match(
    structures,
    /DISABLED_STRUCTURE_OWNER_IDS = new Set\([\s\S]*KAIZEN_NEIGHBORHOOD_OWNER_ID/,
  );
  assert.match(
    structures,
    /RENDERED_PROJECT_STRUCTURES[\s\S]*!DISABLED_STRUCTURE_OWNER_IDS\.has\(id\)/,
  );
  assert.doesNotMatch(structures, /<KaizenNeighborhoodFabric/);
  assert.doesNotMatch(structures, /<KaizenIntegrationSeams/);
  assert.match(structures, /onKaizenVisualReadyChange\(false\)/);
  assert.match(structures, /const assetReady = loadedAssetPath === assetPath/);
  assert.match(
    structures,
    /const interactionReady = interactive && assetReady/,
  );
  assert.match(structures, /data-asset-ready=\{assetReady\}/);
  assert.match(
    worldInterface,
    /const interactionReady = enabled && visualReady && isVisible/,
  );
  assert.match(worldInterface, /data-project-visual-ready=\{visualReady\}/);
  assert.match(worldInterface, /disabled=\{!interactionReady\}/);
  assert.match(worldInterface, /tabIndex=\{interactionReady \? 0 : -1\}/);
});
