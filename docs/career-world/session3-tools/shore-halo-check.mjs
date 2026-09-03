// Does the shoreline alpha erosion remove a visible dark halo? Composite the
// stream tiles over a flat sea at the SITE tier, HEAD build beside the eroded
// build, on a stretch of real coast. Eyes decide; the numbers are printed too.
//   node .codex-tmp/session3/shore-halo-check.mjs <x0> <y0> <size>   (normalized world)
import sharp from "sharp"; import fs from "node:fs"; import { execFileSync } from "node:child_process";
sharp.cache(false);
const MAN = "public/career-world/layers/terrain/authority/manifests/terrain-stream-tiles-r3.json";
const OUT = ".codex-tmp/session3/review"; fs.mkdirSync(OUT, { recursive: true });
const HEADDIR = ".codex-tmp/session3/headtiles"; fs.mkdirSync(HEADDIR, { recursive: true });
const SEA = { r: 26, g: 42, b: 58 };

const man = JSON.parse(fs.readFileSync(MAN, "utf8"));
const X0 = +(process.argv[2] ?? 0.10), Y0 = +(process.argv[3] ?? 0.15), SZ = +(process.argv[4] ?? 0.06);
const X1 = X0 + SZ, Y1 = Y0 + SZ;
const hit = man.tiles.filter((t) => {
  const [ox, oy] = t.worldBounds.origin, [sx, sy] = t.worldBounds.span;
  return ox < X1 && oy < Y1 && ox + sx > X0 && oy + sy > Y0 && t.sources.site;
});
if (!hit.length) { console.log("no tiles in window"); process.exit(1); }
const scale = hit[0].sources.site.dimensions[0] / hit[0].worldBounds.span[0]; // px per world unit
const W = Math.round(SZ * scale), H = Math.round(SZ * scale);
console.log(`window ${X0},${Y0} +${SZ} -> ${W}x${H}px, ${hit.length} tiles`);

async function build(which) {
  const comps = [];
  for (const t of hit) {
    const rel = t.sources.site.path.replace(/^\//, "public/");
    let p = rel;
    if (which === "head") {
      p = `${HEADDIR}/${rel.split("/").pop()}`;
      if (!fs.existsSync(p)) fs.writeFileSync(p, execFileSync("git", ["show", `HEAD:${rel}`], { encoding: "buffer", maxBuffer: 1 << 28 }));
    }
    const [ox, oy] = t.worldBounds.origin;
    comps.push({ input: p, left: Math.round((ox - X0) * scale), top: Math.round((oy - Y0) * scale) });
  }
  return sharp({ create: { width: W, height: H, channels: 4, background: { ...SEA, alpha: 1 } } }).composite(comps).png().toBuffer();
}
const a = await build("head"), b = await build("now");

// numbers: the shore band as the viewer sees it, over the sea
async function bandStats(which) {
  const comps = [];
  for (const t of hit) {
    const rel = t.sources.site.path.replace(/^\//, "public/");
    const p = which === "head" ? `${HEADDIR}/${rel.split("/").pop()}` : rel;
    const [ox, oy] = t.worldBounds.origin;
    comps.push({ input: p, left: Math.round((ox - X0) * scale), top: Math.round((oy - Y0) * scale) });
  }
  const raw = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(comps).raw().toBuffer();
  let bandN = 0, bandLum = 0, solidN = 0, solidLum = 0;
  for (let i = 0; i < raw.length; i += 4) {
    const al = raw[i + 3]; if (al <= 10) continue;
    const lum = 0.2126 * raw[i] + 0.7152 * raw[i + 1] + 0.0722 * raw[i + 2];
    if (al >= 250) { solidN++; solidLum += lum; } else { bandN++; bandLum += lum; }
  }
  return { bandN, band: +(bandLum / Math.max(1, bandN)).toFixed(1), solid: +(solidLum / Math.max(1, solidN)).toFixed(1) };
}
const sa = await bandStats("head"), sb = await bandStats("now");
console.log("HEAD :", JSON.stringify(sa));
console.log("ERODE:", JSON.stringify(sb));

const lbl = (text, w) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="30"><rect width="${w}" height="30" fill="#111"/><text x="8" y="21" font-family="Segoe UI, Arial" font-size="17" fill="#fff">${text}</text></svg>`);
await sharp({ create: { width: W * 2 + 16, height: H + 30, channels: 4, background: { r: 17, g: 17, b: 17, alpha: 1 } } })
  .composite([
    { input: a, left: 0, top: 30 }, { input: b, left: W + 16, top: 30 },
    { input: lbl(`HEAD (committed) — shore band luma ${sa.band}, interior ${sa.solid}`, W), left: 0, top: 0 },
    { input: lbl(`with the 2px alpha erosion — band ${sb.band}, interior ${sb.solid}`, W), left: W + 16, top: 0 },
  ]).png().toFile(`${OUT}/shore-halo-${X0}-${Y0}.png`);
console.log("wrote", `${OUT}/shore-halo-${X0}-${Y0}.png`);
