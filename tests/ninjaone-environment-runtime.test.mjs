import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES,
  NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES,
  NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_TILES,
  NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_VOID_MASKS,
  NINJAONE_ENVIRONMENT_NATIVE_TILES,
  NINJAONE_ENVIRONMENT_NATIVE_VOID_MASKS,
} from "../features/career-world/layers/terrain/detail/model/ninjaOneEnvironmentNativeDetail.ts";
import {
  NINJAONE_ENVIRONMENT_FOLIAGE_DECODED_BYTES,
  NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES,
  NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_ENTER_SPAN,
  NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_RETAIN_SPAN,
  NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS,
  NINJAONE_ENVIRONMENT_FOLIAGE_RESOURCES,
  resolveNinjaOneEnvironmentFoliageEligibility,
  selectNinjaOneEnvironmentFoliageInstances,
} from "../features/career-world/layers/terrain/detail/model/ninjaOneEnvironmentFoliage.ts";
import {
  NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_RESOURCES,
  selectNinjaOneEnvironmentSeamIntegration,
} from "../features/career-world/development/model/ninjaOneEnvironmentSeamIntegration.ts";
import {
  advanceNinjaOneEnvironmentFoliageHiddenPaintBarrier,
  activateNinjaOneEnvironmentNativeDecodeCohort,
  admitNinjaOneEnvironmentNativeCandidates,
  createNinjaOneEnvironmentFoliageNodeLoadCohort,
  createNinjaOneEnvironmentNativeDecodeCohort,
  createNinjaOneEnvironmentRequiredPresentationCohort,
  ninjaOneEnvironmentRequiredPresentationKey,
  ninjaOneEnvironmentNativeTileKey,
  observeNinjaOneEnvironmentFoliageDomResidency,
  planNinjaOneEnvironmentNativeResidency,
  recordNinjaOneEnvironmentFoliageNodeLoadEvent,
  recordNinjaOneEnvironmentNativeDecodeEvent,
  recordNinjaOneEnvironmentRequiredPresentationEvent,
  NINJAONE_ENVIRONMENT_NATIVE_RELEASE_SPAN,
  resolveNinjaOneEnvironmentNativeDemand,
  resolveNinjaOneEnvironmentFoliageResidency,
  resolveNinjaOneEnvironmentOptionalGroupCapacity,
  resolveNinjaOneEnvironmentNativePresentation,
  resolveNinjaOneEnvironmentRequiredPresentation,
  retargetNinjaOneEnvironmentFoliageNodeLoadCohort,
  retargetNinjaOneEnvironmentNativeDecodeCohort,
  retargetNinjaOneEnvironmentRequiredPresentationCohort,
} from "../features/career-world/layers/terrain/detail/model/ninjaOneEnvironmentResidency.ts";
import {
  resolveDetailState,
} from "../features/career-world/shared/lod/policy.ts";
import {
  NINJAONE_MVP_FIXED_CAMERAS,
  NINJAONE_MVP_LIMITS,
  auditCameraDecodedBudgets,
  auditNativeSeamCoverage,
} from "../scripts/lib/ninjaone-environment-mvp-verification.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const FIXED_CAMERAS = Object.freeze({
  B2: Object.freeze({ origin: [0.1675, 0.23], span: [0.04, 0.04] }),
  C1: Object.freeze({
    origin: [0.2925, 1 / 12 - 0.02],
    span: [0.04, 0.04],
  }),
  C2: Object.freeze({ origin: [0.2925, 0.23], span: [0.04, 0.04] }),
});

function centeredCamera(center, span) {
  return Object.freeze({
    origin: Object.freeze([center[0] - span / 2, center[1] - span / 2]),
    span: Object.freeze([span, span]),
  });
}

function demandFor(camera, previousDemand = false, active = true) {
  const detailState = resolveDetailState(camera);
  return resolveNinjaOneEnvironmentNativeDemand({
    active,
    camera,
    previousDemand,
    shouldLoadCloseAssets: detailState.shouldLoadCloseAssets,
  });
}

function planFor(camera, demand = true) {
  return planNinjaOneEnvironmentNativeResidency({
    camera,
    demand,
    supplementalCandidates: [],
  });
}

function decodedTerrainKeys(plan) {
  return new Set(plan.terrainTiles.map(ninjaOneEnvironmentNativeTileKey));
}

test("world and territory keep native sources absent while the configured close preload admits detail", () => {
  const world = centeredCamera([0.5, 0.5], 1);
  const territory = centeredCamera([0.25, 0.2], 0.3);
  const siteBeforePreload = centeredCamera([0.3125, 0.25], 0.101);
  const sitePreload = centeredCamera([0.3125, 0.25], 0.1);
  const close = FIXED_CAMERAS.C2;

  for (const camera of [world, territory, siteBeforePreload]) {
    const demand = demandFor(camera);
    assert.equal(demand, false);
    assert.deepEqual(planFor(camera, demand).terrainTiles, []);
  }
  assert.equal(resolveDetailState(sitePreload).tier.id, "site");
  assert.equal(demandFor(sitePreload), true);
  assert.equal(resolveDetailState(close).tier.id, "close");
  assert.equal(demandFor(close), true);
});

test("close residency uses zoom hysteresis and survives rapid reverse zoom", () => {
  const center = [0.3125, 0.25];
  const close = centeredCamera(center, 0.04);
  const hysteresisBand = centeredCamera(center, NINJAONE_ENVIRONMENT_NATIVE_RELEASE_SPAN);
  const releasedSite = centeredCamera(
    center,
    NINJAONE_ENVIRONMENT_NATIVE_RELEASE_SPAN + 0.001,
  );

  const entered = demandFor(close);
  assert.equal(entered, true);
  assert.equal(demandFor(hysteresisBand, entered), true);
  const released = demandFor(releasedSite, entered);
  assert.equal(released, false);
  assert.equal(planFor(releasedSite, released).terrainTiles.length, 0);
  assert.equal(demandFor(close, released), true);
});

test("animated foliage enters through .12 and retains through .14", () => {
  const cameraAtSpan = (span) => centeredCamera([0.23, 0.11], span);
  const eligible = (span, previousEligible) => (
    resolveNinjaOneEnvironmentFoliageEligibility({
      active: true,
      camera: cameraAtSpan(span),
      previousEligible,
      shouldLoadCloseAssets: true,
      showFoliage: true,
    })
  );
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_ENTER_SPAN, 0.12);
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_RETAIN_SPAN, 0.14);
  assert.equal(eligible(0.04, false), true);
  assert.equal(eligible(0.12, false), true);
  assert.equal(eligible(0.13, false), false);
  assert.equal(eligible(0.13, true), true);
  assert.equal(eligible(0.14, true), true);
  assert.equal(eligible(0.141, true), false);
  assert.deepEqual(selectNinjaOneEnvironmentFoliageInstances(
    cameraAtSpan(0.141),
    true,
  ), []);
});

test("required seam nodes take priority before atomic two-node foliage groups", () => {
  const westFoliageCamera = { origin: [0.2125, 0.0875], span: [0.075, 0.075] };
  const groupCapacity = (requiredSupplementalNodes) => (
    resolveNinjaOneEnvironmentOptionalGroupCapacity({
      maximumGroups: 3,
      maximumSupplementalNodes: 6,
      nodesPerGroup: 2,
      requiredSupplementalNodes,
    })
  );
  assert.deepEqual(
    [0, 2, 3, 4, 5, 6].map(groupCapacity),
    [3, 2, 1, 1, 0, 0],
  );
  assert.equal(
    selectNinjaOneEnvironmentFoliageInstances(westFoliageCamera, true, 2).length,
    2,
  );
  assert.equal(
    selectNinjaOneEnvironmentFoliageInstances(westFoliageCamera, true, 1).length,
    1,
  );
  assert.deepEqual(
    selectNinjaOneEnvironmentFoliageInstances(westFoliageCamera, true, 0),
    [],
  );
});

test("foliage residency reports incoming until the exact epoch cohort is mounted", () => {
  const resourceIds = ["foliage-underlay", "foliage-canopy"];
  const selectedResources = resourceIds.map((id) => ({ decodedBytes: 512, id }));
  const input = {
    candidateDecodedBytes: 1_024,
    candidateNodeCount: 2,
    candidateResourceIds: resourceIds,
    expectedCohortKey: "foliage-A",
    expectedEpoch: 3,
  };
  const staleA = resolveNinjaOneEnvironmentFoliageResidency({
    ...input,
    observation: {
      cohortKey: "foliage-A",
      epoch: 1,
      mountedDecodedBytes: 1_024,
      mountedImageNodeCount: 2,
      mountedResourceIds: resourceIds,
      status: "ready",
    },
  });
  assert.equal(staleA.phase, "incoming");
  assert.equal(staleA.mounted, false);
  assert.deepEqual(staleA.resourceIds, resourceIds);

  const loading = resolveNinjaOneEnvironmentFoliageResidency({
    ...input,
    observation: {
      cohortKey: "foliage-A",
      epoch: 3,
      mountedDecodedBytes: 0,
      mountedImageNodeCount: 0,
      mountedResourceIds: [],
      status: "loading",
    },
  });
  assert.equal(loading.phase, "incoming");
  assert.equal(loading.decodedBytes, 1_024);

  const mounted = resolveNinjaOneEnvironmentFoliageResidency({
    ...input,
    observation: {
      cohortKey: "foliage-A",
      epoch: 3,
      mountedDecodedBytes: 1_024,
      mountedImageNodeCount: 2,
      mountedResourceIds: [...resourceIds].reverse(),
      status: "ready",
    },
  });
  assert.equal(mounted.phase, "mounted");
  assert.equal(mounted.mounted, true);

  for (const observation of [
    observeNinjaOneEnvironmentFoliageDomResidency({
      cohortKey: "foliage-A",
      epoch: 3,
      mountedResourceIds: [resourceIds[0]],
      selectedResources,
      status: "ready",
    }),
    observeNinjaOneEnvironmentFoliageDomResidency({
      cohortKey: "foliage-A",
      epoch: 3,
      mountedResourceIds: [...resourceIds, resourceIds[1]],
      selectedResources,
      status: "ready",
    }),
    observeNinjaOneEnvironmentFoliageDomResidency({
      cohortKey: "foliage-A",
      epoch: 3,
      mountedResourceIds: [resourceIds[0], "wrong-foliage-node"],
      selectedResources,
      status: "ready",
    }),
  ]) {
    const domMismatch = resolveNinjaOneEnvironmentFoliageResidency({
      ...input,
      observation,
    });
    assert.equal(domMismatch.phase, "incoming");
    assert.equal(domMismatch.mounted, false);
  }

  const failed = resolveNinjaOneEnvironmentFoliageResidency({
    ...input,
    observation: {
      cohortKey: "foliage-A",
      epoch: 3,
      mountedDecodedBytes: 0,
      mountedImageNodeCount: 0,
      mountedResourceIds: [],
      status: "error",
    },
  });
  assert.equal(failed.phase, "error");
  assert.equal(failed.decodedBytes, 0);
  assert.deepEqual(failed.resourceIds, []);

  const released = resolveNinjaOneEnvironmentFoliageResidency({
    ...input,
    candidateDecodedBytes: 0,
    candidateNodeCount: 0,
    candidateResourceIds: [],
    observation: {
      cohortKey: "foliage-A",
      epoch: 3,
      mountedDecodedBytes: 1_024,
      mountedImageNodeCount: 2,
      mountedResourceIds: resourceIds,
      status: "ready",
    },
  });
  assert.equal(released.phase, "idle");
  assert.deepEqual(released.resourceIds, []);

  const keys = ["underlay\t/a.png#sha256=A", "canopy\t/b.png#sha256=B"];
  let nodeCohort = retargetNinjaOneEnvironmentFoliageNodeLoadCohort(
    createNinjaOneEnvironmentFoliageNodeLoadCohort(),
    "foliage-A",
  );
  const epochA = nodeCohort.epoch;
  nodeCohort = recordNinjaOneEnvironmentFoliageNodeLoadEvent({
    cohort: nodeCohort,
    epoch: epochA,
    event: "load",
    key: "foliage-A",
    resourceKey: keys[0],
    resourceKeys: keys,
  });
  nodeCohort = retargetNinjaOneEnvironmentFoliageNodeLoadCohort(
    nodeCohort,
    "foliage-B",
  );
  nodeCohort = retargetNinjaOneEnvironmentFoliageNodeLoadCohort(
    nodeCohort,
    "foliage-C",
  );
  const cohortC = nodeCohort;
  assert.equal(recordNinjaOneEnvironmentFoliageNodeLoadEvent({
    cohort: nodeCohort,
    epoch: epochA,
    event: "load",
    key: "foliage-A",
    resourceKey: keys[1],
    resourceKeys: keys,
  }), cohortC, "delayed A decode must not enter C");
  for (const resourceKey of keys) {
    nodeCohort = recordNinjaOneEnvironmentFoliageNodeLoadEvent({
      cohort: nodeCohort,
      epoch: nodeCohort.epoch,
      event: "load",
      key: "foliage-C",
      resourceKey,
      resourceKeys: keys,
    });
  }
  nodeCohort = advanceNinjaOneEnvironmentFoliageHiddenPaintBarrier({
    cohort: nodeCohort,
    resourceKeys: keys,
  });
  assert.equal(nodeCohort.status, "loading");
  nodeCohort = advanceNinjaOneEnvironmentFoliageHiddenPaintBarrier({
    cohort: nodeCohort,
    resourceKeys: keys,
  });
  assert.equal(nodeCohort.status, "ready");
  nodeCohort = retargetNinjaOneEnvironmentFoliageNodeLoadCohort(
    nodeCohort,
    "foliage-A",
  );
  assert.ok(nodeCohort.epoch > epochA, "A-B-C-A must allocate a fresh epoch");
  assert.equal(nodeCohort.loadedKeys.length, 0);
  nodeCohort = recordNinjaOneEnvironmentFoliageNodeLoadEvent({
    cohort: nodeCohort,
    epoch: nodeCohort.epoch,
    event: "error",
    key: "foliage-A",
    resourceKey: keys[0],
    resourceKeys: keys,
  });
  assert.equal(nodeCohort.status, "error");
  nodeCohort = retargetNinjaOneEnvironmentFoliageNodeLoadCohort(nodeCohort, "");
  assert.equal(nodeCohort.status, "idle");
  assert.equal(nodeCohort.loadedKeys.length, 0);
});

test("fixed B2 C1 C2 cameras select complete deterministic four-tile cohorts", () => {
  const expected = {
    B2: ["r2-c0", "r2-c1", "r3-c0", "r3-c1"],
    C1: ["r0-c2", "r0-c3", "r1-c2", "r1-c3"],
    C2: ["r2-c2", "r2-c3", "r3-c2", "r3-c3"],
  };
  for (const [id, camera] of Object.entries(FIXED_CAMERAS)) {
    const plan = planFor(camera);
    assert.equal(plan.admitted, true);
    assert.equal(plan.fullyCovered, true);
    assert.deepEqual(
      plan.terrainTiles.map(({ id: tileId }) => tileId).sort(),
      expected[id],
    );
  }
});

test("fixed B2 and C2 select only their two native seam integrations", () => {
  assert.deepEqual(
    selectNinjaOneEnvironmentSeamIntegration(FIXED_CAMERAS.B2).map(({ id }) => id),
    ["b2-internal-vertical-seam", "b2-internal-horizontal-seam"],
  );
  assert.deepEqual(selectNinjaOneEnvironmentSeamIntegration(FIXED_CAMERAS.C1), []);
  assert.deepEqual(
    selectNinjaOneEnvironmentSeamIntegration(FIXED_CAMERAS.C2).map(({ id }) => id),
    ["c2-internal-vertical-seam", "c2-internal-horizontal-seam"],
  );
});

test("seam coverage audits every native adjacency, not only center checkpoints", () => {
  const tiles = NINJAONE_ENVIRONMENT_NATIVE_TILES.filter(({ id }) => (
    id === "r2-c1" || id === "r2-c2"
  ));
  const seamMetrics = [{
    discontinuityRatio: 3.367,
    first: "r2-c1",
    orientation: "vertical",
    pass: false,
    second: "r2-c2",
  }];
  const missing = auditNativeSeamCoverage({
    manifests: [{ resources: [] }],
    nativeManifest: { tiles },
    seamMetrics,
  });
  assert.equal(missing.pass, false);
  assert.equal(missing.defects.length, 1);
  assert.deepEqual(missing.defects[0].segment, [540, 810]);

  const repaired = auditNativeSeamCoverage({
    manifests: [{
      resources: [{
        artboardBounds: { origin: [712, 540], span: [16, 270] },
        id: "b2-c2-r2-boundary",
        orientation: "vertical",
        seamCoordinate: 2_880,
      }],
    }],
    nativeManifest: { tiles },
    seamMetrics,
  });
  assert.equal(repaired.pass, true);
  assert.deepEqual(repaired.defects[0].repairResourceIds, ["b2-c2-r2-boundary"]);
});

test("native terrain uses only 1448x1086 originals and baked masks consume no runtime nodes", () => {
  assert.equal(NINJAONE_ENVIRONMENT_NATIVE_TILES.length, 12);
  assert.equal(NINJAONE_ENVIRONMENT_NATIVE_VOID_MASKS.length, 4);
  assert.equal(NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_VOID_MASKS, 0);
  for (const tile of NINJAONE_ENVIRONMENT_NATIVE_TILES) {
    assert.deepEqual(tile.dimensions, [1448, 1086]);
    assert.deepEqual(tile.sourceDimensions, [1448, 1086]);
    assert.deepEqual(tile.sourceCrop, [0, 0, 1448, 1086]);
    assert.equal(tile.decodedBytes, 6_290_112);
    assert.match(tile.sourcePath, /detail-tiles-r2\/generated\/r\d-c\d-generated-r2\.png$/);
    assert.doesNotMatch(tile.sourcePath, /master-detail|runtime-close-quilt/);
  }
  for (const mask of NINJAONE_ENVIRONMENT_NATIVE_VOID_MASKS) {
    assert.equal(mask.runtimeMounted, false);
    assert.equal(mask.runtimeDecodedBytes, 0);
  }
});

test("close detail has one r5 foliage pool and no legacy shared-foliage mapping", async () => {
  const [proofSource, nativeDetailSource, worldSceneSource] = await Promise.all([
    readFile(path.join(
      root,
      "features/career-world/layers/terrain/components/NinjaOneEnvironmentProof.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/terrain/detail/components/NinjaOneEnvironmentNativeDetail.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/composition/WorldScene.tsx",
    ), "utf8"),
  ]);
  assert.doesNotMatch(proofSource, /NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES/);
  assert.doesNotMatch(proofSource, /function SharedFoliage|<SharedFoliage/);
  assert.doesNotMatch(proofSource, /selectNinjaOneEnvironmentFoliageInstances/);
  assert.match(nativeDetailSource, /resolveNinjaOneEnvironmentFoliageEligibility/);
  assert.match(nativeDetailSource, /maxDetailEligible=\{foliageEligible\}/);
  assert.match(
    nativeDetailSource,
    /maximumGroups=\{NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS\}/,
  );
  assert.match(nativeDetailSource, /active=\{active && siteOrCloser\}/);
  assert.match(nativeDetailSource, /data-environment-native-render-mode="additive-only"/);
  assert.match(nativeDetailSource, /data-environment-native-terrain-node-count="0"/);
  assert.match(nativeDetailSource, /data-environment-native-seam-node-count="0"/);
  assert.doesNotMatch(nativeDetailSource, /NinjaOneEnvironmentSeamIntegration/);
  assert.doesNotMatch(nativeDetailSource, /HydrologyAdmission|hydrologyAdmission/);
  assert.doesNotMatch(proofSource, /HydrologyAdmission|hydrologyAdmission/);
  assert.doesNotMatch(worldSceneSource, /HydrologyAdmission|hydrologyAdmission/);
  assert.equal(
    nativeDetailSource.match(/<NinjaOneEnvironmentFoliage\b/g)?.length,
    1,
  );
});

test("same-tier pan never presents a stale cohort and waits for late decode", () => {
  const b2Plan = planFor(FIXED_CAMERAS.B2);
  const b2Ready = resolveNinjaOneEnvironmentNativePresentation({
    decodedKeys: decodedTerrainKeys(b2Plan),
    lowerDetailAvailable: true,
    plan: b2Plan,
  });
  assert.equal(b2Ready.visible, true);

  const c1Plan = planFor(FIXED_CAMERAS.C1);
  const staleDecode = resolveNinjaOneEnvironmentNativePresentation({
    decodedKeys: decodedTerrainKeys(b2Plan),
    lowerDetailAvailable: true,
    plan: c1Plan,
  });
  assert.equal(staleDecode.visible, false);
  assert.deepEqual(staleDecode.presentedTerrainIds, []);
  assert.equal(staleDecode.lowerDetailRequired, true);
  assert.equal(staleDecode.noVisibleGap, true);

  const c1Keys = [...decodedTerrainKeys(c1Plan)];
  const partialDecode = resolveNinjaOneEnvironmentNativePresentation({
    decodedKeys: new Set(c1Keys.slice(0, -1)),
    lowerDetailAvailable: true,
    plan: c1Plan,
  });
  assert.equal(partialDecode.visible, false);
  assert.equal(partialDecode.noVisibleGap, true);

  const lateReady = resolveNinjaOneEnvironmentNativePresentation({
    decodedKeys: new Set(c1Keys),
    lowerDetailAvailable: true,
    plan: c1Plan,
  });
  assert.equal(lateReady.visible, true);
  assert.deepEqual(
    lateReady.presentedTerrainIds.slice().sort(),
    c1Plan.terrainTiles.map(({ id }) => id).sort(),
  );
});

test("decode cohort identity ignores same-set paint reordering", () => {
  const target = { decodedBytes: 200, resourceKeys: ["terrain:b", "terrain:a"] };
  let cohort = createNinjaOneEnvironmentNativeDecodeCohort(target);
  for (const resourceKey of target.resourceKeys) {
    cohort = recordNinjaOneEnvironmentNativeDecodeEvent(cohort, {
      epoch: cohort.epoch,
      resourceKey,
      status: "decoded",
      targetKey: cohort.targetKey,
    });
  }
  const reordered = retargetNinjaOneEnvironmentNativeDecodeCohort(cohort, {
    decodedBytes: 200,
    resourceKeys: ["terrain:a", "terrain:b"],
  });
  assert.equal(reordered, cohort);
  assert.deepEqual([...reordered.decodedKeys].sort(), ["terrain:a", "terrain:b"]);
});

test("partial-overlap pan evicts before epoch-remount and rejects stale loads", () => {
  const firstKeys = [
    "terrain:r2-c0", "terrain:r2-c1", "terrain:r3-c0", "terrain:r3-c1",
  ];
  const secondKeys = [
    "terrain:r2-c1", "terrain:r2-c2", "terrain:r3-c1", "terrain:r3-c2",
  ];
  let cohort = createNinjaOneEnvironmentNativeDecodeCohort({
    decodedBytes: 25_160_448,
    resourceKeys: firstKeys,
  });
  const firstEpoch = cohort.epoch;
  const firstTargetKey = cohort.targetKey;
  for (const resourceKey of firstKeys) {
    cohort = recordNinjaOneEnvironmentNativeDecodeEvent(cohort, {
      epoch: firstEpoch,
      resourceKey,
      status: "decoded",
      targetKey: firstTargetKey,
    });
  }
  cohort = retargetNinjaOneEnvironmentNativeDecodeCohort(cohort, {
    decodedBytes: 25_160_448,
    resourceKeys: secondKeys,
  });
  assert.equal(cohort.phase, "evicting");
  assert.equal(cohort.mountedDecodedBytes, 0);
  assert.equal(cohort.retiringDecodedBytes, 25_160_448);
  assert.equal(cohort.decodedKeys.size, 0);
  const secondEpoch = cohort.epoch;
  cohort = activateNinjaOneEnvironmentNativeDecodeCohort(cohort, secondEpoch);
  assert.equal(cohort.phase, "active");
  assert.equal(cohort.retiringDecodedBytes, 0);
  assert.equal(cohort.mountedDecodedBytes, 25_160_448);

  const stale = recordNinjaOneEnvironmentNativeDecodeEvent(cohort, {
    epoch: firstEpoch,
    resourceKey: "terrain:r2-c1",
    status: "decoded",
    targetKey: firstTargetKey,
  });
  assert.equal(stale, cohort);
  for (const resourceKey of secondKeys.filter((key) => !firstKeys.includes(key))) {
    cohort = recordNinjaOneEnvironmentNativeDecodeEvent(cohort, {
      epoch: secondEpoch,
      resourceKey,
      status: "decoded",
      targetKey: cohort.targetKey,
    });
  }
  assert.equal(cohort.decodedKeys.size, 2);
  assert.equal(cohort.decodedKeys.has("terrain:r2-c1"), false);
  assert.equal(cohort.decodedKeys.has("terrain:r3-c1"), false);
});

test("rapid A B A retarget requires the newest epoch load", () => {
  const a = { decodedBytes: 100, resourceKeys: ["terrain:a"] };
  const b = { decodedBytes: 100, resourceKeys: ["terrain:b"] };
  let cohort = createNinjaOneEnvironmentNativeDecodeCohort(a);
  const firstAEpoch = cohort.epoch;
  const firstATargetKey = cohort.targetKey;
  cohort = retargetNinjaOneEnvironmentNativeDecodeCohort(cohort, b);
  cohort = activateNinjaOneEnvironmentNativeDecodeCohort(cohort, cohort.epoch);
  cohort = retargetNinjaOneEnvironmentNativeDecodeCohort(cohort, a);
  cohort = activateNinjaOneEnvironmentNativeDecodeCohort(cohort, cohort.epoch);
  const secondAEpoch = cohort.epoch;
  assert.ok(secondAEpoch > firstAEpoch);
  assert.equal(recordNinjaOneEnvironmentNativeDecodeEvent(cohort, {
    epoch: firstAEpoch,
    resourceKey: "terrain:a",
    status: "decoded",
    targetKey: firstATargetKey,
  }), cohort);
  cohort = recordNinjaOneEnvironmentNativeDecodeEvent(cohort, {
    epoch: secondAEpoch,
    resourceKey: "terrain:a",
    status: "decoded",
    targetKey: cohort.targetKey,
  });
  assert.equal(cohort.decodedKeys.has("terrain:a"), true);
});

test("required seam and coast promotion is atomic across overlap and A B A", () => {
  const resource = (pathValue, hashCharacter) => ({
    path: pathValue,
    sha256: hashCharacter.repeat(64),
  });
  const seamKey = ninjaOneEnvironmentRequiredPresentationKey("seam", [
    resource("/seam/shared.png", "A"),
  ]);
  const coastAKey = ninjaOneEnvironmentRequiredPresentationKey("coast", [
    resource("/coast/a.png", "B"),
  ]);
  const coastBKey = ninjaOneEnvironmentRequiredPresentationKey("coast", [
    resource("/coast/b.png", "C"),
  ]);
  const targetA = {
    requiredKeys: [seamKey, coastAKey],
    terrainCohortKey: "terrain:a",
  };
  let cohort = createNinjaOneEnvironmentRequiredPresentationCohort(targetA);
  const firstAEpoch = cohort.epoch;
  const firstATargetKey = cohort.targetKey;
  const presentation = () => resolveNinjaOneEnvironmentRequiredPresentation({
    cohort,
    lowerDetailAvailable: true,
    terrainState: "ready",
  });
  assert.deepEqual(presentation(), {
    lowerDetailRequired: true,
    noVisibleGap: true,
    state: "loading",
    visible: false,
  });

  cohort = recordNinjaOneEnvironmentRequiredPresentationEvent(cohort, {
    epoch: cohort.epoch,
    requiredKey: seamKey,
    status: "ready",
    targetKey: cohort.targetKey,
  });
  assert.equal(presentation().visible, false);
  cohort = recordNinjaOneEnvironmentRequiredPresentationEvent(cohort, {
    epoch: cohort.epoch,
    requiredKey: coastAKey,
    status: "ready",
    targetKey: cohort.targetKey,
  });
  assert.equal(presentation().visible, true);
  cohort = recordNinjaOneEnvironmentRequiredPresentationEvent(cohort, {
    epoch: cohort.epoch,
    requiredKey: coastAKey,
    status: "loading",
    targetKey: cohort.targetKey,
  });
  assert.equal(presentation().visible, false);
  cohort = recordNinjaOneEnvironmentRequiredPresentationEvent(cohort, {
    epoch: cohort.epoch,
    requiredKey: coastAKey,
    status: "ready",
    targetKey: cohort.targetKey,
  });
  assert.equal(presentation().visible, true);

  cohort = retargetNinjaOneEnvironmentRequiredPresentationCohort(cohort, {
    requiredKeys: [coastBKey, seamKey],
    terrainCohortKey: "terrain:b",
  });
  assert.equal(cohort.readyKeys.has(seamKey), true);
  assert.equal(cohort.readyKeys.has(coastAKey), false);
  assert.equal(presentation().visible, false);
  assert.equal(recordNinjaOneEnvironmentRequiredPresentationEvent(cohort, {
    epoch: firstAEpoch,
    requiredKey: coastAKey,
    status: "ready",
    targetKey: firstATargetKey,
  }), cohort);
  cohort = recordNinjaOneEnvironmentRequiredPresentationEvent(cohort, {
    epoch: cohort.epoch,
    requiredKey: coastBKey,
    status: "ready",
    targetKey: cohort.targetKey,
  });
  assert.equal(presentation().visible, true);

  cohort = retargetNinjaOneEnvironmentRequiredPresentationCohort(cohort, targetA);
  assert.equal(cohort.readyKeys.has(seamKey), true);
  assert.equal(cohort.readyKeys.has(coastAKey), false);
  assert.equal(presentation().visible, false);
  cohort = recordNinjaOneEnvironmentRequiredPresentationEvent(cohort, {
    epoch: cohort.epoch,
    requiredKey: coastAKey,
    status: "error",
    targetKey: cohort.targetKey,
  });
  assert.equal(presentation().state, "error");
  assert.equal(presentation().visible, false);
  assert.equal(presentation().noVisibleGap, true);

  const changedSeamHash = ninjaOneEnvironmentRequiredPresentationKey("seam", [
    resource("/seam/shared.png", "D"),
  ]);
  cohort = retargetNinjaOneEnvironmentRequiredPresentationCohort(cohort, {
    requiredKeys: [changedSeamHash, coastAKey],
    terrainCohortKey: "terrain:a",
  });
  assert.equal(cohort.readyKeys.has(seamKey), false);
  assert.equal(cohort.readyKeys.has(changedSeamHash), false);
});

test("full required-supplement remount clears overlap readiness before promotion", () => {
  const identity = (resourcePath, hashCharacter) => ({
    path: resourcePath,
    sha256: hashCharacter.repeat(64),
  });
  const sharedSeamKey = ninjaOneEnvironmentRequiredPresentationKey("seam", [
    identity("/seam/shared.png", "A"),
  ]);
  const coastAKey = ninjaOneEnvironmentRequiredPresentationKey("coast", [
    identity("/coast/a.png", "B"),
  ]);
  const coastBKey = ninjaOneEnvironmentRequiredPresentationKey("coast", [
    identity("/coast/b.png", "C"),
  ]);
  const targetA = {
    requiredKeys: [sharedSeamKey, coastAKey],
    terrainCohortKey: "terrain:a",
  };
  const targetB = {
    requiredKeys: [sharedSeamKey, coastBKey],
    terrainCohortKey: "terrain:b",
  };
  let cohort = createNinjaOneEnvironmentRequiredPresentationCohort(targetA);
  for (const requiredKey of targetA.requiredKeys) {
    cohort = recordNinjaOneEnvironmentRequiredPresentationEvent(cohort, {
      epoch: cohort.epoch,
      requiredKey,
      status: "ready",
      targetKey: cohort.targetKey,
    });
  }
  assert.equal(resolveNinjaOneEnvironmentRequiredPresentation({
    cohort,
    lowerDetailAvailable: true,
    terrainState: "ready",
  }).visible, true);

  const oldEpoch = cohort.epoch;
  const oldTargetKey = cohort.targetKey;
  const overlapPreserving = retargetNinjaOneEnvironmentRequiredPresentationCohort(
    cohort,
    targetB,
  );
  assert.equal(overlapPreserving.readyKeys.has(sharedSeamKey), true);
  cohort = createNinjaOneEnvironmentRequiredPresentationCohort(
    targetB,
    overlapPreserving.epoch,
  );
  assert.equal(cohort.readyKeys.size, 0);
  assert.equal(resolveNinjaOneEnvironmentRequiredPresentation({
    cohort,
    lowerDetailAvailable: true,
    terrainState: "ready",
  }).visible, false);
  assert.equal(recordNinjaOneEnvironmentRequiredPresentationEvent(cohort, {
    epoch: oldEpoch,
    requiredKey: sharedSeamKey,
    status: "ready",
    targetKey: oldTargetKey,
  }), cohort);

  for (const requiredKey of targetB.requiredKeys) {
    cohort = recordNinjaOneEnvironmentRequiredPresentationEvent(cohort, {
      epoch: cohort.epoch,
      requiredKey,
      status: "ready",
      targetKey: cohort.targetKey,
    });
  }
  assert.equal(resolveNinjaOneEnvironmentRequiredPresentation({
    cohort,
    lowerDetailAvailable: true,
    terrainState: "ready",
  }).visible, true);
});

test("promotion cannot expose a six-tile preload view or create a visible gap", () => {
  // This view straddles three tile columns and two rows while still inside
  // the close preload threshold.
  const crossing = centeredCamera([0.21875, 0.25], 0.075);
  const plan = planFor(crossing);
  assert.ok(plan.visibleTerrainTileCount > NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_TILES);
  assert.equal(plan.terrainTiles.length, NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_TILES);
  assert.equal(plan.fullyCovered, false);
  const presentation = resolveNinjaOneEnvironmentNativePresentation({
    decodedKeys: decodedTerrainKeys(plan),
    lowerDetailAvailable: true,
    plan,
  });
  assert.equal(presentation.visible, false);
  assert.equal(presentation.lowerDetailRequired, true);
  assert.equal(presentation.noVisibleGap, true);
});

test("hard decoded-byte admission blocks terrain instead of weakening the ceiling", () => {
  const template = NINJAONE_ENVIRONMENT_NATIVE_TILES[0];
  const oversized = Object.freeze({
    ...template,
    dimensions: Object.freeze([4096, 4096]),
    id: "oversized-test-tile",
    path: "/oversized-test-tile.png",
  });
  const plan = admitNinjaOneEnvironmentNativeCandidates({
    demand: true,
    supplementalInstances: [],
    terrainTiles: [oversized],
  });
  assert.equal(plan.admitted, false);
  assert.equal(plan.decodedBytes, 0);
  assert.deepEqual(plan.terrainTiles, []);
});

test("terrain and supplemental residency stay under the 4 6 32 MiB ceilings", () => {
  for (const camera of Object.values(FIXED_CAMERAS)) {
    const plan = planFor(camera);
    assert.ok(plan.terrainTiles.length <= NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_TILES);
    assert.ok(plan.decodedBytes <= NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES);
  }

  const template = Object.freeze({
    animation: "canopy-sway",
    artboardBounds: Object.freeze({
      origin: Object.freeze([720, 540]),
      span: Object.freeze([32, 64]),
    }),
    id: "synthetic-supplement",
    phaseSeconds: 0,
    resource: Object.freeze({
      dimensions: Object.freeze([128, 256]),
      id: "synthetic-supplement-resource",
      opaquePixels: 1,
      path: "/synthetic/supplement.png",
    }),
    tileId: "r2-c2",
  });
  const syntheticSupplements = Array.from({ length: 8 }, (_, index) => Object.freeze({
    ...template,
    id: `supplement-${index}`,
  }));
  const admitted = admitNinjaOneEnvironmentNativeCandidates({
    demand: true,
    supplementalInstances: syntheticSupplements,
    terrainTiles: planFor(FIXED_CAMERAS.C2).terrainTiles,
  });
  assert.equal(
    admitted.supplementalInstances.length,
    NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES,
  );
  assert.ok(admitted.decodedBytes <= NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES);

  const activeFoliage = selectNinjaOneEnvironmentFoliageInstances({
    origin: [0.2125, 0.0875],
    span: [0.075, 0.075],
  });
  assert.ok(activeFoliage.length <= NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS);
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_RESOURCES.length, 1);
  assert.equal(
    NINJAONE_ENVIRONMENT_FOLIAGE_DECODED_BYTES,
    NINJAONE_ENVIRONMENT_FOLIAGE_RESOURCES.reduce(
      (total, resource) => total + resource.decodedBytes,
      0,
    ),
  );
  assert.ok(
    planFor(FIXED_CAMERAS.C2).decodedBytes
      + NINJAONE_ENVIRONMENT_FOLIAGE_DECODED_BYTES
      <= NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES,
  );
});

test("automated camera sweep counts foliage and seams in the 32 MiB union", () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(NINJAONE_MVP_FIXED_CAMERAS).map(
      ([id, camera]) => [id, { origin: camera.origin, span: camera.span }],
    )),
    FIXED_CAMERAS,
  );
  const audit = auditCameraDecodedBudgets({
    foliageInstances: NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES,
    foliageMaximumSpan: NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_RETAIN_SPAN,
    nativeManifest: { tiles: NINJAONE_ENVIRONMENT_NATIVE_TILES },
    seamInstances: NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_RESOURCES.map(
      (resource) => ({
        artboardBounds: resource.artboardBounds,
        id: `${resource.id}-instance`,
        resource,
      }),
    ),
  });
  assert.equal(audit.pass, true);
  assert.ok(audit.sampleCount > 14_058);
  assert.ok(audit.demandModeCounts["retained-only"] > 0);
  assert.ok(audit.demandModeCounts.released > 0);
  assert.equal(audit.maximumByDemandMode.released.nativeVisible, false);
  assert.equal(audit.maximumByDemandMode.released.decodedBytes, 0);
  assert.ok(audit.maximum.decodedBytes <= NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES);
  const c1 = audit.checkpoints.find(({ id }) => id === "checkpoint-C1");
  const c2 = audit.checkpoints.find(({ id }) => id === "checkpoint-C2");
  for (const checkpoint of [c1, c2]) {
    assert.ok(checkpoint);
    assert.ok(
      checkpoint.decodedBytes <= NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES,
    );
    assert.ok(
      checkpoint.nativeApplicationOwnedDecodedBytes
        <= NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES,
    );
    assert.ok(
      checkpoint.supplementalNodeCount
        <= NINJAONE_MVP_LIMITS.maximumSupplementalNodes,
    );
    assert.equal(
      checkpoint.resourceIds.length,
      new Set(checkpoint.resourceIds).size,
    );
  }
  assert.ok(
    audit.maximum.nativeApplicationOwnedDecodedBytes
      <= NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES,
  );
  assert.ok(
    audit.maximum.supplementalNodeCount
      <= NINJAONE_MVP_LIMITS.maximumSupplementalNodes,
  );
});

test("exhaustive budget admission drops whole foliage groups behind required seams", () => {
  const syntheticRequiredSeams = ["synthetic-fall-vertical", "synthetic-fall-horizontal"]
    .map((id, index) => ({
      artboardBounds: {
        origin: [1074 + index * 2, 804 + index * 2],
        span: [8, 8],
      },
      id: `${id}-instance`,
      resource: {
        decodedBytes: 4_096,
        dimensions: [32, 32],
        id,
        tonalTransition: { paintedNodeCount: 1 },
      },
    }));
  const syntheticC2Foliage = NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES
    .slice(0, 2)
    .map((instance, index) => ({
      ...instance,
      artboardBounds: {
        origin: [1072 + index * 4, 800 + index * 4],
        span: [48, 80],
      },
    }));
  const audit = auditCameraDecodedBudgets({
    foliageInstances: syntheticC2Foliage,
    foliageMaximumSpan: NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_RETAIN_SPAN,
    nativeManifest: { tiles: NINJAONE_ENVIRONMENT_NATIVE_TILES },
    seamInstances: syntheticRequiredSeams,
  });
  assert.equal(audit.pass, true);
  const c2 = audit.checkpoints.find(({ id }) => id === "checkpoint-C2");
  assert.equal(c2.requiredSupplementalNodeCount, 4);
  assert.equal(c2.foliageGroupCount, 2);
  assert.equal(c2.supplementalNodeCount, 8);
  assert.ok(c2.decodedBytes <= NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES);
  const syntheticFoliageResourceIds = new Set(
    syntheticC2Foliage.flatMap(({ resources }) => resources.map(({ id }) => id)),
  );
  assert.equal(
    c2.resourceIds.filter((id) => syntheticFoliageResourceIds.has(id)).length,
    1,
  );
});

test("package commands resolve to visible deterministic builders and verifier fails closed", async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const packageLock = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
  const gitignore = await readFile(path.join(root, ".gitignore"), "utf8");
  const expected = {
    "build:environment-native":
      "node scripts/build-ninjaone-environment-native-detail.mjs --static-only",
    "build:ninjaone-environment-foliage":
      "node scripts/build-ninjaone-environment-foliage-r4.mjs",
    "build:ninjaone-environment-seams":
      "node scripts/build-ninjaone-environment-seam-integration-r2.mjs",
    "capture:ninjaone-environment-mvp":
      "node scripts/capture-ninjaone-environment-mvp.mjs",
    "extract:ninjaone-foliage-isolation-crops":
      "node scripts/extract-ninjaone-foliage-isolation-crops.mjs",
    "verify:ninjaone-environment-mvp":
      "node scripts/verify-ninjaone-environment-mvp.mjs",
  };
  for (const [key, command] of Object.entries(expected)) {
    assert.equal(packageJson.scripts[key], command);
  }
  assert.equal(packageJson.scripts["build:environment-hydrology"], undefined);
  assert.equal(packageJson.devDependencies.sharp, "0.34.5");
  assert.equal(packageLock.packages[""].devDependencies.sharp, "0.34.5");
  assert.equal(packageLock.packages["node_modules/sharp"].version, "0.34.5");
  assert.doesNotMatch(gitignore, /build-ninjaone-coast-transition-native-r1/);
  const packageScriptTargets = Object.values(packageJson.scripts)
    .flatMap((command) => command.match(/(?:^|\s)(scripts\/[^\s]+)/g) ?? [])
    .map((match) => match.trim());
  for (const relativePath of packageScriptTargets) {
    const absolutePath = path.join(root, relativePath);
    assert.equal((await stat(absolutePath)).isFile(), true, `${relativePath} must exist`);
    const ignored = spawnSync(
      "git",
      ["check-ignore", "-q", "--", relativePath],
      { cwd: root },
    );
    assert.equal(ignored.status, 1, `${relativePath} must be visible to git`);
  }
  const sharpBackedTargets = [];
  for (const relativePath of packageScriptTargets) {
    const source = await readFile(path.join(root, relativePath), "utf8");
    if (/from ["']sharp["']/.test(source)) sharpBackedTargets.push(relativePath);
  }
  assert.ok(sharpBackedTargets.length > 0, "tracked generators must exercise direct sharp");

  const help = spawnSync(
    process.execPath,
    ["scripts/verify-ninjaone-environment-mvp.mjs", "--help"],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(help.status, 0);
  assert.doesNotMatch(help.stdout, /--captures|--hydrology-manifest/);

  const captureHelp = spawnSync(
    process.execPath,
    ["scripts/capture-ninjaone-environment-mvp.mjs", "--help"],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(captureHelp.status, 0);
  assert.match(captureHelp.stdout, /--viewport <width>x<height>/);

  const verifier = spawnSync(
    process.execPath,
    ["scripts/verify-ninjaone-environment-mvp.mjs"],
    { cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
  assert.equal(verifier.status, 1);
  const result = JSON.parse(verifier.stdout);
  assert.equal(result.pass, false);
  assert.ok(!result.failures.includes("runtime_capture_evidence_missing"));
  assert.ok(result.failures.includes(
    "coast.native_original_transition_evidence_missing",
  ));
  assert.equal(result.static.pass, false);
  assert.ok(result.failures.includes("coast.native_original_transition_evidence_missing"));
});
