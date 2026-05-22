# Contributor Dashboard Phase 48

## Ist-Analyse

Phase 48 baut keine zweite Admin-Anwendung. Der Slice macht bestehende, geprüfte Team4s-Funktionen für Contributors erreichbar:

- Auth-Kontext: `AppAuthHandler` und `middleware.AuthIdentity` liefern App-User, Status, globale Rollen und Legacy-Link.
- Mitgliedschaft: `fansub_group_members` ist die App-Rechtequelle; `group_members` bleibt nur historischer Kontext aus Phase 47.
- Release-Scope: Release-Versionen werden über `release_version_groups.fansub_group_id` geladen, damit Coop-Releases nur für beteiligte Gruppen sichtbar sind.
- UI-Basis: `PageHeader`, `SectionHeader`, `Card`, `Badge`, `Button`, `Toolbar`, `Table`, `LoadingState`, `ErrorState` und `EmptyState` aus `frontend/src/components/ui`.
- Navigation: `/admin` bleibt der Einstieg; `/admin/profile` und `/admin/my-groups` sind die Contributor-Ziele.

Es war keine neue Migration nötig. Die Umsetzung nutzt bestehende Tabellen und die vorhandene Permission Engine.

## Backend-Modell

Neue Read-Surfaces:

- `GET /api/v1/me/fansub-groups`
- `GET /api/v1/me/fansub-groups/:id`

Die Übersicht liefert Gruppe, Rollen, Status, Aktivzeit, Zähler und Capability-Booleans. Das Detail ergänzt Anime, Release-Versionen und historische Credits. Fremde Gruppen werden serverseitig blockiert; disabled App-User erhalten keinen Zugriff.

## UI-Abgleich

Der Slice folgt der globalen Team4s-UI statt lokaler Sonderoptik:

- Hauptflächen sind globale `Card variant="section"`.
- Unterbereiche sind `Card variant="nested"`.
- Status und Rollen nutzen globale `Badge`-Varianten.
- Aktionen nutzen globale `Button`-Varianten und werden nur über Capability-Booleans sichtbar.
- Tabellen verwenden die globale `Table`-Komposition plus die in `/dev/ui-system` dokumentierte Wine-Headerlinie.

Lokale CSS bleibt auf Domain-Layout begrenzt: Gruppenbanner, Metrikgrid, Release-Tabellenabstände und responsive Anordnung.

## Phase-47-Rückprüfung

Die Phase-47-Grenze bleibt intakt:

- Historische Credits werden als `Meine Beteiligungen` angezeigt.
- Historische Credits erzeugen keine App-Rechte.
- Capability-Entscheidungen kommen aus der zentralen Permission Engine.
- App-Mitgliedschaft und historische Mitgliedschaft bleiben im UI getrennt lesbar.

## Bewusst Verschoben

- Vollständige Contributor-Editoren für Release-Notizen und Media bleiben in den bestehenden Admin-Seams.
- Eine öffentliche Archivansicht ist ein passender schmaler Phase-49-Slice.
- Server-Pagination für sehr große Contributor-Listen ist ein späterer Skalierungsschritt.
