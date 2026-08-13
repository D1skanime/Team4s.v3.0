---
phase: 64-fansub-contributions-member-dashboard-public-pages
reviewed: 2026-06-02T00:00:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - backend/cmd/server/main.go
  - backend/internal/handlers/member_badges_handler.go
  - backend/internal/handlers/contributions_me_handler.go
  - backend/internal/handlers/fansub_hist_group_members_handler.go
  - backend/internal/handlers/fansub_hist_group_member_roles_handler.go
  - backend/internal/repository/badge_repository.go
  - backend/internal/repository/anime_contributions_public_repository.go
  - backend/internal/services/badge_service.go
  - frontend/src/app/anime/[id]/page.tsx
  - frontend/src/app/fansubs/[slug]/page.tsx
  - frontend/src/app/me/contributions/page.tsx
  - frontend/src/app/members/[slug]/page.tsx
  - frontend/src/components/anime/AnimeContributionsSection.tsx
  - frontend/src/components/anime/GroupContributionBlock.tsx
  - frontend/src/components/contributions/ContributionCard.tsx
  - frontend/src/components/contributions/MyContributionsSection.tsx
  - frontend/src/components/contributions/VisibilityDropdown.tsx
  - frontend/src/components/fansubs/GroupLeaderTimeline.tsx
  - frontend/src/components/profile/MemberBadgeChips.tsx
  - frontend/src/components/profile/MemberRoleTimeline.tsx
  - frontend/src/lib/api.ts
  - frontend/src/types/contributions.ts
  - backend/internal/handlers/contributions_public_handler.go
findings:
  critical: 0
  warning: 0
  info: 3
  total: 13
blockers_resolved: 3
warnings_resolved: 6
status: warnings_resolved
---

> **Resolution 2026-06-02:** Alle 3 BLOCKER + alle 6 Warnings behoben.
> - CR-01: `AnimeContributionRow` mit snake_case JSON-Tags (commit 694b437d) → `/me/anime-contributions` matcht `MeAnimeContribution`.
> - CR-02/CR-03: `anime_contributions_public_repository.go` neu geschrieben mit kontrakt-korrekten DTOs + Queries (gruppierte Anime-Contributions, Leader-/Rollen-Timelines, Counts, `has_unverified`); Handler liefert strukturierte Responses statt `{data:[...]}`. Defekte `m.slug`-Referenz durch abgeleiteten Slug (nickname-basiert, wie Member-Profil) ersetzt.
> - WR-01: CORS-Allowlist statt Wildcard (commit 3aba459e). WR-02: long_term_member 5-Jahres-Floor. WR-03: Badge-Hide mit optimistischem Update + Fehler-Feedback. WR-04: stabile React-Keys. WR-05: 'internal'-Badges nicht im öffentlichen Profil. WR-06: member_slug jetzt nullable (`*string`) durch CR-02/CR-03-Rewrite. (Frontend-Fixes commit 1567fe37.)
> - IN-01: gofmt behoben.
> Verifiziert via `go build`/`go vet`/`go test` + Frontend `tsc`. ACHTUNG: keine Laufzeit-/DB-Verifikation möglich (kein DB-Zugriff) — End-to-End-Test gegen docker-compose steht aus.
> Bewusst zurückgestellt (eigene Vorhaben, kein Quick-Fix): IN-02 (Inline-Styles → CSS-Module), IN-03 (member_claims-Lookup-Dedup), IN-04 (api.ts ~7100 Zeilen → Domain-Module splitten).

# Phase 64: Code Review Report

**Reviewed:** 2026-06-02
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Reviewed the fansub-contributions / member-dashboard / public-pages slice. The
three previously-flagged fixes are genuinely present and correct in the current
code:

- **CR-01 (confirm/reject):** verified. `contributions_me_handler.go` now has
  dedicated `ConfirmMyAnimeContribution` (status → `confirmed`, public=true) and
  `RejectMyAnimeContribution` (status → `disputed`, public=false), routed at
  `POST /me/anime-contributions/:id/confirm|reject` (main.go:359-360) and called
  from `confirmAnimeContribution`/`rejectAnimeContribution` in api.ts. Correct.
- **CR-02 (BadgeService `_ =` discard):** verified. `badgeService` is injected
  into both hist handlers (main.go:333-334) and `ComputeAndStoreBadges` /
  `ComputeAndStoreBadgesByMembership` is triggered after every Create/Update.
- **GET /me/badges + getMyBadges error handling (WR-05):** verified. Endpoint
  exists (main.go:351), handler returns empty list on missing claim, and api.ts
  tolerates 404 but propagates all other errors.

However, this review surfaces **three new BLOCKERs**: the public contribution
endpoints and the `/me/anime-contributions` endpoint serialize Go structs with
**no JSON tags**, producing PascalCase keys that do not match any frontend type.
This silently breaks every consumer in this phase — one of them with a hard
runtime crash. These must be fixed before the feature can work at all.

## Critical Issues

### CR-01: `/me/anime-contributions` returns PascalCase JSON — frontend dashboard never renders and crashes ✅ RESOLVED (694b437d)

**File:** `backend/internal/repository/anime_contributions_repository.go:14-32`, consumed by `backend/internal/handlers/contributions_me_handler.go:99`

**Issue:** `ListMyAnimeContributions` returns `gin.H{"data": items}` where `items`
is `[]AnimeContributionRow`. `AnimeContributionRow` (lines 14-32) has **no JSON
struct tags**, so it marshals as `{"ID":..,"FansubGroupID":..,"Status":..,
"IsPublicOnMemberProfile":..,"RoleCodes":..}` (PascalCase). The frontend type
`MeAnimeContribution` (types/contributions.ts:50-62) expects snake_case
(`status`, `role_codes`, `fansub_group_id`, `is_public_on_member_profile`).

Consequences in `MyContributionsSection.tsx`:
- `c.status` is `undefined` for every row → both `confirmed` and `pending`
  filters (lines 23-24) return empty → the dashboard always shows "0 bestätigte"
  / "0 ausstehend" even when data exists.
- When a row *does* slip through, `ContributionCard` destructures `role_codes`
  (line 39) → `undefined` → `role_codes.length` (line 76) throws
  `TypeError: Cannot read properties of undefined`, crashing the page.

**Fix:** Add JSON tags to `AnimeContributionRow`, or (cleaner) map to a tagged
response DTO in the handler. Minimal fix:
```go
type AnimeContributionRow struct {
	ID                      int64    `json:"id"`
	FansubGroupID           int64    `json:"fansub_group_id"`
	AnimeID                 int64    `json:"anime_id"`
	FansubGroupMemberID     int64    `json:"fansub_group_member_id"`
	Status                  string   `json:"status"`
	Note                    *string  `json:"note"`
	StartedYear             *int     `json:"started_year"`
	EndedYear               *int     `json:"ended_year"`
	IsPublicOnAnimePage     bool     `json:"is_public_on_anime_page"`
	IsPublicOnMemberProfile bool     `json:"is_public_on_member_profile"`
	// ... remaining fields tagged or json:"-"
	RoleCodes               []string `json:"role_codes"`
}
```

### CR-02: Public anime-contributions endpoint returns wrong shape — `AnimeContributionsSection` crashes ✅ RESOLVED

**File:** `backend/internal/handlers/contributions_public_handler.go:42-56`, `backend/internal/repository/anime_contributions_repository.go:59-67`

**Issue:** `GET /anime/:id/contributions` is served by
`ContributionsPublicHandler.GetAnimeContributions`, which returns
`gin.H{"data": items}` where `items` is `[]PublicContributionRow`.
`PublicContributionRow` (repo lines 59-67) has **no JSON tags** → marshals as
`{"data":[{"MemberDisplayName":..,"RoleCodes":..,"IsVerified":..}]}`.

The frontend (`api.ts:6989` `getAnimeContributions`) declares the return type
`PublicAnimeContributionsResponse = { groups: AnimeContributionGroup[] }`.
In `AnimeContributionsSection.tsx:27`, `data.groups` is therefore `undefined`,
and `setGroups(undefined)` is called. Render then hits `groups.length` (line 52)
→ `TypeError`. The component's `try/catch` only wraps the fetch (which returns
200 OK), so the crash is NOT swallowed — the whole anime detail page errors.

Additionally the data is semantically wrong: the frontend expects per-group
nesting with `role_labels`, `hidden_contributor_count`, `active_from_year`, etc.
The repo returns a flat per-member list with raw `role_codes` and no grouping —
the grouping/label-mapping/hidden-count logic the UI depends on does not exist
on the backend at all.

**Fix:** Build a real grouped response DTO with JSON tags matching
`PublicAnimeContributionsResponse` (groups → contributors → role_labels +
hidden_contributor_count), or change the frontend contract to match the flat
shape. Either way the handler must emit snake_case JSON and the agreed
structure. At minimum, tag `PublicContributionRow` and reshape the handler.

### CR-03: Fansub & member public contribution endpoints return wrong shape — timelines silently always empty ✅ RESOLVED

**File:** `backend/internal/handlers/contributions_public_handler.go:24-38, 60-74`

**Issue:** Same root cause as CR-02 for the other two public routes:
- `GET /fansubs/:id/contributions` returns `{"data":[PublicContributionRow]}`,
  but `getFansubContributions` (api.ts:6963) expects
  `PublicGroupContributionsResponse = { leader_timeline, anime_count,
  member_count }`. In `fansubs/[slug]/page.tsx:79`,
  `contributionsResponse.leader_timeline` is `undefined` → `?? []`
  → `GroupLeaderTimeline` always renders "Noch keine Gruppenhistorie".
- `GET /members/:slug/contributions` returns the same flat shape, but
  `getMemberContributions` (api.ts:7015) expects
  `PublicMemberContributionsResponse = { role_timeline, has_unverified }`.
  In `members/[slug]/page.tsx:108-110`, both fields are `undefined` →
  `MemberRoleTimeline` always shows the empty state and the unverified
  disclaimer never appears.

These fail silently (no crash, swallowed by `try/catch`), so the feature looks
"done" but the leader timeline and member role timeline are permanently blank —
the data is fetched, discarded, and the UI shows empty states. This is an
incorrect-behavior / effective data-loss defect, not cosmetic.

**Fix:** Implement the documented response DTOs with JSON tags
(`leader_timeline`/`anime_count`/`member_count` and
`role_timeline`/`has_unverified`) and the backend logic to populate them, or
realign the frontend contract. The current handler cannot satisfy either
consumer.

## Warnings

### WR-01: CORS `Access-Control-Allow-Origin: *` wildcard (still open)

**File:** `backend/cmd/server/main.go:401`

**Issue:** `corsMiddleware` sets `Access-Control-Allow-Origin: *` for all routes,
including authenticated `/me/*` endpoints. With `Authorization`-header auth this
is not a credentialed-cookie bypass, but it does allow any origin to read API
responses via browser JS, which is inappropriate for an admin-only surface that
exposes member PII (contributions, badges, profiles). Carried over from prior
review; still unaddressed.

**Fix:** Restrict to an allowlist of known frontend origins read from config
(e.g. `cfg.AllowedOrigins`), echoing back only matched origins rather than `*`.

### WR-02: `long_term_member` badge has no time floor for active members (still open)

**File:** `backend/internal/services/badge_service.go:106-118`

**Issue:** The query awards `long_term_member` ("5+ Jahre Mitglied") to anyone
with `joined_year IS NOT NULL AND left_year IS NULL` — i.e. any currently-active
member, even one who joined this year. A member added today with no `left_year`
immediately gets the "5+ years" badge, which is factually wrong and undermines
trust in the badge system. Carried over from prior review.

**Fix:** Add a current-year floor for the active branch:
```sql
OR (joined_year IS NOT NULL AND left_year IS NULL
    AND (EXTRACT(YEAR FROM NOW())::int - joined_year) >= 5)
```

### WR-03: No UI feedback when hiding a badge fails (still open)

**File:** `frontend/src/components/profile/MemberBadgeChips.tsx:33-41`

**Issue:** `handleHide` calls `patchMyBadgeVisibility` and swallows any error in
an empty `catch {}` ("Fehler ignorieren — Badge bleibt sichtbar"). If the PATCH
fails, the user clicks "Ausblenden", nothing happens, and there is no toast,
error text, or disabled state. The badge appears to ignore the click. Carried
over from prior review.

**Fix:** Surface failure (local error state with an inline message or a toast)
and consider an optimistic update with rollback so success/failure is visible.

### WR-04: Array index used as React key in three list renderers (still open)

**File:** `frontend/src/components/anime/GroupContributionBlock.tsx:29,38`; `frontend/src/components/fansubs/GroupLeaderTimeline.tsx:26`; `frontend/src/components/profile/MemberRoleTimeline.tsx:50`

**Issue:** `key={index}` / `key={idx}` / `key={roleIndex}` are used for dynamic
lists. Because `MemberRoleTimeline` re-sorts entries before rendering
(`sortEntries`, line 39) and the contributor lists are sliced/expanded, index
keys cause React to mis-associate DOM nodes on reorder, leading to incorrect
highlight/expansion state and subtle render bugs. Carried over from prior review.

**Fix:** Use a stable identifier from the data (member_slug + role_code +
started_year composite, or a backend-provided id) instead of the array index.

### WR-05: `internal` badge visibility is unreachable from the UI and leaks onto public profiles

**File:** `frontend/src/components/profile/MemberBadgeChips.tsx:27,50-58`; backend `member_badges_handler.go:79-83`

**Issue:** The backend accepts three visibility values (`public`, `internal`,
`hidden`) and `MemberBadgeChips` filters out only `hidden` (line 27), so
`internal` badges render identically to `public` on the public member profile.
But the only mutation the UI offers is a single "Ausblenden" button that sets
`hidden`. There is no way to set or honor `internal`, so an `internal` badge
leaks onto the public profile exactly like a public one. Either the filter or
the UI is incomplete.

**Fix:** Decide the semantics of `internal` for public profiles. If `internal`
should be hidden from public viewers, filter `badge.visibility === 'public'`
when rendering the public view. If `internal` is a distinct admin-only state,
the public profile must not render it.

### WR-06: `member_slug` empty-string vs `null` contract drift

**File:** `backend/internal/repository/anime_contributions_public_repository.go:14` and `backend/internal/repository/anime_contributions_repository.go:62`

**Issue:** The public query uses `COALESCE(m.slug, '')` and
`PublicContributionRow.MemberSlug` is a plain `string`, so a missing slug
serializes as `""`. The frontend type `PublicAnimeContribution.member_slug` is
`string | null`. Consumers that build profile links from `member_slug`
(truthiness checks) will treat `""` differently from `null` and may render a link
to `/members/` (empty slug). Lower priority now because the shapes are broken
anyway (CR-02/CR-03), but it will bite once those are fixed.

**Fix:** Either keep `m.slug` nullable (`*string`) end-to-end, or guard link
construction on a non-empty slug in the UI.

## Info

### IN-01: Misaligned struct fields in `ContributionsMeHandler` (gofmt)

**File:** `backend/internal/handlers/contributions_me_handler.go:19-22`

**Issue:** The struct fields are over-indented/misaligned relative to gofmt
(`contributionsRepo`, `groupRolesRepo`, `db` have inconsistent column
alignment). `gofmt`/`go vet` will reformat this.

**Fix:** Run `gofmt -w` on the file.

### IN-02: Hardcoded inline styles throughout the contributions UI

**File:** `frontend/src/components/contributions/ContributionCard.tsx:48-130`; `frontend/src/components/contributions/MyContributionsSection.tsx`; `frontend/src/app/me/contributions/page.tsx:69`

**Issue:** These components use large inline `style={{...}}` objects with magic
color/spacing literals (`#fafafa`, `#16a34a`, `#dc2626`, etc.) instead of the
CSS-module pattern the rest of the codebase follows (per CLAUDE.md frontend
conventions). This duplicates color tokens and diverges from sibling components
that use `styles.*` (e.g. `GroupContributionBlock`, `MemberRoleTimeline`).

**Fix:** Extract a colocated CSS module (`ContributionCard.module.css`) and use
class names, consistent with the sibling components.

### IN-03: `resolveBadgeMemberID` is a redundant pass-through, and the member-claim lookup is duplicated

**File:** `backend/internal/handlers/member_badges_handler.go:138-140`; `backend/internal/handlers/contributions_me_handler.go:39-54`

**Issue:** `resolveBadgeMemberID(c, appUserID, badgeRepo)` simply calls
`badgeRepo.ResolveMemberIDForAppUser(...)` with no added logic — pure
indirection. Separately, the verified-member resolution query is duplicated
verbatim between `BadgeRepository.ResolveMemberIDForAppUser`
(badge_repository.go:14-29) and `ContributionsMeHandler.resolveVerifiedMemberID`
(contributions_me_handler.go:39-54) — identical SQL, two copies.

**Fix:** Call the repo method directly, and consolidate the duplicated
`member_claims` lookup into a single shared repository helper.

### IN-04: `frontend/src/lib/api.ts` is 7098 lines (far over the 450-line guideline)

**File:** `frontend/src/lib/api.ts`

**Issue:** CLAUDE.md mandates production files ≤450 lines; `api.ts` is ~7100
lines. This phase added more functions to it rather than splitting. Pre-existing,
but the modularity constraint is now badly violated and should be planned for a
split (per-domain API modules).

**Fix:** Split `api.ts` into domain-scoped modules (e.g. `api/contributions.ts`,
`api/badges.ts`) re-exported from a barrel.

---

_Reviewed: 2026-06-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
