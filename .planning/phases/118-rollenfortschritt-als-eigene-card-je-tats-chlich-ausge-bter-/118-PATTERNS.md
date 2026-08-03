# Phase 118: Rollenfortschritt je Fansubrolle - Pattern Map

**Mapped:** 2026-08-03
**Files analyzed:** 15
**Analogs found:** 15 / 15

## File Classification

| File | Role | Flow | Closest analog |
|---|---|---|---|
| `backend/internal/models/member_profile.go` | DTO | request-response | existing `PublicMemberBadge` |
| `backend/internal/repository/member_profile_role_volume_repository.go` | repository | read projection | `loadRoleVolumeCounts/loadRoleVolumeBadges` |
| both member-profile repository test files | integration test | read projection | raw-count, reversal, boundary tests |
| `shared/contracts/openapi.yaml` | contract | request-response | `PublicMemberBadge` schema |
| `frontend/src/types/profile.ts` | DTO | request-response | `PublicMemberBadge` |
| `frontend/src/app/members/[slug]/page.tsx` | server page | request-response | public-badge pass-through |
| `frontend/src/components/ui/FocalCarousel.{tsx,module.css,test.tsx}` | component/styles/test | event-driven | existing global seam |
| `frontend/src/components/ui/index.ts` | barrel | transform | existing export |
| `frontend/src/components/profile/MemberBadgeChain.{tsx,module.css,test.tsx}` | domain UI/styles/test | transform/event | existing earned-role rows |
| `frontend/src/components/profile/memberBadgeLabels.ts` + test | utility/test | transform | existing tier resolver |
| `frontend/src/components/fansubs/FansubProjectsGrid.tsx` + test | consumer/test | event-driven | second productive consumer |

No new endpoint, query, helper, DTO family, carousel library, CSS module, or page-local carousel is warranted.

## Pattern Assignments

### Backend projection and contract

Reuse `loadRoleVolumeCounts` (`member_profile_role_volume_repository.go:43`):
```sql
SELECT role_code, COUNT(*) AS credit_count
FROM release_role_credit_lifecycles
WHERE member_id = $1 AND lifecycle_status = 'awarded'
GROUP BY role_code ORDER BY role_code
```
Extend `loadRoleVolumeBadges` (lines 78-95) to populate exact count/current tier/next threshold/remaining/next tier from that same iteration. Counts 1-11 only expose `role_entry_<role>`; enrich that existing synthetic carrier (and consistently both carriers at 12+) rather than guessing client-side. Preserve error wrapping, non-nil empty slices, `ID:0`, and public aggregation at `member_profile_repository.go:531-544`. No endpoint/handler/query seam.

Extend the existing envelope at `backend/internal/models/member_profile.go:185-196`:
```go
CurrentCount *int64 `json:"current_count,omitempty"`
CurrentTier *string `json:"current_tier,omitempty"`
NextThreshold *int64 `json:"next_threshold,omitempty"`
RemainingCount *int64 `json:"remaining_count,omitempty"`
NextTier *string `json:"next_tier,omitempty"`
```

Mirror it in `shared/contracts/openapi.yaml:11192-11229` and `frontend/src/types/profile.ts:144-153`; add `platinum` where a terminal current tier is valid. Preserve nullable/optional fields and `PublicMemberProfile.public_badges`; no parallel schema.

Tests: extend `member_profile_role_volume_repository_test.go:21-43` and `member_profile_repository_postgres_test.go:117-225`. Reuse `openMemberProfileBadgeLifecyclePostgres`, `insertRoleEntryLifecycleRow`, `containsPublicBadge`. Cover 0,1,11,12,107,108,319,320,509,510, exact metadata, independent roles, and reversal. Existing analogs already prove raw 12/Bronze and awarded?reversed disappearance.

The page remains pass-through (`members/[slug]/page.tsx:88-95,144-148`):
```tsx
const publicBadges = profile.public_badges ?? []
const earnedBadges = milestoneBadge ? [...publicBadges, milestoneBadge] : publicBadges
<MemberBadgeChain earnedBadges={earnedBadges} catalog={PUBLIC_MEMBER_BADGE_CATALOG} />
```

### Global FocalCarousel

Extend the generic state/API at `FocalCarousel.tsx:19-46` with normalized proximity/CSS state and optional counter formatter/slot. No role/badge props globally. Preserve one focusable carousel region, Arrow keys, 4px drag threshold, pointer capture, one-click suppression, global Button arrows, `carouselItems`, and expanded-grid focus restoration (`103-108,140-187,222-290`). Add Home/End in the same handler.

Replace `scrollIntoView`/transformed-rect target geometry (`94-129`) with:
```ts
const value = item.offsetLeft + item.offsetWidth / 2 - track.clientWidth / 2
const target = Math.max(0, Math.min(value, track.scrollWidth - track.clientWidth))
```
Rects may drive visual proximity, never targets/spacers.

CSS analog `FocalCarousel.module.css:14-81,104-122`: retain native overflow, symmetric end spacers, consumer `--focal-item-size`, temporary snap disable and reduced-motion CSS; replace binary scale with proximity. JS `matchMedia` disables momentum/multi-card projection.

Extend `FocalCarousel.test.tsx:27-93` with layout metrics, rAF, wheel and matchMedia fixtures. Prove first/last centering, continuous proximity, multi-card momentum, interruption, conditional wheel cancellation/end pass-through, reduced motion, one tab station, counter singular/plural, Home/End and grid compatibility. `ui/index.ts:15` already exports the seam.

### Consumers and role cards

`FansubProjectsGrid.tsx:43-74` is the second productive consumer: preserve preview 20, synthetic ?more? card, `state.showAll`, links/click suppression/grid. Counter defaults off. Always run `FansubProjectsGrid.test.tsx:55-87`.

Keep the earned-only gate in `MemberBadgeChain.tsx:217-236`; `buildMemberBadgeGroups:185-210` already yields one stable row per earned role. Never sort by rank. Reuse `resolveBadgeArtwork`/`resolveLayeredRoleArtwork` (`94-160`): `role_entry_<role>.png` and `rank-frame-<role>-<tier>.png`, including existing timer/fallback behavior.

Reuse the single threshold source in `memberBadgeLabels.ts:153-214,274-292`:
```ts
const ROLE_VOLUME_TIERS = ['bronze','silver','gold','platinum'] as const
export const ROLE_VOLUME_TIER_THRESHOLDS = {
 bronze: 12, silver: 108, gold: 320, platinum: 510,
}
```
Extend for entry 1/five-stage presentation; do not duplicate thresholds in JSX. Keep suffix parsing from the end for multi-underscore roles.

Retain the `FocalCarousel` call at `MemberBadgeChain.tsx:253-365`; pass domain labels, counter, card sizing/glow/content through props/renderItem. No local listeners/physics/index state.

Selected Sketch 001 A (`index.html:59-73`) defines: role eyebrow, current hero, rank chip, five real images in Einstieg/Bronze/Silber/Gold/Platin order, repeated current + `Aktuell`, locked future stages, total-count progress/bar. Medals form an informative list with no tab stops. Platinum shows true count/full bar/?H?chste Stufe erreicht?, with aria value clamped to 510. Zero omits role/section.

`MemberBadgeChain.module.css:87-347,571-753` already owns role item size, `data-role-code` accents, layered artwork/glow, responsive sizing and reduced motion. Replace text chips with a five-column no-overflow image grid; use global Card/Badge/Button and normalize affected 800 weights to 700.

Extend `MemberBadgeChain.test.tsx:475-540,576-625`: foreign role absent; five stages; boundaries; reversal/zero rerender; real images/current repeated/future locked; no medal tab stops; independent roles; singular/plural counter; German alt/copy. Preserve `memberBadgeLabels.test.ts:110-147` multi-underscore/platinum coverage.

## Shared Patterns

Use UI exports and `globals.css:93-107,128-163` for accents, surfaces, borders, radii, shadows, focus and spacing. Warning: UI-SPEC calls 16px `--space-3`, while runtime defines `--space-3:12px`, `--space-4:16px` (`132-140`). Treat runtime as truth or explicitly resolve docs; do not retune globals silently.

Carousel interaction/geometry lives only in `FocalCarousel`; role semantics/layout only in `MemberBadgeChain`. Public SSR adds no auth/mutation/error/fetch seam.

## Carousel Inventory

| Location | Classification | Action |
|---|---|---|
| `ui/FocalCarousel` | canonical centered carousel | extend |
| `profile/MemberBadgeChain` | productive consumer | keep |
| `fansubs/FansubProjectsGrid` | productive consumer | keep/test |
| `anime/AnimeRelations` (TSX 45-108; CSS 66-75,130-136) | start-aligned snap gallery | genuine later candidate; out of scope |
| `MemberSectionNav`, `FansubSectionNav` | section anchors | unrelated |
| `EpisodeManager` | form-anchor visibility | unrelated |
| `DatePicker` | overlay visibility | unrelated |
| `FansubEditHeaderCard` | active-tab centering | unrelated |
| `AnimeGridScrollRestorer` | restoration | unrelated |
| `GroupMediaReviewSection` | reorder drag | unrelated |
| `Team4sCropper` | crop/pan | unrelated |

Only the first three are Phase-118 implementation surfaces. Sketch 002 A (README 19-27/HTML 29-31) supplies the one-carousel/counter composition; do not copy dots or transform-only mock JS (48-57).

## No Analog Found

None. New files beyond focused fixtures require explicit justification that these owners cannot be extended.

## Planner Contract

Plans must name these exact files/functions/components in `read_first`. Acceptance proves: no new endpoint/query/helper/library/local carousel; Go/OpenAPI/TS alignment; both consumers pass; endpoints use untransformed layout metrics; unrelated controls untouched.

## Metadata

**Search scope:** backend member projection/tests, OpenAPI, frontend types/page/UI/profile/fansub/anime, scroll/drag controls, selected sketches.
**Pattern extraction date:** 2026-08-03
