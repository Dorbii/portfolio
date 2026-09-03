// Lock change 5 part 2 — the canon as the SECOND input image of the single edit call
// (probe R078: key light 0.0093 vs 0.019-0.020, band fidelity 0.759 vs 0.84-0.88).
// Applies to tools/world-authoring/cell.mjs and tests/world-authoring-stitch.test.mjs.
// Every replacement is anchored on exact current text and must match exactly once.
// Run ONLY after the owner's word is recorded in the lock.
import fs from "node:fs";
const CHECK = process.argv.includes("--check");   // verify every anchor, write nothing
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
  ["reference paragraph constant",
    `const FRAMING_PREAMBLE = "Edit this image in place.`,
    `// the canon rides along as a second input of the SAME edit call: the hand the
// model continues is then the canon's in the interior and the neighbour's at
// the band (probe R078: key light 0.0093 vs 0.019-0.020 without it)
const REFERENCE_PARAGRAPH = "The second image is a reference only and must not appear in the output: take from it the brush, the palette family, the ground scale and above all the FLAT LIGHTING — every tussock, boulder, column and bank the same value on every side, no bright upper edge, no dark lower edge, no lit side anywhere, ambient occlusion only.";
const CANON_SOURCE = "seed/L2-seed-region-r2-source.png";   // under paths.sources
const FRAMING_PREAMBLE = "Edit the first image in place.`],
  ["framing paragraph wording",
    `The output must be a SQUARE image with exactly the same framing and extent as the input: the painted terrain stays exactly where it is, at the same scale, and the flat grey area is painted in. Do not change the aspect ratio, do not crop, do not zoom, do not extend the canvas beyond the input. Paint the grey area as a seamless continuation of the painted ground so the join is invisible. Keep exactly the same painterly style, palette, brush density, rock shading and view as the existing paint.";`,
    `The output must be a SQUARE image with exactly the same framing and extent as the first image: the painted terrain stays exactly where it is, at the same scale, and the flat grey area is painted in. Do not change the aspect ratio, do not crop, do not zoom, do not extend the canvas beyond the input. Paint the grey area as a seamless continuation of the painted ground so the join is invisible. Keep exactly the same view as the first image.";`],
  ["packet: two inputs, one call",
    `grey wherever this cell is still unpainted. Load it with the built-in
\\\`view_image\\\` tool, then make ONE \\\`image_gen\\\` call in EDIT mode on that
image. Your edit prompt begins with this paragraph VERBATIM, followed by the
brief above written as what the ground IS and what CONTINUES from the painted
edge — never as coordinates or percentages:

> \${FRAMING_PREAMBLE}
`,
    `grey wherever this cell is still unpainted. \\\`\${canonPath}\\\` is the
style canon of this world. Load both with the built-in \\\`view_image\\\` tool,
then make ONE \\\`image_gen\\\` call in EDIT mode with BOTH images attached — the
edit target as the image to edit, the canon as a second input that is a
reference only. Your edit prompt begins with these two paragraphs VERBATIM,
followed by the brief above written as what the ground IS and what CONTINUES
from the painted edge — never as coordinates or percentages:

> \${FRAMING_PREAMBLE}

> \${REFERENCE_PARAGRAPH}

If the tool refuses the second image, say so in the report and stop — never
a second call, never generate mode.
`],
  ["canon path resolved where the target is built",
    `const editMode = authoredNeighbours.length > 0;`,
    `const editMode = authoredNeighbours.length > 0;
const canonPath = path.join(paths.sources, CANON_SOURCE);
if (editMode && !fs.existsSync(canonPath)) die(\`edit mode needs the style canon at \${canonPath}\`);`],
]);

patch("tests/world-authoring-stitch.test.mjs", [
  ["synthetic canon in the test world",
    `const SYN = path.join(OUT, "synthetic");`,
    `const SYN = path.join(OUT, "synthetic");
// the edit-mode packet mandates the style canon as the second input of the edit
// call (lock change 5 part 2); the test world carries a synthetic one
{ const seed = path.join(OUT, "sources", "seed"); fs.mkdirSync(seed, { recursive: true });
  await sharp(genImage(0, 0, F).concept, { raw: { width: GEN, height: GEN, channels: 4 } }).png()
    .toFile(path.join(seed, "L2-seed-region-r2-source.png")); }`],
  ["dry-run control",
    `  assert.match(packet, /same framing and extent/);`,
    `  assert.match(packet, /same framing and extent/);
  // lock change 5 part 2: the canon rides along as the second input of the one call
  assert.match(packet, /BOTH images attached/);
  assert.match(packet, /The second image is a reference only/);
  assert.match(packet, /L2-seed-region-r2-source\\.png/);`],
]);
