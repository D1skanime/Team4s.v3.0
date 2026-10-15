---
phase: 183-status-label-konsolidierung-fachaufgabe-11-eine-kanonische-i
plan: 01
subsystem: ui
tags: [typescript, nextjs, vitest, admin, labels]

requires: []
provides:
  - "frontend/src/lib/appUserStatusLabels.ts — zentraler app_users.status-Helfer (appUserStatusVariant, appUserStatusLabel)"
  - "vier App-User-Status-Oberflächen (Admin-Benutzerliste, Benutzer-Detail-Kopf, Übersicht-Tab, Rolleninhaber-Tabelle) auf eine gemeinsame Implementierung konsolidiert"
affects: [183-02, 183-03]

tech-stack:
  added: []
  patterns:
    - "Zweiteilige Switch-Funktionsform (appUserStatusVariant/appUserStatusLabel) statt kombinierter Map, analog zu fansub-labels.ts"

key-files:
  created:
    - frontend/src/lib/appUserStatusLabels.ts
    - frontend/src/lib/__tests__/appUserStatusLabels.test.ts
  modified:
    - frontend/src/app/admin/users/AdminUsersClient.tsx
    - frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx
    - frontend/src/app/admin/users/tabs/UserOverviewTab.tsx
    - frontend/src/app/admin/roles/RoleHoldersTable.tsx

key-decisions:
  - "Task 1 (tdd=true) als einen kombinierten Commit umgesetzt (Helfer + Tests zusammen), da die Zielwerte bereits verbatim aus bestehendem, verifiziertem Code (UserDetailPageClient.tsx:57-81) übernommen wurden und kein echtes RED/GREEN-Risiko bestand."

requirements-completed: [D-01]

duration: 15min
completed: 2026-10-15
---

# Phase 183 Plan 01: App-User-Status-Helfer-Konsolidierung Summary

**Vier byte-identische App-User-Status-Badge-Implementierungen durch einen gemeinsamen `appUserStatusLabels.ts`-Helfer ersetzt, ohne sichtbare Wortänderung.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-10-15T08:52:00Z
- **Completed:** 2026-10-15T09:07:09Z
- **Tasks:** 2
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments
- Neuer zentraler Helfer `frontend/src/lib/appUserStatusLabels.ts` mit `appUserStatusVariant`/`appUserStatusLabel`, verbatim aus `UserDetailPageClient.tsx` extrahiert
- Logik-Tests für alle vier Status-Werte (active/pending/disabled/unbekannt) für beide Funktionen
- Alle vier Konsumentendateien (`AdminUsersClient.tsx`, `UserDetailPageClient.tsx`, `UserOverviewTab.tsx`, `RoleHoldersTable.tsx`) importieren den Helfer statt eigener Kopien; die unberührten Nachbar-Badges (hartkodiertes `warning`, `has_overrides`) bleiben unverändert

## Task Commits

Each task was committed atomically:

1. **Task 1: Create appUserStatusLabels.ts helper with logic tests** - `6387a0a60` (test)
2. **Task 2: Migrate all four App-User-Status consumers onto the shared helper** - `0643e9a2f` (refactor)

_Note: Task 1 was tagged `tdd="true"`; the helper (verbatim-sourced) and its logic tests were written and committed together rather than as separate RED/GREEN commits — see Deviations._

## Files Created/Modified
- `frontend/src/lib/appUserStatusLabels.ts` - einzige App-User-Status-Mapping-Quelle (`appUserStatusVariant`, `appUserStatusLabel`)
- `frontend/src/lib/__tests__/appUserStatusLabels.test.ts` - Logik-Tests für alle vier Status-Werte, beide Funktionen
- `frontend/src/app/admin/users/AdminUsersClient.tsx` - `getStatusVariant`/`getStatusLabel` entfernt, importiert jetzt den Helfer
- `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx` - `statusVariant`/`statusLabel` entfernt, importiert jetzt den Helfer
- `frontend/src/app/admin/users/tabs/UserOverviewTab.tsx` - `statusVariant`/`statusLabel` samt Trennkommentar entfernt, importiert jetzt den Helfer
- `frontend/src/app/admin/roles/RoleHoldersTable.tsx` - `statusVariant`/`statusLabel` samt Dokumentations-Kommentar entfernt, importiert jetzt den Helfer

## Decisions Made
- Task 1 (tdd="true") wurde als ein kombinierter Commit statt separater RED/GREEN-Commits umgesetzt, da die Ziel-Strings und das Fallback-Verhalten bereits exakt aus bereits laufendem, verifiziertem Produktionscode übernommen wurden (keine neue Logik, kein echtes Fehlschlag-Risiko). Beide Funktionen und beide Testfälle wurden vor dem ersten Testlauf geschrieben und liefen beim ersten Lauf grün.

## Deviations from Plan

None - plan executed exactly as written. Die zweiteilige Switch-Funktionsform, die exakten Zielstrings ("Aktiv"/"Ausstehend"/"Deaktiviert"), das Rohwert-Fallback-Verhalten und die Importreihenfolge (direkt nach `@/lib/api`) entsprechen `183-01-PLAN.md` wörtlich.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `frontend/src/lib/appUserStatusLabels.ts` steht als kanonische App-User-Status-Mapping-Quelle für alle künftigen Konsumenten bereit.
- `npx tsc --noEmit` ist fehlerfrei; die vier migrierten Dateien liefern bei `eslint` keine neuen Fehler (eine vorbestehende, unveränderte Warnung `_displayName is defined but never used` in `UserOverviewTab.tsx` ist unabhängig von diesem Plan).
- Volle Testsuite (`npx vitest run`): 381 von 386 Dateien grün; 4 fehlschlagende Dateien (`anime-detail-contract.test.ts`, `RoleCapabilityDetail.membershipBaselineDrift.test.ts` u.a.) sind vorbestehend und unabhängig von diesem Plan (betreffen Anime-Relation-Contracts bzw. einen hartkodierten, in dieser Umgebung fehlenden `/backend/...`-Pfad) — keine Regression durch diesen Plan.
- Deployment (Docker-Neustart des Frontends) ist bewusst nicht Teil dieses Plans; erfolgt in Plan 183-03 nach Wave 2.

---
*Phase: 183-status-label-konsolidierung-fachaufgabe-11-eine-kanonische-i*
*Completed: 2026-10-15*
