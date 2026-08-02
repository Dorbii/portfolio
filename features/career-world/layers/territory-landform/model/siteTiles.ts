import manifest from "@/public/career-world/layers/territory-landform/manifests/terrain-site-tiles-r2.json";
import type { CameraView, Pair } from "../../../shared/camera";
import type { DetailTierId } from "../../../shared/lod";
import { TERRITORIES, type Territory } from "./territories";

export interface TerrainSiteTile {
  readonly id: string;
  readonly territory: Territory;
  readonly ownerKind: "capital" | "project";
  readonly ownerId: string;
  readonly minimumTier: Extract<DetailTierId, "site">;
  readonly path: string;
  readonly dimensions: Pair;
  readonly worldBounds: CameraView;
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

export const TERRAIN_SITE_TILES: readonly TerrainSiteTile[] = Object.freeze(
  manifest.tiles.map((tile) => {
    const territory = TERRITORIES.find(({ id }) => id === tile.territoryId);
    if (!territory) {
      throw new TypeError(
        `Terrain site tile ${tile.id} references unknown territory.`,
      );
    }
    if (
      !tile.path.startsWith(
        "/career-world/layers/territory-landform/tiles/",
      )
    ) {
      throw new TypeError(`Terrain site tile ${tile.id} has an invalid path.`);
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
      throw new TypeError(`Terrain site tile ${tile.id} exceeds the world.`);
    }

    if (tile.minimumTier !== "site") {
      throw new TypeError(
        `Terrain site tile ${tile.id} has an invalid detail tier.`,
      );
    }
    if (
      (tile.ownerKind !== "capital" && tile.ownerKind !== "project")
      || !tile.ownerId
    ) {
      throw new TypeError(
        `Terrain site tile ${tile.id} has an invalid owner.`,
      );
    }

    if (tile.ownerKind === "capital") {
      const envelope = territory.development.capitalEnvelope;
      if (
        origin[0] < envelope.origin[0]
        || origin[1] < envelope.origin[1]
        || origin[0] + span[0] > envelope.origin[0] + envelope.span[0]
        || origin[1] + span[1] > envelope.origin[1] + envelope.span[1]
      ) {
        throw new TypeError(
          `Terrain site tile ${tile.id} exceeds its capital envelope.`,
        );
      }
      const anchor = territory.development.capitalAnchor;
      if (
        anchor[0] < origin[0]
        || anchor[1] < origin[1]
        || anchor[0] > origin[0] + span[0]
        || anchor[1] > origin[1] + span[1]
      ) {
        throw new TypeError(
          `Terrain site tile ${tile.id} does not contain its capital anchor.`,
        );
      }
    }

    return Object.freeze({
      id: tile.id,
      territory,
      ownerKind: tile.ownerKind,
      ownerId: tile.ownerId,
      minimumTier: tile.minimumTier,
      path: tile.path,
      dimensions: pair(tile.dimensions, `${tile.id} dimensions`),
      worldBounds: Object.freeze({ origin, span }),
    });
  }),
);
