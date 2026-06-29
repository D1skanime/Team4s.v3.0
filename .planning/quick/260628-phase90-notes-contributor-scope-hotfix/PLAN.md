# Phase 90 Add-on: Release-Version Notes Contributor Scope Hotfix

## Kontext

Live-UAT zeigte, dass ein normaler Contributor auf der Release-Version-Seite
`/admin/episode-versions/:versionId/edit?tab=notizen` andere Mitglieder sehen
und bearbeiten konnte. Gleichzeitig wurde ein projektweit zugeordneter Encoder
bei versionsspezifischer Besetzung nicht als eigene Rolle angezeigt.

## Scope

- Backend: Release-Version-Notizen fuer normale Contributor auf die eigene
  verifizierte `member_id` begrenzen.
- Backend: Projektweite Contributions bleiben fuer Notes gueltig, auch wenn eine
  Release-Version zusaetzliche versionsspezifische Contributions hat.
- Frontend: Wenn serverseitig nur ein Member sichtbar ist, keinen
  "Alle Mitglieder"-Tab anzeigen.
- Kein neues Datenmodell, keine neuen Endpunkte, keine Medien-Aenderungen.

## Verification

- `go test ./internal/repository ./internal/handlers ./internal/permissions -run "ReleaseVersionNotes|ContributorGuard|CanForReleaseVersion" -count=1`
- `npm test -- --run "src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx"`
- `npm run typecheck`
- `npm run lint`
- `git diff --check`
- Docker deploy auf `127.0.0.1:3000`

