---
status: complete
date: 2026-07-03
quick_id: 260703-br4
scope: fresh UI-first Viper's Creed E2E retest after auth/logout and DatePicker quick fixes
---

# UI-first E2E Retest: Viper's Creed

## Ergebnis

Der Auftrag wurde nach frischem Reset erneut von vorne ausgeführt. Das Jellyfin-Gate ist bestanden, AniSearch-ID 5132 wurde aus fansub.de extrahiert und per UI geladen, der Episode-Mapper hat 12 Episoden, 12 Releases, 12 Release-Versionen und 24 Release-Version-Gruppenzuordnungen erzeugt. C-Subs und Honto wurden getrennt erzeugt; es wurde keine künstliche Koop-Gruppe angelegt.

Der Test ist **nicht invalid** und nicht am frühen Jellyfin/AniSearch-Gate blockiert. Es bleiben aber mehrere echte Befunde für Folgearbeit.

## Quellen

- Auftrag: `C:\Users\admin\.codex\attachments\41a75dad-d331-4172-833b-aa3827d05bcd\pasted-text.txt`
- Source snapshot Gruppe: `.planning/quick/260703-br4-fresh-ui-first-viper-s-creed-e2e-retest-/fansub-gruppe-124.html`
- Source snapshot Projekt: `.planning/quick/260703-br4-fresh-ui-first-viper-s-creed-e2e-retest-/fansub-project-2545.html`
- Extraktion: `.planning/quick/260703-br4-fresh-ui-first-viper-s-creed-e2e-retest-/extracted-release-info.txt`
- Screenshots: `.planning/audits/screenshots-2026-07-03-vipers-creed-fresh-after-fixes/`

## Rollen und Accounts

- Plattform-Admin: `admin` / `admin@team4s.local`
- Fansub-Leader: `csubs.leader` / `csubs.leader@team4s.local`
- Historische Mitglieder ohne App-User: `Sheppert`, `Sokolada`

## UI-Aktionen

- Reset und Quell-Extraktion per CLI/HTTP als erlaubte Ausnahme.
- Admin-Login per Keycloak-UI.
- Anime-Anlage über `/admin/anime/create`.
- Jellyfin-Suche nach `Viper's Creed`, Kandidat übernommen.
- AniSearch-ID `5132` geladen.
- Anime erstellt, danach Edit-UI und Episode-Import-Gate geprüft.
- Episode-Mapper über `/admin/anime/1/episodes/import` geladen.
- C-Subs und Honto als Chips auf Zeile 1 eingetragen, mit `Ab hier` propagiert.
- Alle Vorschläge bestätigt und Mapping angewendet.
- C-Subs über `/admin/fansubs/73/edit` gepflegt: Alias, Land, Gründungsjahr, Website, IRC, Gruppennotiz, historische Mitglieder.
- Leader-Einladung per UI erstellt, Mailpit nur zum Auslesen des Links verwendet.
- Leader per Keycloak-UI angemeldet, Einladung angenommen, Leader-Zugriff geprüft.

## Jellyfin-Gate

- Kandidat: `Viper's Creed`
- Jahr: `2009`
- Pfad: `/media/Anime/Serie/Anime.TV.Sub/Vipers Creed`
- Item-ID: `7896cbc2ebd598fbca5f1b4df08cc871`
- Import-Seite zeigte vor Mapperstart: AniSearch ID `5132`, Jellyfin Serie `7896cbc2ebd598fbca5f1b4df08cc871`, Ordnerpfad und Quelle `jellyfin:7896cbc2ebd598fbca5f1b4df08cc871`.

## Mapper-Ergebnis

- UI-Preview: 12 kanonisch, 12 Dateien, 12 bestätigte Zeilen nach `Alle Vorschläge bestätigen`.
- DB-Diagnose:
  - `anime=1`
  - `episodes=12`
  - `fansub_groups=2`
  - `anime_fansub_groups=2`
  - `fansub_releases=12`
  - `release_versions=12`
  - `release_version_groups=24`
  - `release_media=0`
  - `release_version_media=0`
  - `fansub_group_media=0`
- Jede Release-Version hängt an `C-Subs, Honto`.

## Gruppen- und Member-Ergebnis

- C-Subs und Honto erscheinen getrennt in `/admin/fansubs`.
- C-Subs gepflegt:
  - Name `C-Subs`, Alias `Cookie-Subs`
  - Land `Deutschland`
  - Gründungsjahr `2007`
  - Links: Website `http://cookie-subs.org/`, IRC `irc://irc.otakubox.at/C-Subs`
  - Gruppennotiz öffentlich/veröffentlicht mit Historie aus fansub.de
- Historische Mitglieder:
  - Sheppert: `fansub_lead`, `translator`, `timer`, `typesetter`, `encoder`, `admin`
  - Sokolada: `designer`, `editor`, `quality_checker`, `gfxler`
- Leader:
  - Einladung `csubs.leader@team4s.local` wurde angenommen.
  - DB: `fansub_group_members` enthält `C-Subs / csubs.leader@team4s.local / active / fansub_lead`.
  - Leader sieht `/admin/fansubs/73/edit` als `Meine Gruppen / C-Subs`.
  - Leader bekommt bei `/admin/anime` die Admin-Verboten-Ansicht.

## Befunde

1. **Anime-Edit zeigt widersprüchliches Jellyfin-Feld.** Header und Import-Kontext zeigen `source=jellyfin:7896...`, Item-ID und Pfad korrekt; das Feld `Jellyfin-Link` zeigt aber `Nicht verknüpft`.
2. **Episode-Übersicht zählt Episoden falsch.** Nach erfolgreichem Mapping zeigt die Übersicht 12 Accordion-Zeilen, aber den Statistikwert `Episoden 0`.
3. **EP08-Titel ist fachlich falsch.** Mapper/AniSearch zeigt `Paradiese`; fansub.de-Projektquelle enthält `Paradies -eden-`.
4. **Release-Details aus fansub.de können nicht vollständig abgebildet werden.** CRC, Dateigrößen, 704x400-Varianten und EP01 v2/original wurden nicht per UI erfasst und nicht per API ergänzt.
5. **Meilenstein-YearPicker startet bei `2088-2099`.** Grunddaten-YearPicker war nach dem DatePicker-Fix stabil, aber `GroupHistoryForm` verwendet `maxYear=2099`; 2007 ist nur über viele Rückwärtsklicks erreichbar und der Dialog lag im Browser schlecht erreichbar.
6. **Kontakt-Mail hat keinen passenden Community-Link-Typ.** Linktypen sind `website`, `discord`, `twitter`, `github`, `irc`; `support[-at-]cookie-subs.org` wurde nicht als Mail/Kontakt erfasst.
7. **Deutsche UI-Texte enthalten ASCII-Umlautersatz.** Beispiele: `Hintergruende`, `fuegt`, `ueberspringen`, `Ubernehmen`.
8. **In-App-Browser hing zweimal bei Member/Login-Interaktionen.** Der fachliche UI-Flow war über separaten Playwright weiterhin möglich; das ist als Testeinschränkung dokumentiert.

## Empfehlung

Als nächstes keine große neue Phase starten, sondern einen schmalen Fix-Slice:

1. Episode-Übersicht-Zähler und Jellyfin-Link-Anzeige reparieren.
2. `GroupHistoryForm` YearPicker auf realistischen Max-Year-Kontext umstellen.
3. Release-Import-Modell/UX für CRC, Dateigröße, technische Varianten und v2/original klären.
4. Danach den vollständigen UI-first E2E-Test erneut laufen lassen, aber die frühe Jellyfin/AniSearch-Blockade ist jetzt überwunden.
