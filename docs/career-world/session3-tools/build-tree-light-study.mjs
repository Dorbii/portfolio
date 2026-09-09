// One-tree, quarantine-only study. Source painting is copied without edits;
// the mask selects the same connected crown that the sprite tool classified.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { crownMask, crownComponents } from "./crown-mask.mjs";
const root = path.resolve(import.meta.dirname, "../../..");
const out = path.join(root, ".codex-tmp/qa/foliage-light-study");
fs.mkdirSync(out, { recursive: true });
const source = path.join(root, "public/career-world/layers/terrain/authority/tiles/l2-tanium/c3-1-site.webp");
const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { comps } = crownComponents(crownMask(data, info.width), info.width);
const crown = comps.find(c => c && c.footX === 208 && c.footY === 879);
if (!crown) throw new Error("The reviewed pine no longer matches its registered foot; reselect it by eye.");
const crop = { left: 120, top: 680, width: 220, height: 240 };
await sharp(source).extract(crop).png().toFile(path.join(out, "context.png"));
const mask = Buffer.alloc(crop.width * crop.height * 4);
for (const p of crown.members) {
  const x = p % info.width - crop.left;
  const y = Math.floor(p / info.width) - crop.top;
  if (x < 0 || y < 0 || x >= crop.width || y >= crop.height) throw new Error("Crown leaves the review crop.");
  const o = (y * crop.width + x) * 4;
  mask[o] = mask[o + 1] = mask[o + 2] = mask[o + 3] = 255;
}
await sharp(mask, { raw: { width: crop.width, height: crop.height, channels: 4 } }).png().toFile(path.join(out, "crown.png"));
fs.copyFileSync(path.join(import.meta.dirname, "tree-light-study.html"), path.join(out, "index.html"));
fs.writeFileSync(path.join(out, "source.json"), JSON.stringify({
  source: path.relative(root, source), crop, foot: [crown.footX, crown.footY],
  crownPixels: crown.members.length, note: "Source art and silhouette stay fixed. Diagnostic only.",
}, null, 2));
console.log(out);
