import fs from "node:fs";
{ const p = "docs/career-world/AGENT-EXPERIMENTS.md"; let t = fs.readFileSync(p, "utf8");
  if (!t.includes("### R083")) { const k = "## Findings backlog"; const i = t.indexOf(k); t = t.slice(0, i) + fs.readFileSync(".codex-tmp/session3/r083-085.md", "utf8") + t.slice(i); fs.writeFileSync(p, t); console.log("ledger: R083-R085 spliced"); } else console.log("ledger: present"); }
{ const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
  const anchor = "**SESSION 4, LATEST (2026-09-02 midday) — RESUME HERE.**";
  const block = `**SESSION 4, AFTERNOON (2026-09-02) — RESUME HERE.** Owner: "agreed on
both" → **2,1 the capital REPLACED** on \`brief-c2-1-r2.md\` and accepted
(R084, commit \`b26390b\`): the shelf now a brighter table ringed by broken
terraces with the station strip; crowns \`73 px\`; nine cells stand (2,1
replaced, count unchanged). **The runtime LoD test PASSED** (R085; owner
OK'd app-side work): a dev-gated feed (\`?landStream=l2dev\` or
\`NEXT_PUBLIC_LAND_STREAM=l2dev\`; \`streamTiles.ts\`, manifest
\`terrain-stream-runtime-l2dev.json\`, tiles \`l2-ninjaone-dev/\`, generator
\`.codex-tmp/session3/l2dev-manifest.mjs\`; launch config
\`career-world-worktree\` in the MAIN checkout's \`.claude/launch.json\`)
streams the nine cells through territory → capital (L3) → site (L1) in
the app with no visible seam and residency \`37.7 MB\`; the camera's
interactive floor (\`0.0854\` at 1400x900) draws L1 at about 1:1 device
pixels, so L0 is headroom. First placement inside the capital envelope
was hidden by the D05 city/environment plates; the dev placement is now
\`(0.38, 0.22)\`. Committed \`c3cb2f6\`. **1,3 first attempt REJECTED**
(R083): 1,2's beck DOES reach its south edge (world x \`2954–3029\`, 75 px)
and the brief said nothing wet arrives — the director's error; plus rock
lighting \`0.288\`. **Attempt 2 DISPATCHED** on \`brief-c1-3-r2.md\` (the
beck required, flat slab faces, the sound edge to edge, one fall; the inlet a
few crowns wide at the crossing as the director's default). **Lock-change
item 5i:** the packet must list the neighbours' crossings at every shared
edge as arriving water. Next after 1,3: 0,3, 0,2 (submerged run), 4,1
(brief ready), then row 0; whole-territory review at the end.

`;
  if (!t.includes("SESSION 4, AFTERNOON")) { t = t.replace(anchor, block + anchor); console.log("state: afternoon block inserted"); } else console.log("state: present");
  const lines = t.split("\n");
  const set = (prefix, text) => { const i = lines.findIndex((l) => l.startsWith(prefix)); if (i >= 0) lines[i] = text; };
  set("| 21 |", "| 21 | \"the next step is all the layers of the pyramid?\" / \"shouldnt we test the LoD out then\" | CLOSED: pyramid tiers are written by every stitch; offline check (R081) and the runtime streaming test (R085) both pass; dev feed `?landStream=l2dev` |");
  set("| 22 |", "| 22 | (director-found) the capital's shelf did not land in 2,1 though every gate passed | CLOSED: owner 'agreed' → replaced on brief r2 and accepted (R084) |");
  if (!lines.some((l) => l.startsWith("| 23 |"))) { const i = lines.findIndex((l) => l.startsWith("| 22 |")); lines.splice(i + 1, 0, "| 23 | (director-found) 1,3's brief denied the beck 1,2 delivers at the shared edge | attempt 2 in flight; lock-change 5i: arriving crossings listed by the packet |"); }
  fs.writeFileSync(p, lines.join("\n")); console.log("state: rows updated"); }
{ const q = ".codex-tmp/session3/next-lock-change.md"; let u = fs.readFileSync(q, "utf8");
  if (!u.includes("## 5i.")) { u += `

## 5i. Arriving water crossings listed in the packet — cell.mjs (R083)

The continuity gate already computes each authored neighbour's crossings on
the shared line (\`theirs\` in the bridge block). Put them in the packet under
Transitions: "water arrives at your NORTH edge at about 46% along it, 75 px
wide (a beck): continue it" — so no brief can deny what the paint delivers.
1,3's first attempt was lost to exactly that. Control: a dry run for a cell
whose authored neighbour has a crossing on the shared line asserts the line.
`; fs.writeFileSync(q, u); console.log("draft: 5i added"); } else console.log("draft: 5i present"); }
