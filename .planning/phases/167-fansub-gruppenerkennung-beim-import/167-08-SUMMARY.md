---
phase: 167-fansub-gruppenerkennung-beim-import
plan: 08
subsystem: ui
tags: [react, nextjs, typescript, fansub-alias, admin, audit-log]

# Dependency graph
requires:
  - phase: 167 (Plan 03, backend)
    provides: "PATCH /fansubs/:id/aliases/:aliasId/reassign endpoint that reassignFansubAlias calls"
  - phase: 167 (Plan 04, frontend contract)
    provides: "reassignFansubAlias(fansubID, aliasID, payload, authToken?) API client function + FansubAliasReassignRequest type"
provides:
  - "FansubAliasSection.tsx — full create/reassign/delete alias CRUD UI for a fansub group, sibling-rendered in the existing Grunddaten tab"
  - "Four new ChangeEntryTranslator.ts cases (fansub_group_alias.created/.deleted/.reassigned/.learned) closing D-09's audit-visibility requirement in the existing GroupChangesTab history"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sibling-section rendering: new admin-editor sections are added as additional siblings inside an existing tab's already-open conditional branch (FansubDetailsTab.tsx), never nested inside a near-limit file (FansubBasicInfoTab.tsx, 440/450 lines) — keeps the near-limit file byte-identical while the new UI still lives in the correct tab"
    - "Two independent list-load paths in one component (primary getFansubAliases surfaced as ErrorState/LoadingState, secondary getFansubList silently best-effort for a dropdown) so a secondary data source's failure never blocks the primary CRUD surface"

key-files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.test.tsx
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/FansubDetailsTab.tsx
    - frontend/src/app/admin/changes/ChangeEntryTranslator.ts
    - frontend/src/app/admin/changes/ChangeEntryTranslator.test.ts
    - frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx

key-decisions:
  - "isPlatformAdmin prop accepted but intentionally unused for additional gating beyond hasAuthSession — every alias mutation endpoint is already capability-checked server-side (Plan 03's dual CanForFansubGroup check); this component only mirrors hasAuthSession for UX-disabling, matching the sibling components' existing convention in this directory (documented inline with a `void isPlatformAdmin` + comment, not silently dropped)"
  - "Reassign-target Select defaults its per-row state to the alias's current fansub_group_id (excluded from the option list) rather than the first available group — guarantees the 'Umhängen' button starts disabled per-row without a separate disabled-by-default flag"

requirements-completed: [REQ-167-16, REQ-167-17, REQ-167-22]

# Metrics
duration: ~20min
completed: 2026-09-23
---

# Phase 167 Plan 08: Fansub-Alias-Verwaltung (UI) + Audit-Übersetzung Summary

**New `FansubAliasSection` component gives admins full create/reassign/delete alias CRUD from the existing group edit page, and four new `ChangeEntryTranslator` cases make every alias mutation legible in German in the existing audit history tab.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-23T14:49:33Z (approx, first file read after prior plan's commit)
- **Completed:** 2026-09-23T14:56:21Z
- **Tasks:** 2/2 completed
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- `FansubAliasSection.tsx` (281 lines) provides the complete D-09 alias lifecycle UI: a `Card`-hosted table (Alias | Erstellt am | Aktionen) with loading/error/empty states exactly per `167-UI-SPEC.md`, a per-row reassign `Select` + "Umhängen" button (disabled until a differing target is chosen) and an icon-only "Löschen" button, plus a "Neuer Alias" `FormField`/`Input`/`Button` that stays visible even when the table is empty (the UI-SPEC's explicit deviation from `GroupRolesTab`'s full-replace pattern).
- Both destructive/mutating actions (delete, reassign) are gated by `useConfirmDialog({ tone: 'danger' })` with the exact German copy from the plan's Copywriting Contract — no silent changes, per D-02.
- Duplicate-alias conflicts (`ApiError.status === 409`) surface as an inline `FormField` error ("Dieses Kürzel gehört bereits zu einer anderen Gruppe.") rather than a toast or dialog, matching the existing `FansubCommunityLinksList.tsx` convention.
- `FansubDetailsTab.tsx` renders `<FansubAliasSection .../>` as a new sibling of `<FansubBasicInfoTab .../>` inside the existing `activeMainTab === "basic"` branch — `FansubBasicInfoTab.tsx` itself is untouched and verified still exactly 440 lines.
- `ChangeEntryTranslator.ts` gained a `payloadNumber` helper (mirroring the existing `payloadString`) and four new `case` blocks for `fansub_group_alias.created/.deleted/.reassigned/.learned`, closing the gap where these audit events would otherwise render as the generic unmapped fallback in `GroupChangesTab`. The `.deleted` case honestly uses `entry.target_id` rather than inventing an alias name, since that event's real backend payload carries no alias text (this file's own documented "niemals raten" discipline).
- Zero native `<button>`/`<input>`/`<select>` in the new component (`grep -c` verified 0); all German strings use real umlauts.

## Task Commits

1. **Task 1: FansubAliasSection component** - `00bc591d` (feat)
2. **Task 2: Wire into FansubDetailsTab + audit sentence translation** - `74fd8aa9` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified

- `frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.tsx` (281 lines, new) — alias CRUD component.
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAliasSection.test.tsx` (new) — 8 Vitest cases covering load/empty/error/create-success/create-conflict/delete-confirm/delete-cancel/reassign.
- `frontend/src/app/admin/fansubs/[id]/edit/FansubDetailsTab.tsx` (+8 lines) — sibling-render insertion, exactly as specified in the plan's `<interfaces>` block.
- `frontend/src/app/admin/changes/ChangeEntryTranslator.ts` (+27 lines) — `payloadNumber` helper + 4 new cases.
- `frontend/src/app/admin/changes/ChangeEntryTranslator.test.ts` (+50 lines) — 4 new test cases, one per new event type.
- `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx` (Rule 1 fix, +6/-1 lines) — see Deviations below.

## Decisions Made

- Followed the plan's exact component/prop shapes and Copywriting Contract without deviation; no headless-mode gate decisions were required since the plan's `<action>`/`<interfaces>` blocks were fully specified.
- `groups` (for the reassign dropdown) is loaded once on mount via a secondary, independently-caught fetch path so that a failure there never blocks or errors the primary alias table/CRUD surface — matches D-09/UI-SPEC's framing of the group list as a supporting, not primary, data source (Design-Entscheidung 10).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed a stale `getFansubList` non-call assertion in `page.test.tsx`**
- **Found during:** Task 2 verification (`npx vitest run "src/app/admin/fansubs/[id]/edit/"`)
- **Issue:** `page.test.tsx`'s "hides slug management from non-platform fansub leads..." test asserted `expect(apiMocks.getFansubList).not.toHaveBeenCalled()`. That assertion's real intent (per the test name/scenario) was to prove no slug-uniqueness lookup (`getFansubList({ q: slug, per_page: 200 })`, in `useFansubDetailsForm.ts`) fires when slug management is hidden. It happened to also assert the mock was never called at all — which broke the instant `FansubAliasSection` began making its own, unrelated `getFansubList({ per_page: 100 })` call for the reassign-target dropdown, since that section now always mounts on the "basic" tab.
- **Fix:** Narrowed the assertion to check that no call included a `q` parameter (the slug-search shape), preserving the test's original intent while accommodating the new, intentional, independent alias-dropdown fetch.
- **Files modified:** `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx`
- **Verification:** `npx vitest run "src/app/admin/fansubs/[id]/edit/page.test.tsx"` — 36/36 pass.
- **Committed in:** `74fd8aa9` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix, in-scope regression from this plan's own new component)
**Impact on plan:** Necessary to keep the pre-existing test suite green after adding the new component's independent data fetch. No scope creep — the fix only narrows one assertion to its originally-intended scope.

## Issues Encountered

None beyond the deviation above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- D-09 (alias lifecycle management + audit visibility) is now fully closed end-to-end: backend (Plan 03), frontend contract (Plan 04), and this plan's UI + audit translation.
- No blockers for future phases. `FansubAliasSection` is a self-contained, sibling-rendered component with no further wiring expected.

---
*Phase: 167-fansub-gruppenerkennung-beim-import*
*Completed: 2026-09-23*

## Self-Check: PASSED

All 6 created/modified files and both task commit hashes (`00bc591d`, `74fd8aa9`)
verified present on disk / in `git log`.
