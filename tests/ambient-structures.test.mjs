import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { PEDESTRIAN_SPAN } from "../features/career-world/shared/humanScale.ts";
import {
  resolveKaizenStructurePresentationScale,
} from "../features/career-world/layers/structures/model/kaizenPresentation.ts";
import {
  KAIZEN_SEMANTIC_ASSET_REGISTRATION,
  KAIZEN_SEMANTIC_STRUCTURE_ASSETS,
  resolveKaizenSemanticStructureAsset,
} from "../features/career-world/layers/structures/model/kaizenSemanticAssets.ts";
import {
  KAIZEN_NEIGHBORHOOD_CLOSE_DIMENSIONS,
  KAIZEN_NEIGHBORHOOD_CLOSE_FOUNDATION_SRC,
  KAIZEN_NEIGHBORHOOD_FOUNDATION_SRC,
  KAIZEN_NEIGHBORHOOD_MODULES,
  KAIZEN_NEIGHBORHOOD_SITE_DIMENSIONS,
} from "../features/career-world/layers/structures/model/kaizenNeighborhoodFabric.ts";

const root = process.cwd();
const world = { width: 1672, height: 941 };
const visibleHeightRatioByAsset = new Map();

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function publicFile(assetPath) {
  return path.join(root, "public", ...assetPath.slice(1).split("/"));
}

async function alphaVisibleHeightRatio(assetPath) {
  if (!visibleHeightRatioByAsset.has(assetPath)) {
    visibleHeightRatioByAsset.set(assetPath, (async () => {
      const { data, info } = await sharp(publicFile(assetPath))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let firstVisibleRow = info.height;
      let lastVisibleRow = -1;

      for (let y = 0; y < info.height; y += 1) {
        for (let x = 0; x < info.width; x += 1) {
          const alpha = data[(y * info.width + x) * info.channels + 3];
          if (alpha > 32) {
            firstVisibleRow = Math.min(firstVisibleRow, y);
            lastVisibleRow = Math.max(lastVisibleRow, y);
            break;
          }
        }
      }

      assert.ok(lastVisibleRow >= firstVisibleRow, assetPath);
      return (lastVisibleRow - firstVisibleRow + 1) / info.height;
    })());
  }

  return visibleHeightRatioByAsset.get(assetPath);
}

async function visibleWorldHeight(structure, presentationScale) {
  return (
    await alphaVisibleHeightRatio(structure.assetPath)
    * structure.footprintSpan[1]
    * world.height
    * presentationScale
  );
}

function pointInsidePolygon([x, y], points) {
  let inside = false;
  for (
    let current = 0, previous = points.length - 1;
    current < points.length;
    previous = current, current += 1
  ) {
    const [currentX, currentY] = points[current];
    const [previousX, previousY] = points[previous];
    if (
      (currentY > y) !== (previousY > y)
      && x < (
        (previousX - currentX) * (y - currentY)
        / (previousY - currentY)
        + currentX
      )
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function worldDistance(left, right) {
  return Math.hypot(
    (left[0] - right[0]) * world.width,
    (left[1] - right[1]) * world.height,
  );
}

function distanceToSegment(point, start, end) {
  const p = [point[0] * world.width, point[1] * world.height];
  const a = [start[0] * world.width, start[1] * world.height];
  const b = [end[0] * world.width, end[1] * world.height];
  const delta = [b[0] - a[0], b[1] - a[1]];
  const lengthSquared = delta[0] ** 2 + delta[1] ** 2;
  if (lengthSquared === 0) {
    return Math.hypot(p[0] - a[0], p[1] - a[1]);
  }
  const progress = Math.max(0, Math.min(
    1,
    (
      (p[0] - a[0]) * delta[0]
      + (p[1] - a[1]) * delta[1]
    ) / lengthSquared,
  ));
  return Math.hypot(
    p[0] - (a[0] + delta[0] * progress),
    p[1] - (a[1] + delta[1] * progress),
  );
}

test("modular ambient structures fill every town without owning portfolio semantics", async () => {
  const [
    ambient,
    infrastructure,
    projects,
    skills,
    support,
  ] = await Promise.all([
    readJson(
      "public/career-world/layers/structures/manifests/"
        + "ambient-structures-r1.json",
    ),
    readJson(
      "public/career-world/layers/infrastructure/manifests/"
        + "ninjaone-project-towns-r1.json",
    ),
    readJson(
      "public/career-world/layers/structures/manifests/"
        + "project-structures-r1.json",
    ),
    readJson(
      "public/career-world/layers/structures/manifests/"
        + "skill-structures-r1.json",
    ),
    readJson(
      "public/career-world/layers/structures/manifests/"
        + "support-structures-r1.json",
    ),
  ]);
  const ownerPlans = new Map([
    ...infrastructure.towns.map(
      ({ projectId, townPlan }) => [projectId, townPlan],
    ),
    [
      infrastructure.capitalCampus.capitalId,
      infrastructure.capitalCampus.townPlan,
    ],
  ]);
  const archetypes = new Map(
    ambient.archetypes.map((archetype) => [archetype.id, archetype]),
  );
  const sharedArchetypes = ambient.archetypes.filter(
    ({ id }) => !id.startsWith("kaizen-"),
  );
  const kaizenArchetypes = ambient.archetypes.filter(
    ({ id }) => id.startsWith("kaizen-"),
  );
  const ownerCounts = new Map();
  const instanceIds = new Set();

  assert.equal(ambient.schemaVersion, 1);
  assert.equal(ambient.minimumTier, "site");
  assert.equal(
    ambient.visualFamily,
    "career-world-fantasy-ambient-buildings@r1",
  );
  assert.equal(sharedArchetypes.length, 6);
  assert.equal(kaizenArchetypes.length, 6);
  assert.equal(ambient.archetypes.length, 12);
  assert.ok(ambient.instances.length >= 48);

  const largestAmbientWidth = Math.max(
    ...sharedArchetypes.map(({ footprintSpan }) => footprintSpan[0]),
  );
  const largestAmbientHeight = Math.max(
    ...sharedArchetypes.map(({ footprintSpan }) => footprintSpan[1]),
  );
  assert.ok(
    projects.nodes.every(({ footprintSpan }) => (
      footprintSpan[0] >= largestAmbientWidth * 2.4
      && footprintSpan[1] >= largestAmbientHeight * 2.4
    )),
    "Project landmarks must remain materially larger than filler buildings.",
  );
  assert.ok(
    skills.archetypes.every(({ footprintSpan }) => (
      footprintSpan[0] >= largestAmbientWidth * 2.4
      && footprintSpan[1] >= largestAmbientHeight * 2.4
    )),
    "Skill buildings must remain materially larger than filler buildings.",
  );

  const kaizenProject = projects.nodes.find(
    ({ id }) => id === "project-kaizen-agent",
  );
  const skillArchetypesById = new Map(
    skills.archetypes.map((archetype) => [archetype.id, archetype]),
  );
  const kaizenSkillArchetypes = skills.instances
    .filter(({ ownerId }) => ownerId === "project-kaizen-agent")
    .map(({ archetypeId }) => skillArchetypesById.get(archetypeId));
  const supportArchetypesById = new Map(
    support.archetypes.map((archetype) => [archetype.id, archetype]),
  );
  const kaizenSupportArchetypes = support.instances
    .filter(({ ownerId }) => ownerId === "project-kaizen-agent")
    .map(({ archetypeId }) => supportArchetypesById.get(archetypeId));
  const kaizenAmbientArchetypeIds = new Set(
    ambient.instances
      .filter(({ ownerId }) => ownerId === "project-kaizen-agent")
      .map(({ archetypeId }) => archetypeId),
  );
  const kaizenAmbientArchetypes = ambient.archetypes.filter(
    ({ id }) => kaizenAmbientArchetypeIds.has(id),
  );
  assert.ok(kaizenProject);
  assert.ok(kaizenSkillArchetypes.every(Boolean));
  assert.ok(kaizenSupportArchetypes.every(Boolean));

  const projectHeight = await visibleWorldHeight(
    kaizenProject,
    resolveKaizenStructurePresentationScale({
      ownerId: "project-kaizen-agent",
      role: "project",
      visualId: kaizenProject.id,
    }),
  );
  const skillHeights = await Promise.all(kaizenSkillArchetypes.map(
    (archetype) => visibleWorldHeight(
      archetype,
      resolveKaizenStructurePresentationScale({
        ownerId: "project-kaizen-agent",
        role: "skill",
        visualId: archetype.id,
      }),
    ),
  ));
  const supportHeights = await Promise.all(kaizenSupportArchetypes.map(
    (archetype) => visibleWorldHeight(
      archetype,
      resolveKaizenStructurePresentationScale({
        ownerId: "project-kaizen-agent",
        role: "support",
        visualId: archetype.id,
      }),
    ),
  ));
  const ambientHeights = await Promise.all(kaizenAmbientArchetypes.map(
    (archetype) => visibleWorldHeight(
      archetype,
      resolveKaizenStructurePresentationScale({
        ownerId: "project-kaizen-agent",
        role: "ambient",
        visualId: archetype.id,
      }),
    ),
  ));
  const pedestrianHeight = PEDESTRIAN_SPAN[1] * world.height;
  const assertHumanScale = (heights, minimum, maximum, label) => {
    for (const height of heights) {
      const pedestrianRatio = height / pedestrianHeight;
      assert.ok(
        pedestrianRatio >= minimum && pedestrianRatio <= maximum,
        `${label} visible height is ${pedestrianRatio.toFixed(1)} people`,
      );
    }
  };

  assertHumanScale([projectHeight], 20, 23, "Kaizen project landmark");
  assertHumanScale(skillHeights, 15, 17, "Kaizen skill landmark");
  assertHumanScale(supportHeights, 5.5, 9, "Kaizen support building");
  assertHumanScale(ambientHeights, 3.3, 7, "Kaizen ambient building");
  assert.ok(
    projectHeight >= Math.max(...skillHeights) * 1.15,
    "Kaizen's project landmark must remain visibly dominant over its skills.",
  );
  assert.ok(
    Math.min(...skillHeights) >= Math.max(...ambientHeights) * 1.2,
    "Kaizen skill landmarks must remain distinct from filler buildings.",
  );
  assert.equal(
    resolveKaizenStructurePresentationScale({
      ownerId: "project-vendy",
      role: "ambient",
      visualId: "fantasy-inn",
    }),
    1,
    "The Kaizen scale correction must not alter another town.",
  );

  for (const archetype of ambient.archetypes) {
    const asset = await stat(publicFile(archetype.assetPath));
    assert.ok(asset.size > 50_000, archetype.assetPath);
    assert.match(
      archetype.assetPath,
      /^\/career-world\/layers\/structures\/textures\/ambient\/.+\.png$/,
    );
  }

  for (const archetype of kaizenArchetypes) {
    const buffer = await readFile(publicFile(archetype.assetPath));
    assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG");
    assert.equal(buffer.readUInt32BE(16), archetype.sourceDimensions[0]);
    assert.equal(buffer.readUInt32BE(20), archetype.sourceDimensions[1]);
    assert.equal(buffer[24], 8, archetype.assetPath);
    assert.equal(buffer[25], 6, `${archetype.assetPath} must be RGBA`);
    assert.deepEqual(archetype.sourceDimensions, [1254, 1254]);
    assert.deepEqual(archetype.groundAnchor, [0.5, 0.92]);
  }

  const semanticClearances = [
    ...projects.nodes.map(({ id, territoryAnchor }) => ({
      ownerId: id,
      point: territoryAnchor,
      clearance: 12,
    })),
    ...skills.instances.map(({ ownerId, territoryAnchor }) => ({
      ownerId,
      point: territoryAnchor,
      clearance: 9,
    })),
    ...support.instances.map(({ ownerId, territoryAnchor }) => ({
      ownerId,
      point: territoryAnchor,
      clearance: 8,
    })),
  ];
  for (const instance of ambient.instances) {
    assert.ok(!instanceIds.has(instance.id), instance.id);
    instanceIds.add(instance.id);
    assert.equal("evidenceId" in instance, false, instance.id);
    assert.equal("projectId" in instance, false, instance.id);
    assert.equal("skillId" in instance, false, instance.id);
    const plan = ownerPlans.get(instance.ownerId);
    const block = plan?.blocks.find(({ id }) => id === instance.blockId);
    const archetype = archetypes.get(instance.archetypeId);
    assert.ok(plan, instance.ownerId);
    assert.ok(block, instance.blockId);
    assert.ok(archetype, instance.archetypeId);
    assert.ok(
      pointInsidePolygon(instance.territoryAnchor, block.points),
      `${instance.id} must keep its ground anchor inside its block`,
    );
    const roadSegments = [
      ...plan.streets,
      ...plan.pedestrianLoops,
    ].flatMap(({ waypoints }) => (
      waypoints.slice(1).map((point, index) => [
        waypoints[index],
        point,
      ])
    ));
    assert.ok(
      roadSegments.every(([start, end]) => (
        distanceToSegment(instance.territoryAnchor, start, end) >= 4.24
      )),
      `${instance.id} must stay off the walkable road centerlines`,
    );
    assert.ok(
      plan.entrances.every(({ point }) => (
        worldDistance(instance.territoryAnchor, point) >= 4.99
      )),
      `${instance.id} must keep entrances clear`,
    );
    assert.ok(
      semanticClearances
        .filter(({ ownerId }) => ownerId === instance.ownerId)
        .every(({ clearance, point }) => (
          worldDistance(instance.territoryAnchor, point)
            >= clearance - 0.01
        )),
      `${instance.id} must not crowd semantic structures`,
    );
    ownerCounts.set(
      instance.ownerId,
      (ownerCounts.get(instance.ownerId) ?? 0) + 1,
    );
  }

  assert.deepEqual(new Set(ownerCounts.keys()), new Set(ownerPlans.keys()));
  assert.ok(
    [...ownerCounts.values()].every((count) => count >= 3),
    "Every town needs enough modular fabric to read as a settlement.",
  );
});

test("authored town foundations separate semantic overlays from plate-owned fillers", async () => {
  const [component, model, css] = await Promise.all([
    readFile(path.join(
      root,
      "features/career-world/layers/structures/components/"
        + "StructuresLayer.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/structures/model/ambient.ts",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/styles/career-world.css",
    ), "utf8"),
  ]);

  assert.match(
    model,
    /AMBIENT_NODE_POLICY:[\s\S]*minimumTier: "site"/,
  );
  assert.match(component, /data-structure-role="ambient-building"/);
  assert.match(component, /data-ambient-candidate-count=/);
  assert.match(component, /data-ambient-structure-count=/);
  assert.match(component, /className="ambient-structures"/);
  assert.match(component, /resolveAmbientAnchor\(instance\)/);
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
  assert.match(component, /data-town-neighborhood-close-visibility=/);
  assert.match(
    component,
    /Math\.max\(defaultVisibility, authoredTownVisibility\)/,
  );
  assert.match(
    component,
    /defaultVisibility \* \(1 - authoredTownVisibility\)/,
  );
  assert.match(
    component,
    /projectPresentationVisibility,[\s\S]*"semantic"/,
  );
  assert.match(
    component,
    /skillPresentationVisibility,[\s\S]*"semantic"/,
  );
  assert.match(
    component,
    /supportPresentationVisibility,[\s\S]*"plate-owned"/,
  );
  assert.match(
    component,
    /ambientPresentationVisibility,[\s\S]*"plate-owned"/,
  );
  assert.match(component, /data-semantic-structure="true"/);
  assert.match(component, /data-scene-asset-pool=/);
  assert.match(component, /data-scene-resource-id=/);
  assert.match(component, /data-shared-city-asset-count=/);
  assert.match(component, /data-shared-city-asset-pool=/);
  assert.doesNotMatch(component, /className="kaizen-hero-ground-interfaces"/);
  assert.match(component, /structure-sprite__grounding--ambient/);
  assert.match(component, /structure-sprite__grounding--contact/);
  assert.match(component, /resolveKaizenSemanticStructureAsset/);
  assert.match(component, /assetOwnsGrounding/);
  assert.match(component, /data-grounding-ownership=/);
  assert.match(component, /data-semantic-registration=/);
  assert.match(
    component,
    /pointerEvents=\{interactionOverlay \? "none" : undefined\}/,
  );
  assert.doesNotMatch(
    component,
    /className="structure-sprite__interaction-hitbox"/,
  );
  assert.doesNotMatch(component, /career-world-semantic-cast-shadow/);
  assert.doesNotMatch(component, /structure-sprite__semantic-contact--/);
  assert.match(
    component,
    /mountedStructures:[\s\S]*\.sort\(compareStructureDepth\)/,
  );
  assert.match(
    component,
    /data-individual-structure-town-count=/,
  );
  assert.match(
    css,
    /\.ambient-structure \{[\s\S]*saturate\(0\.76\)[\s\S]*brightness\(0\.9\)/,
  );
  assert.match(
    css,
    /\.project-structure \.structure-sprite__asset \{[\s\S]*rgb\(198 151 86 \/ 36%\)/,
  );
  assert.match(
    css,
    /\.skill-structure \.structure-sprite__asset \{[\s\S]*rgb\(91 151 148 \/ 34%\)/,
  );
  assert.match(component, /structure-sprite__asset--concept-native/);
  assert.doesNotMatch(component, /structure-sprite__grounding--kaizen-hero/);
  assert.doesNotMatch(css, /transform: scale\(1\.78, 0\.72\)/);
  assert.match(
    css,
    /\.career-world__semantic-structure:hover[\s\S]*filter:/,
  );
  assert.match(
    css,
    /\.structure-sprite__asset--semantic-overlay \{[\s\S]*pointer-events: none/,
  );
  assert.match(component, /className="structure-sprite__interaction-silhouette"/);
  assert.match(component, /pointerEvents="fill"/);
  assert.match(css, /\.structure-sprite__interaction-silhouette \{[\s\S]*pointer-events: fill/);
  assert.match(
    css,
    /\.structure-sprite__asset--concept-native[\s\S]*saturate\(0\.96\)/,
  );
  assert.doesNotMatch(
    css,
    /\.career-world__semantic-structure:hover[^}]*transform:/,
  );
});

test("NinjaOne city instances reuse one registered resource per archetype", async () => {
  const [cityAssets, ambientManifest] = await Promise.all([
    readFile(path.join(
      root,
      "features/career-world/layers/structures/model/ninjaOneCityAssets.ts",
    ), "utf8"),
    readJson(
      "public/career-world/layers/structures/manifests/"
        + "ambient-structures-r1.json",
    ),
  ]);
  const resourceIds = [...cityAssets.matchAll(
    /id: "(ninjaone-[^"]+)"/g,
  )].map((match) => match[1]);
  const archetypeIds = [...cityAssets.matchAll(
    /archetypeId: "([^"]+)"/g,
  )].map((match) => match[1]);

  assert.match(cityAssets, /"ninjaone-common-city-assets@r1"/);
  assert.equal(resourceIds.length, 6);
  assert.equal(new Set(resourceIds).size, resourceIds.length);
  assert.equal(archetypeIds.length, resourceIds.length);
  assert.equal(new Set(archetypeIds).size, archetypeIds.length);

  const registeredArchetypeIds = new Set(
    ambientManifest.archetypes.map(({ id }) => id),
  );
  for (const archetypeId of archetypeIds) {
    assert.ok(registeredArchetypeIds.has(archetypeId), archetypeId);
  }

  assert.match(
    cityAssets,
    /const archetype = requireAmbientArchetype\(config\.archetypeId\)/,
  );
  assert.match(
    cityAssets,
    /return Object\.freeze\(\{[\s\S]*archetype,[\s\S]*standard: archetype\.assetPath/,
  );
  assert.match(cityAssets, /const ASSET_BY_ARCHETYPE_ID = new Map/);
  assert.match(
    cityAssets,
    /ASSET_BY_ARCHETYPE_ID\.get\(archetypeId\) \?\? null/,
  );
});

test("Kaizen close LOD refines one registered city image without morphing", async () => {
  const [component, fabricComponent] = await Promise.all([
    readFile(path.join(
      root,
      "features/career-world/layers/structures/components/"
        + "StructuresLayer.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/structures/components/"
        + "KaizenNeighborhoodFabric.tsx",
    ), "utf8"),
  ]);
  const siteModules = KAIZEN_NEIGHBORHOOD_MODULES.filter(
    ({ lod }) => lod === "site",
  );
  const closeModules = KAIZEN_NEIGHBORHOOD_MODULES.filter(
    ({ lod }) => lod === "close",
  );
  const assetPaths = new Set(
    KAIZEN_NEIGHBORHOOD_MODULES.map(({ assetPath }) => assetPath),
  );

  assert.equal(KAIZEN_NEIGHBORHOOD_MODULES.length, 2);
  assert.equal(assetPaths.size, 2);
  assert.deepEqual(assetPaths, new Set([
    KAIZEN_NEIGHBORHOOD_FOUNDATION_SRC,
    KAIZEN_NEIGHBORHOOD_CLOSE_FOUNDATION_SRC,
  ]));
  assert.equal(siteModules.length, 1);
  assert.equal(siteModules[0].kind, "city-foundation");
  assert.deepEqual(siteModules[0].crop, [0, 0, 1254, 1254]);
  assert.equal(closeModules.length, 1);
  assert.equal(closeModules[0].kind, "city-foundation-refinement");
  assert.deepEqual(closeModules[0].crop, [0, 0, 1254, 1254]);
  assert.deepEqual(closeModules[0].anchor, siteModules[0].anchor);
  assert.deepEqual(closeModules[0].span, siteModules[0].span);
  assert.equal(closeModules[0].blockId, siteModules[0].blockId);
  assert.equal(
    new Set(KAIZEN_NEIGHBORHOOD_MODULES.map(({ id }) => id)).size,
    KAIZEN_NEIGHBORHOOD_MODULES.length,
  );

  for (const neighborhoodModule of KAIZEN_NEIGHBORHOOD_MODULES) {
    const [cropX, cropY, cropWidth, cropHeight] = neighborhoodModule.crop;
    const [sourceWidth, sourceHeight] = neighborhoodModule.sourceDimensions;
    assert.ok(cropX >= 0 && cropY >= 0, neighborhoodModule.id);
    assert.ok(cropWidth > 0 && cropHeight > 0, neighborhoodModule.id);
    assert.ok(
      cropX + cropWidth <= sourceWidth,
      neighborhoodModule.id,
    );
    assert.ok(
      cropY + cropHeight <= sourceHeight,
      neighborhoodModule.id,
    );
  }

  const expectedDimensions = new Map([
    [KAIZEN_NEIGHBORHOOD_FOUNDATION_SRC, KAIZEN_NEIGHBORHOOD_SITE_DIMENSIONS],
    [KAIZEN_NEIGHBORHOOD_CLOSE_FOUNDATION_SRC, KAIZEN_NEIGHBORHOOD_CLOSE_DIMENSIONS],
  ]);
  for (const [assetPath, dimensions] of expectedDimensions) {
    const metadata = await sharp(publicFile(assetPath)).metadata();
    const stats = await sharp(publicFile(assetPath)).stats();
    const alpha = stats.channels[3];

    assert.equal(metadata.width, dimensions[0], assetPath);
    assert.equal(metadata.height, dimensions[1], assetPath);
    assert.equal(metadata.hasAlpha, true, assetPath);
    assert.equal(alpha.min, 0, `${assetPath} needs transparent padding`);
    assert.equal(alpha.max, 255, `${assetPath} needs opaque environment pixels`);
  }

  assert.match(
    KAIZEN_NEIGHBORHOOD_FOUNDATION_SRC,
    /city-foundation-integrated-r1\.png$/,
  );
  assert.match(
    KAIZEN_NEIGHBORHOOD_CLOSE_FOUNDATION_SRC,
    /city-foundation-close-authored-r3\.png$/,
  );
  const siteFoundation = await sharp(
    publicFile(KAIZEN_NEIGHBORHOOD_FOUNDATION_SRC),
  ).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const closeFoundation = await sharp(
    publicFile(KAIZEN_NEIGHBORHOOD_CLOSE_FOUNDATION_SRC),
  ).resize(
    siteFoundation.info.width,
    siteFoundation.info.height,
    { kernel: "lanczos3" },
  ).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let alphaIntersection = 0;
  let alphaUnion = 0;
  for (let offset = 0; offset < siteFoundation.data.length; offset += 4) {
    const siteVisible = siteFoundation.data[offset + 3] > 32;
    const closeVisible = closeFoundation.data[offset + 3] > 32;
    alphaIntersection += siteVisible && closeVisible ? 1 : 0;
    alphaUnion += siteVisible || closeVisible ? 1 : 0;
  }
  assert.ok(alphaUnion > 0);
  assert.ok(
    alphaIntersection / alphaUnion >= 0.99,
    "close detail may refine color and edges but cannot move the city silhouette",
  );
  assert.match(component, /<KaizenNeighborhoodFabric/);
  assert.match(component, /shouldRenderCloseNeighborhood/);
  assert.match(fabricComponent, /data-neighborhood-lod=/);
  assert.match(
    fabricComponent,
    /siteFoundationVisibility = siteVisibility \* \(1 - closeVisibility\)/,
  );
  assert.match(fabricComponent, /closeFoundationVisibility = closeVisibility/);
  assert.match(fabricComponent, /siteFoundationVisibility > 0\.001/);
  assert.match(fabricComponent, /data-neighborhood-foundation-visibility=/);
  assert.match(
    fabricComponent,
    /kind === "city-foundation-refinement"/,
  );
  assert.match(
    fabricComponent,
    /data-neighborhood-refinement-contract="registered-city-foundation"/,
  );
  assert.match(fabricComponent, /shouldRenderClose/);
  assert.doesNotMatch(fabricComponent, /Pedestrian|person|people/i);
});

test("Kaizen semantic buildings use concept-native registered cutouts", async () => {
  const manifest = await readJson(
    "public/career-world/layers/structures/manifests/"
      + "kaizen-semantic-assets-r1.json",
  );

  assert.equal(manifest.id, "career-world/kaizen-semantic-assets@r2");
  assert.equal(KAIZEN_SEMANTIC_ASSET_REGISTRATION, "kaizen-city-foundation@r1");
  assert.equal(KAIZEN_SEMANTIC_STRUCTURE_ASSETS.length, 4);
  assert.deepEqual(
    new Set(KAIZEN_SEMANTIC_STRUCTURE_ASSETS.map(({ id }) => id)),
    new Set([
      "project-kaizen-agent",
      "data-contracts",
      "safe-writes",
      "protocol-gateway",
    ]),
  );

  for (const asset of KAIZEN_SEMANTIC_STRUCTURE_ASSETS) {
    assert.match(asset.assetPath, /\/semantic\/kaizen-agent\/.*-concept-r2\.png$/);
    assert.equal(asset.grounding, "asset-owned");
    assert.equal(asset.registration, KAIZEN_SEMANTIC_ASSET_REGISTRATION);
    assert.ok(asset.interactionHull.length >= 3, asset.id);
    for (const [x, y] of asset.interactionHull) {
      assert.ok(x >= 0 && x <= asset.sourceDimensions[0], asset.id);
      assert.ok(y >= 0 && y <= asset.sourceDimensions[1], asset.id);
    }
    const { data, info } = await sharp(publicFile(asset.assetPath))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const metadata = await sharp(publicFile(asset.assetPath)).metadata();
    const stats = await sharp(publicFile(asset.assetPath)).stats();
    assert.deepEqual(
      [metadata.width, metadata.height],
      asset.sourceDimensions,
      asset.id,
    );
    assert.equal(metadata.hasAlpha, true, asset.id);
    assert.equal(stats.channels[3].min, 0, asset.id);
    assert.equal(stats.channels[3].max, 255, asset.id);

    const alphaAt = (x, y) => data[(y * info.width + x) * info.channels + 3];
    for (let x = 0; x < info.width; x += 1) {
      assert.equal(alphaAt(x, 0), 0, `${asset.id} top crop edge`);
      assert.equal(
        alphaAt(x, info.height - 1),
        0,
        `${asset.id} bottom crop edge`,
      );
    }
    for (let y = 0; y < info.height; y += 1) {
      assert.equal(alphaAt(0, y), 0, `${asset.id} left crop edge`);
      assert.equal(
        alphaAt(info.width - 1, y),
        0,
        `${asset.id} right crop edge`,
      );
    }
  }

  for (const filename of [
    "project-kaizen-agent-mask-r2.png",
    "data-contracts-mask-r2.png",
    "safe-writes-mask-r2.png",
    "protocol-gateway-mask-r2.png",
  ]) {
    const metadata = await sharp(path.join(
      root,
      "scripts/assets/kaizen-semantic-masks",
      filename,
    )).metadata();
    assert.deepEqual(
      [metadata.width, metadata.height],
      manifest.plateDimensions,
      filename,
    );
  }

  assert.equal(
    resolveKaizenSemanticStructureAsset({
      ownerId: "project-kaizen-agent",
      role: "project",
      visualId: "project-kaizen-agent",
    })?.id,
    "project-kaizen-agent",
  );
  assert.equal(
    resolveKaizenSemanticStructureAsset({
      ownerId: "project-kaizen-agent",
      role: "skill",
      visualId: "safe-writes",
    })?.id,
    "safe-writes",
  );
  assert.equal(
    resolveKaizenSemanticStructureAsset({
      ownerId: "project-vendy",
      role: "skill",
      visualId: "safe-writes",
    }),
    undefined,
  );
});

test("Kaizen semantic base and cutouts reconstruct the accepted concept", async () => {
  const manifest = await readJson(
    "public/career-world/layers/structures/manifests/"
      + "kaizen-semantic-assets-r1.json",
  );
  const overlays = manifest.assets.map((asset) => ({
    input: publicFile(asset.assetPath),
    left: asset.cropOrigin[0],
    top: asset.cropOrigin[1],
  }));
  const reconstructed = await sharp(publicFile(manifest.basePlate))
    .composite(overlays)
    .ensureAlpha()
    .raw()
    .toBuffer();
  const accepted = await sharp(publicFile(manifest.sourcePlate))
    .ensureAlpha()
    .raw()
    .toBuffer();

  assert.equal(reconstructed.length, accepted.length);
  let maximumDelta = 0;
  for (let index = 0; index < accepted.length; index += 1) {
    maximumDelta = Math.max(
      maximumDelta,
      Math.abs(reconstructed[index] - accepted[index]),
    );
  }
  assert.ok(maximumDelta <= 1, `maximum reconstruction delta ${maximumDelta}`);
});
