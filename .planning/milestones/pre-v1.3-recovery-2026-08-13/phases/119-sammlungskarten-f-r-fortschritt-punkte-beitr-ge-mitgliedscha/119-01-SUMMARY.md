---
phase: 119-sammlungskarten-f-r-fortschritt-punkte-beitr-ge-mitgliedscha
plan: "01"
subsystem: testing
tags: [vitest, go-test, accessibility, public-profile, contract-testing]
requires:
  - phase: 118-rollenfortschritt-als-eigene-card-je-tats-chlich-ausge-bter-
    provides: Rollen-Sammlungskarten und globale FocalCarousel-Basis
provides:
  - Erwartungsrote Familienresolver- und Sammlungskarten-Verträge
  - Erwartungsrote globale Carousel- und Zweitconsumer-Regressionsverträge
  - Erwartungsrote badge_progress-Sichtbarkeits- und Cross-Language-Verträge
affects: [119-02, 119-03, 119-04, member-profile, focal-carousel]
tech-stack:
  added: []
  patterns: [expected-red wave-zero tests, exact visibility contract, independent red-status gates]
key-files:
  created: []
  modified:
    - frontend/src/components/profile/memberBadgeLabels.test.ts
    - frontend/src/components/profile/MemberBadgeChain.test.tsx
    - frontend/src/components/ui/FocalCarousel.test.tsx
    - frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx
    - backend/internal/repository/member_profile_repository_postgres_test.go
    - backend/internal/repository/member_profile_contribution_badges_repository_test.go
    - backend/internal/handlers/app_public_profile_test.go
    - frontend/src/types/__tests__/v12-projection-contract.test.ts
key-decisions:
  - "Wave 0 bleibt strikt test-first: keine Produktionsimplementierung aus späteren Plänen."
  - "badge_progress bleibt additiv und getrennt von earned-only public_badges."
patterns-established:
  - "Expected-red gates prüfen Backend und Frontend unabhängig und lehnen Infrastrukturfehler ab."
requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-12, D-13, D-15, D-16]
duration: 16min
completed: 2026-08-03
---

# Phase 119 Plan 01: Test-first Vertragsfundament Summary

**Deterministische RED-Verträge für sechs Badge-Familien, Sammlungskarten, globale Carousel-Interaktion und die sichtbarkeitsgeschützte `badge_progress`-Projektion**

## Performance

- **Duration:** 16 min
- **Started:** 2026-08-03T12:49:00Z
- **Completed:** 2026-08-03T13:05:07Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Familienreihenfolge, Exactly-once-Codebesitz, numerische Stufen und Unknown-Special-Fallback sind als präzise RED-Assertions fixiert.
- Sammlungskarten decken authoritative Metriken, Singular/Plural, `Aktuell`, `Ausgewählt`, `Gesperrt`, Reset und inneres Auto-Centering ab.
- `FocalCarousel` deckt Quiet-One-Item, unabhängige Instanzen, Nested-Keyboard-Grenzen, Wheel-Endpunkte, Pointer-Cancel und Reduced Motion ab; `FansubProjectsGrid` bleibt als zweiter Consumer geschützt.
- Backend und Frontend definieren `badge_progress` mit exakten Sichtbarkeits- und Go/OpenAPI/TypeScript-Paritätsgrenzen.

## Task Commits

1. **Task 1: Kanonische Familien und Sammlungskarten** — `fae6620d`
2. **Task 2: Globales Carousel und zweiter Consumer** — `6d68dc6e`
3. **Task 3: Backendmetriken, Contract-Parität und Sichtbarkeit** — `fdccce50`

## Files Created/Modified

- `frontend/src/components/profile/memberBadgeLabels.test.ts` — Familienresolver-, Sortierungs- und Exactly-once-Vertrag.
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` — Sammlungskarten-, Auswahl-, Lock-, Fortschritts- und Stage-Strip-Vertrag.
- `frontend/src/components/ui/FocalCarousel.test.tsx` — globale Eingabe-, Fokus-, Motion- und Quiet-Mode-Verträge.
- `frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx` — expliziter Zweitconsumer-Regressionsschutz.
- `backend/internal/repository/member_profile_repository_postgres_test.go` — Projekt- und Mitgliedschaftsgrenzen der additiven Projektion.
- `backend/internal/repository/member_profile_contribution_badges_repository_test.go` — rohe Beitragsmetriken unter, an und über Schwellen.
- `backend/internal/handlers/app_public_profile_test.go` — Public-/members_only-Sichtbarkeitsgrenze für exakte Metriken.
- `frontend/src/types/__tests__/v12-projection-contract.test.ts` — exakte Cross-Language-Felder und Nullability.

## Decisions Made

- Der Plan liefert ausschließlich erwartungsrote Tests; GREEN-Implementierung gehört in die nachfolgenden Wave-Pläne.
- Unbekannte verdiente Codes werden künftig genau einmal als einstufige besondere Auszeichnung behandelt, ohne gesperrte Stufen zu erfinden.
- Exakte Metriken werden ausschließlich nach dem bestehenden Profil-Sichtbarkeitsgate projiziert.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Contract-Fixtures für den Frontend-Container bereitgestellt**
- **Found during:** Task 3
- **Issue:** Der bestehende Compose-Frontend-Container mountet nur `frontend/`; der bestehende Contract-Test liest jedoch `/shared/contracts/openapi.yaml`, und die neue Paritätsprüfung liest `/backend/internal/models/member_profile.go`.
- **Fix:** Die kanonischen Dateien wurden nur in den laufenden Testcontainer kopiert; keine Compose- oder Produktionsdatei wurde verändert.
- **Files modified:** Keine Repository-Dateien.
- **Verification:** Danach waren 5 bestehende Contract-Tests grün und nur die neue Phase-119-Assertion rot.
- **Committed in:** Nicht zutreffend (ephemere Verifikationsumgebung).

**2. [Rule 3 - Blocking] Backend-Testimage vor RED-Gate neu gebaut**
- **Found during:** Task 3
- **Issue:** Der Backend-Container bind-mountet den Quellbaum nicht und führte zunächst das alte Image aus.
- **Fix:** `docker compose up -d --build team4sv30-backend` aktualisierte ausschließlich die lokale Verifikationslaufzeit.
- **Files modified:** Keine Repository-Dateien.
- **Verification:** Backend scheitert danach nur an den neuen `badge_progress`-/`family`-/`complete`-Assertions.
- **Committed in:** Nicht zutreffend (ephemere Verifikationsumgebung).

**Total deviations:** 2 auto-fixed (2 Rule 3)
**Impact on plan:** Nur die Testumgebung wurde an den bereits geplanten Befehlsvertrag angepasst; der Produkt- und Dateiscope blieb unverändert.

## Verification Results

- Task 1 Frontend: erwartungsrot — 80 grün, 6 Phase-119-Assertions rot.
- Task 2 Frontend: erwartungsrot — 59 grün, 6 Phase-119-Assertions rot; `FansubProjectsGrid` grün.
- Task 3 Backend: erwartungsrot — ausschließlich fehlende `badge_progress`, `family`, `complete` und Public-Projektion.
- Task 3 Frontend Contract: erwartungsrot — 5 grün, 1 Phase-119-Paritätsassertion rot.
- `git diff --check`: bestanden nach jedem Task und final.

## TDD Gate Compliance

Die drei Tasks sind absichtlich RED-only gemäß Wave-0-Plan. Es existieren drei atomare `test(119-01)`-Commits; GREEN-/Refactor-Commits sind für diesen Plan ausdrücklich nicht vorgesehen.

## Known Stubs

None — es wurden ausschließlich ausführbare Vertragsfixtures und keine Produktionsstubs ergänzt.

## Issues Encountered

Keine fachlichen Blocker. Die beiden Compose-Sichtbarkeitsprobleme wurden als ephemere Testumgebungsabweichungen behoben.

## User Setup Required

None.

## Next Phase Readiness

Die nachfolgenden Implementierungspläne können die klar isolierten RED-Gates einzeln auf GREEN bringen. Die HIGH-Gates T-119-01 und T-119-02 sind testseitig fixiert und derzeit erwartungsgemäß noch rot.

## Self-Check: PASSED

- Alle acht geplanten Testdateien existieren.
- Alle drei Task-Commits sind im Git-Verlauf vorhanden.
- Keine Produktionsdatei aus späteren Waves wurde geändert.

---
*Phase: 119-sammlungskarten-f-r-fortschritt-punkte-beitr-ge-mitgliedscha*
*Completed: 2026-08-03*
