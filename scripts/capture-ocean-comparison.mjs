#!/usr/bin/env node
/**
 * Capture the live ocean layer to a PNG, for comparison against the offline
 * renderer on the same scene.
 *
 * The point of this script is that foam and spray are INTEGRATED, so a capture
 * of water that has not run is a capture of a sea with no surf in it. It waits
 * real seconds with the page visible and the simulation stepping, then clips
 * exactly the water canvas so the result is registered with the world fields.
 *
 *   node scripts/capture-ocean-comparison.mjs --out live.png --flags water.raw=1
 */
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  CdpConnection, browserCandidates, delay, evaluate, firstAccessible,
  navigate, readCamera, resolveCdpWebSocket, screenshot,
} from "./capture-ninjaone-environment-mvp.mjs";

const CANVAS = ".career-world__water-canvas";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) out[argv[i].replace(/^--/, "")] = argv[i + 1];
  return out;
}

async function launch(executable, viewport) {
  const profile = await mkdtemp(path.join(os.tmpdir(), "ocean-capture-"));
  const child = spawn(executable, [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    `--window-size=${viewport.width},${viewport.height}`,
    "--force-device-scale-factor=1",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    // The simulation has to actually STEP. A throttled or backgrounded renderer
    // gives a picture of water that has never moved, which is the exact failure
    // this whole comparison exists to avoid.
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "--enable-unsafe-swiftshader",
    "about:blank",
  ], { stdio: "ignore", windowsHide: true });
  const { readFile } = await import("node:fs/promises");
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

/**
 * Zoom to `target` span, anchored at a point in the viewport.
 *
 * The anchor is the whole trick: the app zooms about the cursor, so a world
 * point under the anchor STAYS under it. Starting from full extent, an anchor
 * at (u, v) therefore lands the view on world (u, v) -- which is how a capture
 * gets framed on a coastline rather than on whatever happens to be mid-map.
 */
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
  const out = path.resolve(args.out ?? "live-ocean.png");
  const settle = Number(args.settle ?? 12);
  const [width, height] = (args.viewport ?? "1722x1082").split("x").map(Number);
  const flags = (args.flags ?? "").split(",").filter(Boolean);
  // Merge into whatever query the base URL already has. Concatenating with "?"
  // produced ".../?layers=1?water.capture=1", where water.capture is not a
  // parameter at all -- so preserveDrawingBuffer stayed off and --canvas-only
  // silently returned a fully transparent image, which reads exactly like a sea
  // that rendered nothing.
  const target = new URL(args.url ?? "http://localhost:3000/");
  for (const flag of ["water.capture=1", ...flags]) {
    const [key, value = "1"] = flag.split("=");
    target.searchParams.set(key, value);
  }
  const url = target.toString();

  await mkdir(path.dirname(out), { recursive: true });
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
    const errors = [];
    connection.on((m) => {
      if (m.method === "Runtime.exceptionThrown") {
        errors.push(m.params.exceptionDetails?.exception?.description
          ?? m.params.exceptionDetails?.text ?? "exception");
      }
    });
    await navigate(connection, sessionId, url);
    // --hide L2,L3,L4 turns those layers off through the layer inspector before
    // capturing. Measuring water statistics through the land art biases exactly
    // the band that matters: near the shore the water canvas is partly
    // transparent, so surf-zone pixels pick up whatever is painted underneath.
    // --show turns layers ON the same way --hide turns them off.
    if (args.show) {
      const ids = args.show.split(",").map((v) => v.trim()).filter(Boolean);
      const shown = await evaluate(connection, sessionId, `(() => {
        const want = ${JSON.stringify(ids)};
        const rows = [...document.querySelectorAll('[data-layer-inspector] label')];
        const done = [];
        for (const id of want) {
          const row = rows.find((r) => r.textContent.trim().startsWith(id));
          const box = row && row.querySelector('input');
          if (box && !box.checked && !box.disabled) { box.click(); done.push(id); }
        }
        return done.join(',');
      })()`);
      console.log("showed layers:", shown || "(none)");
      await delay(600);
    }
    if (args.hide) {
      const ids = args.hide.split(",").map((v) => v.trim()).filter(Boolean);
      const hidden = await evaluate(connection, sessionId, `(() => {
        const want = ${JSON.stringify(ids)};
        const rows = [...document.querySelectorAll('[data-layer-inspector] label')];
        const done = [];
        for (const id of want) {
          const row = rows.find((r) => r.textContent.trim().startsWith(id)
            && !/^${"$"}/.test(id));
          const box = row && row.querySelector('input');
          if (box && box.checked && !box.disabled) { box.click(); done.push(id); }
        }
        return done.join(',');
      })()`);
      console.log("hid layers:", hidden || "(none)");
      await delay(600);
    }
    // --view ninjaone flies to the CAPITAL COAST, which is the only stretch of
    // this world with finished land art -- and therefore the only camera where
    // the sea can be judged against the style it has to belong to. Reviewing
    // the water anywhere else compares it to generic terrain and proves
    // nothing (owner, 2026-08-31). The fly-to is a fixed camera (origin
    // 0.125,0 span 0.25), so this is reproducible in a way --span/--anchor is
    // not: the zoom walk lands wherever the clamp puts it.
    if (args.view) {
      const clicked = await evaluate(connection, sessionId, `(() => {
        const want = ${JSON.stringify(String(args.view))}.toLowerCase();
        const b = [...document.querySelectorAll('button')]
          .find((x) => x.textContent.trim().toLowerCase() === want);
        if (!b) return 'not found';
        b.click();
        return 'clicked';
      })()`);
      console.log("view:", args.view, clicked);
      await delay(9000);
    }
    const anchor = (args.anchor ?? "0.5,0.5").split(",").map(Number);
    if (args.span) await setSpan(connection, sessionId, Number(args.span), anchor);

    // Count frames so the capture can PROVE the simulation ran rather than
    // assume it. A capture with zero frames is the failure mode, not an edge case.
    await evaluate(connection, sessionId,
      `window.__oceanFrames = 0; (function tick(){ window.__oceanFrames++; requestAnimationFrame(tick); })(); true`);
    await delay(settle * 1000);
    const frames = await evaluate(connection, sessionId, `window.__oceanFrames`);
    // --probe dumps the intermediate fields after the settle. Working out which
    // driver is starved by looking at the rendered picture is guesswork; this
    // reads the field the shader actually computed. Needs ?water.probe.
    if (args.probe) {
      console.log("PROBE " + await evaluate(connection, sessionId,
        `JSON.stringify(window.__oceanProbe ? window.__oceanProbe() : null)`));
    }
    const camera = await readCamera(connection, sessionId);
    // Fall back to the viewport when the water canvas is gone -- hiding L1
    // unmounts it, and that capture (the land alone) is exactly the one needed
    // to ask what the ocean's mask is missing.
    const rect = await evaluate(connection, sessionId,
      `(() => { const el = document.querySelector('${CANVAS}')
          ?? document.querySelector('.career-world__viewport');
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`);
    if (args["canvas-only"]) {
      // The water canvas's OWN pixels, before the page composites anything over
      // them. A page screenshot cannot separate "the sea has no surf" from "the
      // surf is drawn and then painted over by a layer above it", and those need
      // opposite fixes. Needs ?water.capture for preserveDrawingBuffer.
      const dataUrl = await evaluate(connection, sessionId,
        `document.querySelector('${CANVAS}').toDataURL('image/png')`);
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/png")) {
        throw new Error("water canvas returned no pixels -- is ?water.capture set?");
      }
      await writeFile(out, Buffer.from(dataUrl.split(",")[1], "base64"));
    } else {
      await screenshot(connection, sessionId, out, { ...rect, scale: 1 });
    }
    // Write the camera the app ACTUALLY settled on, beside the image.
    //
    // --span is a request, not a promise: the zoom loop walks in bounded steps
    // and the app clamps, so asking for 0.05 can land on 0.0825. Analysis that
    // assumes the requested span crops the wrong region of the world and then
    // reports statistics for water that is really the city. Read this file.
    await writeFile(`${out}.camera.json`, JSON.stringify({
      origin: camera.origin, span: camera.span, canvas: rect, url, frames,
    }, null, 1));
    const probe = flags.some((f) => f.startsWith("water.probe"))
      ? await evaluate(connection, sessionId,
        `JSON.stringify(window.__oceanProbe ? window.__oceanProbe() : null)`)
      : null;
    if (probe) {
      const fields = JSON.parse(probe);
      console.log("");
      console.log("-- wave pass channels, read back off the GPU --");
      for (const [name, s] of Object.entries(fields ?? {})) {
        console.log(`  ${name.padEnd(16)} mean ${s.mean.toFixed(4)}  p95 ${s.p95.toFixed(4)}`
          + `  p99 ${s.p99.toFixed(4)}  max ${s.max.toFixed(3)}`
          + `  >0.1 ${(s.over01 * 100).toFixed(2)}%  >0.5 ${(s.over05 * 100).toFixed(2)}%`);
      }
    }
    console.log(JSON.stringify({
      out, frames, camera: { origin: camera.origin, span: camera.span },
      canvas: rect, errors: errors.slice(0, 5), url,
    }, null, 1));
    if (frames < settle * 10) throw new Error(`only ${frames} frames in ${settle}s -- simulation did not run`);
  } finally {
    connection?.close?.();
    launched.child.kill();
    await rm(launched.profile, { force: true, recursive: true }).catch(() => {});
  }
}

main().catch((error) => { console.error(error.message); process.exit(1); });
