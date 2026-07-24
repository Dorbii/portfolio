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

test("terrain relief publishes canonical geography without edge glow", async () => {
  const mask = await decodePng(
    "public/career-world/layers/territory-landform/masks/world-land-mask-r2.png",
  );
  const relief = await decodePng(
    "public/career-world/layers/territory-landform/textures/terrain-relief-r3.png",
  );
  const material = await decodePng(
    "public/career-world/layers/territory-landform/textures/terrain-material-r1.png",
  );
  assert.deepEqual(
    [relief.width, relief.height],
    [mask.width, mask.height],
  );
  assert.equal(relief.channels, 4);
  assert.deepEqual(
    [material.width, material.height, material.channels],
    [mask.width, mask.height, 4],
  );
  assert.notEqual(
    await sha256(
      "public/career-world/layers/territory-landform/textures/terrain-material-r1.png",
    ),
    await sha256(
      "public/career-world/layers/territory-landform/textures/terrain-relief-r3.png",
    ),
    "base material must remain separate from DEM lighting",
  );
  let partialAlphaPixels = 0;
  for (let pixel = 0; pixel < mask.pixels.length; pixel += 1) {
    const alpha = relief.pixels[pixel * 4 + 3];
    assert.equal(alpha >= 128, mask.pixels[pixel] >= 128);
    partialAlphaPixels += alpha > 0 && alpha < 255 ? 1 : 0;
  }
  let binaryBoundaryPixels = 0;
  for (let y = 1; y < mask.height - 1; y += 1) {
    for (let x = 1; x < mask.width - 1; x += 1) {
      const offset = y * mask.width + x;
      const land = mask.pixels[offset] >= 128;
      const crossesBoundary = (
        (mask.pixels[offset - 1] >= 128) !== land
        || (mask.pixels[offset + 1] >= 128) !== land
        || (mask.pixels[offset - mask.width] >= 128) !== land
        || (mask.pixels[offset + mask.width] >= 128) !== land
      );
      binaryBoundaryPixels += crossesBoundary ? 1 : 0;
    }
  }
  assert.ok(partialAlphaPixels > 1000);
  assert.ok(partialAlphaPixels < binaryBoundaryPixels * 3);

  let transparentBoundaryPixels = 0;
  let transparentBoundaryWithColor = 0;
  for (let y = 1; y < relief.height - 1; y += 1) {
    for (let x = 1; x < relief.width - 1; x += 1) {
      const offset = (y * relief.width + x) * 4;
      if (relief.pixels[offset + 3] !== 0) {
        continue;
      }
      const neighboringLand = (
        relief.pixels[offset - 1] > 0
        || relief.pixels[offset + 7] > 0
        || relief.pixels[offset - relief.width * 4 + 3] > 0
        || relief.pixels[offset + relief.width * 4 + 3] > 0
      );
      if (!neighboringLand) {
        continue;
      }
      transparentBoundaryPixels += 1;
      const colorSum = (
        relief.pixels[offset]
        + relief.pixels[offset + 1]
        + relief.pixels[offset + 2]
      );
      transparentBoundaryWithColor += colorSum >= 30 ? 1 : 0;
    }
  }
  assert.ok(transparentBoundaryPixels > 1000);
  assert.ok(
    transparentBoundaryWithColor / transparentBoundaryPixels >= 0.9,
    "transparent coast texels need color bleed to avoid a dark sampling fringe",
  );
});

test("runtime land art retains the registered illustrated r10 surface", async () => {
  const manifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/territory-landform/manifests/world-land-plate-r10.json",
  ), "utf8"));
  const plate = await decodePng(
    "public/career-world/layers/territory-landform/textures/world-land-plate-r10.png",
  );
  const detail = await decodePng(
    "public/career-world/layers/territory-landform/textures/world-land-plate-r10-detail-4x.png",
  );
  const mask = await decodePng(
    "public/career-world/layers/territory-landform/masks/world-land-mask-r2.png",
  );

  assert.deepEqual([plate.width, plate.height, plate.channels], [1672, 941, 4]);
  assert.deepEqual(
    [detail.width, detail.height, detail.channels],
    [6688, 3764, 4],
  );
  assert.equal(
    manifest.visual.sha256,
    await sha256(
      "public/career-world/layers/territory-landform/textures/world-land-plate-r10.png",
    ),
  );
  assert.equal(
    manifest.detailVisual.sha256,
    await sha256(
      "public/career-world/layers/territory-landform/textures/world-land-plate-r10-detail-4x.png",
    ),
  );
  assert.equal(
    manifest.mask.sha256,
    await sha256(
      "public/career-world/layers/territory-landform/masks/world-land-mask-r2.png",
    ),
  );
  for (let pixel = 0; pixel < plate.width * plate.height; pixel += 1) {
    assert.equal(
      plate.pixels[pixel * 4 + 3] >= 128,
      mask.pixels[pixel] >= 128,
      "visible land and the water-occlusion mask must share one silhouette",
    );
  }
});

test("illustrated land has no near-black matte along the shoreline", async () => {
  const plate = await decodePng(
    "public/career-world/layers/territory-landform/textures/world-land-plate-r10.png",
  );
  const total = plate.width * plate.height;
  const land = new Uint8Array(total);
  for (let pixel = 0; pixel < total; pixel += 1) {
    land[pixel] = plate.pixels[pixel * 4 + 3] >= 128 ? 1 : 0;
  }

  const distance = new Uint8Array(total);
  const queue = new Int32Array(total);
  let queueStart = 0;
  let queueEnd = 0;
  for (let y = 0; y < plate.height; y += 1) {
    for (let x = 0; x < plate.width; x += 1) {
      const pixel = y * plate.width + x;
      if (!land[pixel]) {
        continue;
      }
      const boundary = (
        x === 0
        || y === 0
        || x === plate.width - 1
        || y === plate.height - 1
        || !land[pixel - 1]
        || !land[pixel + 1]
        || !land[pixel - plate.width]
        || !land[pixel + plate.width]
      );
      if (boundary) {
        distance[pixel] = 1;
        queue[queueEnd] = pixel;
        queueEnd += 1;
      }
    }
  }

  while (queueStart < queueEnd) {
    const pixel = queue[queueStart];
    queueStart += 1;
    const nextDistance = distance[pixel] + 1;
    if (nextDistance > 16) {
      continue;
    }
    const x = pixel % plate.width;
    const neighbors = [
      x > 0 ? pixel - 1 : -1,
      x < plate.width - 1 ? pixel + 1 : -1,
      pixel >= plate.width ? pixel - plate.width : -1,
      pixel < total - plate.width ? pixel + plate.width : -1,
    ];
    for (const neighbor of neighbors) {
      if (
        neighbor >= 0
        && land[neighbor]
        && distance[neighbor] === 0
      ) {
        distance[neighbor] = nextDistance;
        queue[queueEnd] = neighbor;
        queueEnd += 1;
      }
    }
  }

  let shorelinePixels = 0;
  let nearBlackShorelinePixels = 0;
  for (let pixel = 0; pixel < total; pixel += 1) {
    if (distance[pixel] === 0 || distance[pixel] > 16) {
      continue;
    }
    shorelinePixels += 1;
    const offset = pixel * 4;
    const luminance = (
      plate.pixels[offset] * 0.2126
      + plate.pixels[offset + 1] * 0.7152
      + plate.pixels[offset + 2] * 0.0722
    );
    if (luminance < 40) {
      nearBlackShorelinePixels += 1;
    }
  }
  assert.ok(shorelinePixels > 100_000);
  assert.ok(
    nearBlackShorelinePixels / shorelinePixels < 0.025,
    "the illustrated coast must not contain a baked black matte",
  );
});

test("one topology model publishes elevation, slope, and QA contours", async () => {
  const mask = await decodePng(
    "public/career-world/layers/territory-landform/masks/world-land-mask-r2.png",
  );
  const height = await decodePng(
    "public/career-world/layers/territory-landform/fields/terrain-height-r3.png",
  );
  const slope = await decodePng(
    "public/career-world/layers/territory-landform/fields/terrain-slope-r3.png",
  );
  const contours = await decodePng(
    "public/career-world/layers/territory-landform/overlays/terrain-contours-r3-detail-4x.png",
  );
  const manifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/territory-landform/manifests/terrain-relief-r3.json",
  ), "utf8"));

  assert.deepEqual(
    [height.width, height.height, height.channels],
    [mask.width, mask.height, 1],
  );
  assert.deepEqual(
    [slope.width, slope.height, slope.channels],
    [mask.width, mask.height, 1],
  );
  assert.deepEqual(
    [contours.width, contours.height, contours.channels],
    [mask.width * 4, mask.height * 4, 4],
  );

  let highlandPixels = 0;
  let slopedPixels = 0;
  for (let index = 0; index < mask.pixels.length; index += 1) {
    const land = mask.pixels[index] >= 128;
    if (!land) {
      assert.equal(height.pixels[index], 0);
      assert.equal(slope.pixels[index], 0);
      continue;
    }
    highlandPixels += height.pixels[index] >= 160 ? 1 : 0;
    slopedPixels += slope.pixels[index] >= 96 ? 1 : 0;
  }
  let contourPixels = 0;
  for (let offset = 3; offset < contours.pixels.length; offset += 4) {
    contourPixels += contours.pixels[offset] > 0 ? 1 : 0;
  }

  assert.ok(highlandPixels > 30000);
  assert.ok(slopedPixels > 30000);
  assert.ok(contourPixels > 100000);
  assert.equal(manifest.derivation.decorativeGroundTexture, true);
  assert.equal(manifest.derivation.vegetationIncluded, false);
  assert.equal(
    manifest.derivation.authoring,
    "terrain-dem-r3.json",
  );
  assert.equal(
    manifest.derivation.source,
    "../sources/terrain-dem-authored-r3.png",
  );
});

test("every territory reserves a registered city-ready development envelope", async () => {
  const manifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/territory-landform/manifests/world-territories-r4.json",
  ), "utf8"));
  const land = await decodePng(
    "public/career-world/layers/territory-landform/masks/world-land-mask-r2.png",
  );
  const slope = await decodePng(
    "public/career-world/layers/territory-landform/fields/terrain-slope-r3.png",
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
    const anchorOffset = anchorY * land.width + anchorX;
    assert.ok(
      land.pixels[anchorOffset] >= 128,
      `${territory.id} capital anchor must be on accepted land`,
    );
    assert.ok(
      slope.pixels[anchorOffset] < 96,
      `${territory.id} capital anchor needs a buildable terrain shelf`,
    );

    const startX = Math.floor(originX * land.width);
    const endX = Math.ceil((originX + spanX) * land.width);
    const startY = Math.floor(originY * land.height);
    const endY = Math.ceil((originY + spanY) * land.height);
    let landPixels = 0;
    let totalPixels = 0;
    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        const offset = y * land.width + x;
        landPixels += land.pixels[offset] >= 128 ? 1 : 0;
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

test("coast field is derived across the complete authored shoreline", async () => {
  const mask = await decodePng(
    "public/career-world/layers/territory-landform/masks/world-land-mask-r2.png",
  );
  const coast = await decodePng(
    "public/career-world/layers/water-surface/fields/coast-geometry-r4.png",
  );
  assert.deepEqual([coast.width, coast.height], [mask.width, mask.height]);
  assert.equal(coast.channels, 4);

  let boundaryPixels = 0;
  let innerBoundaryPixels = 0;
  const substrateValues = new Set();
  const boundarySubstrate = [];
  for (let y = 1; y < mask.height - 1; y += 1) {
    for (let x = 1; x < mask.width - 1; x += 1) {
      const maskOffset = y * mask.width + x;
      const coastOffset = maskOffset * 4;
      const land = mask.pixels[maskOffset] >= 128;
      assert.equal(coast.pixels[coastOffset] >= 128, land);
      if (land) {
        const neighborWater = (
          mask.pixels[maskOffset - 1] < 128
          || mask.pixels[maskOffset + 1] < 128
          || mask.pixels[maskOffset - mask.width] < 128
          || mask.pixels[maskOffset + mask.width] < 128
        );
        if (neighborWater) {
          innerBoundaryPixels += 1;
          assert.ok(coast.pixels[coastOffset + 2] > 0);
        }
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
        boundarySubstrate.push(coast.pixels[coastOffset + 3]);
      }
    }
  }
  assert.ok(boundaryPixels > 1000);
  assert.ok(innerBoundaryPixels > 1000);
  assert.ok(
    substrateValues.size > 8,
    "coast substrate must continue authored land value instead of a constant",
  );
  boundarySubstrate.sort((left, right) => left - right);
  assert.ok(
    boundarySubstrate[Math.floor(boundarySubstrate.length / 2)] >= 68,
    "coast substrate must exclude dark authored edge ink",
  );
});

test("authored water regions compile into a land-clipped hydrology field", async () => {
  const mask = await decodePng(
    "public/career-world/layers/territory-landform/masks/world-land-mask-r2.png",
  );
  const hydrology = await decodePng(
    "public/career-world/layers/water-surface/fields/water-region-field-r2.png",
  );
  assert.deepEqual(
    [hydrology.width, hydrology.height, hydrology.channels],
    [mask.width, mask.height, 3],
  );

  const waterInfluencePixels = [0, 0];
  for (let index = 0; index < mask.pixels.length; index += 1) {
    const offset = index * hydrology.channels;
    if (mask.pixels[index] >= 128) {
      assert.equal(hydrology.pixels[offset], 0);
      assert.equal(hydrology.pixels[offset + 1], 0);
    } else {
      waterInfluencePixels[0] += (
        hydrology.pixels[offset] > 0 ? 1 : 0
      );
      waterInfluencePixels[1] += (
        hydrology.pixels[offset + 1] > 0 ? 1 : 0
      );
    }
  }
  assert.ok(waterInfluencePixels[0] > 10_000);
  assert.ok(waterInfluencePixels[1] > 1_000);
});

test("coast materials derive beach and cliff variation from topology", async () => {
  const material = await decodePng(
    "public/career-world/layers/water-surface/fields/coast-material-field-r5.png",
  );
  const mask = await decodePng(
    "public/career-world/layers/territory-landform/masks/world-land-mask-r2.png",
  );
  const height = await decodePng(
    "public/career-world/layers/territory-landform/fields/terrain-height-r3.png",
  );
  const slope = await decodePng(
    "public/career-world/layers/territory-landform/fields/terrain-slope-r3.png",
  );
  assert.deepEqual(
    [material.width, material.height, material.channels],
    [mask.width, mask.height, 3],
  );

  let beachPixels = 0;
  let cliffPixels = 0;
  let profilePixels = 0;
  let underwaterProfilePixels = 0;
  let strongOverlap = 0;
  let beachHeight = 0;
  let beachSlope = 0;
  let cliffHeight = 0;
  let cliffSlope = 0;
  for (let offset = 0; offset < material.pixels.length; offset += 3) {
    const index = offset / 3;
    const beach = material.pixels[offset];
    const cliff = material.pixels[offset + 1];
    const profile = material.pixels[offset + 2];
    beachPixels += beach >= 128 ? 1 : 0;
    cliffPixels += cliff >= 128 ? 1 : 0;
    profilePixels += profile >= 32 ? 1 : 0;
    underwaterProfilePixels += (
      mask.pixels[index] < 128 && profile >= 16
    ) ? 1 : 0;
    strongOverlap += beach >= 128 && cliff >= 128 ? 1 : 0;
    if (beach >= 128) {
      beachHeight += height.pixels[index];
      beachSlope += slope.pixels[index];
    }
    if (cliff >= 128) {
      cliffHeight += height.pixels[index];
      cliffSlope += slope.pixels[index];
    }
  }
  assert.ok(beachPixels > 10000);
  assert.ok(cliffPixels > 10000);
  assert.ok(profilePixels > 20000);
  assert.ok(
    underwaterProfilePixels > 10000,
    "terrain height must continue beneath the visible water-side shelf",
  );
  assert.equal(strongOverlap, 0);
  assert.ok(cliffHeight / cliffPixels > beachHeight / beachPixels);
  assert.ok(cliffSlope / cliffPixels > beachSlope / beachPixels);
});

test("generated asset manifests carry exact content hashes", async () => {
  const landManifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/territory-landform/manifests/terrain-relief-r3.json",
  ), "utf8"));
  const coastManifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/water-surface/manifests/coast-geometry-r4.json",
  ), "utf8"));
  const waterManifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/water-surface/manifests/water-surface-world-lod-r2.json",
  ), "utf8"));
  const hydrologyManifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/water-surface/manifests/water-region-field-r2.json",
  ), "utf8"));
  const coastMaterialManifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/water-surface/manifests/coast-material-field-r5.json",
  ), "utf8"));

  assert.equal(
    landManifest.visual.sha256,
    await sha256(
      "public/career-world/layers/territory-landform/textures/terrain-relief-r3.png",
    ),
  );
  assert.equal(
    landManifest.baseMaterial.sha256,
    await sha256(
      "public/career-world/layers/territory-landform/textures/terrain-material-r1.png",
    ),
  );
  assert.equal(
    coastManifest.texture.sha256,
    await sha256(
      "public/career-world/layers/water-surface/fields/coast-geometry-r4.png",
    ),
  );
  assert.equal(
    landManifest.detailVisual.sha256,
    await sha256(
      "public/career-world/layers/territory-landform/textures/terrain-relief-r3-detail-4x.png",
    ),
  );
  assert.equal(
    coastManifest.detailTexture.sha256,
    await sha256(
      "public/career-world/layers/water-surface/fields/coast-geometry-r4-4x.png",
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
      "public/career-world/layers/water-surface/fields/water-region-field-r2.png",
    ),
  );
  assert.equal(
    coastMaterialManifest.texture.sha256,
    await sha256(
      "public/career-world/layers/water-surface/fields/coast-material-field-r5.png",
    ),
  );
  assert.equal(
    landManifest.fields.height.sha256,
    await sha256(
      "public/career-world/layers/territory-landform/fields/terrain-height-r3.png",
    ),
  );
  assert.equal(
    landManifest.fields.slope.sha256,
    await sha256(
      "public/career-world/layers/territory-landform/fields/terrain-slope-r3.png",
    ),
  );
  assert.equal(
    landManifest.topologyQa.sha256,
    await sha256(
      "public/career-world/layers/territory-landform/overlays/terrain-contours-r3-detail-4x.png",
    ),
  );
  assert.equal(
    landManifest.derivation.sourceSha256,
    await sha256(
      "public/career-world/layers/territory-landform/sources/terrain-dem-authored-r3.png",
    ),
  );
  assert.equal(
    landManifest.derivation.authoringSha256,
    await sha256(
      "public/career-world/layers/territory-landform/manifests/terrain-dem-r3.json",
    ),
  );
  assert.equal(hydrologyManifest.generation.landClipped, true);
});

test("accepted Phase 3 water checkpoint remains immutable", async () => {
  const acceptedAssets = [
    [
      "public/career-world/layers/water-surface/textures/water-surface-world-lod-r2-3840x2160.png",
      "57408A1192B5DAC45DB9BEA2713E558B7BFB751CAC714AAF59A8FD0DAF941896",
    ],
    [
      "public/career-world/layers/water-surface/textures/water-surface-reference-r2-3840x2160.png",
      "CD8786E2C4CF27A104CE8B53C037AB9BC5428CEF4B803A1D1F5F6BCC3AF2E9D1",
    ],
    [
      "public/career-world/layers/water-surface/fields/water-region-field-r2.png",
      "C0EBEA93C8CBEBEB339158D71FE81DE2D6CEF472CB44BD8BBCE738064C69378B",
    ],
  ];

  for (const [relativePath, expectedHash] of acceptedAssets) {
    assert.equal(
      await sha256(relativePath),
      expectedHash,
      `${relativePath} changed after the accepted checkpoint`,
    );
  }
});
