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

test("server-renders Career World as the default route", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();

  assert.match(html, /Career World/);
  assert.match(html, /Illustrative world .* entertainment, not measured outcomes\./);
  assert.match(html, /aria-label="Interactive Career World map"/i);
  assert.match(html, /data-scene-layer="coordinate-grid"/);
  assert.match(html, /data-grid-major-unit="100"/);
  assert.match(html, /data-grid-half-unit="50"/);
  assert.match(html, /data-grid-minor-unit="20"/);
  assert.match(html, /data-visible-node-count="0"/);
  assert.doesNotMatch(html, /data-instance-id=/);
  assert.match(html, /Scroll to zoom/);
  assert.match(html, /Drag to pan/);
  assert.match(html, /Select a city or project/);
  assert.doesNotMatch(
    html,
    /Career World landmark navigation|Choose an employer city to reveal/i,
  );
  assert.match(html, /steven-doris-resume\.pdf/);
  assert.match(html, /steven-doris-resume\.docx/);
  assert.doesNotMatch(html, /og:image|og\.png/);
  assert.match(html, /favicon\.svg/);
  assert.doesNotMatch(html, /<video|autoplay|ProjectMediaStage/i);
  assert.doesNotMatch(
    html,
    /Systems for controlled work|Three systems\. Clear evidence|world-class|supercharge/i,
  );
  assert.doesNotMatch(
    html,
    /\.py\b|internal repository|credential name|job identifier/i,
  );
});

test("routes every project through one entry transition into the inspector", async () => {
  const [atlas, graph, portals, transitionModel] = await Promise.all([
    readFile(
      new URL(
        "../features/evidence-atlas/components/evidence-atlas.tsx",
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
        "../features/evidence-atlas/components/project-portals.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../features/evidence-atlas/model/project-transition.ts",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.match(atlas, /setProjectTransition\(request\)/);
  assert.match(atlas, /openTrace\(request\.projectId\)/);
  assert.match(atlas, /focusElement\("#project-inspector-title"\)/);
  assert.doesNotMatch(
    atlas,
    /ProjectMediaStage|projectMediaById|createElement\("video"\)|projectReturn/,
  );
  assert.match(graph, /onProjectTransitionComplete/);
  assert.match(
    graph,
    /PROJECT_ENTRY_DURATION_MS\[projectTransition\.source\]/,
  );
  assert.match(graph, /cancelProjectTransition/);
  assert.match(graph, /interpolateGraphViewport/);
  assert.match(graph, /onOpenProject\(projectId, "zoom"\)/);
  assert.match(graph, /onOpenProject\(projectId, "activate"\)/);
  assert.doesNotMatch(
    graph,
    /projectReturn|projectStageActive|motionSuspended|onPreloadProject/,
  );
  assert.match(portals, /onMouseEnter=/);
  assert.match(portals, /onFocus=/);
  assert.doesNotMatch(portals, /onPreloadProject/);
  assert.match(
    transitionModel,
    /export type ProjectEntrySource = "activate" \| "zoom"/,
  );
  assert.doesNotMatch(
    transitionModel,
    /ProjectReturnRequest|ProjectViewportSnapshot|PROJECT_ABORT_DURATION_MS|PROJECT_EXIT_DURATION_MS/,
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
  const [projectPortals, projectTransition, projectLayout, projectRelations] =
    await Promise.all([
      readFile(
        new URL(
          "../features/evidence-atlas/components/project-portals.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../features/evidence-atlas/model/project-transition.ts",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../features/evidence-atlas/rendering/project-layout.ts",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../features/evidence-atlas/model/project-relations.ts",
          import.meta.url,
        ),
        "utf8",
      ),
    ]);
  const baseLayer = particleField.slice(
    particleField.indexOf("export function drawParticleFieldBase"),
    particleField.indexOf("export function drawParticleFieldMotion"),
  );
  const motionLayer = particleField.slice(
    particleField.indexOf("export function drawParticleFieldMotion"),
  );
  const ambientDensityGuard = particleField.slice(
    particleField.indexOf("const ambientOnly"),
    particleField.indexOf(
      "projectSkillRelationships.forEach",
      particleField.indexOf("const ambientOnly"),
    ),
  );

  assert.match(route, /import \{ CareerWorld \}/);
  assert.doesNotMatch(route, /useState|useEffect|useCallback/);
  assert.match(atlas, /useEvidenceAtlasState/);
  assert.match(atlas, /<EvidenceGraph/);
  assert.match(atlas, /<EvidenceInspector/);
  assert.doesNotMatch(atlas, /<ProjectPortals|graph-toolbar/);
  assert.doesNotMatch(atlas, /<DomainLegend|<ProjectNav/);
  assert.match(atlas, /mode-project/);
  assert.match(atlas, /mode-explore/);

  assert.match(state, /window\.history\.replaceState/);
  assert.match(state, /const MAX_MANUAL_SELECTIONS = 3/);
  assert.match(state, /current\.length >= MAX_MANUAL_SELECTIONS/);
  assert.doesNotMatch(state, /slice\(-MAX_MANUAL_SELECTIONS\)/);
  assert.match(state, /setTracePlayback\(false\)/);
  assert.match(state, /const applyTraceStep/);
  assert.match(state, /setSelectedIds\(record\.nodeIds\)/);
  assert.match(state, /prefers-reduced-motion: reduce/);
  assert.match(atlas, /event\.key !== "Escape"/);
  assert.match(atlas, /event\.defaultPrevented/);
  assert.match(atlas, /restoreNodeFocus/);
  assert.match(atlas, /focusElement\("#project-inspector-title"\)/);

  assert.match(data, /function buildEdges\(records: EvidenceRecord\[\]\)/);
  assert.match(data, /export const graphEdges = buildEdges\(evidenceRecords\)/);
  assert.match(data, /export const evidenceStrengthByNode/);
  assert.match(data, /export type PortfolioGroup = "current" \| "prior" \| "personal"/);
  assert.equal(
    [...data.matchAll(/portfolioGroup: "(?:current|prior|personal)"/g)].length,
    10,
  );
  assert.doesNotMatch(data, /GraphLens|graphLenses|recordsMatchingNodes/);
  assert.match(data, /Lower context does not prove better strategy/);
  assert.match(query, /function findShortestPath/);
  assert.match(query, /mode: "shared-trace"/);
  assert.match(query, /mode: "bridge"/);
  assert.match(query, /mode: "disconnected"/);

  assert.match(graphLayout, /export function computeLayout/);
  assert.match(graphLayout, /weightedProjectAnchor/);
  assert.match(graphLayout, /count === 1/);
  assert.match(graphLayout, /projectSkillRelationshipsByNode/);
  assert.match(particleField, /bridgeParticleActive/);
  assert.match(particleField, /bridgeParticleAmbientScale: 0\.5/);
  assert.match(particleField, /baseTextureDensity: 1\.08/);
  assert.match(particleField, /function drawNodeAtmosphereHaze/);
  assert.match(particleField, /function drawAmbientDomainField/);
  assert.match(particleField, /function radicalInverse/);
  assert.match(particleField, /baseTextureOpacity: 0\.9/);
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
  assert.match(particleField, /export function semanticTokenOrbit/);
  assert.match(particleField, /export function dataBurstWindow/);
  assert.match(particleField, /motionTimeScale: 0\.68/);
  assert.match(particleField, /drawVisualTokenSprite/);
  assert.match(particleField, /projectSkillRelationships\.forEach/);
  assert.match(particleField, /projectFieldColorsById/);
  assert.doesNotMatch(particleField, /graphEdges\.forEach/);
  assert.doesNotMatch(particleField, /fromProject/);
  assert.match(
    particleField,
    /const source = nodePoint;\s*const target = projectPoint;/,
  );
  assert.match(
    particleField,
    /relationship\.supportKind !== "direct-evidence"/,
  );
  assert.match(particleField, /supportsTrackedProjectBridge/);
  assert.match(
    particleField,
    /if \(supportsTrackedProjectBridge\(relationship\.supportKind\)\) \{\s*activeProjectBridges\.push/,
  );
  assert.match(baseLayer, /drawAtmosphereParticle/);
  assert.doesNotMatch(baseLayer, /drawAmbientParticle/);
  assert.match(motionLayer, /drawAmbientParticle/);
  assert.doesNotMatch(ambientDensityGuard, /previewId/);
  assert.doesNotMatch(particleField, /activeTrace/);
  assert.match(visualTokens, /const tokenSpriteCache/);
  assert.match(visualTokens, /context\.drawImage\(sprite/);
  assert.match(visualTokens, /const TOKEN_COLOR_STEP = 32/);

  assert.match(graph, /prefers-reduced-motion: reduce/);
  assert.match(graph, /baseCanvasRef/);
  assert.match(graph, /motionCanvasRef/);
  assert.match(graph, /MOTION_PIXEL_RATIO_LIMIT = 1/);
  assert.match(graph, /shouldPaintMotionFrame/);
  assert.doesNotMatch(graph, /context\.drawImage\(baseCanvas/);
  assert.doesNotMatch(graph, /previewId|onPreview|is-muted|is-preview/);
  assert.match(graph, /const particleResolution = useMemo/);
  assert.match(graph, /resolveEvidenceQuery\(selectedIds, effectiveProjectId\)/);
  assert.match(graph, /PROJECT_HOVER_WAKE_DELAY_MS = 120/);
  assert.match(graph, /source === "keyboard"/);
  assert.match(graph, /triggerProjectWake\(projectId\)/);
  assert.doesNotMatch(graph, /setSelectionWake\(\{ sourceId: node\.id/);
  assert.match(graph, /focusGraphViewportAt/);
  assert.match(graph, /interpolateGraphViewport/);
  assert.match(
    graph,
    /const projectPoint = projectPositions\[projectTransition\.projectId\]/,
  );
  assert.match(
    graph,
    /focusGraphViewportAt\(\s*projectPoint,\s*size,\s*targetScale/,
  );
  assert.match(graph, /<ProjectPortals/);
  assert.match(graph, /positions=\{projectPositions\}/);
  assert.match(graph, /closest<HTMLElement>\("\[data-project-id\]"\)/);
  assert.match(graph, /projectPortalFootprint\(size\.width\)/);
  assert.match(graph, /graphPointToScreen\(point, current\)/);
  assert.doesNotMatch(graph, /nearestDistance > 108/);
  assert.match(graph, /next\.scale >= PROJECT_PORTAL_ENTRY_SCALE/);
  assert.match(graph, /projectEntryLockRef\.current === null/);
  assert.match(
    graph,
    /projectEntryLockRef\.current = projectId;[\s\S]*onOpenProject\(projectId, "zoom"\)/,
  );
  assert.match(graph, /drawParticleFieldBase\([\s\S]*particleResolution/);
  assert.match(graph, /graph-viewport-controls/);
  assert.doesNotMatch(graph, /<StackSpotlight|spotlightDomain|domainBandsForSize/);
  assert.match(graph, /onPointerDown=\{handlePointerDown\}/);
  assert.match(graph, /addEventListener\("wheel", handleWheel, \{ passive: false \}\)/);
  assert.match(graph, /inspectorOpen/);
  assert.match(graph, /graphPointToScreen/);
  assert.match(graph, /data-node-id=\{node\.id\}/);
  assert.match(graph, /tabIndex=\{keyboardVisible \? 0 : -1\}/);
  assert.match(graph, /semanticNodeTokenReveal\(viewport\.scale\)/);
  assert.match(graph, /className="graph-node-domain"/);
  assert.doesNotMatch(graph, /--graph-scale/);
  assert.doesNotMatch(graph, /relative field density|activeTrace/);
  assert.match(projectPortals, /data-project-id=\{project\.id\}/);
  assert.match(projectPortals, /graphPointToScreen\(point, viewport\)/);
  assert.match(projectPortals, /tabIndex=\{keyboardVisible \? 0 : -1\}/);
  assert.match(
    projectTransition,
    /export type ProjectEntrySource = "activate" \| "zoom"/,
  );
  assert.match(projectTransition, /source: ProjectEntrySource/);
  assert.match(projectLayout, /export function computeProjectPortalLayout/);
  assert.match(projectLayout, /GOLDEN_ANGLE/);
  assert.match(projectRelations, /export const projectSkillRelationships/);
  assert.match(projectRelations, /projectSkillRelationshipsByNode/);
  assert.match(projectRelations, /ProjectRelationshipSupportKind/);
  assert.match(projectRelations, /evidenceWeight: number/);
  assert.match(projectRelations, /layoutWeight: number/);
  assert.match(inspector, /<ProjectInspector/);
  assert.match(inspector, /<QueryInspector/);
  assert.match(projectInspector, /Project playback controls/);
  assert.match(projectInspector, /aria-expanded=\{index === currentStep\}/);
  assert.match(projectInspector, /tabIndex=\{-1\}/);
  assert.match(projectInspector, /Evidence boundary/);
  assert.match(projectInspector, /Replay/);
  assert.match(queryInspector, /aria-labelledby="query-inspector-title"/);
  assert.match(queryInspector, /Each hop is backed by a shared evidence record/);
  assert.match(queryInspector, /Evidence records/);
  assert.match(
    queryInspector,
    /Show \{overflowRecords\.length\} more evidence record/,
  );

  assert.match(globalStyles, /features\/career-world\/styles/);
  assert.doesNotMatch(featureStyles, /\.graph-node:hover|\.graph-node\.is-preview/);
  assert.doesNotMatch(featureStyles, /\.graph-node\.is-muted/);
  assert.match(featureStyles, /\.graph-node-domain/);
  assert.match(
    featureStyles,
    /\.graph-node\s*\{[\s\S]*?background:\s*transparent;/,
  );
  assert.match(featureStyles, /\.project-portals/);
  assert.match(
    featureStyles,
    /\.project-portal-node\s*\{[\s\S]*?background:\s*transparent;/,
  );
  assert.doesNotMatch(featureStyles, /\.stack-spotlight|is-layer-muted/);
  assert.match(featureStyles, /\.graph-viewport-controls/);
  assert.match(featureStyles, /\.graph-field-base/);
  assert.match(featureStyles, /\.graph-field-motion/);
  assert.doesNotMatch(featureStyles, /\.node-layer\s*\{[^}]*transform/);
  assert.doesNotMatch(featureStyles, /\.toolbar-group/);
  assert.match(featureStyles, /position: fixed/);
  assert.match(featureStyles, /width: min\(520px, calc\(100vw - 32px\)\)/);
  assert.match(featureStyles, /\.project-step/);
  assert.match(featureStyles, /\.project-player/);
  assert.doesNotMatch(featureStyles, /\.project-media-stage|project-media-abort/);
  assert.match(featureStyles, /height: 100svh/);
  assert.match(featureStyles, /@media \(max-width: 940px\)/);
  assert.match(layout, /card: "summary"/);
  assert.match(layout, /favicon\.svg/);
  assert.doesNotMatch(layout, /summary_large_image|og\.png|Cyan, lime, coral, and violet evidence fields/);
});

test("keeps viewport transforms anchored and visual tokens evidence-scoped", async (t) => {
  const vite = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });
  t.after(() => vite.close());
  const [
    viewportModule,
    tokenModule,
    particleModule,
    renderScheduleModule,
    dataModule,
    relationshipModule,
  ] = await Promise.all([
    vite.ssrLoadModule(
      "/features/evidence-atlas/rendering/graph-viewport.ts",
    ),
    vite.ssrLoadModule(
      "/features/evidence-atlas/rendering/visual-tokens.ts",
    ),
    vite.ssrLoadModule(
      "/features/evidence-atlas/rendering/particle-field.ts",
    ),
    vite.ssrLoadModule(
      "/features/evidence-atlas/rendering/render-schedule.ts",
    ),
    vite.ssrLoadModule("/features/evidence-atlas/model/evidence-data.ts"),
    vite.ssrLoadModule("/features/evidence-atlas/model/project-relations.ts"),
  ]);

  assert.equal(renderScheduleModule.motionFrameInterval(false), 1000 / 15);
  assert.equal(renderScheduleModule.motionFrameInterval(true), 1000 / 30);
  assert.equal(renderScheduleModule.shouldPaintMotionFrame(32, true), false);
  assert.equal(renderScheduleModule.shouldPaintMotionFrame(33, true), true);
  assert.equal(renderScheduleModule.shouldPaintMotionFrame(65, false), false);
  assert.equal(renderScheduleModule.shouldPaintMotionFrame(66, false), true);
  assert.ok(
    renderScheduleModule.MOTION_IDLE_FRAME_INTERVAL >
      renderScheduleModule.MOTION_ACTIVE_FRAME_INTERVAL,
  );
  assert.equal(
    particleModule.supportsTrackedProjectBridge("direct-evidence"),
    true,
  );
  assert.equal(
    particleModule.supportsTrackedProjectBridge("curated-summary"),
    false,
  );

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

  const projectFocused = viewportModule.focusGraphViewportAt(
    { x: 600, y: 400 },
    size,
    1.9,
    { right: 520 },
  );
  assert.deepEqual(
    viewportModule.graphPointToScreen({ x: 600, y: 400 }, projectFocused),
    { x: 340, y: 416 },
  );
  assert.deepEqual(
    viewportModule.interpolateGraphViewport(current, projectFocused, 0),
    current,
  );
  assert.deepEqual(
    viewportModule.interpolateGraphViewport(current, projectFocused, 1),
    projectFocused,
  );

  const wake = { sourceId: "go", startedAt: 1_000 };
  assert.equal(particleModule.selectionWakeFrame(null, 1_000).active, false);
  assert.equal(
    particleModule.selectionWakeFrame(wake, 1_000).progress,
    0,
  );
  const wakeMidpoint = particleModule.selectionWakeFrame(wake, 1_525);
  assert.equal(wakeMidpoint.active, true);
  assert.ok(wakeMidpoint.progress > 0.45 && wakeMidpoint.progress < 0.55);
  assert.ok(wakeMidpoint.envelope > 0.9);
  assert.equal(
    particleModule.selectionWakeFrame(wake, 2_100).active,
    false,
  );
  assert.equal(
    particleModule.selectionWakeFrame(wake, 1_000, false).staticEmphasis,
    true,
  );
  const weakWake = particleModule.selectionWakeEdgeTuning(1);
  const strongWake = particleModule.selectionWakeEdgeTuning(12);
  assert.ok(strongWake.particleCount > weakWake.particleCount);
  assert.ok(strongWake.speed > weakWake.speed);
  assert.ok(weakWake.speed >= 1.15);
  const goWakeEdges = particleModule.selectionWakeEdges("go");
  assert.equal(
    goWakeEdges.length,
    relationshipModule.projectSkillRelationships.filter(
      (relationship) => relationship.nodeId === "go",
    ).length,
  );
  assert.ok(
    goWakeEdges.every(
      (relationship) =>
        relationship.nodeId === "go" || relationship.projectId === "go",
    ),
  );
  const projectWakeEdges = particleModule.selectionWakeEdges(
    "engineering-metrics-pipeline",
  );
  assert.equal(
    projectWakeEdges.length,
    relationshipModule.projectSkillRelationships.filter(
      (relationship) =>
        relationship.projectId === "engineering-metrics-pipeline",
    ).length,
  );
  assert.ok(
    projectWakeEdges.every(
      (relationship) =>
        relationship.projectId === "engineering-metrics-pipeline",
    ),
  );
  assert.equal(dataModule.graphNodes.some((node) => node.id === "electron"), false);
  const cableCar = dataModule.evidenceTraces.find(
    (trace) => trace.id === "cablecar",
  );
  assert.match(cableCar.summary, /React\/Electron/);
  assert.equal(cableCar.nodeIds.includes("electron"), false);

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
  assert.equal(particleModule.ambientGlyphDensity(1, "low"), 0.006);
  assert.equal(particleModule.ambientGlyphDensity(1, "balanced"), 0.012);
  assert.equal(particleModule.ambientGlyphDensity(4.5, "balanced"), 0.035);
  assert.equal(particleModule.ambientGlyphDensity(4.5, "high"), 0.06);
  const overviewGlyphCount = Array.from({ length: 10_000 }, (_, seed) =>
    particleModule.ambientGlyphForSeed(
      seed,
      particleModule.ambientGlyphDensity(1, "balanced"),
    ),
  ).filter(Boolean).length;
  const deepGlyphCount = Array.from({ length: 10_000 }, (_, seed) =>
    particleModule.ambientGlyphForSeed(
      seed,
      particleModule.ambientGlyphDensity(4.5, "balanced"),
    ),
  ).filter(Boolean).length;
  assert.ok(overviewGlyphCount > 80 && overviewGlyphCount < 160);
  assert.ok(deepGlyphCount > overviewGlyphCount * 2);
  assert.equal(particleModule.semanticTokenBridgeLimit(1), 0);
  assert.equal(particleModule.semanticTokenBridgeLimit(1.65), 0);
  assert.ok(particleModule.semanticTokenBridgeOpacity(1.75, 0) > 0);
  assert.ok(particleModule.semanticTokenBridgeOpacity(1.75, 0) < 0.1);
  assert.ok(
    particleModule.semanticTokenBridgeLimit(2.5) >
    particleModule.semanticTokenBridgeLimit(1.75),
  );
  assert.equal(particleModule.semanticTokenBridgeLimit(4.5), 6);

  const orbitStart = particleModule.semanticTokenOrbit(0, 17, true);
  const orbitLater = particleModule.semanticTokenOrbit(1_000, 17, true);
  const orbitStill = particleModule.semanticTokenOrbit(1_000, 17, false);
  assert.notEqual(orbitStart.angle, orbitLater.angle);
  assert.equal(orbitStart.angle, orbitStill.angle);

  const burstStates = Array.from({ length: 240 }, (_, index) =>
    particleModule.dataBurstWindow(index * 50, true),
  );
  assert.ok(burstStates.some((state) => state.active));
  assert.ok(
    burstStates.some(
      (state) => state.active && state.progress > 0 && state.progress < 1,
    ),
  );
  const fullCadence = Array.from({ length: 1_441 }, (_, index) =>
    particleModule.dataBurstWindow(index * 50, true),
  );
  const burstStarts = fullCadence.filter(
    (state, index) => state.active && !fullCadence[index - 1]?.active,
  );
  assert.equal(burstStarts.length, 8);
  assert.equal(particleModule.dataBurstWindow(1_000, false).active, false);

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
    {
      viewport: deepZoom,
      cursor: null,
      motionEnabled: true,
      occludedRight: 0,
    },
  );
  assert.ok(selectedPromotion > 0 && selectedPromotion < 1);

  const nearbyPromotion = particleModule.visualTokenPromotion(
    "postgresql",
    point,
    new Set(),
    {
      viewport: deepZoom,
      cursor: { x: 410, y: 302 },
      motionEnabled: true,
      occludedRight: 0,
    },
  );
  assert.ok(nearbyPromotion > 0);
  assert.ok(nearbyPromotion < selectedPromotion);
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

  const sharedTrace = resolveEvidenceQuery(["safe-writes", "openapi"]);
  assert.equal(sharedTrace.mode, "shared-trace");
  assert.deepEqual(sharedTrace.relatedTraceIds, ["governed-agent-tooling"]);
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
    "data-contracts",
    "context-compression",
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

  const projectScoped = resolveEvidenceQuery(
    ["python", "databricks"],
    "governed-agent-tooling",
  );
  assert.equal(projectScoped.mode, "disconnected");
  assert.ok(
    projectScoped.supportingRecords.every(
      (record) => record.traceId === "governed-agent-tooling",
    ),
  );
});

test("lays out deterministic project gravity wells and canonical skill satellites", async (t) => {
  const vite = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });
  t.after(() => vite.close());
  const [
    projectLayout,
    graphLayout,
    { evidenceTraces, graphNodes },
    { projectSkillRelationshipsByNode },
  ] = await Promise.all([
    vite.ssrLoadModule(
      "/features/evidence-atlas/rendering/project-layout.ts",
    ),
    vite.ssrLoadModule("/features/evidence-atlas/rendering/graph-layout.ts"),
    vite.ssrLoadModule("/features/evidence-atlas/model/evidence-data.ts"),
    vite.ssrLoadModule("/features/evidence-atlas/model/project-relations.ts"),
  ]);

  const wideSize = { width: 1440, height: 900 };
  const compactSize = { width: 900, height: 900 };
  const phoneSize = { width: 390, height: 700 };
  const wide = projectLayout.computeProjectPortalLayout(wideSize);
  const compact = projectLayout.computeProjectPortalLayout(compactSize);
  const phone = projectLayout.computeProjectPortalLayout(phoneSize);

  const boundsFor = (point, footprint) => ({
    left: point.x - footprint.width / 2,
    right: point.x + footprint.width / 2,
    top: point.y - footprint.height / 2,
    bottom: point.y + footprint.height / 2,
  });
  const boxesOverlap = (left, right, gap = 0) =>
    left.left < right.right + gap &&
    left.right + gap > right.left &&
    left.top < right.bottom + gap &&
    left.bottom + gap > right.top;

  assert.deepEqual(
    projectLayout.computeProjectPortalLayout(wideSize),
    wide,
    "project portal layout must be deterministic",
  );
  assert.deepEqual(Object.keys(wide).sort(), evidenceTraces.map((trace) => trace.id).sort());
  const wideXValues = Object.values(wide).map((point) => point.x);
  const wideYValues = Object.values(wide).map((point) => point.y);
  assert.ok(
    Math.max(...wideXValues) - Math.min(...wideXValues) > wideSize.width * 0.5,
    "project hubs should use the atlas width rather than form a toolbar",
  );
  assert.ok(
    Math.max(...wideYValues) - Math.min(...wideYValues) > wideSize.height * 0.45,
    "project hubs should use the atlas height rather than form a horizontal layer",
  );

  for (const [size, portals] of [
    [wideSize, wide],
    [compactSize, compact],
    [phoneSize, phone],
  ]) {
    const skills = graphLayout.computeLayout(size, portals);
    const portalFootprint = projectLayout.projectPortalFootprint(size.width);
    assert.deepEqual(
      graphLayout.computeLayout(size, portals),
      skills,
      "skill satellite layout must be deterministic",
    );
    assert.deepEqual(
      Object.keys(skills).sort(),
      graphNodes.map((node) => node.id).sort(),
      "every canonical skill should appear exactly once",
    );
    const portalEntries = Object.entries(portals);
    const skillEntries = Object.entries(skills);
    for (const [id, point] of portalEntries) {
      const bounds = boundsFor(point, portalFootprint);
      assert.ok(
        bounds.left >= 0 &&
          bounds.right <= size.width &&
          bounds.top >= 0 &&
          bounds.bottom <= size.height,
        `${id} project footprint must remain inside ${size.width}x${size.height}`,
      );
    }
    for (const [id, point] of skillEntries) {
      const bounds = boundsFor(point, graphLayout.graphNodeFootprint(id));
      assert.ok(
        bounds.left >= 0 &&
          bounds.right <= size.width &&
          bounds.top >= 0 &&
          bounds.bottom <= size.height,
        `${id} skill footprint must remain inside ${size.width}x${size.height}`,
      );
    }
    for (let leftIndex = 0; leftIndex < portalEntries.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < portalEntries.length;
        rightIndex += 1
      ) {
        assert.equal(
          boxesOverlap(
            boundsFor(portalEntries[leftIndex][1], portalFootprint),
            boundsFor(portalEntries[rightIndex][1], portalFootprint),
            2,
          ),
          false,
          `project portals must not overlap at ${size.width}x${size.height}`,
        );
      }
    }
    for (let leftIndex = 0; leftIndex < skillEntries.length; leftIndex += 1) {
      const [leftId, leftPoint] = skillEntries[leftIndex];
      const leftFootprint = graphLayout.graphNodeFootprint(leftId);
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < skillEntries.length;
        rightIndex += 1
      ) {
        const [rightId, rightPoint] = skillEntries[rightIndex];
        assert.equal(
          boxesOverlap(
            boundsFor(leftPoint, leftFootprint),
            boundsFor(rightPoint, graphLayout.graphNodeFootprint(rightId)),
            2,
          ),
          false,
          `${leftId} and ${rightId} must not overlap at ${size.width}x${size.height}`,
        );
      }
      for (const [projectId, projectPoint] of portalEntries) {
        assert.equal(
          boxesOverlap(
            boundsFor(leftPoint, leftFootprint),
            boundsFor(projectPoint, portalFootprint),
            2,
          ),
          false,
          `${leftId} must not overlap ${projectId} at ${size.width}x${size.height}`,
        );
      }
    }

    const singleProjectNode = graphNodes.find(
      (node) => projectSkillRelationshipsByNode.get(node.id)?.length === 1,
    );
    assert.ok(singleProjectNode, "fixture needs a project-specific skill");
    const onlyRelationship = projectSkillRelationshipsByNode.get(
      singleProjectNode.id,
    )[0];
    assert.ok(
      Math.hypot(
        skills[singleProjectNode.id].x - portals[onlyRelationship.projectId].x,
        skills[singleProjectNode.id].y - portals[onlyRelationship.projectId].y,
      ) < 280,
      "a project-specific skill should orbit its project hub",
    );

    const sharedNode = graphNodes.find(
      (node) => projectSkillRelationshipsByNode.get(node.id)?.length >= 2,
    );
    assert.ok(sharedNode, "fixture needs a shared skill");
    const relatedProjects = projectSkillRelationshipsByNode
      .get(sharedNode.id)
      .map((relationship) => portals[relationship.projectId]);
    assert.ok(
      skills[sharedNode.id].x >=
        Math.min(...relatedProjects.map((point) => point.x)) - 220 &&
        skills[sharedNode.id].x <=
          Math.max(...relatedProjects.map((point) => point.x)) + 220 &&
        skills[sharedNode.id].y >=
          Math.min(...relatedProjects.map((point) => point.y)) - 220 &&
        skills[sharedNode.id].y <=
          Math.max(...relatedProjects.map((point) => point.y)) + 220,
      "a shared skill should remain near its related project barycenter",
    );
  }
});

test("keeps projects, evidence records, and graph nodes separated", async (t) => {
  const vite = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });
  t.after(() => vite.close());
  const [
    { evidenceRecords, evidenceTraces, graphNodes },
    { nodeDomains },
    { projectSkillRelationships },
  ] =
    await Promise.all([
      vite.ssrLoadModule("/features/evidence-atlas/model/evidence-data.ts"),
      vite.ssrLoadModule("/features/evidence-atlas/model/node-domains.ts"),
      vite.ssrLoadModule("/features/evidence-atlas/model/project-relations.ts"),
    ]);

  const nodeIds = new Set(graphNodes.map((node) => node.id));
  const recordIds = new Set(evidenceRecords.map((record) => record.id));
  const traceIds = new Set(evidenceTraces.map((trace) => trace.id));
  assert.equal(nodeIds.size, graphNodes.length);
  assert.equal(recordIds.size, evidenceRecords.length);
  assert.equal(traceIds.size, evidenceTraces.length);
  assert.equal(evidenceTraces.length, 10);
  assert.ok(graphNodes.every((node) => node.kind !== "system"));
  assert.deepEqual(
    nodeDomains.map((domain) => domain.id),
    ["frontend", "backend", "data", "infrastructure"],
  );
  const representedDomains = new Set(
    graphNodes.map((node) => node.primaryDomain),
  );
  assert.ok(
    nodeDomains.every((domain) => representedDomains.has(domain.id)),
    "every displayed domain must be represented by at least one graph node",
  );
  assert.equal(
    graphNodes.find((node) => node.id === "go")?.primaryDomain,
    "backend",
  );
  assert.equal(
    graphNodes.find((node) => node.id === "react")?.primaryDomain,
    "frontend",
  );
  assert.equal(
    graphNodes.find((node) => node.id === "databricks")?.primaryDomain,
    "data",
  );
  assert.equal(
    graphNodes.find((node) => node.id === "aws")?.primaryDomain,
    "infrastructure",
  );
  assert.equal(
    graphNodes.find((node) => node.id === "mcp")?.primaryDomain,
    "backend",
  );
  assert.equal(
    graphNodes.find((node) => node.id === "operator-control")?.primaryDomain,
    "frontend",
  );
  assert.ok(
    evidenceTraces.every((project) => !nodeIds.has(project.id)),
    "projects must not be graph nodes",
  );
  assert.equal(
    new Set(
      projectSkillRelationships.map(
        (relationship) => `${relationship.projectId}:${relationship.nodeId}`,
      ),
    ).size,
    projectSkillRelationships.length,
    "each project-to-skill relationship must be canonical",
  );
  assert.ok(
    projectSkillRelationships.every(
      (relationship) =>
        traceIds.has(relationship.projectId) &&
        nodeIds.has(relationship.nodeId) &&
        relationship.evidenceIds.every((evidenceId) =>
          recordIds.has(evidenceId),
        ),
    ),
    "project-to-skill relationships must reference canonical model records",
  );
  assert.ok(
    projectSkillRelationships.some(
      (relationship) => relationship.supportKind === "curated-summary",
    ),
    "fixture needs a summary-only association to guard evidence semantics",
  );
  assert.ok(
    projectSkillRelationships.every((relationship) =>
      relationship.supportKind === "direct-evidence"
        ? relationship.evidenceWeight > 0 &&
          relationship.evidenceIds.length > 0 &&
          relationship.layoutWeight === relationship.evidenceWeight
        : relationship.evidenceWeight === 0 &&
          relationship.evidenceIds.length === 0 &&
          relationship.layoutWeight > 0,
    ),
    "summary-only support may affect layout but must not claim evidence density",
  );

  const metrics = evidenceTraces.find(
    (trace) => trace.id === "engineering-metrics-pipeline",
  );
  assert.ok(metrics.nodeIds.includes("go"));
  assert.ok(metrics.nodeIds.includes("postgresql"));
  assert.ok(metrics.nodeIds.includes("docker"));
  const metricsDocker = evidenceRecords.find(
    (record) => record.id === "metrics-local-docker",
  );
  assert.match(metricsDocker.source, /local-development/i);
  assert.doesNotMatch(metricsDocker.source, /production/i);

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
