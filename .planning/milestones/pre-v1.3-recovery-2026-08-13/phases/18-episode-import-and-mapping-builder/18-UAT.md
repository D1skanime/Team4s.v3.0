---
status: pending-live-retest
phase: 18-episode-import-and-mapping-builder
source:
  - 18-01-SUMMARY.md
  - 18-02-SUMMARY.md
  - 18-03-SUMMARY.md
  - 18-04-SUMMARY.md
  - 19-01-SUMMARY.md
  - 19-02-SUMMARY.md
started: "2026-04-19T19:29:28.4501979+02:00"
updated: "2026-04-20T11:14:23Z"
---

## Current Test

number: 7
name: Apply Persists Confirmed Mappings
expected: |
  Nach explizitem Apply werden nur bestaetigte oder uebersprungene Zuordnungen gespeichert. Canonical Episode-Titel werden fill-only behandelt, eine Jellyfin-Datei kann mehrere Episoden ueber Coverage abdecken, und die Episodenuebersicht bleibt danach nutzbar.
awaiting: live-operator-retest (code blockers from Phase 19 are resolved; operator must verify end-to-end in a real Jellyfin-linked anime session)

## Phase 19 Code Evidence

Phase 19 Plans 01 and 02 resolved the three blocking gaps identified at Phase 18 UAT stop. This section records what changed in code and what still requires a live operator session.

### Gap: Opaque media IDs in mapping rows (Test 6)

**Status: Resolved by code**

Phase 19-01 added `file_name` and `display_path` fields to `EpisodeImportMappingRow` (Go model + TypeScript type). The backend preview handler (`buildEpisodeImportPreview`) now populates `FileName` from the Jellyfin media candidate and `DisplayPath` from `episodeImportDisplayPath`, which derives a grandparent/parent folder label (e.g. `GroupName/Episode.mkv`) to give release-group context without exposing the full absolute path.

Phase 19-02 updated the mapping row renderer to show `file_name` in bold and `display_path` in monospace instead of the raw `media_item_id`. Operators now see the actual filename at a glance.

Commits: `483d59f` (backend DTO + tests), `73cdc27` (frontend workbench render)

### Gap: False conflicts for parallel releases (Test 6)

**Status: Resolved by code**

Phase 19-01 removed the exclusive episode-claim check from `buildEpisodeImportApplyPlan` in `episode_import_repository.go`. Multiple distinct files confirmed for the same canonical episode are accepted as parallel version rows. The duplicate `media_item_id` guard remains to catch structural input errors.

Phase 19-02 clarified the remaining conflict path: when an operator bulk-confirms rows, `detectMappingConflicts` correctly flags parallel releases as `conflict` so the operator can consciously verify intentional versioning before apply — this is the right behavior, not a false positive.

Tests locking these semantics: `TestEpisodeImportApply_AllowsParallelReleasesForSameEpisode`, `TestEpisodeImportApply_RejectsDuplicateMediaItemID`

Commit: `6fa7f05`

### Gap: Preview crash on null arrays (Test 4)

**Status: Resolved by code**

Phase 19-01 fixed null-slice normalization in the backend handler (`buildEpisodeImportPreview`) so empty arrays are always serialized instead of `null`. The frontend hook (`useEpisodeImportBuilder`) now treats all preview list fields defensively as empty arrays.

The client-side exception from Phase 18 Test 4 was caused by the frontend attempting to iterate over `null` — that codepath no longer exists after these changes.

Commits: `483d59f` (backend normalize), `73cdc27` (frontend defensive handling)

### Gap: Import context missing folder path (Test 3)

**Status: Out of scope for Phase 19 — residual, narrowly bounded**

The Test 3 issue (`Issue der anime hat den order path`) was about the *create-flow payload* not persisting `folder_name` from the Jellyfin preview path when AniSearch was the primary provenance source. This is a `createPageHelpers.ts` / `appendCreateSourceLinkageToPayload` issue in the create flow, not in the episode import page itself.

Phase 19 scoped only the operator workbench (episode import preview + apply). The import context endpoint reads `folder_name` from the already-persisted anime record — if that record was created without the folder path (due to the Phase-18 create-flow bug), the import context will show an empty `folder_path`.

This is a pre-existing bug in the create workflow and should be tracked as a follow-up outside Phase 19 scope. The import page itself loads and displays whatever folder path is stored; it is not broken on its own.

## Tests

### 1. Cold Start Smoke Test
expected: Nach einem frischen Docker-Start laufen Backend, Frontend, Datenbank und Redis ohne sichtbare Fehler. Die neue Migration fuer Episode-Coverage ist angewendet, `/admin/anime/1/episodes/import` laedt mit Status 200, `/admin/anime/create` laedt weiterhin mit Status 200, und die Basis-API `/api/v1/anime` antwortet live.
result: pass

### 2. Episode Import Entry Point
expected: Auf der bestehenden Episoden-Uebersicht eines Anime gibt es eine sichtbare Aktion `Import & Mapping`, die zur neuen Import-Seite `/admin/anime/[id]/episodes/import` fuehrt.
result: pass

### 3. Import Context And Source Controls
expected: Die Import-Seite zeigt den Anime-Kontext, inklusive Titel und verknuepftem Ordnerpfad, sowie Quellen-/Steuerfelder fuer AniSearch-Kanon, Jellyfin-Medien und optionale Mapping-Anpassung.
result: partial
reported: "Issue der anime hat den order path — pre-existing create-flow bug; import page itself loads correctly. Context strip (Phase 19-02) now shows AniSearch ID, Jellyfin series, folder path, and source in a compact always-visible bar. Requires live retest on an anime created with folder_name persisted correctly."
severity: minor
phase19_change: "Context strip added by Phase 19-02 makes context always visible without scrolling. Root cause (create-flow folder_name not persisted) is a separate pre-existing issue."

### 4. Preview Keeps Canonical Episodes Separate From Media
expected: Nach `Preview` werden AniSearch-Episoden als kanonische Episodenliste und Jellyfin-Dateien/Medien als separate Kandidaten angezeigt. Jellyfin-SxxExx-Werte dienen nur als Vorschlag und ersetzen nicht die AniSearch-Episodennummern.
result: resolved-by-code
reported: "Application error (client-side crash) was caused by null array serialization. Phase 19-01 fixed backend nil-slice normalization and frontend defensive handling. Requires live retest to confirm no crash."
severity: fixed
phase19_change: "Backend always returns empty arrays; frontend treats all preview lists as empty arrays defensively."

### 5. Manual Multi-Episode Mapping
expected: In einer Mapping-Zeile kann ein Jellyfin-Medium auf mehrere kanonische Episoden gesetzt werden, zum Beispiel `9,10`. Die Eingabe wird sortiert/dedupliziert, als bestaetigt markiert und bleibt vor dem Apply editierbar.
result: pass

### 6. Conflict And Skip Control
expected: Konflikte zwischen aktiven Mapping-Zeilen sind sichtbar, `Apply` bleibt bei `suggested` oder `conflict` deaktiviert, und einzelne Zeilen koennen bewusst uebersprungen werden.
result: resolved-by-code
reported: "Parallel releases are now accepted as valid parallel versions (not false conflicts). Mapping rows now show file_name + display_path instead of opaque media_item_id. Phase 19-02 also adds bulk-skip (Alle überspringen) and bulk-confirm (Alle bestätigen) at global and per-episode level, reducing manual skip friction for large libraries."
severity: fixed
phase19_change: "Phase 19-01: apply plan allows parallel versions; mapping rows carry readable file evidence. Phase 19-02: episode-grouped workbench with bulk resolution controls."

### 7. Apply Persists Confirmed Mappings
expected: Nach explizitem Apply werden nur bestaetigte oder uebersprungene Zuordnungen gespeichert. Canonical Episode-Titel werden fill-only behandelt, eine Jellyfin-Datei kann mehrere Episoden ueber Coverage abdecken, und die Episodenuebersicht bleibt danach nutzbar.
result: pending-live-retest
blocked_by: none
reason: "Code blockers (Tests 4 and 6) are resolved by Phase 19. Apply path is now practically reachable. Requires a live operator session on a real Jellyfin-linked anime to verify persistence and episode overview navigation."

### 8. Existing Create Flow Still Works
expected: Der bereits abgeschlossene Anime-Create-Flow unter `/admin/anime/create` laedt weiterhin und zeigt keine Regression durch die neue Episode-Import-Route.
result: pass

## Summary

total: 8
passed: 4
issues: 1
resolved_by_code: 2
pending_live_retest: 1
skipped: 0
blocked: 0

## Verification Status

Phase 18 + Phase 19 have resolved all code-level blockers identified in the original UAT stop.

Remaining work:
- Tests 4 and 6 resolutions require a live operator retest to confirm no regression in a real Jellyfin session
- Test 7 (Apply Persists) is now practically reachable but has not yet been executed end-to-end with real data
- Test 3 (Import Context / folder path) has a residual pre-existing create-flow bug that is out of Phase 19 scope

Phase 19 must-haves are met:
- Mapping rows show readable file evidence (file_name + display_path) — code verified
- Parallel releases for the same episode are allowed without false conflict rejection — code verified
- Bulk resolution controls (global + per-episode) reduce skip friction for large libraries — code verified
- The operator workbench layout (context strip, episode groups, status accents) provides a practical triage surface — code verified

Next step:
- Operator performs a live retest of Tests 4, 6, and 7 on a real anime with a linked Jellyfin folder path
- If Test 3 folder_name create-bug is a blocker for testing, create a new anime with the correct folder_name first, or fix the create-flow bug as a follow-up quick task

## Gaps

- truth: "Die Import-Seite zeigt den Anime-Kontext, inklusive Titel und verknuepftem Ordnerpfad, sowie Quellen-/Steuerfelder fuer AniSearch-Kanon, Jellyfin-Medien und optionale Mapping-Anpassung."
  status: partial
  reason: "Import page loads correctly. Context strip always visible (Phase 19-02). Pre-existing create-flow bug means some anime may have empty folder_name stored. Out of Phase 19 scope."
  severity: minor
  test: 3
  root_cause: "appendCreateSourceLinkageToPayload in createPageHelpers.ts did not fall back to Jellyfin preview path when AniSearch provenance was active."
  artifacts:
    - path: "frontend/src/app/admin/anime/create/createPageHelpers.ts"
      issue: "appendCreateSourceLinkageToPayload setzte folder_name aus dem AniSearch-Draft und fiel nicht auf die Jellyfin-Vorschau zurueck."
  missing:
    - "Follow-up quick task: fix create payload to persist folder_name from Jellyfin preview when AniSearch is primary provenance."
- truth: "Nach `Preview` werden AniSearch-Episoden als kanonische Episodenliste und Jellyfin-Dateien/Medien als separate Kandidaten angezeigt. Jellyfin-SxxExx-Werte dienen nur als Vorschlag und ersetzen nicht die AniSearch-Episodennummern."
  status: resolved-by-code
  reason: "Backend nil-slice normalization fixed in Phase 19-01. Frontend defensive handling added. Live retest needed to confirm."
  severity: fixed
  test: 4
  root_cause: "Backend serialisierte fehlende Jellyfin-Kandidaten als null; das Frontend renderte die Preview wie Arrays und crashte clientseitig."
  artifacts:
    - path: "backend/internal/handlers/admin_episode_import.go"
      issue: "buildEpisodeImportPreview normalisierte nil slices nicht — fixed in Phase 19-01 commit 483d59f"
    - path: "frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts"
      issue: "Preview-Antworten wurden vor dem Rendern nicht defensiv normalisiert — fixed in Phase 19-02 commit 73cdc27"
  missing: []
- truth: "Konflikte zwischen aktiven Mapping-Zeilen sind sichtbar, `Apply` bleibt bei `suggested` oder `conflict` deaktiviert, und einzelne Zeilen koennen bewusst uebersprungen werden."
  status: resolved-by-code
  reason: "Parallel releases now accepted as valid versions. Mapping rows show file_name + display_path. Bulk resolution controls added. Live retest needed."
  severity: fixed
  test: 6
  root_cause: "Der Builder modellierte konkurrierende Dateien primär als Konflikt. Mapping-Zeilen zeigten nur opaque Media-IDs."
  artifacts:
    - path: "backend/internal/handlers/admin_episode_import.go"
      issue: "Fixed in Phase 19-01: file_name and display_path now populated in buildEpisodeImportPreview"
    - path: "backend/internal/repository/episode_import_repository.go"
      issue: "Fixed in Phase 19-01: exclusive episode-claim check removed; parallel versions allowed"
    - path: "frontend/src/app/admin/anime/[id]/episodes/import/page.tsx"
      issue: "Fixed in Phase 19-02: mapping rows show file_name + display_path; episode groups + bulk controls added"
  missing: []
