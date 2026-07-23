# Phase 107: Bestätigung, Delegation und Ablehnungslebenszyklus - Research

**Researched:** 2026-07-23  
**Domain:** Transaktionaler Vier-Augen-Review, delegierte Berechtigungen, Punktebuchung und idempotenter Content-Cleanup  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Delegierte Review-Rechte
- **D-01:** Review-Rechte werden als getrennte Capabilities je Beitragstyp modelliert, beispielsweise für Beiträge, Release-Texte und Medien. Es gibt keine pauschale Review-Capability für alles.
- **D-02:** Fansub-Admins dürfen innerhalb ihrer eigenen Gruppe delegieren; Plattform-Admins dürfen global delegieren. Delegierte Mitglieder dürfen ihre Rechte nicht weiterdelegieren.
- **D-03:** Eine Delegation gilt ohne Ablaufdatum bis zum ausdrücklichen Entzug.
- **D-04:** Ein Entzug sperrt nur zukünftige Aktionen. Historische Entscheidungen und bereits verdiente Prüfpunkte bleiben bestehen; offene, noch nicht geprüfte Zuweisungen gehen zurück in die allgemeine Gruppenwarteschlange.
- **D-05:** Selbstbestätigung bleibt grundsätzlich verboten. Ein Plattform-Admin darf sie nur als ausdrücklich gekennzeichnete Ausnahme mit Pflichtbegründung und deutlicher UI-Warnung überschreiben.
- **D-06:** Für einen Selbstreview-Override werden keine Prüfpunkte vergeben.
- **D-07:** Die Override-Begründung ist für alle Gruppenmitglieder mit Review-Recht sichtbar.
- **D-08:** Wird ein Override später als unberechtigt eingestuft, wird die Einreichung direkt abgelehnt, die Beitragspunkte werden exakt einmal zurückgenommen und eine Neueinreichung ist erforderlich.
- **D-09:** Normale Prüfpunkte sind klein, fest und für Annahme und Ablehnung gleich. Sie werden pro wirksamer Review-Entscheidung höchstens einmal vergeben.
- **D-10:** Nach einer Ablehnung bleibt dieselbe Einreichung privat und vollständig bearbeitbar; Texte und zugehörige Medien bleiben bis zum Cleanup erhalten.
- **D-11:** Eine Ablehnung verlangt mindestens eine strukturierte Kategorie und einen Pflichtfreitext.
- **D-12:** Bei der Überarbeitung wird derselbe Datensatz inhaltlich überschrieben. Nur der letzte Arbeitsstand ist sichtbar; der Audit-Verlauf der Statusaktionen bleibt erhalten.
- **D-13:** Derselbe Prüfer darf eine überarbeitete Einreichung erneut prüfen, sofern es nicht seine eigene Einreichung ist.
- **D-14:** Abgelehnte Einreichungen erhalten keine Beitragspunkte. Erst eine wirksame Bestätigung erzeugt diese exakt einmal.
- **D-15:** Die Aufbewahrungsfrist beginnt mit der letzten Aktivität. Bearbeitung oder erneute Einreichung setzt sie zurück.
- **D-16:** Die Frist beträgt in Produktion 90 Tage und lokal 5 Stunden. Tests müssen die Zeit kontrolliert vorgeben können.
- **D-17:** Es gibt keine zusätzliche automatische Vorwarnung vor dem Cleanup; die feste Frist wird im Produkt verständlich ausgewiesen.
- **D-18:** Der Tombstone bewahrt IDs, Beitragstyp, Beteiligte, Zeitpunkte, Statusfolge, Ablehnungskategorie und Prüferentscheidung. Inhalte, Begründungsfreitexte und Dateien werden nicht dauerhaft aufbewahrt.
- **D-19:** Schlägt das physische Löschen einer Mediendatei fehl, darf der Tombstone trotzdem erzeugt werden. Der Dateifehler wird protokolliert und bleibt als separat idempotent wiederholbarer Cleanup-Auftrag erhalten.
- **D-20:** Cleanup, Tombstone-Erstellung, Dateinachlauf, erneute Einreichung, Punktevergabe und Punkterücknahme müssen bei Wiederholung und Parallelzugriffen idempotent bleiben.
- **D-21:** Eine aktive, bestätigte Mitgliedschaft in der Fansub-Gruppe ist Voraussetzung für jede neue gruppenbezogene Review-Delegation.
- **D-22:** Endet die Mitgliedschaft, sind neue Reviews und Zuweisungen sofort gesperrt. Eine bereits während der gültigen Mitgliedschaft konkret zugewiesene Prüfung darf noch abgeschlossen werden.
- **D-23:** Für eine solche bestehende Zuweisung gilt keine zusätzliche Abschlussfrist, solange die Zuweisung offen bleibt.
- **D-24:** Der Abschluss dieser zuvor autorisierten Zuweisung erhält weiterhin die normalen festen Prüfpunkte.

### Agent's Discretion
- Genaue Namen der Capabilities, Tabellen und API-Felder, sofern sie klar typisiert sind und die vorhandene Permission Engine wiederverwenden.
- Auswahl der strukturierten Ablehnungskategorien und deren deutsche UI-Bezeichnungen; sie müssen stabil, testbar und später erweiterbar sein.
- Technische Form der offenen Review-Zuweisung und des separat wiederholbaren Datei-Cleanup-Auftrags.
- Konkrete Höhe der kleinen festen Prüfpunkte, solange Annahme und Ablehnung gleich bewertet werden und Self-Overrides null Punkte erhalten.

### Deferred Ideas (OUT OF SCOPE)
- `.planning/todos/pending/2026-06-03-credits-ui-konsolidierung-und-permission-bruecke.md` — die generische Credit-zu-Permission-Brücke und Konsolidierung der Credits-UI bleiben außerhalb von Phase 107; diese Phase nutzt die bestehende Permission Engine nur für Review-Delegationen.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| P107-SC1 | Globale, gruppenbezogene und delegierte Review-Berechtigung | Capability-Registry plus scope-gebundene Delegationen und Membership-Snapshot |
| P107-SC2 | Vier-Augen-Regel und auditierter Plattform-Admin-Override | atomare Review-Decision mit Self-Review-Guard und Pflichtgrund |
| P107-SC3 | Beitragspunkte und feste Prüfpunkte exakt einmal | Phase-106-PointService in derselben DB-Transaktion |
| P107-SC4 | Private Ablehnung und Überarbeitung von Release-Text/-Media | gemeinsamer Lifecycle-Vertrag, aber domain-spezifische Adapter |
| P107-SC5 | Konfigurierbarer Cleanup und minimaler Tombstone | DB-Claiming, Clock-Injection und separat retrybarer Datei-Auftrag |
| P107-SC6 | Idempotenz und Missbrauchsschutz | Unique Constraints, Row Locks, Retry- und Parallelitätstests |
</phase_requirements>

## Summary

Phase 107 sollte als neuer, schmaler Lifecycle-Kern geplant werden, der Statusentscheidung, unveränderliches Decision-Audit und beide Punktebuchungen in **einer PostgreSQL-Transaktion** ausführt. Der bestehende Contribution-Review-Handler und das Repository sind geeignete Einstiegspunkte, aber heute nicht ausreichend: `Confirm`/`Reject` ändern nur `anime_contributions`, während der Handler den Audit-Eintrag anschließend best-effort schreibt; ein Fehler dazwischen kann fachlich inkonsistente Zustände erzeugen. [VERIFIED: `backend/internal/handlers/contribution_review_handler.go`, `backend/internal/repository/anime_contributions_proposal_repository.go`]

Phase 106 stellt bereits die entscheidende Exactly-once-Seam bereit: `PointService.CreditInTx` und `ReverseInTx`, ein eindeutiger `idempotency_key`, `ON CONFLICT ... DO NOTHING` mit Payload-Abgleich, `FOR UPDATE` beim Storno und ein DB-seitig append-only geschütztes Ledger. Diese Seam soll direkt aus einer transaktionalen Review-Service-/Repository-Operation aufgerufen werden; weder Handler noch Domain-Adapter dürfen Punktwerte oder Idempotenzschlüssel frei bestimmen. [VERIFIED: `backend/internal/services/point_service.go`, `backend/internal/repository/point_ledger_repository.go`, `database/migrations/0131_member_point_foundation.up.sql`]

Delegationen und offene Zuweisungen benötigen persistierte, getrennte Datensätze. Die Autorisierung einer neuen freien Review-Aktion wird gegen aktuelle Capability plus aktive bestätigte Gruppenmitgliedschaft geprüft; eine bereits konkret zugewiesene Prüfung speichert dagegen den bei Zuweisung legitimen Reviewer-/Membership-Bezug, damit D-22 nach Membership-Ende erfüllbar bleibt. Cleanup muss DB-Inhalte/Tombstone unabhängig vom physischen Dateilöschen abschließen und Dateifehler in einer persistenten Retry-Queue halten. [VERIFIED: `.planning/phases/107-best-tigung-delegation-und-ablehnungslebenszyklus/107-CONTEXT.md`]

**Primary recommendation:** Einen zentralen `ReviewLifecycleService` mit domain-spezifischen Adaptern, DB-erzwungener Zustandsmaschine, atomarer Decision-/Points-Transaktion und separatem idempotentem Cleanup-Worker planen. [VERIFIED: bestehende Code-Seams und Phase-107-Entscheidungen]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Review-Autorisierung und Vier-Augen-Regel | API / Backend | Database / Storage | Backend ermittelt Actor/Scope; DB sperrt Zielzeile und erzwingt konkurenzsichere Mutation. [VERIFIED: Permission-Service- und Repository-Muster] |
| Delegation und Zuweisung | API / Backend | Database / Storage | Permission Engine entscheidet; persistierte Grants/Assignments bewahren Lifetime-Semantik. [VERIFIED: Phase-107 D-01–D-04, D-21–D-24] |
| Exactly-once Punkte | Database / Storage | API / Backend | Unique Keys und Ledger-Trigger sind letzte Integritätsgrenze; Service baut kanonische Commands. [VERIFIED: Migration 0131 und PointService] |
| Ablehnen/Überarbeiten/Neueinreichen | API / Backend | Database / Storage | Domain-Adapter ändern Inhalte; Lifecycle-Kern kontrolliert Transition und Aktivitätszeit. [VERIFIED: Phase-107 D-10–D-15] |
| Content-/Datei-Cleanup | API / Backend Worker | Database / Storage | Worker claimt fällige Zeilen; DB-Tombstone und Datei-Outbox werden atomar persistiert. [CITED: https://www.postgresql.org/docs/current/sql-select.html] |
| Review- und Delegations-UI | Browser / Client | API / Backend | UI liegt im kanonischen Gruppenworkspace; Backend bleibt Autorität. [VERIFIED: `AGENTS.md`, Auth-Dokument] |

## Project Constraints (from AGENTS.md)

- Die Arbeit ist GSD/Planning-only; es darf keine Implementierung erfolgen. [VERIFIED: `AGENTS.md`]
- Anime und Episoden bleiben neutral; Release-Version-Prozessmedia bleibt an `release_version_media` mit echter `release_version_id`; `release_media` ist kein Ersatz. [VERIFIED: `AGENTS.md`, `docs/architecture/db-schema-fansub-domain.md`]
- Bestehende Upload-, Media-, Permission-, Auth- und API-Seams sind vor neuen Abstraktionen zu erweitern; keine parallele Medienlogik. [VERIFIED: `AGENTS.md`, `docs/engineering/implementation-contract.md`]
- API-Änderungen müssen `shared/contracts/openapi.yaml`, gegebenenfalls `admin-content.yaml`, Backend, Frontend-Typen und `frontend/src/lib/api.ts` synchron ändern. [VERIFIED: `AGENTS.md`, `docs/api/api-contracts.md`]
- Geschützte UI gilt bei `hasAccessToken || hasRefreshToken` als angemeldet und verwendet ausschließlich den zentralen Client; der Refresh-only-Fall ist Regressionstest. [VERIFIED: `AGENTS.md`, `docs/frontend/auth-api-client.md`]
- Review-/Leader-UI gehört nach `/admin/fansubs/[id]/edit`, nicht nach `/admin/my-groups/[id]`. [VERIFIED: `AGENTS.md`]
- Neue Migrationen statt Änderung historischer Migrationen; vor Migration `git status` und Migration-Chain prüfen; Up/Down reversibel, destruktive Schritte mit Preconditions. [VERIFIED: `AGENTS.md`]
- Deutsche UI- und HTTP-Texte verwenden korrekte Umlaute; vorhandene UI-Primitives und progressive Disclosure sind Pflicht. [VERIFIED: `AGENTS.md`]

## Standard Stack

### Core

| Library / Seam | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| Go | aus `backend/go.mod` | Handler, Lifecycle-Service, Worker | bestehender Backend-Stack. [VERIFIED: `backend/go.mod`] |
| `github.com/jackc/pgx/v5` | aus `backend/go.mod` | Transaktionen, Row Locks, Constraint-Fehler | bestehender DB-Treiber und `DBTX`-Abstraktion. [VERIFIED: `backend/go.mod`, Repository-Code] |
| PostgreSQL | 16 laut Domain-Dokument | Constraints, `FOR UPDATE`, `SKIP LOCKED`, Unique Keys | bestehende Runtime-Autorität. [VERIFIED: `docs/architecture/db-schema-fansub-domain.md`] |
| Phase-106 `PointService` | repository-local | transaktionale Credits/Reversals | bereits idempotent und tx-bindbar. [VERIFIED: `backend/internal/services/point_service.go`] |
| Permission Engine / Capability Registry | repository-local | globale und Group-Scope-Autorisierung | bestehende, datengetriebene Quelle der Wahrheit. [VERIFIED: `backend/internal/permissions/permissions.go`, `backend/internal/repository/authz_permissions.go`] |

### Supporting

| Library / Seam | Version | Purpose | When to Use |
|----------------|---------|---------|-------------|
| Gin | aus `backend/go.mod` | HTTP-Endpunkte und stabile Fehlerverträge | bestehende Review-Routen erweitern. [VERIFIED: Handler-Code] |
| Next.js/React/Vitest | aus `frontend/package.json` | kanonische Admin-UI und Tests | Delegation, Queue, Override-Warnung, Resubmit. [VERIFIED: `frontend/package.json`] |
| bestehende Cleanup-Seams | repository-local | Worker-Lifecycle und Dateilöschung | als Ablaufmuster, nicht als Universal-Media-Repository. [VERIFIED: `release_version_media_cleanup.*`] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Row lock + DB Unique Constraints | rein optimistische Handler-Prüfung | Verliert bei parallelen Confirm/Reject-Rennen; nicht verwenden. [CITED: https://www.postgresql.org/docs/current/explicit-locking.html] |
| persistierte Datei-Cleanup-Aufträge | nur Log + späterer Filesystem-Scan | Keine stabile Idempotenz-/Ownership-Referenz; widerspricht D-19. [VERIFIED: Phase-107 D-19] |
| domain-spezifische Adapter | universelles Content-/Media-Modell | Würde Ownership-Grenzen verwischen; nicht verwenden. [VERIFIED: `AGENTS.md`] |

**Installation:** Keine neue Bibliothek erforderlich. [VERIFIED: vorhandener Stack deckt Transaktion, Worker, API und Tests ab]

## Architecture Patterns

### System Architecture Diagram

```text
Browser /admin/fansubs/[id]/edit
  -> zentraler apiClientFetch (inkl. Refresh)
  -> ReviewLifecycleHandler
       -> PermissionService (global / group / typed delegation)
       -> ReviewLifecycleService
            -> BEGIN
            -> submission row FOR UPDATE
            -> assignment/delegation + self-review policy
            -> status transition + immutable decision row
            -> PointService.CreditInTx(work, optional review)
               oder ReverseInTx(work)
            -> COMMIT
       -> typed response

Cleanup scheduler
  -> claim rejected due submissions (FOR UPDATE SKIP LOCKED)
  -> BEGIN: tombstone + content scrub + file_cleanup_jobs
  -> COMMIT
  -> filesystem worker retries file_cleanup_jobs independently
```

[VERIFIED: vorhandene Handler/Point/Cleanup-Seams; `SKIP LOCKED` ist offiziell für Queue-artige Mehrfach-Consumer-Verarbeitung vorgesehen. CITED: https://www.postgresql.org/docs/current/sql-select.html]

### Recommended Project Structure

```text
backend/internal/
├── services/review_lifecycle_service.go
├── repository/review_lifecycle_repository.go
├── repository/review_delegations_repository.go
├── repository/review_cleanup_repository.go
├── handlers/contribution_review_handler.go
└── services/review_cleanup.go
frontend/src/app/admin/fansubs/[id]/edit/
├── ContributionsReviewSection.tsx
├── ReviewDelegationsSection.tsx
└── ReviewDecisionDialog.tsx
shared/contracts/
├── openapi.yaml
└── admin-content.yaml
```

[ASSUMED: genaue neue Dateinamen; der Planner darf sie passend zum 450-Zeilen-Limit zuschneiden]

### Pattern 1: Lock-then-decide in einer Transaktion

**What:** Submission zuerst `FOR UPDATE` laden, aktuellen Status und Scope validieren, dann Decision, Status und Ledger-Einträge vor demselben Commit schreiben. [CITED: https://www.postgresql.org/docs/current/explicit-locking.html]  
**When to use:** Confirm, Reject, Override-Invalidierung, Resubmit und Cleanup. [VERIFIED: D-08, D-14, D-20]

```go
// Source: bestehendes PointService- und pgx-Muster
tx, err := db.Begin(ctx)
// lock submission FOR UPDATE
// validate transition and reviewer authorization
// append decision
// mutate lifecycle state
_, err = points.CreditInTx(ctx, tx, workCommand)
// optionally credit review in the same tx
err = tx.Commit(ctx)
```

### Pattern 2: Assignment as authorization snapshot

**What:** Eine offene konkrete Zuweisung speichert `submission_id`, `reviewer_app_user_id`, den bestätigten `member_id`/Membership-Bezug, Scope, Typ, `assigned_at`, `assigned_by`, Zustand und eindeutigen Open-Assignment-Key. [VERIFIED: D-21–D-24]  
**When to use:** Nur wenn ein Review konkret zugewiesen wird; freie Queue-Aktionen prüfen aktuelle Membership/Delegation. [VERIFIED: D-22]

### Pattern 3: DB-Outbox für Dateinachlauf

**What:** Content-Scrub und Tombstone werden atomar abgeschlossen; jede physische Datei erhält einen persistenten Cleanup-Auftrag mit stabiler Ownership-Referenz, Attempts und Fehlerzustand. [VERIFIED: D-18–D-20]  
**When to use:** Abgelehnte Media-Einreichung erreicht Retention-Grenze. [VERIFIED: D-15–D-19]

### Anti-Patterns to Avoid

- **Audit nach Commit als best effort:** Decision-Audit muss in derselben Transaktion persistieren; das heutige Handler-Muster reicht nicht. [VERIFIED: `contribution_review_handler.go`]
- **Check-then-update ohne Lock:** Zwei Reviewer können sonst beide einen zunächst offenen Zustand sehen. [CITED: https://www.postgresql.org/docs/current/explicit-locking.html]
- **Review-Capability = Assignment:** Delegation erlaubt Queue-Zugriff; Assignment bewahrt D-22-Autorisierung nach Membership-Ende. [VERIFIED: D-22]
- **`updated_at` allein als Retention-Uhr:** Unverwandte technische Updates könnten Cleanup verschieben; eine explizite `last_activity_at` ist stabiler. [ASSUMED]
- **Hard-delete vor Tombstone/Outbox:** Verliert Audit oder retrybare Dateireferenz. [VERIFIED: D-18–D-20]
- **Punkte im Handler:** Verhindert atomare Wiederverwendung über spätere Phase-108-Adapter. [VERIFIED: Phase-106 PointService-Seam]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Exactly-once Punkte | In-memory Dedup/Existenzcheck | `PointService` + Ledger-Unique-Key | lost-response- und parallelitätssicher. [VERIFIED: Phase-106-Code] |
| Rollenentscheidung | `role == "leader"` | Permission Engine und typisierte Actions | Registry ist kanonisch. [VERIFIED: Permission-Code] |
| Auth Refresh | Tokenprops/Bearer im Component | `apiClientFetch` | zentrale Refresh-Koordination. [VERIFIED: Auth-Dokument] |
| Media-Löschung | generischer Pfad aus Clientdaten | bestehende ownership-spezifische Repositories | verhindert falsche Domain-Zuordnung. [VERIFIED: `AGENTS.md`] |
| Job-Koordination | Prozesslokaler Mutex | DB Claim mit `FOR UPDATE SKIP LOCKED` | mehrere Worker und Crash-Recovery. [CITED: https://www.postgresql.org/docs/current/sql-select.html] |

**Key insight:** Exactly-once entsteht hier nicht durch einen einzelnen Mechanismus, sondern aus atomarer Statusentscheidung, stabilen semantischen Keys, DB-Constraints und idempotenter Retry-Auflösung. [VERIFIED: Phase-106-Implementierung]

## Common Pitfalls

### Pitfall 1: Scope nur aus URL prüfen
**What goes wrong:** Ein Beitrag einer anderen Gruppe wird über eine gültige Gruppenroute entschieden. [VERIFIED: bestehender Handler übergibt `fansubID` nicht an `Confirm`/`Reject`]  
**How to avoid:** Gelockte Submission muss `fansub_group_id` und Typ tragen; Mutation filtert/validiert beide gegen Route und Capability. [ASSUMED: konkrete Repository-Signatur]  
**Warning signs:** Repository-Methode akzeptiert nur `contributionID`. [VERIFIED: aktueller Code]

### Pitfall 2: Reviewer und Beneficiary verwechseln
**What goes wrong:** Self-review wird nur gegen `created_by` geprüft, obwohl fachlicher Urheber/Member separat sein kann. [VERIFIED: bestehendes Modell trennt `member_id` und `created_by`]  
**How to avoid:** Pro Source-Adapter explizit `submitter_app_user_id`, `beneficiary_member_id` und Reviewer auflösen; Vier-Augen-Policy gegen alle vom Produkt definierten Eigenbezüge testen. [ASSUMED: genaue Eigenbezugsmenge muss im Plan festgelegt werden]

### Pitfall 3: Capability-Entzug zerstört Assignment-Ausnahme
**What goes wrong:** D-22 kann nicht erfüllt werden, wenn Abschluss immer nur aktuelle Membership prüft. [VERIFIED: D-22]  
**How to avoid:** Abschluss akzeptiert entweder aktuelle Autorisierung oder eine noch offene, damals autorisierte konkrete Assignment-Zeile; keine neue Zuweisung nach Ende. [VERIFIED: D-21–D-24]

### Pitfall 4: Cleanup-Rennen mit Resubmit
**What goes wrong:** Worker scrubbt Inhalt, während der Einreicher neu einreicht. [VERIFIED: D-15, D-20 erfordern Parallelitätssicherheit]  
**How to avoid:** Dieselbe Submission-Zeile sperren; Cleanup nur bei weiterhin `rejected` und `last_activity_at <= cutoff`; Resubmit aktualisiert Status und Aktivität unter demselben Lock. [CITED: https://www.postgresql.org/docs/current/explicit-locking.html]

### Pitfall 5: Prüfpunkte mehrfach pro Retry
**What goes wrong:** Gleiches HTTP-Review erzeugt mehrfach Punkte. [VERIFIED: D-09]  
**How to avoid:** Jede wirksame Decision besitzt stabile ID; Review-Point-Source-Key basiert auf Decision-ID/Slot, nicht Request-ID. Self-Override ruft Review-Credit nie auf. [ASSUMED: konkretes Keyformat]

### Pitfall 6: Override-Grund dauerhaft im Tombstone
**What goes wrong:** Freitext wird entgegen Minimal-Audit dauerhaft aufbewahrt. [VERIFIED: D-18 nennt Begründungsfreitexte als zu löschenden Inhalt]  
**How to avoid:** Vollständiger Override-/Reject-Freitext bleibt nur bis Cleanup; Tombstone bewahrt Decision-Art/Kategorie, nicht Freitext. [VERIFIED: D-18]

## Code Examples

### Konkurenzsicheres Job-Claiming

```sql
-- Source: https://www.postgresql.org/docs/current/sql-select.html
SELECT id
FROM review_submissions
WHERE status = 'rejected' AND last_activity_at <= $1
ORDER BY last_activity_at, id
FOR UPDATE SKIP LOCKED
LIMIT $2;
```

### DB-erzwungene einmalige wirksame Decision

```sql
-- Empfohlenes Projektmuster; konkrete Zustände in Migration festlegen.
CREATE UNIQUE INDEX uq_review_decision_effective_cycle
ON review_decisions (submission_id, submission_cycle)
WHERE is_effective;
```

[ASSUMED: Tabellen-/Spaltennamen; Partial Unique Indexes sind PostgreSQL-Standard. CITED: https://www.postgresql.org/docs/current/ddl-constraints.html]

### Idempotente Punktebuchung

```go
_, err := pointService.CreditInTx(ctx, tx, services.CreditCommand{
    MemberID: beneficiaryMemberID,
    ActorAppUserID: &reviewerAppUserID,
    Source: services.SourceRef{
        RewardKind: services.RewardKindReview,
        Type: "review_decision",
        Key: strconv.FormatInt(decisionID, 10),
        Slot: "review",
    },
    Rule: reviewRuleRef,
    FansubGroupID: &fansubGroupID,
    EffectiveAt: decidedAt,
})
```

[VERIFIED: API-Form aus `backend/internal/services/point_service.go`; konkrete Source-Tokens sind ASSUMED]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Statusupdate, danach best-effort Audit | atomare Lifecycle-Service-Transaktion | Phase 107 | Audit, Status und Punkte können nicht auseinanderlaufen. [VERIFIED: aktueller Gap + Phase-Ziel] |
| `ActionFansubGroupMembersManage` für alle Reviews | getrennte typisierte Review-Actions | Phase 107 D-01 | Least privilege und Delegation pro Beitragstyp. [VERIFIED: Context] |
| optionaler Ablehnungsgrund | Kategorie + Pflichtfreitext | Phase 107 D-11 | stabil testbarer Grund und verständliche Überarbeitung. [VERIFIED: Context] |
| keine Cleanup-Lifecycle-Seam | Retention + Tombstone + File-Retry | Phase 107 D-15–D-20 | Datenschutz/Storage-Cleanup ohne Auditverlust. [VERIFIED: Context] |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Neue Dateien heißen `review_lifecycle_*`. | Project Structure | nur Plan-/Dateizuschnitt |
| A2 | Explizites `last_activity_at` statt `updated_at`. | Anti-Patterns | Migration/Query-Design |
| A3 | Self-review umfasst neben `created_by` weitere fachliche Eigenbezüge. | Pitfall 2 | Security-/Produktentscheidung muss explizit werden |
| A4 | Decision-Cycle/Source-Key nutzt Decision-ID. | Pitfall 5 / Code | Idempotenz-Key-Vertrag |
| A5 | Empfohlene Tabellen-/Spaltennamen. | Code Examples | Migration-Naming |

## Open Questions

1. **Welche bestehenden Beitragstypen werden in Phase 107 bereits vollständig verdrahtet?**
   - What we know: D-01 fordert getrennte Capabilities für Beiträge, Release-Texte und Medien. [VERIFIED: Context]
   - What's unclear: Phase 108 bindet eigentliche Quellenadapter an; ein zu breites Phase-107-Wiring würde Phase 108 vorwegnehmen. [VERIFIED: ROADMAP]
   - Recommendation: Phase 107 implementiert generischen Lifecycle plus den bestehenden `anime_contributions`-Vertikalschnitt und adapterfähige Verträge; Release-Text/Media nur soweit für Ablehnung/Cleanup bereits reale Review-Seams existieren. [ASSUMED]

2. **Was zählt exakt als „eigener Beitrag“?**
   - What we know: Einreicher, Urheber/Member und Reviewer sind getrennte Identitäten. [VERIFIED: ROADMAP Phase 108]
   - What's unclear: Ob Self-review nur `created_by` oder auch beneficiary-/author-linked Accounts umfasst. [VERIFIED: Modell-Gap]
   - Recommendation: Vor Plan-Lock eine Policy-Matrix festhalten; sicherer Default ist Verbot, wenn Reviewer Einreicher oder bestätigter Account des begünstigten Members ist. [ASSUMED]

3. **Welche festen Review-Punkte und Kategorien werden geseedet?**
   - What we know: Wert klein, Annahme/Ablehnung gleich, Override null. [VERIFIED: D-06, D-09]
   - Recommendation: eine unveränderliche neue Rule-Version und stabile Codes wie `quality`, `ownership`, `duplicate`, `scope`, `other`; deutsche Labels nur im DTO/UI. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Go | Backend/Test | ✓ | projektlokal prüfbar | — |
| Node/npm | Frontend/Test | ✓ | projektlokal prüfbar | — |
| PostgreSQL/Test-DB | Migration/Concurrency | über bestehende Test-Harness | 16 laut Doku | SQL-Shape-Tests allein reichen nicht für Race-Tests. [VERIFIED: Domain-Dokument/Teststruktur] |

**Missing dependencies with no fallback:** Keine im Research festgestellten; konkrete DB-Erreichbarkeit muss der Executor vor Migrationstests prüfen. [ASSUMED]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Backend Framework | Go `testing`, bestehende Repository-DB-Harness und Handler-Stubs. [VERIFIED: vorhandene `*_test.go`] |
| Frontend Framework | Vitest + Testing Library. [VERIFIED: `frontend/package.json`, bestehende Tests] |
| Migration config | `database/migrations`; Test-DB-Guard aus Phase 106 wiederverwenden. [VERIFIED: Phase-106-Pläne/Tests] |
| Quick run command | `cd backend && go test ./internal/services ./internal/handlers ./internal/repository` |
| Frontend quick command | `cd frontend && npm test -- --run ContributionsReviewSection.test.tsx` |
| Full suite command | `cd backend && go test ./...` sowie `cd frontend && npm test -- --run`, `npm run typecheck`, `npm run lint` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| P107-SC1 | globale/group/typed delegation; kein Weiterdelegieren | service + handler + DB | `go test ./internal/services ./internal/handlers ./internal/repository -run 'ReviewDelegation|ReviewPermission'` | ❌ Wave 0 |
| P107-SC2 | Self-review verboten; Override nur Admin+Grund; sichtbar/auditiert | service + handler + UI | `go test ./internal/services ./internal/handlers -run 'SelfReview|Override'` | ❌ Wave 0 |
| P107-SC3 | Work-/Review-Credit exakt einmal bei parallel/retry | DB integration | `go test ./internal/repository ./internal/services -run 'Review.*(Concurrent|Idempotent|Points)'` | ❌ Wave 0 |
| P107-SC4 | Reject privat, Edit, Resubmit, neuer Cycle | repository + handler + UI | `go test ./internal/repository ./internal/handlers -run 'Reject|Resubmit'` | teilweise bestehend, Erweiterung nötig |
| P107-SC5 | 90d/5h mit injizierter Clock; minimaler Tombstone; File-Retry | service + repository | `go test ./internal/services ./internal/repository -run 'ReviewCleanup|Tombstone'` | ❌ Wave 0 |
| P107-SC6 | Cleanup-vs-resubmit, confirm-vs-reject, repeated job/reversal | DB concurrency | `go test ./internal/repository ./internal/services -run 'Review.*Race|Review.*Retry' -count=10` | ❌ Wave 0 |
| AUTH | Refresh-only Session erlaubt Review-Aktion | frontend API/UI | `cd frontend && npm test -- --run api.auth-refresh.test.ts ContributionsReviewSection.test.tsx` | Basis existiert, neuer Fall nötig |
| CONTRACT | YAML, Backend-DTO und api.ts stimmen überein | contract/helper | fokussierter Go-Test + `npm test -- --run api.test.ts` | teilweise vorhanden |

### Required concurrency scenarios

- Zwei parallele Confirms: genau eine wirksame Decision, ein Work-Credit, ein Review-Credit. [VERIFIED: D-09, D-14, D-20]
- Confirm gegen Reject: genau ein Gewinner; Verlierer erhält deterministischen `409 Conflict`, nicht `404`. [ASSUMED: empfohlener Fehlervertrag]
- Cleanup gegen Edit/Resubmit: Lock-Reihenfolge verhindert Scrub eines reaktivierten Datensatzes. [VERIFIED: D-15, D-20]
- Zwei Cleanup-Worker: jeder fällige Datensatz wird exklusiv geclaimt; Job-Wiederholung bleibt No-op/Resolution. [CITED: https://www.postgresql.org/docs/current/sql-select.html]
- Override-Invalidierung doppelt: genau eine Reversal-Zeile durch `uq_point_ledger_direct_reversal`. [VERIFIED: Migration 0131]
- Delegationsentzug gegen neue Zuweisung: nach Entzug keine neue Assignment-Zeile; bestehende Assignment bleibt abschließbar. [VERIFIED: D-04, D-22]

### Sampling Rate

- **Per task commit:** schmaler `-run`-Test für geänderte Seam plus `git diff --check`. [VERIFIED: AGENTS Validation]
- **Per wave merge:** Backend-Pakete + relevante Frontend-Tests/Typecheck. [VERIFIED: AGENTS Validation]
- **Phase gate:** vollständige Backend-/Frontend-Suite, Lint, Typecheck, Migration Up/Down, mindestens `-count=10` für Race-Szenarien und Live-UAT im kanonischen Gruppenworkspace. [VERIFIED: AGENTS Validation/UAT]

### Wave 0 Gaps

- [ ] Migration-Up/Down-Tests für Delegation, Assignment, Decision/Tombstone, Cleanup-Job und Rule-Seeds.
- [ ] `review_lifecycle_repository_test.go` mit echter PostgreSQL-Test-DB und parallelen Goroutines.
- [ ] `review_lifecycle_service_test.go` für Policy-Matrix und Clock.
- [ ] Handler-Contract-Tests für `400/403/404/409`, strukturierte Reject- und Override-Payloads.
- [ ] Frontend-Tests für Warnung, Pflichtgrund, Kategorie, scope-gebundene Loading/Error-States und Refresh-only Session.
- [ ] Contract-Drift-Test/Review für beide YAML-Dateien, DTOs und `api.ts`.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | bestehende Keycloak-/central-client Session. [VERIFIED: Auth-Dokument] |
| V3 Session Management | yes | Refresh-only Regression, kein Token im Component. [VERIFIED: Auth-Dokument] |
| V4 Access Control | yes | serverseitige Permission Engine, Scope- und Assignment-Check. [VERIFIED: Permission-Code] |
| V5 Input Validation | yes | serverseitig typisierte Kategorie, Pflichtfreitext, positive IDs, State Transition. [VERIFIED: D-11; bestehende Handler-Patterns] |
| V6 Cryptography | no | Phase führt keine Kryptografie ein. [VERIFIED: Scope] |

### Known Threat Patterns for Go/PostgreSQL Review Lifecycle

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Self-review / forged reviewer | Spoofing/Elevation | Actor nur aus Auth-Context; Member-/Submitter-Bezug serverseitig laden. [VERIFIED: bestehendes Handler-Pattern] |
| Cross-group IDOR | Elevation | gelockte Submission gegen Route-Scope prüfen. [VERIFIED: aktueller Signatur-Gap] |
| Double award via retry | Tampering | stabile Decision-ID + Ledger Unique Constraint. [VERIFIED: Phase-106] |
| Race confirm/reject | Tampering | `FOR UPDATE`, Transition-Matrix und Unique Effective Decision. [CITED: https://www.postgresql.org/docs/current/explicit-locking.html] |
| Delegation after membership end | Elevation | DB-gebundene aktive bestätigte Membership beim Grant/Assignment; Abschlussausnahme nur für bestehende Assignment. [VERIFIED: D-21–D-24] |
| Audit-text retention | Information Disclosure | Cleanup scrubbt Freitexte/Dateien, Tombstone hält nur D-18-Minimum. [VERIFIED: D-18] |
| Cleanup path confusion | Tampering | serverseitige Media-Ownership-Auflösung; keine Clientpfade. [VERIFIED: AGENTS Media Rules] |

## Sources

### Primary (HIGH confidence)

- `107-CONTEXT.md`, `ROADMAP.md`, `REQUIREMENTS.md` — Scope und verbindliche Entscheidungen.
- `AGENTS.md` und projektlokaler `team4s-implementation-contract` — Projekt-, Domain-, Auth-, Contract- und UI-Regeln.
- Phase-106 Migrationen, PointService und Ledger-Repository — Exactly-once/append-only/transactionale Seams.
- bestehende Contribution-Review-, Permission-, Media-Review- und Cleanup-Dateien — reale Integrationspunkte und Gaps.
- https://www.postgresql.org/docs/current/explicit-locking.html — Row Locks, Deadlocks und Lock-Reihenfolge.
- https://www.postgresql.org/docs/current/sql-select.html — Locking Clause und `SKIP LOCKED`.
- https://www.postgresql.org/docs/current/ddl-constraints.html — Unique-/Check-/FK-Constraints.
- https://www.postgresql.org/docs/current/sql-insert.html — `ON CONFLICT`.

### Secondary (MEDIUM confidence)

- Keine; externe Aussagen wurden ausschließlich gegen offizielle PostgreSQL-Dokumentation geprüft.

### Tertiary (LOW confidence)

- Keine.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — vollständig aus Repository und offiziellen PostgreSQL-Dokumenten verifiziert.
- Architecture: HIGH — durch bestehende Seams und gelockte Produktentscheidungen begründet.
- Pitfalls: HIGH — überwiegend konkrete aktuelle Code-Gaps; markierte Policy-Details bleiben Annahmen.
- Validation: HIGH — vorhandene Frameworks/Harnesses und explizite Race-/Lifecycle-Anforderungen.

**Research date:** 2026-07-23  
**Valid until:** 2026-08-22
