---
phase: 82-mitwirkende-projektweit-zuordnen-und-leader-abdeckungs-matri
plan: "06"
subsystem: frontend
tags:
  - frontend
  - tests
  - vitest
  - routing
  - badges
  - standard-team
  - cockpit
dependency_graph:
  requires:
    - 82-05
  provides:
    - Vitest-Tests für parseMainTab + MAIN_TABS (D-13)
    - Vitest-Tests für ProjectCockpitBadges-Render-Logik
    - Vitest-Tests für DefaultCrewManager apply-Verdrahtung
    - mainTabRouting.ts als exportiertes Routing-Modul
  affects:
    - frontend/src/app/admin/fansubs/[id]/edit/
tech_stack:
  added: []
  patterns:
    - mainTabRouting.ts: parseMainTab + MAIN_TABS ausgelagert für Testbarkeit ohne page.tsx-Kontext
    - vi.mock für Cockpit-Unterkomponenten in page.test.tsx (keine echten API-Calls im Test)
    - Direkte Komponenten-Unit-Tests für Badge-Logik und DefaultCrewManager
key_files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/mainTabRouting.ts
    - frontend/src/app/admin/fansubs/[id]/edit/ProjectCockpitBadges.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/DefaultCrewManager.test.tsx
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
decisions:
  - parseMainTab + MAIN_TABS in mainTabRouting.ts ausgelagert statt page.tsx direkt zu importieren; "use client" Next.js Pages eignen sich nicht als Testmodul-Imports für isolierte Unit-Tests
  - Bestehende Cockpit-Komponenten (DefaultCrewManager, AnimeReleasesFilterBar, CoverageMatrix, AnimeProjectNoteWorkspace) in page.test.tsx gemockt statt echte API-Calls zuzulassen
  - 'Anime-Einblicke'-Tab-Assertion in page.test.tsx durch D-13-Assertion ersetzt (queryByRole erwartet null)
  - DefaultCrewManager-Button-Test prüft disabled=true bei leerer Crew — das ist kein toter Button sondern korrektes UX (D-04)
metrics:
  duration: "~15min"
  completed: "2026-06-11"
  tasks_completed: 1
  tasks_total: 2
  files_created: 3
  files_modified: 2
---

# Phase 82 Plan 06: Tests + Human-Verify-Checkpoint

Vitest-Tests für parseMainTab-Routing, MAIN_TABS-Bereinigung, ProjectCockpitBadges-Render-Logik und DefaultCrewManager-API-Verdrahtung. Alle 90 Tests grün; Human-UAT steht noch aus.

## Tasks

### Task 1 — Vitest-Tests: parseMainTab, MAIN_TABS, ProjectCockpitBadges, DefaultCrewManager (commit: 468bc52e)

**Neue Dateien:**

- **mainTabRouting.ts**: `parseMainTab` + `MAIN_TABS` aus `page.tsx` extrahiert und exportiert. Ermöglicht Unit-Tests ohne den gesamten page.tsx-Kontext (next/navigation, React, API).
- **ProjectCockpitBadges.test.tsx**: 6 Tests — contributionCount=0 → "Mitwirkende fehlen" (danger), contributionCount=3 → "Mitwirkende (3)" (neutral), note=null → "Einblick fehlt" (warning), note={...} → "Einblick vorhanden" (success), note=undefined → kein Einblick-Badge, kein "Folgen"-Text im Output (D-12).
- **DefaultCrewManager.test.tsx**: 4 Tests — EmptyState bei leerer Crew, Button sichtbar und korrekt deaktiviert bei leerer Crew (D-04: kein toter Button), applyDefaultCrew aufgerufen + "2 Contributions angelegt." nach Klick, Crew-Einträge sichtbar nach Laden.

**Reparaturen in page.test.tsx (Rule 1 — bestehende Tests brachen durch 82-05-Änderungen):**

- Fehlende API-Mocks ergänzt: `listUnifiedGroupMembers`, `listAnimeContributions`, `getAnimeFansubProjectNote`, `upsertAnimeFansubProjectNote`, `applyDefaultCrew`, `listDefaultCrew`, `upsertDefaultCrewEntry`, `deleteDefaultCrewEntry`
- `animeProjectSectionProps`-Deklaration entfernt (nicht mehr benötigt nach Tab-Merge)
- Cockpit-Unterkomponenten gemockt: `AnimeReleasesFilterBar`, `AnimeProjectNoteWorkspace`, `CoverageMatrix`, `DefaultCrewManager`
- Test "passes token-free access state into child sections": `fireEvent.click('Anime-Einblicke')` ersetzt durch `expect(screen.queryByRole('button', { name: 'Anime-Einblicke' })).toBeNull()` (D-13)
- `parseMainTab`/`MAIN_TABS`-Import aus `mainTabRouting.ts`; 7 Tests in neuem `describe`-Block

**Änderungen in page.tsx:**

- Import von `MAIN_TABS`, `parseMainTab`, `MainTab as MainTabType` aus `./mainTabRouting`
- Lokale `MAIN_TABS`-Konstante und `parseMainTab`-Funktion entfernt (jetzt aus Modul importiert)
- `type MainTab = MainTabType` als Typ-Alias beibehalten (Kompatibilität mit den lokalen Switch-Cases)

### Task 2 — Human-UAT (ausstehend — Checkpoint)

Human-UAT auf Dev-Server :3000 steht aus. Checkpoint-Signal wird zurückgegeben.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] page.test.tsx brach durch 82-05-Änderungen (fehlende API-Mocks + gelöschter Tab)**
- **Found during:** Task 1 — Vitest-Ausführung vor Schreiben der neuen Tests
- **Issue:** page.tsx importiert nach 82-05 `listUnifiedGroupMembers`, Cockpit-Komponenten laden `getAnimeFansubProjectNote` / `applyDefaultCrew` etc. — alles fehlte im Test-Mock. Außerdem klickte der Test noch auf 'Anime-Einblicke' (Tab existiert nicht mehr)
- **Fix:** Fehlende Mocks ergänzt; Cockpit-Unterkomponenten gemockt; Tab-Assertion repariert
- **Files modified:** `page.test.tsx`
- **Commit:** 468bc52e

**2. [Rule 1 - Bug] parseMainTab/MAIN_TABS nicht direkt testbar (nicht exportiert in page.tsx)**
- **Found during:** Task 1 — parseMainTab ist eine nicht-exportierte Funktion in einer "use client" Page
- **Issue:** Direkter Import von page.tsx für Unit-Tests würde den gesamten Next.js-Page-Kontext laden
- **Fix:** `mainTabRouting.ts` als kleines Routing-Modul extrahiert; page.tsx importiert daraus
- **Files modified:** `page.tsx`, neues `mainTabRouting.ts`
- **Commit:** 468bc52e

## Known Stubs

Die Stubs aus 82-05 bestehen weiterhin:

- **CoverageMatrix `coveredRoleCodes`**: Alle Zeilen erhalten `coveredRoleCodes: []` (leeres Array). Tests enthalten keine Assertions über echte Coverage-Zahlen.
- **ProjectCockpitBadges `contributionCount=0` / `note=undefined`**: Lazy-Load ist noch nicht implementiert. Tests prüfen die Komponenten-Logik (Badge-Variant je Prop-Wert), nicht Live-Daten.

## Threat Flags

Keine neuen Sicherheitsflächen — nur Test-Dateien hinzugefügt.

## Self-Check: PASSED

- [x] `mainTabRouting.ts` — vorhanden (38 Zeilen, ≤ 450)
- [x] `ProjectCockpitBadges.test.tsx` — vorhanden (74 Zeilen, ≤ 450)
- [x] `DefaultCrewManager.test.tsx` — vorhanden (83 Zeilen, ≤ 450)
- [x] Commit 468bc52e — Task 1 (Tests + Routing-Extraktion)
- [x] `npx vitest run src/app/admin/fansubs` → 90 Tests, 14 Dateien, 0 FAIL
- [x] `npm run typecheck` → 0 Fehler
- [x] Task 2 (Human-UAT) — Checkpoint, noch ausstehend
