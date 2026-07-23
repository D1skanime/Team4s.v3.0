# Phase 107: Prüf- und Delegationsfundament - Context

**Gathered:** 2026-07-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 107 baut ausschließlich die wiederverwendbare Prüfgrundlage: typisierte gruppenbezogene Review-Rechte, atomare Entscheidungen ohne Reservierung, Self-Review-Schutz, Audit und begrenzte Prüfpunkte über den PointService aus Phase 106. Sie bindet noch keine Release-Texte, Release-Version-Medien, `anime_contributions`, Upload-Flows, Cleanup-Jobs oder Prüfoberfläche an. Diese Release-Vertikale folgt in Phase 107.1; weitere Beitragsquellen folgen in Phase 108.

</domain>

<decisions>
## Implementation Decisions

### Review-Rechte und Delegation
- **D-01:** Review-Rechte werden als getrennte Capabilities je Beitragstyp modelliert. Für Phase 107.1 sind mindestens Texte, Bilder und Mitwirkungen unterscheidbar; eine einzige pauschale Review-Capability ist verboten.
- **D-02:** Fansub-Admins dürfen Review-Rechte nur an aktive bestätigte Mitglieder ihrer eigenen Gruppe delegieren. Plattform-Admins dürfen global delegieren. Delegierte Mitglieder dürfen nicht weiterdelegieren.
- **D-03:** Eine Delegation gilt ohne Ablaufdatum bis zum ausdrücklichen Entzug. Fehlende Logins oder Inaktivität entziehen sie nicht automatisch; Phase 107 führt keinen neuen Membership-Ende-Lebenszyklus ein.
- **D-04:** Delegationsverwaltung erweitert den bestehenden Mitglieder-Editor des kanonischen Gruppen-Workspaces. Es entsteht keine zweite Mitgliederverwaltung.

### Keine Reservierung, erster Abschluss gewinnt
- **D-05:** Es gibt keine Reservierung, Übernahme, persönliche Zuweisung, Assignment-Tabelle oder den Status „in Prüfung durch Person X“.
- **D-06:** Alle passend berechtigten Prüfer dürfen denselben offenen Eintrag lesen und entscheiden. Genau die erste atomar erfolgreiche Confirm-/Reject-Transaktion gewinnt; parallele Verlierer erhalten einen stabilen Already-decided-/Conflict-Fehler und keine Punkte.
- **D-07:** Ein Delegationsentzug sperrt nur zukünftige Entscheidungen. Historische Entscheidungen und bereits verdiente Punkte bleiben bestehen; weil keine Assignments existieren, muss nichts zurückgegeben oder umgehängt werden.

### Self-Review und Plattform-Admins
- **D-08:** Reguläres Self-Review ist verboten. Nur ein Plattform-Admin darf als deutlich gekennzeichnete Ausnahme mit Pflichtbegründung übersteuern.
- **D-09:** Plattform-Admins dürfen sämtliche Review- und Delegationsaktionen global ausführen, benötigen dafür keine `members`-Identität und erhalten niemals Punkte, Badges oder Auszeichnungen. Eine Bestätigung darf trotzdem die Arbeitspunkte des Einreichers auslösen.
- **D-10:** Ein Plattform-Admin-Override erzeugt keine Prüfpunkte. Wird er später fachlich aufgehoben, werden bereits erzeugte Beitragspunkte über den PointService exakt einmal storniert.

### Audit und Datenschutz
- **D-11:** Jede Zustandsänderung wird mit Akteur und Zeitpunkt gespeichert: Delegation erteilen/entziehen, Einreichen, Bearbeiten nach Ablehnung, erneut einreichen, bestätigen, ablehnen, veröffentlichen, Override, Punkte/Storno sowie spätere Cleanup-Ergebnisse. Reine Lesezugriffe werden nicht protokolliert.
- **D-12:** Strukturierte Entscheidungsmetadaten bleiben unveränderlich nachvollziehbar. Jede Ablehnung verlangt eine strukturierte Ablehnungskategorie und einen nichtleeren Freitextgrund; ein Plattform-Self-Review-Override verlangt unabhängig von der Entscheidung ebenfalls einen nichtleeren Freitextgrund. Freie Ablehnungs- und Override-Begründungen werden getrennt nach Zweck gespeichert, damit eine spätere Retention sie entfernen kann, ohne Kategorie oder Audit-Spur zu verfälschen.
- **D-13:** Systemaktionen erhalten einen eindeutig erkennbaren Systemakteur; es wird kein künstliches Member oder Profil erfunden.

### Prüfpunkte und Farming-Schutz
- **D-14:** Normale Annahme und Ablehnung verwenden denselben kleinen festen Review-Punktwert. Aufrufer übergeben weder Punktwert noch eigenen Idempotenzschlüssel; der PointService aus Phase 106 erzeugt den regelversionsstabilen Schlüssel aus `RuleRef` und `SourceRef`.
- **D-15:** Jeder konkrete neue Beitrag besitzt eine stabile Quellenidentität. Je Quellenidentität existiert höchstens ein Ablehnungs-Credit-Slot und höchstens ein späterer Bestätigungs-Credit-Slot; Retries oder wiederholte Entscheidungen erzeugen keine weiteren Credits.
- **D-16:** Mehrere tatsächlich unterschiedliche Bilder oder Texte desselben Releases dürfen jeweils eigene Beitrags- und Review-Credits erzeugen. Bearbeiten und Neueinreichen eines abgelehnten Datensatzes behalten dagegen dieselbe Quellenidentität.
- **D-17:** Review-Credit gehört dem prüfenden `member`, nicht dem Einreicher. Fehlt beim berechtigten Plattform-Admin eine Member-Zuordnung, bleibt die Entscheidung gültig, aber es wird kein Review-Credit erzeugt.

### the agent's Discretion
- Genaue Namen der neuen Capabilities, Tabellen, Go-Typen und stabilen Fehlercodes, sofern die bestehende Permission Engine und Phase-106-PointService-Seams direkt wiederverwendet werden.
- Die konkrete kleine Punktzahl und Rule-Codes, solange Annahme und Ablehnung gleich gewichtet und Overrides/Plattform-Admins immer punktelos bleiben.
- Ob die domänenneutrale Entscheidungslogik als Service mit Adapter-Interface oder eng äquivalentes vorhandenes Pattern umgesetzt wird; ein Universal-Datenmodell, das Domain-Ownership verschluckt, ist nicht erlaubt.

</decisions>

<specifics>
## Specific Ideas

- Das Modell soll bewusst wie eine offene Arbeitsliste funktionieren: Berechtigte sehen Arbeit und die erste tatsächlich abgeschlossene Prüfung gewinnt.
- „Übernommen von …“ oder persönliche Arbeitsreservierungen sind ausdrücklich unerwünscht.
- Plattform-Admins sind Sicherheits- und Supportinstanz, keine Teilnehmer der Gamification.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Produkt und Voraussetzungen
- `.planning/ROADMAP.md` — Phase-107-Grenze, Anforderungen und Abhängigkeit zu Phase 107.1.
- `.planning/REQUIREMENTS.md` — `P107-SC1` bis `P107-SC6`.
- `.planning/notes/260722-member-gamification-DECISION.md` — verbindliche Produktbasis für Punkte, Identität und Vier-Augen-Prinzip.
- `.planning/phases/106-member-gamification-punktefundament/106-CONTEXT.md` — unveränderliche Grenzen des Punktefundaments.
- `.planning/phases/106-member-gamification-punktefundament/106-RESEARCH.md` — konkrete PointService-, RuleRef-, SourceRef- und Ledger-Seams.

### Architektur, Verträge und Sicherheit
- `docs/architecture/db-schema-fansub-domain.md` — kanonische Fansub-, Release- und Medien-Ownership.
- `docs/engineering/implementation-contract.md` — Reuse-first- und Dateigrenzen.
- `docs/api/api-contracts.md` — Vertragsworkflow für spätere HTTP-Anbindung.
- `docs/frontend/auth-api-client.md` — Auth-/Refresh-Session-Grenze.
- `AGENTS.md` — Projekt-, Domain-, Upload-, Auth- und Migrationsregeln.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/internal/permissions/permissions.go` und `backend/internal/repository/authz_permissions.go`: bestehende Capability-Auflösung; keine parallele Rollenlogik.
- `backend/internal/services/point_service.go`: alleinige Buchungsseam, die den Idempotenzschlüssel aus RuleRef/SourceRef bildet.
- `backend/internal/repository/point_ledger_repository.go` und `backend/internal/repository/point_rules_repository.go`: bestehendes `point_ledger_entries`- und Regelmodell aus Phase 106.
- `backend/internal/handlers/contribution_review_handler.go`: vorhandene Confirm-/Reject-Semantik als Analog, aber `anime_contributions` wird in Phase 107 nicht vollständig angebunden.

### Established Patterns
- Neue Migrationen sind additiv; historische Migrationen bleiben unangetastet.
- Transaktionale Consumer verwenden den tx-gebundenen PointService-Pfad, damit Entscheidung, Audit und Buchung gemeinsam committen oder gemeinsam scheitern.
- Domain-Adapter liefern stabile Quellenidentität, Autor und Kontext, ohne ihre Fachtabellen in eine Universal-Tabelle zu kopieren.

### Integration Points
- Phase 107.1 implementiert Adapter für `release_version_notes` und `release_version_media`.
- Phase 108 bindet `anime_contributions` und weitere bestätigte Quellen an.
- Delegations- und Review-HTTP/UI-Verträge werden erst mit einem konkreten Consumer in Phase 107.1 vervollständigt.

</code_context>

<deferred>
## Deferred Ideas

- Release-Prüfliste, Detailroute, automatische Einreichung, Veröffentlichung, Ablehnungsüberarbeitung und Cleanup — Phase 107.1.
- Historische/aktuelle Mitwirkungen, Projekt-/Zusatznotizen und Metadatenpflege — Phase 108.
- Ranglisten — Phase 109; Badges und öffentliche UI — Phase 110.
- Generische Credit-zu-Permission-Brücke aus `.planning/todos/pending/2026-06-03-credits-ui-konsolidierung-und-permission-bruecke.md`.

</deferred>

---

*Phase: 107-pruef-und-delegationsfundament*
*Context gathered: 2026-07-23*
