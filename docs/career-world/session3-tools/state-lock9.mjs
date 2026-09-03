import fs from "node:fs";
const p = "docs/career-world/STATE.md"; let t = fs.readFileSync(p, "utf8");
const a = "Lock change 8 (the two limits) stays\nstaged and is moot unless the seam is solved.";
const r = "**LOCK CHANGE 9 LANDED** (owner: \"if you think its needed go ahead\" /\n\"min cut is fine here\"; commit `54927a8c`; approval recorded before and\nafter; suite 20/20 with three new controls): content-aware seams between\nauthored cells (minimum-error cut within 128 px, corners pinned) and\n`--restitch`. **RESTITCH OF THE 19 ACCEPTED CELLS IN PROGRESS**\n(`.codex-tmp/session3/restitch-world.sh`, log `restitch-world.log`); then\nthe dev feed, after-strips at every seam for the owner's eye, R108. Lock\nchange 8 (the two limits) follows, then `--redo` 2,0 candidate 4.";
if (t.includes(a)) { t = t.replace(a, r); console.log("state: lock 9 recorded"); } else if (t.includes("LOCK CHANGE 9 LANDED")) console.log("present"); else throw new Error("anchor missing");
const lines = t.split("\n"); const i = lines.findIndex((l) => l.startsWith("| 32 |"));
if (i >= 0) lines[i] = "| 32 | \"the seam on this one is too noticeable\" / \"trees and other features are legit cut in half\" (strip of the 2,0 candidate-4 west seam against 1,0) | LANDED as lock change 9, content-aware seams (`54927a8c`, suite 20/20); the world restitch is running; owner's eye on the after-strips next |";
fs.writeFileSync(p, lines.join("\n")); console.log("state: row 32 updated");
