# Phase 125: Beitragsbadges als echtes Familien-Carousel mit visuellen Stufen - Context

**Created:** 2026-08-11
**Source:** PRD Express from `125-PRD.md`; every PRD requirement is locked.

<domain>
## Domain

Phase 125 changes only the public member-profile presentation of the three equal Contribution badge families: `contribution_projects`, `contribution_chronicle`, and `contribution_archivist`. It retains their outer family carousel and replaces the overloaded inner family-card presentation with a responsive achievement Stage containing authoritative progress and three visually distinct Bronze/Silver/Gold artwork tiers.

The backend, API, database, contribution repositories, counters, thresholds, badge codes, earned/locked semantics, member attribution, and public-profile metrics remain unchanged. This is a frontend presentation and interaction phase.
</domain>

<decisions>
## Locked Decisions

### Scope and data authority

- **D-01:** Scope is exclusively the three Contribution families: Mitgetragene Projekte, Chronikpflege, and Bildarchivpflege.
- **D-02:** All existing backend/API/database/repository/counting/badge-code/earned/locked/member-attribution behavior is immutable; backend-projected `badge_progress` is the single source of truth.
- **D-03:** Mitgetragene Projekte retain thresholds 1/5/15 and the existing definition: the member must cover every relevant release version of an anime/fansub-group project with active own role credits.
- **D-04:** Chronikpflege retains thresholds 10/50/150 and counts published, non-deleted text/note contributions using the existing repository semantics.
- **D-05:** Bildarchivpflege retains thresholds 10/50/150 and counts non-deleted member-attributed release-version media using the existing repository semantics.
- **D-06:** Each family uses only its own metric; the UI must not imply a shared Contribution score.
- **D-07:** Below-Bronze and zero behavior follows the existing backend projection/resolver: all three families remain present, show real progress toward Bronze, and have no falsely earned tier.

### Outer family navigation

- **D-08:** The outer `FocalCarousel` remains and switches only among the three Contribution families in the canonical order Projects, Chronicle, Archivist.
- **D-09:** Preserve Prev/Next, visible-neighbor selection, Arrow keys, Home/End, swipe/drag, reduced motion, stable active card, controlled neighbor animation, and current Same-DOM behavior.
- **D-10:** Preserve the existing `Alle anzeigen` contract. Expanded mode shows all three families without carousel skeleton, peek, transform, or wide-hero grid leakage.
- **D-11:** Active family is dominant on desktop while neighbors remain meaningful orientation; inactive/active/expanded variants must not use separate component trees.
- **D-12:** Keep `FocalCarousel` generic and as unchanged as possible; Contribution-specific behavior belongs in profile components.

### Inner Stage and tier navigation

- **D-13:** Each family renders a responsive achievement Stage with hero artwork, title, current tier, real family-specific value, progressbar, percentage, next goal/remainder or terminal completion, and a three-tier artwork track.
- **D-14:** Family navigation and tier preview are independent states: outer `FocalCarousel` owns family selection; a local Stage state owns tier preview. They share no arrows, active state, snap system, or carousel engine.
- **D-15:** Bronze/Silver/Gold are visual Type C and must remain real artwork thumbnails; do not replace them with a text-only rank track.
- **D-16:** The inner tier track is an evenly distributed three-item tap/click row. It is not a `FocalCarousel` and must not add momentum, settle timers, wheel remapping, observers, or forced swipe navigation.
- **D-17:** Earlier earned tiers are selectable previews; the current tier is default; future locked tiers remain visible, visibly locked, unfocusable, and unselectable.
- **D-18:** Preview is local and non-persistent. It changes hero artwork/tier/status only; real count, progress, next goal, remainder, and completion remain authoritative and unchanged.
- **D-19:** Use exact statuses `Aktuell`, `Vorschau`, and `Gesperrt`; tier names are `Bronze`, `Silber`, and `Gold`. Do not add redundant threshold chips.
- **D-20:** Use family-specific copy and correct German: `mitgetragenes Projekt/mitgetragene Projekte`, `Chronikbeitrag/Chronikbeiträge`, `Medienbeitrag/Medienbeiträge`.

### Progress and terminal semantics

- **D-21:** Display real current value, current tier, next tier/threshold, remainder, percentage, or `Höchste Stufe erreicht` exactly from existing progress semantics; never invent a new formula.
- **D-22:** Progress percentage remains cumulative current value divided by the authoritative next threshold and visually capped at 100.
- **D-23:** At/above Gold, preserve the true visible value, render completed/full progress, and expose no artificial next threshold. Progressbar ARIA must remain internally valid while accessible copy retains the true value.
- **D-24:** Previewing an earlier earned tier at Gold must retain the true above-threshold count and completed progress.

### Artwork and geometry

- **D-25:** All nine active assets are locked to the central resolver mappings: Projects Bronze `-v3`, Silver/Gold `-v2`; Chronicle Bronze `-v4`, Silver/Gold `-v2`; Archivist Bronze/Silver/Gold `-v2`.
- **D-26:** Never reactivate older unversioned assets. Reuse the central artwork resolver for hero and thumbnails.
- **D-27:** Use stable square hero and thumbnail slots with contained artwork, no stretching, oval distortion, clipping, or breakpoint-dependent geometry. Diagnose asset/frame geometry before globally shrinking a hero.

### Touch, responsive layout, and accessibility

- **D-28:** Thumbnail tap selects only the tier. A drag starting on free card space remains outer-family navigation. Outer drag must not cause a thumbnail click; a thumbnail click must not change family.
- **D-29:** Preserve vertical page scrolling on touch. The inner three-item row has no competing horizontal gesture engine.
- **D-30:** Desktop uses a generous hero/info composition with visible neighbors and controlled maximum width. Mobile uses one stacked Stage with all three tiers visible. Tablet must preserve hero sizing, neighbor width, row readability, and stable card height.
- **D-31:** Required viewports are 390x844, 768x1024, 1024x768, 1440, 1920, and 2560 wide; no page overflow or visible native inner scrollbar is allowed.
- **D-32:** Outer carousel semantics, current family, keyboard, visible focus, and reduced motion remain accessible. Earned tiers are native buttons; current tier is semantically marked; locked tiers are static/unfocusable; state is never color-only.
- **D-33:** Progress ARIA uses the real metric and real target; terminal progress has no fabricated target.

### Architecture, reuse, and verification

- **D-34:** Continue decomposing `FamilyCollectionCard`; prefer small profile-local pieces such as `ContributionAchievementStage`, shared Stage hero/progress primitives, and `ContributionTierTrack` where actual Phase-123/124 reuse exists.
- **D-35:** Do not invent a universal badge framework or a Contribution-only duplicate engine. Shared primitives must remain domain-neutral enough for their actual profile consumers.
- **D-36:** Preserve Phase-123 Anime Project and Phase-124 Points Stage behavior and Phase-121 responsive/artwork/expanded contracts.
- **D-37:** Automated tests cover the exact PRD boundary values: Projects 0/1/4/5/14/15/20; Chronicle and Archivist 0/10/49/50/149/150/200.
- **D-38:** Validation must cover visibility, current/earned/locked, next/remainder/percent/complete, preview invariants, all nine assets, nested pointer controls, keyboard/reduced motion, expanded mode, responsive geometry, and existing public-profile visibility gating.
- **D-39:** Worktree changes in `MemberBadgeChain*`, `FocalCarousel*`, contribution PNGs, and ROADMAP are user-owned; use fresh diff audits and targeted patches, with no broad formatting or resets.
</decisions>

<canonical_refs>
## Canonical References

### Phase contract and research

- `.planning/phases/125-beitragsbadges-als-echtes-familien-carousel-mit-visuellen-st/125-PRD.md`
- `.planning/phases/125-beitragsbadges-als-echtes-familien-carousel-mit-visuellen-st/125-RESEARCH.md`
- `.planning/phases/125-beitragsbadges-als-echtes-familien-carousel-mit-visuellen-st/125-VALIDATION.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`

### Project contracts

- `AGENTS.md`
- `docs/engineering/implementation-contract.md`
- `docs/frontend/ui-system.md`
- `docs/agent-guidelines-ui.md`

### Contribution data/projection authority

- `backend/internal/repository/member_profile_contribution_badges_repository.go`
- `backend/internal/repository/member_profile_contribution_badges_repository_test.go`
- `backend/internal/repository/member_profile_progress_repository.go`
- `backend/internal/repository/member_profile_repository.go`
- `backend/internal/models/member_profile.go`
- `backend/internal/handlers/app_public_profile_test.go`
- `frontend/src/types/profile.ts`

### Frontend implementation seams

- `frontend/src/components/profile/MemberBadgeChain.tsx`
- `frontend/src/components/profile/MemberBadgeChain.module.css`
- `frontend/src/components/profile/MemberBadgeChain.test.tsx`
- `frontend/src/components/profile/memberBadgeLabels.ts`
- `frontend/src/components/profile/memberBadgeLabels.test.ts`
- `frontend/src/components/ui/FocalCarousel.tsx`
- `frontend/src/components/ui/FocalCarousel.module.css`
- `frontend/src/components/ui/FocalCarousel.test.tsx`

### Proven analogs

- Phase 121: `.planning/phases/121-rollen-badges-visuell-und-funktional-perfektionieren/121-CONTEXT.md`, `121-RESEARCH.md`, `121-VALIDATION.md`, `121-VERIFICATION.md`; role Stage and expanded-mode seams in `MemberBadgeChain*`.
- Phase 123: the current `AnimeProjectAchievementStage` implementation/tests/styles in `MemberBadgeChain.tsx`, `MemberBadgeChain.module.css`, and `MemberBadgeChain.test.tsx` (no Phase-123 artifact directory is present in the canonical tree).
- Phase 124: `.planning/phases/124-punkte-meilensteine-als-responsive-single-family-achievement/124-CONTEXT.md`, `124-RESEARCH.md`, `124-VALIDATION.md`, `124-VERIFICATION.md`; `PointsAchievementStage` in `MemberBadgeChain*`.
- Contribution baseline: Phase-113 repository comments/tests and the current contribution family definitions/resolver in `memberBadgeLabels.ts`.
</canonical_refs>

<specifics>
## Specifics

- Family order: Mitgetragene Projekte -> Chronikpflege -> Bildarchivpflege.
- Assets: all nine current files are 1254x1254 RGBA PNGs and already have explicit resolver entries.
- Zero state is resolved, not discretionary: `badge_progress` always contains the three family rows, so the carousel remains three-family at zero.
- Terminal state is resolved, not discretionary: backend sends `complete=true` with null next fields and the real count.
- `Alle anzeigen` remains because the current collection consumer exposes it and the PRD forbids silent removal.
- Shared `FocalCarousel` currently excludes nested native controls from neighbor activation, suppresses post-drag clicks, and abandons horizontal capture when vertical intent dominates; tests must preserve these seams.
- Live UAT uses the visible public-member route through `http://127.0.0.1:3300`.
</specifics>

<deferred>
## Deferred Ideas (OUT OF SCOPE)

- Future-tier preview or selectable locked tiers.
- A universal badge/achievement framework.
- A second carousel/swipe engine for tier selection.
- Backend/API/database/schema/counting/threshold changes.
- Asset redesign, unversioned-asset cleanup, or unrelated badge-family redesign.
- Any change to Anime Project, Points, Role, Membership, or Special badge product behavior beyond regression-preserving shared extraction.
</deferred>
