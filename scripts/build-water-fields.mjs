import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { applyFlowFeature, distanceTransform, encodeWaterField, markProvisionalCoast,marineFlowMarkers,restoreMarineFlow,completeAnnotatedWater,applyMarineRegion } from "./lib/water-fields.mjs";
import { WORLD_PLANE } from "../features/career-world/shared/world.ts";
import { traceInlandFall } from "./lib/inland-fall-profile.mjs";

sharp.cache(false);
const ROOT = process.cwd();
const SOURCE = "public/career-world/layers/terrain/authority/manifests/terrain-local-mount-r1.json";
const OUT = "public/career-world/layers/water/fields-r1";
const WIDTH = 8192, HEIGHT = 4608, TILE = 256, LEVELS = 6;
const RANGE_METRES = 24;
const sourceBytes = await fs.readFile(SOURCE);
const terrain = JSON.parse(sourceBytes);
const ANNOTATIONS = "art-source/career-world/water/flow-features-r1.json";
const ISLAND_ANNOTATIONS = "art-source/career-world/water/inland-island-r1.json";
const legacyAnnotationBytes = await fs.readFile(ANNOTATIONS);
const islandAnnotationBytes = await fs.readFile(ISLAND_ANNOTATIONS);
const annotationBytes = Buffer.concat([legacyAnnotationBytes,islandAnnotationBytes]);
const annotations = JSON.parse(legacyAnnotationBytes);
const island = JSON.parse(islandAnnotationBytes);
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const sourceAssets = [];
for (const tile of terrain.tiles) {
  const file = path.join("public", tile.sources.site.path);
  sourceAssets.push({ path: file.replaceAll("\\", "/"), sha256: hash(await fs.readFile(file)) });
}
const generatorHash = hash(Buffer.concat([
  await fs.readFile(new URL(import.meta.url)), await fs.readFile(new URL("./lib/water-fields.mjs", import.meta.url)),
  await fs.readFile(new URL("./lib/inland-fall-profile.mjs", import.meta.url)),
  await fs.readFile(new URL("../features/career-world/layers/water/inland/profile.ts", import.meta.url)),
]));
const inputHash = hash(Buffer.from(JSON.stringify({ terrain: hash(sourceBytes), annotations: hash(annotationBytes), sourceAssets, world: WORLD_PLANE, generatorHash })));
if (process.argv.includes("--check")) {
  const previous = JSON.parse(await fs.readFile(path.join(OUT, "manifest.json"), "utf8"));
  if (previous.inputHash !== inputHash) throw new Error("Water fields are stale against the served land or water annotations. Run build:water.");
  for (const level of previous.levels) for (const tile of level.tiles) {
    if (hash(await fs.readFile(path.join("public", tile.path))) !== tile.sha256) throw new Error(`Derived water tile changed: ${tile.path}`);
  }
  if (hash(await fs.readFile(path.join("public", previous.seabedGeometry.path))) !== previous.seabedGeometry.sha256) throw new Error("Seabed geography changed.");
  console.log("Water inputs and all derived tile paths are current.");
  process.exit(0);
}
// The scale contract is recorded by the authoring ledger, not inferred from an
// old ocean bake or a camera framing. The grid's world dimensions are explicit.
const contract = JSON.parse(await fs.readFile("public/career-world/layers/terrain/authority/manifests/terrain-l2-ninjaone-r1.json", "utf8")).contract;
const worldSize = [WORLD_PLANE.width, WORLD_PLANE.height];
const metresPerPixel = worldSize[0] * contract.mPerWorldPx / WIDTH;
const overlays = [], rectangles = [];
for (const tile of terrain.tiles) {
  const left = Math.round(tile.worldBounds.origin[0] * WIDTH);
  const top = Math.round(tile.worldBounds.origin[1] * HEIGHT);
  const width = Math.round((tile.worldBounds.origin[0] + tile.worldBounds.span[0]) * WIDTH) - left;
  const height = Math.round((tile.worldBounds.origin[1] + tile.worldBounds.span[1]) * HEIGHT) - top;
  const input = await sharp(path.join(ROOT, "public", tile.sources.site.path))
    .resize(width, height).ensureAlpha().png().toBuffer();
  overlays.push({ input, left, top });
  rectangles.push({ x: left, y: top, w: width, h: height });
}
const pixels = await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 4, background: "#00000000" } })
  .composite(overlays).raw().toBuffer();
const land = new Uint8Array(WIDTH * HEIGHT);
for (let i = 0; i < land.length; i++) land[i] = pixels[i * 4 + 3] >= 128 ? 1 : 0;
console.log(`Deriving water fields from ${terrain.tiles.length} served terrain cells (${WIDTH}x${HEIGHT}).`);
const { data, stats } = encodeWaterField(land, WIDTH, HEIGHT, metresPerPixel, RANGE_METRES);
stats.provisionalCoastPixels = markProvisionalCoast(data, land, WIDTH, HEIGHT, rectangles, RANGE_METRES / metresPerPixel);
// The narrower geometric inlet rule must not overrule explicitly mapped
// inland flow. Keep the established broad-sea handoff for annotation protection;
// unannotated rocky inlets still use the new marine classification above.
const handoffData=encodeWaterField(land,WIDTH,HEIGHT,metresPerPixel,RANGE_METRES,8).data;
markProvisionalCoast(handoffData,land,WIDTH,HEIGHT,rectangles,RANGE_METRES/metresPerPixel);
const originalMarine=marineFlowMarkers(handoffData);
const beforeAnnotations=Buffer.from(data);
const features = [],marineRegions=[];
if(island.cells.length!==terrain.tiles.length||new Set(island.cells.map(cell=>cell.tileId)).size!==terrain.tiles.length
  ||terrain.tiles.some(tile=>!island.cells.some(cell=>cell.tileId===tile.id)))throw new Error("Inland inventory must cover every mounted cell exactly once.");
for(const cell of island.cells){
  const tile=terrain.tiles.find(tile=>tile.id===cell.tileId);
  if(!tile||hash(await fs.readFile(cell.source))!==cell.sha256)throw new Error(`Inland inventory source changed: ${cell.tileId}`);
  const world=([x,y])=>[tile.worldBounds.origin[0]+x*tile.worldBounds.span[0],tile.worldBounds.origin[1]+y*tile.worldBounds.span[1]];
  const field=point=>{const p=world(point);return [p[0]*WIDTH,p[1]*HEIGHT];};
  const radius=r=>r*tile.worldBounds.span[0]*WIDTH;
  const record=(feature,kind,points,changed,extra={})=>{
    if(!changed)throw new Error(`Inland feature misses served water: ${feature.id}`);
    features.push({id:feature.id,kind,tileId:tile.id,waterPixels:changed,points:points.map(world),...extra});
  };
  for(const region of cell.marineRegions??[])marineRegions.push({...region,tileId:tile.id,bounds:region.bounds.map(world)});
  for(const stream of cell.streams){
    const changed=applyFlowFeature(data,land,WIDTH,HEIGHT,stream.path.map(field),radius(stream.radius),0.6);
    record(stream,"stream",stream.path,changed);
  }
  for(const pool of cell.pools){
    const center=field(pool.point),r=radius(pool.radius);let changed=0;
    for(let y=Math.max(0,Math.floor(center[1]-r));y<=Math.min(HEIGHT-1,Math.ceil(center[1]+r));y++)
      for(let x=Math.max(0,Math.floor(center[0]-r));x<=Math.min(WIDTH-1,Math.ceil(center[0]+r));x++){
        const i=y*WIDTH+x;if(land[i]||Math.hypot(x-center[0],y-center[1])>r)continue;
        data[i*3+1]=128;data[i*3+2]=153;changed++;
      }
    record(pool,"pool",[pool.point],changed);
  }
  const sourceImage=cell.falls.length?await sharp(cell.source).ensureAlpha().raw().toBuffer({resolveWithObject:true}):null;
  for(const fall of cell.falls){
    const profile=traceInlandFall(sourceImage.data,sourceImage.info.width,sourceImage.info.height,fall);
    const points=profile.points.slice(profile.lipIndex);
    const changed=applyFlowFeature(data,land,WIDTH,HEIGHT,points.map(field),radius(fall.radius),1);
    record(fall,"fall",points,changed,{upstream:world(profile.points[0]),hasLanding:fall.hasLanding,style:fall.style,
      widthMetres:Math.max(0.6,Math.min(4.0,radius(fall.radius)*metresPerPixel)),backingOffset:fall.backingOffset,sourcePath:tile.sources.site.path,
      profile:{points:profile.points.map(world),halfWidths:profile.halfWidths.map(n=>n*tile.worldBounds.span[0]*worldSize[0]*contract.mPerWorldPx),
        lipIndex:profile.lipIndex,edgeDirection:profile.edgeDirection,landingAdjustmentPixels:profile.landingAdjustmentPixels,
        opaqueSamples:profile.opaqueSamples,maximumAdjustmentPixels:profile.maximumAdjustmentPixels}});
  }
}
stats.completedAnnotatedWaterPixels=completeAnnotatedWater(data,beforeAnnotations,land,originalMarine,WIDTH,HEIGHT);
// Preserve the already-reviewed gorge and purple-brook interpretation last.
for (const cell of annotations.cells) {
  const tile = terrain.tiles.find((entry) => entry.id === cell.tileId);
  if (!tile) continue;
  const x0=Math.round(tile.worldBounds.origin[0]*WIDTH),y0=Math.round(tile.worldBounds.origin[1]*HEIGHT);
  const x1=x0+Math.round(tile.worldBounds.span[0]*WIDTH),y1=y0+Math.round(tile.worldBounds.span[1]*HEIGHT);
  // A neighboring annotation must not spread its inferred water body into
  // the source-bound legacy cells. Their own paths are applied below.
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    const i=(y*WIDTH+x)*3;data[i+1]=beforeAnnotations[i+1];data[i+2]=beforeAnnotations[i+2];
  }
  if (hash(await fs.readFile(cell.source)) !== cell.sha256) throw new Error(`Flow annotation ${cell.tileId} needs review: its source artwork changed.`);
  const toField = ([x, y]) => [
    (tile.worldBounds.origin[0] + (x - contract.bleedPx) / contract.keptPx * tile.worldBounds.span[0]) * WIDTH,
    (tile.worldBounds.origin[1] + (y - contract.bleedPx) / contract.keptPx * tile.worldBounds.span[1]) * HEIGHT,
  ];
  for (const feature of cell.features) {
    const points = feature.path.map(toField);
    const radius = feature.radiusArtPx / contract.keptPx * tile.worldBounds.span[0] * WIDTH;
    const changed = applyFlowFeature(data, land, WIDTH, HEIGHT, points, radius, feature.kind === "fall" ? 1 : 0.6);
    features.push({ id: feature.id, kind: feature.kind, tileId:tile.id,waterPixels: changed,
      points: points.map(([x, y]) => [x / WIDTH, y / HEIGHT]) });
  }
}
// Inland annotations may describe a fall reaching the sea, but cannot turn
// previously open ocean into a circular inland-material patch at its foot.
restoreMarineFlow(data,originalMarine);
stats.marineOverridePixels=marineRegions.reduce((count,region)=>count+applyMarineRegion(data,land,WIDTH,HEIGHT,region.bounds.map(p=>[p[0]*WIDTH,p[1]*HEIGHT])),0);
await fs.mkdir(OUT, { recursive: true });
// Wider-range ocean geography supplies coastal shelves. It is derived from
// the same served alpha, so shelves follow the island rather than freehand blobs.
const seabedWidth = 2048, seabedHeight = 1152, seabedRange = 192;
const seabedLand = new Uint8Array(await sharp(land, { raw: { width: WIDTH, height: HEIGHT, channels: 1 } })
  .resize(seabedWidth, seabedHeight, { kernel: "nearest" }).toColourspace("b-w").raw().toBuffer());
const seabedDistance = distanceTransform(seabedLand, seabedWidth, seabedHeight, 1);
const seabedBytes = Buffer.alloc(seabedWidth * seabedHeight * 3);
for (let y = 0; y < seabedHeight; y++) for (let x = 0; x < seabedWidth; x++) {
  const i = y * seabedWidth + x;
  const original = ((y * 4 + 2) * WIDTH + x * 4 + 2) * 3;
  const vx = data[original + 1] / 255 * 2 - 1, vy = data[original + 2] / 255 * 2 - 1;
  seabedBytes[i * 3] = seabedLand[i] ? 0 : Math.round(Math.min(1, seabedDistance[i] * metresPerPixel * 4 / seabedRange) * 255);
  seabedBytes[i * 3 + 1] = !seabedLand[i] && Math.hypot(vx, vy) < 0.045 ? 255 : 0;
  seabedBytes[i * 3 + 2] = Math.round(Math.max(0, Math.min(1, (data[original + 1] - 123) / 5)) * 255);
}
const seabedPng = await sharp(seabedBytes, { raw: { width: seabedWidth, height: seabedHeight, channels: 3 } }).png().toBuffer();
const seabedDirectory = path.join(OUT, inputHash.slice(0, 16));
await fs.mkdir(seabedDirectory, { recursive: true });
await fs.writeFile(path.join(seabedDirectory, "seabed-geography.png"), seabedPng);
const manifest = {
  version: 1, source: SOURCE, sourceHash: hash(sourceBytes), inputHash, generatorHash, sourceAssets, features, marineRegions,
  inlandInventory:island.cells.map(cell=>({tileId:cell.tileId,note:cell.note,streams:cell.streams.length,pools:cell.pools.length,falls:cell.falls.length})),
  worldSize, metresPerWorldUnit: contract.mPerWorldPx, rangeMetres: RANGE_METRES,
  dimensions: [WIDTH, HEIGHT], tileSize: TILE, levels: [],
  seabedGeometry: { path: `/career-world/layers/water/fields-r1/${inputHash.slice(0, 16)}/seabed-geography.png`,
    dimensions: [seabedWidth, seabedHeight], rangeMetres: seabedRange, sha256: hash(seabedPng),
    channels: "R coast distance 0..192m; G marine coverage; B natural coast confidence" },
  channels: { r: "signed shore distance, -range..+range metres", gb: "flow vector; length 0 ocean, .2 closed pool, .6 estuary channel, 1 authored fall; ocean G=123 suppresses surf at provisional tile cuts" },
  geometry: "Current served land alpha only. Water remains beneath land; this field does not erase terrain.",
  flow: "Sea-connected channels follow a broad-water outlet potential. Closed water has no inferred direction.",
  stats,
};
let levelImage = sharp(data, { raw: { width: WIDTH, height: HEIGHT, channels: 3 } });
let w = WIDTH, h = HEIGHT;
for (let level = 0; level < LEVELS; level++) {
  const png = await levelImage.png().toBuffer();
  const dir = path.join(OUT, inputHash.slice(0, 16), `L${level}`);
  await fs.mkdir(dir, { recursive: true });
  const entries = [];
  for (let y = 0; y < h; y += TILE) {
    for (let x = 0; x < w; x += TILE) {
      const tw = Math.min(TILE, w - x), th = Math.min(TILE, h - y);
      const image = sharp(png).extract({ left: x, top: y, width: tw, height: th });
      const raw = await image.clone().raw().toBuffer();
      let nonUniform = false;
      for (let p = 0; p < raw.length; p += 3) {
        if (raw[p] < 255 || raw[p + 1] !== 128 || raw[p + 2] !== 128) { nonUniform = true; break; }
      }
      // Deep open sea uses the shader's constant field and needs no texture.
      if (!nonUniform && level + 1 < LEVELS) continue;
      const name = `${x / TILE}-${y / TILE}.png`;
      const encoded = await image.png().toBuffer();
      await fs.writeFile(path.join(dir, name), encoded);
      entries.push({ id: `${level}/${x / TILE}-${y / TILE}`, path: `/career-world/layers/water/fields-r1/${inputHash.slice(0, 16)}/L${level}/${name}`,
        origin: [x / w, y / h], span: [tw / w, th / h], dimensions: [tw, th], sha256: hash(encoded) });
    }
  }
  manifest.levels.push({ level, dimensions: [w, h], tiles: entries });
  console.log(`L${level}: ${entries.length} field tiles`);
  w = Math.ceil(w / 2); h = Math.ceil(h / 2);
  levelImage = sharp(png).resize(w, h, { kernel: "linear" });
}
await fs.writeFile(path.join(OUT, "manifest.next.json"), JSON.stringify(manifest, null, 2) + "\n");
await fs.rename(path.join(OUT, "manifest.next.json"), path.join(OUT, "manifest.json"));
console.log(JSON.stringify(stats));
