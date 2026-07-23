import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function sha256(relativePath) {
  return createHash("sha256")
    .update(await readFile(path.join(root, relativePath)))
    .digest("hex")
    .toUpperCase();
}

function paeth(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const cornerDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= cornerDistance) {
    return left;
  }
  return upDistance <= cornerDistance ? up : upperLeft;
}

async function decodePng(relativePath) {
  const buffer = await readFile(path.join(root, relativePath));
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG");
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];
  assert.equal(bitDepth, 8);
  assert.ok(colorType === 0 || colorType === 2 || colorType === 6);
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const chunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    if (type === "IDAT") {
      chunks.push(buffer.subarray(offset + 8, offset + 8 + length));
    }
    offset += 12 + length;
  }
  const compressed = Buffer.concat(chunks);
  const inflated = inflateSync(compressed);
  const stride = width * channels;
  const pixels = Buffer.alloc(width * height * channels);
  let sourceOffset = 0;

  for (let row = 0; row < height; row += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const targetOffset = row * stride;
    for (let column = 0; column < stride; column += 1) {
      const raw = inflated[sourceOffset + column];
      const left = column >= channels
        ? pixels[targetOffset + column - channels]
        : 0;
      const up = row > 0 ? pixels[targetOffset + column - stride] : 0;
      const upperLeft = row > 0 && column >= channels
        ? pixels[targetOffset + column - stride - channels]
        : 0;
      let value = raw;
      if (filter === 1) value += left;
      if (filter === 2) value += up;
      if (filter === 3) value += Math.floor((left + up) / 2);
      if (filter === 4) value += paeth(left, up, upperLeft);
      assert.ok(filter >= 0 && filter <= 4);
      pixels[targetOffset + column] = value & 0xff;
    }
    sourceOffset += stride;
  }

  return { width, height, channels, pixels };
}

test("authored land plate preserves accepted geography and alpha", async () => {
  const base = await decodePng(
    "public/career-world/layers/territory-landform/sources/world-land-plate-r6.png",
  );
  const baked = await decodePng(
    "public/career-world/layers/territory-landform/textures/world-land-plate-r8.png",
  );
  assert.deepEqual(
    [baked.width, baked.height, baked.channels],
    [base.width, base.height, base.channels],
  );
  assert.equal(baked.channels, 4);
  for (let offset = 3; offset < base.pixels.length; offset += 4) {
    assert.equal(baked.pixels[offset], base.pixels[offset]);
  }
});

test("every territory reserves a registered city-ready development envelope", async () => {
  const manifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/territory-landform/manifests/world-territories-r4.json",
  ), "utf8"));
  const land = await decodePng(
    "public/career-world/layers/territory-landform/textures/world-land-plate-r8.png",
  );

  assert.equal(manifest.territories.length, 5);
  assert.deepEqual(
    manifest.developmentContract.consumerLayers,
    ["infrastructure", "structures"],
  );
  assert.ok(
    manifest.territories
      .find(({ id }) => id === "tanium")
      .development.reservedProgram.includes("mountain-cableway"),
  );

  for (const territory of manifest.territories) {
    const { capitalAnchor, authoringEnvelope } = territory.development;
    const [originX, originY] = authoringEnvelope.origin;
    const [spanX, spanY] = authoringEnvelope.span;
    const [focusX, focusY] = territory.focusView.origin;
    const [focusWidth, focusHeight] = territory.focusView.span;

    assert.ok(capitalAnchor[0] >= originX);
    assert.ok(capitalAnchor[0] <= originX + spanX);
    assert.ok(capitalAnchor[1] >= originY);
    assert.ok(capitalAnchor[1] <= originY + spanY);
    assert.ok(originX >= focusX);
    assert.ok(originY >= focusY);
    assert.ok(originX + spanX <= focusX + focusWidth);
    assert.ok(originY + spanY <= focusY + focusHeight);
    assert.equal(territory.development.firstDetailTier, "territory");
    assert.equal(
      territory.development.terrainPolicy,
      "conform-to-landform",
    );

    const anchorX = Math.min(
      land.width - 1,
      Math.floor(capitalAnchor[0] * land.width),
    );
    const anchorY = Math.min(
      land.height - 1,
      Math.floor(capitalAnchor[1] * land.height),
    );
    const anchorOffset = (anchorY * land.width + anchorX) * land.channels;
    assert.ok(
      land.pixels[anchorOffset + 3] >= 128,
      `${territory.id} capital anchor must be on accepted land`,
    );

    const startX = Math.floor(originX * land.width);
    const endX = Math.ceil((originX + spanX) * land.width);
    const startY = Math.floor(originY * land.height);
    const endY = Math.ceil((originY + spanY) * land.height);
    let landPixels = 0;
    let totalPixels = 0;
    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        const offset = (y * land.width + x) * land.channels;
        landPixels += land.pixels[offset + 3] >= 128 ? 1 : 0;
        totalPixels += 1;
      }
    }
    const coverage = landPixels / totalPixels;
    assert.ok(
      coverage >= territory.development.minimumLandCoverage,
      `${territory.id} envelope coverage ${coverage.toFixed(3)} is too low`,
    );
  }
});

test("coast field is derived across the complete accepted shoreline", async () => {
  const mask = await decodePng(
    "public/career-world/layers/territory-landform/masks/world-land-plate-r6-mask.png",
  );
  const coast = await decodePng(
    "public/career-world/layers/water-surface/fields/coast-geometry-r1.png",
  );
  assert.deepEqual([coast.width, coast.height], [mask.width, mask.height]);
  assert.equal(coast.channels, 4);

  let boundaryPixels = 0;
  const substrateValues = new Set();
  for (let y = 1; y < mask.height - 1; y += 1) {
    for (let x = 1; x < mask.width - 1; x += 1) {
      const maskOffset = y * mask.width + x;
      const coastOffset = maskOffset * 4;
      const land = mask.pixels[maskOffset] >= 128;
      assert.equal(coast.pixels[coastOffset] >= 128, land);
      if (land) {
        continue;
      }
      const neighborLand = (
        mask.pixels[maskOffset - 1] >= 128
        || mask.pixels[maskOffset + 1] >= 128
        || mask.pixels[maskOffset - mask.width] >= 128
        || mask.pixels[maskOffset + mask.width] >= 128
      );
      if (neighborLand) {
        boundaryPixels += 1;
        assert.ok(coast.pixels[coastOffset + 2] > 0);
        substrateValues.add(coast.pixels[coastOffset + 3]);
      }
    }
  }
  assert.ok(boundaryPixels > 1000);
  assert.ok(
    substrateValues.size > 8,
    "coast substrate must continue authored land value instead of a constant",
  );
});

test("authored water regions compile into a land-clipped hydrology field", async () => {
  const mask = await decodePng(
    "public/career-world/layers/territory-landform/masks/world-land-plate-r6-mask.png",
  );
  const hydrology = await decodePng(
    "public/career-world/layers/water-surface/fields/water-region-field-r1.png",
  );
  assert.deepEqual(
    [hydrology.width, hydrology.height, hydrology.channels],
    [mask.width, mask.height, 1],
  );

  let waterInfluencePixels = 0;
  for (let index = 0; index < mask.pixels.length; index += 1) {
    if (mask.pixels[index] >= 128) {
      assert.equal(hydrology.pixels[index], 0);
    } else if (hydrology.pixels[index] > 0) {
      waterInfluencePixels += 1;
    }
  }
  assert.ok(waterInfluencePixels > 1000);
});

test("generated asset manifests carry exact content hashes", async () => {
  const landManifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/territory-landform/manifests/world-land-plate-r8.json",
  ), "utf8"));
  const coastManifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/water-surface/manifests/coast-geometry-r1.json",
  ), "utf8"));
  const waterManifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/water-surface/manifests/water-surface-world-lod-r2.json",
  ), "utf8"));
  const hydrologyManifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/water-surface/manifests/water-region-field-r1.json",
  ), "utf8"));

  assert.equal(
    landManifest.visual.sha256,
    await sha256(
      "public/career-world/layers/territory-landform/textures/world-land-plate-r8.png",
    ),
  );
  assert.equal(
    coastManifest.texture.sha256,
    await sha256(
      "public/career-world/layers/water-surface/fields/coast-geometry-r1.png",
    ),
  );
  assert.equal(
    landManifest.detailVisual.sha256,
    await sha256(
      "public/career-world/layers/territory-landform/textures/world-land-plate-r8-detail-4x.png",
    ),
  );
  assert.equal(
    coastManifest.detailTexture.sha256,
    await sha256(
      "public/career-world/layers/water-surface/fields/coast-geometry-r1-4x.png",
    ),
  );
  assert.equal(
    waterManifest.texture.sha256,
    await sha256(
      "public/career-world/layers/water-surface/textures/water-surface-world-lod-r2-3840x2160.png",
    ),
  );
  assert.equal(
    hydrologyManifest.texture.sha256,
    await sha256(
      "public/career-world/layers/water-surface/fields/water-region-field-r1.png",
    ),
  );
  assert.equal(hydrologyManifest.generation.landClipped, true);
});
