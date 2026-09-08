// THE CROWN CLASSIFIER, shared (one definition of "a conifer crown" for the
// sway field, the tree sprites and the chain layer's occlusion, so no two
// tools disagree about where the trees are): dark saturated green (hue
// 60-170, saturation over 0.28, luma under 95) with needle texture (a 9x9
// window's luma sd over 9), closed by 2 px; then the connected components of
// that mask, each with its box and its foot. First written in sway-field.mjs
// (2026-09-07), lifted here 2026-09-08.
//
//   import { crownMask, crownComponents } from "./crown-mask.mjs";
//   const closed = crownMask(rgba, W);                 // Uint8Array W*W, 1 in a crown
//   const { lab, comps } = crownComponents(closed, W); // comps: null for a blob under minCrown px
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const hueOf = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx === mn) return -1;
  let h = mx === r ? 60 * (((g - b) / (mx - mn)) % 6) : mx === g ? 60 * ((b - r) / (mx - mn) + 2) : 60 * ((r - g) / (mx - mn) + 4);
  if (h < 0) h += 360;
  return h;
};

export function dilate(src, W, r) {
  const out = new Uint8Array(W * W);
  for (let y = 0; y < W; y += 1) for (let x = 0; x < W; x += 1) {
    if (src[y * W + x] === 0) continue;
    for (let j = -r; j <= r; j += 1) for (let i = -r; i <= r; i += 1) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < W && yy < W) out[yy * W + xx] = 1; }
  }
  return out;
}

export function erode(src, W, r) {
  const out = new Uint8Array(W * W);
  for (let y = r; y < W - r; y += 1) for (let x = r; x < W - r; x += 1) {
    let ok = 1;
    for (let j = -r; j <= r && ok; j += 1) for (let i = -r; i <= r; i += 1) if (src[(y + j) * W + x + i] === 0) { ok = 0; break; }
    out[y * W + x] = ok;
  }
  return out;
}

/** The closed crown mask of a W x W RGBA buffer (alpha under 128 is not land). */
export function crownMask(d, W) {
  const cand = new Uint8Array(W * W);
  for (let y = 0; y < W; y += 1) for (let x = 0; x < W; x += 1) {
    const o = (y * W + x) * 4;
    if (d[o + 3] < 128) continue;
    const r = d[o], g = d[o + 1], b = d[o + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0;
    if (g > r && sat > 0.28 && luma(r, g, b) < 95) { const h = hueOf(r, g, b); if (h >= 60 && h <= 170) cand[y * W + x] = 1; }
  }
  const keep = new Uint8Array(W * W);
  for (let y = 4; y < W - 4; y += 1) for (let x = 4; x < W - 4; x += 1) {
    if (cand[y * W + x] === 0) continue;
    let s = 0, s2 = 0, n = 0;
    for (let j = -4; j <= 4; j += 2) for (let i = -4; i <= 4; i += 2) { const o = ((y + j) * W + x + i) * 4; const L = luma(d[o], d[o + 1], d[o + 2]); s += L; s2 += L * L; n += 1; }
    if (Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2)) > 9) keep[y * W + x] = 1;
  }
  return erode(dilate(keep, W, 2), W, 2);
}

/**
 * Connected components (4-neighbour) of a closed mask. Each component: id,
 * members (pixel indices), minx/maxx/miny/maxy, w, h, n, and foot = the mean x
 * of its lowest three rows, with footY = maxy + 1. Blobs under minCrown px
 * are labelled -1 and appear as null.
 */
export function crownComponents(closed, W, minCrown = 150) {
  const lab = new Int32Array(W * W), comps = [], st = [];
  for (let p = 0; p < W * W; p += 1) {
    if (closed[p] === 0 || lab[p] !== 0) continue;
    const cid = comps.length + 1; const members = []; st.push(p); lab[p] = cid;
    let minx = W, maxx = 0, miny = W, maxy = 0;
    while (st.length) {
      const q = st.pop(); members.push(q); const x = q % W, y = (q - x) / W;
      if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= W) continue; const r = yy * W + xx; if (closed[r] !== 0 && lab[r] === 0) { lab[r] = cid; st.push(r); } }
    }
    if (members.length < minCrown) { for (const q of members) lab[q] = -1; comps.push(null); continue; }
    let fx = 0, fn = 0;
    for (const q of members) { const x = q % W, y = (q - x) / W; if (y >= maxy - 2) { fx += x; fn += 1; } }
    comps.push({ id: cid, members, minx, maxx, miny, maxy, w: maxx - minx + 1, h: maxy - miny + 1, n: members.length, footX: Math.round(fx / fn), footY: maxy + 1 });
  }
  return { lab, comps };
}
