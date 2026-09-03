// One masked edit call to the Images API: outpaint a cell from its context window.
// No dependencies (Node 22 fetch + FormData). The key is read from the process
// environment and never printed. --dry-run sends nothing.
//   node probe-edit.mjs --image T.png --mask M.png --prompt-file P.md --out O.png [--size 2560x2560] [--quality high] [--model gpt-image-2] [--timeout 540] [--dry-run]
import fs from "node:fs"; import path from "node:path";
const opt = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith("--")) { const k = av[i].slice(2); opt[k] = (i + 1 < av.length && !av[i + 1].startsWith("--")) ? av[++i] : true; }
const need = k => { if (!opt[k]) { console.error(`--${k} is required`); process.exit(2); } return opt[k]; };
const image = need("image"), promptFile = need("prompt-file"), out = need("out"), mask = opt.mask;
const size = opt.size ?? "2560x2560", quality = opt.quality ?? "high", model = opt.model ?? "gpt-image-2";
const prompt = fs.readFileSync(promptFile, "utf8").trim();
const mb = f => (fs.statSync(f).size / 1e6).toFixed(1) + " MB";
console.log(`edit  model ${model}  size ${size}  quality ${quality}\n  image  ${image} (${mb(image)})\n  mask   ${mask ? `${mask} (${mb(mask)})` : "none"}\n  prompt ${prompt.length} chars from ${promptFile}\n  out    ${out}`);
if (opt["dry-run"]) { console.log("dry run: nothing sent"); process.exit(0); }
const key = process.env.OPENAI_API_KEY;
if (!key) { console.error("OPENAI_API_KEY is not set in this process environment; nothing sent."); process.exit(3); }
const form = new FormData();
form.append("model", model); form.append("prompt", prompt); form.append("size", size); form.append("quality", quality); form.append("n", "1");
form.append("image", new Blob([fs.readFileSync(image)], { type: "image/png" }), path.basename(image));
if (mask) form.append("mask", new Blob([fs.readFileSync(mask)], { type: "image/png" }), path.basename(mask));
const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), (Number(opt.timeout) || 540) * 1000);
const t0 = Date.now();
let res, text;
try {
  res = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form, signal: ctrl.signal });
  text = await res.text();
} catch (e) { console.error("request failed:", e.name, e.message); process.exit(4); } finally { clearTimeout(timer); }
let json; try { json = JSON.parse(text); } catch { console.error("non-JSON response", res.status, text.slice(0, 600)); process.exit(4); }
if (!res.ok || json.error) { console.error("API error", res.status, JSON.stringify(json.error ?? json).slice(0, 1200)); process.exit(5); }
const d = json.data?.[0]; if (!d) { console.error("no data in response:", JSON.stringify(json).slice(0, 600)); process.exit(6); }
fs.mkdirSync(path.dirname(out), { recursive: true });
if (d.b64_json) fs.writeFileSync(out, Buffer.from(d.b64_json, "base64"));
else if (d.url) { const r = await fetch(d.url); fs.writeFileSync(out, Buffer.from(await r.arrayBuffer())); }
else { console.error("no image payload:", Object.keys(d)); process.exit(6); }
const meta = { model, size, quality, seconds: (Date.now() - t0) / 1000, usage: json.usage ?? null, created: json.created ?? null, output_format: json.output_format ?? null, revised_prompt: d.revised_prompt ?? null };
fs.writeFileSync(out.replace(/\.png$/i, "") + ".meta.json", JSON.stringify(meta, null, 1));
console.log(`saved ${out} in ${meta.seconds.toFixed(0)}s; usage ${JSON.stringify(meta.usage)}`);
