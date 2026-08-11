# Phase 126: Mitgliedschaftsbadges fachlich trennen und als responsive Membership Stage darstellen - Context

**Gathered:** 2026-08-11
**Status:** Ready for planning
**Source:** PRD Express Path (`126-PRD.md`)

<domain>
## Phase Boundary

Phase 126 changes only the presentation of membership badges on the public member profile. It separates the independent historical `founding_member` achievement from the duration progression `long_term_member` → `membership_7_years` → `membership_10_years`, using the existing profile-local achievement-stage foundations. Backend, API, database, badge codes, thresholds, active asset selection, and the general `FocalCarousel` architecture remain unchanged.

</domain>

<decisions>
## Implementation Decisions

Everything in `126-PRD.md` is locked. The following decision index gives every numbered PRD section an explicit planning handle.

- **D-01 (§1):** Phase 126 is membership-only; `founding_member` is not a chronological predecessor of 5/7/10 years.
- **D-02 (§2):** Render one membership section containing an independent duration progression and an optional, separately presented founding achievement.
- **D-03 (§3):** Preserve all existing backend badge codes, thresholds, derivation, APIs, and database structures.
- **D-04 (§4):** Preserve founding-year eligibility and 5/7/10-year semantics; verify current implementation before planning.
- **D-05 (§5):** Membership duration is the longest single historical group membership, never a client-side sum across memberships.
- **D-06 (§6):** Remove the outer membership `FocalCarousel`, including its arrows, counter, drag, and carousel shell semantics.
- **D-07 (§7):** Replace it with one responsive Membership Stage built from the existing Stage shell/hero/info/progress/track patterns.
- **D-08 (§8):** Never draw or imply a progression edge between founding status and 5 years.
- **D-09 (§9):** Desktop uses a wide Stage: duration hero left, facts/progress right, 5/7/10 track below, founding in a clearly separate panel.
- **D-10 (§10):** Mobile stacks the same hierarchy without an outer carousel or horizontal primary navigation.
- **D-11 (§11):** When founding is absent, omit its card entirely and show only duration content.
- **D-12 (§12):** Founder-under-5 is valid: show the founding panel and an independently locked duration track with the real year count/remainder.
- **D-13 (§13):** Preserve the existing product visibility for zero/<5 years; do not silently invent a new show/hide rule.
- **D-14 (§14):** Duration progression contains exactly 5, 7, and 10 years with earned/current/locked states.
- **D-15 (§15):** Show current duration label, actual years, interval progress, and correct remainder; terminal state says the highest level is reached.
- **D-16 (§16):** Use authoritative existing membership progress semantics; do not calculate naïvely as `memberYears / 10`; keep ARIA values correct.
- **D-17 (§17):** Always display the real duration above the maximum; never replace 24 years with “10 / 10”.
- **D-18 (§18):** Membership is visual type C; all four distinct artworks remain visible as meaningful imagery.
- **D-19 (§19):** Use the central active asset resolver; do not introduce filename lookups at render call sites.
- **D-20 (§20):** Use stable square hero/thumbnail slots, preserve aspect ratios, avoid stretching/cropping/ovalization, and prefer `object-fit: contain` where appropriate.
- **D-21 (§21):** Duration hero defaults to the current earned duration stage; for no earned duration stage, preserve current behavior and create no new illustration.
- **D-22 (§22):** Earlier earned duration stages may preview in the hero; locked stages remain noninteractive; actual duration/progress never changes during preview.
- **D-23 (§23):** Founding is never a duration-track selection or `selectedCode` and has no connecting line to 5 years.
- **D-24 (§24):** Keep founding inside “Mitgliedschaft” under “Besondere Mitgliedschaft”; do not move it to the later special-badge phase.
- **D-25 (§25):** Never render the same founding badge again in the special-badge grid.
- **D-26 (§26):** Reuse Phase 123–125 Stage foundations; add only membership-local components such as `MembershipStage`, `MembershipDurationTrack`, and `FoundingMemberPanel`; no universal badge engine.
- **D-27 (§27):** Split the membership family only in the presentation layer into `founding` and `duration`; backend model and codes stay unchanged.
- **D-28 (§28):** Thresholds and earned rules remain single-source; presentation metadata may be added, but domain logic must not be duplicated in `MemberBadgeChain.tsx`.
- **D-29 (§29):** Wide desktop uses the established visual content width, balanced artwork/information, track below, and a clearly secondary founding region.
- **D-30 (§30):** Mobile preserves the same semantic hierarchy, has no page overflow, and avoids unnecessary horizontal scrolling.
- **D-31 (§31):** Show all three duration thumbnails together where possible; no second carousel, wheel, momentum, settle timer, or centering `ResizeObserver`.
- **D-32 (§32):** Desktop track is compact and subordinate to the hero.
- **D-33 (§33):** At 390 px all three duration stages should remain visible by reducing thumbnail/label size rather than adding horizontal scrolling.
- **D-34 (§34):** Mark current duration semantically (`aria-current`); earned preview controls are buttons; locked items are unfocusable; progressbar values are correct; founding has no progress semantics; state is not color-only.
- **D-35 (§35):** Automated behavior coverage includes 0, 1, 4, 5, 6, 7, 8, 9, 10, 11, and 24 years.
- **D-36 (§36):** Cover founder/non-founder independently at 3, 6, and 24 years, proving no false ordering or duplication.
- **D-37 (§37):** Test multiple historical memberships and preserve longest-single-membership semantics without client recomputation.
- **D-38 (§38):** Preserve current membership Stage visibility when founder is absent and duration is below 5; any product change requires an explicit UAT decision.
- **D-39 (§39):** Tests prove membership has no outer `FocalCarousel`, arrows, counter, quiet mode, or outer drag.
- **D-40 (§40):** Tests prove founding is excluded from duration; duration contains exactly the three locked codes.
- **D-41 (§41):** Duration order is exactly 5 → 7 → 10.
- **D-42 (§42):** At 10+ years, 5 and 7 are previewable, 10 is current, true years remain visible, and `complete` remains true.
- **D-43 (§43):** At 6 years, 5 is current and 7/10 are locked, unfocusable, and unselectable.
- **D-44 (§44):** At 10, 24, and 50 years, 10 is current, true duration is visible, highest-stage copy is shown, and no next threshold exists.
- **D-45 (§45):** Verify all four active membership assets without changing active versions.
- **D-46 (§46):** Verify stable square slots, no aspect distortion, no dynamic real-size changes, and no unintended crop.
- **D-47 (§47):** Keep Phase 121 roles, Phase 123 anime projects, Phase 124 points, Phase 125 contributions, `FocalCarousel`, `FansubProjectsGrid`, public profile, and `memberBadgeLabels` regressions green.
- **D-48 (§48):** Live UAT covers founder/non-founder, 5/7/10+, much greater than 10 years, and earlier-stage preview.
- **D-49 (§49):** Responsive UAT viewports are 390×844, 768×1024, 1024×768, 1440×900, 1920×1080, and 2560×1440.
- **D-50 (§50):** Produce the six viewport screenshots plus `membership-founding.png`, `membership-non-founder.png`, `membership-preview.png`, and `membership-max.png`.
- **D-51 (§51):** Do not add any carousel/scroll/momentum/wheel/settle interaction engine.
- **D-52 (§52):** Derive from existing badge data, progress, family resolvers, and years; any proven missing backend value must be separately documented and is not silently added here.
- **D-53 (§53):** Do not pull historical leadership, all-rounder, or verified special-badge grid work into this phase.
- **D-54 (§54):** Capture and preserve the dirty tree and Phase 121/123/124/125 work; never reset or overwrite foreign uncommitted changes.
- **D-55 (§55):** Do not change roles, anime projects, points, contributions, special awards, non-badge roles, backend, API, DB, credit/ledger, `FocalCarousel` architecture, profile editor, or history-event badges.
- **D-56 (§56):** Completion requires all functional, architecture, duration, founding, desktop/mobile, artwork, and shared-regression criteria listed in the PRD.
- **D-57 (§57):** Stop after technical verification and present the seven required live views; await literal `approved` or concrete feedback before formal completion.
- **D-58 (§58):** Only after approval, produce the exact 21-section copyable Markdown report and answer the five explicit quality questions.

### the agent's Discretion

- Exact profile-local component split and CSS class names, provided they reuse established Stage seams and do not create a universal engine.
- Whether the separate founding panel precedes or follows duration on mobile, based on visual UAT.
- Exact non-domain decorative styling within existing tokens and established Phase 121–125 visual language.

</decisions>

<canonical_refs>
## Canonical References

### Phase source and predecessor contracts
- `.planning/phases/126-mitgliedschaftsbadges-fachlich-trennen-responsive-membership-stage/126-PRD.md` — complete locked product/UI/test contract.
- `.planning/phases/121-rollen-badges-visuell-und-funktional-perfektionieren/121-CONTEXT.md` — responsive artwork and role-stage baseline.
- `.planning/phases/124-punkte-meilensteine-als-responsive-single-family-achievement/124-CONTEXT.md` — single-family Stage and preview contract; also documents the in-tree Phase-123 seam.
- `.planning/phases/125-beitragsbadges-als-echtes-familien-carousel-mit-visuellen-st/125-CONTEXT.md` — contribution family/stage boundary and dirty-tree protection.

### Project contracts
- `AGENTS.md` — canonical environment, UI, validation, dirty-tree, and scope rules.
- `docs/engineering/implementation-contract.md` — search-first/reuse and plan `read_first` rules.
- `docs/frontend/ui-system.md` — global tokens/components and domain-local UI boundary.
- `docs/agent-guidelines-ui.md` — responsive/accessibility UI implementation guidance.

### Runtime authority and direct analogs
- `backend/internal/repository/member_profile_progress_repository.go` — authoritative membership-year projection and 5/7/10 thresholds; read-only in this phase.
- `backend/internal/services/badge_service.go` — founder and duration badge derivation; read-only in this phase.
- `frontend/src/components/profile/memberBadgeLabels.ts` — family resolver and membership presentation seam.
- `frontend/src/components/profile/MemberBadgeChain.tsx` — current Stage implementations and group-routing seam.
- `frontend/src/components/profile/MemberBadgeChain.module.css` — Stage geometry and responsive composition.
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` — shared/profile regression owner.

</canonical_refs>

<specifics>
## Specific Ideas

- Target presentation shape: `membershipPresentation.founding` plus `membershipPresentation.duration` (5/7/10), without changing the public DTO.
- Prefer a profile-local `MembershipStage` with a `MembershipDurationTrack` and optional `FoundingMemberPanel`.
- Use stable square `contain` slots for the four different silhouettes.
- Use tap/click preview only for earlier earned duration stages; no swipe engine is needed for three visible milestones.

</specifics>

<deferred>
## Deferred Ideas

- Special-award grid redesign for historical leadership, all-rounder, and verified.
- Any backend/API/database/DTO extension.
- Any general `FocalCarousel` change or new badge/Stage engine.
- Any product change to membership visibility for zero/<5-year non-founders unless explicitly approved during UAT.

</deferred>

---

*Phase: 126-mitgliedschaftsbadges-fachlich-trennen-responsive-membership-stage*
*Context gathered: 2026-08-11 via PRD Express Path*
