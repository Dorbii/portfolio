import fs from "node:fs";
const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
const a = "## Where things stand (one paragraph)\n\n";
const add = "**2026-09-02, night (current):** the NinjaOne L2 land territory is **20 of 20 cells** on `codex/land-lod-completion`, tree clean, nothing pushed; seams are content-aware (lock change 9) and the world is restitched; the owner has accepted the result and authorised the next step (whole-territory review at reduced zoom, then the territory tier). **Resume from the block titled `SESSION 4, NIGHT (2026-09-02) — RESUME HERE, ANY MODEL`** further down; the paragraph below it is the older D06 arc, kept for history.\n\n";
if (!t.includes(a)) throw new Error("anchor missing");
if (!t.includes("2026-09-02, night (current)")) { t = t.replace(a, a + add); fs.writeFileSync(p, t); console.log("paragraph updated"); } else console.log("present");
