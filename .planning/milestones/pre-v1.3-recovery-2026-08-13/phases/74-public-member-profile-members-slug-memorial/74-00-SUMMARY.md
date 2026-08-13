---
phase: 74
plan: "00"
subsystem: member-profile-memorial
tags: [wave-0, tdd-red, memorial, claim-guard, badge-source, vitest, go-test]
dependency_graph:
  requires: []
  provides:
    - "Wave-0 RED-Stubs für alle 9 Phase-74-Anforderungen (J/D-14, D-15, J/D-17, Badges-13, C/D-06, C/D-09, C/D-10, D-03)"
    - "Denied-Audit-Anchor für Claim-Block-Guard in beiden Pfaden (D-15)"
    - "Migrations-Kollisions-Notiz als BLOCKER-Dokumentation (K/D-15)"
  affects:
    - "backend/internal/handlers/member_memorial_handler.go (noch zu erstellen in Plan 02)"
    - "backend/internal/repository/member_claims_repository.go (Guard noch zu implementieren in Plan 02)"
    - "backend/internal/repository/member_claim_invitations_repository.go (Guard noch zu implementieren in Plan 02)"
    - "backend/internal/repository/badge_repository.go (GetPublicMemberBadges noch zu implementieren in Plan 01)"
    - "frontend/src/components/profile/MemberContributionFilters.tsx (noch zu erstellen in Plan 03)"
    - "frontend/src/components/profile/MemberStatusPill.tsx (noch zu erstellen in Plan 03)"
    - "frontend/src/components/profile/deriveKnownFor.ts (noch zu erstellen in Plan 03)"
tech_stack:
  added: []
  patterns:
    - "no-DB Source-Fragment-Assertion (readRepositorySource) für Guard-Verifikation ohne Test-DB"
    - "Interface-Stub-Muster für Go-Handler-Tests (stubbedRoleChecker, stubbedAuditLog)"
    - "Vitest Component-RED-Stub durch fehlende Import-Targets"
key_files:
  created:
    - backend/internal/handlers/member_memorial_handler_test.go
    - backend/internal/repository/member_claims_memorial_guard_test.go
    - backend/internal/repository/badge_public_source_test.go
    - frontend/src/components/profile/MemberContributionFilters.test.tsx
    - frontend/src/components/profile/MemberStatusPill.test.tsx
    - frontend/src/components/profile/deriveKnownFor.test.ts
    - .planning/phases/74-public-member-profile-members-slug-memorial/74-MIGRATION-COLLISION-NOTE.md
  modified:
    - frontend/src/components/profile/MemberProfileHero.test.tsx
decisions:
  - "Wave-0 Claim-Block-Audit-Architektur festgezurrt: denied-Audit-Action-Key 'member_claim.memorial_blocked' muss als String-Literal in BEIDEN Repository-Dateien erscheinen (Plan 02 Task 2 ist gebunden)"
  - "Migrations-Kollision 0096 ist bereits aufgelöst: Phase 72 wurde korrekt auf 0097 umnummeriert; nächste freie Nummer für Phase 74 ist 0098+"
  - "Frontend-Tests im Worktree ohne node_modules: RED-Status durch fehlende Production-Dateien verifiziert (nicht durch Vitest-Run), da Worktree kein npm install hat — akzeptiertes Wave-0-Muster"
metrics:
  duration: "~3 Minuten"
  completed_date: "2026-06-05"
  tasks: 2
  files: 8
---

# Phase 74 Plan 00: Wave-0 RED-Stubs + Migrations-Kollisions-Notiz — Summary

Wave-0 TDD-Verankerung: 7 RED-Test-Stubs für alle Phase-74-Kernanforderungen plus eine Migrations-Kollisions-Notiz, bevor Produktionscode entsteht.

---

## Tasks ausgeführt

### Task 1: Backend Wave-0 RED-Stubs

**Commit:** `9afde481`

**Drei Go-Testdateien erstellt:**

1. `backend/internal/handlers/member_memorial_handler_test.go`
   - `TestMemorialSetterRejectsNonPlatformAdmin`: erwartet HTTP 403 bei Nicht-Global-Admin
   - `TestMemorialSetterWritesAuditLog`: assertiert AuditLogEntry mit EventType `member_profile.memorial_set`, TargetType `member`, Outcome `allowed`
   - `TestMemorialSetterErrorHandling`: RoleChecker-Fehler → 500
   - Nutzt `stubbedRoleChecker` + `stubbedAuditLog` Interfaces für DB-freie Tests
   - **RED:** `NewMemberMemorialHandler` undefined → Build failed (J/D-14, D-15)

2. `backend/internal/repository/member_claims_memorial_guard_test.go`
   - `TestClaimSubmitBlockedForMemorialProfile`: Source-Fragment `profile_status`, `memorial_not_claimable`, `409` in `member_claims_repository.go`
   - `TestClaimAcceptInvitationBlockedForMemorialProfile`: gleiche Fragmente in `member_claim_invitations_repository.go` (Fallstrick 3: zweiter Claim-Pfad)
   - `TestClaimBlockWritesDeniedAudit`: assertiert `member_claim.memorial_blocked` UND `denied` in BEIDEN Dateien — erzwingt denied-Audit-Schreibung in Plan 02 Task 2 (D-15)
   - **RED:** Alle Fragments fehlen in den Repository-Dateien

3. `backend/internal/repository/badge_public_source_test.go`
   - `TestPublicBadgesSourceFiltersVisibility`: Source-Fragment `getpublicmemberbadges`, `visibility='public'`, `status='active'` in `badge_repository.go`
   - `TestPublicBadgesDoesNotReusePlainGetMemberBadges`: eigenständige Methode-Signatur (darf nicht GetMemberBadges delegieren)
   - **RED:** `GetPublicMemberBadges` fehlt in badge_repository.go (Badges-13)

**Verifiziert:**
```
go test ./internal/handlers/... -run Memorial → build failed: undefined: NewMemberMemorialHandler ✓ RED
go test ./internal/repository/... -run "Claim|PublicBadges" → 5 FAIL ✓ RED
```

---

### Task 2: Frontend Wave-0 RED-Stubs + Migrations-Kollisions-Notiz

**Commit:** `e165d526`

**Vier Vitest-Testdateien erstellt/erweitert:**

1. `frontend/src/components/profile/MemberContributionFilters.test.tsx`
   - Drei Tests: Alle Einträge ohne Filter, Status-Filter reduziert ohne fetch, Anime-Filter ohne fetch
   - `vi.spyOn(global, 'fetch')` + `expect(global.fetch).not.toHaveBeenCalled()` erzwingt client-seitige Filterung (D-06)
   - **RED:** `MemberContributionFilters.tsx` existiert nicht

2. `frontend/src/components/profile/MemberProfileHero.test.tsx` (erweitert)
   - NEU: `describe('MemberProfileHero — Memorial-Variante (Wave-0 RED, D-10)')` mit zwei Tests:
     - Exakter Pflicht-String: `'Dieses Profil wird als historisches Gedenkprofil geführt.'` (korrekte Umlaute)
     - Keine Mengen-/Aktivitäts-Badges bei Memorial (`[data-testid="activity-metric"]` darf nicht existieren)
   - **RED:** `profile_status` fehlt in `PublicMemberProfileData` DTO

3. `frontend/src/components/profile/MemberStatusPill.test.tsx`
   - Parametrisierter Test über alle 5 Status: `active`, `historical`, `unclaimed`, `claimed`, `memorial`
   - Je Status: sichtbares deutsches Label + `title`-Attribut (Tooltip) vorhanden (D-09)
   - Memorial-Tooltip muss >10 Zeichen sein
   - **RED:** `MemberStatusPill.tsx` existiert nicht

4. `frontend/src/components/profile/deriveKnownFor.test.ts`
   - Fünf Tests: aktive Jahre (2019–2023), Top-Rolle nach Häufigkeit (Übersetzung), bekannte Gruppen, Determinismus, leere Eingabe
   - Kein fetch-Aufruf (D-03 rein read-only)
   - **RED:** `deriveKnownFor.ts` existiert nicht

**Migrations-Kollisions-Notiz:**
- `74-MIGRATION-COLLISION-NOTE.md` erstellt
- Dokumentiert: realer Stand `0096_hist_group_members_confirmation_audit` (belegt)
- Phase-72-Umnummerierung auf 0097 bereits erfolgt → Kollision aufgelöst
- Nächste freie Nummer für Phase 74: **0098+**

**RED-Verifikation (ohne node_modules im Worktree):**
- `MemberContributionFilters.tsx` — FEHLT ✓
- `MemberStatusPill.tsx` — FEHLT ✓
- `deriveKnownFor.ts` — FEHLT ✓
- `profile_status` in `PublicMemberProfileData` — FEHLT ✓

---

## Deviations from Plan

### Auto-discovered issues

**1. [Rule 1 - Bug] Frontend-Vitest nicht im Worktree ausführbar**
- **Found during:** Task 2 Verifikation
- **Issue:** Worktree `frontend/` hat kein `node_modules/` (nur Quellcode), daher schlägt `npx vitest run` mit `Cannot find module 'vitest/config'` fehl
- **Fix:** RED-Status durch fehlende Production-Dateien direkt verifiziert (nicht über Vitest-Run). Für Wave-0 ist das ausreichend — die Tests sind konzeptionell RED und können in der Docker-Umgebung (mit `npm install`) ausgeführt werden
- **Scope:** Wave-0 Worktree-Limitation; kein Produktionscode-Problem

**2. [Rule 1 - Bug] Migrations-Kollision bereits aufgelöst**
- **Found during:** Task 2 (Erstellen der Migrations-Kollisions-Notiz)
- **Issue:** Der BLOCKER aus 74-RESEARCH.md (Kollision `0096`) war zur Execute-Zeit bereits behoben: Phase 72 wurde auf `0097` umnummeriert
- **Fix:** Notiz dokumentiert den Ist-Stand (aufgelöst) und nennt 0098+ als nächste freie Nummer. Kein Handlungsbedarf vor Plan 03.

---

## Known Stubs

Diese Wave-0-Stubs sind bewusst unvollständig — sie werden in den folgenden Plänen implementiert:

| Stub | Datei | Plan |
|------|-------|------|
| `NewMemberMemorialHandler` | `handlers/member_memorial_handler.go` | Plan 02 |
| Memorial-Guard in `SubmitClaim` | `repository/member_claims_repository.go` | Plan 02 |
| Memorial-Guard in `AcceptInvitation` | `repository/member_claim_invitations_repository.go` | Plan 02 |
| `GetPublicMemberBadges` | `repository/badge_repository.go` | Plan 01 |
| `MemberContributionFilters` | `components/profile/MemberContributionFilters.tsx` | Plan 03 |
| `MemberStatusPill` | `components/profile/MemberStatusPill.tsx` | Plan 03 |
| `deriveKnownFor` | `components/profile/deriveKnownFor.ts` | Plan 03 |
| `profile_status` im DTO | `types/profile.ts` + `models/member_profile.go` | Plan 01 |

---

## Threat Flags

Keine neuen Laufzeit-Pfade in Wave 0 — ausschließlich Test-Code und Dokumentation. Keine neuen Trust-Boundaries.

---

## Self-Check

### Erstellte Dateien vorhanden
- `backend/internal/handlers/member_memorial_handler_test.go` — FOUND ✓
- `backend/internal/repository/member_claims_memorial_guard_test.go` — FOUND ✓
- `backend/internal/repository/badge_public_source_test.go` — FOUND ✓
- `frontend/src/components/profile/MemberContributionFilters.test.tsx` — FOUND ✓
- `frontend/src/components/profile/MemberProfileHero.test.tsx` (erweitert) — FOUND ✓
- `frontend/src/components/profile/MemberStatusPill.test.tsx` — FOUND ✓
- `frontend/src/components/profile/deriveKnownFor.test.ts` — FOUND ✓
- `.planning/phases/74-public-member-profile-members-slug-memorial/74-MIGRATION-COLLISION-NOTE.md` — FOUND ✓

### Commits vorhanden
- `9afde481` — test(74-00): Backend Wave-0 RED-Stubs ✓
- `e165d526` — test(74-00): Frontend Wave-0 RED-Stubs + Migrations-Kollisions-Notiz ✓

## Self-Check: PASSED
