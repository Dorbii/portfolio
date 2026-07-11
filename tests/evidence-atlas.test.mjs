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

test("server-renders the evidence atlas and its three curated traces", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();

  assert.match(html, /Steven Doris/);
  assert.match(html, /Senior full-stack \/ platform engineer/i);
  assert.match(html, /Open a case study/i);
  assert.doesNotMatch(html, /Filter the evidence map/i);
  assert.match(html, /Agent tooling/i);
  assert.match(html, /Context control/i);
  assert.match(html, /VM platform/i);
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
    traceInspector,
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
        "../features/evidence-atlas/components/trace-inspector.tsx",
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

  assert.match(route, /import \{ EvidenceAtlas \}/);
  assert.doesNotMatch(route, /useState|useEffect|useCallback/);
  assert.match(atlas, /useEvidenceAtlasState/);
  assert.match(atlas, /<EvidenceGraph/);
  assert.match(atlas, /<EvidenceInspector/);
  assert.match(atlas, /mode-trace/);
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
  assert.match(particleField, /const activeFlow/);
  assert.match(particleField, /CanvasRenderingContext2D/);
  assert.doesNotMatch(particleField, /activeTrace/);

  assert.match(graph, /prefers-reduced-motion: reduce/);
  assert.match(graph, /selectedIds\.length > 0 \? selectedIds : previewId/);
  assert.doesNotMatch(graph, /relative field density|activeTrace/);
  assert.match(inspector, /<TraceInspector/);
  assert.match(inspector, /<QueryInspector/);
  assert.match(traceInspector, /Trace playback controls/);
  assert.match(traceInspector, /Evidence boundary/);
  assert.match(traceInspector, /Replay/);
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
  assert.match(featureStyles, /\.case-study-nav/);
  assert.doesNotMatch(featureStyles, /\.toolbar-group/);
  assert.match(featureStyles, /position: fixed/);
  assert.match(featureStyles, /width: min\(520px, calc\(100vw - 32px\)\)/);
  assert.match(featureStyles, /\.trace-step/);
  assert.match(featureStyles, /\.trace-player/);
  assert.match(featureStyles, /height: 100svh/);
  assert.match(featureStyles, /@media \(max-width: 940px\)/);
  assert.match(layout, /summary_large_image/);
  assert.match(layout, /favicon\.svg/);
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

  const sharedTrace = resolveEvidenceQuery(["kinforge", "skills-system"]);
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

test("keeps evidence records and traces referentially consistent", async (t) => {
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
