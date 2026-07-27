import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  resolveDetailState,
  resolveNodeVisibility,
} from "../features/career-world/shared/lod.ts";
import { WORLD_PLANE } from "../features/career-world/shared/world.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

test("Phase 6 registers one distinct capital core per territory", async () => {
  const structures = await readJson(
    "public/career-world/layers/structures/manifests/capital-structures-r1.json",
  );
  const territories = await readJson(
    "public/career-world/layers/territory-landform/manifests/world-territories-r4.json",
  );
  const territoryIds = territories.territories.map(({ id }) => id).sort();
  const capitalTerritoryIds = structures.nodes
    .map(({ territoryId }) => territoryId)
    .sort();

  assert.equal(structures.status, "phase-6-checkpoint");
  assert.equal(structures.minimumTier, "territory");
  assert.equal(structures.nodes.length, 5);
  assert.deepEqual(capitalTerritoryIds, territoryIds);
  assert.equal(
    new Set(structures.nodes.map(({ id }) => id)).size,
    structures.nodes.length,
  );
  assert.equal(
    new Set(structures.nodes.map(({ archetype }) => archetype)).size,
    structures.nodes.length,
  );
  assert.equal(structures.projection.type, "orthographic-high-oblique");
  assert.equal(
    structures.projection.lightSource,
    "career-world/world-light@r1",
  );
  assert.equal(
    structures.nodes.some((capital) => "rotation" in capital),
    false,
  );
});

test("capital manifest consumes Phase 3 anchors without duplicating them", async () => {
  const structures = await readJson(
    "public/career-world/layers/structures/manifests/capital-structures-r1.json",
  );
  const serialized = JSON.stringify(structures.nodes);

  assert.match(structures.anchorSource, /world-territories-r4\.json/);
  assert.equal(serialized.includes("capitalAnchor"), false);
  assert.equal(serialized.includes("\"anchor\""), false);
  assert.equal(serialized.includes("\"position\""), false);
});

test("every capital footprint stays inside its development envelope", async () => {
  const structures = await readJson(
    "public/career-world/layers/structures/manifests/capital-structures-r1.json",
  );
  const territories = await readJson(
    "public/career-world/layers/territory-landform/manifests/world-territories-r4.json",
  );

  for (const capital of structures.nodes) {
    const territory = territories.territories.find(
      ({ id }) => id === capital.territoryId,
    );
    assert.ok(territory, capital.territoryId);

    const [width, height] = capital.footprintSpan;
    const [groundX, groundY] = capital.groundAnchor;
    const [anchorX, anchorY] = territory.development.capitalAnchor;
    const [originX, originY] =
      territory.development.authoringEnvelope.origin;
    const [spanX, spanY] = territory.development.authoringEnvelope.span;

    assert.ok(anchorX - width * groundX >= originX, capital.id);
    assert.ok(anchorX + width * (1 - groundX) <= originX + spanX, capital.id);
    assert.ok(anchorY - height * groundY >= originY, capital.id);
    assert.ok(anchorY + height * (1 - groundY) <= originY + spanY, capital.id);
    assert.ok(
      width / spanX <= 0.3,
      `${capital.id} structure consumes too much envelope width`,
    );
    assert.ok(
      height / spanY <= 0.5,
      `${capital.id} structure consumes too much envelope height`,
    );
    assert.ok(groundX >= 0 && groundX <= 1, capital.id);
    assert.ok(groundY >= 0 && groundY <= 1, capital.id);

    const renderedWidth = width * WORLD_PLANE.width;
    const renderedHeight = height * WORLD_PLANE.height;
    assert.ok(
      Math.abs(renderedWidth / renderedHeight - 1) < 0.015,
      `${capital.id} would distort its square source asset`,
    );
  }
});

test("every capital uses a distinct authored texture asset", async () => {
  const structures = await readJson(
    "public/career-world/layers/structures/manifests/capital-structures-r1.json",
  );
  const assetPaths = structures.nodes.map(({ assetPath }) => assetPath);

  assert.equal(new Set(assetPaths).size, structures.nodes.length);
  for (const assetPath of assetPaths) {
    assert.match(assetPath, /^\/career-world\/layers\/structures\/textures\/.+\.png$/);
    const asset = await stat(path.join(root, "public", assetPath));
    assert.ok(asset.size > 100_000, assetPath);
  }
});

test("every capital ground integration is territory-owned and bounded", async () => {
  const structures = await readJson(
    "public/career-world/layers/structures/manifests/capital-structures-r1.json",
  );
  const siteManifest = await readJson(
    "public/career-world/layers/territory-landform/manifests/terrain-site-tiles-r2.json",
  );
  const territories = await readJson(
    "public/career-world/layers/territory-landform/manifests/world-territories-r4.json",
  );
  const territoryIds = territories.territories.map(({ id }) => id).sort();
  const siteTerritoryIds = siteManifest.tiles
    .map(({ territoryId }) => territoryId)
    .sort();

  assert.equal(siteManifest.status, "phase-6-capital-sites");
  assert.equal(siteManifest.tiles.length, structures.nodes.length);
  assert.deepEqual(siteTerritoryIds, territoryIds);
  assert.equal(
    structures.nodes.some((capital) => (
      "groundAssetPath" in capital
      || "roadAssetPath" in capital
      || "plazaAssetPath" in capital
      || "circulationAssetPath" in capital
    )),
    false,
  );
  assert.equal(
    structures.nodes.some((capital) => "assetScale" in capital),
    false,
  );

  const [sourceWidth, sourceHeight] = siteManifest.sourceDimensions;
  for (const capital of structures.nodes) {
    const tile = siteManifest.tiles.find(
      ({ territoryId }) => territoryId === capital.territoryId,
    );
    const territory = territories.territories.find(
      ({ id }) => id === capital.territoryId,
    );
    assert.ok(tile, `${capital.id} terrain site must be registered`);
    assert.ok(territory, `${capital.id} territory must be registered`);
    assert.equal(tile.minimumTier, "site");
    assert.equal(tile.sourceAlphaPolicy, "bounded-subset");
    assert.match(
      tile.path,
      /^\/career-world\/layers\/territory-landform\/tiles\/.+\.png$/,
    );
    const siteAsset = await stat(path.join(root, "public", tile.path));
    assert.ok(siteAsset.size > 100_000);

    const [tileOriginX, tileOriginY] = tile.worldBounds.origin;
    const [tileSpanX, tileSpanY] = tile.worldBounds.span;
    const [cropX, cropY] = tile.sourceCropPixels.origin;
    const [cropWidth, cropHeight] = tile.sourceCropPixels.size;
    assert.ok(Math.abs(tileOriginX - cropX / sourceWidth) < 1e-12);
    assert.ok(Math.abs(tileOriginY - cropY / sourceHeight) < 1e-12);
    assert.ok(Math.abs(tileSpanX - cropWidth / sourceWidth) < 1e-12);
    assert.ok(Math.abs(tileSpanY - cropHeight / sourceHeight) < 1e-12);
    const [anchorX, anchorY] = territory.development.capitalAnchor;
    const envelope = territory.development.authoringEnvelope;
    assert.ok(tileOriginX >= envelope.origin[0]);
    assert.ok(tileOriginY >= envelope.origin[1]);
    assert.ok(tileOriginX + tileSpanX <= envelope.origin[0] + envelope.span[0]);
    assert.ok(tileOriginY + tileSpanY <= envelope.origin[1] + envelope.span[1]);
    assert.ok(anchorX >= tileOriginX && anchorX <= tileOriginX + tileSpanX);
    assert.ok(anchorY >= tileOriginY && anchorY <= tileOriginY + tileSpanY);
  }
});

test("capital visibility uses the centralized semantic-zoom policy", () => {
  const policy = { minimumTier: "territory" };
  const world = resolveDetailState({
    origin: [0, 0],
    span: [1, 1],
  });
  const territory = resolveDetailState({
    origin: [0.2, 0.2],
    span: [0.52, 0.52],
  });

  assert.equal(resolveNodeVisibility(policy, world), 0);
  assert.equal(resolveNodeVisibility(policy, territory), 1);
});

test("structures share composition camera, LOD, and light contracts", async () => {
  const scene = await readFile(path.join(
    root,
    "features/career-world/composition/WorldScene.tsx",
  ), "utf8");
  const layer = await readFile(path.join(
    root,
    "features/career-world/layers/structures/components/StructuresLayer.tsx",
  ), "utf8");
  const model = await readFile(path.join(
    root,
    "features/career-world/layers/structures/model/capitals.ts",
  ), "utf8");

  assert.ok(
    scene.indexOf("<TerritoryLandform")
      < scene.indexOf("<StructuresLayer"),
  );
  assert.ok(
    scene.indexOf("<StructuresLayer")
      < scene.indexOf("<WorldInterface"),
  );
  assert.match(scene, /<StructuresLayer[\s\S]*camera=\{camera\}/);
  assert.match(scene, /<StructuresLayer[\s\S]*detailState=\{detailState\}/);
  assert.match(scene, /<StructuresLayer[\s\S]*light=\{WORLD_LIGHT\}/);
  assert.match(layer, /cameraViewBox\(\s*camera,/);
  assert.match(layer, /resolveNodeVisibility\(CAPITAL_NODE_POLICY/);
  assert.match(layer, /data-light-source=\{light\.id\}/);
  assert.match(layer, /data-capital-id=\{capital\.id\}/);
  assert.doesNotMatch(layer, /cameraLayerStyle/);
  assert.equal(layer.includes("rotate("), false);
  assert.match(model, /TERRITORIES\.find/);
});
