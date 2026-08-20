import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import sharp from "sharp";

import {
  ninjaOneCapitalCityAssetVariant,
  ninjaOneCapitalVisibleCityLayerNodes,
  ninjaOneCapitalVisibleDistrictDetailNodes,
  ninjaOneCapitalVisibleRegisteredDetailNodes,
  NINJAONE_CAPITAL_D05_DETAIL_ASSET_IDS,
  NINJAONE_CAPITAL_CITY_LAYER_NODES,
} from "../features/career-world/layers/city/model/ninjaOneCapitalCityLayer.ts";
import {
  constrainNinjaOneCapitalCityProofCamera,
  NINJAONE_CAPITAL_CITY_DETAIL_POLICY,
  NINJAONE_CAPITAL_CITY_PROOF_CAMERAS,
  NINJAONE_CAPITAL_CITY_PROOF_LOCAL_WIDTHS,
  NINJAONE_CAPITAL_CITY_PROOF_TIERS,
  NINJAONE_CAPITAL_CITY_WHOLE_CITY_PROXY,
  ninjaOneCapitalCityDistrictAtWorldPoint,
  ninjaOneCapitalCityFocusedDistrict,
  ninjaOneCapitalCityProofDistrict,
  ninjaOneCapitalCityRepresentationMode,
  ninjaOneCapitalCityUsesFreeCameraDetailCohort,
  resolveNinjaOneCapitalDetailState,
} from "../features/career-world/layers/city/model/ninjaOneCapitalCityRepresentations.ts";
import { resolveDetailState } from "../features/career-world/shared/lod/policy.ts";

const CITY_LAYER_IDS = Object.freeze([
  "L4_1",
  "L4_2",
  "L4_3",
  "L4_4",
  "L4_5",
  "L4_6",
  "L4_7",
]);

const CLOSE_D06_NODE_IDS = Object.freeze([
  "fabric-station-close-civic-overlay",
  "transport-station-site-composite",
]);

function d06ProofNodes(tier) {
  const camera = tier === "capital"
    ? NINJAONE_CAPITAL_CITY_PROOF_CAMERAS.capital
    : NINJAONE_CAPITAL_CITY_PROOF_CAMERAS[`d06-${tier}`];
  return CITY_LAYER_IDS.flatMap((layerId) => (
    ninjaOneCapitalVisibleCityLayerNodes(
      camera,
      tier,
      layerId,
      tier === "capital" ? null : "D06",
    )
  )).filter(({ registrationBinding }) => (
    registrationBinding.kind === "d06-proof-registered-anchor"
  ));
}

test("D06 station routing keeps capital, site, and close representations exclusive", () => {
  const capitalNodes = d06ProofNodes("capital");
  assert.deepEqual(
    capitalNodes.map(({ id }) => id),
    ["transport-station-capital-cluster"],
  );
  assert.equal(capitalNodes[0].assetId, "I13");
  assert.deepEqual(Object.keys(capitalNodes[0].asset.variants), ["capital"]);
  assert.match(
    ninjaOneCapitalCityAssetVariant(capitalNodes[0], "capital").path,
    /\/capital\/infrastructure\/I13-station-capital-cluster-r1-alpha\.png$/,
  );

  const siteNodes = d06ProofNodes("site");
  assert.deepEqual(
    siteNodes.map(({ id }) => id),
    ["transport-station-site-composite"],
  );
  assert.equal(siteNodes[0].assetId, "I16");
  assert.equal(siteNodes[0].representationClass, "registered-district-base");
  assert.deepEqual(Object.keys(siteNodes[0].asset.variants).sort(), ["close", "site"]);
  assert.match(
    ninjaOneCapitalCityAssetVariant(siteNodes[0], "site").path,
    /\/site\/infrastructure\/I16-station-site-composite-r1-alpha\.png$/,
  );

  const closeNodes = d06ProofNodes("close");
  assert.deepEqual(
    closeNodes.map(({ id }) => id).sort(),
    [...CLOSE_D06_NODE_IDS].sort(),
  );
  assert.equal(closeNodes.some(({ assetId }) => assetId === "I13"), false);
  const closeBaseNode = closeNodes.find(({ assetId }) => assetId === "I16");
  const closeOverlayNode = closeNodes.find(({ assetId }) => assetId === "I17");
  assert.ok(closeBaseNode);
  assert.ok(closeOverlayNode);
  assert.equal(closeOverlayNode.representationClass, "registered-close-overlay");
  assert.deepEqual(Object.keys(closeOverlayNode.asset.variants), ["close"]);
  assert.match(
    ninjaOneCapitalCityAssetVariant(closeBaseNode, "close").path,
    /\/close\/infrastructure\/I16-station-site-composite-r1-alpha\.png$/,
  );
  assert.match(
    ninjaOneCapitalCityAssetVariant(closeOverlayNode, "close").path,
    /\/close\/infrastructure\/I17-station-close-civic-overlay-r1-alpha\.png$/,
  );
  assert.deepEqual(
    {
      anchor: closeBaseNode.anchor,
      displayWidth: closeBaseNode.displayWidth,
      sourceDimensions: closeBaseNode.asset.source.dimensions,
    },
    {
      anchor: siteNodes[0].anchor,
      displayWidth: siteNodes[0].displayWidth,
      sourceDimensions: siteNodes[0].asset.source.dimensions,
    },
    "SITE and CLOSE must preserve identical parent-space base bounds",
  );
  const legacyIds = [
    "actor-intercity-train",
    "transport-arrivals-hall",
    "transport-departures-hall",
    "transport-station-straight-terrace-base",
  ];
  assert.ok(NINJAONE_CAPITAL_CITY_LAYER_NODES
    .filter(({ id }) => legacyIds.includes(id))
    .every(({ representationClass }) => (
      representationClass === "legacy-nonconforming-close-candidate"
    )));
});

test("site and close promote only package-registered architectural detail", () => {
  for (const tier of ["site", "close"]) {
    const camera = NINJAONE_CAPITAL_CITY_PROOF_CAMERAS[`d06-${tier}`];
    const nodes = ninjaOneCapitalVisibleRegisteredDetailNodes(
      camera,
      tier,
      ["L4_2", "L4_3"],
    );
    assert.ok(nodes.length > 0);
    assert.ok(nodes.every(({ layerId, registrationBinding }) => (
      (layerId === "L4_2" || layerId === "L4_3")
      && registrationBinding.kind === "package-registered-anchor"
    )));
    assert.ok(nodes.every((node) => (
      !["I07", "I11", "F01", "F02", "F03", "F04"].includes(node.assetId)
      && ninjaOneCapitalCityAssetVariant(node, tier).path.includes(`/${tier}/`)
    )));
  }
});

test("D05 site and close admit only the five package-registered district sockets", () => {
  for (const tier of ["site", "close"]) {
    const nodes = ninjaOneCapitalVisibleDistrictDetailNodes(
      NINJAONE_CAPITAL_CITY_PROOF_CAMERAS[`d05-${tier}`],
      tier,
      ["L4_3"],
      "D05",
    );
    assert.deepEqual(
      nodes.map(({ assetId }) => assetId).sort(),
      [...NINJAONE_CAPITAL_D05_DETAIL_ASSET_IDS].sort(),
    );
    assert.ok(nodes.every(({ registrationBinding }) => (
      registrationBinding.kind === "package-registered-anchor"
    )));
    assert.ok(nodes.every((node) => (
      ninjaOneCapitalCityAssetVariant(node, tier).path.includes(`/${tier}/`)
    )));
  }
  assert.deepEqual(
    ninjaOneCapitalVisibleDistrictDetailNodes(
      NINJAONE_CAPITAL_CITY_PROOF_CAMERAS["d06-site"],
      "site",
      ["L4_3"],
      "D06",
    ),
    [],
  );
});

test("only free-camera site uses the currently registered detail cohort", () => {
  assert.equal(ninjaOneCapitalCityUsesFreeCameraDetailCohort("capital", null), false);
  assert.equal(ninjaOneCapitalCityUsesFreeCameraDetailCohort("site", null), true);
  assert.equal(ninjaOneCapitalCityUsesFreeCameraDetailCohort("close", null), false);
  assert.equal(ninjaOneCapitalCityUsesFreeCameraDetailCohort("site", "D05"), false);
  assert.equal(ninjaOneCapitalCityUsesFreeCameraDetailCohort("close", "D05"), false);
  assert.equal(ninjaOneCapitalCityUsesFreeCameraDetailCohort("site", "D06"), false);
  assert.equal(ninjaOneCapitalCityUsesFreeCameraDetailCohort("close", "D06"), false);
});

test("I16 and I17 site/close deliveries preserve alpha without chroma-green fringe", async () => {
  const siteNode = d06ProofNodes("site")[0];
  const closeNode = d06ProofNodes("close").find(({ assetId }) => assetId === "I16");
  const closeOverlayNode = d06ProofNodes("close").find(({ assetId }) => assetId === "I17");
  for (const [tier, node] of [
    ["site", siteNode],
    ["close", closeNode],
    ["close", closeOverlayNode],
  ]) {
    const variant = ninjaOneCapitalCityAssetVariant(node, tier);
    const bytes = await readFile(new URL(`../public${variant.path}`, import.meta.url));
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    });
    const cornerOffsets = [
      0,
      (info.width - 1) * 4,
      info.width * (info.height - 1) * 4,
      (info.width * info.height - 1) * 4,
    ];
    assert.ok(cornerOffsets.every((offset) => data[offset + 3] === 0));
    for (let offset = 0; offset < data.length; offset += 4) {
      assert.equal(
        data[offset + 3] > 0
          && data[offset + 1] > data[offset] * 1.4
          && data[offset + 1] > data[offset + 2] * 1.4
          && data[offset + 1] > 90,
        false,
      );
    }
  }
  assert.ok(
    ninjaOneCapitalCityAssetVariant(closeNode, "close").dimensions[0]
      > ninjaOneCapitalCityAssetVariant(siteNode, "site").dimensions[0],
  );
});

test("city tiers select explicit district-exclusive representation modes", () => {
  assert.equal(ninjaOneCapitalCityRepresentationMode("world", null), "world-marker");
  assert.equal(
    ninjaOneCapitalCityRepresentationMode("territory", null),
    "world-marker",
  );
  assert.equal(
    ninjaOneCapitalCityRepresentationMode("capital", null),
    "capital-incremental-context",
  );
  assert.equal(
    ninjaOneCapitalCityRepresentationMode("site", "D05"),
    "d05-site-composite",
  );
  assert.equal(
    ninjaOneCapitalCityRepresentationMode("close", "D05"),
    "d05-close-composite",
  );
  assert.equal(
    ninjaOneCapitalCityRepresentationMode("site", "D06"),
    "d06-site-composite",
  );
  assert.equal(
    ninjaOneCapitalCityRepresentationMode("close", "D06"),
    "d06-close-composite",
  );
  assert.equal(
    ninjaOneCapitalCityRepresentationMode("site", null),
    "capital-incremental-context",
  );
});

test("fixed proof cameras preserve their requested tier and district aspect", () => {
  for (const [viewId, camera] of Object.entries(NINJAONE_CAPITAL_CITY_PROOF_CAMERAS)) {
    assert.equal(
      resolveNinjaOneCapitalDetailState(camera).tier.id,
      NINJAONE_CAPITAL_CITY_PROOF_TIERS[viewId],
      `${viewId} must resolve its declared proof tier`,
    );
    assert.doesNotThrow(() => resolveNinjaOneCapitalDetailState(
      camera,
      NINJAONE_CAPITAL_CITY_PROOF_TIERS[viewId],
    ));
  }
  for (const viewId of ["d05-site", "d05-close", "d06-site", "d06-close"]) {
    const camera = NINJAONE_CAPITAL_CITY_PROOF_CAMERAS[viewId];
    assert.ok(Math.abs(camera.span[0] / camera.span[1] - 0.75) < 1e-9);
    const localWidth = camera.span[0] / 0.25 * 1448;
    assert.ok(Math.abs(localWidth - NINJAONE_CAPITAL_CITY_PROOF_LOCAL_WIDTHS[viewId]) < 1e-9);
    const constrained = constrainNinjaOneCapitalCityProofCamera(
      viewId,
      { origin: [1, 1], span: [1, 1] },
    );
    assert.deepEqual(constrained.span, camera.span);
    assert.ok(constrained.origin[0] >= 0.125);
    assert.ok(constrained.origin[1] >= 0);
    assert.ok(constrained.origin[0] + constrained.span[0] <= 0.375);
    assert.ok(constrained.origin[1] + constrained.span[1] <= 1 / 3);
    assert.equal(
      resolveNinjaOneCapitalDetailState(constrained).tier.id,
      NINJAONE_CAPITAL_CITY_PROOF_TIERS[viewId],
    );
  }
});

test("NinjaOne capital interactive thresholds match parent composition framing only in its envelope", () => {
  const centered = (maximumSpan) => ({
    origin: [0.25 - maximumSpan * 0.75 * 0.5, 1 / 6 - maximumSpan * 0.5],
    span: [maximumSpan * 0.75, maximumSpan],
  });
  assert.equal(resolveNinjaOneCapitalDetailState(centered(1 / 3)).tier.id, "capital");
  assert.equal(resolveNinjaOneCapitalDetailState(centered(0.251)).tier.id, "capital");
  assert.equal(resolveNinjaOneCapitalDetailState(centered(0.25)).tier.id, "site");
  assert.equal(resolveNinjaOneCapitalDetailState(centered(0.206)).tier.id, "site");
  assert.equal(resolveNinjaOneCapitalDetailState(centered(0.205)).tier.id, "close");
  assert.equal(
    resolveNinjaOneCapitalDetailState(
      centered(NINJAONE_CAPITAL_CITY_DETAIL_POLICY.siteAssetPreloadSpan),
    ).shouldLoadSiteAssets,
    true,
  );
  assert.equal(
    resolveNinjaOneCapitalDetailState(
      centered(NINJAONE_CAPITAL_CITY_DETAIL_POLICY.closeAssetPreloadSpan),
    ).shouldLoadCloseAssets,
    true,
  );

  const outsideCapital = { origin: [0.55, 0.55], span: [0.1875, 0.25] };
  assert.equal(resolveNinjaOneCapitalDetailState(outsideCapital).tier.id, "capital");
  assert.equal(
    resolveNinjaOneCapitalDetailState(outsideCapital).tier.id,
    resolveDetailState(outsideCapital).tier.id,
  );
  assert.throws(
    () => resolveNinjaOneCapitalDetailState(
      NINJAONE_CAPITAL_CITY_PROOF_CAMERAS["d06-site"],
      "close",
    ),
    /proof tier close disagrees with camera tier site/,
  );
});

test("district focus requires explicit selection instead of viewport coincidence", () => {
  assert.equal(ninjaOneCapitalCityFocusedDistrict("site", "D05"), "D05");
  assert.equal(ninjaOneCapitalCityFocusedDistrict("close", "D05"), "D05");
  assert.equal(
    ninjaOneCapitalCityFocusedDistrict(
      "site",
      "D06",
    ),
    "D06",
  );
  assert.equal(
    ninjaOneCapitalCityFocusedDistrict(
      "close",
      "D06",
    ),
    "D06",
  );
  assert.equal(
    ninjaOneCapitalCityFocusedDistrict(
      "site",
      null,
    ),
    null,
  );
  assert.equal(ninjaOneCapitalCityFocusedDistrict("site", null, "D06"), "D06");
  assert.equal(ninjaOneCapitalCityFocusedDistrict("site", null, "D05"), "D05");
});

test("district selection is registered to replacement regions, not visible focal points", () => {
  const localToWorld = ([x, y]) => [
    0.125 + x / 1448 * 0.25,
    y / 1086 / 3,
  ];
  assert.equal(
    ninjaOneCapitalCityDistrictAtWorldPoint(localToWorld([1056.5, 900])),
    "D06",
  );
  assert.equal(
    ninjaOneCapitalCityDistrictAtWorldPoint(localToWorld([1056.5, 700])),
    null,
  );
  assert.equal(
    ninjaOneCapitalCityDistrictAtWorldPoint(localToWorld([400, 900])),
    "D05",
  );
  assert.equal(ninjaOneCapitalCityDistrictAtWorldPoint(localToWorld([700, 700])), null);
});

test("proof routes force only their registered district", () => {
  assert.equal(ninjaOneCapitalCityProofDistrict("d05-site"), "D05");
  assert.equal(ninjaOneCapitalCityProofDistrict("d05-close"), "D05");
  assert.equal(ninjaOneCapitalCityProofDistrict("d06-site"), "D06");
  assert.equal(ninjaOneCapitalCityProofDistrict("d06-close"), "D06");
  assert.equal(ninjaOneCapitalCityProofDistrict("capital"), null);
});

test("city proof renderer fills the viewport and locks fixed proof zoom", async () => {
  const [styles, scene] = await Promise.all([
    readFile(new URL("../features/career-world/styles/career-world.css", import.meta.url), "utf8"),
    readFile(new URL("../features/career-world/composition/WorldScene.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(
    styles,
    /\.ninjaone-capital-city \{[\s\S]*?width: 100%;[\s\S]*?height: 100%;[\s\S]*?overflow: visible;/,
  );
  assert.match(scene, /if \(cityProofView\) return;/);
  assert.match(scene, /constrainNinjaOneCapitalCityProofCamera\(cityProofView, normalized\)/);
  assert.match(scene, /resolveNinjaOneCapitalDetailState\(/);
});

test("unregistered inferred nodes are quarantined from every fixed LOD proof", () => {
  assert.ok(NINJAONE_CAPITAL_CITY_LAYER_NODES.some(
    ({ representationClass }) => representationClass === "unregistered-close-candidate",
  ));
  const proofCases = [
    ["world", NINJAONE_CAPITAL_CITY_PROOF_CAMERAS.world, null],
    ["territory", NINJAONE_CAPITAL_CITY_PROOF_CAMERAS.territory, null],
    ["capital", NINJAONE_CAPITAL_CITY_PROOF_CAMERAS.capital, null],
    ["site", NINJAONE_CAPITAL_CITY_PROOF_CAMERAS["d05-site"], "D05"],
    ["close", NINJAONE_CAPITAL_CITY_PROOF_CAMERAS["d05-close"], "D05"],
    ["site", NINJAONE_CAPITAL_CITY_PROOF_CAMERAS["d06-site"], "D06"],
    ["close", NINJAONE_CAPITAL_CITY_PROOF_CAMERAS["d06-close"], "D06"],
  ];
  for (const [tier, camera, district] of proofCases) {
    const nodes = CITY_LAYER_IDS.flatMap((layerId) => (
      ninjaOneCapitalVisibleCityLayerNodes(camera, tier, layerId, district)
    ));
    assert.equal(
      nodes.some(({ representationClass }) => (
        representationClass === "unregistered-close-candidate"
      )),
      false,
      `${tier} admitted an inferred placement`,
    );
  }
});

test("P01 context preserves unconverted city while broadly excluding registered D06", async () => {
  const proxy = NINJAONE_CAPITAL_CITY_WHOLE_CITY_PROXY;
  const contextPath = new URL(`../public${proxy.deliveries.context.path}`, import.meta.url);
  const sourcePath = new URL(`../${proxy.source.fullAlphaPath}`, import.meta.url);
  const d06 = proxy.replacedDistricts[0];
  const maskPath = new URL(`../public${d06.exclusionMask}`, import.meta.url);
  const [contextBytes, sourceBytes, maskBytes] = await Promise.all([
    readFile(contextPath),
    readFile(sourcePath),
    readFile(maskPath),
  ]);
  const [context, source, mask] = await Promise.all([
    sharp(contextBytes).resize(1448, 1086, { kernel: sharp.kernel.nearest })
      .ensureAlpha().raw().toBuffer(),
    sharp(sourceBytes).ensureAlpha().raw().toBuffer(),
    sharp(maskBytes).greyscale().raw().toBuffer(),
  ]);
  let broadMaskPixels = 0;
  let removedOpaquePixels = 0;
  let sourceOpaqueInMask = 0;
  let retainedOpaquePixels = 0;
  let sourceOpaqueOutsideMask = 0;
  for (let y = 0; y < 1086; y += 1) {
    for (let x = 0; x < 1448; x += 1) {
      const pixel = y * 1448 + x;
      const alphaOffset = pixel * 4 + 3;
      const maskX = x - d06.maskBounds.left;
      const maskY = y - d06.maskBounds.top;
      const insideCrop = maskX >= 0
        && maskY >= 0
        && maskX < d06.maskBounds.width
        && maskY < d06.maskBounds.height;
      const insideD06 = insideCrop
        && mask[maskY * d06.maskBounds.width + maskX] >= 250;
      if (insideD06) broadMaskPixels += 1;
      if (source[alphaOffset] <= 64) continue;
      if (insideD06) {
        sourceOpaqueInMask += 1;
        if (context[alphaOffset] <= 16) removedOpaquePixels += 1;
      } else {
        sourceOpaqueOutsideMask += 1;
        if (context[alphaOffset] > 16) retainedOpaquePixels += 1;
      }
    }
  }
  assert.ok(
    broadMaskPixels / (d06.maskBounds.width * d06.maskBounds.height) >= 0.65,
    "D06 exclusion must be a broad district polygon, not a rail-line mask",
  );
  assert.ok(sourceOpaqueInMask > 10_000, "D06 mask must intersect material city pixels");
  assert.ok(
    removedOpaquePixels / sourceOpaqueInMask >= 0.97,
    "P01 must not double-render the replaced D06 district",
  );
  assert.ok(
    retainedOpaquePixels / sourceOpaqueOutsideMask >= 0.97,
    "unconverted P01 districts must not disappear",
  );
});
