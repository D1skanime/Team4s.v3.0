---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 16
subsystem: frontend
tags: [react, nextjs, fansub-group-hints, d-11, d-09, d-15]

# Dependency graph
requires:
  - phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
    provides: "Backend D-11-Routing (ListWithoutActiveLead) + Frontend-Contract-Spiegel ohne hint_type/requested_role_code (Plaene 191-12/191-13)"
provides:
  - "Plattform-Admin-Liste '/admin/fansub-group-hints' konsistent als 'Hinweise ohne Leitung' (h1 + Nav) mit echter Projekt-Spalte statt statischer Rollen-Badge"
  - "Leader-Review-Abschnitt (FansubGroupHintsReviewSection) ohne jede hint_type-Verzweigung/-Badge"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Admin-Listen- und Review-Komponenten dieser Phase zeigen project-bezogene Daten jetzt immer als Klartext (related_anime_title), nie als statische Badge, wenn der Wert tatsaechlich variiert"

key-files:
  modified:
    - frontend/src/app/admin/fansub-group-hints/FansubGroupHintsAdminClient.tsx
    - frontend/src/app/admin/fansub-group-hints/FansubGroupHintsAdminClient.test.tsx
    - frontend/src/app/admin/fansub-group-hints/useFansubGroupHintsListFilters.ts
    - frontend/src/components/admin/AdminMainNav.tsx
    - "frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.tsx"
    - "frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.test.tsx"

key-decisions:
  - "Badge-Import in FansubGroupHintsAdminClient.tsx blieb erhalten (nur die Rollen-Badge-Nutzung entfiel) - Badge wird weiterhin fuer die Status-Spalte (hintStatusVariant) gebraucht"
  - "Badge-Import in FansubGroupHintsReviewSection.tsx blieb erhalten (Erledigt/In-Pruefung-Badges) - nur hintTypeBadgeLabel/roleLineForHint und ihre Aufrufstellen wurden entfernt"

requirements-completed: [D-11, D-15]

# Metrics
duration: ~25min
completed: 2026-10-23
---

# Phase 191 Plan 16: Gap-Closure Live-UAT-Nachbesserung (D-11-Frontend-Umwidmung + Leader-Review-Badge-Entfernung) Summary

**Die Plattform-Admin-Liste `/admin/fansub-group-hints` heisst jetzt ueberall "Hinweise ohne Leitung" und zeigt eine echte Projekt-Spalte statt einer statischen "Fansub-Leitung"-Badge; die Leader-Review-Liste hat keine hint_type-Badge/-Verzweigung mehr.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-10-23T20:20:00Z (approx.)
- **Completed:** 2026-10-23T20:45:00Z (approx.)
- **Tasks:** 2 completed
- **Files modified:** 6

## Accomplishments

- **Task 1 (D-11):** `FansubGroupHintsAdminClient.tsx` zeigt jetzt `<h1>Hinweise ohne Leitung</h1>`, die Desktop-Tabelle und die Mobile-Card ersetzen die statische `Badge variant="info">Fansub-Leitung</Badge>` durch eine echte `Projekt`-Spalte mit `hint.related_anime_title` als Klartext. `emptyStateCopy` liefert die neuen D-11-Texte ("Keine offenen Hinweise an Gruppen ohne Leitung" / "Aktuell liegen keine Korrektur-Hinweise an Zielgruppen ohne aktive Leitung zur Prüfung vor."). Nav-Label in `AdminMainNav.tsx` geändert von "Hinweise (Leitung)" auf "Hinweise ohne Leitung". Doku-Kommentare (Dateikopf, Filter-Bereich, Nav-Eintrag, Filter-Hook) auf das D-11-Konzept ("Zielgruppe hat keine aktive Leitung") umformuliert — keine Reste des gestrichenen `fansub_lead`-Mitgliedschaftsanfrage-Konzepts (D-15).
- **Task 2 (D-09):** `hintTypeBadgeLabel`/`roleLineForHint` aus `FansubGroupHintsReviewSection.tsx` vollständig entfernt — es gibt nur noch eine Hinweisart, ein bedeutungsloser Badge wird nicht durch eine statische Variante ersetzt. Der Content-Block zeigt jede Zeile unconditioned per `hint.related_anime_title`, ohne nach `hint_type` zu verzweigen. Datei-/Testdoku auf das D-09-Einzeltyp-Modell umgeschrieben.
- Frontend-Container (`team4sv30-frontend`) neu gestartet und per `curl` gegen `http://192.168.235.196:3000/admin/fansub-group-hints` verifiziert — die Seite liefert HTTP 200 und enthält den Text "Hinweise ohne Leitung".

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename the platform-admin list to "Hinweise ohne Leitung" + Projekt column (D-11)** - `c430eb457` (fix)
2. **Task 2: Remove hint-type badge/branching from the Leader-review section** - `790b4975d` (fix)

## Files Created/Modified

- `frontend/src/app/admin/fansub-group-hints/FansubGroupHintsAdminClient.tsx` — h1/Projekt-Spalte/Empty-Copy auf D-11 umgestellt, Dateikopf-/Filterbereich-Kommentare umformuliert
- `frontend/src/app/admin/fansub-group-hints/FansubGroupHintsAdminClient.test.tsx` — sampleHint ohne `hint_type`/`requested_role_*`, Titel-/Empty-Copy-Assertions auf neue Strings angepasst
- `frontend/src/app/admin/fansub-group-hints/useFansubGroupHintsListFilters.ts` — Doc-Kommentar auf D-11-Scope umformuliert (keine Filter-Shape-Änderung)
- `frontend/src/components/admin/AdminMainNav.tsx` — Nav-Label geändert, Begründungskommentar auf D-11 umformuliert
- `frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.tsx` — `hintTypeBadgeLabel`/`roleLineForHint` entfernt, Content-Block-Branching entfernt, Dateikopf-Kommentar auf D-09 umformuliert
- `frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.test.tsx` — Tests für die entfernten Funktionen gelöscht, `makeHint`/Assertions auf das Einzeltyp-Modell angepasst

## Decisions Made

- Beide `Badge`-Imports blieben erhalten, obwohl der Plan-Interfaces-Abschnitt die Rollen-Badge-Nutzung als zu entfernen beschreibt — `Badge` wird in beiden Dateien weiterhin für die Status-Badges (Offen/Bestätigt/Abgelehnt bzw. Erledigt/In Prüfung) gebraucht. Keine Abweichung vom Plan-Ziel, nur eine Klarstellung beim Umsetzen.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - reine Admin-UI-Änderung ohne externe Service-Konfiguration.

## Next Phase Readiness

- Beide in `191-CONTEXT.md` als "Live-UAT-Nachbesserung" benannten Frontend-Surfaces für D-11/D-09 sind jetzt konsistent mit dem Backend-Contract (Pläne 191-12/191-13) und dem amendierten `191-UI-SPEC.md` Component Contract C.
- `npm --prefix frontend run typecheck` läuft gesamtprojektweit grün (Exit 0) — die in `191-13-SUMMARY.md` dokumentierte, erwartete Zwischenrot-Phase für `FansubGroupHintsReviewSection.tsx` ist aufgelöst.
- Verbleibend laut `191-CONTEXT.md`: D-12/D-13/D-14 (Formular-Erweiterungen "Fehler melden"-Einstiegspunkt, Gruppenname-Dreifach-Bug, helles Suchergebnis-Muster) sind nicht Teil dieses Plans.
- D-16 (Pflicht-Live-Checkpoint) steht weiterhin aus, sobald die verbleibenden Nachbesserungspläne abgeschlossen sind.

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Completed: 2026-10-23*

## Self-Check: PASSED

All 6 modified files and both commit hashes (c430eb457, 790b4975d) verified present.
