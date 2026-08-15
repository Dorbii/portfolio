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
  ninjaOneEnvironmentFoliageInstanceIntersectsCamera,
  resolveNinjaOneEnvironmentFoliageEligibility,
  selectNinjaOneEnvironmentFoliageInstances,
} from "../features/career-world/layers/terrain/detail/model/ninjaOneEnvironmentFoliage.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const MANIFEST_PATH = path.join(
  ROOT,
  "public/career-world/capitals/ninjaone/environment/manifests/foliage-native-r4.json",
);
const BUILDER_PATH = path.join(
  ROOT,
  "scripts/build-ninjaone-environment-foliage-r4.mjs",
);
const COMPONENT_PATH = path.join(
  ROOT,
  "features/career-world/layers/terrain/detail/components/NinjaOneEnvironmentFoliage.tsx",
);
const CANVAS_PATH = path.join(
  ROOT,
  "features/career-world/layers/terrain/detail/components/NinjaOneEnvironmentFoliageCanvas.tsx",
);
const WEBGL_PATH = path.join(
  ROOT,
  "features/career-world/layers/terrain/detail/components/ninjaOneEnvironmentFoliageWebGl.ts",
);
const CSS_PATH = path.join(ROOT, "features/career-world/styles/career-world.css");
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

function rectanglesOverlap(left, right) {
  return left[0] < right[0] + right[2]
    && left[0] + left[2] > right[0]
    && left[1] < right[1] + right[3]
    && left[1] + left[3] > right[1];
}

function compositeRgba(base, layer) {
  const output = Buffer.from(base);
  for (let pixel = 0; pixel < base.length / 4; pixel += 1) {
    const offset = pixel * 4;
    const alpha = layer[offset + 3] / 255;
    if (alpha === 0) continue;
    for (let channel = 0; channel < 3; channel += 1) {
      output[offset + channel] = Math.round(
        layer[offset + channel] * alpha + base[offset + channel] * (1 - alpha),
      );
    }
    output[offset + 3] = 255;
  }
  return output;
}

function cropRgba(source, sourceWidth, rect) {
  const [left, top, width, height] = rect;
  const output = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceOffset = ((top + y) * sourceWidth + left) * 4;
    source.copy(output, y * width * 4, sourceOffset, sourceOffset + width * 4);
  }
  return output;
}

function exactAtRestCrop(atlas, atlasWidth, source, sourceWidth, instance) {
  const [sourceX, sourceY, width, height] = instance.sourceTargetRect;
  const sourceCrop = cropRgba(source, sourceWidth, [sourceX, sourceY, width, height]);
  const neutral = cropRgba(atlas, atlasWidth, instance.neutralizationAtlasRect);
  const canopy = cropRgba(atlas, atlasWidth, instance.canopyAtlasRect);
  const reconstructed = compositeRgba(compositeRgba(sourceCrop, neutral), canopy);
  assert.equal(
    Buffer.compare(reconstructed, sourceCrop),
    0,
    `${instance.id} changes the accepted plate at rest`,
  );
}

test("r5 foliage preserves the r8 plate through one bounded pooled atlas", async () => {
  assert.equal(manifest.schemaVersion, 4);
  assert.equal(manifest.id, "career-world/capitals/ninjaone/foliage-native@r5");
  assert.equal(manifest.sourceMaster.authority, "active-r8-geology-master");
  assert.deepEqual(manifest.sourceMaster.dimensions, [5760, 4320]);
  assert.equal(manifest.quality.visibleRgbAuthority, "terrain-master-detail-r8");
  assert.equal(manifest.quality.atRestChangedPixels, 0);
  assert.equal(manifest.quality.registeredConifers, manifest.instances.length);
  assert.ok(manifest.quality.registeredConifers >= manifest.quality.minimumRegisteredConifers);
  assert.ok(manifest.quality.registeredConifers >= 120);
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES.length, manifest.instances.length);
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_RESOURCES.length, 1);
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS, 32);
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_NODES_PER_GROUP, 2);
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_MAX_MOUNTED_NODES, 64);
  assert.equal(manifest.budgets.uniqueTextureResources, 1);
  assert.equal(manifest.budgets.atlasFrameCount, manifest.instances.length * 2);
  assert.equal(manifest.budgets.maximumSupplementalNodes, 64);
  assert.equal(manifest.budgets.foliageDecodedBytes, NINJAONE_ENVIRONMENT_FOLIAGE_DECODED_BYTES);
  assert.equal(manifest.budgets.combinedDecodedBytes, NINJAONE_ENVIRONMENT_FOLIAGE_COMBINED_DECODED_BYTES);
  assert.ok(NINJAONE_ENVIRONMENT_FOLIAGE_COMBINED_DECODED_BYTES <= 32 * 1024 * 1024);

  const mountedPaths = new Set(manifest.resources.map((resource) => resource.path));
  assert.equal(manifest.segmentationSources.length, 4);
  assert.equal(manifest.neutralizationSources.length, 4);
  for (const source of [...manifest.segmentationSources, ...manifest.neutralizationSources]) {
    assert.equal(mountedPaths.has(source.path), false, `${source.id} is build input, not runtime texture`);
    const bytes = await readFile(repoFile(source.path));
    assert.equal(sha256(bytes), source.sha256);
  }
});

test("the shared atlas is valid, tightly packed, and every registered tree is exact at rest", async () => {
  const [resource] = manifest.resources;
  const atlasPath = repoFile(resource.path);
  const atlasBytes = await readFile(atlasPath);
  const atlasMetadata = await sharp(atlasBytes).metadata();
  assert.equal(sha256(atlasBytes), resource.sha256);
  assert.deepEqual([atlasMetadata.width, atlasMetadata.height], resource.dimensions);
  assert.equal(resource.decodedBytes, resource.dimensions[0] * resource.dimensions[1] * 4);
  assert.equal(resource.frameCount, manifest.instances.length * 2);

  const frames = manifest.instances.flatMap((instance) => [
    instance.canopyAtlasRect,
    instance.neutralizationAtlasRect,
  ]);
  for (const frame of frames) {
    assert.ok(frame[0] + frame[2] <= resource.dimensions[0]);
    assert.ok(frame[1] + frame[3] <= resource.dimensions[1]);
  }
  for (let left = 0; left < frames.length; left += 1) {
    for (let right = left + 1; right < frames.length; right += 1) {
      assert.equal(rectanglesOverlap(frames[left], frames[right]), false, `atlas frames ${left}/${right} overlap`);
    }
  }

  const source = await sharp(repoFile(manifest.sourceMaster.path)).resize(2880, 2160, {
    fit: "fill",
    kernel: sharp.kernel.lanczos3,
  }).ensureAlpha().raw().toBuffer();
  const atlas = await sharp(atlasPath).ensureAlpha().raw().toBuffer();
  for (const instance of manifest.instances) {
    exactAtRestCrop(atlas, resource.dimensions[0], source, 2880, instance);
  }
});

test("registered conifers retain terrain coordinates and varied restrained motion", () => {
  assert.deepEqual(
    [...new Set(NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES.map(({ gridCell }) => gridCell))].sort(),
    ["B1", "B2", "C1", "C2"],
  );
  assert.ok(new Set(NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES.map(({ durationSeconds }) => durationSeconds)).size >= 12);
  assert.ok(new Set(NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES.map(({ phaseSeconds }) => phaseSeconds)).size >= 8);
  for (const instance of NINJAONE_ENVIRONMENT_FOLIAGE_INSTANCES) {
    const [x, y, width, height] = instance.sourceTargetRect;
    assert.deepEqual(instance.artboardBounds.origin, [x / 2, y / 2]);
    assert.deepEqual(instance.artboardBounds.span, [width / 2, height / 2]);
    assert.strictEqual(instance.canopyResource, instance.neutralizationResource);
    assert.strictEqual(instance.canopyResource, instance.atlasResource);
    assert.deepEqual(instance.resources, [instance.atlasResource]);
    assert.equal(instance.animation, "canopy-bend");
    assert.ok(instance.bendDegrees >= 0.6 && instance.bendDegrees <= 1.25);
    assert.ok(instance.durationSeconds >= 6 && instance.durationSeconds <= 10);
    assert.ok(instance.pivotYPercent >= 94 && instance.pivotYPercent <= 98);
  }
});

test("the reported lower-ridge camera mounts native trees and gates motion to the actual viewport", () => {
  const camera = Object.freeze({
    origin: Object.freeze([0.26148278569762023, 0.14119340966684502]),
    span: Object.freeze([0.075, 0.075]),
  });
  const selected = selectNinjaOneEnvironmentFoliageInstances(camera, true, 32);
  const moving = selected.filter((instance) => (
    ninjaOneEnvironmentFoliageInstanceIntersectsCamera(camera, instance)
  ));
  assert.ok(selected.length >= 4, `expected registered density, received ${selected.length}`);
  assert.ok(moving.length > 0, "at least one registered canopy must intersect the reported camera");
  assert.ok(moving.length <= selected.length);
  assert.ok(selected.length <= NINJAONE_ENVIRONMENT_FOLIAGE_MAX_SELECTED_GROUPS);
  assert.equal(environmentFoliageResourceCohort(NINJAONE_ENVIRONMENT_FOLIAGE_RESOURCES).split("\n").length, 1);

  const artboardView = environmentFoliageCameraArtboardView(camera);
  assert.ok(artboardView.span[0] > 0 && artboardView.span[1] > 0);
});

test("foliage LoD uses hysteresis and cannot mount outside close detail", () => {
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_ENTER_SPAN, 0.12);
  assert.equal(NINJAONE_ENVIRONMENT_FOLIAGE_MAX_DETAIL_RETAIN_SPAN, 0.14);
  const camera = { origin: [0.2, 0.1], span: [0.13, 0.13] };
  assert.equal(resolveNinjaOneEnvironmentFoliageEligibility({
    active: true,
    camera,
    previousEligible: false,
    shouldLoadCloseAssets: true,
    showFoliage: true,
  }), false);
  assert.equal(resolveNinjaOneEnvironmentFoliageEligibility({
    active: true,
    camera,
    previousEligible: true,
    shouldLoadCloseAssets: true,
    showFoliage: true,
  }), true);
  assert.deepEqual(selectNinjaOneEnvironmentFoliageInstances(
    { origin: [0.2, 0.1], span: [0.15, 0.15] },
    true,
    32,
  ), []);
});

test("the renderer crops one shared atlas and animates the buffered cohort with rooted deformation", async () => {
  const [component, canvas, webgl, css] = await Promise.all([
    readFile(COMPONENT_PATH, "utf8"),
    readFile(CANVAS_PATH, "utf8"),
    readFile(WEBGL_PATH, "utf8"),
    readFile(CSS_PATH, "utf8"),
  ]);
  assert.match(component, /data-shared-resource=\{atlas\.id\}/);
  assert.match(component, /<use href=\{`#\$\{atlasImageId\}`\} \/>/);
  assert.match(component, /viewBox=\{`\$\{frameX\} \$\{frameY\} \$\{frameWidth\} \$\{frameHeight\}`\}/);
  assert.match(component, /instances=\{instances\}/);
  assert.match(component, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(component, /ninjaone-environment-foliage-r5/);
  assert.equal((component.match(/<image/g) ?? []).length, 1);
  assert.match(canvas, /new IntersectionObserver/);
  assert.match(canvas, /document\.visibilityState === "visible"/);
  assert.match(canvas, /window\.requestAnimationFrame\(draw\)/);
  assert.match(canvas, /window\.cancelAnimationFrame\(frame\)/);
  assert.match(canvas, /data-environment-foliage-renderer=\{ready \? "webgl2-ready" : "static-fallback"\}/);
  assert.match(webgl, /float rootLock = smoothstep\(0\.1, 0\.34, height\)/);
  assert.match(webgl, /float mainWeight = rootLock \* rootLock/);
  assert.match(webgl, /float detailWave = sin/);
  assert.match(webgl, /u_shadowPass/);
  assert.match(webgl, /gl\.TEXTURE_MIN_FILTER, gl\.LINEAR/);
  assert.doesNotMatch(webgl, /generateMipmap/);
  assert.match(css, /__foliage-canvas/);
  assert.doesNotMatch(css, /__canopy-segment/);
});

test("the foliage build is deterministic", async () => {
  const tracked = [MANIFEST_PATH, repoFile(manifest.resources[0].path)];
  const before = await Promise.all(tracked.map(async (file) => sha256(await readFile(file))));
  await execFileAsync(process.execPath, [BUILDER_PATH], { cwd: ROOT });
  const after = await Promise.all(tracked.map(async (file) => sha256(await readFile(file))));
  assert.deepEqual(after, before);
});
