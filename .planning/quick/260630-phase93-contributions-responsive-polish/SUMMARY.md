---
status: complete
phase: 93
kind: quick
completed_at: 2026-06-30
---

# Phase 93 Quick - Meine Projekte Responsive Polish

## Ergebnis

Die `/me/contributions`-Oberflaeche wurde fuer Desktop und Mobile nachgezogen.
Desktop nutzt jetzt eine breitere Flaeche mit zweispaltiger Struktur, waehrend
Mobile bei der kompakten Einspalten-Darstellung bleibt. Der Hinweis-Wizard hat
auf Desktop eine stabile Dialoghoehe, und der globale `YearPicker` liegt ueber
der Modalebene.

## Umgesetzt

- Desktop-Breite von `Meine Projekte` von hartem `430px`-Mobile-Panel auf
  responsive `760px`/`1120px` angehoben.
- Ab `980px` werden offene Aktionen/Hinweise links und bestaetigte Projektrollen
  rechts platziert.
- `responsiveSheet` nutzt auf Desktop `760px` Breite und eine stabile
  `min(680px, 100dvh - 48px)`-Hoehe; Mobile bleibt Bottom-Sheet.
- `YearPicker`-Dropdown wird ueber `z-modal` gerendert, statt hinter dem Dialog
  zu liegen.
- Sichtbarkeit `Profil/Intern` wurde von zwei Button-Varianten auf einen
  stabilen Slider mit fixem Track und bewegtem Thumb umgebaut.
- Rollen werden fachlich einzeln steuerbar angezeigt; `wie oben`/gemeinsame
  Slider wurden entfernt.
- Der Visibility-Patch nimmt optional `role_code` entgegen. Wenn ein alter
  Contribution-Eintrag mehrere Rollen enthaelt, trennt der Server die
  geaenderte Rolle beim Speichern in einen eigenen Contribution-Eintrag.
- Neue Vorschlaege werden nicht mehr in einen bestehenden offenen
  Mehrfachrollen-Eintrag hineingemerged, sondern bleiben rollenbezogen.
- Der fokussierte Contributions-API-Vertrag dokumentiert den rollenbezogenen
  Visibility-Patch.

## Verifikation

Bestanden:

- `cd frontend && npm test -- --run src/components/contributions/ProposalForm.test.tsx src/components/contributions/AnimeGroupCard.test.tsx src/components/contributions/ContributionInbox.test.tsx src/components/contributions/VisibilityDropdown.test.tsx`
- `cd frontend && npm test -- --run src/components/contributions/AnimeGroupCard.test.tsx src/components/contributions/VisibilityDropdown.test.tsx src/components/contributions/ContributionInbox.test.tsx src/components/contributions/ContributionCard.test.tsx`
- `cd frontend && npm run typecheck`
- `cd frontend && npm run lint` - 0 Fehler, bestehende Warnungen bleiben.
- `cd backend && go test ./internal/handlers -run TestRejectContributionRequiresReason`
- `cd backend && go test ./internal/repository -run TestSelfPublish_StatusBleibtProposed`
- `git diff --check`
- `docker compose build team4sv30-backend team4sv30-frontend`
- `docker compose up -d team4sv30-backend team4sv30-frontend`
- `GET http://127.0.0.1:3000/me/contributions` - HTTP 200.

Eingeschraenkt:

- Headless-Playwright konnte die geschuetzte echte Datenansicht nicht
  authentifiziert oeffnen. Der lokale `/auth/issue`-Token wurde von
  `/api/v1/me/anime-contributions` mit `401` abgewiesen. Die betroffenen
  UI-Zustaende sind durch gezielte Komponententests abgedeckt.

## Risiken / Hinweise

- Breiter Backend-Handler-Testlauf (`go test ./internal/handlers
  ./internal/repository`) scheitert an bestehenden Capability-Tests
  (`admin_capability_handler_test.go`), waehrend das Repository-Paket und der
  fokussierte Contributions-Handler-Test gruen sind.
- Untracked Phase-94-Planartefakte im Arbeitsbaum gehoeren nicht zu diesem
  Quick-Fix und wurden nicht angefasst.
