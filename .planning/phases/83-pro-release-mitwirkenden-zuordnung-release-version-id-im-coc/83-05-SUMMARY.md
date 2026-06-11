---
phase: 83
plan: "05"
subsystem: frontend-drawer
tags: [drawer, frontend, tdd, ui-primitives, contributor, release-version, phase-83]
dependency_graph:
  requires: [83-04]
  provides: [ReleaseContributionDrawer, ContributorAvatar, listEffectiveContributionsForVersion]
  affects:
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ContributorAvatar.tsx
    - frontend/src/lib/api.ts
    - frontend/src/types/fansub.ts
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css
tech_stack:
  added: []
  patterns: [staged-editor, tdd-red-green, static-role-catalog, ui-primitives-only]
key_files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ContributorAvatar.tsx
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/types/fansub.ts
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css
decisions:
  - "Statische ANIME_CONTRIBUTION_ROLES statt Live-Endpoint — kein GET /role-definitions verfügbar (VERIFIED), Folgearbeit dokumentiert im Kommentar"
  - "ErrorState braucht title+description statt message — Typfehler durch Typecheck entdeckt und behoben (Rule 1)"
  - "handleAddConfirm direkt upsert statt staged — neue Zeilen brauchen contribution_id vom Backend; staged-Remove reicht für Delete-Flow"
metrics:
  duration_minutes: 25
  completed_date: "2026-06-12"
  tasks_completed: 2
  files_changed: 6
---

# Phase 83 Plan 05: Override-Drawer + API-Helper Summary

Staged `ReleaseContributionDrawer` Komponente mit Mini-Avatar (`ContributorAvatar`), `listEffectiveContributionsForVersion` API-Helper und passenden Typen — vollständige UI für release-versions-spezifische Mitwirkenden-Override via `@/components/ui` Primitives, TDD-grün.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Typen + API-Helper + ContributorAvatar + CSS | 8ab19bba | fansub.ts, api.ts, ContributorAvatar.tsx, FansubEdit.module.css |
| 2 (RED) | Failing Tests für ReleaseContributionDrawer | d88c4914 | ReleaseContributionDrawer.test.tsx |
| 2 (GREEN) | ReleaseContributionDrawer Implementierung | 23e574dd | ReleaseContributionDrawer.tsx |

## What Was Built

**Task 1 — Typen, API-Helper, Mini-Komponente, CSS:**

- `EffectiveContributionRow` + `EffectiveContributionsResponse` in `frontend/src/types/fansub.ts`
- `listEffectiveContributionsForVersion(releaseVersionId, fansubGroupId, authToken?)` in `api.ts` — GET /api/v1/admin/release-versions/:id/contributions/effective?fansub_group_id=...
- `ContributorAvatar.tsx` — 25 Zeilen, rendert `<img>` wenn avatarUrl vorhanden, sonst `<span>` mit Initialen aus den ersten zwei Wörtern
- CSS-Klassen in `FansubEdit.module.css`: `.contributorAvatar`, `.contributorAvatarInitials`, `.contributionRow`, `.contributionRowActions`, `.contributionRoleLabel`, `.contributionMemberName`

**Task 2 — ReleaseContributionDrawer + Tests:**

- `ReleaseContributionDrawer.tsx` (296 Zeilen — innerhalb des 320-Limit):
  - Props: `open`, `fansubId`, `animeId`, `releaseVersionId`, `releaseTitle`, `onClose`, `onSaved`
  - useEffect auf `open` — paralleles Laden via `Promise.all([listUnifiedGroupMembers, listEffectiveContributionsForVersion])`
  - `stagedRows` + `removedIds` State — staged Editor (C-STAGED: kein Auto-Save)
  - Pro Zeile: Rollen-Label, ContributorAvatar, Member-Name, Rolle-ändern-Button (ghost+iconOnly), Entfernen-Button (danger+iconOnly, aria-label="Mitwirkende entfernen")
  - Statische `ANIME_CONTRIBUTION_ROLES` Konstante mit Kommentar über fehlenden Endpoint (D-14, bewusste Abweichung)
  - Person-/Rollen-Picker mit `@/components/ui` `Select` + `FormField` (keine nativen Elemente)
  - Footer: Abbrechen (ghost) + Speichern (primary, loading={saving})
  - handleSave: `Promise.all(removedIds.map(deleteAnimeContribution))` → `onSaved()` + `onClose()`
  - EmptyState wenn `stagedRows.length === 0 && !addingRow`
  - Alle deutschen Strings mit korrekten Umlauten

- `ReleaseContributionDrawer.test.tsx` (6 Tests, alle grün):
  - Rendert nicht wenn open=false
  - Zeigt Titel "Mitwirkende" wenn open=true
  - EmptyState bei leerer Contributions-Liste
  - Member-Namen aus Contributions-Liste werden gerendert
  - Entfernen-Button entfernt Zeile staged ohne API-Call
  - Abbrechen-Button ruft onClose auf

## Verification Results

```
npm run test -- ReleaseContributionDrawer → 6 passed (6)
npm run typecheck → exit 0
npm run lint → keine no-restricted-syntax Fehler in neuen Dateien
ReleaseContributionDrawer.tsx: enthält "Mitwirkende" (Drawer title)
ReleaseContributionDrawer.tsx: enthält ANIME_CONTRIBUTION_ROLES mit Kommentar "kein /role-definitions-Endpoint vorhanden"
ReleaseContributionDrawer.tsx: 296 Zeilen (≤ 320)
Kein nativer <select>/<input>/<textarea>/<button> in ReleaseContributionDrawer.tsx (nur @/components/ui Primitives)
Alle Umlaute korrekt: Übersetzer, Qualitätsprüfer, Mitwirkende, Speichern, Abbrechen
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ErrorState Props-Diskrepanz: `message` → `title`+`description`**
- **Found during:** Task 2 GREEN (TypeScript-Typecheck)
- **Issue:** Plan und PATTERNS.md dokumentierten `<ErrorState message={error} />`, aber `ErrorState` in `@/components/ui` erwartet `title: string` + `description: string` (nicht `message`).
- **Fix:** `<ErrorState title="Fehler" description={error} />` im Drawer.
- **Files modified:** `ReleaseContributionDrawer.tsx`
- **Commit:** 23e574dd

### Tracked Deviations (Intentional, Plan-documented)

**Statische ANIME_CONTRIBUTION_ROLES (kein Live-Endpoint):**
- Kein `GET /api/v1/admin/role-definitions`-Endpoint im Backend vorhanden (VERIFIED: Routen-Scan in 83-RESEARCH.md).
- Statische Liste aus Migration 0085-Einträgen — abgedeckt durch Kommentar im Code.
- Folgearbeit: Katalog-Endpoint anlegen + Drawer auf dynamischen Abruf umstellen.

## Known Stubs

Keine produktionsrelevanten Stubs — `ReleaseContributionDrawer` ist vollständig implementiert. Plan 06 verdrahtet den Drawer in `page.tsx`.

## Threat Surface Scan

Kein neuer Netzwerk-Endpoint auf Frontend-Seite. Der Drawer ruft ausschließlich bereits in Plan 83-04 abgesicherte Backend-Routen auf (T-83-IDOR mitigiert). Keine neuen Trust-Boundary-Kreuzungen.

## TDD Gate Compliance

- RED commit: d88c4914 (`test(83-05): add failing tests for ReleaseContributionDrawer`)
- GREEN commit: 23e574dd (`feat(83-05): implement ReleaseContributionDrawer`)
- Gate-Reihenfolge eingehalten: test → feat

## Self-Check: PASSED

- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.tsx` FOUND
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.test.tsx` FOUND
- `frontend/src/app/admin/fansubs/[id]/edit/ContributorAvatar.tsx` FOUND
- `EffectiveContributionRow` in `frontend/src/types/fansub.ts` FOUND
- `listEffectiveContributionsForVersion` in `frontend/src/lib/api.ts` FOUND
- Commit 8ab19bba FOUND (Task 1)
- Commit d88c4914 FOUND (Task 2 RED)
- Commit 23e574dd FOUND (Task 2 GREEN)
- `npm run test -- ReleaseContributionDrawer` → 6 PASSED
- `npm run typecheck` → exit 0
- Kein nativer select/input/textarea in ReleaseContributionDrawer.tsx
- ANIME_CONTRIBUTION_ROLES mit Abweichungs-Kommentar FOUND
- "Mitwirkende" String FOUND
- Korrekte Umlaute: Übersetzer, Qualitätsprüfer FOUND
