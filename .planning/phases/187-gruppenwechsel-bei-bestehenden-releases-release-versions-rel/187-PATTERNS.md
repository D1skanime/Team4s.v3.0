# Phase 187: Gruppenwechsel bei bestehenden Releases - Pattern Map

**Mapped:** 2026-10-19
**Files analyzed:** 7 production files (3 new/extended seams, 4 modified call sites) + 1 frontend
page file requiring a split
**Analogs found:** 7 / 7
**Scope note:** 187-RESEARCH.md already covers the TEST-file analogs (fixture harness, fake-repo
httptest pattern, Code Examples section) in file:line detail. This document covers the
PRODUCTION files only, as requested, and does not repeat RESEARCH.md's test-architecture content.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/internal/repository/release_version_group_guard.go` (NEW) | repository (read-only guard/aggregation) | CRUD (aggregated read, pre-write check) | `backend/internal/repository/fansub_repository_merge_duplicates.go:360-394` (`countMergeVersionConflicts`) | role-match (same package, same "count dependents across related tables before a write" shape) |
| `backend/internal/repository/errors.go` (MODIFY — add one sentinel) | model/error-definition | n/a | `backend/internal/repository/errors.go:8` (`ErrConflict`), `anime.go:16` (`ErrNotFound`) | exact (same file, same declaration idiom) |
| `backend/internal/handlers/episode_version_update.go` (MODIFY) | controller (HTTP handler) | request-response | itself, lines 65-78 (existing `errors.Is` sentinel chain) + `admin_content_anime_relations.go:172` (409 envelope shape) | exact |
| `backend/internal/repository/episode_version_repository_write_helpers.go` (MODIFY) | repository (write helper) | CRUD (DELETE/INSERT junction sync) | itself, lines 197-256 (`upsertReleaseVersionGroupsForSync` / `syncEpisodeVersionSelectedGroups`) | exact (file being extended, not replaced) |
| `backend/internal/repository/episode_import_repository_release_helpers.go` (MODIFY) | repository (write helper, import path) | CRUD (DELETE/INSERT junction sync) | `episode_version_repository_write_helpers.go:197-226` (structurally identical DELETE/INSERT, the editor-path twin) | exact (cross-file sibling pattern already flagged as "structurally identical" in CONTEXT.md Abschnitt 3 #5) |
| `backend/internal/repository/episode_import_repository_apply.go` (MODIFY) | repository (batch apply orchestration) | batch / transform (per-row apply loop inside one tx) | itself, lines 100-123 (the `for _, mapping := range plan.mappings` loop) + `models/episode_import.go:10,205` (unused `EpisodeImportMappingStatusConflict` / `Conflicts` seam) | exact |
| `backend/internal/handlers/fansub_admin.go` + new `fansub_*_guard_handler.go`-style file (MODIFY/NEW, only if a narrow interface seam is chosen for handler tests) | middleware/controller wiring | request-response | `backend/internal/handlers/fansub_project_resolver_handler.go:15-30` + `fansub_admin.go:39-63` (`projectResolverRepo fansubProjectResolverRepo` field) | exact (precedented, narrow interface-on-concrete-struct deviation) |
| `frontend/.../edit/EpisodeVersionEditorPage.tsx` "Fansub Gruppen" section (MODIFY + SPLIT) | component | request-response / UI state | `frontend/.../edit/ReleaseVersionMetadataFields.tsx` (extracted-section-component pattern) + commit `92ae35e8c` (`frontend/src/app/admin/anime/[id]/episodes/import/page.tsx`, native-button-to-`Button`-primitive migration) | exact |
| `frontend/.../edit/useEpisodeVersionEditor.ts` (MODIFY, error-surfacing only — see note below) | hook | request-response | itself, lines 348-349 (`catch (error) { setErrorMessage(formatError(error)) }`) + `frontend/.../edit/episodeVersionEditorUtils.ts:33-36` (`formatError`) + `frontend/src/lib/api/client.ts:158-186` (`ApiError` with `.code`) | exact — may need **no code change** at all for the 409 fallback path; see Pattern Assignments below |

## Pattern Assignments

### `backend/internal/repository/release_version_group_guard.go` (NEW — repository, CRUD/aggregated read)

**Analog:** `backend/internal/repository/fansub_repository_merge_duplicates.go:360-394`
(`countMergeVersionConflicts`)

**Core pattern to copy** (read-only COUNT query returning an int/struct, called as a pre-write
guard before any mutating statement in the same transaction):
```go
// Source: backend/internal/repository/fansub_repository_merge_duplicates.go:360-394
func (r *FansubRepository) countMergeVersionConflicts(
	ctx context.Context,
	targetID int64,
	sourceIDs []int64,
) (int, error) {
	var conflicts int
	if err := r.db.QueryRow(ctx, `
		WITH candidate_versions AS (
			SELECT ...
			FROM release_version_groups rvg
			JOIN release_versions rev ON rev.id = rvg.release_version_id
			JOIN fansub_releases fr ON fr.id = rev.release_id
			LEFT JOIN release_variants rv ON rv.release_version_id = rev.id
			WHERE rvg.fansub_group_id = $2
			   OR rvg.fansub_group_id = ANY($1)
		)
		SELECT COUNT(*) FROM (...) conflicts
	`, sourceIDs, targetID).Scan(&conflicts); err != nil {
		return 0, fmt.Errorf("count merge conflicts: %w", err)
	}
	...
}
```
Call-site precedent for how a guard result gates a write (also from this file, line 41-47):
```go
conflicts, err := r.countMergeVersionConflicts(ctx, targetID, sourceIDs)
if err != nil {
	return nil, err
}
if conflicts > 0 {
	return nil, ErrConflict
}
```
**What the new guard must do differently (per CONTEXT.md D-08/D-09):** query
`release_role_credit_lifecycles` (real credits, RESTRICT), `release_crew_snapshots` filtered to
exclude the `snapshot_mode='inherited'` AND-no-linked-credits case (D-09 — empty inherited
snapshot must NOT count), and `release_version_media` / `release_version_notes` by
`fansub_group_id` (D-08 — these have no FK to `release_version_groups` at all, must be queried
directly). The function should return a structured breakdown (e.g. counts per kind), not just a
boolean/int, because the 409 response (D-02/D-10) must report "Anzahl je Art" in German — a bare
`int` like `countMergeVersionConflicts` returns is NOT sufficient for this guard's response shape;
only the "read-only pre-write COUNT query in the same package" shape should be copied, not the
single-int return type.

**Function signature recommendation (from RESEARCH.md Open Question 1, reuse verbatim):**
```go
countReleaseVersionGroupDependents(ctx, tx, releaseVersionID, groupID) (DependencySummary, error)
```

---

### `backend/internal/repository/errors.go` (MODIFY — add sentinel)

**Analog:** `backend/internal/repository/errors.go:8` and `backend/internal/repository/anime.go:16`

```go
// Source: backend/internal/repository/errors.go:8
var ErrConflict = errors.New("conflict")
// Source: backend/internal/repository/anime.go:16
ErrNotFound = errors.New("not found")
```
Add a new sentinel the same way, e.g. `var ErrGroupHasDependents = errors.New("release version group has dependents")`
(exact name is the planner's choice — RESEARCH.md's Code Examples section already names this
candidate). Keep it in `repository` package scope so both
`episode_version_update.go`'s `errors.Is` chain and the import apply loop's per-row `continue`
logic can match on it with `errors.Is`.

---

### `backend/internal/handlers/episode_version_update.go` (MODIFY — controller, request-response)

**Analog:** itself (extend the existing chain), plus 409 envelope convention from
`backend/internal/handlers/admin_content_anime_relations.go:172`

**Existing sentinel-error chain to extend** (lines 65-78):
```go
// Source: backend/internal/handlers/episode_version_update.go:65-78
item, err := h.episodeVersionRepo.Update(c.Request.Context(), versionID, input)
if errors.Is(err, models.ErrEpisodeVersionDateOrder) {
	badRequest(c, models.ErrEpisodeVersionDateOrder.Error())
	return
}
if errors.Is(err, repository.ErrNotFound) {
	c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "episodenversion nicht gefunden"}})
	return
}
if errors.Is(err, repository.ErrConflict) {
	c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "versionskombination bereits vorhanden"}})
	return
}
```
**409 envelope shape to reuse for the new breakdown message** (two-field convention: `message` +
`code`):
```go
// Source: backend/internal/handlers/admin_content_anime_relations.go:172
c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "relation existiert bereits oder ist ungültig", "code": "relation_conflict"}})
```
New branch slots directly above the existing fall-through to the generic 500 (today's failure
mode for live-reproduced Case B):
```go
if errors.Is(err, repository.ErrGroupHasDependents) {
	c.JSON(http.StatusConflict, gin.H{"error": gin.H{
		"message": "<deutscher Text mit Aufschlüsselung je Art>",
		"code":    "release_version_group_has_dependents",
	}})
	return
}
```
**Access-control note (D-11):** the existing `IsPlatformAdmin`-vs-`isReleaseMetadataOnlyPatch` gate
at lines 41-56 is explicitly unchanged by this phase — the new guard sits entirely inside/after
`h.episodeVersionRepo.Update(...)`, it is not a new branch in the permission gate.

---

### `backend/internal/repository/episode_version_repository_write_helpers.go` (MODIFY)

**Analog:** itself — the two functions being extended are already in this exact file.

**Current DELETE/INSERT core to wrap with the guard** (lines 197-226, `upsertReleaseVersionGroupsForSync`):
```go
// Source: backend/internal/repository/episode_version_repository_write_helpers.go:199-226
func upsertReleaseVersionGroupsForSync(
	ctx context.Context, tx pgx.Tx, releaseVersionID int64, memberGroups []resolvedImportFansubGroup,
) error {
	newIDs := make([]int64, len(memberGroups))
	for i, g := range memberGroups { newIDs[i] = g.ID }
	if _, err := tx.Exec(ctx, `
		DELETE FROM release_version_groups
		WHERE release_version_id = $1 AND fansub_group_id <> ALL($2::bigint[])
	`, releaseVersionID, newIDs); err != nil {
		return fmt.Errorf("reset release version groups version=%d: %w", releaseVersionID, err)
	}
	for _, group := range memberGroups {
		if _, err := tx.Exec(ctx, `
			INSERT INTO release_version_groups (release_version_id, fansub_group_id)
			VALUES ($1, $2) ON CONFLICT (release_version_id, fansub_group_id) DO NOTHING
		`, releaseVersionID, group.ID); err != nil {
			return fmt.Errorf("upsert release version group version=%d group=%d: %w", releaseVersionID, group.ID, err)
		}
	}
	return nil
}
```
**Today's 0-groups gap to fix (D-06/D-14)** — `syncEpisodeVersionSelectedGroups`, lines 228-256,
currently does a blanket `DELETE` even to zero rows:
```go
// Source: backend/internal/repository/episode_version_repository_write_helpers.go:245-249
if len(memberGroups) == 0 {
	if _, err := tx.Exec(ctx, `DELETE FROM release_version_groups WHERE release_version_id = $1`, releaseVersionID); err != nil {
		return fmt.Errorf("clear release version groups version=%d: %w", releaseVersionID, err)
	}
	return nil
}
```
This branch must instead return the new `repository.ErrGroupHasDependents`-sibling "would leave
zero groups" error (D-06 is explicit: a release must always have at least one group) — a pure
length check that runs BEFORE any `DELETE`/`INSERT`, per RESEARCH.md Pitfall 4.

**Guard call site:** the dependents guard belongs in `upsertReleaseVersionGroupsForSync`, applied
per REMOVED group (every `fansub_group_id` in the old junction set that is not in `newIDs`) before
the `DELETE` statement runs — mirroring how `countMergeVersionConflicts` gates
`fansub_repository_merge_core.go`'s write at lines 41-47 (see guard file's Pattern Assignment
above for that call-site shape).

**Upstream call site (for context, not itself requiring new logic):**
```go
// Source: backend/internal/repository/episode_version_repository.go:408-420
if input.FansubGroups.Set || input.FansubGroupID.Set {
	...
	if err := syncEpisodeVersionSelectedGroups(ctx, tx, state.ReleaseVersionID, state.AnimeID, selectedGroups, fansubGroupID, input.FansubGroups.Set || input.FansubGroupID.Set); err != nil {
		return nil, err
	}
}
```
This is where `repository.ErrGroupHasDependents` (or the 0-groups sentinel) naturally propagates
up to `episode_version_update.go`'s `errors.Is` chain unchanged — no new plumbing needed at this
call site, just the error bubbling through existing `return nil, err`.

---

### `backend/internal/repository/episode_import_repository_release_helpers.go` (MODIFY)

**Analog:** `episode_version_repository_write_helpers.go:197-226` (cross-file sibling; itself
already noted in CONTEXT.md Abschnitt 3 #5 as "strukturell identisches DELETE/INSERT").

**Current DELETE/INSERT to extend** (lines 239-263, `upsertReleaseVersionGroup`):
```go
// Source: backend/internal/repository/episode_import_repository_release_helpers.go:239-263
newIDs := make([]int64, len(memberGroups))
for i, g := range memberGroups { newIDs[i] = g.ID }
if _, err := tx.Exec(ctx, `
	DELETE FROM release_version_groups
	WHERE release_version_id = $1 AND fansub_group_id <> ALL($2::bigint[])
`, releaseVersionID, newIDs); err != nil {
	return fmt.Errorf("reset release version groups version=%d: %w", releaseVersionID, err)
}
...
for _, group := range memberGroups {
	if _, err := tx.Exec(ctx, `
		INSERT INTO release_version_groups (release_version_id, fansub_group_id)
		VALUES ($1, $2) ON CONFLICT (release_version_id, fansub_group_id) DO NOTHING
	`, releaseVersionID, group.ID); err != nil { ... }
}
```
**Entry point for the 0-groups guard (D-14, closing CONTEXT.md Abschnitt 3 #5's documented
asymmetry)** — `upsertReleaseVersionGroup` at line 218-221 currently early-returns WITHOUT deleting
anything when the group list resolves empty:
```go
// Source: backend/internal/repository/episode_import_repository_release_helpers.go:218-221
memberGroups, err := resolveImportFansubSelection(ctx, tx, mapping, media)
if err != nil || len(memberGroups) == 0 {
	return err
}
```
This asymmetry (editor deletes to zero, import silently no-ops) must become an identical
rejection to the editor path's new zero-groups check, per D-14.

**Critical divergence from the editor path's guard (D-12, RESEARCH.md Pitfall 3):** this call
site's guard must NOT block "same group(s), already assigned, re-applied" (the routine
`VersionsUpdated` re-import case) — only an actual REPLACE (removing a group with dependents and
putting a different one in its place). The guard check here needs an "is this id set a superset
of / identical to the current set" exception that the editor path's guard does not have. Do not
copy the editor-path guard call verbatim; compute the removed-group set first and only apply the
dependents guard to groups actually being dropped — same low-level
`countReleaseVersionGroupDependents` call, different wrapping logic.

---

### `backend/internal/repository/episode_import_repository_apply.go` (MODIFY — batch loop)

**Analog:** itself (the loop to restructure) + existing unused seams in `models/episode_import.go`

**Current hard-abort loop** (lines 100-123, `applyReleaseNative`):
```go
// Source: backend/internal/repository/episode_import_repository_apply.go:100-123
for _, mapping := range plan.mappings {
	if mapping.Status == models.EpisodeImportMappingStatusSkipped {
		result.Skipped++
		continue
	}
	media := plan.mediaByID[models.JellyfinSourceKey{ItemID: mapping.MediaItemID, SourceID: mapping.MediaSourceID}]
	releaseIDs := episodeImportReleaseIDs{ ... }
	created, err := upsertImportReleaseGraph(ctx, tx, r.crewSeeder, releaseIDs, mapping, media, episodeIDsByNumber, &learned)
	if err != nil {
		return nil, err   // <-- whole-batch abort, violates D-12
	}
	if created {
		result.VersionsCreated++
	} else {
		result.VersionsUpdated++
	}
	result.MappingsApplied++
}
```
**Existing unused enum/field to reuse instead of inventing new ones** (RESEARCH.md Pattern 3,
already verified unused by `grep`):
```go
// Source: backend/internal/models/episode_import.go:10
EpisodeImportMappingStatusConflict  EpisodeImportMappingStatus = "conflict"
// Source: backend/internal/models/episode_import.go:197-205
type EpisodeImportApplyResult struct {
	...
	Skipped          int32 `json:"skipped"`
	Conflicts        int32 `json:"conflicts"`
	...
}
```
**Required change:** when `upsertImportReleaseGraph` (via `upsertReleaseVersionGroup`) returns
`repository.ErrGroupHasDependents` for a given mapping, the loop must `result.Conflicts++` and
`continue` to the next mapping instead of `return nil, err` — matching RESEARCH.md Pitfall 1's
recommendation (pre-check before any write for that mapping, so no partial-write rollback is
needed). Every other mapping in the batch must still be applied (one HTTP 200 for the whole
request, per-row status carries the conflict, not the HTTP status code).

---

### Narrow interface seam for handler tests (OPTIONAL — only if Pattern 2 interface route is chosen)

**Analog:** `backend/internal/handlers/fansub_project_resolver_handler.go:15-30` +
`backend/internal/handlers/fansub_admin.go:39-63` (field `projectResolverRepo` at line 62)

```go
// Source: backend/internal/handlers/fansub_project_resolver_handler.go:15-24
// fansubProjectResolverRepo is the narrow interface ResolveFansubProject
// depends on, satisfied by *repository.FansubProjectResolverRepository.
// Defined here (production code) rather than only in the test file so a
// hand-rolled httptest fake can exercise the real handler method, per
// CLAUDE.md's Teststil requirement that behavioral assertions execute the
// checked code rather than reimplementing or source-matching it.
type fansubProjectResolverRepo interface {
	ResolveProject(ctx context.Context, groupSlug string, animeSlug string) (*repository.ResolvedFansubProject, error)
	ListProjectNavigationProjects(ctx context.Context, groupID int64) ([]repository.ProjectNavigationItem, error)
}
```
```go
// Source: backend/internal/handlers/fansub_admin.go:39-63 (relevant field only)
type FansubHandler struct {
	...
	episodeVersionRepo *repository.EpisodeVersionRepository // concrete pointer, majority pattern
	...
	projectResolverRepo fansubProjectResolverRepo            // narrow interface, precedented exception
}
```
If the planner chooses Pattern 2 (fake-interface handler tests, RESEARCH.md Architecture Patterns)
rather than Pattern 2's fixture-only alternative, define a similarly narrow
`releaseVersionGroupDependentsChecker` interface the same way (production code, not test-only),
add one field to `FansubHandler`, and write a fake satisfying it exactly like
`admin_capability_impact_handler_test.go:23-31`'s `fakeCapabilityImpactRoleHolderRepo` (already
cited in RESEARCH.md — see that document for the full fake/httptest pattern, not repeated here).

---

### `frontend/.../edit/EpisodeVersionEditorPage.tsx` "Fansub Gruppen" section (MODIFY + SPLIT)

**Current section to extract** (lines 807-873, native `<input>`/`<button>` elements — the
CLAUDE.md design-system violation named in CONTEXT.md):
```tsx
// Source: frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx:807-873
<section className={styles.card}>
  <div className={styles.sectionHeader}>
    <div>
      <h2 className={styles.sectionTitle}>Fansub Gruppen</h2>
      <p className={styles.helperText}>
        Suche nach Gruppenname oder Alias. Mehrere Gruppen werden als Kollaboration gespeichert.
      </p>
    </div>
  </div>
  <label className={styles.field}>
    <span>Gruppe suchen</span>
    <input value={editor.groupQuery} onChange={(event) => editor.setGroupQuery(event.target.value)} placeholder="Name oder Alias..." />
  </label>
  {editor.groupResults.length > 0 ? (
    <div className={styles.groupSearchList}>
      {editor.groupResults.map((group) => (
        <button key={group.id} type="button" className={styles.groupSearchItem} onClick={() => editor.addGroup(group)}>
          <strong>{group.name}</strong>
          <span>{"Gruppe"} | {group.slug}</span>
        </button>
      ))}
    </div>
  ) : null}
  <div className={styles.chipRow}>
    {editor.selectedGroups.length > 0 ? (
      editor.selectedGroups.map((group) => (
        <button key={group.id} type="button" className={styles.chip} title={`Slug: ${group.slug}`} onClick={() => editor.removeGroup(group.id)}>
          {group.name} x
        </button>
      ))
    ) : (
      <span className={styles.helperText}>Keine Gruppe ausgewählt.</span>
    )}
  </div>
</section>
```

**Split pattern to copy** — `ReleaseVersionMetadataFields.tsx` is the existing precedent for
extracting a `<section>` out of this exact page file into a standalone colocated component using
`@/components/ui` primitives and the shared CSS module:
```tsx
// Source: frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMetadataFields.tsx:1-32
import type { Dispatch, SetStateAction } from 'react'
import { DatePicker, FormField, Input, Select } from '@/components/ui'
import type { EpisodeVersionEditorContext } from '@/types/episodeVersion'
import { ... , type FormState } from './episodeVersionEditorUtils'
import styles from './EpisodeVersionEditor.module.css'

interface ReleaseVersionMetadataFieldsProps {
  context: EpisodeVersionEditorContext
  formState: FormState
  setFormState: Dispatch<SetStateAction<FormState>>
  projectTimeline: AnimeFansubProjectTimeline | null
  selectedGroupIds?: readonly number[]
}

export function ReleaseVersionMetadataFields({ context, formState, setFormState, ... }: ReleaseVersionMetadataFieldsProps) {
  return (
    <>
      <div className={styles.grid}>
        <FormField label="Release-Name" htmlFor="release-title">
          <Input id="release-title" value={formState.title} onChange={...} />
        </FormField>
        ...
      </div>
    </>
  )
}
```
Build the new `FansubGroupsSection.tsx` (name is the planner's choice) the same way: props-in
(`groupQuery`, `setGroupQuery`, `groupResults`, `selectedGroups`, `addGroup`, `removeGroup`,
`isSearching`, `searchMessage`, plus a new per-group "dependents reason" prop for D-10's
disabled-chip affordance), import `Button`/`Input`/`FormField` from `@/components/ui`, keep using
`EpisodeVersionEditor.module.css` for the section/chip-row wrapper classes.

**Native-to-primitive button migration pattern to copy** (already executed once in this exact
codebase, Phase 186-04, commit `92ae35e8c`):
```tsx
// Source: git show 92ae35e8c -- frontend/src/app/admin/anime/[id]/episodes/import/page.tsx
- <button
-   className={styles.secondaryButton}
-   type="button"
-   onClick={() => builder.skipAllSuggested()}
-   disabled={!builder.hasSuggestedRows}
- >
-   Alle Vorschläge überspringen
- </button>
+ <Button
+   variant="secondary"
+   size="sm"
+   className={styles.secondaryButton}
+   onClick={() => builder.skipAllSuggested()}
+   disabled={!builder.hasSuggestedRows}
+ >
+   Alle Vorschläge überspringen
+ </Button>
```
Apply the same migration to the group-search-result `<button>` (→ `Button variant="secondary"`)
and the removable chip `<button>` (→ `Button variant="subtle"` or similar, since chips are a
distinct visual affordance from the primary/secondary action buttons — the planner should pick
one of `Button`'s existing variants, not invent a new one; see
`frontend/src/components/ui/Button.tsx:8` for the full `ButtonVariant` union
`'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'success' | 'text' | 'floating'`).
`Button` already forwards all native `ButtonHTMLAttributes` (including `title`, used today for the
chip's `Slug: ...` tooltip at line 861) — the D-10 disabled-with-reason tooltip can reuse the exact
same `title={...}` prop, just computed from the new dependents data instead of the slug:
```tsx
// Source: frontend/src/components/ui/Button.tsx:36-49 (relevant destructure)
export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', ..., disabled = false, ..., ...domProps } = props
  ...
  // domProps (incl. title, onClick) spread onto the native <button>/<a> below
}
```
Input field migration: replace the native `<input>` (`styles.field` wrapper, line 820) with
`Input` from `@/components/ui/Input.tsx` — it already accepts all native `InputHTMLAttributes`
plus an `invalid` prop, no new wrapper needed:
```tsx
// Source: frontend/src/components/ui/Input.tsx:7-28
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid = false, disabled, ...props }, ref) {
  return <input {...props} ref={ref} disabled={disabled} className={classNames(styles.control, invalid && styles.controlInvalid, disabled && styles.controlDisabled, className)} />
})
```

**Label change (D-05):** the section's `<h2>` "Fansub Gruppen" and/or the search-field label
"Gruppe suchen" becomes "Partnergruppe hinzufügen" per the locked decision — exact wording/placement
(heading vs. field label vs. both) is the planner's call, CONTEXT.md only fixes the semantic label,
not the DOM position.

**Chip disabled-state-with-reason (D-10):** the existing `removeGroup` chip button (line 857-865)
gets a `disabled` + `title` pair driven by a new per-group dependents flag — e.g.
`disabled={group.dependentsSummary != null} title={group.dependentsSummary ? formatDependentsReason(group.dependentsSummary) : \`Slug: ${group.slug}\`}`.
The data source for `dependentsSummary` is a planning decision (extend
`EpisodeVersionEditorContext.selected_groups` — `frontend/src/types/episodeVersion.ts:72`,
currently `FansubGroupSummary[]` with no dependents field — or a separate fetch); note this as the
natural extension point, not a prescribed shape.

---

### `frontend/.../edit/useEpisodeVersionEditor.ts` (MODIFY — likely minimal/no change needed)

**Analog:** itself, lines 348-349 (existing catch-all save error handler) +
`episodeVersionEditorUtils.ts:33-36` (`formatError`) + `frontend/src/lib/api/client.ts:158-186`
(`ApiError`)

```ts
// Source: frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts:348-349
} catch (error) {
  if (generation === contextGeneration.current) setErrorMessage(formatError(error))
}
```
```ts
// Source: frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.ts:33-36
export function formatError(error: unknown): string {
  if (error instanceof ApiError) return `(${error.status}) ${error.message}`
  return 'Anfrage fehlgeschlagen.'
}
```
```ts
// Source: frontend/src/lib/api/client.ts:158-186
export class ApiError extends Error {
  status: number
  code: string | null
  ...
}
```
**Important finding:** `formatError` already surfaces `ApiError.message` (the backend's
`error.message` JSON field) with the HTTP status prefixed — this means the new 409's German
breakdown text (D-10's server-side half) will already render in the existing
`setErrorMessage(formatError(error))` catch block with **zero new code**, as long as the backend
sets `error.message` to the full German breakdown sentence (per the handler pattern above). Only
touch this hook if the planner wants to react specifically to `error.code ===
"release_version_group_has_dependents"` (e.g. to keep the save button enabled for retry, or to
highlight which chip caused it) — that would be a new, deliberate branch, not a required change
for D-10's minimum bar.

## Shared Patterns

### Sentinel error -> 409 envelope (backend)
**Source:** `backend/internal/repository/errors.go:8`, `anime.go:16` (declaration) +
`backend/internal/handlers/episode_version_update.go:65-78` (dispatch chain) +
`backend/internal/handlers/admin_content_anime_relations.go:172` (envelope shape)
**Apply to:** `episode_version_update.go`'s updated `errors.Is` chain; any new handler-side mapping
of `repository.ErrGroupHasDependents` (and the 0-groups sentinel, if a separate one is used).
```go
if errors.Is(err, repository.ErrGroupHasDependents) {
	c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "<deutsch>", "code": "release_version_group_has_dependents"}})
	return
}
```

### Read-only dependents/conflict COUNT query inside a repository package
**Source:** `backend/internal/repository/fansub_repository_merge_duplicates.go:360-394`
**Apply to:** `release_version_group_guard.go` (new) — same package-internal, no-interface,
plain-SQL-query shape; only the return type (struct breakdown vs. bare int) differs because of
D-02/D-10's per-kind message requirement.

### Narrow interface on an otherwise-concrete-struct handler
**Source:** `backend/internal/handlers/fansub_project_resolver_handler.go:15-30`,
`fansub_admin.go:62`
**Apply to:** Only if the planner picks the fake-interface handler-test route (RESEARCH.md
Pattern 2 / Assumption A3) rather than the real-Postgres-fixture route for
`episode_version_update_test.go` / the import apply conflict test.

### Reuse existing inert enum/counter instead of inventing new fields
**Source:** `backend/internal/models/episode_import.go:10` (`EpisodeImportMappingStatusConflict`),
`:205` (`EpisodeImportApplyResult.Conflicts`)
**Apply to:** `episode_import_repository_apply.go`'s restructured per-row loop — this is a hard
requirement from both CONTEXT.md D-12 and RESEARCH.md Pattern 3/Don't-Hand-Roll, not optional.

### Extracted-section component + native-to-`@/components/ui`-primitive migration
**Source:** `frontend/.../edit/ReleaseVersionMetadataFields.tsx` (extraction shape) + commit
`92ae35e8c` (`frontend/src/app/admin/anime/[id]/episodes/import/page.tsx`, migration diff)
**Apply to:** The new `FansubGroupsSection.tsx` (or equivalent name) extracted from
`EpisodeVersionEditorPage.tsx`'s 807-873 block — both the file-split shape and the
button/input-primitive migration are required by CONTEXT.md's "Verbindliche Vorgaben", and this is
the second time this exact migration is done in this codebase (first time: Phase 186-04), so the
diff shape above is a strong, repeatable precedent, not a one-off.

## No Analog Found

None. Every production file this phase is expected to touch has at least a role-match analog
either in the same file (self-extension) or in a structurally close sibling file within the same
package/directory.

## Metadata

**Analog search scope:** `backend/internal/repository/`, `backend/internal/handlers/`,
`backend/internal/models/`, `frontend/src/app/admin/episode-versions/[versionId]/edit/`,
`frontend/src/components/ui/`, plus one cross-reference into
`frontend/src/app/admin/anime/[id]/episodes/import/` for the Phase-186 Button-migration precedent
and git history (`git show 92ae35e8c`).
**Files scanned (read in full or targeted range):** `episode_version_repository_write_helpers.go`,
`episode_import_repository_release_helpers.go`, `episode_import_repository_apply.go`,
`episode_version_update.go`, `episode_version_repository.go` (lines 390-426),
`fansub_repository_merge_duplicates.go` (lines 355-394), `fansub_repository_merge_core.go` (lines
41-69, via grep), `fansub_admin.go` (lines 1-70), `fansub_project_resolver_handler.go` (lines
1-30), `admin_capability_impact_handler_test.go` (full), `admin_content_anime_relations.go` (lines
150-185), `models/episode_import.go` (relevant ranges), `repository/errors.go` + `anime.go`
(grep), `EpisodeVersionEditorPage.tsx` (lines 1-40, 780-879), `useEpisodeVersionEditor.ts` (lines
220-360, grep for `formatError`), `episodeVersionEditorUtils.ts` (formatError def),
`ReleaseVersionMetadataFields.tsx` (lines 1-70), `components/ui/Button.tsx` (full),
`components/ui/Input.tsx` (full), `EpisodeImportMappingRow.tsx` (lines 120-172, conflict-status
rendering already in place for the import mapper UI).
**Pattern extraction date:** 2026-10-19
