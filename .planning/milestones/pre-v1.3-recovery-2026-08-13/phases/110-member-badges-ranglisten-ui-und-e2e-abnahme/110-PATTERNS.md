# Phase 110: Member-Badges, Ranglisten-UI und E2E-Abnahme - Pattern Map

**Mapped:** 2026-07-27
**Files analyzed:** 10 (7 to create, 8 to modify — 5 frontend, 3 backend + 1 contract)
**Analogs found:** 10 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/app/members/ranking/page.tsx` (new) | route (SSR page) | request-response (paginated read) | `frontend/src/app/anime/page.tsx` (SSR searchParams pattern) + `frontend/src/app/archiv/page.tsx` (empty/error inline pattern to upgrade to ui primitives) | role-match (exact page-shape, but archiv hand-rolls empty/error — must upgrade to `EmptyState`/`ErrorState`) |
| `frontend/src/app/members/ranking/page.module.css` (new) | config/style | n/a | `frontend/src/app/archiv/page.module.css` / `frontend/src/app/anime/[id]/group/[groupId]/page.module.css` (public-page-shell tokens) | role-match |
| `frontend/src/app/members/ranking/RankingPaginationNav.tsx` (new) | component (client wrapper) | request-response (client nav → SSR re-fetch) | `frontend/src/components/ui/Pagination.tsx` (wrapped) — no existing exact "client Pagination wrapper for SSR page" file exists in-repo | no analog (new pattern, see below) |
| `frontend/src/components/layout/AppShell.tsx` (edit, both `publicItems` arrays) | component (nav) | event-driven (nav click → route) | itself — extend existing `publicItems` arrays (lines 119-122 authenticated, 184-188 anonymous) | exact |
| `frontend/src/components/profile/MemberProfileHero.tsx` (edit) | component (hero) | request-response (render profile field) | `frontend/src/components/fansubs/FansubHeroSection.tsx` (`HeroMetrics` usage) | exact |
| `frontend/src/components/profile/memberBadgeLabels.ts` (edit) | utility (catalog/lookup) | transform (badge_code → presentation) | itself — extend `MEMBER_BADGE_PRESENTATIONS` / `PUBLIC_MEMBER_BADGE_CATALOG` | exact |
| `backend/internal/models/member_profile.go` (edit, `PublicMemberProfile` struct) | model | CRUD (read DTO) | itself — add `TotalPoints int64` field alongside `PublicBadges` | exact |
| `backend/internal/repository/member_profile_repository.go` (edit, base CTE + `loadPublicBadges`) | service/repository | CRUD (read, single-row + join) | itself — extend `GetPublicMemberProfile` (lines 391-560) and `loadPublicBadges` (lines 564-588) | exact |
| `shared/contracts/openapi.yaml` (edit, `PublicMemberProfileData` schema) | config (contract) | n/a | itself — `PublicMemberBadge` schema (lines 10803-10819) as sibling-field style template | exact |
| `frontend/src/types/profile.ts` (edit, `PublicMemberProfileData`) | model (frontend type) | transform (DTO mirror) | itself — `PublicMemberBadge` interface (lines 144-148) as sibling-field style template | exact |
| Backend Postgres-integration test (new, role-entry badge derivation + `total_points`) | test | CRUD (read verification) | `backend/internal/repository/member_point_totals_repository_test.go` (`openMemberPointTotalsPostgres` harness pattern built on `testsupport.OpenPhase106Postgres`) | role-match |
| `frontend/src/app/members/ranking/page.test.tsx` (new) | test | request-response | `frontend/src/components/layout/AppShell.test.tsx` (RTL render + `screen.getByRole('link', ...)` assertions) | role-match |
| `frontend/src/components/layout/AppShell.test.tsx` (edit, extend) | test | event-driven | itself — existing nav-link assertion pattern (e.g. "gives signed-in non-admin members a visible path...") | exact |
| `frontend/src/components/profile/MemberBadgeChain.test.tsx` (edit, extend) | test | transform | itself — existing dynamic-import + catalog-array test pattern | exact |

## Pattern Assignments

### `frontend/src/app/members/ranking/page.tsx` (route, request-response)

**Analog:** `frontend/src/app/anime/page.tsx` (SSR searchParams shape) + `frontend/src/app/archiv/page.tsx` (public-page fetch/empty/error flow, but note: archiv hand-rolls its empty/error markup — for Phase 110, CLAUDE.md/UI-SPEC require using `EmptyState`/`ErrorState` from `@/components/ui` instead of copying archiv's raw `<div className={styles.archivErrorState}>` pattern).

**SSR searchParams pattern** (`frontend/src/app/anime/page.tsx` lines 17-59):
```tsx
interface AnimePageProps {
  searchParams:
    | Promise<{ page?: string | string[]; /* ... */ }>
    | { page?: string | string[]; /* ... */ }
    | undefined
}
export default async function AnimePage({ searchParams }: AnimePageProps) {
  const resolvedSearchParams = ((await searchParams) ?? {}) as ResolvedAnimeSearchParams
  const page = toNumber(resolvedSearchParams.page, 1)
  // ...
}
```
For Phase 110, adapt exactly this shape but calling `getMemberPointRanking(page)` from `frontend/src/lib/api.ts` (already implemented, Phase 109):
```typescript
// Source: frontend/src/lib/api.ts lines 9379-9411 (existing, verified)
export interface MemberPointRankingRow {
  member_id: number
  display_name: string
  slug: string | null
  total_points: number
}
export interface MemberPointRankingResponse {
  data: MemberPointRankingRow[]
  total: number
  page: number
}
export async function getMemberPointRanking(page?: number): Promise<MemberPointRankingResponse>
```

**Force-dynamic marker** (`frontend/src/app/archiv/page.tsx` line 10, `frontend/src/app/anime/page.tsx` line 14):
```tsx
// Diese Route haengt von Query-Parametern ab -- kein SSG-Caching.
export const dynamic = 'force-dynamic'
```

**Fetch + error handling** (`frontend/src/app/archiv/page.tsx` lines 60-74, adapt to ui `ErrorState`/`getErrorStateCopy` instead of the local `fetchError` string used there):
```tsx
let result: Awaited<ReturnType<typeof getMemberPointRanking>> | null = null
let fetchError: unknown = null
try {
  result = await getMemberPointRanking(currentPage)
} catch (error) {
  fetchError = error
}
```
Then render `<ErrorState {...getErrorStateCopy(fetchError, { defaultTitle: 'Rangliste konnte nicht geladen werden', defaultDescription: 'Bitte versuche es später erneut.' })} />` per UI-SPEC copy contract — do NOT copy archiv's raw `role="alert"` div.

**Row link rule (D-01)** — exact code to use, already specified in RESEARCH.md and matching `MemberPointRankingRow.slug: string | null`:
```tsx
{row.slug !== null
  ? <Link href={`/members/${row.slug}`}>{row.display_name}</Link>
  : <span>{row.display_name}</span>}
```

**Table primitive usage** (`frontend/src/components/ui/Table.tsx`, full file, 78 lines — exports `Table`, `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableCell`, `TableEmptyState`):
```tsx
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui'
// <Table><TableHead><TableRow><TableHeaderCell scope="col">Rang</TableHeaderCell>...
```

**Empty state primitive** (`frontend/src/components/ui/EmptyState.tsx`, full file):
```tsx
export interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  variant?: 'default' | 'withAction' | 'compact'
}
```
Real consumer example (`frontend/src/components/profile/RecentContributionsSection.tsx` line 1, 101):
```tsx
import { Badge, Button, Card, EmptyState } from '@/components/ui'
// ...
return <EmptyState title="Noch keine Projekte sichtbar." />
```
Apply with UI-SPEC copy: `title="Noch keine Punkte vergeben"` / `description="Sobald Mitwirkende für akzeptierte Beiträge Punkte erhalten, erscheinen sie hier in der Rangliste."`

**Error state primitive + copy helper** (`frontend/src/components/ui/ErrorState.tsx`, full file, 73 lines):
```typescript
export function getErrorStateCopy(error: unknown, options: ErrorStateCopyOptions = {}): Pick<ErrorStateProps, 'title' | 'description'>
export function ErrorState({ title, description, action }: ErrorStateProps)
```
Real consumers: `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx`, `.../ReleaseVersionMediaReviewSection.tsx`.

---

### `frontend/src/app/members/ranking/RankingPaginationNav.tsx` (component, client wrapper — new pattern, no direct analog)

**Why no analog:** Confirmed via direct read of `frontend/src/components/ui/Pagination.tsx` (full file, 53 lines) — it is `'use client'` with an `onPageChange?: (page: number) => void` callback prop, not an `href`-based nav. No existing consumer in the repo uses it from inside an SSR page (`AdminUsersClient.tsx` and the `/dev/ui-system` showcase are both fully client components). The one other public paginated page (`/anime`) uses a **different** domain-specific `@/components/anime/Pagination`, explicitly forbidden by the UI-SPEC for this phase.

**Pagination component contract to wrap** (`frontend/src/components/ui/Pagination.tsx`, full file):
```tsx
'use client'
export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange?: (page: number) => void
}
export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  // returns null if totalPages <= 1
  // renders "Zurück" / page-number buttons / "Weiter" via internal <Button>
}
```

**Required wrapper shape** (write new, following `useRouter` pattern already used in `AppShell.tsx` line 5, 284):
```tsx
'use client'
import { useRouter } from 'next/navigation'
import { Pagination } from '@/components/ui'

export function RankingPaginationNav({ currentPage, totalPages }: { currentPage: number; totalPages: number }) {
  const router = useRouter()
  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={(page) => router.push(page > 1 ? `/members/ranking?page=${page}` : '/members/ranking')}
    />
  )
}
```
This preserves SSR-first (Server Component reruns on new `searchParams`) while using the mandated `@/components/ui` primitive. Do not build a fully client-fetched ranking page.

---

### `frontend/src/components/layout/AppShell.tsx` (component, event-driven — extend both `publicItems` arrays)

**Analog:** itself.

**Authenticated variant** (lines 119-122, inside `AppShellNavGroups`, group label `'Public-Bereich'` set at line 139):
```tsx
const publicItems: AppShellNavItem[] = [
  { label: 'Anime entdecken', href: '/anime', icon: <Compass size={17} />, current: isCurrent(currentPath, '/anime') },
  { label: 'Dashboard', icon: <LayoutDashboard size={17} />, disabled: true, badge: 'bald' },
]
```

**Anonymous variant** (lines 184-188, inside `AppShellAnonNavGroups`, group label `'Entdecken'` set at line 192):
```tsx
const publicItems: AppShellNavItem[] = [
  { label: 'Anime entdecken', href: '/anime', icon: <Compass size={17} />, current: isCurrent(currentPath, '/anime') },
  { label: 'Fansub-Gruppen', icon: <Users size={17} />, disabled: true, badge: 'bald' },
  { label: 'Suche', icon: <Compass size={17} />, disabled: true, badge: 'bald' },
]
```

**Item to add to BOTH arrays, directly after `'Anime entdecken'`** (per Pitfall 4 — a single-array edit silently breaks the other session state):
```tsx
{ label: 'Rangliste', href: '/members/ranking', icon: <Trophy size={17} />, current: isCurrent(currentPath, '/members/ranking') },
```
Requires adding `Trophy` to the existing `lucide-react` import block (line 8-17).

**isCurrent helper already exists** (line 64-66), reuse as-is — do not reimplement route-matching.

**Test pattern to extend** (`frontend/src/components/layout/AppShell.test.tsx`, e.g. lines 41-52, 505-515 — render + `screen.getByRole('link', { name: /X/i })` + `getAttribute('href')`):
```tsx
it('shows Rangliste nav item for signed-in members', () => {
  render(<AppShell currentPath="/anime"><main>x</main></AppShell>)
  const link = screen.getByRole('link', { name: /Rangliste/i })
  expect(link.getAttribute('href')).toBe('/members/ranking')
})
it('shows Rangliste nav item for anonymous visitors', () => {
  render(<AppShell mode="anonymous" currentPath="/anime"><main>x</main></AppShell>)
  fireEvent.click(screen.getByRole('button', { name: /Navigation/i }))
  expect(screen.getByRole('link', { name: /Rangliste/i }).getAttribute('href')).toBe('/members/ranking')
})
```
Note the test file mocks `next/link`, `next/navigation`, `next/image`, and `@/lib/useAuthSession` at the top (lines 9-33) — no new mocks needed for a static nav item addition.

---

### `frontend/src/components/profile/MemberProfileHero.tsx` (component, request-response)

**Analog:** `frontend/src/components/fansubs/FansubHeroSection.tsx` (`HeroMetrics` real usage, line 4 import, line 142 usage).

**Imports pattern** (`FansubHeroSection.tsx` line 4):
```typescript
import { Badge, HeroMetrics } from '@/components/ui'
```
`MemberProfileHero.tsx` currently imports (line 4): `import { Button, PageHeader } from '@/components/ui'` — extend to add `HeroMetrics`.

**HeroMetrics contract** (`frontend/src/components/ui/HeroMetrics.tsx`, full file):
```tsx
export interface HeroMetricItem { label: string; value: ReactNode }
export interface HeroMetricsProps { items: HeroMetricItem[]; ariaLabel: string; className?: string }
export function HeroMetrics({ items, ariaLabel, className }: HeroMetricsProps) {
  if (items.length === 0) return null
  // renders a <dl> of label/value pairs
}
```

**Usage pattern** (`FansubHeroSection.tsx` line 142):
```tsx
<HeroMetrics items={heroStats} ariaLabel="Gruppenkennzahlen" />
```

**Insertion point in `MemberProfileHero.tsx`** — inside `styles.heroCopy` (existing block, lines 163-197), directly below `heroTitleRow` (lines 164-170), above the bio paragraph (line 171), and only in the `isPublicView` branch:
```tsx
{isPublicView ? (
  <HeroMetrics items={[{ label: 'Punkte', value: profile.total_points }]} ariaLabel="Mitglied-Punktzahl" />
) : null}
```
`profile.total_points` requires the new field to be threaded through `PublicMemberProfileData` first (see backend/contract/type sections below) — `profile` here is typed `MemberProfileData | PublicMemberProfileData` (line 14).

---

### `frontend/src/components/profile/memberBadgeLabels.ts` (utility, transform)

**Analog:** itself — existing catalog structure to extend (full file, 67 lines).

**Existing shape to copy exactly** (lines 1-51):
```typescript
export type MemberBadgePalette = 'gold' | 'indigo' | 'orange' | 'mint' | 'red'
export type MemberBadgePresentation = { label: string; variant: MemberBadgeVariant; Icon: LucideIcon; palette: MemberBadgePalette }
export type PublicMemberBadgeCatalogItem = { badge_code: string; label: string; badge_category: string }

export const MEMBER_BADGE_PRESENTATIONS: Record<string, MemberBadgePresentation> = {
  founding_member: { label: 'Gründungsmitglied', variant: 'warning', Icon: Crown, palette: 'gold' },
  // ... 8 existing entries ...
}
export const PUBLIC_MEMBER_BADGE_CATALOG: PublicMemberBadgeCatalogItem[] = [
  { badge_code: 'founding_member', label: MEMBER_BADGE_PRESENTATIONS.founding_member.label, badge_category: 'historical_achievement' },
  // ... 8 existing entries ...
]
```

**8 new entries to add** (exact codes/labels/icons/palette locked by UI-SPEC section 3 — copy this table verbatim):
```typescript
// Add to lucide-react import (line 1-11): Languages, Clock3, Cpu, Type, ShieldCheck, ClipboardList, Scissors, HardDrive
role_entry_translator: { label: 'Erste Übersetzung', variant: 'info', Icon: Languages, palette: 'indigo' },
role_entry_timer: { label: 'Erstes Timing', variant: 'info', Icon: Clock3, palette: 'indigo' },
role_entry_encoder: { label: 'Erster Encode', variant: 'info', Icon: Cpu, palette: 'indigo' },
role_entry_typesetter: { label: 'Erstes Typesetting', variant: 'info', Icon: Type, palette: 'indigo' },
role_entry_quality_checker: { label: 'Erste Qualitätsprüfung', variant: 'info', Icon: ShieldCheck, palette: 'indigo' },
role_entry_project_lead: { label: 'Erste Dokumentation als Projektleitung', variant: 'info', Icon: ClipboardList, palette: 'indigo' },
role_entry_editor: { label: 'Erstes Editing', variant: 'info', Icon: Scissors, palette: 'indigo' },
role_entry_raw_provider: { label: 'Erste Raw-Bereitstellung', variant: 'info', Icon: HardDrive, palette: 'indigo' },
```
Corresponding `PUBLIC_MEMBER_BADGE_CATALOG` entries all use `badge_category: 'role_entry'`, appended after the existing 9 entries (append order matches `MemberBadgeChain.tsx`'s `catalogWithEarnedBadges()` append behavior — no reordering).

**Generic fallback already covers unknown roles** (lines 57-66, do not duplicate):
```typescript
export function getMemberBadgePresentation(badgeCode: string): MemberBadgePresentation {
  return MEMBER_BADGE_PRESENTATIONS[badgeCode] ?? { label: badgeCode, variant: 'neutral', Icon: Sparkles, palette: 'mint' }
}
```

**Consuming component — no changes needed** (`MemberBadgeChain.tsx`, full file, 89 lines): already handles earned/locked rendering, progress percentage, and unknown-badge fallback generically via `catalogWithEarnedBadges()` (lines 18-36) and `getMemberBadgePresentation()` (line 66). Confirmed zero new UI logic required.

**Test pattern to extend** (`frontend/src/components/profile/MemberBadgeChain.test.tsx` lines 1-50 — dynamic import + local catalog array + RTL `screen`/`within` assertions):
```tsx
const catalog: MemberBadgeCatalogItem[] = [
  { badge_code: 'founder', label: 'Gründungsmitglied', badge_category: 'historical_achievement' },
  { badge_code: 'role_entry_translator', label: 'Erste Übersetzung', badge_category: 'role_entry' },
]
// render <MemberBadgeChain earnedBadges={[{ id: 1, badge_code: 'role_entry_translator', badge_category: 'role_entry' }]} catalog={catalog} />
// assert earned vs. locked state per badge_code
```

---

### `backend/internal/models/member_profile.go` (model, CRUD)

**Analog:** itself — `PublicMemberProfile` struct (lines 243-266).

**Field to add**, next to `PublicBadges` (line 259):
```go
type PublicMemberProfile struct {
	// ... existing fields ...
	PublicBadges               []PublicMemberBadge                `json:"public_badges"`
	TotalPoints                int64                              `json:"total_points"`
	// ... remaining existing fields ...
}
```

**Existing sibling DTO to mirror style** (`PublicMemberBadge`, lines 185-191):
```go
// PublicMemberBadge ist ein schlankes Badge-DTO fuer oeffentlich sichtbare Badges
// (visibility='public' AND status='active'). Eingebettet in PublicMemberProfile (D-11/Badges-13).
type PublicMemberBadge struct {
	ID            int64  `json:"id"`
	BadgeCode     string `json:"badge_code"`
	BadgeCategory string `json:"badge_category"`
}
```

---

### `backend/internal/repository/member_profile_repository.go` (repository, CRUD)

**Analog:** itself — `GetPublicMemberProfile` (lines 391-560) and `loadPublicBadges` (lines 564-588).

**Base CTE to extend with `LEFT JOIN member_point_totals`** (current shape, lines 405-461 — the `candidates` CTE joins `member_claims`, `app_users`, `media_assets` via `LEFT JOIN`/`LEFT JOIN LATERAL`; add one more `LEFT JOIN member_point_totals mpt ON mpt.member_id = m.id` inside the CTE, select `COALESCE(mpt.total_points, 0) AS total_points`, add to the outer `SELECT`/`Scan` list, and set `profile.TotalPoints = row.totalPoints` after line 493-514 struct construction). Follow the exact `LEFT JOIN ... ON ...` style already used at lines 429-439:
```go
LEFT JOIN app_users legacy_user ON legacy_user.legacy_user_id = m.user_id
LEFT JOIN media_assets avatar ON avatar.id = m.avatar_media_id
LEFT JOIN media_assets background ON background.id = m.background_media_id
LEFT JOIN member_point_totals mpt ON mpt.member_id = m.id  -- NEW
```
Note: `findPublicMemberProfileByNormalizedSlug` (fallback path, line 590 onward) queries the same base fields and must also be extended — verify at plan time whether it needs an identical join (fallback triggers on `pgx.ErrNoRows`, line 477-484).

**`loadPublicBadges` full current body** (lines 564-588, to extend with a UNION-style second query, NOT a persisted write):
```go
// loadPublicBadges laedt nur visibility='public' AND status='active' Badges eines Members.
// Projektions-Hilfsfunktion fuer GetPublicMemberProfile (CTE-Erweiterung ausgelagert wegen 450-Zeilen-Limit).
func (r *MemberProfileRepository) loadPublicBadges(ctx context.Context, memberID int64) ([]models.PublicMemberBadge, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, badge_code, badge_category
		FROM member_badges
		WHERE member_id=$1 AND status='active' AND visibility='public'
		ORDER BY awarded_at
	`, memberID)
	if err != nil {
		return []models.PublicMemberBadge{}, fmt.Errorf("load public badges for member %d: %w", memberID, err)
	}
	defer rows.Close()

	items := make([]models.PublicMemberBadge, 0)
	for rows.Next() {
		var b models.PublicMemberBadge
		if err := rows.Scan(&b.ID, &b.BadgeCode, &b.BadgeCategory); err != nil {
			return nil, fmt.Errorf("scan public badge row for member %d: %w", memberID, err)
		}
		items = append(items, b)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate public badges for member %d: %w", memberID, err)
	}
	return items, nil
}
```
**Extension shape** (append a second query result, same error-wrapping/`fmt.Errorf` idiom, never call `BadgeRepository.UpsertMemberBadge`):
```go
roleRows, err := r.db.Query(ctx, `
	SELECT DISTINCT role_code
	FROM release_role_credit_lifecycles
	WHERE member_id = $1 AND lifecycle_status = 'awarded'
	ORDER BY role_code
`, memberID)
if err != nil {
	return items, fmt.Errorf("load role-entry badges for member %d: %w", memberID, err)
}
defer roleRows.Close()
for roleRows.Next() {
	var roleCode string
	if err := roleRows.Scan(&roleCode); err != nil {
		return nil, fmt.Errorf("scan role-entry badge row for member %d: %w", memberID, err)
	}
	items = append(items, models.PublicMemberBadge{ID: 0, BadgeCode: "role_entry_" + roleCode, BadgeCategory: "role_entry"})
}
if err := roleRows.Err(); err != nil {
	return nil, fmt.Errorf("iterate role-entry badges for member %d: %w", memberID, err)
}
```

**Schema confirmed** (`database/migrations/0137_phase108_contribution_sources.up.sql` lines 15-51):
```sql
CREATE TABLE release_role_credit_lifecycles (
    ...
    role_code TEXT NOT NULL CHECK (btrim(role_code) <> ''),
    lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN ('pending', 'awarded', 'reversed')),
    award_entry_id BIGINT NULL UNIQUE
    ...
    CHECK ((lifecycle_status = 'awarded' AND award_entry_id IS NOT NULL) ...)
);
```

**Anti-pattern reference — do NOT copy this pattern for role-entry badges** (`backend/internal/repository/badge_repository.go` lines 53-76, `UpsertMemberBadge` persisted-write pattern used by the Phase 68 badge engine for the OTHER 9 existing badges — explicitly wrong for D-03's live-projection requirement):
```go
func (r *BadgeRepository) UpsertMemberBadge(ctx context.Context, memberID int64, badgeCode string, badgeCategory string, derivedFromType string, derivedFromID int64) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO member_badges (member_id, badge_code, badge_category, derived_from_type, derived_from_id, status, visibility, awarded_at)
		VALUES ($1, $2, $3, $4, $5, 'active', 'public', NOW())
		ON CONFLICT (member_id, badge_code) DO UPDATE SET status = 'active', awarded_at = NOW(), ...
	`, ...)
	return err
}
```

**Related existing read-only pattern to mirror instead** (`backend/internal/repository/badge_repository.go` lines 118-145, `GetPublicMemberBadges` — same `member_badges` query as `loadPublicBadges`, confirms the read-projection idiom is consistent across both repositories).

**450-line limit flag:** `member_profile_repository.go` is already 1823 lines — well past the 450-line convention. The existing code already works around this via extracted helper methods (`loadPublicBadges`, `loadMemberships`, `loadRecentMedia`, etc. — see comment at line 563: "Projektions-Hilfsfunktion... ausgelagert wegen 450-Zeilen-Limit"). Follow this established extraction convention: keep the role-entry badge query as a small, separately-testable addition inside `loadPublicBadges` rather than growing `GetPublicMemberProfile` itself. Do not attempt to split the whole file in this phase — that is out of scope; only avoid making the violation worse.

---

### `shared/contracts/openapi.yaml` (contract, PublicMemberProfileData schema)

**Analog:** itself — `PublicMemberBadge` schema (lines 10803-10819) as a template for adding one new required scalar field.

**Target location** (`PublicMemberProfileData`, lines 10904-10920 `required` array, properties start at 10921):
```yaml
PublicMemberProfileData:
  type: object
  required:
    - member_id
    - fansub_name
    - is_currently_active
    - profile_status
    - profile_visibility
    - memberships
    - public_badges
    - total_points          # NEW
    - recent_media
    - recent_contributions
    - current_projects
    - latest_contributions
    - previous_contributions
    - previous_contributions_count
  properties:
    member_id:
      type: integer
      format: int64
    # ...
    total_points:           # NEW, placed near public_badges for readability
      type: integer
      format: int64
```

---

### `frontend/src/types/profile.ts` (frontend type, transform)

**Analog:** itself — `PublicMemberBadge` interface (lines 144-148) as sibling-field style, and `PublicMemberProfileData` interface (lines 202-231) as the edit target.

```typescript
export interface PublicMemberBadge {
  id: number
  badge_code: string
  badge_category: string
}

export interface PublicMemberProfileData {
  member_id: number
  fansub_name: string
  // ... existing fields ...
  public_badges: PublicMemberBadge[]
  total_points: number   // NEW — add near public_badges
  recent_media: MemberProfileRecentMedia[]
  // ... remaining existing fields ...
}
```

---

### Backend Postgres-integration test (new file — role-entry badge derivation + `total_points`)

**Analog:** `backend/internal/repository/member_point_totals_repository_test.go` (full file, 216 lines) — establishes the disposable-Postgres-fixture-per-test pattern this phase's new backend tests should follow, since `member_profile_repository_test.go`'s **current** tests are source-string-invariant checks (`os.ReadFile` + `strings.Contains`), not live-DB tests — the role-entry badge behavior (awarded → visible, reversed → gone) cannot be verified by string matching and needs a real query result.

**Harness composition pattern** (`member_point_totals_repository_test.go` lines 30-45, building on `openPointLedgerPostgres` in `point_ledger_repository_test.go` lines 266-275, both ultimately calling `testsupport.OpenPhase106Postgres`):
```go
func openPointLedgerPostgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase106Postgres(t)
	_, file, _, _ := runtime.Caller(0)
	testsupport.ApplySQLFile(t, pool, filepath.Join(filepath.Dir(file), "..", "..", "..", "database", "migrations", "0131_member_point_foundation.up.sql"))
	if _, err := pool.Exec(context.Background(), `INSERT INTO members(id) VALUES (1); INSERT INTO app_users(id) VALUES (10); INSERT INTO fansub_groups(id) VALUES (20); INSERT INTO release_versions(id) VALUES (30); INSERT INTO point_rules(id, rule_code, rule_version, category, point_value) VALUES (101, 'release_work', 1, 'fansub_work', 10)`); err != nil {
		t.Fatal(err)
	}
	return pool
}
```
For Phase 110, the new test helper must additionally apply `0137_phase108_contribution_sources.up.sql` (for `release_role_credit_lifecycles`) and `0139_member_point_totals.up.sql` (for `member_point_totals`, following `member_point_totals_repository_test.go` lines 30-35 exactly), plus the `members` column extensions (`nickname`, `display_name`, `profile_visibility` — lines 37-41) if `GetPublicMemberProfile`'s slug-lookup path is exercised.

**Test body style to copy** (`member_point_totals_repository_test.go` lines 105-125, `TestMemberPointTotalsPostgresReversalLowersTotal` — award then reverse then assert):
```go
func TestMemberPointTotalsPostgresReversalLowersTotal(t *testing.T) {
	pool := openMemberPointTotalsPostgres(t)
	ledger := NewPointLedgerRepository(pool)
	award, err := ledger.InsertAward(context.Background(), postgresAwardInput("award:mpt-reversal"))
	require.NoError(t, err)
	_, err = ledger.InsertReversal(context.Background(), PointReversalInput{ OriginalEntryID: award.ID, /* ... */ })
	require.NoError(t, err)
	var total int64
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT total_points FROM member_point_totals WHERE member_id = 1`).Scan(&total))
	require.Equal(t, int64(0), total, "Award+Reversal muss netto wieder auf 0 zurueckfallen (D-01/D-06)")
}
```
Adapt this exact award→reverse→assert shape for role-entry badges: insert a `release_role_credit_lifecycles` row with `lifecycle_status='awarded'`, call `MemberProfileRepository.GetPublicMemberProfile` (or a narrower direct call to `loadPublicBadges` if exported/testable), assert `role_entry_<code>` is present in `PublicBadges`; then flip `lifecycle_status` to `'reversed'` and assert it disappears.

---

### `frontend/src/app/members/ranking/page.test.tsx` (test, new)

**Analog:** `frontend/src/components/layout/AppShell.test.tsx` (RTL render + `next/navigation`/`next/link` mocking pattern, lines 1-38) — the ranking page is also a component that needs `next/link` mocked for its row-link assertions, and (if `RankingPaginationNav` is tested in isolation) `next/navigation`'s `useRouter` mocked the same way (lines 18-22):
```tsx
// @vitest-environment jsdom
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => <a href={href} {...props}>{children}</a>,
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))
```
Test cases to cover per RESEARCH.md Wave 0 gaps: row link rule (`slug !== null` → `<a href="/members/{slug}">`, `slug === null` → plain text), empty state render, error state render (mock `getMemberPointRanking` rejecting).

## Shared Patterns

### Global UI primitives (mandatory, CLAUDE.md)
**Source:** `frontend/src/components/ui/{Table,Pagination,EmptyState,ErrorState,HeroMetrics,PageHeader}.tsx`
**Apply to:** `members/ranking/page.tsx`, `RankingPaginationNav.tsx`, `MemberProfileHero.tsx` edits. No hand-built `<select>`/`<input>`/`<textarea>`/`<button>` or bespoke markup — note that `frontend/src/app/archiv/page.tsx` (an older page) hand-rolls its filter `<select>`/`<input>` and its empty/error `<div>`s; this is **legacy, non-compliant with current CLAUDE.md rules** and must NOT be copied for Phase 110's new code, only its SSR/searchParams structure should be reused.

### Client-side pagination wrapper for an SSR page (new pattern established by this phase)
**Source:** `frontend/src/components/ui/Pagination.tsx` (client-only, callback-based) + `next/navigation`'s `useRouter` (already used in `AppShell.tsx` line 5/284)
**Apply to:** `RankingPaginationNav.tsx` only. This is the first consumer of `@/components/ui` `Pagination` from inside an SSR page context in this codebase — document the wrapper clearly since it is a new composition, not a copy of an existing file.

### Live-computed (never persisted) derived data
**Source:** `backend/internal/repository/member_profile_repository.go` `loadPublicBadges` (existing read-only `member_badges` query, lines 564-588) as the "read shape" to match; explicitly AVOID `backend/internal/repository/badge_repository.go` `UpsertMemberBadge` (lines 53-76) and `RevokeMemberBadge` (lines 81-90) as write patterns for the 8 new badges.
**Apply to:** role-entry badge derivation only. `member_point_totals` (read via `LEFT JOIN`, never written by application code — see `member_point_totals_repository.go` header comment lines 23-26: "Es enthaelt keine Schreibmethode") is the correct model for "trigger-maintained, read-only from Go" — the role-entry badge derivation follows the same never-write-from-Go principle, just computed per-request instead of trigger-maintained.

### German umlaut correctness in all new user-facing strings
**Source:** UI-SPEC Copywriting Contract (table, lines 84-97) — all copy already specified with correct umlauts (ä/ö/ü/ß): "Rangliste", "Noch keine Punkte vergeben", "Sobald Mitwirkende für akzeptierte Beiträge Punkte erhalten...", "Rangliste konnte nicht geladen werden", "Erste Übersetzung", "Erste Qualitätsprüfung", etc.
**Apply to:** every new JSX text node, aria-label, and the OpenAPI/Go response strings touched by this phase (none are error-message strings requiring translation in this phase's scope, since it is 100% read-only).

### Repository query idiom: `fmt.Errorf("<action> for <entity> %d: %w", id, err)` wrapping
**Source:** `member_profile_repository.go` `loadPublicBadges` (lines 572, 580, 585) — consistent error-wrapping style throughout the file.
**Apply to:** any new query helper added to `member_profile_repository.go` (role-entry badge query, `total_points` join scan).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `frontend/src/app/members/ranking/RankingPaginationNav.tsx` | component (client wrapper) | request-response | No existing file wraps `@/components/ui` `Pagination`'s callback prop into a `router.push`-based SSR-compatible nav — this is a genuinely new (small) composition. Confirmed via direct read of `Pagination.tsx` and grep across all consumers (`AdminUsersClient.tsx`, `/dev/ui-system` showcase — both fully client components, not SSR pages). Build per the concrete shape given above under Pattern Assignments; keep it under ~30 lines, well within the 450-line limit. |

## Metadata

**Analog search scope:** `frontend/src/app/{anime,archiv,members,fansubs}`, `frontend/src/components/{layout,profile,fansubs,ui}`, `backend/internal/{models,repository,handlers,migrations,testsupport}`, `database/migrations/{0131,0137,0139}*.sql`, `shared/contracts/openapi.yaml`.
**Files scanned:** ~30 (direct reads) across frontend components/pages/tests, backend models/repositories/handlers/tests, migrations, and the OpenAPI contract.
**Pattern extraction date:** 2026-07-27
