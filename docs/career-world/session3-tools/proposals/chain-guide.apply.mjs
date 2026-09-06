// LOCK 18n — the owner's instruction (2026-09-06 01:00 UTC): "For the chain
// add a layer over it thats bright purple. Then use that to hellp with the
// matching and remove that layer for final render". Amends 18m.
//
// THE CHANGE: (1) the rune chain's floor is drawn into the edit target in
// BRIGHT PURPLE (200,0,255) — a guide layer, not paint — and the packet says
// so: cut the groove along it, leave no purple; (2) after the generation and
// before anything is derived or gated, where the purple survived within 100 px
// of the west/east kept edge its height is read (the chain's position, exact),
// and then every purple pixel is replaced by the groove's floor colour, so the
// final render carries no purple; (3) a "chain continuity" gate: at each edge
// the groove's height (the guide where it survived, else the darkest 0.3-3 m
// run beside the edge) must lie within 48 px of the floor drawn from the
// neighbours' grooves. Cells the chain does not cross are untouched.
//
//   node .codex-tmp/session4/proposals/chain-guide.apply.mjs [--check]
import fs from "node:fs";
const FILE = "tools/world-authoring/cell.mjs";
const CHECK = process.argv.includes("--check");
let src = fs.readFileSync(FILE, "utf8");
const edits = [];
const replace = (label, oldStr, newStr) => {
  const n = src.split(oldStr).length - 1;
  if (n !== 1) throw new Error(`${label}: anchor found ${n} times, need exactly 1`);
  src = src.replace(oldStr, newStr);
  edits.push(label);
};

replace("1 declare",
`let chainPrefilled = 0; // px of the rune chain's floor drawn into the target (18m)`,
`let chainPrefilled = 0; // px of the rune chain's floor drawn into the target (18m)
let chainEnds = null;   // the floor's ends as fractions down the west/east edge (18n: the chain gate)
const chainSeen = { west: null, east: null };   // where the purple guide survived at each edge (18n)`);

replace("2 purple",
`          const FLOOR = [38, 36, 33];                          // the slot's floor in shade`,
`          const FLOOR = [200, 0, 255];                         // the GUIDE LAYER: bright purple, replaced by the floor after generation (18n)`);

replace("3 ends",
`          const shift = (wx) => dIn + (dOut - dIn) * Math.max(0, Math.min(1, wx - col));`,
`          chainEnds = { west: yIn - row, east: yOut - row };
          const shift = (wx) => dIn + (dOut - dIn) * Math.max(0, Math.min(1, wx - col));`);

replace("4 log",
"if (chainPrefilled) console.log(`  chain pre-fill ${chainPrefilled} px: the groove's floor drawn along the route, ${Math.round((yIn - row) * 100)}% down the west edge to ${Math.round((yOut - row) * 100)}% down the east`);",
"if (chainPrefilled) console.log(`  chain guide   ${chainPrefilled} px: the groove's floor drawn in bright purple, ${Math.round((yIn - row) * 100)}% down the west edge (${wIn != null ? `${west.id}'s groove` : \"the canon\"}) to ${Math.round((yOut - row) * 100)}% down the east (${wOut != null ? `${east.id}'s groove` : \"the canon\"})`);");

replace("5 packet",
"${chainPrefilled ? ` THE RUNE CHAIN'S FLOOR is\nalready drawn: the thin dark line crossing the canvas from edge to edge is the\ngroove's floor, FINAL and exact. Cut the slot's two walls and its rounded,\npaler rims along that line, on both sides of it; never move it, bend it, break\nit, widen it into a path, or paint ground, water or trees over it.` : \"\"}",
"${chainPrefilled ? ` THE BRIGHT PURPLE LINE\ncrossing the canvas from edge to edge is a GUIDE LAYER: it marks the rune\nchain's floor, and its POSITION is final and exact. Cut the groove along it —\nthe slot's floor exactly under the purple, its two walls and rounded, paler\nrims on either side; never move it, bend it, break it, widen it into a path,\nor paint ground, water or trees over it. The purple itself is not paint:\nleave none of it in your output. Whatever purple remains will be replaced by\nthe groove's dark floor, so keep the line where it is.` : \"\"}");

replace("6 remove",
`    const concept = await sharp(srcFile).ensureAlpha()
      .resize(GEN_PX, GEN_PX, { kernel: "lanczos3" }).raw().toBuffer();`,
`    const concept = await sharp(srcFile).ensureAlpha()
      .resize(GEN_PX, GEN_PX, { kernel: "lanczos3" }).raw().toBuffer();
    // THE GUIDE LAYER COMES OFF (18n): where the bright purple survived beside
    // the west/east kept edge its height is read for the chain gate; then every
    // purple pixel becomes the groove's floor — the final render has no purple
    if (chainPrefilled) {
      const isPurple = (o) => concept[o] > 120 && concept[o + 2] > 180 && concept[o + 1] < 100 && concept[o + 2] - concept[o + 1] > 120;
      const acc = { west: [0, 0], east: [0, 0] };
      let removed = 0;
      for (let y = 0; y < GEN_PX; y += 1) for (let x = 0; x < GEN_PX; x += 1) {
        const o = (y * GEN_PX + x) * 4;
        if (!isPurple(o)) continue;
        if (x >= BLEED && x < BLEED + 100) { acc.west[0] += y; acc.west[1] += 1; }
        if (x >= BLEED + CELL_PX - 100 && x < BLEED + CELL_PX) { acc.east[0] += y; acc.east[1] += 1; }
        concept[o] = 38; concept[o + 1] = 36; concept[o + 2] = 33;
        removed += 1;
      }
      for (const s of ["west", "east"]) if (acc[s][1] >= 20) chainSeen[s] = (acc[s][0] / acc[s][1] - BLEED) / CELL_PX;
      console.log(\`  guide layer   \${removed} purple px replaced by the groove's floor; the guide survived at \${["west", "east"].filter((s) => chainSeen[s] != null).join(" and ") || "neither"} edge\`);
    }`);

replace("7 gate",
`    { name: "palette conformance", value: (palSeams || toneSeams)`,
`    { name: "chain continuity", value: (() => {
        if (!chainPrefilled || !chainEnds) return "no chain in this cell (reported)";
        return ["west", "east"].map((s) => {
          const at = chainSeen[s] != null ? chainSeen[s] : chainDarkAt(s, chainEnds[s]);
          return at == null ? \`\${s}: no groove found beside the edge\` : \`\${s}: \${Math.round(Math.abs(at - chainEnds[s]) * CELL_PX)} px off the floor\${chainSeen[s] != null ? " (the guide)" : ""}\`;
        }).join(", ");
      })(),
      pass: !chainPrefilled || !chainEnds || ["west", "east"].every((s) => { const at = chainSeen[s] != null ? chainSeen[s] : chainDarkAt(s, chainEnds[s]); return at != null && Math.abs(at - chainEnds[s]) * CELL_PX <= 48; }),
      note: "the groove's height at each edge — the purple guide where it survived, else the darkest 0.3-3 m run in the 96 px beside the edge — within 48 px of the floor drawn from the neighbours' grooves (18n, owner 2026-09-06: 'use that to help with the matching')" },
    { name: "palette conformance", value: (palSeams || toneSeams)`);

replace("8 detector",
`  const gates = [
    { name: "key-light asymmetry",`,
`  // the candidate's own groove beside an edge (18n): the darkest 0.3-3 m run of
  // rows in the 96 px inside the kept edge, within 12% of the drawn floor
  const chainDarkAt = (side, frac) => {
    const xs = side === "west" ? [BLEED + 4, BLEED + 100] : [BLEED + CELL_PX - 100, BLEED + CELL_PX - 4];
    const y0 = Math.round(BLEED + (frac - 0.12) * CELL_PX), y1 = Math.round(BLEED + (frac + 0.12) * CELL_PX);
    const rows = []; let landRows = 0;
    for (let y = y0; y < y1; y += 1) {
      const v = [];
      for (let x = xs[0]; x < xs[1]; x += 2) { const o = (y * W + x) * 4; if (data[o + 3] < 200) continue; v.push(0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]); }
      v.sort((p, q) => p - q); if (v.length) landRows += 1; rows.push(v.length ? v[v.length >> 1] : null);
    }
    if (landRows < rows.length / 2) return null;
    const med = rows.filter((r) => r != null).sort((p, q) => p - q)[landRows >> 1];
    const runs = []; let s = -1;
    for (let i = 0; i <= rows.length; i += 1) {
      const dark = i < rows.length && rows[i] != null && rows[i] < med - 18;
      if (dark && s < 0) s = i;
      if (!dark && s >= 0) { const tall = (i - s) * (97.6 / CELL_PX); if (tall >= 0.3 && tall <= 3) { let mn = 999; for (let k = s; k < i; k += 1) mn = Math.min(mn, rows[k]); runs.push({ c: (y0 + (s + i) / 2 - BLEED) / CELL_PX, depth: med - mn }); } s = -1; }
    }
    runs.sort((p, q) => q.depth - p.depth);
    return runs.length && runs[0].depth >= 25 ? runs[0].c : null;
  };

  const gates = [
    { name: "key-light asymmetry",`);

if (CHECK) { console.log("all " + edits.length + " anchors present; nothing written (--check)"); process.exit(0); }
fs.writeFileSync(FILE, src);
console.log("applied " + edits.length + " edits to " + FILE + ": " + edits.join("; "));
console.log("now: node tools/world-authoring/check-solidified.mjs --approve \"<owner's words>\"");
