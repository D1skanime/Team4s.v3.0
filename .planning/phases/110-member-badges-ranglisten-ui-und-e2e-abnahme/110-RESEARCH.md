# Phase 110: Member-Badges, Ranglisten-UI und E2E-Abnahme - Research

**Researched:** 2026-07-27
**Domain:** Next.js App Router (public SSR pages) + Go/Gin/pgx read-projection extension over an existing, immutable point ledger
**Confidence:** HIGH

## Summary

Phase 110 (as scoped by `110-CONTEXT.md`, which is authoritative over the broader ROADMAP.md entry)
is a **small, purely additive read-side feature**: one new public ranking page, one new metric on
an existing profile hero, and 8 new catalog entries in an existing badge-display component. No new
migration, no new backend write path, no new domain model is required — every data source already
exists and is already queryable.

The three UI ideas map to three narrow, independent implementation seams:

1. **`/members/ranking`** — a new public page consuming the already-implemented, already-paginated
   `getMemberPointRanking()` / `MemberPointRankingRow` (Phase 109). Zero backend work.
2. **Hero point count** — requires **one new field** (`total_points`) added end-to-end (Go model →
   repository query → OpenAPI → frontend type) to the *existing* `GetPublicMemberProfile` /
   `PublicMemberProfileData` contract. This field does not exist yet anywhere in the stack.
3. **Role-entry badges** — requires **no schema change**, but does require a **live-computed (not
   stored) badge projection** added to the existing `loadPublicBadges` query path. This is the one
   part of the phase with real architectural risk: the existing `member_badges` table/repository is
   a *persisted, explicitly-upserted* badge store (Phase 68's badge engine), and D-03's "Live-
   Projektion" requirement (badge disappears the instant its backing point is reversed) is
   **incompatible with that persisted-upsert pattern** unless a badge-engine job runs on every
   ledger mutation. The correct approach is a computed UNION added at profile-read time, never
   writing to `member_badges` for these 8 badges.

**Primary recommendation:** Treat this as 3 small, independently shippable slices in the order the
user specified (ranking page → hero number → badges), reusing 100% of existing `@/components/ui`
primitives and the existing `MemberBadgeChain` fallback rendering path, with one small new Go query
helper (role-entry live badge derivation) and one small new field threaded through 4 files
(model/repository/OpenAPI/frontend type) for the hero point count.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Global ranking list (data) | API/Backend | Database | `member_point_totals` (Phase 109, trigger-maintained) already exposed via `GET /api/v1/member-point-ranking`; no new backend work |
| Global ranking list (page) | Frontend Server (SSR) | Browser (pagination nav) | New `/members/ranking` route, SSR fetch like `/fansubs/[slug]`; page-change interaction needs a thin client wrapper (see Pitfall 2) |
| Nav entry "Rangliste" | Frontend Server (SSR shell) | — | Static addition to `AppShell.tsx` `publicItems` arrays (both authenticated and anonymous variants) |
| Hero point count | API/Backend | Frontend Server (SSR) | New `total_points` field must be computed in Go (`LEFT JOIN member_point_totals`) and passed through the existing profile DTO; frontend only renders it |
| Role-entry badge derivation | API/Backend | Database | Must be computed from `point_ledger_entries`/`release_role_credit_lifecycles` at read time — this is domain logic, not a UI concern, and must never live in the frontend |
| Role-entry badge display | Frontend Server (SSR) | — | Purely rendering; reuses existing `MemberBadgeChain` + `memberBadgeLabels.ts` catalog, zero new UI logic |

<phase_requirements>
## Phase Requirements

This phase does not use lettered/numbered REQUIREMENTS.md IDs (no `REQUIREMENTS.md` entries exist
for Phase 110 — it is tracked purely via ROADMAP.md success criteria, further narrowed by
`110-CONTEXT.md`). Per the project's own recorded pattern
(`project_v12_letter_requirement_ids` memory), this is expected for phases planned via
discuss-phase/CONTEXT rather than a REQUIREMENTS.md entry, and is not a gap.

| Roadmap criterion | CONTEXT scope | Research support |
|----|-------------|------------------|
| SC1 (global/group ranking, active vs. historical, profile links) | Reduced to: global ranking only, `slug !== null` → link / `slug === null` → plain text | `getMemberPointRanking`, `MemberPointRankingRow.slug` — confirmed nullable, exactly matches this rule |
| SC2 (category breakdown) | Explicitly deferred | N/A — not in this phase |
| SC3 (profile badges, no self-care points, existing style/UI-system/mobile/a11y) | In scope: hero point count (D-02) + role-entry badges (D-03) | `MemberProfileHero.tsx`, `MemberBadgeChain.tsx`, `memberBadgeLabels.ts` mapped below |
| SC4 (progress/points-source/reversal/badge-conditions visible, no per-row API fan-out) | Partially in scope: no-fan-out constraint applies to ranking page; "points source/reversal insight" is deferred (D-02: "keine Aufschlüsselung") | `ListRanking` is already a single flat query, no N+1 risk |
| SC5 (full E2E/UAT across lifecycle) | Explicitly deferred to a future small phase | N/A — not in this phase |
| SC6 (security/abuse test suite) | Explicitly deferred to a future small phase | N/A — not in this phase |

</phase_requirements>

## Standard Stack

No new libraries. This phase is 100% composition of existing in-house code.

### Core (existing, reused)
| Component/Module | Location | Purpose | Why reused, not new |
|---|---|---|---|
| `getMemberPointRanking()` / `MemberPointRankingRow` | `frontend/src/lib/api.ts` (~line 9379) | Fetch paginated global ranking | Built in Phase 109 exactly for this consumer; page size fixed server-side at 50 |
| `MemberPointTotalsRepository.ListRanking` | `backend/internal/repository/member_point_totals_repository.go` | Single flat query over `member_point_totals JOIN members`, `ORDER BY total_points DESC, id ASC`, `LIMIT/OFFSET` | Already no-fan-out, already public-visibility-filtered |
| `MemberBadgeChain` / `memberBadgeLabels.ts` | `frontend/src/components/profile/` | Badge display + catalog + locked-state fallback | UI-SPEC and CONTEXT both lock this as the only badge UI surface |
| `HeroMetrics` | `frontend/src/components/ui/HeroMetrics.tsx` | Simple `<dl>` label/value metric list | Already used identically in `FansubHeroSection.tsx` |
| `Table`/`TableHead`/`TableBody`/`TableRow`/`TableHeaderCell`/`TableCell` | `frontend/src/components/ui/Table.tsx` | Ranking table markup | Mandatory global primitive (CLAUDE.md) |
| `Pagination` (ui, NOT anime-domain variant) | `frontend/src/components/ui/Pagination.tsx` | Page navigation | UI-SPEC explicitly locks this variant; see Pitfall 2 for its client-only nature |
| `EmptyState` / `ErrorState` / `getErrorStateCopy` | `frontend/src/components/ui/` | Empty/error rendering | Standard pattern across all public list pages |
| `AppShell.tsx` `publicItems` (both variants) | `frontend/src/components/layout/AppShell.tsx` (lines ~119 and ~184) | Nav entry | Two separate arrays exist — authenticated (`AppShellAuthedNavGroups`, group label "Public-Bereich") and anonymous (`AppShellAnonNavGroups`, group label "Entdecken") — **both** must get the new item |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Live-computed role-entry badges | Persisting them into `member_badges` via a badge-engine job (Phase 68 pattern) | Rejected by D-03 itself ("Live-Projektion... kein 'einmal erreicht, bleibt für immer'"); would also require a new trigger/job infra this phase explicitly avoids |
| Role reconstruction via `source_key` string parsing | Join on `release_role_credit_lifecycles.role_code` | Both work; the join is the cleaner, type-safe option — see Pitfall 1 |

**Installation:** None — no new packages for this phase.

## Package Legitimacy Audit

Not applicable — this phase introduces zero new external dependencies (frontend or backend).

## Architecture Patterns

### System Architecture Diagram

```
Browser (anonymous OR authenticated)
   │
   ├─ clicks "Rangliste" nav item (AppShell, both variants) ──► GET /members/ranking
   │                                                                  │
   │                                                    Next.js Server Component (SSR)
   │                                                        reads searchParams.page
   │                                                                  │
   │                                                    getMemberPointRanking(page) [lib/api.ts]
   │                                                                  │
   │                                                    GET /api/v1/member-point-ranking?page=N
   │                                                                  │
   │                                                    MemberPointRankingHandler (Go/Gin)
   │                                                                  │
   │                                                    MemberPointTotalsRepository.ListRanking
   │                                                       SELECT ... FROM member_point_totals mpt
   │                                                       JOIN members m ON m.id = mpt.member_id
   │                                                       WHERE m.profile_visibility='public'
   │                                                       ORDER BY total_points DESC, id ASC
   │                                                       LIMIT 50 OFFSET (page-1)*50
   │                                                                  │
   │                                            ◄──── rows{member_id,display_name,slug,total_points}
   │                                                                  │
   │                                        renders <Table> rows: slug!=null → <Link>, else plain text
   │                                        renders <Pagination> (client wrapper pushes ?page=N)
   │
   └─ visits /members/[slug] ───────────────────────────────► GET /api/v1/members/:slug
                                                                       │
                                                    MemberProfileRepository.GetPublicMemberProfile
                                                       │
                                                       ├─ base row (existing CTE)
                                                       ├─ NEW: LEFT JOIN member_point_totals → total_points
                                                       ├─ loadMemberships (existing)
                                                       ├─ loadPublicBadges (EXTENDED, see below)
                                                       │     ├─ existing: SELECT ... FROM member_badges
                                                       │     │            WHERE status='active' AND visibility='public'
                                                       │     └─ NEW: SELECT DISTINCT role_code
                                                       │              FROM release_role_credit_lifecycles
                                                       │              WHERE member_id=$1 AND lifecycle_status='awarded'
                                                       │              → synthesized PublicMemberBadge{badge_code:'role_entry_'+role_code, badge_category:'role_entry'}
                                                       └─ ... (unchanged: contributions, projects, media)
                                                                       │
                                        ◄──── PublicMemberProfileData{ ..., total_points, public_badges:[...existing, ...role_entry] }
                                                                       │
                                        MemberProfileHero: <HeroMetrics items=[{label:'Punkte', value: total_points}]>
                                        MemberBadgeChain: renders existing catalog + 8 static role_entry_* catalog
                                                          entries, marking earned ones from public_badges
```

### Recommended Project Structure
No new directories. Additions land in existing files/locations:
```
frontend/src/app/members/ranking/
├── page.tsx                    # new — SSR ranking page
├── page.module.css             # new — reuse public-page-shell tokens (min(max-width, gutter))
└── RankingPaginationNav.tsx     # new — thin 'use client' wrapper around ui Pagination (see Pitfall 2)

frontend/src/components/layout/AppShell.tsx        # edit — add "Rangliste" to both publicItems arrays
frontend/src/components/profile/MemberProfileHero.tsx  # edit — add HeroMetrics for total_points (public view only)
frontend/src/components/profile/memberBadgeLabels.ts   # edit — add 8 role_entry_* catalog entries
frontend/src/types/profile.ts                       # edit — add total_points to PublicMemberProfileData
frontend/src/lib/api.ts                             # no change needed — getMemberPointRanking already exists

backend/internal/models/member_profile.go           # edit — add TotalPoints int64 `json:"total_points"`
backend/internal/repository/member_profile_repository.go  # edit — extend base CTE join + loadPublicBadges
shared/contracts/openapi.yaml                       # edit — add total_points (required) to PublicMemberProfileData schema
```

### Pattern 1: SSR page consuming an existing paginated public API helper
**What:** Async Server Component reads `searchParams`, calls the typed `lib/api.ts` helper directly
(no client fetch, no loading spinner needed).
**When to use:** Any public, unauthenticated, paginated list page — this is the established Team4s
pattern (`/members/[slug]/page.tsx`, `/anime/page.tsx` both do this).
**Example:**
```tsx
// Source: frontend/src/app/anime/page.tsx (existing pattern, Next 16 App Router)
interface RankingPageProps {
  searchParams: Promise<{ page?: string }> | { page?: string }
}
export default async function RankingPage({ searchParams }: RankingPageProps) {
  const resolved = (await searchParams) ?? {}
  const page = Math.max(1, Number(resolved.page) || 1)
  const response = await getMemberPointRanking(page)
  // ...
}
```

### Pattern 2: HeroMetrics single-metric hero addition
**What:** A `<dl>`-based label/value pair appended into an existing hero panel.
**Example:**
```tsx
// Source: frontend/src/components/fansubs/FansubHeroSection.tsx (existing, verified usage)
<HeroMetrics items={[{ label: 'Punkte', value: totalPoints }]} ariaLabel="Mitglied-Punktzahl" />
```

### Pattern 3: Live-computed badge UNION (no persistence)
**What:** Extend the existing `loadPublicBadges` repository method to append synthetic,
computed-not-stored badge rows alongside the persisted `member_badges` rows, in the same
`[]models.PublicMemberBadge` slice the frontend already consumes unmodified.
**Example (illustrative, based on confirmed schema — see Pitfall 1 for the join decision):**
```go
// Source: backend/internal/repository/member_profile_repository.go (loadPublicBadges, to extend)
func (r *MemberProfileRepository) loadPublicBadges(ctx context.Context, memberID int64) ([]models.PublicMemberBadge, error) {
    // ... existing member_badges query unchanged ...

    roleRows, err := r.db.Query(ctx, `
        SELECT DISTINCT role_code
        FROM release_role_credit_lifecycles
        WHERE member_id = $1 AND lifecycle_status = 'awarded'
        ORDER BY role_code
    `, memberID)
    // ... append models.PublicMemberBadge{ID: 0, BadgeCode: "role_entry_"+roleCode, BadgeCategory: "role_entry"} ...
}
```

### Anti-Patterns to Avoid
- **Persisting role-entry badges into `member_badges`:** Directly contradicts D-03's "Live-
  Projektion" requirement — a reversed point would leave a stale `active` badge row until some
  future job revoked it. Do not call `BadgeRepository.UpsertMemberBadge` for these 8 badges.
- **Reconstructing role from `source_key` string parsing:** Works (the key contains
  `role:<code>:generation:`) but is fragile (format-coupled, no DB-level guarantee). Prefer the
  `release_role_credit_lifecycles.role_code` join (see Pitfall 1).
- **Client-fetching the ranking list with `useEffect`:** The rest of the public surface (`/anime`,
  `/members/[slug]`, `/fansubs/[slug]`) is SSR. Breaking that pattern here would be inconsistent and
  would forfeit SEO for a page reachable from anonymous nav.
- **Runtime aggregation of ranking (e.g. `SUM` over `point_ledger_entries` per request):** Phase 109
  deliberately built `member_point_totals` as a trigger-maintained materialized total precisely to
  avoid this. Always read `member_point_totals`, never re-aggregate the ledger for display.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Ranking pagination UI | A custom page-number component | `@/components/ui` `Pagination` | Mandated by CLAUDE.md global-UI rule; UI-SPEC explicitly names it |
| Badge rendering (locked/earned, icon, palette) | A new badge card/grid | `MemberBadgeChain` + `memberBadgeLabels.ts` catalog additions | CONTEXT/UI-SPEC lock this; component already handles earned-vs-locked, progress %, and unknown-badge fallback |
| Role → points-eligibility list | A hardcoded duplicate of `FANSUB_GROUP_ROLE_OPTIONS` filtered to "points-eligible" | The existing generic fallback in `getMemberBadgePresentation()` (Sparkles/mint) for any role not in the static 8-entry catalog | D-03 explicitly forbids a hardcoded role list at the derivation layer; the fallback already exists and needs no new code |

**Key insight:** Every piece of UI needed for this phase already exists in some form elsewhere in
the codebase (hero metric, badge chain, table, pagination, empty/error state). The actual net-new
work is almost entirely (a) one new route composing existing pieces, and (b) one backend query
extension. Treat any urge to build new list/badge/metric UI components as a signal to re-check the
existing component inventory first.

## Common Pitfalls

### Pitfall 1: Two viable ways to derive "role" per ledger entry — pick the join, not the string parse
**What goes wrong:** `point_ledger_entries` (migration `0131_member_point_foundation.up.sql`) has NO
`role`/`slot` column. The `Slot` field passed into `CreditCommand` (see
`backend/internal/services/release_crew_service.go` line ~314) is used only to build the
`idempotency_key` (`point_service.go` `buildCreditIdempotencyKey`) — it is **not persisted** as a
queryable column on the ledger row itself.
**Why it happens:** The role is embedded in two places instead: (1) as a substring inside
`source_key`, which for `release_role_work` entries has the exact shape
`"release-version:%d:group:%d:member:%d:role:%s:generation:%d"` (see `releaseCrewSourceKey` in
`release_crew_service.go`), and (2) as a real typed column `role_code` on
`release_role_credit_lifecycles` (migration `0137_phase108_contribution_sources.up.sql`), which has
a nullable-free `award_entry_id BIGINT UNIQUE REFERENCES point_ledger_entries(id)` and a
`lifecycle_status` enum (`pending`/`awarded`/`reversed`).
**How to avoid:** Join on `release_role_credit_lifecycles.role_code` filtered to
`lifecycle_status = 'awarded'`. This is strictly safer than regex/substring parsing of
`source_key` and gives the exact "net-positive in this role" semantics D-03 asks for **for free**:
because `release_role_work` is a fixed 1-point rule (`point_rules` row `('release_role_work', 1,
'fansub_work', 1)`, confirmed in `0137...up.sql`) and every reversal is a strict 1:1 cancellation of
exactly one prior award (`chk_point_ledger_entry_shape`, `uq_point_ledger_direct_reversal` unique
index), `lifecycle_status = 'awarded'` for a given `(member_id, role_code)` is exactly equivalent to
"≥1 net-positive `release_role_work` point in that role." No separate SUM/aggregation query needed.
**Warning signs:** If a future refactor changes `release_role_work`'s point value away from a flat
1, or allows multiple simultaneous awards per `(member_id, role_code)` without reversing the prior
one, the join-based `lifecycle_status='awarded'` check and a true ledger-SUM check could diverge —
re-verify the equivalence assumption at that point.

### Pitfall 2: `@/components/ui` `Pagination` is a client-only component with an `onPageChange` callback — it cannot be dropped directly into an SSR page
**What goes wrong:** `Pagination.tsx` is marked `'use client'` and takes `onPageChange?: (page:
number) => void` — a function prop that cannot cross the server/client boundary directly, and there
is no built-in `href`/query-string mode.
**Why it happens:** Every existing consumer of this exact component (`AdminUsersClient.tsx`,
`dev/ui-system` showcase) is a fully client-rendered component with local `useState` for the current
page. The one other public paginated page found (`/anime/[id]/group/[groupId]/releases`) sidesteps
this by using a **different**, domain-specific `@/components/anime/Pagination` — which the UI-SPEC
for this phase explicitly forbids reusing here.
**How to avoid:** Build a small dedicated client wrapper (e.g. `RankingPaginationNav.tsx`) that
receives `currentPage`/`totalPages` as server-rendered props and, in its `onPageChange` handler,
calls `router.push`/`router.replace` with an updated `?page=` query string via
`next/navigation`'s `useRouter`. This preserves the page as SSR (the Server Component reruns with
new `searchParams` on navigation) while still using the exact mandated `@/components/ui` primitive.
Do not build a fully client-fetched ranking page just to make `Pagination` fit more easily — that
would break the established SSR-first public-page convention.
**Warning signs:** A plan/task that imports `Pagination` directly into an `async function
RankingPage()` server component body will fail to compile/hydrate (client component boundary
violation) unless wrapped.

### Pitfall 3: `total_points` does not exist anywhere yet — it must be threaded through 4 layers, not just added to the frontend
**What goes wrong:** It is tempting to assume the field already exists on the profile DTO because
`MemberPointRankingRow.total_points` exists (Phase 109). They are unrelated: `total_points` on the
ranking row comes from a completely separate handler/repository
(`MemberPointRankingHandler`/`MemberPointTotalsRepository.ListRanking`), not from
`GetPublicMemberProfile`.
**How to avoid:** Add the field in this exact order to keep OpenAPI/Go/TS in sync (per
`AUTH-API-CLIENT-01`/contract-sync conventions already established in this repo):
1. `backend/internal/models/member_profile.go`: add `TotalPoints int64 \`json:"total_points"\`` to
   `PublicMemberProfile`.
2. `backend/internal/repository/member_profile_repository.go`: add
   `LEFT JOIN member_point_totals mpt ON mpt.member_id = m.id` to the base CTE, select
   `COALESCE(mpt.total_points, 0) AS total_points`, scan it into the row struct.
3. `shared/contracts/openapi.yaml`: add `total_points: {type: integer, format: int64}` to the
   `PublicMemberProfileData` schema's `properties` and `required` list.
4. `frontend/src/types/profile.ts`: add `total_points: number` to `PublicMemberProfileData`.
**Warning signs:** A hero showing "undefined Punkte" or a TypeScript build error on
`profile.total_points` if step 4 is done before steps 1–3 land.

### Pitfall 4: The AppShell nav item must be added twice, not once
**What goes wrong:** `AppShell.tsx` has **two separate** `publicItems` array literals: one inside
`AppShellAuthedNavGroups` (~line 119, rendered under group label "Public-Bereich") for logged-in
users, and one inside `AppShellAnonNavGroups` (~line 184, rendered under group label "Entdecken")
for anonymous visitors. D-01 requires the nav entry "visible anonym UND eingeloggt" — adding it to
only one array silently breaks the other user state.
**How to avoid:** Add the identical `{ label: 'Rangliste', href: '/members/ranking', icon: <Trophy
size={17} />, current: isCurrent(currentPath, '/members/ranking') }` entry to both arrays, directly
after the existing `'Anime entdecken'` entry in each (per UI-SPEC: "placed directly next to `Anime
entdecken`").
**Warning signs:** Manual UAT only catching one of the two session states (e.g. testing logged-in
only) would miss this; an `AppShell.test.tsx` case per state is the safety net (see Validation
Architecture below).

### Pitfall 5: `MemberBadgeChain` earned/locked state depends entirely on the badge appearing in `earnedBadges` on that specific page load — never memoize it client-side
**What goes wrong:** If a role-entry badge were cached (e.g. in a client store, localStorage, or a
long-lived SWR/React Query cache) across reversal events, a revoked badge could appear "earned"
after its underlying point was reversed, directly violating D-03.
**How to avoid:** No new caching layer is introduced by this phase (profile is SSR-fetched fresh per
request, matching current behavior) — the UI-SPEC already flags this ("the frontend must not
cache/memoize earned-badge membership beyond the current page load"). Simply do not add one.
**Warning signs:** Any task description proposing client-side badge state persistence should be
rejected during planning.

## Code Examples

### Reading the paginated ranking response shape (already implemented, Phase 109)
```typescript
// Source: frontend/src/lib/api.ts (existing, verified)
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

### Row link rule (D-01)
```tsx
// slug !== null -> account member, links to public profile
// slug === null -> historical entry without profile, plain text, per D-01
{row.slug !== null
  ? <Link href={`/members/${row.slug}`}>{row.display_name}</Link>
  : <span>{row.display_name}</span>}
```

### Badge catalog extension shape (matches existing `MEMBER_BADGE_PRESENTATIONS` entries exactly)
```typescript
// Source: frontend/src/components/profile/memberBadgeLabels.ts (existing pattern to extend)
export const MEMBER_BADGE_PRESENTATIONS: Record<string, MemberBadgePresentation> = {
  // ...existing entries...
  role_entry_translator: { label: 'Erste Übersetzung', variant: 'info', Icon: Languages, palette: 'indigo' },
  // ...7 more, per UI-SPEC table...
}
```

## State of the Art

Not applicable in the "old vs. current library approach" sense — this is an internal, in-house
system with no external library churn to track. The one relevant internal precedent shift:

| Old approach (Phase 68) | Current approach (this phase, per D-03) | When changed | Impact |
|---|---|---|---|
| Badges computed by a background "badge engine" job and persisted/upserted into `member_badges` | Badges computed live at profile-read time, never persisted, for the specific case of role-entry badges | User decision in `110-CONTEXT.md` (2026-07-27) | Only applies to the 8 new `role_entry_*` badges — existing `member_badges`-backed badges (`founding_member`, `historical_leader`, etc.) are unaffected and keep using the old persisted pattern |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `lifecycle_status='awarded'` in `release_role_credit_lifecycles` is a fully sufficient proxy for "≥1 net-positive `release_role_work` point in that role" (Pitfall 1) | Architecture Patterns / Pitfall 1 | If this equivalence is ever broken by a future change to `release_role_work`'s point value or reversal semantics, role-entry badges could show incorrect earned/locked state. Verified against current migrations (0131/0137/0139) and current `release_crew_service.go` — HIGH confidence for the current codebase state, but flagged as an assumption about invariants holding, not a language/library fact. |
| A2 | No project skill/rule files exist under `.claude/skills/` or a project-local rules directory that add further constraints beyond CLAUDE.md | Project Constraints | Low — `.claude/skills/` was not found in this repo during research; if a rules directory is added later this section would need revisiting |

**If this table is empty:** N/A — see above; both items are inferences from verified current-state
code/schema, not external/training-data claims, but are logged per protocol as reasoning that
depends on invariants rather than directly-observed facts.

## Open Questions (RESOLVED)

1. **Should the hero point count render for `isPublicView === false` (own-profile edit view)?**
   - What we know: UI-SPEC explicitly scopes D-02 to the public profile hero only
     (`isPublicView` branch), deferring the own-profile edit view.
   - What's unclear: Whether the user would want to see their own point count while editing their
     profile (arguably higher value than on the public view, since only the owner needs "editable
     control" framing, not points).
   - Recommendation: Follow the UI-SPEC/CONTEXT scope exactly for this phase (public view only) —
     it was already discussed and locked; do not expand scope without a new discuss-phase round.

2. **Exact synthetic `id` value for computed (non-persisted) `PublicMemberBadge` rows.**
   - What we know: `PublicMemberBadge.ID` is required in both the Go struct and the OpenAPI schema
     (`required: [id, badge_code, badge_category]`), but the frontend `MemberBadgeChain` never reads
     `.id` for rendering or keying (it keys on `badge_code`).
   - What's unclear: Whether to emit `0`, a deterministic negative hash, or synthesize an ID from
     `release_role_credit_lifecycles.id` for these computed rows.
   - Recommendation: Emit `0` (or the underlying `release_role_credit_lifecycles.id` if trivially
     available in the same query, which is slightly more informative for future debugging) — since
     nothing downstream depends on uniqueness of this field today. Document the choice in a code
     comment so a future consumer doesn't assume `id` uniquely identifies a `member_badges` row.

## Environment Availability

Skipped — this phase has no new external tool/service dependency. It reuses the existing Docker
Compose stack (Postgres, Go backend on :8092/container-internal, Next.js frontend) already running
per the project's standing dev setup.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (frontend) | Vitest 3 + @testing-library/react, jsdom via per-file `// @vitest-environment jsdom` directive |
| Framework (backend) | Go `testing` + `testify`; Postgres-backed contract tests via `testsupport.OpenPhase106Postgres` disposable harness pattern (seen in `point_service_credit_test.go`, `phase109_member_point_totals_test.go`) |
| Config file | `frontend/vitest.config.ts` (existing) |
| Quick run command (frontend) | `npm run test -- MemberBadgeChain` / `npm run test -- ranking` (Vitest, from `frontend/`) |
| Quick run command (backend) | `go test ./internal/repository/... ./internal/handlers/... -run MemberPointRanking` / `-run PublicMemberProfile` |
| Full suite command | `npm run test` (frontend) and `go test ./...` (backend, from `backend/`) |

### Phase Requirements → Test Map
| Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-------------------|-------------|
| Ranking row link rule (slug present → Link, slug null → plain text) | unit (RTL) | `npm run test -- ranking` | ❌ Wave 0 — new `page.test.tsx` or extracted row-render helper test |
| AppShell nav item present in both authenticated and anonymous states | unit (RTL) | `npm run test -- AppShell` | Extend existing `AppShell.test.tsx` (file exists) |
| `total_points` present and correct on public profile response | Go repository test | `go test ./internal/repository/... -run TestGetPublicMemberProfile` | Extend existing `member_profile_repository_test.go` if present, else new file — verify presence during Wave 0 |
| Role-entry badge appears when `lifecycle_status='awarded'` for that role, disappears when reversed | Go repository test (Postgres-backed, disposable harness) | `go test ./internal/repository/... -run TestLoadPublicBadges` | ❌ Wave 0 — new test using the existing `testsupport.OpenPhase106Postgres` + migrations 0131/0137/0139 harness pattern |
| Role-entry badge never appears for a role that never earned `release_role_work` points (e.g. `fansub_lead`) | Go repository test | same as above | ❌ Wave 0 |
| `MemberBadgeChain` renders the 8 new catalog entries in locked state by default, earned state when present in `earnedBadges` | unit (RTL) | `npm run test -- MemberBadgeChain` | Extend existing `MemberBadgeChain.test.tsx` (file exists) |

### Sampling Rate
- **Per task commit:** targeted `npm run test -- <file>` / `go test ./internal/... -run <Test>`
- **Per wave merge:** `npm run test` (frontend) + `go test ./...` (backend)
- **Phase gate:** Full suite green, then live Docker UAT per project convention (`docker restart
  team4sv30-backend` after backend changes per `reference_backend_docker_rebuild` memory,
  `docker restart team4sv30-frontend` + hard-refresh after frontend changes per
  `testing_live_dev_server` memory — dev-mode HMR does not reliably apply here) before
  `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `frontend/src/app/members/ranking/page.test.tsx` (or equivalent) — covers row link rule,
      empty state, error state
- [ ] Backend repository test covering `total_points` on `GetPublicMemberProfile` (extend existing
      profile repository test file if one exists for this method — verify at plan time; if none
      exists, this is also the first white-box regression test for that query path)
- [ ] Backend repository test covering role-entry badge derivation (awarded → visible, reversed →
      gone, non-points-eligible role → never appears) — new, using the existing disposable Postgres
      harness pattern already established in `point_service_credit_test.go` /
      `phase109_member_point_totals_test.go`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | All three surfaces are explicitly unauthenticated/public reads (ranking page mirrors `/archiv`, profile page already has an existing owner-preview branch unaffected by this phase) |
| V3 Session Management | No | No session state introduced |
| V4 Access Control | Partially | Ranking already filters `profile_visibility='public'` server-side (existing `ListRanking` query) — this phase does not change that filter and must not weaken it |
| V5 Input Validation | Yes | `page` query param on the new ranking route: reuse the exact existing clamp behavior (`page<1→1`, `page>1000→1000`, non-numeric → 1) already implemented in `MemberPointRankingHandler.GetMemberPointRanking` — do not reimplement parsing/clamping client-side as the source of truth |
| V6 Cryptography | No | Not applicable |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Enumerating non-public members' data via crafted ranking page params | Information Disclosure | Already mitigated — `ListRanking` joins `members` and filters `profile_visibility='public'`; this phase's page must not add a client-side "show all" toggle or bypass |
| Trusting client-supplied role/points data to render badges | Tampering | Not applicable — badges are always derived server-side from `point_ledger_entries`/`release_role_credit_lifecycles`, never client-supplied |
| Stale/incorrect badge state after a point reversal (functional-security overlap, ties to D-03) | Tampering (state integrity) | Live-computed-at-read-time query (Pitfall 1/3), no caching (Pitfall 5) |

Note: the roadmap's broader SC6 ("keine Selbstbestätigung, kein doppeltes Buchen, keine Scope-
Überschreitung...") is explicitly **out of scope** for this phase per `110-CONTEXT.md`'s divergence
note — those guarantees were already built and tested in Phases 106/107/107.1/108 (self-review
block, idempotency keys, atomic first-decision-wins) and this phase only adds read-side display of
their results. No new abuse surface is introduced by adding a read-only ranking page or a read-only
badge/points display.

## Project Constraints (from CLAUDE.md)

- **Global UI primitives mandatory:** every user-facing surface in this phase MUST use
  `@/components/ui` (Button, Select, FormField, Modal, Input, Textarea, Tabs, Drawer, Card, Table,
  Pagination, HeroMetrics, EmptyState, ErrorState, PageHeader, …). No hand-built `<select>`,
  `<input>`, `<textarea>`, `<button>`, or bespoke markup for a type the library already provides.
  Enforced by `gsd-ui-checker` and `frontend/eslint.config.mjs` `no-restricted-syntax`.
- **Correct German umlauts required** in all user-facing strings (JSX text, labels, aria-labels,
  toasts, error copy, Go response strings). ASCII substitutes (ae/oe/ue/ss) are forbidden in
  user-facing text. Code identifiers are exempt.
- **450-line file limit** for production code files — if `RankingPaginationNav.tsx` or the ranking
  `page.tsx` grow close to this, split helpers out (matches existing project convention, e.g.
  `SegmenteTab.helpers.tsx`, `AnimeJellyfinAssetUploadControls.tsx` split precedent).
- **GSD workflow enforcement:** file-changing work must go through `/gsd:execute-phase` (or
  `/gsd:quick`/`/gsd:debug` for smaller scope) — not raw edits outside a GSD command.
- **Phases execute directly on `main`**, no worktrees (`workflow.use_worktrees: false`) — never
  `git stash` open changes; commit artifacts by explicit path.

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `frontend/src/lib/api.ts` (`getMemberPointRanking`, `MemberPointRankingRow`) — read directly
- `backend/internal/repository/member_point_totals_repository.go` — read directly
- `backend/internal/handlers/member_point_totals_handler.go` — read directly
- `database/migrations/0131_member_point_foundation.up.sql` — read directly (point_ledger_entries
  schema, confirms no `slot`/`role` column exists on the ledger itself)
- `database/migrations/0137_phase108_contribution_sources.up.sql` — read directly
  (`release_role_credit_lifecycles.role_code`, point rule values)
- `database/migrations/0139_member_point_totals.up.sql` — read directly (trigger-maintained totals,
  write-guard trigger)
- `backend/internal/services/release_crew_service.go`, `point_service.go` — read directly (`Slot`
  field usage, `source_key` shape, idempotency key construction)
- `backend/internal/repository/member_profile_repository.go`, `badge_repository.go` — read directly
  (`loadPublicBadges`, `member_badges` persisted-badge pattern)
- `backend/internal/models/member_profile.go` — read directly (`PublicMemberProfile` struct, no
  `total_points` field currently)
- `shared/contracts/openapi.yaml` (`PublicMemberProfileData`, `PublicMemberBadge`,
  `/api/v1/member-point-ranking`) — read directly
- `frontend/src/components/profile/MemberProfileHero.tsx`, `MemberBadgeChain.tsx`,
  `memberBadgeLabels.ts`, `MemberBadgeChain.test.tsx` — read directly
- `frontend/src/components/layout/AppShell.tsx`, `AppShell.test.tsx` — read directly (both
  `publicItems` arrays located and line-numbered)
- `frontend/src/components/ui/{Table,Pagination,EmptyState,ErrorState,HeroMetrics}.tsx` — read
  directly (confirmed `Pagination` is `'use client'` with `onPageChange` callback prop)
- `frontend/src/components/fansubs/FansubHeroSection.tsx` — read directly (confirmed `HeroMetrics`
  real-world usage pattern)
- `frontend/src/types/fansub.ts` (`FANSUB_GROUP_ROLE_OPTIONS`) — read directly (12 roles total, 8
  points-eligible per UI-SPEC/CONTEXT, 4 governance-only: `fansub_lead`, `designer`, `techadmin`,
  `gfxler`)
- `.planning/phases/110-.../110-CONTEXT.md`, `110-DISCUSSION-LOG.md`, `110-UI-SPEC.md` — read
  directly (authoritative scope, locked decisions, exact copy/component contract)
- `.planning/ROADMAP.md` (Phases 106–110 entries) — read directly (broader roadmap scope, confirmed
  superseded/narrowed by CONTEXT.md per its own divergence note)
- `.planning/STATE.md` — read directly (confirms Phase 109 status "3 of 3" executing at CONTEXT
  gather time, no runtime contradictions found)

### Secondary / Tertiary
None — no WebSearch/Context7/external-docs lookups were needed for this phase; it is 100% internal,
existing-codebase composition with no new external library or unfamiliar framework surface.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every component/helper cited was read directly from the repository at
  research time; no version-drift risk since nothing new is installed.
- Architecture: HIGH — the live-vs-persisted badge distinction (Pitfall 1/3) and the
  Pagination-is-client-only finding (Pitfall 2) were both verified against actual source, not
  inferred from documentation or memory.
- Pitfalls: HIGH — all 5 pitfalls are grounded in specific, quoted code/schema evidence gathered in
  this session, not general domain knowledge.

**Research date:** 2026-07-27
**Valid until:** Effectively indefinite for the architectural facts (they describe the current,
committed schema/code state, not a moving external dependency) — but re-verify against the live
repo if Phase 109/108 code changes land between this research and plan execution, since this
research assumes the Phase 106–109 foundation is stable as read.
