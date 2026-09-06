// PROPOSAL (lock 18k) — NOT APPLIED. Needs the owner's word (record with
// check-solidified.mjs --approve).
//
// THE FINDING (2026-09-05, coast c3-0 at 06:18 and c6-8 at 18:02): the water
// continuity gate matches the CENTRES of wet runs on the shared line within
// 48 px. A skerry or a 9 px sliver of land splits one wide sea run into two,
// whose centres then sit hundreds of px from the neighbour's single centre —
// while the water spans agree to 12 px. c6-8's seam matched and was refused.
//
// THE CHANGE: in the gate's run finder, wet runs separated by a dry gap under
// 30 px (the same minimum the runs themselves must reach) are merged before
// matching. One function. Threshold, band and everything else unchanged.
//
//   node .codex-tmp/session4/proposals/continuity-gaps.apply.mjs [--check]
import fs from "node:fs";
const FILE = "tools/world-authoring/cell.mjs";
const CHECK = process.argv.includes("--check");
let src = fs.readFileSync(FILE, "utf8");
const oldStr = `    const runsOf = (samples, coord0) => {
      const runs = [];
      let s = -1;
      for (let k = 0; k <= samples.length; k++) {
        const w = k < samples.length && samples[k] < 128;
        if (w && s < 0) s = k;
        else if (!w && s >= 0) {
          if (k - s >= 30) runs.push({ a: coord0 + s, b: coord0 + k, c: coord0 + (s + k) / 2 });
          s = -1;
        }
      }
      return runs;
    };`;
const newStr = `    const runsOf = (samples, coord0) => {
      const runs = [];
      let s = -1;
      for (let k = 0; k <= samples.length; k++) {
        const w = k < samples.length && samples[k] < 128;
        if (w && s < 0) s = k;
        else if (!w && s >= 0) {
          if (k - s >= 30) runs.push({ a: coord0 + s, b: coord0 + k, c: coord0 + (s + k) / 2 });
          s = -1;
        }
      }
      // 18k (2026-09-05): a dry gap under 30 px — a skerry, a sliver — does not
      // split one sea run into two; merged runs are matched by one centre.
      const merged = [];
      for (const r of runs) {
        const last = merged[merged.length - 1];
        if (last && r.a - last.b < 30) { last.b = r.b; last.c = (last.a + last.b) / 2; continue; }
        merged.push({ ...r });
      }
      return merged;
    };`;
const n = src.split(oldStr).length - 1;
if (n !== 1) throw new Error(`anchor found ${n} times, need exactly 1`);
if (CHECK) { console.log("anchor present; nothing written (--check)"); process.exit(0); }
fs.writeFileSync(FILE, src.replace(oldStr, newStr));
console.log(`applied 1 edit to ${FILE}`);
console.log(`now: node tools/world-authoring/check-solidified.mjs --approve "<owner's words>"`);
