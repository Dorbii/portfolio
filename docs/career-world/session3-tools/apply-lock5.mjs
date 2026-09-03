// Lock change 5 part 1 — applies the approved edits to tools/world-authoring/cell.mjs.
// Every replacement is anchored on exact current text and must match exactly once;
// otherwise nothing is written. Run AFTER the owner's approval is recorded.
import fs from "node:fs";
const P = "tools/world-authoring/cell.mjs";
let t = fs.readFileSync(P, "utf8");
const edits = [];
function rep(name, from, to) {
  const n = t.split(from).length - 1;
  if (n !== 1) throw new Error(`${name}: anchor matched ${n} times, expected 1`);
  edits.push(name); t = t.replace(from, to);
}

// (a) WORK follows the output tree
rep("5a WORK relocation",
  `const WORK = ".codex-tmp/authoring/cells";`,
  `// the working dir follows the output tree: a relocated test world must never
// write into the real cells' working dirs — a control's stub water.json
// reached cell 4,3's ledger record that way (R073, 2026-09-02)
const WORK = process.env.L2_OUT_ROOT
  ? path.join(process.env.L2_OUT_ROOT, "work")
  : ".codex-tmp/authoring/cells";`);

// (b) mask completion — counters in scope for the gates and the ledger
rep("5b counters",
  `  let sourcePx = null;
  let bridgedInfo = [];`,
  `  let sourcePx = null;
  let bridgedInfo = [];
  let maskGrown = 0, maskHoles = 0;   // mask completion (owner 2026-09-02)`);

// (b) the growth itself: after the bridge, before the boundary feather
rep("5b growth block",
  `      bridgedInfo = bridged;
    }

    for (let pass = 0; pass < 2; pass++) {`,
  `      bridgedInfo = bridged;
    }

    // ---- mask completion (owner-directed 2026-09-02, R071) -------------
    // The worker's mask is intent; the paint is the geometry. Grow the mask
    // into CONTIGUOUS opaque pixels the fringe classifier calls water, up to
    // MASK_REACH px from the delivered mask, and fill speckle holes, so a
    // trace that stops a few px short of the shore cannot fail the rings.
    // Dry paint stops the growth: a polyline mask with dry paint between it
    // and the water still fails. Bridge bands are left alone — the bridge
    // knowingly orphans the old channel's paint there.
    {
      const MASK_REACH = 48, HOLE_MAX = 64, N = GEN_PX * GEN_PX;
      const isWet = (o) => {
        const r = concept[o], g = concept[o + 1], b = concept[o + 2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const sat = mx ? (mx - mn) / mx : 0;
        return mx > 40 && sat > 0.25 && b > r && b >= g;
      };
      const inBridge = (x, y) => bridgeRects.some((r) => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1);
      const dist = new Int16Array(N).fill(-1);
      let frontier = [];
      for (let y = 0; y < GEN_PX; y++) {
        for (let x = 0; x < GEN_PX; x++) {
          const i = y * GEN_PX + x;
          if (bin[i] < 128) continue;
          dist[i] = 0;
          if ((x > 0 && bin[i - 1] < 128) || (x < GEN_PX - 1 && bin[i + 1] < 128)
            || (y > 0 && bin[i - GEN_PX] < 128) || (y < GEN_PX - 1 && bin[i + GEN_PX] < 128)) frontier.push(i);
        }
      }
      while (frontier.length) {
        const next = [];
        for (const p of frontier) {
          const d = dist[p];
          if (d >= MASK_REACH) continue;
          const px = p % GEN_PX, py = (p - px) / GEN_PX;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const xx = px + dx, yy = py + dy;
              if (xx < 0 || yy < 0 || xx >= GEN_PX || yy >= GEN_PX) continue;
              const j = yy * GEN_PX + xx;
              if (dist[j] >= 0) continue;
              const o = j * 4;
              if (concept[o + 3] <= 250 || !isWet(o) || inBridge(xx, yy)) continue;
              dist[j] = d + 1; bin[j] = 255; maskGrown += 1; next.push(j);
            }
          }
        }
        frontier = next;
      }
      // speckle holes: dry 4-connected components of <= HOLE_MAX px enclosed by water
      const seen = new Uint8Array(N), stack = new Int32Array(N);
      for (let s = 0; s < N; s++) {
        if (bin[s] >= 128 || seen[s]) continue;
        let sp = 0, n = 0, border = false; const members = [];
        stack[sp++] = s; seen[s] = 1;
        while (sp) {
          const p = stack[--sp]; n += 1; if (n <= HOLE_MAX) members.push(p);
          const px = p % GEN_PX, py = (p - px) / GEN_PX;
          if (px === 0 || py === 0 || px === GEN_PX - 1 || py === GEN_PX - 1) border = true;
          if (px > 0) { const j = p - 1; if (bin[j] < 128 && !seen[j]) { seen[j] = 1; stack[sp++] = j; } }
          if (px < GEN_PX - 1) { const j = p + 1; if (bin[j] < 128 && !seen[j]) { seen[j] = 1; stack[sp++] = j; } }
          if (py > 0) { const j = p - GEN_PX; if (bin[j] < 128 && !seen[j]) { seen[j] = 1; stack[sp++] = j; } }
          if (py < GEN_PX - 1) { const j = p + GEN_PX; if (bin[j] < 128 && !seen[j]) { seen[j] = 1; stack[sp++] = j; } }
        }
        if (n <= HOLE_MAX && !border) { for (const p of members) bin[p] = 255; maskHoles += n; }
      }
      if (maskGrown || maskHoles) {
        console.log(\`  mask          completed: +\${maskGrown} px of painted water beyond the delivered mask, \${maskHoles} px of speckle holes filled\`);
      }
    }

    for (let pass = 0; pass < 2; pass++) {`);

// (b) reported in the gate table
rep("5b gate row",
  `      note: "paint surviving where the mask is fully water; exact zero by construction for pipeline-derived cells" },`,
  `      note: "paint surviving where the mask is fully water; exact zero by construction for pipeline-derived cells" },
    { name: "mask completion", value: \`+\${maskGrown} px grown, \${maskHoles} px holes filled (reported)\`, pass: true,
      note: "the delivered mask grown into contiguous painted water within 48 px and speckle holes <=64 px filled before the cut (owner 2026-09-02); dry paint stops the growth, so a polyline mask still fails the rings" },`);

// (b) recorded in the ledger
rep("5b ledger field",
  `    bridged: bridgedInfo.length ? bridgedInfo : undefined,`,
  `    bridged: bridgedInfo.length ? bridgedInfo : undefined,
    maskCompletion: (maskGrown || maskHoles) ? { grownPx: maskGrown, holePx: maskHoles } : undefined,`);

// (c) palette limit recalibrated on the owner's eye
rep("5c palette comment",
  `  // palette conformance at each authored seam: vegetation medians of the two
  // 16..176px bands beside the shared line must agree. Calibrated 2026-09-01:
  // the seam that reads FINE measures dBG 0.109 / dLuma 4.5, the seam the
  // owner sees clash measures 0.294 / 14.6 — thresholds at the midpoints.`,
  `  // palette conformance at each authored seam: vegetation medians of the two
  // 16..176px bands beside the shared line must agree. Calibrated on the
  // owner's eye: FINE at dBG 0.109 / dLuma 4.5 (2026-09-01) and at 0.189 / 4.6
  // (2026-09-02, 3,1 candidate 3: "way too harsh"); CLASH at 0.294 / 14.6
  // (2026-09-01) and at 0.218 / 2.8 ("close but a few seam issues") —
  // thresholds between the fine and clash points.`);
rep("5c palette threshold",
  `      if (dBG > 0.18 || dL > 13) {`,
  `      if (dBG > 0.20 || dL > 13) {`);
rep("5c palette note",
  `      note: "vegetation medians of the bands beside each authored seam; calibrated fine=0.109/4.5 vs clash=0.294/14.6, thresholds 0.18/8" },`,
  `      note: "vegetation medians of the bands beside each authored seam; calibrated on the owner's eye: fine 0.109 and 0.189, clash 0.218 and 0.294; thresholds 0.20/13" },`);

fs.writeFileSync(P, t);
console.log("applied:", edits.join("; "));
