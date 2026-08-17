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
  ".codex-tmp/city-lod-correction-r1/interactive-boundaries-r2/evidence.json";
const VIEWPORT = Object.freeze({ height: 1086, width: 1448 });
const EXPECTED = Object.freeze([
  Object.freeze({
    id: "capital-before-site",
    mode: "capital-incremental-context",
    nodeIds: ["transport-station-capital-cluster"],
    tier: "capital",
  }),
  Object.freeze({
    id: "site-after-capital",
    mode: "d06-site-composite",
    nodeIds: ["transport-station-site-composite"],
    tier: "site",
  }),
  Object.freeze({
    id: "site-before-close",
    mode: "d06-site-composite",
    nodeIds: ["transport-station-site-composite"],
    tier: "site",
  }),
  Object.freeze({
    id: "close-after-site",
    mode: "d06-close-composite",
    nodeIds: ["fabric-station-close-civic-overlay", "transport-station-site-composite"],
    tier: "close",
  }),
]);

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) throw new Error(`Unexpected argument: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${argument} needs a value.`);
    options[argument.slice(2)] = value;
    index += 1;
  }
  return options;
}

function interactiveUrl(origin) {
  const url = new URL(origin);
  url.searchParams.set("view", "ninjaone-capital-city-layer");
  url.searchParams.set("intent", "concept");
  url.searchParams.set("perf", "1");
  return url.toString();
}

function sameMembers(left, right) {
  return [...left].sort().join("\0") === [...right].sort().join("\0");
}

async function dispatchWheelAtNode(connection, sessionId, nodeId, deltaY) {
  const point = await evaluate(connection, sessionId, `(() => {
    const node = document.querySelector('[data-city-node-id=${JSON.stringify(nodeId)}]');
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return { x: rect.left + rect.width * 0.5, y: rect.top + rect.height * 0.5 };
  })()`);
  if (!point) throw new Error(`Wheel anchor node ${nodeId} is not visible.`);
  await connection.send("Input.dispatchMouseEvent", {
    deltaX: 0,
    deltaY,
    type: "mouseWheel",
    x: point.x,
    y: point.y,
  }, sessionId);
  await delay(1_100);
  return point;
}

async function readTelemetry(connection, sessionId) {
  return evaluate(connection, sessionId, `(() => {
    const viewport = document.querySelector('.career-world__viewport');
    const rect = viewport.getBoundingClientRect();
    return {
      baseParentBounds: (() => {
        const node = viewport.querySelector(
          '[data-city-node-id="transport-station-site-composite"]',
        );
        const image = node?.querySelector('image');
        return image ? {
          height: Number(image.getAttribute('height')),
          width: Number(image.getAttribute('width')),
          x: Number(image.getAttribute('x')),
          y: Number(image.getAttribute('y')),
        } : null;
      })(),
      baseSourceTier: viewport.querySelector(
        '[data-city-node-id="transport-station-site-composite"]',
      )?.dataset.cityAssetSourceTier ?? null,
      cameraDerivedTier: viewport.dataset.cameraDerivedTier,
      cameraOrigin: viewport.dataset.cameraOrigin.split(',').map(Number),
      cameraSpan: viewport.dataset.cameraSpan.split(',').map(Number),
      focusDistrict: viewport.dataset.focusedCityDistrict,
      nodeIds: [...viewport.querySelectorAll('[data-city-node-id]')]
        .map((node) => node.dataset.cityNodeId),
      rect: { height: rect.height, width: rect.width, x: rect.x, y: rect.y },
      representationMode: viewport.dataset.cityRepresentationMode,
      tier: viewport.dataset.detailTier,
    };
  })()`);
}

async function contactSheet(captures, output) {
  const tile = Object.freeze({ height: 543, width: 724 });
  const composites = [];
  for (let index = 0; index < captures.length; index += 1) {
    const rendered = await sharp(captures[index].file)
      .resize(tile.width, tile.height, { fit: "fill" })
      .composite([{
        input: Buffer.from(`<svg width="${tile.width}" height="38">
          <rect width="100%" height="38" fill="rgba(2,8,7,0.84)"/>
          <text x="14" y="25" fill="#e7e5d3" font-family="monospace" font-size="16">
            ${captures[index].expected.id.toUpperCase()}
          </text>
        </svg>`),
        left: 0,
        top: 0,
      }])
      .png()
      .toBuffer();
    composites.push({
      input: rendered,
      left: index % 2 * tile.width,
      top: Math.floor(index / 2) * tile.height,
    });
  }
  await sharp({
    create: {
      background: { alpha: 1, b: 0, g: 0, r: 0 },
      channels: 4,
      height: tile.height * 2,
      width: tile.width * 2,
    },
  }).composite(composites).png().toFile(output);
}

async function captureBoundaries(options) {
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
    await navigate(connection, sessionId, interactiveUrl(options.url ?? DEFAULT_URL));
    await waitFor(connection, sessionId, async () => evaluate(
      connection,
      sessionId,
      `(() => {
        const viewport = document.querySelector('.career-world__viewport');
        return viewport?.dataset.detailTier === 'capital'
          && [...document.images].every((image) => image.complete && image.naturalWidth > 0);
      })()`,
    ), "interactive capital", 30_000);
    await delay(600);

    await dispatchWheelAtNode(
      connection,
      sessionId,
      "transport-station-capital-cluster",
      -200,
    );
    const captures = [];
    const capture = async (expected) => {
      const telemetry = await readTelemetry(connection, sessionId);
      const file = path.join(outputDirectory, `${expected.id}.png`);
      await screenshot(connection, sessionId, file, { ...telemetry.rect, scale: 1 });
      const routePass = telemetry.tier === expected.tier
        && telemetry.cameraDerivedTier === expected.tier
        && telemetry.representationMode === expected.mode
        && sameMembers(telemetry.nodeIds, expected.nodeIds)
        && telemetry.rect.width > 0
        && Math.abs(telemetry.rect.width / telemetry.rect.height - 4 / 3) < 0.001;
      captures.push({
        ...telemetry,
        expected,
        file,
        routePass,
      });
    };

    await capture(EXPECTED[0]);
    const capitalToSiteAnchor = await dispatchWheelAtNode(
      connection,
      sessionId,
      "transport-station-capital-cluster",
      -40,
    );
    await capture(EXPECTED[1]);
    await dispatchWheelAtNode(
      connection,
      sessionId,
      "transport-station-site-composite",
      -115,
    );
    await capture(EXPECTED[2]);
    const siteToCloseAnchor = await dispatchWheelAtNode(
      connection,
      sessionId,
      "transport-station-site-composite",
      -35,
    );
    await capture(EXPECTED[3]);

    const siteBaseBounds = JSON.stringify(captures[1].baseParentBounds);
    const baseBoundsParity = Boolean(captures[1].baseParentBounds)
      && siteBaseBounds === JSON.stringify(captures[2].baseParentBounds)
      && siteBaseBounds === JSON.stringify(captures[3].baseParentBounds)
      && captures[1].baseSourceTier === "site"
      && captures[2].baseSourceTier === "site"
      && captures[3].baseSourceTier === "close";
    for (const capture of captures.slice(1)) {
      capture.routePass = capture.routePass && baseBoundsParity;
    }

    const contactSheetFile = path.join(outputDirectory, "interactive-boundaries-contact-sheet.png");
    await contactSheet(captures, contactSheetFile);
    const evidence = {
      boundaryAnchors: { capitalToSite: capitalToSiteAnchor, siteToClose: siteToCloseAnchor },
      baseBoundsParity,
      capturedAt: new Date().toISOString(),
      captures: captures.map((item) => ({
        ...item,
        file: path.basename(item.file),
      })),
      contactSheet: path.basename(contactSheetFile),
      status: captures.every(({ routePass }) => routePass)
        ? "interactive-routing-pass-visual-acceptance-pending"
        : "interactive-routing-fail",
      viewport: [VIEWPORT.width, VIEWPORT.height],
    };
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
const evidence = await captureBoundaries(options);
process.stdout.write(`${JSON.stringify({
  captures: evidence.captures.map(({ expected, routePass }) => ({
    id: expected.id,
    routePass,
  })),
  status: evidence.status,
}, null, 2)}\n`);
if (evidence.status === "interactive-routing-fail") process.exitCode = 1;
