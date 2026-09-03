// The rock-only strong-edge moment (the gate's measure) localised per 320px block.
import sharp from "sharp"; sharp.cache(false);
const GEN = 2560, NB = 8, BS = GEN / NB; const [file, label] = process.argv.slice(2);
const meta = await sharp(file).metadata(); let img = sharp(file); if (meta.width !== GEN) img = img.resize(GEN, GEN, { kernel: "lanczos3" });
const d = await img.ensureAlpha().raw().toBuffer();
const L = new Float32Array(GEN * GEN), rock = new Uint8Array(GEN * GEN);
for (let i = 0; i < GEN * GEN; i++) { const r = d[i*4], g = d[i*4+1], b = d[i*4+2], a = d[i*4+3]; L[i] = 0.299*r + 0.587*g + 0.114*b; if (a <= 250) continue;
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b); const s = mx ? (mx-mn)/mx : 0; let h = 0; if (mx !== mn) { if (mx === r) h = 60*(((g-b)/(mx-mn))%6); else if (mx === g) h = 60*((b-r)/(mx-mn)+2); else h = 60*((r-g)/(mx-mn)+4); if (h < 0) h += 360; }
  const veg = h >= 45 && h <= 140 && s >= 0.22, water = h >= 150 && h <= 215 && s >= 0.2; rock[i] = (!veg && !water) ? 1 : 0; }
const mx = new Float64Array(NB*NB), my = new Float64Array(NB*NB), mm = new Float64Array(NB*NB), n = new Int32Array(NB*NB); let gx0 = 0, gy0 = 0, gm0 = 0, n0 = 0;
for (let y = 1; y < GEN-1; y++) for (let x = 1; x < GEN-1; x++) { const i = y*GEN+x; if (!rock[i] || d[i*4+3] <= 250) continue; const gx = L[i+1]-L[i-1], gy = L[i+GEN]-L[i-GEN]; const m = Math.hypot(gx, gy); if (m < 80) continue;
  const b = Math.floor(y/BS)*NB + Math.floor(x/BS); mx[b] += gx; my[b] += gy; mm[b] += m; n[b]++; gx0 += gx; gy0 += gy; gm0 += m; n0++; }
const deg = (x, y) => ((Math.atan2(y, x)*180/Math.PI)+360)%360;
console.log(`${label ?? file}: rock-only moment ${(Math.hypot(gx0,gy0)/gm0).toFixed(3)} toward ${deg(gx0,gy0).toFixed(0)} deg on ${n0} strong rock edges`);
console.log("per 320px block: moment x1000 @ direction (n) — rows top->bottom; the bottom rows are the sound");
for (let r = 0; r < NB; r++) console.log("  " + Array.from({length: NB}, (_, c) => { const b = r*NB+c; const m = mm[b] ? Math.hypot(mx[b], my[b])/mm[b] : 0; return `${(1000*m).toFixed(0).padStart(3)}@${deg(mx[b],my[b]).toFixed(0).padStart(3)}(${String(n[b]).padStart(5)})`; }).join(" "));
