#!/usr/bin/env node
/**
 * Hash gate for the solidified world-authoring pipeline.
 *
 *   node tools/world-authoring/check-solidified.mjs
 *   node tools/world-authoring/check-solidified.mjs --approve "owner approved: <reason>"
 *
 * Files in this directory encode invariants that are expensive to rediscover.
 * This fails closed if any of them change without the owner recording approval,
 * so an agent cannot quietly refactor the pipeline it is being run by.
 *
 * It is deliberately not clever. A determined agent could run --approve itself;
 * the point is that doing so is an explicit, logged, obviously-deliberate act
 * rather than an accident, and the approval log makes it reviewable.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DIR = "tools/world-authoring";
const LOCK = path.join(DIR, "solidified.json");
const WATCHED = ["cell.mjs", "plan-territory.mjs", "AGENTS.md"];

const sha = (f) =>
  crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex").slice(0, 16);

const current = Object.fromEntries(
  WATCHED.filter((f) => fs.existsSync(path.join(DIR, f)))
    .map((f) => [f, sha(path.join(DIR, f))]),
);

const approveIdx = process.argv.indexOf("--approve");
if (approveIdx >= 0) {
  const reason = process.argv[approveIdx + 1];
  if (!reason) {
    console.error("\n  --approve requires a reason describing what the owner approved.\n");
    process.exit(1);
  }
  const prev = fs.existsSync(LOCK) ? JSON.parse(fs.readFileSync(LOCK, "utf8")) : { history: [] };
  const lock = {
    solidifiedAt: new Date().toISOString(),
    note: "Changing these files requires owner approval BEFORE the change. See AGENTS.md.",
    hashes: current,
    history: [
      ...(prev.history || []),
      { at: new Date().toISOString(), reason, hashes: current },
    ],
  };
  fs.writeFileSync(LOCK, JSON.stringify(lock, null, 1));
  console.log(`\n  approved and re-locked: ${reason}`);
  for (const [f, h] of Object.entries(current)) console.log(`    ${f.padEnd(22)} ${h}`);
  console.log();
  process.exit(0);
}

if (!fs.existsSync(LOCK)) {
  console.error(`\n  ${LOCK} missing — the pipeline has never been locked.`);
  console.error(`  Run with --approve "initial lock" to establish the baseline.\n`);
  process.exit(1);
}

const lock = JSON.parse(fs.readFileSync(LOCK, "utf8"));
const drift = [];
for (const f of WATCHED) {
  const was = lock.hashes[f];
  const now = current[f];
  if (was && !now) drift.push(`${f}: DELETED`);
  else if (!was && now) drift.push(`${f}: ADDED without approval`);
  else if (was !== now) drift.push(`${f}: MODIFIED (${was} -> ${now})`);
}

if (!drift.length) {
  console.log(`\n  world-authoring pipeline intact (${WATCHED.length} files, locked ${lock.solidifiedAt}).\n`);
  process.exit(0);
}

console.error(`\n  SOLIDIFIED PIPELINE CHANGED WITHOUT APPROVAL\n`);
for (const d of drift) console.error(`    ${d}`);
console.error(`
  These files encode invariants that are invisible in any single file:
  one-cell-per-process, derived tiers never hand-authored, gates before
  stitching, power-of-two alignment. See ${DIR}/AGENTS.md.

  If the owner approved this change, record it:
    node ${DIR}/check-solidified.mjs --approve "owner approved: <reason>"

  If they did not, revert it.
`);
process.exit(1);
