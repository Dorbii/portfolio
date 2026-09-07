// THE CANOPY SWAY FIELD, one per authored cell (owner 2026-09-07: "we can do
// the foliage animation and detail work before the city step"; the plan:
// canopy sway from the crown masks over the BAKED pixels — no regeneration,
// no sprites). Reads the cell's land layer, finds the conifer crowns (dark
// saturated green with needle texture, closed, blobs of 150 px or more), and
// writes the field the runtime's sway pass samples per pixel:
//   R = the sway weight up the crown (0 at its foot, 255 at its top)
//   G = the crown's height in px / 2 (its period: tall crowns swing slower)
//   B = a phase per crown (no two neighbours in step)
//   A = coverage: the crown dilated by the largest displacement, soft-edged,
//       so the pass also moves the ground right round a crown and no static
//       edge is left showing behind a swaying one
// at half resolution (1024 px for a 2048 px cell) to
//   art-source/career-world/l2-land/<t>/<id>/<id>-sway.png       (the record)
//   public/career-world/layers/terrain/authority/tiles/l2-<t>/<id>-sway.webp
//
//   node docs/career-world/session3-tools/sway-field.mjs [--only tanium:c3-1,...] [--sheet out.jpg]
import fs from "node:fs";
import sharp from "sharp";
sharp.cache(false);
const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const ONLY = (arg("--only", "") || "").split(",").filter(Boolean), SHEET = arg("--sheet");
const ART = "art-source/career-world/l2-land", A = "public/career-world/layers/terrain/authority";
const KEPT = 2048, B = 256, OUT_PX = 1024, MIN_CROWN = 150, RING = 4;
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const hueOf = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx === mn) return -1;
  let h = mx === r ? 60 * (((g - b) / (mx - mn)) % 6) : mx === g ? 60 * ((b - r) / (mx - mn) + 2) : 60 * ((r - g) / (mx - mn) + 4);
  if (h < 0) h += 360;
  return h;
};
const sheets = [];
let done = 0;
for (const t of ["ninjaone", "tanium", "coast"]) {
  const ledger = JSON.parse(fs.readFileSync(`${A}/manifests/terrain-l2-${t}-r1.json`, "utf8"));
  for (const id of Object.keys(ledger.cells).sort()) {
    if (ONLY.length && !ONLY.includes(`${t}:${id}`)) continue;
    const f = `${ART}/${t}/${id}/${id}-l2.png`;
    if (!fs.existsSync(f)) continue;
    const img = await sharp(f).extract({ left: B, top: B, width: KEPT, height: KEPT }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = KEPT, d = img.data;
    // 1. candidates: dark saturated green
    const cand = new Uint8Array(W * W);
    for (let y = 0; y < W; y += 1) for (let x = 0; x < W; x += 1) {
      const o = (y * W + x) * 4;
      if (d[o + 3] < 128) continue;
      const r = d[o], g = d[o + 1], b = d[o + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0;
      if (g > r && sat > 0.28 && luma(r, g, b) < 95) { const h = hueOf(r, g, b); if (h >= 60 && h <= 170) cand[y * W + x] = 1; }
    }
    // 2. needle texture: the 9x9 window's luma sd over 9
    const keep = new Uint8Array(W * W);
    for (let y = 4; y < W - 4; y += 1) for (let x = 4; x < W - 4; x += 1) {
      if (cand[y * W + x] === 0) continue;
      let s = 0, s2 = 0, n = 0;
      for (let j = -4; j <= 4; j += 2) for (let i = -4; i <= 4; i += 2) { const o = ((y + j) * W + x + i) * 4; const L = luma(d[o], d[o + 1], d[o + 2]); s += L; s2 += L * L; n += 1; }
      if (Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2)) > 9) keep[y * W + x] = 1;
    }
    // 3. close (dilate 2, erode 2)
    const dil = (src, r) => {
      const out = new Uint8Array(W * W);
      for (let y = 0; y < W; y += 1) for (let x = 0; x < W; x += 1) {
        if (src[y * W + x] === 0) continue;
        for (let j = -r; j <= r; j += 1) for (let i = -r; i <= r; i += 1) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < W && yy < W) out[yy * W + xx] = 1; }
      }
      return out;
    };
    const ero = (src, r) => {
      const out = new Uint8Array(W * W);
      for (let y = r; y < W - r; y += 1) for (let x = r; x < W - r; x += 1) {
        let ok = 1;
        for (let j = -r; j <= r && ok; j += 1) for (let i = -r; i <= r; i += 1) if (src[(y + j) * W + x + i] === 0) { ok = 0; break; }
        out[y * W + x] = ok;
      }
      return out;
    };
    const closed = ero(dil(keep, 2), 2);
    // 4. crowns: components of MIN_CROWN px or more, each with its foot, height and phase
    const lab = new Int32Array(W * W), comps = [], st = [];
    for (let p = 0; p < W * W; p += 1) {
      if (closed[p] === 0 || lab[p] !== 0) continue;
      const cid = comps.length + 1; const members = []; st.push(p); lab[p] = cid; let miny = W, maxy = 0;
      while (st.length) {
        const q = st.pop(); members.push(q); const x = q % W, y = (q - x) / W;
        if (y < miny) miny = y; if (y > maxy) maxy = y;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= W) continue; const r = yy * W + xx; if (closed[r] !== 0 && lab[r] === 0) { lab[r] = cid; st.push(r); } }
      }
      if (members.length < MIN_CROWN) { for (const q of members) lab[q] = -1; comps.push(null); continue; }
      comps.push({ miny, maxy, height: maxy - miny + 1, phase: (cid * 2654435761 >>> 0) & 255, n: members.length });
    }
    // 5. the field: R weight up the crown, G height/2, B phase, A 255 in the crown
    const field = Buffer.alloc(W * W * 4);
    let crownPx = 0, crowns = 0;
    for (const c of comps) if (c) crowns += 1;
    for (let p = 0; p < W * W; p += 1) {
      const cid = lab[p]; if (cid <= 0) continue;
      const c = comps[cid - 1]; if (!c) continue;
      const y = Math.floor(p / W), o = p * 4;
      field[o] = Math.round(255 * Math.max(0, Math.min(1, (c.maxy - y) / c.height)));
      field[o + 1] = Math.min(255, Math.round(c.height / 2));
      field[o + 2] = c.phase;
      field[o + 3] = 255;
      crownPx += 1;
    }
    // 6. the ring: RING passes of 1-px dilation copying the values of a crown neighbour, alpha falling off
    let cur = Buffer.from(field);
    for (let k = 1; k <= RING; k += 1) {
      const nxt = Buffer.from(cur);
      const alpha = Math.round(255 * (1 - k / (RING + 1)));
      for (let y = 1; y < W - 1; y += 1) for (let x = 1; x < W - 1; x += 1) {
        const p = y * W + x, o = p * 4;
        if (cur[o + 3] > 0) continue;
        for (const q of [p - 1, p + 1, p - W, p + W]) {
          const qo = q * 4;
          if (cur[qo + 3] > alpha) { nxt[o] = cur[qo]; nxt[o + 1] = cur[qo + 1]; nxt[o + 2] = cur[qo + 2]; nxt[o + 3] = alpha; break; }
        }
      }
      cur = nxt;
    }
    const png = await sharp(cur, { raw: { width: W, height: W, channels: 4 } }).resize(OUT_PX, OUT_PX, { kernel: "lanczos2" }).png().toBuffer();
    fs.writeFileSync(`${ART}/${t}/${id}/${id}-sway.png`, png);
    fs.mkdirSync(`${A}/tiles/l2-${t}`, { recursive: true });
    await sharp(png).webp({ quality: 90, alphaQuality: 90 }).toFile(`${A}/tiles/l2-${t}/${id}-sway.webp`);
    done += 1;
    console.log(`  ${t[0].toUpperCase()} ${id}: ${crowns} crowns, ${(100 * crownPx / (W * W)).toFixed(1)}% of the cell`);
    if (SHEET) {
      const view = Buffer.alloc(W * W * 3);
      for (let p = 0; p < W * W; p += 1) {
        const o = p * 4, v = p * 3, a = d[o + 3] / 255, w = cur[o + 3] / 255;
        const cr = Math.round((d[o] * a + 31 * (1 - a)) * 0.7), cg = Math.round((d[o + 1] * a + 96 * (1 - a)) * 0.7), cb = Math.round((d[o + 2] * a + 108 * (1 - a)) * 0.7);
        view[v] = Math.round(cr * (1 - w) + 40 * w); view[v + 1] = Math.round(cg * (1 - w) + (120 + cur[o] / 2) * w); view[v + 2] = Math.round(cb * (1 - w) + 255 * w);
      }
      const label = Buffer.from(`<svg width="1024" height="1024"><rect x="8" y="8" width="360" height="36" rx="5" fill="rgba(0,0,0,0.65)"/><text x="16" y="34" fill="#fff" font-family="monospace" font-size="22">${t[0].toUpperCase()} ${id}: ${crowns} crowns</text></svg>`);
      sheets.push(await sharp(view, { raw: { width: W, height: W, channels: 3 } }).resize(1024, 1024).composite([{ input: label, left: 0, top: 0 }]).png().toBuffer());
    }
  }
}
console.log(`${done} sway fields written`);
if (SHEET && sheets.length) {
  const cols = Math.min(3, sheets.length), rows = Math.ceil(sheets.length / cols);
  await sharp({ create: { width: cols * 1034, height: rows * 1034, channels: 3, background: "#000" } })
    .composite(sheets.map((s, i) => ({ input: s, left: (i % cols) * 1034, top: Math.floor(i / cols) * 1034 }))).jpeg({ quality: 84 }).toFile(SHEET);
  console.log(`  sheet ${SHEET}`);
}
