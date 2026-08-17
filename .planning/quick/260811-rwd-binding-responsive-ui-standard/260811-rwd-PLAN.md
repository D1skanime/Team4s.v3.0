---
phase: quick-260811-rwd
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - AGENTS.md
  - docs/frontend/ui-system.md
  - docs/agent-guidelines-ui.md
autonomous: true
requirements: [260811-rwd-scope]

must_haves:
  truths:
    - "Team4s UI work is mobile-first and chooses layout changes from available geometry rather than named devices."
    - "Page and app-shell layout may use viewport queries; reusable or embedded components, cards, stages, and carousels use container queries based on available inline size."
    - "A large layout activates only when its documented minimum geometry fits without clipping or page-level horizontal overflow."
    - "The standard protects flex/grid children, responsive images, and ordinary text wrapping without a global overflow-wrap:anywhere escape hatch."
    - "Verification covers narrow, intermediate, transition, and wide sizes, long German text, browser zoom, and no page overflow."
    - "Adoption is incremental: new UI complies, touched problematic components are modernized, and stable legacy UI is not refactored wholesale."
  artifacts:
    - path: AGENTS.md
      provides: Binding repository-level responsive UI rules and adoption boundary
    - path: docs/frontend/ui-system.md
      provides: Canonical responsive layout model and CSS implementation guidance
    - path: docs/agent-guidelines-ui.md
      provides: Actionable responsive implementation and verification checklist
  key_links:
    - from: AGENTS.md
      to: docs/frontend/ui-system.md
      via: repository rule points to the canonical detailed responsive standard
      pattern: "responsive|container quer"
    - from: docs/agent-guidelines-ui.md
      to: docs/frontend/ui-system.md
      via: agent workflow requires applying the canonical policy
      pattern: "ui-system\\.md"
---

<objective>
Establish a binding Team4s responsive UI development standard across repository rules and canonical frontend guidance.

Purpose: Prevent viewport-only component behavior, premature wide layouts, overflow workarounds, and device-named breakpoints while giving executors a precise adoption and test contract.
Output: Focused guardrail updates in AGENTS.md, docs/frontend/ui-system.md, and docs/agent-guidelines-ui.md; no application CSS or component refactor.
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
</read_first>

<interfaces>
Preserve the existing authority split: AGENTS.md holds short binding rules; docs/frontend/ui-system.md owns detailed UI standards; docs/agent-guidelines-ui.md turns them into agent steps. No directly relevant responsive GSD/project template was found, so do not create or modify a template.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Define the responsive architecture and adoption contract</name>
  <files>AGENTS.md, docs/frontend/ui-system.md</files>
  <action>
Add a concise binding subsection under AGENTS.md UI Rules that points to both frontend guidance documents. Require mobile-first styling; permit viewport media queries for page and app-shell composition; require reusable or embedded components, including cards, stages, and carousels, to establish a suitable containment boundary and use container queries based on available inline-size. State that a larger composition activates only when its minimum geometry fits, not merely because a conventional viewport breakpoint was crossed. Require min-width: 0 on flex/grid children that must shrink, max-width: 100% on media where intrinsic width could overflow, and local wrapping/layout fixes rather than global overflow-wrap: anywhere. Prohibit device-name breakpoint semantics such as phone, tablet, and desktop; name breakpoints by layout purpose or required geometry.

Add a dedicated responsive-layout section to docs/frontend/ui-system.md. Define ownership: viewport queries belong to full-page/app-shell structure, while reusable/embedded component layout belongs to container queries on an ancestor with container-type: inline-size and a purpose-based container-name when useful. Define mobile-first base behavior, geometry-derived transition thresholds, and require each wide composition to account for columns, gaps, controls, media, and longest required content. Document min-width: 0, max-width: 100%, and text-wrapping safeguards, including why global overflow-wrap: anywhere masks the owning defect and harms normal text. Examples may clarify the policy but must remain generic; add no production CSS, primitives, tokens, dependencies, API behavior, or domain variants.

Encode incremental adoption exactly: all new UI follows the standard; when an existing component is touched and its responsive behavior is in scope or demonstrably problematic, modernize that component within the scoped work; do not launch wholesale refactors of stable legacy UI solely to retrofit the standard. Preserve existing UI-system decisions and correct German text.
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s &amp;&amp; rg -n -i "mobile-first|container-type|inline-size|min-width:\\s*0|max-width:\\s*100%|overflow-wrap:\\s*anywhere|viewport|geometry|legacy" AGENTS.md docs/frontend/ui-system.md</automated>
  </verify>
  <done>AGENTS.md binds the rule and adoption boundary; ui-system.md defines viewport-versus-container ownership, geometry gates, overflow safeguards, breakpoint naming, and incremental adoption without application changes.</done>
</task>

<task type="auto">
  <name>Task 2: Make responsive planning and verification executable</name>
  <files>docs/agent-guidelines-ui.md</files>
  <action>
Extend Before Coding UI and add a compact responsive implementation/verification section. Require agents to classify each layout decision as page/app-shell or reusable/embedded before choosing viewport or container queries; record minimum viable geometry and use purpose/geometry breakpoint names; inspect the real flex/grid/media/text overflow owner before wrapping or clipping; and apply the incremental adoption boundary.

Define a mandatory test matrix for changed UI: narrow, intermediate, exact transition boundary (immediately below and above when practical), and wide sizes; realistic long German labels/text with correct umlauts; browser zoom sufficient to expose reflow and clipping faults; and an explicit assertion or live inspection that the document has no horizontal overflow. Require nested/embedded rendering for reusable components so evidence proves behavior from container width rather than viewport assumptions. Focused CSS/component tests and headless checks may support evidence, but retain the existing live-browser rule when user-facing flow or product fit matters.

Keep guidance appropriate to the existing CSS Modules/React project without prescribing device lists, universal pixel breakpoints, a new test framework, or a legacy migration. Cross-check all three documents for consistent terminology and authority. Preserve unrelated content and formatting.
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s &amp;&amp; rg -n -i "narrow|intermediate|transition|wide|German|Deutsch|zoom|horizontal.*overflow|container|viewport|device|legacy" docs/agent-guidelines-ui.md &amp;&amp; git diff --check -- AGENTS.md docs/frontend/ui-system.md docs/agent-guidelines-ui.md</automated>
  </verify>
  <done>The agent guide supplies a concrete classification, implementation, and test checklist covering all approved widths, content, zoom, nested-container, and overflow cases, with consistent cross-document wording.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Repository policy → future UI implementation | Agents and contributors interpret documentation to produce responsive code. |
| Component container → embedded layout | A reusable component may receive a width different from the document viewport. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260811-rwd-01 | T | Responsive policy wording | mitigate | Give viewport and container queries distinct ownership, require geometry-derived transitions, and cross-check all three files. |
| T-260811-rwd-02 | D | Future narrow/zoomed UI | mitigate | Mandate the four-size matrix, long German text, zoom, nested-container, and page-overflow verification. |
| T-260811-rwd-03 | T | Stable legacy UI | mitigate | State incremental adoption explicitly so documentation hardening cannot authorize a wholesale refactor. |
</threat_model>

<verification>
Run from /home/d1sk/team4s:

- Re-run git status --short and preserve every pre-existing worktree/index change.
- Review git diff -- AGENTS.md docs/frontend/ui-system.md docs/agent-guidelines-ui.md for precise wording and no unrelated edits.
- Run the two task-level rg gates and git diff --check.
- Confirm git diff --name-only -- AGENTS.md docs/frontend/ui-system.md docs/agent-guidelines-ui.md lists exactly the three declared documentation files.
- Confirm no CSS, TS/TSX, dependency, contract, or template file changed for this task.
- Because the tree is dirty, stage only exact reviewed documentation hunks. Never use git add -A, git add ., whole-tree staging, or whole-file staging when a target file has unrelated changes. Inspect git diff --cached --name-only and git diff --cached before committing, preserving unrelated index and worktree state.
</verification>

<success_criteria>
- All three documents define one consistent responsive standard.
- Viewport and container queries have explicit, non-overlapping ownership.
- Large layouts are gated by minimum fitting geometry and use purpose/geometry names, not device names.
- Flex/grid, image, wrapping, and overflow safeguards are explicit without normalizing global overflow-wrap: anywhere.
- Verification requires narrow, intermediate, transition, and wide states, long German content, zoom/reflow, nested component behavior, and no page overflow.
- Incremental adoption is mandatory for new and touched problematic UI without wholesale stable-legacy refactoring.
- Only the three approved documentation files are implemented; no app CSS refactor or unrelated dirty-tree change is included.
</success_criteria>

<output>
After completion, create .planning/quick/260811-rwd-binding-responsive-ui-standard/260811-rwd-SUMMARY.md.
</output>
