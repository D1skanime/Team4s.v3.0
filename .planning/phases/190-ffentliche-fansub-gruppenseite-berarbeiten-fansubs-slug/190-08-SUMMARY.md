---
phase: 190-ffentliche-fansub-gruppenseite-berarbeiten-fansubs-slug
plan: 08
subsystem: ui
tags: [checkpoint, css, hero-metrics, mobile]

# Dependency graph
requires: [190-07]
provides:
  - "HeroMetrics mobile layout revised: side-by-side equal-width columns at <=767px, 2-column wrap with last-odd-item full span below 340px, inline variant fully excluded again"
affects: [190-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS :last-child:nth-child(odd) + grid-column:1/-1 to prevent an orphaned single item on the last row of a 2-column grid without JS or knowing the item count in advance"
    - ":not(.heroMetricsInline) scoping to keep a shared component's variant-specific CSS block fully isolated from a later, broader selector added for the default variant"

key-files:
  created: []
  modified:
    - frontend/src/components/ui/HeroMetrics.module.css

key-decisions:
  - "First checkpoint round (per-item full-width stacking from 190-07) was explicitly REJECTED by the user as consuming too much mobile screen height. Revised to side-by-side equal columns, only wrapping below 340px, never orphaning a single item."
  - "190-07's flex:1 1 140px rule had an unintended side effect: it also applied to .heroMetricsInline's items (ProjectMemberHero), which the user wanted left untouched. Fixed by scoping the new rules with :not(.heroMetricsInline)."

requirements-completed: [D-u]

# Metrics
duration: ~50min (first checkpoint round, revision, Playwright re-verification, second checkpoint round)
completed: 2026-10-21
---

# Phase 190 Plan 08: Live-Mobil-Sweep HeroMetrics (D-u) — zwei Checkpoint-Runden Summary

**Erste Checkpoint-Runde (per-Item-volle-Zeile) vom Nutzer abgelehnt; CSS auf "nebeneinander, gleiche Spaltenbreite, erst <340px umbrechen" revidiert und am zweiten Durchlauf vom Hauptagenten per Playwright bei 375px und 320px an allen prüfbaren Stellen bestätigt.**

## Runde 1 — Live-Sweep des 190-07-Ergebnisses (vom Hauptagenten vorab verifiziert)

5 von 6 Stellen direkt per Playwright bei 375px geprüft (HTTP 200, keine Page-Errors):
`ProjectStats` (`/anime/2/group/26`), `FansubHeroSection` (`/fansubs/new-subs`),
`MemberProfileHero` (`/members/timer`), `ProjectMemberHero` (`/fansubs/strawhat-subs/
fansubprojekt/11eyes/mitwirkende/founder`), `dev/ui-system`-Showcase. `DashboardMetrics`
(`/me/dashboard`) verlangt Login, nicht automatisiert prüfbar.

**Nutzer-Entscheidung Runde 1:** Lösung ABGELEHNT — jede Kennzahl auf eigener vollen Zeile
verbraucht "fast einen halben Handy-Bildschirm". Neue Anforderung: Kennzahlen bei 375px
NEBENEINANDER in einer Zeile, gleich breite Spalten (Bezeichnung darf in der Spalte umbrechen);
erst bei mehr Kennzahlen als nebeneinander passen (Beispiel: >3 bzw. <340px) gleichmäßig auf eine
zweite Zeile umbrechen, nie eine einzelne verwaiste Kennzahl. Zentral in `HeroMetrics`. Inline-
Variante (`ProjectMemberHero`) unverändert lassen. `DashboardMetrics` als "ok" gewertet (Admin ohne
Mitgliedsprofil, nicht prüfbar, gleiche Komponente wie die fünf bestätigten Stellen).

## Revision (durchgeführt vom Hauptagenten, nicht per Subagent delegiert)

`frontend/src/components/ui/HeroMetrics.module.css`:

- `@media (max-width: 767px)`: `.heroMetrics:not(.heroMetricsInline)` erhält `flex-wrap: nowrap`;
  `.heroMetrics:not(.heroMetricsInline) .heroMetricItem` erhält `flex: 1 1 0; min-width: 0;` —
  beliebig viele Kennzahlen teilen sich die Zeile gleichmäßig, solange sie in einer Zeile bleiben
  (ersetzt die 190-07-Regel `flex: 1 1 140px`, die zum vollen Zeilenumbruch pro Item führte).
- NEU `@media (max-width: 339px)`: `.heroMetrics:not(.heroMetricsInline)` wechselt zu `display:
  grid; grid-template-columns: repeat(2, 1fr);`; `.heroMetrics:not(.heroMetricsInline)
  .heroMetricItem:last-child:nth-child(odd) { grid-column: 1 / -1; }` — bei ungerader Anzahl
  spannt die letzte Kennzahl beide Spalten (volle Breite auf eigener Zeile statt schmal/verwaist
  links).
- `:not(.heroMetricsInline)`-Scoping behebt zugleich einen unbeabsichtigten Nebeneffekt von
  190-07: dessen `.heroMetricItem { flex: 1 1 140px }` ohne Scoping betraf auch
  `.heroMetricsInline .heroMetricItem` (da keine eigene `flex`-Regel dort existierte) und ließ
  `ProjectMemberHero` ungewollt mitumbrechen — jetzt wieder vollständig ausgenommen.

**Verifikation vor Commit:** `HeroMetrics.test.tsx` (5/5 grün), `tsc --noEmit` sauber, voller
`npm test` im Container (400 Dateien, 3661 Tests, 0 Fehler).

## Runde 2 — erneuter Live-Sweep bei 375px UND 320px (vom Hauptagenten durchgeführt)

| Stelle | 375px | 320px |
|---|---|---|
| `new-subs` (Gruppenseite, 3 Werte) | **ok** — alle drei in einer Zeile, gleiche Breite (54.6px je) | **ok** — 2+1-Umbruch, dritter Wert spannt volle Breite (165.7px statt 71.8px je Spalte) |
| `strawhat-subs` (Gruppenseite, 3 Werte) | **ok** — eine Zeile | **ok** — 2+1-Umbruch, kein Verwaisen |
| `dragon-subs` (Gruppenseite, 3 Werte) | **ok** — eine Zeile | **ok** — 2+1-Umbruch, kein Verwaisen |
| `11eyes` (Projektseite, `ProjectStats`, 2 Werte) | **ok** — eine Zeile, 50/50 | **ok** — bleibt eine Zeile (2 Werte passen immer in 2 Spalten) |
| `timer` (`MemberProfileHero`, 1 Wert) | **ok** — unverändert | **ok** — unverändert |
| `dev/ui-system`-Showcase (3 Werte) | **ok** — eine Zeile | **ok** — 2+1-Umbruch |
| `ProjectMemberHero` (Inline-Variante, 3 Werte, zusätzlich vom Hauptagenten spontan gegengeprüft, nicht Teil der Nutzerliste) | **ok** — unverändert, eine Zeile mit Punkt-Trennern (190-07-Nebeneffekt behoben) | **ok** — unverändert |
| `DashboardMetrics` (`/me/dashboard`) | als „ok" gewertet (Nutzerentscheidung, nicht prüfbar) | — |

Alle Aufrufe HTTP 200. Eine wiederkehrende CORS-Konsolenwarnung bei `/anime/2/group/26` (anderer
Fetch, `release-list`-Endpunkt) ist umgebungsbedingt (Hostname-Mismatch des Testzugriffs über
`127.0.0.1` statt der konfigurierten Origin) und nicht Teil von D-u/HeroMetrics — unverändert seit
Runde 1, kein neuer Befund.

## Nutzerfreigabe

Zweite Runde freigegeben. Checkpoint abgeschlossen. Wave 5 (Plan 190-09, finales Gate + Live-UAT)
darf beginnen.

## Self-Check: PASSED

CSS-Änderung committed (`7479a1021`), Frontend-Container neu gestartet, voller Testlauf grün vor
dem Commit, Live-Nachprüfung bei zwei Viewport-Breiten (375px, 320px) über sieben Stellen
durchgeführt und dokumentiert.

---
*Phase: 190-ffentliche-fansub-gruppenseite-berarbeiten-fansubs-slug*
*Completed: 2026-10-21*
