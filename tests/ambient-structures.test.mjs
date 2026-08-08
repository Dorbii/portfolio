import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import {
  KAIZEN_SEMANTIC_ASSET_REGISTRATION,
  KAIZEN_SEMANTIC_STRUCTURE_ASSETS,
  resolveKaizenSemanticStructureAsset,
} from "../features/career-world/layers/structures/model/kaizenSemanticAssets.ts";
import {
  KAIZEN_NEIGHBORHOOD_BASE_DIMENSIONS,
  KAIZEN_NEIGHBORHOOD_CLOSE_DIMENSIONS,
  KAIZEN_NEIGHBORHOOD_CLOSE_GRID_ROOT,
  KAIZEN_NEIGHBORHOOD_CLOSE_GRID_SIZE,
  KAIZEN_NEIGHBORHOOD_CLOSE_TILE_DIMENSIONS,
  KAIZEN_NEIGHBORHOOD_FOUNDATION_SRC,
  KAIZEN_NEIGHBORHOOD_MODULES,
  KAIZEN_NEIGHBORHOOD_SITE_FOUNDATION_SRC,
  KAIZEN_NEIGHBORHOOD_SITE_DIMENSIONS,
} from "../features/career-world/layers/structures/model/kaizenNeighborhoodFabric.ts";
import {
  NINJAONE_CITY_ASSET_POOL,
  NINJAONE_CITY_ASSET_POOL_ID,
} from "../features/career-world/layers/structures/model/ninjaOneCityAssets.ts";

const root = process.cwd();
async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function publicFile(assetPath) {
  return path.join(root, "public", ...assetPath.slice(1).split("/"));
}

test("removed NinjaOne cities leave no modular ambient registry", async () => {
  const [ambient, infrastructure, projects, skills, support] = await Promise.all([
    readJson(
      "public/career-world/layers/structures/manifests/"
        + "ambient-structures-r1.json",
    ),
    readJson(
      "public/career-world/layers/infrastructure/manifests/"
        + "ninjaone-project-towns-r1.json",
    ),
    readJson(
      "public/career-world/layers/structures/manifests/"
        + "project-structures-r1.json",
    ),
    readJson(
      "public/career-world/layers/structures/manifests/"
        + "skill-structures-r1.json",
    ),
    readJson(
      "public/career-world/layers/structures/manifests/"
        + "support-structures-r1.json",
    ),
  ]);

  assert.deepEqual(projects.nodes.map(({ id }) => id), ["project-kaizen-agent"]);
  assert.deepEqual(
    infrastructure.towns.map(({ projectId }) => projectId),
    ["project-kaizen-agent"],
  );
  assert.equal("capitalCampus" in infrastructure, false);
  assert.deepEqual(ambient.archetypes, []);
  assert.deepEqual(ambient.instances, []);
  assert.deepEqual(support.archetypes, []);
  assert.deepEqual(support.instances, []);
  assert.equal(skills.instances.length, 3);
  assert.ok(
    skills.instances.every(({ ownerId }) => ownerId === "project-kaizen-agent"),
  );
  assert.doesNotMatch(
    JSON.stringify({ ambient, infrastructure, projects, skills, support }),
    /project-vendy|project-kaizen-metrics|capital-ninjaone/,
  );
});

test("authored town foundations separate semantic overlays from plate-owned fillers", async () => {
  const [component, model, css] = await Promise.all([
    readFile(path.join(
      root,
      "features/career-world/layers/structures/components/"
        + "StructuresLayer.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/structures/model/ambient.ts",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/styles/career-world.css",
    ), "utf8"),
  ]);

  assert.match(
    model,
    /AMBIENT_NODE_POLICY:[\s\S]*minimumTier: "site"/,
  );
  assert.match(component, /data-structure-role="ambient-building"/);
  assert.match(component, /data-ambient-candidate-count=/);
  assert.match(component, /data-ambient-structure-count=/);
  assert.match(component, /className="ambient-structures"/);
  assert.match(component, /resolveAmbientAnchor\(instance\)/);
  assert.match(
    component,
    /const townFabricVisibility = townOverviewVisibility;/,
  );
  assert.doesNotMatch(
    component,
    /townOverviewVisibility \* \(1 - townDetailVisibility\)/,
  );
  assert.match(
    component,
    /const townDetailVisibility = resolveAtomicTierVisibility\(/,
  );
  assert.match(
    component,
    /const authoredTownStructureVisibility = resolveAtomicTierVisibility\(\s*TOWN_FABRIC_NODE_POLICY,/,
  );
  assert.match(
    component,
    /INDIVIDUAL_STRUCTURE_TOWN_OWNER_IDS = new Set\([\s\S]*KAIZEN_NEIGHBORHOOD_OWNER_ID/,
  );
  assert.match(
    component,
    /RENDERED_TOWN_FABRIC_INSTANCES[\s\S]*!INDIVIDUAL_STRUCTURE_TOWN_OWNER_IDS\.has\(ownerId\)/,
  );
  assert.match(
    component,
    /RENDERED_AMBIENT_STRUCTURE_INSTANCES[\s\S]*!TOWN_FABRIC_OWNER_IDS\.has\(ownerId\)/,
  );
  assert.match(component, /<KaizenNeighborhoodFabric/);
  assert.doesNotMatch(component, /shouldRenderNeighborhoodOverview/);
  assert.match(component, /data-town-neighborhood-close-visibility=/);
  assert.match(component, /data-town-authored-structure-visibility=/);
  assert.match(
    component,
    /Math\.max\(defaultVisibility, authoredTownVisibility\)[\s\S]*> LOD_PRESENTATION_EPSILON[\s\S]*\? 1[\s\S]*: 0/,
  );
  assert.match(
    component,
    /defaultVisibility \* \(1 - authoredTownVisibility\)/,
  );
  assert.match(
    component,
    /projectPresentationVisibility,[\s\S]*"semantic"/,
  );
  assert.match(
    component,
    /skillPresentationVisibility,[\s\S]*"semantic"/,
  );
  assert.match(
    component,
    /supportPresentationVisibility,[\s\S]*"plate-owned"/,
  );
  assert.match(
    component,
    /ambientPresentationVisibility,[\s\S]*"plate-owned"/,
  );
  assert.match(component, /data-semantic-structure="true"/);
  assert.match(component, /data-scene-asset-pool=/);
  assert.match(component, /data-scene-resource-id=/);
  assert.match(component, /data-shared-city-asset-count=/);
  assert.match(component, /data-shared-city-asset-pool=/);
  assert.doesNotMatch(component, /className="kaizen-hero-ground-interfaces"/);
  assert.match(component, /structure-sprite__grounding--ambient/);
  assert.match(component, /structure-sprite__grounding--contact/);
  assert.match(component, /resolveKaizenSemanticStructureAsset/);
  assert.match(component, /assetOwnsGrounding/);
  assert.match(component, /data-grounding-ownership=/);
  assert.match(component, /data-semantic-registration=/);
  assert.match(
    component,
    /pointerEvents=\{interactionOverlay \? "none" : undefined\}/,
  );
  assert.doesNotMatch(
    component,
    /className="structure-sprite__interaction-hitbox"/,
  );
  assert.doesNotMatch(component, /career-world-semantic-cast-shadow/);
  assert.doesNotMatch(component, /structure-sprite__semantic-contact--/);
  assert.match(
    component,
    /mountedStructures:[\s\S]*\.sort\(compareStructureDepth\)/,
  );
  assert.match(
    component,
    /data-individual-structure-town-count=/,
  );
  assert.match(
    css,
    /\.ambient-structure \{[\s\S]*saturate\(0\.76\)[\s\S]*brightness\(0\.9\)/,
  );
  assert.match(
    css,
    /\.project-structure \.structure-sprite__asset \{[\s\S]*rgb\(198 151 86 \/ 36%\)/,
  );
  assert.match(
    css,
    /\.skill-structure \.structure-sprite__asset \{[\s\S]*rgb\(91 151 148 \/ 34%\)/,
  );
  assert.match(component, /structure-sprite__asset--concept-native/);
  assert.doesNotMatch(component, /structure-sprite__grounding--kaizen-hero/);
  assert.doesNotMatch(css, /transform: scale\(1\.78, 0\.72\)/);
  assert.match(
    css,
    /\.career-world__semantic-structure:hover[\s\S]*filter:/,
  );
  assert.match(
    css,
    /\.structure-sprite__asset--semantic-overlay \{[\s\S]*pointer-events: none/,
  );
  assert.match(component, /className="structure-sprite__interaction-silhouette"/);
  assert.match(component, /pointerEvents=\{interactive \? "fill" : "none"\}/);
  assert.match(css, /\.structure-sprite__interaction-silhouette \{[\s\S]*pointer-events: fill/);
  assert.match(
    css,
    /\.structure-sprite__asset--concept-native[\s\S]*saturate\(0\.96\)/,
  );
  assert.doesNotMatch(
    css,
    /\.career-world__semantic-structure:hover[^}]*transform:/,
  );
});

test("Kaizen semantic buildings reuse the registered shared city pool", async () => {
  const cityAssets = await readFile(path.join(
    root,
    "features/career-world/layers/structures/model/ninjaOneCityAssets.ts",
  ), "utf8");
  const resourceIds = NINJAONE_CITY_ASSET_POOL.map(({ id }) => id);
  const semanticIds = NINJAONE_CITY_ASSET_POOL.map(
    ({ semanticAsset }) => semanticAsset.id,
  );

  assert.equal(NINJAONE_CITY_ASSET_POOL_ID, "ninjaone-shared-city-assets@r3");
  assert.equal(NINJAONE_CITY_ASSET_POOL.length, 4);
  assert.equal(new Set(resourceIds).size, resourceIds.length);
  assert.deepEqual(
    new Set(semanticIds),
    new Set(KAIZEN_SEMANTIC_STRUCTURE_ASSETS.map(({ id }) => id)),
  );
  assert.ok(NINJAONE_CITY_ASSET_POOL.every(({ semanticAsset, variants }) => (
    variants.standard === semanticAsset.assetPath
  )));
  assert.match(cityAssets, /KAIZEN_SEMANTIC_STRUCTURE_ASSETS\.map/);
  assert.match(cityAssets, /const ASSET_BY_SEMANTIC_ID = new Map/);
  assert.match(
    cityAssets,
    /ASSET_BY_SEMANTIC_ID\.get\(semanticAssetId\) \?\? null/,
  );
});

test("Kaizen city mounts a persistent base and derived progressive detail", async () => {
  const [component, fabricComponent] = await Promise.all([
    readFile(path.join(
      root,
      "features/career-world/layers/structures/components/"
        + "StructuresLayer.tsx",
    ), "utf8"),
    readFile(path.join(
      root,
      "features/career-world/layers/structures/components/"
        + "KaizenNeighborhoodFabric.tsx",
    ), "utf8"),
  ]);
  const baseModules = KAIZEN_NEIGHBORHOOD_MODULES.filter(
    ({ lod }) => lod === "base",
  );
  const siteModules = KAIZEN_NEIGHBORHOOD_MODULES.filter(
    ({ lod }) => lod === "site",
  );
  const closeModules = KAIZEN_NEIGHBORHOOD_MODULES.filter(
    ({ lod }) => lod === "close",
  );
  const assetPaths = new Set(
    KAIZEN_NEIGHBORHOOD_MODULES.map(({ assetPath }) => assetPath),
  );

  assert.equal(KAIZEN_NEIGHBORHOOD_CLOSE_GRID_SIZE, 2);
  assert.deepEqual(KAIZEN_NEIGHBORHOOD_BASE_DIMENSIONS, [768, 768]);
  assert.deepEqual(KAIZEN_NEIGHBORHOOD_SITE_DIMENSIONS, [1254, 1254]);
  assert.deepEqual(KAIZEN_NEIGHBORHOOD_CLOSE_DIMENSIONS, [2048, 2048]);
  assert.deepEqual(
    KAIZEN_NEIGHBORHOOD_CLOSE_TILE_DIMENSIONS,
    [1024, 1024],
  );
  assert.equal(KAIZEN_NEIGHBORHOOD_MODULES.length, 6);
  assert.equal(assetPaths.size, 6);
  assert.equal(baseModules.length, 1);
  assert.equal(baseModules[0].kind, "city-foundation-base");
  assert.equal(baseModules[0].assetPath, KAIZEN_NEIGHBORHOOD_FOUNDATION_SRC);
  assert.deepEqual(baseModules[0].crop, [0, 0, 768, 768]);
  assert.deepEqual(baseModules[0].region, [0, 0, 1, 1]);
  assert.equal(siteModules.length, 1);
  assert.equal(siteModules[0].kind, "city-foundation-site");
  assert.equal(
    siteModules[0].assetPath,
    KAIZEN_NEIGHBORHOOD_SITE_FOUNDATION_SRC,
  );
  assert.deepEqual(siteModules[0].crop, [0, 0, 1254, 1254]);
  assert.deepEqual(siteModules[0].region, [0, 0, 1, 1]);
  assert.equal(closeModules.length, 4);
  assert.equal(
    new Set(closeModules.map(({ gridColumn, gridRow }) => (
      `${gridRow}:${gridColumn}`
    ))).size,
    4,
  );
  assert.ok(closeModules.every((module) => (
    module.kind === "city-foundation-close-tile"
    && module.assetPath.startsWith(`${KAIZEN_NEIGHBORHOOD_CLOSE_GRID_ROOT}/`)
    && module.blockId === baseModules[0].blockId
  )));
  assert.equal(
    closeModules.reduce((sum, { region }) => sum + region[2] * region[3], 0),
    1,
  );
  assert.equal(
    new Set(KAIZEN_NEIGHBORHOOD_MODULES.map(({ id }) => id)).size,
    KAIZEN_NEIGHBORHOOD_MODULES.length,
  );

  for (const neighborhoodModule of KAIZEN_NEIGHBORHOOD_MODULES) {
    const [cropX, cropY, cropWidth, cropHeight] = neighborhoodModule.crop;
    const [sourceWidth, sourceHeight] = neighborhoodModule.sourceDimensions;
    assert.ok(cropX >= 0 && cropY >= 0, neighborhoodModule.id);
    assert.ok(cropWidth > 0 && cropHeight > 0, neighborhoodModule.id);
    assert.ok(
      cropX + cropWidth <= sourceWidth,
      neighborhoodModule.id,
    );
    assert.ok(
      cropY + cropHeight <= sourceHeight,
      neighborhoodModule.id,
    );
  }

  const expectedDimensions = new Map(KAIZEN_NEIGHBORHOOD_MODULES.map(
    ({ assetPath, sourceDimensions }) => [assetPath, sourceDimensions],
  ));
  let transparentCloseTileCount = 0;
  for (const [assetPath, dimensions] of expectedDimensions) {
    const metadata = await sharp(publicFile(assetPath)).metadata();
    const stats = await sharp(publicFile(assetPath)).stats();
    const alpha = stats.channels[3] ?? { max: 255, min: 255 };

    assert.equal(metadata.width, dimensions[0], assetPath);
    assert.equal(metadata.height, dimensions[1], assetPath);
    assert.equal(alpha.max, 255, `${assetPath} needs opaque environment pixels`);
    if (assetPath.startsWith(KAIZEN_NEIGHBORHOOD_CLOSE_GRID_ROOT)) {
      transparentCloseTileCount += alpha.min === 0 ? 1 : 0;
    } else {
      assert.equal(metadata.hasAlpha, true, assetPath);
    }
  }
  assert.equal(
    (await sharp(publicFile(KAIZEN_NEIGHBORHOOD_FOUNDATION_SRC)).stats())
      .channels[3].min,
    0,
  );
  assert.equal(
    (await sharp(publicFile(KAIZEN_NEIGHBORHOOD_SITE_FOUNDATION_SRC)).stats())
      .channels[3].min,
    0,
  );
  assert.ok(transparentCloseTileCount > 0);
  assert.match(KAIZEN_NEIGHBORHOOD_FOUNDATION_SRC, /kaizen-base-overview-r1\.webp$/);
  assert.match(KAIZEN_NEIGHBORHOOD_SITE_FOUNDATION_SRC, /kaizen-base-site-r1\.webp$/);
  assert.match(component, /<KaizenNeighborhoodFabric/);
  assert.match(
    component,
    /onVisualReadyChange=\{onKaizenVisualReadyChange\}/,
  );
  assert.match(component, /shouldRenderCloseNeighborhood/);
  assert.match(component, /shouldRenderSiteNeighborhood/);
  assert.doesNotMatch(fabricComponent, /registrationMaskId|close-fallback/);
  assert.match(
    fabricComponent,
    /persistent-base-progressive-detail-grid/,
  );
  assert.match(fabricComponent, /data-neighborhood-lod=/);
  assert.match(
    fabricComponent,
    /decodedAssetPaths\.has\(baseModule\.assetPath\)/,
  );
  assert.match(fabricComponent, /const image = new Image\(\)/);
  assert.match(fabricComponent, /requestedAssetPaths/);
  assert.match(fabricComponent, /if \(!baseModule\) \{/);
  assert.doesNotMatch(
    fabricComponent,
    /foundationVisibility <= LOD_PRESENTATION_EPSILON/,
  );
  assert.doesNotMatch(fabricComponent, /activeLod|useCloseFoundation/);
  assert.match(
    fabricComponent,
    /Math\.max\(\s*overviewVisibility,\s*siteVisibility,\s*closeVisibility,\s*\)/,
  );
  assert.match(fabricComponent, /data-neighborhood-foundation-visibility=/);
  assert.match(fabricComponent, /data-neighborhood-visual-ready=/);
  assert.match(fabricComponent, /onVisualReadyChange\(baseReady\)/);
  assert.match(fabricComponent, /shouldRenderSite && siteModule/);
  assert.match(fabricComponent, /shouldRenderClose \? closeModules\.map/);
  assert.match(
    fabricComponent,
    /data-neighborhood-refinement-contract=\{KAIZEN_NEIGHBORHOOD_DETAIL_CONTRACT\}/,
  );
  assert.match(fabricComponent, /shouldRenderClose/);
  assert.doesNotMatch(fabricComponent, /Pedestrian|person|people/i);
});

test("Kaizen semantic buildings use registered shared transparent assets", async () => {
  const [manifest, baseManifest, authoringManifest] = await Promise.all([
    readJson(
      "public/career-world/cities/kaizen-agent/manifests/"
        + "hero-buildings-runtime-r1.json",
    ),
    readJson(
      "public/career-world/cities/kaizen-agent/manifests/base-runtime-r1.json",
    ),
    readJson(
      "scripts/assets/kaizen-city-rebuild/manifests/"
        + "hero-assets-authoring-r2.json",
    ),
  ]);

  assert.equal(manifest.schemaVersion, 1);
  assert.equal(
    manifest.id,
    "career-world/kaizen-agent/hero-buildings-runtime@r1",
  );
  assert.equal(manifest.registrationRef, baseManifest.registration);
  assert.equal(KAIZEN_SEMANTIC_ASSET_REGISTRATION, "kaizen-city-layout@r2");
  assert.equal(authoringManifest.registrationRef, manifest.registrationRef);
  assert.ok(manifest.assets.every((asset) => !("source" in asset)));
  assert.ok(authoringManifest.assets.every(({ source }) => (
    source.startsWith("/scripts/assets/kaizen-city-rebuild/hero-assets-r2/")
  )));
  assert.equal(KAIZEN_SEMANTIC_STRUCTURE_ASSETS.length, 4);
  assert.deepEqual(
    new Set(KAIZEN_SEMANTIC_STRUCTURE_ASSETS.map(({ id }) => id)),
    new Set([
      "project-kaizen-agent",
      "data-contracts",
      "safe-writes",
      "protocol-gateway",
    ]),
  );

  const plateOrigin = [
    baseManifest.plate.anchor[0] - baseManifest.plate.span[0] * 0.5,
    baseManifest.plate.anchor[1]
      - baseManifest.plate.span[1] * baseManifest.plate.alignmentY,
  ];
  const approximatelyEqual = (actual, expected, message) => {
    assert.ok(
      Math.abs(actual - expected) < 1e-12,
      `${message}: expected ${expected}, received ${actual}`,
    );
  };
  const alphaMasks = [];

  for (const asset of KAIZEN_SEMANTIC_STRUCTURE_ASSETS) {
    const registration = manifest.assets.find(({ id }) => id === asset.id);
    assert.ok(registration, asset.id);
    assert.match(
      asset.assetPath,
      /\/career-world\/cities\/kaizen-agent\/layers\/hero-buildings\/.*-hero-r1\.png$/,
    );
    assert.equal(asset.grounding, "asset-owned");
    assert.equal(asset.registration, KAIZEN_SEMANTIC_ASSET_REGISTRATION);
    assert.deepEqual(
      asset.registrationDimensions,
      registration.registrationDimensions,
    );
    assert.deepEqual(asset.groundAnchor, registration.sourceGroundAnchor);
    assert.ok(asset.cropOrigin[0] > 0, `${asset.id} registered crop x`);
    assert.ok(asset.cropOrigin[1] > 0, `${asset.id} registered crop y`);
    assert.ok(
      asset.cropOrigin[0] + asset.registrationDimensions[0]
        <= baseManifest.plate.dimensions[0],
      `${asset.id} registered crop width`,
    );
    assert.ok(
      asset.cropOrigin[1] + asset.registrationDimensions[1]
        <= baseManifest.plate.dimensions[1],
      `${asset.id} registered crop height`,
    );
    assert.ok(
      asset.registrationDimensions[0]
        < baseManifest.plate.dimensions[0],
      `${asset.id} must not remain a full-plate cutout`,
    );

    // A semantic PNG owns the complete registered crop. Its rendered image
    // rectangle must therefore start at cropOrigin regardless of transparent
    // padding or the asset-specific alpha-ground anchor.
    const renderedTopLeft = [
      asset.territoryAnchor[0]
        - asset.groundAnchor[0] * asset.footprintSpan[0],
      asset.territoryAnchor[1]
        - asset.groundAnchor[1] * asset.footprintSpan[1],
    ];
    const registeredTopLeft = [
      plateOrigin[0]
        + registration.cropOrigin[0]
          / baseManifest.plate.dimensions[0]
          * baseManifest.plate.span[0],
      plateOrigin[1]
        + registration.cropOrigin[1]
          / baseManifest.plate.dimensions[1]
          * baseManifest.plate.span[1],
    ];
    approximatelyEqual(
      renderedTopLeft[0],
      registeredTopLeft[0],
      `${asset.id} registered x origin`,
    );
    approximatelyEqual(
      renderedTopLeft[1],
      registeredTopLeft[1],
      `${asset.id} registered y origin`,
    );
    assert.ok(asset.sourceDimensions[0] >= 1_000, asset.id);
    assert.ok(asset.sourceDimensions[1] >= 1_000, asset.id);
    assert.ok(asset.interactionHull.length >= 3, asset.id);
    for (const [x, y] of asset.interactionHull) {
      assert.ok(x >= 0 && x <= asset.sourceDimensions[0], asset.id);
      assert.ok(y >= 0 && y <= asset.sourceDimensions[1], asset.id);
    }
    const { data, info } = await sharp(publicFile(asset.assetPath))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const metadata = await sharp(publicFile(asset.assetPath)).metadata();
    const stats = await sharp(publicFile(asset.assetPath)).stats();
    assert.deepEqual(
      [metadata.width, metadata.height],
      asset.sourceDimensions,
      asset.id,
    );
    assert.equal(metadata.hasAlpha, true, asset.id);
    assert.equal(stats.channels[3].min, 0, asset.id);
    assert.equal(stats.channels[3].max, 255, asset.id);

    let visiblePixels = 0;
    let alphaLeft = info.width;
    let alphaTop = info.height;
    let alphaRight = -1;
    let alphaBottom = -1;
    for (let y = 0; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        if (data[(y * info.width + x) * info.channels + 3] <= 32) {
          continue;
        }
        visiblePixels += 1;
        alphaLeft = Math.min(alphaLeft, x);
        alphaTop = Math.min(alphaTop, y);
        alphaRight = Math.max(alphaRight, x);
        alphaBottom = Math.max(alphaBottom, y);
      }
    }
    const visibleRatio = visiblePixels / (info.width * info.height);
    assert.ok(
      visibleRatio >= 0.3 && visibleRatio <= 0.75,
      `${asset.id} alpha coverage ${visibleRatio}`,
    );
    const hullXs = asset.interactionHull.map(([x]) => x);
    const hullYs = asset.interactionHull.map(([, y]) => y);
    assert.ok(alphaLeft >= Math.min(...hullXs) - 4, asset.id);
    assert.ok(alphaTop >= Math.min(...hullYs) - 4, asset.id);
    assert.ok(alphaRight <= Math.max(...hullXs) + 4, asset.id);
    assert.ok(alphaBottom <= Math.max(...hullYs) + 4, asset.id);
    const registeredAlpha = await sharp(publicFile(asset.assetPath))
      .resize(
        registration.registrationDimensions[0],
        registration.registrationDimensions[1],
        { fit: "fill", kernel: "lanczos3" },
      )
      .ensureAlpha()
      .extractChannel(3)
      .raw()
      .toBuffer();
    const plateAlpha = Buffer.alloc(
      baseManifest.plate.dimensions[0]
        * baseManifest.plate.dimensions[1],
    );
    for (let y = 0; y < registration.registrationDimensions[1]; y += 1) {
      const sourceOffset = y * registration.registrationDimensions[0];
      const targetOffset = (
        (registration.cropOrigin[1] + y)
          * baseManifest.plate.dimensions[0]
        + registration.cropOrigin[0]
      );
      registeredAlpha.copy(
        plateAlpha,
        targetOffset,
        sourceOffset,
        sourceOffset + registration.registrationDimensions[0],
      );
    }
    alphaMasks.push({ data: plateAlpha, id: asset.id });

    const alphaAt = (x, y) => data[(y * info.width + x) * info.channels + 3];
    for (let x = 0; x < info.width; x += 1) {
      assert.equal(alphaAt(x, 0), 0, `${asset.id} top crop edge`);
      assert.equal(
        alphaAt(x, info.height - 1),
        0,
        `${asset.id} bottom crop edge`,
      );
    }
    for (let y = 0; y < info.height; y += 1) {
      assert.equal(alphaAt(0, y), 0, `${asset.id} left crop edge`);
      assert.equal(
        alphaAt(info.width - 1, y),
        0,
        `${asset.id} right crop edge`,
      );
    }
  }

  for (let leftIndex = 0; leftIndex < alphaMasks.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < alphaMasks.length;
      rightIndex += 1
    ) {
      const left = alphaMasks[leftIndex];
      const right = alphaMasks[rightIndex];
      let overlap = 0;
      for (let pixel = 0; pixel < left.data.length; pixel += 1) {
        const leftAlpha = left.data[pixel];
        const rightAlpha = right.data[pixel];
        overlap += leftAlpha > 32 && rightAlpha > 32 ? 1 : 0;
      }
      assert.ok(
        overlap <= 8,
        `${left.id} and ${right.id} alpha overlap (${overlap}px)`,
      );
    }
  }

  for (const { source } of authoringManifest.assets) {
    const metadata = await sharp(path.join(root, source.slice(1))).metadata();
    assert.ok(metadata.width > 0 && metadata.height > 0, source);
  }

  assert.equal(
    resolveKaizenSemanticStructureAsset({
      ownerId: "project-kaizen-agent",
      role: "project",
      visualId: "project-kaizen-agent",
    })?.id,
    "project-kaizen-agent",
  );
  assert.equal(
    resolveKaizenSemanticStructureAsset({
      ownerId: "project-kaizen-agent",
      role: "skill",
      visualId: "safe-writes",
    })?.id,
    "safe-writes",
  );
  assert.equal(
    resolveKaizenSemanticStructureAsset({
      ownerId: "project-unknown",
      role: "skill",
      visualId: "safe-writes",
    }),
    undefined,
  );
});

test("Kaizen runtime LODs remain registered to one high-detail master", async () => {
  const sampleSize = 256;
  const masterPath = publicFile(KAIZEN_NEIGHBORHOOD_SITE_FOUNDATION_SRC);
  const masterMetadata = await sharp(masterPath).metadata();
  assert.deepEqual(
    [masterMetadata.width, masterMetadata.height],
    KAIZEN_NEIGHBORHOOD_SITE_DIMENSIONS,
  );
  const master = await sharp(masterPath)
    .resize(sampleSize, sampleSize, { kernel: "lanczos3" })
    .ensureAlpha()
    .raw()
    .toBuffer();
  const closeModules = KAIZEN_NEIGHBORHOOD_MODULES.filter(
    ({ lod }) => lod === "close",
  );
  const closeGrid = await sharp({
    create: {
      background: { alpha: 0, b: 0, g: 0, r: 0 },
      channels: 4,
      height: KAIZEN_NEIGHBORHOOD_CLOSE_DIMENSIONS[1],
      width: KAIZEN_NEIGHBORHOOD_CLOSE_DIMENSIONS[0],
    },
  })
    .composite(closeModules.map((module) => ({
      input: publicFile(module.assetPath),
      left: module.gridColumn * KAIZEN_NEIGHBORHOOD_CLOSE_TILE_DIMENSIONS[0],
      top: module.gridRow * KAIZEN_NEIGHBORHOOD_CLOSE_TILE_DIMENSIONS[1],
    })))
    .png()
    .toBuffer();
  const candidates = new Map([
    ["base", sharp(publicFile(KAIZEN_NEIGHBORHOOD_FOUNDATION_SRC))],
    ["site", sharp(masterPath)],
    ["close-grid", sharp(closeGrid)],
  ]);

  for (const [label, pipeline] of candidates) {
    const candidate = await pipeline
      .resize(sampleSize, sampleSize, { kernel: "lanczos3" })
      .ensureAlpha()
      .raw()
      .toBuffer();
    let visibleReferencePixels = 0;
    let visibleIntersectionPixels = 0;
    let rgbDifference = 0;
    let rgbSamples = 0;
    for (let offset = 0; offset < master.length; offset += 4) {
      const referenceVisible = master[offset + 3] > 32;
      const candidateVisible = candidate[offset + 3] > 32;
      visibleReferencePixels += referenceVisible ? 1 : 0;
      visibleIntersectionPixels += referenceVisible && candidateVisible ? 1 : 0;
      if (!referenceVisible || !candidateVisible) {
        continue;
      }
      for (let channel = 0; channel < 3; channel += 1) {
        rgbDifference += Math.abs(
          master[offset + channel] - candidate[offset + channel],
        );
        rgbSamples += 1;
      }
    }
    assert.ok(visibleReferencePixels > 0, label);
    assert.ok(
      visibleIntersectionPixels / visibleReferencePixels >= 0.995,
      `${label} must preserve the master alpha registration`,
    );
    assert.ok(
      rgbDifference / rgbSamples < 20,
      `${label} must remain a visual derivative of the master`,
    );
  }
});
