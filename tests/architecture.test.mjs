import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  CAREER_WORLD_LAYER_ORDER,
} from "../features/career-world/shared/layers.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const featureLayers = path.join(root, "features", "career-world", "layers");
const publicLayers = path.join(root, "public", "career-world", "layers");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

test("source directories implement the declared eight-layer order", async () => {
  const directories = [];
  for (const entry of await readdir(featureLayers)) {
    if ((await stat(path.join(featureLayers, entry))).isDirectory()) {
      directories.push(entry);
    }
  }
  assert.deepEqual(
    directories.sort(),
    [...CAREER_WORLD_LAYER_ORDER].sort(),
  );
  assert.equal(CAREER_WORLD_LAYER_ORDER.length, 8);
  assert.equal(CAREER_WORLD_LAYER_ORDER.includes("coastline"), false);
});

test("five focus views remain valid crops of one world plane", async () => {
  const manifest = await readJson(
    "public/career-world/layers/territory-landform/manifests/world-territories-r4.json",
  );
  assert.equal(manifest.territories.length, 5);
  assert.equal(new Set(manifest.territories.map(({ id }) => id)).size, 5);

  for (const territory of manifest.territories) {
    assert.equal(territory.focusView.origin.length, 2);
    assert.equal(territory.focusView.span.length, 2);
    for (let index = 0; index < 2; index += 1) {
      const origin = territory.focusView.origin[index];
      const span = territory.focusView.span[index];
      assert.ok(span >= 0.18 && span <= 1, territory.id);
      assert.ok(origin >= 0 && origin + span <= 1, territory.id);
    }
  }
});

test("coast ownership stays out of composition and land runtime patches", async () => {
  const waterRoot = path.join(featureLayers, "water-surface");
  const files = [];

  async function collect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await collect(absolute);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        files.push(absolute);
      }
    }
  }

  await collect(path.join(root, "features", "career-world"));
  const source = (
    await Promise.all(files.map((file) => readFile(file, "utf8")))
  ).join("\n");
  const waterSource = (
    await Promise.all(
      (await readdir(path.join(waterRoot, "model")))
        .filter((file) => file.endsWith(".ts"))
        .map((file) => readFile(path.join(waterRoot, "model", file), "utf8")),
    )
  ).join("\n");

  assert.equal(source.includes("land-contact-overlay"), false);
  assert.equal(waterSource.includes("deferred-coast-accents"), false);
  assert.equal(waterSource.includes("coastline-effect-nodes"), false);
});

test("deferred crash accents are isolated in actors-effects", async () => {
  const deferred = await readJson(
    "public/career-world/layers/actors-effects/manifests/deferred-coast-accents-r1.json",
  );
  assert.equal(deferred.status, "deferred-phase-7");
  assert.ok(deferred.nodes.length > 0);
  assert.equal(
    await stat(
      path.join(
        publicLayers,
        "water-surface",
        "manifests",
        "coast-geometry-r1.json",
      ),
    ).then(() => true),
    true,
  );
});

