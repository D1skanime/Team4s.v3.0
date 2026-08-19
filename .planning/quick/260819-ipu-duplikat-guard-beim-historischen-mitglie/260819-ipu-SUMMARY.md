---
phase: quick-260819-ipu
plan: 01
subsystem: frontend/admin-fansubs
tags: [fansub-groups, historical-members, duplicate-guard, ui-warning]
requires: []
provides:
  - findDuplicateMemberMatches (frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts)
  - DuplicateMemberMatch type
affects:
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx
tech-stack:
  added: []
  patterns:
    - "Client-side name matching against already-loaded data (no new backend endpoint)"
    - "Soft-guard UX: canSave gated on explicit Switch confirmation, never a hard block"
key-files:
  created: []
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts
    - frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.test.ts
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx
    - frontend/src/app/admin/admin.module.css
decisions:
  - "Matching is a pure client-side function against tab.members (already loaded via listGroupMembers); no new backend endpoint, route, or contract change, per plan's investigation findings."
  - "Warning applies only to the create path (editTarget === null); renaming an existing member never triggers it."
metrics:
  duration: "~20min"
  completed: 2026-08-19
---

# Quick Task 260819-ipu: Duplikat-Guard beim historischen Mitglied-hinzufügen Summary

Adds a non-blocking duplicate-name warning to the "Mitglied hinzufügen" form on the Fansub-Gruppen-Edit-Seite, closing Live-UAT Findings #27/#28: a name collision with an existing group member (prioritizing active/linked matches) now surfaces a warning card and requires explicit confirmation via a Switch before "Speichern" is enabled — legitimate name duplicates remain possible after confirming (soft guard, no hard block).

## What Was Built

- **`findDuplicateMemberMatches(members, displayName)`** (new export in `useGroupMembersTab.ts`, alongside `DuplicateMemberMatch` type): case-insensitive, trimmed exact-match lookup against a group's already-loaded `HistFansubGroupMember[]`. Sorts active/linked matches (`active_app_member_id` or `app_user_id` set) first. Empty/whitespace-only name returns `[]`.
- **`GroupMemberFormModals.tsx`**: new `existingMembers` prop; `duplicateConfirmed` state resets on every displayName change (`useEffect`); `duplicateMatches` computed via `useMemo`, empty when editing (`editTarget !== null`) since the warning only applies to new-member creation. When matches exist, a `Card` (`variant="nested"`, new `.warningBox` class) renders directly under the "Anzeigename" field with German warning text referencing the top-priority match ("aktiv/verknüpft" vs. "historisch", plus an "und N weitere Einträge" suffix for multiple matches) and a `Switch` labeled "Ja, trotzdem als neuen Eintrag anlegen". `canSave` now additionally requires `duplicateMatches.length === 0 || duplicateConfirmed`.
- **`admin.module.css`**: new `.warningBox` class mirrors the existing `.errorBox`/`.successBox` pattern, using `var(--color-warning)` for border/background/text instead of `--color-error`/`--color-success`.
- **`GroupMembersTab.tsx`**: passes `existingMembers={tab.members}` (the group's already-loaded full historical member list) to `GroupMemberFormModals` — no new fetch.

No backend changes (matching relies entirely on data the frontend already loads via `listGroupMembers`/`ListByFansubGroupWithDisplay`).

## Verification

- `npx vitest run "src/app/admin/fansubs/[id]/edit/useGroupMembersTab.test.ts"` — all 7 tests pass (2 pre-existing `roleLabelForCode` + 5 new `findDuplicateMemberMatches` cases: case-insensitive/trimmed match, active-linked flag detection, active-linked-first sort order, empty/whitespace name → `[]`, no-match → `[]`). Ran inside the `team4sv30-frontend` container (`docker exec team4sv30-frontend sh -c "cd /app && npx vitest run ..."`) since local `frontend/node_modules` is not populated on this host.
- `npm run typecheck` (`tsc --noEmit`, same container) — clean, zero errors, after `existingMembers` was wired into `GroupMembersTab.tsx`.
- TDD gate sequence followed for Task 1: RED commit `e3b1baf0` (test-only, 5 new tests confirmed failing with `TypeError: findDuplicateMemberMatches is not a function`) → GREEN commit `e9becb14` (implementation + warning card + CSS, all tests pass).

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| `e3b1baf0` | test | RED: 5 failing tests for `findDuplicateMemberMatches` |
| `e9becb14` | feat | GREEN: `findDuplicateMemberMatches` + warning card/Switch in create-member modal + `.warningBox` CSS |
| `df1033bf` | feat | `existingMembers={tab.members}` wired into `GroupMembersTab.tsx` |

## Deviations from Plan

None — plan executed exactly as written. Task 1 followed the plan's explicit RED/GREEN TDD sequence (test commit, then implementation commit) even though the plan-level frontmatter `type` is `execute`, not `tdd`; this matches the executor's task-level `tdd="true"` handling.

## Task 3 (Live-UAT, blocking human-verify checkpoint): APPROVED

Frontend container restarted (`docker restart team4sv30-frontend`); admin confirmed live on `http://192.168.235.196:3000`: warning card appears on name collision with correct "(aktiv/verknüpft)" vs. "(historisch)" labeling, "Speichern" is gated behind the confirmation switch, and unique names show no warning. Resume signal received: "approved - Duplikat-Guard live bestaetigt (Warnkarte bei existierendem Namen mit aktiv/verknuepft-Hinweis, Speichern erst nach Bestaetigungs-Switch, eindeutige Namen ohne Warnung)."

## Self-Check: PASSED

- `frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts` — FOUND, contains `findDuplicateMemberMatches`/`DuplicateMemberMatch`.
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx` — FOUND, contains `existingMembers` prop, warning `Card`+`Switch`, updated `canSave`.
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx` — FOUND, contains `existingMembers={tab.members}`.
- `frontend/src/app/admin/admin.module.css` — FOUND, contains `.warningBox`.
- Commits `e3b1baf0`, `e9becb14`, `df1033bf` — all FOUND in `git log --oneline`.
