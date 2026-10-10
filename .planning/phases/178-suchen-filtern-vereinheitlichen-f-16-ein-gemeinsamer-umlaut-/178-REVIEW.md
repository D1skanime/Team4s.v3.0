---
phase: 178-suchen-filtern-vereinheitlichen-f-16-ein-gemeinsamer-umlaut-
reviewed: 2026-10-10T19:02:15Z
depth: standard
files_reviewed: 26
files_reviewed_list:
  - backend/internal/models/fansub.go
  - backend/internal/repository/fansub_repository_groups.go
  - backend/internal/repository/phase178_fansub_group_aliases_test.go
  - frontend/src/app/admin/anime/components/CreatePage/AnimeCreateGenreField.tsx
  - frontend/src/app/admin/anime/components/CreatePage/AnimeCreateTagField.tsx
  - frontend/src/app/admin/anime/create/internal/useAdminAnimeCreateControllerImpl.ts
  - frontend/src/app/admin/anime/hooks/internal/useAnimePatchImpl.ts
  - frontend/src/app/admin/anime/hooks/useGenreTagAutocomplete.test.ts
  - frontend/src/app/admin/anime/hooks/useGenreTagAutocomplete.ts
  - frontend/src/app/admin/fansubs/fansubPageFilter.test.ts
  - frontend/src/app/admin/fansubs/fansubPageFilter.ts
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx
  - frontend/src/app/admin/fansubs/merge/fansubMergeScoring.test.ts
  - frontend/src/app/admin/fansubs/merge/fansubMergeScoring.ts
  - frontend/src/app/admin/fansubs/merge/page.tsx
  - frontend/src/app/admin/fansubs/page.test.tsx
  - frontend/src/app/admin/fansubs/page.tsx
  - frontend/src/app/admin/groups/AdminGroupsClient.tsx
  - frontend/src/app/admin/groups/adminGroupsFilter.test.ts
  - frontend/src/app/admin/groups/adminGroupsFilter.ts
  - frontend/src/app/dev/ui-system/page.tsx
  - frontend/src/components/ui/EmptyState.tsx
  - frontend/src/lib/textFilter.test.ts
  - frontend/src/lib/textFilter.ts
  - frontend/src/types/fansub.ts
  - shared/contracts/fansubs.yaml
findings:
  critical: 0
  warning: 5
  info: 2
  total: 7
status: issues_found
---

# Phase 178: Code Review Report

**Reviewed:** 2026-10-10T19:02:15Z
**Depth:** standard
**Files Reviewed:** 26 (+1 counted twice as both source/test pair)
**Status:** issues_found

## Summary

The shared `matchesSearch`/`normalizeSearchText` helper (`frontend/src/lib/textFilter.ts`) is
correctly implemented and well tested: accent-strip-only normalization (D-15), no digraph
expansion, `ß` left untouched, null/undefined haystack entries tolerated, empty-query
short-circuit. It is wired consistently into all four required admin filter sites
(`AdminGroupsClient.tsx`, `admin/fansubs/page.tsx`, `admin/fansubs/merge/page.tsx` via
`filterMergeCandidates`, `GroupMediaReviewSection.tsx`), and the `FansubGroup.Aliases` bulk-load
(`attachGroupAliases`) is a correct, single-query, N+1-free implementation mirroring
`attachGroupLinks`, with direct-Postgres tests proving list/single-read parity and the
zero-aliases-is-not-an-error case. The merge wizard's Kürzel/Alias scoring tiers (D-18) are
provably ordered below same-specificity name/slug tiers, matching the locked decision. No
highlighting was added anywhere (D-17 respected), and no hardcoded secrets, eval, or injection
vectors were found.

However, two clusters of defects stood out under closer tracing:

1. The D-16 "Abrufgrenze erreicht" (fetch-limit-reached) hint — a safety net specifically
   decided by the user to warn admins when a dataset silently exceeds what gets fetched — is
   implemented as genuinely dead code in 2 of the 3 fansub-group list sites, because those two
   sites' loading loops already fully paginate past the 500-row page size instead of stopping at
   it. The commit that introduced this for `AdminGroupsClient.tsx` even states "Dead-code-safe
   today (loop always exhausts all pages)" in its own message, and no test exercises the
   `fetchLimitReached` branch in either file.
2. Several user-facing German strings in `admin/fansubs/merge/page.tsx` (and one in
   `AnimeCreateTagField.tsx`) use ASCII umlaut substitutes (`zusammenfuehren`, `pruefen`,
   `aufgeloest`, `vollstaendig`), which is an explicit, unconditional project rule violation
   (CLAUDE.md "Sprachqualität") — found in a file that plan 178-05 heavily edited (search
   extraction, scoring, Input-primitive swap) without touching the neighboring broken strings.

Neither cluster is a security issue or causes data loss, so both are filed as warnings, not
blockers — but the fetch-limit hint in particular ships a decision (D-16) that was never actually
implemented for 2 of 3 required sites, which is a real gap against the phase's own acceptance
criteria.

## Warnings

### WR-01: D-16 "Abrufgrenze erreicht" hint is dead code for filters #1 and #2

**File:** `frontend/src/app/admin/groups/AdminGroupsClient.tsx:357-393`
**File:** `frontend/src/app/admin/fansubs/page.tsx:104-135`
**Issue:** D-16 requires that when the client-side `per_page:500` fetch hits its cap, the UI
shows a hint that not all records may be loaded. Both `AdminGroupsClient.tsx`'s `loadGroups` and
`admin/fansubs/page.tsx`'s `loadList` implement a `do { ... } while (page <= totalPages)` loop
that keeps requesting subsequent 500-row pages until **every** page has been fetched — i.e. they
do not stop at the cap, they exhaustively paginate past it. Because of that, `aggregatedFetched`
(or `allItems.length`) will equal `aggregatedTotal`/`firstPageTotal` under all normal conditions,
so `fetchLimitReached` can essentially never become `true`, and the
`EmptyState variant="info" title="Abrufgrenze erreicht"` block can never render. The commit that
added this for `AdminGroupsClient.tsx` (`dc694dfe`) says so explicitly in its own message:
"Dead-code-safe today (loop always exhausts all pages) but keeps the D-16 pattern consistent
across all three fansub-group filter sites." No test in `AdminGroupsClient.test.tsx` or
`page.test.tsx` ever sets `meta.total` higher than the returned page size to exercise this branch
— the gap went unnoticed by the test suite. Filter #3 (`merge/page.tsx`) does NOT have this
problem: it performs a single, non-looping `getFansubList({ per_page: 500 })` call, so its
`fetchLimitReached` check is genuinely reachable. The inconsistency means two of the three
sibling "unified" filters ship a UI affordance that can never activate, while displaying text
("Es werden die ersten 500 Einträge angezeigt") that would be factually wrong if it ever did
render (the loop fetches everything, not just the first 500).
**Fix:** Either (a) cap the loop at a single page (matching the literal `per_page:500`
pseudo-full-fetch pattern D-16 actually describes, and making the hint truthful and reachable),
or (b) if exhaustive pagination is the intended, more-correct behavior (no admin sees missing
rows), remove the now-provably-dead `fetchLimitReached` state/UI entirely from these two files and
replace the acceptance criterion with something that actually fires (e.g. a warning only when
`aggregatedTotal` crosses a much higher sanity threshold where sequential pagination itself
becomes a real cost). Either way, add a test that sets `meta.total_pages > 1` with decreasing
page sizes to prove whatever the final behavior is supposed to be.

### WR-02: Multiple ASCII-umlaut substitutions in user-facing strings in the merge wizard

**File:** `frontend/src/app/admin/fansubs/merge/page.tsx:33-34,235,835,865`
**Issue:** CLAUDE.md's "Sprachqualität" rule is unconditional and explicitly scoped to JSX text
nodes, button labels, and error messages: "ASCII-Ersetzungen wie ae/oe/ue/ss ... sind in
user-facing Strings verboten." This file (heavily touched by plan 178-05: search extraction,
Kürzel/Alias scoring, Input-primitive swap) still contains:
- `"Vorschau pruefen"` (wizard step title, line 33) — should be "Vorschau prüfen"
- `"Bestätigen & zusammenfuehren"` (wizard step title, line 34) — should be "zusammenführen"
- `"Fehler beim Zusammenfuehren"` (error fallback shown to the admin, line 235) — should be
  "Zusammenführen"
- `"Fuehre zusammen..."` / `"Zusammenfuehren"` (primary action button label, line 835) — should
  be "Führe zusammen..." / "Zusammenführen"
- `"aufgeloest"` (status badge text shown on every group card, line 865) — should be "aufgelöst"
**Fix:** Correct all five strings to use proper umlauts, e.g.:
```tsx
{ id: 3, title: "Vorschau prüfen" },
{ id: 4, title: "Bestätigen & zusammenführen" },
...
setError(err instanceof Error ? err.message : "Fehler beim Zusammenführen");
...
{merging ? "Führe zusammen..." : "Zusammenführen"}
...
: "aufgelöst";
```

### WR-03: ASCII-umlaut substitution in the Create-flow tag error hint

**File:** `frontend/src/app/admin/anime/components/CreatePage/AnimeCreateTagField.tsx:102`
**Issue:** `"Hinweis: Tag-Vorschläge konnten nicht vollstaendig geladen werden."` mixes a
correctly-umlauted word ("Vorschläge") with an ASCII-substituted one ("vollstaendig" instead of
"vollständig") in the same user-facing error hint. This file was directly edited by plan 178-06
(swapping the draft input onto the `Input` primitive) without correcting the adjacent string.
**Fix:**
```tsx
Hinweis: Tag-Vorschläge konnten nicht vollständig geladen werden.
```

### WR-04: Merge wizard search placeholder doesn't reflect the D-18-expanded search scope

**File:** `frontend/src/app/admin/fansubs/merge/page.tsx:392`
**Issue:** D-18 extended the merge wizard's search (via `filterMergeCandidates`) to also match
Kürzel and Alias, not just Name/Slug. The search field's placeholder text was left unchanged at
`"Name oder Slug..."`, which now understates what the field actually searches. Filter #2
(`admin/fansubs/page.tsx`) was updated to hint at the wider scope ("Name, Slug oder Tag..."),
making the two "unified" filters inconsistent in how clearly they communicate equivalent
behavior to the admin.
**Fix:** Update the placeholder, e.g. `placeholder="Name, Slug, Kürzel oder Tag..."`, mirroring
filter #2's wording.

### WR-05: `fetchLimitReached` branch has zero test coverage across all three sites

**File:** `frontend/src/app/admin/groups/AdminGroupsClient.test.tsx`
**File:** `frontend/src/app/admin/fansubs/page.test.tsx`
**File:** `frontend/src/app/admin/fansubs/merge/page.tsx` (no dedicated page test file in review scope)
**Issue:** None of the existing tests ever mock a `meta.total` larger than the returned data
length, so the `fetchLimitReached` state transition (and therefore the D-16 "Abrufgrenze
erreicht" `EmptyState`) is never exercised by any test. This is how WR-01's dead-code defect
went undetected through the plan's own gates.
**Fix:** Add at least one test per site that mocks a paginated response where `meta.total`
exceeds what a single page returns, and assert the "Abrufgrenze erreicht" copy renders (or, if
WR-01 is fixed by removing the hint from the full-pagination sites, assert it is correctly
unreachable there and reachable in the single-shot-fetch site).

## Info

### IN-01: Orphaned test block outside its `describe` scope (pre-existing, not introduced by 178)

**File:** `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.test.tsx:583-622`
**Issue:** The `describe('GroupMediaReviewSection', ...)` block closes at line 583, but the final
`it('erlaubt Mitgliedern nur Textangaben des eigenen Uploads', ...)` test (lines 585-622) sits
outside it at the top level of the file. It still runs (Vitest supports top-level `it`), so this
is not a functional bug, but it is a structural inconsistency that likely indicates an earlier
edit mis-placed a closing brace. This predates phase 178 (confirmed via `git show b35061b0` — the
phase's only touch to this file inserted its new test correctly inside the `describe` block,
several hundred lines earlier) but is visible in the file as currently delivered.
**Fix:** Move the orphaned `it(...)` block back inside the `describe('GroupMediaReviewSection', ...)` block for consistency with the rest of the file.

### IN-02: Magic number in `limitAutocompleteSuggestions`

**File:** `frontend/src/app/admin/anime/hooks/useGenreTagAutocomplete.ts:50-53`
**Issue:** `Math.max(80, limit)` hardcodes `80` as the "show more when searching" threshold with
no named constant or comment explaining why 80 specifically (vs. the `40` default limits defined
in both calling hooks). It is covered by a test asserting the exact behavior, but a future reader
changing the `40` defaults elsewhere has no indication this `80` is coupled to them.
**Fix:** Extract to a named constant, e.g. `const SEARCH_RESULT_EXPANSION_FLOOR = 80` with a short
comment on why it's decoupled from `genreSuggestionLimit`/`tagSuggestionLimit`.

---

_Reviewed: 2026-10-10T19:02:15Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
