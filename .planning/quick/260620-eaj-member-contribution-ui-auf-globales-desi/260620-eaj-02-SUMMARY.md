---
phase: quick-260620-eaj
plan: "02"
subsystem: frontend/contributions
tags: [copy, ux, css, contributions]
dependency_graph:
  requires: [260620-eaj-01]
  provides: [Contribution-Formulare ohne inline styles, ProposalForm mit gekürzter Copy]
  affects: [frontend/src/components/contributions]
tech_stack:
  added: []
  patterns: [CSS-Klassen statt inline styles]
key_files:
  modified:
    - frontend/src/components/contributions/ReportFormFehler.tsx
    - frontend/src/components/contributions/ReportFormStory.tsx
    - frontend/src/components/contributions/ReportFormMedia.tsx
    - frontend/src/components/contributions/RejectReasonModal.tsx
    - frontend/src/components/contributions/ReportModal.tsx
    - frontend/src/components/contributions/ProposalForm.tsx
    - frontend/src/components/contributions/ProposalForm.test.tsx
    - frontend/src/components/contributions/contributions.module.css
decisions:
  - D-CSS: reportForm, formNote, fieldError-margin in contributions.module.css als kanonische Klassen
  - D-Copy: Erklärende Sätze aus allen 6 Komponenten entfernt oder auf maximal einen Satz gekürzt
metrics:
  duration: ~10min
  completed: "2026-06-20"
  tasks: 2
  files: 8
---

# Phase quick-260620-eaj Plan 02: Inline-Style-Migration + Copy-Verschlankung

**One-liner:** Alle inline style= Attribute in Report-Formularen, RejectReasonModal, ReportModal und ProposalForm durch CSS-Klassen ersetzt; erklärende Absätze entfernt.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Inline styles in ReportFormFehler/Story/Media → CSS-Klassen | 24af5600 | ReportFormFehler.tsx, ReportFormStory.tsx, ReportFormMedia.tsx, contributions.module.css |
| 2 | RejectReasonModal + ReportModal + ProposalForm — inline styles entfernen, verbose Copy kürzen | 1f3778d5 | RejectReasonModal.tsx, ReportModal.tsx, ProposalForm.tsx, ProposalForm.test.tsx, contributions.module.css |

## Changes per File

**contributions.module.css**
- `.reportForm` ergänzt: `display: flex; flex-direction: column; gap: 16px;`
- `.formNote` ergänzt: `font-size: 0.875rem; color: var(--text-muted);`
- `.fieldError` erhält `margin-top: 8px` (ersetzt `marginTop: 8` inline in RejectReasonModal)

**ReportFormFehler.tsx**
- `styles`-Import ergänzt
- `<form style={...}>` → `className={styles.reportForm}`
- `<p role="alert" style={...}>` → `className={styles.fieldError}`
- Erklärender `<p>` am Ende entfernt

**ReportFormStory.tsx**
- `styles`-Import ergänzt
- Dieselben Muster wie ReportFormFehler migriert
- Erklärender `<p>` am Ende entfernt

**ReportFormMedia.tsx**
- `styles`-Import ergänzt
- `<form style={...}>` → `className={styles.reportForm}`
- `<p role="alert" style={...}>` → `className={styles.fieldError}`
- `<p Ausgewählt:>` und `<div role="status">` → `className={styles.formNote}`
- Erklärender Upload-Hinweis-Paragraph entfernt
- Native `<input type="file">` mit eslint-disable unberührt

**RejectReasonModal.tsx**
- `styles`-Import ergänzt
- `<p role="alert" style={{ color, fontSize, marginTop }}>` → `className={styles.fieldError}`

**ReportModal.tsx**
- `{type ? <p className={styles.reviewHint}>...</p> : null}` entfernt

**ProposalForm.tsx**
- Oberes infoPanel: "Hier wird kein Credit direkt vergeben. Der Hinweis geht an die zuständige Gruppe. Danach wird entschieden..." → "Der Hinweis geht zur Prüfung an die zuständige Gruppe."
- Scope-Button "Projekt insgesamt": erklärender `<span>` entfernt
- Scope-Button "Bestimmte Folgen": `<span>` auf "Noch nicht verfügbar" gekürzt
- `<div role="status" className={styles.warningPanel}>Release-Version-spezifische...</div>` entfernt
- Unteres infoPanel: 90-Tage-Text auf "Keine Reaktion nach 90 Tagen: Vorschlag kann selbst öffentlich geschaltet werden." gekürzt

**ProposalForm.test.tsx**
- `expect(markup).toContain('Hier wird kein Credit direkt vergeben.')` → `expect(markup).toContain('Hinweis geht zur Prüfung an die zuständige Gruppe')`

## Verification

**TSC:** `npx tsc --noEmit` — keine Ausgabe, fehlerfrei (beide Tasks).

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

**ESLint:** `npx eslint` auf RejectReasonModal, ReportModal, ProposalForm, ProposalForm.test.tsx — keine Ausgabe, sauber.

## Deviations from Plan

None — Plan exakt ausgeführt.

## Known Stubs

Keine.

## Threat Flags

Keine neuen Trust Boundaries eingeführt. Reine UI-Style- und Copy-Änderungen.

## Self-Check: PASSED

- `frontend/src/components/contributions/ReportFormFehler.tsx` — vorhanden
- `frontend/src/components/contributions/ReportFormStory.tsx` — vorhanden
- `frontend/src/components/contributions/ReportFormMedia.tsx` — vorhanden
- `frontend/src/components/contributions/RejectReasonModal.tsx` — vorhanden
- `frontend/src/components/contributions/ReportModal.tsx` — vorhanden
- `frontend/src/components/contributions/ProposalForm.tsx` — vorhanden
- `frontend/src/components/contributions/ProposalForm.test.tsx` — vorhanden
- `frontend/src/components/contributions/contributions.module.css` — vorhanden
- Commit 24af5600 — vorhanden
- Commit 1f3778d5 — vorhanden
- TSC — fehlerfrei
- Vitest — 21/21 grün
- ESLint — sauber
