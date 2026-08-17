---
phase: quick-260811-obg
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/members/[slug]/page.module.css
  - frontend/src/app/members/[slug]/page.test.tsx
autonomous: false
requirements: [260811-obg-scope]
must_haves:
  truths:
    - "All post-hero outer bands on the public member profile are transparent, borderless, and radius-free."
    - "The approved unstaged profileBand candidate is retained without claiming the superseded keep-candidate token was supplied."
    - "Inner white cards, achievement stages, carousel cards, headings/dividers, spacing, columns, hero, projects, and interactions remain unchanged."
    - "The page has no horizontal overflow at 1024 landscape, 1440, or 1920."
  artifacts:
    - path: frontend/src/app/members/[slug]/page.module.css
      provides: Local outer-band treatment
    - path: frontend/src/app/members/[slug]/page.test.tsx
      provides: Focused CSS and composition contract tests
  key_links:
    - from: frontend/src/app/members/[slug]/page.tsx
      to: frontend/src/app/members/[slug]/page.module.css
      via: existing rhythmBand plus semantic band classes
      pattern: "rhythmBand.*(profileBand|projectsBand|badgesBand|contributionsBand)"
---

<objective>
Finalize the visually approved transparent `profileBand` direction and apply the same outer-shell treatment to the projects, achievements, and contributions bands on the public member profile only.

Purpose: Remove dark/gray/beige outer framing while preserving all meaningful inner surfaces, layout, hierarchy, and behavior.
Output: Two isolated CSS/test hunks and live UAT evidence at 1024x768, 1440x900, and 1920x1080; no application changes outside this route.
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
@.planning/quick/260811-tbg-phase-127-profile-band-transparent/260811-tbg-PLAN.md
@.planning/quick/260811-tbg-phase-127-profile-band-transparent/evidence/MANIFEST.md
@.planning/quick/260811-tbg-phase-127-profile-band-transparent/evidence/candidate.diff
@frontend/src/app/members/[slug]/page.tsx
@frontend/src/app/members/[slug]/page.module.css
@frontend/src/app/members/[slug]/page.test.tsx
@frontend/src/components/profile/profile.module.css
@frontend/src/components/profile/MemberStorySection.tsx
@frontend/src/components/profile/MembershipsSection.tsx
@frontend/src/components/profile/MemberCurrentProjectsSection.tsx
@frontend/src/components/profile/MemberBadgeChain.tsx
@frontend/src/components/ui/FocalCarousel.tsx
</read_first>

<interfaces>
The page composes four outer content shells from `.rhythmBand` plus `.profileBand`, `.projectsBand`, `.badgesBand`, or `.contributionsBand`. `.rhythmBand` owns layout, gap, responsive padding, border, and radius; only the semantic band classes may neutralize that outer surface. The separate `aria-label="Profilkopf"` hero is excluded. Child components own all white cards, achievement stages, carousel cards, borders, radii, shadows, and interactions.

The earlier Quick left an unstaged, visually approved `.profileBand` hunk and truthful 1440/1920 evidence. The current user instruction approves that direction; retain it without requiring or claiming the earlier plan's literal `keep-candidate` response.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Apply and protect the transparent outer-band contract</name>
  <files>frontend/src/app/members/[slug]/page.module.css, frontend/src/app/members/[slug]/page.test.tsx</files>
  <behavior>
    - `profileBand`, `projectsBand`, `badgesBand`, and `contributionsBand` have transparent backgrounds, zero outer border, and zero outer radius.
    - `rhythmBand` keeps display, gap, min-width, and desktop/mobile padding.
    - Profile 8:5 columns, contribution present/empty columns, headings/dividers, badge breakout, responsive transitions, and page markup remain unchanged.
    - Story, membership, project, achievement-stage, carousel, and contribution inner surfaces and interactions remain intact.
  </behavior>
  <action>
Before editing, run `git status --short` and `docker compose ps`. Save incoming working/cached binary diffs, cached paths/blobs, and SHA-256 snapshots for both target files under this Quick's `evidence/`. All incoming Phase 121-127, profile, badge-asset, MemberBadgeChain, and FocalCarousel work is user-owned. Compare the earlier `candidate.diff` to the live files and record whether its profileBand hunk is already present. Abort with the exact path/hunk if isolation is not possible.

First extend the focused page test. Assert the four semantic band rules each provide `background: transparent`, `border: 0`, and `border-radius: 0`. Pin unchanged rhythmBand gap and responsive padding; profile and contribution grids; projects heading divider; badge visual-width breakout; and existing page class composition. Use focused source-contract checks for the existing inner Card/stage/carousel seams, not full-file snapshots or duplicated implementations.

Then retain the approved profileBand treatment and give projectsBand, badgesBand, and contributionsBand the same transparent/borderless/radius-free treatment, removing only their former outer backgrounds. Do not edit rhythmBand, JSX, the hero, child components, global Cards/tokens, headings/dividers, padding/gaps, grids, breakpoints, breakout behavior, or interactions. Add no component, token, selector family, or other-route change. The inherited page-level `overflow-wrap: anywhere` is outside this cleanup; report it rather than broadening scope.

Use targeted edits only. Never use broad formatting, `git add .`, `git add -A`, or whole-file staging. If staging is separately required, use `git add -p -- <exact-path>`, allow only reviewed hunks in these two files, and restore the incoming index byte-for-byte unless a parent workflow separately authorizes a commit.
  </action>
  <verify><automated>cd /home/d1sk/team4s &amp;&amp; docker compose exec -T team4sv30-frontend npm test -- --run 'src/app/members/[slug]/page.test.tsx' &amp;&amp; docker compose exec -T team4sv30-frontend npm run typecheck &amp;&amp; git diff --check &amp;&amp; git diff --cached --check</automated></verify>
  <done>All four outer bands share the approved treatment, named inner/layout contracts are protected, and unrelated dirty work/index state is unchanged.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Approve the complete public-profile cleanup</name>
  <files>none (live verification and evidence only)</files>
  <what-built>The approved profile-band direction extended to projects, achievements, and contributions outer bands while preserving every inner surface and interaction.</what-built>
  <action>Rebuild or force-recreate only `team4sv30-frontend` if needed, confirm it is Up, and review the populated public member profile through the shared Codex in-app browser at `http://127.0.0.1:3300`. Capture full-page evidence under this Quick at exactly 1024x768, 1440x900, and 1920x1080. Headless evidence may support but cannot replace live review. Do not alter backend, databases, Redis, Keycloak, `.env`, `media/`, assets, or other routes.</action>
  <how-to-verify>
1. Review the whole page from hero through contributions at 1024x768 landscape, 1440x900, and 1920x1080.
2. Confirm every post-hero outer band is transparent, borderless, and radius-free, while the header hero is unchanged.
3. Confirm Story, Gruppenzugehörigkeit, project cards, achievement stages, carousel cards, and contribution cards retain white surfaces, borders/radii/shadows, content, and spacing.
4. Confirm headings, wine dividers, outer padding, 8:5 profile columns where geometry permits, contribution columns, badge breakout, and responsive transitions are unchanged.
5. Exercise project links/buttons and carousel pointer/keyboard controls sufficiently to prove interaction remains intact.
6. At each viewport record `document.documentElement.scrollWidth <= document.documentElement.clientWidth` in `evidence/MANIFEST.md`; overflow is a failure.
7. Record that the prior unstaged profile candidate was incorporated from existing evidence without claiming its old literal resume token.
  </how-to-verify>
  <verify><automated>cd /home/d1sk/team4s &amp;&amp; docker compose ps team4sv30-frontend &amp;&amp; for f in public-profile-transparent-bands-1024x768.png public-profile-transparent-bands-1440x900.png public-profile-transparent-bands-1920x1080.png MANIFEST.md; do test -f .planning/quick/260811-obg-public-member-profile-outer-bands-transparent/evidence/$f || exit 1; done &amp;&amp; grep -E '1024x768.*(overflow.*PASS|scrollWidth.*clientWidth)' .planning/quick/260811-obg-public-member-profile-outer-bands-transparent/evidence/MANIFEST.md &amp;&amp; grep -E '1440x900.*(overflow.*PASS|scrollWidth.*clientWidth)' .planning/quick/260811-obg-public-member-profile-outer-bands-transparent/evidence/MANIFEST.md &amp;&amp; grep -E '1920x1080.*(overflow.*PASS|scrollWidth.*clientWidth)' .planning/quick/260811-obg-public-member-profile-outer-bands-transparent/evidence/MANIFEST.md &amp;&amp; git diff --check</automated></verify>
  <done>The complete live page is approved at all required sizes, with no horizontal overflow and all protected inner/layout/interaction contracts intact.</done>
  <resume-signal>Stop and wait for exact standalone `approved`; any other response is feedback to address.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|---|---|
| Dirty tree/index -> Quick hunks | Existing user work must remain isolated. |
| Outer bands -> child surfaces | Outer cleanup must not cascade into cards, stages, or carousels. |
| Viewport -> page layout | Real content must not cause clipping or page overflow. |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|---|---|---|---|---|
| T-obg-01 | T | dirty files/index | mitigate | Binary patches, blob/hash evidence, exact allow-list, hunk-only edits/staging, fail closed on overlap, restore index. |
| T-obg-02 | R | prior approval | mitigate | Cite current instruction and earlier evidence; do not claim the old exact token. |
| T-obg-03 | D | inner composition | mitigate | Focused CSS/source tests and whole-page live review at three sizes. |
| T-obg-04 | D | responsive width | mitigate | Preserve layout rules and record scrollWidth/clientWidth at every viewport. |
| T-obg-05 | I | public data | accept | CSS/test-only presentation change; no API/auth/backend/DB work. |
</threat_model>

<verification>
Run focused page tests, typecheck, working/cached diff checks, and isolation checks from `/home/d1sk/team4s`. Record inherited nonzero baselines truthfully; never call them PASS. Recreate only the frontend for three-size live UAT. Stop for exact human approval; actual visual ambiguity is feedback to resolve inside this scope.
</verification>

<success_criteria>
- All four post-hero outer bands use the approved transparent/borderless/radius-free treatment on this route only.
- Every named inner surface, heading/divider, spacing/padding, column layout, hero, project card, and interaction is preserved.
- Focused tests and live UAT at 1024x768, 1440x900, and 1920x1080 pass with no document overflow.
- Dirty work and index state remain protected; no whole-file or unrelated staging occurs.
</success_criteria>

<source_audit>
SOURCE | ID | Feature/Requirement | Task | Status | Notes
GOAL | none | Apply approved transparent outer treatment to all post-hero public-profile bands | 1-2 | COVERED | Existing four semantic seams
REQ | obg-01 | Remove outer backgrounds/borders/radii | 1 | COVERED | Same treatment as approved candidate
REQ | obg-02 | Preserve inner cards/stages/carousels and interactions | 1-2 | COVERED | Tests plus live review
REQ | obg-03 | Preserve headings/dividers, spacing, columns, hero, projects | 1-2 | COVERED | Explicit contracts
REQ | obg-04 | Public member profile only; no redesign/other routes | 1 | COVERED | Two local files
REQ | obg-05 | 1024 landscape, 1440, 1920 UAT and no overflow | 2 | COVERED | Exact evidence and measurements
REQ | obg-06 | Dirty-tree hunk isolation/no whole-file staging | 1 | COVERED | Fail-closed evidence workflow
CONTEXT | approved candidate | Incorporate unstaged direction without claiming old token | 1-2 | COVERED | Current instruction is approval source
RESEARCH | existing seams | Reuse four semantic classes | 1 | COVERED | No new abstraction
Deferred Ideas | none | No deferred items supplied | none | EXCLUDED | No scope reduction
</source_audit>

<output>After exact approval, create `.planning/quick/260811-obg-public-member-profile-outer-bands-transparent/260811-obg-SUMMARY.md`. Do not mark Phase 127 complete or claim the old Quick received its literal keep-candidate token.</output>
