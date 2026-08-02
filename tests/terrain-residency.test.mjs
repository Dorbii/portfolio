import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  cameraPaddingForPixels,
  planTerrainResidency,
  planTerrainResidencyWithTierFallback,
  prefetchSourcesToPreempt,
} from "../features/career-world/layers/territory-landform/model/residency.ts";

const policy = Object.freeze({
  maximumLandLayerDecodedBytes: 100_000,
  maximumConcurrentLoads: 2,
  maximumResidentDecodedBytes: 12_000,
  prefetchMarginPixels: 100,
  retentionMarginPixels: 200,
  retryBaseDelayMs: 1000,
  retryMaximumDelayMs: 30_000,
  requestTimeoutMs: 15_000,
});

function loadManifest(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function tile(id, origin, dimensions = [10, 10]) {
  return Object.freeze({
    id,
    sources: Object.freeze({
      capital: Object.freeze({
        decodedBytes: dimensions[0] * dimensions[1] * 4,
        dimensions,
        path: `/${id}-capital.webp`,
      }),
      site: Object.freeze({
        decodedBytes: dimensions[0] * dimensions[1] * 16,
        dimensions: dimensions.map((value) => value * 2),
        path: `/${id}-site.webp`,
      }),
    }),
    worldBounds: Object.freeze({
      origin,
      span: [0.1, 0.1],
    }),
  });
}

test("screen-space terrain margins convert independently on each axis", () => {
  assert.deepEqual(
    cameraPaddingForPixels(
      { origin: [0.2, 0.3], span: [0.4, 0.2] },
      [1000, 500],
      100,
    ),
    [0.04, 0.04],
  );
});

test("visible retries preempt enough active prefetch requests", () => {
  assert.deepEqual(
    prefetchSourcesToPreempt({
      activeSourceKeys: new Set(["prefetch-a", "prefetch-b"]),
      eligibleVisibleRequestCount: 2,
      maximumConcurrentLoads: 2,
      visibleSourceKeys: new Set(["visible-a", "visible-b"]),
    }),
    ["prefetch-a", "prefetch-b"],
  );
  assert.deepEqual(
    prefetchSourcesToPreempt({
      activeSourceKeys: new Set(["visible-a", "prefetch-a"]),
      eligibleVisibleRequestCount: 2,
      maximumConcurrentLoads: 2,
      visibleSourceKeys: new Set(["visible-a", "visible-b"]),
    }),
    ["prefetch-a"],
  );
  assert.deepEqual(
    prefetchSourcesToPreempt({
      activeSourceKeys: new Set(["prefetch-a"]),
      eligibleVisibleRequestCount: 1,
      maximumConcurrentLoads: 2,
      visibleSourceKeys: new Set(["visible-a"]),
    }),
    [],
  );
});

test("visible terrain is not admitted when its decoded size exceeds budget", () => {
  const tiles = [
    tile("visible-a", [0.2, 0.2], [100, 100]),
    tile("visible-b", [0.3, 0.2], [100, 100]),
    tile("prefetch", [0.4, 0.2], [100, 100]),
  ];
  const plan = planTerrainResidency({
    camera: { origin: [0.2, 0.2], span: [0.2, 0.1] },
    policy,
    requestedTiers: ["capital"],
    tiles,
    viewportPixels: [1000, 500],
  });

  assert.deepEqual(
    plan.visibleTiles.map((candidate) => candidate.id),
    ["visible-a", "visible-b"],
  );
  assert.deepEqual(
    plan.requestedTiles.map((candidate) => candidate.id),
    [],
  );
  assert.deepEqual(plan.retainedTiles, []);
  assert.equal(plan.estimatedResidentDecodedBytes, 0);
  assert.equal(plan.visibleOverBudget, true);
});

test("ordered tier candidates fall back to a plan that fits the hard budget", () => {
  const input = {
    camera: { origin: [0.2, 0.2], span: [0.1, 0.1] },
    policy: {
      ...policy,
      maximumResidentDecodedBytes: 800,
    },
    tiles: [tile("visible", [0.2, 0.2])],
    viewportPixels: [100, 100],
  };
  const admission = planTerrainResidencyWithTierFallback({
    ...input,
    requestedTierCandidates: [
      ["capital", "site"],
      ["capital"],
    ],
  });
  const { plan } = admission;

  assert.deepEqual(admission.requestedTiers, ["capital"]);
  assert.deepEqual(
    plan.requestedTiles.map((candidate) => candidate.id),
    ["visible"],
  );
  assert.equal(plan.estimatedResidentDecodedBytes, 400);
  assert.equal(plan.visibleOverBudget, false);
  assert.deepEqual(
    planTerrainResidencyWithTierFallback({
      ...input,
      policy: {
        ...input.policy,
        maximumResidentDecodedBytes: 200,
      },
      requestedTierCandidates: [
        ["capital", "site"],
        ["capital"],
      ],
    }),
    {
      plan: {
        estimatedResidentDecodedBytes: 0,
        requestedTiles: [],
        retainedTiles: [],
        visibleOverBudget: false,
        visibleTiles: [],
      },
      requestedTiers: [],
    },
  );
});

test("pinned outgoing sources survive reverse zoom and count once", () => {
  const visible = tile("visible", [0.2, 0.2]);
  const pinnedSourceKeys = new Set(["site:visible"]);
  const sharedInput = {
    camera: { origin: [0.2, 0.2], span: [0.1, 0.1] },
    pinnedSourceKeys,
    policy: {
      ...policy,
      maximumResidentDecodedBytes: 1600,
    },
    residentSourceKeys: pinnedSourceKeys,
    tiles: [visible],
    viewportPixels: [100, 100],
  };

  const replacementOnly = planTerrainResidencyWithTierFallback({
    ...sharedInput,
    requestedTierCandidates: [],
  });
  assert.equal(
    replacementOnly.plan.estimatedResidentDecodedBytes,
    1600,
  );
  assert.equal(replacementOnly.plan.visibleOverBudget, false);

  const stillVisible = planTerrainResidency({
    ...sharedInput,
    requestedTiers: ["site"],
  });
  assert.equal(
    stillVisible.estimatedResidentDecodedBytes,
    1600,
    "a pinned source requested by the new viewport must not be double counted",
  );
  assert.deepEqual(
    stillVisible.retainedTiles.map((candidate) => candidate.id),
    ["visible"],
  );
});

test("real 4K site view stages territory retirement within the land budget", () => {
  const streamManifest = loadManifest(
    "public/career-world/layers/territory-landform/"
      + "manifests/terrain-stream-tiles-r3.json",
  );
  const siteManifest = loadManifest(
    "public/career-world/layers/territory-landform/"
      + "manifests/terrain-site-tiles-r2.json",
  );
  const realTiles = [
    ...streamManifest.tiles,
    ...siteManifest.tiles.map((siteTile) => ({
      id: siteTile.id,
      sources: {
        site: {
          decodedBytes:
            siteTile.dimensions[0] * siteTile.dimensions[1] * 4,
          dimensions: siteTile.dimensions,
          path: siteTile.path,
        },
      },
      worldBounds: siteTile.worldBounds,
    })),
  ];
  const maximumLandLayerDecodedBytes =
    streamManifest.streaming.maximumLandLayerDecodedBytes;
  const canvasDecodedBytes = 3840 * 2160 * 4 * 4;
  const worldPlateDecodedBytes = 1672 * 941 * 4;
  const territoryPlateDecodedBytes = 6688 * 3764 * 4;
  const camera = {
    origin: [0.0832834938229665, 0.29952178633475],
    span: [0.15, 0.15],
  };
  const sharedInput = {
    camera,
    requestedTierCandidates: [
      ["capital", "site"],
      ["site"],
      ["capital"],
    ],
    residentSourceKeys: new Set(),
    tiles: realTiles,
    viewportPixels: [3840, 2160],
  };
  const withTerritory = planTerrainResidencyWithTierFallback({
    ...sharedInput,
    policy: {
      ...streamManifest.streaming,
      maximumResidentDecodedBytes:
        maximumLandLayerDecodedBytes
        - canvasDecodedBytes
        - worldPlateDecodedBytes
        - territoryPlateDecodedBytes,
    },
  });
  assert.notDeepEqual(
    withTerritory.requestedTiers,
    ["capital", "site"],
    "the combined tier must wait until the territory plate is retired",
  );
  assert.ok(
    withTerritory.plan.estimatedResidentDecodedBytes
      <= maximumLandLayerDecodedBytes
        - canvasDecodedBytes
        - worldPlateDecodedBytes
        - territoryPlateDecodedBytes,
  );

  const afterTerritoryRetirement = planTerrainResidencyWithTierFallback({
    ...sharedInput,
    policy: {
      ...streamManifest.streaming,
      maximumResidentDecodedBytes:
        maximumLandLayerDecodedBytes
        - canvasDecodedBytes
        - worldPlateDecodedBytes,
    },
  });
  assert.deepEqual(
    afterTerritoryRetirement.requestedTiers,
    ["capital", "site"],
  );
  assert.ok(
    canvasDecodedBytes
      + worldPlateDecodedBytes
      + afterTerritoryRetirement.plan.estimatedResidentDecodedBytes
      <= maximumLandLayerDecodedBytes,
  );
});

test("prefetch and retention only consume spare decoded-byte budget", () => {
  const tiles = [
    tile("visible", [0.2, 0.2]),
    tile("prefetch-near", [0.3, 0.2]),
    tile("prefetch-far", [0.4, 0.2]),
    tile("retention-only", [0.5, 0.2]),
  ];
  const roomyPolicy = {
    ...policy,
    maximumResidentDecodedBytes: 1200,
  };
  const input = {
    camera: { origin: [0.2, 0.2], span: [0.1, 0.1] },
    policy: roomyPolicy,
    requestedTiers: ["capital"],
    tiles,
    viewportPixels: [100, 100],
  };

  const first = planTerrainResidency(input);
  const second = planTerrainResidency(input);
  assert.deepEqual(
    first.requestedTiles.map((candidate) => candidate.id),
    ["visible", "prefetch-near"],
  );
  assert.deepEqual(
    first.retainedTiles.map((candidate) => candidate.id),
    ["visible", "prefetch-near", "prefetch-far"],
  );
  assert.deepEqual(second, first);
});

test("retention prefers already decoded tiles to cold placeholders", () => {
  const tiles = [
    tile("visible", [0.2, 0.2]),
    tile("cold-near", [0.4, 0.2]),
    tile("warm-far", [0.5, 0.2]),
  ];
  const plan = planTerrainResidency({
    camera: { origin: [0.2, 0.2], span: [0.1, 0.1] },
    policy: {
      ...policy,
      maximumResidentDecodedBytes: 800,
      prefetchMarginPixels: 0,
      retentionMarginPixels: 400,
    },
    requestedTiers: ["capital"],
    residentSourceKeys: new Set(["capital:warm-far"]),
    tiles,
    viewportPixels: [100, 100],
  });

  assert.deepEqual(
    plan.retainedTiles.map((candidate) => candidate.id),
    ["visible", "warm-far"],
  );
});

test("tiles with a single authored tier only consume that source", () => {
  const siteOnly = Object.freeze({
    id: "site-overlay",
    sources: Object.freeze({
      site: Object.freeze({
        decodedBytes: 400,
        dimensions: [10, 10],
        path: "/site-overlay.png",
      }),
    }),
    worldBounds: Object.freeze({
      origin: [0.2, 0.2],
      span: [0.1, 0.1],
    }),
  });
  const plan = planTerrainResidency({
    camera: { origin: [0.2, 0.2], span: [0.1, 0.1] },
    policy,
    requestedTiers: ["capital", "site"],
    tiles: [siteOnly],
    viewportPixels: [100, 100],
  });

  assert.equal(plan.estimatedResidentDecodedBytes, 400);
  assert.equal(plan.visibleOverBudget, false);
});
