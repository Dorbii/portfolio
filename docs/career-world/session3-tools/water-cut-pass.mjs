// THE WATER-CUT PASS (owner 2026-09-06 17:40: "do a full pass to make sure
// all the water of the land tiles is cut properly"): every authored cell's
// land layer is scanned for PAINTED WATER LEFT OPAQUE — pixels the pipeline's
// own classifier calls water paint (hue 150-225, saturated, blue-leaning) that
// still carry full alpha in the kept area, so the ocean layer cannot show
// there and the cell's painted water (cliff reflections, a painted cove) sits
// on top of the real water. Regions of 300 px or more are reported per cell.
//
// --fix: for a cell over --min px (default 1500), the flagged regions are cut
// from the recorded land layer (alpha 0, a 2-px feathered edge) and added to
// the recorded water mask, and the cell is restitched from its recorded
// sources (cell.mjs --restitch: no dispatch, no gates — the acceptance
// stands). Mask-only; the art is untouched. Needs the cell lock free.
//
//   node docs/career-world/session3-tools/water-cut-pass.mjs [--fix] [--min 1500] [--only tanium:c0-0,...] [--sheet out.jpg]
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import sharp from "sharp";
sharp.cache(false);
const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const FIX = process.argv.includes("--fix"), MIN = Number(arg("--min", 1500)), SHEET = arg("--sheet");
const ONLY = (arg("--only", "") || "").split(",").filter(Boolean);
const BACKUP_DIR = arg("--backup-dir");
const ART = "art-source/career-world/l2-land", A = "public/career-world/layers/terrain/authority";
const GEN = 2560, BLEED = 256, KEPT = 2048, M2 = (97.6 / KEPT) ** 2;   // m² per px
const WATER_HUE = [150, 225];
const isWaterPaint = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0;
  if (!(mx > 40 && sat > 0.25 && b > r && b >= g) || mx === mn) return false;
  let h = mx === r ? 60 * (((g - b) / (mx - mn)) % 6) : mx === g ? 60 * ((b - r) / (mx - mn) + 2) : 60 * ((r - g) / (mx - mn) + 4);
  if (h < 0) h += 360;
  return h >= WATER_HUE[0] && h <= WATER_HUE[1];
};
if (FIX && fs.existsSync(".codex-tmp/authoring/cell.lock")) { console.log("lock present — a cell is being stitched; audit only"); process.exit(1); }
const results = [], sheets = [];
for (const t of ["ninjaone", "tanium", "coast"]) {
  const ledger = JSON.parse(fs.readFileSync(`${A}/manifests/terrain-l2-${t}-r1.json`, "utf8"));
  for (const id of Object.keys(ledger.cells).sort()) {
    if (ONLY.length && !ONLY.includes(`${t}:${id}`)) continue;
    const l2f = `${ART}/${t}/${id}/${id}-l2.png`, wf = `${ART}/${t}/${id}/${id}-water.png`;
    const backup = (file) => {
      const destination = BACKUP_DIR ? path.join(BACKUP_DIR, t, id, path.basename(file)) : file.replace(/\.png$/, "-before-water-pass.png");
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(file, destination);
    };
    if (!fs.existsSync(l2f)) { results.push({ t, id, note: "no layer" }); continue; }
    const img = await sharp(l2f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = img.info.width, H = img.info.height, d = img.data, b = Math.round((W - KEPT) / 2);
    // flag: opaque water paint in the kept area
    const flag = new Uint8Array(W * H);
    for (let y = b; y < b + KEPT; y += 1) for (let x = b; x < b + KEPT; x += 1) {
      const o = (y * W + x) * 4;
      if (d[o + 3] > 250 && isWaterPaint(d[o], d[o + 1], d[o + 2])) flag[y * W + x] = 1;
    }
    // connected regions >= 300 px (4-neighbour flood fill)
    const label = new Int32Array(W * H); let next = 0; const sizes = [];
    const stack = new Int32Array(W * H);
    for (let p = 0; p < W * H; p += 1) {
      if (!flag[p] || label[p]) continue;
      next += 1; let sp = 0, n = 0; stack[sp++] = p; label[p] = next;
      while (sp) { const q = stack[--sp]; n += 1; const qx = q % W, qy = (q - qx) / W;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = qx + dx, yy = qy + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const r = yy * W + xx; if (flag[r] && !label[r]) { label[r] = next; stack[sp++] = r; } } }
      sizes.push(n);
    }
    // a region counts only if it TOUCHES water already cut (alpha < 128 within
    // 24 px of some of its pixels): uncut painted sea and pools border the cut;
    // N c3-1's blue haze and crystal glow read as water paint but border none
    const touches = new Map();
    for (let p = 0; p < W * H; p += 1) {
      const lb = label[p]; if (!lb || touches.get(lb)) continue;
      const x = p % W, y = (p - x) / W;
      for (let dy = -24; dy <= 24 && !touches.get(lb); dy += 8) for (let dx = -24; dx <= 24; dx += 8) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        if (d[(yy * W + xx) * 4 + 3] < 128) { touches.set(lb, true); break; }
      }
    }
    const big = new Set(); let total = 0, haze = 0;
    sizes.forEach((n, i) => { if (n >= 300) { if (touches.get(i + 1)) { big.add(i + 1); total += n; } else haze += n; } });
    const rec = { t, id, regions: big.size, px: total, m2: +(total * M2).toFixed(1), haze };
    results.push(rec);
    if (SHEET && total >= MIN) {
      // a 3-channel view: the layer dimmed with the flagged regions in cyan
      const view = Buffer.alloc(KEPT * KEPT * 3);
      for (let y = 0; y < KEPT; y += 1) for (let x = 0; x < KEPT; x += 1) {
        const p = (y + b) * W + x + b, o = p * 4, v = (y * KEPT + x) * 3, a = d[o + 3] / 255;
        const fl = big.has(label[p]);
        view[v] = fl ? 60 : Math.round((d[o] * a + 31 * (1 - a)) * 0.7); view[v + 1] = fl ? 230 : Math.round((d[o + 1] * a + 96 * (1 - a)) * 0.7); view[v + 2] = fl ? 255 : Math.round((d[o + 2] * a + 108 * (1 - a)) * 0.7);
      }
      const label2 = Buffer.from(`<svg width="700" height="700"><rect x="8" y="8" width="360" height="40" rx="5" fill="rgba(0,0,0,0.65)"/><text x="16" y="36" fill="#fff" font-family="monospace" font-size="24">${t[0].toUpperCase()} ${id}: ${rec.m2} m² uncut</text></svg>`);
      sheets.push(await sharp(view, { raw: { width: KEPT, height: KEPT, channels: 3 } }).resize(700, 700).composite([{ input: label2, left: 0, top: 0 }]).png().toBuffer());
    }
    if (FIX && total >= MIN) {
      // cut the flagged regions from the layer (alpha 0; the ring of neighbours half) and add them to the water mask
      const out = Buffer.from(d);
      for (let p = 0; p < W * H; p += 1) if (big.has(label[p])) out[p * 4 + 3] = 0;
      for (let y = 1; y < H - 1; y += 1) for (let x = 1; x < W - 1; x += 1) {
        const p = y * W + x; if (big.has(label[p]) || out[p * 4 + 3] === 0) continue;
        if (big.has(label[p - 1]) || big.has(label[p + 1]) || big.has(label[p - W]) || big.has(label[p + W])) out[p * 4 + 3] = Math.min(out[p * 4 + 3], 128);
      }
      backup(l2f);
      await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(l2f);
      if (fs.existsSync(wf)) {
        const wm = await sharp(wf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const wo = Buffer.from(wm.data);
        if (wm.info.width === W) { for (let p = 0; p < W * H; p += 1) if (big.has(label[p])) { wo[p * 4] = wo[p * 4 + 1] = wo[p * 4 + 2] = 255; wo[p * 4 + 3] = 255; } }
        backup(wf);
        await sharp(wo, { raw: { width: wm.info.width, height: wm.info.height, channels: 4 } }).png().toFile(wf);
      }
      const [c, r] = id.slice(1).split("-");
      const outp = execFileSync(process.execPath, ["tools/world-authoring/cell.mjs", "--territory", t, "--cell", `${c},${r}`, "--restitch"],
        { encoding: "utf8", windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
      rec.fixed = true;
      rec.log = outp.split("\n").filter((l) => /restitch|tiles|Error/.test(l)).slice(0, 3).join(" | ");
    }
  }
}
console.log(`${results.length} authored cells scanned; painted water left opaque (regions >= 300 px):`);
for (const r of results.filter((x) => x.px > 0 || x.haze > 0).sort((p, q) => q.px - p.px)) console.log(`  ${r.t[0].toUpperCase()} ${r.id.padEnd(5)} ${String(r.regions).padStart(3)} region(s) ${String(r.px).padStart(7)} px ${String(r.m2).padStart(7)} m²${r.haze ? ` (+${r.haze} px of blue paint away from water, left alone)` : ""}${r.fixed != null ? (r.fixed ? "  FIXED and restitched" : `  fix FAILED: ${r.log}`) : total_note(r)}`);
function total_note(r) { return r.px >= MIN ? (FIX ? "" : "  → over --min, would be cut with --fix") : ""; }
if (SHEET && sheets.length) {
  const cols = Math.min(4, sheets.length), rows = Math.ceil(sheets.length / cols);
  await sharp({ create: { width: cols * 710 - 10, height: rows * 710 - 10, channels: 3, background: "#000" } })
    .composite(sheets.map((s, i) => ({ input: s, left: (i % cols) * 710, top: Math.floor(i / cols) * 710 }))).jpeg({ quality: 82 }).toFile(SHEET);
  console.log(`  sheet ${SHEET} (${sheets.length} cells over --min, the flagged regions in cyan)`);
}
