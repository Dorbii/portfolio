import manifest from "@/public/career-world/layers/terrain/authority/manifests/terrain-stream-runtime-r4.json";
import type { CameraView, Pair } from "../../../shared/camera";
import type { DetailTierId } from "../../../shared/lod";
import type { TerrainResidencyPolicy } from "./residency";

export type TerrainStreamSourceTier = Extract<
  DetailTierId,
  "capital" | "site"
>;

export interface TerrainStreamSource {
  readonly decodedBytes: number;
  readonly dimensions: Pair;
  readonly path: string;
}

export interface TerrainStreamTile {
  readonly id: string;
  readonly minimumTier: "capital";
  readonly sources: Readonly<Record<
    TerrainStreamSourceTier,
    TerrainStreamSource
  >>;
  readonly worldBounds: CameraView;
}

if (
  manifest.schemaVersion !== 1
  || manifest.id !== "career-world/terrain-stream-runtime@r4"
  || manifest.coordinateSpace !== "normalized-world-top-left"
) {
  throw new TypeError("Terrain stream runtime manifest is invalid.");
}

function pair(values: number[], label: string, allowZero = false): Pair {
  const minimum = allowZero ? 0 : Number.EPSILON;
  if (
    values.length !== 2
    || values.some((value) => !Number.isFinite(value) || value < minimum)
  ) {
    throw new TypeError(`${label} must contain two finite numbers.`);
  }
  return Object.freeze([values[0], values[1]] as [number, number]);
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new TypeError(`${label} must be a positive integer.`);
  }
  return value;
}

function positiveIntegerPair(values: number[], label: string): Pair {
  const parsed = pair(values, label);
  if (parsed.some((value) => !Number.isInteger(value))) {
    throw new TypeError(`${label} must contain two positive integers.`);
  }
  return parsed;
}

export const TERRAIN_STREAM_POLICY: TerrainResidencyPolicy = Object.freeze({
  maximumLandLayerDecodedBytes: positiveInteger(
    manifest.streaming.maximumLandLayerDecodedBytes,
    "Terrain maximum land-layer decoded bytes",
  ),
  maximumConcurrentLoads: positiveInteger(
    manifest.streaming.maximumConcurrentLoads,
    "Terrain maximum concurrent loads",
  ),
  maximumResidentDecodedBytes: positiveInteger(
    manifest.streaming.maximumResidentDecodedBytes,
    "Terrain maximum resident decoded bytes",
  ),
  prefetchMarginPixels: positiveInteger(
    manifest.streaming.prefetchMarginPixels,
    "Terrain prefetch margin",
  ),
  retentionMarginPixels: positiveInteger(
    manifest.streaming.retentionMarginPixels,
    "Terrain retention margin",
  ),
  retryBaseDelayMs: positiveInteger(
    manifest.streaming.retryBaseDelayMs,
    "Terrain retry base delay",
  ),
  retryMaximumDelayMs: positiveInteger(
    manifest.streaming.retryMaximumDelayMs,
    "Terrain retry maximum delay",
  ),
  requestTimeoutMs: positiveInteger(
    manifest.streaming.requestTimeoutMs,
    "Terrain request timeout",
  ),
});

if (
  TERRAIN_STREAM_POLICY.retentionMarginPixels
    < TERRAIN_STREAM_POLICY.prefetchMarginPixels
  || TERRAIN_STREAM_POLICY.retryMaximumDelayMs
    < TERRAIN_STREAM_POLICY.retryBaseDelayMs
  || TERRAIN_STREAM_POLICY.maximumLandLayerDecodedBytes
    < TERRAIN_STREAM_POLICY.maximumResidentDecodedBytes
) {
  throw new TypeError("Terrain stream policy is invalid.");
}

const registeredTileIds = new Set<string>();

export const TERRAIN_STREAM_TILES: readonly TerrainStreamTile[] = Object.freeze(
  manifest.tiles
  .map((tile) => {
    if (registeredTileIds.has(tile.id)) {
      throw new TypeError(`Duplicate terrain stream tile ${tile.id}.`);
    }
    registeredTileIds.add(tile.id);
    if (tile.minimumTier !== "capital") {
      throw new TypeError(`${tile.id} must use the capital detail tier.`);
    }
    const origin = pair(
      tile.worldBounds.origin,
      `${tile.id} world origin`,
      true,
    );
    const span = pair(tile.worldBounds.span, `${tile.id} world span`);
    if (
      origin[0] + span[0] > 1
      || origin[1] + span[1] > 1
    ) {
      throw new TypeError(`${tile.id} exceeds the world plane.`);
    }

    const sourceFor = (
      tier: TerrainStreamSourceTier,
    ): TerrainStreamSource => {
      const source = tile.sources[tier];
      if (
        !source.path.startsWith(
          "/career-world/layers/terrain/authority/tiles/stream-r3/",
        )
      ) {
        throw new TypeError(
          `${tile.id} has an invalid ${tier} stream path.`,
        );
      }
      const dimensions = positiveIntegerPair(
        source.dimensions,
        `${tile.id} ${tier} dimensions`,
      );
      const decodedBytes = positiveInteger(
        source.decodedBytes,
        `${tile.id} ${tier} decoded bytes`,
      );
      if (decodedBytes !== dimensions[0] * dimensions[1] * 4) {
        throw new TypeError(
          `${tile.id} has inconsistent ${tier} decoded bytes.`,
        );
      }
      return Object.freeze({
        decodedBytes,
        dimensions,
        path: source.path,
      });
    };
    const sources = Object.freeze({
      capital: sourceFor("capital"),
      site: sourceFor("site"),
    });
    if (
      sources.capital.dimensions[0] >= sources.site.dimensions[0]
      || sources.capital.dimensions[1] >= sources.site.dimensions[1]
    ) {
      throw new TypeError(
        `${tile.id} capital source must be smaller than its site source.`,
      );
    }

    return Object.freeze({
      id: tile.id,
      minimumTier: tile.minimumTier,
      sources,
      worldBounds: Object.freeze({ origin, span }),
    });
  }),
);
