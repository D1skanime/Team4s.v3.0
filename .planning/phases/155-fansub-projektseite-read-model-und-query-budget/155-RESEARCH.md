# Phase 155: Public-Fansub-Projektseite: Read-Model, Drill-down-Navigation und Query-Budget — Research

**Researched:** 2026-09-11
**Domain:** Next.js App Router read-model / Go+pgx public API surface / SQL query-budget audit
**Confidence:** HIGH (all core claims verified by reading the actual code and, where relevant, running live queries against `team4sv30-db`)

## Summary

Phase 155 is a read-model and query-budget cleanup, not a feature build. Every "belegter Ist-Zustand" claim in `155-CONTEXT.md` was re-verified directly against the current code in this session, and one important finding **extends** what CONTEXT.md documented: the "full-profile-load-just-to-resolve-a-slug" pattern the phase targets on the project page (`frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx`) is not unique to that route — the sibling Project-Member route (`.../mitwirkende/[memberSlug]/page.tsx`) and the Release-Detail route (`.../releases/[releaseVersionId]/page.tsx`) run the **exact same** `getPublicFansubProfileBySlug(slug)` call for the identical purpose (resolving `animeSlug → {animeID, groupID}`). This is a scope question the planner/user must resolve explicitly (see Open Questions) — CONTEXT.md's scope fence forbids "rebuilding" those pages, but swapping one resolver call for a leaner one inside an unchanged page is not a rebuild.

On the SQL side, the negative finding CONTEXT.md flagged as "possible" is **confirmed true**: `GroupContributorsRepository.GetProjectContributors` (`backend/internal/repository/group_contributors_repository.go`) already issues exactly two SQL queries total (one for external contributors, one for team members via `GROUP BY`/`ARRAY_AGG`), regardless of how many members exist — there is no per-member fan-out today. The contract-level projection (`GroupContributorsResponse`) is also already lean. Workstream B is therefore primarily a *verification and lock-in* task (constant-query-budget test + contributor load test), not a rewrite, unless the planner decides the field set itself still needs trimming (it currently does not include anything on CONTEXT.md's forbidden list).

The heaviest, most concrete waste is on the **release side** (Workstream D): the project loader's `per_page: 100` call to `getGroupReleases` triggers `GroupRepository.GetGroupReleases`, which **redundantly calls `GetGroupDetail` a second time** (the loader already fetched group detail at the top of `loadPublicFansubProjectPageData`), then runs a full offset query with a `COUNT(*)` sibling query, purely so the page can compute `episodes.length` as a "has releases" gate and a "release count" metric. `GroupDetail.Stats.EpisodeCount` — already loaded for free at the top of the loader — counts distinct episodes with a release from this group and is a very close, though not byte-identical, substitute for that same count (see Open Questions for the exact semantic gap). The existing cursor endpoint (`GetGroupReleasesCursor` / `/release-list`) already returns everything the Latest-Preview and paginated History need, is genuinely bounded (`LIMIT`-based, seek pagination), and is already used elsewhere on the same page — it is the correct target shape for Workstreams D and part of E; no new backend endpoint is structurally required for "Latest Release Preview" and "Release History." A dedicated lightweight count/aggregate query (or reuse of `group.stats.episode_count`) is what's missing for the "Counts" requirement.

For Workstream E, the render-layer half of the fix is **already done and already tested**: `ProjectPage.tsx` does not render `ThemesSection`/`MediaSection`, and `page.test.tsx` (`describe('ProjectPage removed section surfaces (102-06)')`) already asserts this. What remains is purely removing the now-unused `getGroupThemes`/`getGroupReleaseMedia` fetches and their derived flags from `projectPageData.ts` and `PublicFansubProjectPageData`.

`fansub_repository.go` is already 2462 lines — any new resolver method **must** go into a new file (the project's own convention for this exact situation is `group_repository_cursor.go`, split out of `group_repository.go` for the same reason). A resolver is fachlich in the neighborhood CONTEXT.md names, but must not physically land inside the already-oversized file.

**Primary recommendation:** Build one narrow SQL-backed resolver (new file, extends the `fansub-slugs/:slug/public-profile` neighborhood per CONTEXT.md's explicit preference) that returns `{groupID, animeID, animeSlug, canonicalProjectPath, previous?, next?}` from `groupSlug + animeSlug` in 1–2 queries; wire the offset `per_page:100` release call out in favor of the already-existing cursor endpoint plus one new lightweight count query (or `group.stats.episode_count` reuse, pending the Open Question below); delete the two dead theme/media fetches and their flags; add a constant-query-budget test for the resolver and the contributor path following the exact `queryCounter` + `openPhase152Postgres`-style scaffold already in this package.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `groupSlug + animeSlug` → IDs (Project Resolver) | API / Backend | Frontend Server (SSR loader consumes it) | Resolution must be one bounded SQL round-trip; today it is done client-side-in-SSR by scanning a whole profile payload — that scan logic belongs in SQL/repository, not in the Next.js loader |
| Contributor Summary | API / Backend | — | Already a repository-owned projection (`GroupContributorsRepository`); no frontend aggregation needed |
| Member drill-down link targets | Frontend Server (SSR) | Browser | Pure link-building logic (`ProjectMemberRows.tsx`, `buildFansubReleaseHref`); no new backend endpoint needed, but depends on the resolver reliably supplying `canonicalProjectPath` |
| Latest Release Preview / Release History / Counts | API / Backend | Frontend Server (composition) | Existing cursor endpoint (`/release-list`) already server-owns the bounded query; frontend composition just needs to stop calling the offset endpoint |
| Non-rendered Theme/Media fetches | Frontend Server (SSR loader) | — | Pure removal of dead fetch calls; backend endpoints (`/themes`, `/release-media`) stay as-is for other consumers (fansub group page still uses local variables of the same name, unrelated) |
| Query-budget/measurement audit | CDN / Static (Playwright/CDP tooling), Database / Storage (query counters) | — | Reuses existing generic Playwright harness (`audit-public-member-performance.mjs`, route-parameterized) and the existing Go `queryCounter` test-support type |

## User Constraints (from CONTEXT.md)

<user_constraints>

### Locked Decisions

- **Workstream A — Project Resolver:** Belegter Ist-Zustand: the project page's own outer `page.tsx` calls `getPublicFansubProfileBySlug(fansubSlug)` to find `animeID`, then `loadPublicFansubProjectPageData()` starts a **second** full-profile fetch via `profilePromise` for `canonicalProjectPath`/navigation. A targeted resolver must deliver at minimum `groupID`, `animeID`, project identity, and canonical slugs/path from `groupSlug + animeSlug`. Previous/Next project may be included only if they fall out of the same query without meaningful extra cost — otherwise split. Prefer extending the existing `GET /api/v1/fansub-slugs/:slug/public-profile` neighborhood over a parallel structure. Not acceptable: full profile just for ID resolution, full group profile as resolver, duplicate fetch of the same profile projection. Backend changes must keep Go-DTO, `shared/contracts/openapi.yaml`, `frontend/src/types/`, and `frontend/src/lib/api.ts` in parity.
- **Workstream B — Contributor Summary:** `getGroupContributors(animeID, groupID)` already returns a lean projection per `frontend/src/types/groupContributors.ts` (`member_id`, `member_display_name`, `member_slug`, `member_avatar_url`, `role_labels`, `is_verified`). Whether it is already lean must be checked on the SQL side (joins, N+1, role resolution). A negative finding is an acceptable outcome — measure and document instead of introducing a new `ProjectContributorSummary` struct just because the request narrative names one as an example. Binding rule: no member texts/notes, no media gallery, no media assets, no full release-participation list, no contribution history, no global member history/memberships, no profile badges, no stories, no full Public Member Profile — neither today nor as a result of this phase. No request fan-out per member; the contributor block may grow only in **payload**, never in **request count**.
- **Workstream C — Drill-down Navigation:** `ProjectMemberRows.tsx` builds `${projectPath}/mitwirkende/${member_slug}` and falls back to `/members/[slug]` **only** when `canonicalProjectPath` is absent (commented "D-03"). Since `canonicalProjectPath` today comes from the duplicate profile load, Workstream A must keep delivering it reliably — otherwise linking silently falls back to the global profile. Also check: contributor mentions in the Latest-Release block (`PublicReleaseBlock`/`LatestReleaseSection`), release rows/cards (`OlderReleasesList`), and all other member mentions in the project context. The global profile `/members/[slug]` stays reachable as **secondary** navigation on the Project-Member page, not as the primary click target from the project. A test secures the rule ("member click leads to the Project-Member route, not to `/members/`").
- **Workstream D — Release Data Paths:** Belegter Ist-Zustand in `projectPageData.ts`: `getGroupReleases(animeID, groupID, { per_page: 100 })` (including a second attempt in the `catch`), plus `getGroupReleaseListCursor(..., { limit: 1 })` for the newest release, then `getGroupReleaseDetail(...)` for its details, and client-side `OlderReleasesList` loads the history again via cursor. Belegter Konsum of the 100-item list: `ReleasesSection` uses `episodes` only as an `episodes.length === 0` gate; `HeroSection` uses `releaseEpisodes.length` as `releaseCount` and passes the list on to the episode-count display (`groupAssetsResponse.data.episodes` + `releaseEpisodes`). Actual need is therefore **count + episode mapping**, not the full list — this must be established and evidenced before the rebuild. Target shape: **Latest Release Preview** (targeted projection), **Release History** (cursor-based, bounded), **Counts/Aggregate** (count/query metadata instead of a full list). Different projections (`LatestReleasePreview`, `ReleaseHistoryItem`) are allowed and desired; no universal DTO. `per_page: 100` is removed **or** — if a visible consumer genuinely needs the full list — justified in the final report and made bounded. Request/query behavior must not grow proportionally to the total number of releases.
- **Workstream E — Non-rendered Data:** Belegter Ist-Zustand: `loadPublicFansubProjectPageData()` loads `getGroupThemes()` and `getGroupReleaseMedia()` and computes `hasThemes`/`hasMedia`/`hasTeamContent`/`storyAvailable`. `ProjectPage.tsx` renders neither `ThemesSection` nor `MediaSection` and does not consume `hasThemes`, `hasMedia`, or `hasTeamContent`; a repo-wide search finds only unrelated surfaces (`admin/fansubs/[id]/edit/ReleaseRowDetails.tsx`, `fansubs/[slug]/page.tsx`) with their own, same-named local variables as consumers. Rule: "No render consumer → no initial fetch." Removed fields also disappear from `PublicFansubProjectPageData` so no dead contract remains. `ThemesSection.tsx`/`MediaSection.tsx` stay untouched as components as long as they are not rendered; their continued existence is recorded in the report as a deliberate decision (no silent component deletion in a read-model phase).
- **Workstream F — Measurement, Tests, Boundaries:** Before/after measurement is mandatory and lands as a new audit document under `docs/audits/` (pattern: `docs/audits/2026-09-09-public-member-performance/`). Existing measurement scripts under `frontend/scripts/` must be checked and reused where they fit, instead of writing new parallel scripts; a project-specific script is allowed if none fits. Must be documented: backend requests on initial project load, repository/DB queries, public-profile requests, contributor requests, release requests, initial JSON size, TTFB (if reproducible), behavior with many contributors and many releases. **Contributor load test** with 30–50 contributors (many participations, several notes, many media uploads): the project page must not start loading member detail data as a result. **Backend tests:** resolver, slug resolution, not-found semantics, contributor summary (no detail data in the contract), release summary/cursor, bounded-query test where sensible. Go tests run in the `golang:1.25-alpine` container on the `team4s_default` network. **Frontend tests:** project page rendering, contributor list, member click target, latest release preview, release history, empty states, previous/next navigation. Existing project-member tests must keep passing. `vitest`/`tsc`/`eslint` run in the frontend container. **Security/Visibility:** resolver and summary deliver only public information; no internal roles/permissions, no hidden member data, no private texts/media, existing visibility filters are not bypassed, clean not-found behavior. **Schema discipline:** no new table, no materialization only for convenient UI queries. Indexes only with query-plan evidence, not blind. If a migration is genuinely needed: new, reversibly numbered, following the existing append-only model.

### Claude's Discretion

- Whether Previous/Next project resolution is folded into the same resolver query or split into a separate call, as long as it stays within "no meaningful extra cost."
- The exact shape/name of any new projection types (`LatestReleasePreview`, `ReleaseHistoryItem`, or reuse of `EpisodeReleaseSummary`), as long as no universal DTO and no forbidden fields appear.
- Whether the resolver lands as new methods on `FansubRepository` (new file, given the 2462-line existing file) or as a new dedicated repository type in the same package — CONTEXT.md only fixes the *handler/route neighborhood* (`fansub-slugs/:slug/public-profile`), not the Go file layout.
- Whether to reuse `group.stats.episode_count` for the "Releases" stat or introduce a new dedicated count query — see Open Questions; this is a genuine semantic decision, not purely technical discretion, and should be surfaced to the user if the planner picks a path that changes the displayed number.

### Deferred Ideas (OUT OF SCOPE)

- Full investigation of the Release-Detail page (`/releases/[releaseVersionId]`) — separate later phase, only functional preservation here.
- `/media` route without Range header (known backlog item from Phase 154, breaks seeking in videos) — not part of this phase.
- Removing or reactivating `ThemesSection`/`MediaSection` as a product feature.
- RCA-04 from Phase 154 (unreproduced Chrome tab crash) stays open.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| P155-01 | `groupSlug + animeSlug` resolved via a targeted resolver to `groupID`, `animeID`, project identity, canonical path; no full profile, no group profile as resolver | Confirmed exact waste: `listPublicFansubProjects` SQL (fansub_repository.go:432-512) does a per-group lateral-join query over ALL projects with banner resolution, just to find one project's `id`/`anime_slug`. `anime_fansub_groups` PK `(anime_id, fansub_group_id)` + `uq_anime_slug`/`idx_anime_slug` already give O(1) lookup path for a narrow resolver query. New file required (`fansub_repository.go` is 2462 lines) |
| P155-02 | No duplicate Public-Fansub-Profile-Load in the normal project request; Previous/Next only without meaningful extra cost | Confirmed: outer `page.tsx` (1 load) + `loadPublicFansubProjectPageData`'s `profilePromise` (1 load) = 2 full profile loads per project-page request today, PLUS the same pattern independently exists in the Project-Member route and the Release-Detail route (1 load each) — see Open Questions for scope |
| P155-03 | Contributor projection contains only visible overview fields; no member texts, media, participation lists, histories, badges, or full profiles | Confirmed at contract level (`GroupContributorsResponse`/`GroupTeamMember`/`GroupExternalContributor` in `frontend/src/types/groupContributors.ts`) and SQL level (`group_contributors_repository.go`) — already compliant, no forbidden fields present |
| P155-04 | No request fan-out per member; load test with 30–50 contributors proves no detail data is loaded afterward | Confirmed SQL is 2 fixed queries regardless of member count (external query + team query, both single `GROUP BY` aggregations, no per-row loop). Dev DB has 0 real contributors of this kind at any scale — synthetic seeding is mandatory for the load test, cannot be measured against existing data |
| P155-05 | Every member click in the project context leads canonically to `/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]`, not to `/members/[slug]` | `ProjectMemberRows.tsx` already implements this correctly *when* `canonicalProjectPath` is non-null; the risk is entirely in Workstream A supplying that path reliably. Also must check `PublicReleaseBlock`/`LatestReleaseSection`/`OlderReleasesList.rows.tsx` for other member mentions |
| P155-06 | Project-Member page stays unchanged and loads texts/media/participations itself; global profile stays reachable as secondary nav | Confirmed: `ProjectMemberPublicHandler`/`ProjectMemberPublicRepository` (backend/internal/handlers/project_member_public_handler.go, backend/internal/repository/project_member_public_repository.go) already implement exactly this separation with cursor-paginated Notes/Media/Releases sub-routes. `ProjectMemberPage.tsx` already links `/members/[slug]` as secondary ("Vollständiges Memberprofil") |
| P155-07 | Latest Release Preview and Release History are separate, each bounded, without duplicate fetching of the same data | `GetGroupReleasesCursor` (`group_repository_cursor.go`) already returns everything both need (episode_number, images/notes/contributors counts, timeline segments) via seek pagination; no new backend endpoint needed, only frontend composition change |
| P155-08 | Counts/flags come from count/query metadata, not `per_page:100`; removed or justified-and-bounded | `GetGroupReleases`(offset) already computes a `COUNT(DISTINCT rev.id)` query internally (group_repository.go:165-178) that could be exposed standalone; `GroupDetail.Stats.EpisodeCount` (group_repository.go:120-129) is an already-loaded near-equivalent — see Open Questions on exact semantic match |
| P155-09 | Separate projections for Latest Preview and History allowed; no universal DTO from convenience | `EpisodeReleaseSummary` is already reused across three different call sites with different populated-field subsets (documented via code comments "nur vom Cursor-Endpunkt populiert") — this existing overloading is itself worth flagging as a mild anti-pattern to not deepen |
| P155-10 | No initial fetches without a visible consumer (themes, release-media, dead flags); removed fields also vanish from the loader contract | Confirmed both fetches (`getGroupThemes`, `getGroupReleaseMedia`) run every request and their derived flags (`hasThemes`, `hasMedia`, `hasTeamContent`) have zero consumers in `ProjectPage.tsx`. Render-layer already tested via existing `page.test.tsx` describe block "ProjectPage removed section surfaces (102-06)" |
| P155-11 | Release drill-down and existing information architecture incl. "Neuestes Fansub-Release" block fully preserved; no redesign | `ReleasesSection.tsx` renders `PublicReleaseBlock` (latest) + `OlderReleasesList` (history) + CTA link; this structure is untouched by the proposed data-path changes, only the data source changes |
| P155-12 | No new table, no materialization, no data duplication; indexes only with query-plan evidence | Live `\d` inspection shows extensive existing index coverage already covering every join path Workstreams A–D touch (see Common Pitfalls / index findings below); no schema gap found |
| P155-13 | Resolver and Summary deliver only public data; existing visibility filters unchanged; edge/not-found cases evidenced | Existing `ProjectMemberPublicHandler.resolve()` (project_member_public_handler.go:68-94) is the established not-found/visibility pattern to mirror for the new resolver |
| P155-14 | Before/after measurement of requests, queries, payload, TTFB as its own audit document | `frontend/scripts/audit-public-member-performance.mjs` is already fully route-parameterized (`AUDIT_ROUTES` env var) and reusable without modification for the project page route |
| P155-15 | Backend/frontend tests green, contract parity Go-DTO ↔ OpenAPI ↔ TS ↔ `api.ts`, clean working tree | `fansub_public_profile_query_budget_test.go` + `query_counter.go` provide a ready-made, real-Postgres, opt-in-DSN constant-query-budget test scaffold to extend directly |

</phase_requirements>

## Standard Stack

No new external packages are required for this phase — see `## Package Legitimacy Audit` below. The phase works entirely within the existing stack already documented in `CLAUDE.md`:

| Layer | Existing tool | Role in this phase |
|-------|---------------|---------------------|
| Backend | Go 1.25, Gin, `pgx/v5` | New resolver method(s) + trimmed release/count queries |
| Frontend | Next.js 16 App Router, React 18.3.1, TypeScript, Vitest 3 | Loader (`projectPageData.ts`) split, link-target fixes, tests |
| Contracts | `shared/contracts/openapi.yaml` | New/changed schema for the resolver response and any new count/summary DTO |
| Test infra | `golang:1.25-alpine` container on `team4s_default` network; frontend container (`team4sv30-frontend`) for `vitest`/`tsc`/`eslint` | Unchanged, reuse exact invocation patterns from Phase 154 plans |
| Measurement | Playwright + CDP (`frontend/scripts/audit-public-member-performance.mjs`) | Reusable as-is with a new `AUDIT_ROUTES` value pointing at the project page |

## Package Legitimacy Audit

Not applicable. This phase installs no new external packages, npm dependencies, or Go modules — it is exclusively a refactor of existing repository/handler/loader code using the currently-vendored `pgx/v5`, `gin-gonic/gin`, `next`, and `react` already present in `go.mod`/`package.json`. No `slopcheck`/registry verification step is required.

## Architecture Patterns

### System Architecture Diagram (target state after Phase 155)

```
Browser
  │  GET /fansubs/[slug]/fansubprojekt/[animeSlug]
  ▼
Next.js Server (pretty route page.tsx)
  │
  ├─▶ [NEW] resolveProjectContext(groupSlug, animeSlug)  ──▶  Go: GroupPublicHandler / new resolver handler
  │        returns {groupID, animeID, animeSlug, canonicalProjectPath, previous?, next?}
  │        (1 SQL query on anime+anime_fansub_groups+fansub_groups, narrow SELECT)
  │
  ▼
loadPublicFansubProjectPageData({animeID, groupID})   [existing loader, split ≤450 lines]
  │
  ├─▶ getGroupDetail(animeID, groupID)         ──▶ GroupRepository.GetGroupDetail (unchanged)
  ├─▶ getGroupAssets(animeID, groupID)         ──▶ unchanged
  ├─▶ getGroupContributors(animeID, groupID)   ──▶ GroupContributorsRepository (unchanged SQL, already bounded)
  ├─▶ [CHANGED] getGroupReleaseListCursor(limit=1, sort=release_date)  ──▶ Latest Release Preview
  ├─▶ [CHANGED] getGroupReleaseListCursor(limit=N)                    ──▶ Release History first page (already used client-side by OlderReleasesList; SSR no longer needs a separate per_page:100 call)
  ├─▶ [NEW/reused] release count / group.stats.episode_count           ──▶ replaces episodes.length gate + ProjectStats "Releases" metric
  ├─▶ getGroupProjectNote(animeID, groupID)    ──▶ unchanged
  └─▶ [REMOVED] getGroupThemes / getGroupReleaseMedia / hasThemes / hasMedia / hasTeamContent
  │
  ▼
ProjectPage.tsx (rendering — UNCHANGED structure: Hero → Story → Team → Releases → Backlinks)
  │
  └─▶ ProjectMemberRows / OlderReleasesList / PublicReleaseBlock
         → all member links use canonicalProjectPath from the resolver (Workstream C)
```

### Recommended Project Structure (delta only)

```
backend/internal/repository/
├── fansub_repository.go                       # UNCHANGED size — do not add resolver here (2462 lines already)
├── fansub_project_resolver_repository.go       # [NEW] narrow groupSlug+animeSlug → IDs/path/prev/next
├── group_contributors_repository.go            # UNCHANGED (already lean) — only add/extend query-budget test
├── group_repository.go                         # possible small change: expose a count-only helper, or none if reusing Stats.EpisodeCount
├── group_repository_cursor.go                  # UNCHANGED (already the correct bounded shape)
├── fansub_public_profile_query_budget_test.go  # PATTERN to copy for the new resolver's constant-query-budget test

frontend/src/app/anime/[id]/group/[groupId]/
├── projectPageData.ts                          # 487 lines today — split required (see below)
├── projectPageData.releases.ts                 # [NEW candidate] latest/history/count composition, extracted
├── projectPageData.hero.ts                     # [NEW candidate, optional] hero/style derivation, extracted
├── ProjectPage.tsx                              # UNCHANGED (no themes/media props to drop except type-level)
```

**Split point for `projectPageData.ts` (487 lines → ≤450 in both resulting files):** The file has three clearly separable concerns already visually grouped by the existing comments: (1) lines 1–108 types/route-param parsing/constants, (2) lines 110–244 release-preview building + canonical-path resolution helpers (`buildPublicReleasePreview`, `resolvePublicFansubProjectCanonicalPath`, `resolveCanonicalProjectPath`), (3) lines 246–487 the `withFallback` helper + the main `loadPublicFansubProjectPageData` orchestration. Removing the two dead fetches (themes/media, ~15 lines) plus removing the `per_page:100` release branch (~20 lines) already shrinks the file materially. If it still exceeds 450 after that, extract group (2) — the release-preview-building functions (`stripHtmlExcerpt`, `formatDuration`, `formatEpisodeLabel`, `parseTimelineTime`, `buildTimelineSegment`, `buildPublicReleasePreview`) — into a new `projectPageData.releasePreview.ts`, since these are pure functions with no dependency on the orchestration function and are the single largest cohesive block (~115 lines).

### Pattern 1: Handler builder pattern for attaching optional repos without touching every call site

**What:** `GroupPublicHandler` uses `WithReleaseDetailRepo(...)` / `WithGroupReleasesRepo(...)` chained after `NewGroupPublicHandler(...)` in `main.go`, instead of widening the constructor signature.
**When to use:** Adding a new repository dependency to an existing public handler without a mass edit of every existing `NewGroupPublicHandler(...)` call site.
**Example:**
```go
// Source: backend/internal/handlers/group_contributors_handler.go:39-53, wired in backend/cmd/server/main.go:297-302
func (h *GroupPublicHandler) WithGroupReleasesRepo(repo *repository.GroupRepository) *GroupPublicHandler {
	h.groupReleasesRepo = repo
	return h
}
// main.go:
groupPublicHandler := handlers.NewGroupPublicHandler(
	groupContributorsRepo, groupThemesRepo, groupReleaseMediaRepo, fansubNotesRepo,
).WithReleaseDetailRepo(releaseDetailPublicRepo).WithGroupReleasesRepo(groupRepo)
```
Use exactly this pattern if the resolver is attached to `GroupPublicHandler` or `FansubHandler` rather than given a brand-new handler type.

### Pattern 2: Not-found / access resolution before detail load

**What:** `ProjectMemberPublicHandler.resolve()` parses IDs, resolves the member/slug, and checks the project relationship **before** calling any detail-loading repo method — with a single shared "neutral unavailable" response for every negative branch (missing group, missing anime, private member, non-owner).
**When to use:** The new resolver's not-found semantics (P155-13 edge cases: unknown groupSlug, unknown animeSlug, group exists but project doesn't) should mirror this exact shape — resolve first, one consistent 404 body, no information leak about *which* part of the lookup failed.
**Example:**
```go
// Source: backend/internal/handlers/project_member_public_handler.go:68-94
func (h *ProjectMemberPublicHandler) resolve(c *gin.Context) (animeID, groupID, memberID int64, ok bool) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil { badRequest(c, "ungültige anime-id"); return 0, 0, 0, false }
	groupID, err = parseGroupID(c.Param("groupId"))
	if err != nil { badRequest(c, "ungültige group-id"); return 0, 0, 0, false }
	// ... access.MemberID resolution, then relation existence check, single unavailable response
}
```

### Pattern 3: Real-Postgres constant-query-budget test (the exact template for P155-15's bounded-query test)

**What:** `queryCounter` (backend/internal/repository/query_counter.go) is a package-shared `pgx.QueryTracer` that counts SQL round-trips issued through a pool. `fansub_public_profile_query_budget_test.go` wires it against a dedicated, DSN-gated Postgres database (`team4s_phase152_test`, enforced by a regex fail-closed guard so it can never accidentally run against `team4s_v2`), seeds a "small" and a "large" row-count case, and asserts the query count is (a) equal between small/large (proving no N+1) and (b) equal to a pinned, documented constant (a hard ceiling, not just non-growing).
**When to use:** Directly for P155-15's "bounded-query test where sensible" requirement — write the equivalent test for the new resolver and, if desired, a regression-locking test for the already-lean contributor path.
**Example:**
```go
// Source: backend/internal/repository/fansub_public_profile_query_budget_test.go:98-143
counter.reset()
smallProfile, err := repo.GetPublicProfileBySlug(context.Background(), smallSlug)
smallCount := counter.count()
// ... seed a "large" case with 6x the rows ...
counter.reset()
largeProfile, err := repo.GetPublicProfileBySlug(context.Background(), largeSlug)
largeCount := counter.count()
require.Equalf(t, smallCount, largeCount, "constant query budget violated: ...")
require.Equalf(t, phase152PublicProfileConstantQueryBudget, largeCount, "...drifted from the enforced constant...")
```
The DSN env var (`TEAM4S_PHASE152_TEST_DSN`) and `phase152DatabasePattern` regex are package-scoped and were designed for reuse — the planner should either add a phase-155-specific env var following the same naming convention, or confirm with the operator whether the phase-152 test DB can be reused (same schema, different seed rows, namespaced IDs like the existing `groupID*1000 + N` convention).

### Anti-Patterns to Avoid

- **Slug-resolution-via-full-profile, repeated per route:** Do not simply copy the new resolver call into the project page and stop there — the identical anti-pattern exists verbatim in the Project-Member and Release-Detail pretty routes. Fixing only the literal file CONTEXT.md names while leaving two structurally identical call sites unfixed reproduces the exact problem being solved, one hop away. Flagged as an Open Question below because CONTEXT.md's explicit scope fence doesn't authorize touching those two routes, and the user must decide.
- **`EpisodeReleaseSummary` used as a universal DTO across three shapes:** The type already carries `/** AO4-11/AO4-12: nur vom Cursor-Endpunkt (getGroupReleaseListCursor) populiert. */` field comments for `images_count`/`notes_count` — i.e., it's already tolerating "populated in some call sites, not others." P155-09 explicitly permits and encourages *separate* `LatestReleasePreview`/`ReleaseHistoryItem` types instead of deepening this one shared type further.
- **Adding the resolver method to `fansub_repository.go`:** File is already 2462 lines, more than 5× the CLAUDE.md 450-line ceiling. The project's own precedent for this exact situation is `group_repository_cursor.go` — a sibling file in the same package, not a method squeezed into the oversized original.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bounded release history pagination | A new cursor/seek implementation for the project page | `GetGroupReleasesCursor` / `/release-list` (already exists, already used by `OlderReleasesList`) | Already handles the exact "numeric episode ASC then specials DESC by release date" ordering and seek-cursor encoding correctly; a second implementation would risk ordering drift |
| Constant-query-budget regression test | A hand-rolled query-count mechanism (e.g., wrapping the repo in a spy) | `queryCounter` (`backend/internal/repository/query_counter.go`), already a `pgx.QueryTracer` wired at pool level | Exists, is package-shared, is already proven against exactly this class of claim (Phase 131, 152) |
| Route-level performance measurement (requests/bytes/TTFB/DOM) | A new project-page-specific Playwright script from scratch | `frontend/scripts/audit-public-member-performance.mjs` with a new `AUDIT_ROUTES` value | Already fully generic over route path; CONTEXT.md explicitly instructs reuse-first |
| Previous/Next project navigation ordering | A naive `ORDER BY title` in new SQL that "seems obviously correct" | Match `buildFansubProjectNavigation`'s existing JS comparator exactly (`localeCompare(title, 'de', {sensitivity:'base'})` then `id`) | See Common Pitfalls — DB default collation will not automatically reproduce JS `localeCompare` 'de'/'base' semantics; a mismatch silently reorders the previous/next you already have a working implementation for |

**Key insight:** Almost every "missing" bounded/lean primitive this phase needs (cursor pagination, count queries, not-found resolution pattern, query-budget test harness) already exists somewhere else in the codebase from Phases 122/131/152. The actual work is mostly *composition and removal*, not net-new infrastructure — which is consistent with CONTEXT.md's repeated instruction to prefer extending existing boundaries over building parallel ones.

## Common Pitfalls

### Pitfall 1: `canonicalProjectPath` silently regresses to `/members/[slug]` if the resolver's error path swallows failures

**What goes wrong:** `ProjectMemberRows.tsx` falls back to `/members/[slug]` whenever `canonicalProjectPath` is `null` — with no visual or functional difference from the correct case (both render a working link). A resolver failure that resolves to `null` instead of throwing/404-ing would silently violate P155-05 without any test noticing unless the test explicitly asserts on the `href` value, not just presence of a link.
**Why it happens:** The current code already has this exact shape (`resolveCanonicalProjectPath` catches all errors and returns `null`), described in-code as an intentional fallback for genuine profile-load failures. A resolver swap must preserve "fails closed to `/members/[slug]`, never to a broken link" while making failure genuinely rare (not routine, as it is today when the profile call is one of four possible failure points).
**How to avoid:** Write the member-link test as an explicit `href` assertion against the canonical project path, and add a resolver-failure test case that confirms the fallback still activates (not a crash) when the resolver genuinely 404s mid-request race.
**Warning signs:** A green test suite where the member-link test only checks `document.querySelector('a')` truthiness rather than its `href`.

### Pitfall 2: Previous/Next ordering mismatch between JS comparator and SQL `ORDER BY`

**What goes wrong:** `buildFansubProjectNavigation` (frontend/src/lib/fansubProjectNavigation.ts:28-32) orders projects by `left.title.localeCompare(right.title, 'de', { sensitivity: 'base' })` then by `id`. If the resolver computes previous/next in SQL with a plain `ORDER BY a.title` using Postgres's default database collation (commonly `en_US.UTF-8` or `C`, not verified as `de`-aware in this session), umlauts/case may sort differently than the existing JS implementation, silently changing which project a user lands on when clicking "previous"/"next" — a regression invisible without a project set that includes titles differing only by accent/case.
**Why it happens:** SQL collation and JS `Intl.Collator`/`localeCompare` are separate, independently-configured sorting systems; matching them exactly requires either doing the comparison in application code (fetch the full ordered ID list once, cheaply, and diff in JS) or explicitly using a `COLLATE "de-x-icu"` (or equivalent) clause verified against Postgres's installed collations.
**How to avoid:** Either (a) keep previous/next resolution in the existing JS comparator by having the resolver return the same bounded project list it needs anyway for canonical-path resolution (cheap: this group has exactly 1 project in the current dev DB, so this cannot be exercised meaningfully without synthetic multi-project seed data), or (b) verify the exact Postgres collation available and match it, and add an explicit test case with accented/case-varying titles.
**Warning signs:** Previous/Next test coverage that only uses ASCII, alphabetically-trivial project titles.

### Pitfall 3: Reusing `group.stats.episode_count` changes the displayed "Releases" number

**What goes wrong:** `GroupRepository.getGroupStats` computes `EpisodeCount` as `COUNT(DISTINCT e.id)` (distinct episodes with at least one release_version from this group). The current `releaseCount` shown in `ProjectStats` is `releaseEpisodes.length`, which is the row count from `GetGroupReleases`'s offset query — one row **per `rev.id` (release_version)**, not deduplicated by episode. If a project has episodes with multiple release versions (e.g., a v2/fix release), these two numbers diverge: `episode_count` undercounts relative to what a user might expect as "how many releases exist."
**Why it happens:** The two code paths were built independently for different original purposes (stats aggregate vs. paginated release list) and happen to look similar but are not the same metric.
**How to avoid:** Before wiring `group.stats.episode_count` into `ProjectStats` as a replacement, check with the operator/user whether "Releases" has ever meant "release versions" vs. "distinct episodes" in practice, or add a dedicated `COUNT(DISTINCT rev.id)` query (which already exists as the offset query's internal count query, ready to expose standalone) if version-level counting must be preserved exactly. This is called out explicitly in Open Questions.
**Warning signs:** A project with any multi-version episode (re-release, timing fix) showing a different release count before/after the phase without anyone having decided that's acceptable.

### Pitfall 4: The numeric legacy route shares the loader and has no `groupSlug`

**What goes wrong:** `frontend/src/app/anime/[id]/group/[groupId]/page.tsx` calls the exact same `loadPublicFansubProjectPageData(ids)` as the pretty route, but reaches it via numeric `id`/`groupId` path params with no slug in the URL at all. A resolver keyed on `groupSlug + animeSlug` cannot be the *only* entry point into the shared loader — the numeric route has neither slug and must keep working via `animeID`/`groupID` directly (which it already has).
**Why it happens:** Two routes intentionally share one loader function (`loadPublicFansubProjectPageData({animeID, groupID})`) that only needs numeric IDs; the *slug-resolution* step is a pre-step that only the pretty route needs, not a loader-internal concern.
**How to avoid:** Keep the resolver entirely outside `loadPublicFansubProjectPageData` (as today's `profilePromise`-based canonical-path resolution already does) — it should only be called from the pretty route's own `page.tsx`, exactly mirroring the existing separation of concerns. Do not fold slug-resolution into the shared loader function signature.
**Warning signs:** A refactor that changes `loadPublicFansubProjectPageData`'s parameters to accept `groupSlug`/`animeSlug` instead of `animeID`/`groupID`, breaking the numeric route.

### Pitfall 5: `withFallback()` degradation semantics must not change

**What goes wrong:** `withFallback()` (`projectPageData.ts:247-253`) silently swallows every error and returns the previous fallback value for each independent Phase-B branch — this is an intentional, existing degrade-independently design (documented in-code: "Fehler keine andere Branch mitreisst"). If Workstream D/E removals are done by just deleting call sites without checking whether the surrounding `Promise.all` array/destructuring still lines up, or if new endpoints are wired without their own `withFallback`, one endpoint's failure could newly propagate and break the whole page instead of just that section.
**Why it happens:** The Phase-B `Promise.all` array (`projectPageData.ts:309-387`) is positional — removing an item requires carefully removing both the promise-producing expression and its destructured name, and any code (`themesData`, `releaseMediaData` etc.) using the removed name downstream.
**How to avoid:** Grep every usage of a removed field (`themesData`, `releaseMediaData`, `hasThemes`, `hasMedia`, `hasTeamContent`) across `projectPageData.ts`, `ProjectPage.tsx`, and `PublicFansubProjectPageData` before removing the fetch, and confirm nothing else silently depended on it (already verified in this session: `hasTeamContent` actually IS used, by nothing currently rendered but is present in the interface — confirm it truly has zero consumers before deleting, since it is a different flag from `hasThemes`/`hasMedia`).
**Warning signs:** TypeScript compiles clean after removal (structural fields can be silently unused in an object literal without a compile error) but a section that used to degrade independently now throws for the whole page.

## Code Examples

### Existing bounded cursor query (the target shape for Latest Preview + History)

```go
// Source: backend/internal/repository/group_repository_cursor.go:33-46 (GetGroupReleasesCursor signature and seek-cursor setup)
func (r *GroupRepository) GetGroupReleasesCursor(
	ctx context.Context,
	animeID int64,
	groupID int64,
	filter models.GroupReleasesFilter,
	cursor string,
	limit int,
) (*GroupReleasesCursorPage, error) {
	limit = clampCursorLimit(limit)
	// ... ORDER BY numeric episode ASC / specials by release_date DESC, seek-cursor WHERE clause
}
```
Already called from the frontend today for "newest release" (`limit: 1, sort: "release_date"`) and from `OlderReleasesList` for history pagination — no new backend surface needed for these two projections.

### Existing lean, already-bounded contributor query (Workstream B's negative finding, verbatim)

```go
// Source: backend/internal/repository/group_contributors_repository.go:116-135 (team query — GROUP BY, not per-member loop)
teamQuery := `
	SELECT DISTINCT ON (m.id)
		m.id AS member_id,
		` + displayCol + ` AS member_display_name,
		CASE WHEN m.profile_visibility = 'public' THEN m.public_slug ELSE NULL END AS member_slug,
		NULLIF(TRIM(member_avatar.file_path), '') AS member_avatar_url,
		COALESCE(ARRAY_AGG(DISTINCT rd.label_de) FILTER (WHERE rd.label_de IS NOT NULL), ARRAY[]::text[]) AS role_labels
	FROM release_member_roles rmr
	JOIN members m ON m.id = rmr.member_id
	LEFT JOIN media_assets member_avatar ON member_avatar.id = m.avatar_media_id
	JOIN contributor_roles cr ON cr.id = rmr.role_id
	JOIN role_definitions rd ON rd.code = cr.name
	JOIN fansub_releases fr ON fr.id = rmr.release_id
	JOIN episodes e ON e.id = fr.episode_id
	JOIN release_versions rv ON rv.release_id = fr.id
	JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
	WHERE e.anime_id = $1 AND rvg.fansub_group_id = $2
	GROUP BY m.id, m.display_name, m.nickname, member_avatar.file_path
	ORDER BY m.id, member_display_name
`
```
This is one query total for all team members, regardless of member count — confirmed via `EXPLAIN` in this session (Seq Scan, cost 4.28, on the current small dataset; structurally there is no per-row round-trip regardless of scale since it is a single `GROUP BY` aggregation, not a loop).

### Existing full-profile "resolver" waste, all three call sites (for the Open Question below)

```typescript
// Source: frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx:20-35 (project page)
profileResponse = await getPublicFansubProfileBySlug(fansubSlug)
const project = profile.projects.find((item) => item.anime_slug?.trim() === animeSlug)
if (!project) return notFound()
const result = await loadPublicFansubProjectPageData({ animeID: project.id, groupID: profile.group.id })
```
```typescript
// Source: frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.tsx:26-40 (project-member page — IDENTICAL pattern)
profileResponse = await getPublicFansubProfileBySlug(fansubSlug)
const project = profile.projects.find((item) => item.anime_slug?.trim() === animeSlug)
if (!project) return notFound()
summary = await getProjectMemberSummary(project.id, profile.group.id, memberSlug)
```
```typescript
// Source: frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]/page.tsx:18-32 (release-detail page — IDENTICAL pattern)
profile = await getPublicFansubProfileBySlug(slug.trim())
const project = profile.data.projects.find((item) => item.anime_slug?.trim() === animeSlug.trim())
if (!project) return notFound()
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Offset pagination (`GetGroupReleases`, `per_page`) for all release listing | Seek/cursor pagination (`GetGroupReleasesCursor`, `/release-list`) additive alongside the old offset endpoint | AO4-03/AO4-24 (pre-existing, not this phase) | The cursor endpoint already exists and is production-used by `OlderReleasesList`; Phase 155 mostly needs to stop using the older offset endpoint on the SSR side, not build the newer one |
| Full public-profile aggregate load for slug resolution | Narrow, purpose-built resolver/summary repositories (established in Phase 122 for the Project-Member page's *detail* data, and in Phase 152 for the group page's own profile load) | Phase 122 (Aug 2026), Phase 152 (public group page) | Phase 155's resolver is the natural continuation of this pattern applied to *ID resolution* specifically, which neither phase tackled |
| Source-string-matching Go tests (`os.ReadFile` + `strings.Contains`) | httptest + fake-repository behavioral tests | CLAUDE.md Teststil rule (current, enforced going forward) | `project_member_public_handler_test.go` already mixes both — the httptest-based tests (`TestProjectMemberNoDetailLoadBeforeAccess` etc.) are the pattern to imitate; `TestProjectMemberHandler_MethodsExist` (source-matching) must NOT be copied into any new Phase 155 test |

**Deprecated/outdated:** None of the endpoints Phase 155 touches are themselves deprecated; the *usage pattern* of calling `getGroupReleases(..., {per_page: 100})` from SSR for a count/mapping purpose is what's being retired, not the endpoint itself (other consumers of that endpoint, if any, are unaffected).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `group.stats.episode_count` is an acceptable substitute for the current `releaseCount` stat shown in `ProjectStats`, despite counting distinct episodes rather than release versions | Common Pitfalls #3, Open Questions | If the operator actually wants version-granular counting, wiring the wrong metric silently changes a publicly visible number without anyone deciding that's acceptable |
| A2 | Postgres's default collation on `team4sv30-db` is not verified to sort identically to JS `localeCompare(title, 'de', {sensitivity:'base'})` for Previous/Next ordering if that logic moves into SQL | Common Pitfalls #2 | Previous/Next navigation could silently reorder for titles with accents/case differences once real multi-project groups exist (today's dev DB has only 1 project, so this can't be observed pre-deployment without synthetic data) |
| A3 | Extending the resolver to also fix the Project-Member and Release-Detail routes' identical full-profile-load pattern is in the spirit of the phase's stated goal ("kein doppelter Profil-Load") even though CONTEXT.md's literal scope fence only names the project page | Open Questions | If out of scope, those two routes keep an un-flagged, functionally-identical performance defect that a future engineer may assume was already addressed by Phase 155 |

**If this table is empty:** N/A — see rows above.

## Open Questions

1. **Should the resolver also replace the identical full-profile-load in the Project-Member and Release-Detail pretty routes?**
   - What we know: All three routes (`fansubprojekt/[animeSlug]/page.tsx`, `.../mitwirkende/[memberSlug]/page.tsx`, `.../releases/[releaseVersionId]/page.tsx`) call `getPublicFansubProfileBySlug(slug)` purely to resolve `animeSlug → {animeID, groupID}` (and, for the project page and release page, `canonicalProjectPath`). This is the exact defect class P155-01/02 target.
   - What's unclear: CONTEXT.md's `155-CONTEXT.md` "Belegter Ist-Zustand" for Workstream A only names the project page's own `page.tsx`; the Scope Fence explicitly forbids "Neubau der Projekt-Member-Seite" and "großer Umbau der Release-Detailseite" — but swapping one resolver call inline, with the rest of the page unchanged, is not a rebuild or a large restructure.
   - Recommendation: Surface this to the user/planner before finalizing the plan. If in scope, it is a low-risk, mechanical, high-value extension (same resolver, same call shape, just three call sites instead of one). If explicitly deferred, document that decision so it isn't silently forgotten as "already fixed."

2. **What exact "Releases" count should `ProjectStats` show after `per_page:100` is removed?**
   - What we know: Today it is `releaseEpisodes.length` from the offset query (one row per `rev.id`/release_version). `group.stats.episode_count` (already free, already loaded) counts distinct episodes instead.
   - What's unclear: Whether the operator considers these interchangeable in practice, given the current dev dataset has no multi-version episodes to observe the divergence.
   - Recommendation: Either confirm with the operator that episode-level counting is acceptable, or expose the offset query's internal `COUNT(DISTINCT rev.id)` as a small standalone count query (cheap, already written, just needs its own handler entry) to preserve exact parity.

3. **Should Previous/Next project resolution live in SQL (resolver) or stay in JS (using a bounded project-list fetch)?**
   - What we know: The existing JS comparator (`localeCompare` with German locale, base sensitivity) is the current, presumably intentional, sort order.
   - What's unclear: Whether Postgres's collation setup on this instance can reproduce that ordering exactly, and whether it's worth verifying/configuring vs. just keeping the JS-side comparison against a narrower project list (id/title/anime_slug only, not the full `PublicFansubProject` with banners).
   - Recommendation: Given the current dev DB has exactly one project per group (no way to test ordering edge cases locally against real multi-project data), prefer keeping the sort in JS against a narrow SQL projection (id, title, anime_slug only) rather than porting comparator logic into SQL, unless a query-plan reason to do otherwise emerges.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Postgres (`team4sv30-db`) | All backend research/verification, query-budget tests | ✓ | 16 | — |
| Go backend container (`golang:1.25-alpine`, `team4s_default` network) | Go build/test/vet commands | ✓ (pattern confirmed from Phase 154 plans) | 1.25 | — |
| Frontend container (`team4sv30-frontend`) | `vitest`/`tsc`/`eslint` | ✓ (running, `docker compose ps` confirmed) | Next.js 16 / Vitest 3 | — |
| Playwright/CDP audit tooling (`frontend/scripts/*.mjs`) | Before/after measurement (F workstream) | ✓ (scripts present, already used in Phase 153/154 audits) | — | — |
| Realistic multi-project / multi-contributor test data | Contributor load test (30–50), Previous/Next edge cases, count-metric divergence check | ✗ — dev DB has exactly 1 fansub group, 1 project, 85 `anime_contributions` rows, 0 `release_member_roles` rows | — | Synthetic data must be seeded as part of the phase's own test/audit work (this is explicitly mandated by P155-04/12 already, not a new requirement) |

**Missing dependencies with no fallback:** None — the one gap (realistic data volume) has an explicit, already-mandated fallback (synthetic seeding), not a blocker.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Backend framework | Go `testing` + `stretchr/testify`, run via `docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend golang:1.25-alpine go test ./...` (pattern from Phase 154 plans) |
| Frontend framework | Vitest 3, run via `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run <path>"` |
| Config file | `frontend/vitest.config.ts` (existing, unchanged) |
| Quick run command (backend) | `docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend golang:1.25-alpine go test ./internal/repository/... -run 'Resolver\|Contributors' -count=1` |
| Quick run command (frontend) | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/anime/[id]/group/[groupId]/page.test.tsx src/components/fansubs/ProjectMemberRows.test.tsx"` |
| Full suite command (backend) | `docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend golang:1.25-alpine go build ./... && go test ./...` |
| Full suite command (frontend) | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit && npx vitest run && npx eslint ."` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| P155-01 | Resolver returns IDs/path from groupSlug+animeSlug, not-found on bad slug | unit (Go, httptest+fake repo pattern per Pattern 2) | `go test ./internal/handlers/... -run 'ProjectResolver' -count=1` | ❌ Wave 0 (new handler/test) |
| P155-02 | Single profile load per project page request | integration/regression (constant-query-budget, Pattern 3) | `go test ./internal/repository/... -run 'ProjectResolverQueryBudget' -count=1` | ❌ Wave 0 |
| P155-03/04 | Contributor summary stays bounded regardless of member count | integration (constant-query-budget, extend existing scaffold) | `go test ./internal/repository/... -run 'GroupContributors.*Budget' -count=1` | ❌ Wave 0 (existing `group_contributors_repository_test.go` has scoping tests but no query-budget test yet) |
| P155-05 | Member click leads to project-member route | unit (frontend, existing pattern) | `npx vitest run src/components/fansubs/ProjectMemberRows.test.tsx` | ✅ (exists today, already asserts exact `href` for both the canonical-path and fallback branches; the other CONTEXT.md-named check-sites render contributors as non-linked avatars today, see Wave 0 Gaps) |
| P155-07/08 | Latest preview + history bounded, no duplicate fetch of same data | unit (frontend loader test) | `npx vitest run src/app/anime/[id]/group/[groupId]/page.test.tsx` | ✅ (existing file, extend) |
| P155-10 | No themes/media fetch, no dead flags in contract | unit (frontend, existing describe block already covers render-layer) | `npx vitest run src/app/anime/[id]/group/[groupId]/page.test.tsx -t "removed section surfaces"` | ✅ (existing, render-layer only — data-layer assertion is the Wave 0 gap) |
| P155-13 | Not-found / visibility edge cases | unit (Go httptest) | `go test ./internal/handlers/... -run 'ProjectResolver.*NotFound' -count=1` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** targeted `go test ./internal/repository/... -run '<NewTestName>'` and/or `npx vitest run <changed file>`
- **Per wave merge:** full backend `go build ./... && go test ./...`, full frontend `npx tsc --noEmit && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`, plus the mandated before/after audit document under `docs/audits/`

### Wave 0 Gaps

- [ ] New resolver handler + repository + their tests (P155-01/02/13) — nothing exists yet
- [ ] Query-budget test for the resolver (Pattern 3 scaffold, needs its own DSN env var or confirmed reuse of `TEAM4S_PHASE152_TEST_DSN`/`team4s_phase152_test`)
- [ ] Query-budget/regression test locking in the already-lean contributor SQL (currently only scoping/behavior tests exist, no explicit "constant regardless of N" test)
- [ ] `ProjectMemberRows.test.tsx` already covers the canonical-path/fallback href rule for the main contributor grid — verified in this session that CONTEXT.md's other named check-sites (`PublicReleaseBlock`'s contributor row, `OlderReleasesList.rows.tsx`'s `DesktopReleaseRow`/`MobileKaraReleaseRow`/`MobileDirectReleaseRow`) currently render contributor names as non-interactive avatar initials with a `title` tooltip, not as links at all — so P155-05 does not apply to them today (nothing to redirect); no new test is needed there unless the planner adds member links to these surfaces as part of this phase (not currently requested)
- [ ] Synthetic data seeding for the 30–50 contributor load test (P155-04) and for realistic multi-project Previous/Next testing (Open Question 3) — dev DB has essentially none of this today

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | All touched routes are already unauthenticated public routes (`/anime/:id/group/:groupId/...`, `/fansub-slugs/:slug/...`); no new auth surface introduced |
| V3 Session Management | No | No session-bearing behavior in this phase |
| V4 Access Control | Yes | The resolver and contributor summary must only ever expose data already gated `is_public_on_anime_page = true` / `profile_visibility = 'public'` / `status <> 'disabled'`, mirroring the exact predicates already used in `GetProjectContributors` and `listPublicFansubProjects` (`a.status <> 'disabled'`) |
| V5 Input Validation | Yes | `groupSlug`/`animeSlug` path params must be validated the same way existing slug params are (`GetFansubPublicProfileBySlug` already rejects empty/>120-char slugs; mirror this for the resolver) |
| V6 Cryptography | No | No cryptographic material touched |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Slug/ID enumeration leaking existence of private/disabled anime or groups via differentiated error responses | Information Disclosure | Reuse the existing single neutral not-found response pattern (`ProjectMemberPublicHandler`'s shared `writePublicMemberUnavailable`-style response) — resolver must not distinguish "group doesn't exist" from "project doesn't exist in this group" in its HTTP response body/status, matching CONTEXT.md's explicit not-found requirement |
| Visibility filter bypass via a new resolver query that forgets an existing predicate (e.g., `a.status <> 'disabled'`, `is_public_on_anime_page = true`) | Elevation of Privilege / Information Disclosure | Copy the exact WHERE-clause predicates from `listPublicFansubProjects` (status filter) and `GetProjectContributors` (public/confirmed/visibility filters) into the new resolver/summary queries rather than re-deriving them independently |
| SQL injection via slug parameters interpolated into query strings | Tampering | All existing slug-taking queries in this codebase use parameterized `$1`/`$2` placeholders (confirmed in `getPublicGroupBase`, `GetProjectContributors`) — the new resolver must follow the same parameterization, never string-interpolate `groupSlug`/`animeSlug` into SQL |

## Sources

### Primary (HIGH confidence — verified by direct code inspection and live query execution against `team4sv30-db` in this session)
- `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts` (full read)
- `frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx`, `page.tsx`, `page.test.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/*.tsx` (HeroSection, ReleasesSection, TeamSection, OlderReleasesList, ProjectStats, BacklinksSection, LatestReleaseSection)
- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx`, `.../mitwirkende/[memberSlug]/page.tsx` (+ `page.test.tsx`), `.../releases/[releaseVersionId]/page.tsx`
- `frontend/src/components/fansubs/ProjectMemberRows.tsx`, `frontend/src/components/groups/GroupAssetsExperience.tsx`
- `frontend/src/lib/api.ts` (getPublicFansubProfileBySlug, getGroupDetail, getGroupReleases, getGroupReleaseListCursor, getGroupReleaseDetail, getGroupContributors, getGroupThemes, getGroupReleaseMedia, getProjectMemberSummary)
- `frontend/src/lib/fansubProjectRoutes.ts`, `frontend/src/lib/fansubProjectNavigation.ts`
- `frontend/src/types/fansub.ts`, `frontend/src/types/group.ts`, `frontend/src/types/groupContributors.ts`
- `backend/cmd/server/main.go` (route registration, handler wiring)
- `backend/internal/repository/fansub_repository.go` (GetPublicProfileBySlug, getPublicGroupBase, listPublicFansubProjects — full read of relevant sections, confirmed 2462 total lines via `wc -l`)
- `backend/internal/repository/group_repository.go`, `group_repository_cursor.go` (full reads)
- `backend/internal/repository/group_contributors_repository.go` (full read)
- `backend/internal/repository/project_member_public_repository.go`, `backend/internal/handlers/project_member_public_handler.go` (+ test file)
- `backend/internal/handlers/group_contributors_handler.go` (full read)
- `backend/internal/repository/query_counter.go`, `fansub_public_profile_query_budget_test.go` (full reads)
- Live `docker exec team4sv30-db psql` inspection: `\d anime_contributions`, `\d release_member_roles`, `\d members`, `\d episodes`, `\d release_versions`, row counts, and `EXPLAIN` on the contributors WHERE clause
- `database/migrations/0009*, 0011*, 0086*, 0091*` and index-listing grep across all migrations
- `.planning/phases/155-fansub-projektseite-read-model-und-query-budget/155-CONTEXT.md`, `155-USER-REQUEST.md`
- `.planning/ROADMAP.md` (Phase 155 section), `.planning/STATE.md` (Phase 154 closure notes), `.planning/config.json`
- `docs/audits/2026-09-09-public-member-performance/REPORT.md`, `frontend/scripts/audit-public-member-performance.mjs`
- `git log`/`git show` on commits `7d9d01d8`..`ed82fdf2` (Phase 122 wave structure, used as the plan-structure precedent)

### Secondary (MEDIUM confidence)
- None — all claims in this document were verified directly against source or live systems rather than inferred from search results (no WebSearch/Context7 lookups were needed; this phase is entirely internal to the existing codebase).

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new stack decisions; entirely reuses existing, already-vetted internal tools.
- Architecture: HIGH — every architectural claim (query counts, file line counts, render consumers, route structures) was verified by reading the actual file or running the actual command in this session.
- Pitfalls: HIGH for Pitfalls 1, 4, 5 (directly observed in code); MEDIUM for Pitfalls 2–3 (correct characterization of the risk, but the dev database's minimal data volume means the actual divergence could not be empirically demonstrated in this session — flagged accordingly in the Assumptions Log).

**Research date:** 2026-09-11
**Valid until:** Effectively pinned to the current commit (`934c0037`) of this fast-moving codebase — re-verify file line counts and query shapes if significant unrelated backend/repository work lands before this phase is planned/executed (30-day estimate as an outer bound, but recommend re-checking `wc -l` on any file this research cites as "currently N lines" immediately before planning tasks that depend on the exact number).
