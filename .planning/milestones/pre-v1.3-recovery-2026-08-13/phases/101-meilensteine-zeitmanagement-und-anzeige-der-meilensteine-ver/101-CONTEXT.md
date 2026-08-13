# Phase 101: Meilensteine Zeitmanagement und Anzeige der Meilensteine verbessern - Context

**Gathered:** 2026-07-13
**Status:** Ready for planning
**Source:** User discussion after Phase 100 achievement unlock work.

<domain>
## Phase Boundary

This phase improves the global rules around the existing Fansub group "Meilensteine" admin selection. It does not add new achievement types, new badge artwork, or a new history data model.

The current persisted field for group history timing is `fansub_group_history.year`, exposed in the frontend as a `YearPicker`. Therefore this phase treats "Datum" as a year-level rule: no milestone year before the group's founding year and no milestone year after the current calendar year.

This phase builds on Phase 100. The existing achievement-specific unlock rules for `founding`, `first_project`, `first_release`, `website_launch`, count achievements, `revival`, and other guarded types remain the source of truth. Phase 101 adds the ordering/gating shell around that catalog.
</domain>

<decisions>
## Locked Product Decisions

### D-01 Founding year is the timeline lower bound
- Once a Fansub group has `founded_year`, every new non-founding milestone year must be greater than or equal to that founding year.
- The UI must not offer years before the founding year in the `YearPicker`.
- The backend must reject direct create/update requests that try to save `year < founded_year`.

### D-02 Future years are never selectable
- The `YearPicker` maximum year is the current calendar year, not `2099`.
- On 2026-07-13 this means the maximum selectable year is `2026`.
- The backend must reject direct create/update requests with `year > current year`.

### D-03 No founded year means only locked founding is visible
- If the group has no `founded_year`, the Meilenstein event selector shows only `Gründung`, disabled with the reason `Gründungsjahr fehlt`.
- All other achievement/event types are hidden at this stage.

### D-04 Founded year unlocks only the first two next steps
- If the group has `founded_year`, the selector may show `Gründung` if unused.
- At that stage, only `Erstes Projekt` and `Erstes Release` are shown as the next visible achievements, using their existing locked/selectable states.
- Other milestone types are hidden until the group has both `first_project` and `first_release` entries.

### D-05 The full catalog appears only after first project and first release
- Existing later milestone types become visible only when the group already has both a `first_project` entry and a `first_release` entry.
- After that gate is passed, the existing Phase 100 per-achievement rules still apply: used single-use achievements disappear, unavailable achievements are disabled or hidden according to their existing rule.

### D-06 Editing an existing entry remains possible
- Editing an existing entry must keep that entry's event type available in the selector even if the normal add-flow gate would hide it.
- This preserves the current "editing its own entry" behavior from `buildHistoryEventOptions`.
</decisions>

<canonical_refs>
## Canonical References

- `AGENTS.md` - Team4s working rules, German UI strings, DB/API safety, and domain ownership rules.
- `docs/engineering/implementation-contract.md` - reuse-first planning and no duplicate seams.
- `docs/frontend/ui-system.md` - existing `YearPicker`, `FormField`, `Select`, and global UI primitives.
- `docs/agent-guidelines-ui.md` - year fields must use a year picker or constrained year control.
- `.planning/phases/100-fansub-erfolge-freischaltlogik-und-meilenstein-katalog/100-CONTEXT.md` - Phase 100 achievement catalog and workflow decisions.
- `.planning/phases/100-fansub-erfolge-freischaltlogik-und-meilenstein-katalog/100-00-PLAN.md` - current achievement-specific todo state.
- `frontend/src/components/groups/GroupHistorySection.tsx` - current option-building and save guards.
- `frontend/src/components/groups/GroupHistoryForm.tsx` - current milestone form and `YearPicker` min/max.
- `frontend/src/components/groups/GroupHistorySection.test.ts` - current pure tests for option availability.
- `frontend/src/components/groups/GroupHistoryForm.test.tsx` - current form behavior tests.
- `frontend/src/lib/group-history-events.ts` - current achievement catalog labels, images, and tones.
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEditSecondaryTabs.tsx` - current wiring of `foundedYear` and coverage flags into `GroupHistorySection`.
- `backend/internal/handlers/fansub_group_history_handler.go` - current admin create/update guards for history entries.
- `backend/internal/repository/fansub_group_history_repository.go` - current history persistence and unlock validators.
- `frontend/src/components/ui/YearPicker.tsx` - existing constrained year control.
</canonical_refs>

<deferred>
## Deferred

- Full date precision is out of scope; the current model stores only `year`.
- New public locked-catalog display is out of scope.
- New achievement artwork is out of scope.
- Backfilling existing test data is out of scope unless it blocks live UAT.
</deferred>
