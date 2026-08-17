---
phase: quick-260811-pqe
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/members/[slug]/page.tsx
  - frontend/src/app/members/[slug]/page.module.css
  - frontend/src/app/members/[slug]/page.test.tsx
  - frontend/src/components/profile/profile.module.css
  - frontend/src/components/profile/MembershipsSection.test.tsx
  - frontend/src/components/profile/MemberCurrentProjectsSection.module.css
  - frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx
  - frontend/src/components/profile/LatestContributionsSection.module.css
  - frontend/src/components/profile/LatestContributionsSection.test.tsx
  - frontend/src/components/profile/PreviousContributionsSection.module.css
  - frontend/src/components/profile/PreviousContributionsSection.test.tsx
  - frontend/src/components/profile/MemberBadgeChain.tsx
  - frontend/src/components/profile/MemberBadgeChain.test.tsx
autonomous: false
requirements: [260811-pqe-scope]

must_haves:
  truths:
    - "Profilgeschichte und Gruppenzugehörigkeit form a balanced approximately 60/40 desktop composition without character-by-character wrapping, and stack at full usable width on mobile."
    - "Current projects retain the existing public data and whole-card link while gaining a modest, consistent hierarchy, two-column desktop grid, one-column mobile grid, and aligned count/load control."
    - "Latest contributions use available desktop width when previous history is empty; both sections remain visible in a balanced split when history exists."
    - "Large contribution media previews are visually bounded and text/media cards share a consistent rhythm without changing original-detail access."
    - "Main and subsection headings, dividers, and vertical spacing are distinguishable through existing SectionHeader/Card/token seams; completed achievement geometry and behavior remain unchanged."
    - "The general-awards count receives a truthful explicit noun/status label only after its generalCatalog/earnedCodes resolver semantics are pinned by tests."
    - "Phase 127 header specials receive regression checks only; no header, achievement, API, backend, database, or design-system redesign is introduced."
  artifacts:
    - path: frontend/src/app/members/[slug]/page.module.css
      provides: Profile/contribution responsive composition and page rhythm
    - path: frontend/src/components/profile/profile.module.css
      provides: Membership card intrinsic sizing and readable wrapping
    - path: frontend/src/components/profile/MemberCurrentProjectsSection.module.css
      provides: Modest project-card/grid/footer polish
    - path: frontend/src/components/profile/LatestContributionsSection.module.css
      provides: Bounded media preview and unified card rhythm
    - path: frontend/src/components/profile/MemberBadgeChain.tsx
      provides: Resolver-backed truthful general-awards label
  key_links:
    - from: frontend/src/app/members/[slug]/page.tsx
      to: frontend/src/app/members/[slug]/page.module.css
      via: history-aware contribution modifier and profile/contribution pair classes
      pattern: "previousContributionsCount|sectionPair"
    - from: frontend/src/components/profile/MembershipsSection.tsx
      to: frontend/src/components/profile/profile.module.css
      via: membershipLink/membershipName/membershipAction intrinsic sizing rules
      pattern: "membership(Link|Name|Action)"
    - from: frontend/src/components/profile/MemberBadgeChain.tsx
      to: generalCatalog and earnedCodes
      via: earnedCount/denominator label derives from exactly the rendered non-role catalog
      pattern: "generalCatalog|earnedCount"
---

<objective>
Repair the visible layout and consistency defects across the existing public member profile without expanding Phase 127 or redesigning completed achievement systems.

Purpose: Make the full public profile read as one coherent product at phone, tablet, desktop, and wide-desktop sizes while preserving all existing data and domain behavior.
Output: Focused page/component CSS, the smallest necessary render/class/label changes, regression tests, deterministic dirty-worktree isolation evidence, nine required screenshots, whole-page live UAT, and a post-approval report.
</objective>

<execution_context>
@C:/Users/admin/.codex/get-shit-done/workflows/execute-plan.md
@C:/Users/admin/.codex/get-shit-done/templates/summary.md
</execution_context>

<context>
<read_first>
@AGENTS.md
@.planning/STATE.md
@docs/engineering/implementation-contract.md
@docs/frontend/ui-system.md
@docs/agent-guidelines-ui.md
@.planning/phases/127-besondere-auszeichnungen-kompakt-in-bestehenden-member-header-integrieren/127-UAT.md
@.planning/phases/127-besondere-auszeichnungen-kompakt-in-bestehenden-member-header-integrieren/127-01-SUMMARY.md
@.planning/phases/127-besondere-auszeichnungen-kompakt-in-bestehenden-member-header-integrieren/127-02-SUMMARY.md
@frontend/src/app/members/[slug]/page.tsx
@frontend/src/app/members/[slug]/page.module.css
@frontend/src/app/members/[slug]/page.test.tsx
@frontend/src/components/profile/MemberStorySection.tsx
@frontend/src/components/profile/MemberStorySection.module.css
@frontend/src/components/profile/MemberStorySection.test.tsx
@frontend/src/components/profile/MembershipsSection.tsx
@frontend/src/components/profile/profile.module.css
@frontend/src/components/profile/MembershipsSection.test.tsx
@frontend/src/components/profile/MemberCurrentProjectsSection.tsx
@frontend/src/components/profile/MemberCurrentProjectsSection.module.css
@frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx
@frontend/src/components/profile/LatestContributionsSection.tsx
@frontend/src/components/profile/LatestContributionsSection.module.css
@frontend/src/components/profile/LatestContributionsSection.test.tsx
@frontend/src/components/profile/PreviousContributionsSection.tsx
@frontend/src/components/profile/PreviousContributionsSection.module.css
@frontend/src/components/profile/PreviousContributionsSection.test.tsx
@frontend/src/components/profile/MemberBadgeChain.tsx
@frontend/src/components/profile/memberBadgeLabels.ts
@frontend/src/components/profile/MemberBadgeChain.module.css
@frontend/src/components/profile/MemberBadgeChain.test.tsx
@frontend/src/components/profile/MemberProfileHero.tsx
@frontend/src/components/profile/MemberProfileHero.test.tsx
@frontend/src/components/ui/SectionHeader.tsx
@frontend/src/components/ui/SectionHeader.module.css
@frontend/src/components/ui/SectionHeader.test.tsx
@frontend/src/components/ui/Card.tsx
@frontend/src/components/ui/FocalCarousel.tsx
@frontend/src/components/ui/FocalCarousel.test.tsx
@frontend/src/components/fansubs/FansubProjectsGrid.tsx
@frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx
</read_first>

Observed implementation seams: `MemberProfilePage` already owns the profile/project/badge/contribution ordering and knows `previousContributionsCount`; `.sectionPair` currently forces equal columns and broadly applies `overflow-wrap:anywhere`; `MembershipsSection` reuses global `Card` and its `membershipLink` currently combines `52px minmax(0,1fr) auto`; `MemberCurrentProjectsSection` already owns the two-column grid, whole-card link, footer count/button, and near-viewport skeleton; `LatestContributionsSection` already has distinct `.textCard`, `.mediaCard`, and `.mediaPreview`; `PreviousContributionsSection` already exposes the required scoped empty state; `SectionHeader`/`Card` are the global hierarchy primitives; `MemberBadgeChain` computes `earnedCount` from `generalCatalog.filter(earnedCodes)` and its denominator from `generalCatalog.length`.

Scope is locked to presentation and regression coverage. Do not add components, endpoints, API calls, DTOs, backend/DB changes, new tokens, new data requirements, project cover assumptions, masonry/gallery/navigation systems, or achievement/header redesign. Do not change badge heroes, tracks, geometry, progress logic, previews, carousel behavior, or Membership Stage. Phase 127 remains incomplete and its missing fixtures/device approval must not be claimed by this Quick.
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Isolate the dirty baseline and repair profile membership composition</name>
  <files>frontend/src/app/members/[slug]/page.module.css, frontend/src/app/members/[slug]/page.test.tsx, frontend/src/components/profile/profile.module.css, frontend/src/components/profile/MembershipsSection.test.tsx</files>
  <behavior>
    - At desktop widths the existing story/membership pair uses a bounded approximately 60/40 track (for example `minmax(0, 3fr) minmax(20rem, 2fr)`) with both children intrinsically shrinkable.
    - Group name, status, period, and Zur Gruppe remain readable as words/lines; no inherited `overflow-wrap:anywhere` produces character-by-character wrapping.
    - At 760px and below the two sections stack in one column at full usable width without horizontal overflow.
    - Existing Card, SectionHeader, ResponsiveImage, membership link, labels, and routes remain the only seams.
  </behavior>
  <action>
    Before any edit, create `.planning/quick/260811-pqe-phase-127-public-member-profile-visuelle/evidence/incoming/`; record `git status --short`, `git diff --binary`, `git diff --cached --binary`, `git ls-files -s`, and SHA-256 hashes plus byte copies for every declared source/test path and all protected paths. Protected paths include all `frontend/public/history-event-badges-transparent/**`, all `frontend/public/member-achievement-badges/**`, `frontend/src/components/ui/FocalCarousel.{tsx,module.css,test.tsx}`, `.env`, `media/**`, backend, contracts, and generated assets. Record the incoming index tree (`git write-tree`) without modifying it. If any target already contains unrelated dirty hunks, preserve a deterministic per-file incoming binary patch and blob hash before editing; if the requested hunk cannot be separated from incoming work, abort and report the exact path/hunk instead of overwriting it.

    Add failing CSS/DOM contract tests first. In the existing page composition stylesheet, replace the generic equal-column behavior with explicit profile-pair and contribution-pair modifiers rather than changing every pair identically; stop applying word-breaking to every direct child. Give the profile pair a balanced roughly 60/40 desktop layout with a meaningful membership minimum and retain the existing one-column mobile breakpoint. In `profile.module.css`, keep the existing global Card/link markup but make `membershipLink`, `membershipName`, labels, and action use safe intrinsic sizing/wrapping (`min-width:0`, normal word wrapping, and an action placement that does not starve the name column); preserve the 52px logo and keyboard focus. Do not duplicate MembershipsSection or create a new card.
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s &amp;&amp; docker compose exec -T team4sv30-frontend npm test -- --run 'src/app/members/[slug]/page.test.tsx' src/components/profile/MemberStorySection.test.tsx src/components/profile/MembershipsSection.test.tsx &amp;&amp; git diff --check</automated>
  </verify>
  <done>Tests pin the desktop balanced profile pair, mobile stack, and word-safe membership layout; incoming dirty state and protected files have deterministic restore evidence.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Polish projects, dynamic contributions, media rhythm, and section hierarchy</name>
  <files>frontend/src/app/members/[slug]/page.tsx, frontend/src/app/members/[slug]/page.module.css, frontend/src/app/members/[slug]/page.test.tsx, frontend/src/components/profile/MemberCurrentProjectsSection.module.css, frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx, frontend/src/components/profile/LatestContributionsSection.module.css, frontend/src/components/profile/LatestContributionsSection.test.tsx, frontend/src/components/profile/PreviousContributionsSection.module.css, frontend/src/components/profile/PreviousContributionsSection.test.tsx</files>
  <behavior>
    - Projects remain two columns on desktop and one on mobile, with equal-height cards, clearer title/group/chip hierarchy, modest spacing, and a footer whose count and existing Weitere Projekte laden button align to the grid.
    - When `previousContributionsCount &gt; 0`, latest/history use a balanced approximately 60/40 desktop grid; when it is zero, latest uses the wide primary track and the existing previous-history empty state becomes a compact secondary block rather than reserving half the page.
    - Media previews retain the existing image and detail path, `object-fit:cover`, and responsive image delivery but have a bounded desktop preview height/aspect treatment so one image does not dominate the page.
    - Text and media contribution cards share gaps, padding, metadata rhythm, and surface hierarchy without a masonry/gallery rewrite.
    - Main section headers retain the stronger existing underline; H3 subsection headings remain quieter, and band/card spacing uses existing spacing, surface, border, radius, and shadow tokens.
  </behavior>
  <action>
    Add tests before implementation for project grid/footer/content invariants, both contribution-history states, media bounding, and main-vs-subsection hierarchy. In `MemberProfilePage`, derive only a present/empty history class from the already-computed `previousContributionsCount`; do not fetch or transform data. Apply the class to the contribution pair so present history gets a roughly 60/40 grid and empty history gives the latest feed the primary width with a compact empty-history companion (stack both at tablet/mobile when the existing breakpoints require it). Keep `PreviousContributionsSection` as the empty-state owner.

    Refine only the existing project CSS classes (`projectList`, `projectCard`, `projectBody`, `projectTitleRow`, `chipRow`, `projectFooter`) and existing contribution CSS classes. Preserve whole-card links, `PROJECT_PAGE_SIZE`, `getMemberProjects`, loading/error handling, skeleton layers, aria names, count text, Button, Badge, Card, and ResponsiveImage. Bound `.mediaPreview` on desktop with an existing-token-compatible max height/aspect/object-fit composition and remove that bound where necessary on small screens. Use existing `.rhythmBand`, `SectionHeader`, H3 headings, global `Card` variants, and tokens to distinguish main dividers from subsections; do not edit SectionHeader or global tokens unless an existing contract is broken and the same result cannot be achieved locally.
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s &amp;&amp; docker compose exec -T team4sv30-frontend npm test -- --run 'src/app/members/[slug]/page.test.tsx' src/components/profile/MemberCurrentProjectsSection.test.tsx src/components/profile/LatestContributionsSection.test.tsx src/components/profile/PreviousContributionsSection.test.tsx src/components/ui/SectionHeader.test.tsx &amp;&amp; git diff --check</automated>
  </verify>
  <done>Projects, contribution states, media cards, and section rhythm satisfy the requested responsive composition using existing components/data and no new system.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Make the general-awards label truthful and run the complete protected regression</name>
  <files>frontend/src/components/profile/MemberBadgeChain.tsx, frontend/src/components/profile/MemberBadgeChain.test.tsx</files>
  <behavior>
    - Tests prove the numerator is the count of `generalCatalog` entries whose badge codes are in `earnedCodes`, and the denominator is exactly `generalCatalog.length` after role exclusion/catalog merge.
    - Only after that proof, visible and accessible copy explicitly states what the count means (for example `14 von 15 Auszeichnungen freigeschaltet`) with correct German umlauts.
    - Header specials are checked only for compactness, name/banner dominance, deduplication, and overflow regression; their implementation is not redesigned.
    - Phase 121 roles, Phase 123 anime projects, Phase 124 points, Phase 125 contribution badges, Phase 126 membership, Phase 127 header specials, FocalCarousel, and FansubProjectsGrid retain their current contracts; inherited failures are reported truthfully and never called PASS.
  </behavior>
  <action>
    Extend the existing MemberBadgeChain tests to pin the actual `generalCatalog`/`earnedCodes` meaning before changing the two progress strings in `MemberBadgeChain.tsx`. Choose copy that truthfully names unlocked/earned awards and update the matching aria-label; do not change resolver inputs, catalog membership, earned calculation, percentages, family rendering, badge geometry, or special suppression. Add no Phase 127 production edit: run its existing MemberProfileHero/page assertions as regression only.

    Before validation/staging, regenerate exact outgoing binary patches against both the working-tree incoming byte copies and the incoming index for every declared path. Stage only reviewed task hunks with `git diff -- path`, `git add -p -- path`, and `git diff --cached --check`; never use `git add .`, `git add -A`, whole-file staging, or stage a binary/asset path. Require `git diff --cached --name-only` to equal the exact intended path allow-list and record `.planning/quick/260811-pqe-phase-127-public-member-profile-visuelle/evidence/cached-delta.patch`, `cached-paths.txt`, and `cached-indexed-blobs.txt` containing mode/blob IDs plus SHA-256 for each cached path. Re-hash every protected path and compare to incoming. Restore the original index after each isolated validation/commit transaction using the saved incoming index/blob manifest while leaving the working tree intact; verify `git diff --cached --binary` is byte-equal to the incoming cached patch. If any hunk is inseparable, any protected badge/FocalCarousel/generated asset changes, any path escapes the allow-list, or exact index restoration fails, abort before commit and report it. This plan does not authorize a commit unless the parent executor separately requests one.
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s &amp;&amp; docker compose exec -T team4sv30-frontend npm test -- --run 'src/app/members/[slug]/page.test.tsx' src/components/profile/MemberProfileHero.test.tsx src/components/profile/MemberStorySection.test.tsx src/components/profile/MembershipsSection.test.tsx src/components/profile/MemberCurrentProjectsSection.test.tsx src/components/profile/LatestContributionsSection.test.tsx src/components/profile/PreviousContributionsSection.test.tsx src/components/profile/MemberBadgeChain.test.tsx src/components/profile/memberBadgeLabels.test.ts src/components/ui/SectionHeader.test.tsx src/components/ui/FocalCarousel.test.tsx src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx &amp;&amp; docker compose exec -T team4sv30-frontend npm run typecheck &amp;&amp; docker compose exec -T team4sv30-frontend npm run lint &amp;&amp; docker compose run --rm --no-deps -T -e NODE_ENV=production -v "$PWD/frontend/.next:/app/.next" team4sv30-frontend npm run build &amp;&amp; git diff --check &amp;&amp; git diff --cached --check</automated>
  </verify>
  <done>The label is resolver-proven and truthful, all relevant profile/shared regressions have been executed, protected hashes match, exact cached-path/blob/hash evidence exists, and the original index is restored without whole-file staging.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Approve the complete public profile at six viewports</name>
  <files>none (human verification and evidence capture only)</files>
  <what-built>A cohesive responsive public profile with repaired membership wrapping, modest project polish, history-aware contributions, bounded media rhythm, quieter subsection hierarchy, and resolver-backed award copy.</what-built>
  <action>Rebuild and force-recreate only `team4sv30-frontend`, confirm it is Up, then use the shared Codex in-app browser through the user-visible route at `http://127.0.0.1:3300` and the populated public profile. Headless checks may support but cannot replace whole-page live UAT. Capture truthful evidence only; do not fabricate missing states. Preserve Phase 127's incomplete status.</action>
  <how-to-verify>
    1. Capture full-page screenshots named exactly `public-profile-390.png`, `public-profile-768.png`, `public-profile-1024.png`, `public-profile-1440.png`, `public-profile-1920.png`, and `public-profile-2560.png` at 390x844, 768x1024, 1024x768, 1440x900, 1920x1080, and 2560x1440.
    2. At 1440 or 1920 capture `profile-membership-desktop.png`, showing the repaired roughly 60/40 story/group composition, readable group/status/period/link, and the recorded before-image beside or referenced by the evidence manifest.
    3. Capture `projects-desktop.png`, showing the two-column grid, modest card hierarchy, equal rhythm, aligned visible count, and stable Weitere Projekte laden control.
    4. Capture `contributions-desktop.png`, showing latest contributions using the primary width and the empty `Frühere Mitwirkungen` state not reserving half the page; record before/after evidence. If a truthful history-present fixture exists, also verify the balanced two-column state without replacing any of the nine required names.
    5. At 390x844 verify header, membership, projects, achievements, and contributions stack without horizontal page scroll, squeezed grids, character wrapping, or clipped cards. At both tablet orientations verify the responsive switch points. At 1440/1920/2560 verify readable line lengths, reduced empty space, and unchanged bounded achievement stages.
    6. Review the whole page in order—header, profile/membership, projects, every achievement family, contributions—not isolated components. Confirm banner/name remain dominant, Phase 127 specials do not overflow, and badge/FocalCarousel geometry/behavior is unchanged.
    7. Inspect large media preview height, `object-fit`, card rhythm, main/subsection divider strength, vertical spacing, and the truthful general-awards wording. Confirm original media remains reachable through its existing path.
    8. Review the evidence manifest, before/after pairs, automated ledger, exact cached path/blob/hash evidence, protected hash comparison, restored index proof, and `git diff --check` result.
  </how-to-verify>
  <verify>
    <automated>cd /home/d1sk/team4s &amp;&amp; docker compose ps team4sv30-frontend &amp;&amp; test -f .planning/quick/260811-pqe-phase-127-public-member-profile-visuelle/evidence/public-profile-390.png &amp;&amp; test -f .planning/quick/260811-pqe-phase-127-public-member-profile-visuelle/evidence/public-profile-768.png &amp;&amp; test -f .planning/quick/260811-pqe-phase-127-public-member-profile-visuelle/evidence/public-profile-1024.png &amp;&amp; test -f .planning/quick/260811-pqe-phase-127-public-member-profile-visuelle/evidence/public-profile-1440.png &amp;&amp; test -f .planning/quick/260811-pqe-phase-127-public-member-profile-visuelle/evidence/public-profile-1920.png &amp;&amp; test -f .planning/quick/260811-pqe-phase-127-public-member-profile-visuelle/evidence/public-profile-2560.png &amp;&amp; test -f .planning/quick/260811-pqe-phase-127-public-member-profile-visuelle/evidence/profile-membership-desktop.png &amp;&amp; test -f .planning/quick/260811-pqe-phase-127-public-member-profile-visuelle/evidence/projects-desktop.png &amp;&amp; test -f .planning/quick/260811-pqe-phase-127-public-member-profile-visuelle/evidence/contributions-desktop.png &amp;&amp; git diff --check</automated>
  </verify>
  <done>The user has reviewed the complete live page, nine named screenshots and before/after evidence, and explicitly approved the result.</done>
  <resume-signal>Stop and wait for the exact standalone human response `approved`; any other response is feedback to address, not approval.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Existing public profile API data → browser layout | Already-public strings, counts, images, and arrays drive responsive presentation; no transport or ownership changes are allowed. |
| Dirty working tree/index → scoped Quick transaction | Phase 121–127 and asset work coexists with target files and must not be overwritten, staged, or misattributed. |
| Browser viewport/media → responsive layout | Untrusted content lengths and six viewport sizes must not create overflow, starvation, or inaccessible controls. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260811-01 | T | dirty worktree/index isolation | mitigate | Incoming/outgoing binary patches, byte copies, blob/mode/SHA manifests, hunk-only staging, exact allow-list, protected hashes, and deterministic index restoration; abort on inseparable hunks. |
| T-260811-02 | D | membership/project/contribution responsive grids | mitigate | Intrinsic `minmax(0,…)` sizing, word-safe wrapping, explicit stack breakpoints, CSS/DOM tests, and six-viewport live whole-page UAT. |
| T-260811-03 | I | public contribution/media rendering | accept | No new data or API surface; preserve existing ResponsiveImage/detail link and validate only presentation. |
| T-260811-04 | T | general-awards copy | mitigate | Resolver-level tests prove numerator/denominator semantics before copy changes; progress math/catalog remain unchanged. |
| T-260811-05 | D | shared achievements/carousels | mitigate | No redesign/edit outside the label seam; full MemberBadgeChain, FocalCarousel, FansubProjectsGrid, Phase 127 hero/page regression and live whole-page review. |
</threat_model>

<verification>
- Run the full focused public-profile/shared regression, typecheck, lint, isolated production build, `git diff --check`, and cached diff check from `/home/d1sk/team4s` through Docker Compose.
- Rebuild/recreate only the frontend for UAT; do not touch backend, DB, Redis, Keycloak, `.env`, `media`, badge assets, or production milestone assets.
- Capture all six full-page viewport screenshots and three named desktop detail screenshots, plus documented membership and contribution before/after evidence.
- Treat every inherited Phase 121–127 failure as inherited only when its signature matches the incoming ledger; never mark a nonzero command PASS. Phase 127 remains incomplete.
- Require exact path allow-list, indexed blob/mode/SHA evidence, protected hash equality, restored incoming index, and no whole-file staging.
- Stop at the blocking live UAT until the human sends exact standalone `approved`.
- After approval, create the summary with exactly these 20 sections: Ausgangslage; Profil und Mitgliedschaft; Gruppenzugehörigkeit; Aktuelle Projekte; Beiträge; Dynamische Empty-State-Layouts; Section-Hierarchie; Spacing und Seitenrhythmus; Allgemeine Auszeichnungen; Desktop; Tablet; Mobile; Geänderte Dateien; Tests; Live-UAT; Evidence; Shared Regression; Nicht umgesetzte größere Folgeideen; Offene Punkte; Fazit. Then answer: (1) whether the desktop group card is fully repaired, (2) whether story/group now feel balanced, (3) whether empty contribution states use space sensibly, (4) whether old/new profile areas are materially more consistent, and (5) which remaining areas justify a later redesign scope.
</verification>

<success_criteria>
- No character-by-character membership wrapping; desktop is balanced and mobile stacks cleanly.
- Projects retain behavior/data while presenting a modest public-profile hierarchy and stable responsive grid/footer.
- Contribution layout responds to history presence, media previews are bounded, and contribution cards share a coherent rhythm.
- Existing tokens/components express main/subsection hierarchy and spacing; achievements and header specials receive regression-only treatment.
- General-awards copy is demonstrably accurate.
- Dirty Phase 121–127 work, FocalCarousel, badge assets, production milestone assets, generated assets, host data, and original index are preserved exactly.
- Automated gates, nine screenshots, before/after proof, whole-page live UAT, exact approval, and the required 20-section/five-answer report are complete.
</success_criteria>

<source_audit>
SOURCE | ID | Feature/Requirement | Task | Status | Notes
GOAL | 1-35 | Whole public profile visual consistency without new feature/system | 1-4 | COVERED | All supplied sections mapped to implementation, regression, evidence, approval, and reporting
REQ | 3-5,18-20,23-24,33 | Membership wrapping, 60/40 desktop, mobile/tablet/wide layouts | 1,4 | COVERED | Exact existing membership/page seams
REQ | 6-7,25,33 | Modest project hierarchy/grid/button/count | 2,4 | COVERED | Existing component, Card/Button/Badge and footer retained
REQ | 8-11,26,33 | Dynamic contribution columns, card/media rhythm | 2,4 | COVERED | Existing empty-state owner and current contribution cards retained
REQ | 12-14,33 | Main/subsection divider and spacing hierarchy | 2,4 | COVERED | Existing SectionHeader/Card/tokens only
REQ | 15 | Truthful general-awards label after resolver check | 3,4 | COVERED | `generalCatalog`/`earnedCodes` proof first
REQ | 16-17,27 | Achievement preservation and header-special regression only | 3,4 | COVERED | No redesign/production header edit
REQ | 21-22,31 | No data/API/backend/DB or scope creep; reuse first | 1-3 | COVERED | Explicit exclusions and analogs
REQ | 28-30 | Six viewports, nine screenshots, before/after evidence | 4 | COVERED | Exact names and dimensions
REQ | 32 | Preserve heavily dirty worktree | 1,3 | COVERED | Binary patches, hashes, hunk staging, index restore/abort
REQ | 34 | Blocking whole-page human UAT | 4 | COVERED | Exact standalone `approved`
REQ | 35 | 20-section report and five answers | post-approval | COVERED | Exact headings/questions required
CONTEXT | Phase 127 | Phase remains incomplete | 3-4 | COVERED | No completion claim; missing fixtures remain truthful
Deferred Ideas | — | Covers, project redesign, masonry, gallery, navigation, new systems | — | EXCLUDED | Report only as possible later scope
</source_audit>

<output>
After exact human approval, create `.planning/quick/260811-pqe-phase-127-public-member-profile-visuelle/260811-pqe-SUMMARY.md` with the required 20 sections and five explicit answers. Do not mark Phase 127 complete.
</output>
