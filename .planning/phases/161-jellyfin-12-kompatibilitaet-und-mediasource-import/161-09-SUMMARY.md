---
phase: 161-jellyfin-12-kompatibilitaet-und-mediasource-import
plan: "09"
subsystem: verification
tags: [jellyfin, live-evidence, regression, postgres, frontend, security]
requires:
  - phase: 161-08
    provides: Source-coherent playback, persistence and public technical projection
provides:
  - Bounded live caller and full 11eyes inventory proof
  - Exact original-baseline comparison with executed guarded database gates
  - Per-fix compatibility report and immutable execution revision evidence
  - Authoritative editor save reconciliation preserving concurrent drafts
affects: [161-independent-verification, 160]
tech-stack:
  added: []
  patterns:
    - Read-only provider probes with whitelisted output and secret checks
    - Frozen-source gates distinguished from subsequent scoped corrections
key-files:
  created:
    - scripts/check-jellyfin12.py
    - scripts/tests/test_check_jellyfin12.py
    - docs/audits/2026-09-15-jellyfin12/regression-comparison.json
    - docs/audits/2026-09-15-jellyfin12/execution-commits.json
    - docs/audits/2026-09-15-jellyfin12/editor-reconciliation-checks.json
  modified:
    - docs/audits/2026-09-15-jellyfin12/RESULTS.md
    - .planning/phases/161-jellyfin-12-kompatibilitaet-und-mediasource-import/161-VALIDATION.md
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.test.tsx
key-decisions:
  - Compare failure identities to the original baseline; unrelated failures are not represented as passing.
  - Derive the saved editor baseline from the server response and merge only draft fields unchanged since submission.
  - Preserve old row contents and human UAT status; filesize and chapter work is a separate follow-up.
requirements-completed: [P161-AUTH, P161-API, P161-ITEMS, P161-SOURCE, P161-METADATA, P161-REGRESSION]
duration: approximately 25min for final gate closure, excluding earlier verifier preparation
completed: 2026-09-15
---

# Phase 161 Plan 09: Integrated Jellyfin compatibility evidence Summary

**Actual Jellyfin 12 callers and all 27 11eyes items are verified with bounded reads, executed source-persistence tests, exact baseline accounting and a per-fix report.**

## Accomplishments

- Task 1: The existing small Python verifier uses only bounded GETs, origin-bound in-memory header authentication, no redirects, explicit response/request budgets, whitelisted output and a fail-closed secret check. It checks the running schema, exact metadata, ordered Buddy paging, group scope, images, video Range, subtitle and public API routes. Its four stdlib boundary tests pass.
- Live final run at a4be0224: 26 GETs, failures empty. Buddy: 13 items and pages 5+5+3 agree; 11eyes: 27 actual items / 38 sources / 11 non-item alternatives have 27 unique own-path bindings. Two 64-byte Range requests to one actual 11eyes item return distinct selected MKV/MP4 sources. No live import, save, render, relink or rescan.
- Task 2: Frozen backend gates at 64340e93 execute all 277 top-level tests from touched Go test files across six packages, 554 pass events, zero failures/skips/not-executed. Actual guarded PostgreSQL source/import/editor/playback/public fixtures run; no required DB skip counts as proof.
- Broad backend failures match all 50 original headings exactly, none added/removed; 2015 pass events and 277 unrelated fixture skips. Build ./... and vet ./... pass.
- Final frontend rerun at 3e410901: 2748 passed, the same 2 CSS failures and 3 existing TODOs. Changed test files plus central auth tests account for 127 passes. Typecheck retains the same 2 Next errors; full lint retains exactly 13 errors / 328 warnings; scoped lint 0 errors / 2 old warnings. Isolated NODE_ENV=production build compiles then hits the same invalid formatEditLoadError Page export.
- All 818 tracked backend source/module files matched active /app at 64340e93. Six audited source/import tables retain the exact original 13 rows each and identical content hashes. Hash scope is explicit; no full-database immutability claim.
- Root's authenticated in-app browser followed the existing admin/editor navigation and public release routes 40/48. Audio fallback is visible, layout retained, stored URL output sanitized; active session is distinct from automated refresh-only proof.
- RESULTS.md links each fix to its actual file/function, cause, implementation and test. First failed final gates remain in attempt1 artifacts. Raw sanitized logs remain locally gitignored as in the baseline; committed JSON retains commands, selected tests, exact failures and diagnostic tails.

## Commits

| Work | Commits |
|---|---|
| Read-only verifier, four boundary tests and corrected CollectionFolder assertion | a9086c6a |
| Include both reported public releases | 53d4fbf9 |
| Verify two distinct live 11eyes source streams | dc388b97 |
| Real fixture metadata and guards following shared selector | 37a9fed0 |
| Bound existing public projection test to its own OpenAPI operation | 64340e93 |
| Independent finding: authoritative save response reconciliation | RED e4548ae4; GREEN 3e410901 |
| Independent finding: public selector privacy | RED 6d6eaf59; GREEN 718ebf57 |

Full discovery/implementation chronology from b3b07ff0, including earlier plan commits and their exact files, is in execution-commits.json. Per-task RED/GREEN details remain in Summaries 01–08. Final evidence, planning closure and the independently authored verification report are recorded together in the final documentation commit.

## Bounded Corrections and Verification

**[Rule3 — Fixture and guard regressions]** First broad final run found seven added top-level failures. Two isolated fixture setups lacked the real stream_sources.metadata column; three source guards expected SQL inline before the shared selector extraction. Changed only five affected repository test files, retaining ownership, stored-source-kind, selected variant and Jellyfin precedence checks. Exact seven-test gate: 7 top-level / 23 pass events, 0 fail/skip; repository vet and diff check pass. Commit 37a9fed0. No runtime compatibility SQL or schema migration.

**[Rule3 — Contract test boundary]** The existing v12-projection assertion scanned beyond its OpenAPI operation into a later documented response. Root restricted the test to its actual path/operation and retained all field assertions. Six tests pass; only its two existing lint warnings. Commit 64340e93.

**[Rule3 — Isolated build environment]** First final harness inherited development NODE_ENV. Explicit production mode restores a comparable isolated build: successful compilation followed by the original Page-export failure. No .env copied, dev .next touched or dependency installed.

**[Rule1 — Independent editor finding]** A→B relink saved B duration 20 while leaving A duration 10 in formState; the next ordinary full/metadata save could overwrite B. Root assigned the existing hook correction. RED added five cases: three fail for absent response reconciliation, while two retained draft-preservation controls already pass. GREEN maps the actual response with buildInitialFormState, baselines actual server fields/groups, merges only unchanged submitted fields, and preserves later title/duration edits, newer file selection and metadata-only binding/group drafts. 20 hook + 32 refresh + 9 token tests pass (61 total), zero skips; scoped lint 0/0; full frontend rerun documented above.

**[Rule1 — Independent public-output finding]** The public EpisodeVersion GET serialized the private MediaSourceID for a bound row. Root added a failing real DB HTTP fixture, then clears that field only in the public response copy. Authorized source create/update responses still carry their selector and stored fixture rows remain unchanged. Canonical/focused response contracts explicitly exclude the field publicly; existing js-yaml parses the canonical response rule. Separate acceptance at 718ebf57: 4 top-level / 61 pass events, zero skips/failures; handler vet passes. It can contain unrelated quick source additions in the shared container; it is a scoped boundary proof, not a repeated full-tree gate. The broad backend 64340e93 and frontend 3e410901 evidence retains its original exact revision.

## Request and SQL Budgets

- Preview: one collection request; real 27-item fixture and 26 after coverage.
- Apply: 0/1/100/101/201 confirmed items produce 0/1/1/2/3 provider requests, and zero/one batch binding query. 201 bindings are read in one traced statement.
- Public/release/theme selected-source projections: one SQL statement/one row, including 201 subtitle tracks; zero provider requests.
- Editor metadata-only/same-binding save: zero provider requests. Explicit source hydration: one exact-item request. GetByID adds one fixed binding read for Jellyfin; scan batches bindings.
- Bound release video: one video GET, zero metadata; unbound release: one metadata plus one video.
- Bound queue/grant: zero metadata; unbound: one metadata before cache lookup. Later worker independently performs one metadata GET and at most one subtitle GET.
- URL output sanitizer and frontend response reconciliation introduce no HTTP or SQL requests.

## Evidence Limits

- Current old rows were not backfilled. Source snapshots/subtitles missing from public 40/48 remain missing; Japanisch is audio display policy, not restored provider data.
- Current release 48 is episode 12, whereas Nice Coupling currently belongs to editor variant 28 / episode 2. Older screenshot values are not assumed to identify the current row.
- The current missing-size projection and requested chapters are separate follow-up work; neither is claimed as implemented by Phase 161.
- No all 38-file import or actual rescan proof. Unique stable path recovery does not prove arbitrary replacement/move content identity.
- The first cold subtitle timeout remains recorded; subsequent and final reads pass.
- Source fingerprint drift is covered. Preexisting queued window/profile versus later offsets comparison remains outside this source-identity change.
- Go race instrumentation cannot run without gcc/CGO. Full focused DSL YAML parsing has existing syntax errors; canonical OpenAPI and relevant fragments are tested.
- Browser auth uses the real active session; refresh-only state is covered automatically. Existing human 156/157 sign-offs remain valid; open 158/159 anime UAT remains unchanged. No Phase 160 execution or push.
- No new endpoint, authentication mechanism, schema or provider-driven filesystem write was introduced. All planned live-diagnostic and source/output trust boundaries are explicit.

## Independent Verification

[161-VERIFICATION.md](161-VERIFICATION.md) was written by an agent who did not implement Phase 161. The independent verifier confirmed 16/16 observable truths, technical_status passed and gaps empty. Both concrete findings have RED/GREEN corrections and measured acceptance. GSD status human_needed retains the unperformed live import/relink/rescan/playback checks; it does not reopen technical implementation. Human UAT is not signed off by this summary.

## Planning bookkeeping

The installed Linux GSD wrapper updated all six requirements and the 9/9 roadmap count. The Phase 161 sections and session note were updated directly because generic state.advance-plan/update-progress would target historical Phase 156/milestone counters. Those unrelated counters and other phases were preserved. Existing human 156/157 sign-offs remain valid; no Phase 160 start or quick bookkeeping is included.

## Self-Check: PASSED

The listed source/test/evidence files and task commits exist in canonical Git. Final backend and frontend evidence records its exact frozen revision; required fixtures executed without skips. The report distinguishes broad baseline errors and separate follow-up work.
