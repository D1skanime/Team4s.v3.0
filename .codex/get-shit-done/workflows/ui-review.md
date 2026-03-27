<purpose>
Retroactive 6-pillar visual audit of implemented frontend code. Standalone command that works on any project - GSD-managed or not. Produces scored UI-REVIEW.md with actionable findings.
</purpose>

<required_reading>
@C:/Users/admin/Documents/Team4s/.codex/get-shit-done/references/ui-brand.md
</required_reading>

<process>

## 0. Initialize

```bash
INIT=$(node "C:/Users/admin/Documents/Team4s/.codex/get-shit-done/bin/gsd-tools.cjs" init phase-op "${PHASE_ARG}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Parse: `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `padded_phase`, `commit_docs`.

```bash
UI_AUDITOR_MODEL=$(node "C:/Users/admin/Documents/Team4s/.codex/get-shit-done/bin/gsd-tools.cjs" resolve-model gsd-ui-auditor --raw)
```

Display banner:
```
-----------------------------------------------------
 GSD > UI AUDIT - PHASE {N}: {name}
-----------------------------------------------------
```

## 1. Detect Input State

```bash
SUMMARY_FILES=$(ls "${PHASE_DIR}"/*-SUMMARY.md 2>/dev/null)
UI_SPEC_FILE=$(ls "${PHASE_DIR}"/*-UI-SPEC.md 2>/dev/null | head -1)
UI_REVIEW_FILE=$(ls "${PHASE_DIR}"/*-UI-REVIEW.md 2>/dev/null | head -1)
```

**If `SUMMARY_FILES` empty:** Exit - "Phase {N} not executed. Run $gsd-execute-phase {N} first."

**If `UI_REVIEW_FILE` non-empty:** Use AskUserQuestion:
- header: "Existing UI Review"
- question: "UI-REVIEW.md already exists for Phase {N}."
- options:
  - "Re-audit - run fresh audit"
  - "View - display current review and exit"

If "View": display file, exit.
If "Re-audit": continue.

## 2. Gather Context Paths

Build file list for auditor:
- All SUMMARY.md files in phase dir
- All PLAN.md files in phase dir
- UI-SPEC.md (if exists - audit baseline)
- CONTEXT.md (if exists - locked decisions)

Also gather runtime screenshot targets:
- Prefer the project's real local app URL first
- For Docker/local-dev setups, probe `http://localhost:3002` before `http://localhost:3000`, `http://localhost:5173`, and `http://localhost:8080`
- If the phase is tied to a concrete route, include that route explicitly so the auditor captures the relevant screen instead of only the app root

## 3. Spawn gsd-ui-auditor

```
◆ Spawning UI auditor...
```

Build prompt:

```markdown
Read C:/Users/admin/Documents/Team4s/.codex/agents/gsd-ui-auditor.md for instructions.

<objective>
Conduct 6-pillar visual audit of Phase {phase_number}: {phase_name}
{If UI-SPEC exists: "Audit against UI-SPEC.md design contract."}
{If no UI-SPEC: "Audit against abstract 6-pillar standards."}
</objective>

<runtime_targets>
- Prefer reachable local URLs in this order: `http://localhost:3002`, `http://localhost:3000`, `http://localhost:5173`, `http://localhost:8080`
- Capture the primary phase route first when known (example: `/admin/anime/create`)
- Capture one supporting overview/list route as secondary context when practical
</runtime_targets>

<files_to_read>
- {summary_paths} (Execution summaries)
- {plan_paths} (Execution plans - what was intended)
- {ui_spec_path} (UI Design Contract - audit baseline, if exists)
- {context_path} (User decisions, if exists)
</files_to_read>

<config>
phase_dir: {phase_dir}
padded_phase: {padded_phase}
</config>
```

Omit null file paths.

```
Task(
  prompt=ui_audit_prompt,
  subagent_type="gsd-ui-auditor",
  model="{UI_AUDITOR_MODEL}",
  description="UI Audit Phase {N}"
)
```

## 4. Handle Return

**If `## UI REVIEW COMPLETE`:**

Display score summary:

```
-----------------------------------------------------
 GSD > UI AUDIT COMPLETE
-----------------------------------------------------

**Phase {N}: {Name}** - Overall: {score}/24

| Pillar | Score |
|--------|-------|
| Copywriting | {N}/4 |
| Visuals | {N}/4 |
| Color | {N}/4 |
| Typography | {N}/4 |
| Spacing | {N}/4 |
| Experience Design | {N}/4 |

Top fixes:
1. {fix}
2. {fix}
3. {fix}

Full review: {path to UI-REVIEW.md}
```

## 5. Commit (if configured)

```bash
node "C:/Users/admin/Documents/Team4s/.codex/get-shit-done/bin/gsd-tools.cjs" commit "docs(${padded_phase}): UI audit review" --files "${PHASE_DIR}/${PADDED_PHASE}-UI-REVIEW.md"
```

</process>

<success_criteria>
- [ ] Phase validated
- [ ] SUMMARY.md files found (execution completed)
- [ ] Existing review handled (re-audit/view)
- [ ] gsd-ui-auditor spawned with correct context
- [ ] UI-REVIEW.md created in phase directory
- [ ] Score summary displayed to user
- [ ] Next steps presented
</success_criteria>
