import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("career-world", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/?employer=not-real&project=not-real", {
      headers: { accept: "text/html" },
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the bounded Career World tracer without retired media", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Career World/);
  assert.match(html, /Illustrative world .* entertainment, not measured outcomes\./);
  for (const employer of [
    "NinjaOne",
    "Tanium",
    "Independent",
    "ACE Hardware",
    "Column Technologies",
  ]) {
    assert.match(html, new RegExp(employer));
  }
  assert.doesNotMatch(html, /data-project-control=/);
  assert.doesNotMatch(html, /data-project-control="tanium-risk-assessment"/);
  assert.match(html, /Choose an employer city to reveal its project and skill buildings\./);
  assert.match(html, /steven-doris-resume\.pdf/);
  assert.match(html, /steven-doris-resume\.docx/);
  assert.doesNotMatch(html, /<video|autoplay|system-tour|ProjectMediaStage/i);
});

test("keeps the full canonical registry, evidence holds, and frozen tracer coordinates stable", async (t) => {
  const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  t.after(() => vite.close());
  const registry = await vite.ssrLoadModule("/features/career-world/model/world-registry.ts");
  const manifest = JSON.parse(await readFile(new URL("../docs/career-world-production/concept-briefs.json", import.meta.url), "utf8"));

  assert.deepEqual(registry.validateCareerWorldRegistry(), []);
  assert.deepEqual(registry.careerWorldRegistry.bounds, { width: 1600, height: 900 });
  assert.equal(registry.careerWorldRegistry.assets.length, 56);
  assert.equal(registry.careerWorldRegistry.employers.length, 5);
  assert.equal(registry.careerWorldRegistry.projects.length, 16);
  assert.equal(registry.careerWorldRegistry.instances.length, 58);
  assert.equal(registry.careerWorldRegistry.assets.filter((asset) => asset.category === "skill").length, 27);
  assert.equal(registry.careerWorldRegistry.projectSkillLinks.length, 53);
  assert.equal(registry.careerWorldRegistry.instances.filter((instance) => instance.kind === "skill").length, 37);
  assert.deepEqual(
    Object.fromEntries(["world", "city", "project", "skill", "ambient"].map((category) => [category, registry.careerWorldRegistry.assets.filter((asset) => asset.category === category).length])),
    { world: 1, city: 5, project: 16, skill: 27, ambient: 7 },
  );
  assert.deepEqual(
    Object.fromEntries(["evidence-backed", "identity-only", "employer-supported-unlinked", "user-required-unplaced", "ambient"].map((status) => [status, registry.careerWorldRegistry.assets.filter((asset) => asset.evidenceStatus === status).length])),
    { "evidence-backed": 38, "identity-only": 6, "employer-supported-unlinked": 3, "user-required-unplaced": 1, ambient: 8 },
  );
  assert.deepEqual(
    registry.careerWorldRegistry.assets.map((asset) => [asset.id, asset.category, asset.evidenceStatus]).sort(),
    manifest.assets.map(({ id, category, evidence_status }) => [id, category, evidence_status]).sort(),
  );
  assert.deepEqual(registry.ACCEPTED_EMPLOYER_ANCHOR_TUPLES, [
    ["ninjaone", 552, 302],
    ["tanium", 855, 280],
    ["independent", 1176, 298],
    ["ace-hardware", 456, 688],
    ["column-technologies", 1196, 712],
  ]);
  assert.deepEqual(registry.ACCEPTED_NINJAONE_LOCAL_COORDINATE_TUPLES, [
    ["instance/ninjaone/capital/01", 420, 500],
    ["instance/ninjaone/project/kaizen-agent-platform/01", 620, 245],
    ["instance/ninjaone/project/vendy-vm-platform/01", 780, 500],
    ["instance/ninjaone/project/engineering-metrics-pipeline/01", 600, 760],
    ["instance/ninjaone/skill/go/01", 825, 700],
  ]);
  const capitals = registry.careerWorldRegistry.instances.filter((instance) => instance.kind === "capital");
  assert.equal(capitals.length, 5);
  assert.deepEqual(
    capitals.map((instance) => [instance.id, instance.assetId, instance.employerId, instance.localPosition, instance.worldPosition]),
    [
      ["instance/ninjaone/capital/01", "city/ninjaone@v1", "ninjaone", { x: 420, y: 500 }, { x: 528.08, y: 298.88 }],
      ["instance/tanium/capital/01", "city/tanium@v1", "tanium", null, null],
      ["instance/independent/capital/01", "city/independent@v1", "independent", null, null],
      ["instance/ace-hardware/capital/01", "city/ace-hardware@v1", "ace-hardware", null, null],
      ["instance/column-technologies/capital/01", "city/column-technologies@v1", "column-technologies", null, null],
    ],
  );
  for (const employer of registry.careerWorldRegistry.employers) {
    const employerCapitals = capitals.filter((instance) => instance.employerId === employer.id);
    assert.equal(employerCapitals.length, 1);
    assert.equal(employerCapitals[0].assetId, employer.assetId);
    assert.equal(registry.careerWorldRegistry.assets.find((asset) => asset.id === employerCapitals[0].assetId).category, "city");
  }
  assert.equal(registry.careerWorldRegistry.instances.some((instance) => instance.kind === "city"), false);
  const cityAssetIds = new Set(registry.careerWorldRegistry.assets.filter((asset) => asset.category === "city").map((asset) => asset.id));
  assert.equal(registry.careerWorldRegistry.instances.some((instance) => cityAssetIds.has(instance.assetId) && instance.worldPosition && registry.careerWorldRegistry.employers.some((employer) => instance.worldPosition.x === employer.anchor.x && instance.worldPosition.y === employer.anchor.y)), false);
  assert.deepEqual(
    registry.careerWorldRegistry.projects.map((project) => [project.id, project.employerId, project.assetId, project.evidenceStatus, project.evidenceTraceId]),
    [
      ["kaizen-agent-platform", "ninjaone", "project/kaizen-agent-platform@v1", "evidence-backed", "governed-agent-tooling"],
      ["vendy-vm-platform", "ninjaone", "project/vendy-vm-platform@v1", "evidence-backed", "cross-provider-orchestration"],
      ["engineering-metrics-pipeline", "ninjaone", "project/kaizen-metrics@v1", "evidence-backed", "engineering-metrics-pipeline"],
      ["tanium-risk-assessment", "tanium", "project/tanium-risk-assessment@v1", "evidence-backed", "tanium-risk-assessment"],
      ["uat-automation", "tanium", "project/uat-automation@v1", "evidence-backed", "uat-automation"],
      ["cablecar", "tanium", "project/cablecar@v1", "evidence-backed", "cablecar"],
      ["xsearch", "tanium", "project/xsearch@v1", "evidence-backed", "xsearch-extension"],
      ["tmatch-eolmatch", "tanium", "project/tmatch-eolmatch@v1", "evidence-backed", "tmatch-eolmatch"],
      ["contextforge", "independent", "project/contextforge@v1", "evidence-backed", "bounded-agent-context"],
      ["career-world-portfolio", "independent", "project/career-world-portfolio@v1", "evidence-backed", "evidence-atlas"],
      ["ticket-validation-automation", "ace-hardware", "project/ticket-validation-automation@v1", "identity-only", null],
      ["sap-table-update-integration", "ace-hardware", "project/sap-table-update-integration@v1", "identity-only", null],
      ["qc-alm-extractor", "ace-hardware", "project/qc-alm-extractor@v1", "identity-only", null],
      ["atlassian-platform-automation", "column-technologies", "project/atlassian-platform-automation@v1", "identity-only", null],
      ["atlassian-data-center-resilience", "column-technologies", "project/atlassian-data-center-resilience@v1", "identity-only", null],
      ["client-devops-delivery-implementations", "column-technologies", "project/client-devops-delivery-implementations@v1", "identity-only", null],
    ],
  );
  const expectedMatrix = {
    "kaizen-agent-platform": ["safe-writes", "data-contracts", "go", "redis", "mcp", "openapi"],
    "vendy-vm-platform": ["workflow-orchestration", "operator-control", "data-contracts", "go", "react", "aws", "postgresql", "vmware", "macstadium"],
    "engineering-metrics-pipeline": ["python", "databricks", "workflow-orchestration", "data-contracts", "go", "postgresql", "docker", "ai", "aws"],
    "tanium-risk-assessment": ["python", "go", "workflow-orchestration", "operator-control", "data-contracts"],
    "uat-automation": ["csharp", "localdb", "operator-control", "workflow-orchestration", "data-contracts"],
    cablecar: ["react", "electron", "workflow-orchestration", "operator-control", "data-contracts"],
    xsearch: ["manifest-v3", "data-contracts", "workflow-orchestration", "operator-control"],
    "tmatch-eolmatch": ["go", "data-contracts"],
    contextforge: ["context-compression", "workflow-orchestration", "data-contracts", "typescript"],
    "career-world-portfolio": ["react", "typescript", "operator-control", "data-contracts"],
  };
  const actualMatrix = Object.fromEntries(registry.careerWorldRegistry.projects.map((project) => [project.id, registry.careerWorldRegistry.projectSkillLinks.filter((link) => link.projectId === project.id).map((link) => registry.instanceById.get(link.skillInstanceId).assetId.match(/^skill\/(.+)@v1$/)[1]) ]));
  assert.deepEqual(Object.fromEntries(Object.entries(actualMatrix).filter(([, skills]) => skills.length)), expectedMatrix);
  assert.deepEqual(registry.careerWorldRegistry.projects.filter((project) => project.evidenceStatus === "identity-only").map((project) => [project.id, project.evidenceTraceId, actualMatrix[project.id]]), [
    ["ticket-validation-automation", null, []], ["sap-table-update-integration", null, []], ["qc-alm-extractor", null, []], ["atlassian-platform-automation", null, []], ["atlassian-data-center-resilience", null, []], ["client-devops-delivery-implementations", null, []],
  ]);
  const skillPlacementKeys = registry.careerWorldRegistry.instances.filter((instance) => instance.kind === "skill").map((instance) => `${instance.employerId}:${instance.assetId}`);
  assert.equal(new Set(skillPlacementKeys).size, skillPlacementKeys.length);
  assert.deepEqual(Object.fromEntries(registry.careerWorldRegistry.employers.map((employer) => [employer.id, registry.careerWorldRegistry.instances.filter((instance) => instance.kind === "skill" && instance.employerId === employer.id).length])), { ninjaone: 17, tanium: 10, independent: 6, "ace-hardware": 1, "column-technologies": 3 });
  assert.ok(
    registry.careerWorldRegistry.projectSkillLinks.every((link) => {
      const project = registry.projectById.get(link.projectId);
      const skill = registry.instanceById.get(link.skillInstanceId);
      return project && skill && project.employerId === skill.employerId && skill.kind === "skill";
    }),
  );
  assert.equal(registry.careerWorldRegistry.instances.some((instance) => instance.assetId === "skill/java@v1"), false);
  assert.equal(registry.careerWorldRegistry.projectSkillLinks.some((link) => registry.instanceById.get(link.skillInstanceId).assetId === "skill/java@v1"), false);
  for (const assetId of ["skill/informatica@v1", "skill/atlassian@v1", "skill/ci-cd@v1", "skill/docker@v1"]) {
    const instance = registry.careerWorldRegistry.instances.find((candidate) => candidate.assetId === assetId && ["ace-hardware", "column-technologies"].includes(candidate.employerId));
    assert.ok(instance);
    assert.equal(registry.careerWorldRegistry.projectSkillLinks.some((link) => link.skillInstanceId === instance.id), false);
  }
  assert.equal(registry.careerWorldRegistry.instances.filter((instance) => instance.kind === "project" && instance.localPosition === null && instance.worldPosition === null).length, 13);
  assert.deepEqual(registry.positionedNavigableProjects.map((project) => project.id), ["kaizen-agent-platform", "vendy-vm-platform", "engineering-metrics-pipeline"]);
  assert.deepEqual(registry.careerWorldRegistry.instances.filter((instance) => instance.localPosition !== null).map((instance) => [instance.id, instance.localPosition.x, instance.localPosition.y]), registry.ACCEPTED_NINJAONE_LOCAL_COORDINATE_TUPLES);
  const cloneRegistry = () => JSON.parse(JSON.stringify(registry.careerWorldRegistry));
  const validationText = (candidate) => registry.validateCareerWorldRegistry(candidate).join("\n");
  const duplicateAsset = cloneRegistry(); duplicateAsset.assets.push(duplicateAsset.assets[0]); assert.match(validationText(duplicateAsset), /duplicate asset/);
  const mismatchedProject = cloneRegistry(); mismatchedProject.projects[0].employerId = "tanium"; assert.match(validationText(mismatchedProject), /mismatched project instance/);
  const duplicateInstance = cloneRegistry(); duplicateInstance.instances.push(duplicateInstance.instances[0]); assert.match(validationText(duplicateInstance), /duplicate instance/);
  const duplicateSkill = cloneRegistry(); const go = duplicateSkill.instances.find((instance) => instance.id === "instance/ninjaone/skill/go/01"); duplicateSkill.instances.push({ ...go, id: "instance/ninjaone/skill/go/duplicate" }); assert.match(validationText(duplicateSkill), /duplicate employer skill/);
  const missingCapital = cloneRegistry(); missingCapital.instances = missingCapital.instances.filter((instance) => instance.id !== "instance/tanium/capital/01"); assert.match(validationText(missingCapital), /capital instance count tanium/);
  const duplicateCapital = cloneRegistry(); const taniumCapital = duplicateCapital.instances.find((instance) => instance.id === "instance/tanium/capital/01"); duplicateCapital.instances.push({ ...taniumCapital, id: "instance/tanium/capital/duplicate" }); assert.match(validationText(duplicateCapital), /capital instance count tanium/);
  const mismatchedCapitalAsset = cloneRegistry(); mismatchedCapitalAsset.instances.find((instance) => instance.id === "instance/tanium/capital/01").assetId = "project/tanium-risk-assessment@v1"; const mismatchedCapitalText = validationText(mismatchedCapitalAsset); assert.match(mismatchedCapitalText, /mismatched employer capital tanium/); assert.match(mismatchedCapitalText, /mismatched capital asset tanium/);
  const duplicateCityIdentity = cloneRegistry(); duplicateCityIdentity.instances.push({ id: "instance/tanium/project/city-duplicate/01", assetId: "city/tanium@v1", kind: "project", employerId: "tanium", localPosition: null, worldPosition: null }); assert.match(validationText(duplicateCityIdentity), /city asset on non-capital instance instance\/tanium\/project\/city-duplicate\/01/);
  const legacyCity = cloneRegistry(); legacyCity.instances.push({ id: "instance/tanium/city/legacy", assetId: "city/tanium@v1", kind: "city", employerId: "tanium", localPosition: null, worldPosition: { x: 855, y: 280 } }); const legacyCityText = validationText(legacyCity); assert.match(legacyCityText, /unknown instance kind instance\/tanium\/city\/legacy/); assert.match(legacyCityText, /city asset at employer anchor instance\/tanium\/city\/legacy/);
  const danglingLink = cloneRegistry(); danglingLink.projectSkillLinks.push({ projectId: "kaizen-agent-platform", skillInstanceId: "instance/ninjaone/skill/missing/01" }); assert.match(validationText(danglingLink), /unknown skill link/);
  const duplicateLink = cloneRegistry(); duplicateLink.projectSkillLinks.push(duplicateLink.projectSkillLinks[0]); assert.match(validationText(duplicateLink), /duplicate project skill link/);
  assert.equal(new Set(registry.registryIdentityTuples.map((tuple) => tuple.join("|"))).size, registry.registryIdentityTuples.length);
  assert.ok(Object.isFrozen(registry.careerWorldRegistry));
});

test("assembles every canonical 2.5D asset into one stable 58-instance scene map", async (t) => {
  const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  t.after(() => vite.close());
  const [registry, geometry, composition] = await Promise.all([
    vite.ssrLoadModule("/features/career-world/model/world-registry.ts"),
    vite.ssrLoadModule("/features/career-world/definitions/geometry-registry.ts"),
    vite.ssrLoadModule("/features/career-world/model/scene-composition.ts"),
  ]);

  assert.equal(geometry.CAREER_WORLD_GEOMETRY_DEFINITIONS.length, 56);
  assert.equal(geometry.geometryDefinitionByAssetId.size, 56);
  assert.deepEqual(
    [...geometry.geometryDefinitionByAssetId.keys()].sort(),
    registry.careerWorldRegistry.assets.map((asset) => asset.id).sort(),
  );
  assert.equal(composition.scenePlacements.length, 58);
  assert.equal(composition.scenePlacementByInstanceId.size, 58);
  assert.equal(composition.projectScenePlacementByProjectId.size, 16);
  assert.equal(new Set(composition.scenePlacements.map((placement) => placement.instanceId)).size, 58);

  for (const instance of registry.careerWorldRegistry.instances) {
    const placement = composition.scenePlacementByInstanceId.get(instance.id);
    assert.ok(placement, `missing scene placement for ${instance.id}`);
    assert.equal(placement.assetId, instance.assetId);
    assert.equal(placement.employerId, instance.employerId);
    assert.ok(Number.isFinite(placement.position.x));
    assert.ok(Number.isFinite(placement.position.y));
    assert.ok(placement.scale > 0);
  }

  const goInstances = composition.scenePlacements.filter(
    (placement) => placement.assetId === "skill/go@v1",
  );
  assert.ok(goInstances.length > 1);
  assert.equal(
    new Set(goInstances.map((placement) => geometry.geometryForAsset(placement.assetId).masterGeometryHash)).size,
    1,
  );
});

test("camera math preserves anchors and LOD does not mutate registry tuples", async (t) => {
  const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  t.after(() => vite.close());
  const [camera, registry] = await Promise.all([
    vite.ssrLoadModule("/features/career-world/rendering/world-camera.ts"),
    vite.ssrLoadModule("/features/career-world/model/world-registry.ts"),
  ]);
  const viewport = { width: 1600, height: 900 };
  const point = { x: 552, y: 302 };
  const screen = camera.worldToScreen(point, camera.WORLD_CAMERA, viewport);
  assert.deepEqual(camera.screenToWorld(screen, camera.WORLD_CAMERA, viewport), point);
  const anchor = { x: 1180, y: 650 };
  const before = camera.screenToWorld(anchor, camera.cameraForPoint(point, 2.5), viewport);
  const zoomed = camera.zoomCameraAt(camera.cameraForPoint(point, 2.5), anchor, 4.5, viewport);
  assert.deepEqual(camera.screenToWorld(anchor, zoomed, viewport), before);
  assert.deepEqual([camera.lodForZoom(1), camera.lodForZoom(2.5), camera.lodForZoom(4.5)], ["world", "city", "project"]);
  const identityBefore = JSON.stringify(registry.registryIdentityTuples);
  [1, 2.5, 4.5, 1].forEach((zoom) => camera.lodForZoom(zoom));
  assert.equal(JSON.stringify(registry.registryIdentityTuples), identityBefore);
});

test("keeps semantic LOD, camera bounds, and employer capitals stable", async (t) => {
  const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  t.after(() => vite.close());
  const [camera, registry, composition] = await Promise.all([
    vite.ssrLoadModule("/features/career-world/rendering/world-camera.ts"),
    vite.ssrLoadModule("/features/career-world/model/world-registry.ts"),
    vite.ssrLoadModule("/features/career-world/model/scene-composition.ts"),
  ]);

  for (const zoom of [-10, 1, 2, 4, 6, 20]) {
    assert.notEqual(camera.semanticLodForFocus(zoom, false, false), "project");
    assert.equal(camera.semanticLodForFocus(zoom, true, false), "city");
  }
  assert.equal(camera.semanticLodForFocus(6, true, false), "city");
  assert.equal(camera.semanticLodForFocus(1, false, true), "project");

  const viewport = {
    width: camera.WORLD_STAGE_WIDTH,
    height: camera.WORLD_STAGE_HEIGHT,
  };
  const assertCameraWithinStage = (actual, label) => {
    assert.ok(
      actual.zoom >= camera.MIN_WORLD_ZOOM &&
        actual.zoom <= camera.MAX_WORLD_ZOOM,
      `${label}: zoom ${actual.zoom} is outside the supported range`,
    );
    const halfWidth = viewport.width / (2 * actual.zoom);
    const halfHeight = viewport.height / (2 * actual.zoom);
    assert.ok(
      actual.center.x >= halfWidth &&
        actual.center.x <= viewport.width - halfWidth,
      `${label}: x center ${actual.center.x} exposes space outside the stage`,
    );
    assert.ok(
      actual.center.y >= halfHeight &&
        actual.center.y <= viewport.height - halfHeight,
      `${label}: y center ${actual.center.y} exposes space outside the stage`,
    );
  };

  const center = { x: viewport.width / 2, y: viewport.height / 2 };
  const boundedCameras = [
    ["constrain minimum", camera.constrainWorldCamera({ center: { x: -10_000, y: 10_000 }, zoom: -10 })],
    ["constrain maximum", camera.constrainWorldCamera({ center: { x: 10_000, y: -10_000 }, zoom: 20 })],
    ["cameraForPoint", camera.cameraForPoint({ x: -5_000, y: 5_000 }, 3.25)],
    ["zoom top-left", camera.zoomCameraAt(camera.cameraForPoint(center, 2), { x: 0, y: 0 }, 6, viewport)],
    ["zoom bottom-right", camera.zoomCameraAt(camera.cameraForPoint(center, 2), { x: viewport.width, y: viewport.height }, 0.01, viewport)],
    ["pan positive", camera.panCameraByScreenDelta(camera.cameraForPoint(center, 6), { x: 100_000, y: 100_000 })],
    ["pan negative", camera.panCameraByScreenDelta(camera.cameraForPoint(center, 6), { x: -100_000, y: -100_000 })],
  ];
  for (const [label, actual] of boundedCameras) {
    assertCameraWithinStage(actual, label);
  }

  for (const employer of registry.careerWorldRegistry.employers) {
    const capitals = composition.scenePlacements.filter(
      (placement) =>
        placement.employerId === employer.id && placement.kind === "capital",
    );
    assert.equal(capitals.length, 1, `${employer.id} must have one capital`);
    assert.deepEqual(
      capitals[0].position,
      employer.anchor,
      `${employer.id} capital drifted from its employer anchor`,
    );
  }
});

test("freezes projection, primitive, palette, and canonical geometry identity contracts", async (t) => {
  const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  t.after(() => vite.close());
  const [types, projection, primitives, canonical, palettes] = await Promise.all([
    vite.ssrLoadModule("/features/career-world/geometry/types.ts"),
    vite.ssrLoadModule("/features/career-world/geometry/projection.ts"),
    vite.ssrLoadModule("/features/career-world/geometry/primitives.ts"),
    vite.ssrLoadModule("/features/career-world/geometry/canonical-payload.ts"),
    vite.ssrLoadModule("/features/career-world/geometry/palettes.ts"),
  ]);

  assert.deepEqual(projection.CAREER_WORLD_PROJECTION, {
    id: "cw-iso-225-45-35.264-r0-v1",
    type: "orthographic-true-isometric",
    cameraAzimuthDegreesFromNorth: 225,
    lookDirectionDegreesFromNorth: 45,
    elevationDegrees: 35.264,
    rollDegrees: 0,
    authoredRotationAllowed: false,
    north: "+Y projects upper-left",
    screenX: "(x-y)*0.8660254",
    screenY: "-(x+y)*0.5-z",
  });
  assert.deepEqual(projection.projectSpatialPoint({ x: 4, y: 2, z: 3 }), { x: 1.7321, y: -6 });
  assert.deepEqual(projection.projectSpatialPoint({ x: 0, y: 0, z: 0 }), { x: 0, y: 0 });
  assert.equal(projection.formatProjectionCoordinate(1.2), "1.2000");
  assert.throws(() => projection.projectSpatialPoint({ x: Number.NaN, y: 0, z: 0 }), /must be finite/);
  assert.throws(() => projection.roundProjectionCoordinate(Number.MAX_VALUE), /must be finite/);
  assert.deepEqual(types.DETAIL_TIERS, [0, 1, 2]);
  assert.deepEqual([types.isDetailTier(-1), types.isDetailTier(0), types.isDetailTier(2), types.isDetailTier(3)], [false, true, true, false]);
  assert.throws(() => types.assertDetailTier(3), /Expected detail tier/);

  assert.deepEqual(palettes.PALETTE_SLOTS, [
    "structure.base",
    "structure.shadow",
    "line.primary",
    "line.secondary",
    "accent.emissive",
    "accent.focus",
    "label.primary",
    "terrain.claim",
  ]);
  assert.deepEqual(Object.keys(palettes.CAREER_WORLD_PALETTES), [
    "ninjaone",
    "tanium",
    "independent",
    "ace-hardware",
    "column-technologies",
    "world-neutral",
    "ambient-neutral",
  ]);
  for (const palette of Object.values(palettes.CAREER_WORLD_PALETTES)) {
    assert.deepEqual(palettes.validatePalette(palette), []);
    assert.deepEqual(Object.keys(palette), palettes.PALETTE_SLOTS);
  }
  assert.deepEqual(palettes.validatePalette({ "structure.base": "#000000" }).length > 0, true);

  const plan = primitives.rectangularPlan(10, 8);
  const primaryPath = primitives.projectedPlanPath(plan);
  assert.equal(primaryPath, "M -0.8660 4.5000 L 7.7942 -0.5000 L 0.8660 -4.5000 L -7.7942 0.5000 Z");
  const definition = Object.freeze({
    assetId: "ambient/f0-test-fixture@v1",
    category: "ambient",
    geometryKey: "career-world/f0-test-fixture/master-v1",
    masterGeometryHash: `sha256:${"0".repeat(64)}`,
    primaryPathHash: `sha256:${"1".repeat(64)}`,
    primaryPath,
    footprint: Object.freeze({ width: 10, depth: 8 }),
    orientation: 0,
    projection: projection.CAREER_WORLD_PROJECTION.id,
    paletteSlots: palettes.PALETTE_SLOTS,
    primitives: Object.freeze([
      Object.freeze({ type: "surface", id: "base", path: primaryPath, fill: "terrain.claim", stroke: "line.primary", detailTier: 0 }),
      Object.freeze({ type: "extrusion", id: "mass", plan, height: 4, top: "structure.base", litSide: "line.secondary", shadowSide: "structure.shadow", stroke: "line.primary", detailTier: 0 }),
      Object.freeze({ type: "stroke", id: "detail", path: "M 0.0000 0.0000 L 1.0000 -1.0000", stroke: "accent.emissive", detailTier: 2 }),
    ]),
  });

  assert.deepEqual(canonical.validateGeometryDefinition(definition), []);
  assert.equal(
    canonical.serializeCanonicalGeometryPayload(definition),
    `["career-world-geometry/v1","ambient/f0-test-fixture@v1","ambient","career-world/f0-test-fixture/master-v1","cw-iso-225-45-35.264-r0-v1",0,[10,8],["structure.base","structure.shadow","line.primary","line.secondary","accent.emissive","accent.focus","label.primary","terrain.claim"],"${primaryPath}",[["surface","base","${primaryPath}","terrain.claim","line.primary",0],["extrusion","mass",[[-5,-4],[5,-4],[5,4],[-5,4]],4,"structure.base","line.secondary","structure.shadow","line.primary",0],["stroke","detail","M 0.0000 0.0000 L 1.0000 -1.0000","accent.emissive",2]]]`,
  );
  assert.equal(
    canonical.serializeCanonicalGeometryPayload(definition),
    canonical.serializeCanonicalGeometryPayload(definition),
  );
  const invalidTier = { ...definition, primitives: [{ ...definition.primitives[0], detailTier: 3 }] };
  assert.match(canonical.validateGeometryDefinition(invalidTier).join("\n"), /invalid detail tier/);
  assert.match(primitives.validateGeometryPrimitive({ type: "mesh", id: "future", detailTier: 0 }).join("\n"), /unknown primitive type mesh/);
  assert.match(primitives.validateGeometryPrimitive({ type: "extrusion", id: "line", plan: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }], height: 1, top: "structure.base", litSide: "line.secondary", shadowSide: "structure.shadow", stroke: "line.primary", detailTier: 0 }).join("\n"), /zero-area plan/);
  assert.match(primitives.validateGeometryPrimitive({ type: "extrusion", id: "repeat", plan: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }], height: 1, top: "structure.base", litSide: "line.secondary", shadowSide: "structure.shadow", stroke: "line.primary", detailTier: 0 }).join("\n"), /repeats a plan point/);
  assert.deepEqual(primitives.validateGeometryPrimitive({ ...definition.primitives[1], plan: [...definition.primitives[1].plan].reverse() }), []);
  assert.notEqual(
    palettes.applyPalette(palettes.CAREER_WORLD_PALETTES.ninjaone, "structure.base"),
    palettes.applyPalette(palettes.CAREER_WORLD_PALETTES.tanium, "structure.base"),
  );
});

test("server-renders every SVG primitive deterministically while palette and detail stay instance inputs", async (t) => {
  const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  t.after(() => vite.close());
  const [projection, primitives, palettes, renderer] = await Promise.all([
    vite.ssrLoadModule("/features/career-world/geometry/projection.ts"),
    vite.ssrLoadModule("/features/career-world/geometry/primitives.ts"),
    vite.ssrLoadModule("/features/career-world/geometry/palettes.ts"),
    vite.ssrLoadModule("/features/career-world/rendering/geometry-renderer.tsx"),
  ]);
  const plan = primitives.rectangularPlan(6, 4);
  const primaryPath = primitives.projectedPlanPath(plan);
  const definition = Object.freeze({
    assetId: "ambient/f0-render-fixture@v1",
    category: "ambient",
    geometryKey: "career-world/f0-render-fixture/master-v1",
    masterGeometryHash: `sha256:${"2".repeat(64)}`,
    primaryPathHash: `sha256:${"3".repeat(64)}`,
    primaryPath,
    footprint: Object.freeze({ width: 6, depth: 4 }),
    orientation: 0,
    projection: projection.CAREER_WORLD_PROJECTION.id,
    paletteSlots: palettes.PALETTE_SLOTS,
    primitives: Object.freeze([
      Object.freeze({ type: "surface", id: "surface", path: "M 0.0000 -1.0000 L 0.8660 -1.5000 L 0.0000 -2.0000 Z", fill: "accent.focus", detailTier: 1 }),
      Object.freeze({ type: "extrusion", id: "extrusion", plan, height: 3, top: "structure.base", litSide: "line.secondary", shadowSide: "structure.shadow", stroke: "line.primary", detailTier: 0 }),
      Object.freeze({ type: "stroke", id: "stroke", path: "M 0.0000 0.0000 L 1.0000 1.0000", stroke: "accent.emissive", detailTier: 2 }),
    ]),
  });
  const renderWith = (palette, visibleDetailTier = 0) => renderToStaticMarkup(createElement(renderer.GeometryRenderer, {
    definition,
    palette,
    visibleDetailTier,
  }));
  const ninjaOne = renderWith(palettes.CAREER_WORLD_PALETTES.ninjaone);
  const ninjaOneAgain = renderWith(palettes.CAREER_WORLD_PALETTES.ninjaone);
  const tanium = renderWith(palettes.CAREER_WORLD_PALETTES.tanium);
  const tierOne = renderWith(palettes.CAREER_WORLD_PALETTES.ninjaone, 1);
  const tierTwo = renderWith(palettes.CAREER_WORLD_PALETTES.ninjaone, 2);

  assert.equal(ninjaOne, ninjaOneAgain);
  for (const primitiveId of ["surface", "extrusion", "stroke"]) {
    assert.match(ninjaOne, new RegExp(`data-primitive-id="${primitiveId}"`));
  }
  assert.match(ninjaOne, /data-primitive-id="surface"[^>]*data-detail-visible="false"[^>]*visibility="hidden"/);
  assert.match(ninjaOne, /data-primitive-id="extrusion"[^>]*data-detail-visible="true"[^>]*visibility="visible"/);
  assert.match(ninjaOne, /data-primitive-id="stroke"[^>]*data-detail-visible="false"[^>]*visibility="hidden"/);
  assert.match(tierOne, /data-primitive-id="surface"[^>]*data-detail-visible="true"[^>]*visibility="visible"/);
  assert.match(tierOne, /data-primitive-id="stroke"[^>]*data-detail-visible="false"[^>]*visibility="hidden"/);
  assert.match(tierTwo, /data-primitive-id="stroke"[^>]*data-detail-visible="true"[^>]*visibility="visible"/);
  const primitiveIdentity = (markup) => [...markup.matchAll(/data-primitive-id="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(primitiveIdentity(ninjaOne), primitiveIdentity(tierOne));
  assert.deepEqual(primitiveIdentity(tierOne), primitiveIdentity(tierTwo));
  const primaryIdentity = (markup) => markup.match(/data-primary-path="true"[^>]*d="([^"]+)"/)[1];
  assert.equal(primaryIdentity(ninjaOne), primaryIdentity(tierOne));
  assert.equal(primaryIdentity(tierOne), primaryIdentity(tierTwo));
  assert.match(ninjaOne, /data-primary-path="true" data-detail-tier="0"/);
  assert.match(ninjaOne, /data-master-geometry-hash="sha256:2222222222222222222222222222222222222222222222222222222222222222"/);
  assert.match(ninjaOne, /#18343B/);
  assert.match(tanium, /#3A2722/);
  assert.notEqual(ninjaOne, tanium);
  assert.doesNotMatch(`${ninjaOne}\n${tanium}`, /<image|data:image|WebGL|canvas/i);
});

test("ships the complete approved art library through a bounded asset-backed 2.5D runtime", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL(
        "../public/career-world/art/runtime-art-manifest.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const scene = await readFile(
    new URL(
      "../features/career-world/components/world-scene.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.equal(manifest.schema_version, "career-world-runtime-art/v1");
  assert.equal(manifest.world_topology, "one-mainland-two-lower-islands");
  assert.equal(manifest.records.length, 56);
  assert.equal(
    new Set(manifest.records.map((record) => record.asset_id)).size,
    56,
  );
  assert.equal(
    new Set(manifest.records.map((record) => record.runtime_path)).size,
    56,
  );
  assert.deepEqual(
    Object.fromEntries(
      ["world", "city", "project", "skill", "ambient"].map((category) => [
        category,
        manifest.records.filter((record) =>
          record.asset_id.startsWith(`${category}/`),
        ).length,
      ]),
    ),
    { world: 1, city: 5, project: 16, skill: 27, ambient: 7 },
  );

  let totalRuntimeBytes = 0;
  for (const record of manifest.records) {
    assert.match(
      record.runtime_path,
      /^\/public\/career-world\/art\/(?:world|city|project|skill|ambient)\/[a-z0-9-]+\.webp$/,
    );
    const runtimeFile = await stat(
      new URL(`..${record.runtime_path}`, import.meta.url),
    );
    assert.equal(runtimeFile.isFile(), true, record.runtime_path);
    assert.equal(
      runtimeFile.size,
      record.output.bytes,
      `${record.runtime_path} byte receipt drifted`,
    );
    totalRuntimeBytes += runtimeFile.size;
  }
  assert.ok(
    totalRuntimeBytes < 5 * 1024 * 1024,
    `runtime art payload is ${totalRuntimeBytes} bytes`,
  );

  const recordById = new Map(
    manifest.records.map((record) => [record.asset_id, record]),
  );
  assert.deepEqual(
    {
      source_path: recordById.get("world/career-world@v1")?.source_path,
      source_role: recordById.get("world/career-world@v1")?.source_role,
    },
    {
      source_path:
        "design/career-world/concepts/tracer/world-career-world-v1.png",
      source_role: "approved-island-world-override",
    },
  );
  assert.deepEqual(
    {
      source_path: recordById.get("project/kaizen-metrics@v1")?.source_path,
      source_role: recordById.get("project/kaizen-metrics@v1")?.source_role,
    },
    {
      source_path:
        "design/career-world/concepts/tracer/project-kaizen-metrics-v1.png",
      source_role: "approved-kaizen-observatory-override",
    },
  );

  assert.match(scene, /<img\b/);
  assert.match(scene, /data-art-asset=/);
  assert.match(scene, /runtimeArtPath\(/);
  assert.doesNotMatch(
    scene,
    /GeometryRenderer|geometryForAsset|geometry-registry|from\s+["'][^"']*\/geometry\//,
  );
  assert.doesNotMatch(scene, /<animate(?:Motion|Transform)?\b|<filter\b|filter=|url\(#/i);
  assert.doesNotMatch(scene, /<canvas\b|WebGL|three|babylon/i);
});

test("keeps one fixed-envelope district mounted through city and project focus", async () => {
  const [scene, state] = await Promise.all([
    readFile(
      new URL(
        "../features/career-world/components/world-scene.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../features/career-world/hooks/use-career-world-state.ts",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);
  const sourceBetween = (source, startMarker, endMarker) => {
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker, start + startMarker.length);
    assert.notEqual(start, -1, `missing source marker: ${startMarker}`);
    assert.notEqual(end, -1, `missing source marker: ${endMarker}`);
    return source.slice(start, end);
  };

  assert.doesNotMatch(scene, /\bprojectSkillPositions?\b/);

  const envelopes = sourceBetween(
    scene,
    "const ART_ENVELOPES",
    "type ArtInstanceProps",
  );
  for (const kind of ["capital", "project", "skill"]) {
    assert.match(
      envelopes,
      new RegExp(
        `${kind}:\\s*Object\\.freeze\\(\\{\\s*width:\\s*\\d+,\\s*height:\\s*\\d+\\s*\\}\\)`,
      ),
      `${kind} must declare a fixed width and height`,
    );
  }

  const artInstance = sourceBetween(
    scene,
    "function ArtInstance",
    "export function WorldScene",
  );
  const artInstanceProps = sourceBetween(
    scene,
    "type ArtInstanceProps",
    "function ArtInstance",
  );
  assert.match(artInstance, /const\s+position\s*=\s*placement\.position\s*;/);
  assert.doesNotMatch(artInstanceProps, /^\s*position\??\s*:/m);
  const envelopeCalls = [...artInstance.matchAll(/artEnvelope\(([^)]*)\)/g)];
  assert.equal(envelopeCalls.length, 1);
  assert.equal(envelopeCalls[0][1].trim(), "placement.kind");
  assert.match(artInstance, /width:\s*envelope\.width/);
  assert.match(artInstance, /height:\s*envelope\.height/);

  assert.match(
    scene,
    /\{lod\s*!==\s*["']world["']\s*&&\s*activeEmployer\s*&&\s*\(/,
  );
  assert.equal(
    [...scene.matchAll(/<ArtInstance\b/g)].length,
    1,
    "world-scene must render one complete district, not a second project-only subset",
  );

  const pointerDown = sourceBetween(
    scene,
    "const handlePointerDown",
    "const handlePointerMove",
  );
  assert.match(
    pointerDown,
    /clearTimeout\(wheelCommitRef\.current\)[\s\S]*onCameraChangeRef\.current\(cameraRef\.current\)/,
    "pointer input must commit a pending wheel camera before cancelling its debounce",
  );
  const finishPointer = sourceBetween(
    scene,
    "const finishPointer",
    "const handleWheel",
  );
  assert.match(
    finishPointer,
    /event\.type\s*===\s*["']pointercancel["']\s*\?\s*false\s*:\s*drag\.moved/,
    "a cancelled drag must not swallow the next real click",
  );

  const openProject = sourceBetween(
    state,
    "const openProject",
    "const goBack",
  );
  assert.match(
    openProject,
    /applyFocus\(\{\s*kind:\s*["']project["'],\s*projectId\s*\},\s*camera\)/,
  );
});

test("uses registry-derived factual project drawers and preserves the modal-only contract", async (t) => {
  const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  t.after(() => vite.close());
  const [adapter, registry, evidenceData] = await Promise.all([
    vite.ssrLoadModule("/features/career-world/model/evidence-adapter.ts"),
    vite.ssrLoadModule("/features/career-world/model/world-registry.ts"),
    vite.ssrLoadModule("/features/evidence-atlas/model/evidence-data.ts"),
  ]);
  const expectedProjectTraces = [
    ["kaizen-agent-platform", "governed-agent-tooling"],
    ["vendy-vm-platform", "cross-provider-orchestration"],
    ["engineering-metrics-pipeline", "engineering-metrics-pipeline"],
    ["tanium-risk-assessment", "tanium-risk-assessment"],
    ["uat-automation", "uat-automation"],
    ["cablecar", "cablecar"],
    ["xsearch", "xsearch-extension"],
    ["tmatch-eolmatch", "tmatch-eolmatch"],
    ["contextforge", "bounded-agent-context"],
    ["career-world-portfolio", "evidence-atlas"],
  ];
  const expectedIdentityOnly = [
    "ticket-validation-automation",
    "sap-table-update-integration",
    "qc-alm-extractor",
    "atlassian-platform-automation",
    "atlassian-data-center-resilience",
    "client-devops-delivery-implementations",
  ];

  assert.deepEqual(
    registry.careerWorldRegistry.projects
      .filter((project) => project.evidenceStatus === "evidence-backed")
      .map((project) => [project.id, project.evidenceTraceId]),
    expectedProjectTraces,
  );
  assert.deepEqual([...evidenceData.traceById.keys()].sort(), expectedProjectTraces.map(([, traceId]) => traceId).sort());

  for (const [projectId, traceId] of expectedProjectTraces) {
    const evidence = adapter.getProjectEvidence(projectId);
    const expectedRecords = evidenceData.recordsForTrace(traceId);
    const expectedSkillAssets = registry.careerWorldRegistry.projectSkillLinks
      .filter((link) => link.projectId === projectId)
      .map((link) => registry.instanceById.get(link.skillInstanceId).assetId);

    assert.equal(evidence.careerProject, registry.projectById.get(projectId));
    assert.equal(evidence.trace, evidenceData.traceById.get(traceId));
    assert.equal(evidence.project, evidence.trace);
    assert.equal(adapter.isEvidenceEligibleProject(projectId), true);
    assert.deepEqual(evidence.records.map((record) => [record.id, record.source, record.evidenceClass]), expectedRecords.map((record) => [record.id, record.source, record.evidenceClass]));
    evidence.records.forEach((record, index) => assert.equal(record, expectedRecords[index]));
    assert.deepEqual(evidence.skillAssets.map((asset) => asset.id), expectedSkillAssets);
  }

  const metrics = adapter.getKaizenMetricsEvidence();
  assert.equal(metrics.trace.id, "engineering-metrics-pipeline");
  assert.equal(metrics.records.length, 5);
  assert.deepEqual(metrics.trace.nodeIds, ["python", "databricks", "workflow-orchestration", "data-contracts", "go", "postgresql", "docker"]);
  assert.deepEqual(metrics.skillAssets.map((asset) => asset.id), ["skill/python@v1", "skill/databricks@v1", "skill/workflow-orchestration@v1", "skill/data-contracts@v1", "skill/go@v1", "skill/postgresql@v1", "skill/docker@v1", "skill/ai@v1", "skill/aws@v1"]);

  for (const projectId of expectedIdentityOnly) {
    assert.equal(adapter.getProjectEvidence(projectId), null);
    assert.equal(adapter.isEvidenceEligibleProject(projectId), false);
    assert.equal(registry.careerWorldRegistry.projectSkillLinks.filter((link) => link.projectId === projectId).length, 0);
  }

  const [drawer, state, scene, hitTargets, styles] = await Promise.all([
    readFile(new URL("../features/career-world/components/project-drawer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/career-world/components/career-world.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/career-world/components/world-scene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/career-world/components/world-hit-targets.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/career-world/styles/career-world.css", import.meta.url), "utf8"),
  ]);
  assert.match(drawer, /role="dialog"/);
  assert.match(drawer, /aria-modal="true"/);
  assert.match(drawer, /event\.key === "Escape"/);
  assert.match(drawer, /document\.activeElement === titleRef\.current/);
  assert.match(drawer, /projectId: CareerProjectId/);
  assert.match(drawer, /getProjectEvidence\(projectId\)/);
  assert.match(drawer, /record\.source/);
  assert.match(drawer, /evidence\.records\.length > 0 && \(/);
  assert.doesNotMatch(drawer, /METRICS_SKILL_IDS/);
  assert.match(state, /setAttribute\("inert", ""\)/);
  assert.match(state, /data-project-control/);
  assert.match(state, /useRef<HTMLElement/);
  assert.match(state, /getClientRects\(\)\.length > 0/);
  assert.match(scene, /aria-hidden="true"/);
  assert.doesNotMatch(scene, /instance\.kind !== "city"/);
  assert.match(hitTargets, /target: HTMLElement/);
  assert.match(hitTargets, /onProject\(projectId, event\.currentTarget\)/);
  assert.match(hitTargets, /data-project-index-control/);
  assert.doesNotMatch(hitTargets, /document\.querySelector/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /\.career-world-app\[data-reduced-motion\]/);
  assert.doesNotMatch(`${drawer}\n${state}\n${scene}`, /WebGL|three|babylon|<video|autoplay/i);
});

test("keeps the immersive map mounted beneath accessible overlay controls", async () => {
  const [shell, styles] = await Promise.all([
    readFile(new URL("../features/career-world/components/career-world.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/career-world/styles/career-world.css", import.meta.url), "utf8"),
  ]);

  assert.match(shell, /career-world-navigation-region[\s\S]*<WorldHitTargets/);
  assert.match(shell, /career-world-canvas-region[\s\S]*<WorldScene/);
  assert.match(shell, /career-world-status-region[\s\S]*career-world-disclosure[\s\S]*career-world-camera-controls/);
  const navigationIndex = shell.indexOf('className="career-world-navigation-region"');
  const canvasIndex = shell.indexOf('className="career-world-canvas-region"');
  const statusIndex = shell.indexOf('className="career-world-status-region"');
  assert.ok(navigationIndex < canvasIndex && canvasIndex < statusIndex);
  assert.match(styles, /\.career-world-map\s*\{[^}]*position:\s*relative;/);
  assert.match(styles, /\.career-world-canvas-region\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;/);
  assert.match(styles, /\.career-world-navigation-region\s*\{[^}]*position:\s*absolute;/);
  assert.match(styles, /\.career-world-status-region\s*\{[^}]*position:\s*absolute;/);
  assert.match(styles, /@media \(max-width:\s*720px\)[\s\S]*\.career-world-navigation-region\s*\{/);
  assert.match(styles, /\.career-world-scene\s*\{[^}]*touch-action:\s*none;/);
});

test("drawer eligibility and dismissal preserve focus, camera, and registry identity", async (t) => {
  const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  t.after(() => vite.close());
  const [state, registry] = await Promise.all([
    vite.ssrLoadModule("/features/career-world/hooks/use-career-world-state.ts"),
    vite.ssrLoadModule("/features/career-world/model/world-registry.ts"),
  ]);
  const metricsFocus = state.resolveCareerWorldUrlState(
    "?employer=ninjaone&project=engineering-metrics-pipeline",
  );
  const agentFocus = state.resolveCareerWorldUrlState(
    "?employer=ninjaone&project=kaizen-agent-platform",
  );
  const vendyFocus = state.resolveCareerWorldUrlState(
    "?employer=ninjaone&project=vendy-vm-platform",
  );
  const pendingProjectFocus = state.resolveCareerWorldUrlState(
    "?employer=tanium&project=tanium-risk-assessment",
  );
  assert.deepEqual(pendingProjectFocus, { kind: "project", projectId: "tanium-risk-assessment" });
  const before = JSON.stringify({
    focus: metricsFocus,
    camera: state.cameraForFocus(metricsFocus),
    tuples: registry.registryIdentityTuples,
  });
  for (const [focus, projectId] of [
    [agentFocus, "kaizen-agent-platform"],
    [vendyFocus, "vendy-vm-platform"],
    [metricsFocus, "engineering-metrics-pipeline"],
    [pendingProjectFocus, "tanium-risk-assessment"],
  ]) {
    assert.equal(state.drawerProjectForFocus(focus, null), projectId);
    assert.equal(state.drawerProjectForFocus(focus, projectId), null);
  }
  assert.equal(
    state.drawerProjectForFocus({ kind: "project", projectId: "ticket-validation-automation" }, null),
    null,
  );
  assert.equal(
    JSON.stringify({
      focus: metricsFocus,
      camera: state.cameraForFocus(metricsFocus),
      tuples: registry.registryIdentityTuples,
    }),
    before,
  );
});
