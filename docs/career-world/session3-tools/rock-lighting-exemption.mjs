// Does the rock-lighting gate have a blind spot, and is anything sitting in it?
//
// The gate is report-only below 5000 strong rock edges, because the first
// circular moment is noisy on a small sample. Six accepted cells across both
// territories scored OVER the 0.16 limit and passed on that exemption, with
// samples of 874 to 2991 — and three of them are NinjaOne cells that have been
// in the world since 2026-09-02.
//
// A number cannot settle whether 1930 samples is enough. This puts the exempted
// cells beside cells that passed the gate outright, at the same size, so the
// question becomes what it actually is: does that one have a lit side?
//
//   node docs/career-world/session3-tools/rock-lighting-exemption.mjs
import fs from "node:fs";
import sharp from "sharp";
sharp.cache(false);

const OUT = "docs/career-world/session3-tools/rock-lighting-exemption.png";
const A = "public/career-world/layers/terrain/authority/manifests";

const rows = [];
for (const t of ["ninjaone", "tanium"]) {
  const p = `${A}/terrain-l2-${t}-r1.json`;
  if (!fs.existsSync(p)) continue;
  for (const [id, c] of Object.entries(JSON.parse(fs.readFileSync(p, "utf8")).cells)) {
    const g = (c.gates || []).find((x) => x.name === "rock lighting");
    if (!g) continue;
    const s = String(g.value);
    const v = parseFloat(s);
    const n = Number((s.match(/n (\d+)/) || [])[1] ?? Infinity);
    const art = `art-source/career-world/l2-land/${t}/${id}/${id}-l2.png`;
    if (!Number.isFinite(v) || !fs.existsSync(art)) continue;
    rows.push({ t, id, biome: c.biome, v, n, exempt: s.includes("report-only"), art });
  }
}
const exempt = rows.filter((r) => r.exempt && r.v >= 0.16).sort((a, b) => b.v - a.v);
const clean = rows.filter((r) => !r.exempt).sort((a, b) => a.v - b.v).slice(0, 4);

const TILE = 520, PAD = 14, LABEL = 46, COLS = 5;
const items = [...exempt.map((r) => ({ ...r, head: "EXEMPTED", colour: "#ff9d5c" })),
  ...clean.map((r) => ({ ...r, head: "passed outright", colour: "#8fe06a" }))];
const rowsN = Math.ceil(items.length / COLS);
const W = COLS * (TILE + PAD) - PAD, H = 84 + rowsN * (TILE + LABEL + PAD) - PAD;

const comps = [], svg = [];
svg.push(`<text x="14" y="34" fill="#f0f5fa" font-family="Georgia,serif" font-size="26">`
  + `Rock lighting: the cells the gate let through, beside the cells it measured</text>`);
svg.push(`<text x="14" y="62" fill="#9db0c2" font-family="monospace" font-size="15">`
  + `Orange scored OVER the 0.16 limit but had too few strong rock edges to be gated. `
  + `Green passed on a full measurement. Do the orange ones have a lit side?</text>`);

for (const [i, r] of items.entries()) {
  const x = (i % COLS) * (TILE + PAD), y = 84 + Math.floor(i / COLS) * (TILE + LABEL + PAD);
  comps.push({ input: await sharp(r.art).resize(TILE, TILE, { fit: "cover" }).png().toBuffer(), left: x, top: y });
  svg.push(`<rect x="${x}" y="${y}" width="${TILE}" height="${TILE}" fill="none" stroke="${r.colour}" stroke-width="3"/>`);
  svg.push(`<text x="${x + 2}" y="${y + TILE + 18}" fill="#e8eef4" font-family="monospace" font-size="14">${r.t} ${r.id}  ${r.biome}</text>`);
  svg.push(`<text x="${x + 2}" y="${y + TILE + 36}" fill="${r.colour}" font-family="monospace" font-size="14">`
    + `${r.head}  ${r.v.toFixed(3)}${Number.isFinite(r.n) ? `  n ${r.n}` : ""}</text>`);
}

await sharp({ create: { width: W, height: H, channels: 4, background: { r: 13, g: 22, b: 32, alpha: 255 } } })
  .composite([...comps, { input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg.join("")}</svg>`), left: 0, top: 0 }])
  .png().toFile(OUT);

const st = await sharp(OUT).stats();
const mean = st.channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3;
console.log(`wrote ${OUT}  ${W} x ${H}   mean luminance ${mean.toFixed(1)} ${mean > 25 ? "(art present)" : "(BLANK)"}`);
for (const r of items) console.log(`  ${r.head.padEnd(16)} ${r.t} ${r.id}  ${r.v.toFixed(3)}  n ${r.n}`);
