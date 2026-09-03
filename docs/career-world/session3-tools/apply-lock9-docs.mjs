// Lock change 9, documentation lines: the --restitch usage in the pipeline's header
// and the solidified guide, and the seam rule beside the contract table.
import fs from "node:fs";
const CHECK = process.argv.includes("--check");
function patch(file, edits) {
  let t = fs.readFileSync(file, "utf8"); const done = [];
  for (const [name, from, to] of edits) {
    const n = t.split(from).length - 1;
    if (n !== 1) throw new Error(`${file} ${name}: anchor matched ${n} times, expected 1`);
    t = t.replace(from, to); done.push(name);
  }
  if (CHECK) { console.log(file, "anchors ok:", done.join("; ")); return; }
  fs.writeFileSync(file, t); console.log(file, "applied:", done.join("; "));
}
patch("tools/world-authoring/cell.mjs", [
  ["header usage",
    ` *   node tools/world-authoring/cell.mjs --cell 4,3 --from DIR   (operator-supplied
 *       artefacts: skips generation, gates and stitch still run)`,
    ` *   node tools/world-authoring/cell.mjs --cell 4,3 --from DIR   (operator-supplied
 *       artefacts: skips generation, gates and stitch still run)
 *   node tools/world-authoring/cell.mjs --cell 4,3 --restitch  (an ACCEPTED cell:
 *       rebuild its tiles from the recorded sources, no dispatch, no gates)`],
]);
patch("tools/world-authoring/AGENTS.md", [
  ["usage",
    "`--force` is required to replace a cell that already exists, and it reports what\nwill be regenerated before doing it.",
    "`--force` is required to replace a cell that already exists, and it reports what\nwill be regenerated before doing it. `--restitch` rebuilds an accepted cell's tiles\nfrom its recorded sources with no dispatch and no gates: the way a changed seam rule\nis carried through the world without a bake."],
  ["seam rule",
    "These are power-of-two aligned on purpose. A cell is a whole number of tiles at\nevery level, so dirty-tile propagation is exact and a replaced cell touches\nnothing outside itself. Changing any of them breaks that alignment and silently\nreintroduces resampling at every cell boundary.",
    "These are power-of-two aligned on purpose. A cell is a whole number of tiles at\nevery level, so dirty-tile propagation is exact and a replaced cell touches\nnothing outside itself. Changing any of them breaks that alignment and silently\nreintroduces resampling at every cell boundary.\n\nSeams between two authored cells are content-aware (owner-approved 2026-09-02):\nthe boundary follows the minimum-error path through the two paints within\n128 px of the nominal line, pinned to the jittered corners and feathered 8 px,\nderived from the two sources alone so both cells agree on it. A fixed line cut\nwhatever straddled it. Edges to unauthored ground keep the geometric wiggle."],
]);
