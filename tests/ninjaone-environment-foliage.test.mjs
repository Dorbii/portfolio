import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import sharp from "sharp";
import {
  NINJAONE_ENVIRONMENT_FOLIAGE_COMBINED_DECODED_BYTES,
  NINJAONE_ENVIRONMENT_FOLIAGE_DECODED_BYTES,
  NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES,
  NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_ENTER_SPAN,
  NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_RETAIN_SPAN,
  NINJAONE_ENVIRONMENT_FOLIAGE_MAX_MOUNTED_NODES,
  NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS,
  NINJAONE_ENVIRONMENT_FOLIAGE_NODES_PER_GROUP,
  NINJAONE_ENVIRONMENT_FOLIAGE_RESOURCES,
  environmentFoliageCameraArtboardView,
  environmentFoliageResourceCohort,
  resolveNinjaOneEnvironmentFoliageEligibility,
  selectNinjaOneEnvironmentFoliageInstances,
} from "../features/career-world/layers/terrain/detail/model/ninjaOneEnvironmentFoliage.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const MANIFEST_PATH = path.join(
  ROOT,
  "public/career-world/capitals/ninjaone/environment/manifests/foliage-native-r3.json",
);
const BUILDER_PATH = path.join(
  ROOT,
  "scripts/build-ninjaone-environment-foliage-r3.mjs",
);
const EXPECTED_NATIVE_TILE_IDS = [
  "r0-c2",
  "r0-c3",
  "r1-c2",
  "r1-c3",
  "r2-c0",
  "r2-c1",
  "r2-c2",
  "r2-c3",
  "r3-c0",
  "r3-c1",
  "r3-c2",
  "r3-c3",
];
const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
const execFileAsync = promisify(execFile);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function repoFile(publicOrRepoPath) {
  const unversioned = publicOrRepoPath.split("?")[0].replace(/^\//, "");
  return publicOrRepoPath.startsWith("/career-world/")
    ? path.join(ROOT, "public", unversioned)
    : path.join(ROOT, unversioned);
}

async function rawPng(filePath) {
  return sharp(await readFile(filePath))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

function alphaChannel(rgba) {
  const alpha = Buffer.alloc(rgba.length / 4);
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    alpha[pixel] = rgba[pixel * 4 + 3];
  }
  return alpha;
}

function largestConnectedRatio(alpha, width, height, threshold = 192) {
  const visited = new Uint8Array(alpha.length);
  let selected = 0;
  let largest = 0;
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    if (alpha[pixel] < threshold) continue;
    selected += 1;
    if (visited[pixel]) continue;
    const queue = [pixel];
    visited[pixel] = 1;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      const x = current % width;
      const y = Math.floor(current / width);
      for (const neighbor of [
        x > 0 ? current - 1 : -1,
        x + 1 < width ? current + 1 : -1,
        y > 0 ? current - width : -1,
        y + 1 < height ? current + width : -1,
      ]) {
        if (neighbor < 0 || visited[neighbor] || alpha[neighbor] < threshold) continue;
        visited[neighbor] = 1;
        queue.push(neighbor);
      }
    }
    largest = Math.max(largest, queue.length);
  }
  return selected === 0 ? 0 : largest / selected;
}

function longestHighAlphaRun(alpha, width, height, threshold = 192) {
  let longest = 0;
  for (let y = 0; y < height; y += 1) {
    let run = 0;
    for (let x = 0; x < width; x += 1) {
      run = alpha[y * width + x] >= threshold ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
  }
  for (let x = 0; x < width; x += 1) {
    let run = 0;
    for (let y = 0; y < height; y += 1) {
      run = alpha[y * width + x] >= threshold ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
  }
  return longest;
}

function composite(base, layer) {
  const output = Buffer.from(base);
  for (let pixel = 0; pixel < base.length / 4; pixel += 1) {
    const offset = pixel * 4;
    const alpha = layer[offset + 3] / 255;
    for (let channel = 0; channel < 3; channel += 1) {
      output[offset + channel] = Math.round(
        layer[offset + channel] * alpha
          + base[offset + channel] * (1 - alpha),
      );
    }
    output[offset + 3] = 255;
  }
  return output;
}

function shapeContains(shape, sourceX, sourceY) {
  const [x, y, width, height] = shape.rect;
  if (shape.kind === "ellipse") {
    const dx = (sourceX - (x + width / 2)) / (width / 2);
    const dy = (sourceY - (y + height / 2)) / (height / 2);
    return dx ** 2 + dy ** 2 <= 1;
  }
  return sourceX >= x
    && sourceX < x + width
    && sourceY >= y
    && sourceY < y + height;
}

test("r3 foliage uses only the twelve native originals and mounts a four-node paired pool", async () => {
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.sourceCollection.authority, "twelve-original-native-generated-r2-pngs");
  assert.deepEqual(
    manifest.sourceCollection.tiles.map(({ id }) => id),
    EXPECTED_NATIVE_TILE_IDS,
  );
  assert.ok(manifest.sourceCollection.tiles.every(({ dimensions, path: sourcePath }) => (
    dimensions.join(",") === "1448,1086"
      && sourcePath.includes("/detail-tiles-r2/generated/")
      && !manifest.sourceCollection.forbiddenSources.some((forbidden) => (
        sourcePath.includes(forbidden)
      ))
  )));
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES.length, 2);
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_RESOURCES.length, 4);
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS, 2);
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_NODES_PER_GROUP, 2);
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_MAX_MOUNTED_NODES, 6);
  assert.equal(manifest.eligibility.maxDetailEnterSpan, 0.05);
  assert.equal(manifest.eligibility.maxDetailRetainSpan, 0.06);
  assert.equal(manifest.budgets.mountedFoliageNodes, 4);
  assert.equal(manifest.budgets.futureSupplementalNodeHeadroom, 2);
  assert.equal(manifest.budgets.terrainDecodedBytes, 4 * 1448 * 1086 * 4);
  assert.equal(
    manifest.budgets.foliageDecodedBytes,
    NINJAONE_ENVIRONMENT_FOLIAGE_DECODED_BYTES,
  );
  assert.equal(
    NINJAONE_ENVIRONMENT_FOLIAGE_COMBINED_DECODED_BYTES,
    manifest.budgets.terrainDecodedBytes + manifest.budgets.foliageDecodedBytes,
  );
  assert.ok(NINJAONE_ENVIRONMENT_FOLIAGE_COMBINED_DECODED_BYTES <= 32 * 1024 * 1024);
  assert.ok(32 * 1024 * 1024 - NINJAONE_ENVIRONMENT_FOLIAGE_COMBINED_DECODED_BYTES > 7_000_000);
  assert.equal(Object.hasOwn(manifest.budgets, "seamDecodedBytes"), false);
  assert.equal(Object.hasOwn(manifest.budgets, "coastDecodedBytes"), false);

  assert.equal(manifest.neutralizationSources.length, 2);
  const mountedPaths = new Set(manifest.resources.map(({ path: resourcePath }) => resourcePath));
  for (const source of manifest.neutralizationSources) {
    assert.equal(source.provider, "built-in-imagegen-precise-object-edit");
    assert.equal(source.inputRole, "neutralization-rgb-only");
    assert.equal(mountedPaths.has(source.path), false, `${source.id} must not be mounted`);
    const bytes = await readFile(repoFile(source.path));
    assert.equal(sha256(bytes), source.sha256);
  }
});

test("native source collection hashes and dimensions are frozen", async () => {
  for (const source of manifest.sourceCollection.tiles) {
    const bytes = await readFile(repoFile(source.path));
    const metadata = await sharp(bytes).metadata();
    assert.equal(sha256(bytes), source.sha256, source.id);
    assert.deepEqual([metadata.width, metadata.height], source.dimensions, source.id);
    assert.equal(metadata.format, "png", source.id);
  }
});

test("tracked generator is deterministic, native-bound, and noninteractive", async () => {
  const [packageJson, builder] = await Promise.all([
    readFile(path.join(ROOT, "package.json"), "utf8").then(JSON.parse),
    readFile(BUILDER_PATH, "utf8"),
  ]);
  assert.equal(
    packageJson.scripts?.["build:ninjaone-environment-foliage"],
    "node scripts/build-ninjaone-environment-foliage-r3.mjs",
  );
  assert.match(builder, /detail-tiles-r2\/generated/);
  assert.match(builder, /semanticCanopyAlpha/);
  assert.match(builder, /native-conifer-needle-color-local-contrast/);
  assert.match(builder, /native-yellow-leaf-chroma-hard-alpha/);
  assert.match(builder, /registeredNeutralizationUnderlay/);
  assert.match(builder, /neutralizationDilation: 0/g);
  assert.match(builder, /compressionLevel: 9, palette: false/);
  assert.doesNotMatch(builder, /authored-needle-tiers|paletteMatchedNeutralization|dilateAlpha/);
  assert.doesNotMatch(builder, /inpaintNeutralization|Date\.now|Math\.random|process\.stdin|readline|prompt\(/);
  assert.doesNotMatch(builder, /readFile\([^\n]*master-detail-r2/);
});

test("tracked generator rebuild is byte-deterministic", async () => {
  const generatedPaths = [
    MANIFEST_PATH,
    ...manifest.resources.map(({ path: resourcePath }) => repoFile(resourcePath)),
  ];
  const hashes = async () => Object.fromEntries(await Promise.all(
    generatedPaths.map(async (filePath) => [
      path.relative(ROOT, filePath),
      sha256(await readFile(filePath)),
    ]),
  ));
  await execFileAsync(process.execPath, [BUILDER_PATH], { cwd: ROOT });
  const first = await hashes();
  await execFileAsync(process.execPath, [BUILDER_PATH], { cwd: ROOT });
  const second = await hashes();
  assert.deepEqual(second, first);
});

test("paired hard leaf masks preserve native gaps and neutralize only vacated foliage", async () => {
  let decodedBytes = 0;
  for (const instance of manifest.instances) {
    const canopyResource = manifest.resources.find(({ id }) => (
      id === instance.canopyResourceId
    ));
    const neutralResource = manifest.resources.find(({ id }) => (
      id === instance.neutralizationResourceId
    ));
    assert.ok(canopyResource && neutralResource, instance.id);
    assert.equal(canopyResource.kind, "coherent-canopy");
    assert.equal(neutralResource.kind, "neutralization-underlay");
    assert.deepEqual(canopyResource.dimensions, neutralResource.dimensions);
    assert.deepEqual(canopyResource.sourceCrop, neutralResource.sourceCrop);

    const [{ data: canopy, info }, { data: neutral }] = await Promise.all([
      rawPng(repoFile(canopyResource.path)),
      rawPng(repoFile(neutralResource.path)),
    ]);
    const canopyBytes = await readFile(repoFile(canopyResource.path));
    const neutralBytes = await readFile(repoFile(neutralResource.path));
    assert.equal(sha256(canopyBytes), canopyResource.sha256);
    assert.equal(sha256(neutralBytes), neutralResource.sha256);
    assert.deepEqual([info.width, info.height], canopyResource.dimensions);
    const sourceTile = manifest.sourceCollection.tiles.find(({ id }) => (
      id === instance.sourceTileId
    ));
    const [left, top, width, height] = canopyResource.sourceCrop;
    const source = await sharp(await readFile(repoFile(sourceTile.path)))
      .extract({ left, top, width, height })
      .ensureAlpha()
      .raw()
      .toBuffer();
    const canopyAlpha = alphaChannel(canopy);
    const neutralAlpha = alphaChannel(neutral);

    let canopyPixels = 0;
    let neutralizedLeafPixels = 0;
    let nativeGapPixels = 0;
    let protectedPixels = 0;
    let internalTransparent = 0;
    const [alphaLeft, alphaTop, alphaRight, alphaBottom] = canopyResource.alphaBounds;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const pixel = y * width + x;
        const offset = pixel * 4;
        assert.ok(canopyAlpha[pixel] === 0 || canopyAlpha[pixel] === 255);
        assert.ok(neutralAlpha[pixel] === 0 || neutralAlpha[pixel] === 255);
        if (canopyAlpha[pixel] === 255) {
          canopyPixels += 1;
          assert.equal(canopy[offset], source[offset], `${instance.id} native red drift`);
          assert.equal(canopy[offset + 1], source[offset + 1], `${instance.id} native green drift`);
          assert.equal(canopy[offset + 2], source[offset + 2], `${instance.id} native blue drift`);
          assert.equal(neutralAlpha[pixel], 255, `${instance.id} uncovered baked canopy leaf`);
          const difference = Math.max(
            Math.abs(neutral[offset] - source[offset]),
            Math.abs(neutral[offset + 1] - source[offset + 1]),
            Math.abs(neutral[offset + 2] - source[offset + 2]),
          );
          if (difference >= 4) neutralizedLeafPixels += 1;
        }
        if (neutralAlpha[pixel] === 255 && canopyAlpha[pixel] === 0) {
          nativeGapPixels += 1;
          assert.equal(neutral[offset], source[offset], `${instance.id} native-gap red drift`);
          assert.equal(neutral[offset + 1], source[offset + 1], `${instance.id} native-gap green drift`);
          assert.equal(neutral[offset + 2], source[offset + 2], `${instance.id} native-gap blue drift`);
        }
        const sourceX = left + x;
        const sourceY = top + y;
        if (instance.protectedSourceRects.some((shape) => (
          shapeContains(shape, sourceX, sourceY)
        ))) {
          protectedPixels += 1;
          assert.equal(canopyAlpha[pixel], 0, `${instance.id} moves a protected pixel`);
          assert.equal(neutralAlpha[pixel], 0, `${instance.id} neutralizes a protected pixel`);
        }
        if (
          x >= alphaLeft && x <= alphaRight
          && y >= alphaTop && y <= alphaBottom
          && canopyAlpha[pixel] === 0
        ) {
          internalTransparent += 1;
        }
      }
    }

    assert.ok(canopyPixels >= 7_000, `${instance.id} canopy is fragmentary`);
    assert.ok(nativeGapPixels >= 3_000, `${instance.id} lost genuine native gaps`);
    assert.ok(protectedPixels > 0, `${instance.id} has no protected-mask coverage`);
    assert.ok(internalTransparent > 3_000, `${instance.id} filled all canopy gaps`);
    assert.ok(neutralizedLeafPixels / canopyPixels > 0.9, `${instance.id} leaves a baked duplicate`);
    assert.ok(largestConnectedRatio(canopyAlpha, width, height) > 0.9);
    assert.ok(largestConnectedRatio(neutralAlpha, width, height) > 0.99);
    assert.ok(longestHighAlphaRun(canopyAlpha, width, height) < Math.max(width, height) * 0.92);
    assert.equal(canopyResource.boundaryHighAlphaPixels, 0);
    assert.equal(neutralResource.boundaryHighAlphaPixels, 0);
    assert.ok(canopyResource.alphaCoverage >= 0.25 && canopyResource.alphaCoverage < 0.5);

    const separation = manifest.separationEvidence.find(({ id }) => (
      id === instance.checkpoint
    ));
    assert.ok(separation, `${instance.id} lacks separation evidence`);
    assert.equal(separation.neutralizationDilationPixels, 0);
    assert.equal(separation.atRestDifference.changedPixels, 0);
    assert.equal(separation.forcedProtectedDifference.changedPixels, 0);
    assert.ok(separation.forcedStartPeakDifference.changedPixels > 10_000);
    assert.equal(separation.nativeGapDifference.changedPixels, 0);
    assert.equal(separation.nativeGapPixels, nativeGapPixels);
    assert.match(separation.maskDerivation, /^native-/);

    const atRest = composite(composite(source, neutral), canopy);
    let changed = 0;
    let outsideMaskChanged = 0;
    let totalDifference = 0;
    for (let pixel = 0; pixel < width * height; pixel += 1) {
      const offset = pixel * 4;
      const difference = Math.max(
        Math.abs(atRest[offset] - source[offset]),
        Math.abs(atRest[offset + 1] - source[offset + 1]),
        Math.abs(atRest[offset + 2] - source[offset + 2]),
      );
      totalDifference += difference;
      if (difference > 0) changed += 1;
      if (neutralAlpha[pixel] === 0 && difference > 0) outsideMaskChanged += 1;
    }
    assert.equal(outsideMaskChanged, 0, `${instance.id} changes static ground`);
    assert.equal(changed, 0, `${instance.id} at-rest composite does not tie native`);
    assert.equal(totalDifference, 0, `${instance.id} at-rest composite drifts from native`);
    decodedBytes += width * height * 4 * 2;
  }
  assert.equal(decodedBytes, manifest.budgets.foliageDecodedBytes);
});

test("actual fixed C2 cameras select both varied low-pivot groups and old B2 selects none", () => {
  const exactFixedC2 = { origin: [0.2925, 0.23], span: [0.04, 0.04] };
  const priorFixedC2 = {
    origin: [0.2861105600489004, 0.2189284007464498],
    span: [0.04, 0.04],
  };
  const oldBoundary = { origin: [0.196857, 0.177914], span: [0.028, 0.028] };
  assert.equal(selectNinjaOneEnvironmentFoliageInstances(exactFixedC2).length, 2);
  assert.equal(selectNinjaOneEnvironmentFoliageInstances(priorFixedC2).length, 2);
  assert.deepEqual(selectNinjaOneEnvironmentFoliageInstances(oldBoundary), []);
  assert.deepEqual(
    environmentFoliageCameraArtboardView(exactFixedC2).origin.map((value) => (
      Number(value.toFixed(3))
    )),
    [964.8, 745.2],
  );
  assert.equal(
    new Set(NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES.map(({ phaseSeconds }) => phaseSeconds)).size,
    2,
  );
  assert.equal(
    new Set(NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES.map(({ durationSeconds }) => durationSeconds)).size,
    2,
  );
  for (const instance of NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES) {
    assert.ok(instance.pivotYPercent >= 92 && instance.pivotYPercent <= 98);
    assert.ok(instance.bendDegrees > 0 && instance.bendDegrees <= 0.5);
    assert.equal(instance.resources.length, 2);
  }
});

test("max-detail foliage eligibility enters at .05 retains through .06 and exits by .074", () => {
  const cameraAtSpan = (span) => ({
    origin: [0.3125 - span / 2, 0.25 - span / 2],
    span: [span, span],
  });
  const eligibility = (span, previousEligible) => (
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
  assert.equal(eligibility(0.04, false), true);
  assert.equal(eligibility(0.05, false), true);
  assert.equal(eligibility(0.055, false), false);
  assert.equal(eligibility(0.055, true), true);
  assert.equal(eligibility(0.06, true), true);
  assert.equal(eligibility(0.074, true), false);
  assert.equal(selectNinjaOneEnvironmentFoliageInstances(cameraAtSpan(0.04)).length, 2);
  assert.equal(selectNinjaOneEnvironmentFoliageInstances(cameraAtSpan(0.04), true, 2).length, 2);
  assert.equal(selectNinjaOneEnvironmentFoliageInstances(cameraAtSpan(0.04), true, 1).length, 1);
  assert.equal(selectNinjaOneEnvironmentFoliageInstances(cameraAtSpan(0.04), true, 0).length, 0);
  assert.equal(selectNinjaOneEnvironmentFoliageInstances(cameraAtSpan(0.04), true, 1.5).length, 0);
  assert.equal(selectNinjaOneEnvironmentFoliageInstances(cameraAtSpan(0.055)).length, 0);
  assert.equal(selectNinjaOneEnvironmentFoliageInstances(cameraAtSpan(0.055), true).length, 2);
  assert.equal(selectNinjaOneEnvironmentFoliageInstances(cameraAtSpan(0.074), true).length, 0);
  assert.equal(resolveNinjaOneEnvironmentFoliageEligibility({
    active: false,
    camera: cameraAtSpan(0.04),
    previousEligible: true,
    shouldLoadCloseAssets: true,
    showFoliage: true,
  }), false);
});

test("resource cohorts are canonical and same-set camera churn cannot restart hidden node loading", async () => {
  const forward = environmentFoliageResourceCohort(NINJAONE_ENVIRONMENT_FOLIAGE_RESOURCES);
  const reverse = environmentFoliageResourceCohort([
    ...NINJAONE_ENVIRONMENT_FOLIAGE_RESOURCES,
  ].reverse());
  assert.equal(forward, reverse);
  assert.equal(forward.split("\n").length, 4);

  const component = await readFile(
    path.join(ROOT, "features/career-world/layers/terrain/detail/components/NinjaOneEnvironmentFoliage.tsx"),
    "utf8",
  );
  assert.match(component, /environmentFoliageResourceCohort\(selectedResources\)/);
  assert.match(component, /resource\.path}#sha256=\$\{resource\.sha256\}/);
  assert.match(component, /retargetNinjaOneEnvironmentFoliageNodeLoadCohort/);
  assert.match(component, /recordNinjaOneEnvironmentFoliageNodeLoadEvent/);
  assert.match(component, /onLoad=\{\(\) => handleLoad\(/);
  assert.match(component, /onError=\{\(\) => onResourceError\(/);
  assert.match(component, /key=\{`\$\{currentLoadState\.epoch\}:\$\{instance\.id\}`\}/);
  assert.match(
    component,
    /window\.requestAnimationFrame\(\(\) => \{[\s\S]*?window\.requestAnimationFrame/,
  );
  assert.match(component, /observeNinjaOneEnvironmentFoliageDomResidency/);
  assert.match(component, /querySelectorAll<SVGImageElement>\("image\[data-shared-resource\]"\)/);
  assert.doesNotMatch(component, /assetPaths/);
  assert.doesNotMatch(component, /new window\.Image|preloadImage/);
});

test("component mounts static neutralization before animated canopy and exposes actual accounting", async () => {
  const [component, css] = await Promise.all([
    readFile(
      path.join(ROOT, "features/career-world/layers/terrain/detail/components/NinjaOneEnvironmentFoliage.tsx"),
      "utf8",
    ),
    readFile(path.join(ROOT, "features/career-world/styles/career-world.css"), "utf8"),
  ]);
  const neutralIndex = component.indexOf("canopy-neutralization");
  const swayIndex = component.indexOf("canopy-sway");
  assert.ok(neutralIndex >= 0 && neutralIndex < swayIndex);
  assert.match(component, /data-environment-foliage-selected-resource-ids/);
  assert.match(component, /data-environment-foliage-selected-decoded-bytes/);
  assert.match(component, /data-environment-foliage-mounted-image-node-count/);
  assert.match(component, /data-environment-foliage-mounted-resource-ids/);
  assert.match(component, /data-environment-foliage-max-detail-eligible/);
  assert.match(component, /data-environment-foliage-maximum-groups/);
  assert.match(component, /NINJAONE_ENVIRONMENT_FOLIAGE_NODES_PER_GROUP/);
  assert.doesNotMatch(component, /setInterval|translate\(/);
  assert.equal(component.match(/window\.requestAnimationFrame/g)?.length, 2);
  assert.equal(component.match(/window\.cancelAnimationFrame/g)?.length, 2);

  const swayBlock = css.match(
    /\.ninjaone-environment-native-detail__canopy-sway \{[\s\S]*?@keyframes ninjaone-native-canopy-sway \{[\s\S]*?\n\}/,
  )?.[0];
  assert.ok(swayBlock, "canopy animation block is missing");
  assert.match(swayBlock, /transform-origin: 50% var\(--ninjaone-foliage-pivot-y, 94%\)/);
  assert.match(swayBlock, /var\(--ninjaone-foliage-duration, 6\.4s\)/);
  assert.match(swayBlock, /var\(--ninjaone-foliage-phase/);
  assert.match(swayBlock, /opacity: 1/);
  assert.doesNotMatch(swayBlock, /translate\(/);
  const neutralBlock = css.match(
    /\.ninjaone-environment-native-detail__canopy-neutralization \{[\s\S]*?\}/,
  )?.[0];
  assert.ok(neutralBlock);
  assert.doesNotMatch(neutralBlock, /animation|transform/);
});
