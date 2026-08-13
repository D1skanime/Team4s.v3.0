---
phase: 74-public-member-profile-members-slug-memorial
plan: 07
subsystem: backend-contributions / contracts
tags: [contributions, member-profile, timeline, gap-closure, lock-k]
requires:
  - members / app_users / member_claims resolution (member_profile_repository.go)
  - fansub_group_members + fansub_group_member_roles + role_definitions
provides:
  - GetPublicMemberContributions liefert App-Gruppenrollen als context='group_history' (GAP-3)
  - PublicMemberRoleEntry.Notes als Detaildaten-Quelle (GAP-2)
  - PublicMemberRoleEntry / PublicMemberContributionsResponse Contract-Schemas (Lock K)
affects:
  - Plan 74-09 (Frontend-Verdrahtung notes / Inline-Expand)
  - Plan 74-11 (Live-DB-Verifikation Ballelboy)
tech-stack:
  added: []
  patterns:
    - resolved_user-CTE spiegelt member->app_user-Aufloesung aus member_profile_repository
    - Fragment-Test-Stil (kein DB-Harness in der repository-Suite)
key-files:
  created:
    - backend/internal/repository/anime_contributions_public_year_helpers.go
    - backend/internal/repository/anime_contributions_public_member_test.go
  modified:
    - backend/internal/repository/anime_contributions_public_repository.go
    - frontend/src/types/contributions.ts
    - shared/contracts/contributions.yaml
decisions:
  - "Jahr-Pointer-Helfer in eigene Datei ausgelagert, um 450-Zeilen-Limit der Hauptdatei einzuhalten"
  - "HasUnverified zaehlt status='active' nicht als unverified (konsistent zu Frontend isUnverifiedEntry)"
  - "Fragment-Test statt Integrationstest, da repository-Suite keinen DB-Harness hat; Live-DB-Beleg in 74-11"
metrics:
  duration: ~20min
  completed: 2026-06-08
  tasks: 3
  files: 5
---

# Phase 74 Plan 07: GAP-3 App-Gruppenrollen-Timeline + notes (Lock K) Summary

GetPublicMemberContributions ergaenzt einen 3. UNION-Branch fuer aktuelle App-Gruppenrollen
(fansub_group_members + fansub_group_member_roles) als context='group_history' und fuehrt
ein notes-Feld (anime_contributions.note) end-to-end durch Backend-Struct, Contract und
frontend type ein.

## Was umgesetzt wurde

### Task 1 — Backend-Query + Struct (Commit `8108f113`)
- `PublicMemberRoleEntry.Notes *string` (`json:"notes"`) ergaenzt.
- 3. UNION-Branch in `GetPublicMemberContributions`: App-Gruppenrollen via
  `fansub_group_members` JOIN `fansub_group_member_roles` JOIN `fansub_groups`,
  `LEFT JOIN role_definitions` mit `COALESCE(rd.label_de, fgmr.role)` (fansub_lead fehlt
  im role_definitions-Seed -> Fallback noetig).
- member->app_user-Aufloesung als `resolved_user`-CTE:
  `COALESCE(verifizierter member_claims.app_user_id, app_users via members.user_id->legacy_user_id)`
  — spiegelt member_profile_repository.go:360-392. `$1` bleibt die memberID.
- NOT-EXISTS-Dedup verhindert Doppelung gegen oeffentliche hist-Rollen (gleiche group+role).
- notes-Projektion in allen drei Branches (`ac.note AS notes` bzw. `NULL::text AS notes`);
  Scan-Loop liest `&e.Notes`.
- `HasUnverified` zaehlt status='active' nicht mehr als unverified.
- Jahr-Pointer-Helfer (`minYearPtr`/`maxYearPtr`) in
  `anime_contributions_public_year_helpers.go` ausgelagert -> Hauptdatei 436 Zeilen (<450).

### Task 2 — Go-Tests (Commit `0c7cbf2d`)
- Fragment-Stil (kein DB-Harness vorhanden, konsistent zu member_claims_memorial_guard_test.go).
- `TestPublicMemberContributionsGroupHistoryBranch`: prueft Pflicht-Fragmente
  (fansub_group_members, fansub_group_member_roles, group_history, COALESCE(rd.label_de,
  ac.note as notes, resolved_user, member_claims, legacy_user_id, NOT EXISTS).
- `TestPublicMemberContributionsNotesField`: Notes-Feld + json-Tag + `&e.Notes`-Scan.
- Beide GREEN gegen die Implementierung aus Task 1.

### Task 3 — Contract + frontend type (Commit `db015d2f`)
- `frontend/src/types/contributions.ts`: `PublicMemberRoleEntry.notes: string | null`.
- `shared/contracts/contributions.yaml`: `PublicMemberRoleEntry` +
  `PublicMemberContributionsResponse` Schemas nachgetragen (role_timeline war bisher nicht
  formal kontraktiert), inkl. notes (nullable) und context-Enum
  [group_history, anime_contribution]. Backend-Struct bleibt Quelle der Wahrheit (Lock K).

## Verifikation
- `cd backend && go build ./...` -> BUILD_OK
- `cd backend && go vet ./internal/repository/` -> VET_OK
- `cd backend && go test ./internal/repository/ -run PublicMemberContributions` -> ok (2 PASS)
- `cd frontend && npm run typecheck` -> gruen (keine Fehler)
- YAML-Struktur sanity-checked (1 RoleEntry-Schema, 1 Response-Schema, notes + enum vorhanden)
- Hauptdatei 436 Zeilen (<=450)

## Korrektheits-Anker (Ballelboy / Member 3)
member 3 (user_id=2) -> app_users.legacy_user_id=2 -> app_user id=2 ->
fansub_group_members.app_user_id=2 -> fansub_lead@AnimeOwnage. Der 3. Branch liefert damit
genau einen group_history-Eintrag (role_code='fansub_lead', fansub_group_name='AnimeOwnage');
NOT-EXISTS-Dedup verhindert ein Duplikat falls eine deckungsgleiche hist-Rolle existierte.
Live-DB-Beleg erfolgt in Plan 74-11 (kein DB-Harness im Backend-Test verfuegbar).

## Abweichungen vom Plan
- **[Rule 3 - Blocking] 450-Zeilen-Limit:** Nach Task 1 war die Hauptdatei 460 Zeilen.
  Die file-lokalen Jahr-Pointer-Helfer wurden in eine neue Datei
  `anime_contributions_public_year_helpers.go` ausgelagert (CLAUDE.md-Constraint:
  Produktionsdateien <=450 Zeilen). Keine Verhaltensaenderung.

## Known Stubs
Keine. notes ist im group_history-Branch bewusst NULL (kein Datenfeld dort) — kein Stub,
sondern korrekte Semantik (Threat T-74-07-INFO2: note nur im is_public_on_member_profile-gegateten
anime_contribution-Branch projiziert).

## Self-Check: PASSED
- backend/internal/repository/anime_contributions_public_repository.go — FOUND (modified)
- backend/internal/repository/anime_contributions_public_year_helpers.go — FOUND (created)
- backend/internal/repository/anime_contributions_public_member_test.go — FOUND (created)
- frontend/src/types/contributions.ts — FOUND (modified)
- shared/contracts/contributions.yaml — FOUND (modified)
- Commit 8108f113 — FOUND
- Commit 0c7cbf2d — FOUND
- Commit db015d2f — FOUND
