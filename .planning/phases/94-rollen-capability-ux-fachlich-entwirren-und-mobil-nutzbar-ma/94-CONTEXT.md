# Phase 94: Rollen-/Capability-UX fachlich entwirren und mobil nutzbar machen - Context

**Gathered:** 2026-06-30
**Status:** Ready for planning
**Source:** PRD Express Path (Auftrag aus dem `/gsd-plan-phase 94`-Aufruf)

<domain>
## Phase Boundary

Diese Phase trennt die drei vermischten Rollenkontexte in Team4s fachlich sauber und macht die
Rollen-/Capability-Verwaltung mobil bedienbar. Es werden **keine** neue Rechte-Engine, **keine**
grosse Domain-Migration und **keine** Umstellung des Anime-Contribution-Modells gebaut.

Drei fachlich unterschiedliche Rollenkontexte:

- **A. Aktive App-Gruppenrollen** — gelten für aktuelle App-Mitglieder einer Fansub-Gruppe und
  steuern aktive Rechte. Persistenz: `fansub_group_member_roles`. Zulässige Rollen:
  `FansubGroupRoleCode` / `FANSUB_GROUP_ROLE_OPTIONS` (= `permissions.fansubGroupRoleCatalog`).
  Frontend: aktive Mitgliederverwaltung (`FansubAppMembersSection`).
- **B. Historische Gruppenrollen** — historisch-deskriptive Funktionen einer Person in einer
  Gruppe. Persistenz: `hist_group_member_roles`. Quelle: `role_definitions` mit Kontext
  `group_history`. Frontend: historischer Rollen-Dialog in `GroupMembersTab`. Beispiele:
  Gründer/in (`founder`), Gruppenleitung (`leader`), Co-Leitung (`co_leader`),
  Projektmanagement (`project_manager`). Diese Rollen dürfen **nie** App-Rechte oder Capabilities
  erzeugen.
- **C. Anime-Beitragsrollen** — Mitarbeit an Anime/Release/Projekt. Kontext: `anime_contribution`.
  Nicht mit aktiven App-Gruppenrechten vermischen. In dieser Phase nur zur Abgrenzung relevant.

Die Capability-Verwaltung (`/admin/role-capabilities`) darf nur Rollen bearbeiten, die wirklich
permission-bearing und assignable sind. Sie wird von einer breiten Vollmatrix auf eine
rollenbasierte, kategorisierte und bei 390 px ohne horizontales Scrollen bedienbare Oberfläche
umgebaut.

### Beobachteter Ist-Zustand (Phase-A-Analyse)

- `role_definitions(code, label_de, contexts TEXT[], sort_order)` (Migration 0085) ist die
  zentrale Rollenquelle. `contexts` ist **kein** sauberer Diskriminator: `fansub_lead` trägt laut
  Migration 0100 nur `['group_history']`, `project_lead`/`project_manager` tragen sowohl
  `anime_contribution` als auch `group_history`. Reine Historik-Rollen (`founder`, `leader`,
  `co_leader`) tragen nur `group_history` und haben **keine** `role_capabilities`-Einträge.
- `permissions.fansubGroupRoleCatalog` (in `backend/internal/permissions/permissions.go`,
  exportiert via `FansubGroupRoles()` / `IsKnownFansubGroupRole()`) ist der zuverlässige Katalog
  der 10 aktiven App-Gruppenrollen — identisch zu `FANSUB_GROUP_ROLE_OPTIONS` / `FansubGroupRoleCode`.
- `repository.ListCapabilityMatrix` macht `CROSS JOIN role_definitions rd` und liefert damit ALLE
  Rollen inkl. `founder`/`leader`/`co_leader`/`admin`/`other`/`project_manager`. `GrantRoleCapability`
  / `RevokeRoleCapability` akzeptieren jeden `role_code` ohne Rollen-Typ-Guard.
- `GroupMembersTab.tsx` (1209 Zeilen) verwendet im historischen Rollen-Dialog (Zeile ~1097)
  `FANSUB_GROUP_ROLE_OPTIONS.map` mit nativem `<select>/<option>` — falscher Rollenkontext **und**
  Verstoss gegen das globale UI-Primitives-Gebot.
- `FansubAppMembersSection.tsx` (1064 Zeilen) nutzt `FANSUB_GROUP_ROLE_OPTIONS` korrekt für aktive
  Rollen, beschriftet sie aber als „Rollen“/„Aufgaben“ statt „Aktive Rechte“.
- Beide Mitglieder-Komponenten liegen bereits deutlich über dem 450-Zeilen-Limit
  ([[feedback_line_limit_exceptions_narrow]]) und müssen vor/bei Änderung aufgeteilt werden.
- Phase 94 baut direkt auf Phase 86 (datengetriebene Capability-Registry,
  `action_definitions`/`role_capabilities`) und Phase 87 (Capability-Pflege-UI + Contract) auf.

</domain>

<decisions>
## Implementation Decisions

Jede Entscheidung ist eine gelockte Vorgabe aus dem Auftrag (Acceptance Criteria 1–11). IDs `D-01..D-14`
sind die nachverfolgbaren Decision-Anker für die Plan-/Verify-Gates.

### Rollenkontext-Trennung (Backend/Datenmodell)
- **D-01** Aktive App-Gruppenrollen bleiben in `fansub_group_member_roles`; zulässige Rollen sind
  genau `permissions.FansubGroupRoles()` (= `FANSUB_GROUP_ROLE_OPTIONS`). Keine historischen Rollen
  hier. *(AC 4)*
- **D-02** Historische Gruppenrollen bleiben in `hist_group_member_roles` und stammen aus
  `role_definitions` mit Kontext `group_history`. *(AC 1, 3)*
- **D-03** „Permission-bearing & assignable" wird definiert als: `role_code` ist in
  `permissions.fansubGroupRoleCatalog` (der App-Gruppenrollen-Katalog). Reine Historik-Rollen
  (`founder`, `leader`, `co_leader`) und Nur-Contribution-Rollen (`admin`, `other`,
  `project_manager`) sind **nicht** capability-editierbar. Entscheidung minimal/risikoarm — keine
  neue Spalte/Migration erforderlich, der vorhandene Katalog ist die Quelle der Wahrheit.
  Der Planner darf alternativ eine schema-getriebene `assignable`/`is_assignable`-Quelle wählen,
  **falls** sie ohne grosse Migration und ohne Bruch der Phase-86-Registry umsetzbar ist; die
  Default-Quelle bleibt der Katalog. *(AC 6, 7)*

### Backend/API Capability-Guard
- **D-04** Capability-API liefert pro Rolle Kontext-/Assignability-Metadaten mit (z. B.
  `assignable: boolean` und Kontext-Information für Badges), **oder** filtert serverseitig auf
  permission-bearing Rollen. Bevorzugt: Metadaten mitliefern, damit das Frontend Badges/Disabled
  ableiten kann. *(AC 6)*
- **D-05** `GrantRoleCapability` / `RevokeRoleCapability` blockieren jede Mutation an rein
  historischen (nicht-assignable) Rollen **serverseitig** mit kontrolliertem, verständlichem Fehler
  (eigener Fehlercode, z. B. `role_not_assignable`; HTTP 409 oder 422). Nicht nur im Frontend
  verstecken. *(AC 7)*
- **D-06** Bei API-Shape-Änderung werden synchron aktualisiert: `shared/contracts/admin-capabilities.yaml`,
  Frontend-Typen (`@/types/admin-capability`), API-Client/Helper (`@/lib/api`), betroffene Tests.
  Keine stillen Breaking Changes. *(AC 11)*

### Historische Rollen-UI (`GroupMembersTab`)
- **D-07** Der historische Rollen-Dialog verwendet **nicht mehr** `FANSUB_GROUP_ROLE_OPTIONS`,
  sondern eine eigene `group_history`-Rollenliste. Verfügbar müssen sein: Gründer/in,
  Gruppenleitung, Co-Leitung, Projektmanagement. Diese werden in `hist_group_member_roles`
  gespeichert und nie als aktive App-Rechte angezeigt/gesetzt. Quelle der Liste: bevorzugt
  serverseitig aus `role_definitions` (Kontext `group_history`) geladen; eine frontend-seitige
  Konstante analog `FANSUB_GROUP_ROLE_OPTIONS` ist nur zulässig, wenn sie eindeutig als
  historischer Kontext geführt wird und mit dem DB-Seed übereinstimmt. *(AC 1, 3)*
- **D-08** Native `<select>/<option>` im historischen Rollen-Dialog werden durch das globale
  UI-System-Primitiv (`Select` aus `@/components/ui`) ersetzt. *(globales UI-Gebot,
  [[feedback_global_ui_primitives_mandatory]])*
- **D-09** Der historische Kontext wird sprachlich klar als frühere/historische Funktion innerhalb
  der Gruppe formuliert; keine Begriffe, die wie aktuelle App-Berechtigungen wirken. *(AC 9)*

### Aktive Mitglieder-UI (`FansubAppMembersSection`)
- **D-10** Das Label „Rollen" im aktiven App-Mitglieder-Kontext wird umbenannt zu „Aktive Rechte"
  (bevorzugt) bzw. „Aufgaben & Rechte" (kontextabhängig). Im aktiven Dialog werden keine
  historischen Rollen angezeigt; `FANSUB_GROUP_ROLE_OPTIONS` bleibt allein für aktive
  App-Gruppenrollen zuständig. *(AC 4, 5)*

### Capability-Verwaltung UI (`/admin/role-capabilities`)
- **D-11** Die breite Vollmatrix ist nicht mehr die einzige/primäre Bedienform. Desktop-Zielbild:
  links Rollenliste, rechts kategorisierte Capability-Details der gewählten Rolle; Capabilities
  nach fachlichen Kategorien gruppiert (z. B. Fansub-Verwaltung, Mitglieder, Medien, Anime/Beiträge,
  Administration — Kategorien aus `action_definitions.category`); pro Capability Beschreibung,
  aktueller Status und Aktion. *(AC 6)*
- **D-12** Mobile-Zielbild bei 390 px: Rolle auswählen → Action-Kategorien als Accordions/List-Rows
  → pro Capability ein klarer Switch/Button. Keine horizontale Vollmatrix als Hauptbedienung, kein
  verschachteltes horizontales Scrollen, keine abgeschnittenen Labels. *(AC 8)*
- **D-13** Rollen werden mit Kontext-Badges dargestellt („Aktive App-Rolle", „Historische Rolle",
  „Anime-Beitrag"). Nicht-bearbeitbare Rollen werden entweder gar nicht in der Bearbeitungsliste
  angezeigt oder klar als nicht bearbeitbar markiert — und Mutationen sind serverseitig blockiert
  (D-05), nicht nur visuell deaktiviert. *(AC 6, 7)*

### Mobile-UX & Sprache (querschnittlich)
- **D-14** Mobile-Anforderungen für alle betroffenen Dialoge bei 390 px: Touch-Ziele ≥ 44 px,
  Labels nicht abgeschnitten, Speichern/Abbrechen erreichbar, keine horizontale Pflichtbedienung;
  Fullscreen-/Bottom-Sheet-Verhalten prüfen. Deutsche UI-Texte mit korrekten Umlauten (ä/ö/ü/ß),
  alle UI über `@/components/ui`-Primitives. *(AC 8, 9)*

### Claude's Discretion
- Genaue Komponentenaufteilung von `GroupMembersTab` und `FansubAppMembersSection` zur Einhaltung
  des 450-Zeilen-Limits (z. B. historischer Rollen-Dialog als eigene Komponente).
- Genaue interne Struktur der neuen rollenbasierten Capability-UI (Master-Detail-Komponenten,
  Accordion-Implementierung über `@/components/ui`).
- Exakter HTTP-Status/Fehlercode-Name für den Assignable-Guard (innerhalb D-05).
- Ob die `group_history`-Rollenliste über einen neuen Read-Endpunkt oder eine geteilte Konstante
  bereitgestellt wird (innerhalb D-07).
- Konkrete Testaufteilung, solange die Pflichtabdeckung (AC 10) erfüllt ist.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Vorab-Lese-Pflicht (aus dem Auftrag)
- `docs/architecture/db-schema-fansub-domain.md` — Fansub-Domänen-Schema, Rollen-/Mitglieder-Tabellen.
- `docs/engineering/implementation-contract.md` — verbindliche Engineering-/Contract-Regeln.
- `docs/frontend/ui-system.md` — globales Design-System / Primitives-Pflicht.
- `docs/agent-guidelines-ui.md` — UI-Agent-Leitplanken.

### Backend — Rollen & Capabilities
- `backend/internal/permissions/permissions.go` — `fansubGroupRoleCatalog`, `FansubGroupRoles()`,
  `IsKnownFansubGroupRole()`, Action-Katalog, Cache (Quelle für D-03/D-05).
- `backend/internal/repository/authz_capability_mutations.go` — `ListCapabilityMatrix` (CROSS JOIN),
  `GrantRoleCapability`/`RevokeRoleCapability` (Guard-Einbau, D-04/D-05).
- `backend/internal/handlers/fansub_hist_group_member_roles_handler.go` — historischer
  Rollen-Handler (`hist_group_member_roles`); ggf. `group_history`-Rollenliste-Endpunkt.
- `database/migrations/0085_role_definitions_seed.up.sql` — Rollen-Seed + `contexts`-Spalte.
- `database/migrations/0100_role_definitions_fansub_lead.up.sql`,
  `database/migrations/0103_fansub_roles_group_history_context.up.sql` — Kontext-Nuancen.
- `database/migrations/0108_capability_registry.up.sql` — `role_capabilities`-Registry (Phase 86).

### Contract
- `shared/contracts/admin-capabilities.yaml` — Capability-Matrix + Grant/Revoke-Endpunkte
  (RoleEntry-Erweiterung um Assignability, neuer Guard-Fehlercode; D-04/D-05/D-06).

### Frontend — Mitglieder & Capability-UI
- `frontend/src/types/fansub.ts` — `FansubGroupRoleCode`, `FANSUB_GROUP_ROLE_OPTIONS`,
  `HistGroupMemberRole`, `CreateMemberRoleRequest`.
- `frontend/src/types/admin-capability.ts` — `RoleEntry`/`RoleActionState`/`RoleCapabilityMatrix`
  (Assignability-Felder ergänzen).
- `frontend/src/lib/api.ts` — `listRoleCapabilities`/`grantRoleCapability`/`revokeRoleCapability`
  (~Z. 9189+), `listMemberRoles`/`createMemberRole`/`updateMemberRole` (~Z. 7962+).
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx` — historischer Rollen-Dialog
  (D-07/D-08/D-09); 1209 Zeilen → Split nötig.
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx` — aktive Mitglieder
  (D-10); 1064 Zeilen → Split nötig.
- `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx`,
  `frontend/src/app/admin/role-capabilities/RoleCapabilityTable.tsx`,
  `GrantCapabilityModal.tsx`, `RevokeCapabilityModal.tsx`, `page.tsx`,
  `RoleCapabilityClient.test.tsx` — Vollmatrix → rollenbasiert/kategorisiert (D-11/D-12/D-13).
- `frontend/src/components/ui/` + Route `/dev/ui-system` — Primitive-Referenz (Select, Modal,
  Drawer, Tabs, Card, Switch/Button).

### Vorgänger-Phasen
- `.planning/phases/86-daten-getriebene-capability-registry/` — Registry-Datenmodell.
- `.planning/phases/87-sichtbarkeits-steuerung-per-rolle-capability-pflege-ui/` — Capability-UI + Contract.
- `.planning/phases/93-projektrollen-sichtbarkeit-hinweis-formular/93-CONTEXT.md` — Ownership-Abgrenzung.

</canonical_refs>

<specifics>
## Specific Ideas

- Historische Rollen-Pflichtliste im Dialog: Gründer/in, Gruppenleitung, Co-Leitung, Projektmanagement.
- Aktiv-Mitglieder-Label: „Aktive Rechte" (bevorzugt) / „Aufgaben & Rechte".
- Kontext-Badges: „Aktive App-Rolle", „Historische Rolle", „Anime-Beitrag".
- Mobile-Prüfbreite: 390 px; Touch-Ziele ≥ 44 px.
- Beispiel-Capability-Kategorien für die Detail-Gruppierung: Fansub-Verwaltung, Mitglieder, Medien,
  Anime/Beiträge, Administration (aus `action_definitions.category`).
- Guard-Negativfälle: `founder`, `co_leader` dürfen weder capability-grant/revoke noch aktive
  App-Rolle eines App-Mitglieds werden.

## Pflicht-Testabdeckung (AC 10)
- Rollenkontext-Filter (permission-bearing vs. historisch).
- Historische Rollenauswahl im Dialog (group_history-Liste, nicht FANSUB_GROUP_ROLE_OPTIONS).
- Capability-Guard gegen historische Rollen (Grant/Revoke serverseitig blockiert).
- Aktive Mitgliederrollen ohne historische Rollen.

## Checks (AC 11)
- Frontend-Tests betroffener Komponenten; Backend-Tests Capability-/Role-Validation;
  Typecheck/Lint soweit verfügbar; `git diff --check`.
</specifics>

<deferred>
## Deferred Ideas / Nicht-Ziele

- Keine neue allgemeine Rechte-Engine.
- Keine grosse Migration des gesamten Rollenmodells.
- Keine Vermischung historischer Rollen mit aktiven App-Rechten.
- Keine Umstellung des Anime-Contribution-Modells.
- Keine synthetischen Kombirollen.
- Keine neuen Public-Seiten.
- Keine kosmetische Tabellenverschönerung ohne fachliche Entkopplung.

</deferred>

---

*Phase: 94-rollen-capability-ux-fachlich-entwirren-und-mobil-nutzbar-ma*
*Context gathered: 2026-06-30 via PRD Express Path*
