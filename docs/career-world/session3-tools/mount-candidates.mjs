// Every current CANDIDATE — an unauthored cell whose working folder holds a
// land layer — snapshotted as a review tile for the local land mount, so the
// live server previews the whole island as it stands (owner 2026-09-05:
// "seeing it in full like this helps my eyes spot defects"; "if the mount
// has stale land please update it as you are land authority"). Writes the
// site webp per candidate under tiles/l2-review/, removes review tiles of
// cells that are no longer candidates (accepted, or cleared), and rewrites
// art-source/career-world/land-mount-r1.json — the config
// scripts/build-land-mount.mjs (the Codex water lane's) reads to compose the
// mount. Run before `npm run build:land-mount` and `npm run build:water`.
// Candidates are previews, never acceptance: the ledgers are untouched.
//
//   node docs/career-world/session3-tools/mount-candidates.mjs [--dry]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
sharp.cache(false);
const DRY = process.argv.includes("--dry");
// --tone <gains.json>: a candidate takes the MEAN of its authored neighbours'
// serve-time gains (it has none of its own), applied as the same bilinear field
// world-register.mjs uses, so a preview does not stand out from equalised land.
const toneArg = process.argv.indexOf("--tone");
const TONE = toneArg >= 0 ? process.argv[toneArg + 1] : null;
const gains = new Map();
if (TONE && fs.existsSync(TONE)) for (const c of JSON.parse(fs.readFileSync(TONE, "utf8")).cells) gains.set(c.world.join(","), c.gain);
function applyTone(raw, size, wx, wy) {
  const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => gains.get(`${wx + dx},${wy + dy}`)).filter((g) => g !== undefined);
  const own = nb.length ? nb.reduce((s, g) => s + g, 0) / nb.length : 1;
  const at = (x, y) => gains.get(`${x},${y}`) ?? own;
  for (let y = 0; y < size; y += 1) {
    const fy = (y + 0.5) / size - 0.5, sy = fy < 0 ? -1 : 1, ty = Math.abs(fy);
    for (let x = 0; x < size; x += 1) {
      const fx = (x + 0.5) / size - 0.5, sx = fx < 0 ? -1 : 1, tx = Math.abs(fx);
      const g = own * (1 - tx) * (1 - ty) + at(wx + sx, wy) * tx * (1 - ty) + at(wx, wy + sy) * (1 - tx) * ty + at(wx + sx, wy + sy) * tx * ty;
      const o = (y * size + x) * 4;
      for (let k = 0; k < 3; k += 1) raw[o + k] = Math.min(255, Math.round(raw[o + k] * g));
    }
  }
  return own;
}
const ART = "art-source/career-world/l2-land", A = "public/career-world/layers/terrain/authority";
const REVIEW = `${A}/tiles/l2-review`, CONFIG = "art-source/career-world/land-mount-r1.json";
const KEPT = 2048, BLEED = 256;
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const root = process.cwd().replace(/\\/g, "/");

const cells = [];
for (const t of ["tanium", "ninjaone", "coast"]) {
  const defFile = `${ART}/${t}/territory.def.json`, ledgerFile = `${A}/manifests/terrain-l2-${t}-r1.json`;
  if (!fs.existsSync(defFile) || !fs.existsSync(ledgerFile)) continue;
  const def = JSON.parse(fs.readFileSync(defFile, "utf8"));
  const ledger = JSON.parse(fs.readFileSync(ledgerFile, "utf8"));
  // (cell.mjs rewrites a ledger at each acceptance without the registration
  // block; world-register.mjs restores it, and build-land-mount.mjs needs it —
  // so run this after world-register.mjs, never in between)
  if (!ledger.registration?.block) console.log(`${t}: no registration block in its ledger — run world-register.mjs before build:land-mount`);
  const ids = def.coastCells
    ? def.coastCells.map((x) => `c${x.at[0]}-${x.at[1]}`)
    : Array.from({ length: def.grid.cols * def.grid.rows }, (_, i) => `c${i % def.grid.cols}-${Math.floor(i / def.grid.cols)}`);
  const [bx, by] = def.lattice.block;
  for (const id of ids) {
    if (ledger.cells[id]) continue;                                   // authored — served by the release feed
    const l2 = `.codex-tmp/authoring/cells/${t}/${id}/${id}-l2.png`;
    if (!fs.existsSync(l2)) continue;                                 // no candidate in hand
    const [c, r] = id.slice(1).split("-").map(Number);
    cells.push({ territory: t, id, l2, wx: bx + c, wy: by + r });
  }
}

fs.mkdirSync(REVIEW, { recursive: true });
const entries = [];
for (const c of cells) {
  const source = fs.readFileSync(c.l2);
  const name = `${c.territory}-${c.id}-site.webp`;
  let kept = sharp(source).extract({ left: BLEED, top: BLEED, width: KEPT, height: KEPT });
  let gain = 1;
  if (gains.size) {
    const raw = await kept.raw().toBuffer();
    gain = applyTone(raw, KEPT, c.wx, c.wy);
    kept = sharp(raw, { raw: { width: KEPT, height: KEPT, channels: 4 } });
  }
  const canonical = await kept.webp({ quality: 95, alphaQuality: 100 }).toBuffer();
  c.gain = gain;
  if (!DRY) fs.writeFileSync(path.join(REVIEW, name), canonical);
  entries.push({
    territory: c.territory, id: c.id, status: "review-candidate",
    sourceSnapshot: `${root}/${c.l2}`, sourceSha256: sha(source),
    canonicalPath: `/career-world/layers/terrain/authority/tiles/l2-review/${name}`, canonicalSha256: sha(canonical),
  });
}
// review tiles of cells that are no longer candidates
let removed = 0;
const keep = new Set(entries.flatMap((e) => [`${e.territory}-${e.id}-site.webp`, `${e.territory}-${e.id}-capital.webp`]));
for (const f of fs.existsSync(REVIEW) ? fs.readdirSync(REVIEW) : []) {
  if (keep.has(f) || !f.endsWith(".webp")) continue;
  if (!DRY) fs.rmSync(path.join(REVIEW, f));
  removed += 1;
}
const config = {
  purpose: "Local mounting of every current candidate as a review preview (the land lane owns what the mount shows — owner 2026-09-05: 'if the mount has stale land please update it as you are land authority'); does not mark these candidates accepted or modify authoring ledgers.",
  writtenBy: "docs/career-world/session3-tools/mount-candidates.mjs",
  at: new Date().toISOString(),
  cells: entries,
};
if (!DRY) fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2) + "\n");
for (const e of entries) console.log(`  ${e.territory} ${e.id}  ${e.canonicalSha256.slice(0, 12)}`);
console.log(`${DRY ? "WOULD WRITE" : "WROTE"} ${entries.length} candidate previews (${removed} stale review tiles removed) -> ${CONFIG}`);
console.log(`now: npm run build:land-mount && npm run build:water`);
