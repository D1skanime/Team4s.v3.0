---
phase: quick-260803-ozq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/components/profile/MemberBadgeChain.tsx
  - frontend/src/components/profile/MemberBadgeChain.module.css
  - frontend/src/components/profile/MemberBadgeChain.test.tsx
  - frontend/src/components/profile/MemberCurrentProjectsSection.module.css
  - frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx
  - frontend/src/components/profile/LatestContributionsSection.tsx
  - frontend/src/components/profile/LatestContributionsSection.test.tsx
autonomous: false
requirements: [260803-ozq-scope]

must_haves:
  truths:
    - "Reloading a member profile positions each current badge stage inside its own rail without moving the document viewport."
    - "At 390x844 current-project cards are compact and single-column; at 768x1024 they remain two-column."
    - "Collection badge heroes are roughly 10–15% smaller at smartphone width only, with tablet sizing unchanged."
    - "The earned current stage says Aktuell, a deliberately focused older earned stage says Vorschau, and the rail contains no redundant Ausgewählt wording."
    - "The latest-contribution feed initially shows three usable items and reveals the remainder through Weitere Beiträge anzeigen."
  artifacts:
    - path: frontend/src/components/profile/MemberBadgeChain.tsx
      provides: Inner-rail-only initial positioning and Aktuell/Vorschau state semantics
    - path: frontend/src/components/profile/MemberBadgeChain.module.css
      provides: Smartphone-only collection hero reduction extending the approved focus-snap CSS
    - path: frontend/src/components/profile/MemberCurrentProjectsSection.module.css
      provides: Compact smartphone cards and explicit tablet portrait two-column grid
    - path: frontend/src/components/profile/LatestContributionsSection.tsx
      provides: Three-item initial feed with accessible progressive disclosure
  key_links:
    - from: frontend/src/components/profile/MemberBadgeChain.tsx
      to: frontend/src/components/profile/MemberBadgeChain.module.css
      via: stripRef targets the data-badge-stage-strip scroll container and selected/current state classes
      pattern: "stripRef|data-badge-stage-strip"
    - from: frontend/src/components/profile/LatestContributionsSection.tsx
      to: usableItems
      via: filtered usable contributions are sliced only for rendered collapsed state, not discarded
      pattern: "Weitere Beiträge anzeigen"
---

<objective>
Polish the public member profile at smartphone and tablet sizes without changing its domain data or introducing new UI seams.

Purpose: Remove the reload jump, tighten mobile project and collection presentation, clarify badge-stage state, and keep the activity feed scannable through progressive disclosure.
Output: Focused profile component/style/test changes plus live viewport verification.
</objective>

<execution_context>
@C:/Users/admin/.codex/get-shit-done/workflows/execute-plan.md
@C:/Users/admin/.codex/get-shit-done/templates/summary.md
</execution_context>

<context>
<read_first>
@AGENTS.md
@docs/engineering/implementation-contract.md
@docs/frontend/ui-system.md
@docs/agent-guidelines-ui.md
@frontend/src/components/profile/MemberBadgeChain.tsx
@frontend/src/components/profile/MemberBadgeChain.module.css
@frontend/src/components/profile/MemberBadgeChain.test.tsx
@frontend/src/components/ui/FocalCarousel.tsx
@frontend/src/components/ui/FocalCarousel.module.css
@frontend/src/components/ui/FocalCarousel.test.tsx
@frontend/src/app/members/[slug]/page.tsx
@frontend/src/app/members/[slug]/page.module.css
@frontend/src/app/members/[slug]/page.test.tsx
@frontend/src/components/profile/MemberCurrentProjectsSection.tsx
@frontend/src/components/profile/MemberCurrentProjectsSection.module.css
@frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx
@frontend/src/components/profile/LatestContributionsSection.tsx
@frontend/src/components/profile/LatestContributionsSection.module.css
@frontend/src/components/profile/LatestContributionsSection.test.tsx
</read_first>

Preserve all unrelated dirty work. In particular, the uncommitted Phase 119 mobile focus-snap implementation in MemberBadgeChain/FocalCarousel and its tests is approved work to extend, not revert or rewrite. Do not touch the modified badge PNGs or unrelated planning artifacts.

Implementation order is locked: reload jump, project cards, smartphone collection heroes, Aktuell/Vorschau wording, then contribution disclosure. Use correct German umlauts in all user-facing copy.
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Keep badge-stage positioning inside the rail and clarify stage state</name>
  <files>frontend/src/components/profile/MemberBadgeChain.tsx, frontend/src/components/profile/MemberBadgeChain.test.tsx</files>
  <behavior>
    - Initial current-stage positioning changes only the owning `.familyStages` element's horizontal scroll offset and never calls an API that can scroll the document.
    - Selecting or focus-snapping the current stage restores the canonical hero and Aktuell state.
    - Deliberately selecting an older earned stage renders Vorschau in the hero/status area; no visible or accessible Ausgewählt wording remains in the rail.
    - Keyboard activation and reduced-motion behavior remain supported.
  </behavior>
  <action>
    First extend the existing Phase 119 inner-stage-strip tests so they fail for document-moving `scrollIntoView` positioning. In `FamilyCollectionCard`, replace initial and click-driven stage positioning with an inner-container calculation (`stage.offsetLeft`/rect relative to `stripRef`, clamped to the rail's horizontal range, applied with the rail's own `scrollTo` or `scrollLeft`). Do not use `window.scrollTo`, document scrolling, focus side effects, or `scrollIntoView`, because those can move ancestor/document scroll on reload. Preserve the already-approved debounced mobile focus-snap selection and cleanup. Update stage semantics so the current earned stage alone retains `Aktuell`; an intentionally selected non-current earned stage surfaces `Vorschau` beside the hero label. Remove `Ausgewählt` from visible chips and accessible stage labels while retaining an unambiguous button name and `aria-pressed` selection state. Do not alter badge resolution, progress math, locked stages, special awards, or the shared `FocalCarousel` contract unless a focused regression test proves the shared component itself is responsible.
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s && docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/MemberBadgeChain.test.tsx src/components/ui/FocalCarousel.test.tsx</automated>
  </verify>
  <done>Tests prove initial/click positioning scrolls only the stage rail, reload cannot move the document through stage centering, and Aktuell/Vorschau semantics contain no redundant Ausgewählt wording.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Compact smartphone project cards and collection heroes</name>
  <files>frontend/src/components/profile/MemberCurrentProjectsSection.module.css, frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx, frontend/src/components/profile/MemberBadgeChain.module.css, frontend/src/components/profile/MemberBadgeChain.test.tsx</files>
  <behavior>
    - At smartphone width the project list is one column and cards use a shorter cover/content composition with reduced spacing while all title, group, role, and project-wide information remains readable.
    - At 768px portrait the project list is explicitly two columns without horizontal overflow.
    - Only the smartphone media query reduces collection `.familyHero` sizing by roughly 10–15% from its current mobile dimensions; 768px/tablet rules remain unchanged.
    - Existing focus-snap rail geometry, active scaling, touch behavior, and special-award layout remain intact.
  </behavior>
  <action>
    Add/adjust CSS contract assertions before styling. In `MemberCurrentProjectsSection.module.css`, keep the default two-column grid, make the tablet portrait breakpoint retain two columns (do not let the current `auto-fit` collapse at 768px), and keep one column only at the smartphone breakpoint. Within that smartphone rule, compact the existing card rather than creating a second component: reduce minimum height, cover width, body gap/padding, and if needed badge spacing/font size while preserving the whole-card link and semantic content. In `MemberBadgeChain.module.css`, adjust only the `max-width: 520px` collection hero/card sizing so the large collection hero is approximately 10–15% smaller than the current smartphone value; do not change the 521–900px/tablet presentation. Preserve and extend the current uncommitted focus-snap CSS instead of reverting it. Avoid broad reformatting of the already-dirty badge stylesheet.
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s && docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/MemberCurrentProjectsSection.test.tsx src/components/profile/MemberBadgeChain.test.tsx</automated>
  </verify>
  <done>Responsive contract tests pin one compact project column and reduced collection heroes at 390px, two project columns and unchanged collection sizing at 768px, with no overflow or loss of card content.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Add progressive disclosure to the latest contribution feed</name>
  <files>frontend/src/components/profile/LatestContributionsSection.tsx, frontend/src/components/profile/LatestContributionsSection.test.tsx</files>
  <behavior>
    - Zero usable contributions still suppress the section.
    - One to three usable contributions render without a disclosure control.
    - Four or more usable contributions initially render exactly three, then Weitere Beiträge anzeigen reveals every remaining usable item in original order.
    - Empty text/media entries do not consume the initial three-item allowance.
  </behavior>
  <action>
    Convert `LatestContributionsSection` to the smallest client-side interactive seam required for local disclosure. Change `usableItems` to retain all valid contributions, add a collapsed/expanded state with an initial count constant of 3, and render the existing Card compositions unchanged from either the first three or the complete filtered list. Use the existing global `Button` primitive for the German control `Weitere Beiträge anzeigen`, with correct `aria-expanded` and `aria-controls` association to the list; hide the control once expanded. Keep this entirely local—no API pagination, new endpoint, archive route, or global state. Extend the existing tests with user interaction and filtering/order assertions.
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s && docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/LatestContributionsSection.test.tsx src/app/members/[slug]/page.test.tsx</automated>
  </verify>
  <done>The feed initially exposes at most three usable contributions and reveals all remaining entries through the accessible Weitere Beiträge anzeigen control without changing contribution cards or data contracts.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Verify the responsive member profile in the live shared flow</name>
  <what-built>Reload-safe badge rails, compact responsive projects and collection cards, clear Aktuell/Vorschau semantics, and a progressively disclosed latest-contribution feed.</what-built>
  <how-to-verify>
    1. Open a real populated public member profile through the user-visible app flow at http://127.0.0.1:3300/members/{slug}; do not rely on a hidden direct-only route.
    2. At 390x844, reload while scrolled to the profile top and again near Auszeichnungen. Confirm the page does not jump, each medal rail centers only within itself, project cards are compact in one column, and collection heroes are visibly around 10–15% smaller without clipping.
    3. Swipe an earned stage rail and deliberately select an older earned stage. Confirm the current stage reads Aktuell, the older selection reads Vorschau, no Ausgewählt wording appears, locked stages remain inert, and vertical page scrolling still works over the horizontal rail.
    4. At 768x1024, confirm current projects remain two columns, collection badge hero sizing matches the existing tablet treatment, and no horizontal page overflow appears.
    5. With at least four usable latest contributions, confirm exactly three appear initially, Weitere Beiträge anzeigen reveals the remainder in order, and the control disappears after expansion.
  </how-to-verify>
  <resume-signal>Type "approved" or describe the viewport/interaction issue.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| API profile data → public profile UI | Existing public contribution and badge data is rendered; this plan changes only local presentation/state. |
| Pointer/keyboard/scroll input → carousel state | Untrusted interaction events select stages and move only the owned horizontal rail. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260803-01 | D | MemberBadgeChain stage positioning | mitigate | Clamp calculated horizontal offsets and mutate only `stripRef`; tests reject document-moving scroll APIs and retain cleanup. |
| T-260803-02 | T | LatestContributionsSection disclosure | accept | Disclosure changes only which already-provided public items render; no persistence, authorization, HTML injection, or transport is introduced. |
</threat_model>

<verification>
Run after implementation, from the canonical Linux repository:

- `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/MemberBadgeChain.test.tsx src/components/ui/FocalCarousel.test.tsx src/components/profile/MemberCurrentProjectsSection.test.tsx src/components/profile/LatestContributionsSection.test.tsx src/app/members/[slug]/page.test.tsx`
- `docker compose exec -T team4sv30-frontend npm run typecheck`
- `docker compose exec -T team4sv30-frontend npm run lint -- --file src/components/profile/MemberBadgeChain.tsx --file src/components/profile/MemberCurrentProjectsSection.tsx --file src/components/profile/LatestContributionsSection.tsx` if the repository lint script supports file filters; otherwise run the standard frontend lint and report unrelated existing failures separately.
- `git diff --check`
- Review `git diff --` for only the seven declared implementation/test files and confirm pre-existing unrelated dirty assets/planning files are untouched.
- Complete live UAT at 390x844 and 768x1024 through `http://127.0.0.1:3300` as specified in Task 4.
</verification>

<success_criteria>
- Page reload and stage selection never move the document to position a medal; only the relevant inner rail scrolls.
- Smartphone project cards are compact and single-column; tablet portrait projects remain two-column.
- Smartphone collection heroes are reduced roughly 10–15%, while tablet appearance is unchanged.
- Aktuell identifies the true current stage, Vorschau identifies an older selected stage, and Ausgewählt is absent.
- Three usable latest contributions render initially and the German disclosure reveals the rest.
- Focused tests, typecheck, lint where supported, `git diff --check`, diff review, and both live viewport checks pass.
</success_criteria>

<output>
After completion, create `.planning/quick/260803-ozq-profilseite-responsiv-optimieren-neulade/260803-ozq-SUMMARY.md`.
</output>
