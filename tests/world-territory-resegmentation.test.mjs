import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

const root = process.cwd();
const territoryColors = new Map([
  ["#71b7d3", "ninjaone"],
  ["#d58a6d", "tanium"],
  ["#a9ba72", "independent"],
  ["#9b82ce", "column-technologies"],
  ["#d8bb65", "ace-hardware"],
]);

function componentLabels(pixels, width, height) {
  const labels = new Int32Array(width * height).fill(-1);
  const components = [];
  for (let start = 0; start < labels.length; start += 1) {
    if (pixels[start] < 128 || labels[start] >= 0) continue;
    const id = components.length;
    const queue = [start];
    labels[start] = id;
    let total = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      const x = current % width;
      const y = Math.floor(current / width);
      total += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      for (const neighbor of [current - 1, current + 1, current - width, current + width]) {
        if (
          neighbor < 0
          || neighbor >= labels.length
          || (Math.abs(neighbor - current) === 1 && Math.floor(neighbor / width) !== y)
          || pixels[neighbor] < 128
          || labels[neighbor] >= 0
        ) continue;
        labels[neighbor] = id;
        queue.push(neighbor);
      }
    }
    components.push({ id, total, bbox: [minX, minY, maxX, maxY] });
  }
  return { labels, components };
}

function territoryPaths(svg) {
  return [...svg.matchAll(/<path id="(territory-[^"]+)" fill="(#[0-9a-f]+)" d="([^"]+)"\/>/giu)]
    .map(([, id, fill, d]) => ({ id: id.slice("territory-".length), fill, d }));
}

async function rasterizePath(pathSpec, width, height) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path fill="#ffffff" d="${pathSpec.d}"/></svg>`;
  return sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
}

test("territory resegmentation assigns every significant island to its ruled owners", async () => {
  const [manifestText, segmentation, land] = await Promise.all([
    readFile(path.join(root, "public/career-world/layers/terrain/authority/manifests/world-territories-r4.json"), "utf8"),
    readFile(path.join(root, "public/career-world/layers/terrain/authority/masks/territory-segmentation-r4.svg"), "utf8"),
    sharp(path.join(root, "public/career-world/layers/terrain/authority/masks/world-land-mask-r4.png"))
      .removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true }),
  ]);
  const manifest = JSON.parse(manifestText);
  const { width, height } = land.info;
  const paths = territoryPaths(segmentation);
  assert.deepEqual(paths.map(({ id }) => id).sort(), [...territoryColors.values()].sort());
  assert.deepEqual(paths.map(({ fill }) => fill).sort(), [...territoryColors.keys()].sort());

  const rasters = new Map(await Promise.all(paths.map(async (pathSpec) => [
    pathSpec.id,
    await rasterizePath(pathSpec, width, height),
  ])));
  const { labels, components } = componentLabels(land.data, width, height);
  const significant = components.filter(({ total }) => total >= 500).sort((left, right) => right.total - left.total);
  assert.equal(significant.length, 5);

  const coverage = new Uint8Array(width * height);
  const ownership = new Map(significant.map(({ id }) => [id, new Map()]));
  for (let index = 0; index < land.data.length; index += 1) {
    if (land.data[index] < 128) continue;
    for (const [territoryId, raster] of rasters) {
      if (raster[index * 4 + 3] === 0) continue;
      coverage[index] += 1;
      const allocation = ownership.get(labels[index]);
      if (allocation) allocation.set(territoryId, (allocation.get(territoryId) ?? 0) + 1);
    }
    assert.equal(coverage[index], 1, `land pixel ${index} must have exactly one territory owner`);
  }

  const owners = significant.map(({ id }) => [...ownership.get(id).keys()].sort());
  assert.deepEqual(owners, [
    ["ninjaone", "tanium"],
    ["ace-hardware", "column-technologies"],
    ["independent"],
    ["independent"],
    ["column-technologies"],
  ]);

  const expectedIslandRank = new Map([
    ["ninjaone", 0],
    ["tanium", 0],
    ["column-technologies", 1],
    ["ace-hardware", 1],
    ["independent", 2],
  ]);
  for (const territory of manifest.territories) {
    const [anchorX, anchorY] = territory.development.capitalAnchor;
    const anchorIndex = Math.floor(anchorY * height) * width + Math.floor(anchorX * width);
    const anchorRaster = rasters.get(territory.id);
    assert.ok(land.data[anchorIndex] >= 128, `${territory.id} capital anchor must be on land`);
    assert.ok(anchorRaster[anchorIndex * 4 + 3] > 0, `${territory.id} capital anchor must be in its own region`);
    assert.equal(
      significant.findIndex(({ id }) => id === labels[anchorIndex]),
      expectedIslandRank.get(territory.id),
      `${territory.id} capital anchor must be on its ruled island`,
    );

    const view = territory.focusView;
    const focusIndex = Math.floor((view.origin[1] + view.span[1] / 2) * height) * width
      + Math.floor((view.origin[0] + view.span[0] / 2) * width);
    assert.ok(land.data[focusIndex] >= 128, `${territory.id} focus center must be on land`);
    assert.ok(anchorRaster[focusIndex * 4 + 3] > 0, `${territory.id} focus center must be in its own region`);

    const envelope = territory.development.capitalEnvelope;
    for (let y = Math.floor(envelope.origin[1] * height); y < Math.ceil((envelope.origin[1] + envelope.span[1]) * height); y += 1) {
      for (let x = Math.floor(envelope.origin[0] * width); x < Math.ceil((envelope.origin[0] + envelope.span[0]) * width); x += 1) {
        assert.ok(anchorRaster[(y * width + x) * 4 + 3] > 0, `${territory.id} envelope must remain in its region`);
      }
    }
  }

  const ninjaOne = manifest.territories.find(({ id }) => id === "ninjaone");
  assert.deepEqual(ninjaOne.development.capitalEnvelope, {
    origin: [0.125, 0],
    span: [0.125, 0.16666666666666666],
  });
});
