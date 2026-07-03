---
date: 2026-07-03
status: completed_with_findings
scope: UI-first E2E Zwischentest Viper's Creed / Jellyfin / fansub.de C-Subs
---

# UI-first E2E Zwischentest: Viper's Creed

## Ergebnis

Der Test konnte nach frischem Reset diesmal fachlich bis hinter den fruehen Jellyfin-/Episoden-Blocker laufen.

Bestanden:
- Anime `Viper's Creed` wurde per UI aus AniSearch-ID `5132` geladen, per UI mit Jellyfin-Serie `7896cbc2ebd598fbca5f1b4df08cc871` verbunden und gespeichert.
- Episoden-Importer-Gate erkannte AniSearch + Jellyfin + Ordnerpfad und erlaubte den Mapper.
- Mapper erzeugte 12 Episoden, 12 Releases, 12 Release-Versionen und 24 `release_version_groups` fuer `c-subs` + `honto`.
- Admin-Edit zeigt den Jellyfin-Link jetzt konsistent als `Verknuepft`.
- Episodenuebersicht zeigt jetzt `Episoden 12` und `Versionen gesamt 12`.
- C-Subs wurde ueber die Gruppen-UI mit Grunddaten, Links, Historie, Leader-Einladung, historischen Mitgliedern und Gruppenmedium gepflegt.
- Medien-Invariante stimmt: Gruppenmedium liegt in `fansub_group_media`; `release_media=0`, `release_version_media=0`.

Nicht sauber / Bugs:
- EP08 heisst in der importierten AniSearch/Jellyfin-UI `Paradiese`, die fansub.de-Quelle nennt fuer EP08 `Paradies -eden-`.
- Gruppennotiz-Editor erzeugt/erlaubt Link-Markup, das der Backend-Validator ablehnt: `(400) nicht erlaubter Editor-Inhalt: nicht erlaubter Mark-Typ: "link"`.
- Meilenstein-YearPicker startete im zweiten/weiteren Formularzustand bei `2088-2099`; Auswahl 2007/2008 war nur nach mehrfachen `Frueher`-Klicks moeglich.
- App-Logout blieb zunaechst sichtbar in der Admin-Session haengen; Rollenwechsel brauchte Keycloak-Logout plus erneute Navigation. Die Leader-Annahme wurde deshalb in frischem Playwright-Browserkontext ausgefuehrt.
- Akzeptiertes App-Mitglied wird in der Gruppen-UI als `Mitglied #2` angezeigt, nicht als `CSubs Leader`; offenbar fehlt eine sichtbare Profil-/Member-Verknuepfung.
- fansub.de-Kontakt `support[-at-]cookie-subs.org`, Rollen `Webseeder`, `Karaoke`, `Logo` sind nicht exakt in den vorhandenen UI-Modellen abbildbar.

## Test-Setup

Reset/Seed-Ausnahmen:
- Lokales Profil verifiziert: `RUNTIME_PROFILE=local`, DB `team4s_v2`.
- `scripts/reset-local-schema-cutover-data.ps1 -ConfirmLocal`.
- Zusaetzlicher TRUNCATE fuer Fansub-/Member-/Media-Testtabellen, lokal nach Profilpruefung.
- Lokaler Medienordner geleert.
- Keycloak-Testpasswoerter gesetzt:
  - `admin / 123`
  - `csubs.leader / 123`
- fansub.de-Quellen per `Invoke-WebRequest` lokal gespiegelt:
  - `.planning/quick/260703-e2e-vipers-creed-after-ui-count-fixes/fansub-gruppe-124.html`
  - `.planning/quick/260703-e2e-vipers-creed-after-ui-count-fixes/fansub-project-2545.html`
- Testbild fuer Gruppenmedium:
  - `.planning/quick/260703-e2e-vipers-creed-after-ui-count-fixes/csubs-test-asset.png`

## UI-Schritte

Admin `admin / 123`:
- `/admin/anime/create`
- AniSearch-ID `5132` geladen.
- Jellyfin-Suche `Viper's Creed`, Treffer `Viper's Creed` / Pfad `/media/Anime/Serie/Anime.TV.Sub/Vipers Creed` uebernommen.
- Anime erstellt, dann `/admin/anime/1/edit` geprueft.
- `/admin/anime/1/episodes/import`: Vorschau geladen, Fansub-Gruppen `C-Subs` und `Honto` als Chips gesetzt, `Ab hier`, `Alle Vorschlaege bestaetigen`, `Mapping anwenden`.
- `/admin/anime/1/episodes`: `Episoden 12`, `Versionen gesamt 12`.
- `/admin/fansubs`: genau `C-Subs` und `Honto`.
- `/admin/fansubs/1/edit`:
  - Land `Deutschland`, Alias `Cookie-Subs`, Gruendungsjahr `2007`.
  - Links `Website http://cookie-subs.org/`, `IRC irc://irc.otakubox.at/C-Subs`.
  - Gruppennotiz und Meilensteine fuer Gruendung/Leaderwechsel.
  - Einladung an `csubs.leader@team4s.local` mit Rolle `Leader`.
  - Historische Mitglieder `Sheppert`, `Sokolada`.
  - Gruppenmedium Kategorie `Alte Webseite` per Upload.
  - Releases-Tab: `Viper's Creed`, `Releases: 12/12`.

Leader `csubs.leader / 123`:
- Einladungspfad aus Entwickler-Fallback: `/invitations/accept?token=...`.
- Frischer Playwright-Kontext, Login per Keycloak UI, Einladung angenommen.

## Screenshots

Alle Screenshots liegen unter `.planning/audits/screenshots-2026-07-03-vipers-creed-after-ui-count-fixes/`.

Wichtige Belege:
- `04-edit-jellyfin-linked-fixed.png`
- `05-episode-import-gate.png`
- `06-import-preview-loaded.png`
- `09-mapping-applied.png`
- `12-csubs-basics-links-saved.png`
- `13-csubs-history-saved.png`
- `15-leader-invite-requires-login.png`
- `16-leader-invite-ready.png`
- `17-leader-invite-accepted.png`
- `18-csubs-members-after-leader-and-history.png`
- `20-csubs-media-uploaded.png`
- `21-csubs-releases-expanded.png`

## DB-Invarianten

Counts nach Abschluss:

```text
anime                     1
anime_fansub_groups       2
episodes                  12
fansub_groups             2
fansub_releases           12
release_versions          12
release_version_groups    24
release_media             0
release_version_media     0
fansub_group_media        1
fansub_group_members      1
hist_fansub_group_members 2
fansub_group_invitations  1
```

Quellenlinks:

```text
anime_source_links:
anisearch:5132
jellyfin:7896cbc2ebd598fbca5f1b4df08cc871
```

Anime:

```text
title: Viper's Creed
source: jellyfin:7896cbc2ebd598fbca5f1b4df08cc871
anisearch_id: 5132
folder_name: /media/Anime/Serie/Anime.TV.Sub/Vipers Creed
```

Release-Version-Gruppen:

```text
version_id 1..12 -> c-subs, honto
```

Members:

```text
csubs.leader@team4s.local -> active -> fansub_lead
Sheppert -> public -> admin, encoder, timer, translator, typesetter
Sokolada -> public -> designer, editor, gfxler, quality_checker
```

Gruppenmedium:

```text
fansub_group_media.group_id=1 slug=c-subs category=old_website media_id=5
media_assets.file_path=/app/media/image_1783065189200_2996065978a7ae2e.png
media_files:
- original /app/media/image_1783065189200_2996065978a7ae2e.png ready 320x180
- thumb    /app/media/image_1783065189200_2996065978a7ae2e_thumb.jpg ready 400x225
```

## Kritische Bewertung

Der Ansatz ist richtig, wenn der Mapper nach dem Pflicht-Gate strikt aus Anime-Quellen (`anisearch:5132`, Jellyfin-Serie, Ordnerpfad) arbeitet und daraus neutrale Episoden plus release-native Fansub-Kontext erzeugt. Genau das ist passiert: Anime/Episoden bleiben neutral, Fansub-Zuordnung liegt in `anime_fansub_groups`, Releases an Episoden, Versionen an Releases, Gruppen an Versionen.

Wichtig ist: Der Mapper darf fansub.de-Projektdaten nicht als Episode-Medien oder Release-Medien missverstehen. Dieser Test hat keine falsche Medienanhaengung erzeugt; der einzige Medienupload wurde ueber die Gruppenmedien-UI in `fansub_group_media` gespeichert.

Die offenen Probleme sind nicht mehr der fruehe Jellyfin-/Stat-Blocker, sondern Folgequalitaet: Quelltitle-Abweichung EP08, Editor/YearPicker/Logout-UX, fehlende exakte Rollenmodelle und fehlende sichtbare App-Member-Namensauflösung.

## Empfehlung

Den urspruenglichen Gesamtauftrag kann man jetzt wiederholen bzw. fortsetzen, aber mit diesen Anschluss-Quick-Fixes vor der naechsten grossen UAT-Runde:

1. Gruppennotiz-Editor/Backend-Markup-Vertrag fixen: Link-Mark akzeptieren oder im Editor deaktivieren.
2. YearPicker fuer Meilenstein-Formulare fixen: initiale Page darf nicht `2088-2099` sein.
3. App-Logout/Rollenwechsel untersuchen: UI-Klick muss lokale Session sichtbar und sofort beenden.
4. App-Member-Darstellung in Gruppenmitgliedern verbessern: E-Mail/Displayname statt `Mitglied #2` oder klare Profilverknuepfung.
5. EP08-Mapping/Source-Vergleich als Datenqualitaetsfrage markieren: AniSearch/Jellyfin `Paradiese` vs fansub.de `Paradies -eden-`.
