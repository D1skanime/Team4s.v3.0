# Phase 107: Bestätigung, Delegation und Ablehnungslebenszyklus - Context

**Gathered:** 2026-07-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Diese Phase führt den verbindlichen Vier-Augen-Lebenszyklus für bewertete Einreichungen ein: berechtigte Prüfung und Delegation, auditierten Plattform-Admin-Override, exakt einmalige Beitrags- und Prüfpunkte, private Überarbeitung abgelehnter Inhalte, erneute Einreichung sowie zeitgesteuerten und idempotenten Cleanup. Bestehende Domain- und Mediengrenzen bleiben unverändert; insbesondere darf Release-Version-Media nicht an Episoden oder falsche Release-Ebenen gehängt werden.

</domain>

<decisions>
## Implementation Decisions

### Delegierte Review-Rechte
- **D-01:** Review-Rechte werden als getrennte Capabilities je Beitragstyp modelliert, beispielsweise für Beiträge, Release-Texte und Medien. Es gibt keine pauschale Review-Capability für alles.
- **D-02:** Fansub-Admins dürfen innerhalb ihrer eigenen Gruppe delegieren; Plattform-Admins dürfen global delegieren. Delegierte Mitglieder dürfen ihre Rechte nicht weiterdelegieren.
- **D-03:** Eine Delegation gilt ohne Ablaufdatum bis zum ausdrücklichen Entzug.
- **D-04:** Ein Entzug sperrt nur zukünftige Aktionen. Historische Entscheidungen und bereits verdiente Prüfpunkte bleiben bestehen; offene, noch nicht geprüfte Zuweisungen gehen zurück in die allgemeine Gruppenwarteschlange.

### Selbstreview-Override und Prüfpunkte
- **D-05:** Selbstbestätigung bleibt grundsätzlich verboten. Ein Plattform-Admin darf sie nur als ausdrücklich gekennzeichnete Ausnahme mit Pflichtbegründung und deutlicher UI-Warnung überschreiben.
- **D-06:** Für einen Selbstreview-Override werden keine Prüfpunkte vergeben.
- **D-07:** Die Override-Begründung ist für alle Gruppenmitglieder mit Review-Recht sichtbar.
- **D-08:** Wird ein Override später als unberechtigt eingestuft, wird die Einreichung direkt abgelehnt, die Beitragspunkte werden exakt einmal zurückgenommen und eine Neueinreichung ist erforderlich.
- **D-09:** Normale Prüfpunkte sind klein, fest und für Annahme und Ablehnung gleich. Sie werden pro wirksamer Review-Entscheidung höchstens einmal vergeben.

### Ablehnung und erneute Einreichung
- **D-10:** Nach einer Ablehnung bleibt dieselbe Einreichung privat und vollständig bearbeitbar; Texte und zugehörige Medien bleiben bis zum Cleanup erhalten.
- **D-11:** Eine Ablehnung verlangt mindestens eine strukturierte Kategorie und einen Pflichtfreitext.
- **D-12:** Bei der Überarbeitung wird derselbe Datensatz inhaltlich überschrieben. Nur der letzte Arbeitsstand ist sichtbar; der Audit-Verlauf der Statusaktionen bleibt erhalten.
- **D-13:** Derselbe Prüfer darf eine überarbeitete Einreichung erneut prüfen, sofern es nicht seine eigene Einreichung ist.
- **D-14:** Abgelehnte Einreichungen erhalten keine Beitragspunkte. Erst eine wirksame Bestätigung erzeugt diese exakt einmal.

### Cleanup und Audit-Tombstone
- **D-15:** Die Aufbewahrungsfrist beginnt mit der letzten Aktivität. Bearbeitung oder erneute Einreichung setzt sie zurück.
- **D-16:** Die Frist beträgt in Produktion 90 Tage und lokal 5 Stunden. Tests müssen die Zeit kontrolliert vorgeben können.
- **D-17:** Es gibt keine zusätzliche automatische Vorwarnung vor dem Cleanup; die feste Frist wird im Produkt verständlich ausgewiesen.
- **D-18:** Der Tombstone bewahrt IDs, Beitragstyp, Beteiligte, Zeitpunkte, Statusfolge, Ablehnungskategorie und Prüferentscheidung. Inhalte, Begründungsfreitexte und Dateien werden nicht dauerhaft aufbewahrt.
- **D-19:** Schlägt das physische Löschen einer Mediendatei fehl, darf der Tombstone trotzdem erzeugt werden. Der Dateifehler wird protokolliert und bleibt als separat idempotent wiederholbarer Cleanup-Auftrag erhalten.
- **D-20:** Cleanup, Tombstone-Erstellung, Dateinachlauf, erneute Einreichung, Punktevergabe und Punkterücknahme müssen bei Wiederholung und Parallelzugriffen idempotent bleiben.

### Prüfer ohne bestätigte Member-Zuordnung
- **D-21:** Eine aktive, bestätigte Mitgliedschaft in der Fansub-Gruppe ist Voraussetzung für jede neue gruppenbezogene Review-Delegation.
- **D-22:** Endet die Mitgliedschaft, sind neue Reviews und Zuweisungen sofort gesperrt. Eine bereits während der gültigen Mitgliedschaft konkret zugewiesene Prüfung darf noch abgeschlossen werden.
- **D-23:** Für eine solche bestehende Zuweisung gilt keine zusätzliche Abschlussfrist, solange die Zuweisung offen bleibt.
- **D-24:** Der Abschluss dieser zuvor autorisierten Zuweisung erhält weiterhin die normalen festen Prüfpunkte.

### Agent's Discretion
- Genaue Namen der Capabilities, Tabellen und API-Felder, sofern sie klar typisiert sind und die vorhandene Permission Engine wiederverwenden.
- Auswahl der strukturierten Ablehnungskategorien und deren deutsche UI-Bezeichnungen; sie müssen stabil, testbar und später erweiterbar sein.
- Technische Form der offenen Review-Zuweisung und des separat wiederholbaren Datei-Cleanup-Auftrags.
- Konkrete Höhe der kleinen festen Prüfpunkte, solange Annahme und Ablehnung gleich bewertet werden und Self-Overrides null Punkte erhalten.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Produkt- und Phasenentscheidungen
- `.planning/ROADMAP.md` — Ziel und Erfolgskriterien von Phase 107.
- `.planning/REQUIREMENTS.md` — Milestone-Anforderungen und Zuordnung zur Phase.
- `.planning/notes/260722-member-gamification-DECISION.md` — verbindliche Produktentscheidungen zur Gamification und Review-Logik.
- `.planning/phases/106-member-gamification-punktefundament/106-CONTEXT.md` — Punktefundament, Idempotenz und Grenzen der vorausgehenden Phase.

### Domain, Implementierung und Verträge
- `docs/architecture/db-schema-fansub-domain.md` — kanonische Fansub-, Release-Version- und Medienzuordnung.
- `docs/engineering/implementation-contract.md` — Wiederverwendungs- und Implementierungsregeln.
- `docs/api/api-contracts.md` — API-Vertragsworkflow; Vertragsdateien müssen mit Runtime und Frontend synchron bleiben.
- `docs/frontend/auth-api-client.md` — zentrale Auth- und Refresh-Session-Grenze für geschützte Review-Aktionen.
- `docs/frontend/ui-system.md` — semantische UI-Komponenten und bestehende Designkonventionen.
- `docs/agent-guidelines-ui.md` — lokale UI-Leitlinien für Admin-Oberflächen.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/internal/handlers/contribution_review_handler.go`: bestehender HTTP-Einstieg für Bestätigung und Ablehnung; hier AuthZ und stabile Fehlerverträge erweitern.
- `backend/internal/repository/anime_contributions_proposal_repository.go`: bestehende Statusmutationen für Confirm, Reject und SelfPublish; in transaktionale, idempotente Lebenszyklusoperationen überführen.
- `backend/internal/permissions/permissions.go` und `backend/internal/repository/authz_permissions.go`: vorhandene DB-gestützte Capability- und Rollenlogik für Delegationen wiederverwenden.
- `backend/internal/repository/media_repository.go`: vorhandene Media-Review-Statusseams beachten, ohne die Eigentumsgrenzen der Medientypen zusammenzuführen.
- `backend/internal/repository/release_version_media_cleanup.go` und `backend/internal/services/release_version_media_cleanup.go`: etablierte Muster für periodischen, wiederholbaren Medien-Cleanup als Analog verwenden.

### Established Patterns
- Punkteänderungen aus Phase 106 sind transaktional, idempotent und über stabile Regelcodes adressiert; Review-Aktionen müssen dieselbe Seam verwenden.
- Berechtigungen werden über vorhandene Rollen und Capabilities geprüft, nicht über neue ad-hoc Rollenlogik.
- Geschützte Browseraktionen laufen über den zentralen API-Client und müssen mit gültiger Refresh-Session auch ohne aktuellen Access Token funktionieren.
- Gruppeninterne Review-UI gehört in den kanonischen Workspace `/admin/fansubs/[id]/edit`.

### Integration Points
- Confirm/Reject/Override verbinden Proposal-Status, Audit-Ereignis und Punktebuchung in einer atomaren Transaktion.
- Delegationsverwaltung verbindet Gruppenmitgliedschaft mit typbezogenen Capabilities und offenen Zuweisungen.
- Cleanup-Job verbindet abgelehnte Inhalte, domainrichtig zugeordnete Medien, Tombstone und einen separat wiederholbaren Dateinachlauf.
- API-Veränderungen müssen `shared/contracts/openapi.yaml`, gegebenenfalls `shared/contracts/admin-content.yaml`, Frontend-Typen und `frontend/src/lib/api.ts` gemeinsam berücksichtigen.

</code_context>

<specifics>
## Specific Ideas

- Der normale Review-Prozess soll konsequent als Vier-Augen-Prinzip erscheinen; der Self-Override ist visuell eine seltene, begründungspflichtige Ausnahme.
- Überarbeitungen sollen für den Einreicher einfach wirken: derselbe private Arbeitsstand wird korrigiert und erneut eingereicht, ohne sichtbare Inhaltsversionen anzusammeln.
- Der Tombstone dient ausschließlich Nachvollziehbarkeit und Missbrauchsschutz, nicht als verstecktes Archiv gelöschter Inhalte.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- `.planning/todos/pending/2026-06-03-credits-ui-konsolidierung-und-permission-bruecke.md` — die generische Credit-zu-Permission-Brücke und Konsolidierung der Credits-UI bleiben außerhalb von Phase 107; diese Phase nutzt die bestehende Permission Engine nur für Review-Delegationen.

</deferred>

---

*Phase: 107-Bestätigung, Delegation und Ablehnungslebenszyklus*
*Context gathered: 2026-07-23*
