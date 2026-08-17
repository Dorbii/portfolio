#!/usr/bin/env node

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import {
  CdpConnection,
  browserCandidates,
  delay,
  evaluate,
  firstAccessible,
  launchBrowser,
  navigate,
  resolveCdpWebSocket,
  screenshot,
  waitFor,
} from "./capture-ninjaone-environment-mvp.mjs";

const DEFAULT_URL = "http://localhost:4179/";
const DEFAULT_OUTPUT =
  ".codex-tmp/city-lod-correction-r1/lod-sequence-r1/evidence.json";
const VIEWPORT = Object.freeze({ height: 1086, width: 1448 });
const VIEWS = Object.freeze([
  Object.freeze({ id: "world", mode: "world-marker", nodeIds: [], tier: "world" }),
  Object.freeze({ id: "territory", mode: "territory-proxy", nodeIds: [], tier: "territory" }),
  Object.freeze({
    id: "capital",
    mode: "capital-incremental-context",
    nodeIds: ["transport-station-capital-cluster"],
    tier: "capital",
  }),
  Object.freeze({
    id: "d06-site",
    mode: "d06-site-composite",
    nodeIds: ["transport-station-site-composite"],
    tier: "site",
  }),
  Object.freeze({
    id: "d06-close",
    mode: "d06-close-composite",
    nodeIds: ["fabric-station-close-civic-overlay", "transport-station-site-composite"],
    tier: "close",
  }),
]);

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") return { help: true };
    if (!argument.startsWith("--")) throw new Error(`Unexpected argument: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${argument} needs a value.`);
    options[argument.slice(2)] = value;
    index += 1;
  }
  return options;
}

function usage() {
  return [
    "Usage: node scripts/capture-ninjaone-capital-lod-sequence.mjs [options]",
    "",
    "Options:",
    "  --browser-executable <file>  Chrome/Edge executable (auto-detected by default).",
    "  --cdp <url>                  Attach to an existing browser CDP endpoint.",
    "  --output <file>              Evidence JSON output path.",
    "  --root <directory>           Repository root (default: current directory).",
    "  --url <url>                  Running preview origin.",
  ].join("\n");
}

function proofUrl(origin, view) {
  const url = new URL(origin);
  url.searchParams.set("view", "ninjaone-capital-city-layer");
  url.searchParams.set("intent", "concept");
  url.searchParams.set("lod", view);
  url.searchParams.set("perf", "1");
  return url.toString();
}

function sameMembers(left, right) {
  return [...left].sort().join("\0") === [...right].sort().join("\0");
}

async function contactSheet(files, output) {
  const tile = Object.freeze({ height: 360, width: 480 });
  const composites = [];
  for (let index = 0; index < files.length; index += 1) {
    const rendered = await sharp(files[index].file)
      .resize(tile.width, tile.height, { fit: "fill" })
      .composite([{
        input: Buffer.from(`<svg width="${tile.width}" height="36">
          <rect width="100%" height="36" fill="rgba(2,8,7,0.82)"/>
          <text x="14" y="24" fill="#e7e5d3" font-family="monospace" font-size="16">
            ${files[index].id.toUpperCase()}
          </text>
        </svg>`),
        left: 0,
        top: 0,
      }])
      .png()
      .toBuffer();
    composites.push({ input: rendered, left: index * tile.width, top: 0 });
  }
  await sharp({
    create: {
      background: { alpha: 1, b: 0, g: 0, r: 0 },
      channels: 4,
      height: tile.height,
      width: tile.width * files.length,
    },
  }).composite(composites).png().toFile(output);
}

async function captureSequence(options) {
  const root = path.resolve(options.root ?? process.cwd());
  const output = path.resolve(root, options.output ?? DEFAULT_OUTPUT);
  const outputDirectory = path.dirname(output);
  await mkdir(outputDirectory, { recursive: true });
  let launched = null;
  let connection = null;
  let targetId = null;
  try {
    const websocketUrl = options.cdp
      ? await resolveCdpWebSocket(options.cdp)
      : await (async () => {
        const executable = options["browser-executable"]
          ?? await firstAccessible(browserCandidates());
        if (!executable) throw new Error("Chrome/Edge executable not found.");
        launched = await launchBrowser({ executable, viewport: VIEWPORT });
        return launched.websocketUrl;
      })();
    connection = await CdpConnection.connect(websocketUrl);
    ({ targetId } = await connection.send("Target.createTarget", { url: "about:blank" }));
    const { sessionId } = await connection.send("Target.attachToTarget", {
      flatten: true,
      targetId,
    });
    await Promise.all([
      connection.send("Page.enable", {}, sessionId),
      connection.send("Runtime.enable", {}, sessionId),
      connection.send("Network.enable", {}, sessionId),
      connection.send("Emulation.setDeviceMetricsOverride", {
        deviceScaleFactor: 1,
        height: VIEWPORT.height,
        mobile: false,
        width: VIEWPORT.width,
      }, sessionId),
      connection.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      }, sessionId),
    ]);

    const captures = [];
    for (const expected of VIEWS) {
      await navigate(connection, sessionId, proofUrl(options.url ?? DEFAULT_URL, expected.id));
      await waitFor(connection, sessionId, async () => evaluate(
        connection,
        sessionId,
        `(() => {
          const viewport = document.querySelector('.career-world__viewport');
          if (!viewport || viewport.dataset.cityProofView !== ${JSON.stringify(expected.id)}) {
            return false;
          }
          return [...document.images].every((image) => image.complete && image.naturalWidth > 0);
        })()`,
      ), `${expected.id} proof view`, 30_000);
      await delay(600);
      const telemetry = await evaluate(connection, sessionId, `(() => {
        const viewport = document.querySelector('.career-world__viewport');
        const city = viewport.querySelector('[data-city-authority-layer="L4"]');
        const proxy = viewport.querySelector('[data-city-context-proxy-id]');
        const rect = viewport.getBoundingClientRect();
        return {
          cameraOrigin: viewport.dataset.cameraOrigin.split(',').map(Number),
          cameraSpan: viewport.dataset.cameraSpan.split(',').map(Number),
          cityRendered: Boolean(city),
          focusDistrict: city?.dataset.cityFocusDistrict ?? 'none',
          nodeIds: [...viewport.querySelectorAll('[data-city-node-id]')]
            .map((node) => node.dataset.cityNodeId),
          nodeRepresentationClasses: [...viewport.querySelectorAll('[data-city-node-id]')]
            .map((node) => node.dataset.cityNodeRepresentationClass),
          proofView: viewport.dataset.cityProofView,
          proxyD06Excluded: proxy?.dataset.cityContextD06Excluded ?? null,
          proxyDelivery: proxy?.dataset.cityContextDelivery ?? null,
          proxyScale: proxy?.dataset.cityTerritoryScale ?? null,
          rect: { height: rect.height, width: rect.width, x: rect.x, y: rect.y },
          representationMode: viewport.dataset.cityRepresentationMode,
          tier: viewport.dataset.detailTier,
        };
      })()`);
      const file = path.join(outputDirectory, `${expected.id}.png`);
      await screenshot(connection, sessionId, file, { ...telemetry.rect, scale: 1 });
      const routePass = telemetry.tier === expected.tier
        && telemetry.proofView === expected.id
        && telemetry.representationMode === expected.mode
        && sameMembers(telemetry.nodeIds, expected.nodeIds)
        && telemetry.rect.width === VIEWPORT.width
        && telemetry.rect.height === VIEWPORT.height;
      captures.push(Object.freeze({
        ...telemetry,
        expected,
        file: path.relative(outputDirectory, file).replaceAll(path.sep, "/"),
        routePass,
      }));
    }
    const contactSheetFile = path.join(outputDirectory, "lod-sequence-contact-sheet.png");
    await contactSheet(captures.map((capture) => ({
      file: path.join(outputDirectory, capture.file),
      id: capture.expected.id,
    })), contactSheetFile);
    const evidence = Object.freeze({
      capturedAt: new Date().toISOString(),
      contactSheet: path.basename(contactSheetFile),
      captures: Object.freeze(captures),
      status: captures.every(({ routePass }) => routePass)
        ? "technical-routing-pass-visual-acceptance-pending"
        : "technical-routing-fail",
      viewport: Object.freeze([VIEWPORT.width, VIEWPORT.height]),
    });
    await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    return evidence;
  } finally {
    if (connection && targetId) {
      try { await connection.send("Target.closeTarget", { targetId }); } catch {}
    }
    if (connection) {
      if (launched) {
        try { await connection.send("Browser.close"); } catch {}
      }
      connection.close();
    }
    if (launched) {
      if (launched.child.exitCode === null) launched.child.kill();
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          await delay(150 * (attempt + 1));
          await rm(launched.profile, { force: true, recursive: true });
          break;
        } catch {}
      }
    }
  }
}

const options = parseArguments(process.argv.slice(2));
if (options.help) {
  process.stdout.write(`${usage()}\n`);
} else {
  const evidence = await captureSequence(options);
  process.stdout.write(`${JSON.stringify({
    captures: evidence.captures.map(({ expected, nodeIds, routePass }) => ({
      id: expected.id,
      nodeCount: nodeIds.length,
      routePass,
    })),
    status: evidence.status,
  }, null, 2)}\n`);
  if (evidence.status === "technical-routing-fail") process.exitCode = 1;
}
