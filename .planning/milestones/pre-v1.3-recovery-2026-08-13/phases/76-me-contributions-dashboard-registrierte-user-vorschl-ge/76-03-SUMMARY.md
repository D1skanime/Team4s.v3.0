---
phase: 76-me-contributions-dashboard-registrierte-user-vorschl-ge
plan: "03"
subsystem: contributions
tags: [frontend, components, inbox, summary, filters, tdd, wave-3, design-system]
dependency_graph:
  requires:
    - 76-01
    - 76-02
  provides:
    - frontend/src/components/contributions/ContributionInbox.tsx
    - frontend/src/components/contributions/ContributionSummary.tsx
    - frontend/src/components/contributions/ContributionFilters.tsx
    - frontend/src/components/contributions/VisibilityDropdown.tsx (migriert)
    - frontend/src/components/contributions/contributions.module.css (erweitert)
  affects:
    - frontend/src/components/contributions/ContributionCard.tsx (Props erweitert)
tech_stack:
  added: []
  patterns:
    - useMemo-Inbox-Filter (D-03a/b/c/d) mit vier Quellengruppen
    - useMemo-Aggregat (byStatus/byGroup/byRole) für Summary-Stat-Chips (D-12)
    - Pure-Function applyFilters mit Currying-Signatur (c: MeAnimeContribution) => boolean (D-11)
    - Button variant='subtle' aria-pressed für Toggle-Chips (D-12)
    - CSS-Token-Klassen (.chipActive/.chipInactive) mit --accent-primary (D-12/UI-SPEC)
    - Select-Primitive-Migration (C2) statt nativem <select>
key_files:
  created:
    - frontend/src/components/contributions/ContributionInbox.tsx
    - frontend/src/components/contributions/ContributionSummary.tsx
    - frontend/src/components/contributions/ContributionFilters.tsx
  modified:
    - frontend/src/components/contributions/VisibilityDropdown.tsx
    - frontend/src/components/contributions/contributions.module.css
    - frontend/src/components/contributions/ContributionCard.tsx
decisions:
  - "ContributionCard.tsx onRejectWithReason + onCorrect als neue optionale Props — abwärtskompatibel mit bestehendem onReject (kein Breaking Change)"
  - "ContributionFilters.tsx als reines Shared-Types-Modul (kein JSX) — Chips leben in ContributionSummary"
  - "EMPTY_FILTER_STATE und hasActiveFilters als zusätzliche Exports in ContributionFilters.tsx — erleichtern page.tsx-Verdrahtung in Plan 05"
  - "summaryAxisLabel-Klasse für Achsen-Label — nutzt var(--text-muted) statt Hardcode-Farbe"
metrics:
  duration: "~40min"
  completed_date: "2026-06-05"
  tasks_completed: 2
  files_changed: 6
---

# Phase 76 Plan 03: Frontend-Kernkomponenten — Inbox, Summary, Filter, VisibilityDropdown Summary

`ContributionInbox` mit useMemo-Filter für D-03a/b/c/d, `ContributionSummary` mit klickbaren Stat-Chips und Toggle-Logik (D-12), `ContributionFilters` als typsicheres Filter-State-Modul mit exakt namentlich exportierten `ContributionFilterState` und `applyFilters`, Migration von `VisibilityDropdown` auf `Select`-Primitive (C2), CSS-Erweiterungen mit Token-basierten Klassen.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | ContributionInbox.tsx — Inbox-Sektion mit useMemo-Filter D-03a/b/c/d + ContributionCard-Props-Erweiterung | `88874ad6` |
| 2 | ContributionSummary.tsx + ContributionFilters.tsx + VisibilityDropdown-Migration + CSS-Erweiterungen | `5e53e4cc` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Functionality] ContributionCard.tsx Props-Erweiterung**
- **Found during:** Task 1
- **Issue:** `ContributionInbox` benötigt `onRejectWithReason` und `onCorrect` als Props an `ContributionCard mode="pending"`. Ohne diese Props wäre der Plan-03-Code nicht compilierbar.
- **Fix:** `ContributionCard.tsx` um optionale Props `onRejectWithReason` und `onCorrect` erweitert; Button-Labels auf D-08/D-09/D-10 angepasst: „Das war ich" / „Das war ich nicht" / „Details korrigieren". Abwärtskompatibel — bestehende `onReject`-Prop bleibt als Fallback.
- **Files modified:** `frontend/src/components/contributions/ContributionCard.tsx`
- **Commit:** `88874ad6`

**2. [Rule 2 - Missing Functionality] Hilfsfunktionen EMPTY_FILTER_STATE + hasActiveFilters**
- **Found during:** Task 2
- **Issue:** `ContributionSummary.tsx` benötigt einen Weg um zu prüfen ob Filter aktiv sind (für „Filter zurücksetzen"-Button) und ContributionFilters.tsx benötigt einen Initialwert. Ohne diese Hilfsfunktionen wäre die Summary-Komponente unvollständig.
- **Fix:** `EMPTY_FILTER_STATE` und `hasActiveFilters` als zusätzliche Exporte in `ContributionFilters.tsx` hinzugefügt — erleichtern auch page.tsx-Verdrahtung in Plan 05.
- **Files modified:** `frontend/src/components/contributions/ContributionFilters.tsx`
- **Commit:** `5e53e4cc`

## Verification Results

### Wave-0-Tests

- `ContributionInbox.test.tsx` — **3/3 GRÜN** (war ROT als Wave-0-Gerüst)
- `ContributionSummary.test.tsx` — **3/3 GRÜN** (war ROT als Wave-0-Gerüst)

### ESLint

- `VisibilityDropdown.tsx` — keine `no-restricted-syntax`-Fehler (kein natives `<select>` mehr)

### TypeScript

- `tsc --noEmit` — fehlerfrei (alle neuen Komponenten)

### Zeilenzählung (450-Zeilen-Limit)

- `ContributionInbox.tsx` — 183 Zeilen (OK)
- `ContributionSummary.tsx` — 135 Zeilen (OK)
- `ContributionFilters.tsx` — 60 Zeilen (OK)
- `VisibilityDropdown.tsx` — 55 Zeilen (OK)
- `contributions.module.css` — 148 Zeilen (OK)

### Exports (W5-Pflicht)

- `ContributionFilterState` — GRÜN (exportiert unter exaktem Namen)
- `applyFilters` — GRÜN (exportiert unter exaktem Namen)

## Known Stubs

Keine. Alle Komponenten sind vollständig implementiert. Die Verdrahtung in `page.tsx` erfolgt in Plan 05.

## Threat Flags

Keine neuen Trust-Boundaries außerhalb des `<threat_model>` des Plans.

- T-76-03-01 (Information Disclosure / member_reason): `member_reason` wird in `ContributionInbox` nur in `RejectedOwnItem` angezeigt (eigene disputed-Items) und in `DisputedItem` (wo es als eigene `member_reason` des Members sichtbar ist) — korrekte Sichtbarkeitslogik via is_own_proposal-Filter.
- T-76-03-02 (Spoofing / is_own_proposal): Filterlogik basiert rein auf server-seitig berechnetem `is_own_proposal` — kein clientseitiger Vergleich mit unkontrollierter Daten.

## Self-Check: PASSED

- `frontend/src/components/contributions/ContributionInbox.tsx` — FOUND
- `frontend/src/components/contributions/ContributionSummary.tsx` — FOUND
- `frontend/src/components/contributions/ContributionFilters.tsx` — FOUND
- `frontend/src/components/contributions/VisibilityDropdown.tsx` — FOUND (migriert)
- `frontend/src/components/contributions/contributions.module.css` — FOUND (erweitert)
- `frontend/src/components/contributions/ContributionCard.tsx` — FOUND (erweitert)
- Commits `88874ad6`, `5e53e4cc` — vorhanden
- `ContributionFilterState` export — FOUND in ContributionFilters.tsx
- `applyFilters` export — FOUND in ContributionFilters.tsx
- Alle Dateien ≤450 Zeilen — PASSED
- Wave-0-Tests 6/6 GRÜN — PASSED
- ESLint VisibilityDropdown kein native select — PASSED
- tsc --noEmit fehlerfrei — PASSED
