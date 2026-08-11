# Phase 124: Punkte-Meilensteine als responsive Single-Family Achievement Stage - Research

**Researched:** 2026-08-11
**Domain:** Responsive public-profile achievement presentation over existing point progress projection
**Confidence:** HIGH

## Summary

Phase 124 is a frontend-only presentation change inside the existing public member badge chain. The canonical data path is already complete: PostgreSQL-maintained `member_point_totals.total_points` is loaded into the public profile, the backend emits authoritative `badge_progress` for the `points` family, SSR derives only the highest earned point badge, and `resolveMemberBadgeFamilies` reconstructs all six stages. The new stage must consume that exact family presentation and must not introduce point calculations, persistence, API work, or backend changes. [VERIFIED: `backend/internal/repository/member_profile_repository.go`, `backend/internal/repository/member_profile_progress_repository.go`, `frontend/src/app/members/[slug]/page.tsx`, `frontend/src/components/profile/memberBadgeLabels.ts`]

The closest implementation analog is the currently uncommitted Phase-123 `AnimeProjectAchievementStage` in `MemberBadgeChain.tsx`, with its associated CSS and tests. It already removes the outer `FocalCarousel`, uses one responsive desktop/mobile DOM tree, keeps selection local, preserves authoritative progress during preview, and exposes locked stages as non-interactive list items. Phase 124 should extract only the genuinely common shell/progress primitives and add a points-specific artwork thumbnail track; it should not copy the whole component or generalize all badge families. [VERIFIED: dirty diff of `frontend/src/components/profile/MemberBadgeChain.tsx`, `MemberBadgeChain.module.css`, `MemberBadgeChain.test.tsx`]

The highest execution risk is overlap with user-owned uncommitted work: `MemberBadgeChain.tsx`, its CSS/tests, all three `FocalCarousel` files, six contribution badge PNGs, and the roadmap are dirty. Phase 124 necessarily edits the first three files but must preserve the existing Phase-121/123 work and must not touch `FocalCarousel`; plans should begin with a fresh diff audit and use targeted patches only. [VERIFIED: `git status --short`, `git diff --stat` at canonical HEAD `adf66223`]

**Primary recommendation:** Extract a small profile-local achievement stage shell from the landed-in-worktree Anime Project stage, implement a points-specific six-thumbnail track over `MemberBadgeFamilyPresentation`, route only `group.key === 'points'` outside `FocalCarousel`, and prove all threshold/preview/terminal/SSR/responsive contracts with focused Vitest plus live browser UAT.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Point total and next-threshold projection | API / Backend | Database / Storage | Backend already loads the trigger-maintained total and emits authoritative progress; Phase 124 must consume it unchanged. [VERIFIED: repository files above] |
| Highest earned point milestone on public SSR | Frontend Server (SSR) | API / Backend | The public profile route calls `deriveMilestoneBadge(total_points)` before rendering `MemberBadgeChain`. [VERIFIED: `frontend/src/app/members/[slug]/page.tsx`] |
| Six-stage family reconstruction | Browser / Client | Frontend Server (SSR) | The client component deterministically resolves stages from SSR-provided props; no browser-only inputs are involved. [VERIFIED: `resolveMemberBadgeFamilies`] |
| Hero, progress, preview, thumbnail track | Browser / Client | — | Local presentation and non-persisted selection belong in `MemberBadgeChain`. [VERIFIED: existing `FamilyCollectionCard` and Phase-123 stage] |
| Artwork files | CDN / Static | Browser / Client | PNGs are tracked under `frontend/public/member-achievement-badges` and selected by the central resolver. [VERIFIED: asset directory and `resolveBadgeArtwork`] |

## Project Constraints (from AGENTS.md)

- Work only in `/home/d1sk/team4s` via `ssh team4s-linux`; the Windows copy is retired and must not be changed. [VERIFIED: `/home/d1sk/team4s/AGENTS.md`]
- Inspect `git status --short` and `docker compose ps` before editing; both were inspected and relevant services are running. [VERIFIED: canonical environment audit]
- Treat current changes as user-owned, keep diffs small, use targeted edits, and avoid broad formatting. [VERIFIED: `AGENTS.md`]
- Search for and reuse existing components/helpers before adding a component or utility; plans must name analog files in `read_first`. [VERIFIED: `AGENTS.md`, `docs/engineering/implementation-contract.md`]
- Use existing UI tokens/components and keep domain logic out of `frontend/src/components/ui`. [VERIFIED: `docs/frontend/ui-system.md`]
- Use correct German umlauts in all user-facing strings. [VERIFIED: `AGENTS.md`]
- Do not alter backend, database, point ledger, credit lifecycle, or persisted-data behavior for this phase. [VERIFIED: Phase 124 PRD sections 3, 33]
- Do not modify or delete tracked badge assets unless explicitly requested; Phase 124 consumes existing point assets. [VERIFIED: `AGENTS.md`, Phase 124 PRD section 9]
- Run focused tests, typecheck, lint, build if feasible, and `git diff --check`; document unavailable checks. [VERIFIED: `AGENTS.md`]
- UI/UAT must use the shared live route through `http://127.0.0.1:3300` and include the exact route under test. [VERIFIED: `AGENTS.md`]
- Stop before formal completion for the PRD's human approval checkpoint after screenshots and live UAT. [VERIFIED: Phase 124 PRD section 36]

## Standard Stack

### Core

| Library / seam | Version | Purpose | Why Standard |
|---|---:|---|---|
| Next.js | `^16.1.6` | SSR public profile and optimized images | Existing route/runtime; no new dependency is needed. [VERIFIED: `frontend/package.json`] |
| React | `18.3.1` | Local preview state and deterministic render tree | Existing frontend runtime. [VERIFIED: `frontend/package.json`] |
| CSS Modules + global tokens | repository-native | Responsive stage layout and local track styling | Existing `MemberBadgeChain.module.css` and UI-system contract. [VERIFIED: codebase/docs] |
| `ResponsiveImage` | repository-native | Hero and thumbnail artwork | Existing badge artwork seam already supplies responsive images. [VERIFIED: `MemberBadgeChain.tsx`] |
| `Badge`, `Card`, `SectionHeader` | repository-native | Shell/status/section primitives | Existing global UI components; do not create local generic equivalents. [VERIFIED: `MemberBadgeChain.tsx`, `docs/frontend/ui-system.md`] |

### Supporting

| Library / seam | Version | Purpose | When to Use |
|---|---:|---|---|
| Vitest | `^3.2.4` | Component and pure presentation tests | All automated Phase-124 behavior tests. [VERIFIED: `frontend/package.json`, `frontend/vitest.config.ts`] |
| Testing Library React | `^16.3.0` | Semantic interaction assertions | Preview selection, locked non-focusability, carousel absence, ARIA. [VERIFIED: `frontend/package.json`, existing tests] |
| lucide-react | `^0.469.0` | Lock/check fallback markers | State must not rely on color alone. [VERIFIED: `frontend/package.json`, existing component] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| Profile-local shared stage shell | Duplicate `AnimeProjectAchievementStage` into a points component | Faster initially but violates the PRD reuse requirement and creates two copies of hero/progress/responsive layout. [VERIFIED: PRD sections 5, 22, 23] |
| Native horizontal overflow on mobile | `FocalCarousel` or custom momentum/settle engine | Adds outer carousel semantics or recreates explicitly prohibited complexity. [VERIFIED: PRD sections 4, 15] |
| Existing central artwork resolver | Hard-coded filenames inside the new track | Risks reactivating `point_milestone_veteran-v2.png` instead of active `-v3`. [VERIFIED: asset directory and `resolveBadgeArtwork`] |

**Installation:** None. Phase 124 requires no package changes. [VERIFIED: existing stack covers the requested behavior]

## Architecture Patterns

### System Architecture Diagram

```text
member_point_totals.total_points
          |
          v
public profile repository --------------------------+
  |                                                 |
  +--> total_points --> SSR deriveMilestoneBadge ---+--> earnedBadges
  |                                                 |
  +--> badge_progress[family=points] ----------------+--> MemberBadgeChain
                                                        |
                                                        v
                                              resolveMemberBadgeFamilies
                                                        |
                              +-------------------------+------------------+
                              |                                            |
                         group=points                                other groups
                              |                                            |
                     Points Achievement Stage                   existing render paths
                     hero + true progress +                   (roles/projects/carousels)
                     native thumbnail track
```

All branches are existing except the points-specific render destination. [VERIFIED: codebase inspection]

### Recommended Project Structure

```text
frontend/src/components/profile/
├── MemberBadgeChain.tsx          # family routing, shared stage shell, points track
├── MemberBadgeChain.module.css   # existing styles plus scoped shared/points styles
├── MemberBadgeChain.test.tsx     # rendering, interaction, responsive contracts
├── memberBadgeLabels.ts          # existing thresholds/family resolver; avoid value changes
└── memberBadgeLabels.test.ts     # boundary matrix for pure derivation/resolution
frontend/src/app/members/[slug]/
└── page.test.tsx                 # SSR total_points projection/regression
```

Do not create a global `src/components/ui` stage unless a truly domain-free primitive is demonstrated; the common shell currently serves two profile achievement families and can remain profile-local. [VERIFIED: UI-system domain-boundary rules]

### Pattern 1: Authoritative family presentation in, presentation only out

**What:** Accept `MemberBadgeFamilyPresentation`; use `currentStage`, `nextStage`, `currentCount`, `nextThreshold`, `remainingCount`, and `complete` without recalculating thresholds. [VERIFIED: `memberBadgeLabels.ts`]

**When to use:** For the points stage and any shared shell fields.

```tsx
// Source: existing Team4s family presentation seam
const count = family.currentCount ?? 0
const currentCode = family.currentStage?.badge_code ?? null
const heroStage = selectedEarnedStage ?? family.heroStage
const progressMax = family.nextThreshold ?? family.stages.at(-1)?.threshold ?? 1
```

For terminal counts, visible text must retain the true count while the bar is visually complete. ARIA should follow the existing Anime-project terminal convention (`aria-valuenow` may exceed `aria-valuemax`) only if retained intentionally and covered; otherwise a semantics review is required because ARIA progressbar values ordinarily should remain within min/max. [VERIFIED: Phase-123 test explicitly expects `73/50`; Phase-124 PRD requires true >2500 value and full bar]

### Pattern 2: Local preview with stable authoritative metrics

**What:** Keep only `selectedCode` as local state. Resolve a selected stage only when earned, change hero/status only, and key/reset the component from current metrics as the existing chain does. [VERIFIED: Phase-123 implementation and PRD sections 11–12]

**When to use:** Selecting earlier earned point milestones.

```tsx
const selectedStage = family.stages.find(
  (stage) => stage.badge_code === selectedCode && stage.earned,
)
const heroStage = selectedStage ?? family.heroStage
// Progress always reads family.currentCount/nextThreshold/remainingCount.
```

### Pattern 3: Semantic native thumbnail strip

**What:** Render one `<ol>` with six `<li>` items. Earned items contain real buttons; locked items contain non-focusable static content. Use native `overflow-x: auto` only at constrained widths, optional CSS snap, visible focus, `aria-current="step"`, text/status markers, and real thumbnails selected through `resolveBadgeArtwork`. [VERIFIED: PRD sections 13–15, 24]

**When to use:** Points only; Anime Projects keeps its four-marker text track.

### Anti-Patterns to Avoid

- **Recomputing thresholds in the stage:** use resolved family fields and `POINT_MILESTONES`; do not create a third threshold table. [VERIFIED: existing backend/frontend sources and PRD]
- **Using `total_points / 2500` globally:** current semantics are cumulative current total divided by the next threshold, e.g. 72/200 = 36%. [VERIFIED: backend projection plus current `FamilyCollectionCard`; PRD examples]
- **Reusing `FamilyCollectionCard` unchanged:** it includes ResizeObserver centering, scroll-settle selection, wheel remapping, and a generic stage strip explicitly rejected for this phase. [VERIFIED: `MemberBadgeChain.tsx`, PRD section 15]
- **Changing `FocalCarousel`:** it remains required by roles/contributions/`FansubProjectsGrid`, and its files already contain overlapping uncommitted changes. [VERIFIED: consumers grep and dirty diff]
- **Duplicating the entire Anime Project component:** extract only shell/progress composition shared by two real consumers. [VERIFIED: implementation contract and PRD]
- **Making locked stages disabled buttons:** PRD asks for locked elements not focusable; static list content avoids disabled-control ambiguity and matches the existing family patterns. [VERIFIED: existing tests and PRD]
- **Using artwork as CSS backgrounds:** preserve `ResponsiveImage`, intrinsic square dimensions, and `object-fit: contain`. [VERIFIED: asset geometry and PRD section 10]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Point milestone derivation | New switch/threshold arithmetic | `POINT_MILESTONES`, `deriveMilestoneBadge`, `resolveMemberBadgeFamilies` | Already central and boundary-tested. [VERIFIED: codebase] |
| Next target/remainder | Client-local calculation from selected thumbnail | `badge_progress` family fields | Preview must never mutate real progress. [VERIFIED: backend repository and PRD] |
| Artwork version choice | Filename interpolation in track | `resolveBadgeArtwork` (extract/export internally if needed) | Veteran active version differs from the common `-v2` rule. [VERIFIED: resolver/assets] |
| Responsive image delivery | `<img>` copies or CSS backgrounds | `ResponsiveImage` | Existing optimized image seam and size contracts. [VERIFIED: component/tests] |
| Mobile carousel physics | Momentum, timers, wheel conversion, ResizeObserver centering | Native overflow + CSS | PRD explicitly prohibits those mechanisms. [VERIFIED: PRD section 15] |
| Generic card/status primitives | Local button/card/badge styles | Existing `Card` and `Badge` | Required by project UI contract. [VERIFIED: UI system] |

**Key insight:** The difficult domain work is already represented by one authoritative family object; Phase 124 should spend complexity on clear state presentation and artwork geometry, not rebuild data or scrolling systems.

## Common Pitfalls

### Pitfall 1: Treating only the highest earned point badge as the full family
**What goes wrong:** Earlier milestones are not selectable and future milestones disappear.  
**Why it happens:** SSR adds only one derived `PublicMemberBadge`.  
**How to avoid:** Render the six reconstructed `family.stages`, not `earnedBadges` directly.  
**Warning signs:** Fewer than six list items or filenames/codes assembled inside JSX. [VERIFIED: SSR and family resolver]

### Pitfall 2: Preview corrupts visible progress
**What goes wrong:** Selecting 200 points at an actual total of 734 makes the bar or count look like 200.  
**Why it happens:** Hero stage and authoritative progress state are conflated.  
**How to avoid:** Selected code controls only artwork/name/status; all numeric display reads `family`.  
**Warning signs:** Progress values depend on `heroStage.threshold`. [VERIFIED: PRD sections 11–12]

### Pitfall 3: Terminal count is clamped in user-facing text
**What goes wrong:** A member with 5,000 points appears to have 2,500.  
**Why it happens:** A clamped bar value is reused as the display value.  
**How to avoid:** Separate true count from fill calculation; show `Höchste Stufe erreicht`, no next/rest copy.  
**Warning signs:** `Math.min(count, 2500)` used in visible copy. [VERIFIED: PRD section 18]

### Pitfall 4: Active artwork version drifts
**What goes wrong:** veteran `-v2` is displayed instead of active `-v3`, or the old unversioned first badge returns.  
**Why it happens:** Generic filename interpolation bypasses the resolver.  
**How to avoid:** Central resolver remains the sole mapping; assert all six `src` values.  
**Warning signs:** `point_milestone_${...}.png` in new code. [VERIFIED: resolver and assets]

### Pitfall 5: Shared extraction changes other families
**What goes wrong:** roles, Anime Projects, contributions, membership, or special awards regress.  
**Why it happens:** extraction broadens beyond the two single-family stages or rewrites shared collection behavior.  
**How to avoid:** Keep extraction render-only and profile-local; preserve all non-points branches and run their existing tests.  
**Warning signs:** changes to family resolution, `FocalCarousel`, or contribution/membership CSS. [VERIFIED: PRD scope]

### Pitfall 6: Dirty-worktree overwrite
**What goes wrong:** Phase-123 stage or carousel fixes are silently lost.  
**Why it happens:** executor assumes HEAD is baseline or replaces whole files.  
**How to avoid:** record pre-edit hashes/diff, patch narrow regions, re-run `git diff` after each task, never reset/checkout.  
**Warning signs:** diff stat shrinks unexpectedly or unrelated FocalCarousel hunks appear. [VERIFIED: current dirty state]

### Pitfall 7: Page overflow at 390px
**What goes wrong:** the six-thumbnail track widens the entire profile page.  
**Why it happens:** missing `min-width: 0`, fixed grid columns, or overflow on the stage rather than the track.  
**How to avoid:** constrain shell/grid children and put `overflow-x: auto` only on the track.  
**Warning signs:** `document.documentElement.scrollWidth > window.innerWidth`. [VERIFIED: PRD responsive contract]

## Code Examples

### Route points outside only the outer carousel

```tsx
// Source: existing MemberBadgeChain group routing pattern
{group.key === 'progress' ? (
  <AnimeProjectAchievementStage family={group.families[0]} />
) : group.key === 'points' ? (
  <PointsAchievementStage family={group.families[0]} />
) : (
  <FocalCarousel /* unchanged remaining families */ />
)}
```

### Preserve real progress during preview

```tsx
// Source: Phase-124 PRD preview contract + existing Phase-123 pattern
<strong>{formatCount(family.currentCount ?? 0)} Punkte</strong>
<div
  role="progressbar"
  aria-label="Fortschritt für Punkte-Meilensteine"
  aria-valuemin={0}
  aria-valuenow={family.currentCount ?? 0}
  aria-valuemax={family.nextThreshold ?? family.stages.at(-1)?.threshold ?? 1}
>
  <span style={{ width: `${family.complete ? 100 : progressPercent}%` }} />
</div>
```

Use the repository's existing number-formatting convention if one is found during implementation; no dedicated Swiss grouping helper was found in the inspected badge code, so formatter selection remains an implementation check rather than a locked recommendation. [ASSUMED]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Generic family card inside outer `FocalCarousel` for all non-role groups | Dedicated single-family stage for Anime Projects | Uncommitted Phase-123 work present on 2026-08-11 | Phase 124 has a concrete analog but must preserve it as dirty baseline. [VERIFIED: current diff] |
| Inner generic strip with JS centering, settle selection, wheel mapping | Native/simple family-specific stage navigation | Phase-123/124 direction | Points should not inherit legacy strip mechanics. [VERIFIED: PRD and current implementation] |
| One active point badge displayed through generic collection UI | One hero plus six visually distinct thumbnails | Phase 124 target | Makes the reconstructed family legible without six primary cards. [VERIFIED: PRD] |

**Deprecated/outdated:**
- Outer Quiet Carousel semantics for a single points family are out of scope for continued use and must be removed only from the points branch. [VERIFIED: PRD section 4]
- Older `point_milestone_first.png` and `point_milestone_veteran-v2.png` remain present but are not active resolver choices. [VERIFIED: asset directory and resolver]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | A repository-wide number formatter may be preferable for Swiss grouping, but none was established during focused badge-path inspection. | Code Examples | Minor display inconsistency; planner should add a search-first check before creating a formatter. |

## Open Questions — Resolved

1. **How should thousands be grouped in this existing UI?**
   - What we know: PRD examples use apostrophes (`1'287`, `2'500`); current badge code prints raw numbers. [VERIFIED: PRD and component]
   - **RESOLVED:** The executor must search the frontend for the canonical numeric formatting seam first. Reuse it if present; otherwise use `Intl.NumberFormat('de-CH')` in the profile-local Stage seam so the PRD's apostrophe grouping is exact, without introducing a broad utility. Plan 124-02 Task 2 implements and tests this decision.

2. **Should terminal progressbar ARIA expose true count above max?**
   - What we know: Phase-123 tests explicitly accept true `aria-valuenow` above `aria-valuemax`; Phase 124 requires true visible total and a full bar. [VERIFIED: existing test and PRD]
   - **RESOLVED:** Clamp terminal `aria-valuenow` to `aria-valuemax` for a valid bounded progressbar while preserving the true, unbounded point total in visible text. Plans 124-01 Task 2 and 124-02 Task 2 encode this contract; no backend semantics change.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Canonical SSH host | all work | ✓ | `team4s-linux` | none |
| Docker Compose frontend | live UAT | ✓ | running on port 3000 | none |
| Docker Compose backend | live data | ✓ | running on port 18092 | none |
| PostgreSQL | public point totals | ✓ | PostgreSQL 16 container healthy | fixture/unit tests for boundary matrix |
| Node/GSD wrapper | planning workflow | ✓ | repository wrapper present | run frontend commands inside Compose |
| In-app browser tunnel | human UAT | expected | `127.0.0.1:3300` per AGENTS | Linux URL `192.168.235.196:3000` for diagnostics |

**Missing dependencies with no fallback:** None found. [VERIFIED: `docker compose ps`]

**Missing dependencies with fallback:** Boundary point totals not guaranteed in live seed data; focused fixtures/tests cover the full matrix, while live UAT uses controlled existing test-data paths. [VERIFIED: PRD section 30]

## Validation Architecture

See `124-VALIDATION.md` for the detailed Nyquist plan. Existing framework is Vitest 3.2.4 with jsdom and Testing Library; no Wave-0 framework install is required. [VERIFIED: frontend config/package]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication | no | Public profile; no auth behavior changes. [VERIFIED: route/component scope] |
| V3 Session Management | no | No protected action or session gating touched. [VERIFIED: PRD scope] |
| V4 Access Control | yes, regression only | Continue consuming visibility-gated public profile response; never fetch or expose new data. [VERIFIED: handler test and repository flow] |
| V5 Input Validation | yes, local UI state | Only accept selection codes found in `family.stages` with `earned === true`. [VERIFIED: existing selection pattern] |
| V6 Cryptography | no | No cryptographic operation. [VERIFIED: phase scope] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| Hidden-profile data leakage through new fetch | Information Disclosure | Add no fetch/API seam; render only already visibility-gated props. [VERIFIED: existing public handler test] |
| Locked future milestone activated by DOM interaction | Elevation of Privilege (UI-state analogue) | Render locked stages as non-interactive elements and guard selection by `earned`. [VERIFIED: PRD/accessibility contract] |
| Hydration mismatch from browser-derived point state | Tampering / Reliability | Derive initial current stage solely from SSR props; no storage/time/viewport input. [VERIFIED: PRD SSR contract] |

## Sources

### Primary (HIGH confidence)

- `/home/d1sk/team4s/AGENTS.md` — canonical environment, UI, validation, dirty-worktree rules.
- `.planning/phases/124-.../124-PRD.md` — locked phase scope, semantics, UAT and acceptance criteria.
- `frontend/src/components/profile/MemberBadgeChain.tsx` and dirty diff — current collection/Phase-123 stage implementation.
- `frontend/src/components/profile/memberBadgeLabels.ts` — thresholds, SSR derivation helpers, family reconstruction.
- `backend/internal/repository/member_profile_progress_repository.go` — authoritative point progress projection.
- `frontend/src/app/members/[slug]/page.tsx` — SSR highest-milestone derivation.
- `frontend/src/components/profile/*.test.ts*`, `frontend/src/app/members/[slug]/page.test.tsx` — existing test contracts.
- `docs/engineering/implementation-contract.md`, `docs/frontend/ui-system.md`, `docs/agent-guidelines-ui.md` — reuse and UI constraints.

### Secondary (MEDIUM confidence)

- None; this is codebase-only research.

### Tertiary (LOW confidence)

- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from package/config and existing components.
- Architecture: HIGH — traced end-to-end through backend repository, SSR route, resolver, and renderer.
- Pitfalls: HIGH — derived from explicit PRD prohibitions and current dirty implementation.

**Research date:** 2026-08-11  
**Valid until:** 2026-08-18 (short validity because the relevant Phase-121/123/FocalCarousel files are actively changing and uncommitted)
