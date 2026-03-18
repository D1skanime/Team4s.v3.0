# Related Section UX Handoff

> **KORREKTURHINWEIS (2026-03-18):**
> Die in diesem Dokument beschriebene Platzierung der Related Section wurde bei der Implementierung als inkorrekt befunden.
> Die Related Section gehört INNERHALB der infoCard (im heroContainer), NICHT als eigenständiger Block darunter.
> Diese Platzierung löst Overflow-Probleme, passt zum Glassmorphism-Design und schafft bessere visuelle Hierarchie.
> Dieses Dokument bleibt als Referenz erhalten, sollte aber nicht als aktuelle Implementierungsanleitung verwendet werden.
> Siehe DECISIONS.md Eintrag "2026-03-18 - Related Section Placement Correction" für Details.

LANE: ux

SCOPE:
- `/anime/[id]`
- Related anime section directly below the hero
- Interaction logic for horizontal browsing, arrow visibility, and card click priority

INPUTS:
- Lane source of truth: `C:\Users\D1sk\Documents\Entwicklung\Opencloud\agents\UX-Senior.md`
- Orchestrator source of truth: `C:\Users\D1sk\Documents\Entwicklung\Opencloud\agents\team4s-orchestrator.v3.md`
- Current implementation places `Related` inside the hero info card and renders two always-visible scroll buttons
- Current implementation uses horizontally scrollable cards with whole-card links

DECISIONS:
- `Related` is a separate content section and must render as the first block directly below the hero container, before episodes/comments and outside the hero info card.
- The section title remains `Related`.
- The rail is horizontally scrollable on all breakpoints. Native horizontal scroll is the baseline interaction. Arrow buttons are an enhancement, not the only way to move.
- Desktop and pointer-capable layouts:
  - Hide the left arrow on initial load when the rail is at the start.
  - Show the right arrow only when there is overflow beyond the visible viewport.
  - After scrolling away from the start, show the left arrow.
  - When the rail reaches the end, hide the right arrow.
  - If the full set of cards fits without overflow, hide both arrows.
- Mobile/touch-first layouts:
  - Do not require arrows for discoverability or completion.
  - Horizontal swipe/scroll must work without targeting a button.
  - If arrows are kept on mobile, they must follow the same overflow/state rules and must not reduce visible card width enough to harm browseability.
- Arrow behavior:
  - One activation advances the rail by approximately one fully new card group, not by a tiny pixel delta and not by the full rail length.
  - Scroll distance should reveal at least one new card and preserve user orientation by keeping some previous context visible.
  - Arrow activation updates arrow visibility immediately after the movement settles.
  - Keyboard focus on an arrow must not trigger card navigation.
- Scroll behavior:
  - Wheel/trackpad horizontal movement and touch swipe move the rail directly.
  - The page must continue vertical scrolling when the pointer is not intentionally interacting with the rail.
  - The rail must not trap scroll when the user has reached the start or end; overflow handoff back to page scroll should remain possible.
  - Scroll snapping may be used only if it does not prevent partial manual browsing or create oscillation.
- Card clickability priority:
  - The entire card is the primary action and navigates to `/anime/[relatedAnimeId]`.
  - No nested secondary actions inside the card may compete with the primary click/tap target in this slice.
  - Decorative media, relation badges, and meta labels inside the card are non-interactive.
  - Pointer down or click on arrows must never also activate a card beneath/near them.
- Layout rules for `Related` directly under hero:
  - Place `Related` immediately below the hero with the same page width container as the hero/content area.
  - Keep a clear vertical separation from the hero so it reads as the first browse section, not as hero metadata.
  - The section must stand on its own even when hero-side metadata such as info banner or edge navigation is present or absent.
  - Empty relations state: omit the entire `Related` section instead of leaving an empty titled shell.
  - Loading/error handling for relations should stay local to the section if introduced later; hero rendering must not be blocked by `Related`.

FILES:
- `C:\Users\D1sk\Documents\Entwicklung\Opencloud\agents\UX-Senior.md` (lane contract and acceptance model)
- `C:\Users\D1sk\Documents\Entwicklung\Opencloud\agents\team4s-orchestrator.v3.md` (owner boundaries and freeze rule)
- `C:\Users\D1sk\Documents\Entwicklung\Opencloud\Team4s.v3.0\DECISIONS.md` (UX freeze reference)

CONTRACT IMPACT:
- none

VALIDATION:
- Acceptance Criteria:
  - Given an anime with no related entries, no `Related` header or empty container is shown.
  - Given an anime with related entries and no horizontal overflow, the cards render in one row and both arrows are hidden.
  - Given horizontal overflow at initial position, only the right arrow is visible.
  - After the user scrolls right far enough that content exists off-screen to the left, the left arrow becomes visible.
  - After the user reaches the end of the rail, the right arrow is hidden.
  - Arrow activation moves the rail by a meaningful card-group step and does not reload the page.
  - Touch swipe and trackpad/wheel scrolling can browse the rail without using arrows.
  - Clicking or tapping anywhere on a card navigates to the related anime detail page.
  - Clicking an arrow never triggers underlying card navigation.
  - `Related` appears as the first standalone section directly below the hero and above the remaining detail content.
  - The section remains usable on mobile without precision tapping.
- Minimal in-scope frontend recommendations:
  - Replace always-visible arrows with overflow-aware visibility plus disabled/hidden end states.
  - Move the current `Related` mount point out of the hero info card into the content column directly below hero.
  - Keep existing whole-card link structure; do not add nested action buttons inside cards.
  - Optional ARIA refinement: use labels such as `Nach links durch Related scrollen` and `Nach rechts durch Related scrollen`, and reflect hidden/disabled state semantically.

BLOCKERS:
- none

RISKS:
- If frontend keeps `Related` inside the hero card, users may read it as hero metadata instead of next-step navigation.
- If arrows remain always visible, users receive false affordance when no additional content exists in that direction.
