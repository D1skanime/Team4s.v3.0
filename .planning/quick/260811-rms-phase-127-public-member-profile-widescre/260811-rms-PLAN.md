---
phase: quick-260811-rms
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/members/[slug]/page.module.css
  - frontend/src/app/members/[slug]/page.test.tsx
autonomous: false
requirements: [260811-rms-scope]
must_haves:
  truths:
    - "At 1440/1920px the story/membership pair is approximately 60-65% / 35-40%."
    - "At tight 768/1024px tablet widths and 390px mobile the sections stack."
    - "Content wraps normally without clipping, character wrapping, or horizontal overflow."
    - "No other visual, backend, API, contract, auth, asset, or DB change occurs."
  artifacts:
    - path: frontend/src/app/members/[slug]/page.module.css
      provides: Existing profilePair ratio and stack breakpoint
    - path: frontend/src/app/members/[slug]/page.test.tsx
      provides: Focused responsive contract
  key_links:
    - from: frontend/src/app/members/[slug]/page.tsx
      to: frontend/src/app/members/[slug]/page.module.css
      via: Existing sectionPair plus profilePair classes; markup unchanged
      pattern: "sectionPair.*profilePair"
---

<objective>
Rebalance only the existing story and membership columns on widescreen.
Purpose: Make story primary and membership secondary without squeezing tablets or disturbing prior Phase 127 work.
Output: Isolated CSS/test hunks, five-viewport evidence, and human approval.
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
@.planning/quick/260811-pqe-phase-127-public-member-profile-visuelle/260811-pqe-PLAN.md
@.planning/quick/260811-pqe-phase-127-public-member-profile-visuelle/260811-pqe-SUMMARY.md
@frontend/src/app/members/[slug]/page.tsx
@frontend/src/app/members/[slug]/page.module.css
@frontend/src/app/members/[slug]/page.test.tsx
</read_first>
Quick 260811-pqe created the seam: sectionPair plus profilePair, minmax tracks, child min-width:0, no pair-wide overflow-wrap:anywhere, and a 760px stack. Refine only this seam. Use a 60-65% / 35-40% widescreen ratio (8fr/5fr ~61.5/38.5); stack at 768/1024 and preserve 390 mobile. Do not touch JSX, components, membership internals, contribution layouts, global UI/tokens, other styling/content, achievements, FocalCarousel, assets, backend, API, contracts, auth, DB, Docker data, .env, or media.
</context>

<tasks>
<task type="auto" tdd="true">
  <name>Task 1: Isolate and refine profilePair</name>
  <files>frontend/src/app/members/[slug]/page.module.css, frontend/src/app/members/[slug]/page.test.tsx</files>
  <behavior>
    - Tests fail first unless profilePair uses an 8fr/5fr-equivalent widescreen ratio.
    - A profile-only breakpoint stacks at 1024/768; mobile remains stacked.
    - Children retain min-width:0; no overflow-wrap:anywhere, overflow-x:hidden, fixed width, 100vw, or negative-margin repair.
    - Contribution pair and unrelated selectors remain unchanged.
  </behavior>
  <action>
    Before edits, record git status --short, working/cached binary diffs, git write-tree, and target mode/blob/SHA-256 plus byte copies under evidence/incoming. Other Phase 127/profile/assets are dirty. If either target has incoming hunks, preserve them and proceed only when new hunks are separable; otherwise stop with the exact overlap.

    Add assertions beside the existing Quick 260811-pqe test for ratio, a profile-only breakpoint covering 1024/768, mobile stack, min-width:0, and overflow negatives. Then edit only profilePair and the smallest profile-specific media rule: approximately 8fr/5fr on widescreen, stacking before membership starves either column. Do not change contributionPairPresent, contributionPairEmpty, sectionPair, rhythmBand, gutters, or another selector.

    Review both diffs. If commit is authorized, stage reviewed new hunks only with git add -p -- path. Never use git add ., git add -A, whole-file staging, or broad formatting. Cached paths must equal the two-file allow-list; save patch/blob/hash evidence. Restore the incoming index when no commit is authorized. Abort on inseparable hunks or any path outside the allow-list.
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s &amp;&amp; docker compose exec -T team4sv30-frontend npm test -- --run 'src/app/members/[slug]/page.test.tsx' &amp;&amp; docker compose exec -T team4sv30-frontend npm run typecheck &amp;&amp; git diff --check &amp;&amp; git diff --cached --check</automated>
  </verify>
  <done>Only two allowed files have isolated hunks; ratio, stacking, and overflow tests pass or inherited failures are recorded truthfully.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Approve responsive balance</name>
  <files>none</files>
  <what-built>Only the existing story/membership ratio and tight-tablet breakpoint.</what-built>
  <action>Use the populated profile through the shared browser at http://127.0.0.1:3300. Tests/headless checks cannot replace live review. If live evidence is unavailable, stop here.</action>
  <how-to-verify>
    1. Capture evidence/profile-pair-{width}.png at 390x844, 768x1024, 1024x768, 1440x900, and 1920x1080.
    2. At 1440/1920 verify approximately 60-65% story / 35-40% membership.
    3. At 768/1024/390 verify full-width stacking.
    4. Verify normal wrapping and no clipping, overlap, character breaks, or horizontal scroll.
    5. Confirm no unrelated page change; review exact two-file diff and isolation evidence.
  </how-to-verify>
  <verify>
    <automated>cd /home/d1sk/team4s &amp;&amp; for w in 390 768 1024 1440 1920; do test -f .planning/quick/260811-rms-phase-127-public-member-profile-widescre/evidence/profile-pair-$w.png || exit 1; done &amp;&amp; git diff --check</automated>
  </verify>
  <done>User approves balance, stacking, overflow safety, and no unrelated changes.</done>
  <resume-signal>Type approved or describe the viewport-specific issue.</resume-signal>
</task>
</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| Public content to grid | Variable text must not overflow or starve a column. |
| Dirty tree/index to Quick hunks | Unrelated Phase 127/profile/asset work remains untouched. |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-rms-01 | D | profilePair | mitigate | Minmax ratio, explicit stack, five-viewport UAT. |
| T-rms-02 | T | dirty tree/index | mitigate | Binary/index/blob/SHA evidence, allow-list, hunk staging only. |
| T-rms-03 | I | public data | accept | Presentation only; no data/API/auth change. |
</threat_model>

<verification>
Focused route test, typecheck, both diff checks, exact two-file hunk review, and live UAT at 390/768/1024/1440/1920. Missing live evidence leaves the Quick incomplete.
</verification>

<success_criteria>
- 1440/1920 is approximately 60-65% / 35-40%.
- 768/1024/390 stacks without overflow.
- Only profilePair CSS and focused tests change.
- Unrelated dirty work, Phase 127 behavior, other visuals, backend/API/DB/contracts, assets, runtime data, and incoming index remain unchanged.
</success_criteria>

<source_audit>
SOURCE | ID | Requirement | Task | Status
GOAL | none | Rebalance story/membership only | 1-2 | COVERED
REQ | rms-01 | 60-65 / 35-40 widescreen | 1-2 | COVERED
REQ | rms-02 | Tablet/mobile stacking | 1-2 | COVERED
REQ | rms-03 | No wrapping/overflow defect | 1-2 | COVERED
REQ | rms-04 | No other changes | 1-2 | COVERED
CONTEXT | Phase 127 | Preserve predecessor/dirty work | 1-2 | COVERED
Deferred | none | Broader redesign | none | EXCLUDED
</source_audit>

<output>
After checks and human approval, create .planning/quick/260811-rms-phase-127-public-member-profile-widescre/260811-rms-SUMMARY.md. Do not mark Phase 127 complete.
</output>

