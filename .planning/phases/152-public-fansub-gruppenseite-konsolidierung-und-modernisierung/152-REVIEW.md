---
phase: 152-public-fansub-gruppenseite-konsolidierung-und-modernisierung
reviewed: 2026-09-08T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - backend/internal/repository/domain_projection_repository.go
  - backend/internal/repository/domain_projection_repository_test.go
  - backend/internal/repository/fansub_public_profile_load_path_test.go
  - backend/internal/repository/fansub_public_profile_query_budget_test.go
  - backend/internal/repository/fansub_repository.go
  - backend/internal/services/tiptap_service.go
  - backend/internal/services/tiptap_service_test.go
  - frontend/src/app/fansubs/[slug]/page.test.tsx
  - frontend/src/app/fansubs/[slug]/page.tsx
  - frontend/src/components/editor/RichTextEditor.test.tsx
  - frontend/src/components/editor/RichTextEditor.tsx
  - frontend/src/components/fansubs/FansubGroupMediaBlock.tsx
  - frontend/src/components/fansubs/FansubHeroSection.tsx
  - frontend/src/components/fansubs/FansubHistorySection.tsx
  - frontend/src/components/fansubs/FansubPublicSections.module.css
  - frontend/src/components/fansubs/__tests__/FansubGroupMediaBlock.test.tsx
  - frontend/src/components/fansubs/__tests__/FansubHistorySection.test.tsx
  - frontend/src/lib/group-history-events.ts
findings:
  critical: 2
  warning: 5
  info: 2
  total: 9
status: issues_found
---

# Phase 152: Code Review Report

**Reviewed:** 2026-09-08
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Reviewed the backend repository/service changes and frontend fansub-public-page
components for Phase 152 (public fansub group page consolidation/modernization),
diffed against `4cce330f`. The domain-projection query trimming, public-profile
load-path split (`getPublicGroupBase`/`attachPublicReleaseVersionsCount`), and the
two new guarded-Postgres constant-query-budget tests are well-constructed and
verified to pass/skip correctly (`go test` and `vitest` both run clean locally;
guarded DSN tests skip as designed without `TEAM4S_PHASE152_TEST_DSN`).

Two things block ship-readiness. First, a real, provable functional regression:
Task 152-02 removed `h1` from the backend's rich-text sanitizer allowlist, but the
frontend `RichTextEditor` toolbar still ships a live "H1" button that produces
heading level 1 — confirmed by direct execution that this now silently degrades to
unstyled plain text on every save with no error or warning shown to the admin.
Second, a new test was added this phase that violates the project's explicit
Teststil rule (`os.ReadFile` + `strings.Contains` against a repository's own
source, asserting behavior was never executed) — while a fully compliant
behavioral twin of the same assertion already exists in the same phase's new
guarded-Postgres test file, making the violating test redundant as well as
non-compliant.

Additional maintainability findings: a comparator-contract bug in history
sorting, dead code left behind from the contributors-query removal, further
growth of an already far-oversized repository file, continued native-`<button>`
non-compliance with the UI-primitives rule in a file this phase touched, and a
test-fixture SQL-interpolation smell in the two new DB-backed test files.

## Critical Issues

### CR-01: RichTextEditor still offers an H1 button that the backend now silently strips to plain text

**File:** `frontend/src/components/editor/RichTextEditor.tsx:177-184`
**File:** `backend/internal/services/tiptap_service.go:330-351` (`resolveHeadingLevel`), `:427-434` (`newTipTapSanitizerPolicy`)

**Issue:** Plan 152-02 intentionally removed `"h1"` from the TipTap sanitizer's
`AllowElements(...)` (commit `03631a38`) because the public fansub page already
renders exactly one `<h1>` (the group name in the Hero) and a rich-text-authored
`<h1>` would break that heading hierarchy — this is documented explicitly in
`152-RESEARCH.md` and `152-CONTEXT.md`. `TestTipTapSanitizeH1_Stripped` correctly
pins that a rendered `<h1>` is now stripped down to its bare text content.

However, the frontend toolbar (`RichTextEditor.tsx`, "full" variant) still renders
a live, unguarded `H1` button:

```tsx
<button
  type="button"
  className={`${styles.toolbarBtn} ${editor.isActive('heading', { level: 1 }) ? styles.toolbarBtnActive : ''}`}
  onClick={() => setHeading(1)}
  title="Überschrift 1"
>
  H1
</button>
```

`setHeading(1)` calls `editor.chain().focus().toggleHeading({ level: 1 }).run()`,
which TipTap validation happily accepts (`ValidateJSON` only checks the node
*type* `"heading"` is in the allowlist, never the `level` attribute). On the
backend, `resolveHeadingLevel` defaults a *missing* level to `1` and clamps
anything to the `[1,3]` range — it never treats `1` as illegal, it renders
`<h1>...</h1>`, which the sanitizer then strips post-hoc.

I reproduced this end-to-end against the actual running backend container
(`docker compose exec team4sv30-backend go test`, ad hoc probe, removed after
verification):

```
input:  {"type":"doc","content":[{"type":"heading","content":[{"type":"text","text":"Titel"}]}]}
output: "Titel"        // <h1> wrapper silently gone, all heading styling lost
```

The same happens for an explicit `{"level":1}` heading. This means: an admin
clicks "H1" in the story editor, types a heading, saves — and gets unstyled
plain text with zero error/warning, on every save, forever (RenderHTML runs the
sanitizer on every render/persist). Neither `RichTextEditor.test.tsx` nor
`tiptap_service_test.go`'s `TestTipTapRenderHTML_heading` test exercises level 1
or a level-less heading end-to-end, so this regression has no test coverage
anywhere in the suite.

**Fix:** Remove the H1 toolbar button (mirroring the backend's h1 removal), and/or
change `resolveHeadingLevel`'s default/clamp floor from `1` to `2` so a
level-less or level-1 heading node degrades to `<h2>` instead of being silently
erased:

```tsx
// RichTextEditor.tsx — drop the H1 button entirely, keep only H2/H3
```

```go
// tiptap_service.go — resolveHeadingLevel: floor at 2, not 1
func resolveHeadingLevel(attrs map[string]any) int {
	if attrs == nil {
		return 2
	}
	lvl, ok := attrs["level"]
	if !ok {
		return 2
	}
	switch v := lvl.(type) {
	case float64:
		level := int(v)
		if level < 2 {
			return 2
		}
		if level > 3 {
			return 3
		}
		return level
	}
	return 2
}
```
Add a regression test asserting `RenderHTML` of a level-1 (or level-less) heading
node never disappears silently.

### CR-02: New test violates the project's Teststil rule (source-read instead of executing behavior)

**File:** `backend/internal/repository/domain_projection_repository_test.go:184-204`

**Issue:** `TestGetFansubGroupDomainProjection_DoesNotCallListProjectionContributors`
was newly added in this phase (confirmed via `git diff 4cce330f..HEAD`, +22 lines,
this is the only new test in the file). It reads the repository's own `.go`
source via `readRepositorySource` and does a `strings.Contains` check that the
`GetFansubGroupDomainProjection` function body doesn't contain the substring
`listProjectionContributors(`:

```go
func TestGetFansubGroupDomainProjection_DoesNotCallListProjectionContributors(t *testing.T) {
	content := readRepositorySource(t, "domain_projection_repository.go")
	funcStart := strings.Index(content, "func (r *DomainProjectionRepository) GetFansubGroupDomainProjection")
	...
	body := content[funcStart : funcStart+1+nextFuncStart]
	if strings.Contains(body, "listProjectionContributors(") {
		t.Fatalf("expected GetFansubGroupDomainProjection to no longer call listProjectionContributors")
	}
	...
}
```

This is precisely the pattern CLAUDE.md's Teststil section forbids by name:
"Das Lesen der eigenen `.go`-Quelldatei ... und die Prüfung eines Substrings per
`strings.Contains`, um zu behaupten, etwas existiere oder greife, ohne den Code
je aufzurufen und eine echte Response zu prüfen." It does not execute
`GetFansubGroupDomainProjection` at all. Worse, this exact assertion already has
a fully compliant, genuinely behavioral twin added in the *same phase*:
`TestDomainProjectionQueryBudgetExcludesContributors` in
`fansub_public_profile_query_budget_test.go` seeds a real contributor row that
would populate the old code path, actually calls
`GetFansubGroupDomainProjection`, and asserts the response's `Contributors` slice
is empty and the query count is exactly 2 — the real proof this repository test
merely imitates via text search. The "closest-analog" exception does not apply:
per CLAUDE.md, local consistency with the file's 20+ pre-existing
`readRepositorySource`/`strings.Contains` tests (tracked debt, see
`.planning/notes/2026-09-02-altlasten-cr01-wr02.md`) explicitly does not justify
adding more of this pattern.

**Fix:** Delete `TestGetFansubGroupDomainProjection_DoesNotCallListProjectionContributors`
— it is fully subsumed by `TestDomainProjectionQueryBudgetExcludesContributors`,
which already proves the same fact behaviorally against a real seeded Postgres
row. If a fast/no-DSN unit-level check is still wanted, assert on the actual
returned `DomainProjectionResponse` struct from a call to
`GetFansubGroupDomainProjection` (e.g. via a fake/mocked `db` at the SQL layer),
not on the source text of the function.

## Warnings

### WR-01: `sortHistory` comparator is not a valid total order for tied null-year items

**File:** `frontend/src/components/fansubs/FansubHistorySection.tsx:45-52`

**Issue:**
```ts
function sortHistory(history: PublicFansubHistory[]): PublicFansubHistory[] {
  return [...history].sort((a, b) => {
    if (a.year === null || a.year === undefined) return 1
    if (b.year === null || b.year === undefined) return -1
    if (a.year !== b.year) return a.year - b.year
    return a.id - b.id
  })
}
```
When both `a.year` and `b.year` are null/undefined, the first branch fires and
returns `1` (meaning "a sorts after b"). But calling the comparator with the
arguments swapped, `compare(b, a)`, also hits the same first branch (now `b` is
the parameter being tested) and again returns `1` ("b sorts after a"). A
consistent comparator must return values of opposite sign when its arguments are
swapped; this one returns the same sign both ways for any pair of null-year
items, which is an invalid/non-antisymmetric comparator. `Array.prototype.sort`
does not throw on this, but the resulting relative order of multiple
null-year history entries is comparator-implementation-defined rather than the
intended "keep null-year entries at the end, in some stable order" — it can
silently reorder or shuffle those entries between renders/inputs.

**Fix:** Handle the both-null case explicitly (e.g. fall back to id ordering)
before the individual-null checks:
```ts
function sortHistory(history: PublicFansubHistory[]): PublicFansubHistory[] {
  return [...history].sort((a, b) => {
    const aNull = a.year === null || a.year === undefined
    const bNull = b.year === null || b.year === undefined
    if (aNull && bNull) return a.id - b.id
    if (aNull) return 1
    if (bNull) return -1
    if (a.year !== b.year) return (a.year as number) - (b.year as number)
    return a.id - b.id
  })
}
```

### WR-02: Dead code left behind after removing the contributors query

**File:** `backend/internal/repository/domain_projection_repository.go:55-70, 269-336`

**Issue:** `listProjectionContributors` (and its return type
`DomainProjectionContributorRow`) is no longer called from anywhere in
production code — `GetFansubGroupDomainProjection` was changed this phase to
stop calling it, and nothing else calls it (confirmed via
`grep -rn listProjectionContributors backend`: only its own definition, its own
doc comments in the new test files, and the two tests that assert it is *not*
called). The `Contributors` field on `DomainProjectionResponse` is now
permanently an empty slice for every request. The function, its 65-line SQL
query, and the row struct are all unreachable dead code kept around purely so a
test can assert they're unreachable (see CR-02).

**Fix:** If the contributors projection is genuinely obsolete, delete
`listProjectionContributors`, `DomainProjectionContributorRow`, and the
`Contributors` field/response wiring outright rather than leaving ~80 lines of
unreachable code plus tests-about-unreachability. If it's being kept
deliberately for a near-future re-enable, say so in a comment above the function
and drop the "not called" tests (which add no protection an actual removal
wouldn't already provide).

### WR-03: `getPublicGroupBase` duplicates the full column list/scan block already used four times in this file

**File:** `backend/internal/repository/fansub_repository.go:323-360` vs. `:172-256`

**Issue:** `getPublicGroupBase` re-declares the identical 17-column
`SELECT ... FROM fansub_groups WHERE slug = $1` query and 17-field `Scan(...)`
call already present verbatim in `GetGroupBySlug` (and near-identical in
`GetGroupByID`/`CreateGroup`/`UpdateGroup`). The file already has a
`scanFansubGroup(rows fansubRowScanner)` helper used by `ListGroups` for exactly
this purpose, but the four/five inline duplicates (now five, with this addition)
were never consolidated onto it.

**Fix:** Route `getPublicGroupBase` (and ideally `GetGroupBySlug`/`GetGroupByID`)
through the existing `scanFansubGroup` helper to avoid a sixth silent drift point
if the column list ever changes:
```go
func (r *FansubRepository) getPublicGroupBase(ctx context.Context, slug string) (*models.FansubGroup, error) {
	row := r.db.QueryRow(ctx, groupSelectQuery, slug) // shared query constant
	item, err := scanFansubGroup(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	...
}
```

### WR-04: `fansub_repository.go` grew further past the project's 450-line modularity ceiling

**File:** `backend/internal/repository/fansub_repository.go`

**Issue:** CLAUDE.md's Modularity constraint states: "Production code files
should stay at or below 450 lines; larger implementations must be split before
they become monolithic." This file was already far over that limit before this
phase (2372 lines at `4cce330f`) and this phase added ~90 net lines
(`getPublicGroupBase`, `attachPublicReleaseVersionsCount`, and their doc
comments), bringing it to 2462 lines — more than 5.5x the stated ceiling. The
new public-profile-load-path methods are a natural, self-contained unit (they
already have their own doc-comment block explaining why they exist) that could
have been split into a new file (e.g. `fansub_public_profile_repository.go`)
instead of growing the existing monolith.

**Fix:** Extract `GetPublicProfileBySlug`, `getPublicGroupBase`,
`attachPublicReleaseVersionsCount`, `listPublicFansubStories`,
`listPublicFansubProjects`, `listPublicFansubHistory`, `listPublicFansubMedia`,
and `publicAnimeSlugSQL` into a dedicated file on the same `FansubRepository`
receiver, e.g. `fansub_public_profile_repository.go`.

### WR-05: `RichTextEditor.tsx`'s full toolbar still hand-builds native `<button>` elements instead of the `Button` primitive

**File:** `frontend/src/components/editor/RichTextEditor.tsx:169-397`

**Issue:** CLAUDE.md's Frontend-UI rule requires all user-facing UI to use
`@/components/ui` primitives and explicitly forbids hand-built native `<button>`
markup for a primitive type `@/components/ui` already provides — the same file
already imports and correctly uses `Button` from `@/components/ui` in the
"minimal" toolbar variant (lines 131-161). The "full" toolbar variant (the
default, used on every longform editor instance including the fansub group
story editor this phase touches) instead renders ~25 raw `<button
className={styles.toolbarBtn} ...>` elements for paragraph/heading/bold/italic/
lists/blockquote/table/undo-redo controls. This predates this phase (only
`link: false` was added to the file in this diff), but it is a live violation of
a "Pflicht" rule in a file this phase modified, and it makes the local
inconsistency (minimal variant uses `Button`, full variant doesn't) worse to
reconcile later.

**Fix:** Migrate the full-toolbar `<button>` elements to the `Button` primitive
(as already done for the minimal variant), preserving `iconOnly`/`variant`
active-state styling via the existing `Button` API.

## Info

### IN-01: New guarded-Postgres test fixtures build SQL via `fmt.Sprintf` interpolation rather than parameters

**File:** `backend/internal/repository/fansub_public_profile_load_path_test.go:82-136`
**File:** `backend/internal/repository/fansub_public_profile_query_budget_test.go:30-176`

**Issue:** `seedPhase152GroupWithFullData`, `seedPhase152PublicProfileQueryBudgetGroup`,
and `seedPhase152DomainProjectionContributorGroup` build every seed `INSERT`
via `fmt.Sprintf("... VALUES (%d, '%s', ...)", ...)` and `Exec` the result,
instead of using `$1`/`$2` bind parameters like the rest of the codebase's SQL
(including this same repository's production queries). All interpolated values
are currently test-controlled literals (numeric IDs, fixed slug strings), so
there is no live injection risk today, but the pattern is a foot-gun if these
helpers are ever extended to accept caller-supplied strings, and it's
inconsistent with the parameterized-query convention used everywhere else in
this package.

**Fix:** Where practical, switch to multiple parameterized `Exec` calls (or
`pgx.Batch`) instead of one large interpolated multi-statement string per seed
helper.

### IN-02: Pre-existing Teststil debt remains adjacent to the new violation (context only)

**File:** `backend/internal/repository/domain_projection_repository_test.go` (all tests except the one flagged in CR-02)

**Issue:** The rest of this file's tests (`TestProjectionSeparatesThreeSets`,
`TestProjectionDisputeStateIsolated`, `TestProjectionClaimedDerivedFromClaims`,
`TestProjectionPublicMemberRowsAvoidInternalIdentity`,
`TestProjectionHistoricalRowsUseMembershipVisibilityForListing`,
`TestProjectionUsesFansubNameBeforeProfileDisplayName`,
`TestProjectionHandlerHasNoEnvelope`, `TestProjectionRouteIsGetOnly`,
`TestProjectionUsesCanonicalPublicMemberSlugs`) all predate this diff and follow
the same `readRepositorySource`/`strings.Contains` pattern flagged in CR-02.
These are already tracked as known debt per
`.planning/notes/2026-09-02-altlasten-cr01-wr02.md` and are not newly introduced
by this phase, so they are not scored as findings here — flagged only so the
new CR-02 addition isn't mistaken for "matching existing file style" (which
CLAUDE.md explicitly says does not excuse the pattern going forward).

---

_Reviewed: 2026-09-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
