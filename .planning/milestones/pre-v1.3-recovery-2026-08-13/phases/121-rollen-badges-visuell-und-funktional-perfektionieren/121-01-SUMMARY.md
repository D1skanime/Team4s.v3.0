---
phase: 121-rollen-badges-visuell-und-funktional-perfektionieren
plan: 01
subsystem: testing
tags: [vitest, react-testing-library, accessibility, badges, tdd]
requires:
  - phase: 118-rollenfortschritt-als-eigene-card-je-tats-chlich-ausge-bter-
    provides: Rollenfortschritts-Resolver und Fünf-Rang-Baseline
  - phase: 120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo
    provides: FocalCarousel-Zustandsseam und aktueller Dirty-Tree-Baseline
provides:
  - Deterministische Expected-Red-Verträge für exakt elf verdiente Rollenfamilien
  - Kanonische Schwellen-, Count-, Ziel- und Platin-Matrix
  - Hero-Artwork-Verträge für alle fünf Ränge einschließlich direkter Timing-Quellen
  - Semantische Fünf-Schritt- und Same-DOM-Verträge für active, inactive und expanded
affects: [121-02, MemberBadgeChain, memberBadgeLabels]
tech-stack:
  added: []
  patterns: [Vitest it.fails als False-Green-sicherer Expected-Red-Vertrag]
key-files:
  created:
    - .planning/phases/121-rollen-badges-visuell-und-funktional-perfektionieren/121-01-SUMMARY.md
  modified:
    - frontend/src/components/profile/memberBadgeLabels.test.ts
    - frontend/src/components/profile/MemberBadgeChain.test.tsx
key-decisions:
  - "Neue Plan-02-abhängige Verträge verwenden ausschließlich [phase121-red] plus it.fails; bereits erfüllte Resolver-Wahrheiten bleiben normale Tests."
  - "Die vorhandene uncommittete CSS-Vertragsänderung in MemberBadgeChain.test.tsx blieb vollständig außerhalb der Plan-Commits."
patterns-established:
  - "Expected Red: Ein beabsichtigt fehlender Vertrag gilt nur dann als grün, wenn seine Assertion tatsächlich fehlschlägt."
requirements-completed: [D-01, D-02, D-03, D-07, D-09, D-10, D-11, D-12, D-13, D-18, D-19, D-20, D-23, D-27, D-28]
duration: 8min
completed: 2026-08-10
---

# Phase 121 Plan 01: Expected-Red-Verträge für Rollen-Badges Summary

**Ausführbare Vitest-Verträge fixieren elf earned-only Rollenfamilien, kanonische Rangschwellen, sämtliche Hero-Artworks sowie den semantischen Same-DOM-Rank-Track vor der Consumer-Umsetzung.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-10T09:19:00Z
- **Completed:** 2026-08-10T09:27:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Exakt elf erlaubte Rollenfamilien, Ausschlüsse, Unterstrichcodes und die Count-Matrix 0/1/11/12/107/108/319/320/509/510/687 sind festgeschrieben.
- Alle fünf Hero-Ränge jeder Familie sowie der direkte Timing-Artwork-Sonderfall sind False-Green-sicher als Expected Red formuliert.
- Der künftige Track muss fünf geordnete informative Listitems, genau ein `aria-current="step"`, sichtbare Zustände und keinerlei künstliche Interaktion liefern.
- Active, inactive und expanded müssen denselben Card-/Hero-/Track-Baum mit expliziten Zustandsattributen verwenden.

## Task Commits

1. **Task 1: Rollen-, Schwellen- und Artwork-Matrix festschreiben** — `cb54fb70` (test)
2. **Task 2: Rank-Track- und Same-DOM-Vertrag spezifizieren** — `98fe1314` (test)

## Files Created/Modified

- `frontend/src/components/profile/memberBadgeLabels.test.ts` — kanonische Schwellen-, Count- und Unterstrichcode-Matrix.
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` — Rollenfilter-, Artwork-, Track-, A11y- und Same-DOM-Expected-Red-Verträge.
- `.planning/phases/121-rollen-badges-visuell-und-funktional-perfektionieren/121-01-SUMMARY.md` — Ausführungsnachweis.

## Decisions Made

- Bereits vorhandene Resolver-Funktionalität wird mit normalen Tests abgesichert; nur fehlendes Plan-02-Verhalten trägt `[phase121-red]` und `it.fails`.
- Die vier uncommitteten Timing-Assets und sämtliche fremden FocalCarousel-/CSS-Hunks wurden weder verändert noch gestaged.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Der vollständige Frontend-Typecheck bleibt an vorbestehenden, planfremden Next.js-`PageProps`-Fehlern in generierten `.next/dev/types` hängen (Anime-Group-Releases, Fansub-Profil/-Projekt und Member-Profil). Die beiden fokussierten Testdateien sind nicht betroffen; ESLint und fokussierte Vitest-Läufe bestehen.
- Der Arbeitsbaum war wie angekündigt dirty. Die vorhandenen elf Zeilen in `MemberBadgeChain.test.tsx` wurden über selektives Index-Staging aus beiden Task-Commits ausgeschlossen.

## Verification

- `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/memberBadgeLabels.test.ts src/components/profile/MemberBadgeChain.test.tsx` — PASS, 116 Tests.
- Marker- und `it.fails`-Gates — PASS, vier Expected-Red-Verträge.
- `docker compose exec -T team4sv30-frontend npx eslint src/components/profile/memberBadgeLabels.test.ts src/components/profile/MemberBadgeChain.test.tsx` — PASS.
- `git diff --check` — PASS.
- `docker compose exec -T team4sv30-frontend npm run typecheck` — FAIL, ausschließlich vorbestehende generierte Next.js-`PageProps`-Fehler außerhalb des Plans.

## Known Stubs

None.

## Threat Flags

None. Test-only changes führen keine neue Trust Boundary ein.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 121-02 kann die vier Expected-Red-Verträge durch Consumer- und CSS-Änderungen erfüllen und danach alle `.fails`-/`[phase121-red]`-Marker entfernen. Die fremden Dirty-Tree-Hunks und untracked Timing-Assets bleiben dabei weiterhin zu bewahren.

## Self-Check: PASSED

- Beide geänderten Testdateien existieren.
- Die Task-Commits `cb54fb70` und `98fe1314` sind in der Git-Historie vorhanden.
- Alle planbezogenen fokussierten Verifikationen bestehen.

---
*Phase: 121-rollen-badges-visuell-und-funktional-perfektionieren*
*Completed: 2026-08-10*
