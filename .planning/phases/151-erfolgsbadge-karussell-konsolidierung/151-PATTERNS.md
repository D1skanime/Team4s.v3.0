# Phase 151: Erfolgsbadge-/Karussell-Konsolidierung — Pattern Map

**Mapped:** 2026-09-07

**Baseline:** `052858dc48576024518c5c527ae82c9d2027ac7b`

**Purpose:** Exact reuse assignments for planning; no implementation performed

## Pattern Decision

Phase 151 should extend the existing profile-domain badge seams and the existing generic carousel/image primitives. It should not create a second badge engine, role catalog, threshold table, API, or global design-system variant. [VERIFIED: `docs/engineering/implementation-contract.md:23-69`; `docs/frontend/ui-system.md:7-18,321-349`]

The only justified new reusable UI seam is a profile-domain artwork renderer/slot because direct/layered achievement JSX and hero geometry are currently repeated across five stage compositions. [VERIFIED: `frontend/src/components/profile/MemberBadgeChain.tsx:340-353,429-638,768-780,851-891`]

## File Classification and Closest Analogs

| Planned target | Role | Closest existing analog | Reuse direction | Evidence |
|---|---|---|---|---|
| `frontend/src/components/profile/badgeArtwork.ts` | Presentation asset manifest/resolver | Its existing approved family maps and Timer exception | Refactor in place; role-code asset strategy only, no new business registry | [VERIFIED: `badgeArtwork.ts:1-67`] |
| `frontend/src/components/profile/AchievementArtwork.tsx` (new) | Domain renderer for direct/layered art | Repeated role/progress JSX in `MemberBadgeChain` + `ResponsiveImage` | Extract exact markup and image-delivery behavior; keep domain-specific | [VERIFIED: `MemberBadgeChain.tsx:340-353,768-780,858-891`; `ResponsiveImage.tsx:6-29`] |
| `frontend/src/components/profile/AchievementArtwork.module.css` (new) | One hero/stage slot contract | `LayeredBadgeArtwork.module.css` + named `member-badge-carousel` container | Own width/aspect/padding/object-fit; reuse layer positioning | [VERIFIED: `LayeredBadgeArtwork.module.css:1-66`; `MemberBadgeChain.module.css:21-26`] |
| `frontend/src/components/profile/MemberBadgeChain.tsx` | Orchestration and stage consumers | Existing dedicated stage branches | Consume shared renderer, split memoizable cards/stages, remove unreachable family card | [VERIFIED: `MemberBadgeChain.tsx:184-319,429-638,640-959`] |
| Stage CSS modules | Family layout/copy/progress | Their own current container-query patterns | Retain family layout; remove primary-art dimensions after slot owns them | [VERIFIED: `AnimeProjectStage.module.css:1-36`; `ContributionAchievementStage.module.css:1-35`; `PointsAchievementStage.module.css:1-31`; `MembershipStage.module.css:1-41`] |
| `RoleBadgeCard*.module.css` | Role-card layout/status/stages | Existing status/stage styling around the current active transform | Preserve status/stages; remove size/transform pumping and delegate primary-art geometry to the slot | [VERIFIED: `RoleBadgeCard.module.css:64-96,186-348`; `RoleBadgeCard.status.module.css:272-288`] |
| `MemberBadgeChain.module.css` | Section/carousel composition | Existing named container and inactive contribution rules | Keep composition; remove duplicate role/item/art sizing and dead cross-module selectors | [VERIFIED: `MemberBadgeChain.module.css:21-26,134-207,236-308,391-449`] |
| `frontend/src/components/ui/FocalCarousel.tsx` | Canonical generic interaction engine | Itself | Preserve engine/API unless a measured defect requires a focused fix | [VERIFIED: `FocalCarousel.tsx:56-523`] |
| `frontend/src/components/ui/FocalCarousel.module.css` | Generic carousel geometry/state | Existing container-query and snap suppression | Preserve active/inactive semantic styling; accept domain item-size variable only | [VERIFIED: `FocalCarousel.module.css:1-42,100-120,152-202`] |
| `frontend/src/app/dev/ui-system/showcase/AchievementBadgeShowcase.tsx` (new) | Deterministic visual matrix | `PublicReleaseSurfacesShowcase.tsx` and other showcase modules | Render productive domain components with mock DTOs and nested mock role provider | [VERIFIED: `frontend/src/app/dev/ui-system/showcase/PublicReleaseSurfacesShowcase.tsx:1-233`; `frontend/src/app/dev/ui-system/page.tsx:34-41,92-139`] |
| `frontend/scripts/capture-phase151-badge-evidence.mjs` (new) | Browser evidence collector | Phase-134 capture + Phase-120 metrics collector | Reuse argument parsing, Compose URL, screenshot, geometry/overflow/image/focus/reduced-motion capture | [VERIFIED: `capture-phase134-uat-evidence.mjs:1-212`; `collect-member-profile-evidence.mjs:23-235`] |
| Frontend badge tests | Unit/structural regression | Existing resolver, chain, carousel, config tests | Replace obsolete geometry/no-Karaoke assertions; add filesystem and manifest coverage | [VERIFIED: `badgeArtwork.test.ts:1-36`; `MemberBadgeChain.test.tsx:188-230,1095-1101,1436-1459,1557-1635`] |
| Backend public-profile loaders | Read-only aggregate baseline | Existing extracted `loadRoleVolumeCounts` and `loadContrib*Count` helpers | No Phase-151 source changes; document the fixed path and preserve constant 20 | [VERIFIED: `member_profile_role_volume_repository.go:31-60`; `member_profile_contribution_badges_repository.go:63-148`; `151-UI-SPEC.md:9-20`] |
| Backend query/dedup tests | Integration budget | Existing guarded Phase-131/150 tests | Preserve constant 20 and exact-once role entry | [VERIFIED: `member_profile_query_budget_test.go:45-79,158-212`; `member_profile_public_repository_postgres_test.go:326-391`] |
| `frontend/scripts/collect-member-profile-evidence.mjs` | Active performance metadata | Go query-budget constant | Correct stale current metadata from 19 to 20 if touched; do not edit historical Phase-131 evidence | [VERIFIED: `collect-member-profile-evidence.mjs:727-734,917-923`; `member_profile_query_budget_test.go:165-168`] |

## Exact Pattern Assignments

### 1. Role artwork manifest and resolver

**Keep:** `resolveBadgeArtwork` and `resolveLayeredRoleArtwork` as the only public resolution functions. [VERIFIED: `badgeArtwork.ts:41-67`]

**Change direction:** replace icon-key-nested filename maps with one presentation-only role strategy keyed by role code. [RECOMMENDATION]

```ts
type RoleArtworkStrategy = 'layered' | 'direct-volume'

const ROLE_ACHIEVEMENT_ARTWORK = {
  admin: { strategy: 'layered' },
  // ...presentation support only...
  timer: { strategy: 'direct-volume' },
  karaoke_fx: { strategy: 'layered' },
} satisfies Record<string, { strategy: RoleArtworkStrategy }>
```

The catalog remains authoritative for existence/order/labels; this manifest answers only whether trusted shipped artwork exists and which established composition it uses. [RECOMMENDATION]

Derive established filenames only after manifest membership:

```text
role_entry_<role>.png
role-<role>-motif.png
rank-frame-<role>-<bronze|silver|gold|platinum>.png
role_volume_<role>_<tier>.png          # direct-volume strategy only
```

These conventions already match all 11 existing role families and the Timer exception. [VERIFIED: filesystem inventory; `badgeArtwork.ts:34-66`]

**Do not copy:** numeric threshold data, role labels, sort order, contexts, assignability, or capability data. [RECOMMENDATION]

### 2. Shared achievement artwork renderer

**Analog:** the role layered markup is the richest existing implementation and should be extracted without reinterpreting its four layers. [VERIFIED: `MemberBadgeChain.tsx:768-780`; `LayeredBadgeArtwork.module.css:11-66`]

Suggested presentation-only shape:

```ts
type AchievementArtworkProps = {
  artwork: { kind: 'direct'; src: string } | { kind: 'layered'; motifSrc: string; frameSrc: string }
  alt: string
  badgeCode: string
  size?: 'hero' | 'stage'
  decorative?: boolean
}
```

[RECOMMENDATION] The component owns `ResponsiveImage`, intrinsic source hints, `sizes`, the `data-achievement-art` marker, and layer markup. Stage/card components own labels, progress, state, and domain copy.

[RECOMMENDATION] The CSS module owns one square slot, `max-width: 100%`, `aspect-ratio: 1`, contained image layers, stable active geometry, and two bounded size variants. It responds to the existing container, not viewport width.

**Do not create:** another `ResponsiveImage`, a global `components/ui` badge-art component, per-family image wrappers with new widths, or a resolver inside each stage. [RECOMMENDATION]

### 3. Stage/component extraction

**Analog:** the existing function-local stages are already separated conceptually and have exclusive CSS modules. [VERIFIED: `MemberBadgeChain.tsx:429-638`]

[RECOMMENDATION] Move each touched stage to a same-domain file only when extraction enables shared renderer consumption or memoization; do not redesign its progress semantics. `RoleAchievementCard` is the highest-value extraction because carousel navigation remaps every role row.

[RECOMMENDATION] Keep `resolveRoleProgressPresentation` and `resolveMemberBadgeFamilies` as pure mapping seams. Do not move their calculations into card components.

[RECOMMENDATION] Remove `FamilyCollectionCard` rather than extracting it: its render branch is unreachable and its second scroll engine is the nested-track debt Phase 151 is intended to eliminate. Delete its exclusive `BadgeFamilyCard.module.css` and stale tests in the same plan.

### 4. Responsive geometry

**Existing owner to reuse:** `.carouselShell` establishes `container: member-badge-carousel / inline-size`. [VERIFIED: `MemberBadgeChain.module.css:21-26`]

[RECOMMENDATION] Slot CSS implements the locked `192/64` base, `216/80` at the named 560 px `slot-with-copy` transition, and `240/80` at the named 656 px `slot-roomy` transition. No `min-width: 1440/1600/2100` image-growth blocks remain. [VERIFIED: `151-UI-SPEC.md:34-64`]

[RECOMMENDATION] Family CSS may still own grid columns, gaps, text, tier-track layout, and inactive opacity. It must not own primary hero width/height after migration.

[RECOMMENDATION] Remove the active/inactive artwork scaling and translation. Use identical outer/card/hero/marker dimensions and restrict active emphasis to border, opacity/filter, and focus; browser tests compare computed rectangles rather than only regex-matching declarations. [VERIFIED: `151-UI-SPEC.md:66-80`]

### 5. Carousel and re-render containment

**Keep exact interaction analog:** `FocalCarousel.focusItem`, snap suppression, 120 ms free-scroll settle, endpoint pass-through, vertical-intent release, `inert`, and reduced-motion listener cleanup. [VERIFIED: `FocalCarousel.tsx:119-138,143-236,242-354,441-484`]

[RECOMMENDATION] Use `React.memo` on extracted card/stage children so active-index changes update the previous/current card while unchanged inactive children retain their subtree. Do not add virtualization because full mount is explicitly tested.

[RECOMMENDATION] Replace count-derived React keys with a small `useEffect` that resets preview state on `family.currentCount`/`currentStage`. Add a behavior test for reset plus a render-count regression.

[RECOMMENDATION] Pre-index `earnedBadges` once; keep all maps in `MemberBadgeChain` presentation scope and do not introduce global state.

### 6. Backend and query preservation

**Analog:** the existing fixed 20-query public-profile path and Phase-150 exact-once role entry are the locked baseline. [VERIFIED: `member_profile_query_budget_test.go:158-212`; `member_profile_public_repository_postgres_test.go:326-391`; `151-UI-SPEC.md:9-20`]

[RECOMMENDATION] Do not modify backend repositories, SQL, DTOs, endpoints, contracts, or the threshold registry in Phase 151. Rerun the guarded Phase-131/150 integration tests before and after the presentation changes.

[RECOMMENDATION] Keep the observed repeated role/contribution aggregate calls documented as a future optimization seam. Do not remove them or the inert local `12` under this UI-phase contract.

[RECOMMENDATION] If the active Phase-120/131 collector is reused, correct its descriptive 19-query value to the current locked 20 so evidence does not contradict the Go test; historical evidence remains unchanged.

### 7. Visual gallery and evidence collector

**Gallery analog:** existing dev showcase modules render productive domain compositions against mock data without product APIs. [VERIFIED: `docs/frontend/ui-system.md:198-217`; `frontend/src/app/dev/ui-system/showcase/PublicReleaseSurfacesShowcase.tsx:205`]

[RECOMMENDATION] The achievement showcase should have two sections:

1. Production carousel/stage composition with realistic server-shaped `public_badges`/`badge_progress` fixtures.
2. Exhaustive artwork matrix generated from the presentation manifest: every role × five codes, every points/progress/contribution/membership/special approved art.

[RECOMMENDATION] A nested mock `RoleCatalogProvider` should supply role rows. Threshold values in mock progress must reuse the existing test fixture module or be passed as opaque fixture input; the gallery must not compute tiers.

**Collector analog:** copy the robust `domcontentloaded` + rendered-heading + best-effort-networkidle pattern and 90-second VM timeout from Phase 134. [VERIFIED: `capture-phase134-uat-evidence.mjs:23-32,85-114`]

[RECOMMENDATION] Add badge-specific JSON checks to the existing Phase-120 DOM snapshot pattern: `naturalWidth/naturalHeight`, bounding rectangle, overflow/clipping, `currentSrc`, optimized width, active state, neighbor slot width, and unique badge code.

## Test Pattern Assignments

| New/updated proof | Existing analog | Important constraint |
|---|---|---|
| Karaoke resolver matrix | `badgeArtwork.test.ts` | Assert Entry and four volumes; normal layers, no JSX branch |
| Filesystem completeness | `ResponsiveImage.config.test.ts` uses config imports; Node/Vitest can use `node:fs` | Check explicit manifest-derived paths; no runtime probing |
| Catalog coverage | `MemberBadgeChain.test.tsx` catalog fixture | All `anime_contribution` roles must have art or explicit exception; do not hard-code thresholds |
| Unique badge codes | `memberBadgeFamilies.test` behavior in `memberBadgeLabels.test.ts` | Preserve Set/Map ownership and Phase-150 exact-once integration test |
| Slot responsive contract | Existing CSS contract tests + browser geometry snapshot | Prefer computed rectangles over locking obsolete source numbers |
| Active/neighbor stability | `FocalCarousel.test.tsx` geometry mocks | Outer slots equal; active semantic/visual state clear; no pump |
| Reduced motion | Existing carousel reduced-motion cases | Immediate navigation, listeners cleaned, semantic active state retained |
| Query preservation | `TestPhase131PublicProfileQueryBudgetIsConstant` | Dedicated guarded DSN; result remains constant and exactly 20 |
| Badge-by-badge visual QA | Phase-134 screenshot collector | All manifest rows and all required viewports; manual optical sign-off |

## Required `read_first` for Plans

Every Phase-151 implementation plan that touches the public badge UI should include:

- `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-USER-REQUEST.md`
- `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-RESEARCH.md`
- `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-PATTERNS.md`
- `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-UI-SPEC.md`
- `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-VALIDATION.md`
- `docs/engineering/implementation-contract.md`
- `docs/frontend/ui-system.md`
- `docs/agent-guidelines-ui.md`
- `frontend/src/components/profile/MemberBadgeChain.tsx`
- `frontend/src/components/profile/badgeArtwork.ts`
- `frontend/src/components/profile/memberBadgeLabels.ts`
- `frontend/src/components/profile/memberBadgeFamilies.ts`
- all touched profile CSS modules
- `frontend/src/components/ui/FocalCarousel.tsx` and `.module.css`
- `frontend/src/components/ui/ResponsiveImage.tsx`
- the focused tests named above

Backend/query plans should additionally read:

- `backend/internal/badges/thresholds.go`
- `backend/internal/repository/member_profile_public_repository.go`
- `backend/internal/repository/member_profile_role_volume_repository.go`
- `backend/internal/repository/member_profile_contribution_badges_repository.go`
- `backend/internal/repository/member_profile_progress_repository.go`
- `backend/internal/repository/member_profile_query_budget_test.go`
- `backend/internal/repository/member_profile_public_repository_postgres_test.go`

Visual-evidence plans should additionally read:

- `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-PROTOTYPE.html`
- `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-SOURCE-ARTWORK-REVIEW.md`
- `frontend/src/app/dev/ui-system/page.tsx`
- `frontend/src/app/dev/ui-system/showcase/PublicReleaseSurfacesShowcase.tsx`
- `frontend/scripts/capture-phase134-uat-evidence.mjs`
- `frontend/scripts/collect-member-profile-evidence.mjs`

## Anti-patterns / Stop Conditions

- A frontend array containing Phase-150 numeric thresholds is a blocking design error. [RECOMMENDATION]
- A role manifest containing labels, contexts, sort order, permissions, or assignability is a parallel catalog and must not be introduced. [RECOMMENDATION]
- A Karaoke-specific conditional in `MemberBadgeChain` is unnecessary; the resolver strategy must make Karaoke ordinary. [RECOMMENDATION]
- New viewport image rules at 1440/1600/2100 repeat the current failure mode; use the shared slot's container geometry. [RECOMMENDATION]
- A second carousel/scroll-settle engine inside a focal slide is out of pattern. [RECOMMENDATION]
- Per-card fetches, per-role SQL, or per-badge SQL violate the existing aggregate path. [VERIFIED: current aggregate pattern in `member_profile_role_volume_repository.go:35-60`; user constraint in `151-USER-REQUEST.md:401-426`]
- A screenshot claim without the exhaustive manifest and manual sign-off is incomplete. [VERIFIED: `151-USER-REQUEST.md:430-513`]
- Any database test DSN that does not match the guarded throwaway database name must remain rejected. [VERIFIED: `member_profile_query_budget_test.go:47-76`; `member_profile_public_repository_postgres_test.go:254-285`]

## Expected File Ownership by Plan

| Plan slice | Exclusive ownership recommendation |
|---|---|
| Artwork/Karaoke | `badgeArtwork.ts`, its tests, new profile artwork component/module, six Karaoke PNGs |
| Responsive/stages | `MemberBadgeChain.tsx`, profile stage/role/chain CSS, related chain tests |
| Carousel/performance | `FocalCarousel*` only if measured change is needed; otherwise card extraction/render tests |
| Backend/query validation | No backend source ownership; run query/dedup tests and correct active collector metadata only if reused |
| Visual QA | Dev showcase module/page wiring, Phase-151 capture script, phase evidence artifacts |

These ownership boundaries minimize conflict and keep presentation, interaction, SQL, and evidence concerns independently reviewable. [RECOMMENDATION]

---

**Pattern map status:** COMPLETE
