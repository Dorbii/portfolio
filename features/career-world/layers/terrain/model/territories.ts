import manifest from "@/public/career-world/layers/terrain/authority/manifests/world-territories-r4.json";
import type { CameraView, Pair } from "../../../shared/camera";

export interface TerritoryDevelopment {
  readonly capitalAnchor: Pair;
  readonly capitalEnvelope: CameraView;
  readonly minimumLandCoverage: number;
  readonly firstDetailTier: "territory";
  readonly terrainPolicy: "conform-to-landform";
  readonly reservedProgram: readonly string[];
}

export interface Territory {
  readonly id: string;
  readonly label: string;
  readonly landmassId: string;
  readonly maskColor: string;
  readonly focusView: CameraView;
  readonly development: TerritoryDevelopment;
}

function pair(values: number[]): readonly [number, number] {
  return Object.freeze([values[0], values[1]] as [number, number]);
}

function development(
  source: (typeof manifest.territories)[number]["development"],
): TerritoryDevelopment {
  if (
    source.firstDetailTier !== "territory"
    || source.terrainPolicy !== "conform-to-landform"
  ) {
    throw new TypeError("Territory development policy is not supported.");
  }

  return Object.freeze({
    ...source,
    capitalAnchor: pair(source.capitalAnchor),
    capitalEnvelope: Object.freeze({
      origin: pair(source.capitalEnvelope.origin),
      span: pair(source.capitalEnvelope.span),
    }),
    firstDetailTier: source.firstDetailTier,
    terrainPolicy: source.terrainPolicy,
    reservedProgram: Object.freeze([...source.reservedProgram]),
  });
}

export const TERRITORIES: readonly Territory[] = Object.freeze(
  manifest.territories.map((territory) => Object.freeze({
    ...territory,
    focusView: Object.freeze({
      origin: pair(territory.focusView.origin),
      span: pair(territory.focusView.span),
    }),
    development: development(territory.development),
  })),
);
