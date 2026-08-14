# Phase 133: Responsive, Accessible & Efficient Visual Delivery - Context

**Gathered:** 2026-08-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 133 makes the final public-profile composition compact, readable, keyboard-operable,
and bandwidth-conscious from narrow containers through widescreen and 400% zoom. It is the
dedicated VISUAL/responsive/accessibility/image phase: container-responsive components,
bounded per-component CSS-module ownership, removal of conflicting selectors and patches,
WCAG 2.2 AA conformance with evidence, and optimized profile/badge image delivery with fixed
asset/transfer budgets.

This phase is presentation only. It does NOT change the DTO/contract (Phase 130), pagination
or query budgets (Phase 131), or the composition/state architecture (Phase 132) - it styles
and hardens the components those phases produce. The bundled clean-state live UAT is Phase 134.
A separate `/gsd:ui-phase 133` (UI-SPEC.md) may provide the visual design contract.

</domain>

<decisions>
## Implementation Decisions

### Responsive strategy (PMUI-01, PMUI-02, PMUI-03, PMUI-06)
- **D-01 (Container-queries-first):** Reusable components (hero, badges, membership, project/
  contribution cards) respond to CONTAINER geometry (container-type + @container), not
  device-specific viewport breakpoints. @container is already used in several profile modules -
  extend that, do not add device breakpoints to reusable components.
- **D-02 (Purpose-based page transitions only):** Page-level composition uses only a small set
  of purpose-based viewport transitions (e.g. one-column -> two-column when space allows), never
  device-targeted breakpoint patches (PMUI-02).
- **D-03 (Mobile-first, overflow-safe, zoom-usable):** Mobile-first base styles; no
  document-level horizontal overflow (min-width:0 on flex/grid children, overflow-x guards);
  usable at 400% zoom and with long German text + correct umlauts (rem-based, wrapping, no fixed
  px text heights) (PMUI-06).

### CSS-module hygiene & refactor scope (PMUI-04, PMUI-05, PMUI-07)
- **D-04 (Bounded, thorough re-slice):** Split oversized profile CSS - notably
  MemberBadgeChain.module.css (2282 lines) - along component boundaries into clearly-owned
  modules each <=450 lines (CLAUDE.md limit). Rule: each component OWNS its module; no
  cross-component descendant rules.
- **D-05 (Remove debt):** Remove conflicting/duplicate selectors, broad descendant selectors,
  breakpoint patches, redundant media queries, and unnecessary resize listeners; !important only
  as a justified exception (today MemberBadgeChain.module.css carries 4) (PMUI-05, PMUI-07).
- **D-06 (Regression guard - deviates from bundled-UAT default):** Because CSS regressions are
  hard to catch automatically, this phase adds per-section VISUAL spot-checks (narrow /
  intermediate / wide / 400% zoom) alongside the unit tests - not only the bundled Phase-134 UAT.
  Authoritative sign-off still rides the Phase-134 bundle (milestone V-02).

### Image delivery & budgets (PMPF-06, PMPF-08)
- **D-07 (next/image discipline via ResponsiveImage):** Keep next/image through the existing
  ResponsiveImage wrapper. Request suitable variants with TRUTHFUL sizes matched to the
  container-query layout (D-01), reserve geometry (width/height or aspect-ratio -> no CLS), and
  bound quality. Sources are compressed.
- **D-08 (Measurement-anchored budgets):** Fixed asset/transfer budgets are set from a real
  baseline measured on both seed profiles via frontend/scripts/verify-profile-image-delivery.mjs
  (baseline + margin, plus absolute per-image KB ceilings, e.g. avatar variant <= X KB, no image
  over Y KB) - consistent with the Phase-131 budget method.
- **D-09 (Config guards):** next.config.mjs keeps the localPatterns allow-list correct - /media/**
  MUST stay allowed or the page hard-crashes (E426); local-IP image optimization is restricted to
  development/test only (PMPF-08).

### Accessibility target & evidence (PMA11Y-01..04)
- **D-10 (WCAG 2.2 AA):** Conformance target is WCAG 2.2 AA - including target size >= 24px
  (2.5.8), visible focus appearance (2.4.11), focus not obscured, adequate contrast, respected
  prefers-reduced-motion, and logical DOM order. AAA is out of scope (disproportionate).
- **D-11 (Controls & headings):** Semantic single-h1 heading hierarchy with no skips (PMA11Y-01).
  The Phase-132 controls (shared hook + carousel/paging/preview/disclosure) get full keyboard
  operability, visible focus, correct accessible names, aria-expanded/aria-controls, and
  aria-live status on continuation loads (PMA11Y-02/03).
- **D-12 (Combined evidence):** Conformance is proven by automated axe checks in tests PLUS a
  manual pass (keyboard-only, 400% zoom, screen-reader spot-check). Authoritative live proof is
  the Phase-134 UAT.

### Claude's Discretion
- Exact module split boundaries/names for the re-sliced CSS, provided each is <=450 lines and
  component-owned.
- Concrete container-query breakpoints and the small set of page viewport transitions.
- Exact sizes strings, quality values, and the final KB budget numbers (pending measurement).
- Which axe integration and manual-check checklist format to use.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope, requirements, and prior decisions
- .planning/PROJECT.md - v1.3 goal; global UI-primitives + design-token mandate; umlaut rule.
- .planning/ROADMAP.md - Phase 133 goal, deliverables, success criteria, downstream separation.
- .planning/REQUIREMENTS.md - locked Phase 133 requirements PMPF-06, PMPF-08, PMUI-01..07, PMA11Y-01..04.
- .planning/phases/132-shared-ssr-composition-race-safe-frontend-state/132-CONTEXT.md - the controls (carousel/paging/preview/disclosure) that inherit a11y treatment here.
- .planning/phases/131-set-based-delivery-pagination-performance-budgets/131-CONTEXT.md - the budget method (baseline + margin + absolute ceilings) D-08 mirrors.

### UI system & style/image seams (Plan-time read first, from ROADMAP)
- docs/frontend/ui-system.md - global primitives + tokens (reuse before adding local styles).
- docs/agent-guidelines-ui.md - UI engineering guidelines.
- frontend/src/app/members/[slug]/page.module.css (262 lines) - page geometry.
- frontend/src/components/profile/profile.module.css (680 lines) - shared profile styles.
- frontend/src/components/profile/MemberBadgeChain.module.css (2282 lines, 4 !important) - primary split target (D-04/D-05).
- profile-owned CSS modules (LatestContributionsSection, MemberCurrentProjectsSection, etc.) and their tests.
- frontend/src/components/ui/FocalCarousel.tsx + FocalCarousel.module.css (199 lines) - carousel a11y (PMA11Y-02).
- frontend/src/components/ui/ResponsiveImage.tsx - image wrapper (D-07).
- frontend/next.config.mjs - image config + localPatterns allow-list (D-09).
- frontend/scripts/verify-profile-image-delivery.mjs - image evidence harness (D-08).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- @container is already used in profile.module.css, page.module.css, MemberBadgeChain.module.css,
  LatestContributionsSection.module.css - the container-first direction (D-01) is started, not new.
- ResponsiveImage.tsx + verify-profile-image-delivery.mjs already exist - extend, do not replace.
- FocalCarousel is a shared ui primitive - its a11y hardening lands in the primitive, not per-use.
- Global @/components/ui primitives + design tokens are mandated project-wide.

### Established Patterns
- CSS Modules with colocated tests; recent history shows many carousel/badge/responsive
  quick-fix commits -> the debt D-04/D-05 target.
- next/image with a strict localPatterns allow-list (memory: missing /media/** -> E426 crash).

### Integration Points / Known Gaps to Fix
- MemberBadgeChain.module.css at 2282 lines violates the 450-line limit and concentrates the
  broad-selector/!important debt (D-04/D-05).
- Relative-date + progressive-disclosure controls from Phase 132 need visible focus / aria state
  here (D-11).
- Image geometry must be reserved to avoid CLS on avatar/badge/media (D-07).

</code_context>

<specifics>
## Specific Ideas

- Concrete debt: MemberBadgeChain.module.css = 2282 lines, 4 !important; @container already in use.
- Concrete image seams: ResponsiveImage.tsx (882B wrapper), verify-profile-image-delivery.mjs
  (evidence), next.config.mjs (localPatterns + local-IP optimization gate).
- WCAG 2.2 AA new criteria in scope: target size >= 24px (2.5.8), focus appearance (2.4.11),
  focus not obscured (2.4.11/2.4.12).

</specifics>

<deferred>
## Deferred Ideas

- Data/contract/state changes are out of scope - Phases 130/131/132 own those; 133 only styles
  and hardens their output.
- The formal visual design contract (UI-SPEC.md) is a separate optional `/gsd:ui-phase 133`.
- The versioned fixture contract, migration up/down/fresh proof, and the authoritative bundled
  responsive live UAT are Phase 134.

</deferred>

---

*Phase: 133-responsive-accessible-efficient-visual-delivery*
*Context gathered: 2026-08-14*
