---
phase: 73-public-fansub-page-fansubs-slug-erweitern
plan: 13
subsystem: frontend-fansub-public
tags: [edge-fill, banner, client-component, css-module, gap-closure]
dependency_graph:
  requires: ["73-12"]
  provides: ["FansubBannerDisplay", "edge-fill-public-banner"]
  affects: ["frontend/src/components/fansubs/FansubHeroSection.tsx"]
tech_stack:
  added: []
  patterns: ["canvas edge-sampling", "ResizeObserver", "CSS-Module colocated"]
key_files:
  created:
    - frontend/src/components/fansubs/FansubBannerDisplay.tsx
    - frontend/src/components/fansubs/FansubBannerDisplay.module.css
  modified:
    - frontend/src/components/fansubs/FansubHeroSection.tsx
    - frontend/src/app/fansubs/[slug]/page.module.css
decisions:
  - "FansubBannerDisplay kapselt Edge-Fill-Logik als eigenständige Client-Komponente — FansubHeroSection bleibt Server Component"
  - "Canvas-basierte Pixel-Extraktion mit crossOrigin='anonymous' für öffentliche Banner-URLs"
  - "Tote CSS-Regeln .heroBanner/.heroBannerImage vollständig entfernt statt auskommentiert"
metrics:
  duration: "8min"
  completed_date: "2026-06-07"
  tasks: 2
  files: 4
---

# Phase 73 Plan 13: FansubBannerDisplay Edge-Fill Client-Komponente Summary

**One-liner:** Canvas-basierte Edge-Fill-Seitenstreifen für öffentliche Fansub-Hero-Banner als wiederverwendbare Client-Komponente, visueller Gleichstand mit Admin-Edit-Seite.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | FansubBannerDisplay Client-Komponente + CSS-Module erstellen | 35e08a54 | FansubBannerDisplay.tsx, FansubBannerDisplay.module.css |
| 2 | FansubHeroSection auf FansubBannerDisplay umstellen + CSS bereinigen | 44b54d71 | FansubHeroSection.tsx, page.module.css |
| 3 | checkpoint:human-verify | — | Live-Verifikation durch Orchestrator |

## What Was Built

**FansubBannerDisplay.tsx** — neue Client-Komponente (`'use client'`) die:
- `createBannerEdgeFillDataURL` extrahiert 1–3px Farbstreifen vom linken/rechten Bildrand via Canvas-API
- `loadBannerEdgeFills` lädt das Banner asynchron mit `crossOrigin='anonymous'` und gibt beide Data-URLs zurück; bei Fehler `null`
- `useEffect 1` reagiert auf `bannerURL`-Änderungen und lädt Fills, mit Active-Flag zum Verhindern veralteter State-Updates
- `useEffect 2` misst via ResizeObserver + window resize die Seitenbreiten; passt dynamisch `bannerSideWidths` an
- `showBannerSideFills`-Schwellwert: `> 12px` auf einer Seite aktiviert Streifen + EdgeFade-Overlay
- Render-Struktur: Shell → linker Streifen → rechter Streifen → EdgeFade → zentriertes Bild (gleiche DOM-Hierarchie wie Admin-Edit)

**FansubBannerDisplay.module.css** — exakte Übernahme der CSS-Werte aus `FansubEdit.module.css`:
- `.bannerShell` mit `overflow: hidden; isolation: isolate`
- `.bannerSideFill` mit mask-image Verlauf für Links/Rechts-Richtung
- `.bannerEdgeFade` mit zweischichtigem Overlay-Verlauf
- `@media (max-width: 900px)`: Streifen + EdgeFade ausgeblendet, Bild auf volle Breite skaliert

**FansubHeroSection.tsx** — `fill`-Image-Block durch `<FansubBannerDisplay bannerURL={...} altText={...} />` ersetzt; bleibt Server Component ohne `'use client'`.

**page.module.css** — `.heroBanner` + `.heroBannerImage` (inkl. mobile @media-Einträge) vollständig entfernt.

## Live-Verifikation (Checkpoint Task 3)

Vom Orchestrator durchzuführen:
1. http://localhost:3000/fansubs/animeownage — Banner un-gecroppt mit Seitenstreifen prüfen
2. DevTools auf 375px — Streifen ausgeblendet, kein horizontaler Scroll
3. Vergleich mit http://localhost:3000/admin/fansubs/88/edit — visueller Gleichstand bestätigen

## Deviations from Plan

Keine — Plan wurde exakt wie beschrieben ausgeführt.

## Known Stubs

Keine. Alle Datenquellen sind verdrahtet; `bannerURL` kommt vom Server über `resolveApiUrl`.

## Threat Flags

Keine neuen Netzwerk-Endpunkte oder Auth-Pfade eingeführt. Canvas-Extraktion bleibt rein client-seitig. T-73-13-02 (onerror → resolve(null)) ist implementiert — Komponente rendert ohne Fills bei Ladefehler.

## Self-Check: PASSED

- FOUND: frontend/src/components/fansubs/FansubBannerDisplay.tsx
- FOUND: frontend/src/components/fansubs/FansubBannerDisplay.module.css
- FOUND: commit 35e08a54 (Task 1)
- FOUND: commit 44b54d71 (Task 2)
- tsc --noEmit: keine Fehler
