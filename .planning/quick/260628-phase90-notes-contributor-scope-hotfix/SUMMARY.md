---
status: complete
---

# Summary

Phase 90 Add-on Hotfix umgesetzt: normale Contributor koennen Release-Version-
Notizen nur noch fuer ihre eigene verifizierte Member-Identitaet lesen und
speichern. Fremde Member-Notizen werden serverseitig gefiltert und Fremd-
Payloads beim Speichern/Loeschen mit 403 geblockt.

Projektweite Naruto-Contributions wie `encoder`/`timer` bleiben fuer den
Notizen-Scope gueltig, auch wenn die konkrete Release-Version zusaetzliche
versionsspezifische Contributions hat.

Frontend blendet den "Alle Mitglieder"-Tab aus, wenn nur ein Member im Scope
sichtbar ist.

## Checks

- PASS: gezielte Backend-Tests fuer ReleaseVersionNotes/ContributorGuard/CanForReleaseVersion.
- PASS: ReleaseVersionNotesTab Vitest, 7/7.
- PASS: Frontend typecheck.
- PASS: Frontend lint mit bestehenden Warnings, 0 Errors.
- PASS: `git diff --check`.
- PASS: Docker build/recreate fuer Backend und Frontend, Port 3000 smoke 200.

## Known unrelated issues

- Breiter `go test ./internal/repository ./internal/handlers ./internal/permissions -count=1`
  scheitert an bestehenden repository source-invariant tests:
  `TestContributionUpsert_FourColumnConflict` und
  `TestPhase69AnimeContributionMutationsUseRouteScope`.

