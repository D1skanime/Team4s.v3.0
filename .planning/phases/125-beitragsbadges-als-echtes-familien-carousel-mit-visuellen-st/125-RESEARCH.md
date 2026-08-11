# Phase 125: Beitragsbadges als echtes Familien-Carousel mit visuellen Stufen - Research

**Researched:** 2026-08-11
**Domain:** Public-profile contribution achievement stages inside the shared family carousel
**Confidence:** HIGH

## Summary

Phase 125 is a frontend-only presentation refactor over an already complete public-profile projection. The backend always emits `badge_progress` rows for `contribution_projects`, `contribution_chronicle`, and `contribution_archivist`, including at zero; each row contains the real count, next threshold, remainder, next tier, and completion flag. `resolveMemberBadgeFamilies` reconstructs all three Bronze/Silver/Gold families, so zero-value families remain visible with Bronze locked. No backend, API, database, threshold, badge-code, or ownership change is needed. [VERIFIED: `backend/internal/repository/member_profile_progress_repository.go`, `frontend/src/components/profile/memberBadgeLabels.ts`, Phase 125 PRD ??1-3,31-32]

Retain the outer `FocalCarousel` for the three peer families, but replace the overloaded generic `FamilyCollectionCard` presentation for this group with a contribution-specific Stage composed from Phase-123/124 seams. The inner three-tier track must be a static, evenly distributed thumbnail list with earned buttons and locked static items?no observer, scroll-settle timer, wheel remapping, or inner swipe engine. [VERIFIED: `MemberBadgeChain.tsx`, Phase 125 PRD ??4-6,14-19,24-25]

The worktree is already dirty in all three `MemberBadgeChain` files, all three `FocalCarousel` files, six contribution PNGs, and the roadmap. These are user-owned overlapping edits. Planning must require a fresh diff audit, targeted patches, and preservation of the current Phase-123/124 stage seams and ongoing carousel fixes. [VERIFIED: canonical `git status --short` and `git diff`, 2026-08-11]

**Primary recommendation:** Add a profile-local `ContributionAchievementStage` consuming `MemberBadgeFamilyPresentation`, use the central resolver for all nine artworks, render a tap/click-only three-thumbnail track, and retain the same DOM in carousel and expanded modes. [VERIFIED: codebase and PRD]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Contribution counts and thresholds | API / Backend | Database / Storage | Repository queries own counting and `buildBadgeProgress` owns next-target semantics. [VERIFIED: backend repositories] |
| Family/stage reconstruction | Browser / Client | Frontend Server (SSR) | `resolveMemberBadgeFamilies` reconstructs stages from SSR props. [VERIFIED: `memberBadgeLabels.ts`] |
| Family carousel navigation | Browser / Client | ? | `FocalCarousel` owns arrows, keyboard, drag, reduced motion, neighbors, and expanded mode. [VERIFIED: `FocalCarousel.tsx`] |
| Hero, progress, preview, thumbnails | Browser / Client | ? | Local contribution presentation responsibility. [VERIFIED: `MemberBadgeChain.tsx`, PRD] |
| Badge artwork | CDN / Static | Browser / Client | Nine tracked PNGs are selected through `resolveBadgeArtwork`. [VERIFIED: assets and resolver] |

## Project Constraints (from AGENTS.md)

- Work only in `/home/d1sk/team4s` through `ssh team4s-linux`; do not edit the retired Windows copy. [VERIFIED: `AGENTS.md`]
- Inspect dirty state and Compose services before editing; preserve `.env`, `media`, volumes, and databases. [VERIFIED: `AGENTS.md`; services confirmed running]
- Keep changes targeted; never overwrite user-owned dirty changes or broadly format overlapping files. [VERIFIED: `AGENTS.md`]
- Search first and reuse existing seams; plans must list exact analog files in `read_first`. [VERIFIED: `AGENTS.md`, `docs/engineering/implementation-contract.md`]
- Generic UI stays in `components/ui`; contribution composition stays in `components/profile`. [VERIFIED: `docs/frontend/ui-system.md`]
- Use correct German umlauts in all user-facing strings. [VERIFIED: `AGENTS.md`]
- Run focused tests, typecheck, lint, build if feasible, `git diff --check`, and live shared-route UAT. [VERIFIED: `AGENTS.md`]

## Standard Stack

| Library / seam | Version | Purpose | Why Standard |
|---|---:|---|---|
| Next.js | `^16.1.6` | Public profile runtime | Existing runtime; no new dependency. [VERIFIED: `frontend/package.json`] |
| React | `18.3.1` | Local preview state | Existing runtime. [VERIFIED: `frontend/package.json`] |
| CSS Modules + tokens | repository-native | Responsive Stage/geometry | Required local pattern. [VERIFIED: UI docs] |
| `FocalCarousel` | repository-native | Outer family navigation | Existing shared contract. [VERIFIED: component] |
| `ResponsiveImage`, `Card`, `Badge`, `SectionHeader` | repository-native | Artwork/stage primitives | Existing reusable seams. [VERIFIED: chain component] |
| Vitest / Testing Library | `^3.2.4` / `^16.3.0` | Behavior and accessibility tests | Existing test stack. [VERIFIED: package] |

**Installation:** None. [VERIFIED: existing stack]

## Architecture Patterns

```text
PostgreSQL contribution sources
        |
        v
backend count loaders --> buildBadgeProgress (value/next/remainder/complete)
        |                                      |
        +--> highest earned synthetic badge ---+
                                               v
                                  public profile SSR props
                                               |
                                  resolveMemberBadgeFamilies
                                               |
                          outer FocalCarousel: three families
                         /              |                 \
                    Projects        Chronicle          Archivist
                       |                |                  |
                  ContributionAchievementStage (same DOM)
                  hero + true progress + 3 thumbnail choices
```

[VERIFIED: backend repositories and frontend render path]

### Recommended Project Structure

```text
frontend/src/components/profile/
??? MemberBadgeChain.tsx          # contribution routing and local Stage pieces
??? MemberBadgeChain.module.css   # Stage/tier geometry
??? MemberBadgeChain.test.tsx     # rendering and carousel integration
??? memberBadgeLabels.ts          # existing definitions; no threshold changes
??? memberBadgeLabels.test.ts     # boundary/zero oracle
frontend/src/components/ui/
??? FocalCarousel.tsx             # preserve generic interaction seam
??? FocalCarousel.test.tsx        # regression unless a generic defect is proven
```

### Pattern 1: Authoritative progress in, presentation out

Use `family.currentCount`, `nextThreshold`, `remainingCount`, `nextStage`, and `complete`; preview changes only `heroStage` and status. Percent uses existing cumulative `current_count / next_threshold`, visually capped at 100. At terminal Gold, retain true visible count and full bar without inventing a next target. Keep `aria-valuenow <= aria-valuemax` (clamp the bar value to Gold threshold) while the true count remains visible/accessibly described; values above max are invalid. [VERIFIED: current arithmetic and backend terminal fields; CITED: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/progressbar_role]

```tsx
const selectedStage = family.stages.find(
  (stage) => stage.badge_code === selectedCode && stage.earned,
)
const heroStage = selectedStage ?? family.heroStage
const count = family.currentCount ?? 0
```

### Pattern 2: Three-tier Type-C track

Render one `<ol>` with three `<li>` items. Earlier/current earned stages contain real buttons; locked future stages are static and therefore unfocusable. Use `aria-current="step"` for the true tier, `aria-pressed` for selected preview, and visible `Aktuell`/`Vorschau`/`Gesperrt`. [VERIFIED: PRD ??9,14-17,26,30]

### Pattern 3: Nested-control boundary

The current carousel ignores item activation when clicks originate in `button, a, input, select, textarea`, and click capture suppresses post-drag click. Thumbnails must be native buttons and must not stop propagation. Free card space remains outer-drag territory; vertical intent is abandoned after the 6px threshold when vertical delta dominates, preserving page scroll. [VERIFIED: current dirty `FocalCarousel.tsx`]

### Pattern 4: Same DOM in expanded mode

`FocalCarousel` calls the same `renderItem` normally and expanded. Do not fork active/inactive/expanded trees. CSS may alter emphasis, but structure and controls remain stable. [VERIFIED: component, PRD ??20,29]

### Anti-Patterns to Avoid

- Recomputing thresholds/remainder/ownership in React. [VERIFIED: PRD ?3]
- Removing zero-count families. [VERIFIED: backend/resolver]
- Reusing `FamilyCollectionCard` observers, settle timer, wheel mapping, or scroll-derived selection. [VERIFIED: component, PRD ?24]
- Adding inner touch/swipe handlers. [VERIFIED: PRD ??17-19]
- Interpolating unversioned contribution filenames. [VERIFIED: PRD ?10]
- Separate active/expanded DOM or contribution-only changes to shared carousel. [VERIFIED: PRD and implementation contract]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Counts/eligibility | Client counters | backend `badge_progress` | Correct ownership exists. [VERIFIED: repositories] |
| Family derivation | Threshold switches | `resolveMemberBadgeFamilies` | Handles zero/earned/locked/complete. [VERIFIED: resolver] |
| Outer gestures | New carousel | `FocalCarousel` | Existing interaction contract. [VERIFIED: component] |
| Inner gestures | Swipe/momentum | Native buttons/grid | Three items fit without conflict. [VERIFIED: PRD] |
| Artwork | Local filenames | `resolveBadgeArtwork` | Maps active versions. [VERIFIED: resolver] |

## Current Domain Semantics

| Family | Count ownership | Thresholds | Zero behavior |
|---|---|---|---|
| Mitgetragene Projekte | `(anime_id,fansub_group_id)` where every ledger-recorded release version has member active awarded-role coverage | 1/5/15 | Visible; no current; Bronze locked; next/remain 1. [VERIFIED: repositories/resolver] |
| Chronikpflege | Published, non-deleted release-version notes plus project/group notes through verified author-member seam | 10/50/150 | Visible; no current; Bronze locked; next/remain 10. [VERIFIED: repository] |
| Bildarchivpflege | Non-deleted `release_version_media` through verified author-member seam; no review/visibility filter | 10/50/150 | Visible; no current; Bronze locked; next/remain 10. [VERIFIED: repository] |

Negative counts clamp to zero; the first threshold strictly greater than count is next; at/above Gold the backend emits `complete=true` with null next fields. [VERIFIED: `buildBadgeProgress`]

## Active Asset Contract

| Family | Bronze | Silber | Gold |
|---|---|---|---|
| Projects | `contribution_projects_bronze-v3.png` | `contribution_projects_silver-v2.png` | `contribution_projects_gold-v2.png` |
| Chronicle | `contribution_chronicle_bronze-v4.png` | `contribution_chronicle_silver-v2.png` | `contribution_chronicle_gold-v2.png` |
| Archivist | `contribution_archivist_bronze-v2.png` | `contribution_archivist_silver-v2.png` | `contribution_archivist_gold-v2.png` |

All nine are 1254?1254 RGBA PNGs explicitly mapped before the legacy fallback. Use square hero/thumbnail slots and `object-fit: contain`; visual UAT must inspect perceived transparent/background bounds. [VERIFIED: `file`, resolver, PRD ?11]

## Common Pitfalls

- **Below-Bronze omission:** always render all three progress-projected families. [VERIFIED: backend/resolver]
- **Preview corrupts metrics:** hero/status read selection; metrics always read `family`. [VERIFIED: PRD ?14]
- **Nested tap activates family:** preserve native-button exclusion and drag click suppression; test explicitly. [VERIFIED: carousel]
- **Mobile page-scroll trap:** preserve `touch-action: pan-y` and vertical intent escape; no inner gestures. [VERIFIED: carousel CSS/TSX]
- **Expanded leakage:** test transforms, peek widths, skeletons, and same DOM in the three-card grid. [VERIFIED: PRD ?29]

## Assumptions Log

No material `[ASSUMED]` claims; all implementation semantics were verified or cited.

## Resolved Open Questions

1. Preserve `Alle anzeigen`: the existing collection consumer passes it and the PRD forbids implicit removal. [VERIFIED: consumer, PRD ?29]
2. Use PRD public copy: `mitgetragenes Projekt`, `Chronikbeitrag`, `Medienbeitrag`; this is scoped presentation copy, not domain logic. [VERIFIED: PRD ?27]
3. Do not plan a `FocalCarousel` change unless a new generic regression proves a shared defect; its dirty version already contains nested-control and drag suppression seams. [VERIFIED: current code/diff]

## Environment Availability

| Dependency | Available | Evidence |
|---|---|---|
| Canonical Linux repo | ? | `/home/d1sk/team4s` [VERIFIED: SSH] |
| Frontend Compose service | ? | running [VERIFIED: `docker compose ps`] |
| Backend/db services | ? | running; db healthy [VERIFIED: `docker compose ps`] |

## Validation Architecture

Nyquist is enabled; see `125-VALIDATION.md`. [VERIFIED: `.planning/config.json`]

## Security Domain

Only ASVS V4 is relevant as regression: preserve server-side public-profile visibility gating and add no fetch/auth seam. The threat is hidden-profile progress disclosure; existing handler coverage asserts `badge_progress` is absent behind the gate. [VERIFIED: `backend/internal/handlers/app_public_profile_test.go`]

## Sources

- Phase 125 PRD; backend contribution/progress repositories; frontend family resolver, chain, carousel, assets, tests. [VERIFIED: canonical repository]
- MDN ARIA progressbar role. [CITED: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/progressbar_role]

## Metadata

**Confidence:** Stack HIGH; architecture HIGH; pitfalls HIGH?each traced in current canonical code and PRD. [VERIFIED: codebase]  
**Research date:** 2026-08-11  
**Valid until:** 2026-09-10

## RESEARCH COMPLETE
