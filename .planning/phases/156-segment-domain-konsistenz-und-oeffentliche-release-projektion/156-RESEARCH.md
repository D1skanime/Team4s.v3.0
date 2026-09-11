# Phase 156: Segment-Domain-Konsistenz und oeffentliche Release-Projektion - Research

**Researched:** 2026-09-11
**Domain:** Go/pgx backend repository reconciliation logic, PostgreSQL migrations, public read-model
projection (Next.js consumption only, no UI redesign)
**Confidence:** HIGH

## Summary

Phase 156 does not introduce a new technology or external dependency. Every workstream is an
extension of code that already exists in this exact domain family
(`backend/internal/repository/theme_segment_*.go`, `public_effective_contributors.go`,
`release_detail_public_repository*.go`, `group_repository_cursor.go`,
`frontend/.../ThemeTimeline.tsx`), and — critically — **the codebase already contains a working,
tested analog for the single highest-risk piece of this phase** (Workstream A's insert-missing/
delete-excess reconciliation): `syncThemeSegmentPlaybackSourceTx`
(`backend/internal/repository/admin_content_anime_themes.go:1279-1339`). That function already
does exactly "enumerate current assignments, upsert what should exist, `DELETE ... WHERE NOT
(id = ANY(kept))` for what should not" for `theme_segment_playback_sources`. Workstream A's job is
to apply the identical pattern one table over, to `theme_segment_assignments` itself, inside
`AssignThemeSegmentToEpisodeRange` (`theme_segment_assignments.go:75-180`).

Three other load-bearing discoveries change what the planner should scope:

1. **`loadPublicEffectiveContributors`** (`public_effective_contributors.go:43-124`) already accepts
   a batch of `releaseVersionIDs` and returns a `map[int64][]PublicReleaseContributor` — it is
   already the correct shape for bundled, non-N+1 origin-credit loading across many segments at
   once (Workstream D/G). It currently throws away `acr.role_code` after aggregating it into a
   German label string; that is the one line that needs to stop happening.
2. **`loadReleaseSegments`** (`release_detail_public_repository_helpers.go:95-131`) currently
   attaches the SAME contributor list (the current release version's own contributors, filtered by
   a `strings.Contains(label, "kara")` heuristic) to every segment on the release — it does **not**
   query each segment's origin release version at all today. Workstream C/D is a bigger data-flow
   change than "swap a filter": it requires loading `origin_release_version_id` per segment first,
   then batch-loading `loadPublicEffectiveContributors` for the *distinct set of origin release
   version IDs*, not the current release version.
3. **`buildPublicFansubProjectMemberPath`** (`frontend/src/lib/fansubProjectRoutes.ts:37-43`)
   already exists (built in Phase 155) but is not consumed anywhere in production code yet.
   Segment participants in `ThemeTimeline.tsx`'s `SegmentDetails` are rendered as **plain,
   non-interactive text** today (`${participant.name} · ${participant.role_label}`) — there is no
   existing member link to "fix", Workstream F/P156-14 is adding a link that has never existed on
   this specific surface, and it needs a `member_slug` field that `PublicReleaseContributor` does
   not carry today (the established column is `members.public_slug`, migration 0145).

**Primary recommendation:** Treat Workstream A as "generalize `syncThemeSegmentPlaybackSourceTx`'s
already-proven insert/delete-excess shape into `AssignThemeSegmentToEpisodeRange`", not as new
reconciliation design. Treat Workstreams C/D as "thread `origin_release_version_id` through, then
reuse the existing batch-capable `loadPublicEffectiveContributors` unchanged in its batching
behavior, only extended in its per-row output shape (add `RoleCodes`/`MemberSlug`)".

## Project Constraints (from CLAUDE.md)

- Work happens in `/home/d1sk/team4s` on `team4s-linux`; all edits/tests/builds/migrations run on
  Linux via Docker Compose, never against the Windows checkout.
- Backend: Go 1.25, Gin, `github.com/jackc/pgx/v5`, `github.com/stretchr/testify`. Frontend:
  Next.js 16 App Router, React 18.3.1, TypeScript, Vitest 3.
- Production code files stay at or below **450 lines**; `ThemeTimeline.tsx` is already at 396 lines
  and this phase adds fields/logic to it — splitting is likely required (see Pitfall F2 below).
- German UI text must use real umlauts (ä, ö, ü, Ä, Ö, Ü, ß) — no ASCII substitutes — for all
  JSX text nodes, labels, error messages, placeholders, aria-labels, toasts, and Go response
  strings. Applies to any new "verwendet seit Folge X" / "gültig bis Folge Y" copy this phase adds.
- All user-facing UI must use `@/components/ui` primitives (`Button`, `Badge`, `Card`,
  `SectionHeader`, etc.) — `ThemeTimeline.tsx` already does this (`Badge`, `Button`, `Card`,
  `SectionHeader` from `@/components/ui`); any new UI element this phase adds must follow suit, no
  handbuilt `<select>/<input>/<textarea>/<button>`.
- Test style: behavior assertions must actually execute the code under test (`httptest` + a fake
  repository for handlers, or a real isolated Postgres for repository-layer SQL) — reading a `.go`
  source file with `os.ReadFile` and asserting a substring is forbidden except for genuine
  absence-checks. The existing `theme_segment_assignments_integration_test.go` and
  `admin_content_anime_theme_segment_range_autoassign_test.go` files (see Code Examples) are
  exactly this required style and are the direct analogs for this phase's new tests.
- Backend routes need `docker compose up -d --build team4sv30-backend` to pick up changes. Go tests
  run via:
  ```bash
  docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend \
    golang:1.25-alpine go build ./... && go vet ./... && go test ./internal/repository/... -count=1
  ```
  PostgreSQL-gated integration tests (`TEAM4S_PHASE117_TEST_DSN`) additionally need:
  ```bash
  DSN=$(docker compose exec -T team4sv30-backend printenv DATABASE_URL | sed -E 's#/team4s_v2#/team4s_phase117_test#')
  docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace \
    -e TEAM4S_PHASE117_TEST_DSN="$DSN" -w /workspace/backend golang:1.25-alpine \
    go test ./internal/repository/... -run TestAssignThemeSegmentToEpisodeRange -count=1
  ```
  (exact pattern reused from Phase 154's `154-01-PLAN.md`; team4s_phase117_test must already exist
  as a schema-only clone of `team4s_v2`, created once per environment).
- Migrations need a working `.down.sql`. Next free migration number is **0161** (confirmed: the
  highest existing pair is `0160_membership_baseline_pseudo_role`, no gaps, 160 total `.up.sql`
  files on disk).
- GSD workflow enforcement: file-changing tool use must go through `/gsd:execute-phase` (not
  relevant to this research-only document, noted for the planner's downstream execution phase).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| P156-01 | `theme_segment_assignments` is the canonical release<->segment truth; `start_episode`/`end_episode` becomes range-only | See "Workstream A" below — exact current function and its ADDITIVE doc comment to replace |
| P156-02 | Range change computes a Soll-Menge: shrink removes, grow adds — not additive; unassigned/incomplete range deletes nothing | See "Workstream A" — existing guard clause and existing insert/delete-excess analog pattern |
| P156-03 | Legitimate overrides are not blindly deleted; testable, no needless new complexity | See "Workstream A2" — exact override table/FK and the query shape to exclude overridden rows from deletion |
| P156-04 | A newly created release version inside an existing segment range gets its assignment automatically, both orderings work | See "Workstream B" — exact insert path, exact missing return value gap, exact bundled-query SQL shape |
| P156-05/P156-06 | Stable, correctable `origin_release_version_id` with documented deterministic backfill | See "Workstream C" — exact migration analog (0143) and exact backfill analog (0141) to replicate |
| P156-07/P156-08/P156-09 | Dynamic segment credits from origin release's current credits via stable role codes, no label heuristic, one central definition | See "Workstream D" — exact heuristic to delete, exact function to extend, exact central-location convention |
| P156-10/P156-11/P156-12 | Project page derives from assignments, first-occurrence/segment-change display rule | See "Workstream E" — exact SQL to replace, exact struct fields already carrying HasOP/HasED/KaraokeCount |
| P156-13 | Release page shows all actually assigned segments with range/origin labeling instead of suppressing | See "Workstream F" — exact suppression function to remove, exact D-02/Phase-117 decision being superseded |
| P156-14 | Segment-related member links go to the project-member route | See "Workstream F" member-link gap — exact existing helper, exact missing DTO field, exact column |
| P156-15 | `ThemeTimeline` drops its own type world, renders backend-canonical types | See "Workstream F2" — exact current type maps and why they exist (raw `theme_types.name` passthrough) |
| P156-16/P156-17 | No N+1; existing indexes reviewed, new index only on query-plan evidence | See "Workstream G" — exact existing index inventory (verified against migrations) and existing query-budget test harness |
| P156-18 | Admin segment editor can set origin cleanly; no UI redesign; visibility rules unchanged | See "Workstream C" admin surface note and "Security Domain" section |
| P156-19 | Full test matrix green; migration/backfill checked; Vorher/Nachher report | See "Testing" and "Vorher/Nachher report convention" below — exact template to replicate (Phase 155's `docs/audits/2026-09-11-fansub-project-performance/`) |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Assignment reconciliation (Soll-Ist sync) | API/Backend (repository, transactional) | Database (constraints/FK cascade) | Must be one atomic transaction; DB FK (`ON DELETE CASCADE` on overrides) already enforces override-cascade safety at the constraint level |
| Auto-assignment of new release versions | API/Backend (repository, same transaction as release-version creation) | — | Runs inside the existing import transaction (`applyReleaseNative`, `episode_import_repository_apply.go:24-91`); must not be a separate out-of-band call |
| Segment origin storage/correction | Database (schema) + API/Backend (validation) | — | Nullable FK column is pure schema; validation ("target release must be assigned to this segment") is backend logic, not a DB constraint (no CHECK across tables in Postgres without a trigger, and CONTEXT.md explicitly avoids new complexity) |
| Segment-credit role-code catalog | API/Backend (domain/permissions package) | — | CONTEXT.md is explicit: "Domain-/Permissions-Nachbarschaft, nicht im Repository, nicht im Handler, nicht im Frontend" — `backend/internal/permissions/permissions.go` already holds this exact kind of stable, code-referenced role-code list |
| Dynamic credit projection | API/Backend (repository) | — | Reads current `anime_contributions`/`anime_contribution_roles` live per request; Frontend only renders |
| Project-page first-occurrence derivation | API/Backend (repository, bundled per-project query) | — | CONTEXT.md: "wird ueber die geordnete Assignment-Menge des Projekts bestimmt, gebündelt, nicht per Query je Release" |
| Canonical segment type derivation | API/Backend (domain logic, replacing SQL `LIKE` and frontend maps) | — | Both `group_repository_cursor.go`'s SQL `CASE ... LIKE '%op%'` and `ThemeTimeline.tsx`'s `TYPE_LABELS`/`TYPE_STYLE_KEYS` are the same fachliche decision made twice; must collapse to one backend source |
| Release/project page rendering | Browser/Frontend (Next.js client components) | Frontend Server (SSR data fetch via `lib/api.ts`) | No UI redesign; only new fields flow through existing components |
| Project-member link routing | Frontend (pure link-building via `fansubProjectRoutes.ts`) | — | Helper already exists; this phase is wiring it to a previously-unlinked surface, not building new routing logic |

## Standard Stack

No new external dependencies. This phase is 100% internal Go/pgx/SQL and existing-React-component
work. All "Don't Hand-Roll" items below point at code *already in this repository*, not at external
packages.

## Package Legitimacy Audit

**Not applicable.** This phase installs no new external packages (Go modules, npm packages, or
otherwise). Every capability is implemented against the existing `github.com/jackc/pgx/v5`,
`github.com/gin-gonic/gin`, `github.com/stretchr/testify`, Next.js/React stack already declared in
`backend/go.mod` / `frontend/package.json`. The Package Legitimacy Gate protocol is skipped for this
reason (no `slopcheck`/registry verification needed).

## Architecture Patterns

### System Architecture Diagram

```
Admin Segment Editor (Create/Update)                 Episode Import (Jellyfin apply)
  admin_content_anime_theme_segments.go:246-359/363+   episode_import_repository_apply.go:15-92
        |                                                       |
        v                                                       v
  AssignThemeSegmentToEpisodeRange (RECONCILING, Workstream A)  upsertImportReleaseGraph (Workstream B: NEW
  theme_segment_assignments.go:75-180                           reverse-direction auto-assign hook)
        |  insert missing + delete excess (guard: no full range -> no-op)     |
        v                                                                    v
  theme_segment_assignments  <---------------- canonical truth -----------> (same table)
        |                                                    ^
        | excludes rows with theme_segment_episode_overrides |
        v (Workstream A2)                                    |
  syncThemeSegmentPlaybackSourceTx (existing analog pattern, admin_content_anime_themes.go:1279)
        |
        v
  theme_segment_playback_sources / render cache fan-out (existing, unchanged shape)

Public read side:
  theme_segments.origin_release_version_id (NEW, migration 0161, nullable, admin-correctable)
        |
        v
  loadPublicEffectiveContributors(db, []releaseVersionIDs)  <-- ALREADY batch-capable
  public_effective_contributors.go:43-124
        |  extended: also aggregate DISTINCT acr.role_code (not just label) + members.public_slug
        v
  Segment-credit role filter (NEW, centralized in backend/internal/permissions,
  Workstream D) -> translator/timer/karaoke_fx/typesetter allow-list

Release page (loadReleaseSegments, release_detail_public_repository_helpers.go:95)
  theme_segment_assignments -> segments of THIS release version
  origin_release_version_id -> batch-load origin credits (NOT current release's own contributors)
  suppressSegmentsAlreadyVisibleOnPreviousEpisode REMOVED (Workstream F)
  applyAppliesThroughEpisode KEPT (range display: "gilt bis Folge N")

Project page (attachReleaseTimelineSegments, group_repository_cursor.go:275-374)
  theme_segment_assignments -> segments per release version (replaces range-based JOIN)
  first-occurrence filter NEW (Workstream E, bundled over project's ordered assignment set)
  canonical type NEW (replaces SQL CASE ... LIKE, Workstream E/F2)
```

### Recommended Project Structure

No new directories. New/changed files, following the repo's existing narrow-file convention:

```
backend/internal/repository/
├── theme_segment_assignments.go              # AssignThemeSegmentToEpisodeRange -> reconciling (A)
├── theme_segment_assignments_reconcile.go    # NEW (optional split if A pushes the file over 450 lines)
├── theme_segment_origin.go                   # NEW: get/set/validate origin_release_version_id (C)
├── episode_import_repository_release_helpers.go  # add bundled auto-assign call (B)
├── public_effective_contributors.go          # extend candidate/accumulator with RoleCodes + MemberSlug (D)
├── release_detail_public_repository_helpers.go   # loadReleaseSegments: origin-based credits, drop suppression (D/F)
├── group_repository_cursor.go                # attachReleaseTimelineSegments: assignments + canonical type + first-occurrence (E)
backend/internal/permissions/
├── permissions.go                            # add RoleTranslator/RoleKaraokeFX/RoleTypesetter + SegmentCreditRoleCodes (D)
database/migrations/
├── 0161_theme_segments_origin_release_version.up.sql / .down.sql   # (C)
frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/
├── ThemeTimeline.tsx                         # drop TYPE_LABELS/TYPE_STYLE_KEYS, render canonical type, add member links (F2)
├── ThemeTimelineSegmentDetails.tsx            # NEW (likely split target, see Pitfall F2)
```

### Pattern 1: Insert-missing / delete-excess reconciliation (the exact pattern to replicate for Workstream A)

**What:** Enumerate the target set inside a transaction, insert what's missing, then
`DELETE ... WHERE NOT (id = ANY(kept))` for what should no longer exist.
**When to use:** Any "this set of rows must exactly match this computed domain" sync — exactly
Workstream A's requirement.
**Example (already in production, unmodified):**
```go
// Source: backend/internal/repository/admin_content_anime_themes.go:1279-1339
// syncThemeSegmentPlaybackSourceTx synchronisiert theme_segment_playback_sources fuer
// ALLE aktuell zugewiesenen Release-Versionen eines Segments.
func (r *AdminContentRepository) syncThemeSegmentPlaybackSourceTx(ctx context.Context, tx pgx.Tx, segmentID int64) error {
    // ... enumerate releaseVersionIDs from theme_segment_assignments ...
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
Apply the identical `NOT (release_version_id = ANY($kept))` shape to
`theme_segment_assignments` itself, with `kept` = the union of (a) the newly enumerated
episode-range target set and (b) any assignment excluded via the override-protection query
(Pattern 2 below) — assignments outside the range but protected by an override must be added to
`kept`, not silently dropped from the deletion candidate set only.

### Pattern 2: Excluding override-protected rows from a bulk delete (Workstream A2)

The FK already guarantees referential safety
(`theme_segment_episode_overrides.theme_segment_id, release_version_id` composite FK
`ON DELETE CASCADE` back to `theme_segment_assignments`, migration 0142). The reconciliation must
compute the deletion candidate set, then subtract anything with an override, in ONE query (not a
per-row loop like the existing `nonOverriddenSegmentAssignments` handler helper at
`backend/internal/handlers/segment_render_fanout.go:32-48`, which is an N+1 anti-pattern that
predates this phase and should not be copied):

```sql
-- Source: pattern derived from theme_segment_episode_overrides schema (migration 0142) —
-- exclude any assignment with a live override from the delete-candidate computation in one query.
SELECT tsa.release_version_id
FROM theme_segment_assignments tsa
LEFT JOIN theme_segment_episode_overrides o
  ON o.theme_segment_id = tsa.theme_segment_id
 AND o.release_version_id = tsa.release_version_id
WHERE tsa.theme_segment_id = $1
  AND NOT (tsa.release_version_id = ANY($2::bigint[]))  -- outside the new target range
  AND o.id IS NULL                                       -- and NOT protected by an override
```

### Pattern 3: Migration adding a nullable FK column with `ON DELETE SET NULL` + index (Workstream C, migration 0161)

**Direct analog already in the repo, same table family, same shape:**
```sql
-- Source: database/migrations/0143_theme_segment_render_cache_release_version.up.sql (unmodified)
ALTER TABLE theme_segment_render_cache
    ADD COLUMN IF NOT EXISTS release_version_id BIGINT REFERENCES release_versions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_theme_segment_render_cache_segment_version
    ON theme_segment_render_cache (theme_segment_id, release_version_id, status);
```
```sql
-- 0143 down (analog for 0161's .down.sql)
ALTER TABLE theme_segment_render_cache
    DROP COLUMN IF EXISTS release_version_id;
```
For 0161, use `ON DELETE SET NULL` (not `CASCADE`) per CONTEXT.md's decision that origin is
"nullable and korrigierbar", never a value whose disappearance should delete the segment:
```sql
ALTER TABLE theme_segments
    ADD COLUMN IF NOT EXISTS origin_release_version_id BIGINT REFERENCES release_versions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_theme_segments_origin_release_version
    ON theme_segments (origin_release_version_id);
```
House style for this exact "NULL BIGINT REFERENCES ... ON DELETE SET NULL" shape is also confirmed
independently in `database/migrations/0131_member_point_foundation.up.sql:27-29`
(`actor_app_user_id`, `fansub_group_id`, `release_version_id` all follow this same
`BIGINT NULL REFERENCES x(id) ON DELETE SET NULL` pattern).

### Pattern 4: Backfill via `INSERT ... SELECT ... ON CONFLICT DO NOTHING` with a `RAISE NOTICE` stats block (Workstream C backfill)

**Direct analog, same migration family, same problem shape (deriving one canonical row per segment
from existing assignment data):**
```sql
-- Source: database/migrations/0141_theme_segment_assignments.up.sql:42-94 (abbreviated)
DO $$
DECLARE
    multi_episode_segment_count integer;
BEGIN
    SELECT COUNT(*) INTO multi_episode_segment_count FROM theme_segments WHERE end_episode > start_episode;
    RAISE NOTICE 'Migration 0141: % rows with a real multi-episode range found.', multi_episode_segment_count;
END $$;

WITH resolved AS (
    SELECT DISTINCT ON (ts.id) ts.id AS theme_segment_id, rv.id AS release_version_id
    FROM theme_segments ts
    JOIN theme_segment_playback_sources tps ON tps.theme_segment_id = ts.id
    -- ... join chain to release_versions/episodes ...
    ORDER BY ts.id, /* tie-break rule */, rv.id ASC
)
INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id)
SELECT theme_segment_id, release_version_id FROM resolved
ON CONFLICT (theme_segment_id, release_version_id) DO NOTHING;
```
For 0161's backfill (per CONTEXT.md: "niedrigste Episode innerhalb der zugewiesenen
Release-Versionen als konservativer Fallback"):
```sql
WITH origin_candidate AS (
    SELECT DISTINCT ON (tsa.theme_segment_id)
        tsa.theme_segment_id,
        tsa.release_version_id
    FROM theme_segment_assignments tsa
    JOIN release_versions rv ON rv.id = tsa.release_version_id
    JOIN fansub_releases fr ON fr.id = rv.release_id
    JOIN episodes ep ON ep.id = fr.episode_id
    ORDER BY tsa.theme_segment_id,
        COALESCE(ep.sort_index, CASE WHEN COALESCE(ep.episode_number,'') ~ '^[0-9]+$' THEN ep.episode_number::int END) ASC NULLS LAST,
        tsa.release_version_id ASC
)
UPDATE theme_segments ts
SET origin_release_version_id = oc.release_version_id
FROM origin_candidate oc
WHERE ts.id = oc.theme_segment_id
  AND ts.origin_release_version_id IS NULL;
-- Segments with zero assignments are intentionally left NULL — "Origin nicht bestimmt", not an error.
```

### Pattern 5: Bundled auto-assignment on new release-version creation (Workstream B)

The production insert path is `createFansubRelease` + `createReleaseVersion`
(`episode_import_repository_release_helpers.go:144-170`), invoked from
`upsertImportReleaseGraph` (same file, lines 23-106), itself invoked from
`applyReleaseNative` (`episode_import_repository_apply.go:15-92`), which already holds
`input.AnimeID` and runs everything inside one `tx`. Use the same exact join-pattern constants
(`GetSegmentReleaseDuration`, `admin_content_anime_themes.go:1916-1946`; and
`AssignThemeSegmentToEpisodeRange`, `theme_segment_assignments.go:101-110`) for episode/version
resolution, expressed as a single bundled `INSERT ... SELECT`:
```sql
-- NEW query, same join-chain conventions as the two existing analogs above.
INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id)
SELECT ts.id, $1  -- the newly created release_version_id
FROM theme_segments ts
WHERE ts.fansub_group_id = $2
  AND COALESCE(NULLIF(BTRIM(ts.version), ''), 'v1') = $3
  AND ts.start_episode IS NOT NULL AND ts.end_episode IS NOT NULL
  AND ts.start_episode <= $4 AND ts.end_episode >= $4  -- $4 = this episode's resolved sort_index
ON CONFLICT (theme_segment_id, release_version_id) DO NOTHING;
```
This is ONE query per newly created release version, covering all matching segments at once — not
a loop per segment, satisfying P156-16's bundled-loading requirement directly.

### Anti-Patterns to Avoid

- **Per-row override lookups in a loop:** `nonOverriddenSegmentAssignments`
  (`backend/internal/handlers/segment_render_fanout.go:32-48`) calls
  `GetThemeSegmentEpisodeOverride` once per assignment — pre-existing tech debt in the render
  fan-out path, out of this phase's scope to fix there, but must NOT be copied into the new
  Workstream A/A2 reconciliation logic. Use Pattern 2's single `LEFT JOIN` instead.
- **Deriving segment type from `theme_types.name` via SQL `LIKE`:** both
  `group_repository_cursor.go:296-302` (backend SQL) and `ThemeTimeline.tsx:31-59` (frontend
  string maps) do this today. Workstream E/F2 must pick ONE canonical backend derivation and
  delete both duplicates, not add a third one.
- **Attaching the viewed release's own contributors to segment credits:** `loadReleaseSegments`
  today (`release_detail_public_repository_helpers.go:102-108`) filters the CURRENT release
  version's contributor list by label substring and hands the result to every segment on that
  release. Post-Workstream-D this must instead resolve each segment's `origin_release_version_id`
  and batch-load THAT release's contributors — the current release and the origin release are not
  guaranteed to be the same release version.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Insert-missing/delete-excess sync | A new diff algorithm | `syncThemeSegmentPlaybackSourceTx`'s exact `NOT (id = ANY(kept))` shape | Already proven, already tested, already in the same file family |
| Override protection query | Per-row override existence checks in a Go loop | The single `LEFT JOIN ... WHERE o.id IS NULL` (Pattern 2) | Avoids N+1, avoids copying the pre-existing `nonOverriddenSegmentAssignments` anti-pattern |
| Role-code -> segment-relevance mapping | A frontend map, a repository-local map, or a handler-local map | One exported slice/const block in `backend/internal/permissions/permissions.go`, next to the existing `RoleTimer`/`RoleEncoder`/`RoleQualityChecker` constants | CONTEXT.md is explicit about a single central location; the package already holds this exact class of "stable Go-code-referenced role code" |
| Segment credit derivation | A new segment-credits table or copy-on-write cache | `loadPublicEffectiveContributors` called with the segment's `origin_release_version_id`, live per request | CONTEXT.md Nicht-Ziel: "keine dauerhafte Kopie von Credits in Segmenttabellen"; the function already exists and is already batch-capable |
| Project-page member link | Reimplementing project-member route path building | `buildPublicFansubProjectMemberPath` (`frontend/src/lib/fansubProjectRoutes.ts:37-43`) | Already built in Phase 155, already exported, unused anywhere in production yet |
| Canonical segment type | A third type-map (this phase would be the third: SQL CASE + frontend maps already exist) | One backend function/switch, consumed by both `group_repository_cursor.go` and `release_detail_public_repository_helpers.go`'s `PublicReleaseSegment.Type` | CONTEXT.md: "kanonisch im Backend/in der Domäne... statt per SQL-LIKE und per Frontend-Mapping" |

**Key insight:** almost nothing in this phase is net-new engineering — the majority of the effort is
locating the existing sibling pattern in this same domain (theme segments / public contributors)
and generalizing it, not inventing a new one. The planner should budget plan tasks accordingly:
"extend function X using the shape of sibling function Y" tasks, not "design new subsystem" tasks.

## Common Pitfalls

### Pitfall A-1: Reload-on-change logic only checks `len(newlyAssigned) > 0`

**What goes wrong:** Both call sites (`admin_content_anime_theme_segments.go:343` and `:557`)
currently reload the segment (to refresh `assigned_release_version_ids` in the API response) only
`else if len(newlyAssigned) > 0`. Once `AssignThemeSegmentToEpisodeRange` also returns removed IDs,
a range-shrink-only update (new=0, removed>0) would silently skip the reload and return a stale
`assigned_release_version_ids` list to the frontend.
**Why it happens:** The existing guard was written when the function was purely additive — "nothing
new" and "nothing changed" were the same condition. They no longer are.
**How to avoid:** Change the reload condition to `len(newlyAssigned) > 0 || len(removed) > 0` at
both call sites.
**Warning signs:** A range-shrink integration/handler test where the response body still lists the
removed release version IDs.

### Pitfall A2-1: Reconciliation must not treat "override exists" as "keep forever regardless of range"

CONTEXT.md's decision is scoped: protected assignments are excluded from *automatic* deletion and
*surfaced*, not silently promoted into the permanent target set. If the plan's data structures
merge "protected" into "kept" without a distinct flag, a later query for "assignments implied by
the current range" will incorrectly include override-protected-but-out-of-range rows as if they
were still in-range. Keep the "protected/excluded from deletion" signal separate from "in target
range" in whatever return shape `AssignThemeSegmentToEpisodeRange` grows.

### Pitfall B-1: `upsertImportReleaseGraph` does not currently return `releaseVersionID`

**What goes wrong:** The function signature today is
`upsertImportReleaseGraph(...) (bool, error)` — it returns only `created`. The auto-assignment hook
needs `releaseVersionID`, `animeID` (available in the caller, `applyReleaseNative`, via
`input.AnimeID`, but NOT currently threaded into `upsertImportReleaseGraph`), the resolved
`fansubGroupID`(s) (resolved inside `upsertReleaseVersionGroup`, not currently returned either),
and the effective `version` string.
**Why it happens:** The function was written before any caller needed the created ID back.
**How to avoid:** Plan a signature change (e.g. return `(releaseVersionID int64, groupIDs []int64,
created bool, err error)`) or call the new bundled auto-assign query directly inside
`upsertImportReleaseGraph` itself (it already has `tx`, `releaseVersionID`, and per-group info
locally) rather than threading everything back up to `applyReleaseNative`. The latter is simpler
and keeps the change file-local.
**Warning signs:** A plan task that tries to call the new auto-assign function from
`applyReleaseNative` without first confirming what data is actually available there.

### Pitfall B-2: Multiple fansub groups per release version

`resolveImportFansubSelection` / `upsertReleaseVersionGroup` can attach MORE THAN ONE
`fansub_group_id` to a single release version (`memberGroups []resolvedImportFansubGroup`). Segment
ranges are themselves per-`fansub_group_id` (`theme_segments.fansub_group_id`). The bundled
auto-assign query (Pattern 5) must run once per group actually attached to the new release version,
not just once — still bundled per group (one `INSERT...SELECT` per group, not a per-segment loop),
but the plan must not assume a release version has exactly one group.

### Pitfall D-1: `PublicReleaseContributor.RoleLabel` is a joined, already-aggregated string

`loadPublicEffectiveContributors` aggregates ALL of a member's roles for a release into one
comma-joined German label (`accumulator.contributor.RoleLabel = strings.Join(roles, ", ")`,
`public_effective_contributors.go:196`). Filtering "is this contributor segment-relevant" by role
CODE (not label) requires keeping the underlying `role_code` set per contributor through the
aggregation, not just the joined label — i.e. `publicContributorAccumulator` needs a second map
(role codes) alongside the existing `roleLabels map[string]struct{}`, and the SQL's
`ARRAY_AGG(DISTINCT COALESCE(rd.label_de, acr.role_code) ...)` needs a sibling
`ARRAY_AGG(DISTINCT acr.role_code) FILTER (WHERE acr.role_code IS NOT NULL)`.

### Pitfall D-2: Segment credits must come from the segment's origin, not the viewed release

See Pattern/Anti-Pattern above — this is the single easiest mistake to make in this phase, because
`loadReleaseSegments` already has a `contributors []PublicReleaseContributor` parameter sitting
right there (the current release's contributors) and it is tempting to just change the *filter* on
it rather than change *which release version's contributors are loaded*.

### Pitfall E-1: `attachReleaseTimelineSegments` currently has no suppression at all

Unlike the release-detail side (which currently over-suppresses via
`suppressSegmentsAlreadyVisibleOnPreviousEpisode`), the project-page path
(`group_repository_cursor.go:275-374`) currently has ZERO first-occurrence logic — every episode in
a segment's range gets the segment attached, every time. Workstream E is pure ADDITION of a new
rule here, not removal of an existing (wrong) one. Do not conflate this with Workstream F's removal
task — they are opposite directions on two different pages.

### Pitfall F-1: Removing `suppressSegmentsAlreadyVisibleOnPreviousEpisode` also removes its only
consumer of `loadAdjacentReleases`'s `prev` value for this purpose

`loadAdjacentReleases` (`release_detail_public_repository_helpers.go:238-263`) is also used
elsewhere for `Previous`/`Next` navigation targets in `GetPublicReleaseDetail` — do not delete
`loadAdjacentReleases` itself, only the suppression function that currently calls it for this one
purpose. Confirm via `grep -n "loadAdjacentReleases(" backend/internal/repository/*.go` before
deleting anything beyond `suppressSegmentsAlreadyVisibleOnPreviousEpisode`.

### Pitfall F-2: No `member_slug` field exists on the segment-credit DTO today

`PublicReleaseContributor` (`release_detail_public_repository.go:34-40`) has `MemberID int64` but
no slug. The established source column is `members.public_slug` (migration 0145), and the
established SQL shape for exposing it publicly (respecting private profiles) is
`CASE WHEN m.profile_visibility = 'public' THEN m.public_slug ELSE NULL END AS member_slug`
(used identically in `group_contributors_repository.go:67/120`,
`anime_contributions_public_repository.go:77/201`, `domain_projection_repository.go:103/195`).
Workstream F's member-link requirement (P156-14) cannot be satisfied without adding this field and
this exact visibility-gated CASE to `loadPublicEffectiveContributors`'s query.

### Pitfall F2-1: `ThemeTimeline.tsx` is already at 396/450 lines

Adding canonical-type rendering (removing ~30 lines of maps helps) AND adding origin/range display
AND adding member links (new) will very likely push the file over 450 lines even after the map
removal nets out some savings. Plan a proactive split (e.g. extract `SegmentDetails` +
`SelectionSurface` into a sibling file, as already partially isolated as standalone functions in
the current file) rather than discovering the overage during execution.

### Pitfall G-1: Two different Phase-117-era test DSNs exist; do not invent a third without reason

`TEAM4S_PHASE117_TEST_DSN` (via `testsupport.OpenPhase117Postgres`) already backs every existing
test in this exact table family (`theme_segment_assignments_integration_test.go`,
`release_detail_public_segments_integration_test.go`). `TEAM4S_PHASE155_TEST_DSN` is a separate,
phase-155-scoped harness for a *new* repository that phase introduced. Since Phase 156 modifies
existing repositories in the Phase-117 family, reusing `TEAM4S_PHASE117_TEST_DSN` is the
consistent choice — introducing `TEAM4S_PHASE156_TEST_DSN` should require an explicit, documented
reason (mirroring the reasoning `155-PATTERNS.md` already had to write down for its own DSN
choice), not be a default.

## Code Examples

### Reconciling range-sync guard (existing, to be preserved verbatim)

```go
// Source: backend/internal/repository/theme_segment_assignments.go:84-86
if segmentID <= 0 || animeID <= 0 || fansubGroupID <= 0 || startEpisode <= 0 || endEpisode <= 0 {
    return nil, nil
}
```
This exact guard is the P156-03 "unvollstaendiger Bereich loescht nichts" requirement's anchor —
the reconciled version must keep this early-return BEFORE any delete logic runs, not just before
insert logic.

### Existing handler-level fake-repo test harness (the exact pattern for new handler tests)

```go
// Source: backend/internal/handlers/admin_content_anime_theme_segment_range_autoassign_test.go:37-98
type rangeAutoAssignThemeRepo struct {
    adminThemeRepository // embed the full interface, override only what's exercised
    segment     *models.AdminThemeSegment
    rangeCall   *rangeAutoAssignCall
    rangeResult []int64
    rangeErr    error
}
func (f *rangeAutoAssignThemeRepo) AssignThemeSegmentToEpisodeRange(ctx context.Context, segmentID int64, animeID int64, fansubGroupID int64, version string, startEpisode int, endEpisode int) ([]int64, error) {
    f.rangeCall = &rangeAutoAssignCall{segmentID, animeID, fansubGroupID, version, startEpisode, endEpisode}
    return f.rangeResult, f.rangeErr
}
```
When `AssignThemeSegmentToEpisodeRange`'s signature grows a second return value (removed IDs), this
fake and its four existing tests (`TestCreateAnimeSegment_RangeAutoAssignsAllEpisodesInRange`,
`..._RangeAutoAssignIdempotentSkipsReload`, `..._RangeAutoAssignFailureIsNonFatal`,
`TestUpdateAnimeSegment_RangeAutoAssignUsesEffectivePatchedValues`) all need a compile-fix pass
plus new range-shrink test cases in the same file.

### Existing integration-test harness (the exact pattern for new repository tests)

```go
// Source: backend/internal/repository/theme_segment_assignments_integration_test.go:50-53
pool := testsupport.OpenPhase117Postgres(t)
ctx := context.Background()
repo := NewAdminContentRepository(pool)
```
Skips cleanly when `TEAM4S_PHASE117_TEST_DSN` is unset — safe default for CI/non-DB-equipped runs.

### Existing query-budget regression-gate pattern (for Workstream G)

```go
// Source: backend/internal/repository/fansub_project_resolver_query_budget_test.go:37-61, 98-155
counter := &queryCounter{}
config.ConnConfig.Tracer = counter
// ... reset() immediately before the measured call, count() after ...
require.Equalf(t, smallCount, largeCount, "constant query budget violated: ...")
require.Equalf(t, phase155ProjectResolverConstantQueryBudget, largeCount, "... update only with an intentional, documented loader change")
```
`queryCounter` itself (`backend/internal/repository/query_counter.go`) is a shared, reusable
`pgx.QueryTracer` — no new tracer needed for Phase 156's own budget test(s) on the segment/origin
bundled load.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Additive-only `AssignThemeSegmentToEpisodeRange` (Quick-Task 260819-lm5) | Reconciling Soll-Ist sync | This phase (156) | Range shrink now actually removes stale assignments; behavior change documented as a deliberate supersession of the additive design note in the function's doc comment |
| Release page suppresses segments already visible on the previous episode (Phase 117 D-02) | Release page shows all assigned segments with range/origin labeling | This phase (156) | Deliberate, documented supersession of D-02 for the release-page surface only — `DECISIONS.md` gets a new entry per CONTEXT.md; the project page gains the suppression logic D-02 used to provide, just relocated |
| Segment type derived per-surface (SQL `LIKE` on project page, string maps on release page's `ThemeTimeline`) | One canonical backend-derived type | This phase (156) | Both existing derivations are deleted in favor of one; this is the first phase to unify them |
| Segment credits from label-substring heuristic (`strings.Contains(label, "kara")`) | Stable role-code allow-list, centrally defined | This phase (156) | Directly closes a class of false-positive/false-negative risk (any German role label containing "kara" or "typeset" as a substring, however unrelated, currently matches) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `applyReleaseNative` (`episode_import_repository_apply.go:15`) is the ONLY production code path that inserts `release_versions` rows relevant to Workstream B's auto-assignment requirement, matching CONTEXT.md's claim that `episode_import_repository_release_helpers.go`'s `createReleaseVersion` is "der einzige produktive Insert-Pfad" | Workstream B (Pattern 5, Pitfall B-1/B-2) | If another admin-manual release-version-creation path exists elsewhere (e.g. a direct admin CRUD handler not surfaced by this research's greps), P156-04 could silently not apply there; recommend the plan run `grep -rn "INSERT INTO release_versions" backend/internal/repository/*.go` as a Wave-0 verification step, not just trust this research |
| A2 | `theme_segments.origin_release_version_id`'s admin-editor correction path (P156-18) needs only backend validation ("target release must already be assigned to this segment"), no new DB constraint, matching CONTEXT.md's explicit "no new complexity on Vorrat" stance | Workstream C | If the planner decides a DB-level CHECK/trigger is warranted for defense-in-depth, that is additional, not blocking — flagged here so it is a deliberate planning decision, not an oversight |
| A3 | The `ThemeTimeline.tsx` split (Pitfall F2-1) is best done by extracting `SegmentDetails`/`SelectionSurface` into a sibling file rather than restructuring the geometry-allocation logic | Workstream F2 | Low risk — this is a suggested split point, not a load-bearing architectural claim; the planner/executor has freedom to choose a different split boundary as long as the 450-line cap is respected |

**If this table is empty:** N/A — see rows above. All other claims in this document are backed by
direct file:line reads performed during this research session (Read tool + grep against the live
repository on `team4s-linux`), not training-data recall.

## Open Questions

1. **Exact shape of `AssignThemeSegmentToEpisodeRange`'s new return value(s)**
   - What we know: it must keep returning "newly assigned IDs" (existing callers' render fan-out
     depends on this) and must additionally surface "removed IDs" (for render/playback-source
     cleanup) and "override-protected, excluded-from-deletion IDs" (for admin visibility per
     P156-03's "sichtbar gemeldet" requirement).
   - What's unclear: whether these should be three separate `[]int64` return values, one struct
     return value, or two values plus a follow-up query for the protected set. CONTEXT.md leaves
     this open ("Eine abweichende Loesung ist zulaessig, wenn sie begruendet, eindeutig und testbar
     ist").
   - Recommendation: the planner should pick ONE shape explicitly in the plan (e.g. a small
     `SegmentAssignmentSyncResult{Added, Removed, ProtectedByOverride []int64}` struct) so every
     downstream task (handler reload condition, render-cache cleanup, admin UI messaging) references
     the same field names consistently.

2. **Where exactly does the admin segment editor surface "excluded from auto-removal"?**
   - What we know: CONTEXT.md requires it be "sichtbar gemeldet", and explicitly forbids a UI
     redesign.
   - What's unclear: whether this is a toast/banner on save, an inline badge on the existing
     assignment-chip UI (`AdminThemeSegmentAssignmentEpisode`/`has_override` chips already exist per
     `admin_anime_themes.go:85-98`), or a response-body field the frontend doesn't yet render at all
     this phase (deferred to a later phase, since "kein UI-Redesign" is explicit).
   - Recommendation: given the explicit no-redesign constraint, the minimal-safe interpretation is:
     extend the API response with the protected-IDs list (backend correctness, P156-19 testable),
     and treat frontend surfacing of that list as tightly scoped to a minimal existing-component
     extension (e.g. reusing the existing `has_override` chip styling) rather than new UI — planner
     should confirm this reading during plan-checker review, not assume it silently.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL 16 (Docker Compose service) | All repository-layer work, migration 0161 | Not verified live in this research session (no `docker compose ps` run — research is code-only per phase scope) | 16 (per CLAUDE.md) | — |
| `golang:1.25-alpine` (test container image) | `go build`/`go vet`/`go test` per CLAUDE.md's mandated command shape | Assumed available (used successfully in Phase 154/155 per their SUMMARY.md files) | 1.25-alpine | — |
| `TEAM4S_PHASE117_TEST_DSN` fixture DB (`team4s_phase117_test`) | All new/changed integration tests in the theme-segment family | Assumed pre-existing (used by 12+ existing tests in this family); not verified live this session | — | If missing: schema-only clone from `team4s_v2`, same recipe as `154-01-PLAN.md`'s Task 3 note for `team4s_phase131_test` |

No missing-with-no-fallback items identified. This research session did not execute
`docker compose ps` or connect to the live database (out of scope for a research-only pass); the
planner/executor should re-verify container/DSN availability at execution time per CLAUDE.md's
"At the start of work... run `docker compose ps`" instruction.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (backend) | Go `testing` + `github.com/stretchr/testify` (require) |
| Config file | none — plain `go test`, gated by env-var DSN presence for Postgres-backed tests |
| Quick run command | `docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend golang:1.25-alpine go build ./... && go vet ./...` |
| Full suite command | `docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -e TEAM4S_PHASE117_TEST_DSN="$DSN" -w /workspace/backend golang:1.25-alpine go test ./internal/repository/... ./internal/handlers/... -count=1` |
| Framework (frontend) | Vitest 3, `frontend/vitest.config.ts` |
| Quick run command (frontend) | `npm run test -- ThemeTimeline` (inside `frontend/`, or via existing project test script) |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| P156-02/P156-03 | Range shrink removes out-of-range, unprotected assignments; guard blocks empty-range wipe; override-protected assignment survives shrink | integration (Postgres) | `go test ./internal/repository/... -run TestAssignThemeSegmentToEpisodeRange -count=1` | ✅ extend existing `theme_segment_assignments_integration_test.go` |
| P156-04 | New release version inside existing segment range gets assignment automatically, both orderings | integration (Postgres) | new `go test ./internal/repository/... -run TestUpsertImportReleaseGraph.*AutoAssign` | ❌ Wave 0 — new test in `episode_import_repository_apply_test.go` or a new sibling file |
| P156-07/P156-08/P156-09 | Translation/Timing/KaraokeFX/Typesetting projected; Encoding/QC excluded; no label heuristic | unit + integration | `go test ./internal/repository/... -run TestLoadPublicEffectiveContributors` (extend) + `-run TestReleaseDetailPublicSegments` (extend) | ✅ extend existing files |
| P156-10/P156-11 | Project page: first occurrence only, credit change does not create new timeline entry | integration (Postgres) | new `go test ./internal/repository/... -run TestAttachReleaseTimelineSegments` | ❌ Wave 0 — `group_repository_cursor.go` currently has no dedicated test file for this function per this research's file listing; confirm at plan time via `find backend/internal/repository -iname "*group_repository_cursor*test*"` |
| P156-13 | Release page shows segment used since Folge 1 on Folge 5 (no suppression) | integration (Postgres) | `go test ./internal/repository/... -run TestReleaseDetailPublicSegments` (extend, remove suppression-asserting subtest, add range/origin-label assertions) | ✅ extend existing `release_detail_public_segments_integration_test.go` |
| P156-16/P156-17 | No N+1 on segment/origin/credit bundled load | integration (Postgres) | new query-budget test, `queryCounter` pattern (Code Examples) | ❌ Wave 0 — new file, sibling to `fansub_project_resolver_query_budget_test.go` |
| P156-19 negative cases | Encoding/QC never appear as segment credits | unit | table-driven test on the new `SegmentCreditRoleCodes` filter in `permissions` package or its repository consumer | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `go build ./... && go vet ./...` (fast, no DB needed) plus the specific
  `-run` targeted test for the function just changed.
- **Per wave merge:** Full `go test ./internal/repository/... ./internal/handlers/... -count=1`
  with `TEAM4S_PHASE117_TEST_DSN` set (all Postgres-gated tests execute, not skip).
- **Phase gate:** Full backend suite green + frontend `ThemeTimeline` Vitest suite green before
  `/gsd:verify-work`.

### Wave 0 Gaps

- [ ] Confirm (or create) a dedicated test file for `attachReleaseTimelineSegments`
      (`group_repository_cursor.go`) — this research did not find one; first-occurrence logic (new
      this phase) needs a home.
- [ ] New query-budget test file for the bundled segment+origin+credit load (Workstream G),
      sibling to `fansub_project_resolver_query_budget_test.go`.
- [ ] New test file (or extension of `episode_import_repository_apply.go`'s existing test coverage —
      confirm existence via `find backend/internal/repository -iname "*episode_import*apply*test*"`
      at plan time) for Workstream B's auto-assignment-on-creation behavior, both orderings.
- [ ] Confirm `TEAM4S_PHASE117_TEST_DSN`'s backing database (`team4s_phase117_test`) actually exists
      on `team4s-linux` before relying on it (see Environment Availability).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V4 Access Control | yes | Existing `permissionSvc`/`requireSegmentManage` gate on admin segment write endpoints (`admin_content_anime_theme_segments.go:252`) — unchanged by this phase, origin-correction must go through the same existing capability check (`release_version.segments.manage`, `permissions.go:53`), not a new bypass |
| V5 Input Validation | yes | Origin-correction validation ("target release version must already be assigned to this segment") is new backend logic this phase adds — must reject, not silently clamp, an invalid target (mirrors the existing `UpsertThemeSegmentEpisodeOverride` FK-violation -> `ErrConflict` translation pattern, `theme_segment_overrides.go:59-63`) |
| V6 Cryptography | no | Not applicable — no secrets/crypto surface touched |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Over-exposure of non-public member data via segment credits | Information Disclosure | CONTEXT.md and P156-18 are explicit: reuse `loadPublicEffectiveContributors`'s existing `is_public_on_anime_page = true AND visibility = 'public'` gate (`public_effective_contributors.go:73-76`) unchanged — do not build a second, parallel credit-loading path for segments that skips this gate |
| Origin pointing at a release version the segment is not actually assigned to (data integrity, not exploit) | Tampering | Backend validation on origin-correction (see V5 above); FK `ON DELETE SET NULL` handles the release-version-deleted case automatically |
| SQL injection via new dynamic queries (Workstream A/B/C/D all add new parameterized queries) | Tampering | All new queries follow the existing pgx parameterized-query convention (`$1`, `$2`, ...) already used throughout this repository — no string-concatenated SQL anywhere in the reviewed code, no reason to deviate |

## Sources

### Primary (HIGH confidence — direct file reads against the live repository, 2026-09-11)
- `backend/internal/repository/theme_segment_assignments.go` (full file) — current
  `AssignThemeSegmentToEpisodeRange`/`UnassignThemeSegmentFromReleaseVersion`/
  `ListThemeSegmentAssignments`
- `backend/internal/repository/theme_segment_assignments_integration_test.go` (full file) —
  existing test harness/pattern
- `backend/internal/handlers/admin_content_anime_theme_segment_range_autoassign_test.go` (full
  file) — existing fake-repo handler test pattern
- `backend/internal/handlers/admin_content_anime_theme_segments.go:246-570` — Create/Update segment
  handler call sites for `AssignThemeSegmentToEpisodeRange`
- `backend/internal/repository/admin_content_anime_themes.go:1279-1339,1916-1946` —
  `syncThemeSegmentPlaybackSourceTx` (reconciliation analog), `GetSegmentReleaseDuration` (join
  pattern analog)
- `backend/internal/repository/theme_segment_overrides.go` (full file) — override CRUD, FK-violation
  translation pattern
- `database/migrations/0142_theme_segment_episode_overrides.up.sql` — override table, composite FK
  `ON DELETE CASCADE`
- `database/migrations/0141_theme_segment_assignments.up.sql` — assignments table, indexes, backfill
  pattern analog
- `database/migrations/0143_theme_segment_render_cache_release_version.up.sql` + `.down.sql` —
  direct migration-shape analog for 0161
- `database/migrations/0131_member_point_foundation.up.sql`, `0054_theme_segment_playback_sources.up.sql`
  — `ON DELETE SET NULL` house-style confirmation
- `database/migrations/0145_member_public_identity_visibility.up.sql` — `members.public_slug` column
- `backend/internal/repository/episode_import_repository_release_helpers.go` (full file) — production
  release-version insert path
- `backend/internal/repository/episode_import_repository_apply.go:1-100` — `applyReleaseNative`
  transaction/caller context
- `backend/internal/repository/public_effective_contributors.go` (full file) — batch-capable
  effective-contributor resolver, role-label aggregation to replace
- `backend/internal/repository/release_detail_public_repository.go` (full file) —
  `PublicReleaseContributor`/`PublicReleaseSegment` DTOs
- `backend/internal/repository/release_detail_public_repository_helpers.go` (full file) —
  `loadReleaseSegments`, `suppressSegmentsAlreadyVisibleOnPreviousEpisode`,
  `applyAppliesThroughEpisode`, `loadContributors`
- `backend/internal/repository/group_repository_cursor.go:220-374` — `attachReleaseTimelineSegments`,
  current SQL `LIKE`-based type classification
- `backend/internal/models/group.go` (full file) — `EpisodeReleaseSummary`,
  `ReleaseTimelineSegment` DTOs
- `backend/internal/models/admin_anime_themes.go:35-98` — `AdminThemeSegment`,
  `AdminThemeSegmentCreateInput`, `AdminThemeSegmentPatchInput`, assignment/episode DTOs
- `backend/internal/permissions/permissions.go:1-96` — existing role-code constant block
  (`RoleTimer`, `RoleEncoder`, `RoleQualityChecker`) and its explicit "code referenced directly in
  Go" convention comment
- `database/migrations/0065_seed_contributor_roles_kernrollen.up.sql`,
  `0085_role_definitions_seed.up.sql`, `0146_capability_policy_catalog.up.sql` — confirms
  `translator`/`timer`/`karaoke_fx`/`typesetter` exist verbatim in the `role_definitions` catalog
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx`
  (full file, 396 lines) — current type-world/participant rendering
- `frontend/src/lib/fansubProjectRoutes.ts` (full file) — existing, unconsumed
  `buildPublicFansubProjectMemberPath`
- `frontend/src/components/fansubs/FansubContributorsSection.tsx:15` — confirms existing project-page
  member links point at `/members/[slug]` today (a DIFFERENT, out-of-scope surface, cited only to
  confirm the helper's non-usage claim)
- `backend/internal/repository/group_contributors_repository.go:67,120`,
  `anime_contributions_public_repository.go:77,201`, `domain_projection_repository.go:103,195` —
  established `CASE WHEN m.profile_visibility = 'public' THEN m.public_slug ELSE NULL END` pattern
- `backend/internal/repository/query_counter.go` (full file) — reusable `pgx.QueryTracer` for
  query-budget tests
- `backend/internal/repository/fansub_project_resolver_query_budget_test.go` (full file) — Phase-155
  query-budget test pattern
- `docs/audits/2026-09-11-fansub-project-performance/REPORT.md` (full file) — Vorher/Nachher report
  template to replicate for P156-19
- `.planning/phases/156-.../156-CONTEXT.md`, `156-USER-REQUEST.md` — locked decisions (this
  research does not re-derive or contradict them)
- `.planning/ROADMAP.md` section "### Phase 156" — full P156-01..19 requirement definitions
- `.planning/phases/154-.../154-01-PLAN.md:160-246` — exact `golang:1.25-alpine`/DSN-swap test
  command convention
- `CLAUDE.md` (project root) — canonical environment, conventions, test-style rules

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — milestone/phase history context (Phase 155 completion, Phase 156 append)
  — narrative confirmation only, not a technical source

### Tertiary (LOW confidence)
- None — every technical claim in this document traces to a direct file read or grep performed in
  this session against the live repository, not to training-data recall.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, fully internal
- Architecture: HIGH — every pattern cited is an existing, working, in-repository analog verified
  by direct file read this session, not a general Go/Postgres pattern recalled from training
- Pitfalls: HIGH — each pitfall traces to a specific line range read this session (e.g. the
  `len(newlyAssigned) > 0` reload-gate, the missing `releaseVersionID` return value, the missing
  `member_slug` field)

**Research date:** 2026-09-11
**Valid until:** 30 days (stable internal codebase, no external API/library version drift risk)
