---
phase: 83
plan: "07"
subsystem: frontend-ui-primitives, backend-repository
tags: [d14-compliance, d16-documentation, eslint, ui-primitives, formfield, soft-delete, phase-83]
dependency_graph:
  requires: [83-05, 83-06]
  provides: [D-14-AnimeContributionModal-Select-FormField, D-14-ReleaseVersionBreakdown-Button, D-16-Constraint-Kommentar]
  affects:
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx
    - frontend/src/components/anime/ReleaseVersionBreakdown.tsx
    - backend/internal/repository/anime_contributions_member_repository.go
tech_stack:
  added: []
  patterns: [formfield-select-wrapper, button-primitive-replacement, go-constraint-comment]
key_files:
  created: []
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx
    - frontend/src/components/anime/ReleaseVersionBreakdown.tsx
    - backend/internal/repository/anime_contributions_member_repository.go
decisions:
  - "Checkbox-Inputs in AnimeContributionModal nicht ersetzt — kein Checkbox-Primitiv in @/components/ui vorhanden; pre-existing warnings, scope des Plans war nur der Select-ohne-FormField-Verstoß"
  - "Button variant=ghost für ReleaseVersionBreakdown-Toggle gewählt — passt zur bestehenden blockStyles.toggleButton CSS-Klasse via className-Prop"
metrics:
  duration_minutes: 15
  completed_date: "2026-06-12"
  tasks_completed: 2
  files_changed: 3
---

# Phase 83 Plan 07: UI-Konsolidierung D-14/D-16 Summary

`Select`+`FormField`-Migration für `AnimeContributionModal.tsx`, natives `<button>` → `Button`-Primitiv in `ReleaseVersionBreakdown.tsx`, und D-16-Soft-Delete-Constraint-Kommentar in `anime_contributions_member_repository.go`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | AnimeContributionModal Select → FormField+Select | 0a95fac3 | AnimeContributionModal.tsx |
| 2 | ReleaseVersionBreakdown Button + D-16-Kommentar | 04691f5b | ReleaseVersionBreakdown.tsx, anime_contributions_member_repository.go |

## What Was Built

**Task 1 — AnimeContributionModal.tsx (D-14):**

- `FormField` zu `@/components/ui`-Import hinzugefügt
- `<Select>` im Focused-Role-Panel in `<FormField label="Person">` eingeschlossen
- `aria-label` und Placeholder auf korrekte Umlaute aktualisiert: `'Person aus der Gruppe wählen …'`
- Vorher: `<label className={styles.focusedRoleAdd}><span>Member hinzufügen</span><Select ...>`
- Nachher: `<FormField label="Person" disabled={...}><Select ...>`
- D-14 must_have erfüllt: kein `<Select>` ohne `FormField`-Wrapper mehr im Focused-Role-Bereich

**Task 2 — ReleaseVersionBreakdown.tsx (D-14):**

- `Button` aus `@/components/ui` importiert
- Natives `<button type="button">` durch `<Button variant="ghost" type="button">` ersetzt
- Alle Props (`className`, `onClick`, `aria-expanded`, `aria-controls`) unverändert übernommen
- Kein `no-restricted-syntax`-Fehler mehr in der Datei

**Task 2 — anime_contributions_member_repository.go (D-16):**

- 4-Zeilen-Kommentar-Block über die `Delete`-Methode hinzugefügt:
  - Hard-DELETE-Hinweis (kein Soft-Delete)
  - `CONSTRAINT D-16`-Kennzeichnung
  - Fehlendes `deleted_at`-Feld dokumentiert
  - Folgearbeit-Kennzeichnung für zukünftige Soft-Delete-Implementierung

## Verification Results

```
npm run typecheck → exit 0
go build ./... → exit 0
npm run lint → kein no-restricted-syntax für ReleaseVersionBreakdown.tsx
npm run lint → kein no-restricted-syntax für <select>-Elemente in AnimeContributionModal.tsx
backend/internal/repository/anime_contributions_member_repository.go enthält "D-16", "Soft-Delete", "Folgearbeit"
```

## Deviations from Plan

### Bekannte Einschränkung: Checkbox-Inputs in AnimeContributionModal.tsx

**Kontext:** `AnimeContributionModal.tsx` enthält `<input type="checkbox">` an Zeilen 286 und 298 — pre-existing `no-restricted-syntax`-Warnungen (warnings, nicht errors).

**Warum nicht behoben:** Es gibt kein `Checkbox`-Primitiv in `frontend/src/components/ui/`. Der Plan gibt explizit vor: "Minimale chirurgische Änderung: Nur das eine native `<select>` ersetzen, das KEINEN `FormField`-Wrapper hat." Die Checkbox-Warnungen waren vor diesem Plan vorhanden.

**Status:** Pre-existing D-14-Schuld, kein Regression. Folgearbeit: `Checkbox`-Primitiv anlegen + `AnimeContributionModal.tsx` migrieren.

**Must-Have-Erfüllung:** D-14 must_have truth `"Kein natives <select> ohne FormField-Wrapper in AnimeContributionModal.tsx"` ist erfüllt. Die Checkbox-Warnungen betreffen `<input type="checkbox">`, nicht `<select>`.

## Known Stubs

Keine neuen Stubs eingeführt. Die `ANIME_CONTRIBUTION_ROLES`-Konstante (statisch, kein Live-Endpoint) war bereits aus Plan 83-05 bekannt und in 83-05-SUMMARY.md dokumentiert.

## Threat Surface Scan

Keine neuen Netzwerk-Endpunkte. Kein neues Trust-Boundary-Crossing. T-83-D16 (Hard-DELETE) ist als Kommentar dokumentiert — kein vollständiger Soft-Delete-Ausbau in Phase 83 (accept disposition).

## Self-Check: PASSED

- `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` FOUND
- `frontend/src/components/anime/ReleaseVersionBreakdown.tsx` FOUND
- `backend/internal/repository/anime_contributions_member_repository.go` FOUND
- Commit 0a95fac3 FOUND (Task 1)
- Commit 04691f5b FOUND (Task 2)
- `FormField` in AnimeContributionModal.tsx FOUND
- `<FormField label="Person">` wraps Select FOUND
- native `<button>` in ReleaseVersionBreakdown.tsx ENTFERNT, ersetzt durch `<Button variant="ghost">`
- "D-16" in anime_contributions_member_repository.go FOUND
- "Soft-Delete" in anime_contributions_member_repository.go FOUND
- "Folgearbeit" in anime_contributions_member_repository.go FOUND
- `npm run typecheck` → exit 0
- `go build ./...` → exit 0
