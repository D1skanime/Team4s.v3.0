---
phase: 73-public-fansub-page-fansubs-slug-erweitern
plan: "06"
subsystem: frontend-public-fansub
tags: [css, responsive, hero-banner, gap-closure]
dependency_graph:
  requires: []
  provides: [heroBanner-overflow-fix, heroBannerImage-object-position-fix]
  affects: [FansubHeroSection, public-fansub-slug-page]
tech_stack:
  added: []
  patterns: [CSS-object-position, CSS-overflow-hidden]
key_files:
  modified:
    - frontend/src/app/fansubs/[slug]/page.module.css
decisions:
  - overflow:hidden am .heroBanner-Container behebt Mobile-Overflow ohne Eingriff in FansubHeroSection.tsx
  - object-position:center top entspricht dem Admin-Edit-Muster (FansubEdit.module.css)
metrics:
  duration: 5min
  completed: 2026-06-07
  tasks_completed: 1
  files_modified: 1
---

# Phase 73 Plan 06: Hero-Banner Overflow und Object-Position Fix Summary

**One-liner:** `overflow:hidden` am `.heroBanner`-Container + `object-position:center top` an `.heroBannerImage` behebt Mobile-Overflow (UAT-13) und falsche Banner-Ausrichtung auf der öffentlichen Fansub-Seite.

## Tasks

| # | Name | Status | Commit |
|---|------|--------|--------|
| 1 | heroBannerImage in page.module.css responsiv machen | DONE | siehe unten |

## Änderungen im Detail

### `frontend/src/app/fansubs/[slug]/page.module.css`

**`.heroBanner`:** `overflow: hidden` hinzugefügt — verhindert, dass ein Next.js `fill`-Bild bei schmalen Viewports (375px) horizontal überläuft.

**`.heroBannerImage`:** `object-position: center` → `object-position: center top` — entspricht dem Admin-Edit-Muster aus `FansubEdit.module.css` (`.fansubEditBannerImageElement`); Bild wird von oben nach unten cropped, kein Abschnitt des Banner-Kopfes.

**Nicht verändert:**
- `FansubHeroSection.tsx` — `fill` + `sizes` waren bereits korrekt
- Media-Query-Override `@media (max-width: 767px)` `.heroBanner { min-height: 112px }` bleibt erhalten
- `FansubGroupMediaBlock.tsx` — gehört ausschließlich zu Plan 73-09

## Deviations from Plan

None — Plan exakt wie beschrieben ausgeführt.

## Known Stubs

None.

## Threat Flags

None — reine CSS-Änderung, keine Daten- oder Auth-Grenze.

## Test Notes

Automatisierte Tests (vitest/tsc) konnten lokal nicht ausgeführt werden (node_modules nicht installiert in diesem Checkout). Verifikation durch Code-Lesen:
- `.heroBanner` enthält `overflow: hidden` ✓
- `.heroBannerImage` enthält `object-position: center top` ✓
- `sizes`-Attribut in `FansubHeroSection.tsx` unverändert ✓
- Mobile Media-Query bleibt erhalten ✓

Live-Verifikation erfolgt durch den Nutzer auf Dev-Server :3000 bei `/fansubs/animeownage` auf 375px Viewport (DevTools → iPhone SE).

## Self-Check: PASSED

- [x] `frontend/src/app/fansubs/[slug]/page.module.css` existiert und enthält `overflow: hidden` in `.heroBanner`
- [x] `frontend/src/app/fansubs/[slug]/page.module.css` enthält `object-position: center top` in `.heroBannerImage`
- [x] `FansubHeroSection.tsx` wurde nicht verändert
- [x] `FansubGroupMediaBlock.tsx` wurde nicht verändert
