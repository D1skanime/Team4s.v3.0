# UI-first E2E-Zwischentest Viper's Creed - Fresh Rerun

Datum: 2026-07-04
Status: IN PROGRESS

## Warum dieser Lauf neu gestartet wurde

Der vorherige Lauf ist fachlich verworfen, weil die App-Member/Projektrollen-Zuordnung frueh blockiert hat. Dadurch konnten Leader/Mitglieder keine verlaesslichen projekt- und releasebezogenen Daten schreiben oder Medienpfade testen. Dieser Lauf startet deshalb nach lokalem Datenreset neu.

## Auftrag

Quelle: `C:\Users\admin\.codex\attachments\41a75dad-d331-4172-833b-aa3827d05bcd\pasted-text.txt`

Kurzfassung:
- UI-first E2E-Test fuer Viper's Creed.
- Fachliche Aktionen ueber echte Web-UI.
- Jellyfin-Verknuepfung ist Pflicht-Gate vor Episodenmapper.
- API/SQL/CLI nur fuer Reset, Auth-Seed, Migrationstatus, Diagnose und Verifikation.

## Reset / Seed

Ausgefuehrt:
- Lokale Docker-Compose-Dev-Umgebung bestaetigt: Projekt `team4s`, DB `team4s_v2`, lokale Ports `3000`, `8092`, `5433`, `8081`.
- `docker compose down`
- Lokale Volumes entfernt: `team4s_postgres_data`, `team4s_keycloak_db_data`, `team4s_frontend_next`.
- Medienordner geleert: `C:\Users\admin\Documents\Team4s\media`.
- Stack neu gebaut und gestartet: `docker compose up -d --build`.
- Migrationstatus: Version 1-120 applied, 0 pending.
- Healthcheck: `GET /health` -> 200 / `{"status":"ok"}`.

Erlaubte Auth-Seed-Ausnahmen:
- Keycloak-Testuser angelegt, Passwort jeweils `123`:
  - `platform-admin`
  - `csubs-leader`
  - `sheppert`
  - `sokolada`
- Plattform-Adminrolle per SQL gesetzt, nachdem der echte UI-Login den `app_users`-Eintrag erzeugt hat:
  - `platform-admin@team4s.local` -> `platform_admin`

## Accounts

| Rolle | Login | Passwort | Status |
|---|---|---|---|
| Plattform-Admin | `platform-admin` | `123` | UI-Login erfolgreich, Admin sichtbar |
| Fansub-Leader | `csubs-leader` | `123` | Angelegt, noch nicht im UI getestet |
| Mitglied | `sheppert` | `123` | Angelegt, noch nicht im UI getestet |
| Mitglied | `sokolada` | `123` | Angelegt, noch nicht im UI getestet |

## Screenshots

- `screenshots-2026-07-04-vipers-creed-fresh-rerun/01-admin-after-login.png`
- `screenshots-2026-07-04-vipers-creed-fresh-rerun/02-anime-create-jellyfin-gate.png`
- `screenshots-2026-07-04-vipers-creed-fresh-rerun/03-episode-import-jellyfin-linked.png`
- `screenshots-2026-07-04-vipers-creed-fresh-rerun/04-mapper-ready-csubs-honto-confirmed.png`
- `screenshots-2026-07-04-vipers-creed-fresh-rerun/05-leader-csubs-membership.png`
- `screenshots-2026-07-04-vipers-creed-fresh-rerun/06-leader-historical-members.png`
- `screenshots-2026-07-04-vipers-creed-fresh-rerun/07-sokolada-member-releases.png`
- `screenshots-2026-07-04-vipers-creed-fresh-rerun/08-leader-segment-media.png`

## Laufprotokoll

### 1. Admin-Login

Route: `http://127.0.0.1:3000/login`

UI-Schritte:
- Loginseite geoeffnet.
- `Mit Keycloak anmelden` geklickt.
- Keycloak-Login mit `platform-admin` / `123` ausgefuehrt.
- App leitete zu `/me/profile`.
- Nach SQL-Auth-Seed `/admin` geoeffnet.

Ergebnis:
- Adminbereich sichtbar mit `Studio (Anime + Episoden)`, `Benutzer & Rechte`, `Capability-Verwaltung`, `Fansubs`.

### 2. Quellenextraktion fansub.de

Quellen:
- `https://www.fansub.de/gruppe.rhtml?id=124`
- `https://www.fansub.de/fansub.rhtml?id=2545`

Extrahierte Projektbasis:
- Titel: `Viper's Creed`
- Alternativer Titel: `ヴァイパーズ・クリード`
- Jahr: `2009`
- Folgenzahl: `12`
- Genres: `Action`, `Mecha`, `Science Fiction`
- Fansub-Status: `Komplett`
- Gruppen: `C-Subs`, `Honto`
- AniSearch-ID: `5132`
- Beschreibung: Fort Diversity / Alcon Global Security / Mitte des 21. Jahrhunderts.

Extrahierte Gruppenbasis C-Subs:
- Name: `[C-Subs] - Cookie-Subs`
- Webseite: `http://cookie-subs.org/`
- IRC: `irc://irc.otakubox.at/C-Subs`
- Kontakt: `support[-at-]cookie-subs.org`
- Historie: Cookie-Subs wurde am 26.04.2007 von Takayuki gegruendet; seit 01.04.2008 Leitung durch Sheppert; seit 09.08.2009 Leitung durch KamiKarin.

Extrahierte Mitglieder/Rollen C-Subs:
- `KamiKarin`: Leaderin, Sauberfee & Maedchen fuer Alles
- `Sheppert`: Translation, Timing, Typeset, Encode, Tracker/Board-Admin & Webseeder
- `Sokolada`: Webdesign, Edit, QC, Logo, Karaoke
- weitere historische Mitglieder vorhanden, werden im Leader-Teil nach Bedarf erfasst.

Release-Daten-Regel fuer diesen Test:
- Bei Jellyfin-Aufloesung `1280x720` immer die passende `1280x720`-Release-Zeile aus fansub.de verwenden.
- CRC/Dateigroesse pro Folge aus fansub.de gegen die UI-Moeglichkeiten pruefen.
- Wenn CRC/Dateigroesse in der UI nicht erfassbar sind, nicht per API nachtragen, sondern als UX-/Modellluecke dokumentieren.

720p-Referenzdaten:

| EP | Release-Name | Datum | CRC | Groesse |
|---|---|---:|---|---:|
| 01 | `-Cyclops-` | 24.12.2009 | `1CC0A2E3` | 313.940.104 Byte |
| 01v2 | `Zyklop -cyclops-` | 26.04.2010 | `42837FD8` | 230.405.704 Byte |
| 02 | `Neuer Rekrut -unknown-` | 14.11.2010 | `725856F1` | 230.060.404 Byte |
| 03 | `Kanonenschuss -shot-` | 04.12.2010 | `0B89A591` | 313.916.499 Byte |
| 04 | `Hexe -sorceress-` | 18.12.2010 | `5D37069F` | 314.089.355 Byte |
| 05 | `Todesgott -grim reaper-` | 18.12.2010 | `79194A30` | 314.099.151 Byte |
| 06 | `Holzpuppe -golem-` | 24.12.2010 | `FC73512F` | 314.082.722 Byte |
| 07 | `Chaos -riot-` | 23.01.2011 | `D2F36C71` | 314.067.801 Byte |
| 08 | `Paradies -eden-` | 18.02.2011 | `DAE374A7` | 314.105.643 Byte |
| 09 | `Verschwoerung -intrigue-` | 24.03.2011 | `E8A6018D` | 314.137.100 Byte |
| 10 | `Gegenschlag -counterattack-` | 24.03.2011 | `539981BE` | 314.079.376 Byte |
| 11 | `Wahrheit -truth-` | 24.03.2011 | `4C08E885` | 314.119.399 Byte |
| 12 | `Ein Auge -blindness-` | 24.03.2011 | `1540DB61` | 313.906.326 Byte |

### 3. Anime-Anlage und Jellyfin-Pflicht-Gate

Route:
- `http://127.0.0.1:3000/admin/anime/create`
- `http://127.0.0.1:3000/admin/anime/1/episodes/import`

UI-Schritte:
- Anime `Viper's Creed` ueber die Admin-UI angelegt.
- AniSearch-ID `5132` erfasst und AniSearch-Daten geladen.
- Jellyfin-Suche in der UI benutzt.
- Jellyfin-Kandidat fuer `/media/Anime/Serie/Anime.TV.Sub/Vipers Creed` ausgewaehlt.
- Jellyfin-Serienverknuepfung gespeichert.
- Episodenimport erst nach sichtbarer Jellyfin-Verknuepfung geoeffnet.

Ergebnis:
- Anime `#001` angelegt.
- Jellyfin-Serie war im Episodenimport sichtbar und nicht mehr als unverknuepft markiert.
- Jellyfin-Item aus dem Lauf: `7896cbc2ebd598fbca5f1b4df08cc871`.
- Pflicht-Gate bestanden.

### 4. Episodenmapper und Gruppen-Chips

Route:
- `http://127.0.0.1:3000/admin/anime/1/episodes/import`

UI-Schritte:
- Jellyfin-Dateien geladen.
- 12 Jellyfin-Dateien den 12 Episoden zugeordnet.
- Gruppen im Mapper als getrennte Chips gesetzt: `C-Subs`, `Honto`.
- Keine kuenstliche Koop-Gruppe erzeugt.
- Mapping bestaetigt und angewendet.

Ergebnis:
- `Episoden erstellt: 12`
- `Versionen erstellt: 12`
- `Mappings: 12`
- Episodenuebersicht zeigte pro Episode `1 Version`; der fruehere Fehler `+2 VERSIONEN` fuer zwei Gruppen wurde in diesem Lauf nicht reproduziert.

### 5. Release-Version-Daten EP01-EP12

Route:
- `http://127.0.0.1:3000/admin/episode-versions/[versionId]/edit`

UI-Schritte:
- Release-Versionen per UI nach fansub.de-720p-Zeile gepflegt.
- Name, Datum, Aufloesung und CRC ueber die vorhandenen UI-Felder gesetzt.
- Keine API-Ergaenzung fuer fachliche Release-Daten verwendet.

Ergebnis:
- EP01: `-Cyclops-`, 24.12.2009, `1280x720`, CRC `1CC0A2E3`
- EP02: `Neuer Rekrut -unknown-`, 14.11.2010, `1280x720`, CRC `725856F1`
- EP03: `Kanonenschuss -shot-`, 04.12.2010, `1280x720`, CRC `0B89A591`
- EP04: `Hexe -sorceress-`, 18.12.2010, `1280x720`, CRC `5D37069F`
- EP05: `Todesgott -grim reaper-`, 18.12.2010, `1280x720`, CRC `79194A30`
- EP06: `Holzpuppe -golem-`, 24.12.2010, `1280x720`, CRC `FC73512F`
- EP07: `Chaos -riot-`, 23.01.2011, `1280x720`, CRC `D2F36C71`
- EP08: `Paradies -eden-`, 18.02.2011, `1280x720`, CRC `DAE374A7`
- EP09: `Verschwoerung -intrigue-`, 24.03.2011, `1280x720`, CRC `E8A6018D`
- EP10: `Gegenschlag -counterattack-`, 24.03.2011, `1280x720`, CRC `539981BE`
- EP11: `Wahrheit -truth-`, 24.03.2011, `1280x720`, CRC `4C08E885`
- EP12: `Ein Auge -blindness-`, 24.03.2011, `1280x720`, CRC `1540DB61`

Notiz:
- fansub.de schreibt EP09 `Verschwoerung`; UI/DB sollten perspektivisch korrekte Umlaute unterstuetzen bzw. Quelle sauber dekodieren.

### 6. C-Subs Gruppenedit

Route:
- `http://127.0.0.1:3000/admin/fansubs/1/edit`

UI-Schritte:
- C-Subs Grunddaten nach fansub.de gepflegt.
- Alias `Cookie-Subs`, Gruendungsjahr `2007`, Website `http://cookie-subs.org/`, IRC `irc://irc.otakubox.at/C-Subs` gesetzt.
- Gruppengeschichte als Notiz erfasst.
- Gruendungsmeilenstein fuer 2007 erfasst.

Ergebnis:
- Grunddaten speicherbar.
- Meilenstein-YearPicker-Regression aus vorherigem Lauf trat hier nicht erneut als Blocker auf.
- Gruppennotiz mit automatisch erkanntem Link-Markup wurde vom Backend weiter abgelehnt; ohne Linktext konnte gespeichert werden.

### 7. Zwischenfix waehrend Testlauf: Logout

Grund:
- Der Rollenwechsel war blockiert, weil `Abmelden` nicht verlaesslich zur Loginseite fuehrte.

Umsetzung:
- `frontend/src/components/layout/AppShell.tsx` so angepasst, dass Logout sofort nach `/login` routet und nicht auf den entfernten Keycloak-Logout wartet.
- Regressionstest in `frontend/src/components/layout/AppShell.test.tsx` ergaenzt.

Verifikation:
- `npm test -- --run src/components/layout/AppShell.test.tsx` -> 22/22 gruen.
- `npm run typecheck` -> gruen.
- Live im In-App-Browser: Desktop-Edge-Drawer geoeffnet, `Abmelden` geklickt, URL wechselte auf `/login`.

### 8. Leader-Einladung und Rollenwechsel

Route:
- `http://127.0.0.1:3000/admin/fansubs/1/edit?tab=collaboration`
- `http://127.0.0.1:3000/invitations/accept?token=...`
- `http://127.0.0.1:3000/me/profile`

UI-Schritte:
- Als Plattform-Admin im Tab `Fansub Members` `Mitglied hinzufuegen` geoeffnet.
- `App-Mitglied / Einladung` gewaehlt.
- Einladung an `csubs-leader@team4s.local` erstellt.
- Rollen nach Annahme gesetzt: `Leader`, `Fansub-Projektleitung`.
- Einladungslink aus Mailpit-Testpostfach geoeffnet.
- Ueber `/login` -> `Erneut anmelden` sauber zu `csubs-leader` / `123` gewechselt.
- Einladung als `csubs-leader` ueber UI angenommen.

Ergebnis:
- `csubs-leader` erscheint als aktives Mitglied von `C-Subs`.
- Rollenanzeige: `Leader`, `Projektleitung`.
- App-Shell zeigt unter `MEINE GRUPPEN` direkt `C-Subs`.
- Eigene Gruppe `/admin/fansubs/1/edit` ist erreichbar.
- Allgemeiner Plattform-Adminbereich `/admin` bleibt gesperrt.
- Fremde Gruppe `/admin/fansubs/2/edit` bleibt gesperrt.

Testhinweis:
- Beim automatisierten Login darf nach Keycloak-Callback nicht zu frueh von `/login` weg navigiert werden; sonst kann das Login-Callback-Handling unterbrochen werden und die Shell wirkt kurz anonym. Mit sauberem Warten bis `/me/profile` funktioniert der Rollenwechsel.

### 9. Historische Mitglieder als Leader

Route:
- `http://127.0.0.1:3000/admin/fansubs/1/edit?tab=collaboration`

UI-Schritte:
- Als `csubs-leader` `Mitglied hinzufuegen` -> `Historischen Eintrag anlegen` genutzt.
- `KamiKarin` historisch angelegt, Rolle `Leader`.
- `Sheppert` historisch angelegt, Rollen `Uebersetzung`, `Timing`, `Typesetting`, `Encoding`, `Administration`.
- `Sokolada` historisch angelegt, Rollen `Design`, `Editing`, `Qualitaetscheck`, `GFX / Grafik`.

Ergebnis:
- Historische Mitglieder koennen durch den Leader angelegt werden.
- Mehrere historische Rollen pro Person koennen angelegt werden.
- Datumsfelder koennen leer bleiben; UI zeigt dann `? - heute`.

Befunde:
- Freiform-Rollen aus fansub.de wie `Sauberfee`, `Maedchen fuer Alles`, `Tracker/Board-Admin`, `Webseeder`, `Logo`, `Karaoke` koennen nicht sauber als Quelle/Freitext an der Rolle erfasst werden.
- Rollenlabel-Bug: Rolle `admin` wird in der historischen Liste als Rohcode `admin` angezeigt statt als deutsches Label `Administration`.

### 10. Echte Mitglieder Sheppert und Sokolada

Route:
- `http://127.0.0.1:3000/admin/fansubs/1/edit?tab=collaboration`
- `http://127.0.0.1:3000/invitations/accept?token=...`
- `http://127.0.0.1:3000/me/profile`

UI-Schritte:
- Als `csubs-leader` Einladungen fuer `sheppert@team4s.local` und `sokolada@team4s.local` erstellt.
- Sheppert-Rollen nach Annahme: `Uebersetzung`, `Timing`, `Typesetting`, `Encoding`, `Administration`.
- Sokolada-Rollen nach Annahme: `Design`, `Editing`, `Qualitaetspruefung`, `GFX / Grafik`.
- Beide Testuser ueber `/login` -> `Erneut anmelden` mit Passwort `123` eingeloggt.
- Beide Einladungslinks ueber die echte UI angenommen.

Ergebnis:
- Beide Einladungen wurden erfolgreich angenommen.
- Sokolada sieht im Drawer unter `MEINE GRUPPEN` direkt `C-Subs`.
- Sokolada sieht die eigene Gruppe und den Releasebereich, aber nicht die Mitgliederverwaltung.
- Allgemeines Admin-Menue bleibt fuer normale Mitglieder verborgen.

Befunde:
- Auch nach Einladung bleibt im Profil: `Dieser Login ist noch keinem verifizierten Member-Eintrag zugeordnet.` Die App-Mitgliedschaft und das oeffentliche/historische Member-Profil sind also getrennte Konzepte. Das ist fachlich vermutlich korrekt, muss aber in der UX klar bleiben.
- Sokolada kann als Nicht-Leader Gruppennotizen bearbeiten/loeschen und Meilensteine hinzufuegen. Das kann beabsichtigt sein, wenn Rollen wie `Editing` Gruppencontent-Rechte tragen; fachlich noch pruefen.
- Rollenlabel-Bug wiederholt sich in Einladungen und Listen: `admin` erscheint als Rohcode statt `Administration`.

### 11. Diagnose-/DB-Invarianten nach Mitgliederblock

Erlaubte Diagnose nach UI-Aktionen:
- `fansub_group_members`: 3 aktive Mitglieder fuer C-Subs.
  - `csubs-leader@team4s.local`: `{fansub_lead, project_lead}`
  - `sheppert@team4s.local`: `{translator, timer, typesetter, encoder, admin}`
  - `sokolada@team4s.local`: `{designer, editor, gfxler, quality_checker}`
- `fansub_group_invitations`: alle 3 Einladungen `accepted`.
- `hist_fansub_group_members`: 3 historische Eintraege fuer `KamiKarin`, `Sheppert`, `Sokolada`.
- Medienzaehlung nach diesem Block: `release_media=0`, `release_version_media=0`, `fansub_group_media=0`.

### 12. Leader Release-Version-Segmente und Media-Tab

Route:
- `http://127.0.0.1:3000/admin/episode-versions/1/edit?tab=segmente`

UI-Schritte:
- Als `csubs-leader` zur Release-Version EP01 / C-Subs v1 gewechselt.
- Tab `Segmente` war sichtbar.
- `Segment hinzufuegen` geoeffnet.
- OP-Kara-Segment angelegt:
  - Typ: `OP Kara`
  - Name: `Viper's Creed OP`
  - Episodenbereich: `1` bis `12`
  - Zeit: `00:00:00` bis `00:01:20`
  - Provenance: `Episode-Version / Jellyfin-Stream (Standard)`
- Tab `Media / Assets` geoeffnet.

Ergebnis:
- Der fruehere Leader-Blocker `keine berechtigung` beim Segmentanlegen trat nicht mehr auf.
- Segment wurde gespeichert und in der Liste angezeigt.
- Timeline zeigte OP-Block.
- Media-Tab zeigte release-version-scoped Kontext `Fansub-Gruppe C-Subs`, `Release-Version v1`.
- Upload-Controls fuer Kategorien `Screenshot`, `Typesetting / Karaoke`, `Fun / Outtake`, `Sonstiges` waren sichtbar.

Diagnose-/DB-Invarianten:
- `theme_segments`: 1 Segment fuer `fansub_group_id=1`, `version=v1`, EP `1-12`, Zeit `00:00:00-00:01:20`, `source_type=none`.
- Segmentanlage mit Jellyfin/Episode-Version-Stream erzeugte keine Medienzeilen:
  - `release_media=0`
  - `release_version_media=0`
  - `fansub_group_media=0`
- `media_assets=4` stammen aus vorherigen Anime/Jellyfin-Asset-Schritten, nicht aus Segmentupload.

### 13. Nachtest nach neutralen Rollen und vollstaendigem C-Subs-History-Import

Grund:
- Der Rollen-/Projektmitgliederblock war ein frueher Hauptblocker.
- Danach wurden die neutralen Rollenlabels committed und die Dev-Container neu gebaut.
- Alle auf fansub.de fuer C-Subs gefundenen historischen Mitglieder wurden als historische Mitglieder importiert.
- Bekannte Viper's-Creed-Projektrollen wurden den historischen Mitgliedern am Projekt zugeordnet.
- Es wurden dabei keine neuen App-User oder Keycloak-Accounts angelegt.

Diagnose-/DB-Invarianten:
- `fansub_group_members`: 3 aktive App-Mitglieder fuer C-Subs.
- `hist_fansub_group_members`: 25 historische C-Subs-Mitglieder.
- `anime_contributions`: 24 historische Personen fuer Viper's Creed / C-Subs.
- `release_media=0`, `release_version_media=0`, `fansub_group_media=0`, `theme_segments=1`.

UI-Ergebnis als `csubs-leader`:
- C-Subs `Fansub Members` zeigt die aktive Mitgliedschaft mit neutraleren Labels:
  - `csubs-leader`: `Gruppenleitung`, `Projektleitung`
  - `Sokolada`: `Design`, `Editing`, `Grafik`, `Qualitaetspruefung`
- Historische Liste zeigt 25 importierte Personen.
- Stichproben sichtbar: `2sek`, `Akropolis`, `Askat`, `Blackiris`, `KamiKarin`, `Sheppert`, `Sokolada`, `Takayuki`, `Yuuichi`.
- Alte Labels `Leader`, `GFX / Grafik`, `Qualitaetscheck`, `Gruender/in` wurden in den geprueften Listen nicht mehr gefunden.

Befunde:
- Rohrollen `admin` und `other` erscheinen in der historischen Mitgliederliste weiterhin als Codes statt als deutsche/neutralere Labels.
- Die Mitgliederliste erzeugt beim Laden N+1-Fanout:
  - viele einzelne `/member-roles?member_id=...` Requests
  - viele einzelne `/group-members/{id}/claim-invitations` Requests
  - ein fuer Leader sichtbarer/caught `403` auf `/api/v1/admin/member-requests`
- Bei 25 historischen Personen ist das sichtbar traege. Performance-Kandidat: Rollen und Claim-State batchen, Admin-only Requests capability-gaten.

### 14. Projekt-/Releaseuebersicht fuer Leader und Mitglieder

Route:
- `http://127.0.0.1:3000/admin/fansubs/1/edit?tab=releases`

UI-Ergebnis:
- Als `csubs-leader`, `sokolada` und `sheppert` ist C-Subs im Drawer direkt erreichbar.
- Die Viper's-Creed-Karte zeigt:
  - `Releases: 12/12`
  - `Mitwirkende (24)`
  - `Einblick fehlt`
- Aufgeklappt zeigt die Karte `Team & Rollen` mit `24 Personen`.
- Jede Episode zeigt `Versionen: 1` und `24 Personen`.
- Der fruehere Fehler `+2 VERSIONEN` fuer eine Release-Version mit zwei Gruppen ist in diesem Lauf nicht reproduziert.

Befunde:
- Die Uebersicht zeigt nur Counts, aber keine konkrete Liste der 24 Personen/Rollen.
- Das als Leader angelegte OP-Kara-Segment fuer EP01-EP12 wird in der Uebersicht nicht als Theme erkannt; alle Episoden zeigen weiter `Keine Themes`.
- Die Releaseuebersicht nutzt sichtbar teilweise den neutralen Episodentitel statt `release_versions.title`.
  - DB: EP08 `episode_title=Paradiese`, `version_title=Paradies -eden-`.
  - UI: EP08 zeigt `Paradiese`.
  - DB: EP03-EP06 haben korrekte `version_title` mit Suffix, UI zeigt nur `Kanonenschuss`, `Hexe`, `Todesgott`, `Holzpuppe`.
- Gespeicherte Version-/Variantendaten sind dabei korrekt:
  - 12 Release-Versionen mit fansub.de-Titeln, Datum, `1280x720`, CRC.
  - CRC/Aufloesung liegen in `release_variants`, Titel/Datum in `release_versions`.

### 15. Nicht verifizierte Member-Profile und Mitgliederrechte

Route:
- `http://127.0.0.1:3000/me/profile`
- `http://127.0.0.1:3000/me/projects/1/group/1`
- `http://127.0.0.1:3000/admin/episode-versions/1/edit?tab=segmente`

UI-Ergebnis:
- `sokolada` und `sheppert` koennen sich mit Passwort `123` anmelden.
- Beide sehen C-Subs unter `MEINE GRUPPEN`.
- Beide sehen den eingeschraenkten Gruppen-Releasebereich.
- Beide Profile zeigen weiterhin: `Dieser Login ist noch keinem verifizierten Member-Eintrag zugeordnet.`
- Direkte Projektseite fuer `csubs-leader` war nicht verfuegbar: `kein verifizierter Member-Account verknuepft`.

Befunde:
- App-Mitgliedschaft, historische Member-Identitaet und verifizierter Member-Link bleiben getrennte Konzepte.
- Das kann fachlich korrekt sein, blockiert aber `Meine Projekte`/Member-Projektseiten fuer aktive Gruppenmitglieder, solange kein Claim/Link erfolgt.
- Als `sokolada` leitet `?tab=segmente` nicht zur Segmentverwaltung, sondern faktisch in den `Media / Assets`-Bereich.
- Segmenttab/Rechte sind fuer normale Mitglieder damit unklar: keine sichtbare Fehlermeldung, keine klare Tab-Ausblendung, kein Segmentformular.
- Release-Version-Media-Upload-UI ist fuer `sokolada` sichtbar und release-version-scoped:
  - Kontext `Fansub-Gruppe C-Subs`, `Release-Version v1`
  - Kategorien `Screenshot`, `Typesetting / Karaoke`, `Fun / Outtake`, `Sonstiges`
  - Upload-Hinweis: neue Uploads starten als `In Pruefung`
- Echter Datei-Upload konnte mit dem aktuellen Browser-Control nicht sauber ausgefuehrt werden, weil die File-Input-Setzfunktion in dieser Umgebung nicht verfuegbar ist.

### 16. Logout-Regression bleibt offen

Route:
- `http://127.0.0.1:3000/admin/episode-versions/1/edit?tab=segmente`
- `http://127.0.0.1:3000/login`

UI-Schritte:
- Als `sokolada` sichtbaren Button `Abmelden` eindeutig gezaehlt: 1 Treffer.
- Button geklickt.
- 1,5 Sekunden gewartet.

Ergebnis:
- URL blieb unveraendert.
- Sichtbare Session blieb `Sokolada Member`.
- Keine verwertbare Browser-Console-Fehlermeldung.
- Rollenwechsel war weiterhin nur ueber `/login` -> `Erneut anmelden` -> Keycloak `prompt=login` verlaesslich moeglich.

## Offene naechste Schritte

- Quick-Fix-Kandidaten aus diesem Lauf:
  - Logout-Button reparieren; aktuell keine sichtbare Session-Beendigung.
  - Historische Rollenlabels `admin`/`other` sauber deutsch/neutral anzeigen.
  - Gruppen-Releaseuebersicht muss `release_versions.title` fuer Release-Versionen nutzen und Theme-Segmente korrekt zaehlen.
  - Segmenttab fuer normale Mitglieder klar regeln: sichtbar mit Rechten oder sauber ausgeblendet/erklaert.
  - Historische Mitglieder/Claim-State batchen, um den N+1-Ladevorgang zu entschaerfen.
- Release-Version-Medienupload real testen und `release_version_media`-Invariante nach Upload pruefen, sobald File-Upload im Browser-Test sauber ausfuehrbar ist.
- Gruppenmedienupload real testen und `fansub_group_media`-Invariante nach Upload pruefen.
- Mitglieder: Sheppert ebenfalls stichprobenartig auf Rechte/Releasebereich pruefen.
- Optional: ED-Segment analog anlegen, falls Zeiten/Quelle geprueft werden sollen.
