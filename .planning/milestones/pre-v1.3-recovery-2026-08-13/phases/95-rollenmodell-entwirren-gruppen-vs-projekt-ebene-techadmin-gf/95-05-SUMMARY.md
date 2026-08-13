---
phase: 95-rollenmodell-entwirren-gruppen-vs-projekt-ebene-techadmin-gf
plan: "05"
subsystem: frontend
tags: [typescript, nextjs, react, fansub, roles, api-client, vitest]

dependency_graph:
  requires:
    - phase: 95-02
      provides: GET /admin/fansub-group-roles Endpunkt, FansubGroupRoleItem-Response-Shape
  provides:
    - FansubGroupRoleCode mit techadmin+gfxler in frontend/src/types/fansub.ts
    - FansubGroupRoleItem-Interface in fansub.ts
    - FANSUB_GROUP_ROLE_OPTIONS Label fansub_lead = 'Gruppenleitung' (D-05)
    - listFansubGroupRoles() in frontend/src/lib/api.ts
    - FansubAppMemberAddModal mit roleOptions-Prop statt Konstante
    - FansubAppMembersSection mit API-getriebenem Laden + fail-soft Fallback
    - RoleCapabilityDetail useMemo + CATEGORY_ORDER deterministische Reihenfolge (D-17)
  affects:
    - 95-06 (Human-Verify — Schritt 10 prüft techadmin+gfxler im Add-Pfad)

tech-stack:
  added: []
  patterns:
    - API-getriebene Rollenoptionen mit statischem Fallback (fail-soft via items.length > 0 Guard)
    - roleOptions-Prop statt Import-Konstante in Modal-Komponenten
    - useEffect mit cancelled-Flag und leerem Dependency-Array für einmaligen Mount-Load
    - useMemo + CATEGORY_ORDER-Array für deterministische UI-Reihenfolge

key-files:
  created:
    - frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.test.tsx
  modified:
    - frontend/src/types/fansub.ts
    - frontend/src/lib/api.ts
    - frontend/src/components/contributions/contributionRoles.ts
    - frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberAddModal.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx

key-decisions:
  - "listFansubGroupRoles() bei leerer API-Antwort ignoriert (items.length > 0) — Fallback FANSUB_GROUP_ROLE_OPTIONS bleibt aktiv wenn Backend noch nicht bereit ist; verhindert stummes Leeren der Rollenliste in Tests und Staging"
  - "FansubAppMemberAddModal bekommt roleOptions als Prop (nicht per Context/Hook) — Trennung: Section kennt die Ladepolitik, Modal ist rein darstellend"
  - "FansubAppMembersSection.test.tsx: listFansubGroupRoles + listGroupHistoryRoleDefinitions zum Mock ergänzt — beide wurden durch neue useEffect/Import-Abhängigkeiten von FansubAppMembersSection/GroupMembersTab benötigt"

requirements-completed: [D-01, D-04, D-05, D-12, D-17]

duration: 25min
completed: "2026-06-30"
---

# Phase 95 Plan 05: Frontend-Typen, API-Helper, Consumer-Verdrahtung (D-05/D-12/D-17) — Zusammenfassung

**FansubGroupRoleCode um techadmin/gfxler erweitert, listFansubGroupRoles()-Helper hinzugefügt, Add-Pfad API-getrieben verdrahtet mit fail-soft Fallback, RoleCapabilityDetail mit deterministischer Kategorie-Reihenfolge (D-17)**

## Performance

- **Duration:** 25 min
- **Started:** 2026-06-30T17:00:00Z (Continuation — Task 1 war bereits committed)
- **Completed:** 2026-06-30T19:11:55Z
- **Tasks:** 2 (Task 1 bereits committed vor Continuation; Task 2 in diesem Lauf abgeschlossen)
- **Files modified:** 7 Produktionsdateien + 1 Testdatei

## Accomplishments

- Typ-Erweiterung fansub.ts: `FansubGroupRoleCode` kennt `techadmin` und `gfxler`; `FansubGroupRoleItem`-Interface für API-Response; Label `fansub_lead` = 'Gruppenleitung' (D-05)
- API-Helper: `listFansubGroupRoles()` in api.ts ruft GET /api/v1/admin/fansub-group-roles auf (D-12)
- Consumer-Verdrahtung: `FansubAppMembersSection` lädt Rollenoptionen per API beim Mount; Fallback auf `FANSUB_GROUP_ROLE_OPTIONS` bei Fehler oder leerer Antwort; `roleOptions`-Prop an `FansubAppMemberAddModal` (D-12)
- `FansubAppMemberAddModal` nutzt jetzt `roleOptions`-Prop statt hartkodierter Konstante — kein `FANSUB_GROUP_ROLE_OPTIONS`-Import mehr
- `project_manager` aus `components/contributions/contributionRoles.ts` entfernt (D-04)
- `RoleCapabilityDetail.tsx` mit `useMemo` + `CATEGORY_ORDER=['gruppe','projekt','release']` für deterministische Accordion-Reihenfolge (D-17)
- Alle Tests grün: 8/8 Tests in FansubAppMember* + RoleCapabilityDetail-Test PASS

## Task Commits

1. **Task 1: Wave-0-Test D-17 + RoleCapabilityDetail useMemo + fansub.ts + api.ts + contributionRoles** - `2de98900` (feat)
2. **Task 2: Consumer-Verdrahtung D-12 (roleOptions-Prop + API-Laden)** - `fee404d7` (feat)

**Plan-Metadaten:** folgt in diesem Commit (docs)

## Files Created/Modified

- `frontend/src/types/fansub.ts` — FansubGroupRoleCode +techadmin/+gfxler, FansubGroupRoleItem-Interface, Label fansub_lead = 'Gruppenleitung'
- `frontend/src/lib/api.ts` — listFansubGroupRoles()-Helper
- `frontend/src/components/contributions/contributionRoles.ts` — project_manager entfernt (D-04)
- `frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.tsx` — useMemo + CATEGORY_ORDER (D-17)
- `frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.test.tsx` — TestKategorieReihenfolge gruppe→projekt→release (erstellt)
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberAddModal.tsx` — roleOptions-Prop statt FANSUB_GROUP_ROLE_OPTIONS-Import
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx` — listFansubGroupRoles() useEffect + Fallback + roleOptions-Prop weiterreichen
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx` — listFansubGroupRoles + listGroupHistoryRoleDefinitions gemockt; Label-Erwartung aktualisiert

## Decisions Made

- **items.length > 0 Guard:** Leere API-Antwort ignoriert — Fallback `FANSUB_GROUP_ROLE_OPTIONS` bleibt aktiv, damit Tests (Mock → `[]`) und Staging (Backend noch nicht gerebaut) die Rollenliste nicht verlieren
- **roleOptions als Prop:** Modal bleibt darstellungsrein; Section hält Ladepolitik und Fallback
- **Test-Mock-Ergänzung:** Beide neu benötigten API-Funktionen (`listFansubGroupRoles`, `listGroupHistoryRoleDefinitions`) in den Section-Test-Mock aufgenommen

## Deviations from Plan

### Auto-fixed Issues

**1. [Regel 1 - Bug] Test-Mock fehlte listFansubGroupRoles**
- **Found during:** Task 2 (Verifikation nach Commit)
- **Issue:** `FansubAppMembersSection.test.tsx` enthielt kein `listFansubGroupRoles` im `vi.mock("@/lib/api",...)`-Block; Vitest warf `No "listFansubGroupRoles" export is defined on the mock`
- **Fix:** `const listFansubGroupRoles = vi.fn()` deklariert, im Mock-Objekt ergänzt, in `beforeEach` mit `mockResolvedValue([])` initialisiert
- **Files modified:** `FansubAppMembersSection.test.tsx`
- **Verification:** 8/8 Tests grün
- **Committed in:** `fee404d7` (Task-2-Commit)

**2. [Regel 1 - Bug] Test-Mock fehlte listGroupHistoryRoleDefinitions**
- **Found during:** Task 2 (nach erstem Mock-Fix noch 5 Tests rot)
- **Issue:** `GroupMembersTab` (als Kindkomponente in `FansubAppMembersSection` gerendert) importiert `listGroupHistoryRoleDefinitions` aus `@/lib/api`; fehlte im Mock → gleiche Vitest-Fehlermeldung
- **Fix:** Analog zu listFansubGroupRoles in Mock und beforeEach ergänzt
- **Files modified:** `FansubAppMembersSection.test.tsx`
- **Verification:** 8/8 Tests grün
- **Committed in:** `fee404d7` (Task-2-Commit)

**3. [Regel 1 - Bug] Test-Erwartung Label "Fansub-Lead" nach D-05-Umbenennung veraltet**
- **Found during:** Task 2 (nach Mock-Fixes noch 4 Tests rot)
- **Issue:** Test in Zeile 210 suchte `screen.getAllByText("Fansub-Lead")` — nach Task 1 heißt das Label nun "Gruppenleitung" (D-05); der Fallback `FANSUB_GROUP_ROLE_OPTIONS` liefert jetzt "Gruppenleitung"
- **Fix:** Erwartung auf `"Gruppenleitung"` aktualisiert
- **Files modified:** `FansubAppMembersSection.test.tsx`
- **Verification:** 8/8 Tests grün
- **Committed in:** `fee404d7` (Task-2-Commit)

**4. [Regel 1 - Bug] Leere API-Antwort überschrieb Fallback**
- **Found during:** Task 2 (Tests nach Mock-Fix: Rollenchips fehlten im DOM)
- **Issue:** Mock gibt `listFansubGroupRoles` mit `[]` zurück; Code ohne Guard rief `setRoleOptions([])` auf und leerte die Chip-Leiste; Tests konnten keine `Editing`-Buttons mehr finden
- **Fix:** `if (!cancelled && items.length > 0)` Guard vor `setRoleOptions` — leere Antwort ignorieren, Fallback bleibt aktiv
- **Files modified:** `FansubAppMembersSection.tsx`
- **Verification:** 8/8 Tests grün; Fallback-Semantik korrekt dokumentiert
- **Committed in:** `fee404d7` (Task-2-Commit)

---

**Total deviations:** 4 auto-fixed (alle Regel 1 — Bugs durch Task-2-Änderungen ausgelöst)
**Impact on plan:** Alle Fixes nötig für Test-Korrektheit und Fallback-Semantik. Kein Scope-Creep.

## Issues Encountered

Keine über die dokumentierten Deviations hinaus.

## User Setup Required

Keine — reine Frontend-Änderung. Der Backend-Endpunkt GET /admin/fansub-group-roles existiert seit Plan 95-02; Frontend nutzt ihn fail-soft (Fallback aktiv solange Backend nicht neu gebaut ist).

## Known Stubs

Keine — alle Implementierungen vollständig. Rollenchips erscheinen sowohl API-getrieben (wenn Backend erreichbar) als auch aus statischem Fallback (wenn nicht).

## Threat Flags

Keine neuen Sicherheitsflächen. `listFansubGroupRoles()` nutzt `authorizedFetch` mit Bearer-Token (T-95-05-ID mitigiert). Fail-soft Fallback verhindert DoS durch API-Fehler (T-95-05-DoS mitigiert).

## Next Phase Readiness

- Plan 95-05 vollständig abgeschlossen — alle 7 Frontend-Dateien geliefert
- Plan 95-06 (Human-Verify) kann Schritt 10 live testen: techadmin+gfxler erscheinen im Add-Modal API-getrieben
- Backend-Rebuild nötig damit `listFansubGroupRoles()` die DB-Daten statt Fallback liefert

---
*Phase: 95-rollenmodell-entwirren-gruppen-vs-projekt-ebene-techadmin-gf*
*Completed: 2026-06-30*
