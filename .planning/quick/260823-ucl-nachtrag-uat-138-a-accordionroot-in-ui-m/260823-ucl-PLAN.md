---
task: 260823-ucl
type: quick
autonomous: true
files_modified:
  - frontend/src/components/ui/ui.module.css
must_haves:
  truths:
    - "The Rollen & Rechte tab on /admin/users/{id} at 394px viewport no longer produces horizontal page scroll caused by .accordionRoot's implicit grid track (document.scrollWidth <= clientWidth)"
    - "Accordion items with normal (non-overflowing) content render visually unchanged"
    - "Every display:grid rule in ui.module.css without an explicit grid-template-columns has documented, evidence-based reasoning for why it was fixed or left unchanged -- not a name-based guess"
  artifacts:
    - path: "frontend/src/components/ui/ui.module.css"
      provides: "grid-template-columns: minmax(0, 1fr) on .accordionRoot to cap the implicit grid track at the container's own width"
  key_links:
    - from: "frontend/src/components/ui/ui.module.css .accordionRoot"
      to: "frontend/src/components/ui/Accordion.tsx (div className=styles.accordionRoot)"
      via: "CSS Modules class binding"
      pattern: "\\.accordionRoot \\{[^}]*grid-template-columns"
---

<objective>
Nachtrag zu UAT-138-A / Quick Task 260823-u1j: after `.card` and `.tabs` were fixed (commit dc4f5726), the horizontal page overflow at 394px viewport persists. Live-measured: `.card`'s grid track is now correctly 288px, but `document.scrollWidth` is still 727 vs `clientWidth` 394. The next culprit is exactly located: `.accordionRoot` (frontend/src/components/ui/ui.module.css, ~line 1705) is `display: grid` without `grid-template-columns`, so its implicit auto column sizes to the widest `.accordionItem` child's min-content -- confirmed live at 674px inside a 288px parent. This is the identical bug pattern as `.card`/`.tabs`, and the fix is identical: add `grid-template-columns: minmax(0, 1fr);`.

The previous quick task (260823-u1j) explicitly judged `.accordionRoot` as a "fixed-size widget, kein Ueberlauf-Risiko" and left it unchanged -- that judgment was wrong. `Accordion` is a generic, content-agnostic primitive: `app/admin/users/tabs/GroupSection.tsx` (part of the Rollen & Rechte tab split, see 260823-s7v) renders a `<Table>` (which has `min-width: 640px` per `.table` in this same stylesheet) inside an `<Accordion>` item -- exactly the "wide table inside a narrow grid" trap `.card`/`.tabs` already had.

This plan also requires a genuinely thorough re-audit of every remaining `display: grid` rule in `ui.module.css` (not a repeat of the previous audit's name-based guesses), specifically re-checking `.modalPanel`/`.drawerPanel` (which the previous audit also cleared, and which DO contain a real `<Table>` via `RoleCapabilityImpactPreviewModal.tsx`, rendered inside `Modal size="lg"`).

Purpose: Close the remaining horizontal-overflow gap without reducing scope to "just accordionRoot" -- verify with evidence, not assumption, that no other rule in the file has the same trap.
Output: Updated `frontend/src/components/ui/ui.module.css` with `grid-template-columns: minmax(0, 1fr);` added to `.accordionRoot` (and to any other rule the re-audit proves is a genuine trap); a SUMMARY.md documenting exactly which selectors were changed, why, and why the previous audit missed `.accordionRoot`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md
@.planning/quick/260823-u1j-fix-uat-138-a-horizontaler-seitenueberla/260823-u1j-SUMMARY.md

frontend/src/components/ui/ui.module.css -- full file already read for this plan; 22 `display: grid` occurrences total, 6 already have explicit `grid-template-columns` set via a sibling declaration written for THIS plan or a prior one (`.card` line 170, `.tabs` line 1199, `.yearPickerGrid` line 587, `.datePickerTopRow` line 629, `.datePickerPanelHeader` line 737, `.datePickerWeekdays`/`.datePickerDayGrid` line 803, `.datePickerMonthGrid`/`.datePickerYearGrid` line 850, `.adjacentNavFloating`/`.adjacentNavInline` in the `@media (max-width: 767px)` block lines 1853/1860) -- these are already safe, do not touch them.
frontend/src/components/ui/Accordion.tsx -- confirms `.accordionRoot` wraps `.accordionItem` children as vertically-stacked grid items (single logical column; no multi-column layout intended); line 68: `<div className={classNames(styles.accordionRoot, 'accordionRoot', className)}>`.
frontend/src/app/admin/users/tabs/GroupSection.tsx -- confirms the real trap: renders `<Accordion>` with a `<Table>` (min-width: 640px via `.table`) inside an accordion item, in the same Rollen & Rechte tab that UAT-138-A/260823-u1j already fixed for `.card`/`.tabs`.
frontend/src/components/layout/AppShell.module.css -- `.shell` (lines 1-10), the established correct reference pattern: `grid-template-columns: var(--app-shell-edge-width) minmax(0, 1fr);`.
</context>

<interfaces>
<!-- Exact current rule to modify. No other property in this rule changes. -->

From frontend/src/components/ui/ui.module.css (current, ~line 1705):

    .accordionRoot {
      display: grid;
      gap: 0;
    }

Reference pattern already correct elsewhere in this same file (added by the prior UAT-138-A fix, commit dc4f5726):

    .card {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      align-content: start;
      gap: 18px;
      ...
    }

    .tabs {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
      align-content: start;
    }

<!-- Findings from this plan's pre-audit (for the executor's re-verification, not to be trusted blindly): -->

Rules WITHOUT explicit grid-template-columns, evaluated against the real bug mechanism (block-level, width:auto, overflow:visible on itself, normal document flow -- the exact combination `.card`/`.tabs`/`.accordionRoot` share):

- `.accordionRoot` (~1705): width:auto, no overflow set on itself, normal flow, real `<Table>` descendant confirmed in GroupSection.tsx -- CONFIRMED TRAP, must fix.
- `.heroMetricItem` (~250): width:auto, no overflow set, but its only children (`dt`/`dd`) are short bounded metric label/value text -- no table, no unbreakable long token. Re-verify this conclusion, do not just accept it.
- `.fieldset` (~357): width:auto, no overflow set; typical direct child is a form control (`.control` class already sets `min-width: 0` on itself). Re-verify no `<Table>` or unbounded-width content is ever passed as `FormField` children before concluding safe.
- `.pageHeaderContent` / `.sectionHeaderContent` (~974): width:auto, no overflow set; children are only title/description text (wraps normally, no tables). Re-verify.
- `.stateCard` (~1072): width:auto, no overflow set; children are icon + title + description text only. Re-verify.
- `.datePickerPanel` (~716): no explicit grid-template-columns, BUT has explicit `width: min(100vw - 32px, 334px)` AND `overflow: auto` set directly on itself -- an explicit width plus overflow-clipping on the box itself means content cannot force the box (or the page) wider, only scroll internally. Re-verify this reasoning against the same evidence standard used for `.accordionRoot`.
- `.modalPanel` / `.drawerPanel` (~1319, ~1339): no explicit grid-template-columns (only `grid-template-rows` is set), BUT both have an explicit `width` (`min(560px, calc(100vw - 48px))` / `min(620px, 100%)`) AND `overflow: hidden` set directly on themselves. `RoleCapabilityImpactPreviewModal.tsx` DOES render a real `<Table>` inside `<Modal size="lg">` -- this is a genuine content risk, but the explicit width + `overflow: hidden` on `.modalPanel`/`.drawerPanel` themselves means any overflow is clipped at the dialog boundary and cannot reach `document.scrollWidth`. This differs from `.card`/`.tabs`/`.accordionRoot`, which have `width: auto` and no self-overflow-clipping. Re-verify this distinction with real evidence (inspect the CSS properties yourself) rather than accepting this note.
- `.modalBody` / `.drawerBody` (~1407, ~1442): same reasoning -- both already set `overflow: auto` directly on themselves and live inside the `overflow: hidden` `.modalPanel`/`.drawerPanel` ancestor, so any internal blowout is contained before it can reach the page.
- `.yearPickerPanel` (~548): `position: fixed`, removed from normal document flow -- cannot affect `document.scrollWidth` the same way an in-flow block can.
- `.stateIcon` (~1103), `.closeButton` (~1478): fixed pixel width/height (38px/40px) with `place-items: center` around a single icon child -- not content-driven, safe regardless of grid-template-columns.
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Genuinely re-audit every display:grid rule in ui.module.css and fix confirmed traps</name>
  <files>frontend/src/components/ui/ui.module.css</files>
  <action>
  Do not accept the `<interfaces>` findings above as pre-verified truth -- they are a starting hypothesis from this plan's own research, written explicitly to be re-checked, in direct response to the previous quick task (260823-u1j) wrongly clearing `.accordionRoot` without checking its real content. For every `display: grid` rule in `frontend/src/components/ui/ui.module.css` that lacks an explicit `grid-template-columns`, independently confirm:
  (a) whether the rule is a normal in-flow block with `width: auto` and no `overflow` (auto/hidden/scroll) set directly on itself (the structural precondition for the bug), and
  (b) whether any real component in the codebase renders genuinely wide/variable content (a `<Table>`, long unbreakable text/IDs, nested lists of unknown length, badge rows, etc.) as a descendant of that rule's element -- check actual `.tsx` usage via grep, not the class name alone.

  Apply `grid-template-columns: minmax(0, 1fr);` (matching the exact `.card`/`.tabs`/`.shell` pattern, inserted immediately after the `display: grid;` line, no other property changed) to:
  - `.accordionRoot` (~line 1705-1708) -- confirmed trap: `GroupSection.tsx` renders a `<Table>` (min-width: 640px) inside an `<Accordion>` item on the same Rollen & Rechte tab as the original UAT-138-A bug.
  - Any additional rule your independent re-check proves shares the same structural precondition AND a real wide-content descendant. If you find one, document the evidence (which `.tsx` file, which component) in the SUMMARY.

  Do NOT apply the fix to rules that are safe by construction (explicit `width` + `overflow: auto`/`hidden`/`scroll` set directly on the rule itself, or `position: fixed`/`position: absolute` removed from normal flow, or fixed pixel dimensions with no variable content) -- but only after you have verified the reasoning yourself, not copied it. If your re-check disagrees with any conclusion in `<interfaces>`, follow your own evidence and explain the discrepancy in the SUMMARY.

  Do not modify any `.tsx` file -- this is a CSS-only fix. Do not change `gap`, `align-content`, colors, borders, radii, shadows, or any other property on any rule you touch.
  </action>
  <verify>
    <automated>grep -A2 "^\.accordionRoot {" frontend/src/components/ui/ui.module.css | grep -q "grid-template-columns: minmax(0, 1fr);" && echo ACCORDION_ROOT_FIXED</automated>
  </verify>
  <done>`.accordionRoot` in ui.module.css contains `grid-template-columns: minmax(0, 1fr);`. Any other rule fixed as a result of the independent re-audit is documented with concrete evidence (component file + what it renders). No `.tsx` file was changed. No unrelated CSS property was changed on any touched rule.</done>
</task>

<task type="auto">
  <name>Task 2: Run in-container test suites, confirm baseline unchanged, write SUMMARY</name>
  <files>frontend/src/components/ui/ui.module.css</files>
  <action>
  Run both vitest suites required for this fix, executed INSIDE the frontend Docker container (not on the host):
  1. `docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/components/ui --reporter=basic'`
  2. `docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/app/admin --reporter=basic'`

  These suites have a KNOWN pre-existing failure baseline, unrelated to this change and NOT to be fixed: 1 failure in `src/components/ui/ResponsiveImage.config.test.ts`, and 24 failures across `src/app/admin` (RoleCatalogProvider test-harness context gap, Phase-136 hex-only `color_key` fixtures). The requirement is that the failure count in each suite does NOT grow beyond this baseline after the CSS change -- not that the suites reach zero failures. If a new failure appears that was not in this baseline, investigate whether this CSS change caused it before concluding the task.

  If the container is not running, start it first with `docker compose up -d team4sv30-frontend` and retry.

  Write `.planning/quick/260823-ucl-nachtrag-uat-138-a-accordionroot-in-ui-m/260823-ucl-SUMMARY.md` documenting:
  - Exactly which selector(s) were changed in `ui.module.css` and the exact property/value added to each.
  - Why the previous audit (260823-u1j) missed `.accordionRoot`: it explicitly classified `.accordionRoot` as a "fixed-size widget, kein Ueberlauf-Risiko" based on the selector's name/apparent purpose rather than checking which real components render inside an `Accordion` -- `GroupSection.tsx`'s `<Table>`-inside-`<Accordion>` usage was never inspected.
  - The result of this plan's re-audit of every OTHER display:grid rule in the file (which were re-confirmed safe and why, with concrete evidence -- not a repeat of the prior audit's reasoning without verification).
  - The exact failure counts observed in both vitest suites after the change, confirming they match (not exceed) the documented pre-existing baseline (1 in `src/components/ui`, 24 in `src/app/admin`).
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/components/ui --reporter=basic'; docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/app/admin --reporter=basic'</automated>
  </verify>
  <done>Both vitest runs (src/components/ui and src/app/admin) complete inside the team4sv30-frontend container with failure counts at or below the documented pre-existing baseline (1 and 24 respectively) and zero NEW failures attributable to this CSS change. SUMMARY.md written with the required documentation (selectors changed, why the previous audit missed .accordionRoot, re-audit results for every other rule, final failure counts).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| N/A | Pure CSS layout fix in a global UI primitive stylesheet; no new input, auth, or data-handling surface introduced. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-ucl-01 | N/A | ui.module.css `.accordionRoot` (and any other rule confirmed by re-audit) | accept | CSS-only visual/layout change with no data, auth, or trust-boundary surface; risk is purely visual regression risk, covered by the two mandated vitest runs against the documented pre-existing baseline. |
</threat_model>

<verification>
1. `grep -A2 "^\.accordionRoot {" frontend/src/components/ui/ui.module.css` shows `grid-template-columns: minmax(0, 1fr);`.
2. `docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/components/ui --reporter=basic'` -- failure count <= 1 (pre-existing baseline), zero new failures.
3. `docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/app/admin --reporter=basic'` -- failure count <= 24 (pre-existing baseline), zero new failures.
4. Manual/optional spot-check: reload `/admin/users/{id}` (Rollen & Rechte tab, an accordion item wrapping a table) at 394px width via the SSH tunnel (`http://127.0.0.1:3300`) and confirm `document.scrollWidth <= document.clientWidth`.
</verification>

<success_criteria>
- `.accordionRoot` in `frontend/src/components/ui/ui.module.css` has `grid-template-columns: minmax(0, 1fr);` added, matching the existing `.shell`/`.card`/`.tabs` pattern.
- Every other `display: grid` rule in the file without an explicit `grid-template-columns` has documented, evidence-based re-audit reasoning in the SUMMARY (not a repeat of the previous audit's unverified name-based judgment).
- No `.tsx` file was changed; no unrelated CSS property (gap, colors, borders, radii, shadows) was changed on any touched rule.
- Both specified in-container vitest suites (`src/components/ui`, `src/app/admin`) show failure counts at or below the documented pre-existing baseline (1 and 24 respectively), with zero new failures.
- SUMMARY.md documents the exact selectors/properties changed, why the previous audit missed `.accordionRoot`, and the full re-audit results for every other rule.
</success_criteria>

<output>
Create `.planning/quick/260823-ucl-nachtrag-uat-138-a-accordionroot-in-ui-m/260823-ucl-SUMMARY.md` when done, documenting exactly which CSS rules were changed (selectors + property added), why the previous audit missed `.accordionRoot`, and the evidence-based re-audit results for every other display:grid rule in the file.
</output>
