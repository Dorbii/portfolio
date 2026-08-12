import stationRiverDetailManifest from "../../../../public/career-world/capitals/ninjaone/manifests/station-river-detail-r1.json" with { type: "json" };
import type { CameraView, Pair } from "../../shared/camera";
import type { DetailTierId } from "../../shared/lod";
import { ninjaOneCapitalLocalCameraBounds } from "./ninjaOneCapitalCityNodes.ts";

export interface NinjaOneStationRiverDetailTile {
  readonly decodedBytes: number;
  readonly displayDimensions: Pair;
  readonly encodedBytes: number;
  readonly id: string;
  readonly localOrigin: Pair;
  readonly path: string;
  readonly sha256: string;
  readonly sourceDimensions: Pair;
}

const EXPECTED_LAYOUT_CONTRACT_SHA256 =
  "859948ace7aa53018c116a56f667fbb8869e777327addd89dd1af7440878e4b7";

function finitePair(raw: readonly number[], label: string): Pair {
  if (raw.length !== 2 || raw.some((value) => !Number.isFinite(value))) {
    throw new TypeError(`${label} must be a finite pair.`);
  }
  return Object.freeze([raw[0], raw[1]]);
}

function parseTile(
  raw: (typeof stationRiverDetailManifest.tiles)[number],
  index: number,
): NinjaOneStationRiverDetailTile {
  const label = `stationRiverDetail.tiles[${index}]`;
  if (
    !raw.id
    || !raw.path.startsWith("/career-world/")
    || !/^[a-f0-9]{64}$/.test(raw.sha256)
    || !Number.isFinite(raw.decodedBytes)
    || raw.decodedBytes <= 0
    || !Number.isFinite(raw.encodedBytes)
    || raw.encodedBytes <= 0
  ) {
    throw new TypeError(`${label} is invalid.`);
  }
  return Object.freeze({
    decodedBytes: raw.decodedBytes,
    displayDimensions: finitePair(raw.displayDimensions, `${label}.displayDimensions`),
    encodedBytes: raw.encodedBytes,
    id: raw.id,
    localOrigin: finitePair(raw.localOrigin, `${label}.localOrigin`),
    path: raw.path,
    sha256: raw.sha256,
    sourceDimensions: finitePair(raw.sourceDimensions, `${label}.sourceDimensions`),
  });
}

if (
  stationRiverDetailManifest.schemaVersion !== 1
  || stationRiverDetailManifest.id
    !== "career-world/capitals/ninjaone/station-river-detail@r1"
  || stationRiverDetailManifest.status !== "bounded-runtime-proof"
  || stationRiverDetailManifest.minimumDetailTier !== "site"
  || stationRiverDetailManifest.sourceScale !== 2
  || stationRiverDetailManifest.layoutLock.layoutContractSha256
    !== EXPECTED_LAYOUT_CONTRACT_SHA256
  || stationRiverDetailManifest.metrics.outsideTreatmentPixels !== 0
  || stationRiverDetailManifest.metrics.protectedWaterOverlapPixels !== 0
) {
  throw new TypeError("NinjaOne station/river detail identity is invalid.");
}

export const NINJAONE_STATION_RIVER_DETAIL_TILES = Object.freeze(
  stationRiverDetailManifest.tiles.map(parseTile),
);

if (
  NINJAONE_STATION_RIVER_DETAIL_TILES.length !== 4
  || new Set(NINJAONE_STATION_RIVER_DETAIL_TILES.map(({ id }) => id)).size !== 4
) {
  throw new TypeError("NinjaOne station/river detail tiles are incomplete.");
}

export const NINJAONE_STATION_RIVER_DETAIL_ID = stationRiverDetailManifest.id;
export const NINJAONE_STATION_RIVER_DETAIL_STATUS = stationRiverDetailManifest.status;
export const NINJAONE_STATION_RIVER_DETAIL_MAXIMUM_VISIBLE_DECODED_BYTES =
  stationRiverDetailManifest.metrics.maximumVisibleDecodedBytes;

export function ninjaOneCapitalVisibleStationRiverDetailTiles(
  camera: CameraView,
  detailTier: DetailTierId,
): readonly NinjaOneStationRiverDetailTile[] {
  if (detailTier !== "capital" && detailTier !== "site" && detailTier !== "close") {
    return Object.freeze([]);
  }
  const [left, top, right, bottom] = ninjaOneCapitalLocalCameraBounds(camera);
  const margin = detailTier === "capital" ? 96 : 48;
  return Object.freeze(NINJAONE_STATION_RIVER_DETAIL_TILES.filter((tile) => (
    tile.localOrigin[0] + tile.displayDimensions[0] >= left - margin
    && tile.localOrigin[0] <= right + margin
    && tile.localOrigin[1] + tile.displayDimensions[1] >= top - margin
    && tile.localOrigin[1] <= bottom + margin
  )));
}
