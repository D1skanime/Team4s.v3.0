# Phase 126: Mitgliedschaftsbadges fachlich trennen und als responsive Membership Stage darstellen - Pattern Map

**Mapped:** 2026-08-11
**Files analyzed:** 6
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `frontend/src/components/profile/memberBadgeLabels.ts` | utility/resolver | transform | same file, family resolver lines 432-525 | exact |
| `frontend/src/components/profile/memberBadgeLabels.test.ts` | unit test | transform | Phase 125 boundary oracle lines 354-389 | exact |
| `frontend/src/components/profile/MemberBadgeChain.tsx` | component | SSR data → interactive UI | Phase 124/125 Stages lines 539-626; routing 904-938 | exact |
| `frontend/src/components/profile/MemberBadgeChain.module.css` | config/style | responsive transform | Stage CSS lines 2055-2116 | exact composite |
| `frontend/src/components/profile/MemberBadgeChain.test.tsx` | component test | render/events | Stage/asset/ARIA tests lines 322-346, 981-1052, 1540-1618 | exact |
| `frontend/src/app/members/[slug]/page.test.tsx` | integration test | request-response/SSR | existing public-profile tests lines 300-405 | role match |

Backend repository/service and public `page.tsx` are read-only authorities, not edit targets.

## Pattern Assignments

### `memberBadgeLabels.ts`

**Analog:** `FAMILY_DEFINITIONS` and `resolveMemberBadgeFamilies`, lines 432-525.

Current defect (lines 432-439):

```ts
membership: {
  group: 'membership',
  label: 'Mitgliedschaft',
  stages: [
    { badge_code: 'founding_member', threshold: 0 },
    { badge_code: 'long_term_member', threshold: 5 },
    { badge_code: 'membership_7_years', threshold: 7 },
    { badge_code: 'membership_10_years', threshold: 10 },
  ],
}
```

Change presentation metadata so duration owns exactly 5/7/10. Founding remains membership-owned but never participates in duration `currentStage`, `nextStage`, `heroStage`, progress, or completion.

Preserve authoritative projection and visibility (lines 460-509):

```ts
const progressByFamily = new Map(input.badge_progress.map((p) => [p.family, p]))
// reached stages use progress.current_count
if (!progress && !currentStage) continue
families.push({
  currentCount: progress?.current_count ?? null,
  nextThreshold: progress?.next_threshold ?? null,
  remainingCount: progress?.remaining_count ?? null,
  complete: progress?.complete ?? !nextStage,
})
```

A progress row keeps membership visible at 0–4 years. Add `founding_member` to `ownedCodes` even after excluding it from duration; otherwise the fallback at lines 512-522 duplicates it as a special badge.

### `MemberBadgeChain.tsx`

**Asset resolver:** lines 93-124 already map all four locked v4 assets. Every hero/thumbnail/panel must call `resolveBadgeArtwork`; never hard-code filenames at render sites.

**Hero/progress/preview analog:** `AnimeProjectAchievementStage` lines 468-535 and `PointsAchievementStage` lines 587-626.

```ts
const [selectedCode, setSelectedCode] = useState<string | null>(null)
const selectedStage = family.stages.find(
  (stage) => stage.badge_code === selectedCode && stage.earned,
)
const heroStage = selectedStage ?? family.heroStage
const count = family.currentCount ?? 0
const progressMax = family.nextThreshold ?? family.stages.at(-1)?.threshold ?? 1
const progressValue = Math.min(Math.max(count, 0), progressMax)
```

Preview may change hero/status only. Actual years, current marker, progress, next/remainder, and completion remain unchanged. For 10/24/50, display real years; clamp only progress fill/target.

**Three-node accessible track:** Phase 123 lines 519-529 and Phase 125 lines 574-585.

```tsx
<li data-stage-state={current ? 'current' : stage.earned ? 'earned' : 'locked'}
    aria-current={current ? 'step' : undefined}>
  {stage.earned
    ? <button type="button" aria-pressed={selected}>...</button>
    : <span aria-label="... · Gesperrt">...</span>}
</li>
```

Use exactly three duration nodes. Locked nodes are static/unfocusable. Founding is a separate static panel with no progressbar, threshold, next stage, or `aria-current`.

**No-carousel routing:** lines 904-938 directly render progress/points Stages and otherwise use `FocalCarousel`. Add membership as a direct `MembershipStage` branch. Contributions retain their outer carousel. Do not edit any `FocalCarousel.*` file.

### `MemberBadgeChain.module.css`

**Wide Stage:** copy Phase 124 lines 2055-2067: `width:100%`, `min-width:0`, established `max-width:1760px`, centered shell, responsive two-column hero, square artwork slot, and `object-fit:contain`.

**Exact three-tier track:** copy Phase 125 lines 2100-2112:

```css
.contributionTierTrack {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  min-width: 0;
}
.contributionTierArtwork {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
}
.contributionTierArtwork > img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
```

Do not copy the six-node points overflow/snap behavior at lines 2068-2085. All three membership milestones stay visible without horizontal scrolling. Copy responsive stacking from lines 2083-2085/2114-2116 and reduced-motion handling. Founding must be visually secondary and separated from duration.

### Tests

**Resolver:** copy unique ownership assertions from `memberBadgeLabels.test.ts:315-329` and the table-driven oracle from lines 354-389. Cover 0/1/4/5/6/7/8/9/10/11/24 plus founder/non-founder × 3/6/24. Assert exact 5/7/10 duration codes, current/next/remainder/complete, and no founding fallback duplication.

**Component:** preserve four-v4-asset assertions at `MemberBadgeChain.test.tsx:322-346`. Copy scoped Stage queries and ARIA checks from lines 981-1052 and 1540-1618. Add no-membership-carousel/arrows/counter/drag/quiet semantics, preview invariance, locked static nodes, terminal true-count, and CSS source contracts for three columns, square slots, contain, `min-width:0`, and responsive rules.

**SSR:** `frontend/src/app/members/[slug]/page.tsx:99-106,157-162` already passes `public_badges` and `badge_progress`; no production edit. Extend page tests only as needed to prove non-founder below five remains SSR-visible and visibility/404 behavior is unchanged. No client fetch and no reading/summing `profile.memberships`.

## Shared Patterns

### Backend authority

`backend/internal/repository/member_profile_progress_repository.go:55-78` computes:

```go
SELECT COALESCE(MAX(EXTRACT(YEAR FROM age(
  COALESCE(left_date, CURRENT_DATE), joined_date
))), 0)::bigint
// ...
buildBadgeProgress("membership", membershipYears, []badgeProgressThreshold{
  {5, "long_term_member"}, {7, "membership_7_years"}, {10, "membership_10_years"},
})
```

This is longest single membership, not a sum. `badge_service.go:31-36,44-67,88-109,135-160` independently derives founding and duration earned badges. Both files stay unchanged.

### Accessibility

Use `aria-live="polite"` for hero preview; actual count as `aria-valuenow`; authoritative next/final target as `aria-valuemax`; `aria-current="step"` for current duration; `aria-pressed` for earned preview; static content for locked; visible labels/icons so state is not color-only. Founding has achievement semantics only.

## Anti-Patterns

| Avoid | Reason |
|---|---|
| Founder as duration threshold zero | False timeline and wrong below-five hero/current state |
| Earned-only membership visibility | Hides existing 0–4 progress projection |
| Client date arithmetic or membership summing | Breaks longest-single-membership authority |
| Displaying clamped 10/10 as real 24/50 years | Only fill/target clamps |
| Overall `years / 10` progress | Wrong for 5→7 and 7→10 intervals |
| Releasing founder to special fallback | Duplicate rendering |
| New carousel/swipe/observer/shared Stage engine | Out of scope; direct local three-node Stage required |
| Editing backend/API/DTO/assets/`FocalCarousel.*` | Locked presentation-only scope |
| Whole-file formatting or staging | Mixes active Phase 121–125 work |

## Protected Dirty-Hunk Boundaries

Observed 2026-08-11:

- `MemberBadgeChain.tsx`, CSS, and tests contain active uncommitted Phase 123–125 Stage work.
- `memberBadgeLabels.ts` already has a predecessor change.
- `FocalCarousel.tsx`, CSS, and tests contain substantial unrelated interaction changes.
- contribution v2 PNG changes and new role-volume PNGs are protected unrelated work.

Before each task capture `git status --short`, unstaged/cached/binary diffs, and SHA-256 hashes for every overlapping target and `FocalCarousel.*`. Work from the current worktree; never reset, checkout, reconstruct from HEAD, or broadly format.

Create a Phase-126-only patch from before/after snapshots. Stage only explicit hunks (`git add -p` or verified index patch), then compare `git diff --cached` exactly to that patch and run `git diff --cached --check`. Never `git add` a whole overlapping file. If an indivisible hunk mixes ownership, leave it unstaged/uncommitted and report it. Default strategy: no commit.

## No Analog Found

None. No new backend, API, migration, route, hook, provider, store, or shared carousel file is warranted.

## Planner Read First

AGENTS.md; implementation/UI contracts; all Phase 126 artifacts; Phase 121/124/125 context and current summaries/plans; backend progress repository and badge service; member badge resolver/component/CSS/tests; public member page/tests; current status plus unstaged/cached/binary diffs and hashes.

## Metadata

**Analog search scope:** profile components, public member route, shared carousel, backend badge projection/service, Phase 121/123/124/125 artifacts
**Pattern extraction date:** 2026-08-11
**Only file written:** this PATTERNS.md
