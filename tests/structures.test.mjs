import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  resolveDetailState,
  resolveNodeVisibility,
} from "../features/career-world/shared/lod.ts";
import { WORLD_PLANE } from "../features/career-world/shared/world.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

test("capital registry omits NinjaOne while retaining other territory capitals", async () => {
  const structures = await readJson(
    "public/career-world/layers/structures/manifests/capital-structures-r1.json",
  );
  const territories = await readJson(
    "public/career-world/layers/territory-landform/manifests/world-territories-r4.json",
  );
  const expectedTerritoryIds = territories.territories
    .map(({ id }) => id)
    .filter((id) => id !== "ninjaone")
    .sort();
  const capitalTerritoryIds = structures.nodes
    .map(({ territoryId }) => territoryId)
    .sort();

  assert.equal(structures.status, "phase-6-checkpoint");
  assert.equal(structures.minimumTier, "territory");
  assert.equal(structures.nodes.length, 4);
  assert.deepEqual(capitalTerritoryIds, expectedTerritoryIds);
  assert.equal(
    structures.nodes.some(({ territoryId }) => territoryId === "ninjaone"),
    false,
  );
  assert.equal(
    new Set(structures.nodes.map(({ id }) => id)).size,
    structures.nodes.length,
  );
  assert.equal(
    new Set(structures.nodes.map(({ archetype }) => archetype)).size,
    structures.nodes.length,
  );
  assert.equal(structures.projection.type, "orthographic-high-oblique");
  assert.equal(
    structures.projection.lightSource,
    "career-world/world-light@r1",
  );
});

test("capital manifest consumes Phase 3 anchors without duplicating them", async () => {
  const structures = await readJson(
    "public/career-world/layers/structures/manifests/capital-structures-r1.json",
  );
  const serialized = JSON.stringify(structures.nodes);

  assert.match(structures.anchorSource, /world-territories-r4\.json/);
  assert.equal(serialized.includes("capitalAnchor"), false);
  assert.equal(serialized.includes("\"anchor\""), false);
  assert.equal(serialized.includes("\"position\""), false);
});

test("every capital footprint stays inside its capital envelope", async () => {
  const structures = await readJson(
    "public/career-world/layers/structures/manifests/capital-structures-r1.json",
  );
  const territories = await readJson(
    "public/career-world/layers/territory-landform/manifests/world-territories-r4.json",
  );

  for (const capital of structures.nodes) {
    const territory = territories.territories.find(
      ({ id }) => id === capital.territoryId,
    );
    assert.ok(territory, capital.territoryId);

    const [width, height] = capital.footprintSpan;
    const [groundX, groundY] = capital.groundAnchor;
    const [anchorX, anchorY] = territory.development.capitalAnchor;
    const [originX, originY] =
      territory.development.capitalEnvelope.origin;
    const [spanX, spanY] = territory.development.capitalEnvelope.span;

    assert.ok(anchorX - width * groundX >= originX, capital.id);
    assert.ok(anchorX + width * (1 - groundX) <= originX + spanX, capital.id);
    assert.ok(anchorY - height * groundY >= originY, capital.id);
    assert.ok(anchorY + height * (1 - groundY) <= originY + spanY, capital.id);
    assert.ok(
      width / spanX <= 0.3,
      `${capital.id} structure consumes too much envelope width`,
    );
    assert.ok(
      height / spanY <= 0.5,
      `${capital.id} structure consumes too much envelope height`,
    );
    assert.ok(groundX >= 0 && groundX <= 1, capital.id);
    assert.ok(groundY >= 0 && groundY <= 1, capital.id);

    const renderedWidth = width * WORLD_PLANE.width;
    const renderedHeight = height * WORLD_PLANE.height;
    assert.ok(
      Math.abs(renderedWidth / renderedHeight - 1) < 0.015,
      `${capital.id} would distort its square source asset`,
    );
  }
});

test("every capital uses a distinct authored texture asset", async () => {
  const structures = await readJson(
    "public/career-world/layers/structures/manifests/capital-structures-r1.json",
  );
  const assetPaths = structures.nodes.map(({ assetPath }) => assetPath);

  assert.equal(new Set(assetPaths).size, structures.nodes.length);
  for (const assetPath of assetPaths) {
    assert.match(assetPath, /^\/career-world\/layers\/structures\/textures\/.+\.png$/);
    const asset = await stat(path.join(root, "public", assetPath));
    assert.ok(asset.size > 100_000, assetPath);
  }
});

test("every capital ground integration is territory-owned and bounded", async () => {
  const structures = await readJson(
    "public/career-world/layers/structures/manifests/capital-structures-r1.json",
  );
  const siteManifest = await readJson(
    "public/career-world/layers/territory-landform/manifests/terrain-site-tiles-r2.json",
  );
  const territories = await readJson(
    "public/career-world/layers/territory-landform/manifests/world-territories-r4.json",
  );
  const territoryIds = territories.territories
    .map(({ id }) => id)
    .filter((id) => id !== "ninjaone")
    .sort();
  const capitalTiles = siteManifest.tiles.filter(
    ({ ownerKind }) => ownerKind === "capital",
  );
  const siteTerritoryIds = capitalTiles
    .map(({ territoryId }) => territoryId)
    .sort();

  assert.equal(siteManifest.status, "phase-6-structure-sites");
  assert.equal(capitalTiles.length, structures.nodes.length);
  assert.deepEqual(siteTerritoryIds, territoryIds);
  assert.equal(
    structures.nodes.some((capital) => (
      "groundAssetPath" in capital
      || "roadAssetPath" in capital
      || "plazaAssetPath" in capital
      || "circulationAssetPath" in capital
    )),
    false,
  );
  assert.equal(
    structures.nodes.some((capital) => "assetScale" in capital),
    false,
  );

  const [sourceWidth, sourceHeight] = siteManifest.sourceDimensions;
  for (const capital of structures.nodes) {
    const tile = capitalTiles.find(
      ({ ownerId }) => ownerId === capital.id,
    );
    const territory = territories.territories.find(
      ({ id }) => id === capital.territoryId,
    );
    assert.ok(tile, `${capital.id} terrain site must be registered`);
    assert.ok(territory, `${capital.id} territory must be registered`);
    assert.equal(tile.ownerKind, "capital");
    assert.equal(tile.ownerId, capital.id);
    assert.equal(tile.minimumTier, "site");
    assert.equal(tile.sourceAlphaPolicy, "bounded-subset");
    assert.match(
      tile.path,
      /^\/career-world\/layers\/territory-landform\/tiles\/.+\.png$/,
    );
    const siteAsset = await stat(path.join(root, "public", tile.path));
    assert.ok(siteAsset.size > 100_000);

    const [tileOriginX, tileOriginY] = tile.worldBounds.origin;
    const [tileSpanX, tileSpanY] = tile.worldBounds.span;
    const [cropX, cropY] = tile.sourceCropPixels.origin;
    const [cropWidth, cropHeight] = tile.sourceCropPixels.size;
    assert.ok(Math.abs(tileOriginX - cropX / sourceWidth) < 1e-12);
    assert.ok(Math.abs(tileOriginY - cropY / sourceHeight) < 1e-12);
    assert.ok(Math.abs(tileSpanX - cropWidth / sourceWidth) < 1e-12);
    assert.ok(Math.abs(tileSpanY - cropHeight / sourceHeight) < 1e-12);
    const [anchorX, anchorY] = territory.development.capitalAnchor;
    const envelope = territory.development.capitalEnvelope;
    assert.ok(tileOriginX >= envelope.origin[0]);
    assert.ok(tileOriginY >= envelope.origin[1]);
    assert.ok(tileOriginX + tileSpanX <= envelope.origin[0] + envelope.span[0]);
    assert.ok(tileOriginY + tileSpanY <= envelope.origin[1] + envelope.span[1]);
    assert.ok(anchorX >= tileOriginX && anchorX <= tileOriginX + tileSpanX);
    assert.ok(anchorY >= tileOriginY && anchorY <= tileOriginY + tileSpanY);
  }
});

test("Kaizen Agent is the only retained NinjaOne project city", async () => {
  const projects = await readJson(
    "public/career-world/layers/structures/manifests/project-structures-r1.json",
  );
  const sites = await readJson(
    "public/career-world/layers/territory-landform/manifests/terrain-site-tiles-r2.json",
  );
  const territories = await readJson(
    "public/career-world/layers/territory-landform/manifests/world-territories-r4.json",
  );
  const ninjaOne = territories.territories.find(({ id }) => id === "ninjaone");
  const projectTiles = sites.tiles.filter(
    ({ ownerKind, territoryId }) => (
      ownerKind === "project" && territoryId === "ninjaone"
    ),
  );

  assert.ok(ninjaOne);
  assert.deepEqual(projects.nodes.map(({ id }) => id), ["project-kaizen-agent"]);
  assert.equal(projectTiles.length, 1);
  assert.doesNotMatch(
    JSON.stringify(projects),
    /project-vendy|project-kaizen-metrics|capital-ninjaone/,
  );

  const project = projects.nodes[0];
  const tile = projectTiles[0];
  const anchor = project.territoryAnchor;
  assert.equal(tile.ownerId, project.id);
  assert.equal(tile.minimumTier, "site");
  assert.equal(tile.sourceAlphaPolicy, "bounded-subset");
  assert.ok(
    anchor[0] >= tile.worldBounds.origin[0]
      && anchor[0] <= tile.worldBounds.origin[0] + tile.worldBounds.span[0],
  );
  assert.ok(
    anchor[1] >= tile.worldBounds.origin[1]
      && anchor[1] <= tile.worldBounds.origin[1] + tile.worldBounds.span[1],
  );
  assert.ok(
    anchor[0] >= ninjaOne.focusView.origin[0]
      && anchor[0] <= ninjaOne.focusView.origin[0] + ninjaOne.focusView.span[0],
  );
  assert.ok(
    anchor[1] >= ninjaOne.focusView.origin[1]
      && anchor[1] <= ninjaOne.focusView.origin[1] + ninjaOne.focusView.span[1],
  );
  const projectAsset = await stat(path.join(root, "public", project.assetPath));
  const contactAsset = await stat(path.join(root, "public", tile.path));
  assert.ok(projectAsset.size > 100_000, project.assetPath);
  assert.ok(contactAsset.size > 100_000, tile.path);
});

test("shared skill definitions instantiate only for Kaizen Agent", async () => {
  const projects = await readJson(
    "public/career-world/layers/structures/manifests/project-structures-r1.json",
  );
  const skills = await readJson(
    "public/career-world/layers/structures/manifests/skill-structures-r1.json",
  );
  const project = projects.nodes[0];
  const archetypeById = new Map(
    skills.archetypes.map((archetype) => [archetype.id, archetype]),
  );

  assert.equal(skills.definitionScope, "universal");
  assert.equal(skills.minimumTier, "site");
  assert.equal(skills.archetypes.length, 8);
  assert.equal(skills.instances.length, 3);
  assert.deepEqual(
    skills.instances.map(({ archetypeId }) => archetypeId).sort(),
    [...project.supportedSkillArchetypeIds].sort(),
  );
  assert.ok(skills.instances.every(({ ownerKind, ownerId }) => (
    ownerKind === "project" && ownerId === "project-kaizen-agent"
  )));
  assert.equal(
    skills.instances.some(({ ownerKind }) => ownerKind === "capital"),
    false,
  );

  for (const archetype of skills.archetypes) {
    const asset = await stat(path.join(root, "public", archetype.assetPath));
    assert.ok(asset.size > 40_000, archetype.assetPath);
  }
  for (const instance of skills.instances) {
    assert.ok(archetypeById.has(instance.archetypeId), instance.id);
    assert.ok(project.supportedSkillArchetypeIds.includes(instance.archetypeId));
    assert.ok(instance.territoryAnchor.every(
      (value) => Number.isFinite(value) && value >= 0 && value <= 1,
    ));
  }
});

test("removed NinjaOne cities leave no legacy support structures", async () => {
  const supports = await readJson(
    "public/career-world/layers/structures/manifests/support-structures-r1.json",
  );

  assert.equal(supports.coordinateSpace, "normalized-world-top-left");
  assert.equal(supports.minimumTier, "site");
  assert.deepEqual(supports.archetypes, []);
  assert.deepEqual(supports.instances, []);
  assert.deepEqual(supports.layoutScales, {});
  assert.doesNotMatch(
    JSON.stringify(supports),
    /project-vendy|project-kaizen-metrics|capital-ninjaone/,
  );
});

test("Kaizen allocation remains development-only without a broad coverage claim", async () => {
  const [projects, skills, allocations] = await Promise.all([
    readJson(
      "public/career-world/layers/structures/manifests/project-structures-r1.json",
    ),
    readJson(
      "public/career-world/layers/structures/manifests/skill-structures-r1.json",
    ),
    readJson(
      "public/career-world/layers/structures/manifests/"
        + "ninjaone-city-allocations-r1.json",
    ),
  ]);
  const allocation = allocations.allocations[0];
  const archetypeById = new Map(
    skills.archetypes.map((archetype) => [archetype.id, archetype]),
  );

  assert.equal(allocations.allocations.length, 1);
  assert.equal(allocation.ownerId, "project-kaizen-agent");
  assert.equal(allocations.minimumVerifiedLandCoverage, 0);
  assert.equal(allocations.verifiedLandCoverage, 0);
  assert.match(JSON.stringify(allocations.policy), /development-only/i);

  const placedNodes = [
    ...projects.nodes.map((project) => ({
      id: project.id,
      territoryAnchor: project.territoryAnchor,
      footprintSpan: project.footprintSpan,
      groundAnchor: project.groundAnchor,
    })),
    ...skills.instances.map((instance) => {
      const archetype = archetypeById.get(instance.archetypeId);
      assert.ok(archetype, instance.id);
      return {
        id: instance.id,
        territoryAnchor: instance.territoryAnchor,
        footprintSpan: archetype.footprintSpan,
        groundAnchor: archetype.groundAnchor,
      };
    }),
  ];
  for (const node of placedNodes) {
    const [x, y] = node.territoryAnchor;
    const [width, height] = node.footprintSpan;
    const [groundX, groundY] = node.groundAnchor;
    const [left, top] = allocation.bounds.origin;
    const [spanX, spanY] = allocation.bounds.span;
    assert.ok(x - width * groundX >= left, node.id);
    assert.ok(x + width * (1 - groundX) <= left + spanX, node.id);
    assert.ok(y - height * groundY >= top, node.id);
    assert.ok(y + height * (1 - groundY) <= top + spanY, node.id);
  }
});

test("NinjaOne requires one authored town plan for Kaizen Agent", async () => {
  const projects = await readJson(
    "public/career-world/layers/structures/manifests/project-structures-r1.json",
  );
  const skills = await readJson(
    "public/career-world/layers/structures/manifests/skill-structures-r1.json",
  );
  const supports = await readJson(
    "public/career-world/layers/structures/manifests/support-structures-r1.json",
  );
  const infrastructure = await readJson(
    "public/career-world/layers/infrastructure/manifests/ninjaone-project-towns-r1.json",
  );
  assert.equal(
    infrastructure.coordinateSpace,
    "normalized-world-top-left",
  );
  assert.equal(infrastructure.minimumTier, "site");
  assert.equal(infrastructure.siteMinimumTier, "site");
  assert.equal(infrastructure.towns.length, projects.nodes.length);
  assert.deepEqual(
    infrastructure.towns.map(({ projectId }) => projectId).sort(),
    projects.nodes.map(({ id }) => id).sort(),
  );
  assert.equal("capitalCampus" in infrastructure, false);
  const planEntries = infrastructure.towns.map((town) => ({
    id: town.id,
    ownerId: town.projectId,
    ownerKind: "project",
    townPlan: town.townPlan,
  }));
  assert.equal(planEntries.length, 1);
  assert.equal(
    new Set(planEntries.map(({ id }) => id)).size,
    planEntries.length,
  );

  const featureIds = [];
  const assertNormalizedPoint = (point, label) => {
    assert.equal(point.length, 2, label);
    assert.ok(
      point.every(
        (value) => Number.isFinite(value) && value >= 0 && value <= 1,
      ),
      label,
    );
  };
  const distanceToStreetSegment = (point, start, end) => {
    const [pointX, pointY] = [
      point[0] * WORLD_PLANE.width,
      point[1] * WORLD_PLANE.height,
    ];
    const [startX, startY] = [
      start[0] * WORLD_PLANE.width,
      start[1] * WORLD_PLANE.height,
    ];
    const [endX, endY] = [
      end[0] * WORLD_PLANE.width,
      end[1] * WORLD_PLANE.height,
    ];
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const squaredLength = deltaX ** 2 + deltaY ** 2;
    const progress = squaredLength === 0
      ? 0
      : Math.max(0, Math.min(1, (
        (pointX - startX) * deltaX
        + (pointY - startY) * deltaY
      ) / squaredLength));
    return Math.hypot(
      pointX - (startX + deltaX * progress),
      pointY - (startY + deltaY * progress),
    );
  };
  for (const entry of planEntries) {
    const { ownerKind, ownerId, townPlan } = entry;
    const entranceByStructureId = new Map(
      townPlan.entrances.map((entrance) => [
        entrance.structureId,
        entrance,
      ]),
    );
    assert.ok(townPlan, `${entry.id} needs a town plan`);
    assert.ok(townPlan.blocks.length > 0, `${entry.id} needs formed blocks`);
    assert.ok(townPlan.streets.length > 0, `${entry.id} needs streets`);
    assert.ok(townPlan.plazas.length > 0, `${entry.id} needs a plaza`);
    assert.ok(
      townPlan.terrainSeams.length > 0,
      `${entry.id} needs an authored terrain transition`,
    );
    assert.ok(
      townPlan.pedestrianLoops.length > 0,
      `${entry.id} needs a pedestrian loop`,
    );
    assert.ok(
      townPlan.streets.some(
        ({ kind }) => kind === "arterial" || kind === "collector",
      ),
      `${entry.id} needs a terrain-facing primary street`,
    );
    assert.ok(
      townPlan.streets.some(
        ({ kind }) => (
          kind === "local"
          || kind === "service"
          || kind === "stairs"
        ),
      ),
      `${entry.id} needs a local street or grade transition`,
    );

    const mountedStructureIds = [
      ownerId,
      ...skills.instances
        .filter((instance) => (
          instance.ownerKind === ownerKind && instance.ownerId === ownerId
        ))
        .map(({ id }) => id),
      ...supports.instances
        .filter((instance) => (
          instance.ownerKind === ownerKind && instance.ownerId === ownerId
        ))
        .map(({ id }) => id),
    ];
    const isAuthoredFoundation = ownerId === "project-kaizen-agent";
    const mountedStructureIdSet = new Set(mountedStructureIds);
    const plateOwnedStructureIds = isAuthoredFoundation
      ? townPlan.blocks
        .flatMap(({ structureIds }) => structureIds)
        .filter((id) => !mountedStructureIdSet.has(id))
      : [];
    const retainedStructureIds = [
      ...mountedStructureIds,
      ...plateOwnedStructureIds,
    ].sort();
    assert.equal(
      new Set(retainedStructureIds).size,
      retainedStructureIds.length,
      `${entry.id} retained structure IDs must be unique`,
    );
    const retainedStructures = [
      ...projects.nodes
        .filter(({ id }) => id === ownerId)
        .map(({ id, territoryAnchor }) => ({ id, territoryAnchor })),
      ...skills.instances
        .filter((instance) => (
          instance.ownerKind === ownerKind && instance.ownerId === ownerId
        ))
        .map(({ id, territoryAnchor }) => ({ id, territoryAnchor })),
      ...supports.instances
        .filter((instance) => (
          instance.ownerKind === ownerKind && instance.ownerId === ownerId
        ))
        .map(({ id, territoryAnchor }) => ({ id, territoryAnchor })),
    ];
    assert.deepEqual(
      retainedStructures.map(({ id }) => id).sort(),
      [...mountedStructureIds].sort(),
      `${entry.id} needs one anchor for every mounted structure`,
    );
    assert.equal(
      plateOwnedStructureIds.length > 0,
      isAuthoredFoundation,
      `${entry.id} must declare plate-owned semantics only for its authored foundation`,
    );

    for (const block of townPlan.blocks) {
      featureIds.push(block.id);
      assert.ok(block.points.length >= 3, block.id);
      block.points.forEach((point, index) => {
        assertNormalizedPoint(point, `${block.id} point ${index}`);
      });
    }
    for (const street of townPlan.streets) {
      featureIds.push(street.id);
      assert.ok(street.waypoints.length >= 2, street.id);
      street.waypoints.forEach((point, index) => {
        assertNormalizedPoint(point, `${street.id} waypoint ${index}`);
      });
      for (
        let segment = 1;
        segment < street.waypoints.length;
        segment += 1
      ) {
        for (const structure of retainedStructures) {
          const segmentStart = street.waypoints[segment - 1];
          const segmentEnd = street.waypoints[segment];
          const entrance = entranceByStructureId.get(structure.id);
          const reachesRegisteredEntrance = entrance
            ? distanceToStreetSegment(
              entrance.point,
              segmentStart,
              segmentEnd,
            ) <= 6
            : false;
          assert.ok(
            distanceToStreetSegment(
              structure.territoryAnchor,
              segmentStart,
              segmentEnd,
            ) >= 1 || reachesRegisteredEntrance,
            `${street.id} segment ${segment} must not run through `
              + `${structure.id}`,
          );
        }
      }
    }
    for (const plaza of townPlan.plazas) {
      featureIds.push(plaza.id);
      assert.ok(plaza.points.length >= 3, plaza.id);
      plaza.points.forEach((point, index) => {
        assertNormalizedPoint(point, `${plaza.id} point ${index}`);
      });
    }
    for (const seam of townPlan.terrainSeams) {
      featureIds.push(seam.id);
      assert.ok(seam.waypoints.length >= 2, seam.id);
      seam.waypoints.forEach((point, index) => {
        assertNormalizedPoint(point, `${seam.id} waypoint ${index}`);
      });
    }

    const loopIds = new Set();
    for (const loop of townPlan.pedestrianLoops) {
      featureIds.push(loop.id);
      loopIds.add(loop.id);
      assert.ok(loop.waypoints.length >= 4, loop.id);
      loop.waypoints.forEach((point, index) => {
        assertNormalizedPoint(point, `${loop.id} waypoint ${index}`);
      });
      assert.deepEqual(
        loop.waypoints.at(-1),
        loop.waypoints[0],
        `${loop.id} must be closed`,
      );
    }
    const blockStructureIds = townPlan.blocks
      .flatMap(({ structureIds }) => structureIds)
      .sort();
    const entranceStructureIds = townPlan.entrances
      .map(({ structureId }) => structureId)
      .sort();
    assert.deepEqual(
      blockStructureIds,
      retainedStructureIds,
      `${entry.id} must assign every retained structure to exactly one block`,
    );
    assert.deepEqual(
      entranceStructureIds,
      retainedStructureIds,
      `${entry.id} must give every retained structure exactly one entrance`,
    );
    for (const entrance of townPlan.entrances) {
      assertNormalizedPoint(
        entrance.point,
        `${entry.id} ${entrance.structureId} entrance`,
      );
      assert.ok(loopIds.has(entrance.loopId), entrance.structureId);
      const loop = townPlan.pedestrianLoops.find(
        ({ id }) => id === entrance.loopId,
      );
      assert.ok(
        loop.waypoints.some(
          (point) => (
            point[0] === entrance.point[0]
            && point[1] === entrance.point[1]
          ),
        ),
        `${entrance.structureId} entrance must touch its pedestrian loop`,
      );
    }
  }

  assert.equal(new Set(featureIds).size, featureIds.length);
  const serialized = JSON.stringify(infrastructure);
  for (const retiredField of [
    "skillSiteFoundation",
    "routes",
    "projectPadScale",
    "skillPadScale",
    "retainingSkillInstanceIds",
    "settlementFabric",
    "connectorWaypoints",
    "skillInstanceIds",
  ]) {
    assert.equal(
      serialized.includes(`"${retiredField}"`),
      false,
      `${retiredField} must not preserve the pad-and-spoke contract`,
    );
  }
});

test("town-plan model rejects invalid topology and structure coverage", async () => {
  const model = await readFile(path.join(
    root,
    "features/career-world/layers/infrastructure/model/projectTowns.ts",
  ), "utf8");

  assert.match(
    model,
    /function requireUniqueId\([\s\S]*seenIds\.has\(id\)[\s\S]*unique, non-empty ID/,
  );
  assert.match(
    model,
    /const featureIds = new Set<string>\(\)[\s\S]*manifest\.towns\.map[\s\S]*townPlan: parseTownPlan\([\s\S]*featureIds,/,
    "Project towns must share one feature-ID namespace.",
  );
  assert.doesNotMatch(
    model,
    /CAPITAL_CAMPUS_INFRASTRUCTURE|manifest\.capitalCampus/,
  );
  assert.match(
    model,
    /!samePoint\(waypoints\[0\], waypoints\[waypoints\.length - 1\]\)[\s\S]*pedestrian loop must be closed/,
  );
  assert.match(
    model,
    /!structureIds\.has\(entrance\.structureId\)[\s\S]*\|\| !loop[\s\S]*!loop\.waypoints\.some[\s\S]*invalid town-plan entrance/,
  );
  assert.match(
    model,
    /function requireCompleteStructureCoverage\([\s\S]*new Set\(references\)\.size !== references\.length[\s\S]*references\.some\(\(id\) => !structureIds\.has\(id\)\)[\s\S]*every retained structure exactly once/,
  );
  assert.match(
    model,
    /requireCompleteStructureCoverage\([\s\S]*blocks\.flatMap[\s\S]*requireCompleteStructureCoverage\([\s\S]*entrances\.map/,
  );
  assert.match(
    model,
    /AUTHORED_FOUNDATION_PROJECT_IDS[\s\S]*plateOwnedStructureIds[\s\S]*no legacy support sprites/,
    "Authored foundations retain route IDs without restoring support sprites.",
  );
});

test("town-plan rendering keeps mixed surfaces sparse and hierarchical", async () => {
  const scene = await readFile(path.join(
    root,
    "features/career-world/composition/WorldScene.tsx",
  ), "utf8");
  const layer = await readFile(path.join(
    root,
    "features/career-world/layers/infrastructure/components/InfrastructureLayer.tsx",
  ), "utf8");
  const model = await readFile(path.join(
    root,
    "features/career-world/layers/infrastructure/model/projectTowns.ts",
  ), "utf8");

  assert.match(layer, /cameraViewBox\(\s*camera,/);
  assert.match(layer, /<TownPlanNode/);
  assert.match(layer, /plan=\{town\.townPlan\}/);
  assert.doesNotMatch(layer, /CAPITAL_CAMPUS_INFRASTRUCTURE/);
  assert.match(layer, /data-capital-campus-count=\{0\}/);
  assert.match(layer, /data-town-plan-owner-id=\{ownerId\}/);
  assert.match(layer, /data-block-count=\{plan\.blocks\.length\}/);
  assert.match(layer, /data-street-kind=\{street\.kind\}/);
  assert.match(layer, /data-road-layer-count=\{3\}/);
  assert.match(layer, /data-road-grammar="hierarchical-mixed-surface"/);
  assert.match(layer, /data-road-union="streets-by-hierarchy"/);
  assert.match(layer, /data-ground-union="plazas-only"/);
  assert.match(layer, /data-paved-block-count=\{0\}/);
  assert.match(layer, /<TownPlanStreetGroup/);
  assert.match(layer, /className="town-plan__road-beds"/);
  assert.match(layer, /className="town-plan__plaza-material"/);
  assert.doesNotMatch(layer, /<mask[\s\S]*id=\{districtMaskId\}/);
  assert.doesNotMatch(layer, /function townPlanGroundHull\(/);
  assert.doesNotMatch(layer, /town-plan__road-mask-pedestrian-loop/);
  assert.match(layer, /data-entrance-structure-id=\{entrance\.structureId\}/);
  assert.match(
    layer,
    /className="town-plan__site-surface town-plan__site-surface--standard"[\s\S]*opacity: infrastructureVisibility,[\s\S]*transitionDuration: "0ms"/,
  );
  assert.match(
    layer,
    /AUTHORED_TOWN_FOUNDATION_OWNER_IDS[\s\S]*KAIZEN_AGENT_TOWN_OWNER_ID/,
  );
  assert.match(
    layer,
    /scope === "all"[\s\S]*!AUTHORED_TOWN_FOUNDATION_OWNER_IDS\.has\(ownerId\)/,
  );
  assert.match(layer, /scope="procedural-only"/);
  assert.match(
    layer,
    /data-authored-town-foundation-count=\{[\s\S]*AUTHORED_TOWN_FOUNDATION_OWNER_IDS\.size/,
  );
  assert.doesNotMatch(layer, /scope="kaizen-only"|kaizenOverviewVisibility/);
  assert.match(layer, /detailState\.shouldLoadSiteAssets/);
  assert.match(layer, /resolveAtomicTierVisibility\(/);
  assert.match(
    model,
    /PROJECT_TOWN_INFRASTRUCTURE_POLICY[\s\S]*minimumTier: "site"/,
  );
  assert.match(
    layer,
    /kind === "arterial" \|\| kind === "collector"/,
  );
  assert.match(layer, /visibleStreets\.map\(\(street\) =>/);
  assert.match(layer, /points=\{svgPoints\(street\.waypoints\)\}/);
  const orderedGroups = [
    "town-plan__ground-surfaces",
    "town-plan__terrain-seams",
    "town-plan__road-networks",
    "town-plan__entrances",
  ];
  for (let index = 1; index < orderedGroups.length; index += 1) {
    assert.ok(
      layer.indexOf(orderedGroups[index - 1])
        < layer.indexOf(orderedGroups[index]),
      `${orderedGroups[index - 1]} must render before ${orderedGroups[index]}`,
    );
  }
  assert.doesNotMatch(
    `${model}\n${layer}`,
    /SKILL_SITE_FOUNDATION|ProjectTownRoute|SettlementFabric|skill-foundation|settlement-fabric|data-route-|plinth|spoke|semantic-route/i,
  );
  assert.doesNotMatch(
    layer,
    /town-plan__street-masonry-joints|TownPlanCloseRoadDetails|town-plan__entrance-landing/,
  );
  const roadMaterial = await stat(path.join(
    root,
    "public/career-world/layers/infrastructure/textures/town-road-r1.webp",
  ));
  assert.ok(roadMaterial.size > 100_000, "road paving must be authored");
  const groundMaterial = await stat(path.join(
    root,
    "public/career-world/layers/infrastructure/textures/town-ground-r1.webp",
  ));
  assert.ok(
    groundMaterial.size > 100_000,
    "plaza ground material must be authored",
  );
  assert.ok(
    scene.indexOf("<TerritoryLandform")
      < scene.indexOf("<InfrastructureLayer"),
  );
  assert.ok(
    scene.indexOf("<InfrastructureLayer")
      < scene.indexOf("<StructuresLayer"),
  );
});

test("capital visibility uses the centralized semantic-zoom policy", () => {
  const policy = { minimumTier: "territory" };
  const world = resolveDetailState({
    origin: [0, 0],
    span: [1, 1],
  });
  const territory = resolveDetailState({
    origin: [0.2, 0.2],
    span: [0.52, 0.52],
  });
  const capital = resolveDetailState({
    origin: [0.4, 0.4],
    span: [0.14, 0.14],
  });

  assert.equal(resolveNodeVisibility(policy, world), 0);
  assert.equal(resolveNodeVisibility(policy, territory), 1);
  assert.equal(resolveNodeVisibility(policy, capital), 1);
});

test("structures use deterministic ground-anchor depth ordering", async () => {
  const layer = await readFile(path.join(
    root,
    "features/career-world/layers/structures/components/StructuresLayer.tsx",
  ), "utf8");
  const comparator = layer.match(
    /function compareStructureDepth\([\s\S]*?\n\}/,
  )?.[0];

  assert.ok(comparator, "Structure depth ordering needs an explicit comparator");
  assert.match(
    comparator,
    /left\.anchor\[1\] - right\.anchor\[1\][\s\S]*left\.anchor\[0\] - right\.anchor\[0\][\s\S]*left\.id\.localeCompare\(right\.id\)/,
  );
  assert.match(
    layer,
    /const mountedStructures:[\s\S]*CAPITAL_STRUCTURES\.map[\s\S]*PROJECT_STRUCTURES\.filter[\s\S]*SKILL_STRUCTURE_INSTANCES\.filter[\s\S]*SUPPORT_STRUCTURE_INSTANCES\.filter[\s\S]*RENDERED_AMBIENT_STRUCTURE_INSTANCES\.filter[\s\S]*\.sort\(compareStructureDepth\)/,
  );
  assert.match(layer, /\{mountedStructures\.map\(\(\{ node \}\) => node\)\}/);
});

test("structures share composition camera, LOD, and light contracts", async () => {
  const scene = await readFile(path.join(
    root,
    "features/career-world/composition/WorldScene.tsx",
  ), "utf8");
  const layer = await readFile(path.join(
    root,
    "features/career-world/layers/structures/components/StructuresLayer.tsx",
  ), "utf8");
  const model = await readFile(path.join(
    root,
    "features/career-world/layers/structures/model/capitals.ts",
  ), "utf8");
  const styles = await readFile(path.join(
    root,
    "features/career-world/styles/career-world.css",
  ), "utf8");

  assert.ok(
    scene.indexOf("<TerritoryLandform")
      < scene.indexOf("<StructuresLayer"),
  );
  assert.ok(
    scene.indexOf("<StructuresLayer")
      < scene.indexOf("<WorldInterface"),
  );
  assert.match(scene, /<StructuresLayer[\s\S]*camera=\{camera\}/);
  assert.match(scene, /<StructuresLayer[\s\S]*detailState=\{detailState\}/);
  assert.match(scene, /<StructuresLayer[\s\S]*light=\{WORLD_LIGHT\}/);
  assert.match(layer, /cameraViewBox\(\s*camera,/);
  assert.match(layer, /resolveNodeVisibility\(CAPITAL_NODE_POLICY/);
  assert.match(layer, /data-light-source=\{light\.id\}/);
  assert.match(layer, /data-capital-id=\{capital\.id\}/);
  assert.match(layer, /LOD_PRESENTATION_TRANSITION_MS/);
  assert.match(
    styles,
    /\.capital-structures,[\s\S]*?\.support-structures,[\s\S]*?\.town-pedestrians,[\s\S]*?transition-property: opacity/,
  );
  assert.doesNotMatch(layer, /cameraLayerStyle/);
  assert.equal(layer.includes("rotate("), false);
  assert.match(model, /TERRITORIES\.find/);
});

test("NinjaOne controls expose progressive map destinations without affecting layout", async () => {
  const scene = await readFile(path.join(
    root,
    "features/career-world/composition/WorldScene.tsx",
  ), "utf8");
  const controls = await readFile(path.join(
    root,
    "features/career-world/layers/interface/components/WorldInterface.tsx",
  ), "utf8");
  assert.match(
    scene,
    /animateTo\(territory\.focusView, territory\.id\)/,
  );
  assert.match(scene, /resolveProjectFocusView/);
  assert.match(scene, /SUPPORT_STRUCTURE_INSTANCES\.filter/);
  assert.match(
    scene,
    /supportingStructures\.map\([\s\S]*footprintSpan: archetype\.footprintSpan/,
  );
  assert.match(
    scene,
    /animateTo\(project\.focusView, project\.id\)/,
  );
  assert.doesNotMatch(scene, /NINJAONE_SETTLEMENT_VIEW/);
  assert.match(controls, /className="career-world__world-markers"/);
  assert.match(
    controls,
    /className="career-world__world-markers"[\s\S]*position: "absolute"/,
  );
  assert.match(
    controls,
    /<NinjaOneWorldSeal[\s\S]*onFocus=\{onFocus\}/,
  );
  assert.match(
    controls,
    /projectDestinations\.map\([\s\S]*<ProjectTownDestination/,
  );
  assert.match(controls, /data-project-destination-id=/);
  assert.match(controls, /resolveWorldDestinationVisibility\(detailState\)/);
  assert.match(controls, /resolveProjectDestinationVisibility\(detailState\)/);
  assert.match(controls, /supportingSkillCount/);
  assert.match(
    controls,
    /onClick=\{\(\) => onFocus\(destination\.id\)\}/,
  );
  assert.match(
    controls,
    /territories\.map\([\s\S]*onClick=\{\(\) => onFocus\(territory\.id\)\}/,
  );
  assert.match(scene, /const LANDMARK_LABELS:/);
  assert.match(
    scene,
    /SKILL_STRUCTURE_INSTANCES\.map\([\s\S]*anchor: skillPresentationStructure\(instance\)\.territoryAnchor/,
  );
  assert.match(scene, /\[showLandmarkLabels, setShowLandmarkLabels\]/);
  assert.match(controls, /<LandmarkLabels/);
  assert.match(controls, /data-landmark-label-count=/);
  assert.match(controls, /data-landmark-labels-visible=/);
  assert.match(controls, /aria-pressed=\{showLandmarkLabels\}/);
  assert.match(controls, /onClick=\{onToggleLandmarkLabels\}/);
  assert.match(controls, />\s*Labels\s*</);
});
