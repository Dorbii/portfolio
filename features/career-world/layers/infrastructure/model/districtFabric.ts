import type { Pair } from "../../../shared/camera";

export const TOWN_DISTRICT_SURFACE_KINDS = [
  "civic-garden",
  "market-quarter",
  "station-quarter",
  "workshop-quarter",
] as const;

export type TownDistrictSurfaceKind =
  typeof TOWN_DISTRICT_SURFACE_KINDS[number];

export const TOWN_PARCEL_PATCH_KINDS = [
  "garden",
  "packed-earth",
  "workyard",
] as const;

export type TownParcelPatchKind =
  typeof TOWN_PARCEL_PATCH_KINDS[number];

export interface TownParcelPatch {
  readonly id: string;
  readonly kind: TownParcelPatchKind;
  readonly points: readonly Pair[];
}

export interface TownFrontageEdge {
  readonly id: string;
  readonly kind: "garden-wall" | "retaining-wall";
  readonly waypoints: readonly Pair[];
}

export interface TownRailwayPlan {
  readonly id: string;
  readonly platformPoints: readonly Pair[];
  readonly trackWaypoints: readonly Pair[];
  readonly steamVents: readonly Pair[];
}

export interface TownDistrictFabricPlan {
  readonly id: string;
  readonly ownerId: string;
  readonly parcelPatches: readonly TownParcelPatch[];
  readonly frontageEdges: readonly TownFrontageEdge[];
  readonly railway: TownRailwayPlan | null;
  readonly surfaceKindByBlockId: Readonly<
    Record<string, TownDistrictSurfaceKind>
  >;
}

const KAIZEN_AGENT_OWNER_ID = "project-kaizen-agent";

export const KAIZEN_AGENT_DISTRICT_FABRIC: TownDistrictFabricPlan =
Object.freeze({
  id: "kaizen-agent-heroic-fantasy-district-fabric-r1",
  ownerId: KAIZEN_AGENT_OWNER_ID,
  surfaceKindByBlockId: Object.freeze({
    "kaizen-agent-foundry-core": "station-quarter",
    "kaizen-agent-west-skill-block": "civic-garden",
    "kaizen-agent-east-skill-block": "workshop-quarter",
    "kaizen-agent-south-service-block": "market-quarter",
  }),
  parcelPatches: Object.freeze([
    Object.freeze({
      id: "kaizen-station-yard",
      kind: "workyard",
      points: Object.freeze([
        Object.freeze([0.199, 0.139] as Pair),
        Object.freeze([0.221, 0.141] as Pair),
        Object.freeze([0.226, 0.158] as Pair),
        Object.freeze([0.217, 0.17] as Pair),
        Object.freeze([0.201, 0.166] as Pair),
      ]),
    }),
    Object.freeze({
      id: "kaizen-civic-green-west",
      kind: "garden",
      points: Object.freeze([
        Object.freeze([0.204, 0.174] as Pair),
        Object.freeze([0.219, 0.172] as Pair),
        Object.freeze([0.222, 0.195] as Pair),
        Object.freeze([0.209, 0.202] as Pair),
      ]),
    }),
    Object.freeze({
      id: "kaizen-civic-green-east",
      kind: "garden",
      points: Object.freeze([
        Object.freeze([0.236, 0.17] as Pair),
        Object.freeze([0.247, 0.177] as Pair),
        Object.freeze([0.245, 0.202] as Pair),
        Object.freeze([0.235, 0.199] as Pair),
      ]),
    }),
    Object.freeze({
      id: "kaizen-west-neighborhood-earth",
      kind: "packed-earth",
      points: Object.freeze([
        Object.freeze([0.212, 0.213] as Pair),
        Object.freeze([0.229, 0.207] as Pair),
        Object.freeze([0.234, 0.231] as Pair),
        Object.freeze([0.23, 0.269] as Pair),
        Object.freeze([0.214, 0.268] as Pair),
      ]),
    }),
    Object.freeze({
      id: "kaizen-east-artisan-yard",
      kind: "workyard",
      points: Object.freeze([
        Object.freeze([0.241, 0.209] as Pair),
        Object.freeze([0.252, 0.211] as Pair),
        Object.freeze([0.261, 0.246] as Pair),
        Object.freeze([0.254, 0.268] as Pair),
        Object.freeze([0.24, 0.264] as Pair),
      ]),
    }),
    Object.freeze({
      id: "kaizen-market-green",
      kind: "garden",
      points: Object.freeze([
        Object.freeze([0.226, 0.275] as Pair),
        Object.freeze([0.247, 0.27] as Pair),
        Object.freeze([0.26, 0.281] as Pair),
        Object.freeze([0.257, 0.296] as Pair),
        Object.freeze([0.231, 0.294] as Pair),
      ]),
    }),
    Object.freeze({
      id: "kaizen-south-service-earth",
      kind: "packed-earth",
      points: Object.freeze([
        Object.freeze([0.221, 0.296] as Pair),
        Object.freeze([0.269, 0.297] as Pair),
        Object.freeze([0.266, 0.326] as Pair),
        Object.freeze([0.239, 0.329] as Pair),
        Object.freeze([0.225, 0.318] as Pair),
      ]),
    }),
  ]),
  frontageEdges: Object.freeze([
    Object.freeze({
      id: "kaizen-station-retaining-wall",
      kind: "retaining-wall" as const,
      waypoints: Object.freeze([
        Object.freeze([0.198, 0.158] as Pair),
        Object.freeze([0.208, 0.168] as Pair),
        Object.freeze([0.218, 0.174] as Pair),
      ]),
    }),
    Object.freeze({
      id: "kaizen-west-garden-wall",
      kind: "garden-wall" as const,
      waypoints: Object.freeze([
        Object.freeze([0.212, 0.225] as Pair),
        Object.freeze([0.215, 0.253] as Pair),
        Object.freeze([0.221, 0.269] as Pair),
      ]),
    }),
    Object.freeze({
      id: "kaizen-east-retaining-wall",
      kind: "retaining-wall" as const,
      waypoints: Object.freeze([
        Object.freeze([0.252, 0.213] as Pair),
        Object.freeze([0.259, 0.243] as Pair),
        Object.freeze([0.26, 0.267] as Pair),
      ]),
    }),
    Object.freeze({
      id: "kaizen-market-garden-wall",
      kind: "garden-wall" as const,
      waypoints: Object.freeze([
        Object.freeze([0.225, 0.313] as Pair),
        Object.freeze([0.244, 0.326] as Pair),
        Object.freeze([0.265, 0.317] as Pair),
      ]),
    }),
  ]),
  railway: Object.freeze({
    id: "kaizen-agent-dwarven-rail-terminus",
    platformPoints: Object.freeze([
      Object.freeze([0.196, 0.143] as Pair),
      Object.freeze([0.214, 0.145] as Pair),
      Object.freeze([0.217, 0.151] as Pair),
      Object.freeze([0.198, 0.15] as Pair),
    ]),
    trackWaypoints: Object.freeze([
      Object.freeze([0.192, 0.151] as Pair),
      Object.freeze([0.2, 0.152] as Pair),
      Object.freeze([0.208, 0.153] as Pair),
      Object.freeze([0.217, 0.156] as Pair),
    ]),
    steamVents: Object.freeze([
      Object.freeze([0.202, 0.147] as Pair),
      Object.freeze([0.213, 0.152] as Pair),
    ]),
  }),
});

const DISTRICT_FABRIC_BY_OWNER_ID = new Map([
  [KAIZEN_AGENT_DISTRICT_FABRIC.ownerId, KAIZEN_AGENT_DISTRICT_FABRIC],
]);

export function resolveTownDistrictFabric(
  ownerId: string,
): TownDistrictFabricPlan | null {
  return DISTRICT_FABRIC_BY_OWNER_ID.get(ownerId) ?? null;
}
