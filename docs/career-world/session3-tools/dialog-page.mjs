// The dialog page: one HTML file that shows the owner what Claude (director)
// and Codex (worker / reviewer) said to each other tonight, what the gates
// ruled, and the pictures — built from the files each of them already writes.
//
// Sources, all read at build time:
//   docs/career-world/dialog/notes.jsonl            the director's own entries and the owner's words from chat
//   .codex-tmp/bake-tanium.log                       every dispatch and every gate verdict (runner + gates)
//   .codex-tmp/authoring/cells/tanium/<id>/<id>.log  the worker's closing words for each attempt (Codex)
//   .codex-tmp/review/<name>/                        review packets (Claude asks), reviews (Codex answers), sealed reads
//   docs/career-world/session3-tools/tanium-rejects  the refused candidates, 768 px
//   art-source/.../tanium/<id>/<id>-concept.png      the accepted cells, downscaled
//
//   node docs/career-world/session3-tools/dialog-page.mjs [--since 2026-09-04T22:33:00Z] [--out PATH]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
sharp.cache(false);

const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const SINCE = new Date(arg("--since", "2026-09-04T22:33:00Z"));
const OUT = arg("--out", ".codex-tmp/dialog/dialog.html");
const DAY = SINCE.toISOString().slice(0, 10);
const TZ_OFFSET_H = -5;   // the owner's clock tonight (log lines are UTC)
const T = "tanium";
const DEF = JSON.parse(fs.readFileSync(`art-source/career-world/l2-land/${T}/territory.def.json`, "utf8"));
const MAN = `public/career-world/layers/terrain/authority/manifests/terrain-l2-${T}-r1.json`;
const authored = fs.existsSync(MAN) ? JSON.parse(fs.readFileSync(MAN, "utf8")).cells : {};

const exists = (p) => fs.existsSync(p);
const read = (p) => fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const localTime = (d) => {
  const t = new Date(d.getTime() + TZ_OFFSET_H * 3600 * 1000);
  return `${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`;
};
const utcOfLog = (hhmmss) => new Date(`${DAY}T${hhmmss}Z`);

// ------------------------------------------------------------- markdown-lite
function md(src) {
  const lines = src.split("\n");
  const out = [];
  let para = [], list = null, code = null;
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<ul>${list.map((l) => `<li>${inline(l)}</li>`).join("")}</ul>`); list = null; } };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (code !== null) {
      if (line.startsWith("```")) { out.push(`<pre>${esc(code.join("\n"))}</pre>`); code = null; } else code.push(raw);
      continue;
    }
    if (line.startsWith("```")) { flushPara(); flushList(); code = []; continue; }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { flushPara(); flushList(); out.push(`<h${h[1].length + 2}>${inline(h[2])}</h${h[1].length + 2}>`); continue; }
    const li = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
    if (li) { flushPara(); (list ??= []).push(li[1]); continue; }
    if (!line.trim()) { flushPara(); flushList(); continue; }
    if (list && /^\s{2,}/.test(raw)) { list[list.length - 1] += " " + line.trim(); continue; }
    flushList();
    para.push(line.trim());
  }
  flushPara(); flushList();
  if (code !== null) out.push(`<pre>${esc(code.join("\n"))}</pre>`);
  return out.join("\n");
}
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
}

// ------------------------------------------------------------------ images
const imgCache = new Map();
async function img(p, maxW = 900, caption = "") {
  if (!exists(p)) return "";
  const key = `${p}@${maxW}`;
  if (!imgCache.has(key)) {
    const buf = await sharp(p).resize({ width: maxW, withoutEnlargement: true }).webp({ quality: 74 }).toBuffer();
    const meta = await sharp(buf).metadata();
    imgCache.set(key, { uri: `data:image/webp;base64,${buf.toString("base64")}`, w: meta.width, h: meta.height });
  }
  const { uri, w, h } = imgCache.get(key);
  return `<figure><img src="${uri}" width="${w}" height="${h}" alt="${esc(caption)}" loading="lazy">${caption ? `<figcaption>${inline(caption)}</figcaption>` : ""}</figure>`;
}

// ------------------------------------------------------------------ sources
const entries = [];   // { at: Date, who, kind, cell, title, body(md), images: [[path, maxW, caption]], thread }

// 1. the director's notes and the owner's words
const NOTES = "docs/career-world/dialog/notes.jsonl";
if (exists(NOTES)) for (const line of read(NOTES).split("\n").filter(Boolean)) {
  const n = JSON.parse(line);
  entries.push({ at: new Date(n.at), who: n.who, kind: n.kind || "note", cell: n.cell || null, thread: n.thread || n.cell || "session", title: n.title || "", body: n.body || "", images: (n.images || []).map((i) => [i.src, 900, i.caption || ""]) });
}

// 2. the runner's log: dispatches and verdicts, with the gate block
const LOG = `.codex-tmp/bake-${T}.log`;
if (exists(LOG)) {
  const lines = read(LOG).split("\n");
  let run = null, cur = null, block = [];
  const stamp = (l) => { const m = l.match(/^\[(\d\d:\d\d:\d\d)\]\s?(.*)$/); return m ? { t: utcOfLog(m[1]), rest: m[2] } : null; };
  for (const l of lines) {
    const s = stamp(l);
    if (s) {
      if (/^bake \w+: \d+ cells/.test(s.rest)) { run = { at: s.t, cells: s.rest.match(/(\d+) cells/)[1], model: null }; continue; }
      const mm = s.rest.match(/^codex (\S+) at (.+)$/);
      if (mm && run) { run.model = `Codex ${mm[1]}`; continue; }
      const d = s.rest.match(/^--- (\d+)\/(\d+)\s+(c\d-\d)\s+(\S+)/);
      if (d) {
        cur = { at: s.t, id: d[3], biome: d[4], i: d[1], n: d[2] }; block = [];
        if (s.t >= SINCE) entries.push({ at: s.t, who: "runner", kind: "dispatch", cell: d[3], thread: d[3], title: `${d[3]} dispatched (${d[1]} of ${d[2]} in this run, ${d[4]})`, body: `Brief: \`art-source/career-world/l2-land/tanium/briefs/${d[3]}.md\`${run && run.model ? ` · ${run.model}` : ""}`, images: [] });
        continue;
      }
      const v = s.rest.match(/^(ACCEPTED in|FAILED after) ([\d.]+) min/);
      if (v && cur && s.t >= SINCE) {
        const ok = v[1].startsWith("ACCEPTED");
        const gates = block.filter((b) => /^\s{2,}(PASS|FAIL|bridge|mask |derived|palette:|continuity:|cell NOT|accepted, stitched|context|dispatch)/.test(b) || /^\s{6}(palette|continuity)/.test(b)).join("\n");
        const model = block.find((b) => /model:/.test(b));
        entries.push({ at: s.t, who: "gates", kind: ok ? "accepted" : "refused", cell: cur.id, thread: cur.id,
          title: `${cur.id} ${ok ? "ACCEPTED" : "REFUSED"} after ${v[2]} min`,
          body: "```\n" + gates.trim() + "\n```" + (ok ? "\n\nStitched into the pyramid and committed." : `\n\nThe world is untouched. Candidate kept at \`docs/career-world/session3-tools/tanium-rejects/${cur.id}.webp\`.`),
          images: ok ? [[`art-source/career-world/l2-land/${T}/${cur.id}/${cur.id}-concept.png`, 640, `${cur.id} as accepted (full canvas, bleed included)`]]
            : [[`docs/career-world/session3-tools/tanium-rejects/${cur.id}.webp`, 640, `${cur.id}, the refused candidate (water cut shows white)`]] });
        cur = null; continue;
      }
      continue;
    }
    if (cur) block.push(l);
  }
}

// 3. the worker's closing words, per cell attempted since SINCE
for (const id of Object.keys(DEF.cellBiomes).map((k) => `c${k.replace(",", "-")}`)) {
  const f = `.codex-tmp/authoring/cells/${T}/${id}/${id}.log`;
  if (!exists(f)) continue;
  const st = fs.statSync(f);
  if (st.mtime < SINCE) continue;
  const txt = read(f);
  const last = txt.lastIndexOf("\ncodex\n");
  if (last < 0) continue;
  const tail = txt.slice(last + 7);
  const end = tail.indexOf("\ntokens used");
  const words = (end >= 0 ? tail.slice(0, end) : tail).trim();
  const tokens = end >= 0 ? (tail.slice(end).match(/tokens used\n([\d,]+)/) || [])[1] : null;
  const attempt = (txt.match(/=== attempt \d+ (\S+) ===/g) || []).pop();
  const attemptAt = attempt ? new Date(attempt.match(/=== attempt \d+ (\S+) ===/)[1]) : st.mtime;
  entries.push({ at: st.mtime, who: "codex", kind: "worker", cell: id, thread: id,
    title: `Codex (worker) on ${id}${tokens ? ` · ${tokens} tokens` : ""}`,
    body: words.length > 4000 ? words.slice(0, 4000) + "\n\n*(trimmed)*" : words,
    images: [] , startedAt: attemptAt });
}

// 4. reviews: what Claude asked, Claude's sealed read, what Codex answered
const REV = ".codex-tmp/review";
if (exists(REV)) for (const name of fs.readdirSync(REV)) {
  const dir = path.join(REV, name);
  if (!fs.statSync(dir).isDirectory()) continue;
  const cell = (name.match(/^(c\d-\d)/) || [])[1] || null;
  const files = fs.readdirSync(dir);
  const pick = (re) => files.find((f) => re.test(f));
  const packet = pick(/packet\.md$/), claude = pick(/^claude-read\.md$/), codex = pick(/^codex-(review|duck)\.md$/);
  const strips = files.filter((f) => /^seam-.*\.png$/.test(f)).sort();
  const at = (f) => fs.statSync(path.join(dir, f)).mtime;
  if (packet) entries.push({ at: at(packet), who: "claude", kind: "ask", cell, thread: name,
    title: `Claude asks Codex — ${name.endsWith("duck") ? "a second opinion" : "review this refused candidate"}`,
    body: read(path.join(dir, packet)), images: strips.map((f) => [path.join(dir, f), 900, f.replace(/\.png$/, "").replace(/-/g, " ")]) });
  if (claude) entries.push({ at: at(claude), who: "claude", kind: "sealed", cell, thread: name,
    title: "Claude's own read, sealed before the review", body: read(path.join(dir, claude)), images: [] });
  if (codex) entries.push({ at: at(codex), who: "codex", kind: "review", cell, thread: name,
    title: `Codex answers — ${name.endsWith("duck") ? "second opinion" : "review"}`, body: read(path.join(dir, codex)), images: [] });
  else if (packet) entries.push({ at: new Date(Math.max(at(packet).getTime(), Date.now() - 1000)), who: "codex", kind: "pending", cell, thread: name,
    title: "Codex is still writing", body: "The review job has been dispatched and has not returned yet.", images: [] });
}

entries.sort((a, b) => a.at - b.at);

// ------------------------------------------------------------- the grid
const cellState = {};
for (const k of Object.keys(DEF.cellBiomes)) {
  const id = `c${k.replace(",", "-")}`;
  let state = authored[id] ? "authored" : "pending";
  const last = [...entries].reverse().find((e) => e.cell === id && (e.kind === "refused" || e.kind === "accepted" || e.kind === "dispatch"));
  if (!authored[id] && last) state = last.kind === "dispatch" ? "baking" : last.kind === "refused" ? "refused" : state;
  if (id === "c1-1") state = "stopped";
  cellState[id] = { state, biome: DEF.cellBiomes[k] };
}
const counts = Object.values(cellState).reduce((a, c) => ((a[c.state] = (a[c.state] || 0) + 1), a), {});

// ------------------------------------------------------------- render
const WHO = { claude: "Claude", codex: "Codex", gates: "The gates", runner: "Runner", owner: "Steve" };
const threads = new Map();
for (const e of entries) { if (!threads.has(e.thread)) threads.set(e.thread, []); threads.get(e.thread).push(e); }
const threadOrder = [...threads.keys()].sort((a, b) => {
  const la = threads.get(a).at(-1).at, lb = threads.get(b).at(-1).at; return lb - la;
});
const threadTitle = (k) => k === "session" ? "The session" : k.endsWith("duck") ? `${k.slice(0, 4)} · second opinion` : /^c\d-\d$/.test(k) ? `${k} · ${DEF.cellBiomes[k.slice(1).replace("-", ",")] || ""}` : k;

let cards = "";
for (const k of threadOrder) {
  const es = threads.get(k);
  let html = "";
  for (const e of es) {
    const imgs = [];
    for (const [p, w, c] of e.images) imgs.push(await img(p, w, c));
    html += `<article class="entry who-${e.who} kind-${e.kind}" id="e-${e.at.getTime()}-${e.who}">
  <header><span class="who">${WHO[e.who] || e.who}</span><span class="kind">${esc(e.kind)}</span><time>${localTime(e.at)}</time></header>
  <h3>${inline(e.title)}</h3>
  <div class="body">${md(e.body)}</div>
  ${imgs.join("\n")}
</article>`;
  }
  const state = cellState[k]?.state;
  cards += `<section class="thread" id="t-${esc(k)}">
  <h2>${esc(threadTitle(k))}${state ? ` <span class="state st-${state}">${state}</span>` : ""}</h2>
  ${html}
</section>`;
}

const gridCells = [];
for (let r = 0; r < DEF.grid.rows; r += 1) for (let c = 0; c < DEF.grid.cols; c += 1) {
  const id = `c${c}-${r}`; const s = cellState[id];
  const has = threads.has(id);
  gridCells.push(`<a class="cell st-${s.state}" ${has ? `href="#t-${id}"` : ""} title="${esc(s.biome)}"><span class="id">${id}</span><span class="biome">${esc(s.biome)}</span></a>`);
}

const built = localTime(new Date());
const chain = ["c0-1", "c4-1"].filter((id) => authored[id]);
const page = `<title>Career World Dialog</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Literata:opsz,wght@7..72,400;7..72,600&family=JetBrains+Mono:wght@400;600&display=swap">
<style>
:root{
  --ground:#EEF0EA; --surface:#F7F8F4; --ink:#1F2A24; --ink-2:#4B5751; --rule:#CFD6CF;
  --claude:#2F6B8F; --codex:#7A5C2E; --gates:#5B6560; --owner:#A67C00; --runner:#7C8A84;
  --ok:#3C7A3E; --bad:#A33D2B; --warn:#B7791F; --pending:#9AA39D;
  --mono:"JetBrains Mono",ui-monospace,Menlo,Consolas,monospace;
  --disp:"Bricolage Grotesque","Helvetica Neue",Arial,sans-serif;
  --body:"Literata",Georgia,"Times New Roman",serif;
}
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){
  --ground:#161A17; --surface:#1F2521; --ink:#E6E8E2; --ink-2:#A9B2AC; --rule:#33403A;
  --claude:#7FB3D0; --codex:#D0A870; --gates:#9AA39D; --owner:#E0B94F; --runner:#8A9691;
  --ok:#7FC07F; --bad:#E07A66; --warn:#E0B05A; --pending:#5E6963; }}
:root[data-theme="dark"]{
  --ground:#161A17; --surface:#1F2521; --ink:#E6E8E2; --ink-2:#A9B2AC; --rule:#33403A;
  --claude:#7FB3D0; --codex:#D0A870; --gates:#9AA39D; --owner:#E0B94F; --runner:#8A9691;
  --ok:#7FC07F; --bad:#E07A66; --warn:#E0B05A; --pending:#5E6963; }
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--body);font-size:16px;line-height:1.55}
main{max-width:76ch;margin:0 auto;padding:28px 20px 80px;overflow-wrap:anywhere}
.body code,.body p{overflow-wrap:anywhere}
h1,h2,h3{font-family:var(--disp);text-wrap:balance;letter-spacing:-0.01em}
h1{font-size:2rem;font-weight:700;margin:0 0 6px}
.lede{color:var(--ink-2);margin:0 0 22px;max-width:60ch}
.lede strong{color:var(--ink)}
.status{display:flex;flex-wrap:wrap;gap:8px 18px;font-family:var(--mono);font-size:.8rem;color:var(--ink-2);margin:0 0 18px;font-variant-numeric:tabular-nums}
.status b{color:var(--ink);font-weight:600}
.grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;margin:0 0 6px;max-width:100%}
.cell{display:flex;flex-direction:column;justify-content:space-between;min-height:58px;min-width:0;overflow:hidden;padding:6px 7px;border-radius:4px;text-decoration:none;color:var(--ink);background:var(--surface);border:1px solid var(--rule);font-family:var(--mono);font-size:.72rem;line-height:1.2}
.cell .id{font-weight:600}
.cell .biome{color:var(--ink-2);font-size:.62rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cell.st-authored{border-color:var(--ok);box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--ok) 35%,transparent)}
.cell.st-refused{border-color:var(--bad);box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--bad) 35%,transparent)}
.cell.st-baking{border-color:var(--warn);box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--warn) 45%,transparent)}
.cell.st-stopped{border-color:var(--bad);background:color-mix(in srgb,var(--bad) 12%,var(--surface))}
.cell.st-pending{opacity:.65}
a.cell:hover{outline:2px solid var(--claude);outline-offset:1px}
.legend{display:flex;flex-wrap:wrap;gap:6px 16px;font-family:var(--mono);font-size:.72rem;color:var(--ink-2);margin:0 0 30px}
.legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:-1px;border:1px solid var(--rule)}
.legend .l-authored i{background:var(--ok)} .legend .l-refused i{background:var(--bad)} .legend .l-baking i{background:var(--warn)} .legend .l-stopped i{background:color-mix(in srgb,var(--bad) 40%,var(--surface))} .legend .l-pending i{background:var(--pending)}
.thread{margin:0 0 44px;padding-top:12px;border-top:1px solid var(--rule)}
.thread h2{font-size:1.25rem;margin:0 0 14px;display:flex;align-items:center;gap:10px}
.state{font-family:var(--mono);font-size:.7rem;font-weight:400;padding:2px 7px;border-radius:3px;border:1px solid var(--rule);color:var(--ink-2)}
.state.st-authored{color:var(--ok);border-color:var(--ok)} .state.st-refused,.state.st-stopped{color:var(--bad);border-color:var(--bad)} .state.st-baking{color:var(--warn);border-color:var(--warn)}
.entry{position:relative;padding:8px 0 14px 18px;margin:0 0 10px;border-left:3px solid var(--runner)}
.entry.who-claude{border-left-color:var(--claude)} .entry.who-codex{border-left-color:var(--codex)} .entry.who-gates{border-left-color:var(--gates)} .entry.who-owner{border-left-color:var(--owner)}
.entry header{display:flex;gap:10px;align-items:baseline;font-family:var(--mono);font-size:.74rem;color:var(--ink-2);letter-spacing:.02em}
.entry header .who{font-weight:600;text-transform:uppercase;letter-spacing:.08em}
.who-claude header .who{color:var(--claude)} .who-codex header .who{color:var(--codex)} .who-gates header .who{color:var(--gates)} .who-owner header .who{color:var(--owner)}
.entry header time{margin-left:auto;font-variant-numeric:tabular-nums}
.entry h3{font-size:1.02rem;margin:4px 0 6px;font-weight:600}
.kind-accepted h3{color:var(--ok)} .kind-refused h3{color:var(--bad)} .kind-pending h3{color:var(--warn)}
.body p{margin:0 0 .7em} .body ul{margin:0 0 .8em;padding-left:1.2em} .body li{margin:0 0 .25em}
.body h3,.body h4,.body h5,.body h6{font-family:var(--disp);font-size:.95rem;margin:1em 0 .4em}
.body pre{background:var(--surface);border:1px solid var(--rule);border-radius:4px;padding:10px 12px;overflow-x:auto;font-family:var(--mono);font-size:.74rem;line-height:1.45}
.body code{font-family:var(--mono);font-size:.82em;background:var(--surface);padding:1px 4px;border-radius:3px}
.body table{border-collapse:collapse}
figure{margin:12px 0 4px}
figure img{max-width:100%;height:auto;display:block;border:1px solid var(--rule);border-radius:3px;background:#f0f}
figcaption{font-family:var(--mono);font-size:.7rem;color:var(--ink-2);margin-top:5px}
.foot{font-family:var(--mono);font-size:.72rem;color:var(--ink-2);border-top:1px solid var(--rule);padding-top:12px}
@media (max-width:640px){ .grid{grid-template-columns:repeat(7,1fr);gap:3px} .cell{min-height:44px;padding:4px 4px} .cell .biome{display:none} main{padding:18px 12px 60px} }
@media (prefers-reduced-motion:no-preference){ a.cell{transition:outline-color .15s} }
:focus-visible{outline:2px solid var(--claude);outline-offset:2px}
</style>
<main>
<h1>Career World Dialog</h1>
<p class="lede">What <strong>Claude</strong> (director) and <strong>Codex</strong> (worker and reviewer) said to each other tonight while authoring Tanium's land, what <strong>the gates</strong> ruled, and what <strong>Steve</strong> decided. Rebuilt from the files each of them writes; nothing here is retyped.</p>
<div class="status">
  <span>Tanium <b>${Object.keys(authored).length} of ${Object.keys(DEF.cellBiomes).length}</b> cells authored</span>
  <span>rune chain in <b>${chain.join(", ") || "none"}</b></span>
  <span><b>${counts.baking || 0}</b> baking · <b>${counts.refused || 0}</b> refused · <b>${counts.stopped || 0}</b> stopped for the owner</span>
  <span>built <b>${built}</b> local</span>
</div>
<div class="grid">${gridCells.join("")}</div>
<div class="legend"><span class="l-authored"><i></i>authored</span><span class="l-baking"><i></i>baking now</span><span class="l-refused"><i></i>refused, will retry</span><span class="l-stopped"><i></i>stopped — owner's ruling</span><span class="l-pending"><i></i>not yet tried tonight</span></div>
${cards}
<p class="foot">Threads are ordered by latest activity. Times are the owner's clock. A refused candidate's picture shows its water cut as white; an accepted cell's picture is its full canvas including the bleed into neighbours. Source of truth: <code>docs/career-world/STATE.md</code>.</p>
</main>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, page);
console.log(`wrote ${OUT}: ${entries.length} entries in ${threads.size} threads, ${(fs.statSync(OUT).size / 1048576).toFixed(1)} MB`);
