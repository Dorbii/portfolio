// PROPOSAL (lock 18j) — NOT APPLIED. Needs the owner's word (record with
// check-solidified.mjs --approve).
//
// THE FINDING (2026-09-05 17:48, coast c1-8): a row-8 shore cell that is 98%
// sea, its 2% corner of ground continued, both crossings met, every seam gate
// passing, refused on key-light 0.0116 against 0.011 — a first circular moment
// taken over ~80,000 land pixels of 4.2 million, which is noise. Rock lighting
// already goes report-only under 5,000 rock pixels; key-light has no floor.
//
// THE CHANGE: key-light is report-only when the cell is under 5% land. One
// line. Every other gate unchanged.
//
//   node .codex-tmp/session4/proposals/keylight-floor.apply.mjs [--check]
import fs from "node:fs";
const FILE = "tools/world-authoring/cell.mjs";
const CHECK = process.argv.includes("--check");
let src = fs.readFileSync(FILE, "utf8");
const oldStr = `    { name: "key-light asymmetry", value: +keyLight.toFixed(4), pass: keyLight < 0.011,
      note: "first circular moment of luminance gradients; a baked sun measures ~0.03, canon terrain <=0.004" },`;
const newStr = `    { name: "key-light asymmetry",
      value: opaque < 0.05 * W * H ? \`\${keyLight.toFixed(4)} (\${(100 * opaque / (W * H)).toFixed(1)}% land, report-only)\` : +keyLight.toFixed(4),
      pass: opaque < 0.05 * W * H || keyLight < 0.011,
      note: "first circular moment of luminance gradients; a baked sun measures ~0.03, canon terrain <=0.004; report-only under 5% land (18j, 2026-09-05: a 98%-sea shore cell read 0.0116 on noise)" },`;
const n = src.split(oldStr).length - 1;
if (n !== 1) throw new Error(`anchor found ${n} times, need exactly 1`);
if (CHECK) { console.log("anchor present; nothing written (--check)"); process.exit(0); }
fs.writeFileSync(FILE, src.replace(oldStr, newStr));
console.log(`applied 1 edit to ${FILE}`);
console.log(`now: node tools/world-authoring/check-solidified.mjs --approve "<owner's words>"`);
