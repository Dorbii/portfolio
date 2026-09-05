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
  for (const id of ids) {
    if (ledger.cells[id]) continue;                                   // authored — served by the release feed
    const l2 = `.codex-tmp/authoring/cells/${t}/${id}/${id}-l2.png`;
    if (!fs.existsSync(l2)) continue;                                 // no candidate in hand
    cells.push({ territory: t, id, l2 });
  }
}

fs.mkdirSync(REVIEW, { recursive: true });
const entries = [];
for (const c of cells) {
  const source = fs.readFileSync(c.l2);
  const name = `${c.territory}-${c.id}-site.webp`;
  const canonical = await sharp(source).extract({ left: BLEED, top: BLEED, width: KEPT, height: KEPT })
    .webp({ quality: 95, alphaQuality: 100 }).toBuffer();
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
