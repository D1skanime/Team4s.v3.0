# Phase 139: Scalable User-Admin Projections - Research

**Researched:** 2026-08-24
**Domain:** Go/Gin backend server-side projection + pagination + Next.js admin UI (existing Team4s admin-user-detail surface)
**Confidence:** HIGH (all claims below verified directly against the current repo on `team4s-linux` and/or the live `team4s_v2` database — no speculative library research needed; this phase adds zero new external dependencies)

## Summary

Phase 139 is a pure refactor/extension of an existing, working admin surface (`backend/internal/handlers/admin_users_handler.go` + `admin_users_tab_repository.go` + the six frontend tabs under `frontend/src/app/admin/users/`). There are no new libraries, no new services, and no new architectural tiers — the entire phase is: (1) turn three unbounded flat-array backend endpoints into paginated, filtered, grouped projections; (2) fix a real N+1 in two frontend tabs; (3) rebuild the corresponding UI as grouped/collapsed cards instead of raw tables; (4) add a query-count/pagination-drift test gate. Every backend building block the phase needs already exists elsewhere in this codebase in a directly reusable, precedent form: `ClampAdminListPage` + `COUNT(*) OVER()` dynamic-filter pagination (`member_claims_list_repository.go`, `audit_logs_query.go`), a package-private `queryCounter` pgx tracer + constant-query-budget test pattern (`repository/query_counter.go`, `member_profile_query_budget_test.go`, Phase 131), and a per-phase disposable-Postgres test harness convention (`testsupport/phase137_postgres.go`, `openPhasePostgres`). Phase 139 does not need to invent any of these patterns — it needs to apply them to a fourth/fifth domain.

The three external-package findings (F-01/F-02/F-03) are all confirmed, but F-02 needs a factual correction: `shared/contracts/admin-content.yaml` is **not** absent-of-coverage for admin/users — it already documents all nine current `/admin/users/*` endpoints, just in a project-specific lightweight `feature/endpoints/types` YAML DSL (not real OpenAPI), and that documentation is **not** contract-tested by any Go test. `shared/contracts/admin-capabilities.yaml`, by contrast, **is** real OpenAPI 3.0.3 and **is** contract-tested (`admin_capability_contract_test.go`). This gives the planner a real choice with real tradeoffs, not a "file doesn't exist" gap — see the dedicated section below.

**Primary recommendation:** Treat this as three parallel backend-projection workstreams (contributions, media, rights-scaling) sharing one pagination/query-budget pattern, followed by three corresponding UI rebuilds, followed by one query-count/pagination-drift gate wave — mirroring the external package's wave shape but validating that the plan count (6 in the external package vs. 18 for Phase 138) is realistic given the amount of genuinely new SQL logic in the contribution range-collapse/override-detection query (which has no existing precedent in this codebase to copy).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Contribution grouping/range-collapse/override detection | API / Backend (`admin_users_tab_repository.go` + new query) | Database (episodes.sort_index ordering) | D02/D06/D07/D23: server-side only, no client regrouping |
| Contribution/media pagination + filtering + counts | API / Backend | — | D08/D09/D12/D13/D24: filters, count, items must be the same server-side dataset |
| Media grouping by Release/Episode + preview URLs | API / Backend (needs new `PublicURL`/`FileSizeBytes` derivation, currently hardcoded empty/0) | CDN / Static (`/media/...` static serving) | D11/D17: backend derives real URLs from `media_assets.file_path`/`media_files`, same convention as `buildRVMPublicURL` |
| Rights bundled Overview summary (role + top-N capabilities + deviation flag, per group, batched) | API / Backend (new endpoint) | — | F-01: must be a single non-N+1 batched query; cannot be assembled client-side without one call per group |
| Rights tab bounded group selection + lazy per-group fetch | Frontend Server (SSR-adjacent client component) + API | API (existing single-group `getEffectiveRights` endpoint, unchanged) | D22: the per-group effective-rights endpoint is already single-group-scoped; the fan-out is a frontend orchestration bug, not a backend N+1, for this one tab |
| Canonical media "Release-Medien öffnen" action target | Frontend Server (`/me/releases/[versionId]/workspace`) | — | D16/UADM-07: link out to existing workspace, never clone edit logic |
| Responsive/keyboard-safe list+filter UI | Browser / Client (CSS container queries + native keyboard nav) | — | D26/UADM-08: CSS-based graceful degradation, not a second JS breakpoint system |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UADM-02 | Beiträge serverseitig nach Anime und Projekt gruppiert, Projektstandard kompakt sichtbar | `ListUserContributions` (current unbounded flat-array impl) analyzed; range-collapse precedent found in `AnimeGroupCard.tsx` (client-side, visual reference only per CONTEXT); `episodes.sort_index`/`episode_number` schema confirmed live |
| UADM-03 | Nur echte Abweichungen als Override markiert | `release_crew_snapshots`/`ReplaceInTx` traced: `snapshot_mode='independent'` is set on ANY manual edit via the override drawer, regardless of whether content actually differs — confirms D04's "not proof of override" is a real, not theoretical, gap |
| UADM-04 | Identische Release-Version-Zuweisungen zu Bereichen zusammengefasst | Same `AnimeGroupCard.tsx` range-collapse algorithm (consecutive `episode_sort_index`) is the reference pattern to port server-side |
| UADM-05 | Medien nach Anime/Projekt/Release-Kontext gruppiert, verlinkt zur kanonischen Arbeitsfläche | `GetUserMedia` (current impl) analyzed: `PublicURL`/`FileSizeBytes` are hardcoded `''`/`0` today (never implemented); real URL-building convention found in `buildRVMPublicURL` |
| UADM-06 | Große Rechte-/Beitrags-/Medienbestände serverseitig filterbar/paginierbar, Zähler konsistent | F-01 fan-out confirmed in both `UserGroupRightsTab.tsx:83` and `UserOverviewTab.tsx:148`; `ClampAdminListPage`/`COUNT(*) OVER()` pagination precedent found and directly reusable |
| UADM-07 | Jeder Tab erklärt informational vs. actionable | Current `UserMediaTab.tsx` already has a "Arbeitsfläche öffnen" action pattern to build on; `UserContributionsTab.tsx` has zero action affordance today (pure table) |
| UADM-08 | Gemeinsames Desktop-first Layout, Container-Queries, Tastaturbedienung, kein Overflow | Admin area's existing responsive convention is JS `matchMedia`-based (`useIsMobile()`, 759px), NOT container queries — D26 is a deliberate deviation from that convention; real `@container` usage exists elsewhere in the codebase (`RoleBadgeCard.module.css`) as a citable precedent |
| QUAL-06 | Query-Count-Gates, keine ungebundenen Flachlisten, konsistente Pagination, keine Client-only-Security-Filter | `repository/query_counter.go` + `member_profile_query_budget_test.go` (Phase 131) is a directly reusable constant-query-budget gate pattern; `testsupport/phase137_postgres.go`'s `openPhasePostgres` harness convention is the reusable disposable-DB pattern |

## Project Constraints (from CLAUDE.md)

- Work only on `team4s-linux` (`/home/d1sk/team4s`), never the Windows checkout. Run all edits/tests/builds/migrations on Linux, in Docker containers.
- Go 1.25 + Gin + pgx/v5 backend; Next.js 16 App Router + React 18.3.1 + TypeScript + Vitest 3 frontend.
- **Mandatory global UI primitives**: all user-facing UI must use `@/components/ui` (`Button`, `Select`, `FormField`, `Modal`, `Input`, `Textarea`, `Tabs`, `Drawer`, `Card`, `Table`, `Pagination`, ...). No hand-built native `<select>/<input>/<textarea>/<button>`.
- Correct German umlauts (ä/ö/ü/ß) in every user-facing string — no ASCII substitutes. Applies to JSX text, labels, error messages, placeholders, aria-labels, toasts, and Go response strings.
- Production files ≤ 450 lines; split before they become monolithic (already the stated reason `admin_users_tab_repository.go` was split out of `admin_users_repository.go`).
- Verification runs inside Docker containers, not on the host (`docker exec team4sv30-backend ...`, `docker exec team4sv30-frontend ...`).
- GSD workflow enforcement: no direct file edits outside a GSD command.
- No new worktrees/branches — all phase execution happens directly on `main`.

## Package Legitimacy Audit

**Not applicable.** This phase adds zero new external dependencies. Every reusable building block (`ClampAdminListPage`, `queryCounter`, `openPhasePostgres`, `Pagination`/`FormField`/`Select` UI primitives, `useIsMobile`/CSS-container-query patterns) already exists in the current `go.mod`/`package.json` dependency set. If a plan later proposes any new package, it must go through the full Package Legitimacy Gate at that time — none is currently justified by anything found in this research.

## F-01: Overview-Tab Rights Fan-Out (UADM-06)

**Confirmed exactly as `ext-139-findings.md` describes**, plus one additional nuance the planner needs.

`frontend/src/app/admin/users/tabs/UserOverviewTab.tsx` (`GroupRightsSummarySection`, lines 132-212) is the tab a platform admin sees by default on every user open (`UserDetailPageClient.tsx` `DEFAULT_DETAIL_TAB = 'overview'`). Its `loadSummary()` does:

```ts
// UserOverviewTab.tsx:143-153
const [membershipsResp, matrixResult] = await Promise.all([
  getAdminUserGroupMemberships(userId),
  listRoleCapabilities().catch(() => null),
])
const rightsList = await Promise.all(
  membershipsResp.memberships.map((membership) => getEffectiveRights(membership.fansub_group_id, userId)),
)
```

This is byte-identical in shape to `UserGroupRightsTab.tsx:82-84`. Both call the same real endpoint, `GET /admin/fansubs/:id/app-members/:appUserId/effective-rights` (Phase 137, `admin_routes.go:298`), once per group membership, in parallel.

**What the Overview tab actually renders per group** (`GroupSummaryCard`, lines 90-125), confirmed live in the code — this is the exact shape any replacement must preserve (Phase 138 D-05 locked example: *"New-Subs — Rolle: Co-Leitung / ✓ Gruppe bearbeiten ✓ Mitglieder verwalten ✕ Review freigeben / Keine persönlichen Rechteabweichungen · Keine offenen Claims"*):
- `roleLabel`: membership roles joined with ` + `, resolved through the capability matrix's `label_de`.
- `headlineStates`: **first 3** `EffectiveRightState` entries (`HEADLINE_CAPABILITY_LIMIT = 3`) rendered as `✓/✕ <label>`.
- `hasDeviation`: `states.some(s => s.user_allow || s.user_deny)` → renders "Persönliche Rechteabweichungen vorhanden" vs. "Keine ...".
- `openClaimsCount`: passed in from the overview payload, not from the rights fan-out.

**Two distinct fixes, not one:**
1. **`GetUserGroupMemberships`** itself (`admin_users_tab_repository.go:65-101`) is an unbounded `SELECT ... WHERE fgm.app_user_id = $1` with no `LIMIT`. For a user in many groups this needs the same pagination treatment as contributions/media (D22's "server-side bounded/filterable group membership selection").
2. **The per-group `getEffectiveRights` fan-out** needs a genuinely new **batched, non-N+1 backend endpoint** for the Overview tab specifically — because the Overview tab must render every group's compact summary simultaneously on mount (it cannot defer to "select a group first" the way the Rights tab reasonably can). The new endpoint's shape should return, for every (bounded/paginated) group membership: role label(s), the same first-3 headline `EffectiveRightState`-equivalent entries (or a precomputed `has_deviation` boolean + up to 3 `{action_code, allowed}` pairs), computed server-side in one query — not by calling `ResolveGroupRights` once per group from a loop inside the handler (that would just move the N+1 from HTTP to Go). `permissions.ResolveGroupRights` (Phase 137) is the single source of truth for capability resolution; a new handler can legitimately call it once per group **inside the Go process** as long as it batches the underlying repository reads (membership/roles/overrides) rather than issuing per-group SQL — this mirrors the existing `PreviewGroupRightsCapabilityChange` batch-preview precedent (Phase 138-07) which already computes a hypothetical diff for **every role holder** in one batched load, not one query per holder.

**For `UserGroupRightsTab.tsx` specifically (D22, not the default tab):** because `GET .../effective-rights` is already single-group-scoped, the minimal correct fix here is a **frontend-only** change — do not eagerly `Promise.all` over every membership on tab mount; instead default all `GroupSection`s to collapsed and fetch a single group's rights lazily when the admin expands/selects it (reusing the exact same `getEffectiveRights(groupId, userId)` call, just deferred). This satisfies D22's literal wording ("Do not fetch effective rights for every membership at once ... load only the selected group's rights") without requiring a new backend endpoint for this tab — only for Overview's F-01 batched-summary case, which cannot be lazy because it must render everything at once.

## F-02: Contract Location (UADM-*)

**`ext-139-findings.md`'s literal claim ("no admin-users.yaml exists") is correct but its framing ("admin-user endpoints have no own contract") is not.** Verified structure of `shared/contracts/`:

| File | Format | Contract-tested by Go? |
|------|--------|------------------------|
| `admin-content.yaml` | Custom lightweight DSL (`feature: admin-content-management` / `endpoints: [...]` / `types: {...}`) — **not valid OpenAPI** | No (`grep` for `admin-content.yaml` in `backend/**/*.go` finds zero contract-test references) |
| `admin-capabilities.yaml` | Real `openapi: 3.0.3` | Yes — `backend/internal/handlers/admin_capability_contract_test.go` (`TestEffectiveRightStateProvenanceContract`, `TestCapabilityOverrideSchemasUnchangedContract`) |
| `openapi.yaml` (umbrella, 15,356 lines) | Real `openapi: 3.0.3` | Not specifically for admin/users (see below) |

**All nine current `/admin/users/*` endpoints are already documented — in `admin-content.yaml`, under its Phase-80 section (lines 1669-1833)**, using the DSL's `- name / method / path / auth / query_params / response / description` shape, e.g.:

```yaml
  - name: admin-user-contributions
    method: GET
    path: /api/v1/admin/users/:userId/contributions
    auth:
      required: true
      role: platform_admin
    response:
      status: 200
      type: AdminUserContributionsResult
    description: >
      Contributions-Tab (D-12/D-13). member_id als kanonischer Anker (Migration 0105).
      Vier Gruppen: project_defaults, release_overrides, open_disputes, legacy_historical.
```

`GET /admin/users/:userId/media` is documented the same way at line 1814-1822. Neither of these two entries — nor any `/admin/users/*` entry — appears in `openapi.yaml` at all (`grep -n "/api/v1/admin/users" shared/contracts/openapi.yaml` returns zero matches). By contrast, `admin-capabilities.yaml`'s effective-rights endpoint (Phase 137) **is** duplicated into `openapi.yaml` (line 4165) as well as its own file. The most recent precedent for a NEW admin list surface (Phase 138-05: `/admin/claims`, `/admin/changes`) chose to document those in `admin-capabilities.yaml` (real OpenAPI, contract-tested), not in `admin-content.yaml` — even though conceptually they are "admin list" endpoints of the same family as `/admin/users`.

**Decision the planner must make and name (not decided here):**
- **Option A — extend `admin-content.yaml` in place.** The `admin-user-contributions` and `admin-user-media` entries already exist at those exact paths; Phase 139 only changes their `query_params`/`response.type` shape (adding pagination, filters, grouped response DTOs) and adds `description` notes for the new grouping semantics. Zero new files. Matches "least-disruptive" literally, since these are edits to existing entries, not new endpoints. Any brand-new endpoint (e.g., a batched rights-summary endpoint for F-01) could go here too, in the same Phase-80 section.
- **Option B — put new/changed shapes in `admin-capabilities.yaml`.** Real OpenAPI + has a working Go contract-parity test precedent (`admin_capability_contract_test.go`) the planner could extend for Phase 139's new DTOs, which QUAL-06 rigor arguably favors. This is where the Phase 137/138 rights-family endpoints already live, so a new batched rights-summary endpoint (F-01) fits its existing tag/security block naturally; contributions/media less so (different feature family).
- **A hybrid is legitimate and arguably best-fit given the evidence:** contributions/media projection changes → extend the existing `admin-content.yaml` entries in place (same file, same DSL, matches D-12/D-13/D-15 comment lineage already there); the new UADM-06 rights-summary endpoint (F-01) → add to `admin-capabilities.yaml` (same family as the existing effective-rights endpoint it's adjacent to, gets the contract-test precedent for free).
- **No new `admin-users.yaml` file is needed under any option** — there is no existing convention of one-file-per-endpoint-group at that granularity; `admin-content.yaml` already covers a wide "everything admin-content" surface including `/admin/users/*`.

Whichever option the plan picks, note that `openapi.yaml` registration for `/admin/users/*` is **not** an existing convention to preserve — it was never done for this endpoint family (unlike effective-rights), so skipping it is consistent with current practice, not a regression.

## F-03: No Live Data for Override Detection (UADM-03/D04/D05)

**Confirmed against the live `team4s_v2` database right now:**

```
snapshot_mode | count
---------------+-------
 inherited     |    13
```

Zero `independent` rows exist. Tracing why, in `backend/internal/repository/release_crew_snapshot_repository.go`:

- `SeedInheritedInTx` (called whenever a release version is created/synced) always writes `snapshot_mode='inherited'`, copying the current confirmed project-standard crew.
- `ReplaceInTx` (called by `PUT /admin/release-versions/:versionId/contributions/effective`, i.e. the crew-override editor drawer) **always** writes `snapshot_mode='independent'` on ANY save through that endpoint — **regardless of whether the submitted crew set actually differs from the project standard**. This is the exact mechanism D04 warns about: `independent` alone is not proof of a real difference, because the write path that produces `independent` doesn't check for a difference before writing it.
- No release version in the live database has ever gone through that PUT endpoint with content that survived — meaning both variants D04/D05 must handle (`independent`-but-identical, `independent`-and-different) are currently **untested against real data** and a `nur Abweichungen` filter would show an empty result set today.

**No existing "insert demo/scenario rows" migration pattern exists** in `database/migrations/` (migrations there only seed lookup/reference tables — `0048_seed_theme_types.up.sql`, `0028_seed_media_types.up.sql`, `0085_role_definitions_seed.up.sql` — never scenario/demo content rows). **A directly reusable pattern does exist**, though, in `scripts/`:

- `scripts/seed-member-profile-fixtures.mjs` + `scripts/README-seed.md` + `scripts/member-profile-fixture.manifest.json`: a Node 18+, zero-npm-dependency, **API-driven** (not raw SQL), idempotent seed script that populates two real reference profiles with a documented scenario matrix, run via `docker exec team4sv30-frontend node /tmp/seed.mjs` (no host-level Node on this VM). It authenticates via real Keycloak direct-grant tokens and calls only real creation/admin endpoints.

**The exact API call needed to produce a real `independent`-and-different row is already identified**: `PUT /api/v1/admin/release-versions/:versionId/contributions/effective` (`ReplaceEffectiveContributionsForVersion`, `admin_content_fansub_releases_contributions_handlers.go:66`) with a crew payload that differs from the anime+group's `release_version_id IS NULL` project-standard rows. A second call with a payload that is set-equal to the project standard would produce the `independent`-but-identical case D04/D05 must NOT flag as a deviation.

**Decision the planner must make and name (not decided here, per F-03's own instruction):** either (a) extend `scripts/seed-member-profile-fixtures.mjs` (or add a small sibling script following its exact conventions) to create one demo project with a genuine `independent`+different override and one `independent`+identical row, so live UAT of the `nur Abweichungen` filter is possible, or (b) explicitly document in the plan that override-detection correctness is **automated-test-only** for this phase (integration tests against a disposable Postgres fixture, per the Phase 131/137 `openPhasePostgres` pattern below, seeding exactly these two `release_crew_snapshots` rows) and that live UAT cannot exercise this path without a prerequisite manual data-entry step. Given Phase 138's GAP-03 precedent (the same "no real deviation data" problem blocked non-deniable-case UAT), leaving this undecided risks repeating that exact gap.

## Standard Stack

No new libraries. Existing stack reused as-is:

### Core (already in use, verified via `go.mod`/`package.json`)
| Library | Version | Purpose | Why Standard (existing) |
|---------|---------|---------|--------------------------|
| `github.com/jackc/pgx/v5` | current (`go.mod`) | Postgres driver, `pgx.QueryTracer` for the query-budget gate | Already the sole DB driver; `queryCounter` (QUAL-06 gate) is built directly on `pgx.QueryTracer` |
| `github.com/gin-gonic/gin` | current | HTTP handlers | Existing handler/route convention |
| React 18.3.1 / Next.js 16 App Router | current | Tab UI | Existing tab/URL-sync convention (`?tab=`) |
| `github.com/stretchr/testify` | current | Go test assertions | Used by every reusable pattern cited below |

No `Alternatives Considered` table — there is no library decision to make in this phase.

## Architecture Patterns

### System Architecture Diagram

```
Admin browser (UserDetailPageClient.tsx, ?tab=contributions|roles-rights)
        │
        │ GET /admin/users/:userId/contributions?anime=&group=&role=&onlyDeviations=&from=&to=&limit=&offset=
        │ GET /admin/users/:userId/media?anime=&group=&releaseOrEpisode=&mediaType=&from=&to=&limit=&offset=
        │ GET /admin/users/:userId/rights-summary  (NEW, batched, F-01)
        │ GET /admin/fansubs/:id/app-members/:appUserId/effective-rights (EXISTING, single-group, now lazy-fetched)
        ▼
Gin handler (admin_users_handler.go) — requirePlatformAdminIdentity gate (unchanged)
        │
        ▼
Repository layer (admin_users_tab_repository.go)
   ├─ filtered CTE (server-side WHERE, D10/D14)                     ┐
   ├─ project-block / release-episode-block grouping (NEW SQL)      │  all in ONE
   ├─ range-collapse over episodes.sort_index (NEW SQL/window fn)   │  query, no
   ├─ override-vs-standard semantic diff (NEW SQL, D04/D05)         │  per-row
   ├─ COUNT(*) OVER() for the SAME filtered/grouped dataset (D24)   │  round-trip
   └─ ClampAdminListPage(limit, offset)                             ┘
        │
        ▼
Postgres (team4s_v2): anime_contributions, anime_contribution_roles,
   release_crew_snapshots, release_versions, fansub_releases, episodes,
   release_version_media, media_assets, media_files
        │
        ▼
Response DTO → frontend grouped cards → "Release-Medien öffnen" links to
   the EXISTING canonical workspace: /me/releases/[versionId]/workspace
   (no new edit surface, D15/D16/UADM-07)
```

### Recommended Backend Structure (extends, does not replace)

```
backend/internal/
├── models/admin_users.go                     # extend: new grouped/paginated DTOs
│                                               #   alongside (not replacing) the raw
│                                               #   AdminContributionItem/AdminMediaItemSummary
│                                               #   row shapes, which the new grouping
│                                               #   query still scans internally
├── repository/
│   ├── admin_users_tab_repository.go          # ListUserContributions/GetUserMedia:
│   │                                           #   replace unbounded flat fetch with
│   │                                           #   paginated grouped query
│   ├── admin_users_queries.go                 # NEW query var(s) alongside
│   │                                           #   adminUsersListQuery/adminUsersOverviewQuery
│   │                                           #   (existing file, same convention)
│   └── query_counter.go                       # REUSE as-is (package-private, no changes needed)
├── handlers/admin_users_handler.go             # extend: parse new filter/pagination query
│                                               #   params (mirrors ListUsers's existing
│                                               #   limit/offset/status parsing)
└── testsupport/phase139_postgres.go            # NEW, mirrors phase137_postgres.go exactly:
                                                # openPhasePostgres() + prerequisite tables
                                                # for anime_contributions/release_versions/
                                                # episodes/release_crew_snapshots/
                                                # release_version_media/media_assets
```

### Pattern 1: Page-First CTE with dynamic filters + `COUNT(*) OVER()` (D08/D09/D12/D13/D24)

**What:** the exact reusable shape for "filters, count, and items describe the same server-side dataset" (D24), already proven twice in this codebase.
**When to use:** both the contributions and media list endpoints.
**Example (from `member_claims_list_repository.go`, the most directly analogous — dynamic optional filters via numbered placeholders, never string-concatenated values):**
```go
// Source: backend/internal/repository/member_claims_list_repository.go:58-190
func ClampAdminListPage(limit, offset int) (int, int) {
    if limit <= 0 { limit = adminListDefaultLimit }   // 25
    if limit > adminListMaxLimit { limit = adminListMaxLimit } // 100
    if offset < 0 { offset = 0 }
    return limit, offset
}
// ... dynamic WHERE clause built from $N placeholders only, then:
// SELECT ..., COUNT(*) OVER() AS total_count FROM ... WHERE 1=1 <dynamic> ORDER BY ... LIMIT $n OFFSET $n
```
For Phase 139, `COUNT(*) OVER()` must run over the **grouped** (project-block / release-episode-block) result, not the raw row count — this is new: neither existing precedent groups before counting. The grouping key for contributions is `(anime_id, fansub_group_id)`; for media it's `(anime_id, fansub_group_id, release_version_id_or_episode_id)`. A `COUNT(DISTINCT ...) OVER()` over the grouping key columns, computed inside the same CTE that does the grouping, keeps this a single query.

### Pattern 2: Constant/bounded query-budget gate (QUAL-06/D25)

**What:** a `pgx.QueryTracer` that counts queries per code path, wired only into tests, asserting the count does not grow with data volume.
**When to use:** directly for the new contributions/media list endpoints (assert query count is identical for 3 vs. 30 anime+project blocks).
**Example:**
```go
// Source: backend/internal/repository/query_counter.go (existing, package-private, reuse as-is)
type queryCounter struct{ queries atomic.Int64 }
func (c *queryCounter) TraceQueryStart(...) context.Context { c.queries.Add(1); return ctx }
func (c *queryCounter) reset() { c.queries.Store(0) }
func (c *queryCounter) count() int { return int(c.queries.Load()) }

// Source: backend/internal/repository/member_profile_query_budget_test.go:170-213 (Phase 131 pattern)
// seed few vs many, reset(), call once, assert require.Equal(fewCount, manyCount)
```

### Pattern 3: Disposable per-phase Postgres test harness (QUAL-06 fixture requirement)

**What:** `openPhasePostgres` (shared helper, `testsupport/phase106_postgres.go`) + a per-phase file that defines its own prerequisite-table bootstrap function, guarded by a database-name regex (`team4s_phaseNNN_test_[a-z0-9]+`) so it can never run against `team4s_v2`.
**When to use:** a new `testsupport/phase139_postgres.go`, env var `TEAM4S_PHASE139_TEST_DSN`. Because Phase 139 touches `anime_contributions`, `release_crew_snapshots`, `release_versions`, `fansub_releases`, `episodes`, `release_version_media`, `media_assets`, `media_files` — a much wider table set than Phase 137's hand-assembled minimal-schema approach — the plan should explicitly decide between (a) hand-assembling only the needed columns/constraints (Phase 137's approach, more verbose but self-contained) or (b) a full-schema disposable DB via `pg_dump --schema-only` of `team4s_v2` (Phase 131's approach, referenced in its own test file but with no found provisioning script — it was apparently created manually per session, same as `TEAM4S_PHASE137_TEST_DSN`). **No automated DSN-provisioning script exists for either convention** — every phase's summary docs describe a human/executor manually running `createdb team4s_phaseNNN_test_XXXX` for their own session and dropping it afterward (see `137-03-SUMMARY.md`, `137-08-SUMMARY.md`). The executor must budget for this manual step; tests SKIP (not FAIL) when the DSN is unset, so CI/normal runs stay green without it.
**Example:**
```go
// Source: backend/internal/testsupport/phase137_postgres.go:27-37 (mirror exactly, new prerequisites)
func OpenPhase139Postgres(t *testing.T) *pgxpool.Pool {
    t.Helper()
    return openPhasePostgres(t, phase139DSNEnv, phase139DatabasePattern, "phase139_", phase139SchemaPattern, createPhase139Prerequisites)
}
```

### Pattern 4: Range-collapse over consecutive episode ordering (D06/D07/UADM-04)

**What:** the ONLY existing implementation of "collapse consecutive same-value entries into a compact range label" in this codebase — currently client-side, explicitly flagged in CONTEXT.md as visual reference only, not the Phase-139 implementation.
**Where:** `frontend/src/components/contributions/AnimeGroupCard.tsx:57-139` (`buildEpisodeRanges`) — iterates contributions sorted by `episode_sort_index`, extends a `[rangeStart, rangeEnd]` window while `currSortIndex === prevSortIndex + 1`, and only breaks the range into a new entry when either the sort index isn't consecutive OR (implicitly, since it's grouped by role first) the role differs. Phase 139's server-side equivalent needs the same consecutive-index logic PLUS a same-effective-content check (D04) as the second break condition — SQL window functions (`LAG()` + a running "group id" via `SUM(CASE WHEN break THEN 1 ELSE 0 END) OVER (ORDER BY sort_index)`) are the standard Postgres idiom for gap-and-island grouping and should be evaluated as the server-side translation of this exact algorithm.
**No existing SQL implementation of this pattern exists anywhere in the codebase** — this is the one genuinely new, non-copy-paste piece of SQL logic in the phase, and the most likely source of underestimated plan/task count if treated as "just add pagination."

### Anti-Patterns to Avoid

- **Resolving capabilities in a Go loop, once per group, each hitting SQL separately** (moves F-01's N+1 from HTTP to Postgres without fixing it). Use the `PreviewGroupRightsCapabilityChange` batch-load precedent (Phase 138-07): load membership/roles/overrides for ALL groups in one query, then run the (already-in-memory, no-SQL) `ResolveGroupRights`/`evaluateGroupRights` logic once per group over already-loaded data.
- **Counting raw rows instead of grouped blocks** (violates D09/D13 directly — `total_contributions_count` in the existing `AdminUserOverview`/`AdminUserListItem` DTOs already counts raw `anime_contributions` rows; that field's existing semantics must NOT change, since it's used elsewhere (the admin user list `total_contributions_count` badge), but the NEW paginated contributions/media endpoints' `meta.total` must count grouped blocks, not rows — these are two different counts with two different meanings that will coexist in the same DTO family; naming/documentation must make this unambiguous).
- **Client-side re-grouping after the server already paginated** (D23, explicitly forbidden) — the existing `UserMediaTab.tsx`'s `groupByReleaseVersion()` (client-side `Map` grouping over the full unbounded response) is exactly the anti-pattern D23 forbids and must be deleted, not extended, once the backend does the grouping.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pagination clamp (limit/offset defaults+caps) | A new ad-hoc clamp function per endpoint | `repository.ClampAdminListPage` (exported, already shared by `ListClaims`/`ListChanges`) | Prevents the exact clamp-value drift the doc comment on `ClampAdminListPage` warns about |
| Query-count instrumentation | A new tracer type | `repository.queryCounter` (package-private, `query_counter.go`) | Already satisfies `pgx.QueryTracer`; adding a second one in the same package would be a duplicate abstraction |
| Disposable test-DB bootstrap/guard logic | New regex/connection-validation code per phase | `testsupport.openPhasePostgres` (shared helper in `phase106_postgres.go`) | Six phases already share this exact helper; a seventh divergent implementation would be an unjustified anti-pattern per this codebase's own conventions |
| Public media URL construction | Re-deriving `/media/...` paths ad hoc in the admin-users repo | Same convention as `buildRVMPublicURL` (`storage-relative path` → strip `mediaStorageDir` prefix → prepend `/media/`) | `GetUserMedia`'s current `PublicURL`/`FileSizeBytes` are hardcoded empty/0 specifically because this derivation was never wired in; reuse the existing, working derivation rather than inventing a second one |
| URL-synced list filters | A bespoke `useState` + manual `URLSearchParams` wiring | `useUserListFilters.ts` / `useClaimsListFilters.ts` pattern (debounced free-text, immediate selects, `offset` in URL, `router.replace(..., {scroll:false})`, never `router.push`) | Exact precedent for D10/D14's required filter sets already exists twice in this admin area |

**Key insight:** every piece of this phase except the range-collapse/override-diff SQL (Pattern 4) and the F-01 batched rights-summary endpoint is a mechanical application of an existing, working pattern already used 2-6 times elsewhere in `backend/internal/repository/`. The plan should budget disproportionately more care/time for those two genuinely new pieces of logic than for the pagination/filtering/query-budget scaffolding around them.

## Common Pitfalls

### Pitfall 1: Confusing `snapshot_mode='independent'` with "is an override"
**What goes wrong:** filtering/highlighting rows purely on `snapshot_mode='independent'` (or on `release_version_id IS NOT NULL`) produces false-positive overrides for every release version an admin has ever opened the crew-override drawer on and saved without actually changing anything.
**Why it happens:** `ReplaceInTx` (`release_crew_snapshot_repository.go:294-302`) unconditionally sets `independent` on any save through that endpoint — there is no existing "did this actually change" check anywhere in the write path.
**How to avoid:** compute the semantic diff (member_id + role_codes set comparison) between the release-version's `anime_contributions` rows (`release_version_id = X`) and the project standard's rows (`release_version_id IS NULL`, same anime+group) at READ time, in the new grouping query — this diff does not exist anywhere in the codebase today and must be written new.
**Warning signs:** a `nur Abweichungen` filter that returns rows whose crew is set-identical to the project standard.

### Pitfall 2: Two different "count" semantics colliding in the same feature area
**What goes wrong:** `AdminUserOverview.total_contributions_count` and `AdminUserListItem.total_contributions_count` (existing, live in production, computed via `COUNT(*)` over raw `anime_contributions` rows in `admin_users_queries.go`) look like they should mean the same thing as the new paginated-contributions-endpoint's `meta.total` (grouped project-block count, D09) — they must NOT be unified, since the overview/list-page counts are a different, already-shipped feature (Phase 80 D-05 aggregate counts) with different consumers.
**Why it happens:** same underlying table, adjacent code, similar field names.
**How to avoid:** keep the existing raw-row counts in `AdminUserOverview`/`AdminUserListItem` completely untouched; introduce the new grouped-block count only in the new paginated response's `meta` block, with an unambiguous name (e.g. `meta.total` scoped to the new endpoint's own response type, not reusing `TotalContributionsCount`).
**Warning signs:** a plan task that touches `adminUsersOverviewQuery` or `adminUsersListQuery` "to keep counts consistent" — that would be scope creep outside this phase's stated boundaries (CONTEXT.md explicitly excludes redesigning adjacent surfaces).

### Pitfall 3: Treating the F-01 fix as "just call `getEffectiveRights` from the Overview tab too"
**What goes wrong:** naively adding the same `Promise.all` fan-out to a "fixed" Overview tab still produces the same 1-request-per-group fan-out — just now confirmed present in TWO tabs instead of one, satisfying nothing.
**Why it happens:** the existing endpoint genuinely is single-group-scoped; there is no bundled multi-group endpoint to call instead, so "just point Overview at the same thing" is the path of least resistance.
**How to avoid:** the Overview tab specifically needs new backend batching (see F-01 section above) — this is not optional/discretionary, it's the actual content of UADM-06 as applied to the default tab.

### Pitfall 4: CSS container queries introduced inconsistently with the rest of `admin/`
**What goes wrong:** the admin area's existing responsive convention (`useIsMobile()` + `matchMedia('(max-width: 759px)')`, used in `RoleHoldersTable.tsx`, `RoleCapabilityImpactPreviewModal.tsx`, `RolesClient.tsx`, `ClaimsClient.tsx`) is explicitly called out in those files' own comments as "D-32: reuse, kein zweiter Breakpoint-Wert" (no second breakpoint value). D26/UADM-08 for Phase 139 explicitly mandates CSS/container-query-based degradation instead — a deliberate, binding deviation from that D-32 precedent for THIS phase's new UI only.
**Why it happens:** copy-pasting the nearest neighboring admin component's pattern (matchMedia) is the path of least resistance and IS the established convention everywhere else in `admin/`.
**How to avoid:** the plan must explicitly note that D26 overrides D-32 for Phase 139's new grouped-card components only, and should NOT retroactively convert existing `useIsMobile()` call sites (out of scope). A real `@container` precedent to follow already exists in this codebase at `frontend/src/components/profile/RoleBadgeCard.module.css:241` (`@container member-badge-carousel (max-width: 480px)`), proving `container-type`/`@container` syntax works in this build without a new dependency.

### Pitfall 5: Inline `style={{}}` objects can't express container queries
**What goes wrong:** all three current tab components (`UserOverviewTab.tsx`, `UserContributionsTab.tsx`, `UserMediaTab.tsx`) style themselves entirely via inline `style={{...}}` objects — zero CSS Modules today. Container queries require real CSS (`container-type`, `@container` at-rules) which cannot be expressed as inline styles.
**Why it happens:** the existing tabs never needed responsive behavior beyond what the shared `@/components/ui` primitives already provide.
**How to avoid:** the plan must budget for introducing a dedicated `.module.css` file for the new grouped-card UI (following the `contributions.module.css`/`AnimeGroupCard.module.css`/`RoleBadgeCard.module.css` convention), not extending the inline-style pattern.

## Code Examples

### Existing "single-group, real endpoint" the Rights tab fan-out fix reuses unchanged
```ts
// Source: frontend/src/lib/api.ts:10053-10070 (unchanged, only the CALL SITE timing changes)
export async function getEffectiveRights(
  fansubGroupId: number,
  appUserId: number,
): Promise<EffectiveRightState[]> {
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubGroupId}/app-members/${appUserId}/effective-rights`,
    { cache: "no-store" },
  )
  // ...
}
```

### Existing broken media projection fields that must be actually implemented, not just piped through
```go
// Source: backend/internal/repository/admin_users_tab_repository.go:260-275 (current, GetUserMedia)
rows, err := r.db.Query(ctx, `
    SELECT
        rvm.media_asset_id,
        COALESCE(mt.name, ma.mime_type, 'media'),
        COALESCE(ma.file_path, ''),
        ''::text,          -- PublicURL: hardcoded empty, never derived
        0::bigint,          -- FileSizeBytes: hardcoded zero, never joined from media_files
        rvm.created_at::text,
        'release_version:' || rvm.release_version_id::text   -- OwnerContext (D19: remove this raw form)
    FROM release_version_media rvm
    JOIN media_assets ma ON ma.id = rvm.media_asset_id
    ...
`, appUserID)
```

### Existing working public-URL derivation to copy the convention from (not the code itself — different repo/handler)
```go
// Source: backend/internal/handlers/admin_content_release_version_media.go:535-541
func (h *AdminContentHandler) buildRVMPublicURL(storagePath string) string {
    rel := strings.TrimPrefix(storagePath, h.mediaStorageDir)
    rel = strings.TrimPrefix(rel, "/")
    rel = strings.ReplaceAll(rel, "\\", "/")
    return "/media/" + rel
}
```

## State of the Art

| Old Approach | Current/Required Approach | When Changed | Impact |
|--------------|---------------------------|---------------|--------|
| `ListUserContributions`/`GetUserMedia`: unbounded flat arrays, all rows, no filters, no pagination | Server-side grouped, filtered, paginated projections (D02-D14) | Phase 139 (this phase) | Every consumer of `AdminUserContributionsResponse`/`AdminUserMediaResponse` (currently just the two tab components) must switch to a paginated response shape |
| Client-side `groupByReleaseVersion()` in `UserMediaTab.tsx` | Server pre-groups by Release/Episode block | Phase 139 | The client-side grouping function must be deleted, not kept as a fallback (D23) |
| `snapshot_mode='independent'` treated as sufficient override signal (nowhere explicitly, but implicitly available since no comparison exists yet) | Semantic diff against project standard required before labeling an override (D04/D05) | Phase 139 | New SQL/Go logic, no existing precedent |
| Admin area's JS `matchMedia`-based responsive convention (D-32, Phase 138) | CSS container-query-based (D26, Phase 139, new UI only) | Phase 139 | Scoped deviation, not a retroactive convention change |

**Deprecated/outdated:**
- The `Berechtigung aktiv/fehlt` badge in `UserMediaTab.tsx` (`hasScopePermission()`, parses `owner_context` string for `release_version:` prefix) — D19 requires removal; it was never a real permission check (own code comment: "Prüft ob Berechtigung aktiv ist" but the underlying signal is just presence of a non-empty owner_context string, unrelated to any actual authorization check).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `SUM(CASE WHEN break THEN 1 ELSE 0 END) OVER (ORDER BY sort_index)` (gap-and-island window-function idiom) is the right server-side translation of `AnimeGroupCard.tsx`'s client-side range-collapse loop | Architecture Pattern 4 | If wrong, a slower or more complex equivalent (e.g. recursive CTE, or grouping in Go after a plain ordered fetch) may be needed instead — this is a suggested technique, not verified against a working Phase-139 implementation (none exists yet) |
| A2 | A full-schema `pg_dump --schema-only`-based disposable DB (Phase 131's apparent approach) is preferable to hand-assembling the ~8 needed tables (Phase 137's approach) for `testsupport/phase139_postgres.go`, given the wider table surface | Architecture Pattern 3 | If wrong, the hand-assembly approach (more verbose, more explicit control, matches the majority of existing `testsupport/phaseNNN_postgres.go` files) is the safer default and should be used instead — no dump-based provisioning script was actually found, only inferred from the Phase-131 test file's comments |
| A3 | Extending `admin-content.yaml`'s existing Phase-80 section (Option A) is achievable without automated contract-parity risk, since no Go test currently checks that file | F-02 | If a future phase adds contract-parity tooling for `admin-content.yaml`, documentation drift introduced now would only surface then — low near-term risk but worth flagging |

**If this table is empty:** N/A — see rows above; all three are technique/tooling-choice assumptions, not factual claims about current code behavior (all factual claims in this document were verified directly against source files or the live database).

## Open Questions

1. **Should the F-01 batched rights-summary endpoint be a genuinely new route, or an additive field on the existing `GET /admin/users/:userId/overview` response?**
   - What we know: `AdminUserOverview` (existing DTO) already carries `open_claims_count` etc.; `GroupRightsSummarySection` in the Overview tab currently does its OWN separate fetch (`getAdminUserGroupMemberships` + fan-out), not reading anything from the overview payload.
   - What's unclear: whether folding the new batched rights summary into the existing `/overview` response (one fetch instead of two) is preferred over a dedicated new endpoint — both close F-01, they differ only in DTO/route shape.
   - Recommendation: the planner should decide based on whether `GetUserOverview`'s existing single-query-per-lateral-join pattern (`admin_users_queries.go`, `adminUsersOverviewQuery`) can cleanly absorb a per-group array without breaking its existing `LEFT JOIN LATERAL` structure; if it can't cleanly, a separate endpoint is safer.
   - **(RESOLVED)** Planner chose a dedicated new route, `GET /admin/users/:userId/rights-summary` (139-05 Task 3, F-02 Option B), rather than folding into `GetUserOverview`'s response — keeps the existing `adminUsersOverviewQuery` LATERAL-join query untouched and gives the batched summary its own contract entry in `admin-capabilities.yaml`.

2. **Exact wave/plan count.** The external package's 6-plan estimate (2 backend projections + 2 UI rebuilds + rights-scaling + 1 gate) is plausible for the SCAFFOLDING (pagination/filters/DTOs) but likely undercounts the two genuinely novel pieces of logic this research identified with no existing precedent: the range-collapse-with-override-break window-function SQL (Pattern 4) and the F-01 batched capability-summary endpoint. Phase 138 needed 18 plans for comparable breadth, but Phase 138 also touched many more distinct surfaces (claims, changes, roles, guided flows) than Phase 139's tighter three-workstream scope. Recommendation: budget the contributions-projection workstream as its own multi-plan wave (query + DTO + endpoint + tests, likely 2-3 plans on its own given zero existing precedent for the diff/range logic), rather than folding it into a single "backend projections" plan alongside media (which has much more existing precedent to lean on, per Pattern in `buildRVMPublicURL`/`ListReleaseVersionMedia`).
   - **(RESOLVED)** Final structure landed at 10 plans across 5 waves (139-01 foundation, 139-02 frontend types, 139-03 contributions grouping/diff TDD, 139-04 media projection, 139-05 batched rights-summary, 139-06 QUAL-06 gates + F-03 seed data, 139-07/08/09 frontend tab rewrites, 139-10 live UAT) — confirming the recommendation to budget contributions and rights-summary as their own dedicated plans rather than folding them into a single "backend projections" plan.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker Compose stack (`team4sv30-backend`, `team4sv30-db`, `team4sv30-frontend`) | All verification (CLAUDE.md mandate) | ✓ | backend/frontend/db all `Up`, db `healthy` | — |
| `team4s_v2` live Postgres, direct psql access | Live schema/data verification (done during this research) | ✓ | Postgres 16 | — |
| `TEAM4S_PHASE139_TEST_DSN` (new, phase-specific disposable DB) | QUAL-06 real-Postgres integration/query-budget tests | ✗ (not yet created — no phase's DSN is ever pre-provisioned; each phase's executor creates + drops its own disposable DB per session, per documented Phase 137/138 convention) | — | SKIP-not-FAIL: tests using `openPhasePostgres` skip cleanly when unset (existing convention, zero risk to CI) |
| `docker exec team4sv30-frontend node ...` (for any F-03 seed-script extension) | Optional F-03 demo-data path | ✓ (container has Node; confirmed via existing `scripts/seed-member-profile-fixtures.mjs` usage docs) | Node 18+ in `team4sv30-frontend` image | — |

**Missing dependencies with no fallback:** none — the one "missing" dependency (`TEAM4S_PHASE139_TEST_DSN`) has a documented, already-used-six-times fallback (SKIP, manual per-session DB creation by the executor).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Backend framework | Go `testing` + `testify`, real-Postgres tier gated by phase-specific DSN env vars (SKIP if unset) |
| Frontend framework | Vitest 3 |
| Backend config file | none (stdlib `go test`) |
| Frontend config file | `frontend/vitest.config.ts` |
| Quick run command (backend, scoped) | `docker exec team4sv30-backend sh -c "cd /app && go test ./internal/repository/... ./internal/handlers/... -run AdminUsers"` |
| Quick run command (frontend, scoped) | `docker exec team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/users"` |
| Full suite command (backend) | `docker exec team4sv30-backend sh -c "cd /app && go test ./..."` |
| Full suite command (backend, real-Postgres tier) | `docker exec team4sv30-backend sh -c "cd /app && TEAM4S_PHASE139_TEST_DSN=<disposable dsn> go test ./internal/repository/... ./internal/testsupport/..."` |
| Full suite command (frontend) | `docker exec team4sv30-frontend sh -c "cd /app && npx vitest run"` |

### Confirmed CURRENT baseline (run live on this host 2026-08-24, in containers, per CLAUDE.md)

**This baseline is materially different from the numbers quoted in 139-CONTEXT.md / ext-139-findings.md ("5 frontend test files / 25 errors", "~29 backend errors") — those numbers are stale.** The actual current state:

**Frontend (`npx vitest run`, full suite):** `17 failed test files | 259 passed | 1 skipped (277 total)`; `46 failed | 2022 passed | 1 skipped | 3 todo (2072 total)`; 11 uncaught exceptions.
- **The 5 files CONTEXT.md/findings named are still failing** and match: `FansubAppMembersSection.test.tsx` (8/8 failed), `admin/fansubs/[id]/edit/page.test.tsx` (12/38 failed), `useGroupMembersTab.test.ts` (2/7 failed), `UserContributionsTab.test.tsx` (2/6 failed — confirmed still the Phase-136 hex-color-normalization-vs-stale-fixture cause, unrelated to Phase 139), `ResponsiveImage.config.test.ts` (1/12 failed).
- **12 additional files are now ALSO failing** that were not in the documented baseline: `MemberBadgeChain.test.tsx`, `members/[slug]/page.test.tsx`, `me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx`, `ReleaseGallery.test.tsx`, `MemberCurrentProjectsSection.test.tsx`, `ProjectMemberReleasesSection.test.tsx`, `MembershipsSection.test.tsx`, `PublicNoteCard.test.tsx`, `ContributionCard.test.tsx`, `api.no-token-boundary.test.ts`, `v12-projection-contract.test.ts`, `mitwirkende/[memberSlug]/page.test.tsx`. None of these touch any Phase-139 file — they are pre-existing debt accumulated since the CONTEXT.md snapshot was written (likely from quick-tasks/other phases between Phase 138 and now), out of scope for Phase 139, but the executor must not be surprised by a much larger failing-file count than documented.

**Backend (`go test ./...`, full suite):** `65 total --- FAIL lines` across three packages (matches the Phase-137-08-documented "65 failures, six root-cause buckets" order of magnitude): `internal/handlers` (24 failures, nil-`permissions.Service.LoadCache`/missing-env-var bucket, consistent with the documented ~29 estimate), `internal/migrations` (5 failures, `TEAM4S_PHASE128_TEST_DSN` unset), `internal/repository` (36 failures: `TEAM4S_PHASE128_TEST_DSN` unset + unreachable `192.168.235.196:18093` live UAT server + one real assertion failure `TestEvaluateMemberMutationConflictBlocksLastActiveManager`). `internal/permissions` and `internal/services` are fully green. `go build ./...` is clean. **Zero currently-failing backend test touches `admin_users_handler.go`, `admin_users_tab_repository.go`, or any admin_users-prefixed test name** — the Phase-139 backend seam starts from a green baseline.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UADM-02 | Contributions grouped by anime+project, standard shown once | integration (real Postgres) | `TEAM4S_PHASE139_TEST_DSN=... go test ./internal/repository/... -run TestListUserContributionsGrouped` | ❌ Wave 0 |
| UADM-03 | Only semantic deviations flagged as override | integration (real Postgres, seeded `independent`-identical + `independent`-different rows per F-03) | same as above, `-run TestListUserContributionsOverrideDetection` | ❌ Wave 0 |
| UADM-04 | Identical version assignments collapse into ranges | unit (pure function, if range-collapse is extracted to testable Go) or integration | `go test ./internal/repository/... -run TestContributionRangeCollapse` | ❌ Wave 0 |
| UADM-05 | Media grouped by anime/project/release, links to canonical workspace | integration + frontend component test | backend: `-run TestGetUserMediaGrouped`; frontend: `npx vitest run src/app/admin/users/tabs/UserMediaTab` | ❌ Wave 0 (frontend file exists but must be rewritten) |
| UADM-06 | Filterable/paginable at scale, consistent counts | integration (high-volume fixture) | `-run TestListUserContributionsPaginationDrift` / `TestListUserContributionsQueryBudget` | ❌ Wave 0 |
| UADM-07 | Tabs state informational vs. actionable | frontend component test (text assertion) | `npx vitest run src/app/admin/users/tabs` | ❌ Wave 0 (new assertions on existing/rewritten files) |
| UADM-08 | Container-query responsive, keyboard-safe, no overflow | frontend component/visual test (limited automatable coverage — CSS overflow/container-query behavior is not fully assertable in jsdom) | `npx vitest run` (partial) + manual/UAT verification | ⚠️ Partial — flag as needing manual verification, matching this codebase's existing `useIsMobile()` test convention (matchMedia mocked, not real viewport) |
| QUAL-06 | Query-count gate, no N+1, pagination-drift protection | integration (real Postgres, `queryCounter`) | `TEAM4S_PHASE139_TEST_DSN=... go test ./internal/repository/... -run TestPhase139.*QueryBudget` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** scoped `go test ./internal/repository/... ./internal/handlers/... -run AdminUsers` (fast, no real-Postgres tier) + scoped `npx vitest run src/app/admin/users`
- **Per wave merge:** full `go test ./...` (SKIP-tier included) + full `npx vitest run`, PLUS the real-Postgres tier with a disposable `TEAM4S_PHASE139_TEST_DSN` (executor must create/drop it manually per the documented convention — see Environment Availability)
- **Phase gate:** full suite green (accounting for the documented, now-corrected pre-existing baseline above) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/internal/testsupport/phase139_postgres.go` — new disposable-DB harness (mirrors `phase137_postgres.go`), covers `anime_contributions`/`anime_contribution_roles`/`release_crew_snapshots`/`release_versions`/`fansub_releases`/`episodes`/`release_version_groups`/`release_version_media`/`media_assets`/`media_files`
- [ ] `backend/internal/repository/admin_users_contributions_query_test.go` (or similar) — covers UADM-02/03/04, including the F-03 `independent`-identical vs. `independent`-different fixture pair
- [ ] `backend/internal/repository/admin_users_media_query_test.go` — covers UADM-05
- [ ] `backend/internal/repository/admin_users_query_budget_test.go` — covers QUAL-06 (constant-query-budget gate, few-vs-many fixture, mirrors `member_profile_query_budget_test.go`)
- [ ] Frontend: `UserContributionsTab.test.tsx` full rewrite (already red on unrelated Phase-136 grounds — must cleanly separate pre-existing failure from new assertions)
- [ ] Frontend: `UserMediaTab.test.tsx` (does not appear to exist today — `find` shows no file by that name; confirm before assuming rewrite vs. net-new)
- [ ] Frontend: new test coverage for the F-01 Overview-tab batched-summary fetch replacing the fan-out

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | Unchanged — `requirePlatformAdminIdentity` gate already enforced on every `/admin/users/*` route, not touched by this phase |
| V3 Session Management | No | Unchanged |
| V4 Access Control | Yes | Every new/changed endpoint MUST keep the existing `requirePlatformAdminIdentity(c, h.authzRepo, "")` gate as its first handler action (matches all 9 existing `admin_users_handler.go` entry points) — this is the platform-admin-only pattern this entire feature area already follows |
| V5 Input Validation | Yes | All new filter query params (anime id, group id, role code, date range, media type) MUST be validated/parameterized the same way `ListUsers`'s existing `q`/`status`/`global_role`/`limit`/`offset` parsing does — never string-concatenated into SQL (matches `ListClaims`'s explicit numbered-placeholder-only convention, `T-138-11`) |
| V6 Cryptography | No | Not applicable — no new secrets/tokens/crypto in this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| SQL injection via new filter params (anime/group/role/date-range) | Tampering | Parameterized queries only (`$N` placeholders), exact pattern already enforced in `ListClaims`/`ListChanges` |
| IDOR: a platform-admin-only endpoint accidentally exposing another user's data without an ID-ownership check | Elevation of Privilege | Not a new risk here — every existing `/admin/users/:userId/*` endpoint is inherently "any platform admin can view any user," which is the INTENDED behavior for this admin surface (not a defect); no per-target-user scoping is expected or should be added |
| Client-only "no items match" filter (D23 already forbids client-side regrouping, which is the same category of risk QUAL-06 calls out as "Client-only-Sicherheitsfilter") | Tampering / Information Disclosure | Server-side filtering is already the D10/D14 requirement; do not add a client-side "hide" as a UI convenience shortcut for any filter, since that would silently diverge item/count/filter coherence (D24) even without a security implication specifically |

## Sources

### Primary (HIGH confidence — verified directly against repo/live DB on this host)
- `backend/internal/models/admin_users.go` — full read, all DTOs including hardcoded `ProjectDefaults`/`ReleaseOverrides`/`OpenDisputes`/`LegacyHistorical` arrays and media fields
- `backend/internal/repository/admin_users_tab_repository.go` — full read, all 6 tab query methods
- `backend/internal/repository/admin_users_queries.go` — full read, existing pagination-adjacent (list-page CTE) and overview query patterns
- `backend/internal/handlers/admin_users_handler.go` — full read, all 9 route handlers
- `backend/cmd/server/admin_routes.go` — full read, full route table
- `backend/internal/repository/release_crew_snapshot_repository.go` — full read, `ReplaceInTx`/`SeedInheritedInTx` semantics (F-03 root cause)
- `backend/internal/repository/member_claims_list_repository.go` — full read, `ClampAdminListPage`/`COUNT(*) OVER()` pattern
- `backend/internal/repository/query_counter.go` — full read, query-budget tracer
- `backend/internal/repository/member_profile_query_budget_test.go` — full read, constant-query-budget gate precedent (Phase 131)
- `backend/internal/testsupport/phase137_postgres.go` — full read, disposable-DB harness convention
- `backend/internal/handlers/admin_content_release_version_media.go` (lines 535-786) — `buildRVMPublicURL`, `ListReleaseVersionMedia`
- `frontend/src/types/admin-users.ts` — full read
- `frontend/src/lib/api.ts` (relevant sections) — `getAdminUserContributions`/`getAdminUserMedia`/`getEffectiveRights`/etc.
- `frontend/src/app/admin/users/tabs/UserOverviewTab.tsx`, `UserGroupRightsTab.tsx`, `UserContributionsTab.tsx`, `UserMediaTab.tsx`, `GroupSection.tsx` — full/partial reads
- `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx` — full read
- `frontend/src/components/contributions/AnimeGroupCard.tsx` — full read (range-collapse reference algorithm)
- `frontend/src/app/admin/claims/useClaimsListFilters.ts`, `frontend/src/app/admin/users/useUserListFilters.ts` — read, URL-sync filter pattern
- `shared/contracts/admin-content.yaml` (lines 1-20, 1620-1900) — full structural read
- `shared/contracts/admin-capabilities.yaml`, `shared/contracts/openapi.yaml` (grep-verified path coverage)
- Live `team4s_v2` Postgres via `docker exec team4sv30-db psql` — `\d anime_contributions`, `\d anime_contribution_roles`, `\d release_crew_snapshots`, `\d episodes`, `\d media_assets`, `\d release_version_media`, `\d media_files`, `SELECT snapshot_mode, count(*) FROM release_crew_snapshots GROUP BY snapshot_mode`
- Live test runs via `docker exec team4sv30-backend`/`team4sv30-frontend` — full `go test ./...` and `npx vitest run` (2026-08-24)
- `.planning/phases/139-scalable-user-admin-projections/139-CONTEXT.md`, `139-DISCUSS.md`, `external-review/ext-139-findings.md`
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md` (Phase 137/138 decision log)
- `scripts/README-seed.md`, `scripts/seed-member-profile-fixtures.mjs` (header/docs) — F-03 seed pattern precedent

### Secondary (MEDIUM confidence)
- None — this research required no external web search; every claim is grounded in the local repository or live database.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, entire stack already verified in use
- Architecture: HIGH — every pattern cited is read directly from working, currently-shipped code in this repo
- Pitfalls: HIGH — all five pitfalls trace to specific, quoted lines of current code or live database state, not speculation
- F-01/F-02/F-03: HIGH — independently re-verified against current files/live DB, with one correction to F-02's framing

**Research date:** 2026-08-24
**Valid until:** 14 days (this research is tightly coupled to exact current file line numbers/content in an actively-developed monorepo; re-verify before planning if more than ~2 weeks elapse or if any quick-task touches `admin/users`, `admin-content.yaml`, or `release_crew_snapshot_repository.go` in the interim)
