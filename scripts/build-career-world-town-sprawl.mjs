#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  copyFile,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const PUBLIC_ROOT = path.join(ROOT, "public");
const MANIFEST_ROOT = path.join(
  PUBLIC_ROOT,
  "career-world",
  "layers",
  "structures",
  "manifests",
);
const INFRASTRUCTURE_MANIFEST_PATH = path.join(
  PUBLIC_ROOT,
  "career-world",
  "layers",
  "infrastructure",
  "manifests",
  "ninjaone-project-towns-r1.json",
);
const ART_SCALE = 1.3;
const SPRAWL_SCALES = Object.freeze({
  "project-kaizen-agent": 1.3,
  "project-vendy": 1.3,
  "project-kaizen-metrics": 1.2,
  "capital-ninjaone": 1.3,
});
const TOWN_OFFSETS = Object.freeze({
  "project-kaizen-agent": [0, 0],
  "project-vendy": [0, 0],
  "project-kaizen-metrics": [-5 / 1672, -3 / 941],
  "capital-ninjaone": [0, 0],
});
const TARGET_FABRIC_REVISION = 4;
const WORLD_PLANE = Object.freeze({ width: 1672, height: 941 });

const manifestPaths = Object.freeze({
  ambient: path.join(MANIFEST_ROOT, "ambient-structures-r1.json"),
  capital: path.join(MANIFEST_ROOT, "capital-structures-r1.json"),
  fabric: path.join(MANIFEST_ROOT, "town-fabric-r1.json"),
  projects: path.join(MANIFEST_ROOT, "project-structures-r1.json"),
  skills: path.join(MANIFEST_ROOT, "skill-structures-r1.json"),
  support: path.join(MANIFEST_ROOT, "support-structures-r1.json"),
});

const projectAssets = Object.freeze({
  "project-kaizen-agent": "kaizen-agent-r2.png",
  "project-vendy": "vendy-r2.png",
  "project-kaizen-metrics": "kaizen-metrics-r2.png",
});

const skillAssets = Object.freeze({
  "safe-writes": "safe-writes-r2.png",
  "data-contracts": "data-contracts-r2.png",
  "protocol-gateway": "protocol-gateway-r2.png",
  "workflow-orchestration": "workflow-orchestration-r2.png",
  "operator-control": "operator-control-r2.png",
  "cloud-infrastructure": "cloud-infrastructure-r2.png",
  python: "python-r2.png",
  databricks: "databricks-r2.png",
});

const supportAssets = Object.freeze({
  "vendy-worker-housing": "vendy-worker-housing-r2.png",
  "vendy-maintenance-workshop": "vendy-maintenance-workshop-r2.png",
  "vendy-cargo-depot": "vendy-cargo-depot-r2.png",
});

const ambientArchetypes = Object.freeze([
  {
    id: "fantasy-townhouse",
    label: "Fantasy townhouse",
    fileName: "townhouse-r1.png",
    footprintSpan: [0.0037, 0.0068],
  },
  {
    id: "fantasy-guildhouse",
    label: "Fantasy guildhouse",
    fileName: "guildhouse-r1.png",
    footprintSpan: [0.0043, 0.0074],
  },
  {
    id: "fantasy-chapel",
    label: "Fantasy chapel",
    fileName: "chapel-r1.png",
    footprintSpan: [0.004, 0.0072],
  },
  {
    id: "fantasy-inn",
    label: "Fantasy inn",
    fileName: "inn-r1.png",
    footprintSpan: [0.0042, 0.0074],
  },
  {
    id: "fantasy-conservatory",
    label: "Fantasy conservatory",
    fileName: "conservatory-r1.png",
    footprintSpan: [0.0041, 0.007],
  },
  {
    id: "fantasy-watchtower",
    label: "Fantasy watchtower",
    fileName: "watchtower-r1.png",
    footprintSpan: [0.0038, 0.0072],
  },
]);

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

function publicFile(assetPath) {
  if (!assetPath.startsWith("/career-world/")) {
    throw new TypeError(`Unsupported public asset path: ${assetPath}`);
  }
  return path.join(PUBLIC_ROOT, ...assetPath.slice(1).split("/"));
}

function roundCoordinate(value) {
  return Number(value.toFixed(7));
}

function scalePoint(point, center, factor, offset = [0, 0]) {
  return point.map((value, index) => roundCoordinate(
    center[index] + (value - center[index]) * factor + offset[index],
  ));
}

function scaleSpan(span, factor) {
  return span.map((value) => roundCoordinate(value * factor));
}

function scalePlan(plan, center, factor, offset) {
  for (const block of plan.blocks) {
    block.points = block.points.map(
      (point) => scalePoint(point, center, factor, offset),
    );
  }
  for (const street of plan.streets) {
    street.waypoints = street.waypoints.map(
      (point) => scalePoint(point, center, factor, offset),
    );
  }
  for (const plaza of plan.plazas) {
    plaza.points = plaza.points.map(
      (point) => scalePoint(point, center, factor, offset),
    );
  }
  for (const seam of plan.terrainSeams) {
    seam.waypoints = seam.waypoints.map(
      (point) => scalePoint(point, center, factor, offset),
    );
  }
  for (const loop of plan.pedestrianLoops) {
    loop.waypoints = loop.waypoints.map(
      (point) => scalePoint(point, center, factor, offset),
    );
  }
  for (const entrance of plan.entrances) {
    entrance.point = scalePoint(
      entrance.point,
      center,
      factor,
      offset,
    );
  }
}

function pngDimensions(buffer, label) {
  if (
    buffer.length < 24
    || buffer.subarray(1, 4).toString("ascii") !== "PNG"
  ) {
    throw new TypeError(`${label} is not a PNG.`);
  }
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

async function assetMetadata(assetPath) {
  const buffer = await readFile(publicFile(assetPath));
  return {
    dimensions: pngDimensions(buffer, assetPath),
    sha256: createHash("sha256")
      .update(buffer)
      .digest("hex")
      .toUpperCase(),
  };
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
    (left[0] - right[0]) * WORLD_PLANE.width,
    (left[1] - right[1]) * WORLD_PLANE.height,
  );
}

function worldDistanceToSegment(point, start, end) {
  const pointWorld = [
    point[0] * WORLD_PLANE.width,
    point[1] * WORLD_PLANE.height,
  ];
  const startWorld = [
    start[0] * WORLD_PLANE.width,
    start[1] * WORLD_PLANE.height,
  ];
  const endWorld = [
    end[0] * WORLD_PLANE.width,
    end[1] * WORLD_PLANE.height,
  ];
  const delta = [
    endWorld[0] - startWorld[0],
    endWorld[1] - startWorld[1],
  ];
  const lengthSquared = delta[0] ** 2 + delta[1] ** 2;
  if (lengthSquared === 0) {
    return Math.hypot(
      pointWorld[0] - startWorld[0],
      pointWorld[1] - startWorld[1],
    );
  }
  const progress = Math.max(0, Math.min(
    1,
    (
      (pointWorld[0] - startWorld[0]) * delta[0]
      + (pointWorld[1] - startWorld[1]) * delta[1]
    ) / lengthSquared,
  ));
  return Math.hypot(
    pointWorld[0] - (startWorld[0] + delta[0] * progress),
    pointWorld[1] - (startWorld[1] + delta[1] * progress),
  );
}

function polygonAreaWorld(points) {
  let doubledArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length];
    doubledArea += (
      points[index][0] * next[1]
      - next[0] * points[index][1]
    );
  }
  return (
    Math.abs(doubledArea) * 0.5
    * WORLD_PLANE.width
    * WORLD_PLANE.height
  );
}

function visualCorners(anchor, span) {
  const left = anchor[0] - span[0] * 0.5;
  const right = anchor[0] + span[0] * 0.5;
  const top = anchor[1] - span[1] * 0.92;
  const bottom = anchor[1] + span[1] * 0.08;
  return [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom],
  ];
}

function candidateGrid(points) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minimumX = Math.min(...xs);
  const maximumX = Math.max(...xs);
  const minimumY = Math.min(...ys);
  const maximumY = Math.max(...ys);
  const candidates = [];
  for (let row = 0; row < 13; row += 1) {
    for (let column = 0; column < 15; column += 1) {
      candidates.push([
        minimumX + (maximumX - minimumX) * (0.06 + column * 0.063),
        minimumY + (maximumY - minimumY) * (0.06 + row * 0.073),
      ]);
    }
  }
  return candidates;
}

function selectAmbientAnchors(plan, block, reservedSites) {
  const conservativeSpan = [0.0043, 0.0074];
  const roadSegments = [
    ...plan.streets,
    ...plan.pedestrianLoops,
  ].flatMap(({ waypoints }) => (
    waypoints.slice(1).map((point, index) => [
      waypoints[index],
      point,
    ])
  ));
  const valid = candidateGrid(block.points).filter((candidate) => (
    visualCorners(candidate, conservativeSpan).every(
      (corner) => pointInsidePolygon(corner, block.points),
    )
    && !plan.plazas.some(
      ({ points }) => pointInsidePolygon(candidate, points),
    )
    && roadSegments.every(([start, end]) => (
      worldDistanceToSegment(candidate, start, end) >= 4.25
    ))
    && reservedSites.every(
      ({ clearance, point }) => (
        worldDistance(candidate, point) >= clearance
      )
    )
  ));
  const desired = Math.max(
    3,
    Math.min(6, Math.round(polygonAreaWorld(block.points) / 260)),
  );
  const selected = [];
  while (valid.length > 0 && selected.length < desired) {
    valid.sort((left, right) => {
      const leftDistance = Math.min(
        ...reservedSites.map(
          ({ clearance, point }) => (
            worldDistance(left, point) - clearance
          ),
        ),
        ...selected.map((point) => worldDistance(left, point) - 6),
      );
      const rightDistance = Math.min(
        ...reservedSites.map(
          ({ clearance, point }) => (
            worldDistance(right, point) - clearance
          ),
        ),
        ...selected.map((point) => worldDistance(right, point) - 6),
      );
      return (
        rightDistance - leftDistance
        || left[1] - right[1]
        || left[0] - right[0]
      );
    });
    const candidate = valid.shift();
    selected.push(candidate);
    for (let index = valid.length - 1; index >= 0; index -= 1) {
      if (worldDistance(candidate, valid[index]) < 6) {
        valid.splice(index, 1);
      }
    }
  }
  return selected;
}

async function buildAmbientManifest(
  infrastructure,
  projects,
  skills,
  support,
) {
  const archetypes = await Promise.all(ambientArchetypes.map(
    async (archetype) => {
      const assetPath = (
        `/career-world/layers/structures/textures/ambient/`
        + archetype.fileName
      );
      return {
        id: archetype.id,
        label: archetype.label,
        assetPath,
        sourceDimensions: (
          await assetMetadata(assetPath)
        ).dimensions,
        groundAnchor: [0.5, 0.92],
        footprintSpan: archetype.footprintSpan,
      };
    },
  ));
  const ownerPlans = [
    ...infrastructure.towns.map((town) => ({
      ownerKind: "project",
      ownerId: town.projectId,
      plan: town.townPlan,
    })),
    {
      ownerKind: "capital",
      ownerId: infrastructure.capitalCampus.capitalId,
      plan: infrastructure.capitalCampus.townPlan,
    },
  ];
  const instances = [];
  ownerPlans.forEach((owner, ownerIndex) => {
    const ownerCoreAnchor = owner.ownerKind === "capital"
      ? (() => {
        const coreBlock = owner.plan.blocks.find(
          ({ structureIds }) => structureIds.includes(owner.ownerId),
        );
        if (!coreBlock) {
          return [];
        }
        return [[
          coreBlock.points.reduce((sum, [x]) => sum + x, 0)
            / coreBlock.points.length,
          coreBlock.points.reduce((sum, [, y]) => sum + y, 0)
            / coreBlock.points.length,
        ]];
      })()
      : [];
    const reserved = [
      ...owner.plan.entrances.map(({ point }) => ({
        point,
        clearance: 5,
      })),
      ...ownerCoreAnchor.map((point) => ({
        point,
        clearance: 12,
      })),
      ...projects.nodes
        .filter(({ id }) => id === owner.ownerId)
        .map(({ territoryAnchor: point }) => ({
          point,
          clearance: 12,
        })),
      ...skills.instances
        .filter(({ ownerId }) => ownerId === owner.ownerId)
        .map(({ territoryAnchor: point }) => ({
          point,
          clearance: 9,
        })),
      ...support.instances
        .filter(({ ownerId }) => ownerId === owner.ownerId)
        .map(({ territoryAnchor: point }) => ({
          point,
          clearance: 8,
        })),
    ];
    owner.plan.blocks.forEach((block, blockIndex) => {
      const anchors = selectAmbientAnchors(owner.plan, block, reserved);
      anchors.forEach((territoryAnchor, anchorIndex) => {
        const archetype = archetypes[
          (
            ownerIndex * 3
            + blockIndex * 2
            + anchorIndex
          ) % archetypes.length
        ];
        const suffix = String(anchorIndex + 1).padStart(2, "0");
        instances.push({
          id: `${block.id}-ambient-${suffix}`,
          ownerKind: owner.ownerKind,
          ownerId: owner.ownerId,
          blockId: block.id,
          archetypeId: archetype.id,
          territoryAnchor: territoryAnchor.map(roundCoordinate),
        });
        reserved.push({
          point: territoryAnchor,
          clearance: 6,
        });
      });
    });
  });
  return {
    schemaVersion: 1,
    id: "career-world/ambient-structures@r1",
    status: "phase-10-close-detail-modular-town-fabric",
    coordinateSpace: "normalized-world-top-left",
    territoryId: "ninjaone",
    minimumTier: "site",
    visualFamily: "career-world-fantasy-ambient-buildings@r1",
    archetypes,
    instances,
    policy: [
      "Ambient buildings are deterministic decorative-only close-detail fabric with no project, skill, evidence, selection, or navigation semantics.",
      "Every ambient anchor stays inside its authored block and outside physical road, pedestrian-loop, plaza, entrance, and semantic-structure clearances.",
      "Ambient candidates remain available for future aligned authoring but do not replace owners already covered by persistent town fabric.",
    ],
  };
}

async function main() {
  const [
    infrastructure,
    capital,
    fabric,
    projects,
    skills,
    support,
  ] = await Promise.all([
    readJson(INFRASTRUCTURE_MANIFEST_PATH),
    readJson(manifestPaths.capital),
    readJson(manifestPaths.fabric),
    readJson(manifestPaths.projects),
    readJson(manifestPaths.skills),
    readJson(manifestPaths.support),
  ]);

  const centers = new Map(fabric.instances.map((instance) => [
    instance.ownerId,
    instance.worldBounds.origin.map(
      (value, index) => value + instance.worldBounds.span[index] * 0.5,
    ),
  ]));
  const legacyScale = infrastructure.sprawlScale ?? 1;
  const currentScales = infrastructure.sprawlScales ?? Object.fromEntries(
    Object.keys(SPRAWL_SCALES).map((ownerId) => [ownerId, legacyScale]),
  );
  const currentOffsets = infrastructure.townOffsets ?? Object.fromEntries(
    Object.keys(TOWN_OFFSETS).map((ownerId) => [ownerId, [0, 0]]),
  );
  const currentArtScale = infrastructure.artScale ?? legacyScale;
  const artFactor = ART_SCALE / currentArtScale;
  const offsetDelta = (ownerId) => TOWN_OFFSETS[ownerId].map(
    (value, index) => value - currentOffsets[ownerId][index],
  );

  for (const town of infrastructure.towns) {
    const center = centers.get(town.projectId);
    const factor = (
      SPRAWL_SCALES[town.projectId] / currentScales[town.projectId]
    );
    if (!center || !Number.isFinite(factor)) {
      throw new TypeError(`Invalid town scale for ${town.projectId}.`);
    }
    scalePlan(
      town.townPlan,
      center,
      factor,
      offsetDelta(town.projectId),
    );
  }
  const capitalOwnerId = infrastructure.capitalCampus.capitalId;
  const capitalCenter = centers.get(capitalOwnerId);
  const capitalFactor = (
    SPRAWL_SCALES[capitalOwnerId] / currentScales[capitalOwnerId]
  );
  if (!capitalCenter || !Number.isFinite(capitalFactor)) {
    throw new TypeError("Invalid NinjaOne capital town scale.");
  }
  scalePlan(
    infrastructure.capitalCampus.townPlan,
    capitalCenter,
    capitalFactor,
    offsetDelta(capitalOwnerId),
  );

  for (const project of projects.nodes) {
    project.territoryAnchor = scalePoint(
      project.territoryAnchor,
      centers.get(project.id),
      SPRAWL_SCALES[project.id] / currentScales[project.id],
      offsetDelta(project.id),
    );
    project.footprintSpan = scaleSpan(project.footprintSpan, artFactor);
  }
  for (const instance of skills.instances) {
    instance.territoryAnchor = scalePoint(
      instance.territoryAnchor,
      centers.get(instance.ownerId),
      SPRAWL_SCALES[instance.ownerId] / currentScales[instance.ownerId],
      offsetDelta(instance.ownerId),
    );
  }
  for (const archetype of skills.archetypes) {
    archetype.footprintSpan = scaleSpan(
      archetype.footprintSpan,
      artFactor,
    );
  }
  for (const instance of support.instances) {
    instance.territoryAnchor = scalePoint(
      instance.territoryAnchor,
      centers.get(instance.ownerId),
      SPRAWL_SCALES[instance.ownerId] / currentScales[instance.ownerId],
      offsetDelta(instance.ownerId),
    );
  }
  for (const archetype of support.archetypes) {
    archetype.footprintSpan = scaleSpan(
      archetype.footprintSpan,
      artFactor,
    );
  }
  const ninjaOneCapital = capital.nodes.find(
    ({ territoryId }) => territoryId === "ninjaone",
  );
  if (!ninjaOneCapital) {
    throw new TypeError("Missing NinjaOne capital structure.");
  }
  ninjaOneCapital.footprintSpan = scaleSpan(
    ninjaOneCapital.footprintSpan,
    artFactor,
  );

  for (const instance of fabric.instances) {
    const center = centers.get(instance.ownerId);
    const factor = (
      SPRAWL_SCALES[instance.ownerId] / currentScales[instance.ownerId]
    );
    const span = scaleSpan(instance.worldBounds.span, factor);
    const offset = offsetDelta(instance.ownerId);
    instance.worldBounds = {
      origin: span.map(
        (value, index) => roundCoordinate(
          center[index] + offset[index] - value * 0.5,
        ),
      ),
      span,
    };
    instance.layoutScale = SPRAWL_SCALES[instance.ownerId];
  }

  infrastructure.status = "phase-10-sprawled-town-plans";
  infrastructure.layoutRevision = 4;
  infrastructure.artScale = ART_SCALE;
  infrastructure.sprawlScales = SPRAWL_SCALES;
  infrastructure.townOffsets = TOWN_OFFSETS;
  delete infrastructure.sprawlScale;

  ninjaOneCapital.assetPath = (
    "/career-world/layers/structures/textures/ninjaone-capital-r3.png"
  );
  ninjaOneCapital.groundAnchor = [0.5, 0.92];
  capital.ninjaOneArtRevision = 3;
  capital.ninjaOneLayoutScale = SPRAWL_SCALES["capital-ninjaone"];

  projects.status = "phase-10-fantasy-town-landmarks";
  projects.visualFamily = "career-world-bespoke-project-landmarks@r2";
  projects.artRevision = 2;
  projects.artScale = ART_SCALE;
  projects.layoutScales = SPRAWL_SCALES;
  delete projects.layoutScale;
  for (const project of projects.nodes) {
    const fileName = projectAssets[project.id];
    project.assetPath = (
      `/career-world/layers/structures/textures/projects/${fileName}`
    );
    project.sourceDimensions = (
      await assetMetadata(project.assetPath)
    ).dimensions;
    project.groundAnchor = [0.5, 0.92];
  }

  skills.status = "phase-10-fantasy-skill-buildings";
  skills.visualFamily = "career-world-universal-skill-buildings@r2";
  skills.artRevision = 2;
  skills.artScale = ART_SCALE;
  skills.layoutScales = SPRAWL_SCALES;
  delete skills.layoutScale;
  for (const archetype of skills.archetypes) {
    const fileName = skillAssets[archetype.id];
    archetype.assetPath = (
      `/career-world/layers/structures/textures/skills/${fileName}`
    );
    archetype.sourceDimensions = (
      await assetMetadata(archetype.assetPath)
    ).dimensions;
    archetype.groundAnchor = [0.5, 0.92];
  }

  support.status = "phase-10-fantasy-support-fabric";
  support.visualFamily = "career-world-fantasy-support-buildings@r2";
  support.artRevision = 2;
  support.artScale = ART_SCALE;
  support.layoutScales = SPRAWL_SCALES;
  delete support.layoutScale;
  for (const archetype of support.archetypes) {
    const fileName = supportAssets[archetype.id];
    archetype.assetPath = (
      `/career-world/layers/structures/textures/support/${fileName}`
    );
    archetype.sourceDimensions = (
      await assetMetadata(archetype.assetPath)
    ).dimensions;
    archetype.groundAnchor = [0.5, 0.92];
  }

  const ambient = await buildAmbientManifest(
    infrastructure,
    projects,
    skills,
    support,
  );

  for (const instance of fabric.instances) {
    const sourceAssetPath = instance.sourceAssetPath?.endsWith("-r2.png")
      ? instance.sourceAssetPath
      : instance.assetPath.replace(/-r\d+\.png$/, "-r2.png");
    const assetPath = sourceAssetPath.replace(
      /-r2\.png$/,
      `-r${TARGET_FABRIC_REVISION}.png`,
    );
    await copyFile(
      publicFile(sourceAssetPath),
      publicFile(assetPath),
    );
    const metadata = await assetMetadata(assetPath);
    instance.assetPath = assetPath;
    instance.sourceAssetPath = sourceAssetPath;
    instance.sourceDimensions = metadata.dimensions;
    instance.assetRevision = TARGET_FABRIC_REVISION;
    instance.alphaMaskPolicy = "intrinsic-negative-space";
    instance.sha256 = metadata.sha256;
    instance.layoutScale = SPRAWL_SCALES[instance.ownerId];
  }
  fabric.schemaVersion = 3;
  fabric.id = `career-world/town-fabric@r${TARGET_FABRIC_REVISION}`;
  fabric.status = "phase-10-progressive-town-overview";
  fabric.revision = TARGET_FABRIC_REVISION;
  fabric.minimumTier = "capital";
  fabric.buildScript = "scripts/build-career-world-town-sprawl.mjs";
  fabric.policy = [
    "Town fabric is the persistent settlement base from capital through close detail and never swaps to a second building arrangement.",
    "Town fabric uses intrinsic transparent courtyards and gaps; runtime roads never delete authored building pixels.",
    "Semantic capital, project, skill, and support structures add detail over the stable town base; modular ambient candidates do not duplicate persistent filler buildings.",
    "Town plans, structure anchors, pedestrian routes, and town-fabric bounds expand together around stable town centers.",
    "The sprawl revision changes settlement composition only and does not alter accepted world geography, coastlines, or territory ownership.",
  ];

  await Promise.all([
    writeJson(INFRASTRUCTURE_MANIFEST_PATH, infrastructure),
    writeJson(manifestPaths.ambient, ambient),
    writeJson(manifestPaths.capital, capital),
    writeJson(manifestPaths.fabric, fabric),
    writeJson(manifestPaths.projects, projects),
    writeJson(manifestPaths.skills, skills),
    writeJson(manifestPaths.support, support),
  ]);

  console.log(
    "Built fantasy structure kit and owner-specific town sprawl.",
  );
}

await main();
