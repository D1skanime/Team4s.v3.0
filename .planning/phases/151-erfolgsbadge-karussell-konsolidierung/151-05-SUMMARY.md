---
phase: 151-erfolgsbadge-karussell-konsolidierung
plan: 05
status: complete
subsystem: ui-evidence
tags: [dev-gallery, playwright, browser-matrix, visual-signoff]
requires: [151-01, 151-02, 151-03, 151-04]
provides:
  - Verlinkte Dev-Galerie mit allen 84 produktiven Kompositionen und 113 Quelldateien
  - Playwright-Collector mit Struktur-, Geometrie-, Eingabe- und Performance-Gates
  - Vollstaendige Browsermatrix und zeilenweise Sichtabnahme
---

# Phase 151 Plan 05: Integration, Browsermatrix und Sichtabnahme

## Completed

- `/dev/ui-system/achievements` ist von `/dev/ui-system` verlinkt und rendert ausschliesslich
  Produktionskomponenten (`AchievementArtwork`, `RoleAchievementCard`, `MemberBadgeChain`,
  Familien-Stages) ueber `RoleCatalogProvider` mit serverfoermigen Fixtures. Keine Produktnavigation,
  kein Auth-, API-, DTO- oder Schwellenwert-Seam.
- Die Galerie deckt 12 Rollen x 5 Stufen, alle Nicht-Rollen-Familien (Punkte, Mitgliedschaft,
  Contribution, Anime-Projekt, historisch/speziell), aktive/inaktive/gesperrte/expandierte Zustaende,
  Container-Sonden (561/562/657/658), schmale Einbettung und 100/200-Stressfaelle ab.
- `frontend/scripts/capture-phase151-badge-evidence.mjs` (plus die beiden privaten Module) sammelt
  Kontaktboegen, Einzel-Crops, Screenshots und Maschinen-Manifeste und faellt bei Struktur-,
  Geometrie-, Eingabe- oder Performanceverstoessen hart durch.

## Finaler Collector-Lauf

`docker compose exec -T team4sv30-frontend node scripts/capture-phase151-badge-evidence.mjs
--base-url http://127.0.0.1:3000 --out-dir /tmp/team4s-phase151-final-review-2`

- **`pass: true`, 0 Findings, 0 Browserfehler** (keine pageerror, console-error, requestfailed oder HTTP >= 400).
- 16/16 Matrixzeilen: 320x568, 390x844, 520x900, 768x1024, 1024x768, 1440x900, 1920x1080, 2560x1440 —
  jeweils in `normal` und `reduced motion`, je Zeile Galerie- und Profil-Screenshots.
- Container-Grenzen exakt: 561 -> Hero 192 / Marker 64; 562 -> 216 / 80; 657 -> 216 / 80; 658 -> 240 / 80.
  Schmale Einbettung (320er Container in 1440er Viewport) -> Hero 192.
- Aktiv und inaktiv identisch: Hero 240/240, Karte 658x442, Marker 80. Kein Nachbarbadge groesser als das aktive.
- CSS-Zoom 200 % und 400 % nach Hydration, DPR 2 bei 390 Breite, kein horizontaler Dokumentueberlauf.
- Eingaben: Pointer-Drag, horizontales Wheel, vertikales Seiten-Wheel, Tastatur (End/Links/Home),
  direkte und angrenzende Spruenge, schnelle und unterbrochene Navigation, Fokus-Ring sichtbar,
  0 Fokusleaks in `inert`-Bereichen, Expand/Collapse stellt den Fokus wieder her.
- Inventar: 113 Quellen (107 Originale unveraendert + 6 additive Karaoke-Dateien), 113 Quell-Crops,
  84 Kompositions-Crops, 18 Kontaktboegen mit vollstaendig enthaltenen (contain) Kacheln.
- Artefakte: `evidence/final-review/` (Rohdaten lokal, per `.gitignore` ausgenommen); die kleinen
  Manifeste `ARTWORK-SIGNOFF.md`, `artwork-inventory.json`, `gap-manifest.json`,
  `browser-matrix-summary.json` und `collector-handoff.md` sind versioniert.

## Zeilenweise Sichtabnahme

Alle 197 Zeilen (113 Quellen + 84 Kompositionen) sind in
`evidence/final-review/ARTWORK-SIGNOFF.md` einzeln signiert; Methode und die drei bewusst
akzeptierten Abweichungen (historisches Portrait-Banner, Eigen-Padding bei admin/designer/other,
superseded Quellen nur in der Inventur) stehen dort im Kopf.

## Performance

- Frontend: `fetchXhr.afterLoad = 0`, `navigationGrowth = 0`, `fetchXhrDuringInputs = 0` — keine
  Query pro Badge, pro Karte oder pro Navigation. Stress 100 und 200 Elemente: `requestGrowth = 0`,
  `renderGrowth = 4`, Settle 139/140 ms.
- Backend unveraendert: `git diff 052858dc..HEAD -- backend shared database` ist leer.
  Phase-131-Query-Budget bleibt bei 2 und 6 Projekten exakt 20 Queries; Phase-150-Exact-once-Entry PASS.

## Files Changed

- `frontend/src/app/dev/ui-system/page.tsx`
- `frontend/src/app/dev/ui-system/achievements/page.tsx`
- `frontend/src/app/dev/ui-system/showcase/AchievementBadgeShowcase.tsx`
- `frontend/src/app/dev/ui-system/showcase/AchievementBadgeShowcase.test.tsx`
- `frontend/src/app/dev/ui-system/showcase/AchievementBadgeNonRoleCases.tsx`
- `frontend/src/app/dev/ui-system/showcase/AchievementBadgeShowcase.module.css`
- `frontend/src/app/dev/ui-system/showcase/achievementBadgeGalleryFixtures.ts`
- `frontend/scripts/capture-phase151-badge-evidence.mjs`
- `frontend/scripts/phase151-badge-evidence-private.mjs`
- `frontend/scripts/phase151-badge-evidence-browser-private.mjs`
- `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/evidence/final-review/*`
