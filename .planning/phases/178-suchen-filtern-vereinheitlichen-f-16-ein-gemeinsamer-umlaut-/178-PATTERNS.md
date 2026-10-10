# Phase 178: Suchen & Filtern vereinheitlichen (F-16) - Pattern Map

**Mapped:** 2026-10-10
**Files analyzed:** 15 (6 touched filter sites + 2 new shared helpers + 2 UI-primitive swap sites + 4 backend/contract/type files + 1 possible new primitive)
**Analogs found:** 14 / 15 (1 open item — see "Banner/Hint-Primitive Question" below, resolved with a recommendation, not a hard analog)

## Correction to RESEARCH.md (found during pattern mapping)

**`AnimeEditGenreSection.tsx` is dead code, not the real Edit-flow UI consumer.** It has no
importers anywhere in the frontend (`grep -rln "AnimeEditGenreSection"` only matches its own file).
The actual genre/tag input UI used by **both** the Edit flow (`AnimeEditWorkspace.tsx:691,713`)
and the Create flow (`ManualCreateWorkspace.tsx:321,340`) is the **same pair of components**:
`frontend/src/app/admin/anime/components/CreatePage/AnimeCreateGenreField.tsx` (native `<input>`
at line 67) and `.../CreatePage/AnimeCreateTagField.tsx` (native `<input>` at line 73).

Practical effect on D-02/D-07 (UI-primitive swap scope for #5/#6):
- The UI-primitive swap is **2 files**, not up to 4: `AnimeCreateGenreField.tsx` and
  `AnimeCreateTagField.tsx` — both already shared between Edit and Create, so fixing them once
  fixes both flows' input rendering simultaneously.
- `AnimeEditGenreSection.tsx` does not need to be touched for the UI-primitive swap (it is not
  rendered); if it is still referenced anywhere by a future change, flag it for removal as unrelated
  dead-code cleanup — out of this phase's scope unless the planner decides otherwise.
- This does not change D-19 (which hook module — `useAnimePatchImpl.ts` vs.
  `useAdminAnimeCreateControllerImpl.ts` — becomes canonical); it only clarifies which *rendering*
  component(s) consume the hook's `genreSuggestions`/`tagSuggestions` output.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/lib/textFilter.ts` (new) | utility | transform | `frontend/src/app/admin/fansubs/fansubListSort.ts` | role-match (pure extracted predicate/compare function from an inline `useMemo`) |
| `frontend/src/lib/textFilter.test.ts` (new) | test | transform | `frontend/src/app/admin/fansubs/fansubListSort.test.ts` | exact (identical Vitest `describe/it` pure-function convention) |
| Shared Genre/Tag autocomplete hook (new, e.g. `frontend/src/app/admin/anime/hooks/useGenreTagAutocomplete.ts`) | hook | CRUD (derived/client-filter) | `frontend/src/app/admin/anime/hooks/internal/useAnimePatchImpl.ts` (lines 86-194) | exact (D-19: this file IS the canonical basis, extraction target) |
| Autocomplete hook test file (new) | test | transform | `fansubListSort.test.ts` | role-match |
| `frontend/src/app/admin/groups/AdminGroupsClient.tsx` (#1) | component | CRUD (client-filter) | self (already `Input`-primitive compliant); filter predicate extraction analog: `fansubListSort.ts` | exact (D-02 named this file as a UI-layer Vorbild) |
| `frontend/src/app/admin/fansubs/page.tsx` (#2) | component | CRUD (client-filter) | `AdminGroupsClient.tsx` (`Input` usage) + `fansubListSort.ts` (extraction pattern) | role-match |
| `frontend/src/app/admin/fansubs/merge/page.tsx` (#3) | component | CRUD (client-filter + derived scoring) | `AdminGroupsClient.tsx` (`Input`) + `fansubListSort.ts` (extraction pattern for `relevanceScore`) | role-match |
| `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx` + `GroupMediaReviewFilterBar.tsx` (#4) | component | CRUD (client-filter) | self (already `Input`/`FormField` compliant) — best template for `matchesSearch(haystacks, query)` call shape | exact |
| `frontend/src/app/admin/anime/hooks/internal/useAnimePatchImpl.ts` (#5) | hook | CRUD (client-filter) | itself is the D-19 canonical basis | exact |
| `frontend/src/app/admin/anime/create/internal/useAdminAnimeCreateControllerImpl.ts` (#6) | hook | CRUD (client-filter) | `useAnimePatchImpl.ts` (verbatim duplicate to be deleted) | exact |
| `frontend/src/app/admin/anime/components/CreatePage/AnimeCreateGenreField.tsx` (UI-primitive swap) | component | request-response (controlled input) | `GroupMediaReviewFilterBar.tsx` (`Input` inside `FormField`-less local styling) / `AdminGroupsClient.tsx` (`Input` standalone) | role-match |
| `frontend/src/app/admin/anime/components/CreatePage/AnimeCreateTagField.tsx` (UI-primitive swap) | component | request-response (controlled input) | same as above | role-match |
| D-16 "Abrufgrenze erreicht" hint (new, likely inline in `merge/page.tsx`, called from #1/#2/#3) | component (presentational) | transform (pure comparison, no new fetch) | see "Banner/Hint-Primitive Question" below | partial — no exact UI primitive exists |
| `backend/internal/repository/fansub_repository_groups.go` (D-18: add `attachGroupAliases`) | repository | batch (bulk attach by `ANY($1)`) | `attachGroupLinks` (lines 600-642, same file) | exact |
| `frontend/src/types/fansub.ts` (D-18: add `aliases: string[]` to `FansubGroup`) | model (types) | transform | self — existing interface, additive field | exact |
| `shared/contracts/fansubs.yaml` (D-18: add `kuerzel` + `aliases`) | config (contract) | transform | self — existing `FansubGroup:` schema block (lines 610-631) | exact |

## Pattern Assignments

### `frontend/src/lib/textFilter.ts` (utility, transform) — NEW

**Analog:** `frontend/src/app/admin/fansubs/fansubListSort.ts` (full file, 47 lines) — chosen because
it is the only existing precedent in this codebase for "pure function extracted out of a page's
inline `useMemo` closure, explicitly to satisfy the Teststil-Regel (D-10) and the 450-line rule,"
which is exactly what `textFilter.ts` must also be.

**Shape to copy** (from `fansubListSort.ts:1-4, 24-47`):
```ts
import type { FansubGroup, FansubStatus } from "@/types/fansub";
// ... narrow, named export, no class, no default export ...
export function compareFansubListItems(
  sortKey: FansubSortKey,
  sortDirection: FansubSortDirection,
  left: FansubGroup,
  right: FansubGroup,
): number {
  // pure, no I/O, no React imports
}
```

**Verified normalization body** (from `178-RESEARCH.md`, directly executed via `node -e`, do not
re-derive):
```ts
export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function matchesSearch(
  haystacks: Array<string | null | undefined>,
  query: string,
): boolean {
  const normalizedQuery = normalizeSearchText(query.trim())
  if (!normalizedQuery) return true
  return haystacks
    .filter((value): value is string => Boolean(value))
    .some((value) => normalizeSearchText(value).includes(normalizedQuery))
}
```
This signature is directly modeled on the existing richest filter at
`GroupMediaReviewSection.tsx:196-221` ("array of nullable haystacks, `.filter(Boolean)`,
`.some(includes)`") — do not invent a different call shape for other sites; this is the one that
generalizes cleanest across #1-#4.

---

### `frontend/src/lib/textFilter.test.ts` (test, transform) — NEW

**Analog:** `frontend/src/app/admin/fansubs/fansubListSort.test.ts` (full file, 64 lines).

**Pattern to copy** (lines 1-4, 22-28):
```ts
import { describe, expect, it } from "vitest";
import { compareFansubListItems } from "./fansubListSort"; // → normalizeSearchText/matchesSearch

describe("compareFansubListItems", () => {
  it("sorts by name ascending/descending", () => {
    const a = makeGroup({ id: 1, name: "Alpha" });
    const b = makeGroup({ id: 2, name: "Beta" });
    expect(compareFansubListItems("name", "asc", a, b)).toBeLessThan(0);
  });
});
```
Direct `describe/it` + `expect(...).toBe(...)` on the exported pure function — no render, no mount,
no DOM. For D-15's specific obligation ("belegt durch einen Logik-Test, der die
Helfer-Normalisierung gegen die dokumentierten `f_unaccent`-Abbildungen prüft"), assert the exact
verified mappings from RESEARCH.md:
```ts
expect(normalizeSearchText("Mädchen")).toBe("madchen")
expect(normalizeSearchText("Straße")).toBe("straße") // ß must NOT become "ss"
```

---

### Shared Genre/Tag Autocomplete Hook (hook, CRUD/client-filter) — NEW

**Analog/Source:** `frontend/src/app/admin/anime/hooks/internal/useAnimePatchImpl.ts` (full file,
363 lines) — per D-19 this file **is** the canonical basis, not merely an analog to imitate; extract
verbatim rather than rewriting.

**Blocks to extract** (lines 86-150, catalog-fetch effects; lines 152-194, the four filter/suggest
`useMemo`s):
```ts
useEffect(() => {
  if (genreTokens.length > 0) return
  // ... getAdminGenreTokens({ limit: 1000 }) ...
}, [genreTokens.length])

const genreSuggestions = useMemo(() => {
  const q = values.genreDraft.trim().toLowerCase()
  const selected = new Set(values.genreTokens.map((token) => token.toLowerCase()))
  const filtered = genreTokens.filter((token) => {
    if (selected.has(token.name.toLowerCase())) return false
    if (!q) return true
    return token.name.toLowerCase().includes(q)
  })
  const limit = q ? Math.max(80, genreSuggestionLimit) : genreSuggestionLimit
  return filtered.slice(0, limit)
}, [genreSuggestionLimit, genreTokens, values.genreDraft, values.genreTokens])
```
Per RESEARCH.md point 6, the planner should decide whether the shared hook absorbs just the four
`useMemo` filter blocks (narrow, matches CONTEXT.md's line references exactly) or also the two
catalog-fetch `useEffect`s (broader, removes more duplication, more consistent with D-14).
**Recommendation: absorb both** — the fetch effects are verbatim-duplicated too (confirmed in
RESEARCH.md), and leaving them behind in `useAdminAnimeCreateControllerImpl.ts` would leave dead
weight in an already-oversized (1052-line) file, working against Pitfall 4.

**Note on `matchesSearch` reuse here:** D-15's new `.toLowerCase().includes(q)` pattern used here is
functionally identical to the inline logic this hook already has — when extracting, wire these four
filter blocks through the new `matchesSearch([token.name], q)` helper instead of leaving the inline
`.toLowerCase().includes()` calls, so genre/tag autocomplete also gets umlaut tolerance (not
explicitly required by D-01's file list wording, but D-14's "keine doppelten Implementierungen"
rule argues against keeping a second, slightly different matching style once the shared helper
exists — flag this as a planner decision, not a locked requirement).

**Deletion target (#6):** `frontend/src/app/admin/anime/create/internal/useAdminAnimeCreateControllerImpl.ts`
lines ~258-290 (catalog-fetch effects) and lines 400-442 (filter blocks) — delete in favor of calling
the new shared hook. Verify resulting file line count per Pitfall 4 (currently 1052 lines; this
phase's extraction should shrink it, not merely relocate glue code).

---

### `frontend/src/app/admin/groups/AdminGroupsClient.tsx` (#1, component, CRUD/client-filter)

**Analog:** itself — already compliant with D-02/D-07 for the `Input` primitive.

**Input pattern to preserve as-is** (lines 424-436):
```tsx
<Input
  type="search"
  placeholder="Gruppe suchen ..."
  aria-label="Gruppen suchen"
  value={searchValue}
  onChange={(event) => {
    const nextValue = event.currentTarget.value
    setSearchValue(nextValue)
    updateParams({ q: nextValue })
  }}
/>
```

**Filter predicate to replace** (lines 352-356) — swap the inline closure for a call into
`textFilter.ts` plus, per D-18, Kuerzel/Alias fields once the `aliases`/`kuerzel` data is available
on `FansubGroup`:
```ts
// current (to be replaced):
const filteredGroups = useMemo(() => {
  const query = searchValue.trim().toLowerCase()
  if (!query) return groups
  return groups.filter((group) => group.name.toLowerCase().includes(query) || group.slug.toLowerCase().includes(query))
}, [groups, searchValue])

// target shape (uses new helper + D-18 fields):
const filteredGroups = useMemo(
  () => groups.filter((group) => matchesSearch([group.name, group.slug, group.kuerzel, ...(group.aliases ?? [])], searchValue)),
  [groups, searchValue],
)
```
Per D-16, also wire the existing `loadGroups` (lines 358-385, already a full `do...while` pager) to
the new "Abrufgrenze erreicht" comparison for consistency, even though RESEARCH.md confirms this
site's loop already retrieves every page (dead-code-safe, not a live risk here).

---

### `frontend/src/app/admin/fansubs/page.tsx` (#2, component, CRUD/client-filter)

**Analog for the `Input` swap:** `AdminGroupsClient.tsx` lines 424-436 (above) — same `type="search"`,
`aria-label`, controlled `value`/`onChange` shape; swap the native `<input>` at lines 431-436
(placeholder "Name, Slug oder Tag...") for this `Input` usage.

**Filter predicate to replace** (lines 147-167) — this site already has the richest alias handling
of #1/#2/#3; per Pitfall 2, re-examine the lazy `aliasesByGroup` fetch strategy (effect at lines
237-272, currently keyed to `pagedItems`) once #1/#3 also need alias data for their *entire*
unpaginated lists — the research's recommendation is to switch all three sites to one eager,
upfront per-group alias fetch (14 groups today, trivial) rather than keep #2's page-driven lazy
fetch as the pattern to copy forward.

---

### `frontend/src/app/admin/fansubs/merge/page.tsx` (#3, component, CRUD/client-filter + derived scoring)

**Analog for extraction technique:** `frontend/src/app/admin/fansubs/fansubListSort.ts` — this is
the direct precedent for "extract an inline scoring/compare closure out of a page's `useMemo` into
a named, independently testable module-level function," which is exactly what D-10/D-04 requires
for `relevanceScore` (currently an inline closure at lines 81-91 inside the `filteredGroups`
`useMemo`, lines 80-113).

**Current scoring to preserve and extend (per D-04 + D-18 + Pitfall 3 — extend filter predicate and
scorer in the same change, never split across tasks):**
```ts
function relevanceScore(group: FansubGroup): number {
  if (!query) return 0;
  const name = group.name.toLowerCase();
  const slug = group.slug.toLowerCase();
  if (name === query || slug === query) return 120;
  if (name.startsWith(query)) return 90;
  if (slug.startsWith(query)) return 80;
  if (name.includes(query)) return 55;
  if (slug.includes(query)) return 45;
  return 0;
}
```
Extraction target: a new named export (e.g. `frontend/src/app/admin/fansubs/merge/fansubMergeScoring.ts`,
mirroring `fansubListSort.ts`'s flat-colocated-file convention) with its own `*.test.ts` file in the
exact `fansubListSort.test.ts` style (`makeGroup` helper + `describe/it` + `expect(...).toBeGreaterThan(...)`).

**Input swap:** native `<input>` at lines 398-405 (placeholder "Name oder Slug...") → `Input`
primitive, same shape as `AdminGroupsClient.tsx` above.

**D-16 live call site:** `loadGroups` (lines 65-78) is the one genuine single-call,
non-looping `getFansubList({ per_page: 500 })` fetch — this is where the "Abrufgrenze erreicht"
comparison (`response.data.length < response.meta.total`) actually needs to render visibly.

---

### `GroupMediaReviewSection.tsx` + `GroupMediaReviewFilterBar.tsx` (#4, component, CRUD/client-filter)

**Analog:** itself — already fully D-02/D-07 compliant and is the best existing template for the new
helper's call signature.

**`Input` + `FormField` pairing to preserve as-is** (`GroupMediaReviewFilterBar.tsx:166-172`):
```tsx
<FormField label="Suche">
  <Input
    value={searchTerm}
    placeholder="Titel oder Beschreibung"
    onChange={(event) => setSearchTerm(event.target.value)}
  />
</FormField>
```

**Filter predicate to replace with `matchesSearch`** (`GroupMediaReviewSection.tsx:196-221`,
specifically the `matchesSearch` local variable at lines 231-236 which should become a call to the
new shared helper of the same conceptual name):
```ts
const matchesSearch =
  normalizedSearch.length === 0 ||
  [getMediaDisplayTitle(item), item.description, item.alt_text, item.uploaded_by_display_name]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedSearch))

// target: matchesSearch([getMediaDisplayTitle(item), item.description, item.alt_text, item.uploaded_by_display_name], searchTerm)
```
Naming collision warning: the local variable `matchesSearch` in this file will collide with the
imported helper of the same name — rename the local variable (e.g. `isSearchMatch`) when wiring in
the shared helper.

---

### `AnimeCreateGenreField.tsx` / `AnimeCreateTagField.tsx` (UI-primitive swap, component, request-response)

**Analog:** `AdminGroupsClient.tsx:424-436` or `GroupMediaReviewFilterBar.tsx:166-172` (both already
`Input`-primitive compliant) — use whichever pairing fits better: this component has no `FormField`
wrapper today (uses a bare `<label htmlFor>` + custom `styles.field`/`styles.inputRow` layout), so
the `AdminGroupsClient.tsx` bare-`Input` shape (no `FormField`) is the closer structural match.

**Current native input to replace** (`AnimeCreateGenreField.tsx:67-79`, `AnimeCreateTagField.tsx:73`
is structurally identical):
```tsx
<input
  id="create-genre"
  value={draft}
  onChange={(event) => onDraftChange(event.target.value)}
  disabled={isSubmitting}
  placeholder="z. B. Action, Drama"
  onKeyDown={(event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      onAddDraft()
    }
  }}
/>
```
Swap for `<Input id="create-genre" value={draft} onChange={...} disabled={...} placeholder={...}
onKeyDown={...} />` — the `Input` primitive (`frontend/src/components/ui/Input.tsx`) is a thin
`forwardRef` wrapper around a native `<input>` that accepts all standard `InputHTMLAttributes`, so
this is a drop-in swap with no behavior change, only `className`/styling swapped to the shared
token-driven `styles.control` class.

---

### Backend: `attachGroupAliases` (new, repository, batch) — for D-18

**Analog:** `attachGroupLinks` in the same file, `backend/internal/repository/fansub_repository_groups.go:600-642`
— identical shape needed: bulk `ANY($1)` query keyed by group ID, results appended into a
pre-built `indexByID` map back onto the `[]models.FansubGroup` slice passed by reference.

**Pattern to copy:**
```go
func (r *FansubRepository) attachGroupLinks(ctx context.Context, items []models.FansubGroup) error {
	if len(items) == 0 {
		return nil
	}
	ids := make([]int64, 0, len(items))
	indexByID := make(map[int64]int, len(items))
	for i := range items {
		ids = append(ids, items[i].ID)
		indexByID[items[i].ID] = i
	}
	rows, err := r.db.Query(ctx, `
		SELECT id, group_id, link_type, name, url, created_at
		FROM fansub_group_links
		WHERE group_id = ANY($1)
		ORDER BY link_type ASC, created_at ASC, id ASC
	`, ids)
	// ... scan, append items[index].Links, rows.Err() ...
}
```
New `attachGroupAliases` should follow this exact shape, querying
`SELECT fansub_group_id, alias FROM fansub_group_aliases WHERE fansub_group_id = ANY($1) ORDER BY alias ASC`
and appending into a new `items[index].Aliases []string` field, called from `ListGroups` (same file,
lines 14-67) alongside the existing `attachGroupCounts`/`attachGroupLinks` calls. Also update
`models.FansubGroup` (`backend/internal/models/fansub.go:39-66`) to add
`Aliases []string \`json:"aliases,omitempty"\`` next to the existing `AliasesCount int
\`json:"aliases_count"\`` field (same optional/omitempty convention as `Links`, line 65).

**Existing single-group alias query to mirror the column list from** (`fansub_repository_aliases.go:13-27`,
`ListAliases`) — confirms the correct table/column names (`fansub_group_aliases.alias`,
`fansub_group_id`).

---

### `frontend/src/types/fansub.ts` (model/types, transform) — for D-18

**Pattern:** add the missing field next to its sibling count field, same optional-nullable style
already used throughout this interface (lines 20-47):
```ts
export interface FansubGroup {
  // ... existing fields ...
  aliases_count: number;
  aliases?: string[];       // NEW — bulk-loaded alias strings (D-18)
  // ...
}
```
Also note (not this phase's bug, but relevant context): `kuerzel?: string | null` already exists
on this TS interface (line 24) — the drift is only in the YAML contract, not here.

---

### `shared/contracts/fansubs.yaml` (config/contract, transform) — for D-18

**Current drift to fix** (lines 610-631, `FansubGroup:` block) — missing `kuerzel` entirely (present
in Go model and TS type, absent here) and missing the new `aliases` field:
```yaml
FansubGroup:
  id: int64
  slug: string
  name: string
  kuerzel: string | null        # ADD — pre-existing drift, not caused by this phase
  logo_id: int64 | null
  # ... unchanged ...
  aliases_count: int32
  aliases: string[]              # ADD — new field, D-18
  created_at: datetime
  updated_at: datetime
```

## Shared Patterns

### Pure-function extraction + colocated Vitest test (D-10 compliance)
**Source:** `frontend/src/app/admin/fansubs/fansubListSort.ts` +
`frontend/src/app/admin/fansubs/fansubListSort.test.ts`
**Apply to:** `textFilter.ts`/`textFilter.test.ts`, the shared autocomplete hook, and the extracted
`merge/page.tsx` scoring function. This is the single most important shared pattern in this phase —
every new testable unit should look like this pair: a flat colocated file, no class, named exports
only, tests that call the exported function directly with `describe/it`/`expect`, no render/mount.

### `Input` primitive usage (D-02/D-07 compliance)
**Source:** `frontend/src/app/admin/groups/AdminGroupsClient.tsx:424-436` (bare, no `FormField`) and
`frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewFilterBar.tsx:166-172` (wrapped in
`FormField`).
**Apply to:** `admin/fansubs/page.tsx` (#2), `admin/fansubs/merge/page.tsx` (#3),
`AnimeCreateGenreField.tsx`, `AnimeCreateTagField.tsx`. Both existing shapes are valid — choose
bare `Input` when there is no visible `<label>` element already in the surrounding markup
(`AnimeCreateGenreField.tsx`/`AnimeCreateTagField.tsx` already render their own `<label>`, so bare
`Input` with the existing `id`/`htmlFor` wiring is the right fit, not a new `FormField` wrapper).

### Bulk-attach-by-ID repository pattern (D-18 backend half)
**Source:** `attachGroupLinks`, `backend/internal/repository/fansub_repository_groups.go:600-642`
**Apply to:** new `attachGroupAliases` function, same file, called from `ListGroups`.

### `matchesSearch(haystacks, query)` call shape
**Source:** `GroupMediaReviewSection.tsx:196-221` (the richest existing multi-field filter)
**Apply to:** all 6 filter sites uniformly — every call site passes an array of nullable strings,
never a single concatenated string, so the helper's `.filter(Boolean)` step does the null-safety
work once instead of being repeated ad hoc per site.

## Banner/Hint-Primitive Question (D-16) — explicit answer for the planner

**Question:** Does an existing `@/components/ui` building block fit a calm, informational
(non-error-red) message above a list, for the "Abrufgrenze erreicht" hint?

**Finding:** There is **no exposed `Alert`/`Banner`/`Info`-style component** in `@/components/ui`
today (confirmed via directory listing — only `EmptyState`, `ErrorState`, `LoadingState` exist as
"state card" components, plus `Badge` for small inline tags). However, the **shared CSS already
defines the exact visual tone needed** and it is simply not exposed through a flexible component
yet:

- `frontend/src/components/ui/ui.module.css` lines 123-179 define `.stateCard` (the shared
  card chrome used by `EmptyState`/`ErrorState`/`LoadingState`) plus three icon-tone modifiers:
  `.stateNeutral` (gray), `.stateDanger` (red, used by `ErrorState`), and **`.stateInfo`**
  (accent-primary blue/brand-colored icon, lines 176-179) — `.stateInfo` is currently used **only**
  by `LoadingState.tsx:22` (`classNames(styles.stateCard, styles.stateInfo, ...)`), never exposed as
  a user-facing "info" variant on `EmptyState` or as its own component.
- `Badge` has a `variant="info"` (`Badge.module.css:40-44`, soft blue background/text) — this is a
  much smaller, inline, single-line primitive (a `<span>`), not shaped for a sentence-length hint
  above a list.

**Recommendation for the planner (pick one):**
1. **(Preferred, smallest change)** Add a new, small, exported `variant: 'info'` option to
   `EmptyState`'s existing `EmptyStateVariant` union (currently `'default' | 'withAction' |
   'compact' | 'inline'`), mapping to `styles.stateInfo` instead of `styles.stateNeutral` — this
   reuses 100% of the existing `.stateCard`/`.stateInfo` CSS already defined and already proven in
   `LoadingState.tsx`, requires no new CSS, and is a ~3-line change to an existing, already-exported
   primitive rather than a net-new component. Shown automatically in `/dev/ui-system` wherever
   `EmptyState`'s variants are already demonstrated (needs a new sample case added there).
2. **(Alternative, if the planner wants a dedicated name)** Add a new tiny `InfoHint`/`Notice`
   component in `@/components/ui` that directly reuses `classNames(styles.stateCard,
   styles.stateInfo, styles.stateCompact)` from `ui.module.css` (i.e., it would look almost
   identical to `LoadingState.tsx`'s JSX minus the spinner) — more explicit naming, marginally more
   code than option 1, but avoids overloading `EmptyState`'s semantics (an "info hint above a
   non-empty list" is not really an "empty state").
3. **(Not recommended)** Inline a local `<p>` with an ad hoc CSS-module class scoped to
   `merge/page.tsx` only (the pattern RESEARCH.md flags as "proportionate... given D-16 only has one
   real call site today"). This is technically valid per CLAUDE.md's rules (the global-UI-primitive
   rule applies to *primitive types already offered* — `select`/`input`/`textarea`/`button`; a
   one-off informational paragraph is not one of those four enumerated element types) but forfeits
   the reusable `.stateInfo` tone that already exists in the shared CSS for no reason, and would
   not appear in `/dev/ui-system` for future reuse.

**Do not build a brand-new CSS tone from scratch** — `.stateInfo` already exists, is already wired
into `ui.module.css`, and already has a working real-world consumer (`LoadingState.tsx`) to copy
the `classNames(...)` call from. The only genuinely missing piece is a component that *exposes*
this tone for a non-loading, non-empty, informational message — options 1 and 2 both close that gap
with minimal new code; no new primitive needs inventing, only a small extension of what already
exists.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| D-16 "Abrufgrenze erreicht" hint presentational component | component | transform | No existing `Alert`/`Info`/`Banner` component is directly importable as-is — see the dedicated section above for the closest-fit extension path (`EmptyState` `variant: 'info'` or a new minimal `InfoHint` using the already-defined `.stateInfo` CSS tone) |

## Metadata

**Analog search scope:** `frontend/src/app/admin/groups/`, `frontend/src/app/admin/fansubs/`,
`frontend/src/app/admin/anime/`, `frontend/src/components/ui/`, `frontend/src/lib/`,
`frontend/src/types/`, `backend/internal/repository/`, `backend/internal/handlers/`,
`backend/internal/models/`, `shared/contracts/`
**Files scanned:** ~20 (6 filter sites in full or targeted ranges, 2 UI-primitive-swap consumer
components, `@/components/ui` directory + 6 primitive source files, 1 backend repository file in
full, 1 backend handler file (function list), 1 backend model file (grep), frontend types/api-lib
files, 1 contract YAML section)
**Pattern extraction date:** 2026-10-10
