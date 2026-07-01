# Phase 97: Rollen-Lifecycle — historische Rolle-Authoring, Claim-Aktivierung & tagesgenaue Historie - Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Der Lebenszyklus von Fansub-Gruppenrollen wird um die Richtung **historisch → aktiv** vervollständigt und datentechnisch korrekt abgebildet. Kern: (a) historische Rollen mit **tagesgenauen** Start-/Enddaten pro Rolle authoren (eine Person kann **mehrere** historische Rollen haben), (b) beim **Identitäts-Claim** eines historischen Mitglieds die richtige Auflösung in aktive App-Rollen, (c) aktive Rollen zuweisen können, (d) korrekte DB-Persistenz als oberste Priorität.

**Bewusst NICHT in dieser Phase (Umkehrrichtung schon erledigt):** Der „Entzug" aktiver Rollen (aktiv → historisch) ist bereits in Phase 95 gebaut (D-10 Auto-Archivierung, `fansub_group_app_members_repository.go`). Phase 97 ist die Gegenrichtung.

**Priorität:** Datenmodell + Authoring + Claim-Aktivierung + Zuweisung sind Kern. Die **polierte/öffentliche Anzeige-UI** ist bewusst nachgelagert — Historie MUSS in der DB korrekt festgehalten sein; das genaue UI-Aussehen wird später definiert.
</domain>

<decisions>
## Implementation Decisions

### Historie-Datenmodell & Authoring
- **D-01 (Mehrere historische Rollen):** Eine Person (`members`) kann **N** historische Rollen haben, je eigener Eintrag in `hist_group_member_roles` mit eigenem Zeitraum. Schema unterstützt das bereits (per-Rolle-Tabelle) — Authoring/UI muss es explizit erlauben.
- **D-02 (Tagesgenaue Daten):** `hist_group_member_roles` erhält Start-/Enddatum als **DATE** statt `started_year`/`ended_year` (Migration; Bestandsdaten Jahr→Datum mappen, z. B. 1. Jan). Aktive Rollen (`fansub_group_member_roles`, heute nur `created_at`) erhalten ein **Tenure-Startdatum (DATE)**.
- **D-03 (Rolle im Historie-Dialog wählbar):** Der Dialog „Historisches Mitglied anlegen/bearbeiten" (`/admin/fansubs/[id]/edit`, siehe Screenshot: aktuell nur Anzeigename + Beitrittsjahr + Austrittsjahr + Sichtbarkeit) MUSS die **historische Rolle(n) direkt** wählbar machen — samt tagesgenauem Start-/Enddatum pro Rolle. Ersetzt die reinen Jahr-Felder und integriert die bisher getrennte Rollenauswahl (`GroupHistRoleDialog`).

### Lifecycle-Regel & Claim-Aktivierung
- **D-04 (Enddatum-Regel):** Historische Rolle **ohne** Enddatum = Person weiterhin aktiv in dieser Rolle. **Mit** Enddatum = beendet/historisch. Es gibt KEINEN separaten „Entzug"-Button — der Zustand ergibt sich aus dem Enddatum.
- **D-05 (Claim-Aktivierung):** Beim Identitäts-Claim (historische Person loggt sich ein → „das bin ich" → Admin bestätigt den Claim → App-User) gilt: historische Rollen **ohne** Enddatum werden als **aktive App-Rollen** übernommen; für **beendete** Rollen weist der Admin ggf. eine **neue aktive Rolle** zu (die aktuelle Funktion der Person).
- **D-06 (Aktive Rollen zuweisen):** Der Admin kann einem (geclaimten) App-User aktive Rollen zuweisen — dedizierte, klar bedienbare Zuweisung.

### Capability-Abgrenzung
- **D-07 (Capability nur aktiv):** Die Capability-Matrix definiert Rechte für **aktive/rechte-tragende** Rollen. Historische Zuweisungen tragen **keine** Rechte und erscheinen nicht als eigene Capability-Objekte. Konsistent mit Phase-95-Gap-G4 (Capability editiert Rollen-DEFINITIONEN; Rechte greifen nur für aktive Zuweisungen via `canForContext`).

### Sichtbarkeit
- **D-08 (Anzeige, UI deferred):** Historische Rollen (mit Start+Enddatum) werden im **Member-Profil** angezeigt, **später auch public**. Die konkrete UI-Gestaltung ist NOCH OFFEN und wird separat definiert. Für Phase 97 zählt die **korrekte DB-Abbildung + Datenverfügbarkeit**; die polierte/öffentliche Timeline-UI ist Folgearbeit. Lockert D-11 aus Phase 95 (rein admin-intern).

### Claude's Discretion
- Konkrete Migrationsmechanik year→DATE (Bestandsdaten-Mapping), genaue API-/DTO-Formen, Wellen-Schnitt beim Planen (das Ganze ist groß — Split in DB-Migration / Authoring-UI / Claim-Flow / Zuweisung erwägen).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Rollenmodell & Lifecycle (Vorentscheidungen)
- `.planning/phases/95-rollenmodell-entwirren-gruppen-vs-projekt-ebene-techadmin-gf/95-CONTEXT.md` — D-09 (Koexistenz aktiv/historisch), D-10 (Auto-Archivierung aktiv→historisch, bereits gebaut), D-11 (Sichtbarkeit, hier gelockert), D-12 (data-driven Rollen)
- `.planning/phases/95-rollenmodell-entwirren-gruppen-vs-projekt-ebene-techadmin-gf/95-06-SUMMARY.md` — Gap G4 (Capability-Editierbarkeit entkoppelt), G1/G2, Leader-Terminologie

### Schlüssel-Code (Ist-Stand)
- `backend/internal/repository/hist_group_member_roles_repository.go` — `hist_group_member_roles`, `RoleDefinitionOption`, `ListGroupHistoryRoleDefinitions`/`ListFansubGroupRoleDefinitions`
- `backend/internal/repository/fansub_group_app_members_repository.go` — D-10 Auto-Archivierung (SetRole disable → INSERT hist), `member_claims`-Verknüpfung
- `backend/internal/permissions/permissions.go` — `canForContext` (Rechte-Auflösung über alle aktiven Gruppenrollen), `IsCapabilityBearingRole`
- `frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.tsx`, `GroupMemberFormModals.tsx`, `GroupMembersTab.tsx` — Historie-Authoring-UI (Screenshot-Dialog)
- DB: `members`, `member_claims`, `hist_fansub_group_members` (Jahr-Felder), `fansub_group_members`/`fansub_group_member_roles` (aktive Rollen, nur `created_at`)
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `hist_group_member_roles` (per-Rolle) + `hist_fansub_group_members` — trägt N historische Rollen pro Person; braucht year→DATE-Migration.
- D-10-Auto-Archivierung zeigt das Muster für hist-Schreibpfade (fail-open INSERT).
- `member_claims` verknüpft App-User ↔ `members` (Identitäts-Claim-Fundament).
- Globale `@/components/ui`-Primitives (Modal/Select/FormField/DatePicker?) — Pflicht für die Dialoge.

### Established Patterns
- Rechte-Auflösung ist zentral (`canForContext` gegen `role_capabilities`) — aktive Rollen tragen Rechte, historische nicht. Keine Änderung am Enforcement nötig.
- Rollen sind data-driven (Katalog aus `role_definitions`); Rollenauswahl per API.

### Integration Points
- Historie-Dialog (Screenshot) → um Rollenauswahl + tagesgenaue Daten erweitern.
- Claim-Bestätigungs-Flow (`member_claims`) → neue Auflösungslogik (ohne Enddatum → aktiv; mit Enddatum → historisch bleibt, neue aktive Rolle zuweisen).
- Aktive-Rollen-Zuweisung → `fansub_group_member_roles` (+ neues Tenure-Startdatum).
</code_context>

<specifics>
## Specific Ideas

- Screenshot-Referenz: Dialog „Mitglied hinzufügen — Historisches Mitglied der Fansubgruppe anlegen oder bearbeiten" — heute Anzeigename / Beitrittsjahr / Austrittsjahr / Sichtbarkeit; es fehlt die **Rollenauswahl**, und Jahre sollen **tagesgenau** werden.
- Sheppert-Beispiel: Leader 2008–2009 (Enddatum → historisch) + danach Timer aktiv (neue aktive Rolle). Ohne Enddatum wäre Leader beim Login weiterhin aktiv.
- Cookie-Subs-Beispiel (Gründung 2007 Takayuki → Leitung 2008 Sheppert → 2009 KamiKarin): typische Mehr-Rollen-/Übergabe-Historie, die korrekt in der DB landen muss.
</specifics>

<deferred>
## Deferred Ideas

- **Polierte/öffentliche Historie-Timeline-UI** (Cookie-Subs-Stil, Member-Profil + public) — Datenmodell hier, das konkrete UI-Aussehen als eigene Folge-Phase.
- **G3 Mobile:** Member-Management-UI mobil-tauglich (separater Task/Phase 96 in Arbeit).
- Ende-Automatik-Vorschlag bei Übergabe (Nachfolger-Zeile) — falls gewünscht, später.
</deferred>

---

*Phase: 97-rollen-lifecycle-historie-claim-aktivierung*
*Context gathered: 2026-07-01*
