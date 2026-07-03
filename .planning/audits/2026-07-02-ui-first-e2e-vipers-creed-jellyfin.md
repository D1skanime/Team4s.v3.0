# UI-first E2E-Zwischentest: Viper's Creed mit Jellyfin-Matching

Status: PARTIAL
Datum: 2026-07-02
Umgebung: lokale Dev/Test-Compose-Umgebung (`RUNTIME_PROFILE=local`, `AUTH_ISSUE_DEV_MODE=true`)

## Quellen

- Fansub-Gruppe: https://www.fansub.de/gruppe.rhtml?id=124
- Anime-/Fansub-Projekt: https://www.fansub.de/fansub.rhtml?id=2545
- Extrahierte lokale Quellkopien:
  - `tmp/fansub-gruppe-124.html`
  - `tmp/fansub-project-2545.html`

## UI-/Playwright-Artefakte

- In-app Browser Screenshots: `tmp/e2e-jellyfin-gate-2026-07-02/screenshots/`
- Standalone-Playwright Screenshots: `tmp/e2e-jellyfin-gate-2026-07-02/screenshots-standalone/`
- Standalone-Playwright Summary: `tmp/e2e-jellyfin-gate-2026-07-02/standalone-playwright-summary.json`

## Reset und Seed-Ausnahmen

- Dev/Test bestaetigt: lokale Docker-Compose-Services, lokale Postgres-Volumes, lokale `media/`-Ablage.
- `docker compose down -v` ausgefuehrt.
- `media/` nach Pfadpruefung geleert.
- `docker compose up -d --build` ausgefuehrt.
- Healthcheck `http://127.0.0.1:8092/health`: `{"status":"ok"}`.
- Migrationstatus: 117 applied, 0 pending.
- Erlaubte Test-User/Auth-Seed-Ausnahme: Keycloak-User `admin` angelegt und `app_users.id=1` als `platform_admin` aktiviert.

## Per UI/Playwright ausgefuehrt

1. Plattform-Admin ueber echte Keycloak-Login-UI angemeldet.
2. Anime-Create-Route `/admin/anime/create` geoeffnet.
3. Jellyfin-Suche mit `Viper's Creed` benutzt.
4. Jellyfin-Kandidat `Viper's Creed` ausgewaehlt.
   - Jellyfin Item ID: `7896cbc2ebd598fbca5f1b4df08cc871`
   - Ordnerpfad: `/media/Anime/Serie/Anime.TV.Sub/Vipers Creed`
5. Jellyfin-Uebernahme ausgefuehrt; Cover, Banner, Logo und ein Hintergrund wurden in der Create-UI als Jellyfin-Assets angezeigt.
6. AniSearch-ID `5132` aus der fansub.de-Projektseite extrahiert und per Create-UI geladen.
7. Anime per UI erstellt.
8. Edit-Route `/admin/anime/1/edit` geoeffnet.
9. Import-Route `/admin/anime/1/episodes/import` geoeffnet und Jellyfin-Kontext verifiziert.
10. Episode-Mapper-Vorschau geladen.
11. `C-Subs` und `Honto` per Chip/Keyboard-Workflow in der ersten Mapping-Zeile gesetzt und per `Ab hier` auf alle 12 Zeilen propagiert.
12. Alle Vorschlaege bestaetigt und Mapping per UI angewendet.
13. C-Subs-Gruppenedit `/admin/fansubs/1/edit` geoeffnet.
14. Alias `Cookie-Subs` per UI gesetzt und gespeichert.

## Ergebnisdaten

- `anime`: 1
- `episodes`: 12
- `fansub_groups`: 2 (`C-Subs`, `Honto`)
- `anime_fansub_groups`: 2
- `fansub_releases`: 12
- `release_versions`: 12
- `release_version_groups`: 24
- `release_media`: 0
- `episode_media`: 0
- `release_version_media`: 0
- `fansub_group_media`: 0

Release-Version-Gruppen:

- `C-Subs`: 12 Release-Version-Links
- `Honto`: 12 Release-Version-Links
- `release_version_groups` enthaelt nur `release_version_id`, `fansub_group_id`, `created_at`; keine Legacy-Spalte `fansubgroup_id`.

## Was funktioniert hat

- Jellyfin war konfiguriert und erreichbar.
- Pflicht-Gate "Jellyfin zuerst" wurde bestanden.
- Episode-Import-Seite zeigte Jellyfin-Serie, Ordnerpfad und Quelle nicht als unverknuepft.
- Mapper erzeugte echte getrennte Gruppen `C-Subs` und `Honto`.
- Keine kuenstliche Koop-Gruppe wurde erzeugt.
- Release-Versionen haengen an beiden Gruppen ueber `release_version_groups.fansub_group_id`.
- Release-Medien wurden nicht direkt an Episoden gehaengt.
- `release_media` blieb leer.

## Bugs und UX-Probleme

1. Anime-Edit zeigt widerspruechlichen Jellyfin-Status:
   - Header: `Quelle jellyfin:7896cbc2ebd598fbca5f1b4df08cc871`
   - Import-Seite: Jellyfin-Serie korrekt sichtbar
   - Edit-Feld `Jellyfin-Link`: `Nicht verknuepft`
   - Edit-Feld `Jellyfin Item ID`: leer

2. Episoden-Uebersicht zeigt nach erfolgreichem Mapping `Episoden 0`, obwohl 12 Episoden gelistet werden.

3. `anime.anisearch_id` blieb leer, obwohl die Import-Seite AniSearch-ID `5132` verwendete.

4. Mapper bildet nur 12 Jellyfin-Dateien/Versionen ab, waehrend fansub.de 26 Release-Varianten mit Aufloesung, CRC und Dateigroesse listet.
   - CRC und Dateigroesse sind in der UI nicht erfassbar.
   - Die zweite Qualitaetsvariante und `01v2` wurden nicht als eigene Release-Varianten aus der UI erzeugt.
   - Retest-Regel: Fuer jede Folge die passende fansub.de-Release-Zeile einzeln anhand Episode, Codec/Aufloesung, Gruppen, Datum, Dateigroesse, CRC und Jellyfin-Dateievidence matchen; EP01 `01 h264 1280x720` -> `-Cyclops-`, `C-Subs`/`Honto`, `crc: 1CC0A2E3` ist nur ein Beispiel und darf nicht auf andere Folgen kopiert werden.

5. Mehrere UI-Texte verletzen die Umlautregel:
   - `Hintergruende`
   - `fuegt`
   - `ueberspringen`
   - `Vorschlaege`

6. Mapper-Chip-UX: Der sichtbare Button `Als Chip` fuehrte in der Browser-Automation nicht zum Chip; Enter im Eingabefeld funktionierte.

7. C-Subs-Gruppenedit: Der Year-Picker liess sich im Playwright-Lauf nicht auf `2007` setzen.

8. Historische externe Medienquelle `http://cookie-subs.org/bilder/banner-c-subs.jpg` war nicht aufloesbar.

## Nicht abgeschlossen

- C-Subs/Honto vollstaendig mit allen externen Links, Gruendungsjahr und Gruppenmedien pflegen.
- Leader-Testuser per UI mit C-Subs verbinden und Leader-Rechte vergeben.
- Leader-Navigation ueber den sichtbaren Einstieg testen.
- Historische Mitglieder per Leader-UI erfassen.
- Sheppert/Sokolada als echte Mitglieder verknuepfen und Rollen/Sichtbarkeit testen.
- Anime-, Gruppen- und Release-Version-Medienpfade durch Upload-UI vollstaendig testen.

## Empfohlene naechste Phase

Empfohlen ist eine schmale Phase: `UI-first Jellyfin/import hardening`.

Scope:

- Jellyfin-Link/Item-ID im Anime-Edit konsistent anzeigen und speichern.
- Episode-Overview-Zaehler nach Mapping korrigieren.
- AniSearch-ID Persistenz zwischen Create/Edit/Import klaeren.
- Mapper fuer mehrere Release-Varianten, CRC und Dateigroesse erweitern oder explizit als nicht unterstuetzt markieren.
- Deutsche UI-Strings mit Umlauten korrigieren.
- Mapper-Chip-Button und Year-Picker Playwright-/Keyboard-zugaenglich machen.

