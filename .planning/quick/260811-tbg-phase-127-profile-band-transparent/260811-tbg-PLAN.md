---
phase: quick-260811-tbg
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/members/[slug]/page.module.css
  - frontend/src/app/members/[slug]/page.test.tsx
autonomous: false
requirements: [260811-tbg-scope]
must_haves:
  truths:
    - "A transparent, borderless, radius-free outer profile band can be compared at 1440 and 1920."
    - "Padding, inner Story and Gruppenzugehörigkeit cards, shadows, borders, and 8:5 columns remain unchanged."
    - "Header, projects, badges, and contributions remain untouched."
    - "Nothing is finalized before the human visual choice."
  artifacts:
    - path: frontend/src/app/members/[slug]/page.module.css
      provides: Isolated profileBand candidate
    - path: frontend/src/app/members/[slug]/page.test.tsx
      provides: Focused scope regression
  key_links:
    - from: frontend/src/app/members/[slug]/page.tsx
      to: frontend/src/app/members/[slug]/page.module.css
      via: existing rhythmBand plus profileBand classes
      pattern: "rhythmBand.*profileBand"
---

<objective>
Run one reversible UAT experiment on the outer `Profil und Mitgliedschaft` band.
Purpose: Compare its current surface with a transparent candidate whose outer border and radius are removed, without changing layout or inner cards.
Output: Isolated CSS/test hunks, before/candidate screenshots at 1440 and 1920, and a blocking keep/revert choice.
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
@.planning/phases/127-besondere-auszeichnungen-kompakt-in-bestehenden-member-header-integrieren/127-CONTEXT.md
@.planning/phases/127-besondere-auszeichnungen-kompakt-in-bestehenden-member-header-integrieren/127-UAT.md
@.planning/quick/260811-pqe-phase-127-public-member-profile-visuelle/260811-pqe-PLAN.md
@.planning/quick/260811-rms-phase-127-public-member-profile-widescre/260811-rms-PLAN.md
@frontend/src/app/members/[slug]/page.tsx
@frontend/src/app/members/[slug]/page.module.css
@frontend/src/app/members/[slug]/page.test.tsx
@frontend/src/components/profile/MemberStorySection.tsx
@frontend/src/components/profile/MembershipsSection.tsx
@frontend/src/components/profile/profile.module.css
</read_first>
The only permitted seam is existing `.profileBand`. `.rhythmBand` owns padding/gap and `.profilePair` owns the established `minmax(0, 8fr) minmax(0, 5fr)` columns. Story and Memberships own their inner Cards. Add no component, token, selector family, markup, or alternate layout. Phase 127 remains incomplete.
</context>

<tasks>
<task type="auto" tdd="true">
  <name>Task 1: Isolate and render the outer-band candidate</name>
  <files>frontend/src/app/members/[slug]/page.module.css, frontend/src/app/members/[slug]/page.test.tsx</files>
  <behavior>
    - Only `profileBand` becomes transparent with no outer border or radius.
    - `rhythmBand` display, gap, min-width, and padding stay unchanged.
    - `profilePair` stays exactly 8fr/5fr with existing breakpoints.
    - Inner Story/Membership cards retain backgrounds, shadows, borders, radii, content, and spacing.
    - Header, projects, badges, contributions, MemberBadgeChain, and FocalCarousel remain byte-unchanged.
  </behavior>
  <action>
Before edits, record git status, working/cached binary diffs, incoming index tree, and target mode/blob/SHA-256 plus byte copies under this Quick's evidence directory. Existing dirty Phase 127/profile/badge/FocalCarousel work is user-owned. Abort with the exact path/hunk if new hunks overlap or cannot be isolated.

Capture the current live profile first at exactly 1440x900 and 1920x1080 as `evidence/profile-band-before-1440.png` and `profile-band-before-1920.png`. Add focused page-test assertions pinning the profileBand seam and proving rhythmBand padding, profilePair 8:5 columns, inner composition, and other band selectors are unchanged. Then make the smallest CSS-only candidate edit in `.profileBand`: transparent background plus removal of only the inherited outer border and border radius. Do not edit rhythmBand, JSX, inner cards, shadows, global Card/token files, responsive rules, or unrelated selectors.

Run checks, rebuild/force-recreate only the frontend if required, and capture `profile-band-candidate-1440.png` and `profile-band-candidate-1920.png`. Record a manifest pairing before/candidate images with the exact diff. Do not stage or commit before Task 2. Never use `git add .`, `git add -A`, whole-file staging, broad formatting, or asset staging.
  </action>
  <verify><automated>cd /home/d1sk/team4s &amp;&amp; docker compose exec -T team4sv30-frontend npm test -- --run 'src/app/members/[slug]/page.test.tsx' &amp;&amp; docker compose exec -T team4sv30-frontend npm run typecheck &amp;&amp; for f in profile-band-before-1440.png profile-band-before-1920.png profile-band-candidate-1440.png profile-band-candidate-1920.png; do test -f .planning/quick/260811-tbg-phase-127-profile-band-transparent/evidence/$f || exit 1; done &amp;&amp; git diff --check &amp;&amp; git diff --cached --check</automated></verify>
  <done>A reversible two-file candidate and paired 1440/1920 evidence exist; all protected layout and surfaces remain unchanged.</done>
</task>

<task type="checkpoint:decision" gate="blocking">
  <name>Task 2: Choose the outer-band treatment</name>
  <files>none</files>
  <decision>Keep the transparent/borderless/radius-free candidate, or revert it exactly.</decision>
  <context>Review the complete live profile via `http://127.0.0.1:3300` and paired screenshots at 1440x900 and 1920x1080. Automated tests cannot decide visual hierarchy. Stop here: do not stage, commit, summarize as complete, or alter the candidate until the user chooses.</context>
  <options>
    <option id="keep-candidate"><name>Keep candidate</name><pros>Reduces outer card-on-card framing.</pros><cons>Less explicit outer containment.</cons></option>
    <option id="revert-candidate"><name>Revert candidate</name><pros>Preserves the stronger outer boundary.</pros><cons>Keeps nested surface treatment.</cons></option>
  </options>
  <how-to-verify>
1. Compare before/candidate at 1440, then at 1920.
2. Confirm identical padding and rhythm around the heading and inner cards.
3. Confirm Story and Gruppenzugehörigkeit keep their cards, shadows, borders, and radii.
4. Confirm columns remain 8:5 and header/projects/badges/contributions are unchanged.
5. Choose keep only if visibly preferable; otherwise revert.
  </how-to-verify>
  <verify><automated>cd /home/d1sk/team4s &amp;&amp; for f in profile-band-before-1440.png profile-band-before-1920.png profile-band-candidate-1440.png profile-band-candidate-1920.png; do test -f .planning/quick/260811-tbg-phase-127-profile-band-transparent/evidence/$f || exit 1; done &amp;&amp; git diff --check</automated></verify>
  <done>The user explicitly chooses keep-candidate or revert-candidate.</done>
  <resume-signal>Select exactly `keep-candidate` or `revert-candidate`; anything else is feedback, not approval.</resume-signal>
</task>

<task type="auto">
  <name>Task 3: Apply the human choice with exact hunk isolation</name>
  <files>frontend/src/app/members/[slug]/page.module.css, frontend/src/app/members/[slug]/page.test.tsx</files>
  <action>Run only after an exact Task 2 choice. On revert, remove only experiment hunks using incoming evidence; never restore whole files over user work. On keep, retain only reviewed experiment hunks. Re-run tests, typecheck, diff checks, and protected hashes. If a commit is separately authorized, stage only selected hunks with `git add -p -- path`; cached paths must equal the two-file allow-list. Otherwise restore the incoming index exactly. Abort on inseparable hunks, unexpected paths, protected changes, or index mismatch.</action>
  <verify><automated>cd /home/d1sk/team4s &amp;&amp; docker compose exec -T team4sv30-frontend npm test -- --run 'src/app/members/[slug]/page.test.tsx' &amp;&amp; docker compose exec -T team4sv30-frontend npm run typecheck &amp;&amp; git diff --check &amp;&amp; git diff --cached --check</automated></verify>
  <done>The chosen state is retained without affecting incoming work or making an unauthorized commit.</done>
</task>
</tasks>

<threat_model>
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|---|---|---|---|---|
| T-tbg-01 | T | dirty tree/index | mitigate | Incoming patches, byte copies, blob/SHA evidence, hunk isolation, protected hashes, fail-closed staging. |
| T-tbg-02 | R | visual choice | mitigate | Named before/candidate pairs and exact blocking choice values. |
| T-tbg-03 | D | profile layout | mitigate | Preserve rhythmBand padding/gap, 8:5 columns, inner cards, and responsive rules. |
| T-tbg-04 | I | public data | accept | CSS-only experiment; no API/auth/backend/contract/DB change. |
</threat_model>

<verification>Focused page tests, typecheck, diff checks, target/protected hashes, paired 1440/1920 evidence, and explicit keep/revert choice. Missing evidence or choice leaves the Quick incomplete.</verification>
<success_criteria>Only the profileBand surface candidate and focused tests change; all named protected layout/surfaces remain unchanged; both viewport pairs are reviewed; execution stops for human choice before finalization.</success_criteria>
<source_audit>
SOURCE | ID | Requirement | Task | Status
GOAL | none | Test transparent outer profile band | 1-3 | COVERED
REQ | tbg-01 | Candidate removes outer background/border/radius only | 1-2 | COVERED
REQ | tbg-02 | Preserve padding/layout/inner cards/8:5 | 1-3 | COVERED
REQ | tbg-03 | Other page sections untouched | 1-3 | COVERED
REQ | tbg-04 | 1440 and 1920 screenshots | 1-2 | COVERED
REQ | tbg-05 | Human choice before finalization | 2-3 | COVERED
CONTEXT | Phase 127 | Preserve incomplete locked baseline | 1-3 | COVERED
RESEARCH | none | Existing local CSS seam | 1 | COVERED
</source_audit>
<output>After the exact choice and Task 3, create `.planning/quick/260811-tbg-phase-127-profile-band-transparent/260811-tbg-SUMMARY.md`. Do not mark Phase 127 complete.</output>
