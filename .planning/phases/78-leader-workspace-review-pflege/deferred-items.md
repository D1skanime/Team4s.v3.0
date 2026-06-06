# Phase 78 — Zurückgestellte Punkte

Entdeckt während 78-03-Ausführung. Außerhalb des Scope dieser Phase.

## Pre-existing Test-Fehler (nicht durch 78-03 verursacht)

### TestRejectContributionRequiresReason (backend/internal/handlers)
- **Datei:** `backend/internal/handlers/contributions_me_handler_test.go:58`
- **Fehler:** nil pointer dereference auf DB-Pool (kein DB-Zugang im Unit-Test)
- **Verursacht von:** pre-existing — nicht durch 78-03-Änderungen eingeführt
- **Aktion:** Muss in einem separaten Fix-Task behoben werden

### TestFansubNotesRepository_ScopedMutationSourceInvariants (backend/internal/repository)
- **Datei:** `backend/internal/repository/fansub_notes_repository_test.go`
- **Fehler:** Statischer Test über Methodensignaturen — schlägt seit längerem fehl
- **Verursacht von:** pre-existing — nicht durch 78-03-Änderungen eingeführt
- **Aktion:** Muss in einem separaten Fix-Task behoben werden

## TypeScript-Fehler (pre-existing)

- `GroupMediaReviewSection.test.tsx` — Modul noch nicht existiert (78-04 implementiert es)
- `ContributionInbox.test.tsx` / `ContributionSummary.test.tsx` — Zielmodule fehlen
- `api.test.ts` — `rejectAnimeContributionWithReason` nicht exportiert (Name-Mismatch)
