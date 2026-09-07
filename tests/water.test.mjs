import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import sharp from "sharp";
import { distanceTransform, encodeWaterField, applyFlowFeature, markProvisionalCoast,marineFlowMarkers,restoreMarineFlow,completeAnnotatedWater } from "../scripts/lib/water-fields.mjs";
import { buildFieldPages } from "../features/career-world/layers/water/fieldPages.ts";
import { createWaveSpectrum, WAVE_CASCADES, waveHeights } from "../features/career-world/layers/water/ocean/spectrum.ts";
import { normalizeWaterState, selectWaterFields, waveAngularFrequency } from "../features/career-world/layers/water/model.ts";
import { WaterRenderer } from "../features/career-world/layers/water/WaterRenderer.ts";
import { InlandSprayRenderer } from "../features/career-world/layers/water/inland/spray.ts";
import { GORGE_FALL } from "../features/career-world/layers/water/inland/gorge/model.ts";
import {MappedFallsRenderer} from "../features/career-world/layers/water/inland/mappedFalls.ts";
import mappedAtlas from "../public/career-world/layers/water/inland/mapped-falls-r1.json" with {type:"json"};
import { windVectorFromDegrees } from "../features/career-world/shared/weather.ts";
import { normalizeWaterTuning, readWaterTuningUrlOverrides, serializeWaterTuning } from "../features/career-world/shared/waterTuning.ts";

const manifest = JSON.parse(await fs.readFile("public/career-world/layers/water/fields-r1/manifest.json", "utf8"));
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

test("inland flow annotations retain the prior open-ocean material classification",()=>{
  const width=20,height=20,land=new Uint8Array(width*height);
  for(let y=5;y<15;y++)for(let x=5;x<15;x++)land[y*width+x]=1;
  land[10*width+10]=0;
  const original=encodeWaterField(land,width,height,1,24).data;
  const markers=marineFlowMarkers(original),changed=Buffer.from(original);
  applyFlowFeature(changed,land,width,height,[[0,10],[19,10]],4,1);
  restoreMarineFlow(changed,markers);
  for(let i=0;i<markers.length;i++)if(markers[i])assert.deepEqual(changed.subarray(i*3+1,i*3+3),original.subarray(i*3+1,i*3+3));
  const pond=10*width+10;
  assert.notDeepEqual(changed.subarray(pond*3+1,pond*3+3),original.subarray(pond*3+1,pond*3+3));
});

test("annotated channels fill connected side pools without changing land, open sea or unannotated water",()=>{
  const width=30,height=20,land=new Uint8Array(width*height).fill(1);
  for(let y=2;y<18;y++)for(let x=3;x<15;x++)land[y*width+x]=0;
  for(let y=4;y<9;y++)for(let x=22;x<27;x++)land[y*width+x]=0;
  const before=encodeWaterField(land,width,height,1,24).data;
  // Reproduce a small-clearance marine classification inside the larger
  // annotation handoff, with a distinct open-sea boundary at the outlet.
  for(let i=0;i<land.length;i++)if(!land[i]){before[i*3+1]=128;before[i*3+2]=128;}
  const marine=new Uint16Array(land.length);
  for(let x=3;x<15;x++)marine[17*width+x]=(128<<8)|128;
  const data=Buffer.from(before);
  applyFlowFeature(data,land,width,height,[[7,3],[7,14]],1,0.6);
  completeAnnotatedWater(data,before,land,marine,width,height);
  assert.ok(Math.hypot(data[(10*width+13)*3+1]-128,data[(10*width+13)*3+2]-128)>20);
  for(let i=0;i<land.length;i++){
    assert.equal(data[i*3],before[i*3]);
    if(land[i]||marine[i]||i%width>=22)assert.deepEqual(data.subarray(i*3,i*3+3),before.subarray(i*3,i*3+3));
  }
});

test("shared wind stays normalized and water controls round-trip without private lighting controls", () => {
  for (const angle of [-721, -45, 0, 24, 90, 360]) assert.ok(Math.abs(Math.hypot(...windVectorFromDegrees(angle)) - 1) < 1e-12);
  const tuning = normalizeWaterTuning({ oceanWeather: 0.72, oceanTimeScale: 0.8, oceanOpacity: 0.9 });
  assert.deepEqual(normalizeWaterTuning(readWaterTuningUrlOverrides(serializeWaterTuning(tuning))), tuning);
});

test("every served land cell has matching water-side and land-side distance signs", async () => {
  const terrain = JSON.parse(await fs.readFile(manifest.source, "utf8"));
  const fieldById = new Map(manifest.levels[0].tiles.map((tile) => [tile.id, tile]));
  const decoded = new Map();
  for (const tile of terrain.tiles) {
    const width = Math.round(tile.worldBounds.span[0] * manifest.dimensions[0]);
    const height = Math.round(tile.worldBounds.span[1] * manifest.dimensions[1]);
    const alpha = await sharp(`public${tile.sources.site.path}`).resize(width, height).ensureAlpha().extractChannel(3).raw().toBuffer();
    const x0 = Math.round(tile.worldBounds.origin[0] * manifest.dimensions[0]);
    const y0 = Math.round(tile.worldBounds.origin[1] * manifest.dimensions[1]);
    for (let y = 0; y < height; y += 3) for (let x = 0; x < width; x += 3) {
      const gx = x0 + x, gy = y0 + y;
      const id = `0/${Math.floor(gx / manifest.tileSize)}-${Math.floor(gy / manifest.tileSize)}`;
      const field = fieldById.get(id);
      let distance = 255;
      if (field) {
        if (!decoded.has(id)) decoded.set(id, await sharp(`public${field.path}`).raw().toBuffer());
        distance = decoded.get(id)[((gy % manifest.tileSize) * field.dimensions[0] + gx % manifest.tileSize) * 3];
      }
      assert.equal(distance < 128, alpha[y * width + x] >= 128, `${tile.id} at ${x},${y}`);
    }
  }
});

test("water state is bounded, finite and does not mutate caller input", () => {
  const input = Object.freeze({ weather: 7, timeScale: -2, opacity: NaN });
  const state = normalizeWaterState(input);
  assert.ok(state.weather >= 0 && state.weather <= 1);
  assert.ok(state.timeScale >= 0 && state.timeScale <= 3);
  assert.ok(state.opacity >= 0 && state.opacity <= 1);
  assert.ok(Object.values(state).every(Number.isFinite));
  assert.equal(input.weather, 7);
  assert.ok(Object.isFrozen(state));
});

test("longer deep-water waves travel faster but have longer periods", () => {
  const short = 4, long = 16;
  const a = waveAngularFrequency(short), b = waveAngularFrequency(long);
  assert.ok(a > b);
  assert.ok(b * long > a * short);
  assert.ok(waveAngularFrequency(long, 0.5) < b);
});

test("shore distance is symmetric and increases away from independently supplied land", () => {
  const width = 17, height = 17, land = new Uint8Array(width * height);
  land[8 * width + 8] = 1;
  const before = land.slice(), distances = distanceTransform(land, width, height, 1);
  for (let offset = 1; offset < 8; offset++) {
    assert.equal(distances[8 * width + 8 - offset], distances[8 * width + 8 + offset]);
    assert.ok(distances[8 * width + 8 + offset] > distances[8 * width + 7 + offset]);
  }
  assert.deepEqual(land, before);
});

test("closed pools have no invented outlet and connected channels flow toward broad sea", () => {
  const width = 64, height = 40, land = new Uint8Array(width * height).fill(1);
  for (let y = 0; y < height; y++) for (let x = 0; x < 14; x++) land[y * width + x] = 0;
  for (let y = 18; y <= 20; y++) for (let x = 14; x < 49; x++) land[y * width + x] = 0;
  for (let y = 4; y < 11; y++) for (let x = 35; x < 43; x++) land[y * width + x] = 0;
  const before = land.slice();
  const { data } = encodeWaterField(land, width, height, 1, 24);
  const vector = (x, y) => [data[(y * width + x) * 3 + 1], data[(y * width + x) * 3 + 2]].map((v) => v / 255 * 2 - 1);
  const pool = vector(39, 7), stream = vector(40, 19);
  assert.ok(Math.hypot(...pool) > 0.1 && Math.hypot(...pool) < 0.3);
  assert.ok(stream[0] < -0.4 && Math.abs(stream[1]) < 0.05);
  assert.deepEqual(land, before);
});

test("rocky sea-connected inlets retain marine water rather than acquiring a river direction", () => {
  for (const inletWidth of [9, 12]) {
    const width=96,height=64,land=new Uint8Array(width*height).fill(1);
    for(let y=0;y<height;y++)for(let x=0;x<16;x++)land[y*width+x]=0;
    for(let y=24;y<24+inletWidth;y++)for(let x=16;x<=74;x++)land[y*width+x]=0;
    // Rock stacks interrupt the local width without changing the inlet's outlet.
    land[26*width+35]=1; land[27*width+56]=1;
    const before=land.slice(),{data}=encodeWaterField(land,width,height,1,24);
    for(const x of [30,47,67]) {
      const i=((24+Math.floor(inletWidth/2))*width+x)*3;
      const flow=[data[i+1],data[i+2]].map(v=>v/255*2-1);
      assert.ok(Math.hypot(...flow)<0.05,`inlet at ${x}m was assigned a river direction`);
    }
    assert.deepEqual(land,before);
  }
});

test("explicit inland flow survives the inlet heuristic while retaining the broad-sea handoff",()=>{
  const width=96,height=64,land=new Uint8Array(width*height).fill(1);
  for(let y=0;y<height;y++)for(let x=0;x<16;x++)land[y*width+x]=0;
  for(let y=24;y<34;y++)for(let x=16;x<75;x++)land[y*width+x]=0;
  const data=encodeWaterField(land,width,height,1,24).data;
  const handoff=marineFlowMarkers(encodeWaterField(land,width,height,1,24,8).data);
  const before=Buffer.from(data);
  applyFlowFeature(data,land,width,height,[[72,29],[1,29]],2,0.6);
  restoreMarineFlow(data,handoff);
  const flowAt=x=>Math.hypot(data[(29*width+x)*3+1]/255*2-1,data[(29*width+x)*3+2]/255*2-1);
  assert.ok(flowAt(54)>0.4,'mapped inland channel lost its flow');
  assert.ok(flowAt(4)<0.05,'inland annotation covered broad open sea');
  for(let i=0;i<land.length;i++)assert.equal(data[i*3],before[i*3]);
});

test("flow annotations change motion only inside water and preserve every shoreline-distance value", () => {
  const width = 12, height = 12, land = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) land[y * width + 6] = 1;
  const data = Buffer.alloc(width * height * 3, 128), before = Buffer.from(data), mask = land.slice();
  const changed = applyFlowFeature(data, land, width, height, [[1, 6], [10, 6]], 2, 1);
  assert.ok(changed > 0);
  for (let i = 0; i < land.length; i++) {
    assert.equal(data[i * 3], before[i * 3]);
    if (land[i]) assert.deepEqual(data.subarray(i * 3, i * 3 + 3), before.subarray(i * 3, i * 3 + 3));
  }
  assert.deepEqual(land, mask);
});

test("field selection is bounded and always requests coarser coverage before detail", () => {
  for (const viewport of [[360, 202], [1448, 815], [3840, 2160]]) {
    for (const span of [1, 0.4, 0.17, 0.04]) {
      const selection = selectWaterFields(manifest.levels, { origin: [0.18, 0.12], span: [span, span] }, viewport);
      assert.ok(selection.tiles.length <= 56);
      const levels = selection.tiles.map((tile) => Number(tile.id.split("/")[0]));
      assert.ok(levels.every((level, i) => i === 0 || level <= levels[i - 1]));
      assert.equal(new Set(selection.tiles.map((tile) => tile.id)).size, selection.tiles.length);
    }
  }
});

test("water fields identify current served land bytes and have complete derived outputs", async () => {
  assert.equal(sha(await fs.readFile(manifest.source)), manifest.sourceHash);
  for (const source of manifest.sourceAssets) assert.equal(sha(await fs.readFile(source.path)), source.sha256, source.path);
  for (let i = 1; i < manifest.levels.length; i++) {
    assert.deepEqual(manifest.levels[i].dimensions, manifest.levels[i - 1].dimensions.map((n) => Math.ceil(n / 2)));
  }
  for (const level of manifest.levels) {
    for (const tile of level.tiles) {
      const bytes = await fs.readFile(`public${tile.path}`);
      assert.equal(sha(bytes), tile.sha256, tile.path);
      const image = await sharp(bytes).metadata();
      assert.deepEqual([image.width, image.height], tile.dimensions);
      assert.equal(image.channels, 3, "field channels must not acquire alpha premultiplication");
      assert.ok(tile.origin.every((n) => n >= 0));
      assert.ok(tile.span.every((n, axis) => n > 0 && n + tile.origin[axis] <= 1 + 1e-10));
    }
  }
  assert.ok(manifest.features.every((feature) => feature.waterPixels > 0));
});

function rendererHarness(t, options = {}) {
  const pending = [], uniforms = new Map(), allocated = new Set();
  let sequence = 0;
  let renderer = null;
  const original = { window: globalThis.window, Image: globalThis.Image };
  globalThis.window = { devicePixelRatio: 1 };
  globalThis.Image = class {
    onload = null; onerror = null; decoding = "";
    set src(value) { this.path = value; if (value) pending.push(this); }
  };
  const resource = (kind, details = {}) => {
    if (options.failAllocation === kind) return null;
    const item = { id: ++sequence, kind, ...details }; allocated.add(item); return item;
  };
  const gl = new Proxy({
    VERTEX_SHADER: 0x8b31, FRAGMENT_SHADER: 0x8b30,
    createShader: (type) => resource("shader", { stage: type === 0x8b30 ? "fragment" : "vertex" }),
    createProgram: () => resource("program"), createVertexArray: () => resource("vertexArray"),
    createTexture: () => resource("texture"), createFramebuffer: () => resource("framebuffer"),
    deleteFramebuffer: (x) => allocated.delete(x),
    getExtension: (name) => name === "EXT_color_buffer_float" && options.spectral ? {} : null,
    checkFramebufferStatus: () => options.incomplete ? 0 : 1,
    deleteShader: (x) => allocated.delete(x), deleteProgram: (x) => allocated.delete(x),
    deleteVertexArray: (x) => allocated.delete(x), deleteTexture: (x) => allocated.delete(x),
    getShaderParameter: (shader) => shader.stage !== options.failCompile, getProgramParameter: () => true,
    getUniformLocation: (_program, name) => name,
    uniform1i: (key, ...value) => uniforms.set(key, value), uniform1f: (key, ...value) => uniforms.set(key, value),
    uniform2f: (key, ...value) => uniforms.set(key, value), uniform3f: (key, ...value) => uniforms.set(key, value),
    uniform4f: (key, ...value) => uniforms.set(key, value), isContextLost: () => false,
  }, { get: (target, key) => key in target ? target[key] : typeof key === "string" && key === key.toUpperCase() ? 1 : () => undefined });
  const canvas = { dataset: {}, getContext: () => gl, getBoundingClientRect: () => ({ width: 1448, height: 815 }) };
  const scene = { camera: { origin: [0.18, 0.12], span: [0.17, 0.17] },
    light: { id: "fixture", direction: [-0.2, -0.3, 0.1], color: "#ffffff", ambientColor: "#101820", intensity: 0.35 },
    state: normalizeWaterState(), oceanVisible: true, inlandVisible: true, coastalEffects: true, inlandEffects: true, debug: false };
  const construct = () => {
    renderer = new WaterRenderer(canvas, scene, () => undefined, options.detailCanvas);
    return renderer;
  };
  t.after(() => { renderer?.destroy(); globalThis.window = original.window; globalThis.Image = original.Image; });
  if (!options.deferConstruction) construct();
  return { renderer, construct, scene, canvas, uniforms, allocated, pending };
}

test("fragment compilation failure releases every constructed GPU resource", (t) => {
  const { construct, allocated } = rendererHarness(t, { deferConstruction: true, failCompile: "fragment" });
  assert.throws(construct);
  assert.equal(allocated.size, 0);
});

test("inland bed visibility is independent of ocean seabed and inland motion/effects",t=>{
  const {renderer,scene,uniforms}=rendererHarness(t);
  renderer.setScene({...scene,inlandBedVisible:false,seabedVisible:true});renderer.render(2,2);
  assert.deepEqual(uniforms.get("uInlandBed"),[0]);
  assert.deepEqual(uniforms.get("uInlandEffects"),[1]);
  renderer.setScene({...scene,inlandBedVisible:true,seabedVisible:false});renderer.render(2,2);
  assert.deepEqual(uniforms.get("uInlandBed"),[1]);
});

test("inland spray is independent of ocean visibility, obeys effects/camera, and releases its resources", t=>{
  const {canvas,scene,allocated,uniforms}=rendererHarness(t);
  const gl=canvas.getContext("webgl2");
  gl.drawingBufferWidth=1448;
  const before=allocated.size;
  const spray=new InlandSprayRenderer(gl,()=>undefined);
  t.after(()=>spray.destroy());
  const fall=manifest.features.find(feature=>feature.kind==="fall");
  const endpoint=fall.points.at(-1);
  const visible={...scene,oceanVisible:false,camera:{origin:endpoint.map(n=>n-0.025),span:[0.05,0.05]}};
  assert.ok(spray.render(visible,7)>0);
  assert.deepEqual(uniforms.get("uTime"),[7]);
  assert.equal(spray.render({...visible,inlandEffects:false},9),0);
  assert.equal(spray.render({...visible,inlandVisible:false},9),0);
  assert.equal(spray.render({...visible,camera:{origin:[0,0],span:[0.01,0.01]}},9),0);
  spray.destroy();spray.destroy();
  assert.equal(allocated.size,before);
});

test("gorge geometry waits for its backing source and cleans up after that source loads",t=>{
  const {canvas,scene,allocated,pending}=rendererHarness(t);
  const gl=canvas.getContext("webgl2");gl.drawingBufferWidth=1448;
  const before=allocated.size;
  const spray=new InlandSprayRenderer(gl,()=>undefined);
  t.after(()=>spray.destroy());
  const camera={origin:GORGE_FALL.foot.map(n=>n-0.025),span:[0.05,0.05]};
  const view={...scene,camera};
  const unloadedDraws=spray.render(view,3);
  assert.equal(spray.gorgeState,"loading");
  pending.find(image=>image.path===GORGE_FALL.cliffPath).onload();
  assert.equal(spray.gorgeState,"ready");
  assert.ok(spray.render(view,3)>unloadedDraws);
  spray.destroy();
  assert.equal(allocated.size,before);
});

test("island fall renderer loads one shared atlas, culls remote views and releases its allocations",t=>{
  const {canvas,scene,allocated,pending}=rendererHarness(t);
  const gl=canvas.getContext("webgl2");gl.drawingBufferWidth=1448;
  const before=allocated.size,renderer=new MappedFallsRenderer(gl,()=>undefined);
  t.after(()=>renderer.destroy());
  const fall=mappedAtlas.falls[0];
  const view={...scene,camera:{origin:fall.foot.map(n=>n-0.02),span:[0.04,0.04]}};
  assert.equal(renderer.render(view,3),0);
  pending.find(image=>image.path===mappedAtlas.texture.path).onload();
  assert.equal(renderer.state,"ready");assert.ok(renderer.render(view,3)>0);
  assert.equal(renderer.render({...view,inlandVisible:false},3),0);
  assert.equal(renderer.render({...view,camera:{origin:[0,0],span:[.01,.01]}},3),0);
  renderer.destroy();renderer.destroy();assert.equal(allocated.size,before);
});

test("ocean detail compositing is independent of the seabed toggle and restores the base pass", (t) => {
  const copies = [], clears = [];
  const detailCanvas = { width: 0, height: 0, dataset: {}, getContext: () => ({
    clearRect: (...args) => clears.push(args), drawImage: (source) => copies.push(source),
  }) };
  const { renderer, scene, pending, uniforms, canvas } = rendererHarness(t, { detailCanvas });
  for (let i = 0; i < pending.length; i++) pending[i].onload?.();
  renderer.setScene({ ...scene, seabedVisible: false, oceanDetailsVisible: true });
  renderer.render(4, 4);
  assert.ok(copies.includes(canvas));
  assert.deepEqual(uniforms.get("uBedShown"), [0]);
  assert.deepEqual(uniforms.get("uOceanDetailsEnabled"), [1]);
  assert.deepEqual(uniforms.get("uDetailPass"), [0]);
  const before = copies.length, clearBefore = clears.length;
  renderer.setScene({ ...scene, seabedVisible: true, oceanDetailsVisible: false });
  renderer.render(4, 4);
  assert.ok(copies.length > before, "coast and life still use the overlay with reefs off");
  assert.ok(clears.length > clearBefore);
  assert.deepEqual(uniforms.get("uBedShown"), [1]);
  assert.deepEqual(uniforms.get("uOceanDetailsEnabled"), [0]);
  assert.deepEqual(uniforms.get("uAquaticLife"), [1]);
  renderer.setScene({ ...scene, seabedVisible: false, oceanDetailsVisible: false, coastalEffects: false });
  renderer.render(4, 4);
  assert.deepEqual(uniforms.get("uSeabedEnabled"), [1], "life retains depth when floor artwork is hidden");
  assert.deepEqual(uniforms.get("uBedShown"), [0]);
  const withCoastAndLife=copies.length;
  renderer.setScene({ ...scene, oceanDetailsVisible: false, aquaticLifeVisible: false, coastalEffects: false });
  renderer.render(4, 4);
  assert.equal(copies.length, withCoastAndLife, "disabled contributors leave no overlay copy");
  assert.deepEqual(uniforms.get("uAquaticLife"), [0]);
  assert.deepEqual(uniforms.get("uDetailPass"), [0]);
});

test("seabed geography is derived, hash-verified, and separates marine from dry coverage", async () => {
  const geography = manifest.seabedGeometry;
  const bytes = await fs.readFile(`public${geography.path}`);
  assert.equal(sha(bytes), geography.sha256);
  const meta = await sharp(bytes).metadata();
  assert.deepEqual([meta.width, meta.height], geography.dimensions);
  assert.equal(meta.channels, 3);
  const data = await sharp(bytes).raw().toBuffer();
  let marine = 0, dry = 0, shallow = 0, deep = 0;
  for (let i = 0; i < data.length; i += 3) {
    if (data[i + 1] === 255) { marine++; if (data[i] < 30) shallow++; if (data[i] > 150) deep++; }
    else if (data[i] === 0) dry++;
  }
  assert.ok(marine > 0 && dry > 0 && shallow > 0 && deep > 0);
});

test("renderer allocation failure releases every previously constructed GPU resource", (t) => {
  const { construct, allocated } = rendererHarness(t, { deferConstruction: true, failAllocation: "texture" });
  assert.throws(construct);
  assert.equal(allocated.size, 0);
});

test("field pages choose the finest available ancestor regardless of input order", () => {
  const coarse = { tile: { id: "2/root", origin: [0, 0], span: [1, 1] }, slot: 4 };
  const fine = { tile: { id: "0/detail", origin: [0.25, 0.5], span: [0.25, 0.25] }, slot: 9 };
  const page = buildFieldPages([fine, coarse], 0, 4, 4);
  assert.deepEqual([...page.subarray((2 * 4 + 1) * 4, (2 * 4 + 1) * 4 + 2)], [fine.slot + 1, 0]);
  assert.equal(page[0], coarse.slot + 1);
  const coarser = buildFieldPages([fine, coarse], 1, 4, 4);
  assert.equal(coarser[(2 * 4 + 1) * 4], coarse.slot + 1);
  assert.ok(buildFieldPages([], 0, 4, 4).every((n) => n === 0));
});

test("provisional tile cuts suppress ocean surf without moving banks or marking a natural coast", () => {
  const w = 40, h = 32, land = new Uint8Array(w * h);
  for (let y = 8; y < 24; y++) for (let x = 12; x < 23; x++) land[y * w + x] = 1;
  const { data } = encodeWaterField(land, w, h, 1, 8), before = Buffer.from(data), mask = land.slice();
  const count = markProvisionalCoast(data, land, w, h, [{ x: 12, y: 4, w: 18, h: 24 }], 8);
  assert.ok(count > 0);
  assert.ok(data[(16 * w + 10) * 3 + 1] < 128, "clipped west edge has no surf");
  assert.equal(data[(16 * w + 25) * 3 + 1], before[(16 * w + 25) * 3 + 1], "authored east bank retains surf");
  for (let i = 0; i < land.length; i++) assert.equal(data[i * 3], before[i * 3]);
  assert.deepEqual(land, mask);
});

test("spectra have finite unit expected variance, no DC drift, and continuous weather energy", () => {
  const n = 64;
  for (const band of WAVE_CASCADES) {
    const seed = createWaveSpectrum(n, band, 0.4);
    assert.ok(seed.every(Number.isFinite));
    assert.equal(seed[0], 0); assert.equal(seed[1], 0);
    let energy = 0;
    for (let i = 0; i < seed.length; i += 4) energy += seed[i] ** 2 + seed[i + 1] ** 2;
    assert.ok(Math.abs(2 * energy / n ** 4 - 1) < 1e-6);
    assert.deepEqual(createWaveSpectrum(n, band, 0.4), seed);
  }
  const calm = waveHeights(0), heavy = waveHeights(1);
  assert.ok(heavy.every((height, i) => height > calm[i]));
  const left = waveHeights(0.5), right = waveHeights(0.5001);
  assert.ok(right.every((height, i) => Math.abs(height - left[i]) < 0.001));
});

test("spectral resources are released and paused weather changes discard old storm foam", (t) => {
  const { renderer, scene, canvas, uniforms, allocated } = rendererHarness(t, { spectral: true });
  renderer.render(3, 3);
  assert.match(canvas.dataset.waveModel, /^spectral/);
  renderer.render(4, 4);
  assert.deepEqual(uniforms.get("uHistory"), [1]);
  renderer.setScene({ ...scene, state: normalizeWaterState({ weather: 0 }) });
  renderer.render(4, 4);
  assert.deepEqual(uniforms.get("uHistory"), [0]);
  renderer.destroy(); assert.equal(allocated.size, 0);
});

test("an incomplete float target falls back to analytical waves and frees its partial allocations", (t) => {
  const { renderer, canvas, allocated, uniforms } = rendererHarness(t, { spectral: true, incomplete: true });
  renderer.render(3, 3);
  assert.equal(canvas.dataset.waveModel, "analytic");
  assert.match(canvas.dataset.waveError, /incomplete/i);
  assert.deepEqual(uniforms.get("uSwell"), uniforms.get("uPages"));
  renderer.destroy(); assert.equal(allocated.size, 0);
});

test("renderer consumes the complete external light direction and keeps supplied phase across camera changes", (t) => {
  const { renderer, scene, uniforms } = rendererHarness(t);
  renderer.render(3.25, 4.5);
  const expected = scene.light.direction.map((n) => n / Math.hypot(...scene.light.direction));
  assert.deepEqual(uniforms.get("uLightDirection"), expected);
  assert.deepEqual(uniforms.get("uLightIntensity"), [scene.light.intensity]);
  renderer.setScene({ ...scene, camera: { origin: [0.2, 0.2], span: [0.1, 0.1] }, light: { ...scene.light, intensity: 0 } });
  renderer.render(3.25, 4.5);
  assert.deepEqual(uniforms.get("uTime"), [3.25, 4.5]);
  assert.deepEqual(uniforms.get("uLightIntensity"), [0]);
});

test("stale image completion cannot allocate a field and teardown releases GPU resources", (t) => {
  const { renderer, scene, pending, allocated, canvas } = rendererHarness(t);
  const cancelledImage = pending.find((image) => image.path.includes("/fields-r1/") && !image.path.includes("/L5/") && image.onload);
  assert.ok(cancelledImage);
  const late = cancelledImage.onload;
  renderer.setScene({ ...scene, camera: { origin: [0.8, 0.8], span: [0.1, 0.1] } });
  const before = allocated.size;
  late();
  assert.equal(allocated.size, before);
  for (let i = 0; i < pending.length; i++) pending[i].onload?.();
  renderer.render(0, 0);
  assert.ok(Number(canvas.dataset.fieldResident) <= 64);
  renderer.destroy();
  assert.equal(allocated.size, 0);
});
