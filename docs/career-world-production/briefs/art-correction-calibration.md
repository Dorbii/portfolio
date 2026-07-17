# CW-004 D-013 calibration generation brief

State: `WAITING_FOR_LFS_AND_ARCHIVE_VALIDATION`

This is a text-only preflight packet for exactly three calibration candidates. It creates no rejected archive, no candidate directory, no PNG, and no image-generation call. The storage lane reports PASS and local path-level Git attributes report LFS routing for all six planned binary paths, but archive byte preservation and independent validation have not occurred; therefore neither archive copying nor generation is released.

## Exact scope

| Calibration asset | Failure class | Generation lane | Independent reviewer | Derived prompt SHA-256 |
|---|---|---|---|---|
| `project/contextforge@v1` | `primary_topology` | `r1-generation-a` | `r1-qa-1` | `0D9B871AB568BC1392BE62C66E0698D4F18A6B8B44A84500C0D0D0E0D121CFBF` |
| `skill/openapi@v1` | `generated_text_or_branding` | `r1-generation-b` | `r1-qa-2` | `7C8DB51B9AD60C1235061659BC59C8471C5DA594F1D499D0687E240C7196C01A` |
| `skill/workflow-orchestration@v1` | `primary_topology` | `r1-generation-c` | `r1-qa-3` | `915E571152B78A67CD499809BCC84C36BC2BDC9BED1113FC52377C6D2F30C126` |

The three generation lanes and three reviewer lanes are pairwise unique. Reviewers must be independent from generators and rerun the full frozen nine-gate contract; they do not review only the repaired gate.

## Prompt ruling

Each exact prompt is stored in the companion packet and hashed over its decoded UTF-8 bytes with LF line endings and no trailing newline. The art-direction change supersedes only the source multi-panel composition/framing, cross-panel LOD clauses, and sheet-style palette presentation. The D-013 no-input line is an execution constraint, not an identity/style supersession. Asset identity, all nonfailed primary forms, projection, authored orientation, technical-cartography style, palette ownership or neutrality, lighting, materials, evidence boundary, avoid list, and source easter-egg rule remain binding.

Each prompt asks for one large unoccluded canonical hero, makes the independent-QA invariant highest priority, bans all image text and sheet furniture, and applies source palette values to geometry only.

## Per-asset paths and immutable v0 facts

### project/contextforge@v1

- Source generation: `art-batch-b`, packet index `4`, report `docs/career-world-production/reports/art-generation-batch-b.json`
- Source prompt SHA-256: `BD3A46FD892479074087D55CD6A759B23600AB0C2200FCBBB095CF85BD97833D`
- Immutable v0: `design/career-world/concepts/projects/contextforge-v1.png`, SHA-256 `A758DC9EEFF9847D91994EA9E071BA9D54200453465D2F1D6562847B2D7D76E2`, 1536x1024, 1905694 bytes
- Independent source QA: `art-qa-3`, `REGENERATE`, gates `canonical_panel_and_primary_topology`, `primary_form_traceability`
- Required invariant: One fully visible, unmistakable L-shaped fabrication-hall footprint carries the sawtooth vault bank, with the offset tower at the elbow and the diagonal bridge landing on the cylinder.
- Planned rejected evidence: `design/career-world/rejected-candidates/cw004-v0/projects/contextforge-v0-a758dc9eeff9.png` (absent)
- Planned r1 candidate: `design/career-world/correction-candidates/cw004-r1/projects/contextforge-r1.png` (absent)

### skill/openapi@v1

- Source generation: `art-batch-b`, packet index `12`, report `docs/career-world-production/reports/art-generation-batch-b.json`
- Source prompt SHA-256: `B08BFAC1AFA9D4F3F069EFB26ED944BDB27159BBC9AD93FA3667B82F323E8D75`
- Immutable v0: `design/career-world/concepts/skills/openapi-v1.png`, SHA-256 `30737E30E3124A2F75A0B877EE2597E99A19DB002D41B5D94E16FFD603A32481`, 1024x1536, 2126014 bytes
- Independent source QA: `art-qa-2`, `REGENERATE`, gates `text_logo_watermark_absence`
- Required invariant: The whole PNG contains no caption, word, letter, number, legend, pseudo-text, logo, watermark, or marked sign plane.
- Planned rejected evidence: `design/career-world/rejected-candidates/cw004-v0/skills/openapi-v0-30737e30e312.png` (absent)
- Planned r1 candidate: `design/career-world/correction-candidates/cw004-r1/skills/openapi-r1.png` (absent)

### skill/workflow-orchestration@v1

- Source generation: `art-batch-c`, packet index `7`, report `docs/career-world-production/reports/art-generation-batch-c.json`
- Source prompt SHA-256: `32B1C9776A03D802F85E8CE0381AD144F29699CA4AF6A4C1459E8613E69E3F93`
- Immutable v0: `design/career-world/concepts/skills/workflow-orchestration-v1.png`, SHA-256 `912DCE71CA8E18845DAAC5007B83CB8C831F1713C89CD915956699D99BD3D586`, 1536x1024, 2318262 bytes
- Independent source QA: `art-qa-1`, `REGENERATE`, gates `canonical_panel_and_primary_topology`, `primary_form_traceability`
- Required invariant: Exactly six distinct staggered low service bays surround the tall central drum with one interrupted ring ramp.
- Planned rejected evidence: `design/career-world/rejected-candidates/cw004-v0/skills/workflow-orchestration-v0-912dce71ca8e.png` (absent)
- Planned r1 candidate: `design/career-world/correction-candidates/cw004-r1/skills/workflow-orchestration-r1.png` (absent)

## Frozen closure and hold

The nonblocked 45-row freeze digest is `2DC46F2CCEA1B4AD47480FE2254692D150AFE631840E3786F600B729C617573D`. The exact 56 canonical-closure digest is `D785AE233EAB09BFF84DD71D62F2085E2AA00F0683AC3A5ADFE1436A5E0FB2F3`. The companion report contains all 45 frozen rows and their current hashes.

The remaining eight blocker IDs are held and unreleased:

- `city/ninjaone@v1`
- `project/tanium-risk-assessment@v1`
- `project/vendy-vm-platform@v1`
- `skill/atlassian@v1`
- `skill/context-compression@v1`
- `skill/java@v1`
- `skill/operator-control@v1`
- `skill/react@v1`

No r2, product, runtime, test, public, 3D, promotion, retry, or second call is authorized. A technical tool failure does not create permission for another call; it stops the asset and returns to the Director.

## Required next gate

Independent QA must validate this text freeze and the Director must separately release storage work. Only after release may an executor create and byte-verify each rejected-v0 archive. No image call may occur until that archive hash equals the corresponding canonical v0 hash and the candidate path is confirmed absent.
