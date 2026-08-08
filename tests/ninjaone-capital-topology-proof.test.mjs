import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { inflateSync } from "node:zlib";

import {
  NINJAONE_CAPITAL_SKILL_DISTRICTS,
  NINJAONE_CAPITAL_TOPOLOGY_ACCEPTANCE,
  NINJAONE_CAPITAL_TOPOLOGY_ALLOWED_GRID_CELLS,
  NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD,
  NINJAONE_CAPITAL_TOPOLOGY_BOUNDARY,
  NINJAONE_CAPITAL_TOPOLOGY_DISTRICTS,
  NINJAONE_CAPITAL_TOPOLOGY_ELEVATION_BANDS,
  NINJAONE_CAPITAL_TOPOLOGY_GRID_CELLS,
  NINJAONE_CAPITAL_TOPOLOGY_OWNERSHIP,
  NINJAONE_CAPITAL_TOPOLOGY_PEDESTRIAN_LOOPS,
  NINJAONE_CAPITAL_TOPOLOGY_PLANNING_ENVELOPE,
  NINJAONE_CAPITAL_TOPOLOGY_PLOTS,
  NINJAONE_CAPITAL_TOPOLOGY_RAIL_CORRIDOR,
  NINJAONE_CAPITAL_TOPOLOGY_RETAINING_WALLS,
  NINJAONE_CAPITAL_TOPOLOGY_ROADS,
  NINJAONE_CAPITAL_TOPOLOGY_STAIRS,
  NINJAONE_CAPITAL_TOPOLOGY_STATION_ACCESS_ROAD_ID,
  NINJAONE_CAPITAL_TOPOLOGY_STATION_PLOT_ID,
  NINJAONE_CAPITAL_TOPOLOGY_TERRAIN_AUTHORITY,
  NINJAONE_CAPITAL_TOPOLOGY_TRANSITION_ZONES,
  NINJAONE_CAPITAL_TOPOLOGY_WORLD_ANCHOR,
  NINJAONE_CAPITAL_TOPOLOGY_WORLD_ORIGIN,
  NINJAONE_CAPITAL_TOPOLOGY_WORLD_SPAN,
  NINJAONE_CAPITAL_TOPOLOGY_PROGRAM,
  NINJAONE_CAPITAL_SKILLS,
} from "../features/career-world/development/model/ninjaOneCapitalTopologyProof.ts";
import { WORLD_PLANE } from "../features/career-world/shared/world.ts";

const root = process.cwd();

function paeth(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const cornerDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= cornerDistance) {
    return left;
  }
  return upDistance <= cornerDistance ? up : upperLeft;
}

async function decodeGrayscalePng(relativePath) {
  const buffer = await readFile(path.join(root, relativePath));
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG");
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  assert.equal(buffer[24], 8);
  assert.equal(buffer[25], 0);
  const chunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    if (type === "IDAT") {
      chunks.push(buffer.subarray(offset + 8, offset + 8 + length));
    }
    offset += 12 + length;
  }
  const inflated = inflateSync(Buffer.concat(chunks));
  const pixels = Buffer.alloc(width * height);
  let sourceOffset = 0;
  for (let row = 0; row < height; row += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const targetOffset = row * width;
    for (let column = 0; column < width; column += 1) {
      const raw = inflated[sourceOffset + column];
      const left = column > 0 ? pixels[targetOffset + column - 1] : 0;
      const up = row > 0 ? pixels[targetOffset + column - width] : 0;
      const upperLeft = row > 0 && column > 0
        ? pixels[targetOffset + column - width - 1]
        : 0;
      let value = raw;
      if (filter === 1) value += left;
      if (filter === 2) value += up;
      if (filter === 3) value += Math.floor((left + up) / 2);
      if (filter === 4) value += paeth(left, up, upperLeft);
      assert.ok(filter >= 0 && filter <= 4);
      pixels[targetOffset + column] = value & 0xff;
    }
    sourceOffset += width;
  }
  return { height, pixels, width };
}

function publicAssetPath(assetPath) {
  return path.posix.join("public", assetPath.replace(/^\//, ""));
}

function distance(first, second) {
  return Math.hypot(first[0] - second[0], first[1] - second[1]);
}

function pointToSegmentDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return distance(point, start);
  }
  const projection = Math.max(0, Math.min(1, (
    (point[0] - start[0]) * dx + (point[1] - start[1]) * dy
  ) / lengthSquared));
  return distance(point, [
    start[0] + dx * projection,
    start[1] + dy * projection,
  ]);
}

function pointToPathDistance(point, points) {
  let minimum = Number.POSITIVE_INFINITY;
  for (let index = 1; index < points.length; index += 1) {
    minimum = Math.min(
      minimum,
      pointToSegmentDistance(point, points[index - 1], points[index]),
    );
  }
  return minimum;
}

function pointInPolygon(point, polygon) {
  for (let index = 0; index < polygon.length; index += 1) {
    const nextIndex = (index + 1) % polygon.length;
    if (pointToSegmentDistance(point, polygon[index], polygon[nextIndex]) < 1e-7) {
      return true;
    }
  }

  let inside = false;
  for (
    let index = 0, previousIndex = polygon.length - 1;
    index < polygon.length;
    previousIndex = index, index += 1
  ) {
    const [x, y] = polygon[index];
    const [previousX, previousY] = polygon[previousIndex];
    if (
      (y > point[1]) !== (previousY > point[1])
      && point[0] < (
        (previousX - x) * (point[1] - y) / (previousY - y) + x
      )
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function orientation(first, second, third) {
  const cross = (
    (second[1] - first[1]) * (third[0] - second[0])
    - (second[0] - first[0]) * (third[1] - second[1])
  );
  return Math.abs(cross) < 1e-7 ? 0 : Math.sign(cross);
}

function segmentsCross(firstStart, firstEnd, secondStart, secondEnd) {
  return (
    orientation(firstStart, firstEnd, secondStart)
      !== orientation(firstStart, firstEnd, secondEnd)
    && orientation(secondStart, secondEnd, firstStart)
      !== orientation(secondStart, secondEnd, firstEnd)
  );
}

function pathsCross(first, second) {
  for (let firstIndex = 1; firstIndex < first.length; firstIndex += 1) {
    for (let secondIndex = 1; secondIndex < second.length; secondIndex += 1) {
      if (segmentsCross(
        first[firstIndex - 1],
        first[firstIndex],
        second[secondIndex - 1],
        second[secondIndex],
      )) {
        return true;
      }
    }
  }
  return false;
}

function roadConnectionDistance(first, second) {
  const firstEndpoints = [first.points[0], first.points.at(-1)];
  const secondEndpoints = [second.points[0], second.points.at(-1)];
  return Math.min(
    ...firstEndpoints.map((point) => pointToPathDistance(point, second.points)),
    ...secondEndpoints.map((point) => pointToPathDistance(point, first.points)),
  );
}

function topologyPointToWorld([x, y]) {
  return [
    NINJAONE_CAPITAL_TOPOLOGY_WORLD_ORIGIN[0]
      + x / NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD[0] * NINJAONE_CAPITAL_TOPOLOGY_WORLD_SPAN[0],
    NINJAONE_CAPITAL_TOPOLOGY_WORLD_ORIGIN[1]
      + y / NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD[1] * NINJAONE_CAPITAL_TOPOLOGY_WORLD_SPAN[1],
  ];
}

function terrainCoverage(polygon, land, slope) {
  assert.deepEqual([land.width, land.height], [slope.width, slope.height]);
  const worldPolygon = polygon.map(topologyPointToWorld);
  const xs = worldPolygon.map(([x]) => x);
  const ys = worldPolygon.map(([, y]) => y);
  const startX = Math.max(0, Math.floor(Math.min(...xs) * land.width));
  const endX = Math.min(land.width, Math.ceil(Math.max(...xs) * land.width));
  const startY = Math.max(0, Math.floor(Math.min(...ys) * land.height));
  const endY = Math.min(land.height, Math.ceil(Math.max(...ys) * land.height));
  let buildablePixels = 0;
  let landPixels = 0;
  let totalPixels = 0;
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const worldPoint = [(x + 0.5) / land.width, (y + 0.5) / land.height];
      if (!pointInPolygon(worldPoint, worldPolygon)) {
        continue;
      }
      const pixel = y * land.width + x;
      const isLand = land.pixels[pixel]
        >= NINJAONE_CAPITAL_TOPOLOGY_TERRAIN_AUTHORITY.landThreshold;
      landPixels += isLand ? 1 : 0;
      buildablePixels += isLand && slope.pixels[pixel]
        < NINJAONE_CAPITAL_TOPOLOGY_TERRAIN_AUTHORITY.buildableSlopeThreshold
        ? 1
        : 0;
      totalPixels += 1;
    }
  }
  assert.ok(totalPixels > 0);
  return {
    buildable: buildablePixels / Math.max(landPixels, 1),
    land: landPixels / totalPixels,
  };
}

function pointInAllowedGridCells([x, y]) {
  return NINJAONE_CAPITAL_TOPOLOGY_ALLOWED_GRID_CELLS.some(({ origin, span }) => (
    x >= origin[0]
    && x <= origin[0] + span[0]
    && y >= origin[1]
    && y <= origin[1] + span[1]
  ));
}

function samplePath(points, closed = false) {
  const path = closed ? [...points, points[0]] : points;
  return path.slice(1).flatMap((end, index) => (
    Array.from({ length: 25 }, (_, step) => {
      const progress = step / 24;
      const start = path[index];
      return [
        start[0] + (end[0] - start[0]) * progress,
        start[1] + (end[1] - start[1]) * progress,
      ];
    })
  ));
}

test("NinjaOne Capital topology uses only the approved B2, C1, and C2 envelope", () => {
  assert.deepEqual(NINJAONE_CAPITAL_TOPOLOGY_GRID_CELLS, ["B2", "C1", "C2"]);

  const scaleX = NINJAONE_CAPITAL_TOPOLOGY_WORLD_SPAN[0] * WORLD_PLANE.width
    / NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD[0];
  const scaleY = NINJAONE_CAPITAL_TOPOLOGY_WORLD_SPAN[1] * WORLD_PLANE.height
    / NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD[1];
  assert.ok(
    Math.abs(scaleX - scaleY) / Math.max(scaleX, scaleY) < 0.02,
    "registered artboard must preserve one near-uniform isometric scale",
  );

  const registeredPaths = [
    { id: "planning-envelope", points: NINJAONE_CAPITAL_TOPOLOGY_PLANNING_ENVELOPE, closed: true },
    { id: "city-boundary", points: NINJAONE_CAPITAL_TOPOLOGY_BOUNDARY, closed: true },
    ...NINJAONE_CAPITAL_TOPOLOGY_ELEVATION_BANDS.map(({ id, polygon }) => ({ id, points: polygon, closed: true })),
    ...NINJAONE_CAPITAL_TOPOLOGY_RETAINING_WALLS.map(({ id, points }) => ({ id, points, closed: false })),
    ...NINJAONE_CAPITAL_TOPOLOGY_ROADS.map(({ id, points, closed }) => ({ id, points, closed: Boolean(closed) })),
    ...NINJAONE_CAPITAL_TOPOLOGY_PEDESTRIAN_LOOPS.map(({ id, points }) => ({ id, points, closed: true })),
    ...NINJAONE_CAPITAL_TOPOLOGY_STAIRS.flatMap((stair) => [
      { id: `${stair.id}-bottom`, points: stair.bottomApproach, closed: false },
      { id: `${stair.id}-steps`, points: [stair.bottomLanding, stair.topLanding], closed: false },
      { id: `${stair.id}-top`, points: stair.topApproach, closed: false },
    ]),
    ...NINJAONE_CAPITAL_TOPOLOGY_PLOTS.map(({ id, polygon }) => ({ id, points: polygon, closed: true })),
    { id: NINJAONE_CAPITAL_TOPOLOGY_RAIL_CORRIDOR.id, points: NINJAONE_CAPITAL_TOPOLOGY_RAIL_CORRIDOR.points, closed: false },
    ...NINJAONE_CAPITAL_TOPOLOGY_TRANSITION_ZONES.map(({ id, polygon }) => ({ id, points: polygon, closed: true })),
  ];
  for (const path of registeredPaths) {
    for (const point of samplePath(path.points, path.closed)) {
      assert.ok(
        pointInAllowedGridCells(topologyPointToWorld(point)),
        `${path.id} leaves the approved B2/C1/C2 planning envelope at ${point}`,
      );
    }
  }
});

test("NinjaOne Capital registration and plots conform to canonical terrain", async () => {
  const territories = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/territory-landform/manifests/world-territories-r4.json",
  ), "utf8"));
  const ninjaOne = territories.territories.find(({ id }) => id === "ninjaone");
  assert.ok(ninjaOne);
  assert.equal(
    territories.id,
    NINJAONE_CAPITAL_TOPOLOGY_TERRAIN_AUTHORITY.territoryManifestId,
  );
  assert.deepEqual(
    ninjaOne.development.capitalEnvelope.origin,
    NINJAONE_CAPITAL_TOPOLOGY_WORLD_ORIGIN,
  );
  assert.deepEqual(
    ninjaOne.development.capitalEnvelope.span,
    NINJAONE_CAPITAL_TOPOLOGY_WORLD_SPAN,
  );
  assert.deepEqual(
    ninjaOne.development.capitalAnchor,
    NINJAONE_CAPITAL_TOPOLOGY_WORLD_ANCHOR,
  );

  const [land, slope] = await Promise.all([
    decodeGrayscalePng(publicAssetPath(
      NINJAONE_CAPITAL_TOPOLOGY_TERRAIN_AUTHORITY.landMaskPath,
    )),
    decodeGrayscalePng(publicAssetPath(
      NINJAONE_CAPITAL_TOPOLOGY_TERRAIN_AUTHORITY.slopeFieldPath,
    )),
    readFile(path.join(root, publicAssetPath(
      NINJAONE_CAPITAL_TOPOLOGY_TERRAIN_AUTHORITY.heightFieldPath,
    ))),
    readFile(path.join(root, publicAssetPath(
      NINJAONE_CAPITAL_TOPOLOGY_TERRAIN_AUTHORITY.elevationOverlayPath,
    ))),
  ]);
  const cityCoverage = terrainCoverage(
    NINJAONE_CAPITAL_TOPOLOGY_BOUNDARY,
    land,
    slope,
  );
  assert.ok(
    cityCoverage.land
      >= NINJAONE_CAPITAL_TOPOLOGY_TERRAIN_AUTHORITY.minimumCityLandCoverage,
    `capital boundary land coverage ${cityCoverage.land.toFixed(3)} is too low`,
  );
  assert.ok(
    cityCoverage.buildable
      >= NINJAONE_CAPITAL_TOPOLOGY_TERRAIN_AUTHORITY.minimumCityBuildableCoverage,
    `capital boundary buildable coverage ${cityCoverage.buildable.toFixed(3)} is too low`,
  );
  for (const plot of NINJAONE_CAPITAL_TOPOLOGY_PLOTS) {
    const coverage = terrainCoverage(plot.polygon, land, slope);
    assert.ok(
      coverage.land
        >= NINJAONE_CAPITAL_TOPOLOGY_TERRAIN_AUTHORITY.minimumPlotLandCoverage,
      `${plot.id} land coverage ${coverage.land.toFixed(3)} is too low`,
    );
    assert.ok(
      coverage.buildable
        >= NINJAONE_CAPITAL_TOPOLOGY_TERRAIN_AUTHORITY.minimumPlotBuildableCoverage,
      `${plot.id} buildable coverage ${coverage.buildable.toFixed(3)} is too low`,
    );
  }
});

test("NinjaOne Capital roads form one connected, grade-valid vehicle network", () => {
  const closedRoads = NINJAONE_CAPITAL_TOPOLOGY_ROADS.filter(({ closed }) => closed);
  const bandByElevation = new Map(NINJAONE_CAPITAL_TOPOLOGY_ELEVATION_BANDS.map(
    (band) => [band.elevation, band],
  ));
  assert.equal(
    closedRoads.length,
    NINJAONE_CAPITAL_TOPOLOGY_ACCEPTANCE.closedRoadCircuitCount,
  );
  for (const road of NINJAONE_CAPITAL_TOPOLOGY_ROADS) {
    if (road.closed) {
      assert.deepEqual(road.points[0], road.points.at(-1));
      const band = bandByElevation.get(road.fromElevation);
      assert.ok(band);
      for (const point of road.points.slice(0, -1)) {
        assert.ok(
          pointInPolygon(point, band.polygon),
          `${road.id} leaves its declared elevation band at ${point}`,
        );
      }
    }
    if (road.kind === "ramp") {
      assert.equal(Math.abs(road.toElevation - road.fromElevation), 1);
      assert.ok(
        road.maximumGradePercent
          <= NINJAONE_CAPITAL_TOPOLOGY_ACCEPTANCE.maximumRoadGradePercent,
      );
    } else {
      assert.equal(road.fromElevation, road.toElevation);
    }
  }

  const connected = new Set([NINJAONE_CAPITAL_TOPOLOGY_ROADS[0].id]);
  const frontier = [NINJAONE_CAPITAL_TOPOLOGY_ROADS[0]];
  while (frontier.length > 0) {
    const current = frontier.shift();
    for (const candidate of NINJAONE_CAPITAL_TOPOLOGY_ROADS) {
      if (
        connected.has(candidate.id)
        || roadConnectionDistance(current, candidate)
          > Math.max(current.width, candidate.width) * 1.3
      ) {
        continue;
      }
      connected.add(candidate.id);
      frontier.push(candidate);
    }
  }
  assert.equal(connected.size, NINJAONE_CAPITAL_TOPOLOGY_ROADS.length);

  const ramps = NINJAONE_CAPITAL_TOPOLOGY_ROADS.filter(({ kind }) => kind === "ramp");
  for (const ramp of ramps) {
    const fromCircuits = closedRoads.filter(
      ({ fromElevation }) => fromElevation === ramp.fromElevation,
    );
    const toCircuits = closedRoads.filter(
      ({ fromElevation }) => fromElevation === ramp.toElevation,
    );
    assert.ok(Math.min(...fromCircuits.map(({ points }) => (
      pointToPathDistance(ramp.points[0], points)
    ))) <= 2, `${ramp.id} must start on its lower road circuit`);
    assert.ok(Math.min(...toCircuits.map(({ points }) => (
      pointToPathDistance(ramp.points.at(-1), points)
    ))) <= 2, `${ramp.id} must end on its upper road circuit`);
    for (const wall of NINJAONE_CAPITAL_TOPOLOGY_RETAINING_WALLS) {
      assert.equal(
        pathsCross(ramp.points, wall.points),
        false,
        `${ramp.id} must pass through a wall opening, not through the wall`,
      );
    }
  }
});

test("NinjaOne Capital pedestrian loops close and every stair owns explicit landings", () => {
  const bandByElevation = new Map(NINJAONE_CAPITAL_TOPOLOGY_ELEVATION_BANDS.map(
    (band) => [band.elevation, band],
  ));
  assert.equal(
    NINJAONE_CAPITAL_TOPOLOGY_PEDESTRIAN_LOOPS.length,
    NINJAONE_CAPITAL_TOPOLOGY_ACCEPTANCE.closedPedestrianLoopCount,
  );
  for (const loop of NINJAONE_CAPITAL_TOPOLOGY_PEDESTRIAN_LOOPS) {
    assert.deepEqual(loop.points[0], loop.points.at(-1));
    const band = bandByElevation.get(loop.elevation);
    assert.ok(band);
    for (const point of loop.points.slice(0, -1)) {
      assert.ok(
        pointInPolygon(point, band.polygon),
        `${loop.id} leaves its declared elevation band at ${point}`,
      );
    }
  }
  assert.ok(
    NINJAONE_CAPITAL_TOPOLOGY_STAIRS.length
      >= NINJAONE_CAPITAL_TOPOLOGY_ACCEPTANCE.minimumIndependentElevationConnectors,
  );
  for (const stair of NINJAONE_CAPITAL_TOPOLOGY_STAIRS) {
    assert.equal(Math.abs(stair.toElevation - stair.fromElevation), 1);
    assert.notDeepEqual(stair.bottomLanding, stair.topLanding);
    assert.ok(pointInPolygon(
      stair.bottomLanding,
      bandByElevation.get(stair.fromElevation).polygon,
    ));
    assert.ok(pointInPolygon(
      stair.topLanding,
      bandByElevation.get(stair.toElevation).polygon,
    ));
    assert.deepEqual(stair.bottomApproach.at(-1), stair.bottomLanding);
    assert.deepEqual(stair.topApproach.at(-1), stair.topLanding);
    const lowerLoop = NINJAONE_CAPITAL_TOPOLOGY_PEDESTRIAN_LOOPS.find(
      ({ elevation }) => elevation === stair.fromElevation,
    );
    const upperLoop = NINJAONE_CAPITAL_TOPOLOGY_PEDESTRIAN_LOOPS.find(
      ({ elevation }) => elevation === stair.toElevation,
    );
    assert.ok(lowerLoop);
    assert.ok(upperLoop);
    assert.ok(lowerLoop.points.some((point) => (
      distance(point, stair.bottomApproach[0]) < 1e-7
    )));
    assert.ok(upperLoop.points.some((point) => (
      distance(point, stair.topApproach[0]) < 1e-7
    )));
  }
});

test("every topology plot has explicit access to the circulation network", () => {
  const bandByElevation = new Map(NINJAONE_CAPITAL_TOPOLOGY_ELEVATION_BANDS.map(
    (band) => [band.elevation, band],
  ));
  const circulationPaths = [
    ...NINJAONE_CAPITAL_TOPOLOGY_ROADS.map(({ points }) => points),
    ...NINJAONE_CAPITAL_TOPOLOGY_PEDESTRIAN_LOOPS.map(({ points }) => points),
    ...NINJAONE_CAPITAL_TOPOLOGY_STAIRS.flatMap((stair) => [
      stair.bottomApproach,
      stair.topApproach,
    ]),
  ];
  for (const plot of NINJAONE_CAPITAL_TOPOLOGY_PLOTS) {
    const band = bandByElevation.get(plot.elevation);
    assert.ok(band);
    for (const point of plot.polygon) {
      assert.ok(
        pointInPolygon(point, band.polygon),
        `${plot.id} leaves its declared elevation band at ${point}`,
      );
    }
    const accessDistance = Math.min(...circulationPaths.map((points) => (
      pointToPathDistance(plot.accessPoint, points)
    )));
    assert.ok(
      accessDistance <= 80,
      `${plot.id} access point is ${accessDistance.toFixed(1)}px from circulation`,
    );
  }
});

test("three replaceable districts cover every Technical Skills resume entry", () => {
  const expectedDistricts = [
    {
      elevation: 1,
      id: "application-development",
      label: "Application Development",
      skills: [
        ["golang", "Go (Golang)"],
        ["typescript", "TypeScript"],
        ["react", "React"],
        ["tanstack", "TanStack"],
        ["csharp", "C#"],
        ["python", "Python"],
        ["postgresql", "PostgreSQL"],
        ["redis", "Redis"],
      ],
    },
    {
      elevation: 0,
      id: "infrastructure-data",
      label: "Infrastructure & Data",
      skills: [
        ["aws", "AWS"],
        ["databricks", "Databricks"],
        ["docker", "Docker"],
        ["vmware", "VMware"],
        ["macstadium", "MacStadium"],
      ],
    },
    {
      elevation: 2,
      id: "apis-integration",
      label: "APIs & Integration",
      skills: [
        ["grpc-rest", "gRPC / REST"],
        ["openapi-swagger", "OpenAPI / Swagger"],
        ["mcp", "MCP"],
        ["capability-contracts", "Capability Contracts"],
        ["tool-generation", "Tool Generation"],
      ],
    },
  ];

  assert.equal(NINJAONE_CAPITAL_SKILL_DISTRICTS.length, 3);
  assert.equal(NINJAONE_CAPITAL_TOPOLOGY_DISTRICTS.length, 3);
  for (const expected of expectedDistricts) {
    const programDistrict = NINJAONE_CAPITAL_SKILL_DISTRICTS.find(
      ({ id }) => id === expected.id,
    );
    const topologyDistrict = NINJAONE_CAPITAL_TOPOLOGY_DISTRICTS.find(
      ({ id }) => id === expected.id,
    );
    assert.ok(programDistrict, `${expected.id} program district is missing`);
    assert.ok(topologyDistrict, `${expected.id} topology district is missing`);
    const expectedSkillIds = expected.skills.map(([id]) => id);
    assert.equal(programDistrict.label, expected.label);
    assert.equal(programDistrict.replacementUnit, "district-plate");
    assert.deepEqual(programDistrict.skillIds, expectedSkillIds);
    assert.equal(topologyDistrict.elevation, expected.elevation);
    assert.equal(topologyDistrict.replacementUnit, "district-plate");
    assert.deepEqual(
      NINJAONE_CAPITAL_SKILLS
        .filter(({ districtId }) => districtId === expected.id)
        .map(({ id, label }) => [id, label]),
      expected.skills,
    );
    assert.deepEqual(
      NINJAONE_CAPITAL_TOPOLOGY_PLOTS
        .filter(({ districtId, role }) => (
          districtId === expected.id && role === "skill"
        ))
        .map(({ skillId }) => skillId)
        .sort(),
      [...expectedSkillIds].sort(),
    );
    assert.ok(NINJAONE_CAPITAL_TOPOLOGY_PLOTS.some(({ districtId, role }) => (
      districtId === expected.id && role === "decoration"
    )));
  }
  assert.ok(NINJAONE_CAPITAL_TOPOLOGY_PLOTS.every(({ districtId, elevation }) => (
    NINJAONE_CAPITAL_TOPOLOGY_DISTRICTS.find(({ id }) => id === districtId)
      ?.elevation === elevation
  )));
});

test("NinjaOne Capital contains every resume skill and no project plot", () => {
  const roleSkillIds = NINJAONE_CAPITAL_SKILLS.map(({ id }) => id).sort();
  const requiredSkillIds = [
    ...NINJAONE_CAPITAL_TOPOLOGY_PROGRAM.requiredSkillIds,
  ].sort();
  const skillPlots = NINJAONE_CAPITAL_TOPOLOGY_PLOTS.filter(
    ({ role }) => role === "skill",
  );
  const decorativePlots = NINJAONE_CAPITAL_TOPOLOGY_PLOTS.filter(
    ({ role }) => role === "decoration",
  );
  const invalidSkillIds = [
    "safe-writes",
    "data-contracts",
    "protocol-gateway",
    "workflow-orchestration",
    "operator-control",
    "cloud-infrastructure",
    "kubernetes",
    "aws-bedrock",
    "bitbucket",
    "grpc",
    "rest-api",
    "openapi",
  ];

  assert.equal(NINJAONE_CAPITAL_TOPOLOGY_PROGRAM.territoryId, "ninjaone");
  assert.equal(NINJAONE_CAPITAL_TOPOLOGY_PROGRAM.cityRole, "capital");
  assert.equal(
    NINJAONE_CAPITAL_TOPOLOGY_PROGRAM.skillProgramId,
    "career-world/capitals/ninjaone/skill-program@r1",
  );
  assert.equal(
    NINJAONE_CAPITAL_TOPOLOGY_PROGRAM.projectPlotsAllowed,
    false,
  );
  assert.equal(NINJAONE_CAPITAL_TOPOLOGY_ACCEPTANCE.requiresEveryRoleSkill, true);
  assert.equal(skillPlots.length, 18);
  assert.deepEqual(requiredSkillIds, roleSkillIds);
  assert.deepEqual(
    skillPlots.map(({ skillId }) => skillId).sort(),
    requiredSkillIds,
  );
  assert.ok(requiredSkillIds.includes("golang"));
  assert.ok(invalidSkillIds.every((id) => !requiredSkillIds.includes(id)));
  assert.ok(skillPlots.every(({ layerOwner }) => layerOwner === "skill"));
  assert.ok(
    decorativePlots.length
      >= NINJAONE_CAPITAL_TOPOLOGY_PROGRAM.minimumDecorativePlotCount,
  );
  assert.ok(decorativePlots.every(
    ({ layerOwner }) => layerOwner === "decoration",
  ));
  assert.ok(NINJAONE_CAPITAL_TOPOLOGY_PLOTS.every(
    ({ id, role }) => !id.startsWith("project-") && role !== "project",
  ));
  assert.equal(
    NINJAONE_CAPITAL_TOPOLOGY_PLOTS.filter(({ role }) => role === "station").length,
    1,
  );
});

test("rail detail and the train station remain transportation-owned", () => {
  const railDetails = [
    "rails",
    "ties",
    "switches",
    "signals",
    "station-building",
    "platforms",
    "train",
  ];
  assert.equal(NINJAONE_CAPITAL_TOPOLOGY_ACCEPTANCE.baseContainsRailDetail, false);
  assert.ok(railDetails.every((detail) => (
    !NINJAONE_CAPITAL_TOPOLOGY_OWNERSHIP.base.includes(detail)
  )));
  assert.ok(railDetails.every((detail) => (
    NINJAONE_CAPITAL_TOPOLOGY_OWNERSHIP.transportation.includes(detail)
  )));
  assert.equal(NINJAONE_CAPITAL_TOPOLOGY_RAIL_CORRIDOR.layerOwner, "transportation");
  assert.equal(
    NINJAONE_CAPITAL_TOPOLOGY_RAIL_CORRIDOR.baseOwnership,
    "graded-corridor-only",
  );
  const station = NINJAONE_CAPITAL_TOPOLOGY_PLOTS.find(
    ({ id }) => id === NINJAONE_CAPITAL_TOPOLOGY_STATION_PLOT_ID,
  );
  assert.ok(station);
  assert.equal(station.layerOwner, "transportation");
  assert.equal(station.role, "station");
  assert.ok(NINJAONE_CAPITAL_TOPOLOGY_ROADS.some(
    ({ id }) => id === NINJAONE_CAPITAL_TOPOLOGY_STATION_ACCESS_ROAD_ID,
  ));
});

test("the isolated capital preview mounts only the topology proof visual layers", async () => {
  const [page, scene, proof] = await Promise.all([
    readFile(path.join(
      root,
      "app/career-world/previews/ninjaone-capital-topology/page.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/composition/WorldScene.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/development/NinjaOneCapitalTopologyProof.tsx",
    ), "utf8"),
  ]);
  assert.match(page, /<CareerWorld enableDevelopmentTools topologyProof/);
  assert.match(
    scene,
    /topologyProof \? \(\s*<NinjaOneCapitalTopologyProof camera=\{camera\} \/>/,
  );
  assert.match(
    scene,
    /\) : \(\s*<>\s*<InfrastructureLayer[\s\S]*<FoliageLayer/,
  );
  assert.match(proof, /data-topology-layer="base-road-network"/);
  assert.match(proof, /data-topology-layer="plot-labels"/);
  assert.match(proof, /data-topology-layer="resume-skill-districts"/);
  assert.match(proof, /data-district-id=\{plot\.districtId\}/);
  assert.match(proof, /data-topology-layer="transportation-preview"/);
  assert.match(proof, /data-topology-layer="environment-transition-reservations"/);
});
