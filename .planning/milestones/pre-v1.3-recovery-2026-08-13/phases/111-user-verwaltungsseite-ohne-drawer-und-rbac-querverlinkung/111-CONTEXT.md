# Phase 111: User-Verwaltungsseite ohne Drawer und RBAC-Querverlinkung - Context

**Gathered:** 2026-07-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Die Admin-User-Verwaltung `/admin/users` wird **ohne User-Detail-Drawer** neu strukturiert: Benutzerdetails werden auf einer eigenen, deep-linkbaren Detailseite **progressiv direkt auf der Seite** offengelegt statt in einen überladenen Drawer mit vielen Tabs. Zusätzlich wird eine **bidirektionale RBAC-Querverlinkung** zwischen `/admin/users` und `/admin/role-capabilities` eingeführt (Rollen-Links zur Capability-Detailansicht + Impact-Count mit Sprung zur gefilterten User-Liste).

Die fachliche Trennung bleibt bestehen: `/admin/users` = Personenverwaltung, `/admin/role-capabilities` = RBAC-Regelverwaltung. Die beiden Flächen werden verlinkt, aber **nicht verschmolzen**.

Eigenes UX-Anliegen — **nicht** Teil des Rollenmodell-Reworks (Phase 94).

</domain>

<decisions>
## Implementation Decisions

### Detail-Struktur ohne Drawer
- **D-01:** Der User-Detail wird eine **eigene, deep-linkbare Route `/admin/users/[id]`** (Server-Route unter `PlatformAdminGate`, analog zur bestehenden `page.tsx`-Konvention). Klick auf einen User in der Liste navigiert dorthin; ein **Zurück-Link** führt zur zuvor gefilterten Liste zurück. Der `UserDetailDrawer` (und das responsive Dual-Mode-Verhalten in `AdminUsersClient`) entfällt ersatzlos. Der bereits herausgelöste `UserDetailContent` wird zur Basis der neuen Detailseite.

### Progressive Offenlegung
- **D-02:** Die Detailbereiche werden als **untereinander gestapelte, beschriftete Sektionen/Cards mit Lazy-Load** dargestellt, **nicht** als Tab-Leiste. Schwere/seltene Bereiche sind einklappbare Accordion-Sektionen, die erst beim Öffnen ihre Daten laden. Umsetzung ausschließlich über `@/components/ui`-Primitives (`Card`, `Accordion`, `SectionHeader` …) — dies **löst die aktuell handgebaute `role="tablist"`-Tab-Leiste** in `UserDetailContent.tsx` ab und behebt die globale-UI-System-Verletzung.
- **D-03:** **Sofort expandiert und geladen** sind: **Übersicht, Globale Rollen, Gruppenmitgliedschaften, Gruppenrechte** (der Identitäts-/Rechte-Block). **Eingeklappt / lazy** sind: **Member-Profil & Claims, Beiträge, Medien, Audit** (sowie der Streaming-Stub). Das Lazy-Laden erhält das bestehende „erst bei Aktivierung laden"-Muster (heute `activatedTabs`-Set), nur auf Accordion-Öffnen statt Tab-Wechsel abgebildet.

### RBAC-Link: User → Rolle
- **D-04:** Von **jeder auf der User-Seite angezeigten Rolle, die in der Capability-Matrix (`listRoleCapabilities`) auflösbar ist**, führt ein Link zur Capability-Detailansicht („Was darf diese Rolle?") — unabhängig vom Rollentyp (globale App-Rollen **und** gruppen-/projektbezogene Rollen). Rollen ohne auflösbaren Capability-Eintrag (z. B. rein historische Rollen) bleiben schlichter Text ohne Link.

### RBAC-Link: Rolle → gefilterte User (Impact-Count)
- **D-05:** `/admin/role-capabilities` zeigt pro Rolle einen **Impact-Count „N-mal vergeben"**, der **nur globale Rollenzuweisungen** zählt (deckt sich exakt mit dem vorhandenen `global_role`-Filter der User-Liste). Der Count ist ein Sprung-Link zur passend gefilterten User-Ansicht (`/admin/users?role=…`). Gruppen-/projektbezogene Rollen erhalten **vorerst keinen** Impact-Count (siehe Deferred).
- **D-06:** Die **Listenfilter der User-Seite werden auf URL-Query-Parameter umgestellt** (`useSearchParams`): **Suche, Status und globale Rolle** werden URL-getrieben (z. B. `/admin/users?role=content_admin&status=active&q=…`). Damit landet der Impact-Sprung zuverlässig auf einer gefilterten Ansicht und der Zurück-Link von `/admin/users/[id]` (D-01) stellt exakt die vorherige gefilterte Liste wieder her. Die heutigen hartkodierten Rollen-Optionen des Filters bleiben funktional; die Filter-→API-Weitergabe (`global_role`-Param) existiert bereits.

### Claude's Discretion
- **Backend-Lieferung des Impact-Counts:** ob als zusätzliches Feld in der bestehenden `listRoleCapabilities`-Antwort (`RoleEntry`) oder als eigenes schlankes Aggregat-Endpoint — der Planner/Researcher wählt anhand dessen, was das Backend (`authz_permissions.go`, `admin_users_queries.go`) günstig aggregieren kann. Der Count zählt globale Rollenzuweisungen (D-05).
- **Konkretes Link-Ziel-Format** zur Rolle auf `/admin/role-capabilities` (Deep-Link/Anchor zur ausgewählten Rolle im Master-Detail bzw. `?role=`-Vorauswahl) — Umsetzungsdetail.
- **Genaue Sektions-Reihenfolge, Beschriftungen und visuelle Ausgestaltung** innerhalb des globalen UI-Systems.
- **Umgang mit dem Streaming-Stub-Tab** (`UserStreamingGrantsTab`, 13 Zeilen) — als Lazy-Sektion mitführen oder weglassen.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Projektregeln
- `.planning/ROADMAP.md` §"Phase 111: User-Verwaltungsseite ohne Drawer und RBAC-Querverlinkung" — verbindliches Phasenziel und Abgrenzung (nicht Phase 94).
- `./CLAUDE.md` — **globale `@/components/ui`-Primitives Pflicht** (relevant für D-02: `Tabs`/`Card`/`Accordion` statt handgebauter Tab-Leiste), korrekte Umlaute in user-facing Strings, 450-Zeilen-Limit, GSD-Workflow-Zwang.

### User-Verwaltung (Frontend)
- `frontend/src/app/admin/users/page.tsx` — Server-Route + `PlatformAdminGate`-Muster (Vorlage für `[id]`-Route).
- `frontend/src/app/admin/users/AdminUsersClient.tsx` (395 Z.) — Liste, Filterleiste, heutiges responsives Dual-Mode (Inline-Panel/Drawer), lokaler Filter-State → Ziel des URL-Filter-Umbaus (D-06).
- `frontend/src/app/admin/users/UserDetailContent.tsx` (116 Z.) — herausgelöster Detail-Host mit handgebauter Tab-Leiste (Z. 33–43) → Basis der neuen Sektionen-Seite (D-02/D-03).
- `frontend/src/app/admin/users/UserDetailDrawer.tsx` (22 Z.) — der zu entfernende Drawer-Wrapper.
- `frontend/src/app/admin/users/tabs/*.tsx` — 9 Bereichs-Komponenten (Overview/GlobalRoles/Claims/GroupMemberships/GroupRights/Contributions/Media/Audit/Streaming), werden zu Lazy-Sektionen.

### Role-Capabilities (Frontend)
- `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx` (269 Z.), `RoleMasterList.tsx` (96 Z.), `RoleCapabilityDetail.tsx` (189 Z.) — Master-Detail-Fläche; `RoleMasterList` bekommt den Impact-Count + Sprung-Link (D-05).
- `frontend/src/types/admin-capability.ts` — `RoleEntry` (hat heute **kein** Count-Feld) → evtl. um Count erweitern.

### API & Backend
- `frontend/src/lib/api.ts` — `listAdminUsersPage` (:3458, akzeptiert bereits `global_role`-Filter), `getAdminUser*`-Tab-Loader (:3484–:3669), `listRoleCapabilities` (:9474).
- `backend/cmd/server/admin_routes.go` — registrierte Routen für User-Detail + role-capabilities.
- `backend/internal/handlers/admin_users_handler.go`, `admin_capability_handler.go` — Handler.
- `backend/internal/repository/admin_users_queries.go`, `authz_permissions.go` — Backing-Queries (Quelle für ein etwaiges globales Rollenzuweisungs-Aggregat, D-05).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `UserDetailContent` + die 9 `tabs/*.tsx`-Komponenten sind bereits vom Drawer entkoppelt und wiederverwendbar — die Detailseite komponiert sie neu als Sektionen.
- `@/components/ui` bietet bereits `Card`, `Accordion`, `Tabs`, `Table`, `Badge`, `Button`, `EmptyState`, `ErrorState`, `LoadingState`, `Pagination` — alles Nötige für D-02 vorhanden.
- Die User-Liste liefert pro Zeile `global_roles` + Zähler; die API akzeptiert bereits einen `global_role`-Filter — Datenbasis für D-05/D-06 vorhanden.

### Established Patterns
- Server-Route unter `PlatformAdminGate` mit `dynamic = 'force-dynamic'` (Vorlage für `/admin/users/[id]`).
- Lazy-Aktivierung von Detailbereichen (heute `activatedTabs`-Set) → auf Accordion-Öffnen übertragen.
- `role-capabilities` nutzt bereits ein Master-Detail mit `Card`-basierter `RoleMasterList` — Impact-Count fügt sich dort ein.

### Integration Points
- **Neu:** `useSearchParams`-getriebene Listenfilter in `AdminUsersClient` (heute rein lokaler State, kein URL-Sync).
- **Neu:** Impact-Count-Feld/-Aggregat für globale Rollenzuweisungen (Backend + `RoleEntry`).
- **Neu:** bidirektionale Links (User-Rolle → capability-detail; capability-Impact → `/admin/users?role=…`) — heute existiert **keinerlei** Verlinkung zwischen den beiden Seiten.

</code_context>

<specifics>
## Specific Ideas

- „Was darf diese Rolle?" ist die intendierte Semantik des User→Rolle-Links; „N-mal vergeben" die des Rolle→User-Impact-Counts (aus dem ROADMAP-Zieltext).
- Der Zurück-Weg von der Detailseite muss die **exakte** vorherige gefilterte Liste wiederherstellen (Motivation für den vollständigen URL-Filter-Umbau, D-06).

</specifics>

<deferred>
## Deferred Ideas

- **Impact-Count & Filterung für gruppen-/projektbezogene Rollenzuweisungen** — bewusst zurückgestellt (D-05 zählt nur globale Zuweisungen); bräuchte einen neuen Gruppen-/Projektrollen-Filter auf der User-Liste + neues Backend-Aggregat.
- **Massen-/Bulk-Rollenaktionen** auf der gefilterten User-Liste — eigenes Anliegen, nicht in dieser UX-Restrukturierung.
- **Interne UI-Politur einzelner Tab-Inhalte** über das für D-02 nötige Maß hinaus (die verlinkten Todos zur Contribution-/Credits-/Member-Profil-UI sind eigene Threads).

### Reviewed Todos (not folded)
- `2026-06-03-contribution-dropdown-auf-globale-ui-primitives-umstellen.md` — betrifft die Contribution-UI, nicht `/admin/users`; nur Keyword-Match (admin/ui). Nicht in Scope.
- `2026-06-03-credits-ui-konsolidierung-und-permission-bruecke.md` — Credits-UI/Anime-Bereich; nicht diese Seite. Nicht in Scope.
- `2026-06-03-member-profil-ui-und-params-bug.md` — öffentliche Member-Profil-Seite, nicht die Admin-User-Verwaltung. Nicht in Scope.

</deferred>

---

*Phase: 111-user-verwaltungsseite-ohne-drawer-und-rbac-querverlinkung*
*Context gathered: 2026-07-28*
