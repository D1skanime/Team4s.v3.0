# Phase 80: `/admin/users` + User Detail Drawer (scoped Rechte) - Context

**Gathered:** 2026-06-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Start der globalen User- und Rechtezentrale: eine `/admin/users`-Liste plus ein User-Detail-Drawer als Rechte-/Übersichtszentrale. Erster Ausbau — nicht jede Spezialberechtigung ist sofort editierbar. Greenfield (keine bestehende `/admin/users`-Route).

**Gelockt aus Milestone v1.2 (Entscheidung 11 + Locks H/I/J/K) — NICHT neu zu entscheiden:**
- Nur **Plattform-Admin** erreicht die globale Zentrale; Leader sehen gruppenspezifische Rechte in `/admin/fansubs/[id]/edit` (Lock I).
- Rechte werden **scoped** gedacht (gruppen-/release-version-bezogen), nie pauschal.
- **Keine** Rechte aus Contributions ableiten; Gruppenmitgliedschaft ist keine pauschale Adminfähigkeit; **keine** Medienrechte ohne Scope.
- **Alle** rechte-/statusändernden Aktionen sind auditierbar (kein Audit umgehen).
- **Contract-Disziplin (Lock K):** keine Ad-hoc-Fetches, keine neuen Endpunkte ohne OpenAPI- + Backend- + Frontend-Abgleich; alle API-Aufrufe über `frontend/src/lib/api.ts`.
- Drawer-Tabs (aus Entscheidung 11): Übersicht, globale Rollen, Member-Profil/Claims, Gruppenmitgliedschaften, Gruppenrechte, Contributions, Medien, Audit, vorbereitete Streaming-Grants.
- Datenquellen (aus Entscheidung 11): `app_users`, `app_user_global_roles`, `fansub_group_members`, `fansub_group_member_roles`, `member_claims`, `member_claim_invitations`, `anime_contributions`, `media_assets`, Audit-Tabellen.

</domain>

<decisions>
## Implementation Decisions

### Editierbarkeits-Scope (v1 — „nicht jede Spezialberechtigung sofort editierbar")
- **D-01:** Globale Rollen (`app_user_global_roles`) sind in v1 **editierbar** — Plattform-Admin kann globale Rollen im Drawer vergeben/entziehen; jede Änderung wird auditiert (`audit_logs`, Outcome `allowed`, Actor = Plattform-Admin). Das ist der Hauptzweck der globalen Rechtezentrale.
- **D-02:** Accountstatus (z.B. aktiv/gesperrt/deaktiviert) ist in v1 **editierbar** (sperren/aktivieren) mit Audit. **VORBEHALT (Research-Flag R-01):** nur falls `app_users` ein editierbares Statusfeld besitzt. Ist der Accountstatus Keycloak-gehoheitet, fällt v1 auf **read-only Anzeige** zurück bzw. braucht einen expliziten Keycloak-Seam — das klärt der Researcher VOR der Planung.
- **D-03:** Scoped Gruppen-/Release-Version-Rechte sind im globalen Drawer **read-only** (volle Anzeige). Das tatsächliche Vergeben/Entziehen bleibt **scoped in `/admin/fansubs/[id]/edit`** (Lock I) — keine Duplizierung der Leader-Editierfläche im globalen Drawer.
- **D-04:** „Vorbereitete Streaming-Grants" + nicht-priorisierte Spezialrechte = sichtbarer, klar gekennzeichneter **Stub** ohne Schreibaktion (passend zu „erster Ausbau").

### Listen-UX `/admin/users`
- **D-05:** **Breite Aggregat-Tabelle** — alle Aggregate als Spalten: User (Name/E-Mail), Accountstatus, globale Rollen, verknüpftes Member-Profil, Gruppenmitgliedschaften, Leader-Kontexte, offene Claims, offene Contributions, Medienuploads, letzte Aktivität, Konflikte.
- **D-06:** **Suche** (Name/E-Mail) + **Kernfilter** (Accountstatus, globale Rolle, „hat Konflikte") + **Sortierung** nach letzter Aktivität.
- **D-07:** **Server-seitige Pagination** (limit/offset oder Cursor), vertragskonform (Lock K); Aggregate werden pro Seite berechnet. **Research-Flag R-02:** effiziente Aggregat-Query pro Seite (kein N+1 über Claims/Contributions/Medien/Konflikte).

### Drawer-Aufbau & Reuse
- **D-08:** Bestehende **`@/components/ui` Drawer + Tabs** wiederverwenden (GDS-konform), eigene User-Detail-Inhalte. **NICHT** das 3943-Zeilen-Monolith-Muster aus `/admin/fansubs/[id]/edit/page.tsx` replizieren — saubere, modulare Tab-Komponenten (450-Zeilen-Limit pro Datei).
- **D-09:** **Lazy-Load pro Tab** — Tab-Daten erst beim Aktivieren über gescopte Endpunkte laden (kein schwerer All-in-One-Fetch).
- **D-10:** **Volle Anzeige-Listen je Tab**, ABER Schreibaktionen nur gemäß Editierbarkeits-Scope (D-01..D-04): global = Rollen + Accountstatus editierbar; scoped Domains (Gruppenrechte/Contributions/Medien) = volle Anzeige + Verwaltung via **Deep-Link** in die kanonische Fläche (Lock I/F, keine Duplizierung). Übersicht-/globale-Rollen-/Audit-Tabs sind voll funktional.

### „Konflikte"-Definition & Signalisierung
- **D-11:** 4 Konflikt-Typen in v1: (a) offener Claim trotz bereits verknüpftem Member-Profil (`member_claims`/`member_claim_invitations`), (b) Gruppenmitglied ohne zugewiesene Rolle (`fansub_group_members` ohne `fansub_group_member_roles`), (c) Medien/Owner ohne gültigen Scope (`owner_consistent = false`, vgl. Phase 78/79), (d) offener Contribution-Dispute (`anime_contributions.dispute_state = 'open'`, Phase 72).
- **D-12:** Signalisierung: Warn-**Badge** mit Anzahl in der Listenzeile + Listen-**Filter** „nur mit Konflikten" + konkrete **Aufschlüsselung im Übersicht-Tab** des Drawers (konsistent mit Badge-Pattern aus Phase 78/79).

### Research-Flags (für gsd-phase-researcher, VOR Planung zu klären)
- **R-01:** Hat `app_users` ein editierbares Statusfeld, oder ist der Accountstatus Keycloak-gehoheitet? Entscheidet, ob D-02 ein Team4s-DB-Write, ein Keycloak-Seam oder read-only-Fallback ist.
- **R-02:** Effiziente Aggregat-Query pro Listenseite (LATERAL/Subqueries) für Claims/Contributions/Medien/Konflikte ohne N+1.
- **R-03:** Genaues globale-Rollen-Modell (`app_user_global_roles`): Struktur, Repräsentation von `platform_admin`, Assign/Revoke-Seam + Audit-Event-Namen.
- **R-04:** Effiziente Berechnung der 4 Konflikt-Typen pro User (Liste + Drawer).

### Claude's Discretion
- Exakter Endpunktschnitt pro Tab und genaue OpenAPI-Form (innerhalb Lock K: OpenAPI + Backend + `api.ts` gemeinsam).
- Konkrete Spaltenreihenfolge/Verdichtung der breiten Tabelle (Lesbarkeit), solange alle Aggregate aus D-05 vertreten sind.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone-/Phasen-Definition (maßgeblich)
- `.planning/milestones/v1.2-DISCUSSION.md` §"Entscheidung 11: Rechte scoped" — Detailquelle für Phase 80 (Liste, Drawer-Tabs, Datenquellen, scoped-Denken, Nicht-Erlaubt-Liste).
- `.planning/milestones/v1.2-DISCUSSION.md` §"Finale Entscheidungen (A–K, LOCKED)" — Locks **H** (Claims/Requests/Contributions getrennt), **I** (Rechte scoped, `/admin/users` starten, keine Rechte aus Contributions, keine pauschalen Medienrechte), **J** (Memorial), **K** (Contract/API-Disziplin Pflicht).
- `.planning/ROADMAP.md` §"Phase 80" — Goal + 5 Success Criteria.

### Rechte-/Audit-/Capability-Muster (Wiederverwendung)
- `backend/internal/permissions/permissions.go` — scoped-Rechte-Engine (`CanForFansubGroup`, Action-Konstanten, Plattform-Admin-Check).
- `backend/internal/handlers/fansub_media_review_handler.go` (Phase 78) — Audit-Muster: `AuditLogEntry` mit `EventType`, `ScopeType`/`ScopeID`, `TargetType`/`TargetID`, Outcome `allowed`/`denied`; Deny-Audit-Seam.
- `.planning/phases/78-leader-workspace-review-pflege/78-CONTEXT.md` + `78-SUMMARY.md` — Capability-Gating (`FansubGroupCapabilities`), `owner_consistent`-Flag, Lock-F-Nicht-Duplizierung.
- `.planning/phases/79-medien-ownership-in-ui-durchsetzen/79-CONTEXT.md` — Owner-Scope-Konsistenz (relevant für Konflikt-Typ (c)).

### Schema-Fundament
- `database/migrations/0097_v12_status_foundation.up.sql` (Phase 72) — `review_statuses`, `dispute_state` auf `anime_contributions` (Konflikt-Typ (d)), Status-Achsen.

### Projektregeln
- `CLAUDE.md` — `@/components/ui`-Primitives Pflicht; Umlaut-Regel (deutsche UI-Strings); 450-Zeilen-Dateilimit; Contract-Disziplin; Audit-Attribution per User-ID.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@/components/ui`: `Drawer`, `Tabs`, `Table`, `Badge`, `Select`, `FormField`, `Button`, `Input` — decken Liste + Drawer + Filter + Edit-Controls ab (Showcase: `/dev/ui-system`).
- Audit-Seam aus Phase 78 (`AuditLogEntry` + `auditPermissionDenied`) — direkt für Rollen-/Status-Schreibaktionen wiederverwendbar.
- Permission-Service (`permissions.go`) — Plattform-Admin-Gate für die gesamte globale Zentrale.
- `owner_consistent`-Flag (Phase 78/79) — Basis für Konflikt-Typ (c).

### Established Patterns
- Capability-Gating per Rollen-/Permission-Abfrage (Phase 78) — hier: harte Plattform-Admin-Schranke serverseitig auf JEDEM neuen Endpunkt + im Route-Gate.
- Contract-Fluss (Lock K): `shared/contracts/admin-content.yaml` → Backend-Handler → `frontend/src/lib/api.ts` gemeinsam ändern.

### Integration Points
- Neue Route `frontend/src/app/admin/users/` (Liste + Drawer) — Greenfield.
- Neue Backend-Handler + Registrierung in `backend/cmd/server/admin_routes.go` + Konstruktion in `main.go`.
- Admin-Navigation: neuen `/admin/users`-Eintrag nur für Plattform-Admin sichtbar.
- **Antipattern-Warnung:** `/admin/fansubs/[id]/edit/page.tsx` (3943 Z.) ist ein gewachsener Monolith — als Tab-/Drawer-*Referenz* nützlich, aber als Struktur NICHT nachbauen (siehe offenes Todo zur Aufteilung).

</code_context>

<specifics>
## Specific Ideas

- Drawer-Tab-Reihenfolge folgt Entscheidung 11: Übersicht → globale Rollen → Member-Profil/Claims → Gruppenmitgliedschaften → Gruppenrechte → Contributions → Medien → Audit → (Stub) Streaming-Grants.
- Konflikt-Badge nutzt dasselbe Warn-Badge-Vokabular wie Phase 78/79 („prüfen"-Semantik).

</specifics>

<deferred>
## Deferred Ideas

- Editieren scoped Gruppen-/Release-Rechte **im globalen Drawer** (statt read-only + Deep-Link) — bewusst späterer Ausbau; v1 hält Lock I.
- Voll funktionale Streaming-Grants — v1 nur Stub.
- Weitere Spezialberechtigungen editierbar machen — späterer Ausbau.

### Reviewed Todos (not folded)
- `2026-05-28-profile-hub-content-activity-redesign.md` — UI-Redesign von `/me/profile`; gehört nicht zur globalen User-/Rechtezentrale.
- `2026-06-03-contribution-dropdown-auf-globale-ui-primitives-umstellen.md` — Phase-67-Folgearbeit (Contribution-UI), nicht Phase 80.
- `2026-06-03-credits-ui-konsolidierung-und-permission-bruecke.md` — Credits-UI/Design im Fansub-Workspace, nicht die globale User-Liste.
(Schwache Keyword-Treffer „app/admin" — bewusst nicht eingefaltet.)

</deferred>

---

*Phase: 80-admin-users-user-detail-drawer-scoped-rechte*
*Context gathered: 2026-06-06*
