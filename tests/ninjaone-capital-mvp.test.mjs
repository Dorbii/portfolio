import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  NINJAONE_CAPITAL_MVP_ESTIMATED_PLANT_COUNT,
  NINJAONE_CAPITAL_MVP_FOLIAGE_INSTANCES,
  NINJAONE_CAPITAL_MVP_FOLIAGE_RESOURCES,
  NINJAONE_CAPITAL_MVP_LAYER_ORDER,
  NINJAONE_CAPITAL_MVP_LOD_LAYERS,
  NINJAONE_CAPITAL_MVP_PLATES,
  NINJAONE_CAPITAL_MVP_STRUCTURE_INSTANCES,
  NINJAONE_CAPITAL_MVP_STRUCTURE_RESOURCES,
} from "../features/career-world/development/model/ninjaOneCapitalMvp.ts";
import {
  NINJAONE_CAPITAL_SKILLS,
  NINJAONE_CAPITAL_TOPOLOGY_PLOTS,
} from "../features/career-world/development/model/ninjaOneCapitalTopologyProof.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function readPngHeader(publicPath) {
  const relativePath = path.posix.join("public", publicPath.replace(/^\//, ""));
  const absolutePath = path.join(root, relativePath);
  const [buffer, metadata] = await Promise.all([
    readFile(absolutePath),
    stat(absolutePath),
  ]);
  assert.deepEqual(
    [...buffer.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
    relativePath,
  );
  return {
    bitDepth: buffer[24],
    colorType: buffer[25],
    height: buffer.readUInt32BE(20),
    size: metadata.size,
    width: buffer.readUInt32BE(16),
  };
}

test("NinjaOne Capital MVP mounts layers progressively from base to close detail", async () => {
  const manifest = await readJson(
    "public/career-world/capitals/ninjaone/manifests/capital-mvp-r1.json",
  );
  const expectedOrder = [
    "base-surface",
    "district-static-environment",
    "transportation-rails",
    "dynamic-world-light-shadows",
    "skill-buildings",
    "decoration-buildings",
    "transportation-station",
    "shared-animated-foliage",
    "integration-details",
    "close-labels",
  ];
  assert.equal(manifest.id, "career-world/capitals/ninjaone/capital-mvp@r1");
  assert.equal(manifest.status, "production-art-pass");
  assert.equal(manifest.artDirection.shadowPolicy, "dynamic-layer-only");
  assert.equal(manifest.artDirection.registrationPolicy, "one-canvas-all-layers");
  assert.deepEqual(manifest.artDirection.plateCanvas, [1800, 1350]);
  assert.deepEqual(manifest.layerOrder, expectedOrder);
  assert.deepEqual(NINJAONE_CAPITAL_MVP_LAYER_ORDER, expectedOrder);

  const tiers = ["world", "territory", "capital", "site", "close"];
  for (let index = 0; index < tiers.length; index += 1) {
    const tier = tiers[index];
    const layers = NINJAONE_CAPITAL_MVP_LOD_LAYERS[tier];
    assert.deepEqual(layers, manifest.lod[tier]);
    assert.deepEqual(
      [...layers].sort((left, right) => (
        expectedOrder.indexOf(left) - expectedOrder.indexOf(right)
      )),
      layers,
      `${tier} layers must preserve canonical draw order`,
    );
    if (index > 0) {
      for (const previousLayer of NINJAONE_CAPITAL_MVP_LOD_LAYERS[tiers[index - 1]]) {
        assert.ok(layers.includes(previousLayer), `${tier} dropped ${previousLayer}`);
      }
    }
  }

  assert.deepEqual(NINJAONE_CAPITAL_MVP_LOD_LAYERS.world, ["base-surface"]);
  assert.equal(
    NINJAONE_CAPITAL_MVP_LOD_LAYERS.capital.includes("decoration-buildings"),
    false,
  );
  assert.ok(NINJAONE_CAPITAL_MVP_LOD_LAYERS.site.includes("decoration-buildings"));
  assert.ok(NINJAONE_CAPITAL_MVP_LOD_LAYERS.site.includes("integration-details"));
  assert.equal(NINJAONE_CAPITAL_MVP_LOD_LAYERS.site.includes("close-labels"), false);
  assert.ok(NINJAONE_CAPITAL_MVP_LOD_LAYERS.close.includes("close-labels"));
});

test("authored capital plates share one registered canvas and publish lighter LODs", async () => {
  const tiers = ["world", "territory", "capital", "site", "close"];
  for (const plateId of ["base", "staticEnvironment"]) {
    const plate = NINJAONE_CAPITAL_MVP_PLATES[plateId];
    for (const tier of tiers) {
      const source = plate[tier];
      assert.match(source.path, /^\/career-world\/capitals\/ninjaone\/plates\//);
      assert.match(source.path, /-r2\.webp$/);
      const absolutePath = path.join(root, "public", source.path.replace(/^\//, ""));
      const [buffer, metadata] = await Promise.all([
        readFile(absolutePath),
        stat(absolutePath),
      ]);
      assert.equal(buffer.subarray(0, 4).toString("ascii"), "RIFF", source.path);
      assert.equal(buffer.subarray(8, 12).toString("ascii"), "WEBP", source.path);
      assert.ok(metadata.size > 40_000, `${source.path} is unexpectedly empty`);
    }
    assert.ok(plate.world.dimensions[0] < plate.territory.dimensions[0]);
    assert.ok(plate.territory.dimensions[0] < plate.capital.dimensions[0]);
    assert.ok(plate.capital.dimensions[0] < plate.site.dimensions[0]);
    assert.ok(plate.site.dimensions[0] < plate.close.dimensions[0]);
    assert.notEqual(plate.close.path, plate.site.path);
  }
});

test("every capital plot instantiates one fitting shared structure and no project", () => {
  assert.equal(NINJAONE_CAPITAL_TOPOLOGY_PLOTS.length, 25);
  assert.equal(NINJAONE_CAPITAL_MVP_STRUCTURE_INSTANCES.length, 25);
  assert.equal(NINJAONE_CAPITAL_MVP_STRUCTURE_RESOURCES.length, 7);
  assert.deepEqual(
    NINJAONE_CAPITAL_MVP_STRUCTURE_INSTANCES.map(({ plot }) => plot.id).sort(),
    NINJAONE_CAPITAL_TOPOLOGY_PLOTS.map(({ id }) => id).sort(),
  );

  const skills = NINJAONE_CAPITAL_MVP_STRUCTURE_INSTANCES.filter(
    ({ plot }) => plot.role === "skill",
  );
  const decorations = NINJAONE_CAPITAL_MVP_STRUCTURE_INSTANCES.filter(
    ({ plot }) => plot.role === "decoration",
  );
  const stations = NINJAONE_CAPITAL_MVP_STRUCTURE_INSTANCES.filter(
    ({ plot }) => plot.role === "station",
  );
  assert.equal(skills.length, 18);
  assert.equal(decorations.length, 6);
  assert.equal(stations.length, 1);
  assert.deepEqual(
    skills.map(({ plot }) => plot.skillId).sort(),
    NINJAONE_CAPITAL_SKILLS.map(({ id }) => id).sort(),
  );
  assert.ok(NINJAONE_CAPITAL_MVP_STRUCTURE_INSTANCES.every(
    ({ plot }) => plot.role !== "project" && !plot.id.startsWith("project-"),
  ));
  assert.equal(new Set(skills.map(({ resource }) => resource.id)).size, 3);

  for (const instance of NINJAONE_CAPITAL_MVP_STRUCTURE_INSTANCES) {
    const xs = instance.plot.polygon.map(([x]) => x);
    const plotWidth = Math.max(...xs) - Math.min(...xs);
    const footprintWidth = instance.displayWidth
      * instance.resource.footprintFraction[0];
    assert.ok(footprintWidth <= plotWidth, instance.plot.id);
    assert.equal(
      instance.minimumTier,
      instance.plot.role === "decoration" ? "site" : "capital",
    );
  }
});

test("shared structure raster resources are RGBA, reusable, and shadow-free by contract", async () => {
  const manifest = await readJson(
    "public/career-world/shared-assets/structures/manifests/ninjaone-capital-structures-r1.json",
  );
  assert.equal(manifest.id, "career-world/shared-assets/ninjaone-capital-structures@r1");
  assert.equal(manifest.shadowOwnership, "capital/dynamic-world-light");
  assert.equal(manifest.resources.length, 7);

  for (const resource of NINJAONE_CAPITAL_MVP_STRUCTURE_RESOURCES) {
    assert.match(resource.path, /^\/career-world\/shared-assets\//);
    const header = await readPngHeader(resource.path);
    assert.deepEqual([header.width, header.height], resource.dimensions, resource.id);
    assert.equal(header.bitDepth, 8, resource.id);
    assert.equal(header.colorType, 6, `${resource.id} must retain an alpha channel`);
    assert.ok(header.size > 100_000, `${resource.id} is unexpectedly empty`);
  }

  const useCount = new Map();
  for (const { resource } of NINJAONE_CAPITAL_MVP_STRUCTURE_INSTANCES) {
    useCount.set(resource.id, (useCount.get(resource.id) ?? 0) + 1);
  }
  assert.ok([...useCount.values()].some((count) => count >= 5));
  assert.ok(useCount.size < NINJAONE_CAPITAL_MVP_STRUCTURE_INSTANCES.length);
});

test("shared grouped foliage restores density with far fewer runtime nodes", async () => {
  const manifest = await readJson(
    "public/career-world/shared-assets/environment/foliage/foliage-pool-r1.json",
  );
  assert.equal(manifest.id, "career-world/shared-foliage@r1");
  assert.equal(manifest.ownership, "world-shared-assets/environment/foliage");
  assert.equal(manifest.animationContract, "split-canopy-world-wind");
  assert.equal(NINJAONE_CAPITAL_MVP_FOLIAGE_RESOURCES.length, 10);
  assert.equal(NINJAONE_CAPITAL_MVP_FOLIAGE_INSTANCES.length, 18);
  assert.ok(
    NINJAONE_CAPITAL_MVP_FOLIAGE_RESOURCES.filter(
      ({ presentation }) => presentation === "copse",
    ).length >= 4,
  );
  assert.ok(NINJAONE_CAPITAL_MVP_FOLIAGE_RESOURCES.every(
    ({ atlasPath }) => atlasPath.startsWith(
      "/career-world/shared-assets/environment/foliage/",
    ),
  ));
  assert.equal(NINJAONE_CAPITAL_MVP_ESTIMATED_PLANT_COUNT, 154);
  assert.ok(
    NINJAONE_CAPITAL_MVP_ESTIMATED_PLANT_COUNT
      > NINJAONE_CAPITAL_MVP_FOLIAGE_INSTANCES.length * 8,
  );

  const capitalNodes = NINJAONE_CAPITAL_MVP_FOLIAGE_INSTANCES.filter(
    ({ minimumTier }) => minimumTier === "capital",
  );
  assert.equal(capitalNodes.length, 16);
  assert.ok(
    capitalNodes.reduce(
      (total, { resource }) => total + resource.visualPlantCount,
      0,
    ) >= 130,
  );
  for (const foliageId of [
    "upper-garden-tree",
    "upper-archive-tree",
    "upper-understory",
    "middle-west-tree",
  ]) {
    assert.equal(
      capitalNodes.find(({ id }) => id === foliageId)?.depth,
      "background",
      `${foliageId} must composite behind adjacent structures`,
    );
  }
});

test("the isolated MVP route preserves explicit ownership and excludes legacy city art", async () => {
  const [page, scene, renderer, model] = await Promise.all([
    readFile(path.join(
      root,
      "app/career-world/previews/ninjaone-capital-mvp/page.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/composition/WorldScene.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/development/NinjaOneCapitalMvp.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/development/model/ninjaOneCapitalMvp.ts",
    ), "utf8"),
  ]);

  assert.match(page, /<CareerWorld capitalMvp enableDevelopmentTools \/>/);
  assert.match(scene, /topologyProof \? \([\s\S]*: capitalMvp \? \(/);
  assert.match(scene, /<NinjaOneCapitalMvp[\s\S]*light=\{WORLD_LIGHT\}/);
  assert.match(scene, /!topologyProof && !capitalMvp/);
  for (const layer of NINJAONE_CAPITAL_MVP_LAYER_ORDER) {
    assert.match(renderer, new RegExp(`data-capital-layer="${layer}"`), layer);
  }
  assert.match(renderer, /data-shared-asset="structure"/);
  assert.match(renderer, /data-shared-asset="foliage"/);
  assert.match(renderer, /data-capital-plate="base"/);
  assert.match(renderer, /data-capital-plate="static-environment"/);
  assert.doesNotMatch(renderer, /ninjaone-capital-mvp__plot-pad/);
  assert.doesNotMatch(renderer, /ninjaone-capital-mvp__district-surface/);
  assert.match(renderer, /data-light-source=\{light\.id\}/);
  assert.match(renderer, /data-integration-contract="additive-no-cast-shadow"/);
  assert.doesNotMatch(renderer, /<feDropShadow/);
  assert.doesNotMatch(`${renderer}\n${model}`, /Kaizen/i);
});
