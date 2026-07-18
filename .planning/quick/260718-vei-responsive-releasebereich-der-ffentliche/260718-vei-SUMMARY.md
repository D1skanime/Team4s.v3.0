---
quick_task: 260718-vei
status: complete
subsystem: ui
tags: [frontend, responsive, fansub-projektseite, releases, accordion]
requires:
  - quick_task: 260718-2w4
    provides: "Bestehende PublicReleaseBlock- und OlderReleasesList-Seams mit exklusiven Mobile-/Desktop-Renderzweigen"
provides:
  - "Featured Release mit nutzerorientierter Hierarchie, 16:9-Inhaltsbild und mobiler Aktionsreihenfolge"
  - "Alle-Releases-Liste mit direkter Ansicht-Aktion und kombinierter Kara-Anzahl/Disclosure"
affects: [public-fansub-project, public-release-ui]
tech-stack:
  added: []
  patterns:
    - "Container-responsive PublicReleaseBlock-Komposition bis 820px"
    - "Kara-Anzahl direkt im bestehenden Accordion-Titel statt separatem Badge"
key-files:
  created: []
  modified:
    - "frontend/src/components/fansubs/PublicReleaseBlock.tsx"
    - "frontend/src/components/fansubs/PublicReleaseBlock.module.css"
    - "frontend/src/components/fansubs/__tests__/PublicReleaseBlock.test.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.rows.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.module.css"
    - "frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.test.tsx"
key-decisions:
  - "PublicReleaseBlock und OlderReleasesList bleiben die einzigen Release-Seams; keine neue Komponente, API-Logik oder Routing-Logik wurde eingeführt."
  - "Die Responsive-Umschaltung der Featured Card folgt der Containerbreite bei 820px; layout=mobile konsumiert dieselben Strukturregeln."
  - "Lange Bildbeschreibungen werden nicht als Preview-Badge gerendert; nur kurze Kategorie-Labels bis 40 Zeichen bleiben sichtbar."
requirements-completed: [LR-01, LR-02, LR-03, LR-04, LR-05, LR-06, LR-07, LR-08, LR-09, LR-10]
metrics:
  duration: "25min"
  started: "2026-07-18T20:46:36Z"
  completed: "2026-07-18T21:11:45Z"
---

# Quick Task 260718-vei: Responsiver Releasebereich der öffentlichen Fansub-Projektseite

**Die Release-Oberfläche ist responsiv gehärtet und bei 390, 768, 1024 und 1440 px live im Codex-In-App-Browser verifiziert.**

## Status

- **Task 1:** abgeschlossen und committed
- **Task 2:** abgeschlossen und committed
- **Task 3:** automatisierte Gates, Diff-Review und Live-UAT abgeschlossen
- **Gesamt:** 3/3 Tasks vollständig abgeschlossen

## Geänderte Abschnitte

- `PublicReleaseBlock`: Standardheader auf „Neuestes Release“ gesetzt, technische Standardbeschreibung entfernt, CTA vor Vorschauen/Notizen verschoben und vorhandene Kara-Links um einen mobilen Play-Hinweis ergänzt.
- `PublicReleaseBlock.module.css`: Featured-Bild als 16:9-Inhaltsbild fixiert, 40/60-Desktopaufteilung erhalten, einspaltige 820px-Containerregel, vollbreiter Mobile-CTA, vertikale Kara-Aktionen, Preview-Ausblendung und Note-Line-Clamp ergänzt.
- Bildvorschauen zeigen nur kurze Kategorie-Labels; lange Beschreibungen bleiben auf der Detailseite und überdecken keine Thumbnails mehr.
- `OlderReleasesList`: Abschnitt exakt „Alle Releases“ benannt; Cursor-Laden, Limits, Sortierung sowie Loading-/Error-States unverändert gelassen.
- `OlderReleasesList.rows`: separaten Kara-Badge entfernt und Accordion-Titel auf „1 Kara anzeigen“ beziehungsweise „N Karas anzeigen“ umgestellt; bestehende Ansicht- und Kara-Hrefs unverändert beibehalten.
- Fokussierte Tests sichern Headerhierarchie, DOM-Reihenfolge, Hrefs, Responsive-CSS und Mobile-/Desktop-Listenverhalten ab.

## Task Commits

1. `9810d258` — `feat(quick-260718-vei): harden featured release layout`
2. `3f94535e` — `feat(quick-260718-vei): simplify responsive release rows`
3. `a6eeb37c` — `fix(quick-260718-vei): align live responsive breakpoints`

## Dateien geändert

- `frontend/src/components/fansubs/PublicReleaseBlock.tsx`
- `frontend/src/components/fansubs/PublicReleaseBlock.module.css`
- `frontend/src/components/fansubs/__tests__/PublicReleaseBlock.test.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.rows.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.module.css`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.test.tsx`

Keine Backend-, API-, DTO-, Auth-, Permission-, Migrations- oder Media-Ownership-Datei wurde geändert.

## Checks

- `cd frontend && npx vitest run "src/components/fansubs/__tests__/PublicReleaseBlock.test.tsx" "src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx" "src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.test.tsx"` — **14/14 grün**
- `cd frontend && npm run typecheck` — **grün**
- Fokussiertes ESLint für alle geänderten TSX-/Testdateien — **grün**
- `cd frontend && npm run lint` — **projektweit fehlgeschlagen** an einem vorbestehenden, unberührten Fehler in `frontend/src/components/fansubs/FansubStorySection.tsx:49` (`react-hooks/set-state-in-effect`); die Zeile ist bereits in Start-HEAD `42b41981` vorhanden, letzter Touch `1e26cc64`.
- `git diff --check` und `git diff --check 42b41981..HEAD` — **grün**
- `GET http://127.0.0.1:3000/fansubs/c-subs/fansubprojekt/vipers-creed` — **HTTP 200**, Seedroute ist erreichbar.

## Live-Responsive-UAT

Geprüfte Route: `http://127.0.0.1:3000/fansubs/c-subs/fansubprojekt/vipers-creed`

| Viewport | Status | Ergebnis |
| --- | --- | --- |
| 390px | **BESTANDEN** | Einspaltige Card, 16:9-Inhaltsbild, vertikale Kara-Aktionen, CTA vor Notizen, direkte „Ansicht“-Aktion und kein horizontaler Release-Überlauf. |
| 768px | **BESTANDEN** | Einspaltige Card mit 16:9-Bild, ausgeblendete kleine Previews und vollständig lesbare Aktionen. |
| 1024px | **BESTANDEN** | Kontrollierte 40/60-Aufteilung; gemessene Bildgröße 343×193 px (1,78), Previews ausgeblendet, Timeline ohne Überlagerung. |
| 1440px | **BESTANDEN** | Kontrollierte 513/739-px-Aufteilung; Bild 513×289 px (1,78), drei saubere Thumbnails ohne lange Overlay-Texte und klare Hierarchie „Neuestes Release“ → „Alle Releases“. |

Live-Zielprüfungen bestanden:

- Featured-CTA → `/fansubs/c-subs/fansubprojekt/vipers-creed/releases/1`
- erste direkte „Ansicht“-Aktion → `/fansubs/c-subs/fansubprojekt/vipers-creed/releases/1`
- Kara „Viper's Creed OP“ → `/fansubs/c-subs/fansubprojekt/vipers-creed/releases/1?kara=1&autoplay=1#op-ed-middle`

## Deviations from Plan

Die erste Live-UAT zeigte zwei Abweichungen: Die reale Cardbreite lag bei 1024 px mit 897 px knapp unter dem geplanten 900-px-Containerwert, und lange Bildbeschreibungen erschienen weiterhin als ellipsierte Badges. Der Breakpoint wurde deshalb evidenzbasiert auf 820 px gesetzt und lange Labels werden vollständig unterdrückt. Beide Korrekturen sind durch den Commit `a6eeb37c`, einen zusätzlichen Test und die erneute Vier-Viewport-UAT abgesichert.

## Known Stubs

- Die beiden `/covers/placeholder.jpg`-Werte in `PublicReleaseBlock.test.tsx` sind absichtliche, bereits vorhandene Test-Fixtures und fließen nicht in die Produkt-UI.

## Threat Flags

Keine. Es wurden keine neuen Endpunkte, Auth-Pfade, Dateizugriffe, Schemas oder Trust Boundaries eingeführt. Bestehende Release- und Kara-Routen werden unverändert verwendet.

## Verbleibende Risiken

- Der projektweite Lint-Fehler in `FansubStorySection.tsx:49` ist unabhängig von diesem Quick Task und wurde gemäß Scope-Regel nicht behoben.
- Außerhalb des Releasebereichs vergrößert der bestehende, transformierte Hero-Backdrop bei 1024/1440 px die dokumentweite Scrollbreite. Der Releasebereich selbst verursacht keinen Überlauf; der Hero gehört nicht zum Scope dieses Quick Tasks.

## Self-Check: PASSED (für implementierten Scope)

- Alle acht gelisteten Code-/Testdateien existieren.
- Commits `9810d258`, `3f94535e` und `a6eeb37c` sind in `git log` vorhanden.
- Keine unerwarteten Löschungen oder ungetrackten Runtime-Artefakte wurden erzeugt.
- Alle gelockten Anforderungen LR-01 bis LR-10 sind erfüllt.
