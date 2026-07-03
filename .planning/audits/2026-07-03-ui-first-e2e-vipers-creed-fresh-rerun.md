---
date: 2026-07-03
status: in_progress
scenario: fresh UI-first Viper's Creed E2E rerun with Jellyfin gate
---

# Fresh UI-First E2E: Viper's Creed Jellyfin/Fansub Rerun

## Scope

Full rerun of the attached UI-first E2E assignment from a fresh local test baseline.

## Ground Rules

- Fachliche Datenanlage erfolgt über die echte Web-UI mit Playwright.
- API/SQL/CLI wird nur für lokalen Reset, Auth/Testuser-Seed, Diagnose und DB-Invarianten verwendet.
- Jellyfin-Verknüpfung ist ein Pflichtgate vor dem Episodenmapper.
- Für jede Folge wird die passende fansub.de-Zeile einzeln gematcht; EP01 ist kein Template für andere Folgen.

## Environment Reset

- Local stack verified: Docker Compose services `team4sv30-*`, database `team4s_v2`.
- Backend rebuilt before reset so migration `0118_add_crc32_to_release_variants` is active.
- Standard reset executed: `scripts/reset-local-schema-cutover-data.ps1 -ConfirmLocal`.
- Supplemental local reset executed: `TRUNCATE TABLE public.fansub_groups RESTART IDENTITY CASCADE;`
- Media directory cleared under the workspace-owned `media/` directory.
- Keycloak test users ensured with password `123`: `admin`, `csubs.leader`, `sheppert`, `sokolada`.
- Backend/frontend recreated with `RUNTIME_PROFILE=development` so the local auth bypass does not hide role-switching bugs.

## Source Extraction

fansub.de sources fetched locally:

- Group: `https://www.fansub.de/gruppe.rhtml?id=124`
- Project: `https://www.fansub.de/fansub.rhtml?id=2545`

Important extracted matching rule:

- Project groups are `C-Subs` and `Honto`.
- The project has 12 episodes plus an `01v2` release row.
- Every episode has to be matched by its own episode code, codec/resolution, date, groups, CRC, and file size.
- Example only: EP01 `01 h264 1280x720` maps to `-Cyclops-`, `24.12.2009`, `crc: 1CC0A2E3`, `313.940.104 Byte (299M)`.

## Test Log

1. Lokale Testbasis vollständig zurückgesetzt.
2. Keycloak-Testuser mit Passwort `123` sichergestellt: `admin`, `csubs.leader`, `sheppert`, `sokolada`.
3. Login als `admin` über die sichtbare Login-/Keycloak-UI durchgeführt.
4. Anime über UI angelegt:
   - fansub.de-Projektlink enthält AniSearch-ID `3663`.
   - AniSearch-ID `3663` lädt in Team4s jedoch `Code Geass: Hangyaku no Lelouch R2`.
   - UI-Titelsuche findet für `Viper's Creed` die passende AniSearch-ID `5132`.
   - Frische Create-Seite mit AniSearch-ID `5132` lädt korrekt `Viper’s Creed`.
5. Jellyfin-Gate über UI bestanden:
   - Jellyfin-Treffer `Viper's Creed`, Jahr `2009`.
   - Jellyfin Item ID: `7896cbc2ebd598fbca5f1b4df08cc871`.
   - Ordnerpfad: `/media/Anime/Serie/Anime.TV.Sub/Vipers Creed`.
6. Episodenmapper über UI geöffnet:
   - AniSearch ID `5132`.
   - Jellyfin Serie `7896cbc2ebd598fbca5f1b4df08cc871`.
   - Vorschau: 12 kanonische Episoden, 12 Dateien, 12 Vorschläge, 0 Konflikte.
7. Mapper-Zeilen manuell gegen fansub.de-Quelle geprüft und über UI befüllt:
   - Gruppen `C-Subs` und `Honto` als Chips gesetzt und per `Ab hier` auf alle 12 Folgen übernommen.
   - Deutsche Titel aus fansub.de korrigiert, u. a. EP08 `Paradies -eden-` statt AniSearch/Jellyfin `Paradiese`.
   - Release-Feld pro Folge mit dem passenden 1280x720-fansub.de-Titel befüllt.
8. `Alle Vorschläge bestätigen` über UI ausgeführt.
9. `Mapping anwenden` über UI ausgeführt.
10. Zwischenbefund: Backend bricht beim Anlegen der Release-Version für EP02 ab, wenn der fansub.de-Release-Name fälschlich in das Mapper-Feld `Release-Version` geschrieben wird:
    - `create release version release=2: ERROR: value too long for type character varying(20) (SQLSTATE 22001)`.
11. Diagnose:
    - `release_versions.version` ist laut Architektur nur ein kurzer Versionsbezeichner wie `v1`/`v2` (`varchar(20)`).
    - Der Mapper bietet aber nur ein UI-Feld `Version` und kein Feld für `release_versions.title`.
    - Der Testauftrag hatte fachlich den Release-Namen aus fansub.de verlangt; diesen in `version` zu schreiben ist der falsche Domain-Ansatz.
12. Korrektur:
    - Mapper erneut mit `Release-Version = 1` für alle 12 Dateien angewendet.
    - Ergebnis: 12 Episoden, 12 Release-Versionen.
    - Release-Namen, Release-Daten, `hardsub`, `1280x720` und CRC32 wurden anschließend über die Release-Version-Edit-UI gepflegt.
    - Native `datetime-local`-Eingabe im Release-Version-Editor durch den Projekt-`DatePicker` ersetzt und mit fokussierten Tests abgesichert.
    - Date-only-Werte werden beim Speichern als UTC-Mitternacht serialisiert, damit `24.12.2009` nicht zeitzonenabhängig als Vortag im Payload landet.
13. C-Subs-Grunddaten über UI gepflegt:
    - Alias `Cookie-Subs`.
    - Land `Deutschland`.
    - Gründungsjahr `2007`.
    - Community-Links: Website `http://cookie-subs.org/`, IRC `irc://irc.otakubox.at/C-Subs`.
14. Gruppengeschichte über UI gepflegt:
    - Gruppennotiz `C-Subs Profil` veröffentlicht.
    - Meilenstein `Gründung`, Typ `Gründung`, Jahr `2007`, Notiz `Gegründet am 26.04.2007.`
15. C-Subs-Members über UI gepflegt:
    - App-Profil `CSubs Leader` als aktives Gruppenmitglied mit Rolle `Leader` hinzugefügt.
    - Historisches Mitglied `KamiKarin` mit Rollen `Leader`, `Qualitätsprüfung`, `Sonstiges` angelegt.
    - Historisches Mitglied `Sheppert` mit Rollen `Übersetzung`, `Timing`, `Typesetting / FX`, `Encoding`, `Administration` angelegt.
    - Historisches Mitglied `Sokolada` mit Rollen `Design`, `Editing`, `Qualitätsprüfung`, `GFX / Grafik` angelegt.

16. Leader-Einstieg ueber sichtbare Navigation geprueft:
    - `csubs.leader@team4s.local` sieht im Drawer unter `Meine Gruppen` direkt `C-Subs -> /admin/fansubs/3/edit`.
    - `/admin/fansubs/3/edit` ist als Leader erreichbar; `/admin/fansubs/4/edit` (`Honto`) wird mit Zugriffshinweis blockiert.
    - Der Leader sieht keinen Plattform-Admin-Dashboard-Link.
17. Leader-Member-Workflow ueber UI geprueft:
    - CSubs Leader wird als aktives App-Mitglied angezeigt.
    - Historische Mitglieder `KamiKarin`, `Sheppert`, `Sokolada` werden im Leader-Tab geladen.
    - Einladungen fuer `sheppert@team4s.local` und `sokolada@team4s.local` wurden ueber die Leader-UI erstellt.
18. Echte Testuser ueber UI getestet:
    - `sheppert` und `sokolada` wurden ueber Keycloak mit Passwort `123` angemeldet.
    - Beide haben ihre Fansub-Einladung ueber die echte `/invitations/accept?token=...` UI angenommen.
    - Danach zeigen beide im Drawer `Meine Gruppen -> C-Subs`.
    - Beide bleiben dennoch `Account ohne verifizierten Member-Eintrag`; die Einladung verknuepft App-Gruppenrechte, aber nicht automatisch den historischen Member.
    - Sheppert sieht fuer C-Subs nur `Anime & Veroeffentlichungen`; Honto ist blockiert.
    - Sokolada sieht fuer C-Subs `Vorschlaege` und `Anime & Veroeffentlichungen`; Honto ist blockiert.
19. Medienflaechen und Uploads geprueft:
    - C-Subs-Grunddaten zeigen gruppeneigene Logo-/Banner-Upload-Controls.
    - Codex-In-App-Browser kann keine lokalen Dateien setzen (`File uploads are not supported by Codex In-app Browser.`); das war ein Tooling-Limit, kein Produkt-Bug.
    - Normaler Playwright/Chromium konnte das C-Subs-Logo ueber die Gruppen-UI hochladen.
    - Normaler Playwright/Chromium konnte einen Screenshot ueber `/admin/episode-versions/2/edit` in der Kategorie `Screenshot` hochladen.
    - Diagnose bestaetigt: Release-Version-Medium landet in `release_version_media`; `release_media` bleibt leer.

## Screenshots

- `01-admin-login-profile.png`
- `02-admin-profile-after-login.png`
- `03-admin-anime-empty.png`
- `04-anime-create-start.png`
- `05-anisearch-loaded.png`
- `06-anisearch-title-search.png`
- `07-anisearch-5132-selected.png`
- `08-anisearch-5132-loaded.png`
- `09-anisearch-5132-fresh-load.png`
- `10-jellyfin-search-results.png`
- `11-jellyfin-adopted-create.png`
- `12-anime-created.png`
- `13-post-create-route.png`
- `14-anime-edit-jellyfin-context.png`
- `15-episodes-empty-after-jellyfin.png`
- `16-episode-import-context.png`
- `17-episode-import-preview.png`
- `18-mapper-filled-before-apply.png`
- `19-mapper-apply-version-varchar20-blocker.png`
- `20-episodes-after-correct-apply.png`
- `21-release-version-edit-start.png`
- `22-release-version-date-picker-and-metadata.png`
- `23-csubs-members-app-and-historical.png`
- Live-DOM-Nachweis ohne Screenshot: `csubs.leader@team4s.local` sieht im App-Drawer `Meine Gruppen` mit direktem Link `C-Subs -> /admin/fansubs/3/edit`; `/manage/groups` liefert HTTP 404.

- `26-release-version-media-upload-drawer.png`
- `27-csubs-group-media-controls.png`
- `28-playwright-group-logo-upload.png`
- `29-playwright-release-version-media-upload.png`

## Findings

### Zwischenbefund: Mapper-Feld falsch interpretiert

- Der Mapper exponiert nur `release_version`/`release_versions.version` für operator-entered Release-Metadaten.
- fansub.de-Release-Namen wie `Neuer Rekrut -unknown-` passen fachlich nach `release_versions.title`, nicht nach `release_versions.version`.
- Durch `varchar(20)` auf `release_versions.version` scheitert der Apply reproduzierbar, sobald ein echter fansub.de-Release-Name länger als 20 Zeichen ist.
- Korrekte Bedienung: Im Mapper `1` verwenden und fachliche Release-Metadaten danach im Release-Version-Edit setzen.

### Kritische Ansatzbewertung

- Nicht richtig: fansub.de-Titel in das bestehende Mapper-Feld `Version` schreiben.
- Richtig: `version` bleibt kurz (`v1`, `v2`, ggf. `01v2` nur als Versionseinordnung), `release_versions.title` trägt den fansub.de-Release-Namen, `release_variants.crc32` trägt die CRC der konkret gematchten Datei/Variante.
- Für die aktuelle Jellyfin-Dateiqualität `720p` wurde gegen die fansub.de-Zeilen `h264 1280x720` gematcht.
- Der Mapper kann aktuell keine CRC, Release-Datum, Dateigröße oder separaten Release-Titel erfassen. Das ist die eigentliche Produkt-/Contract-Lücke.

### Additional Findings

- fansub.de-Projektseite verlinkt AniSearch-ID `3663`; Team4s lädt dafür `Code Geass: Hangyaku no Lelouch R2`. Die passende Viper's-Creed-ID wurde über UI-Titelsuche als `5132` gefunden.
- Nach Laden der falschen AniSearch-ID `3663` überschreibt das spätere Auswählen/Laden von `5132` die bereits gefüllten Detailfelder nicht zuverlässig. Eine frische Create-Seite mit `5132` funktioniert.
- Mapper-/Import-UI enthält weiterhin ASCII-Umlauttexte, z. B. `ueberspringen`, `Ubernehmen`, `hinzugefuegt`, obwohl UI-Regel korrekte Umlaute verlangt.
- Der EP08-Titel unterscheidet sich zwischen AniSearch/Jellyfin (`Paradiese`) und fansub.de (`Paradies -eden-`).
- Gruppennotiz-Link-Markup wird weiterhin vom Backend abgelehnt: automatisch erkannte Links/Domains erzeugen `nicht erlaubter Mark-Typ: "link"`. Workaround im Test: Gruppennotiz ohne URL-/Domain-Text speichern und Links in den Community-Link-Feldern pflegen.
- Die historische Mitgliederliste zeigt einzelne Rollen als technische Keys statt deutsche Labels (`other`, `admin`), obwohl `role_definitions.label_de` korrekte Labels enthält.
- App-Mitglied `CSubs Leader` wird in der UI korrekt als `CSubs Leader` und `Leader` angezeigt. DB-seitig ist es über `app_user_id` verknüpft; `member_id` bleibt bei diesem App-Member leer.
- Die frühere Zwischenseite `Meine Gruppen` wurde entfernt: keine Links mehr auf `/manage/groups`, `/manage/groups` ist 404, und der App-Drawer nutzt die Memberships aus `/me/profile` direkt für Gruppenlinks.

- Fansub-Einladungen funktionieren fuer echte Testuser (`Sheppert`, `Sokolada`) und erzeugen aktive App-Gruppenmitgliedschaften mit begrenzten Rollenrechten.
- Die Einladung/Annahme verknuepft den App-User nicht automatisch mit dem gleichnamigen historischen Member-Eintrag: `fansub_group_members.member_id` bleibt leer und das Profil zeigt weiter `noch keinem verifizierten Member-Eintrag`.
- Rollenlabels lecken weiterhin technische Keys in mehreren Kontexten: historische Rollen zeigen `other`/`admin`, Einladungstabelle zeigt bei Sheppert `admin`.
- Datei-Uploads sind in der Codex-In-App-Browser-Steuerung nicht moeglich, funktionieren aber mit normalem Playwright/Chromium ueber die echte UI.

## DB Invariants

Nach dem fehlgeschlagenen UI-Apply wurden per Diagnose-SQL geprüft:

```txt
episodes               0
fansub_releases        0
release_versions       0
release_variants       0
release_version_groups 0
fansub_groups          0
anime_fansub_groups    0
```

Der Apply ist also transaktional zurückgerollt; keine halb angelegten Episode-/Release-/Group-Daten blieben zurück.

Nach korrigiertem Mapper-Apply und nachträglicher Pflege im Release-Version-Edit wurden per Diagnose-SQL geprüft:

```txt
EP01 1 -Cyclops-                   2009-12-24 1280x720 1CC0A2E3 C-Subs, Honto
EP02 1 Neuer Rekrut -unknown-      2010-11-14 1280x720 725856F1 C-Subs, Honto
EP03 1 Kanonenschuss -shot-        2010-12-04 1280x720 0B89A591 C-Subs, Honto
EP04 1 Hexe -sorceress-            2010-12-18 1280x720 5D37069F C-Subs, Honto
EP05 1 Todesgott -grim reaper-     2010-12-18 1280x720 79194A30 C-Subs, Honto
EP06 1 Holzpuppe -golem-           2010-12-24 1280x720 FC73512F C-Subs, Honto
EP07 1 Chaos -riot-                2011-01-23 1280x720 D2F36C71 C-Subs, Honto
EP08 1 Paradies -eden-             2011-02-18 1280x720 DAE374A7 C-Subs, Honto
EP09 1 Verschwörung -intrigue-     2011-03-24 1280x720 E8A6018D C-Subs, Honto
EP10 1 Gegenschlag -counterattack- 2011-03-24 1280x720 539981BE C-Subs, Honto
EP11 1 Wahrheit -truth-            2011-03-24 1280x720 4C08E885 C-Subs, Honto
EP12 1 Ein Auge -blindness-        2011-03-24 1280x720 1540DB61 C-Subs, Honto
```

Nach C-Subs-Member-Pflege über UI wurden per Diagnose-SQL geprüft:

```txt
C-Subs app_members=1 historical_members=3
Honto  app_members=0 historical_members=0

App-Mitglied:
csubs.leader / csubs.leader@team4s.local / fansub_lead

Historische Rollen:
KamiKarin fansub_lead     Leader            public
KamiKarin other           Sonstiges         public
KamiKarin quality_checker Qualitätsprüfung  public
Sheppert  admin           Administration    public
Sheppert  encoder         Encoding          public
Sheppert  timer           Timing            public
Sheppert  translator      Übersetzung       public
Sheppert  typesetter      Typesetting / FX  public
Sokolada  designer        Design            public
Sokolada  editor          Editing           public
Sokolada  gfxler          GFX / Grafik      public
Sokolada  quality_checker Qualitätsprüfung  public
```

Nach Einladung/Annahme der echten Testuser wurden per Diagnose-SQL geprueft:

```txt
csubs.leader@team4s.local C-Subs active member_id=NULL fansub_lead
sheppert@team4s.local     C-Subs active member_id=NULL admin,encoder,timer,translator,typesetter
sokolada@team4s.local     C-Subs active member_id=NULL designer,editor,gfxler,quality_checker

sheppert@team4s.local accepted expires 2026-07-10
sokolada@team4s.local accepted expires 2026-07-10
```

Nach Medien-Uploads ueber normalen Playwright/Chromium wurden per Diagnose-SQL geprueft:

```txt
release_media         0
release_version_media 1
fansub_group_media    0
csubs_logo_id         5

release_version_media:
id=1 release_version_id=2 category=screenshot media_asset_id=6
file_path=/app/media/release-version/2/59341fc3-dda0-4c64-bf6b-0539f5c8d367/original.jpg mime_type=image/jpeg

fansub_groups:
C-Subs logo_id=5
```

## Recommendation

Empfehlung für spätere Verbesserung:

1. Episode-Import-Contract um echte Release-Metadaten erweitern:
   - `release_title`
   - `release_date`
   - `crc32`
   - optional `file_size_bytes`
2. Mapper-UI semantisch trennen:
   - `Version` bleibt kurzer Versionsbezeichner (`v1`, `v2`).
   - `Release-Name` schreibt nach `release_versions.title`.
   - `CRC` schreibt nach `release_variants.crc32`.
3. Backend-Apply entsprechend mappen und validieren:
   - keine langen Namen in `release_versions.version`.
   - CRC normalisieren wie in der Release-Version-Editor-UI.
4. Danach den kompletten UI-first Auftrag erneut frisch resetten und von vorne ausführen.
