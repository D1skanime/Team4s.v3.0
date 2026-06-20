---
phase: quick-260620-eaj
plan: "01"
subsystem: frontend/contributions
tags: [copy, ux, contributions]
dependency_graph:
  requires: []
  provides: [Contribution-UI mit gekürzter Copy]
  affects: [frontend/src/app/me/contributions, frontend/src/components/contributions]
tech_stack:
  added: []
  patterns: []
key_files:
  modified:
    - frontend/src/app/me/contributions/page.tsx
    - frontend/src/components/contributions/ContributionInbox.tsx
    - frontend/src/components/contributions/ContributionSummary.tsx
    - frontend/src/components/contributions/MyContributionsSection.tsx
    - frontend/src/components/contributions/MyProposalsSection.tsx
decisions:
  - D-Copy: Erklärende Sätze entfernt, nur Labels und Aktionen behalten
metrics:
  duration: ~8min
  completed: "2026-06-20"
  tasks: 2
  files: 5
---

# Phase quick-260620-eaj Plan 01: Member Contribution UI — Copy kürzen

**One-liner:** Erklärende Absätze und Prozesshinweise aus allen 5 Contribution-Komponenten entfernt, Primitives und Umlaute unverändert korrekt.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | page.tsx + ContributionInbox + ContributionSummary — Copy kürzen | 37ace166 | page.tsx, ContributionInbox.tsx, ContributionSummary.tsx |
| 2 | MyContributionsSection + MyProposalsSection — Copy kürzen | e0dd26c2 | MyContributionsSection.tsx, MyProposalsSection.tsx |

## Changes per File

**page.tsx**
- `LoadingState`: description-Prop entfernt
- `PageHeader`: description-Prop (Erklärungssatz) entfernt
- Button `aria-label` von "Projekt-Hinweis senden öffnen" auf "Hinweis senden" gekürzt

**ContributionInbox.tsx**
- `SectionHeader`: description-Prop entfernt
- `VisibilityPendingItem`: `<p className={styles.reviewNote}>` mit "Soll diese bestätigte Mitwirkung öffentlich im Profil erscheinen?" entfernt; `VisibilityDropdown` bleibt
- `EmptyState` description: "Keine Aufgaben ausstehend."

**ContributionSummary.tsx**
- `SectionHeader`: description-Prop entfernt

**MyContributionsSection.tsx**
- `SectionHeader`: description-Prop entfernt
- `EmptyState` description: "Noch keine bestätigten Rollen."

**MyProposalsSection.tsx**
- `SectionHeader`: description-Prop entfernt
- `proposalIntro`-div komplett entfernt
- `warningPanel`-Text auf "Verifizierte Gruppenmitgliedschaft erforderlich." gekürzt (div-Container bleibt)
- confirmed-Metaspan ("Dieser Hinweis wurde durch einen Gruppenleader bestätigt.") entfernt
- selfPublish-Bestätigungsspan auf "Unverifizierter historischer Eintrag — wird öffentlich sichtbar." gekürzt

## Verification

**TSC:** `npx tsc --noEmit` — keine Ausgabe, fehlerfrei.

**Vitest:** `npx vitest run src/components/contributions/` — 7 Testdateien, 21 Tests, alle grün.

```
✓ ProposalForm.test.tsx (5 tests)
✓ ReportModal.test.tsx (5 tests)
✓ reportTargets.test.ts (1 test)
✓ ReviewQueue.test.tsx (2 tests)
✓ ContributionSummary.test.tsx (3 tests)
✓ ContributionInbox.test.tsx (3 tests)
✓ ContributionCard.test.tsx (2 tests)
Test Files  7 passed (7)
      Tests 21 passed (21)
```

## Deviations from Plan

None — Plan exakt ausgeführt.

## Known Stubs

Keine.

## Self-Check: PASSED

- `frontend/src/app/me/contributions/page.tsx` — vorhanden
- `frontend/src/components/contributions/ContributionInbox.tsx` — vorhanden
- `frontend/src/components/contributions/ContributionSummary.tsx` — vorhanden
- `frontend/src/components/contributions/MyContributionsSection.tsx` — vorhanden
- `frontend/src/components/contributions/MyProposalsSection.tsx` — vorhanden
- Commit 37ace166 — vorhanden
- Commit e0dd26c2 — vorhanden
- TSC — fehlerfrei
- Vitest — 21/21 grün
