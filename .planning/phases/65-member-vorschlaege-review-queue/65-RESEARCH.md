# Phase 65: Member-Vorschläge und Review-Queue (Post-MVP) - Research

**Researched:** 2026-06-02
**Domain:** Brownfield-Erweiterung des bestehenden `anime_contributions`-Modells (Go/Gin Backend + Next.js Frontend) — Member-getriebene Proposals, Leader/Admin-Review-Queue, On-Read 90-Tage-Timeout
**Confidence:** HIGH (rein codebase-basiert; alle Claims durch Lesen der konkreten Dateien verifiziert)

## Summary

Phase 65 baut vollständig auf bereits existierender, in den Phasen 61–64 etablierter Infrastruktur auf. Das Datenmodell (`anime_contributions`, `anime_contribution_roles`, `role_definitions`, `member_claims`, `hist_fansub_group_members`) ist komplett vorhanden, inklusive Status-Enum mit `proposed`/`confirmed`/`disputed` und einem **bereits existierenden DB-Duplikat-Constraint** (`uq_anime_contribution_member`). Die Backend-Muster für Me-Routen (`contributions_me_handler.go` mit `resolveVerifiedMemberID()` und Ownership-Checks) sowie für Leader/Admin-Routen (`fansub_anime_contributions_handler.go` mit `permissions.Service.CanForFansubGroup` + `ActionFansubGroupMembersManage`) sind etabliert und direkt wiederverwendbar. Frontend-seitig existiert die `MyContributionsSection` bereits mit einem expliziten Platzhalter „Eigene Vorschläge — folgt in Phase 65".

Die drei zentralen Modellierungsfragen sind aufgelöst: (1) **Ablehngrund (D-08)** braucht eine neue Spalte — die nächste freie Migrationsnummer ist **0089**. (2) **unverified-Selbstschaltung vs. Leader-Bestätigung (D-15)** ist die kritischste Entscheidung: Die Public-Query berechnet `is_verified = (status = 'confirmed')` ohne persistentes Flag. Eine Selbstschaltung darf daher den Status NICHT auf `confirmed` setzen, sonst erschiene sie fälschlich als verifiziert. Empfehlung: Selbstgeschalteter Eintrag behält Status `proposed`, setzt nur `is_public_on_*`-Flags + `confirmed_by = eigene App-User-ID`, und die `(historisch)`-Logik bleibt korrekt, weil `status != 'confirmed'`. (3) **Handler-Platzierung (450-Zeilen-Limit)**: Beide Kandidaten-Handler sind nahe/an der Grenze (`contributions_me_handler.go` 329 Z., `fansub_anime_contributions_handler.go` 424 Z., `anime_contributions_repository.go` 447 Z.) — neue Endpunkte MÜSSEN in neue Dateien ausgelagert werden.

**Primary recommendation:** Drei neue Backend-Dateien (Proposal-Me-Handler, Review-Leader-Handler, Proposal-Repository-Datei) + Migration 0089 für Ablehngrund-Spalte; Selbstschaltung modelliert über Sichtbarkeitsflags ohne Statuswechsel auf `confirmed`; Frontend erweitert die bestehende `MyContributionsSection` und fügt eine Review-Queue-Komponente in die existierende `admin/my-groups/[id]/page.tsx` ein.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Vorschlags-Umfang**
- **D-01:** Member darf Contributions nur für **eigene Gruppen** vorschlagen (Gruppen mit bestehender historischer Mitgliedschaft via `hist_fansub_group_members`, verknüpft über verifizierte `member_claims`-Identität). Kein Vorschlagen für fremde/neue Gruppen.
- **D-02:** Pflichtangaben: **Anime + mindestens eine Rolle**. Zusätzlich **prominentes Freitext-Notizfeld**. `started_year`/`ended_year` optional.
- **D-03:** Member schlägt **nur die eigene Beteiligung** vor (an `member_claims`-Identität geknüpft). Keine Vorschläge für Dritte.

**Rollen-Auswahl**
- **D-04:** Auswahl aus dem **vollen Rollenkatalog** (`role_definitions`), Mehrfachauswahl, **mindestens eine Rolle Pflicht**. Zielmodell: `anime_contribution_roles` (CASCADE, UNIQUE pro contribution+role).

**Duplikat-Behandlung**
- **D-05:** Duplikat-Vorschlag wird **hart blockiert**. Kriterium: gleiche Kombination `fansub_group_member_id` + `anime_id` + `fansub_group_id`. Bei Treffer: aussagekräftiger Fehler, kein Insert.

**Review-Queue (Leader)**
- **D-06:** Queue lebt **pro Gruppe** im bestehenden Leader-Bereich (`frontend/src/app/manage/groups/[id]`). Leader sieht nur `proposed`-Einträge seiner Gruppe(n).
- **D-07:** **Ablehnen → Status `disputed`** (bleibt intern erhalten, nicht öffentlich). Kein Hard-Delete (Audit-Constraint).
- **D-08:** Ablehngrund **optional**; falls angegeben, im Dashboard für den Member sichtbar. → Benötigt neues Feld (`review_note`/`rejection_reason`) — exakte Spalte klärt Research/Planung.
- **D-09:** Review-Berechtigung: **Gruppen-Leader UND Plattform-Admins** (Admins als Fallback/Moderation).

**Sichtbarkeit nach Bestätigung**
- **D-10:** Bei **Bestätigung** (Status → `confirmed`): **beide** Sichtbarkeitsflags automatisch true (`is_public_on_anime_page` UND `is_public_on_member_profile`); `confirmed_by` = App-User-ID des Leaders/Admins, `confirmed_at = NOW()`.

**90-Tage-Timeout**
- **D-11:** Nach 90 Tagen ohne Reaktion: Member darf selbst öffentlich schalten — als **unverified** mit `(historisch)`-Soft-Label. Kein automatisches Eskalieren an Moderation.
- **D-12:** 90-Tage-Grenze **on-read** berechnet (`created_at + 90 Tage`) — kein Hintergrundjob in V1. Selbst-Schalt-Option erscheint im Dashboard erst nach Ablauf.
- **D-13:** Beim Einreichen erhält der Member einen **Hinweis auf die 90-Tage-Regel** im Formular.

**Audit-Attribution**
- **D-14:** Beim Einreichen: `created_by` = App-User-ID des Members. Bei Leader-Bestätigung: `confirmed_by` = Leader/Admin (siehe D-10).
- **D-15:** Bei Member-Selbstschaltung nach 90 Tagen: `confirmed_by` = **App-User-ID des Members** (Audit-Spur), Eintrag bleibt **unverified** markiert. → Offene Modellierungsfrage (siehe Open Questions). Status bei Selbst-Schaltung **NICHT zwingend `confirmed`**.

**Member-Dashboard-UX**
- **D-16:** Eingabe über **Inline-/Modal-Formular** in der „Eigene Vorschläge"-Sektion auf `me/contributions` (Button „+ Beitrag vorschlagen"). Kein Seitenwechsel.
- **D-17:** Eigene Vorschläge **nach Status gruppiert**: „In Prüfung" (`proposed`), „Bestätigt" (`confirmed`), „Abgelehnt" (`disputed`).
- **D-18:** Benachrichtigung über Entscheidungen in V1 **nur in-app** (Status beim nächsten Dashboard-Besuch). Kein E-Mail-Versand.

**Sprache**
- **D-19:** Alle user-facing Strings auf Deutsch mit korrekten Umlauten (Projektkonvention).

### Claude's Discretion
- Exaktes Schema-Detail für optionalen Ablehngrund (neue Spalte vs. wiederverwendbares Feld).
- Mechanismus zur Unterscheidung „unverified selbst-geschaltet" vs. „leader-confirmed" (D-15).
- Ob neue API-Endpunkte in bestehende Handler ergänzt oder in neue Handler ausgelagert werden (450-Zeilen-Limit beachten).
- Genaue Komponenten-/Dateistruktur der neuen UI-Abschnitte (analog Phase 64).

### Deferred Ideas (OUT OF SCOPE)
- E-Mail-Benachrichtigung an Member/Leader (SMTP existiert seit Phase 60) — bewusst aus V1 ausgeklammert (D-18).
- Automatisches Eskalieren abgelaufener Vorschläge an Moderations-Queue — verworfen zugunsten Member-Selbstschaltung (D-11).
- Geplanter Hintergrundjob für Timeout-Verarbeitung — verworfen zugunsten On-Read (D-12).
- Claiming/Verifizierung historischer Nicks (Phase 66), Episode-/Release-Credits (Phase 67), Badge-Engine + Archiv-Suche (Phase 68).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| P65-SC1 | POST /api/v1/me/contribution-proposals implementiert; Vorschlag erhält Status `proposed`. | `resolveVerifiedMemberID()` + Ownership-Muster aus `contributions_me_handler.go`; `Create()` aus `anime_contributions_repository.go`; DB-Constraint `uq_anime_contribution_member` liefert harten Duplikat-Block (D-05); Rollen-Insert-Muster vorhanden. |
| P65-SC2 | Leader sieht Review-Queue im Admin-Frontend, kann bestätigen/ablehnen. | `permissions.Service.CanForFansubGroup` + `ActionFansubGroupMembersManage` (deckt Leader + Plattform-Admin ab, D-09); Status-Update-Muster aus `Update()`; bestehende `admin/my-groups/[id]/page.tsx` als Host-Seite. |
| P65-SC3 | Nach 90 Tagen ohne Reaktion: Vorschlag als unverified öffentlich schaltbar (oder an Moderation). CONTEXT D-11 fixiert: NUR Member-Selbstschaltung, keine Moderation. | On-Read-Berechnung `created_at + 90 Tage` (Repository-Query oder Handler); Selbstschaltung über Sichtbarkeitsflags ohne `status=confirmed` damit `is_verified`-Logik korrekt unverified bleibt. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Identitätsauflösung Member (verifizierter `member_claims`) | API / Backend | DB | `resolveVerifiedMemberID()` ist Backend-only; nie aus Frontend ableitbar (D-01, D-03 Sicherheit) |
| Ownership-/Gruppen-Zugehörigkeitsprüfung | API / Backend | DB | JOIN über `hist_fansub_group_members.member_id`; Cross-Group-FK auf DB-Ebene |
| Duplikat-Block (D-05) | DB (Constraint) | API (Fehlerübersetzung) | `uq_anime_contribution_member` existiert bereits; API fängt `ErrConflict` und liefert deutschen Fehler |
| Review-Autorisierung Leader/Admin (D-09) | API / Backend | — | `permissions.Service.CanForFansubGroup`; Plattform-Admin ist Kurzschluss in der Service-Logik |
| 90-Tage-Berechnung (D-12) | API / Backend | Frontend (Anzeige-Gate) | On-Read im Repository/Handler; Frontend gated nur die Sichtbarkeit des Buttons (kein vertrauenswürdiges Gate) |
| Statusübergänge proposed→confirmed/disputed | API / Backend | DB | Status-Check-Constraint + Update-Muster |
| Member-Vorschlagsformular / Status-Gruppierung | Frontend Server (Next.js Client Components) | API | UI-Eingabe, Validierung (min. 1 Rolle clientseitig), Anzeige (D-16, D-17) |
| Review-Queue-Anzeige + Aktionen | Frontend (Client Component) | API | In `admin/my-groups/[id]` eingebettet (D-06) |

## Standard Stack

Diese Phase fügt **keine neuen externen Pakete** hinzu. Sie nutzt ausschließlich den bestehenden, in `CLAUDE.md` dokumentierten Stack.

### Core (bereits installiert, wiederverwenden)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Gin | `github.com/gin-gonic/gin` | HTTP-Handler | Bestehendes Handler-Pattern, projektweit |
| pgx/v5 | `github.com/jackc/pgx/v5` | DB-Zugriff | Bestehendes Repository-Pattern, `pgxpool.Pool` |
| Next.js | 16 (App Router) | Frontend | Bestehende Route-Struktur |
| React | 18.3.1 | UI | Client Components für interaktive Formulare |
| Vitest | 3 | Frontend-Tests | Bestehende `*.test.tsx`-Konvention |
| testify | `github.com/stretchr/testify` | Go-Tests (verfügbar) | Handler-Tests nutzen aber primär `httptest` + Stubs |

### Supporting (vorhandene interne Komponenten)
| Komponente | Datei | Purpose |
|-----------|-------|---------|
| `permissions.Service` | `backend/internal/permissions/permissions.go` | Leader/Admin-Autorisierung (D-09) |
| `AuditLogRepository` | `backend/internal/repository/` | Audit-Attribution (D-14) — Review-Aktionen sollten Audit-Einträge schreiben analog `fansub_anime_contributions_handler.go` |
| UI-Kit (`@/components/ui`) | `Button`, `Card`, `Badge`, `Table`, `EmptyState`, `ErrorState`, `LoadingState` | Wiederverwenden für Review-Queue + Formular |
| `ContributionCard`, `VisibilityDropdown` | `frontend/src/components/contributions/` | Bestehende Bausteine für die Dashboard-Darstellung |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Neue Spalte `review_note` | Wiederverwendung von `note` | ❌ Verworfen: `note` ist der Member-Kontext (D-02), nicht der Leader-Ablehngrund. Getrennte Spalte nötig. |
| Status `confirmed` bei Selbstschaltung | Status bleibt `proposed` + Flags | ✅ Empfohlen (siehe Open Questions / D-15) |
| Eigene `manage/groups/[id]`-Route bauen | Bestehende `admin/my-groups/[id]` erweitern | ✅ `manage/groups` ist nur Re-Export von `admin/my-groups`; Review-Queue gehört in die existierende Detailseite |

**Installation:** Keine. `go build ./...` und `npm run build` mit bestehenden Dependencies.

## Package Legitimacy Audit

> Nicht zutreffend — diese Phase installiert **keine externen Pakete**. Es werden ausschließlich bereits im Repo vorhandene und in `CLAUDE.md` dokumentierte Dependencies genutzt. Slopcheck/Registry-Verifikation entfällt.

## Architecture Patterns

### System Architecture Diagram

```
MEMBER-VORSCHLAG (P65-SC1)
  Browser (me/contributions, Modal-Formular D-16)
    │  Anime + Rollen[≥1] + Notiz + (optional Jahre)
    ▼
  POST /api/v1/me/contribution-proposals   [authMiddleware]
    │
    ▼
  ProposalMeHandler
    ├─ requireMeIdentity() ──────────────► 401 wenn nicht eingeloggt
    ├─ resolveVerifiedMemberID(appUserID) ► 404 wenn kein verifizierter member_claim
    ├─ Gruppen-Zugehörigkeit prüfen (D-01) ► hist_fansub_group_members für diesen member
    │     (member darf nur fansub_group_member_id wählen, die SEINER member_id gehört → D-03)
    ├─ Rollen validieren (≥1, gegen role_definitions context='anime_contribution', D-04)
    └─ Repository.Create(status='proposed', created_by=appUserID, D-14)
          │
          ▼
        INSERT anime_contributions
          ├─ uq_anime_contribution_member ─► ErrConflict ► 409 "Beitrag existiert bereits" (D-05)
          └─ fk_anime_contributions_member_group ─► Cross-Group-Schutz (DB)
        INSERT anime_contribution_roles (CASCADE, UNIQUE)

REVIEW-QUEUE (P65-SC2)
  Browser (admin/my-groups/[id], Review-Queue-Komponente D-06)
    │
    ▼
  GET  /api/v1/admin/fansubs/:id/contribution-proposals  ► Liste status='proposed' der Gruppe
  POST /api/v1/admin/fansubs/:id/contribution-proposals/:cid/confirm  (D-10)
  POST /api/v1/admin/fansubs/:id/contribution-proposals/:cid/reject   (D-07, optional review_note D-08)
    │
    ▼
  ReviewHandler
    ├─ permissionSvc.CanForFansubGroup(actor, ActionFansubGroupMembersManage, fansubID)  (D-09)
    │     └─ Plattform-Admin = Kurzschluss; Fansub-Lead = roleMatrix
    ├─ confirm: status='confirmed', is_public_on_anime_page=true,
    │           is_public_on_member_profile=true, confirmed_by=admin, confirmed_at=NOW() (D-10)
    ├─ reject:  status='disputed', review_note=<optional> (D-07, D-08); kein Delete
    └─ auditLogRepo.Write(...) (D-14)

90-TAGE-SELBSTSCHALTUNG (P65-SC3)
  GET /api/v1/me/anime-contributions  (bestehend, erweitert)
    └─ Repository liefert pro Eintrag: kann_selbst_schalten = (status='proposed'
         AND created_at + INTERVAL '90 days' < NOW())   ◄── On-Read (D-12)
  Browser zeigt Button "Historisch öffentlich schalten" nur wenn kann_selbst_schalten
    │
    ▼
  POST /api/v1/me/anime-contributions/:cid/self-publish
    ├─ Ownership-Check (eigener Eintrag)
    ├─ Re-Check 90 Tage SERVERSEITIG (Frontend-Gate ist untrusted)
    ├─ status BLEIBT 'proposed' (NICHT confirmed → is_verified bleibt false) (D-15)
    ├─ is_public_on_anime_page=true, is_public_on_member_profile=true
    └─ confirmed_by = eigene App-User-ID (Audit-Spur D-15), confirmed_at=NOW()
```

### Recommended Project Structure

```
backend/internal/
├── handlers/
│   ├── contribution_proposals_me_handler.go   # NEU: POST proposals + self-publish (Me-Routen)
│   └── contribution_review_handler.go          # NEU: Leader/Admin confirm/reject + list queue
├── repository/
│   └── anime_contributions_proposal_repository.go  # NEU: CreateProposal, ListProposedByGroup,
│                                                    #      Confirm, Reject, SelfPublish, kann_selbst_schalten
database/migrations/
├── 0089_anime_contributions_review_note.up.sql     # NEU: review_note-Spalte (D-08)
└── 0089_anime_contributions_review_note.down.sql

frontend/src/
├── components/contributions/
│   ├── ProposalForm.tsx           # NEU: Modal-/Inline-Formular (D-16, Anime+Rollen+Notiz+90-Tage-Hinweis D-13)
│   ├── MyProposalsSection.tsx     # NEU oder Erweiterung von MyContributionsSection (D-17 Gruppierung)
│   └── ReviewQueue.tsx            # NEU: Leader-Queue-Komponente (D-06)
├── app/admin/my-groups/[id]/
│   └── page.tsx                   # ERWEITERN: ReviewQueue einbinden (Datei ist 421 Z. → Logik in Komponente)
├── lib/api.ts                     # ERWEITERN: createContributionProposal, listGroupProposals,
│                                  #            confirmProposal, rejectProposal, selfPublishContribution
└── types/contributions.ts        # ERWEITERN: ProposalRequest, GroupProposalRow, review_note,
                                   #            can_self_publish-Feld auf MeAnimeContribution
shared/contracts/
└── (neu) contributions.yaml ODER openapi.yaml-Ergänzung  # Contribution-Endpunkte sind aktuell NICHT dokumentiert
```

### Pattern 1: Verifizierte Member-Identität auflösen (D-01, D-03)
**What:** Jeder Me-Endpunkt löst zuerst die `member_id` über einen verifizierten `member_claims`-Eintrag auf.
**When to use:** In ALLEN neuen Member-Vorschlags-/Selbstschaltungs-Endpunkten.
**Example:**
```go
// Source: backend/internal/handlers/contributions_me_handler.go:39-54 [VERIFIED: codebase grep]
func (h *ContributionsMeHandler) resolveVerifiedMemberID(ctx context.Context, appUserID int64) (int64, error) {
	var memberID int64
	err := h.db.QueryRow(ctx, `
		SELECT member_id FROM member_claims
		WHERE app_user_id = $1 AND claim_status = 'verified'
		ORDER BY verified_at DESC
		LIMIT 1
	`, appUserID).Scan(&memberID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) { return 0, repository.ErrNotFound }
		return 0, err
	}
	return memberID, nil
}
```

### Pattern 2: Leader/Admin-Autorisierung pro Gruppe (D-09)
**What:** `permissionSvc.CanForFansubGroup` deckt Fansub-Lead UND Plattform-Admin in einem Aufruf ab.
**When to use:** Review-Queue-Endpunkte (list/confirm/reject).
**Example:**
```go
// Source: backend/internal/handlers/fansub_anime_contributions_handler.go:140-149 [VERIFIED: codebase grep]
result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor,
	permissions.ActionFansubGroupMembersManage, fansubID)
if err != nil { writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden."); return }
if !result.Allowed {
	auditPermissionDenied(c, h.auditLogRepo, identity, "contribution_proposal.review.denied",
		&fansubID, "anime_contribution", &contributionID, permissions.ActionFansubGroupMembersManage, result)
	writePermissionDenied(c, result); return
}
// roleMatrix[RoleFansubLead] enthält ActionFansubGroupMembersManage (permissions.go:64-81)
// Plattform-Admin wird im Service kurzgeschlossen (ReasonPlatformAdmin)
```

### Pattern 3: Harter Duplikat-Block über bestehenden Constraint (D-05)
**What:** Kein neuer Pre-Check nötig — `uq_anime_contribution_member` existiert bereits (Migration 0088). Repository fängt Unique-Violation und mappt auf `ErrConflict`.
**When to use:** Beim Proposal-Insert.
**Example:**
```sql
-- Source: database/migrations/0088_anime_contributions_constraints.up.sql:21-23 [VERIFIED: codebase]
ALTER TABLE anime_contributions
    ADD CONSTRAINT uq_anime_contribution_member
    UNIQUE (fansub_group_id, anime_id, fansub_group_member_id);
```
```go
// Repository: isUniqueViolation(err) → ErrConflict; Handler → 409 + deutsche Nachricht
// Vorhandenes Mapping-Muster: anime_contributions_repository.go:344-346
```

### Pattern 4: On-Read 90-Tage-Berechnung (D-12)
**What:** Selbst-Schalt-Berechtigung als berechnetes Feld in der Me-Listen-Query — kein Hintergrundjob.
**When to use:** Erweiterung der `ListByMemberID`-Query bzw. der Me-Response.
**Example:**
```sql
-- NEU in Proposal-Repository (analog ListByMemberID, member_repository.go:10)
SELECT ...,
  (ac.status = 'proposed' AND ac.created_at + INTERVAL '90 days' < NOW()) AS can_self_publish
FROM anime_contributions ac
JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
WHERE hfgm.member_id = $1
```

### Anti-Patterns to Avoid
- **Status auf `confirmed` bei Selbstschaltung setzen:** Die Public-Query berechnet `is_verified = (status = 'confirmed')` (`anime_contributions_public_repository.go:106`). Eine Selbstschaltung mit `confirmed` würde fälschlich als verifiziert angezeigt — verletzt D-11/D-15 (`unverified`/`(historisch)`).
- **90-Tage-Gate nur im Frontend:** Frontend-Sichtbarkeit ist untrusted. Der Self-Publish-Endpunkt MUSS die 90 Tage serverseitig re-validieren.
- **Neue Endpunkte in die vollen Handler-Dateien quetschen:** `fansub_anime_contributions_handler.go` (424 Z.) und `anime_contributions_repository.go` (447 Z.) sind am Limit. Auslagern ist Pflicht (`CLAUDE.md` 450-Zeilen-Regel).
- **`note` für den Ablehngrund missbrauchen:** `note` ist der Member-Kontext (D-02). Ablehngrund braucht eine eigene Spalte (D-08).
- **`fansub_group_member_id` ungeprüft aus dem Request übernehmen:** Member darf nur eigene Mitgliedschaften referenzieren — sonst Identitäts-Spoofing (D-03). Serverseitig gegen `resolveVerifiedMemberID` JOINen.
- **ASCII-Umlaute in user-facing Strings:** `CLAUDE.md` verbietet ae/oe/ue/ss in JSX-Text, Fehlermeldungen, Placeholdern, Go-Response-Strings (D-19).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Duplikat-Erkennung | Eigener SELECT-vor-INSERT-Check | Bestehender `uq_anime_contribution_member`-Constraint + `ErrConflict`-Mapping | Race-frei; Constraint existiert schon (Migration 0088) |
| Cross-Group-Schutz | Manuelle Gruppenprüfung im Handler | `fk_anime_contributions_member_group` (DB) + `MemberBelongsToFansub()` | DB-FK garantiert Integrität; Helper existiert |
| Leader-vs-Admin-Unterscheidung | Eigene Rollenabfrage | `permissions.Service.CanForFansubGroup` | Plattform-Admin-Kurzschluss + roleMatrix bereits implementiert (D-09) |
| Member-Identität | App-User-ID direkt als Member nutzen | `resolveVerifiedMemberID()` | Trennt App-User von historischer Member-Identität (member_claims) |
| Rollen-Katalog | Hardcoded Rollenliste im Frontend | `role_definitions` mit `contexts @> 'anime_contribution'` | Zentrale Quelle (`0085_role_definitions_seed`), `label_de` für UI |
| Audit-Logging | Eigene Log-Zeilen | `auditLogRepo.Write(AuditLogEntry{...})` | Bestehendes strukturiertes Audit (D-14, Observability-Constraint) |
| Status-/Rollen-Transaktion | Separate Inserts ohne TX | `Create()`/`Update()`-TX-Muster im Repository | Atomar (Contribution + Rollen) |

**Key insight:** Phase 65 ist fast vollständig eine Verdrahtungs- und UI-Aufgabe. Das Datenmodell und die Sicherheits-/Integritätsmechanismen sind aus den Phasen 61–64 bereits vorhanden. Der Eigenbau-Bedarf beschränkt sich auf: eine Spalte (review_note), das berechnete `can_self_publish`-Feld, und die UI-Komponenten.

## Common Pitfalls

### Pitfall 1: Selbstgeschalteter Eintrag erscheint als „verifiziert"
**What goes wrong:** Selbstschaltung setzt `status='confirmed'`, dann zeigt die Public-Anime-Seite `is_verified=true` statt `(historisch)`.
**Why it happens:** `is_verified` ist KEIN Flag, sondern `(ac.status = 'confirmed')` berechnet (`anime_contributions_public_repository.go:106`).
**How to avoid:** Selbstschaltung lässt Status auf `proposed`, setzt nur Sichtbarkeitsflags + `confirmed_by=self`. Verifikationsdarstellung bleibt korrekt unverified.
**Warning signs:** Self-published Beiträge ohne `(historisch)`-Label auf Anime-/Member-Seiten.

### Pitfall 2: 450-Zeilen-Limit beim Repository gerissen
**What goes wrong:** Neue Proposal-Queries in `anime_contributions_repository.go` (bereits 447 Z.) eingefügt → Datei > 450.
**Why it happens:** Naheliegender Ort, aber Datei ist am Limit; es existiert bereits eine ausgelagerte `anime_contributions_member_repository.go`.
**How to avoid:** Proposal-/Review-Repository-Methoden in NEUE Datei `anime_contributions_proposal_repository.go` (gleiche `AnimeContributionsRepository`-Methoden-Erweiterung wie member_repository).
**Warning signs:** `wc -l` über 450 nach Edit.

### Pitfall 3: Member schlägt für fremde Mitgliedschaft vor (D-03-Verletzung)
**What goes wrong:** Request liefert beliebige `fansub_group_member_id`; Handler übernimmt sie ohne Eigentümer-Check.
**Why it happens:** Der bestehende Admin-Handler (`fansub_anime_contributions_handler.go`) erlaubt jedes Gruppenmitglied — das ist für Admins korrekt, für Member-Self-Service aber falsch.
**How to avoid:** Im Member-Endpunkt sicherstellen, dass `hist_fansub_group_members.member_id == resolveVerifiedMemberID(appUserID)` für die gewählte Mitgliedschaft. Idealerweise ableiten statt entgegennehmen: Member wählt nur die Gruppe, Backend ermittelt die zugehörige `fansub_group_member_id`.
**Warning signs:** Proposals mit `created_by` ≠ Member der Contribution.

### Pitfall 4: ContributionsMeHandler nutzt `*pgxpool.Pool` direkt (Testbarkeit)
**What goes wrong:** Der bestehende Me-Handler hält `db *pgxpool.Pool` statt eines Repository-Interfaces; die etablierten Handler-Tests (`httptest` + Repo-Stubs) lassen sich darauf NICHT anwenden.
**Why it happens:** `contributions_me_handler.go:21` greift roh auf den Pool zu.
**How to avoid:** Neue Proposal-Endpunkte gegen das `AnimeContributionsRepository` (Interface-fähig) schreiben, nicht gegen den rohen Pool. Dann sind Stub-basierte Handler-Tests wie in `admin_content_anime_relations_test.go` möglich.
**Warning signs:** Neue Logik direkt mit `h.db.QueryRow(...)` statt über Repository-Methoden.

### Pitfall 5: Review-Queue im falschen Route-Segment
**What goes wrong:** Geplant wird `frontend/src/app/manage/groups/[id]` als neue Datei (CONTEXT D-06), aber das ist nur ein Re-Export.
**Why it happens:** `manage/groups/page.tsx` enthält nur `export { default } from "../../admin/my-groups/page";` und es gibt KEIN `manage/groups/[id]/`-Verzeichnis. Die echte Detailseite ist `admin/my-groups/[id]/page.tsx`.
**How to avoid:** Review-Queue in die bestehende `admin/my-groups/[id]/page.tsx` (421 Z.) einbinden — als separate Komponente, da die Datei nahe 450 ist. `manage/groups/[id]` würde automatisch über den Re-Export funktionieren, falls ein `[id]`-Re-Export ergänzt wird.
**Warning signs:** Neue `manage/groups/[id]/page.tsx` ohne Bezug zur bestehenden my-groups-Detailseite.

## Code Examples

### Status-Update-Muster für Review (confirm/reject)
```go
// Source: backend/internal/repository/anime_contributions_repository.go:359-416 (Update) [VERIFIED]
// Confirm: setClauses für status='confirmed', is_public_on_anime_page=true,
//          is_public_on_member_profile=true, confirmed_by=$admin, confirmed_at=NOW()
// Reject:  status='disputed', review_note=$optional (neue Spalte)
// Vorhandenes addArg()-Builder-Muster wiederverwenden.
```

### Rollen-Validierung gegen Kontext
```go
// Source: fansub_anime_contributions_handler.go:193-208 [VERIFIED]
for _, code := range req.RoleCodes {
	valid, err := h.rolesRepo.RoleCodeExistsForContext(c.Request.Context(), code, "anime_contribution")
	if err != nil { internalError(c, "interner serverfehler"); return }
	if !valid {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
			"message": fmt.Sprintf("ungültiger role_code für anime_contribution-Kontext: %s", code)}})
		return
	}
}
// D-04: zusätzlich len(RoleCodes) >= 1 erzwingen (Pflicht min. 1 Rolle).
```

### Frontend: bestehender Confirm/Reject-Call (Vorlage für neue Calls)
```typescript
// Source: frontend/src/lib/api.ts:6910-6960 [VERIFIED via grep]
// confirmAnimeContribution / rejectAnimeContribution existieren bereits für Me-Routen.
// Neue Calls analog: createContributionProposal(body), selfPublishContribution(id),
//   listGroupProposals(fansubId), confirmProposal(fansubId, cid), rejectProposal(fansubId, cid, note?)
```

### Migration 0089 (Ablehngrund, D-08)
```sql
-- database/migrations/0089_anime_contributions_review_note.up.sql (append-only, nächste freie Nummer)
ALTER TABLE anime_contributions
    ADD COLUMN IF NOT EXISTS review_note TEXT NULL;
-- .down.sql: ALTER TABLE anime_contributions DROP COLUMN IF EXISTS review_note;
```

## Runtime State Inventory

> Diese Phase ist überwiegend additiv (neue Endpunkte, Spalte, UI), enthält aber eine Migration und Statuslogik. Geprüft:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Bestehende `anime_contributions`-Zeilen haben kein `review_note`. Neue Spalte ist nullable → keine Datenmigration nötig. Bestehende `proposed`-Einträge (falls vorhanden) werden ab Deploy automatisch von der On-Read-90-Tage-Logik erfasst (`created_at` ist gesetzt). | Migration 0089 (Schema-only); keine Backfill-Migration |
| Live service config | Keine externe Service-Konfiguration betroffen. SMTP/Mailpit existiert, wird aber bewusst NICHT genutzt (D-18). | None |
| OS-registered state | Kein Hintergrundjob/Scheduler (D-12 = On-Read). Keine OS-Registrierung. | None — explizit verifiziert (kein Cron/Job-Code für Timeout) |
| Secrets/env vars | Keine neuen Secrets oder Env-Vars. Auth über bestehende Middleware. | None |
| Build artifacts | Go-Binary (`cmd/server`) und Next.js-Build werden neu gebaut. Keine stale Artefakte mit altem Namen. | Standard `go build` / `npm run build` |

**Migrations-Doppel-Standort beachten:** Es existieren zwei Migrationsorte (`database/migrations/` und `backend/database/migrations/` laut CLAUDE.md). Primär ist `database/migrations/` — dort liegen 0086–0088. Planung muss prüfen, ob 0089 in beiden Orten gespiegelt werden muss (siehe Open Questions).

## Common Pitfalls (Sicherheit / Constraints zusammengefasst)

- **D-01/D-03 Identität:** Niemals `fansub_group_member_id` ungeprüft übernehmen — gegen verifizierte Member-Identität binden.
- **D-09 Autorisierung:** Ausschließlich `CanForFansubGroup` nutzen, keine eigene Rollenlogik.
- **D-05 Duplikate:** Auf DB-Constraint vertrauen, `ErrConflict` sauber übersetzen.
- **D-19 Umlaute:** Alle deutschen Strings mit korrekten Umlauten.
- **450-Zeilen-Limit:** Neue Dateien statt Erweiterung der vollen Handler/Repos.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Verifikation als persistentes Flag | `is_verified` berechnet aus `status='confirmed'` | Phase 62/64 | Selbstschaltung darf Status nicht auf confirmed setzen (D-15) |
| Duplikat-Schutz im Handler | DB-Constraint `uq_anime_contribution_member` | Phase 61 (Migration 0088) | Kein Handler-Pre-Check nötig (D-05) |
| Separate Leader-/Admin-Checks | Einheitliche `permissions.Service` | Phase 44 (AUTHZ-ENGINE-01) | Ein Aufruf deckt D-09 ab |

**Deprecated/outdated:**
- `contributor_roles` (Migration 0065) ist die ALTE Rollentabelle für Release-Credits; für Anime-Contributions gilt `role_definitions` (Migration 0085). Nicht verwechseln — Phase 65 nutzt `role_definitions` mit `contexts @> 'anime_contribution'`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Migration 0089 ist die nächste freie Nummer und muss nur in `database/migrations/` liegen (nicht zwingend auch in `backend/database/migrations/`) | Runtime State / Migration | Migration läuft im falschen/doppelten Ort nicht durch; Planung sollte den genutzten Migrationspfad in `docker-compose`/`cmd/migrate` verifizieren |
| A2 | Selbstschaltung mit Status `proposed` + Sichtbarkeitsflags ist die saubere Lösung für D-15 (keine Schema-Erweiterung um ein dediziertes `self_published`/`is_unverified`-Flag) | Open Questions Q1 | Falls Produkt später „self-published" explizit von „proposed offen" unterscheiden muss, fehlt ein Flag → spätere Migration; alternativ ein boolesches `self_published`-Feld in 0089 mitnehmen |
| A3 | `note` (D-02 Member-Kontext) und neuer `review_note` (D-08 Leader-Grund) sind getrennte Felder | Standard Stack / Migration | Falls Produkt nur EIN Notizfeld wollte, wäre review_note redundant — CONTEXT D-08 fordert aber explizit ein separates, member-sichtbares Ablehngrund-Feld |
| A4 | Plattform-Admin wird in `CanForFansubGroup` korrekt kurzgeschlossen (ReasonPlatformAdmin), deckt D-09-Fallback ab | Pattern 2 | Falls nicht, müssten Admins separat behandelt werden; permissions_test.go deutet auf korrektes Verhalten hin, exakter Service-Code nicht vollständig gelesen |
| A5 | Contribution-Endpunkte sind aktuell NICHT in `shared/contracts/openapi.yaml` dokumentiert (nur `recent_contributions` als Schema-Feld) | Open Questions Q3 | Falls doch in separater Datei dokumentiert, ist der Contract-Pflegeaufwand geringer |

## Open Questions

1. **D-15 — Modell für „unverified selbst-geschaltet“ vs. „leader-confirmed“** (RESOLVED)
   - Resolution: Variante A wird umgesetzt — Status bleibt `proposed`, Sichtbarkeitsflags werden gesetzt, `confirmed_by` = eigene App-User-ID. `is_verified` bleibt false, `(historisch)`-Label korrekt. Kein `self_published`-Flag in Migration 0089, da minimal-invasiv und ausreichend für V1. Plan 01 Task 2 und Plan 02 Task 1 implementieren entsprechend.

2. **Migrationspfad (ein oder zwei Orte)** (RESOLVED)
   - Resolution: Nur **`database/migrations/`**. Verifiziert durch Lesen von `docker-compose.yml` (Volume-Mount: `./database/migrations:/app/database/migrations:ro`) und `backend/cmd/migrate/main.go`/`backend/internal/migrations/runner.go` (ResolveMigrationsDir sucht `database/migrations/` relativ zum Arbeitsverzeichnis). `backend/database/migrations/` enthält nur eine README und wird vom Migrationssystem nicht genutzt. Migration 0089 gehört ausschließlich in `database/migrations/`.

3. **OpenAPI-Contract-Pflege** (RESOLVED)
   - Resolution: Neue Endpunkte (POST /me/contribution-proposals, POST /me/anime-contributions/:cid/self-publish, GET /me/memberships, GET /admin/fansubs/:id/contribution-proposals, POST .../confirm, POST .../reject) werden in einer neuen Datei `shared/contracts/contributions.yaml` dokumentiert und in `shared/contracts/openapi.yaml` als `$ref` eingebunden. Task ist in Plan 04 ergänzt (WARNING 5-Fix).
## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Backend-Framework | Go `testing` + `httptest` + Repository-/Authz-Stubs (Interface-basiert). testify verfügbar, aber Handler-Tests nutzen primär Standard-`testing`. |
| Backend-Config | keine separate Config; `gin.SetMode(gin.TestMode)` |
| Frontend-Framework | Vitest 3 + Testing Library (`*.test.tsx`, z. B. `RecentContributionsSection.test.tsx`) |
| Frontend-Config | `frontend/vitest.config.ts` (Pfad-Alias `@`) |
| Quick run (Backend) | `go test ./backend/internal/handlers/... ./backend/internal/repository/...` |
| Quick run (Frontend) | `npm --prefix frontend test` (Vitest) |
| Full suite | `go test ./...` + `npm --prefix frontend test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| P65-SC1 | Proposal-POST setzt status=`proposed`, created_by=member | unit (handler+stub) | `go test ./backend/internal/handlers/ -run TestCreateContributionProposal` | ❌ Wave 0 |
| P65-SC1 | min. 1 Rolle erzwungen (D-04) → 422 bei 0 Rollen | unit | `go test ./backend/internal/handlers/ -run TestProposal_RequiresRole` | ❌ Wave 0 |
| P65-SC1 | Duplikat (gleiche Gruppe+Anime+Member) → 409 (D-05) | unit (repo stub liefert ErrConflict) | `go test ./backend/internal/handlers/ -run TestProposal_DuplicateBlocked` | ❌ Wave 0 |
| P65-SC1 | fremde `fansub_group_member_id` → 403 (D-03) | unit | `go test ./backend/internal/handlers/ -run TestProposal_RejectsForeignMembership` | ❌ Wave 0 |
| P65-SC2 | confirm setzt status=confirmed + beide Public-Flags + confirmed_by/at (D-10) | unit | `go test ./backend/internal/handlers/ -run TestReviewConfirm` | ❌ Wave 0 |
| P65-SC2 | reject setzt status=disputed + optional review_note (D-07/D-08), kein Delete | unit | `go test ./backend/internal/handlers/ -run TestReviewReject` | ❌ Wave 0 |
| P65-SC2 | Nicht-Leader/Nicht-Admin → 403 (D-09) | unit (permission-stub) | `go test ./backend/internal/handlers/ -run TestReview_PermissionDenied` | ❌ Wave 0 |
| P65-SC3 | `can_self_publish` = true nur wenn status=proposed UND created_at+90d < NOW (D-12) | unit (repo) | `go test ./backend/internal/repository/ -run TestCanSelfPublishTimeout` | ❌ Wave 0 |
| P65-SC3 | Self-Publish vor 90 Tagen → 403/422 (Server-Re-Check) | unit | `go test ./backend/internal/handlers/ -run TestSelfPublish_Before90DaysRejected` | ❌ Wave 0 |
| P65-SC3 | Self-Publish behält status=proposed, setzt Public-Flags, is_verified bleibt false (D-15) | unit | `go test ./backend/internal/handlers/ -run TestSelfPublish_StaysUnverified` | ❌ Wave 0 |
| P65-SC2/UI | Review-Queue rendert proposed-Einträge + Confirm/Reject-Aktionen | component (Vitest) | `npm --prefix frontend test ReviewQueue` | ❌ Wave 0 |
| P65-SC1/UI | ProposalForm erzwingt min. 1 Rolle + zeigt 90-Tage-Hinweis (D-13) | component | `npm --prefix frontend test ProposalForm` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `go test ./backend/internal/handlers/... -run <relevanter Test>` bzw. `npm --prefix frontend test <Komponente>`
- **Per wave merge:** `go test ./backend/... && npm --prefix frontend test`
- **Phase gate:** `go test ./...` grün + `npm --prefix frontend test` grün vor `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/internal/handlers/contribution_proposals_me_test.go` — P65-SC1, P65-SC3 (Handler)
- [ ] `backend/internal/handlers/contribution_review_test.go` — P65-SC2, D-09
- [ ] `backend/internal/repository/anime_contributions_proposal_repository_test.go` — On-Read-90-Tage (kann echte DB benötigen; alternativ Query-Logik isolieren). Prüfen, ob bestehende Repo-Tests echte DB nutzen — die gelesenen Handler-Tests nutzen Stubs.
- [ ] `frontend/src/components/contributions/ReviewQueue.test.tsx`
- [ ] `frontend/src/components/contributions/ProposalForm.test.tsx`
- [ ] **Testbarkeits-Voraussetzung:** Neue Member-Endpunkte gegen `AnimeContributionsRepository` (Interface) schreiben, NICHT gegen rohen `*pgxpool.Pool` (sonst keine Stub-Tests möglich — siehe Pitfall 4).

## Security Domain

> `security_enforcement` ist in `.planning/config.json` nicht explizit auf `false` gesetzt → Security-Domain inkludiert.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | ja | Bestehende `authMiddleware` auf allen neuen Routen; `requireMeIdentity()` |
| V3 Session Management | nein (delegiert) | Keycloak/Auth-Client (Phase 49/51) — keine neue Session-Logik |
| V4 Access Control | **ja (zentral)** | Member: `resolveVerifiedMemberID` + Ownership (D-01/D-03). Leader/Admin: `permissions.Service.CanForFansubGroup` (D-09). Server-seitige 90-Tage-Re-Validierung (D-12). |
| V5 Input Validation | ja | Rollen gegen `role_definitions`-Kontext; min. 1 Rolle; Jahre-Range via `chk_anime_contributions_years`; Gin `ShouldBindJSON` |
| V6 Cryptography | nein | Keine Krypto-Operationen in dieser Phase |
| V7 Error Handling/Logging | ja | Audit über `auditLogRepo.Write` (D-14); deutsche Fehlermeldungen ohne Stacktrace-Leak (`internalError`-Muster) |

### Known Threat Patterns für Go/Gin + Next.js + Postgres

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Identitäts-Spoofing: Member schlägt für fremde Mitgliedschaft vor | Spoofing/Elevation | `fansub_group_member_id` aus verifizierter Identität ableiten, nicht aus Request übernehmen (D-03) |
| Autorisierungs-Umgehung der Review-Aktionen | Elevation of Privilege | `CanForFansubGroup` auf JEDER Review-Route; Audit bei Denied |
| Vorzeitige Selbstschaltung (Frontend-Gate umgangen) | Tampering | Serverseitige 90-Tage-Re-Validierung im Self-Publish-Endpunkt |
| SQL-Injection | Tampering | pgx-parametrisierte Queries (bestehendes Muster, $1/$2…) |
| XSS über Notiz-/Ablehngrund-Freitext | Tampering | React escaped per Default; Freitext NICHT via `dangerouslySetInnerHTML` rendern |
| Audit-Lücke bei Status-Änderungen | Repudiation | `confirmed_by`/`created_by`/`review_note` + `auditLogRepo.Write` (Observability-Constraint, D-14) |
| Hard-Delete umgeht Audit | Repudiation | Ablehnen = Status `disputed`, kein Delete (D-07) |

## Environment Availability

> Diese Phase ist reine Anwendungs-Erweiterung innerhalb des bestehenden Stacks. Keine neuen externen Tools/Services.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Go-Toolchain | Backend-Build/Test | ✓ (Projekt) | Go 1.25 (go.mod) | — |
| Postgres 16 | Migration 0089 + Queries | ✓ (docker-compose) | 16 | — |
| Node/Next.js | Frontend-Build/Test | ✓ (Projekt) | Next.js 16 / React 18.3.1 | — |
| `cmd/migrate` | Migration anwenden | ✓ (Projekt) | — | manuell via psql |

**Missing dependencies with no fallback:** Keine.
**Missing dependencies with fallback:** Keine.

## Sources

### Primary (HIGH confidence) — codebase, direkt gelesen
- `database/migrations/0086_anime_contributions.up.sql` — Tabelle, Status-Enum, Sichtbarkeitsflags, confirmed_by/created_by
- `database/migrations/0087_anime_contribution_roles_and_badges.up.sql` — anime_contribution_roles (CASCADE, UNIQUE), member_badges
- `database/migrations/0088_anime_contributions_constraints.up.sql` — Cross-Group-FK + **Duplikat-Constraint** (D-05 bereits gelöst)
- `database/migrations/0085_role_definitions_seed.up.sql` — Rollenkatalog, contexts, label_de (D-04)
- `backend/internal/handlers/contributions_me_handler.go` (329 Z.) — resolveVerifiedMemberID, Ownership, Status-Update-Muster
- `backend/internal/handlers/fansub_anime_contributions_handler.go` (424 Z.) — Leader/Admin-Muster, Permissions, Audit, Rollen-Validierung
- `backend/internal/repository/anime_contributions_repository.go` (447 Z.) — Create/Update-TX-Muster, ErrConflict-Mapping
- `backend/internal/repository/anime_contributions_member_repository.go` — ListByMemberID (Auslagerungs-Vorbild)
- `backend/internal/repository/anime_contributions_public_repository.go` — **is_verified = (status='confirmed')** (kritisch für D-15)
- `backend/internal/permissions/permissions.go` — roleMatrix, ActionFansubGroupMembersManage (D-09)
- `backend/cmd/server/main.go` (Z. 345–386) — Routen-Verdrahtung
- `frontend/src/app/me/contributions/page.tsx` + `frontend/src/components/contributions/MyContributionsSection.tsx` — Dashboard, Phase-65-Platzhalter
- `frontend/src/app/manage/groups/page.tsx` (Re-Export) + `frontend/src/app/admin/my-groups/[id]/page.tsx` (421 Z.) — echte Leader-Detailseite (D-06)
- `frontend/src/types/contributions.ts`, `frontend/src/lib/api.ts` (Z. 6761–6987) — bestehende Typen/Calls
- `backend/internal/handlers/admin_content_anime_relations_test.go` — Test-Pattern (httptest + Stubs)
- `.planning/config.json` — nyquist_validation=true, security_enforcement nicht deaktiviert

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — P65-SC1..3, Phasen-Historie (Traceability)

### Tertiary (LOW confidence)
- Keine — diese Phase wurde rein codebase-basiert recherchiert (web nicht erforderlich).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — keine neuen Pakete, alles im Repo verifiziert
- Architecture/Patterns: HIGH — alle Muster direkt aus existierendem Code gelesen
- Pitfalls: HIGH — basieren auf konkret beobachteten Datei-Zeilenständen und der is_verified-Berechnung
- D-15-Modellierung: MEDIUM — empfohlene Variante ist begründet, aber User/Planer sollte zwischen „kein neues Flag" und „self_published-Flag" entscheiden (Open Question 1)

**Research date:** 2026-06-02
**Valid until:** 2026-07-02 (stabil; brownfield, keine fast-moving externe Abhängigkeit)
