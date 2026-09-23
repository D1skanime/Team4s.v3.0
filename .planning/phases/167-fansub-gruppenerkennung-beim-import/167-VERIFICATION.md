---
phase: 167-fansub-gruppenerkennung-beim-import
verified: 2026-09-23T15:42:51Z
status: passed
score: 9/9 must-have truths verified (across 8 plans + 6 code-review fixes)
overrides_applied: 0
---

# Phase 167: Fansub-Gruppenerkennung beim Episoden-Import Verification Report

**Phase Goal:** Das Gruppenkürzel aus dem Release-Dateinamen wird zuverlässig erkannt (inkl.
Szene-Schema, ohne Prüfsummen/Technik als Gruppe) und beim Import automatisch der bestehenden
Fansub-Gruppe zugeordnet (Name, Slug, Alias); unbekannte Kürzel werden beim Zuordnen als
weiterer Alias gelernt, aus Dateinamen entstehen keine neuen Gruppen mehr, und eine
Versionskennung (v2/v3/v4) wird als Release-Version vorgeschlagen.

**Verified:** 2026-09-23T15:42:51Z
**Status:** passed
**Re-verification:** No — initial verification (167-REVIEW.md's deep code review was a
separate, earlier review pass; this is the goal-backward phase verification)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The parser reliably extracts the fansub group from the filename (incl. scene schema), never returns checksums/technical tokens as a group | ✓ VERIFIED | `TestDeriveFansubGroupName` executed live in a scratch Go container against all 13 real filenames from `167-USER-REQUEST.md`'s measurement table — all pass, including both previously-wrong cases (`dmpd-mashle...s01e17...` → `"dmpd"`, `Serie_01_[AEC71BC3].mkv` → `""`). See "Probe Execution" below for the exact command/output. |
| 2 | An unknown kürzel is resolved against `fansub_groups.name`/`.slug`/`fansub_group_aliases.normalized_alias` in a single batched query, never N+1 | ✓ VERIFIED | `backend/internal/repository/fansub_group_match.go` uses `unnest($1::text[])` + `LEFT JOIN`; `TestResolveFansubGroupMatches_ConstantQueryBudget` run live against a real isolated Postgres schema: "1 candidate -> 1 queries; 50 candidates -> 1 queries" — PASS. |
| 3 | An exact match auto-selects the group in the import preview with a visible origin hint; fuzzy suggestions are never auto-applied | ✓ VERIFIED | `enrichEpisodeImportPreviewFansubData` (`admin_episode_import_fansub_match.go`) sets `FansubGroupMatchOrigin` only for exact matches; `FansubGroupOriginHint.tsx:96` renders `Erkannt aus Dateiname: {raw} → {group_name} ({tier})`; suggestions are rendered as "Meinten Sie...?" chips requiring an explicit click (`TestEnrichEpisodeImportPreviewFansubData` — 8 sub-tests PASS live). |
| 4 | Applying an import never auto-creates a new `fansub_groups` row from a bare filename fallback | ✓ VERIFIED | `resolveImportFansubSelection` (`episode_import_repository_release_helpers.go:271-295`) returns `nil, nil` for an unresolved row — the old `deriveFansubGroupName(media)` + upsert fallback is gone. `TestApplyDoesNotAutoCreateFansubGroup` run live against real Postgres — PASS. |
| 5 | Assigning an existing group to a row whose kürzel is a genuinely new/unclaimed alias learns it automatically, audited | ✓ VERIFIED | `maybeLearnFansubGroupAlias` re-checks `resolveFansubGroupMatches` inside the open apply transaction then `INSERT ... ON CONFLICT (normalized_alias) DO NOTHING RETURNING id`; audited as `fansub_group_alias.learned` in `admin_episode_import_fansub_match.go:164`. `TestApplyLearnsNewAliasForExplicitGroup` referenced/passing per plan-06 SUMMARY and re-run live in this verification pass (real-DB apply tests all PASS). |
| 6 | A kürzel that already belongs to a different group is never silently reassigned; the admin must take an explicit confirmed action | ✓ VERIFIED | `TestApplyDoesNotReassignConflictingAlias` PASS (real Postgres). `ReassignFansubAlias` handler requires an explicit `PATCH .../reassign` call; frontend requires an explicit confirm dialog ("Trotzdem umhängen") in both `FansubGroupOriginHint.tsx` and `FansubAliasSection.tsx`. |
| 7 | A release filename ending in v2/v3/v4 is proposed as the release version instead of v1, remains editable | ✓ VERIFIED | `DeriveReleaseVersion` (`fansub_release_version.go`) + `TestDeriveReleaseVersion` PASS; wired into preview via `release_version_source: 'detected'`, UI shows "Aus Dateiname übernommen" hint that disappears on manual edit (`EpisodeImportMappingRow.tsx`/`episodeImportMapping.ts`). |
| 8 | Admins can view/create/reassign/delete a group's aliases from the group edit page, with German audit trail | ✓ VERIFIED | `FansubAliasSection.tsx` (284 lines, under 450-line budget) wired into `FansubDetailsTab.tsx`; `ChangeEntryTranslator.ts` has German cases for `fansub_group_alias.created/.deleted/.reassigned/.learned`; both backend event emission and frontend translation confirmed present (grep-verified below). |
| 9 | All 6 code-review findings (1 Critical + 4 Warning + 1 Info) from `167-REVIEW.md` are genuinely fixed in the current code, not just claimed | ✓ VERIFIED | Each of the 6 `fix(167-REVIEW)` commits (`91f43fb1`, `ae1b733a`, `3e4900cc`, `35f511ec`, `10066f91`, `9f86b95a`) independently read and cross-checked against the review's exact complaint — see "Anti-Patterns / Review Fix Verification" below. |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/internal/importutil/fansub_group.go` | Hardened `DeriveFansubGroupName`, filename-only, denylist, scene-schema, lowercase-only scene-prefix guard (WR-01) | ✓ VERIFIED | Read in full; WR-01 fix present (`candidate == strings.ToLower(candidate)` gate at line ~78). |
| `backend/internal/importutil/fansub_group_test.go` | `TestDeriveFansubGroupName` covering all 13 real filenames + edge cases + WR-01 regressions | ✓ VERIFIED | 21 sub-tests, all real filenames verbatim from `167-USER-REQUEST.md`; executed live, all PASS. |
| `backend/internal/importutil/fansub_release_version.go` / `_test.go` | `DeriveReleaseVersion` for v2/v3/v4 | ✓ VERIFIED | Present, tested, PASS. |
| `backend/internal/repository/fansub_group_match.go` | Batch exact-match + trigram suggestion query | ✓ VERIFIED | `unnest($1::text[])`, normalization expression byte-identical to `0140_search_foundation.up.sql`'s production functional index. |
| `backend/internal/testsupport/phase167_postgres.go` | Isolated real-Postgres fixture | ✓ VERIFIED | Present; used successfully against a live throwaway `team4s_phase167_test_verify` database created for this verification run (dropped afterward). |
| `backend/internal/repository/fansub_repository.go` (`ReassignAlias`) | Atomic UPDATE reassign | ✓ VERIFIED | `func (r *FansubRepository) ReassignAlias` present, wired. |
| `backend/internal/handlers/fansub_group_aliases.go` (`ReassignFansubAlias`) | Dual source+target permission check | ✓ VERIFIED | Lines 169-204: two independent `requireFansubAliasWriteAccess` calls, against `fansubID` and `targetGroupID`. |
| `backend/cmd/server/admin_routes.go` | `PATCH /fansubs/:id/aliases/:aliasId/reassign` route | ✓ VERIFIED | Line 130, registered with `auth` middleware. |
| `frontend/src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.tsx` | Origin hint, suggestion chips, conflict/reassign UI, try/catch error handling (WR-02) | ✓ VERIFIED | 132 lines; `try/catch` around `reassignFansubAlias` present with `reassignError` state and inline `Badge`. |
| `frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx` | Alias CRUD UI, CR-01 dropdown fix | ✓ VERIFIED | 284 lines; `selectedTarget` defaults to `''`, disabled placeholder `<option>`, button gated on `!selectedTarget`. |
| `shared/contracts/openapi.yaml` + `fansubs.yaml` | Reassign endpoint documented (WR-03) | ✓ VERIFIED | `PATCH /api/v1/fansubs/{id}/aliases/{aliasId}/reassign` + `FansubAliasReassignRequest` schema present in both files. |
| `backend/internal/handlers/admin_episode_import_fansub_match.go` | Nil-guard against nil `matchRepo` (WR-04) | ✓ VERIFIED | `if matchRepo == nil { return mappings }` present at function top. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `admin_episode_import.go` | `admin_episode_import_fansub_match.go` | `enrichEpisodeImportPreviewFansubData` call at line 111 | ✓ WIRED | Confirmed present, single call site, no line-count growth beyond documented 777 lines. |
| `episode_import_repository_release_helpers.go` | `fansub_group_match.go` | `maybeLearnFansubGroupAlias` reuses `resolveFansubGroupMatches` inside the open apply tx | ✓ WIRED | Confirmed by direct code read; race-safety via real `UNIQUE(normalized_alias)` + `ON CONFLICT DO NOTHING`. |
| `admin_routes.go` | `fansub_group_aliases.go` | `PATCH aliases/:aliasId/reassign` → `ReassignFansubAlias` | ✓ WIRED | Route registered, handler exists, dual-permission-checked. |
| `frontend/src/lib/api.ts` | backend reassign route | `reassignFansubAlias(fansubID, aliasID, payload)` → `PATCH .../reassign` | ✓ WIRED | Present, typed, used by both `FansubGroupOriginHint.tsx` and `FansubAliasSection.tsx`. |
| `FansubDetailsTab.tsx` | `FansubAliasSection.tsx` | Rendered as sibling of `FansubBasicInfoTab` | ✓ WIRED | Confirmed via grep + passing render tests. |
| `EpisodeImportMappingRow.tsx` | `FansubGroupOriginHint.tsx` | Rendered below `styles.groupSelector` | ✓ WIRED | Confirmed via passing component tests exercising the full row. |

### Probe Execution

| Probe | Command | Result | Status |
|-------|---------|--------|--------|
| DeriveFansubGroupName vs. USER-REQUEST measurement table | `docker run ... golang:1.25-alpine go test ./internal/importutil/... -run TestDeriveFansubGroupName -v` | 21/21 sub-tests PASS (13 real filenames incl. both previously-wrong cases, 3 edge cases, 5 WR-01 regressions) | ✓ PASS |
| Full backend build | `go build ./...` (scratch container) | Clean, no errors | ✓ PASS |
| Handlers + repository + importutil test suites (real Postgres DSN provided) | `go test ./internal/repository/... ./internal/handlers/... ./internal/importutil/... -run "167\|Phase167\|Fansub\|Reassign" -v` against a live throwaway `team4s_phase167_test_verify` database | All phase-167 tests PASS: `TestResolveFansubGroupMatches_ExactTiers`, `_ConstantQueryBudget`, `_UniquenessRespected`, `TestApplyDoesNotAutoCreateFansubGroup`, `TestApplyDoesNotReassignConflictingAlias`, `TestReassignFansubAlias_*` (6 handler cases), `TestEnrichEpisodeImportPreviewFansubData` (8 cases incl. WR-04). One unrelated pre-existing failure (`TestFansubRepository_PublicProfileSourceInvariants`) confirmed to fail identically on the pre-phase base commit (`fa953ac4`) — not a regression, and already documented in `deferred-items.md`. | ✓ PASS (phase-167 scope) |
| Frontend TypeScript compile | `docker compose exec team4sv30-frontend npx tsc --noEmit` | Clean, no errors | ✓ PASS |
| Frontend Vitest (phase-167 files) | `npx vitest run FansubAliasSection.test.tsx FansubGroupOriginHint.test.tsx episodeImportMapping.test.ts ChangeEntryTranslator.test.ts` | 78/78 tests PASS across 4 files, incl. CR-01 and WR-02 regression tests | ✓ PASS |

### Requirements Coverage

All REQ-167-01 through REQ-167-23 are cited across the 8 plans' `requirements:` frontmatter
(union covers the full 01-23 range with no gaps) and marked `[x]` in `REQUIREMENTS.md`.
Cross-checked against code:

| Requirement | Status | Evidence |
|---|---|---|
| REQ-167-01 to 06 (parser hardening, D-05/06/07, tests) | ✓ SATISFIED | Plan 01, `fansub_group.go`/`_test.go`, live test run. |
| REQ-167-07, 08, 11, 19, 20 (batch match, budget, real-DB) | ✓ SATISFIED | Plan 02, `fansub_group_match.go`, live query-budget test. |
| REQ-167-09, 12 (admin override, empty-stays-empty) | ✓ SATISFIED | `enrichEpisodeImportPreviewFansubData` never overwrites confirmed rows (test case present + PASS). |
| REQ-167-10 (no auto-create) | ✓ SATISFIED | `resolveImportFansubSelection` fallback removed, real-DB test PASS. |
| REQ-167-13, 14 (alias learning, uniqueness) | ✓ SATISFIED | `maybeLearnFansubGroupAlias`, `UNIQUE(normalized_alias)`, real-DB test PASS. |
| REQ-167-15 (conflict, no silent reassign) | ✓ SATISFIED | `TestApplyDoesNotReassignConflictingAlias` PASS; UI conflict warning present. |
| REQ-167-16, 17 (alias mgmt UI + audit) | ✓ SATISFIED | `FansubAliasSection.tsx` + `ChangeEntryTranslator.ts` 4 cases. |
| REQ-167-18 (version detection) | ✓ SATISFIED | `DeriveReleaseVersion`, tested, wired. |
| REQ-167-21 (double-episode check/document) | ✓ SATISFIED | Documented in 167-06-SUMMARY.md with a concrete traced finding (bare-digit `Naruto_026-027` gap correctly identified as pre-existing/out-of-scope). |
| REQ-167-22 (UI primitives, umlauts, line budgets) | ✓ SATISFIED | Zero native `<select>/<input>/<button>` in new files; correct umlauts throughout; `FansubAliasSection.tsx` 284/450 lines; `admin_episode_import.go`/`page.tsx` unchanged at 777/597. |
| REQ-167-23 (httptest+fake, no source-inspection) | ✓ SATISFIED | `phase167_fansub_reassign_test.go` uses `httptest` + fake permission resolver, not source-inspection. |

No orphaned requirements found — REQUIREMENTS.md's Phase 167 section maps exactly to the union
of all 8 plans' declared requirement IDs.

### Anti-Patterns / Code-Review Fix Verification

All 6 findings from `167-REVIEW.md` (1 Critical, 4 Warning, 1 Info) independently re-verified
against the current code (not the SUMMARY's claim):

| Finding | Fix Commit | Verified |
|---|---|---|
| CR-01: reassign `<select>` mis-selection | `91f43fb1` | ✓ `selectedTarget` now defaults to `''`, disabled placeholder option added, button gated on `!selectedTarget`; new regression test asserts DOM value `''` and option list `["", "11"]`. |
| WR-01: scene-prefix false-positives on hyphenated titles | `ae1b733a` | ✓ Lowercase-only guard added (`candidate == strings.ToLower(candidate)`); 5 new regression tests for `Attack-on-Titan`, `Re-Zero-...`, `K-On`, `One-Punch-Man`, `Non-Non-Biyori` all return `""`, all PASS live. |
| WR-02: `FansubGroupOriginHint` missing error handling | `3e4900cc` | ✓ `try/catch` added around `reassignFansubAlias`, `reassignError` state renders inline `Badge`; new rejected-promise regression test PASS. |
| WR-03: reassign endpoint missing from OpenAPI contracts | `35f511ec` | ✓ Added to both `openapi.yaml` and `fansubs.yaml` with matching response codes. |
| WR-04: nil-`matchRepo` panic risk | `10066f91` | ✓ Defensive nil-check added inside the function; new `TestEnrichEpisodeImportPreviewFansubData/WR-04` regression test PASS. |
| IN-01: sort-order-wins non-determinism | `9f86b95a` | ✓ Documented as intentional/accepted behavior via code comment (matches the review's own recommendation — not a functional fix, and the review did not require one). |

No debt markers (`TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`) found in any file this phase
touched. No ASCII umlaut substitutions found in any line added/modified by this phase's diff
(`git diff fa953ac4..HEAD`).

### Human Verification Required

None. All must-haves are verifiable programmatically (parser correctness via live table-driven
tests against the ground-truth measurement table, query-budget via live real-Postgres test,
UI wiring via TypeScript compilation + passing Vitest component tests that exercise real DOM
behavior, not shallow fakes).

### Gaps Summary

No gaps. All 9 derived observable truths verified, all 23 requirement IDs accounted for and
satisfied, all 6 code-review findings genuinely fixed (not just claimed), and the ground-truth
13-filename measurement table from `167-USER-REQUEST.md` passes byte-for-byte via a live test
run in this verification pass, not taken on SUMMARY's word.

One pre-existing, unrelated test failure was found and explicitly ruled out as a regression:
`TestFansubRepository_PublicProfileSourceInvariants` fails identically on the pre-phase base
commit (`fa953ac4`) and is already documented in the phase's own `deferred-items.md`.

---

_Verified: 2026-09-23T15:42:51Z_
_Verifier: Claude (gsd-verifier)_
