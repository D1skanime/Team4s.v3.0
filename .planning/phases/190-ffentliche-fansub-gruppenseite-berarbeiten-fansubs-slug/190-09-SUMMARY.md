---
phase: 190-ffentliche-fansub-gruppenseite-berarbeiten-fansubs-slug
plan: 09
subsystem: ui
tags: [checkpoint, live-uat, code-review, phase-close]

# Dependency graph
requires: [190-03, 190-04, 190-05, 190-06, 190-08]
provides:
  - "Phase 190 final live-UAT approved across all 21 decisions (D-a through D-u)"
  - "Code review (190-REVIEW.md) completed and all findings fixed or triaged"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Orchestrator-applied live-UAT corrections mid-checkpoint (not through the plan→executor pipeline) for D-h/D-k, documented inline in commit messages and re-verified via Playwright before each re-presentation to the user"

key-files:
  created:
    - frontend/src/app/dev/ui-system/showcase/PublicFansubSurfacesShowcase.fixtures.ts
  modified:
    - frontend/src/components/fansubs/FansubProjectsGrid.tsx
    - frontend/src/components/fansubs/FansubGroupMediaBlock.tsx
    - frontend/src/components/fansubs/FansubPublicSections.module.css
    - frontend/src/components/fansubs/FansubTeamActiveGroup.tsx
    - frontend/src/components/fansubs/FansubTeamHistoricalGroup.tsx
    - frontend/src/components/fansubs/FansubHistorySection.tsx
    - frontend/src/components/fansubs/__tests__/FansubHistorySection.test.tsx
    - frontend/src/app/fansubs/[slug]/page.tsx
    - frontend/src/app/dev/ui-system/showcase/PublicFansubSurfacesShowcase.tsx
    - frontend/src/components/ui/FocalCarousel.tsx
    - frontend/src/components/ui/FocalCarouselInternals.tsx

key-decisions:
  - "D-h required two live-UAT correction rounds beyond the original plan: round 1 (singleItemLayout='grid' prop on FocalCarousel) removed the oversized centering but kept pointless nav arrows; round 2 (user-requested Variante B) bypasses FocalCarousel entirely for exactly one project, reusing the existing .bannerGrid CSS grid. The singleItemLayout prop, having become unused, was fully reverted (not left as dead API surface)."
  - "D-k required two live-UAT correction rounds beyond the original plan: round 1 kept a global media overflow button with per-tile category badges; round 2 switched to per-category pagination (6-item cap, own 'Mehr anzeigen') and removed the now-redundant badge; round 3 fixed a heading-hierarchy regression (category subheadings visually equal to the page's main h2) and a grid-width regression (4-column escalation above 1600px leaving empty space when a category had <4 items) discovered only once the user tested on a screen wider than 1440px."
  - "Phase closeout code review (190-REVIEW.md, deep depth, 26 files) found 0 Critical, 5 Warning, 3 Info findings. All 5 Warnings fixed (React list-key correctness, dead CSS removal, a pre-existing sortHistory comparator bug, missing error logging, a touched-but-unsplit 458-line file). 2 Info items left as-is: IN-01 (minor duplicate-filter refactor, no bug) deferred as low-value; IN-02 (editor role label language) is not a bug -- D-t already explicitly chose 'Editing' over a German word, confirmed against existing codebase convention during the 190-02 checkpoint. One of the review's own Warning findings (WR-02) was independently re-verified before acting on it and found to be partially wrong: 2 of the 8 claimed-dead CSS classes (.sectionTitle, .storyArticle) are actually live via a sharedStyles import alias the review's grep missed -- those 2 were kept, only the other 6 (plus 2 more found independently: .stack, .mediaGrid) were removed."

requirements-completed: [D-m, D-n, D-s]

# Metrics
duration: ~5h (full-phase live-UAT across three checkpoint rounds, code review, fix round, backend+frontend full test gates)
completed: 2026-10-21
---

# Phase 190 Plan 09: Finales Gate, Live-UAT und Phasenabschluss Summary

**Alle 21 Entscheidungen (D-a bis D-u) sind nach drei Live-UAT-Korrekturrunden (Einzelprojekt-Karte, Medien-Pro-Kategorie-Paginierung, Medien-Hierarchie/Rasterbreite) vom Nutzer final abgenommen; anschließender Deep-Code-Review über alle 26 Phasen-Dateien fand 0 kritische, 5 Warnungs- und 3 Info-Befunde, alle 5 Warnungen behoben.**

## Task 1: Automatisiertes Gate vor dem Live-UAT

- `cd frontend && npm test`: grün (ein vereinzelter Timeout-Flake in einem unrelated Test, isoliert erneut grün, nicht durch diese Phase verursacht — zweimal reproduziert über den Verlauf der Phase, jeweils in unterschiedlichen, unrelated Dateien, klassisches Parallel-Last-Timing-Problem dieser Testumgebung).
- `npx tsc --noEmit`: sauber (ein bekannter, vorbestehender, gitignored `.next`-generierter Typfehler in `app/anime/page.ts`, unverändert seit vor Phasenbeginn).
- `npm run lint`: 5 vorbestehende Fehler, alle außerhalb der 26 von dieser Phase berührten Dateien (siehe `deferred-items.md`), alle Phase-190-Dateien selbst lint-clean.

## Task 2: Live-UAT — drei Korrekturrunden, dann Freigabe

### Runde 1 (ursprüngliches Checkpoint-Ergebnis aus den Plänen 190-01 bis 190-08)
Nutzer lehnte zwei Punkte ab:
1. Projektkarten bei genau einem Projekt blieben trotz `singleItemLayout="grid"`-Prop bei 718×404px mit (deaktivierten) Navigationspfeilen — wirkte weiterhin wie ein Karussell.
2. Medien-Kategorien hatten noch ein Badge pro Kachel UND einen globalen "Alle anzeigen"-Button statt Pro-Kategorie-Paginierung.

### Runde 2 (erste Korrektur)
- D-h, Variante B (Nutzerkorrektur nach erstem Korrekturversuch): `FansubProjectsGrid.tsx` umgeht `FocalCarousel` bei genau einem Projekt komplett, nutzt das bereits bestehende `.bannerGrid`-CSS-Raster (240–320px, linksbündig). Mehrere Projekte bleiben unverändert im Karussell. Der dafür eingeführte `singleItemLayout`-Prop auf `FocalCarousel`/`FocalCarouselInternals` wurde dadurch ungenutzt und vollständig zurückgebaut (keine toten Optionen) — beide Dateien sind jetzt wieder deckungsgleich mit ihrem Stand vor Phase 190.
- D-k, zweite Runde: `FansubGroupMediaBlock.tsx` + neue Funktion `previewFansubMediaCategoryGroup` in `fansubMediaPresentation.ts` — jede Kategorie begrenzt sich unabhängig auf 6 Kacheln (2 Zeilen à 3) mit eigenem "Mehr anzeigen"; globaler Overflow-Button entfernt; Kategorie-Badge pro Kachel entfernt (redundant zur Zwischenüberschrift). Raster auf 3 Spalten Desktop umgestellt (analog Release-Raster).

### Runde 3 (zweite Korrektur, nach Live-Prüfung auf einem Bildschirm >1440px)
- Kategorie-Zwischenüberschriften waren optisch gleichrangig mit der Hauptüberschrift "Medien" (gleiche Größe, gleiche kräftige rote Linie) — korrigiert auf 13px/600/`--text-muted` (identisch zu `.subgroupTitle`) mit 1px `--border-subtle`-Linie statt `underline`-Prop, über den bestehenden `titleClassName`-Prop von `SectionHeader`.
- Das 3er-Medien-Raster ließ bei ≥1600px eine leere vierte Spalte, sobald eine Kategorie <4 Elemente hatte (eigene `@media (min-width:1600px)`-Eskalation auf 4 Spalten kollidierte mit der tatsächlichen Elementanzahl) — entfernt, jetzt immer `repeat(3, minmax(0, 1fr))`. Live bei 1440px (3×429px) und 1920px (3×464px) nachgemessen: Summe Kachelbreiten + Abstände = Sektionsbreite, kein Leerraum.

### Finale Freigabe
Nutzer hat das Gesamtbild explizit abgenommen: Kopf ohne Rahmenkarte, Banner wie Projektseite, Status einmal, Releases-/Mitglieder-Labels, Team-Karten, "unbestätigt" in Überschrift, Einzelprojekt als kleine linksbündige Karte bei unverändertem Karussell für mehrere Projekte, Medien nach Kategorien mit kleineren Unterüberschriften, 3er-Raster über volle Breite, Mehr-anzeigen je Kategorie, Geschichte mittig, "Editing"-Label, Kennzahlen mobil nebeneinander.

## Phasenabschluss-Code-Review (nach Nutzerfreigabe, zusätzlich zum Plan beauftragt)

`190-REVIEW.md` (deep depth, 26 Dateien, der komplette Phase-190-Diff inkl. aller drei Korrekturrunden):

| Befund | Schweregrad | Status |
|---|---|---|
| WR-01: React-Keys per `member_display_name` statt `id` | Warning | behoben |
| WR-02: 8 tote CSS-Klassen in `FansubPublicSections.module.css` | Warning | behoben (6 von 8 — 2 vom Review fälschlich als tot gemeldet, selbst gegengeprüft und behalten; zusätzlich 2 weitere tote Klassen selbst gefunden und mitentfernt) |
| WR-03: `sortHistory`-Komparator ungültig bei mehreren jahrlosen Einträgen | Warning | behoben (vorbestehend, nicht durch Phase 190 verursacht, aber in berührter Datei) |
| WR-04: Team-Ladefehler ohne Logging verschluckt | Warning | behoben |
| WR-05: 458-Zeilen-Datei berührt ohne Split | Warning | behoben (aufgeteilt in Komponente + `.fixtures.ts`) |
| IN-01: doppelte Filterlogik in `FansubTeamSection.tsx` | Info | nicht behoben (kein Bug, geringer Wert, bewusst zurückgestellt) |
| IN-02: `editor`-Rollenlabel "Editing" nicht deutsch | Info | nicht behoben (keine Lücke — D-t hat "Editing" bereits bewusst gewählt, siehe 190-02-SUMMARY.md) |
| IN-03: Showcase-Fixture-Kommentar | Info | geringe Priorität, nicht behoben |

Alle Fixes einzeln committed, UI-berührende Fixes (WR-01, WR-02, WR-03) im Commit-Text als solche markiert. Vollständiger Frontend-Testlauf danach erneut grün (400/401 Dateien, 3670 Tests), Typecheck sauber, Container neu gestartet, Live-Stichprobe fehlerfrei.

## Backend-Testlauf (wegen Migration 0186)

`bash scripts/test-backend.sh`: **GATE: GREEN** — 2345 PASS, 0 FAIL, 27 Wegwerf-Datenbanken angelegt und abgebaut, Phase-134-Matrix-Cluster erfolgreich bereitgestellt, keine Suite stillschweigend übersprungen. `TestPublicNoteRoleCode`-Suite (betrifft `role_definitions.label_de`) bestätigt grün.

## Self-Check: PASSED

Alle Commits der Phase (190-01 bis 190-09 inkl. aller Korrekturrunden und des Review-Fix-Rounds) in `git log --oneline` bestätigt. Keine offenen Änderungen im Arbeitsverzeichnis.

---
*Phase: 190-ffentliche-fansub-gruppenseite-berarbeiten-fansubs-slug*
*Completed: 2026-10-21*
