---
phase: 107
slug: best-tigung-delegation-und-ablehnungslebenszyklus
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-23
---

# Phase 107 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser/API → Review Service | Nicht vertrauenswürdige Review-Befehle werden serverseitig autorisiert und attribuiert. | Ziel-ID, Aktion, Kategorie und Pflichtgründe |
| Review Service → Permission Engine | Gruppenmitgliedschaft, Capability, Claims und Plattform-Override bestimmen den zulässigen Actor. | App-User-, Member-, Gruppen- und Capability-IDs |
| Review Service → PostgreSQL | Entscheidung, Domain-Mutation, Audit, Gründe und Credits teilen eine Transaktion. | Review-Zustand, Audit-Metadaten und Punkte |
| Repository → Audit-/Reason-Speicher | Strukturierte unveränderliche Events bleiben von löschbaren Freitextgründen getrennt. | Actor, Event-Code, Referenzen und sensible Freitexte |
| Test Harness → PostgreSQL | Phase-107-Integrationstests dürfen ausschließlich eine isolierte Testdatenbank und ein isoliertes Schema verwenden. | Migrationen und Testdaten |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation / Evidence | Status |
|-----------|----------|-----------|-------------|-----------------------|--------|
| T-107-01 | Tampering | Test Harness | mitigate | DB-/Schema-Isolation und `DATABASE_URL`-Fallback-Regression in `phase107_postgres.go` und `phase107_postgres_test.go`. | closed |
| T-107-02 | Elevation of privilege | Schema contract | mitigate | Drei getrennte Review-Actions; nur `fansub_lead` wird geseedet; Plattform-Admin nutzt den bestehenden globalen Bypass. | closed |
| T-107-03 | Repudiation | Audit contract | mitigate | Unveränderliche strukturierte Audit-Eltern, getrennte Reason-Zeilen und explizit kein Read-Audit. | closed |
| T-107-04 | Tampering | Credit contract | mitigate | Source-globale Slot-Unique, DB-Mutationsguards und transaktionaler `PointService.CreditInTx`. | closed |
| T-107-05 | Elevation of privilege | Capability seeds | mitigate | Exakte Action-Seeds mit semantischen Vorbedingungen; keine Seeds für andere Rollen. | closed |
| T-107-06 | Tampering | Review decisions | mitigate | Unique Source+Revision sowie Guards gegen UPDATE, DELETE und TRUNCATE. | closed |
| T-107-07 | Repudiation | Review audit events | mitigate | Strukturierte Events in `review_audit_repository.go`; Freitext nur über `InsertReason`. | closed |
| T-107-08 | Tampering | Review credit slots | mitigate | Source/Key/Slot-Unique und append-only Guards unabhängig von PointService-Idempotenz. | closed |
| T-107-09 | Denial of service | Down migration | mitigate | Datenprecondition vor Änderungen, kein `CASCADE`, erfolgreicher Up→Down→Up-Test. | closed |
| T-107-10 | Elevation of privilege | Direct grant lookup | mitigate | Aktiver User, Membership, verifizierter Claim, Gruppe und exakte Capability werden gemeinsam geprüft; Fehler deny. | closed |
| T-107-11 | Elevation of privilege | Delegation chain | mitigate | Review-Actions sind von `fansub_group.members.manage` getrennt; Grant/Revoke bleibt separat geschützt. | closed |
| T-107-12 | Spoofing | Reviewer identity | mitigate | Verifizierte Actor-Member-IDs werden separat aufgelöst und für Self-Review-Prüfungen verwendet. | closed |
| T-107-13 | Repudiation | Permission reads | accept | Reine Permission-Reads werden gemäß D-11 bewusst nicht auditiert, da sie keinen Zustand verändern; Regressionstest bestätigt die Grenze. | closed |
| T-107-14 | Tampering | Grant/Revoke | mitigate | Exakter Membership-`FOR UPDATE`-Lock und Unique-Paar mit Idempotenztests. | closed |
| T-107-15 | Repudiation | Audit writes | mitigate | Typed Actor/Event-Validierung, Pflichtfelder und harte Fehlerfortpflanzung statt Best-Effort. | closed |
| T-107-16 | Information disclosure | Reason text | mitigate | Gründe liegen in separaten Kindzeilen, nicht im strukturierten Parent; gezieltes Löschen ist getestet. | closed |
| T-107-17 | Spoofing | System actor | mitigate | Expliziter `ReviewAuditActorSystem` und validierte Actor-Shapes. | closed |
| T-107-18 | Tampering | Concurrent decision | mitigate | Insert-first `ON CONFLICT DO NOTHING`; echte Concurrent-Service-Tests beweisen genau einen Gewinner. | closed |
| T-107-19 | Repudiation | Same-actor retry | mitigate | Jeder Unique-Konflikt, einschließlich identischem Actor-Retry, wird stabil als Conflict behandelt. | closed |
| T-107-20 | Tampering | Reviewer farming | mitigate | Advisory Lock, Post-Lock-Recheck, DB-Unique und append-only Credit-Slot-Schema. | closed |
| T-107-21 | Spoofing | Credit beneficiary | mitigate | Begünstigtes Reviewer-Member stammt ausschließlich aus serverseitig aufgelöster Autorisierung. | closed |
| T-107-22 | Spoofing | ReviewDecisionCommand | mitigate | Command enthält nur Target, Intent und Gründe; keine caller-kontrollierten Gruppen-, Member-, Rule-, Value- oder Key-Felder. | closed |
| T-107-23 | Elevation of privilege | Self-review | mitigate | App-User und verifizierte Member-Claims werden geprüft; Plattform-Override verlangt explizite Absicht und Pflichtgrund. | closed |
| T-107-23A | Spoofing | Review target attribution | mitigate | Positive Submitter-/Beneficiary-Attribution wird vor jeder Mutation verlangt; Fehler bleiben nebenwirkungsfrei. | closed |
| T-107-24 | Tampering | Concurrent decision transaction | mitigate | Decision wird vor Adaptermutation eingefügt; Verlierer und Fehler rollen die gesamte Transaktion zurück. | closed |
| T-107-25 | Tampering | Review credits | mitigate | Slot-Lock/Recheck liegt vor `CreditInTx`; Plattform-Admin-Zweig vergibt keine Credits. | closed |
| T-107-26 | Repudiation | Partial failure | mitigate | Entscheidung, Adapter, Audit, Gründe, Credits und Commit teilen eine Transaktion; Fault-Injection-Tests bestehen. | closed |
| T-107-27 | Information disclosure | Override/reject reasons | mitigate | Strukturierte Kategorie im Parent; Reject-/Override-Freitext nur als getrennte typed Kindzeilen und nicht in Logs/Errors. | closed |
| T-107-28 | Elevation of privilege | Scope creep | mitigate | Boundary-Tests verbieten Handler, UI, konkrete Adapter, Assignment-, Cleanup- und Upload-Seams in Phase 107. | closed |

*Status: open · closed*  
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-107-01 | T-107-13 | Permission-Reads sind absichtlich unauditiert, weil sie keinen Zustand verändern. Zustandsändernde Review-, Delegations- und Credit-Aktionen bleiben vollständig auditiert. | Phase-107-Planentscheidung D-11, durch Security-Audit verifiziert | 2026-07-23 |

*Accepted risks do not resurface in future audit runs.*

---

## Verification Evidence

- `go test ./internal/testsupport ./internal/migrations ./internal/permissions ./internal/repository ./internal/services -run 'TestPhase107' -count=1` — bestanden.
- Alle sechs Phase-107-Summaries wurden geprüft; keine enthält einen nicht registrierten `## Threat Flags`-Eintrag.
- Implementierungsevidenz wurde in Migration `0134_review_foundation`, Permission-, Delegations-, Decision-, Audit-, Credit- und Review-Service-Code sowie den zugehörigen Tests gefunden.
- Implementierungsdateien wurden durch diesen Audit nicht verändert.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-23 | 29 | 29 | 0 | GSD Security Auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-23
