---
phase: quick-260730-jre
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/components/ui/FocalCarousel.tsx
  - frontend/src/components/ui/FocalCarousel.module.css
  - frontend/src/components/ui/FocalCarousel.test.tsx
  - frontend/src/components/ui/index.ts
  - frontend/src/components/profile/MemberBadgeChain.tsx
  - frontend/src/components/profile/MemberBadgeChain.module.css
  - frontend/src/components/profile/MemberBadgeChain.test.tsx
  - frontend/src/components/fansubs/FansubProjectsGrid.tsx
  - frontend/src/components/fansubs/FansubProjectsSection.module.css
  - frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx
autonomous: true
requirements:
  - 260730-jre-focal-carousel
user_setup: []

must_haves:
  truths:
    - "Profil-Badges bleiben auf Desktop als große Karten vollständig lesbar; auf Tablet und Mobile steht genau eine unbeschnittene aktive Karte im Fokus, während nur die Fenster der Randkarten komprimiert beziehungsweise maskiert werden."
    - "Fansub-Projekte verwenden dieselbe fokussierte Karussell-Interaktion und behalten unveränderte Projektdaten, Statusdarstellung und Ziel-Links."
    - "Aktive Badge- und Projektkarten erhalten einen eleganten, palettenbezogenen mystisch-metallischen Glow aus bestehenden Design-Tokens; Artwork wird niemals verzerrt."
    - "Beide Flächen lassen sich ohne Autoplay per Pfeil-Buttons, ArrowLeft/ArrowRight und Touch/Pointer bedienen, zeigen einen sichtbaren Fokus und respektieren prefers-reduced-motion."
    - "Alle anzeigen wechselt jeweils in ein responsives Vollraster; Weniger anzeigen kehrt zum Karussell und zur zuvor aktiven Karte zurück."
  artifacts:
    - path: "frontend/src/components/ui/FocalCarousel.tsx"
      provides: "Generische, fachlogikfreie Fokus-, Tastatur-, Pointer- und Expand/Collapse-Logik"
      exports: ["FocalCarousel"]
    - path: "frontend/src/components/profile/MemberBadgeChain.tsx"
      provides: "Badge-Gruppen als Desktop-Karten beziehungsweise fokussierte responsive Karussells"
    - path: "frontend/src/components/fansubs/FansubProjectsGrid.tsx"
      provides: "Fansub-Projekte als Konsument desselben FocalCarousel-Primitives"
  key_links:
    - from: "frontend/src/components/profile/MemberBadgeChain.tsx"
      to: "frontend/src/components/ui/FocalCarousel.tsx"
      via: "Import und items/renderItem-Komposition ohne Änderung der Badge-Kataloglogik"
      pattern: "FocalCarousel"
    - from: "frontend/src/components/fansubs/FansubProjectsGrid.tsx"
      to: "frontend/src/components/ui/FocalCarousel.tsx"
      via: "Import und Rendern bestehender FansubProjectBannerCard-Instanzen"
      pattern: "FocalCarousel"
---

<objective>
Ein gemeinsames, Material-3-inspiriertes Focal-Carousel für Profil-Badges und Fansub-Projekte umsetzen: große aktive Karten, eingedrückte/maskierte Randkarten, palettenbewusster Metall-Glow und ein responsives Alle-anzeigen-Raster.

Purpose: Beide öffentlichen Medienflächen erhalten dieselbe hochwertige und zugängliche Fokus-Interaktion, ohne doppelte Karusselllogik, API-/Datenänderungen oder Beschädigung der bereits lokal bearbeiteten Badge-Artworks.

Output: Ein generisches `FocalCarousel`-Primitive, zwei darauf migrierte Domain-Komponenten, fokussierte Regressionstests und Live-UAT-Anweisungen.
</objective>

<execution_context>
@C:/Users/admin/.codex/get-shit-done/workflows/execute-plan.md
@C:/Users/admin/.codex/get-shit-done/templates/summary.md
</execution_context>

<context>
<read_first>
@.planning/STATE.md
@AGENTS.md
@docs/engineering/implementation-contract.md
@docs/frontend/ui-system.md
@docs/agent-guidelines-ui.md
@frontend/src/components/profile/MemberBadgeChain.tsx
@frontend/src/components/profile/MemberBadgeChain.module.css
@frontend/src/components/profile/MemberBadgeChain.test.tsx
@frontend/src/components/fansubs/FansubProjectsGrid.tsx
@frontend/src/components/fansubs/FansubProjectsSection.module.css
@frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx
@frontend/src/components/ui/index.ts
</read_first>

<interfaces>
Existing domain contracts that must remain unchanged:
- `MemberBadgeChain({ earnedBadges, catalog = PUBLIC_MEMBER_BADGE_CATALOG })`; `buildMemberBadgeGroups(...)` remains the source for grouping, role rows, earned/locked state, palette and artwork.
- `FansubProjectsGrid({ items, groupId, groupSlug })`; each item remains `{ project, statusLabel, statusVariant }` and continues to render `FansubProjectBannerCard`.
- `FansubProjectBannerCard` continues to own project href, image, title and status rendering.
- Global actions use the existing `Button` primitive from `@/components/ui`.

Dirty-worktree baseline:
- `MemberBadgeChain.tsx`, `.module.css`, `.test.tsx`, `memberBadgeLabels.ts`, its test, and `frontend/public/member-achievement-badges/` already contain user work.
- Inspect `git diff --` for each dirty Badge file before editing. Preserve all artwork mappings, image filenames, earned/locked semantics and unrelated test changes. Do not reset, replace wholesale, format broadly, or touch `memberBadgeLabels*`, badge image files, `frontend/next-env.d.ts`, or unrelated planning artifacts.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Fachlogikfreies FocalCarousel-Primitive testgetrieben extrahieren</name>
  <files>frontend/src/components/ui/FocalCarousel.tsx, frontend/src/components/ui/FocalCarousel.module.css, frontend/src/components/ui/FocalCarousel.test.tsx, frontend/src/components/ui/index.ts</files>
  <behavior>
    - ArrowRight/ArrowLeft and labelled previous/next buttons move one item, clamp at both ends and expose the active item through `aria-current="true"` or an equivalent tested state.
    - Pointer/touch scrolling settles on the nearest item without converting a drag into an item click; no timer or autoplay exists.
    - The labelled Alle-anzeigen action renders every item in the grid mode; Weniger anzeigen restores carousel mode and the previous active index/focus target.
    - Reduced motion disables scripted easing/transition while keeping navigation functional.
  </behavior>
  <action>
First write focused jsdom tests, then extract the reusable interaction currently embedded in `FansubProjectsGrid` into a generic `FocalCarousel<T>` under `components/ui`. Its public contract must accept stable item keys, a `renderItem(item, state)` callback, accessible singular/plural labels, previous/next labels, and grid/carousel presentation slots/classes without importing profile or fansub types. Keep one active index as the source of truth; derive the active card from scroll position and update it after arrows, keyboard and completed pointer/touch movement. Use scroll snapping and DOM measurement, not viewport-specific item counts in TypeScript.

Provide labelled region semantics, useful per-card position text (`N von M` in an accessible label or description), visible focus, disabled boundary arrows, ArrowLeft/ArrowRight handling and focus preservation across expand/collapse. Do not add autoplay, carousel API data, global state, undocumented browser dependencies, or a second button implementation. Preserve the existing delayed pointer-capture/click-suppression principle so project links remain clickable when no drag occurred.

Implement layout mechanics in the CSS module: centered active window, partially visible compressed/masked edge windows, overflow clipping and scroll snap. Card content must retain its intrinsic aspect ratio; apply masking/clipping/scale only to the outer item window, never `scaleX`, forced width/height distortion, or non-uniform transforms to images/artwork. Add `@media (prefers-reduced-motion: reduce)` to remove smooth transitions/animation. Export through `ui/index.ts`; keep the primitive generic and document it in code only where the non-obvious scroll/focus behavior needs explanation.
  </action>
  <verify>
    <automated>cd frontend; npx vitest run src/components/ui/FocalCarousel.test.tsx</automated>
  </verify>
  <done>The generic primitive owns all carousel navigation/drag/expand state, its focused tests pass, it has no domain imports or autoplay, and reduced-motion plus accessible controls are covered.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Profil-Badges auf große Karten und das gemeinsame FocalCarousel migrieren</name>
  <files>frontend/src/components/profile/MemberBadgeChain.tsx, frontend/src/components/profile/MemberBadgeChain.module.css, frontend/src/components/profile/MemberBadgeChain.test.tsx</files>
  <behavior>
    - Existing grouping, German role labels, progress count, earned/locked state and approved achievement image paths remain unchanged.
    - Each non-empty badge group offers an accessible focal carousel and Alle anzeigen/Weniger anzeigen flow without losing the active card.
    - Active artwork is fully contained and undistorted; locked badges remain clearly labelled as gesperrt.
  </behavior>
  <action>
Extend the existing dirty test file before implementation and preserve all current assertions/artwork work. Replace each group’s raw horizontal `<ul>` behavior with the shared `FocalCarousel`, while leaving `catalogWithEarnedBadges`, `buildMemberBadgeGroups`, role grouping, palettes and image selection intact. Flatten each group’s rendered rows only as needed for stable carousel item keys; keep role labels semantically associated with their badges.

On wide desktop, style large badge cards in a generous multi-card presentation with the artwork fully visible. At tablet/mobile widths, use the primitive’s centered focal mode: active card completely visible and visually dominant, adjacent card windows indented/compressed and masked. Produce the mystical metallic glow from each badge’s existing `--badge-accent`/`data-palette`, `color-mix`, borders and layered shadows; keep locked items quieter. Images retain `object-fit: contain` and an unchanged aspect ratio. The expanded mode is a responsive full grid with the same earned/locked labels and a global `Button` labelled `Weniger anzeigen`. All new German UI strings use proper umlauts.

Do not alter API/types, badge catalogue behavior, image mappings/assets, the progress calculation or any dirty work outside these three files. Avoid wholesale rewrites of the CSS/test files; layer the focal/card/grid styles onto the current palette and artwork rules.
  </action>
  <verify>
    <automated>cd frontend; npx vitest run src/components/profile/MemberBadgeChain.test.tsx</automated>
  </verify>
  <done>All existing badge tests plus new carousel/grid/accessibility regressions pass; desktop cards and responsive focal mode preserve artwork, catalog semantics and the dirty badge changes.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Fansub-Projekte auf dasselbe FocalCarousel migrieren und Gesamtprüfung durchführen</name>
  <files>frontend/src/components/fansubs/FansubProjectsGrid.tsx, frontend/src/components/fansubs/FansubProjectsSection.module.css, frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx</files>
  <behavior>
    - Existing ordering, 20-item preview threshold, remaining count, project hrefs/statuses and full-grid content remain unchanged.
    - Arrow buttons, keyboard arrows and pointer/touch use the shared focal interaction; active project card is fully visible and edge windows are masked without distorting the 16:9 banner.
    - Alle 25 Projekte anzeigen reveals all 25; Weniger anzeigen returns to the prior active project.
  </behavior>
  <action>
Add interaction assertions to the existing Fansub suite, then remove the local easing, animation, drag, keyboard and expand/collapse implementation from `FansubProjectsGrid` and compose `FocalCarousel` instead. Retain `PREVIEW_COUNT = 20`, `FansubProjectBannerCard`, project keys, status variants, group ID/slug and current link behavior exactly. Pass the current accessible labels (`Projekt-Vorschau`, `Vorherige Projekte`, `Weitere Projekte`, `Alle {count} Projekte anzeigen`) into the primitive and keep the `+N weitere Projekte / Alle anzeigen` tile as domain content where more than 20 items exist.

Adapt the CSS module so the active 16:9 project banner is large and fully proportioned, adjacent item windows are visibly indented/masked, and the active window gets a refined metallic glow derived from existing accent/surface tokens. Do not apply non-uniform image transforms. Keep the expanded `.projectGrid` responsive and retain `Weniger anzeigen`; delete obsolete local carousel mechanics/styles after the shared primitive covers them.

Run focused suites first, then typecheck, lint and `git diff --check`. Review `git diff --` only for the ten planned files and explicitly verify that `memberBadgeLabels*`, artwork files, `next-env.d.ts` and unrelated planning files are untouched.
  </action>
  <verify>
    <automated>cd frontend; npx vitest run src/components/ui/FocalCarousel.test.tsx src/components/profile/MemberBadgeChain.test.tsx src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx</automated>
    <automated>cd frontend; npm run typecheck</automated>
    <automated>cd frontend; npm run lint</automated>
    <automated>git diff --check</automated>
  </verify>
  <done>Both domain surfaces use one carousel implementation, all focused tests/typecheck/lint/diff checks pass without new failures, data/link behavior is unchanged, and no unrelated dirty file was modified.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| API-derived profile/project data → public UI | Existing untrusted titles, labels, image URLs and links are rendered through the existing React/Next components; this plan must not add HTML injection or new transport. |
| Pointer/keyboard events → navigation | Drag detection must not accidentally activate a project link, trap focus, or make controls inaccessible. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260730-jre-01 | T | `FocalCarousel` pointer handling | mitigate | Preserve delayed pointer capture and suppress click only after a real drag threshold; cover click-versus-drag behavior in tests. |
| T-260730-jre-02 | D | Carousel keyboard/focus flow | mitigate | Clamp navigation, expose disabled boundaries, preserve focus across mode changes and honor reduced motion; no autoplay/timers. |
| T-260730-jre-03 | I | Badge/project rendering | accept | No new API, raw HTML, auth, media ownership or persisted-data behavior is introduced; existing React/Next rendering contracts remain authoritative. |
</threat_model>

<verification>
Automated:
- Focused Vitest suites for the primitive, badges and projects.
- Frontend TypeScript typecheck and ESLint.
- `git diff --check`.
- Dirty-worktree audit: planned-file diff only; no reset, broad formatter, asset rewrite or unrelated edit.

Responsive live UAT (required after automation):
1. Open a real public member profile at `/members/{slug}` with earned and locked badges. At ≥1280 px confirm large readable badge cards and undistorted artwork. At approximately 768 px and 390 px confirm a fully visible centered active card, clearly masked/compressed edge cards, palette-aware metal glow, touch swipe, arrow keys, visible focus, and no autoplay.
2. In every badge group activate `Alle anzeigen`, confirm all badges form a responsive grid with no clipping, then activate `Weniger anzeigen` and confirm return to the prior active badge.
3. Open a real public fansub profile at `/fansubs/{slug}` with enough projects. Repeat desktop/tablet/mobile checks; confirm title/status/banner proportions and links. With >20 projects verify the `+N` count, full grid, `Weniger anzeigen`, and return to the prior project.
4. Enable OS/browser reduced motion and confirm transitions cease while arrows, keyboard, touch and expand/collapse remain functional.
5. Confirm focus rings are visible, boundary arrows communicate disabled state, controls have useful German accessible names, and no card/link fires after a drag.
</verification>

<success_criteria>
- One generic, tested carousel seam is reused by both domains; no duplicated navigation/drag/expand implementation remains.
- Desktop, tablet and mobile match the locked focal-card behavior without artwork/banner distortion.
- Metallic glow is elegant, token- and palette-aware, with reduced-motion support.
- Alle anzeigen/Weniger anzeigen works as a responsive full-grid round trip.
- Existing API/data/link/badge behavior and dirty badge artwork changes are preserved.
- Focused tests, typecheck, lint and `git diff --check` pass, with unrelated pre-existing issues reported separately.
</success_criteria>

<output>
After completion create `.planning/quick/260730-jre-fokussiertes-material-3-inspiriertes-kar/260730-jre-SUMMARY.md` containing changed sections, files changed, checks executed, live-UAT result/deviations, remaining risks, and confirmation that unrelated dirty files were preserved.
</output>
