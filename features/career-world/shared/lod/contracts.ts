import type { CameraView, Pair } from "../camera.ts";
import type { CareerWorldLayerId } from "../layers.ts";
import type { DetailTierId } from "./policy.ts";

export interface RegisteredRasterDetailSource {
  readonly id: string;
  readonly kind: "registered-raster";
  readonly minimumTier: DetailTierId;
  readonly path: string;
  readonly dimensions: Pair;
  readonly worldBounds: CameraView;
}

export interface WorldProceduralDetailSource {
  readonly id: string;
  readonly kind: "world-procedural";
  readonly minimumTier: DetailTierId;
  readonly path: string;
  readonly fixedWorldFrequency: Pair;
}

export type LayerDetailSource =
  | RegisteredRasterDetailSource
  | WorldProceduralDetailSource;

export interface LayerDetailContract {
  readonly layer: CareerWorldLayerId;
  readonly sources: readonly LayerDetailSource[];
}

export function defineLayerDetailContract<
  const Contract extends LayerDetailContract,
>(contract: Contract): Contract {
  if (!contract.sources.some((source) => source.minimumTier === "world")) {
    throw new Error(`${contract.layer} detail contract needs a world source.`);
  }
  return Object.freeze({
    ...contract,
    sources: Object.freeze([...contract.sources]),
  }) as Contract;
}
