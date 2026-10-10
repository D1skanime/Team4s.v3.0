---
phase: 178-suchen-filtern-vereinheitlichen-f-16-ein-gemeinsamer-umlaut-
fixed_at: 2026-10-10T19:15:36Z
review_path: .planning/phases/178-suchen-filtern-vereinheitlichen-f-16-ein-gemeinsamer-umlaut-/178-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 178: Code Review Fix Report

**Fixed at:** 2026-10-10T19:15:36Z
**Source review:** .planning/phases/178-suchen-filtern-vereinheitlichen-f-16-ein-gemeinsamer-umlaut-/178-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (5 warnings, 2 info — `fix_scope: all`)
- Fixed: 7
- Skipped: 0

## Fixed Issues

### WR-01: D-16 "Abrufgrenze erreicht" hint is dead code for filters #1 and #2

**Files modified:** `frontend/src/app/admin/groups/AdminGroupsClient.tsx`,
`frontend/src/app/admin/groups/AdminGroupsClient.test.tsx`,
`frontend/src/app/admin/fansubs/page.tsx`, `frontend/src/app/admin/fansubs/page.test.tsx`
**Commit:** `eaab5c18`
**Applied fix:** Applied review option (a). Both `loadGroups` (`AdminGroupsClient.tsx`, looping
over 3 statuses) and `loadList` (`admin/fansubs/page.tsx`) previously ran a `do { ... } while`
loop that exhaustively paginated through every page of a status/list before computing
`fetchLimitReached`, making the flag mathematically unreachable under normal conditions. Both
loops now issue a single `per_page: 500` fetch per status (matching filter #3's already-correct,
genuinely-reachable pattern), and `fetchLimitReached` is now a real, truthful signal whenever a
status/list has more than 500 rows. Verified against the existing test fixtures (all of which use
`total_pages: 1`, so behavior is unchanged for the common case) — all 11 pre-existing tests across
both files still pass.

### WR-05: `fetchLimitReached` branch has zero test coverage across all three sites

**Files modified:** `frontend/src/app/admin/groups/AdminGroupsClient.test.tsx`,
`frontend/src/app/admin/fansubs/page.test.tsx`, `frontend/src/app/admin/fansubs/direct-access-gate.test.tsx`
**Commits:** `eaab5c18` (sites #1 and #2), `199beddd` (site #3)
**Applied fix:** Added one test per site that mocks a response where `meta.total` exceeds the
returned page size and asserts the "Abrufgrenze erreicht" `EmptyState` renders:
- `AdminGroupsClient.test.tsx`: mocks the `active` status page returning `total: 2` but only 1
  item, with the `inactive`/`dissolved` status calls returning empty pages — exercises the
  now-reachable branch across the 3-status aggregation.
- `admin/fansubs/page.test.tsx`: mocks a single-page response with `total: 501` vs. 1 returned
  item.
- `frontend/src/app/admin/fansubs/direct-access-gate.test.tsx` (merge wizard, site #3, which had
  no dedicated page test file in review scope): this file already renders `MergeFansubsPage`
  behind a mocked `PlatformAdminGate` for its existing access-gate tests, so it was the natural
  home for a new `describe` block covering the already-reachable single-fetch pattern. Added a
  `mockPlatformAdmin()` helper (mirroring the existing `mockNonPlatformUser()`) and a test
  asserting the hint renders when `meta.total` exceeds the returned data length.

All three new tests pass; full admin test suite run afterward shows 1411/1412 passing (the one
pre-existing failure, `RoleCapabilityDetail.membershipBaselineDrift.test.ts`, is unrelated — it
hardcodes an absolute path `/backend/internal/permissions/permissions.go` that only resolves
inside the Docker container, not on a bare host checkout or worktree; not touched by this fix).

### WR-02: Multiple ASCII-umlaut substitutions in user-facing strings in the merge wizard

**Files modified:** `frontend/src/app/admin/fansubs/merge/page.tsx`
**Commit:** `ca7895a9`
**Applied fix:** Corrected all 5 strings cited by the review ("Vorschau pruefen" ->
"Vorschau prüfen", "zusammenfuehren" -> "zusammenführen" in the wizard step title, the
`Fehler beim Zusammenfuehren` error fallback, the "Fuehre zusammen.../Zusammenfuehren" button
label, and the "aufgeloest" status badge). While re-scanning the same file for the broader
"Sprachqualität" defect class the finding described, found and fixed 6 additional ASCII-umlaut
instances the reviewer's line citations did not enumerate but which are the identical issue in
the identical file: the wizard intro paragraph ("Gefuehrtes Zusammenfuehren" ->
"Geführtes Zusammenführen"), the step-3 heading/subheading ("Vorschau pruefen" x2 ->
"Vorschau prüfen" x2), the step-4 heading ("zusammenfuehren" -> "zusammenführen"), the status
`<option>` value ("Aufgeloest" -> "Aufgelöst"), the alias-preview copy
("hinzugefuegt"/"Hinzugefuegt" -> "hinzugefügt"/"Hinzugefügt"), and the delete-confirmation
checkbox label ("bestaetige" -> "bestätige"). Re-scanned the full file afterward for any
remaining `ae`/`oe`/`ue` substitution patterns — none found (remaining matches are legitimate
words: Quelle/Quellen/Quellgruppen, zuerst, dauerhaft, aktuell, etc.).

### WR-04: Merge wizard search placeholder doesn't reflect the D-18-expanded search scope

**Files modified:** `frontend/src/app/admin/fansubs/merge/page.tsx`
**Commit:** `ca7895a9` (same commit as WR-02, same file)
**Applied fix:** Changed the search placeholder from `"Name oder Slug..."` to
`"Name, Slug oder Tag..."`, mirroring filter #2's exact wording (`admin/fansubs/page.tsx`). Chose
filter #2's literal string over the review's illustrative `"Name, Slug, Kürzel oder Tag..."`
suggestion after confirming both `filterFansubPageItems` and `filterMergeCandidates` search the
identical field set (`name`, `slug`, `kuerzel`, `aliases`) and the UI already labels the `kuerzel`
field "Tag" elsewhere (e.g. "Tag: SAK" in the fansub list table) — using the same wording keeps
the two "unified" filters textually consistent rather than introducing a second, redundant phrase
for the same field.

### WR-03: ASCII-umlaut substitution in the Create-flow tag error hint

**Files modified:** `frontend/src/app/admin/anime/components/CreatePage/AnimeCreateTagField.tsx`
**Commit:** `4f8b9120`
**Applied fix:** Corrected `"vollstaendig"` to `"vollständig"` in the tag-suggestions error hint.
No test asserts this exact string, so no test file needed updating.

### IN-01: Orphaned test block outside its `describe` scope

**Files modified:** `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.test.tsx`
**Commit:** `21700524`
**Applied fix:** Moved the `it('erlaubt Mitgliedern nur Textangaben des eigenen Uploads', ...)`
block back inside the `describe('GroupMediaReviewSection', ...)` block, directly after the
preceding test, and moved the describe's closing `})` to the end of the file. No reindentation
was needed — the orphaned block's existing 2-space indentation already matched its sibling tests.
Ran the full file afterward: all 24 tests pass (23 pre-existing + the newly-nested one), confirming
the move did not change behavior, only structure.

### IN-02: Magic number in `limitAutocompleteSuggestions`

**Files modified:** `frontend/src/app/admin/anime/hooks/useGenreTagAutocomplete.ts`
**Commit:** `edaa70f7`
**Applied fix:** Extracted the hardcoded `80` into a named constant
`SEARCH_RESULT_EXPANSION_FLOOR` with a comment explaining it is intentionally decoupled from the
`genreSuggestionLimit`/`tagSuggestionLimit` defaults (currently `40` in both calling hooks), so a
future reader changing those defaults has an explicit pointer to this coupling decision. All 12
pre-existing tests in `useGenreTagAutocomplete.test.ts` still pass unchanged.

## Skipped Issues

None — all 7 in-scope findings were fixed.

---

_Fixed: 2026-10-10T19:15:36Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
