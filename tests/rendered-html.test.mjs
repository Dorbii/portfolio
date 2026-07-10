import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the evidence-map portfolio shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();

  assert.match(html, /<title>Steven Doris — Systems for controlled work<\/title>/i);
  assert.match(html, /I build systems that turn complexity into controlled work\./);
  assert.match(html, /Relationship map/);
  assert.match(html, /Agent protocols/);
  assert.match(html, /VM platform/);
  assert.match(html, /Kinforge/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|SkeletonPreview/i);
});

test("keeps map interaction and evidence language in the source", async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /aria-pressed=\{active\}/);
  assert.match(page, /evidence strength \$\{node\.strength\} of 6/);
  assert.match(page, /const kindForMode: Record<MapMode, NodeKind>/);
  assert.match(page, /modeMatch: node\.kind === kindForMode\[mode\]/);
  assert.match(page, /Compression claims are kept scoped to controlled comparisons/);
  assert.match(page, /deterministic replay/);
  assert.doesNotMatch(page, /system online|state change|v\d+\.\d+/i);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /\.map-node\.is-subdued/);
});
