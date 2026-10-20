---
phase: 189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg
reviewed: 2026-10-20T14:53:22Z
depth: standard
files_reviewed: 46
files_reviewed_list:
  - backend/cmd/server/admin_routes.go
  - backend/internal/handlers/admin_content_anime_project_notes.go
  - backend/internal/handlers/admin_content_anime_project_notes_test.go
  - backend/internal/handlers/app_auth_capabilities.go
  - backend/internal/handlers/app_auth_test.go
  - backend/internal/handlers/fansub_groups.go
  - backend/internal/handlers/fansub_groups_test.go
  - backend/internal/models/fansub.go
  - backend/internal/repository/errors.go
  - backend/internal/repository/fansub_repository_aliases.go
  - backend/internal/repository/fansub_repository_groups_delete.go
  - backend/internal/repository/fansub_repository_groups_delete_test.go
  - backend/internal/repository/fansub_repository_groups.go
  - backend/internal/repository/fansub_repository_groups_hydrate.go
  - backend/internal/repository/fansub_repository_groups_query.go
  - backend/internal/repository/fansub_repository_test.go
  - backend/internal/repository/group_repository_coop.go
  - backend/internal/repository/group_repository_coop_test.go
  - backend/internal/repository/group_repository_cursor.go
  - backend/internal/repository/release_version_group_guard.go
  - backend/internal/repository/release_version_group_guard_test.go
  - backend/internal/testsupport/phase189_postgres.go
  - frontend/src/app/admin/fansubs/direct-access-gate.test.tsx
  - "frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNoteWorkspace.test.tsx"
  - "frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNoteWorkspace.tsx"
  - "frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.test.tsx"
  - "frontend/src/app/admin/fansubs/[id]/edit/ContributionsReviewSection.test.tsx"
  - "frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.test.tsx"
  - "frontend/src/app/admin/fansubs/[id]/edit/FansubDetailsTab.test.tsx"
  - "frontend/src/app/admin/fansubs/[id]/edit/FansubEditAccessGate.tsx"
  - "frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.test.ts"
  - "frontend/src/app/admin/fansubs/[id]/edit/FansubEditClient.tsx"
  - "frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.test.tsx"
  - "frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaReviewSection.test.tsx"
  - frontend/src/app/admin/fansubs/page.tsx
  - "frontend/src/app/anime/[id]/group/[groupId]/page.module.css"
  - "frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx"
  - "frontend/src/app/anime/[id]/group/[groupId]/projectPageData.test.ts"
  - "frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts"
  - "frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx"
  - "frontend/src/app/anime/[id]/group/[groupId]/releases/OtherGroupsChips.test.tsx"
  - "frontend/src/app/anime/[id]/group/[groupId]/releases/OtherGroupsChips.tsx"
  - "frontend/src/app/anime/[id]/group/[groupId]/releases/page.tsx"
  - "frontend/src/app/anime/[id]/group/[groupId]/releases/ReleaseEpisodeCard.tsx"
  - "frontend/src/app/anime/[id]/group/[groupId]/releases/ReleasesFilterBar.tsx"
  - "frontend/src/app/anime/[id]/group/[groupId]/sections/BacklinksSection.test.tsx"
  - "frontend/src/app/anime/[id]/group/[groupId]/sections/BacklinksSection.tsx"
  - "frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx"
  - "frontend/src/app/anime/[id]/group/[groupId]/sections/ProjectStats.test.tsx"
  - "frontend/src/app/anime/[id]/group/[groupId]/sections/ProjectStats.tsx"
  - frontend/src/lib/api/fansubs-groups.ts
  - frontend/src/lib/fansubProjectRoutes.test.ts
  - frontend/src/lib/fansubProjectRoutes.ts
  - frontend/src/types/fansub-capabilities.ts
  - frontend/src/types/fansub-contributions.ts
  - frontend/src/types/fansub-invitations.ts
  - frontend/src/types/fansub-public-profile.ts
  - frontend/src/types/fansub.ts
  - frontend/src/types/releaseDetail.ts
  - shared/contracts/fansubs.yaml
  - shared/contracts/openapi.yaml
findings:
  critical: 2
  warning: 3
  info: 0
  total: 5
status: issues_found
---

# Phase 189: Code Review Report

**Reviewed:** 2026-10-20T14:53:22Z
**Depth:** standard
**Files Reviewed:** 60 (per `files_to_read`; see `files_reviewed_list`)
**Status:** issues_found

## Summary

Phase 189 bundles four independent bugfixes. Three of the four are solid and well
tested: the coop-partner data fix (`getCoopGroups` self-join, D-04) is correct and
covered by real-Postgres tests; the `next/image` crash fix for the group-logo chip
(`OtherGroupsChips.tsx` → `ResponsiveImage`) is correctly scoped and tested; and the
project-notes permission fix (`CanForAnimeProject` replacing the group-wide
`CanForFansubGroup` check) is correctly wired to the pre-existing, DB-seeded
`anime_fansub_project.notes.write` capability and is well covered by both gain-case
(`project_lead` without a group role) and loss-case (`founder`-only) regression
tests. The merge-feature removal is thorough — no dangling routes, handlers, types,
or contract entries remain on either side of the stack (verified via `grep` across
`backend/`, `frontend/`, and `shared/contracts/`, and via a clean `go build ./...`,
`go vet ./...`, and `tsc --noEmit`).

The fourth item — the new fansub-group delete-lock (D-12) — has a confirmed,
exploitable completeness gap: `countFansubGroupDependents` omits
`fansub_group_links`, a real, actively-managed, actively-rendered (group website/
Discord/IRC/GitHub links) table with an `ON DELETE CASCADE` foreign key to
`fansub_groups(id)`. I empirically reproduced this against a disposable copy of the
repository running against the project's own Postgres container: a group whose
*only* dependent is a `fansub_group_links` row passes the dependents pre-check
(`HasAny() == false`) and `DeleteGroup` succeeds, silently cascading away the links
row with no 409 and no warning — directly contradicting this feature's stated
purpose ("turn today's silent CASCADE ... into one consistent, counted, typed
error"). A second, narrower issue in the same code path: the dependents pre-check
runs outside the transaction that performs the actual deletes, unlike the sibling
guard this phase's own commit messages cite as the precedent
(`ensureRemovedReleaseVersionGroupsHaveNoDependents`, which checks *inside* the
transaction) — a narrow TOCTOU window where a dependent created between the check
and the transaction start would be silently lost. The new 409 response is also not
documented in `shared/contracts/fansubs.yaml`/`openapi.yaml`, leaving the contract
out of sync with a real, shipped API behavior change. Separately, the 189-03
refactor that fixed the `next/image` crash for the page's group-logo chip left a
sibling component on the exact same page (`ReleaseEpisodeCard.tsx`, newly extracted
in this phase) still rendering DB-sourced `thumbnail_url` values through raw
`next/image` instead of `ResponsiveImage` — the same crash class this phase set out
to fix, left unaddressed one component over.

## Critical Issues

### CR-01: Fansub-group delete-lock (D-12) omits `fansub_group_links` — confirmed silent data loss on group deletion

**File:** `backend/internal/repository/release_version_group_guard.go:200-275` (also
`backend/internal/repository/fansub_repository_groups_delete.go:1-59`,
`backend/internal/testsupport/phase189_postgres.go:112-203`)

**Issue:** `countFansubGroupDependents` counts 18 dependent categories but never
queries `fansub_group_links`. That table is a real, currently-used admin feature
(`backend/internal/repository/fansub_repository_links.go`, CRUD routes registered
in `admin_routes.go`: `GET/POST /admin/fansubs/:id/links`, `PATCH/DELETE
/admin/fansubs/:id/links/:linkId`) with `group_id BIGINT NOT NULL REFERENCES
fansub_groups(id) ON DELETE CASCADE` (`database/migrations/0044_add_db_schema_v2_target_tables.up.sql`).
Unlike the three exclusions this code base explicitly documents and tests as
deliberate (`fansub_group_aliases`, the empty legacy `fansub_members` table, the
pure-assignment `anime_fansub_groups` link, and the already-dropped
`fansub_collaboration_members`), `fansub_group_links` is not mentioned anywhere in
the rationale comments, is not stood in by `phase189_postgres.go`'s fixture, and has
no negative test proving its exclusion is intentional — every signal points to an
oversight, not a design decision.

I reproduced this empirically against a disposable copy of the repository, run
against the project's own `team4sv30-db` Postgres container (then torn down):

```
summary: {Releases:0 Memberships:0 Contributions:0 HistoricalMembers:0 Media:0
GroupNotes:0 ProjectNotes:0 History:0 Segments:0 SegmentLibrary:0 DefaultCrew:0
PendingInvitations:0 PendingClaimInvitations:0 CapabilityOverrides:0
PlaybackEntitlements:0 ReviewDecisions:0 ReviewAuditHistory:0 OverrideHistory:0}
hasAny=false
DeleteGroup err: <nil>
remaining links after DeleteGroup: 0
```

A fansub group whose only real dependent is a social/technical link record passes
the dependents check, and `DeleteGroup` deletes the group — CASCADE-deleting the
link row with it, with **no** 409, **no** `fansub_group_has_dependents` error, and
no way for the admin to know data was lost. This is exactly the class of silent
data-destruction the plan's own commit messages (`9d6187cf7`) say the feature exists
to eliminate.

**Fix:** Add `fansub_group_links` to both the counted summary and the counting
query, and add it to the real-Postgres test fixture/tests so a future change cannot
silently regress it again:

```go
// FansubGroupDependencySummary: add a field
Links int32

// countFansubGroupDependents's query: add a subquery + scan target
(SELECT COUNT(*) FROM fansub_group_links WHERE group_id = $1) AS links,
...
&summary.Links,

// HasAny / GermanReasonFragment: include it
s.Links > 0
{s.Links, "Link", "Links"},
```

Add the table to `createPhase189Prerequisites` and extend
`TestCountFansubGroupDependentsDetectsEachRealCategory` to insert and assert a
`fansub_group_links` row, mirroring the existing 18 categories.

---

### CR-02: `DeleteGroup`'s dependents pre-check runs outside the deleting transaction (TOCTOU)

**File:** `backend/internal/repository/fansub_repository_groups_delete.go:19-37`

**Issue:** `countFansubGroupDependents(ctx, r.db, id)` is called against the pool
*before* `r.db.BeginTx` is even invoked. The sibling guard this same plan's commit
messages cite as the precedent pattern —
`ensureRemovedReleaseVersionGroupsHaveNoDependents` in
`release_version_group_guard.go:353-369` — deliberately runs its dependents check
*inside* the already-open transaction (`tx pgx.Tx`), specifically to minimize the
window in which a dependent row could be created between the check and the write.
`DeleteGroup` does not follow that pattern: a release/membership/contribution/etc.
created for this group between the `countFansubGroupDependents` call and
`BeginTx` would never be seen by the check, and the subsequent `DELETE FROM
fansub_groups WHERE id = $1` would cascade it away anyway — defeating the whole
purpose of the guard for exactly the kind of concurrent-admin-action race this
feature exists to prevent. This is a real, if narrow, data-loss risk, and it is
inconsistent with the established, documented pattern in the same package.

**Fix:** Move the pre-check inside the transaction, re-using the already-opened
`tx` the same way `ensureRemovedReleaseVersionGroupsHaveNoDependents` does:

```go
tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
if err != nil {
    return fmt.Errorf("begin delete fansub group tx: %w", err)
}
defer tx.Rollback(ctx)

summary, err := countFansubGroupDependents(ctx, tx, id)
if err != nil {
    return fmt.Errorf("check fansub group %d dependents: %w", id, err)
}
if summary.HasAny() {
    return &FansubGroupHasDependentsError{FansubGroupID: id, Summary: summary}
}
// ... existing DELETE statements, same tx ...
```

(`countFansubGroupDependents` already accepts the minimal `dependentsQueryRower`
interface that both `*pgxpool.Pool` and `pgx.Tx` satisfy, so this is a drop-in
change.)

## Warnings

### WR-01: New 409 `fansub_group_has_dependents` response is not documented in the shared contracts

**File:** `shared/contracts/fansubs.yaml:99-120` (endpoint `fansub-delete`); also
`shared/contracts/openapi.yaml`

**Issue:** `DeleteFansub` (`backend/internal/handlers/fansub_groups.go:397-424`) now
returns `409 {"error": {"message": "...", "code": "fansub_group_has_dependents"}}`
for any fansub group with real dependents. Neither `shared/contracts/fansubs.yaml`'s
`fansub-delete` endpoint entry nor `shared/contracts/openapi.yaml` was updated to
document this new response. Per this repo's own convention ("Contracts are tracked
alongside code in `shared/contracts/`" — `CLAUDE.md`), this is a real contract-drift
gap for a genuine, shipped behavior change, not a cosmetic nit — a frontend
developer reading the contract to integrate this exact flow will not find the 409
case documented anywhere.

**Fix:** Add a `409` response case to the `fansub-delete` endpoint in
`shared/contracts/fansubs.yaml` (and the corresponding `openapi.yaml` path),
documenting the `fansub_group_has_dependents` code and the German message shape.

### WR-02: `ReleaseEpisodeCard.tsx` still renders DB-sourced thumbnails through raw `next/image`, bypassing the `ResponsiveImage` crash fix applied elsewhere on the same page

**File:** `frontend/src/app/anime/[id]/group/[groupId]/releases/ReleaseEpisodeCard.tsx:3,41,76`

**Issue:** This phase's 189-03 plan fixed exactly this crash class
(`E426`/`E231` from `next/image` throwing on legacy-shaped media paths that are not
covered by `images.localPatterns`) for the page's group-logo chip
(`OtherGroupsChips.tsx`, now using `ResponsiveImage`) and the page header's group
logo (`releases/page.tsx:329`, also now `ResponsiveImage`). `ReleaseEpisodeCard.tsx`
— extracted from the very same `releases/page.tsx` in the very same refactor commit
(`486efa97e`) — still imports and uses `next/image` directly for
`episode.thumbnail_url` (lines 41 and 76). That value is sourced from
`media_files.path`/`media_assets.file_path`
(`backend/internal/repository/group_repository_cursor.go:138-153`), the same class
of raw, potentially-unmigrated media path the `ResponsiveImage` component's own
documentation (`frontend/src/components/ui/ResponsiveImage.tsx`) was written to
guard against ("Pre-existing data can contain image paths outside the configured
allow-list ... any time an unmigrated path slips through ... crashes the entire
page with an HTTP 500"). This pre-dates this phase (the refactor moved the code
verbatim), but it is a newly-extracted, in-scope production file sitting directly
beside the fix for the identical bug class on the identical page, and was not
brought in line with it.

**Fix:** Replace the two `next/image` usages in `ReleaseEpisodeCard.tsx` with
`ResponsiveImage` from `@/components/ui/ResponsiveImage`, matching
`OtherGroupsChips.tsx`'s pattern exactly.

### WR-03: `DeleteFansub` ignores the `errors.As` boolean result before dereferencing

**File:** `backend/internal/handlers/fansub_groups.go:409-416`

**Issue:**
```go
if errors.Is(err, repository.ErrFansubGroupHasDependents) {
    var depErr *repository.FansubGroupHasDependentsError
    errors.As(err, &depErr)
    c.JSON(http.StatusConflict, gin.H{"error": gin.H{
        "message": fmt.Sprintf("...: %s hängen noch daran.", depErr.Summary.GermanReasonFragment()),
        ...
    }})
```
`errors.As`'s return value is discarded. Today this is safe in practice because
`errors.Is` already proved the chain contains `ErrFansubGroupHasDependents`, and the
only type in that chain is `*FansubGroupHasDependentsError`, so `errors.As` will
always succeed. But the code has no defense if that invariant is ever broken by a
future refactor (e.g. a second wrapper type introduced for the same sentinel error)
— `depErr` would stay `nil` and `depErr.Summary.GermanReasonFragment()` would panic
with a nil pointer dereference, turning a client-facing 409 into a 500 crash.

**Fix:**
```go
var depErr *repository.FansubGroupHasDependentsError
if errors.As(err, &depErr) {
    c.JSON(http.StatusConflict, gin.H{"error": gin.H{
        "message": fmt.Sprintf("Diese Gruppe kann nicht entfernt werden: %s hängen noch daran.", depErr.Summary.GermanReasonFragment()),
        "code":    "fansub_group_has_dependents",
    }})
    return
}
```

---

_Reviewed: 2026-10-20T14:53:22Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
