# Phase 124: Punkte-Meilensteine als responsive Single-Family Achievement Stage - Pattern Map

**Mapped:** 2026-08-11
**Files analyzed:** 7
**Analogs found:** 7 / 7
**Baseline:** Canonical Linux tree; current Phase-121/123 `MemberBadgeChain.*` edits are uncommitted and user-owned.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `frontend/src/components/profile/MemberBadgeChain.tsx` | component | transform/event-driven | same file `AnimeProjectAchievementStage` lines 468-535; routing 815-849 | exact/in-progress |
| `frontend/src/components/profile/MemberBadgeChain.module.css` | styling | responsive presentation | same file Phase-123 block lines 2022-2053 | exact/in-progress |
| `frontend/src/components/profile/MemberBadgeChain.test.tsx` | component test | event-driven/render | collection tests 895-1038; Phase-121 tests 1215-1360 | exact |
| `frontend/src/components/profile/memberBadgeLabels.test.ts` | utility test | transform | milestone tests 72-110; resolver tests 270-319 | exact |
| `frontend/src/app/members/[slug]/page.test.tsx` | route test | request-response/SSR | fixture 120-132; pass-through test 360-364 | exact |
| `frontend/src/components/profile/memberBadgeLabels.ts` | utility, verify-only | transform | canonical points/resolver 265-293, 414-490 | exact |
| `frontend/src/app/members/[slug]/page.tsx` | server component, verify-only | request-response/SSR | total-points projection 101-106 | exact |

No new source file is justified. Keep a shared stage shell profile-local; do not add a generic `components/ui` abstraction without a domain-free third consumer.

## Pattern Assignments

### `frontend/src/components/profile/MemberBadgeChain.tsx`

**Imports pattern** (lines 1-24): retain `'use client'`, alias imports from `@/components/ui`, direct `ResponsiveImage`, profile DTO types, local `memberBadgeLabels` exports, then CSS module. The points stage needs only existing `useState`, `Lock`, `Badge`, `Card`, `ResponsiveImage`, `getMemberBadgePresentation`, and `MemberBadgeFamilyPresentation`; add no fetch/global state seam.

**Artwork resolver** (lines 72-117):
```tsx
if (badgeCode === 'point_milestone_veteran') {
  return '/member-achievement-badges/point_milestone_veteran-v3.png'
}
if (VERSIONED_POINT_ARTWORK.has(badgeCode)) {
  return `/member-achievement-badges/${badgeCode}-v2.png`
}
```
Call `resolveBadgeArtwork` for hero and all thumbnails. Never interpolate filenames in the stage; veteran deliberately differs.

**Local preview + authoritative progress** (lines 468-485):
```tsx
const [selectedCode, setSelectedCode] = useState<string | null>(null)
const currentCode = family.currentStage?.badge_code ?? null
const selectedStage = family.stages.find(
  (stage) => stage.badge_code === selectedCode && stage.earned,
)
const heroStage = selectedStage ?? family.heroStage
const count = family.currentCount ?? 0
const progressMax = family.nextThreshold ?? family.stages.at(-1)?.threshold ?? 1
const progressValue = Math.min(Math.max(count, 0), progressMax)
const progressPercent = progressMax > 0 ? Math.min(100, (progressValue / progressMax) * 100) : 100
```
Extract only the render shell truly shared with `AnimeProjectAchievementStage`. Preview changes hero/name/status only; count, next target, remainder and bar always read `family`. Keep the true terminal count visible while only fill is clamped.

**Semantic list pattern** (lines 519-532): an `<ol>` owns six `<li>` stages; `aria-current="step"` marks current; earned stages are real buttons with `aria-pressed`; locked stages are static spans and non-focusable. Communicate state with text/check/lock/current marker, not color alone. Use `ResponsiveImage`, square intrinsic geometry and `object-fit: contain`.

**Group routing** (lines 815-849): extend the existing `group.key === 'progress'` dispatch with only `group.key === 'points'`. Reuse the `${currentCount}:${currentStageCode}` key reset pattern. Preserve the `FocalCarousel` branch, skeleton, props, and all other families.

**Do not copy:** `FamilyCollectionCard` lines 223-465 contains `ResizeObserver`, JS centering, scroll-settle timers and wheel mapping prohibited for the points track.

### `frontend/src/components/profile/MemberBadgeChain.module.css`

**Analog:** Phase-123 stage block, lines 2022-2053:
```css
.animeProjectStage { display:grid; width:100%; min-width:0; overflow:hidden; }
.animeProjectHero { display:grid; grid-template-columns:minmax(240px,340px) minmax(0,1fr); }
.animeProjectArtwork { display:grid; width:100%; aspect-ratio:1; }
.animeProjectArtwork > img { width:100%; height:100%; object-fit:contain; }
@media (max-width:700px) { .animeProjectHero { grid-template-columns:minmax(0,1fr); } }
```
Extract/rename shared shell selectors only when duplication falls. Add points-specific hero and six-thumbnail selectors. Desktop may use six columns; constrained widths use native `overflow-x:auto` only on the track, optional CSS snap, `min-width:0`, visible `:focus-visible`, and reduced-motion rules. Prove no page overflow at 390px. Do not touch dirty `FocalCarousel.module.css`.

### `frontend/src/components/profile/MemberBadgeChain.test.tsx`

**Analogs:** Phase-123 test lines 921-945 and Phase-121 geometry/accessibility suites 1215-1360.
```tsx
const stage = container.querySelector('[data-anime-project-stage]') as HTMLElement
expect(stage.closest('[aria-roledescription="Karussell"]')).toBeNull()
expect(within(stage).getAllByRole('listitem')).toHaveLength(4)
```
Add a points-stage describe block through existing render/dynamic-module helpers. Cover no carousel chrome/skeleton; exact six code/threshold/artwork order; zero-point locked state; current hero; earlier-earned preview with unchanged progress; locked stages absent from buttons; terminal 2500 and over-terminal true value/full bar/no next copy; ARIA/current/focus; CSS square containment/native overflow/reduced motion. Preserve all role, Anime Project, contribution, membership and special tests.

### `frontend/src/components/profile/memberBadgeLabels.test.ts`

**Analogs:** lines 72-110 and 282-310. Add one table-driven oracle for `0,1,49,50,199,200,499,500,999,1000,2499,2500,2733,5000`. Assert derived current code plus resolver stage order, earned/locked flags, next threshold, remainder and completion. Do not create production threshold arithmetic.

### `frontend/src/app/members/[slug]/page.test.tsx`

**Analog:** fixture lines 120-132 supplies `badge_progress[family=points]` and `total_points`; lines 360-364 test pass-through. Add SSR regressions showing `total_points` selects only the highest earned badge while authoritative `badge_progress` reaches the stage unchanged, including zero and terminal/over-terminal representatives. Assert rendered semantics. Extend the existing harness for the smallest deterministic hydration regression feasible.

### `frontend/src/components/profile/memberBadgeLabels.ts` (verify-only)

Canonical sources are `POINT_MILESTONES`/`deriveMilestoneBadge` lines 265-293, points family lines 414-418, and resolver lines 454-490. Preserve unless a boundary test proves a defect. This is the sole frontend threshold/family reconstruction seam.

### `frontend/src/app/members/[slug]/page.tsx` (verify-only)

**SSR seam** (lines 101-106):
```tsx
const publicBadges = profile.public_badges ?? []
const milestoneBadge = deriveMilestoneBadge(profile.total_points ?? 0)
const earnedBadges = milestoneBadge ? [...publicBadges, milestoneBadge] : publicBadges
```
Do not pass raw points into the client stage, derive from browser state, or persist synthetic badges.

## Shared Patterns

### Data truth
Use `MemberBadgeFamilyPresentation` unchanged. Thresholds come from `POINT_MILESTONES`; progress comes from authoritative `badge_progress`. Local selection is presentation state only.

### UI, accessibility, and errors
Reuse `Card`, `Badge`, `ResponsiveImage`, `Lock`, CSS modules, focus tokens, and correct German umlauts. Missing artwork retains the existing icon fallback. No fetch/try-catch/error boundary belongs in this presentation component.

### Dirty-worktree protection
Record status, targeted diffs and hashes before edits. Patch narrowly. Phase 124 must not change `FocalCarousel.*`, `FansubProjectsGrid*`, or badge PNGs.

## Regression-Only Analogs

| File | Purpose |
|---|---|
| `frontend/src/components/ui/FocalCarousel.test.tsx` | remaining carousel behavior |
| `frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx` | external carousel consumer |
| `frontend/src/components/ui/ResponsiveImage.tsx` | canonical image seam |
| existing non-points `MemberBadgeChain.test.tsx` suites | shared family regression |

## No Analog Found

None. The only gap is a dedicated hydration-mismatch test; extend the existing page harness rather than adding a framework.

## Metadata

**Scope searched:** profile components, public member route, shared carousel/image, fansub carousel consumer, Phase 121/123 dirty diff
**Files scanned in depth:** 7
**Pattern extraction date:** 2026-08-11
**Warning:** `MemberBadgeChain.*`, `FocalCarousel.*`, contribution PNGs and role-volume PNGs are dirty/untracked and must remain the baseline.
