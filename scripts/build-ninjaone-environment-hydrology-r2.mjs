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
    declaredFlowVector: Object.freeze([0.0624, 0.9981]),
    id: "c1-r1c2-waterfall-lip",
    kind: "waterfall-lip",
    priority: 75,
    shape: pathShape([[904, 334], [905, 350]], 12),
    styleCode: STYLE.lip,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C1"]),
    declaredFlowVector: Object.freeze([0.124, 0.9923]),
    id: "c1-r1c2-vertical-fall",
    kind: "waterfall",
    priority: 70,
    shape: pathShape([[905, 346], [910, 386]], 13),
    styleCode: STYLE.waterfall,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C1"]),
    declaredFlowVector: Object.freeze([0.8321, 0.5547]),
    id: "c1-r1c2-base-foam",
    kind: "impact",
    priority: 80,
    shape: pathShape([[908, 384], [930, 399]], 18),
    styleCode: STYLE.impact,
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
      [736, 777],
      [765, 790],
      [799, 801],
      [833, 809],
      [865, 810],
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
    declaredFlowVector: Object.freeze([0.1104, 0.9939]),
    id: "b2-tarn-outlet-lip",
    kind: "waterfall-lip",
    priority: 75,
    shape: pathShape([[650, 638], [652, 653]], 12),
    styleCode: STYLE.lip,
  }),
  Object.freeze({
    cellIds: Object.freeze(["B2"]),
    declaredFlowVector: Object.freeze([0.124, 0.9923]),
    id: "b2-tarn-vertical-fall",
    kind: "waterfall",
    priority: 70,
    shape: pathShape([[652, 650], [656, 684]], 11),
    styleCode: STYLE.waterfall,
  }),
  Object.freeze({
    cellIds: Object.freeze(["B2"]),
    declaredFlowVector: Object.freeze([0.7809, 0.6247]),
    id: "b2-tarn-base-foam",
    kind: "impact",
    priority: 80,
    shape: pathShape([[655, 683], [675, 699]], 17),
    styleCode: STYLE.impact,
  }),
  Object.freeze({
    cellIds: Object.freeze(["B2"]),
    declaredFlowVector: Object.freeze([0.7682, 0.6402]),
    id: "b2-r2c1-lower-pools",
    kind: "stream",
    priority: 35,
    shape: pathShape([[665, 696], [677, 712], [690, 733]], 18),
    styleCode: STYLE.stream,
  }),
  Object.freeze({
    cellIds: Object.freeze(["B2"]),
    declaredFlowVector: Object.freeze([0.8, 0.6]),
    id: "b2-r3c1-cascade-lip",
    kind: "waterfall-lip",
    priority: 75,
    shape: pathShape([[365, 900], [381, 912]], 11),
    styleCode: STYLE.lip,
  }),
  Object.freeze({
    cellIds: Object.freeze(["B2"]),
    declaredFlowVector: Object.freeze([0.8, 0.6]),
    id: "b2-r3c1-cascade-fall",
    kind: "waterfall",
    priority: 70,
    shape: pathShape([[380, 910], [406, 930], [430, 948]], 14),
    styleCode: STYLE.waterfall,
  }),
  Object.freeze({
    cellIds: Object.freeze(["B2"]),
    declaredFlowVector: Object.freeze([0.7962, 0.605]),
    id: "b2-r3c1-cascade-impact",
    kind: "impact",
    priority: 80,
    shape: pathShape([[426, 944], [449, 962]], 17),
    styleCode: STYLE.impact,
  }),
  Object.freeze({
    cellIds: Object.freeze(["B2"]),
    declaredFlowVector: Object.freeze([0.727, 0.6866]),
    id: "b2-r3c1-downstream",
    kind: "stream",
    priority: 35,
    shape: pathShape([[442, 958], [475, 985], [510, 1017], [540, 1050]], 17),
    styleCode: STYLE.stream,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C2"]),
    declaredFlowVector: Object.freeze([0.4472, 0.8944]),
    id: "c2-r2c2-waterfall-lip",
    kind: "waterfall-lip",
    priority: 75,
    shape: pathShape([[721, 747], [724, 755]], 10),
    styleCode: STYLE.lip,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C2"]),
    declaredFlowVector: Object.freeze([0.5547, 0.8321]),
    id: "c2-r2c2-vertical-fall",
    kind: "waterfall",
    priority: 70,
    shape: pathShape([[724, 753], [727, 770]], 12),
    styleCode: STYLE.waterfall,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C2"]),
    declaredFlowVector: Object.freeze([0.8321, 0.5547]),
    id: "c2-r2c2-base-foam",
    kind: "impact",
    priority: 80,
    shape: pathShape([[726, 768], [740, 780]], 17),
    styleCode: STYLE.impact,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C2"]),
    declaredFlowVector: Object.freeze([0.9231, 0.3846]),
    id: "c2-r2c2-lower-channel",
    kind: "stream",
    priority: 35,
    shape: pathShape([[736, 777], [765, 790], [799, 801], [832, 809]], 17),
    styleCode: STYLE.stream,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C2"]),
    declaredFlowVector: Object.freeze([0.8253, 0.5647]),
    id: "c2-r3c2-channel",
    kind: "stream",
    priority: 35,
    shape: pathShape([
      [864, 810],
      [900, 825],
      [940, 846],
      [980, 870],
      [1020, 895],
      [1078, 920],
    ], 16),
    styleCode: STYLE.stream,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C2"]),
    declaredFlowVector: Object.freeze([0.8423, 0.5391]),
    id: "c2-r3c2-turbulence",
    kind: "turbulence",
    priority: 45,
    shape: pathShape([[952, 852], [990, 876], [1030, 901]], 13),
    styleCode: STYLE.turbulence,
  }),
  Object.freeze({
    cellIds: Object.freeze(["C2"]),
    declaredFlowVector: Object.freeze([0.5683, 0.8228]),
    id: "c2-r3c3-channel",
    kind: "stream",
    priority: 35,
    shape: pathShape([
      [1080, 922],
      [1114, 950],
      [1140, 982],
      [1162, 1016],
      [1187, 1050],
      [1210, 1080],
    ], 17),
    styleCode: STYLE.stream,
  }),
]);

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / Math.max(edge1 - edge0, 1e-9));
  return t * t * (3 - 2 * t);
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

function foamStrength(red, green, blue, alpha) {
  if (alpha < 24) return 0;
  const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
  const coolNeutral = Math.min(
    smoothstep(-10, 8, blue - red),
    smoothstep(-14, 4, green - red),
  );
  return clamp(smoothstep(105, 210, luminance) * coolNeutral);
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
      if (field[(y * fieldWidth + x) * 4] === 0) continue;
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
  field,
  fieldDimensions,
  styleNameByCode,
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
    const stylePixels = {};
    let coveragePixels = 0;
    let directionalPixels = 0;
    let sumFlowX = 0;
    let sumFlowY = 0;
    for (let offset = 0; offset < crop.length; offset += 4) {
      if (crop[offset] === 0) continue;
      coveragePixels += 1;
      occupiedPixels += 1;
      const styleName = styleNameByCode.get(crop[offset + 3]);
      if (!styleName) {
        throw new Error(`${tier}/${region.id} has unknown style ${crop[offset + 3]}.`);
      }
      stylePixels[styleName] = (stylePixels[styleName] ?? 0) + 1;
      const flowX = (crop[offset + 1] - 128) / 127;
      const flowY = (crop[offset + 2] - 128) / 127;
      const flowLength = Math.hypot(flowX, flowY);
      if (flowLength <= 0.1) continue;
      directionalPixels += 1;
      sumFlowX += flowX / flowLength;
      sumFlowY += flowY / flowLength;
    }
    const meanFlowLength = Math.hypot(sumFlowX, sumFlowY);
    const resourceId = `ninjaone-hydrology-${region.id.toLowerCase()}-${tier}-r3`;
    const resourcePath = path.join(FIELD_DIRECTORY, `${resourceId}.png`);
    const resourceBytes = await sharp(crop, {
      raw: { width: dimensions[0], height: dimensions[1], channels: 4 },
    }).png({ compressionLevel: 9, palette: false }).toBuffer();
    const resourceDigest = sha256(resourceBytes);
    const artboardBounds = Object.freeze(sourceBounds.map((value) => value / scale));
    regions.push(Object.freeze({
      artboardBounds,
      decodedBytes: crop.length,
      dimensions,
      id: resourceId,
      metrics: Object.freeze({
        coveragePixels,
        directionalPixels,
        meanFlowVector: Object.freeze([
          sumFlowX / meanFlowLength,
          sumFlowY / meanFlowLength,
        ]),
        rawRgbaSha256: sha256(crop),
        stylePixels: Object.freeze(stylePixels),
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
    maskPolicy: "accepted registered-master water and foam pixels inside declared topology corridor",
    priority: segment.priority,
    ...(segment.rippleCenter ? { rippleCenter: segment.rippleCenter } : {}),
    shape: segment.shape,
    styleCode: segment.styleCode,
  });
}

export async function buildNinjaOneEnvironmentHydrologyR2() {
  const [fieldWidth, fieldHeight] = HYDROLOGY_FIELD_DIMENSIONS;
  const nativeSources = await loadNativeSourceField(fieldWidth, fieldHeight);
  const sourceField = nativeSources.field;

  const field = Buffer.alloc(fieldWidth * fieldHeight * 4);
  const ownerPriority = new Uint8Array(fieldWidth * fieldHeight);
  const segmentPixels = Object.fromEntries(HYDROLOGY_SEGMENTS.map(({ id }) => [id, 0]));
  const stylePixels = Object.fromEntries(Object.keys(STYLE).map((key) => [key, 0]));
  const styleNameByCode = new Map(Object.entries(STYLE).map(([name, code]) => [code, name]));
  const cellPixels = { B2: 0, C1: 0, C2: 0 };
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
        let sourceStrength = waterStrength(red, green, blue, alpha);
        if (segment.kind !== "tarn") {
          const foam = foamStrength(red, green, blue, alpha);
          const core = sampledShape.normalizedDistance === undefined
            ? 1
            : smoothstep(0.62, 0.18, sampledShape.normalizedDistance);
          sourceStrength = Math.max(sourceStrength, foam * core);
        }
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
        field[offset + 1] = Math.round(128 + normalizedFlow[0] * 127);
        field[offset + 2] = Math.round(128 + normalizedFlow[1] * 127);
        field[offset + 3] = segment.styleCode;
        ownerPriority[pixel] = segment.priority;
      }
    }
  }

  let waterPixels = 0;
  let foamPixels = 0;
  let mistPixels = 0;
  let directionalPixels = 0;
  for (let pixel = 0; pixel < fieldWidth * fieldHeight; pixel += 1) {
    const offset = pixel * 4;
    if (field[offset] === 0) continue;
    waterPixels += 1;
    const styleCode = field[offset + 3];
    const styleName = styleNameByCode.get(styleCode);
    if (styleName) stylePixels[styleName] += 1;
    if (styleCode >= STYLE.lip) foamPixels += 1;
    if (styleCode === STYLE.impact) mistPixels += 1;
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
        const offset = pixel * 4;
        if (field[offset + 3] !== segment.styleCode) continue;
        const artboardX = (fieldX + 0.5) / scaleX;
        const artboardY = (fieldY + 0.5) / scaleY;
        if (segmentSample(segment, artboardX, artboardY)) segmentPixels[segment.id] += 1;
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
    }
  }
  const fieldTiers = Object.freeze([
    await buildRegionalTierAssets({
      field,
      fieldDimensions: HYDROLOGY_FIELD_DIMENSIONS,
      styleNameByCode,
      tier: "detail",
    }),
    await buildRegionalTierAssets({
      field: fallbackRaster,
      fieldDimensions: HYDROLOGY_FALLBACK_FIELD_DIMENSIONS,
      styleNameByCode,
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
    schemaVersion: 3,
    id: "career-world/capitals/ninjaone/hydrology-native@r2",
    packingRevision: "regional-r3",
    status: "regional-runtime-candidate-awaiting-authority-freeze",
    coordinateSpace: "ninjaone-environment-artboard-top-left",
    source: Object.freeze({
      authority: "registered-terrain-master",
      dimensions: nativeSources.sourceDimensions,
      path: nativeSources.sourcePath,
      role: "accepted rendered topology used only to derive registered water and foam coverage",
      sha256: nativeSources.sourceDigest,
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
        r: "time-invariant registered water coverage",
        g: "signed unit downhill flow x encoded as 128 + value * 127",
        b: "signed unit downhill flow y encoded as 128 + value * 127",
        a: "hydrology style code",
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
    masks: Object.freeze({
      foam: "water coverage where style code is lip, waterfall, impact, or coast",
      mist: "water coverage where style code is impact; shader keeps opacity restrained",
      water: "field red channel greater than zero",
    }),
    hydrologyTransitionHandoffs,
    metrics: Object.freeze({
      cellPixels: Object.freeze(cellPixels),
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
