import manifest from "../../../../public/career-world/capitals/ninjaone/manifests/topology-proof-r1.json" with { type: "json" };
import skillProgramManifest from "../../../../public/career-world/capitals/ninjaone/manifests/skill-program-r1.json" with { type: "json" };
import territoryManifest from "../../../../public/career-world/layers/territory-landform/manifests/world-territories-r4.json" with { type: "json" };
import type { CameraView } from "../../shared/camera";
import type { Pair } from "../../shared/camera";

export type NinjaOneCapitalTopologyElevation = 0 | 1 | 2;
export type NinjaOneCapitalTopologyLayerOwner =
  | "decoration"
  | "skill"
  | "transportation";
export type NinjaOneCapitalSkillCategory =
  | "ai-integration"
  | "data"
  | "developer-platform"
  | "frontend"
  | "infrastructure"
  | "integration"
  | "language";
export type NinjaOneCapitalSkillDistrictId =
  | "apis-integration"
  | "application-development"
  | "infrastructure-data";

export interface NinjaOneCapitalSkill {
  readonly category: NinjaOneCapitalSkillCategory;
  readonly districtId: NinjaOneCapitalSkillDistrictId;
  readonly id: string;
  readonly label: string;
}

export interface NinjaOneCapitalSkillDistrict {
  readonly id: NinjaOneCapitalSkillDistrictId;
  readonly label: string;
  readonly replacementUnit: "district-plate";
  readonly skillIds: readonly string[];
}

export interface NinjaOneCapitalTopologyElevationBand {
  readonly elevation: NinjaOneCapitalTopologyElevation;
  readonly id: string;
  readonly polygon: readonly Pair[];
}

export interface NinjaOneCapitalTopologyDistrict extends NinjaOneCapitalSkillDistrict {
  readonly elevation: NinjaOneCapitalTopologyElevation;
  readonly elevationBandId: string;
  readonly labelPoint: Pair;
  readonly polygon: readonly Pair[];
}

export interface NinjaOneCapitalTopologyWall {
  readonly elevationAbove: NinjaOneCapitalTopologyElevation;
  readonly elevationBelow: NinjaOneCapitalTopologyElevation;
  readonly id: string;
  readonly points: readonly Pair[];
}

export interface NinjaOneCapitalTopologyRoad {
  readonly closed?: boolean;
  readonly fromElevation: NinjaOneCapitalTopologyElevation;
  readonly id: string;
  readonly kind: "arterial" | "collector" | "local" | "ramp";
  readonly maximumGradePercent?: number;
  readonly points: readonly Pair[];
  readonly toElevation: NinjaOneCapitalTopologyElevation;
  readonly width: number;
}

export interface NinjaOneCapitalTopologyPedestrianLoop {
  readonly elevation: NinjaOneCapitalTopologyElevation;
  readonly id: string;
  readonly points: readonly Pair[];
}

export interface NinjaOneCapitalTopologyStair {
  readonly bottomApproach: readonly Pair[];
  readonly bottomLanding: Pair;
  readonly fromElevation: NinjaOneCapitalTopologyElevation;
  readonly id: string;
  readonly topApproach: readonly Pair[];
  readonly toElevation: NinjaOneCapitalTopologyElevation;
  readonly topLanding: Pair;
  readonly width: number;
}

export interface NinjaOneCapitalTopologyPlot {
  readonly accessPoint: Pair;
  readonly districtId: NinjaOneCapitalSkillDistrictId;
  readonly elevation: NinjaOneCapitalTopologyElevation;
  readonly id: string;
  readonly label: string;
  readonly layerOwner: NinjaOneCapitalTopologyLayerOwner;
  readonly polygon: readonly Pair[];
  readonly role: "decoration" | "skill" | "station";
  readonly skillId?: string;
}

export interface NinjaOneCapitalTopologyProgram {
  readonly cityRole: "capital";
  readonly districtIds: readonly NinjaOneCapitalSkillDistrictId[];
  readonly minimumDecorativePlotCount: number;
  readonly projectPlotsAllowed: false;
  readonly requiredSkillIds: readonly string[];
  readonly skillProgramId: string;
  readonly territoryId: "ninjaone";
}

export interface NinjaOneCapitalTopologyTerrainAuthority {
  readonly buildableSlopeThreshold: number;
  readonly elevationOverlayPath: string;
  readonly heightFieldPath: string;
  readonly landMaskPath: string;
  readonly landThreshold: number;
  readonly minimumCityBuildableCoverage: number;
  readonly minimumCityLandCoverage: number;
  readonly minimumPlotBuildableCoverage: number;
  readonly minimumPlotLandCoverage: number;
  readonly slopeFieldPath: string;
  readonly territoryId: "ninjaone";
  readonly territoryManifestId: string;
  readonly worldLayoutId: string;
}

export interface NinjaOneCapitalTopologyTransitionZone {
  readonly id: string;
  readonly kind: "forest-edge" | "terraced-green";
  readonly polygon: readonly Pair[];
}

export interface NinjaOneCapitalTopologyRailCorridor {
  readonly baseOwnership: "graded-corridor-only";
  readonly elevation: NinjaOneCapitalTopologyElevation;
  readonly id: string;
  readonly layerOwner: "transportation";
  readonly points: readonly Pair[];
  readonly width: number;
}

export interface NinjaOneCapitalTopologyGridCell {
  readonly id: "B1" | "B2" | "C1" | "C2";
  readonly origin: Pair;
  readonly span: Pair;
}

const GRID_CELL_BOUNDS = Object.freeze({
  B1: Object.freeze({
    bottom: 1 / 6,
    left: 1 / 8,
    right: 2 / 8,
    top: 0,
  }),
  B2: Object.freeze({
    bottom: 2 / 6,
    left: 1 / 8,
    right: 2 / 8,
    top: 1 / 6,
  }),
  C1: Object.freeze({
    bottom: 1 / 6,
    left: 2 / 8,
    right: 3 / 8,
    top: 0,
  }),
  C2: Object.freeze({
    bottom: 2 / 6,
    left: 2 / 8,
    right: 3 / 8,
    top: 1 / 6,
  }),
});

function finitePair(value: readonly number[], label: string): Pair {
  if (
    value.length !== 2
    || value.some((entry) => !Number.isFinite(entry))
  ) {
    throw new TypeError(`${label} must contain two finite coordinates.`);
  }
  return Object.freeze([value[0], value[1]] as Pair);
}

function pointList(
  value: readonly (readonly number[])[],
  label: string,
  artboard: Pair,
): readonly Pair[] {
  if (value.length < 2) {
    throw new RangeError(`${label} must contain at least two points.`);
  }
  return Object.freeze(value.map((point, index) => {
    const parsed = finitePair(point, `${label}[${index}]`);
    if (
      parsed[0] < 0
      || parsed[0] > artboard[0]
      || parsed[1] < 0
      || parsed[1] > artboard[1]
    ) {
      throw new RangeError(`${label}[${index}] leaves the topology artboard.`);
    }
    return parsed;
  }));
}

function isElevation(value: number): value is NinjaOneCapitalTopologyElevation {
  return value === 0 || value === 1 || value === 2;
}

function requireElevation(value: number, label: string): NinjaOneCapitalTopologyElevation {
  if (!isElevation(value)) {
    throw new RangeError(`${label} must be elevation 0, 1, or 2.`);
  }
  return value;
}

function requireRoadKind(
  value: string,
  label: string,
): NinjaOneCapitalTopologyRoad["kind"] {
  if (
    value !== "arterial"
    && value !== "collector"
    && value !== "local"
    && value !== "ramp"
  ) {
    throw new TypeError(`${label} is not a supported road kind.`);
  }
  return value;
}

function requirePlotOwner(
  value: string,
  label: string,
): NinjaOneCapitalTopologyLayerOwner {
  if (
    value !== "decoration"
    && value !== "skill"
    && value !== "transportation"
  ) {
    throw new TypeError(`${label} is not a supported plot owner.`);
  }
  return value;
}

function requirePlotRole(
  value: string,
  label: string,
): NinjaOneCapitalTopologyPlot["role"] {
  if (
    value !== "decoration"
    && value !== "skill"
    && value !== "station"
  ) {
    throw new TypeError(`${label} is not a supported plot role.`);
  }
  return value;
}

function requireSkillDistrictId(
  value: string,
  label: string,
): NinjaOneCapitalSkillDistrictId {
  if (
    value !== "apis-integration"
    && value !== "application-development"
    && value !== "infrastructure-data"
  ) {
    throw new TypeError(`${label} is not a supported resume skill district.`);
  }
  return value;
}

function requireDistrictReplacementUnit(
  value: string,
  label: string,
): NinjaOneCapitalSkillDistrict["replacementUnit"] {
  if (value !== "district-plate") {
    throw new TypeError(`${label} is not an independently replaceable district plate.`);
  }
  return value;
}

function requireSkillCategory(
  value: string,
  label: string,
): NinjaOneCapitalSkillCategory {
  if (
    value !== "ai-integration"
    && value !== "data"
    && value !== "developer-platform"
    && value !== "frontend"
    && value !== "infrastructure"
    && value !== "integration"
    && value !== "language"
  ) {
    throw new TypeError(`${label} is not a supported skill category.`);
  }
  return value;
}

function requireTransitionKind(
  value: string,
  label: string,
): NinjaOneCapitalTopologyTransitionZone["kind"] {
  if (value !== "forest-edge" && value !== "terraced-green") {
    throw new TypeError(`${label} is not a supported transition kind.`);
  }
  return value;
}

function requireGridCell(
  value: string,
  label: string,
): NinjaOneCapitalTopologyGridCell["id"] {
  if (value !== "B1" && value !== "B2" && value !== "C1" && value !== "C2") {
    throw new TypeError(`${label} is not an approved topology grid cell.`);
  }
  return value;
}

const ninjaOneTerritorySource = territoryManifest.territories.find(
  ({ id }) => id === "ninjaone",
);

if (
  !ninjaOneTerritorySource
  || manifest.schemaVersion !== 1
  || manifest.id !== "career-world/capitals/ninjaone/topology-proof@r1"
  || manifest.status !== "qa-only"
  || manifest.coordinateSpace !== "registered-plate-pixels"
  || manifest.registration.id
    !== "ninjaone-capital-b1-b2-c1-c2-terrain-conformed-topology@r1"
  || manifest.registration.gridCells.join(",") !== "B1,B2,C1,C2"
  || manifest.registration.terrainAuthority.territoryId !== "ninjaone"
  || manifest.registration.terrainAuthority.territoryManifestId
    !== territoryManifest.id
  || territoryManifest.id !== "career-world/world-territories@r4"
  || manifest.perspective.projection !== "parallel-isometric"
  || !manifest.perspective.verticalsRemainVertical
  || manifest.transportation.railCorridor.baseOwnership
    !== "graded-corridor-only"
  || manifest.transportation.railCorridor.layerOwner !== "transportation"
  || manifest.ownership.base.includes("rails")
  || !manifest.ownership.transportation.includes("rails")
  || manifest.capitalProgram.territoryId !== "ninjaone"
  || manifest.capitalProgram.cityRole !== "capital"
  || manifest.capitalProgram.projectPlotsAllowed
  || manifest.capitalProgram.skillProgramId !== skillProgramManifest.id
  || skillProgramManifest.schemaVersion !== 1
  || skillProgramManifest.id !== "career-world/capitals/ninjaone/skill-program@r1"
  || skillProgramManifest.status !== "qa-source"
  || skillProgramManifest.territoryId !== "ninjaone"
  || skillProgramManifest.sourceSection !== "Technical Skills"
) {
  throw new TypeError(
    "NinjaOne Capital B1/B2/C1/C2 topology proof identity is invalid.",
  );
}

const terrainAuthority = manifest.registration.terrainAuthority;
if (
  !Number.isInteger(terrainAuthority.landThreshold)
  || !Number.isInteger(terrainAuthority.buildableSlopeThreshold)
  || terrainAuthority.landThreshold < 1
  || terrainAuthority.landThreshold > 255
  || terrainAuthority.buildableSlopeThreshold < 1
  || terrainAuthority.buildableSlopeThreshold > 255
  || terrainAuthority.minimumCityLandCoverage < 0
  || terrainAuthority.minimumCityLandCoverage > 1
  || terrainAuthority.minimumCityBuildableCoverage < 0
  || terrainAuthority.minimumCityBuildableCoverage > 1
  || terrainAuthority.minimumPlotLandCoverage < 0
  || terrainAuthority.minimumPlotLandCoverage > 1
  || terrainAuthority.minimumPlotBuildableCoverage < 0
  || terrainAuthority.minimumPlotBuildableCoverage > 1
) {
  throw new TypeError("NinjaOne Capital terrain authority is invalid.");
}

export const NINJAONE_CAPITAL_TOPOLOGY_TERRAIN_AUTHORITY:
NinjaOneCapitalTopologyTerrainAuthority = Object.freeze({
  ...terrainAuthority,
  territoryId: "ninjaone",
});

export const NINJAONE_CAPITAL_SKILL_DISTRICTS:
readonly NinjaOneCapitalSkillDistrict[] = Object.freeze(
  skillProgramManifest.districts.map((district) => Object.freeze({
    id: requireSkillDistrictId(district.id, `${district.id}.id`),
    label: district.label,
    replacementUnit: requireDistrictReplacementUnit(
      district.replacementUnit,
      `${district.id}.replacementUnit`,
    ),
    skillIds: Object.freeze([...district.skillIds]),
  })),
);
const skillDistrictById = new Map(
  NINJAONE_CAPITAL_SKILL_DISTRICTS.map((district) => [district.id, district]),
);
const districtIds = Object.freeze(
  NINJAONE_CAPITAL_SKILL_DISTRICTS.map(({ id }) => id),
);

export const NINJAONE_CAPITAL_SKILLS: readonly NinjaOneCapitalSkill[] =
  Object.freeze(skillProgramManifest.skills.map((skill) => Object.freeze({
    category: requireSkillCategory(skill.category, `${skill.id}.category`),
    districtId: requireSkillDistrictId(
      skill.districtId,
      `${skill.id}.districtId`,
    ),
    id: skill.id,
    label: skill.label,
  })));
const requiredSkillIds = Object.freeze(
  NINJAONE_CAPITAL_SKILLS.map(({ id }) => id),
);
const skillById = new Map(
  NINJAONE_CAPITAL_SKILLS.map((skill) => [skill.id, skill]),
);
const declaredDistrictSkillIds = NINJAONE_CAPITAL_SKILL_DISTRICTS.flatMap(
  ({ skillIds }) => skillIds,
);
if (
  districtIds.join(",")
    !== "application-development,infrastructure-data,apis-integration"
  || NINJAONE_CAPITAL_SKILL_DISTRICTS.some(({ id, label, skillIds }) => (
    !id || !label.trim() || skillIds.length === 0
  ))
  || new Set(districtIds).size !== NINJAONE_CAPITAL_SKILL_DISTRICTS.length
  || new Set(NINJAONE_CAPITAL_SKILL_DISTRICTS.map(({ label }) => label)).size
    !== NINJAONE_CAPITAL_SKILL_DISTRICTS.length
  || requiredSkillIds.length === 0
  || NINJAONE_CAPITAL_SKILLS.some(({ id, label }) => !id.trim() || !label.trim())
  || new Set(requiredSkillIds).size !== requiredSkillIds.length
  || new Set(NINJAONE_CAPITAL_SKILLS.map(({ label }) => label)).size
    !== NINJAONE_CAPITAL_SKILLS.length
  || declaredDistrictSkillIds.length !== requiredSkillIds.length
  || new Set(declaredDistrictSkillIds).size !== requiredSkillIds.length
  || declaredDistrictSkillIds.some((skillId) => !skillById.has(skillId))
  || NINJAONE_CAPITAL_SKILLS.some(({ districtId, id }) => (
    !skillDistrictById.get(districtId)?.skillIds.includes(id)
  ))
  || !Number.isInteger(manifest.capitalProgram.minimumDecorativePlotCount)
  || manifest.capitalProgram.minimumDecorativePlotCount < 1
) {
  throw new TypeError("NinjaOne Capital program requirements are invalid.");
}

export const NINJAONE_CAPITAL_TOPOLOGY_PROGRAM:
NinjaOneCapitalTopologyProgram = Object.freeze({
  cityRole: "capital",
  districtIds,
  minimumDecorativePlotCount:
    manifest.capitalProgram.minimumDecorativePlotCount,
  projectPlotsAllowed: false,
  requiredSkillIds,
  skillProgramId: skillProgramManifest.id,
  territoryId: "ninjaone",
});

export const NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD = finitePair(
  manifest.registration.artboard,
  "NinjaOne Capital topology artboard",
);
export const NINJAONE_CAPITAL_TOPOLOGY_WORLD_ORIGIN = finitePair(
  ninjaOneTerritorySource.development.capitalEnvelope.origin,
  "NinjaOne Capital topology world origin",
);
export const NINJAONE_CAPITAL_TOPOLOGY_WORLD_SPAN = finitePair(
  ninjaOneTerritorySource.development.capitalEnvelope.span,
  "NinjaOne Capital topology world span",
);
export const NINJAONE_CAPITAL_TOPOLOGY_WORLD_ANCHOR = finitePair(
  ninjaOneTerritorySource.development.capitalAnchor,
  "NinjaOne Capital topology world anchor",
);

if (
  NINJAONE_CAPITAL_TOPOLOGY_WORLD_ORIGIN[0] < 0
  || NINJAONE_CAPITAL_TOPOLOGY_WORLD_ORIGIN[1] < 0
  || NINJAONE_CAPITAL_TOPOLOGY_WORLD_ORIGIN[0] + NINJAONE_CAPITAL_TOPOLOGY_WORLD_SPAN[0]
    > 1
  || NINJAONE_CAPITAL_TOPOLOGY_WORLD_ORIGIN[1] + NINJAONE_CAPITAL_TOPOLOGY_WORLD_SPAN[1]
    > 1
) {
  throw new RangeError("NinjaOne Capital topology registration leaves the world plane.");
}

export const NINJAONE_CAPITAL_TOPOLOGY_REGISTRATION_ID = manifest.registration.id;
export const NINJAONE_CAPITAL_TOPOLOGY_GRID_CELLS = Object.freeze(
  manifest.registration.gridCells.map((cell, index) => (
    requireGridCell(cell, `registration.gridCells[${index}]`)
  )),
);
export const NINJAONE_CAPITAL_TOPOLOGY_ALLOWED_GRID_CELLS:
readonly NinjaOneCapitalTopologyGridCell[] = Object.freeze(
  NINJAONE_CAPITAL_TOPOLOGY_GRID_CELLS.map((id) => {
    const bounds = GRID_CELL_BOUNDS[id];
    return Object.freeze({
      id,
      origin: Object.freeze([bounds.left, bounds.top] as Pair),
      span: Object.freeze([
        bounds.right - bounds.left,
        bounds.bottom - bounds.top,
      ] as Pair),
    });
  }),
);
export const NINJAONE_CAPITAL_TOPOLOGY_PLANNING_ENVELOPE_ID =
  manifest.planningEnvelope.id;
export const NINJAONE_CAPITAL_TOPOLOGY_PLANNING_ENVELOPE = pointList(
  manifest.planningEnvelope.polygon,
  "NinjaOne Capital topology planning envelope",
  NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD,
);
export const NINJAONE_CAPITAL_TOPOLOGY_BOUNDARY = pointList(
  manifest.boundary,
  "NinjaOne Capital topology boundary",
  NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD,
);

function topologyPointInsideAllowedGrid([x, y]: Pair): boolean {
  const registrationEpsilon = 1e-9;
  const worldX = NINJAONE_CAPITAL_TOPOLOGY_WORLD_ORIGIN[0]
    + x / NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD[0] * NINJAONE_CAPITAL_TOPOLOGY_WORLD_SPAN[0];
  const worldY = NINJAONE_CAPITAL_TOPOLOGY_WORLD_ORIGIN[1]
    + y / NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD[1] * NINJAONE_CAPITAL_TOPOLOGY_WORLD_SPAN[1];
  return NINJAONE_CAPITAL_TOPOLOGY_ALLOWED_GRID_CELLS.some(({ origin, span }) => (
    worldX >= origin[0] - registrationEpsilon
    && worldX <= origin[0] + span[0] + registrationEpsilon
    && worldY >= origin[1] - registrationEpsilon
    && worldY <= origin[1] + span[1] + registrationEpsilon
  ));
}

for (const [label, points] of [
  ["planning envelope", NINJAONE_CAPITAL_TOPOLOGY_PLANNING_ENVELOPE],
  ["city boundary", NINJAONE_CAPITAL_TOPOLOGY_BOUNDARY],
] as const) {
  if (!points.every(topologyPointInsideAllowedGrid)) {
    throw new RangeError(`NinjaOne Capital ${label} leaves B1, B2, C1, or C2.`);
  }
}

export const NINJAONE_CAPITAL_TOPOLOGY_ELEVATION_BANDS:
readonly NinjaOneCapitalTopologyElevationBand[] = Object.freeze(
  manifest.elevationBands.map((band) => Object.freeze({
    elevation: requireElevation(band.elevation, `${band.id}.elevation`),
    id: band.id,
    polygon: pointList(
      band.polygon,
      `${band.id}.polygon`,
      NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD,
    ),
  })),
);

const elevationBandById = new Map(
  NINJAONE_CAPITAL_TOPOLOGY_ELEVATION_BANDS.map((band) => [band.id, band]),
);
export const NINJAONE_CAPITAL_TOPOLOGY_DISTRICTS:
readonly NinjaOneCapitalTopologyDistrict[] = Object.freeze(
  manifest.districts.map((district) => {
    const districtId = requireSkillDistrictId(
      district.id,
      `${district.id}.id`,
    );
    const programDistrict = skillDistrictById.get(districtId);
    const elevationBand = elevationBandById.get(district.elevationBandId);
    if (!programDistrict || !elevationBand) {
      throw new TypeError(`${district.id} does not resolve to a program district and elevation band.`);
    }
    return Object.freeze({
      ...programDistrict,
      elevation: elevationBand.elevation,
      elevationBandId: elevationBand.id,
      labelPoint: finitePair(
        district.labelPoint,
        `${district.id}.labelPoint`,
      ),
      polygon: elevationBand.polygon,
    });
  }),
);
const topologyDistrictById = new Map(
  NINJAONE_CAPITAL_TOPOLOGY_DISTRICTS.map((district) => [district.id, district]),
);
if (
  NINJAONE_CAPITAL_TOPOLOGY_DISTRICTS.length
    !== NINJAONE_CAPITAL_SKILL_DISTRICTS.length
  || new Set(NINJAONE_CAPITAL_TOPOLOGY_DISTRICTS.map(({ id }) => id)).size
    !== NINJAONE_CAPITAL_TOPOLOGY_DISTRICTS.length
  || new Set(NINJAONE_CAPITAL_TOPOLOGY_DISTRICTS.map(({ elevationBandId }) => (
    elevationBandId
  ))).size !== NINJAONE_CAPITAL_TOPOLOGY_DISTRICTS.length
  || NINJAONE_CAPITAL_SKILL_DISTRICTS.some(({ id }) => !topologyDistrictById.has(id))
) {
  throw new TypeError("NinjaOne Capital must map every resume skill section to one district plate.");
}

export const NINJAONE_CAPITAL_TOPOLOGY_RETAINING_WALLS:
readonly NinjaOneCapitalTopologyWall[] = Object.freeze(
  manifest.retainingWalls.map((wall) => Object.freeze({
    elevationAbove: requireElevation(
      wall.elevationAbove,
      `${wall.id}.elevationAbove`,
    ),
    elevationBelow: requireElevation(
      wall.elevationBelow,
      `${wall.id}.elevationBelow`,
    ),
    id: wall.id,
    points: pointList(
      wall.points,
      `${wall.id}.points`,
      NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD,
    ),
  })),
);

export const NINJAONE_CAPITAL_TOPOLOGY_ROADS: readonly NinjaOneCapitalTopologyRoad[] =
  Object.freeze(manifest.roads.map((road) => Object.freeze({
    closed: "closed" in road ? road.closed : undefined,
    fromElevation: requireElevation(
      road.fromElevation,
      `${road.id}.fromElevation`,
    ),
    id: road.id,
    kind: requireRoadKind(road.kind, `${road.id}.kind`),
    maximumGradePercent: "maximumGradePercent" in road
      ? road.maximumGradePercent
      : undefined,
    points: pointList(
      road.points,
      `${road.id}.points`,
      NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD,
    ),
    toElevation: requireElevation(
      road.toElevation,
      `${road.id}.toElevation`,
    ),
    width: road.width,
  })));

export const NINJAONE_CAPITAL_TOPOLOGY_PEDESTRIAN_LOOPS:
readonly NinjaOneCapitalTopologyPedestrianLoop[] = Object.freeze(
  manifest.pedestrianLoops.map((loop) => Object.freeze({
    elevation: requireElevation(loop.elevation, `${loop.id}.elevation`),
    id: loop.id,
    points: pointList(
      loop.points,
      `${loop.id}.points`,
      NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD,
    ),
  })),
);

export const NINJAONE_CAPITAL_TOPOLOGY_STAIRS: readonly NinjaOneCapitalTopologyStair[] =
  Object.freeze(manifest.stairs.map((stair) => Object.freeze({
    bottomApproach: pointList(
      stair.bottomApproach,
      `${stair.id}.bottomApproach`,
      NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD,
    ),
    bottomLanding: finitePair(
      stair.bottomLanding,
      `${stair.id}.bottomLanding`,
    ),
    fromElevation: requireElevation(
      stair.fromElevation,
      `${stair.id}.fromElevation`,
    ),
    id: stair.id,
    topApproach: pointList(
      stair.topApproach,
      `${stair.id}.topApproach`,
      NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD,
    ),
    toElevation: requireElevation(
      stair.toElevation,
      `${stair.id}.toElevation`,
    ),
    topLanding: finitePair(stair.topLanding, `${stair.id}.topLanding`),
    width: stair.width,
  })));

export const NINJAONE_CAPITAL_TOPOLOGY_PLOTS: readonly NinjaOneCapitalTopologyPlot[] =
  Object.freeze(manifest.plots.map((plot) => Object.freeze({
    accessPoint: finitePair(plot.accessPoint, `${plot.id}.accessPoint`),
    districtId: requireSkillDistrictId(
      plot.districtId,
      `${plot.id}.districtId`,
    ),
    elevation: requireElevation(plot.elevation, `${plot.id}.elevation`),
    id: plot.id,
    label: plot.label,
    layerOwner: requirePlotOwner(plot.layerOwner, `${plot.id}.layerOwner`),
    polygon: pointList(
      plot.polygon,
      `${plot.id}.polygon`,
      NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD,
    ),
    role: requirePlotRole(plot.role, `${plot.id}.role`),
    skillId: "skillId" in plot
      ? plot.skillId
      : undefined,
  })));

const skillPlots = NINJAONE_CAPITAL_TOPOLOGY_PLOTS.filter(
  ({ role }) => role === "skill",
);
const plottedSkillIds = new Set(skillPlots.map(
  ({ skillId }) => skillId,
));
if (
  NINJAONE_CAPITAL_TOPOLOGY_PLOTS.some(({ id, label }) => !id || !label.trim())
  || new Set(NINJAONE_CAPITAL_TOPOLOGY_PLOTS.map(({ id }) => id)).size
    !== NINJAONE_CAPITAL_TOPOLOGY_PLOTS.length
  || new Set(NINJAONE_CAPITAL_TOPOLOGY_PLOTS.map(({ label }) => label)).size
    !== NINJAONE_CAPITAL_TOPOLOGY_PLOTS.length
  || skillPlots.length !== requiredSkillIds.length
  || NINJAONE_CAPITAL_TOPOLOGY_PLOTS.some(({ districtId, elevation }) => (
    topologyDistrictById.get(districtId)?.elevation !== elevation
  ))
  || skillPlots.some(({ districtId, label, layerOwner, skillId }) => (
    layerOwner !== "skill"
    || !skillId
    || !requiredSkillIds.includes(skillId)
    || skillById.get(skillId)?.label !== label
    || skillById.get(skillId)?.districtId !== districtId
  ))
  || NINJAONE_CAPITAL_TOPOLOGY_PLOTS.some(({ role, skillId }) => (
    role !== "skill" && skillId !== undefined
  ))
  || requiredSkillIds.some((id) => !plottedSkillIds.has(id))
  || NINJAONE_CAPITAL_TOPOLOGY_PLOTS.filter(({ role }) => role === "decoration").length
    < NINJAONE_CAPITAL_TOPOLOGY_PROGRAM.minimumDecorativePlotCount
) {
  throw new TypeError(
    "NinjaOne Capital plots must cover its independent role-skill program and remain project-free.",
  );
}

export const NINJAONE_CAPITAL_TOPOLOGY_RAIL_CORRIDOR:
NinjaOneCapitalTopologyRailCorridor = Object.freeze({
  baseOwnership: "graded-corridor-only",
  elevation: requireElevation(
    manifest.transportation.railCorridor.elevation,
    "railCorridor.elevation",
  ),
  id: manifest.transportation.railCorridor.id,
  layerOwner: "transportation",
  points: pointList(
    manifest.transportation.railCorridor.points,
    "railCorridor.points",
    NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD,
  ),
  width: manifest.transportation.railCorridor.width,
});

export const NINJAONE_CAPITAL_TOPOLOGY_STATION_PLOT_ID =
  manifest.transportation.stationPlotId;
export const NINJAONE_CAPITAL_TOPOLOGY_STATION_ACCESS_ROAD_ID =
  manifest.transportation.stationAccessRoadId;
export const NINJAONE_CAPITAL_TOPOLOGY_TRANSITION_ZONES:
readonly NinjaOneCapitalTopologyTransitionZone[] = Object.freeze(
  manifest.environmentTransitionZones.map((zone) => Object.freeze({
    id: zone.id,
    kind: requireTransitionKind(zone.kind, `${zone.id}.kind`),
    polygon: pointList(
      zone.polygon,
      `${zone.id}.polygon`,
      NINJAONE_CAPITAL_TOPOLOGY_ARTBOARD,
    ),
  })),
);

export const NINJAONE_CAPITAL_TOPOLOGY_OWNERSHIP = Object.freeze({
  base: Object.freeze([...manifest.ownership.base]),
  environment: Object.freeze([...manifest.ownership.environment]),
  integration: Object.freeze([...manifest.ownership.integration]),
  lighting: Object.freeze([...manifest.ownership.lighting]),
  transportation: Object.freeze([...manifest.ownership.transportation]),
});
export const NINJAONE_CAPITAL_TOPOLOGY_ACCEPTANCE = Object.freeze({
  ...manifest.acceptance,
});

export const NINJAONE_CAPITAL_TOPOLOGY_PROOF_CAMERA: CameraView = Object.freeze({
  origin: Object.freeze([0.105, 0] as Pair),
  span: Object.freeze([0.36, 0.36] as Pair),
});
