---
phase: 151-erfolgsbadge-karussell-konsolidierung
status: verified
type: ui-contract
prototype: 151-PROTOTYPE.html
sources:
  - 151-CONTEXT.md
  - 151-RESEARCH.md
  - 151-BASELINE-CHECKS.md
  - 151-SOURCE-ARTWORK-REVIEW.md
---

# Phase 151 UI-SPEC — Erfolgsbadge-/Karussell-Konsolidierung

## 1. Scope and invariant

This phase consolidates the existing public member achievement presentation; it does not create a new page or redesign the profile. Preserve the current section order, German titles, copy semantics, card hierarchy, carousel controls, historical hero pill and Team4s token language exactly. The prototype is a geometry reference only.

- Keep the backend threshold registry authoritative and consume `badge_progress[].stages`.
- Keep the existing constant-20 public-profile query strategy. Backend query optimization is explicitly out of scope.
- Add no endpoint, DTO, fetch, permission, auth, schema, upload or runtime contract.
- Preserve full carousel mount, `inert` inactive slides, expansion behavior and current interaction semantics.
- Preserve every source image byte and intrinsic resolution; presentation CSS alone controls rendered size.

## 2. Visual system

Use existing `globals.css` tokens and global `Card`, `Badge`, `Button`, state and focus patterns. Achievement-specific composition stays under `components/profile`; it must not create a parallel generic card or button language.

| Contract | Exact use |
|---|---|
| Spacing | 4, 8, 16, 24, 32, 48, 64 px only; artwork slot padding is always 8 px |
| Type sizes | Preserve the existing product typography at each consumer; the shared artwork component introduces no text-size rules |
| Weights | Preserve existing product weights and display-art lettering inside PNGs; no typography redesign |
| Line height | Preserve existing consumer line heights |
| 60% surface | Existing page/background token; no new theme surface |
| 30% surface | Existing cool-blue card/nested-card tokens |
| 10% accent | Existing Cobalt for focus/primary action and Wine for the established accent rule only |
| State color | Existing semantic success/warning/danger tokens; tier frames are artwork, not status colors |
| Radius/shadow | Existing profile achievement card values; no phase-local elevation tier |
| Focus | Existing visible focus ring; never hidden by carousel clipping |

## 3. Shared artwork slot

One domain component owns all primary achievement art. Roles, points, membership, contribution, progress and historical portrait use the same square outer slot and the same 8 px inner padding.

| Available component width | Hero slot | Stage marker | Composition |
|---:|---:|---:|---|
| `< 562px` | 192 × 192 px | 64 × 64 px | art above copy |
| `562–657px` | 216 × 216 px | 80 × 80 px | art beside copy |
| `>= 658px` | 240 × 240 px absolute max | 80 × 80 px absolute max | art beside copy |

The 562 px transition is the first geometry that fits 32 px outer padding + 2 px border + 216 px art + 24 px gap + 288 px readable copy. The 658 px transition fits 32 + 2 + 240 + 24 + 360. These are named container transitions (`slot-with-copy`, `slot-roomy`), not device breakpoints.

- Establish `container-type: inline-size` at the reusable achievement stage/card owner.
- Use `inline-size` and `block-size` from the shared slot; family CSS must not override either dimension.
- Slot and marker use `display:grid; grid-template-columns:minmax(0,1fr); grid-template-rows:minmax(0,1fr); place-items:center; flex:none; box-sizing:border-box`. Images/layers require `min-inline-size:0; min-block-size:0` so intrinsic portrait dimensions cannot enlarge the grid track.
- Browser verification must assert each contained image rectangle stays within the padded slot, not merely that the outer slot has the expected size.
- Every image/layer uses `max-inline-size:100%`, `max-block-size:100%`, `object-fit:contain` and centered positioning.
- Direct and layered artwork share the same content box. Layering must not change layout geometry.
- The portrait special remains contained in the same square slot; its intrinsic 2:3 ratio and transparent padding remain untouched.
- Optical corrections may only be a documented inner-layer inset inside the 8 px content box; never enlarge the outer slot.
- `sizes` must match 192/216/240 px CSS geometry; delete the universal 248/280/320 hint.
- No viewport at 1440, 1600, 1920, 2100 or 2560 may grow hero art past 240 px.

## 4. Stable card and carousel geometry

Active, inactive, locked and preview states use identical outer card, hero-slot and marker dimensions. Active emphasis is border, opacity/filter and existing focus treatment only.

- Do not scale or translate the active card/artwork; no neighboring-card “pumping”.
- Inactive art remains fully mounted, optically quieter, and never smaller than active art.
- Preserve canonical `FocalCarousel`: 210 ms adjacent motion and 120 ms free-scroll settle.
- Direct/non-adjacent navigation and reduced-motion navigation settle immediately.
- Preserve pointer drag, horizontal wheel/trackpad, vertical page-scroll ownership, buttons and keyboard navigation.
- Side-by-side hero + copy activates only from the stage container width, even inside a wide viewport drawer/grid column.
- All shrinking grid/flex children use `min-width:0`; no global `overflow-wrap:anywhere`.
- Expanded mode retains the same card visual language and full item set.

## 5. Families and artwork strategies

| Family | Slot contract | Artwork strategy | Preserved special behavior |
|---|---|---|---|
| Roles | shared hero + shared markers | Entry direct; Bronze–Platin layered | catalog order; server stages |
| Karaoke FX | identical role path | new Entry + motif + four frames, normal layered strategy | no Karaoke render branch |
| Timer | identical role path | Entry direct; four explicit complete direct-volume images | only declared direct-volume exception |
| Progress | shared hero + shared markers | existing motif + frame layers | first-contribution motif geometry contained |
| Points | shared hero + shared markers | approved complete versioned PNGs | native horizontal tier list may remain |
| Membership | shared hero + shared markers | approved complete versioned PNGs | founding award remains independent panel |
| Contribution | shared hero + shared markers | approved complete versioned PNGs | existing three family meanings retained |
| Historical | shared bounded hero slot in its composition | direct portrait | compact profile-hero pill remains; no chain section |

The role artwork manifest is a presentation allow-list, not a role or threshold registry. All 12 achievement-capable catalog roles require deliberate artwork coverage or a declared exception; Phase 151 expects no exception. Filename probing and fallback guessing are forbidden.

## 6. Semantic field-to-control map

| Data/interaction | Semantic presentation/control | Contract |
|---|---|---|
| Section and family title | existing heading level | retain current text and document outline |
| Badge name/tier | text plus existing `Badge` where already used | artwork is never the only label |
| Current metric/points/count | read-only formatted text | no input; server value unchanged |
| Progress to next stage | native/accessible progress semantics plus visible value | expose current/max or equivalent name/value text |
| Stage preview | `button` | accessible name includes badge and tier; selected state exposed |
| Previous/next carousel action | existing `button` controls | label target/direction; disabled at bounds |
| Expand/collapse | existing `button` | `aria-expanded` and `aria-controls` |
| Active slide | carousel selection state | remains operable; clear border and full opacity |
| Inactive slide | mounted carousel item | `inert`, quieter opacity, same geometry |
| Locked stage | non-earned stage marker | explicit `Gesperrt` text/accessible name; no false CTA |
| Role relation | catalog-provided readable label | never expose the relation/code as primary copy |
| Historical award | existing compact hero pill | preserve title/meaning and portrait association |

No destructive action exists in this phase. No new CTA or product copy is introduced. Preserve existing empty/error copy; this phase only normalizes their containing geometry.

## 7. States and accessibility

- Empty: preserve the existing scoped achievement empty state; no blank carousel track or fabricated badge.
- Locked: artwork/marker remains readable but subdued; locked and inactive must be distinguishable without color alone.
- Loading/error: remain scoped to the existing profile/achievement owner and keep outer width stable.
- Missing art: fail validation/build evidence; do not silently switch to guessed files or hide the badge.
- Keyboard: visible focus, logical item order, Arrow/Home/End behavior retained, controls reachable without traversing inert content.
- Screen reader: heading hierarchy, control names, selected/expanded/disabled state and useful image alternatives remain explicit; decorative frame layers use empty alt.
- Motion: under `prefers-reduced-motion: reduce`, remove smooth transitions and settle directly without changing final state.
- Zoom: at 200% and 400%, copy reflows without overlap, clipping, lost controls or horizontal document overflow.
- Touch targets: carousel and stage controls keep the existing minimum 44 × 44 px target even when visible art is 64 px.

## 8. Verification matrix

Six core viewport classes: 320×568, 520×900, 768×1024, 1024×768, 1440×900 and 1920×1080. Also verify the explicit 390×844 product mobile case and 2560×1440 upper-bound case.

For every class record normal + reduced motion, document scroll width, slot rectangle, loaded source/current source, natural size, clipping, active/inactive equality and screenshot. Additionally verify:

1. Container boundary at 561/562 px and 657/658 px, immediately below and above.
2. Embedded stage at a narrow container inside a wide viewport; it must use the narrow composition.
3. Browser zoom at 200% and 400%, long German labels with correct umlauts, and no horizontal overflow.
4. Adjacent/non-adjacent buttons, keyboard, touch/pointer drag, horizontal trackpad and vertical page scroll.
5. Active/inactive/locked/empty/error/expanded states with invariant outer dimensions.
6. Historical portrait in the shared slot and historical pill in its preserved profile-hero location.

## 9. Complete artwork review gate

The 107-file source review is complete and remains the byte-identical baseline. Final acceptance still requires production-composition review, not another source-only contact sheet.

- Review every catalog role × Entry/Bronze/Silber/Gold/Platin, including Karaoke FX and Timer's declared strategy.
- Review every progress, points, membership, contribution, historical and milestone artwork.
- Review active and inactive carousel/card states at all core viewport classes.
- Record sharpness, optical centering, 8 px padding, crop, aspect ratio, title, card height and relative weight per artwork code.
- Verify all six new Karaoke files: Entry, motif, Bronze, Silber, Gold and Platin frame.
- Keep superseded contribution revisions preserved but unselected; edge-fragment files must never activate through fallback.
- Require successful image loads, unique badge codes, positive geometry and hero dimensions `<= 240px`.
- Completion requires signed row-by-row evidence; sampling or unit tests alone cannot pass this gate.

## 10. Prototype authority and handoff

`151-PROTOTYPE.html` demonstrates narrow and wide container behavior plus layered and portrait art in the same slot. It is not a route, feature, asset source or permission to alter product copy. Implementation must use production components, existing tokens and existing public asset paths.

UI-SPEC COMPLETE
