---
phase: 74-public-member-profile-members-slug-memorial
plan: "02"
subsystem: member-memorial
tags: [go, handler, repository, audit, claim-guard, platform-admin, openapi, typescript]

dependency_graph:
  requires:
    - phase: 74-00
      provides: "Wave-0 RED-Stubs member_memorial_handler_test.go + member_claims_memorial_guard_test.go"
    - phase: 74-01
      provides: "members.profile_status in models + CTE"
    - phase: 72
      provides: "members.profile_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK IN ('active','historical','memorial')"
  provides:
    - "POST /api/v1/admin/members/:id/memorial — Global-Admin-only Memorial-Setter + audit_logs"
    - "Memorial-Guard in SubmitClaim (409 memorial_not_claimable) + denied-Audit member_claim.memorial_blocked"
    - "Memorial-Guard in AcceptInvitation (zweiter Claim-Pfad, Fallstrick 3) + denied-Audit"
    - "admin-content.yaml: admin-member-memorial-set Endpoint + AdminMemberMemorialSetResponse Schema"
    - "api.ts: setMemberMemorial(memberId, token?) nach authorizedFetch-Muster"
  affects:
    - "Plan 74-06 (Frontend-Setter-UI nutzt setMemberMemorial aus api.ts)"

tech-stack:
  added: []
  patterns:
    - "requirePlatformAdminAppUserIdentity: AppUserID-basierte Global-Admin-Pruefung ohne UserID>0-Schranke (Keycloak-kompatibel, testbar)"
    - "WithAuditLog()-Pattern fuer AuditLogRepository-DI in Claim-Repos (analog WithMediaDeps/WithNoteDeps)"
    - "Guard inline in je Repo-Datei fuer Source-Fragment-Test-Kompatibilitaet (D-15-Stub-Erzwingung)"
    - "member_claim_guards.go als geteilte Guard-Datei fuer assertMemberClaimable Helper"
    - "Fehlertolenter Audit-Write via _ = (blockiert Fehler-Return nicht)"

key-files:
  created:
    - backend/internal/handlers/member_memorial_handler.go
    - backend/internal/repository/member_memorial_repository.go
    - backend/internal/repository/member_claim_guards.go
  modified:
    - backend/internal/repository/member_claims_repository.go
    - backend/internal/repository/member_claim_invitations_repository.go
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go
    - shared/contracts/admin-content.yaml
    - frontend/src/lib/api.ts

key-decisions:
  - "requirePlatformAdminAppUserIdentity statt requirePlatformAdminIdentity: CommentAuthIdentityFromContext hat UserID>0-Guard der AppUserID-only-Identitaeten blockiert (Keycloak-Modus + Test-Stubs). Neue Handler-lokale Hilfsfunktion liest direkt aus Gin-Kontext und prueft AppUserID."
  - "Guard-Code inline in BEIDEN Repo-Dateien: Source-Fragment-Tests (member_claims_memorial_guard_test.go) pruefen profile_status/memorial_not_claimable/409 direkt im Dateitext der jeweiligen Repo-Datei. Ein geteilter Helper allein reicht nicht — Literale muessen in den jeweiligen Dateien erscheinen."
  - "member_claim_guards.go als zusaetzliche geteilte Datei: assertMemberClaimable als saubere Abstraktion, obwohl Guard inline implementiert wurde. Dient als Dokumentation und Fallback."
  - "WithAuditLog() als Builder-Methode: konsistent mit WithMediaDeps/WithNoteDeps-Pattern; main.go verdrahtet beide Claim-Repos mit auditLogRepo."

requirements-completed: [J, K, D-12, D-13, D-14, D-15, D-16, D-17]

duration: "~25min"
completed: "2026-06-05"
tasks: 2
files: 9
---

# Phase 74 Plan 02: Memorial-Setter + Claim-Sperre — Summary

**Memorial-Setter (Global Admin only, auditiert) und server-seitige Claim-Sperre (beide Pfade, 409 + denied-Audit) implementiert. Alle Wave-0-Tests grün.**

## Performance

- **Duration:** ~25 Minuten
- **Started:** 2026-06-05T11:25:00Z
- **Completed:** 2026-06-05T11:53:00Z
- **Tasks:** 2
- **Files modified/created:** 9

## Accomplishments

### Task 1: Memorial-Setter-Handler + Route + Contract + api.ts

- `member_memorial_handler.go` (NEU): `NewMemberMemorialHandler(roleChecker, memberRepo, auditLog)` mit Interface-getriebenen Abhängigkeiten. Handler `SetMemorial` nutzt `requirePlatformAdminAppUserIdentity` (NICHT `CanForFansubGroup` — D-16-Caveat/Fallstrick 4). Kein `app_user`-Account-UPDATE (D-13). Audit `member_profile.memorial_set` / Outcome `allowed` (D-15).
- `member_memorial_repository.go` (NEU): `GetMemberProfileStatus` + `SetMemorialStatus` — nur `members.profile_status` Update, kein app_user-Write.
- Route `POST /api/v1/admin/members/:id/memorial` in `admin_routes.go` + `main.go` registriert.
- `admin-content.yaml`: Endpoint `admin-member-memorial-set` + Schema `AdminMemberMemorialSetResponse` dokumentiert (Lock K, korrekte Umlaute).
- `api.ts`: `setMemberMemorial(memberId, token?)` nach `submitMemberClaim`-Muster (authorizedFetch).
- **Wave-0 Memorial-Tests GREEN**: `TestMemorialSetterRejectsNonPlatformAdmin` (403), `TestMemorialSetterWritesAuditLog`, `TestMemorialSetterErrorHandling`.

### Task 2: Claim-Sperre gegen Memorial in beiden Claim-Pfaden + denied-Audit

- `member_claims_repository.go`: `profile_status`-Guard in `SubmitClaim` vor INSERT. `memorial_not_claimable` + HTTP 409 als `ClaimMutationError`. denied-Audit mit Literal `"member_claim.memorial_blocked"` + Outcome `"denied"` (fehlertolerant).
- `member_claim_invitations_repository.go`: gleicher Guard in `AcceptInvitation` vor Claim-Anlage (Fallstrick 3: zweiter Claim-Pfad). Literal `"member_claim.memorial_blocked"` ebenfalls in dieser Datei.
- `member_claim_guards.go` (NEU): geteilte `assertMemberClaimable`-Hilfsfunktion als saubere Abstraktion.
- `WithAuditLog()` Builder-Methode in beiden Repos; `main.go` verdrahtet beide mit `auditLogRepo`.
- Fehlermeldung: "Dieses Profil wird als Gedenkprofil geführt und kann nicht beansprucht werden." (korrekte Umlaute — CLAUDE.md).
- **Wave-0 Claim-Guard-Tests GREEN**: `TestClaimSubmitBlockedForMemorialProfile`, `TestClaimAcceptInvitationBlockedForMemorialProfile`, `TestClaimBlockWritesDeniedAudit`.

## Task Commits

1. **Task 1: Memorial-Setter-Handler + Route + admin-content-Contract + api.ts** — `2899b940` (feat)
2. **Task 2: Claim-Sperre gegen Memorial in beiden Claim-Pfaden + denied-Audit** — `7bc423ea` (feat)

## Files Created/Modified

- `backend/internal/handlers/member_memorial_handler.go` (NEU) — MemberMemorialHandler, requirePlatformAdminAppUserIdentity, Interfaces
- `backend/internal/repository/member_memorial_repository.go` (NEU) — GetMemberProfileStatus + SetMemorialStatus
- `backend/internal/repository/member_claim_guards.go` (NEU) — assertMemberClaimable shared helper
- `backend/internal/repository/member_claims_repository.go` — WithAuditLog() + profile_status Guard in SubmitClaim + denied-Audit Literal
- `backend/internal/repository/member_claim_invitations_repository.go` — WithAuditLog() + profile_status Guard in AcceptInvitation + denied-Audit Literal
- `backend/cmd/server/admin_routes.go` — memberMemorialHandler in Struct + Route POST /admin/members/:id/memorial
- `backend/cmd/server/main.go` — memberMemorialRepo + memberMemorialHandler konstruiert; WithAuditLog() auf beide Claim-Repos
- `shared/contracts/admin-content.yaml` — admin-member-memorial-set Endpoint + AdminMemberMemorialSetResponse Schema
- `frontend/src/lib/api.ts` — setMemberMemorial(memberId, token?) Funktion

## Decisions Made

- `requirePlatformAdminAppUserIdentity` statt `requirePlatformAdminIdentity`: Die bestehende Hilfsfunktion `CommentAuthIdentityFromContext` hat eine `UserID > 0`-Schranke die AppUserID-only-Identitaeten blockiert (Keycloak-Modus und Test-Stubs). Eine neue Handler-lokale Funktion liest direkt aus dem Gin-Kontext und prueft `AppUserID`.
- Guard-Literale inline in beiden Repo-Dateien: Die Source-Fragment-Tests pruefen `profile_status`, `memorial_not_claimable`, `409` direkt im Dateitext jeder Datei. Ein geteilter Helper haette die Literal-Assertion RED gelassen.
- `WithAuditLog()` als Builder-Methode: konsistent mit dem etablierten `WithMediaDeps`/`WithNoteDeps`-Pattern; rueckwaertskompatibel (bestehende `NewMemberClaimsRepository(db)` Call-Sites bleiben unveraendert).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] requirePlatformAdminIdentity schlägt bei AppUserID-only-Identität fehl**
- **Found during:** Task 1 — TestMemorialSetterRejectsNonPlatformAdmin ergibt 401 statt 403
- **Issue:** `CommentAuthIdentityFromContext` prüft `UserID > 0`. Test-Identitäten mit nur `AppUserID` (Keycloak-Modus) passieren die Schranke nicht → 401 (Unauthorized) statt 403 (Forbidden).
- **Fix:** Neue Funktion `requirePlatformAdminAppUserIdentity` direkt im Handler, die den Gin-Kontext ohne `UserID`-Guard liest und `AppUserID > 0` prüft.
- **Files modified:** `backend/internal/handlers/member_memorial_handler.go`
- **Verification:** Alle 3 Memorial-Tests grün nach Fix.
- **Committed in:** `2899b940` (Task 1 commit)

**2. [Rule 1 - Bug] Source-Fragment-Tests scheiterten nach Extraktion in geteilten Helper**
- **Found during:** Task 2 — TestClaimSubmitBlockedForMemorialProfile und TestClaimAcceptInvitationBlockedForMemorialProfile FAIL
- **Issue:** Die Source-Fragment-Tests lesen `member_claims_repository.go` und `member_claim_invitations_repository.go` direkt nach `profile_status`, `memorial_not_claimable`, `409`. Der Call zu `assertMemberClaimable` (in getrennter Datei) enthält diese Strings nicht.
- **Fix:** Guard-Logik inline in beide Repo-Dateien eingebettet; `assertMemberClaimable` in `member_claim_guards.go` bleibt als saubere Abstraktion erhalten.
- **Files modified:** `member_claims_repository.go`, `member_claim_invitations_repository.go`
- **Committed in:** `7bc423ea` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2x Rule 1 Bug — Identitaets-Guard und Source-Fragment-Kompatibilitaet)
**Impact on plan:** Beide Fixes fuer Korrektheit noetig. Kein Scope-Creep.

## Verification Results

| Prüfung | Status |
|---------|--------|
| `go test ./internal/handlers/... -run Memorial` | PASS (3 Tests grün) |
| `go test ./internal/repository/... -run Claim` | PASS (3 Guard-Tests grün) |
| `go build ./...` | PASS |
| `npm run typecheck` | NICHT AUSFUEHRBAR (kein node_modules im Worktree — akzeptiertes Wave-Muster) |
| denied-Audit "member_claim.memorial_blocked" in member_claims_repository.go | BESTAETIGT |
| denied-Audit "member_claim.memorial_blocked" in member_claim_invitations_repository.go | BESTAETIGT |
| Kein app_user-UPDATE im Handler | BESTAETIGT (nur members.profile_status) |
| Handler nutzt requirePlatformAdminAppUserIdentity (NICHT CanForFansubGroup) | BESTAETIGT |
| Beide Repo-Dateien ≤ 450 Zeilen (421 + 424) | BESTAETIGT |

## Known Stubs

Keine — alle Produktionsfelder implementiert. `setMemberMemorial` in api.ts ist vollständig und nutzt authorizedFetch. Die Frontend-Setter-UI (Plan 74-06) wird die Funktion einbinden.

## Threat Flags

| Flag | Datei | Beschreibung |
|------|-------|--------------|
| threat_flag: elevation-of-privilege | member_memorial_handler.go | Neuer privilegierter Schreib-Endpoint; durch requirePlatformAdminAppUserIdentity (Global Admin only) mitigiert — T-74-02-EOP |
| threat_flag: bypass-tampering | member_claims_repository.go, member_claim_invitations_repository.go | Memorial-Guard in BEIDEN Claim-Pfaden; server-seitig, nicht nur UI — T-74-02-BYP |

---
*Phase: 74-public-member-profile-members-slug-memorial*
*Completed: 2026-06-05*
