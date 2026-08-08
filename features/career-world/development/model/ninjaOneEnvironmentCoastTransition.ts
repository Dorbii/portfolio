import manifest from "../../../../public/career-world/capitals/ninjaone/environment/manifests/coast-transition-native-r1.json" with { type: "json" };
import type { CameraView, Pair } from "../../shared/camera";
import { environmentCameraArtboardView } from "./ninjaOneEnvironmentNativeDetail";

interface RawBounds {
  readonly origin: readonly number[];
  readonly span: readonly number[];
}

interface RawResource {
  readonly artboardBounds: RawBounds;
  readonly boundarySpan: readonly number[];
  readonly copiedRgbPixels: number;
  readonly decodedBytes: number;
  readonly dimensions: readonly number[];
  readonly id: string;
  readonly maximumAlpha: number;
  readonly opaquePixels: number;
  readonly path: string;
  readonly sha256: string;
  readonly sourceCrop: readonly number[];
  readonly sourceDimensions: readonly number[];
  readonly sourcePath: string;
  readonly sourceSha256: string;
}

export interface NinjaOneEnvironmentCoastTransitionResource {
  readonly artboardBounds: CameraView;
  readonly boundarySpan: Pair;
  readonly decodedBytes: number;
  readonly dimensions: Pair;
  readonly id: string;
  readonly opaquePixels: number;
  readonly path: string;
  readonly sourceCrop: readonly [number, number, number, number];
}

const EXPECTED_ID = "career-world/capitals/ninjaone/coast-transition@r1";
const EXPECTED_SOURCE_PATH =
  "/art-source/career-world/ninjaone-environment/production-r2/ninjaone-environment-terrain-master-detail-r2.png";

function finitePair(values: readonly number[], label: string): Pair {
  if (values.length !== 2 || values.some((value) => !Number.isFinite(value))) {
    throw new TypeError(`${label} must contain two finite values.`);
  }
  return Object.freeze([values[0], values[1]] as Pair);
}

function bounds(value: RawBounds, label: string): CameraView {
  const origin = finitePair(value.origin, `${label}.origin`);
  const span = finitePair(value.span, `${label}.span`);
  if (span.some((value) => value <= 0)) {
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

if (
  manifest.schemaVersion !== 1
  || manifest.id !== EXPECTED_ID
  || manifest.status !== "deterministic-master-derived"
  || manifest.registration.artboard.join(",") !== "1440,1080"
  || manifest.registration.masterPixelsPerArtboardUnit !== 4
  || manifest.budgets.maximumMountedResources !== 1
  || manifest.resources.length !== 1
) {
  throw new TypeError("NinjaOne coast transition manifest is invalid.");
}

const raw = manifest.resources[0] as RawResource;
const dimensions = finitePair(raw.dimensions, "resources.c1-rock-shingle-transition.dimensions");
const artboardBounds = bounds(
  raw.artboardBounds,
  "resources.c1-rock-shingle-transition.artboardBounds",
);
const boundarySpan = finitePair(
  raw.boundarySpan,
  "resources.c1-rock-shingle-transition.boundarySpan",
);
if (
  raw.id !== "c1-rock-shingle-transition"
  || dimensions.join(",") !== "1440,640"
  || raw.sourceDimensions.join(",") !== "5760,4320"
  || raw.sourceCrop.join(",") !== "3360,880,1440,640"
  || raw.sourcePath !== EXPECTED_SOURCE_PATH
  || raw.path.startsWith(
    "/career-world/capitals/ninjaone/environment/shared/coast-transition-native-r1/",
  ) !== true
  || raw.sha256.length !== 64
  || raw.sourceSha256.length !== 64
  || raw.copiedRgbPixels !== raw.opaquePixels
  || raw.opaquePixels <= 0
  || raw.maximumAlpha <= 0
  || raw.maximumAlpha >= 255
  || raw.decodedBytes !== dimensions[0] * dimensions[1] * 4
  || raw.decodedBytes !== manifest.budgets.maximumDecodedBytes
  || artboardBounds.origin.join(",") !== "840,220"
  || artboardBounds.span.join(",") !== "360,160"
  || boundarySpan[0] < 0
  || boundarySpan[1] >= dimensions[0]
) {
  throw new TypeError("NinjaOne coast transition resource is invalid.");
}

export const NINJAONE_ENVIRONMENT_COAST_TRANSITION_MAX_DECODED_BYTES =
  manifest.budgets.maximumDecodedBytes;

export const NINJAONE_ENVIRONMENT_COAST_TRANSITION_RESOURCE = Object.freeze({
  artboardBounds,
  boundarySpan,
  decodedBytes: raw.decodedBytes,
  dimensions,
  id: raw.id,
  opaquePixels: raw.opaquePixels,
  path: raw.path,
  sourceCrop: Object.freeze([...raw.sourceCrop]) as readonly [number, number, number, number],
} satisfies NinjaOneEnvironmentCoastTransitionResource);

export function selectNinjaOneEnvironmentCoastTransition(
  camera: CameraView,
): NinjaOneEnvironmentCoastTransitionResource | undefined {
  return intersects(
    environmentCameraArtboardView(camera),
    NINJAONE_ENVIRONMENT_COAST_TRANSITION_RESOURCE.artboardBounds,
  )
    ? NINJAONE_ENVIRONMENT_COAST_TRANSITION_RESOURCE
    : undefined;
}
