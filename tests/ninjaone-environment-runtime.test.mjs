import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import {
  NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES,
  NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES,
  NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_TILES,
  NINJAONE_ENVIRONMENT_NATIVE_MAX_MOUNTED_VOID_MASKS,
  NINJAONE_ENVIRONMENT_NATIVE_TILES,
  NINJAONE_ENVIRONMENT_NATIVE_VOID_MASKS,
  selectNinjaOneEnvironmentNativeTiles,
} from "../features/career-world/development/model/ninjaOneEnvironmentNativeDetail.ts";
import {
  NINJAONE_ENVIRONMENT_FOLIAGE_DECODED_BYTES,
  NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES,
  NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_ENTER_SPAN,
  NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_RETAIN_SPAN,
  NINJAONE_ENVIRONMENT_FOLIAGE_RESOURCES,
  resolveNinjaOneEnvironmentFoliageEligibility,
  selectNinjaOneEnvironmentFoliageInstances,
} from "../features/career-world/development/model/ninjaOneEnvironmentFoliage.ts";
import foliageManifest from "../public/career-world/capitals/ninjaone/environment/manifests/foliage-native-r3.json" with { type: "json" };
import {
  NINJAONE_ENVIRONMENT_SEAM_INTEGRATION_RESOURCES,
  ninjaOneEnvironmentSeamSelectionKey,
  selectNinjaOneEnvironmentSeamIntegration,
} from "../features/career-world/development/model/ninjaOneEnvironmentSeamIntegration.ts";
import seamManifest from "../public/career-world/capitals/ninjaone/environment/manifests/seam-integration-native-r2.json" with { type: "json" };
import hydrologyManifest from "../public/career-world/capitals/ninjaone/environment/manifests/hydrology-native-r2.json" with { type: "json" };
import {
  advanceNinjaOneEnvironmentFoliageHiddenPaintBarrier,
  activateNinjaOneEnvironmentNativeDecodeCohort,
  admitNinjaOneEnvironmentNativeCandidates,
  createNinjaOneEnvironmentFoliageNodeLoadCohort,
  createNinjaOneEnvironmentNativeHydrologyAdmissionHandoff,
  createNinjaOneEnvironmentNativeHydrologyAdmissionSnapshot,
  createNinjaOneEnvironmentNativeDecodeCohort,
  createNinjaOneEnvironmentRequiredPresentationCohort,
  ninjaOneEnvironmentRequiredPresentationKey,
  ninjaOneEnvironmentNativeHydrologyAdmissionIsCurrent,
  ninjaOneEnvironmentNativeHydrologyCameraKey,
  ninjaOneEnvironmentNativeHydrologyResourceKey,
  ninjaOneEnvironmentNativeTileKey,
  observeNinjaOneEnvironmentFoliageDomResidency,
  planNinjaOneEnvironmentNativeResidency,
  recordNinjaOneEnvironmentFoliageNodeLoadEvent,
  recordNinjaOneEnvironmentNativeDecodeEvent,
  recordNinjaOneEnvironmentNativeHydrologyAdmissionHandoff,
  recordNinjaOneEnvironmentRequiredPresentationEvent,
  resolveNinjaOneEnvironmentNativeDemand,
  resolveNinjaOneEnvironmentFoliageResidency,
  resolveNinjaOneEnvironmentOptionalGroupCapacity,
  resolveNinjaOneEnvironmentNativePresentation,
  resolveNinjaOneEnvironmentRequiredPresentation,
  retargetNinjaOneEnvironmentFoliageNodeLoadCohort,
  retargetNinjaOneEnvironmentNativeDecodeCohort,
  retargetNinjaOneEnvironmentNativeHydrologyAdmissionHandoff,
  retargetNinjaOneEnvironmentRequiredPresentationCohort,
} from "../features/career-world/development/model/ninjaOneEnvironmentResidency.ts";
import {
  resolveDetailState,
} from "../features/career-world/shared/lod/policy.ts";
import {
  NINJAONE_MVP_FIXED_CAMERAS,
  NINJAONE_MVP_HYDROLOGY_BOUNDARY_ISOLATION,
  NINJAONE_MVP_HYDROLOGY_BOUNDARY_TRANSITION,
  NINJAONE_MVP_HYDROLOGY_MAXIMUM_CAMERA_SPAN,
  NINJAONE_MVP_HYDROLOGY_FEATURE_CAPTURES,
  NINJAONE_MVP_WATER_TEXTURE_LIMITS,
  auditHydrologyRuntimeBudget,
  auditNinjaOneEnvironmentHydrologyBoundaryAlphaFrame,
  auditNinjaOneEnvironmentHydrologyBoundaryTransition,
  auditNinjaOneEnvironmentRuntimeSample,
  auditCameraDecodedBudgets,
  auditNativeSeamCoverage,
  auditRuntimeCaptureEvidence,
  createNinjaOneEnvironmentCaptureBindings,
  createNinjaOneEnvironmentFoliageIsolationBindings,
  createNinjaOneEnvironmentMvpResourceCatalog,
  deriveNinjaOneHydrologyMotionContract,
  ninjaOneHydrologyShouldBeResident,
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

test("world and territory keep native sources absent while site preloads close detail", () => {
  const world = centeredCamera([0.5, 0.5], 1);
  const territory = centeredCamera([0.25, 0.2], 0.3);
  const siteBeforePreload = centeredCamera([0.3125, 0.25], 0.09);
  const sitePreload = centeredCamera([0.3125, 0.25], 0.06);
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
  const hysteresisBand = centeredCamera(center, 0.08);
  const releasedSite = centeredCamera(center, 0.09);

  const entered = demandFor(close);
  assert.equal(entered, true);
  assert.equal(demandFor(hysteresisBand, entered), true);
  const released = demandFor(releasedSite, entered);
  assert.equal(released, false);
  assert.equal(planFor(releasedSite, released).terrainTiles.length, 0);
  assert.equal(demandFor(close, released), true);
});

test("animated foliage uses independent max-detail hysteresis and exits before .074", () => {
  const cameraAtSpan = (span) => centeredCamera([0.3125, 0.25], span);
  const eligible = (span, previousEligible) => (
    resolveNinjaOneEnvironmentFoliageEligibility({
      active: true,
      camera: cameraAtSpan(span),
      previousEligible,
      shouldLoadCloseAssets: true,
      showFoliage: true,
    })
  );
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_ENTER_SPAN, 0.05);
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_RETAIN_SPAN, 0.06);
  assert.equal(eligible(0.04, false), true);
  assert.equal(eligible(0.05, false), true);
  assert.equal(eligible(0.055, false), false);
  assert.equal(eligible(0.055, true), true);
  assert.equal(eligible(0.06, true), true);
  assert.equal(eligible(0.061, true), false);
  assert.equal(eligible(0.074, true), false);
  assert.deepEqual(selectNinjaOneEnvironmentFoliageInstances(
    cameraAtSpan(0.074),
    true,
  ), []);
});

test("required seam nodes take priority before atomic two-node foliage groups", () => {
  const groupCapacity = (requiredSupplementalNodes) => (
    resolveNinjaOneEnvironmentOptionalGroupCapacity({
      maximumGroups: 2,
      maximumSupplementalNodes: 6,
      nodesPerGroup: 2,
      requiredSupplementalNodes,
    })
  );
  assert.deepEqual(
    [0, 2, 3, 4, 5, 6].map(groupCapacity),
    [2, 2, 1, 1, 0, 0],
  );
  assert.equal(
    selectNinjaOneEnvironmentFoliageInstances(FIXED_CAMERAS.C2, true, 2).length,
    2,
  );
  assert.equal(
    selectNinjaOneEnvironmentFoliageInstances(FIXED_CAMERAS.C2, true, 1).length,
    1,
  );
  assert.deepEqual(
    selectNinjaOneEnvironmentFoliageInstances(FIXED_CAMERAS.C2, true, 0),
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

test("close detail has one r3 foliage pool and no legacy shared-foliage mapping", async () => {
  const [proofSource, nativeDetailSource, worldSceneSource] = await Promise.all([
    readFile(path.join(
      root,
      "features/career-world/development/NinjaOneEnvironmentProof.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/development/NinjaOneEnvironmentNativeDetail.tsx",
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
  assert.match(
    nativeDetailSource,
    /onHydrologyAdmissionChange\?\.\(hydrologyAdmission\)/,
  );
  assert.match(
    proofSource,
    /onHydrologyAdmissionChange=\{onHydrologyAdmissionChange\}/,
  );
  assert.match(
    worldSceneSource,
    /nativeHydrologyAdmission=\{currentNativeHydrologyAdmission\}/,
  );
  assert.match(
    worldSceneSource,
    /onHydrologyAdmissionChange=\{handleNativeHydrologyAdmissionChange\}/,
  );
  assert.match(
    worldSceneSource,
    /handleNativeHydrologyAdmissionChange/,
  );
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

test("native hydrology admission is camera bound and reserves retiring incoming peak", () => {
  const admissionResource = ({
    bytes,
    hashCharacter,
    id,
    phase,
  }) => ({
    decodedBytes: bytes,
    id,
    nodeCount: 1,
    path: `/native/${id}.png`,
    phase,
    sha256: hashCharacter.repeat(64),
  });
  const camera = FIXED_CAMERAS.C2;
  const currentResources = [
    admissionResource({
      bytes: 6_290_112,
      hashCharacter: "A",
      id: "terrain-old",
      phase: "retiring",
    }),
  ];
  const targetResources = [
    admissionResource({
      bytes: 6_290_112,
      hashCharacter: "B",
      id: "terrain-new",
      phase: "incoming",
    }),
    admissionResource({
      bytes: 283_808,
      hashCharacter: "C",
      id: "required-seam",
      phase: "incoming",
    }),
  ];
  const snapshot = createNinjaOneEnvironmentNativeHydrologyAdmissionSnapshot({
    camera,
    demand: true,
    epoch: 7,
    optionalNodeCount: 0,
    presentationReady: false,
    registrationIntersects: true,
    requiredNodeCount: 2,
    resources: currentResources,
    targetResources,
  });
  assert.equal(snapshot.cameraKey, ninjaOneEnvironmentNativeHydrologyCameraKey(camera));
  assert.equal(snapshot.currentDecodedBytes, 6_290_112);
  assert.equal(snapshot.targetDecodedBytes, 6_573_920);
  assert.equal(snapshot.reservedDecodedBytes, 6_573_920);
  assert.equal(snapshot.currentNodeCount, 1);
  assert.equal(snapshot.targetNodeCount, 2);
  assert.equal(snapshot.reservedNodeCount, 2);
  assert.equal(ninjaOneEnvironmentNativeHydrologyAdmissionIsCurrent(
    snapshot,
    camera,
    7,
  ), true);
  assert.equal(ninjaOneEnvironmentNativeHydrologyAdmissionIsCurrent(
    snapshot,
    camera,
    8,
  ), false);
  assert.equal(ninjaOneEnvironmentNativeHydrologyAdmissionIsCurrent(
    snapshot,
    FIXED_CAMERAS.C1,
    0,
  ), false);
  assert.equal(ninjaOneEnvironmentNativeHydrologyAdmissionIsCurrent(
    null,
    camera,
    0,
  ), false);

  const changedHash = [{ ...targetResources[0], sha256: "D".repeat(64) }];
  assert.notEqual(
    ninjaOneEnvironmentNativeHydrologyResourceKey(targetResources),
    ninjaOneEnvironmentNativeHydrologyResourceKey(changedHash),
  );
  assert.throws(() => createNinjaOneEnvironmentNativeHydrologyAdmissionSnapshot({
    camera,
    demand: true,
    epoch: 8,
    optionalNodeCount: 0,
    presentationReady: true,
    registrationIntersects: true,
    requiredNodeCount: 2,
    resources: [currentResources[0], currentResources[0]],
    targetResources,
  }), /not unique/);
});

test("native hydrology handoff rejects stale A B A publications and phase labels match ownership", () => {
  const resource = ({ hashCharacter, id, phase }) => ({
    decodedBytes: 6_290_112,
    id,
    nodeCount: 1,
    path: `/native/${id}.png`,
    phase,
    sha256: hashCharacter.repeat(64),
  });
  const snapshot = ({ camera, epoch, id, phase = "mounted" }) => (
    createNinjaOneEnvironmentNativeHydrologyAdmissionSnapshot({
      camera,
      demand: true,
      epoch,
      optionalNodeCount: 0,
      presentationReady: true,
      registrationIntersects: true,
      requiredNodeCount: 1,
      resources: [resource({ hashCharacter: id, id, phase })],
      targetResources: [resource({
        hashCharacter: id,
        id,
        phase: "incoming",
      })],
    })
  );
  const a0 = snapshot({ camera: FIXED_CAMERAS.C2, epoch: 0, id: "A" });
  let handoff = createNinjaOneEnvironmentNativeHydrologyAdmissionHandoff(0);
  handoff = recordNinjaOneEnvironmentNativeHydrologyAdmissionHandoff(handoff, {
    camera: FIXED_CAMERAS.C2,
    cameraGeneration: 0,
    snapshot: a0,
  });
  assert.equal(handoff.snapshot, a0);
  assert.equal(handoff.snapshot.resources[0].phase, "mounted");
  assert.equal(handoff.snapshot.targetResources[0].phase, "incoming");

  handoff = retargetNinjaOneEnvironmentNativeHydrologyAdmissionHandoff(handoff, 1);
  assert.equal(handoff.snapshot, null);
  assert.equal(handoff.minimumEpoch, 1);
  const b1 = snapshot({ camera: FIXED_CAMERAS.C1, epoch: 1, id: "B" });
  handoff = recordNinjaOneEnvironmentNativeHydrologyAdmissionHandoff(handoff, {
    camera: FIXED_CAMERAS.C1,
    cameraGeneration: 1,
    snapshot: b1,
  });
  assert.equal(handoff.snapshot, b1);

  const afterStaleCleanup = recordNinjaOneEnvironmentNativeHydrologyAdmissionHandoff(
    handoff,
    {
      camera: FIXED_CAMERAS.C2,
      cameraGeneration: 0,
      snapshot: null,
    },
  );
  assert.equal(afterStaleCleanup, handoff);

  handoff = retargetNinjaOneEnvironmentNativeHydrologyAdmissionHandoff(handoff, 2);
  assert.equal(handoff.minimumEpoch, 2);
  handoff = recordNinjaOneEnvironmentNativeHydrologyAdmissionHandoff(handoff, {
    camera: FIXED_CAMERAS.C2,
    cameraGeneration: 2,
    snapshot: a0,
  });
  assert.equal(handoff.snapshot, null, "old A cannot remount after B");
  const a2 = snapshot({ camera: FIXED_CAMERAS.C2, epoch: 2, id: "A" });
  handoff = recordNinjaOneEnvironmentNativeHydrologyAdmissionHandoff(handoff, {
    camera: FIXED_CAMERAS.C2,
    cameraGeneration: 2,
    snapshot: a2,
  });
  assert.equal(handoff.snapshot, a2);
  assert.throws(
    () => retargetNinjaOneEnvironmentNativeHydrologyAdmissionHandoff(handoff, 1),
    /generation regressed/,
  );
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

  const c2Foliage = selectNinjaOneEnvironmentFoliageInstances(FIXED_CAMERAS.C2);
  assert.ok(c2Foliage.length <= NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES);
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_RESOURCES.length, 4);
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

test("automated camera sweep counts foliage seam and fallback field in the 32 MiB union", () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(NINJAONE_MVP_FIXED_CAMERAS).map(
      ([id, camera]) => [id, { origin: camera.origin, span: camera.span }],
    )),
    FIXED_CAMERAS,
  );
  const audit = auditCameraDecodedBudgets({
    foliageInstances: NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES,
    foliageMaximumSpan: NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_RETAIN_SPAN,
    hydrologyManifest,
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
  assert.equal(
    audit.maximumByDemandMode["retained-only"].hydrologySelectedTier,
    "none",
  );
  assert.equal(
    audit.maximumByDemandMode["retained-only"].hydrologySelectedDecodedBytes,
    0,
  );
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
        <= NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES,
    );
    assert.equal(
      checkpoint.resourceIds.length,
      new Set(checkpoint.resourceIds).size,
    );
    assert.ok(checkpoint.hydrologyResourceIds.length <= 2);
    assert.ok(new Set(["detail", "fallback", "none"]).has(
      checkpoint.hydrologySelectedTier,
    ));
  }
  assert.ok(
    audit.maximum.nativeApplicationOwnedDecodedBytes
      <= NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES,
  );
  assert.ok(
    audit.maximum.supplementalNodeCount
      <= NINJAONE_ENVIRONMENT_NATIVE_MAX_ANIMATED_NODES,
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
  const audit = auditCameraDecodedBudgets({
    foliageInstances: NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES,
    foliageMaximumSpan: NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_RETAIN_SPAN,
    hydrologyManifest,
    nativeManifest: { tiles: NINJAONE_ENVIRONMENT_NATIVE_TILES },
    seamInstances: syntheticRequiredSeams,
  });
  assert.equal(audit.pass, true);
  const c2 = audit.checkpoints.find(({ id }) => id === "checkpoint-C2");
  assert.equal(c2.requiredSupplementalNodeCount, 4);
  assert.equal(c2.foliageGroupCount, 1);
  assert.equal(c2.supplementalNodeCount, 6);
  assert.ok(c2.decodedBytes <= NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES);
  assert.equal(c2.resourceIds.filter((id) => id.includes("canopy-native")).length, 2);
});

test("runtime sample audit derives DOM and application-owned mounted unions", () => {
  const resourceCatalog = createNinjaOneEnvironmentMvpResourceCatalog({
    hydrologyManifest,
    nativeManifest: { tiles: NINJAONE_ENVIRONMENT_NATIVE_TILES },
    supplementalManifests: [foliageManifest, seamManifest],
  });
  const terrainIds = ["r2-c2", "r2-c3", "r3-c2", "r3-c3"];
  const selectedSeams = selectNinjaOneEnvironmentSeamIntegration(FIXED_CAMERAS.C2);
  const requiredSeamKey = ninjaOneEnvironmentRequiredPresentationKey(
    "seam",
    selectedSeams,
  );
  const supplementalIds = [
    ...NINJAONE_ENVIRONMENT_FOLIAGE_RESOURCES.map(({ id }) => id),
    ...selectedSeams.map(({ id }) => id),
  ].sort();
  const foliageResourceIds = NINJAONE_ENVIRONMENT_FOLIAGE_RESOURCES
    .map(({ id }) => id).sort();
  const foliageCohortKey = NINJAONE_ENVIRONMENT_FOLIAGE_RESOURCES.map(
    ({ id, path: resourcePath, sha256 }) => (
      `${id}\t${resourcePath}#sha256=${sha256}`
    ),
  ).sort().join("\n");
  const selectedSeamDecodedBytes = selectedSeams.reduce(
    (total, resource) => total + resource.decodedBytes,
    0,
  );
  const nativeApplicationOwnedDecodedBytes = 25_160_448
    + NINJAONE_ENVIRONMENT_FOLIAGE_DECODED_BYTES
    + selectedSeamDecodedBytes;
  const mountedResourceIds = [...terrainIds, ...supplementalIds];
  const mountedNodes = mountedResourceIds.map((resourceId, index) => ({
    kind: terrainIds.includes(resourceId) ? "terrain" : "supplemental",
    nodeId: `node-${index}`,
    resourceId,
  }));
  const nativeAndHydrologyTelemetry = ({
    camera,
    epoch,
    nativeResourceIds,
    presentationReady = true,
  }) => {
    const nativeResources = nativeResourceIds.map((id) => resourceCatalog[id]);
    const nativeDecodedBytes = nativeResources.reduce(
      (total, resource) => total + resource.decodedBytes,
      0,
    );
    const admissionResource = (resource, phase) => ({
      decodedBytes: resource.decodedBytes,
      id: resource.id,
      nodeCount: resource.paintedNodeCount,
      path: resource.path,
      phase,
      sha256: resource.sha256,
    });
    const regionIds = hydrologyManifest.regionalFields.regions.filter(({ worldBounds }) => (
      camera.origin[0] < worldBounds.origin[0] + worldBounds.span[0]
      && camera.origin[0] + camera.span[0] > worldBounds.origin[0]
      && camera.origin[1] < worldBounds.origin[1] + worldBounds.span[1]
      && camera.origin[1] + camera.span[1] > worldBounds.origin[1]
    )).map(({ id }) => id).sort();
    let tier = "none";
    let hydrologyResources = [];
    if (presentationReady && regionIds.length > 0) {
      for (const candidateTier of ["detail", "fallback"]) {
        const candidates = regionIds.map((regionId) => (
          hydrologyManifest.regionalFields.tiers[candidateTier].resources.find(
            (resource) => resource.regionId === regionId,
          )
        ));
        const candidateBytes = candidates.reduce(
          (total, resource) => total + resource.decodedBytes,
          0,
        );
        if (
          nativeDecodedBytes + candidateBytes
            <= NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES
        ) {
          tier = candidateTier;
          hydrologyResources = candidates;
          break;
        }
      }
    }
    const hydrologyBytes = hydrologyResources.reduce(
      (total, resource) => total + resource.decodedBytes,
      0,
    );
    const unionBytes = nativeDecodedBytes + hydrologyBytes;
    const waterActive = hydrologyResources.length > 0;
    return {
      nativeDecodedUnionBytes: unionBytes,
      nativeHydrologyAdmissionCurrentDecodedBytes: nativeDecodedBytes,
      nativeHydrologyAdmissionCurrentResources: nativeResources.map(
        (resource) => admissionResource(resource, "mounted"),
      ),
      nativeHydrologyAdmissionEpoch: epoch,
      nativeHydrologyAdmissionPresentationReady: presentationReady,
      nativeHydrologyAdmissionReservedDecodedBytes: nativeDecodedBytes,
      nativeHydrologyAdmissionTargetDecodedBytes: nativeDecodedBytes,
      nativeHydrologyAdmissionTargetResources: nativeResources.map(
        (resource) => admissionResource(resource, "incoming"),
      ),
      waterHydrologyAssetBytes: hydrologyBytes,
      waterHydrologyAssetConstraint: null,
      waterHydrologyAssetRegionIds: hydrologyResources.map(({ regionId }) => regionId),
      waterHydrologyAssetResourceIds: hydrologyResources.map(({ id }) => id),
      waterHydrologyAssetResourcePath: hydrologyResources.length === 1
        ? hydrologyResources[0].path
        : null,
      waterHydrologyAssetResourcePaths: hydrologyResources.map(({ path: value }) => value),
      waterHydrologyAssetState: waterActive
        ? tier === "detail" ? "ready" : "fallback"
        : "idle",
      waterHydrologyAssetTier: tier,
      waterHydrologyNativeAdmissionEpoch: waterActive ? epoch : -1,
      waterHydrologyNativeUnionCurrentBytes: waterActive ? unionBytes : 0,
      waterHydrologyNativeUnionPlannedBytes: waterActive ? unionBytes : 0,
      waterHydrologyNativeUnionReservedBytes: waterActive ? nativeDecodedBytes : 0,
      waterHydrologyNativeUnionTransitionPeakBytes: waterActive ? unionBytes : 0,
      waterHydrologyRequested: waterActive,
      waterHydrologyRequestedRegionIds: hydrologyResources.map(({ regionId }) => regionId),
      waterHydrologyRequestedResourceIds: hydrologyResources.map(({ id }) => id),
      waterHydrologyRequestedResourcePaths: hydrologyResources.map(({ path: value }) => value),
      waterHydrologyRequestedTier: tier,
      waterHydrologySamplerSlotCount: hydrologyResources.length,
      waterHydrologyTransitionOpacity: 1,
      waterHydrologyTransitionState: "stable",
      waterRenderState: "ready",
    };
  };
  const sample = {
    applicationOwnedDecodedBytes: nativeApplicationOwnedDecodedBytes,
    applicationOwnedResourceIds: mountedResourceIds,
    cohortEpoch: 4,
    cohortPhase: "active",
    foliageMountedDecodedBytes: NINJAONE_ENVIRONMENT_FOLIAGE_DECODED_BYTES,
    foliageMountedImageNodeCount: foliageResourceIds.length,
    foliageMountedResourceIds: foliageResourceIds,
    foliageResidencyCohortKey: foliageCohortKey,
    foliageResidencyEpoch: 5,
    foliageResidencyPhase: "mounted",
    foliageSelectedDecodedBytes: NINJAONE_ENVIRONMENT_FOLIAGE_DECODED_BYTES,
    foliageSelectedImageNodeCount: foliageResourceIds.length,
    foliageSelectedResourceIds: foliageResourceIds,
    foliageState: "ready",
    foliageVisible: true,
    lodTier: "close",
    lowerDetailAvailable: true,
    mountedNodes,
    mountedResourceIds,
    ...nativeAndHydrologyTelemetry({
      camera: FIXED_CAMERAS.C2,
      epoch: 7,
      nativeResourceIds: mountedResourceIds,
    }),
    nativeDemand: true,
    nativeState: "ready",
    nativeVisible: true,
    noVisibleGap: true,
    requiredCohortEpoch: 5,
    requiredCohortKey: `terrain:test|required:${requiredSeamKey}`,
    requiredChildren: [{
      epoch: 5,
      hiddenPaintedFrames: 2,
      key: ninjaOneEnvironmentSeamSelectionKey(selectedSeams),
      kind: "seam",
      mountedNodeCount: selectedSeams.length,
      mountedResourceIds: selectedSeams.map(({ id }) => id),
      selectedResourceIds: selectedSeams.map(({ id }) => id),
      state: "ready",
      svgLoadedCount: selectedSeams.length,
      visible: true,
    }],
    requiredDecodedBytes: selectedSeamDecodedBytes,
    requiredFailedKeys: [],
    requiredNoVisibleGap: true,
    requiredNodeCount: selectedSeams.length,
    requiredPreloadActive: true,
    requiredReady: true,
    requiredReadyKeys: [requiredSeamKey],
    requiredResourceIds: selectedSeams.map(({ id }) => id),
    requiredResourceKeys: [requiredSeamKey],
    requiredState: "ready",
    retiringResourceIds: [],
    selectedSupplementalResourceIds: supplementalIds,
    supplementalNodeCount: supplementalIds.length,
    supplementalState: "ready",
    supplementalVisible: true,
    terrainApplicationOwnedDecodedBytes: 25_160_448,
    terrainMountedDecodedBytes: 25_160_448,
    terrainRetiringDecodedBytes: 0,
    terrainState: "ready",
    terrainTileCount: terrainIds.length,
    waterDetailState: "ready",
    waterForegroundMode: NINJAONE_MVP_WATER_TEXTURE_LIMITS.foregroundWaterMode,
    waterHydrologyBudgetOwner:
      NINJAONE_MVP_WATER_TEXTURE_LIMITS.hydrologyBudgetOwner,
    waterHydrologyNativeUnionMaximumBytes:
      NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES,
    waterSharedTextureBytes:
      NINJAONE_MVP_WATER_TEXTURE_LIMITS.detailWithoutHydrologyBytes,
    waterSharedTransientPeakBytes:
      NINJAONE_MVP_WATER_TEXTURE_LIMITS.transientPeakBytes,
    waterTextureBudgetBytes: NINJAONE_MVP_WATER_TEXTURE_LIMITS.budgetBytes,
    waterTextureBytes: NINJAONE_MVP_WATER_TEXTURE_LIMITS.detailWithoutHydrologyBytes,
    waterTransientPeakBytes: NINJAONE_MVP_WATER_TEXTURE_LIMITS.transientPeakBytes,
  };
  const audit = auditNinjaOneEnvironmentRuntimeSample({
    camera: FIXED_CAMERAS.C2,
    resourceCatalog,
    sample,
  });
  assert.equal(audit.pass, true, audit.failures.join(", "));
  const firstPromotionSample = {
    ...sample,
    foliageResidencyPhase: "incoming",
    foliageState: "loading",
    foliageVisible: false,
    nativeHydrologyAdmissionCurrentResources:
      sample.nativeHydrologyAdmissionCurrentResources.map((resource) => (
        foliageResourceIds.includes(resource.id)
          ? { ...resource, phase: "incoming" }
          : resource
      )),
    supplementalState: "loading",
    supplementalVisible: false,
  };
  const firstPromotionAudit = auditNinjaOneEnvironmentRuntimeSample({
    allowOptionalPostPromotionPending: true,
    camera: FIXED_CAMERAS.C2,
    resourceCatalog,
    sample: firstPromotionSample,
  });
  assert.equal(
    firstPromotionAudit.pass,
    true,
    firstPromotionAudit.failures.join(", "),
  );
  const hiddenFoliageOmitted = auditNinjaOneEnvironmentRuntimeSample({
    allowOptionalPostPromotionPending: true,
    camera: FIXED_CAMERAS.C2,
    resourceCatalog,
    sample: {
      ...firstPromotionSample,
      foliageMountedDecodedBytes: 0,
      foliageMountedImageNodeCount: 0,
      foliageMountedResourceIds: [],
      mountedNodes: mountedNodes.filter(
        ({ resourceId }) => !foliageResourceIds.includes(resourceId),
      ),
      mountedResourceIds: mountedResourceIds.filter(
        (id) => !foliageResourceIds.includes(id),
      ),
      supplementalNodeCount: selectedSeams.length,
    },
  });
  assert.ok(hiddenFoliageOmitted.failures.includes(
    "runtime_sample.foliage_dom_residency_mismatch",
  ));
  const falseMountedFoliage = auditNinjaOneEnvironmentRuntimeSample({
    allowOptionalPostPromotionPending: true,
    camera: FIXED_CAMERAS.C2,
    resourceCatalog,
    sample: {
      ...firstPromotionSample,
      nativeHydrologyAdmissionCurrentResources:
        firstPromotionSample.nativeHydrologyAdmissionCurrentResources.map((resource) => (
          foliageResourceIds.includes(resource.id)
            ? { ...resource, phase: "mounted" }
            : resource
        )),
    },
  });
  assert.ok(falseMountedFoliage.failures.some((failure) => (
    failure.includes("native_hydrology_admission_current_phase")
  )));
  const changedRequiredIdentity = auditNinjaOneEnvironmentRuntimeSample({
    camera: FIXED_CAMERAS.C2,
    resourceCatalog,
    sample: {
      ...sample,
      requiredResourceKeys: [requiredSeamKey.replace(/A/i, "F")],
    },
  });
  assert.ok(changedRequiredIdentity.failures.some((failure) => (
    failure.includes("wrong_required_identity_cohort")
  )));

  const sitePreloadCamera = centeredCamera([0.3125, 0.25], 0.074);
  const sitePreloadPlan = planFor(sitePreloadCamera);
  const sitePreloadTerrainIds = sitePreloadPlan.terrainTiles.map(({ id }) => id);
  const sitePreloadSeams = selectNinjaOneEnvironmentSeamIntegration(sitePreloadCamera);
  const sitePreloadRequiredKey = sitePreloadSeams.length > 0
    ? ninjaOneEnvironmentRequiredPresentationKey("seam", sitePreloadSeams)
    : null;
  const sitePreloadSupplementalIds = sitePreloadSeams.map(({ id }) => id).sort();
  const sitePreloadResourceIds = [
    ...sitePreloadTerrainIds,
    ...sitePreloadSupplementalIds,
  ];
  const sitePreloadDecodedBytes = sitePreloadPlan.decodedBytes
    + sitePreloadSeams.reduce((total, resource) => total + resource.decodedBytes, 0);
  const sitePreloadSample = {
      ...sample,
      applicationOwnedDecodedBytes: sitePreloadDecodedBytes,
      applicationOwnedResourceIds: sitePreloadResourceIds,
      foliageMountedDecodedBytes: 0,
      foliageMountedImageNodeCount: 0,
      foliageMountedResourceIds: [],
      foliageResidencyCohortKey: "",
      foliageResidencyEpoch: 6,
      foliageResidencyPhase: "idle",
      foliageSelectedDecodedBytes: 0,
      foliageSelectedImageNodeCount: 0,
      foliageSelectedResourceIds: [],
      foliageState: "idle",
      foliageVisible: false,
      lodTier: "site",
      mountedNodes: sitePreloadResourceIds.map((resourceId, index) => ({
        kind: sitePreloadTerrainIds.includes(resourceId) ? "terrain" : "supplemental",
        nodeId: `site-preload-${index}`,
        resourceId,
      })),
      mountedResourceIds: sitePreloadResourceIds,
      ...nativeAndHydrologyTelemetry({
        camera: sitePreloadCamera,
        epoch: 8,
        nativeResourceIds: sitePreloadResourceIds,
      }),
      requiredCohortEpoch: 6,
      requiredCohortKey: `terrain:site${sitePreloadRequiredKey
        ? `|required:${sitePreloadRequiredKey}`
        : ""}`,
      requiredChildren: [{
        epoch: 6,
        hiddenPaintedFrames: sitePreloadSeams.length > 0 ? 2 : 0,
        key: ninjaOneEnvironmentSeamSelectionKey(sitePreloadSeams),
        kind: "seam",
        mountedNodeCount: sitePreloadSeams.length,
        mountedResourceIds: sitePreloadSupplementalIds,
        selectedResourceIds: sitePreloadSupplementalIds,
        state: sitePreloadSeams.length > 0 ? "ready" : "idle",
        svgLoadedCount: sitePreloadSeams.length,
        visible: sitePreloadSeams.length > 0,
      }],
      requiredDecodedBytes: sitePreloadDecodedBytes - sitePreloadPlan.decodedBytes,
      requiredFailedKeys: [],
      requiredNodeCount: sitePreloadSeams.length,
      requiredPreloadActive: true,
      requiredReady: true,
      requiredReadyKeys: sitePreloadRequiredKey ? [sitePreloadRequiredKey] : [],
      requiredResourceIds: sitePreloadSupplementalIds,
      requiredResourceKeys: sitePreloadRequiredKey ? [sitePreloadRequiredKey] : [],
      requiredState: "ready",
      selectedSupplementalResourceIds: sitePreloadSupplementalIds,
      supplementalNodeCount: sitePreloadSupplementalIds.length,
      supplementalState: sitePreloadSupplementalIds.length > 0 ? "ready" : "idle",
      supplementalVisible: sitePreloadSupplementalIds.length > 0,
      terrainApplicationOwnedDecodedBytes: sitePreloadPlan.decodedBytes,
      terrainMountedDecodedBytes: sitePreloadPlan.decodedBytes,
      terrainTileCount: sitePreloadTerrainIds.length,
  };
  const sitePreloadAudit = auditNinjaOneEnvironmentRuntimeSample({
    camera: sitePreloadCamera,
    resourceCatalog,
    sample: sitePreloadSample,
  });
  assert.equal(resolveDetailState(sitePreloadCamera).tier.id, "site");
  assert.equal(ninjaOneHydrologyShouldBeResident(sitePreloadCamera), true);
  assert.equal(sitePreloadAudit.pass, true, sitePreloadAudit.failures.join(", "));

  const hiddenRequiredSample = {
    ...sitePreloadSample,
    ...nativeAndHydrologyTelemetry({
      camera: sitePreloadCamera,
      epoch: 8,
      nativeResourceIds: sitePreloadResourceIds,
      presentationReady: false,
    }),
    nativeState: "loading",
    nativeVisible: false,
    requiredChildren: [{
      ...sitePreloadSample.requiredChildren[0],
      hiddenPaintedFrames: 0,
      state: "loading",
      svgLoadedCount: Math.max(0, sitePreloadSeams.length - 1),
      visible: false,
    }],
    requiredReady: false,
    requiredReadyKeys: [],
    requiredState: "loading",
    supplementalState: "loading",
    supplementalVisible: false,
  };
  const omittedRequiredId = sitePreloadSupplementalIds[0];
  const omittedHiddenNode = auditNinjaOneEnvironmentRuntimeSample({
    camera: sitePreloadCamera,
    resourceCatalog,
    sample: {
      ...hiddenRequiredSample,
      mountedNodes: hiddenRequiredSample.mountedNodes.filter(
        ({ resourceId }) => resourceId !== omittedRequiredId,
      ),
      mountedResourceIds: hiddenRequiredSample.mountedResourceIds.filter(
        (resourceId) => resourceId !== omittedRequiredId,
      ),
      requiredChildren: [{
        ...hiddenRequiredSample.requiredChildren[0],
        mountedNodeCount: sitePreloadSeams.length - 1,
        mountedResourceIds: sitePreloadSupplementalIds.slice(1),
      }],
      supplementalNodeCount: sitePreloadSeams.length - 1,
    },
  });
  assert.ok(omittedHiddenNode.failures.some((failure) => (
    failure.includes("required_dom_cohort_mismatch")
  )));

  const detachedReady = auditNinjaOneEnvironmentRuntimeSample({
    camera: sitePreloadCamera,
    resourceCatalog,
    sample: {
      ...hiddenRequiredSample,
      requiredChildren: [{
        ...hiddenRequiredSample.requiredChildren[0],
        hiddenPaintedFrames: 2,
        state: "ready",
      }],
      requiredReady: true,
      requiredReadyKeys: sitePreloadRequiredKey ? [sitePreloadRequiredKey] : [],
    },
  });
  assert.ok(detachedReady.failures.some((failure) => (
    failure.includes("required_child_detached_ready")
  )));

  const visibleBeforeParent = auditNinjaOneEnvironmentRuntimeSample({
    camera: sitePreloadCamera,
    resourceCatalog,
    sample: {
      ...hiddenRequiredSample,
      requiredChildren: [{
        ...hiddenRequiredSample.requiredChildren[0],
        visible: true,
      }],
    },
  });
  assert.ok(visibleBeforeParent.failures.some((failure) => (
    failure.includes("required_child_visible_before_parent")
  )));

  const staleRequiredEpoch = auditNinjaOneEnvironmentRuntimeSample({
    camera: sitePreloadCamera,
    resourceCatalog,
    sample: {
      ...hiddenRequiredSample,
      requiredChildren: [{
        ...hiddenRequiredSample.requiredChildren[0],
        epoch: hiddenRequiredSample.requiredCohortEpoch - 1,
      }],
    },
  });
  assert.ok(staleRequiredEpoch.failures.some((failure) => (
    failure.includes("required_child_identity")
  )));

  let wrongTerrainIndex = 0;
  const wrongTerrainIds = ["r2-c0", "r2-c1", "r3-c0", "r3-c1"];
  const wrongMountedResourceIds = [...wrongTerrainIds, ...supplementalIds];
  const wrongCohort = auditNinjaOneEnvironmentRuntimeSample({
    camera: FIXED_CAMERAS.C2,
    resourceCatalog,
    sample: {
      ...sample,
      mountedNodes: mountedNodes.map((node) => (
        node.kind === "terrain"
          ? { ...node, resourceId: wrongTerrainIds[wrongTerrainIndex++] }
          : node
      )),
      mountedResourceIds: wrongMountedResourceIds,
      applicationOwnedResourceIds: wrongMountedResourceIds,
    },
  });
  assert.equal(wrongCohort.pass, false);
  assert.ok(wrongCohort.failures.some((failure) => (
    failure.includes("wrong_terrain_cohort")
  )));

  const allDetailHydrologyResources =
    hydrologyManifest.regionalFields.tiers.detail.resources;
  const allDetailHydrologyBytes = allDetailHydrologyResources.reduce(
    (total, resource) => total + resource.decodedBytes,
    0,
  );
  const unadmittedDetailHydrology = auditNinjaOneEnvironmentRuntimeSample({
    camera: FIXED_CAMERAS.C2,
    resourceCatalog,
    sample: {
      ...sample,
      waterHydrologyAssetBytes: allDetailHydrologyBytes,
      waterHydrologyAssetConstraint: null,
      waterHydrologyAssetRegionIds: allDetailHydrologyResources.map(
        ({ regionId }) => regionId,
      ),
      waterHydrologyAssetResourceIds: allDetailHydrologyResources.map(({ id }) => id),
      waterHydrologyAssetResourcePath: null,
      waterHydrologyAssetResourcePaths: allDetailHydrologyResources.map(
        ({ path: value }) => value,
      ),
      waterHydrologyAssetState: "ready",
      waterHydrologyAssetTier: "detail",
      waterHydrologyNativeUnionCurrentBytes:
        nativeApplicationOwnedDecodedBytes + allDetailHydrologyBytes,
      waterHydrologyNativeUnionPlannedBytes:
        nativeApplicationOwnedDecodedBytes + allDetailHydrologyBytes,
      waterHydrologyNativeUnionTransitionPeakBytes:
        nativeApplicationOwnedDecodedBytes + allDetailHydrologyBytes,
      waterHydrologyRequestedRegionIds: allDetailHydrologyResources.map(
        ({ regionId }) => regionId,
      ),
      waterHydrologyRequestedResourceIds: allDetailHydrologyResources.map(({ id }) => id),
      waterHydrologyRequestedResourcePaths: allDetailHydrologyResources.map(
        ({ path: value }) => value,
      ),
      waterHydrologyRequestedTier: "detail",
      waterHydrologySamplerSlotCount: allDetailHydrologyResources.length,
      nativeDecodedUnionBytes: nativeApplicationOwnedDecodedBytes
        + allDetailHydrologyBytes,
      waterTextureBytes: NINJAONE_MVP_WATER_TEXTURE_LIMITS.steadyDetailBytes,
    },
  });
  assert.ok(unadmittedDetailHydrology.failures.includes(
    "runtime_sample.native_hydrology_decoded_byte_budget",
  ));
  assert.ok(unadmittedDetailHydrology.failures.includes(
    "runtime_sample.water_hydrology_mounted_cohort_invalid",
  ));
});

test("runtime water telemetry accepts only exact state-dependent byte tuples", () => {
  const resourceCatalog = createNinjaOneEnvironmentMvpResourceCatalog({
    hydrologyManifest,
    nativeManifest: { tiles: NINJAONE_ENVIRONMENT_NATIVE_TILES },
    supplementalManifests: [foliageManifest, seamManifest],
  });
  const worldCamera = { origin: [0, 0], span: [0.9, 0.9] };
  const baseSample = {
    applicationOwnedDecodedBytes: 0,
    applicationOwnedResourceIds: [],
    cohortEpoch: 0,
    cohortPhase: "active",
    foliageMountedDecodedBytes: 0,
    foliageMountedImageNodeCount: 0,
    foliageMountedResourceIds: [],
    foliageResidencyCohortKey: "",
    foliageResidencyEpoch: 0,
    foliageResidencyPhase: "idle",
    foliageSelectedDecodedBytes: 0,
    foliageSelectedImageNodeCount: 0,
    foliageSelectedResourceIds: [],
    foliageState: "idle",
    foliageVisible: false,
    lodTier: "world",
    lowerDetailAvailable: true,
    mountedNodes: [],
    mountedResourceIds: [],
    nativeDecodedUnionBytes: 0,
    nativeDemand: false,
    nativeHydrologyAdmissionCurrentDecodedBytes: 0,
    nativeHydrologyAdmissionCurrentResources: [],
    nativeHydrologyAdmissionEpoch: 0,
    nativeHydrologyAdmissionPresentationReady: false,
    nativeHydrologyAdmissionReservedDecodedBytes: 0,
    nativeHydrologyAdmissionTargetDecodedBytes: 0,
    nativeHydrologyAdmissionTargetResources: [],
    nativeState: "idle",
    nativeVisible: false,
    noVisibleGap: true,
    requiredCohortEpoch: 0,
    requiredCohortKey: "terrain:",
    requiredChildren: [{
      epoch: 0,
      hiddenPaintedFrames: 0,
      key: "",
      kind: "seam",
      mountedNodeCount: 0,
      mountedResourceIds: [],
      selectedResourceIds: [],
      state: "idle",
      svgLoadedCount: 0,
      visible: false,
    }],
    requiredDecodedBytes: 0,
    requiredFailedKeys: [],
    requiredNoVisibleGap: true,
    requiredNodeCount: 0,
    requiredPreloadActive: false,
    requiredReady: true,
    requiredReadyKeys: [],
    requiredResourceIds: [],
    requiredResourceKeys: [],
    requiredState: "idle",
    retiringResourceIds: [],
    selectedSupplementalResourceIds: [],
    supplementalNodeCount: 0,
    supplementalState: "idle",
    supplementalVisible: false,
    terrainApplicationOwnedDecodedBytes: 0,
    terrainMountedDecodedBytes: 0,
    terrainRetiringDecodedBytes: 0,
    terrainState: "idle",
    terrainTileCount: 0,
    waterDetailState: "base",
    waterForegroundMode: NINJAONE_MVP_WATER_TEXTURE_LIMITS.foregroundWaterMode,
    waterHydrologyAssetBytes: 0,
    waterHydrologyAssetConstraint: null,
    waterHydrologyAssetRegionIds: [],
    waterHydrologyAssetResourceIds: [],
    waterHydrologyAssetResourcePath: null,
    waterHydrologyAssetResourcePaths: [],
    waterHydrologyAssetState: "idle",
    waterHydrologyAssetTier: "none",
    waterHydrologyBudgetOwner:
      NINJAONE_MVP_WATER_TEXTURE_LIMITS.hydrologyBudgetOwner,
    waterHydrologyNativeUnionMaximumBytes:
      NINJAONE_ENVIRONMENT_NATIVE_MAX_DECODED_BYTES,
    waterHydrologyNativeAdmissionEpoch: -1,
    waterHydrologyNativeUnionCurrentBytes: 0,
    waterHydrologyNativeUnionPlannedBytes: 0,
    waterHydrologyNativeUnionReservedBytes: 0,
    waterHydrologyNativeUnionTransitionPeakBytes: 0,
    waterHydrologyRequested: false,
    waterHydrologyRequestedRegionIds: [],
    waterHydrologyRequestedResourceIds: [],
    waterHydrologyRequestedResourcePaths: [],
    waterHydrologyRequestedTier: "none",
    waterHydrologySamplerSlotCount: 0,
    waterHydrologyTransitionOpacity: 1,
    waterHydrologyTransitionState: "stable",
    waterRenderState: "ready",
    waterSharedTextureBytes: NINJAONE_MVP_WATER_TEXTURE_LIMITS.constructorSharedBytes,
    waterSharedTransientPeakBytes:
      NINJAONE_MVP_WATER_TEXTURE_LIMITS.constructorSharedBytes,
    waterTextureBudgetBytes: NINJAONE_MVP_WATER_TEXTURE_LIMITS.budgetBytes,
    waterTextureBytes: NINJAONE_MVP_WATER_TEXTURE_LIMITS.constructorSharedBytes,
    waterTransientPeakBytes: NINJAONE_MVP_WATER_TEXTURE_LIMITS.constructorSharedBytes,
  };
  const worldAudit = auditNinjaOneEnvironmentRuntimeSample({
    camera: worldCamera,
    resourceCatalog,
    sample: baseSample,
  });
  assert.equal(worldAudit.pass, true, worldAudit.failures.join(", "));

  const territoryAudit = auditNinjaOneEnvironmentRuntimeSample({
    camera: { origin: [0.095, 0], span: [0.36, 0.36] },
    resourceCatalog,
    sample: {
      ...baseSample,
      lodTier: "territory",
      waterDetailState: "ready",
      waterSharedTextureBytes: NINJAONE_MVP_WATER_TEXTURE_LIMITS.detailWithoutHydrologyBytes,
      waterSharedTransientPeakBytes: NINJAONE_MVP_WATER_TEXTURE_LIMITS.transientPeakBytes,
      waterTextureBytes: NINJAONE_MVP_WATER_TEXTURE_LIMITS.detailWithoutHydrologyBytes,
      waterTransientPeakBytes: NINJAONE_MVP_WATER_TEXTURE_LIMITS.transientPeakBytes,
    },
  });
  assert.equal(territoryAudit.pass, true, territoryAudit.failures.join(", "));

  const staleBasePeak = auditNinjaOneEnvironmentRuntimeSample({
    camera: worldCamera,
    resourceCatalog,
    sample: {
      ...baseSample,
      waterSharedTransientPeakBytes: NINJAONE_MVP_WATER_TEXTURE_LIMITS.transientPeakBytes,
      waterTransientPeakBytes: NINJAONE_MVP_WATER_TEXTURE_LIMITS.transientPeakBytes,
    },
  });
  assert.ok(staleBasePeak.failures.includes("runtime_sample.water_base_bytes_mismatch"));

  const missingCloseHydrology = auditNinjaOneEnvironmentRuntimeSample({
    camera: FIXED_CAMERAS.C2,
    resourceCatalog,
    sample: {
      ...baseSample,
      lodTier: "close",
      nativeHydrologyAdmissionPresentationReady: true,
      nativeState: "ready",
      nativeVisible: true,
      waterHydrologyRequested: true,
      waterDetailState: "ready",
      waterSharedTextureBytes: NINJAONE_MVP_WATER_TEXTURE_LIMITS.detailWithoutHydrologyBytes,
      waterSharedTransientPeakBytes: NINJAONE_MVP_WATER_TEXTURE_LIMITS.transientPeakBytes,
      waterTextureBytes: NINJAONE_MVP_WATER_TEXTURE_LIMITS.detailWithoutHydrologyBytes,
      waterTransientPeakBytes: NINJAONE_MVP_WATER_TEXTURE_LIMITS.transientPeakBytes,
    },
  });
  assert.ok(missingCloseHydrology.failures.includes(
    "runtime_sample.water_requested_hydrology_missing",
  ));
});

test("hydrology residency follows close-asset preload span and registration intersection", () => {
  const insideAtSpan = (span) => centeredCamera([0.3125, 0.25], span);
  assert.equal(NINJAONE_MVP_HYDROLOGY_MAXIMUM_CAMERA_SPAN, 0.075);
  assert.equal(ninjaOneHydrologyShouldBeResident(insideAtSpan(0.074)), true);
  assert.equal(ninjaOneHydrologyShouldBeResident(insideAtSpan(0.075)), true);
  assert.equal(ninjaOneHydrologyShouldBeResident(insideAtSpan(0.08)), false);
  assert.equal(ninjaOneHydrologyShouldBeResident({
    origin: [0.6, 0.6],
    span: [0.04, 0.04],
  }), false);
});

test("regional hydrology boundary trace preserves terrain and fails temporal drift", () => {
  const contract = NINJAONE_MVP_HYDROLOGY_BOUNDARY_TRANSITION;
  const resourceCatalog = createNinjaOneEnvironmentMvpResourceCatalog({
    hydrologyManifest,
    nativeManifest: { tiles: [] },
    supplementalManifests: [],
  });
  const terrainTiles = [];
  const terrainIds = terrainTiles.map(({ id }) => id);
  const selectedSeams = [];
  const requiredResourceIds = selectedSeams.map(({ id }) => id);
  const requiredDecodedBytes = selectedSeams.reduce(
    (total, resource) => total + resource.decodedBytes,
    0,
  );
  const applicationOwnedDecodedBytes = terrainTiles.reduce(
    (total, tile) => total + tile.decodedBytes,
    requiredDecodedBytes,
  );
  const requiredCohortKey = ninjaOneEnvironmentSeamSelectionKey(selectedSeams);
  const regionalResources = (regionIds, tier = "detail") => (
    hydrologyManifest.regionalFields.tiers[tier].resources.filter(
      ({ regionId }) => regionIds.includes(regionId),
    )
  );
  const runtime = ({
    opacity,
    regionIds,
    state,
    tier = regionIds.length > 0 ? "detail" : "none",
  }) => {
    const resources = tier === "none" ? [] : regionalResources(regionIds, tier);
    const hydrologyBytes = resources.reduce(
      (total, resource) => total + resource.decodedBytes,
      0,
    );
    return {
      applicationOwnedDecodedBytes,
      cohortPhase: "active",
      lowerWaterSurfaceCount: 1,
      lowerWaterVisibleCount: 1,
      mountedNodes: terrainIds.map((resourceId) => ({ kind: "terrain", resourceId })),
      nativeDecodedUnionBytes: applicationOwnedDecodedBytes + hydrologyBytes,
      nativeState: "idle",
      nativeVisible: false,
      noVisibleGap: true,
      requiredCohortEpoch: 8,
      requiredCohortKey,
      requiredNoVisibleGap: true,
      requiredReady: true,
      requiredResourceIds,
      requiredState: "ready",
      terrainTileCount: terrainIds.length,
      waterHydrologyAssetBytes: hydrologyBytes,
      waterHydrologyAssetRegionIds: resources.map(({ regionId }) => regionId),
      waterHydrologyAssetResourceIds: resources.map(({ id }) => id),
      waterHydrologyAssetResourcePaths: resources.map(({ path: value }) => value),
      waterHydrologyAssetState: tier === "detail" ? "ready" : "loading",
      waterHydrologyAssetTier: tier,
      waterHydrologyRequestedRegionIds: resources.map(({ regionId }) => regionId),
      waterHydrologyRequestedResourceIds: resources.map(({ id }) => id),
      waterHydrologyRequestedResourcePaths: resources.map(({ path: value }) => value),
      waterHydrologyRequestedTier: tier,
      waterHydrologySamplerSlotCount: resources.length,
      waterHydrologyTransitionOpacity: opacity,
      waterHydrologyTransitionState: state,
      waterRenderState: "ready",
    };
  };
  const cameraAt = (progress) => ({
    origin: [
      contract.fromCamera.origin[0]
        + (contract.toCamera.origin[0] - contract.fromCamera.origin[0]) * progress,
      contract.fromCamera.origin[1]
        + (contract.toCamera.origin[1] - contract.fromCamera.origin[1]) * progress,
    ],
    span: [...contract.fromCamera.span],
  });
  const sample = (elapsedMs, progress, runtimeValue) => ({
    camera: cameraAt(progress),
    elapsedMs,
    runtime: runtimeValue,
  });
  const sourceRuntime = runtime({
    opacity: 1,
    regionIds: contract.fromRegionIds,
    state: "stable",
  });
  const targetRuntime = runtime({
    opacity: 1,
    regionIds: contract.toRegionIds,
    state: "stable",
  });
  const frame = (id, camera, runtimeValue) => ({
    camera,
    captureSynchronization: "runtime-state-before-and-after-cdp-screenshot",
    id,
    runtime: runtimeValue,
    runtimeAfter: runtimeValue,
  });
  const alphaFrame = (id, camera, runtimeValue) => ({
    alphaBasis: "regional-minus-zero-baseline",
    camera,
    fieldResourceIds: runtimeValue.waterHydrologyAssetResourceIds.length > 0
      ? runtimeValue.waterHydrologyAssetResourceIds
      : runtimeValue.waterHydrologyRequestedResourceIds,
    fieldTier: runtimeValue.waterHydrologyAssetTier === "none"
      ? runtimeValue.waterHydrologyRequestedTier
      : runtimeValue.waterHydrologyAssetTier,
    id,
    imagePath: `${id}.png`,
    maskPath: `${id}-mask.png`,
    maskSha256: "A".repeat(64),
    opacity: runtimeValue.waterHydrologyTransitionOpacity,
    state: runtimeValue.waterHydrologyTransitionState,
  });
  const directSamples = [
    sample(0, 0, sourceRuntime),
    sample(16, 0.5, sourceRuntime),
    sample(32, 1, targetRuntime),
  ];
  const direct = {
    alphaFrames: [
      alphaFrame("stable-before", contract.fromCamera, sourceRuntime),
      alphaFrame("stable-after", contract.toCamera, targetRuntime),
    ],
    frames: [
      frame("stable-before", contract.fromCamera, sourceRuntime),
      frame("stable-after", contract.toCamera, targetRuntime),
    ],
    fromCamera: contract.fromCamera,
    id: contract.id,
    isolation: NINJAONE_MVP_HYDROLOGY_BOUNDARY_ISOLATION,
    samples: directSamples,
    toCamera: contract.toCamera,
    transitionTriggered: false,
  };
  const directAudit = auditNinjaOneEnvironmentHydrologyBoundaryTransition({
    capture: direct,
    resourceCatalog,
  });
  assert.equal(directAudit.pass, false);
  assert.ok(directAudit.failures.includes("hydrology_boundary.raf_transition_missing"));

  const fadingOutA = runtime({
    opacity: 0.8,
    regionIds: contract.fromRegionIds,
    state: "fading-out",
  });
  const fadingOutB = runtime({
    opacity: 0.35,
    regionIds: contract.fromRegionIds,
    state: "fading-out",
  });
  const zero = runtime({ opacity: 0, regionIds: [], state: "zero", tier: "none" });
  zero.waterHydrologyRequestedRegionIds = [...contract.toRegionIds];
  zero.waterHydrologyRequestedResourceIds = regionalResources(contract.toRegionIds)
    .map(({ id }) => id);
  zero.waterHydrologyRequestedResourcePaths = regionalResources(contract.toRegionIds)
    .map(({ path: value }) => value);
  zero.waterHydrologyRequestedTier = "detail";
  const fadingInA = runtime({
    opacity: 0.25,
    regionIds: contract.toRegionIds,
    state: "fading-in",
  });
  const fadingInB = runtime({
    opacity: 0.8,
    regionIds: contract.toRegionIds,
    state: "fading-in",
  });
  const fadeSamples = [
    sample(0, 0, sourceRuntime),
    sample(16, 0.2, fadingOutA),
    sample(32, 0.4, fadingOutB),
    sample(48, 0.6, zero),
    sample(64, 0.75, fadingInA),
    sample(80, 0.9, fadingInB),
    sample(96, 1, targetRuntime),
  ];
  const faded = {
    ...direct,
    alphaFrames: [
      alphaFrame("fading-out", cameraAt(0.2), fadingOutA),
      alphaFrame("zero", cameraAt(0.6), zero),
      alphaFrame("fading-in", cameraAt(0.75), fadingInA),
    ],
    samples: fadeSamples,
    transitionTriggered: true,
  };
  const fadedAudit = auditNinjaOneEnvironmentHydrologyBoundaryTransition({
    capture: faded,
    resourceCatalog,
  });
  assert.equal(fadedAudit.pass, true, JSON.stringify(fadedAudit.failures));
  const reversed = {
    ...direct,
    alphaFrames: [
      alphaFrame("fading-out", cameraAt(0.35), fadingOutA),
      alphaFrame("fading-in", cameraAt(0.7), fadingInA),
    ],
    samples: [
      sample(0, 0, sourceRuntime),
      sample(16, 0.35, fadingOutA),
      sample(32, 0.7, fadingInA),
      sample(48, 1, targetRuntime),
    ],
    transitionTriggered: true,
  };
  const reversedAudit = auditNinjaOneEnvironmentHydrologyBoundaryTransition({
    capture: reversed,
    resourceCatalog,
  });
  assert.equal(reversedAudit.pass, false);
  assert.ok(reversedAudit.failures.includes("hydrology_boundary.zero_missing"));
  const rebound = structuredClone(faded);
  rebound.samples[2].runtime.waterHydrologyTransitionOpacity = 0.9;
  assert.ok(auditNinjaOneEnvironmentHydrologyBoundaryTransition({
    capture: rebound,
    resourceCatalog,
  }).failures.includes("hydrology_boundary.fade_out_not_monotonic"));
  const terrainLoss = structuredClone(faded);
  terrainLoss.samples[2].runtime.mountedNodes.push({
    kind: "terrain",
    resourceId: "forged-terrain-resource",
  });
  assert.ok(auditNinjaOneEnvironmentHydrologyBoundaryTransition({
    capture: terrainLoss,
    resourceCatalog,
  }).failures.some((failure) => failure.endsWith(".terrain_loss")));
  const requiredDrift = structuredClone(faded);
  requiredDrift.samples[2].runtime.requiredCohortEpoch += 1;
  assert.ok(auditNinjaOneEnvironmentHydrologyBoundaryTransition({
    capture: requiredDrift,
    resourceCatalog,
  }).failures.some((failure) => failure.endsWith(".required_cohort_changed")));
  const emptyAtNonzero = structuredClone(faded);
  Object.assign(emptyAtNonzero.samples[2].runtime, runtime({
    opacity: 0.35,
    regionIds: [],
    state: "fading-out",
    tier: "none",
  }));
  assert.ok(auditNinjaOneEnvironmentHydrologyBoundaryTransition({
    capture: emptyAtNonzero,
    resourceCatalog,
  }).failures.some((failure) => failure.endsWith(".unexplained_empty_cohort")));
  const forgedAlpha = structuredClone(faded);
  forgedAlpha.alphaFrames[0].state = "fading-in";
  assert.ok(auditNinjaOneEnvironmentHydrologyBoundaryTransition({
    capture: forgedAlpha,
    resourceCatalog,
  }).failures.some((failure) => failure.includes("alpha_fading-out.state_mismatch")));
  const forgedOpacity = structuredClone(faded);
  forgedOpacity.alphaFrames[0].opacity = 1;
  assert.ok(auditNinjaOneEnvironmentHydrologyBoundaryTransition({
    capture: forgedOpacity,
    resourceCatalog,
  }).failures.some((failure) => failure.includes("alpha_fading-out.state_mismatch")));
});

test("regional hydrology boundary alpha proof rejects missing flat and unregistered pixels", async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "ninjaone-boundary-alpha-"));
  try {
    const clip = { height: 900, scale: 1, width: 1440, x: 0, y: 0 };
    const detailResource = hydrologyManifest.regionalFields.tiers.detail.resources.find(
      ({ regionId }) => regionId === "C2",
    );
    const contract = await deriveNinjaOneHydrologyMotionContract({
      camera: FIXED_CAMERAS.C2,
      clip,
      fieldResourceIds: [detailResource.id],
      fieldTier: "detail",
      manifest: hydrologyManifest,
      root,
    });
    const maskPath = path.join(temporaryDirectory, "mask.png");
    const validPath = path.join(temporaryDirectory, "valid.png");
    const flatPath = path.join(temporaryDirectory, "flat.png");
    const outsidePath = path.join(temporaryDirectory, "outside.png");
    const fullOpacityPath = path.join(temporaryDirectory, "full-opacity.png");
    const { data: intermediateData, info: intermediateInfo } = await sharp(
      contract.fullMaskPng,
    ).toColourspace("srgb").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let index = 3; index < intermediateData.length; index += 4) {
      if (intermediateData[index] > 0) intermediateData[index] = 128;
    }
    const validIntermediatePng = await sharp(intermediateData, {
      raw: {
        channels: intermediateInfo.channels,
        height: intermediateInfo.height,
        width: intermediateInfo.width,
      },
    }).png().toBuffer();
    await Promise.all([
      writeFile(maskPath, contract.fullMaskPng),
      writeFile(validPath, validIntermediatePng),
      writeFile(fullOpacityPath, contract.fullMaskPng),
      sharp({
        create: {
          background: { alpha: 0, b: 0, g: 0, r: 0 },
          channels: 4,
          height: clip.height,
          width: clip.width,
        },
      }).png().toFile(flatPath),
      sharp({
        create: {
          background: { alpha: 1, b: 255, g: 255, r: 255 },
          channels: 4,
          height: clip.height,
          width: clip.width,
        },
      }).png().toFile(outsidePath),
    ]);
    const frame = {
      alphaBasis: "regional-minus-zero-baseline",
      camera: FIXED_CAMERAS.C2,
      clip,
      fieldResourceIds: [detailResource.id],
      fieldTier: "detail",
      id: "fading-in",
      imagePath: validPath,
      maskPath,
      maskSha256: contract.fullMaskSha256,
      opacity: 0.5,
      state: "fading-in",
    };
    const valid = await auditNinjaOneEnvironmentHydrologyBoundaryAlphaFrame({
      evidenceDirectory: temporaryDirectory,
      frame,
      hydrologyManifest,
      referenceRoot: root,
    });
    assert.equal(valid.pass, true, valid.failures.join(", "));
    const endpointSubstitution = await auditNinjaOneEnvironmentHydrologyBoundaryAlphaFrame({
      evidenceDirectory: temporaryDirectory,
      frame: { ...frame, imagePath: fullOpacityPath },
      hydrologyManifest,
      referenceRoot: root,
    });
    assert.ok(endpointSubstitution.failures.includes("alpha_exceeds_declared_opacity"));
    const flat = await auditNinjaOneEnvironmentHydrologyBoundaryAlphaFrame({
      evidenceDirectory: temporaryDirectory,
      frame: { ...frame, imagePath: flatPath },
      hydrologyManifest,
      referenceRoot: root,
    });
    assert.ok(flat.failures.includes("registered_alpha_missing_at_nonzero_opacity"));
    const outside = await auditNinjaOneEnvironmentHydrologyBoundaryAlphaFrame({
      evidenceDirectory: temporaryDirectory,
      frame: { ...frame, imagePath: outsidePath },
      hydrologyManifest,
      referenceRoot: root,
    });
    assert.ok(outside.failures.includes("alpha_outside_registered_mask"));
    const forgedZero = await auditNinjaOneEnvironmentHydrologyBoundaryAlphaFrame({
      evidenceDirectory: temporaryDirectory,
      frame: {
        ...frame,
        id: "zero",
        opacity: 0,
        state: "zero",
      },
      hydrologyManifest,
      referenceRoot: root,
    });
    assert.ok(forgedZero.failures.includes("alpha_present_at_zero_opacity"));
    await assert.rejects(() => auditNinjaOneEnvironmentHydrologyBoundaryAlphaFrame({
      evidenceDirectory: temporaryDirectory,
      frame: { ...frame, imagePath: path.join(temporaryDirectory, "missing.png") },
      hydrologyManifest,
      referenceRoot: root,
    }));
  } finally {
    let cleanupError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await rm(temporaryDirectory, { force: true, recursive: true });
        cleanupError = undefined;
        break;
      } catch (error) {
        cleanupError = error;
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
        }
      }
    }
    if (cleanupError) throw cleanupError;
  }
});

test("runtime evidence rejects a stale behavior-binding aggregate", async () => {
  const [bindings, foliageBindings] = await Promise.all([
    createNinjaOneEnvironmentCaptureBindings(root),
    createNinjaOneEnvironmentFoliageIsolationBindings(root),
  ]);
  assert.ok(Object.hasOwn(
    foliageBindings.files,
    "scripts/build-ninjaone-environment-foliage-r3.mjs",
  ));
  const audit = await auditRuntimeCaptureEvidence({
    evidence: {
      bindings: {
        ...bindings,
        aggregateSha256: `${bindings.aggregateSha256.slice(0, -1)}${
          bindings.aggregateSha256.endsWith("0") ? "1" : "0"
        }`,
      },
      checkpoints: {},
      consoleErrors: [],
      lodTransition: { frames: [] },
      motionCaptures: [],
      networkErrors: [],
      producer: {
        automation: "browser-dom-screenshot",
        capturedAt: new Date(0).toISOString(),
        id: "ninjaone-environment-browser-capture-r1",
        scriptPath: "scripts/capture-ninjaone-environment-mvp.mjs",
        scriptSha256: "stale",
        url: "http://127.0.0.1:4173/career-world/previews/ninjaone-environment",
        viewport: { height: 900, width: 1440 },
      },
      residencySamples: [],
      schemaVersion: 1,
    },
    evidencePath: path.join(root, ".codex-tmp", "stale-evidence.json"),
    referenceRoot: root,
    resourceCatalog: { placeholder: { decodedBytes: 1, id: "placeholder", kind: "terrain" } },
  });
  assert.ok(audit.failures.includes("capture_binding_paths_mismatch"));
});

test("capture producer paints eviction and the exact atomic required promotion", async () => {
  const source = await readFile(
    path.join(root, "scripts/capture-ninjaone-environment-mvp.mjs"),
    "utf8",
  );
  assert.match(
    source,
    /requestAnimationFrame\(\(\) => \{\s*requestAnimationFrame\(\(\) => \{\s*debugger;/,
  );
  assert.match(source, /captureSynchronization: "one-painted-frame-before-debugger"/);
  assert.match(source, /paintedFramesBeforeCapture: 1/);
  assert.match(source, /createRequiredImageRequestGate/);
  assert.match(source, /captureSynchronization: "required-image-request-gate"/);
  assert.match(source, /sample\.terrainState === "ready"/);
  assert.match(source, /sample\.requiredState === "loading"/);
  assert.match(source, /captureSynchronization: "one-painted-frame-after-required-promotion"/);
  assert.match(source, /paintedFramesAfterPromotion: 1/);
  assert.match(source, /invalidIntermediatePromotion/);
  assert.match(source, /residency-pan-first-promoted\.png/);
  const promotionObserver = source.slice(
    source.indexOf("__ninjaoneRequiredPromotionTrace"),
    source.indexOf("const promotionPausedPromise"),
  );
  assert.match(
    promotionObserver,
    /attributeFilter: \['data-environment-native-visible'\]/,
  );
  assert.match(
    promotionObserver,
    /requestAnimationFrame\(\(\) => \{\s*requestAnimationFrame\(\(\) => \{\s*debugger;/,
  );
  assert.match(source, /ninjaoneResidencyCaptureIsolation/);
  assert.match(source, /canvas\[data-layer="water-surface"\] \{ visibility: hidden/);
  assert.match(source, /fieldTier: runtime\.waterHydrologyAssetTier/);
  assert.match(source, /fieldResourceIds: runtime\.waterHydrologyAssetResourceIds/);
  assert.match(source, /NINJAONE_MVP_HYDROLOGY_FEATURE_CAPTURES/);
  assert.match(source, /captureWaterCanvasPng/);
  assert.match(source, /hydrologyFeatureCaptures/);
  assert.match(source, /data-environment-seam-integration-tonal-resource/);
  assert.match(source, /__ninjaoneHydrologyBoundaryTrace/);
  assert.match(source, /prefers-reduced-motion[\s\S]*?no-preference/);
  assert.match(source, /waterHydrologyTransitionState/);
  assert.match(source, /waterHydrologyTransitionOpacity/);
  assert.match(source, /waterHydrologyAssetResourceIds/);
  assert.match(source, /waterHydrologyRequestedResourceIds/);
  assert.match(source, /writeRegionalHydrologyAlphaDelta/);
  assert.match(source, /alphaBasis: "regional-minus-zero-baseline"/);
  assert.match(source, /opacity > 0[\s\S]*?opacity < 1/);
  assert.match(source, /dispatchSinglePan\(connection, sessionId, contract\.toCamera\.origin\)/);
  assert.doesNotMatch(source, /ninjaone-hydrology-flow(?:-fallback)?-r2/);
  const residencyIsolation = source.slice(
    source.indexOf("ninjaoneResidencyCaptureIsolation"),
    source.indexOf('await captureResidency("close-ready")'),
  );
  assert.doesNotMatch(
    residencyIsolation,
    /\[data-environment-seam-integration-state\] \{ visibility: hidden/,
  );
  const foliageSource = await readFile(
    path.join(
      root,
      "features/career-world/development/NinjaOneEnvironmentFoliage.tsx",
    ),
    "utf8",
  );
  assert.match(foliageSource, /ref=\{groupRef\}/);
  assert.match(
    foliageSource,
    /querySelectorAll<SVGImageElement>\("image\[data-shared-resource\]"\)/,
  );
  assert.match(foliageSource, /observeNinjaOneEnvironmentFoliageDomResidency/);
  assert.doesNotMatch(foliageSource, /new window\.Image\(\)/);
  assert.match(foliageSource, /cohortMounted \? instances\.map/);
  assert.match(foliageSource, /key=\{`\$\{currentLoadState\.epoch\}:\$\{instance\.id\}`\}/);
  assert.match(foliageSource, /onLoad=\{\(\) => handleLoad/);
  assert.match(foliageSource, /window\.requestAnimationFrame/);
});

test("motion evidence derives its mask and vector from the mounted fallback field", async () => {
  const contract = await deriveNinjaOneHydrologyMotionContract({
    camera: NINJAONE_MVP_HYDROLOGY_FEATURE_CAPTURES[0].camera,
    clip: { height: 900, scale: 1, width: 1440, x: 0, y: 0 },
    fieldTier: "fallback",
    manifest: hydrologyManifest,
    root,
  });
  assert.equal(contract.fieldTier, "fallback");
  assert.ok(contract.fieldResourceIds.length > 0);
  assert.ok(contract.fieldResourceIds.length <= 2);
  for (const [index, resourceId] of contract.fieldResourceIds.entries()) {
    const resource = hydrologyManifest.regionalFields.tiers.fallback.resources.find(
      ({ id }) => id === resourceId,
    );
    assert.ok(resource);
    assert.equal(contract.fieldPaths[index], resource.path);
    assert.equal(contract.fieldSha256s[index], resource.sha256);
  }
  assert.ok(contract.directionalPixels > 0);
  assert.ok(contract.maskPng.length > 0);
});

test("B2 tarn and waterfall feature contracts separate full coverage from flow", async () => {
  const expected = {
    "hydrology-B2-lip-fall": {
      coveragePixels: 2_253,
      directionalPixels: 551,
      fullMaskSha256:
        "2921FFDD9F9DF3864A5775CA4FA801D79365A688F0BF27A047D6E65E1394C8C3",
      maskSha256:
        "7846E7B8CF91991ED8B101F6598386EA627663D66B995DC52DEFB6CB81C55BB5",
    },
    "hydrology-B2-tarn": {
      coveragePixels: 4_030,
      directionalPixels: 485,
      fullMaskSha256:
        "0617439A2B46E222DB98B4D64977B30C2FEE9A016AB3B75D1250C852ADA1E378",
      maskSha256:
        "E09F3D8C01F3E52E143ED2B1328633027CEAA643AAF9233974434FD8C6DB736D",
    },
  };
  for (const feature of NINJAONE_MVP_HYDROLOGY_FEATURE_CAPTURES) {
    const contract = await deriveNinjaOneHydrologyMotionContract({
      camera: feature.camera,
      clip: { height: 900, scale: 1, width: 1440, x: 0, y: 0 },
      fieldTier: "fallback",
      manifest: hydrologyManifest,
      root,
    });
    assert.equal(contract.coveragePixels, expected[feature.id].coveragePixels);
    assert.equal(contract.directionalPixels, expected[feature.id].directionalPixels);
    assert.equal(contract.fullMaskSha256, expected[feature.id].fullMaskSha256);
    assert.equal(contract.maskSha256, expected[feature.id].maskSha256);
    assert.deepEqual(contract.styleCounts, feature.requiredStyleCounts);
    assert.notEqual(contract.fullMaskSha256, contract.maskSha256);
  }
});

test("hydrology budget evidence binds both mounted-field binaries to manifest hashes", async () => {
  const audit = await auditHydrologyRuntimeBudget({ manifest: hydrologyManifest, root });
  assert.equal(audit.pass, true);
  assert.equal(audit.tiers.detail.resources.length, 3);
  assert.equal(audit.tiers.fallback.resources.length, 3);
  assert.ok(audit.tiers.detail.resources.every(({ pass }) => pass));
  assert.ok(audit.tiers.fallback.resources.every(({ pass }) => pass));

  const staleManifest = structuredClone(hydrologyManifest);
  const fallbackResource = staleManifest.regionalFields.tiers.fallback.resources[0];
  fallbackResource.sha256 = `${fallbackResource.sha256.slice(0, -1)}${
    fallbackResource.sha256.endsWith("0") ? "1" : "0"
  }`;
  const staleAudit = await auditHydrologyRuntimeBudget({
    manifest: staleManifest,
    root,
  });
  assert.equal(staleAudit.pass, false);
});

test("package commands resolve to visible deterministic builders and verifier fails closed", async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const packageLock = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
  const gitignore = await readFile(path.join(root, ".gitignore"), "utf8");
  const expected = {
    "build:environment-hydrology":
      "node scripts/build-ninjaone-environment-hydrology-r2.mjs",
    "build:environment-native":
      "node scripts/build-ninjaone-environment-native-detail.mjs --static-only",
    "build:ninjaone-environment-foliage":
      "node scripts/build-ninjaone-environment-foliage-r3.mjs",
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
  assert.match(help.stdout, /--captures <file>/);

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
  assert.ok(result.failures.includes("runtime_capture_evidence_missing"));
  assert.ok(result.failures.includes(
    "coast.native_original_transition_evidence_missing",
  ));
  assert.equal(result.static.pass, false);
  assert.ok(result.failures.includes("coast.native_original_transition_evidence_missing"));
});
