---
phase: quick-260811-lck
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [frontend/src/components/profile/MemberBadgeChain.tsx, frontend/src/components/profile/MemberBadgeChain.module.css, frontend/src/components/profile/MemberBadgeChain.test.tsx]
autonomous: false
requirements: [260811-lck-scope]
must_haves:
  truths: ["Locked future tiers never reveal actual artwork", "Names, thresholds, Gesperrt and accessibility remain", "Earned/current/earned-preview and hero art remain unchanged", "All relevant families reuse one seam; unearned founding stays absent"]
  artifacts:
    - {path: frontend/src/components/profile/MemberBadgeChain.tsx, provides: shared locked-art seam}
    - {path: frontend/src/components/profile/MemberBadgeChain.module.css, provides: responsive neutral styling}
    - {path: frontend/src/components/profile/MemberBadgeChain.test.tsx, provides: client/SSR/accessibility tests}
  key_links:
    - {from: frontend/src/components/profile/MemberBadgeChain.tsx, to: resolveBadgeArtwork, via: stage.earned guard}
---
<objective>Hide future badge artwork in compact public-profile tier navigation without changing achievement mechanics.</objective>
<context>
<read_first>
@AGENTS.md
@docs/engineering/implementation-contract.md
@docs/frontend/ui-system.md
@docs/agent-guidelines-ui.md
@frontend/src/components/profile/MemberBadgeChain.tsx
@frontend/src/components/profile/MemberBadgeChain.module.css
@frontend/src/components/profile/MemberBadgeChain.test.tsx
@frontend/src/components/profile/memberBadgeFamilies.ts
@frontend/src/components/profile/memberBadgeLabels.ts
@frontend/src/components/ui/ResponsiveImage.tsx
@.planning/quick/260811-obg-public-member-profile-outer-bands-transparent/260811-obg-PLAN.md
</read_first>
<interfaces>Compact rows use stage.earned/currentCode/data-stage-state. Existing role/anime locks are neutral; contribution/membership compact rows currently resolve locked art; inspect points and roles too. Add one local LockedStageArtwork seam used by roles, Anime-Projekte, points, all contribution families, and membership duration. It emits no image, data-achievement-art, motif/frame, URL or accessible art label; its visual is aria-hidden while the wrapper retains German name/threshold/Gesperrt. Earned/current compact and hero/earned-preview art remain outside it. Quick 260811-obg is implemented but formal approval remains pending and independent.</interfaces>
</context>
<tasks>
<task type="auto" tdd="true">
<name>Task 1: RED ? secrecy, accessibility and SSR contracts</name>
<files>frontend/src/components/profile/MemberBadgeChain.test.tsx</files>
<behavior>Table-test every named family: locked nodes have the shared placeholder, no img/art attribute/motif/frame/future URL, retain name/threshold/Gesperrt/list/accessibility, and are noninteractive. Earned/current compact art and earned hero preview remain. SSR omits locked asset basenames but includes locked copy and current hero. Unearned founding is absent; earned founding stays separate.</behavior>
<action>First run git status --short and docker compose ps. Save incoming working/cached patches, cached blobs/paths and SHA-256 for all three heavily dirty files under evidence/incoming/. Fail on overlapping hunks; no whole-file replacement, formatting or staging. Add focused table-driven Phase-119-adjacent tests plus renderToStaticMarkup coverage. Prove RED specifically for current contribution/membership/points leakage and save evidence/RED.txt.</action>
<verify><automated>cd /home/d1sk/team4s &amp;&amp; test -s .planning/quick/260811-lck-hide-locked-achievement-art/evidence/RED.txt &amp;&amp; grep -E "FAIL|failed|AssertionError" .planning/quick/260811-lck-hide-locked-achievement-art/evidence/RED.txt</automated></verify>
<done>RED covers all families, SSR, accessibility, earned behavior and founding.</done>
</task>
<task type="auto" tdd="true">
<name>Task 2: GREEN ? one shared mystery/lock seam</name>
<files>frontend/src/components/profile/MemberBadgeChain.tsx, frontend/src/components/profile/MemberBadgeChain.module.css, frontend/src/components/profile/MemberBadgeChain.test.tsx</files>
<action>Add one local LockedStageArtwork-style renderer with data-locked-stage-art, neutral mystery plus Lock and aria-hidden=true. Guard artwork resolution with stage.earned in role, FamilyAchievementStage, AnimeProjectAchievementStage, ContributionAchievementStage, MembershipStage and PointsAchievementStage as applicable. Preserve wrappers, visible name/threshold/state, aria-label ending Gesperrt and noninteraction. Add one token-based responsive/container-safe CSS rule. Do not change thresholds, progress, hero art/sizing, catalogs, carousel engines, backend/API/DB or assets. Run focused tests, typecheck, scoped lint if available and diff checks; save GREEN/hunk audit. Never git add ./-A or whole-file stage; only exact git add -p if separately required.</action>
<verify><automated>cd /home/d1sk/team4s &amp;&amp; docker compose exec -T team4sv30-frontend npm test -- --run frontend/src/components/profile/MemberBadgeChain.test.tsx &amp;&amp; docker compose exec -T team4sv30-frontend npm run typecheck &amp;&amp; git diff --check &amp;&amp; git diff --cached --check</automated></verify>
<done>One seam prevents locked art disclosure in DOM/SSR while preserving earned behavior and dirty incoming hunks.</done>
</task>
<task type="checkpoint:human-verify" gate="blocking">
<name>Task 3: Approve responsive result</name>
<files>none</files>
<what-built>Neutral mystery/lock treatment across every relevant family.</what-built>
<action>Review a populated public member profile through the shared browser at http://127.0.0.1:3300 after rebuilding only frontend if needed. Capture 390px, 1024px landscape and 1440px evidence. Do not alter backend/persistence/assets/carousels or Quick 260811-obg.</action>
<how-to-verify>At all sizes inspect every named family; locked tiers use one neutral mystery/lock with name/threshold/Gesperrt/accessibility and no real art/silhouette/color. Verify they are nonactionable. Verify current/earned compact art, earned older-tier hero Vorschau/Aktuell, progress, thresholds, order, scrolling/carousels and hero art unchanged. Founding is absent if unearned and separate if earned. Record scrollWidth <= clientWidth. Record 260811-obg as implemented/formal approval pending.</how-to-verify>
<verify><automated>cd /home/d1sk/team4s &amp;&amp; docker compose ps team4sv30-frontend &amp;&amp; for f in locked-art-390.png locked-art-1024-landscape.png locked-art-1440.png MANIFEST.md; do test -f .planning/quick/260811-lck-hide-locked-achievement-art/evidence/$f || exit 1; done &amp;&amp; git diff --check</automated></verify>
<done>Accessible result approved at all sizes with no overflow/regression; outer-band approval remains pending.</done>
<resume-signal>Stop for exact standalone approved; otherwise treat response as feedback.</resume-signal>
</task>
</tasks>
<threat_model>
| Threat | Disposition | Mitigation |
|---|---|---|
| DOM/SSR future-art disclosure | mitigate | stage.earned guard and absence tests |
| Accessibility loss | mitigate | preserve German labels/list semantics; visual aria-hidden |
| Hero/preview regression | mitigate | regression tests and live selection |
| Dirty-file overwrite | mitigate | patches/blobs/hashes and fail-closed hunk edits |
| Responsive overflow | mitigate | container-safe CSS and 390/1024-landscape/1440 UAT |
| False outer-band approval | mitigate | keep 260811-obg pending |
</threat_model>
<verification>RED/GREEN focused and SSR tests, typecheck, scoped lint, diff/hunk audit, responsive shared-browser UAT and exact approval.</verification>
<success_criteria>All locked compact art is mysterious through one seam; semantics and earned behavior remain; no backend/API/DB/carousel/threshold/progress changes; dirty work and pending outer-band approval are protected.</success_criteria>
<source_audit>
GOAL locked-art secrecy/progression | Tasks 1-3 | COVERED
REQ all families/shared seam | Tasks 1-2 | COVERED
REQ names/thresholds/accessibility | Tasks 1-3 | COVERED
REQ earned/current/preview/heroes unchanged | Tasks 1-3 | COVERED
REQ founding separate/absent | Tasks 1-3 | COVERED
REQ no backend/API/DB/carousel/progress changes | Task 2 | COVERED
REQ RED/GREEN SSR/accessibility | Tasks 1-2 | COVERED
REQ 390/1024-landscape/1440 checkpoint | Task 3 | COVERED
REQ dirty hunk isolation | Tasks 1-2 | COVERED
CONTEXT 260811-obg pending approval | Tasks 1-3 | COVERED
RESEARCH reuse local branches/seam | Task 2 | COVERED
</source_audit>
<output>After exact approval create .planning/quick/260811-lck-hide-locked-achievement-art/260811-lck-SUMMARY.md. Do not update ROADMAP.md or complete 260811-obg.</output>

