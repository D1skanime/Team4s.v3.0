---
phase: quick-260903-gqt
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/ROADMAP.md
  - .planning/v1.4-MILESTONE-AUDIT.md
  - .planning/STATE.md
  - .planning/notes/2026-09-03-offene-fragen-143-144.md
  - DECISIONS.md
autonomous: true
requirements: [QUICK-260903-GQT-01, QUICK-260903-GQT-02, QUICK-260903-GQT-03, QUICK-260903-GQT-04, QUICK-260903-GQT-05]

must_haves:
  truths:
    - "ROADMAP.md's '## v1.4 Progress' table lists Phase 143 and Phase 144 as Complete with correct plan counts (19/19, 8/8) and completion dates (2026-09-02, 2026-09-03), and the table's Execution Order line includes both phases appended after 142"
    - "v1.4-MILESTONE-AUDIT.md reports 9/9 phases, documents Phase 143/144 evidence rows, and records that Phase 143 resolved the frontend test debt the Phase 142 tech_debt entry deferred to it (289 files / 2183 tests / 0 failures, measured fresh this session)"
    - "STATE.md's frontmatter last_updated timestamp is no longer stale relative to its 2026-09-03 body content"
    - "A new note file records Phase 117's history as resolved/no-action-needed (post-hoc closure via quick task 260819-lm5) and the M3/M5/M6/M7 review-report reference as an open, unresolved question (source document does not exist in the repo) -- these two items are not conflated in tone"
    - "DECISIONS.md carries a new dated entry that locks the project-list isDone completeness-vs-revision-need distinction, explicitly states it supersedes the 'damit die Zähler nicht doppelt zählen' reasoning in 2026-09-02-handoff-phase144.md, and explicitly states this is NOT a defect"
    - "No production code file and no test file is modified by any task in this plan -- git diff --name-only after each task's commit shows only the intended documentation path(s)"
  artifacts:
    - path: ".planning/ROADMAP.md"
      provides: "Two new v1.4 Progress table rows (143, 144) as the true EOF of the file, plus an updated Execution Order line"
    - path: ".planning/v1.4-MILESTONE-AUDIT.md"
      provides: "9/9 phase score, Phase 143/144 evidence rows, resolved-debt note for Phase 143, Phase 144 UAT summary paragraph, cross-reference to the new open-questions note"
    - path: ".planning/STATE.md"
      provides: "Corrected frontmatter last_updated (2026-09-03), no other field or body text touched"
    - path: ".planning/notes/2026-09-03-offene-fragen-143-144.md"
      provides: "Phase 117 resolved-history record and the M3/M5/M6/M7 open-question record"
    - path: "DECISIONS.md"
      provides: "New 2026-09-03 dated entry locking the project-list isDone design decision"
  key_links:
    - from: ".planning/v1.4-MILESTONE-AUDIT.md"
      to: ".planning/notes/2026-09-03-offene-fragen-143-144.md"
      via: "Non-Blocking Existing Debt section cross-reference"
      pattern: "2026-09-03-offene-fragen-143-144"
    - from: "DECISIONS.md"
      to: ".planning/notes/2026-09-02-handoff-phase144.md"
      via: "explicit supersession statement naming the superseded reasoning"
      pattern: "damit die Z.hler nicht doppelt z.hlen"
---

<objective>
Catch up planning bookkeeping for Phases 143 and 144 (both additively appended and executed after the v1.4 roadmap/audit were last written), record two loose ends from the 143/144 UAT round honestly (one resolved, one genuinely open), and lock in a design decision so a future code review does not re-flag it as a defect.

Purpose: ROADMAP.md's v1.4 Progress table and v1.4-MILESTONE-AUDIT.md both predate Phases 143/144 and are missing them entirely; STATE.md's frontmatter timestamp is stale; Phase 144's live UAT surfaced an "Erledigt"-badge behavior that is a deliberate decision, not a bug, but nothing records that decision anywhere a future reviewer would check first; and a prior handoff note references an external review report (M3/M5/M6/M7 findings) that does not exist anywhere in the repo.

Output: Five atomically committed documentation edits. No production code, no test file, no `.planning/phases/**` PLAN/SUMMARY/VERIFICATION artifact is touched -- this is pure planning-doc bookkeeping.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/v1.4-MILESTONE-AUDIT.md
@.planning/phases/143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz/143-UAT.md
@.planning/phases/144-berarbeitungs-kreislauf-f-r-release-medien-vervollst-ndigen/144-UAT.md
@.planning/notes/2026-09-02-handoff-phase144.md
@.planning/milestones/pre-v1.3-recovery-2026-08-13/phases/117-kara-segment-zeit-override-anzeige/117-10-POST-HOC-CLOSURE.md
@DECISIONS.md

<interfaces>
<!-- ROADMAP.md, current true EOF (lines 834-846) -- Task 1 target -->
## v1.4 Progress

**Execution Order:** 136 - 137 - 138 - 139 - 140 - 141 - 142

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 136. Capability Policy, Catalog & Schema Contract | 31/31 | Complete | 2026-08-21 |
| 137. Central Effective-Rights Resolver & Overrides | 14/14 | Complete | 2026-08-21 |
| 138. Effective-Rights Administration & Impact UX | 18/18 | Complete | 2026-08-24 |
| 139. Scalable User-Admin Projections | 10/10 | Complete | 2026-08-24 |
| 140. Review Delegation Management | 3/3 | Complete | 2026-08-26 |
| 141. Actor-Decidable Review Queue | 7/7 | Complete | 2026-08-26 |
| 142. Integrated Security, Fixtures & Live Release Gate | 1/1 | Complete | 2026-09-01 |

<!-- v1.3 "## Progress" table's own Execution Order line (line 330), the established precedent for
     appending an additive phase to an Execution Order line in this exact file: -->
**Execution Order:** 128 - 129 - 130 - 131 - 132 - 133 - 134 - 135

<!-- v1.4-MILESTONE-AUDIT.md frontmatter, current state -- Task 2 target -->
scores:
  requirements: 41/41
  phases: 7/7
  integration: 6/6
  flows: 6/6
nyquist:
  compliant_phases: [136, 137, 138, 139, 140, 141, 142]
  partial_phases: []
  missing_phases: []
  overall: compliant
tech_debt:
  - phase: 136
    items: ["Verification records non-blocking UI polish and broad-harness debt."]
  - phase: 141
    items: ["Pre-existing unrelated review-service fixture failures remain documented in Phase 141 verification."]
  - phase: 142
    items: ["... 16 failed test files / 58 failed tests / 11 errors, recorded as deferred, untracked-at-gate debt for Phase 143."]

<!-- v1.4-MILESTONE-AUDIT.md body, current "## Non-Blocking Existing Debt" section (last paragraph
     before the closing sentence) -- Task 2/4 target -->
Frontend lint remained non-green at gate time due to 11 pre-existing errors (corrected count; the
gate's own text said 13) and existing warnings outside Phase 142. [...] Separately, a full
`npx vitest run` was never executed as part of the Phase 142 gate [...] running it now reports
`Test Files 16 failed | 272 passed | 1 skipped (289)`, `Tests 58 failed | 2088 passed | 1 skipped |
3 todo (2150)`, `Errors 11 errors` -- recorded here as deferred, untracked-at-gate debt for Phase
143, not a remaining v1.4 milestone gap.

The v1.4 milestone satisfies all tracked requirements and final-gate evidence. It is ready for
formal milestone archival.

<!-- STATE.md frontmatter, current state -- Task 3 target -->
last_updated: 2026-09-02T18:40:38.509Z
last_activity: 2026-09-02

<!-- DECISIONS.md, most recent existing entry heading/section format -- Task 5 precedent -->
## 2026-08-23 - GAP-06 (Phase 137): Contribution Roles bleiben override-blind (Fall B)

### Decision
[...]

### Context
[...]

### Why This Won
[...]

### Consequences
[...]

### Follow-ups Required
Keine (dokumentationsseitig abgeschlossen).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: ROADMAP.md — append Phase 143/144 to the v1.4 Progress table</name>
  <files>.planning/ROADMAP.md</files>
  <action>
    Using the Edit tool, apply two changes to `.planning/ROADMAP.md`:

    1. In the "## v1.4 Progress" table's `**Execution Order:**` line (currently reading
       `136 - 137 - 138 - 139 - 140 - 141 - 142`), append ` - 143 - 144` so it reads
       `136 - 137 - 138 - 139 - 140 - 141 - 142 - 143 - 144`. This mirrors the established precedent
       in the same file's v1.3 "## Progress" table, where additive Phase 135 was appended to that
       table's own Execution Order line (`128 - 129 - ... - 134 - 135`), shown in `<interfaces>`
       above.

    2. Append exactly these two rows as new, final rows of the "## v1.4 Progress" table (after the
       Phase 142 row, which is currently the last line of the file):

       `| 143. Phase-142-Nacharbeit und Dashboard-Lane für abgelehnte Notizen | 19/19 | Complete | 2026-09-02 |`
       `| 144. Überarbeitungs-Kreislauf für Release-Medien vervollständigen | 8/8 | Complete | 2026-09-03 |`

    Do NOT touch the "## v1.4 Coverage" requirements table (the table directly above "## v1.4
    Progress"): it intentionally excludes Phases 143/144 since neither has a REQUIREMENTS.md
    mapping (`Requirements: TBD`), consistent with how it already excludes them. Do not touch
    anything else in the file. Use korrekte Umlaute in both new German phase-name cells (ü, not ue,
    per CLAUDE.md's Sprachqualität rule).

    KNOWN QUIRK: `gsd-phase` has previously misplaced new blocks in this file (landing at the end of
    the v1.3 section, or after the wrong table). Verify placement explicitly per the `<verify>` block
    below before committing.

    After editing, commit with only this file's exact path:
    `git add .planning/ROADMAP.md && git commit -m "docs(roadmap): append Phase 143/144 to v1.4 Progress table"`
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s && tail -n 2 .planning/ROADMAP.md | grep -c "^| 14[34]\." | grep -qx 2 && echo EOF_OK; LINE_143=$(grep -n "^| 143\." .planning/ROADMAP.md | cut -d: -f1); LINE_PROGRESS=$(grep -n "^## v1.4 Progress$" .planning/ROADMAP.md | cut -d: -f1); LINE_COVERAGE=$(grep -n "^## v1.4 Coverage$" .planning/ROADMAP.md | cut -d: -f1); [ "$LINE_143" -gt "$LINE_PROGRESS" ] && [ "$LINE_143" -gt "$LINE_COVERAGE" ] && echo TABLE_PLACEMENT_OK; grep -c "142 - 143 - 144" .planning/ROADMAP.md | grep -qx 1 && echo EXEC_ORDER_OK; [ "$(git show --stat -1 --name-only | tail -n +3)" = ".planning/ROADMAP.md" ] && echo COMMIT_SCOPE_OK</automated>
  </verify>
  <done>The two new rows are the literal last two lines of ROADMAP.md, inside "## v1.4 Progress" (not "## v1.4 Coverage"); the Execution Order line reads "...142 - 143 - 144"; the commit touches only .planning/ROADMAP.md.</done>
</task>

<task type="auto">
  <name>Task 2: v1.4-MILESTONE-AUDIT.md — record Phases 143/144 as completed, resolve the Phase-142 debt note</name>
  <files>.planning/v1.4-MILESTONE-AUDIT.md</files>
  <action>
    This audit was written 2026-09-01 for the original 7-phase v1.4 scope (136-142). Phases 143 and
    144 were added additively afterward and are missing. Using the Edit tool, apply these changes:

    **Frontmatter:**
    - `scores.phases`: change `7/7` to `9/9`. Leave `requirements`, `integration`, `flows` unchanged
      (143/144 added zero new requirements and are not integration/flow-scoped items).
    - `nyquist.compliant_phases`: append `143, 144` to the array (both 143-UAT.md and 144-UAT.md show
      full live-UAT sign-off, matching the existing listed phases' compliance bar).
    - `tech_debt`: add a new sibling entry (do NOT delete or rewrite the existing `phase: 142` entry)
      immediately after the `phase: 142` entry:
      ```
        - phase: 143
          items:
            - "Resolved the debt the phase-142 tech_debt entry above deferred to Phase 143 (16 failed
              test files / 58 failed tests / 11 errors). Frontend suite measured fresh 2026-09-03 via
              `docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run'`: 289 files
              / 2183 tests / 0 failures."
      ```

    **Body "## Scope"** (currently: "The v1.4 roadmap contains Phases 136 through 142 and 41
    requirements. ..."): change "Phases 136 through 142" to "Phases 136 through 144", and add one
    sentence stating Phases 143 and 144 are additive, non-catalog phases with no REQUIREMENTS.md
    mapping, consistent with how ROADMAP.md and STATE.md already describe them (TBD / no requirement
    mapping).

    **Body "## Phase Evidence" table:** append two rows, in the same
    `| Phase | Verification | Validation | Result |` format as the existing seven rows:

    `| 143 | passed, live-UAT signed off (143-UAT.md) | present | Verified and live-tested |`
    `| 144 | passed, 18/18 truths (gap-closure round), live-UAT signed off (144-UAT.md) | present | Verified and live-tested |`

    **Body "## Non-Blocking Existing Debt"** (see `<interfaces>` above for the exact current closing
    paragraph): append two new paragraphs after the existing paragraph, before the final closing
    sentence ("The v1.4 milestone satisfies all tracked requirements..."):

    1. A paragraph stating Phase 143 resolved the debt the paragraph above describes: the 16 failed
       test files / 58 failed tests / 11 errors are gone; the frontend suite was measured fresh on
       2026-09-03 at 289 files / 2183 tests / 0 failures, independently measured this session via
       `docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run'` (not assumed).

    2. A short paragraph for Phase 144: shipped via 8 plans including a gap-closure round (plan 08,
       closing a verification gap found in the first pass), live-UAT signed off 2026-09-03
       (144-UAT.md). Four additional defects were found DURING that live UAT that were outside Phase
       144's own scope -- pre-existing/unrelated bugs, not Phase 144 regressions -- and were fixed as
       separate quick-tasks: 260903-cjk (RVM cleanup infinite-retry FK bug), 260903-czh
       (has_own_release_work counted rejected work as done), 260903-dth (dashboard had no
       rejected-work signal at all), 260903-flw (CR-01, upload failures reported as success).
       Reference 144-UAT.md's own "Während der UAT gefundene Altlasten" section as the detailed
       source.

    Do NOT modify the final closing sentence ("The v1.4 milestone satisfies all tracked
    requirements and final-gate evidence. It is ready for formal milestone archival.") -- it names no
    phase count and its requirement evidence (41/41, unchanged) is elsewhere in the file, in
    "## Requirements Coverage".

    (Task 4 below appends one further small cross-reference to this same "## Non-Blocking Existing
    Debt" section -- sequence this task first, since Task 4's addition is additive to what this task
    leaves.)

    After editing, commit with only this file's exact path:
    `git add .planning/v1.4-MILESTONE-AUDIT.md && git commit -m "docs(v1.4-audit): record Phase 143/144 completion and resolve Phase-142 debt note"`
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s && grep -c "phases: 9/9" .planning/v1.4-MILESTONE-AUDIT.md | grep -qx 1 && echo SCORE_OK; grep -c "compliant_phases: \[136, 137, 138, 139, 140, 141, 142, 143, 144\]" .planning/v1.4-MILESTONE-AUDIT.md | grep -qx 1 && echo NYQUIST_OK; grep -c "^  - phase: 143$" .planning/v1.4-MILESTONE-AUDIT.md | grep -qx 1 && echo DEBT_ENTRY_OK; grep -c "^| 143 |" .planning/v1.4-MILESTONE-AUDIT.md | grep -qx 1 && grep -c "^| 144 |" .planning/v1.4-MILESTONE-AUDIT.md | grep -qx 1 && echo EVIDENCE_ROWS_OK; grep -c "289 files" .planning/v1.4-MILESTONE-AUDIT.md | grep -qx 1 && echo DEBT_RESOLVED_OK; grep -c "260903-cjk" .planning/v1.4-MILESTONE-AUDIT.md | grep -qx 1 && echo P144_QUICKTASKS_OK; [ "$(git show --stat -1 --name-only | tail -n +3)" = ".planning/v1.4-MILESTONE-AUDIT.md" ] && echo COMMIT_SCOPE_OK</automated>
  </verify>
  <done>Frontmatter scores.phases=9/9, nyquist.compliant_phases includes 143 and 144, a new phase-143 tech_debt entry references and resolves the phase-142 entry without deleting it; body Scope/Phase Evidence/Non-Blocking Existing Debt sections all mention Phases 143 and 144 with the exact facts above; commit touches only this one file.</done>
</task>

<task type="auto">
  <name>Task 3: STATE.md — fix stale frontmatter timestamp</name>
  <files>.planning/STATE.md</files>
  <action>
    `.planning/STATE.md`'s frontmatter `last_updated: 2026-09-02T18:40:38.509Z` is stale -- the
    body's "Last activity" line and Roadmap Evolution section already reflect 2026-09-03 events (the
    Phase 144 UAT sign-off and four follow-up quick-tasks). Using the Edit tool, change ONLY the
    frontmatter `last_updated` field to a 2026-09-03 ISO-8601 UTC timestamp:
    `2026-09-03T12:00:00.000Z`. This is a bookkeeping correction (a round value for "sometime today"),
    not a precise event timestamp.

    Do not change any other frontmatter field (`last_activity`, `status`, `stopped_at`, `progress`,
    etc.) and do not change any body text. This is a single-line frontmatter fix only.

    After editing, commit with only this file's exact path:
    `git add .planning/STATE.md && git commit -m "docs(state): correct stale last_updated frontmatter timestamp"`
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s && grep -c "^last_updated: 2026-09-03T12:00:00.000Z$" .planning/STATE.md | grep -qx 1 && echo TIMESTAMP_OK; grep -c "^last_activity: 2026-09-02$" .planning/STATE.md | grep -qx 1 && echo OTHER_FIELDS_UNTOUCHED_OK; [ "$(git show --stat -1 --name-only | tail -n +3)" = ".planning/STATE.md" ] && echo COMMIT_SCOPE_OK; [ "$(git show -1 --numstat | tail -n +1 | awk '{print $1"/"$2}')" = "1/1" ] && echo SINGLE_LINE_DIFF_OK</automated>
  </verify>
  <done>Frontmatter last_updated reads 2026-09-03T12:00:00.000Z; every other frontmatter field and all body text are byte-identical to before; the diff is exactly one added and one removed line; commit touches only this one file.</done>
</task>

<task type="auto">
  <name>Task 4: New note — Phase 117 resolved history and the open M3/M5/M6/M7 question</name>
  <files>.planning/notes/2026-09-03-offene-fragen-143-144.md, .planning/v1.4-MILESTONE-AUDIT.md</files>
  <action>
    Using the Write tool, create `.planning/notes/2026-09-03-offene-fragen-143-144.md` recording two
    items found while doing the 143/144 planning bookkeeping. Neither item is a defect or something
    lost -- write each accordingly, and do not conflate their tone (Item A reads as resolved/closed,
    Item B reads as an open, unresolved question).

    **Item A -- Phase 117 (RESOLVED, write as found, not as a gap):** Phase 117
    (kara-segment-zeit-override-anzeige) is archived at
    `.planning/milestones/pre-v1.3-recovery-2026-08-13/phases/117-kara-segment-zeit-override-anzeige/`.
    Plans 117-01 through 117-08 were executed (each has a SUMMARY.md). Plan 117-09 (the final
    regression/UAT wave) was never executed. That gap was closed afterward via quick-task
    260819-lm5, documented in `117-10-POST-HOC-CLOSURE.md`, with five live-UAT rounds approved by the
    user ("approved"). Conclusion: nothing lost, phase is complete, no action needed. Also record a
    short general lesson: the absence of a phase directory under `.planning/phases/` does NOT mean
    its artifacts are lost -- completed milestones get moved to `.planning/milestones/<name>/phases/`.
    Anyone looking for an old phase must check there too, to avoid the same false alarm next time.
    Note briefly, without dwelling on it, that this session's own initial assumption about Phase 117
    was wrong for exactly this reason -- a prior session-memory claim about Phase 117 being "stopped
    before Wave 1 due to a DB blocker" turned out to be an unverified, stale claim; the archived
    artifacts are the ground truth and contradict it.

    **Item B -- External review report source for M3/M5/M6/M7 (OPEN QUESTION, write as
    unresolved):** `.planning/notes/2026-09-02-handoff-phase144.md` (line ~111) references findings
    "M3/M5/M6/M7 aus dem Prüfbericht" (from the review report) as still-open items from an external
    code review. No file matching that report exists anywhere in the repo -- confirmed via
    repo-wide grep for "M3", "M5", "M6", "M7" as finding codes; the only occurrence is that one line
    in the handoff note itself. These four findings are therefore currently unsubstantiated in the
    repo: their content cannot be reconstructed or verified without the source report. Record this
    explicitly as an open question (not resolved, not dismissed) -- someone needs to either
    locate/attach the original review report or explicitly drop these four items from tracking.

    Write in German where the surrounding planning docs are German (this repo's convention for
    planning notes), with korrekte Umlaute throughout per CLAUDE.md.

    Then, using the Edit tool, add a short cross-reference paragraph to
    `.planning/v1.4-MILESTONE-AUDIT.md`'s "## Non-Blocking Existing Debt" section (the same section
    Task 2 already edited -- append after Task 2's additions, do not conflict with them), linking to
    this new note file by its path for both open items, so the audit does not silently omit them.

    After both edits, commit with only these two exact paths:
    `git add .planning/notes/2026-09-03-offene-fragen-143-144.md .planning/v1.4-MILESTONE-AUDIT.md && git commit -m "docs(notes): record Phase 117 resolved history and open M3/M5/M6/M7 question"`
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s && test -f .planning/notes/2026-09-03-offene-fragen-143-144.md && echo FILE_EXISTS_OK; grep -c "260819-lm5" .planning/notes/2026-09-03-offene-fragen-143-144.md | grep -qx 1 && echo ITEM_A_OK; grep -c "M3/M5/M6/M7" .planning/notes/2026-09-03-offene-fragen-143-144.md | grep -qx 1 && echo ITEM_B_OK; grep -c "2026-09-03-offene-fragen-143-144" .planning/v1.4-MILESTONE-AUDIT.md | grep -qx 1 && echo AUDIT_CROSSREF_OK; A="$(git show --stat -1 --name-only | tail -n +3 | sort)"; B="$(printf '.planning/notes/2026-09-03-offene-fragen-143-144.md\n.planning/v1.4-MILESTONE-AUDIT.md\n' | sort)"; [ "$A" = "$B" ] && echo COMMIT_SCOPE_OK</automated>
  </verify>
  <done>New note file exists with Item A written as resolved/no-action-needed (referencing quick-task 260819-lm5 and 117-10-POST-HOC-CLOSURE.md) and Item B written as an open, unresolved question (confirmed via repo-wide grep that no source report exists); v1.4-MILESTONE-AUDIT.md's Non-Blocking Existing Debt section cross-references the new note file; commit touches only these two files.</done>
</task>

<task type="auto">
  <name>Task 5: DECISIONS.md — record the project-list isDone design decision</name>
  <files>DECISIONS.md</files>
  <action>
    Using the Edit tool, append a new dated entry at the END of `DECISIONS.md` (after the last
    existing entry, "2026-08-23 - GAP-06 (Phase 137)..."), matching the exact heading/section format
    shown in `<interfaces>` above: `## 2026-09-03 - {title}`, then `### Decision`, `### Context`,
    `### Why This Won`, `### Consequences`, `### Follow-ups Required`.

    Content: in the project-list view
    (`frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx`, the `isDone` logic), a
    release version is deliberately still considered "Erledigt" (done) as soon as the user has
    contributed ANYTHING confirmed -- even if something else on that same release version was
    rejected. State explicitly this is a deliberate decision, NOT a defect, even though Phase 144's
    code review flagged it as a finding.

    **### Decision** section: state the rule plainly (isDone stays `has_own_notes || has_own_media`,
    unchanged since Phase 143) and explicitly state this is NOT a defect.

    **### Context** section: preserve the user's own reasoning close to verbatim in German -- the
    project-list view answers whether a contribution was made to each release at all
    (Beitragsvollständigkeit / contribution completeness), not Überarbeitungsbedarf (revision need). A
    confirmed note satisfies that; a rejected image alongside it doesn't change that. Record the
    distinction: revision need belongs in the dashboard, where it has been surfaced since quick-tasks
    260903-czh and 260903-dth (the "Überarbeitung nötig" badge). The two surfaces deliberately answer
    different questions -- project-list = completeness, dashboard = revision need.

    IMPORTANT: explicitly state this supersedes the earlier reasoning recorded in
    `.planning/notes/2026-09-02-handoff-phase144.md` ("damit die Zähler nicht doppelt zählen" -- so
    the counters don't double-count), which is replaced by this completeness-vs-revision-need framing.

    **### Why This Won** section: the completeness-vs-revision-need distinction is a cleaner mental
    model than a doubly-loaded counter, and it matches how the two surfaces are already used in
    practice (project-list for an overview of what was touched, dashboard for what still needs work).

    **### Consequences** section: `isDone()` in the project-list view stays unchanged; no further
    code change results from this entry; a future code review must consult this entry before
    re-flagging the same behavior -- state this explicitly, since that is the entire purpose of
    writing the entry down.

    **### Follow-ups Required** section: none (documentation-only, decision locked).

    After editing, commit with only this file's exact path:
    `git add DECISIONS.md && git commit -m "docs(decisions): lock project-list isDone completeness-vs-revision-need decision"`
  </action>
  <verify>
    <automated>cd /home/d1sk/team4s && tail -30 DECISIONS.md | grep -c "^## 2026-09-03 - " | grep -qx 1 && echo NEW_ENTRY_OK; grep -c "damit die Z.hler nicht doppelt z.hlen" DECISIONS.md | grep -qx 1 && echo SUPERSEDES_OK; grep -c "NOT a defect\|kein Defekt\|nicht.*[Dd]efekt" DECISIONS.md | grep -qv '^0$' && echo NOT_A_DEFECT_OK; [ "$(git show --stat -1 --name-only | tail -n +3)" = "DECISIONS.md" ] && echo COMMIT_SCOPE_OK</automated>
  </verify>
  <done>DECISIONS.md's final entry is dated 2026-09-03, follows the Decision/Context/Why This Won/Consequences/Follow-ups Required structure, explicitly states the project-list isDone behavior is NOT a defect, and explicitly states it supersedes the "damit die Zähler nicht doppelt zählen" reasoning from 2026-09-02-handoff-phase144.md; commit touches only DECISIONS.md.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| Planner-authored bookkeeping text -> long-lived planning record | These five files are read by future sessions (human and AI) as ground truth about what happened and what was decided; an inaccurate or overstated claim here misleads future work more than a code bug would, since nothing type-checks or tests a markdown claim |
| Cross-file consistency | ROADMAP.md, v1.4-MILESTONE-AUDIT.md, and STATE.md must agree with each other and with the underlying 143-UAT.md/144-UAT.md source facts; drift between them is exactly the failure mode this plan exists to close |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|------------------|
| T-QUICKGQT-01 | Tampering | Accidental overwrite of unrelated ROADMAP.md/STATE.md/DECISIONS.md content while editing | mitigate | Each task's `<verify>` explicitly checks the commit's `--name-only` file list equals only the intended path(s); Task 3 additionally checks the diff is exactly 1 added / 1 removed line |
| T-QUICKGQT-02 | Repudiation | Overstating facts not actually present in source artifacts (e.g. inventing a truth/plan count) | mitigate | All figures embedded in task actions (19/19, 8/8, 18/18, 289/2183/0, quick-task IDs) are taken verbatim from 143-UAT.md, 144-UAT.md, and 144-VERIFICATION.md read during planning, not invented |
| T-QUICKGQT-03 | Information Disclosure | New note file records an internal, unresolved review-report gap (M3/M5/M6/M7) | accept | Internal planning doc only, no external distribution; recording the gap honestly is the point of the task |
| T-QUICKGQT-04 | Elevation of Privilege / scope creep | A documentation task drifting into touching production code or test files while "cleaning up nearby" | mitigate | Every task's `<files>` list and commit is scoped to exactly one or two documentation paths; `<verify>` blocks assert commit scope; task actions explicitly forbid touching anything outside the named file(s) |

No package-manager installs are part of this plan; the Package Legitimacy Gate does not apply.
</threat_model>

<verification>
1. `git log --oneline -5` shows five new commits, each touching exactly the file(s) named in its task.
2. `tail -n 2 .planning/ROADMAP.md` shows the Phase 143 and 144 rows as the true EOF, inside "## v1.4 Progress".
3. `grep -c "9/9" .planning/v1.4-MILESTONE-AUDIT.md` and `grep -c "260903-cjk" .planning/v1.4-MILESTONE-AUDIT.md` both report matches.
4. `grep "^last_updated:" .planning/STATE.md` shows the corrected 2026-09-03 timestamp.
5. `test -f .planning/notes/2026-09-03-offene-fragen-143-144.md` succeeds.
6. `tail -30 DECISIONS.md` shows the new dated entry with the supersession and "not a defect" statements.
7. `git diff --stat main~5..main -- backend/ frontend/ database/` (or equivalent, comparing against the pre-plan commit) reports zero changes -- confirms no production code or test file was touched anywhere across all five commits.
</verification>

<success_criteria>
- [ ] ROADMAP.md's v1.4 Progress table lists Phase 143 (19/19, Complete, 2026-09-02) and Phase 144 (8/8, Complete, 2026-09-03) as its true final two rows, and the Execution Order line reads through "...142 - 143 - 144"
- [ ] v1.4-MILESTONE-AUDIT.md's frontmatter reports `phases: 9/9`, `compliant_phases` includes 143 and 144, and a new phase-143 tech_debt entry documents the resolved Phase-142 debt without deleting the original entry
- [ ] v1.4-MILESTONE-AUDIT.md's body documents Phase 143/144 evidence rows, the resolved frontend-test-debt paragraph (289/2183/0), the Phase 144 UAT summary with all four quick-task references, and a cross-reference to the new open-questions note
- [ ] STATE.md's frontmatter last_updated reads 2026-09-03T12:00:00.000Z with zero other changes (1-line diff)
- [ ] .planning/notes/2026-09-03-offene-fragen-143-144.md exists with Item A (Phase 117) written as resolved and Item B (M3/M5/M6/M7) written as an open question, not conflated in tone
- [ ] DECISIONS.md's new final entry locks the project-list isDone decision, explicitly states it supersedes the "damit die Zähler nicht doppelt zählen" reasoning, and explicitly states this is not a defect
- [ ] Five separate commits exist, each scoped to exactly the file(s) its task names -- no production code file, no test file, touched anywhere
</success_criteria>

<output>
Create `.planning/quick/260903-gqt-planungs-buchhaltung-phasen-143-144-nach/260903-gqt-SUMMARY.md` when done
</output>
