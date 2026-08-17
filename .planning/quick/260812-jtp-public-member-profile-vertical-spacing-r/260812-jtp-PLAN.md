---
phase: quick-260812-jtp
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/members/[slug]/page.module.css
  - frontend/src/app/members/[slug]/page.test.tsx
  - frontend/src/components/profile/MemberBadgeChain.module.css
  - frontend/src/components/profile/MemberBadgeChain.test.tsx
autonomous: false
requirements: [260812-jtp-scope]
must_haves:
  truths:
    - "Das öffentliche Memberprofil hat von Profilkopf bis Beiträge einen erkennbar gleichmäßigen vertikalen Rhythmus ohne übergroße Leerzonen oder willkürliche Abschnittswechsel."
    - "Abschnittsabstand, Überschrift-zu-Inhalt-Abstand und die Trennung der Achievement-Gruppen verwenden eine kleine bestehende Spacing-Skala und bleiben bei 390x844, 768x1024, 1024x768, 1440x900 und 1920x1080 konsistent."
    - "Card-Innenräume, achtzeilige Story-Vorschau, 61.5/38.5-Profilraster, Beitrags-Carousel-Geometrie, Inhalte, Hintergründe und Interaktionen bleiben unverändert."
  artifacts:
    - {path: "frontend/src/app/members/[slug]/page.module.css", provides: "owner-scoped outer profile rhythm using existing spacing tokens"}
    - {path: "frontend/src/app/members/[slug]/page.test.tsx", provides: "route-level CSS regression contract for section rhythm and protected geometry"}
    - {path: "frontend/src/components/profile/MemberBadgeChain.module.css", provides: "tokenized spacing only at BadgeChain section/group ownership seams"}
    - {path: "frontend/src/components/profile/MemberBadgeChain.test.tsx", provides: "BadgeChain spacing contract without carousel or card redesign"}
  key_links:
    - {from: "frontend/src/app/members/[slug]/page.module.css", to: "frontend/src/app/members/[slug]/page.tsx", via: "existing section, rhythmBand, sectionPair and semantic band classes"}
    - {from: "frontend/src/components/profile/MemberBadgeChain.module.css", to: "frontend/src/components/profile/MemberBadgeChain.tsx", via: "existing section, groupList and group ownership classes"}
---

<objective>
Harmonize the vertical rhythm of the public member profile with the existing Team4s spacing scale.

Purpose: Remove oversized dead gaps and arbitrary transitions while preserving the already approved profile design and all behavior.
Output: Focused CSS-contract tests, owner-scoped spacing changes, five-viewport evidence, and a blocking visual approval.
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
- frontend/src/styles/globals.css
- frontend/src/app/members/[slug]/page.tsx
- frontend/src/app/members/[slug]/page.module.css
- frontend/src/app/members/[slug]/page.test.tsx
- frontend/src/components/profile/MemberBadgeChain.tsx
- frontend/src/components/profile/MemberBadgeChain.module.css
- frontend/src/components/profile/MemberBadgeChain.test.tsx
- .planning/quick/260812-rps-public-member-profile-responsive-stabilisieren/260812-rps-PLAN.md
- .planning/quick/260812-ras-remove-aggregate-achievement-summary/260812-ras-PLAN.md
- .planning/quick/260812-ras-remove-aggregate-achievement-summary/260812-ras-SUMMARY.md
- .planning/quick/260811-obg-public-member-profile-outer-bands-transparent/260811-obg-PLAN.md
</read_first>

<interfaces>
Existing route ownership seams: `.page`, `.section`, `.rhythmBand`, `.sectionPair`, `.profilePair`, `.contributionPairPresent`, `.contributionPairEmpty`, and the four semantic band classes in `page.module.css`.
Existing BadgeChain ownership seams: `.section`, `.groupList`, and `.group`; card/stage/carousel internals are protected.
Existing global spacing scale in `globals.css`: `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`, `--space-5: 24px`, `--space-6: 32px`, `--space-7: 48px`.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Lock and implement the owner-scoped vertical rhythm</name>
  <files>frontend/src/app/members/[slug]/page.module.css, frontend/src/app/members/[slug]/page.test.tsx, frontend/src/components/profile/MemberBadgeChain.module.css, frontend/src/components/profile/MemberBadgeChain.test.tsx</files>
  <behavior>
    - Route-level tests fail first unless outer section separation, heading-to-content gaps, and section-pair gaps use an explicit small subset of the existing `--space-*` scale.
    - BadgeChain tests fail first unless only its section/group ownership seams use the same token scale; family cards, achievement stages and carousel geometry remain byte-for-byte outside the selected hunks.
    - Existing tests continue to protect the eight-line story preview, 8fr/5fr profile grid (61.5/38.5), contribution carousel geometry, headings/copy, backgrounds and mechanics.
  </behavior>
  <action>From `/home/d1sk/team4s`, capture `git status --short`, `git diff`, `git diff --cached`, and blob hashes for all four files under this Quick's `evidence/incoming/` before editing. The tree is already dirty, especially `MemberBadgeChain.test.tsx`; treat every pre-existing hunk and index entry as protected user work. Add focused RED assertions first, record their expected failure in `evidence/RED.txt`, then make the smallest CSS-only implementation. Reuse `--space-2` through `--space-7`; do not add or change global tokens. Normalize the page-owned section top/bottom separation, `SectionHeader`/heading-to-content gap, and band-to-card/section-pair separation. In `MemberBadgeChain.module.css`, change only outer `.section`/`.groupList`/`.group` rhythm if required for continuity with the page scale. Do not touch card or stage padding, artwork/hero dimensions, story clamp, responsive columns, FocalCarousel CSS/TSX, DOM/headings/copy/data, backgrounds, or interactions. Do not add jump navigation or duplicate-heading cleanup. Keep all selectors route/component scoped; no global layout changes. Use targeted patches only, never whole-file formatting. Before staging, compare current hunks to incoming evidence, build a patch containing only this Quick's hunks, temporarily preserve the exact pre-existing index, and fail closed on overlap. Never run `git add` on any whole dirty file.</action>
  <verify>
    <automated>cd /home/d1sk/team4s/frontend &amp;&amp; npm test -- --run src/app/members/[slug]/page.test.tsx src/components/profile/MemberBadgeChain.test.tsx &amp;&amp; npm run typecheck &amp;&amp; cd /home/d1sk/team4s &amp;&amp; git diff --check</automated>
  </verify>
  <done>The two CSS owners use one documented subset of existing spacing tokens, focused tests are green, protected geometry and behavior contracts remain green, and evidence proves no pre-existing hunk or index entry was staged or overwritten.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Approve the five-viewport public-profile rhythm</name>
  <files>none (live verification and evidence only)</files>
  <what-built>A token-based, owner-scoped vertical rhythm for the public member profile without redesigning its cards, achievements, carousels or content.</what-built>
  <action>Rebuild or force-recreate only `team4sv30-frontend` if needed and verify it is Up. Review the populated public profile through the shared Codex in-app browser at `http://127.0.0.1:3300`. Capture full-page screenshots and a measurement manifest under this Quick's `evidence/uat/` at exactly 390x844, 768x1024, 1024x768, 1440x900 and 1920x1080. Headless checks may support but cannot replace the live shared-flow review. Do not modify backend, API, database, assets, `.env`, `media/`, other routes or global styles.</action>
  <how-to-verify>
1. At every viewport inspect the complete flow: Profil und Mitgliedschaft → Fansub-Projekte → Rollenfortschritt → Fortschritt → Punkte-Meilensteine → Beiträge → Mitgliedschaft → Besondere Auszeichnungen → Beiträge.
2. Confirm section gaps form a calm repeated rhythm, heading-to-content gaps are consistent, and no transition produces a conspicuously oversized dead zone.
3. Confirm profile/story/membership and subsequent band/card boundaries remain visually distinct without restoring removed outer backgrounds.
4. Confirm the story preview still shows eight lines, the 61.5/38.5 profile grid remains at its existing eligible width, and contribution carousel card width/peeking/arrows/swipe/keyboard behavior are unchanged.
5. Confirm headings, copy, data, card internals, artwork, surfaces, borders, shadows and approved backgrounds are unchanged.
6. Record `document.documentElement.scrollWidth &lt;= document.documentElement.clientWidth` for all five viewports in `evidence/uat/MANIFEST.md`; any clipping, letterwise wrapping or horizontal page overflow is a failure.
7. Review `git diff --cached --name-only`, cached patch, working patch and incoming hashes to confirm only exact Quick hunks would be committed and all previous dirty/index state remains intact.
  </how-to-verify>
  <verify>
    <automated>cd /home/d1sk/team4s &amp;&amp; docker compose ps team4sv30-frontend &amp;&amp; for size in 390x844 768x1024 1024x768 1440x900 1920x1080; do test -f ".planning/quick/260812-jtp-public-member-profile-vertical-spacing-r/evidence/uat/public-member-profile-spacing-${size}.png" || exit 1; grep -E "${size}.*(overflow.*PASS|scrollWidth.*clientWidth)" .planning/quick/260812-jtp-public-member-profile-vertical-spacing-r/evidence/uat/MANIFEST.md || exit 1; done &amp;&amp; git diff --check</automated>
  </verify>
  <done>The user approves the complete page at all five sizes, spacing feels deliberate and compact, no overflow exists, and every protected visual/mechanical contract remains unchanged.</done>
  <resume-signal>Stop and wait for exact standalone `approved`; any other response is feedback to address. Do not create SUMMARY.md, update STATE.md, or commit before that exact approval.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|---|---|
| Dirty worktree/index -> Quick hunks | Existing user changes in shared profile tests and other files must remain untouched. |
| Page rhythm -> component internals | Outer spacing changes must not alter card/stage/carousel geometry. |
| Responsive viewport -> document flow | Reduced gaps must not create overlap, clipping or horizontal overflow. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|---|---|---|---|---|
| T-jtp-01 | T | dirty files/index | mitigate | Incoming patches/hashes, targeted edits, exact hunk staging, index preservation and fail-closed overlap detection. |
| T-jtp-02 | D | page/component spacing ownership | mitigate | Restrict changes to existing page and BadgeChain rhythm seams; protect all component internals with tests and live UAT. |
| T-jtp-03 | D | responsive document flow | mitigate | Five exact viewport captures plus explicit scrollWidth/clientWidth measurements. |
| T-jtp-04 | R | visual acceptance | mitigate | Blocking exact `approved` checkpoint before summary/state/commit. |
| T-jtp-05 | I | public profile data | accept | CSS/test-only presentation work; no API/auth/backend/database or asset changes. |
</threat_model>

<verification>
Run the two focused Vitest files, frontend typecheck, `git diff --check`, and live in-app-browser UAT at all five exact viewport sizes. Record pre-existing failures truthfully and do not classify inherited failures as PASS. The human checkpoint is mandatory and blocks SUMMARY.md, STATE.md updates and commit.
</verification>

<success_criteria>
- The public profile uses a small existing token subset for outer section, heading-to-content and band/card rhythm.
- Large dead gaps and arbitrary transitions are removed at 390x844, 768x1024, 1024x768, 1440x900 and 1920x1080.
- Card internals, eight-line story, 61.5/38.5 profile grid, contribution carousel geometry, headings/copy/data, approved backgrounds, assets and all mechanics remain unchanged.
- No jump navigation, heading cleanup, carousel redesign, global layout change, backend/API/DB/asset work or unrelated refactor is introduced.
- Dirty worktree/index state is preserved with exact-hunk isolation and no whole-file staging.
- The user gives exact standalone `approved` before summary, state update or commit.
</success_criteria>

<source_audit>
SOURCE | ID | Feature/Requirement | Task | Status | Notes
GOAL | none | Harmonize vertical rhythm across the whole public member profile | 1-2 | COVERED | CSS contracts plus five-size UAT
REQ | jtp-01 | Reuse a small existing spacing token scale | 1 | COVERED | `--space-2` through `--space-7`, no global token edits
REQ | jtp-02 | Normalize section, heading/content and band/card separation | 1-2 | COVERED | Existing owner seams only
REQ | jtp-03 | Cover all five exact viewports without overflow | 2 | COVERED | Screenshot and measurement manifest
REQ | jtp-04 | Preserve approved geometry, copy, visuals and mechanics | 1-2 | COVERED | Explicit tests and UAT checklist
REQ | jtp-05 | Exclude navigation, heading cleanup, carousel redesign and non-UI layers | 1 | COVERED | Explicit negative scope
REQ | jtp-06 | Protect dirty hunks and index state | 1-2 | COVERED | Incoming evidence and exact hunk-only staging
CONTEXT | user agreement | User agrees spacing/dead-gap observation should be addressed | 1-2 | COVERED | No unresolved design decision
RESEARCH | existing UI system | Existing global spacing tokens and local ownership seams fit | 1 | COVERED | Level 0, no new dependency or primitive
Deferred Ideas | explicit exclusions | Jump navigation, duplicate-heading cleanup, carousel redesign | none | EXCLUDED | Must not be implemented
</source_audit>

<output>After exact standalone approval only, create `.planning/quick/260812-jtp-public-member-profile-vertical-spacing-r/260812-jtp-SUMMARY.md`, update `.planning/STATE.md` Quick Tasks Completed, and commit only the exact Quick hunks plus its artifacts. Until then, stop at the checkpoint.</output>
