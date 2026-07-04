# E2E-Zwischentest: fansub.de -> Team4s Release-Native Workflow

> Status: Ungültig als vollständiger E2E-Zwischentest. Dieser Lauf hat keine Jellyfin-Verknüpfung hergestellt und den Episoden-/Release-Aufbau teilweise API-gestützt statt vollständig über Playwright/UI durchgeführt. Der Lauf bleibt nur als Fehler-/Befundprotokoll erhalten und darf nicht als bestandene UAT gelten.

Datum: 2026-07-02
Lauf: frischer Neuauflauf nach vollständigem lokalen Reset
Umgebung: lokale Dev/Test-Compose-Umgebung (`RUNTIME_PROFILE=local`, `AUTH_ISSUE_DEV_MODE=true`)
Quellen:
- Fansub-Gruppe: https://www.fansub.de/gruppe.rhtml?id=124
- Anime/Fansub-Projekt: https://www.fansub.de/fansub.rhtml?id=2545
- Verknüpfte Anime-Quelle: https://www.anisearch.de/anime/5132

## Kurzfazit

Teilweise bestanden.

Die release-native Ownership-Baseline hält in den wichtigsten Tabellen: Anime und Episoden bleiben neutral, C-Subs und Honto wurden über `fansub_groups`-Chips als echte getrennte Gruppen angelegt, jede Release-Version hängt über `release_version_groups.fansub_group_id` an beiden Gruppen, versionierte Prozessmedien landen in `release_version_media`, Gruppenmedien in `fansub_group_media`, und `release_media` sowie `episode_media` blieben leer.

Nicht bestanden ist der vollständige UI-first Workflow. Der Episoden-/Versionen-Import kann reale fansub.de-Daten nicht vollständig ausdrücken: `fansub.de` ist kein erlaubter `stream_sources.provider_type`, führende Nullen in Episodennummern brechen den Versionen-Endpunkt, CRC und Dateigrößen haben keinen klaren Create-/UI-Slot, und `/api/v1/me/fansub-groups` liefert für Leader `500 db_schema_mismatch`, wodurch der user-visible Einstieg "Meine Gruppen" bricht.

## Reset Und Basis

- Dev/Test bestätigt: lokale Docker-Compose-Services, lokale Volumes, lokale Medienablage.
- `docker compose down -v` ausgeführt.
- Lokale `media/`-Ablage geleert.
- `docker compose up -d --build` ausgeführt.
- Healthcheck: `GET http://127.0.0.1:8092/health` -> `{"status":"ok"}`.
- Migrationstatus: 117 applied, 0 pending.
- Nach Reset: `anime=0`, `episodes=0`, `media_assets=0`, `app_users=0`.
- Plattform-Admin und Test-User wurden frisch in Keycloak/App-Usern angelegt.

## Extrahierte Quelldaten

Anime:
- Titel: `Viper's Creed`
- Alternativtitel: japanischer Titel aus der Projektseite
- Jahr: `2009`
- Episodenanzahl: `12`
- Genres: `Action`, `Mecha`, `Science Fiction`
- Fansub-Status der Quelle: komplett
- Quelle im neutralen Anime: `anisearch:5132`
- Cover: `https://www.fansub.de/img_fansubs/g2545.jpg`
- Screenshot/Thumb: `https://www.fansub.de/img_thumbs/2545_3.jpg`

Gruppen:
- `C-Subs` / Cookie-Subs, Website `http://cookie-subs.org/`, IRC `irc://irc.otakubox.at/C-Subs`
- `Honto`, Website `http://www.honto-subs.de/`, IRC `irc://irc.euirc.net/Honto`
- Keine künstliche Koop-Gruppe angelegt.

Releases:
- 26 Varianten aus der Projektseite erfasst.
- Episoden 01 bis 12, Episode 01 mit `01` und `01v2`.
- Pro Variante erfasst: Episodencode, Titel, `h264`, Auflösung, Release-Datum, CRC und Dateigröße.
- CRC/Dateigröße mussten im Test im Versions-/Dateinamen konserviert werden, weil kein klarer Create-Contract dafür existiert.

Historische Mitglieder:
- 24 sichtbare C-Subs-Mitglieder aus der Gruppenseite angelegt.
- Rollen auf vorhandene `role_definitions` abgebildet, z. B. `translator`, `timer`, `editor`, `typesetter`, `encoder`, `quality_checker`, `designer`, `fansub_lead`.
- Keine historischen Mitglieder automatisch zu App-Usern gemacht.

## Durchgeführter Workflow

1. Plattform-Admin per Keycloak-Token eingerichtet und im Browser getestet.
2. Neutralen Anime angelegt, danach 12 neutrale Episoden.
3. Release-Versionen über den vorhandenen Versionen-/Mapper-Contract angelegt.
4. C-Subs und Honto über `fansub_groups`-Chips erzeugt.
5. C-Subs/Honto im Gruppencontract nachgepflegt.
6. KamiKarin als Leader-App-Mitglied gebootstrappt.
7. Historische Mitglieder und Rollen mit Leader-Rechten angelegt.
8. Sheppert und Sokolada als echte Test-User mit historischen Identitäten verknüpft.
9. Leader vergab aktive Rollen: Sheppert `project_lead`, Sokolada `gfxler` plus Gruppen-Medienrechte.
10. Anime-, Gruppen- und Release-Version-Medien hochgeladen.
11. Playwright-Browser-UAT mit Admin, Leader, Mitglied und Mobile-Viewport ausgeführt.

## Ergebnisdaten

DB-Zähler nach Lauf:
- `anime`: 1
- `episodes`: 12
- `fansub_groups`: 2
- `anime_fansub_groups`: 2
- `fansub_releases`: 26
- `release_versions`: 26
- `release_variants`: 26
- `release_version_groups`: 52
- `hist_fansub_group_members`: 24
- `hist_group_member_roles`: 42
- `fansub_group_members`: 3
- `anime_contributions`: 2

Ownership-Prüfung:
- `release_version_groups` enthält `fansub_group_id`.
- Legacy-Spalte `fansubgroup_id` ist nicht vorhanden.
- C-Subs hat 26 Version-Links.
- Honto hat 26 Version-Links.
- `release_version_media`: 1
- `fansub_group_media`: 1
- `release_media`: 0
- `episode_media`: 0

## Was Funktioniert Hat

- Reset, Build, Migrationen und lokale Basis-Seeds funktionieren.
- Keycloak-Login für Admin, Leader und Mitglieder funktioniert.
- Admin-Anime-Edit lädt den neutralen Anime inklusive AniSearch-Kontext.
- Episode-Import-Seite lädt und erkennt `anisearch:5132`; Jellyfin bleibt erwartbar unverknüpft.
- Freitext-Fansub-Chips erzeugen echte Gruppen und keine Collaboration-/Koop-Gruppe.
- `anime_fansub_groups` wird durch den Release-Version-Gruppenpfad mitgeschrieben.
- Leader kann den kanonischen Gruppenedit `/admin/fansubs/1/edit` öffnen und bearbeiten.
- Mitglied mit eingeschränkten Rechten sieht im Gruppenedit nur reduzierte Tabs.
- Gruppenmedien-Upload mit Sokoladas custom Gruppen-Medienrecht funktioniert.
- Release-Version-Medien-Upload mit Leader-Rechten funktioniert und schreibt korrekt in `release_version_media`.
- Mobile Leader-Ansicht des Gruppenedits ist grundsätzlich erreichbar.

## Gefundene Bugs

1. `POST /api/v1/anime/:id/episodes/:episodeNumber/versions` mit `media_provider="fansub.de"` endet in HTTP 500.
   - Ursache: DB-Constraint `chk_stream_sources_provider_type` erlaubt nur `jellyfin`, `youtube`, `vimeo`, `direct`.
   - Erwartung: Contract/UI sollte source-native Importquellen sauber zulassen oder mit 4xx und verständlicher Meldung ablehnen.

2. Führende Nullen in neutralen Episodennummern brechen Versionen-Anlage.
   - Episoden `01` bis `09` wurden erfolgreich angelegt.
   - Versionen-POST auf `/episodes/09/versions` lieferte 404, weil der Pfad offenbar auf `9` normalisiert, während die Episode als `09` gespeichert war.
   - Workaround im Test: neutrale Episodennummern per API auf `1` bis `9` gepatcht; Quellcodes `01`, `01v2` blieben in Release-Titeln erhalten.

3. `/api/v1/me/fansub-groups` liefert für Leader HTTP 500.
   - Response: `code="db_schema_mismatch"`, Details: "Datenbank-Schema passt nicht zur laufenden Backend-Version. Meine Gruppen konnten nicht geladen werden."
   - Folge: `/admin/my-groups` zeigt "Meine Gruppen konnten nicht geladen werden", obwohl der direkte Gruppenedit funktioniert.
   - Das verletzt den user-visible Einstieg für Leader-Flows.

4. UI-String-Regel verletzt im Versioneneditor.
   - Playwright zeigte `Aufloesung`.
   - Source-Fund: `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx`.
   - Weitere vorhandene ASCII-deutsche Strings wurden per `rg` gefunden, z. B. `unveraendert`, `groesser`, `geaendert`.

5. Externe historische Banner-/Website-Domains lösen im Browser nicht auf.
   - Playwright-Konsole: `net::ERR_NAME_NOT_RESOLVED`.
   - Fachlich erwartbar wegen alter fansub.de-Quellen, aber UI sollte kaputte externe Medien/Links sichtbar robust behandeln.

## UX-Probleme

- UI-first Episodenmapper ist für nicht-Jellyfin/fansub.de-Importe nicht vollständig selbsterklärend: Quelle, Provider, CRC und Dateigrößen passen nicht sauber in die sichtbaren Felder.
- Der sichtbare Leader-Einstieg `/admin/my-groups` ist kaputt; nur der direkte Gruppenedit ist nutzbar.
- Admin-/Leader-/Member-Sicht hängen stark an versteckten Direkt-URLs. Der Auftrag verlangte echte Benutzung wie Nutzer; die Navigation macht das aktuell nicht durchgehend möglich.
- Mobile Gruppenedit funktioniert, ist aber sehr dicht und zeigt viele Admin-Felder untereinander.
- Die Auth-UAT zeigte eine Host-Falle: Playwright mit Cookies nur für `localhost` wurde durch Redirect auf `127.0.0.1` ausgeloggt. Mit Cookies auf beiden Hosts funktionierte die Session.

## Fachliche Modellprobleme

- CRC/Dateigröße sind im Schema (`release_variants.file_size_bytes`) teilweise vorhanden, aber nicht im sichtbaren Create-/Versionen-Endpunkt nutzbar.
- Der Versionen-Create-Endpoint erzeugt für jede technische Variante ein eigenes `fansub_release`. Für Quellepisoden mit zwei Qualitätsvarianten entstehen dadurch 26 Releases statt 12 Releases mit Varianten. Das ist zumindest erklärungsbedürftig und für Release-Review/Theme-Assets potenziell unpraktisch.
- `EpisodeVersion`-JSON führt `id`, aber kein klares `release_version_id`; da Admin-Routen teils mit Variant-ID und Release-Version-ID arbeiten, bleibt die ID-Semantik riskant.
- Custom Gruppen-Medienrechte reichen nicht für Release-Version-Medien. Das kann korrekt sein, braucht aber bessere UX-Erklärung, weil Sokolada als Gruppenmitglied mit Medienpflege für `fansub_group_media` zugelassen war und bei `release_version_media` `no_membership` bekam.

## Playwright-Artefakte

Quellen/Assets:
- `tmp/fresh-e2e-2026-07-02/group.html`
- `tmp/fresh-e2e-2026-07-02/project.html`
- `tmp/fresh-e2e-2026-07-02/assets/vipers-cover.jpg`
- `tmp/fresh-e2e-2026-07-02/assets/vipers-thumb.jpg`

Browser-UAT:
- Erster Auth-Fail-Pass: `tmp/fresh-e2e-2026-07-02/playwright-summary.json`
- Auth-korrigierter Pass: `tmp/fresh-e2e-2026-07-02/playwright-summary-authfixed.json`
- Screenshots: `tmp/fresh-e2e-2026-07-02/screenshots-authfixed/`

Wichtige Screens:
- `admin-anime-edit.png`: neutraler Anime-Edit funktioniert.
- `admin-episode-import.png`: Mapper lädt, aber nur AniSearch/Jellyfin-Kontext sichtbar.
- `admin-fansub-edit.png`: Admin-Gruppenedit funktioniert.
- `admin-version-edit.png`: Versioneneditor funktioniert, zeigt aber `Aufloesung`.
- `leader-fansub-edit.png`: Leader-Gruppenedit funktioniert.
- `leader-my-groups.png`: `/admin/my-groups` bricht mit 500.
- `member-profile.png`: echtes Mitgliedsprofil funktioniert.
- `member-fansub-edit.png`: Mitglied sieht reduzierte Gruppenedit-Oberfläche.
- `mobile-leader-fansub-edit.png`: mobiler Leader-Gruppenedit erreichbar.

## Checks

- `npm --prefix frontend run typecheck`: bestanden.
- `go test ./internal/handlers ./internal/repository` in `backend/`: bestanden.
- `git diff --check`: bestanden.
- `npm --prefix frontend run lint`: fehlgeschlagen an bestehendem Fehler `frontend/src/components/ui/DatePicker.tsx:136` (`react-hooks/set-state-in-effect`) plus 324 bestehende Warnungen, vor allem native UI-Controls und deutsche ASCII-Ersatzstrings.
- `docker compose exec -T team4sv30-backend ./migrate status`: 117 applied, 0 pending.

## Dateien Geändert

- `.planning/audits/2026-07-02-e2e-zwischentest-vipers-creed.md`

Zusätzlich erzeugte Testartefakte:
- `tmp/fresh-e2e-2026-07-02/`

Keine Produktiv-Code-Dateien wurden geändert.

## Empfohlene Nächste Phase

Empfohlen ist eine schmale Phase: "Leader-visible fansub workflow hardening".

Scope:
- `/api/v1/me/fansub-groups` Schema-Mismatch beheben.
- `/admin/my-groups` als echten Einstieg für Leader-UAT wiederherstellen.
- Episode-Version-Create-Contract für source-native Importe härten: erlaubte Provider, führende Nullen, CRC, Dateigröße.
- Deutsche UI-Strings im Versionen-/Mapper-Bereich korrigieren.
- Klare ID-Semantik zwischen `release_variant.id` und `release_versions.id` dokumentieren oder im API-Response explizit machen.

Danach sollte der gleiche fansub.de-Neuauflauf ohne API-Workarounds wiederholt werden.
