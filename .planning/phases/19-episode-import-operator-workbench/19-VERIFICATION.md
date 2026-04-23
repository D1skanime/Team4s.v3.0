---
phase: 19-episode-import-operator-workbench
verified: 2026-04-19T00:00:00Z
status: human_needed
score: 4/5 must-haves verified
human_verification:
  - test: "Live import session on a real Jellyfin-linked anime: navigate to /admin/anime/[id]/episodes/import, load preview, review episode-grouped rows showing file_name + display_path, use bulk controls, then click Apply."
    expected: "Preview loads without crash. Mapping rows show readable file names (not opaque media IDs). Episode groups are visible. Bulk-skip and bulk-confirm buttons reduce per-row clicking. Apply persists confirmed rows and the episode overview is reachable afterward."
    why_human: "P19-SC5 (end-to-end live UAT) cannot be completed programmatically. Tests 4, 6, and 7 from the Phase-18 UAT are resolved at code level but have not been executed in a live Jellyfin session. The apply path requires a real Jellyfin-linked anime record and a running Docker Compose stack."
---

# Phase 19: Episode Import Operator Workbench — Verification Report

**Phase Goal:** Make the episode-import flow practical for real Jellyfin libraries by showing readable file evidence, treating parallel releases as version choices instead of false conflicts, and reducing manual skip work before apply.

**Verified:** 2026-04-19
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Mapping rows identify each Jellyfin candidate with readable file evidence (file name and folder path) instead of opaque media IDs. | VERIFIED | `EpisodeImportMappingRow` model carries `FileName`/`DisplayPath` fields (models/episode_import.go:42-49). `buildEpisodeImportPreview` populates them from real candidate data via `episodeImportFileName` and `episodeImportDisplayPath` helpers (handler:343-347, 384-412). TypeScript type has `file_name?` and `display_path?` (episodeImport.ts:24-26). `MappingRow` component renders `row.file_name` in bold and `row.display_path` in monospace (page.tsx:267-274). Test `TestPreviewEpisodeImport_MappingRowsCarryReadableFileEvidence` locks this (commit 483d59f). |
| 2 | Multiple real releases of the same canonical episode can coexist as separate episode versions without being treated as unresolved conflicts. | VERIFIED | `buildEpisodeImportApplyPlan` accepts multiple confirmed rows targeting the same episode — no exclusive episode-claim check exists in the apply path (repository:139-203). Only duplicate `media_item_id` is rejected (repository:179-181). `TestEpisodeImportApply_AllowsParallelReleasesForSameEpisode` locks this (commit 6fa7f05). Frontend `detectMappingConflicts` correctly marks parallel bulk-confirms as `conflict` so operator can consciously resolve per-episode — this is the intended behavior documented in 19-02-SUMMARY. |
| 3 | The operator can resolve or skip large candidate sets without repetitive one-row-at-a-time clicking. | VERIFIED | `markAllSuggestedSkipped`, `markAllSuggestedConfirmed`, `confirmEpisodeMappingRows`, `skipEpisodeMappingRows` all exist and are substantive (episodeImportMapping.ts:52-113). Hook exposes `skipAllSuggested`, `confirmAllSuggested`, `confirmEpisodeRows`, `skipEpisodeRows` (useEpisodeImportBuilder.ts:227-234). Page renders global bulk buttons and per-episode "Alle bestätigen"/"Alle überspringen" inline on each group header (page.tsx:111-135, 228-243). 5 new tests lock batch semantics (episodeImportMapping.test.ts:100-220+). |
| 4 | The import surface shows linked AniSearch source, Jellyfin series, and folder path clearly enough to diagnose wrong linkage before apply. | VERIFIED | `EpisodeImportContextResult` carries `anisearch_id`, `jellyfin_series_id`, `folder_path`, `source` (models:65-72). `loadEpisodeImportContext` populates all four fields including Jellyfin path-resolution fallback (handler:125-153). Context strip component renders all four fields always-visible below the hero (page.tsx:45-52). Note: if an anime was created without `folder_name` persisted (pre-existing create-flow bug), the strip shows "nicht gesetzt" — this is out of Phase 19 scope per 18-UAT.md. |
| 5 | Live UAT can complete the import flow end-to-end on a real anime library without crashing or becoming impractical to operate. | ? UNCERTAIN — needs human | Phase-18 UAT Tests 4 and 6 are marked resolved-by-code with commit references. Test 7 (Apply persistence) is now practically reachable but has not been executed with real Jellyfin data. No live session has been run since Phase 19 code landed. |

**Score:** 4/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/internal/models/episode_import.go` | `FileName`, `DisplayPath` on `EpisodeImportMappingRow` | VERIFIED | Lines 43-45: `FileName string`, `DisplayPath string` with omitempty. Comment documents operator-facing intent. |
| `backend/internal/handlers/admin_episode_import.go` | `buildEpisodeImportPreview` populates readable fields; `episodeImportDisplayPath` helper exists | VERIFIED | `FileName` and `DisplayPath` assigned from `episodeImportFileName` and `episodeImportDisplayPath` (lines 344-346). Helper at lines 396-412 derives grandparent/parent folder label. |
| `backend/internal/repository/episode_import_repository.go` | `buildEpisodeImportApplyPlan` accepts parallel confirmed rows | VERIFIED | Lines 139-203: no exclusive episode-claim map present. Duplicate `media_item_id` check at line 179 is the only structural guard. |
| `frontend/src/types/episodeImport.ts` | `file_name?`, `display_path?` on `EpisodeImportMappingRow` interface | VERIFIED | Lines 24 and 26: optional `file_name` and `display_path` with JSDoc comments. |
| `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts` | `markAllSuggestedSkipped`, `markAllSuggestedConfirmed`, `confirmEpisodeMappingRows`, `skipEpisodeMappingRows` | VERIFIED | All four functions present at lines 52-113, substantive implementations, run through `detectMappingConflicts`. |
| `frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts` | Exposes `episodeGroups`, `unmappedMappingRows`, `hasSuggestedRows`, bulk action dispatchers | VERIFIED | Interface at lines 50-62. All six computed values and four bulk actions wired in the return object (lines 203-235). |
| `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx` | Operator workbench: context strip, episode groups, summary pills, bulk buttons, MappingRow showing file evidence | VERIFIED | Context strip at lines 45-52. Summary pills at lines 88-97. Episode groups with `EpisodeGroup` component at lines 100-176. `MappingRow` renders `file_name`/`display_path` at lines 266-295. Global bulk buttons at lines 111-135. Per-episode buttons at lines 228-243. |
| `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts` | 9 tests total including 5 batch semantics tests | VERIFIED | File contains all 4 original tests plus 5 new batch tests covering `markAllSuggestedSkipped`, `markAllSuggestedConfirmed` (two cases), `confirmEpisodeMappingRows`, `skipEpisodeMappingRows`. All commits present (483d59f, 6fa7f05, 73cdc27, a758664). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `buildEpisodeImportPreview` | `EpisodeImportMappingRow.FileName/DisplayPath` | `episodeImportFileName` + `episodeImportDisplayPath` helpers | WIRED | handler.go:344-346 assigns from media candidate data; helpers are non-empty implementations |
| `buildEpisodeImportApplyPlan` | parallel release acceptance | Removed exclusive claim map; retained duplicate media_item_id guard | WIRED | repository.go:139-203; no claim map variable present |
| `useEpisodeImportBuilder` | `episodeImportMapping` helpers | Named imports at lines 19-28 | WIRED | All 7 helpers imported and called from action dispatchers |
| `page.tsx` | `useEpisodeImportBuilder` | `const builder = useEpisodeImportBuilder(animeID)` (line 18) | WIRED | All builder properties consumed in JSX |
| `MappingRow` | `row.file_name` / `row.display_path` | Direct property access on typed row prop | WIRED | `const label = row.file_name || row.media_item_id` (line 267); `display_path` conditionally rendered at line 274 |
| Context strip | `EpisodeImportContextResult` fields | `builder.context` object rendered to `ContextField` components | WIRED | Lines 45-52; all four context fields rendered |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `MappingRow` in page.tsx | `row.file_name`, `row.display_path` | `buildEpisodeImportPreview` → `episodeImportFileName(item)` from live Jellyfin `item.Path` / `item.Name` | Yes — derived from real Jellyfin API response fields, no hardcoded fallback beyond empty string | FLOWING |
| Context strip in page.tsx | `builder.context` | `getEpisodeImportContext` → `loadEpisodeImportContext` → `h.repo.GetAnimeSyncSource` DB query | Yes — real DB query; Jellyfin path resolution fallback for series ID | FLOWING |
| Episode groups in page.tsx | `builder.episodeGroups` | `useMemo` over `mappings` state populated from `previewEpisodeImport` API call | Yes — derived from live preview response; episode group map keyed by `suggested_episode_numbers[0]` | FLOWING |
| Summary pills in page.tsx | `builder.summary` | `useMemo` → `summarizeImportPreview({...preview, mappings})` | Yes — counts live mapping state | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Batch helper functions export from episodeImportMapping.ts | `node -e "const m = require('./frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts')"` | SKIP — TypeScript module, not directly runnable without build | ? SKIP |
| Backend tests for file evidence and parallel releases | Verified via `grep` — test functions `TestPreviewEpisodeImport_MappingRowsCarryReadableFileEvidence` and `TestEpisodeImportApply_AllowsParallelReleasesForSameEpisode` exist in test files | Found in both handler and repository test files | PASS |
| Commit hashes documented in SUMMARYs exist in git log | `git log --oneline` | All 5 commits (483d59f, 6fa7f05, 73cdc27, a758664, 189e55a) confirmed present | PASS |
| TypeScript types aligned with Go model | `file_name` and `display_path` in both Go `EpisodeImportMappingRow` and TS `EpisodeImportMappingRow` | Both carry the fields; Go uses `omitempty`, TS marks optional — consistent | PASS |

### Requirements Coverage

Phase 19 uses ROADMAP.md success criteria as its requirement IDs (P19-SC1 through P19-SC5). These IDs do not appear in REQUIREMENTS.md, which tracks earlier-phase requirements (PROV-*, UPLD-*, ENR-*, TAG-*). This is expected: P19-SC* are phase-specific success criteria declared in ROADMAP.md phase 19, not cross-phase v1 requirements.

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| P19-SC1 | 19-01, 19-02 | Mapping rows show readable file evidence (file name + folder path) instead of opaque media IDs | SATISFIED | `FileName`/`DisplayPath` on model; `buildEpisodeImportPreview` populates from real candidates; `MappingRow` renders `file_name` as primary label |
| P19-SC2 | 19-01, 19-02 | Multiple releases of the same canonical episode coexist as separate versions without being false conflicts | SATISFIED | Exclusive claim check removed from `buildEpisodeImportApplyPlan`; `TestEpisodeImportApply_AllowsParallelReleasesForSameEpisode` passes; parallel releases show as `conflict` for operator conscious resolution — intentional per design decision |
| P19-SC3 | 19-02 | Operator can resolve/skip large candidate sets without repetitive one-row-at-a-time clicking | SATISFIED | `markAllSuggestedSkipped`, `markAllSuggestedConfirmed`, `confirmEpisodeMappingRows`, `skipEpisodeMappingRows` implemented, wired, and tested; rendered as global + per-episode buttons in page |
| P19-SC4 | 19-01, 19-02 | Import surface shows AniSearch source, Jellyfin series, and folder path clearly | SATISFIED | Context strip always-visible; `EpisodeImportContextResult` carries all four fields; Jellyfin path-resolve fallback in `loadEpisodeImportContext`; residual: create-flow folder_name bug may leave `folder_path` empty for some anime (pre-existing, out of scope) |
| P19-SC5 | 19-03 | Live UAT can complete the import flow end-to-end without crashing or becoming impractical | NEEDS HUMAN | Phase-18 UAT updated to `pending-live-retest`; code blockers for Tests 4 and 6 resolved; Test 7 (Apply persistence) not yet executed with real Jellyfin data |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| page.tsx | 77, 81, 286 | `placeholder=` attribute in `<input>` | Info | Legitimate HTML form placeholder attributes — not stub indicators |

No blockers or warnings found. No `return null`, empty implementations, TODO/FIXME comments, or hardcoded empty data that flow to rendered output were detected in the phase 19 modified files.

### Human Verification Required

#### 1. Live Import Session End-to-End (P19-SC5)

**Test:** Start Docker Compose with current codebase. Navigate to a real anime that has `folder_name` set in the DB (use one linked from Jellyfin, or manually set `folder_name` in DB to bypass the pre-existing create-flow bug). Go to `/admin/anime/[id]/episodes/import`.

**Expected:**
- Context strip shows AniSearch ID, Jellyfin series, folder path, and source without scrolling.
- "Vorschau laden" populates episode-grouped mapping rows showing file names (e.g. `Bleach S03E11.mkv`) and short folder labels, not raw UUIDs.
- Summary pills update with candidate/suggested/confirmed counts.
- "Alle Vorschläge bestätigen" in the workbench header confirms all suggested rows in one click.
- Per-episode "Alle bestätigen" / "Alle überspringen" buttons on each episode group header work.
- When parallel releases for the same episode are bulk-confirmed, `conflict` badge appears and the operator can resolve per-episode.
- After all rows reach `confirmed` or `skipped`, "Mapping anwenden" becomes active.
- Apply succeeds, displays episodes_created/versions_created counts, and the "Zur Episodenübersicht" link is active.

**Why human:** Apply path requires a live Jellyfin-connected backend and a real anime record. Phase-18 UAT Tests 4, 6, and 7 are code-resolved but have not been run in a live session since Phase 19 landed.

#### 2. Parallel Release Conscious Resolution UX (P19-SC2 / UX aspect)

**Test:** In the live session above, use "Alle Vorschläge bestätigen" on an anime that has two release groups covering the same episode.

**Expected:** Both rows show `Konflikt` badge. The operator can use per-episode "Alle bestätigen" to explicitly accept both as parallel versions, then the workbench allows apply.

**Why human:** `detectMappingConflicts` marks parallel bulk-confirms as conflict by design. The operator experience of consciously resolving this cannot be fully verified from code alone.

### Gaps Summary

No blocking gaps were found at the code level. All four automated-verifiable success criteria (P19-SC1 through P19-SC4) are satisfied: the backend model, handler, repository, TypeScript types, helper functions, hook, and page component all exist, are substantive, are wired, and carry real data through to rendering.

The single outstanding item is P19-SC5 — live end-to-end operator verification — which requires a human with access to the running Docker Compose stack and a Jellyfin-linked anime. This is not a code deficiency; it is an intentional UAT gate that the phase documented as `pending-live-retest` in 18-UAT.md.

One pre-existing issue is noted but is explicitly out of Phase 19 scope: the create-flow does not persist `folder_name` when AniSearch is the primary provenance source (`appendCreateSourceLinkageToPayload` in `createPageHelpers.ts`). This causes the context strip to show "nicht gesetzt" for some anime. A follow-up quick task is recommended to fix this in the create flow.

---

_Verified: 2026-04-19_
_Verifier: Claude (gsd-verifier)_
