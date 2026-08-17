---
phase: 119-sammlungskarten-f-r-fortschritt-punkte-beitr-ge-mitgliedscha
plan: "05"
subsystem: validation
tags: [vitest, go-test, typecheck, lint, build, live-uat]
status: blocked
requires:
  - phase: 119-04
    provides: Globale Carousel- und Public-Profile-Integration
provides:
  - Unvollst?ndige automatisierte Gate-Evidenz; keine UAT-Freigabe
affects: [119-corrective-plan, 119-live-uat]
key-files:
  created:
    - .planning/phases/119-sammlungskarten-f-r-fortschritt-punkte-beitr-ge-mitgliedscha/119-05-SUMMARY.md
  modified: []
requirements-completed: []
completed: null
---

# Phase 119 Plan 05: Automatisierte Gate-Evidenz ? BLOCKED

**Plan 119-05 ist nicht abgeschlossen.** Die fokussierten Phase-119-Gates bestehen, aber vorgeschriebene projektweite Gates schlagen au?erhalb des Phase-119-Dateiscope fehl. Der blockierende Live-UAT-Checkpoint wurde deshalb nicht begonnen.

## Task Status

- Task 1: **BLOCKED** ? projektweite Frontend-/Backend-Suiten und Production-Build nicht vollst?ndig gr?n.
- Task 2: **NOT STARTED** ? laut Plan erst nach gr?nem Task 1 zul?ssig; keine Browser-/Human-Freigabe behauptet.

## Automatisierte Evidenz

### PASS ? Phase-119-fokussiert

- Frontend: fokussierter Planbefehl ? **PASS**, 6 Dateien und 116/116 Tests.
- Backend: Repository und Handler ? **PASS**, nachdem die kanonischen OpenAPI-Dateien ephemer in den laufenden Testcontainer kopiert wurden.
- Typecheck ohne stale generierte Next-Dev-Typen ? **PASS**; damit keine Phase-119-Quell-Typefehler.
- Lint ? **PASS mit vorbestehenden Warnungen**, 0 Fehler und 326 Warnungen.
- `git diff --check` ? **PASS**.

### BLOCKED ? vorgeschriebene projektweite Gates

1. `docker compose exec -T team4sv30-frontend npm test -- --run`
   - **FAIL:** 16 Tests au?erhalb der sechs gr?nen Phase-119-Testdateien.
   - Beispiele: `src/lib/api.test.ts` (Runtime-Host statt relativer URL), f?nf `ReportModal.test.tsx`-Portal/Server-Renderer-F?lle, `src/app/me/profile/page.test.tsx` (Background-Crop-Fetch), `src/app/fansubs/__tests__/publicPageWidthContract.test.ts`, `useAdminAnimeCreateController.test.ts` (Runtime-Host statt localhost).
2. `docker compose exec -T team4sv30-backend go test ./...`
   - **FAIL:** `internal/config/TestLoad_FallsBackToLegacySMTPNames` erhielt `noreply@team4s.local`; `internal/migrations/TestPhase106MigrationBoundary` fand `/backend/internal/testsupport/phase106_postgres.go` im Container nicht.
   - Repository, Handler, Models und Services einschlie?lich Phase 119 waren gr?n.
3. `docker compose exec -T team4sv30-frontend npm run typecheck`
   - **FAIL ausschlie?lich in `.next/dev/types`:** vier bekannte generierte Routentypfehler f?r `/fansubs/[slug]` und `/members/[slug]`.
   - Kontrolllauf ohne stale `.next/dev/types`: **PASS**. Dies belegt generated-artifact drift statt eines Phase-119-Quellfehlers.
4. `docker compose exec -T team4sv30-frontend npm run build`
   - Erster Lauf: **FAIL** an denselben stale `.next/dev/types`.
   - Kontrolllauf ohne `.next/dev`: TypeScript und Kompilierung **PASS**, danach **FAIL** beim Prerender von `/_not-found` mit `TypeError: Cannot read properties of null (reading 'useEffect')`; zus?tzlich nicht-standardm??iges `NODE_ENV` und React-Key-Warnungen.
   - Der Production-Build ist unabh?ngig vom stale Type-Cache weiterhin nicht gr?n.

## Security-, Contract- und Seam-Bewertung

- HIGH T-119-01/T-119-02: fokussierte Handler-, Repository-, Contract- und MemberBadgeChain-Tests sind gr?n.
- Hidden `members_only`-Responses enthalten kein `badge_progress`; sichtbare Profile erhalten die Projektion erst nach dem bestehenden Sichtbarkeitsgate.
- `public_badges` und `badge_progress` bleiben getrennt; das Frontend erzeugt `Aktuell` nicht aus frei fabrizierten Clientdaten.
- Phase 119 f?hrte keine Migration, keinen neuen Endpoint, keinen API-Helper, keinen Fetch-/Bearer-/Refresh-Pfad und keine parallele Carousel-/Badge-Chain-Seam ein.
- Die ?ffentliche SSR-Route bleibt read-only und nutzt absichtlich keinen zentralen Browser-Refreshpfad.

## Environment-only Adjustments

- Kanonische OpenAPI-Dateien wurden ausschlie?lich ephemer in den laufenden Backend-Testcontainer kopiert.
- Stale `.next/dev/types` bzw. `.next/dev` wurden f?r Kontrolll?ufe ausschlie?lich im laufenden Frontend-Container tempor?r isoliert und danach wiederhergestellt.
- Der vom Build generierte Diff in `frontend/next-env.d.ts` wurde gezielt zur?ckgesetzt; Produktions-/Testquellen blieben unver?ndert.

## Required Corrective Scope

Ein separater Corrective Plan muss die projektweiten Frontend-Testfehler, die beiden Backend-Full-Suite-Fehler und den `/_not-found`-Prerenderfehler mit expliziter Dateiownership beheben oder die Compose-Verifikationsumgebung reproduzierbar korrigieren. Danach ist Task 1 vollst?ndig neu auszuf?hren; erst bei komplett gr?nem Gate darf Task 2 im gemeinsamen Codex-In-App-Browser beginnen.

## Live UAT

Nicht durchgef?hrt. Keine Route, kein Slug, kein Viewport, keine Eingabemethode und kein Reduced-Motion-Zustand wurden live freigegeben.

## Deviations from Plan

Keine Quellabweichungen. Nur ephemere Verifikationsumgebung wie oben dokumentiert.

## Self-Check: INCOMPLETE

- Evidenzdatei vorhanden.
- Task 1 nicht abgeschlossen.
