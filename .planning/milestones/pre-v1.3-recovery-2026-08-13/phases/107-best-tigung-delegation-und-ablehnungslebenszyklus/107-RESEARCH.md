# Phase 107: Prüf- und Delegationsfundament - Research

**Researched:** 2026-07-23
**Domain:** Domänenneutrale Vier-Augen-Entscheidungen, gruppengebundene Capability-Delegation, unveränderliches Audit und begrenzte Review-Credits auf Go/PostgreSQL
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

**Quelle:** Die folgenden Grenzen, Entscheidungen, Ermessensräume und zurückgestellten Ideen sind aus `107-CONTEXT.md` wörtlich übernommen. [VERIFIED: `.planning/phases/107-best-tigung-delegation-und-ablehnungslebenszyklus/107-CONTEXT.md`]

### Phase Boundary

Phase 107 baut ausschließlich die wiederverwendbare Prüfgrundlage: typisierte gruppenbezogene Review-Rechte, atomare Entscheidungen ohne Reservierung, Self-Review-Schutz, Audit und begrenzte Prüfpunkte über den PointService aus Phase 106. Sie bindet noch keine Release-Texte, Release-Version-Medien, `anime_contributions`, Upload-Flows, Cleanup-Jobs oder Prüfoberfläche an. Diese Release-Vertikale folgt in Phase 107.1; weitere Beitragsquellen folgen in Phase 108.

### Locked Decisions

#### Review-Rechte und Delegation
- **D-01:** Review-Rechte werden als getrennte Capabilities je Beitragstyp modelliert. Für Phase 107.1 sind mindestens Texte, Bilder und Mitwirkungen unterscheidbar; eine einzige pauschale Review-Capability ist verboten.
- **D-02:** Fansub-Admins dürfen Review-Rechte nur an aktive bestätigte Mitglieder ihrer eigenen Gruppe delegieren. Plattform-Admins dürfen global delegieren. Delegierte Mitglieder dürfen nicht weiterdelegieren.
- **D-03:** Eine Delegation gilt ohne Ablaufdatum bis zum ausdrücklichen Entzug. Fehlende Logins oder Inaktivität entziehen sie nicht automatisch; Phase 107 führt keinen neuen Membership-Ende-Lebenszyklus ein.
- **D-04:** Delegationsverwaltung erweitert den bestehenden Mitglieder-Editor des kanonischen Gruppen-Workspaces. Es entsteht keine zweite Mitgliederverwaltung.

#### Keine Reservierung, erster Abschluss gewinnt
- **D-05:** Es gibt keine Reservierung, Übernahme, persönliche Zuweisung, Assignment-Tabelle oder den Status „in Prüfung durch Person X“.
- **D-06:** Alle passend berechtigten Prüfer dürfen denselben offenen Eintrag lesen und entscheiden. Genau die erste atomar erfolgreiche Confirm-/Reject-Transaktion gewinnt; parallele Verlierer erhalten einen stabilen Already-decided-/Conflict-Fehler und keine Punkte.
- **D-07:** Ein Delegationsentzug sperrt nur zukünftige Entscheidungen. Historische Entscheidungen und bereits verdiente Punkte bleiben bestehen; weil keine Assignments existieren, muss nichts zurückgegeben oder umgehängt werden.

#### Self-Review und Plattform-Admins
- **D-08:** Reguläres Self-Review ist verboten. Nur ein Plattform-Admin darf als deutlich gekennzeichnete Ausnahme mit Pflichtbegründung übersteuern.
- **D-09:** Plattform-Admins dürfen sämtliche Review- und Delegationsaktionen global ausführen, benötigen dafür keine `members`-Identität und erhalten niemals Punkte, Badges oder Auszeichnungen. Eine Bestätigung darf trotzdem die Arbeitspunkte des Einreichers auslösen.
- **D-10:** Ein Plattform-Admin-Override erzeugt keine Prüfpunkte. Wird er später fachlich aufgehoben, werden bereits erzeugte Beitragspunkte über den PointService exakt einmal storniert.

#### Audit und Datenschutz
- **D-11:** Jede Zustandsänderung wird mit Akteur und Zeitpunkt gespeichert: Delegation erteilen/entziehen, Einreichen, Bearbeiten nach Ablehnung, erneut einreichen, bestätigen, ablehnen, veröffentlichen, Override, Punkte/Storno sowie spätere Cleanup-Ergebnisse. Reine Lesezugriffe werden nicht protokolliert.
- **D-12:** Strukturierte Entscheidungsmetadaten bleiben unveränderlich nachvollziehbar. Jede Ablehnung verlangt eine strukturierte Ablehnungskategorie und einen nichtleeren Freitextgrund; ein Plattform-Self-Review-Override verlangt unabhängig von der Entscheidung ebenfalls einen nichtleeren Freitextgrund. Freie Ablehnungs- und Override-Begründungen werden getrennt nach Zweck gespeichert, damit eine spätere Retention sie entfernen kann, ohne Kategorie oder Audit-Spur zu verfälschen.
- **D-13:** Systemaktionen erhalten einen eindeutig erkennbaren Systemakteur; es wird kein künstliches Member oder Profil erfunden.

#### Prüfpunkte und Farming-Schutz
- **D-14:** Normale Annahme und Ablehnung verwenden denselben kleinen festen Review-Punktwert. Aufrufer übergeben weder Punktwert noch eigenen Idempotenzschlüssel; der PointService aus Phase 106 erzeugt den regelversionsstabilen Schlüssel aus `RuleRef` und `SourceRef`.
- **D-15:** Jeder konkrete neue Beitrag besitzt eine stabile Quellenidentität. Je Quellenidentität existiert höchstens ein Ablehnungs-Credit-Slot und höchstens ein späterer Bestätigungs-Credit-Slot; Retries oder wiederholte Entscheidungen erzeugen keine weiteren Credits.
- **D-16:** Mehrere tatsächlich unterschiedliche Bilder oder Texte desselben Releases dürfen jeweils eigene Beitrags- und Review-Credits erzeugen. Bearbeiten und Neueinreichen eines abgelehnten Datensatzes behalten dagegen dieselbe Quellenidentität.
- **D-17:** Review-Credit gehört dem prüfenden `member`, nicht dem Einreicher. Fehlt beim berechtigten Plattform-Admin eine Member-Zuordnung, bleibt die Entscheidung gültig, aber es wird kein Review-Credit erzeugt.

### the agent's Discretion
- Genaue Namen der neuen Capabilities, Tabellen, Go-Typen und stabilen Fehlercodes, sofern die bestehende Permission Engine und Phase-106-PointService-Seams direkt wiederverwendet werden.
- Die konkrete kleine Punktzahl und Rule-Codes, solange Annahme und Ablehnung gleich gewichtet und Overrides/Plattform-Admins immer punktelos bleiben.
- Ob die domänenneutrale Entscheidungslogik als Service mit Adapter-Interface oder eng äquivalentes vorhandenes Pattern umgesetzt wird; ein Universal-Datenmodell, das Domain-Ownership verschluckt, ist nicht erlaubt.

### Deferred Ideas (OUT OF SCOPE)

- Release-Prüfliste, Detailroute, automatische Einreichung, Veröffentlichung, Ablehnungsüberarbeitung und Cleanup — Phase 107.1.
- Historische/aktuelle Mitwirkungen, Projekt-/Zusatznotizen und Metadatenpflege — Phase 108.
- Ranglisten — Phase 109; Badges und öffentliche UI — Phase 110.
- Generische Credit-zu-Permission-Brücke aus `.planning/todos/pending/2026-06-03-credits-ui-konsolidierung-und-permission-bruecke.md`.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|---|---|---|
| P107-SC1 | Review-Rechte sind typisierte, gruppenbezogene Capabilities der bestehenden Permission Engine; Fansub-Admins delegieren nur in ihrer Gruppe, Plattform-Admins global, Delegierte niemals weiter. | Drei konkrete `permissions.Action`-Codes, direkte gruppenmitgliedschaftsgebundene Grants und Tx-gebundene Wiederverwendung von `permissions.Service`/`AuthzRepository`. [VERIFIED: `.planning/REQUIREMENTS.md`, `backend/internal/permissions/permissions.go`, `backend/internal/repository/authz_permissions.go`] |
| P107-SC2 | Offene Prüfungen werden weder reserviert noch Personen zugewiesen. Alle passend Berechtigten dürfen entscheiden; eine atomare First-Decision-Wins-Operation lässt genau eine Entscheidung gewinnen und liefert allen parallelen Verlierern einen stabilen Konflikt. | Unveränderliches `review_decisions`-Journal mit Unique `(source_type, source_key, source_revision)` plus adaptereigene bedingte Domainmutation in derselben Transaktion. [VERIFIED: `.planning/REQUIREMENTS.md`; CITED: https://www.postgresql.org/docs/16/sql-insert.html] |
| P107-SC3 | Reguläres Self-Review ist verboten. Nur Plattform-Admins dürfen mit Pflichtbegründung übersteuern; Plattform-Admins erhalten für keine Prüf-, Delegations- oder Override-Aktion Punkte, Badges oder Auszeichnungen. | App-User-Vergleich plus membership-unabhängige tx-bound Auflösung aller verified Actor-Member; expliziter Plattform-Override-Zweig ohne PointService-/Badge-Aufruf. [VERIFIED: `.planning/REQUIREMENTS.md`, `107-CONTEXT.md`, current `permissions.Actor`] |
| P107-SC4 | Jede zustandsändernde Review- und Delegationsaktion wird mit Akteur und Zeitpunkt auditiert, reine Lesezugriffe nicht. Strukturierte Audit-Metadaten bleiben unveränderlich, während Freitextgründe für spätere datenschutzkonforme Bereinigung getrennt löschbar sind. | Eigenes append-only strukturiertes Review-Audit; Audit nur bei tatsächlicher Mutation; jede Ablehnung mit strukturierter Kategorie plus nichtleerem Reason-Kind, Override-Grund als eigener Zweck; keine Audit-Calls bei No-op/Read. [VERIFIED: `.planning/REQUIREMENTS.md`, D-12, audit gap in `0075_audit_logs.up.sql`/`audit_logs.go`] |
| P107-SC5 | Prüfpunkte verwenden ausschließlich den PointService aus Phase 106 und dessen regelversionsstabile Idempotenz. Je konkretem Beitrag gibt es höchstens einen Ablehnungs- und einen späteren Bestätigungscredit; Retries, Parallelität und erneute Entscheidung desselben Prüfers erzeugen keine Duplikate. | `PointService.CreditInTx` bleibt alleiniger Award-Schreiber; zusätzliche source-scoped `review_credit_slots` schließen die beneficiary-scoped Lücke des Phase-106-Keys. [VERIFIED: `backend/internal/services/point_service.go`, `point_ledger_entries`, D-14..D-17] |
| P107-SC6 | Das Fundament definiert schmale Adapterverträge für spätere Beitragsdomänen und ist durch Berechtigungs-, Self-Review-, Plattform-Admin-, Parallelitäts-, Audit- und Punkte-Limit-Tests abgesichert, ohne Release-Quellen oder UI vorwegzunehmen. | Registry-gebundene `ReviewTargetAdapter`-Schnittstelle, Fake-Adapter-Vertragstests und PostgreSQL-Concurrency-Gates; keine Handler-, Contract-, Frontend- oder Domain-Consumer-Datei in Phase 107. [VERIFIED: `.planning/REQUIREMENTS.md`, `107-CONTEXT.md`] |
</phase_requirements>

## Summary

Phase 107 sollte als reines Backend-/Datenbankfundament geplant werden: drei typisierte Review-Actions werden in die vorhandene Permission Engine aufgenommen; delegierte Actions hängen direkt an der konkreten `fansub_group_members`-Zeile; ein transaktionsgebundener `ReviewService` entscheidet ausschließlich über registrierte schmale Domainadapter. Inhalt, fachlicher Status und Resubmission-Zähler bleiben in der jeweiligen Domäne. Das Fundament speichert nur Berechtigungs-, Entscheidungs-, Audit- und Credit-Slot-Metadaten. [VERIFIED: D-01..D-07, `permissions.go`, `authz_permissions.go`, `docs/architecture/db-schema-fansub-domain.md`]

Die erste Entscheidung wird durch einen Unique-Vertrag auf `(source_type, source_key, source_revision)` in `review_decisions` linearisiert und anschließend durch eine bedingte Adaptermutation im selben `pgx.Tx` bestätigt. Es gibt keine Claim-/Assignment-/Reservation-Zeile. Ein Concurrent-Loser erhält `ErrReviewAlreadyDecided`, der gesamte Verliererpfad rollt zurück und erreicht weder Audit-Commit noch PointService. [VERIFIED: D-05/D-06; CITED: https://www.postgresql.org/docs/16/sql-insert.html; CITED: https://github.com/jackc/pgx/blob/master/_autodocs/README.md]

Die wichtigste Korrektur gegenüber einer naiven Phase-106-Wiederverwendung ist die Credit-Grenze: Der aktuelle PointService-Key enthält den begünstigten Member. Zwei verschiedene Reviewer könnten deshalb für dieselbe Source und denselben Slot zwei unterschiedliche Keys erzeugen. Phase 107 braucht zusätzlich `review_credit_slots` mit Unique `(source_type, source_key, credit_slot)`. Erst der source-scoped Slot wird atomar gewonnen; danach bucht ausschließlich `PointService.CreditInTx` den tatsächlichen Ledger-Award für den Reviewer-Member. [VERIFIED: `buildCreditIdempotencyKey` in `backend/internal/services/point_service.go`, D-15/D-17]

**Primary recommendation:** Eine additive, tx-gebundene Review-Core-Schicht mit direkten typisierten Member-Grants, immutable Decision/Audit-Metadaten, getrennten löschbaren Reason-Texten und source-scoped Credit-Slots bauen; keine Release-/Media-/Anime-Adapter, keine Review-Queue, keine Handler, keine OpenAPI-/Frontend-Verdrahtung und keine Assignments in Phase 107. [VERIFIED: Phase Boundary, D-04/D-05, deferred ideas]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Typisierte Review-Actions | API / Backend | Database / Storage | `permissions.Service` bleibt Autorität; `action_definitions`/`role_capabilities` sind der bestehende Katalog. [VERIFIED: `permissions.go`, migration 0108] |
| Direkte Review-Delegation | Database / Storage | API / Backend | Aktiver Grant hängt an `fansub_group_members`; der Service erzwingt Gruppen- und Zielmitgliedschaft. [VERIFIED: D-02/D-03, migration 0073/0104] |
| Review-Target-Auflösung | API / Backend | Database / Storage | Adapter lesen ihre eigene Domain und liefern nur stabile Identität, Revision, Autor und Kontext. [VERIFIED: Phase Boundary, domain-ownership rules] |
| First-Decision-Wins | Database / Storage | API / Backend | Unique-Constraint ist der globale Concurrency-Arbiter; der Service mappt den Konflikt stabil. [CITED: https://www.postgresql.org/docs/16/indexes-unique.html; CITED: https://www.postgresql.org/docs/16/sql-insert.html] |
| Self-Review/Override | API / Backend | Database / Storage | Der Service vergleicht App-User plus membership-unabhängig aufgelöste verified Member-Claims jedes Actors; die DB speichert Override-Metadaten und den getrennten Grund. [VERIFIED: D-08..D-10] |
| Review-Audit | Database / Storage | API / Backend | Strukturierte Mutationsevents sind append-only; Freitext ist ein separater löschbarer Kinddatensatz. [VERIFIED: D-11..D-13] |
| Review-Credit-Limit | Database / Storage | API / Backend | Source-scoped Slots begrenzen global; PointService erzeugt und schreibt den beneficiary-scoped Ledger-Key. [VERIFIED: D-14..D-17, current PointService] |
| Release-/Media-/Anime-Status | API / Backend der späteren Domäne | Database / Storage der späteren Domäne | Phase 107 besitzt diese Inhalte und Zustände ausdrücklich nicht. [VERIFIED: Phase Boundary, AGENTS domain rules] |
| Delegations- und Review-UI | Browser / Client, später | API / Backend, später | Platzierung im vorhandenen Mitglieder-Editor ist gelockt, Verdrahtung folgt aber erst mit dem konkreten Consumer. [VERIFIED: D-04, `107-CONTEXT.md` Code Context] |

## Project Constraints (from AGENTS.md)

- Die Aufgabe ist GSD-/Planungsarbeit; es darf keine Anwendung implementiert und kein anderer Planungsartefakt verändert werden. [VERIFIED: `AGENTS.md`, parent assignment]
- Anime und Episoden bleiben neutral; Release-Version-Medien bleiben in `release_version_media`/`media_assets`/`media_files`; Phase 107 darf keine Media- oder Uploadstruktur einführen. [VERIFIED: `AGENTS.md`, `docs/architecture/db-schema-fansub-domain.md`]
- Vor neuen Services, Repositorys, DTOs oder Endpoints müssen vorhandene Äquivalente gesucht und als `read_first` benannt werden; parallele Auth-, Request-, Upload-, Member- oder Domain-Lookups sind verboten. [VERIFIED: `AGENTS.md`, `docs/engineering/implementation-contract.md`, `.codex/skills/team4s-implementation-contract/SKILL.md`]
- Die bestehende Permission Engine ist die Backend-Autorität; Frontend-Checks oder direkte boolesche Sonderrechte dürfen sie nicht ersetzen. [VERIFIED: `AGENTS.md`, `docs/frontend/auth-api-client.md`]
- Neue API-Verträge müssten YAML, Backend, Frontendtypen/-helper und Contract-Tests gemeinsam ändern; die empfohlene Phase 107 eröffnet deshalb noch keinen HTTP-Vertrag. [VERIFIED: `AGENTS.md`, `docs/api/api-contracts.md`, Phase Boundary]
- Historische Migrationen 0131–0133 bleiben unverändert; vor einer neuen Migration sind `git status`, höchster getrackter Stand und ungetrackte Migrationen erneut zu prüfen. [VERIFIED: `AGENTS.md`, migration audit 2026-07-23]
- Destruktive Schemaänderungen, unklare persistierte Ownership und falsche Domain-Zuordnung sind Stop-Bedingungen. Die empfohlene Up-Migration ist additiv; ihr Down-Pfad muss vor Datenverlust fail-closed prüfen. [VERIFIED: `AGENTS.md`]
- Relevante Checks sind fokussierte Tests, vollständige Go-Suite, `go vet`, Migration Up/Down und `git diff --check`; nicht ausführbare Checks müssen begründet werden. [VERIFIED: `AGENTS.md`]
- Bei späterer geschützter UI muss eine gültige Refresh-Session trotz fehlendem Access-Token funktionieren; Phase 107 verändert keine Browserauthentisierung. [VERIFIED: `AGENTS.md`, `docs/frontend/auth-api-client.md`]
- Deutsche nutzerseitige Texte brauchen echte Umlaute; Phase 107 erzeugt nach dieser Empfehlung keine nutzerseitigen Texte. [VERIFIED: `AGENTS.md`, Phase Boundary]

## Current Implementation Audit and Corrected Assumptions

| Seam | Verified current state | Planning consequence |
|---|---|---|
| Migration chain | Getrackter Höchststand ist `0133_member_point_whitespace_hardening`; 0131 legt Regeln/Ledger an, 0132 schützt TRUNCATE/Reason-Shape, 0133 erzwingt Unicode-Whitespace-Kanonizität. Es gibt am 2026-07-23 keine modifizierte oder ungetrackte Migration. [VERIFIED: `database/migrations/0131*`..`0133*`, `git status`, `git ls-files --others`] | Die nächste Nummer ist nur vorläufig 0134; 0131–0133 dürfen nicht editiert werden. |
| `PointService` | `CreditInTx` nimmt `repository.DBTX`, `RuleRef`, `SourceRef` und Member; Wert und Key entstehen serverseitig. Der Key ist `v1|reward-kind|source-type|source-key|beneficiary:member|slot:slot`. [VERIFIED: `backend/internal/services/point_service.go`] | ReviewService darf weder Wert noch Roh-Key annehmen und muss denselben Caller-Tx verwenden. |
| Globales Review-Credit-Limit | Der Phase-106-Key enthält `beneficiary:{member-id}`; ein anderer Reviewer erzeugt einen anderen Key. [VERIFIED: `buildCreditIdempotencyKey`] | PointService-Idempotenz allein erfüllt D-15 nicht; `review_credit_slots` muss source-scoped sein. |
| Permission Engine | Actions sind Go-Konstanten, `action_definitions` und `role_capabilities`; Gruppenrechte kommen aus aktiven `fansub_group_members` plus Rollen. Plattform-Admins sind ein globaler Bypass und besitzen keinen `role_capabilities`-Eintrag. [VERIFIED: `permissions.go`, `authz_permissions.go`, migration 0108] | Neue Review-Actions müssen Konstante, Fallback-Matrix, `allKnownActions`, DB-Katalog, Seed und Tests gemeinsam erweitern. |
| Direkte Member-Sonderrechte | `fansub_group_member_media_permissions` existiert als direktes boolesches Sondermodell und wird in Media-Handlern zusätzlich zur Permission Engine geprüft. [VERIFIED: migration 0110, `fansub_media_*`, `fansub_group_app_members_repository.go`] | Nur UI-/Mitgliedereditor-Form ist ein Analog; dieses parallele boolesche Autorisierungsmuster darf für Review nicht kopiert werden. |
| Reviewer-Member-Identität | App-Gruppenmitgliedschaften besitzen seit 0104 einen `member_id`-Anker; verifizierte `member_claims` bilden unabhängig davon die Account→Member-Identität ab. `fansub_group_members.status` ist `active|disabled`, `app_users.status` enthält `active|disabled|pending`. [VERIFIED: migrations 0073/0081/0104, `fansub_group_app_members_repository.go`, `models/app_auth.go`] | Die Permission für Nicht-Plattform-Reviewer verlangt aktive Membership plus passenden verifizierten Member-Anker. Self-Review löst für **jeden** Actor alle verifizierten Member-Claims membership-unabhängig im Caller-Tx auf; Plattform-Admins dürfen ohne Member entscheiden, müssen bei App-User- oder verified-Member-Match aber explizit mit nichtleerem Grund übersteuern und bleiben punktelos. |
| Generic audit | `audit_logs` hat keine UPDATE-/DELETE-/TRUNCATE-Sperre; `AuditLogRepository.Write` ist DBTX-fähig, viele Handler ignorieren Schreibfehler best-effort. [VERIFIED: migration 0075, `audit_logs.go`, `contribution_review_handler.go`] | `audit_logs` allein erfüllt D-11/D-12 nicht; Review-Audit muss verpflichtend und im selben Tx geschrieben werden. |
| Bestehender Anime-Review | `Confirm`/`Reject` aktualisieren nur `id` + `status='proposed'`, verwenden `members.manage`, haben keinen Self-Review-Guard, Reject speichert keinen Reviewer, und Audit erfolgt nachträglich best-effort. [VERIFIED: `contribution_review_handler.go`, `anime_contributions_proposal_repository.go`] | Nur das bedingte Status-Update ist ein Analog. Der Pfad darf nicht wiederverwendet oder in Phase 107 verdrahtet werden. |
| Review-/Assignment-Tabellen | Es existiert kein `review_decisions`, `review_delegations`, `review_assignments` oder `review_credit_slots` im aktuellen Schema. [VERIFIED: repository/migration `rg` audit 2026-07-23] | Neue Metadaten müssen additiv angelegt werden; Assignment-/Reservation-Tabellen bleiben ausdrücklich verboten. |

## Standard Stack

### Core

| Library / platform | Version | Purpose | Why standard |
|---|---:|---|---|
| Go | Modul `go 1.25.0`; Host `go1.26.1` | Permission-, Review-, Adapter- und Testcode | Bestehender Backend-Stack; keine neue Runtime nötig. [VERIFIED: `backend/go.mod`, `go version`] |
| PostgreSQL | Projektziel `postgres:16` | Unique-Arbitration, FK-/Check-Verträge, append-only Trigger, Transaktionen | Concurrency- und Audit-Invarianten müssen prozessübergreifend in der DB gelten. [VERIFIED: `docker-compose.yml`; CITED: https://www.postgresql.org/docs/16/indexes-unique.html] |
| pgx/v5 | gepinnt `v5.7.1` (veröffentlicht 2024-09-10) | Caller-owned `pgx.Tx`, Query/Exec und Pool | Bestehende Phase-106-Seam; Tx-Methoden binden Domain, Decision, Audit und Credit atomar. [VERIFIED: `go.mod`, `go list -m -json`; CITED: https://github.com/jackc/pgx/blob/master/_autodocs/README.md] |

### Supporting

| Library / tool | Version | Purpose | When to use |
|---|---:|---|---|
| `testify` | gepinnt `v1.9.0` (veröffentlicht 2024-02-29) | Assertions | Vorhandene Repository-/Service-Testkonvention. [VERIFIED: `go.mod`, `go list -m -json`] |
| Go `testing` | Host Go 1.26.1 / Modul 1.25 | Unit-, Source- und Integrationstests | Alle Phase-107-Gates; keine neue Testbibliothek. [VERIFIED: existing `*_test.go`] |
| Projekt-Migrationsrunner | aktueller Stand bis 0133 | Additive Up/Down-Migration | Migrationstest und spätere Anwendung. [VERIFIED: `backend/internal/migrations/runner.go`, migration inventory] |

`go list -m -u` meldet pgx `v5.10.0` und testify `v1.11.1` als neuere Versionen; Phase 107 soll die gepinnten Versionen nicht nebenbei aktualisieren. [VERIFIED: `go list -m -u -json` 2026-07-23; `AGENTS.md` small-diff rule]

**Installation:** Keine neuen Pakete installieren. [VERIFIED: existing stack covers transactions, SQL and tests]

### Alternatives Considered

| Instead of | Could use | Tradeoff |
|---|---|---|
| PostgreSQL-Unique als Decision-Arbiter | In-memory Lock oder verteiltes Locksystem | Verboten: nicht instanzübergreifend bzw. unnötige neue Infrastruktur; PostgreSQL ist bereits die transaktionale Autorität. [VERIFIED: current stack; CITED: https://www.postgresql.org/docs/16/indexes-unique.html] |
| bestehende Permission Engine | separate Reviewer-Rollenengine | Verboten durch D-01 und würde Plattform-/Gruppenscope duplizieren. [VERIFIED: D-01/D-02] |
| PointService | direkte Ledger-Inserts | Verboten durch D-14 und umgeht regelversionsstabile Idempotenz. [VERIFIED: D-14, Phase-106 implementation] |

## Architecture Patterns

### System Architecture Diagram

```text
späterer HTTP-/Job-Caller
          |
          | nur ReviewTargetRef {source_type, stable_key}
          v
ReviewService (Phase 107, besitzt genau einen pgx.Tx)
          |
          +--> registrierter ReviewTargetAdapter
          |      LoadForDecision(tx) -> Kind, Group, Revision,
          |                             SubmitterAppUser, BeneficiaryMember
          |
          +--> Permission Engine mit tx-gebundenem AuthzRepository
          |      platform_admin bypass
          |      ODER role_capability / direct member review grant
          |
          +--> Self-review?
          |      normal -> ErrSelfReviewForbidden
          |      platform admin + Pflichtgrund -> markierter Override
          |
          +--> INSERT review_decisions
          |      UNIQUE(source_type, source_key, source_revision)
          |                |
          |                +-- conflict --> ErrReviewAlreadyDecided; rollback
          |
          +--> adapter.ApplyDecision(tx, expected revision/pending)
          +--> immutable review_audit_events -> review_decision_id
          +--> verpflichtende Reject-/Override-Reason-Texte nach Anlass (später einzeln löschbar)
          |
          +--> normaler Reviewer mit Member?
                 xact-lock + prüfe review_credit_slots(source, slot)
                 +--> PointService.CreditInTx(tx, generated RuleRef/SourceRef)
                 +--> Slot -> point_ledger_entries.id
                 platform_admin/override -> kein Review-Slot/-Credit
          |
          v
       COMMIT gemeinsam oder ROLLBACK gemeinsam
```

Der Service nimmt weder Gruppen-ID, Einreicher-ID, Member-ID, Punktwert, Idempotenzschlüssel noch Entscheidungsversion ungeprüft vom Caller; diese Werte kommen aus Adapter, Auth-Kontext oder festem Review-Regelkatalog. [VERIFIED: D-06/D-08/D-14, `PointService` boundary]

### Recommended Project Structure

```text
database/migrations/
├── 0134_review_foundation.up.sql       # Nummer vor Ausführung erneut prüfen
└── 0134_review_foundation.down.sql

backend/internal/migrations/
└── phase107_review_foundation_test.go

backend/internal/permissions/
├── permissions.go                      # Actions + tx-fähige direkte Grants
├── permissions_test.go
└── capability_registry_test.go

backend/internal/repository/
├── audit_logs.go                       # DBTX nur falls für Query erweitert
├── authz.go                            # DBTX/WithDB statt Pool-only
├── authz_permissions.go
├── review_delegation_repository.go
├── review_decision_repository.go
├── review_audit_repository.go
└── review_*_test.go

backend/internal/services/
├── review_service.go
├── review_service_test.go
└── review_service_boundary_test.go

backend/internal/testsupport/
├── phase106_postgres.go                # vorhandene Sicherheitslogik bewahren
└── phase107_postgres.go                # dünner Wrapper; Guard-Code nicht duplizieren
```

Keine Datei unter `backend/internal/handlers`, `backend/cmd/server`, `shared/contracts`, `frontend`, Release-/Media-Repositories oder Anime-Contribution-Repositories gehört in Phase 107. [VERIFIED: Phase Boundary, D-04/D-05, implementation contract]

### Pattern 1: Typed direct grants inside the Permission Engine

**Recommendation:** Diese drei Actions verwenden:

- `review.text.decide`
- `review.image.decide`
- `review.contribution.decide`

Sie werden in `permissions.Action`, `allKnownActions`, statischer Fallback-Matrix, `action_definitions` und `role_capabilities` ergänzt. `fansub_lead` erhält alle drei per Role-Capability; Plattform-Admin bleibt globaler Bypass ohne Role-Capability. Delegierte erhalten nur einzelne Actions über `fansub_group_member_review_capabilities(fansub_group_member_id, action_code)`. [VERIFIED: D-01/D-02 and existing capability bootstrap pattern]

Die direkte Grant-Tabelle darf per CHECK/FK nur die drei `review.*.decide`-Codes enthalten. Sie darf insbesondere niemals `fansub_group.members.manage` oder eine Delegations-Action aufnehmen. Grant/Revoke autorisieren weiterhin über `ActionFansubGroupMembersManage` oder Plattform-Admin. Dadurch verleiht ein Review-Grant keine Weiterdelegation. [VERIFIED: D-02, existing `members.manage` authority]

Zielberechtigt ist ein `fansub_group_members`-Datensatz derselben Gruppe mit `status='active'`, aktivem `app_users`-Datensatz, positivem `member_id` und verifiziertem `member_claim` auf genau dieselbe App-User-/Member-Kombination. Deaktivierung löscht den Grant nicht, aber die Permission Engine verweigert Entscheidungen solange der Actor nicht aktiv ist; Reaktivierung stellt den noch vorhandenen Grant wieder her. [VERIFIED: D-02/D-03, migrations 0073/0081/0104, current permission base checks]

Direkte Member-Grants gehören nicht in den paketglobalen Role→Action-Cache: Sie werden im neuen Review-Autorisierungspfad über ein separates fokussiertes `ReviewContextResolver`-Interface gelesen, das `AuthzRepository` zusätzlich zum unveränderten etablierten `permissions.Resolver` implementiert. `permissions.Service.CanReviewForFansubGroup` verwendet für Review-Actions eine exakte Type Assertion und liefert `ReviewAuthorizationResult{Result, MembershipID, MemberID}`; `CanForFansubGroup` delegiert diese drei Actions intern und behält seine Signatur. Bestehende Handler- und Test-Stubs müssen keine neue Resolver-Methode implementieren. Jeder Nicht-Plattform-Reviewpfad, auch Fansub-Lead per Rolle, benötigt diesen Kontext einmal für aktive Membership-/Member-Attribution; erst danach erlauben Rolle oder exakt passende Direct-Action. Grant/Revoke gelten nach der Membership-Linearization sofort, ohne globalen Cache-Reload; der Startup-Cache bleibt ausschließlich für `role_capabilities`. [VERIFIED: current `loadedCache` and `permissions.Resolver`, D-07/D-17; CITED: https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x17-V8-Authorization.md]

### Pattern 2: Tx-bound permission evaluation

`AuthzRepository` ist derzeit an `*pgxpool.Pool` gebunden, während PointService die gemeinsame `repository.DBTX`-Naht verwendet. Refaktorieren Sie `AuthzRepository` auf eine kleine Pool-/Tx-kompatible Query/Exec-Schnittstelle und ergänzen Sie `WithDB(tx)`. `ReviewService` wertet Rollen und direkte Grants über denselben Tx aus, in dem Decision, Audit, Adaptermutation und Credit geschrieben werden. [VERIFIED: `authz.go`, `audit_logs.go`, `point_service.go`; CITED: https://github.com/jackc/pgx/blob/master/_autodocs/README.md]

Der fokussierte Review-Kontext trennt zwei Lookups: `ResolveActorReviewGrantContext` linearisiert die konkrete aktive Gruppenmembership und ihre exakten Direct-Grants; `ResolveVerifiedActorMemberIDs` liest für denselben App-User alle verified `member_claims` ohne Membership-Join. `ReviewService` führt den zweiten Lookup für jeden Actor einschließlich `platform_admin` vor der Self-Review-Entscheidung aus. Ein verified Member-Match mit dem Target-Beneficiary ist daher auch dann Self-Review, wenn die Gruppenmembership fehlt oder einen anderen Anker trägt. [VERIFIED: D-08/D-09, migrations 0081/0104]

Grant, Revoke und Decision müssen dieselbe Ziel-Membership-Zeile sperren, damit eine bereits linearisiert entzogene Delegation nicht noch für eine spätere Entscheidung verwendet wird. Row-Locks enden mit der Transaktion und blockieren konkurrierende Writer/Locker derselben Zeile. [VERIFIED: D-07; CITED: https://www.postgresql.org/docs/16/explicit-locking.html]

### Pattern 3: Registry-bound narrow domain adapters

```go
// Source: recommended boundary derived from 107-CONTEXT.md and existing repository.DBTX
type ReviewTargetRef struct {
    SourceType string // server-registered adapter key
    StableKey  string // opaque domain identity; no group/member fields
}

type ReviewTarget struct {
    Ref                    ReviewTargetRef
    Revision               int64
    Kind                   ReviewKind
    FansubGroupID          int64
    SubmitterAppUserID     *int64
    BeneficiaryMemberID    *int64
    ReleaseVersionID       *int64
    Pending                bool
}

type ReviewTargetAdapter interface {
    LoadForDecision(context.Context, repository.DBTX, ReviewTargetRef) (ReviewTarget, error)
    ApplyDecision(context.Context, repository.DBTX, ReviewTarget, ReviewDecision) error
}
```

Der Service wählt den Adapter aus einer beim Constructor registrierten Map nach `SourceType`; ein Request darf keinen beliebigen Adapter injizieren. `LoadForDecision` liefert die fachliche Revision und serverseitige Ownership. `ApplyDecision` muss mit erwarteter Revision und Pending-Zustand genau eine Domainzeile ändern. Null Zeilen bedeuten stabilen Conflict, nicht NotFound-Theater. `SourceType` und `StableKey` sind kanonische, getrimmte, nichtleere Tokens ohne `|`, damit der unveränderte Phase-106-PointService-Key gültig bleibt; der Adapter erzeugt sie, der Service validiert sie erneut. [VERIFIED: D-06, API contract rules, `validToken` in `point_service.go`, current conditional-update analog]

`StableKey` bleibt bei Bearbeitung/Neueinreichung gleich; `Revision` steigt pro Review-Zyklus. Verschiedene reale Texte/Bilder besitzen verschiedene StableKeys. Der Kern speichert keinen Text, keine Datei, keinen Upload und keinen universellen Domainstatus. [VERIFIED: D-15/D-16, domain boundary]

### Pattern 4: Immutable decision arbiter

```sql
-- Source: PostgreSQL 16 INSERT / unique-index semantics
INSERT INTO review_decisions (
    source_type, source_key, source_revision, review_kind,
    decision, rejection_category, fansub_group_id, reviewer_app_user_id,
    reviewer_member_id, is_platform_override, decided_at
)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
ON CONFLICT (source_type, source_key, source_revision) DO NOTHING
RETURNING id;
```

Ein Reject verlangt eine kanonische Unicode-nichtleere `rejection_category`; Confirm verbietet sie. Ein leeres `RETURNING` wird immer zu `ErrReviewAlreadyDecided`/später HTTP 409 gemappt. Es wird nicht nach Reviewer unterschieden und kein „eigener“ Retry darf den Entscheid nochmals ausführen. Die Zeile ist nach Insert per Trigger gegen UPDATE/DELETE/TRUNCATE geschützt. [CITED: https://www.postgresql.org/docs/16/sql-insert.html; VERIFIED: D-06/D-12]

Der Adapter führt zusätzlich sein fachliches `UPDATE ... WHERE stable_id=? AND revision=? AND status='pending'` im selben Tx aus. PostgreSQL wartet bei konkurrierenden Updates und wertet die WHERE-Bedingung gegen die aktualisierte Zeile erneut aus; trotzdem bleibt `review_decisions` der domänenübergreifend stabile Conflict-Arbiter. [CITED: https://www.postgresql.org/docs/16/transaction-iso.html]

Die anschließend im selben Tx angelegte `review_audit_events`-Zeile referenziert die zurückgegebene `review_decision_id`; die immutable Decision trägt keinen Forward-Verweis auf ein noch nicht vorhandenes Audit-Event. Scheitert Domainmutation, Audit oder Credit, rollt auch der Decision-Insert zurück. [VERIFIED: caller-owned Tx pattern and D-11]

### Pattern 5: Separate immutable audit and scrub-capable free text

`review_audit_events` speichert nur strukturierte Spalten: Event-/Action-Code, optionalen `review_decision_id`, Actor-Kind (`app_user|system`), Actor-App-User-/Member-Snapshot, Gruppen-ID, Target-Type/-Key/-Revision, Decision/Override-Flags und `occurred_at`. Es gibt kein beliebiges Payload-Feld, in das Freitext versehentlich gelangen kann. UPDATE/DELETE/TRUNCATE werden abgewiesen. [VERIFIED: D-11..D-13, Phase-106 immutability trigger analog]

`review_reason_texts` ist eine Kindtabelle mit `audit_event_id`, typed `reason_kind IN ('reject','override')` und ausschließlich dem Freitext. UPDATE und TRUNCATE werden abgewiesen; ein späterer Retention-Flow darf eine Zweck-Kindzeile löschen und schreibt dabei ein neues strukturiertes `reason.scrubbed`-Audit-Event. Das Originalevent behält `has_reason=true`, Actor, Zeitpunkt und Entscheidung, aber keinen Grundtext. Jeder Reject erzeugt Kategorie plus `reject`-Grund; ein Plattform-Self-Override erzeugt unabhängig davon den `override`-Grund. [VERIFIED: D-12, deferred cleanup boundary]

Systemevents verwenden `actor_kind='system'` und NULL für App-User/Member. Plattform-Admins verwenden ihren echten App-User, aber `reviewer_member_id` darf NULL bleiben. Kein künstlicher Member wird angelegt. [VERIFIED: D-09/D-13]

Der Event-Code-Katalog muss in Phase 107 mindestens `delegation.granted`, `delegation.revoked`, `review.confirmed`, `review.rejected`, `review.override`, `review_credit.awarded` und `review_credit.reversed` typisieren und reserviert die späteren Domaincodes `source.submitted`, `source.edited_after_reject`, `source.resubmitted`, `source.published` und `cleanup.completed`. Phase 107 schreibt nur Foundation-Events; Phase 107.1/108 schreiben ihre Domaincodes über dasselbe DBTX-Repository. [VERIFIED: D-11, Phase Boundary]

Read-Methoden (`ListOpen`, Adapter-Load ohne Mutation, Decision-/Audit-Reads) schreiben ausdrücklich kein Audit. Existing `auditPermissionDenied`-Read-Patterns sind kein Analog für diesen Kern. [VERIFIED: D-11, current contribution list handler]

Delegation-Grant/-Revoke melden `changed` aus `RowsAffected`. Der Service schreibt `delegation.granted|revoked` nur bei `changed=true`; wiederholter Grant und Revoke einer fehlenden Zeile sind erfolgreiche No-ops ohne neues Audit. [VERIFIED: D-11, idempotent repository mutation pattern]

### Pattern 6: Source-scoped credit slots plus PointService

`review_credit_slots` besitzt Unique `(source_type, source_key, credit_slot)` mit `credit_slot IN ('reject','confirm')`, Reviewer-Member und `point_ledger_entry_id`. Die Tabelle ist nach dem erfolgreichen Link-Insert DB-seitig append-only und verweigert `UPDATE`, `DELETE` und `TRUNCATE`. Der ReviewService nimmt zuerst einen deterministischen transaktionsgebundenen Advisory Lock für Source+Slot, prüft unter diesem Lock auf eine vorhandene Zeile, ruft nur beim freien Slot `PointService.CreditInTx` und schreibt anschließend den Slot mit der zurückgegebenen Ledger-ID. Unique bleibt der unabhängige letzte Arbiter; Advisory-Lock-Kollisionen dürfen höchstens zusätzliche Serialisierung, aber keine falsche Vergabe verursachen. Der leere Down-Pfad bleibt möglich, indem er den Credit-Slot-Guard explizit vor der Tabelle entfernt. [VERIFIED: D-15..D-17, current beneficiary-scoped PointService key; CITED: https://www.postgresql.org/docs/16/explicit-locking.html]

Der Service konstruiert intern:

```go
services.CreditCommand{
    MemberID: reviewerMemberID,
    ActorAppUserID: &actor.AppUserID,
    Source: services.SourceRef{
        RewardKind: services.RewardKindReview,
        Type: "review_decision",
        Key: sourceType + ":" + stableKey,
        Slot: string(decision), // "reject" oder "confirm"
    },
    Rule: services.RuleRef{Code: "review.decision", Version: 1},
    FansubGroupID: &target.FansubGroupID,
    ReleaseVersionID: target.ReleaseVersionID,
    EffectiveAt: decidedAt,
}
```

Ein einziges produktives Rule-Seed `review.decision` Version 1, Kategorie `platform_contribution`, Wert **1** hält Annahme und Ablehnung zwangsläufig gleich gewichtet. Caller können weder Regel, Wert noch Key wählen. [VERIFIED: D-14 discretion, `point_rules` contract]

Bei Plattform-Admin-Aktionen — regulär oder Override, mit oder ohne zufällig vorhandenen Member-Claim — wird weder ein Review-Credit-Slot angelegt noch der Review-Credit-Pfad des PointService aufgerufen. [VERIFIED: D-09/D-10/D-17]

Diese Sperre gilt ausschließlich für den **Review-Credit des Prüfers**. Ein späterer vertrauenswürdiger Domainadapter darf bei Bestätigung weiterhin über `PointService.CreditInTx` den fachlichen Arbeitscredit des einreichenden Members buchen und bei fachlicher Aufhebung über `ReverseInTx` exakt einmal stornieren; beides bleibt im Caller-Tx und wird strukturiert auditiert. Der Review-Core darf den Plattform-Admin-Zweig daher nicht als globales „keine Punkte dieser Transaktion“ behandeln. Für `ReverseInTx.Reason` ist ein fester maschinenlesbarer Code zu verwenden, niemals der freie Override-/Ablehnungstext, weil Ledger-Reversalgründe unveränderlich sind. [VERIFIED: D-09/D-10/D-12, `PointService.ReverseInTx`, `107-CONTEXT.md` established PointService pattern]

### Pattern 7: Self-review on App-User plus membership-independent verified claims

Normale Reviewer werden abgewiesen, wenn `actor.AppUserID == SubmitterAppUserID` **oder** irgendeine ID aus `ResolveVerifiedActorMemberIDs(actor.AppUserID)` dem `BeneficiaryMemberID` entspricht. Der Lookup läuft für jeden Actor im Caller-Tx direkt über verified `member_claims`, ohne Membership-Join. Dadurch kann dieselbe Person den Schutz weder über getrennte Login-/Member-Anker noch über fehlende/abweichende Gruppenmembership umgehen. Fehlt bei einer normalen Source die notwendige Autor-/Beneficiary-Attribution, ist sie nicht reviewfähig und der Adapter scheitert geschlossen. [VERIFIED: D-08, canonical member identity decision]

Ein Plattform-Admin darf ohne Member eine fremde Source entscheiden. Matcht aber sein App-User oder einer seiner verified Member-Claims Autor/Begünstigten, darf er Self-Review nur mit explizitem Override-Flag und Unicode-nichtleerem Pflichtgrund ausführen. Für Review einer fremden Source ist kein Override-Flag nötig, die Aktion bleibt dennoch punktelos. [VERIFIED: D-08..D-10, `phase106_trim_unicode_whitespace` available from migration 0133]

### Stable service errors

| Sentinel | Meaning | Later HTTP mapping |
|---|---|---:|
| `ErrReviewAlreadyDecided` | Revision besitzt bereits Confirm/Reject | 409 |
| `ErrReviewSelfReviewForbidden` | normaler Actor entspricht Submitter/Beneficiary | 403 |
| `ErrReviewOverrideReasonRequired` | Plattform-Self-Override ohne Pflichtgrund | 422 |
| `ErrReviewCapabilityDenied` | keine passende typisierte Action im Gruppenkontext | 403 |
| `ErrReviewTargetNotFound` | Adapter kennt Source nicht | 404 |
| `ErrReviewTargetNotPending` | Source/Revision nicht mehr entscheidbar | 409 |

Diese Fehler gehören in Service/Repository, nicht in Handlercopy; Phase 107 testet `errors.Is`, Phase 107.1 mappt sie einmal in den HTTP-Vertrag. [VERIFIED: repository sentinel pattern in `backend/internal/repository/errors.go`, API contract rules]

### Migration and seed safety

- Die vorläufige Migration 0134 ist rein additiv: neue Reviewtabellen/Trigger/Indizes, drei Action-Definitionen, `fansub_lead`-Role-Capabilities und exakt ein Review-Rule-Seed. [VERIFIED: current max 0133, D-01/D-14]
- Vor Erstellung muss erneut geprüft werden: getrackter Maximalstand, `git status --short -- database/migrations backend/internal/migrations` und ungetrackte Migrationen. Bei ungetrackter/ambiger Kette stoppen. [VERIFIED: `AGENTS.md`]
- Der Rule-Seed muss fail-closed eingefügt werden: existiert `(review.decision,1)` mit anderer Kategorie oder anderem Wert, bricht Up ab; kein stilles `DO UPDATE`. [VERIFIED: immutable `point_rules` contract]
- Down muss abbrechen, sobald Review-Decisions/Audit/Grants/Credit-Slots oder Ledgerzeilen für den Seed existieren. Nur bei leerem Fundament darf es Tabellen/Actions entfernen und den exakt passenden Seed unter transaktional kurz deaktiviertem `point_rules_immutable`-Trigger löschen; bei Fehler rollt die Triggeränderung mit zurück. [VERIFIED: AGENTS destructive migration rules, migrations 0131/0132]
- `review_decisions`, `review_audit_events` und `review_credit_slots` verweigern UPDATE, DELETE und TRUNCATE per DB-Trigger; `review_reason_texts` erlaubt ausschließlich den späteren DELETE-Scrub. Der leere Down-Pfad droppt jeden Guard vor seiner Tabelle. [VERIFIED: D-11/D-12/D-15, migration 0131/0132 trigger analog]
- Historische IDs in Decision/Audit werden als validierte Snapshots ohne `ON DELETE CASCADE` bewahrt. Aktive Grants dürfen mit der aktuellen Membership verschwinden, weil die unveränderliche Auditspur separat bleibt. [VERIFIED: D-07/D-11, existing group-delete behavior]

### Anti-Patterns to Avoid

- **`review_assignments`, `assigned_to`, `claimed_by`, `reserved_until`:** widerspricht D-05 und schafft Rückgabe-/Timeout-Lebenszyklen. [VERIFIED: D-05]
- **Eine pauschale `review.decide`-Capability:** verliert Text/Bild/Mitwirkungsgrenzen. [VERIFIED: D-01]
- **Review-Boolean-Tabelle analog Media-Permissions plus Handler-Sondercheck:** umgeht die Permission Engine. [VERIFIED: D-01/D-02, current 0110 special seam]
- **Current `ContributionReviewHandler` erweitern:** würde `anime_contributions` vorziehen und übernimmt falsche Auth-/Audit-/Self-Review-Semantik. [VERIFIED: Phase Boundary, current handler audit]
- **Nur PointService-Idempotenz als globales Credit-Limit:** beneficiary im Key erlaubt mehrere Reviewer. [VERIFIED: current `buildCreditIdempotencyKey`]
- **Audit nach Commit oder `_ = audit.Write(...)`:** Entscheidung kann ohne Audit bestehen. [VERIFIED: D-11, current best-effort gap]
- **Grundtext im Decision-/Audit-JSON:** verhindert gezielte Retention. [VERIFIED: D-12]
- **Client liefert Gruppe, Member, Punktwert, RuleRef oder Idempotenzschlüssel:** ermöglicht Scope-/Reward-Spoofing. [VERIFIED: D-02/D-14, API contract rules]
- **Domainstatus in einer generischen Review-Content-Tabelle:** verschluckt Release-/Media-/Anime-Ownership. [VERIFIED: Phase Boundary, AGENTS domain rules]

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Rollen-/Scope-Entscheidung | neue Reviewer-Rollenengine oder Handler-Ifs | `permissions.Service` + tx-gebundener `AuthzRepository` | Bestehende einzige Autorität und Plattform-Bypass. [VERIFIED: canonical decision, current code] |
| Parallelitätsarbiter | In-memory Mutex, SELECT-before-INSERT | PostgreSQL Unique + `ON CONFLICT DO NOTHING RETURNING` | Wirkt über Prozesse/Instanzen hinweg. [CITED: https://www.postgresql.org/docs/16/sql-insert.html] |
| Punktebuch | direkte Inserts oder eigener Review-Ledger | `PointService.CreditInTx` / `ReverseInTx` + `point_ledger_entries` | Wert, Regel-Snapshot, Idempotenz und Storno sind bereits gehärtet. [VERIFIED: Phase 106 implementation] |
| Review-Credit-Limit | beneficiary-scoped PointService-Key allein | Source+Slot-Xact-Lock, Slot-Recheck, PointService, dann `review_credit_slots`-Link im selben Tx | D-15 gilt source-global, nicht nur pro Reviewer. [VERIFIED: key audit; CITED: https://www.postgresql.org/docs/16/explicit-locking.html] |
| Audit | best-effort `audit_logs` als einzige Spur | immutable Review-Audit im selben Tx | D-11/D-12 verlangen Unveränderlichkeit und Atomizität. [VERIFIED: audit gap] |
| Freitext-Retention | Textfelder in Decision/Audit | separate löschbare Reason-Kindtabelle | Struktur bleibt, Text kann später gezielt entfernt werden. [VERIFIED: D-12] |
| Domainintegration | Universalmodell oder Source-Switch im Core | registrierte schmale Adapter | Domain bleibt Eigentümer von Inhalt und Status. [VERIFIED: Phase Boundary] |
| DB-Testguard | zweiter kopierter DSN-/Schema-Guard | Phase-106-Testguard extrahieren und per Phase-107-Wrapper nutzen | Vermeidet Sicherheitsdrift und normale DB-Nutzung. [VERIFIED: `testsupport/phase106_postgres.go`, implementation contract] |

## Common Pitfalls

### Pitfall 1: Beneficiary-scoped key mistaken for source-global cap

**What goes wrong:** Reviewer A erhält Reject-Credit; nach Resubmission lehnt Reviewer B erneut ab und bekommt wegen anderer Member-ID einen zweiten Reject-Award. [VERIFIED: PointService key format + D-15]

**How to avoid:** Source+Slot im Tx serialisieren, vorhandenen Slot erneut prüfen, erst dann PointService rufen und den Ledger-verknüpften Slot im selben Tx schreiben; `(source_type, source_key, reject|confirm)` bleibt unique. [VERIFIED: recommended slot contract; CITED: https://www.postgresql.org/docs/16/explicit-locking.html]

**Warning sign:** Tests prüfen Retries nur mit demselben `MemberID`. [VERIFIED: current Phase-106 tests focus]

### Pitfall 2: Audit is outside the decision transaction

**What goes wrong:** Domainstatus/Points committen, Audit scheitert still. [VERIFIED: current contribution handler demonstrates this risk]

**How to avoid:** Adaptermutation, Decision, strukturiertes Audit, Reason und Credit im selben Caller-Tx; jeder Fehler rollt alles zurück. [CITED: https://github.com/jackc/pgx/blob/master/_autodocs/README.md]

**Warning sign:** `_ = auditRepo.Write`, Pool- statt Tx-Repository oder separater PointService-`Credit`. [VERIFIED: derived code-review criterion]

### Pitfall 3: Self-review compares only App-User

**What goes wrong:** Dieselbe Person kann über einen alternativen Account/Claim-Kontext als anderer Login erscheinen. [VERIFIED: member/app-user identity split in canonical decision]

**How to avoid:** App-User vergleichen und für jeden Actor alle verified Member-Claims tx-bound ohne Membership-Join auflösen; fehlende Target-Attribution fail-closed. [VERIFIED: D-08/D-17]

**Warning sign:** `if actor.ID == created_by` ohne Membervergleich. [VERIFIED: derived verification criterion]

### Pitfall 4: Platform admin accidentally enters gamification

**What goes wrong:** Ein Plattform-Admin mit zufällig verifiziertem Member-Claim erhält Review-Punkte oder spätere Badges. [VERIFIED: D-09 threat]

**How to avoid:** Verified Actor-Member für Self-Review auch beim Plattform-Admin auflösen, danach `IsPlatformAdmin` vor Membership-Credit-Auflösung prüfen; kein Review-Slot und kein Review-Credit-/Badge-Aufruf in beiden Admin-Pfaden. Fachliche Arbeitscredits des Einreichers bleiben davon getrennt. [VERIFIED: D-09/D-10]

**Warning sign:** Credit-Entscheidung lautet nur `reviewerMemberID != nil`. [VERIFIED: derived verification criterion]

### Pitfall 5: First decision exists only in a domain UPDATE

**What goes wrong:** Spätere Adapter liefern unterschiedliche Status-/Fehlersemantik; ein Domain-Update kann 0 Rows als NotFound statt Conflict melden. [VERIFIED: current Anime Confirm/Reject behavior]

**How to avoid:** Generic immutable Decision-Unique ist stabiler Arbiter; Domainadapter muss zusätzlich genau-eine bedingte Mutation beweisen. [VERIFIED: D-06]

**Warning sign:** Kein Unique-Vertrag auf Source+Revision oder Handlertext „nicht gefunden oder bereits bearbeitet“. [VERIFIED: current handler]

### Pitfall 6: Delegation bypasses or duplicates the Permission Engine

**What goes wrong:** Media-artige booleans werden direkt im Handler geprüft, Capability-Katalog/Cache kennt sie nicht, und Delegationsschutz driftet. [VERIFIED: current media permission seam]

**How to avoid:** Direct Review-Grants als zusätzliche Actionquelle innerhalb `permissions.Service` auswerten. [VERIFIED: D-01/D-02]

**Warning sign:** `if customPerm.CanReview` außerhalb `permissions` oder Grant von `members.manage`. [VERIFIED: derived verification criterion]

### Pitfall 7: Free reason leaks into immutable structured metadata

**What goes wrong:** Retention löscht die Kindzeile, aber derselbe Text bleibt in JSON, Logs oder Errorstrings erhalten. [VERIFIED: D-12 threat]

**How to avoid:** Reason-Typ akzeptiert Freitext nur für `review_reason_texts`; Audit/Decision speichern ausschließlich `has_reason`. Keine Logausgabe des Textes. [CITED: https://cornucopia.owasp.org/taxonomy/asvs-4.0.3/07-error-handling-and-logging/01-log-content]

**Warning sign:** `Payload: map[string]any{"reason": reason}` oder `%q` mit Reason im Log. [VERIFIED: derived verification criterion]

### Pitfall 8: Migration Down destroys real audit/ledger history

**What goes wrong:** Down droppt Reviewtabellen oder Rule-Seed trotz vorhandener Decisions/Awards. [VERIFIED: AGENTS destructive migration stop condition]

**How to avoid:** Daten-/Ledger-Precondition vor jedem Drop/Delete; leerer Up→Down→Up-Test und belegter fail-closed Down-Test mit Fixture-Daten. [VERIFIED: existing Phase-106 migration-test pattern]

**Warning sign:** Unbedingtes `DROP TABLE ... CASCADE` oder Rule-Delete ohne Ledgerprüfung. [VERIFIED: derived migration-review criterion]

## Code Examples

### Decision orchestration

```go
// Source: project PointService InTx pattern + PostgreSQL transaction guidance
func (s *ReviewService) Decide(ctx context.Context, actor permissions.Actor, cmd DecideCommand) (*Decision, error) {
    tx, err := s.starter.Begin(ctx)
    if err != nil { return nil, err }
    defer tx.Rollback(ctx)

    adapter, ok := s.adapters[cmd.Target.SourceType]
    if !ok { return nil, ErrReviewTargetNotFound }

    target, err := adapter.LoadForDecision(ctx, tx, cmd.Target)
    if err != nil { return nil, err }
    // tx-bound permission + reviewer member + self-review checks
    // insert unique decision, then domain mutation and immutable audit/reason
    // adapter.ApplyDecision with expected revision/pending
    // source-scoped credit slot; then PointService.CreditInTx for normal reviewer

    if err := tx.Commit(ctx); err != nil { return nil, err }
    return decision, nil
}
```

`DecideCommand` enthält nur Target-Ref, Confirm/Reject, bei Reject eine strukturierte Kategorie plus Unicode-nichtleeren Reject-Grund sowie bei Plattform-Self-Review expliziten Override-Intent plus Unicode-nichtleeren Override-Grund; keine Gruppe, Revision, Member, Rule, Punkte oder Idempotenz. [VERIFIED: D-02/D-06/D-08/D-12/D-14]

### Atomic conditional adapter mutation

```sql
-- Source: required adapter contract; concrete table belongs to Phase 107.1/108
UPDATE domain_owned_table
SET review_state = $decision,
    review_revision = review_revision,
    reviewed_at = $now
WHERE stable_id = $id
  AND review_revision = $expected_revision
  AND review_state = 'pending'
RETURNING stable_id;
```

Ein leeres Ergebnis ist `ErrReviewTargetNotPending`; es darf nicht als erfolgreicher idempotenter Retry behandelt werden. [VERIFIED: D-06; CITED: https://www.postgresql.org/docs/16/transaction-iso.html]

### Source-global credit slot

```sql
-- Source: recommended D-15 enforcement using PostgreSQL xact advisory locks
SELECT pg_advisory_xact_lock(
    hashtextextended('review-credit-v1|' || $1 || '|' || $2 || '|' || $3, 0)
);

-- Recheck under the lock. Only an empty result proceeds to PointService.CreditInTx.
SELECT id
FROM review_credit_slots
WHERE source_type = $1 AND source_key = $2 AND credit_slot = $3;

INSERT INTO review_credit_slots (
    source_type, source_key, credit_slot,
    reviewer_member_id, point_ledger_entry_id, created_at
)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (source_type, source_key, credit_slot) DO NOTHING
RETURNING id;
```

Der produktive Service serialisiert denselben Slot, ruft PointService vor diesem finalen Linkinsert genau einmal und rollt bei jedem Fehler die gesamte Transaktion zurück; Unique bleibt die unabhängige DB-Grenze. Hashkollisionen führen nur zu zusätzlicher Serialisierung, weil Identität und Vergabe weiterhin durch die vollständigen Textspalten plus Unique-Constraint bestimmt werden. [VERIFIED: D-15, Phase-106 caller-owned Tx pattern; CITED: https://www.postgresql.org/docs/16/explicit-locking.html]

## State of the Art

| Existing/old approach | Required current approach | Impact |
|---|---|---|
| `members.manage` für alle Anime-Proposal-Reviews | Typisierte `review.text/image/contribution.decide`-Actions | Least privilege und klare Delegation je Beitragstyp. [VERIFIED: current handler vs D-01] |
| Handler -> Repository UPDATE -> best-effort Audit | Ein ReviewService-Tx für Permission, Decision, Domain, Audit und Points | Keine halben Entscheidungen. [VERIFIED: current handler vs D-11] |
| 0 Rows -> „nicht gefunden oder bearbeitet“ | stabiler `ErrReviewAlreadyDecided`/409 | Parallele Verlierer sind deterministisch. [VERIFIED: D-06] |
| Optionaler `review_note` in Domaintabelle | separater scrub-fähiger Reason-Text | Retention ohne Verlust strukturierter Spur. [VERIFIED: D-12] |
| PointService-Key als einzige Deduplizierung | PointService plus source-globaler Credit-Slot | Maximal ein Reject- und ein Confirm-Credit über Reviewer hinweg. [VERIFIED: key audit] |
| Konkrete Anime-Review-Schnittstelle | registry-bound Domainadapter | Release-/Media-/Anime-Ownership bleibt getrennt. [VERIFIED: Phase Boundary] |

**Deprecated/outdated:** Frühere Annahmen eines `review_assignments`-/Reservation-Modells, eines einzigen pauschalen Review-Rechts, eines direkten Anime-Consumer-Wirings oder eines global ausreichenden PointService-Keys sind für den genehmigten Split falsch. [VERIFIED: D-01/D-05/D-15, current PointService]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| — | Keine `[ASSUMED]`-Claims. Empfehlungen sind aus gelockten Entscheidungen, aktuellem Code/Schema oder Primärdokumentation abgeleitet. | all | — |

## Open Questions (RESOLVED)

1. **Ablehnungs- und Override-Gründe sind vollständig entschieden.**
   - Jede Reject-Aktion verlangt im Core eine strukturierte, kanonische Ablehnungskategorie und einen Unicode-nichtleeren Freitextgrund.
   - Ein Plattform-Self-Review-Override verlangt zusätzlich unabhängig von Confirm oder Reject einen Unicode-nichtleeren Override-Grund.
   - Ablehnungs- und Override-Gründe werden als getrennte Reason-Zwecke gespeichert; Kategorie und `has_reason` bleiben strukturiert, die Freitexte bleiben gezielt löschbar. [VERIFIED: D-08/D-12, P1071-SC4]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---:|---|---|
| Go | Build/Unit-Tests | ✓ | 1.26.1; Modulziel 1.25.0 | — [VERIFIED: local probe] |
| Git | Diff-/Migrationsaudit | ✓ | 2.41.0.windows.1 | — [VERIFIED: local probe] |
| Docker CLI | PostgreSQL-Testdatenbank | ✓ | 29.6.1 | CLI allein reicht nicht. [VERIFIED: local probe] |
| Docker Compose | PostgreSQL-Testdatenbank | ✓ | v5.2.0 | — [VERIFIED: local probe] |
| Docker daemon | PostgreSQL-Testdatenbank | ✗ | nicht erreichbar | Docker Desktop/Daemon starten. [VERIFIED: `docker compose ps` 2026-07-23] |
| Host `psql` | Alternative DB-Prüfung | ✗ | — | kein lokaler Fallback. [VERIFIED: `Get-Command psql`] |
| PostgreSQL auf 127.0.0.1:5433 | Live-Migration/Concurrency | ✗ | Port geschlossen | Compose-Dienst nach Daemon-Start. [VERIFIED: `Test-NetConnection`] |

**Missing dependencies with no current fallback:** Ein laufendes PostgreSQL-16-Testziel fehlt derzeit; echte Migration-/Parallelitäts-Gates sind blockiert, bis der Docker-Daemon und der Compose-DB-Dienst laufen. [VERIFIED: environment audit]

**Missing dependencies with fallback:** Host-`psql` bleibt entbehrlich, sobald der Compose-Container läuft; `docker compose exec ... psql/createdb/dropdb` ist das etablierte Phase-106-Muster. [VERIFIED: Phase-106 plans/summaries and testsupport]

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | Go `testing` + testify v1.9.0. [VERIFIED: `backend/go.mod`] |
| Config file | `backend/go.mod`; kein separates Testconfig-File. [VERIFIED: repo inventory] |
| Quick run command | `cd backend; go test ./internal/permissions ./internal/repository ./internal/services -run 'TestPhase107' -count=1` |
| Full suite command | `cd backend; go test ./...` |
| Live DB gate | dedizierte `team4s_phase107_test_*`-Datenbank, isoliertes Schema, Up→Down→Up + Concurrency; niemals `team4s_v2`. [VERIFIED: Phase-106 guard pattern, AGENTS] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| P107-SC1 | Drei Actions; Fansub-Lead/Plattform-Admin erlaubt; direkte Grants gruppenbegrenzt; Delegierter kann nicht delegieren; Ziel aktiv+verified. | permission + repository integration | `go test ./internal/permissions ./internal/repository -run 'TestPhase107.*(Capability|Delegation)' -count=1` | ❌ Wave 0 |
| P107-SC2 | Zwei parallele Confirm/Rejects derselben Revision: genau ein Commit, ein stabiler Conflict, keine Assignment-Spalte/-Tabelle. | PostgreSQL concurrency + boundary | `go test ./internal/repository ./internal/services -run 'TestPhase107.*(FirstDecision|Concurrent|NoAssignment)' -count=1` | ❌ Wave 0 |
| P107-SC3 | Self-review normal denied über App-User oder membership-unabhängigen verified Member; Plattform ohne Member erlaubt, Match-Override nur mit Grund; alle Plattformpfade ohne Credit/Badge. | authz + service unit + integration | `go test ./internal/repository ./internal/services -run 'TestPhase107.*(VerifiedActorIdentity|SelfReview|PlatformAdmin|Override)' -count=1` | ❌ Wave 0 |
| P107-SC4 | Tatsächliche Mutation besitzt immutable Audit; Grant/Revoke-No-op nicht; Reject hat Kategorie+Pflichtgrund, Override eigenen Pflichtgrund; Read erzeugt null Auditzeilen. | migration + repository + service integration | `go test ./internal/migrations ./internal/repository ./internal/services -run 'TestPhase107.*(Audit|NoOpAudit|RejectionCategory|Reason|ReadBoundary)' -count=1` | ❌ Wave 0 |
| P107-SC5 | Same reviewer retry, different reviewer, repeated reject across revisions und later confirm: max 1 Reject + 1 Confirm; nur PointService schreibt Ledger. | PostgreSQL concurrency + service boundary | `go test ./internal/repository ./internal/services -run 'TestPhase107.*(CreditSlot|PointService|Retry)' -count=1` | ❌ Wave 0 |
| P107-SC6 | Fake-Adapter-Vertrag; keine Release-/Media-/Anime-/Handler-/UI-Verdrahtung. | service contract + source boundary | `go test ./internal/services -run 'TestPhase107.*(Adapter|Boundary)' -count=1` | ❌ Wave 0 |

### Required concurrency and rollback scenarios

- Confirm vs Reject derselben Source+Revision starten über Barrier gleichzeitig; exakt eine Decision, eine Domainmutation, ein Audit-Decision-Event und höchstens ein Credit committen. [VERIFIED: D-06]
- Loser ist unabhängig von Actor/Decision immer `ErrReviewAlreadyDecided`; kein PointService-Call und keine committed Audit-/Reason-Zeile. [VERIFIED: D-06]
- Zwei Reject-Zyklen derselben StableSource mit unterschiedlichen Reviewer-Members erzeugen zwei Decision-Zeilen, aber nur einen Reject-Credit-Slot/Ledger-Award. [VERIFIED: D-15]
- Reject, Resubmit-Revision, Confirm erzeugen genau je einen Reject-/Confirm-Slot; Bearbeitung ändert den StableKey nicht. [VERIFIED: D-15/D-16]
- Zwei unterschiedliche StableKeys desselben Releasekontexts erzeugen unabhängige Slots/Awards. [VERIFIED: D-16]
- Plattform-Admin mit vorhandener Member-Zuordnung bleibt als Reviewer punktelos; ein Domain-Arbeitscredit für den Einreicher bleibt möglich. Override-Grund wird separat gespeichert und ist löschbar. [VERIFIED: D-09/D-12]
- PointService-/Audit-/Adapterfehler nach Decision-Insert rollt Decision, Domainmutation, Reason und Slot vollständig zurück. [VERIFIED: caller-owned Tx pattern]
- Grant/Revoke und eine Direct-Grant-Decision auf derselben Membership beweisen die definierte Lock-/Linearization-Semantik; wiederholter Grant und Revoke-missing erhöhen den Auditcount nicht. [VERIFIED: D-07/D-11; CITED: https://www.postgresql.org/docs/16/explicit-locking.html]
- Direkte SQL-UPDATE/DELETE/TRUNCATE gegen Decision/Audit/Credit-Slot scheitern; DELETE des Reason-Kindes gelingt ohne Änderung des Parent-Audits. [VERIFIED: D-11/D-12/D-15]
- Down mit Fixturedaten scheitert vor Drop; leerer Up→Down→Up-Pfad ist grün. [VERIFIED: AGENTS migration safety]

### Sampling Rate

- **Per task commit:** fokussiertes `TestPhase107...` im betroffenen Paket. [VERIFIED: existing Go test workflow]
- **Per wave merge:** alle Phase-107-Pakete plus `git diff --check`. [VERIFIED: AGENTS]
- **Phase gate:** vollständiges `go test ./...`, `go vet ./...`, echtes PostgreSQL-16-Up→Down→Up und Barrier-Concurrency-Gate; kein Skip erlaubt. [VERIFIED: AGENTS, Phase-106 established gate]

### Wave 0 Gaps

- [ ] `backend/internal/testsupport/phase107_postgres.go` — dünner phasenspezifischer Wrapper über extrahierten bestehenden sicheren Guard; keine Guard-Duplikation. [VERIFIED: current testsupport inventory]
- [ ] `backend/internal/migrations/phase107_review_foundation_test.go` — Actions, Tabellen, Unique-/immutability-/Reason-/Down-Verträge. [VERIFIED: existing migration test pattern]
- [ ] `backend/internal/permissions/*phase107*test.go` — typed Action, direct grant, group/platform/delegation-chain cases. [VERIFIED: existing permission tests]
- [ ] `backend/internal/repository/review_*_test.go` — delegation, audit, decision, credit-slot concurrency. [VERIFIED: existing repository test pattern]
- [ ] `backend/internal/services/review_service_test.go` — adapter, identity, override, transaction, PointService-call-count. [VERIFIED: existing PointService tests]
- [ ] Docker daemon/Compose PostgreSQL 16 starten, bevor das Live-Gate als bestanden markiert wird. [VERIFIED: environment audit]

## Security Domain

### Applicable ASVS Categories

Die Zuordnung verwendet OWASP ASVS **5.0.0**, den aktuellen stabilen Stand; ASVS 5 hat die Kapitelnummern gegenüber 4.0.3 geändert. [CITED: https://owasp.org/www-project-application-security-verification-standard/; CITED: https://github.com/OWASP/ASVS/tree/v5.0.0_release/5.0/en]

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Validation and Business Logic | ja | Trusted Service validiert Registry-SourceType, StableKey, Revision, Decision/Kind und globale Credit-Limits; gesamter Entscheid ist transaktional und serialisiert. [VERIFIED: adapter/PointService contracts; CITED: https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x11-V2-Validation-and-Business-Logic.md] |
| V4 API and Web Service | indirekt | Phase 107 eröffnet keinen HTTP-Vertrag; der spätere Caller darf Actor, Gruppe, Member, Rule, Wert oder Key nicht als Autorität liefern. [VERIFIED: Phase Boundary, API contract rules] |
| V6 Authentication | indirekt | Actor ausschließlich aus bestehendem Auth-/Permission-Kontext; kein Client-Actor und kein neuer Authpfad. [VERIFIED: `permissionActorFromContext`, auth rules] |
| V7 Session Management | nein in Phase 107 | Kein Browser-/Session-Change; spätere UI nutzt den zentralen Refresh-Seam. [VERIFIED: `docs/frontend/auth-api-client.md`] |
| V8 Authorization | ja | Tx-gebundene Permission Engine, typisierte Actions, Gruppenscope, aktive bestätigte Membership und globaler Plattform-Bypass; Änderungen gelten an der Membership-Linearization. [VERIFIED: D-01..D-03; CITED: https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x17-V8-Authorization.md] |
| V11 Cryptography | nein | Keine neue kryptografische Funktion oder Hash-Deduplizierung; Advisory-Key dient nur der Lock-Verteilung, nicht als Identitäts-/Sicherheitsbeweis. [VERIFIED: phase scope and canonical decision] |
| V14 Data Protection | ja | Freitextgrund getrennt und später löschbar; strukturierte Auditspur bleibt ohne kopierten Grund erhalten. [VERIFIED: D-12; CITED: https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x23-V14-Data-Protection.md] |
| V16 Security Logging and Error Handling | ja | Strukturierte unveränderliche Mutationsevents; kein Freitextgrund in Logs/Payload; reine Reads unprotokolliert. [VERIFIED: D-11/D-12; CITED: https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x25-V16-Security-Logging-and-Error-Handling.md] |

### Known Threat Patterns for Go/PostgreSQL Review Core

| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| Caller spoofed group/member/source kind | Spoofing | Nur Ref annehmen; Registry-Adapter löst Group/Author/Member/Revision serverseitig. [VERIFIED: D-02/D-14] |
| Delegated reviewer delegates onward | Elevation of privilege | Direct grant enthält nur decide-Action; mutation requires `members.manage`/platform admin. [VERIFIED: D-02] |
| Cross-group grant or decision | Elevation of privilege | Target membership and adapter target group must equal authorized group in same Tx. [VERIFIED: D-02] |
| Self-review through alternate identity | Elevation of privilege | App-User plus alle membership-unabhängig tx-bound aufgelösten verified Member-Claims vergleichen; platform ohne Member erlaubt, verified Match nur mit begründetem Override. [VERIFIED: D-08/D-17] |
| Concurrent double decision | Tampering | Unique Source+Revision + adapter conditional update + real barrier test. [CITED: https://www.postgresql.org/docs/16/sql-insert.html; CITED: https://www.postgresql.org/docs/16/transaction-iso.html] |
| Multiple reviewers farm same reject slot | Tampering | Source+Slot-Xact-Lock und Recheck vor dem Review-PointService-Aufruf; source-globaler Unique-Slot bleibt DB-Arbiter. [VERIFIED: D-15 and key gap; CITED: https://www.postgresql.org/docs/16/explicit-locking.html] |
| Platform admin receives reviewer reward | Elevation of privilege | Hard branch skips Review-Slot, Review-Credit und Badges auch bei vorhandenem Member; Domain-Arbeitscredit des Einreichers ist ein separater Pfad. [VERIFIED: D-09/D-10] |
| Audit omitted on partial failure | Repudiation | Audit is mandatory in caller Tx; no best-effort writes. [VERIFIED: D-11] |
| Reason survives privacy scrub elsewhere | Information disclosure | Reason only in child table; never log or JSON-payload it. [VERIFIED: D-12; CITED: https://cornucopia.owasp.org/taxonomy/asvs-4.0.3/07-error-handling-and-logging/01-log-content] |
| Audit/history deleted by parent cleanup or Down | Repudiation / Tampering | Snapshot IDs, no cascade on immutable history, fail-closed Down preconditions. [VERIFIED: D-07/D-11, AGENTS] |
| Read surveillance | Information disclosure | Keine Auditmutation in Read-Pfaden; source boundary test. [VERIFIED: D-11] |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/107-best-tigung-delegation-und-ablehnungslebenszyklus/107-CONTEXT.md` — locked scope, D-01..D-17, downstream boundaries. [VERIFIED: local file]
- `.planning/ROADMAP.md` Phase 107 and `.planning/REQUIREMENTS.md` P107-SC1..SC6 — goal and success criteria. [VERIFIED: local files]
- `.planning/notes/260722-member-gamification-DECISION.md` — canonical member identity, four-eyes and point rules. [VERIFIED: local file]
- Phase 106 context, research, all four plans/summaries, migrations 0131–0133 and implemented repositories/services/tests — actual PointService/Ledger contract and later hardening. [VERIFIED: local files/code]
- `backend/internal/permissions/permissions.go`, `backend/internal/repository/authz*.go`, migrations 0073/0081/0104/0108/0110/0112 — current permission, member and direct-permission seams. [VERIFIED: code/migrations]
- `backend/internal/handlers/contribution_review_handler.go`, `backend/internal/repository/anime_contributions_proposal_repository.go`, migration 0075 and `audit_logs.go` — current review/audit gaps and analogs. [VERIFIED: code/migrations]
- `AGENTS.md`, domain/implementation/API/auth docs and project skill — hard project constraints. [VERIFIED: local files]
- Context7 `/jackc/pgx` — transaction begin/commit/rollback and pool/Tx pattern. [CITED: https://github.com/jackc/pgx/blob/master/_autodocs/README.md]
- PostgreSQL 16 official docs — transaction isolation, row locks, unique indexes, INSERT/ON CONFLICT and transactional triggers. [CITED: https://www.postgresql.org/docs/16/transaction-iso.html; CITED: https://www.postgresql.org/docs/16/explicit-locking.html; CITED: https://www.postgresql.org/docs/16/indexes-unique.html; CITED: https://www.postgresql.org/docs/16/sql-insert.html; CITED: https://www.postgresql.org/docs/16/trigger-definition.html]
- OWASP ASVS 5.0.0 official project and stable chapter sources — validation/business logic, authorization, data protection, logging/error handling and current numbering. [CITED: https://owasp.org/www-project-application-security-verification-standard/; CITED: https://github.com/OWASP/ASVS/tree/v5.0.0_release/5.0/en]
- OWASP ASVS 4.0.3 Cornucopia log-content guidance — supplementary reason-text/log minimization detail only, not current chapter numbering. [CITED: https://cornucopia.owasp.org/taxonomy/asvs-4.0.3/07-error-handling-and-logging/01-log-content]

### Secondary (MEDIUM confidence)

- Keine sekundären Quellen verwendet. [VERIFIED: research log]

### Tertiary (LOW confidence)

- Keine unbestätigten Webquellen oder Training-only Behauptungen verwendet. [VERIFIED: research log]

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — lokale Pins/Hosttools und offizielle pgx/PostgreSQL-Dokumentation geprüft. [VERIFIED: probes and cited docs]
- Architecture: HIGH — aus D-01..D-17, aktuellem Permission-/Point-/Audit-Code und PostgreSQL-Transaktionssemantik abgeleitet. [VERIFIED: cited local/official sources]
- Migration safety: HIGH — aktuelle Kette, Trigger und Dirty-Worktree geprüft; Live-DB-Ausführung bleibt umgebungsbedingt ausstehend. [VERIFIED: local audit]
- Pitfalls: HIGH — zentrale Lücken sind direkt im aktuellen Code sichtbar, insbesondere beneficiary-scoped Point-Key und best-effort Audit. [VERIFIED: source audit]
- Environment: HIGH — Toolversionen, Docker-Daemon, Host-psql und Portzustand lokal geprüft. [VERIFIED: probes 2026-07-23]

**Research date:** 2026-07-23
**Valid until:** 2026-07-30; früher erneut prüfen, falls Migration 0134 anderweitig belegt, Phase-106-PointService geändert oder Phase-107-Kontext erneut gesplittet wird. [VERIFIED: fast-moving dirty planning state]
