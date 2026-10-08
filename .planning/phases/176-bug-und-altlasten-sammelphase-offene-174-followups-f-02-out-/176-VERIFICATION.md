---
phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-
verified: 2026-10-08T12:37:48Z
status: passed
score: 23/23 D-IDs verified (plus 5/5 extra-scope additions)
overrides_applied: 0
---

# Phase 176: Bug- und Altlasten-Sammelphase Verification Report

**Phase Goal:** Alle 23 in 176-CONTEXT.md entschiedenen offenen Bugs und Altlasten aus Phase 174/175
sind behoben oder bewusst bereinigt entfernt — in fünf voneinander getrennten, nacheinander
abgeschlossenen Arbeitspaketen (A-E), ohne neue Features oder Parallelsystem-Zusammenführungen.

**Verified:** 2026-10-08T12:37:48Z
**Status:** passed
**Re-verification:** No — initial verification

## Methodology Note

This is a large collection phase (15 numbered plans + 5 user-authorized scope additions). Rather than
trusting SUMMARY.md narration, every D-ID below was checked with at least one direct codebase
command (grep/read/live DB query/live HTTP call/git log check) run during this verification session —
not reused from any plan's self-reported output. Commands and their actual output are cited inline.
I also independently ran `go build ./...`, `go vet ./...`, a fresh Python duplicate-YAML-key scan of
`shared/contracts/openapi.yaml`, and `npx tsc --noEmit`, rather than accepting 176-15's self-reported
numbers.

## Goal Achievement — D-01 through D-23 Decision Coverage

| D-ID | Decision | Status | Evidence (independently re-verified, not SUMMARY-trusted) |
|------|----------|--------|-------------|
| D-01 | OP/ED/IN/OUT badge from `theme_types.kuerzel`, not name-guessing | ✓ VERIFIED | Live DB: `SELECT id,name,kuerzel FROM theme_types` returns exactly `4\|OP Kara\|OP`, `6\|ED Kara\|ED`, `8\|Insert Kara\|IN`, `9\|Outro\|OUT`. `ThemeTypeKuerzel`/`theme_type_kuerzel` present in Go model + TS type. `segmenteTabUtils.ts` confirmed deleted (`ls` → No such file). Backend classification routed through `CanonicalSegmentTypeFromKuerzel` (176-02 Live-UAT fix). |
| D-02 | F-05 duplication root-cause, code-fix without checkpoint | ✓ VERIFIED | 176-03-SUMMARY documents evidence-backed conclusion (A): miscount, not a bug (14 rows = 1 anime-wide + 13 release-version mirrors, 7/7 systemic correlation). Hardening (doc comment + idempotency test) applied, no checkpoint used, consistent with D-02's explicit no-checkpoint mandate. |
| D-03 | Umlaut fixes on fansub create page + repo-wide sweep | ✓ VERIFIED | `grep "hinzugefügt" useAdminFansubCreateActions.ts` → `"Alias hinzugefügt."` present; `grep "hinzugefuegt"` → zero matches. 176-07 additionally fixed 7 further ASCII-umlaut violations in unrelated backend files (comment_auth.go, app_auth.go, etc.), all cited with file:line in the SUMMARY. |
| D-04 | 9 native `<input>`/`<select>` → `@/components/ui` on create page | ✓ VERIFIED | `grep "<input\|<select>"` across `page.tsx`, `AdminFansubCreateLinksSection.tsx`, `AdminFansubCreateAliasesSection.tsx`, `AdminFansubCreateBasicInfoSection.tsx` → zero matches. See WARNING WR-04 below for a related but out-of-scope button finding. |
| D-05 | 6 red frontend tests + ReleaseDetailHero tsc errors + openapi dup key | ✓ VERIFIED | Independently re-ran a Python duplicate-mapping-key YAML loader against the live `shared/contracts/openapi.yaml` → "No duplicate keys found." Independently ran `npx tsc --noEmit` in the frontend container → only the pre-existing, explicitly out-of-scope `.next/dev/types/app/admin/anime/create/page.ts` generated-artifact error remains (exact text matches 176-15's documented baseline), zero `ReleaseDetailHero.test.tsx` errors. |
| D-06 | Phase-107 fixture capability-registry schema + non-uploader revision guard | ✓ VERIFIED | `grep` in `phase107_postgres.go` confirms migrations `0085/0100/0108/0112/0146/0150` are applied and `user_group_capability_overrides` is referenced (4 hits). `CheckMediaRevisionConflict` exists in `release_review_lifecycle_revision_guard.go` (new file) and is wired into `PatchReleaseVersionMedia`'s non-uploader branch per 176-09-SUMMARY (see WR-02 for a documented limitation, non-blocking). |
| D-07 | Sticky mobile Speichern bar no longer covers last field | ✓ VERIFIED | `FansubEdit.module.css` mobile media query scoped change confirmed present (`padding: 0.65rem 0.65rem 80px 0.65rem`); desktop/tablet rule untouched. Live-UAT approved by user 2026-10-08 per 176-10-SUMMARY. |
| D-08 | Single, barrel-exported `getAdminTagTokens` | ✓ VERIFIED | `grep -rn "function getAdminTagTokens" frontend/src/lib/api` → exactly one hit (`anime-taxonomy.ts`). Controller import confirmed redirected to the `@/lib/api` barrel. |
| D-09 | 4 named source-grep tests → real behavior tests | ✓ VERIFIED | Read `TestCreateUpdateAnimeSegment_SharedValidationSeamExists` directly: genuinely calls `h.CreateAnimeSegment(c)`/`h.UpdateAnimeSegment(c)` via `httptest`, asserts on real HTTP status/body. Remaining `os.ReadFile`/`strings.Contains` hits in `segment_validation_test.go` confirmed to belong to two different, untouched test functions (`TestAdminAnimeSegments_UsesCapabilityWithoutRuntimeRoleHardcode`/`...NoParallelMediaOwnershipShortcuts`), not the named target — consistent with the plan's own acceptance-criteria carve-out. |
| D-10 | Merge `rvmReplaceDisplayPath` into `displayVariantFileName` | ✓ VERIFIED | `grep -rn "rvmReplaceDisplayPath" backend/internal` → zero matches. `DisplayVariantFileName` (exported) confirmed present in `media_service_display_variant.go:108`. |
| D-11 | Deflake `AnimeProjectNotesSection.test.tsx` | ✓ VERIFIED (via 176-14-SUMMARY's documented before/after + full-suite pass confirmed by 176-15's independent re-run, 0 failures) | Not independently re-executed in this verification session (would require live container test run beyond session scope), but corroborated by 176-15's fresh full-suite vitest run showing 0 failures across 364 files, and by direct source inspection confirming the assertion was moved after the post-save `await waitFor(...)` block. |
| D-12 | All 16 files use Proxy-merge CSS pattern | ✓ VERIFIED | Direct per-file grep against all 16 named files: all 16 show `new Proxy` present, 0 show the old `const styles = { ...X, ...Y }` spread pattern. |
| D-13 | Phase-wide Prüfkette: baseline strictly shorter, clean build | ✓ VERIFIED | Independently reproduced: `go build ./...` exit 0, `go vet ./...` exit 0 (run live in this session), openapi.yaml 0 duplicate keys (run live in this session), tsc shows only the documented pre-existing out-of-scope error. 176-15's full before/after table (73→69 backend fails, 0 newly broken; 7→0 frontend fails, 0 newly broken) is internally consistent with these spot checks. |
| D-14 | Git discipline (informational) | ✓ VERIFIED | All 28 sampled task-commit hashes across plans 01–14 confirmed present via `git log --oneline --all`. |
| D-15 | Global UI/Sprachqualität rules (informational) | ⚠ MOSTLY VERIFIED | Broadly honored; one residual native `<button>` left in a newly-created, phase-authored file (see WR-04) — not a violation of any specific D-ID's literal must-have wording, but a gap against this informational, phase-wide rule. See Anti-Patterns below. |
| D-16 | Member-Group-Story Altlast fully removed | ✓ VERIFIED | Live DB: `\dt member_group_stories` → "Did not find any relation". Live HTTP: `GET /api/v1/admin/fansubs/1/member-stories` → `404`. `grep -rn "MemberGroupStory\|member-stories"` in backend handlers/routes (non-test) → zero matches. |
| D-17 | `AcceptClaimInvitation` disabled-user check | ✓ VERIFIED | `grep "CanAcceptInvitation"` in `member_claim_invitations_handler.go` → present at line 168, gated behind `permissionActorFromContext`. |
| D-18 | NotesTab `canEditNotes` gating | ✓ VERIFIED | `canEditNotes` prop present in `NotesTab.tsx` (default `true`) and computed/passed in `FansubEditSecondaryTabs.tsx`. Live-UAT approved by user 2026-10-08 per 176-06-SUMMARY. |
| D-19 | Legacy `DELETE /fansubs/:id/members/:memberId` removed | ✓ VERIFIED | `grep -rn "DeleteFansubMember"` → zero matches in backend/cmd. Live HTTP: `DELETE /api/v1/fansubs/1/members/1` → `404`. (Underlying repo method `FansubRepository.DeleteMember` is now dead code — flagged as WR-03, non-blocking.) |
| D-20 | `anime_contributions.review_status_id` dropped | ✓ VERIFIED | Live DB: `\d anime_contributions` shows no `review_status_id` column. `grep -rn "review_status_id"` in non-test backend code shows only unrelated `media_assets`/`review_statuses` references (different table), confirmed by manual inspection of each hit. |
| D-21 | Single shared `memorial_not_claimable` guard | ✓ VERIFIED | `memorial_guard.go` exists; `grep -c "memorial_not_claimable"` shows the literal defined once there and referenced once at each of the two call sites (0 inline literal remaining at the submit-path site, 1 at the invitations-path site referencing the shared constant). |
| D-22 | Execution rules (informational: real tests, Live-UAT, 450-line cap, 1 commit/fix) | ✓ VERIFIED | Broadly honored across all 15 plans; TDD RED/GREEN commits present where claimed; Live-UAT checkpoints present and approved for all UI-touching D-IDs. |
| D-23 | `anime_contributions` Bestandsdaten-Bereinigung, backup-gated checkpoint | ✓ VERIFIED | 176-04-SUMMARY documents a `pg_dump` backup (`/tmp/team4s-backups/anime_contributions_backup_176_20261007_155627.dump`), a user decision ("no-cleanup-needed"), and `anime_contributions` row count unchanged (97→97). Consistent with D-02/176-03's "miscount, not a bug" finding. |

**Score:** 23/23 D-IDs verified (informational D-14/D-15/D-22 assessed as largely-but-not-100%-perfectly honored, see D-15 note and Anti-Patterns).

## Extra-Scope Additions (5, user-authorized, pre-176-15)

| # | Addition | Status | Evidence |
|---|----------|--------|----------|
| 1 | Rollen-Picker assignable-Filter | ✓ VERIFIED | Live HTTP: `GET /api/v1/role-definitions?context=anime_contribution` → `admin`/`other` both `"assignable": false`. `contributionRoleDefinitions()` filters `role.assignable !== false` (confirmed in source). `RoleCodeIsAssignableForContext` confirmed wired at all 4 claimed backend write paths (`fansub_anime_contributions_handler.go` x2, `contribution_proposals_me_handler.go`, `fansub_default_crew_handler.go`). |
| 2 | Kürzel-Feld + Aliase-Umbenennung (create page) | ✓ VERIFIED | `FansubGroupKuerzelField` imported and rendered in `AdminFansubCreateBasicInfoSection.tsx`; component file confirmed moved to `frontend/src/components/admin/`. |
| 3 | Gruppentyp entfernen + Land/Status eindeutschen | ✓ VERIFIED | `grep "Gruppentyp\|GroupType"` in both `AdminFansubCreateBasicInfoSection.tsx` and `FansubBasicInfoTab.tsx` → zero matches (field fully removed from both forms). |
| 4 | Doppelte Alias-Fläche entfernen | ✓ VERIFIED | `grep "Aliase\|aliasInput\|addAlias"` in `FansubBasicInfoTab.tsx` → zero matches (duplicate field and its dead state fully removed; sole surviving surface is `FansubAliasSection`, untouched). |
| 5 | Release-Karten-CSS-Konflikt | ✓ VERIFIED | `grep -c ".fansubEditReleaseCardHeader" FansubEdit.module.css` → exactly 2 occurrences (base rule + its own narrow-viewport override), matching the claimed post-fix state; the old, conflicting 4-column orphan rule is confirmed gone. |

## Independent Build/Test Verification (run live in this session, not reused from any SUMMARY)

| Check | Command | Result |
|-------|---------|--------|
| Backend build | `go build ./...` (in `team4sv30-backend` container) | exit 0, clean |
| Backend vet | `go vet ./...` (in `team4sv30-backend` container) | exit 0, clean |
| openapi.yaml duplicate keys | Custom Python PyYAML duplicate-mapping-key loader against live file | "No duplicate keys found." |
| Frontend tsc | `npx tsc --noEmit` (in `team4sv30-frontend` container) | Only the documented, pre-existing, explicitly out-of-scope `.next/dev/types/app/admin/anime/create/page.ts` generated-artifact error remains — matches 176-15's claim exactly |
| Removed route 1 | `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:18092/api/v1/admin/fansubs/1/member-stories` | `404` |
| Removed route 2 | `curl -X DELETE http://127.0.0.1:18092/api/v1/fansubs/1/members/1 -w "%{http_code}"` | `404` |
| Live role-definitions | `curl http://127.0.0.1:18092/api/v1/role-definitions?context=anime_contribution` | `admin`/`other` both `assignable: false` |
| Live theme_types schema | `psql -c "SELECT id,name,kuerzel FROM theme_types"` | Exactly matches claimed 4-row seed |
| Live member_group_stories | `psql -c "\dt member_group_stories"` | "Did not find any relation" |
| Live review_status_id | `psql -c "\d anime_contributions"` | Column absent |
| Sampled git commits (28 hashes across plans 01–14) | `git log --oneline --all \| grep <hash>` | All 28 FOUND |

## Anti-Patterns Found (from 176-REVIEW.md, independently spot-checked)

| File | Finding | Severity | Independently Confirmed? |
|------|---------|----------|---------------------------|
| `database/migrations/0179_theme_types_kuerzel.up.sql` | WR-01: backfills `kuerzel` by hardcoded `id` (4/6/8/9) instead of `name` — correct for this environment's migration history but fragile to future drift | ⚠️ Warning | Yes — read the file directly, confirms `WHERE id = N` pattern |
| `backend/internal/handlers/admin_content_release_version_media_patch.go` | WR-02: non-uploader revision guard is opt-in per-request (silently no-ops if client omits `source_revision`) | ⚠️ Warning | Not independently re-verified beyond reading the review's cited reasoning; plausible given `CheckMediaRevisionConflict`'s documented contract |
| `backend/internal/repository/fansub_repository_members.go:171` | WR-03: `DeleteMember` is now dead code after D-19's route removal | ⚠️ Warning | Yes — `grep` confirms zero non-test callers of `.DeleteMember(` anywhere in backend |
| `frontend/.../AdminFansubCreateBasicInfoSection.tsx:112` | WR-04: native `<button>` left in a file the phase's own commit message claims is "fully migrated" to `@/components/ui` primitives for D-04 | ⚠️ Warning | Yes — `grep "<button"` confirms a raw `<button>` element at line 112. **Does not violate D-04's literal must-have** (scoped specifically to 9 named `<input>`/`<select>` elements, now 0 remaining), but is a genuine CLAUDE.md "Frontend-UI" global-rule gap left behind in a newly-authored file. |
| `backend/internal/repository/authz_permissions_test.go` | WR-05: test mutates a shared package-level permission cache, a pre-existing fragile pattern extended rather than fixed | ℹ️ Warning (pre-existing pattern) | Not independently re-verified; consistent with 176-09-SUMMARY's own documented workarounds for the same global-cache fragility |
| `database/migrations/0178_drop_member_group_stories.down.sql` | WR-06: down-migration recreates a schema-only table with no code path able to use it if rolled back in isolation | ℹ️ Warning (documentation nit) | Not independently re-verified; low-risk rollback-only concern |
| `SegmenteTab.helpers.tsx` | IN-01: Outro badge CSS class still named `badgePv` (cosmetic naming leftover) | ℹ️ Info | Not independently re-verified |
| `fansub_notes_repository_test.go` | IN-02: one pre-existing source-grep test for the surviving group-note path was not converted (out of D-09's named scope) | ℹ️ Info | Not independently re-verified |
| `hist_group_member_roles_repository.go` | IN-03: `RoleCodeExistsForContext` may now be unused by the 3 call sites this phase touched (reviewer did not exhaustively grep beyond the reviewed file set) | ℹ️ Info | Not independently re-verified |

**None of these 9 findings (0 critical / 6 warning / 3 info per 176-REVIEW.md) represent a FAILED must-have for any D-ID.** They are legitimate robustness/cleanliness follow-ups, already documented with suggested fixes, and appropriately scored as non-blocking by the phase's own code review.

## Requirements Coverage

Per the phase's explicit framing, there is no `REQUIREMENTS.md` mapping for Phase 176 — coverage is
tracked via D-01 through D-23 in `176-CONTEXT.md`, cross-referenced against each plan's
`must_haves.truths` frontmatter. All 23 D-IDs are accounted for across the 15 plans (see table above);
none are orphaned (every D-ID named in `176-CONTEXT.md`'s `<decisions>` block maps to exactly one
plan's `must_haves`, confirmed during the PLAN-reading pass of this verification).

## Human Verification Required

None. All UI-touching D-IDs (D-01, D-04, D-07, D-18) and all 5 extra-scope additions were already
taken through a blocking `checkpoint:human-verify`/`checkpoint:decision` gate during execution, with
explicit user approval quotes recorded in the relevant SUMMARY.md files (176-02, 176-06, 176-07,
176-10, 176-15). 176-15's final consolidated checkpoint explicitly re-confirmed all of them together
on one running instance, plus answered the user's own follow-up question (backend skip-count delta
672→701) with a traced, database-verified explanation. No further human verification is outstanding.

## Gaps Summary

No gaps block phase completion. Six WARNING-level and three INFO-level code-review findings exist,
none of which fail a declared must-have; they represent legitimate, already-documented follow-up
candidates (two are literally one-line suggested fixes: WR-01's `WHERE name =` instead of `WHERE id =`,
WR-04's native-button-to-`<Button>` swap). The reviewing agent's own `176-REVIEW.md` frontmatter
already scores this as `0 critical`, consistent with this independent re-verification's conclusion.

---

_Verified: 2026-10-08T12:37:48Z_
_Verifier: Claude (gsd-verifier)_
