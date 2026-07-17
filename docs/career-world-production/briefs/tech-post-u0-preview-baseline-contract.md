# Career World post-U0 preview-baseline contract

Status: required contract; no post-U0 receipt or browser evidence exists yet.

This contract supersedes only the preview-binding and repeated byte-equality clauses that pointed at `docs/career-world-production/reports/tech-implementation-baseline.json`. That report remains immutable historical evidence at 10,162 bytes and file SHA-256 `7FACF4FBCBD51BB4257C9B02E728320CEC675ADB2308225EA3A6CDE33B90E6F5`; it internally records the 36-file pre-implementation aggregate SHA-256 `a66a89065e752f9ec4d10ac3371e940217640a88270052a0f82704743022fd97`. It is not the implemented-site digest and its URL or evidence namespace must not be used for U0 acceptance or R0 proof.

## Required receipt

After U0 finishes its owned source and test edits and its deterministic gates are green, but before U0 runtime validation or canonical R0 browser capture, `/root` must write:

`docs/career-world-production/reports/tech-post-u0-preview-baseline.json`

The receipt is generated from the exact post-U0 product, test, app-entry, package/configuration, registry/asset-map, promoted-art binding, and accepted implementation-contract inputs. It excludes itself, phase reports that may record later browser results, and the evidence namespace to avoid self-reference.

The receipt must contain:

- `schema_version`, `run_id`, `status`, `created_at`, and owner `/root`;
- the accepted P0 predecessor-envelope ID plus exact U0 owned source/test additions, modifications, and deletions with before/after byte counts and SHA-256 values;
- the final promoted-art digest and its source receipt;
- the exact normalized controlled-file list with decimal byte counts and lowercase SHA-256 values;
- the same aggregate algorithm as the immutable initial baseline: ascending ordinal UTF-8 path order and records encoded as `path + NUL + bytes + NUL + sha256 + LF`;
- the resulting file count, total bytes, and aggregate SHA-256;
- a `browser_proof` object with `start_command: "npm.cmd run dev"`, required listener `http://127.0.0.1:3000/`, preview URL `http://127.0.0.1:3000/?cw-preview=<post-u0-aggregate-sha256>`, artifact namespace `docs/career-world-production/evidence/CW-007/browser/root/<post-u0-aggregate-sha256>/`, and scenario rule `<artifact-namespace>/<qa-matrix-id>/`;
- explicit confirmation that no package, dependency, or shared browser-runner configuration change was introduced outside an accepted owner fence;
- the exact commands and results used to recompute all file and aggregate receipts.

The aggregate must bind every source/configuration byte that can affect the emitted Career World preview. A path may be omitted only when the receipt states why it cannot affect that preview and the omission is accepted before browser capture. Generated build caches and browser evidence are outputs, not aggregate inputs.

## Freeze sequence

1. U0 stops source/test editing; `/root` verifies U0's exact owned source/test delta against the accepted P0 envelope and verifies every non-owned/protected implementation path against P0.
2. All U0 deterministic gates pass from that exact source state.
3. `/root` independently recomputes the controlled file receipts and writes the post-U0 preview-baseline receipt.
4. `/root` recomputes the receipt's aggregate immediately before server start, starts the existing app, and verifies the emitted listener is exactly `http://127.0.0.1:3000/`.
5. U0 runtime scenarios run against the digest-bound preview. U0 records summaries and the frozen receipt reference in its report; canonical CW-007 artifacts remain R0-owned.
6. U0 finalizes its report. Only then does `/root` or the Director issue an external handoff envelope containing that report's final byte count/SHA-256, the post-U0 receipt byte count/SHA-256, and the controlled-source aggregate. The report and receipt are excluded from their own digests.
7. U0 is accepted only when the external handoff envelope, post-U0 preview-baseline receipt, and runtime summaries all name the same source state and aggregate.
8. R0 independently recomputes the aggregate before capture, uses only the receipt-derived URL and namespace, and recomputes the aggregate after capture.

No product, test, package, configuration, contract-input, or promoted-art binding may change while the preview is frozen. If a fix is required, `/root` invalidates the receipt and its namespace, U0 reopens only within its owned paths, all affected gates rerun, and a new aggregate, URL, namespace, and receipt are issued. Evidence from the invalidated namespace cannot be promoted.

## Lane predecessor and delta receipts

The initial baseline is the historical starting receipt. C0 acceptance supersedes its two composition-packet entries and adds this contract; F0's start receipt must bind the Director-accepted C0 bytes while proving every other initial-baseline path still equals the immutable starting receipt. The Director handoff envelope is the C0 acceptance receipt and must carry the exact byte counts and SHA-256 values for the corrected brief, machine report, and this contract; the machine report cannot embed its own final hash without self-reference.

Every implementation phase report must record the controlled implementation delta, excluding the phase report itself:

- one accepted predecessor receipt ID and its aggregate or controlled-file-set digest;
- its exact owned implementation path set, with its administrative phase report path listed separately;
- added, modified, and deleted owned implementation paths with before/after byte counts and SHA-256 values;
- a zero-diff result for every non-owned controlled path against the accepted predecessor;
- a zero-diff result for all protected paths;
- a successor controlled-file-set digest and exact gate commands;
- no unexpected implementation path outside the owned set.

After the phase report is final, `/root` or the Director issues an external handoff envelope containing the report's final byte count/SHA-256 and its declared controlled-source successor digest. The phase report and envelope are never included in that phase's own controlled-source digest. The next phase binds the external envelope, which removes report self-reference.

### External handoff envelope schema

The envelope is a coordination receipt, not an implementation file. Its top level is exactly `{ "envelope_id": string, "payload": object }`. The payload contains `phase_id`, `predecessor_envelope_id`, the final report path/byte count/SHA-256, controlled-source file count/total bytes/aggregate SHA-256, the exact owned implementation after-path/byte-count/SHA-256 records, the protected/non-owned verification result, gate result, issuer, and acceptance status. `envelope_id` is SHA-256 over the UTF-8 canonical JSON serialization of `payload` only, with recursively ordinal-sorted object keys and no insignificant whitespace; `envelope_id` is appended after hashing and is never part of its own digest input.

The Director handoff is authoritative until the direct successor persists the complete envelope verbatim in its `predecessor_envelope` block. Every parallel M0/G report persists the same F0 envelope. I0 persists all eight accepted lane envelopes plus the reconstructed composite. R0 persists the accepted U0 envelope. A copied envelope whose canonical payload hash does not equal `envelope_id` is invalid. Because only `payload` is hashed, and the envelope is created after report finalization and stored by a successor, neither artifact hashes itself.

F0, I0, P0, and U0 form a serial predecessor chain. M0 and G0-G6 all branch from the same accepted F0 envelope. Each parallel report and external envelope freeze exact after-bytes/hashes for only that lane's reserved implementation paths. Peer-reserved outputs may concurrently exist in a shared working directory, but they cannot enter another lane's attributed delta or predecessor. After all eight owners are idle and accepted, `/root` reconstructs the composite as exact F0 bytes plus each lane's exact accepted after-bytes/hashes, verifies every live path in the union against its owning envelope and every live path outside the union against F0, then freezes the reconstructed aggregate as I0's sole predecessor. This exact reconstruction, not attribution by observation, makes the shared-worktree merge reproducible.

A phase may not treat another live lane's unaccepted bytes as its predecessor. Missing envelopes, report self-reference, an out-of-fence lane-attributed implementation change, a non-owned/protected mismatch attributable to that lane, a live union byte that differs from its accepted lane envelope, an unexpected deletion, or a stale predecessor is a stop condition.

## R0 admission

R0 may start only after all of the following are true:

- U0 is accepted;
- the U0 external handoff envelope's final report and post-U0 receipt byte counts/SHA-256 values recompute;
- CW-005 and CW-006 exit gates are accepted;
- the post-U0 preview-baseline receipt exists and parses;
- every listed byte/hash and its aggregate recomputes exactly;
- the preview URL and artifact namespace are derived from that aggregate exactly;
- `/root` owns the server and evidence namespace;
- no source/configuration edit has occurred after the freeze.

The immutable initial `a66a8906...` URL and namespace fail R0 admission because they identify the pre-implementation tracer, not the implemented site.
