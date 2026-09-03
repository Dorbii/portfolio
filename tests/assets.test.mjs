import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { WORLD_PLANE } from "../features/career-world/shared/world.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Territories whose ground has actually been authored.
 *
 * The world is scoped for ~88 regions of land across five territories and
 * currently holds one territory's worth. Asking whether an unauthored
 * territory's capital stands on land is asking about ground that does not
 * exist yet, so land assertions are scoped to the territories that have an L2
 * ledger. Deriving the set from the manifests present means it widens itself
 * as each territory is baked, rather than needing this list edited.
 */
async function authoredTerritories() {
  const dir = path.join(
    root,
    "public/career-world/layers/terrain/authority/manifests",
  );
  return new Set(
    (await readdir(dir))
      .map((file) => file.match(/^terrain-l2-(.+)-r\d+\.json$/)?.[1])
      .filter(Boolean),
  );
}

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

test("the world plate and its mask agree, with no edge glow", async () => {
  // The plate is composited from the authored L2 pyramid and the mask is
  // derived from that plate's own alpha, so the two cannot drift. The rule the
  // old relief was held to still holds: alpha and mask agree pixel for pixel,
  // and soft edges stay a boundary treatment rather than a glow over the sea.
  const mask = await decodePng(
    "public/career-world/layers/terrain/authority/masks/world-land-mask-r5.png",
  );
  const plate = await decodePng(
    "public/career-world/layers/terrain/authority/textures/world-land-r1.png",
  );
  assert.deepEqual([plate.width, plate.height], [mask.width, mask.height]);
  assert.equal(plate.channels, 4);
  assert.equal(mask.channels, 1, "a land mask is read as one channel per pixel");
  let partialAlphaPixels = 0;
  for (let pixel = 0; pixel < mask.pixels.length; pixel += 1) {
    const alpha = plate.pixels[pixel * 4 + 3];
    assert.equal(alpha >= 128, mask.pixels[pixel] >= 128);
    partialAlphaPixels += alpha > 0 && alpha < 255 ? 1 : 0;
  }
  let binaryBoundaryPixels = 0;
  for (let y = 1; y < mask.height - 1; y += 1) {
    for (let x = 1; x < mask.width - 1; x += 1) {
      const offset = y * mask.width + x;
      const land = mask.pixels[offset] >= 128;
      binaryBoundaryPixels += (
        (mask.pixels[offset - 1] >= 128) !== land
        || (mask.pixels[offset + 1] >= 128) !== land
        || (mask.pixels[offset - mask.width] >= 128) !== land
        || (mask.pixels[offset + mask.width] >= 128) !== land
      ) ? 1 : 0;
    }
  }
  assert.ok(partialAlphaPixels > 0, "the coast is antialiased, not stepped");
  assert.ok(
    partialAlphaPixels < binaryBoundaryPixels * 3,
    "soft alpha must stay a boundary treatment, not a glow over the sea",
  );
});
test("every territory reserves a registered city-ready capital envelope", async () => {
  const manifest = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/terrain/authority/manifests/world-territories-r4.json",
  ), "utf8"));
  const land = await decodePng(
    "public/career-world/layers/terrain/authority/masks/world-land-mask-r5.png",
  );
  const slope = await decodePng(
    "public/career-world/layers/terrain/authority/fields/terrain-slope-r4.png",
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

  const authored = await authoredTerritories();
  for (const territory of manifest.territories) {
    const { capitalAnchor, capitalEnvelope } = territory.development;
    const [originX, originY] = capitalEnvelope.origin;
    const [spanX, spanY] = capitalEnvelope.span;
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
    if (!authored.has(territory.id)) continue;   // no ground to stand on yet
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
      `${territory.id} capital envelope coverage ${coverage.toFixed(3)} is too low`,
    );
    assert.ok(
      buildablePixels / Math.max(landPixels, 1) >= 0.58,
      `${territory.id} capital envelope lacks a broad buildable terrain shelf`,
    );
  }
});

test("the Kaizen Agent project anchor uses accepted NinjaOne land", async () => {
  const projects = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/structures/manifests/project-structures-r1.json",
  ), "utf8"));
  const land = await decodePng(
    "public/career-world/layers/terrain/authority/masks/world-land-mask-r5.png",
  );

  assert.deepEqual(projects.nodes.map(({ id }) => id), [
    "project-kaizen-agent",
  ]);
  for (const project of projects.nodes) {
    const [worldX, worldY] = project.territoryAnchor;
    const x = Math.min(land.width - 1, Math.floor(worldX * land.width));
    const y = Math.min(land.height - 1, Math.floor(worldY * land.height));
    const offset = y * land.width + x;
    assert.ok(
      land.pixels[offset] >= 128,
      `${project.id} territory anchor must be on accepted land`,
    );
  }

});

test("NinjaOne town-plan paving stays on accepted terrain", async () => {
  const infrastructure = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/infrastructure/manifests/ninjaone-project-towns-r1.json",
  ), "utf8"));
  const land = await decodePng(
    "public/career-world/layers/terrain/authority/masks/world-land-mask-r5.png",
  );
  const plans = [
    ...infrastructure.towns.map(({ id, townPlan }) => ({ id, townPlan })),
  ];
  assert.equal("capitalCampus" in infrastructure, false);
  assert.equal(plans.length, 1);
  const toMaskPoint = ([worldX, worldY]) => [
    worldX / WORLD_PLANE.width * land.width,
    worldY / WORLD_PLANE.height * land.height,
  ];
  const assertLandAtWorldPoint = ([worldX, worldY], label) => {
    const [maskX, maskY] = toMaskPoint([worldX, worldY]);
    const x = Math.floor(maskX);
    const y = Math.floor(maskY);
    assert.ok(
      x >= 0 && x < land.width && y >= 0 && y < land.height,
      `${label} leaves the world plane`,
    );
    assert.ok(
      land.pixels[y * land.width + x] >= 128,
      `${label} covers water at ${x},${y}`,
    );
  };
  const pointInPolygon = (x, y, points) => {
    let inside = false;
    for (
      let current = 0, previous = points.length - 1;
      current < points.length;
      previous = current, current += 1
    ) {
      const [currentX, currentY] = points[current];
      const [previousX, previousY] = points[previous];
      if (
        (currentY > y) !== (previousY > y)
        && x < (
          (previousX - currentX) * (y - currentY)
          / (previousY - currentY)
          + currentX
        )
      ) {
        inside = !inside;
      }
    }
    return inside;
  };
  const assertPolygonOnLand = (points, label) => {
    const worldPoints = points.map(([x, y]) => [
      x * WORLD_PLANE.width,
      y * WORLD_PLANE.height,
    ]);
    const maskPoints = worldPoints.map(toMaskPoint);
    worldPoints.forEach((point, index) => {
      assertLandAtWorldPoint(point, `${label} vertex ${index}`);
    });
    const xs = maskPoints.map(([x]) => x);
    const ys = maskPoints.map(([, y]) => y);
    const minimumX = Math.max(0, Math.floor(Math.min(...xs)));
    const maximumX = Math.min(land.width - 1, Math.ceil(Math.max(...xs)));
    const minimumY = Math.max(0, Math.floor(Math.min(...ys)));
    const maximumY = Math.min(land.height - 1, Math.ceil(Math.max(...ys)));
    let interiorSamples = 0;
    for (let y = minimumY; y <= maximumY; y += 1) {
      for (let x = minimumX; x <= maximumX; x += 1) {
        if (!pointInPolygon(x + 0.5, y + 0.5, maskPoints)) {
          continue;
        }
        interiorSamples += 1;
        assert.ok(
          land.pixels[y * land.width + x] >= 128,
          `${label} interior covers water at ${x},${y}`,
        );
      }
    }
    assert.ok(interiorSamples > 0, `${label} needs rasterized interior`);
  };
  const assertCorridorOnLand = (waypoints, halfWidthWorld, label) => {
    const lateralOffsets = [-halfWidthWorld, halfWidthWorld];
    for (
      let offset = Math.ceil(-halfWidthWorld);
      offset <= Math.floor(halfWidthWorld);
      offset += 1
    ) {
      lateralOffsets.push(offset);
    }
    for (let segment = 1; segment < waypoints.length; segment += 1) {
      const start = [
        waypoints[segment - 1][0] * WORLD_PLANE.width,
        waypoints[segment - 1][1] * WORLD_PLANE.height,
      ];
      const end = [
        waypoints[segment][0] * WORLD_PLANE.width,
        waypoints[segment][1] * WORLD_PLANE.height,
      ];
      const deltaX = end[0] - start[0];
      const deltaY = end[1] - start[1];
      const length = Math.hypot(deltaX, deltaY);
      assert.ok(length > 0, `${label} segment ${segment} has zero length`);
      const normal = [-deltaY / length, deltaX / length];
      const [startMaskX, startMaskY] = toMaskPoint(start);
      const [endMaskX, endMaskY] = toMaskPoint(end);
      const steps = Math.max(
        1,
        Math.ceil(Math.hypot(
          endMaskX - startMaskX,
          endMaskY - startMaskY,
        )),
      );
      for (let step = 0; step <= steps; step += 1) {
        const progress = step / steps;
        const center = [
          start[0] + deltaX * progress,
          start[1] + deltaY * progress,
        ];
        for (const offset of lateralOffsets) {
          assertLandAtWorldPoint(
            [
              center[0] + normal[0] * offset,
              center[1] + normal[1] * offset,
            ],
            `${label} segment ${segment}`,
          );
        }
      }
    }
  };

  assert.equal(plans.length, 1);
  for (const { id, townPlan } of plans) {
    assert.ok(townPlan, `${id} needs a town plan`);
    for (const block of townPlan.blocks) {
      assertPolygonOnLand(block.points, `${id} block ${block.id}`);
    }
    for (const plaza of townPlan.plazas) {
      assertPolygonOnLand(plaza.points, `${id} plaza ${plaza.id}`);
    }
    for (const street of townPlan.streets) {
      assertCorridorOnLand(
        street.waypoints,
        4.1,
        `${id} street ${street.id}`,
      );
    }
    for (const loop of townPlan.pedestrianLoops) {
      assertCorridorOnLand(
        loop.waypoints,
        1.9,
        `${id} pedestrian loop ${loop.id}`,
      );
    }
    for (const seam of townPlan.terrainSeams) {
      assertCorridorOnLand(
        seam.waypoints,
        0.925,
        `${id} terrain seam ${seam.id}`,
      );
    }
    for (const entrance of townPlan.entrances) {
      const center = [
        entrance.point[0] * WORLD_PLANE.width,
        entrance.point[1] * WORLD_PLANE.height,
      ];
      for (let offsetY = -1.4; offsetY <= 1.4; offsetY += 0.7) {
        for (let offsetX = -2; offsetX <= 2; offsetX += 1) {
          assertLandAtWorldPoint(
            [center[0] + offsetX, center[1] + offsetY],
            `${id} entrance ${entrance.structureId}`,
          );
        }
      }
    }
  }
});

test("visible capital sprites remain supported by their registered terrain", async () => {
  const structures = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/structures/manifests/capital-structures-r1.json",
  ), "utf8"));
  const territories = JSON.parse(await readFile(path.join(
    root,
    "public/career-world/layers/terrain/authority/manifests/world-territories-r4.json",
  ), "utf8"));
  const land = await decodePng(
    "public/career-world/layers/terrain/authority/masks/world-land-mask-r5.png",
  );

  const authored = await authoredTerritories();
  for (const capital of structures.nodes) {
    const territory = territories.territories.find(
      ({ id }) => id === capital.territoryId,
    );
    assert.ok(territory, capital.territoryId);
    if (!authored.has(capital.territoryId)) continue;   // no ground yet

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

test("close land tiles are authored from dedicated high-fidelity materials", async () => {
  const ground = await decodePng(
    "public/career-world/layers/terrain/authority/materials/close-ground-r1.png",
  );
  const rock = await decodePng(
    "public/career-world/layers/terrain/authority/materials/close-rock-r1.png",
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
  const closeTerrainBody = authoringScript.slice(
    authoringScript.indexOf("def add_close_terrain_detail("),
    authoringScript.indexOf("def apply_authored_mountain_reference("),
  );
  assert.match(
    closeTerrainBody,
    /color = matched_material(?:\.copy\(\))?/,
    "Close-terrain output RGB must use the sampled material as authority.",
  );
  assert.doesNotMatch(
    closeTerrainBody,
    /color\s*=\s*matched_material\s*\*|color\s*=.*\balbedo\b/,
    "The enlarged plate must not be blended back into close-terrain output RGB.",
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
    "public/career-world/layers/terrain/authority/masks/world-land-mask-r4.png",
  );
  const coast = await decodePng(
    "public/career-world/layers/ocean/authority/fields/coast-geometry-r5.png",
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

test("the solved ocean fields are the accepted checkpoint", async () => {
  // These four replace 40.3 MB of painted water plates. The phase field is an
  // ASSET rather than a runtime cost because the coastline is fixed once set,
  // so a change here is a change to the sea itself and should be deliberate:
  // re-bake with bake_world.py, re-encode with encode_world.py, and update
  // these hashes in the same commit that changes the water.
  //
  // Both bake and encode read WORLD_LAMBDA. Setting it for one and not the
  // other writes a texture at one scale and a manifest claiming another, which
  // is silent -- the pixels are fine and every length derived from them is
  // wrong. Run them with the same environment.
  const acceptedAssets = [
    [
      "public/career-world/layers/ocean/fields/ocean-flow-r2.png",
      "498D0BA5D259DFCD26F85B1D43191E694163A325AF92D1B3F93441BE039F534E",
    ],
    [
      "public/career-world/layers/ocean/fields/ocean-noise-fine-r2.png",
      "D032B31C204FF7F7451F34EA722CBCF4EDB6F7765511071E8512456616EADDE9",
    ],
    [
      "public/career-world/layers/ocean/fields/ocean-noise-r2.png",
      "C111F6D9F022DA282EFEF222C5E0FB83716E1264A855FB0DD2C0BBA1F58695C9",
    ],
    [
      "public/career-world/layers/ocean/fields/ocean-phase-r2.png",
      "8F9292A48BFE30F0DD0B08ED9CA6F629F1F52BC0662188D428BEE1710131B3A0",
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
