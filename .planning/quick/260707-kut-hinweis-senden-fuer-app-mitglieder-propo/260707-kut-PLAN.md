---
quick: 260707-kut
type: execute
autonomous: true
files_modified:
  - backend/internal/handlers/contribution_proposals_me_handler.go
  - backend/internal/handlers/contribution_proposals_me_test.go
  - backend/internal/repository/anime_contributions_proposal_repository.go
  - backend/internal/repository/anime_contributions_proposal_repository_test.go
  - backend/internal/repository/anime_contributions_proposal_merge_repository.go
  - frontend/src/types/contributions.ts
  - frontend/src/components/contributions/ProposalForm.tsx
  - frontend/src/components/contributions/ProposalForm.steps.tsx
  - frontend/src/components/contributions/ProposalForm.test.tsx
must_haves:
  truths:
    - "Ein App-Mitglied (fansub_group_members, kein hist_fansub_group_members-Eintrag) sieht seine Gruppe unter GET /me/memberships und kann darüber einen Hinweis (Contribution-Proposal) senden"
    - "Sicherheitsinvariante D-Sec-1: member_id kommt ausschliesslich aus ResolveVerifiedMemberID (Server) — niemals aus dem Request-Body"
    - "Sicherheitsinvariante D-Sec-2: CreateProposal lehnt jeden Versuch, fuer eine Gruppe vorzuschlagen, in der der eingeloggte Member kein Mitglied ist (weder hist noch App), mit 403 ab — MemberBelongsToFansub(memberID, req.FansubGroupID) muss true sein"
    - "Ein Vorschlag eines App-Mitglieds erscheint in der Leader-Review-Queue (GET /admin/fansubs/:id/contribution-proposals) mit korrektem Anzeigenamen, obwohl fansub_group_member_id NULL ist"
    - "Bestehende hist_fansub_group_members-Mitglieder koennen weiterhin unveraendert Hinweise senden (Rueckwaertskompatibilitaet)"
    - "Deutsche Fehlermeldungen verwenden durchgehend korrekte Umlaute (kein ae/oe/ue-Fallback)"
  artifacts:
    - path: "backend/internal/repository/anime_contributions_repository.go"
      provides: "MemberBelongsToFansub bleibt unveraendert wiederverwendete Quelle der Wahrheit fuer Gruppenzugehoerigkeit (hist UNION app)"
      contains: "func (r *AnimeContributionsRepository) MemberBelongsToFansub"
    - path: "backend/internal/handlers/contribution_proposals_me_handler.go"
      provides: "FansubMembershipChecker-Interface + Ownership-Check ueber MemberBelongsToFansub statt hist-only Lookups; ListMembershipsForMember (echte SQL-Query in dbMembershipsLister) liefert App- und Hist-Mitgliedschaften ueber hist_fansub_group_members UNION fansub_group_members, dedupliziert pro fansub_group_id"
      contains: "FansubMembershipChecker"
    - path: "backend/internal/repository/anime_contributions_proposal_repository.go"
      provides: "CreateProposal setzt member_id explizit aus ProposalInput.MemberID statt Subquery auf hist_fansub_group_members"
      contains: "input.MemberID"
    - path: "frontend/src/components/contributions/ProposalForm.tsx"
      provides: "Versand des Hinweises funktioniert auch ohne hist-Mitgliedschaft (fansub_group_member_id optional/0), Guard prueft auf fansub_group_id statt auf die (fuer App-Mitglieder falsy=0) fansub_group_member_id"
      contains: "fansub_group_id"
  key_links:
    - from: "backend/internal/handlers/contribution_proposals_me_handler.go"
      to: "backend/internal/repository/anime_contributions_repository.go"
      via: "membershipChecker.MemberBelongsToFansub(ctx, memberID, req.FansubGroupID)"
      pattern: "MemberBelongsToFansub"
    - from: "backend/internal/repository/anime_contributions_proposal_repository.go"
      to: "backend/internal/repository/anime_contributions_proposal_merge_repository.go"
      via: "lockProposalContext/findExistingProposalRoles keyed auf memberID statt fansubGroupMemberID"
      pattern: "memberID"
    - from: "frontend/src/components/contributions/ProposalForm.tsx"
      to: "frontend/src/types/contributions.ts"
      via: "ProposalFormData ohne Pflicht auf fansub_group_member_id"
      pattern: "ProposalFormData"
---

<objective>
"Hinweis senden" (Contribution-Proposals) für App-Mitglieder (`fansub_group_members`) ermöglichen. Der Flow ist aktuell komplett auf `hist_fansub_group_members` verdrahtet — moderne App-Mitglieder ohne historischen Eintrag bekommen bei `GET /me/memberships` eine leere Liste und können daher nie einen Hinweis senden. Umbau auf `member_id`-zentrische Logik, die Sicherheitsinvariante (Self-Proposal-Gate: nur für sich selbst, nur für eigene Gruppe) bleibt vollständig erhalten und wird über die bereits vorhandene, geteilte Prüfung `MemberBelongsToFansub` (hist UNION app) durchgesetzt.

Purpose: Admin-Mitglieder, die nur als App-Mitglied (nicht historisch) in einer Fansub-Gruppe stehen, sollen wie historische Mitglieder Hinweise zu ihrer Mitwirkung an einem Anime einreichen können — ohne die Sicherheit des bestehenden Cross-Group-Schutzes zu schwächen.

Output: `ListMembershipsForMember` liefert Gruppen aus beiden Quellen (echte SQL-Query umgebaut, nicht nur Stub); `CreateProposal` prüft Eigentümerschaft über `MemberBelongsToFansub` statt ausschliesslich über `hist_fansub_group_members`-Lookups; `anime_contributions.member_id` wird beim Insert direkt aus dem verifizierten Server-Member gesetzt statt aus einer hist-only-Subquery abgeleitet; die Leader-Review-Queue zeigt auch App-Mitglieder-Vorschläge korrekt an; das Frontend-Formular blockiert App-Mitglieder nicht mehr (auch nicht am Submit-Guard).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

<diagnosis>
Ist-Zustand (alles hist_fansub_group_members-zentrisch):
- `ListMembershipsForMember` (Handler ~Z.182): SELECT nur aus `hist_fansub_group_members WHERE member_id` → App-Mitglieder bekommen KEINE Gruppen → Frontend zeigt "Verifizierte Gruppenmitgliedschaft erforderlich".
- `CreateProposal`-Handler (~Z.227): Ownership-Check über `MemberIDForFansubGroupMember(req.FansubGroupMemberID)` + `FansubGroupIDForFansubGroupMember(...)` — beide lösen ausschliesslich über `hist_fansub_group_members` via `fansub_group_member_id` auf. Ohne hist-Eintrag nicht möglich.
- `CreateProposal`-Repo (~Z.82 im INSERT): `member_id` wird per Subquery `(SELECT member_id FROM hist_fansub_group_members WHERE id=$3 AND fansub_group_id=$1)` gesetzt → für App-Mitglieder NULL, obwohl `anime_contributions.member_id` seit Migration 0105 NOT NULL ist → INSERT würde mit NULL-Constraint-Verletzung fehlschlagen, selbst wenn der Ownership-Check umgangen würde.
- `anime_contributions.fansub_group_member_id` ist seit Migration 0105 NULLABLE (Übergangsspalte); `member_id` ist die kanonische, NOT NULL-Ankerspalte (Migration 0105). Migration 0111 hat den alten 3-Spalten-UNIQUE-Constraint bereits durch einen einfachen Index ersetzt — Serialisierung läuft jetzt vollständig über den Advisory-Lock in `lockProposalContext`.
- `ListProposedByGroup` (Leader-Review-Queue, `anime_contributions_proposal_repository.go` ~Z.140-159) joint `INNER JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id` — bei NULL `fansub_group_member_id` (App-Mitglieder-Vorschlag) verschwindet die Zeile komplett aus der Review-Queue. Muss auf direkten JOIN über `ac.member_id → members` umgestellt werden, sonst sind App-Mitglieder-Vorschläge für Leader unsichtbar (Feature wäre nutzlos).
- Beleg: sheppert (member_id 2) ist in `fansub_group_members` (C-Subs, status active), aber NICHT in `hist_fansub_group_members`. `MemberBelongsToFansub(2, 1)` = true (prüft bereits beide Tabellen, UNION ALL über `hist_fansub_group_members` und `fansub_group_members`).

ZIEL-DESIGN (member_id-zentrisch, Sicherheitsinvariante bleibt: ein Member darf nur für sich selbst und nur für eine Gruppe, in der er Mitglied ist, vorschlagen):
1. `ListMembershipsForMember`: `hist_fansub_group_members UNION fansub_group_members` (analog `MemberBelongsToFansub`), dedupliziert pro `fansub_group_id` (eine Gruppe nur einmal, auch wenn beide Tabellen einen Eintrag hätten). `fansub_group_member_id` im Ergebnis = hist.id wenn hist-Mitglied vorhanden, sonst 0 (kein hist-Anker vorhanden — Frontend behandelt 0 als "kein hist-Bezug", sendet trotzdem via `fansub_group_id`). Dies ist die REALE DB-Query in `dbMembershipsLister.ListMembershipsForMember`, nicht nur eine Stub-Erweiterung — siehe expliziter Action-Step 5 in Task 1.
2. `CreateProposal`-Handler: Ownership-Check von "fansub_group_member_id gehört zu memberID" auf `MemberBelongsToFansub(memberID, req.FansubGroupID)` umgestellt. `req.FansubGroupMemberID` darf 0 sein (App-Mitglied ohne hist-Anker). `memberID` kommt weiterhin ausschliesslich aus `ResolveVerifiedMemberID`.
3. `CreateProposal`-Repo: `member_id` wird EXPLIZIT aus `ProposalInput.MemberID` (vom Handler, = resolved memberID) gesetzt statt aus `hist_fansub_group_members` abgeleitet. `fansub_group_member_id` wird nur gesetzt wenn > 0 (sonst NULL). `lockProposalContext`/`findExistingProposalRoles` keyen auf `member_id` statt `fansub_group_member_id`, damit Dedupe/Lock auch für App-Mitglieder korrekt greift.
4. `ListProposedByGroup`: JOIN von `hist_fansub_group_members` auf direktes `JOIN members m ON m.id = ac.member_id` umgestellt (member_id ist NOT NULL, funktioniert für beide Mitgliedstypen identisch).
5. Frontend `ProposalForm`/`steps` + `MembershipEntry`-Typ: Gruppe bleibt Auswahl-Einheit; wenn `fansub_group_member_id` 0/fehlt, trotzdem sendbar (fansub_group_id + role_codes + optional release_version_id + note reichen). Der Submit-Guard in `submitProposal()` (aktuell Zeile 174: `if (!selectedGroupMemberId || !selectedGroup)`) darf NICHT auf einem Wert prüfen, der für App-Mitglieder 0/falsy ist — muss auf `selectedGroupId` (gebunden an `fansub_group_id`, nie 0) umgestellt werden.

SICHERHEIT (muss halten):
- `member_id` IMMER aus `ResolveVerifiedMemberID` (Server), NIE aus dem Request.
- `MemberBelongsToFansub(memberID, fansubGroupID)` MUSS true sein, sonst 403 — verhindert Cross-Group-Proposals.
- Rollen-/ReleaseVersion-Checks bleiben unverändert (D-03 Release-Version-Beteiligungsprüfung).
- Keine Möglichkeit, im Namen eines anderen Members oder einer fremden Gruppe zu proposen.
</diagnosis>

<interfaces>
Aktuelles Handler-Interface (backend/internal/handlers/contribution_proposals_me_handler.go):

```go
type OwnershipChecker interface {
	MemberIDForFansubGroupMember(ctx context.Context, fansubGroupMemberID int64) (int64, error)
	FansubGroupIDForFansubGroupMember(ctx context.Context, fansubGroupMemberID int64) (int64, error)
	MemberIDForAnimeContribution(ctx context.Context, contributionID int64) (int64, error)
}

type MembershipEntry struct {
	FansubGroupMemberID int64  `json:"fansub_group_member_id"`
	FansubGroupID       int64  `json:"fansub_group_id"`
	GroupName           string `json:"group_name"`
}
```

Aktuelle reale SQL-Implementierung, die durch diesen Plan ersetzt wird (backend/internal/handlers/contribution_proposals_me_handler.go, Zeile 177-204):

```go
type dbMembershipsLister struct {
	db *pgxpool.Pool
}

func (l *dbMembershipsLister) ListMembershipsForMember(ctx context.Context, memberID int64) ([]MembershipEntry, error) {
	rows, err := l.db.Query(ctx, `
		SELECT hfgm.id AS fansub_group_member_id, fg.id AS fansub_group_id, fg.name AS group_name
		FROM hist_fansub_group_members hfgm
		JOIN fansub_groups fg ON fg.id = hfgm.fansub_group_id
		WHERE hfgm.member_id = $1
		ORDER BY fg.name ASC
	`, memberID)
	// ... scan loop unveraendert (siehe Action-Step 5 in Task 1)
}
```

`MemberIDForAnimeContribution` wird weiterhin von `SelfPublish` benutzt (Contribution-Ownership dort bleibt unverändert — SelfPublish ist NICHT Teil dieses Umbaus). Nur die beiden `*ForFansubGroupMember`-Methoden werden im `CreateProposal`-Pfad durch den neuen Check ersetzt; sie bleiben im Interface/Stub erhalten (kein Breaking Change für `SelfPublish`-Tests), werden im `CreateProposal`-Handler-Code aber nicht mehr aufgerufen.

Bereits vorhandene, wiederverwendbare Prüfung (backend/internal/repository/anime_contributions_repository.go, Zeile 54-69):

```go
func (r *AnimeContributionsRepository) MemberBelongsToFansub(ctx context.Context, memberID int64, fansubGroupID int64) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM hist_fansub_group_members
			WHERE member_id = $1 AND fansub_group_id = $2
			UNION ALL
			SELECT 1 FROM fansub_group_members
			WHERE member_id = $1 AND fansub_group_id = $2
		)
	`, memberID, fansubGroupID).Scan(&exists)
	// ...
}
```

`AnimeContributionsRepository` ist bereits der konkrete Typ, der als `proposalRepo`-Parameter in `NewContributionProposalsMeHandler` reingereicht wird (siehe `backend/cmd/server/main.go:513-515`, `animeContributionsRepo` wird sowohl für den Proposals-Handler als auch für andere Contribution-Handler verwendet). Die Konstruktor-Funktion prüft bereits per Type-Assertion, ob `proposalRepo` weitere Interfaces erfüllt (siehe bestehendes Muster für `releaseVersionChecker` Zeile 88-91) — dasselbe Muster wird für den neuen `FansubMembershipChecker` verwendet, KEINE neue DB-Verbindung nötig.

ProposalInput (backend/internal/repository/anime_contributions_proposal_repository.go, Zeile 15-23):

```go
type ProposalInput struct {
	FansubGroupMemberID int64
	RoleCodes           []string
	Note                *string
	StartedYear         *int
	EndedYear           *int
	ReleaseVersionID    *int64
	AppUserID           int64
}
```

Frontend-Typ (frontend/src/types/contributions.ts, Zeile 127-161):

```typescript
export interface ProposalFormData {
  fansub_group_id: number
  anime_id: number
  fansub_group_member_id: number
  role_codes: string[]
  note?: string | null
  started_year?: number | null
  ended_year?: number | null
  release_version_id?: number | null
}

export interface MembershipEntry {
  fansub_group_member_id: number
  fansub_group_id: number
  group_name: string
}
```

Aktueller Submit-Guard in frontend/src/components/contributions/ProposalForm.tsx, Zeile 174 (der WARNING-Fund — muss in Task 2 umgebaut werden, da `selectedGroupMemberId` fuer App-Mitglieder 0/falsy ist):

```typescript
if (!selectedGroupMemberId || !selectedGroup) {
  setStep(1)
  setError('Bitte wähle eine Gruppe aus.')
  return
}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Backend — member_id-zentrisches Ownership, Memberships-Liste und Review-Queue</name>
  <files>backend/internal/handlers/contribution_proposals_me_handler.go, backend/internal/handlers/contribution_proposals_me_test.go, backend/internal/repository/anime_contributions_proposal_repository.go, backend/internal/repository/anime_contributions_proposal_repository_test.go, backend/internal/repository/anime_contributions_proposal_merge_repository.go</files>
  <behavior>
    - Neuer Handler-Test `TestCreateProposal_AppMemberWithoutHistEntrySucceeds`: `fansub_group_member_id: 0` im Request-Body, `membershipChecker`-Stub liefert `belongs=true` für (memberID, fansubGroupID) → 201, `ProposalInput.MemberID` == memberID (nicht `req.FansubGroupMemberID`).
    - Neuer Handler-Test `TestCreateProposal_CrossGroupRejectedViaMembershipCheck`: `membershipChecker`-Stub liefert `belongs=false` → 403, unabhängig vom Wert von `fansub_group_member_id`.
    - Bestehender Test `TestCreateProposal_ForeignMembershipRejected` und `TestCreateProposal_MembershipGroupMismatchRejected` werden auf den neuen `membershipChecker`-Stub umgestellt (ersetzen `ownershipCheckerStub.MemberIDForFansubGroupMember`/`FansubGroupIDForFansubGroupMember`-Erwartungen für den CreateProposal-Pfad); `TestSelfPublish_*`-Tests bleiben unverändert auf `ownershipCheckerStub.MemberIDForAnimeContribution`.
    - Neuer Test `TestListMemberships_IncludesAppMembersWithoutHistEntry`: `membershipsListerStub` liefert Eintrag mit `FansubGroupMemberID: 0` → Response enthält den Eintrag unverändert (Handler tut keine Filterung). Dieser Test prüft NUR den Handler gegen den Stub — deckt das reale SQL NICHT ab, siehe nächster Punkt.
    - **PFLICHT — Neuer Source-Inspektions-Test `TestDbMembershipsLister_QueryReferencesBothMembershipTables`**: liest den Quelltext von `contribution_proposals_me_handler.go` (analog dem bestehenden Repository-Source-Inspektions-Test `TestCreateProposal_IsRoleScopedAndSerialized`) und prüft per `strings.Contains`, dass der Funktionskörper von `dbMembershipsLister.ListMembershipsForMember` sowohl das Fragment `"hist_fansub_group_members"` als auch `"fansub_group_members"` enthält UND ein Dedupe-Fragment (`"DISTINCT ON"`) enthält. Dieser Test verifiziert die REALE DB-Query (nicht den Stub) und ist der Beweis, dass das Kernfeature (App-Mitglied sieht Gruppe unter GET /me/memberships) tatsächlich funktioniert, nicht nur der Handler-Wrapper.
    - Repository-Test (Source-Inspektion, analog bestehendem `TestCreateProposal_IsRoleScopedAndSerialized`): neue/aktualisierte Fragmente `"input.MemberID"`, `"lockProposalContext(ctx, tx, fansubGroupID, animeID, input.MemberID, input.ReleaseVersionID)"`, `"findExistingProposalRoles(ctx, tx, fansubGroupID, animeID, input.MemberID, input.ReleaseVersionID, input.RoleCodes)"` müssen im Quelltext vorkommen; das alte Fragment `"SELECT member_id FROM hist_fansub_group_members WHERE id = $3 AND fansub_group_id = $1"` MUSS entfernt sein (kein Vorkommen mehr).
  </behavior>
  <action>
    1. In `backend/internal/handlers/contribution_proposals_me_handler.go`: Neues Interface `FansubMembershipChecker` mit Methode `MemberBelongsToFansub(ctx context.Context, memberID int64, fansubGroupID int64) (bool, error)` direkt nach dem bestehenden `OwnershipChecker`-Interface deklarieren. Neues Feld `membershipChecker FansubMembershipChecker` auf `ContributionProposalsMeHandler` ergänzen.
    2. In `NewContributionProposalsMeHandler`: analog zum bestehenden `releaseVersionChecker`-Type-Assertion-Muster (Zeile 88-91) `var membershipChecker FansubMembershipChecker; if checker, ok := proposalRepo.(FansubMembershipChecker); ok { membershipChecker = checker }` ergänzen und im zurückgegebenen Struct setzen. `AnimeContributionsRepository.MemberBelongsToFansub` erfüllt dieses Interface bereits strukturell (keine Änderung an `anime_contributions_repository.go` nötig).
    3. In `CreateProposal` (Zeile ~260-287): den kompletten Block der beiden Ownership-Lookups (`MemberIDForFansubGroupMember` + `FansubGroupIDForFansubGroupMember` inkl. beider Vergleichs-Ifs) ersetzen durch einen einzigen Block: `if h.membershipChecker == nil { internalError(...); return }`, dann `belongs, err := h.membershipChecker.MemberBelongsToFansub(c.Request.Context(), memberID, req.FansubGroupID)`, bei `err != nil` `internalError`, bei `!belongs` `403 "keine Berechtigung"`. Optional zusätzlich: wenn `req.FansubGroupMemberID != 0`, keine weitere Prüfung nötig (rein informativ, Kompatibilitätsfeld) — NICHT hart validieren, um App-Mitglieder mit `fansub_group_member_id: 0` nicht zu blockieren.
    4. `ProposalInput` (Aufruf-Stelle Zeile ~324-332) um Feld `MemberID: memberID` ergänzen (memberID ist die bereits per `ResolveVerifiedMemberID` aufgelöste Variable im Handler).
    5. **KERN-SQL-FIX (Pflicht-Schritt, behebt Checker-Blocker):** In `backend/internal/handlers/contribution_proposals_me_handler.go`, Methode `dbMembershipsLister.ListMembershipsForMember` (Zeile ~182-204): das bestehende `SELECT hfgm.id AS fansub_group_member_id, fg.id AS fansub_group_id, fg.name AS group_name FROM hist_fansub_group_members hfgm JOIN fansub_groups fg ON fg.id = hfgm.fansub_group_id WHERE hfgm.member_id = $1 ORDER BY fg.name ASC` VOLLSTÄNDIG ersetzen durch eine UNION-Query über beide Mitgliedschaftstabellen, analog dem Muster in `MemberBelongsToFansub` (`anime_contributions_repository.go` Zeile 54-69). Ziel-Query:
       `SELECT DISTINCT ON (fansub_group_id) fansub_group_member_id, fansub_group_id, group_name FROM ( SELECT hfgm.id AS fansub_group_member_id, hfgm.fansub_group_id, fg.name AS group_name, 0 AS source_priority FROM hist_fansub_group_members hfgm JOIN fansub_groups fg ON fg.id = hfgm.fansub_group_id WHERE hfgm.member_id = $1 UNION ALL SELECT 0 AS fansub_group_member_id, fgm.fansub_group_id, fg.name AS group_name, 1 AS source_priority FROM fansub_group_members fgm JOIN fansub_groups fg ON fg.id = fgm.fansub_group_id WHERE fgm.member_id = $1 ) combined ORDER BY fansub_group_id, source_priority ASC, group_name ASC`.
       Dedupe-Logik: `DISTINCT ON (fansub_group_id)` mit `ORDER BY fansub_group_id, source_priority ASC` bevorzugt bei doppelter Mitgliedschaft (hist UND app für dieselbe Gruppe) immer die hist-Zeile (`source_priority = 0`) mit deren echter `fansub_group_member_id`; ist nur eine App-Mitgliedschaft vorhanden, wird `fansub_group_member_id = 0` zurückgegeben (kein hist-Anker). Ergebnis: pro `fansub_group_id` genau ein Eintrag, App-Mitglieder ohne hist-Eintrag erscheinen mit `FansubGroupMemberID = 0`. Scan-Logik (`rows.Scan(&e.FansubGroupMemberID, &e.FansubGroupID, &e.GroupName)`) bleibt unverändert, da Spaltenreihenfolge/-typen identisch bleiben.
    6. In `backend/internal/repository/anime_contributions_proposal_repository.go`: `ProposalInput`-Struct um `MemberID int64` (Kommentar: "member_id des Servers-seitig verifizierten Members — Server-Wahrheit, NIE aus Request") ergänzen. Im INSERT-Statement (Zeile ~61-105) die Subquery `(SELECT member_id FROM hist_fansub_group_members WHERE id = $3 AND fansub_group_id = $1)` durch direkten Parameter `$9` (bzw. nächste freie Positionsnummer) ersetzen, der `input.MemberID` bindet. `fansub_group_member_id` ($3) bleibt bestehen, aber wird NULL wenn `input.FansubGroupMemberID == 0` — dafür `var fansubGroupMemberIDParam any = input.FansubGroupMemberID; if input.FansubGroupMemberID == 0 { fansubGroupMemberIDParam = nil }` einführen und diesen Wert statt `input.FansubGroupMemberID` direkt binden (Composite-FK `fk_anime_contributions_member_group` referenziert `hist_fansub_group_members(fansub_group_id, id)` — bei NULL wird der FK laut Postgres MATCH SIMPLE-Semantik nicht geprüft, kein Konflikt).
    7. `lockProposalContext`- und `findExistingProposalRoles`-Aufrufe (Zeile 50 und 53) von `input.FansubGroupMemberID` auf `input.MemberID` umstellen.
    8. In `backend/internal/repository/anime_contributions_proposal_merge_repository.go`: `lockProposalContext` und `findExistingProposalRoles` — Parametername `fansubGroupMemberID int64` zu `memberID int64` umbenennen (nur Bezeichner, keine Signaturänderung der Typen) und in `proposalContextLockValue` sowie den SQL-Bindings (`ac.fansub_group_member_id = $3` → `ac.member_id = $3`) entsprechend anpassen. `findProposalMergeTarget` (aktuell nicht von `CreateProposal` aufgerufen, toter Code für zukünftigen Merge-Flow) NICHT anfassen, um Scope nicht zu sprengen — nur die beiden tatsächlich in `CreateProposal` genutzten Funktionen ändern.
    9. `ListProposedByGroup` (Zeile 140-159): `JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id` + `JOIN members m ON m.id = hfgm.member_id` ersetzen durch direktes `JOIN members m ON m.id = ac.member_id` (member_id ist NOT NULL, funktioniert für hist- und App-Mitglieder gleichermassen). `GROUP BY` entsprechend anpassen (kein `hfgm`-Bezug mehr nötig).
    10. In `backend/internal/repository/anime_contributions_proposal_repository_test.go`: `TestCreateProposal_IsRoleScopedAndSerialized` — Fragment-Liste aktualisieren: `"lockProposalContext(ctx, tx, fansubGroupID, animeID, input.FansubGroupMemberID, input.ReleaseVersionID)"` → `"lockProposalContext(ctx, tx, fansubGroupID, animeID, input.MemberID, input.ReleaseVersionID)"`, ebenso für `findExistingProposalRoles`; Fragment `"SELECT member_id FROM hist_fansub_group_members WHERE id = $3 AND fansub_group_id = $1"` entfernen (Assertion, dass dieses Fragment NICHT mehr vorkommt, per zusätzlichem `if strings.Contains(source, oldFragment) { t.Fatalf(...) }`).
    11. In `backend/internal/handlers/contribution_proposals_me_test.go`: neuen Stub `type membershipCheckerStub struct { belongs bool; err error }` mit Methode `MemberBelongsToFansub(ctx, memberID, fansubGroupID int64) (bool, error) { return s.belongs, s.err }` ergänzen; `var _ FansubMembershipChecker = (*membershipCheckerStub)(nil)` Compile-Check ergänzen. `buildTestProposalHandler`-Helper um Parameter `membershipChecker FansubMembershipChecker` erweitern (Default in bestehenden Aufrufen: `&membershipCheckerStub{belongs: true}`, damit bestehende Erfolgstests grün bleiben; `TestCreateProposal_ForeignMembershipRejected`/`TestCreateProposal_MembershipGroupMismatchRejected` auf `&membershipCheckerStub{belongs: false}` umstellen — diese beiden Tests testen jetzt exakt dieselbe Sicherheitsinvariante über den neuen Check).
    12. **Neuer Source-Inspektions-Test `TestDbMembershipsLister_QueryReferencesBothMembershipTables`** in `backend/internal/handlers/contribution_proposals_me_test.go`: liest den Quelltext von `contribution_proposals_me_handler.go` per `os.ReadFile`, extrahiert den Funktionskörper von `func (l *dbMembershipsLister) ListMembershipsForMember` (z.B. über `strings.Index` auf die Funktionssignatur bis zur nächsten `func `-Deklaration, analog dem Extraktions-Pattern im Repository-Source-Test) und prüft per `strings.Contains`, dass sowohl `"hist_fansub_group_members"` als auch `"fansub_group_members"` darin vorkommen UND dass `"DISTINCT ON"` vorkommt. Dieser Test ist PFLICHT zusätzlich zum `TestListMemberships_IncludesAppMembersWithoutHistEntry`-Stub-Test, da Letzterer nur den Handler gegen den Stub prüft und das reale SQL nicht abdeckt — ohne diesen Test würde das Kernfeature trivial grün laufen, ohne dass das SQL je geändert wird.
    Datei-Zeilenlimit beachten: `contribution_proposals_me_handler.go` verliert durch den Umbau (Ersetzen von ~28 Zeilen doppeltem Ownership-Lookup durch ~10 Zeilen) netto Zeilen, gewinnt aber ein paar Zeilen durch die längere UNION-Query in `ListMembershipsForMember` — insgesamt weiterhin unter 450 Zeilen.
  </action>
  <verify>
    <automated>cd backend && go build ./... && go test ./internal/handlers/... ./internal/repository/... -run "Proposal|Membership" -v</automated>
  </verify>
  <done>go build erfolgreich; alle bestehenden und neuen Proposal/Membership-Tests grün; Source-Inspektions-Test bestätigt member_id-zentrische Lock/Find-Aufrufe und Abwesenheit der alten hist-only-Subquery; `TestDbMembershipsLister_QueryReferencesBothMembershipTables` bestätigt, dass die REALE `ListMembershipsForMember`-Query (nicht nur der Stub) beide Mitgliedschaftstabellen referenziert und dedupliziert; ListProposedByGroup joint direkt über member_id.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Frontend — App-Mitglieder können Hinweis senden</name>
  <files>frontend/src/types/contributions.ts, frontend/src/components/contributions/ProposalForm.tsx, frontend/src/components/contributions/ProposalForm.steps.tsx, frontend/src/components/contributions/ProposalForm.test.tsx</files>
  <behavior>
    - Neuer Testfall in `ProposalForm.test.tsx`: `ownGroups` enthält einen Eintrag mit `fansub_group_member_id: 0` (App-Mitglied ohne hist-Anker) → "Weiter"/"Hinweis senden"-Button ist NICHT disabled, Gruppe erscheint in der Auswahl, nach vollständigem Wizard-Durchlauf wird `createContributionProposal` mit `fansub_group_member_id: 0` (oder `null`, je nach gewählter Typisierung) aufgerufen und Erfolg wird angezeigt.
    - **Pflicht-Assertion für den WARNING-Fund:** derselbe Testfall muss explizit sicherstellen, dass der Submit-Guard in `submitProposal()` (Zeile 174, `if (!selectedGroupMemberId || !selectedGroup)`) für ein reines App-Mitglied NICHT auslöst — d.h. nach Auswahl der Gruppe mit `fansub_group_member_id: 0` und Klick auf "Weiter" darf NICHT die Fehlermeldung "Bitte wähle eine Gruppe aus." erscheinen. Assertion: `screen.queryByText('Bitte wähle eine Gruppe aus.')` ist `null` nach dem Submit-Versuch.
    - Bestehende Tests mit `fansub_group_member_id > 0` (hist-Mitglied) bleiben unverändert grün.
  </behavior>
  <action>
    1. `frontend/src/types/contributions.ts`: `ProposalFormData.fansub_group_member_id` und `MembershipEntry.fansub_group_member_id` bleiben als `number` (kein Typwechsel auf optional/null nötig — Backend behandelt `0` bereits als "kein hist-Anker"). Kommentar über `MembershipEntry.fansub_group_member_id` ergänzen: "0 wenn der Member nur App-Mitglied ist (kein hist_fansub_group_members-Eintrag) — fansub_group_id bleibt der massgebliche Auswahl-Schlüssel."
    2. `frontend/src/components/contributions/ProposalForm.tsx`: **Rename-Ziel schliesst explizit Zeile 174 ein (WARNING-Fund).** `selectedGroupMemberId`-State (Zeile 43) zu `selectedGroupId` umbenennen, `useMemo`-Lookup (Zeile 57-60) auf `ownGroups.find((group) => group.fansub_group_id === selectedGroupId)` umstellen, `groupOptions` `value: group.fansub_group_id` (Zeile 76), `resetAndClose` (Zeile 126) `setSelectedGroupMemberId('')` → `setSelectedGroupId('')`, `onGroupChange`-Prop-Weitergabe (Zeile 318) `onGroupChange={setSelectedGroupMemberId}` → `onGroupChange={setSelectedGroupId}`. **Der Submit-Guard in `submitProposal()`, Zeile 174 (`if (!selectedGroupMemberId || !selectedGroup)`), MUSS auf `if (!selectedGroupId || !selectedGroup)` umgestellt werden** — dies ist der kritische Fix: `selectedGroupId` ist an `fansub_group_id` gebunden (immer eine echte, truthy DB-ID, nie 0), während das alte `selectedGroupMemberId` für App-Mitglieder 0 (falsy) sein kann und den Guard fälschlich auslösen würde. Ohne diese Änderung bleibt das Absenden für App-Mitglieder trotz korrektem Backend blockiert. Der `body`-Objekt-Aufbau (Zeile 194-202) bleibt unverändert: `fansub_group_member_id: selectedGroup.fansub_group_member_id` wird weiterhin direkt aus `selectedGroup` gelesen (bleibt 0 für App-Mitglieder, wird korrekt an Backend gesendet) — nur der Auswahl-/Guard-Schlüssel wechselt von `fansub_group_member_id` auf `fansub_group_id`. Da `ListMembershipsForMember` (Task 1) pro `fansub_group_id` dedupliziert, ist genau ein Eintrag pro Gruppe garantiert, `selectedGroupId` ist somit ein eindeutiger, stabiler Auswahl-Schlüssel unabhängig vom hist-Anker.
    3. `frontend/src/components/contributions/ProposalForm.steps.tsx`: `Step1Props.selectedGroupMemberId`/`onGroupChange`-Typen und internen Gebrauch (Zeile 121, 128, 136, 151, 155) entsprechend auf `selectedGroupId`/`fansub_group_id`-Semantik umbenennen (reine Umbenennung, keine Verhaltensänderung). Keine sichtbaren Textänderungen nötig.
    4. `frontend/src/components/contributions/ProposalForm.test.tsx`: Bestehende Mock-`ownGroups`-Fixtures prüfen/ergänzen; neuen Testfall mit App-Mitglied-Fixture (`{ fansub_group_id: 5, fansub_group_member_id: 0, group_name: 'App-Only-Gruppe' }`) hinzufügen, kompletten Wizard-Flow durchklicken (Gruppe wählen → Anime wählen → Rolle wählen → Absenden), sicherstellen, dass beim Klick auf "Weiter" nach Gruppenauswahl KEINE "Bitte wähle eine Gruppe aus."-Fehlermeldung erscheint (Guard-Regressionstest für Zeile 174), und `createContributionProposal`-Mock-Aufrufargument auf `fansub_group_member_id: 0` prüfen.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit && npx vitest run src/components/contributions/ProposalForm --reporter=dot</automated>
  </verify>
  <done>tsc ohne Fehler; alle ProposalForm-Tests grün inkl. neuem App-Mitglied-Testfall; Gruppen-Auswahl UND Submit-Guard (Zeile 174) funktionieren unabhaengig von hist-Anker ueber fansub_group_id als stabilen Schluessel; App-Mitglied mit fansub_group_member_id 0 kann den Wizard vollstaendig durchlaufen ohne "Bitte waehle eine Gruppe aus."-Fehlmeldung.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Member-Client -> `/api/v1/me/contribution-proposals` | Authentifizierter Member-Request; `fansub_group_id`, `fansub_group_member_id`, `anime_id`, `role_codes` sind Client-kontrollierter, nicht vertrauenswürdiger Input |
| Handler -> Repository | `member_id` (Server-Wahrheit aus `ResolveVerifiedMemberID`) überquert diese Grenze als vertrauenswürdiger Wert, NIE der Client-Wert |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260707kut-01 | Spoofing | CreateProposal — Vorschlag im Namen eines fremden Members | mitigate | `member_id` wird ausschliesslich aus `ResolveVerifiedMemberID(appUserID)` gelesen; `req.FansubGroupMemberID`/`req.FansubGroupID` fliessen nie direkt in `member_id` ein |
| T-260707kut-02 | Tampering | CreateProposal — Vorschlag fuer eine fremde Gruppe (Cross-Group) | mitigate | `MemberBelongsToFansub(memberID, req.FansubGroupID)` MUSS true sein (bereits bestehende, geteilte Pruefung ueber hist UNION app), sonst 403 — ersetzt die bisherige rein hist-basierte Doppel-Pruefung 1:1 in der Sicherheitsgarantie |
| T-260707kut-03 | Tampering | INSERT — `member_id` per Subquery statt Server-Wert | mitigate | Subquery-basierte Ableitung aus `hist_fansub_group_members` vollstaendig entfernt; `member_id` wird als expliziter, vom Handler gesetzter Parameter gebunden |
| T-260707kut-04 | Information Disclosure | ListProposedByGroup — Vorschlag eines App-Mitglieds verschwindet fuer Leader | accept-then-fix | Kein Sicherheitsrisiko, aber Funktionsluecke: ohne JOIN-Fix ist das Feature fuer Leader nutzlos (Vorschlaege unsichtbar); JOIN wird in Task 1 korrigiert |
| T-260707kut-05 | Elevation of Privilege | Doppelte Mitgliedschaft (hist + app) fuer dieselbe Gruppe erzeugt zwei Auswahl-Eintraege | mitigate | `ListMembershipsForMember` dedupliziert pro `fansub_group_id` (ein Eintrag pro Gruppe, unabhaengig davon ob hist und/oder app-Mitgliedschaft vorliegt) — reale SQL-Query in Task 1 Action-Schritt 5, verifiziert durch `TestDbMembershipsLister_QueryReferencesBothMembershipTables` |
</threat_model>

<verification>
1. `cd backend && go build ./... && go test ./internal/handlers/... ./internal/repository/... -run "Proposal|Membership" -v` — alle Tests grün, inkl. neuer App-Mitglieder- und Cross-Group-Tests UND `TestDbMembershipsLister_QueryReferencesBothMembershipTables` (verifiziert reales SQL, nicht nur Stub).
2. `cd frontend && npx tsc --noEmit && npx vitest run src/components/contributions/ProposalForm --reporter=dot` — keine Typfehler, alle Suiten grün, inkl. Guard-Regressionstest für Zeile 174.
3. Nach Backend-Rebuild (`docker compose up -d --build team4sv30-backend`) und Frontend-Neustart (`docker restart team4sv30-frontend`):
   a. Live-Token für `sheppert/123` (member_id 2, App-Mitglied C-Subs ohne hist-Eintrag) holen (Keycloak Direct-Grant).
   b. `GET /api/v1/me/memberships` mit diesem Token → Response enthält C-Subs.
   c. `POST /api/v1/me/contribution-proposals` mit `fansub_group_id` = C-Subs-ID, gültigem `anime_id`, `fansub_group_member_id: 0`, `role_codes: ["sub"]` → 201.
   d. Cross-Group-Versuch (fremde `fansub_group_id`, an der sheppert nicht beteiligt ist) → 403.
   e. `GET /admin/fansubs/:id/contribution-proposals` (als Leader von C-Subs) → der neue Vorschlag von sheppert erscheint mit korrektem Anzeigenamen.
   f. Frontend `/me/contributions` (oder aequivalente Route) als sheppert öffnen → "Hinweis senden"-Button ist aktiv, Wizard funktioniert bis zum Absenden (inkl. Schritt 1 → "Weiter", ohne "Bitte wähle eine Gruppe aus."-Fehlmeldung).
</verification>

<success_criteria>
- App-Mitglieder (nur `fansub_group_members`, kein `hist_fansub_group_members`-Eintrag) können über `GET /me/memberships` ihre Gruppe sehen und über `POST /me/contribution-proposals` erfolgreich einen Hinweis senden.
- Die reale SQL-Query in `dbMembershipsLister.ListMembershipsForMember` (nicht nur der Handler-Stub) referenziert beide Mitgliedschaftstabellen und dedupliziert pro Gruppe.
- Der Frontend-Submit-Guard blockiert App-Mitglieder nicht fälschlich als "keine Gruppe ausgewählt".
- Self-Proposal-Gate bleibt vollständig durchgesetzt: `member_id` kommt nur vom Server, Cross-Group-Versuche werden mit 403 abgelehnt (verifiziert durch automatisierte Tests UND Live-UAT).
- Bestehende hist_fansub_group_members-Mitglieder sind unverändert funktionsfähig (Regressionsfreiheit).
- Vorschläge von App-Mitgliedern erscheinen korrekt in der Leader-Review-Queue.
- Alle Tests (Backend Go, Frontend tsc + Vitest) grün.
- Keine Datei überschreitet 450 Zeilen Produktcode.
- Deutsche user-facing Strings mit korrekten Umlauten.
</success_criteria>

<output>
Create `.planning/quick/260707-kut-hinweis-senden-fuer-app-mitglieder-propo/260707-kut-SUMMARY.md` when done
</output>
</output>
