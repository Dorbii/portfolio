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

function landDistanceField(image, maximumDistance) {
  assert.equal(image.channels, 4);
  const total = image.width * image.height;
  const land = new Uint8Array(total);
  const distance = new Uint8Array(total);
  const queue = new Int32Array(total);
  let queueStart = 0;
  let queueEnd = 0;

  for (let pixel = 0; pixel < total; pixel += 1) {
    land[pixel] = image.pixels[pixel * 4 + 3] >= 128 ? 1 : 0;
  }
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const pixel = y * image.width + x;
      if (!land[pixel]) {
        continue;
      }
      const boundary = (
        x === 0
        || y === 0
        || x === image.width - 1
        || y === image.height - 1
        || !land[pixel - 1]
        || !land[pixel + 1]
        || !land[pixel - image.width]
        || !land[pixel + image.width]
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
    if (nextDistance > maximumDistance) {
      continue;
    }
    const x = pixel % image.width;
    const neighbors = [
      x > 0 ? pixel - 1 : -1,
      x < image.width - 1 ? pixel + 1 : -1,
      pixel >= image.width ? pixel - image.width : -1,
      pixel < total - image.width ? pixel + image.width : -1,
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
  return distance;
}

function channelDistanceField(image, channel, threshold, maximumDistance) {
  const total = image.width * image.height;
  const distance = new Uint16Array(total);
  distance.fill(0xffff);
  const queue = new Int32Array(total);
  let queueStart = 0;
  let queueEnd = 0;

  for (let pixel = 0; pixel < total; pixel += 1) {
    if (image.pixels[pixel * image.channels + channel] >= threshold) {
      distance[pixel] = 0;
      queue[queueEnd] = pixel;
      queueEnd += 1;
    }
  }

  while (queueStart < queueEnd) {
    const pixel = queue[queueStart];
    queueStart += 1;
    const nextDistance = distance[pixel] + 1;
    if (nextDistance > maximumDistance) {
      continue;
    }
    const x = pixel % image.width;
    const neighbors = [
      x > 0 ? pixel - 1 : -1,
      x < image.width - 1 ? pixel + 1 : -1,
      pixel >= image.width ? pixel - image.width : -1,
      pixel < total - image.width ? pixel + image.width : -1,
    ];
    for (const neighbor of neighbors) {
      if (neighbor >= 0 && distance[neighbor] > nextDistance) {
        distance[neighbor] = nextDistance;
        queue[queueEnd] = neighbor;
        queueEnd += 1;
      }
    }
  }
  return distance;
}

test("terrain relief publishes canonical geography without edge glow", async () => {
  const mask = await decodePng(
    "public/career-world/layers/territory-landform/masks/world-land-mask-r3.png",
  );
  const relief = await decodePng(
    "public/career-world/layers/territory-landform/textures/terrain-relief-r6.png",
  );
  const authoredSurface = await decodePng(
    "public/career-world/layers/territory-landform/sources/world-land-surface-authored-r9.png",
  );
  assert.deepEqual(
    [relief.width, relief.height],
    [mask.width, mask.height],
  );
  assert.equal(relief.channels, 4);
  assert.deepEqual(
    [authoredSurface.width, authoredSurface.height, authoredSurface.channels],
    [mask.width, mask.height, 3],
  );
  assert.notEqual(
    await sha256(
      "public/career-world/layers/territory-landform/sources/world-land-surface-authored-r9.png",
    ),
    await sha256(
      "public/career-world/layers/territory-landform/textures/terrain-relief-r6.png",
    ),
    "the authored source must be compiled into the canonical runtime silhouette",
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

test("runtime land uses one authored material with registered territory detail", async () => {
  const manifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/territory-landform/manifests/terrain-relief-r6.json",
  ), "utf8"));
  const plate = await decodePng(
    "public/career-world/layers/territory-landform/textures/terrain-relief-r6.png",
  );
  const detail = await decodePng(
    "public/career-world/layers/territory-landform/textures/terrain-relief-r6-detail-4x.png",
  );
  const mask = await decodePng(
    "public/career-world/layers/territory-landform/masks/world-land-mask-r3.png",
  );

  assert.deepEqual([plate.width, plate.height, plate.channels], [1672, 941, 4]);
  assert.deepEqual(
    [detail.width, detail.height, detail.channels],
    [6688, 3764, 4],
  );
  assert.equal(
    manifest.visual.sha256,
    await sha256(
      "public/career-world/layers/territory-landform/textures/terrain-relief-r6.png",
    ),
  );
  assert.equal(
    manifest.detailVisual.sha256,
    await sha256(
      "public/career-world/layers/territory-landform/textures/terrain-relief-r6-detail-4x.png",
    ),
  );
  assert.equal(
    manifest.mask.sha256,
    await sha256(
      "public/career-world/layers/territory-landform/masks/world-land-mask-r3.png",
    ),
  );
  assert.match(
    manifest.detailVisual.role,
    /authored macro relief/,
  );
  assert.match(
    manifest.derivation.detailPolicy,
    /share one authored macro material/,
  );
  for (let pixel = 0; pixel < plate.width * plate.height; pixel += 1) {
    assert.equal(
      plate.pixels[pixel * 4 + 3] >= 128,
      mask.pixels[pixel] >= 128,
      "visible land and the water-occlusion mask must share one silhouette",
    );
  }
});

test("authored shoreline confines deep shadows to cliff terrain", async () => {
  const plate = await decodePng(
    "public/career-world/layers/territory-landform/textures/terrain-relief-r6.png",
  );
  const coastMaterial = await decodePng(
    "public/career-world/layers/water-surface/fields/coast-material-field-r6.png",
  );
  const total = plate.width * plate.height;
  const distance = landDistanceField(plate, 16);

  let shorelinePixels = 0;
  let nearBlackShorelinePixels = 0;
  let beachPixels = 0;
  let cliffPixels = 0;
  let nearBlackBeachPixels = 0;
  let nearBlackCliffPixels = 0;
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
    const coastOffset = pixel * coastMaterial.channels;
    const beach = coastMaterial.pixels[coastOffset];
    const cliff = coastMaterial.pixels[coastOffset + 1];
    if (beach >= 140 && beach > cliff + 15) {
      beachPixels += 1;
      nearBlackBeachPixels += luminance < 40 ? 1 : 0;
    }
    if (cliff >= 140 && cliff > beach + 15) {
      cliffPixels += 1;
      nearBlackCliffPixels += luminance < 40 ? 1 : 0;
    }
  }
  assert.ok(shorelinePixels > 100_000);
  assert.ok(
    nearBlackShorelinePixels / shorelinePixels < 0.05,
    "deep shadow may describe cliffs but must not become a perimeter matte",
  );
  assert.ok(beachPixels > 40_000);
  assert.ok(cliffPixels > 15_000);
  assert.ok(
    nearBlackBeachPixels / beachPixels < 0.035,
    "beach terrain must remain an open ramp rather than a dark cutout",
  );
  assert.ok(
    nearBlackCliffPixels / cliffPixels
      > nearBlackBeachPixels / beachPixels,
    "cliff faces should carry more deep shadow than beach ramps",
  );
});

test("illustrated shoreline visibly distinguishes beach and cliff terrain", async () => {
  const plate = await decodePng(
    "public/career-world/layers/territory-landform/textures/terrain-relief-r6.png",
  );
  const coastMaterial = await decodePng(
    "public/career-world/layers/water-surface/fields/coast-material-field-r6.png",
  );
  const manifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/water-surface/manifests/coast-material-field-r6.json",
  ), "utf8"));
  assert.deepEqual(
    [coastMaterial.width, coastMaterial.height],
    [plate.width, plate.height],
  );
  assert.equal(
    manifest.texture.sha256,
    await sha256(
      "public/career-world/layers/water-surface/fields/coast-material-field-r6.png",
    ),
  );
  assert.equal(manifest.defaultMaterial, "rocky-shelf");

  const distance = landDistanceField(plate, 16);
  let coastPixels = 0;
  let beachPixels = 0;
  let cliffPixels = 0;
  let beachLuminance = 0;
  let cliffLuminance = 0;
  for (let pixel = 0; pixel < plate.width * plate.height; pixel += 1) {
    if (distance[pixel] === 0 || distance[pixel] > 16) {
      continue;
    }
    coastPixels += 1;
    const coastOffset = pixel * coastMaterial.channels;
    const beach = coastMaterial.pixels[coastOffset];
    const cliff = coastMaterial.pixels[coastOffset + 1];
    const plateOffset = pixel * 4;
    const luminance = (
      plate.pixels[plateOffset] * 0.2126
      + plate.pixels[plateOffset + 1] * 0.7152
      + plate.pixels[plateOffset + 2] * 0.0722
    );
    if (beach >= 140 && beach > cliff + 15) {
      beachPixels += 1;
      beachLuminance += luminance;
    }
    if (cliff >= 140 && cliff > beach + 15) {
      cliffPixels += 1;
      cliffLuminance += luminance;
    }
  }
  assert.ok(
    beachPixels / coastPixels > 0.2,
    `expected beach terrain across more than 20% of the coast, got ${beachPixels}/${coastPixels}`,
  );
  assert.ok(
    cliffPixels / coastPixels > 0.1,
    `expected cliff terrain across more than 10% of the coast, got ${cliffPixels}/${coastPixels}`,
  );
  assert.ok(
    beachLuminance / beachPixels - cliffLuminance / cliffPixels > 8,
    "beach ramps and cliff faces must not collapse into one perimeter color",
  );
});

test("one topology model publishes elevation, slope, and QA contours", async () => {
  const mask = await decodePng(
    "public/career-world/layers/territory-landform/masks/world-land-mask-r3.png",
  );
  const height = await decodePng(
    "public/career-world/layers/territory-landform/fields/terrain-height-r4.png",
  );
  const slope = await decodePng(
    "public/career-world/layers/territory-landform/fields/terrain-slope-r4.png",
  );
  const contours = await decodePng(
    "public/career-world/layers/territory-landform/overlays/terrain-contours-r4-detail-4x.png",
  );
  const manifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/territory-landform/manifests/terrain-relief-r6.json",
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
  assert.equal(manifest.derivation.authoredSurfaceTexture, true);
  assert.equal(manifest.derivation.vegetationIncluded, false);
  assert.equal(
    manifest.derivation.authoring,
    "terrain-dem-r4.json",
  );
  assert.equal(
    manifest.derivation.source,
    "../sources/terrain-dem-authored-r3.png",
  );
});

test("terrain authoring declares five connected mountain systems", async () => {
  const manifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/territory-landform/manifests/terrain-dem-r4.json",
  ), "utf8"));

  assert.equal(manifest.mountainRanges.length, 5);
  assert.deepEqual(
    manifest.mountainRanges.map((range) => range.id),
    [
      "western-crown-range",
      "tanium-saddle-range",
      "southern-spine-range",
      "column-landmark-range",
      "ace-ridge",
    ],
  );
  for (const range of manifest.mountainRanges) {
    assert.ok(range.points.length >= 2);
    assert.ok(range.radius > 0 && range.radius < 0.1);
    assert.ok(range.strength > 0 && range.strength <= 1);
    for (const [x, y] of range.points) {
      assert.ok(x >= 0 && x <= 1);
      assert.ok(y >= 0 && y <= 1);
    }
  }
});

test("every territory reserves a registered city-ready development envelope", async () => {
  const manifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/territory-landform/manifests/world-territories-r4.json",
  ), "utf8"));
  const land = await decodePng(
    "public/career-world/layers/territory-landform/masks/world-land-mask-r3.png",
  );
  const slope = await decodePng(
    "public/career-world/layers/territory-landform/fields/terrain-slope-r4.png",
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
    let buildablePixels = 0;
    let totalPixels = 0;
    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        const offset = y * land.width + x;
        const isLand = land.pixels[offset] >= 128;
        landPixels += isLand ? 1 : 0;
        buildablePixels += isLand && slope.pixels[offset] < 112 ? 1 : 0;
        totalPixels += 1;
      }
    }
    const coverage = landPixels / totalPixels;
    assert.ok(
      coverage >= territory.development.minimumLandCoverage,
      `${territory.id} envelope coverage ${coverage.toFixed(3)} is too low`,
    );
    assert.ok(
      buildablePixels / Math.max(landPixels, 1) >= 0.58,
      `${territory.id} envelope lacks a broad buildable terrain shelf`,
    );
  }
});

test("visible capital sprites remain supported by their registered terrain", async () => {
  const structures = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/structures/manifests/capital-structures-r1.json",
  ), "utf8"));
  const territories = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/territory-landform/manifests/world-territories-r4.json",
  ), "utf8"));
  const land = await decodePng(
    "public/career-world/layers/territory-landform/masks/world-land-mask-r3.png",
  );

  for (const capital of structures.nodes) {
    const territory = territories.territories.find(
      ({ id }) => id === capital.territoryId,
    );
    assert.ok(territory, capital.territoryId);

    const sampleCoverage = (asset) => {
      assert.equal(asset.channels, 4, capital.id);
      let visiblePixels = 0;
      let supportedPixels = 0;
      let basePixels = 0;
      let supportedBasePixels = 0;
      const sampleStep = 6;
      for (let y = 0; y < asset.height; y += sampleStep) {
        for (let x = 0; x < asset.width; x += sampleStep) {
          const assetOffset = (y * asset.width + x) * asset.channels;
          if (asset.pixels[assetOffset + 3] < 24) {
            continue;
          }

          const worldX = (
            territory.development.capitalAnchor[0]
            + (
              (x + 0.5) / asset.width - capital.groundAnchor[0]
            ) * capital.footprintSpan[0]
          );
          const worldY = (
            territory.development.capitalAnchor[1]
            + (
              (y + 0.5) / asset.height - capital.groundAnchor[1]
            ) * capital.footprintSpan[1]
          );
          const landX = Math.max(
            0,
            Math.min(land.width - 1, Math.floor(worldX * land.width)),
          );
          const landY = Math.max(
            0,
            Math.min(land.height - 1, Math.floor(worldY * land.height)),
          );
          const supported = land.pixels[landY * land.width + landX] >= 128;
          const isBase = y >= asset.height / 2;

          visiblePixels += 1;
          supportedPixels += supported ? 1 : 0;
          basePixels += isBase ? 1 : 0;
          supportedBasePixels += supported && isBase ? 1 : 0;
        }
      }

      return {
        visible: supportedPixels / visiblePixels,
        base: supportedBasePixels / basePixels,
      };
    };

    const asset = await decodePng(`public${capital.assetPath}`);
    const structureCoverage = sampleCoverage(asset);
    assert.ok(
      structureCoverage.visible >= 0.94,
      `${capital.id} visible land coverage `
        + `${structureCoverage.visible.toFixed(3)} is too low`,
    );
    assert.ok(
      structureCoverage.base >= 0.97,
      `${capital.id} base land coverage `
        + `${structureCoverage.base.toFixed(3)} is too low`,
    );

  }
});

test("capital site tiles stay bounded to land and add local density", async () => {
  const manifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/territory-landform/manifests/terrain-site-tiles-r2.json",
  ), "utf8"));
  const source = await decodePng(`public${manifest.sourceDetailPath}`);
  assert.deepEqual(
    [source.width, source.height],
    manifest.sourceDimensions,
  );

  for (const site of manifest.tiles) {
    assert.equal(site.minimumTier, "site");
    const tile = await decodePng(`public${site.path}`);
    assert.deepEqual(
      [tile.width, tile.height, tile.channels],
      [...site.dimensions, 4],
    );
    assert.equal(site.sha256, await sha256(`public${site.path}`));

    const [cropX, cropY] = site.sourceCropPixels.origin;
    const [cropWidth, cropHeight] = site.sourceCropPixels.size;
    let sourceWaterSamples = 0;
    let waterLeakSamples = 0;
    let outerSamples = 0;
    let visibleOuterSamples = 0;
    let visibleSamples = 0;

    for (let y = 0; y < tile.height; y += 8) {
      for (let x = 0; x < tile.width; x += 8) {
        const sourceX = cropX + Math.min(
          cropWidth - 1,
          Math.floor((x + 0.5) / tile.width * cropWidth),
        );
        const sourceY = cropY + Math.min(
          cropHeight - 1,
          Math.floor((y + 0.5) / tile.height * cropHeight),
        );
        const tileOffset = (y * tile.width + x) * tile.channels;
        const sourceOffset = (
          sourceY * source.width + sourceX
        ) * source.channels;
        const sourceAlpha = source.pixels[sourceOffset + 3];
        const tileAlpha = tile.pixels[tileOffset + 3];
        visibleSamples += tileAlpha >= 24 ? 1 : 0;

        if (sourceAlpha < 24) {
          sourceWaterSamples += 1;
          waterLeakSamples += tileAlpha >= 24 ? 1 : 0;
        }

        const isOuterEdge = (
          x < tile.width * 0.04
          || x >= tile.width * 0.96
          || y < tile.height * 0.04
          || y >= tile.height * 0.96
        );
        if (isOuterEdge) {
          outerSamples += 1;
          visibleOuterSamples += tileAlpha >= 24 ? 1 : 0;
        }
      }
    }

    if (sourceWaterSamples > 0) {
      assert.ok(
        waterLeakSamples / sourceWaterSamples < 0.01,
        `${site.id} must not cover accepted water pixels`,
      );
    }
    assert.ok(visibleSamples > 2_000, `${site.id} has no material support`);
    assert.ok(outerSamples > 100, site.id);
    assert.ok(
      visibleOuterSamples / outerSamples < 0.12,
      `${site.id} outer band must fade to the streamed terrain`,
    );
    const pixelsPerWorldWidth =
      site.dimensions[0] / site.worldBounds.span[0];
    assert.ok(
      pixelsPerWorldWidth > source.width * 2,
      `${site.id} must provide more than 2x territory plate density`,
    );
  }
});

test("close land detail is split into bounded camera-streamed tiles", async () => {
  const manifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/territory-landform/manifests/terrain-stream-tiles-r1.json",
  ), "utf8"));
  const [sourceWidth, sourceHeight] = manifest.sourceDimensions;
  const { columns, rows, outputScale } = manifest.grid;
  const {
    maximumResidentTiles,
    prefetchPadding,
    retentionPadding,
  } = manifest.streaming;

  assert.deepEqual([columns, rows, outputScale], [12, 8, 5]);
  assert.ok(prefetchPadding > 0);
  assert.ok(retentionPadding > prefetchPadding);
  assert.ok(maximumResidentTiles <= 12);
  assert.ok(
    manifest.tiles.length > maximumResidentTiles * 4,
    "the manifest must provide world coverage without making it all resident",
  );
  assert.equal(
    new Set(manifest.tiles.map(({ id }) => id)).size,
    manifest.tiles.length,
  );

  for (const tile of manifest.tiles) {
    assert.equal(tile.minimumTier, "capital");
    assert.equal(tile.sourceAlphaPolicy, "preserve-exactly");
    assert.match(
      tile.path,
      /^\/career-world\/layers\/territory-landform\/tiles\/stream-r1\/.+\.webp$/,
    );
    const bytes = await readFile(path.join(root, "public", tile.path));
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP");
    assert.equal(tile.sha256, await sha256(`public${tile.path}`));

    const [cropX, cropY] = tile.sourceCropPixels.origin;
    const [cropWidth, cropHeight] = tile.sourceCropPixels.size;
    assert.deepEqual(
      tile.dimensions,
      [cropWidth * outputScale, cropHeight * outputScale],
    );
    assert.ok(Math.abs(
      tile.worldBounds.origin[0] - cropX / sourceWidth,
    ) < 1e-12);
    assert.ok(Math.abs(
      tile.worldBounds.origin[1] - cropY / sourceHeight,
    ) < 1e-12);
    assert.ok(Math.abs(
      tile.worldBounds.span[0] - cropWidth / sourceWidth,
    ) < 1e-12);
    assert.ok(Math.abs(
      tile.worldBounds.span[1] - cropHeight / sourceHeight,
    ) < 1e-12);
    assert.ok(
      tile.dimensions[0] / tile.worldBounds.span[0]
        >= sourceWidth * outputScale,
    );
  }
});

test("close land tiles are authored from dedicated high-fidelity materials", async () => {
  const ground = await decodePng(
    "public/career-world/layers/territory-landform/materials/close-ground-r1.png",
  );
  const rock = await decodePng(
    "public/career-world/layers/territory-landform/materials/close-rock-r1.png",
  );
  const authoringScript = await readFile(path.join(
    root,
    "scripts/build-career-world-land-stream-tiles.py",
  ), "utf8");

  for (const material of [ground, rock]) {
    assert.ok(material.width >= 1024);
    assert.ok(material.height >= 1024);
    assert.equal(material.channels, 3);
  }
  assert.match(authoringScript, /LOWLAND_MATERIAL/);
  assert.match(authoringScript, /ROCK_MATERIAL/);
  assert.match(authoringScript, /sample_mirrored_detail/);
  assert.match(authoringScript, /sample_noise/);
  assert.match(
    authoringScript,
    /color = matched_material \* 0\.88 \+ albedo \* 0\.12/,
  );

  const closeTerrainBody = authoringScript.slice(
    authoringScript.indexOf("def add_close_terrain_detail("),
    authoringScript.indexOf("def apply_authored_mountain_reference("),
  );
  assert.doesNotMatch(
    closeTerrainBody,
    /ImageFilter\.GaussianBlur/,
    "Visible close-terrain RGB must not be authored through a blur filter.",
  );

  const siteAuthoringScript = await readFile(path.join(
    root,
    "scripts/build-career-world-capital-site-tiles.py",
  ), "utf8");
  const generatedSiteBody = siteAuthoringScript.slice(
    siteAuthoringScript.indexOf("def build_generated_site("),
    siteAuthoringScript.indexOf("def main()"),
  );
  assert.doesNotMatch(
    generatedSiteBody,
    /ImageFilter\.GaussianBlur/,
    "Visible site RGB must remain sharp; only alpha-support helpers may blur.",
  );
});

test("coast field is derived across the complete authored shoreline", async () => {
  const mask = await decodePng(
    "public/career-world/layers/territory-landform/masks/world-land-mask-r3.png",
  );
  const coast = await decodePng(
    "public/career-world/layers/water-surface/fields/coast-geometry-r5.png",
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
    "public/career-world/layers/territory-landform/masks/world-land-mask-r3.png",
  );
  const hydrology = await decodePng(
    "public/career-world/layers/water-surface/fields/water-region-field-r3.png",
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

test("the main inland lake produces a broad fertile land basin", async () => {
  const manifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/territory-landform/manifests/terrain-relief-r6.json",
  ), "utf8"));
  const mask = await decodePng(
    "public/career-world/layers/territory-landform/masks/world-land-mask-r3.png",
  );
  const material = await decodePng(
    "public/career-world/layers/territory-landform/textures/terrain-relief-r6.png",
  );
  const hydrology = await decodePng(
    "public/career-world/layers/water-surface/fields/water-region-field-r3.png",
  );
  const distance = channelDistanceField(hydrology, 0, 128, 220);
  let nearCount = 0;
  let farCount = 0;
  let nearGreenChroma = 0;
  let farGreenChroma = 0;

  for (let pixel = 0; pixel < mask.width * mask.height; pixel += 1) {
    if (mask.pixels[pixel] < 128) {
      continue;
    }
    const offset = pixel * material.channels;
    const chroma = (
      material.pixels[offset + 1]
      - (material.pixels[offset] + material.pixels[offset + 2]) / 2
    );
    if (distance[pixel] >= 8 && distance[pixel] <= 90) {
      nearCount += 1;
      nearGreenChroma += chroma;
    } else if (distance[pixel] >= 150 && distance[pixel] <= 220) {
      farCount += 1;
      farGreenChroma += chroma;
    }
  }

  assert.ok(nearCount > 20_000);
  assert.ok(farCount > 20_000);
  assert.ok(
    nearGreenChroma / nearCount - farGreenChroma / farCount > 7,
    "the oasis basin must read greener than distant land without vegetation art",
  );
  assert.deepEqual(
    manifest.derivation.inlandFertilityColor,
    [54, 110, 40],
  );
  assert.equal(manifest.derivation.inlandFertilityStrength, 0.52);
});

test("coast materials derive beach and cliff variation from topology", async () => {
  const material = await decodePng(
    "public/career-world/layers/water-surface/fields/coast-material-field-r6.png",
  );
  const mask = await decodePng(
    "public/career-world/layers/territory-landform/masks/world-land-mask-r3.png",
  );
  const height = await decodePng(
    "public/career-world/layers/territory-landform/fields/terrain-height-r4.png",
  );
  const slope = await decodePng(
    "public/career-world/layers/territory-landform/fields/terrain-slope-r4.png",
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
    "public/career-world/layers/territory-landform/manifests/terrain-relief-r6.json",
  ), "utf8"));
  const coastManifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/water-surface/manifests/coast-geometry-r5.json",
  ), "utf8"));
  const waterManifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/water-surface/manifests/water-surface-world-lod-r2.json",
  ), "utf8"));
  const hydrologyManifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/water-surface/manifests/water-region-field-r3.json",
  ), "utf8"));
  const coastMaterialManifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/water-surface/manifests/coast-material-field-r6.json",
  ), "utf8"));

  assert.equal(
    landManifest.visual.sha256,
    await sha256(
      "public/career-world/layers/territory-landform/textures/terrain-relief-r6.png",
    ),
  );
  assert.equal(
    coastManifest.texture.sha256,
    await sha256(
      "public/career-world/layers/water-surface/fields/coast-geometry-r5.png",
    ),
  );
  assert.equal(
    landManifest.detailVisual.sha256,
    await sha256(
      "public/career-world/layers/territory-landform/textures/terrain-relief-r6-detail-4x.png",
    ),
  );
  assert.equal(
    coastManifest.detailTexture.sha256,
    await sha256(
      "public/career-world/layers/water-surface/fields/coast-geometry-r5-4x.png",
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
      "public/career-world/layers/water-surface/fields/water-region-field-r3.png",
    ),
  );
  assert.equal(
    coastMaterialManifest.texture.sha256,
    await sha256(
      "public/career-world/layers/water-surface/fields/coast-material-field-r6.png",
    ),
  );
  assert.equal(
    landManifest.fields.height.sha256,
    await sha256(
      "public/career-world/layers/territory-landform/fields/terrain-height-r4.png",
    ),
  );
  assert.equal(
    landManifest.fields.slope.sha256,
    await sha256(
      "public/career-world/layers/territory-landform/fields/terrain-slope-r4.png",
    ),
  );
  assert.equal(
    landManifest.topologyQa.sha256,
    await sha256(
      "public/career-world/layers/territory-landform/overlays/terrain-contours-r4-detail-4x.png",
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
      "public/career-world/layers/territory-landform/manifests/terrain-dem-r4.json",
    ),
  );
  assert.equal(
    landManifest.derivation.authoredSurfaceSourceSha256,
    await sha256(
      "public/career-world/layers/territory-landform/sources/world-land-surface-authored-r9.png",
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
      "public/career-world/layers/water-surface/fields/water-height-macro-r1-1024x1024.png",
      "0D47733EE33A3D6BBC1D667E2214AE937DB051341F2E2B62B73CA60FD987CDE5",
    ],
    [
      "public/career-world/layers/water-surface/fields/water-height-micro-r1-1024x1024.png",
      "6681E2DACCA2F5105A9F4C478B112D4C05F1479B9EAC26C02975295A71C6DCB3",
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
