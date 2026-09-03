// Kaizen's district drawn on the authored land it stands on.
//
// Two panels, both from the live manifests and the live 4x land plate:
//   left   cell [7,1] and its neighbours, the whole district in place
//   right  a close crop on the one vertex still standing in water
//
// Colours: land is the authored art; the lattice is thin grey; the district is
// drawn by kind; the Kaizen node is the green shelf circle plan-territory.mjs
// draws; anything over water is ringed in red.
//
//   node docs/career-world/session3-tools/draw-kaizen-on-land.mjs
import fs from "node:fs";
import zlib from "node:zlib";
import sharp from "sharp";
sharp.cache(false);

const R = "public/career-world/";
const J = (p) => JSON.parse(fs.readFileSync(R + p, "utf8"));
const OUT = "docs/career-world/session3-tools/kaizen-on-land.png";

function decodeGrey(p) {
  const b = fs.readFileSync(p);
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  if (b[25] !== 0) throw new Error(`${p} must be greyscale`);
  const cs = []; let o = 8;
  while (o < b.length) {
    const l = b.readUInt32BE(o);
    if (b.subarray(o + 4, o + 8).toString("ascii") === "IDAT") cs.push(b.subarray(o + 8, o + 8 + l));
    o += 12 + l;
  }
  const raw = zlib.inflateSync(Buffer.concat(cs));
  const out = Buffer.alloc(h * w);
  for (let y = 0; y < h; y += 1) {
    const f = raw[y * (w + 1)];
    const ln = raw.subarray(y * (w + 1) + 1, y * (w + 1) + 1 + w);
    for (let x = 0; x < w; x += 1) {
      const a = x >= 1 ? out[y * w + x - 1] : 0;
      const bb = y > 0 ? out[(y - 1) * w + x] : 0;
      const c = x >= 1 && y > 0 ? out[(y - 1) * w + x - 1] : 0;
      let v = ln[x];
      if (f === 1) v += a; else if (f === 2) v += bb; else if (f === 3) v += (a + bb) >> 1;
      else if (f === 4) {
        const pp = a + bb - c, pa = Math.abs(pp - a), pb = Math.abs(pp - bb), pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? bb : c;
      }
      out[y * w + x] = v & 0xff;
    }
  }
  return { width: w, height: h, pixels: out };
}
const mask = decodeGrey(R + "layers/terrain/authority/masks/world-land-mask-r5.png");
const isLand = (p) => {
  const x = Math.floor(p[0] * mask.width), y = Math.floor(p[1] * mask.height);
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return false;
  return mask.pixels[y * mask.width + x] >= 128;
};

// -------- the content
const town = J("layers/infrastructure/manifests/ninjaone-project-towns-r1.json").towns[0].townPlan;
const skills = J("layers/structures/manifests/skill-structures-r1.json").instances;
const fringe = J("layers/terrain/detail/manifests/ninjaone-rural-outskirts-r1.json").scenery;
const node = J("layers/structures/manifests/project-structures-r1.json")
  .nodes.find((n) => n.id.includes("kaizen")).territoryAnchor;

const PLATE = R + "layers/terrain/authority/textures/world-land-detail-4x-r1.png";
const meta = await sharp(PLATE).metadata();
const PW = meta.width, PH = meta.height;

async function panel(view, scale, label) {
  const [u0, v0, u1, v1] = view;
  const sx = Math.round(u0 * PW), sy = Math.round(v0 * PH);
  const sw = Math.round((u1 - u0) * PW), sh = Math.round((v1 - v0) * PH);
  const W = Math.round(sw * scale), H = Math.round(sh * scale);
  const X = (p) => ((p[0] - u0) / (u1 - u0)) * W;
  const Y = (p) => ((p[1] - v0) / (v1 - v0)) * H;

  // NO background rect here. The overlay is composited ON TOP of the art, so an
  // opaque rect hides the terrain and leaves only the vectors -- which then read
  // as landforms. That is exactly how the first draft of this picture lied.
  const s = [];
  // the lattice
  for (let c = 0; c <= 16; c += 1) {
    const x = X([c / 16, 0]);
    if (x >= -2 && x <= W + 2) s.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#7d8a95" stroke-width="1.5" opacity="0.55"/>`);
  }
  for (let r = 0; r <= 9; r += 1) {
    const y = Y([0, r / 9]);
    if (y >= -2 && y <= H + 2) s.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#7d8a95" stroke-width="1.5" opacity="0.55"/>`);
  }
  // cell [7,1], the shelf Kaizen is given
  s.push(`<rect x="${X([7 / 16, 0])}" y="${Y([0, 1 / 9])}" width="${X([8 / 16, 0]) - X([7 / 16, 0])}" `
    + `height="${Y([0, 2 / 9]) - Y([0, 1 / 9])}" fill="none" stroke="#e0b64a" stroke-width="3" opacity="0.9"/>`);

  const poly = (pts, stroke, fill, w) => `<polygon points="${pts.map((p) => `${X(p).toFixed(1)},${Y(p).toFixed(1)}`).join(" ")}" `
    + `fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;
  const line = (pts, stroke, w, dash = "") => `<polyline points="${pts.map((p) => `${X(p).toFixed(1)},${Y(p).toFixed(1)}`).join(" ")}" `
    + `fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"${dash}/>`;

  for (const b of town.blocks ?? []) s.push(poly(b.points, "#ff9d5c", "#ff9d5c22", 2.5));
  for (const z of town.plazas ?? []) s.push(poly(z.points, "#ffd479", "#ffd47933", 2));
  for (const st of town.streets ?? []) s.push(line(st.waypoints, "#f2f2f2", 2.5));
  for (const lp of town.pedestrianLoops ?? []) s.push(line(lp.waypoints, "#cfd8e0", 1.6, ` stroke-dasharray="6 5"`));
  for (const sm of town.terrainSeams ?? []) {
    s.push(line(sm.waypoints, sm.kind === "drainage" ? "#5ec8ff" : "#b98cff", 3));
  }
  for (const e of town.entrances ?? []) s.push(`<circle cx="${X(e.point)}" cy="${Y(e.point)}" r="5" fill="none" stroke="#ffe9a8" stroke-width="2"/>`);
  for (const f of fringe) s.push(`<rect x="${X(f.anchor) - 4}" y="${Y(f.anchor) - 4}" width="8" height="8" fill="none" stroke="#9ad46b" stroke-width="2"/>`);
  for (const n of skills) s.push(`<rect x="${X(n.territoryAnchor) - 5}" y="${Y(n.territoryAnchor) - 5}" width="10" height="10" fill="#8fe06a" opacity="0.85"/>`);
  // the shelf circle, drawn the way plan-territory.mjs draws it
  s.push(`<circle cx="${X(node)}" cy="${Y(node)}" r="17" fill="none" stroke="#8fe06a" stroke-width="3"/>`);
  s.push(`<circle cx="${X(node)}" cy="${Y(node)}" r="2.5" fill="#8fe06a"/>`);

  // anything over water gets ringed
  const every = [
    ...(town.blocks ?? []).flatMap((b) => b.points),
    ...(town.streets ?? []).flatMap((x) => x.waypoints),
    ...(town.plazas ?? []).flatMap((x) => x.points),
    ...(town.terrainSeams ?? []).flatMap((x) => x.waypoints),
    ...(town.pedestrianLoops ?? []).flatMap((x) => x.waypoints),
    ...(town.entrances ?? []).map((e) => e.point),
    ...skills.map((n) => n.territoryAnchor),
  ];
  let wet = 0;
  for (const p of every) {
    if (isLand(p)) continue;
    wet += 1;
    s.push(`<circle cx="${X(p)}" cy="${Y(p)}" r="${scale > 6 ? 26 : 13}" fill="none" stroke="#ff4d4d" stroke-width="3"/>`);
  }
  s.push(`<rect x="0" y="0" width="${W}" height="86" fill="#0b141c" opacity="0.82"/>`);
  s.push(`<text x="14" y="30" fill="#e8eef4" font-family="Georgia,serif" font-size="22">${label}</text>`);
  const key = [["#ff9d5c","blocks"],["#ffd479","plazas"],["#f2f2f2","streets"],["#5ec8ff","drainage seam"],["#b98cff","retaining wall"],["#8fe06a","Kaizen node / skills"],["#9ad46b","rural fringe"],["#e0b64a","cell [7,1]"],["#ff4d4d","over water"]];
  key.forEach(([col,name],i)=>{const x=14+i*Math.min(200,(W-30)/key.length);
    s.push(`<rect x="${x}" y="64" width="14" height="10" fill="${col}"/>`);
    s.push(`<text x="${x+20}" y="74" fill="#c3ced8" font-family="monospace" font-size="13">${name}</text>`);});
  s.push(`<text x="14" y="52" fill="#9fb0bf" font-family="monospace" font-size="15">${wet} of ${every.length} points over water   -   terrain below is the live 4x land plate</text>`);

  const art = await sharp(PLATE).extract({ left: sx, top: sy, width: sw, height: sh })
    .resize(W, H, { kernel: "nearest" }).png().toBuffer();
  return sharp({ create: { width: W, height: H, channels: 4, background: { r: 13, g: 27, b: 38, alpha: 255 } } })
    .composite([
      { input: art, left: 0, top: 0 },
      { input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${s.join("")}</svg>`), left: 0, top: 0 },
    ]).png().toBuffer();
}

// left: the district in its cell and neighbours.  right: the wet vertex.
const wetPt = [
  ...(town.terrainSeams ?? []).flatMap((x) => x.waypoints),
  ...(town.blocks ?? []).flatMap((b) => b.points),
].find((p) => !isLand(p));
const left = await panel([6 / 16, 0.5 / 9, 8.6 / 16, 2.9 / 9], 2.2, "Kaizen district on cell [7,1]");
const right = wetPt
  ? await panel([wetPt[0] - 0.011, wetPt[1] - 0.0196, wetPt[0] + 0.011, wetPt[1] + 0.0196], 11, "the one vertex still in water")
  : null;

const lm = await sharp(left).metadata();
const rm = right ? await sharp(right).metadata() : { width: 0, height: 0 };
const GAP = 16;
const W = lm.width + (right ? GAP + rm.width : 0), H = Math.max(lm.height, rm.height);
await sharp({ create: { width: W, height: H, channels: 4, background: { r: 8, g: 14, b: 20, alpha: 255 } } })
  .composite([
    { input: left, left: 0, top: 0 },
    ...(right ? [{ input: right, left: lm.width + GAP, top: 0 }] : []),
  ]).png().toFile(OUT);
console.log(`wrote ${OUT}  ${W} x ${H}`);
if (wetPt) console.log(`the wet vertex is at [${wetPt[0]}, ${wetPt[1]}]`);
