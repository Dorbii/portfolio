// Lock change 6 — (6a) palette gate on ALL land (tone dLuma > 20 fails), (6b) the
// neighbour's edge tone blended into the edit target's grey across the outer third.
// Anchored on exact current text; --check verifies every anchor and writes nothing.
import fs from "node:fs";
const CHECK = process.argv.includes("--check");
function patch(file, edits) {
  let t = fs.readFileSync(file, "utf8"); const done = [];
  for (const [name, from, to] of edits) {
    const n = t.split(from).length - 1;
    if (n !== 1) throw new Error(`${file} ${name}: anchor matched ${n} times, expected 1`);
    t = t.replace(from, to); done.push(name);
  }
  if (CHECK) { console.log(file, "anchors ok:", done.join("; ")); return; }
  fs.writeFileSync(file, t); console.log(file, "applied:", done.join("; "));
}

patch("tools/world-authoring/cell.mjs", [
  ["6a counters",
    `  let palWorst = { bg: 0, luma: 0 }, palSeams = 0;`,
    `  let palWorst = { bg: 0, luma: 0 }, palSeams = 0;
  let toneWorst = 0, toneSeams = 0;   // all-land tone step (owner 2026-09-02)`],
  ["6a toneBand",
    `      return { bg: b / g, luma: 0.2126 * r + 0.7152 * g + 0.0722 * b };
    };`,
    `      return { bg: b / g, luma: 0.2126 * r + 0.7152 * g + 0.0722 * b };
    };
    // the same band over ALL opaque land: a moor's olive is not vegetation to
    // the classifier above, and a stark tone step on it passed as "no
    // vegetated seams" (owner 2026-09-02: "the seams are stark here")
    const toneBand = (buf, edge) => {
      const ls = [];
      for (let t = 256; t < 2304; t += 2) {
        for (let o = 16; o <= 176; o += 2) {
          let gx, gy;
          if (edge === "N") { gx = t; gy = BLEED + o; }
          else if (edge === "S") { gx = t; gy = CELL_PX + BLEED - o; }
          else if (edge === "W") { gy = t; gx = BLEED + o; }
          else { gy = t; gx = CELL_PX + BLEED - o; }
          const i = (gy * GEN_PX + gx) * 4;
          if (buf[i + 3] < 250) continue;
          ls.push(0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2]);
        }
      }
      if (ls.length < 500) return null;
      ls.sort((p, q) => p - q);
      return { luma: ls[ls.length >> 1] };
    };`],
  ["6a tone check",
    `      const theirs = vegBand(nRaw.data, opp);
      if (!mine || !theirs) continue;`,
    `      const theirs = vegBand(nRaw.data, opp);
      const tMine = toneBand(data, edge), tTheirs = toneBand(nRaw.data, opp);
      if (tMine && tTheirs) {
        const dT = Math.abs(tMine.luma - tTheirs.luma);
        toneWorst = Math.max(toneWorst, dT); toneSeams += 1;
        if (dT > 20) {
          palViolations.push(\`\${nb.id} seam: tone dLuma \${dT.toFixed(1)} on all land (limit 20; accepted seams read 2.3-17.4, the stark one 24.5)\`);
        }
      }
      if (!mine || !theirs) continue;`],
  ["6a gate row",
    `    { name: "palette conformance", value: palSeams
        ? \`worst dBG \${palWorst.bg.toFixed(3)} dLuma \${palWorst.luma.toFixed(1)} over \${palSeams} seam(s)\`
        : "no vegetated seams", pass: palViolations.length === 0,`,
    `    { name: "palette conformance", value: (palSeams || toneSeams)
        ? \`\${palSeams ? \`veg worst dBG \${palWorst.bg.toFixed(3)} dLuma \${palWorst.luma.toFixed(1)} over \${palSeams} seam(s); \` : "no vegetated seams; "}tone worst dLuma \${toneWorst.toFixed(1)} on all land over \${toneSeams} seam(s)\`
        : "no authored seams", pass: palViolations.length === 0,`],
  ["6b tone ramp",
    `    await sharp(target, { raw: { width: GEN_PX, height: GEN_PX, channels: 4 } }).png()
      .toFile(path.join(ctxDir, "edit-target.png"));`,
    `    // tone ramp (owner 2026-09-02, "need a better transition"): the Transitions
    // words did not place the biome change inside the cell — the model changed
    // tone at the line. So the transition is given as pixels: along each
    // authored orthogonal edge, the neighbour's tone just before the grey
    // (per 64 px segment, the median of its last 64 painted px) is blended
    // into the grey across the outer third of the kept area, fading to the
    // flat grey. The model continues a tone it can see.
    {
      const THIRD = Math.round(CELL_PX / 3);
      const isGrey = (o) => target[o] === EDIT_GREY[0] && target[o + 1] === EDIT_GREY[1] && target[o + 2] === EDIT_GREY[2];
      const frames = {
        N: (u, v) => [u, BLEED + v], S: (u, v) => [u, CELL_PX + BLEED - 1 - v],
        W: (u, v) => [BLEED + v, u], E: (u, v) => [CELL_PX + BLEED - 1 - v, u],
      };
      const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
      for (const nb of authoredNeighbours) {
        const [nc, nr] = nb.cell;
        if (Math.abs(nc - col) + Math.abs(nr - row) !== 1) continue;
        const edge = nc > col ? "E" : nc < col ? "W" : nr > row ? "S" : "N";
        const f = frames[edge];
        for (let u0 = 0; u0 < GEN_PX; u0 += 64) {
          const rs = [], gs = [], bs = [];
          for (let u = u0; u < Math.min(GEN_PX, u0 + 64); u++) {
            for (let v = BLEED - 64; v < BLEED; v++) {   // the neighbour's last painted rows before the grey
              const [x, y] = f(u, v); const o = (y * GEN_PX + x) * 4;
              if (isGrey(o)) continue;
              rs.push(target[o]); gs.push(target[o + 1]); bs.push(target[o + 2]);
            }
          }
          if (rs.length < 512) continue;   // no neighbour paint on this segment
          const tone = [med(rs), med(gs), med(bs)];
          for (let u = u0; u < Math.min(GEN_PX, u0 + 64); u++) {
            for (let v = BLEED; v < THIRD; v++) {
              const [x, y] = f(u, v); const o = (y * GEN_PX + x) * 4;
              if (!isGrey(o)) continue;
              const w = 1 - v / THIRD;
              for (let c = 0; c < 3; c++) target[o + c] = Math.round(EDIT_GREY[c] + (tone[c] - EDIT_GREY[c]) * w);
            }
          }
        }
      }
    }
    await sharp(target, { raw: { width: GEN_PX, height: GEN_PX, channels: 4 } }).png()
      .toFile(path.join(ctxDir, "edit-target.png"));`],
]);

patch("tests/world-authoring-stitch.test.mjs", [
  ["6b control: ramp inside the third, grey beyond it",
    `  // beyond any neighbour's canvas: the grey fill
  for (const [x, y] of [[1280, 1280], [2400, 300], [700, 2500]]) {
    assert.deepEqual(px(x, y), [96, 104, 88], \`grey at \${x},\${y}\`);
  }`,
    `  // beyond the outer third of any authored edge: the grey fill
  for (const [x, y] of [[1280, 1280], [2400, 300], [1100, 2500]]) {
    assert.deepEqual(px(x, y), [96, 104, 88], \`grey at \${x},\${y}\`);
  }
  // lock change 6b: inside the outer third of the west edge the grey carries
  // the neighbour's tone, fading with distance from the kept edge
  {
    const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
    const rs = [], gs = [], bs = [];
    for (let x = 192; x < 256; x++) for (let y = 1280; y < 1344; y++) { const [r, g, b] = px(x, y); rs.push(r); gs.push(g); bs.push(b); }
    const tone = [med(rs), med(gs), med(bs)];
    const THIRD = Math.round(CELL / 3);
    for (const x of [300, 600]) {
      const w = 1 - (x - BLEED) / THIRD;
      const expect = [96, 104, 88].map((gv, c) => Math.round(gv + (tone[c] - gv) * w));
      const got = px(x, 1300);
      for (let c = 0; c < 3; c++) assert.ok(Math.abs(got[c] - expect[c]) <= 2, \`tone ramp at x=\${x}: got \${got}, expected \${expect}\`);
    }
  }`],
  ["6a control: a +30 luma band fails the tone gate",
    `test("painted water beyond the mask fails the 48px ring gate and leaves the world untouched", () => {`,
    `test("a +30 luma step across an authored seam fails the all-land tone gate", async () => {
  // G' = G lifted by 30 luma in the west third only: vegetation medians barely
  // move (the lift is on every channel), the all-land tone step does
  const lifted = (x, y) => { const [r, g, b, a] = G(x, y); const inWest = x - (2 * CELL) < CELL / 3; const k = inWest ? 30 : 0; return [Math.min(255, r + k), Math.min(255, g + k), Math.min(255, b + k), a]; };
  await writeArtefacts(path.join(SYN, "b-tone"), "c2-1", genImage(2, 1, lifted));
  const before = treeHash();
  let out = "";
  try { runCell("2,1", path.join(SYN, "b-tone"), ["--force"]); assert.fail("b-tone must be rejected"); }
  catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); }
  assert.match(out, /tone dLuma [0-9.]+ on all land/, "the all-land tone gate must fire:\\n" + out.slice(-600));
  assert.equal(treeHash(), before, "world untouched");
});

test("painted water beyond the mask fails the 48px ring gate and leaves the world untouched", () => {`],
]);
