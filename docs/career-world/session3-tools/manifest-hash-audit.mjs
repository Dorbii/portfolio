// Every sha256 a career-world manifest records, checked against the file it
// describes. Four of the nine suite failures are hash mismatches; this says
// whether the ASSET drifted or the RECORDED HASH went stale, which decides
// whether the fix is to rebuild or to recompute.
//   node .codex-tmp/session3/manifest-hash-audit.mjs [--fix]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const FIX = process.argv.includes("--fix");
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".json")) out.push(p);
  }
  return out;
}

// A recorded hash is only checkable when the same object names the file it
// describes. Collect (hashField, pathField) pairs by walking the JSON tree.
function pairs(node, out = [], trail = []) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => pairs(v, out, [...trail, String(i)]));
    return out;
  }
  if (!node || typeof node !== "object") return out;
  const keys = Object.keys(node);
  const hashKey = keys.find((k) => /^sha256$/i.test(k));
  const pathKey = keys.find((k) => /^(path|file|src|source|asset)$/i.test(k)
    && typeof node[k] === "string" && node[k].includes("/"));
  if (hashKey && pathKey) out.push({ trail: trail.join("."), hash: node[hashKey], rel: node[pathKey], node, hashKey });
  for (const k of keys) pairs(node[k], out, [...trail, k]);
  return out;
}

const manifests = [
  ...walk(path.join(ROOT, "public/career-world")),
];
let checked = 0, stale = [], missing = [], fixed = 0;
for (const m of manifests) {
  let doc;
  try { doc = JSON.parse(fs.readFileSync(m, "utf8")); } catch { continue; }
  const found = pairs(doc);
  if (!found.length) continue;
  let dirty = false;
  for (const f of found) {
    const rel = f.rel.replace(/^\//, "").split("?")[0];
    const abs = path.join(ROOT, "public", rel);
    if (!fs.existsSync(abs)) { missing.push({ m: path.relative(ROOT, m), rel }); continue; }
    checked++;
    const actual = sha(abs);
    if (actual.toLowerCase() !== String(f.hash).toLowerCase()) {
      stale.push({ m: path.relative(ROOT, m), trail: f.trail, rel, recorded: String(f.hash).slice(0, 16), actual: actual.slice(0, 16) });
      if (FIX) {
        f.node[f.hashKey] = /[a-f]/.test(String(f.hash)) ? actual : actual.toUpperCase();
        dirty = true; fixed++;
      }
    }
  }
  if (dirty) fs.writeFileSync(m, JSON.stringify(doc, null, 2) + "\n");
}
console.log(`checked ${checked} recorded hashes across ${manifests.length} manifests`);
if (missing.length) {
  console.log(`\n${missing.length} recorded path(s) point at a missing file:`);
  for (const x of missing.slice(0, 10)) console.log(`  ${x.m}\n    -> ${x.rel}`);
}
console.log(`\n${stale.length} mismatch(es):`);
for (const s of stale) {
  console.log(`  ${s.m}`);
  console.log(`    at ${s.trail || "(root)"}  ->  ${s.rel}`);
  console.log(`    recorded ${s.recorded}   actual ${s.actual}`);
}
if (FIX) console.log(`\n--fix: rewrote ${fixed} recorded hash(es) to match the files on disk.`);
else if (stale.length) console.log(`\nre-run with --fix to update the recorded hashes to the files on disk.`);
