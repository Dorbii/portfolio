// PROPOSAL (lock 18i-c) — NOT APPLIED. Needs the owner's word (record with
// check-solidified.mjs --approve).
//
// THE FINDING (2026-09-06 01:40, coast c1-8 on the served picture): the sea
// patch 18i-b tiles into a shore cell's target is "the largest square of the
// neighbour's concept that is all water" — judged on the neighbour's WATER
// MASK alone. T c0-2's mask calls a square of sea water although its paint
// holds a sea stack, so the mirror repeats stamped that stack eight times in
// a grid across c1-8's target, and the model, told the sea is final, kept
// them. They are in the served world.
//
// THE CHANGE: a square qualifies only if its PAINT is sea as well — fewer
// than 0.5% of its pixels bright (luma > 130) or grey (saturation < 0.25).
// Squares with stacks, foam crests, skerries or beach are skipped; the
// swatch fallback remains. Nothing else changes.
//
//   node .codex-tmp/session4/proposals/sea-patch-uniform.apply.mjs [--check]
import fs from "node:fs";
const FILE = "tools/world-authoring/cell.mjs";
const CHECK = process.argv.includes("--check");
let src = fs.readFileSync(FILE, "utf8");
const oldStr = `          const full = (x, y, s) => sat[(y + s) * (N + 1) + (x + s)] - sat[y * (N + 1) + (x + s)] - sat[(y + s) * (N + 1) + x] + sat[y * (N + 1) + x] === s * s;`;
const newStr = `          const full = (x, y, s) => sat[(y + s) * (N + 1) + (x + s)] - sat[y * (N + 1) + (x + s)] - sat[(y + s) * (N + 1) + x] + sat[y * (N + 1) + x] === s * s
            && seaPaint(x, y, s);
          // 18i-c (2026-09-06): the paint must be sea too — a square the mask
          // calls water can hold a stack (T c0-2 → c1-8's grid of eight)
          const seaPaint = (x, y, s) => {
            let bad = 0, n = 0;
            for (let yy = y; yy < y + s; yy += 4) for (let xx = x; xx < x + s; xx += 4) {
              const o = (yy * N + xx) * 4, r = nCon.data[o], g = nCon.data[o + 1], b = nCon.data[o + 2];
              const mx = Math.max(r, g, b), mn = Math.min(r, g, b), luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
              const satv = mx ? (mx - mn) / mx : 0;
              n += 1;
              if (luma > 130 || satv < 0.25) bad += 1;
            }
            return n > 0 && bad / n < 0.005;
          };`;
const n = src.split(oldStr).length - 1;
if (n !== 1) throw new Error(`anchor found ${n} times, need exactly 1`);
if (CHECK) { console.log("anchor present; nothing written (--check)"); process.exit(0); }
fs.writeFileSync(FILE, src.replace(oldStr, newStr));
console.log("applied 1 edit to " + FILE);
console.log("now: node tools/world-authoring/check-solidified.mjs --approve \"<owner's words>\"");
