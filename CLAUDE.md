# Working rules for this repo (owner: Steve)

- **Commit on a cadence, not only at landings.** Commit whatever is working at
  least every ~30 minutes of work and at every accepted step, on the lane
  branch, with a plain message. Uncommitted files cost context on every
  sub-agent and are lost when a session or a model budget ends. Never push
  unless asked. Scratch tooling that a session's STATE cites gets a tracked
  copy under `docs/career-world/` (the `.codex-tmp/` tree is gitignored).
- **Career World work resumes from `docs/career-world/STATE.md` only.** Read
  its RESUME block first; `tools/world-authoring/` is solidified (owner
  approval before and after any edit, recorded with `check-solidified.mjs`).
