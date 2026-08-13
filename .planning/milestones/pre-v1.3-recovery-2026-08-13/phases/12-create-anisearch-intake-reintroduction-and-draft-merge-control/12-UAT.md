---
status: partial
phase: 12-create-anisearch-intake-reintroduction-and-draft-merge-control
source: [12-01-SUMMARY.md, 12-02-SUMMARY.md, 12-03-SUMMARY.md, 12-04-SUMMARY.md, 12-05-SUMMARY.md]
started: 2026-04-10T15:29:00Z
updated: 2026-04-10T15:35:00Z
---

## Current Test

[testing complete — 2 issues found, 2 passed]

## Tests

### 1. AniSearch card visible above Jellyfin
expected: On `/admin/anime/create`, the page shows an "AniSearch ID" input field and an "AniSearch laden" button above the "Jellyfin suchen" button. The source action area shows "Manuell > AniSearch > Jellyfin" as the priority label.
result: pass

### 2. AniSearch draft load — grouped summary card
expected: Entering a valid AniSearch ID and clicking "AniSearch laden" updates the draft form fields with AniSearch data and shows a grouped summary card with: updated fields list, relation notes (e.g. "X von Y Relationen lokal zugeordnet"), draft-status notes, and an explicit "Noch nichts gespeichert" reminder. Nothing is persisted yet.
result: pass

### 3. AniSearch save flow — no crash
expected: After loading an AniSearch draft, clicking "Anime erstellen" (with all required fields filled) creates the anime and redirects to the overview. No TypeError crash. The success message may include AniSearch relation summary if relations were applied.
result: issue
reported: "Anime #19 wurde erstellt. (Weiterleitung zur Uebersicht...) — aber es findet keine Weiterleitung zur Übersicht statt"
severity: major

### 4. Duplicate AniSearch ID redirect + relation matching
expected: Entering an AniSearch ID that is already linked to an existing anime and clicking "AniSearch laden" immediately redirects to `/admin/anime/{id}/edit` without leaving the operator on a broken draft state.
result: issue
reported: "AniSearch ID 6123 (11eyes Pink Phantasmagoria) loaded as draft — relations to 11eyes (which is already in the database) were not found/matched even though they are clearly listed on the AniSearch relations page (anisearch.de/anime/6123,11eyes-pink-phantasmagoria/relations). Also unclear if 6123 would correctly redirect if it were already in the DB — duplicate redirect could not be confirmed."
severity: major

## Summary

total: 4
passed: 2
issues: 3
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "After AniSearch draft load and create submit, the page redirects to the anime overview"
  status: failed
  reason: "User reported: success message shown but redirect to overview never fires. Root cause: resetStagedCover() and resetStagedAssets() in handleCreateSubmit success path create a new object reference for stagedAssets, which changes the useEffect deps [stagedAssets, stagedCover] and triggers the effect cleanup, which calls window.clearTimeout(createRedirectTimeoutRef.current), cancelling the redirect before it fires. Fix: remove the two reset calls from the success path — the component unmounts on navigation anyway and the unmount cleanup revokes object URLs correctly."
  severity: major
  test: 3
  artifacts:
    - frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts
  missing:
    - redirect fires after create with AniSearch provenance

- truth: "AniSearch create enrichment matches relations to anime already present in the Team4s database"
  status: failed
  reason: "User reported: AniSearch 6123 (11eyes Pink Phantasmagoria) loaded as draft but returned 0 relation matches. 11eyes is already in the database and is listed as a relation on the AniSearch relations page. Root cause: mapAniSearchGraphRelation() in anisearch_client.go does not handle incoming 'Sequel' edges. When 11eyes→6123 is a 'Sequel' edge in the graph, parsing from 6123's perspective gives outgoing=false with legend='Sequel', which falls through to the default: return '' case and the relation is dropped. Fix: add case 'Sequel': return 'Hauptgeschichte' to the incoming branch."
  severity: major
  test: 4
  artifacts:
    - backend/internal/services/anisearch_client.go
  missing:
    - mapAniSearchGraphRelation handles incoming Sequel edges by returning Hauptgeschichte

- truth: "Entering an AniSearch ID already in the database on the create route redirects to the existing edit page instead of showing a 409 error"
  status: failed
  reason: "User reported: AniSearch ID 5468 (11eyes, already in DB) shows '(409) API request failed: 409' error. Root cause: loadAdminAnimeCreateAniSearchDraft() in admin-anime-intake.ts throws ApiError for all !response.ok responses including 409 Conflict. The backend correctly returns 409 with a redirect payload, but the frontend never parses it. Edit-side handles this at api.ts:1281 via response.status === 409 check. Fix: add the same 409 branch to loadAdminAnimeCreateAniSearchDraft before the generic error throw."
  severity: major
  test: 4
  artifacts:
    - frontend/src/lib/api/admin-anime-intake.ts
  missing:
    - 409 response parsed as AdminAnimeAniSearchCreateResponse (conflict/redirect) instead of ApiError
