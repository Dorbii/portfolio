// Feature architecture, server rendering, and evidence-model contracts.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createServer } from "vite";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

function permutations(items) {
  if (items.length < 2) return [items];
  return items.flatMap((item, index) =>
    permutations(items.filter((_, currentIndex) => currentIndex !== index)).map(
      (rest) => [item, ...rest],
    ),
  );
}

test("server-renders the evidence atlas and its project launcher", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();

  assert.match(html, /Steven Doris/);
  assert.match(html, /Senior full-stack \/ platform engineer/i);
  assert.match(html, /Projects/i);
  assert.match(html, /Choose a project/i);
  assert.doesNotMatch(html, /Filter the evidence map/i);
  assert.doesNotMatch(html, /Case studies/i);
  assert.match(html, /steven-doris-resume\.pdf/);
  assert.match(html, /steven-doris-resume\.docx/);
  assert.match(html, /og:image/);
  assert.match(html, /og\.png/);
  assert.match(html, /favicon\.svg/);
  assert.doesNotMatch(html, /Position comes from weighted shared evidence/i);
  assert.doesNotMatch(
    html,
    /Systems for controlled work|Three systems\. Clear evidence|world-class|supercharge/i,
  );
  assert.doesNotMatch(
    html,
    /\.py\b|internal repository|credential name|job identifier/i,
  );
});

test("keeps the evidence atlas feature boundaries explicit", async () => {
  const [
    route,
    atlas,
    state,
    graph,
    graphLayout,
    particleField,
    inspector,
    projectInspector,
    queryInspector,
    data,
    query,
    globalStyles,
    featureStyles,
    layout,
  ] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../features/evidence-atlas/components/evidence-atlas.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../features/evidence-atlas/hooks/use-evidence-atlas-state.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../features/evidence-atlas/components/evidence-graph.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../features/evidence-atlas/rendering/graph-layout.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../features/evidence-atlas/rendering/particle-field.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../features/evidence-atlas/components/evidence-inspector.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../features/evidence-atlas/components/project-inspector.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../features/evidence-atlas/components/query-inspector.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../features/evidence-atlas/model/evidence-data.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../features/evidence-atlas/model/evidence-query.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../features/evidence-atlas/styles/evidence-atlas.css",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);
  const visualTokens = await readFile(
    new URL(
      "../features/evidence-atlas/rendering/visual-tokens.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(route, /import \{ EvidenceAtlas \}/);
  assert.doesNotMatch(route, /useState|useEffect|useCallback/);
  assert.match(atlas, /useEvidenceAtlasState/);
  assert.match(atlas, /<EvidenceGraph/);
  assert.match(atlas, /<EvidenceInspector/);
  assert.match(atlas, /mode-project/);
  assert.match(atlas, /mode-explore/);

  assert.match(state, /window\.history\.replaceState/);
  assert.match(state, /const MAX_MANUAL_SELECTIONS = 3/);
  assert.match(state, /const applyTraceStep/);
  assert.match(state, /setSelectedIds\(record\.nodeIds\)/);
  assert.match(state, /prefers-reduced-motion: reduce/);
  assert.match(state, /event\.key === "Escape"/);

  assert.match(data, /function buildEdges\(records: EvidenceRecord\[\]\)/);
  assert.match(data, /export const graphEdges = buildEdges\(evidenceRecords\)/);
  assert.match(data, /export const evidenceStrengthByNode/);
  assert.doesNotMatch(data, /GraphLens|graphLenses|recordsMatchingNodes/);
  assert.match(data, /Lower context does not prove better strategy/);
  assert.match(query, /function findShortestPath/);
  assert.match(query, /mode: "shared-trace"/);
  assert.match(query, /mode: "bridge"/);
  assert.match(query, /mode: "disconnected"/);

  assert.match(graphLayout, /function normalizeLayoutBounds/);
  assert.match(graphLayout, /export function computeLayout/);
  assert.match(graphLayout, /const verticalCoverage = 0\.84/);
  assert.match(particleField, /bridgeParticleActive/);
  assert.match(particleField, /nodeFieldAlphaIdle/);
  assert.match(particleField, /function mixColor/);
  assert.match(particleField, /function drawAttentionBloom/);
  assert.doesNotMatch(particleField, /const activeFlow/);
  assert.match(particleField, /CanvasRenderingContext2D/);
  assert.match(particleField, /function drawSemanticTokens/);
  assert.match(particleField, /export function drawParticleFieldBase/);
  assert.match(particleField, /export function drawParticleFieldMotion/);
  assert.match(particleField, /export function particleTransit/);
  assert.match(particleField, /export function visualTokenPromotion/);
  assert.match(particleField, /export function visualTokenEchoCount/);
  assert.match(particleField, /motionTimeScale: 0\.68/);
  assert.match(particleField, /drawVisualTokenSprite/);
  assert.doesNotMatch(particleField, /activeTrace/);
  assert.match(visualTokens, /const tokenSpriteCache/);
  assert.match(visualTokens, /context\.drawImage\(sprite/);
  assert.match(visualTokens, /const TOKEN_COLOR_STEP = 32/);

  assert.match(graph, /prefers-reduced-motion: reduce/);
  assert.match(graph, /PARTICLE_FRAME_INTERVAL = 1000 \/ 30/);
  assert.match(graph, /const baseCanvas = document\.createElement\("canvas"\)/);
  assert.match(graph, /selectedIds\.length > 0 \? selectedIds : previewId/);
  assert.match(graph, /graph-viewport-controls/);
  assert.match(graph, /onPointerDown=\{handlePointerDown\}/);
  assert.match(graph, /addEventListener\("wheel", handleWheel, \{ passive: false \}\)/);
  assert.match(graph, /inspectorOpen/);
  assert.match(graph, /graphPointToScreen/);
  assert.doesNotMatch(graph, /--graph-scale/);
  assert.doesNotMatch(graph, /relative field density|activeTrace/);
  assert.match(inspector, /<ProjectInspector/);
  assert.match(inspector, /<QueryInspector/);
  assert.match(projectInspector, /Project playback controls/);
  assert.match(projectInspector, /Evidence boundary/);
  assert.match(projectInspector, /Replay/);
  assert.match(queryInspector, /aria-labelledby="query-inspector-title"/);
  assert.match(queryInspector, /Each hop is backed by a shared evidence record/);
  assert.match(queryInspector, /Supporting records/);
  assert.match(
    queryInspector,
    /Show \{overflowRecords\.length\} more evidence record/,
  );

  assert.match(globalStyles, /features\/evidence-atlas\/styles/);
  assert.match(featureStyles, /\.graph-node:focus-visible/);
  assert.match(featureStyles, /\.graph-node\.is-preview/);
  assert.match(featureStyles, /\.project-nav/);
  assert.match(featureStyles, /\.graph-viewport-controls/);
  assert.doesNotMatch(featureStyles, /\.node-layer\s*\{[^}]*transform/);
  assert.doesNotMatch(featureStyles, /\.toolbar-group/);
  assert.match(featureStyles, /position: fixed/);
  assert.match(featureStyles, /width: min\(520px, calc\(100vw - 32px\)\)/);
  assert.match(featureStyles, /\.project-step/);
  assert.match(featureStyles, /\.project-player/);
  assert.match(featureStyles, /height: 100svh/);
  assert.match(featureStyles, /@media \(max-width: 940px\)/);
  assert.match(layout, /summary_large_image/);
  assert.match(layout, /favicon\.svg/);
});

test("keeps viewport transforms anchored and visual tokens evidence-scoped", async (t) => {
  const vite = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });
  t.after(() => vite.close());
  const [viewportModule, tokenModule, particleModule, dataModule] =
    await Promise.all([
      vite.ssrLoadModule(
        "/features/evidence-atlas/rendering/graph-viewport.ts",
      ),
      vite.ssrLoadModule(
        "/features/evidence-atlas/rendering/visual-tokens.ts",
      ),
      vite.ssrLoadModule(
        "/features/evidence-atlas/rendering/particle-field.ts",
      ),
      vite.ssrLoadModule("/features/evidence-atlas/model/evidence-data.ts"),
    ]);

  const size = { width: 1200, height: 800 };
  const current = { scale: 1, x: 0, y: 0 };
  const anchor = { x: 840, y: 260 };
  const worldBefore = viewportModule.screenPointToGraph(anchor, current);
  const zoomed = viewportModule.zoomGraphViewportAt(
    current,
    size,
    anchor,
    1.6,
  );
  const worldAfter = viewportModule.screenPointToGraph(anchor, zoomed);
  assert.ok(Math.abs(worldBefore.x - worldAfter.x) < 0.001);
  assert.ok(Math.abs(worldBefore.y - worldAfter.y) < 0.001);
  assert.deepEqual(
    viewportModule.graphPointToScreen(worldAfter, zoomed),
    anchor,
  );

  const clamped = viewportModule.clampGraphViewport(
    { scale: 99, x: -99999, y: 99999 },
    size,
  );
  assert.equal(clamped.scale, viewportModule.MAX_GRAPH_SCALE);
  assert.equal(viewportModule.MAX_GRAPH_SCALE, 4.5);
  assert.ok(clamped.x > -99999);
  assert.ok(clamped.y < 99999);

  const drawerClamped = viewportModule.clampGraphViewport(
    { scale: 1, x: -99999, y: 0 },
    size,
    { right: 520 },
  );
  assert.ok(
    drawerClamped.x <= -520,
    "an open drawer must allow the graph to pan fully clear of its overlay",
  );

  for (const node of dataModule.graphNodes) {
    assert.ok(
      tokenModule.visualTokenByNodeId[node.id],
      `missing visual token for ${node.id}`,
    );
  }
  for (const project of dataModule.evidenceTraces) {
    assert.ok(
      tokenModule.visualTokenByProjectId[project.id],
      `missing project packet for ${project.id}`,
    );
  }
  assert.equal(tokenModule.visualTokenByNodeId.docker.label, "Docker");
  assert.equal(tokenModule.visualTokenByNodeId.databricks.label, "Databricks");
  assert.deepEqual(tokenModule.visualTokenByNodeId.go, {
    kind: "image-mask",
    label: "Go gopher face",
    src: tokenModule.visualTokenByNodeId.go.src,
    crop: "face",
  });
  assert.deepEqual(
    tokenModule.visualTokenVariantsByNodeId.go.map((token) => token.label),
    ["Go gopher face", "Go wordmark"],
  );
  assert.equal(tokenModule.visualTokenForNode("go", 0).crop, "face");
  assert.equal(tokenModule.visualTokenForNode("go", 1).label, "Go wordmark");
  assert.equal(tokenModule.visualTokenForNode("go", 2).crop, "face");
  assert.equal(tokenModule.visualTokenForNode("react", 99).label, "React");
  assert.equal(
    tokenModule.visualTokenForProject("governed-agent-tooling").label,
    "Kaizen",
  );
  assert.equal(
    tokenModule.visualTokenForProject("cross-provider-orchestration").label,
    "Vendy",
  );
  assert.equal(particleModule.visualTokenEchoCount("capability", 1), 3);
  assert.equal(particleModule.visualTokenEchoCount("technology", 1), 2);
  assert.equal(particleModule.visualTokenEchoCount("capability", 0.39), 1);
  assert.equal(particleModule.visualTokenEchoCount("capability", 0.27), 0);
  assert.equal(particleModule.semanticZoomLevel(1), 0);
  assert.equal(particleModule.semanticZoomLevel(4.5), 1);
  assert.equal(particleModule.semanticTokenBridgeLimit(1), 0);
  assert.equal(particleModule.semanticTokenBridgeLimit(1.45), 1);
  assert.ok(
    particleModule.semanticTokenBridgeLimit(2.5) >
      particleModule.semanticTokenBridgeLimit(1.45),
  );
  assert.equal(particleModule.semanticTokenBridgeLimit(4.5), 6);

  const transitA = particleModule.particleTransit(12_000, 17);
  const transitB = particleModule.particleTransit(12_000, 18);
  assert.notEqual(transitA.progress, transitB.progress);
  assert.ok(transitA.alpha >= 0 && transitA.alpha <= 1);
  assert.ok(transitB.alpha >= 0 && transitB.alpha <= 1);

  const point = { x: 400, y: 300 };
  const idlePromotion = particleModule.visualTokenPromotion(
    "react",
    point,
    new Set(),
    null,
    {
      viewport: current,
      cursor: point,
      motionEnabled: true,
      occludedRight: 0,
    },
  );
  assert.equal(idlePromotion, 0, "overview mode must remain particle-first");

  const shallowZoomPromotion = particleModule.visualTokenPromotion(
    "react",
    point,
    new Set(["react"]),
    null,
    {
      viewport: { scale: 1.6, x: 0, y: 0 },
      cursor: point,
      motionEnabled: true,
      occludedRight: 0,
    },
  );
  assert.equal(shallowZoomPromotion, 0, "node icons must require deeper zoom");

  const deepZoom = { ...zoomed, scale: 2 };
  const selectedPromotion = particleModule.visualTokenPromotion(
    "react",
    point,
    new Set(["react"]),
    null,
    {
      viewport: deepZoom,
      cursor: null,
      motionEnabled: true,
      occludedRight: 0,
    },
  );
  assert.equal(selectedPromotion, 1);

  const nearbyPromotion = particleModule.visualTokenPromotion(
    "postgresql",
    point,
    new Set(),
    null,
    {
      viewport: deepZoom,
      cursor: { x: 410, y: 302 },
      motionEnabled: true,
      occludedRight: 0,
    },
  );
  assert.ok(nearbyPromotion > 0.7);
});

test("resolves direct, shared-trace, bridged, and disconnected queries", async (t) => {
  const vite = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });
  t.after(() => vite.close());
  const { resolveEvidenceQuery } = await vite.ssrLoadModule(
    "/features/evidence-atlas/model/evidence-query.ts",
  );

  const direct = resolveEvidenceQuery(["openapi", "go"]);
  assert.equal(direct.mode, "direct");
  assert.ok(direct.directRecords.length > 0);

  const sharedTrace = resolveEvidenceQuery([
    "deterministic-replay",
    "context-budgeting",
  ]);
  assert.equal(sharedTrace.mode, "shared-trace");
  assert.deepEqual(sharedTrace.relatedTraceIds, ["bounded-agent-context"]);
  assert.ok(sharedTrace.pathSegments.length > 0);

  const bridge = resolveEvidenceQuery([
    "openapi",
    "go",
    "context-compression",
  ]);
  assert.equal(bridge.mode, "bridge");
  assert.ok(bridge.pathSegments.length > 0);
  assert.ok(bridge.pathNodeIds.includes("openapi"));
  assert.ok(bridge.pathNodeIds.includes("go"));
  assert.ok(bridge.pathNodeIds.includes("context-compression"));
  assert.match(bridge.explanation, /not direct proof/i);

  const permutationResults = permutations([
    "postgresql",
    "trusted-evidence",
    "context-budgeting",
  ]).map((nodeIds) => resolveEvidenceQuery(nodeIds));
  assert.ok(permutationResults.every((result) => result.mode === "bridge"));
  assert.equal(
    new Set(
      permutationResults.map((result) => JSON.stringify(result.pathSegments)),
    ).size,
    1,
    "the same selected node set must resolve to the same path in every order",
  );

  const disconnected = resolveEvidenceQuery(
    ["openapi", "context-compression"],
    "governed-agent-tooling",
  );
  assert.equal(disconnected.mode, "disconnected");
  assert.equal(disconnected.pathSegments.length, 0);
});

test("keeps projects, evidence records, and graph nodes separated", async (t) => {
  const vite = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });
  t.after(() => vite.close());
  const { evidenceRecords, evidenceTraces, graphNodes } =
    await vite.ssrLoadModule("/features/evidence-atlas/model/evidence-data.ts");

  const nodeIds = new Set(graphNodes.map((node) => node.id));
  const recordIds = new Set(evidenceRecords.map((record) => record.id));
  const traceIds = new Set(evidenceTraces.map((trace) => trace.id));
  assert.equal(nodeIds.size, graphNodes.length);
  assert.equal(recordIds.size, evidenceRecords.length);
  assert.equal(traceIds.size, evidenceTraces.length);
  assert.equal(evidenceTraces.length, 10);
  assert.ok(graphNodes.every((node) => node.kind !== "system"));
  assert.ok(
    evidenceTraces.every((project) => !nodeIds.has(project.id)),
    "projects must not be graph nodes",
  );

  for (const record of evidenceRecords) {
    assert.ok(traceIds.has(record.traceId), `unknown trace on ${record.id}`);
    assert.ok(
      record.nodeIds.every((nodeId) => nodeIds.has(nodeId)),
      `unknown node on ${record.id}`,
    );
  }

  for (const trace of evidenceTraces) {
    const traceRecordIds = evidenceRecords
      .filter((record) => record.traceId === trace.id)
      .map((record) => record.id)
      .sort();
    assert.deepEqual([...trace.evidenceIds].sort(), traceRecordIds);
    if (trace.replayStatus === "ready") {
      assert.ok(traceRecordIds.length > 1, `replay-ready project ${trace.id} has no flow`);
    } else {
      assert.equal(traceRecordIds.length, 0, `overview project ${trace.id} has replay steps`);
    }
    assert.deepEqual(
      evidenceRecords
        .filter((record) => record.traceId === trace.id)
        .map((record) => record.sequence)
        .sort((left, right) => left - right),
      Array.from({ length: traceRecordIds.length }, (_, index) => index + 1),
      `non-sequential evidence records on ${trace.id}`,
    );
  }
});
