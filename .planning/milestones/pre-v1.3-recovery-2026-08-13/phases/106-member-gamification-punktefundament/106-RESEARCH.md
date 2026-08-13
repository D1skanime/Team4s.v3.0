# Phase 106: Beitrags- und Punktefundament — Research

**Researched:** 2026-07-22
**Domain:** Member-zentriertes, append-only Punktebuch mit versioniertem Regelkatalog auf Go/PostgreSQL
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

**Quelle:** Die folgenden Grenzen, Entscheidungen und offenen Punkte sind aus `106-CONTEXT.md` übernommen. [VERIFIED: `.planning/phases/106-member-gamification-punktefundament/106-CONTEXT.md`]

### Phase Boundary

Phase 106 schafft ausschließlich das fachliche und technische Fundament für bestätigungsgebundene Member-Punkte:

- stabile Member-Identität als Begünstigter
- optionaler App-User als handelnder Akteur
- versionierter, fester Punktekatalog
- auditierbares und idempotentes Punktebuch
- nachvollziehbare Stornierungen

Die Phase bindet noch nicht alle Beitragsquellen an, baut noch keine Ranglisten-UI und verändert keine bestehenden Medien-/Uploadsysteme.

### Locked Decisions

#### D-01 Punkte gehören zum Member

`members` ist die fachliche Identität für Verdienste. Ein Account ist nicht erforderlich. Claims verbinden später einen Account mit derselben Identität.

#### D-02 Historische Leistung zählt vollständig

Bestätigte historische Fansub-Arbeit wird später mit denselben Werten wie neue gleichartige Arbeit rückwirkend anerkannt.

#### D-03 Nur bestätigte Beiträge zählen

Upload, Entwurf oder Selbstangabe erzeugen keine Punkte. Die Review-/Capability-Regeln werden in Phase 107 vollständig umgesetzt.

#### D-04 Feste, versionierte Punktwerte

Prüfer vergeben keine individuelle Punktzahl. Änderungen am Katalog dürfen alte Buchungen nicht still verändern.

#### D-05 Vier-Augen-Prinzip

Eigene Beiträge dürfen nicht selbst bestätigt werden. Plattform-Admin-Override bleibt als auditierbare Ausnahme.

#### D-06 Review kann selbst ein Beitrag sein

Eine legitime Prüfung darf später kleine feste Punkte erzeugen. Bestätigung und Ablehnung müssen gleich gewichtet sein.

#### D-07 Profilpflege ohne Punkte

Profilpflege erzeugt nur mögliche automatische Badges, keine Punkteereignisse.

#### D-08 Keine Inhaltsmengen- oder Kopierbewertung

Textlänge, Datei-Hash und Copy-and-paste-Erkennung bestimmen keine Punkte. Qualität wird durch berechtigte Prüfung abgesichert.

#### D-09 Kein Medienumbau

`media_assets`, `media_files` und alle kontextspezifischen Relationen/Uploads bleiben bestehen. Phase 106 darf sie nicht ersetzen, vereinheitlichen oder entfernen.

#### D-10 Abgelehnte Inhalte

Der in Phase 107 zu implementierende Retention-Default beträgt 90 Tage in Produktion und 5 Stunden lokal. Automatisierte Tests verwenden kontrollierte Zeit.

### the agent's Discretion

`CONTEXT.md` enthält keinen ausdrücklich so benannten Ermessensabschnitt; der Forschungsauftrag besteht darin, für das eng abgegrenzte Fundament bestehende Muster zu ermitteln und eine Empfehlung zu geben. [VERIFIED: `.planning/phases/106-member-gamification-punktefundament/106-CONTEXT.md`]

### Required Research Before Planning

1. Aktuelles Schema und aktuelle Migrationen für `members`, `member_claims`, `member_badges`, `anime_contributions`, Release-Rollen und Audit-Seams inventarisieren.
2. Prüfen, ob bereits ein generisches Ledger-/Event-/Rule-Katalog-Muster existiert, das fachlich wiederverwendbar ist.
3. Alle späteren Quellen nach Member-ID, Actor-ID, Reviewstatus, Gruppen-/Release-Scope und Zeitstempel klassifizieren.
4. Eine fachliche Idempotency-Key-Strategie entwerfen, ohne Datei-Hash-Deduplizierung.
5. Stornierungs-, Regelversions- und historische Importsemantik definieren.
6. Contract-, Repository-, Migration-up/down- und Concurrency-Testmuster im Bestand identifizieren.
7. Exakte Abgrenzung zu `member_badges` und den bestehenden Fansub-Gruppenerfolgen dokumentieren.

### Deferred Ideas (OUT OF SCOPE)

- konkrete Punktwerte und Gewichtung der Beitragstypen
- ob Gesamtpunkte nur summiert oder zusätzlich in getrennten Hauptwertungen dargestellt werden
- exakte Wirksamkeitszeit für historische Imports
- Umgang mit aktiven `app_users` ohne bestätigte Member-/Claim-Verknüpfung
- Badge-Katalog und Badge-Stufen
- Schwellen und Missbrauchsschutz für Prüfer-Badges
</user_constraints>

## Summary

Die Phase braucht keinen neuen Event-Bus und keinen Umbau vorhandener Beitrags- oder Medienmodelle. Im Bestand existiert noch kein fachliches Punktebuch; die nächsten belastbaren Analogien sind die transaktionsfähige `DBTX`-Naht der Audit-Logs, der transaktionale Proposal-Merge mit PostgreSQL-Advisory-Lock und `ON CONFLICT DO NOTHING`, der versionierte Capability-Katalog und der partielle Unique-Index für einmalige Gruppenereignisse. Keines dieser Modelle erfüllt allein die Punkteanforderungen. [VERIFIED: `backend/internal/repository/audit_logs.go`, `backend/internal/repository/anime_contributions_proposal_merge_repository.go`, `database/migrations/0108_capability_registry.up.sql`, `database/migrations/0128_group_history_single_use_events.up.sql`; `rg`-Inventar vom 2026-07-22]

Der kleinste passende Schnitt sind zwei additive Tabellen und ein interner Go-Service: ein unveränderlicher, versionierter `point_rules`-Katalog sowie append-only `point_ledger_entries`. Der Ledger referenziert zwingend `members`, optional `app_users`, speichert Regelcode, Regelversion und den angewandten Punktewert als Snapshot, trennt fachliche Wirksamkeitszeit von Buchungszeit und erzwingt die Einmaligkeit eines serverseitig erzeugten semantischen Idempotenzschlüssels in PostgreSQL. Storno bedeutet eine neue negative Gegenbuchung; Award-Zeilen werden weder aktualisiert noch gelöscht. [VERIFIED: `.planning/notes/260722-member-gamification-DECISION.md`; CITED: https://www.postgresql.org/docs/current/indexes-unique.html; CITED: https://www.postgresql.org/docs/current/sql-insert.html]

Phase 106 darf noch keine bestehende Quelle automatisch bepunkten. Der heutige Confirm-Flow nutzt lediglich `fansub_group.members.manage`, bindet das Repository-Update nur an Beitrags-ID und Status und besitzt noch keinen Self-Review-Guard; außerdem haben die vier bestätigten Live-Beiträge weder `confirmed_by` noch `review_status_id`. Review-Autorisierung gehört deshalb in Phase 107, Quellenadapter in Phase 108 und der historische Backfill in Phase 109. [VERIFIED: `backend/internal/handlers/contribution_review_handler.go`, `backend/internal/repository/anime_contributions_proposal_repository.go`, Live-PostgreSQL-Inventar vom 2026-07-22; `.planning/ROADMAP.md`]

**Primary recommendation:** Phase 106 als reines Backend-Fundament planen: additive Migration, internes Rule-/Ledger-Repository, atomarer Point-Service und harte Migrations-/Idempotenz-/Concurrency-Verträge; keine HTTP-Schreibroute, kein Trigger aus bestehenden Reviews, kein Badge-, Ranglisten-, Medien- oder Upload-Change. [VERIFIED: `106-CONTEXT.md`, `.planning/ROADMAP.md`, `AGENTS.md`]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Member als Punkteinhaber | Database / Storage | API / Backend | Der zwingende FK auf `members` bewahrt die fachliche Identität; der Service validiert Befehle. [VERIFIED: `database/migrations/0044_members_releases_credits.up.sql`, `database/migrations/0105_anime_contributions_member_anchor.up.sql`] |
| Optionaler handelnder App-User | API / Backend | Database / Storage | Der authentifizierte Actor wird serverseitig bestimmt und optional als FK gespeichert; Clients dürfen ihn nicht frei setzen. [VERIFIED: `backend/internal/auth`, `backend/internal/handlers/contribution_review_handler.go`, `.planning/notes/260722-member-gamification-DECISION.md`] |
| Fester, versionierter Punktekatalog | Database / Storage | API / Backend | DB-Unique schützt `(rule_code, rule_version)`; der Service wählt die Regel und übernimmt deren Wert, nicht der Aufrufer. [CITED: https://www.postgresql.org/docs/current/indexes-unique.html; VERIFIED: `database/migrations/0108_capability_registry.up.sql`] |
| Idempotente Award-Buchung | Database / Storage | API / Backend | Ein Unique-Index ist der letzte Concurrency-Arbiter; Service/Repository liefern bei Retry das vorhandene Ergebnis zurück. [CITED: https://www.postgresql.org/docs/current/index-unique-checks.html; CITED: https://www.postgresql.org/docs/current/sql-insert.html] |
| Nachvollziehbare Stornierung | API / Backend | Database / Storage | Der Service sperrt und prüft die Originalbuchung; ein partieller Unique-Index erlaubt nur ein direktes Storno je Award. [CITED: https://www.postgresql.org/docs/current/explicit-locking.html; CITED: https://www.postgresql.org/docs/current/indexes-partial.html] |
| Review-Berechtigung/Vier-Augen-Prinzip | API / Backend | Database / Storage | Die bestehende Permission Engine bleibt Autorität; die vollständige Review-Verknüpfung ist Phase 107, nicht 106. [VERIFIED: `backend/internal/permissions/permissions.go`, `106-CONTEXT.md`, `.planning/ROADMAP.md`] |
| Quellenadapter | API / Backend | Database / Storage | Jede Domäne übersetzt ihren eigenen bestätigten Datensatz in einen typisierten Credit-Befehl; Umsetzung folgt in Phase 108. [VERIFIED: `.planning/ROADMAP.md`, `.planning/notes/260722-gamification-analysis-postmortem.md`] |
| Ranglisten und Badge-UI | API / Backend | Browser / Client | Aggregation und Darstellung folgen in Phase 109/110 und sind aus Phase 106 ausgeschlossen. [VERIFIED: `.planning/ROADMAP.md`, `106-CONTEXT.md`] |

### System Architecture Diagram

```text
                           Phase 107/108 (später)
 bestätigtes Domain-Ereignis ──> typisierter Quellenadapter
                                      │
                                      │ CreditCommand
                                      v
                               PointService (Phase 106)
                              /          |           \
                             /           |            \
                    Actor/Member      Regelwahl      Source-Key
                    validieren        serverseitig   serverseitig
                             \           |            /
                              \          v           /
                               PostgreSQL-Transaktion
                                  |             |
                                  v             v
                         point_rules      point_ledger_entries
                                               |
                     Duplicate? ── ja ─────────┤──> bestehende Buchung prüfen/zurückgeben
                         | nein                |
                         v                     |
                     Award schreiben           |
                                               v
 Storno-Befehl ──> Original `FOR UPDATE` ──> negative Gegenbuchung
                                               |
                                               v
                                  Phase 109/110 Aggregation/UI
```

Der Datenfluss ist eine Planempfehlung aus der verbindlichen Produktentscheidung und den vorhandenen pgx/PostgreSQL-Transaktionsmustern. [VERIFIED: `.planning/notes/260722-member-gamification-DECISION.md`, `backend/internal/repository/anime_contributions_proposal_merge_repository.go`; CITED: https://github.com/jackc/pgx/blob/master/_autodocs/transactions.md]

## Project Constraints (from AGENTS.md)

- Die Arbeit ist GSD-/Planungsarbeit; Phase 106 darf nicht vorweg implementiert werden. [VERIFIED: `AGENTS.md`]
- Anime und Episoden bleiben neutral; Fansub- und Release-Version-Kontext darf nicht an die falsche Entität gehängt werden. [VERIFIED: `AGENTS.md`, `docs/architecture/db-schema-fansub-domain.md`]
- `media_assets`, `media_files`, `release_version_media`, `release_media`, `fansub_group_media` und bestehende Upload-Flows bleiben unverändert; es darf keine parallele Medienlogik entstehen. [VERIFIED: `AGENTS.md`, `106-CONTEXT.md`]
- Vor neuen Komponenten, Services, Repository-Methoden, DTOs oder Endpoints müssen vorhandene Äquivalente gesucht und konkrete Analogdateien im Plan unter `read_first` aufgenommen werden. [VERIFIED: `AGENTS.md`, `docs/engineering/implementation-contract.md`, `.codex/skills/team4s-implementation-contract/SKILL.md`]
- Die Permission Engine bleibt die Autorität; normale UI-/API-Pfade dürfen keine parallele Rollenlogik einführen. [VERIFIED: `AGENTS.md`, `.planning/notes/260722-member-gamification-DECISION.md`]
- Falls ein HTTP-Vertrag geändert wird, müssen kanonische YAML-Verträge, Backend, `frontend/src/types/*`, `frontend/src/lib/api.ts` und fokussierte Contract-Tests im selben Change übereinstimmen. Phase 106 benötigt nach dieser Empfehlung keinen HTTP-Write-Contract. [VERIFIED: `AGENTS.md`, `docs/api/api-contracts.md`]
- Historische Migrationen werden nicht editiert; eine neue nummerierte Up/Down-Migration muss vor Erstellung gegen `git status` und ungetrackte Migrationen geprüft werden. [VERIFIED: `AGENTS.md`]
- Destruktive Migrationen und unklare persistierte Ownership sind Stop-Bedingungen; die vorgeschlagene Phase ist rein additiv. [VERIFIED: `AGENTS.md`, `106-CONTEXT.md`]
- Relevante Checks sind Typecheck/Compile, Lint, Tests, Build soweit machbar, Migration-Up/Down und `git diff --check`; bestehende Fremdfehler sind separat zu dokumentieren. [VERIFIED: `AGENTS.md`]
- Deutsche nutzerseitige Texte müssen korrekte Umlaute verwenden; Phase 106 plant keine UI-Texte. [VERIFIED: `AGENTS.md`, `106-CONTEXT.md`]

## Current Schema and Runtime Inventory

### Identity, contribution, audit, and achievement seams

| Seam | Current shape | Planning consequence |
|---|---|---|
| `members` | Stabile personenbezogene Identität; fünf Zeilen in der lokalen Live-DB. [VERIFIED: `database/migrations/0044_members_releases_credits.up.sql`, Live-PostgreSQL-Inventar vom 2026-07-22] | `point_ledger_entries.member_id` ist `NOT NULL`; ein Account ist keine Voraussetzung. [VERIFIED: `106-CONTEXT.md`] |
| `member_claims` | Verknüpft optional `app_users` mit `members`; lokal vier verifizierte und ein offener Claim. [VERIFIED: `database/migrations/0081_member_claims.up.sql`, `0094_member_claims_request_anchor.up.sql`, Live-PostgreSQL-Inventar vom 2026-07-22] | Claim-Auflösung ist nur nötig, wenn ein aktueller Actor als Begünstigter auftritt; historische Awards werden direkt auf Member gebucht. [VERIFIED: `.planning/notes/260722-member-gamification-DECISION.md`] |
| `member_badges` | Member-zentrierte, mutierbare Badge-Projektion mit Unique `(member_id, badge_code)`; lokaler Bestand drei aktive Zeilen. Repository und Service reaktivieren/widerrufen Zustände. [VERIFIED: `database/migrations/0087_anime_contribution_roles_badges.up.sql`, `backend/internal/repository/badge_repository.go`, `backend/internal/services/badge_service.go`, Live-PostgreSQL-Inventar vom 2026-07-22] | Nicht als Punktebuch wiederverwenden; Badges bleiben abgeleitete Auszeichnung, der Ledger bleibt append-only. [VERIFIED: `.planning/notes/260722-member-gamification-DECISION.md`] |
| `anime_contributions` | Direkter `member_id` ist seit 0105 Pflicht; historische Member-Relation ist nullable. Status, Actor-Felder, optionaler Reviewstatus sowie Gruppen-/Anime-/Release-Version-Scope sind vorhanden. [VERIFIED: `database/migrations/0105_anime_contributions_member_anchor.up.sql`, Live-PostgreSQL-Informationsschema vom 2026-07-22] | Stärkster späterer Quellenadapter; die Rollenunterzeilen brauchen einen eigenen fachlichen Slot im Idempotenzschlüssel. [VERIFIED: `anime_contribution_roles`-Schema, `.planning/ROADMAP.md`] |
| `release_member_roles` | PK `(release_id, member_id, role_id)`, `created_at`, aber kein Actor und kein Reviewstatus; lokal null Zeilen. Aktive Profil-/Contributor-Queries lesen die Tabelle weiterhin. [VERIFIED: `database/migrations/0044_members_releases_credits.up.sql`, `backend/internal/repository/member_profile_repository.go`, `backend/internal/repository/group_contributors_repository.go`, Live-PostgreSQL-Inventar vom 2026-07-22] | Historische Quelle für Phase 109, sobald die fachliche Bestätigungsregel entschieden ist; Leere der lokalen DB ist kein Löschbeleg. [VERIFIED: `.planning/notes/260722-gamification-analysis-postmortem.md`] |
| `audit_logs` | Generische Audit-Tabelle und `DBTX`-fähiges Repository; viele Handler schreiben Audit nach der Domainmutation best-effort. Lokal 258 Zeilen. [VERIFIED: `database/migrations/0075_audit_logs.up.sql`, `backend/internal/repository/audit_logs.go`, `backend/internal/handlers/contribution_review_handler.go`, Live-PostgreSQL-Inventar vom 2026-07-22] | Audit-Log ist Zusatztelemetrie, nicht das Punktebuch; Ledger-Award und Storno müssen selbst autoritativ und atomar sein. [VERIFIED: `.planning/notes/260722-member-gamification-DECISION.md`] |
| `fansub_group_history` | Gruppenzentrierte Timeline mit kuratierten Achievement-Ereignissen und partieller Einmaligkeitsregel. [VERIFIED: `database/migrations/0125_group_history_achievement_event_types.up.sql`, `database/migrations/0128_group_history_single_use_events.up.sql`, `backend/internal/repository/fansub_group_history_repository.go`] | Keine automatische Member-Punktequelle; Gruppenereignis und individuelle Leistung bleiben getrennte Domänen. [VERIFIED: `.planning/notes/260722-member-gamification-DECISION.md`] |

### Current migration state

Die höchste eingecheckte Migration ist aktuell `0130_release_content_source_groups`; weder `database/migrations` noch `backend/internal/migrations` hatten beim Audit modifizierte oder ungetrackte Dateien. Die lokale Datenbank meldete 130 angewandte Migrationen und keinen Repo-Rückstand. [VERIFIED: `Get-ChildItem`, `git status --short`, `git ls-files --others`, `schema_migrations`-Abfrage vom 2026-07-22]

Der Planner soll `0131` nur als voraussichtliche Nummer behandeln und unmittelbar vor Erstellung erneut `git status` plus ungetrackte Migrationen prüfen. [VERIFIED: `AGENTS.md`; aktueller Migrationsstand vom 2026-07-22]

### Documentation drift that must not drive the plan

`docs/architecture/db-schema-fansub-domain.md` beschreibt `anime_contributions` stellenweise noch über den historischen Group-Member-Anker; Migration 0105 und Runtime-Queries verwenden dagegen den direkten, nicht-nullbaren `member_id` als aktuellen Member-Anker und behalten `fansub_group_member_id` nur transitional/nullable. Für Phase 106 ist der aktuelle Migrations- und Runtime-Vertrag maßgeblich. [VERIFIED: `docs/architecture/db-schema-fansub-domain.md`, `database/migrations/0105_anime_contributions_member_anchor.up.sql`, Live-PostgreSQL-Informationsschema vom 2026-07-22; `docs/api/api-contracts.md`]

## Future Source Classification

| Candidate source | Beneficiary member | Actor | Confirmation/review evidence | Context | Effective-time candidate | Phase/use |
|---|---|---|---|---|---|---|
| `anime_contributions` + `anime_contribution_roles` | `anime_contributions.member_id` direkt. [VERIFIED: 0105 migration] | `created_by`, `confirmed_by` → `app_users`. [VERIFIED: Live FK/schema inventory] | `status`, `confirmed_at`, optional `review_status_id`; bestehende Live-Historie kann trotz `confirmed` leere Actor-/Reviewfelder haben. [VERIFIED: repository + Live-DB] | Fansubgruppe, Anime, optionale Release-Version, Rolle. [VERIFIED: current schema] | Neue Arbeit: bestätigter Zeitpunkt; historische Fallback-Regel bleibt offen. [VERIFIED: canonical decision] | Adapter Phase 108, Backfill Phase 109. [VERIFIED: ROADMAP] |
| `release_member_roles` | `member_id` direkt. [VERIFIED: 0044 migration] | Nicht vorhanden. [VERIFIED: current schema] | Kein Reviewstatus; semantisch bestehender Credit, aber Bestätigungsregel muss vor Import festgelegt werden. [VERIFIED: current schema; canonical decision] | Release + Rolle. [VERIFIED: current schema] | `created_at` vorhanden, aber historische Wirksamkeit nicht entschieden. [VERIFIED: current schema; CONTEXT open question] | Kandidat Phase 109, nicht 106. [VERIFIED: ROADMAP] |
| `release_version_notes` | `member_id` direkt. [VERIFIED: current schema] | `created_by_user_id`/`updated_by_user_id` referenzieren das ältere `users`-Modell, nicht `app_users`. [VERIFIED: Live FK inventory] | Publikationsstatus, aber kein `review_status_id`; `published` darf nicht ohne Entscheidung als Vier-Augen-Freigabe gelten. [VERIFIED: current schema; canonical decision] | Release-Version, Rolle, seit 0130 Fansubgruppe. [VERIFIED: 0130 migration] | `created_at`/`updated_at`; Freigabezeit fehlt. [VERIFIED: current schema] | Attribution/Review-Seam Phase 107/108. [VERIFIED: ROADMAP] |
| `release_version_media` + `media_assets` | Relation hat keinen Member; `media_assets.owner_member_id` ist optional und nicht automatisch Beitragsbegünstigter. [VERIFIED: current schema] | Uploadfelder referenzieren das ältere `users`-Modell. [VERIFIED: Live FK inventory] | Asset-Reviewstatus existiert, Relationsfreigabe und fachlicher Begünstigter sind aber nicht vollständig gekoppelt. [VERIFIED: current schema] | Release-Version + Fansubgruppe + Asset. [VERIFIED: 0130 migration] | Relation/Asset-Zeitstempel vorhanden. [VERIFIED: current schema] | Nur schmaler Adapter nach belegter Attribution; kein Medienumbau. [VERIFIED: D-09, postmortem] |
| `fansub_group_media` | Kein direkter Member. [VERIFIED: current schema] | Uploader im älteren `users`-Modell. [VERIFIED: Live FK inventory] | Kein eigener Reviewstatus auf der Relation. [VERIFIED: current schema] | Fansubgruppe + Asset. [VERIFIED: current schema] | `created_at` vorhanden. [VERIFIED: current schema] | Nicht awardfähig, bis Member-Attribution und Review belegt sind. [VERIFIED: D-03, D-09] |
| `anime_fansub_project_notes`, `fansub_group_notes` | Kein direkter Member. [VERIFIED: current schema] | Actor im älteren `users`-Modell. [VERIFIED: Live FK inventory] | Publikationsstatus ohne dedizierten Reviewstatus. [VERIFIED: current schema] | Anime/Fansubgruppe bzw. Fansubgruppe. [VERIFIED: current schema] | `created_at`/`updated_at`. [VERIFIED: current schema] | Spätere Plattformquelle erst nach Attribution/Review. [VERIFIED: canonical decision, ROADMAP] |
| `member_group_stories` | `member_id` direkt. [VERIFIED: current schema] | Actor im älteren `users`-Modell. [VERIFIED: Live FK inventory] | Publikationsstatus, kein dedizierter Reviewstatus. [VERIFIED: current schema] | Fansubgruppe + Member + Rolle. [VERIFIED: current schema] | `created_at`/`updated_at`. [VERIFIED: current schema] | Keine Punkte, weil Profil-/Storypflege laut D-07 nur Badge-Kandidat ist. [VERIFIED: D-07, canonical decision] |

## Standard Stack

### Core

| Library / platform | Version | Purpose | Why standard here |
|---|---:|---|---|
| Go | Modul `go 1.25.0`; installiert `go1.26.1` | Service-, Repository- und Migrationstests | Bestehender Backend-Stack; Phase 106 braucht keine neue Runtime. [VERIFIED: `backend/go.mod`, `go version`] |
| PostgreSQL | Compose `postgres:16`; live 16.13 | FKs, Checks, Unique- und Partial-Unique-Indexes, Transaktionen | Die fachliche Einmaligkeit muss unter Concurrency in der DB erzwungen werden. [VERIFIED: `docker-compose.yml`, Live `SELECT version()`; CITED: https://www.postgresql.org/docs/current/index-unique-checks.html] |
| pgx/v5 | v5.7.1, veröffentlicht 2024-09-10 | DB-Zugriff und Transaktionen | Bereits gepinnt; `pgx.Tx` stellt `Exec`, `QueryRow`, `Commit` und `Rollback` bereit. [VERIFIED: `backend/go.mod`, `go list -m -json`; CITED: https://github.com/jackc/pgx/blob/master/_autodocs/transactions.md] |

### Supporting

| Library / tool | Version | Purpose | When to use |
|---|---:|---|---|
| `testify` | v1.9.0, veröffentlicht 2024-02-29 | Assertions in vorhandenen Backendtests | Service-/Repository-Vertragstests gemäß Repo-Muster. [VERIFIED: `backend/go.mod`, `go list -m -json`, vorhandene `*_test.go`] |
| internes Migrations-CLI | Projektstand bei Migration 0130 | Up/Down/Status | Neue additive Migration und reversibler Smoke-Test. [VERIFIED: `backend/cmd/migrate`, `backend/internal/migrations/runner.go`] |
| Docker Compose | v5.2.0; Docker 29.6.1 | Lokales PostgreSQL 16 | DB-Status und isolierter Up/Down/Up-Smoke. [VERIFIED: environment audit 2026-07-22] |

### Alternatives Considered

| Instead of | Could use | Tradeoff |
|---|---|---|
| PostgreSQL-Unique als Idempotenz-Arbiter | Nur `SELECT`-then-`INSERT` im Go-Code | Verliert die Race-Sicherheit; nicht verwenden. [CITED: https://www.postgresql.org/docs/current/index-unique-checks.html] |
| Append-only Ledger | `member_badges` oder aggregierte Punktespalte auf `members` | Verliert Quelle, Regelversion und Stornohistorie; widerspricht dem kanonischen Entscheid. [VERIFIED: canonical decision, `badge_repository.go`] |
| Interner typisierter Service | Generisches öffentliches `POST /points` | Würde Member, Actor, Quelle oder Wert client-steuerbar machen und ohne aktuellen Consumer einen unnötigen Contract eröffnen; nicht verwenden. [VERIFIED: `docs/api/api-contracts.md`, canonical decision] |
| Zwei additive Tabellen | Universelles Event-/Medienmodell | Würde Domain-Ownership überschreiten und wiederholt den im Postmortem verworfenen Ansatz; nicht verwenden. [VERIFIED: postmortem, D-09] |

**Installation:** Keine neuen Pakete installieren und keine bestehenden Versionen im Zuge dieser Phase aktualisieren. [VERIFIED: vorhandener Stack deckt Transaktion, SQL und Tests ab]

## Architecture Patterns

### Recommended Project Structure

```text
database/migrations/
├── 0131_member_point_foundation.up.sql      # Nummer unmittelbar vor Erstellung erneut prüfen
└── 0131_member_point_foundation.down.sql
backend/internal/migrations/
└── phase106_member_points_test.go           # statischer Up/Down-/Ownership-Vertrag
backend/internal/repository/
├── point_rules_repository.go
├── point_ledger_repository.go
└── point_ledger_repository_test.go
backend/internal/services/
├── point_service.go
└── point_service_test.go
```

Diese Struktur folgt den vorhandenen Migration-/Repository-/Service-Grenzen und fügt bewusst weder Handler noch Frontenddateien hinzu. [VERIFIED: `backend/internal/migrations`, `backend/internal/repository`, `backend/internal/services`, ROADMAP phase boundary]

### Pattern 1: Immutable rule versions

**What:** `point_rules` erhält pro fachlichem `rule_code` monotone `rule_version`-Zeilen mit `category_code`, festem positivem `points`-Wert und `created_at`; Unique `(rule_code, rule_version)`. Es gibt keine produktive Update-/Delete-Methode. Der Ledger speichert zusätzlich Code, Version und Wert als Snapshot. [VERIFIED: canonical decision; CITED: https://www.postgresql.org/docs/current/indexes-unique.html]

**When to use:** Bei jedem Award übergibt der vertrauenswürdige Backend-Adapter einen expliziten `RuleRef{Code, Version}`; der Service lädt exakt diese Regel und übernimmt den Wert serverseitig. Eine spätere Wertänderung erzeugt eine neue Versionszeile und verändert alte Ledger-Zeilen nicht. [VERIFIED: D-04; Phase-106 resolution]

**Wichtig:** Konkrete Produktionswerte sind ausdrücklich offen. Die Migration soll Struktur und Constraints liefern, Tests dürfen Fixture-Regeln einfügen; produktive Seeds benötigen vor Phase 108 eine Benutzerentscheidung. [VERIFIED: `106-CONTEXT.md`, canonical decision]

### Pattern 2: Semantic idempotency key

**What:** Der serverseitige Key identifiziert die belohnbare fachliche Handlung, nicht deren Payload. Empfohlenes Format: `v1|<reward-kind>|<source-type>|<stable-source>|beneficiary:<member-id>|slot:<role-or-action>`. [VERIFIED: canonical decision]

**Examples:**

```text
v1|work|anime_contribution_role|contribution:42|beneficiary:7|slot:translator
v1|review|anime_contribution_review|decision:123|beneficiary:9|slot:decision
v1|work|release_member_role|release:55:member:7:role:3|beneficiary:7|slot:role:3
```

Regelversion und Punktewert gehören absichtlich nicht in den Key: Ein Katalogwechsel darf dieselbe fachliche Leistung nicht erneut belohnbar machen. Member und Slot gehören hinein, weil eine Quelle mehrere legitime Begünstigte oder Rollen haben kann. Datei-Hash, Textlänge und Inhaltskopie gehören nie hinein. [VERIFIED: D-04, D-08, canonical decision]

### Pattern 3: Insert-first idempotency with mismatch detection

**What:** `point_ledger_entries.idempotency_key` ist unique. Das Repository versucht `INSERT ... ON CONFLICT (idempotency_key) DO NOTHING RETURNING ...`; bei Konflikt lädt es die existierende Zeile und vergleicht Member, Quelle, Regel und Wert mit dem erwarteten Befehl. Identischer Retry liefert die vorhandene Buchung, abweichende Payload unter demselben Key ist ein harter Konflikt. [CITED: https://www.postgresql.org/docs/current/sql-insert.html; VERIFIED: `anime_contributions_proposal_merge_repository.go` als lokales Insert-/Conflict-Analog]

**When to use:** Für Live-Awards, spätere Quellenadapter und historische Batch-Retries. Ein optionaler transaktionsgebundener Advisory-Lock auf dem Key kann deterministische Konkurrenzabläufe vereinfachen, ersetzt aber den Unique-Index nicht. [VERIFIED: `anime_contributions_proposal_merge_repository.go`; CITED: https://www.postgresql.org/docs/current/explicit-locking.html]

### Pattern 4: Reversal as a new ledger entry

**What:** Eine Stornozeile referenziert `reverses_entry_id`, übernimmt Member/Regel/Scope des Awards, trägt exakt den negierten Punktewert und einen Pflichtgrund. Ein partieller Unique-Index auf `reverses_entry_id WHERE reverses_entry_id IS NOT NULL` erlaubt höchstens ein direktes Storno pro Award. [VERIFIED: canonical decision; CITED: https://www.postgresql.org/docs/current/indexes-partial.html]

**When to use:** Bei aufgehobener Bestätigung, Missbrauchskorrektur oder fachlicher Korrektur. Der Service lädt den Award mit `FOR UPDATE`, verbietet Selbstreferenz und Storno-von-Storno und schreibt die Gegenbuchung in derselben Transaktion. Eine legitime Neueinreichung erhält später eine neue fachliche Source-/Decision-ID. [CITED: https://www.postgresql.org/docs/current/explicit-locking.html; VERIFIED: canonical decision]

### Pattern 5: Effective time separated from recorded time

**What:** Jede Ledger-Zeile besitzt `effective_at` (fachliche Wirksamkeit) und `recorded_at` (Einfügezeit). Live-Awards verwenden später den bestätigten Entscheidungszeitpunkt; historische Adapter liefern einen vertrauenswürdigen fachlichen Zeitpunkt nach der noch offenen Phase-109-Regel. [VERIFIED: canonical decision, CONTEXT open questions]

**When to use:** Immer. Phase 106 muss die Spalten und Servicegrenze schaffen, aber keine historische Fallback-Zeit raten und keinen Import ausführen. [VERIFIED: ROADMAP phases 106/109]

### Recommended table contract

| Table | Required columns / constraints | Notes |
|---|---|---|
| `point_rules` | `id`, `rule_code`, `rule_version > 0`, `category_code`, `points > 0`, `created_at`; Unique `(rule_code, rule_version)` | Keine `updated_at`-Semantik und keine Update-/Delete-Repositorymethode; Werteänderung = neue Version. [VERIFIED: D-04] |
| `point_ledger_entries` | `id`, `entry_kind`, `member_id NOT NULL`, optional `actor_app_user_id`, `source_type`, `source_key`, `idempotency_key UNIQUE`, Rule-FK plus Snapshot `rule_code/rule_version/point_value`, `effective_at`, `recorded_at`, optionale `fansub_group_id`/`release_version_id`, optional `reverses_entry_id`, Stornogrund | Checks koppeln Award an positiven Wert/kein Reversal und Storno an negativen Wert/Reversal; Partial-Unique begrenzt Storno. [VERIFIED: canonical decision; CITED: PostgreSQL unique/partial-index docs] |

Optionale Actor-/Gruppen-/Release-Kontext-FKs verwenden `ON DELETE SET NULL`, während die stabile Source-ID im `source_key` erhalten bleibt; so löscht ein Domain-Cleanup keine historischen Buchungen. Die Consumer-Traces in `106-PATTERNS.md` bestätigen physische Gruppen- und Release-Version-Löschungen sowie das Audit-Analog für Actor-Nullung. [VERIFIED: `fansub_repository.go`, `episode_version_repository_write_helpers.go`, `0075_audit_logs.up.sql`]

### Anti-Patterns to Avoid

- **Punktewert, Member oder Idempotenzschlüssel aus einem Request übernehmen:** Werte und Identitäten müssen serverseitig aus Regel, Source und Auth-Kontext entstehen. [VERIFIED: canonical decision, permission rules]
- **`SELECT`-then-`INSERT` ohne Unique-Constraint:** Zwei parallele Transaktionen können beide die Vorprüfung bestehen. [CITED: https://www.postgresql.org/docs/current/index-unique-checks.html]
- **Award-Zeilen mutieren oder löschen:** Zerstört historische Regel- und Korrekturspur. [VERIFIED: D-04, canonical decision]
- **`audit_logs` als Ledger missbrauchen:** Das generische Audit besitzt weder die fachlichen Ledger-Constraints noch die erforderliche Award-/Storno-Semantik. [VERIFIED: `audit_logs.go`, 0075 migration]
- **Bestätigungs-Trigger direkt an den heutigen Handler hängen:** Aktuell fehlen eigener Review-Capability-Check, Self-Review-Guard und vollständige Source-Bindung; das ist Phase 107. [VERIFIED: review handler/repository, ROADMAP]
- **`status='confirmed'` blind als gesamte historische Eligibility verwenden:** Lokale bestätigte Altzeilen haben leere `confirmed_by`- und `review_status_id`-Felder; die Importregel ist Phase 109. [VERIFIED: Live-DB audit]
- **Media-Uploader automatisch als Begünstigten behandeln:** Uploader/Owner/Beitragender sind unterschiedliche Semantiken; Attribution muss der Domainadapter beweisen. [VERIFIED: current media schemas, D-09]
- **Badge- oder Gruppen-History-Tabellen wiederverwenden:** Beide besitzen andere Ownership und Mutationssemantik. [VERIFIED: badge/history repositories and migrations]

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Concurrent idempotency | In-memory Mutex oder vorherige Existenzabfrage | PostgreSQL Unique + `ON CONFLICT` | Wirkt pro DB und über mehrere Prozesse hinweg. [CITED: https://www.postgresql.org/docs/current/sql-insert.html] |
| Storno-Einmaligkeit | Go-only Boolean/Lookup | Partieller Unique-Index auf `reverses_entry_id` | DB erzwingt Einmaligkeit unter Konkurrenz. [CITED: https://www.postgresql.org/docs/current/indexes-partial.html] |
| Transaktionssteuerung | Eigenes Unit-of-Work-Framework | vorhandenes pgx/`DBTX`-Muster | Bestehende Schnittstelle ist mit Pool und Tx kompatibel. [VERIFIED: `audit_logs.go`; CITED: pgx Tx docs] |
| Berechtigungen | neue Reviewer-Rollenlogik | bestehende Permission Engine, erweitert in Phase 107 | Einzige kanonische Autorität. [VERIFIED: AGENTS, permissions package, canonical decision] |
| Ereignisplattform | universeller Event-Bus | schmaler PointService + typisierte spätere Adapter | Scope verlangt nur fachliches Punktefundament. [VERIFIED: CONTEXT, postmortem] |
| Inhaltsdeduplizierung | Hash/Textvergleich | semantischer Source-/Slot-Key | Doppelpunkte folgen derselben fachlichen Leistung, nicht gleichen Bytes. [VERIFIED: D-08, canonical decision] |

**Key insight:** Der schwierigste Teil ist nicht Addition, sondern eine unveränderliche Identitäts- und Ereignisdefinition, die Retries, Katalogwechsel, Storno und historische Imports gleich behandelt. PostgreSQL-Constraints sind dabei die letzte Autorität; Go orchestriert und validiert die Domainsemantik. [VERIFIED: canonical decision; CITED: PostgreSQL uniqueness docs]

## Common Pitfalls

### Pitfall 1: Rule version in the idempotency key

**What goes wrong:** Nach einer Preisänderung kann dieselbe Source erneut gebucht werden. [VERIFIED: consequence of D-04]

**Why it happens:** Technische Request-Idempotenz wird mit fachlicher Einmaligkeit verwechselt. [VERIFIED: canonical source-key decision]

**How to avoid:** Key nur aus Reward-Art, typisierter Source, Begünstigtem und Slot bilden; Regelversion als Ledger-Snapshot speichern. [VERIFIED: D-04]

**Warning signs:** Tests erwarten zwei Awards für dieselbe Source unter Rule v1/v2. [VERIFIED: derived verification criterion]

### Pitfall 2: Retry silently accepts a mismatched payload

**What goes wrong:** Ein Key-Konflikt kann Datenfehler oder Source-Spoofing verdecken. [VERIFIED: insert-conflict semantics]

**Why it happens:** `ON CONFLICT DO NOTHING` wird als Erfolg zurückgegeben, ohne die bestehende Zeile zu vergleichen. [CITED: https://www.postgresql.org/docs/current/sql-insert.html]

**How to avoid:** Bestehende Zeile laden und alle semantischen Felder vergleichen; nur identische Wiederholung ist erfolgreich. [VERIFIED: recommended contract]

**Warning signs:** Repository-API gibt nur `created bool`, aber keine bestehende Buchung oder Conflict-Fehlersemantik zurück. [VERIFIED: derived verification criterion]

### Pitfall 3: Ledger and domain mutation are not atomic

**What goes wrong:** Bestätigung existiert ohne Award oder Award ohne gültige Bestätigung. [VERIFIED: transactional consistency requirement]

**Why it happens:** Audit-ähnlicher best-effort Call wird nach Commit angehängt. [VERIFIED: current handler/audit pattern]

**How to avoid:** Spätere Adapter müssen Domainentscheidung und `PointService` über denselben `pgx.Tx`/`DBTX`-Pfad schreiben; Phase 106 bereitet diese Tx-fähige API vor. [VERIFIED: `DBTX` analog; CITED: pgx Tx docs]

**Warning signs:** `_ = pointService.Credit(...)`, getrennte Pool-Transaktionen oder Queue ohne Outbox-Vertrag. [VERIFIED: derived verification criterion]

### Pitfall 4: Self-review and wrong group scope

**What goes wrong:** Ein Actor bestätigt den eigenen Beitrag oder eine fremde Gruppenquelle und erzeugt Punkte. [VERIFIED: D-05 threat]

**Why it happens:** Der aktuelle Handler prüft Gruppenpermission, das Repository aktualisiert aber nur nach Contribution-ID/Status; ein eigener Review-Capability- und Self-Review-Check fehlt. [VERIFIED: current handler/repository]

**How to avoid:** Kein Review-Adapter in 106. Phase 107 muss Actor, Source-Gruppe, Einreicher/Beneficiary und Override-Grund transaktional prüfen. [VERIFIED: ROADMAP, D-05]

**Warning signs:** `Confirm(contributionID, actorID)` ohne erwartete `fansub_group_id`, Reviewer-Capability oder `actor != submitter`. [VERIFIED: current signature]

### Pitfall 5: Historical timestamps fabricate current activity

**What goes wrong:** Ein Backfill dominiert Monats-/Jahreswerte am Importtag. [VERIFIED: canonical historical-import decision]

**Why it happens:** `recorded_at` wird zugleich als fachliche Wirksamkeit interpretiert. [VERIFIED: canonical decision]

**How to avoid:** `effective_at` und `recorded_at` ab Phase 106 getrennt speichern; exakte historische Fallback-Regel erst vor Phase 109 entscheiden. [VERIFIED: CONTEXT, ROADMAP]

**Warning signs:** Ledger besitzt nur `created_at` oder Import setzt überall `NOW()`. [VERIFIED: derived verification criterion]

### Pitfall 6: Cascade deletion erases audit history

**What goes wrong:** Löschen einer Release-Version/Gruppe entfernt Awards oder macht Storno unprüfbar. [VERIFIED: append-only requirement]

**Why it happens:** Domain-FKs können ohne Consumer-Trace reflexartig mit `ON DELETE CASCADE` angelegt werden; Phase 106 schützt dagegen mit expliziten FK-Verträgen. [VERIFIED: planned migration contract]

**How to avoid:** `member_id`, Rule und Reversal restriktiv erhalten; optionale Actor-/Gruppen-/Release-Kontext-FKs nach bestätigtem Delete-Flow-Audit `SET NULL`, Source-Key unverändert lassen. [VERIFIED: canonical optional context; `106-PATTERNS.md` consumer trace]

**Warning signs:** `ON DELETE CASCADE` in einer neuen Ledger-FK oder Down-Migration ohne Scope-Prüfung. [VERIFIED: AGENTS migration rules]

## Code Examples

### Tx-compatible repository boundary

```go
// Source analog: backend/internal/repository/audit_logs.go
type DBTX interface {
    Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
    QueryRow(context.Context, string, ...any) pgx.Row
}

type PointLedgerRepository struct {
    db DBTX
}
```

Das neue Repository soll dieselbe Pool-/Tx-kompatible Naht verwenden, damit spätere Domainadapter atomar buchen können. [VERIFIED: `backend/internal/repository/audit_logs.go`; CITED: https://github.com/jackc/pgx/blob/master/_autodocs/types.md]

### Insert-first idempotency

```sql
-- Source: PostgreSQL INSERT / ON CONFLICT documentation
INSERT INTO point_ledger_entries (
    entry_kind, member_id, actor_app_user_id,
    source_type, source_key, idempotency_key,
    point_rule_id, rule_code, rule_version, point_value,
    effective_at
) VALUES (
    'award', $1, $2,
    $3, $4, $5,
    $6, $7, $8, $9,
    $10
)
ON CONFLICT (idempotency_key) DO NOTHING
RETURNING id, member_id, source_type, source_key,
          rule_code, rule_version, point_value, effective_at;
```

Ein leeres `RETURNING`-Ergebnis löst anschließend das Laden und den semantischen Gleichheitsvergleich aus. [CITED: https://www.postgresql.org/docs/current/sql-insert.html]

### Reversal uniqueness

```sql
-- Source: PostgreSQL partial unique index documentation
CREATE UNIQUE INDEX uq_point_ledger_single_reversal
    ON point_ledger_entries (reverses_entry_id)
    WHERE reverses_entry_id IS NOT NULL;
```

Dieser Index erzwingt höchstens eine direkte Gegenbuchung pro Originalbuchung. [CITED: https://www.postgresql.org/docs/current/indexes-partial.html]

### Reversal transaction outline

```go
// Source pattern: pgx transaction docs + PostgreSQL FOR UPDATE docs
tx, err := pool.Begin(ctx)
if err != nil { return err }
defer tx.Rollback(ctx)

original, err := ledger.WithDB(tx).GetForUpdate(ctx, awardID)
if err != nil { return err }
if original.EntryKind != "award" { return ErrInvalidReversal }

entry, err := ledger.WithDB(tx).InsertReversal(ctx, original, actorID, reason, effectiveAt)
if err != nil { return err }
if err := tx.Commit(ctx); err != nil { return err }
return entry
```

Der echte Code soll das Projektfehler- und Constructor-Muster übernehmen; das Beispiel zeigt nur die erforderliche Transaktionsgrenze. [CITED: https://github.com/jackc/pgx/blob/master/_autodocs/transactions.md; CITED: https://www.postgresql.org/docs/current/explicit-locking.html]

## State of the Art

| Existing/old approach | Required current approach | When/why | Impact |
|---|---|---|---|
| Veränderliche Badge-Zeile | Append-only Award-/Storno-Ledger | Phase-106 canonical decision | Badges bleiben Projektion; Punkte behalten vollständige Historie. [VERIFIED: badge repo, canonical decision] |
| Technische oder inhaltsbasierte Deduplizierung | Semantischer Source-/Slot-Key + DB-Unique | Entscheidung vom 2026-07-22 | Kein Hash-/Textmodell und keine mediale Vereinheitlichung. [VERIFIED: D-08/D-09] |
| Aktueller allgemeiner Group-Members-Manage-Check | Dedizierte Review-Capability + Self-Review-Guard | Geplant für Phase 107 | Phase 106 exponiert keinen Review-triggernden Award-Pfad. [VERIFIED: current permissions, ROADMAP] |
| Historische Anzeige direkt aus mehreren Tabellen | Reproduzierbarer, idempotenter Ledger-Import | Geplant für Phase 109 | Historische und neue gleiche Leistung kann gleich bewertet werden, ohne Importzeit als Wirkzeit zu verwenden. [VERIFIED: canonical decision, ROADMAP] |

**Deprecated/outdated:** Die verworfenen Phase-106/107-Medienmodellpläne und alle Annahmen eines universellen Media-Event-Modells sind keine Planungsgrundlage. [VERIFIED: `.planning/notes/260722-gamification-analysis-postmortem.md`, git status zeigt entfernte alte Planungsartefakte]

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | Go `testing` + `testify` v1.9.0. [VERIFIED: `backend/go.mod`, existing tests] |
| Config file | `backend/go.mod`; kein separates Go-Testconfig-File nötig. [VERIFIED: repo inventory] |
| Quick run command | `cd backend; go test ./internal/migrations ./internal/repository ./internal/services -run 'TestPhase106|TestPoint' -count=1` [VERIFIED: package layout] |
| Full suite command | `cd backend; go test ./...` [VERIFIED: Go module layout] |

### Phase success criteria → Test map

| Criterion | Behavior | Test type | Automated command | File exists? |
|---|---|---|---|---|
| SC-1 | Award benötigt Member; Actor ist optional; Claim ist keine Voraussetzung. [VERIFIED: ROADMAP] | Migration contract + service unit | `go test ./internal/migrations ./internal/services -run 'TestPhase106.*Identity' -count=1` | ❌ Wave 0 |
| SC-2 | Gleiches semantisches Ereignis erzeugt unter Retry/Concurrency nur eine Buchung; Storno ist append-only und eindeutig. [VERIFIED: ROADMAP] | PostgreSQL integration + service unit | `go test ./internal/repository ./internal/services -run 'TestPoint.*(Idempot|Concurrent|Reversal)' -count=1` | ❌ Wave 0 |
| SC-3 | Regelwerte sind fest/versioniert; alter Award bleibt nach neuer Regelversion unverändert. [VERIFIED: ROADMAP] | Migration + service unit | `go test ./internal/migrations ./internal/services -run 'TestPoint.*RuleVersion' -count=1` | ❌ Wave 0 |
| SC-4 | Profilpflege erzeugt keinen Punktepfad; Badge-Code wird nicht zum Ledger umgebaut. [VERIFIED: ROADMAP, D-07] | source/architecture contract | `go test ./internal/services ./internal/repository -run 'TestPhase106.*Boundary' -count=1` | ❌ Wave 0 |
| SC-5 | Migration und Code verändern keine Media-Tabellen, Relations- oder Uploadpfade. [VERIFIED: ROADMAP, D-09] | static migration/repo contract | `go test ./internal/migrations ./internal/repository -run 'TestPhase106.*MediaBoundary' -count=1` | ❌ Wave 0 |

### Required test cases

- Zwei parallele Awards mit demselben Key ergeben exakt eine Zeile und dasselbe logische Ergebnis. [CITED: PostgreSQL unique enforcement]
- Derselbe Key mit abweichendem Member, Source, Rule oder Wert liefert Conflict und überschreibt nichts. [VERIFIED: recommended idempotency contract]
- Zwei parallele Stornos desselben Awards ergeben exakt eine Gegenbuchung. [CITED: PostgreSQL partial unique index]
- Storno eines Stornos, Selbstreferenz und Wert mit falschem Vorzeichen werden abgewiesen. [VERIFIED: canonical reversal semantics]
- Rule v2 verändert weder Rule-Version noch Punktwert eines vorhandenen v1-Awards. [VERIFIED: D-04]
- Award ohne `actor_app_user_id` funktioniert für historischen Member; Award ohne `member_id` scheitert. [VERIFIED: D-01/D-02]
- Rollback nach Fehler hinterlässt weder halbe Award- noch halbe Stornozeilen. [CITED: pgx Tx docs]
- Up → Down → Up funktioniert auf einer disponiblen Testdatenbank; Down entfernt ausschließlich die zwei neuen Tabellen/Indizes. [VERIFIED: AGENTS migration rules]
- Source-/boundary test verbietet Änderungen an Media-Tabellen und bestehende Review-/Badge-Verkabelung in diesem Plan. [VERIFIED: D-09, ROADMAP]

### Sampling Rate

- **Per task commit:** `cd backend; go test ./internal/migrations ./internal/repository ./internal/services -run 'TestPhase106|TestPoint' -count=1` [VERIFIED: package layout]
- **Per wave merge:** `cd backend; go test ./...` plus `git diff --check` [VERIFIED: AGENTS]
- **Phase gate:** Full suite grün sowie isolierter PostgreSQL-16-Up/Down/Up-Smoke vor `$gsd-verify-work`. [VERIFIED: AGENTS, Compose DB version]

### Wave 0 Gaps

- [ ] `backend/internal/migrations/phase106_member_points_test.go` — Up/Down-Paar, FK-/Check-/Unique-Verträge, Media-Boundary. [VERIFIED: existing static migration-test pattern]
- [ ] `backend/internal/repository/point_ledger_repository_test.go` — Retry, Payload-Mismatch, Stornovertrag. [VERIFIED: existing repository-test location]
- [ ] `backend/internal/services/point_service_test.go` — Rule-Auswahl, optionaler Actor, kein clientseitiger Wert/Key. [VERIFIED: existing service-test location]
- [ ] Ein isolierter PostgreSQL-Testpfad für echte parallele Inserts; im Repository wurde kein wiederverwendbares DB-Integration-Fixture gefunden, statische SQL-Stringtests reichen dafür nicht. [VERIFIED: `backend/internal/repository/testmain_test.go`, test inventory]

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---:|---|---|
| Go | Backend/tests | ✓ | Host 1.26.1; Modulziel 1.25.0 | Backend-Container. [VERIFIED: `go version`, `go.mod`] |
| PostgreSQL | Migration/concurrency | ✓ | Compose/live 16.13 | Kein funktionaler Fallback; Container verwenden. [VERIFIED: Compose + live query] |
| Docker | isolierte DB / Migrationssmoke | ✓ | 29.6.1 | — [VERIFIED: `docker --version`] |
| Docker Compose | Services | ✓ | v5.2.0 | — [VERIFIED: `docker compose version`] |
| `psql` Host-CLI | direkte DB-Abfragen | ✗ | — | `docker compose exec -T team4sv30-db psql ...` [VERIFIED: environment probe] |
| Git | Migrations-/Diff-Audit | ✓ | 2.41.0.windows.1 | — [VERIFIED: `git --version`] |

**Missing dependencies with no fallback:** Keine. [VERIFIED: environment audit 2026-07-22]

**Missing dependencies with fallback:** Host-`psql` fehlt; der laufende PostgreSQL-Container stellt `psql` bereit. [VERIFIED: environment audit 2026-07-22]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication | indirekt | Kein neuer HTTP-Pfad; späteren Actor ausschließlich aus zentralem Auth-Kontext übernehmen. [VERIFIED: AGENTS auth rules, phase boundary] |
| V3 Session Management | nein in Phase 106 | Kein Browser-/Session-Change; bei späterer geschützter UI gilt zentraler Refresh-Seam. [VERIFIED: `docs/frontend/auth-api-client.md`] |
| V4 Access Control | ja | Bestehende Permission Engine; Review-Capability, Gruppenbindung, Self-Review-Verbot und Admin-Override-Audit in Phase 107. [VERIFIED: canonical decision, ROADMAP] |
| V5 Input Validation | ja | Typisierte interne Commands, positive IDs, serverseitige Rule-/Source-Key-Auswahl, DB-FKs/Checks/Unique. [VERIFIED: recommended contract; PostgreSQL docs] |
| V6 Cryptography | nein | Keine kryptografische Funktion; insbesondere kein Datei-Hash als Reward-Deduplizierung. [VERIFIED: D-08] |

### Known threat patterns for this stack

| Pattern | STRIDE | Standard mitigation |
|---|---|---|
| Client setzt Punktewert/Member/Actor/Key | Spoofing / Tampering | Keine generische HTTP-Write-Route; Service leitet Identität, Regel und Key aus vertrauenswürdiger Source/Auth ab. [VERIFIED: canonical decision] |
| Doppelaward durch Retry/Race | Tampering | DB-Unique + `ON CONFLICT`, Payload-Vergleich, echter Paralleltest. [CITED: PostgreSQL INSERT/uniqueness docs] |
| Self-Review oder fremder Gruppen-Scope | Elevation of privilege | Kein Trigger in 106; Phase 107 prüft Capability, Source-Gruppe, Einreicher und Override-Grund. [VERIFIED: D-05, current gap, ROADMAP] |
| Stilles Ändern historischer Werte | Tampering / Repudiation | Immutable Rule-Versionen, Ledger-Snapshot, keine Update-/Delete-Methoden. [VERIFIED: D-04] |
| Storno ohne Spur | Repudiation | Negative referenzierende Buchung, Pflichtgrund, optionaler Actor und Partial-Unique. [VERIFIED: canonical decision] |
| Auditfehler wird ignoriert | Repudiation | Ledger selbst ist autoritativ und transaktional; generisches Audit nur ergänzend und nicht best-effort als einzige Spur. [VERIFIED: current audit pattern, canonical decision] |
| Domain-Delete löscht Punktehistorie | Tampering | Keine Cascade auf Ledger; bestätigte optionale Actor-/Gruppen-/Release-Kontexte nullen, Member-/Rule-/Reversal-Identität restriktiv erhalten. [VERIFIED: append-only decision; `106-PATTERNS.md`] |
| Media-Uploader wird als Member-Credit interpretiert | Spoofing | Domainadapter muss Begünstigten explizit belegen; Media-Ownership bleibt unverändert. [VERIFIED: D-09, current schemas] |

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | **RESOLVED:** Optionale Actor-/Gruppen-/Release-FKs verwenden nach bestätigten Consumer-Traces `ON DELETE SET NULL`; Source-Key und Ledgerzeile bleiben erhalten. | Recommended table contract / Pitfall 6 | Durch PostgreSQL-FK-Tests abgesichert. |
| A2 | **RESOLVED:** `ON DELETE CASCADE` ist für jede Ledger-FK verboten. | Pitfall 6 / Security | Durch statische und Live-DB-Tests abgesichert. |
| A3 | **RESOLVED / SUPERSEDED:** Keine automatische aktuelle-Regel-Auswahl; ausschließlich expliziter `RuleRef{Code, Version}`. | Phase-106 resolution | Latest-/Activation-/Scheduling-Semantik bleibt außerhalb Phase 106. |

### Verbindlicher Auflösungsstatus für Phase 106

- **A1 — RESOLVED:** `fansub_group_id`, `release_version_id` und `actor_app_user_id` verwenden `ON DELETE SET NULL`. Die in `106-PATTERNS.md` dokumentierten Consumer-Traces zeigen physische Gruppen- und Release-Version-Löschpfade; `RESTRICT` würde diese legitimen Flows blockieren, `CASCADE` die Ledgerhistorie löschen. Member-, Rule- und Reversal-Identität bleiben dagegen `RESTRICT`/NO ACTION.
- **A2 — RESOLVED:** Für jede Ledger-FK ist `ON DELETE CASCADE` ausgeschlossen; dies wird statisch und gegen PostgreSQL getestet.
- **A3 — RESOLVED / SUPERSEDED:** Phase 106 wählt niemals eine höchste, neueste, aktive oder geplante Regelversion. Der einzige Vertrag ist ein expliziter `RuleRef{Code, Version}`. Aktivierung, Scheduling und eine produktive Auswahlpolicy bleiben außerhalb dieser Phase.

## Phase-106 Resolutions (formerly Open Questions)

1. **[RESOLVED für Phase 106] Welche produktiven Regelcodes und Punktwerte werden initial gesät?**
   - What we know: Werte sind fest, zentral, versioniert; historische und neue gleichartige Arbeit erhalten denselben Wert. [VERIFIED: D-02/D-04]
   - What's unclear: Konkrete Zahlen und Gewichtung sind ausdrücklich offen. [VERIFIED: CONTEXT]
   - Resolution: Phase 106 baut Schema/Service ausschließlich mit expliziten Test-Fixtures; es gibt keine produktiven Regel-Seeds und keine Source-Aktivierung. Produktive Codes/Werte werden vor Phase 108 entschieden. [VERIFIED: phase boundary]

2. **[RESOLVED für Phase 106] Wie werden Hauptkategorien im Katalog codiert?**
   - What we know: Historische Fansub-Leistung und Plattformbeitrag müssen getrennt sichtbar bleiben und dürfen summiert werden. [VERIFIED: canonical decision]
   - What's unclear: Weitere Kategorien und endgültige Codes sind nicht entschieden. [VERIFIED: CONTEXT]
   - Resolution: Phase 106 erlaubt genau `fansub_work` und `platform_contribution`. Diese Codes bilden die zwei im kanonischen Entscheid ausdrücklich benannten, getrennt sichtbaren Hauptarten ab; weitere Kategorien und jede Ranglistenaggregation bleiben außerhalb von Phase 106. [VERIFIED: canonical decision, phase boundary]

3. **[DEFERRED zu Phase 109] Welche historische `effective_at`-Fallback-Regel gilt bei fehlendem Confirmation-Zeitpunkt?**
   - What we know: Importzeit darf aktuelle Monats-/Jahresaktivität nicht künstlich dominieren; vier lokale bestätigte Altbeiträge haben weder `confirmed_by` noch `review_status_id`. [VERIFIED: canonical decision, Live DB]
   - What's unclear: Exakter historischer Zeitpunkt ist vertagt. [VERIFIED: CONTEXT]
   - Resolution: Phase 106 verlangt `effective_at` als vertrauenswürdigen expliziten Serviceparameter und erfindet keinen Fallback. Historische Ableitung und Import werden verbindlich erst in Phase 109 entschieden. [VERIFIED: ROADMAP]

4. **[RESOLVED für Phase 106] Welche Delete-Semantik gilt für optionale Gruppen-/Release-Kontexte?**
   - What we know: Ledgerhistorie darf nicht gelöscht werden; Gruppe/Release sind optionaler Kontext. [VERIFIED: canonical decision]
   - Resolution context: Der kanonische Produktentscheid nennt den Kontext optional; die Consumer-Traces lösen die zuvor offene technische Wahl für Phase 106 zugunsten von `SET NULL` auf. [VERIFIED: `106-PATTERNS.md`]
   - Resolution: Die Consumer-Traces in `106-PATTERNS.md` bestätigen physische Gruppen- und Release-Version-Löschungen. Daher verwenden optionale Actor-/Gruppen-/Release-Version-Kontexte `ON DELETE SET NULL`; Member-, Rule- und Reversal-Identität bleiben `RESTRICT`/NO ACTION; `CASCADE` auf Ledgerzeilen ist verboten. [VERIFIED: `fansub_repository.go`, `episode_version_repository_write_helpers.go`, `0075_audit_logs.up.sql`, AGENTS]

5. **[RESOLVED für Phase 106] Braucht Phase 106 eine aktuelle-Regel-Auswahl oder nur explizite Rule-Versionen?**
   - What we know: Regelversionen sind unveränderlich und konkrete Werte offen. [VERIFIED: D-04, CONTEXT]
   - What's unclear: Geplante Aktivierung/Scheduling ist nicht spezifiziert. [VERIFIED: canonical docs]
   - Resolution: Phase 106 akzeptiert ausschließlich einen expliziten `RuleRef{Code, Version}` und lädt exakt diese Zeile. Es gibt keine Highest-/Latest-/Active-/Scheduling-Semantik und keine produktive automatische Regelauswahl. [VERIFIED: D-04 plus Phase-106 scope decision]

## Sources

### Primary (HIGH confidence)

- `.planning/phases/106-member-gamification-punktefundament/106-CONTEXT.md` — Scope, locked decisions, required research, deferred questions. [VERIFIED: local file]
- `.planning/notes/260722-member-gamification-DECISION.md` — canonical identity, ledger, review, history, category, badge and media rules. [VERIFIED: local file]
- `.planning/notes/260722-gamification-analysis-postmortem.md` — discarded universal media-model assumptions and required runtime-chain discipline. [VERIFIED: local file]
- `.planning/ROADMAP.md` — phase boundaries 106–110 and success criteria. [VERIFIED: local file]
- `AGENTS.md`, `docs/engineering/implementation-contract.md`, `docs/api/api-contracts.md`, `docs/frontend/auth-api-client.md`, `docs/architecture/db-schema-fansub-domain.md` — project constraints and contract precedence. [VERIFIED: local files]
- Migrations 0044, 0075, 0081–0097, 0104–0117, 0125, 0128, 0130 — current identity/contribution/audit/capability/history/media seams. [VERIFIED: local migration files]
- `backend/internal/repository/*`, `backend/internal/services/badge_service.go`, `backend/internal/handlers/contribution_review_handler.go`, `backend/internal/permissions/permissions.go` — current runtime producers, consumers, transaction and authorization patterns. [VERIFIED: codebase grep/read]
- Live PostgreSQL 16.13 schema/data inventory and environment probes on 2026-07-22. [VERIFIED: local Docker Compose database]
- Context7 `/jackc/pgx` — pgx v5 Tx interface, begin/commit/rollback and query methods. [CITED: https://github.com/jackc/pgx/blob/master/_autodocs/transactions.md]
- PostgreSQL current official docs — INSERT/ON CONFLICT, unique enforcement, partial unique indexes, row/advisory locks. [CITED: https://www.postgresql.org/docs/current/sql-insert.html; CITED: https://www.postgresql.org/docs/current/index-unique-checks.html; CITED: https://www.postgresql.org/docs/current/indexes-partial.html; CITED: https://www.postgresql.org/docs/current/explicit-locking.html]

### Secondary (MEDIUM confidence)

- Keine sekundären Quellen verwendet. [VERIFIED: research log]

### Tertiary (LOW confidence)

- Keine unbestätigten Webquellen verwendet; die drei gekennzeichneten Designannahmen stehen ausschließlich im Assumptions Log. [VERIFIED: research log]

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — Versionen aus `go.mod`, `go list -m`, Compose und laufender DB verifiziert. [VERIFIED: local probes]
- Architecture: HIGH — an kanonische Entscheidungen, aktuellen Schema-/Runtime-Bestand und offizielle PostgreSQL-/pgx-Semantik gebunden. [VERIFIED: cited sources]
- Pitfalls: HIGH — zentrale Risiken sind entweder im aktuellen Code sichtbar oder durch offizielle Concurrency-/Constraint-Dokumentation belegt. [VERIFIED: cited sources]
- Future source eligibility: MEDIUM — Spalten/Runtime sind verifiziert, aber genaue Review- und historische Zeitregeln sind bewusst auf spätere Phasen vertagt. [VERIFIED: CONTEXT, ROADMAP]

**Research date:** 2026-07-22
**Valid until:** 2026-08-21; bei neuen Migrationen, Änderungen am Review-Flow oder neuen Gamification-Entscheiden vorher erneut prüfen. [VERIFIED: current fast-moving repository state]
