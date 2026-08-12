---
phase: quick-260812-lql
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/members/[slug]/page.tsx
  - frontend/src/app/members/[slug]/page.module.css
  - frontend/src/app/members/[slug]/page.test.tsx
  - frontend/src/components/profile/LatestContributionsSection.tsx
  - frontend/src/components/profile/LatestContributionsSection.module.css
  - frontend/src/components/profile/LatestContributionsSection.test.tsx
  - frontend/src/components/profile/PreviousContributionsSection.module.css
  - frontend/src/components/profile/PreviousContributionsSection.test.tsx
autonomous: false
requirements: [260812-lql-scope]
must_haves:
  truths:
    - "Besucher kÃ¶nnen die ersten drei letzten BeitrÃ¤ge als kompakte semantische Liste schnell Ã¼berblicken; MedienbeitrÃ¤ge belegen nicht mehr annÃ¤hernd einen Bildschirm je Eintrag."
    - "Vorschaubilder skalieren von 390 px bis 1920 px responsiv, behalten ein kontrolliertes SeitenverhÃ¤ltnis mit cover-Fit und bleiben ungefÃ¤hr im Bereich 180â€“240 px HÃ¶he."
    - "Kategorie, Projekt, Release, Zeitpunkt, Titel und Notiz stehen bei ausreichendem Komponentenraum neben dem Bild und bei schmalem Raum kompakt darunter."
    - "Ein leerer Verlauf belegt keine groÃŸe rechte Spalte; nur bei echten frÃ¼heren Mitwirkungen wird eine ausgewogene Zweispalten-Komposition aktiviert."
    - "Daten, Inhalte, Links, Mediensemantik, Lazy Loading, Skeleton-/Aktivierungsverhalten und Disclosure bleiben unverÃ¤ndert."
    - "Bei 390x844, 768x1024, 1024x768, 1440x900 und 1920x1080 gibt es keinen horizontalen SeitenÃ¼berlauf, keine Bildverzerrung und keine abgeschnittenen Pflichtinformationen."
  artifacts:
    - {path: "frontend/src/components/profile/LatestContributionsSection.module.css", provides: "container-responsive compact contribution rows and bounded media geometry"}
    - {path: "frontend/src/app/members/[slug]/page.module.css", provides: "state-dependent one- or two-column lower contributions composition"}
    - {path: "frontend/src/components/profile/LatestContributionsSection.test.tsx", provides: "semantic list, three-item, metadata and image-geometry regression contracts"}
    - {path: "frontend/src/components/profile/PreviousContributionsSection.test.tsx", provides: "compact empty-state and populated-history regression contracts"}
  key_links:
    - {from: "frontend/src/components/profile/LatestContributionsSection.tsx", to: "frontend/src/components/profile/LatestContributionsSection.module.css", via: "existing mediaCard/mediaPreview/mediaBody/list ownership and ResponsiveImage"}
    - {from: "frontend/src/app/members/[slug]/page.tsx", to: "frontend/src/app/members/[slug]/page.module.css", via: "existing previousContributionsCount state classes contributionPairPresent/contributionPairEmpty"}
    - {from: "frontend/src/components/profile/LatestContributionsSection.tsx", to: "frontend/src/components/ui/ResponsiveImage.tsx", via: "existing optimized-image fallback, reserved geometry and lazy loading"}
---

<objective>
Redesign only the lower public-member-profile contributions/history area as a compact, responsive and state-aware composition.

Purpose: Make three recent posts scannable without oversized media cards and stop an empty history panel from wasting a full column.
Output: Focused TDD contracts, local responsive layout changes, five-size visual evidence and a blocking human approval.
</objective>

<execution_context>
@C:/Users/admin/.codex/get-shit-done/workflows/execute-plan.md
@C:/Users/admin/.codex/get-shit-done/templates/summary.md
</execution_context>

<context>
<read_first>
- AGENTS.md
- docs/engineering/implementation-contract.md
- docs/frontend/ui-system.md
- docs/agent-guidelines-ui.md
- frontend/src/app/members/[slug]/page.tsx
- frontend/src/app/members/[slug]/page.module.css
- frontend/src/app/members/[slug]/page.test.tsx
- frontend/src/components/profile/LatestContributionsSection.tsx
- frontend/src/components/profile/LatestContributionsSection.module.css
- frontend/src/components/profile/LatestContributionsSection.test.tsx
- frontend/src/components/profile/PreviousContributionsSection.tsx
- frontend/src/components/profile/PreviousContributionsSection.module.css
- frontend/src/components/profile/PreviousContributionsSection.test.tsx
- frontend/src/components/ui/ResponsiveImage.tsx
- frontend/src/components/ui/ResponsiveImage.test.tsx
- frontend/src/components/ui/Card.tsx
- .planning/quick/260812-kr1-ffentliche-profilseite-gro-e-wei-e-innen/260812-kr1-PLAN.md
- .planning/quick/260812-jtp-public-member-profile-vertical-spacing-r/260812-jtp-PLAN.md
</read_first>

<interfaces>
`LatestContributionsSection` already filters unusable rows, exposes `ul[aria-label="Letzte BeitrÃ¤ge"]`, limits initial rendering to `INITIAL_ITEM_COUNT = 3`, uses `ResponsiveImage`, and preserves category/project/release/relative-time/note metadata. Extend these seams; do not create another list or image primitive.

`PreviousContributionsSection` already owns empty and populated history content. `page.tsx` already derives `previousContributionsCount`, while `page.module.css` currently gives both `.contributionPairPresent` and `.contributionPairEmpty` two columns above 1099 px. Use that existing state distinction so empty history remains compact and populated history alone activates two columns.

Use component/container geometry per the UI system: establish an inline-size container on the latest-contributions owner and activate the side-by-side media row only when the row's bounded preview plus readable text column fit. Preserve `min-width: 0`, `max-width: 100%`, `aspect-ratio`, `object-fit: cover`, width/height attributes, `sizes`, lazy loading and optimized fallback.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Lock compact list, image geometry and history-state contracts</name>
  <files>frontend/src/app/members/[slug]/page.test.tsx, frontend/src/components/profile/LatestContributionsSection.test.tsx, frontend/src/components/profile/PreviousContributionsSection.test.tsx</files>
  <behavior>
    - The accessible `Letzte BeitrÃ¤ge` list still exposes exactly three initial list items and the existing expansion control for further items.
    - Media rows retain ResponsiveImage semantics, alt text, intrinsic width/height, lazy loading and cover fit while CSS reserves a controlled aspect ratio and a clamp/bound equivalent to roughly 180â€“240 px height.
    - The row contains category, project, release label, relative timestamp, title and optional note in the text region; narrow and wide modes do not duplicate or reorder the semantic content.
    - Empty previous history renders its H3 and concise copy without a disclosure button or tall section card; the route assigns a single-column compact state.
    - Populated previous history retains its disclosure/list behavior and is the only state eligible for the two-column route layout.
  </behavior>
  <action>From `/home/d1sk/team4s`, capture HEAD, `git status --short`, working/cached diffs and blob hashes for every listed file under this Quick's `evidence/incoming/`. KR1 and JTP are open in the shared dirty tree; preserve their work exactly and fail closed if a planned hunk overlaps. Add focused `260812-lql` RED tests before production edits and record the intentional failure in `evidence/RED.txt`. Prefer DOM/prop assertions for semantics and narrowly scoped CSS contract assertions for geometry/state ownership. Do not weaken, skip or rewrite existing Phase 99/120/Quick 260811 tests.</action>
  <verify>
    <automated>cd /home/d1sk/team4s/frontend &amp;&amp; npm test -- --run src/app/members/[slug]/page.test.tsx src/components/profile/LatestContributionsSection.test.tsx src/components/profile/PreviousContributionsSection.test.tsx</automated>
  </verify>
  <done>New tests fail only on the currently oversized media layout and empty-history two-column/card geometry, while existing content, accessibility, loading and disclosure contracts remain represented.</done>
</task>

<task type="auto">
  <name>Task 2: Implement responsive compact rows and state-aware history composition</name>
  <files>frontend/src/app/members/[slug]/page.tsx, frontend/src/app/members/[slug]/page.module.css, frontend/src/components/profile/LatestContributionsSection.tsx, frontend/src/components/profile/LatestContributionsSection.module.css, frontend/src/components/profile/PreviousContributionsSection.module.css</files>
  <action>Make the smallest owner-local implementation. In `LatestContributionsSection`, retain the existing list, Card, ResponsiveImage, metadata functions, first-three behavior, skeleton layer and expansion logic. Convert media cards to compact mobile-first rows: narrow containers stack a full-width preview above the text; when minimum geometry fits, use a bounded preview column beside a `minmax(0, 1fr)` text column. Use a stable aspect ratio and a sensible CSS clamp/container-derived height capped near 240 px and not below roughly 180 px in the wide-row mode; ensure the narrow preview scales with container width without intrinsic overflow. Update the `sizes` hint to match the new layout rather than viewport-wide card assumptions. Keep `object-fit: cover`, alt text, intrinsic width/height, lazy loading, badge, title and note. Keep text-only rows compact and aligned without inventing a new shared component.

Use the existing `previousContributionsCount` state seam in `page.tsx`/`page.module.css`: `.contributionPairEmpty` must be a single-column flow at every width and its concise empty state must have no fixed/minimum tall Card geometry; place it directly below or compactly adjacent to its heading. `.contributionPairPresent` alone may become a balanced two-column layout once the derived minimum widths of latest rows and history fit, using the existing page layout owner and `min-width: 0`. Preserve the populated disclosure, list, skeleton activation, contents and all data wiring. Do not change global Card/ResponsiveImage, APIs, DTOs, backend, database, media ownership, links, fetch/auth behavior, content or unrelated profile/achievement spacing. Apply targeted hunks only; do not format whole dirty files.</action>
  <verify>
    <automated>cd /home/d1sk/team4s/frontend &amp;&amp; npm test -- --run src/app/members/[slug]/page.test.tsx src/components/profile/LatestContributionsSection.test.tsx src/components/profile/PreviousContributionsSection.test.tsx src/components/ui/ResponsiveImage.test.tsx &amp;&amp; npm run typecheck &amp;&amp; npm run lint -- --file src/app/members/[slug]/page.tsx --file src/components/profile/LatestContributionsSection.tsx --file src/components/profile/PreviousContributionsSection.tsx &amp;&amp; cd /home/d1sk/team4s &amp;&amp; git diff --check</automated>
  </verify>
  <done>Three recent posts are compact and scannable, images scale correctly across container widths, metadata stays adjacent/below as specified, empty history consumes only compact single-column space, populated history alone enables two columns, and all focused checks pass.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Approve the lower profile area at five exact sizes</name>
  <files>none (live verification and evidence only)</files>
  <what-built>The lower `BeitrÃ¤ge` area now shows compact responsive recent-post rows and a history column only when real earlier contributions exist.</what-built>
  <action>Rebuild or force-recreate only `team4sv30-frontend` if required and confirm it is Up. Open the populated Sheppert public profile through the shared Codex in-app browser at `http://127.0.0.1:3300`. Capture focused lower-area screenshots for empty-history and populated-history fixtures/states under this Quick's `evidence/uat/` at exactly 390x844, 768x1024, 1024x768, 1440x900 and 1920x1080, plus a measurement manifest. Headless support is allowed but cannot replace shared live review. Do not finalize KR1 or JTP and do not overwrite their evidence.</action>
  <how-to-verify>
1. At all five sizes confirm the first three posts can be surveyed quickly and no single image/card occupies almost a full screen.
2. Confirm previews scale smoothly, remain cropped intentionally rather than distorted, stay near the 180â€“240 px design bound where the side-by-side mode applies, and have no overflow or layout shift.
3. Confirm category, project, release, relative time, title and note remain readable: beside the preview when enough container width exists, below it when narrow.
4. Confirm text posts, mixed media/text ordering, `Weitere BeitrÃ¤ge anzeigen`, lazy image behavior and skeleton/near-viewport activation still work.
5. With no earlier contributions, confirm only a concise `FrÃ¼here Mitwirkungen` empty state follows the latest list and no large blank right column/tall white card remains.
6. With real earlier contributions, confirm only that state uses a balanced two-column layout at eligible width; exercise show/hide and inspect roles/years/group/anime content.
7. Record `scrollWidth &lt;= clientWidth`, preview rendered width/height/aspect ratio and overlap/clipping PASS for each exact viewport in `MANIFEST.md`.
8. Audit working/cached diffs against incoming evidence: only LQL hunks may be staged; KR1/JTP and all other pre-existing changes remain open and untouched.
  </how-to-verify>
  <verify>
    <automated>cd /home/d1sk/team4s &amp;&amp; docker compose ps team4sv30-frontend &amp;&amp; for size in 390x844 768x1024 1024x768 1440x900 1920x1080; do test -f ".planning/quick/260812-lql-ffentliches-memberprofil-letzte-beitr-ge/evidence/uat/lower-contributions-${size}.png" || exit 1; grep -E "${size}.*(overflow.*PASS|scrollWidth.*clientWidth).*image.*[0-9]+x[0-9]+" .planning/quick/260812-lql-ffentliches-memberprofil-letzte-beitr-ge/evidence/uat/MANIFEST.md || exit 1; done &amp;&amp; git diff --check</automated>
  </verify>
  <done>The user approves compact recent posts and both history states at all five sizes, with responsive bounded images, readable metadata and no overflow, clipping or unintended whitespace.</done>
  <resume-signal>Stop and wait for exact standalone `approved`; any other response is implementation feedback. Do not create SUMMARY.md, update STATE.md, commit code/docs, or finalize this Quick before exact approval.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|---|---|
| Dirty shared tree/index â†’ LQL hunks | KR1, JTP and unrelated profile work must not be overwritten, staged or finalized. |
| API-provided contribution data â†’ compact visual rows | Layout changes must preserve content, links, media URLs, accessibility and loading semantics. |
| Component container â†’ viewport/page flow | Embedded width, not a broad-screen assumption, must control row stacking and image geometry. |
| Empty/populated history state â†’ page grid | A zero count must not reserve the populated-history column. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|---|---|---|---|---|
| T-lql-01 | T | dirty files/index | mitigate | Incoming hashes/diffs, targeted patches, exact hunk staging and fail-closed overlap handling with KR1/JTP. |
| T-lql-02 | T | contribution semantics | mitigate | DOM tests preserve list structure, metadata, image props, expansion and disclosure behavior. |
| T-lql-03 | D | responsive media/layout | mitigate | Container-owned layout, bounded aspect geometry, five exact viewport measurements and overflow checks. |
| T-lql-04 | D | empty-history composition | mitigate | Route-state test ensures only positive `previousContributionsCount` enables the two-column class. |
| T-lql-05 | R | visual acceptance | mitigate | Blocking exact `approved` checkpoint before summary/state/commit. |
| T-lql-06 | I/E | public data and shared primitives | accept/mitigate | Presentation-only scope; no API/auth/DB/media mutation and no edits to shared Card/ResponsiveImage implementations. |
</threat_model>

<verification>
Run focused route/latest/previous/ResponsiveImage tests, frontend typecheck, scoped lint and `git diff --check`. Perform live in-app-browser UAT on Sheppert for empty and populated history at 390x844, 768x1024, 1024x768, 1440x900 and 1920x1080. Record actual image geometry and page overflow. Human approval blocks SUMMARY.md, STATE.md and commits.
</verification>

<success_criteria>
- The first three latest posts form a compact accessible list and can be scanned without screen-filling media cards.
- Preview images scale from mobile through widescreen with controlled aspect ratio, cover fit and approximately 180â€“240 px maximum row height where applicable.
- Category, project, release, time, title and note are adjacent on wide containers and compactly below on narrow containers.
- Empty previous history renders as a concise single-column state; populated history alone activates a balanced two-column layout.
- Existing data, contents, links, image/loading fallback, skeleton activation, expansion/disclosure and media ownership semantics remain unchanged.
- No backend, API, DTO, database, auth, global Card/ResponsiveImage or unrelated profile redesign occurs.
- No horizontal overflow, distortion, clipping or letterwise wrapping appears at any exact target viewport.
- Only exact LQL hunks are staged; KR1/JTP remain open and are not finalized.
- The user gives exact standalone `approved` before summary, state update or commit.
</success_criteria>

<source_audit>
SOURCE | ID | Feature/Requirement | Task | Status | Notes
GOAL | none | Compact, scannable lower public-profile contributions/history area | 1-3 | COVERED | TDD, implementation and live approval
REQ | lql-01 | First three posts quickly overviewable | 1-3 | COVERED | Existing initial count preserved; compact row geometry added
REQ | lql-02 | Responsive images mobile to widescreen, controlled ratio/fit and 180â€“240 px bound | 1-3 | COVERED | Container geometry, ResponsiveImage reuse and measurements
REQ | lql-03 | Category/project/time/note beside or below image | 1-3 | COVERED | Existing metadata retained in responsive text region
REQ | lql-04 | Empty history has no large right column | 1-3 | COVERED | Single-column route state and compact empty-state CSS
REQ | lql-05 | Real history enables balanced two columns | 1-3 | COVERED | Existing count-based state seam
REQ | lql-06 | Preserve content/data/links/media/loading semantics | 1-3 | COVERED | DOM/prop regressions and protected negative scope
REQ | lql-07 | Five exact responsive sizes without overflow | 3 | COVERED | Screenshots plus geometry/overflow manifest
CONTEXT | coordination | Protect open KR1/JTP work and dirty shared tree | 1-3 | COVERED | Incoming evidence, fail-closed overlap, no finalization
RESEARCH | existing owners | Latest, Previous, page state CSS and ResponsiveImage already provide all needed seams | 1-2 | COVERED | Level 0; no new dependency/shared primitive
Deferred Ideas | explicit exclusions | Backend/API/DB/media ownership, global primitive or broader profile redesign | none | EXCLUDED | Must not be implemented
</source_audit>

<output>After exact standalone approval only, create `.planning/quick/260812-lql-ffentliches-memberprofil-letzte-beitr-ge/260812-lql-SUMMARY.md`, update `.planning/STATE.md`, and commit only exact LQL hunks plus its artifacts. Until then, stop at the checkpoint.</output>
