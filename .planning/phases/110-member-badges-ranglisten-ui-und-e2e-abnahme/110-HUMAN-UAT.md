---
status: partial
phase: 110-member-badges-ranglisten-ui-und-e2e-abnahme
source: [110-VERIFICATION.md]
started: 2026-07-27T21:10:00Z
updated: 2026-07-27T21:10:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Live Docker UAT — visuelle Anime-/Fansub-Stiltreue, Mobile-Layout, Barrierefreiheit (SC-3)
expected: Ranglisten-Seite (`/members/ranking`), Punktzahl-Metrik im Profil-Hero und die vier Auszeichnungen-Gruppen (Rollen/Fortschritt/Mitgliedschaft/Besondere Auszeichnungen) folgen dem bestehenden Anime-/Fansub-Stil, sind auf Mobile-Breite nutzbar, Umlaute überall korrekt, und die leere Rollen-Gruppe verschwindet bei Mitgliedern ohne Rollen-Badge vollständig. Vorgehen: `docker restart team4sv30-frontend`, dann Hard-Refresh (Strg+F5) auf `:3000`.
result: [pending]

### 2. Postgres-backed Repository-Tests live ausführen (D-02/D-03)
expected: Alle 4 Tests PASS gegen eine echte Postgres-Instanz — `TestGetPublicMemberProfilePostgresIncludesTotalPoints`, `TestLoadPublicBadgesPostgresRoleEntryAwardedVisible`, `TestLoadPublicBadgesPostgresRoleEntryReversedHidden`, `TestLoadPublicBadgesPostgresNonEligibleRoleNeverAppears`. Insbesondere der awarded→reversed→hidden-Lebenszyklus (D-03 Live-Projektion) muss live grün bestätigt werden. Vorgehen: Postgres erreichbar machen (`docker compose up -d team4sv30-db`), `TEAM4S_PHASE106_TEST_DSN` setzen, dann `go test ./internal/repository/... -run "TestGetPublicMemberProfile|TestLoadPublicBadges" -v` aus `backend/`. (Aktuell SKIP mangels Docker/DSN in der Sandbox — dokumentierte Umgebungsgrenze, identisch zum Phase-109-Präzedenzfall.)
result: [pending]

### 3. Optionale E2E-Sichtprüfung mit echten Produktionsdaten (SC-5, außerhalb Scope)
expected: Reale Punkteherkunft/Stornierungen/Badge-Voraussetzungen sind auf Profil und Rangliste konsistent mit dem zugrunde liegenden Ledger (historische Rückrechnung, Fremdbestätigung, abgelehnter + erneut eingereichter Beitrag). Hinweis: SC-5-Breite ist laut `110-CONTEXT.md` explizit außerhalb des Scopes dieser schlanken Iteration (bereits in Phasen 106–108 abgesichert) — nur optionale Absicherung vor Produktivsetzung.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
