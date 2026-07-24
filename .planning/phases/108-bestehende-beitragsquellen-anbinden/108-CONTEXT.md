# Phase 108: Weitere bestehende Quellen anbinden und bei Bestätigung wirklich Punkte buchen - Context

**Gathered:** 2026-07-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 108 bindet die bestehende Release-Besetzung und den bestehenden Anime-/Fansub-Projekttext an das Punktebuch aus Phase 106 an. Tatsächliche Fansub-Arbeit wird pro Member, Release und Rolle gewürdigt; der erstmalige Projekttext erhält einen kleinen einmaligen Credit. Die Phase korrigiert zugleich die heutige Ganzes-Release-Fallbacklogik zu vollständig gespeicherten Release-Besetzungen.

Release-Version-Texte und Release-Version-Medien sind bereits durch Phase 107.1 angebunden und werden nicht erneut verdrahtet. Metadatenpflege, Anime-Stammdatenmedien, Zuweisungsarbeit und sonstige Plattform-Administration bleiben punktelos. Bestehende Testdaten werden weder migriert noch nachgebucht.

</domain>

<decisions>
## Implementation Decisions

### Punktfähige Quellen
- **D-01:** Rollen-Zuweisungen belohnen nicht die Verwaltungsaktion. Sie dokumentieren, welcher Member an welchem Release in welcher Rolle tatsächlich gearbeitet hat.
- **D-02:** Die kleinste punktfähige Rollenquelle ist `Member × Release × Rolle`. Jede solche tatsächliche Leistung gibt genau 1 Punkt; alle Rollen sind gleich gewichtet.
- **D-03:** Mehrere Members dürfen dieselbe Rolle am selben Release gemeinsam ausüben. Jede tatsächlich beteiligte Person erhält ihre eigene Einheit.
- **D-04:** Release-Version-Texte und Release-Version-Medien bleiben ausschließlich Phase 107.1. Metadatenpflege bleibt vollständig punktelos, weil sie derzeit Plattform-Admin-Arbeit ist.
- **D-05:** Der bestehende Anime-/Fansub-Projekttext ist die einzige weitere Textquelle dieser Phase. Der Member des Leaders, der erstmals einen nichtleeren Projekttext speichert, erhält einmalig 5 Punkte. Es gibt dafür keine Fremdprüfung.

### Member-Identität und Empfänger
- **D-06:** Rollenpunkte gehören ausschließlich dem fachlich beteiligten `member`, niemals dem eintragenden Leader oder dessen `app_user`.
- **D-07:** Ein Account oder Login ist nicht erforderlich. Eine historische Person wird zuerst als dauerhafte historische Member-Identität angelegt und danach den Releases und Rollen zugeordnet.
- **D-08:** Projekttext-Punkte gehören dem Member des tatsächlichen ersten Autors. Fehlt dem schreibenden Leader eine Member-Verknüpfung, entsteht keine Buchung. Spätere Bearbeiter erhalten keine Punkte.
- **D-09:** Eintragen, Bestätigen, Ändern, Entfernen oder Korrigieren von Besetzungen erzeugt keine zusätzlichen Verwaltungs- oder Review-Punkte.

### Vollständige Release-Besetzung
- **D-10:** Jeder Release speichert eine vollständige eigene Besetzung mit allen beteiligten Members und Rollen. Die heutige Backend-Auflösung „irgendein Release-Eintrag ersetzt das gesamte Projektteam beim Lesen“ ist nicht das Zielmodell.
- **D-11:** Beim Anlegen eines Releases wird die zu diesem Zeitpunkt aktuelle Projektbesetzung vollständig als Release-Snapshot gespeichert. Der Release-Editor lädt und bearbeitet immer diesen vollständigen gespeicherten Satz.
- **D-12:** Solange ein Release noch nie individuell bearbeitet wurde, werden spätere Projektteam-Änderungen in seinen Snapshot fortgeführt. Neu angelegte Releases übernehmen ebenfalls die jeweils aktuelle Projektbesetzung.
- **D-13:** Nach der ersten individuellen Bearbeitung wird die vollständige Release-Besetzung unabhängig. Spätere Projektteam-Änderungen verändern sie nicht, und es gibt weder automatische Teilzusammenführung noch eine Aktion „Projektbesetzung neu übernehmen“.
- **D-14:** Das Anpassen einer Rolle an einem Release beeinflusst andere Rollen nicht. Beispiel: Projektweit gelten Gon/Übersetzung, Mia/QC und Anton/Edit. Wird Release 176 auf Gon/Übersetzung+QC und Anton/Edit geändert, verliert nur Mia die QC-Einheit; Anton bleibt beteiligt.

### Buchung, Korrektur und Storno
- **D-15:** Jede Rollen- oder Besetzungsänderung und alle daraus folgenden Ledger-Buchungen beziehungsweise Gegenbuchungen committen atomar: vollständig oder gar nicht.
- **D-16:** Wiederholtes Speichern oder Wiederholen desselben Requests erzeugt keine Doppelpunkte. Der fachliche Quellenschlüssel muss Member, realen Release und Rolle stabil adressieren.
- **D-17:** Falsch dokumentierte oder später entfernte Leistungen werden nicht aus dem append-only Punktebuch gelöscht. Ihre ursprünglichen Buchungen bleiben erhalten und werden genau einmal durch nachvollziehbare Gegenbuchungen storniert.
- **D-18:** Wird eine Besetzung korrigiert, werden alle wegfallenden Einheiten storniert und alle neu hinzukommenden Einheiten in derselben fachlichen Aktion gebucht.
- **D-19:** Wird der Projekttext vollständig gelöscht, werden seine 5 Punkte storniert. Ein später neu angelegter Projekttext kann einmalig 5 Punkte für seinen dann ersten Autor erzeugen.
- **D-19a:** Wird eine zuvor stornierte identische `Member × Release × Rolle`-Leistung später wieder fachlich gültig und erneut hinzugefügt, stellt eine neue append-only Wiederherstellungsbuchung ihren wirksamen Punkt genau einmal wieder her. Wiederholte Requests oder unverändertes Speichern erzeugen keine weiteren Punkte.

### Disponible Testdaten
- **D-20:** Team4s verwendet disponible Testdaten. Phase 108 plant und implementiert keine Bestandsdatenmigration, historische Nachbuchung, keinen Backfill und keine Übergangskompatibilität für bestehende Rows.
- **D-21:** „Historischer Member“ und „historische Fansub-Leistung“ beschreiben reale Personen und frühere Arbeit, nicht einen technischen Import. Diese Daten werden frisch über den kanonischen Produktfluss erfasst und dabei unmittelbar nach den neuen Regeln gebucht.
- **D-22:** Schema-Migrationen für die neue Struktur sind erlaubt und bleiben der normale technische Mechanismus. Nur die Übernahme oder Erhaltung vorhandener Testdaten ist ausdrücklich ausgeschlossen.

### the agent's Discretion
- Exakte Namen für Snapshot-/Synchronisationsstatus, Point-Rule-Codes, SourceRefs und Audit-Events, solange die Entscheidungen oben und die bestehenden Phase-106-Seams eingehalten werden.
- Die konkrete transaktionale Service-/Repository-Aufteilung, sofern kein paralleles Punktebuch, keine zweite Member-Identität und keine neue Universal-Contribution-Domain entstehen.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Verbindlicher Phase-Kontext
- `.planning/ROADMAP.md` — Phase-108-Grenze und Abhängigkeiten; die verkürzte Überschrift wird durch diesen Kontext präzisiert.
- `.planning/REQUIREMENTS.md` — bestehende Milestone- und Phasenanforderungen.
- `.planning/phases/106-member-gamification-punktefundament/106-CONTEXT.md` — Member-zentriertes, versioniertes und append-only Punktefundament.
- `.planning/phases/107-best-tigung-delegation-und-ablehnungslebenszyklus/107-CONTEXT.md` — Identitäts-, Audit-, Storno- und Review-Grundsätze.
- `.planning/phases/107.1-release-pr-fworkspace-und-release-beitragslebenszyklus/107.1-CONTEXT.md` — bereits angebundene Release-Version-Texte und -Medien; nicht erneut verdrahten.
- `.planning/notes/260722-member-gamification-DECISION.md` — Produktbasis für Member-Verdienste und Punktebuch. Abschnitt 6 zur Bestandsnachbuchung ist für das disponible Testsystem durch D-20 bis D-22 und den Implementierungsvertrag überholt.

### Architektur und Arbeitsvertrag
- `AGENTS.md` — harte Projektregeln, insbesondere „Disposable Test Data“ sowie Fansub-/Release-Ownership.
- `docs/engineering/implementation-contract.md` — verbindlicher „Disposable Test Data Contract“ und Reuse-first-Workflow.
- `docs/architecture/db-schema-fansub-domain.md` — kanonische Member-, Anime-Contribution-, Release- und Rollen-Ownership.
- `docs/api/api-contracts.md` — Contract-first-Regeln für geänderte Endpunkte und DTOs.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/internal/services/point_service.go`: einzige Buchungsseam für regelversionsstabile, idempotente Buchungen und Stornos.
- `backend/internal/repository/point_ledger_repository.go` und `backend/internal/repository/point_rules_repository.go`: append-only Ledger und fester Punktekatalog aus Phase 106.
- `backend/internal/repository/anime_contributions_upsert_repository.go`: vorhandener transaktionaler Upsert für Member-/Anime-/Release-Kontext und atomaren Rollenersatz innerhalb einer Contribution.
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx`: vorhandener Projektteam-Editor.
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.tsx`: vorhandener Editor für die Release-Besetzung; als UI-Seam weiterverwenden.

### Established Patterns
- PointService-Aufrufer erzeugen keinen eigenen Punktwert oder freien Idempotenzschlüssel; RuleRef und SourceRef bestimmen die stabile Buchung.
- Punkte gehören `members`; `app_users` bleiben optionale handelnde Akteure.
- Korrekturen verwenden Gegenbuchungen statt Update oder Delete bestehender Ledger-Einträge.
- API-Änderungen müssen Backend, `shared/contracts/openapi.yaml`, gegebenenfalls `shared/contracts/admin-content.yaml`, Frontend-Typen und `frontend/src/lib/api.ts` gemeinsam ändern.

### Integration Points
- `backend/internal/repository/admin_content_fansub_releases_contributions_repository.go`: liefert derzeit entweder sämtliche Release-Einträge oder sämtliche Projekt-Defaults. Diese Ganzes-Release-Fallbacklogik erfüllt D-10 bis D-14 nicht und muss ersetzt werden.
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.tsx`: kopiert heute beim ersten Speichern das geladene Projektteam in Release-Einträge, verwendet aber mehrere unabhängige Requests und besitzt noch keinen expliziten Snapshot-/individuell-bearbeitet-Status.
- Der Release-Erstellungspfad muss den vollständigen Projektteam-Snapshot erzeugen und die dazugehörigen Punkte in derselben transaktionalen Domänenaktion buchen.
- Projektteam-Änderungen müssen ausschließlich noch unveränderte Release-Snapshots synchronisieren; individuell bearbeitete Releases bleiben unangetastet.
- Der Projekttext-Pfad für `anime_fansub_project_notes` muss erstmalige Anlage, vollständige Löschung, Autor-Member und idempotente 5-Punkte-Buchung/Storno verbinden.

</code_context>

<specifics>
## Specific Ideas

- Leitbeispiel: Bei 12 Releases erhält Mia als projektweite Timerin 12 Punkte. Ben ist projektweit QC; wenn Anton bei Release 11 allein QC macht, erhält Ben 11 und Anton 1 Punkt.
- Historische Würdigung ist zentral: Gon kann 220 Naruto-Releases übersetzt haben und dafür 220 Punkte besitzen, obwohl er keinen Account hat, verstorben ist oder sich Jahrzehnte später nicht mehr für die Plattform interessiert.
- Konkreter Regressionstest: Projektteam Gon/Übersetzung, Mia/QC, Anton/Edit. Release 176 wird individuell zu Gon/Übersetzung+QC und Anton/Edit geändert. Nur Mias QC-Punkt für Release 176 wird storniert; Gon erhält QC zusätzlich; Anton bleibt unverändert beteiligt.

</specifics>

<deferred>
## Deferred Ideas

- Ranglisten und öffentliche Darstellung historischer Members bleiben in den dafür vorgesehenen späteren Phasen.
- Keine offenen Todos wurden in Phase 108 übernommen; die automatisch vorgeschlagenen UI-/Media-Todos waren nicht Teil dieses Quellenadapter-Scopes.

</deferred>

---

*Phase: 108-weitere-bestehende-quellen-anbinden-und-punkte-buchen*
*Context gathered: 2026-07-24*
