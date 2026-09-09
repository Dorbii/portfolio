import fs from "node:fs";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"../../..");
const out=path.join(root,".codex-tmp/qa/foliage-reference-board");
fs.mkdirSync(out,{recursive:true});
fs.copyFileSync(path.join(import.meta.dirname,"foliage-reference-board.html"),path.join(out,"index.html"));
fs.copyFileSync(path.join(import.meta.dirname,"foliage-reference-board.json"),path.join(out,"references.json"));
console.log(out);
