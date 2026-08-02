#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const WORLD_PLANE = Object.freeze({ width: 1672, height: 941 });
const LAYER_PATH = path.join(
  ROOT,
  "features",
  "career-world",
  "layers",
  "infrastructure",
  "components",
  "InfrastructureLayer.tsx",
);
const FABRIC_MANIFEST_PATH = path.join(
  ROOT,
  "public",
  "career-world",
  "layers",
  "structures",
  "manifests",
  "town-fabric-r1.json",
);
const TOWN_MANIFEST_PATH = path.join(
  ROOT,
  "public",
  "career-world",
  "layers",
  "infrastructure",
  "manifests",
  "ninjaone-project-towns-r1.json",
);
const TERRAIN_HEIGHT_PATH = path.join(
  ROOT,
  "public",
  "career-world",
  "layers",
  "territory-landform",
  "fields",
  "terrain-height-r4.png",
);
const TERRAIN_SLOPE_PATH = path.join(
  ROOT,
  "public",
  "career-world",
  "layers",
  "territory-landform",
  "fields",
  "terrain-slope-r4.png",
);
const STRUCTURE_MANIFEST_DIR = path.join(
  ROOT,
  "public",
  "career-world",
  "layers",
  "structures",
  "manifests",
);
const INDIVIDUAL_STRUCTURE_TOWN_OWNER_IDS = new Set([
  "project-kaizen-agent",
]);
const KAIZEN_AGENT_OWNER_ID = "project-kaizen-agent";
const ENTRANCE_CONTACT_RADIUS = 6;

function publicPath(assetPath) {
  return path.join(ROOT, "public", ...assetPath.slice(1).split("/"));
}

function parseNumberRecord(source, constantName) {
  const body = source.match(new RegExp(
    `const ${constantName}[\\s\\S]*?= Object\\.freeze\\(\\{`
      + `([\\s\\S]*?)\\}\\s*(?:satisfies[\\s\\S]*?)?\\);`,
  ))?.[1];
  if (!body) {
    throw new TypeError(`${constantName} is missing from InfrastructureLayer.`);
  }
  return Object.fromEntries(
    [...body.matchAll(/(?:"([^"]+)"|(\w+)):\s*([0-9.]+),/g)]
      .map((match) => [match[1] ?? match[2], Number(match[3])]),
  );
}

function parseNumberConstant(source, constantName) {
  const value = Number(source.match(new RegExp(
    `const ${constantName} = ([0-9.]+);`,
  ))?.[1]);
  if (!Number.isFinite(value)) {
    throw new TypeError(`${constantName} is missing from InfrastructureLayer.`);
  }
  return value;
}

async function readSurfaceProfile() {
  const source = await readFile(LAYER_PATH, "utf8");
  return {
    edgeWidthAddition: parseNumberConstant(
      source,
      "TOWN_PLAN_STREET_EDGE_WIDTH_ADDITION",
    ),
    streetWidths: parseNumberRecord(
      source,
      "TOWN_PLAN_STREET_SURFACE_WIDTH",
    ),
    plazaScales: parseNumberRecord(
      source,
      "TOWN_PLAN_PLAZA_VISUAL_SCALE",
    ),
    kaizenPlazaScales: parseNumberRecord(
      source,
      "KAIZEN_AGENT_PLAZA_VISUAL_SCALE",
    ),
    kaizenRoadWidthScale: parseNumberConstant(
      source,
      "KAIZEN_AGENT_ROAD_WIDTH_SCALE",
    ),
  };
}

async function readStructureManifests() {
  const readManifest = (name) => readFile(
    path.join(STRUCTURE_MANIFEST_DIR, name),
    "utf8",
  ).then(JSON.parse);
  const [projects, skills, support, ambient] = await Promise.all([
    readManifest("project-structures-r1.json"),
    readManifest("skill-structures-r1.json"),
    readManifest("support-structures-r1.json"),
    readManifest("ambient-structures-r1.json"),
  ]);
  return { ambient, projects, skills, support };
}

function worldPoint([x, y]) {
  return [x * WORLD_PLANE.width, y * WORLD_PLANE.height];
}

function sourcePixelToWorld(instance, x, y, width, height) {
  const { origin, span } = instance.worldBounds;
  return [
    (origin[0] + ((x + 0.5) / width) * span[0]) * WORLD_PLANE.width,
    (origin[1] + ((y + 0.5) / height) * span[1]) * WORLD_PLANE.height,
  ];
}

function worldBoundsToPixelBounds(
  instance,
  [minimumX, minimumY, maximumX, maximumY],
  width,
  height,
) {
  const origin = worldPoint(instance.worldBounds.origin);
  const span = [
    instance.worldBounds.span[0] * WORLD_PLANE.width,
    instance.worldBounds.span[1] * WORLD_PLANE.height,
  ];
  return [
    Math.max(0, Math.floor(((minimumX - origin[0]) / span[0]) * width)),
    Math.max(0, Math.floor(((minimumY - origin[1]) / span[1]) * height)),
    Math.min(
      width - 1,
      Math.ceil(((maximumX - origin[0]) / span[0]) * width),
    ),
    Math.min(
      height - 1,
      Math.ceil(((maximumY - origin[1]) / span[1]) * height),
    ),
  ];
}

function squaredDistanceToSegment(point, start, end) {
  const segmentX = end[0] - start[0];
  const segmentY = end[1] - start[1];
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (lengthSquared === 0) {
    return (
      (point[0] - start[0]) ** 2
      + (point[1] - start[1]) ** 2
    );
  }
  const projection = Math.max(0, Math.min(
    1,
    (
      (point[0] - start[0]) * segmentX
      + (point[1] - start[1]) * segmentY
    ) / lengthSquared,
  ));
  const closest = [
    start[0] + projection * segmentX,
    start[1] + projection * segmentY,
  ];
  return (
    (point[0] - closest[0]) ** 2
    + (point[1] - closest[1]) ** 2
  );
}

function roadSegments(plan, profile, widthScale) {
  return plan.streets.flatMap((street) => {
    const points = street.waypoints.map(worldPoint);
    const radius = (
      profile.streetWidths[street.kind]
      + profile.edgeWidthAddition
    ) * widthScale * 0.5;
    return points.slice(1).map((end, index) => ({
      end,
      radius,
      start: points[index],
      streetId: street.id,
    }));
  });
}

function minimumRoadClearance(point, segments) {
  return Math.max(0, Math.min(
    ...segments.map(({ end, radius, start }) => (
      Math.sqrt(squaredDistanceToSegment(point, start, end)) - radius
    )),
  ));
}

function sampleWorldSegment(start, end) {
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const steps = Math.max(1, Math.ceil(length));
  return Array.from({ length: steps + 1 }, (_, index) => {
    const progress = index / steps;
    return [
      start[0] + (end[0] - start[0]) * progress,
      start[1] + (end[1] - start[1]) * progress,
    ];
  });
}

function auditPlanRoadAlignment(plan, profile, widthScale) {
  const segments = roadSegments(plan, profile, widthScale);
  const entranceReports = plan.entrances.map(({ point, structureId }) => {
    const clearance = minimumRoadClearance(worldPoint(point), segments);
    return { clearance, connected: clearance <= 0.01, structureId };
  });
  const loopReports = plan.pedestrianLoops.map((loop) => {
    const points = loop.waypoints.map(worldPoint);
    const clearances = points.slice(1).flatMap((end, index) => (
      sampleWorldSegment(points[index], end)
        .map((point) => minimumRoadClearance(point, segments))
    ));
    return {
      id: loop.id,
      maximumClearance: Math.max(...clearances, 0),
      offRoadSamples: clearances.filter((clearance) => clearance > 0.01).length,
      sampleCount: clearances.length,
    };
  });

  return {
    connectedEntranceCount: entranceReports.filter(({ connected }) => connected)
      .length,
    disconnectedEntrances: entranceReports.filter(({ connected }) => !connected),
    pedestrianLoopOffRoadSamples: loopReports.reduce(
      (total, { offRoadSamples }) => total + offRoadSamples,
      0,
    ),
    pedestrianLoopReports: loopReports,
    registeredEntranceCount: entranceReports.length,
  };
}

function markSegment(mask, instance, start, end, width, imageWidth, imageHeight) {
  const radius = width * 0.5;
  const pixelBounds = worldBoundsToPixelBounds(
    instance,
    [
      Math.min(start[0], end[0]) - radius,
      Math.min(start[1], end[1]) - radius,
      Math.max(start[0], end[0]) + radius,
      Math.max(start[1], end[1]) + radius,
    ],
    imageWidth,
    imageHeight,
  );
  const [startX, startY, endX, endY] = pixelBounds;
  if (startX > endX || startY > endY) {
    return;
  }
  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      if (
        squaredDistanceToSegment(
          sourcePixelToWorld(
            instance,
            x,
            y,
            imageWidth,
            imageHeight,
          ),
          start,
          end,
        ) <= radius ** 2
      ) {
        mask[y * imageWidth + x] = 1;
      }
    }
  }
}

function markPolyline(
  mask,
  instance,
  points,
  width,
  imageWidth,
  imageHeight,
) {
  const worldPoints = points.map(worldPoint);
  for (let index = 1; index < worldPoints.length; index += 1) {
    markSegment(
      mask,
      instance,
      worldPoints[index - 1],
      worldPoints[index],
      width,
      imageWidth,
      imageHeight,
    );
  }
}

function pointInPolygon([x, y], polygon) {
  let inside = false;
  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index, index += 1
  ) {
    const [startX, startY] = polygon[previous];
    const [endX, endY] = polygon[index];
    if (
      (startY > y) !== (endY > y)
      && x < (
        ((endX - startX) * (y - startY)) / (endY - startY)
        + startX
      )
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function markPolygon(
  mask,
  instance,
  points,
  imageWidth,
  imageHeight,
) {
  const polygon = points.map(worldPoint);
  const xs = polygon.map(([x]) => x);
  const ys = polygon.map(([, y]) => y);
  const [startX, startY, endX, endY] = worldBoundsToPixelBounds(
    instance,
    [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
    imageWidth,
    imageHeight,
  );
  if (startX > endX || startY > endY) {
    return;
  }
  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      if (
        pointInPolygon(
          sourcePixelToWorld(
            instance,
            x,
            y,
            imageWidth,
            imageHeight,
          ),
          polygon,
        )
      ) {
        mask[y * imageWidth + x] = 1;
      }
    }
  }
}

function scaledPlazaPoints(plaza, scale) {
  const center = plaza.points.reduce(
    ([totalX, totalY], [x, y]) => [totalX + x, totalY + y],
    [0, 0],
  ).map((value) => value / plaza.points.length);
  return plaza.points.map(([x, y]) => [
    center[0] + (x - center[0]) * scale,
    center[1] + (y - center[1]) * scale,
  ]);
}

function countMask(mask) {
  return mask.reduce((total, value) => total + value, 0);
}

function individualStructureDescriptors(ownerId, manifests) {
  const skillArchetypes = new Map(
    manifests.skills.archetypes.map((archetype) => [archetype.id, archetype]),
  );
  const supportArchetypes = new Map(
    manifests.support.archetypes.map((archetype) => [archetype.id, archetype]),
  );
  const ambientArchetypes = new Map(
    manifests.ambient.archetypes.map((archetype) => [archetype.id, archetype]),
  );
  const attachArchetype = (instance, archetypes) => {
    const archetype = archetypes.get(instance.archetypeId);
    if (!archetype) {
      throw new TypeError(`${instance.id} has no structure archetype.`);
    }
    return {
      ...archetype,
      id: instance.id,
      territoryAnchor: instance.territoryAnchor,
    };
  };

  return [
    ...manifests.projects.nodes.filter(({ id }) => id === ownerId),
    ...manifests.skills.instances
      .filter((instance) => instance.ownerId === ownerId)
      .map((instance) => attachArchetype(instance, skillArchetypes)),
    ...manifests.support.instances
      .filter((instance) => instance.ownerId === ownerId)
      .map((instance) => attachArchetype(instance, supportArchetypes)),
    ...manifests.ambient.instances
      .filter((instance) => instance.ownerId === ownerId)
      .map((instance) => attachArchetype(instance, ambientArchetypes)),
  ];
}

async function readScalarField(fieldPath) {
  const { data, info } = await sharp(fieldPath)
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.width !== WORLD_PLANE.width || info.height !== WORLD_PLANE.height) {
    throw new TypeError(`${fieldPath} does not match the world plane.`);
  }
  return { data, info };
}

function scalarFieldValue(field, x, y) {
  const pixelX = Math.max(0, Math.min(field.info.width - 1, Math.round(x)));
  const pixelY = Math.max(0, Math.min(field.info.height - 1, Math.round(y)));
  return field.data[
    (pixelY * field.info.width + pixelX) * field.info.channels
  ];
}

function terrainSampleStats(samples) {
  const slopes = samples.map(({ slope }) => slope);
  const heights = samples.map(({ height }) => height);
  const maximumHeight = Math.max(...heights);
  const minimumHeight = Math.min(...heights);
  return {
    heightRange: maximumHeight - minimumHeight,
    maximumHeight,
    maximumSlope: Math.max(...slopes),
    meanSlope: slopes.reduce((total, slope) => total + slope, 0)
      / slopes.length,
    minimumHeight,
    sampleCount: samples.length,
  };
}

function sampleTerrainAt(terrain, x, y) {
  return {
    height: scalarFieldValue(terrain.height, x, y),
    slope: scalarFieldValue(terrain.slope, x, y),
  };
}

function auditStreetTopography(street, profile, terrain) {
  const points = street.waypoints.map(worldPoint);
  const radius = (
    profile.streetWidths[street.kind]
    + profile.edgeWidthAddition
  ) * profile.kaizenRoadWidthScale * 0.5;
  const samples = [];

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const segmentX = end[0] - start[0];
    const segmentY = end[1] - start[1];
    const length = Math.max(1, Math.hypot(segmentX, segmentY));
    const normal = [-segmentY / length, segmentX / length];
    for (const point of sampleWorldSegment(start, end)) {
      for (const offset of [-radius, 0, radius]) {
        samples.push(sampleTerrainAt(
          terrain,
          point[0] + normal[0] * offset,
          point[1] + normal[1] * offset,
        ));
      }
    }
  }

  return { id: street.id, ...terrainSampleStats(samples) };
}

function auditStructurePadTopography(structure, terrain) {
  const [centerX, anchorY] = worldPoint(structure.territoryAnchor);
  const radiusX = Math.max(
    2.4,
    structure.footprintSpan[0] * WORLD_PLANE.width * 0.46,
  );
  const radiusY = Math.max(
    1.1,
    structure.footprintSpan[1] * WORLD_PLANE.height * 0.09,
  );
  const centerY = anchorY - radiusY * 0.32;
  const samples = [];

  for (
    let y = Math.floor(centerY - radiusY);
    y <= Math.ceil(centerY + radiusY);
    y += 1
  ) {
    for (
      let x = Math.floor(centerX - radiusX);
      x <= Math.ceil(centerX + radiusX);
      x += 1
    ) {
      if (
        ((x - centerX) / radiusX) ** 2
        + ((y - centerY) / radiusY) ** 2
        <= 1
      ) {
        samples.push(sampleTerrainAt(terrain, x, y));
      }
    }
  }

  return { id: structure.id, ...terrainSampleStats(samples) };
}

async function auditKaizenTownTopography() {
  const [profile, towns, structureManifests, height, slope] = await Promise.all([
    readSurfaceProfile(),
    readFile(TOWN_MANIFEST_PATH, "utf8").then(JSON.parse),
    readStructureManifests(),
    readScalarField(TERRAIN_HEIGHT_PATH),
    readScalarField(TERRAIN_SLOPE_PATH),
  ]);
  const town = towns.towns.find(
    ({ projectId }) => projectId === KAIZEN_AGENT_OWNER_ID,
  );
  if (!town) {
    throw new TypeError(`${KAIZEN_AGENT_OWNER_ID} has no town plan.`);
  }
  const terrain = { height, slope };
  const streets = town.townPlan.streets.map(
    (street) => auditStreetTopography(street, profile, terrain),
  );
  const structures = individualStructureDescriptors(
    KAIZEN_AGENT_OWNER_ID,
    structureManifests,
  ).map((structure) => auditStructurePadTopography(structure, terrain));

  return {
    maximumRoadSlope: Math.max(...streets.map(({ maximumSlope }) => maximumSlope)),
    maximumStreetHeightRange: Math.max(
      ...streets.map(({ heightRange }) => heightRange),
    ),
    maximumStructureHeightRange: Math.max(
      ...structures.map(({ heightRange }) => heightRange),
    ),
    maximumStructureSlope: Math.max(
      ...structures.map(({ maximumSlope }) => maximumSlope),
    ),
    ownerId: KAIZEN_AGENT_OWNER_ID,
    streets,
    structures,
  };
}

async function independentStructurePlacements(
  fabricInstance,
  structures,
  imageWidth,
  imageHeight,
) {
  const placements = [];
  const { origin, span } = fabricInstance.worldBounds;

  for (const structure of structures) {
    const renderedWidth = Math.max(
      1,
      Math.round(structure.footprintSpan[0] / span[0] * imageWidth),
    );
    const renderedHeight = Math.max(
      1,
      Math.round(structure.footprintSpan[1] / span[1] * imageHeight),
    );
    const left = Math.round((
      structure.territoryAnchor[0]
      - structure.groundAnchor[0] * structure.footprintSpan[0]
      - origin[0]
    ) / span[0] * imageWidth);
    const top = Math.round((
      structure.territoryAnchor[1]
      - structure.groundAnchor[1] * structure.footprintSpan[1]
      - origin[1]
    ) / span[1] * imageHeight);
    const { data, info } = await sharp(publicPath(structure.assetPath))
      .resize(renderedWidth, renderedHeight, { fit: "fill" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    placements.push({ data, id: structure.id, info, left, top });
  }

  return placements;
}

async function auditTownSurfaces() {
  const [profile, fabric, towns, structureManifests] = await Promise.all([
    readSurfaceProfile(),
    readFile(FABRIC_MANIFEST_PATH, "utf8").then(JSON.parse),
    readFile(TOWN_MANIFEST_PATH, "utf8").then(JSON.parse),
    readStructureManifests(),
  ]);
  const plans = new Map([
    ...towns.towns.map((town) => [town.projectId, town.townPlan]),
    [towns.capitalCampus.capitalId, towns.capitalCampus.townPlan],
  ]);
  const reports = [];

  for (const instance of fabric.instances) {
    const plan = plans.get(instance.ownerId);
    if (!plan) {
      throw new TypeError(`${instance.ownerId} has no town plan.`);
    }
    const { data, info } = await sharp(publicPath(instance.assetPath))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const usesIndividualStructures = (
      INDIVIDUAL_STRUCTURE_TOWN_OWNER_IDS.has(instance.ownerId)
    );
    const widthScale = usesIndividualStructures
      ? profile.kaizenRoadWidthScale
      : 1;
    const roadAlignment = auditPlanRoadAlignment(plan, profile, widthScale);
    const individualStructurePlacements = usesIndividualStructures
      ? await independentStructurePlacements(
        instance,
        individualStructureDescriptors(instance.ownerId, structureManifests),
        info.width,
        info.height,
      )
      : null;
    const allSurface = new Uint8Array(info.width * info.height);
    const hardscape = new Uint8Array(info.width * info.height);
    const roadSurface = new Uint8Array(info.width * info.height);

    for (const street of plan.streets) {
      const width = profile.streetWidths[street.kind] * (
        usesIndividualStructures ? profile.kaizenRoadWidthScale : 1
      );
      if (!Number.isFinite(width)) {
        throw new TypeError(`${street.id} has no audited surface width.`);
      }
      markPolyline(
        allSurface,
        instance,
        street.waypoints,
        width + profile.edgeWidthAddition,
        info.width,
        info.height,
      );
      markPolyline(
        roadSurface,
        instance,
        street.waypoints,
        width + profile.edgeWidthAddition,
        info.width,
        info.height,
      );
      if (
        street.kind === "arterial"
        || street.kind === "collector"
        || street.kind === "stairs"
      ) {
        markPolyline(
          hardscape,
          instance,
          street.waypoints,
          width,
          info.width,
          info.height,
        );
      }
    }
    for (const plaza of plan.plazas) {
      const scale = (
        usesIndividualStructures
          ? profile.kaizenPlazaScales
          : profile.plazaScales
      )[plaza.kind];
      if (!Number.isFinite(scale)) {
        throw new TypeError(`${plaza.id} has no audited visual scale.`);
      }
      const points = scaledPlazaPoints(plaza, scale);
      markPolygon(
        allSurface,
        instance,
        points,
        info.width,
        info.height,
      );
      if (plaza.kind !== "service-court") {
        markPolygon(
          hardscape,
          instance,
          points,
          info.width,
          info.height,
        );
      }
    }

    let buildingContactPixels = 0;
    let buildingOverlapPixels = 0;
    let buildingContactByStructure = [];
    let buildingOverlapByStructure = [];
    const buildingCollisionSurface = usesIndividualStructures
      ? roadSurface
      : allSurface;
    if (individualStructurePlacements) {
      const contactMask = new Uint8Array(buildingCollisionSurface.length);
      const overlapMask = new Uint8Array(buildingCollisionSurface.length);
      const placementReports = individualStructurePlacements.map(
        (placement) => {
          const entrance = plan.entrances.find(
            ({ structureId }) => structureId === placement.id,
          );
          const entrancePoint = entrance ? worldPoint(entrance.point) : null;
          let contactPixels = 0;
          let overlapPixels = 0;
          for (
            let sourceY = 0;
            sourceY < placement.info.height;
            sourceY += 1
          ) {
            const destinationY = placement.top + sourceY;
            if (destinationY < 0 || destinationY >= info.height) {
              continue;
            }
            for (
              let sourceX = 0;
              sourceX < placement.info.width;
              sourceX += 1
            ) {
              const destinationX = placement.left + sourceX;
              if (destinationX < 0 || destinationX >= info.width) {
                continue;
              }
              const sourceAlpha = placement.data[
                (sourceY * placement.info.width + sourceX) * 4 + 3
              ];
              if (
                sourceAlpha > 24
                && buildingCollisionSurface[
                  destinationY * info.width + destinationX
                ]
              ) {
                const destinationIndex = (
                  destinationY * info.width + destinationX
                );
                const destinationPoint = sourcePixelToWorld(
                  instance,
                  destinationX,
                  destinationY,
                  info.width,
                  info.height,
                );
                const isEntranceContact = entrancePoint && (
                  (destinationPoint[0] - entrancePoint[0]) ** 2
                  + (destinationPoint[1] - entrancePoint[1]) ** 2
                  <= ENTRANCE_CONTACT_RADIUS ** 2
                );
                if (isEntranceContact) {
                  contactPixels += 1;
                  contactMask[destinationIndex] = 1;
                } else {
                  overlapPixels += 1;
                  overlapMask[destinationIndex] = 1;
                }
              }
            }
          }
          return { contactPixels, id: placement.id, overlapPixels };
        },
      );
      buildingContactPixels = countMask(contactMask);
      buildingOverlapPixels = countMask(overlapMask);
      buildingContactByStructure = placementReports
        .filter(({ contactPixels }) => contactPixels > 0)
        .map(({ contactPixels, id }) => ({ contactPixels, id }))
        .sort((left, right) => right.contactPixels - left.contactPixels);
      buildingOverlapByStructure = placementReports
        .filter(({ overlapPixels }) => overlapPixels > 0)
        .map(({ id, overlapPixels }) => ({ id, overlapPixels }))
        .sort((left, right) => right.overlapPixels - left.overlapPixels);
    } else {
      for (let pixel = 0; pixel < allSurface.length; pixel += 1) {
        if (
          buildingCollisionSurface[pixel]
          && data[pixel * 4 + 3] > 24
        ) {
          buildingOverlapPixels += 1;
        }
      }
    }
    const allSurfacePixels = countMask(allSurface);
    const hardscapePixels = countMask(hardscape);
    reports.push({
      id: instance.id,
      auditedBuildingSurface: usesIndividualStructures
        ? "roads-including-registered-entrances"
        : "roads-and-plazas",
      structureRepresentation: usesIndividualStructures
        ? "individual-sprites"
        : "town-fabric-atlas",
      totalSurfaceCoverage: allSurfacePixels / allSurface.length,
      hardscapeCoverage: hardscapePixels / hardscape.length,
      buildingContactPixels,
      buildingContactByStructure,
      buildingOverlapPixels,
      buildingOverlapByStructure,
      buildingOverlapRatio: (
        buildingOverlapPixels / Math.max(allSurfacePixels, 1)
      ),
      ...roadAlignment,
    });
  }

  return reports;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  for (const report of await auditTownSurfaces()) {
    console.log(JSON.stringify(report));
  }
}

export { auditKaizenTownTopography, auditTownSurfaces };
