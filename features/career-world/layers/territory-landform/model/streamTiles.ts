import manifest from "@/public/career-world/layers/territory-landform/manifests/terrain-stream-tiles-r1.json";
import type { CameraView, Pair } from "../../../shared/camera";
import type { DetailTierId } from "../../../shared/lod";

export type TerrainStreamSourceTier = Extract<
  DetailTierId,
  "capital" | "site"
>;

export interface TerrainStreamSource {
  readonly path: string;
  readonly dimensions: Pair;
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

export interface TerrainStreamPolicy {
  readonly prefetchPadding: number;
  readonly retentionPadding: number;
  readonly maximumResidentTiles: number;
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

function boundedUnit(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError(`${label} must be within [0, 1].`);
  }
  return value;
}

export const TERRAIN_STREAM_POLICY: TerrainStreamPolicy = Object.freeze({
  prefetchPadding: boundedUnit(
    manifest.streaming.prefetchPadding,
    "Terrain prefetch padding",
  ),
  retentionPadding: boundedUnit(
    manifest.streaming.retentionPadding,
    "Terrain retention padding",
  ),
  maximumResidentTiles: manifest.streaming.maximumResidentTiles,
});

if (
  !Number.isInteger(TERRAIN_STREAM_POLICY.maximumResidentTiles)
  || TERRAIN_STREAM_POLICY.maximumResidentTiles < 1
  || TERRAIN_STREAM_POLICY.retentionPadding
    < TERRAIN_STREAM_POLICY.prefetchPadding
) {
  throw new TypeError("Terrain stream policy is invalid.");
}

export const TERRAIN_STREAM_TILES: readonly TerrainStreamTile[] = Object.freeze(
  manifest.tiles.map((tile) => {
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
          "/career-world/layers/territory-landform/tiles/stream-r1/",
        )
      ) {
        throw new TypeError(
          `${tile.id} has an invalid ${tier} stream path.`,
        );
      }
      return Object.freeze({
        path: source.path,
        dimensions: pair(
          source.dimensions,
          `${tile.id} ${tier} dimensions`,
        ),
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

function distanceSquaredFromCamera(
  tile: TerrainStreamTile,
  camera: CameraView,
): number {
  const tileCenterX =
    tile.worldBounds.origin[0] + tile.worldBounds.span[0] / 2;
  const tileCenterY =
    tile.worldBounds.origin[1] + tile.worldBounds.span[1] / 2;
  const cameraCenterX = camera.origin[0] + camera.span[0] / 2;
  const cameraCenterY = camera.origin[1] + camera.span[1] / 2;
  return (
    (tileCenterX - cameraCenterX) ** 2
    + (tileCenterY - cameraCenterY) ** 2
  );
}

export function terrainTileIntersectsCamera(
  tile: { readonly worldBounds: CameraView },
  camera: CameraView,
  padding = 0,
): boolean {
  const left = Math.max(0, camera.origin[0] - padding);
  const top = Math.max(0, camera.origin[1] - padding);
  const right = Math.min(
    1,
    camera.origin[0] + camera.span[0] + padding,
  );
  const bottom = Math.min(
    1,
    camera.origin[1] + camera.span[1] + padding,
  );
  const tileRight =
    tile.worldBounds.origin[0] + tile.worldBounds.span[0];
  const tileBottom =
    tile.worldBounds.origin[1] + tile.worldBounds.span[1];
  return (
    tile.worldBounds.origin[0] < right
    && tileRight > left
    && tile.worldBounds.origin[1] < bottom
    && tileBottom > top
  );
}

export function terrainTilesNearCamera(
  camera: CameraView,
  padding: number,
  limit = TERRAIN_STREAM_POLICY.maximumResidentTiles,
): readonly TerrainStreamTile[] {
  return TERRAIN_STREAM_TILES
    .filter((tile) => terrainTileIntersectsCamera(tile, camera, padding))
    .sort((left, right) => {
      const leftVisible = terrainTileIntersectsCamera(left, camera);
      const rightVisible = terrainTileIntersectsCamera(right, camera);
      if (leftVisible !== rightVisible) {
        return leftVisible ? -1 : 1;
      }
      return (
        distanceSquaredFromCamera(left, camera)
        - distanceSquaredFromCamera(right, camera)
      );
    })
    .slice(0, limit);
}
