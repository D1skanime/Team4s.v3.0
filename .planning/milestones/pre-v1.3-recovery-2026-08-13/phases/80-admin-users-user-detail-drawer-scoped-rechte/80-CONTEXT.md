# Phase 80: `/admin/users` + User Detail Drawer (scoped Rechte) - Context

**Gathered:** 2026-06-06
**Amended:** 2026-06-12 after Phase 82 closeout and Phase 83 default/override decision
**Status:** Ready for re-planning

<domain>

## Phase Boundary

Start der globalen User- und Rechtezentrale: eine `/admin/users`-Liste plus ein User-Detail-Drawer als Rechte-/Übersichtszentrale. Erster Ausbau, nicht jede Spezialberechtigung ist sofort editierbar. Greenfield: keine bestehende `/admin/users`-Route.

**Post-82/83 Update:** Phase 80 bleibt eine globale Plattform-Admin-Übersicht, muss aber das neue Fansub-Release-Modell verstehen:
- `anime_contributions.member_id` ist der kanonische Member-Anker.
- `anime_contributions.fansub_group_member_id` ist Legacy/Fallback.
- Projektweite Contributions (`release_version_id IS NULL`) können Default-Mitwirkende für Release-Versionen sein.
- Release-Version-Overrides gelten nur für die konkrete Release-Version.
- Contributor-Medien und Notizen leben in `/me/releases/[versionId]/workspace`; `/admin/users` zeigt und verlinkt, dupliziert die Arbeitsfläche aber nicht.

**Gelockt aus Milestone v1.2, aktualisiert nach Phase 82/83:**
- Nur **Plattform-Admin** erreicht die globale Zentrale; Leader sehen gruppenspezifische Rechte in `/admin/fansubs/[id]/edit`.
- Rechte werden scoped gedacht, also gruppen- oder release-version-bezogen, nie pauschal.
- Keine pauschalen Rechte aus Contributions ableiten. Ausnahme nach Phase 83: Release-Version-Rechte dürfen aus dem expliziten Contribution-Mapping (Projekt-Default plus Release-Override) aufgelöst werden, solange der Scope konkret bleibt.
- Gruppenmitgliedschaft ist weiterhin keine pauschale Adminfähigkeit; keine Medienrechte ohne Scope.
- Alle rechte- oder statusändernden Aktionen sind auditierbar.
- Contract-Disziplin bleibt Pflicht: keine Ad-hoc-Fetches, keine neuen Endpunkte ohne OpenAPI-, Backend- und Frontend-Abgleich; API-Aufrufe über `frontend/src/lib/api.ts`.
- Drawer-Tabs: Übersicht, globale Rollen, Member-Profil/Claims, Gruppenmitgliedschaften, Gruppenrechte, Contributions, Medien, Audit, vorbereitete Streaming-Grants.
- Datenquellen: `app_users`, `app_user_global_roles`, `fansub_group_members`, `fansub_group_member_roles`, `member_claims`, `member_claim_invitations`, `anime_contributions.member_id`, legacy `anime_contributions.fansub_group_member_id`, Phase-83-Release-Overrides, `release_version_media`, `media_assets`, Audit-Tabellen.

</domain>

<decisions>

## Implementation Decisions

### Editierbarkeits-Scope
- **D-01:** Globale Rollen (`app_user_global_roles`) sind in v1 editierbar. Plattform-Admin kann globale Rollen im Drawer vergeben/entziehen; jede Änderung wird auditiert.
- **D-02:** Accountstatus ist in v1 editierbar, falls `app_users` ein editierbares Statusfeld besitzt. Wenn Keycloak den Status besitzt, fällt v1 auf read-only oder einen expliziten Keycloak-Seam zurück.
- **D-03:** Scoped Gruppen-/Release-Version-Rechte sind im globalen Drawer read-only. Das Vergeben/Entziehen bleibt scoped in `/admin/fansubs/[id]/edit` beziehungsweise dem Phase-83-Release-Cockpit.
- **D-04:** Vorbereitete Streaming-Grants und nicht-priorisierte Spezialrechte sind sichtbare Stubs ohne Schreibaktion.

### Listen-UX `/admin/users`
- **D-05:** Breite Aggregat-Tabelle mit User, Accountstatus, globalen Rollen, verknüpftem Member-Profil, Gruppenmitgliedschaften, Leader-Kontexten, offenen Claims, offenen Contributions, Medienuploads, letzter Aktivität und Konflikten.
- **D-06:** Suche nach Name/E-Mail plus Kernfilter Accountstatus, globale Rolle und "hat Konflikte"; Sortierung nach letzter Aktivität.
- **D-07:** Server-seitige Pagination. Aggregate werden pro Seite berechnet; kein N+1 über Claims, Contributions, Medien oder Konflikte.

### Drawer-Aufbau & Reuse
- **D-08:** Bestehende `@/components/ui` Drawer, Tabs, Table, Badge, Select, FormField, Button und Input wiederverwenden.
- **D-09:** Lazy-Load pro Tab; Tab-Daten erst beim Aktivieren laden.
- **D-10:** Scoped Domains zeigen volle Listen, bleiben aber read-only und verlinken in die kanonischen Arbeitsflächen. Globale Rollen, Accountstatus, Übersicht und Audit sind im Drawer funktional.
- **D-11:** Nicht das Monolith-Muster aus `/admin/fansubs/[id]/edit/page.tsx` kopieren. Phase 80 braucht modulare Drawer-Tab-Komponenten.

### Contributions, Release-Rechte und Medien nach Phase 82/83
- **D-12:** Alle User-/Member-Contribution-Queries müssen `anime_contributions.member_id` zuerst lesen und legacy `fansub_group_member_id -> hist_fansub_group_members.member_id` nur als Fallback verwenden. Erwartetes SQL-Muster: `COALESCE(ac.member_id, hfgm.member_id)`.
- **D-13:** Contributions-Tab gruppiert nach projektweiten Defaults, release-spezifischen Overrides, offenen/disputed Beiträgen und historischen/legacy Fallbacks.
- **D-14:** Release-Version-Rechte im Drawer sind resolved read-only: Phase 80 zeigt, welche Release-Version-Arbeitsflächen/Rechte aus Projekt-Defaults und Release-Overrides entstehen.
- **D-15:** `/me`-Workspace-Aktivität wird sichtbar: Medienuploads und Release-Notizen werden pro `release_version_id` angezeigt und nach `/me/releases/[versionId]/workspace` oder zur adminseitigen Release-Version verlinkt.
- **D-16:** Der globale Drawer bearbeitet Release-Notizen, Medien und Release-Contribution-Overrides nicht direkt.

### Konflikte und Signalisierung
- **D-17:** Konflikt-Typen in v1: offener Claim trotz verknüpftem Member-Profil, Gruppenmitglied ohne Rolle, Medien/Owner ohne gültigen Scope, offener Contribution-Dispute.
- **D-18:** Phase-83-Zusatzkonflikte: Release-Override verweist auf ungültige/gelöschte Release-Version; Default und Override widersprechen sich ohne klare Absenz-/Ersetzungssemantik; User hat Release-Medien/Notizen, aber keine aufgelöste Contribution-Berechtigung mehr.
- **D-19:** Signalisierung: Warn-Badge mit Anzahl in der Listenzeile, Filter "nur mit Konflikten", konkrete Aufschlüsselung im Übersicht-Tab.

### Research-Flags
- **R-01:** Hat `app_users` ein editierbares Statusfeld, oder ist der Accountstatus Keycloak-gehoheitet?
- **R-02:** Effiziente Aggregat-Query pro Listenseite mit LATERAL/Subqueries ohne N+1.
- **R-03:** Genaues globale-Rollen-Modell, inklusive `platform_admin`, Assign/Revoke-Seam und Audit-Event-Namen.
- **R-04:** Effiziente Berechnung der Konflikt-Typen pro User für Liste und Drawer.
- **R-05:** Effiziente Auflösung von Phase-83 Defaults/Overrides pro User und Seite, ohne Projekt-Defaults N-mal pro Release zu materialisieren.
- **R-06:** Exakte Phase-83-Override-Repräsentation für "nicht dabei" und Rollen-Ersetzung lesen, sobald Phase 83 umgesetzt ist.

### Claude's Discretion
- Exakter Endpunktschnitt pro Tab und genaue OpenAPI-Form innerhalb Lock K.
- Konkrete Spaltenreihenfolge und Verdichtung der breiten Tabelle, solange alle Aggregate aus D-05 vertreten sind.

</decisions>

<canonical_refs>

## Canonical References

Downstream agents müssen diese Dateien vor Planung oder Implementierung lesen.

### Milestone-/Phasen-Definition
- `.planning/milestones/v1.2-DISCUSSION.md` Entscheidung 11 und Locks H/I/J/K.
- `.planning/ROADMAP.md` Phase 80.
- `DECISIONS.md` Eintrag `2026-06-11 - Project Contributions Are Release Defaults Until Overridden`.

### Rechte-/Audit-/Capability-Muster
- `backend/internal/permissions/permissions.go`
- `backend/internal/handlers/fansub_media_review_handler.go`
- `.planning/phases/78-leader-workspace-review-pflege/78-CONTEXT.md`
- `.planning/phases/79-medien-ownership-in-ui-durchsetzen/79-CONTEXT.md`

### Schema- und Phase-82/83-Fundament
- `database/migrations/0097_v12_status_foundation.up.sql`
- `database/migrations/0104*` bis `0107*`
- Commit `076a4f31 feat: finish phase 82 fansub release cockpit`
- `.planning/phases/83-pro-release-mitwirkenden-zuordnung-release-version-id-im-coc/`

### Projektregeln
- `AGENTS.md`
- `docs/architecture/db-schema-fansub-domain.md`
- `docs/engineering/implementation-contract.md`
- `docs/api/api-contracts.md`

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets
- `@/components/ui`: Drawer, Tabs, Table, Badge, Select, FormField, Button, Input.
- Audit-Seam aus Phase 78 (`AuditLogEntry` und Deny-Audit-Seam).
- Permission-Service in `backend/internal/permissions/permissions.go`.
- Phase-82 `/me` workspace: `frontend/src/app/me/releases/[versionId]/workspace/page.tsx`.
- Release media/notes components: `ReleaseVersionMediaSection`, `useReleaseVersionMedia`, `ReleaseVersionNotesTab`.

### Established Patterns
- Plattform-Admin-Gate serverseitig auf jedem neuen `/admin/users`-Endpoint.
- Protected UI muss auf aktive Auth-Session prüfen (`hasAccessToken || hasRefreshToken`) und die zentrale API-Refresh-Naht verwenden.
- Contract-Fluss: `shared/contracts/*` -> Backend-Handler -> `frontend/src/lib/api.ts` -> Frontend-Types.

### Integration Points
- Neue Route `frontend/src/app/admin/users/`.
- Neue Backend-Handler plus Registrierung in `backend/cmd/server/admin_routes.go` und Konstruktion in `main.go`.
- Admin-Navigation: `/admin/users` nur für Plattform-Admin sichtbar.
- Contributions-Tab: canonical `member_id` plus legacy Fallback.
- Release-Rechte-/Medien-/Notizen-Tabs: Phase-83-resolved Daten lesen, also Projekt-Default plus Release-Override plus reale `release_version_id`-Aktivität.

</code_context>

<specifics>

## Specific Ideas

- Drawer-Tab-Reihenfolge: Übersicht -> globale Rollen -> Member-Profil/Claims -> Gruppenmitgliedschaften -> Gruppenrechte -> Contributions -> Medien -> Audit -> Streaming-Grants Stub.
- Übersicht zeigt kompakte Zahlen: globale Rollen, Gruppen, offene Claims, offene Contributions, Release-Arbeitsflächen, Medienuploads, Konflikte.
- Release-Arbeitsflächen-Zahl wird aus Defaults + Overrides abgeleitet, aber Details lazy geladen.
- Medien-Tab gruppiert release-version-scoped Uploads nach Anime/Release-Version und zeigt, ob der aktuelle resolved contribution scope noch passt.

</specifics>

<deferred>

## Deferred Ideas

- Direktes Bearbeiten scoped Gruppen-/Release-Rechte im globalen Drawer.
- Direktes Bearbeiten von Release-Contribution-Overrides im globalen Drawer.
- Voll funktionale Streaming-Grants.
- Weitere Spezialberechtigungen editierbar machen.

</deferred>

---

*Phase: 80-admin-users-user-detail-drawer-scoped-rechte*
*Context gathered: 2026-06-06; amended: 2026-06-12*
