---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 36
subsystem: frontend
tags: [d-34, ui, release-label, contributions]

# Dependency graph
requires:
  - phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
    provides: "related_release_version_id/related_release_label in FansubGroupHintRow und allen drei Lesepfaden (Plan 191-32), gespiegelt im Frontend-Typ FansubGroupHint (Plan 191-33)"
provides:
  - "Release-Label (D-34) sichtbar in allen drei fansub_group_hints-Listen: MyProposalsSection ('An andere Gruppen'), FansubGroupHintsReviewSection (Leader-Review), FansubGroupHintsAdminClient (Tabelle + Mobile-Card)"
  - "HintProjectCell: eine gemeinsame Hilfskomponente, die Projekttitel + optionales Release-Label fuer Tabelle UND Mobile-Card der Admin-Liste identisch rendert"
  - "Schemafreie Episodenanzeige im Eigengruppen-Proposal-Pfad (renderProposalCard) ueber das bereits bestehende MeAnimeContribution.episode_number -- D-34s Eigengruppen-Teilfrage ist damit beantwortet und umgesetzt, kein offener Punkt mehr"
  - "docs/FRONTEND_ARCHITEKTUR.md dokumentiert related_release_label als projektweite Konvention fuer kuenftige vierte Konsumenten"
affects: []

tech-stack:
  added: []
  patterns:
    - "HintProjectCell (FansubGroupHintsAdminClient.tsx) ist die EINE Markup-Stelle fuer 'Projekt + optionales Release', von Tabelle UND Mobile-Card aufgerufen -- verhindert Drift zwischen beiden Breakpoints statt zwei separate Inline-JSX-Bloecke zu pflegen"
    - "renderHintCard/renderProposalCard (MyProposalsSection.tsx) und das Toolbar-Card-Body (FansubGroupHintsReviewSection.tsx) rendern das Release-/Episoden-Feld als eigenen, unabhaengig bedingten Block -- nie eine leere 'Release:'-Zeile bei null"

key-files:
  created: []
  modified:
    - frontend/src/components/contributions/MyProposalsSection.tsx
    - frontend/src/components/contributions/MyProposalsSection.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.test.tsx
    - frontend/src/app/admin/fansub-group-hints/FansubGroupHintsAdminClient.tsx
    - frontend/src/app/admin/fansub-group-hints/FansubGroupHintsAdminClient.test.tsx
    - docs/FRONTEND_ARCHITEKTUR.md
    - .planning/phases/191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen/deferred-items.md

key-decisions:
  - "FansubGroupHintsAdminClient.tsx bekam eine neue, kleine HintProjectCell-Komponente statt zwei separat gepflegter Inline-JSX-Bloecke (Tabelle/Mobile-Card) -- Konsistenz zwischen beiden Breakpoints ist dadurch strukturell erzwungen statt auf manueller Disziplin zu beruhen."
  - "FansubGroupHintsReviewSection.tsx rendert Projekttitel und Release-Label als zwei unabhaengig bedingte Spans statt einer Zeichenketten-Verkettung -- robust auch fuer den theoretischen Edge-Case related_anime_title=null (LEFT-JOIN-Randfall, siehe Typdatei-Kommentar) UND related_release_label gesetzt."
  - "Die D-34-Eigengruppen-Teilfrage wurde NICHT als offen dokumentiert, sondern umgesetzt: contribution.episode_number existierte bereits auf MeAnimeContribution (fruehere Phase), nur ungenutzt in renderProposalCard -- schemafrei genau wie von D-34 verlangt."

requirements-completed: [D-34]

# Metrics
duration: ~35min
completed: 2026-10-24
---

# Phase 191 Plan 36: Release-Anzeige in allen drei Hinweis-Listen + schemafreie Episodenanzeige Summary

**Das in Plan 191-32 vom Backend berechnete Release-Label ist jetzt in allen drei fansub_group_hints-Leseoberflächen sichtbar; die unabhängige, schemafreie Episodenanzeige im Eigengruppen-Proposal-Pfad schließt D-34 vollständig ab**

## Performance

- **Duration:** ~35 min
- **Tasks:** 2
- **Files modified:** 8 (0 neu, 8 geändert)

## Accomplishments

- `MyProposalsSection.tsx`s `renderHintCard` zeigt `hint.related_release_label` als eigene, bedingte Zeile direkt unter dem Projekttitel — nie eine leere „Release:“-Zeile bei `null`.
- `MyProposalsSection.tsx`s `renderProposalCard` zeigt zusätzlich `contribution.episode_number` als „Episode {n}“ — das Feld existierte bereits auf `MeAnimeContribution` (frühere Phase), wurde hier nur erstmals angezeigt; keine Schema-Änderung nötig, D-34s Eigengruppen-Teilfrage ist damit explizit beantwortet statt offen gelassen.
- `FansubGroupHintsReviewSection.tsx`s Leader-Karte zeigt das Release-Label zusätzlich zum bestehenden Projekttitel, im selben Inline-Style-Muster wie der Rest der Karte.
- `FansubGroupHintsAdminClient.tsx` bekam eine neue, gemeinsame `HintProjectCell`-Komponente, die Projekttitel + optionales Release-Label identisch in der Desktop-Tabelle UND der <760px-Mobile-Card rendert — eine einzige Markup-Stelle statt zwei divergierender Kopien.
- `docs/FRONTEND_ARCHITEKTUR.md`s bestehender Phase-191-Absatz (Zeile 261) wurde um einen Satz ergänzt, der `related_release_label` als projektweite, über alle drei Listen konsistente Konvention für künftige vierte Konsumenten festhält.
- 8 neue Tests (4 in `MyProposalsSection.test.tsx`, 2 in `FansubGroupHintsReviewSection.test.tsx`, 3 in `FansubGroupHintsAdminClient.test.tsx` — eine davon zusätzlich der Null-Fall) decken jeweils den gesetzten UND den `null`-Fall ab; alle TDD-RED-Durchläufe vor der Implementierung bestätigt fehlgeschlagen, GREEN danach bestätigt grün.
- Vollständiger gezielter Testlauf `npm --prefix frontend run test -- MyProposalsSection FansubGroupHintsReviewSection FansubGroupHintsAdminClient`: 43/43 grün.
- `docker restart team4sv30-frontend` ausgeführt; Container healthy, `/admin/fansub-group-hints` und `/` liefern HTTP 200, keine Compile-/Runtime-Fehler im Log.

## Task Commits

1. **Task 1: MyProposalsSection — Release-Label + schemafreie Episodenanzeige** - `6930e8451` (feat)
2. **Task 2: Leader-Review + Admin-Liste (Tabelle/Mobile) + Doku** - `d401552bc` (feat)

## Files Created/Modified

- `frontend/src/components/contributions/MyProposalsSection.tsx` - Release-Label in `renderHintCard`, Episodenzeile in `renderProposalCard`
- `frontend/src/components/contributions/MyProposalsSection.test.tsx` - 4 neue Tests (gesetzt/`null` je Fall)
- `frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.tsx` - Release-Label als eigener Span neben dem Projekttitel
- `frontend/src/app/admin/fansubs/[id]/edit/FansubGroupHintsReviewSection.test.tsx` - 2 neue Tests
- `frontend/src/app/admin/fansub-group-hints/FansubGroupHintsAdminClient.tsx` - neue `HintProjectCell`-Hilfskomponente, in Tabelle UND Mobile-Card verwendet
- `frontend/src/app/admin/fansub-group-hints/FansubGroupHintsAdminClient.test.tsx` - 3 neue Tests (Tabelle, Mobile-Card, Null-Fall)
- `docs/FRONTEND_ARCHITEKTUR.md` - ein Satz zur `related_release_label`-Konvention über alle drei Listen ergänzt
- `.planning/phases/191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen/deferred-items.md` - neuer Eintrag für den beobachteten, unbezogenen `RoleCapabilityDetail.membershipBaselineDrift.test.ts`-Fehlschlag

## Decisions Made

Siehe `key-decisions` im Frontmatter.

## Deviations from Plan

None - plan exakt wie geschrieben ausgeführt. Beide Tasks folgten dem vorgegebenen RED/GREEN-TDD-Zyklus (Tests zuerst, Fehlschlag bestätigt, dann Implementierung, Erfolg bestätigt).

## Known Stubs

None - keine Stubs. Alle drei Listen zeigen das Release-Label bereits aus echten, vom Backend (Plan 191-32) gelieferten Daten; kein hartcodierter/leerer Platzhalter.

## Issues Encountered

Ein unabhängiger, voller Frontend-Testlauf (`npm run test`, 419 Dateien/3850 Tests) zeigte 2
Fehlschläge in `RoleCapabilityDetail.membershipBaselineDrift.test.ts` (Phase 188, liest einen
absoluten `/backend/...`-Pfad, der nur innerhalb der Container-Mount-Struktur existiert, nicht
auf diesem Host-Checkout) — bestätigt unabhängig von diesem Plan (Datei nicht in
`files_modified`, letzte Änderung aus Phase 188), dokumentiert in `deferred-items.md`, nicht
behoben (Scope-Grenze).

## User Setup Required

None.

## Next Phase Readiness

- D-34 ist jetzt vollständig geschlossen: sowohl die fremde-Gruppe-Variante (`fansub_group_hints.related_release_label`, Backend Plan 191-32, Frontend hier) als auch die Eigengruppen-Variante (`anime_contributions.episode_number`, schemafrei) sind umgesetzt.
- Kein Blocker für 191-37 (Phasenabschluss: D-36-Vorabprüfung, D-35-Testdaten-Löschung, DECISIONS.md, Regressionsgate, blockierender Live-Checkpoint).

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Plan: 36*
*Completed: 2026-10-24*

## Self-Check: PASSED

All 7 files created/modified by this plan confirmed present on disk; both task commit hashes
(`6930e8451`, `d401552bc`) confirmed present in git history.
