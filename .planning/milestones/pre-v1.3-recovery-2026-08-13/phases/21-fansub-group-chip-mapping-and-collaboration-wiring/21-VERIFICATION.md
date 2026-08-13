---
phase: 21-fansub-group-chip-mapping-and-collaboration-wiring
verified: 2026-04-23T09:01:30Z
status: human_needed
score: 5/5 must-haves verified
human_verification:
  - test: "Import an existing fansub group through the chip UI and apply the mapping"
    expected: "The row uses a chip, apply succeeds, and reload still shows the same group while release_version_groups and anime_fansub_groups match."
    why_human: "Requires a running frontend/backend plus DB inspection after a real operator action."
  - test: "Import a mixed existing plus new fansub-group selection such as FlameHazeSubs + TestGruppe"
    expected: "The backend creates or reuses one deterministic collaboration, fansub_collaboration_members contains the two members once, and reload reflects the member chips."
    why_human: "Automated code checks prove the resolver path exists, but not that live data and the current DB state produce the expected persisted rows."
  - test: "Save the same selected groups through the manual episode-version editor and reload"
    expected: "The save uses fansub_groups only, the effective release group stays backend-derived, and anime_fansub_groups remains aligned."
    why_human: "Needs a live editor flow plus persisted-state comparison across import and manual edit surfaces."
---

# Phase 21: Fansub Group Chip Mapping And Collaboration Wiring Verification Report

**Phase Goal:** Replace flat fansub-group text entry in episode import and manual version editing with reusable group chips, while keeping backend authority over new-group creation, deterministic collaboration building, and anime-level group linkage.
**Verified:** 2026-04-23T09:01:30Z
**Status:** human_needed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Episode-import mapping rows can reuse existing fansub groups through chip-style search/select instead of relying only on a flat text field. | VERIFIED | [EpisodeImportMappingRow.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx:79) searches `getFansubList`, filters out collaboration groups at line 84, and renders removable chips at lines 163-174. |
| 2 | Operators can still type a new group name in the same flow, and apply persists that new group without leaving the workbench. | VERIFIED | Free-text chips are added in [EpisodeImportMappingRow.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx:110), then serialized into the apply payload in [useEpisodeImportBuilder.ts](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts:317) and normalized by [episodeImportMapping.ts](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts:236). `buildEpisodeImportApplyInput keeps free-text chips after row edits` passes in [episodeImportMapping.test.ts](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts:474). |
| 3 | Selecting more than one group in import or manual version editing creates or reuses one deterministic collaboration group in the backend, rather than requiring an explicit collaboration chip in the UI. | VERIFIED | Import and manual writes both route through `resolveImportFansubSelectionFromInputs` in [episode_import_repository_release_helpers.go](/C:/Users/admin/Documents/Team4s/backend/internal/repository/episode_import_repository_release_helpers.go:256) and [episode_version_repository.go](/C:/Users/admin/Documents/Team4s/backend/internal/repository/episode_version_repository.go:900). Collaboration membership is written in [episode_import_repository_release_helpers.go](/C:/Users/admin/Documents/Team4s/backend/internal/repository/episode_import_repository_release_helpers.go:312). Order stability is covered by `TestBuildImportCollaborationName_IsStableAcrossSelectionOrder` in [episode_import_repository_test.go](/C:/Users/admin/Documents/Team4s/backend/internal/repository/episode_import_repository_test.go:145). |
| 4 | Episode-level patch actions such as `Episode` and `Ab hier` copy the selected group chips as a set, not just one text string. | VERIFIED | The row buttons call set-aware handlers in [EpisodeImportMappingRow.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx:233) and [EpisodeImportMappingRow.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx:241), which wire to `applyFansubGroupToEpisodeRows` and `applyFansubGroupFromEpisodeDown` in [useEpisodeImportBuilder.ts](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts:276). Multi-group patch behavior is covered by passing Vitest cases in [episodeImportMapping.test.ts](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts:388) and [episodeImportMapping.test.ts](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts:434). |
| 5 | Persisted release-version group links and `anime_fansub_groups` stay consistent with the effective group/collaboration chosen by the operator. | VERIFIED | Import writes `release_version_groups` then calls `ensureAnimeFansubGroupLinks` in [episode_import_repository_release_helpers.go](/C:/Users/admin/Documents/Team4s/backend/internal/repository/episode_import_repository_release_helpers.go:203) and [episode_import_repository_release_helpers.go](/C:/Users/admin/Documents/Team4s/backend/internal/repository/episode_import_repository_release_helpers.go:215). Manual saves do the same through `syncEpisodeVersionSelectedGroups` in [episode_version_repository.go](/C:/Users/admin/Documents/Team4s/backend/internal/repository/episode_version_repository.go:883). Follow-through ordering and idempotence are covered by passing backend tests in [episode_import_repository_test.go](/C:/Users/admin/Documents/Team4s/backend/internal/repository/episode_import_repository_test.go:186) and [episode_import_repository_test.go](/C:/Users/admin/Documents/Team4s/backend/internal/repository/episode_import_repository_test.go:210). |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx` | Chip-based import-row selector with search, free-text add, and patch actions | VERIFIED | Exists, substantive, and wired from the page. Existing-group search, free-text chips, and `Episode` / `Ab hier` actions are implemented. |
| `frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts` | Shared import-row state and apply payload wiring for selected-group sets | VERIFIED | Exists, substantive, and calls `applyEpisodeImport` with serialized `fansub_groups`. |
| `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts` | Set-aware group normalization, dedupe, and row patch helpers | VERIFIED | Exists, substantive, and backed by 29 passing import mapping tests. |
| `backend/internal/repository/episode_import_repository_release_helpers.go` | Backend-selected group resolver, deterministic collaboration builder, and anime link follow-through | VERIFIED | Exists, substantive, and writes `release_version_groups`, `fansub_collaboration_members`, and `anime_fansub_groups`. |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts` | Manual editor save path using the selected-group contract without frontend collaboration creation | VERIFIED | Exists, substantive, and submits `fansub_groups`. Explicit absence check found no `createFansubGroup`, `addCollaborationMember`, or `removeCollaborationMember` usage. |
| `backend/internal/repository/episode_version_repository.go` | Manual create/update wired through the shared backend resolver and anime link helper | VERIFIED | Exists, substantive, and reuses `resolveImportFansubSelectionFromInputs` plus `ensureAnimeFansubGroupLinks`. |
| `backend/internal/handlers/admin_content_episode_version_editor_helpers.go` | Editor reload resolves effective collaboration back into selected member chips | VERIFIED | Exists, substantive, and expands collaboration groups via `ListCollaborationMembers` into `selected_groups`. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `EpisodeImportMappingRow.tsx` | `getFansubList` | row-local search effect | WIRED | Search call at line 79; collaboration groups filtered from choices at line 84. |
| `useEpisodeImportBuilder.ts` | `applyEpisodeImport` | `buildEpisodeImportApplyInput` | WIRED | Apply call at lines 232-234; mappings serialized with `serializeEpisodeImportMappingRow` at line 326. |
| `episode_import_repository_release_helpers.go` | `fansub_collaboration_members` | `upsertImportCollaborationGroup` | WIRED | Collaboration rows inserted at line 312 after canonicalized member resolution. |
| `episode_import_repository_release_helpers.go` | `anime_fansub_groups` | `ensureAnimeFansubGroupLinks` after release write | WIRED | Release group write at line 203; anime follow-through called at line 215; inserts at line 411. |
| `useEpisodeVersionEditor.ts` | `updateEpisodeVersion` | `fansub_groups` payload | WIRED | Manual editor save issues `updateEpisodeVersion` at line 217 and sends `fansub_groups` at line 221. |
| `episode_version_repository.go` | shared group resolver | `resolveImportFansubSelectionFromInputs` | WIRED | Manual repository sync calls shared resolver at line 900, then persists `release_version_groups` at line 927 and anime follow-through at line 934. |
| `admin_content_episode_version_editor_helpers.go` | collaboration member expansion | `ListCollaborationMembers` | WIRED | Editor context turns effective collaboration groups back into member-chip state for reloads. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `EpisodeImportMappingRow.tsx` | `selectedFansubGroups`, `results` | `row.fansub_groups` from builder state and `getFansubList()` search results | Yes | FLOWING |
| `useEpisodeImportBuilder.ts` | `mappings` | Preview state edited through set-aware helpers, then sent to `applyEpisodeImport()` | Yes | FLOWING |
| `episode_import_repository_release_helpers.go` | `selection.EffectiveGroup`, `selection.MemberGroups` | DB-backed group lookup/upsert plus collaboration-member inserts | Yes | FLOWING |
| `useEpisodeVersionEditor.ts` | `selectedGroups` | Editor-context `selected_groups`, search results from `getFansubList()`, and save payload to `updateEpisodeVersion()` | Yes | FLOWING |
| `admin_content_episode_version_editor_helpers.go` | `SelectedGroups` | Effective persisted group from repo, expanded via `ListCollaborationMembers()` when it is a collaboration | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Backend selected-group validation, resolver, and repository wiring compile and pass tests | `go test ./internal/repository ./internal/handlers -count=1` | `ok team4s.v3/backend/internal/repository` and `ok team4s.v3/backend/internal/handlers` | PASS |
| Import mapping set-aware chip helpers and payload builder behave as expected | `npm test -- episodeImportMapping.test.ts` | `29 passed` in `episodeImportMapping.test.ts` | PASS |
| Live import/manual persistence against the current DB | Not run | Requires operator flow plus DB state inspection | SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `P21-SC1` | `21-02-PLAN.md` | Import rows reuse existing fansub groups through chip-style search/select. | SATISFIED | Implemented in `EpisodeImportMappingRow.tsx` search + chip UI. Roadmap-only: ID not present in `.planning/REQUIREMENTS.md`. |
| `P21-SC2` | `21-01-PLAN.md`, `21-02-PLAN.md` | Operators can type a new group name and apply it from the same flow. | SATISFIED | Free-text chip add plus apply payload serialization are implemented and tested. Roadmap-only: ID not present in `.planning/REQUIREMENTS.md`. |
| `P21-SC3` | `21-01-PLAN.md`, `21-03-PLAN.md` | Multi-group selections in import or manual editing resolve to one deterministic backend collaboration. | SATISFIED | Shared backend resolver + deterministic collaboration naming test. Roadmap-only: ID not present in `.planning/REQUIREMENTS.md`. |
| `P21-SC4` | `21-02-PLAN.md` | `Episode` and `Ab hier` patch actions copy selected chips as a set. | SATISFIED | Set-aware patch helpers and passing Vitest coverage. Roadmap-only: ID not present in `.planning/REQUIREMENTS.md`. |
| `P21-SC5` | `21-01-PLAN.md`, `21-03-PLAN.md` | `release_version_groups` and `anime_fansub_groups` stay aligned with the effective persisted group. | SATISFIED | Import and manual repository paths both write release group state and anime follow-through. Roadmap-only: ID not present in `.planning/REQUIREMENTS.md`. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| - | - | No blocker anti-patterns found in the phase files. The scan only surfaced benign `placeholder` UI attributes and null-return helper branches. | INFO | No stubbed or hollow implementations detected in the verified phase paths. |

### Human Verification Required

### 1. Import Existing Group Chip

**Test:** Open `/admin/anime/{anime_id}/episodes/import`, search/select one existing group chip, apply, then reload the import or version editor surface.  
**Expected:** The same chip remains selected, no explicit collaboration chip is needed, and the persisted group matches `release_version_groups` plus `anime_fansub_groups`.  
**Why human:** Requires the live import UI, backend, and DB state after a real apply.

### 2. Import New Collaboration Member Set

**Test:** In the import workbench, select one existing group plus one newly typed chip such as `FlameHazeSubs` + `TestGruppe`, apply, then inspect `release_version_groups`, `fansub_collaboration_members`, and `anime_fansub_groups`.  
**Expected:** One backend-owned collaboration is created or reused deterministically, member rows are stored exactly once, and anime links include both members plus the collaboration.  
**Why human:** The code proves the path exists, but current DB contents and runtime behavior still need confirmation.

### 3. Manual Editor Save And Reload

**Test:** Open `/admin/episode-versions/{version_id}/edit`, choose the same member groups, save, and reload.  
**Expected:** The request persists through `fansub_groups`, the effective saved group stays backend-derived, and reload expands the collaboration back into member chips.  
**Why human:** Needs a real save/reload cycle against the current environment.

### Gaps Summary

No automated implementation gaps were found. The remaining work is live UAT: the phase now has the code paths, wiring, and tests expected for the goal, but final proof of goal achievement still depends on runtime verification across import, manual save, and database persistence.

---

_Verified: 2026-04-23T09:01:30Z_  
_Verifier: Claude (gsd-verifier)_
