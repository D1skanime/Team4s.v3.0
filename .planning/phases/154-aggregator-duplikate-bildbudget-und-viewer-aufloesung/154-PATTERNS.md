# Phase 154: Aggregator-Duplikate, Bildbudget und Viewer-Auflösung - Pattern Map

**Mapped:** 2026-09-10
**Files analyzed:** 10 (all "modify-in-place" — this phase creates zero new production files;
Workstream A/B/C are surgical edits to existing files, Workstream D/E produce documentation and
possibly one new test file)
**Analogs found:** 10 / 10 (every touched file has a direct, in-repo sibling to copy from — this is
the phase's own headline finding, confirmed by re-reading every cited file)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `backend/internal/repository/member_profile_public_repository.go` (`GetPublicMemberProfileByID`, lines 116-159) | repository (aggregator) | CRUD (read, sequential loader orchestration) | itself — pattern already established at lines 121-134 (`loadPublicBadges` → append → `loadRoleVolumeBadges` → append), just needs the 3 consumer calls to receive pre-loaded counts instead of re-querying | exact (self-referential, no external analog needed) |
| `backend/internal/repository/member_profile_role_volume_repository.go` (`loadRoleVolumeBadges`, lines 117-139) | repository (pure derivation function, to become) | CRUD → transform | `member_profile_dashboard_repository.go`'s `GetOwnDashboard` (lines 196-230, calls the SAME raw-count loader and derives its own view) — shows the "call raw-count once, derive independently" shape this function must adopt | role-match, same data family |
| `backend/internal/repository/member_profile_contribution_badges_repository.go` (`loadContributionBadges`, lines 158-216) | repository (derivation function, to become) | CRUD → transform | same file's own `loadContribProjectsCount`/`loadContribChronicleCount`/`loadContribArchivistCount` (lines 68-148) — the raw-count/derive split already exists one level down; hoist one level further | exact (same file, established split pattern) |
| `backend/internal/repository/member_profile_progress_repository.go` (`loadBadgeProgress`, lines 64-153) | repository (derivation function, to become) | CRUD → transform | `member_profile_role_volume_repository.go`'s `loadRoleVolumeBadges` (already receives no external count today, but is the sibling consumer of the SAME `loadRoleVolumeCounts`) | role-match |
| `backend/internal/repository/member_profile_query_budget_test.go` (`phase131ConstantQueryBudget`, `TestPhase131PublicProfileQueryBudgetIsConstant`) | test (Go, DSN-gated regression) | batch/regression-count | itself — existing test to extend/update, not a new file | exact |
| `frontend/src/components/profile/AnimeProjectAchievementStage.tsx` (lines 27-29, 50-62) | component (client, achievement-stage hero) | request-response (pure render of already-fetched props) | `ContributionAchievementStage.tsx` lines 65-81 (primary), corroborated by `PointsAchievementStage.tsx:50-67` and `MembershipStage.tsx:44-58` | exact (3-of-4 sibling convention) |
| `frontend/src/components/profile/AnimeProjectAchievementStage.test.tsx` (does not exist yet) | test (Vitest, component) | request-response | `MemberBadgeChain.test.tsx`'s `describe('Phase 125 contribution achievement stages', ...)` block (lines 411-476), specifically the `'locks artwork, same-DOM, expanded, responsive and no-inner-engine contracts'` case (line 462) — OR the existing `'Phase 119 collection cards'` describe block (line 1180+) that already renders `AnimeProjectAchievementStage` via `MemberBadgeChain`/`renderCollections` | role-match — extend the existing `MemberBadgeChain.test.tsx` describe block rather than necessarily creating a new file (open per Wave-0 gap; see below) |
| `frontend/src/components/ui/ResponsiveImage.tsx` (fallback logic, lines 14-30) | component (client, image wrapper) | file-I/O (image fetch/optimizer passthrough) | itself + `next.config.mjs`'s `images.deviceSizes`/`images.imageSizes` config (data, not a code analog) | exact (self, needs the `unoptimized` branch replaced with a bounded derivative request) |
| `frontend/src/components/profile/MemberProfileHero.tsx` (lines 107, 175-184) | component (client, avatar branch) | request-response | itself — the existing `isAnimatedAvatar`/GIF branch is the literal precedent B3 must extend | exact (self, extend existing branch) |
| `frontend/src/lib/api.ts` (`getMemberProfile`, lines 3178-3202) | service/utility (API client function) | request-response | `getMemberProjects` (same file, lines 3212-3231) — near-identical shape (slug param, `apiClientFetch`, `signal?: AbortSignal` threaded through `{ cache: "no-store", signal }`), and `getSearch`/`getSearchSuggestions` (lines 581-605, 612-637) for the plain-`fetch`+signal variant | exact (same file, sibling function one screen below) |
| `frontend/src/lib/useMemberViewer.ts` (`fetcher` useCallback, lines 53-56) | hook (client, cancellable fetch orchestration) | event-driven (abort-signal-gated fetch) | `useCancellableSlugState.ts`'s own documented contract (lines 14-21, "Fetcher MUSS das übergebene AbortSignal ... weiterreichen") — the hook already expects `(signal: AbortSignal) => Promise<T>`; `useMemberViewer`'s fetcher is the one non-conforming caller | exact (contract already defined one file away) |

## Pattern Assignments

### `backend/internal/repository/member_profile_public_repository.go` (repository/aggregator, CRUD)

**Analog:** itself — `GetPublicMemberProfileByID`, lines 42-170 (full function read and verified against RESEARCH.md's citations; matches exactly).

**Current sequential-loader pattern to extend** (lines 115-142, verified verbatim):
```go
var loadErr error
richMemberships, loadErr := r.loadMemberships(ctx, row.memberID, 0, row.isVerified, false)
if loadErr != nil {
    return nil, loadErr
}
profile.Memberships = toPublicMemberships(richMemberships)
profile.PublicBadges, loadErr = r.loadPublicBadges(ctx, row.memberID)
if loadErr != nil {
    return nil, loadErr
}
volumeBadges, loadErr := r.loadRoleVolumeBadges(ctx, row.memberID)
if loadErr != nil {
    return nil, loadErr
}
profile.PublicBadges = append(profile.PublicBadges, volumeBadges...)
contributionBadges, loadErr := r.loadContributionBadges(ctx, row.memberID)
if loadErr != nil {
    return nil, loadErr
}
profile.PublicBadges = append(profile.PublicBadges, contributionBadges...)
profile.TotalPoints, loadErr = r.loadTotalPoints(ctx, row.memberID)
if loadErr != nil {
    return nil, loadErr
}
profile.BadgeProgress, loadErr = r.loadBadgeProgress(ctx, row.memberID, profile.TotalPoints)
if loadErr != nil {
    return nil, loadErr
}
```

**Required change shape:** insert `roleVolumeCounts, err := r.loadRoleVolumeCounts(ctx, row.memberID)` and the three `loadContrib*Count` calls ONCE here (each already returns exactly the same error-then-return-nil idiom used above — copy that idiom for the new calls), then pass the resulting values as parameters into `loadRoleVolumeBadges(counts)`, `loadContributionBadges(projectsCount, chronicleCount, archivistCount)`, and `loadBadgeProgress(memberID, totalPoints, roleVolumeCounts, projectsCount, chronicleCount, archivistCount)`. Keep every existing `if loadErr != nil { return nil, loadErr }` guard shape — it is the file's uniform error-handling convention, not something to redesign.

**Error handling pattern (uniform across this whole file):** every loader call is `value, loadErr = r.loadX(...)` immediately followed by `if loadErr != nil { return nil, loadErr }` — no wrapping, no logging at this layer (errors already carry `fmt.Errorf("...: %w", ...)` context from inside the loader). Preserve this exactly for the new hoisted calls.

---

### `backend/internal/repository/member_profile_role_volume_repository.go` (`loadRoleVolumeBadges`)

**Analog:** `member_profile_dashboard_repository.go`'s `GetOwnDashboard` (lines 196-230) — the file this function must NOT break.

**Current signature to change (self, lines 117-139, verified verbatim):**
```go
func (r *MemberProfileRepository) loadRoleVolumeBadges(ctx context.Context, memberID int64) ([]models.PublicMemberBadge, error) {
    counts, err := r.loadRoleVolumeCounts(ctx, memberID)
    if err != nil {
        return nil, err
    }

    items := make([]models.PublicMemberBadge, 0)
    for _, entry := range counts {
        progressBadge := roleVolumeProgressBadge(entry.RoleCode, entry.Count)
        ...
    }
    return items, nil
}
```

**Required change:** drop the `r.loadRoleVolumeCounts(ctx, memberID)` call inside this function; accept `counts []RoleVolumeCount` as a parameter instead (call site: aggregator loads once, passes in). The `for _, entry := range counts { ... }` derivation body below is unchanged — it already does not touch the DB.

**Do-not-touch analog (independent caller, verified):**
```
backend/internal/repository/member_profile_dashboard_repository.go:215
    roleVolumeCounts, err := r.loadRoleVolumeCounts(ctx, memberID)
```
`loadRoleVolumeCounts` itself (lines 35-61) keeps its exact `(ctx context.Context, memberID int64) ([]RoleVolumeCount, error)` signature — only `loadRoleVolumeBadges` (the CONSUMER) changes shape.

---

### `backend/internal/repository/member_profile_contribution_badges_repository.go` (`loadContributionBadges`)

**Analog:** the file's own already-extracted raw-count functions (verified verbatim, lines 68-148):
```go
func (r *MemberProfileRepository) loadContribProjectsCount(ctx context.Context, memberID int64) (int64, error) { ... }
func (r *MemberProfileRepository) loadContribChronicleCount(ctx context.Context, memberID int64) (int64, error) { ... }
func (r *MemberProfileRepository) loadContribArchivistCount(ctx context.Context, memberID int64) (int64, error) { ... }
```
These three are the "raw count, unchanged signature" tier — `GetOwnDashboard` (lines 202-213) and `loadBadgeProgress` (lines 74-85) both call them directly and must keep compiling.

**Current consumer to change (self, lines 158-216, verified verbatim excerpt):**
```go
func (r *MemberProfileRepository) loadContributionBadges(ctx context.Context, memberID int64) ([]models.PublicMemberBadge, error) {
    items := make([]models.PublicMemberBadge, 0)

    projectsCount, err := r.loadContribProjectsCount(ctx, memberID)
    if err != nil {
        return nil, err
    }
    if tier := highestContribProjectsTier(int(projectsCount)); tier != "" {
        progress := buildContribCategoryProgress("contribution_projects", projectsCount)
        items = append(items, models.PublicMemberBadge{ ... })
    }
    // repeats for chronicleCount, archivistCount
    return items, nil
}
```

**Required change:** accept `projectsCount, chronicleCount, archivistCount int64` as parameters; delete the three `r.loadContrib*Count(ctx, memberID)` calls at the top; the `if tier := highest...Tier(...)` blocks below are unchanged (pure derivation, already zero-query).

---

### `backend/internal/repository/member_profile_progress_repository.go` (`loadBadgeProgress`)

**Analog:** the file's own two genuinely-unique queries stay; the four duplicated calls are removed.

**Current function to change (self, lines 64-153, verified verbatim — the exact 4 duplicate calls):**
```go
func (r *MemberProfileRepository) loadBadgeProgress(ctx context.Context, memberID int64, totalPoints int64) ([]models.PublicMemberBadgeProgress, error) {
    var projectCount int64
    if err := r.db.QueryRow(ctx, `
        SELECT COUNT(DISTINCT ac.anime_id)
        FROM anime_contributions ac
        WHERE ac.member_id = $1 AND ac.status = 'confirmed'
          AND ac.is_public_on_member_profile = true
    `, memberID).Scan(&projectCount); err != nil {
        return nil, fmt.Errorf("load badge progress project count for member %d: %w", memberID, err)
    }
    projectsCount, err := r.loadContribProjectsCount(ctx, memberID)   // DUPLICATE #B (remove)
    if err != nil { return nil, err }
    chronicleCount, err := r.loadContribChronicleCount(ctx, memberID) // DUPLICATE #C (remove)
    if err != nil { return nil, err }
    archivistCount, err := r.loadContribArchivistCount(ctx, memberID) // DUPLICATE #D (remove)
    if err != nil { return nil, err }

    var membershipYears int64
    if err := r.db.QueryRow(ctx, `...`, memberID).Scan(&membershipYears); err != nil { ... }
    // ... builds progress[] using projectCount, totalPoints, projectsCount, chronicleCount, archivistCount ...
    roleVolumeCounts, err := r.loadRoleVolumeCounts(ctx, memberID)    // DUPLICATE #A (remove)
    if err != nil { return nil, err }
    // ... derives role_volume progress entries from roleVolumeCounts ...
}
```

**Required change:** accept `roleVolumeCounts []RoleVolumeCount, projectsCount, chronicleCount, archivistCount int64` as parameters (pre-loaded by the aggregator); KEEP both `r.db.QueryRow` blocks (`projectCount` via `is_public_on_member_profile` and `membershipYears`) exactly as-is — these are the two genuinely-unique queries this function alone needs (RESEARCH.md Pitfall 2: `projectCount` here is NOT a fifth duplicate of `projectsCount`/`loadContribProjectsCount` — different WHERE clause, different metric, must stay a separate local variable name).

---

### `backend/internal/repository/member_profile_query_budget_test.go` (query-budget regression test)

**Analog:** itself — `TestPhase131PublicProfileQueryBudgetIsConstant` (lines 170-213) and the `phase131ConstantQueryBudget` constant (lines 158-168), both verified verbatim.

**Pattern to extend (verified exact):**
```go
const phase131ConstantQueryBudget = 20
...
require.Equalf(t, phase131ConstantQueryBudget, manyCount,
    "public-profile query budget drifted from the enforced constant %d; got %d (update phase131ConstantQueryBudget only with an intentional, documented loader change)",
    phase131ConstantQueryBudget, manyCount)
```
**Required change:** update the constant from `20` to `16` (4 duplicate queries removed) with a comment explaining WHY (mirrors the existing comment style at lines 158-167 documenting the 19→20 bump from Phase 132's `loadKnownFor`). The `openPhase131Postgres`/`resetPhase131Fixtures`/`seedPhase131MemberWithCurrentProjects` helpers (lines 51-127) are infrastructure, reused unchanged. Test-runner invocation pattern (env-gated, `TEAM4S_PHASE131_TEST_DSN`, `t.Skip()` if unset) — copy verbatim for any new assertions; do not invent a second gating mechanism.

---

### `frontend/src/components/profile/AnimeProjectAchievementStage.tsx` (component, request-response)

**Analog:** `ContributionAchievementStage.tsx` (primary, lines 65-81), corroborated by `PointsAchievementStage.tsx:50-67` and `MembershipStage.tsx:44-58` — all three read verbatim during this pass.

**Imports pattern (self, lines 1-15, unchanged, no new import needed — `LockedStageArtwork` is already imported):**
```tsx
'use client'

import { Badge, Card } from '@/components/ui'

import { AchievementArtwork } from './AchievementArtwork'
import artworkStyles from './AchievementArtwork.module.css'
import chainStyles from './MemberBadgeChain.module.css'
import animeProjectStageStyles from './AnimeProjectStage.module.css'
import type { MemberBadgeFamilyPresentation } from './memberBadgeFamilies'
import { getMemberBadgePresentation } from './memberBadgeLabels'
import {
  useFamilyPreview,
  LockedStageArtwork,
  resolveProgressArtworkDescriptor,
} from './achievementStageHelpers'
```

**Analog's gate pattern (`ContributionAchievementStage.tsx:65-81`, verified verbatim):**
```tsx
<span data-contribution-art={heroStage.badge_code}>
  {currentCode ? (
    descriptor ? (
      <AchievementArtwork
        descriptor={descriptor}
        badgeCode={heroStage.badge_code}
        alt={heroStage.label}
        size="hero"
        className={`${contributionAchievementStageStyles.contributionHeroArtwork} ${chainStyles.contributionHeroArtwork}`}
      />
    ) : (
      <presentation.Icon size={96} aria-label={heroStage.label} />
    )
  ) : (
    <LockedStageArtwork hero />
  )}
</span>
```

**The bug, current code in `AnimeProjectAchievementStage.tsx` (self, lines 50-62, verified verbatim — `currentCode` is computed at line 23 but never read below):**
```tsx
<span data-anime-project-art={heroStage.badge_code}>
  {descriptor ? (
    <AchievementArtwork
      descriptor={descriptor}
      badgeCode={heroStage.badge_code}
      alt={heroStage.label}
      size="hero"
      className={`${animeProjectStageStyles.animeProjectArtwork} ${chainStyles.animeProjectArtwork}`}
    />
  ) : (
    <presentation.Icon size={96} aria-label={heroStage.label} />
  )}
</span>
```

**Required fix:** wrap the existing `descriptor ? (...) : (...)` block in `{currentCode ? ( ... ) : <LockedStageArtwork hero />}`, mirroring the analog exactly — same `hero` prop, same fallback component, no new className. Do not touch the milestone `<ol>` below (line 100+) — it already correctly gates each stage marker via `stage.earned` (line 112, 124-130), confirmed already-correct by this research pass.

**Secondary corroborating analogs (read to confirm 3-of-4 convention, verbatim):**
```tsx
// PointsAchievementStage.tsx:50,63,67
{currentCode ? (
  ...
) : (
  <LockedStageArtwork hero />
)}
// second currentCode-gated block continues at line 67

// MembershipStage.tsx:44,58
<span data-membership-art={heroStage.badge_code}>
  {currentCode ? (
    ...
  ) : (
    <LockedStageArtwork hero />
  )}
</span>
```

---

### `frontend/src/components/profile/AnimeProjectAchievementStage.test.tsx` (test, request-response) — Wave 0 gap

**Confirmed at pattern-mapping time:** no standalone `AnimeProjectAchievementStage.test.tsx` file exists. Coverage for this component currently lives inside `MemberBadgeChain.test.tsx`'s `describe('Phase 119 collection cards', ...)` block (verified, e.g. `'renders Anime-Projekte as one stage without outer carousel chrome'` at line 1216, `'keeps current, selected and locked stages semantically distinct'` at line 1237).

**Analog test shape to copy** — the sibling `describe('Phase 125 contribution achievement stages', ...)` block's zero-progress case (`MemberBadgeChain.test.tsx:421-439`, verified verbatim):
```tsx
it('renders one ordered three-family outer carousel and three native artwork tiers at zero', async () => {
  const { container } = await renderContributions([
    { family: 'contribution_archivist', current_count: 0, next_threshold: 10, remaining_count: 10, next_tier: 'bronze', complete: false, stages: FAMILY_STAGE_FIXTURES.contribution_archivist },
    // ...
  ])
  const stages = Array.from(container.querySelectorAll<HTMLElement>('[data-contribution-achievement-stage]'))
  for (const stage of stages) {
    expect(stage.textContent).toContain('Gesperrt')
  }
})
```
**Recommendation for the plan:** extend the existing `'Phase 119 collection cards'` describe block in `MemberBadgeChain.test.tsx` with a zero-`current_count` case for `contribution_projects`/`progress` family that asserts `[data-locked-stage-hero]` (or equivalent `LockedStageArtwork hero` marker, e.g. `screen.getByText('Noch nicht freigeschaltet')`) appears in the hero slot — mirroring the `contribution_achievement_stage` zero-state assertion above — rather than creating a new file, unless the plan finds a project-wide 1-component-1-test-file convention elsewhere that should be followed instead (verify at plan time; this research found the existing coverage is chain-level, not file-per-component, for this exact family).

---

### `frontend/src/components/ui/ResponsiveImage.tsx` (component, file-I/O)

**Analog:** itself (full file, 31 lines, read verbatim) + `next.config.mjs`'s configured size ladder (data reference, not code).

**Current fallback (self, lines 14-30, verified verbatim — the exact bug):**
```tsx
export function ResponsiveImage({ src, alt, onError, ...props }: ResponsiveImageProps) {
  const [failedOptimizedSource, setFailedOptimizedSource] = useState<string | null>(null)
  const usingDisplayOriginal = failedOptimizedSource === src

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      unoptimized={usingDisplayOriginal}
      onError={(event) => {
        onError?.(event)
        setFailedOptimizedSource((failedSource) => failedSource === src ? failedSource : src)
      }}
    />
  )
}
```
**Constraint (verified from every consumer):** `width`/`height` (or `fill`) and the wrapping CSS slot class are ALWAYS passed by the caller (`AchievementArtwork.tsx`: `width={1254} height={1254}`; `MemberProfileHero.tsx`: `width={140} height={140}`) and must stay unconditional — `ResponsiveImage` itself never sets geometry, so the fix must live entirely inside the `unoptimized`/`src` handling, not touch the `{...props}` spread.

**No backend derivative analog exists** (confirmed by this pass, matching RESEARCH.md): `backend/internal/services/media_service.go` has `SaveUpload`/`SaveUploadSourceOriginal` only, no `imaging.Resize` call — do not invent a backend thumbnail path for this fix.

**Existing test analog to extend:** `frontend/src/components/ui/ResponsiveImage.test.tsx` and `ResponsiveImage.config.test.ts` both exist — extend, do not create a third test file for this component.

---

### `frontend/src/components/profile/MemberProfileHero.tsx` (component, request-response — B3 animated-avatar budget)

**Analog:** itself — the existing GIF-only branch is the literal precedent to extend.

**Current branch (self, lines 107, 175-184, verified verbatim):**
```tsx
const isAnimatedAvatar = /\.gif(?:$|\?)/i.test(avatarURL)
...
{avatarURL && isAnimatedAvatar ? (
  <Image
    src={avatarURL}
    alt={`${avatarLabel} Avatar`}
    width={140}
    height={140}
    sizes="(max-width: 760px) 100px, (max-width: 1099px) 120px, 140px"
    loading="eager"
    unoptimized
  />
) : avatarURL ? (
  <ResponsiveImage
    src={avatarURL}
    alt={`${avatarLabel} Avatar`}
    width={140}
    height={140}
    sizes="(max-width: 760px) 100px, (max-width: 1099px) 120px, 140px"
    loading="eager"
  />
) : (
  <span aria-hidden="true">...</span>
)}
```
**Required extension (mechanism is Claude's Discretion per CONTEXT.md B3):** whichever mechanism is chosen (broadened `isAnimatedAvatar` detection / byte-size cap / poster-frame policy), it must fold into this SAME single ternary branch — CONTEXT.md's "kein Retry-Loop"/UI-SPEC's "exactly ONE animated-avatar code path after the fix" both forbid a second parallel branch. Existing test analog: `frontend/src/components/profile/MemberProfileHero.test.tsx` exists — extend, do not create a new file.

---

### `frontend/src/lib/api.ts` (`getMemberProfile`, service/utility, request-response)

**Analog:** `getMemberProjects` (same file, lines 3212-3231, verified verbatim — near-identical shape, already threads a signal through `apiClientFetch`):
```ts
export async function getMemberProjects(
  slug: string,
  limit = 6,
  offset = 0,
  signal?: AbortSignal,
): Promise<PublicMemberProjectsResponse> {
  const encodedSlug = encodeURIComponent(slug);
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const response = await apiClientFetch(
    `/api/v1/members/${encodedSlug}/projects?${params.toString()}`,
    { cache: "no-store", signal },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }

  return response.json() as Promise<PublicMemberProjectsResponse>;
}
```

**Current `getMemberProfile` to change (self, lines 3178-3202, verified verbatim — the exact bug, no signal parameter at all):**
```ts
export async function getMemberProfile(
  slug: string,
): Promise<PublicMemberProfileResponse> {
  const encodedSlug = encodeURIComponent(slug);
  const response = await apiClientFetch(
    `/api/v1/members/${encodedSlug}`,
    { cache: "no-store" },
  );

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

  return response.json() as Promise<PublicMemberProfileResponse>;
}
```

**Required change:** add `signal?: AbortSignal` as a second parameter and pass it into the `apiClientFetch` options object, exactly matching `getMemberProjects`'s `{ cache: "no-store", signal }` shape — the error-handling `if (!response.ok) { ... }` block is byte-identical across both functions and must stay unchanged.

**Secondary corroborating analog** (plain-`fetch` variant, `getSearch`, lines 581-605, verified verbatim): `const response = await fetch(url, { cache: "no-store", signal });` — confirms the project's uniform convention of appending `signal` directly into the request-options object rather than any wrapper/branch.

**Existing callers verified (per RESEARCH.md, re-confirmed relevant since this is the exact compatibility risk):**
1. `frontend/src/lib/useMemberViewer.ts:54` — gains the signal (this fix's actual target).
2. `frontend/src/app/members/[slug]/page.tsx:46` — SSR call, no signal, 2nd param stays `undefined`.
3. `frontend/src/lib/api.auth-refresh.test.ts:325` — existing test calling with no signal; optional-parameter keeps it compiling.

---

### `frontend/src/lib/useMemberViewer.ts` (`fetcher`, hook, event-driven)

**Analog:** `useCancellableSlugState.ts`'s own contract, lines 14-21 (verified verbatim — this is the CONTRACT the fetcher must satisfy, not an external component):
```ts
export interface UseCancellableSlugStateOptions<T> {
  requestKey: string
  enabled: boolean
  /** Fetcher MUSS das übergebene `AbortSignal` an fetch/apiClientFetch weiterreichen. */
  fetcher: (signal: AbortSignal) => Promise<T>
}
```
And the hook's own call site (lines 69-85, verified verbatim, confirms the signal is ALREADY produced and passed regardless of what `useMemberViewer` does with it today):
```ts
const controller = new AbortController()
controllerRef.current = controller

fetcher(controller.signal)
  .then((data) => { ... })
  .catch((error: unknown) => { ... })
```

**Current non-conforming fetcher (self, lines 53-56, verified verbatim — the exact bug, signal silently dropped):**
```ts
const fetcher = useCallback(
  () => getMemberProfile(slug as string),
  [slug],
)
```

**Required fix:**
```ts
const fetcher = useCallback(
  (signal: AbortSignal) => getMemberProfile(slug as string, signal),
  [slug],
)
```
**Critical constraint (verified, do not weaken):** memoization dependency array stays `[slug]` only — do NOT add `signal` to the deps array (the file's own comment at lines 50-52 explains why: a fresh function identity per render would re-trigger the effect and self-abort forever). Do not touch the PMFE-10 fail-closed guard at line 69 (`if (!canFetch || state.key !== requestKey || state.status === 'loading' || state.status === 'idle')`) — it lives in the same file but is an unrelated concern.

**Existing test analog to extend:** `frontend/src/lib/useMemberViewer.test.ts` exists (8 cases per RESEARCH.md, covering disabled/null-slug/in-flight/stale-requestKey/404/error/retry) — extend with signal-forwarding assertions, do not replace or duplicate.

---

## Shared Patterns

### Go repository error-handling (applies to all Workstream A files)
**Source:** `backend/internal/repository/member_profile_public_repository.go` lines 115-142 (uniform across the whole `member_profile_*_repository.go` family).
**Apply to:** every touched Go file in Workstream A.
```go
value, loadErr = r.loadX(ctx, memberID)
if loadErr != nil {
    return nil, loadErr
}
```
No wrapping/logging at the aggregator layer; individual loaders already wrap with `fmt.Errorf("load X for member %d: %w", memberID, err)` at the point of failure (see `loadContribProjectsCount` line 102, `loadRoleVolumeCounts` line 44/52/57).

### Raw-count / derive split (applies to all three Workstream A consumer functions)
**Source:** `member_profile_contribution_badges_repository.go` lines 68-148 (the three `loadContrib*Count` functions) — this exact split (raw count function with a stable, dashboard-shared signature vs. a badge-deriving consumer function) is the established idiom this phase generalizes one level up.
**Apply to:** `loadRoleVolumeBadges`, `loadContributionBadges`, `loadBadgeProgress`.

### Locked-hero-artwork gate (applies to Workstream B1)
**Source:** `ContributionAchievementStage.tsx:65-81`, `PointsAchievementStage.tsx:50-67`, `MembershipStage.tsx:44-58`.
**Apply to:** `AnimeProjectAchievementStage.tsx` only (the one file missing it).
```tsx
{currentCode ? ( /* earned hero artwork */ ) : ( <LockedStageArtwork hero /> )}
```

### AbortSignal-in-options-object (applies to Workstream C)
**Source:** `frontend/src/lib/api.ts`'s `getMemberProjects` (lines 3212-3231) and `getSearch`/`getSearchSuggestions` (lines 581-637) — the project's uniform convention for every abortable GET.
**Apply to:** `getMemberProfile` (add `signal?: AbortSignal` param, forward into `apiClientFetch`'s options object) and `useMemberViewer`'s `fetcher` (accept and forward the signal `useCancellableSlugState` already provides).

### `apiClientFetch`/`authorizedFetch` already thread `signal` transparently — no change needed there
**Source:** `frontend/src/lib/api.ts` — `AuthorizedRequestOptions extends Omit<RequestInit, "headers">` (line ~446) and the `...init` spread inside `authorizedFetch` (~lines 1413-1451). Confirmed by RESEARCH.md and consistent with `getMemberProjects`/`getSearch` already relying on this same passthrough. Do not modify `apiClientFetch`/`authorizedFetch` for this phase.

## No Analog Found

None. Every file this phase touches has a direct, verified, in-repo sibling or is itself the established pattern (self-referential). This is consistent with RESEARCH.md's own framing: "every fix in this phase already has a working sibling/precedent elsewhere in the codebase."

The only open item is NOT a missing analog but a missing FILE: `AnimeProjectAchievementStage.test.tsx` does not exist as a standalone file — see the dedicated pattern-assignment section above recommending extension of `MemberBadgeChain.test.tsx`'s existing `describe` blocks instead of creating a new file, subject to plan-time confirmation of the project's test-file-granularity convention for this component family.

## Metadata

**Analog search scope:** `backend/internal/repository/` (7 files fully or partially read), `frontend/src/components/profile/` (7 files read, incl. 1 test file), `frontend/src/components/ui/ResponsiveImage.tsx`, `frontend/src/hooks/useCancellableSlugState.ts`, `frontend/src/lib/useMemberViewer.ts`, `frontend/src/lib/api.ts` (4 targeted non-overlapping reads).
**Files scanned:** 14 read in full or targeted-range, plus 2 `grep`-only confirmations (`member_profile_dashboard_repository.go` call sites, `PointsAchievementStage.tsx`/`MembershipStage.tsx` line numbers) and 1 directory listing (`*.test.tsx` inventory for the Wave-0 gap).
**Pattern extraction date:** 2026-09-10
**Workstreams D and E are intentionally absent from this map:** D (re-measurement) and E (verification/build gates) reuse existing, committed scripts verbatim per CONTEXT.md ("wiederverwenden, nicht neu schreiben") and produce documentation, not new/modified source files with a "role/data-flow" classification — RESEARCH.md's own "Code Examples" section already contains the exact invocation commands the planner needs; no additional pattern-mapping value would be added by restating them here.
