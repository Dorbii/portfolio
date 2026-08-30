#!/usr/bin/env node
/**
 * How much does the sea actually MOVE, at each zoom?
 *
 * "The water looks still at world and territory" is a question about the
 * DIFFERENCE between frames, and every instrument in this repo measures single
 * frames. A still picture of a moving sea and a still picture of a still sea are
 * the same picture, which is why the LoD fade could take the motion out without
 * any of the existing measurements noticing.
 *
 * Grabs N frames a fixed wall-clock interval apart at one camera and reports the
 * mean absolute luma change per frame over WATER pixels, so the answer is in the
 * same units at every zoom.
 *
 *   node scripts/measure-ocean-motion.mjs --span 1.0 --anchor 0.5,0.5
 */
import { spawn } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  CdpConnection, browserCandidates, delay, evaluate, firstAccessible,
  navigate, readCamera, resolveCdpWebSocket,
} from "./capture-ninjaone-environment-mvp.mjs";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) out[argv[i].replace(/^--/, "")] = argv[i + 1];
  return out;
}

async function launch(executable, viewport) {
  const profile = await mkdtemp(path.join(os.tmpdir(), "ocean-motion-"));
  const child = spawn(executable, [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    `--window-size=${viewport.width},${viewport.height}`, "--force-device-scale-factor=1",
    "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
    "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows", "--enable-unsafe-swiftshader",
    "about:blank",
  ], { stdio: "ignore", windowsHide: true });
  const portFile = path.join(profile, "DevToolsActivePort");
  for (let i = 0; i < 200; i += 1) {
    try {
      const [port, browserPath] = (await readFile(portFile, "utf8")).trim().split(/\r?\n/);
      return { child, profile, websocketUrl: `ws://127.0.0.1:${port}${browserPath}` };
    } catch { await delay(50); }
  }
  child.kill();
  throw new Error("browser did not expose a CDP port");
}

async function setSpan(connection, sessionId, target, anchor) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const camera = await readCamera(connection, sessionId);
    if (Math.abs(camera.span[0] - target) <= 1e-6) return camera;
    const scale = Math.min(1.28, Math.max(1 / 1.28, target / camera.span[0]));
    await connection.send("Input.dispatchMouseEvent", {
      deltaX: 0, deltaY: Math.log(scale) / 0.00135, type: "mouseWheel",
      x: camera.rect.x + camera.rect.width * anchor[0],
      y: camera.rect.y + camera.rect.height * anchor[1],
    }, sessionId);
    await delay(40);
  }
  return readCamera(connection, sessionId);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [width, height] = (args.viewport ?? "1722x1082").split("x").map(Number);
  const frames = Number(args.frames ?? 6);
  const gapMs = Number(args.gap ?? 500);
  const target = new URL(args.url ?? "http://localhost:3000/");
  target.searchParams.set("water.capture", "1");
  for (const flag of (args.flags ?? "").split(",").filter(Boolean)) {
    const [key, value = "1"] = flag.split("=");
    target.searchParams.set(key, value);
  }

  const executable = await firstAccessible(browserCandidates());
  if (!executable) throw new Error("Chrome/Edge executable not found.");
  const launched = await launch(executable, { width, height });
  let connection = null;
  try {
    connection = await CdpConnection.connect(
      await resolveCdpWebSocket(`http://127.0.0.1:${new URL(launched.websocketUrl).port}`),
    );
    const { targetId } = await connection.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await connection.send("Target.attachToTarget", { flatten: true, targetId });
    await Promise.all([
      connection.send("Page.enable", {}, sessionId),
      connection.send("Runtime.enable", {}, sessionId),
      connection.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
      }, sessionId),
      connection.send("Emulation.setDeviceMetricsOverride", {
        deviceScaleFactor: 1, height, mobile: false, width,
      }, sessionId),
    ]);
    await navigate(connection, sessionId, target.toString());
    const anchor = (args.anchor ?? "0.5,0.5").split(",").map(Number);
    if (args.span) await setSpan(connection, sessionId, Number(args.span), anchor);
    await delay(Number(args.settle ?? 12) * 1000);

    // Without --page: the water canvas's own pixels, so the still land underneath
    // cannot dilute the answer. Needs ?water.capture for preserveDrawingBuffer.
    //
    // --page grabs the COMPOSITE rather than the water canvas. A brightness
    // statistic on the surf zone is not stable in one frame -- the surf pulses
    // with the wave sets, and a sweep taken one frame per setting measures the
    // phase it happened to land on, not the setting. Measured: the same
    // configuration read 1.36% and 0.73% bright in the innermost band twenty
    // minutes apart, and a four-point sweep clustered by capture batch instead
    // of by the value being swept. Several frames over at least a wave period,
    // averaged, is the smallest honest version.
    const rect = await evaluate(connection, sessionId,
      `(() => { const r = document.querySelector('.career-world__viewport')
          .getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`);
    const shots = [];
    for (let i = 0; i < frames; i += 1) {
      if (args.page) {
        // Page.captureScreenshot directly; the shared helper writes to a file and
        // this wants the bytes.
        const shot = await connection.send("Page.captureScreenshot", {
          captureBeyondViewport: false,
          clip: { ...rect, scale: 1 },
          format: "png",
          fromSurface: true,
        }, sessionId);
        shots.push(Buffer.from(shot.data, "base64"));
      } else {
        const dataUrl = await evaluate(connection, sessionId,
          `document.querySelector('.career-world__water-canvas').toDataURL('image/png')`);
        if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/png")) {
          throw new Error("water canvas returned no pixels -- is ?water.capture set?");
        }
        shots.push(Buffer.from(dataUrl.split(",")[1], "base64"));
      }
      if (i + 1 < frames) await delay(gapMs);
    }
    const camera = await readCamera(connection, sessionId);
    process.stdout.write(JSON.stringify({
      span: camera.span[0], origin: camera.origin, frames, gapMs,
      png: shots.map((b) => b.toString("base64")),
    }));
  } finally {
    connection?.close();
    launched.child.kill();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
