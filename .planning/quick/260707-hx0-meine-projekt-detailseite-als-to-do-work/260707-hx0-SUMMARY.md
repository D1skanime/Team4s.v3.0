---
phase: quick-260707-hx0
plan: 01
subsystem: ui
tags: [react, nextjs, vitest, todo-workspace, fansub-contributions]

requires: []
provides:
  - Persönliche Projekt-Detailseite (/me/projects/[animeId]/group/[fansubGroupId]) als echter To-Do-Workspace mit Alle/Offen/Erledigt-Filter
affects: [me-projects, contributions]

tech-stack:
  added: []
  patterns:
    - "Basisfilter zuerst auf has_own_contribution, danach Modus-Filter (open/done via has_own_notes || has_own_media), danach Suche"
    - "Stabiler Array.sort() fuer Gruppen-Sortierung ohne separaten Sortier-Schluessel"

key-files:
  created: []
  modified:
    - "frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx"
    - "frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/project.module.css"
    - "frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx"

key-decisions:
  - "ReleaseFilterMode von 'mine'|'all' auf 'all'|'open'|'done' umgestellt; Default-Modus bleibt 'all'"
  - "isDone(release) = has_own_notes || has_own_media als gemeinsamer Helfer fuer Filter, Sortierung, Badge und Zaehlung"
  - "releaseRowMuted-CSS-Klasse entfernt statt nur ungenutzt zu belassen (Grep bestaetigte keine weiteren Referenzen)"

patterns-established:
  - "Modus-spezifische Leerzustaende: Reihenfolge assignedCount===0 -> aktive Suche ohne Treffer -> modus-spezifisch -> generischer Fallback"

requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-06, D-07]

duration: 15min
completed: 2026-07-07
---

# Quick Task 260707-hx0: Meine-Projekt-Detailseite als To-Do-Workspace Summary

**Projekt-Detailseite `/me/projects/[animeId]/group/[fansubGroupId]` von Mine/Alle-Umschalter zu echtem Alle/Offen/Erledigt-To-Do-Workspace mit Status-Badges umgebaut.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2 (Filterlogik + UI-Umbau)
- **Files modified:** 3

## Accomplishments
- Basisliste zeigt nur noch Folgen mit `has_own_contribution=true` in allen drei Modi
- Segmented Control mit drei Modi (Alle/Offen/Erledigt) ersetzt den alten Mine/Alle-Umschalter
- Im Modus "Alle" stehen offene Folgen (stabil sortiert) vor erledigten
- Jede sichtbare Folge zeigt einen `Badge` aus `@/components/ui` (variant `warning`/`success`) fuer Offen/Erledigt
- Folgen-Nummer-Suche funktioniert jetzt in allen drei Modi statt nur im bisherigen "all"-Modus
- SectionHeader-Beschreibung zeigt `"{offen} offen · {erledigt} erledigt"` zugeordneter Folgen statt Gesamtzahl aller Release-Versionen
- Drei eigene, deutsche Leerzustaende: keine Zuordnung, Modus Offen leer, Modus Erledigt leer

## Task Commits

Beide Tasks wurden in einem gemeinsamen atomaren Commit umgesetzt, da beide Tasks denselben `page.tsx`-Bereich in fortlaufender Bearbeitung veraendert haben und die Verifikation (Vitest + tsc) erst nach Abschluss beider Tasks sinnvoll gemeinsam lief:

1. **Task 1 + Task 2: Filterlogik/Sortierung + UI-Umbau (Segmented Control, Badge, Header, Leerzustaende)** - `e02b5c8f` (feat)

_Abweichung von der Standard-Ein-Commit-pro-Task-Regel: Task 1 (Filterlogik) und Task 2 (UI) teilen sich denselben Datei-Bereich; ein Zwischencommit nach Task 1 haette UI-Tests (Offen/Erledigt-Buttons noch nicht vorhanden) fehlschlagen lassen, waehrend die Kernfilterlogik bereits korrekt war. Beide Tasks wurden vollstaendig implementiert und gemeinsam verifiziert (15/15 Tests gruen, tsc fehlerfrei), bevor committet wurde._

**Plan metadata:** wird vom Orchestrator committet (SUMMARY.md, STATE.md)

## Files Created/Modified
- `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx` - Filterlogik (`filterReleases`, `isDone`), Modus-State, Segmented Control, Badge-Anzeige, SectionHeader-Zaehlung, Leerzustaende
- `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/project.module.css` - `releaseRowMuted` entfernt, `.releaseMain` auf Flex mit Badge-Gap umgestellt
- `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx` - Tests fuer alle drei Modi, Sortierung, Suche in allen Modi, Badges, drei Leerzustaende, neue Header-Beschreibung (15 Tests gesamt, alle gruen)

## Decisions Made
- `isDone()` als einzige Quelle der Wahrheit fuer "erledigt" (has_own_notes || has_own_media), von Filter, Sortierung, Badge und Zaehlung gemeinsam genutzt, um Drift zu vermeiden
- Stabiler `Array.prototype.sort()` mit `Number(isDone(a)) - Number(isDone(b))` fuer Offen-vor-Erledigt-Sortierung im Alle-Modus, da JS-`sort` garantiert stabil ist und die Backend-Sortierung nach `episode_sort_index` innerhalb der Gruppen erhaelt
- `releaseRowMuted` aus dem CSS-Modul entfernt (nicht nur aus page.tsx), da Grep keine weiteren Referenzen fand

## Deviations from Plan

None - plan wurde inhaltlich exakt wie geschrieben umgesetzt. Einzige prozedurale Abweichung: gemeinsamer statt getrennter Commit fuer Task 1/2 (siehe Task Commits oben), aus Verifikations-Praktikabilitaet, keine inhaltliche Abweichung vom Plan.

## Issues Encountered
- Erster Testlauf fuer den Badge-Test schlug fehl, weil `getAllByText('Offen')` sowohl den Segmented-Control-Button als auch das Badge traf (2 statt 1 Treffer). Behoben durch Filterung auf `tagName === 'SPAN'` im Test, um gezielt das Badge-Element zu treffen.

## User Setup Required

None - keine externe Service-Konfiguration noetig.

## Next Phase Readiness
- Reine Frontend-Aenderung, kein Backend-/DB-Change noetig
- Orchestrator muss `docker restart team4sv30-frontend` + Strg+F5 ausfuehren, da Turbopack-HMR auf Port 3000 nicht zuverlaessig greift (siehe Projekt-Memory `testing_live_dev_server`)
- Live-Verifikation der drei Filter-Modi, Badges und Leerzustaende auf `/me/projects/[animeId]/group/[fansubGroupId]` empfohlen

---
*Phase: quick-260707-hx0*
*Completed: 2026-07-07*

## Self-Check: PASSED

All files and commit hash verified present on disk / in git log.
