---
phase: 175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-
plan: 05
subsystem: docs
tags: [inventory, soft-delete, hard-delete, cleanup-jobs, anime-create, jellyfin, anisearch, episode-import, permissions]

# Dependency graph
requires:
  - phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
    provides: "174-REPORT.md Verdikt zu useAdminAnimeCreateControllerImpl.ts (D-24), 174-BUGS.md (BUG-174-03 Stale-State-Muster)"
provides:
  - "data/08-loeschen-aufraeumen.md: 11 Löschen-/Aufräumen-Mechanismen über 9 Fachdomänen + 2 technische Cleanup-Jobs, je mit Fundstelle und D-04-Klassifikation"
  - "data/09-anime-anlegen-importieren.md: bestätigte EIN-Controller/EIN-Endpunkt-Analyse für manuell/Jellyfin/AniSearch plus eigenständige Episoden-Import-Infrastruktur"
  - "scripts/count-08-loeschen-aufraeumen.sh, scripts/count-09-anime-anlegen-importieren.sh: reproduzierbare Grep-Zählungen"
affects: [175-07-INVENTORY, 175-ROADMAP-PROPOSAL]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-03/D-04 Inventur-Schema (a-f plus Duplikat/Variante/legitim-getrennt-Klassifikation) auf Löschen/Aufräumen und Anime-Anlegen angewendet"
    - "Grep-reproduzierbare count-*.sh-Skripte pro Fachaufgabe als Analyse-Nachweis (kein Live-Stack-Zugriff)"

key-files:
  created:
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/data/08-loeschen-aufraeumen.md
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/scripts/count-08-loeschen-aufraeumen.sh
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/data/09-anime-anlegen-importieren.md
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/scripts/count-09-anime-anlegen-importieren.sh
  modified: []

key-decisions:
  - "Löschen/Aufräumen: 3 echte Unterscheidungen dokumentiert — Hard-Delete (Anime/Fansub-Gruppe/Mitglied-aktiv/Mitglied-Legacy/Beitrag), Soft-Delete per deleted_at (Release-Version-Medien, Gruppenmedien-Galerie), Status-Übergang/Tombstone ohne Soft-Delete (Release-Review-Lifecycle nach Ablehnungs-Retention)"
  - "Orphan-Fund: DELETE /fansubs/:id/members/:memberId (Legacy-Route, fansub_members-Tabelle, requireAdmin) hat keinen Frontend-Aufrufer mehr — ersetzt durch DELETE .../group-members/:memberId (hist_fansub_group_members, gruppenscoped ActionFansubGroupHistoricalMembersManage). Kandidat zur Entfernung in Folgephase."
  - "Mehrdeutigkeits-Risiko: DELETE /admin/fansubs/:id/media/:kind liefert je nach Parameterform (Zahl vs. String) zwei unterschiedliche Löschsemantiken (Soft-Delete eines Galerie-Bilds vs. reines FK-Unassign eines Logo/Banner-Slots) — für Aufrufer am Pfad nicht erkennbar."
  - "Anime anlegen/importieren: 174-REPORT.md-Verdikt aus Fachaufgaben-Sicht bestätigt — manuell/Jellyfin/AniSearch sind EIN Controller mit EINEM Speicher-Endpunkt (POST /admin/anime), kein Duplikat trotz drei UI-Einstiegen"
  - "Episoden-Import ist eine eigenständige Fachaufgabe mit eigener release-nativer Tabellenkette (episodes/release_variants/release_streams) — legitim getrennt vom Anime-Anlegen-Flow, plus ein bisher unerfasster vierter einfacher Episoden-Anlege-Endpunkt (POST /admin/episodes ohne Jellyfin-Bindung)"

requirements-completed: []

# Metrics
duration: ~45min
completed: 2026-10-07
---

# Phase 175 Plan 05: Inventur Fachaufgabe 8+9 (Löschen/Aufräumen, Anime anlegen/importieren) Summary

**Fundstellenbelegte Inventur zweier bisher nicht als eigene F-Nummer vorbereiteter Fachaufgaben: 11 Löschen-Mechanismen (Hard-Delete, Soft-Delete, Status-Tombstone, 2 technische Cleanup-Jobs) über 9 Domänen inkl. eines toten Legacy-Endpunkts und eines mehrdeutigen Routen-Risikos, plus Bestätigung, dass Anime-Anlegen (manuell/Jellyfin/AniSearch) EIN Controller mit EINEM Speicher-Endpunkt ist, während der Episoden-Import eine eigenständige Fachaufgabe mit eigener Tabellenkette bleibt.**

## Performance

- **Duration:** ~45 min (kein expliziter Start-Timestamp erfasst; Schätzung anhand des Rechercheumfangs)
- **Completed:** 2026-10-07
- **Tasks:** 2/2 completed
- **Files created:** 4

## Accomplishments

- Fachaufgabe 8 (Löschen/Aufräumen): Anime, Fansub-Gruppe, Fansub-Mitglied (aktiv + toter Legacy-Pfad), Release-Version-Medien, Gruppenmedien-Galerie, Gruppen-Logo/Banner-Slot, Anime-Asset-Slots, Beitrag/Projektbesetzung sowie zwei dedizierte technische Cleanup-Jobs (Release-Review-Scrub, Theme-Segment-Render-Cache) vollständig mit Datei:Zeile erfasst und klassifiziert.
- Zwei konkrete, bisher unbekannte Befunde dokumentiert: ein toter Lösch-Endpunkt (`DELETE /fansubs/:id/members/:memberId`, kein Frontend-Aufrufer mehr) und ein mehrdeutiges Routen-Design (`DELETE /admin/fansubs/:id/media/:kind` mit zwei Löschsemantiken je Parameterform).
- Fachaufgabe 9 (Anime anlegen/importieren): bestätigt mit Fundstellen, dass manuelles Anlegen, Jellyfin-Import und AniSearch-Import denselben `POST /admin/anime`-Endpunkt über 4 komponierte Sub-Hooks nutzen (kein Duplikat), während der Episoden-Import drei eigene Endpunkte plus einen vierten einfachen Episoden-Anlege-Endpunkt mit eigener release-nativer Tabellenkette hat.
- Rechte-Konsistenz (D-05) für beide Fachaufgaben geprüft: 0 Abweichungen zwischen Anzeige- und Durchsetzungs-Recht gefunden.
- Beide Skripte laufen ohne WARN-Ausgabe und reproduzieren exakt die im jeweiligen Fragment genannten Zahlen.

## Task Commits

1. **Task 1: Fachaufgabe 8 — Löschen / Aufräumen, vollständige Inventur** - `d1c3f8d9` (docs)
2. **Task 2: Fachaufgabe 9 — Anime anlegen / importieren, vollständige Inventur** - `57492a8e` (docs)

_Reine Analyse-Aufgabe (D-01) — keine feat/fix/test-Commits, nur docs-Commits mit den Fragment-Dateien und ihren Zählskripten._

## Files Created/Modified

- `data/08-loeschen-aufraeumen.md` - Vollständige Inventur aller Löschen-/Aufräumen-Mechanismen (9 Fachdomänen + 2 technische Cleanup-Jobs) mit D-03(a)-(f)-Belegen und D-04-Klassifikation
- `scripts/count-08-loeschen-aufraeumen.sh` - Grep-basiertes, rein lesendes Zählskript, reproduziert alle Summenzeilen des Fragments ohne WARN
- `data/09-anime-anlegen-importieren.md` - Vollständige Inventur der drei Anime-Anlege-Wege plus Episoden-Import mit D-03(a)-(f)-Belegen und D-04-Klassifikation
- `scripts/count-09-anime-anlegen-importieren.sh` - Grep-basiertes, rein lesendes Zählskript, reproduziert alle Summenzeilen des Fragments ohne WARN

## Decisions Made

- Löschen/Aufräumen in drei fachlich unterschiedliche Daten-Semantiken sortiert (Hard-Delete / Soft-Delete via `deleted_at` / Status-Tombstone ohne Soft-Delete) statt eines einzigen generischen "Löschen"-Begriffs — notwendig, weil die drei Semantiken bei einer künftigen Zusammenführung unterschiedlich behandelt werden müssen.
- Den gefundenen toten Legacy-Endpunkt (`DeleteFansubMember`/`fansub_members`-Tabelle) explizit als Entfernungs-Kandidat markiert statt ihn stillschweigend mitzuzählen, da er eine abweichende (strengere) Rechte-Logik als der aktiv genutzte Pfad hat und bei einer Zusammenführung sonst versehentlich als "zweite Wahrheit" erhalten bleiben könnte.
- Für Fachaufgabe 9 das 174-REPORT.md-Verdikt ("EIN Controller mit komponierten Sub-Hooks, kein Duplikat") durch eigene Fundstellen-Nachverfolgung bis zum tatsächlich aufgerufenen Endpunkt bestätigt, statt es unbelegt zu übernehmen — beide Create-Funktionen (`createAdminAnime`/`createAdminAnimeFromJellyfinDraft`) wurden bis zur identischen POST-URL verfolgt.
- Den vierten, bisher nicht erfassten `POST /admin/episodes`-Endpunkt (einfache Episodennummer ohne Jellyfin-Bindung) als zusätzlichen Fund dokumentiert, da 174-FOLLOWUPS.md und die Plan-Vorgabe nur drei Episoden-Import-Endpunkte nannten.

## Deviations from Plan

None - plan executed exactly as written. Beide Tasks wurden als reine Lese-Analyse (D-01) ausgeführt, keine Produkt-Code-Änderungen an `frontend/`, `backend/`, `database/` oder `shared/`.

## Known Stubs

None - reine Dokumentations-/Analyse-Artefakte, keine Code-Stubs.

## Threat Flags

None - reine Lese-Analyse (D-01), keine neue Angriffsfläche. Threat-Register des Plans (`T-175-05`) bestätigt: Analyse-Skripte sind nur-lesend (grep/wc), kein Live-Stack-Zugriff.

## Self-Check

```
FOUND: .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/data/08-loeschen-aufraeumen.md
FOUND: .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/scripts/count-08-loeschen-aufraeumen.sh
FOUND: .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/data/09-anime-anlegen-importieren.md
FOUND: .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/scripts/count-09-anime-anlegen-importieren.sh
FOUND commit d1c3f8d9
FOUND commit 57492a8e
```

## Self-Check: PASSED

## Verification

```
$ bash scripts/count-08-loeschen-aufraeumen.sh
Fachdomänen mit Löschen-Mechanismus geprüft (Hard-Delete-Belege): 5 von 5
Soft-Delete-Mechanismen (deleted_at): 2 von 2
FK-Unassign-Familien: 2 von 2
Status-Übergang-Mechanismen (Review-Lifecycle-Tombstone): 1 von 1
Dedizierte technische Cleanup-Jobs: 2 von 2
Orphan-Endpunkt gefunden (DeleteFansubMember ohne Frontend-Aufrufer): 1 von 1
Mehrdeutigkeits-Risiko gefunden (eine Route, zwei Löschsemantiken): 1 von 1

$ bash scripts/count-09-anime-anlegen-importieren.sh
Anlege-Wege für Anime (ein gemeinsamer Speicher-Endpunkt): 3 von 3
Gemeinsamer POST /admin/anime Speicher-Endpunkt bestätigt: 1 (1 = ja)
Sub-Hooks im Create-Controller: 4 von 4
Episoden-bezogene Endpunkte (3 Import + 1 einfach): 4 von 4
Rechte-Vergleichspunkte (Anzeige vs. Durchsetzung): 2 von 2 -- 0 Abweichungen

$ git status --short
 M .planning/sketches/MANIFEST.md
?? .planning/sketches/010-galerie-detailansicht/
```

Beide Skripte laufen ohne WARN-Zeilen. `git status --short` zeigt nach den Task-Commits ausschließlich die bei Session-Start bereits vorhandenen, fremden Sketch-Änderungen (`.planning/sketches/`, nicht angefasst gemäß D-08/D-10) — keine unbeabsichtigten Änderungen an `frontend/`, `backend/`, `database/` oder `shared/`.
