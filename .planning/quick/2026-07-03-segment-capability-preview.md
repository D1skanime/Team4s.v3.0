# GSD Quick: Segment-Rechte, Jellyfin-Vorschau, 4-Minuten-Schutz

Datum: 2026-07-03
Status: umgesetzt

## Ziel

OP/ED/Insert/Outro-Segmente sollen nicht mehr Admin-only sein, sondern über eine vergebbare Release-Version-Capability gepflegt werden können. Segment-Preview soll direkt aus Jellyfin über das bestehende Stream-Relay laufen. Segment-Zeitbereiche dürfen maximal 4 Minuten lang sein.

## Umsetzung

- Neue Capability `release_version.segments.manage` für `fansub_lead`, `project_lead` und `timer`.
- Segment-CRUD, Library-Reuse und Segment-Asset-Upload/-Delete prüfen diese Capability gegen die echte `release_variant_id`.
- Release-Version-Capabilities liefern `can_manage_segments` an die UI.
- Contributor-Editor zeigt den Segment-Tab, wenn diese Capability vorhanden ist.
- Segment-Editor zeigt eine Jellyfin-Vorschau über `/api/releases/:id/stream?startTimeTicks=...`.
- Next-Relay und Backend-Stream-Proxy reichen `startTimeTicks` korrekt weiter.
- Backend-Validation lehnt Zeitfenster über 240 Sekunden ab; exakt 240 Sekunden bleibt erlaubt.

## Checks

- `go test ./internal/handlers ./internal/permissions`
- `npm test -- src/app/admin/episode-versions/[versionId]/edit/page.test.tsx src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx src/app/me/releases/[versionId]/workspace/page.test.tsx`
- `npm run typecheck`
- `npm run lint` (0 errors, bestehende Repo-Warnungen)
- `git diff --check`

## Resthinweise

- Die Segment-Endpunkte sind im OpenAPI-Vertrag bisher nicht als Pfade vorhanden; aktualisiert wurde das bestehende Release-Version-Capability-Schema.
- Die spätere Public-Seite sollte einen echten segmentbegrenzten Stream-Grant bekommen, nicht einfach einen Vollstream-Grant wiederverwenden.
