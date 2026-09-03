import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  advanceLodPresentationFade,
  EMPTY_LOD_COHORT_TRANSITION,
  isLodCohortReady,
  LOD_PRESENTATION_TRANSITION_MS,
  resolveAtomicTierVisibility,
  resolveDetailState,
  resolveLodCohortKeyOpacity,
  resolveLodCohortTransition,
  resolveLodCrossfadeTargets,
  resolveRetainedLodPresentationKeys,
  shouldRetainLodSource,
} from "../features/career-world/shared/lod.ts";

test("atomic tier visibility keeps city cohorts mutually exclusive", () => {
  const sitePolicy = Object.freeze({ minimumTier: "site" });
  const capital = resolveDetailState({
    origin: [0, 0],
    span: [0.06, 0.06],
  });
  const site = resolveDetailState({
    origin: [0, 0],
    span: [0.045, 0.045],
  });

  assert.equal(capital.tier.id, "capital");
  assert.equal(resolveAtomicTierVisibility(sitePolicy, capital), 0);
  assert.equal(site.tier.id, "site");
  assert.equal(resolveAtomicTierVisibility(sitePolicy, site), 1);
});

test("same-tier pan cohorts crossfade atomically without dimming overlap", () => {
  const firstKeys = ["capital:b", "capital:a"];
  const partialFirstDecode = new Set(["capital:a"]);

  assert.equal(
    isLodCohortReady(firstKeys, partialFirstDecode),
    false,
  );
  assert.strictEqual(
    resolveLodCohortTransition(
      firstKeys,
      partialFirstDecode,
      EMPTY_LOD_COHORT_TRANSITION,
      100,
    ),
    EMPTY_LOD_COHORT_TRANSITION,
  );

  const first = resolveLodCohortTransition(
    firstKeys,
    new Set(firstKeys),
    EMPTY_LOD_COHORT_TRANSITION,
    120,
  );
  assert.deepEqual(first.incoming.keys, ["capital:a", "capital:b"]);
  assert.equal(first.promotedAt, 120);
  assert.equal(
    resolveLodCohortKeyOpacity(
      first,
      "capital:a",
      120 + LOD_PRESENTATION_TRANSITION_MS,
    ),
    1,
  );

  const changedKeys = ["capital:b", "capital:c"];
  const incompleteChange = resolveLodCohortTransition(
    changedKeys,
    new Set(firstKeys),
    first,
    320,
  );
  assert.strictEqual(
    incompleteChange,
    first,
    "a partial viewport cohort must not expose decode order",
  );

  const changed = resolveLodCohortTransition(
    changedKeys,
    new Set([...firstKeys, "capital:c"]),
    first,
    340,
  );
  assert.deepEqual(changed.incoming.keys, ["capital:b", "capital:c"]);
  assert.deepEqual(changed.outgoing.keys, ["capital:a", "capital:b"]);
  assert.equal(changed.promotedAt, 340);
  assert.equal(
    resolveLodCohortKeyOpacity(changed, "capital:a", 340),
    1,
  );
  assert.equal(
    resolveLodCohortKeyOpacity(changed, "capital:b", 340),
    1,
    "an overlapping tile must not restart its fade or disappear",
  );
  assert.equal(
    resolveLodCohortKeyOpacity(changed, "capital:c", 340),
    0,
  );

  const midpoint = 340 + LOD_PRESENTATION_TRANSITION_MS / 2;
  assert.equal(
    resolveLodCohortKeyOpacity(changed, "capital:a", midpoint),
    0.5,
  );
  assert.equal(
    resolveLodCohortKeyOpacity(changed, "capital:b", midpoint),
    1,
  );
  assert.equal(
    resolveLodCohortKeyOpacity(changed, "capital:c", midpoint),
    0.5,
  );

  const retired = resolveLodCohortTransition(
    changedKeys,
    new Set([...firstKeys, "capital:c"]),
    changed,
    340 + LOD_PRESENTATION_TRANSITION_MS,
  );
  assert.deepEqual(retired.outgoing.keys, []);
  assert.equal(resolveLodCohortKeyOpacity(retired, "capital:a", 600), 0);
  assert.equal(resolveLodCohortKeyOpacity(retired, "capital:b", 600), 1);
  assert.equal(resolveLodCohortKeyOpacity(retired, "capital:c", 600), 1);
});

test("a rapid second pan promotion preserves current per-key opacity", () => {
  const decoded = new Set(["a", "b", "c", "d"]);
  const base = resolveLodCohortTransition(
    ["a", "b"],
    decoded,
    EMPTY_LOD_COHORT_TRANSITION,
    0,
  );
  const firstPan = resolveLodCohortTransition(
    ["b", "c"],
    decoded,
    base,
    LOD_PRESENTATION_TRANSITION_MS,
  );
  const halfway = (
    LOD_PRESENTATION_TRANSITION_MS
    + LOD_PRESENTATION_TRANSITION_MS / 2
  );
  assert.equal(resolveLodCohortKeyOpacity(firstPan, "c", halfway), 0.5);

  const secondPan = resolveLodCohortTransition(
    ["c", "d"],
    decoded,
    firstPan,
    halfway,
  );
  assert.deepEqual(secondPan.incoming.keys, ["c", "d"]);
  assert.deepEqual(secondPan.outgoing.keys, ["a", "b", "c"]);
  assert.equal(
    resolveLodCohortKeyOpacity(secondPan, "c", halfway),
    0.5,
    "a promoted overlap must continue from its current opacity",
  );
  assert.equal(resolveLodCohortKeyOpacity(secondPan, "b", halfway), 1);
  assert.equal(resolveLodCohortKeyOpacity(secondPan, "d", halfway), 0);

  const retired = resolveLodCohortTransition(
    ["c", "d"],
    decoded,
    secondPan,
    halfway + LOD_PRESENTATION_TRANSITION_MS,
  );
  assert.deepEqual(retired.outgoing.keys, []);
  assert.equal(resolveLodCohortKeyOpacity(retired, "a", 1_000), 0);
  assert.equal(resolveLodCohortKeyOpacity(retired, "b", 1_000), 0);
  assert.equal(resolveLodCohortKeyOpacity(retired, "c", 1_000), 1);
  assert.equal(resolveLodCohortKeyOpacity(retired, "d", 1_000), 1);
});

test("rapid zoom-out retains the outgoing tier through its full fade", () => {
  const presented = Object.freeze({
    value: 1,
    target: 1,
    lastUpdatedAt: 0,
  });
  const fadeStartedAt = 1_000;
  const armed = advanceLodPresentationFade(
    presented,
    0,
    fadeStartedAt,
  );

  assert.equal(armed.value, 1);
  assert.equal(shouldRetainLodSource(false, armed.value), true);

  const midpoint = advanceLodPresentationFade(
    armed,
    0,
    fadeStartedAt + LOD_PRESENTATION_TRANSITION_MS / 2,
  );
  assert.equal(midpoint.value, 0.5);
  assert.equal(shouldRetainLodSource(false, midpoint.value), true);

  const retired = advanceLodPresentationFade(
    midpoint,
    0,
    fadeStartedAt + LOD_PRESENTATION_TRANSITION_MS,
  );
  assert.equal(retired.value, 0);
  assert.equal(shouldRetainLodSource(false, retired.value), false);
});

test("reverse zoom pins only decoded keys from visible LOD presentations", () => {
  const decoded = new Set(["site:a", "site:b", "capital:a"]);
  const site = resolveLodCohortTransition(
    ["site:a", "site:b"],
    decoded,
    EMPTY_LOD_COHORT_TRANSITION,
    100,
  );
  const capital = resolveLodCohortTransition(
    ["capital:a", "capital:missing"],
    decoded,
    EMPTY_LOD_COHORT_TRANSITION,
    100,
  );

  assert.deepEqual(
    resolveRetainedLodPresentationKeys([
      { transition: site, value: 0.75 },
      { transition: capital, value: 0 },
    ], decoded),
    ["site:a", "site:b"],
  );
  assert.deepEqual(
    resolveRetainedLodPresentationKeys([
      { transition: site, value: 0 },
      { transition: capital, value: 0 },
    ], decoded),
    [],
  );
});

test("a late territory decode fades toward the current semantic weight", () => {
  const hidden = Object.freeze({
    value: 0,
    target: 0,
    lastUpdatedAt: 0,
  });
  const readyAt = 500;
  const semanticWeight = 0.8;
  const armed = advanceLodPresentationFade(
    hidden,
    semanticWeight,
    readyAt,
  );

  assert.equal(armed.value, 0, "late readiness must not pop");

  const catchUp = advanceLodPresentationFade(
    armed,
    semanticWeight,
    readyAt + LOD_PRESENTATION_TRANSITION_MS / 2,
  );
  assert.ok(catchUp.value > 0);
  assert.ok(catchUp.value < semanticWeight);

  const settled = advanceLodPresentationFade(
    catchUp,
    semanticWeight,
    readyAt + LOD_PRESENTATION_TRANSITION_MS,
  );
  assert.equal(settled.value, semanticWeight);
});

test("site presentation retires capital only after the site can replace it", () => {
  assert.deepEqual(
    resolveLodCrossfadeTargets({
      lowerReady: true,
      lowerVisibility: 1,
      upperReady: false,
      upperVisibility: 1,
    }),
    { lower: 1, upper: 0 },
    "capital must remain while the site cohort is incomplete",
  );
  assert.deepEqual(
    resolveLodCrossfadeTargets({
      lowerReady: true,
      lowerVisibility: 1,
      upperReady: true,
      upperVisibility: 0.4,
    }),
    { lower: 0.6, upper: 0.4 },
  );
  assert.deepEqual(
    resolveLodCrossfadeTargets({
      lowerReady: true,
      lowerVisibility: 1,
      upperReady: true,
      upperVisibility: 1,
    }),
    { lower: 0, upper: 1 },
    "fully presented site terrain must retire capital terrain",
  );
});

test("reverse zoom holds the outgoing site until capital is ready", () => {
  assert.deepEqual(
    resolveLodCrossfadeTargets({
      currentLowerOpacity: 0,
      currentUpperOpacity: 1,
      lowerReady: false,
      lowerVisibility: 1,
      upperReady: true,
      upperVisibility: 0,
    }),
    { lower: 0, upper: 1 },
  );
  assert.deepEqual(
    resolveLodCrossfadeTargets({
      currentLowerOpacity: 0,
      currentUpperOpacity: 1,
      lowerReady: true,
      lowerVisibility: 1,
      upperReady: true,
      upperVisibility: 0,
    }),
    { lower: 1, upper: 0 },
  );
});

test("territory renderer consumes cohort epochs and retains outgoing sources", async () => {
  const source = await readFile(
    path.join(
      process.cwd(),
      "features",
      "career-world",
      "layers",
      "terrain",
      "components",
      "TerritoryLandform.tsx",
    ),
    "utf8",
  );

  assert.match(
    source,
    /capitalCohortRef\.current = resolveLodCohortTransition\(\s*visibleCapitalKeys,\s*decodedStreamKeysRef\.current,\s*capitalCohortRef\.current,\s*now,/,
  );
  assert.match(
    source,
    /siteCohortRef\.current = resolveLodCohortTransition\(\s*visibleSiteKeys,\s*decodedStreamKeysRef\.current,\s*siteCohortRef\.current,\s*now,/,
  );
  assert.match(
    source,
    /const sourceOpacity = resolveLodCohortKeyOpacity\(\s*cohort,\s*key,\s*now,/,
    "stream presentation must crossfade cohorts per key, not per decode",
  );
  assert.match(
    source,
    /detailPlateDecodedAtRef\.current !== null[\s\S]*resolveLodSourceOpacity\(detailPlateDecodedAtRef\.current, now\)/,
    "a late territory plate must fade in instead of appearing at full semantic weight",
  );
  assert.match(source, /const pixelRatio = settledPixelRatio;/);
  assert.doesNotMatch(source, /Math\.min\(window\.devicePixelRatio \|\| 1, 1\.25\)/);
  assert.match(
    source,
    /const crossfadeTargets = resolveLodCrossfadeTargets\([\s\S]*let capitalTarget = crossfadeTargets\.lower;[\s\S]*let siteTarget = crossfadeTargets\.upper;/,
  );
  assert.match(
    source,
    /const retainCapitalPresentation = \([\s\S]*shouldRetainLodSource\([\s\S]*const retainSitePresentation = \([\s\S]*shouldRetainLodSource\(/,
  );
  assert.match(
    source,
    /retainCapitalPresentation && needsCapitalFallback[\s\S]*retainSitePresentation/,
    "capital sources must survive their outgoing fade and retire after site takeover",
  );
  assert.match(
    source,
    /const baseReplacementReady = \([\s\S]*!detailState\.shouldLoadCapitalAssets[\s\S]*&& baseReplacementReady/,
    "reverse zoom may fade to the decoded world or territory replacement",
  );
  assert.match(
    source,
    /!detailPlateRetired[\s\S]*\|\| detailState\.shouldLoadSiteAssets[\s\S]*requestAnimationFrame\(\(\) => \{[\s\S]*setDetailPlateRetired\(false\)/,
    "the territory plate must restart loading before the outgoing site fade ends",
  );
  assert.match(
    source,
    /const presentationRetainedKeys =[\s\S]*resolveRetainedLodPresentationKeys\([\s\S]*pinnedSourceKeys: new Set\(presentationRetainedKeys\)[\s\S]*\.\.\.presentationRetainedKeys/,
    "decoded outgoing cohorts must be pinned in the residency budget",
  );
  assert.doesNotMatch(source, /capitalWasPresented|siteWasPresented/);
  assert.doesNotMatch(
    source,
    /resolveLodSourceOpacity\(decodedAt, now\)/,
    "individual decode timestamps would make tile order visible",
  );
});
