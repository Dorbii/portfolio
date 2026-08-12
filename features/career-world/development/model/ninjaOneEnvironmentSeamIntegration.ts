import manifest from "../../../../public/career-world/capitals/ninjaone/environment/manifests/seam-integration-native-r2.json" with { type: "json" };
import type { CameraView, Pair } from "../../shared/camera";
import { environmentCameraArtboardView } from "./ninjaOneEnvironmentNativeDetail.ts";

interface RawBounds {
  readonly origin: readonly number[];
  readonly span: readonly number[];
}

interface RawComparisonMetrics {
  readonly detailEnergyRatio: number;
  readonly luminanceMedianDeltaPct: number;
  readonly rgbMedianDelta: {
    readonly blue: number;
    readonly green: number;
    readonly red: number;
  };
}

interface RawSegmentMetrics {
  readonly after: {
    readonly discontinuityRatio: number | null;
  };
  readonly neighborTileIds: readonly string[];
}

interface RawSourceStrip {
  readonly crop: readonly number[];
  readonly sourcePath: string;
  readonly sourceSha256: string;
  readonly tileId: string;
}

interface RawResource {
  readonly artboardBounds: RawBounds;
  readonly cellId: string;
  readonly decodedBytes: number;
  readonly dimensions: readonly number[];
  readonly id: string;
  readonly integrationType: string;
  readonly metrics: {
    readonly longestAlphaBoundaryRun: number;
    readonly nativeOriginalComparison: RawComparisonMetrics;
    readonly segments: readonly RawSegmentMetrics[];
  };
  readonly nativeOriginalComparison: {
    readonly referenceCrop: readonly number[];
    readonly referencePath: string;
    readonly referenceSha256: string;
  };
  readonly nativeSeamPixel: number;
  readonly minimumWidthPixels?: number;
  readonly opaquePixels: number;
  readonly orientation: string;
  readonly path: string;
  readonly renderOrder: number;
  readonly seamCoordinate: number;
  readonly sha256: string;
  readonly sourceDimensions: readonly number[];
  readonly sourcePaths: readonly string[];
  readonly sourceStrips: readonly RawSourceStrip[];
}

export interface NinjaOneEnvironmentSeamIntegrationResource {
  readonly artboardBounds: CameraView;
  readonly cellId: "B2" | "C2";
  readonly decodedBytes: number;
  readonly dimensions: Pair;
  readonly id: string;
  readonly integrationType: "native-original-seam-integration";
  readonly minimumWidthPixels?: number;
  readonly orientation: "horizontal" | "vertical";
  readonly path: string;
  readonly renderOrder: number;
  readonly sha256: string;
  readonly sourcePaths: readonly string[];
}

export interface NinjaOneEnvironmentSeamLoadCohort {
  readonly epoch: number;
  readonly key: string;
}

export type NinjaOneEnvironmentSeamRequiredCohortStatus =
  | "error"
  | "idle"
  | "loading"
  | "ready";

export interface NinjaOneEnvironmentSeamRequiredCohortState {
  readonly decodedBytes: number;
  readonly epoch: number;
  readonly key: string;
  readonly paintedNodeCount: number;
  readonly resourceIds: readonly string[];
  readonly status: NinjaOneEnvironmentSeamRequiredCohortStatus;
}

const EXPECTED_ID = "career-world/capitals/ninjaone/seam-integration@r2";
const SOURCE_PREFIX =
  "/art-source/career-world/ninjaone-environment/production-r2/detail-tiles-r2/generated/";
const OUTPUT_PREFIX =
  "/career-world/capitals/ninjaone/environment/shared/seam-integration-native-r2/";
const EXPECTED_SOURCE_HASHES = Object.freeze({
  "r0-c2": "F351A83EA54B3EA30A8C948B68F9E70CD13C6AF0870A5827123BEB36B50E19C7",
  "r0-c3": "D2E7261BAF396C85676CE37A90579762FEEAC8231EB93B2751DA5BFEE6D3E98A",
  "r1-c2": "B92EBAD7F6CCC885F18D3D144E95304A206F198D8E15D06334CC371185CDA69D",
  "r1-c3": "422F663D700D42D5996B844F904441D21765E1DC7384B536B00F5083D33E82AA",
  "r2-c0": "5C7D5852546E68AFDD377EB86875A43F83F4DD6A59DEF5FA9020C8DD3A5E7520",
  "r2-c1": "2CD7FB2A2D55A2267E59DF6798F02285BB3F6C8776C8512843E7E0A44A9AF84F",
  "r2-c2": "2DECAEB59F38EE8E0ED47C4337B7AF71DEE076E3455726DA2216128AB1FC0D05",
  "r2-c3": "48BE8AC5369F2F4F7FC394E3171B6A74C97FABEBC4A1FEDB8440E74B4AEA567F",
  "r3-c0": "D1CFA21F534AAE3FB0D968E44A6CC1564452273372338585E1C3B072226C7CC0",
  "r3-c1": "825F596CE91D3CCA55673BF902F109BE29C168C939010D0C3866495A2B2B7888",
  "r3-c2": "DE30BA48BB30DF7D85CE2C0260386D21016CDFE618B8747EF808999A04407ADD",
  "r3-c3": "8D5B76EB06A45A7926524596DC951EC456660610B621228C2A2A3885A9C09B31",
} as const);
const EXPECTED_RESOURCES = Object.freeze({
  "b2-internal-vertical-seam": Object.freeze({
    cellId: "B2",
    dimensions: "64,2172",
    minimumWidthPixels: 64,
    nativeSeamPixel: 32,
    orientation: "vertical",
    renderOrder: 0,
    seamCoordinate: 1440,
    sourceIds: Object.freeze(["r2-c0", "r2-c1", "r3-c0", "r3-c1"]),
  }),
  "b2-internal-horizontal-seam": Object.freeze({
    cellId: "B2",
    dimensions: "2896,64",
    minimumWidthPixels: 64,
    nativeSeamPixel: 32,
    orientation: "horizontal",
    renderOrder: 1,
    seamCoordinate: 3240,
    sourceIds: Object.freeze(["r2-c0", "r3-c0", "r2-c1", "r3-c1"]),
  }),
  "c2-internal-vertical-seam": Object.freeze({
    cellId: "C2",
    dimensions: "64,2172",
    minimumWidthPixels: 64,
    nativeSeamPixel: 32,
    orientation: "vertical",
    renderOrder: 0,
    seamCoordinate: 4320,
    sourceIds: Object.freeze(["r2-c2", "r2-c3", "r3-c2", "r3-c3"]),
  }),
  "c2-internal-horizontal-seam": Object.freeze({
    cellId: "C2",
    dimensions: "2896,64",
    minimumWidthPixels: 64,
    nativeSeamPixel: 32,
    orientation: "horizontal",
    renderOrder: 1,
    seamCoordinate: 3240,
    sourceIds: Object.freeze(["r2-c2", "r3-c2", "r2-c3", "r3-c3"]),
  }),
} as const);
function finiteTuple<const Length extends number>(
  values: readonly number[],
  length: Length,
  label: string,
): readonly number[] {
  if (values.length !== length || values.some((value) => !Number.isFinite(value))) {
    throw new TypeError(`${label} must contain ${length} finite values.`);
  }
  return Object.freeze([...values]);
}

function finitePair(values: readonly number[], label: string): Pair {
  return finiteTuple(values, 2, label) as Pair;
}

function bounds(value: RawBounds, label: string): CameraView {
  const origin = finitePair(value.origin, `${label}.origin`);
  const span = finitePair(value.span, `${label}.span`);
  if (span.some((entry) => entry <= 0)) {
    throw new RangeError(`${label}.span must remain positive.`);
  }
  return Object.freeze({ origin, span });
}

function intersects(first: CameraView, second: CameraView): boolean {
  return first.origin[0] < second.origin[0] + second.span[0]
    && first.origin[0] + first.span[0] > second.origin[0]
    && first.origin[1] < second.origin[1] + second.span[1]
    && first.origin[1] + first.span[1] > second.origin[1];
}

function expectedSourcePath(id: string): string {
  return `${SOURCE_PREFIX}${id}-generated-r2.png`;
}

function sourceHash(id: string): string | undefined {
  return EXPECTED_SOURCE_HASHES[id as keyof typeof EXPECTED_SOURCE_HASHES];
}

function validateAuthority(): void {
  const authority = manifest.authority.sources;
  if (authority.length !== Object.keys(EXPECTED_SOURCE_HASHES).length) {
    throw new TypeError("NinjaOne seam authority must bind all 12 native originals.");
  }
  for (const source of authority) {
    if (
      source.dimensions.join(",") !== "1448,1086"
      || source.path !== expectedSourcePath(source.id)
      || source.sha256 !== sourceHash(source.id)
      || source.storage !== "png-rgb-8"
    ) {
      throw new TypeError(`NinjaOne seam authority ${source.id} is invalid.`);
    }
  }
}

if (
  manifest.schemaVersion !== 2
  || manifest.id !== EXPECTED_ID
  || manifest.status !== "partial-internal-accepted-intercell-unresolved"
  || manifest.registration.artboard.join(",") !== "1440,1080"
  || manifest.registration.nativeTileDimensions.join(",") !== "1448,1086"
  || manifest.registration.tileArtboard.join(",") !== "360,270"
  || manifest.registration.coordinateMathScale !== 4
  || manifest.derivation.baseMutation !== "none"
  || manifest.derivation.interpolation !== "none"
  || manifest.derivation.resampling !== "none"
  || manifest.derivation.topologyOperation !== "none"
  || manifest.budgets.maximumMountedResources !== 2
  || manifest.budgets.maximumPaintedSupplementNodes !== 2
  || manifest.budgets.maximumSupplementalNodes !== 6
  || manifest.budgets.maximumDecodedBytes !== 32 * 1024 * 1024
  || manifest.budgets.maximumApplicationOwnedDecodedUnion
    > manifest.budgets.maximumDecodedBytes
  || manifest.budgets.unionSupplementalNodeBreakdown.seam !== 2
  || manifest.resources.length !== 4
) {
  throw new TypeError("NinjaOne seam integration r2 manifest is invalid.");
}

validateAuthority();

export const NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_RESOURCES = Object.freeze(
  (manifest.resources as readonly RawResource[]).map((raw) => {
    const expected = EXPECTED_RESOURCES[raw.id as keyof typeof EXPECTED_RESOURCES];
    const dimensions = finitePair(raw.dimensions, `resources.${raw.id}.dimensions`);
    const artboardBounds = bounds(raw.artboardBounds, `resources.${raw.id}.artboardBounds`);
    const comparison = raw.metrics.nativeOriginalComparison;
    const expectedPaths = expected?.sourceIds.map(expectedSourcePath);
    const seamArtboardCoordinate = raw.seamCoordinate
      / manifest.registration.coordinateMathScale;
    const crossAxis = raw.orientation === "vertical" ? 0 : 1;
    if (
      !expected
      || raw.cellId !== expected.cellId
      || dimensions.join(",") !== expected.dimensions
      || raw.orientation !== expected.orientation
      || raw.renderOrder !== expected.renderOrder
      || raw.seamCoordinate !== expected.seamCoordinate
      || seamArtboardCoordinate < artboardBounds.origin[crossAxis]
      || seamArtboardCoordinate
        > artboardBounds.origin[crossAxis] + artboardBounds.span[crossAxis]
      || raw.integrationType !== "native-original-seam-integration"
      || raw.nativeSeamPixel !== expected.nativeSeamPixel
      || raw.minimumWidthPixels !== expected.minimumWidthPixels
      || raw.sourceDimensions.join(",") !== "1448,1086"
      || raw.sourcePaths.join("|") !== expectedPaths?.join("|")
      || raw.sourceStrips.length !== 4
      || raw.sourceStrips.some((strip) => (
        strip.crop.length !== 4
        || strip.crop.some((value) => !Number.isSafeInteger(value) || value < 0)
        || strip.sourcePath !== expectedSourcePath(strip.tileId)
        || strip.sourceSha256 !== sourceHash(strip.tileId)
      ))
      || !raw.path.startsWith(OUTPUT_PREFIX)
      || !raw.nativeOriginalComparison.referencePath.startsWith(OUTPUT_PREFIX)
      || raw.nativeOriginalComparison.referenceCrop.join(",")
        !== `0,0,${dimensions.join(",")}`
      || raw.nativeOriginalComparison.referenceSha256.length !== 64
      || raw.sha256.length !== 64
      || raw.opaquePixels <= 0
      || raw.decodedBytes !== dimensions[0] * dimensions[1] * 4
      || raw.metrics.longestAlphaBoundaryRun > 48
      || comparison.detailEnergyRatio < 0.85
      || comparison.luminanceMedianDeltaPct > 5
      || Object.values(comparison.rgbMedianDelta).some((value) => value > 12)
      || raw.metrics.segments.length !== 2
      || raw.metrics.segments.some((segment) => (
        segment.after.discontinuityRatio === null
        || segment.after.discontinuityRatio > 1.15
      ))
    ) {
      throw new TypeError(`NinjaOne seam resource ${raw.id} is invalid.`);
    }
    return Object.freeze({
      artboardBounds,
      cellId: raw.cellId as "B2" | "C2",
      decodedBytes: raw.decodedBytes,
      dimensions,
      id: raw.id,
      integrationType: raw.integrationType,
      minimumWidthPixels: raw.minimumWidthPixels,
      orientation: raw.orientation as "horizontal" | "vertical",
      path: raw.path,
      renderOrder: raw.renderOrder,
      sha256: raw.sha256,
      sourcePaths: Object.freeze([...raw.sourcePaths]),
    } satisfies NinjaOneEnvironmentSeamIntegrationResource);
  }),
);

if (
  manifest.fullNativeSweep.length !== 16
  || manifest.fullNativeSweep.filter(({ cellId }) => cellId.includes("-")).length !== 4
  || manifest.fullNativeSweep.filter(({ cellId }) => cellId.includes("-")).some(
    ({ decision }) => decision !== "UNRESOLVED-missing-accepted-intercell-overlay",
  )
  || manifest.fullNativeSweep.filter(({ cellId }) => cellId === "C1").some(
    ({ decision }) => decision !== "no-overlay-authorized-coast-and-void-topology-retained",
  )
) {
  throw new TypeError("NinjaOne seam sweep contract is invalid.");
}

export const NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_MAX_DECODED_BYTES =
  manifest.budgets.seamDecodedBytes;
export const NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_MAX_APPLICATION_OWNED_UNION =
  manifest.budgets.maximumApplicationOwnedDecodedUnion;
export const NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_MAX_MOUNTED_RESOURCES =
  manifest.budgets.maximumMountedResources;
export const NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_MAX_PAINTED_NODES =
  manifest.budgets.maximumPaintedSupplementNodes;

if (
  manifest.selectorCheckpoints.fixedB2Internal.decodedBytes
    !== NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_MAX_DECODED_BYTES
  || manifest.selectorCheckpoints.fixedB2Internal.resourceIds.length
    !== NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_MAX_MOUNTED_RESOURCES
  || manifest.selectorCheckpoints.fixedB2Internal.paintedNodeCount !== 2
  || manifest.selectorCheckpoints.fixedC2Internal.paintedNodeCount !== 2
  || Object.values(manifest.budgets.unionBreakdown)
    .reduce((total, value) => total + value, 0)
    !== NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_MAX_APPLICATION_OWNED_UNION
) {
  throw new TypeError("NinjaOne seam integration selected decoded-byte budget is invalid.");
}

export function ninjaOneEnvironmentSeamSelectionKey(
  resources: readonly Pick<
    NinjaOneEnvironmentSeamIntegrationResource,
    "path" | "sha256"
  >[],
): string {
  return resources
    .map(ninjaOneEnvironmentSeamResourceKey)
    .sort()
    .join("|");
}

export function ninjaOneEnvironmentSeamResourceKey(
  resource: Pick<NinjaOneEnvironmentSeamIntegrationResource, "path" | "sha256">,
): string {
  return `${resource.path}#sha256=${resource.sha256}`;
}

export function ninjaOneEnvironmentSeamRequiredCohortState(
  resources: readonly NinjaOneEnvironmentSeamIntegrationResource[],
  status: NinjaOneEnvironmentSeamRequiredCohortStatus,
  epoch: number,
): NinjaOneEnvironmentSeamRequiredCohortState {
  return Object.freeze({
    decodedBytes: resources.reduce((total, resource) => total + resource.decodedBytes, 0),
    epoch,
    key: ninjaOneEnvironmentSeamSelectionKey(resources),
    paintedNodeCount: resources.length,
    resourceIds: Object.freeze(resources.map(({ id }) => id)),
    status,
  });
}

export function advanceNinjaOneEnvironmentSeamLoadCohort(
  current: NinjaOneEnvironmentSeamLoadCohort,
  key: string,
): NinjaOneEnvironmentSeamLoadCohort {
  if (current.key === key) return current;
  return Object.freeze({ epoch: current.epoch + 1, key });
}

export function isNinjaOneEnvironmentSeamLoadCohortCurrent(
  current: NinjaOneEnvironmentSeamLoadCohort,
  candidate: NinjaOneEnvironmentSeamLoadCohort,
): boolean {
  return current.epoch === candidate.epoch && current.key === candidate.key;
}

export function selectNinjaOneEnvironmentSeamIntegration(
  camera: CameraView,
): readonly NinjaOneEnvironmentSeamIntegrationResource[] {
  const view = environmentCameraArtboardView(camera);
  const selected = NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_RESOURCES.filter((resource) => (
    intersects(view, resource.artboardBounds)
  ));
  if (selected.length > NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_MAX_MOUNTED_RESOURCES) {
    throw new RangeError("NinjaOne seam selector exceeded its mounted-resource budget.");
  }
  return Object.freeze(selected);
}
