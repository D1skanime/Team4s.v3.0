# Phase 189: Bugfix-Bündel — Pattern Map

**Mapped:** 2026-10-20
**Files analyzed:** 32 (create/modify/delete across D-04–D-12)
**Analogs found:** 29 / 32 (3 are pure removals with no analog needed — D-11 deletions)

RESEARCH.md already did exhaustive file:line investigation for this phase. This document turns
those findings into concrete before/after excerpts from the closest existing analogs, so the
planner can cite copy-from-here/copy-to-there pairs directly in plan actions.

## File Classification

| New/Modified/Deleted File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/internal/repository/group_repository_coop.go` (NEW) | repository | CRUD (read) | `backend/internal/repository/group_repository.go` (`getOtherGroups`, lines 412-454) | exact — same package, same signature shape, same return type |
| `backend/internal/repository/group_repository_cursor.go` (MODIFY) | repository | CRUD (read) | itself, `GetGroupReleasesCursor` (lines 33-297) | exact — additive field + one call |
| `backend/internal/repository/group_repository_coop_test.go` (NEW) | test | CRUD (read) | `backend/internal/testsupport/phase187_postgres.go` fixture pattern + `admin_content_anime_project_timeline_test.go`'s real-DB style | role-match |
| `backend/internal/models/group.go` (MODIFY — only if a new `CoopGroups` field is needed on a model struct) | model | — | `GroupReleasesData.OtherGroups` (lines 83-87) | exact |
| `shared/contracts/openapi.yaml` (MODIFY — `GroupReleaseListCursorResponse`) | config/contract | request-response | same file, `GroupReleasesData` schema (~line 14533) and `GroupReleaseListCursorResponse` (~line 17784) | exact |
| `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts` (MODIFY) | utility (SSR data assembly) | transform | itself, line 54/261 | exact — one-line data-source swap |
| `frontend/src/app/anime/[id]/group/[groupId]/sections/ProjectStats.tsx` (MODIFY) | component | request-response (render) | itself (full file read, 124 lines) | exact — rewrite of 2+ partner branch |
| `frontend/src/lib/fansubProjectRoutes.ts` (MODIFY — add `buildTechnicalFansubProjectPath`) | utility | transform | itself, `buildTechnicalFansubReleasePath` (lines 11-13) | exact |
| `frontend/src/lib/fansubProjectRoutes.test.ts` (MODIFY/extend) | test | transform | existing file, pure-function Vitest style | exact |
| `frontend/src/app/anime/[id]/group/[groupId]/sections/BacklinksSection.tsx` (MODIFY — "Mehr entdecken") | component | request-response (render) | itself (full file read, 27 lines) | exact |
| new pure filter helper `discoverableOtherGroups(...)` (location: planner's choice, e.g. sibling of `BacklinksSection.tsx` or in `projectPageData.ts`) | utility | transform | `frontend/src/lib/fansubProjectRoutes.ts` (pure-function style) + its `.test.ts` sibling | role-match |
| `frontend/src/app/anime/[id]/group/[groupId]/releases/page.tsx` (MODIFY — D-07 `Image`→`ResponsiveImage` at 2 sites) | component | request-response (render) | `frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx` (lines 95-138, already-correct `ResponsiveImage` usage) | exact |
| `backend/internal/handlers/admin_content_anime_project_notes.go` (MODIFY — new `requireAnimeProjectNoteWriteAccess`) | controller/middleware (guard) | request-response | `backend/internal/handlers/admin_content_anime_project_timeline.go` (`requireAnimeProjectTimelineWriteAccess`, lines 62-98) | exact — same phase-188 pattern, swap action constant |
| `backend/internal/handlers/admin_content_anime_project_notes_test.go` (MODIFY/extend) | test | request-response | `backend/internal/handlers/admin_content_anime_project_timeline_test.go` (lines 68-101, Handler-Test A/B) | exact |
| `backend/internal/handlers/app_auth_capabilities.go` (MODIFY — add `CanEditProjectNotes` field + computation block) | controller | request-response | itself, `canEditProjectTimeline` block (lines 118-136) | exact |
| `backend/internal/handlers/app_auth_capabilities_test.go` (MODIFY/extend if exists, else NEW) | test | request-response | sibling capability tests in same package | role-match |
| `frontend/src/types/fansub.ts` (MODIFY — add `can_edit_project_notes`; remove Merge interfaces; **mandatory split, 764 lines**) | model/type | — | split precedent: `frontend/src/types/fansubNotes.ts` (separate small domain file split out of `fansub.ts`-adjacent code), naming convention `admin-capability.ts`/`admin-users.ts` | role-match (split precedent, not identical content) |
| `frontend/src/app/admin/fansubs/[id]/edit/FansubEditClient.tsx` (MODIFY — `canEditProjectNotes` fallback) | component | request-response | itself, `canEditProjectTimeline` fallback (around line 159-160) | exact |
| `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNoteWorkspace.tsx` (MODIFY — own capability fetch) | component | request-response | `AnimeProjectTimelineSection.tsx` (lines 69-84, `getFansubGroupCapabilities(fansubId, undefined, { animeId })`) | exact |
| `backend/internal/handlers/fansub_merge.go` (DELETE) | controller | request-response | — (removal, no analog needed) | n/a |
| `backend/internal/handlers/fansub_merge_test.go` (DELETE) | test | — | — | n/a |
| `backend/internal/repository/fansub_repository_merge_core.go` (DELETE) | repository | CRUD | — | n/a |
| `backend/internal/repository/fansub_repository_merge_duplicates.go` (DELETE) | repository | CRUD | — | n/a |
| `backend/cmd/server/admin_routes.go` (MODIFY — remove 2 route lines) | route | request-response | itself | exact |
| `backend/internal/repository/release_version_group_guard_test.go` (MODIFY — remove `TestFansubRepositoryMergeCoreHasNoGuardReferences`) | test | — | itself | exact |
| `frontend/src/app/admin/fansubs/merge/` (DELETE whole directory) | component | request-response | — | n/a |
| `frontend/src/lib/api/fansubs-groups.ts` (MODIFY — remove `mergeFansubsPreview`/`mergeFansubs`) | utility (API client) | request-response | itself, surrounding CRUD functions in same file | exact |
| `frontend/src/app/admin/fansubs/page.tsx` (MODIFY — remove 2 links) | component | request-response | itself | exact |
| `frontend/src/app/admin/fansubs/direct-access-gate.test.tsx` (MODIFY — remove merge-specific blocks) | test | request-response | itself | exact |
| `backend/internal/repository/release_version_group_guard.go` (MODIFY — add `FansubGroupDependencySummary` + counting func) | repository | CRUD (read) | itself (full file, `DependencySummary`/`countReleaseVersionGroupDependents`, lines 10-89) | exact — same file, parallel type |
| `backend/internal/repository/errors.go` (MODIFY — add `ErrFansubGroupHasDependents`/`FansubGroupHasDependentsError`) | utility (error types) | — | itself, `ErrGroupHasDependents`/`GroupHasDependentsError` (lines 15-55) | exact |
| `backend/internal/repository/fansub_repository_groups.go` (MODIFY — `DeleteGroup`; **mandatory split, 771 lines**) | repository | CRUD (delete) | split precedent: `fansub_repository_aliases.go`/`fansub_repository_members.go`/`fansub_repository_links.go` (domain-split siblings of the same `FansubRepository`) | role-match (split naming precedent) |
| new repository test file, e.g. `fansub_repository_groups_delete_test.go` | test | CRUD (delete) | `backend/internal/repository/release_version_group_guard_test.go` (real-fixture dependents test style) | exact |
| `backend/internal/handlers/fansub_groups.go` (MODIFY — `DeleteFansub`, add 409 handling) | controller | request-response | `backend/internal/handlers/episode_version_update.go` (lines 79-87, `errors.As`/409 pattern) | exact |
| new/extended handler test, e.g. `fansub_groups_test.go` (`TestDeleteFansub...Dependents`) | test | request-response | pattern of `admin_content_anime_project_timeline_test.go`'s httptest style | role-match |

## Pattern Assignments

### `backend/internal/repository/group_repository_coop.go` (repository, CRUD/read) — D-04

**Analog:** `backend/internal/repository/group_repository.go`, `getOtherGroups` (lines 412-454)

**Pattern to mirror exactly** (imports already satisfied by package-level `group_repository_cursor.go`; new file needs its own minimal imports):
```go
// getOtherGroups retrieves other fansub groups with an actual release on this anime.
// An anime_fansub_groups row alone is only an assignment and does not imply a
// collaboration or a published release.
func (r *GroupRepository) getOtherGroups(
	ctx context.Context,
	animeID int64,
	excludeGroupID int64,
) ([]models.FansubGroupSummary, error) {
	query := `
		SELECT
			DISTINCT fg.id,
			fg.slug,
			fg.name,
			fg.logo_url
		FROM release_version_groups rvg
		JOIN release_versions rev ON rev.id = rvg.release_version_id
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN fansub_groups fg ON fg.id = rvg.fansub_group_id
		WHERE e.anime_id = $1 AND rvg.fansub_group_id != $2
		ORDER BY fg.name ASC
	`

	rows, err := r.db.Query(ctx, query, animeID, excludeGroupID)
	if err != nil {
		return nil, fmt.Errorf("query other groups for anime %d: %w", animeID, err)
	}
	defer rows.Close()

	groups := make([]models.FansubGroupSummary, 0, 8)
	for rows.Next() {
		var group models.FansubGroupSummary
		if err := rows.Scan(&group.ID, &group.Slug, &group.Name, &group.LogoURL); err != nil {
			return nil, fmt.Errorf("scan other group row: %w", err)
		}
		groups = append(groups, group)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate other group rows: %w", err)
	}

	return groups, nil
}
```

**New function shape** (`getCoopGroups`, same error-wrapping/scan-loop idiom, self-join to require a
*shared* `release_version_id` — RESEARCH.md's proposed SQL, verify against Wave-0 fixture per
Assumption A3):
```go
func (r *GroupRepository) getCoopGroups(
	ctx context.Context,
	animeID int64,
	groupID int64,
) ([]models.FansubGroupSummary, error) {
	query := `
		SELECT DISTINCT fg.id, fg.slug, fg.name, fg.logo_url
		FROM release_version_groups rvg_self
		JOIN release_version_groups rvg_other
		  ON rvg_other.release_version_id = rvg_self.release_version_id
		 AND rvg_other.fansub_group_id != rvg_self.fansub_group_id
		JOIN release_versions rev ON rev.id = rvg_self.release_version_id
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN fansub_groups fg ON fg.id = rvg_other.fansub_group_id
		WHERE rvg_self.fansub_group_id = $2 AND e.anime_id = $1
		ORDER BY fg.name ASC
	`
	// ... identical Query/scan-loop/error-wrap idiom as getOtherGroups above,
	// with error strings mentioning "coop groups" instead of "other groups".
}
```

**Call-site pattern** (`group_repository_cursor.go`, lines 285-296 — extend, don't rewrite):
```go
page, nextCursor, hasMore := trimCursorPage(episodes, limit, cursorFn)
otherGroups, err := r.getOtherGroups(ctx, animeID, groupID)
if err != nil {
	return nil, fmt.Errorf("load other release groups (%d,%d): %w", animeID, groupID, err)
}
// ADD a sibling call here:
// coopGroups, err := r.getCoopGroups(ctx, animeID, groupID)
// if err != nil { return nil, fmt.Errorf("load coop groups (%d,%d): %w", animeID, groupID, err) }

return &GroupReleasesCursorPage{
	Items:      page,
	NextCursor: nextCursor,
	HasMore:    hasMore,
	OtherGroups: otherGroups,
	// CoopGroups: coopGroups,
}, nil
```
`GroupReleasesCursorPage` struct (lines 21-26) needs one additive field:
```go
type GroupReleasesCursorPage struct {
	Items      []models.EpisodeReleaseSummary `json:"items"`
	NextCursor *string                        `json:"next_cursor"`
	HasMore    bool                           `json:"has_more"`
	OtherGroups []models.FansubGroupSummary   `json:"other_groups"`
	// CoopGroups []models.FansubGroupSummary `json:"coop_groups"` -- add
}
```

---

### `shared/contracts/openapi.yaml` — D-04 contract fix

**Analog A (field shape to copy):** `GroupReleasesData` schema (~line 14533-14538):
```yaml
GroupReleasesData:
  ...
  properties:
    group: ...
    episodes: ...
    other_groups:
      type: array
      items:
        $ref: "#/components/schemas/FansubGroupSummary"
```

**Analog B (schema actually used by the cursor endpoint, currently missing `other_groups`
entirely — pre-existing drift):** `GroupReleaseListCursorResponse` (~line 17784-17796):
```yaml
GroupReleaseListCursorResponse:
  type: object
  description: Seek-Cursor-Seite der vollstaendigen Release-Liste (AO4-03/AO4-24)
  required: [items, next_cursor, has_more]
  properties:
    items:
      type: array
      items:
        $ref: "#/components/schemas/EpisodeReleaseSummary"
    next_cursor:
      type: string
      nullable: true
    has_more:
      type: boolean
    # ADD (fixes pre-existing drift + D-04):
    # other_groups:
    #   type: array
    #   items:
    #     $ref: "#/components/schemas/FansubGroupSummary"
    # coop_groups:
    #   type: array
    #   items:
    #     $ref: "#/components/schemas/FansubGroupSummary"
```
Both new fields are additive/non-required — no breaking change, matches the existing optional-field
convention in this contract.

---

### `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts` — D-04/D-05 data plumbing

**Current (wrong source, line 261):**
```ts
return {
  previews: activityPage.items.map((release, index) =>
    buildPublicReleasePreview({ animeID, groupID, release, detail: index === 0 ? latestDetail : null, canonicalProjectPath }),
  ),
  cooperationGroups: activityPage.other_groups ?? [],
};
```
**Fix:** change `activityPage.other_groups` → `activityPage.coop_groups`. The field/prop name
`cooperationGroups` (line 54 in the `ProjectPageData` interface) is **already correctly named**
end-to-end — this is a one-line data-source swap, not a rename.

---

### `frontend/src/app/anime/[id]/group/[groupId]/sections/ProjectStats.tsx` (component) — D-05

**Analog:** itself — this file already has the exact 1-partner link pattern to reuse and the
2+-partner `AvatarStack` branch to replace. Full file read (124 lines, well under 450-line limit,
no split needed).

**Keep as-is (1 partner — `singleCoopGroup`, lines 80-87), only change link target:**
```tsx
singleCoopGroup ? (
  <Link
    href={`/fansubs/${singleCoopGroup.slug}`}   // CHANGE to buildTechnicalFansubProjectPath(animeID, singleCoopGroup.id)
    prefetch={false}
    className={styles.singleCoopPartner}
  >
    {singleCoopGroup.name}
  </Link>
) : ( ... )
```

**Replace entirely (2+ partners, lines 88-97 — `AvatarStack` branch, drop per D-05):**
```tsx
<AvatarStack
  items={avatarItems}
  maxVisible={visibleLimit}
  ariaLabel={`${coopGroups.length} Coop-Partner`}
  onOverflowClick={hasOverflow ? toggleDetails : undefined}
  overflowExpanded={detailsOpen}
  overflowControls={detailsId}
  overflowAriaLabel={...}
/>
```
→ replaced with a text format: 2 partners "A · B" (both as links), 3+ "A · B +N" (links + existing
expandable `coopPartnerDetails`/`coopPartnerList` block, lines 103-121, which ALREADY renders each
group as a `<Link href={`/fansubs/${group.slug}`}>` — only its `href` needs the same
`buildTechnicalFansubProjectPath` swap as the single-partner case, no structural rewrite needed
there).

**Dead code to remove once `AvatarStack` is dropped here:** `avatarItems`/`resolveApiUrl` (lines
60-64) and the `AvatarStack` import from `@/components/ui` (line 6) if no other usage remains in
this file.

---

### `frontend/src/lib/fansubProjectRoutes.ts` — D-05/D-06 URL helper (new exported function)

**Analog:** itself, `buildTechnicalFansubReleasePath` (lines 11-13) — exact naming/shape to mirror:
```ts
export function buildTechnicalFansubReleasePath(animeID: number, groupID: number, releaseVersionID: number): string {
  return `/anime/${animeID}/group/${groupID}/releases/${releaseVersionID}`
}
```
**New function (add alongside it, one level shallower, same convention):**
```ts
export function buildTechnicalFansubProjectPath(animeID: number, groupID: number): string {
  return `/anime/${animeID}/group/${groupID}`
}
```
Note: `buildPublicFansubProjectHref` (lines 34-47) already has this exact literal inline as a
private fallback (`` `/anime/${params.project.id}/group/${params.groupId}` ``, line 46) — the new
function should be the single source of truth; `buildPublicFansubProjectHref`'s fallback branch
may optionally be refactored to call it, but that is not required for D-05/D-06 to work.

---

### `frontend/src/app/anime/[id]/group/[groupId]/sections/BacklinksSection.tsx` (component) — D-06

**Analog:** itself (full file, 27 lines, well under 450):
```tsx
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

import { Card, SectionHeader } from '@/components/ui'

import styles from '../page.module.css'

interface BacklinksSectionProps {
  fansubSlug: string
  animeID: number
}

export function BacklinksSection({ fansubSlug, animeID }: BacklinksSectionProps) {
  return (
    <div className={styles.backlinksSection}>
      <SectionHeader title="Mehr entdecken" />
      <Card variant="flat" className={styles.backlinksCard}>
        <Link href={`/fansubs/${fansubSlug}`} className={styles.deepLink}>
          <ExternalLink size={16} aria-hidden="true" /> Zur Gruppenseite
        </Link>
        <Link href={`/anime/${animeID}`} className={styles.deepLink}>
          <ExternalLink size={16} aria-hidden="true" /> Zur Anime-Seite
        </Link>
      </Card>
    </div>
  )
}
```
**Pattern to extend:** add a new `discoverableGroups` prop (type `FansubGroupSummary[]`), and for
each one render an additional `<Link href={buildTechnicalFansubProjectPath(animeID, group.id)}
className={styles.deepLink}><ExternalLink size={16} aria-hidden="true" /> {group.name}</Link>` —
**same `styles.deepLink` class, same icon, same `Link`/`Card` primitives** already used here. Do
NOT import or reuse `otherGroupChip`/`otherGroupsSection` styles from `releases/page.tsx` (D-06:
no visual chip reuse). When `discoverableGroups` is empty, render nothing extra (mirrors this
component's existing unconditional-but-always-present two links — the new links are simply
conditional on array length).

**Filter helper to write as its own pure, testable function** (new file or colocated), computing
`otherGroups` minus `coopGroups` minus self — Pitfall 4 from RESEARCH.md: these sets are NOT
naturally disjoint, must subtract explicitly:
```ts
export function discoverableOtherGroups(
  otherGroups: FansubGroupSummary[],
  coopGroups: FansubGroupSummary[],
  selfGroupId: number,
): FansubGroupSummary[] {
  const excluded = new Set([selfGroupId, ...coopGroups.map((g) => g.id)])
  return otherGroups.filter((g) => !excluded.has(g.id))
}
```
Style precedent for a small pure-function + co-located `.test.ts`: `fansubProjectRoutes.ts` /
`fansubProjectRoutes.test.ts`.

---

### `frontend/src/app/anime/[id]/group/[groupId]/releases/page.tsx` — D-07 image fix

**Analog (already-correct pattern elsewhere in this app):**
`frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx`, lines 95-138:
```tsx
import { ResponsiveImage } from "@/components/ui/ResponsiveImage";
// ...
<ResponsiveImage
  src={heroImageUrl}
  alt={`${anime.title} Banner`}
  width={1200}
  height={200}
  className={styles.heroBannerImg}
  quality={85}
  priority
/>
```

**Current broken code in `releases/page.tsx`** (two sites, imports raw `next/image` at line 4):

Site 1, lines 325-332 (group header logo):
```tsx
import Image from 'next/image'
// ...
{group.fansub.logo_url ? (
  <Image
    src={group.fansub.logo_url}
    alt={group.fansub.name}
    width={60}
    height={60}
    className={styles.logo}
  />
) : ( ... )}
```

Site 2, lines 427-434 (`otherGroupChip` thumbnail):
```tsx
{otherGroup.logo_url ? (
  <Image
    src={otherGroup.logo_url}
    alt={otherGroup.name}
    width={22}
    height={22}
    className={styles.otherGroupLogo}
  />
) : ( ... )}
```

**Fix:** replace `import Image from 'next/image'` with `import { ResponsiveImage } from
'@/components/ui/ResponsiveImage'`, and swap the JSX tag name at both sites — same props, no
other change needed. This is the "Don't Hand-Roll" item from RESEARCH.md: do not add
`/api/v1/media/files/**` to `publicImagePatterns.mjs`'s `LOCAL_IMAGE_PATTERNS`, and do not wrap in
a local `try/catch`.

Note: `releases/page.tsx` is 556 lines (already over 450 before this phase). Per CLAUDE.md, this
phase's D-07 edit to its content forces a split (pure-refactor commit first). The file currently
mixes page shell, filter-bar state, and the `otherGroupsSection`/`otherGroupChip` block that D-06
confirms will NOT be reused on the project page (only on this page) — a natural split boundary is
extracting the filter-bar UI or the `otherGroupsSection` block into its own component file,
analogous to how `group_repository.go`/`group_repository_cursor.go` already split by concern.

---

### `backend/internal/handlers/admin_content_anime_project_notes.go` (controller) — D-08 backend

**Analog:** `backend/internal/handlers/admin_content_anime_project_timeline.go`, lines 62-98
(`requireAnimeProjectTimelineWriteAccess` — the exact Phase-188 pattern to mirror):
```go
func (h *AdminContentHandler) requireAnimeProjectTimelineWriteAccess(c *gin.Context) (middleware.AuthIdentity, bool) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return middleware.AuthIdentity{}, false
	}

	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungültige fansub id")
		return middleware.AuthIdentity{}, false
	}
	// D-12: die Rechteprüfung berücksichtigt bestätigte Projektrollen für GENAU dieses
	// Anime+Gruppe-Paar (CanForAnimeProject), nicht mehr nur gruppenweite Rollen
	// (CanForFansubGroup) -- animeID wird dafür hier, vor der Prüfung, selbst geparst.
	animeID, err := strconv.ParseInt(c.Param("animeId"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungültige anime id")
		return middleware.AuthIdentity{}, false
	}

	result, err := h.permissionSvc.CanForAnimeProject(
		c.Request.Context(), actor, permissions.ActionAnimeFansubProjectTimelineUpdate, animeID, fansubID,
	)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung für den Projektzeitraum konnte nicht geprüft werden.")
		return middleware.AuthIdentity{}, false
	}
	if !result.Allowed {
		auditPermissionDenied(
			c, h.auditLogRepo, identity, "anime_project_timeline.update.denied",
			&fansubID, "anime_fansub_group", nil, permissions.ActionAnimeFansubProjectTimelineUpdate, result,
		)
		writePermissionDenied(c, result)
		return middleware.AuthIdentity{}, false
	}
	return identity, true
}
```

**Current call sites to replace** (`admin_content_anime_project_notes.go`, lines 102-106 and
178-182 — `UpsertAnimeFansubProjectNote`/`DeleteAnimeFansubProjectNote`):
```go
func (h *AdminContentHandler) UpsertAnimeFansubProjectNote(c *gin.Context) {
	identity, ok := h.requireFansubGroupNoteWriteAccess(c)   // ← REPLACE with requireAnimeProjectNoteWriteAccess(c)
	if !ok {
		return
	}
	// ...
}

func (h *AdminContentHandler) DeleteAnimeFansubProjectNote(c *gin.Context) {
	identity, ok := h.requireFansubGroupNoteWriteAccess(c)   // ← REPLACE with requireAnimeProjectNoteWriteAccess(c)
	if !ok {
		return
	}
	// ...
}
```
Both handlers already parse `animeID` from `c.Param("animeId")` a few lines below the guard call
(lines 114, 190) — the new guard function should parse it itself (same as the timeline analog
does), duplicating that parse is intentional/matches the existing pattern (the timeline handler
also re-parses `animeId` inside its own body after the guard).

**Guard being replaced (current wrong-scope function, for contrast — do not copy this shape
again):** `admin_content_fansub_group_notes.go`, lines 19-43 (`requireFansubGroupNoteWriteAccess`
— group-wide `CanForFansubGroup`, no `animeID`, the bug this phase fixes).

**New capability action to use:** `permissions.ActionAnimeFansubProjectNotesWrite` — already
exists (`permissions_types.go:37`), no migration needed (RESEARCH.md Pitfall 2).

---

### `backend/internal/handlers/admin_content_anime_project_notes_test.go` — D-08 test

**Analog:** `admin_content_anime_project_timeline_test.go`, lines 68-101 (Handler-Test A/B pair):
```go
handler := &AdminContentHandler{
	permissionSvc: permissions.NewService(permissionResolverStub{
		context:                  &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{88}},
		roles:                    map[int64][]string{88: {}},
		projectContributionRoles: map[int64]map[int64][]string{88: {9: {permissions.RoleProjectLead}}},
	}),
}
```
Mirror exactly, swapping in `UpsertAnimeFansubProjectNote`/`DeleteAnimeFansubProjectNote` as the
exercised handler methods. Existing 4 tests in this file
(`contributionsPermissionResolverAllowed`/`Denied` stubs from
`admin_content_fansub_releases_contributions_handlers_test.go:20,49`) are confirmed compatible —
`CanForAnimeProject` falls back gracefully when the stub doesn't implement the optional
`AnimeProjectContributionResolver` interface (RESEARCH.md "Existing test compatibility" section).

**New tests needed** (per RESEARCH.md): one proving confirmed `project_lead` project role without
group role → allowed; one proving `quality_checker`-without-project-role group role → still
allowed (unchanged); one proving `founder`/`co_leader`-only actor → denied (the real D-09 loss
case).

---

### `backend/internal/handlers/app_auth_capabilities.go` (controller) — D-08 frontend-facing capability

**Analog:** itself, `canEditProjectTimeline` computation block (lines 118-136):
```go
// D-12/D-13: ist eine anime_id-Query gesetzt, wird die Rechteprüfung projektbezogen
// (CanForAnimeProject, berücksichtigt bestätigte Projektrollen für GENAU dieses
// Anime+Gruppe-Paar) statt gruppenweit (CanForFansubGroup) ausgewertet. Ohne anime_id
// bleibt das bestehende gruppenweite Verhalten für alle Aufrufer unverändert erhalten.
var canEditProjectTimeline permissions.Result
if rawAnimeID := strings.TrimSpace(c.Query("anime_id")); rawAnimeID != "" {
	parsedAnimeID, parseErr := strconv.ParseInt(rawAnimeID, 10, 64)
	if parseErr != nil || parsedAnimeID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige anime-id"}})
		return
	}
	canEditProjectTimeline, err = h.permissionSvc.CanForAnimeProject(c.Request.Context(), actor, permissions.ActionAnimeFansubProjectTimelineUpdate, parsedAnimeID, fansubID)
} else {
	canEditProjectTimeline, err = h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionAnimeFansubProjectTimelineUpdate, fansubID)
}
if err != nil {
	writePermissionInternalError(c, err, "Berechtigung für den Projektzeitraum konnte nicht geprüft werden.")
	return
}
```
**New block to add immediately after it** — identical shape, swap action constant to
`permissions.ActionAnimeFansubProjectNotesWrite`, variable `canEditProjectNotes`, error message
text "Berechtigung für die Projektnotiz konnte nicht geprüft werden."

**Response struct** (`fansubGroupCapabilitiesResponse`, lines 14-44) gets one additive field next
to `CanEditNotes`/`CanEditProjectTimeline` (lines 26-27):
```go
CanEditNotes               bool `json:"can_edit_notes"`
CanEditProjectTimeline     bool `json:"can_edit_project_timeline"`
// CanEditProjectNotes     bool `json:"can_edit_project_notes"` -- add
```
Keep `can_edit_notes` untouched (D-08: tab visibility stays as-is).

---

### `frontend/src/app/admin/fansubs/[id]/edit/*` — D-08 frontend wiring

**`FansubEditClient.tsx` analog** (`canEditProjectTimeline` fallback pattern, around lines
159-160) — mirror exactly for `canEditProjectNotes`:
```ts
const canEditProjectTimeline = isPlatformAdmin || Boolean(capabilities?.can_edit_project_timeline)
// NEW, same shape:
// const canEditProjectNotes = isPlatformAdmin || Boolean(capabilities?.can_edit_project_notes)
```
Note the EXISTING bug being fixed: `FansubEditClient.tsx:154-158`'s current
`canEditProjectNotes = canUseMainTab("notes", isPlatformAdmin, capabilities)` conflates tab
visibility with write permission — this assignment must be replaced, not extended.

**`AnimeProjectNoteWorkspace.tsx` analog:** `AnimeProjectTimelineSection.tsx`, line 72-84 pattern
(`getFansubGroupCapabilities(fansubId, undefined, { animeId })`, reading
`response.data.can_edit_project_timeline`, falling back to the `canEdit` prop on fetch failure) —
mirror with `can_edit_project_notes` and the `canEdit` prop already passed down from
`AnimeProjectReleaseCard.tsx:211`.

---

### `frontend/src/types/fansub.ts` — split required before D-08/D-11 edits (764 lines)

**Split precedent in this same directory:** `fansubNotes.ts` (small, focused domain file already
split out) and the broader `admin-*.ts` naming convention (`admin-capability.ts`,
`admin-users.ts`, `admin-jellyfin.ts`, `admin-theme-segment.ts`, `admin-anime-core.ts`) — each a
focused slice of a formerly-monolithic admin type surface.

**Section inventory relevant to this phase** (grep-confirmed exports in `fansub.ts`):
- `FansubGroupCapabilities`/`FansubGroupCapabilitiesResponse` (lines 261-296) — needs the new
  `can_edit_project_notes: boolean;` field (D-08).
- `MergeFansubsRequest`/`MergeFansubsResult`/`MergeFansubsResponse`/
  `MergeFansubsPreviewConflicts`/`MergeFansubsPreviewResult`/`MergeFansubsPreviewResponse`
  (lines 465-508) — entire block to be removed (D-11).

**Recommendation for the plan:** do the mandatory pure-refactor split FIRST (its own commit,
tests/typecheck green, no behavior change), extracting a cohesive slice (e.g. capabilities-related
interfaces into a new `fansub-capabilities.ts`, following the `admin-capability.ts` naming
convention) so that `fansub.ts` itself drops under 450 lines; THEN do the additive
`can_edit_project_notes` field edit and the Merge-type removal as separate, behavior-changing
commits against whichever file now holds each block.

---

### `backend/internal/handlers/fansub_merge.go` / repository merge files — D-11 removal

No analog needed (pure deletion). Exact removal inventory (file:line-precise, already verified by
RESEARCH.md via exhaustive grep, not re-verified here):

| File | Action |
|---|---|
| `backend/internal/handlers/fansub_merge.go` (179 lines) | delete entirely |
| `backend/internal/handlers/fansub_merge_test.go` (39 lines) | delete entirely |
| `backend/internal/repository/fansub_repository_merge_core.go` (236 lines) | delete entirely |
| `backend/internal/repository/fansub_repository_merge_duplicates.go` (396 lines) | delete entirely (all 6 functions verified merge-only) |
| `backend/cmd/server/admin_routes.go:138-139` | remove 2 route registration lines |
| `backend/internal/repository/release_version_group_guard_test.go:279-296` | remove `TestFansubRepositoryMergeCoreHasNoGuardReferences` **in the same commit** as the merge-core file deletion (it does `os.ReadFile("fansub_repository_merge_core.go")` — leaving it in a separate commit breaks the build/test run between commits) |
| `frontend/src/app/admin/fansubs/merge/` (whole dir) | delete entirely |
| `frontend/src/lib/api/fansubs-groups.ts:1-10,118-175` | remove only `mergeFansubsPreview`/`mergeFansubs` + their type imports |
| `frontend/src/types/fansub.ts:465-508` | remove Merge interfaces (see split note above) |
| `frontend/src/app/admin/fansubs/page.tsx:110,199` | remove both `<Link href="/admin/fansubs/merge">` entry points |
| `frontend/src/app/admin/fansubs/direct-access-gate.test.tsx` | remove merge-specific `import`/`it`/`describe` blocks + `apiMocks` entries only, file stays (still covers `/admin/fansubs/create` gating) |
| `shared/contracts/openapi.yaml` | delete both merge paths + all 6 `MergeFansubs*` schemas (no other schema `$ref`s them) |
| Permission catalog | **no migration** — merge was gated by `h.requireAdmin(c)` only, no `Action`/`role_capabilities` row ever existed for it |

---

### `backend/internal/repository/release_version_group_guard.go` (repository) — D-12 counting logic

**Analog:** itself, full file (184 lines) — `DependencySummary`/`countReleaseVersionGroupDependents`
is the exact pattern to parallel, NOT to modify in place (D-12's check is keyed by
`fansub_group_id` alone, a structurally different shape than the `(release_version_id,
fansub_group_id)` pair this file already handles):
```go
type DependencySummary struct {
	Credits int32
	Media   int32
	Notes   int32
}

func (s DependencySummary) HasAny() bool {
	return s.Credits > 0 || s.Media > 0 || s.Notes > 0
}

func germanPluralCount(count int32, singular string, plural string) string {
	if count == 1 {
		return fmt.Sprintf("%d %s", count, singular)
	}
	return fmt.Sprintf("%d %s", count, plural)
}

func (s DependencySummary) GermanReasonFragment() string {
	return fmt.Sprintf(
		"%s, %s, %s",
		germanPluralCount(s.Credits, "Credit", "Credits"),
		germanPluralCount(s.Media, "Medium", "Medien"),
		germanPluralCount(s.Notes, "Notiz", "Notizen"),
	)
}

type dependentsQueryRower interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func countReleaseVersionGroupDependents(
	ctx context.Context,
	db dependentsQueryRower,
	releaseVersionID int64,
	fansubGroupID int64,
) (DependencySummary, error) {
	var summary DependencySummary
	err := db.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*) FROM release_role_credit_lifecycles
				WHERE release_version_id = $1 AND fansub_group_id = $2) AS credits,
			(SELECT COUNT(*) FROM release_version_media
				WHERE release_version_id = $1 AND fansub_group_id = $2 AND deleted_at IS NULL) AS media,
			(SELECT COUNT(*) FROM release_version_notes
				WHERE release_version_id = $1 AND fansub_group_id = $2 AND deleted_at IS NULL) AS notes
	`, releaseVersionID, fansubGroupID).Scan(&summary.Credits, &summary.Media, &summary.Notes)
	if err != nil {
		return DependencySummary{}, fmt.Errorf("count release version group dependents: %w", err)
	}
	return summary, nil
}
```
**New parallel type to add in the SAME file** (184/450 lines, plenty of headroom — RESEARCH.md's
explicit recommendation): `FansubGroupDependencySummary` with one field per "real" dependent kind
from RESEARCH's FK-verified table (`release_version_groups`, `fansub_group_members`,
`anime_contributions`, `hist_fansub_group_members`, `fansub_group_media`, `fansub_group_notes`
`WHERE deleted_at IS NULL`, `anime_fansub_project_notes` `WHERE deleted_at IS NULL`,
`fansub_group_history`, `theme_segments WHERE fansub_group_id = $1`,
`segment_library_definitions`, `fansub_group_default_crew`, `fansub_group_invitations WHERE
status = 'pending'`, `member_claim_invitations WHERE status = 'pending'`,
`user_group_capability_overrides`, `release_playback_entitlement_rules`, `review_decisions`,
`review_audit_events`, `user_group_capability_override_history`), a `HasAny()` method, and a
`GermanReasonFragment()`-equivalent — same single-`QueryRow`-with-scalar-subqueries shape as
`countReleaseVersionGroupDependents`, one `SELECT (SELECT COUNT(*) FROM ...) AS x` per table.

---

### `backend/internal/repository/errors.go` — D-12 error type

**Analog:** itself, `ErrGroupHasDependents`/`GroupHasDependentsError` (lines 15-55):
```go
var ErrGroupHasDependents = errors.New("release version group has dependents")

type GroupHasDependentsError struct {
	FansubGroupID int64
	Summary       DependencySummary
}

func (e *GroupHasDependentsError) Error() string {
	return fmt.Sprintf("fansub group %d has dependents: %+v", e.FansubGroupID, e.Summary)
}

func (e *GroupHasDependentsError) Unwrap() error {
	return ErrGroupHasDependents
}
```
**New parallel pair to add:** `ErrFansubGroupHasDependents`/`FansubGroupHasDependentsError`
(carrying `FansubGroupID int64` and `Summary FansubGroupDependencySummary`), identical
`Error()`/`Unwrap()` shape.

---

### `backend/internal/repository/fansub_repository_groups.go` — D-12 `DeleteGroup`, split required (771 lines)

**Current `DeleteGroup`** (lines 396-425, unconditional, no dependents check):
```go
func (r *FansubRepository) DeleteGroup(ctx context.Context, id int64) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin delete fansub group tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Historical members and contributions intentionally use RESTRICT FKs.
	// Admin group deletion is the explicit cleanup boundary for those records.
	if _, err := tx.Exec(ctx, `DELETE FROM anime_contributions WHERE fansub_group_id = $1`, id); err != nil {
		return fmt.Errorf("delete fansub group %d contributions: %w", id, err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM hist_fansub_group_members WHERE fansub_group_id = $1`, id); err != nil {
		return fmt.Errorf("delete fansub group %d historical members: %w", id, err)
	}

	commandTag, err := tx.Exec(ctx, `DELETE FROM fansub_groups WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete fansub group %d: %w", id, err)
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit delete fansub group tx: %w", err)
	}

	return nil
}
```
**Pattern for the new pre-check** (mirror the release-version-group guard's pre-check-before-write
idiom, `ensureRemovedReleaseVersionGroupsHaveNoDependents`, lines 163-183 of
`release_version_group_guard.go`): call the new `countFansubGroupDependents(ctx, tx, id)` BEFORE
any `DELETE`, return `&FansubGroupHasDependentsError{...}` immediately if `HasAny()`, only then
proceed with the existing unconditional deletes.

**Split required:** function list in this file (`grep -n "^func"`) shows `DeleteGroup` (30 lines)
alone is not enough to get under 450; this phase's edit forces pulling a larger block out. Split
precedent in the same package: `fansub_repository_aliases.go`, `fansub_repository_members.go`,
`fansub_repository_links.go`, `fansub_repository_public_profile.go` — all domain-focused siblings
of the same `FansubRepository` struct, same `package repository`. Recommended split: move the
read/hydrate helpers (`attachGroupCounts`, `attachGroupLinks`, `attachGroupAliases`,
`hydrateFansubGroup`, `populateCountMap`, `applyLegacyLinkProjection`, `firstLinkURL` — lines
497-771, ~274 lines) into a new `fansub_repository_groups_hydrate.go`, and `DeleteGroup` + the new
dependents check into `fansub_repository_groups_delete.go`, leaving `ListGroups`/`CreateGroup`/
`GetGroupByID`/`GetGroupBySlug`/`UpdateGroup`/`buildFansubGroupWhere`/`scanFansubGroup` in the
original file. Exact boundary is the planner's/executor's call per CLAUDE.md's "reiner
Umbau-Commit zuerst" rule.

---

### `backend/internal/handlers/fansub_groups.go` — D-12 `DeleteFansub` 409 handling (418 lines, no split needed)

**Current handler** (lines 388-418, no dependents handling):
```go
func (h *FansubHandler) DeleteFansub(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	id, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	if err := h.fansubRepo.DeleteGroup(c.Request.Context(), id); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "fansubgruppe nicht gefunden",
			},
		})
		return
	} else if err != nil {
		log.Printf("fansub delete: repo error (user_id=%d, fansub_id=%d): %v", identity.UserID, id, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.Status(http.StatusNoContent)
}
```
Note: `h.requireAdmin(c)` already gates everyone unconditionally — D-12's "gilt auch für
Plattform-Admins" is automatically satisfied; do not add any admin-bypass branch when inserting
the new check.

**409 pattern to insert, mirrored exactly from `episode_version_update.go:79-87`:**
```go
if errors.Is(err, repository.ErrGroupHasDependents) {
	var depErr *repository.GroupHasDependentsError
	errors.As(err, &depErr)
	c.JSON(http.StatusConflict, gin.H{"error": gin.H{
		"message": fmt.Sprintf("Diese Gruppe kann nicht entfernt werden: %s hängen noch daran.", depErr.Summary.GermanReasonFragment()),
		"code":    "release_version_group_has_dependents",
	}})
	return
}
```
New equivalent for `DeleteFansub`, inserted between the `ErrNotFound` branch and the generic `err
!= nil` branch:
```go
if errors.Is(err, repository.ErrFansubGroupHasDependents) {
	var depErr *repository.FansubGroupHasDependentsError
	errors.As(err, &depErr)
	c.JSON(http.StatusConflict, gin.H{"error": gin.H{
		"message": fmt.Sprintf("Diese Gruppe kann nicht entfernt werden: %s hängen noch daran.", depErr.Summary.GermanReasonFragment()),
		"code":    "fansub_group_has_dependents",
	}})
	return
}
```

**Frontend reuse note (per D-12 "unter Wiederverwendung bestehender UI/Dialoge"):** whichever
admin UI surface already renders the episode-version-group 409 message (code
`release_version_group_has_dependents`) should be grepped for and reused/extended for the new
`fansub_group_has_dependents` code, rather than building a new dialog — this phase's planner
should locate that frontend handler (likely in the fansub-groups admin delete-confirm flow) before
writing the plan's frontend task.

## Shared Patterns

### German 409-with-counted-dependents (applies to D-12, already proven for Phase 187)
**Source:** `backend/internal/repository/release_version_group_guard.go` (type +
`GermanReasonFragment`) and `backend/internal/handlers/episode_version_update.go:79-87` (handler
usage).
**Apply to:** `fansub_repository_groups.go`'s `DeleteGroup` + `fansub_groups.go`'s `DeleteFansub`.
Do not invent a second counting/formatting convention.

### Project-scoped permission check via `CanForAnimeProject` (applies to D-08, proven in Phase 188)
**Source:** `backend/internal/permissions/permissions_anime_project.go:39-96` (generic over
`action`), `admin_content_anime_project_timeline.go:62-98` (handler guard wrapper pattern).
**Apply to:** new `requireAnimeProjectNoteWriteAccess` in `admin_content_anime_project_notes.go`
and the new `canEditProjectNotes` block in `app_auth_capabilities.go`. No new permission
infrastructure needed — only new call sites of the existing generic function with
`permissions.ActionAnimeFansubProjectNotesWrite`.

### `ResponsiveImage` as the sanctioned legacy-media-URL fallback (applies to D-07)
**Source:** `frontend/src/components/ui/ResponsiveImage.tsx` (consults
`frontend/src/lib/images/publicImagePatterns.mjs`'s `isConfiguredForImageOptimization` and falls
back to `unoptimized` instead of letting `next/image` throw), already used correctly in
`HeroSection.tsx`.
**Apply to:** both `<Image>` sites in `releases/page.tsx`. Never add a local allowlist bypass or a
hand-rolled `<img>`.

### Technical project-page URL building (applies to D-05/D-06)
**Source:** `frontend/src/lib/fansubProjectRoutes.ts` (single source of truth for every
project-URL shape in the app).
**Apply to:** `ProjectStats.tsx`'s coop-partner links, `BacklinksSection.tsx`'s "Mehr entdecken"
links. Never inline a `/anime/${id}/group/${id}` template string outside this file.

### Domain-split repository/type files (applies to the mandatory D-08/D-12 splits)
**Source:** existing `fansub_repository_*.go` siblings (`_aliases`, `_members`, `_links`,
`_public_profile`) and `frontend/src/types/admin-*.ts`/`fansubNotes.ts` siblings.
**Apply to:** `fansub_repository_groups.go` (771 lines) and `frontend/src/types/fansub.ts`
(764 lines) — both require a pure-refactor split commit (per CLAUDE.md) before this phase's
content edits land, named and scoped consistently with these existing siblings, not as ad-hoc
`*_part2.go`/`*_extra.ts` files.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `backend/internal/handlers/fansub_merge.go` (DELETE) | controller | request-response | Pure removal — no replacement code, no analog needed |
| `backend/internal/repository/fansub_repository_merge_core.go` / `_duplicates.go` (DELETE) | repository | CRUD | Pure removal |
| `frontend/src/app/admin/fansubs/merge/` (DELETE directory) | component | request-response | Pure removal |

## Metadata

**Analog search scope:** `backend/internal/repository/`, `backend/internal/handlers/`,
`backend/internal/permissions/`, `backend/cmd/server/`, `frontend/src/app/anime/[id]/group/[groupId]/`,
`frontend/src/app/admin/fansubs/`, `frontend/src/lib/`, `frontend/src/types/`,
`shared/contracts/openapi.yaml`.
**Files scanned (direct reads this session):** `group_repository.go`, `group_repository_cursor.go`,
`ProjectStats.tsx`, `BacklinksSection.tsx`, `fansubProjectRoutes.ts`,
`release_version_group_guard.go`, `errors.go`, `episode_version_update.go`,
`app_auth_capabilities.go`, `admin_content_anime_project_notes.go`,
`admin_content_fansub_group_notes.go`, `admin_content_anime_project_timeline.go`,
`fansub_repository_groups.go`, `fansub_groups.go`, `releases/page.tsx`, `HeroSection.tsx`,
`projectPageData.ts`, `models/group.go`, `shared/contracts/openapi.yaml` (targeted sections),
`frontend/src/types/fansub.ts` (export inventory), repository/type directory listings for split
precedent.
**Pattern extraction date:** 2026-10-20
