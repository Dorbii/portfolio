// Lock change 5 part 1 — control-suite edits for tests/world-authoring-stitch.test.mjs.
// (a) the suite's working dir is <OUT>/work and the real working dirs are fingerprinted;
// (b) three mask-completion controls through the derivation path (--redo).
import fs from "node:fs";
const P = "tests/world-authoring-stitch.test.mjs";
let t = fs.readFileSync(P, "utf8");
const edits = [];
function rep(name, from, to, { all = false } = {}) {
  const n = t.split(from).length - 1;
  if (all ? n < 1 : n !== 1) throw new Error(`${name}: anchor matched ${n} times`);
  edits.push(`${name} x${n}`); t = all ? t.split(from).join(to) : t.replace(from, to);
}

// (a) WORKT + real-work-dir fingerprint, declared next to OUT
rep("WORKT + fingerprint",
  `const CELL = 2048, BLEED = 256, GEN = 2560, TILE = 256;`,
  `const CELL = 2048, BLEED = 256, GEN = 2560, TILE = 256;
// cell.mjs keeps its working dir under the output tree when L2_OUT_ROOT is set
// (lock change 5a): the suite must never read or write the real cells' dirs.
const WORKT = path.join(OUT, "work");
const REAL_WORK = path.join(ROOT, ".codex-tmp", "authoring", "cells");
// fingerprint of the real working dirs (names, sizes, mtimes), skipping any
// cell a live bake is writing right now (a file touched in the last hour)
function realWorkFingerprint(include) {
  const rows = [], cells = [];
  if (fs.existsSync(REAL_WORK)) {
    for (const e of fs.readdirSync(REAL_WORK, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!e.isDirectory()) continue;
      const d = path.join(REAL_WORK, e.name), files = [];
      const walk = (p) => { for (const f of fs.readdirSync(p, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const q = path.join(p, f.name); if (f.isDirectory()) walk(q); else files.push(q); } };
      walk(d);
      const live = files.some((f) => Date.now() - fs.statSync(f).mtimeMs < 3600e3);
      if (include ? !include.includes(e.name) : live) continue;
      cells.push(e.name);
      for (const f of files) { const s = fs.statSync(f); rows.push(\`\${f}|\${s.size}|\${s.mtimeMs}\`); }
    }
  }
  return { hash: crypto.createHash("sha256").update(rows.join("\\n")).digest("hex"), cells };
}
const REAL_WORK_BEFORE = realWorkFingerprint();`);

// (a) the old cleanup of REAL working dirs goes: OUT (and WORKT under it) is wiped above
rep("drop real-dir cleanup",
  `for (const id of ["c1-1", "c2-1", "c3-1", "c4-1"]) {
  fs.rmSync(path.join(ROOT, ".codex-tmp", "authoring", "cells", id), { recursive: true, force: true });
}
`, ``);

// (a) every packet / edit-target / cellDir reference moves to WORKT
rep("relocate references", `path.join(ROOT, ".codex-tmp", "authoring", "cells", `, `path.join(WORKT, `, { all: true });

// (b) genImage gains a low-saturation haze arc option (a control for growth)
rep("genImage hazeArc option",
  `function genImage(col, row, paint, { waterDisc, keepWaterPaint, paintedRing } = {}) {`,
  `function genImage(col, row, paint, { waterDisc, keepWaterPaint, paintedRing, hazeArc } = {}) {`);
rep("genImage hazeArc paint",
  `        } else if (paintedRing && d >= waterDisc[2] + paintedRing[0] && d < waterDisc[2] + paintedRing[1]) {`,
  `        } else if (hazeArc && ox + u > waterDisc[0] && d >= waterDisc[2] + hazeArc[0] && d < waterDisc[2] + hazeArc[1]) {
          // a flat blue-grey haze touching the water: sat 0.12, under the
          // classifier's 0.25 — growth must NOT absorb it
          concept[o] = l2[o] = 150; concept[o + 1] = l2[o + 1] = 160; concept[o + 2] = l2[o + 2] = 170;
        } else if (paintedRing && d >= waterDisc[2] + paintedRing[0] && d < waterDisc[2] + paintedRing[1]) {`);

// (b) the controls, appended after the manifest test, plus the real-dir assertion last
t = t.trimEnd() + `

// ---- mask completion (owner 2026-09-02, lock change 5b): through the derivation path ----
// A --redo run derives concept/l2/water from <id>-source.png and <id>-water-source.png
// in the working dir, exactly as a real bake does after the worker delivers.
async function supplyGeneration(id, col, row, sourceImg, maskImg) {
  const dir = path.join(WORKT, id); fs.mkdirSync(dir, { recursive: true });
  const save = (buf, name) => sharp(buf, { raw: { width: GEN, height: GEN, channels: 4 } }).png().toFile(path.join(dir, \`\${id}-\${name}.png\`));
  await save(sourceImg.concept, "source");
  await save(maskImg.mask, "water-source");
  fs.writeFileSync(path.join(dir, \`\${id}-water.json\`), JSON.stringify([{ class: "lake", note: "synthetic control" }]));
}
function redoCell(cellArg, extra = []) {
  return execFileSync(process.execPath, [SCRIPT, "--cell", cellArg, "--redo", "--describe", "mask completion control", ...extra],
    { cwd: ROOT, env: { ...process.env, L2_OUT_ROOT: OUT }, encoding: "utf8" });
}
const C41 = [4 * CELL + 1024, 1 * CELL + 1024];   // cell 4,1's centre in territory px

test("a mask that stops 20px short of the painted shore is completed, and the rings read 0%", async () => {
  await supplyGeneration("c4-1", 4, 1,
    genImage(4, 1, G, { waterDisc: [C41[0], C41[1], 300], keepWaterPaint: true }),
    genImage(4, 1, G, { waterDisc: [C41[0], C41[1], 280] }));
  const out = redoCell("4,1");
  const m = out.match(/mask\\s+completed: \\+(\\d+) px/);
  assert.ok(m, "growth must be reported:\\n" + out.slice(-600));
  const grown = +m[1], expect = Math.PI * (300 * 300 - 280 * 280);
  assert.ok(grown > expect * 0.85 && grown < expect * 1.15, \`grown \${grown} px, expected about \${Math.round(expect)}\`);
  assert.match(out, /PASS\\s+water fringe\\s+0%/, "the 6px ring must read 0% after completion");
  assert.match(out, /PASS\\s+water fringe \\(48px\\)\\s+0%/, "the 48px ring must read 0% after completion");
  assert.match(out, /accepted, stitched/);
  // the completed mask was the one cut: the water zone at the shore is clear in the L2 tile
  const px = await tileRaw(0, Math.floor((C41[0] + 290) / TILE), Math.floor(C41[1] / TILE));
  const o = (((C41[1]) % TILE) * TILE + ((C41[0] + 290) % TILE)) * 4;
  assert.equal(px[o + 3], 0, "painted water 290px from the centre (inside the grown mask) must be cut");
});

test("dry paint between the mask and painted water stops the growth: the polyline defect still fails", async () => {
  const before = treeHash();
  await supplyGeneration("c4-1", 4, 1,
    genImage(4, 1, G, { waterDisc: [C41[0], C41[1], 260], keepWaterPaint: true, paintedRing: [12, 40] }),
    genImage(4, 1, G, { waterDisc: [C41[0], C41[1], 260] }));
  let out = "";
  try { redoCell("4,1", ["--force"]); assert.fail("the ring beyond a dry strip must still be rejected"); }
  catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); }
  assert.match(out, /FAIL\\s+water fringe \\(48px\\)/, "the wide ring must still fire:\\n" + out.slice(-600));
  const m = out.match(/mask\\s+completed: \\+(\\d+) px/);
  assert.ok(!m || +m[1] < 2000, "growth must not cross the dry strip");
  assert.equal(treeHash(), before, "world untouched");
});

test("a low-saturation haze touching the water is not absorbed by the growth", async () => {
  await supplyGeneration("c4-1", 4, 1,
    genImage(4, 1, G, { waterDisc: [C41[0], C41[1], 300], keepWaterPaint: true, hazeArc: [0, 60] }),
    genImage(4, 1, G, { waterDisc: [C41[0], C41[1], 300] }));
  const out = redoCell("4,1", ["--force"]);
  const m = out.match(/mask\\s+completed: \\+(\\d+) px/);
  assert.ok(!m || +m[1] < 500, "an exact mask beside a flat haze must grow by (almost) nothing: " + (m ? m[1] : 0));
  assert.match(out, /accepted, stitched/);
  // the haze stays land: opaque in the L2 tile 330px east of the centre
  const px = await tileRaw(0, Math.floor((C41[0] + 330) / TILE), Math.floor(C41[1] / TILE));
  const o = (((C41[1]) % TILE) * TILE + ((C41[0] + 330) % TILE)) * 4;
  assert.equal(px[o + 3], 255, "haze pixels must remain land");
});

test("the suite never touches the real working directories", () => {
  const after = realWorkFingerprint(REAL_WORK_BEFORE.cells);
  assert.equal(after.hash, REAL_WORK_BEFORE.hash, "the real .codex-tmp/authoring/cells tree changed during the suite: " + REAL_WORK_BEFORE.cells.join(", "));
});
`;
fs.writeFileSync(P, t);
console.log("applied:", edits.join("; "));
