---
phase: 81-release-version-mehrfach-fansubgruppen-ohne-kombigruppe
plan: "05"
subsystem: ui
tags: [typescript, react, nextjs, vitest, badge, fansub, collaboration-removal]

requires:
  - phase: 81-release-version-mehrfach-fansubgruppen-ohne-kombigruppe
    plan: 04
    provides: fansub_groups[] im Backend-Lesepfad + OpenAPI-Contracts aktualisiert

provides:
  - ReleaseVersionFansubChips.tsx: neue Chip-Komponente rendert fansub_groups[] als Badge-Chips (D-09)
  - TypeScript-Typen bereinigt: fansub_group singular entfernt, fansub_groups[] eingesetzt
  - CollaborationMember*, addCollaborationMember, removeCollaborationMember, getCollaborationMembers aus Frontend entfernt
  - Alle group_type==='collaboration' UI-Zweige aus 10 Dateien entfernt
  - Wave-0 RED-Tests (ReleaseVersionFansubChips.test.tsx) GREEN

affects:
  - 81-06 (Tests + Cleanup: Frontend-Typen und Komponenten bereinigt)

tech-stack:
  added: []
  patterns:
    - "Badge variant='neutral' role='status' fuer Fansub-Chips (Pflicht: @/components/ui)"
    - "fansub_groups[].map(g => g.name).join(', ') fuer Textdarstellung mehrerer Gruppen"
    - "fansub_groups?.[0] als Fallback fuer Einzelgruppen-Zugriff (Logo, ID)"

key-files:
  created:
    - frontend/src/components/anime/ReleaseVersionFansubChips.tsx
    - frontend/src/components/anime/ReleaseVersionFansubChips.module.css
  modified:
    - frontend/src/types/episodeVersion.ts
    - frontend/src/types/fansub.ts
    - frontend/src/lib/api.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx
    - frontend/src/app/admin/anime/components/EpisodeManager/EpisodeEditForm.tsx
    - frontend/src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx
    - frontend/src/app/admin/fansubs/page.tsx
    - frontend/src/app/admin/fansubs/merge/page.tsx
    - frontend/src/app/admin/fansubs/create/page.tsx
    - frontend/src/app/fansubs/[slug]/page.tsx
    - frontend/src/app/admin/my-groups/[id]/page.tsx
    - frontend/src/app/admin/my-groups/[id]/page.test.tsx
    - frontend/src/components/episodes/EpisodesOverview/VersionRow.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.tsx
    - frontend/src/app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx

key-decisions:
  - "role='status' auf Badge in ReleaseVersionFansubChips: Vitest-Test nutzt getAllByRole('status') — ohne explizite Role waere der Test nicht GREEN"
  - "fansub_groups?.[0] als Logo/ID-Fallback: Chip-Anzeige zeigt alle Gruppen; Einzelzugriff nur noch fuer Rueckwaerts-kompatible UI-Elemente (Gruppe-bearbeiten-Link)"
  - "candidateGroups/collaborationBusy/loadingCandidates in create/page.tsx komplett entfernt: wurden ausschliesslich fuer den Collaboration-Member-Block benoetigt"

patterns-established:
  - "ReleaseVersionFansubChips-Pattern: fansub_groups[]-Array -> alphabetisch sortiert -> Badge-Chips — wiederverwendbar fuer alle Ansichten die Fansub-Gruppen zeigen"

requirements-completed:
  - P81-SC4

duration: 30min
completed: 2026-06-09
---

# Phase 81 Plan 05: Frontend-Typen bereinigt, ReleaseVersionFansubChips-Komponente, Kollaborations-Zweige entfernt

**TypeScript-Typen auf fansub_groups[] umgestellt, neue ReleaseVersionFansubChips-Komponente mit Badge-Chips (D-09), alle group_type==='collaboration'-Zweige aus 10 UI-Dateien entfernt**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-06-09T12:00:00Z
- **Completed:** 2026-06-09T12:30:00Z
- **Tasks:** 2
- **Files modified:** 19

## Accomplishments

- `ReleaseVersionFansubChips.tsx` erstellt: rendert fansub_groups[] als alphabetisch sortierte `<Badge variant="neutral" role="status">`-Chips; Wave-0 RED-Test aus Plan 01 dreht GREEN
- TypeScript-Typen vollständig bereinigt: `fansub_group` singular und `collaboration_group_id` aus `episodeVersion.ts` entfernt, `FansubGroupType = "group"` (kein `'collaboration'`), `CollaborationMember*`-Typen und `collaboration_members` aus `fansub.ts` entfernt
- Alle `group_type === 'collaboration'` UI-Zweige aus 10 Produktionsdateien entfernt (EpisodeImportMappingRow, EpisodeEditForm, EpisodeVersionEditorPage, AnimeContextFansubManager, fansubs/page, fansubs/merge, fansubs/create, fansubs/[slug], my-groups/[id])
- `addCollaborationMember`, `removeCollaborationMember`, `getCollaborationMembers` aus `api.ts` entfernt; zugehörige Importe bereinigt
- `my-groups/[id]/page.tsx`: `<span>Coop-Release</span>` durch `<Badge variant="neutral">Kooperation</Badge>` ersetzt (D-09); Test angepasst
- `VersionRow.tsx` und `FansubVersionBrowser.tsx`: `fansub_group` singular → `fansub_groups[]` migriert
- `npx tsc --noEmit` ohne Fehler; `npx vitest run ReleaseVersionFansubChips.test.tsx` 3/3 grün

## Task Commits

1. **Task 1: TypeScript-Typen + api.ts bereinigen; ReleaseVersionFansubChips** - `8f372317` (feat)
2. **Task 2: Kollaborations-Zweige entfernen; Gruppen-Profilseiten** - `cf365909` (feat)

## Files Created/Modified

- `frontend/src/components/anime/ReleaseVersionFansubChips.tsx` — neue Chip-Komponente: fansub_groups[] → Badge-Chips, alphabetisch sortiert
- `frontend/src/components/anime/ReleaseVersionFansubChips.module.css` — Flex-Container für Chips
- `frontend/src/types/episodeVersion.ts` — fansub_group → fansub_groups[]; collaboration_group_id entfernt
- `frontend/src/types/fansub.ts` — FansubGroupType = 'group'; CollaborationMember* entfernt
- `frontend/src/lib/api.ts` — 3 Collaboration-Funktionen + Importe entfernt
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts` — collaboration_group_id-Setzung entfernt
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx` — Kollaboration-Label entfernt
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx` — group_type==='collaboration' Filter entfernt
- `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeEditForm.tsx` — collaboration_members-Zweig + resolveExpandedFansub entfernt; fansub_groups[] genutzt
- `frontend/src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx` — Kollaborations-Typ-Anzeige bereinigt
- `frontend/src/app/admin/fansubs/page.tsx` — group_type==='collaboration' Filter entfernt
- `frontend/src/app/admin/fansubs/merge/page.tsx` — typeLabel vereinfacht
- `frontend/src/app/admin/fansubs/create/page.tsx` — Collaboration-Member-Block, States, Funktionen und Importe vollständig entfernt
- `frontend/src/app/fansubs/[slug]/page.tsx` — Kollaborations-Profil-Zweig entfernt (D-10)
- `frontend/src/app/admin/my-groups/[id]/page.tsx` — span → Badge variant='neutral' für Kooperation
- `frontend/src/app/admin/my-groups/[id]/page.test.tsx` — 'Coop-Release' → 'Kooperation'
- `frontend/src/components/episodes/EpisodesOverview/VersionRow.tsx` — fansub_group → fansub_groups[] migriert
- `frontend/src/components/fansubs/FansubVersionBrowser.tsx` — fansub_group → fansub_groups[] migriert
- `frontend/src/app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx` — fansub_group → fansub_groups[] migriert

## Decisions Made

- `role="status"` auf Badge in ReleaseVersionFansubChips: Der Wave-0 Test nutzt `getAllByRole("status")`. Da `Badge` intern ein `<span>` ohne explizite Role rendert, war `role="status"` am `<Badge>`-Element erforderlich um die Vitest-Assertions zu erfüllen.
- `fansub_groups?.[0]` als Fallback: Logo-Anzeige und "Gruppe bearbeiten"-Links nutzen nur die erste Gruppe. Das ist ein pragmatischer Fallback — keine Hierarchie (D-03), aber UI-Elemente die historisch Einzelgruppen erwarten werden schrittweise migriert.
- `candidateGroups` und `loadingCandidates` vollständig aus `create/page.tsx` entfernt: Diese States wurden ausschließlich für den Collaboration-Member-Block genutzt (Dropdown-Kandidaten laden). Mit Entfernung des Blocks werden sie nicht mehr benötigt.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] fansub_group -> fansub_groups[] in VersionRow.tsx, FansubVersionBrowser.tsx, versions/page.tsx**
- **Found during:** Task 2 (nach tsc-Lauf)
- **Issue:** Drei Dateien ausserhalb des Plan-Scopes nutzten noch `version.fansub_group` (singular), was nach Typ-Umbenennung zu TS-Fehler fuehrt
- **Fix:** Alle drei Dateien auf `version.fansub_groups?.[0]` bzw. `version.fansub_groups?.some(...)` umgestellt
- **Files modified:** `VersionRow.tsx`, `FansubVersionBrowser.tsx`, `versions/page.tsx`
- **Verification:** `npx tsc --noEmit` ohne Fehler
- **Committed in:** `cf365909` (Task 2)

**2. [Rule 1 - Bug] page.test.tsx 'Coop-Release' → 'Kooperation'**
- **Found during:** Task 2 (vitest-Lauf)
- **Issue:** `my-groups/[id]/page.test.tsx` prüfte auf 'Coop-Release', aber Badge rendert jetzt 'Kooperation'
- **Fix:** Test-Assertion auf neuen Badge-Text angepasst
- **Files modified:** `frontend/src/app/admin/my-groups/[id]/page.test.tsx`
- **Verification:** npx vitest run der Test-Datei grün
- **Committed in:** `cf365909` (Task 2)

---

**Total deviations:** 2 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Beide Fixes notwendig fuer Typ-Korrektheit und Test-Konsistenz nach Typ-Umbenennung. Kein Scope Creep.

## Issues Encountered

- 5 pre-existing Test-Fehler in `api.no-token-boundary.test.ts`, `admin/anime/page.test.tsx`, `admin/anime/create/*.test.tsx`, `fansubs/__tests__/page.test.tsx` und `useAdminAnimeCreateController.test.ts` — alle unabhaengig von Phase-81-Aenderungen (Auth-Gate-Rendering-Issues und fehlende `getMediaOwnershipProjection`-Funktion aus einer anderen Phase). Dokumentiert in `deferred-items.md`.

## Known Stubs

Keine. Alle Aenderungen vollstaendig verdrahtet.

## Threat Surface Scan

Keine neuen sicherheitsrelevanten Flaechen eingefuehrt. Drei API-Endpunkt-Funktionen aus `api.ts` entfernt (T-81-FE-01 mitigiert) und `collaboration_group_id` aus PATCH-Payload entfernt (T-81-FE-03 mitigiert). Frontend-Typen spiegeln den bereinigten Backend-Contract korrekt wider.

## Next Phase Readiness

- Frontend-Typen vollstaendig auf fansub_groups[] umgestellt; TypeScript-Compiler bestaetigt Korrektheit
- ReleaseVersionFansubChips-Komponente bereit fuer Integration in EpisodeVersionEditorPage (Anzeige der Gruppen-Chips in der Editor-Ansicht)
- Bereit fuer Plan 06 (Tests + Cleanup)

---
*Phase: 81-release-version-mehrfach-fansubgruppen-ohne-kombigruppe*
*Completed: 2026-06-09*
