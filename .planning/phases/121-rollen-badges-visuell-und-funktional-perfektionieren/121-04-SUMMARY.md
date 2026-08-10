---
phase: 121-rollen-badges-visuell-und-funktional-perfektionieren
plan: 04
subsystem: ui
tags: [react, css-modules, responsive, carousel, accessibility, visual-uat]
requires:
  - phase: 121-03
    provides: Rollenfamilien, Hero-Artwork und semantischer Fünf-Stufen-Track
provides:
  - Opt-in Visual-Band und breite Desktop-Rollenkomposition
  - Starke Tier-, Count-, Progress- und Zielhierarchie auf Desktop und Mobile
  - Verzerrungsfreie quadratische Geometrie für direkte und komponierte Rollen-Artworks
  - Overlay-freies eigenständiges Expanded-Rollenraster mit stabiler Carousel-Rückkehr
affects: [121-03, member-profile, role-badges, focal-carousel-consumers]
tech-stack:
  added: []
  patterns: [consumer-owned carousel layout, square layered artwork slot, expanded-state CSS reset]
key-files:
  created:
    - .planning/phases/121-rollen-badges-visuell-und-funktional-perfektionieren/121-04-SHARED-DIFF.sha256
  modified:
    - frontend/src/styles/globals.css
    - frontend/src/app/members/[slug]/page.tsx
    - frontend/src/app/members/[slug]/page.module.css
    - frontend/src/components/profile/MemberBadgeChain.tsx
    - frontend/src/components/profile/MemberBadgeChain.module.css
    - frontend/src/components/profile/memberBadgeLabels.ts
    - .planning/phases/121-rollen-badges-visuell-und-funktional-perfektionieren/121-UAT.md
key-decisions:
  - "Shared FocalCarousel bleibt unverändert; sämtliche Layoutkorrekturen nutzen rollenlokale Consumer-Seams."
  - "Timing behält vollständige Direktassets; andere Volumenrollen teilen einen quadratischen lokalen Layer-Kontext."
  - "Expanded ist visuell ein unabhängiges Einspalten-Kartenlayout innerhalb des bestehenden Same-DOM-Renderpfads."
patterns-established:
  - "Layered artwork: absolut positionierte Layer benötigen einen lokalen quadratischen positionierten Wrapper."
  - "Expanded consumer state: Carousel-Chrome ausblenden und Wide-/Active-Geometrie explizit zurücksetzen."
requirements-completed: [D-29, D-30, D-31, D-32, D-33, D-34, D-35, D-36]
duration: 1h 18m
completed: 2026-08-10
---

# Phase 121 Plan 04: Wide-Desktop-Rollenkomposition Summary

**Responsive Rollen-Heroes mit starker Fortschrittshierarchie, quadratischer Layer-Geometrie und einem stabilen overlay-freien Expanded-Raster**

## Performance

- **Duration:** 1h 18m
- **Started:** 2026-08-10T13:25:27Z
- **Completed:** 2026-08-10T14:43:00Z
- **Tasks:** 4
- **Files modified:** 10 Quell-/Planungsdateien plus UAT-PNGs

## Accomplishments

- Nur das Rollen-Band wächst über die normale öffentliche Lesebreite hinaus; 390 bis 2560 px bleiben ohne Seitenoverflow.
- Tier, echter Count, Wert/Zielwert, Prozent, Progressbar und nächstes Ziel bilden getrennte, lesbare Signale; Platinum behält echten Count und volle Bar.
- Timing-Direktassets und komponierte Rollen-Artworks rendern im selben quadratischen optischen Slot ohne Ovalverzerrung oder Überstand.
- „Alle anzeigen“ rendert 11 vollständige, gleich hohe Karten ohne Skeleton-Overlay und kehrt stabil zum Carousel zurück.

## Task Commits

1. **Task 1: Semantische Breiten-Tokens und Verträge** — `675a2106`
2. **Task 2: Visual-Band und Wide-Desktop-Komposition** — `f1f85a7d`, `f30ad459`, `3047e203`, `5f21ae9b`, `bd3ec361`, `b3103f62`
3. **Task 3: Vollgates und responsive Browser-Evidence** — `08effc13`, `5cc35f6d`, `8919684f`, `b0b24449`, `06b670d1`
4. **Task 4: Human verification** — approved 2026-08-10

## Files Created/Modified

- `frontend/src/styles/globals.css` — semantische Visual-/Wide-Breiten-Tokens.
- `frontend/src/app/members/[slug]/page.tsx` und `page.module.css` — einziges opt-in Visual-Band.
- `frontend/src/components/profile/MemberBadgeChain.tsx` — getrennte Tier-/Progress-/Zielprojektion.
- `frontend/src/components/profile/MemberBadgeChain.module.css` — responsive Hero-, Layer- und Expanded-Geometrie.
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` und `memberBadgeLabels.test.ts` — Rollen-, Layer-, Progress- und Toggle-Regressionen.
- `121-UAT.md` und `uat/roles-121-04-*.png` — sieben Viewports, Geometrievergleich und reale Expanded-Toggles.

## Decisions Made

- Shared-FocalCarousel wurde nicht geändert; sein persistierter Diff-Hash blieb durchgehend `ff53c468983fea45fc797b31ca9a6bd97357b3057a00889b65927f784d74fb93`.
- Direkte Timing-Assets bleiben der Sonderpfad; Source-Assets waren nicht malformed und wurden nicht verändert.
- Expanded behält den bestehenden Renderpfad, erhält aber einen vollständigen rollenlokalen Layout-Reset.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fortschrittshierarchie nach erster Sichtprüfung präzisiert**
- **Found during:** Task 4
- **Issue:** Tier, Count, Progress und Ziel waren visuell zu schwach beziehungsweise gekoppelt.
- **Fix:** Getrennte Projektionen, echter Progressbar und responsive Typohierarchie.
- **Committed in:** `3047e203`, `5f21ae9b`

**2. [Rule 1 - Bug] Oval verzerrte komponierte Rollen-Artworks**
- **Found during:** Task 4
- **Issue:** Absolute Layer ohne lokalen Kontext plus rechteckiger 360x410-Slot verzerrten den Kreisclip.
- **Fix:** Positionierter Layer-Wrapper und quadratischer Hero-Slot; Timing-Pfad unverändert.
- **Committed in:** `bd3ec361`

**3. [Rule 1 - Bug] Skeleton-Overlay und abgeschnittene Expanded-Karten**
- **Found during:** Task 4
- **Issue:** Expanded reaktivierte das absolute Skeleton und erbte ein zu breites Desktop-Gridtemplate.
- **Fix:** Skeleton bei Expanded hidden und unabhängiger gleich hoher Einspalten-Kartenvertrag.
- **Committed in:** `b3103f62`

---

**Total deviations:** 3 auto-fixed bugs
**Impact on plan:** Alle Korrekturen waren nötig, um die explizite visuelle Abnahme zu erreichen; keine Backend-, API-, DB- oder Shared-Carousel-Erweiterung.

## Issues Encountered

- Generierte `.next/dev/types` wurden während Dev-Server-Läufen wiederholt veraltet; ausschließlich dieser generierte Ordner wurde vor Typecheck entfernt.
- Der globale Build kompiliert und typprüft, scheitert anschließend planfremd beim Prerendern von `/_not-found` mit `Cannot read properties of null (reading 'useEffect')`.
- Lint bleibt grün mit 326 vorbestehenden Warnungen.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 121-04 ist abgenommen und abgeschlossen.
- Phase 121 bleibt offen: Plan 121-03 Task 3 muss mit dem freigegebenen 121-04-Baselinezustand fortgesetzt werden.

## Self-Check: PASSED

- Summary, Shared-Diff-Artefakt, Quelländerungen und UAT-Evidence sind vorhanden.
- Alle aufgeführten Task-Commits existieren.
- Finales Gate: 159/159 Tests, Typecheck, Lint und `git diff --check` bestanden.

---
*Phase: 121-rollen-badges-visuell-und-funktional-perfektionieren*
*Completed: 2026-08-10*
