# Phase 114: Öffentliche Fansub-Gruppen-Übersicht - Pattern Map

**Mapped:** 2026-07-28
**Files analyzed:** 6 (2 new, 4 modified) + 2 optional backend-additive files
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `frontend/src/app/fansubs/page.tsx` | route (SSR page component) | request-response (read-only list) | `frontend/src/app/members/ranking/page.tsx` | exact |
| `frontend/src/app/fansubs/page.module.css` | config/style (colocated CSS module) | n/a | `frontend/src/app/members/ranking/page.module.css` | exact (structure — not read in full, colocated convention confirmed by import in analog) |
| `frontend/src/app/fansubs/page.test.tsx` | test | request-response | `frontend/src/app/members/ranking/page.test.tsx` | exact |
| `frontend/src/components/layout/AppShell.tsx` | component (nav) | event-driven (client nav state) | itself (existing file, two arrays to edit) | exact — this IS the file, both `publicItems` arrays are the pattern source |
| `frontend/src/lib/api.ts` (`getFansubList`, `FansubListParams`, no new function needed) | service (API client function) | request-response | itself — `getFansubList` already exists and needs **no signature change**; only consumed as-is | exact (no new code, reference only) |
| `frontend/src/types/fansub.ts` (`FansubGroup`) | model (TS type) | CRUD (field addition) | itself — add one field, same block as `anime_relations_count`/`release_versions_count`/`members_count`/`aliases_count` | exact |
| `frontend/src/components/ui/AvatarStack.tsx` (`initials`) | utility | transform | itself — add `export` keyword only | exact |
| `backend/internal/repository/fansub_repository.go` (`attachGroupCounts`) | repository (SQL batch aggregate) | CRUD (read aggregate) | itself — add a 5th `populateCountMap` call mirroring the existing 4 | exact |
| `backend/internal/models/fansub.go` (`FansubGroup` struct) | model (Go struct) | CRUD (field addition) | itself — add one field to existing count-field block | exact |
| `shared/contracts/fansubs.yaml` (`FansubGroup` schema) | config (OpenAPI contract) | n/a | itself — add one field to existing count-field block | exact |
| `backend/internal/repository/fansub_repository_test.go` (new test) | test (Go, source-invariant) | n/a | `TestAttachGroupCounts_MembersCountMatchesCountVisibleTeamMembers` (same file, line 116) | exact |

## Pattern Assignments

### `frontend/src/app/fansubs/page.tsx` (route, request-response)

**Analog:** `frontend/src/app/members/ranking/page.tsx` (full file, 94 lines — reproduced below, use as literal scaffold)

**Imports pattern** (lines 1-8):
```tsx
import Link from 'next/link'

import { EmptyState, ErrorState, getErrorStateCopy, PageHeader, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui'
import { getMemberPointRanking } from '@/lib/api'
import { toNumber } from '@/lib/utils'

import { RankingPaginationNav } from './RankingPaginationNav'
import styles from './page.module.css'
```
For `/fansubs`, swap `getMemberPointRanking` → `getFansubList`, drop the pagination-nav import (D-05: no pagination UI), and additionally import `Image` from `next/image` and `resolveApiUrl` from `@/lib/api` for the round-logo cell (see AvatarStack pattern below). No `toNumber`/searchParams needed — this page takes no query params.

**`dynamic` + doc-comment pattern** (lines 10-14):
```tsx
// Backend-Seitengröße ist fix (member_point_totals_repository.go, memberRankingPageSize = 50).
const RANKING_PAGE_SIZE = 50

// Diese Route haengt vom page-Query-Parameter ab -- kein SSG-Caching.
export const dynamic = 'force-dynamic'
```
Reuse `export const dynamic = 'force-dynamic'` verbatim (fansub counts change independently of any cache-invalidation hook). No page-size constant needed for `/fansubs` (D-05: no pagination).

**Core SSR fetch + three-way branch pattern** (lines 34-93, the entire component body):
```tsx
export default async function MemberRankingPage({ searchParams }: RankingPageProps) {
  const resolved = ((await searchParams) ?? {}) as ResolvedRankingSearchParams
  const requestedPage = toNumber(resolved.page, 1)

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
        <ErrorState
          {...getErrorStateCopy(fetchError, {
            defaultTitle: 'Rangliste konnte nicht geladen werden',
            defaultDescription: 'Bitte versuche es später erneut.',
          })}
        />
      ) : result && result.data.length === 0 ? (
        <EmptyState
          title="Noch keine Punkte vergeben"
          description="Sobald Mitwirkende für akzeptierte Beiträge Punkte erhalten, erscheinen sie hier in der Rangliste."
        />
      ) : result ? (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell scope="col">Rang</TableHeaderCell>
                <TableHeaderCell scope="col">Name</TableHeaderCell>
                <TableHeaderCell scope="col">Punkte</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.data.map((row, index) => (
                <TableRow key={row.member_id}>
                  <TableCell>{(result.page - 1) * RANKING_PAGE_SIZE + index + 1}</TableCell>
                  <TableCell>
                    {row.slug !== null ? (
                      <Link href={`/members/${row.slug}`}>{row.display_name}</Link>
                    ) : (
                      <span>{row.display_name}</span>
                    )}
                  </TableCell>
                  <TableCell className={styles.pointsCell}>{row.total_points}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <RankingPaginationNav currentPage={result.page} totalPages={Math.ceil(result.total / RANKING_PAGE_SIZE)} />
        </>
      ) : null}
    </main>
  )
}
```
For `/fansubs`, adapt to:
- No `searchParams`/`RankingPageProps` — the component takes no props (`export default async function FansubsPage()`).
- `getFansubList({ per_page: 500 })` instead of `getMemberPointRanking(requestedPage)` — **must** pass `per_page: 500` explicitly (Pitfall 3 in RESEARCH.md: default is 24).
- Client-side sort immediately after the fetch, before the empty-check:
  ```tsx
  const sortedGroups = result ? [...result.data].sort((a, b) =>
    b.release_versions_count - a.release_versions_count ||
    a.name.localeCompare(b.name, 'de'),
  ) : []
  ```
- `PageHeader eyebrow="Community"` → per UI-SPEC, no eyebrow specified for `/fansubs`; use `<PageHeader title="Fansub-Gruppen" description="Alle Fansub-Gruppen im Überblick — sortiert nach aktivsten Gruppen zuerst." />` (UI-SPEC Copywriting Contract).
- `ErrorState` default copy → `{ defaultTitle: 'Fehler beim Laden', defaultDescription: 'Die Fansub-Gruppen konnten nicht geladen werden.' }` (UI-SPEC exact strings).
- `EmptyState` copy → `title="Noch keine Fansub-Gruppen"` / `description="Sobald Fansub-Gruppen angelegt sind, erscheinen sie hier in der Übersicht."` (UI-SPEC exact strings).
- `Table` needs `variant="selectable"` per UI-SPEC (`<Table variant="selectable">`), unlike the ranking page's plain `<Table>`.
- No `RankingPaginationNav` equivalent — D-05 explicitly has no pagination UI for `/fansubs`.
- 4 columns per UI-SPEC: `Fansub-Gruppe` (logo+name, links row), `Anime-Projekte`, `Release-Versionen`, `Mitglieder`.
- Row link: use `Link` on the group name exactly as the ranking page does for `row.slug !== null` (`<Link href={`/fansubs/${group.slug}`}>{group.name}</Link>`) — every fansub group always has a slug (unlike ranking rows where `slug` can be `null` for historical entries), so the conditional branch collapses to always-link.

**`ApiError`/type-only import note:** the ranking page does not import `ApiError` at all (it isn't needed for `getErrorStateCopy`, which works on `unknown`). Follow the same minimal-import discipline for `/fansubs/page.tsx` — no `ApiError` import needed unless a 403-specific message is required (it isn't; `getFansubList` is a public unauthenticated endpoint per RESEARCH.md Security Domain).

---

### `frontend/src/app/fansubs/page.test.tsx` (test, request-response)

**Analog:** `frontend/src/app/members/ranking/page.test.tsx` (full file, 121 lines)

**Test-file header + mock scaffolding pattern** (lines 1-41):
```tsx
// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import MemberRankingPage from './page'

const { getMemberPointRankingMock } = vi.hoisted(() => ({
  getMemberPointRankingMock: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  }

  return {
    ApiError,
    getMemberPointRanking: getMemberPointRankingMock,
  }
})

afterEach(() => {
  vi.clearAllMocks()
})
```
For `/fansubs/page.test.tsx`: rename `getMemberPointRankingMock` → `getFansubListMock`, mock `getFansubList` in the `vi.mock('@/lib/api', ...)` factory, and additionally mock `resolveApiUrl` (used for the logo cell) as a passthrough (`resolveApiUrl: (v: string) => v`) since the test env has no real API base URL. If `next/image` is used for the logo, also add `vi.mock('next/image', ...)` returning a plain `<img>` (same pattern as the `next/link` mock above), since jsdom test environments commonly need this for `next/image` to render without erroring.

**Render helper pattern** (lines 43-46):
```tsx
async function renderRankingPage(searchParams: { page?: string } = {}) {
  const result = await MemberRankingPage({ searchParams })
  return render(result)
}
```
`/fansubs/page.tsx` takes no props, so simplify to `async function renderFansubsPage() { return render(await FansubsPage()) }`.

**Test-case patterns to replicate** (lines 48-119, `describe` block): one `it` per behavior — link rendering, empty state, error state, and (unique to this phase, replacing the ranking page's rank-number test) **sort-order assertion**:
```tsx
it('renders the empty state when there are no ranking rows', async () => {
  getMemberPointRankingMock.mockResolvedValue({ data: [], total: 0, page: 1 })
  await renderRankingPage()
  expect(screen.getByText('Noch keine Punkte vergeben')).not.toBeNull()
})

it('renders the error state when the ranking fetch rejects', async () => {
  getMemberPointRankingMock.mockRejectedValue(new Error('boom'))
  await renderRankingPage()
  expect(screen.getByText('Rangliste konnte nicht geladen werden')).not.toBeNull()
})

it('calls getMemberPointRanking exactly once per render (no per-row API fan-out, SC-4)', async () => {
  // ...
  expect(getMemberPointRankingMock).toHaveBeenCalledTimes(1)
})
```
Add a dedicated `/fansubs`-specific test asserting default sort order (release_versions_count desc, name asc tie-break) by rendering two/three mock groups out of order and asserting row text order via `screen.getAllByRole('row')` or similar — this is new test logic (D-05), not present in the ranking analog, but follows the same "assert on rendered DOM order" style as the analog's CR-01 rank-number test (lines 91-104).

---

### `frontend/src/components/layout/AppShell.tsx` (component, event-driven)

**Analog:** itself — the two existing `publicItems` arrays are the literal pattern to extend, verified in full (447-line file read in full).

**Shared type (already exists, no change needed)** (lines 34-41):
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

**Array 1 — Authenticated nav, `AppShellNavGroups`, `publicItems`** (lines 120-124, current state):
```ts
const publicItems: AppShellNavItem[] = [
  { label: 'Anime entdecken', href: '/anime', icon: <Compass size={17} />, current: isCurrent(currentPath, '/anime') },
  { label: 'Rangliste', href: '/members/ranking', icon: <Trophy size={17} />, current: isCurrent(currentPath, '/members/ranking') },
  { label: 'Dashboard', icon: <LayoutDashboard size={17} />, disabled: true, badge: 'bald' },
]
```
**Required change:** insert a new entry between "Rangliste" and "Dashboard" (Dashboard stays last/disabled — unrelated deferred feature):
```ts
{ label: 'Fansub-Gruppen', href: '/fansubs', icon: <Users size={17} />, current: isCurrent(currentPath, '/fansubs') },
```
`Users` is already imported at line 16 (`import { ..., Users, ... } from 'lucide-react'`) — no new import needed. Note `Users` is also reused later in the same file for the "Meine Gruppen" membership links (line 168) — this is the existing icon-reuse convention for fansub-group-flavored nav items.

**Array 2 — Anonymous nav, `AppShellAnonNavGroups`, `publicItems`** (lines 186-191, current state):
```ts
const publicItems: AppShellNavItem[] = [
  { label: 'Anime entdecken', href: '/anime', icon: <Compass size={17} />, current: isCurrent(currentPath, '/anime') },
  { label: 'Rangliste', href: '/members/ranking', icon: <Trophy size={17} />, current: isCurrent(currentPath, '/members/ranking') },
  { label: 'Fansub-Gruppen', icon: <Users size={17} />, disabled: true, badge: 'bald' },
  { label: 'Suche', icon: <Compass size={17} />, disabled: true, badge: 'bald' },
]
```
**Required change:** replace the disabled "Fansub-Gruppen" entry (keep "Suche" disabled — deferred separately):
```ts
{ label: 'Fansub-Gruppen', href: '/fansubs', icon: <Users size={17} />, current: isCurrent(currentPath, '/fansubs') },
```

**Rendering logic (unchanged, no edit needed)** — `AppShellNavItemView` (lines 69-103) already branches correctly on `item.disabled || !item.href`: once `href` is set and `disabled` is dropped, the item automatically renders as a real `<Link>` with `aria-current` — no separate rendering-logic change required, only the two array-literal edits above.

**Pitfall (from RESEARCH.md, confirmed by this read):** do not treat this as a single `disabled: true → false` flip. The authenticated array has **no** "Fansub-Gruppen" entry today — it must be newly inserted, not toggled.

---

### `frontend/src/lib/api.ts` (`getFansubList`, no code change needed — reference only)

**Analog:** itself — existing function, consumed as-is.

**Function signature + implementation** (lines 1568-1593):
```ts
export async function getFansubList(
  params: FansubListParams = {},
): Promise<FansubGroupListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = buildFansubListQuery(params);
  const url = `${API_BASE_URL}/api/v1/fansubs${query ? `?${query}` : ""}`;
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  return response.json() as Promise<FansubGroupListResponse>;
}
```
Plain unauthenticated `fetch` (no `authorizedFetch`), `cache: "no-store"` — matches SSR-freshness expectations for `/fansubs`. Call site: `getFansubList({ per_page: 500 })`.

**`FansubListParams` shape** (lines 470-475, no change needed — `per_page` already supported):
```ts
interface FansubListParams {
  q?: string;
  status?: FansubStatus;
  page?: number;
  per_page?: number;
}
```

**`resolveApiUrl` pattern** (lines 347-367, needed for the round logo cell):
```ts
export function resolveApiUrl(value?: string): string {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const loopbackMediaUrl = resolveLoopbackMediaUrl(trimmed);
    if (loopbackMediaUrl) {
      return loopbackMediaUrl;
    }

    return trimmed;
  }

  if (trimmed.startsWith("/api/")) {
    return resolvePublicApiUrl(trimmed);
  }

  return trimmed;
}
```
Use exactly as the detail page does: `group.logo_url ? resolveApiUrl(group.logo_url) : null`.

---

### `frontend/src/types/fansub.ts` (`FansubGroup`, model, CRUD field addition)

**Current shape** (lines 21-46, full interface):
```ts
export interface FansubGroup {
  id: number;
  slug: string;
  name: string;
  logo_id?: number | null;
  banner_id?: number | null;
  logo_url?: string | null;
  banner_url?: string | null;
  logo_source_original_url?: string | null;
  banner_source_original_url?: string | null;
  founded_year?: number | null;
  dissolved_year?: number | null;
  closed_year?: number | null;
  status: FansubStatus;
  website_url?: string | null;
  discord_url?: string | null;
  irc_url?: string | null;
  country?: string | null;
  anime_relations_count: number;
  release_versions_count: number;
  members_count: number;
  aliases_count: number;
  created_at: string;
  updated_at: string;
  links?: FansubGroupLink[];
}
```
**If Q2 backend addition is in scope:** insert `projects_count: number;` immediately before `anime_relations_count` (or right after — match whatever order the Go struct ends up using; RESEARCH.md recommends placing `ProjectsCount` after `AnimeRelationsCount`, before `ReleaseVersionsCount`, in the Go struct — mirror that same position here for 1:1 field-order consistency with the wire contract).

`FansubGroupListResponse`/`FansubGroupResponse` (lines 139-145) need no change — they just wrap `FansubGroup[]`/`FansubGroup`.

---

### `frontend/src/components/ui/AvatarStack.tsx` (`initials`, utility, transform)

**Current (non-exported) function** (lines 23-30):
```ts
function initials(label: string) {
  return label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?'
}
```
**Required change:** add `export` — `export function initials(label: string) { ... }` (one-line change, per RESEARCH.md Pitfall 5). Then import in `/fansubs/page.tsx`: `import { initials } from '@/components/ui/AvatarStack'` (or via the `@/components/ui` barrel if `AvatarStack.tsx` is re-exported there — verify the barrel file `frontend/src/components/ui/index.ts` and add the export there too if other primitives are re-exported centrally).

**Round-image usage pattern to replicate (from the same file, lines 49-57):**
```tsx
<Image
  src={item.imageUrl}
  alt=""
  width={32}
  height={32}
  className={styles.avatarStackImage}
  unoptimized
/>
```
Adapt for the fansub logo cell: `src={resolveApiUrl(group.logo_url)}`, same `alt=""`, `width={32} height={32}`, `unoptimized`, but with a new local CSS class (e.g. `styles.logoImage` in the new `page.module.css`) rather than reusing `styles.avatarStackImage` (that class lives in the `ui.module.css` primitive stylesheet, scoped to `AvatarStack`; the fansub page should define its own colocated class per C-4/C-3, or alternatively use `AvatarStack` itself as a single-item stack — but UI-SPEC's exact 32px + initials-fallback contract is simplest to hand-build using this excerpt directly as the pattern, since `AvatarStack` is designed for stacking multiple overlapping avatars, not a single per-row logo).

---

### `backend/internal/repository/fansub_repository.go` (`attachGroupCounts`, repository, CRUD-read)

**Analog:** itself — 3 existing `populateCountMap` calls in the same function are the literal pattern (only IF Q2 backend addition is in scope per CONTEXT D-03 discretion).

**Full current function** (lines 1649-1731):
```go
func (r *FansubRepository) attachGroupCounts(ctx context.Context, items []models.FansubGroup) error {
	if len(items) == 0 {
		return nil
	}

	ids := make([]int64, 0, len(items))
	indexByID := make(map[int64]int, len(items))
	for i := range items {
		ids = append(ids, items[i].ID)
		indexByID[items[i].ID] = i
	}

	if err := r.populateCountMap(
		ctx,
		`SELECT fansub_group_id, COUNT(*) FROM anime_fansub_groups WHERE fansub_group_id = ANY($1) GROUP BY fansub_group_id`,
		ids,
		func(i int, count int) { items[i].AnimeRelationsCount = count },
		indexByID,
	); err != nil {
		return fmt.Errorf("load anime relation counts: %w", err)
	}

	if err := r.populateCountMap(
		ctx,
		`
		SELECT group_id, COUNT(*)
		FROM (
			SELECT fansub_group_id AS group_id
			FROM release_version_groups
			WHERE fansub_group_id = ANY($1)
		) grouped
		GROUP BY group_id
		`,
		ids,
		func(i int, count int) { items[i].ReleaseVersionsCount = count },
		indexByID,
	); err != nil {
		return fmt.Errorf("load episode version counts: %w", err)
	}

	// MembersCount mirrors countVisibleTeamMembers (FansubTeamSection.tsx): ...
	if err := r.populateCountMap(
		ctx,
		`
		SELECT group_id, COUNT(*)
		FROM (
			SELECT fgm.fansub_group_id AS group_id
			FROM fansub_group_members fgm
			JOIN app_users au ON au.id = fgm.app_user_id
			WHERE fgm.fansub_group_id = ANY($1)
			  AND fgm.status = 'active'
			UNION ALL
			SELECT hfgm.fansub_group_id AS group_id
			FROM hist_fansub_group_members hfgm
			WHERE hfgm.fansub_group_id = ANY($1)
			  AND hfgm.status IN ('historical', 'confirmed')
			  AND hfgm.visibility = 'public'
		) combined
		GROUP BY group_id
		`,
		ids,
		func(i int, count int) { items[i].MembersCount = count },
		indexByID,
	); err != nil {
		return fmt.Errorf("load member counts: %w", err)
	}

	if err := r.populateCountMap(
		ctx,
		`SELECT fansub_group_id, COUNT(*) FROM fansub_group_aliases WHERE fansub_group_id = ANY($1) GROUP BY fansub_group_id`,
		ids,
		func(i int, count int) { items[i].AliasesCount = count },
		indexByID,
	); err != nil {
		return fmt.Errorf("load alias counts: %w", err)
	}

	return nil
}
```
**New 5th block to insert (recommended after the `AnimeRelationsCount` block, before `ReleaseVersionsCount`, since both query `anime_fansub_groups`):**
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
The `AND a.status <> 'disabled'` filter is the exact clause used by `listPublicFansubProjects` (see below) — this is the load-bearing detail that makes the new count semantically match the detail page's "Anime-Projekte" figure.

**Source-of-truth WHERE clause to mirror** — `listPublicFansubProjects` (lines 327-375, relevant fragment at 351-374):
```go
FROM anime_fansub_groups afg
JOIN anime a ON a.id = afg.anime_id
...
WHERE afg.fansub_group_id = $1
  AND a.status <> 'disabled'
ORDER BY a.title ASC, a.id ASC
```

**`populateCountMap` signature (no change needed, drop-in reuse)** (lines 1794-1824):
```go
func (r *FansubRepository) populateCountMap(
	ctx context.Context,
	query string,
	ids []int64,
	assign func(index int, count int),
	indexByID map[int64]int,
) error {
	rows, err := r.db.Query(ctx, query, ids)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var groupID int64
		var count int
		if err := rows.Scan(&groupID, &count); err != nil {
			return fmt.Errorf("scan group count row: %w", err)
		}
		index, ok := indexByID[groupID]
		if ok {
			assign(index, count)
		}
	}

	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate group count rows: %w", err)
	}

	return nil
}
```

---

### `backend/internal/models/fansub.go` (`FansubGroup` struct, model, CRUD field addition)

**Current count-field block** (lines 55-58, within the full struct at lines 36-62):
```go
AnimeRelationsCount     int               `json:"anime_relations_count"`
ReleaseVersionsCount    int               `json:"release_versions_count"`
MembersCount            int               `json:"members_count"`
AliasesCount            int               `json:"aliases_count"`
```
**Insert new field** (matching the `{Noun}Count` Go / `{noun}_count` JSON naming convention, no `omitempty` — always present):
```go
ProjectsCount           int               `json:"projects_count"`
```
Position: after `AnimeRelationsCount`, before `ReleaseVersionsCount` (keeps semantically-related "anime relation" fields adjacent).

---

### `shared/contracts/fansubs.yaml` (`FansubGroup` schema, config)

**Current count-field block** (lines 583-586, within the full schema at lines 567-588):
```yaml
anime_relations_count: int32
release_versions_count: int32
members_count: int32
aliases_count: int32
```
**Insert:** `projects_count: int32` in the same position as the Go struct (after `anime_relations_count`).

---

### `backend/internal/repository/fansub_repository_test.go` (new test, source-invariant)

**Analog:** `TestAttachGroupCounts_MembersCountMatchesCountVisibleTeamMembers` (lines 108-151, full test):
```go
// TestAttachGroupCounts_MembersCountMatchesCountVisibleTeamMembers pins the
// AO4-01 counting semantics for the MembersCount batch at the source level
// (no DB harness available here). ...
func TestAttachGroupCounts_MembersCountMatchesCountVisibleTeamMembers(t *testing.T) {
	src, err := os.ReadFile("fansub_repository.go")
	if err != nil {
		t.Fatalf("read fansub repository: %v", err)
	}
	content := string(src)

	start := strings.Index(content, "func (r *FansubRepository) attachGroupCounts(")
	if start < 0 {
		t.Fatalf("attachGroupCounts function not found")
	}
	end := strings.Index(content, "func (r *FansubRepository) attachGroupLinks(")
	if end < 0 || end < start {
		t.Fatalf("could not bound attachGroupCounts function body")
	}
	body := content[start:end]

	for _, fragment := range []string{
		"fansub_group_members",
		"status = 'active'",
		"hist_fansub_group_members",
		"visibility = 'public'",
		"GROUP BY group_id",
	} {
		if !strings.Contains(body, fragment) {
			t.Fatalf("expected MembersCount batch query to contain %q", fragment)
		}
	}

	if strings.Contains(body, "profile_visibility = 'public'") || strings.Contains(body, "profile_visibility='public'") {
		t.Fatalf("MembersCount batch must not filter active members by profile_visibility = 'public' (would exclude private/unclaimed active members, contradicting listProjectionMembers)")
	}
	if strings.Contains(body, "FROM fansub_members") {
		t.Fatalf("MembersCount batch must not reference legacy fansub_members table")
	}
}
```
**New test to add**, same technique (source-inspect the `attachGroupCounts` function body string, same `start`/`end` bounding via `strings.Index`), asserting the new `ProjectsCount` query fragment contains `"anime_fansub_groups afg"`, `"JOIN anime a"`, and `"a.status <> 'disabled'"` — prevents a future refactor from silently dropping the status filter and reintroducing the `anime_relations_count` inflation bug this phase specifically avoids (per RESEARCH.md Q2 checklist item 5).

---

## Shared Patterns

### SSR list page scaffold (fetch → sort/transform → 3-way branch)
**Source:** `frontend/src/app/members/ranking/page.tsx` (full file)
**Apply to:** `frontend/src/app/fansubs/page.tsx`
```tsx
export const dynamic = 'force-dynamic'

export default async function XPage(...) {
  let result: ... | null = null
  let fetchError: unknown = null
  try {
    result = await getX(...)
  } catch (error) {
    fetchError = error
  }
  return (
    <main className={styles.page} aria-label="...">
      <PageHeader ... />
      {fetchError ? (
        <ErrorState {...getErrorStateCopy(fetchError, { defaultTitle, defaultDescription })} />
      ) : result && result.data.length === 0 ? (
        <EmptyState title="..." description="..." />
      ) : result ? (
        <Table>...</Table>
      ) : null}
    </main>
  )
}
```

### Round avatar/logo with initials fallback
**Source:** `frontend/src/components/ui/AvatarStack.tsx` lines 23-30 (initials) + 49-57 (Image usage)
**Apply to:** the logo cell in `/fansubs/page.tsx`'s directory row
```tsx
{group.logo_url ? (
  <Image src={resolveApiUrl(group.logo_url)} alt="" width={32} height={32} className={styles.logoImage} unoptimized />
) : (
  <span aria-hidden="true">{initials(group.name)}</span>
)}
```

### Batched per-group SQL count aggregation
**Source:** `backend/internal/repository/fansub_repository.go` `attachGroupCounts` (lines 1649-1731) + `populateCountMap` (lines 1794-1824)
**Apply to:** the optional `ProjectsCount` addition — always follow the `populateCountMap(ctx, query, ids, assign, indexByID)` drop-in shape; never fan out per-group queries.

### Vitest SSR-page test scaffold
**Source:** `frontend/src/app/members/ranking/page.test.tsx` (full file)
**Apply to:** `frontend/src/app/fansubs/page.test.tsx`
```tsx
// @vitest-environment jsdom
const { getXMock } = vi.hoisted(() => ({ getXMock: vi.fn() }))
vi.mock('next/link', () => ({ default: ({ href, children, ...props }) => <a href={href} {...props}>{children}</a> }))
vi.mock('@/lib/api', () => ({ getX: getXMock, ApiError: class extends Error { status: number; constructor(s, m) { super(m); this.status = s } } }))
afterEach(() => vi.clearAllMocks())
async function renderPage(...) { return render(await Page(...)) }
```

## No Analog Found

None. Every file in scope has a direct, exact analog (either `members/ranking/page.tsx` for the new SSR page/test, or the file's own existing code for the additive modifications).

## Metadata

**Analog search scope:** `frontend/src/app/`, `frontend/src/components/layout/`, `frontend/src/components/ui/`, `frontend/src/lib/api.ts`, `frontend/src/types/fansub.ts`, `frontend/src/app/fansubs/[slug]/`, `backend/internal/repository/fansub_repository.go`, `backend/internal/repository/fansub_repository_test.go`, `backend/internal/models/fansub.go`, `shared/contracts/fansubs.yaml`
**Files scanned:** 14 (all read directly, no re-reads of overlapping ranges)
**Pattern extraction date:** 2026-07-28

## PATTERN MAPPING COMPLETE
