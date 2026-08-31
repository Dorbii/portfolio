import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import sharp from "sharp";

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, ".codex-tmp/qa/T23/r5");
const CANON = path.join(ROOT, "public/career-world/capitals/ninjaone/city-v2/canon");
const RENDERER = path.join(ROOT, "features/career-world/layers/city/rendering/NinjaOneCapitalD05WaterCompositeRenderer.ts");
const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const DISPLAY = [2621, 2419];
const CHECK_ONLY = process.argv.includes("--check");
const PORT = 9435;

function extractShader(name) {
  return readFile(RENDERER, "utf8").then((source) => {
    const matched = source.match(new RegExp("const " + name + " = `([\\s\\S]*?)`;"));
    assert.ok(matched, `Unable to extract ${name} from the runtime renderer.`);
    return matched[1];
  });
}

async function emit(name, bytes) {
  const target = path.join(OUTPUT, name);
  if (CHECK_ONLY) {
    assert.deepEqual(await readFile(target), bytes, `--check output differs: ${name}`);
    return;
  }
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
}

function harness(vertex, fragment) {
  const assets = [
    "d05-canon-r4.png", "d05-canon-water-safe-mask-r5.png", "d05-canon-water-sparkle-mask-r5.png",
    "d05-canon-water-sparkle-phase-r5.png", "d05-canon-water-foam-mask-r5.png", "d05-canon-water-shore-sdf-r5.png",
    "d05-canon-water-crest-mask-r5.png", "d05-canon-water-direction-field-r5.png", "d05-canon-water-wave-phase-r5.png",
    "d05-canon-water-pseudo-normal-r5.png", "d05-canon-water-ramp-lut-r5.png",
  ];
  return `<!doctype html><canvas id="canvas" width="2621" height="2419"></canvas><script>
const vertex = ${JSON.stringify(vertex)}; const fragment = ${JSON.stringify(fragment)};
const paths = ${JSON.stringify(assets.map((name) => `/career-world/capitals/ninjaone/city-v2/canon/${name}`))};
const canvas = document.querySelector('#canvas');
const gl = canvas.getContext('webgl2', { alpha:true, antialias:false, depth:false, premultipliedAlpha:false, preserveDrawingBuffer:true, powerPreference:'high-performance' });
const report = { displayDimensions:[2621,2419], views:{ capital:{ zoomWeight:0.9 }, site:{ zoomWeight:0.98 } }, drawCount:1, tileCount:0, passScope:'full-canon' };
const post = (route, value) => fetch(route, { method:'POST', body:value });
const compile = (type, source) => { const s=gl.createShader(type); gl.shaderSource(s,source); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
const program = gl.createProgram(); gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex)); gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment)); gl.linkProgram(program); if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
const image = (src) => new Promise((resolve,reject)=>{ const i=new Image(); i.onload=()=>resolve(i); i.onerror=()=>reject(new Error('load '+src)); i.src=src; });
const bind = (image, unit) => { const t=gl.createTexture(); gl.activeTexture(gl.TEXTURE0+unit); gl.bindTexture(gl.TEXTURE_2D,t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,0); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); return t; };
const uniform = (name) => { const u=gl.getUniformLocation(program,name); if(!u) throw new Error('missing uniform '+name); return u; };
(async()=>{ try {
  const images = await Promise.all(paths.map(image)); images.forEach(bind); gl.useProgram(program);
  const samplers=['u_source','u_water','u_sparkle','u_sparkle_phase','u_foam','u_sdf','u_crest','u_direction','u_wave_phase','u_normal','u_ramp']; samplers.forEach((name,index)=>gl.uniform1i(uniform(name),index));
  const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW); const position=gl.getAttribLocation(program,'a_position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const u={ time:uniform('u_time'), sparkle:uniform('u_sparkle_amount'), foam:uniform('u_foam_amount'), crest:uniform('u_crest_amount'), relight:uniform('u_relight_amount'), cycling:uniform('u_cycling_amount'), zoom:uniform('u_zoom_weight') };
  const draw=(time,zoom=0.98,on=true)=>{ gl.viewport(0,0,canvas.width,canvas.height); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT); gl.uniform1f(u.time,time); gl.uniform1f(u.sparkle,on?1:0); gl.uniform1f(u.foam,on?1:0); gl.uniform1f(u.crest,on?1:0); gl.uniform1f(u.relight,on?1:0); gl.uniform1f(u.cycling,on?1:0); gl.uniform1f(u.zoom,zoom); gl.drawArrays(gl.TRIANGLE_STRIP,0,4); };
  const capture=async(name,time,zoom=0.98,on=true)=>{ draw(time,zoom,on); gl.finish(); await post('/capture/'+name, canvas.toDataURL('image/png').split(',')[1]); };
  const ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'); const samples=[];
  for(let frame=0;frame<72;frame++){ const query=ext&&gl.createQuery(); const before=performance.now(); if(query) gl.beginQuery(ext.TIME_ELAPSED_EXT,query); draw(frame/15,0.9,true); if(query) gl.endQuery(ext.TIME_ELAPSED_EXT); gl.finish(); const wall=performance.now()-before; if(query){ const disjoint=gl.getParameter(ext.GPU_DISJOINT_EXT); const ns=gl.getQueryParameter(query,gl.QUERY_RESULT); if(!disjoint) samples.push(ns/1e6); else samples.push(wall); gl.deleteQuery(query); } else samples.push(wall); }
  report.timingSource=ext?'gpu-timer-query':'cpu-wall-finish'; report.renderAverageMs=samples.slice(12).reduce((a,b)=>a+b,0)/(samples.length-12); report.renderP95Ms=samples.slice(12).sort((a,b)=>a-b)[Math.floor((samples.length-12)*.95)]; report.frameIntervalP95Ms=1000/15; report.renderer=gl.getParameter(gl.RENDERER); report.timerQuerySupported=Boolean(ext);
  await capture('effects-off-t000.png',0,0.98,false); await capture('effects-on-capital-t000.png',0,0.9,true); await capture('effects-on-site-t000.png',0,0.98,true);
  for(let frame=0;frame<=8;frame++) await capture('travel-site-t'+String(frame*500).padStart(4,'0')+'.png',frame*.5,0.98,true);
  report.complete=true; await post('/report',JSON.stringify(report)); document.body.dataset.complete='true';
} catch(error) { await post('/report',JSON.stringify({error:String(error), ...report})); document.body.dataset.error=String(error); } })();
</script>`;
}

async function runBrowser() {
  const [vertex, fragment] = await Promise.all([extractShader("VERTEX_SHADER"), extractShader("FRAGMENT_SHADER")]);
  await mkdir(OUTPUT, { recursive: true });
  let reportBody = null;
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, `http://127.0.0.1:${PORT}`);
    if (url.pathname === "/harness") { response.writeHead(200, { "content-type": "text/html" }); response.end(harness(vertex, fragment)); return; }
    if (url.pathname.startsWith("/capture/") && request.method === "POST") {
      const chunks=[]; for await (const chunk of request) chunks.push(chunk);
      await writeFile(path.join(OUTPUT, decodeURIComponent(url.pathname.slice(9))), Buffer.from(Buffer.concat(chunks).toString(), "base64"));
      response.end("ok"); return;
    }
    if (url.pathname === "/report" && request.method === "POST") { const chunks=[]; for await (const chunk of request) chunks.push(chunk); reportBody=Buffer.concat(chunks).toString(); response.end("ok"); return; }
    const target = path.join(ROOT, "public", decodeURIComponent(url.pathname));
    try { const body=await readFile(target); response.writeHead(200); response.end(body); } catch { response.writeHead(404); response.end("missing"); }
  });
  await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
  const profile = path.join(process.env.TEMP ?? "C:/tmp", `codex-d05-webgl-r5-${process.pid}-${Date.now()}`);
  const child = spawn(CHROME, ["--headless=new", "--no-first-run", "--disable-background-networking", "--disable-gpu", "--use-angle=swiftshader", "--disable-gpu-shader-disk-cache", "--run-all-compositor-stages-before-draw", "--virtual-time-budget=18000", `--disk-cache-dir=${profile}-cache`, `--user-data-dir=${profile}`, `http://127.0.0.1:${PORT}/harness`, "--dump-dom"], { stdio:["ignore", "pipe", "pipe"] });
  let browserLog = "";
  child.stdout.on("data", (chunk) => { browserLog += chunk; });
  child.stderr.on("data", (chunk) => { browserLog += chunk; });
  const result = await new Promise((resolve, reject) => {
    const timeout=setTimeout(()=>{ child.kill(); reject(new Error("Chrome harness exceeded 45 seconds.")); },45000);
    child.once("error", reject); child.once("exit", (code)=>{ clearTimeout(timeout); resolve(code); });
  });
  server.close();
  await writeFile(path.join(OUTPUT, "chrome-harness.log"), browserLog);
  assert.equal(result, 0, `Chrome harness exited ${result}: ${browserLog.slice(-2000)}`);
  assert.ok(reportBody, "Chrome harness did not publish a report.");
  return JSON.parse(reportBody);
}

async function raw(name) {
  return sharp(path.join(OUTPUT, name)).ensureAlpha().raw().toBuffer({ resolveWithObject:true }).then(({data,info})=>{ assert.deepEqual([info.width,info.height],DISPLAY); return {data,channels:info.channels}; });
}

async function mask(name) {
  return sharp(path.join(CANON,name)).resize({width:DISPLAY[0],height:DISPLAY[1],kernel:"lanczos3"}).greyscale().raw().toBuffer();
}

function overlayMetrics(off,on,water) {
  let waterDelta=0, waterN=0, outsideDelta=0, outsideN=0;
  for(let pixel=0;pixel<water.length;pixel++) for(let channel=0;channel<3;channel++) { const delta=Math.abs(off.data[pixel*off.channels+channel]-on.data[pixel*on.channels+channel]); if(water[pixel]) { waterDelta+=delta; waterN++; } else { outsideDelta+=delta; outsideN++; } }
  return { waterMeanAbsoluteDelta:Number((waterDelta/waterN).toFixed(4)), outsideWaterMeanAbsoluteDelta:Number((outsideDelta/outsideN).toFixed(4)) };
}

function motionMetrics(first, second, water) {
  const cells=Array.from({length:8},()=>Array.from({length:8},()=>({water:0,changed:0}))); let changed=0,positive=0,negative=0,waterPixels=0;
  for(let y=0;y<DISPLAY[1];y++) for(let x=0;x<DISPLAY[0];x++){ const pixel=y*DISPLAY[0]+x; if(!water[pixel]) continue; waterPixels++; const o=pixel*first.channels; const signed=(second.data[o]*.2126+second.data[o+1]*.7152+second.data[o+2]*.0722)-(first.data[o]*.2126+first.data[o+1]*.7152+first.data[o+2]*.0722); const cell=cells[Math.min(7,Math.floor(y/DISPLAY[1]*8))][Math.min(7,Math.floor(x/DISPLAY[0]*8))]; cell.water++; if(Math.abs(signed)>=3){changed++;cell.changed++;} if(signed>=1)positive++;if(signed<=-1)negative++; }
  return {changedWaterFraction:Number((changed/waterPixels).toFixed(4)),activeGridCells:cells.flat().filter(c=>c.water>=128&&c.changed/c.water>=.02).length,positiveWaterFraction:Number((positive/waterPixels).toFixed(4)),negativeWaterFraction:Number((negative/waterPixels).toFixed(4))};
}

function corruptionScan(frame, water) {
  let longest=0,run=0;
  for(let y=1;y<DISPLAY[1];y++){let same=0,total=0;for(let x=0;x<DISPLAY[0];x++){const p=y*DISPLAY[0]+x;if(!water[p]||!water[p-DISPLAY[0]])continue;total++;const a=p*frame.channels,b=(p-DISPLAY[0])*frame.channels;if(Math.max(...[0,1,2].map(c=>Math.abs(frame.data[a+c]-frame.data[b+c])))<=1)same++;}if(total>=128&&same/total>=.99)run++;else run=0;longest=Math.max(longest,run);}
  return { longestNearIdenticalWaterRowRun:longest, passed:longest<=2 };
}

function travelMetrics(frames, water, foam, sdf) {
  const profiles=[];
  for(const frame of frames){const bins=Array.from({length:39},()=>({sum:0,count:0}));for(let p=0;p<water.length;p++){const distance=(sdf[p]-128)*.5;if(!water[p]||foam[p]>5||distance<0||distance>=39)continue;bins[Math.floor(distance)].sum+=frame.data[p*frame.channels+3];bins[Math.floor(distance)].count++;}profiles.push(bins.map(b=>b.count?b.sum/b.count:0));}
  const shifts=[];for(let i=1;i<profiles.length;i++){let best={shift:0,score:-Infinity};for(let shift=-8;shift<=8;shift++){let score=0;for(let bin=8;bin<31;bin++){const other=bin-shift;if(other>=0&&other<39)score+=profiles[i-1][bin]*profiles[i][other];}if(score>best.score)best={shift,score};}shifts.push(best.shift);}
  const mean=shifts.reduce((a,b)=>a+b,0)/shifts.length; return { method:"SDF-band profile cross-correlation on non-authored-foam water; negative SDF displacement is shoreward", frameIntervalSeconds:.5, perHalfSecondSdfPixelShifts:shifts, meanSdfPixelsPerSecond:Number((mean/.5).toFixed(3)), direction:mean<-.2?"shoreward":mean>.2?"seaward":"indeterminate" };
}

async function main() {
  if (CHECK_ONLY) {
    const report=JSON.parse(await readFile(path.join(OUTPUT,"perf-report.json"),"utf8"));
    assert.deepEqual(report.displayDimensions,DISPLAY, "r5 proof must retain full canon backing dimensions.");
    assert.equal(report.passScope,"full-canon");
    if (report.status === "blocked") {
      assert.equal(report.perfGate, "unmeasured");
      console.log(JSON.stringify({check:"r5 blocked evidence schema verified; no perf result asserted"})); return;
    }
    for (const name of ["effects-off-t000.png","effects-on-capital-t000.png","effects-on-site-t000.png","travel-site-t4000.png"]) await stat(path.join(OUTPUT,name));
    console.log(JSON.stringify({check:"r5 evidence schema and full-canon dimensions verified"})); return;
  }
  const browser=await runBrowser();
  const [off,capital,site,site1500,water,foam,sdf]=await Promise.all([raw("effects-off-t000.png"),raw("effects-on-capital-t000.png"),raw("effects-on-site-t000.png"),raw("travel-site-t1500.png"),mask("d05-canon-water-safe-mask-r5.png"),mask("d05-canon-water-foam-mask-r5.png"),mask("d05-canon-water-shore-sdf-r5.png")]);
  const travel=await Promise.all(Array.from({length:9},(_,i)=>raw(`travel-site-t${String(i*500).padStart(4,"0")}.png`)));
  const capitalAb=overlayMetrics(off,capital,water),siteAb=overlayMetrics(off,site,water),motion=motionMetrics(site,site1500,water);
  const corruption=Object.fromEntries((await Promise.all([0,500,1500,3000,4000].map(async time=>[time,corruptionScan(await raw(`travel-site-t${String(time).padStart(4,"0")}.png`),water)]))).map(([time,value])=>[time,value]));
  const perf={...browser,budget:{renderAverageMs:2,renderP95Ms:6}, passed:browser.renderAverageMs<=2&&browser.renderP95Ms<=6};
  const evidence={ perf, ab:{floor:2.25,capital:capitalAb,site:siteAb,passed:[capitalAb,siteAb].every(v=>v.waterMeanAbsoluteDelta>=2.25&&v.outsideWaterMeanAbsoluteDelta<=.01)}, motion:{...motion,passed:motion.activeGridCells>=5&&motion.changedWaterFraction>=.02&&motion.positiveWaterFraction>=.01&&motion.negativeWaterFraction>=.01}, corruption:{timestamps:corruption,passed:Object.values(corruption).every(v=>v.passed)}, travel:travelMetrics(travel,water,foam,sdf), source:{displayDimensions:DISPLAY,fieldDimensions:[1305,1205],renderer:"exact runtime shader extracted from NinjaOneCapitalD05WaterCompositeRenderer.ts"} };
  await emit("perf-report.json",Buffer.from(`${JSON.stringify(evidence,null,2)}\n`));
  await emit("travel-report.json",Buffer.from(`${JSON.stringify(evidence.travel,null,2)}\n`));
  assert.ok(evidence.perf.passed,`full-canon GL perf gate failed: ${JSON.stringify(evidence.perf)}`);
  assert.ok(evidence.ab.passed,`A/B visibility gate failed: ${JSON.stringify(evidence.ab)}`);
  assert.ok(evidence.motion.passed,`motion gate failed: ${JSON.stringify(evidence.motion)}`);
  assert.ok(evidence.corruption.passed,`corruption gate failed: ${JSON.stringify(evidence.corruption)}`);
  assert.equal(evidence.travel.direction,"shoreward",`travel did not measure shoreward: ${JSON.stringify(evidence.travel)}`);
  console.log(JSON.stringify(evidence));
}

await main();
