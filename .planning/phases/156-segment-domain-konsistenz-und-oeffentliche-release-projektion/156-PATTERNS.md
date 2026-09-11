# Phase 156: Segment-Domain-Konsistenz und oeffentliche Release-Projektion - Pattern Map

**Mapped:** 2026-09-11
**Files analyzed:** 24 (backend repository/handler/model/permissions/migration + frontend/tests/docs)
**Analogs found:** 24 / 24 (every file maps to an in-repo analog; this phase adds no new
technology, per RESEARCH.md)

**Reading note:** 156-RESEARCH.md already performed direct file:line verification for nearly
every pattern in this phase and is HIGH confidence. This document re-verifies the exact current
line ranges by reading the live files myself (2026-09-11) and adds import blocks, DTO/struct
shapes, and concrete excerpts RESEARCH.md summarized but did not always quote verbatim -- use
this file for "what to literally copy", RESEARCH.md for "why this is the right analog".

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/internal/repository/theme_segment_assignments.go` | repository | CRUD (reconciliation) | `syncThemeSegmentPlaybackSourceTx` in `backend/internal/repository/admin_content_anime_themes.go:1279-1339` | exact (same insert-missing/delete-excess shape, same table family) |
| `backend/internal/repository/theme_segment_assignments_reconcile.go` (NEW, only if split needed) | repository | CRUD (reconciliation) | same as above | exact |
| `backend/internal/models/admin_anime_themes.go` | model | struct/DTO | itself (existing `AdminThemeSegment`/`AdminThemeSegmentAssignment` structs) | exact |
| `backend/internal/handlers/admin_content_anime_theme_segments.go` | handler | request-response | itself, lines 300-571 (Create/Update call sites) | exact |
| `backend/internal/repository/theme_segment_assignments_integration_test.go` | test | integration (Postgres) | itself | exact |
| `backend/internal/handlers/admin_content_anime_theme_segment_range_autoassign_test.go` | test | handler fake-repo | itself | exact |
| `backend/internal/repository/episode_import_repository_release_helpers.go` | repository | event-driven (insert-triggered) | `theme_segment_assignments.go`'s `AssignThemeSegmentToEpisodeRange` join pattern (Pattern 5, bundled `INSERT...SELECT`) | role-match (different table, identical join-chain/bundling convention) |
| `backend/internal/repository/episode_import_repository_apply.go` | repository | transactional orchestration | itself (`applyReleaseNative`, unmodified except confirming tx context) | exact, read-only reference |
| NEW test (e.g. `backend/internal/repository/episode_import_repository_autoassign_test.go`) | test | integration (Postgres) | `theme_segment_assignments_integration_test.go` | exact |
| `database/migrations/0161_theme_segments_origin_release_version.up.sql` / `.down.sql` | migration | schema | `database/migrations/0143_theme_segment_render_cache_release_version.up.sql`/`.down.sql` | exact (identical nullable-FK-column-plus-index shape, same table family) |
| `backend/internal/repository/theme_segment_origin.go` (NEW) | repository | CRUD + validation | `backend/internal/repository/theme_segment_overrides.go` (FK-violation -> `ErrConflict` translation pattern) | role-match (same package, same error-translation convention) |
| `backend/internal/permissions/permissions.go` | domain/permissions | constant catalog | itself, `RoleTimer`/`RoleEncoder`/`RoleQualityChecker` const block, lines 68-78 | exact |
| `backend/internal/repository/public_effective_contributors.go` | repository | CRUD (batch read) | itself, `publicContributorAccumulator`/`resolvePublicEffectiveContributors` | exact |
| `backend/internal/repository/release_detail_public_repository.go` | repository | DTO + read | itself, `PublicReleaseContributor`/`PublicReleaseSegment` structs | exact |
| `backend/internal/repository/release_detail_public_repository_helpers.go` | repository | CRUD (batch read) | itself, `loadReleaseSegments`/`suppressSegmentsAlreadyVisibleOnPreviousEpisode` | exact |
| `frontend/src/types/releaseDetail.ts` | type definitions | DTO mirror | itself, `PublicReleaseContributor`/`PublicReleaseSegment` interfaces | exact |
| `backend/internal/repository/group_repository_cursor.go` | repository | CRUD (batch read) | itself, `attachReleaseTimelineSegments`, lines 275-374 | exact |
| `backend/internal/models/group.go` | model | struct/DTO | itself, `ReleaseTimelineSegment` struct | exact |
| NEW test (e.g. `backend/internal/repository/group_repository_cursor_timeline_test.go`) | test | integration (Postgres) | `theme_segment_assignments_integration_test.go` | exact |
| NEW canonical-type helper (e.g. `backend/internal/repository/theme_segment_type.go` or `backend/internal/permissions`-adjacent domain file) | domain/utility | transform | the SQL `CASE ... LIKE` block being replaced, `group_repository_cursor.go:296-302` | role-match (same decision, moved from SQL to Go) |
| `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx` | component | render (props-in) | itself | exact |
| `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimelineSegmentDetails.tsx` (NEW, split target) | component | render (props-in) | `ThemeTimeline.tsx`'s existing internal `SegmentDetails`/`SelectionSurface` functions | exact (already-isolated functions to extract verbatim) |
| Member link inside `ThemeTimelineSegmentDetails.tsx` | component (link-building) | render | `frontend/src/components/fansubs/FansubContributorsSection.tsx:13-19` (`renderContributorName`) + `frontend/src/lib/fansubProjectRoutes.ts:37-43` (`buildPublicFansubProjectMemberPath`) | exact |
| NEW query-budget test (e.g. `backend/internal/repository/segment_origin_query_budget_test.go`) | test | integration (Postgres, perf regression) | `backend/internal/repository/query_counter.go` + `fansub_project_resolver_query_budget_test.go` (Phase 155) | exact |
| NEW unit test (e.g. table-driven test in `backend/internal/permissions/permissions_test.go` or a sibling) | test | unit | existing `permissions_test.go` (table-driven const/catalog assertions) | exact |
| `backend/internal/repository/release_detail_public_segments_integration_test.go` | test | integration (Postgres) | itself (extend, remove suppression-asserting subtest, add range/origin-label assertions) | exact |
| `docs/audits/2026-09-XX-segment-domain-consistency/REPORT.md` (+ `REPRODUCE.md`/`TABLES.md`/`VALIDATION.md`) | documentation | report | `docs/audits/2026-09-11-fansub-project-performance/REPORT.md` (Phase 155 template) | exact |
| `DECISIONS.md` | documentation | append-only log | itself (existing entry format) | exact |

## Pattern Assignments

### `backend/internal/repository/theme_segment_assignments.go` (repository, CRUD/reconciliation) -- Workstream A

**Analog:** `syncThemeSegmentPlaybackSourceTx` (`backend/internal/repository/admin_content_anime_themes.go:1279-1339`) -- the exact insert-missing/delete-excess shape, same table family, already production-proven.

**Current file's imports** (lines 1-13, keep as-is, this is the house style for this package):
```go
package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)
```

**Guard to preserve verbatim** (lines 84-86, this is P156-02/03's anchor -- must run BEFORE any
delete logic, not just before insert logic):
```go
if segmentID <= 0 || animeID <= 0 || fansubGroupID <= 0 || startEpisode <= 0 || endEpisode <= 0 {
	return nil, nil
}
```

**Current transaction/enumeration pattern to extend** (lines 93-133, target-set enumeration via
`release_version_groups`/`release_versions`/`fansub_releases`/`episodes` join -- keep this exact
join, it is also the join Workstream B's bundled auto-assign query must match):
```go
tx, err := r.db.Begin(ctx)
if err != nil {
	return nil, fmt.Errorf("begin assign theme segment to episode range segment=%d: %w", segmentID, err)
}
defer func() { _ = tx.Rollback(ctx) }()

rows, err := tx.Query(ctx, `
	SELECT DISTINCT rev.id
	FROM release_version_groups rvg
	JOIN release_versions rev ON rev.id = rvg.release_version_id
		AND COALESCE(NULLIF(BTRIM(rev.version), ''), 'v1') = $3
	JOIN fansub_releases fr ON fr.id = rev.release_id
	JOIN episodes ep ON ep.id = fr.episode_id AND ep.anime_id = $1
	WHERE rvg.fansub_group_id = $2
	  AND COALESCE(ep.sort_index, CASE WHEN COALESCE(ep.episode_number, '') ~ '^[0-9]+$' THEN ep.episode_number::int ELSE NULL END) BETWEEN $4 AND $5
`, animeID, fansubGroupID, normalizedVersion, startEpisode, endEpisode)
```
(rest of function currently only inserts missing rows -- lines 135-179 -- this is the additive
part the reconciliation must extend with a delete-excess step modeled on the pattern below.)

**Insert-missing/delete-excess pattern to replicate** (source, unmodified,
`admin_content_anime_themes.go:1279-1339`):
```go
func (r *AdminContentRepository) syncThemeSegmentPlaybackSourceTx(ctx context.Context, tx pgx.Tx, segmentID int64) error {
	// ... enumerate releaseVersionIDs currently assigned ...
	keptReleaseVersionIDs := make([]int64, 0, len(releaseVersionIDs))
	for _, releaseVersionID := range releaseVersionIDs {
		kept, err := r.syncThemeSegmentPlaybackSourceForReleaseVersionTx(ctx, tx, segmentID, releaseVersionID)
		if err != nil {
			return err
		}
		if kept {
			keptReleaseVersionIDs = append(keptReleaseVersionIDs, releaseVersionID)
		}
	}

	if _, err := tx.Exec(ctx, `
		DELETE FROM theme_segment_playback_sources
		WHERE theme_segment_id = $1
		  AND NOT (release_version_id = ANY($2))
	`, segmentID, keptReleaseVersionIDs); err != nil {
		return fmt.Errorf("delete stale theme segment playback sources segment=%d: %w", segmentID, err)
	}

	return nil
}
```
Apply the identical `DELETE ... WHERE theme_segment_id = $1 AND NOT (release_version_id = ANY($kept))`
shape to `theme_segment_assignments` itself, where `$kept` = union of (a) the newly enumerated
episode-range target set and (b) override-protected assignment IDs from Pattern 2 below (Workstream
A2 -- protected rows must be excluded from the delete candidate set, not merged into "in-range").

**Error handling convention** (every query in this file uses `fmt.Errorf("... segment=%d: %w", segmentID, err)`
-- keep this exact wrapping style; scan errors get their own `scan ...` verb, rows-iteration errors
get their own `rows:`/`iterate` verb, matching lines 111-127, 139-155 of the current file).

---

### `theme_segment_origin.go` (NEW repository file, CRUD + validation) -- Workstream C

**Analog:** `backend/internal/repository/theme_segment_overrides.go` (full file, same package,
same FK-violation-to-`ErrConflict` translation convention).

**Imports** (identical style to `theme_segment_assignments.go`/`theme_segment_overrides.go`):
```go
package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)
```

**FK-violation -> `ErrConflict` translation pattern to copy exactly** (source,
`theme_segment_overrides.go:31-68`):
```go
func (r *AdminContentRepository) UpsertThemeSegmentEpisodeOverride(
	ctx context.Context,
	input models.AdminThemeSegmentEpisodeOverrideUpsertInput,
) (*models.AdminThemeSegmentEpisodeOverride, error) {
	if err := validateThemeSegmentEpisodeOverrideUpsertInput(input); err != nil {
		return nil, err
	}

	row := r.db.QueryRow(ctx, `
		INSERT INTO theme_segment_episode_overrides ( ... )
		VALUES ($1, $2, $3::interval, $4::interval, NOW())
		ON CONFLICT (theme_segment_id, release_version_id) DO UPDATE SET ...
		RETURNING `+themeSegmentEpisodeOverrideColumns,
		input.ThemeSegmentID, input.ReleaseVersionID, ...,
	)
	override, err := scanThemeSegmentEpisodeOverride(row)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			return nil, ErrConflict
		}
		return nil, fmt.Errorf("upsert theme segment episode override segment=%d release_version=%d: %w",
			input.ThemeSegmentID, input.ReleaseVersionID, err)
	}
	return override, nil
}
```
For `SetThemeSegmentOrigin`/similar: the backend validation is "target release version must
already be assigned to this segment" (CONTEXT.md Workstream C, no new DB constraint per Assumption
A2 in RESEARCH.md) -- implement this as an explicit `SELECT EXISTS(... FROM theme_segment_assignments
WHERE theme_segment_id=$1 AND release_version_id=$2)` check inside the function (mirrors the
`ErrConflict`-on-invalid-input convention already used here), not a trigger/CHECK.

**Migration to copy for the column itself** (source, unmodified,
`database/migrations/0143_theme_segment_render_cache_release_version.up.sql`):
```sql
ALTER TABLE theme_segment_render_cache
    ADD COLUMN IF NOT EXISTS release_version_id BIGINT REFERENCES release_versions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_theme_segment_render_cache_segment_version
    ON theme_segment_render_cache (theme_segment_id, release_version_id, status);
```
`.down.sql`:
```sql
ALTER TABLE theme_segment_render_cache
    DROP COLUMN IF EXISTS release_version_id;
```
For `0161_theme_segments_origin_release_version.up.sql`, use `ON DELETE SET NULL` (not `CASCADE`,
per CONTEXT.md "nullable und korrigierbar"):
```sql
ALTER TABLE theme_segments
    ADD COLUMN IF NOT EXISTS origin_release_version_id BIGINT REFERENCES release_versions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_theme_segments_origin_release_version
    ON theme_segments (origin_release_version_id);
```
`.down.sql` mirrors 0143's: `ALTER TABLE theme_segments DROP COLUMN IF EXISTS origin_release_version_id;`

**Backfill migration shape to copy** (source pattern, `database/migrations/0141_theme_segment_assignments.up.sql:42-51`
uses a `DO $$ ... RAISE NOTICE ... END $$;` stats block before the real `INSERT/UPDATE ... SELECT`):
```sql
DO $$
DECLARE
    multi_episode_segment_count integer;
BEGIN
    SELECT COUNT(*) INTO multi_episode_segment_count
    FROM theme_segments
    WHERE end_episode > start_episode;

    RAISE NOTICE 'Migration 0141: % theme_segments Zeilen mit echtem Mehrfolgen-Bereich ... gefunden.', multi_episode_segment_count;
END $$;
```
0161's backfill (lowest-episode-among-assignments, per CONTEXT.md's "konservativer Fallback") is
already fully drafted in 156-RESEARCH.md Pattern 4 -- copy that `WITH origin_candidate AS (SELECT
DISTINCT ON (tsa.theme_segment_id) ... ORDER BY tsa.theme_segment_id, COALESCE(ep.sort_index, ...)
ASC NULLS LAST, tsa.release_version_id ASC) UPDATE theme_segments SET origin_release_version_id =
... WHERE ts.origin_release_version_id IS NULL` block verbatim; segments with zero assignments stay
NULL by construction (no `WHERE` clause forces a value).

---

### `backend/internal/permissions/permissions.go` (domain/permissions, constant catalog) -- Workstream D

**Verified current state (important discrepancy vs. RESEARCH.md's summary):** only `RoleTimer`,
`RoleEncoder`, `RoleQualityChecker` (plus `RolePlatformAdmin`/`RoleFansubLead`/`RoleProjectLead`/
`RoleEditor`/`RoleRawProvider`/`RoleDesigner`) exist as **live Go constants** today (lines 68-78).
`RoleTranslator`/`RoleTypesetter` appear ONLY inside the commented-out, non-compiled historical
`roleMatrix` block (lines 98-200) and `RoleKaraokeFX` does not exist anywhere in this file yet. All
three must be added as real constants, not assumed pre-existing.

**Exact block to extend** (lines 65-78, comment above is load-bearing -- keep it, it documents
this is NOT the full role catalog, `role_definitions` is):
```go
// Dieser Block ist KEINE autoritative Rollenliste. Der Katalog aller gültigen Rollen ist
// die Tabelle role_definitions. Hier stehen ausschließlich Codes, die direkt im Go-Code für
// Vergleiche referenziert werden (z. B. result.MatchedRole == permissions.RoleFansubLead).
const (
	RolePlatformAdmin  = "platform_admin"
	RoleFansubLead     = "fansub_lead"
	RoleProjectLead    = "project_lead"
	RoleTimer          = "timer"
	RoleEditor         = "editor"
	RoleEncoder        = "encoder"
	RoleRawProvider    = "raw_provider"
	RoleQualityChecker = "quality_checker"
	RoleDesigner       = "designer"
)
```
Add `RoleTranslator = "translator"`, `RoleTypesetter = "typesetter"`, `RoleKaraokeFX = "karaoke_fx"`
to this const block (verified against `role_definitions` catalog per RESEARCH.md Sources:
`0065_seed_contributor_roles_kernrollen.up.sql`/`0085_role_definitions_seed.up.sql` -- codes exist
verbatim in the DB catalog already, only the Go constant is missing). Then add a new exported
`var SegmentCreditRoleCodes = []string{RoleTranslator, RoleTimer, RoleKaraokeFX, RoleTypesetter}`
immediately below, in the same "domain-/permissions-Nachbarschaft, nicht im Repository, nicht im
Handler, nicht im Frontend" location CONTEXT.md requires. `RoleEncoder`/`RoleQualityChecker` are
deliberately excluded (CONTEXT.md is explicit).

---

### `backend/internal/repository/public_effective_contributors.go` (repository, CRUD batch read) -- Workstream D

**Analog:** itself -- the function is already batch-capable and already has the right shape; this
is an in-place extension, not a rewrite.

**Imports** (lines 1-10, unchanged):
```go
package repository

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)
```

**Accumulator struct to extend** (lines 34-37 -- add a second map alongside `roleLabels`, per
Pitfall D-1 in RESEARCH.md):
```go
type publicContributorAccumulator struct {
	contributor PublicReleaseContributor
	roleLabels  map[string]struct{}
	// NEW: roleCodes map[string]struct{} -- accumulate acr.role_code (not the joined label) so
	// segment-relevance can be filtered by stable code, not German-label substring.
}
```

**SQL to extend** (lines 52-95 -- the existing `ARRAY_AGG(DISTINCT COALESCE(rd.label_de,
acr.role_code) ...)` at line 68 needs a sibling aggregate for raw codes, and the `SELECT` needs
`members.public_slug` gated exactly like the established pattern below):
```sql
COALESCE(
	ARRAY_AGG(DISTINCT COALESCE(rd.label_de, acr.role_code) ORDER BY COALESCE(rd.label_de, acr.role_code))
		FILTER (WHERE acr.role_code IS NOT NULL),
	ARRAY[]::text[]
) AS role_labels,
-- NEW sibling aggregate:
-- COALESCE(ARRAY_AGG(DISTINCT acr.role_code) FILTER (WHERE acr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_codes,
```

**Established `member_slug` visibility-gated CASE to copy verbatim** (confirmed identical in
`group_contributors_repository.go:67/120`, `anime_contributions_public_repository.go:77/201`,
`domain_projection_repository.go:103/195` per RESEARCH.md Pitfall F-2 -- this exact shape, not a
new one):
```sql
CASE WHEN m.profile_visibility = 'public' THEN m.public_slug ELSE NULL END AS member_slug
```

**Aggregation loop to extend** (lines 178-183, sibling loop next to the existing `roleLabels`
population):
```go
for _, roleLabel := range candidate.RoleLabels {
	roleLabel = strings.TrimSpace(roleLabel)
	if roleLabel != "" {
		accumulator.roleLabels[roleLabel] = struct{}{}
	}
}
// NEW: identical sibling loop over candidate.RoleCodes -> accumulator.roleCodes
```

---

### `backend/internal/repository/release_detail_public_repository.go` (repository, DTO) -- Workstream D/F

**Current DTO to extend** (lines 34-40):
```go
type PublicReleaseContributor struct {
	FansubGroupID int64   `json:"fansub_group_id"`
	MemberID      int64   `json:"member_id"`
	Name          string  `json:"name"`
	RoleLabel     string  `json:"role_label"`
	AvatarURL     *string `json:"avatar_url"`
}
```
Add `RoleCodes []string \`json:"role_codes"\`` and `MemberSlug *string \`json:"member_slug"\``
following the exact `json` tag naming convention already used throughout this struct family.

**Current segment DTO** (lines 90-105) already carries `AppliesThroughEpisode *string` for range
display (P156-13's "gilt bis Folge N" requirement is already wired through this exact field, no
new field needed there) -- only `Participants []PublicReleaseContributor` needs to start being
populated from origin-release credits instead of the current release's own (see helpers file
below), and `Type` needs to carry the canonical value once the shared type-derivation helper
exists.

---

### `backend/internal/repository/release_detail_public_repository_helpers.go` (repository, batch read) -- Workstream D/F

**Analog:** itself -- `loadReleaseSegments` (lines 95-131) is simultaneously the function to fix
(P156-13, remove suppression) and extend (P156-07/08/09, origin-based credits instead of current
release's own).

**Imports** (lines 15-22, unchanged):
```go
package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)
```

**Exact heuristic to delete** (lines 102-108 -- THIS is the label-substring heuristic P156-08
replaces):
```go
karaParticipants := make([]PublicReleaseContributor, 0)
for _, c := range contributors {
	label := strings.ToLower(c.RoleLabel)
	if strings.Contains(label, "kara") || strings.Contains(label, "typeset") {
		karaParticipants = append(karaParticipants, c)
	}
}
for rows.Next() {
	// ...
	item.Participants = karaParticipants
	// ...
}
```
Replace with: (1) load `origin_release_version_id` per segment in the same `rows.Next()` scan
loop, (2) collect the DISTINCT set of non-nil origin release version IDs across all segments on
this release, (3) call `loadPublicEffectiveContributors(ctx, r.db, originReleaseVersionIDs)` ONCE
(bundled, not per-segment -- this is the batch-capable function from the Workstream D section
above), (4) filter each origin's contributor list by `permissions.SegmentCreditRoleCodes` against
the new `RoleCodes` field, (5) assign the filtered, origin-specific list to `item.Participants` per
segment. Segments with `origin_release_version_id == nil` get `Participants = []PublicReleaseContributor{}`
and the UI's existing "Credits noch nicht erfasst" empty state (CONTEXT.md Workstream C).

**Suppression function to remove entirely** (lines 133-177,
`suppressSegmentsAlreadyVisibleOnPreviousEpisode`) and its single call site (line 121,
`items, err = r.suppressSegmentsAlreadyVisibleOnPreviousEpisode(ctx, items, animeID, groupID, releaseVersionID, version)`)
-- delete the call, delete the function. **Do NOT delete `loadAdjacentReleases`** (lines 238-263)
-- it is also used for `Previous`/`Next` navigation in `GetPublicReleaseDetail`
(`release_detail_public_repository.go:211`); confirm via
`grep -n "loadAdjacentReleases(" backend/internal/repository/*.go` before touching it (RESEARCH.md
Pitfall F-1).

**Keep unchanged:** `applyAppliesThroughEpisode` (lines 179-236) -- this is the range-display
logic P156-13 explicitly wants to KEEP ("Range bleibt als fachliche Gueltigkeitsangabe erhalten").

---

### `backend/internal/repository/episode_import_repository_release_helpers.go` (repository, event-driven insert) -- Workstream B

**Analog:** the exact bundled `INSERT...SELECT` shape from `theme_segment_assignments.go`'s
enumeration query (Pattern 5 in RESEARCH.md), applied as a NEW query hooked into this file's
existing `upsertImportReleaseGraph` (lines 23-106, full function already read -- it has `tx`,
`releaseVersionID`, and (via `upsertReleaseVersionGroup` at line 86) the resolved
`memberGroups []resolvedImportFansubGroup` all locally available, confirming RESEARCH.md's
Pitfall B-1 recommendation: hook the auto-assign call inside `upsertReleaseVersionGroup`
(lines 218-256) right after the `INSERT INTO release_version_groups` loop, NOT by threading new
return values up through `applyReleaseNative`).

**Imports** (lines 1-17, unchanged):
```go
package repository

import (
	"context"
	"errors"
	"fmt"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"team4s.v3/backend/internal/importutil"
	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)
```

**Hook point** (lines 218-256, `upsertReleaseVersionGroup` -- the per-group loop at lines 241-249
already exists; the new auto-assign query runs once per `group.ID` inside this SAME loop, matching
Pitfall B-2's "must run once per group actually attached, still bundled per group, not per
segment"):
```go
for _, group := range memberGroups {
	if _, err := tx.Exec(ctx, `
		INSERT INTO release_version_groups (release_version_id, fansub_group_id)
		VALUES ($1, $2)
		ON CONFLICT (release_version_id, fansub_group_id) DO NOTHING
	`, releaseVersionID, group.ID); err != nil {
		return fmt.Errorf("upsert release version group version=%d group=%d: %w", releaseVersionID, group.ID, err)
	}
	// NEW: bundled auto-assign query here, once per group.ID (Pattern 5):
	// INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id)
	// SELECT ts.id, $releaseVersionID FROM theme_segments ts WHERE ts.fansub_group_id = $group.ID
	//   AND COALESCE(NULLIF(BTRIM(ts.version), ''), 'v1') = $normalizedVersion
	//   AND ts.start_episode IS NOT NULL AND ts.end_episode IS NOT NULL
	//   AND ts.start_episode <= $episodeSortIndex AND ts.end_episode >= $episodeSortIndex
	// ON CONFLICT (theme_segment_id, release_version_id) DO NOTHING;
}
```
The episode sort-index resolution must reuse **exactly** the join/COALESCE pattern already used at
`theme_segment_assignments.go:107-109` (`COALESCE(ep.sort_index, CASE WHEN ep.episode_number ~
'^[0-9]+$' THEN ep.episode_number::int END)`) and version normalization (`COALESCE(NULLIF(BTRIM(version),
''),'v1')`) -- CONTEXT.md is explicit that both directions (segment-first, release-first) must see
the same target set, which requires byte-identical SQL fragments, not a re-derived equivalent.

---

### `backend/internal/repository/group_repository_cursor.go` (repository, CRUD batch read) -- Workstream E

**Analog:** itself, `attachReleaseTimelineSegments` (lines 275-374, full function already read).

**Imports** (top of file, not shown above but confirmed via existing calls to `fmt`/`strings` in
the read range -- follow the same package-level import block already present).

**Current SQL `CASE ... LIKE` type classification to remove** (lines 296-302 -- THIS is the SQL
half of the duplicated-type-decision anti-pattern RESEARCH.md flags):
```sql
CASE
	WHEN LOWER(tt.name) LIKE '%op%' OR LOWER(tt.name) LIKE '%opening%' THEN 'OP'
	WHEN LOWER(tt.name) LIKE '%ed%' OR LOWER(tt.name) LIKE '%ending%' OR LOWER(tt.name) LIKE '%outro%' THEN 'ED'
	WHEN LOWER(tt.name) LIKE '%insert%' THEN 'INSERT'
	WHEN LOWER(tt.name) LIKE '%kara%' THEN 'KARA'
	ELSE UPPER(tt.name)
END AS segment_type,
```
Replace with a plain `tt.name` (or `t.title`) passthrough column, and derive the canonical type in
Go via the new shared helper (see below), consumed identically by this file AND
`release_detail_public_repository_helpers.go`'s `loadReleaseSegments`.

**Current range-based JOIN to replace with assignment-based** (lines 308-325 -- the
`ts.start_episode <= e.episode_number::int AND ts.end_episode >= ...` predicate at lines 317-323
is the fachliche Ist-Zustand CONTEXT.md requires replaced by joining through
`theme_segment_assignments` instead, same pattern `loadReleaseSegments` already uses at
`release_detail_public_repository_helpers.go:96`: `FROM theme_segment_assignments tsa JOIN
theme_segments ts ON ts.id=tsa.theme_segment_id ... WHERE tsa.release_version_id = ANY($releaseIDs)`).

**Scan/aggregation loop to extend with first-occurrence filtering** (lines 332-368 -- currently
appends every segment to every matching episode unconditionally; Pitfall E-1 confirms this file has
ZERO suppression today, so this is pure addition, not removal). The first-occurrence rule must be
computed over the SAME ordered, already-loaded `episodes`/assignment rows (bundled, per CONTEXT.md
"gebuendelt, nicht per Query je Release") -- track `seenSegmentIDs map[int64]bool` while iterating
episodes in their existing chronological order, and only append+flag `IsFirstOccurrence` (or
filter entirely, per the plan's exact chosen contract) the first time a `segment.ID` appears.

**DTO to extend:** `backend/internal/models/group.go`'s `ReleaseTimelineSegment` (lines 68-75)
currently has no first-occurrence or range-display field:
```go
type ReleaseTimelineSegment struct {
	ID        int64   `json:"id"`
	Type      string  `json:"type"`
	Title     string  `json:"title"`
	StartTime *string `json:"start_time"`
	EndTime   *string `json:"end_time"`
	Version   *string `json:"version,omitempty"`
}
```
Add whatever field the plan's chosen "gilt Folge X-Y" display needs, following the same
`json:"snake_case,omitempty"` convention already used here and in `PublicReleaseSegment`.

---

### Canonical segment-type helper (NEW, shared by Workstream E + F2)

**Analog:** the SQL `CASE` block above (`group_repository_cursor.go:296-302`) is the fachliche
decision being moved; `ThemeTimeline.tsx`'s `TYPE_LABELS`/`TYPE_STYLE_KEYS` (frontend, see below)
is the same decision made a second time and must collapse into this one source. Place the new
function in the backend (a small pure `func CanonicalSegmentType(themeTypeName string) string` is
sufficient -- CONTEXT.md says "Backend/Domäne", RESEARCH.md's architecture map does not mandate a
specific package; `backend/internal/repository` next to its two consumers, or a tiny new file, are
both reasonable -- keep it small and exported so both `group_repository_cursor.go` and
`release_detail_public_repository_helpers.go` call the identical function).

---

### `frontend/.../ThemeTimeline.tsx` + NEW `ThemeTimelineSegmentDetails.tsx` (component) -- Workstream F2

**Current file is 396/450 lines** -- confirmed via direct read (396 lines total, matches
RESEARCH.md).

**Type maps to delete** (lines 31-59):
```ts
const TYPE_LABELS: Record<string, string> = {
  OP: 'Opening', ED: 'Ending', IN: 'Insert', MIDDLE: 'Middle', KARA: 'Karaoke', OTHER: 'Other',
}
const TYPE_STYLE_KEYS: Record<string, keyof typeof styles> = {
  OP: 'typeOp', 'OP KARA': 'typeOp', OPENING: 'typeOp', 'OPENING KARA': 'typeOp',
  ED: 'typeEd', 'ED KARA': 'typeEd', ENDING: 'typeEd', 'ENDING KARA': 'typeEd',
  IN: 'typeIn', 'IN KARA': 'typeIn', INSERT: 'typeIn', 'INSERT KARA': 'typeIn',
  MIDDLE: 'typeMiddle', 'MIDDLE KARA': 'typeMiddle',
  KARA: 'typeKara', KARAOKE: 'typeKara', OTHER: 'typeOther', 'OTHER KARA': 'typeOther',
}
```
and their consumers `typeKey()` (lines 75-78) / `segmentTypeLabel()` (lines 80-82) -- once the
backend sends a canonical `segment.type`, these collapse to a much smaller **purely presentational**
lookup (CSS class / icon only, per CONTEXT.md: "Rein darstellerische Zuordnungen ... duerfen im
Frontend bleiben; fachliche Klassifikation nicht").

**Split target -- extract verbatim, these are already standalone functions** (lines 143-195,
`SegmentDetails` and `SelectionSurface`) into the new sibling file
`ThemeTimelineSegmentDetails.tsx`:
```tsx
function SegmentDetails({ segment, episodeNumber }: { segment: PublicReleaseSegment; episodeNumber?: string }) {
  const start = segment.start_seconds ?? 0
  const end = segment.end_seconds ?? start
  const duration = segment.duration_seconds ?? Math.max(0, end - start)
  return (
    <div className={styles.segmentDetails}>
      <Badge variant="muted" className={styles.typeBadge}>{segmentTypeLabel(segment.type)}</Badge>
      <strong className={styles.segmentName}>{segment.name}</strong>
      <div className={styles.timeRow}>
        <span>{clock(start)}–{clock(end)}</span>
        <span>Dauer {clock(duration)}</span>
      </div>
      {segment.applies_through_episode ? (
        <Badge variant="muted">Gilt auch für Folge {episodeNumber}–{segment.applies_through_episode}</Badge>
      ) : null}
      {segment.participants.length > 0 ? (
        <span className={styles.participants}>
          {segment.participants.map((participant) => `${participant.name} · ${participant.role_label}`).join(', ')}
        </span>
      ) : null}
    </div>
  )
}
```
The plain-text participant line (`${participant.name} · ${participant.role_label}`, current line
161) is exactly what P156-14 replaces with a link -- see the member-link pattern below. Move this
function (plus `SelectionSurface`) into the new file, import `styles` from
`./ThemeTimeline.module.css` (CSS module stays shared, do not duplicate it), and import the moved
functions back into `ThemeTimeline.tsx`. Both already use only `@/components/ui` primitives
(`Badge`) -- preserve that, add no hand-built elements (CLAUDE.md global UI rule; this phase is
`--skip-ui` for redesign but must not regress existing primitive usage).

**Imports currently in `ThemeTimeline.tsx`** (lines 1-11, keep at the top of the file, adjust only
to add the new sibling import):
```tsx
'use client'

import { Lock, Play } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Badge, Button, Card, SectionHeader } from '@/components/ui'
import { useAuthSession } from '@/lib/useAuthSession'
import type { PublicReleaseSegment } from '@/types/releaseDetail'

import styles from './ThemeTimeline.module.css'
```

---

### Member link inside segment participants (P156-14)

**Analog 1 -- existing link-building helper, already exported, currently unconsumed anywhere**
(`frontend/src/lib/fansubProjectRoutes.ts:37-43`):
```ts
export function buildPublicFansubProjectMemberPath(
  fansubSlug: string,
  animeSlug: string,
  memberSlug: string,
): string {
  return `${buildPublicFansubProjectPath(fansubSlug, animeSlug)}/mitwirkende/${encodeURIComponent(memberSlug.trim())}`
}
```

**Analog 2 -- the exact "slug present -> Link, else plain text" pattern already used on a sibling
surface** (`frontend/src/components/fansubs/FansubContributorsSection.tsx:13-19`, NOTE: this
surface links to `/members/[slug]` which is a DIFFERENT, out-of-scope route -- copy the
conditional-Link STRUCTURE only, not the target path):
```tsx
function renderContributorName(contributor: DomainProjectionContributorRow) {
  if (contributor.member_slug !== null) {
    return <Link href={'/members/' + contributor.member_slug}>{contributor.member_display_name}</Link>
  }
  return <span>{contributor.member_display_name}</span>
}
```
For Workstream F's segment participants, combine both: `contributor.member_slug ? <Link
href={buildPublicFansubProjectMemberPath(fansubSlug, animeSlug, contributor.member_slug)}>{name}</Link>
: <span>{name}</span>`. `PublicReleaseContributor` needs the new `member_slug` field threaded
through from the backend DTO change above before this is possible -- confirm `fansubSlug`/`animeSlug`
are available in `ThemeTimeline`'s prop chain (likely need to add these two string props if not
already passed down from the release page's server component).

---

### Query-budget regression test (NEW) -- Workstream G

**Analog:** `backend/internal/repository/query_counter.go` (full file, read verbatim below) +
`fansub_project_resolver_query_budget_test.go` (Phase 155 pattern, cited via RESEARCH.md
lines 572-577).

**`queryCounter` (reusable, no new tracer needed):**
```go
type queryCounter struct {
	queries atomic.Int64
}

func (c *queryCounter) TraceQueryStart(ctx context.Context, _ *pgx.Conn, _ pgx.TraceQueryStartData) context.Context {
	c.queries.Add(1)
	return ctx
}
func (c *queryCounter) TraceQueryEnd(_ context.Context, _ *pgx.Conn, _ pgx.TraceQueryEndData) {}
func (c *queryCounter) reset() { c.queries.Store(0) }
func (c *queryCounter) count() int { return int(c.queries.Load()) }

var _ pgx.QueryTracer = (*queryCounter)(nil)
```
**Usage pattern** (from the doc comment at the top of `query_counter.go`, lines 17-30):
```go
counter := &queryCounter{}
config, _ := pgxpool.ParseConfig(dsn)
config.ConnConfig.Tracer = counter
pool, _ := pgxpool.NewWithConfig(ctx, config)
counter.reset()
_, _ = repo.SomeCall(ctx, ...)
got := counter.count()
```
Write a new sibling test asserting a CONSTANT query count for the new bundled
segment+origin+credit load path (Workstream D's extended `loadReleaseSegments`), matching the
`require.Equalf(t, smallCount, largeCount, "constant query budget violated: ...")` /
`require.Equalf(t, <namedConstant>, largeCount, "... update only with an intentional, documented
loader change")` two-assertion shape RESEARCH.md quotes from the Phase-155 test (lines 572-577).

---

### `backend/internal/repository/theme_segment_assignments_integration_test.go` (test) -- extend

**Analog:** itself. **Imports** (lines 1-13):
```go
package repository

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)
```
**Existing guard-proving test to keep as a template for the new "unvollstaendiger Bereich loescht
nichts" regression case** (lines 20-44, `TestAssignThemeSegmentToEpisodeRangeGuardsInvalidRangeWithoutDBAccess`):
```go
func TestAssignThemeSegmentToEpisodeRangeGuardsInvalidRangeWithoutDBAccess(t *testing.T) {
	repo := &AdminContentRepository{}
	cases := []struct {
		name          string
		segmentID     int64
		animeID       int64
		fansubGroupID int64
		startEpisode  int
		endEpisode    int
	}{
		{"segmentID<=0", 0, 1, 1, 1, 3},
		{"animeID<=0", 1, 0, 1, 1, 3},
		{"fansubGroupID<=0", 1, 1, 0, 1, 3},
		{"startEpisode<=0", 1, 1, 1, 0, 3},
		{"endEpisode<=0", 1, 1, 1, 1, 0},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := repo.AssignThemeSegmentToEpisodeRange(context.Background(), tc.segmentID, tc.animeID, tc.fansubGroupID, "v1", tc.startEpisode, tc.endEpisode)
			require.NoError(t, err)
			require.Nil(t, got)
		})
	}
}
```
This proves the guard fires WITHOUT DB access (nil `db` field would panic on `r.db.Begin(ctx)` if
reached) -- extend this exact style for the reconciled signature (now returning removed/protected
IDs too, all must stay `nil`/empty on the guard path). The DB-backed test below it
(`TestAssignThemeSegmentToEpisodeRange`, starts line 50) uses
`testsupport.OpenPhase117Postgres(t)` + raw seed `INSERT`s -- follow this exact seeding style
(explicit IDs, `anime`/`fansub_groups`/`theme_types`/`themes`/`episodes`/`fansub_releases`/
`release_versions`/`release_version_groups`) for new range-shrink and override-protection test
cases in the same file.

---

### `backend/internal/handlers/admin_content_anime_theme_segment_range_autoassign_test.go` (test) -- extend/compile-fix

**Analog:** itself, fake-repo pattern (lines 1-98 read in full).

**Imports** (lines 1-16):
```go
package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)
```
**Fake repo method to update once the interface signature grows** (lines 95-98):
```go
func (f *rangeAutoAssignThemeRepo) AssignThemeSegmentToEpisodeRange(ctx context.Context, segmentID int64, animeID int64, fansubGroupID int64, version string, startEpisode int, endEpisode int) ([]int64, error) {
	f.rangeCall = &rangeAutoAssignCall{segmentID, animeID, fansubGroupID, version, startEpisode, endEpisode}
	return f.rangeResult, f.rangeErr
}
```
This single method, plus the four existing tests referencing it
(`TestCreateAnimeSegment_RangeAutoAssignsAllEpisodesInRange`,
`..._RangeAutoAssignIdempotentSkipsReload`, `..._RangeAutoAssignFailureIsNonFatal`,
`TestUpdateAnimeSegment_RangeAutoAssignUsesEffectivePatchedValues`), need a compile-fix pass the
moment `AssignThemeSegmentToEpisodeRange` grows a second return value -- plan this as its own task,
not a side effect discovered mid-implementation.

**Handler reload-condition bug to fix** (`admin_content_anime_theme_segments.go:343` and `:557`,
both currently `else if len(newlyAssigned) > 0` -- verified in the handler read above): change to
`len(newlyAssigned) > 0 || len(removed) > 0` at both call sites once the removed-IDs return value
exists (Pitfall A-1).

## Shared Patterns

### Insert-missing/delete-excess reconciliation
**Source:** `backend/internal/repository/admin_content_anime_themes.go:1279-1339` (`syncThemeSegmentPlaybackSourceTx`)
**Apply to:** `theme_segment_assignments.go`'s reconciled `AssignThemeSegmentToEpisodeRange`
```go
DELETE FROM <table>
WHERE <scope_column> = $1
  AND NOT (<key_column> = ANY($2))
```

### FK-violation -> `ErrConflict` translation
**Source:** `backend/internal/repository/theme_segment_overrides.go:58-66`,
`theme_segment_assignments.go:44-53`
**Apply to:** all new write paths in `theme_segment_origin.go`
```go
var pgErr *pgconn.PgError
if errors.As(err, &pgErr) && pgErr.Code == "23503" {
	return nil, ErrConflict
}
```

### `member_slug` visibility-gated exposure
**Source:** `group_contributors_repository.go:67,120`, `anime_contributions_public_repository.go:77,201`,
`domain_projection_repository.go:103,195`
**Apply to:** `public_effective_contributors.go`'s new `member_slug` column
```sql
CASE WHEN m.profile_visibility = 'public' THEN m.public_slug ELSE NULL END AS member_slug
```

### Batch-load-by-ID-slice, never per-row
**Source:** `loadPublicEffectiveContributors(ctx, db, releaseVersionIDs []int64)` in
`public_effective_contributors.go:43-47` (already accepts a slice and returns
`map[int64][]PublicReleaseContributor]`)
**Apply to:** all Workstream D/E/G bundled loads -- collect the distinct ID set first (segment IDs,
origin release version IDs, or episode/release IDs), call once, index into the returned map. Never
call inside a per-segment/per-episode loop (this is the exact anti-pattern `nonOverriddenSegmentAssignments`,
`backend/internal/handlers/segment_render_fanout.go:32-48`, already demonstrates and must not be
copied).

### Migration nullable-FK-plus-index shape
**Source:** `database/migrations/0143_theme_segment_render_cache_release_version.up.sql`/`.down.sql`,
confirmed independently in `0131_member_point_foundation.up.sql:27-29`
**Apply to:** `0161_theme_segments_origin_release_version.up.sql`/`.down.sql`
```sql
ALTER TABLE <table> ADD COLUMN IF NOT EXISTS <col> BIGINT REFERENCES <target>(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_<table>_<col> ON <table> (<col>);
```

### Query-budget regression gate
**Source:** `backend/internal/repository/query_counter.go` (full file) +
`fansub_project_resolver_query_budget_test.go` (Phase 155)
**Apply to:** any new Workstream D/E/G test asserting no N+1 on the bundled segment/origin/credit load

### Central role-code allow-list, one location
**Source:** `backend/internal/permissions/permissions.go:65-78` (existing `RoleTimer`/`RoleEncoder`/
`RoleQualityChecker` const block and its "not the authoritative catalog, role_definitions is"
doc-comment convention)
**Apply to:** the new `SegmentCreditRoleCodes` slice, consumed only by
`release_detail_public_repository_helpers.go`'s extended `loadReleaseSegments` -- never
re-implemented in the repository, handler, or frontend layer

## No Analog Found

None. RESEARCH.md and this pattern pass both confirm every file in this phase's scope has a direct
or role-matched in-repository analog -- this phase is explicitly framed as "generalize existing
sibling code", not "design a new subsystem" (156-RESEARCH.md "Key insight").

## Metadata

**Analog search scope:** `backend/internal/repository/`, `backend/internal/handlers/`,
`backend/internal/models/`, `backend/internal/permissions/`, `database/migrations/`,
`frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/`, `frontend/src/lib/`,
`frontend/src/components/fansubs/`, `frontend/src/types/`, `docs/audits/`
**Files scanned (direct Read this session):** `theme_segment_assignments.go`,
`theme_segment_overrides.go`, `permissions/permissions.go`, `public_effective_contributors.go`,
`release_detail_public_repository.go`, `release_detail_public_repository_helpers.go`,
`group_repository_cursor.go` (lines 200-374), `models/group.go`, `models/admin_anime_themes.go`
(lines 1-165), `admin_content_anime_themes.go` (lines 1279-1349, `syncThemeSegmentPlaybackSourceTx`),
`admin_content_anime_theme_segments.go` (lines 300-580), `episode_import_repository_release_helpers.go`
(full), `episode_import_repository_apply.go` (lines 1-92), `query_counter.go` (full),
`segment_render_fanout.go` (lines 1-55), `theme_segment_assignments_integration_test.go` (lines 1-90),
`admin_content_anime_theme_segment_range_autoassign_test.go` (lines 1-110), migrations
`0143_theme_segment_render_cache_release_version.up/.down.sql`, `0141_theme_segment_assignments.up.sql`
(lines 1-60), `ThemeTimeline.tsx` (full, 396 lines), `fansubProjectRoutes.ts` (full),
`FansubContributorsSection.tsx` (lines 1-40), `frontend/src/types/releaseDetail.ts` (grep-verified
field names).
**Pattern extraction date:** 2026-09-11
