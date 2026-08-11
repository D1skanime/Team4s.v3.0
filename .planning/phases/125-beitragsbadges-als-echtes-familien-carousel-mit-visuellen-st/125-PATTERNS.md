# Phase 125: Contribution Family Carousel - Pattern Map

**Mapped:** 2026-08-11
**Files analyzed:** 9
**Analogs found:** 9 / 9

## File Classification

| File | Role / flow | Closest analog |
|---|---|---|
| `frontend/src/components/profile/MemberBadgeChain.tsx` | component; transform/events | `AnimeProjectAchievementStage` 468-537, `PointsAchievementStage` 539-613, outer carousel 857-885 |
| `MemberBadgeChain.module.css` | responsive styles | `.animeProject*` 2023-2053, `.points*` 2056-2085 |
| `MemberBadgeChain.test.tsx` | integration test | artwork 187-249, same-DOM 1429-1462, Points Stage 1464-1544 |
| `memberBadgeLabels.ts` / test | model + batch test | definitions/resolver 389-526; boundary oracle test 174-203 |
| `frontend/src/components/ui/FocalCarousel.tsx` / CSS / test | generic event component | keyboard/pointer/expanded 233-455; CSS 19-111,145-195; tests 234-250,369-388,596-621 |
| public page/backend profile tests | security/request-response | existing hidden-profile cases |

## Pattern Assignments

### MemberBadgeChain source and styles

Create profile-local `ContributionAchievementStage` from the Phase-123/124 Stage composition: one Card, square contained ResponsiveImage hero, true progress info, and semantic tier list. Copy preview separation from `FamilyCollectionCard:223-237`:

```tsx
const [selectedCode, setSelectedCode] = useState<string | null>(null)
const selectedStage = family.stages.find(
  stage => stage.badge_code === selectedCode && stage.earned,
)
const heroStage = selectedStage ?? family.heroStage
const progressMax = family.nextThreshold ?? family.stages.at(-1)?.threshold ?? 1
const progressValue = Math.min(Math.max(family.currentCount ?? 0, 0), progressMax)
```

Preview changes only hero/tier/status; metrics stay authoritative from `family`. Earned tiers are native buttons; locked tiers static/unfocusable. Use `aria-current="step"`, `aria-pressed`, and Aktuell/Vorschau/Gesperrt.

Do not copy old inner-strip 253-358: observer, settle timer, scroll selection, manual keys, wheel mapping. Preserve the single outer FocalCarousel at 869-885 over Projects → Chronicle → Archivist, including arrows, neighbors, keyboard, drag, reduced motion, counter and Alle anzeigen. Normal and expanded use the same Stage tree; never add a second engine.

Use only `resolveBadgeArtwork:81-104`. Locked paths: Projects bronze-v3/silver-v2/gold-v2; Chronicle bronze-v4/silver-v2/gold-v2; Archivist bronze-v2/silver-v2/gold-v2. No interpolation or unversioned assets.

CSS copies hero geometry 2025-2027 and native tier rules 2068-2082:

```css
.stageHero { display:grid; grid-template-columns:minmax(240px,340px) minmax(0,1fr); }
.heroArtwork,.tierArtwork { display:grid; place-items:center; aspect-ratio:1; }
.heroArtwork > img,.tierArtwork > img { width:100%; height:100%; object-fit:contain; }
.tierTrack { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); }
```

Reuse 900px/520px stacking. All three tiers remain visible on mobile: no inner overflow/snap/scrollbar. Add Contribution expanded resets for transform/peek/active-wide geometry. Diagnose per-asset transparent bounds before resizing shared slots.

### Resolver and tests

`memberBadgeLabels.ts:420-430` owns order/thresholds/copy; `465-509` owns zero/current/earned/locked/next/complete from backend progress. Do not duplicate thresholds. Only possible copy correction: Archivist UI unit to locked PRD `Medienbeitrag/Medienbeiträge`.

Copy table oracle `memberBadgeLabels.test.ts:174-203`. Cover Projects 0/1/4/5/14/15/20 and Chronicle/Archivist 0/10/49/50/149/150/200. Assert currentStage, nextThreshold, remainingCount, complete, earned/locked, and three zero families in canonical order.

In `MemberBadgeChain.test.tsx`, reuse artwork 187-249, Phase-121 treeShape 1429-1462, Phase-124 Stage/CSS 1464-1544. Add: one three-family carousel; zero/boundaries; explicit nine paths; tier semantics; preview invariant; terminal true count with bounded ARIA; thumbnail tap/family independence; free-space drag suppresses next thumbnail click; expanded same-DOM/no skeleton/peek/transform; Phase-123/124 regressions; three-column/square/contain/mobile/expanded CSS contracts.

### FocalCarousel regression seam

`FocalCarousel*` are protected and regression-only unless a generic RED test proves a defect. Preserve keyboard isolation 233-243, 6px/vertical escape 288-335, post-drag click capture 347-352, same renderItem 357-370/429-455, nested-control exclusion 442-447, and CSS touch-action pan-y/drag snap disable/responsive peek/reduced motion. Tier buttons must not stop propagation or add pointer handlers.

Reuse tests: expanded/focus 234-250, nested keys 253-259, geometry 297-320, neighbor-vs-button 369-388, reduced motion 390+/507+, vertical intent 596-621. Generic drag-click test only if absent; Contribution assertions stay in chain test.

Public page/backend handler tests remain validation-only: hidden profiles must not disclose badge_progress. No API/auth/backend/schema change.

## Shared Patterns

- Authoritative progress: `memberBadgeLabels.ts:454-509`; no client eligibility/threshold/remainder logic. Percent current/next capped; terminal ARIA bounded while visible count stays true.
- Native nested controls: `FocalCarousel.tsx:233-243,288-352,442-447`.
- Same DOM: `FocalCarousel.tsx:357-370,429-455` plus Phase-121 treeShape.
- Zero is not empty: all projected Contribution families render.

## Protected Dirty Worktree

Protect all `MemberBadgeChain*`, all `FocalCarousel*`, six modified Contribution Silver/Gold PNGs, and `.planning/ROADMAP.md`. Preserve Phase-123/124 Stage hunks and current carousel navigation/nested-control/drag hunks. Fresh diff, targeted patches, no reset/broad formatting; generic RED before shared carousel edits.

## Anti-Patterns

Second carousel/swipe/observer/timer/wheel engine; duplicated progress logic; separate expanded tree; direct/interpolated/unversioned assets; focusable locked tiers; preview-mutated metrics; global hero shrink; backend/API/schema edits.

## Evidence and UAT

Run focused labels/chain and carousel tests, public/backend visibility regressions, full frontend, typecheck, lint, build if feasible, diff-check and scoped review. Through visible `http://127.0.0.1:3300`, capture 390x844, 768x1024, 1024x768, 1440x900, 1920x1080, 2560x1440 plus preview/zero/terminal/expanded. Verify tap vs free-space swipe, vertical scroll, no overflow, neighbor/max-width geometry, and all nine artworks for bounds/overhang/clipping/distortion.

## Metadata

**Search scope:** profile components, UI carousel, public/backend tests, Phase-121/124 seams
**Pattern extraction date:** 2026-08-11

