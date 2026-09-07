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
const REKEY = process.argv.includes("--rekey");      // key the delivered source again, no generation
const STANDING = ["menhir", "trilithon", "henge"].includes(WHICH);   // standing stones: anchored at their feet, their turf kept
const KEEP_GREEN = process.argv.includes("--keep-green") || STANDING;   // do not strip green-hued pixels (a panel's lichen is green too)
const NO_DESPILL = process.argv.includes("--no-despill");   // leave blended edge pixels as delivered
const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const argNum = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? Number(process.argv[i + 1]) : d; };
// the world's own kerb, measured on the old c3-1 at L0 (2048 px = 97.6 m): the
// stones with their groove stand about 45 px tall; a rune panel is 6-8 m, ~140 px
const KERB_PX = argNum("--kerb-px", 45), PANEL_PX = argNum("--panel-px", 140);
// standing stones (owner 2026-09-07: "think like stonehenge"): the world's
// boulders are ~40 px and its conifers ~70 px tall at L0, so a menhir stands
// about a boulder and a half, a trilithon a tree and a half, the henge ring
// about 11 m across
const MENHIR_PX = argNum("--menhir-px", 64), TRILITHON_PX = argNum("--trilithon-px", 110), HENGE_PX = argNum("--henge-px", 240);
const TAG = arg("--tag", "r1");                      // the element files' revision: <which>-element-<tag>.png
const WORKTAG = TAG === "r1" ? "" : `-${TAG}`;       // a second generation keeps its own working folder
const ROOT = process.cwd().replace(/\\/g, "/");
const OUT = "art-source/career-world/chain";
const WORK = ".codex-tmp/chain";
const REF = `${WORK}/kerb-reference.jpg`;
const CANON = "art-source/career-world/l2-land/ninjaone/seed/L2-seed-region-r2-source.png";
const LANDREF = `${WORK}/land-reference.jpg`;   // the world's ground at 1:1 (T c3-1: meadow, boulders, conifers, a cliff of columns)
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(WORK, { recursive: true });
if (!fs.existsSync(LANDREF)) {
  await sharp("public/career-world/layers/terrain/authority/tiles/l2-tanium/c3-1-site.webp").extract({ left: 0, top: 560, width: 1000, height: 640 }).jpeg({ quality: 92 }).toFile(LANDREF);
}
if (!fs.existsSync(REF)) {
  // the reference: the old c3-1's chain band (the kerb the owner accepted), from git
  const old = `${WORK}/c3-1-old-l2.png`;
  if (!fs.existsSync(old)) fs.writeFileSync(old, execFileSync("git", ["show", "f9b0a37e:art-source/career-world/l2-land/tanium/c3-1/c3-1-l2.png"], { maxBuffer: 64 * 1024 * 1024 }));
  const BL = 256, K = 2048, y0 = BL + Math.round(0.486 * K), y1 = BL + Math.round(0.541 * K);
  await sharp(old).extract({ left: BL, top: Math.min(y0, y1) - 70, width: K, height: Math.abs(y1 - y0) + 140 }).jpeg({ quality: 92 }).toFile(REF);
}
const refMeta = await sharp(REF).metadata();

const packets = {
  groove: `# The rune chain's GROOVE element — one generation, magenta key

You are the worker of an image pipeline. Deliver files into
\`${ROOT}/${WORK}/kerb${WORKTAG}/\` (create it). Work only there.

Load \`${ROOT}/${CANON}\` with the built-in \`view_image\` tool: the style canon of
this world (brush, palette family, the high-oblique view, the FLAT lighting).
The element you draw is the RUNE CHAIN as the canon describes it — owner's
words: "a slot cut DOWN into the bedrock, two cut walls and a floor, dark
inside because depth shades it, edges rounded, lichen in the joints, scrub
over the lip, rubble on the floor. It never wanders. NOT a path, road, kerb,
wall or ridge: the ground is REMOVED along it."

Then make ONE \`image_gen\` call in GENERATE mode (no image to edit) for a
SQUARE image, and deliver its raw output untouched as \`kerb-source.png\`.
Your prompt says, in words:

- The whole image is a FLAT, PURE MAGENTA background (red 255, green 0, blue 255)
  with exactly one thing on it: a single horizontal GROOVE running from the
  LEFT EDGE to the RIGHT EDGE across the vertical middle of the image, seen
  from the canon's high-oblique view (from above and a little in front). It is
  a slot cut down into pale weathered basalt: the FAR cut wall shows as a thin
  band of pale rock face above the dark floor, the floor is in shadow (dark,
  rubble and dust on it), the NEAR lip is a rounded edge of rock with lichen,
  tufts of scrub and a few loose stones hanging over it. Ancient, worn, the
  lips uneven and chipped, nothing straight-edged at the pixel level, but the
  line itself holds dead straight. Nothing raised: no kerb, no wall, no stones
  standing above the ground line.
- Its total height, lips included, is about one twentieth of the image's
  height; the dark floor is the widest part.
- The strip must TILE: where it leaves the right edge it must match exactly
  where it enters the left edge, so it can be repeated end to end without a
  visible join.
- Flat ambient light only: no sun, no cast shadow beyond the floor's own
  depth shading, no lit side. No ground, no grass beyond the tufts on the
  lip, nothing else anywhere — magenta everywhere the groove is not, with
  hard edges and no magenta halo.
- Nothing carved on it (no panels, no runes, no light): the plain slot.

Then write \`${ROOT}/${WORK}/kerb${WORKTAG}/report.json\`:
\`{ "element": "groove", "file": "kerb-source.png", "size": [w, h], "calls": 1, "notes": "..." }\`.
Do not resize, crop, recolour or key anything yourself. One call only.`,
  kerb: `# The rune chain's KERB element — one generation, magenta key

You are the worker of an image pipeline. Deliver files into
\`${ROOT}/${WORK}/kerb${WORKTAG}/\` (create it). Work only there.

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
  joints, no two stones alike.${process.env.KERB_VARIANT === "low" ? `
- LOW, like the reference and unlike a wall: ONE course of small rounded
  stones, each about as tall as it is wide and no taller, seen from above and
  a little in front so the TOPS of the stones show more than their faces; the
  whole strip, groove included, is about one twentieth of the image's height.
  Not a block wall, not two courses, not large square blocks.` : ""}
- The strip must TILE: where it leaves the right edge it must match exactly
  where it enters the left edge (same height, same stones cut at the edge), so
  the strip can be repeated end to end without a visible join.
- Flat ambient light only: no sun, no cast shadows, no lit side. No grass, no
  ground, no rocks, no trees, nothing else anywhere — magenta everywhere the
  chain is not. No soft magenta halo around the stones: hard edges.
- Nothing carved on it (no panels, no runes): this is the plain chain.

Then write \`${ROOT}/${WORK}/kerb${WORKTAG}/report.json\`:
\`{ "element": "kerb", "file": "kerb-source.png", "size": [w, h], "calls": 1, "notes": "..." }\`.
Do not resize, crop, recolour or key anything yourself. One call only.`,
  cluster: `# The rune chain's CLUSTER element — one generation, magenta key

You are the worker of an image pipeline. Deliver files into
\`${ROOT}/${WORK}/cluster${WORKTAG}/\` (create it). Work only there.

Load \`${ROOT}/${REF}\` with the built-in \`view_image\` tool: a strip of the
world's authored art with the RUNE PANELS of a settlement — round and square
cut slabs of pale weathered basalt, each carved with a mark, lying flat on the
ground. Also load \`${ROOT}/${CANON}\` (the style canon: brush, palette family,
the high-oblique view, flat lighting).

This world's rune chain is a metaphor for a network: endpoints cluster to a
LEADER and feed back to the chain. Then make ONE \`image_gen\` call in GENERATE
mode for a SQUARE image, and deliver its raw output untouched as
\`cluster-source.png\`. Your prompt says:

- The whole image is a FLAT, PURE MAGENTA background (red 255, green 0, blue 255)
  with exactly one group on it, centred: a LEADER — one carved rune panel like
  the reference's, a round slab of pale basalt about a fifth of the image
  wide, one weathered mark on it — and SIX to NINE ENDPOINTS around it in a
  loose ring at about one and a half leader-widths' distance: each endpoint a
  small plain standing stone of the same pale basalt, knee-high, a third of
  the leader's width, no two alike, each joined to the leader by a shallow
  scratch cut into the ground (a thin dark line, not raised).
- Same high-oblique view, same pale basalt, same scale as the reference.
- Flat ambient light only: no sun, no cast shadows. No grass, no ground,
  nothing else — magenta everywhere the stones and scratches are not, with
  hard edges and no magenta halo.

Then write \`${ROOT}/${WORK}/cluster${WORKTAG}/report.json\`:
\`{ "element": "cluster", "file": "cluster-source.png", "size": [w, h], "calls": 1, "notes": "..." }\`.
Do not resize, crop, recolour or key anything yourself. One call only.`,
  node: `# The rune chain's NODE element — one generation, magenta key

You are the worker of an image pipeline. Deliver files into
\`${ROOT}/${WORK}/node${WORKTAG}/\` (create it). Work only there.

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

Then write \`${ROOT}/${WORK}/node${WORKTAG}/report.json\`:
\`{ "element": "node", "file": "node-source.png", "size": [w, h], "calls": 1, "notes": "..." }\`.
Do not resize, crop, recolour or key anything yourself. One call only.`,
  menhir: `# The rune chain's MENHIR element — one generation, magenta key

You are the worker of an image pipeline. Deliver files into
\`${ROOT}/${WORK}/menhir${WORKTAG}/\` (create it). Work only there.

Load \`${ROOT}/${LANDREF}\` with the built-in \`view_image\` tool: the world's
ground at 1:1 — meadow, boulders about 40 px across, conifers about 70 px
tall, a cliff of basalt columns — in the canon's high-oblique view (from
above and a little in front: the tops of things show foreshortened, their
front faces show below). Also load \`${ROOT}/${CANON}\` (the style canon:
brush, palette family, flat lighting).

This world's rune chain is a network drawn as an ancient monument. The
ENDPOINTS are STANDING STONES — think Stonehenge: rough megaliths rooted in
the earth, not stones set upon it. Then make ONE \`image_gen\` call in GENERATE
mode for a SQUARE image, and deliver its raw output untouched as
\`menhir-source.png\`. Your prompt says, in words:

- The whole image is a FLAT, PURE MAGENTA background (red 255, green 0, blue 255)
  with exactly one group on it: SEVEN standing stones of pale weathered basalt,
  each a single unworked upright slab two to three times taller than wide,
  seen from the same high-oblique view (from above and a little in front, so
  the TOP of each stone shows as a narrow foreshortened face and its FRONT
  face shows tall below it), scattered loosely across the image with clear
  magenta between them — none touching, none overlapping — no two alike: some
  lean a little, one has fallen and lies half-sunk, one is broken short.
- Each stone carries ONE weathered rune cut into its front face (a different
  mark on each — a spiral, crossed lines, a lozenge, waves, a ring of dots, a
  branching line, a triangle), worn shallow, lichen in the cut.
- The foot of every stone ends in a ragged skirt of turf and packed earth —
  a few tufts of grass growing up against the stone, worn ground around the
  base — so it reads as rooted in the ground, grown into it over centuries.
- At the reference's scale: a stone stands about a boulder and a half tall,
  no taller than a conifer.
- Flat ambient light only: no sun, no cast shadows — only the depth shading
  under each stone's top edge and at its foot. No ground beyond each stone's
  own skirt, nothing else — magenta everywhere else, with hard edges and no
  magenta halo.

Then write \`${ROOT}/${WORK}/menhir${WORKTAG}/report.json\`:
\`{ "element": "menhir", "file": "menhir-source.png", "size": [w, h], "calls": 1, "notes": "..." }\`.
Do not resize, crop, recolour or key anything yourself. One call only.`,
  trilithon: `# The rune chain's TRILITHON element — one generation, magenta key

You are the worker of an image pipeline. Deliver files into
\`${ROOT}/${WORK}/trilithon${WORKTAG}/\` (create it). Work only there.

Load \`${ROOT}/${LANDREF}\` with the built-in \`view_image\` tool: the world's
ground at 1:1 — meadow, boulders about 40 px across, conifers about 70 px
tall, a cliff of basalt columns — in the canon's high-oblique view (from
above and a little in front). Also load \`${ROOT}/${CANON}\` (the style canon:
brush, palette family, flat lighting).

This world's rune chain is a network drawn as an ancient monument. A LEADER
on the chain is a TRILITHON — think Stonehenge: two uprights and a lintel,
rooted in the earth. Then make ONE \`image_gen\` call in GENERATE mode for a
SQUARE image, and deliver its raw output untouched as \`trilithon-source.png\`.
Your prompt says, in words:

- The whole image is a FLAT, PURE MAGENTA background (red 255, green 0, blue 255)
  with exactly one thing on it, centred and large: a TRILITHON of pale
  weathered basalt — two upright standing stones, each about three times
  taller than wide, standing a little apart, with a third stone lying across
  their tops as a lintel — seen from the same high-oblique view (from above
  and a little in front: the lintel's top face shows as a foreshortened band
  with its front face below it; the uprights' front faces show tall, their
  tops hidden under the lintel). Through the gap between the uprights,
  nothing but magenta.
- Each upright carries one weathered rune cut into its front face; the
  lintel is plain. Ancient, worn, chipped, lichen in the joints, nothing
  square-cut.
- The feet of the uprights end in a ragged skirt of turf and packed earth —
  tufts of grass growing up against the stone, worn ground around the base —
  so the monument reads as rooted in the ground, not set down on it.
- At the reference's scale the trilithon stands about a conifer and a half
  tall.
- Flat ambient light only: no sun, no cast shadows — only the depth shading
  under the lintel and at the feet. No ground beyond the skirt, nothing else —
  magenta everywhere else, with hard edges and no magenta halo.

Then write \`${ROOT}/${WORK}/trilithon${WORKTAG}/report.json\`:
\`{ "element": "trilithon", "file": "trilithon-source.png", "size": [w, h], "calls": 1, "notes": "..." }\`.
Do not resize, crop, recolour or key anything yourself. One call only.`,
  henge: `# The rune chain's HENGE element — one generation, magenta key

You are the worker of an image pipeline. Deliver files into
\`${ROOT}/${WORK}/henge${WORKTAG}/\` (create it). Work only there.

Load \`${ROOT}/${LANDREF}\` with the built-in \`view_image\` tool: the world's
ground at 1:1 — meadow, boulders about 40 px across, conifers about 70 px
tall, a cliff of basalt columns — in the canon's high-oblique view (from
above and a little in front). Also load \`${ROOT}/${CANON}\` (the style canon:
brush, palette family, flat lighting).

This world's rune chain is a network drawn as an ancient monument. The
SERVER, far off the chain, is a HENGE — Stonehenge itself: a ring of standing
stones rooted in the earth. Then make ONE \`image_gen\` call in GENERATE mode
for a SQUARE image, and deliver its raw output untouched as \`henge-source.png\`.
Your prompt says, in words:

- The whole image is a FLAT, PURE MAGENTA background (red 255, green 0, blue 255)
  with exactly one thing on it, centred and filling most of the image: a RING
  of about TWELVE standing stones of pale weathered basalt, seen from the same
  high-oblique view (from above and a little in front), so the ring is an
  ELLIPSE about three quarters as tall as it is wide: the stones at the back
  (top of the image) a little smaller and higher, the stones at the front
  (bottom) larger and lower, each an upright slab two to three times taller
  than wide, a few pairs joined at the top by lintels, two fallen and lying
  half-sunk; in the middle of the ring one large flat altar slab, half-sunk in
  the ground, with a big weathered spiral carved on it. Inside the ring and
  between the stones, nothing but magenta.
- Every stone's foot ends in a ragged skirt of turf and packed earth — tufts
  of grass growing up against the stone, worn ground around the base — so the
  ring reads as rooted in the ground, grown into it over centuries. Ancient,
  worn, chipped, lichen in the joints.
- At the reference's scale a stone stands about a conifer tall; the ring is
  about six conifers wide.
- Flat ambient light only: no sun, no cast shadows — only the depth shading
  under top edges and at the feet. No ground beyond each stone's skirt,
  nothing else — magenta everywhere else, with hard edges and no magenta halo.

Then write \`${ROOT}/${WORK}/henge${WORKTAG}/report.json\`:
\`{ "element": "henge", "file": "henge-source.png", "size": [w, h], "calls": 1, "notes": "..." }\`.
Do not resize, crop, recolour or key anything yourself. One call only.`,
};

const codex = (process.env.CODEX_BIN || "codex").replace(/\\/g, "/");
const model = process.env.CELL_MODEL || "gpt-5.6-sol", effort = process.env.CELL_EFFORT || "high";
async function generate(which) {
  const dir = `${WORK}/${which}${WORKTAG}`;
  fs.mkdirSync(dir, { recursive: true });
  const packet = `${dir}/packet.md`;
  fs.writeFileSync(packet, which === "kerb" && process.env.KERB_VARIANT === "groove" ? packets.groove : packets[which]);
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
  // the key colour is whatever the model actually used for the background —
  // the corners say: magenta as asked, or black (the r3 kerb came on black)
  const corner = (x, y) => { const o = (y * W + x) * 4; return [d[o], d[o + 1], d[o + 2]]; };
  const cs = [corner(2, 2), corner(W - 3, 2), corner(2, H - 3), corner(W - 3, H - 3)];
  const KEYC = cs.map((c) => c.join(",")).sort()[1].split(",").map(Number);   // a median-ish corner
  const black = Math.max(...KEYC) < 30;
  const alphaKeyed = d[3] === 0 && d[((H - 1) * W + (W - 1)) * 4 + 3] === 0;   // the model delivered real transparency instead of the key (the menhir and henge did, 2026-09-07): its own alpha is the key
  if (alphaKeyed) console.log("  " + which + ": the delivery carries its own alpha (transparent corners) — used as the key");
  const near = black ? 14 : 40, far = black ? 40 : 90;
  console.log(`  ${which}: key colour from the corners ${JSON.stringify(KEYC)} (${black ? "black" : "magenta"})`);
  let top = H, bottom = -1, n = 0;
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const o = (y * W + x) * 4, r = d[o], g = d[o + 1], b = d[o + 2];
    // a soft halo is keyed by its distance from the key colour
    const dist = Math.hypot(KEYC[0] - r, KEYC[1] - g, KEYC[2] - b);
    let a = alphaKeyed ? d[o + 3] : dist < near ? 0 : dist < far ? Math.round(255 * (dist - near) / (far - near)) : 255;
    // the model paints moss and grass tufts round stone whatever the packet
    // says: green-hued, saturated pixels are not the element (the stone is
    // pale and grey, the groove dark) — they go, and so does the key's spill
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0;
    const green = !KEEP_GREEN && g >= r && g >= b && sat > 0.28;
    if (green) a = 0;
    // red or magenta specks (the key's colour family bleeding at an edge, seen on the cluster's stones) are not stone either
    if (r > 150 && g < 90 && sat > 0.5) a = 0;
    if (a > 0 && a < 255 && !black && !alphaKeyed && !NO_DESPILL) {   // despill: take the key's share out of a blended edge pixel (a black key needs none — a dark edge reads as occlusion)
      const k = a / 255;
      for (let c = 0; c < 3; c += 1) d[o + c] = Math.max(0, Math.min(255, Math.round((d[o + c] - KEYC[c] * (1 - k)) / k)));
    }
    d[o + 3] = a;
    if (a > 0) { n += 1; if (y < top) top = y; if (y > bottom) bottom = y; }
  }
  if (n === 0) throw new Error(`${which}: nothing but magenta`);
  // one pass of erosion: a pixel keeps its alpha only if its four neighbours are not empty
  {
    const a0 = new Uint8Array(W * H); for (let p = 0; p < W * H; p += 1) a0[p] = d[p * 4 + 3];
    for (let y = 1; y < H - 1; y += 1) for (let x = 1; x < W - 1; x += 1) {
      const p = y * W + x;
      if (a0[p] && (!a0[p - 1] || !a0[p + 1] || !a0[p - W] || !a0[p + W])) d[p * 4 + 3] = Math.min(d[p * 4 + 3], 96);
    }
  }
  // the content's rows, counted where the alpha is solid (a faint keyed halo
  // reached the bottom edge of the first delivery and put 385 empty rows under
  // the kerb); the groove row = the darkest solid row, the layer's anchor
  const rowSolid = new Array(H).fill(0), rowLuma = new Array(H).fill(0);
  for (let y = 0; y < H; y += 1) { let c = 0, l = 0; for (let x = 0; x < W; x += 2) { const o = (y * W + x) * 4; if (d[o + 3] > 64) { c += 1; l += 0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2]; } } rowSolid[y] = c; rowLuma[y] = c ? l / c : 999; }
  let sTop = H, sBottom = -1; for (let y = 0; y < H; y += 1) if (rowSolid[y] > W / 40) { if (y < sTop) sTop = y; sBottom = y; }
  const pad = 6, y0 = Math.max(0, sTop - pad), y1 = Math.min(H - 1, sBottom + pad);
  let grooveRow = sTop; for (let y = sTop; y <= sBottom; y += 1) if (rowLuma[y] < rowLuma[grooveRow]) grooveRow = y;
  let out = await sharp(d, { raw: { width: W, height: H, channels: 4 } }).extract({ left: 0, top: y0, width: W, height: y1 - y0 + 1 }).png().toBuffer();
  console.log(`  ${which}: keyed, ${n} px of element, solid rows ${sTop}-${sBottom} of ${H}, darkest row ${grooveRow}`);
  let scale = 1;
  if (which === "kerb") {
    // tileable: crossfade the last 64 columns into the first 64
    const k = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const KW = k.info.width, KH = k.info.height, kd = k.data, F = 64;
    for (let y = 0; y < KH; y += 1) for (let x = 0; x < F; x += 1) {
      const t = x / F, a = (y * KW + x) * 4, b = (y * KW + KW - F + x) * 4;
      for (let c = 0; c < 4; c += 1) { const v = Math.round(kd[b + c] * (1 - t) + kd[a + c] * t); kd[a + c] = v; kd[b + c] = v; }
    }
    scale = KERB_PX / Math.max(1, sBottom - sTop + 1);
    out = await sharp(kd, { raw: { width: KW, height: KH, channels: 4 } }).resize(Math.round(KW * scale), Math.round(KH * scale), { kernel: "lanczos3" }).png().toBuffer();
    console.log(`  kerb: ${sBottom - sTop + 1} solid rows → scaled x${scale.toFixed(3)} to the world's kerb (${KERB_PX} px at L0)`);
  } else if (which === "cluster") {
    // the cluster: the leader panel is a fifth of the delivery's width and PANEL_PX in the world
    const k = await sharp(out).metadata();
    scale = PANEL_PX / Math.max(1, W / 5);
    out = await sharp(out).resize(Math.round(k.width * scale), Math.round(k.height * scale), { kernel: "lanczos3" }).png().toBuffer();
    console.log(`  cluster: scaled x${scale.toFixed(3)} (the leader ~${PANEL_PX} px at L0)`);
  } else if (which === "menhir") {
    // the tallest stone of the set is MENHIR_PX tall
    const k = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const KW = k.info.width, KH = k.info.height, kd = k.data, lab = new Int32Array(KW * KH); let tallest = 1;
    const st = [];
    for (let p = 0; p < KW * KH; p += 1) {
      if (kd[p * 4 + 3] <= 64 || lab[p]) continue;
      let miny = KH, maxy = 0, n = 0; st.push(p); lab[p] = 1;
      while (st.length) { const q = st.pop(); const x = q % KW, y = (q - x) / KW; n += 1; if (y < miny) miny = y; if (y > maxy) maxy = y;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= KW || yy >= KH) continue; const r = yy * KW + xx; if (!lab[r] && kd[r * 4 + 3] > 64) { lab[r] = 1; st.push(r); } } }
      if (n >= 400 && maxy - miny + 1 > tallest) tallest = maxy - miny + 1;
    }
    scale = MENHIR_PX / tallest;
    out = await sharp(out).resize(Math.round(KW * scale), Math.round(KH * scale), { kernel: "lanczos3" }).png().toBuffer();
    console.log(`  menhir: tallest stone ${tallest} rows → scaled x${scale.toFixed(3)} (${MENHIR_PX} px at L0)`);
  } else if (which === "trilithon") {
    const k = await sharp(out).metadata();
    scale = TRILITHON_PX / Math.max(1, sBottom - sTop + 1);
    out = await sharp(out).resize(Math.round(k.width * scale), Math.round(k.height * scale), { kernel: "lanczos3" }).png().toBuffer();
    console.log(`  trilithon: ${sBottom - sTop + 1} rows → scaled x${scale.toFixed(3)} (${TRILITHON_PX} px at L0)`);
  } else if (which === "henge") {
    // the ring's width is HENGE_PX: the solid columns
    const k = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const KW = k.info.width, KH = k.info.height, kd = k.data; let cL = KW, cR = -1;
    for (let x = 0; x < KW; x += 1) { let c = 0; for (let y = 0; y < KH; y += 2) if (kd[(y * KW + x) * 4 + 3] > 64) c += 1; if (c > KH / 80) { if (x < cL) cL = x; cR = x; } }
    scale = HENGE_PX / Math.max(1, cR - cL + 1);
    out = await sharp(out).resize(Math.round(KW * scale), Math.round(KH * scale), { kernel: "lanczos3" }).png().toBuffer();
    console.log(`  henge: ${cR - cL + 1} solid columns → scaled x${scale.toFixed(3)} (${HENGE_PX} px at L0)`);
  } else {
    // panels: the group is about three panels tall; a panel is PANEL_PX
    const k = await sharp(out).metadata();
    scale = (3 * PANEL_PX) / Math.max(1, k.height);
    out = await sharp(out).resize(Math.round(k.width * scale), Math.round(k.height * scale), { kernel: "lanczos3" }).png().toBuffer();
    console.log(`  node: scaled x${scale.toFixed(3)} (a panel ~${PANEL_PX} px at L0)`);
  }
  const file = `${OUT}/${which}-element-${TAG}.png`;
  fs.writeFileSync(file, out);
  const m = await sharp(file).metadata();
  fs.writeFileSync(`${OUT}/${which}-element-${TAG}.json`, JSON.stringify({ element: which, width: m.width, height: m.height, anchorRow: Math.round(((STANDING ? sBottom : grooveRow) - y0 + 0.5) * scale), standing: STANDING, source: src, keyed: new Date().toISOString(), note: which === "kerb" ? "anchorRow = the groove (the darkest row): build-chain-layer.mjs puts it on the route" : "anchorRow = the darkest row; the panels' band is centred on the route" }, null, 1));
  console.log(`  ${which}: ${file} ${m.width}x${m.height}, anchor row ${Math.round((grooveRow - y0 + 0.5) * scale)}`);
  return file;
}

for (const which of WHICH === "both" ? ["kerb", "node"] : [WHICH]) {
  const src = REKEY ? `${WORK}/${which}${WORKTAG}/${which}-source.png` : await generate(which);
  if (src && fs.existsSync(src)) await key(src, which);
  else if (REKEY) console.log(`  ${which}: no delivered source to re-key`);
}
