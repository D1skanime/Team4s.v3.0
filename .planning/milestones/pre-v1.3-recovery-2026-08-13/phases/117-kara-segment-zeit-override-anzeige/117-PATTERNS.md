# Phase 117: Kara-Segment — Zeit-Override je Folge + entdoppelte Anzeige - Pattern Map

**Mapped:** 2026-07-29
**Files analyzed:** 14 (target files for full Option B per CONTEXT D-03)
**Analogs found:** 14 / 14

**Scope reminder (D-03, locked):** Full Option B — a shared, per-release-version *assignable*
Kara + per-version time-offset. This replaces the 1:1 `theme_segment_playback_sources →
release_variant_id` binding with a per-(segment, release-version) resolution, and replaces the
today's per-episode row duplication with a group/assignment concept. The migration/repository
patterns below are chosen to support that structural change, not the smaller Option A.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `database/migrations/0141_theme_segment_assignments.up.sql` (new) | migration | CRUD (schema) | `database/migrations/0054_theme_segment_playback_sources.up.sql` | exact (same domain, same 1-row-per-target-entity → N-rows-per-target-entity restructuring shape) |
| `database/migrations/0141_..._{down}.sql` (new) | migration | CRUD (schema) | `database/migrations/0122_theme_segment_render_cache.down.sql` | role-match |
| `database/migrations/0142_theme_segment_episode_overrides.up.sql` (new, if split from 0141) | migration | CRUD (schema) | `database/migrations/0049_extend_theme_segments.up.sql` | role-match (additive time-range/constraint columns) |
| `backend/internal/repository/theme_segment_overrides.go` (new) | repository | CRUD | `backend/internal/repository/theme_segment_render_cache.go` | exact (same package, same "new focused repo file next to admin_content_anime_themes.go" convention, same upsert/list/delete/scan shape) |
| `backend/internal/repository/admin_content_anime_themes.go` (modified: `resolved_variant` CTE, `ListAnimeSegments`, `loadThemeSegmentPlaybackSnapshotTx`, `syncThemeSegmentPlaybackSourceTx`) | repository | CRUD | itself (existing file, in-place edit) | exact |
| `backend/internal/models/admin_anime_themes.go` (modified: add assignment/override fields to `AdminThemeSegment`, new `AdminThemeSegmentAssignment`/`AdminThemeSegmentEpisodeOverride` structs) | model | transform (DTO) | `backend/internal/models/theme_segment_render_cache.go` | exact (small focused model file next to a focused repo file — same pairing convention) |
| `backend/internal/handlers/admin_content_anime_theme_segments.go` (modified: new override endpoints, `validateSegmentTimes` reuse) | controller (handler) | request-response | itself (existing file, in-place edit) + `backend/internal/handlers/segment_render_refresh.go` for the invalidation call site | exact |
| `backend/internal/handlers/segment_render_refresh.go` (modified: `segmentRenderInputsChanged` must consider per-episode-resolved time, not just `AdminThemeSegment.StartTime/EndTime`) | controller (handler helper) | event-driven (cache invalidation) | itself (existing file, in-place edit) | exact |
| `backend/internal/handlers/segment_render_worker.go` (modified: cache key must be unique per resolved episode/release-version, not just per `theme_segment_id`) | worker | event-driven / batch | itself (existing file, in-place edit) | exact |
| `backend/internal/repository/release_detail_public_repository_helpers.go` (modified: `loadReleaseSegments` gains dedup logic using `loadAdjacentReleases`) | repository | request-response (read) | itself (existing file, in-place edit) | exact |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx` (modified: new Override block, Surface 1) | component | request-response (form) | `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx` (for the *new* primitive-based sub-block) + itself (for the surrounding panel structure) | role-match (sibling panel in same dir, already uses `FormField`/`Textarea` primitives correctly) |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx` (modified: dedup table rows, Surface 2 badges) | component | request-response (list/table) | itself (existing file, in-place edit) | exact |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseSegments.ts` (modified: new API calls for assign/unassign/override) | hook | CRUD (client data layer) | itself (existing file, in-place edit) | exact |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx` (modified: new `isSharedSegment`/`hasOverrideInAssignment` helpers) | utility | transform | itself (existing file, in-place edit) | exact |
| `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx` (modified: Surface 3 "Gilt auch für Folge X–Y" badge) | component | request-response (render) | itself (existing file, `SegmentDetails` sub-component, in-place edit) | exact |
| `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.tsx` | component (SSR data assembly) | request-response | itself (existing file; no change expected — it just passes `detail.segments` through) | exact |
| `frontend/src/types/releaseDetail.ts` (modified: extend `PublicReleaseSegment` with span/override fields) | model (TS type) | transform (DTO mirror) | itself (existing file, in-place edit) | exact |
| `shared/contracts/admin-content.yaml` (modified: segment schema + new override/assignment endpoints) | config (OpenAPI contract) | request-response | itself (existing file) | exact |

---

## Pattern Assignments

### `database/migrations/0141_theme_segment_assignments.up.sql` (migration, schema)

**Analog:** `database/migrations/0054_theme_segment_playback_sources.up.sql` (full file read above)
and `database/migrations/0122_theme_segment_render_cache.up.sql` (full file read above).

**Convention to copy — table + constraint shape** (`0054_theme_segment_playback_sources.up.sql:5-47`):
```sql
CREATE TABLE IF NOT EXISTS theme_segment_playback_sources (
    id BIGSERIAL PRIMARY KEY,
    theme_segment_id BIGINT NOT NULL REFERENCES theme_segments(id) ON DELETE CASCADE,
    source_kind VARCHAR(32) NOT NULL
        CHECK (source_kind IN ('episode_version', 'jellyfin_theme', 'uploaded_asset')),
    release_variant_id BIGINT REFERENCES release_variants(id) ON DELETE SET NULL,
    ...
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_theme_segment_playback_target CHECK (...)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_theme_segment_playback_sources_segment
    ON theme_segment_playback_sources (theme_segment_id);
```
The new assignment table replaces the `UNIQUE INDEX ... (theme_segment_id)` (which is exactly the
1:1 constraint the RESEARCH.md flags as the structural blocker,
`admin_content_anime_themes.go:1366-1391`) with a `UNIQUE (theme_segment_id, release_version_id)`
— one row per (shared Kara, release-version) assignment, mirroring how `0054` bound
segment→variant but now binding segment→**release_version**, with the concrete `release_variant_id`
resolved per-assignment rather than globally per-segment.

**Convention to copy — CHECK-based payload validation** (`0122_theme_segment_render_cache.up.sql:31-55`):
Use named `CONSTRAINT chk_*` blocks with `CHECK (status <> 'x' OR (...))` shape for any
conditional-payload validation (e.g. "if `has_time_override` then start/end must be non-null").

**Convention to copy — index naming** (`0054_theme_segment_playback_sources.up.sql:36-47`,
`0122_theme_segment_render_cache.up.sql:58-72`): `uq_<table>_<columns>` / `idx_<table>_<columns>`,
always `CREATE ... IF NOT EXISTS`.

**Append-only convention:** Next migration number after `0140_search_foundation` (highest existing)
is `0141`. Never edit an existing `*.up.sql`/`*.down.sql` pair — always add a new numbered pair.

**Capability migration analog** (only if a new capability-gated write path is introduced —
unlikely since `release_version.segments.manage` already exists and can be reused, see
Shared Patterns → Authorization below):
`database/migrations/0119_release_version_segments_manage_capability.up.sql` (full file read
above) shows the `INSERT INTO action_definitions ... ON CONFLICT DO UPDATE` +
`INSERT INTO role_capabilities ... ON CONFLICT DO NOTHING` two-step pattern.

---

### `backend/internal/repository/theme_segment_overrides.go` (new repository file)

**Analog:** `backend/internal/repository/theme_segment_render_cache.go` (full file read above,
479 lines — near the 450-line limit itself; the new file must stay well under 450 by NOT trying
to also own assignment CRUD — split assignment queries into a second file if needed, e.g.
`theme_segment_assignments.go`, following the same one-concern-per-file split already used for
`admin_content_anime_theme_segments.go` (handler) vs `admin_content_anime_themes.go` (repository)).

**Imports pattern** (`theme_segment_render_cache.go:1-12`):
```go
package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)
```

**Columns-as-constant + scan-function pattern** (`theme_segment_render_cache.go:14-39`,
`432-468`):
```go
const themeSegmentRenderCacheColumns = `
	id,
	theme_segment_id,
	...
`

func scanThemeSegmentRenderCache(row pgx.Row) (*models.ThemeSegmentRenderCache, error) {
	var item models.ThemeSegmentRenderCache
	var status string
	if err := row.Scan(&item.ID, &item.ThemeSegmentID, ...); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("scan theme segment render cache: %w", err)
	}
	item.Status = models.ThemeSegmentRenderStatus(status)
	return &item, nil
}
```
Reuse for the new file: a `themeSegmentOverrideColumns` const + `scanThemeSegmentOverride(row pgx.Row)`
helper, so both single-row (`QueryRow`) and multi-row (`Query` + loop) callers share one scan
function — exactly the shape used throughout this file (e.g. `GetThemeSegmentRenderCacheByKey`
vs `ListThemeSegmentRenderCaches`, lines 97-107 vs 148-179).

**Upsert-with-ON-CONFLICT pattern** (`theme_segment_render_cache.go:41-95`): use
`INSERT ... ON CONFLICT (<unique cols>) DO UPDATE SET ... RETURNING <columns>` for the
per-(segment, release_version) override upsert — mirrors exactly what a per-version override
write needs (idempotent write keyed by the same tuple the new unique index enforces).

**Input validation before query** (`theme_segment_render_cache.go:411-430`,
`validateThemeSegmentRenderCacheUpsertInput`): a plain top-level `validate*Input(input) error`
function called first inside the public method, returning `fmt.Errorf("theme segment ...: <reason>")`
— reuse this shape for override input validation (non-DB-round-trip constraints only; DB-level
CHECK constraints from the migration remain the source of truth).

**Delete + row-count pattern** (`theme_segment_render_cache.go:181-194`,
`DeleteThemeSegmentRenderCaches`): `Exec` + `tag.RowsAffected()`, return `(int64, error)`.

**Nil-safe pointer trim helper** (`theme_segment_render_cache.go:470-479`, `trimStringPtr`):
already defined package-wide in this file — reuse it directly rather than redefining in the new
file (same package `repository`).

---

### `backend/internal/repository/admin_content_anime_themes.go` (modify `resolved_variant` CTE + `ListAnimeSegments`)

**Analog:** itself. Current `resolved_variant` CTE (`admin_content_anime_themes.go:1366-1391`,
read above) resolves "the first matching variant of any episode" with **no** filter against
`ts.start_episode`/`ts.end_episode` — this is the exact bug RESEARCH.md Risk 3 flags and Option B
requires fixing structurally (the new assignment table replaces this CTE's job entirely: instead
of guessing a variant from `fansub_group_id`+`version`, the caller looks up
`theme_segment_assignments WHERE theme_segment_id = $1 AND release_version_id = $2`).

**`ListAnimeSegments` query shape to extend** (`admin_content_anime_themes.go:373-467`, read
above): dynamic `WHERE` clause built with `fmt.Sprintf(" AND ts.fansub_group_id = $%d", argIdx)`
and an `argIdx` counter — reuse this exact incremental-placeholder pattern if a new
`release_version_id` filter param is added to the list query (needed for the admin table to know
which release-versions a shared segment is currently assigned to, for the "Zuweisungsliste"
disclosure in UI-SPEC Surface 2). The existing `hydrateSegmentPlaybackMetadataList` /
`hydrateSegmentLibraryMetadataList` two-pass hydration calls at the end of `ListAnimeSegments`
(lines 459-464) are the pattern to follow for a new `hydrateSegmentAssignmentMetadataList` pass.

**Playback snapshot resolution to extend** (`loadThemeSegmentPlaybackSnapshotTx`,
`admin_content_anime_themes.go:1363-1440`, read above): this function currently reads
`ts.start_time`/`ts.end_time` directly off `theme_segments`. For Option B, the per-episode
effective time must first check for an override row keyed by the resolved
`(theme_segment_id, release_version_id)` before falling back to the segment's base time — follow
the existing `LEFT JOIN resolved_variant rv_ctx ON TRUE` CTE-join style (line 1417) to add a
`LEFT JOIN theme_segment_episode_overrides ov ON ov.theme_segment_id = ts.id AND
ov.release_version_id = <resolved release_version>` and `COALESCE(ov.start_time, ts.start_time)`.

**Upsert-in-transaction pattern to reuse for assignments**
(`syncThemeSegmentPlaybackSourceTx`, `admin_content_anime_themes.go:1327-1358`, read above):
`INSERT ... ON CONFLICT (theme_segment_id) DO UPDATE SET ... = EXCLUDED...., updated_at = NOW()`
inside a `tx pgx.Tx` — the assignment write path (assign Kara to a release-version) should follow
the identical `ON CONFLICT (theme_segment_id, release_version_id) DO UPDATE` shape, run inside the
same transaction boundary as the segment/override write so a partial write can't leave a Kara
"half-assigned".

---

### `backend/internal/handlers/admin_content_anime_theme_segments.go` (modify + new override endpoints)

**Analog:** itself (846 lines total — check current size before adding; if the new override
endpoints push it over 450, split into a new `admin_content_anime_theme_segment_overrides.go`
handler file, following the existing repo/handler split convention).

**Imports pattern** (`admin_content_anime_theme_segments.go:1-20`, read above):
```go
package handlers

import (
	"context"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)
```

**Reuse directly, do not re-implement — `validateSegmentTimes`**
(`admin_content_anime_theme_segments.go:27-57`, full excerpt above): the override time fields
(Start/Ende Folge N) must run through this exact function (same `maxSegmentWindowSeconds = 240`
4-minute cap, same start<end check, same runtime-ceiling check) — UI-SPEC Copywriting Contract
explicitly requires reusing these exact German error strings ("Ende muss nach dem Start liegen.",
"Segment-Zeitbereich darf maximal 4 Minuten lang sein.").

**Reuse directly — `parseClockToSeconds`** (`admin_content_anime_theme_segments.go:60-85`): same
HH:MM:SS/MM:SS parser for override time inputs.

**Authorization pattern to reuse — `requireSegmentManage`**
(`admin_content_anime_theme_segments.go:159-186`, full excerpt above): every new override/assign
write handler must call this exact function first (capability
`release_version.segments.manage`, already migrated in `0119`, already granted to
`fansub_lead`/`project_lead`/`timer` roles) — do not invent a new capability. Note it takes a
`releaseVariantID` (not `release_version_id`); the new assignment endpoints operate on
release-versions, so check whether a `release_version_id`-based variant of this function is
needed, or resolve a representative `release_variant_id` for the permission check the same way
existing call sites do.

**Request/response DTO pattern** (`admin_content_anime_theme_segments.go:115-145`, read above):
```go
type adminAnimeSegmentCreateRequest struct {
	ThemeID              int64   `json:"theme_id"`
	FansubGroupID        *int64  `json:"fansub_group_id"`
	...
}
```
New override/assignment request structs (`adminAnimeSegmentOverrideRequest`,
`adminAnimeSegmentAssignmentRequest`) should follow this flat-struct-with-json-tags shape,
declared right above the handler that consumes them.

---

### `backend/internal/handlers/segment_render_refresh.go` (modify invalidation trigger)

**Analog:** itself (172 lines, full file read above).

**Core comparison function to extend** (`segmentRenderInputsChanged`, lines 17-30):
```go
func segmentRenderInputsChanged(before *models.AdminThemeSegment, after *models.AdminThemeSegment) bool {
	if before == nil || after == nil {
		return false
	}
	return stringPtrValue(before.StartTime) != stringPtrValue(after.StartTime) ||
		stringPtrValue(before.EndTime) != stringPtrValue(after.EndTime) ||
		...
}
```
For Option B this must compare the **effective per-episode time** (base time XOR override time),
not just `AdminThemeSegment.StartTime`/`EndTime` — otherwise saving an override for Folge 7 would
never invalidate Folge 7's render cache. Follow the same nil-safe `stringPtrValue`/
`int64PtrValue`/`int32PtrValue` helpers already defined at the bottom of this file
(lines 153-172) for the new override-aware comparison fields.

**Invalidation call chain to reuse unmodified**
(`resetAndQueueSegmentRenderAfterChange`, lines 32-75): delete-old-cache → re-fetch source →
build-new-queued-cache. This whole chain stays valid; it is invoked per resolved
(segment, episode) pair. **Risk carried over from RESEARCH.md Risk 5:** `AttachSegmentLibraryAsset`
bypasses this function today — any new assignment/override write path must call
`resetAndQueueSegmentRenderAfterChange` explicitly, it will not happen automatically.

---

### `backend/internal/handlers/segment_render_worker.go` (modify cache key uniqueness)

**Analog:** itself (192 lines). `executeSegmentRender` builds `outputRel := cache.CacheKey + ".mp4"`
(referenced in RESEARCH.md) — RESEARCH.md Risk 1 explicitly flags that the cache key today is
1:1 per `theme_segment_id` with no episode discriminator. The cache-key builder
`services.BuildSegmentRenderCacheKey` (called from `segment_render_refresh.go:122-129`, excerpt
above) takes a `services.SegmentRenderWindow{SegmentID, SourceKind, SourceIdentity, StartSeconds,
EndSeconds, RenderProfile}` struct — for Option B, `SourceIdentity` (already derived from the
resolved stream's external ID/URL, which differs per episode) already provides the needed
per-episode uniqueness as long as callers pass the resolved-per-episode `StartSeconds`/
`EndSeconds` (post-override) rather than the segment's base time. Verify this in
`services/segment_render.go` (not yet read — locate via Grep on `BuildSegmentRenderCacheKey`
before implementing) before assuming no `services/` package change is needed.

---

### `backend/internal/repository/release_detail_public_repository_helpers.go` (modify `loadReleaseSegments`)

**Analog:** itself (full file read above, 319 lines — stays well under 450 after the planned
change if additions are kept minimal; if not, split entdoppelung logic into a new sibling file
`release_detail_public_repository_segments.go` following the existing "helpers" split
convention already used for this very file, see its header comment lines 1-13).

**Current query to extend** (`loadReleaseSegments`, lines 84-107, full excerpt above):
```go
func (r *ReleaseDetailPublicRepository) loadReleaseSegments(ctx context.Context, releaseVersionID int64, contributors []PublicReleaseContributor) ([]PublicReleaseSegment, error) {
	rows, err := r.db.Query(ctx, `SELECT ts.id, ... FROM theme_segment_playback_sources src
JOIN release_variants rv ON rv.id=src.release_variant_id
JOIN theme_segments ts ON ts.id=src.theme_segment_id
...
WHERE rv.release_version_id=$1
ORDER BY ts.start_time NULLS LAST,ts.id`, releaseVersionID)
	...
}
```
This is the exact query RESEARCH.md identifies as needing the dedup decision "before step
1/2" — under Option B, once `theme_segment_playback_sources` is no longer 1:1 per segment, this
`JOIN` must instead resolve via the new assignment table
(`theme_segment_assignments WHERE release_version_id = $1`), and the dedup itself needs a
**previous-episode lookup**.

**Adjacency helper to reuse for dedup** (`loadAdjacentReleases`, lines 109-134, full excerpt
above):
```go
func (r *ReleaseDetailPublicRepository) loadAdjacentReleases(ctx context.Context, animeID, groupID, releaseVersionID int64, version string) (*PublicReleaseNavigationTarget, *PublicReleaseNavigationTarget, error) {
	load := func(direction string) (*PublicReleaseNavigationTarget, error) { ... }
	prev, err := load("previous")
	...
	next, err := load("next")
	return prev, next, err
}
```
This already resolves the "previous release version" (`prev.ReleaseVersionID`) with correct
sort/episode-number handling including gaps (`COALESCE(e.sort_index,e.id)` ordering) — **do not
reimplement episode adjacency**; call this from the new dedup path in `loadReleaseSegments` (or a
new sibling function) to fetch the previous release-version's assigned segment IDs and diff
against the current version's assigned segment IDs. A theme_segment_id present in both = suppress
in current view (unless the base `theme_id`/type changed = real switch, per D-02/Question 6 in
RESEARCH.md).

**`errors.Is(err, pgx.ErrNoRows)` nil-adjacent handling** (lines 121-123): already returns
`nil, nil` for "no previous release" (anime start / gap) — matches UI-SPEC Surface 3 edge case
("Fehlt die Vorfolge... gilt die aktuelle Folge automatisch als Span-Start") with zero extra code
needed on the "no previous" branch.

---

### `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx` (add Override block, Surface 1)

**Analog for the *existing* panel structure to extend:** itself
(`SegmentEditPanel.tsx:1-120`, read above) — native `<input>` fields for start/end time already
exist here (pre-existing deviation from the global UI system, explicitly called out as
NOT to imitate in UI-SPEC line 37-39).

**Analog for the *new* primitive-correct sub-block:**
`frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx`
(sibling file in the same directory, imports confirmed via grep):
```tsx
import { FormField } from '@/components/ui/FormField'
import { Textarea } from '@/components/ui/Textarea'
...
<FormField label="Beschreibung" htmlFor={captionFieldId}>
  <Textarea
    id={captionFieldId}
    value={caption}
    onChange={(event) => setCaption(event.target.value)}
    disabled={!canEdit}
  />
</FormField>
```
Use this exact `FormField` wrapping shape for the two new Override time inputs (`Input` instead
of `Textarea`), with `label="Start (Folge {N})"` / `label="Ende (Folge {N})"` and `hint=` set to
the UI-SPEC copy string.

**Switch analog** (`frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.tsx:5,102-108`):
```tsx
import { Switch } from '@/components/ui/Switch'
...
<Switch
  checked={action.granted}
  disabled={!isEditable}
  aria-label={action.label_de}
  onCheckedChange={(next) => {
    if (!isEditable) return
    if (next) { ... }
  }}
/>
```
`Switch` component contract (`frontend/src/components/ui/Switch.tsx:8-13`):
`{ checked: boolean; onCheckedChange: (next: boolean) => void; disabled?: boolean; label?: string }`
— use `label="Zeit nur für diese Folge abweichend setzen"` per UI-SPEC Copywriting Contract, so
the label renders inline via the component's own `label` prop rather than a separate `<label>`.

**FormField component contract** (`frontend/src/components/ui/FormField.tsx:5-13`, full file read
above): `{ label?, htmlFor?, hint?, error?, required?, disabled?, children }` — `error` prop is
how `validateSegmentTimes` messages must surface under the override inputs (UI-SPEC line 175-177).

---

### `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx` (dedup + badges, Surface 2)

**Analog:** itself (`SegmenteTab.tsx:1-230`, read above).

**Table primitives already correctly used** (`SegmenteTab.tsx:30-37`):
```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
```
Continue using these for the table structure; add `Badge`/`DisclosureIndicator` imports from the
same `@/components/ui` barrel for the new "Geteiltes Segment" / "Zeit hier überschrieben" badges
and the assignment-list disclosure toggle.

**Active-episode highlight pattern to extend**
(`isSegmentActiveForEpisode`, `SegmenteTab.helpers.tsx:174-181`, full excerpt above):
```ts
export function isSegmentActiveForEpisode(segment: AdminThemeSegment, episodeNumber: number): boolean {
  const start = segment.start_episode
  const end = segment.end_episode
  if (start == null && end == null) return true
  if (start != null && end == null) return episodeNumber >= start
  if (start == null && end != null) return episodeNumber <= end
  return episodeNumber >= (start ?? 0) && episodeNumber <= (end ?? Infinity)
}
```
Used at `SegmenteTab.tsx:574-578` for `styles.tableRowActive`. This range-check style is the
model for a new `isCurrentEpisodeInAssignmentList(segment, episodeNumber)` helper once assignment
becomes a list of release-version IDs rather than a `start_episode`/`end_episode` range — same
shape, different data source.

**`openAddPanel` default-episode pattern to be aware of** (`SegmenteTab.tsx:194-209`, full excerpt
above) — this is exactly the code RESEARCH.md identifies as causing today's per-episode
duplication (`startEpisode: defaultEpisode, endEpisode: defaultEpisode`, line 201-202). Under
Option B this default-to-single-episode behavior for a *new* segment stays reasonable (a newly
created Kara starts assigned to just the current release-version); the fix is in how "assign to
more episodes" and "adopt suggestion" work, not in this default.

**DisclosureIndicator usage contract**
(`frontend/src/components/ui/DisclosureIndicator.tsx:6-11`, full file read above):
`{ open?: boolean; size?: 'sm'|'md'|'lg'; variant?: 'plain'|'button'; className?: string }` — no
built-in click handler; wrap it in a `<button>` (as UI-SPEC specifies `variant="button" size="sm"`)
and manage `open` state locally per table row.

---

### `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseSegments.ts` (new API calls)

**Analog:** itself (full file read above).

**CRUD hook method pattern to copy** (`create`/`update`/`remove`, lines 164-201):
```ts
async function update(segmentId: number, input: AdminThemeSegmentPatchRequest): Promise<{ data: AdminThemeSegment } | null> {
  if (!animeId || !hasAuthSession) return null
  try {
    const res = await updateAnimeSegment(animeId, segmentId, input, undefined, releaseVariantId)
    await load()
    if (res.data.render_status === 'queued' || res.data.render_status === 'rendering') {
      void pollSegmentRenderStatus(segmentId)
    }
    return res
  } catch (error) {
    setErrorMessage(error instanceof Error ? error.message : 'Segment konnte nicht aktualisiert werden.')
    return null
  }
}
```
New methods `setSegmentOverride(segmentId, episodeNumber, input)` /
`removeSegmentOverride(segmentId, episodeNumber)` / `assignSegmentToReleaseVersion(...)` should
follow this exact guard-clause → try/await-API → reload/poll → catch-and-setErrorMessage shape,
with German error strings matching UI-SPEC's Copywriting Contract ("Zeit-Override konnte nicht
gespeichert werden. Bitte erneut versuchen.").

**API client functions to add** — follow the existing signature convention seen at the top import
block (`updateAnimeSegment`, `deleteAnimeSegment`, etc., all imported from `@/lib/api`, lines
5-14): new functions belong in `frontend/src/lib/api.ts` (not read in this pass, but is the
established single funnel per CLAUDE.md "Shared API calls are funneled through
`frontend/src/lib/api.ts`").

---

### `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx` (Surface 3)

**Analog:** itself (`ThemeTimeline.tsx:1-162`, read above).

**Existing Badge usage to extend** (`SegmentDetails`, lines 142-162):
```tsx
import { Badge, Button, Card, SectionHeader } from '@/components/ui'
...
function SegmentDetails({ segment }: { segment: PublicReleaseSegment }) {
  ...
  return (
    <div className={styles.segmentDetails}>
      <Badge variant="muted" className={styles.typeBadge}>{segmentTypeLabel(segment.type)}</Badge>
      <strong className={styles.segmentName}>{segment.name}</strong>
      <div className={styles.timeRow}>
        <span>{clock(start)}–{clock(end)}</span>
        <span>Dauer {clock(duration)}</span>
      </div>
      {segment.participants.length > 0 ? (
        <span className={styles.participants}>...</span>
      ) : null}
    </div>
  )
}
```
UI-SPEC Surface 3 requires a new line "unterhalb der bestehenden Zeitangabe (`styles.timeRow`)" —
add a `Badge variant="muted"` with the "Gilt auch für Folge {von}–{bis}" text directly after the
existing `.timeRow` div, following the exact same `Badge` import/usage already in this file
(no new import needed beyond what's already there at line 7).

**No client-side dedup logic needed:** per RESEARCH.md and UI-SPEC Surface 3, `ThemeTimeline`
receives an already-deduplicated `PublicReleaseSegment[]` array — all dedup decision-making stays
server-side in `loadReleaseSegments` (see backend section above). This component only needs the
new span-badge rendering, no filtering logic.

---

### `frontend/src/types/releaseDetail.ts` (extend `PublicReleaseSegment`)

**Analog:** itself (full file read above).

**Current shape to extend** (lines 52-62):
```ts
export interface PublicReleaseSegment {
  theme_segment_id: number;
  name: string;
  type: string;
  start_seconds: number | null;
  end_seconds: number | null;
  duration_seconds: number | null;
  readiness: "ready" | "unavailable";
  participants: PublicReleaseContributor[];
  preview_url: string | null;
}
```
Add optional fields mirroring whatever the backend DTO exposes (field names are Planner/Executor's
choice per UI-SPEC line 251-252, e.g. `applies_through_episode: string | null` or
`shared_episode_range: { from: string; to: string } | null`) — keep the existing snake_case
convention (file header comment line 1: "Spiegelt ... DTOs (snake_case JSON tags)").

---

### `shared/contracts/admin-content.yaml` (contract-first, modify)

**Convention:** Contracts under `shared/contracts/` are tracked alongside code per CLAUDE.md
("Contracts are tracked alongside code"). Not read in full this pass (large YAML) — before
implementation, Grep `admin-content.yaml` for the existing `theme_segments`/`AdminThemeSegment`
schema block and extend it additively (new optional fields for assignment/override), matching
whatever schema style (OpenAPI 3) is already used for the sibling `AdminThemeSegment`-shaped
schema in that file. Do not introduce a new contract file for this — segments already live in
`admin-content.yaml`.

---

## Shared Patterns

### Authorization (capability gate)
**Source:** `backend/internal/handlers/admin_content_anime_theme_segments.go:159-186`
(`requireSegmentManage`), backed by capability `release_version.segments.manage`
(`database/migrations/0119_release_version_segments_manage_capability.up.sql`, granted to
`fansub_lead`, `project_lead`, `timer`).
**Apply to:** every new override/assignment write handler (backend) and the corresponding
`hasAuthSession`-style client-side gate already used in `useReleaseSegments.ts` (e.g.
`if (!animeId || !hasAuthSession) return null`, lines 165-166, 177-178, 193-194).

### Error handling — Go
**Source:** `backend/internal/repository/theme_segment_render_cache.go` throughout — every
repository method wraps DB errors with `fmt.Errorf("<action> <key>=%v: %w", id, err)` and
translates `pgx.ErrNoRows` to the shared `ErrNotFound` sentinel (`repository` package).
**Apply to:** `theme_segment_overrides.go` (new) and all modified repository functions.

### Error handling — TypeScript hooks
**Source:** `useReleaseSegments.ts` `create`/`update`/`remove` — `try { await api(...) } catch
(error) { setErrorMessage(error instanceof Error ? error.message : '<German fallback>'); return
null/false }`.
**Apply to:** all new hook methods for override/assignment writes.

### Render-cache invalidation (do-not-reimplement)
**Source:** `backend/internal/handlers/segment_render_refresh.go`
(`resetAndQueueSegmentRenderAfterChange`) + `segment_render_worker.go` (single-worker
`ClaimNextQueuedThemeSegmentRender` with `FOR UPDATE SKIP LOCKED`).
**Apply to:** every new write path that changes an effective per-episode segment time
(override create/update/delete) must call this exact invalidation chain — do not build a parallel
cache-busting mechanism. Extend `segmentRenderInputsChanged`'s comparison surface (see above)
rather than adding a second comparison function.

### Episode adjacency (do-not-reimplement)
**Source:** `backend/internal/repository/release_detail_public_repository_helpers.go:109-134`
(`loadAdjacentReleases`).
**Apply to:** the new dedup logic in `loadReleaseSegments` — reuse this function (or its query
shape) rather than writing a new "previous episode" query. Already handles episode-number gaps
correctly via `COALESCE(e.sort_index, e.id)` ordering.

### UI primitives (mandatory, CLAUDE.md)
**Source:** `frontend/src/components/ui/` barrel (`Switch.tsx`, `FormField.tsx`,
`DisclosureIndicator.tsx`, `Badge` via `@/components/ui`), confirmed real usages at
`RoleCapabilityDetail.tsx:5,102-108` (Switch) and
`ReleaseVersionMediaDetailPanel.tsx:11-12,118-125` (FormField).
**Apply to:** every net-new UI element in this phase (Override toggle/inputs, badges, disclosure
list) — regardless of the fact that `SegmenteTab.tsx`/`SegmentEditPanel.tsx` currently contain
pre-existing native `<input>`/`<select>` (those are NOT to be imitated for new elements per
CLAUDE.md "closest-analog-Regel darf das globale UI nie überstimmen" and UI-SPEC line 37-39).

---

## No Analog Found

None. All 14 target files/areas have a concrete, directly-read codebase analog (either the file
itself for in-place edits, or a sibling file in the same package/directory for genuinely new
files). `services/segment_render.go` (cache-key builder internals) was not read in this pass —
flagged above as a verification step for the Planner/Executor before assuming no change is needed
there, but it is not a new file requiring its own analog.

## Metadata

**Analog search scope:** `backend/internal/repository/`, `backend/internal/handlers/`,
`backend/internal/models/`, `database/migrations/` (0044-0140 range), `frontend/src/app/admin/
episode-versions/[versionId]/edit/`, `frontend/src/app/anime/[id]/group/[groupId]/releases/
[releaseVersionId]/`, `frontend/src/components/ui/`, `frontend/src/types/`.
**Files scanned (Read in full or targeted range):** `117-CONTEXT.md`, `117-RESEARCH.md`,
`117-UI-SPEC.md`, `0122_theme_segment_render_cache.up.sql`, `0054_theme_segment_playback_sources.up.sql`,
`0119_release_version_segments_manage_capability.up.sql`, `theme_segment_render_cache.go` (repo,
full), `admin_anime_themes.go` (models, full), `theme_segment_render_cache.go` (models, full),
`segment_render_refresh.go` (full), `admin_content_anime_theme_segments.go` (lines 1-200),
`admin_content_anime_themes.go` (lines 1240-1440 and 371-467), `release_detail_public_repository_helpers.go`
(full), `SegmenteTab.tsx` (lines 1-230), `SegmenteTab.helpers.tsx` (full), `SegmentEditPanel.tsx`
(lines 1-120), `useReleaseSegments.ts` (full), `ThemeTimeline.tsx` (lines 1-170),
`releaseDetailPageData.tsx` (full), `types/releaseDetail.ts` (full), `FormField.tsx` (full),
`Switch.tsx` (full), `DisclosureIndicator.tsx` (full), plus targeted Greps for `Switch`,
`DisclosureIndicator`, `FormField` usage across `frontend/src/app/admin/`.
**Pattern extraction date:** 2026-07-29
