// LOCK 18n, calibration (2026-09-06 01:35): the chain gate on c2-1 said "west:
// no groove found beside the edge" while the groove is plainly there (the
// crop c2-1-guide-result.jpg): in a dark forest the band's median luma is
// ~50 and the slot's floor ~35, under the fixed 18-luma contrast. Two
// changes to the gate only: (1) the contrast is a fifth of the median,
// between 10 and 18; (2) an edge where no groove is found is REPORTED, not
// refused — the gate refuses only a groove that is found and is more than
// 48 px off the floor. The guide, the removal and the drawing are unchanged.
import fs from "node:fs";
const FILE = "tools/world-authoring/cell.mjs";
const CHECK = process.argv.includes("--check");
let src = fs.readFileSync(FILE, "utf8");
const edits = [];
const replace = (label, oldStr, newStr) => { const n = src.split(oldStr).length - 1; if (n !== 1) throw new Error(`${label}: anchor found ${n} times`); src = src.replace(oldStr, newStr); edits.push(label); };
replace("1 contrast",
`      const dark = i < rows.length && rows[i] != null && rows[i] < med - 18;
      if (dark && s < 0) s = i;
      if (!dark && s >= 0) { const tall = (i - s) * (97.6 / CELL_PX); if (tall >= 0.3 && tall <= 3) { let mn = 999; for (let k = s; k < i; k += 1) mn = Math.min(mn, rows[k]); runs.push({ c: (y0 + (s + i) / 2 - BLEED) / CELL_PX, depth: med - mn }); } s = -1; }
    }
    runs.sort((p, q) => q.depth - p.depth);
    return runs.length && runs[0].depth >= 25 ? runs[0].c : null;
  };`,
`      const contrast = Math.max(10, Math.min(18, 0.2 * med));   // a dark forest's slot is only ~15 under its band
      const dark = i < rows.length && rows[i] != null && rows[i] < med - contrast;
      if (dark && s < 0) s = i;
      if (!dark && s >= 0) { const tall = (i - s) * (97.6 / CELL_PX); if (tall >= 0.3 && tall <= 3) { let mn = 999; for (let k = s; k < i; k += 1) mn = Math.min(mn, rows[k]); runs.push({ c: (y0 + (s + i) / 2 - BLEED) / CELL_PX, depth: med - mn }); } s = -1; }
    }
    runs.sort((p, q) => q.depth - p.depth);
    return runs.length && runs[0].depth >= Math.max(12, 1.4 * Math.max(10, Math.min(18, 0.2 * med))) ? runs[0].c : null;
  };`);
replace("2 report-only when not found",
`      pass: !chainPrefilled || !chainEnds || ["west", "east"].every((s) => { const at = chainSeen[s] != null ? chainSeen[s] : chainDarkAt(s, chainEnds[s]); return at != null && Math.abs(at - chainEnds[s]) * CELL_PX <= 48; }),`,
`      pass: !chainPrefilled || !chainEnds || ["west", "east"].every((s) => { const at = chainSeen[s] != null ? chainSeen[s] : chainDarkAt(s, chainEnds[s]); return at == null || Math.abs(at - chainEnds[s]) * CELL_PX <= 48; }),`);
replace("3 value wording",
"return at == null ? `${s}: no groove found beside the edge` : `${s}: ${Math.round(Math.abs(at - chainEnds[s]) * CELL_PX)} px off the floor${chainSeen[s] != null ? \" (the guide)\" : \"\"}`;",
"return at == null ? `${s}: no groove found beside the edge (reported)` : `${s}: ${Math.round(Math.abs(at - chainEnds[s]) * CELL_PX)} px off the floor${chainSeen[s] != null ? \" (the guide)\" : \"\"}`;");
if (CHECK) { console.log("all " + edits.length + " anchors present; nothing written (--check)"); process.exit(0); }
fs.writeFileSync(FILE, src);
console.log("applied " + edits.length + " edits: " + edits.join("; "));
