// Standalone reproduction of the crown control outside the suite, in its own
// scratch world, so the stitched tiles can be inspected after the run.
import { execFileSync } from "node:child_process"; import fs from "node:fs"; import path from "node:path"; import sharp from "sharp";
sharp.cache(false);
const ROOT = process.cwd(), SCRIPT = process.env.CELL_SCRIPT ? path.resolve(process.env.CELL_SCRIPT) : path.join(ROOT, "tools", "world-authoring", "cell.mjs");
const OUT = path.join(ROOT, ".codex-tmp", "dir-stitch", process.env.CROWN_WORLD || "crown-repro"), WORKT = path.join(OUT, "work");
const CELL = 2048, BLEED = 256, GEN = 2560, TILE = 256;
const ENV = { cwd: ROOT, env: { ...process.env, L2_OUT_ROOT: OUT }, encoding: "utf8" };
const nz = (x, y, s) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + s) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (((h ^ (h >>> 16)) >>> 0) / 2 ** 32 - 0.5) * 40; };
const F = (x, y) => [Math.round(180 + 40 * Math.sin(x / 13.7)), Math.round(120 + 30 * Math.sin(y / 17.3) + nz(x, y, 7)), Math.round(60 + 25 * Math.sin((x + y) / 23.1)), 255];
function genImage(col, row, paint, disc) {
  const ox = col * CELL - BLEED, oy = row * CELL - BLEED;
  const l2 = Buffer.alloc(GEN * GEN * 4), concept = Buffer.alloc(GEN * GEN * 4), mask = Buffer.alloc(GEN * GEN * 4);
  for (let v = 0; v < GEN; v++) for (let u = 0; u < GEN; u++) {
    const [r, g, b, a] = paint(ox + u, oy + v); const o = (v * GEN + u) * 4;
    concept[o] = l2[o] = r; concept[o + 1] = l2[o + 1] = g; concept[o + 2] = l2[o + 2] = b; concept[o + 3] = l2[o + 3] = a;
    if (disc && Math.hypot(ox + u - disc[0], oy + v - disc[1]) < disc[2]) { concept[o] = l2[o] = 30; concept[o + 1] = l2[o + 1] = 32; concept[o + 2] = l2[o + 2] = 28; }
  }
  return { l2, concept, mask };
}
async function writeArtefacts(dir, id, img) {
  fs.mkdirSync(dir, { recursive: true });
  const save = (buf, name) => sharp(buf, { raw: { width: GEN, height: GEN, channels: 4 } }).png().toFile(path.join(dir, `${id}-${name}.png`));
  await save(img.l2, "l2"); await save(img.concept, "concept"); await save(img.mask, "water");
  fs.writeFileSync(path.join(dir, `${id}-water.json`), JSON.stringify([{ class: "lake", note: "synthetic control" }]));
}
const runCell = (cellArg, fromDir, extra = []) => execFileSync(process.execPath, [SCRIPT, "--cell", cellArg, "--from", fromDir, "--describe", "synthetic control", ...extra], ENV);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "sources", "seed"), { recursive: true });
fs.copyFileSync("art-source/career-world/l2-land/ninjaone/seed/L2-seed-region-r2-source.png", path.join(OUT, "sources", "seed", "L2-seed-region-r2-source.png"));
const SYN = path.join(OUT, "synthetic");
await writeArtefacts(path.join(SYN, "row2-a"), "c1-2", genImage(1, 2, F));
let log = runCell("1,2", path.join(SYN, "row2-a")); console.log("c1-2:", (log.match(/cell c1-2 .*/) || ["?"])[0]);
execFileSync(process.execPath, [SCRIPT, "--cell", "2,2", "--dry-run"], ENV);
const bind = await sharp(path.join(WORKT, "c2-2", "context", "binding.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const wx0 = 2 * CELL - BLEED, wy0 = 2 * CELL - BLEED, W = bind.info.width, yMid = 2 * CELL + 1024, v = yMid - wy0;
let bx = -1; for (let u = 0; u < W; u++) if (bind.data[(v * W + u) * 4] === 255) { bx = wx0 + u; break; }
console.log("binding", bind.info.width, "x", bind.info.height, "boundary at yMid:", bx);
const R = 70;
await writeArtefacts(path.join(SYN, "row2-b"), "c2-2", genImage(2, 2, F, [bx, yMid, R]));
log = runCell("2,2", path.join(SYN, "row2-b")); console.log("c2-2:", (log.match(/cell c2-2 .*/) || ["?"])[0]);
console.log(log.split("\n").filter((l) => /PASS|FAIL|written|mask/.test(l)).join("\n"));
