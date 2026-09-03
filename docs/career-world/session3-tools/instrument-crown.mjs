import fs from "node:fs";
const p = "tests/world-authoring-stitch.test.mjs"; let t = fs.readFileSync(p, "utf8");
const a1 = `  let inside = 0, crown = 0, third = 0, gap = 0;
  for (let y = yMid - R; y <= yMid + R; y++) for (let x = bx - R; x <= bx + R; x++) {
    if (Math.hypot(x - bx, y - yMid) >= R - 12) continue;          // 12 px inside the crown's edge, past the 8 px feather
    inside += 1;
    const [r, g, b, a] = await worldPixel(tiles, x, y);
    if (a !== 255) gap += 1;`;
const r1 = `  let inside = 0, crown = 0, third = 0, gap = 0;
  const bbox = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  for (let y = yMid - R; y <= yMid + R; y++) for (let x = bx - R; x <= bx + R; x++) {
    if (Math.hypot(x - bx, y - yMid) >= R - 12) continue;          // 12 px inside the crown's edge, past the 8 px feather
    inside += 1;
    const [r, g, b, a] = await worldPixel(tiles, x, y);
    if (a !== 255) { gap += 1; bbox.x0 = Math.min(bbox.x0, x); bbox.x1 = Math.max(bbox.x1, x); bbox.y0 = Math.min(bbox.y0, y); bbox.y1 = Math.max(bbox.y1, y); }`;
const a2 = `  assert.equal(gap, 0, "the band stays opaque");`;
const r2 = `  if (gap > 0 || third > 0) {
    // keep the evidence beside the scratch world: the crown region and the numbers
    const dbg = path.join(ROOT, ".codex-tmp", "dir-stitch", "crown-debug");
    fs.mkdirSync(dbg, { recursive: true });
    const S = 2 * R + 1, buf = Buffer.alloc(S * S * 4);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) buf.set(await worldPixel(tiles, bx - R + x, yMid - R + y), (y * S + x) * 4);
    await sharp(buf, { raw: { width: S, height: S, channels: 4 } }).png().toFile(path.join(dbg, "crown-region.png"));
    fs.writeFileSync(path.join(dbg, "crown.json"), JSON.stringify({ bx, yMid, inside, crown, third, gap, bbox, sample: await worldPixel(tiles, bx, yMid) }));
  }
  assert.equal(gap, 0, \`the band stays opaque (bbox \${JSON.stringify(bbox)})\`);`;
for (const [a, r] of [[a1, r1], [a2, r2]]) { if (t.split(a).length !== 2) throw new Error("anchor: " + a.slice(0, 40)); t = t.replace(a, r); }
fs.writeFileSync(p, t); console.log("instrumented");
