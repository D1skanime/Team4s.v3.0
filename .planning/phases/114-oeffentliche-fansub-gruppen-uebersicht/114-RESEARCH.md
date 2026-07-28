# Phase 114: Öffentliche Fansub-Gruppen-Übersicht - Research

**Researched:** 2026-07-28
**Domain:** Next.js App Router SSR list page (frontend-only, with one small optional Go backend addition) in an existing brownfield Team4s admin/public platform
**Confidence:** HIGH (every claim below is grounded in file:line evidence from the actual repo, not training-data assumptions)

## Summary

Phase 114 is almost entirely a frontend-only phase. The list endpoint `GET /api/v1/fansubs`
(`getFansubList()`) **already returns three of the four required metrics** on every
`FansubGroup` object: `release_versions_count`, `members_count`, `anime_relations_count`,
plus `logo_url`/`name`/`slug`. Only the "Anime-Projekte" column has no existing equivalent —
the detail page derives it from a *different* endpoint (`profile.projects.length`, filtered to
non-disabled anime), and the list's `anime_relations_count` is **not** semantically equivalent
(it counts raw `anime_fansub_groups` rows with no anime-status filter). The UI-SPEC's explicit
warning against silently substituting `anime_relations_count` is confirmed by code: this field
would over-count relative to what the detail page shows as "Anime-Projekte" whenever a group
has fansub-relations to disabled anime.

The smallest additive fix is a **one-query addition inside the existing `attachGroupCounts`
batch-count helper** in `backend/internal/repository/fansub_repository.go`, following the exact
same pattern already used for the other three counts, plus a model field, an OpenAPI schema
field, and a TS type field. This requires a Docker backend rebuild (see project memory: new Go
routes/fields only appear after `docker compose up -d --build team4sv30-backend`) but **no new
endpoint, no new table, no restructuring of the fansub-group domain** — fully consistent with
CONTEXT D-03's "kleinstmögliche additive Ergänzung" mandate.

Members-count parity (question 3) requires **no work at all**: a backend source-invariant test
(`TestAttachGroupCounts_MembersCountMatchesCountVisibleTeamMembers`,
`backend/internal/repository/fansub_repository_test.go:116`) already pins that `MembersCount`'s
SQL mirrors the detail page's `countVisibleTeamMembers` logic exactly (active
`fansub_group_members` + public `hist_fansub_group_members`). No reconciliation needed.

Sorting (question 5) has no server-side seam — `FansubListParams`/`buildFansubListQuery` only
support `q`, `status`, `page`, `per_page`; the backend's `ListGroups` hard-codes
`ORDER BY name ASC` with no sort parameter at all. Client-side sort is the only option that
respects "kein Backend-Umbau" — and it is explicitly sanctioned as Claude's Discretion in
CONTEXT.md.

The AppShell nav activation (question 4) is **not a single flip of `disabled: true`→`false`**.
There are two structurally separate nav-item arrays in `AppShell.tsx`: one for authenticated
users (`AppShellNavGroups`, line ~120) that has NO "Fansub-Gruppen" entry at all today, and one
for anonymous users (`AppShellAnonNavGroups`, line ~186) that has the disabled entry described
in CONTEXT.md. Satisfying D-01 ("sichtbar anonym UND eingeloggt") requires editing **both**
arrays: enabling+linking the anonymous entry, and adding a brand-new entry to the authenticated
array (there is nothing to "activate" there — it must be created).

**Primary recommendation:** Build `frontend/src/app/fansubs/page.tsx` as an SSR async Server
Component modeled directly on `frontend/src/app/members/ranking/page.tsx` (same primitives, same
`getErrorStateCopy`/`EmptyState`/`ErrorState` seam), call `getFansubList({ per_page: 500 })`
once, sort the returned array client-side (`release_versions_count` desc, `name` asc), and reuse
`resolveApiUrl()` for the round logo with the `initials()`-style fallback from `AvatarStack.tsx`
(currently unexported — export it or duplicate the four-line helper). Do the optional
`anime-projects` backend metric addition as a small, isolated Go+contract change before wiring
the frontend column, or ship the phase with three metrics and only add the fourth if the
planner decides the backend touch is in scope for Phase 114 (CONTEXT D-03 explicitly allows it,
but the plan should treat it as a separately-sequenced task so a frontend-only fallback stays
possible).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fansub-group directory listing (fetch + render) | Frontend Server (SSR) | API/Backend (existing `GET /api/v1/fansubs`) | New `page.tsx` is an async Server Component that calls the existing, already-public list endpoint — no new API surface needed for 3 of 4 metrics |
| Sort ordering (release-count desc, name asc) | Frontend Server (SSR) | — | No backend sort param exists (`ListGroups` hard-codes `ORDER BY name ASC`); sorting the already-fetched array in the server component is the smallest-footprint option and matches CONTEXT's "Claude's Discretion" note |
| "Anime-Projekte" count metric | API/Backend | Database (aggregate query) | Requires a new additive SQL aggregate in `attachGroupCounts` (`backend/internal/repository/fansub_repository.go`) mirroring `listPublicFansubProjects`'s WHERE clause — cannot be derived client-side without an extra per-row API fan-out (forbidden by existing SC-4-style conventions seen in `members/ranking`) |
| Row navigation to `/fansubs/[slug]` | Browser/Client | — | Standard Next `<Link>`, existing route, no changes |
| Nav entry visibility/activation | Frontend Server + Client (AppShell is `'use client'`) | — | `AppShell.tsx` is a client component; both the authenticated and anonymous nav-item arrays live there and must both be edited |
| Round logo rendering with initials fallback | Browser/Client | — | Presentation-only; reuses `resolveApiUrl()` (already exported from `@/lib/api`) and the `initials()` pattern from `AvatarStack.tsx` |

<phase_requirements>
## Phase Requirements

Phase 114 has no formal `REQ-ID`s in `.planning/REQUIREMENTS.md` (confirmed: no matches for
"114" or "Fansub-Gruppen-Übersicht" there). Per project memory
(`project_v12_letter_requirement_ids`), this phase tracks its own decision IDs from
`114-CONTEXT.md` (D-01…D-05) as the authoritative requirement set. Mapped below:

| ID | Description | Research Support |
|----|-------------|------------------|
| D-01 | AppShell-Eintrag „Fansub-Gruppen" aktivieren, sichtbar anonym UND eingeloggt | See "AppShell Nav Activation" — two separate arrays must be edited, not one flip |
| D-02 | Neue Index-Seite `/fansubs`, Directory mit Anime-Projekte/Release-Versionen/Mitglieder, jede Zeile verlinkt `/fansubs/[slug]` | See "Payload Shape", "Project-Count Gap", "Page Scaffolding Analog" |
| D-03 | `getFansubList()` als Datenquelle, kein neuer Endpunkt, kleinstmögliche additive Ergänzung erlaubt | See "Project-Count Gap — Backend Addition Checklist" |
| D-04 | Globales UI-System Pflicht (`Table`/`Card`/`PageHeader`) | See "Standard Stack" / Component Inventory (already locked in UI-SPEC, referenced not re-derived) |
| D-05 | Tabelle, Default-Sortierung release-desc/name-asc, alle Gruppen in einer Liste, rundes Logo mit Initialen-Fallback | See "Sorting Seam", "Round Logo Pattern", "Pitfall: per_page ceiling" |
</phase_requirements>

## Standard Stack

This phase introduces **no new dependencies**. It is built entirely from packages already in
`frontend/package.json` and existing in-repo primitives.

### Core (already installed, reused as-is)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16 (App Router) | SSR page at `/fansubs` | Existing convention for all public list pages (`/anime`, `/members/ranking`) [VERIFIED: frontend/package.json, frontend/src/app/members/ranking/page.tsx] |
| React | 18.3.1 | Server Component rendering | Existing stack [VERIFIED: frontend/package.json] |
| `@/components/ui` (project-owned) | n/a (in-repo) | `Table`, `PageHeader`, `EmptyState`, `ErrorState`, `AvatarStack` pattern | Mandatory per CLAUDE.md; UI-SPEC already locked this — do not re-derive [VERIFIED: frontend/src/components/ui/index.ts] |
| `lucide-react` | existing | Icons (already used for `Users` icon in AppShell nav) | Project icon standard [VERIFIED: frontend/src/components/layout/AppShell.tsx:16] |

### No new packages required
No `npm install` step for this phase — everything needed exists in the repo. **Package
Legitimacy Audit is not applicable** (no external package installs in scope).

## Priority Question Answers (grounded, file:line evidence)

### Q1 — Payload shape of `getFansubList()` / `GET /api/v1/fansubs`

Traced end-to-end:

1. **Frontend call:** `getFansubList(params: FansubListParams = {})` —
   `frontend/src/lib/api.ts:1568-1593`. Fetches
   `GET {API_BASE_URL}/api/v1/fansubs?{q,status,page,per_page}`, returns
   `Promise<FansubGroupListResponse>`.
2. **TS response type:** `FansubGroupListResponse { data: FansubGroup[]; meta: PaginationMeta }`
   — `frontend/src/types/fansub.ts:139-142`.
3. **TS `FansubGroup` shape** — `frontend/src/types/fansub.ts:21-46`. Confirmed present today:
   - `logo_url?: string | null` ✅ (line 27)
   - `name: string` ✅ (line 24)
   - `slug: string` ✅ (line 23)
   - `release_versions_count: number` ✅ (line 40)
   - `members_count: number` ✅ (line 41)
   - `anime_relations_count: number` ✅ (line 39) — **present but NOT the right field for
     "Anime-Projekte"**, see Q2.
   - **No `projects_count` or equivalent field exists.**
4. **Go handler:** `ListFansubs` — `backend/internal/handlers/fansub_groups.go:19-70+`. Accepts
   `page`, `per_page` (default 24, hard max 500), `q`, `status`. No sort parameter accepted or
   parsed.
5. **Go repository:** `FansubRepository.ListGroups` —
   `backend/internal/repository/fansub_repository.go:36-89`. Base query:
   `SELECT id, slug, name, logo_id, banner_id, logo_url, banner_url, founded_year,
   dissolved_year, closed_year, status, 'group' AS group_type, website_url, discord_url,
   irc_url, country, created_at, updated_at FROM fansub_groups ... ORDER BY name ASC LIMIT $n
   OFFSET $m`, then calls `r.attachGroupCounts(ctx, items)` (line 81) and
   `r.attachGroupLinks(ctx, items)` (line 84).
6. **Count-attachment (the actual source of the four count fields):**
   `attachGroupCounts` — `backend/internal/repository/fansub_repository.go:1649-1731`. Four
   batched `populateCountMap` calls, one per count field:
   - `AnimeRelationsCount` (line 1661-1669): `SELECT fansub_group_id, COUNT(*) FROM
     anime_fansub_groups WHERE fansub_group_id = ANY($1) GROUP BY fansub_group_id` — **no join
     to `anime`, no status filter**.
   - `ReleaseVersionsCount` (line 1671-1687): counts `release_version_groups` rows per group.
   - `MembersCount` (line 1694-1718): union of active `fansub_group_members` + public
     `hist_fansub_group_members`, with an explanatory comment confirming it mirrors
     `countVisibleTeamMembers`.
   - `AliasesCount` (line 1720-1728): counts `fansub_group_aliases` rows (not used by this
     phase's UI-SPEC).
7. **Go model:** `models.FansubGroup` — `backend/internal/models/fansub.go:36-62`. JSON tags
   confirm the wire format: `anime_relations_count`, `release_versions_count`, `members_count`,
   `aliases_count` (all `int`, no `omitempty` — always present, never null).
8. **OpenAPI contract:** `shared/contracts/fansubs.yaml:567-588`, `FansubGroup` schema — matches
   the Go model 1:1 (same four count fields, same names).

**Confidence: HIGH** — full chain read directly, no gaps.

### Q2 — Does "Anime-Projekte" require a backend addition? YES.

**Evidence that `anime_relations_count` ≠ `profile.projects.length`:**

- Detail page (`frontend/src/app/fansubs/[slug]/page.tsx:83`) sets
  `{ label: 'Anime-Projekte', value: profile.projects.length }`, where `profile` comes from
  `getPublicFansubProfileBySlug(slug)` → Go `GetPublicProfileBySlug` →
  `listPublicFansubProjects(ctx, group.ID)` —
  `backend/internal/repository/fansub_repository.go:243-269, 327-407`.
- `listPublicFansubProjects`'s query (lines 328-375):
  ```sql
  FROM anime_fansub_groups afg
  JOIN anime a ON a.id = afg.anime_id
  ...
  WHERE afg.fansub_group_id = $1
    AND a.status <> 'disabled'
  ORDER BY a.title ASC, a.id ASC
  ```
  This is a **row-per-anime-relation query filtered by `anime.status <> 'disabled'`**.
- `AnimeRelationsCount`'s query (line 1663): `SELECT fansub_group_id, COUNT(*) FROM
  anime_fansub_groups WHERE fansub_group_id = ANY($1) GROUP BY fansub_group_id` — counts **all**
  `anime_fansub_groups` rows for the group with **no join to `anime` and no status filter at
  all**. Any group with a fansub-relation to a disabled anime will show a higher
  `anime_relations_count` than the detail page's "Anime-Projekte" figure.

This confirms the UI-SPEC's warning (`114-UI-SPEC.md:96`) is correct and load-bearing:
substituting `anime_relations_count` would silently show a wrong, inflated number on the
directory that disagrees with the group's own detail page — a visible, embarrassing
inconsistency for a "klein bleiben" directory feature.

**Smallest additive backend change — exact checklist:**

1. **`backend/internal/models/fansub.go`** — add one field to the `FansubGroup` struct
   (after `AnimeRelationsCount`, before `ReleaseVersionsCount`, to keep the existing count-field
   block together):
   ```go
   ProjectsCount int `json:"projects_count"`
   ```
   Naming convention observed: existing fields are `{Noun}Count` Go / `{noun}_count` JSON
   (`AnimeRelationsCount`/`anime_relations_count`, `ReleaseVersionsCount`/`release_versions_count`,
   `MembersCount`/`members_count`, `AliasesCount`/`aliases_count`). `ProjectsCount`/
   `projects_count` matches this pattern and matches the UI label "Anime-Projekte" /
   `profile.projects` field name — do not name it `AnimeProjectsCount` (inconsistent with the
   one-word-noun convention already in use) or reuse `AnimeRelationsCount` (wrong semantics, see
   above).

2. **`backend/internal/repository/fansub_repository.go`** — add a fifth `populateCountMap` call
   inside `attachGroupCounts` (after the existing `AnimeRelationsCount` block, lines
   1661-1669, since they query the same source table), mirroring `listPublicFansubProjects`'s
   WHERE clause exactly:
   ```go
   if err := r.populateCountMap(
       ctx,
       `
       SELECT afg.fansub_group_id AS group_id, COUNT(*)
       FROM anime_fansub_groups afg
       JOIN anime a ON a.id = afg.anime_id
       WHERE afg.fansub_group_id = ANY($1)
         AND a.status <> 'disabled'
       GROUP BY afg.fansub_group_id
       `,
       ids,
       func(i int, count int) { items[i].ProjectsCount = count },
       indexByID,
   ); err != nil {
       return fmt.Errorf("load project counts: %w", err)
   }
   ```
   `populateCountMap`'s signature (`fansub_repository.go:1794-1800`) takes
   `(ctx, query, ids, assign func(index, count int), indexByID)` — this is a pure drop-in, same
   shape as the three existing calls.

3. **`shared/contracts/fansubs.yaml`** — add `projects_count: int32` to the `FansubGroup` schema
   at line ~583-586 (alongside the other three count fields), keeping the field ordering
   consistent with the Go struct.

4. **`frontend/src/types/fansub.ts`** — add `projects_count: number;` to the `FansubGroup`
   interface (`frontend/src/types/fansub.ts:39-41` block), same position as the backend struct.

5. **Backend test** (recommended, following existing convention) — extend
   `backend/internal/repository/fansub_repository_test.go` with a source-invariant test analogous
   to `TestAttachGroupCounts_MembersCountMatchesCountVisibleTeamMembers` (line 116), asserting the
   new query fragment contains `"anime_fansub_groups afg"`, `"JOIN anime a"`, and
   `"a.status <> 'disabled'"`, so a future refactor cannot silently drop the status filter and
   reintroduce the exact bug this phase avoids.

6. **Docker rebuild required.** Per project memory
   (`reference_backend_docker_rebuild`): new Go struct fields / SQL do not appear until
   `docker compose up -d --build team4sv30-backend`. The plan must include this as an explicit
   execution step before frontend verification, not assume hot-reload.

**If the planner decides the backend touch is out of scope for Phase 114's small footprint**,
the fallback is to ship the directory with only 3 columns (drop "Anime-Projekte") — but this
contradicts D-02's explicit "Anime-Projekte, Release-Versionen, Mitglieder" column list and the
UI-SPEC's locked 4-column table, so it is not recommended; flag as an Open Question for the
planner rather than silently descoping.

### Q3 — Members-count parity: confirmed, no divergence, no work needed

`MembersCount` is **not** independently computed — it is deliberately built to mirror
`countVisibleTeamMembers` (`frontend/src/components/fansubs/FansubTeamSection.tsx:14-24`, which
sums `members.length + historical.length` regardless of `profile_status`, since it partitions by
memorial-status and re-sums all partitions).

The backend query (`attachGroupCounts`, lines 1694-1718) is:
```sql
SELECT group_id, COUNT(*) FROM (
    SELECT fgm.fansub_group_id AS group_id
    FROM fansub_group_members fgm
    JOIN app_users au ON au.id = fgm.app_user_id
    WHERE fgm.fansub_group_id = ANY($1) AND fgm.status = 'active'
    UNION ALL
    SELECT hfgm.fansub_group_id AS group_id
    FROM hist_fansub_group_members hfgm
    WHERE hfgm.fansub_group_id = ANY($1)
      AND hfgm.status IN ('historical', 'confirmed')
      AND hfgm.visibility = 'public'
) combined GROUP BY group_id
```
and a dedicated backend test
(`TestAttachGroupCounts_MembersCountMatchesCountVisibleTeamMembers`,
`fansub_repository_test.go:116-151`) source-inspects this exact query body and fails the build
if it ever adds a `profile_visibility = 'public'` filter (which would wrongly exclude
private/unclaimed active members) or references the legacy `fansub_members` table. This is a
regression guard, not just a comment — treat it as HIGH-confidence pinned behavior.

**Conclusion:** `members_count` from the list payload is already the same figure the detail page
shows as "Mitglieder". No reconciliation task needed for this phase.

### Q4 — AppShell nav activation: two separate arrays, not one flip

`frontend/src/components/layout/AppShell.tsx` defines `AppShellNavItem` as:
```ts
type AppShellNavItem = {
  label: string
  href?: string
  icon: ReactNode
  current?: boolean
  disabled?: boolean
  badge?: string
}
```
(lines 34-41). Rendering logic (`AppShellNavItemView`, lines 69-103): if `item.disabled ||
!item.href`, renders a non-interactive `<span aria-disabled="true">`; otherwise renders a
`<Link href={item.href}>` with `aria-current` and an `onActivate` (drawer-close) callback.

**Two separate `publicItems` arrays exist, each in its own component:**

1. **`AppShellNavGroups`** (authenticated-mode nav, lines 105-177), `publicItems` at
   lines 120-124:
   ```ts
   const publicItems: AppShellNavItem[] = [
     { label: 'Anime entdecken', href: '/anime', icon: <Compass size={17} />, current: ... },
     { label: 'Rangliste', href: '/members/ranking', icon: <Trophy size={17} />, current: ... },
     { label: 'Dashboard', icon: <LayoutDashboard size={17} />, disabled: true, badge: 'bald' },
   ]
   ```
   **There is no "Fansub-Gruppen" entry here at all.** "Dashboard" is a separate, unrelated
   deferred feature (per CONTEXT deferred list: "Public Dashboard ... eigene spätere Phasen").

2. **`AppShellAnonNavGroups`** (anonymous-mode nav, lines 179-199), `publicItems` at
   lines 186-191:
   ```ts
   const publicItems: AppShellNavItem[] = [
     { label: 'Anime entdecken', href: '/anime', icon: <Compass size={17} />, current: ... },
     { label: 'Rangliste', href: '/members/ranking', icon: <Trophy size={17} />, current: ... },
     { label: 'Fansub-Gruppen', icon: <Users size={17} />, disabled: true, badge: 'bald' },
     { label: 'Suche', icon: <Compass size={17} />, disabled: true, badge: 'bald' },
   ]
   ```
   **This is the entry the CONTEXT.md line "Zeile ~189" references.** `Users` icon is already
   imported (line 16) — reuse it.

**Exact change required (both arrays):**
- In `AppShellAnonNavGroups`: change the "Fansub-Gruppen" entry to
  `{ label: 'Fansub-Gruppen', href: '/fansubs', icon: <Users size={17} />, current:
  isCurrent(currentPath, '/fansubs') }` — drop `disabled`/`badge`, add `href`+`current`, matching
  the shape of "Anime entdecken"/"Rangliste" immediately above it.
- In `AppShellNavGroups`: **insert a new entry** (not present today) into `publicItems`,
  positioned analogous to the anonymous list (after "Rangliste", before "Dashboard" — "Dashboard"
  stays last/disabled since it's out of scope): `{ label: 'Fansub-Gruppen', href: '/fansubs',
  icon: <Users size={17} />, current: isCurrent(currentPath, '/fansubs') }`.
- `Users` is already imported in both contexts (single import block at top of file, line 16) —
  no new import needed.
- No `AppShell.test.tsx` currently references either `publicItems` array or "Fansub-Gruppen"
  (`Grep` found no matches) — this is a Wave 0 gap requiring new tests (see Validation
  Architecture).

**Pitfall to flag for the planner:** treating this as "un-disable the one entry from CONTEXT.md"
would satisfy the anonymous half of D-01 but silently miss the authenticated half, since
authenticated users currently have zero path to `/fansubs` via nav at all. This is a
non-obvious two-file... actually two-array, one-file gap that a naive read of CONTEXT.md's
"Zeile ~189" pointer would miss.

### Q5 — Sorting seam: no server-side sort param exists; client-side is the only option

- `FansubListParams` (`frontend/src/lib/api.ts:470-475`): `{ q?, status?, page?, per_page? }` —
  no `sort`/`order_by` field.
- `buildFansubListQuery` (`frontend/src/lib/api.ts:520-528`): only serializes `q`, `status`,
  `page`, `per_page` into the query string.
- Go handler `ListFansubs` (`backend/internal/handlers/fansub_groups.go:19-70+`): only parses
  `page`, `per_page`, `q`, `status` from the request; no sort query param read at all.
- Go repository `ListGroups` (`backend/internal/repository/fansub_repository.go:52-61`):
  hard-codes `ORDER BY name ASC` in the SQL string — not parameterized, not configurable.

**Conclusion:** achieving "release_versions_count DESC, name ASC tie-break" requires
**client-side sorting** of the array returned by `getFansubList()`. This matches CONTEXT.md's
explicit framing of sort-location as "Claude's Discretion... solange die Default-Ordnung ...
stimmt" — the research confirms there is no cheap server-side alternative today, so client-side
is not just a stylistic choice but the only option that avoids a backend touch. A simple
`[...data].sort((a, b) => b.release_versions_count - a.release_versions_count || a.name.localeCompare(b.name, 'de'))`
in the server component (before render) is sufficient; no client JS/interactivity needed since
D-05 defers interactive re-sorting.

**Related pitfall — `per_page` ceiling:** `ListFansubs` clamps `per_page` to a hard max of 500
(`fansub_groups.go:31-33`) and defaults to 24 if unset. Since D-05 requires "alle Gruppen in
einer Liste" (no pagination UI), the plan must explicitly call `getFansubList({ per_page: 500
})` (or similar large value) rather than relying on the default 24, which would silently drop
groups beyond the first page with no error. If the platform ever exceeds 500 fansub groups this
single request would need pagination — flag as a low-probability, low-severity edge case, not a
blocker, but the plan should not hard-code an assumption that 500 is infinite.

### Q6 — Page scaffolding analog

**Closest existing public list page: `frontend/src/app/members/ranking/page.tsx`** (full text
read; not reproduced verbatim here, path is authoritative). Key transferable patterns:
- `export default async function ...Page(...)` — async Server Component, no `'use client'`.
- `export const dynamic = 'force-dynamic'` at module scope for a route whose data must not be
  statically cached (relevant here too, since fansub data changes and the page has no obvious
  cache-invalidation hook).
- Single `try { result = await get...() } catch (error) { fetchError = error }` block —
  exactly one API call per render, no per-row fan-out (mirrors the existing "SC-4"-style
  discipline referenced in that file's tests).
- Three-way conditional render: `fetchError` → `<ErrorState {...getErrorStateCopy(fetchError, {
  defaultTitle, defaultDescription })} />`; empty result → `<EmptyState title description />`;
  else → `<Table><TableHead>...<TableBody>{data.map(...)}</TableBody></Table>`.
- `PageHeader eyebrow title` at the top, no description in that specific example (Phase 114's
  UI-SPEC specifies a `description` too, which `PageHeader` already supports per its prop
  signature `{ title, description?, eyebrow?, actions?, breadcrumbs? }`,
  `frontend/src/components/ui/PageHeader.tsx:5-13`).
- Colocated `page.module.css` for page-level layout only (not for table internals, which the
  `Table` primitive owns via `ui.module.css`).
- Colocated `page.test.tsx` using `@vitest-environment jsdom`, `vi.mock('@/lib/api', ...)` with
  `vi.hoisted`, and `render(await Page({ ...props }))` — this is the exact test-authoring
  pattern to replicate for `/fansubs` (see Validation Architecture below).

**Round-logo pattern source: `frontend/src/components/ui/AvatarStack.tsx`.**
- `initials(label)` (lines 23-30) is a **local, non-exported** function:
  ```ts
  function initials(label: string) {
    return label.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || '?'
  }
  ```
  **Pitfall:** the UI-SPEC says "reuse the `initials()` convention from `AvatarStack`" but it is
  not exported from `@/components/ui` today. The plan must either (a) add `export` to this
  function in `AvatarStack.tsx` (one-line change, safest, keeps single source of truth) or
  (b) duplicate the four-line algorithm locally in the new page/component. Given CLAUDE.md's
  "no parallel design language" instinct and DRY, (a) is recommended — flag as a small
  in-scope task, not an afterthought.
- Round-image pattern: `<Image src={imageUrl} alt="" width={32} height={32}
  className={styles.avatarStackImage} unoptimized />` — same `alt=""` decorative pattern the
  UI-SPEC requires. `unoptimized` is used because these are already-processed/proxied media URLs
  (see `resolveApiUrl`); reuse this attribute for consistency (avoids Next Image Optimization
  attempting to re-fetch through `/_next/image` for URLs that may already be internally proxied,
  a known pattern already established here — do not deviate without cause).
- `logo_url` → absolute/resolvable URL: the detail page uses **`resolveApiUrl(group.logo_url ||
  '')`** (`frontend/src/components/fansubs/FansubHeroSection.tsx:83`), exported from
  `frontend/src/lib/api.ts:347`. This is the project-wide standard (also used for `banner_url`
  in the same file and in the detail `page.tsx:91`) — use it, not the separate unexported
  `resolveLogoUrl` local helper in `FansubVersionBrowser.tsx:62` (that one is scoped to a
  different, unrelated component and duplicates logic already centralized in `resolveApiUrl`).

## Architecture Patterns

### System Architecture Diagram

```
Browser (anonymous or authenticated)
    │
    │  1. Clicks "Fansub-Gruppen" nav entry (AppShell.tsx, either array)
    ▼
GET /fansubs   (Next.js App Router route)
    │
    │  2. Server Component renders — calls getFansubList({ per_page: 500 })
    ▼
frontend/src/lib/api.ts: getFansubList()
    │
    │  3. fetch(`${API_BASE_URL}/api/v1/fansubs?per_page=500`, { cache: 'no-store' })
    ▼
Go backend: GET /api/v1/fansubs → FansubHandler.ListFansubs
    │
    │  4. FansubRepository.ListGroups(filter)
    │     ├─ base SELECT ... ORDER BY name ASC LIMIT/OFFSET
    │     ├─ attachGroupCounts()   ← [NEW] 5th batched count added here (ProjectsCount)
    │     └─ attachGroupLinks()
    ▼
Postgres (fansub_groups, anime_fansub_groups, anime, release_version_groups,
          fansub_group_members, hist_fansub_group_members)
    │
    │  5. JSON { data: FansubGroup[], meta } returned up the chain
    ▼
Server Component: sorts data client-side (release_versions_count desc, name asc)
    │
    │  6. Renders Table rows: round logo (resolveApiUrl + initials fallback) | name → Link | counts
    ▼
Browser renders table; each row's name links to /fansubs/[slug] (existing, unchanged route)
```

### Recommended Project Structure
```
frontend/src/app/fansubs/
├── page.tsx                 # NEW — the directory (SSR async Server Component)
├── page.module.css          # NEW — page-level layout only (spacing per UI-SPEC), colocated
├── page.test.tsx            # NEW — vitest, mirrors members/ranking/page.test.tsx pattern
└── [slug]/                  # EXISTING — unchanged, detail route consumed by row links
```
If the row/logo-cell markup grows and pushes `page.tsx` toward the 450-line CLAUDE.md ceiling
(unlikely for a 4-column table but worth pre-empting per UI-SPEC C-3), extract a colocated
`FansubDirectoryRow.tsx` — do not extract prematurely if the file stays comfortably under the
limit.

### Pattern: SSR list page with error/empty/data three-way branch
**What:** single server-side data fetch, no client component, three mutually-exclusive render
branches (`ErrorState` / `EmptyState` / `Table`).
**When to use:** any public read-only list page with no interactive filtering (exactly this
phase's scope — D-05 explicitly excludes filters/search).
**Example (from the closest analog, `frontend/src/app/members/ranking/page.tsx`):**
```tsx
// Source: frontend/src/app/members/ranking/page.tsx (existing, verified in-repo)
export default async function MemberRankingPage({ searchParams }: RankingPageProps) {
  let result: Awaited<ReturnType<typeof getMemberPointRanking>> | null = null
  let fetchError: unknown = null
  try {
    result = await getMemberPointRanking(requestedPage)
  } catch (error) {
    fetchError = error
  }
  return (
    <main className={styles.page} aria-label="Rangliste">
      <PageHeader eyebrow="Community" title="Rangliste" />
      {fetchError ? (
        <ErrorState {...getErrorStateCopy(fetchError, { defaultTitle: '...', defaultDescription: '...' })} />
      ) : result && result.data.length === 0 ? (
        <EmptyState title="..." description="..." />
      ) : result ? (
        <Table>{/* ... */}</Table>
      ) : null}
    </main>
  )
}
```

### Anti-Patterns to Avoid
- **Per-row API fan-out:** do not call any per-group endpoint (e.g. `getFansubByID`) inside a
  `.map()` — all four metrics are already batch-attached server-side by `attachGroupCounts` in
  a single list response. This mirrors the "SC-4" no-fan-out discipline already enforced (and
  tested) on the ranking page.
- **Hand-rolled `<table>`/`<img>`:** forbidden by CLAUDE.md C-1; use `Table`/`TableRow`/
  `TableCell`/`next/image`.
- **Silently substituting `anime_relations_count` for the project count:** confirmed wrong by
  the SQL comparison in Q2 above — will show inflated numbers for groups with disabled-anime
  relations.
- **Assuming `disabled: true → false` is a one-line AppShell change:** confirmed wrong by Q4 —
  the authenticated nav array has no entry to flip.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sortable/scrollable table markup | custom `<table>` + CSS | `Table`/`TableHead`/`TableBody`/`TableRow`/`TableHeaderCell`/`TableCell` from `@/components/ui` | Mandatory (CLAUDE.md C-1); already handles `.tableWrap` horizontal scroll, `variant="selectable"` hover affordance, `14px 16px` cell padding |
| Round avatar/logo with initials fallback | new avatar component | `resolveApiUrl()` + the `initials()` pattern from `AvatarStack.tsx` (export it) | Avoids a second initials algorithm; keeps visual parity with existing round member avatars per UI-SPEC C-5 |
| Error-state copy incl. 403 branch | custom error message logic | `getErrorStateCopy(error, options)` from `@/components/ui` | Already handles the 403 branch and generic fallback; used identically on `members/ranking/page.tsx` |
| Fetching "all" groups | manual pagination loop across multiple requests | single `getFansubList({ per_page: 500 })` call | Backend already supports up to 500 per request; D-05 explicitly wants one flat list, not paginated fetching |

**Key insight:** everything needed for the 3-of-4-metric happy path already exists in the
codebase; the only genuinely new code is the page itself, its test, one optional backend count
query, and two AppShell array edits.

## Common Pitfalls

### Pitfall 1: Treating `anime_relations_count` as the project-count field
**What goes wrong:** directory shows a different (higher) "Anime-Projekte" number than the
group's own detail page for any group with fansub-relations to disabled anime.
**Why it happens:** the field name `anime_relations_count` looks like a plausible match at a
glance, and it's already present in the payload (zero extra work), which is tempting.
**How to avoid:** use the new `projects_count` field (Q2 checklist) or, if descoping the backend
touch, omit the column rather than wire it to the wrong field.
**Warning signs:** manual cross-check — pick any group with a known disabled-anime relation and
compare the directory number to `/fansubs/[slug]`'s "Anime-Projekte" figure; they must match.

### Pitfall 2: Only editing the anonymous AppShell nav array
**What goes wrong:** logged-in users still cannot reach `/fansubs` from the nav after the phase
ships, violating D-01's "sichtbar anonym UND eingeloggt".
**Why it happens:** CONTEXT.md's "Zeile ~189" pointer lands exactly on the anonymous array; a
quick read doesn't surface that the authenticated array (lines 120-124) has no corresponding
entry.
**How to avoid:** edit both `AppShellAnonNavGroups.publicItems` (lines 186-191) and
`AppShellNavGroups.publicItems` (lines 120-124).
**Warning signs:** manual/E2E check logged-in nav for a "Fansub-Gruppen" entry, not just the
anonymous drawer.

### Pitfall 3: Defaulting to `per_page: 24` (or omitting `per_page`)
**What goes wrong:** directory silently shows only the first 24 groups (alphabetically, since
that's the backend's unsorted default order) with no visual indication that more exist — no
pagination UI is planned per D-05, so truncation would be invisible.
**Why it happens:** `getFansubList()`'s default `FansubListParams = {}` doesn't set `per_page`,
and the Go handler's default is 24.
**How to avoid:** explicitly pass `{ per_page: 500 }` in the `getFansubList()` call.
**Warning signs:** compare rendered row count to `result.meta.total` in a smoke check; they must
match (until/unless the platform exceeds 500 groups, an edge case to note but not block on).

### Pitfall 4: Forgetting the Docker rebuild for the backend addition
**What goes wrong:** frontend code correctly requests `projects_count`, gets `undefined`/`0` for
every group even after the Go/SQL/contract changes are committed, because the running container
still serves the pre-change binary.
**Why it happens:** per project memory, the backend runs in Docker and does not hot-reload Go
source changes.
**How to avoid:** explicit `docker compose up -d --build team4sv30-backend` step in the plan
before any live verification of the new field, and verify via `docker ps`-reported live port
(not `.env` defaults) per project memory `testing_live_dev_server`.
**Warning signs:** `projects_count` present in Go struct/OpenAPI but absent/zero in the actual
`curl`/browser response.

### Pitfall 5: Using `initials()` from `AvatarStack.tsx` without exporting it first
**What goes wrong:** a TypeScript import error (`initials` is not exported), silently "fixed" by
copy-pasting the function body into the new page — creating a second, divergent copy of the
same logic (violates CLAUDE.md's "no parallel design language" spirit even for tiny helpers).
**How to avoid:** add `export` to `function initials(...)` in
`frontend/src/components/ui/AvatarStack.tsx` as a one-line prerequisite task, then import it.

## Code Examples

### Client-side sort matching D-05's default ordering
```typescript
// Not sourced from an existing file — new logic for this phase, but the sort key names
// (release_versions_count, name) are verified against frontend/src/types/fansub.ts:21-46.
const sortedGroups = [...result.data].sort((a, b) =>
  b.release_versions_count - a.release_versions_count ||
  a.name.localeCompare(b.name, 'de'),
)
```

### Round logo cell with initials fallback (pattern to replicate, not copy verbatim)
```tsx
// Pattern source: frontend/src/components/ui/AvatarStack.tsx:46-62 (verified in-repo)
{group.logo_url ? (
  <Image
    src={resolveApiUrl(group.logo_url)}
    alt=""
    width={32}
    height={32}
    className={styles.logoImage}
    unoptimized
  />
) : (
  <span aria-hidden="true">{initials(group.name)}</span>
)}
```

## State of the Art

Not applicable in the usual sense (no external library version drift concerns — this phase uses
only in-repo primitives and existing endpoints). The one "state of the art" note: the `Table`
primitive already supports a `variant="selectable"` row-hover affordance
(`frontend/src/components/ui/Table.tsx:6,29`) which the UI-SPEC locks in as the variant to use —
confirmed this variant exists and is wired to CSS (`styles.tableSelectable`).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Field name `projects_count`/`ProjectsCount` is the best-fit new-field name (vs. e.g. `active_anime_projects_count`) | Q2 checklist | Low — purely a naming choice within the planner's/executor's discretion; does not block functionality, only a contract-consistency nit if named differently |
| A2 | `per_page: 500` is sufficient to fetch "all" groups today | Q5 / Pitfall 3 | Low-medium — if the platform has grown past 500 fansub groups since this research, the single-request approach would silently truncate; recommend the plan log `result.meta.total` and compare, or add a follow-up note rather than hard-failing |

Both assumptions are low-risk implementation-detail choices, not domain/compliance/security
claims — no user confirmation gate strictly required, but A2 is worth a one-line mention in the
plan's verification steps.

## Open Questions

1. **Should the `projects_count` backend addition be in Phase 114's plan, or deferred with a
   3-column fallback?**
   - What we know: CONTEXT D-03 explicitly permits it ("kleinstmögliche additive Ergänzung ...
     kein Umbau der Gruppen-Domäne"), and the UI-SPEC's locked 4-column table assumes it exists.
   - What's unclear: whether the user wants this phase to touch the Go backend at all, given the
     phase is framed as intentionally small ("klein bleiben").
   - Recommendation: include it as an explicit, separately-sequenced task (backend addition →
     Docker rebuild → frontend wiring) so the plan can be executed and verified in that order,
     and so a reviewer can see exactly where the "kein Backend-Umbau" boundary was or wasn't
     crossed. This is additive-only, not a restructure, so it should comfortably fit the
     boundary as written.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm (frontend) | Build/test the new page | ✓ (existing dev workflow) | per `frontend/package.json` | — |
| Docker Compose (backend) | Rebuilding backend if `projects_count` is added | ✓ (existing convention, `team4sv30-backend` container per project memory) | — | — |
| Postgres 16 | Backend queries | ✓ (existing compose service) | 16 | — |

No new external dependencies. Skip condition does not apply (there are Docker/backend
touchpoints if the Q2 addition is in scope) but nothing is missing.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 (frontend), Go `testing` (backend) |
| Config file | `frontend/vitest.config.ts`; Go tests run via `go test ./...` (no separate config file found) |
| Quick run command (frontend) | `npm run test -- src/app/fansubs/page.test.tsx` (from `frontend/`) |
| Quick run command (backend, if Q2 addition included) | `go test ./internal/repository/... -run TestAttachGroupCounts` (from `backend/`) |
| Full suite command (frontend) | `npm run test` (`vitest run`, per `frontend/package.json:10`) |
| Full suite command (backend) | `go test ./...` (from `backend/`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-02 | Directory renders all groups with correct metrics, row links to `/fansubs/[slug]` | unit (RTL) | `vitest run src/app/fansubs/page.test.tsx` | ❌ Wave 0 |
| D-02 | Empty state renders when `data.length === 0` | unit (RTL) | same file | ❌ Wave 0 |
| D-02 | Error state renders via `getErrorStateCopy` on fetch rejection | unit (RTL) | same file | ❌ Wave 0 |
| D-05 | Default sort: release_versions_count desc, name asc tie-break | unit (RTL, assert row order) | same file | ❌ Wave 0 |
| D-01 | Both AppShell nav arrays expose an enabled `/fansubs` entry | unit (RTL) | `vitest run src/components/layout/AppShell.test.tsx` | ❌ Wave 0 (new test cases in existing file) |
| Q2 (if in scope) | New `ProjectsCount` query excludes disabled anime, mirrors `listPublicFansubProjects` WHERE clause | unit (Go, source-invariant) | `go test ./internal/repository/... -run TestAttachGroupCounts_ProjectsCount` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** targeted `vitest run <changed file>.test.tsx` and/or
  `go test ./internal/repository/... -run <TestName>`.
- **Per wave merge:** `npm run test` (frontend full) and, if backend touched, `go test ./...`
  (backend full).
- **Phase gate:** both full suites green before `/gsd:verify-work`, plus one live check at
  `:3000` per project memory (`testing_live_dev_server`): visit `/fansubs` anonymously and
  logged-in, confirm nav entry + table + row link + (if in scope) matching "Anime-Projekte"
  figure against a known group's detail page.

### Wave 0 Gaps
- [ ] `frontend/src/app/fansubs/page.test.tsx` — new file, covers D-02/D-05 (render, empty,
      error, sort order, row link)
- [ ] `frontend/src/components/layout/AppShell.test.tsx` — extend with cases asserting the
      `/fansubs` entry is enabled+linked in BOTH the authenticated and anonymous nav renders
      (D-01)
- [ ] `backend/internal/repository/fansub_repository_test.go` — extend with a
      `TestAttachGroupCounts_ProjectsCountExcludesDisabledAnime`-style source-invariant test, IF
      the Q2 backend addition is included in this phase's scope
- Framework install: none — Vitest and Go testing are already fully configured.

## Security Domain

Not applicable in the conventional sense — this is a public, read-only, already-public dataset
(`GET /api/v1/fansubs` has no auth requirement today, confirmed by `getFansubList()` using plain
`fetch`, not `authorizedFetch`, at `frontend/src/lib/api.ts:1574`). No new input surfaces, no new
write paths, no new auth boundaries. `config.json`'s `security_enforcement` gate is not
meaningfully engaged by a static list-rendering page with zero user input handling — no ASVS
category applies beyond what already governs the existing public list endpoint.

## Sources

### Primary (HIGH confidence — direct file reads in this repo)
- `frontend/src/lib/api.ts` (lines 347-362 `resolveApiUrl`, 460-528 list-query builders,
  1568-1677 `getFansubList`/`getFansubByID`/`getPublicFansubProfileBySlug`)
- `frontend/src/types/fansub.ts` (full `FansubGroup`/`PublicFansubProfile`/
  `PublicFansubProject` type definitions)
- `frontend/src/app/fansubs/[slug]/page.tsx` (detail page, metric source of truth)
- `frontend/src/components/fansubs/FansubHeroSection.tsx`, `FansubTeamSection.tsx`,
  `FansubVersionBrowser.tsx` (logo/initials/count patterns)
- `frontend/src/components/layout/AppShell.tsx` (both nav-item arrays, full component read)
- `frontend/src/components/ui/{Table,AvatarStack,PageHeader,EmptyState,ErrorState}.tsx` (real
  primitive signatures)
- `frontend/src/app/members/ranking/page.tsx` + `page.test.tsx` (SSR/test analog)
- `backend/internal/handlers/fansub_groups.go` (`ListFansubs` handler)
- `backend/internal/repository/fansub_repository.go` (`ListGroups`, `attachGroupCounts`,
  `GetPublicProfileBySlug`, `listPublicFansubProjects`, `populateCountMap`)
- `backend/internal/repository/fansub_repository_test.go` (source-invariant test patterns,
  incl. the members-count parity guard)
- `backend/internal/models/fansub.go` (`FansubGroup` struct, JSON tags)
- `backend/cmd/server/main.go:414` (route registration confirmation)
- `shared/contracts/fansubs.yaml` (lines 567-588, `FansubGroup` OpenAPI schema)
- `.planning/phases/114-oeffentliche-fansub-gruppen-uebersicht/114-CONTEXT.md`,
  `114-UI-SPEC.md`
- `.planning/ROADMAP.md` (lines 2598-2603, Phase 114 entry)
- `.planning/REQUIREMENTS.md` (searched, confirmed no formal REQ-IDs for this phase)

### Secondary / Tertiary
None used — this phase required no external library research; every claim above is grounded in
direct repo reads.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, everything traced to existing in-repo files
- Architecture: HIGH — full request-to-response chain read directly for both list and detail
  endpoints
- Pitfalls: HIGH — each pitfall grounded in a specific code comparison (e.g. the
  `anime_relations_count` vs. `listPublicFansubProjects` WHERE-clause diff) or a specific
  file:line gap (the two-array AppShell finding)

**Research date:** 2026-07-28
**Valid until:** stable until the next fansub-domain backend change touches
`attachGroupCounts`/`AppShell.tsx`/`FansubListParams` — no external-dependency staleness risk,
so a generous 60-day validity is reasonable for this internal-code-only research.

## RESEARCH COMPLETE
