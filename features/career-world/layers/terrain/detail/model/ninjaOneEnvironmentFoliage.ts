import manifest from "../../../../../../public/career-world/capitals/ninjaone/environment/manifests/foliage-native-r4.json" with { type: "json" };
import type { CameraView, Pair } from "../../../../shared/camera";

export type NinjaOneEnvironmentFoliageResourceKind = "pooled-foliage-atlas";
export type NinjaOneEnvironmentFoliageComposition =
  | "registered-replacement"
  | "additive";
export type NinjaOneEnvironmentFoliageSpecies =
  | "native-conifer"
  | "russet-fantasy-tree"
  | "silver-aspen"
  | "alpine-shrub"
  | "wildflower-heather";

const VALID_FOLIAGE_SPECIES = new Set<NinjaOneEnvironmentFoliageSpecies>([
  "native-conifer",
  "russet-fantasy-tree",
  "silver-aspen",
  "alpine-shrub",
  "wildflower-heather",
]);
export type NinjaOneEnvironmentFoliageAtlasRect = readonly [
  number,
  number,
  number,
  number,
];

export interface NinjaOneEnvironmentFoliageResource {
  readonly decodedBytes: number;
  readonly dimensions: Pair;
  readonly frameCount: number;
  readonly id: string;
  readonly kind: NinjaOneEnvironmentFoliageResourceKind;
  readonly path: string;
  readonly sha256: string;
  readonly sourceMasterId: string;
}

export interface NinjaOneEnvironmentFoliageInstance {
  readonly animation: "canopy-bend";
  readonly artboardBounds: CameraView;
  readonly atlasResource: NinjaOneEnvironmentFoliageResource;
  readonly bendDegrees: number;
  readonly canopyAtlasRect: NinjaOneEnvironmentFoliageAtlasRect;
  /** Compatibility alias for resource-accounting callers. */
  readonly canopyResource: NinjaOneEnvironmentFoliageResource;
  readonly checkpoint: string;
  readonly composition: NinjaOneEnvironmentFoliageComposition;
  readonly durationSeconds: number;
  readonly gridCell: "B1" | "B2" | "C1" | "C2";
  readonly id: string;
  readonly lagDegrees: number;
  readonly neutralizationAtlasRect: NinjaOneEnvironmentFoliageAtlasRect | null;
  /** Compatibility alias for resource-accounting callers. */
  readonly neutralizationResource: NinjaOneEnvironmentFoliageResource;
  readonly paintedNodeCount: 1 | 2;
  readonly phaseSeconds: number;
  readonly pivotYPercent: number;
  readonly resource: NinjaOneEnvironmentFoliageResource;
  readonly resources: readonly NinjaOneEnvironmentFoliageResource[];
  readonly sourceMasterId: string;
  readonly species: NinjaOneEnvironmentFoliageSpecies;
  readonly sourceTargetRect: NinjaOneEnvironmentFoliageAtlasRect;
}

export interface NinjaOneEnvironmentFoliageEligibilityInput {
  readonly active: boolean;
  readonly camera: CameraView;
  readonly previousEligible: boolean;
  readonly shouldLoadCloseAssets: boolean;
  readonly showFoliage: boolean;
}

interface RawBounds {
  readonly origin: readonly number[];
  readonly span: readonly number[];
}

interface RawResource {
  readonly decodedBytes: number;
  readonly dimensions: readonly number[];
  readonly frameCount: number;
  readonly id: string;
  readonly kind: string;
  readonly path: string;
  readonly sha256: string;
  readonly sourceMasterId: string;
}

interface RawInstance {
  readonly animation: string;
  readonly artboardBounds: RawBounds;
  readonly atlasResourceId: string;
  readonly bendDegrees: number;
  readonly canopyAtlasRect: readonly number[];
  readonly checkpoint: string;
  readonly composition: string;
  readonly durationSeconds: number;
  readonly gridCell: string;
  readonly id: string;
  readonly lagDegrees: number;
  readonly neutralizationAtlasRect: readonly number[] | null;
  readonly paintedNodeCount: number;
  readonly phaseSeconds: number;
  readonly pivotYPercent: number;
  readonly sourceMasterId: string;
  readonly species: string;
  readonly sourceTargetRect: readonly number[];
}

const EXPECTED_ID = "career-world/capitals/ninjaone/foliage@r6";
const EXPECTED_SOURCE_MASTER_ID = "terrain-master-detail-r8";
const EXPECTED_SOURCE_MASTER_PATH =
  "/art-source/career-world/ninjaone-environment/production-r2/ninjaone-environment-terrain-master-detail-r8.png";
const RESOURCE_PATH_PREFIX =
  "/career-world/capitals/ninjaone/environment/shared/foliage-native-r4/";
const ENVIRONMENT_WORLD_ORIGIN = Object.freeze([0.125, 0] as Pair);
const ENVIRONMENT_WORLD_SPAN = Object.freeze([0.25, 1 / 3] as Pair);
const RUNTIME_TARGET_DIMENSIONS = Object.freeze([2880, 2160] as Pair);

function finitePair(values: readonly number[], label: string): Pair {
  if (values.length !== 2 || values.some((value) => !Number.isFinite(value))) {
    throw new TypeError(`${label} must contain two finite values.`);
  }
  return Object.freeze([values[0], values[1]] as Pair);
}

function finiteIntegerRect(
  values: readonly number[],
  label: string,
): NinjaOneEnvironmentFoliageAtlasRect {
  if (
    values.length !== 4
    || values.some((value) => !Number.isInteger(value) || value < 0)
    || values[2] <= 0
    || values[3] <= 0
  ) throw new TypeError(`${label} must be a positive finite integer rectangle.`);
  return Object.freeze([values[0], values[1], values[2], values[3]]);
}

function bounds(value: RawBounds, label: string): CameraView {
  const origin = finitePair(value.origin, `${label}.origin`);
  const span = finitePair(value.span, `${label}.span`);
  if (span.some((entry) => entry <= 0)) {
    throw new RangeError(`${label}.span must be positive.`);
  }
  return Object.freeze({ origin, span });
}

function rectFits(
  rect: NinjaOneEnvironmentFoliageAtlasRect,
  dimensions: Pair,
): boolean {
  return rect[0] + rect[2] <= dimensions[0]
    && rect[1] + rect[3] <= dimensions[1];
}

const registrationArtboard = finitePair(
  manifest.registration.artboard,
  "registration.artboard",
);
if (
  manifest.schemaVersion !== 5
  || manifest.id !== EXPECTED_ID
  || manifest.status !== "active-r8-native-and-additive-foliage"
  || manifest.sourceMaster.authority !== "active-r8-geology-master"
  || manifest.sourceMaster.id !== EXPECTED_SOURCE_MASTER_ID
  || manifest.sourceMaster.path !== EXPECTED_SOURCE_MASTER_PATH
  || manifest.sourceMaster.dimensions.join(",") !== "5760,4320"
  || manifest.sourceMaster.sha256.length !== 64
  || registrationArtboard.join(",") !== "1440,1080"
  || manifest.registration.boundingWorldView.origin.join(",") !== "0.125,0"
  || manifest.registration.boundingWorldView.span.join(",") !== `0.25,${1 / 3}`
  || manifest.registration.masterDimensions.join(",") !== "5760,4320"
  || manifest.registration.sourcePixelsPerArtboardUnit !== 4
  || manifest.registration.runtimeAtlasPixelsPerArtboardUnit !== 2
  || manifest.eligibility.maxDetailEnterSpan !== 0.12
  || manifest.eligibility.maxDetailRetainSpan !== 0.14
  || manifest.eligibility.viewportOverscanRatio !== 0.25
  || manifest.budgets.maximumSelectedGroups !== 32
  || manifest.budgets.maximumSupplementalNodes !== 64
  || manifest.budgets.nodesPerGroup !== 2
  || manifest.budgets.uniqueTextureResources !== 1
  || manifest.budgets.maximumTerrainTiles !== 4
  || manifest.resources.length !== 1
  || manifest.quality.atRestChangedPixels !== 0
  || manifest.quality.registeredConifers + manifest.quality.supplementalInstances
    !== manifest.instances.length
  || manifest.quality.registeredConifers < manifest.quality.minimumRegisteredConifers
) throw new TypeError("NinjaOne pooled foliage registration contract is invalid.");

const resourceMap = new Map<string, NinjaOneEnvironmentFoliageResource>();
for (const value of manifest.resources as readonly RawResource[]) {
  const dimensions = finitePair(value.dimensions, `resources.${value.id}.dimensions`);
  if (
    resourceMap.has(value.id)
    || value.kind !== "pooled-foliage-atlas"
    || !value.path.startsWith(RESOURCE_PATH_PREFIX)
    || value.sha256.length !== 64
    || value.sourceMasterId !== EXPECTED_SOURCE_MASTER_ID
    || !Number.isSafeInteger(value.decodedBytes)
    || value.decodedBytes !== dimensions[0] * dimensions[1] * 4
    || value.frameCount !== manifest.budgets.atlasFrameCount
  ) throw new TypeError(`resources.${value.id} is invalid.`);
  resourceMap.set(value.id, Object.freeze({
    decodedBytes: value.decodedBytes,
    dimensions,
    frameCount: value.frameCount,
    id: value.id,
    kind: "pooled-foliage-atlas" as const,
    path: value.path,
    sha256: value.sha256,
    sourceMasterId: value.sourceMasterId,
  }));
}

export const NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES = Object.freeze(
  (manifest.instances as readonly RawInstance[]).map((value) => {
    const atlasResource = resourceMap.get(value.atlasResourceId);
    const artboardBounds = bounds(value.artboardBounds, `instances.${value.id}`);
    const canopyAtlasRect = finiteIntegerRect(
      value.canopyAtlasRect,
      `instances.${value.id}.canopyAtlasRect`,
    );
    const neutralizationAtlasRect = value.neutralizationAtlasRect === null
      ? null
      : finiteIntegerRect(
          value.neutralizationAtlasRect,
          `instances.${value.id}.neutralizationAtlasRect`,
        );
    const sourceTargetRect = finiteIntegerRect(
      value.sourceTargetRect,
      `instances.${value.id}.sourceTargetRect`,
    );
    const centerX = artboardBounds.origin[0] + artboardBounds.span[0] * 0.5;
    const centerY = artboardBounds.origin[1] + artboardBounds.span[1] * 0.5;
    const gridCell = `${centerX < registrationArtboard[0] * 0.5 ? "B" : "C"}${
      centerY < registrationArtboard[1] * 0.5 ? "1" : "2"
    }` as NinjaOneEnvironmentFoliageInstance["gridCell"];
    if (
      !atlasResource
      || value.animation !== "canopy-bend"
      || value.gridCell !== gridCell
      || value.sourceMasterId !== EXPECTED_SOURCE_MASTER_ID
      || !value.checkpoint.startsWith(gridCell.toLowerCase())
      || !rectFits(canopyAtlasRect, atlasResource.dimensions)
      || (neutralizationAtlasRect !== null
        && !rectFits(neutralizationAtlasRect, atlasResource.dimensions))
      || !rectFits(sourceTargetRect, RUNTIME_TARGET_DIMENSIONS)
      || artboardBounds.origin[0] !== sourceTargetRect[0] / 2
      || artboardBounds.origin[1] !== sourceTargetRect[1] / 2
      || artboardBounds.span[0] !== sourceTargetRect[2] / 2
      || artboardBounds.span[1] !== sourceTargetRect[3] / 2
      || value.durationSeconds < 5
      || value.durationSeconds > 12
      || value.bendDegrees < 0.15
      || value.bendDegrees > 1.25
      || value.lagDegrees < 0.01
      || value.lagDegrees > 0.1
      || value.phaseSeconds > 0
      || value.phaseSeconds < -12
      || value.pivotYPercent < 88
      || value.pivotYPercent > 98
    ) throw new TypeError(`instances.${value.id} is invalid.`);
    const composition = value.composition as NinjaOneEnvironmentFoliageComposition;
    const species = value.species as NinjaOneEnvironmentFoliageSpecies;
    const replacement = composition === "registered-replacement";
    const additive = composition === "additive";
    if (
      (!replacement && !additive)
      || !VALID_FOLIAGE_SPECIES.has(species)
      || (replacement && (
        species !== "native-conifer"
        || neutralizationAtlasRect === null
        || neutralizationAtlasRect[2] !== canopyAtlasRect[2]
        || neutralizationAtlasRect[3] !== canopyAtlasRect[3]
        || canopyAtlasRect[2] !== sourceTargetRect[2]
        || canopyAtlasRect[3] !== sourceTargetRect[3]
        || value.paintedNodeCount !== 2
      ))
      || (additive && (
        species === "native-conifer"
        || neutralizationAtlasRect !== null
        || value.paintedNodeCount !== 1
      ))
    ) throw new TypeError(`instances.${value.id} composition is invalid.`);
    return Object.freeze({
      animation: "canopy-bend" as const,
      artboardBounds,
      atlasResource,
      bendDegrees: value.bendDegrees,
      canopyAtlasRect,
      canopyResource: atlasResource,
      checkpoint: value.checkpoint,
      composition,
      durationSeconds: value.durationSeconds,
      gridCell,
      id: value.id,
      lagDegrees: value.lagDegrees,
      neutralizationAtlasRect,
      neutralizationResource: atlasResource,
      paintedNodeCount: value.paintedNodeCount as 1 | 2,
      phaseSeconds: value.phaseSeconds,
      pivotYPercent: value.pivotYPercent,
      resource: atlasResource,
      resources: Object.freeze([atlasResource]),
      sourceMasterId: value.sourceMasterId,
      species,
      sourceTargetRect,
    });
  }),
);

const decodedBytes = [...resourceMap.values()].reduce(
  (total, resource) => total + resource.decodedBytes,
  0,
);
if (
  decodedBytes !== manifest.budgets.foliageDecodedBytes
  || decodedBytes !== manifest.budgets.atlasDecodedBytes
  || manifest.budgets.combinedDecodedBytes
    !== decodedBytes + manifest.budgets.terrainDecodedBytes
  || manifest.budgets.combinedDecodedBytes > manifest.budgets.maximumDecodedBytes
  || manifest.budgets.poolGroups !== NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES.length
  || manifest.registration.coveredGridCells.join(",") !== "B1,B2,C1,C2"
) throw new TypeError("NinjaOne pooled foliage budget contract is invalid.");

export const NINJAONE_ENVIRONMENT_FOLIAGE_ID = EXPECTED_ID;
export const NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_ENTER_SPAN =
  manifest.eligibility.maxDetailEnterSpan;
export const NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_RETAIN_SPAN =
  manifest.eligibility.maxDetailRetainSpan;
export const NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS =
  manifest.budgets.maximumSelectedGroups;
export const NINJAONE_ENVIRONMENT_FOLIAGE_NODES_PER_GROUP =
  manifest.budgets.nodesPerGroup;
export const NINJAONE_ENVIRONMENT_FOLIAGE_MAX_MOUNTED_NODES =
  manifest.budgets.maximumSupplementalNodes;
export const NINJAONE_ENVIRONMENT_FOLIAGE_MAX_ANIMATED_NODES =
  manifest.budgets.maximumSelectedGroups;
export const NINJAONE_ENVIRONMENT_FOLIAGE_DECODED_BYTES = decodedBytes;
export const NINJAONE_ENVIRONMENT_FOLIAGE_COMBINED_DECODED_BYTES =
  manifest.budgets.combinedDecodedBytes;
export const NINJAONE_ENVIRONMENT_FOLIAGE_RESOURCES = Object.freeze([
  ...resourceMap.values(),
]);

export function environmentFoliageResourceCohort(
  resources: readonly NinjaOneEnvironmentFoliageResource[],
): string {
  return [...resources]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(({ id, path }) => `${id}\t${path}`)
    .join("\n");
}

export function environmentFoliageCameraArtboardView(
  camera: CameraView,
): CameraView {
  return Object.freeze({
    origin: Object.freeze(camera.origin.map((value, index) => (
      (value - ENVIRONMENT_WORLD_ORIGIN[index])
      / ENVIRONMENT_WORLD_SPAN[index]
      * registrationArtboard[index]
    )) as [number, number]),
    span: Object.freeze(camera.span.map((value, index) => (
      value / ENVIRONMENT_WORLD_SPAN[index] * registrationArtboard[index]
    )) as [number, number]),
  });
}

export function resolveNinjaOneEnvironmentFoliageEligibility({
  active,
  camera,
  previousEligible,
  shouldLoadCloseAssets,
  showFoliage,
}: NinjaOneEnvironmentFoliageEligibilityInput): boolean {
  if (!active || !showFoliage || !shouldLoadCloseAssets) return false;
  const maximumSpan = previousEligible
    ? NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_RETAIN_SPAN
    : NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_ENTER_SPAN;
  return Math.max(...camera.span) <= maximumSpan;
}

function intersects(first: CameraView, second: CameraView): boolean {
  return first.origin[0] < second.origin[0] + second.span[0]
    && first.origin[0] + first.span[0] > second.origin[0]
    && first.origin[1] < second.origin[1] + second.span[1]
    && first.origin[1] + first.span[1] > second.origin[1];
}

function distanceFromViewCenter(
  view: CameraView,
  instance: NinjaOneEnvironmentFoliageInstance,
): number {
  const viewCenterX = view.origin[0] + view.span[0] * 0.5;
  const viewCenterY = view.origin[1] + view.span[1] * 0.5;
  const instanceCenterX = instance.artboardBounds.origin[0]
    + instance.artboardBounds.span[0] * 0.5;
  const instanceCenterY = instance.artboardBounds.origin[1]
    + instance.artboardBounds.span[1] * 0.5;
  return (viewCenterX - instanceCenterX) ** 2
    + (viewCenterY - instanceCenterY) ** 2;
}

function overscanned(view: CameraView): CameraView {
  const ratio = manifest.eligibility.viewportOverscanRatio;
  return Object.freeze({
    origin: Object.freeze([
      view.origin[0] - view.span[0] * ratio,
      view.origin[1] - view.span[1] * ratio,
    ] as [number, number]),
    span: Object.freeze([
      view.span[0] * (1 + ratio * 2),
      view.span[1] * (1 + ratio * 2),
    ] as [number, number]),
  });
}

function foliageDepth(instance: NinjaOneEnvironmentFoliageInstance): number {
  return instance.artboardBounds.origin[1] + instance.artboardBounds.span[1];
}

export function ninjaOneEnvironmentFoliageInstanceIntersectsCamera(
  camera: CameraView,
  instance: NinjaOneEnvironmentFoliageInstance,
): boolean {
  return intersects(environmentFoliageCameraArtboardView(camera), instance.artboardBounds);
}

export function selectNinjaOneEnvironmentFoliageInstances(
  camera: CameraView,
  maxDetailEligible = Math.max(...camera.span)
    <= NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_ENTER_SPAN,
  maximumGroups = NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS,
): readonly NinjaOneEnvironmentFoliageInstance[] {
  const admittedGroups = Number.isInteger(maximumGroups)
    ? Math.max(0, Math.min(maximumGroups, NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS))
    : 0;
  if (
    !maxDetailEligible
    || admittedGroups === 0
    || Math.max(...camera.span) > NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_RETAIN_SPAN
  ) return Object.freeze([]);
  const artboardView = environmentFoliageCameraArtboardView(camera);
  const admissionView = overscanned(artboardView);
  const selected = NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES
    .filter((instance) => intersects(admissionView, instance.artboardBounds))
    .sort((left, right) => (
      distanceFromViewCenter(artboardView, left)
      - distanceFromViewCenter(artboardView, right)
    ))
    .slice(0, admittedGroups)
    .sort((left, right) => (
      foliageDepth(left) - foliageDepth(right) || left.id.localeCompare(right.id)
    ));
  return Object.freeze(selected);
}
