# Phase 127: Besondere Auszeichnungen kompakt in den bestehenden Member-Header integrieren - Context

**Gathered:** 2026-08-11
**Status:** Ready for planning
**Source:** PRD Express Path (`127-PRD.md`)

<domain>
## Phase Boundary

Phase 127 is a presentation-only change on the public member profile: integrate the earned standalone specials `historical_leader` and `all_rounder` into the existing member hero, retain the existing single Verified status, keep `founding_member` solely in Membership, and stop rendering the old separate Special section. No application behavior outside the public profile composition is in scope.
</domain>

<decisions>
## Implementation Decisions

Everything below is locked from PRD sections 1–49.

- **D-01 (§1):** Integrate special awards compactly into the existing member header.
- **D-02 (§2):** Preserve the current header as the binding visual and DOM foundation; do not redesign it.
- **D-03 (§3):** Place specials beside/under the existing identity/status content inside the hero copy, not in a new page section.
- **D-04 (§4):** Never derive or render a second Verified badge from `public_badges`.
- **D-05 (§5):** The new header special area initially admits only `historical_leader` and `all_rounder`.
- **D-06 (§6):** `founding_member` stays exclusively in the Membership Stage.
- **D-07 (§7):** Roles without a badge system remain separate from this special area.
- **D-08 (§8):** Use compact artwork-plus-label items, never large cards.
- **D-09 (§9):** Desktop keeps identity readable while specials form a compact adjacent/secondary cluster.
- **D-10 (§10):** Mobile stacks/wraps without horizontal overflow or clipped artwork.
- **D-11 (§11):** Tablet uses the same responsive composition without a separate interaction model.
- **D-12 (§12):** Use one normalized square artwork/icon slot for both specials.
- **D-13 (§13):** Historical Leader uses the existing approved artwork and central resolver.
- **D-14 (§14):** Allrounder uses its existing icon fallback unless an already-approved asset is found; no new asset generation.
- **D-15 (§15):** Specials have no thresholds, progress, current/locked or tier semantics.
- **D-16 (§16):** Specials have no carousel, arrows, drag, counter or expand semantics.
- **D-17 (§17):** Remove the old separately rendered Special badge section.
- **D-18 (§18):** Historical Leader and Allrounder each render once; Verified once; Founding once in Membership.
- **D-19 (§19):** Render no special wrapper or spacing when neither special is earned.
- **D-20 (§20):** With one special, render one compact item without an empty second slot.
- **D-21 (§21):** With both specials, render both in deterministic catalog order.
- **D-22 (§22):** Implement catalog-based allow-list filtering so future specials require an explicit decision.
- **D-23 (§23):** Do not materially increase the header height.
- **D-24 (§24):** Preserve visibility and impact of the header background image.
- **D-25 (§25):** Provide sufficient contrast over every background state.
- **D-26 (§26):** Read and extend the current header component/CSS before coding.
- **D-27 (§27):** Reuse `profile.public_badges` already loaded by the SSR member-page request; do not add a fetch.
- **D-28 (§28):** A small profile-local component is allowed only if it reduces duplication and remains presentational.
- **D-29 (§29):** Filter through the existing badge catalog/presentation map, not string heuristics scattered in JSX.
- **D-30 (§30):** Provide meaningful accessible names, decorative-image handling, stable reading order and visible focus only where interactive.
- **D-31 (§31):** Test the no-special header case.
- **D-32 (§32):** Test Historical Leader alone, including approved artwork resolution.
- **D-33 (§33):** Test Allrounder alone, including icon fallback/normalized slot.
- **D-34 (§34):** Test Verified remains exactly once.
- **D-35 (§35):** Test Founding remains absent from the header and present only in Membership.
- **D-36 (§36):** Test no/one/both specials and mixed Verified/Founding combinations.
- **D-37 (§37):** Add responsive contract coverage for desktop, tablet and mobile wrapping/overflow.
- **D-38 (§38):** Live mobile UAT must verify compactness, order, labels and no overflow.
- **D-39 (§39):** Live desktop UAT must verify balance, background visibility and unchanged identity priority.
- **D-40 (§40):** Persist named evidence for required states/viewports.
- **D-41 (§41):** Assert the old separate Special section is absent from the rendered page.
- **D-42 (§42):** Roles, projects, points, contributions and membership presentation remain unchanged.
- **D-43 (§43):** Run focused and shared regressions for Phase 121–126 seams.
- **D-44 (§44):** Backend, API, DB, contracts, DTOs and runtime data stay unchanged.
- **D-45 (§45):** Preserve all dirty work; isolate Phase 127 deterministically from Phase 126's uncommitted TSX/CSS and other overlap.
- **D-46 (§46):** No FocalCarousel change, new fetch, new endpoint, schema/data migration, new achievement system or broad hero redesign.
- **D-47 (§47):** All Header, Verified, Membership, Specials, Responsive, Technik and Regression acceptance criteria are mandatory.
- **D-48 (§48):** Stop at a human UAT checkpoint showing desktop, mobile, one, none, Verified once and no old special section.
- **D-49 (§49):** Only after approval write the exact 21-section evidence-backed report and answer all five quality questions.

### the agent's Discretion
- Exact local component name and class names, provided the component remains profile-local and presentational.
- Exact CSS grid/flex values within the locked compact/header-height/contrast/responsive constraints.
- Exact deterministic order between Historical Leader and Allrounder; recommendation: catalog order.

</decisions>

<canonical_refs>
## Canonical References

- `AGENTS.md` — hard environment, UI, validation and dirty-worktree rules.
- `docs/engineering/implementation-contract.md` — search-first and reuse contract.
- `docs/frontend/ui-system.md` — global/local UI boundary and token rules.
- `docs/agent-guidelines-ui.md` — responsive/accessibility implementation rules.
- `frontend/src/app/members/[slug]/page.tsx` — authoritative SSR data flow and hero/chain composition.
- `frontend/src/components/profile/MemberProfileHero.tsx` — exact header DOM seam and current Verified render.
- `frontend/src/components/profile/profile.module.css` — exact hero layout, backdrop/contrast and breakpoints.
- `frontend/src/components/profile/MemberBadgeChain.tsx` — central artwork resolver and old Special render seam.
- `frontend/src/components/profile/memberBadgeLabels.ts` — catalog/group classification and special-family projection.
- `.planning/phases/121-rollen-badges-visuell-und-funktional-perfektionieren/121-VERIFICATION.md` — role regressions.
- `.planning/phases/124-punkte-meilensteine-als-responsive-single-family-achievement/124-VALIDATION.md` — point-stage regressions.
- `.planning/phases/125-beitragsbadges-als-echtes-familien-carousel-mit-visuellen-st/125-UAT.md` — unresolved predecessor evidence/regressions.
- `.planning/phases/126-mitgliedschaftsbadges-fachlich-trennen-responsive-membership-stage/126-UAT.md` — current dirty overlap and evidence limitations.
</canonical_refs>

<specifics>
## Specific Ideas

Recommended DOM: pass already-derived `publicBadges` into `MemberProfileHero`; a profile-local `MemberSpecialAwards` renders a noninteractive list after the title/status row, filtering exact approved codes and using the existing presentation/artwork resolver seam. Keep Verified in `heroTitleRow`; do not represent it as a special item.
</specifics>

<deferred>
## Deferred Ideas

All items excluded by PRD §46 remain out of scope: new special types, a new Allrounder asset, backend/API/DB/DTO changes, FocalCarousel changes, new fetches, progress/carousel semantics, Membership relocation and broad hero redesign.
</deferred>

---
*Phase: 127-besondere-auszeichnungen-kompakt-in-bestehenden-member-header-integrieren*
*Context gathered: 2026-08-11 via PRD Express Path*
