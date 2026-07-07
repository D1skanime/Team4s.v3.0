---
quick: 260707-kut
subsystem: api
tags: [go, gin, pgx, contribution-proposals, fansub-membership, react, contributions]

# Dependency graph
requires:
  - phase: Phase 82 (Mitwirkende projektweit zuordnen)
    provides: "anime_contributions ankert auf members.id; MemberBelongsToFansub (hist UNION app) als geteilte Zugehoerigkeitspruefung"
provides:
  - "App-Mitglieder (nur fansub_group_members, kein hist-Eintrag) koennen ueber GET /me/memberships ihre Gruppe sehen und per POST /me/contribution-proposals einen Hinweis senden"
  - "member_id-zentrisches Ownership im CreateProposal-Pfad (FansubMembershipChecker statt hist-only Doppel-Lookup)"
  - "ListProposedByGroup zeigt App-Mitglieder-Vorschlaege in der Leader-Review-Queue"
affects: [contribution-proposals, fansub-membership, member-profile]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FansubMembershipChecker-Interface + Type-Assertion-Konstruktor-Muster (analog releaseVersionChecker) statt hartem Konstruktor-Parameter"
    - "DISTINCT ON (fansub_group_id) mit source_priority-Tiebreaker fuer Dedupe bei UNION zweier Mitgliedschaftstabellen"
    - "Source-Inspektions-Tests fuer reale SQL-Query-Verifikation (nicht nur Handler-Stub-Tests)"

key-files:
  created:
    - backend/internal/handlers/contribution_proposals_me_db.go
  modified:
    - backend/internal/handlers/contribution_proposals_me_handler.go
    - backend/internal/handlers/contribution_proposals_me_test.go
    - backend/internal/repository/anime_contributions_proposal_repository.go
    - backend/internal/repository/anime_contributions_proposal_repository_test.go
    - backend/internal/repository/anime_contributions_proposal_merge_repository.go
    - frontend/src/types/contributions.ts
    - frontend/src/components/contributions/ProposalForm.tsx
    - frontend/src/components/contributions/ProposalForm.steps.tsx
    - frontend/src/components/contributions/ProposalForm.test.tsx

key-decisions:
  - "dbMembershipsLister/dbMemberResolver/dbOwnershipChecker DB-Implementierungen in eigene Datei contribution_proposals_me_db.go ausgelagert, weil der Handler nach dem KERN-SQL-FIX sonst das 450-Zeilen-Limit ueberschritten haette"
  - "fansub_group_member_id wird beim INSERT NULL gesetzt wenn 0 (kein hist-Anker), member_id kommt als expliziter Parameter aus dem verifizierten Server-Member statt aus einer hist-only Subquery"
  - "ListProposedByGroup COALESCE(ac.fansub_group_member_id, 0) im SELECT, da GroupProposalRow.FansubGroupMemberID ein non-nullable int64 ist"

patterns-established:
  - "Ownership-Checks fuer Member-seitige Gruppenzugehoerigkeit sollen MemberBelongsToFansub (hist UNION app) wiederverwenden statt eigene hist-only Lookups zu bauen"

requirements-completed: []

# Metrics
duration: 45min
completed: 2026-07-07
---

# Quick Task 260707-kut: Hinweis senden fuer App-Mitglieder (Contribution-Proposals) Summary

**member_id-zentrisches Ownership fuer Contribution-Proposals: `ListMembershipsForMember` liest jetzt `hist_fansub_group_members UNION fansub_group_members` (dedupliziert per `DISTINCT ON`), `CreateProposal` prueft Eigentuemerschaft ueber die geteilte `MemberBelongsToFansub`-Pruefung, und der Frontend-Submit-Guard wechselt von der (fuer App-Mitglieder falsy) `fansub_group_member_id` auf `fansub_group_id` als stabilen Auswahl-Schluessel.**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-07-07
- **Tasks:** 2
- **Files modified:** 9 (1 neu, 8 geaendert)

## Accomplishments

- App-Mitglieder (`fansub_group_members`, kein `hist_fansub_group_members`-Eintrag) erscheinen jetzt unter `GET /api/v1/me/memberships` (reale SQL-Query per UNION beider Tabellen, nicht nur Stub-Erweiterung).
- `CreateProposal` prueft Ownership ueber `FansubMembershipChecker.MemberBelongsToFansub(memberID, fansubGroupID)` (hist UNION app) statt ueber zwei separate hist-only Lookups auf `fansub_group_member_id`.
- `anime_contributions.member_id` wird beim INSERT direkt aus dem server-seitig verifizierten Member gesetzt (`input.MemberID`), nicht mehr per Subquery aus `hist_fansub_group_members` abgeleitet — behebt den vormaligen NOT-NULL-Constraint-Blocker fuer App-Mitglieder.
- `ListProposedByGroup` (Leader-Review-Queue) joint jetzt direkt ueber `ac.member_id` statt ueber `hist_fansub_group_members`, damit App-Mitglieder-Vorschlaege dort sichtbar bleiben.
- Frontend-Submit-Guard in `ProposalForm.submitProposal()` von `selectedGroupMemberId` (fuer App-Mitglieder `0`/falsy) auf `selectedGroupId` (an `fansub_group_id` gebunden, nie 0) umgestellt — der urspruengliche WARNING-Fund ist behoben.
- Sicherheitsinvarianten bleiben vollstaendig erhalten: `member_id` kommt ausschliesslich aus `ResolveVerifiedMemberID`, Cross-Group-Versuche werden weiterhin mit 403 abgelehnt (jetzt ueber `MemberBelongsToFansub` statt hist-only Doppel-Check).

## Task Commits

1. **Task 1: Backend — member_id-zentrisches Ownership, Memberships-Liste und Review-Queue** - `3ce8c045` (feat)
2. **Task 2: Frontend — App-Mitglieder koennen Hinweis senden** - `b1543e6d` (feat)

_Beide Tasks liefen als TDD-Zyklus (Tests + Implementierung in einem Commit, da die Testfaelle bereits vor der Implementierung im Plan spezifiziert waren und zusammen mit dem produktiven Code verifiziert wurden)._

## Files Created/Modified

- `backend/internal/handlers/contribution_proposals_me_db.go` — NEU: DB-Implementierungen (`dbMemberResolver`, `dbOwnershipChecker`, `dbMembershipsLister`) aus dem Handler ausgelagert (450-Zeilen-Limit); enthaelt den KERN-SQL-FIX (UNION-Query mit `DISTINCT ON`)
- `backend/internal/handlers/contribution_proposals_me_handler.go` — `FansubMembershipChecker`-Interface, Type-Assertion im Konstruktor, `CreateProposal`-Ownership-Block auf `MemberBelongsToFansub` umgestellt, `ProposalInput.MemberID` gesetzt
- `backend/internal/handlers/contribution_proposals_me_test.go` — `membershipCheckerStub`, `TestCreateProposal_AppMemberWithoutHistEntrySucceeds`, `TestCreateProposal_CrossGroupRejectedViaMembershipCheck`, `TestListMemberships_IncludesAppMembersWithoutHistEntry`, PFLICHT-Test `TestDbMembershipsLister_QueryReferencesBothMembershipTables`
- `backend/internal/repository/anime_contributions_proposal_repository.go` — `ProposalInput.MemberID`, INSERT bindet `member_id` direkt statt per Subquery, `fansub_group_member_id` wird NULL bei 0, `ListProposedByGroup` joint direkt ueber `member_id`
- `backend/internal/repository/anime_contributions_proposal_repository_test.go` — Fragment-Assertions auf `input.MemberID` umgestellt, negative Assertion gegen die alte hist-only Subquery ergaenzt
- `backend/internal/repository/anime_contributions_proposal_merge_repository.go` — `lockProposalContext`/`findExistingProposalRoles` Parameter auf `memberID` umbenannt, SQL-Binding auf `ac.member_id`
- `frontend/src/types/contributions.ts` — Kommentar an `MembershipEntry.fansub_group_member_id` ergaenzt (0 = App-Mitglied ohne hist-Anker)
- `frontend/src/components/contributions/ProposalForm.tsx` — `selectedGroupMemberId` → `selectedGroupId` (State, Lookup, Options, Reset, Prop-Wiring), Submit-Guard-Fix
- `frontend/src/components/contributions/ProposalForm.steps.tsx` — `Step1Props`/`Step1GroupProject` auf `selectedGroupId` umbenannt
- `frontend/src/components/contributions/ProposalForm.test.tsx` — neuer Testfall fuer App-Mitglied-Fixture, `chooseGroupAndAnime`-Helper parametrisiert

## Decisions Made

- **DB-Implementierungen ausgelagert:** `contribution_proposals_me_handler.go` haette nach dem KERN-SQL-FIX 473 Zeilen erreicht (ueber dem CLAUDE.md-Limit von 450). Die drei `db*`-Struct-Implementierungen (`dbMemberResolver`, `dbOwnershipChecker`, `dbMembershipsLister`) wurden nach `contribution_proposals_me_db.go` verschoben — reine Verschiebung ohne Verhaltensaenderung, Handler jetzt 358 Zeilen.
- **NULL statt 0 fuer `fansub_group_member_id` im INSERT:** `var fansubGroupMemberIDParam any = input.FansubGroupMemberID; if input.FansubGroupMemberID == 0 { fansubGroupMemberIDParam = nil }` — vermeidet, dass ein falscher `fansub_group_member_id=0`-Wert in die DB geschrieben wird; der Composite-FK auf `hist_fansub_group_members(fansub_group_id, id)` greift bei NULL nicht (MATCH SIMPLE-Semantik).
- **`COALESCE(ac.fansub_group_member_id, 0)` in `ListProposedByGroup`:** `GroupProposalRow.FansubGroupMemberID` ist ein non-nullable `int64`; ohne COALESCE haette der JOIN-Wechsel (kein `hist_fansub_group_members` JOIN mehr) bei App-Mitglieder-Zeilen (NULL) einen Scan-Fehler produziert.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical / CLAUDE.md-Konformitaet] Handler-Datei ueber 450-Zeilen-Limit nach KERN-SQL-FIX**
- **Found during:** Task 1, Action-Step 5 (KERN-SQL-FIX)
- **Issue:** Der Plan sah vor, `ListMembershipsForMember` direkt in `contribution_proposals_me_handler.go` durch die UNION-Query zu ersetzen. Nach dieser Aenderung plus dem neuen `FansubMembershipChecker`-Interface waere die Datei auf 473 Zeilen gewachsen — ueber dem in CLAUDE.md hart vorgegebenen 450-Zeilen-Limit fuer Produktionscode.
- **Fix:** Die drei DB-Implementierungs-Typen (`dbMemberResolver`, `dbOwnershipChecker`, `dbMembershipsLister` inkl. der neuen UNION-Query) wurden 1:1 (ohne Verhaltensaenderung) in eine neue Datei `contribution_proposals_me_db.go` verschoben. Der Source-Inspektions-Test `TestDbMembershipsLister_QueryReferencesBothMembershipTables` liest entsprechend aus der neuen Datei.
- **Files modified:** backend/internal/handlers/contribution_proposals_me_handler.go (358 Zeilen), backend/internal/handlers/contribution_proposals_me_db.go (neu, 131 Zeilen)
- **Verification:** `go build ./...` erfolgreich; `wc -l` beider Dateien < 450
- **Committed in:** 3ce8c045 (Task 1 Commit)

---

**Total deviations:** 1 auto-fixed (CLAUDE.md-Zeilenlimit-Konformitaet)
**Impact on plan:** Reine strukturelle Verschiebung ohne Verhaltensaenderung; alle im Plan spezifizierten Tests laufen unveraendert gegen die (jetzt in einer anderen Datei liegende) reale SQL-Query. Kein Scope Creep.

## Issues Encountered

- Der erste Edit-Versuch zum Entfernen der DB-Implementierungen aus dem Handler-File scheiterte an einem exakten String-Match (vermutlich durch Encoding-Feinheiten bei Sonderzeichen). Geloest per Node-Skript mit Marker-basiertem Slice-Ersatz statt zeichengenauem String-Vergleich.

## User Setup Required

None - keine externe Service-Konfiguration erforderlich.

## Next Phase Readiness

- Automatisierte Verifikation vollstaendig gruen: Backend (`go build ./...`, `go test ./internal/handlers/... ./internal/repository/... -run "Proposal|Membership" -v`) und Frontend (`npx tsc --noEmit`, `npx vitest run src/components/contributions/ProposalForm`).
- **Live-UAT (Verification Punkt 3 im Plan) steht noch aus** — erfordert Backend-Rebuild (`docker compose up -d --build team4sv30-backend`) und Frontend-Neustart (`docker restart team4sv30-frontend`), die laut Auftrag vom Orchestrator ausgefuehrt werden. Danach empfohlen: Live-Token fuer `sheppert/123` (member_id 2, App-Mitglied C-Subs ohne hist-Eintrag) holen und die in der PLAN.md unter `<verification>` Punkt 3 beschriebenen Schritte (GET /me/memberships, POST /me/contribution-proposals, Cross-Group-403-Check, Leader-Review-Queue-Sichtbarkeit, Frontend-Wizard) durchlaufen.
- Kein bekannter Stub: Alle in diesem Plan beschriebenen Datenpfade (Backend-Query, Ownership-Check, INSERT, Review-Queue-JOIN, Frontend-Guard) sind vollstaendig verdrahtet, keine Platzhalter oder leeren Datenquellen.

---
*Quick Task: 260707-kut*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: backend/internal/handlers/contribution_proposals_me_db.go
- FOUND: .planning/quick/260707-kut-hinweis-senden-fuer-app-mitglieder-propo/260707-kut-SUMMARY.md
- FOUND: 3ce8c045 (Task 1 commit)
- FOUND: b1543e6d (Task 2 commit)
