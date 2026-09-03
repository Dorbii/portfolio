// Compose labelled review sheets from a review.mjs output set.
//   node .codex-tmp/session3/sheet.mjs <tag> [beforeTag]
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
sharp.cache(false);
const tag = process.argv[2] ?? "now";
const before = process.argv[3];
const DIR = `.codex-tmp/session3/review/${tag}`;
const BDIR = before ? `.codex-tmp/session3/review/${before}` : null;
const BAR = 44, GAP = 16, BG = { r: 24, g: 24, b: 24, alpha: 1 };
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const label = (w, text) => Buffer.from(
  `<svg width="${w}" height="${BAR}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#1b1b1b"/><text x="12" y="29" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="22" fill="#f2f2f2">${esc(text)}</text></svg>`);

async function panel(file, text, width, height) {
  let img = sharp(file);
  const m = await img.metadata();
  if (width && (m.width !== width || (height && m.height !== height))) {
    img = img.resize(width, height ?? null, { kernel: m.width < width ? "nearest" : "lanczos3", fit: "fill" });
  }
  const buf = await img.png().toBuffer();
  const mm = await sharp(buf).metadata();
  const out = await sharp({ create: { width: mm.width, height: mm.height + BAR, channels: 4, background: BG } })
    .composite([{ input: label(mm.width, text), left: 0, top: 0 }, { input: buf, left: 0, top: BAR }]).png().toBuffer();
  return { buf: out, w: mm.width, h: mm.height + BAR };
}
async function row(panels, outName, title) {
  const W = panels.reduce((a, p) => a + p.w, 0) + GAP * (panels.length + 1);
  const H = Math.max(...panels.map(p => p.h)) + GAP * 2 + BAR;
  const comps = [{ input: label(W, title), left: 0, top: 0 }];
  let x = GAP;
  for (const p of panels) { comps.push({ input: p.buf, left: x, top: BAR + GAP }); x += p.w + GAP; }
  const out = path.join(DIR, outName);
  await sharp({ create: { width: W, height: H, channels: 4, background: BG } }).composite(comps).png({ compressionLevel: 9 }).toFile(out);
  const kb = Math.round(fs.statSync(out).size / 1024);
  console.log(`  ${out}  ${W}x${H}  ${kb} KB`);
}
const f = n => path.join(DIR, n);
const bf = n => path.join(BDIR, n);

// Sheet 1 - overview: assembled region at 1/4, the L3 pyramid tier (1/8, shown 2x), magenta hole hunt (1/4)
await row([
  await panel(f("mounted-quarter.png"), "three cells, L0 tiles assembled, shown at 1/4  (top-left quadrant = unauthored c3-2)", 1024, 1024),
  await panel(f("pyramid-L3.png"), "same region as the L3 tier actually holds (1/8, shown 2x nearest)", 1024, 1024),
  await panel(f("holes-L1-magenta.png"), "hole hunt: L1 over magenta - magenta inside land would be unmasked transparency", 1024, 1024),
], "sheet-1-overview.png", `sheet 1 - overview  [${tag}]   grid: c4-2 top-right, c3-3 bottom-left, c4-3 bottom-right`);

// Sheet 2 - seam c3-3|c4-3 (vertical, x = 8192): three 1:1 windows top->bottom, then the band at 1/2 and 1/4
await row([
  await panel(f("seam-33-43-1to1-0.png"), "1:1  top third  (seam = vertical centre line)"),
  await panel(f("seam-33-43-1to1-1.png"), "1:1  middle third"),
  await panel(f("seam-33-43-1to1-2.png"), "1:1  bottom third"),
  await panel(f("seam-33-43-band-L1.png"), "whole seam at 1/2 (L1 tier)"),
  await panel(f("seam-33-43-band-L2.png"), "whole seam at 1/4 (L2 tier), shown 2x", 512, 1024),
], "sheet-2-seam-c33-c43.png", `sheet 2 - seam c3-3 | c4-3  (c3-3 saddle on the LEFT, c4-3 quarry on the RIGHT)  [${tag}]`);

// Sheet 3 - seam c4-2|c4-3 (horizontal, y = 6144): three 1:1 windows west->east, then the band at 1/2 and 1/4
const s3 = [
  await panel(f("seam-42-43-1to1-0.png"), "1:1  west third, the stream crossing  (seam = horizontal centre line)"),
  await panel(f("seam-42-43-1to1-1.png"), "1:1  middle third"),
  await panel(f("seam-42-43-1to1-2.png"), "1:1  east third, the cliff and ledge"),
];
await row(s3, "sheet-3-seam-c42-c43-1to1.png", `sheet 3 - seam c4-2 | c4-3 at 1:1  (c4-2 coast ABOVE, c4-3 quarry BELOW)  [${tag}]`);
const s3b = [
  await panel(f("seam-42-43-band-L1.png"), "whole seam at 1/2 (L1 tier)"),
  await panel(f("seam-42-43-band-L2.png"), "whole seam at 1/4 (L2 tier), shown 2x", 1024, 512),
];
if (BDIR) s3b.push(await panel(bf("seam-42-43-band-L1.png"), `BEFORE (${before}): the old c4-2 and its stream miss, at 1/2`));
await row(s3b, "sheet-3b-seam-c42-c43-reduced.png", `sheet 3b - seam c4-2 | c4-3 reduced  [${tag}]`);

// Sheet 4 - the three-way corner and the provisional c3-2 pocket
const s4 = [await panel(f("corner-1to1.png"), "1:1  corner at (8192, 6144): c3-2 pocket top-left is bleed-only until c3-2 is authored")];
if (BDIR) s4.push(await panel(bf("corner-1to1.png"), `BEFORE (${before})`));
await row(s4, "sheet-4-corner.png", `sheet 4 - three-way corner  [${tag}]`);
console.log("done");

// Sheet 5 - the rejected c4-2 candidate: where its stream lands vs the peg, the mock extended bridge, the mask misfit
const PEG = ".codex-tmp/session3/review/peg";
if (fs.existsSync(path.join(PEG, "peg-seam-raw.png"))) {
  const nums = JSON.parse(fs.readFileSync(path.join(PEG, "peg-numbers.json"), "utf8"));
  const cand = ".codex-tmp/authoring/cells/c4-2/c4-2-source.png";
  const p5 = [
    await panel(cand, "candidate 2 as generated (1254 px, shown 1:1): tarn, fall, gully stream, east sea-cliff, south edge all land", 1254, 1254),
    await panel(path.join(PEG, "peg-seam-raw.png"), `raw join at the shared edge: candidate above the line, c4-3 below.  green = c4-3 stream (x ${Math.round(nums.neighbourCrossing.c)}), red = candidate (x ${Math.round(nums.candidateCrossing.c)}), miss ${Math.round(nums.missPx)} px`),
    await panel(path.join(PEG, "peg-seam-bridge-mock.png"), `MOCK: the footprint bridge if its reach were extended to ${Math.round(nums.missPx)} px (depth ${nums.mockN}) - mask rerouted, painted gully orphaned`),
  ];
  const outDir = DIR; // written alongside the tagged set
  const W = p5.reduce((a, p) => a + p.w, 0) + GAP * (p5.length + 1), H = Math.max(...p5.map(p => p.h)) + GAP * 2 + BAR;
  const comps = [{ input: label(W, `sheet 5 - c4-2 replacement candidate (REJECTED by the gates: continuity miss ${Math.round(nums.missPx)} px > 150 bridge reach; painted water outside its mask 7.78% vs <1%)  [${tag}]`), left: 0, top: 0 }];
  let x = GAP; for (const p of p5) { comps.push({ input: p.buf, left: x, top: BAR + GAP }); x += p.w + GAP; }
  const out = path.join(outDir, "sheet-5-c42-candidate.png");
  await sharp({ create: { width: W, height: H, channels: 4, background: BG } }).composite(comps).png({ compressionLevel: 9 }).toFile(out);
  console.log(`  ${out}  ${W}x${H}  ${Math.round(fs.statSync(out).size / 1024)} KB`);
}
