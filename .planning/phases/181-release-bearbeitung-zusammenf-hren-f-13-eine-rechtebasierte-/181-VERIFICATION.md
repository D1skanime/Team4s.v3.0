---
phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-
verified: 2026-10-14T11:10:00Z
status: human_needed
score: 8/8 explicit must-haves verified (plus 1 code-review-derived escalation item, see below)
overrides_applied: 0
human_verification:
  - test: "Decide disposition of REVIEW.md WR-01 (dashboard attention-card link can leave the shared editor blank for a release-level capability combination that has can_edit_metadata=true but no segmente/media/notizen capability)"
    expected: "Either (a) accept as a documented, narrow, pre-existing limitation and open a tracked follow-up to add 'informationen' to the visibleActiveTab fallback chain in EpisodeVersionEditorPage.tsx, or (b) require the one-line fallback-chain fix before closing the phase."
    why_human: "This is a product/risk judgment call, not a pass/fail code check: the bug is reproducible in the code (confirmed by the verifier) but only reachable through a release-level capability combination (metadata-only, no segments/media/notes) that does not exist in the current default role_capabilities seed (per database/migrations/0159_role_capability_defaults_reset.up.sql, every contribution role also holds release_version_media.view and release_version.notes.write) and would currently require a per-actor/per-group effective_rights_override to construct. Severity depends on whether such overrides are used in practice today — a judgment the codebase alone cannot answer."
  - test: "Decide whether REVIEW.md WR-02 (no negative/regression test for the exact-match property of getSafeReturnPath's two new allowlist entries, e.g. '/me/dashboard-evil') should be added before or after closing the phase"
    expected: "Either add the suggested negative test now (low effort, mirrors the existing rejection test pattern at page.test.tsx:568) or explicitly accept the residual regression risk and track it as a follow-up."
    why_human: "Judgment call on test-coverage risk tolerance, not a functional defect — current behavior is correct (confirmed fail-closed via exact `===` checks), only a future accidental refactor is unguarded."
---

# Phase 181: Release-Bearbeitung zusammenführen (F-13) — Verification Report

**Phase Goal:** `/admin/episode-versions/[versionId]/edit` (unchanged layout) becomes the single
release-editing surface; all entry points that today point at
`/me/releases/[id]/workspace` retarget there instead (with `return_to`), and the old
workspace URL permanently redirects. Binding decisions D-01..D-05 from `181-CONTEXT.md`
(NEUSTART, replacing the fully-reverted first attempt).

**Verified:** 2026-10-14T11:10:00Z
**Status:** human_needed
**Re-verification:** No — initial verification (no prior `181-VERIFICATION.md` existed)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All 5 former `/me/releases/[id]/workspace` entry points now build `/admin/episode-versions/{id}/edit` hrefs (D-02) | ✓ VERIFIED | Read all 5 call sites directly: `attentionHelpers.ts:34` (`resolveWorkspaceHref`), `AttentionSection.tsx:172`, `[fansubGroupId]/page.tsx:351`, `ContributionCard.tsx:100`, `AnimeGroupCard.tsx:280` — all build `/admin/episode-versions/${id}/edit?...` hrefs. `grep -rFn 'me/releases/${' frontend/src` returns zero matches outside the redirect module's own comment string. |
| 2 | Each retargeted link's `return_to` matches its origin and `getSafeReturnPath` accepts the two new exact paths, fails closed otherwise (D-02) | ✓ VERIFIED | `getSafeReturnPath` in `EpisodeVersionEditorPage.tsx:71-93` adds `isMemberDashboard`/`isMemberContributions` as exact (`===`) checks inside the existing fail-closed `if (!A && !B && !C && !D) return null` gate. Live test run: `page.test.tsx` 20/20 pass including the 2 new acceptance tests (`/me/dashboard`, `/me/contributions`) and 1 rejection test. User-approved live UAT checks 2 and 3 (181-02-SUMMARY.md) independently confirmed "Zurück" returns to `/me/dashboard` and the project page respectively. |
| 3 | Visibility condition of all 5 links is unchanged (own confirmed `anime_contribution`); none gained a dependency on group-wide fansub capabilities (D-04) | ✓ VERIFIED | `ContributionCard.tsx:95` gate (`mode === 'confirmed' && release_version_id`) unchanged — only the href string changed. `AnimeGroupCard.tsx:276` gate (`entry.release_version_id !== null`) unchanged. Project page renders the button for every row in `visibleReleases` (page-level access already scoped to own project), unchanged. Dashboard links are driven by the pre-existing attention-card inclusion logic (unchanged). No new `getFansubGroupCapabilities`/group-wide check introduced anywhere in the diff. |
| 4 | `/admin/episode-versions/[versionId]/edit`'s own markup, tabs, and save/notes/media/segments logic are untouched outside the `return_to` allowlist (D-01) | ✓ VERIFIED | Read `EpisodeVersionEditorPage.tsx` in full: only `getSafeReturnPath` gained 2 new lines (`isMemberDashboard`, `isMemberContributions`) plus their inclusion in the combined guard. `allowedTabs`/`visibleActiveTab`/tab-rendering/save logic are byte-identical to pre-phase-181-restart state (confirmed against commit history — only the Plan-01 commit `5fcdec889` touches this file, and 181-01-SUMMARY.md's self-reported diff scope matches). |
| 5 | Visiting the old `/me/releases/{id}/workspace` URL returns an HTTP 308 permanent redirect to `/admin/episode-versions/{id}/edit`, with query params preserved (D-03) | ✓ VERIFIED | Live `curl -sI "http://192.168.235.196:3000/me/releases/27/workspace?tab=notizen"` run by this verifier returns `HTTP/1.1 308 Permanent Redirect` with `location: /admin/episode-versions/27/edit?tab=notizen`. `releaseEditorRedirects.mjs` wired into `next.config.mjs`'s `async redirects()`; `releaseEditorRedirects.test.ts` passes (1/1). |
| 6 | No file under `frontend/src/app/me/releases` remains; no source file anywhere references the workspace route (D-03) | ✓ VERIFIED | `find frontend/src/app/me/releases` → "No such file or directory". `grep -rn "me/releases/\[versionId\]/workspace" frontend/src` → only one hit, an explanatory comment inside `releaseEditorRedirects.mjs` itself (not a code reference). |
| 7 | The notes tab of `/admin/episode-versions/27/edit` still shows the `timer` role's note correctly — the "Keine Rollen zugeordnet" regression from the first attempt has not reappeared (D-05) | ✓ VERIFIED (human-gate, legitimately satisfied) | 181-02-SUMMARY.md's "Approved Checkpoint" section records explicit user confirmation ("Live-Checkpoint 181-02 vom Nutzer bestätigt... Punkt 1... zusätzlich von Claude im Browser als D1sk nachgeprüft"). Per task instructions, this blocking `checkpoint:human-verify` gate is treated as legitimately satisfied, not re-demanded. Cross-checked that 181-02-SUMMARY.md's record of the approval text matches STATE.md's independent log entry (line 1109) — consistent, not fabricated. |
| 8 | Full automated gate (tsc, tests) is green after the restart's changes (supports D-01/D-05 "zero behavior change" claim) | ✓ VERIFIED | Re-ran independently (not trusting SUMMARY narration): `tsc --noEmit` clean; targeted test suites (`releaseEditorRedirects`, admin editor `page.test.tsx` 20/20, `attentionHelpers`/`AttentionSection`/`ContributionCard`/`AnimeGroupCard` 35/35, project-page `page.test.tsx` 22/22) all pass live in the running `team4sv30-frontend` container. `npm run build` was deliberately NOT re-run per explicit orchestrator instruction (known `.next` volume corruption risk); relying on 181-02-SUMMARY.md's documented isolation proof (throwaway worktree + one-off container confirming the one build failure, digest `53468840` on `/_global-error`, predates this phase) — accepted as adequate evidence for this one item only, consistent with the instructions given to this verifier. |

**Score:** 8/8 explicit must-haves verified.

### Additional Finding — Not a Must-Have Failure, Escalated for Decision

A 9th, code-review-derived concern (REVIEW.md WR-01) was independently confirmed by this
verifier by reading the live source, not by trusting the review document:

**Finding:** `attentionHelpers.ts`'s `resolveWorkspaceHref()` (one of the 5 retargeted D-02
links, the dashboard "new assignment" card) always builds `tab=segmente` regardless of which
release-level capability the contributor actually holds for that specific release version.
`EpisodeVersionEditorPage.tsx`'s `visibleActiveTab` fallback chain (lines 249-257, confirmed
unchanged by this phase — pre-existing code) only tries `segmente → media → notizen`, never
`informationen`. A contributor whose only release-level grant is `can_edit_metadata` (no
segments/media/notes) would see every tab-content block evaluate false simultaneously —
a visually blank editor with no error message.

**Severity assessment (performed by this verifier, not just copied from REVIEW.md):**
I independently traced the default capability seed
(`database/migrations/0108_capability_registry.up.sql`,
`database/migrations/0156_release_metadata_timeline.up.sql`,
`database/migrations/0159_role_capability_defaults_reset.up.sql`). As of the latest seed
reset (0159), **every** contribution role (translator, timer, encoder, typesetter, editor,
designer, raw_provider, quality_checker, karaoke_fx, …) that has `release_version.view` also
has `release_version_media.view` AND `release_version.notes.write` by default — so
`allowedTabs` for any role-granted contributor currently always includes `media` and/or
`notizen`, and the fallback chain's gap is **not reachable through the default role
matrix**. It would only be reachable through a custom per-actor/per-group
`effective_rights_override` (migration 0150) that specifically grants metadata-update while
revoking media-view and notes-write — a configuration this verifier could not confirm exists
or does not exist in the live database from static code/migration inspection alone.

**Why this does not change the truths-table verdict above:** D-01 and D-05 require the
editor's own code to be unchanged by this phase — confirmed true (the fallback chain itself
is untouched, pre-existing code, not a new regression introduced by Phase 181). D-02 requires
the 5 links to land on the editor with a working `return_to` — confirmed true structurally and
via live UAT for the actually-tested scenario. The blank-page risk is a latent, pre-existing
gap in the editor that this phase's link-retargeting makes *newly reachable* for one specific,
currently-non-default capability combination — a genuine but narrow integration risk, not a
violation of any of the 5 stated decisions as literally written.

**Disposition:** Escalated to the developer for a decision (see `human_verification` in the
frontmatter) rather than classified as a BLOCKER, because (a) it requires a capability
combination not produced by the current default role seed, (b) the editor code itself is
explicitly out of scope for this phase per D-01/D-05, and (c) REVIEW.md already supplies a
concrete, low-risk one-line fix (add `informationen` to the fallback chain) that can be
applied as an independent, tightly-scoped follow-up without reopening Phase 181's scope.

A second, lower-severity item (WR-02, missing negative/prefix-attack test for the new
allowlist entries) is also escalated for the same reason — not a functional defect today
(the `===` exact-match checks are correct), but an untested regression-guard gap on a
security-relevant function.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx` | `getSafeReturnPath()` extended with `/me/dashboard`/`/me/contributions`, nothing else changed | ✓ VERIFIED | Confirmed via direct read; diff scope matches plan/summary claims. |
| `frontend/src/app/me/dashboard/components/attentionHelpers.ts` | `resolveWorkspaceHref()` builds editor href w/ `tab=segmente&return_to=%2Fme%2Fdashboard` | ✓ VERIFIED | Line 34, confirmed. |
| `frontend/src/app/me/dashboard/components/AttentionSection.tsx` | rejected-note-revision link builds editor href w/ `tab=notizen&return_to=%2Fme%2Fdashboard` | ✓ VERIFIED | Line 172, confirmed. |
| `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx` | per-release button builds editor href w/ `return_to={projectReturnHref}` | ✓ VERIFIED | Line 351, confirmed. |
| `frontend/src/components/contributions/ContributionCard.tsx` | confirmed-release button builds editor href w/ `return_to=%2Fme%2Fcontributions` | ✓ VERIFIED | Line 100, confirmed. |
| `frontend/src/components/contributions/AnimeGroupCard.tsx` | per-role-range button builds editor href w/ `return_to=%2Fme%2Fcontributions` | ✓ VERIFIED | Line 280, confirmed. |
| `frontend/src/lib/releaseEditorRedirects.mjs` | pure `buildReleaseEditorRedirects()` returning the redirect descriptor | ✓ VERIFIED | Content read; exact descriptor matches plan spec. Unit test passes live. |
| `frontend/next.config.mjs` | `redirects()` wired to `buildReleaseEditorRedirects()` | ✓ VERIFIED | Import + `async redirects()` present; `images`/`turbopack` keys untouched. |
| `frontend/src/app/me/releases/**` (workspace route) | deleted | ✓ VERIFIED | `find` confirms directory absent. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `attentionHelpers.ts` | `EpisodeVersionEditorPage.tsx` | `resolveWorkspaceHref()` → `project.href` → `next/link` | ✓ WIRED | Confirmed by reading `AttentionSection.tsx` consuming `resolveWorkspaceHref` output; test suite (16 tests) exercises the rendered href. |
| `EpisodeVersionEditorPage.tsx` | `getSafeReturnPath` | `return_to` query param → `backHref` | ✓ WIRED | `returnHrefFromQuery = getSafeReturnPath(searchParams.get("return_to"))`, consumed by `backHref` computation (line ~262). Live test coverage confirms both accept and reject paths. |
| `next.config.mjs` | `releaseEditorRedirects.mjs` | `import { buildReleaseEditorRedirects }` / `async redirects()` | ✓ WIRED | Confirmed by direct file read; live curl proves the redirect fires end-to-end through the running Next.js server, not just unit-tested in isolation. |

### Data-Flow Trace (Level 4)

Not applicable in the usual sense (no dashboard/list rendering of dynamic DB-backed data was
introduced by this phase) — the only "data flow" relevant here is the `return_to` query
parameter flowing from link construction through `getSafeReturnPath` into `backHref`, which
is covered by the Key Link table above and directly observed via live tests and curl.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Old workspace URL 308-redirects with query preserved | `curl -sI "http://192.168.235.196:3000/me/releases/27/workspace?tab=notizen"` | `HTTP/1.1 308 Permanent Redirect`, `location: /admin/episode-versions/27/edit?tab=notizen` | ✓ PASS |
| Editor route still serves 200 | `curl -sI "http://192.168.235.196:3000/admin/episode-versions/27/edit?tab=notizen"` | `HTTP/1.1 200 OK` | ✓ PASS |
| `releaseEditorRedirects` unit test | `npm run test -- --run releaseEditorRedirects` | 1/1 passed | ✓ PASS |
| Editor allowlist tests (incl. 2 new acceptances + 1 rejection) | `npm run test -- --run 'page.test.tsx'` | 20/20 passed | ✓ PASS |
| Dashboard/contribution link tests | `npm run test -- --run attentionHelpers AttentionSection ContributionCard AnimeGroupCard` | 35/35 passed | ✓ PASS |
| Project-page link test | `npm run test -- --run 'page.test.tsx'` (project page) | 22/22 passed | ✓ PASS |
| Typecheck clean | `npx tsc --noEmit -p tsconfig.json` | no output / exit 0 | ✓ PASS |
| Dynamic workspace href literal gone | `grep -rFn 'me/releases/${' frontend/src` | no matches outside redirect-module comment | ✓ PASS |

### Probe Execution

Not applicable — Phase 181 is a link-retargeting/redirect phase with no declared or
conventional `scripts/*/tests/probe-*.sh` scripts. Skipped.

### Requirements Coverage

Phase 181 is explicitly tracked by decision IDs (D-01..D-05), not formal `REQ-181-XX` entries
— confirmed via `ROADMAP.md`'s own annotation: *"Requirements: D-01 bis D-05 (siehe
181-CONTEXT.md — additive Phase ohne formale REQ-IDs, Traceability läuft über Entscheidungen
statt Requirements-Katalog)"*. `.planning/REQUIREMENTS.md` has no `REQ-181-*` entries, which is
expected and not an omission — no orphaned requirements.

| Decision | Description | Status | Evidence |
|----------|-------------|--------|----------|
| D-01 | Single surviving editing page is the existing `/admin/episode-versions/[versionId]/edit`, unchanged layout | ✓ SATISFIED | Truth #4, #8 |
| D-02 | 5 entry points retarget there with correct `return_to` | ✓ SATISFIED | Truths #1, #2 |
| D-03 | Old workspace URL permanently redirects; dead code removed | ✓ SATISFIED | Truths #5, #6 |
| D-04 | Retargeted links keep own-contribution visibility, no new group-wide gate | ✓ SATISFIED | Truth #3 |
| D-05 | Zero behavior change to the editor; release-27/`timer` regression absent | ✓ SATISFIED | Truths #4, #7, #8 |

### Anti-Patterns Found

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in any of the 9 phase-modified
files. No ASCII-umlaut substitutions (CLAUDE.md Sprachqualität rule) introduced in any
user-facing string touched by this phase. The only pre-existing ASCII-umlaut issue in the
touched file (`EpisodeVersionEditorPage.tsx:706`, "auswaehlbare") predates this phase (confirmed
via `git blame` by the code reviewer) and is out of this phase's diff — correctly left alone
per D-01/D-05's "no unrelated editor changes" constraint, logged as REVIEW.md IN-01 for a
future opportunistic cleanup, not a Phase 181 gap.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `EpisodeVersionEditorPage.tsx` | 249-257 | Pre-existing tab-fallback chain missing `informationen` branch, newly reachable via dashboard link (REVIEW.md WR-01) | ⚠️ Warning | Narrow blank-editor risk for a non-default capability combination — escalated, not blocking |
| `page.test.tsx` (admin editor) | 568 | Missing negative prefix-attack test for new allowlist entries (REVIEW.md WR-02) | ⚠️ Warning | Untested regression-guard gap on a security-relevant function — escalated, not blocking |

### Human Verification Required

#### 1. Decide WR-01 disposition (dashboard link + editor tab-fallback gap)

**Test:** Review the WR-01 finding above (and `181-REVIEW.md`'s original write-up) and decide:
fix the one-line `visibleActiveTab` fallback chain now, or accept and track as a follow-up.
**Expected:** An explicit decision recorded (either a follow-up plan/ticket reference, or an
accepted-risk note), since the gap is real in the code even though not reachable via today's
default role seed.
**Why human:** Severity depends on whether capability overrides that produce the affected
combination exist in the live database today — a product/operations judgment this verifier
cannot make from static code alone.

#### 2. Decide WR-02 disposition (missing allowlist regression test)

**Test:** Decide whether to add the suggested negative test (`/me/dashboard-evil` style prefix
attack) before closing the phase, or accept as a tracked follow-up.
**Expected:** An explicit decision recorded.
**Why human:** Test-coverage risk tolerance judgment, not a functional defect today.

### Gaps Summary

No must-have truth failed. All 8 explicit, plan-declared must-haves (D-01 through D-05,
covering link-retargeting, return_to wiring, visibility-condition preservation, the permanent
redirect, dead-code removal, and the live D-05 regression guard) are verified against the
live codebase and the live running container — not merely against SUMMARY.md narration. The
phase's core deliverable is real and working.

One additional, code-review-sourced concern (WR-01) and one test-coverage gap (WR-02) remain
open from `181-REVIEW.md` and were independently re-confirmed by this verifier reading the
actual source and the capability-seed migrations. Neither contradicts the stated D-01..D-05
decisions as literally written, and WR-01 is not reachable through the current default
capability seed — but both represent real, unresolved latent risk that deserves an explicit
developer decision before the milestone is considered fully closed, rather than silent
carry-forward. Hence `status: human_needed` rather than `passed`.

---

_Verified: 2026-10-14T11:10:00Z_
_Verifier: Claude (gsd-verifier)_
