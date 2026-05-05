---
status: resolved
trigger: "Episode-Import Preview zeigt bereits gemappte Episoden beim zweiten Import erneut als neue Kandidaten an, statt sie zu überspringen."
created: 2026-04-23T00:00:00Z
updated: 2026-04-23T14:00:00Z
resolution_type: not_a_bug
resolution_note: "Feature not implemented, will be planned as a new phase."
---

## Current Focus

hypothesis: CONFIRMED - PreviewEpisodeImport never calls PreviewExistingCoverage; loadEpisodeImportMediaCandidates returns ALL Jellyfin items without filtering against existing stream_sources (provider_type='jellyfin', external_id=media_item_id). The method PreviewExistingCoverage exists and correctly queries the DB but is never wired into the preview flow.
test: CONFIRMED via code reading - zero call sites for PreviewExistingCoverage other than its declaration in the interface
expecting: Fix: call PreviewExistingCoverage in PreviewEpisodeImport handler, then filter mediaCandidates to exclude items whose MediaItemID already exists in the coverage result
next_action: Implement filtering in buildEpisodeImportPreview or in PreviewEpisodeImport handler

## Symptoms

expected: When episodes 1-50 are already imported and applied, a second import preview should only show newly added Jellyfin files (e.g. episodes 51-100). Already mapped episodes must NOT appear as new mapping candidates.
actual: After second import run (new Jellyfin files added), already mapped episodes 1-50 reappear in the preview as new candidates - as if they were never imported.
errors: No visible error messages - preview runs normally but shows too many candidates.
reproduction: |
  1. Anime with 220 episodes (e.g. Naruto) linked in Jellyfin
  2. Import first 50 Jellyfin files, do mapping, apply
  3. Add another 50 Jellyfin files (episodes 51-100)
  4. Open import preview again
  5. Preview shows all 100 candidates instead of only the new 50
started: Probably since Phase 20 (release-native episode import schema) - previously episode_versions existed directly

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-04-23T00:01:00Z
  checked: admin_episode_import.go PreviewEpisodeImport handler (lines 39-89)
  found: Calls loadEpisodeImportMediaCandidates which calls h.listJellyfinEpisodes and filters only by folder path — no DB check whatsoever
  implication: Every call to preview returns ALL Jellyfin files for the series, regardless of prior imports

- timestamp: 2026-04-23T00:01:00Z
  checked: episode_import_repository.go PreviewExistingCoverage (lines 35-77)
  found: Method exists and correctly queries stream_sources JOIN release_streams JOIN release_variants JOIN release_variant_episodes JOIN episodes WHERE e.anime_id=$1; returns EpisodeImportExistingCoverage with one row per variant+external_id
  implication: The DB-side capability to get already-imported MediaItemIDs exists but is never called from preview

- timestamp: 2026-04-23T00:01:00Z
  checked: admin_content_handler.go interface definition (line 76-79)
  found: adminEpisodeImportRepository interface declares PreviewExistingCoverage but the PreviewEpisodeImport handler (admin_episode_import.go) never references h.episodeImportRepo during preview — it only uses h.episodeImportRepo in ApplyEpisodeImport
  implication: The interface wiring is correct but the call path from preview to the repo is missing entirely

- timestamp: 2026-04-23T00:01:00Z
  checked: episode_import_repository_release_helpers.go upsertImportReleaseGraph (lines 38-48)
  found: Apply side correctly checks for existing stream_sources by provider_type='jellyfin' AND external_id=MediaItemID — so already-imported items ARE idempotent on apply. The gap is only in the preview direction.
  implication: The DB has the data; the preview just never reads it

## Resolution

root_cause: PreviewEpisodeImport never called PreviewExistingCoverage. loadEpisodeImportMediaCandidates fetched all Jellyfin files for the series without filtering against existing stream_sources (provider_type='jellyfin', external_id=MediaItemID). The DB capability existed (PreviewExistingCoverage in EpisodeImportRepository) and the interface declared it, but no call site wired it into the preview flow.

fix: not_a_bug — the filtering behavior was never implemented. This is a missing feature, not a regression. Will be planned as a new phase to wire PreviewExistingCoverage into the preview flow.

verification: N/A — no fix applied.

files_changed: []
