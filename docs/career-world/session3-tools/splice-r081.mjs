import fs from "node:fs";
{ const p = "docs/career-world/AGENT-EXPERIMENTS.md"; let t = fs.readFileSync(p, "utf8");
  if (!t.includes("### R081")) { const k = "## Findings backlog"; const i = t.indexOf(k); t = t.slice(0, i) + fs.readFileSync(".codex-tmp/session3/r081.md", "utf8") + t.slice(i); fs.writeFileSync(p, t); console.log("ledger: R081 spliced"); } else console.log("ledger: present"); }
{ const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
  const anchor = "**SESSION 4, LATER (2026-09-02, owner online) — RESUME HERE.**";
  const block = `**SESSION 4, LATEST (2026-09-02 midday) — RESUME HERE.** **Lock change 5
part 2 LANDED** (R080, commit \`61f0dd7\`, suite \`16/16\`): every edit-mode
packet mandates the canon source as the SECOND input of the single edit
call. **1,2 heather moor ACCEPTED on the third attempt** with it (R081):
key-light \`0.0068\` where the same target gave \`0.021\` and \`0.0186\` before
— the lineage fix replicated on a real bake; \`167\` tiles; commit
\`ee81a13\`. **EIGHT CELLS STAND** (4,3 / 3,3 / 4,2 / 3,2 / 2,3 / 2,2 / 3,1 /
1,2). **2,1 the capital DISPATCHED** (\`brief-c2-1.md\`: the shelf a third
of the cell, luminous gold-green, the station strip, the line's ground
west-to-east, closed water; log \`.codex-tmp/session3/regen-c2-1.log\`).
Owner on the stitched sets: "The images and seams look good to me!"
Owner asked to see the grid (\`grid-status.mjs\` → \`review/territory-grid-status.png\`)
and asked how the south coast is handled (answered from the plan: sound
under 0,3/1,3 with the inlet crossing, land border under 2,3/3,3 done, bay
at 4,3 done; coast cells cut their sea and publish the footprint, the ocean
layer fills). **Owner asked whether the LoD works before more cells are
spent:** offline check done (R081; \`review/pyramid-A-block-L3-L6.png\`,
\`pyramid-B2-seam-stretched.png\`): seams not findable at any level, brush
character to L3, tone stable. **The runtime has never streamed this
pyramid** — its land streamer (\`features/career-world/layers/terrain/model/streamTiles.ts\`,
manifest \`terrain-stream-runtime-r4.json\`: tiles with normalized world
bounds, source tiers capital+site, five camera tiers in
\`shared/lod/policy.ts\`) needs a manifest generator from the pyramid, a
streamer extension for more tiers, a layer-only dev toggle and a dev
placement from NinjaOne's focus view — about half a day of app work,
awaiting the owner's word. Next cells after 2,1: 1,3 (Vendy shelf on the
sound, the inlet the loop crosses — owner to set the inlet's width), 0,3,
0,2 (submerged run), 4,1 (brief ready), then row 0.

`;
  if (!t.includes("SESSION 4, LATEST")) { t = t.replace(anchor, block + anchor); console.log("state: latest block inserted"); } else console.log("state: present");
  const lines = t.split("\n"); const i19 = lines.findIndex((l) => l.startsWith("| 19 |"));
  if (i19 >= 0 && !lines.some((l) => l.startsWith("| 20 |"))) {
    lines.splice(i19 + 1, 0,
      "| 20 | \"how will we handle the coast for this bottom part?\" | ANSWERED from the plan's southBorder rule and the water contract; the inlet's width at the crossing is the owner's choice when 1,3 comes up |",
      "| 21 | \"the next step is all the layers of the pyramid?\" / \"shouldnt we test the LoD out then\" | pyramid tiers are written by every stitch (not a step); offline LoD check DONE (R081); runtime streaming test scoped (half a day, app code) — awaiting the owner's word |");
    t = lines.join("\n"); console.log("state: rows 20-21 added");
  }
  fs.writeFileSync(p, t); }
