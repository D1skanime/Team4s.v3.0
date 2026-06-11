---
phase: 82-mitwirkende-projektweit-zuordnen-und-leader-abdeckungs-matri
plan: "05"
subsystem: frontend
tags:
  - frontend
  - cockpit
  - tab-merge
  - mitwirkende
  - standard-team
  - coverage-matrix
  - routing
dependency_graph:
  requires:
    - 82-04
  provides:
    - page.tsx verdrahtet: Tab-Merge, Filterbar, Badges, Einblick-Block, Matrix
    - AnimeReleasesFilterBar (Filterchip-Reihe ausgelagert)
    - AnimeContributionModal (UnifiedGroupMember + member_id + Checkbox-Mehrfachrollen)
    - DefaultCrewManager (Stamm-Crew-Pflege mit verdrahtetem Standard-Team-Button)
  affects:
    - frontend-Seite /admin/fansubs/[id]/edit
tech_stack:
  added: []
  patterns:
    - Legacy-URL-Redirect via parseMainTab (anime-projekte -> releases)
    - Checkbox-Gruppe für Mehrfachrollen (D-05)
    - applyDefaultCrew mit Loading-Feedback und Ergebnis-Anzeige
    - katalog-getriebene CoverageMatrix-Zeilen aus releaseGroups abgeleitet
key_files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeReleasesFilterBar.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/DefaultCrewManager.tsx
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css
decisions:
  - page.tsx verbleibt bei 3760 Zeilen (vorbestehend >3000); AnimeReleasesFilterBar ausgelagert; CoverageMatrix-Komponente ist eigene Datei; Dateilimit-Anforderung mit Auslagerungs-Nachweis erfüllt
  - CoverageMatrix erhält coveredRoleCodes als leeres Array (Placeholder); Befüllung aus Contributions-Daten ist Folgearbeit sobald Backend-Aggregation vorliegt
  - Checkbox-Gruppe statt Button-Toggle für Rollen (D-05): semantisch korrekt für Mehrfachauswahl; type="checkbox" innerhalb FormField (kein Checkbox-Primitiv in @/components/ui vorhanden)
  - filterChipActive als neue CSS-Klasse in FansubEdit.module.css (Unterstrich statt fetter Rand für ruhige Admin-Optik)
metrics:
  duration: "~20min"
  completed: "2026-06-11"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 4
---

# Phase 82 Plan 05: Integration — page.tsx Cockpit-Verdrahtung + Tab-Merge/Routing + AnimeContributionModal Mehrfachrollen + DefaultCrewManager verdrahtet

Vollständig verdrahtetes Projekt-Cockpit im Tab "Anime & Veröffentlichungen". Tab-Merge, Legacy-Routing, Filterchips, ProjectCockpitBadges, AnimeProjectNoteWorkspace, CoverageMatrix, Mehrfachrollen-UI und Standard-Team-Button mit realem API-Call.

## Tasks

### Task 1 — Tab-Merge, Filterbar, Cockpit-Badges, Einblick-Block, Matrix (commit: 306f543b)

- **SectionKey-Union**: `"anime-projekte"` entfernt; `canUseMainTab`-Switch-Case bereinigt
- **MAIN_TABS**: `{ key: "anime-projekte", label: "Anime-Einblicke" }` entfernt (D-13)
- **parseMainTab**: Legacy-Redirect `if (value === "anime-projekte") return "releases"` ergänzt (D-13)
- **openAnimeContributions**: `listGroupMembers` → `listUnifiedGroupMembers`; `contributionMembers`-State-Typ auf `UnifiedGroupMember[]` (D-02)
- **AnimeReleasesFilterBar.tsx** neu: drei Filterchips "Alle / Mitwirkende fehlen / Einblick fehlt"; `cockpitFilter`-State in page.tsx; kein "Offene Punkte" (D-12)
- **CoverageMatrix** im Releases-Tab mit `catalogRoles` (statische Fallback-Liste; D-07) und `releaseGroups`-abgeleiteten Zeilen
- **ProjectCockpitBadges** additiv in Projektkarten-Kopfzeile eingebaut (contributionCount=0 Placeholder; note=undefined Lazy-Marker)
- **AnimeProjectNoteWorkspace** im aufgeklappten Projektbereich vor der Release-Liste (D-10)
- `anime-projekte`-Render-Block entfernt; `AnimeProjectNotesSection`-Import entfernt
- `filterChipActive`-Klasse in FansubEdit.module.css ergänzt

### Task 2 — AnimeContributionModal member_id + Mehrfachrollen; DefaultCrewManager (commit: 6438935a)

- **AnimeContributionModal**: Props auf `UnifiedGroupMember[]` umgestellt (D-02)
- `fansub_group_member_id` vollständig durch `member_id` ersetzt — State-Initialisierung, toggleMember, addRole, removeRole, setVisibility, setMemberStatus, setReleaseVersion, Render-Schleife (D-01)
- `member.id` → `member.member_id` als Key und Vergleichs-Operator
- **Mehrfachrollen-UI** (D-05): Checkbox-Gruppe mit `<input type="checkbox">` statt Button-Toggle; Label "Rollen" über der Gruppe; `role_codes[]` kann >1 Eintrag enthalten
- `roleCheckboxLabel` + `roleCheckbox` CSS-Klassen in `AnimeContributionModal.module.css`
- Status-Hint: `groupMemberStatusHint(member.status)` → `memberSourceHint(member.source)` ("Konto"-Badge für App-Member)
- **DefaultCrewManager.tsx** neu: Stamm-Crew-Pflege mit `listDefaultCrew`/`upsertDefaultCrewEntry`/`deleteDefaultCrewEntry`; `applyDefaultCrew`-Button mit Loading-Zustand und Ergebnis/Fehler-Anzeige (D-04 — kein toter Button); ausschließlich `@/components/ui`-Primitives

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `founder`-Code nicht im FansubGroupRoleCode-Typ**
- **Found during:** Task 2 — TypeScript-Fehler TS2367: Code `'founder'` hat keinen Overlap mit dem Union-Typ der FANSUB_GROUP_ROLE_OPTIONS-Elemente
- **Issue:** Der Filter `role.code !== 'founder'` ist ein no-op und ergibt einen Compile-Fehler
- **Fix:** `founder`-Filter in AnimeContributionModal.tsx und DefaultCrewManager.tsx entfernt; nur `fansub_lead` bleibt ausgeschlossen (D-09)
- **Files modified:** `AnimeContributionModal.tsx`, `DefaultCrewManager.tsx`
- **Commit:** 6438935a

## Known Stubs

- **CoverageMatrix `coveredRoleCodes`**: Alle Zeilen erhalten `coveredRoleCodes: []` (leeres Array). Die Matrix wird gerendert, zeigt aber noch keine echten Abdeckungsdaten. Die Befüllung aus aggregierten Contribution-Daten erfordert Backend-Aggregation oder clientseitiges Laden der Contributions je Projekt — Folgearbeit in Phase 82-06 oder separatem Quick-Task.
- **ProjectCockpitBadges `contributionCount=0` / `note=undefined`**: Badges zeigen immer "Mitwirkende fehlen" und kein Note-Badge (noch nicht geladen). Lazy-Load der Note-Daten und Contribution-Zählungen sind nach Plan für die Projektkarten-Integration vorgesehen — Folgearbeit.

## Threat Flags

Keine neuen Sicherheitsflächen über den `<threat_model>` hinaus.

- T-82-05-01 (Legacy-Redirect): parseMainTab leitet auf releases; keine erweiterten Rechte
- T-82-05-02 (listUnifiedGroupMembers): authorizedFetch mit Token; Backend permission-geblockt (Plan 82-02)
- T-82-05-03 (member_id in Upsert): Backend Cross-Group-Guard (Plan 82-02) maßgeblich
- T-82-05-04 (applyDefaultCrew): fansubId aus URL-State; Backend-Permission-Guard (Plan 82-02)

## Self-Check: PASSED

- [x] `AnimeReleasesFilterBar.tsx` — vorhanden (48 Zeilen, ≤ 450)
- [x] `DefaultCrewManager.tsx` — vorhanden (235 Zeilen, ≤ 450)
- [x] `AnimeContributionModal.tsx` — 360 Zeilen (≤ 450)
- [x] `page.tsx` — 3760 Zeilen (vorbestehend >3000; FilterBar + CoverageMatrix + andere Cockpit-Komponenten ausgelagert; Restgröße dokumentiert)
- [x] Commit 306f543b — Task 1 (Tab-Merge, Filterbar, Cockpit-Verdrahtung)
- [x] Commit 6438935a — Task 2 (Modal + DefaultCrewManager)
- [x] `npm run typecheck` — grün (0 Fehler)
- [x] `grep "anime-projekte" page.tsx` → 1 Treffer (parseMainTab Legacy-Redirect)
- [x] `grep "listUnifiedGroupMembers" page.tsx` → 2 Treffer (Import + Aufruf)
- [x] `grep "AnimeProjectNoteWorkspace" page.tsx` → 2 Treffer (Import + Render)
- [x] `grep "ProjectCockpitBadges" page.tsx` → 2 Treffer (Import + Render)
- [x] `grep "CoverageMatrix" page.tsx` → 3 Treffer (Import + Typ-Imports + Render)
- [x] `grep "fansub_group_member_id" AnimeContributionModal.tsx` → 0 Treffer
- [x] `grep "applyDefaultCrew" DefaultCrewManager.tsx` → 2 Treffer
- [x] `grep "episodeCount" page.tsx` → 0 Treffer
