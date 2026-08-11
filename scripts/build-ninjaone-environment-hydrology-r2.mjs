import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

sharp.cache(false);
sharp.concurrency(1);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTERED_TERRAIN_MASTER_PATH = path.join(
  ROOT,
  "art-source/career-world/ninjaone-environment/production-r2/"
    + "ninjaone-environment-terrain-master-detail-r2.png",
);
const REGISTERED_WATER_EFFECTS_MASK_PATH = path.join(
  ROOT,
  "art-source/career-world/ninjaone-environment/production-r2/"
    + "water-base-r1/registered-water-effects-source-mask-r1.png",
);
const DECLARED_WATER_CORRIDOR_MASK_PATH = path.join(
  ROOT,
  "art-source/career-world/ninjaone-environment/production-r2/"
    + "water-base-r1/declared-inland-water-corridor-r1.png",
);
const REGISTERED_INLAND_WATER_MASK_PATH = path.join(
  ROOT,
  "art-source/career-world/ninjaone-environment/production-r2/"
    + "water-base-r1/registered-inland-water-mask-r1.png",
);
const WATER_INTENT_REFERENCES = Object.freeze([
  Object.freeze({
    dimensions: Object.freeze([1448, 1086]),
    path: "art-source/career-world/ninjaone-environment/production-r2/"
      + "water-base-r1/neutral-water-reference-r1.png",
    role: "full-concept authority for watercourse direction and feature classification",
  }),
  Object.freeze({
    dimensions: Object.freeze([2880, 2160]),
    path: "art-source/career-world/ninjaone-environment/production-r2/"
      + "water-base-r1/declared-inland-water-corridor-r1.png",
    role: "declared inland-water topology corridor; not a waterfall-placement inference map",
  }),
  Object.freeze({
    dimensions: Object.freeze([2880, 2160]),
    path: "art-source/career-world/ninjaone-environment/production-r2/"
      + "water-base-r1/registered-inland-water-mask-r1.png",
    role: "registered inland-water body evidence inside the declared topology corridor",
  }),
  Object.freeze({
    dimensions: Object.freeze([2880, 2160]),
    path: "art-source/career-world/ninjaone-environment/production-r2/"
      + "water-base-r1/registered-water-effects-source-mask-r1.png",
    role: "source-registered rapid and foam placement; never body topology",
  }),
]);
const SEAM_INTEGRATION_MANIFEST_PATH = path.join(
  ROOT,
  "public/career-world/capitals/ninjaone/environment/manifests/"
    + "seam-integration-native-r2.json",
);
const FIELD_DIRECTORY = path.join(
  ROOT,
  "public/career-world/layers/water-surface/fields",
);
const MANIFEST_PATH = path.join(
  ROOT,
  "public/career-world/capitals/ninjaone/environment/manifests/"
    + "hydrology-native-r2.json",
);

export const HYDROLOGY_ARTBOARD = Object.freeze([1440, 1080]);
export const HYDROLOGY_FIELD_DIMENSIONS = Object.freeze([2880, 2160]);
export const HYDROLOGY_FALLBACK_FIELD_DIMENSIONS = Object.freeze([1440, 1080]);
export const HYDROLOGY_WORLD_ORIGIN = Object.freeze([0.125, 0]);
export const HYDROLOGY_WORLD_SPAN = Object.freeze([0.25, 1 / 3]);
export const HYDROLOGY_MAXIMUM_DECODED_BYTES = 32 * 1024 * 1024;
export const HYDROLOGY_MAXIMUM_MOUNTED_REGIONS = 2;
const SHARED_WATER_TEXTURE_LEDGER = Object.freeze({
  hydrologyDecodedBytes: 0,
  maximumDecodedBytes: 288 * 1024 * 1024,
  ownership: "excludes-native-hydrology",
  steadyDecodedBytes: 250_700_205,
  transientPeakDecodedBytes: 259_091_416,
});

const HYDROLOGY_REGION_CELLS = Object.freeze([
  Object.freeze({
    id: "B2",
    logicalBounds: Object.freeze([0, 540, 720, 1080]),
  }),
  Object.freeze({
    id: "C1",
    logicalBounds: Object.freeze([720, 0, 1440, 540]),
  }),
  Object.freeze({
    id: "C2",
    logicalBounds: Object.freeze([720, 540, 1440, 1080]),
  }),
]);

const STYLE = Object.freeze({
  tarn: 32,
  stream: 96,
  turbulence: 120,
  lip: 148,
  waterfall: 192,
  impact: 224,
  coast: 252,
});
const SPEED_BY_KIND = Object.freeze({
  coast: 0.08,
  impact: 0.34,
  stream: 0.28,
  tarn: 0.025,
  turbulence: 0.52,
  waterfall: 0.94,
  "waterfall-lip": 0.72,
});
const WHITEWATER_BY_KIND = Object.freeze({
  coast: 0.035,
  impact: 0.82,
  stream: 0.025,
  tarn: 0,
  turbulence: 0.22,
  waterfall: 0.9,
  "waterfall-lip": 0.7,
});
const TRANSPARENT_CHANNEL_SEGMENT_IDS = new Set([
  "c1-main-river-upper-channel",
  "c2-main-river-upper-channel",
  "b2-tarn-outlet-run",
  "c2-gorge-lower-channel",
  "c2-lower-river-channel",
  "c2-lower-river-turbulence",
  "c2-terminal-river-channel",
]);

const polygon = (points) => Object.freeze({
  points: Object.freeze(points.map((point) => Object.freeze(point))),
  type: "polygon",
});
const pathShape = (points, radius) => Object.freeze({
  points: Object.freeze(points.map((point) => Object.freeze(point))),
  radius,
  type: "path",
});

// Coordinates use the unchanged 1440 x 1080 registration artboard. Pixel
// masks come from the accepted single registered terrain master; paths provide
// local flow direction and never bridge dry terrain.
export const HYDROLOGY_SEGMENTS = Object.freeze([
  Object.freeze({
    cellIds: Object.freeze(["C1"]),
    declaredFlowVector: Object.freeze([0.8824, 0.4706]),
    id: "c1-r0c2-mainland-coast",
    kind: "coast",
    priority: 10,
    shape: polygon([
      [720, 170],
      [895, 170],
      [930, 270],
      [720, 270],
    ]),
    styleCode: STYLE.coast,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C1"]),
    declaredFlowVector: Object.freeze([0.7526, 0.6585]),
    id: "c1-r0c2-offshore-stack",
    kind: "coast",
    priority: 10,
    shape: polygon([
      [835, 82],
      [970, 82],
      [980, 170],
      [840, 170],
    ]),
    styleCode: STYLE.coast,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C1"]),
    declaredFlowVector: Object.freeze([0.8, 0.6]),
    id: "c1-r0c2-southeast-stacks",
    kind: "coast",
    priority: 10,
    shape: polygon([
      [925, 188],
      [1080, 188],
      [1080, 270],
      [925, 270],
    ]),
    styleCode: STYLE.coast,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C1"]),
    declaredFlowVector: Object.freeze([0.3032, 0.9529]),
    id: "c1-r0c3-east-coast",
    kind: "coast",
    priority: 10,
    shape: polygon([
      [1190, 0],
      [1380, 0],
      [1380, 270],
      [1170, 270],
      [1145, 205],
    ]),
    styleCode: STYLE.coast,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C1"]),
    declaredFlowVector: Object.freeze([0.7934, 0.6087]),
    id: "c1-r1c2-north-coast",
    kind: "coast",
    priority: 10,
    shape: polygon([
      [935, 270],
      [1080, 270],
      [1080, 375],
      [995, 375],
      [930, 330],
    ]),
    styleCode: STYLE.coast,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C1"]),
    declaredFlowVector: Object.freeze([0.4301, 0.9028]),
    id: "c1-r0c3-coastal-stream",
    kind: "stream",
    priority: 35,
    shape: pathShape([
      [1082, 0],
      [1100, 32],
      [1118, 66],
      [1128, 105],
      [1144, 145],
      [1158, 184],
      [1180, 225],
      [1204, 260],
    ], 13),
    styleCode: STYLE.stream,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C1"]),
    declaredFlowVector: Object.freeze([0.329, 0.9443]),
    id: "c1-main-river-upper-channel",
    kind: "turbulence",
    priority: 45,
    shape: pathShape([
      [864, 218],
      [870, 268],
      [889, 312],
      [904, 344],
      [910, 385],
      [929, 399],
      [921, 451],
      [896, 489],
      [882, 512],
      [842, 536],
    ], 25),
    styleCode: STYLE.turbulence,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C2"]),
    declaredFlowVector: Object.freeze([-0.4072, 0.9134]),
    id: "c2-main-river-upper-channel",
    kind: "turbulence",
    priority: 45,
    shape: pathShape([
      [842, 536],
      [836, 572],
      [804, 603],
      [798, 657],
      [764, 701],
      [740, 747],
      [741, 777],
      [745, 802],
      [752, 816],
    ], 25),
    styleCode: STYLE.turbulence,
  }),
  Object.freeze({
    cellIds: Object.freeze(["B2"]),
    declaredFlowVector: Object.freeze([0.7071, 0.7071]),
    id: "b2-tarn-inlet",
    kind: "stream",
    priority: 35,
    shape: pathShape([[538, 540], [544, 555], [559, 571], [580, 582]], 11),
    styleCode: STYLE.stream,
  }),
  Object.freeze({
    cellIds: Object.freeze(["B2"]),
    declaredFlowVector: Object.freeze([0, 0]),
    id: "b2-tarn-ripple",
    kind: "tarn",
    priority: 20,
    rippleCenter: Object.freeze([606, 616]),
    shape: polygon([
      [545, 586],
      [560, 566],
      [600, 556],
      [638, 566],
      [664, 590],
      [670, 619],
      [655, 647],
      [625, 660],
      [582, 656],
      [551, 637],
    ]),
    styleCode: STYLE.tarn,
  }),
  Object.freeze({
    cellIds: Object.freeze(["B2"]),
    declaredFlowVector: Object.freeze([0.4833, 0.8755]),
    id: "b2-tarn-outlet-run",
    kind: "stream",
    priority: 40,
    shape: pathShape([
      [638, 636],
      [644, 642],
      [653, 647],
      [650, 652],
      [655, 660],
      [656, 670],
      [660, 680],
      [662, 690],
      [660, 700],
      [666, 710],
      [674, 718],
      [678, 724],
      [691, 732],
    ], 15),
    styleCode: STYLE.stream,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C2"]),
    declaredFlowVector: Object.freeze([0.5145, 0.8575]),
    id: "c2-gorge-cascade-lip",
    kind: "waterfall-lip",
    priority: 75,
    shape: pathShape([[749, 814], [758, 829]], 9),
    styleCode: STYLE.lip,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C2"]),
    declaredFlowVector: Object.freeze([0.5547, 0.8321]),
    id: "c2-gorge-cascade-fall",
    kind: "waterfall",
    priority: 70,
    shape: pathShape([[753, 821], [771, 850]], 10),
    styleCode: STYLE.waterfall,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C2"]),
    declaredFlowVector: Object.freeze([0.7071, 0.7071]),
    id: "c2-gorge-cascade-impact",
    kind: "impact",
    priority: 80,
    shape: pathShape([[767, 844], [781, 858]], 11),
    styleCode: STYLE.impact,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C2"]),
    declaredFlowVector: Object.freeze([0.8107, 0.5855]),
    id: "c2-gorge-lower-channel",
    kind: "stream",
    priority: 35,
    shape: pathShape([
      [775, 854],
      [790, 866],
      [805, 879],
      [820, 890],
      [840, 901],
    ], 18),
    styleCode: STYLE.stream,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C2"]),
    declaredFlowVector: Object.freeze([0.7071, 0.7071]),
    id: "c2-lower-river-channel",
    kind: "stream",
    priority: 35,
    shape: pathShape([
      [838, 900],
      [855, 918],
      [872, 936],
      [890, 953],
      [908, 970],
      [925, 987],
    ], 16),
    styleCode: STYLE.stream,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C2"]),
    declaredFlowVector: Object.freeze([0.7071, 0.7071]),
    id: "c2-lower-river-turbulence",
    kind: "turbulence",
    priority: 45,
    shape: pathShape([[805, 879], [825, 897], [845, 914], [865, 932]], 13),
    styleCode: STYLE.turbulence,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C2"]),
    declaredFlowVector: Object.freeze([0.7071, 0.7071]),
    id: "c2-terminal-river-channel",
    kind: "stream",
    priority: 35,
    shape: pathShape([
      [923, 985],
      [943, 1002],
      [970, 1017],
      [1000, 1028],
      [1020, 1045],
      [1023, 1064],
      [1016, 1078],
    ], 16),
    styleCode: STYLE.stream,
  }),
]);

function cascadeDescriptor({
  approachExtentPixels,
  approachWidthPixels,
  crestEnd,
  crestStart,
  crestThicknessPixels,
  fallDirection,
  fallExtentPixels,
  fallWidthPixels,
  id,
  impactCenter,
  impactRadiiPixels,
  mistDriftVector,
  mistRadiusPixels,
  outflowExtentPixels,
  poolRadiiPixels,
  regionId,
}) {
  const resolvedApproachExtent = approachExtentPixels
    ?? Math.max(8, Math.round(fallExtentPixels * 0.62));
  const resolvedApproachWidth = approachWidthPixels
    ?? Math.max(6, Math.round(fallWidthPixels * 0.82));
  const resolvedPoolRadii = poolRadiiPixels
    ?? Object.freeze([
      Math.max(5, Math.round(impactRadiiPixels[0] * 1.35)),
      Math.max(4, Math.round(impactRadiiPixels[1] * 1.15)),
    ]);
  return Object.freeze({
    approach: Object.freeze({
      extentPixels: resolvedApproachExtent,
      widthPixels: resolvedApproachWidth,
    }),
    crest: Object.freeze({
      end: Object.freeze(crestEnd),
      start: Object.freeze(crestStart),
      thicknessPixels: crestThicknessPixels,
    }),
    fall: Object.freeze({
      direction: Object.freeze(fallDirection),
      extentPixels: fallExtentPixels,
      widthPixels: fallWidthPixels,
    }),
    id,
    impact: Object.freeze({
      center: Object.freeze(impactCenter),
      radiiPixels: Object.freeze(impactRadiiPixels),
    }),
    maskPolicy: "registered water remains exact; only descriptor-bounded crest, falling sheet, impact spray, and mist may overlay land",
    mist: Object.freeze({
      driftVector: Object.freeze(mistDriftVector),
      radiusPixels: mistRadiusPixels,
    }),
    pool: Object.freeze({
      outflowExtentPixels: outflowExtentPixels
        ?? Math.max(8, Math.round(resolvedPoolRadii[0] * 1.25)),
      radiiPixels: Object.freeze(resolvedPoolRadii),
    }),
    regionId,
  });
}

// Waterfall stages are explicit source-registered geometry. The middle B2 tarn
// and its outlet are a lake plus rapid/run in the accepted city composition,
// not vertical falls, so they deliberately have no sheet, impact, or mist
// descriptors. C1 is also a continuous rapid/riffle run. Only the visible C2
// southeast gorge remains a source-proven cascade.
export const HYDROLOGY_CASCADES = Object.freeze([
  cascadeDescriptor({
    approachExtentPixels: 14,
    approachWidthPixels: 11,
    crestEnd: [749, 830],
    crestStart: [760, 822],
    crestThicknessPixels: 3,
    fallDirection: [0.5547, 0.8321],
    fallExtentPixels: 29,
    fallWidthPixels: 11,
    id: "c2-gorge-main-drop",
    impactCenter: [771, 850],
    impactRadiiPixels: [9, 7],
    mistDriftVector: [0.8321, 0.5547],
    mistRadiusPixels: 12,
    outflowExtentPixels: 22,
    poolRadiiPixels: [15, 10],
    regionId: "C2",
  }),
]);

function obstacleDescriptor({
  bowExtentPixels,
  center,
  flowDirection,
  id,
  intensity,
  radiusPixels,
  regionId,
  wakeExtentPixels,
  wakeWidthPixels,
}) {
  return Object.freeze({
    bowExtentPixels,
    center: Object.freeze(center),
    flowDirection: Object.freeze(flowDirection),
    id,
    intensity,
    maskPolicy: "wake support is evaluated only inside accepted registered water coverage",
    radiusPixels,
    regionId,
    wakeExtentPixels,
    wakeWidthPixels,
  });
}

// These are terrain-registered boulders visible in the B2 tarn outlet. Their
// compact bow/split/wake footprints are authored data, not inferred screen
// strokes, so future territory builders can reproduce the same interaction.
export const HYDROLOGY_OBSTACLES = Object.freeze([
  obstacleDescriptor({
    bowExtentPixels: 9,
    center: [629, 652],
    flowDirection: [0.212, 0.9773],
    id: "b2-tarn-outlet-boulder",
    intensity: 0.78,
    radiusPixels: 7,
    regionId: "B2",
    wakeExtentPixels: 30,
    wakeWidthPixels: 12,
  }),
  obstacleDescriptor({
    bowExtentPixels: 5,
    center: [655, 675],
    flowDirection: [0.4301, 0.9028],
    id: "b2-tarn-channel-split-rock",
    intensity: 0.52,
    radiusPixels: 4,
    regionId: "B2",
    wakeExtentPixels: 17,
    wakeWidthPixels: 7,
  }),
]);

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / Math.max(edge1 - edge0, 1e-9));
  return t * t * (3 - 2 * t);
}

function hashLattice2(x, y, seed) {
  let hash = Math.imul(x | 0, 0x1f123bb5)
    ^ Math.imul(y | 0, 0x5f356495)
    ^ Math.imul(seed | 0, 0x6c8e9cf5);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  return ((hash ^ (hash >>> 16)) >>> 0) / 0xffffffff;
}

function valueNoise2(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothstep(0, 1, x - x0);
  const ty = smoothstep(0, 1, y - y0);
  const top = hashLattice2(x0, y0, seed) * (1 - tx)
    + hashLattice2(x0 + 1, y0, seed) * tx;
  const bottom = hashLattice2(x0, y0 + 1, seed) * (1 - tx)
    + hashLattice2(x0 + 1, y0 + 1, seed) * tx;
  return top * (1 - ty) + bottom * ty;
}

function cascadeNoise(x, y, seed) {
  return valueNoise2(x, y, seed) * 0.58
    + valueNoise2(x * 2.03 + 7.1, y * 2.03 - 3.7, seed + 19) * 0.28
    + valueNoise2(x * 4.11 - 2.6, y * 4.11 + 5.3, seed + 43) * 0.14;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function assertTuple(actual, expected, label) {
  if (
    !Array.isArray(actual)
    || actual.length !== expected.length
    || actual.some((value, index) => value !== expected[index])
  ) {
    throw new Error(`${label} must be ${JSON.stringify(expected)}.`);
  }
}

async function loadNativeUnionAdmission(fieldTiers) {
  const manifestBytes = await readFile(SEAM_INTEGRATION_MANIFEST_PATH);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (manifest.budgets?.maximumDecodedBytes !== HYDROLOGY_MAXIMUM_DECODED_BYTES) {
    throw new Error("Native hydrology authority must retain the 32 MiB union ceiling.");
  }
  const expectedHandoffIds = [
    "b2-c2-r2c1-to-r2c2-waterfall",
    "c2-r2c2-to-r3c2",
    "c2-r3c2-to-r3c3",
  ];
  const hydrologyTransitionHandoffs = manifest.hydrologyTransitionHandoffs;
  if (
    !Array.isArray(hydrologyTransitionHandoffs)
    || hydrologyTransitionHandoffs.length !== expectedHandoffIds.length
    || hydrologyTransitionHandoffs.some((handoff, index) => (
      handoff.id !== expectedHandoffIds[index]
      || handoff.status !== "requires-bounded-transition-field"
      || handoff.topologyTreatment !== "no synthetic water geometry in the seam asset"
      || typeof handoff.seamResourceId !== "string"
    ))
  ) {
    throw new Error("Seam authority must expose all three bounded hydrology handoffs.");
  }
  const possibleCohorts = possibleRegionalCohorts(fieldTiers);
  const fallbackWorstCohort = possibleCohorts.reduce((worst, cohort) => (
    cohort.decodedBytes.fallback > worst.decodedBytes.fallback ? cohort : worst
  ));
  const detailDecodedBytes = fieldTiers.find(({ id }) => id === "detail")?.decodedBytes ?? 0;
  const fallbackDecodedBytes = fieldTiers.find(({ id }) => id === "fallback")?.decodedBytes ?? 0;
  const nativeApplicationOwnedUnion = Object.freeze({
    authority: Object.freeze({
      constituents: Object.freeze([
        Object.freeze({
          id: "seam-integration",
          path: "/career-world/capitals/ninjaone/environment/manifests/seam-integration-native-r2.json",
          sha256: sha256(manifestBytes),
        }),
      ]),
      status: "provisional-pending-static-foliage-seam-coast-freeze",
    }),
    eventBounds: Object.freeze({
      fallbackWorstCohort: Object.freeze({
        artboardOrigin: Object.freeze([325.5, 356]),
        artboardSpan: Object.freeze([432, 243]),
        cameraOrigin: Object.freeze([0.18151041666666667, 0.10987654320987653]),
        cameraSpan: Object.freeze([0.075, 0.075]),
        decodedBytes: fallbackWorstCohort.decodedBytes.fallback,
        regionIds: fallbackWorstCohort.regionIds,
      }),
      impossibleRegionSets: Object.freeze([
        Object.freeze(["B2", "C1", "C2"]),
      ]),
      maximumMountedRegions: HYDROLOGY_MAXIMUM_MOUNTED_REGIONS,
      maximumViewArtboardSpan: Object.freeze([432, 243]),
    }),
    maximumDecodedBytes: HYDROLOGY_MAXIMUM_DECODED_BYTES,
    tiers: Object.freeze({
      detail: Object.freeze({
        maximumCohortDecodedBytes: maximumCohortDecodedBytes(fieldTiers, "detail"),
      }),
      fallback: Object.freeze({
        maximumCohortDecodedBytes: maximumCohortDecodedBytes(fieldTiers, "fallback"),
      }),
    }),
    totalPackedDecodedBytes: Object.freeze({
      detail: detailDecodedBytes,
      fallback: fallbackDecodedBytes,
    }),
  });
  return Object.freeze({
    hydrologyTransitionHandoffs: Object.freeze(
      hydrologyTransitionHandoffs.map((handoff) => Object.freeze(handoff)),
    ),
    nativeApplicationOwnedUnion,
  });
}

function normalizedVector(x, y) {
  const length = Math.hypot(x, y);
  return length > 1e-9 ? [x / length, y / length] : [0, 0];
}

function pathPointTangent(points, index) {
  const previousIndex = Math.max(0, index - 1);
  const nextIndex = Math.min(points.length - 1, index + 1);
  const incoming = normalizedVector(
    points[index][0] - points[previousIndex][0],
    points[index][1] - points[previousIndex][1],
  );
  const outgoing = normalizedVector(
    points[nextIndex][0] - points[index][0],
    points[nextIndex][1] - points[index][1],
  );
  if (index === 0) return outgoing;
  if (index === points.length - 1) return incoming;
  return normalizedVector(incoming[0] + outgoing[0], incoming[1] + outgoing[1]);
}

async function loadNativeSourceField(fieldWidth, fieldHeight) {
  const sourceBytes = await readFile(REGISTERED_TERRAIN_MASTER_PATH);
  const sourceDigest = sha256(sourceBytes);
  const metadata = await sharp(sourceBytes).metadata();
  assertTuple(
    [metadata.width, metadata.height],
    [5760, 4320],
    "Registered terrain master dimensions",
  );
  const { data: field, info } = await sharp(sourceBytes)
    .resize(fieldWidth, fieldHeight, { fit: "fill", kernel: "lanczos3" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.width !== fieldWidth || info.height !== fieldHeight || info.channels !== 4) {
    throw new Error("Registered terrain master did not decode to the hydrology artboard.");
  }
  return Object.freeze({
    field,
    sourceDigest,
    sourcePath: "/art-source/career-world/ninjaone-environment/production-r2/"
      + "ninjaone-environment-terrain-master-detail-r2.png",
    sourceDimensions: Object.freeze([metadata.width, metadata.height]),
  });
}

async function loadRegisteredWaterEffectsField(fieldWidth, fieldHeight) {
  const sourceBytes = await readFile(REGISTERED_WATER_EFFECTS_MASK_PATH);
  const { data: field, info } = await sharp(sourceBytes)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assertTuple(
    [info.width, info.height],
    [fieldWidth, fieldHeight],
    "Registered water effects mask dimensions",
  );
  if (info.channels !== 1) {
    throw new Error("Registered water effects mask must decode to one channel.");
  }
  return Object.freeze({
    field,
    sourceDigest: sha256(sourceBytes),
    sourcePath: `/${path.relative(ROOT, REGISTERED_WATER_EFFECTS_MASK_PATH).replaceAll("\\", "/")}`,
  });
}

async function loadDeclaredWaterCorridorField(fieldWidth, fieldHeight) {
  const sourceBytes = await readFile(DECLARED_WATER_CORRIDOR_MASK_PATH);
  const { data: field, info } = await sharp(sourceBytes)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assertTuple(
    [info.width, info.height],
    [fieldWidth, fieldHeight],
    "Declared inland-water corridor dimensions",
  );
  if (info.channels !== 1) {
    throw new Error("Declared inland-water corridor must decode to one channel.");
  }
  return Object.freeze({
    field,
    sourceDigest: sha256(sourceBytes),
    sourcePath: `/${path.relative(ROOT, DECLARED_WATER_CORRIDOR_MASK_PATH).replaceAll("\\", "/")}`,
  });
}

async function loadRegisteredInlandWaterField(fieldWidth, fieldHeight) {
  const sourceBytes = await readFile(REGISTERED_INLAND_WATER_MASK_PATH);
  const { data: field, info } = await sharp(sourceBytes)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assertTuple(
    [info.width, info.height],
    [fieldWidth, fieldHeight],
    "Registered inland-water mask dimensions",
  );
  if (info.channels !== 1) {
    throw new Error("Registered inland-water mask must decode to one channel.");
  }
  return Object.freeze({
    field,
    sourceDigest: sha256(sourceBytes),
    sourcePath: `/${path.relative(ROOT, REGISTERED_INLAND_WATER_MASK_PATH).replaceAll("\\", "/")}`,
  });
}

async function loadWaterIntentReferences() {
  return Object.freeze(await Promise.all(WATER_INTENT_REFERENCES.map(
    async ({ dimensions, path: referencePath, role }) => {
      const absolutePath = path.join(ROOT, referencePath);
      const bytes = await readFile(absolutePath);
      const metadata = await sharp(bytes).metadata();
      assertTuple(
        [metadata.width, metadata.height],
        dimensions,
        `Water intent reference ${referencePath} dimensions`,
      );
      return Object.freeze({
        dimensions,
        path: `/${referencePath.replaceAll("\\", "/")}`,
        role,
        sha256: sha256(bytes),
      });
    },
  )));
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[previous];
    const intersects = (y1 > y) !== (y2 > y)
      && x < (x2 - x1) * (y - y1) / (y2 - y1) + x1;
    if (intersects) inside = !inside;
  }
  return inside;
}

function nearestPathSample(x, y, points) {
  let best = null;
  for (let index = 0; index < points.length - 1; index += 1) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[index + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared === 0
      ? 0
      : clamp(((x - x1) * dx + (y - y1) * dy) / lengthSquared);
    const nearestX = x1 + dx * t;
    const nearestY = y1 + dy * t;
    const distance = Math.hypot(x - nearestX, y - nearestY);
    if (!best || distance < best.distance) {
      const startTangent = pathPointTangent(points, index);
      const endTangent = pathPointTangent(points, index + 1);
      best = {
        distance,
        flow: normalizedVector(
          startTangent[0] * (1 - t) + endTangent[0] * t,
          startTangent[1] * (1 - t) + endTangent[1] * t,
        ),
      };
    }
  }
  return best;
}

function nearestDeclaredCorridorSample(cellId, x, y) {
  let best = null;
  for (const segment of HYDROLOGY_SEGMENTS) {
    if (
      !segment.cellIds.includes(cellId)
      || !["stream", "tarn", "turbulence"].includes(segment.kind)
    ) continue;
    if (segment.shape.type === "polygon") {
      if (pointInPolygon(x, y, segment.shape.points)) {
        return Object.freeze({
          distanceRatio: 0,
          flow: segment.declaredFlowVector,
          segment,
        });
      }
      continue;
    }
    const sample = nearestPathSample(x, y, segment.shape.points);
    if (!sample) continue;
    const distanceRatio = sample.distance / Math.max(segment.shape.radius, 1);
    if (!best || distanceRatio < best.distanceRatio) {
      best = {
        distanceRatio,
        flow: sample.flow,
        segment,
      };
    }
  }
  return best ? Object.freeze(best) : null;
}

function waterStrength(red, green, blue, alpha) {
  if (alpha < 24) return 0;
  const coolDark = Math.min(
    smoothstep(2, 22, blue - red),
    smoothstep(-1, 15, green - red),
    smoothstep(26, 82, blue),
  );
  const coolBright = Math.min(
    smoothstep(-2, 14, blue - red),
    smoothstep(-5, 12, green - red),
    smoothstep(78, 170, blue),
  );
  return clamp(Math.max(coolDark, coolBright) * smoothstep(24, 170, alpha));
}

function registeredTerrainWaterStrength(red, green, blue, alpha) {
  // The frozen regional terrain master represents exposed channel water in
  // two legitimate ways: cool authored water pixels and transparent cutouts
  // where the shared water layer is meant to show through. Rejecting the
  // latter produced disconnected opaque material islands over one continuous
  // river. Segment corridors still provide the topology fence, so transparent
  // exterior pixels cannot invent a new channel.
  const transparentChannel = 1 - smoothstep(12, 96, alpha);
  return Math.max(
    waterStrength(red, green, blue, alpha),
    transparentChannel,
  );
}

function smoothRegisteredVelocityField(field, velocitySeed, width, height) {
  const pixelCount = width * height;
  let velocityX = new Float32Array(pixelCount);
  let velocityY = new Float32Array(pixelCount);
  let nextVelocityX = new Float32Array(pixelCount);
  let nextVelocityY = new Float32Array(pixelCount);
  let minimumX = width;
  let minimumY = height;
  let maximumX = -1;
  let maximumY = -1;

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    if (field[offset] === 0) continue;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    minimumX = Math.min(minimumX, x);
    minimumY = Math.min(minimumY, y);
    maximumX = Math.max(maximumX, x);
    maximumY = Math.max(maximumY, y);
    velocityX[pixel] = (field[offset + 1] - 128) / 127;
    velocityY[pixel] = (field[offset + 2] - 128) / 127;
  }
  if (maximumX < minimumX || maximumY < minimumY) return 0;

  const iterations = 24;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let y = minimumY; y <= maximumY; y += 1) {
      for (let x = minimumX; x <= maximumX; x += 1) {
        const pixel = y * width + x;
        const offset = pixel * 4;
        if (field[offset] === 0) {
          nextVelocityX[pixel] = 0;
          nextVelocityY[pixel] = 0;
          continue;
        }
        let sumX = 0;
        let sumY = 0;
        let neighbors = 0;
        if (x > 0 && field[offset - 4] > 0) {
          sumX += velocityX[pixel - 1];
          sumY += velocityY[pixel - 1];
          neighbors += 1;
        }
        if (x + 1 < width && field[offset + 4] > 0) {
          sumX += velocityX[pixel + 1];
          sumY += velocityY[pixel + 1];
          neighbors += 1;
        }
        if (y > 0 && field[offset - width * 4] > 0) {
          sumX += velocityX[pixel - width];
          sumY += velocityY[pixel - width];
          neighbors += 1;
        }
        if (y + 1 < height && field[offset + width * 4] > 0) {
          sumX += velocityX[pixel + width];
          sumY += velocityY[pixel + width];
          neighbors += 1;
        }
        if (neighbors === 0) {
          nextVelocityX[pixel] = velocityX[pixel];
          nextVelocityY[pixel] = velocityY[pixel];
          continue;
        }
        const averageX = sumX / neighbors;
        const averageY = sumY / neighbors;
        if (velocitySeed[pixel] > 0) {
          const sourceX = (field[offset + 1] - 128) / 127;
          const sourceY = (field[offset + 2] - 128) / 127;
          nextVelocityX[pixel] = sourceX * 0.86 + averageX * 0.14;
          nextVelocityY[pixel] = sourceY * 0.86 + averageY * 0.14;
        } else {
          nextVelocityX[pixel] = velocityX[pixel] * 0.18 + averageX * 0.82;
          nextVelocityY[pixel] = velocityY[pixel] * 0.18 + averageY * 0.82;
        }
      }
    }
    [velocityX, nextVelocityX] = [nextVelocityX, velocityX];
    [velocityY, nextVelocityY] = [nextVelocityY, velocityY];
  }

  for (let y = minimumY; y <= maximumY; y += 1) {
    for (let x = minimumX; x <= maximumX; x += 1) {
      const pixel = y * width + x;
      const offset = pixel * 4;
      if (field[offset] === 0) continue;
      field[offset + 1] = Math.round(128 + clamp(velocityX[pixel], -1, 1) * 127);
      field[offset + 2] = Math.round(128 + clamp(velocityY[pixel], -1, 1) * 127);
    }
  }
  return iterations;
}

function foamStrength(red, green, blue, alpha) {
  if (alpha < 24) return 0;
  const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
  const coolNeutral = Math.min(
    smoothstep(-10, 8, blue - red),
    smoothstep(-14, 4, green - red),
  );
  return clamp(smoothstep(105, 210, luminance) * coolNeutral);
}

function buildConnectedNativeEvidenceField(sourceField, width, height) {
  const pixelCount = width * height;
  const evidence = new Float32Array(pixelCount);
  const foamCandidates = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let queueHead = 0;
  let queueLength = 0;

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    const red = sourceField[offset];
    const green = sourceField[offset + 1];
    const blue = sourceField[offset + 2];
    const alpha = sourceField[offset + 3];
    const water = waterStrength(red, green, blue, alpha);
    const foam = foamStrength(red, green, blue, alpha);
    evidence[pixel] = water;
    if (water >= 0.035) {
      queue[queueLength] = pixel;
      queueLength += 1;
    } else if (foam >= 0.035) {
      foamCandidates[pixel] = Math.max(1, Math.round(foam * 255));
    }
  }

  // Whitewater may be brighter and more neutral than the dark-water seed it
  // belongs to. Admit only foam components reached from authoritative water;
  // isolated pale rocks therefore cannot become primary hydrology coverage.
  while (queueHead < queueLength) {
    const pixel = queue[queueHead];
    queueHead += 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
      const neighborY = y + deltaY;
      if (neighborY < 0 || neighborY >= height) continue;
      for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
        if (deltaX === 0 && deltaY === 0) continue;
        const neighborX = x + deltaX;
        if (neighborX < 0 || neighborX >= width) continue;
        const neighbor = neighborY * width + neighborX;
        const encodedFoam = foamCandidates[neighbor];
        if (encodedFoam === 0) continue;
        foamCandidates[neighbor] = 0;
        evidence[neighbor] = encodedFoam / 255;
        queue[queueLength] = neighbor;
        queueLength += 1;
      }
    }
  }

  return evidence;
}

function shapeBounds(shape) {
  const radius = shape.type === "path" ? shape.radius : 0;
  const xs = shape.points.map(([x]) => x);
  const ys = shape.points.map(([, y]) => y);
  return Object.freeze([
    Math.max(0, Math.floor(Math.min(...xs) - radius)),
    Math.max(0, Math.floor(Math.min(...ys) - radius)),
    Math.min(HYDROLOGY_ARTBOARD[0], Math.ceil(Math.max(...xs) + radius)),
    Math.min(HYDROLOGY_ARTBOARD[1], Math.ceil(Math.max(...ys) + radius)),
  ]);
}

function segmentSample(segment, x, y) {
  if (segment.shape.type === "polygon") {
    return pointInPolygon(x, y, segment.shape.points)
      ? { edge: 1, flow: segment.declaredFlowVector }
      : null;
  }
  const nearest = nearestPathSample(x, y, segment.shape.points);
  if (!nearest || nearest.distance > segment.shape.radius) return null;
  return {
    edge: smoothstep(0, 0.42, 1 - nearest.distance / segment.shape.radius),
    // Runtime transport follows the local, vertex-smoothed high-to-low path.
    // The declared vector remains the auditable net direction, not a shader or
    // field substitute for bends visible in the native original.
    flow: nearest.flow,
    normalizedDistance: nearest.distance / segment.shape.radius,
  };
}

function inverseSmoothstep(edge0, edge1, value) {
  return 1 - smoothstep(edge0, edge1, value);
}

function intervalSupport(value, start, end, feather) {
  return smoothstep(start - feather, start, value)
    * inverseSmoothstep(end, end + feather, value);
}

function decodeVelocity(field, offset) {
  return Object.freeze([
    (field[offset + 1] - 128) / 127,
    (field[offset + 2] - 128) / 127,
  ]);
}

function encodeVelocity(field, offset, direction, speed) {
  const normalized = normalizedVector(direction[0], direction[1]);
  field[offset + 1] = Math.round(128 + normalized[0] * clamp(speed) * 127);
  field[offset + 2] = Math.round(128 + normalized[1] * clamp(speed) * 127);
}

function deriveVisualDepthField(field, width, height, scale) {
  const distance = new Uint16Array(width * height);
  distance.fill(0xffff);
  for (let pixel = 0; pixel < distance.length; pixel += 1) {
    if (field[pixel * 4] === 0) distance[pixel] = 0;
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      if (distance[pixel] === 0) continue;
      let nearest = distance[pixel];
      if (x > 0) nearest = Math.min(nearest, distance[pixel - 1] + 3);
      if (y > 0) nearest = Math.min(nearest, distance[pixel - width] + 3);
      if (x > 0 && y > 0) nearest = Math.min(nearest, distance[pixel - width - 1] + 4);
      if (x + 1 < width && y > 0) nearest = Math.min(nearest, distance[pixel - width + 1] + 4);
      distance[pixel] = nearest;
    }
  }
  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = width - 1; x >= 0; x -= 1) {
      const pixel = y * width + x;
      if (distance[pixel] === 0) continue;
      let nearest = distance[pixel];
      if (x + 1 < width) nearest = Math.min(nearest, distance[pixel + 1] + 3);
      if (y + 1 < height) nearest = Math.min(nearest, distance[pixel + width] + 3);
      if (x + 1 < width && y + 1 < height) {
        nearest = Math.min(nearest, distance[pixel + width + 1] + 4);
      }
      if (x > 0 && y + 1 < height) {
        nearest = Math.min(nearest, distance[pixel + width - 1] + 4);
      }
      distance[pixel] = nearest;
    }
  }
  for (let pixel = 0; pixel < distance.length; pixel += 1) {
    const offset = pixel * 4;
    if (field[offset] === 0) continue;
    const distanceArtboardPixels = distance[pixel] / 3 / scale;
    field[offset + 3] = Math.max(
      1,
      Math.round(clamp(distanceArtboardPixels / 18) * 255),
    );
  }
}

function cascadeSupport(cascade, x, y) {
  const crestStart = cascade.crest.start;
  const crestEnd = cascade.crest.end;
  const crestCenter = Object.freeze([
    (crestStart[0] + crestEnd[0]) * 0.5,
    (crestStart[1] + crestEnd[1]) * 0.5,
  ]);
  const direction = cascade.fall.direction;
  const cross = [-direction[1], direction[0]];
  const crestDelta = [x - crestCenter[0], y - crestCenter[1]];
  const along = crestDelta[0] * direction[0] + crestDelta[1] * direction[1];
  const across = crestDelta[0] * cross[0] + crestDelta[1] * cross[1];
  const approach = intervalSupport(
    along,
    -cascade.approach.extentPixels,
    0,
    2,
  ) * inverseSmoothstep(
    cascade.approach.widthPixels * 0.38,
    cascade.approach.widthPixels * 0.62,
    Math.abs(across),
  );
  const crestNearest = nearestPathSample(x, y, [crestStart, crestEnd]);
  const crest = crestNearest
    ? inverseSmoothstep(
      cascade.crest.thicknessPixels * 0.45,
      cascade.crest.thicknessPixels * 1.2,
      crestNearest.distance,
    )
    : 0;
  const fall = intervalSupport(along, 0, cascade.fall.extentPixels, 2)
    * inverseSmoothstep(
      cascade.fall.widthPixels * 0.32,
      cascade.fall.widthPixels * 0.55,
      Math.abs(across),
    );
  const impactDelta = [
    x - cascade.impact.center[0],
    y - cascade.impact.center[1],
  ];
  const impactAlong = impactDelta[0] * direction[0] + impactDelta[1] * direction[1];
  const impactAcross = impactDelta[0] * cross[0] + impactDelta[1] * cross[1];
  const impactDistance = Math.hypot(
    impactAlong / cascade.impact.radiiPixels[0],
    impactAcross / cascade.impact.radiiPixels[1],
  );
  const impact = inverseSmoothstep(0.35, 1.05, impactDistance);
  const poolCenter = [
    cascade.impact.center[0] + direction[0] * cascade.pool.radiiPixels[0] * 0.55,
    cascade.impact.center[1] + direction[1] * cascade.pool.radiiPixels[0] * 0.55,
  ];
  const poolDelta = [x - poolCenter[0], y - poolCenter[1]];
  const poolDistance = Math.hypot(
    (poolDelta[0] * direction[0] + poolDelta[1] * direction[1])
      / cascade.pool.radiiPixels[0],
    (poolDelta[0] * cross[0] + poolDelta[1] * cross[1])
      / cascade.pool.radiiPixels[1],
  );
  const pool = inverseSmoothstep(0.28, 1.12, poolDistance);
  const outflowStart = cascade.pool.radiiPixels[0] * 0.6;
  const outflow = intervalSupport(
    impactAlong,
    outflowStart,
    outflowStart + cascade.pool.outflowExtentPixels,
    3,
  ) * inverseSmoothstep(
    cascade.pool.radiiPixels[1] * 0.34,
    cascade.pool.radiiPixels[1] * 0.72,
    Math.abs(impactAcross),
  );
  const mistCenter = [
    cascade.impact.center[0] + cascade.mist.driftVector[0] * cascade.mist.radiusPixels * 0.16,
    cascade.impact.center[1] + cascade.mist.driftVector[1] * cascade.mist.radiusPixels * 0.16,
  ];
  const mist = inverseSmoothstep(
    0.25,
    1,
    Math.hypot(x - mistCenter[0], y - mistCenter[1]) / cascade.mist.radiusPixels,
  );
  return {
    across,
    along,
    approach,
    crest,
    direction,
    fall,
    fallProgress: clamp(along / Math.max(cascade.fall.extentPixels, 1)),
    impact,
    impactAcross,
    impactAlong,
    mist,
    outflow,
    pool,
  };
}

function cascadeAerationDetail(cascade, support, cascadeIndex) {
  const supportPresence = Math.max(
    support.approach,
    support.crest,
    support.fall,
    support.impact,
    support.mist,
    support.outflow,
    support.pool,
  );
  if (supportPresence <= 0.0001) return 0;

  const seed = 173 + cascadeIndex * 271;
  const fallWidth = Math.max(cascade.fall.widthPixels, 1);
  const acrossUnit = support.across / fallWidth;
  const progress = support.fallProgress;
  const threadWarpNoise = cascadeNoise(
    support.along * 0.11,
    cascadeIndex * 0.31,
    seed + 61,
  ) - 0.5;
  const sheetWarp = (
    cascadeNoise(support.along * 0.055, cascadeIndex * 0.73, seed + 7) - 0.5
  ) * 0.15 + threadWarpNoise * 0.08;
  const sheetNoise = cascadeNoise(
    support.across * 0.12 + sheetWarp * 2.1,
    support.along * 0.07,
    seed + 17,
  );
  const secondaryNoise = cascadeNoise(
    support.across * 0.19 - sheetWarp,
    support.along * 0.11,
    seed + 43,
  );
  const centerThreadCenter = sheetWarp * 0.42
    + threadWarpNoise * 0.09
    + Math.sin(support.along * 0.23 + cascadeIndex * 0.7) * 0.022;
  const centerThread = inverseSmoothstep(
    0.025,
    0.105,
    Math.abs(acrossUnit - centerThreadCenter),
  );
  const leftThreadCenter = -0.19
    + sheetWarp * 0.72
    - threadWarpNoise * 0.085
    + Math.sin(support.along * 0.17 + cascadeIndex * 0.9) * 0.04;
  const rightThreadCenter = 0.2
    + sheetWarp * 0.64
    + threadWarpNoise * 0.1
    + Math.sin(support.along * 0.13 + cascadeIndex * 1.3 + 1.8) * 0.045;
  const leftThread = inverseSmoothstep(
    0.018,
    0.072,
    Math.abs(acrossUnit - leftThreadCenter),
  );
  const rightThread = inverseSmoothstep(
    0.02,
    0.082,
    Math.abs(acrossUnit - rightThreadCenter),
  );
  const sheetProfile = inverseSmoothstep(
    0.17,
    0.5,
    Math.abs(acrossUnit - sheetWarp),
  );
  const centerGate = 0.04 + smoothstep(
    0.4,
    0.7,
    cascadeNoise(support.along * 0.13, cascadeIndex * 0.8, seed + 97),
  ) * 0.96;
  const leftGate = 0.025 + smoothstep(
    0.38,
    0.72,
    cascadeNoise(support.along * 0.16, cascadeIndex * 1.1, seed + 131),
  ) * 0.975;
  const rightGate = 0.025 + smoothstep(
    0.41,
    0.74,
    cascadeNoise(support.along * 0.145, cascadeIndex * 1.4, seed + 167),
  ) * 0.975;
  const braidedThreads = Math.max(
    centerThread * centerGate * (0.44 + sheetNoise * 0.56),
    leftThread * leftGate * (0.34 + secondaryNoise * 0.58),
    rightThread * rightGate * (0.32 + sheetNoise * 0.62),
  );
  const sheetBreakup = 0.08
    + smoothstep(0.32, 0.74, sheetNoise) * 0.92;
  const translucentVeil = sheetProfile * (
    0.03 + smoothstep(0.42, 0.76, secondaryNoise) * 0.085
  );
  const fall = support.fall
    * clamp(translucentVeil + braidedThreads * sheetBreakup)
    * (0.72 + progress * 0.28);

  const crestNoise = cascadeNoise(
    support.across * 0.18,
    support.along * 0.3,
    seed + 83,
  );
  const crest = support.crest * (
    0.42 + smoothstep(0.3, 0.72, crestNoise) * 0.58
  );

  const impactNoise = cascadeNoise(
    support.impactAcross * 0.16,
    support.impactAlong * 0.13,
    seed + 109,
  );
  const impactPattern = 0.22 + smoothstep(0.34, 0.74, impactNoise) * 0.78;
  const impactCore = support.impact * impactPattern;
  const asymmetricSplash = support.impact
    * inverseSmoothstep(
      cascade.impact.radiiPixels[1] * 0.12,
      cascade.impact.radiiPixels[1] * 0.52,
      Math.abs(
        support.impactAcross
          - Math.sin(support.impactAlong * 0.48 + cascadeIndex) * 1.25
      ),
    )
    * smoothstep(-1.5, 1.5, support.impactAlong)
    * smoothstep(0.28, 0.62, impactNoise);
  const recoveryNoise = cascadeNoise(
    support.impactAcross * 0.1,
    support.impactAlong * 0.075,
    seed + 151,
  );
  const recovery = Math.max(support.pool * 0.18, support.outflow * 0.12)
    * smoothstep(0.36, 0.72, recoveryNoise);

  return clamp(Math.max(
    support.approach * 0.08 * smoothstep(0.34, 0.7, sheetNoise),
    crest,
    fall,
    impactCore,
    asymmetricSplash,
    recovery,
  ));
}

function obstacleSupport(obstacle, x, y) {
  const direction = obstacle.flowDirection;
  const cross = [-direction[1], direction[0]];
  const delta = [x - obstacle.center[0], y - obstacle.center[1]];
  const along = delta[0] * direction[0] + delta[1] * direction[1];
  const across = delta[0] * cross[0] + delta[1] * cross[1];
  const bow = intervalSupport(
    along,
    -obstacle.bowExtentPixels,
    -obstacle.radiusPixels * 0.35,
    1.5,
  ) * inverseSmoothstep(
    obstacle.radiusPixels * 0.8,
    obstacle.radiusPixels * 1.55,
    Math.abs(across),
  );
  const wakeProgress = clamp(along / obstacle.wakeExtentPixels);
  const wakeHalfWidth = obstacle.radiusPixels * 0.45
    + obstacle.wakeWidthPixels * wakeProgress;
  const wake = intervalSupport(
    along,
    obstacle.radiusPixels * 0.25,
    obstacle.wakeExtentPixels,
    2,
  ) * inverseSmoothstep(
    wakeHalfWidth * 0.38,
    wakeHalfWidth,
    Math.abs(across),
  );
  const shoulder = intervalSupport(
    along,
    -obstacle.radiusPixels,
    obstacle.radiusPixels * 1.25,
    1.5,
  ) * smoothstep(
    obstacle.radiusPixels * 0.65,
    obstacle.radiusPixels * 1.5,
    Math.abs(across),
  ) * inverseSmoothstep(
    obstacle.radiusPixels * 1.5,
    obstacle.radiusPixels * 2.4,
    Math.abs(across),
  );
  return { across, along, bow, direction, shoulder, wake };
}

function applyHydraulicEventFields(
  field,
  auxiliary,
  width,
  height,
  scale,
) {
  for (let fieldY = 0; fieldY < height; fieldY += 1) {
    const y = (fieldY + 0.5) / scale;
    for (let fieldX = 0; fieldX < width; fieldX += 1) {
      const pixel = fieldY * width + fieldX;
      const offset = pixel * 4;
      const x = (fieldX + 0.5) / scale;
      const occupied = field[offset] > 0;
      let whitewater = occupied ? auxiliary[offset] / 255 : 0;
      let wake = 0;
      let mist = 0;
      let cascadeStage = 0;
      let velocity = occupied ? decodeVelocity(field, offset) : [0, 0];
      let speed = Math.hypot(...velocity);
      let velocityDirection = speed > 0.01
        ? [velocity[0] / speed, velocity[1] / speed]
        : [0, 1];

      for (
        let cascadeIndex = 0;
        cascadeIndex < HYDROLOGY_CASCADES.length;
        cascadeIndex += 1
      ) {
        const cascade = HYDROLOGY_CASCADES[cascadeIndex];
        const support = cascadeSupport(cascade, x, y);
        const fallEnergy = smoothstep(7, 20, cascade.fall.extentPixels);
        const mistEnergy = smoothstep(0.88, 1, fallEnergy);
        const authoredAeration = cascadeAerationDetail(
          cascade,
          support,
          cascadeIndex,
        );
        if (!occupied) {
          const dryVfxSupport = Math.max(
            support.crest,
            support.fall,
            support.impact,
          );
          whitewater = Math.max(
            whitewater,
            authoredAeration
              * dryVfxSupport
              * (0.68 + fallEnergy * 0.3),
          );
          mist = Math.max(mist, support.mist * mistEnergy);
          cascadeStage = Math.max(
            cascadeStage,
            support.crest * 0.72,
            support.fall,
            support.impact * 0.82,
          );
          continue;
        }
        const cascadeWhitewater = Math.max(
          support.approach * 0.06,
          authoredAeration * (0.68 + fallEnergy * 0.3),
          support.crest * (0.16 + fallEnergy * 0.1),
          support.impact * (0.12 + fallEnergy * 0.08),
          support.pool * fallEnergy * 0.08,
          support.outflow * fallEnergy * 0.05,
        );
        whitewater = Math.max(whitewater, cascadeWhitewater);
        mist = Math.max(mist, support.mist * mistEnergy);
        cascadeStage = Math.max(
          cascadeStage,
          support.approach * 0.22,
          support.crest * 0.72,
          support.fall,
          support.impact * 0.82,
          support.pool * 0.42,
          support.outflow * 0.2,
        );
        const targetSpeed = Math.max(
          support.approach * 0.48,
          support.crest * 0.72,
          support.fall * 0.96,
          support.impact * 0.38,
          support.pool * 0.18,
          support.outflow * 0.3,
        );
        if (targetSpeed > speed) {
          speed = targetSpeed;
          velocityDirection = support.direction;
        }
      }

      if (!occupied) {
        auxiliary[offset] = Math.round(clamp(whitewater) * 255);
        auxiliary[offset + 1] = 0;
        auxiliary[offset + 2] = Math.round(clamp(mist) * 255);
        auxiliary[offset + 3] = Math.round(clamp(cascadeStage) * 255);
        continue;
      }

      for (const obstacle of HYDROLOGY_OBSTACLES) {
        const support = obstacleSupport(obstacle, x, y);
        wake = Math.max(
          wake,
          Math.max(support.bow, support.shoulder, support.wake) * obstacle.intensity,
        );
        whitewater = Math.max(
          whitewater,
          support.bow * obstacle.intensity * 0.46,
          support.shoulder * obstacle.intensity * 0.32,
          support.wake * obstacle.intensity * 0.18,
        );
        if (support.shoulder > 0.05) {
          const cross = [-support.direction[1], support.direction[0]];
          const side = support.across < 0 ? -1 : 1;
          velocityDirection = normalizedVector(
            support.direction[0] + cross[0] * side * support.shoulder * 0.42,
            support.direction[1] + cross[1] * side * support.shoulder * 0.42,
          );
          speed = Math.max(speed, 0.38 + support.shoulder * 0.22);
        } else if (support.wake > 0.05) {
          speed *= 1 - support.wake * 0.32;
        }
      }

      encodeVelocity(field, offset, velocityDirection, speed);
      auxiliary[offset] = Math.round(clamp(whitewater) * 255);
      auxiliary[offset + 1] = Math.round(clamp(wake) * 255);
      auxiliary[offset + 2] = Math.round(clamp(mist) * 255);
      auxiliary[offset + 3] = Math.round(clamp(cascadeStage) * 255);
    }
  }
}

function publicPath(target, digest) {
  return `/${path.relative(path.join(ROOT, "public"), target).replaceAll("\\", "/")}`
    + `?v=${digest.slice(0, 12).toLowerCase()}`;
}

function tightOccupiedBounds(field, dimensions, logicalBounds, scale) {
  const [fieldWidth, fieldHeight] = dimensions;
  const [logicalLeft, logicalTop, logicalRight, logicalBottom] = logicalBounds;
  const startX = Math.max(0, Math.floor(logicalLeft * scale));
  const startY = Math.max(0, Math.floor(logicalTop * scale));
  const endX = Math.min(fieldWidth, Math.ceil(logicalRight * scale));
  const endY = Math.min(fieldHeight, Math.ceil(logicalBottom * scale));
  let left = endX;
  let top = endY;
  let right = startX;
  let bottom = startY;
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const offset = (y * fieldWidth + x) * 4;
      if (field[offset] === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);
    }
  }
  if (right <= left || bottom <= top) {
    throw new Error(`Hydrology region ${logicalBounds.join(",")} has no occupied texels.`);
  }
  return Object.freeze([left, top, right, bottom]);
}

function cropRgba(field, fieldDimensions, sourceBounds) {
  const [fieldWidth] = fieldDimensions;
  const [left, top, right, bottom] = sourceBounds;
  const width = right - left;
  const height = bottom - top;
  const crop = Buffer.alloc(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const sourceStart = ((top + row) * fieldWidth + left) * 4;
    const targetStart = row * width * 4;
    field.copy(crop, targetStart, sourceStart, sourceStart + width * 4);
  }
  return Object.freeze({ crop, dimensions: Object.freeze([width, height]) });
}

function packRgbaPlanes(primary, auxiliary, dimensions) {
  const [width, height] = dimensions;
  if (
    primary.length !== auxiliary.length
    || primary.length !== width * height * 4
  ) {
    throw new Error("Hydrology primary and auxiliary crops must share dimensions.");
  }
  const packedWidth = width * 2;
  const packed = Buffer.alloc(packedWidth * height * 4);
  for (let row = 0; row < height; row += 1) {
    const sourceStart = row * width * 4;
    const sourceEnd = sourceStart + width * 4;
    const targetStart = row * packedWidth * 4;
    primary.copy(packed, targetStart, sourceStart, sourceEnd);
    auxiliary.copy(packed, targetStart + width * 4, sourceStart, sourceEnd);
  }
  return Object.freeze({
    packed,
    packedDimensions: Object.freeze([packedWidth, height]),
  });
}

function artboardBoundsToWorldBounds([left, top, right, bottom]) {
  const origin = Object.freeze([
    HYDROLOGY_WORLD_ORIGIN[0]
      + left / HYDROLOGY_ARTBOARD[0] * HYDROLOGY_WORLD_SPAN[0],
    HYDROLOGY_WORLD_ORIGIN[1]
      + top / HYDROLOGY_ARTBOARD[1] * HYDROLOGY_WORLD_SPAN[1],
  ]);
  const span = Object.freeze([
    (right - left) / HYDROLOGY_ARTBOARD[0] * HYDROLOGY_WORLD_SPAN[0],
    (bottom - top) / HYDROLOGY_ARTBOARD[1] * HYDROLOGY_WORLD_SPAN[1],
  ]);
  return Object.freeze({ origin, span });
}

async function buildRegionalTierAssets({
  auxiliaryField,
  field,
  fieldDimensions,
  tier,
}) {
  const scale = fieldDimensions[0] / HYDROLOGY_ARTBOARD[0];
  if (scale !== fieldDimensions[1] / HYDROLOGY_ARTBOARD[1]) {
    throw new Error(`${tier} hydrology must use one uniform artboard scale.`);
  }
  const regions = [];
  const outputs = [];
  let occupiedPixels = 0;
  for (const region of HYDROLOGY_REGION_CELLS) {
    const sourceBounds = tightOccupiedBounds(
      field,
      fieldDimensions,
      region.logicalBounds,
      scale,
    );
    const { crop, dimensions } = cropRgba(field, fieldDimensions, sourceBounds);
    const { crop: auxiliaryCrop } = cropRgba(
      auxiliaryField,
      fieldDimensions,
      sourceBounds,
    );
    const { packed, packedDimensions } = packRgbaPlanes(
      crop,
      auxiliaryCrop,
      dimensions,
    );
    let coveragePixels = 0;
    let directionalPixels = 0;
    let sumFlowX = 0;
    let sumFlowY = 0;
    for (let offset = 0; offset < crop.length; offset += 4) {
      if (crop[offset] === 0) continue;
      coveragePixels += 1;
      occupiedPixels += 1;
      const flowX = (crop[offset + 1] - 128) / 127;
      const flowY = (crop[offset + 2] - 128) / 127;
      const flowLength = Math.hypot(flowX, flowY);
      if (flowLength <= 0.1) continue;
      directionalPixels += 1;
      sumFlowX += flowX / flowLength;
      sumFlowY += flowY / flowLength;
    }
    const meanFlowLength = Math.hypot(sumFlowX, sumFlowY);
    const resourceId = `ninjaone-hydrology-${region.id.toLowerCase()}-${tier}-r4`;
    const resourcePath = path.join(FIELD_DIRECTORY, `${resourceId}.png`);
    const resourceBytes = await sharp(packed, {
      raw: {
        width: packedDimensions[0],
        height: packedDimensions[1],
        channels: 4,
      },
    }).png({ compressionLevel: 9, palette: false }).toBuffer();
    const resourceDigest = sha256(resourceBytes);
    const artboardBounds = Object.freeze(sourceBounds.map((value) => value / scale));
    regions.push(Object.freeze({
      artboardBounds,
      decodedBytes: packed.length,
      dimensions: packedDimensions,
      fieldDimensions: dimensions,
      id: resourceId,
      metrics: Object.freeze({
        coveragePixels,
        directionalPixels,
        meanFlowVector: Object.freeze([
          sumFlowX / meanFlowLength,
          sumFlowY / meanFlowLength,
        ]),
        rawAuxiliaryRgbaSha256: sha256(auxiliaryCrop),
        rawPrimaryRgbaSha256: sha256(crop),
      }),
      path: publicPath(resourcePath, resourceDigest),
      regionId: region.id,
      sha256: resourceDigest,
      sourceBounds,
      tier,
      worldBounds: artboardBoundsToWorldBounds(artboardBounds),
    }));
    outputs.push(Object.freeze({ bytes: resourceBytes, path: resourcePath }));
  }
  return Object.freeze({
    decodedBytes: regions.reduce((total, region) => total + region.decodedBytes, 0),
    fullFieldDimensions: fieldDimensions,
    id: tier,
    occupiedPixels,
    outputs: Object.freeze(outputs),
    regions: Object.freeze(regions),
    scale,
  });
}

function mergeRegionSelectionBounds(tiers) {
  return Object.freeze(HYDROLOGY_REGION_CELLS.map(({ id }) => {
    const resources = tiers.flatMap((tier) => (
      tier.regions.filter((resource) => resource.regionId === id)
    ));
    const artboardBounds = Object.freeze([
      Math.min(...resources.map((resource) => resource.artboardBounds[0])),
      Math.min(...resources.map((resource) => resource.artboardBounds[1])),
      Math.max(...resources.map((resource) => resource.artboardBounds[2])),
      Math.max(...resources.map((resource) => resource.artboardBounds[3])),
    ]);
    return Object.freeze({
      artboardBounds,
      id,
      worldBounds: artboardBoundsToWorldBounds(artboardBounds),
    });
  }));
}

function possibleRegionalCohorts(tiers) {
  const regionSets = [
    [],
    ["B2"],
    ["C1"],
    ["C2"],
    ["B2", "C1"],
    ["B2", "C2"],
    ["C1", "C2"],
  ];
  return Object.freeze(regionSets.map((regionIds) => Object.freeze({
    decodedBytes: Object.freeze(Object.fromEntries(tiers.map((tier) => [
      tier.id,
      tier.regions
        .filter((resource) => regionIds.includes(resource.regionId))
        .reduce((total, resource) => total + resource.decodedBytes, 0),
    ]))),
    regionIds: Object.freeze(regionIds),
  })));
}

function maximumCohortDecodedBytes(tiers, tierId) {
  return Math.max(
    ...possibleRegionalCohorts(tiers).map(({ decodedBytes }) => (
      decodedBytes[tierId]
    )),
  );
}

function serializableSegment(segment) {
  return Object.freeze({
    artboardBounds: shapeBounds(segment.shape),
    cellIds: segment.cellIds,
    declaredFlowVector: segment.declaredFlowVector,
    id: segment.id,
    kind: segment.kind,
    maskPolicy: "accepted registered-master water or water-connected foam inside declared topology corridor",
    priority: segment.priority,
    ...(segment.rippleCenter ? { rippleCenter: segment.rippleCenter } : {}),
    shape: segment.shape,
    styleCode: segment.styleCode,
  });
}

export async function buildNinjaOneEnvironmentHydrologyR2() {
  const [fieldWidth, fieldHeight] = HYDROLOGY_FIELD_DIMENSIONS;
  const [
    nativeSources,
    intentReferences,
    registeredEffects,
    declaredCorridor,
    registeredInlandWater,
  ] = await Promise.all([
    loadNativeSourceField(fieldWidth, fieldHeight),
    loadWaterIntentReferences(),
    loadRegisteredWaterEffectsField(fieldWidth, fieldHeight),
    loadDeclaredWaterCorridorField(fieldWidth, fieldHeight),
    loadRegisteredInlandWaterField(fieldWidth, fieldHeight),
  ]);
  const sourceField = nativeSources.field;
  const connectedNativeEvidence = buildConnectedNativeEvidenceField(
    sourceField,
    fieldWidth,
    fieldHeight,
  );

  const field = Buffer.alloc(fieldWidth * fieldHeight * 4);
  const auxiliaryField = Buffer.alloc(fieldWidth * fieldHeight * 4);
  const ownerPriority = new Uint8Array(fieldWidth * fieldHeight);
  const velocitySeed = new Uint8Array(fieldWidth * fieldHeight);
  const segmentPixels = Object.fromEntries(HYDROLOGY_SEGMENTS.map(({ id }) => [id, 0]));
  const stylePixels = Object.fromEntries(Object.keys(STYLE).map((key) => [key, 0]));
  const styleNameByCode = new Map(Object.entries(STYLE).map(([name, code]) => [code, name]));
  const cellPixels = { B2: 0, C1: 0, C2: 0 };
  let corridorCompletionPixels = 0;
  const scaleX = fieldWidth / HYDROLOGY_ARTBOARD[0];
  const scaleY = fieldHeight / HYDROLOGY_ARTBOARD[1];

  for (const segment of HYDROLOGY_SEGMENTS) {
    const [left, top, right, bottom] = shapeBounds(segment.shape);
    const startX = Math.max(0, Math.floor(left * scaleX));
    const startY = Math.max(0, Math.floor(top * scaleY));
    const endX = Math.min(fieldWidth, Math.ceil(right * scaleX));
    const endY = Math.min(fieldHeight, Math.ceil(bottom * scaleY));
    for (let fieldY = startY; fieldY < endY; fieldY += 1) {
      const artboardY = (fieldY + 0.5) / scaleY;
      for (let fieldX = startX; fieldX < endX; fieldX += 1) {
        const artboardX = (fieldX + 0.5) / scaleX;
        const sampledShape = segmentSample(segment, artboardX, artboardY);
        if (!sampledShape) continue;
        const pixel = fieldY * fieldWidth + fieldX;
        const offset = pixel * 4;
        const red = sourceField[offset];
        const green = sourceField[offset + 1];
        const blue = sourceField[offset + 2];
        const alpha = sourceField[offset + 3];
        const water = TRANSPARENT_CHANNEL_SEGMENT_IDS.has(segment.id)
          ? registeredTerrainWaterStrength(red, green, blue, alpha)
          : waterStrength(red, green, blue, alpha);
        const core = sampledShape.normalizedDistance === undefined
          ? 1
          : smoothstep(0.62, 0.18, sampledShape.normalizedDistance);
        const sourceStrength = segment.kind === "tarn"
          ? water
          : Math.max(water, connectedNativeEvidence[pixel] * core);
        const coverage = sourceStrength * sampledShape.edge;
        if (coverage < 0.035 || segment.priority < ownerPriority[pixel]) continue;
        const [flowX, flowY] = sampledShape.flow;
        const length = Math.hypot(flowX, flowY);
        const normalizedFlow = length > 1e-6
          ? [flowX / length, flowY / length]
          : [0, 0];
        // Coverage is binary at authored resolution. Linear texture filtering
        // supplies the stable sub-texel shoreline; keeping occupied texels at
        // 255 also lets the shader recover the style code at filtered edges by
        // dividing alpha by coverage, instead of misclassifying banks as tarn.
        field[offset] = 255;
        const speed = SPEED_BY_KIND[segment.kind];
        if (!Number.isFinite(speed)) {
          throw new Error(`Hydrology segment ${segment.id} has no speed profile.`);
        }
        field[offset + 1] = Math.round(128 + normalizedFlow[0] * speed * 127);
        field[offset + 2] = Math.round(128 + normalizedFlow[1] * speed * 127);
        // Filled after all segments have established the immutable water mask.
        field[offset + 3] = 1;
        velocitySeed[pixel] = 1;
        const sourceFoam = foamStrength(red, green, blue, alpha);
        const authoredWhitewater = WHITEWATER_BY_KIND[segment.kind];
        const registeredEffect = registeredEffects.field[pixel] / 255;
        const observedAeration = Math.max(sourceFoam, registeredEffect);
        const whitewater = segment.kind === "turbulence"
          ? 0.025 + observedAeration * 0.46
          : segment.kind === "stream"
            ? 0.012 + observedAeration * 0.24
            : authoredWhitewater * (0.68 + observedAeration * 0.32);
        auxiliaryField[offset] = Math.round(clamp(whitewater) * 255);
        ownerPriority[pixel] = segment.priority;
      }
    }
  }

  // The declared corridor is the complete inland-water topology authority.
  // Segment tubes provide centerlines and local tangents, but are not body
  // masks: using them as body coverage left most wide pools and channels on the
  // ocean material. Complete only terrain-registered water/transparent cutouts
  // inside this authored corridor; opaque rocks and land remain excluded.
  for (let fieldY = 0; fieldY < fieldHeight; fieldY += 1) {
    const artboardY = (fieldY + 0.5) / scaleY;
    for (let fieldX = 0; fieldX < fieldWidth; fieldX += 1) {
      const pixel = fieldY * fieldWidth + fieldX;
      const offset = pixel * 4;
      if (field[offset] > 0 || declaredCorridor.field[pixel] < 9) continue;
      const cellId = fieldY >= fieldHeight / 2
        ? fieldX < fieldWidth / 2 ? "B2" : "C2"
        : fieldX >= fieldWidth / 2 ? "C1" : null;
      if (!cellId) continue;
      const red = sourceField[offset];
      const green = sourceField[offset + 1];
      const blue = sourceField[offset + 2];
      const alpha = sourceField[offset + 3];
      const sourceStrength = registeredTerrainWaterStrength(red, green, blue, alpha);
      const corridorStrength = declaredCorridor.field[pixel] / 255;
      const registeredWaterStrength = registeredInlandWater.field[pixel] / 255;
      if (Math.max(sourceStrength, registeredWaterStrength) * corridorStrength < 0.035) {
        continue;
      }
      const artboardX = (fieldX + 0.5) / scaleX;
      const nearest = nearestDeclaredCorridorSample(
        cellId,
        artboardX,
        artboardY,
      );
      if (!nearest) continue;
      const channelWeight = 1 - smoothstep(0.82, 3.8, nearest.distanceRatio);
      const baseSpeed = SPEED_BY_KIND[nearest.segment.kind];
      const speed = 0.065 + (baseSpeed - 0.065) * channelWeight;
      field[offset] = 255;
      field[offset + 1] = Math.round(128 + nearest.flow[0] * speed * 127);
      field[offset + 2] = Math.round(128 + nearest.flow[1] * speed * 127);
      field[offset + 3] = 1;
      const observedAeration = Math.max(
        foamStrength(red, green, blue, alpha),
        registeredEffects.field[pixel] / 255,
      );
      const channelWhitewater = nearest.segment.kind === "turbulence"
        ? 0.025 + observedAeration * 0.46
        : 0.012 + observedAeration * 0.24;
      const poolWhitewater = 0.006 + observedAeration * 0.18;
      auxiliaryField[offset] = Math.round(clamp(
        poolWhitewater + (channelWhitewater - poolWhitewater) * channelWeight,
      ) * 255);
      ownerPriority[pixel] = nearest.segment.priority;
      corridorCompletionPixels += 1;
    }
  }

  const velocitySmoothingIterations = smoothRegisteredVelocityField(
    field,
    velocitySeed,
    fieldWidth,
    fieldHeight,
  );

  deriveVisualDepthField(field, fieldWidth, fieldHeight, scaleX);
  applyHydraulicEventFields(
    field,
    auxiliaryField,
    fieldWidth,
    fieldHeight,
    scaleX,
  );

  let waterPixels = 0;
  let foamPixels = 0;
  let mistPixels = 0;
  let directionalPixels = 0;
  for (let pixel = 0; pixel < fieldWidth * fieldHeight; pixel += 1) {
    const offset = pixel * 4;
    if (field[offset] === 0) continue;
    waterPixels += 1;
    if (auxiliaryField[offset] >= 32) foamPixels += 1;
    if (auxiliaryField[offset + 2] >= 12) mistPixels += 1;
    const flowX = (field[offset + 1] - 128) / 127;
    const flowY = (field[offset + 2] - 128) / 127;
    if (Math.hypot(flowX, flowY) > 0.1) directionalPixels += 1;
    const fieldX = pixel % fieldWidth;
    const fieldY = Math.floor(pixel / fieldWidth);
    const cell = fieldY >= fieldHeight / 2
      ? fieldX < fieldWidth / 2 ? "B2" : "C2"
      : fieldX >= fieldWidth / 2 ? "C1" : null;
    if (cell) cellPixels[cell] += 1;
  }

  // Attribute final pixels to their exact style/segment corridor for audit.
  for (const segment of HYDROLOGY_SEGMENTS) {
    const [left, top, right, bottom] = shapeBounds(segment.shape);
    for (let fieldY = Math.floor(top * scaleY); fieldY < Math.ceil(bottom * scaleY); fieldY += 1) {
      if (fieldY < 0 || fieldY >= fieldHeight) continue;
      for (let fieldX = Math.floor(left * scaleX); fieldX < Math.ceil(right * scaleX); fieldX += 1) {
        if (fieldX < 0 || fieldX >= fieldWidth) continue;
        const pixel = fieldY * fieldWidth + fieldX;
        const artboardX = (fieldX + 0.5) / scaleX;
        const artboardY = (fieldY + 0.5) / scaleY;
        if (
          ownerPriority[pixel] === segment.priority
          && segmentSample(segment, artboardX, artboardY)
        ) {
          segmentPixels[segment.id] += 1;
          const styleName = styleNameByCode.get(segment.styleCode);
          if (styleName) stylePixels[styleName] += 1;
        }
      }
    }
  }

  if (waterPixels < 18_000 || directionalPixels < 7_500) {
    throw new Error(
      `Registered hydrology field is unexpectedly sparse (${waterPixels} water, `
        + `${directionalPixels} directional).`,
    );
  }
  if (Object.values(cellPixels).some((count) => count < 500)) {
    throw new Error(`Registered hydrology does not cover every target cell: ${JSON.stringify(cellPixels)}`);
  }
  const decodedBytes = fieldWidth * fieldHeight * 4;
  if (decodedBytes > HYDROLOGY_MAXIMUM_DECODED_BYTES) {
    throw new Error(`Hydrology field exceeds its decoded-byte ceiling (${decodedBytes}).`);
  }

  await mkdir(FIELD_DIRECTORY, { recursive: true });
  const [fallbackWidth, fallbackHeight] = HYDROLOGY_FALLBACK_FIELD_DIMENSIONS;
  const fallbackDecodedBytes = fallbackWidth * fallbackHeight * 4;
  const fallbackRaster = Buffer.alloc(fallbackDecodedBytes);
  const fallbackAuxiliaryRaster = Buffer.alloc(fallbackDecodedBytes);
  for (let y = 0; y < fallbackHeight; y += 1) {
    const sourceY = Math.min(
      fieldHeight - 1,
      Math.floor((y + 0.5) * fieldHeight / fallbackHeight),
    );
    for (let x = 0; x < fallbackWidth; x += 1) {
      const sourceX = Math.min(
        fieldWidth - 1,
        Math.floor((x + 0.5) * fieldWidth / fallbackWidth),
      );
      const sourceOffset = (sourceY * fieldWidth + sourceX) * 4;
      const fallbackOffset = (y * fallbackWidth + x) * 4;
      field.copy(fallbackRaster, fallbackOffset, sourceOffset, sourceOffset + 4);
      auxiliaryField.copy(
        fallbackAuxiliaryRaster,
        fallbackOffset,
        sourceOffset,
        sourceOffset + 4,
      );
    }
  }
  const fieldTiers = Object.freeze([
    await buildRegionalTierAssets({
      field,
      auxiliaryField,
      fieldDimensions: HYDROLOGY_FIELD_DIMENSIONS,
      tier: "detail",
    }),
    await buildRegionalTierAssets({
      field: fallbackRaster,
      auxiliaryField: fallbackAuxiliaryRaster,
      fieldDimensions: HYDROLOGY_FALLBACK_FIELD_DIMENSIONS,
      tier: "fallback",
    }),
  ]);
  const detailTier = fieldTiers.find(({ id }) => id === "detail");
  const fallbackTier = fieldTiers.find(({ id }) => id === "fallback");
  if (
    !detailTier
    || !fallbackTier
    || detailTier.occupiedPixels > waterPixels
    || detailTier.occupiedPixels / waterPixels < 0.99
    || detailTier.regions.length !== 3
    || fallbackTier.regions.length !== 3
    || detailTier.decodedBytes <= 0
    || fallbackTier.decodedBytes <= 0
    || maximumCohortDecodedBytes(fieldTiers, "detail") > HYDROLOGY_MAXIMUM_DECODED_BYTES
    || maximumCohortDecodedBytes(fieldTiers, "fallback") > HYDROLOGY_MAXIMUM_DECODED_BYTES
  ) {
    throw new Error(`Regional hydrology packing violated its lossless bounded-cohort policy: ${JSON.stringify({
      detailDecodedBytes: detailTier?.decodedBytes,
      detailOccupiedPixels: detailTier?.occupiedPixels,
      detailResources: detailTier?.regions?.length,
      detailMaximumCohort: detailTier
        ? maximumCohortDecodedBytes(fieldTiers, "detail")
        : null,
      fallbackDecodedBytes: fallbackTier?.decodedBytes,
      fallbackResources: fallbackTier?.regions?.length,
      fallbackMaximumCohort: fallbackTier
        ? maximumCohortDecodedBytes(fieldTiers, "fallback")
        : null,
      waterPixels,
    })}`);
  }
  const {
    hydrologyTransitionHandoffs,
    nativeApplicationOwnedUnion,
  } = await loadNativeUnionAdmission(fieldTiers);
  for (const { bytes, path: outputPath } of fieldTiers.flatMap(
    ({ outputs }) => outputs,
  )) {
    await writeFile(outputPath, bytes);
  }
  const activeSegments = HYDROLOGY_SEGMENTS.filter(({ id }) => segmentPixels[id] > 0);
  const activeSegmentPixels = Object.fromEntries(
    activeSegments.map(({ id }) => [id, segmentPixels[id]]),
  );
  const manifest = Object.freeze({
    schemaVersion: 4,
    id: "career-world/capitals/ninjaone/hydrology-native@r2",
    packingRevision: "regional-r4-field-driven",
    status: "regional-runtime-candidate-awaiting-authority-freeze",
    coordinateSpace: "ninjaone-environment-artboard-top-left",
    source: Object.freeze({
      authority: "registered-terrain-master",
      depthPolicy: "offline bank distance inside exact registered coverage; terrain gaps or slope changes never imply waterfalls",
      dimensions: nativeSources.sourceDimensions,
      effectsEvidence: Object.freeze({
        dimensions: HYDROLOGY_FIELD_DIMENSIONS,
        path: registeredEffects.sourcePath,
        role: "source-registered rapid and foam placement; never body topology",
        sha256: registeredEffects.sourceDigest,
      }),
      intentReferences,
      path: nativeSources.sourcePath,
      role: "accepted rendered topology used only to derive registered water and water-connected foam coverage",
      sha256: nativeSources.sourceDigest,
      waterfallPolicy: "only explicit source-proven cascade descriptors may emit falling-water or impact VFX",
    }),
    registration: Object.freeze({
      artboardDimensions: HYDROLOGY_ARTBOARD,
      gridCells: Object.freeze(["B2", "C1", "C2"]),
      maximumCloseCameraSpan: Object.freeze([0.075, 0.075]),
      maximumMountedRegions: HYDROLOGY_MAXIMUM_MOUNTED_REGIONS,
      worldOrigin: HYDROLOGY_WORLD_ORIGIN,
      worldSpan: HYDROLOGY_WORLD_SPAN,
    }),
    regionalFields: Object.freeze({
      channelEncoding: Object.freeze({
        layout: "primary and auxiliary equal-width RGBA planes packed side-by-side in each regional texture",
        primary: Object.freeze({
          a: "deterministic visual depth from offline bank-distance transform; zero on dry pixels",
          b: "signed velocity y with local magnitude encoded as 128 + value * 127",
          g: "signed velocity x with local magnitude encoded as 128 + value * 127",
          r: "time-invariant exact registered water coverage from water authority or water-connected foam",
        }),
        auxiliary: Object.freeze({
          a: "localized cascade stage support, including descriptor-bounded dry-cliff VFX",
          b: "localized impact mist potential, including descriptor-bounded drift over land",
          g: "terrain-registered obstacle bow, shoulder, and wake support",
          r: "localized whitewater potential, including descriptor-bounded falling sheet and impact spray",
        }),
      }),
      cohortPolicy: Object.freeze({
        atomic: true,
        maximumMountedRegions: HYDROLOGY_MAXIMUM_MOUNTED_REGIONS,
        mixedTierAllowed: false,
        sampling: "global-coordinate manual bilinear texelFetch with virtual-zero exterior",
        tierOrder: Object.freeze(["detail", "fallback"]),
      }),
      possibleCohorts: possibleRegionalCohorts(fieldTiers),
      regions: mergeRegionSelectionBounds(fieldTiers),
      tiers: Object.freeze(Object.fromEntries(fieldTiers.map((tier) => [
        tier.id,
        Object.freeze({
          decodedBytes: tier.decodedBytes,
          fullFieldDimensions: tier.fullFieldDimensions,
          maximumSteadyCohortDecodedBytes: maximumCohortDecodedBytes(
            fieldTiers,
            tier.id,
          ),
          occupiedPixels: tier.occupiedPixels,
          resources: tier.regions,
          scale: tier.scale,
        }),
      ]))),
    }),
    admission: Object.freeze({
      nativeApplicationOwnedUnion,
      sharedWaterTexturePool: SHARED_WATER_TEXTURE_LEDGER,
    }),
    styleCodes: STYLE,
    cascades: HYDROLOGY_CASCADES,
    obstacles: HYDROLOGY_OBSTACLES,
    masks: Object.freeze({
      auxiliaryVfx: "red, blue, and alpha may extend beyond primary coverage only inside authored crest, falling-sheet, impact-spray, or mist envelopes; green obstacle support remains water-clipped",
      water: "primary red channel greater than zero from water authority or water-connected foam; auxiliary support never expands body coverage",
    }),
    hydrologyTransitionHandoffs,
    metrics: Object.freeze({
      cellPixels: Object.freeze(cellPixels),
      corridorCompletionPixels,
      velocitySmoothingIterations,
      directionalPixels,
      foamPixels,
      mistPixels,
      segmentPixels: Object.freeze(activeSegmentPixels),
      stylePixels: Object.freeze(stylePixels),
      waterPixels,
    }),
    segments: Object.freeze(activeSegments.map(serializableSegment)),
  });
  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await buildNinjaOneEnvironmentHydrologyR2();
  console.log(JSON.stringify({
    regionalFields: Object.fromEntries(Object.entries(
      manifest.regionalFields.tiers,
    ).map(([tier, definition]) => [
      tier,
      definition.resources.map(({ path: resourcePath }) => resourcePath),
    ])),
    metrics: manifest.metrics,
    source: manifest.source.manifestPath,
  }, null, 2));
}
