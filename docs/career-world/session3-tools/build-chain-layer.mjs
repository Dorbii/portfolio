// THE CHAIN LAYER (owner 2026-09-06: "lets do it that way then") — the rune
// chain drawn ONCE along its route and laid over the land at serve time,
// instead of seven cells each drawing their own.
//
// Inputs: the route (art-source/career-world/l2-land/tanium/rune-chain.def.json:
// waypoints and nodes in Tanium grid units) and two elements with alpha —
// the KERB (art-source/career-world/chain/kerb-element-r1.png: a seamless
// horizontal strip of the pale fitted-stone kerb with the dark groove along
// its foot, the groove's centre on the strip's horizontal midline) and the
// NODE (art-source/career-world/chain/node-element-r1.png: the rune panels
// that flank the groove at a settlement, transparent elsewhere).
//
// Output: one RGBA overlay per Tanium cell the route crosses, at the cell's
// full L0 size (2048 px, no bleed), art-source/career-world/chain/cells/
// tanium-<id>-chain.png — the kerb strip laid along the route (per column the
// route's height, so the canon slopes are kept), horizontally flipped every
// other repeat and phase-shifted per cell so no two repeats read alike, the
// node element centred on each node, everything masked by the land's own
// alpha so the kerb never crosses water and ends at the shore. world-register
// composites these onto the served tiles with --chain; the pyramids never
// carry the chain.
//
//   node docs/career-world/session3-tools/build-chain-layer.mjs [--kerb file] [--node file] [--out dir] [--preview out.jpg]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
sharp.cache(false);
const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const ART = "art-source/career-world";
const KERB = arg("--kerb", `${ART}/chain/kerb-element.png`), NODE = arg("--node", `${ART}/chain/node-element.png`);   // the chosen elements (copies of a revision)
const CLUSTER = arg("--cluster", `${ART}/chain/cluster-element.png`);   // a leader and its endpoints, at a branch's apex
const HUB = arg("--hub", `${ART}/chain/hub-element.png`), LEADER = arg("--leader", `${ART}/chain/leader-element.png`);   // the server far off the chain, the leaders on it
const OUT = arg("--out", `${ART}/chain/cells`), PREVIEW = arg("--preview");
const CELL = 2048, BLEED = 256;
const route = JSON.parse(fs.readFileSync(`${ART}/l2-land/tanium/rune-chain.def.json`, "utf8"));
const W = route.waypoints;
const yAt = (x) => {
  for (let i = 1; i < W.length; i += 1) {
    const a = W[i - 1], b = W[i];
    if (a[0] === b[0] || (a[0] - x) * (b[0] - x) > 0) continue;
    const t = (x - a[0]) / (b[0] - a[0]);
    if (t < 0 || t > 1) continue;
    return a[1] + t * (b[1] - a[1]);
  }
  return null;
};
if (!fs.existsSync(KERB)) throw new Error(`no kerb element at ${KERB} — generate it first (chain-element.mjs)`);
const kerb = await sharp(KERB).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const KW = kerb.info.width, KH = kerb.info.height;
const sidecar = (f) => { const j = f.replace(/\.png$/, ".json"); return fs.existsSync(j) ? JSON.parse(fs.readFileSync(j, "utf8")) : null; };
const KA = sidecar(KERB)?.anchorRow ?? Math.round(KH / 2);   // the groove's row in the element: it sits on the route
// THE WORLD'S VIEW (owner 2026-09-07 02:50, on the served hub and leaders:
// "the main issue here is perspective and scale"): the canon is a high
// oblique — a circle on the ground is an ellipse about 0.73 as tall as it is
// wide (the crater tarn in N c1-0 measures 455 x 330 px) — and the elements
// came from image_gen as top-down coins: true circles, a rim all the way
// round, spike stubs where the cluster's scratches were cut off. So every
// disc is fitted to its own circle (the stubs go), foreshortened to the view
// and sized to the groove: a panel a little wider than the groove is tall, a
// leader two grooves, the hub four. The panels keep their spread (each
// shrinks about its own centre; the arrangement tightens a little).
const VIEW_ASPECT = 0.73;
const LEADER_PX = 90, HUB_PX = 170, PANEL_SCALE = 0.55, PANEL_LAYOUT = 0.8, SPOKE_SCALE = 0.85;
const rawOf = (img) => img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
async function prepDisc(file, targetW) {
  if (!fs.existsSync(file)) return null;
  const el = await rawOf(sharp(file));
  const EW = el.info.width, EH = el.info.height, d = el.data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < EW && y < EH && d[(y * EW + x) * 4 + 3] > 64;
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < EH; y += 1) for (let x = 0; x < EW; x += 1) if (solid(x, y)) { sx += x; sy += y; n += 1; }
  const cx = sx / n, cy = sy / n, dists = [];
  for (let y = 0; y < EH; y += 1) for (let x = 0; x < EW; x += 1) if (solid(x, y) && !(solid(x - 1, y) && solid(x + 1, y) && solid(x, y - 1) && solid(x, y + 1))) dists.push(Math.hypot(x - cx, y - cy));
  dists.sort((a, b) => a - b);
  const r = dists[Math.floor(dists.length * 0.35)];       // the disc's own radius: the stubs are the far tail of the edge distances
  const cut = Buffer.from(d);
  for (let y = 0; y < EH; y += 1) for (let x = 0; x < EW; x += 1) {
    const dd = Math.hypot(x - cx, y - cy) - r, o = (y * EW + x) * 4;
    if (dd > 1.5) cut[o + 3] = 0; else if (dd > -0.5) cut[o + 3] = Math.round(cut[o + 3] * (1.5 - dd) / 2);
  }
  const L = Math.max(0, Math.round(cx - r - 2)), T = Math.max(0, Math.round(cy - r - 2));
  const S = Math.min(EW - L, EH - T, Math.round(2 * r + 4));
  const w = targetW, h = Math.round(targetW * VIEW_ASPECT);
  const res = await rawOf(sharp(cut, { raw: { width: EW, height: EH, channels: 4 } }).extract({ left: L, top: T, width: S, height: S }).resize(w, h, { kernel: "lanczos3" }));
  console.log(`  ${path.basename(file)}: a disc of r ${r.toFixed(0)} px in ${EW} x ${EH} → ${w} x ${h} (view ${VIEW_ASPECT})`);
  return res;
}
async function prepNode(file) {
  if (!fs.existsSync(file)) return null;
  const el = await rawOf(sharp(file));
  const EW = el.info.width, EH = el.info.height, d = el.data;
  const lab = new Int32Array(EW * EH), comps = [], stack = [];
  for (let p = 0; p < EW * EH; p += 1) {
    if (d[p * 4 + 3] <= 64 || lab[p]) continue;
    const id = comps.length + 1; let minx = EW, maxx = 0, miny = EH, maxy = 0, n = 0;
    stack.push(p); lab[p] = id;
    while (stack.length) {
      const q = stack.pop(); const x = q % EW, y = (q - x) / EW; n += 1;
      if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= EW || yy >= EH) continue; const r = yy * EW + xx; if (!lab[r] && d[r * 4 + 3] > 64) { lab[r] = id; stack.push(r); } }
    }
    comps.push({ id, minx, maxx, miny, maxy, n });
  }
  const panels = comps.filter((c) => c.n >= 400);          // the panels; crumbs go
  const layers = [];
  for (const c of panels) {
    const bw = c.maxx - c.minx + 1, bh = c.maxy - c.miny + 1, buf = Buffer.alloc(bw * bh * 4);
    for (let y = 0; y < bh; y += 1) for (let x = 0; x < bw; x += 1) { const p = (c.miny + y) * EW + c.minx + x; if (lab[p] === c.id) buf.set(d.subarray(p * 4, p * 4 + 4), (y * bw + x) * 4); }
    const w = Math.max(1, Math.round(bw * PANEL_SCALE)), h = Math.max(1, Math.round(bh * PANEL_SCALE * VIEW_ASPECT));
    const png = await sharp(buf, { raw: { width: bw, height: bh, channels: 4 } }).resize(w, h, { kernel: "lanczos3" }).png().toBuffer();
    const ccx = (c.minx + c.maxx) / 2, ccy = (c.miny + c.maxy) / 2;
    const nx = EW / 2 + (ccx - EW / 2) * PANEL_LAYOUT, ny = EH / 2 + (ccy - EH / 2) * PANEL_LAYOUT;
    layers.push({ input: png, left: Math.max(0, Math.round(nx - w / 2)), top: Math.max(0, Math.round(ny - h / 2)) });
  }
  const res = await rawOf(sharp({ create: { width: EW, height: EH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers));
  console.log(`  ${path.basename(file)}: ${panels.length} panels (of ${comps.length} parts) scaled x${PANEL_SCALE}, foreshortened ${VIEW_ASPECT}, spread x${PANEL_LAYOUT}`);
  return res;
}
const node = await prepNode(NODE);
const leaderPrepped = await prepDisc(LEADER, LEADER_PX), hubPrepped = await prepDisc(HUB, HUB_PX);
// STANDING STONES (owner 2026-09-07 03:20: "These runes need to look like
// they are part of the land not stones on top of it. Think like stonehedge"):
// menhirs on an ellipse round each node, a trilithon at each leader, a henge
// at the hub — every one placed on its FEET (the sidecar's anchor row), its
// turf skirt re-hued to the local ground, its lowest rows sunk into the ground
// colour, a contact shadow under every foot. An element that exists replaces
// the disc or panel it stands for; chain-element.mjs menhir|trilithon|henge
// generates them.
const MENHIR = arg("--menhir", `${ART}/chain/menhir-element.png`), TRILITHON = arg("--trilithon", `${ART}/chain/trilithon-element.png`), HENGE = arg("--henge", `${ART}/chain/henge-element.png`);
const loadStanding = async (file) => { if (!fs.existsSync(file)) return null; const el = await rawOf(sharp(file)); el.anchor = sidecar(file)?.anchorRow ?? el.info.height - 1; return el; };
function splitStones(el) {           // the menhir set into its stones, each on its own feet, west to east
  const EW = el.info.width, EH = el.info.height, d = el.data, lab = new Int32Array(EW * EH), comps = [], st = [];
  for (let p = 0; p < EW * EH; p += 1) {
    if (d[p * 4 + 3] <= 64 || lab[p]) continue;
    const id = comps.length + 1; let minx = EW, maxx = 0, miny = EH, maxy = 0, n = 0; st.push(p); lab[p] = id;
    while (st.length) {
      const q = st.pop(); const x = q % EW, y = (q - x) / EW; n += 1;
      if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= EW || yy >= EH) continue; const r = yy * EW + xx; if (!lab[r] && d[r * 4 + 3] > 64) { lab[r] = id; st.push(r); } }
    }
    comps.push({ id, minx, maxx, miny, maxy, n });
  }
  const stones = [];
  for (const c of comps.filter((c) => c.n >= 400).sort((a, b) => a.minx - b.minx)) {
    const bw = c.maxx - c.minx + 3, bh = c.maxy - c.miny + 3, buf = Buffer.alloc(bw * bh * 4);
    for (let y = 0; y < bh; y += 1) for (let x = 0; x < bw; x += 1) { const sx = c.minx - 1 + x, sy = c.miny - 1 + y; if (sx < 0 || sy < 0 || sx >= EW || sy >= EH) continue; const p = sy * EW + sx; if (lab[p] === c.id) buf.set(d.subarray(p * 4, p * 4 + 4), (y * bw + x) * 4); }
    stones.push({ data: buf, info: { width: bw, height: bh }, anchor: bh - 2 });
  }
  return stones;
}
const menhirEl = await loadStanding(MENHIR), trilithonEl = await loadStanding(TRILITHON), hengeEl = await loadStanding(HENGE);
const menhirs = menhirEl ? splitStones(menhirEl) : [];
if (menhirEl) console.log(`  standing: ${menhirs.length} menhirs${trilithonEl ? ", a trilithon " + trilithonEl.info.width + "x" + trilithonEl.info.height : ""}${hengeEl ? ", a henge " + hengeEl.info.width + "x" + hengeEl.info.height : ""}`);
fs.mkdirSync(OUT, { recursive: true });
// every Tanium cell gets a pass: the trunk's row, and any cell a hub or a spoke
// falls in (the per-cell drawing clips itself; an empty overlay is not written)
const grid = JSON.parse(fs.readFileSync(`${ART}/l2-land/tanium/territory.def.json`, "utf8")).grid;
const cellsToDo = [];
for (let r = 0; r < grid.rows; r += 1) for (let c = 0; c < grid.cols; c += 1) cellsToDo.push([c, r]);
const previews = [];
for (const [col, row] of cellsToDo) {
  const id = `c${col}-${row}`;
  // the land that masks the chain: the working folder's candidate when it is
  // newer than the authored layer (the preview the owner sees), else the
  // authored layer; a cell with neither is skipped
  const authored = `${ART}/l2-land/tanium/${id}/${id}-l2.png`, candidate = `.codex-tmp/authoring/cells/tanium/${id}/${id}-l2.png`;
  const newer = (a, b) => fs.existsSync(a) && (!fs.existsSync(b) || fs.statSync(a).mtimeMs > fs.statSync(b).mtimeMs);
  const landFile = newer(candidate, authored) ? candidate : fs.existsSync(authored) ? authored : null;
  if (!landFile) { console.log(`  ${id}: no land layer yet — skipped`); continue; }
  const land = await sharp(landFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const LW = land.info.width, lb = Math.round((LW - CELL) / 2);
  const out = Buffer.alloc(CELL * CELL * 4);
  // BEDDING (owner 2026-09-06: "that looks stickered on"): the element is cut
  // INTO this ground, not laid on it — per column the land's own colour just
  // outside the slot is sampled, the element's pixels take that colour's hue
  // and saturation while keeping their own light and dark (the floor stays
  // dark, the far wall pale), the outer rows of the element are feathered so
  // the ground's texture runs to the lip, a soft occlusion darkens the ground
  // beside the cut, and the line jitters a pixel or two so the repeat is lost.
  const FEATHER = 5, AO = 10, AO_STRENGTH = 0.45;
  const lumaOf = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const landPx = (x, y) => { const lo = ((lb + y) * LW + lb + x) * 4; return [land.data[lo], land.data[lo + 1], land.data[lo + 2], land.data[lo + 3]]; };
  let seed = (col * 7919 + row * 104729 + 17) >>> 0;
  const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
  const jitterRaw = Array.from({ length: CELL }, () => rnd() - 0.5), jitter = new Array(CELL).fill(0);
  for (let x = 0; x < CELL; x += 1) { let s = 0, c = 0; for (let j = -24; j <= 24; j += 1) { const q = x + j; if (q >= 0 && q < CELL) { s += jitterRaw[q]; c += 1; } } jitter[x] = (s / c) * 12; }   // sd ~1.3 px
  // the kerb strip, per column: repeat index r = floor(worldX / KW); odd repeats flipped; per-cell phase
  const phase = (col * 977) % KW;
  for (let x = 0; x < CELL; x += 1) {
    const wx = col + x / CELL;                       // grid units
    const wy = yAt(wx); if (wy == null) continue;
    const cy = (wy - row) * CELL + jitter[x];        // the groove's centre in cell px
    const gx = col * CELL + x + phase, r = Math.floor(gx / KW);
    let kx = gx % KW; if (r % 2 === 1) kx = KW - 1 - kx;
    // the ground's colour beside the slot in this column (a window above and below the element)
    const yTop = Math.round(cy - KA), yBot = yTop + KH;
    let gr = 0, gg = 0, gb = 0, gn = 0;
    for (let y = yTop - 24; y < yBot + 24; y += 2) {
      if (y < 0 || y >= CELL || (y >= yTop && y < yBot)) continue;
      const p = landPx(x, y); if (p[3] < 128) continue;
      gr += p[0]; gg += p[1]; gb += p[2]; gn += 1;
    }
    const ground = gn ? [gr / gn, gg / gn, gb / gn] : null, groundL = ground ? Math.max(1, lumaOf(...ground)) : 1;
    for (let ky = 0; ky < KH; ky += 1) {
      const y = yTop + ky;
      if (y < 0 || y >= CELL) continue;
      const ko = (ky * KW + kx) * 4, a0 = kerb.data[ko + 3];
      if (a0 === 0) continue;
      const lp = landPx(x, y);
      if (lp[3] < 128) continue;                     // no chain over water or past the shore
      // feather the element's outer rows so the ground's texture runs to the lip
      const edge = Math.min(ky + 1, KH - ky), fade = edge <= FEATHER ? edge / (FEATHER + 1) : 1;
      const a = Math.round(a0 * fade);
      if (a === 0) continue;
      // the element's light and dark, leaning toward the ground's own hue: the
      // lips (the element's outer rows) are this ground and take it strongly,
      // the cut walls and the floor are rock and keep most of their own colour
      let er = kerb.data[ko], eg = kerb.data[ko + 1], eb = kerb.data[ko + 2];
      if (ground) {
        const el = lumaOf(er, eg, eb), k = el / groundL;
        const tr = Math.min(255, ground[0] * k), tg = Math.min(255, ground[1] * k), tb = Math.min(255, ground[2] * k);
        const depthIn = Math.min(ky, KH - 1 - ky) / (KH / 2);            // 0 at the lips, 1 at the centre
        const t = 0.7 - 0.55 * Math.min(1, depthIn * 2);                 // 0.7 at the lip → 0.15 by a quarter of the way in
        er = Math.round(er * (1 - t) + tr * t); eg = Math.round(eg * (1 - t) + tg * t); eb = Math.round(eb * (1 - t) + tb * t);
      }
      const o = (y * CELL + x) * 4;
      out[o] = er; out[o + 1] = eg; out[o + 2] = eb; out[o + 3] = a;
    }
    // the occlusion beside the cut: dark, fading over AO px above the top lip and below the bottom one
    for (let d = 1; d <= AO; d += 1) {
      const w = AO_STRENGTH * (1 - d / (AO + 1));
      for (const y of [yTop - d, yBot - 1 + d]) {
        if (y < 0 || y >= CELL) continue;
        const lp = landPx(x, y); if (lp[3] < 128) continue;
        const o = (y * CELL + x) * 4;
        if (out[o + 3] > 0) continue;               // never over the element itself
        out[o] = 12; out[o + 1] = 10; out[o + 2] = 8; out[o + 3] = Math.round(255 * w);
      }
    }
  }
  // BRANCHES (owner 2026-09-06: "branches from the chain to portray how
  // endpoints cluster to a leader and feed back to the chain"): each entry of
  // route.branches is a loop that leaves the chain at grid x = at, bulges
  // `depth` metres to one side (side -1 = north, +1 = south) and rejoins it
  // `length` metres along; the slot runs along the loop at 0.6 of its width,
  // bedded like the trunk; the cluster element (a leader and its endpoints)
  // sits at the loop's apex. Placed by data, never by the model.
  const M_PX = CELL / 97.6;                            // px per metre at L0
  const BR_SCALE = 0.6, bkw = Math.round(KW * BR_SCALE), bkh = Math.round(KH * BR_SCALE), bka = Math.round(KA * BR_SCALE);
  const cluster = fs.existsSync(CLUSTER) ? await sharp(CLUSTER).ensureAlpha().raw().toBuffer({ resolveWithObject: true }) : null;
  const bedPixel = (x, y, er, eg, eb, a0, ky, kh) => {     // the trunk's bedding, for a branch pixel
    if (x < 0 || y < 0 || x >= CELL || y >= CELL) return;
    const lp = landPx(x, y); if (lp[3] < 128) return;
    const edge = Math.min(ky + 1, kh - ky), fade = edge <= FEATHER ? edge / (FEATHER + 1) : 1;
    const a = Math.round(a0 * fade * cliffFade(x, y)); if (a === 0) return;   // a stroke passes under a cliff, not across it
    let gr = 0, gg = 0, gb = 0, gn = 0;
    for (let d = -20; d <= 20; d += 8) for (let e = -20; e <= 20; e += 8) { const p = landPx(x + d, y + e); if (p && p[3] >= 128 && (x + d) >= 0 && (y + e) >= 0 && (x + d) < CELL && (y + e) < CELL) { gr += p[0]; gg += p[1]; gb += p[2]; gn += 1; } }
    if (gn) {
      const ground = [gr / gn, gg / gn, gb / gn], groundL = Math.max(1, lumaOf(...ground));
      const el = lumaOf(er, eg, eb), k = el / groundL;
      const tr = Math.min(255, ground[0] * k), tg = Math.min(255, ground[1] * k), tb = Math.min(255, ground[2] * k);
      const depthIn = Math.min(ky, kh - 1 - ky) / (kh / 2), t = 0.7 - 0.55 * Math.min(1, depthIn * 2);
      er = Math.round(er * (1 - t) + tr * t); eg = Math.round(eg * (1 - t) + tg * t); eb = Math.round(eb * (1 - t) + tb * t);
    }
    const o = (y * CELL + x) * 4;
    if (out[o + 3] >= a && out[o + 3] > 0) return;      // the trunk and earlier strokes win
    out[o] = er; out[o + 1] = eg; out[o + 2] = eb; out[o + 3] = a;
  };
  for (const br of route.branches || []) {
    if (Math.floor(br.at) !== col) continue;
    const L = br.length * M_PX, D = br.depth * M_PX, side = br.side || -1;
    const x0 = (br.at - col) * CELL, y0r = (yAt(br.at) - row) * CELL;
    const x1 = x0 + L, y1r = (yAt(Math.min(col + 1 - 1e-6, br.at + br.length / 97.6)) - row) * CELL;
    // the loop: a half-ellipse in the frame of the chord from (x0,y0r) to (x1,y1r)
    const steps = Math.ceil(Math.PI * (L / 2 + D)), pts = [];
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps, ang = Math.PI * (1 - t);              // from the start (ang = PI) round to the end (0)
      const cx = (x0 + x1) / 2 + (L / 2) * Math.cos(ang), yy = (y0r + y1r) / 2 + (y1r - y0r) * (t - 0.5) + side * D * Math.sin(ang);
      pts.push([cx, yy]);
    }
    // the branch slot along the loop, its cross-section along the normal
    let s = 0;
    for (let i = 1; i < pts.length; i += 1) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], len = Math.hypot(bx - ax, by - ay);
      if (len === 0) continue;
      const tx = (bx - ax) / len, ty = (by - ay) / len, nx = -ty, ny = tx;
      for (let u = 0; u < len; u += 0.7) {
        const px = ax + tx * u, py = ay + ty * u, ss = Math.round((s + u) / BR_SCALE);
        const rep = Math.floor(ss / KW); let kx = ss % KW; if (rep % 2 === 1) kx = KW - 1 - kx;
        for (let ky = 0; ky < bkh; ky += 1) {
          const sky = Math.min(KH - 1, Math.round(ky / BR_SCALE));
          const ko = (sky * KW + kx) * 4, a0 = kerb.data[ko + 3]; if (a0 === 0) continue;
          const x = Math.round(px + nx * (ky - bka)), y = Math.round(py + ny * (ky - bka));
          bedPixel(x, y, kerb.data[ko], kerb.data[ko + 1], kerb.data[ko + 2], a0, ky, bkh);
        }
      }
      s += len;
    }
    // the cluster at the apex
    if (cluster) {
      const CW = cluster.info.width, CH = cluster.info.height;
      const apex = pts[Math.floor(pts.length / 2)];
      const ox = Math.round(apex[0]) - Math.round(CW / 2), oy = Math.round(apex[1]) - Math.round(CH / 2);
      for (let cy2 = 0; cy2 < CH; cy2 += 1) for (let cx2 = 0; cx2 < CW; cx2 += 1) {
        const x = ox + cx2, y = oy + cy2;
        if (x < 0 || y < 0 || x >= CELL || y >= CELL) continue;
        const co = (cy2 * CW + cx2) * 4, a = cluster.data[co + 3]; if (a === 0) continue;
        const lp = landPx(x, y); if (lp[3] < 128) continue;
        const o = (y * CELL + x) * 4, k = a / 255;
        for (let c = 0; c < 3; c += 1) out[o + c] = Math.round(cluster.data[co + c] * k + out[o + c] * (1 - k));
        out[o + 3] = Math.max(out[o + 3], a);
      }
    }
    console.log(`  ${id}: branch at ${br.at} (${side < 0 ? "north" : "south"}, ${br.length} m along, ${br.depth} m out)${cluster ? " with its cluster" : " — no cluster element yet"}`);
  }
  // HUBS AND SPOKES (owner 2026-09-06, Tanium's architecture diagram: the
  // chain is the ring of endpoints, leaders are points on it, the server sits
  // far off with long lines to the leaders; "the branches should be far off
  // the chain"): route.hubs = [{ at: [x, y] in grid units, leaders: [x...] }].
  // Each leader gets a disc on the trunk; a straight spoke slot runs from it
  // to the hub, crossing cells (drawn per cell, clipped), bedded like the
  // trunk; the hub disc sits at the hub. All by data.
  // the land's texture: its local mean luma and its local contrast (a cliff
  // face of columns is high contrast; meadow and heath are low), read on a
  // coarse grid and interpolated — used to fade a stroke out over a cliff
  // ("the groove passes under the wall") and to put the ground's grain on a
  // disc's face so it sits IN the ground (owner 2026-09-06 17:45: "even
  // though this chain is on its own layer it must blend into the land still")
  const TX = 16, TN = Math.ceil(CELL / TX);
  const texMean = new Float32Array(TN * TN), texStd = new Float32Array(TN * TN);
  for (let ty = 0; ty < TN; ty += 1) for (let tx = 0; tx < TN; tx += 1) {
    let s = 0, s2 = 0, n = 0;
    for (let y = ty * TX; y < Math.min(CELL, ty * TX + TX); y += 2) for (let x = tx * TX; x < Math.min(CELL, tx * TX + TX); x += 2) {
      const p = landPx(x, y); if (p[3] < 128) continue;
      const l = lumaOf(p[0], p[1], p[2]); s += l; s2 += l * l; n += 1;
    }
    texMean[ty * TN + tx] = n ? s / n : 0; texStd[ty * TN + tx] = n ? Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2)) : 0;
  }
  const texAt = (arr, x, y) => {                           // bilinear: a per-block value printed a 16-px checker on the hub's face (owner's crop, 2026-09-07)
    const fx = Math.min(TN - 1, Math.max(0, x / TX - 0.5)), fy = Math.min(TN - 1, Math.max(0, y / TX - 0.5));
    const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(TN - 1, x0 + 1), y1 = Math.min(TN - 1, y0 + 1), tx = fx - x0, ty = fy - y0;
    return arr[y0 * TN + x0] * (1 - tx) * (1 - ty) + arr[y0 * TN + x1] * tx * (1 - ty) + arr[y1 * TN + x0] * (1 - tx) * ty + arr[y1 * TN + x1] * tx * ty;
  };
  const CLIFF_LO = 34, CLIFF_HI = 52;                      // luma sd: below = ground, above = a cliff face
  const cliffFade = (x, y) => { const sd = texAt(texStd, x, y); return sd <= CLIFF_LO ? 1 : sd >= CLIFF_HI ? 0 : 1 - (sd - CLIFF_LO) / (CLIFF_HI - CLIFF_LO); };
  const grain = (x, y) => { const p = landPx(x, y), m = texAt(texMean, x, y); return m > 0 ? (lumaOf(p[0], p[1], p[2]) - m) / m : 0; };   // the land's high-frequency, about ±0.3
  const stamp = (el, cxCell, cyCell, rim = 12) => {   // rim: the band (px) over which the ground's hue takes the edge — narrower for small stones, or a panel is all rim       // a disc BEDDED into the land: its rim takes the ground's hue, its face the ground's grain, feathered, with an occlusion ring
    if (!el) return;
    const EW = el.info.width, EH = el.info.height, x0 = Math.round(cxCell) - Math.round(EW / 2), y0 = Math.round(cyCell) - Math.round(EH / 2);
    // distance to the element's edge (up to 16 px) by erosion passes
    const alpha = new Uint8Array(EW * EH); for (let p = 0; p < EW * EH; p += 1) alpha[p] = el.data[p * 4 + 3] > 64 ? 1 : 0;
    const dist = new Uint8Array(EW * EH); let cur = alpha;
    for (let k = 1; k <= 16; k += 1) {
      const nxt = new Uint8Array(EW * EH);
      for (let y = 1; y < EH - 1; y += 1) for (let x = 1; x < EW - 1; x += 1) { const p = y * EW + x; if (cur[p] && cur[p - 1] && cur[p + 1] && cur[p - EW] && cur[p + EW]) { nxt[p] = 1; dist[p] = k; } }
      cur = nxt;
    }
    // the ground's colour around the disc
    let gr = 0, gg = 0, gb = 0, gn = 0;
    for (let ey = -12; ey < EH + 12; ey += 6) for (let ex = -12; ex < EW + 12; ex += 6) {
      const x = x0 + ex, y = y0 + ey; if (x < 0 || y < 0 || x >= CELL || y >= CELL) continue;
      const inside = ex >= 0 && ey >= 0 && ex < EW && ey < EH && alpha[ey * EW + ex];
      if (inside) continue;
      const p = landPx(x, y); if (p[3] < 128) continue; gr += p[0]; gg += p[1]; gb += p[2]; gn += 1;
    }
    const ground = gn ? [gr / gn, gg / gn, gb / gn] : null, groundL = ground ? Math.max(1, lumaOf(...ground)) : 1;
    for (let ey = 0; ey < EH; ey += 1) for (let ex = 0; ex < EW; ex += 1) {
      const x = x0 + ex, y = y0 + ey;
      if (x < 0 || y < 0 || x >= CELL || y >= CELL) continue;
      const eo = (ey * EW + ex) * 4, a0 = el.data[eo + 3]; if (a0 === 0) continue;
      const lp = landPx(x, y); if (lp[3] < 128) continue;
      const dd = dist[ey * EW + ex];
      const fade = dd <= 3 ? (dd + 1) / 4 : 1;                       // a feathered rim
      const a = Math.round(a0 * fade * Math.max(0.35, cliffFade(x, y)));
      if (a === 0) continue;
      let er = el.data[eo], eg = el.data[eo + 1], eb = el.data[eo + 2];
      if (ground) {
        const t = dd <= rim ? 0.55 - 0.4 * (dd / rim) : 0.15;              // the rim takes the ground's hue, the face a little
        const el2 = lumaOf(er, eg, eb), k = el2 / groundL;
        er = Math.round(er * (1 - t) + Math.min(255, ground[0] * k) * t); eg = Math.round(eg * (1 - t) + Math.min(255, ground[1] * k) * t); eb = Math.round(eb * (1 - t) + Math.min(255, ground[2] * k) * t);
      }
      const gn2 = 1 + 0.35 * grain(x, y);                             // the ground's grain on the face
      er = Math.max(0, Math.min(255, Math.round(er * gn2))); eg = Math.max(0, Math.min(255, Math.round(eg * gn2))); eb = Math.max(0, Math.min(255, Math.round(eb * gn2)));
      const o = (y * CELL + x) * 4, k = a / 255;
      for (let c = 0; c < 3; c += 1) out[o + c] = Math.round([er, eg, eb][c] * k + out[o + c] * (1 - k));
      out[o + 3] = Math.max(out[o + 3], a);
    }
    // the occlusion ring outside the disc
    for (let ey = -AO; ey < EH + AO; ey += 1) for (let ex = -AO; ex < EW + AO; ex += 1) {
      const x = x0 + ex, y = y0 + ey; if (x < 0 || y < 0 || x >= CELL || y >= CELL) continue;
      if (ex >= 0 && ey >= 0 && ex < EW && ey < EH && alpha[ey * EW + ex]) continue;
      let dmin = AO + 1;
      for (let j = -AO; j <= AO; j += 2) for (let i = -AO; i <= AO; i += 2) { const qx = ex + i, qy = ey + j; if (qx < 0 || qy < 0 || qx >= EW || qy >= EH || !alpha[qy * EW + qx]) continue; const dq = Math.hypot(i, j); if (dq < dmin) dmin = dq; }
      if (dmin > AO) continue;
      const lp = landPx(x, y); if (lp[3] < 128) continue;
      const o = (y * CELL + x) * 4; if (out[o + 3] > 0) continue;
      const w = AO_STRENGTH * (1 - dmin / (AO + 1));
      out[o] = 12; out[o + 1] = 10; out[o + 2] = 8; out[o + 3] = Math.round(255 * w);
    }
  };
  const strokeSlot = (ax, ay, bx, by, scale) => {   // the slot from (ax,ay) to (bx,by), cell-local px, bedded; clipped to the cell
    const len = Math.hypot(bx - ax, by - ay); if (len === 0) return;
    const tx = (bx - ax) / len, ty = (by - ay) / len, nx = -ty, ny = tx;
    const skw = Math.round(KW * scale), skh = Math.round(KH * scale), ska = Math.round(KA * scale);
    for (let u = 0; u < len; u += 0.7) {
      const px = ax + tx * u, py = ay + ty * u;
      if (px < -skh || py < -skh || px > CELL + skh || py > CELL + skh) continue;
      const ss = Math.round(u / scale), rep = Math.floor(ss / KW); let kx = ss % KW; if (rep % 2 === 1) kx = KW - 1 - kx;
      for (let ky = 0; ky < skh; ky += 1) {
        const sky = Math.min(KH - 1, Math.round(ky / scale));
        const ko = (sky * KW + kx) * 4, a0 = kerb.data[ko + 3]; if (a0 === 0) continue;
        const x = Math.round(px + nx * (ky - ska)), y = Math.round(py + ny * (ky - ska));
        bedPixel(x, y, kerb.data[ko], kerb.data[ko + 1], kerb.data[ko + 2], a0, ky, skh);
      }
    }
  };
  const stampStanding = (el, cxCell, yCell, centred = false) => {
    // a standing stone (or a set) ROOTED in the land: placed on its feet (the
    // anchor row at yCell; by its centre when asked), its turf skirt re-hued
    // to the local ground, the rows just above each column's foot sunk into
    // the ground colour, the land's grain faintly on the stone, faded under
    // cliffs, and a contact shadow on the ground under every foot
    if (!el) return;
    const EW = el.info.width, EH = el.info.height;
    const x0 = Math.round(cxCell) - Math.round(EW / 2), y0 = Math.round(yCell) - (centred ? Math.round(EH / 2) : el.anchor);
    const solid = (ex, ey) => ex >= 0 && ey >= 0 && ex < EW && ey < EH && el.data[(ey * EW + ex) * 4 + 3] > 64;
    const feet = new Int16Array(EW).fill(-1);
    for (let ex = 0; ex < EW; ex += 1) for (let ey = EH - 1; ey >= 0; ey -= 1) if (solid(ex, ey)) { feet[ex] = ey; break; }
    let gr = 0, gg = 0, gb = 0, gn = 0;
    for (let ey = -12; ey < EH + 12; ey += 6) for (let ex = -12; ex < EW + 12; ex += 6) {
      const x = x0 + ex, y = y0 + ey; if (x < 0 || y < 0 || x >= CELL || y >= CELL || solid(ex, ey)) continue;
      const p = landPx(x, y); if (p[3] < 128) continue; gr += p[0]; gg += p[1]; gb += p[2]; gn += 1;
    }
    const ground = gn ? [gr / gn, gg / gn, gb / gn] : null, groundL = ground ? Math.max(1, lumaOf(...ground)) : 1;
    for (let ey = 0; ey < EH; ey += 1) for (let ex = 0; ex < EW; ex += 1) {
      const x = x0 + ex, y = y0 + ey; if (x < 0 || y < 0 || x >= CELL || y >= CELL) continue;
      const eo = (ey * EW + ex) * 4, a0 = el.data[eo + 3]; if (a0 === 0) continue;
      const lp = landPx(x, y); if (lp[3] < 128) continue;
      const edge = !(solid(ex - 1, ey) && solid(ex + 1, ey) && solid(ex, ey - 1) && solid(ex, ey + 1));
      const a = Math.round(a0 * (edge ? 0.7 : 1) * Math.max(0.35, cliffFade(x, y))); if (a === 0) continue;
      let er = el.data[eo], eg = el.data[eo + 1], eb = el.data[eo + 2];
      if (ground) {
        const mx = Math.max(er, eg, eb), mn = Math.min(er, eg, eb), sat = mx ? (mx - mn) / mx : 0;
        const turf = eg >= er && eg >= eb && sat > 0.18;                 // the skirt the model drew takes the local ground
        const foot = feet[ex] >= 0 ? feet[ex] - ey : 99;                 // rows above this column's foot
        const t = turf ? 0.65 : foot < 8 ? 0.55 * (1 - foot / 8) : 0.06;
        const k = lumaOf(er, eg, eb) / groundL;
        er = Math.round(er * (1 - t) + Math.min(255, ground[0] * k) * t); eg = Math.round(eg * (1 - t) + Math.min(255, ground[1] * k) * t); eb = Math.round(eb * (1 - t) + Math.min(255, ground[2] * k) * t);
      }
      const gn2 = 1 + 0.2 * grain(x, y);
      er = Math.max(0, Math.min(255, Math.round(er * gn2))); eg = Math.max(0, Math.min(255, Math.round(eg * gn2))); eb = Math.max(0, Math.min(255, Math.round(eb * gn2)));
      const o = (y * CELL + x) * 4, kk = a / 255;
      for (let c = 0; c < 3; c += 1) out[o + c] = Math.round([er, eg, eb][c] * kk + out[o + c] * (1 - kk));
      out[o + 3] = Math.max(out[o + 3], a);
    }
    for (let ex = -6; ex < EW + 6; ex += 1) {                            // the contact shadow under the nearest foot
      let fy = -1, fd = 7;
      for (let i = -6; i <= 6; i += 1) { const c2 = ex + i; if (c2 < 0 || c2 >= EW || feet[c2] < 0) continue; if (Math.abs(i) < fd) { fd = Math.abs(i); fy = feet[c2]; } }
      if (fy < 0) continue;
      for (let dy = -3; dy <= 8; dy += 1) {
        const ey = fy + dy, x = x0 + ex, y = y0 + ey; if (x < 0 || y < 0 || x >= CELL || y >= CELL || solid(ex, ey)) continue;
        const lp = landPx(x, y); if (lp[3] < 128) continue;
        const w = 0.5 * (1 - fd / 7) * (dy < 0 ? 1 + dy / 4 : 1 - dy / 9); if (w <= 0) continue;
        const o = (y * CELL + x) * 4;
        if (out[o + 3] > 0) { for (let c = 0; c < 3; c += 1) out[o + c] = Math.round(out[o + c] * (1 - w * 0.6)); continue; }
        out[o] = 12; out[o + 1] = 10; out[o + 2] = 8; out[o + 3] = Math.round(255 * w);
      }
    }
  };
  const placeMenhirs = (cx, cy) => {
    // the endpoints on an ellipse round the leader (the world's view: 0.73
    // tall), the trunk left clear: four to the north, three to the south a
    // little further out, drawn north to south so the nearer stand in front
    const deg = (d) => (d * Math.PI) / 180;
    const spots = [[195, 180], [215, 180], [325, 180], [345, 180], [45, 150], [90, 150], [135, 150]];   // the north pair each side stands clear of the trilithon (147 px wide) that marks the leader
    const places = spots.map(([a, R], i) => ({ st: menhirs[i % menhirs.length], x: cx + R * Math.cos(deg(a)), y: cy + R * 0.73 * Math.sin(deg(a)) })).sort((p, q) => p.y - q.y);
    for (const p of places) stampStanding(p.st, p.x, p.y);
  };
  const hubEl = hubPrepped, leaderEl = leaderPrepped;      // fitted to the view once, at load
  const toLocal = (gx, gy) => [(gx - col) * CELL, (gy - row) * CELL];
  for (const hub of route.hubs || []) {
    const [hx, hy] = toLocal(hub.at[0], hub.at[1]);
    const hubR = hengeEl ? hengeEl.info.width / 2 : hubEl ? hubEl.info.width / 2 : 0;
    for (const lx of hub.leaders || []) {
      const ly = yAt(lx); if (ly == null) continue;
      const [ax, ay] = toLocal(lx, ly);
      // the spoke: from the trunk (a little past the leader disc) to the hub's rim
      const dx = hx - ax, dy = hy - ay, len = Math.hypot(dx, dy); if (len === 0) continue;
      const ux = dx / len, uy = dy / len;
      const leaderR = trilithonEl ? trilithonEl.info.width / 2 : leaderEl ? leaderEl.info.width / 2 : 0;
      // the spoke leaves the trunk square (toward the hub's side, 0.4 of a
      // cell), then runs straight to the hub's rim: a branch off the chain, not
      // a second chain beside it (a far leader's straight line ran nearly
      // parallel to the trunk for a cell, 2026-09-07)
      const side = hy < ay ? -1 : 1, kx = ax, ky = ay + side * 0.4 * CELL;
      const dx2 = hx - kx, dy2 = hy - ky, len2 = Math.hypot(dx2, dy2) || 1, ux2 = dx2 / len2, uy2 = dy2 / len2;
      const sx = ax, sy = ay + side * leaderR * 0.6, ex = hx - ux2 * (hubR * 0.85), ey = hy - uy2 * (hubR * 0.85);
      const inThisCell = (x, y) => x >= -CELL && y >= -CELL && x <= 2 * CELL && y <= 2 * CELL;
      const seg = (x1, y1, x2, y2) => { if (inThisCell(x1, y1) || inThisCell(x2, y2) || inThisCell((x1 + x2) / 2, (y1 + y2) / 2)) strokeSlot(x1, y1, x2, y2, SPOKE_SCALE); };
      seg(sx, sy, kx, ky); seg(kx, ky, ex, ey);
      if (Math.floor(lx) === col && Math.floor(ly) === row && !trilithonEl) stamp(leaderEl, ax, ay, 8);   // with the trilithon element the leaders are the nodes, stamped there
    }
    if (Math.floor(hub.at[0]) === col && Math.floor(hub.at[1]) === row) { if (hengeEl) stampStanding(hengeEl, hx, hy, true); else stamp(hubEl, hx, hy); }
    if ((hub.leaders || []).some((lx) => Math.floor(lx) === col) || (Math.floor(hub.at[0]) === col && Math.floor(hub.at[1]) === row)) console.log(`  ${id}: hub at [${hub.at}] with ${hub.leaders.length} leader(s) — spokes drawn where they cross this cell`);
  }
  // the nodes: the panel element centred on the node, over the kerb, masked by land
  for (const n of route.nodes || []) {
    if ((!node && !menhirs.length) || n.cell[0] !== col || n.cell[1] !== row) continue;
    if (trilithonEl) stampStanding(trilithonEl, (n.at[0] - col) * CELL, (n.at[1] - row) * CELL - 26);   // the leader among its endpoints, just north of the groove, which runs in front of its feet
    if (menhirs.length) placeMenhirs((n.at[0] - col) * CELL, (n.at[1] - row) * CELL);
    else stamp(node, (n.at[0] - col) * CELL, (n.at[1] - row) * CELL, 5);   // bedded like the discs: the rim takes the ground's hue, the face its grain, an occlusion ring
  }
  const file = path.join(OUT, `tanium-${id}-chain.png`);
  let n = 0; for (let i = 3; i < out.length; i += 4) if (out[i] > 0) n += 1;
  if (n === 0) { if (fs.existsSync(file)) fs.unlinkSync(file); continue; }
  await sharp(out, { raw: { width: CELL, height: CELL, channels: 4 } }).png().toFile(file);
  const onTrunk = Math.floor(yAt(col + 0.5) ?? -1) === row;
  console.log(`  ${id}: ${n} px of chain${onTrunk ? `, ${Math.round((yAt(col) - row) * 100)}% down the west edge to ${Math.round((yAt(col + 1) - row) * 100)}% down the east` : " (off the trunk)"}${(route.nodes || []).some((q) => q.cell[0] === col && q.cell[1] === row) ? ", a node" : ""} → ${file}`);
  if (PREVIEW) {
    const landPng = await sharp(landFile).extract({ left: lb, top: lb, width: CELL, height: CELL }).flatten({ background: { r: 31, g: 96, b: 108 } }).png().toBuffer();
    const full = await sharp(landPng).composite([{ input: file, left: 0, top: 0 }]).png().toBuffer();   // composite at full size, then resize
    previews.push(await sharp(full).resize(700, 700).png().toBuffer());
  }
}
if (PREVIEW && previews.length) {
  await sharp({ create: { width: previews.length * 710, height: 700, channels: 3, background: "#000" } })
    .composite(previews.map((p, i) => ({ input: p, left: i * 710, top: 0 }))).jpeg({ quality: 84 }).toFile(PREVIEW);
  console.log(`  preview ${PREVIEW}`);
}
