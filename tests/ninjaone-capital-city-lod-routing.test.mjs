import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import sharp from "sharp";

import {
  ninjaOneCapitalCityAssetVariant,
  ninjaOneCapitalVisibleCityLayerNodes,
  ninjaOneCapitalVisibleDistrictDetailNodes,
  ninjaOneCapitalVisibleRegisteredDetailNodes,
  NINJAONE_CAPITAL_D01_DETAIL_ASSET_IDS,
  NINJAONE_CAPITAL_D01_DETAIL_DISPLAY_WIDTHS,
  NINJAONE_CAPITAL_D02_DETAIL_ASSET_IDS,
  NINJAONE_CAPITAL_D02_DETAIL_DISPLAY_WIDTHS,
  NINJAONE_CAPITAL_D03_DETAIL_ASSET_IDS,
  NINJAONE_CAPITAL_D03_DETAIL_DISPLAY_WIDTHS,
  NINJAONE_CAPITAL_D04_DETAIL_ASSET_IDS,
  NINJAONE_CAPITAL_D04_DETAIL_DISPLAY_WIDTHS,
  NINJAONE_CAPITAL_D05_DETAIL_ASSET_IDS,
  NINJAONE_CAPITAL_D05_DETAIL_DISPLAY_WIDTHS,
  NINJAONE_CAPITAL_CITY_LAYER_NODES,
} from "../features/career-world/layers/city/model/ninjaOneCapitalCityLayer.ts";
import {
  NINJAONE_CAPITAL_D05_CANON_ONE_TO_ONE_MAXIMUM_SPAN,
  NINJAONE_CAPITAL_D05_CONCEPT,
  NINJAONE_CAPITAL_D05_CONCEPT_TIER_MAXIMUM_SPANS,
  ninjaOneCapitalD05WaterEffectTuning,
  ninjaOneCapitalD05ConceptTier,
  ninjaOneCapitalD05ConceptTierForSpan,
  ninjaOneCapitalD05ConceptTierWeights,
} from "../features/career-world/layers/city/model/ninjaOneCapitalD05Concept.ts";
import {
  NINJAONE_CAPITAL_CITY_R3_CONTEXT,
  NINJAONE_CAPITAL_CITY_R3_PROGRESSIVE_WATER_EXCLUSION_MASK,
} from "../features/career-world/layers/city/model/ninjaOneCapitalCityFoundationR3.ts";
import {
  NINJAONE_CAPITAL_D06_CANON,
  ninjaOneCapitalD06CanonTierWeights,
} from "../features/career-world/layers/city/model/ninjaOneCapitalD06Canon.ts";
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
    assert.deepEqual(
      Object.fromEntries(nodes.map(({ assetId, displayWidth }) => [assetId, displayWidth])),
      NINJAONE_CAPITAL_D05_DETAIL_DISPLAY_WIDTHS,
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

test("D01 site and close admit only the six calibrated crown sockets", () => {
  for (const tier of ["site", "close"]) {
    const nodes = ninjaOneCapitalVisibleDistrictDetailNodes(
      NINJAONE_CAPITAL_CITY_PROOF_CAMERAS[`d01-${tier}`],
      tier,
      ["L4_3"],
      "D01",
    );
    assert.deepEqual(
      nodes.map(({ assetId }) => assetId).sort(),
      [...NINJAONE_CAPITAL_D01_DETAIL_ASSET_IDS].sort(),
    );
    assert.deepEqual(
      Object.fromEntries(nodes.map(({ assetId, displayWidth }) => [assetId, displayWidth])),
      NINJAONE_CAPITAL_D01_DETAIL_DISPLAY_WIDTHS,
    );
    assert.ok(nodes.every(({ registrationBinding }) => (
      registrationBinding.kind === "package-registered-anchor"
    )));
    assert.ok(nodes.every((node) => (
      ninjaOneCapitalCityAssetVariant(node, tier).path.includes(`/${tier}/`)
    )));
  }
});

test("D01 calibrated crown is disjoint and the runtime context clip prevents skyline expansion", async () => {
  const nodes = ninjaOneCapitalVisibleDistrictDetailNodes(
    NINJAONE_CAPITAL_CITY_PROOF_CAMERAS["d01-close"],
    "close",
    ["L4_3"],
    "D01",
  );
  const contextBytes = await readFile(new URL(
    `../public${NINJAONE_CAPITAL_CITY_R3_CONTEXT.path}`,
    import.meta.url,
  ));
  const { data: context, info: contextInfo } = await sharp(contextBytes)
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const occupied = new Uint8Array(contextInfo.width * contextInfo.height);
  let pairOverlap = 0;
  let unclippedOutsideContext = 0;
  let clippedOutsideContext = 0;
  for (const node of nodes) {
    const variant = ninjaOneCapitalCityAssetVariant(node, "close");
    const height = Math.round(
      node.displayWidth * node.asset.source.dimensions[1] / node.asset.source.dimensions[0],
    );
    const variantBytes = await readFile(new URL(
      `../public${variant.path}`,
      import.meta.url,
    ));
    const { data, info } = await sharp(variantBytes)
      .resize(node.displayWidth, height).ensureAlpha().raw()
      .toBuffer({ resolveWithObject: true });
    const left = Math.round(node.anchor[0] - node.displayWidth * 0.5);
    const top = Math.round(node.anchor[1] - height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < node.displayWidth; x += 1) {
        const worldX = left + x;
        const worldY = top + y;
        if (worldX < 0 || worldY < 0
          || worldX >= contextInfo.width || worldY >= contextInfo.height) continue;
        const alpha = data[(y * node.displayWidth + x) * info.channels + 3];
        if (alpha < 16) continue;
        const pixelIndex = worldY * contextInfo.width + worldX;
        if (occupied[pixelIndex]) pairOverlap += 1;
        occupied[pixelIndex] = 1;
        const contextAlpha = context[pixelIndex * contextInfo.channels + 3];
        if (contextAlpha < 16) unclippedOutsideContext += 1;
        if (Math.round(alpha * contextAlpha / 255) >= 16 && contextAlpha < 16) {
          clippedOutsideContext += 1;
        }
      }
    }
  }
  assert.equal(pairOverlap, 0, "D01 calibrated node silhouettes must remain disjoint");
  assert.ok(unclippedOutsideContext > 0, "D01 must retain its explicit silhouette clip gate");
  assert.equal(clippedOutsideContext, 0, "D01 must not expand the existing city skyline");
});

test("D02 site and close admit only the registered dojo ridge sockets", () => {
  for (const tier of ["site", "close"]) {
    const nodes = ninjaOneCapitalVisibleDistrictDetailNodes(
      NINJAONE_CAPITAL_CITY_PROOF_CAMERAS[`d02-${tier}`],
      tier,
      ["L4_2", "L4_3"],
      "D02",
    );
    assert.deepEqual(
      nodes.map(({ assetId }) => assetId).sort(),
      [...NINJAONE_CAPITAL_D02_DETAIL_ASSET_IDS].sort(),
    );
    assert.deepEqual(
      Object.fromEntries(nodes.map(({ assetId, displayWidth }) => [assetId, displayWidth])),
      NINJAONE_CAPITAL_D02_DETAIL_DISPLAY_WIDTHS,
    );
    assert.ok(nodes.every(({ registrationBinding }) => (
      registrationBinding.kind === "package-registered-anchor"
    )));
    assert.ok(nodes.every((node) => (
      ninjaOneCapitalCityAssetVariant(node, tier).path.includes(`/${tier}/`)
    )));
  }
});

test("D03 site and close admit only the four water-safe eastern industry sockets", () => {
  for (const tier of ["site", "close"]) {
    const nodes = ninjaOneCapitalVisibleDistrictDetailNodes(
      NINJAONE_CAPITAL_CITY_PROOF_CAMERAS[`d03-${tier}`],
      tier,
      ["L4_3"],
      "D03",
    );
    assert.deepEqual(
      nodes.map(({ assetId }) => assetId).sort(),
      [...NINJAONE_CAPITAL_D03_DETAIL_ASSET_IDS].sort(),
    );
    assert.deepEqual(
      Object.fromEntries(nodes.map(({ assetId, displayWidth }) => [assetId, displayWidth])),
      NINJAONE_CAPITAL_D03_DETAIL_DISPLAY_WIDTHS,
    );
    assert.ok(nodes.every(({ registrationBinding }) => (
      registrationBinding.kind === "package-registered-anchor"
    )));
    assert.ok(nodes.every((node) => (
      ninjaOneCapitalCityAssetVariant(node, tier).path.includes(`/${tier}/`)
    )));
  }
});

test("D03 calibrated silhouettes do not repaint registered inland water", async () => {
  const nodes = ninjaOneCapitalVisibleDistrictDetailNodes(
    NINJAONE_CAPITAL_CITY_PROOF_CAMERAS["d03-close"],
    "close",
    ["L4_3"],
    "D03",
  );
  const waterBytes = await readFile(new URL(
    "../art-source/career-world/ninjaone-capital/city-r3/authority/live-inland-water-authority-mask-r1.png",
    import.meta.url,
  ));
  const { data: water, info: waterInfo } = await sharp(waterBytes)
    .greyscale().raw().toBuffer({ resolveWithObject: true });
  for (const node of nodes) {
    const variant = ninjaOneCapitalCityAssetVariant(node, "close");
    const height = Math.round(
      node.displayWidth * node.asset.source.dimensions[1] / node.asset.source.dimensions[0],
    );
    const variantBytes = await readFile(new URL(
      `../public${variant.path}`,
      import.meta.url,
    ));
    const { data, info } = await sharp(variantBytes)
      .resize(node.displayWidth, height).ensureAlpha().raw()
      .toBuffer({ resolveWithObject: true });
    const left = Math.round(node.anchor[0] - node.displayWidth * 0.5);
    const top = Math.round(node.anchor[1] - height);
    let waterOverlap = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < node.displayWidth; x += 1) {
        const alpha = data[(y * node.displayWidth + x) * info.channels + 3];
        const waterIndex = ((top + y) * waterInfo.width + left + x) * waterInfo.channels;
        if (alpha >= 16 && water[waterIndex] >= 128) waterOverlap += 1;
      }
    }
    assert.equal(waterOverlap, 0, `${node.assetId} overlaps registered water`);
  }
});

test("D04 site and close keep the two dry-fabric sockets independently registered", () => {
  for (const tier of ["site", "close"]) {
    const nodes = ninjaOneCapitalVisibleDistrictDetailNodes(
      NINJAONE_CAPITAL_CITY_PROOF_CAMERAS[`d04-${tier}`],
      tier,
      ["L4_3"],
      "D04",
    );
    assert.deepEqual(
      nodes.map(({ assetId }) => assetId).sort(),
      [...NINJAONE_CAPITAL_D04_DETAIL_ASSET_IDS].sort(),
    );
    assert.deepEqual(
      Object.fromEntries(nodes.map(({ assetId, displayWidth }) => [assetId, displayWidth])),
      NINJAONE_CAPITAL_D04_DETAIL_DISPLAY_WIDTHS,
    );
    assert.ok(nodes.every(({ registrationBinding }) => (
      registrationBinding.kind === "package-registered-anchor"
    )));
    assert.ok(nodes.every((node) => (
      ninjaOneCapitalCityAssetVariant(node, tier).path.includes(`/${tier}/`)
    )));
  }
});

test("D04 dry-fabric clipping preserves registered water around S02 and S04", async () => {
  const nodes = ninjaOneCapitalVisibleDistrictDetailNodes(
    NINJAONE_CAPITAL_CITY_PROOF_CAMERAS["d04-close"],
    "close",
    ["L4_3"],
    "D04",
  );
  const [contextBytes, waterBytes] = await Promise.all([
    readFile(new URL(`../public${NINJAONE_CAPITAL_CITY_R3_CONTEXT.path}`, import.meta.url)),
    readFile(new URL(
      `../public${NINJAONE_CAPITAL_CITY_R3_PROGRESSIVE_WATER_EXCLUSION_MASK.path}`,
      import.meta.url,
    )),
  ]);
  const [{ data: context, info: contextInfo }, { data: water, info: waterInfo }] = await Promise.all([
    sharp(contextBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(waterBytes).greyscale().raw().toBuffer({ resolveWithObject: true }),
  ]);
  let rawWaterOverlap = 0;
  let clippedWaterOverlap = 0;
  let clippedOutsideContext = 0;
  for (const node of nodes) {
    const variant = ninjaOneCapitalCityAssetVariant(node, "close");
    const height = Math.round(
      node.displayWidth * node.asset.source.dimensions[1] / node.asset.source.dimensions[0],
    );
    const variantBytes = await readFile(new URL(`../public${variant.path}`, import.meta.url));
    const { data, info } = await sharp(variantBytes)
      .resize(node.displayWidth, height).ensureAlpha().raw()
      .toBuffer({ resolveWithObject: true });
    const left = Math.round(node.anchor[0] - node.displayWidth * 0.5);
    const top = Math.round(node.anchor[1] - height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < node.displayWidth; x += 1) {
        const worldX = left + x;
        const worldY = top + y;
        if (worldX < 0 || worldY < 0
          || worldX >= contextInfo.width || worldY >= contextInfo.height) continue;
        const alpha = data[(y * node.displayWidth + x) * info.channels + 3];
        if (alpha < 16) continue;
        const pixelIndex = worldY * contextInfo.width + worldX;
        const contextAlpha = context[pixelIndex * contextInfo.channels + 3];
        const isWater = water[pixelIndex * waterInfo.channels] >= 128;
        if (isWater) rawWaterOverlap += 1;
        const clippedAlpha = isWater ? 0 : Math.round(alpha * contextAlpha / 255);
        if (clippedAlpha >= 16 && isWater) clippedWaterOverlap += 1;
        if (clippedAlpha >= 16 && contextAlpha < 16) clippedOutsideContext += 1;
      }
    }
  }
  assert.ok(rawWaterOverlap > 0, "D04 must retain its explicit dry-fabric clip gate");
  assert.equal(clippedWaterOverlap, 0, "D04 progressive nodes must not repaint registered water");
  assert.equal(clippedOutsideContext, 0, "D04 progressive nodes must not expand city fabric");
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
    ninjaOneCapitalCityRepresentationMode("site", "D01"),
    "d01-site-composite",
  );
  assert.equal(
    ninjaOneCapitalCityRepresentationMode("close", "D01"),
    "d01-close-composite",
  );
  assert.equal(
    ninjaOneCapitalCityRepresentationMode("site", "D02"),
    "d02-site-composite",
  );
  assert.equal(
    ninjaOneCapitalCityRepresentationMode("close", "D02"),
    "d02-close-composite",
  );
  assert.equal(
    ninjaOneCapitalCityRepresentationMode("site", "D03"),
    "d03-site-composite",
  );
  assert.equal(
    ninjaOneCapitalCityRepresentationMode("close", "D03"),
    "d03-close-composite",
  );
  assert.equal(
    ninjaOneCapitalCityRepresentationMode("site", "D04"),
    "d04-site-composite",
  );
  assert.equal(
    ninjaOneCapitalCityRepresentationMode("close", "D04"),
    "d04-close-composite",
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
      resolveNinjaOneCapitalDetailState(
        camera,
        NINJAONE_CAPITAL_CITY_PROOF_TIERS[viewId],
      ).tier.id,
      NINJAONE_CAPITAL_CITY_PROOF_TIERS[viewId],
      `${viewId} must resolve its declared proof tier`,
    );
    assert.doesNotThrow(() => resolveNinjaOneCapitalDetailState(
      camera,
      NINJAONE_CAPITAL_CITY_PROOF_TIERS[viewId],
    ));
  }
  for (const viewId of [
    "d02-site",
    "d02-close",
    "d03-site",
    "d03-close",
    "d04-site",
    "d04-close",
    "d05-site",
    "d05-close",
    "d06-site",
    "d06-close",
  ]) {
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
      resolveNinjaOneCapitalDetailState(
        constrained,
        NINJAONE_CAPITAL_CITY_PROOF_TIERS[viewId],
      ).tier.id,
      NINJAONE_CAPITAL_CITY_PROOF_TIERS[viewId],
    );
  }
});

test("NinjaOne capital interactive thresholds stay local while proof framing remains independent", () => {
  const centered = (maximumSpan) => ({
    origin: [0.25 - maximumSpan * 0.75 * 0.5, 1 / 6 - maximumSpan * 0.5],
    span: [maximumSpan * 0.75, maximumSpan],
  });
  assert.equal(resolveNinjaOneCapitalDetailState(centered(1 / 3)).tier.id, "capital");
  assert.equal(
    resolveNinjaOneCapitalDetailState(centered(
      NINJAONE_CAPITAL_CITY_DETAIL_POLICY.tierMaximumSpan.site + 0.001,
    )).tier.id,
    "capital",
  );
  assert.equal(
    resolveNinjaOneCapitalDetailState(centered(
      NINJAONE_CAPITAL_CITY_DETAIL_POLICY.tierMaximumSpan.site,
    )).tier.id,
    "site",
  );
  assert.equal(
    resolveNinjaOneCapitalDetailState(centered(
      NINJAONE_CAPITAL_CITY_DETAIL_POLICY.tierMaximumSpan.close + 0.001,
    )).tier.id,
    "site",
  );
  assert.equal(
    resolveNinjaOneCapitalDetailState(centered(
      NINJAONE_CAPITAL_CITY_DETAIL_POLICY.tierMaximumSpan.close,
    )).tier.id,
    "close",
  );
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
  assert.equal(
    resolveNinjaOneCapitalDetailState(
      NINJAONE_CAPITAL_CITY_PROOF_CAMERAS["d06-site"],
      "close",
    ).tier.id,
    "close",
  );
});

test("free-camera site and close derive progressive district focus from the registered camera center", () => {
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
  assert.equal(ninjaOneCapitalCityFocusedDistrict("capital", "D05"), null);
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

test("WorldScene routes normal camera ownership into progressive city focus", async () => {
  const scene = await readFile(new URL(
    "../features/career-world/composition/WorldScene.tsx",
    import.meta.url,
  ), "utf8");
  assert.match(
    scene,
    /cameraCityDistrict = ninjaOneCapitalCityDistrictAtWorldPoint\(\[[\s\S]*?camera\.origin\[0\] \+ camera\.span\[0\] \* 0\.5,[\s\S]*?camera\.origin\[1\] \+ camera\.span\[1\] \* 0\.5,[\s\S]*?\]\)/,
  );
  assert.match(
    scene,
    /ninjaOneCapitalCityFocusedDistrict\([\s\S]*?detailState\.tier\.id,[\s\S]*?cameraCityDistrict,[\s\S]*?forcedCityDistrict/,
  );
  assert.doesNotMatch(
    scene,
    /ninjaOneCapitalCityFocusedDistrict\([\s\S]*?detailState\.tier\.id,[\s\S]*?null,[\s\S]*?forcedCityDistrict/,
  );
});

test("district selection is registered to replacement regions, not visible focal points", () => {
  const localToWorld = ([x, y]) => [
    0.125 + x / 1448 * 0.25,
    y / 1086 / 3,
  ];
  assert.equal(
    ninjaOneCapitalCityDistrictAtWorldPoint(localToWorld([1333, 300])),
    "D02",
  );
  assert.equal(
    ninjaOneCapitalCityDistrictAtWorldPoint(localToWorld([495, 212])),
    "D01",
  );
  assert.equal(
    ninjaOneCapitalCityDistrictAtWorldPoint(localToWorld([662, 236])),
    "D01",
  );
  assert.equal(
    ninjaOneCapitalCityDistrictAtWorldPoint(localToWorld([765, 330])),
    "D01",
  );
  assert.equal(
    ninjaOneCapitalCityDistrictAtWorldPoint(localToWorld([539, 462])),
    "D01",
  );
  assert.equal(
    ninjaOneCapitalCityDistrictAtWorldPoint(localToWorld([348, 300])),
    "D01",
  );
  assert.equal(
    ninjaOneCapitalCityDistrictAtWorldPoint(localToWorld([706, 481])),
    "D01",
  );
  assert.equal(
    ninjaOneCapitalCityDistrictAtWorldPoint(localToWorld([1100, 550])),
    "D03",
  );
  assert.equal(
    ninjaOneCapitalCityDistrictAtWorldPoint(localToWorld([1056.5, 900])),
    "D06",
  );
  assert.equal(
    ninjaOneCapitalCityDistrictAtWorldPoint(localToWorld([1056.5, 700])),
    "D03",
  );
  assert.equal(
    ninjaOneCapitalCityDistrictAtWorldPoint(localToWorld([397, 521])),
    "D04",
  );
  assert.equal(
    ninjaOneCapitalCityDistrictAtWorldPoint(localToWorld([250, 506])),
    "D04",
  );
  assert.equal(
    ninjaOneCapitalCityDistrictAtWorldPoint(localToWorld([794, 731])),
    "D04",
  );
  assert.equal(
    ninjaOneCapitalCityDistrictAtWorldPoint(localToWorld([400, 900])),
    "D05",
  );
  assert.equal(ninjaOneCapitalCityDistrictAtWorldPoint(localToWorld([700, 700])), null);
});

test("proof routes force only their registered district", () => {
  assert.equal(ninjaOneCapitalCityProofDistrict("d01-site"), "D01");
  assert.equal(ninjaOneCapitalCityProofDistrict("d01-close"), "D01");
  assert.equal(ninjaOneCapitalCityProofDistrict("d02-site"), "D02");
  assert.equal(ninjaOneCapitalCityProofDistrict("d02-close"), "D02");
  assert.equal(ninjaOneCapitalCityProofDistrict("d03-site"), "D03");
  assert.equal(ninjaOneCapitalCityProofDistrict("d03-close"), "D03");
  assert.equal(ninjaOneCapitalCityProofDistrict("d04-site"), "D04");
  assert.equal(ninjaOneCapitalCityProofDistrict("d04-close"), "D04");
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

test("D05 canon pyramid serves capital, site, and close through one registered geometry", async () => {
  const [registrationBytes, provenanceBytes, t47ProvenanceBytes, t47R1ProvenanceBytes, t48AuditBytes, usableMaskBytes, shimmerMaskBytes] = await Promise.all([
    readFile(new URL(`../public${NINJAONE_CAPITAL_D05_CONCEPT.registrationPath}`, import.meta.url)),
    readFile(new URL(`../public${NINJAONE_CAPITAL_D05_CONCEPT.provenancePath}`, import.meta.url)),
    readFile(new URL("../public/career-world/capitals/ninjaone/city-v2/canon/d05-canon-ocean-removal-r2.provenance.json", import.meta.url)),
    readFile(new URL("../public/career-world/capitals/ninjaone/city-v2/canon/d05-canon-ocean-removal-r1.provenance.json", import.meta.url)),
    readFile(new URL("../public/career-world/capitals/ninjaone/city-v2/derived/territory-register-r1.provenance.json", import.meta.url)),
    readFile(new URL(`../public${NINJAONE_CAPITAL_D05_CONCEPT.usableMask.path}`, import.meta.url)),
    readFile(new URL(`../public${NINJAONE_CAPITAL_D05_CONCEPT.foliageShimmerMask.path}`, import.meta.url)),
  ]);
  const registration = JSON.parse(registrationBytes.toString("utf8"));
  const provenance = JSON.parse(provenanceBytes.toString("utf8"));
  const t47Provenance = JSON.parse(t47ProvenanceBytes.toString("utf8"));
  const t47R1Provenance = JSON.parse(t47R1ProvenanceBytes.toString("utf8"));
  const t48Audit = JSON.parse(t48AuditBytes.toString("utf8"));
  const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
  const tiers = [
    ["capital", "capital"],
    ["site", "site"],
    ["close", "close"],
  ];

  assert.equal(sha256(registrationBytes), provenance.registration.sha256);
  assert.equal(sha256(usableMaskBytes), registration.mask.sha256);
  assert.deepEqual(NINJAONE_CAPITAL_D05_CONCEPT.masterBounds, registration.destinationMasterBounds);
  assert.deepEqual(provenance.registration.destinationMasterBounds, registration.destinationMasterBounds);
  assert.deepEqual(NINJAONE_CAPITAL_D05_CONCEPT.usableMask.dimensions, registration.mask.dimensions);
  assert.deepEqual(NINJAONE_CAPITAL_D05_CONCEPT.foliageShimmerMask.dimensions, registration.mask.dimensions);

  for (const [zoomTier, provenanceTier] of tiers) {
    const tier = ninjaOneCapitalD05ConceptTier(zoomTier);
    const tierBytes = await readFile(new URL(`../public${tier.path}`, import.meta.url));
    const metadata = await sharp(tierBytes).metadata();
    assert.equal(NINJAONE_CAPITAL_D05_CONCEPT.tiers[zoomTier], tier);
    assert.deepEqual([metadata.width, metadata.height], tier.dimensions);
    assert.equal(sha256(tierBytes), tier.sha256);
    assert.equal(t47Provenance.tiers[provenanceTier].candidate.sha256, tier.sha256);
    assert.deepEqual(t47Provenance.tiers[provenanceTier].candidate.dimensions.slice(0, 2), tier.dimensions);
  }
  const d05Derived = t48Audit.entries.find(({ id }) => id === "d05");
  const d06Derived = t48Audit.entries.find(({ id }) => id === "d06");
  assert.equal(d05Derived.sourceSha256, NINJAONE_CAPITAL_D05_CONCEPT.tiers.capital.sha256);
  assert.equal(d05Derived.outputSha256, NINJAONE_CAPITAL_D05_CONCEPT.tiers.territoryRegister.sha256);
  assert.equal(d06Derived.outputSha256, NINJAONE_CAPITAL_D06_CANON.tiers.territoryRegister.sha256);
  assert.ok(d05Derived.outputFrequencyEnergy <= t48Audit.analysis.targetFrequencyEnergyCeiling);
  assert.ok(d06Derived.outputFrequencyEnergy <= t48Audit.analysis.targetFrequencyEnergyCeiling);

  const patchManifestBytes = await readFile(new URL(`../${provenance.source.t14ProofManifest.path}`, import.meta.url));
  const patchManifest = JSON.parse(patchManifestBytes.toString("utf8"));
  assert.equal(sha256(patchManifestBytes), provenance.source.t14ProofManifest.sha256);
  assert.ok(patchManifest.inventory.some((entry) => entry.sha256 === provenance.boundaryPainting.parentCloseSha256));
  const boundaryReport = JSON.parse(await readFile(new URL(`../${provenance.boundaryPainting.reportPath}`, import.meta.url), "utf8"));
  assert.equal(boundaryReport.outputs.d05.close, provenance.seamExtension.parentCloseSha256);
  assert.deepEqual(boundaryReport.changedExtentMaster.d05Intersection, provenance.boundaryPainting.changedExtentMaster);
  const seamExtensionReport = JSON.parse(await readFile(new URL(`../${provenance.seamExtension.reportPath}`, import.meta.url), "utf8"));
  assert.equal(seamExtensionReport.derivatives.d05.close.sha256, t47R1Provenance.sourceHashAudit.close);
  assert.equal(t47R1Provenance.tiers.close.candidate.sha256, t47Provenance.sourceHashAudit.close);
  assert.equal(boundaryReport.changedExtentMaster.outsideStripChangedPixels, 0);
  assert.equal(provenance.source.plateB.sha256, "da6bfce555a425b5aa04ed90c07a86dfcffee6bc6d18b0051ee610ca1987a20b");
  assert.equal(registration.id, "ninjaone-d05-anchor-cover@r4");
  assert.deepEqual(registration.canonPyramid.deltaPixels, [2, 2, 0]);
  assert.equal(registration.districtMask.coverage.maskedInteriorBlueWaterPixels, 0);
  assert.equal(provenance.ownerAcceptance.mountState, "files staged for F20; director owns live verification and commit");
  assert.equal(sha256(shimmerMaskBytes), provenance.foliageShimmer.sha256);
});

test("D06 layered composition recomposites the registered terrain base and byte-exact structure overlay", async () => {
  const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
  const registrationBytes = await readFile(new URL(
    `../public${NINJAONE_CAPITAL_D06_CANON.structureOverlayRegistration.path}`,
    import.meta.url,
  ));
  const registration = JSON.parse(registrationBytes.toString("utf8"));
  const [baseBytes, overlayBytes, compositeBytes, waterBytes] = await Promise.all([
    readFile(new URL(`../${registration.composition.terrainBase.path}`, import.meta.url)),
    readFile(new URL(`../${registration.composition.overlay.path}`, import.meta.url)),
    readFile(new URL(`../public${NINJAONE_CAPITAL_D06_CANON.tiers.close.path}`, import.meta.url)),
    readFile(new URL(`../public${NINJAONE_CAPITAL_D06_CANON.paintedWaterMask.path}`, import.meta.url)),
  ]);
  const [base, overlay, composite, water] = await Promise.all([
    sharp(baseBytes).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(overlayBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(compositeBytes).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(waterBytes).greyscale().raw().toBuffer({ resolveWithObject: true }),
  ]);

  assert.equal(sha256(registrationBytes), NINJAONE_CAPITAL_D06_CANON.structureOverlayRegistration.sha256);
  assert.deepEqual([overlay.info.width, overlay.info.height], registration.coordinateSpace.dimensions);
  assert.deepEqual([base.info.width, base.info.height], registration.coordinateSpace.dimensions);
  assert.deepEqual([composite.info.width, composite.info.height], registration.coordinateSpace.dimensions);
  assert.equal(sha256(baseBytes), registration.composition.terrainBase.sha256);
  assert.equal(sha256(overlayBytes), registration.composition.overlay.sha256);
  assert.equal(sha256(compositeBytes), registration.composition.restComposite.sha256);

  let transparentPixels = 0;
  let opaquePixels = 0;
  let nonBinaryAlphaPixels = 0;
  let recompositeMismatches = 0;
  let classifiedWaterThroughOpenings = 0;
  for (let pixel = 0; pixel < overlay.info.width * overlay.info.height; pixel += 1) {
    const alpha = overlay.data[pixel * 4 + 3];
    if (alpha === 0) transparentPixels += 1;
    else if (alpha === 255) opaquePixels += 1;
    else nonBinaryAlphaPixels += 1;
    if (alpha === 0 && water.data[pixel] > 0) classifiedWaterThroughOpenings += 1;
    for (let channel = 0; channel < 3; channel += 1) {
      const expected = alpha === 255 ? overlay.data[pixel * 4 + channel] : base.data[pixel * 3 + channel];
      if (composite.data[pixel * 3 + channel] !== expected) recompositeMismatches += 1;
    }
  }
  assert.ok(transparentPixels > 0);
  assert.ok(opaquePixels > 0);
  assert.equal(nonBinaryAlphaPixels, 0);
  assert.equal(recompositeMismatches, 0);
  assert.ok(classifiedWaterThroughOpenings > 0);

  for (const carried of registration.carriedStatics) {
    const bytes = await readFile(new URL(`../${carried.sourcePath}`, import.meta.url));
    assert.equal(sha256(bytes), carried.sourceSha256);
    assert.equal(carried.coordinateSpace, registration.coordinateSpace.id);
  }
  const routeBytes = await readFile(new URL(`../${registration.route.path}`, import.meta.url));
  assert.equal(sha256(routeBytes), registration.route.sha256);
});

test("D05 canon serving preserves native source resolution at the owner-approved floor", () => {
  const floorSpan = NINJAONE_CAPITAL_D05_CANON_ONE_TO_ONE_MAXIMUM_SPAN;
  const capitalMaximumSpan = NINJAONE_CAPITAL_D05_CONCEPT_TIER_MAXIMUM_SPANS.capital;
  const capitalNativeWidth = NINJAONE_CAPITAL_D05_CONCEPT.tiers.capital.dimensions[0];
  const fullCanonNativeWidth = NINJAONE_CAPITAL_D05_CONCEPT.tiers.close.dimensions[0];

  assert.equal(ninjaOneCapitalD05ConceptTierForSpan(floorSpan), NINJAONE_CAPITAL_D05_CONCEPT.tiers.close);
  assert.equal(
    ninjaOneCapitalD05ConceptTierForSpan((floorSpan + capitalMaximumSpan) * 0.5),
    NINJAONE_CAPITAL_D05_CONCEPT.tiers.site,
  );
  assert.equal(
    ninjaOneCapitalD05ConceptTierForSpan(capitalMaximumSpan * (1 + 1e-9)),
    NINJAONE_CAPITAL_D05_CONCEPT.tiers.capital,
  );
  const nativeResolutionRoundingAllowance = Number.EPSILON
    * Math.max(
      capitalMaximumSpan * capitalNativeWidth,
      floorSpan * fullCanonNativeWidth,
    ) * 8;
  assert.ok(
    capitalMaximumSpan * capitalNativeWidth + nativeResolutionRoundingAllowance
      >= floorSpan * fullCanonNativeWidth,
    "capital derivative must not be stretched beyond its native width beyond IEEE-754 rounding",
  );

  for (const tierWeights of [
    ninjaOneCapitalD05ConceptTierWeights({ capitalToSite: 0.5, siteToClose: 0 }),
    ninjaOneCapitalD05ConceptTierWeights({ capitalToSite: 1, siteToClose: 0.5 }),
    ninjaOneCapitalD06CanonTierWeights({ capitalToSite: 0.5, siteToClose: 0 }),
    ninjaOneCapitalD06CanonTierWeights({ capitalToSite: 1, siteToClose: 0.5 }),
  ]) {
    assert.equal(tierWeights.length, 2, "transition bands must retain both source tiers");
    assert.ok(tierWeights.every(({ opacity }) => opacity > 0 && opacity < 1));
    assert.equal(tierWeights.reduce((total, { opacity }) => total + opacity, 0), 1);
  }
});

test("D05 canon shimmer keeps the T6b single-channel derived-mask contract", async () => {
  const [bytes, provenanceBytes] = await Promise.all([
    readFile(new URL(
      `../public${NINJAONE_CAPITAL_D05_CONCEPT.foliageShimmerMask.path}`,
      import.meta.url,
    )),
    readFile(new URL(`../public${NINJAONE_CAPITAL_D05_CONCEPT.provenancePath}`, import.meta.url)),
  ]);
  const { data, info } = await sharp(bytes).greyscale().raw().toBuffer({ resolveWithObject: true });
  const provenance = JSON.parse(provenanceBytes.toString("utf8"));
  const coveragePercent = Number((data.reduce((total, value) => total + Number(value > 0), 0) / data.length * 100).toFixed(4));
  assert.deepEqual([info.width, info.height], NINJAONE_CAPITAL_D05_CONCEPT.foliageShimmerMask.dimensions);
  assert.equal(info.channels, 1);
  assert.ok(data.some((value) => value === 0));
  assert.ok(data.some((value) => value === 255));
  // T10b's former 8-12% range was measured against the superseded r1 canon
  // and r3 coast-cut mask. R4 intentionally expands the eligible painted-water
  // footprint, so this guards the derived-mask contract rather than stale art
  // coverage: non-empty, non-solid alpha plus provenance-synchronized coverage.
  assert.ok(coveragePercent > 0 && coveragePercent < 100, "shimmer mask must remain a selective derived field");
  assert.equal(coveragePercent, provenance.foliageShimmer.coveragePercent);
  assert.match(provenance.foliageShimmer.t10bRecipe, /HSV 56-92, saturation >=0\.40, 7px architecture buffer/);
  assert.equal(provenance.foliageShimmer.architectureStandoff.rawPixels, 7);
  assert.equal(provenance.foliageShimmer.architectureStandoff.violations, 0);
});

test("D05 canon water effects preserve derived masks, standoff, and bounded live tuning", async () => {
  const effects = NINJAONE_CAPITAL_D05_CONCEPT.waterEffects;
  const [sparkleBytes, foamBytes, crestBytes, directionBytes, phaseBytes, normalBytes, sdfBytes, rampBytes, manifestBytes] = await Promise.all([
    readFile(new URL(`../public${effects.sparkle.maskPath}`, import.meta.url)),
    readFile(new URL(`../public${effects.foam.maskPath}`, import.meta.url)),
    readFile(new URL(`../public${effects.crest.maskPath}`, import.meta.url)),
    readFile(new URL(`../public${effects.crest.directionFieldPath}`, import.meta.url)),
    readFile(new URL(`../public${effects.crest.wavePhaseFieldPath}`, import.meta.url)),
    readFile(new URL(`../public${effects.crest.pseudoNormalFieldPath}`, import.meta.url)),
    readFile(new URL(`../public${effects.foam.shoreSdfPath}`, import.meta.url)),
    readFile(new URL(`../public${effects.crest.rampLutPath}`, import.meta.url)),
    readFile(new URL(`../public${effects.provenancePath}`, import.meta.url)),
  ]);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const maskBytes = [sparkleBytes, foamBytes, crestBytes];
  const maskMetadata = await Promise.all(maskBytes.map(async (bytes) => sharp(bytes).metadata()));
  const maskSamples = await Promise.all(maskBytes.map(async (bytes) => (
    sharp(bytes).greyscale().raw().toBuffer({ resolveWithObject: true })
  )));
  const directionMetadata = await sharp(directionBytes).metadata();
  const [phaseMetadata, normalMetadata, sdfMetadata, rampMetadata] = await Promise.all([
    sharp(phaseBytes).metadata(), sharp(normalBytes).metadata(),
    sharp(sdfBytes).metadata(), sharp(rampBytes).metadata(),
  ]);

  for (let index = 0; index < maskMetadata.length; index += 1) {
    assert.deepEqual(
      [maskMetadata[index].width, maskMetadata[index].height, maskMetadata[index].channels],
      [...effects.fieldDimensions, 1],
    );
    assert.ok(maskSamples[index].data.some((value) => value > 0), "effect mask must be non-empty");
    assert.ok(maskSamples[index].data.some((value) => value === 0), "effect mask must stay selective");
  }
  assert.deepEqual(
    [directionMetadata.width, directionMetadata.height, directionMetadata.channels],
    [...effects.fieldDimensions, 3],
  );
  assert.deepEqual([phaseMetadata.width, phaseMetadata.height, phaseMetadata.channels], [...effects.fieldDimensions, 1]);
  assert.deepEqual([normalMetadata.width, normalMetadata.height, normalMetadata.channels], [...effects.fieldDimensions, 3]);
  assert.deepEqual([sdfMetadata.width, sdfMetadata.height, sdfMetadata.channels], [...effects.fieldDimensions, 1]);
  assert.deepEqual([rampMetadata.width, rampMetadata.height, rampMetadata.channels], [256, 1, 3]);
  assert.deepEqual(effects.dimensions, NINJAONE_CAPITAL_D05_CONCEPT.tiers.close.dimensions);
  assert.equal(effects.sourcePath, NINJAONE_CAPITAL_D05_CONCEPT.tiers.close.path);
  assert.equal(manifest.safety.standoffRawPixels, 7);
  assert.equal(manifest.safety.violations, 0);
  const periods = manifest.sparkle.glints.map(({ periodSeconds }) => periodSeconds);
  assert.equal(new Set(periods).size, periods.length, "glints must not share discrete period buckets");
  assert.ok(manifest.sparkle.glints.every(({ dutyCycle }) => dutyCycle >= 0.3 && dutyCycle <= 0.5));
  assert.ok(manifest.sparkle.glints.every(({ offset }) => offset >= 0 && offset < 1));
  assert.equal(manifest.crest.wavePhaseField.path, effects.crest.wavePhaseFieldPath);
  assert.equal(manifest.foam.shoreSdf.path, effects.foam.shoreSdfPath);
  assert.equal(manifest.crest.directionField.path, effects.crest.directionFieldPath);
  assert.ok(Number.isFinite(manifest.crest.travelDirection.x));
  assert.ok(Number.isFinite(manifest.crest.travelDirection.y));
  assert.deepEqual(
    ninjaOneCapitalD05WaterEffectTuning("?city-water.opacity=0.5&city-water.shoreRamp=1&water-effects.sparkle=1.25&water-effects.foam=-1&water-effects.crest=9"),
    { cityWaterOpacity: 0.5, cityWaterShoreRamp: 1, sparkle: 1.25, foam: 0, crest: 2, relight: 1, cycling: 1, swell: 1 },
  );
  assert.deepEqual(
    ninjaOneCapitalD05WaterEffectTuning("?water-effects.relight=-1&water-effects.cycling=9"),
    { cityWaterOpacity: 0, cityWaterShoreRamp: 0, sparkle: 1, foam: 1, crest: 1, relight: 0, cycling: 2, swell: 1 },
  );
});

test("city node data preserves manifest ids and explicit role classifications", async () => {
  const layout = JSON.parse(await readFile(new URL(
    "../public/career-world/capitals/ninjaone/manifests/city-master-node-layout-r3.json",
    import.meta.url,
  ), "utf8"));
  const runtimeNodesById = new Map(NINJAONE_CAPITAL_CITY_LAYER_NODES.map((node) => [node.id, node]));
  for (const manifestNode of layout.nodes) {
    const runtimeNode = runtimeNodesById.get(manifestNode.id);
    assert.ok(runtimeNode, `missing runtime node ${manifestNode.id}`);
    assert.equal(runtimeNode.role, manifestNode.role);
  }
});

test("D01 independently owns native-land reveal, grounding, and six architecture nodes", async () => {
  const [renderer, nodeRenderer] = await Promise.all([
    readFile(new URL(
      "../features/career-world/layers/city/rendering/NinjaOneCapitalCityR3.tsx",
      import.meta.url,
    ), "utf8"),
    readFile(new URL(
      "../features/career-world/layers/city/rendering/NinjaOneCapitalAssetNodes.tsx",
      import.meta.url,
    ), "utf8"),
  ]);
  assert.match(renderer, /d01DistrictInFocus = siteAssetsMounted && progressiveDistrict === "D01"/);
  assert.match(renderer, /d01DistrictLandscapeVisible = d01DistrictInFocus && landscapeVisible/);
  assert.match(renderer, /d01DistrictArchitectureVisible = d01DistrictInFocus && architectureVisible/);
  assert.match(renderer, /id="ninjaone-capital-city-r3-d01-detail-cutout"/);
  assert.match(renderer, /id="ninjaone-capital-city-r3-d01-context-clip"/);
  assert.match(renderer, /NINJAONE_CAPITAL_CITY_R3_D01_CONTEXT_EXCLUSION_MASK\.path/);
  assert.match(renderer, /data-city-asset-id="D01L02"[\s\S]*?data-city-child-layer="L4_1"/);
  assert.match(renderer, /<g mask="url\(#ninjaone-capital-city-r3-d01-context-clip\)">/);
  assert.match(renderer, /district="D01"/);
  assert.doesNotMatch(renderer, /D01-upper-capital-plate/);
  assert.match(
    nodeRenderer,
    /usesAuthoredGrounding = node\.districtId === "D01"[\s\S]*?node\.districtId === "D03"[\s\S]*?node\.districtId === "D05"/,
  );
  assert.match(nodeRenderer, /ownsLargeFootprint && !usesAuthoredGrounding/);
  // Preserve the silhouette-mask invariant for the unrepaired atomic detail paths.
  assert.match(
    nodeRenderer,
    /if \(maskOnly\)[\s\S]*?filter="url\(#ninjaone-capital-city-r3-detail-mask-black\)"/,
    "detail cutouts must use alpha silhouettes instead of asset luminance",
  );
  assert.match(
    renderer,
    /id="ninjaone-capital-city-r3-detail-mask-black"[\s\S]*?<feColorMatrix/,
    "detail cutouts must force every opaque source pixel to black",
  );
  const landscapeIndex = renderer.indexOf("data-city-asset-id=\"LFX06\"");
  const contextIndex = renderer.indexOf("data-city-cohort-ownership=\"L4-capital-composite\"");
  const groundingIndex = renderer.indexOf('data-city-asset-id="D01L02"');
  const d01RenderIndex = renderer.indexOf(
    "<g mask=\"url(#ninjaone-capital-city-r3-d01-context-clip)\">",
  );
  assert.ok(landscapeIndex < contextIndex, "L4_1 must remain below the city context");
  assert.ok(contextIndex < groundingIndex, "D01 full-artboard L4_1 must follow the cut parent context");
  assert.ok(groundingIndex < d01RenderIndex, "D01 L4_3 must remain above authored L4_1 grounding");
  for (const district of ["D02", "D03", "D04"]) {
    assert.ok(
      contextIndex < renderer.lastIndexOf(`district=\"${district}\"`),
      `${district} progressive L4_3 must remain above L4_1 and context`,
    );
  }
});

test("D02 independently owns native-land reveal, grounding, and two detail layers", async () => {
  const [renderer, nodeRenderer] = await Promise.all([
    readFile(new URL(
      "../features/career-world/layers/city/rendering/NinjaOneCapitalCityR3.tsx",
      import.meta.url,
    ), "utf8"),
    readFile(new URL(
      "../features/career-world/layers/city/rendering/NinjaOneCapitalAssetNodes.tsx",
      import.meta.url,
    ), "utf8"),
  ]);
  assert.match(renderer, /d02DistrictInFocus = siteAssetsMounted && progressiveDistrict === "D02"/);
  assert.match(renderer, /d02DistrictLandscapeVisible = d02DistrictInFocus && landscapeVisible/);
  assert.match(renderer, /d02DistrictDetailVisible = d02DistrictInFocus/);
  assert.match(renderer, /id="ninjaone-capital-city-r3-d02-detail-cutout"/);
  assert.match(renderer, /NINJAONE_CAPITAL_CITY_R3_D02_CONTEXT_EXCLUSION_MASK\.path/);
  assert.match(renderer, /data-city-asset-id="D02L02"[\s\S]*?data-city-child-layer="L4_1"/);
  assert.match(renderer, /district="D02"/);
  assert.match(renderer, /layerIds=\{d02DistrictDetailLayerIds\}/);
  assert.match(
    nodeRenderer,
    /usesAuthoredGrounding = node\.districtId === "D01"[\s\S]*?node\.districtId === "D02"[\s\S]*?node\.districtId === "D03"/,
  );
  assert.doesNotMatch(renderer, /D02-dojo-ridge-plate/);
});

test("D03 independently owns native-land reveal, grounding, and four architecture nodes", async () => {
  const [renderer, nodeRenderer] = await Promise.all([
    readFile(new URL(
      "../features/career-world/layers/city/rendering/NinjaOneCapitalCityR3.tsx",
      import.meta.url,
    ), "utf8"),
    readFile(new URL(
      "../features/career-world/layers/city/rendering/NinjaOneCapitalAssetNodes.tsx",
      import.meta.url,
    ), "utf8"),
  ]);
  assert.match(renderer, /d03DistrictInFocus = siteAssetsMounted && progressiveDistrict === "D03"/);
  assert.match(renderer, /d03DistrictLandscapeVisible = d03DistrictInFocus && landscapeVisible/);
  assert.match(renderer, /d03DistrictArchitectureVisible = d03DistrictInFocus && architectureVisible/);
  assert.match(renderer, /id="ninjaone-capital-city-r3-d03-detail-cutout"/);
  assert.match(renderer, /NINJAONE_CAPITAL_CITY_R3_D03_CONTEXT_EXCLUSION_MASK\.path/);
  assert.match(renderer, /data-city-asset-id="D03L02"[\s\S]*?data-city-child-layer="L4_1"/);
  assert.match(renderer, /opacity=\{siteProgress \* \(0\.12 \+ closeProgress \* 0\.02\)\}/);
  assert.match(renderer, /data-city-asset-id="D03L03"[\s\S]*?data-city-child-layer="L4_1"/);
  assert.match(renderer, /data-city-asset-id="D03L04"[\s\S]*?data-city-child-layer="L4_1"/);
  assert.match(renderer, /district="D03"/);
  assert.match(
    nodeRenderer,
    /usesAuthoredGrounding = node\.districtId === "D01"[\s\S]*?node\.districtId === "D02"[\s\S]*?node\.districtId === "D03"[\s\S]*?node\.districtId === "D05"/,
  );
  assert.doesNotMatch(renderer, /D03-eastern-industry-plate/);
});

test("D04 independently owns native-land reveal, dry nodes, and the compact S14 gateway", async () => {
  const renderer = await readFile(new URL(
    "../features/career-world/layers/city/rendering/NinjaOneCapitalCityR3.tsx",
    import.meta.url,
  ), "utf8");
  assert.match(renderer, /d04DistrictInFocus = siteAssetsMounted && progressiveDistrict === "D04"/);
  assert.match(renderer, /d04DistrictLandscapeVisible = d04DistrictInFocus && landscapeVisible/);
  assert.match(renderer, /d04DistrictArchitectureVisible = d04DistrictInFocus && architectureVisible/);
  assert.match(renderer, /id="ninjaone-capital-city-r3-d04-detail-cutout"/);
  assert.match(renderer, /id="ninjaone-capital-city-r3-d04-context-clip"/);
  assert.match(renderer, /id="ninjaone-capital-city-r3-d04-dry-fabric-clip"/);
  assert.match(renderer, /id="ninjaone-capital-city-r3-inverse-water-mask"/);
  assert.match(renderer, /<feFuncR tableValues="1 0" type="discrete"/);
  assert.match(renderer, /<g mask="url\(#ninjaone-capital-city-r3-d04-dry-fabric-clip\)">/);
  assert.match(renderer, /district="D04"/);
  assert.match(renderer, /data-city-asset-id="D04W02"[\s\S]*?data-city-runtime-status="manifest-declared"/);
  assert.match(renderer, /data-city-asset-id="D04L02"[\s\S]*?data-city-runtime-status="manifest-declared"/);
  assert.match(renderer, /data-city-asset-id="S14"[\s\S]*?data-city-child-layer="L4_3"/);
  assert.match(renderer, /data-city-asset-id="S14"[\s\S]*?data-city-runtime-status="manifest-declared"/);
  assert.match(renderer, /D04_S14_COMPACT_GATEWAY_REVIEW/);
  assert.doesNotMatch(renderer, /D04_[A-Z0-9_]+_REVIEW\s*=\s*"\/career-world\/.*\/_review\//);
  assert.doesNotMatch(renderer, /D04-central-lake-terraces-plate/);
});

test("unregistered inferred nodes are quarantined from every fixed LOD proof", () => {
  assert.ok(NINJAONE_CAPITAL_CITY_LAYER_NODES.some(
    ({ representationClass }) => representationClass === "unregistered-close-candidate",
  ));
  const proofCases = [
    ["world", NINJAONE_CAPITAL_CITY_PROOF_CAMERAS.world, null],
    ["territory", NINJAONE_CAPITAL_CITY_PROOF_CAMERAS.territory, null],
    ["capital", NINJAONE_CAPITAL_CITY_PROOF_CAMERAS.capital, null],
    ["site", NINJAONE_CAPITAL_CITY_PROOF_CAMERAS["d01-site"], "D01"],
    ["close", NINJAONE_CAPITAL_CITY_PROOF_CAMERAS["d01-close"], "D01"],
    ["site", NINJAONE_CAPITAL_CITY_PROOF_CAMERAS["d02-site"], "D02"],
    ["close", NINJAONE_CAPITAL_CITY_PROOF_CAMERAS["d02-close"], "D02"],
    ["site", NINJAONE_CAPITAL_CITY_PROOF_CAMERAS["d03-site"], "D03"],
    ["close", NINJAONE_CAPITAL_CITY_PROOF_CAMERAS["d03-close"], "D03"],
    ["site", NINJAONE_CAPITAL_CITY_PROOF_CAMERAS["d04-site"], "D04"],
    ["close", NINJAONE_CAPITAL_CITY_PROOF_CAMERAS["d04-close"], "D04"],
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
