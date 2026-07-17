import { PALETTE_SLOTS } from "../geometry/palettes";
import { regularPolygonPlan } from "../geometry/primitives";
import { roundProjectionCoordinate } from "../geometry/projection";
import { CAREER_WORLD_PROJECTION_ID } from "../geometry/types";
import type {
  GeometryDefinition,
  GeometryPrimitive,
  PlanPoint,
} from "../geometry/types";

function plan(
  points: readonly (readonly [x: number, y: number])[],
): readonly PlanPoint[] {
  return Object.freeze(
    points.map(([x, y]) =>
      Object.freeze({
        x: roundProjectionCoordinate(x),
        y: roundProjectionCoordinate(y),
      }),
    ),
  );
}

function offsetRectangle(
  centerX: number,
  centerY: number,
  width: number,
  depth: number,
): readonly PlanPoint[] {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  return plan([
    [centerX - halfWidth, centerY - halfDepth],
    [centerX + halfWidth, centerY - halfDepth],
    [centerX + halfWidth, centerY + halfDepth],
    [centerX - halfWidth, centerY + halfDepth],
  ]);
}

function offsetRegularPolygon(
  centerX: number,
  centerY: number,
  sideCount: number,
  radius: number,
  rotationDegrees = 0,
): readonly PlanPoint[] {
  return plan(
    regularPolygonPlan(sideCount, radius, rotationDegrees).map((point) => [
      roundProjectionCoordinate(centerX + point.x),
      roundProjectionCoordinate(centerY + point.y),
    ] as const),
  );
}

function freezePrimitives(
  primitives: readonly GeometryPrimitive[],
): readonly GeometryPrimitive[] {
  return Object.freeze(primitives.map((primitive) => Object.freeze(primitive)));
}

const EVERGREEN_PRIMARY_PATH =
  "M -78.0000 25.0000 L -64.0000 4.0000 L -64.0000 -10.0000 L -58.0000 -32.0000 L -52.0000 -32.0000 L -48.0000 -50.0000 L -42.0000 -50.0000 L -30.0000 -76.0000 L -18.0000 -50.0000 L -12.0000 -50.0000 L -8.0000 -35.0000 L -2.0000 -35.0000 L 1.0000 -72.0000 L 2.0000 -100.0000 L 7.0000 -72.0000 L 12.0000 -50.0000 L 18.0000 -50.0000 L 24.0000 -30.0000 L 30.0000 -30.0000 L 36.0000 -38.0000 L 42.0000 -38.0000 L 50.0000 -60.0000 L 58.0000 -38.0000 L 64.0000 -38.0000 L 69.0000 -18.0000 L 74.0000 -18.0000 L 78.0000 8.0000 L 77.0000 9.0000 L 76.0000 29.0000 L 52.0000 43.0000 L 8.0000 49.0000 L -36.0000 45.0000 Z";

const evergreenCluster = Object.freeze({
  assetId: "ambient/evergreen-cluster@v1",
  category: "ambient",
  geometryKey: "career-world/ambient/evergreen-cluster/master-v1",
  masterGeometryHash: "sha256:4bc243eb99644accb711dd8068eab3ab6505ac440cd298e73d6cb65e0717a7d5",
  primaryPathHash: "sha256:8af3fb1b3e3f05a7b704fade33e66e163541e684c480be676088a8fcfbc25c31",
  primaryPath: EVERGREEN_PRIMARY_PATH,
  footprint: Object.freeze({ width: 170, depth: 130 }),
  orientation: 0,
  projection: CAREER_WORLD_PROJECTION_ID,
  paletteSlots: PALETTE_SLOTS,
  primitives: freezePrimitives([
    {
      type: "surface",
      id: "evergreen-shared-faceted-plate",
      path: "M -78.0000 25.0000 L -64.0000 4.0000 L -24.0000 -1.0000 L 14.0000 3.0000 L 59.0000 0.0000 L 77.0000 9.0000 L 76.0000 29.0000 L 52.0000 43.0000 L 8.0000 49.0000 L -36.0000 45.0000 Z",
      fill: "terrain.claim",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "evergreen-medium-left-trunk",
      path: "M -36.0000 -24.0000 L -28.0000 -24.0000 L -26.0000 12.0000 L -38.0000 12.0000 Z",
      fill: "structure.base",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "evergreen-tall-rear-trunk",
      path: "M -2.0000 -34.0000 L 7.0000 -34.0000 L 9.0000 14.0000 L -4.0000 14.0000 Z",
      fill: "structure.base",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "evergreen-short-right-trunk",
      path: "M 46.0000 -22.0000 L 53.0000 -22.0000 L 55.0000 15.0000 L 44.0000 15.0000 Z",
      fill: "structure.base",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "evergreen-three-crown-union",
      path: "M -64.0000 -10.0000 L -58.0000 -32.0000 L -52.0000 -32.0000 L -48.0000 -50.0000 L -42.0000 -50.0000 L -30.0000 -76.0000 L -18.0000 -50.0000 L -12.0000 -50.0000 L -8.0000 -35.0000 L -2.0000 -35.0000 L 1.0000 -72.0000 L 2.0000 -100.0000 L 7.0000 -72.0000 L 12.0000 -50.0000 L 18.0000 -50.0000 L 24.0000 -30.0000 L 30.0000 -30.0000 L 36.0000 -38.0000 L 42.0000 -38.0000 L 50.0000 -60.0000 L 58.0000 -38.0000 L 64.0000 -38.0000 L 69.0000 -18.0000 L 74.0000 -18.0000 L 78.0000 8.0000 Z",
      fill: "structure.base",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "stroke",
      id: "evergreen-crown-facet-seams",
      path: "M -30.0000 -68.0000 L -30.0000 -24.0000 M 2.0000 -91.0000 L 2.0000 -25.0000 M 50.0000 -52.0000 L 50.0000 -8.0000",
      stroke: "line.secondary",
      detailTier: 1,
    },
    {
      type: "stroke",
      id: "evergreen-ground-plate-facets",
      path: "M -60.0000 8.0000 L -34.0000 39.0000 M -22.0000 3.0000 L 7.0000 43.0000 M 16.0000 7.0000 L 49.0000 37.0000 M 58.0000 5.0000 L 52.0000 35.0000",
      stroke: "line.secondary",
      detailTier: 2,
    },
  ]),
} satisfies GeometryDefinition);

const ROCK_PRIMARY_PATH =
  "M -74.0000 24.0000 L -67.0000 -6.0000 L -60.0000 -15.0000 L -50.0000 -34.0000 L -33.0000 -52.0000 L -18.0000 -39.0000 L -15.0000 -82.0000 L -3.0000 -102.0000 L 8.0000 -89.0000 L 15.0000 -99.0000 L 29.0000 -77.0000 L 31.0000 -40.0000 L 45.0000 -50.0000 L 61.0000 -37.0000 L 67.0000 -9.0000 L 76.0000 -1.0000 L 74.0000 31.0000 L 48.0000 43.0000 L 10.0000 49.0000 L -33.0000 44.0000 Z";

const rockCluster = Object.freeze({
  assetId: "ambient/rock-cluster@v1",
  category: "ambient",
  geometryKey: "career-world/ambient/rock-cluster/master-v1",
  masterGeometryHash: "sha256:664af956725cbab9ab3ece5ad02d3faaa9d548bbddcfb55820ad94dcbe2e1a6b",
  primaryPathHash: "sha256:9cf16eb4d03b79a695667484048529ed1777a5bd47e8a52b94c01ba43aa7033c",
  primaryPath: ROCK_PRIMARY_PATH,
  footprint: Object.freeze({ width: 160, depth: 110 }),
  orientation: 0,
  projection: CAREER_WORLD_PROJECTION_ID,
  paletteSlots: PALETTE_SLOTS,
  primitives: freezePrimitives([
    {
      type: "surface",
      id: "rock-irregular-shared-base",
      path: "M -74.0000 24.0000 L -67.0000 -6.0000 L -37.0000 -18.0000 L 10.0000 -22.0000 L 55.0000 -15.0000 L 76.0000 -1.0000 L 74.0000 31.0000 L 48.0000 43.0000 L 10.0000 49.0000 L -33.0000 44.0000 Z",
      fill: "terrain.claim",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "rock-tall-split-slab-left",
      path: "M -15.0000 -82.0000 L -3.0000 -102.0000 L 5.0000 -88.0000 L 3.0000 -23.0000 L -15.0000 -18.0000 L -28.0000 -40.0000 Z",
      fill: "structure.base",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "rock-tall-split-slab-right",
      path: "M 8.0000 -89.0000 L 15.0000 -99.0000 L 29.0000 -77.0000 L 31.0000 -40.0000 L 17.0000 -19.0000 L 6.0000 -24.0000 L 7.0000 -78.0000 Z",
      fill: "structure.base",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "rock-medium-left-wedge",
      path: "M -50.0000 -34.0000 L -33.0000 -52.0000 L -18.0000 -39.0000 L -17.0000 -12.0000 L -38.0000 -4.0000 L -57.0000 -15.0000 Z",
      fill: "structure.base",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "rock-medium-right-wedge",
      path: "M 38.0000 -32.0000 L 45.0000 -50.0000 L 61.0000 -37.0000 L 67.0000 -9.0000 L 52.0000 -3.0000 L 33.0000 -13.0000 Z",
      fill: "structure.base",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "rock-low-front-chip-left",
      path: "M -43.0000 15.0000 L -28.0000 3.0000 L -10.0000 9.0000 L -7.0000 23.0000 L -30.0000 29.0000 Z",
      fill: "structure.base",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "rock-low-front-chip-right",
      path: "M 10.0000 16.0000 L 25.0000 4.0000 L 43.0000 12.0000 L 46.0000 27.0000 L 22.0000 31.0000 Z",
      fill: "structure.base",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "stroke",
      id: "rock-muted-facet-seams",
      path: "M -3.0000 -94.0000 L 1.0000 -29.0000 M 14.0000 -90.0000 L 9.0000 -76.0000 M -32.0000 -45.0000 L -36.0000 -10.0000 M 47.0000 -42.0000 L 51.0000 -9.0000 M -27.0000 8.0000 L -29.0000 23.0000 M 26.0000 9.0000 L 23.0000 25.0000",
      stroke: "line.secondary",
      detailTier: 1,
    },
    {
      type: "stroke",
      id: "rock-base-facet-seams",
      path: "M -62.0000 -2.0000 L -32.0000 38.0000 M -34.0000 -13.0000 L 9.0000 42.0000 M 51.0000 -10.0000 L 45.0000 37.0000",
      stroke: "line.secondary",
      detailTier: 2,
    },
  ]),
} satisfies GeometryDefinition);

const SERVICE_TRUCK_PRIMARY_PATH =
  "M -92.0000 -18.0000 L -78.0000 -62.0000 L -54.0000 -92.0000 L -8.0000 -104.0000 L 58.0000 -104.0000 L 88.0000 -82.0000 L 92.0000 14.0000 L 88.0000 30.0000 L 72.0000 50.0000 L 68.0000 53.0000 L 50.0000 56.0000 L 46.0000 60.0000 L 20.0000 62.0000 L 10.0000 50.0000 L -24.0000 62.0000 L -58.0000 53.0000 L -92.0000 30.0000 Z";

const serviceTruck = Object.freeze({
  assetId: "ambient/service-truck@v1",
  category: "ambient",
  geometryKey: "career-world/ambient/service-truck/master-v1",
  masterGeometryHash: "sha256:42d449f06978769d89e3efdc1af64e2d5f49857f7c56e5e447ede65eddf4cee6",
  primaryPathHash: "sha256:84576e762ecefc43b7bc1a04c2bdba270d0d88c212a76a32dbf49a86d8b66e01",
  primaryPath: SERVICE_TRUCK_PRIMARY_PATH,
  footprint: Object.freeze({ width: 188, depth: 216 }),
  orientation: 0,
  projection: CAREER_WORLD_PROJECTION_ID,
  paletteSlots: PALETTE_SLOTS,
  primitives: freezePrimitives([
    {
      type: "surface",
      id: "service-truck-complete-exterior",
      path: SERVICE_TRUCK_PRIMARY_PATH,
      fill: "structure.base",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "service-truck-clipped-ground-contact",
      path: "M -88.0000 12.0000 L -70.0000 -12.0000 L 70.0000 -12.0000 L 88.0000 10.0000 L 68.0000 53.0000 L -58.0000 53.0000 Z",
      fill: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "extrusion",
      id: "service-truck-clipped-chassis",
      plan: plan([[-72, -34], [66, -34], [74, -24], [74, 30], [-72, 30]]),
      height: 13,
      top: "structure.base",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "extrusion",
      id: "service-truck-cab-over-mass",
      plan: plan([[-66, -28], [-18, -28], [-11, -19], [-11, 27], [-66, 27]]),
      height: 48,
      top: "structure.base",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "extrusion",
      id: "service-truck-enclosed-rear-body",
      plan: offsetRectangle(26, 0, 72, 58),
      height: 55,
      top: "structure.base",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "service-truck-front-wheel-arch",
      path: "M -55.0000 43.0000 L -52.0000 31.0000 Q -39.0000 17.0000 -27.0000 31.0000 L -28.0000 43.0000 Z",
      fill: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "service-truck-rear-wheel-arch",
      path: "M 18.0000 42.0000 L 21.0000 29.0000 Q 34.0000 15.0000 47.0000 29.0000 L 45.0000 42.0000 Z",
      fill: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "stroke",
      id: "service-truck-shallow-roof-rack",
      path: "M -5.0000 -68.0000 L 54.0000 -68.0000 L 72.0000 -55.0000 L 12.0000 -55.0000 Z M 4.0000 -64.0000 L 21.0000 -55.0000 M 20.0000 -68.0000 L 37.0000 -58.0000 M 38.0000 -68.0000 L 54.0000 -58.0000",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "stroke",
      id: "service-truck-cab-glazing-and-body-seams",
      path: "M -53.0000 -42.0000 L -22.0000 -48.0000 L -15.0000 -31.0000 L -55.0000 -21.0000 Z M -11.0000 -19.0000 L -11.0000 27.0000 M 8.0000 -7.0000 L 68.0000 -22.0000 M 25.0000 -11.0000 L 25.0000 20.0000 M 49.0000 -17.0000 L 49.0000 14.0000",
      stroke: "line.secondary",
      detailTier: 1,
    },
    {
      type: "stroke",
      id: "service-truck-wheel-hubs",
      path: "M -48.0000 34.0000 Q -39.0000 25.0000 -31.0000 34.0000 Q -39.0000 42.0000 -48.0000 34.0000 Z M 25.0000 33.0000 Q 34.0000 24.0000 43.0000 33.0000 Q 34.0000 41.0000 25.0000 33.0000 Z",
      stroke: "line.secondary",
      detailTier: 2,
    },
  ]),
} satisfies GeometryDefinition);

const CARGO_BOAT_PRIMARY_PATH =
  "M -106.0000 -18.0000 L -84.0000 -58.0000 L -58.0000 -76.0000 L 36.0000 -96.0000 L 76.0000 -96.0000 L 100.0000 -72.0000 L 102.0000 -28.0000 L 104.0000 18.0000 L 86.0000 50.0000 L 60.0000 66.0000 L -64.0000 66.0000 L -101.3250 36.5000 L -102.1910 23.0000 Z";

const cargoBoat = Object.freeze({
  assetId: "ambient/cargo-boat@v1",
  category: "ambient",
  geometryKey: "career-world/ambient/cargo-boat/master-v1",
  masterGeometryHash: "sha256:0779dbf11eee3ee732886a74598c5825d99003f892cb3a64b1b4316c3da346c4",
  primaryPathHash: "sha256:03d3dfc832c93e00dae8c960e7509f580b23116996a9ea7f02f4a39eeab4f7ec",
  primaryPath: CARGO_BOAT_PRIMARY_PATH,
  footprint: Object.freeze({ width: 216, depth: 200 }),
  orientation: 0,
  projection: CAREER_WORLD_PROJECTION_ID,
  paletteSlots: PALETTE_SLOTS,
  primitives: freezePrimitives([
    {
      type: "surface",
      id: "cargo-boat-complete-hull-envelope",
      path: CARGO_BOAT_PRIMARY_PATH,
      fill: "structure.base",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "cargo-boat-waterline-ground-contact",
      path: "M -102.0000 10.0000 L -78.0000 -46.0000 L 70.0000 -62.0000 L 102.0000 -28.0000 L 102.0000 18.0000 L 82.0000 52.0000 L -64.0000 64.0000 L -98.0000 38.0000 Z",
      fill: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "extrusion",
      id: "cargo-boat-low-angular-hull",
      plan: plan([[-95, -34], [78, -34], [95, -18], [95, 24], [78, 36], [-82, 36], [-95, 22]]),
      height: 18,
      top: "structure.base",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "cargo-boat-open-central-well",
      path: "M -49.0000 -29.0000 L 38.0000 -29.0000 L 56.0000 -18.0000 L 50.0000 16.0000 L -50.0000 25.0000 L -67.0000 13.0000 Z",
      fill: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "extrusion",
      id: "cargo-boat-raised-stern-cabin",
      plan: plan([[49, -28], [79, -28], [88, -18], [88, 20], [48, 20]]),
      height: 42,
      top: "structure.base",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "cargo-boat-blunt-bow-cap",
      path: "M -98.0000 8.0000 L -83.0000 -26.0000 L -55.0000 -39.0000 L -49.0000 -29.0000 L -67.0000 13.0000 L -91.0000 29.0000 Z",
      fill: "structure.base",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "stroke",
      id: "cargo-boat-near-side-upper-rub-rail",
      path: "M -96.0000 20.0000 L -62.0000 50.0000 L 78.0000 42.0000 L 98.0000 14.0000",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "stroke",
      id: "cargo-boat-near-side-lower-rub-rail",
      path: "M -92.0000 31.0000 L -60.0000 58.0000 L 75.0000 51.0000 L 94.0000 24.0000",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "stroke",
      id: "cargo-boat-cabin-window-band",
      path: "M 55.0000 -49.0000 L 79.0000 -49.0000 L 88.0000 -39.0000 M 56.0000 -40.0000 L 81.0000 -40.0000 L 89.0000 -31.0000",
      stroke: "line.secondary",
      detailTier: 1,
    },
    {
      type: "stroke",
      id: "cargo-boat-well-floor-seams",
      path: "M -35.0000 -25.0000 L -35.0000 23.0000 M -7.0000 -28.0000 L -7.0000 21.0000 M 21.0000 -28.0000 L 21.0000 19.0000",
      stroke: "line.secondary",
      detailTier: 2,
    },
  ]),
} satisfies GeometryDefinition);

const MARKER_BUOY_PRIMARY_PATH =
  "M 0.0000 72.0000 L -18.0000 58.0000 L -32.0000 32.0000 L -44.0000 18.0000 L -52.0000 8.0000 L -44.0000 -8.0000 L -36.0000 -10.0000 L -36.0000 -50.0000 L -22.0000 -66.0000 L -10.0000 -72.0000 L -10.0000 -112.0000 L -25.0000 -113.0000 L -25.0000 -142.0000 L -12.0000 -155.0000 L 14.0000 -155.0000 L 27.0000 -142.0000 L 27.0000 -113.0000 L 10.0000 -112.0000 L 10.0000 -72.0000 L 22.0000 -66.0000 L 36.0000 -50.0000 L 36.0000 -10.0000 L 44.0000 -8.0000 L 52.0000 8.0000 L 44.0000 18.0000 L 32.0000 32.0000 L 18.0000 58.0000 Z";

const markerBuoy = Object.freeze({
  assetId: "ambient/marker-buoy@v1",
  category: "ambient",
  geometryKey: "career-world/ambient/marker-buoy/master-v1",
  masterGeometryHash: "sha256:befc0c57ac7a568333eee1c3a1b17e803376bb8cdc19509bd7308231fe805a48",
  primaryPathHash: "sha256:eba44a4d6e0f14fdd4abc11b540d817e57393eec9688d8942fdf75fe3d476c14",
  primaryPath: MARKER_BUOY_PRIMARY_PATH,
  footprint: Object.freeze({ width: 110, depth: 150 }),
  orientation: 0,
  projection: CAREER_WORLD_PROJECTION_ID,
  paletteSlots: PALETTE_SLOTS,
  primitives: freezePrimitives([
    {
      type: "surface",
      id: "marker-buoy-weighted-faceted-body",
      path: "M -36.0000 -50.0000 L -22.0000 -66.0000 L 0.0000 -72.0000 L 22.0000 -66.0000 L 36.0000 -50.0000 L 44.0000 -8.0000 L 32.0000 32.0000 L 18.0000 58.0000 L 0.0000 72.0000 L -18.0000 58.0000 L -32.0000 32.0000 L -44.0000 -8.0000 Z",
      fill: "structure.base",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "marker-buoy-opposing-stabilizer-fins",
      path: "M -52.0000 8.0000 L -36.0000 -10.0000 L -28.0000 14.0000 L -44.0000 18.0000 Z M 52.0000 8.0000 L 36.0000 -10.0000 L 28.0000 14.0000 L 44.0000 18.0000 Z",
      fill: "structure.base",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "extrusion",
      id: "marker-buoy-narrow-mast",
      plan: offsetRegularPolygon(0, 0, 6, 7, 30),
      height: 112,
      top: "structure.base",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "stroke",
      id: "marker-buoy-open-top-cage",
      path: "M -25.0000 -113.0000 L -25.0000 -142.0000 L -12.0000 -155.0000 L 14.0000 -155.0000 L 27.0000 -142.0000 L 27.0000 -113.0000 Z M -25.0000 -142.0000 L 27.0000 -142.0000 M -12.0000 -155.0000 L -12.0000 -119.0000 M 14.0000 -155.0000 L 14.0000 -119.0000",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "stroke",
      id: "marker-buoy-body-facet-seams",
      path: "M -28.0000 -42.0000 L 0.0000 -60.0000 L 28.0000 -42.0000 M 0.0000 -60.0000 L 0.0000 62.0000 M -30.0000 10.0000 L 0.0000 25.0000 L 30.0000 10.0000",
      stroke: "line.secondary",
      detailTier: 1,
    },
    {
      type: "stroke",
      id: "marker-buoy-cage-cross-braces",
      path: "M -20.0000 -139.0000 L 10.0000 -122.0000 M 22.0000 -139.0000 L -8.0000 -122.0000",
      stroke: "line.secondary",
      detailTier: 2,
    },
  ]),
} satisfies GeometryDefinition);

const SHORE_PIER_PRIMARY_PATH =
  "M -168.0000 65.0000 L -164.0000 48.0000 L -160.0000 45.0000 L -145.0000 30.0000 L -130.0000 25.0000 L 15.0000 -28.0000 L 22.0000 -64.0000 L 43.0000 -82.0000 L 78.0000 -96.0000 L 113.0000 -104.0000 L 115.0000 -106.0000 L 165.0000 -78.0000 L 168.0000 30.0000 L 150.0000 50.0000 L 145.0000 53.0000 L 115.0000 60.0000 L 113.0000 76.0000 L 105.0000 76.0000 L 103.0000 61.0000 L 84.0000 66.0000 L 82.0000 82.0000 L 74.0000 82.0000 L 72.0000 68.0000 L 53.0000 61.0000 L 51.0000 77.0000 L 43.0000 77.0000 L 41.0000 55.0000 L 24.0000 34.0000 L -2.0000 42.0000 L -4.0000 57.0000 L -12.0000 57.0000 L -14.0000 46.0000 L -32.0000 53.0000 L -34.0000 68.0000 L -42.0000 68.0000 L -44.0000 57.0000 L -62.0000 64.0000 L -64.0000 79.0000 L -72.0000 79.0000 L -74.0000 68.0000 L -92.0000 75.0000 L -94.0000 88.0000 L -104.0000 88.0000 L -106.0000 78.0000 L -135.0000 88.0000 L -160.0000 82.0000 Z";

const shorePier = Object.freeze({
  assetId: "ambient/shore-pier@v1",
  category: "ambient",
  geometryKey: "career-world/ambient/shore-pier/master-v1",
  masterGeometryHash: "sha256:4bbfe31547e19ba43d38a96149399af71f11666a067e66fc59ebfdf46a79754f",
  primaryPathHash: "sha256:0633c253e097d0670c51b75ede06e397c6461687426ced0773c9a38efa57374b",
  primaryPath: SHORE_PIER_PRIMARY_PATH,
  footprint: Object.freeze({ width: 350, depth: 220 }),
  orientation: 0,
  projection: CAREER_WORLD_PROJECTION_ID,
  paletteSlots: PALETTE_SLOTS,
  primitives: freezePrimitives([
    {
      type: "surface",
      id: "shore-pier-pile-supported-union",
      path: SHORE_PIER_PRIMARY_PATH,
      fill: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "shore-pier-long-approach-deck",
      path: "M -135.0000 31.0000 L 15.0000 -24.0000 L 48.0000 -4.0000 L -103.0000 52.0000 Z",
      fill: "structure.base",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "shore-pier-broad-cross-head-deck",
      path: "M 22.0000 -62.0000 L 114.0000 -101.0000 L 158.0000 -75.0000 L 67.0000 -35.0000 Z",
      fill: "structure.base",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "shore-pier-stepped-shore-abutment",
      path: "M -164.0000 48.0000 L -143.0000 31.0000 L -112.0000 43.0000 L -136.0000 68.0000 L -160.0000 65.0000 Z",
      fill: "terrain.claim",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "surface",
      id: "shore-pier-blank-utility-shelter",
      path: "M 70.0000 -69.0000 L 91.0000 -78.0000 L 106.0000 -68.0000 L 85.0000 -58.0000 L 85.0000 -38.0000 L 67.0000 -45.0000 Z",
      fill: "structure.base",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "stroke",
      id: "shore-pier-approach-support-rhythm",
      path: "M -8.0000 44.0000 L -8.0000 55.0000 M -38.0000 55.0000 L -38.0000 66.0000 M -68.0000 66.0000 L -68.0000 77.0000 M -99.0000 77.0000 L -99.0000 86.0000",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "stroke",
      id: "shore-pier-cross-head-support-rhythm",
      path: "M 47.0000 58.0000 L 47.0000 75.0000 M 78.0000 67.0000 L 78.0000 80.0000 M 109.0000 61.0000 L 109.0000 74.0000 M 145.0000 48.0000 L 145.0000 53.0000",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "stroke",
      id: "shore-pier-tier-zero-rails-and-posts",
      path: "M -132.0000 26.0000 L 15.0000 -28.0000 L 22.0000 -64.0000 L 115.0000 -106.0000 L 160.0000 -78.0000 M -100.0000 38.0000 L -102.0000 29.0000 M -60.0000 24.0000 L -62.0000 15.0000 M -20.0000 10.0000 L -22.0000 1.0000 M 12.0000 -2.0000 L 12.0000 -14.0000 M 45.0000 -72.0000 L 43.0000 -82.0000 M 80.0000 -86.0000 L 78.0000 -96.0000 M 115.0000 -94.0000 L 113.0000 -104.0000 M 145.0000 -75.0000 L 148.0000 -82.0000",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "stroke",
      id: "shore-pier-interior-deck-board-rhythm",
      path: "M -108.0000 31.0000 L -78.0000 42.0000 M -78.0000 20.0000 L -48.0000 31.0000 M -48.0000 9.0000 L -18.0000 20.0000 M -18.0000 -2.0000 L 12.0000 9.0000 M 43.0000 -58.0000 L 86.0000 -77.0000 M 56.0000 -45.0000 L 116.0000 -71.0000 M 70.0000 -34.0000 L 137.0000 -62.0000",
      stroke: "line.secondary",
      detailTier: 1,
    },
    {
      type: "stroke",
      id: "shore-pier-interior-shelter-seams",
      path: "M 73.0000 -64.0000 L 88.0000 -70.0000 L 100.0000 -64.0000 M 76.0000 -52.0000 L 76.0000 -45.0000",
      stroke: "line.secondary",
      detailTier: 2,
    },
  ]),
} satisfies GeometryDefinition);

const ROOF_KIT_PRIMARY_PATH =
  "M -80.0000 14.0000 L -68.0000 -34.0000 L -48.0000 -54.0000 L -14.0000 -56.0000 L -6.0000 -70.0000 L 8.0000 -78.0000 L 20.0000 -70.0000 L 28.0000 -78.0000 L 40.0000 -70.0000 L 46.0000 -62.0000 L 62.0000 -56.0000 L 80.0000 -34.0000 L 80.0000 28.0000 L 60.0000 50.0000 L -24.0000 52.0000 Z";

const roofEquipmentKit = Object.freeze({
  assetId: "ambient/roof-equipment-kit@v1",
  category: "ambient",
  geometryKey: "career-world/ambient/roof-equipment-kit/master-v1",
  masterGeometryHash: "sha256:99109fe7e6351850b28c7e70047b480a1cb071b76150306ebcb7bc51c608be6c",
  primaryPathHash: "sha256:517f5f16690b6b1d9f24d5ad78ad0e7c65766166fc1bfa3e1f248287751069ad",
  primaryPath: ROOF_KIT_PRIMARY_PATH,
  footprint: Object.freeze({ width: 164, depth: 164 }),
  orientation: 0,
  projection: CAREER_WORLD_PROJECTION_ID,
  paletteSlots: PALETTE_SLOTS,
  primitives: freezePrimitives([
    {
      type: "surface",
      id: "roof-kit-grouped-silhouette-face",
      path: ROOF_KIT_PRIMARY_PATH,
      fill: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "extrusion",
      id: "roof-kit-shared-base",
      plan: plan([[-57, -39], [49, -39], [58, -28], [58, 36], [-51, 36], [-57, 29]]),
      height: 5,
      top: "terrain.claim",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "extrusion",
      id: "roof-kit-low-rectangular-housing",
      plan: offsetRectangle(-26, 2, 43, 31),
      height: 22,
      top: "structure.base",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "extrusion",
      id: "roof-kit-angled-vent-hood",
      plan: plan([[3, -23], [30, -18], [34, 4], [7, 9], [-2, 0]]),
      height: 31,
      top: "structure.base",
      litSide: "structure.base",
      shadowSide: "structure.shadow",
      stroke: "line.primary",
      detailTier: 0,
    },
    ...[[-1, 24], [15, 27], [31, 22]].map(([x, y], index) => ({
      type: "extrusion" as const,
      id: `roof-kit-pipe-${index + 1}`,
      plan: offsetRegularPolygon(x, y, 8, 4.5, 22.5),
      height: 29 + index * 4,
      top: "structure.base" as const,
      litSide: "structure.base" as const,
      shadowSide: "structure.shadow" as const,
      stroke: "line.primary" as const,
      detailTier: 0 as const,
    })),
    {
      type: "stroke",
      id: "roof-kit-narrow-open-access-curb",
      path: "M 34.0000 7.0000 L 55.0000 1.0000 L 61.0000 22.0000 L 43.0000 38.0000 L 27.0000 27.0000 Z",
      stroke: "line.primary",
      detailTier: 0,
    },
    {
      type: "stroke",
      id: "roof-kit-housing-panel-seams",
      path: "M -42.0000 -12.0000 L -13.0000 -20.0000 L -4.0000 -9.0000 M -42.0000 5.0000 L -7.0000 -3.0000 M 3.0000 -23.0000 L 34.0000 4.0000",
      stroke: "line.secondary",
      detailTier: 1,
    },
    {
      type: "stroke",
      id: "roof-kit-base-fastener-marks",
      path: "M -48.0000 -30.0000 L -44.0000 -30.0000 M 42.0000 -31.0000 L 46.0000 -31.0000 M -43.0000 29.0000 L -39.0000 29.0000 M 47.0000 29.0000 L 51.0000 29.0000",
      stroke: "line.secondary",
      detailTier: 2,
    },
  ]),
} satisfies GeometryDefinition);

export const AMBIENT_GEOMETRY_DEFINITIONS = Object.freeze([
  evergreenCluster,
  rockCluster,
  serviceTruck,
  cargoBoat,
  markerBuoy,
  shorePier,
  roofEquipmentKit,
] satisfies readonly GeometryDefinition[]);
