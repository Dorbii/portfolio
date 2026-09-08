// THE CUT-OUT ROUTE, one cell at a time (owner 2026-09-07 22:40: "why cant we
// just use the foliage mask and cut that from the art and then replace the
// gaps with the assets?"; his verdict on the warp and on the light pass,
// 23:45: "yeah that looks super wrong"). The trees become sprites OF
// THEMSELVES: each single crown is cut from the SERVED site tile by the mask
// (the served pixels, so the sprite at rest is the tile), the hole under it is
// filled from the surrounding ground, and both crops go into one atlas the
// runtime draws in place — the patch first and still, the sprite over it bent
// about its foot (treeSpritesWebGl.ts). Dense stands (one merged blob to the
// classifier, 73% of the world's crown pixels) stay in the paint and still.
//
// Per cell this writes
//   art-source/career-world/l2-land/<t>/<id>/<id>-trees.png                  (the atlas, the record)
//   public/career-world/layers/terrain/authority/tiles/l2-<t>/<id>-trees.webp (lossless)
//   public/career-world/layers/terrain/authority/tiles/l2-<t>/<id>-trees.json (box, foot, height, phase, atlas rects)
// and adds the cell to
//   public/career-world/layers/terrain/authority/manifests/terrain-tree-sprites-r1.json
// so the runtime never fetches for a cell that has no sprite set.
//
//   node docs/career-world/session3-tools/tree-sprites.mjs --only tanium:c3-1 [--sheet out.jpg]
//   node docs/career-world/session3-tools/tree-sprites.mjs --count            (singles per cell, writes nothing)
import fs from "node:fs";
import sharp from "sharp";
import { crownMask, crownComponents } from "./crown-mask.mjs";
sharp.cache(false);
const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const has = (f) => process.argv.includes(f);
const ONLY = (arg("--only", "") || "").split(",").filter(Boolean), SHEET = arg("--sheet"), COUNT = has("--count");
const ART = "art-source/career-world/l2-land", A = "public/career-world/layers/terrain/authority";
const WORLD_MANIFEST = `${A}/manifests/terrain-tree-sprites-r1.json`;
const W = 2048;                 // the served site tile
const MIN_CROWN = 150;          // px: smaller blobs are texture, not trees (sway-field.mjs)
const SINGLE_TREE_MAX = 150;    // px: a blob taller or wider than this is a merged stand
const PAD = 6;                  // px round each crop: the rim, the feather and a little room for the bend
const RIM = 3;                  // px: the crown's anti-aliased fringe goes with the sprite, and the patch covers it
const CLEAR = RIM + 1;          // px from any crown a ground pixel must be before the fill may read it
const ATLAS_W = 2048;
// pull-push fill: the unknown pixels take a pyramid average of the known ones
// round them, then a few relaxations smooth the blocks away
function pullPush(rgb, known, w, h) {
  const levels = [{ c: rgb, wt: Float32Array.from(known), w, h }];
  while (levels[levels.length - 1].w > 1 || levels[levels.length - 1].h > 1) {
    const L = levels[levels.length - 1], nw = Math.max(1, Math.ceil(L.w / 2)), nh = Math.max(1, Math.ceil(L.h / 2));
    const c = new Float32Array(nw * nh * 3), wt = new Float32Array(nw * nh);
    for (let y = 0; y < nh; y += 1) for (let x = 0; x < nw; x += 1) {
      let sw = 0; const s = [0, 0, 0];
      for (let j = 0; j < 2; j += 1) for (let i = 0; i < 2; i += 1) {
        const xx = x * 2 + i, yy = y * 2 + j; if (xx >= L.w || yy >= L.h) continue;
        const p = yy * L.w + xx, k = L.wt[p]; if (k <= 0) continue;
        sw += k; s[0] += L.c[p * 3] * k; s[1] += L.c[p * 3 + 1] * k; s[2] += L.c[p * 3 + 2] * k;
      }
      const q = y * nw + x;
      if (sw > 0) { c[q * 3] = s[0] / sw; c[q * 3 + 1] = s[1] / sw; c[q * 3 + 2] = s[2] / sw; wt[q] = Math.min(1, sw); }
    }
    levels.push({ c, wt, w: nw, h: nh });
  }
  for (let li = levels.length - 2; li >= 0; li -= 1) {
    const F = levels[li], C = levels[li + 1];
    for (let y = 0; y < F.h; y += 1) for (let x = 0; x < F.w; x += 1) {
      const p = y * F.w + x, k = F.wt[p]; if (k >= 1) continue;
      // bilinear from the coarse level
      const cx = Math.min(C.w - 1, Math.max(0, (x + 0.5) / 2 - 0.5)), cy = Math.min(C.h - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
      const x0 = Math.floor(cx), y0 = Math.floor(cy), x1 = Math.min(C.w - 1, x0 + 1), y1 = Math.min(C.h - 1, y0 + 1), tx = cx - x0, ty = cy - y0;
      const s = [0, 0, 0]; let sw = 0;
      for (const [xx, yy, wgt] of [[x0, y0, (1 - tx) * (1 - ty)], [x1, y0, tx * (1 - ty)], [x0, y1, (1 - tx) * ty], [x1, y1, tx * ty]]) {
        const q = yy * C.w + xx, cw = C.wt[q] * wgt; if (cw <= 0) continue;
        sw += cw; s[0] += C.c[q * 3] * cw; s[1] += C.c[q * 3 + 1] * cw; s[2] += C.c[q * 3 + 2] * cw;
      }
      if (sw <= 0) continue;
      const up = [s[0] / sw, s[1] / sw, s[2] / sw];
      for (let ch = 0; ch < 3; ch += 1) F.c[p * 3 + ch] = F.c[p * 3 + ch] * k + up[ch] * (1 - k);
      F.wt[p] = 1;
    }
  }
  // relax the filled pixels against their neighbours
  for (let it = 0; it < 24; it += 1) {
    const src = Float32Array.from(rgb);
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
      const p = y * w + x; if (known[p]) continue;
      const s = [0, 0, 0]; let n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const q = yy * w + xx; s[0] += src[q * 3]; s[1] += src[q * 3 + 1]; s[2] += src[q * 3 + 2]; n += 1; }
      if (n) for (let ch = 0; ch < 3; ch += 1) rgb[p * 3 + ch] = s[ch] / n;
    }
  }
}

// nearest known pixel for every hole pixel (multi-source BFS, 4-connected)
function nearestKnown(known, w, h) {
  const near = new Int32Array(w * h).fill(-1), dist = new Int32Array(w * h).fill(-1), q = [];
  for (let p = 0; p < w * h; p += 1) if (known[p]) { near[p] = p; dist[p] = 0; q.push(p); }
  for (let qi = 0; qi < q.length; qi += 1) {
    const p = q[qi], x = p % w, y = (p - x) / w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const r = yy * w + xx; if (near[r] >= 0) continue;
      near[r] = near[p]; dist[r] = dist[p] + 1; q.push(r);
    }
  }
  return { near, dist };
}

// the ground under one tree: a pull-push base from the clean ground round the
// hole (CLEAR px from any crown, so the fringe of this tree or its neighbours
// never feeds it), with the grain of a coherent band of ground taken from
// below the foot, or above, or beside — never mirrored across the edge, which
// rebuilt a ghost of the tree out of its own fringe (first probe, 2026-09-08)
function fillHole(d, unclean, box, hole) {
  const { l, t, w, h } = box;
  const rgb = new Float32Array(w * h * 3), known = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const p = y * w + x, gx = l + x, gy = t + y, o = (gy * W + gx) * 4;
    rgb[p * 3] = d[o]; rgb[p * 3 + 1] = d[o + 1]; rgb[p * 3 + 2] = d[o + 2];
    known[p] = hole[p] || unclean[gy * W + gx] || d[o + 3] < 255 ? 0 : 1;
  }
  pullPush(rgb, known, w, h);
  // the grain: a pixel less its 9x9 mean over clean ground, read from the tile
  const grainAt = (gx, gy) => {
    if (gx < 4 || gy < 4 || gx >= W - 4 || gy >= W - 4) return null;
    const o0 = (gy * W + gx) * 4;
    if (unclean[gy * W + gx] || d[o0 + 3] < 255) return null;
    const s = [0, 0, 0]; let n = 0;
    for (let j = -4; j <= 4; j += 1) for (let i = -4; i <= 4; i += 1) {
      const q = (gy + j) * W + gx + i; if (unclean[q] || d[q * 4 + 3] < 255) continue;
      s[0] += d[q * 4]; s[1] += d[q * 4 + 1]; s[2] += d[q * 4 + 2]; n += 1;
    }
    if (n < 30) return null;
    return [d[o0] - s[0] / n, d[o0 + 1] - s[1] / n, d[o0 + 2] - s[2] / n];
  };
  const shifts = [[0, h + 2], [0, -(h + 2)], [-(w + 2), 0], [w + 2, 0], [-(w + 2), h + 2], [w + 2, h + 2]];
  let grained = 0, holes = 0;
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const p = y * w + x; if (!hole[p]) continue;
    holes += 1;
    for (const [sx, sy] of shifts) {
      const g = grainAt(l + x + sx, t + y + sy);
      if (!g) continue;
      for (let ch = 0; ch < 3; ch += 1) rgb[p * 3 + ch] = Math.max(0, Math.min(255, rgb[p * 3 + ch] + g[ch] * 0.85));
      grained += 1;
      break;
    }
  }
  return { rgb, grained: holes ? grained / holes : 0 };
}

function dilateLocal(mask, w, h, r) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    if (!mask[y * w + x]) continue;
    for (let j = -r; j <= r; j += 1) for (let i = -r; i <= r; i += 1) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < w && yy < h) out[yy * w + xx] = 1; }
  }
  return out;
}

// shelf packing of same-height pairs (sprite, patch) sorted by height
function pack(items) {
  const order = items.map((it, i) => i).sort((a, b) => items[b].h - items[a].h);
  let x = 0, y = 0, shelf = 0, atlasH = 0;
  const place = new Array(items.length);
  for (const i of order) {
    const it = items[i];
    const need = it.w * 2;
    if (x + need > ATLAS_W) { x = 0; y += shelf; shelf = 0; }
    place[i] = { sprite: [x, y], patch: [x + it.w, y] };
    x += need; shelf = Math.max(shelf, it.h); atlasH = Math.max(atlasH, y + it.h);
  }
  return { place, atlasH };
}

const worldManifest = fs.existsSync(WORLD_MANIFEST)
  ? JSON.parse(fs.readFileSync(WORLD_MANIFEST, "utf8"))
  : { format: "career-world/tree-sprites@r1", note: "cells with a cut-out sprite set: the runtime fetches <id>-trees.json and <id>-trees.webp for these only (tree-sprites.mjs)", cells: {} };
const sheets = [];
let done = 0, worldSingles = 0, worldSinglePx = 0, worldCrownPx = 0;
for (const t of ["ninjaone", "tanium", "coast"]) {
  const ledger = JSON.parse(fs.readFileSync(`${A}/manifests/terrain-l2-${t}-r1.json`, "utf8"));
  for (const id of Object.keys(ledger.cells).sort()) {
    if (ONLY.length && !ONLY.includes(`${t}:${id}`)) continue;
    const site = `${A}/tiles/l2-${t}/${id}-site.webp`;
    if (!fs.existsSync(site)) continue;
    const img = await sharp(site).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (img.info.width !== W || img.info.height !== W) { console.log(`  ${t[0].toUpperCase()} ${id}: site tile is ${img.info.width} px, skipped`); continue; }
    const d = img.data;
    const closed = crownMask(d, W);
    const { comps } = crownComponents(closed, W, MIN_CROWN);
    // ground within CLEAR px of any crown pixel (this tree's or a neighbour's) is fringe, not fill
    const unclean = (() => {
      const out = new Uint8Array(W * W);
      for (let y = 0; y < W; y += 1) for (let x = 0; x < W; x += 1) {
        if (closed[y * W + x] === 0) continue;
        for (let j = -CLEAR; j <= CLEAR; j += 1) for (let i = -CLEAR; i <= CLEAR; i += 1) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < W && yy < W) out[yy * W + xx] = 1; }
      }
      return out;
    })();
    const singles = [], stands = [];
    let crownPx = 0;
    for (const c of comps) {
      if (!c) continue;
      crownPx += c.n;
      const single = c.h <= SINGLE_TREE_MAX && c.w <= SINGLE_TREE_MAX
        && c.minx > PAD && c.miny > PAD && c.maxx < W - 1 - PAD && c.maxy < W - 1 - PAD;
      (single ? singles : stands).push(c);
    }
    const singlePx = singles.reduce((s, c) => s + c.n, 0);
    worldSingles += singles.length; worldSinglePx += singlePx; worldCrownPx += crownPx;
    console.log(`  ${t[0].toUpperCase()} ${id}: ${singles.length} single trees (${crownPx ? Math.round(100 * singlePx / crownPx) : 0}% of the crown pixels), ${stands.length} stands still`);
    if (COUNT) continue;

    // each single: its crops
    const trees = [];
    let grainedSum = 0;
    for (const c of singles) {
      const l = c.minx - PAD, tp = c.miny - PAD, w = c.w + 2 * PAD, h = c.h + 2 * PAD;
      const box = { l, t: tp, w, h };
      const mask = new Uint8Array(w * h);
      for (const q of c.members) { const x = q % W, y = (q - x) / W; mask[(y - tp) * w + (x - l)] = 1; }
      const rim = dilateLocal(mask, w, h, RIM), f1 = dilateLocal(rim, w, h, 1), f2 = dilateLocal(f1, w, h, 1);
      const { rgb: fill, grained } = fillHole(d, unclean, box, rim);
      grainedSum += grained;
      const sprite = Buffer.alloc(w * h * 4), patch = Buffer.alloc(w * h * 4);
      for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
        const p = y * w + x, o = ((tp + y) * W + l + x) * 4, so = p * 4;
        // the sprite: the served pixels, opaque over the crown and its rim, feathered two steps beyond
        sprite[so] = d[o]; sprite[so + 1] = d[o + 1]; sprite[so + 2] = d[o + 2];
        sprite[so + 3] = rim[p] ? 255 : f1[p] ? 170 : f2[p] ? 85 : 0;
        // the patch: the fill, opaque exactly where the sprite is opaque, so the sprite hides it at rest
        patch[so] = Math.round(fill[p * 3]); patch[so + 1] = Math.round(fill[p * 3 + 1]); patch[so + 2] = Math.round(fill[p * 3 + 2]);
        patch[so + 3] = rim[p] ? 255 : 0;
      }
      trees.push({
        box: [l, tp, w, h], foot: [c.footX, c.footY], height: c.h,
        phase: ((c.id * 2654435761) >>> 0) % 1000 / 1000, sprite, patch, w, h,
      });
    }
    trees.sort((a, b) => a.foot[1] - b.foot[1]);   // painter's order: the lower on screen draws last
    const { place, atlasH } = pack(trees);
    const atlas = Buffer.alloc(ATLAS_W * atlasH * 4);
    for (let i = 0; i < trees.length; i += 1) {
      const tr = trees[i], pl = place[i];
      for (const [src, [ax, ay]] of [[tr.sprite, pl.sprite], [tr.patch, pl.patch]]) {
        for (let y = 0; y < tr.h; y += 1) src.copy(atlas, ((ay + y) * ATLAS_W + ax) * 4, y * tr.w * 4, (y + 1) * tr.w * 4);
      }
    }
    const atlasPng = await sharp(atlas, { raw: { width: ATLAS_W, height: atlasH, channels: 4 } }).png().toBuffer();
    fs.writeFileSync(`${ART}/${t}/${id}/${id}-trees.png`, atlasPng);
    await sharp(atlasPng).webp({ lossless: true }).toFile(`${A}/tiles/l2-${t}/${id}-trees.webp`);
    const manifest = {
      format: "career-world/tree-sprites@r1",
      territory: t, cell: id, tilePx: W,
      atlas: { path: `/career-world/layers/terrain/authority/tiles/l2-${t}/${id}-trees.webp`, size: [ATLAS_W, atlasH] },
      trees: trees.map((tr, i) => ({ box: tr.box, foot: tr.foot, height: tr.height, phase: tr.phase, sprite: place[i].sprite, patch: place[i].patch })),
    };
    fs.writeFileSync(`${A}/tiles/l2-${t}/${id}-trees.json`, JSON.stringify(manifest));
    worldManifest.cells[`l2-${t}/${id}`] = { trees: trees.length, atlas: [ATLAS_W, atlasH] };
    done += 1;
    console.log(`    atlas ${ATLAS_W}x${atlasH}, ${(fs.statSync(`${A}/tiles/l2-${t}/${id}-trees.webp`).size / 1024).toFixed(0)} kB; ${trees.length ? Math.round(100 * grainedSum / trees.length) : 0}% of the hole pixels carry ground grain`)

    if (SHEET) {
      // A: the cell, singles boxed green (they move), stands boxed grey (they stay)
      const boxes = [];
      for (const c of singles) boxes.push(`<rect x="${c.minx / 2}" y="${c.miny / 2}" width="${c.w / 2}" height="${c.h / 2}" fill="none" stroke="#7CFC00" stroke-width="1.5"/>`);
      for (const c of stands) boxes.push(`<rect x="${c.minx / 2}" y="${c.miny / 2}" width="${c.w / 2}" height="${c.h / 2}" fill="none" stroke="#bbbbbb" stroke-width="1" stroke-dasharray="4 3"/>`);
      const labelA = `<rect x="8" y="8" width="700" height="36" rx="5" fill="rgba(0,0,0,0.65)"/><text x="16" y="34" fill="#fff" font-family="monospace" font-size="20">${t[0].toUpperCase()} ${id}: ${singles.length} single trees move (green), ${stands.length} stands stay (grey)</text>`;
      const svgA = Buffer.from(`<svg width="1024" height="1024">${boxes.join("")}${labelA}</svg>`);
      const panelA = await sharp(site).resize(1024, 1024).composite([{ input: svgA, left: 0, top: 0 }]).png().toBuffer();
      // B: the ground with the singles gone — every hole filled (what shows when a tree bends away)
      const patched = Buffer.from(d);
      for (const tr of trees) {
        for (let y = 0; y < tr.h; y += 1) for (let x = 0; x < tr.w; x += 1) {
          const so = (y * tr.w + x) * 4; if (tr.patch[so + 3] === 0) continue;
          const o = ((tr.box[1] + y) * W + tr.box[0] + x) * 4;
          patched[o] = tr.patch[so]; patched[o + 1] = tr.patch[so + 1]; patched[o + 2] = tr.patch[so + 2];
        }
      }
      const labelB = `<rect x="8" y="8" width="620" height="36" rx="5" fill="rgba(0,0,0,0.65)"/><text x="16" y="34" fill="#fff" font-family="monospace" font-size="20">the same ground with every single tree cut out and patched</text>`;
      const panelB = await sharp(patched, { raw: { width: W, height: W, channels: 4 } }).resize(1024, 1024).composite([{ input: Buffer.from(`<svg width="1024" height="1024">${labelB}</svg>`), left: 0, top: 0 }]).png().toBuffer();
      // C: eight trees at 1:1, 2x: original | patch alone | sprite at rest | bent half | bent full
      const picks = trees.filter((tr) => tr.height >= 40).sort((a, b) => b.height - a.height);
      const chosen = picks.filter((_, i) => i % Math.max(1, Math.floor(picks.length / 8)) === 0).slice(0, 8);
      const cellH = Math.max(...chosen.map((tr) => tr.h), 1), cellW = Math.max(...chosen.map((tr) => tr.w + 24), 1);
      const stripW = cellW * 5, stripH = cellH * chosen.length;
      const strip = Buffer.alloc(stripW * stripH * 4);
      const blit = (src, w, h, dx, dy, shear, background) => {
        // rows shift by shear * ((foot - y)/H)^1.6, the foot fixed
        for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
          const so = (y * w + x) * 4; const a = src[so + 3] / 255; if (a === 0 && !background) continue;
          const above = Math.max(0, (h - PAD) - y), H = Math.max(8, h - 2 * PAD);
          const shift = Math.round(shear * Math.pow(Math.min(1.2, above / H), 1.6));
          const tx = dx + x + shift, ty = dy + y; if (tx < 0 || ty < 0 || tx >= stripW || ty >= stripH) continue;
          const o = (ty * stripW + tx) * 4;
          strip[o] = Math.round(src[so] * a + strip[o] * (1 - a)); strip[o + 1] = Math.round(src[so + 1] * a + strip[o + 1] * (1 - a)); strip[o + 2] = Math.round(src[so + 2] * a + strip[o + 2] * (1 - a)); strip[o + 3] = 255;
        }
      };
      chosen.forEach((tr, row) => {
        const dy = row * cellH;
        // the original ground crop, wider by 12 px each side, as the background of every column
        const gw = tr.w + 24, gh = tr.h, gl = tr.box[0] - 12, gt = tr.box[1];
        const ground = Buffer.alloc(gw * gh * 4);
        for (let y = 0; y < gh; y += 1) for (let x = 0; x < gw; x += 1) { const o = ((gt + y) * W + gl + x) * 4, so = (y * gw + x) * 4; ground[so] = d[o]; ground[so + 1] = d[o + 1]; ground[so + 2] = d[o + 2]; ground[so + 3] = 255; }
        for (let col = 0; col < 5; col += 1) blit(ground, gw, gh, col * cellW, dy, 0, true);
        // column 1: the patch alone over the ground (the hole filled); 2-4: the sprite over the patch, at rest, half, full
        for (let col = 1; col < 5; col += 1) blit(tr.patch, tr.w, tr.h, col * cellW + 12, dy, 0, false);
        const amp = 0.12 * tr.height;
        blit(tr.sprite, tr.w, tr.h, 2 * cellW + 12, dy, 0, false);
        blit(tr.sprite, tr.w, tr.h, 3 * cellW + 12, dy, amp * 0.5, false);
        blit(tr.sprite, tr.w, tr.h, 4 * cellW + 12, dy, amp, false);
      });
      const heads = ["as served", "hole filled", "sprite at rest", "bent half", "bent full (12% of height)"];
      const headSvg = heads.map((s, i) => `<text x="${(i * cellW + 4) * 2}" y="22" fill="#fff" font-family="monospace" font-size="18">${s}</text>`).join("");
      const panelC = await sharp(strip, { raw: { width: stripW, height: stripH, channels: 4 } }).resize(stripW * 2, stripH * 2, { kernel: "nearest" })
        .composite([{ input: Buffer.from(`<svg width="${stripW * 2}" height="${stripH * 2}"><rect x="0" y="0" width="${stripW * 2}" height="30" fill="rgba(0,0,0,0.6)"/>${headSvg}</svg>`), left: 0, top: 0 }]).png().toBuffer();
      const cMeta = await sharp(panelC).metadata();
      const sheetW = 1024 * 2 + 16, sheetH = 1024 + 16 + cMeta.height;
      sheets.push(await sharp({ create: { width: Math.max(sheetW, cMeta.width), height: sheetH, channels: 3, background: "#000" } })
        .composite([{ input: panelA, left: 0, top: 0 }, { input: panelB, left: 1024 + 16, top: 0 }, { input: panelC, left: 0, top: 1024 + 16 }]).png().toBuffer());
    }
  }
}
if (COUNT) {
  console.log(`${worldSingles} single trees across the world, ${worldCrownPx ? Math.round(100 * worldSinglePx / worldCrownPx) : 0}% of the crown pixels`);
} else {
  if (done) {
    worldManifest.cells = Object.fromEntries(Object.entries(worldManifest.cells).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(WORLD_MANIFEST, `${JSON.stringify(worldManifest, null, 2)}\n`);
  }
  console.log(`${done} sprite sets written`);
}
if (SHEET && sheets.length) {
  const metas = await Promise.all(sheets.map((s) => sharp(s).metadata()));
  const width = Math.max(...metas.map((m) => m.width)), height = metas.reduce((s, m) => s + m.height + 16, 0);
  let top = 0; const comps = [];
  sheets.forEach((s, i) => { comps.push({ input: s, left: 0, top }); top += metas[i].height + 16; });
  await sharp({ create: { width, height, channels: 3, background: "#000" } }).composite(comps).jpeg({ quality: 88 }).toFile(SHEET);
  console.log(`  sheet ${SHEET}`);
}
