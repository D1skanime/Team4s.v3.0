# Phase 174: Modularisierung & Wartbarkeits-Refactoring - Research

**Researched:** 2026-10-04
**Domain:** Behavior-preserving refactoring of a brownfield Go + Next.js codebase (god-module splitting, barrel-compatible API modularization, backend repository/handler decomposition, CSS module boundaries)
**Confidence:** HIGH for all measured facts (direct tool output against the live repo at `/home/d1sk/team4s`); MEDIUM for Vitest-barrel-mock interaction (no barrel exists yet to test against); LOW/first-pass for the `api.ts` domain-bucket assignment and for "truly identical semantics" verdicts on copy/paste candidates (both require the Welle-1 plan to do a second, authoritative pass).

## Summary

This research instruments the actual repository rather than estimating. All headline numbers in `174-CONTEXT.md` (file sizes, candidate list) were confirmed and the candidate list was extended with additional measured hotspots the user's spec did not name (`frontend/src/types/admin.ts` at 1169 lines, `frontend/src/types/fansub.ts` at 765 lines, `backend/internal/handlers/admin_content_release_version_media.go` at 1358 lines, `frontend/src/app/dev/ui-system/page.module.css` at 1868 lines, `frontend/src/app/admin/anime/create/page.module.css` at 1773 lines, among others — see Standard Stack / hotspot tables below).

Three findings materially change what the Welle-1 plan must do, beyond simply confirming sizes:

1. **`frontend/src/lib/api.ts` has 371 top-level exports** (317 `async function`, 13 `function`, 11 `const`, 26 `interface`, 3 `type`, 1 `class`), not a vague "many". A first-pass domain bucketing (this research's own heuristic, **not authoritative**) sorts ~330 unique function names into 18 groups; 27 names resisted clean bucketing and need a human/planner decision (`other/unclear` bucket below). The Welle-2 plan must treat this bucketing as a draft, not a final module boundary.
2. **133 frontend test files currently do `vi.mock('@/lib/api', ...)`** — 126 as a full literal-factory replacement (module-path-level mock, unaffected by what's physically behind the path) and 7 using `vi.importActual('@/lib/api')` to partially mock (these load the real module graph through the barrel). Both patterns are expected to keep working after the barrel split under Vitest's default (non-native-runner) module resolution, but this is **not yet empirically verified** because the barrel does not exist yet — Welle 2 must add a canary test early and run the full suite, not assume.
3. **A backend test on the #1 hotspot file is currently failing on `main`, independent of this phase**: `TestFansubRepository_PublicProfileSourceInvariants` in `fansub_repository_test.go` fails today (`FROM anime_media am` substring not found) and is itself an instance of the `os.ReadFile` + `strings.Contains` self-inspection anti-pattern CLAUDE.md's Teststil section forbids for new work. Splitting `fansub_repository.go` across files (D-15) will relocate SQL string literals and will interact with this and 110 other test files repo-wide that use the same `os.ReadFile` pattern (not all are the self-inspection anti-pattern — some read fixtures/migrations, which CLAUDE.md explicitly exempts). This must be called out explicitly in `174-HOTSPOTS.md` and handled via D-03's "import-path adjustment" exception, documented per-case in SUMMARYs.

**Primary recommendation:** Treat this research's api.ts domain bucketing and backend query-pattern baseline as Welle-1 inputs, not final answers — the planner's Welle-1 task must re-verify and lock P1/P2/P3 before Welle 2-5 tasks are written. Do not start Welle 2 (api.ts split) without first adding at least one canary Vitest test that imports from `@/lib/api` under a real (non-mocked) barrel, to empirically confirm D-10's compatibility assumption before committing to the full split.

<phase_requirements>
## Phase Requirements

No REQ-IDs are mapped to Phase 174 in `.planning/REQUIREMENTS.md` (confirmed: no "174" references found in that file). Per the orchestrator's framing, `174-CONTEXT.md` decisions D-01 through D-24 are the authoritative acceptance surface — the plan-checker and gap-analysis hold plans against those decisions instead of REQ-IDs. This research is organized to support that: every Welle (1-6) in `174-CONTEXT.md` has a corresponding section below with real measurements.
</phase_requirements>

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01 through D-24 — verbatim summary, full text in `174-CONTEXT.md`)

**Grundprinzip**
- D-01: Behavior-preserving. API routes, JSON contracts, query params, HTTP status codes, DB schema, permissions/effective rights, UI texts/order, user flows, feature flags, session behavior, pagination behavior all stay unchanged. Exception only for a clearly proven bug, documented separately.
- D-02: Split only for objective gains in understandability/testability/changeability. "File gets smaller" is not sufficient justification. No artificial fragmentation, no new abstraction layers without concrete benefit, KISS + existing Team4s conventions.
- D-03: Existing tests must NOT be adjusted just to make a refactor pass. Exception: pure import-path adjustments when a test imports internal module paths — these must be individually justified in the SUMMARY.
- D-04: Non-goals: new design system, frontend/repository re-architecture, microservices, DDD, CQRS, new state-management library, fetch-library swap, ORM, routing library, new test frameworks, CSS framework, full TS type architecture rewrite, new permission architecture.

**Welle 1 — Analysis (no refactoring)**
- D-05: Full hotspot analysis BEFORE any refactoring, as its own artifact (`174-HOTSPOTS.md`): largest TS/TSX/Go/CSS files, large functions/components/hooks/repositories, files with many exports, files with many responsibilities, strong import/dependency nodes, copy/paste structures, parallel implementations of the same domain logic.
- D-06: Per candidate, evaluate: (1) is size actually a problem? (2) multiple responsibilities? (3) coupling? (4) functional risk? (5) existing module boundaries? (6) safety-net tests? Prioritize P1 (high gain/low risk), P2 (sensible, larger dependencies), P3 (deliberately leave alone). Baseline measurement (file sizes, exports/module, largest functions, cycles) recorded as baseline.
- D-07: Copy/paste check specifically for: Permission Checks, Rights Resolution, Anime/Release/Media/Fansub-Group-Mapping, API Error Handling, Pagination, Sorting, Date Formatting, Status Mapping, User/Member Representation. Merge only on truly identical semantics — "looks similar" is not enough.

**Welle 2 — `frontend/src/lib/api.ts` (highest priority)**
- D-08: Split into domain modules under `frontend/src/lib/api/` (target shape client/auth/anime/episodes/fansubs/members/contributions/media/releases/reviews/permissions/projects/history + `admin/...`). Target shape is orientation only — derive real boundaries from actual exports.
- D-09: Shared infrastructure (API client, fetch wrapper, auth header, error handling, query helpers, server/browser base-URL logic, shared request/response types) exactly once, centrally, never duplicated.
- D-10: Public import surface `@/lib/api` stays compatible (barrel `export * from "./api/..."`) so callers aren't mass-edited. If the barrel creates cycles: document and migrate selectively. First check how Next.js/Vitest mocks (`vi.mock("@/lib/api")`) interact with the barrel — existing test mocks must keep working with no content changes.
- D-11: API modules stay independent of UI (no imports from components/hooks/app). No new cycles api ↔ types ↔ hooks ↔ components ↔ utils.
- D-12: Small commits per domain group (e.g. `refactor(api): split anime and episode API modules`), typecheck + vitest + lint after every step.

**Welle 3 — Frontend hotspots (P1 only)**
- D-13: Controllers/hooks (e.g. `useAdminAnimeCreateController.ts`) split only along genuinely separable responsibilities (form state, API interaction, validation, episodes, media, mapping, submit). Pure functions (mapping/validation) extracted first — isolated and testable.
- D-14: Large TSX components (e.g. `GroupMediaReviewSection.tsx`, `admin/fansubs/create/page.tsx`) split only into domain-coherent units (list/item/actions/dialog/hook); the component stays a recognizable domain unit. Global UI primitives (`@/components/ui`) and design tokens reused unchanged; no new UI markup. No change to render/re-render behavior, lazy loading, or bundle behavior (no new `"use client"` boundaries where Server Components exist today).

**Welle 4 — Backend hotspots (only clearly separable areas)**
- D-15: Repositories (e.g. `fansub_repository.go`) split only along cleanly separable domains into multiple files of the *same package* (Groups/Aliases/Links/Members/History/Merge/Search, if really separable that way). Same types, constructors, method signatures, interfaces — services/handlers work unchanged. No new repository abstraction.
- D-16: Handlers (e.g. `admin_content_anime_themes.go`, `anime_assets.go`): distinguish HTTP parsing/validation/mapping/business-logic/persistence/response. Business logic moves to a service only if it genuinely belongs there and a matching service pattern already exists; no artificial service layer for trivial request handling.
- D-17: N+1/query-in-loop control: no refactor may increase query count. Especially: Release Crew, Contributions, Media, Member Profile Projects, Anime Assets, Themes, Episodes, Imports. Existing query budgets and batch mechanisms preserved. Found N+1s: document + reproducible proof; low-risk fix in 174, otherwise flag for a follow-up phase.

**Welle 5 — CSS**
- D-18: Large CSS modules (`FansubEdit.module.css`, `ui.module.css`) split only where the JSX already has logically separated components/features (e.g. Layout/Form/Members/Media/History). No "4500 lines -> 40 files". Reuse global tokens/variables, never duplicate. Visual equality must be demonstrated (same class rules, same cascade order; watch for specificity/order changes from module splitting).

**Tests, Quality, Performance**
- D-19: Before every refactor wave, identify relevant tests. After every step: Go tests (affected packages), frontend Vitest, TypeScript check, lint, build. No giant test-at-the-end block. Known pre-existing failures (e.g. missing PHASE128-DSN) recorded as baseline, not scored as new regressions.
- D-20: Insufficiently secured areas get Characterization Tests BEFORE refactoring (capture current behavior -> refactor -> stays identically green). Focus: API-Mapping, Rights, Media, Releases, Contributions, Admin Anime, Fansub Edit.
- D-21: Before/after performance for critical refactors: SQL query count, API calls, render behavior, bundle impact, unnecessary re-renders, lazy loading. "Code prettier, app slower" is not acceptable.

**Git / Working Tree**
- D-22: On `main` (no worktrees/branches, `use_worktrees=false`). Check working tree and parallel runs before start and before every commit; don't touch foreign changes (e.g. currently `.planning/sketches/`), never `git add .`/`-A`, never `git stash`, only stage own paths. Commits logical per refactor wave/domain, no giant commits.

**Abschluss**
- D-23: Welle 6 closing audit: re-measure (largest files, largest functions, exports/module, tests, build, query counts, dependency cycles) and compare before/after. Closing report `174-REPORT.md` with: analyzed hotspots, refactored areas, deliberately-not-refactored areas (with justification), old/new file sizes, new module structure, tests, performance, query counts, open technical debt, recommendations for follow-up phases.
- D-24: New/changed production files honor the 450-line rule where splitting is domain-justified; where a file deliberately stays larger, justify in the report (no silent new exceptions).

### Claude's Discretion
- Concrete module boundaries, file names, and ordering within the waves — derived from the Welle-1 analysis.
- Which candidates become P1/P2/P3 (P2/P3 are not implemented in this phase, only documented).
- Tooling for cycle/size measurement (e.g. madge/own scripts), as long as no new runtime dependencies enter the product.

### Deferred Ideas (OUT OF SCOPE)
- All P2/P3 candidates from the hotspot analysis -> recommended as follow-up phases in the report.
- Larger N+1 restructurings with domain-level impact -> own follow-up phase.
</user_constraints>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `frontend/src/lib/api.ts` split | Frontend Server (SSR) / Browser — shared module | — | `api.ts` is imported by both Server Components and Client Components (base-URL branching per D-09); it is infrastructure, not UI, and D-11 explicitly forbids it depending on UI tiers |
| Frontend hotspot components/hooks (`useAdminAnimeCreateController`, `GroupMediaReviewSection`, fansub create page) | Browser / Client (all are `"use client"` today — verify per-file, D-14 forbids adding new client boundaries) | API / Backend (consumes `@/lib/api`) | These are admin-workflow UI; splitting must not cross into new server/client boundaries |
| Backend repository split (`fansub_repository.go`, `admin_content_anime_themes.go`, `anime_assets.go`) | API / Backend | Database / Storage (SQL stays identical) | Repository layer owns SQL access; D-15 keeps it in the same package, same tier |
| Backend handler split (`admin_content_release_version_media.go`, theme/segment handlers) | API / Backend | — | HTTP parsing/validation/mapping/response — stays in handler tier; business logic only promoted to Service tier where a matching service pattern already exists (D-16) |
| N+1/query-budget control (Release Crew, Contributions, Media, Member Profile Projects, Anime Assets, Themes, Episodes, Imports) | Database / Storage (query shape) | API / Backend (call sites) | Query count is a DB-tier concern but enforced at the repository call-site; D-17's "ANY($1) batch" idiom is the existing mitigation pattern (see Common Pitfalls) |
| CSS module splitting (`FansubEdit.module.css`, `ui.module.css`) | Browser / Client (CSS Modules scoped per component) | CDN / Static (bundled assets) | Splitting must track existing JSX component boundaries (verified below) and preserve cascade order, a client-rendering concern |

## Standard Stack

### Core (measurement/analysis tooling for Welle 1 — not new product dependencies)

| Tool | Version (verified) | Purpose | Why Standard |
|------|------|---------|--------------|
| `madge` | 8.0.0 (confirmed via `npx --yes madge --version`) | Circular dependency detection for TS/TSX | Zero-install via `npx`; CONTEXT.md's Claude's-Discretion clause explicitly allows this as long as it is not added to `package.json` (dev-only, not a runtime dependency) [VERIFIED: npx madge --version ran successfully against this repo] |
| `wc -l` / `grep` / `find` | coreutils (system) | File size ranking, export counting, pattern scanning | Already available, no install needed |
| Go compiler | go1.25.13 (confirmed via `go version` inside `team4sv30-backend` container) | Compile-time cycle enforcement — Go **cannot** have import cycles; the compiler rejects them. No cycle-detection tool is needed for the backend. [VERIFIED] | |
| Vitest | 3.2.4 (confirmed via a live `vitest run` inside the frontend container) | Existing frontend test runner | [VERIFIED] |

**No new runtime dependencies are needed or recommended for this phase** — this matches D-02/D-04's constraint against new tooling/abstractions in the product itself.

**Installation:** None required. `npx --yes madge` resolves and runs without modifying `frontend/package.json` or `package-lock.json` (confirmed: command ran clean in `/home/d1sk/team4s/frontend`).

## Package Legitimacy Audit

Not applicable — this phase installs no new packages into the product. The only external tool touched (`madge`) is invoked ad hoc via `npx` for analysis only and is explicitly permitted by CONTEXT.md's Claude's-Discretion clause as long as it never enters `package.json`. `slopcheck` is not required because no packages are being installed.

## Measured Hotspots (Welle 1 baseline — D-05/D-06 inputs)

### Frontend TS/TSX files >400 lines (production only, tests excluded)

Command: `find frontend/src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -name "*.test.*" | xargs wc -l | sort -rn` — 678 total production TS/TSX files, 121,435 total lines. [VERIFIED]

| File | Lines | In CONTEXT.md? |
|------|-------|-----------------|
| `frontend/src/lib/api.ts` | 11,508 | Yes (named ~11,500) |
| `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts` | 1,505 | Yes (named ~1,500) |
| `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx` | 1,415 | Yes (named ~1,400) |
| `frontend/src/app/admin/fansubs/create/page.tsx` | 1,172 | Yes (named ~1,100+) |
| `frontend/src/types/admin.ts` | 1,169 | **No — new candidate** |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx` | 966 | **No — new candidate** |
| `frontend/src/app/admin/fansubs/merge/page.tsx` | 965 | **No — new candidate** |
| `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx` | 846 | **No — new candidate** |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx` | 826 | **No — new candidate** |
| `frontend/src/app/admin/fansubs/page.tsx` | 816 | **No — new candidate** |
| `frontend/src/app/me/profile/page.tsx` | 783 | **No — new candidate** |
| `frontend/src/types/fansub.ts` | 765 | **No — new candidate** |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.tsx` | 743 | **No — new candidate** |
| 25 more files between 440-700 lines | — | See raw scan; full list available on request — not reproduced here for brevity |

33 production TS/TSX files exceed the CLAUDE.md 450-line rule today. [VERIFIED]

### Backend Go files >400 lines (production only, `_test.go` excluded)

Command against `backend/internal` (521 total production `.go` files, 113,621 total lines). [VERIFIED]

| File | Lines | In CONTEXT.md? |
|------|-------|-----------------|
| `backend/internal/repository/fansub_repository.go` | 2,657 | Yes (named ~2,600+) |
| `backend/internal/repository/admin_content_anime_themes.go` | 2,482 | Yes (named ~2,400+) |
| `backend/internal/repository/anime_assets.go` | 1,880 | Yes (named ~1,800+) |
| `backend/internal/handlers/admin_content_release_version_media.go` | 1,358 | **No — new candidate** |
| `backend/internal/services/anisearch_client.go` | 1,217 | **No — new candidate** |
| `backend/internal/repository/media_repository.go` | 1,153 | **No — new candidate** |
| `backend/internal/repository/fansub_group_app_members_repository.go` | 1,083 | **No — new candidate** |
| `backend/internal/services/anime_create_enrichment.go` | 1,059 | **No — new candidate** |
| `backend/internal/handlers/app_profile.go` | 1,042 | **No — new candidate** |
| `backend/internal/permissions/permissions.go` | 968 | **No — new candidate (central permission logic, high coupling risk if touched)** |
| `backend/internal/handlers/admin_content_anime_theme_segments.go` | 967 | **No — new candidate** |

46 production Go files exceed the CLAUDE.md 450-line rule today. [VERIFIED]

### CSS module files >400 lines

155 total `.module.css` files, 41,201 total lines. [VERIFIED]

| File | Lines | In CONTEXT.md? |
|------|-------|-----------------|
| `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css` | 4,568 | Yes (named ~4,500+) |
| `frontend/src/components/ui/ui.module.css` | 2,085 | Yes (named ~2,000+) |
| `frontend/src/app/dev/ui-system/page.module.css` | 1,868 | **No — new candidate (dev-only showcase route, likely low priority)** |
| `frontend/src/app/admin/anime/create/page.module.css` | 1,773 | **No — new candidate** |
| `frontend/src/components/contributions/contributions.module.css` | 1,018 | **No — new candidate** |
| `frontend/src/app/admin/anime/[id]/episodes/import/page.module.css` | 961 | **No — new candidate** |
| 19 more files between 400-900 lines | — | See raw scan |

25 CSS module files exceed 450 lines; whether the 450-line rule's "production code files" wording was intended to cover CSS is ambiguous in CLAUDE.md's wording — D-24 and D-18 together imply yes, but this is a judgment call the planner should make explicit (flagged in Assumptions Log).

## Welle 2 Input: `api.ts` Export Surface (D-08/D-09)

**Total exports: 371** — 317 `export async function`, 13 `export function`, 11 `export const`, 26 `export interface`, 3 `export type`, 1 `export class`. [VERIFIED via `grep -c`]

A first-pass domain bucketing of the ~330 unique exported function names was run as a heuristic script (regex-based name matching against the function names). **This bucketing is this research's own first-pass judgment call, not an authoritative source** — the Welle-2 plan must re-verify before locking module boundaries. (Resolution: the Welle-2 planning revision re-verified every bucket live via grep against the current `api.ts` and locked exact real function-name lists per bucket in plans 174-03 through 174-07 — see those plans' `<interfaces>` blocks for the authoritative, grep-confirmed membership that supersedes the heuristic counts below.)

| Bucket (heuristic) | Count | Overlaps CONTEXT.md target shape? |
|---|---|---|
| admin anime (create/update/relations/themes/segments/jellyfin assets) | 48 | → `admin/anime` |
| fansubs/groups (core CRUD, aliases, links, members, merge, public profile) | 36 | → `fansubs` |
| media/assets (group + release + segment + profile uploads) | 30 | → `media` (cross-cuts `admin/anime`, `releases`, `members` too — **does not cleanly map to one bucket**, needs explicit sub-split decision) |
| admin fansub app members/invitations/claims | 24 | → `admin` (fansub-specific; not explicitly named in target shape) |
| members/profile (roles, group members, default crew, memorial) | 22 | → `members` |
| contributions/suggestions/proposals | 21 | → `contributions` |
| other/unclear | 27 | **No bucket fits cleanly** — see list below |
| auth/session (tokens, Keycloak callback, runtime session) | 19 | → `auth` |
| permissions/rights/roles/capabilities/overrides | 15 | → `permissions` |
| reviews/review-delegation/impact-previews | 14 | → `reviews` |
| history/notes/story/archive | 14 | → `history` |
| episodes (core: list/get/grouped/version CRUD/sync) | 13 | → `episodes` |
| projects/dashboard | 10 | → `projects` |
| admin users | 11 | → `admin/users` (not explicitly named in target shape) |
| segments/themes (anime segment CRUD, library assets, preview images) | 9 | cross-cuts `admin/anime` and a potential new `segments` module — **not in target shape, needs explicit decision** |
| admin episode/import | 8 | → `admin/episodes` |
| search/misc | 4 | → `anime` or standalone `search` |
| release version media/notes/crew | 1 (`replaceReleaseCrew` only — most crew/media/notes functions landed in other buckets above) | → `releases` |

**27 names in `other/unclear`** that resisted this heuristic: `activateClaimedMember`, `addWatchlistEntry`, `apiClientFetch`, `buildCreateAnimeConflictAwareApiError`, `createAnimeComment`, `getCurrentUser`, `getFansubAnimeReleaseVersions`, `getFansubGroupDomainProjection`, `getFansubs`, `getGroupReleaseDetail`, `getGroupReleaseImages`, `getGroupReleaseListCursor`, `getMemberPointRanking`, `getMyBadges`, `getMyMemberships`, `getReleasePlaybackAccess`, `getWatchlist`, `getWatchlistEntry`, `listChanges`, `listClaims`, `listMemberGroupStories`, `parseApiErrorPayload`, `patchMyBadgeVisibility`, `patchNoindex`, `removeWatchlistEntry`, `resolveApiUrl`, `submitMemberCorrection`. Several of these (`apiClientFetch`, `parseApiErrorPayload`, `resolveApiUrl`) are clearly D-09's "shared infrastructure" category (client/fetch-wrapper/error-handling/base-URL) and belong in a `client` module, not a domain module — the Welle-2 plan should carve these out first before bucketing the rest.

**Key implication for D-08:** the "media/assets" cluster (30 functions) spans `admin/anime` asset uploads, release-version media, segment asset uploads, and own-profile avatar/background/story uploads — this is evidence the target shape's single `media` module is too coarse, OR that the planner should split media functions into their *consuming* domain modules (`admin/anime`, `releases`, `members`) rather than a shared `media` module, keeping only truly-shared upload mechanics in `client`/infra. This is a concrete decision point the Welle-2 plan must make explicitly rather than default to the target shape's naming. (Resolution: 174-06 performed exactly this triage — the real, grep-confirmed media/assets bucket came to 45 functions after netting out ones legitimately claimed by other domain buckets, split by actual consumer domain rather than a shared `media.ts` catch-all.)

## Largest Functions/Components (seam evidence)

### `api.ts` — largest gaps between consecutive `export` declarations (proxy for function length)

Top 6 (via line-delta between export boundaries): 188 lines @ L8337, 170 lines @ L2508 (likely `deleteFansubGroup`→`uploadFansubMedia` region, media upload helpers), 162 lines @ L764 (`getRuntimeSessionMeta`), 154 lines @ L1019 (`parseApiErrorPayload`), 140 lines @ L8939, 139 lines @ L625 (`getSearchSuggestions`). None of these individually breach a "needs decomposition" threshold on their own — the file's size problem is breadth (371 exports), not depth (no single giant function dominates). [VERIFIED]

### Frontend hotspot components — single dominant function/component per file

- `useAdminAnimeCreateController.ts` (1,505 lines): 4 small pure helper functions already extracted at the top (`extractAniSearchCreateConflict`, `countIncomingDraftAssets`, `resolveCreateCoverState`, `resolveAniSearchCandidateSearchFeedback`, lines 101-195), then **one single hook `useAdminAnimeCreateController` spans lines 196-1505 (~1,309 lines)**. This exactly matches D-13's guidance: pure functions are already isolated (low-risk, already testable) — the giant hook body is the real P1 target, and must be split along the responsibilities D-13 names (form state / API interaction / validation / episodes / media / mapping / submit). [VERIFIED]
- `GroupMediaReviewSection.tsx` (1,415 lines): 9 small pure helpers (lines 98-176), then `GroupMediaReviewSectionInner` spans lines 193-1415 (~1,222 lines) containing `useCallback`-wrapped async handlers (`loadMedia` etc.). Same pattern as above. [VERIFIED]
- `frontend/src/app/admin/fansubs/create/page.tsx` (1,172 lines): 16 pure helpers (slugify, validators, mappers, lines 77-299), then `AdminFansubCreateContent` spans lines 300-1172 (~872 lines) with inline async handlers (`addAlias`, `removeAlias`, `save`). Same pattern. [VERIFIED]

**Pattern across all three P1 frontend candidates:** pure/mapping logic is already cleanly separated at the top of the file (supports D-13's "extract pure functions first" guidance directly); the remaining problem is one monolithic hook/component body containing multiple `useCallback` responsibilities that D-13/D-14 want split by domain concern, not by arbitrary size.

### Backend repository hotspots — method inventory

- `fansub_repository.go` (2,657 lines, 61 functions/methods): clean domain seams visible by name — Groups (`ListGroups`,`CreateGroup`,`GetGroupByID`,`GetGroupBySlug`,`UpdateGroup`,`DeleteGroup`), Links (`ListGroupLinks`,`CreateGroupLink`,`UpdateGroupLink`,`DeleteGroupLink`), Aliases (`ListAliases`,`CreateAlias`,`DeleteAlias`,`ReassignAlias`), Members (`ListMembers`,`CreateMember`,`UpdateMember`,`DeleteMember`), plus a "public profile" cluster (`GetPublicProfileBySlug`,`listPublicFansubStories`,`listPublicFansubProjects`,`listPublicFansubHistory`,`listPublicFansubMedia`) and merge-related helpers. This matches D-15's suggested split (Groups/Aliases/Links/Members/History/Merge/Search) almost exactly. [VERIFIED]
- `admin_content_anime_themes.go` (2,482 lines, 45 functions/methods): two clear clusters — Theme CRUD (`ListThemeTypes`,`ListAdminAnimeThemes`,`CreateAdminAnimeTheme`,`UpdateAdminAnimeTheme`,`DeleteAdminAnimeTheme`) and Segment logic (`ListAnimeSegments`,`CreateAnimeSegment`,`UpdateAnimeSegment`,`DeleteAnimeSegment`, plus ~15 segment-library/playback-source/preview-image helper functions). The segment cluster is itself large and internally cohesive (playback-source sync, library-asset binding) — a strong D-15 candidate for its own file. [VERIFIED]
- `anime_assets.go` (1,880 lines, 56 functions/methods): clear duplication-by-generation pattern — every asset type (Cover/Banner/Logo/Background/BackgroundVideo) has both a "legacy" method (e.g. `AssignManualCover`) and a "V2" shadow method (e.g. `assignManualCoverV2`), suggesting a schema-migration-in-progress structure. This is NOT classic copy/paste duplication to merge (D-07 would forbid merging legacy/V2 — they target different schema versions) but IS a strong axis for D-15 file-splitting: split by asset type (Cover/Banner/Logo/Background) rather than by legacy-vs-V2, since each type's legacy+V2 pair is the natural unit that changes together. [VERIFIED]

## Dependency Cycles (D-05/D-06/D-23 baseline)

**Tool:** `madge 8.0.0` via `npx --yes madge --circular --extensions ts,tsx <path>` (ran twice: once scoped to `frontend/src/lib`, once against all of `frontend/src`). [VERIFIED]

- `frontend/src/lib` (74 files, contains `api.ts`): **0 circular dependencies found.** This is the pre-refactor baseline for Welle 2 — D-23's closing audit must reconfirm 0 cycles after the split, and D-11 forbids introducing any.
- Full `frontend/src` (1,192 files): **7 circular dependencies found**, none involving `lib/api.ts`:
  1. `ReleaseVersionMediaSection.helpers.tsx` ↔ `useReleaseVersionMedia.ts`
  2. `SegmentEditPanel.tsx` ↔ `SegmentAssetSection.tsx`
  3. `SegmentEditPanel.tsx` ↔ `SegmentBasicFieldsSection.tsx`
  4. `GroupMemberFormModals.tsx` ↔ `useGroupMembersTab.ts`
  5. `GroupMembersTab.tsx` → `GroupMemberFormModals.tsx` → `useGroupMembersTab.ts` (transitive, same root cause as #4)
  6. `MediaUpload.tsx` ↔ `MediaUploadCore.tsx`
  7. `memberBadgeFamilies.ts` ↔ `memberBadgeLabels.ts`

Two of these (#4/#5, `useGroupMembersTab.ts` at 485 lines) sit directly adjacent to the `[id]/edit/` fansub-edit directory that also contains `GroupMediaReviewSection.tsx` (a P1 candidate) — if Welle 3/5 work touches that directory, these pre-existing cycles are in the blast radius and should be noted (not necessarily fixed — D-04 forbids unrelated architecture work, but D-23's closing audit must confirm the count didn't *increase*).

**Backend (Go):** no cycle-detection tooling is needed — the Go compiler statically rejects import cycles at build time. `go build ./...` currently succeeds with no errors [VERIFIED], confirming zero cycles exist today by construction. D-15/D-16 splits that stay within the same package (as D-15 requires) cannot introduce new cycles since same-package files share one compilation unit.

## Test Coverage of Hotspot Candidates (D-06/D-20 input)

| Hotspot | Prod lines | Direct test lines | Ratio | D-20 risk area named? |
|---|---|---|---|---|
| `frontend/src/lib/api.ts` | 11,508 | 164 (`api.test.ts`) | very thin direct coverage, but see below | Yes ("API-Mapping") |
| `useAdminAnimeCreateController.ts` | 1,505 | 1,032 (`useAdminAnimeCreateController.test.ts`) | 0.69:1 — well covered | Yes ("Admin Anime") |
| `GroupMediaReviewSection.tsx` | 1,415 | 605 (`GroupMediaReviewSection.test.tsx`) | 0.43:1 — reasonably covered | Yes ("Media") |
| `frontend/src/app/admin/fansubs/create/page.tsx` | 1,172 | **0 — no test file exists** | **uncovered** | "Fansub Edit" is named, but this is "Fansub **Create**" — same risk class, not literally named |
| `fansub_repository.go` | 2,657 | 426 (2 test files) | 0.16:1 — thin | Not explicitly named, but "Media"/"Rights" overlap via public-profile media logic |
| `admin_content_anime_themes.go` | 2,482 | **0 direct repository test file** — only an integration test for segment hydration (`admin_content_anime_theme_segments_hydration_integration_test.go`) plus handler-level tests in `backend/internal/handlers/admin_content_anime_theme_segment*_test.go` (6 files) that exercise HTTP behavior, not repository methods directly | effectively uncovered at the repository layer | "Admin Anime" is named explicitly |
| `anime_assets.go` | 1,880 | 196 (2 test files) | 0.10:1 — thin | Not explicitly named, but overlaps "Media" |

**api.ts's real test-coverage picture is more nuanced than the 164-line direct test file suggests:** 133 other frontend test files mock `@/lib/api` wholesale via `vi.mock`, meaning api.ts's *own internal logic* (auth session persistence, `parseApiErrorPayload`, `resolveApiUrl`, base-URL branching) is exercised almost nowhere except `api.test.ts`'s 164 lines (8 tests, confirmed passing live). This is the exact D-20 "API-Mapping" risk area and the clearest Characterization Test need.

**Concrete D-20 implication:** `admin_content_anime_themes.go` (uncovered repository layer) and `frontend/src/app/admin/fansubs/create/page.tsx` (zero tests) are the two highest-risk candidates in this research's dataset — either should get Characterization Tests before any refactor touches them, or should be demoted to P2/P3 until coverage exists, per D-06's explicit "existing safety-net tests" criterion.

## Query Patterns / N+1 Risk (D-17 input)

**Established batch idiom confirmed:** the codebase already uses `= ANY($1)` array-parameter batch queries as its anti-N+1 pattern — found 29 times in `fansub_repository.go` alone and across at least 20 other repository files (`theme_segment_assignments.go`, `release_review_query_predicates.go`, `admin_content_jellyfin_intake.go`, `release_version_media_repository.go`, `authz_permissions.go`, `admin_content_anime_themes.go`, etc.). [VERIFIED via `grep -rc "ANY(" backend/internal/repository/*.go`]

**No `pgx.Batch`/`SendBatch` usage exists anywhere in the backend** [VERIFIED — zero matches]. This means the `ANY($1)` idiom is the *only* established batching mechanism in this codebase; any refactor-introduced loop that issues per-row queries instead of collecting IDs and using `ANY($1)` would be a genuine regression against the existing convention, not just a style deviation.

**Loop-adjacent query calls found in the three backend hotspot candidates** (via `awk` proximity scan for a query call within 15 lines of a `for` loop): `fansub_repository.go` has 3 (one is the `ANY($1)` batch-collection pattern itself at L2301-2311, not a problem; two are inside write transactions issuing sequential `Exec` calls for different tables — need manual review for whether they are legitimate multi-table writes vs. accidental per-row loops); `admin_content_anime_themes.go` has 2 (both single `Exec`/one-time calls inside a loop body that appears to run once, not per-collection-item — needs confirmation); `anime_assets.go` has 6 (mostly `tx.Exec` calls inside asset-removal transactions that write to multiple related tables per asset — looks like legitimate multi-statement writes, not N+1 reads). **None of these were confirmed as actual N+1 bugs in this research pass** — this is a proximity-based proxy scan, not a full trace; the Welle-4 plan should do a per-call-site review of each, not assume these are fine.

D-17's named risk areas (Release Crew, Contributions, Media, Member Profile Projects, Anime Assets, Themes, Episodes, Imports) were not all individually traced in this pass — this research confirms the *tooling/idiom baseline* (ANY($1), no pgx.Batch) so the Welle-4 plan can grep for any loop that calls `.Query`/`.Exec`/`.QueryRow` per-iteration without first collecting IDs into a single `ANY($1)` call, and treat the before/after query count comparison D-21 requires as the actual verification mechanism (not static analysis alone).

## Copy/Paste Duplication Candidates (D-07 input)

Targeted scan for D-07's eight named areas. **None of these were verified for semantic identity in this pass — that is a Welle-1 decision, not something this research can responsibly assert without reading each candidate pair in full.** What was confirmed:

- **Status/label mapping (frontend):** at least 15 distinct `getXLabel`/`getXStatus*` functions exist across different files (`getTypeBadgeLabel` ×2, `getTableStatusVariant` ×2, `getVisibilityLabel`, `getTypeLabel`, `getStatusVariant`, `getStatusLabel`, `getReviewStatusOption`, `getProfileStatus`, `getKaraStatusLabel`, `getKaraCategoryLabel`, `getFansubMediaCategoryLabel`, `getFansubLinkTypeLabel`, `getErrorStatus`, `getEditUploadStatusLabel`, `getCategoryLabel`). These are named similarly but almost certainly map *different* domain enums (fansub media category ≠ kara status ≠ profile status) — this is exactly the "looks similar, is not" trap D-07 warns about. **Recommendation: do not merge any of these without a side-by-side read of each function's input type.**
- **Date formatting (frontend):** at least 17 files define local date-formatting logic (via `grep` for `function formatDate`/`const formatDate`) spread across admin changes/claims/users/fansubs/episodes/contributions/profile areas. Worth a closer D-07 pass since date formatting is more likely than status-labels to be semantically identical (most just wrap `toLocaleDateString` with similar options) — but this still needs per-pair verification, not a blanket merge.
- **Permission checks (backend):** no single widely-duplicated `CheckPermission`/`HasPermission` function name pattern was found — the central logic lives in `backend/internal/permissions/permissions.go` (968 lines, itself a size-hotspot not named in the original candidate list) plus `authz_permissions.go` (588 lines) and `authz_permissions_batch.go`. This suggests permission-check duplication is less of a "copy/paste across files" problem and more a "one already-large central file" problem — different risk profile than D-07 anticipated, worth flagging to the planner.
- **Error handling (backend):** handler-level error helpers are already fairly centralized/specialized by purpose (`writePermissionInternalError`, `writeJellyfinErrorResponse`, `writeInternalErrorResponse`, `classifyJellyfinUpstreamError`/`classifyJellyfinTransportError`/`classifyJellyfinResolutionError` form a deliberate classification chain, not duplication) — no obvious merge candidate found.

## `@/lib/api` Barrel vs. Existing Vitest Mocks (D-10 input)

**Measured:** 133 frontend test files currently call `vi.mock('@/lib/api', ...)` or `vi.mock("@/lib/api", ...)` (120 single-quote style, 13 double-quote style). [VERIFIED via `grep -rl`]

Of these, two distinct patterns exist:

1. **Full literal-factory replacement** (~126 files, e.g. `frontend/src/app/me/profile/page.test.tsx`): `vi.mock('@/lib/api', () => ({ API_AUTH_SESSION_TOKEN: 'runtime-auth', ApiError: class ApiError extends Error {...}, getOwnProfile: (...args) => getOwnProfileMock(...args), ... }))`. This replaces the entire module at Vitest's module-resolution layer for the `@/lib/api` specifier — it does not care what the real module's internal structure is. **[ASSUMED, reasoning below]** this pattern is expected to continue working unchanged after the barrel split, because Vitest's `vi.mock` intercepts by *resolved import path*, and the test and the SUT will both still import from `@/lib/api` unchanged under D-10. This has **not been empirically verified in this session** because no barrel exists yet to test against.
2. **Partial mock via `vi.importActual`** (7 files, e.g. `frontend/src/app/admin/roles/RolesClient.test.tsx`: `vi.mock('@/lib/api', async () => { const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api'); ... })`). This pattern *does* load the real module graph through whatever `@/lib/api` resolves to — meaning it will load the barrel and everything behind it. [CITED: Vitest docs, https://vitest.dev/guide/mocking/modules — "You can create a partial mock by passing an async factory that calls the supplied `importOriginal` helper"] Standard (non-experimental-native-runner) Vitest resolves `export * from` re-exports correctly for this use case, per Vitest's own mocking guide.

**Known risk, found via WebSearch, [CITED: GitHub issue vitest-dev/vitest#11297, "Native runner manual mocks drop exports re-exported with `export *`"]:** when Vitest's *experimental* native module runner (`experimental.viteModuleRunner`) is enabled, manual mocks of modules that re-export via `export *` can lose the re-exported names due to a path-resolution bug in export collection. **This project does not enable that experimental flag** — confirmed by reading `frontend/vitest.config.ts` in full, which has no `experimental`/`native`/`runner` keys. [VERIFIED] This means the specific bug in #11297 should not apply to this project's current Vitest configuration, but it is evidence that barrel + re-export + mocking interactions are a real, documented class of Vitest bug, not a purely theoretical concern.

**Recommendation for Welle 2:** before splitting all 371 exports, add one canary test early (e.g. a trivial new test file that imports 2-3 functions from different future sub-modules through the barrel, with no mocking) and run the full Vitest suite once the barrel exists but before deleting the monolithic `api.ts` content. This converts the D-10 compatibility assumption from `[ASSUMED]` to empirically `[VERIFIED]` before the bulk of the split work is committed, which is cheap insurance given 133 files depend on the assumption holding.

## Runtime State Inventory

Not applicable — Phase 174 is a pure code-structure refactor (D-01: no DB migrations, no API contract changes, no new features). No stored data, live service config, OS-registered state, secrets, or build-artifact renames are involved. The only "state" at risk is Vitest mock resolution (covered above) and SQL string literals inside test assertions (covered in Common Pitfalls below) — both are code-level, not runtime-state concerns.

## Common Pitfalls

### Pitfall 1: `os.ReadFile` + `strings.Contains` self-inspection tests break on pure code relocation
**What goes wrong:** A test reads its own subject file's source as a string and asserts specific SQL/code fragments are present via `strings.Contains`. If D-15's repository split moves a function (and its embedded SQL) to a different file within the same package, the test's `os.ReadFile("fansub_repository.go")` call will no longer find fragments that moved to the new file, even though behavior is 100% unchanged.
**Why it happens:** This is the exact anti-pattern CLAUDE.md's Teststil section forbids for *new* work but tolerates as "Altlast" (legacy debt) for existing code — `TestFansubRepository_PublicProfileSourceInvariants` in `fansub_repository_test.go` is a live example and currently targets the #1 D-15 split candidate.
**How to avoid:** Before splitting `fansub_repository.go` (or any file with this pattern), grep that file's corresponding `_test.go` files for `os.ReadFile` and inventory which fragments would move. D-03 explicitly permits "pure import-path adjustments" as an exception requiring individual SUMMARY justification — moving the `os.ReadFile` target path (or splitting the assertion across multiple `os.ReadFile` calls against the new file layout) should be treated as this exact exception, not a forbidden test-content change, since the *behavior* being asserted is unchanged, only the file layout the assertion mechanically reads.
**Warning signs:** `go test` failures immediately after a repository split that reference `os.ReadFile`/`strings.Contains` lines, where the actual repository behavior (verified via a real HTTP/handler-level test) is unaffected.
**Measured scope:** 111 test files under `backend/internal` use `os.ReadFile` in some form [VERIFIED via grep count] — this count includes legitimate uses (reading SQL migration files, which CLAUDE.md explicitly exempts, and fixture files) as well as the self-inspection anti-pattern; this research did not individually classify all 111. At minimum, `fansub_repository_test.go` is confirmed to use the self-inspection pattern AND targets a P1 hotspot, making it the one certain case requiring Welle-4 planning attention.

### Pitfall 2: A backend baseline test is already failing on `main`, unrelated to this phase
**What goes wrong:** `go test ./internal/repository/... -run TestFansubRepository` run live against `main` today fails: `TestFansubRepository_PublicProfileSourceInvariants` expects the fragment `"FROM anime_media am"` in `fansub_repository.go`'s source and it is not found. [VERIFIED — ran this test live, confirmed FAIL with that exact message]
**Why it happens:** Unknown — likely a prior phase changed the `GetPublicProfileBySlug`/`listPublicFansubMedia` SQL (e.g. renamed the alias or table) without updating this brittle self-inspection assertion. This predates Phase 174 and is not caused by this research session (no files were edited).
**How to avoid:** Per D-19, this must be recorded as a **known pre-existing baseline failure** in the Welle-1 hotspot artifact and the final report, not scored as a regression introduced by any Phase 174 task. The Welle-4 plan for `fansub_repository.go` should decide explicitly whether to fix this test's assertion (if it's trivial — e.g. the real SQL now says `anime_media am2` or similar) as part of D-15 work, since the split will touch this exact test file's target anyway.
**Warning signs:** Running the full `./internal/repository/...` suite shows additional, unrelated failures tied to external connectivity (see Pitfall 3) — don't conflate the two.

### Pitfall 3: Running `go test` directly inside the running backend container produces environment-dependent false failures
**What goes wrong:** `docker compose exec -T team4sv30-backend sh -c "go test ./internal/repository/..."` run live produces failures like `dial tcp 192.168.235.196:18093: connect: connection refused`, Keycloak password-grant `invalid_grant` errors, and a permissions-cache startup abort (`Action "release_version_media.reorder" fehlt in role_capabilities`). [VERIFIED — ran this live]
**Why it happens:** These tests expect to reach the backend's *own* externally-exposed port (18093) and a live Keycloak instance from inside the test process, which doesn't resolve correctly when run via `docker compose exec` against the already-running service container rather than through the project's documented test protocol.
**How to avoid:** `174-CONTEXT.md`'s own "Verifikation" section already specifies the correct protocol: run Go tests from a `golang:1.25-alpine` container in the `team4s_default` network with the DSN sourced from the backend container — not ad hoc `go test` inside the running `team4sv30-backend` service container. The Welle-4 execution plan must use that exact documented protocol, or document any deviation and its baseline-failure implications per D-19.
**Warning signs:** Failures mentioning `dial tcp`, `connection refused`, `invalid_grant`, or permissions-cache startup aborts are environment-protocol issues, not code regressions — do not let these block a refactor step's "tests green" gate if they are present identically before and after the change.

### Pitfall 4: `anime_assets.go`'s legacy/V2 method pairs look like D-07 duplication but are not
**What goes wrong:** Every asset type in `anime_assets.go` has a "legacy" method (`AssignManualCover`) and a near-identical-looking "V2" method (`assignManualCoverV2`). A naive D-07 pass might flag these as copy/paste duplication to merge.
**Why it happens:** This is a schema-migration-in-progress pattern (see `hasV2AssetSchema`-style dispatch found during the method inventory) — the two methods target different underlying table schemas, not duplicated logic for the same schema.
**How to avoid:** D-07 explicitly requires "truly identical semantics" before merging — legacy and V2 methods are NOT semantically identical despite similar names/shapes, because they write to different tables/columns. The D-15 split axis for this file should be by *asset type* (Cover/Banner/Logo/Background each including their legacy+V2 pair), not by legacy-vs-V2, since each type's pair changes together.
**Warning signs:** Any plan task that proposes "deduplicate legacy and V2 asset methods" should be rejected or sent back for semantic verification — this is the exact trap D-07's text anticipates.

## Code Examples

### Existing `ANY($1)` batch pattern (the established anti-N+1 idiom to preserve, D-17)
```go
// Source: backend/internal/repository/fansub_repository.go, L2301-2311 (verified live in repo)
existingNormalized := make(map[string]struct{}, len(normalizedInputs)+2)
if len(normalizedInputs) > 0 {
    aliasRows, err := r.db.Query(ctx, `
        SELECT normalized_alias
        FROM fansub_group_aliases
        WHERE normalized_alias = ANY($1)
    `, normalizedInputs)
    // ...
}
```
Any Welle-4 refactor must preserve this shape (collect IDs, one batch query) rather than looping per-item queries.

### Existing full-factory `vi.mock('@/lib/api', ...)` pattern (D-10 compatibility target)
```typescript
// Source: frontend/src/app/me/profile/page.test.tsx, L125-143 (verified live in repo)
vi.mock('@/lib/api', () => ({
  API_AUTH_SESSION_TOKEN: 'runtime-auth',
  AUTH_SESSION_CHANGED_EVENT: 'team4s:auth-session-changed',
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  apiClientFetch: (...args: Parameters<typeof fetch>) => fetch(...args),
  getOwnProfile: (...args: unknown[]) => getOwnProfileMock(...args),
  // ...
}))
```

### Existing `vi.importActual` partial-mock pattern (the 7-file minority, higher barrel-interaction risk)
```typescript
// Source: frontend/src/app/admin/roles/RolesClient.test.tsx, L58-59 (verified live in repo)
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  // ... spread actual, override specific exports
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| N/A — no library/framework version changes in this phase | N/A | — | This phase does not touch library versions (D-04 forbids fetch/ORM/routing/test-framework swaps); "state of the art" here is about codebase structure, not external tooling churn |

**Deprecated/outdated:** None identified — this is a pure internal-structure refactor, not a library-upgrade phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Full literal-factory `vi.mock('@/lib/api', ...)` (126 of 133 test files) will continue working unchanged after the barrel split, because Vitest intercepts by resolved import specifier regardless of internal module structure | `@/lib/api` Barrel vs. Existing Vitest Mocks | If wrong, up to 126 test files could fail simultaneously after the Welle-2 split lands, a large blast radius; mitigated by this research's own recommendation to add a canary test and run the full suite before committing the bulk of the split |
| A2 | `vi.importActual('@/lib/api')` (7 files) will correctly resolve the new barrel's `export *` re-exports under this project's current (non-experimental-native-runner) Vitest configuration | `@/lib/api` Barrel vs. Existing Vitest Mocks | If wrong, these 7 specific test files fail post-split; smaller blast radius than A1, same mitigation (canary test) |
| A3 | The 450-line production-file rule in CLAUDE.md was intended to also cover `.module.css` files (not just `.ts`/`.tsx`/`.go`), since D-18/D-24 jointly imply CSS modules should also shrink | Measured Hotspots — CSS section | If wrong, the planner may create unnecessary CSS-splitting tasks purely to satisfy a line-count rule that was never meant to apply to CSS; low risk either way since D-18's actual gate is "real JSX component boundaries exist", not line count |
| A4 | None of the loop-adjacent query calls found via the proximity scan in `fansub_repository.go`/`admin_content_anime_themes.go`/`anime_assets.go` are actual N+1 bugs — they appeared to be either the existing `ANY($1)` batch pattern or legitimate multi-table transactional writes | Query Patterns / N+1 Risk | If wrong, an existing N+1 could be mistaken for a non-issue and carried through the refactor unexamined; mitigated because D-17 requires this to be checked via actual before/after query-count measurement during Welle 4, not static analysis alone — this assumption only affects what this research flagged for closer look, not what the plan ultimately verifies |
| A5 | The `api.ts` domain-bucket assignment (18 heuristic buckets covering ~330 function names, 27 left unclassified) reflects real, splittable domain boundaries rather than artifacts of this research's regex-matching heuristic | `api.ts` Export Surface | If wrong, the Welle-2 plan could lock in module boundaries that don't reflect actual coupling between functions (e.g. functions that share internal private helpers but landed in different buckets); mitigated by this research explicitly flagging the bucketing as a draft requiring Welle-2 re-verification |

## Open Questions (RESOLVED)

1. **Is `TestFansubRepository_PublicProfileSourceInvariants`'s failure fixable as a one-line SQL-alias correction, or does it indicate a real latent bug in `GetPublicProfileBySlug`?**
   - What we know: the test expects `"FROM anime_media am"` and it's absent from current source; the repository builds and presumably serves this endpoint correctly in production today (no related bug reports found in STATE.md during this research).
   - What's unclear: whether the actual SQL now uses a different alias/join shape that's functionally equivalent (safe to just fix the test) or whether the public-profile media query genuinely regressed.
   - Recommendation: the Welle-1 or Welle-4 plan should spend 10 minutes reading `GetPublicProfileBySlug`'s current SQL before deciding; this is cheap to resolve and blocks a clean "tests green" baseline for the #1 backend hotspot.
   - **Resolution:** 174-01 (Welle-1 hotspot analysis) performed the SQL read and recorded the verdict in `174-HOTSPOTS.md`'s "Pre-Existing Baseline Test Failures" section; 174-17 (Welle-4 `fansub_repository.go` split, public-profile cluster) executed the corresponding fix/no-fix decision and documented the final state in its SUMMARY.

2. **Should `admin_content_anime_themes.go` and `frontend/src/app/admin/fansubs/create/page.tsx` be demoted to P2 given their zero/near-zero direct test coverage, or should Characterization Tests be written first and the split proceed in P1?**
   - What we know: D-06 lists "existing safety-net tests" as one of six P1/P2/P3 criteria; D-20 names "Admin Anime" and "Fansub Edit" (not literally "Fansub Create") as areas needing Characterization Tests before refactor.
   - What's unclear: whether D-20's intent extends to "Fansub Create" (same directory family, same risk profile, zero tests) or whether the user's naming was deliberate and Create should be treated as P2/P3 by default.
   - Recommendation: treat "Fansub Create" as in-scope for D-20's Characterization Test requirement given its risk profile (zero tests, 872-line monolithic component body) is objectively worse than "Fansub Edit" components that do have tests — flag this explicitly to the user/planner rather than silently deciding either way.
   - **Resolution:** 174-09 wrote the Characterization Test suite for `frontend/src/app/admin/fansubs/create/page.tsx` before any P1 split work touched it, and 174-15 wrote the Characterization Test suite for `admin_content_anime_themes.go`'s repository layer before its P1 split — both were kept in P1 scope with tests added first, resolving this question in favor of "write tests, keep P1" rather than demotion.

3. **Is the ~27-function "other/unclear" bucket in the api.ts domain analysis exhaustive, or would a second independent pass (e.g. grouping by which files/components actually import each function) surface different boundaries than name-based heuristics?**
   - What we know: this research's bucketing used only function-name pattern matching, not actual import-graph analysis of which frontend files consume each function.
   - What's unclear: whether import-graph clustering would produce meaningfully different module boundaries than the name-based heuristic (likely to agree on the big clusters, more likely to disagree on the unclear 27).
   - Recommendation: Welle 2's own analysis step should run a quick import-site grep per function (`grep -rl "functionName" frontend/src/app frontend/src/components`) for the unclear bucket specifically, before finalizing module assignment.
   - **Resolution:** 174-07 ran exactly this import-site grep for every one of the 24 remaining unclear names (27 minus 3 already relocated as shared infra in 174-02) and recorded the evidence-backed destination for each in its SUMMARY, including the decision to create a new small `watchlist.ts` module for the watchlist-cluster names rather than forcing them into an ill-fitting existing domain file.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `npx` / Node.js | `madge` cycle detection | ✓ | Node v24.19.0, npm present | — |
| `madge` (via npx, not installed) | Welle 1/6 cycle baseline and closing audit | ✓ | 8.0.0, confirmed runnable | — |
| Go compiler | Backend cycle-freedom-by-construction, `go build`/`go test` | ✓ | go1.25.13 (inside `team4sv30-backend` container) | — |
| Vitest | Frontend test baseline | ✓ | 3.2.4 (inside `team4sv30-frontend` container) | — |
| Docker Compose stack | All verification steps per CONTEXT.md's "Verifikation" section | ✓ | All 7 services up (`db`, `backend`, `frontend`, `keycloak`, `keycloak-db`, `mailpit`, `redis`) at research time | — |
| `golang:1.25-alpine` container in `team4s_default` network (for correct Go test execution, per CONTEXT.md) | Welle 4 verification | Not probed directly in this session — CONTEXT.md states this is the documented protocol; this research instead ran `go test` ad hoc inside the running backend container and hit environment-dependent failures (see Pitfall 3) that the documented protocol is presumably designed to avoid | — | Use the documented protocol exactly as CONTEXT.md specifies; do not repeat this research's ad hoc approach for actual verification gates |

**Missing dependencies with no fallback:** None — all tooling needed for Welle 1-6 is already present (either system-installed or `npx`-fetchable without touching `package.json`).

**Missing dependencies with fallback:** None applicable.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Frontend framework | Vitest 3.2.4 [VERIFIED live] |
| Frontend config file | `frontend/vitest.config.ts` (no experimental/native-runner flags; `include: ['src/**/*.test.ts', 'src/**/*.test.tsx']`) |
| Frontend quick run command | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run <path>"` — confirmed working live against `src/lib/api.test.ts` (8 tests, 975ms) |
| Frontend full suite command | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run"` (358 total `*.test.ts(x)` files found) |
| Backend framework | Go `testing` + `testify` (per `backend/go.mod`), go1.25.13 |
| Backend config | None (standard `go test`) — but execution MUST follow CONTEXT.md's documented container-network protocol (golang:1.25-alpine in `team4s_default`, DSN from backend container), not ad hoc `docker compose exec` into the running backend service (see Pitfall 3) |
| Backend quick run command | Per-package: `go test ./internal/repository/... -run <TestName>` inside the documented protocol container |
| Backend full suite command | `go test ./...` inside the documented protocol container — **currently has known failing tests unrelated to any code change** (Pitfall 2, plus connectivity-dependent tests in Pitfall 3); establish a clean baseline list before Welle 1 work starts |

### Phase Requirements → Test Map
No REQ-IDs exist for this phase (see Phase Requirements section). The applicable mapping is Welle → D-xx decision → verification mechanism:

| Welle | D-xx | Verification | Automated Command | Gap? |
|---|---|---|---|---|
| 1 | D-05/D-06/D-07 | Analysis artifact only, no code change — no test gate | N/A | N/A |
| 2 | D-08...D-12 | Full Vitest suite + typecheck + lint green after each domain-group commit; canary barrel-import test added early (see A1/A2 mitigation) | `npx vitest run`, `npx tsc --noEmit`, `npx eslint .` | **Gap: canary test for barrel+mock interaction does not exist yet — must be written in Welle 2, Task 1** |
| 3 | D-13/D-14 | Existing `useAdminAnimeCreateController.test.ts` (1,032 lines) and `GroupMediaReviewSection.test.tsx` (605 lines) must stay green; `fansubs/create/page.tsx` has **no test file** | `npx vitest run <path>` | **Gap: `frontend/src/app/admin/fansubs/create/page.test.tsx` does not exist — Characterization Test needed before/instead of refactor per Open Question 2** |
| 4 | D-15/D-16/D-17 | `fansub_repository_test.go` (426 lines, 1 pre-existing failing test), `anime_assets_test.go` + `anime_assets_legacy_cover_original_test.go` (196 lines); `admin_content_anime_themes.go` has **no direct repository test** | documented container-network `go test` protocol | **Gap: no repository-level test for `admin_content_anime_themes.go` — Characterization Test needed before split, per D-20** |
| 5 | D-18 | Visual-equality verification (no automated visual-regression tooling found in this repo during research — not probed exhaustively, worth confirming in Welle 1) | Manual/browser UAT per CONTEXT.md's tunnel-based verification note | **Gap: no automated CSS visual-regression check exists; D-18's "visual equality must be demonstrated" likely means manual before/after screenshot comparison, not automated** |
| 6 | D-23 | Re-run all of the above + madge + file-size scans, compare to this research's baseline tables | same commands as Welle 1-5 | None — this research's tables ARE the "before" baseline D-23 needs |

### Sampling Rate
- **Per task commit:** targeted Vitest/Go test run for the affected file(s), plus typecheck + lint (frontend) or `go build` (backend).
- **Per wave merge:** full Vitest suite + full affected-package Go suite.
- **Phase gate:** both full suites green (modulo the documented pre-existing baseline failures from Pitfalls 2/3, which must be enumerated explicitly before Welle 1 concludes so they're not mistaken for new regressions later).

### Wave 0 Gaps
- [ ] `frontend/src/app/admin/fansubs/create/page.test.tsx` — does not exist; needed before/alongside Welle 3 work on this file (Open Question 2)
- [ ] A repository-level test file for `admin_content_anime_themes.go` (e.g. `admin_content_anime_themes_test.go`) — does not exist; needed before Welle 4 work on this file per D-20
- [ ] One canary Vitest test exercising a real (non-mocked) import through the future `@/lib/api` barrel — does not exist yet (barrel doesn't exist); needed as the first task of Welle 2, before the bulk split, to empirically confirm A1/A2
- [ ] An enumerated list of pre-existing baseline test failures (confirmed so far: `TestFansubRepository_PublicProfileSourceInvariants`; likely more in `phase134_verification_matrix*_test.go` due to Keycloak/network dependencies seen in this research's test run) — should be compiled once, under the correct container-network protocol, before Welle 1 concludes, so D-19's "baseline not new regression" rule has a concrete reference list

## Security Domain

This phase is explicitly behavior-preserving (D-01) with no new features, endpoints, or contract changes — it does not introduce new attack surface. The relevant ASVS concern is **regression risk in existing controls during refactor**, not new control design.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Marginal — `api.ts`'s auth/session cluster (19 functions: token issuance/refresh/revoke, Keycloak callback, runtime session persistence) is being relocated, not redesigned, under D-09 | No new auth library; preserve exact token-handling logic verbatim during the Welle-2 split; the existing `issueAuthToken`/`refreshAuthToken`/`revokeAuthToken`/Keycloak-callback functions must move file but not change behavior |
| V3 Session Management | Marginal — same cluster as above (`getRuntimeSessionMeta`, `persistAuthSession`, `clearAuthSession`) | Same as V2 — move-not-modify |
| V4 Access Control | Yes — `backend/internal/permissions/permissions.go` (968 lines) and the "permissions/rights/roles" `api.ts` bucket (15 functions: `getEffectiveRights`, `grantRoleCapability`, `revokeRoleCapability`, override mutation) are adjacent to, though not named as, P1 refactor targets | D-01 requires permissions/effective-rights behavior to stay byte-for-byte identical; D-04 explicitly forbids a "new permission architecture"; if Welle 4 touches any file that calls into `permissions.go`, D-17's query-count check and a before/after effective-rights comparison (not just unit tests) should gate the change |
| V5 Input Validation | No — this phase does not touch request validation logic by design (D-16: "Business logic moves to a service only if it genuinely belongs there"; validation stays where it is) | N/A — preserve existing Gin binding/validation code verbatim |
| V6 Cryptography | No — no token-signing, hashing, or crypto logic is being introduced or touched; existing Keycloak-backed auth flow is relocated, not reimplemented | N/A |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Accidental behavior change in effective-rights resolution during a repository/handler split (e.g. a copy-paste slip when moving `GetEffectiveRights`-adjacent SQL to a new file) | Tampering / Elevation of Privilege | D-01's byte-for-byte behavior preservation requirement + D-20's Characterization Tests for the "Rights" risk area; a before/after diff of the actual SQL text (not just "it compiles") should be part of the Welle-4 review for any permissions-adjacent file move |
| Barrel re-export accidentally dropping or renaming an export during the `api.ts` split, silently changing which function a caller resolves to (e.g. two similarly-named functions in different domain buckets) | Tampering | D-10's "callers aren't mass-edited" requirement + this research's canary-test recommendation; a full-repo grep diff of `import { X } from '@/lib/api'` call sites before/after the split, confirming the same `X` resolves to the same implementation, should be a Welle-2 verification step |

## Sources

### Primary (HIGH confidence)
- Direct tool output against the live repository at `/home/d1sk/team4s` (branch `main`, confirmed clean working tree apart from pre-existing untracked `.planning/sketches/` content not touched by this research): `wc -l`, `grep -c`/`grep -rl`/`grep -n`, `find`, `npx --yes madge --circular`/`--version`, `go build ./...`, `go version`, `docker compose ps`, live `vitest run src/lib/api.test.ts`, live `go test ./internal/repository/... -run TestFansubRepository`.
- `174-CONTEXT.md` (`.planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/174-CONTEXT.md`) — full text read, all 24 decisions reproduced verbatim above.
- `CLAUDE.md` (project root) — 450-line rule, Teststil (test-style) rules, UI-primitive rules, main-branch-only discipline, all read and cross-checked against measured findings.
- `frontend/vitest.config.ts`, `frontend/package.json` — read directly to confirm test command, framework version source, and absence of experimental native-runner config.

### Secondary (MEDIUM confidence)
- [Vitest — Mocking Modules](https://vitest.dev/guide/mocking/modules) — confirms `vi.importActual`/partial-mock semantics for re-exported modules in standard (non-experimental) mode.

### Tertiary (LOW confidence, flagged for validation)
- [GitHub issue vitest-dev/vitest#11297 — "Native runner manual mocks drop exports re-exported with `export *`"](https://github.com/vitest-dev/vitest/issues/11297) — cited as evidence of a known risk class, confirmed NOT applicable to this project's current Vitest config (no experimental native runner enabled), but included because it is the closest documented precedent for D-10's barrel+mock concern.
- `.planning/STATE.md` (partial read, tail + targeted grep only — file exceeds single-read size limit) — used only to confirm Phase 174's addition date and the PHASE128-DSN baseline-failure precedent referenced in D-19; not read in full.

## Metadata

**Confidence breakdown:**
- Standard stack / tooling: HIGH — madge, Go compiler, Vitest versions all directly confirmed live against the running containers.
- File-size/export/cycle/test-coverage measurements: HIGH — all produced by direct shell commands against the live repo in this session, not estimated.
- `api.ts` domain bucketing: LOW/first-pass — explicitly a heuristic requiring Welle-2 re-verification (see Assumptions Log A5).
- Barrel + Vitest mock compatibility (D-10): MEDIUM — grounded in Vitest's documented module-mocking architecture and one directly relevant GitHub issue, but not empirically tested against a real barrel (doesn't exist yet) — this is the single highest-value thing for the planner to convert from assumption to verified fact early in Welle 2.
- N+1/copy-paste semantic-identity verdicts (D-07/D-17): LOW — proximity scans and name-pattern matches only; no per-call-site or per-function-pair deep read was performed for every candidate (would require reading the full body of dozens of functions, out of scope for a research pass whose job is to scope Welle 1, not perform Welle 1).
- Pre-existing baseline test failures: HIGH for the two specific failures directly reproduced live (`TestFansubRepository_PublicProfileSourceInvariants`, Keycloak/connectivity-dependent `phase134_verification_matrix*` tests); the broader "111 files use os.ReadFile" count is HIGH as a raw count but LOW as a claim about how many are the forbidden anti-pattern vs. legitimately-exempt fixture/migration reads.

**Research date:** 2026-10-04
**Valid until:** This research is tied to the exact current state of the repository (file sizes, test pass/fail status, cycle count). It should be treated as stale the moment any other phase or quick-fix lands on `main` and touches any file mentioned above — re-run the measurement commands in this document rather than trusting the numbers if more than a few days or any intervening commits have passed. For a refactor-scoping research document (not a library-version research document), 7 days is a reasonable validity window, shorter if other phases are actively landing on `main` concurrently.
