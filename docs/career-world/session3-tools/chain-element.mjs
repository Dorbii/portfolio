// THE CHAIN'S ELEMENTS, generated once (owner 2026-09-06: the rune chain is a
// layer drawn over the land, not seven cells' guesses). Two worker jobs in the
// pipeline's own conventions (Codex exec + the built-in image_gen, generate
// mode, one call each), each on a flat magenta key that is removed here:
//   kerb — a horizontal strip of the chain exactly as the old c3-1 drew it
//          (the reference crop): a low kerb of pale fitted basalt with the dark
//          groove along its foot, tileable left to right;
//   node — the rune panels that flank the groove at a settlement.
// Outputs art-source/career-world/chain/kerb-element-r1.png and
// node-element-r1.png (RGBA), scaled to the world's own kerb size, plus the
// raw deliveries and logs under .codex-tmp/chain/.
//
//   node docs/career-world/session3-tools/chain-element.mjs [kerb|node|both] [--dry]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
sharp.cache(false);
const WHICH = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "both";
const DRY = process.argv.includes("--dry");
const ROOT = process.cwd().replace(/\\/g, "/");
const OUT = "art-source/career-world/chain";
const WORK = ".codex-tmp/chain";
const REF = `${WORK}/kerb-reference.jpg`;
const CANON = "art-source/career-world/l2-land/ninjaone/seed/L2-seed-region-r2-source.png";
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(WORK, { recursive: true });
if (!fs.existsSync(REF)) {
  // the reference: the old c3-1's chain band (the kerb the owner accepted), from git
  const old = `${WORK}/c3-1-old-l2.png`;
  if (!fs.existsSync(old)) fs.writeFileSync(old, execFileSync("git", ["show", "f9b0a37e:art-source/career-world/l2-land/tanium/c3-1/c3-1-l2.png"], { maxBuffer: 64 * 1024 * 1024 }));
  const BL = 256, K = 2048, y0 = BL + Math.round(0.486 * K), y1 = BL + Math.round(0.541 * K);
  await sharp(old).extract({ left: BL, top: Math.min(y0, y1) - 70, width: K, height: Math.abs(y1 - y0) + 140 }).jpeg({ quality: 92 }).toFile(REF);
}
const refMeta = await sharp(REF).metadata();

const packets = {
  kerb: `# The rune chain's KERB element — one generation, magenta key

You are the worker of an image pipeline. Deliver files into
\`${ROOT}/${WORK}/kerb/\` (create it). Work only there.

Load \`${ROOT}/${REF}\` with the built-in \`view_image\` tool: it is a strip of
the world's authored art showing the RUNE CHAIN as it must look — a low kerb of
pale, fitted, weathered basalt stones seen from a high-oblique view, with the
DARK GROOVE running along the foot of the kerb, on meadow. Also load
\`${ROOT}/${CANON}\` (the style canon: brush, palette family, flat lighting).

Then make ONE \`image_gen\` call in GENERATE mode (no image to edit) for a
SQUARE image, and deliver its raw output untouched as \`kerb-source.png\`.
Your prompt says, in words:

- The whole image is a FLAT, PURE MAGENTA background (red 255, green 0, blue 255)
  with exactly one thing on it: a single horizontal strip of the rune chain
  running from the LEFT EDGE to the RIGHT EDGE across the vertical middle of
  the image — the same kerb of pale fitted basalt stones and the same dark
  groove along its foot as in the reference, at the same scale relative to the
  stones, seen from the same high-oblique view, weathered, lichen in the
  joints, no two stones alike.
- The strip must TILE: where it leaves the right edge it must match exactly
  where it enters the left edge (same height, same stones cut at the edge), so
  the strip can be repeated end to end without a visible join.
- Flat ambient light only: no sun, no cast shadows, no lit side. No grass, no
  ground, no rocks, no trees, nothing else anywhere — magenta everywhere the
  chain is not. No soft magenta halo around the stones: hard edges.
- Nothing carved on it (no panels, no runes): this is the plain chain.

Then write \`${ROOT}/${WORK}/kerb/report.json\`:
\`{ "element": "kerb", "file": "kerb-source.png", "size": [w, h], "calls": 1, "notes": "..." }\`.
Do not resize, crop, recolour or key anything yourself. One call only.`,
  node: `# The rune chain's NODE element — one generation, magenta key

You are the worker of an image pipeline. Deliver files into
\`${ROOT}/${WORK}/node/\` (create it). Work only there.

Load \`${ROOT}/${REF}\` with the built-in \`view_image\` tool: a strip of the
world's authored art showing the RUNE CHAIN — a low kerb of pale fitted basalt
with a dark groove at its foot — and beside it the RUNE PANELS of a settlement:
round and square cut slabs of the same pale basalt, each about 6-8 m across at
that scale (a little wider than the kerb is tall), each carved with a different
weathered mark, lying flat on the ground. Also load \`${ROOT}/${CANON}\` (the
style canon: brush, palette family, flat lighting).

Then make ONE \`image_gen\` call in GENERATE mode for a SQUARE image, and
deliver its raw output untouched as \`node-source.png\`. Your prompt says:

- The whole image is a FLAT, PURE MAGENTA background (red 255, green 0, blue 255)
  with exactly one group on it: SIX to EIGHT rune panels like the reference's,
  scattered loosely in a band across the vertical middle of the image, some
  above and some below an imaginary horizontal line through the centre, none
  on the line itself (leave a clear horizontal gap about one panel tall along
  the centre for the chain to run through), each a different mark, weathered,
  some part-broken, none larger than the others, nothing at the exact middle.
- Same high-oblique view, same pale basalt, same scale as the reference.
- Flat ambient light only: no sun, no cast shadows. No grass, no ground, no
  kerb, nothing else — magenta everywhere a panel is not, with hard edges.

Then write \`${ROOT}/${WORK}/node/report.json\`:
\`{ "element": "node", "file": "node-source.png", "size": [w, h], "calls": 1, "notes": "..." }\`.
Do not resize, crop, recolour or key anything yourself. One call only.`,
};

const codex = (process.env.CODEX_BIN || "codex").replace(/\\/g, "/");
const model = process.env.CELL_MODEL || "gpt-5.6-sol", effort = process.env.CELL_EFFORT || "high";
async function generate(which) {
  const dir = `${WORK}/${which}`;
  fs.mkdirSync(dir, { recursive: true });
  const packet = `${dir}/packet.md`;
  fs.writeFileSync(packet, packets[which]);
  const runner = `${dir}/run.sh`;
  fs.writeFileSync(runner, `#!/usr/bin/env bash
set -uo pipefail
cd "${ROOT}"
"${codex}" exec --sandbox workspace-write -c sandbox_workspace_write.network_access=true -c model=${model} -c model_reasoning_effort=${effort} "$(cat ${ROOT}/${packet})" < /dev/null > "${ROOT}/${dir}/codex.log" 2>&1
`);
  if (DRY) { console.log(`  ${which}: packet at ${packet} (dry)`); return null; }
  console.log(`  ${which}: worker dispatched (${model}, ${effort}) …`);
  const t0 = Date.now();
  try { execFileSync("bash", [runner], { stdio: "inherit" }); } catch (e) { console.log(`  ${which}: worker exited ${e.status} — see ${dir}/codex.log`); }
  const src = `${dir}/${which}-source.png`;
  if (!fs.existsSync(src)) { console.log(`  ${which}: nothing delivered after ${((Date.now() - t0) / 60000).toFixed(1)} min — see ${dir}/codex.log`); return null; }
  console.log(`  ${which}: delivered in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  return src;
}

// magenta key → alpha; crop to the content's rows; the kerb is made tileable and scaled
async function key(src, which) {
  const img = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = img.info.width, H = img.info.height, d = img.data;
  let top = H, bottom = -1, n = 0;
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const o = (y * W + x) * 4, r = d[o], g = d[o + 1], b = d[o + 2];
    // magenta: red and blue high, green low; a soft halo is keyed by its distance from magenta
    const dist = Math.hypot(255 - r, g, 255 - b);
    const a = dist < 40 ? 0 : dist < 90 ? Math.round(255 * (dist - 40) / 50) : 255;
    d[o + 3] = a;
    if (a > 0) { n += 1; if (y < top) top = y; if (y > bottom) bottom = y; }
  }
  if (n === 0) throw new Error(`${which}: nothing but magenta`);
  const pad = 8, y0 = Math.max(0, top - pad), y1 = Math.min(H - 1, bottom + pad);
  let out = await sharp(d, { raw: { width: W, height: H, channels: 4 } }).extract({ left: 0, top: y0, width: W, height: y1 - y0 + 1 }).png().toBuffer();
  console.log(`  ${which}: keyed, ${n} px of element, rows ${y0}-${y1} of ${H}`);
  if (which === "kerb") {
    // tileable: crossfade the last 64 columns into the first 64
    const k = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const KW = k.info.width, KH = k.info.height, kd = k.data, F = 64;
    for (let y = 0; y < KH; y += 1) for (let x = 0; x < F; x += 1) {
      const t = x / F, a = (y * KW + x) * 4, b = (y * KW + KW - F + x) * 4;
      for (let c = 0; c < 4; c += 1) { const v = Math.round(kd[b + c] * (1 - t) + kd[a + c] * t); kd[a + c] = v; kd[b + c] = v; }
    }
    // scale so the kerb's opaque height matches the reference's (the band the world already shows)
    let rows = 0; for (let y = 0; y < KH; y += 1) { let any = false; for (let x = 0; x < KW; x += 8) if (kd[(y * KW + x) * 4 + 3] > 128) { any = true; break; } if (any) rows += 1; }
    const refKerb = Math.round(refMeta.height * 0.45);   // the kerb with its groove is about 45% of the reference band's height
    const scale = refKerb / Math.max(1, rows);
    out = await sharp(kd, { raw: { width: KW, height: KH, channels: 4 } }).resize(Math.round(KW * scale), Math.round(KH * scale), { kernel: "lanczos3" }).png().toBuffer();
    console.log(`  kerb: ${rows} opaque rows → scaled x${scale.toFixed(3)} to match the world's kerb (${refKerb} px)`);
  } else {
    const k = await sharp(out).metadata();
    const scale = (refMeta.height * 0.6) / Math.max(1, k.height / 3);   // panels: the band is about three panels tall
    out = await sharp(out).resize(Math.round(k.width * scale), Math.round(k.height * scale), { kernel: "lanczos3" }).png().toBuffer();
    console.log(`  node: scaled x${scale.toFixed(3)}`);
  }
  const file = `${OUT}/${which}-element-r1.png`;
  fs.writeFileSync(file, out);
  const m = await sharp(file).metadata();
  console.log(`  ${which}: ${file} ${m.width}x${m.height}`);
  return file;
}

for (const which of WHICH === "both" ? ["kerb", "node"] : [WHICH]) {
  const src = await generate(which);
  if (src) await key(src, which);
}
