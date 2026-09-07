# UI-SPEC Review — Phase 151

## UI-SPEC VERIFIED

**Phase:** 151 — Erfolgsbadge-/Karussell-Konsolidierung
**Status:** APPROVED

| Dimension | Verdict | Evidence |
|---|---|---|
| 1 Copywriting | PASS | No new CTA or product copy is introduced. Existing German copy, scoped empty/error states, explicit `Gesperrt` labeling, control names, and actionable accessibility semantics are preserved. No destructive action exists. |
| 2 Visuals | PASS | Primary artwork is the declared focal point. Card hierarchy, shared hero/marker slots, historical-pill placement, centered contain treatment, and active/inactive visual distinctions are explicit and implementable. |
| 3 Color | PASS | The 60/30/10 contract is explicit. Cobalt is limited to focus/primary action, Wine to the established accent rule, and semantic state tokens retain their existing purposes; tier frames are not misused as state colors. |
| 4 Typography | PASS | Exactly four sizes (14/16/20/28 px), two weights (400/600), and body/heading line heights (1.5/1.2) form a constrained hierarchy. |
| 5 Spacing | PASS | The declared scale is restricted to 4/8/16/24/32/48/64 px. The artwork inset is fixed at 8 px, while the 560/656 px transitions include explicit geometry rationale. |
| 6 Registry Safety | PASS | No third-party registry or new component source is proposed. The contract requires existing Team4s tokens and global `Card`, `Badge`, `Button`, state, and focus patterns. |

## Explicit constraint verification

- Hero containers are fixed to 192/216/240 px by container width; 240 px is the absolute maximum. Stage markers are 64/80 px with an 80 px maximum.
- The backend constant-20 public-profile query strategy and SQL/runtime contracts remain unchanged.
- Source artwork bytes, intrinsic resolution, aspect ratio, and transparent padding are preserved; CSS alone controls presentation.
- Active, inactive, locked, and preview states retain identical outer geometry. Active-state scale/translation and neighboring-card pumping are forbidden.
- The complete artwork gate requires signed row-by-row production-composition evidence across every role, tier, special, historical, milestone, viewport, and active/inactive state; sampling cannot pass.
- Work and verification remain Linux-only under `/home/d1sk/team4s`.

### Recommendations

No recommendations.

### Ready for Planning

UI-SPEC approved. Planner can use it as design context.

## Coordinator visual revision (2026-09-07)
The static review above missed a live portrait overflow. Linux screenshots at390/1440 showed the image exceeding its 192/240px slot. Corrected the prototype grid to explicit minmax(0,1fr) tracks and zero intrinsic image minima; added image-inside-slot assertions to the contract. Included the card's2px border in geometry, shifting transitions to562/658px and boundary checks561/562/657/658. Removed an unrequested typography redesign from the contract: existing consumer sizes, weights and line heights are preserved. The prototype demonstrates geometry only; its sample text styling is not a product redesign mandate. Revised live checks and screenshots are required before executing UI changes.

**Revision verification: PASS.** Fresh Linux Chromium at320/390/1440: all contained image rectangles stay at least8px inside their192/240px slots; no document overflow. Embedded container561 ->192px single column,562 ->216px +288px copy,657 ->216px +383px copy,658 ->240px +360px copy, with no stage overflow at any boundary. Evidence: `evidence/prototype-check.json`, revised `evidence/prototype-390.png` and `evidence/prototype-1440.png`. Coordinator visually identified the original portrait gap and checked the fixed browser geometry; the revised contract is ready for planning.
