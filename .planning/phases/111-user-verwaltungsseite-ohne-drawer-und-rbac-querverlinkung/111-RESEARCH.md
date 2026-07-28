# Phase 111: User-Verwaltungsseite ohne Drawer und RBAC-Querverlinkung - Research

**Researched:** 2026-07-28
**Domain:** Next.js 16 App Router (URL-getriebene Filter, deep-linkbare Detailseiten), interne RBAC-Datenmodelle (globale App-Rollen vs. `role_definitions`-Rollen), Go/Gin-Backend-Aggregation
**Confidence:** HIGH (Codebase-Verifikation für alle strukturellen Aussagen; MEDIUM für Next.js-16-Nyquist-Details, da rein aus Codebase-Mustern abgeleitet)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Der User-Detail wird eine **eigene, deep-linkbare Route `/admin/users/[id]`** (Server-Route unter `PlatformAdminGate`, analog zur bestehenden `page.tsx`-Konvention). Klick auf einen User in der Liste navigiert dorthin; ein **Zurück-Link** führt zur zuvor gefilterten Liste zurück. Der `UserDetailDrawer` (und das responsive Dual-Mode-Verhalten in `AdminUsersClient`) entfällt ersatzlos. Der bereits herausgelöste `UserDetailContent` wird zur Basis der neuen Detailseite.
- **D-02:** Die Detailbereiche werden als **untereinander gestapelte, beschriftete Sektionen/Cards mit Lazy-Load** dargestellt, **nicht** als Tab-Leiste. Schwere/seltene Bereiche sind einklappbare Accordion-Sektionen, die erst beim Öffnen ihre Daten laden. Umsetzung ausschließlich über `@/components/ui`-Primitives (`Card`, `Accordion`, `SectionHeader` …) — dies **löst die aktuell handgebaute `role="tablist"`-Tab-Leiste** in `UserDetailContent.tsx` ab und behebt die globale-UI-System-Verletzung.
- **D-03:** **Sofort expandiert und geladen** sind: **Übersicht, Globale Rollen, Gruppenmitgliedschaften, Gruppenrechte** (der Identitäts-/Rechte-Block). **Eingeklappt / lazy** sind: **Member-Profil & Claims, Beiträge, Medien, Audit** (sowie der Streaming-Stub). Das Lazy-Laden erhält das bestehende „erst bei Aktivierung laden"-Muster (heute `activatedTabs`-Set), nur auf Accordion-Öffnen statt Tab-Wechsel abgebildet.
- **D-04:** Von **jeder auf der User-Seite angezeigten Rolle, die in der Capability-Matrix (`listRoleCapabilities`) auflösbar ist**, führt ein Link zur Capability-Detailansicht („Was darf diese Rolle?") — unabhängig vom Rollentyp (globale App-Rollen **und** gruppen-/projektbezogene Rollen). Rollen ohne auflösbaren Capability-Eintrag (z. B. rein historische Rollen) bleiben schlichter Text ohne Link.
- **D-05:** `/admin/role-capabilities` zeigt pro Rolle einen **Impact-Count „N-mal vergeben"**, der **nur globale Rollenzuweisungen** zählt (deckt sich exakt mit dem vorhandenen `global_role`-Filter der User-Liste). Der Count ist ein Sprung-Link zur passend gefilterten User-Ansicht (`/admin/users?role=…`). Gruppen-/projektbezogene Rollen erhalten **vorerst keinen** Impact-Count (siehe Deferred).
- **D-06:** Die **Listenfilter der User-Seite werden auf URL-Query-Parameter umgestellt** (`useSearchParams`): **Suche, Status und globale Rolle** werden URL-getrieben (z. B. `/admin/users?role=content_admin&status=active&q=…`). Damit landet der Impact-Sprung zuverlässig auf einer gefilterten Ansicht und der Zurück-Link von `/admin/users/[id]` (D-01) stellt exakt die vorherige gefilterte Liste wieder her. Die heutigen hartkodierten Rollen-Optionen des Filters bleiben funktional; die Filter-→API-Weitergabe (`global_role`-Param) existiert bereits.

### Claude's Discretion

- **Backend-Lieferung des Impact-Counts:** ob als zusätzliches Feld in der bestehenden `listRoleCapabilities`-Antwort (`RoleEntry`) oder als eigenes schlankes Aggregat-Endpoint — der Planner/Researcher wählt anhand dessen, was das Backend (`authz_permissions.go`, `admin_users_queries.go`) günstig aggregieren kann. Der Count zählt globale Rollenzuweisungen (D-05).
- **Konkretes Link-Ziel-Format** zur Rolle auf `/admin/role-capabilities` (Deep-Link/Anchor zur ausgewählten Rolle im Master-Detail bzw. `?role=`-Vorauswahl) — Umsetzungsdetail.
- **Genaue Sektions-Reihenfolge, Beschriftungen und visuelle Ausgestaltung** innerhalb des globalen UI-Systems.
- **Umgang mit dem Streaming-Stub-Tab** (`UserStreamingGrantsTab`, 13 Zeilen) — als Lazy-Sektion mitführen oder weglassen.

### Deferred Ideas (OUT OF SCOPE)

- Impact-Count & Filterung für gruppen-/projektbezogene Rollenzuweisungen — bewusst zurückgestellt (D-05 zählt nur globale Zuweisungen); bräuchte einen neuen Gruppen-/Projektrollen-Filter auf der User-Liste + neues Backend-Aggregat.
- Massen-/Bulk-Rollenaktionen auf der gefilterten User-Liste — eigenes Anliegen, nicht in dieser UX-Restrukturierung.
- Interne UI-Politur einzelner Tab-Inhalte über das für D-02 nötige Maß hinaus (verlinkte Todos zu Contribution-/Credits-/Member-Profil-UI sind eigene Threads, nicht in Scope).
</user_constraints>

<phase_requirements>
## Phase Requirements

Diese Phase hat **keine** REQ-IDs aus `REQUIREMENTS.md` (Roadmap-Eintrag: „Requirements: TBD"). Der Abdeckungs-Maßstab für Planner und Gap-Analyse sind die sechs Kontext-Entscheidungen D-01 bis D-06. Erfinde keine REQ-IDs — referenziere in Plänen/Tasks direkt `D-01` … `D-06`.

| ID | Beschreibung | Research-Unterstützung |
|----|--------------|------------------------|
| D-01 | Eigene Route `/admin/users/[id]`, Drawer entfällt | Siehe „Architektur: Detailseiten-Route" + Code-Beispiele |
| D-02 | Accordion statt Tab-Leiste, `@/components/ui`-Primitives only | `Accordion`-Primitiv-API dokumentiert, `openIds`/`onOpenChange`-Muster aus `RoleCapabilityDetail.tsx` als Vorlage |
| D-03 | Items 1–4 offen+geladen, 5–9 lazy | Accordion-`openIds`-Initialwert + `activatedTabs`→Accordion-Migrationsmuster dokumentiert |
| D-04 | User→Rolle-Link nur bei auflösbarer Rolle | **Kritischer Fund:** globale App-Rollen (`platform_admin`/`content_admin`/`user`) sind strukturell NIE in `listRoleCapabilities()` auflösbar — siehe Pitfall 1 |
| D-05 | Impact-Count nur für globale Zuweisungen, Sprung zu `/admin/users?role=…` | **Kritischer Fund:** `RoleMasterList` zeigt ausschließlich `role_definitions`-Zeilen, die alle NICHT global sind — Count braucht neue synthetische Einträge, siehe Pitfall 1 + Empfehlung |
| D-06 | URL-Query-Filter (`q`/`status`/`role`) | `useSearchParams`+`router.replace`-Referenzmuster aus `useFansubEditMainTab.ts` dokumentiert |
</phase_requirements>

## Summary

Diese Phase ist strukturell zweigeteilt: (1) eine reine Frontend-Refaktorierung der User-Detailansicht (Drawer → eigene Route, Tabs → Accordion, lokaler State → URL-State) mit exzellenten, bereits im Repo vorhandenen Vorlagen; und (2) eine RBAC-Querverlinkung, die auf einer in CONTEXT.md/UI-SPEC nicht erkannten **Datenmodell-Lücke** aufsetzt: Die drei globalen App-Rollen (`platform_admin`, `content_admin`, `user`), auf die sich D-05 exakt bezieht, existieren **nicht** in der `role_definitions`-Tabelle, aus der `listRoleCapabilities()` seine `RoleEntry[]` baut. Sie sind ausschließlich als String-CHECK-Constraint-Werte in `app_user_global_roles` kodiert und komplett disjunkt von den Rollen, die im Capability-Screen erscheinen (`fansub_lead`, `translator`, `encoder` usw.). Das bedeutet: Weder kann eine globale Rolle heute in `listRoleCapabilities()` „auflösbar" sein (D-04-Konsequenz: Badges auf `UserGlobalRolesTab` bleiben strukturell IMMER unverlinkter Plain-Text), noch kann der Impact-Count auf einer bestehenden `RoleMasterList`-Zeile andocken (D-05-Konsequenz: es gibt aktuell keine Zeile, die eine globale Rolle repräsentiert). Die UI-SPEC geht implizit vom Gegenteil aus (sie interpretiert das vorhandene `RoleEntry.assignable`-Flag fälschlich als „ist eine globale App-Rolle" — tatsächlich markiert `assignable` die sechs **fansub-group-zuweisbaren** Rollen, siehe Migration 0112). Für D-05 ist deshalb zwingend eine Erweiterung nötig, die die drei globalen Rollen als (schreibgeschützte, nicht-editierbare) Einträge sichtbar macht — entweder als synthetische Zusatzzeilen im bestehenden `matrix.roles`-Array oder als separate kleine Liste/Sektion auf `/admin/role-capabilities`. D-04 dagegen braucht keine Korrektur der Zielarchitektur, nur eine klare Erwartungshaltung: Der Link erscheint nur bei `UserGroupRightsTab`-Rollen (`granted_roles`, echte `role_definitions`-Codes), nicht bei `UserGlobalRolesTab`.

Der reine Umbau-Teil (D-01/D-02/D-03/D-06) ist demgegenüber risikoarm: Next.js 16 App Router unterstützt `useSearchParams`+`router.replace(..., {scroll:false})` bereits produktiv im Repo (`useFansubEditMainTab.ts`), die `Accordion`-Komponente mit kontrolliertem `openIds`/`onOpenChange` ist bereits produktiv im Einsatz (`RoleCapabilityDetail.tsx`), und `UserDetailContent.tsx` ist bereits vom Drawer entkoppelt (nimmt nur `userId` entgegen).

**Primary recommendation:** Baue D-01/D-02/D-03/D-06 strikt nach den bestehenden Repo-Mustern (`useFansubEditMainTab.ts` für URL-State, `RoleCapabilityDetail.tsx` für kontrollierten Accordion). Löse D-04 als generische „versuche Rollen-Code gegen `RoleEntry[]` zu matchen, sonst Plain-Text"-Logik (kein Sonderfall nötig, funktioniert automatisch korrekt). Löse D-05 durch Erweiterung von `ListCapabilityMatrix()` um drei synthetische, nicht-editierbare `RoleEntry`-Zeilen für `platform_admin`/`content_admin`/`user` mit einem neuen `global_assignment_count`-Feld, aggregiert per `SELECT role, COUNT(*) FROM app_user_global_roles GROUP BY role` — NICHT durch (fälschliches) Filtern auf `assignable === true`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Detailseiten-Routing (`/admin/users/[id]`) | Frontend Server (SSR) | Browser/Client | Server-Route unter `PlatformAdminGate`, `dynamic='force-dynamic'`; Datenladen selbst bleibt client-seitig (bestehendes Muster) |
| Accordion-Lazy-Load pro Sektion | Browser/Client | — | Rein clientseitiger Zustand (`openIds`), Datenladen pro Tab-Komponente bereits client-seitig via `useEffect` |
| URL-Filter-Synchronisation (D-06) | Browser/Client | Frontend Server (SSR) | `useSearchParams`/`router.replace` ist Client-Hook; die Server-Route selbst bleibt `force-dynamic` und liest keine Such-Params selbst |
| Globale-Rollen-Zuweisungscount (D-05) | API/Backend | Database/Storage | Aggregation gehört ins Repository (`AuthzRepository`/`ListCapabilityMatrix`), nicht ins Frontend — Frontend zeigt nur das gelieferte Feld |
| Rollen-Auflösbarkeits-Matching (D-04) | Browser/Client | API/Backend (optional) | Kann rein client-seitig gegen bereits geladene `RoleEntry[]` matchen (kein Zusatz-Request nötig); Backend-Flag ist optional, nicht erforderlich |
| RBAC-Zugriffsschutz (`PlatformAdminGate`) | Frontend Server (SSR) | API/Backend | Gate ist bereits vorhanden auf beiden betroffenen Routen; Backend erzwingt zusätzlich `requirePlatformAdminIdentity` je Endpoint (Defense in Depth, unverändert) |

## Standard Stack

Diese Phase installiert **keine** neuen Pakete. Alle benötigten Bausteine (`next/navigation`, `@/components/ui`) sind bereits im Projekt vorhanden und produktiv im Einsatz.

### Core (bereits vorhanden, keine neue Installation)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.1.6 `[VERIFIED: frontend/package.json]` | App Router, `useSearchParams`/`useRouter`/`usePathname` | Bereits Projektstandard |
| `@/components/ui` (intern) | n/a (Projekt-intern) | `Accordion`, `PageHeader`, `Badge`, `Button`, `Card`, `Table`, `Pagination`, `Modal`, `LoadingState`/`EmptyState`/`ErrorState` | CLAUDE.md-Pflicht, bereits vollständig für diese Phase ausreichend |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-seitiges Rollen-Matching für D-04 | Backend liefert `resolvable`-Flag direkt auf User-Rollen-Payload | Mehr Backend-Änderung für keinen Zusatznutzen — Frontend hat `RoleEntry[]` (via `listRoleCapabilities()`) ohnehin schon geladen, sobald die Rollen-Sektion offen ist (D-03: „Globale Rollen"/„Gruppenrechte" sind immer sofort geladen) |
| Synthetische globale-Rollen-Zeilen in `matrix.roles` (empfohlen) | Eigener schlanker Endpoint `GET /admin/role-capabilities/global-role-counts` | Eigener Endpoint vermeidet „leere Actions-Liste" für globale Rollen im bestehenden Matrix-Datenmodell, braucht aber einen zweiten Fetch + eigene UI-Sektion statt Wiederverwendung von `RoleMasterList`; siehe Pitfall 1 für Abwägung |

**Installation:** Keine (keine neuen Pakete).

**Version verification:** `next` Version aus `frontend/package.json` gelesen (`^16.1.6`) — nicht per `npm view` erneut geprüft, da lokal bereits installiert und lockfile-gepinnt; keine externe Registry-Abfrage nötig für ein bereits vorhandenes, lokal verifiziertes Package.

## Package Legitimacy Audit

**Nicht anwendbar** — diese Phase installiert keine externen Pakete (weder npm noch Go-Module). Alle verwendeten Bausteine sind bereits im Repository vorhanden (`next`, projekt-interne `@/components/ui`-Primitives, Standard-Bibliothek `net/url`/`database/sql`-Äquivalent `pgx` auf Go-Seite, bereits Projektabhängigkeit).

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────┐        ┌──────────────────────────────────┐
│  /admin/users (Liste)       │        │  /admin/users/[id] (Detail) [NEU]│
│  AdminUsersClient.tsx        │        │  Server-Route unter               │
│  - useSearchParams (q/status/│        │  PlatformAdminGate                │
│    role) ──► router.replace  │        │  - liest ?from= für Zurück-Link   │
│  - Zeilen-Klick              │──nav──►│  - hostet Accordion-Sektionen     │
│    (Link href=/admin/users/  │        │    (UserDetailContent-Nachfolger) │
│    [id]?from=<query>)        │        │                                    │
└──────────────┬───────────────┘        └───────────────┬────────────────────┘
               │ listAdminUsersPage(params)               │ pro Accordion-Item:
               │ (global_role ⟵ URL-Param `role`)          │ getAdminUser{Overview,
               ▼                                            │ GlobalRoles,GroupMemberships,
     GET /api/v1/admin/users                                │ GroupRights,Claims,
     (Go: ListUsers Handler                                  │ Contributions,Media,Audit}(userId)
      → adminUsersListQuery CTE)                             ▼
                                                    9× bestehende GET-Endpunkte
                                                    (unverändert, D-01 ändert nur
                                                     den Host-Container)

┌───────────────────────────────────┐       ┌─────────────────────────────────────┐
│ UserGlobalRolesTab (Item 2)        │       │ UserGroupRightsTab (Item 4)          │
│ zeigt platform_admin/content_admin/│       │ zeigt granted_roles = role_definitions│
│ user Badges (app_user_global_roles)│       │ Codes (fansub_lead, translator, …)    │
│                                     │       │                                        │
│ D-04-Link-Versuch: match gegen      │       │ D-04-Link-Versuch: match gegen         │
│ RoleEntry[].role_code               │       │ RoleEntry[].role_code                  │
│ → IMMER kein Treffer (disjunkte     │       │ → IMMER Treffer (identischer           │
│   Namensräume, siehe Pitfall 1)     │       │   Codespace), Link zu                  │
│ → bleibt Plain-Badge, kein Link     │       │   /admin/role-capabilities?role=…      │
└───────────────────────────────────┘       └─────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ /admin/role-capabilities                                             │
│ RoleCapabilityClient.tsx                                              │
│  - liest ?role= via useSearchParams → handleSelectRole (NEU, D-Link)  │
│  - RoleMasterList: heute NUR role_definitions-Zeilen (fansub_lead,    │
│    translator, encoder, …) — KEINE globalen Rollen enthalten          │
│                                                                        │
│  D-05 Impact-Count NEU:                                               │
│  Backend ListCapabilityMatrix() erweitert um 3 synthetische Zeilen    │
│  (platform_admin/content_admin/user), capability_editable=false,      │
│  global_assignment_count = COUNT(*) aus app_user_global_roles         │
│  GROUP BY role                                                        │
│  → RoleMasterList zeigt für DIESE 3 Zeilen "N× vergeben"-Badge/Link   │
│    zu /admin/users?role={role_code} (löscht role= aus URL komplett)   │
└────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
frontend/src/app/admin/users/
├── page.tsx                      # unverändert (Liste, Server-Route)
├── AdminUsersClient.tsx           # umgebaut: URL-State statt useState, Zeilen-Klick → Link statt setSelectedUserId
├── useUserListFilters.ts          # [NEU, falls 450-Zeilen-Limit sonst überschritten] URL-Filter-Hook (Analogie zu useFansubEditMainTab.ts)
├── [id]/
│   ├── page.tsx                  # [NEU] Server-Route unter PlatformAdminGate, dynamic='force-dynamic'
│   └── UserDetailPageClient.tsx   # [NEU, ersetzt faktisch UserDetailContent.tsx] Accordion-Host + Zurück-Link
├── UserDetailContent.tsx          # [ENTFÄLLT inhaltlich] Tab-Leiste wird durch Accordion-Host ersetzt — Logik wandert nach [id]/UserDetailPageClient.tsx
├── UserDetailDrawer.tsx           # [GELÖSCHT] D-01
└── tabs/*.tsx                    # unverändert (9 Bereichs-Komponenten, werden Accordion-Item-Inhalte)

frontend/src/app/admin/role-capabilities/
├── RoleCapabilityClient.tsx       # + useSearchParams(?role=) Vorauswahl beim Mount
├── RoleMasterList.tsx             # + Impact-Count-Badge/Link pro Zeile (nur wenn global_assignment_count vorhanden ist)
└── ...                            # unverändert

backend/internal/repository/
├── authz_capability_mutations.go  # ListCapabilityMatrix() erweitert: + 3 synthetische globale Rollen-Zeilen + GlobalAssignmentCount-Feld
└── admin_users_queries.go         # unverändert (global_role-Filter existiert bereits)

frontend/src/types/admin-capability.ts  # RoleEntry + global_assignment_count?: number | null
```

### Pattern 1: URL-getriebener Filter-State (D-06)

**What:** `useSearchParams` liest Filterwerte aus der URL, `router.replace(path, {scroll:false})` schreibt Änderungen zurück, ohne History-Einträge zu erzeugen. Lokaler `useState` bleibt nur für den debounce-Zwischenwert von `q` (Tastatureingabe darf nicht bei jedem Tastendruck die URL schreiben).

**When to use:** Für D-06 exakt so — Suchfeld debounced, Status/Rolle sofort.

**Example (aus dem Repo, `useFansubEditMainTab.ts` — 1:1 übertragbares Muster):**
```typescript
// Source: frontend/src/app/admin/fansubs/[id]/edit/hooks/useFansubEditMainTab.ts (Projektcode, verifiziert)
const router = useRouter()
const pathname = usePathname()
const searchParams = useSearchParams()

const handleFilterChange = useCallback((key: string, value: string) => {
  const next = new URLSearchParams(searchParams.toString())
  if (value) next.set(key, value)
  else next.delete(key)
  next.delete('offset') // Filteränderung setzt Pagination zurück (D-06-Analogie)
  const query = next.toString()
  router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
}, [pathname, router, searchParams])
```
Wichtig: In diesem Repo-Muster gibt es **kein** `<Suspense>` um die aufrufende Komponente, obwohl `useSearchParams` verwendet wird — weil die Elternroute bereits `export const dynamic = 'force-dynamic'` setzt (siehe `frontend/src/app/admin/fansubs/[id]/edit/page.tsx`, kein Suspense-Wrapper). `/admin/users/page.tsx` hat bereits `dynamic = 'force-dynamic'` — für `AdminUsersClient.tsx` ist daher **kein neuer Suspense-Wrapper nötig**. Suspense wird im Repo nur dort verwendet, wo die Route **kein** `dynamic='force-dynamic'` hat und komplett `'use client'` ganz oben in `page.tsx` ist (`invitations/accept/page.tsx`) — das ist hier nicht der Fall.

### Pattern 2: Kontrollierter Accordion mit Lazy-Load (D-02/D-03)

**What:** `Accordion` (aus `@/components/ui`) im `mode="multi"` mit `openIds: Set<string>` + `onOpenChange`, gehalten vom Parent. Migriert 1:1 vom bestehenden `activatedTabs`-Set-Muster in `UserDetailContent.tsx` — nur der Trigger wechselt von „Tab-Klick" zu „Accordion-Header-Klick" (`Accordion` ruft `onOpenChange` bereits beim Header-Klick auf, inklusive Toggle-Semantik für Öffnen UND Schließen).

**When to use:** Exakt für D-02/D-03.

**Example (verifiziertes Repo-Muster, `RoleCapabilityDetail.tsx`/`RoleCapabilityClient.tsx`):**
```typescript
// Source: frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx (Projektcode)
const [openIds, setOpenIds] = useState<Set<string>>(
  new Set(['overview', 'roles', 'memberships', 'group-rights']) // D-03: Items 1–4 default open
)
const [loadedIds, setLoadedIds] = useState<Set<string>>(
  new Set(['overview', 'roles', 'memberships', 'group-rights']) // "geladen" ≠ "offen": einmal geladen bleibt geladen
)

function handleOpenChange(next: Set<string>) {
  setOpenIds(next)
  // Lazy-Load: alles was jemals offen war, bleibt geladen (Migrations-Analogie zu activatedTabs)
  setLoadedIds((prev) => new Set([...prev, ...next]))
}

const items: AccordionItemDef[] = [
  { id: 'overview', title: 'Übersicht', children: loadedIds.has('overview') ? <UserOverviewTab userId={userId} /> : null },
  { id: 'claims', title: 'Member-Profil & Claims', children: loadedIds.has('claims') ? <UserClaimsTab userId={userId} /> : null },
  // … restliche 7 Items analog
]

<Accordion items={items} mode="multi" openIds={openIds} onOpenChange={handleOpenChange} />
```
**Pitfall-Hinweis:** `Accordion` rendert ein Item's `children` nur, wenn `isOpen` — d.h. rein technisch würde ein simples `items.map(...)` mit `<Tab userId={userId} />` als `children` bereits "lazy" sein, WEIL die Komponente beim Schließen aus dem DOM entfernt wird UND beim erneuten Öffnen neu gemountet (erneuter Fetch!). Das entspricht **nicht** dem bestehenden `activatedTabs`-Verhalten (das cached: einmal geladen bleibt der Tab-Inhalt im DOM, auch wenn nicht sichtbar). Um das bestehende Cache-Verhalten (kein Re-Fetch bei erneutem Öffnen) zu erhalten, MUSS ein zusätzliches `loadedIds`-Set (wie oben) geführt werden — nicht nur `openIds`. Sonst holt jedes erneute Aufklappen eines Accordion-Items die Daten neu (Regression ggü. heutigem Verhalten).

### Pattern 3: Rollen-Auflösbarkeits-Matching (D-04)

**What:** Rein clientseitiger Lookup gegen die bereits geladene Capability-Matrix — kein Backend-Enrichment nötig.

```typescript
// Neu zu schreibende Utility, z.B. frontend/src/app/admin/users/resolveRoleLink.ts
function resolveRoleLink(roleCode: string, matrix: RoleCapabilityMatrix | null): string | null {
  const entry = matrix?.roles.find((r) => r.role_code === roleCode)
  if (!entry) return null // NICHT auflösbar — inkl. ALLER platform_admin/content_admin/user-Fälle (siehe Pitfall 1)
  return `/admin/role-capabilities?role=${encodeURIComponent(roleCode)}`
}
```
Die Matrix muss dafür in `UserGlobalRolesTab`/`UserGroupRightsTab` (oder einer gemeinsamen übergeordneten Komponente) per `listRoleCapabilities()` geladen werden — ein zusätzlicher Fetch pro Detailseiten-Aufruf (unkritisch, da D-03 „Globale Rollen"/„Gruppenrechte" ohnehin sofort geladen werden).

### Anti-Patterns to Avoid

- **Filtern des Impact-Counts auf `RoleEntry.assignable === true`:** Die UI-SPEC-Formulierung „Only roles with `assignable === true` (the actual global/app roles)" ist **sachlich falsch** — `assignable` markiert die sechs fansub-group-zuweisbaren Rollen (`fansub_lead`, `co_leader`, `founder`, `project_lead`, `techadmin`, `gfxler`, siehe Migration 0112), NICHT `platform_admin`/`content_admin`/`user`. Ein Filter auf `assignable === true` würde beim aktuellen Datenmodell **niemals** einen Count zeigen (da keine dieser 6 Rollen eine globale App-Rolle ist) — siehe Pitfall 1.
- **`role="tablist"`/`role="tab"`-Markup neu einführen:** explizit durch D-02 verboten, war der ursprüngliche UI-System-Verstoß.
- **Accordion-Items ohne `loadedIds`-Cache bauen** (nur `openIds` prüfen): führt zu Re-Fetch bei jedem erneuten Öffnen — Regression ggü. `activatedTabs`.
- **`router.back()` für den Zurück-Link verwenden:** funktioniert nicht zuverlässig bei direkt geteilten/gebookmarkten Detail-Links (kein Browser-History-Eintrag vorhanden) — UI-SPEC schreibt explizit den `?from=`-Query-Param-Forward vor.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accordion mit Lazy-Load | Eigene `<div>`-basierte Auf-/Zuklapp-Logik mit `useState<boolean>` pro Sektion | `@/components/ui` `Accordion` (`mode="multi"`, controlled `openIds`) | Bereits vorhanden, barrierefrei (`aria-expanded`/`aria-controls`/`role="region"`), CLAUDE.md-Pflicht |
| URL-Query-Synchronisation | Eigenes `window.history.pushState`-Wrapping | `next/navigation` `useSearchParams`+`useRouter().replace` | Next.js-natives API, bereits Repo-Standard (`useFansubEditMainTab.ts`) |
| Tabellen-Zeilen-Navigation | `onClick`-Handler mit `window.location.href =` | `Link`/`Button href=` (Next.js `<Link>` oder `@/components/ui` `Button` mit `href`) | Erhält Client-seitige Navigation (kein Full-Page-Reload), Prefetching, Accessibility (`<a>`-Semantik) |
| Globale-Rollen-Zählung | Client-seitiges Zählen über die gesamte User-Liste (N+1 API-Calls oder Voll-Scan) | Backend-Aggregat `SELECT role, COUNT(*) FROM app_user_global_roles GROUP BY role` (einmalige, indexierte GROUP BY-Query) | Serverseitige Aggregation ist die einzige Variante, die exakt und performant mit dem existierenden `global_role`-Filter übereinstimmt |

**Key insight:** Diese Phase braucht keine neue Bibliothek — jedes benötigte Muster (Accordion, URL-State, Server-Route-Gate) existiert bereits produktiv im Repo. Das Risiko liegt nicht in der Technik, sondern im RBAC-Datenmodell-Missverständnis (siehe Pitfall 1).

## Common Pitfalls

### Pitfall 1: Globale App-Rollen existieren nicht in `role_definitions` — D-04/D-05 treffen auf eine Datenmodell-Lücke

**What goes wrong:** Ein naiver Umsetzer nimmt an, `platform_admin`/`content_admin`/`user` (aus `UserGlobalRolesTab`, gespeichert in `app_user_global_roles`, CHECK-Constraint `role IN ('platform_admin','content_admin','user')`) seien Teil der `role_definitions`-Tabelle bzw. der `listRoleCapabilities()`-Matrix — und implementiert D-04 (Link von der User-Seite) sowie D-05 (Impact-Count auf der Capability-Seite) so, als könnten diese drei Rollen direkt in `RoleMasterList`/`RoleEntry[]` gematcht werden.

**Why it happens:** `role_definitions` enthält ausschließlich Rollen mit Kontext `anime_contribution`/`fansub_group`/`group_history` (`translator`, `editor`, `timer`, `typesetter`, `encoder`, `raw_provider`, `quality_checker`, `project_lead`, `designer`, `admin`, `other`, `founder`, `co_leader`, `fansub_lead`, `techadmin`, `gfxler` — verifiziert aus Migrationen 0085/0100/0108/0112). `platform_admin`/`content_admin`/`user` kommen in dieser Tabelle **nicht** vor; sie leben ausschließlich als String-Werte in `app_user_global_roles` (Migration 0072). `listRoleCapabilities()` (`ListCapabilityMatrix()` in `authz_capability_mutations.go`) baut seine `RoleEntry[]` per `CROSS JOIN role_definitions` — die drei globalen Rollen tauchen dort **strukturell nie auf**. Zusätzlich verwechselt die UI-SPEC das bestehende `RoleEntry.assignable`-Feld (fansub-group-zuweisbare Rollen, gesetzt in Migration 0112 für `fansub_lead`/`co_leader`/`founder`/`project_lead`/`techadmin`/`gfxler`) mit „ist eine globale App-Rolle" — das ist eine andere Bedeutung.

**How to avoid:**
- **D-04:** Keine Sonderbehandlung nötig — das generische Matching (`RoleEntry[].find(r => r.role_code === roleCode)`, siehe Pattern 3) liefert für `platform_admin`/`content_admin`/`user` automatisch `undefined` → Plain-Badge ohne Link, exakt gemäß D-04s eigener Fallback-Regel „unresolvable roles stay plain text". Kein Bug, aber **explizit im Plan dokumentieren**, dass der User→Rolle-Link in der Praxis nur bei `UserGroupRightsTab` (granted_roles = `role_definitions`-Codes) sichtbar wird, NICHT bei `UserGlobalRolesTab` — sonst wird das im UAT fälschlich als „Link fehlt" gemeldet.
- **D-05:** Erfordert eine bewusste Backend-Erweiterung. Empfehlung: `ListCapabilityMatrix()` (`authz_capability_mutations.go`) um drei zusätzliche, synthetische `CapabilityMatrixRoleEntry`-Zeilen ergänzen (`platform_admin`, `content_admin`, `user`), mit `Actions: []`, `Assignable: false`, `CapabilityEditable: false` (damit `RoleMasterList`/`RoleCapabilityDetail` sie automatisch als „nicht editierbar"/„Historische Rolle"-artig behandeln, OHNE die bestehende Badge-Beschriftung „Historische Rolle" fälschlich zu übernehmen — ggf. neues `RoleEntry.role_kind: 'global_app_role' | 'group_role' | 'historical'`-Feld statt der binären `capability_editable`-Interpretation, um die Badge-Beschriftung korrekt zu differenzieren) und `GlobalAssignmentCount: int` (per neuer LEFT-JOIN-LATERAL-Query gegen `app_user_global_roles GROUP BY role`). Alternative (schlanker, aber zweiter Fetch): separates Feld/Endpoint nur für die 3 globalen Rollen, das `RoleMasterList` als zusätzliche, optisch abgesetzte Mini-Liste über oder unter der bestehenden Liste rendert. **Diese Entscheidung muss der Planner treffen** (Claude's Discretion laut CONTEXT.md) — beide Optionen sind technisch valide, aber die „synthetische Zeile"-Variante fügt sich visuell besser in die UI-SPEC-Vorgabe „Fokuspunkt ist der Impact-Count-Badge der aktuell ausgewählten Rolle in der `RoleMasterList`" ein.

**Warning signs:** Wenn ein Plan `RoleMasterList` oder `RoleEntry[].filter(r => r.assignable)` verwendet, um die zu zählenden Rollen zu bestimmen — das filtert auf die falschen 6 Rollen (fansub-group-Rollen), nicht auf die 3 globalen Rollen aus D-05.

### Pitfall 2: `label_de` bei synthetischen globalen Rollen-Zeilen fehlt

**What goes wrong:** Wenn Pitfall 1s Backend-Erweiterung umgesetzt wird, braucht jede der drei synthetischen Zeilen ein deutsches Label. Diese Labels existieren bereits — aber nur hartcodiert im Frontend (`roleLabel()`-Funktion in `UserGlobalRolesTab.tsx`, Z. 34–46: `Plattform-Admin`/`Content-Admin`/`Benutzer`), nicht im Backend.

**Why it happens:** Es gibt keine Backend-Quelle-der-Wahrheit für die Labels der drei globalen Rollen (im Gegensatz zu `role_definitions.label_de` für die anderen Rollen).

**How to avoid:** Entweder die Labels beim Backend-Erweitern hartcodieren (Analogie zur bestehenden Frontend-`roleLabel()`-Funktion, an einer Stelle synchron halten — z. B. Kommentar-Verweis in beide Richtungen) oder — sauberer — die drei Labels in einer gemeinsamen Konstante ablegen, auf die sowohl `UserGlobalRolesTab.tsx` als auch die Backend-Antwort referenzieren (Backend liefert `label_de` mit, Frontend nutzt das gelieferte Label statt der lokalen Switch-Funktion für Konsistenz).

**Warning signs:** Zwei unterschiedliche deutsche Labels für dieselbe Rolle auf `/admin/users` vs. `/admin/role-capabilities` (z. B. „Plattform-Admin" vs. „platform_admin" als Rohstring).

### Pitfall 3: Accordion-Lazy-Load ohne `loadedIds`-Cache verliert das bestehende Caching-Verhalten

**What goes wrong:** Siehe Pattern 2 — ein naives `items.map(i => ({ children: openIds.has(i.id) ? <Tab/> : null }))` unmountet die Tab-Komponente beim Schließen und remountet (= re-fetched) sie beim erneuten Öffnen.

**Why it happens:** `Accordion` selbst entfernt geschlossene Panels komplett aus dem DOM (`{isOpen ? <div>...</div> : null}`), das ist by design für Performance/Accessibility — aber es unterscheidet sich vom heutigen `activatedTabs`-Verhalten, wo ein einmal aktivierter Tab beim Tab-Wechsel nur per `display: none` versteckt wird (State bleibt erhalten, kein Re-Fetch).

**How to avoid:** Zusätzliches `loadedIds`-Set führen (siehe Pattern 2 Code-Beispiel), das nie wieder Einträge entfernt — nur `openIds` steuert Sichtbarkeit/Aufklapp-Zustand, `loadedIds` steuert, ob die Kind-Komponente überhaupt gemountet wird.

**Warning signs:** Beim UAT: Accordion-Sektion zuklappen, wieder aufklappen → LoadingState erscheint erneut, obwohl die Daten schon einmal geladen wurden.

### Pitfall 4: `AdminUsersClient.tsx` überschreitet nach dem Umbau das 450-Zeilen-Limit

**What goes wrong:** Die Datei hat bereits 395 Zeilen (verifiziert). D-06 fügt `useSearchParams`/`router.replace`-Logik hinzu, D-01 entfernt zwar den Drawer-Dual-Mode-Code (~40 Zeilen `useDesktopUserDetails` + Inline-Panel-JSX), aber die Netto-Bilanz ist unsicher.

**Why it happens:** URL-State-Synchronisation (Such-Debounce + `router.replace`-Aufrufe für drei Parameter) ist tendenziell umfangreicher als simpler lokaler `useState`.

**How to avoid:** Vorab einen `useUserListFilters`-Hook auslagern (Analogie zu `useFansubEditMainTab.ts`), der `q`/`status`/`role`/(`offset`) kapselt und `{ params, searchValue, handleSearchChange, handleStatusChange, handleRoleChange, handlePageChange }` zurückgibt. Nach Entfernen des Drawer-Dual-Mode-Codes (D-01) UND Auslagerung des Filter-Hooks (D-06) sollte die Datei komfortabel unter 450 Zeilen bleiben. Der Planner sollte dies als expliziten Task/Verifikationsschritt aufnehmen (`wc -l` nach Implementierung prüfen).

**Warning signs:** `AdminUsersClient.tsx` nach Umbau > 450 Zeilen bei `wc -l`.

### Pitfall 5: `label htmlFor="role-filter"` bleibt beim URL-Umbau unangetastet

**What goes wrong:** Die UI-SPEC verlangt explizit (Z. 199), das rohe `<label htmlFor="role-filter" className={styles.roleFilterLabel}>` durch `FormField label="Globale Rolle" htmlFor="role-filter"` zu ersetzen — „während die Datei sowieso angefasst wird". Da D-06 exakt diese Datei umbaut, ist das ein leicht übersehbarer Nebenauftrag, kein separates Ticket.

**Why it happens:** Der Fix ist im UI-SPEC-Fließtext versteckt (nicht in der Komponenten-Inventar-Tabelle als eigene Zeile), leicht zu übersehen zwischen den größeren D-06-Änderungen.

**How to avoid:** Explizit als Task-Punkt in den Plan aufnehmen, nicht nur „URL-Filter umbauen", sondern auch „raw `<label>` durch `FormField`-Wrapper ersetzen".

**Warning signs:** ESLint `no-restricted-syntax`-Warnung für natives Markup, falls die Regel diesen Fall erfasst; UI-Checker-Gate schlägt fehl.

## Code Examples

### Server-Route unter `PlatformAdminGate` (Vorlage für `/admin/users/[id]/page.tsx`)

```typescript
// Source: frontend/src/app/admin/role-capabilities/page.tsx (Projektcode, verifiziertes Muster)
import { PlatformAdminGate } from '@/components/auth/PlatformAdminGate'
import UserDetailPageClient from './UserDetailPageClient'

export const dynamic = 'force-dynamic'

export default function UserDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { from?: string }
}) {
  return (
    <PlatformAdminGate>
      <main>
        <UserDetailPageClient userId={Number(params.id)} fromQuery={searchParams.from} />
      </main>
    </PlatformAdminGate>
  )
}
```
Hinweis: Next.js 16 kann `params`/`searchParams` als Promise typisieren (async Server Components) — vor der Implementierung gegen eine bereits im Repo vorhandene `[id]`- oder `[versionId]`-Route (z. B. `frontend/src/app/admin/episode-versions/[versionId]/edit/page.tsx`) abgleichen, um das exakte Next-16-Typmuster (sync vs. `Promise<>`) projektkonsistent zu übernehmen — `[ASSUMED]`, da nicht in dieser Session gegen die konkrete Datei verifiziert.

### Zeilen-Klick als Navigation statt `setSelectedUserId` (D-01)

```typescript
// Vorher (AdminUsersClient.tsx, aktuell):
<TableRow onClick={onClick} ...>

// Nachher — Navigation mit erhaltener Filter-URL für den Zurück-Link:
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
// ...
const searchParams = useSearchParams()
const fromQuery = searchParams.toString()
// im Zeilen-Renderer:
<TableRow
  onClick={() => router.push(`/admin/users/${item.id}${fromQuery ? `?from=${encodeURIComponent(fromQuery)}` : ''}`)}
  style={{ cursor: 'pointer' }}
  ...
>
```

### Zurück-Link mit Fallback (D-01, UI-SPEC-Contract)

```typescript
// UserDetailPageClient.tsx
const backHref = fromQuery ? `/admin/users?${decodeURIComponent(fromQuery)}` : '/admin/users'
<PageHeader
  eyebrow="Benutzerverwaltung"
  title={displayName || `Benutzer #${userId}`}
  breadcrumbs={
    <Button variant="ghost" size="sm" href={backHref} leftIcon={<ChevronLeft size={16} />}>
      Zurück zur Liste
    </Button>
  }
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `UserDetailDrawer` + responsives Dual-Mode (`useDesktopUserDetails`) | Eigene Route `/admin/users/[id]`, kein Drawer | Diese Phase (D-01) | Entfernt ~60 Zeilen Dual-Mode-Logik aus `AdminUsersClient.tsx`, macht Details deep-linkbar/teilbar |
| Handgebaute `role="tablist"`-Leiste in `UserDetailContent.tsx` | `@/components/ui` `Accordion` mit kontrolliertem `openIds` | Diese Phase (D-02) | Behebt CLAUDE.md-UI-System-Verstoß, konsistent mit `RoleCapabilityDetail.tsx`-Muster |
| Lokaler `useState`-Filter (`params`, `searchValue`) | URL-Query-Params via `useSearchParams`/`router.replace` | Diese Phase (D-06) | Ermöglicht exakten Zurück-Link-Restore + Deep-Links vom Impact-Count-Sprung |
| Keine RBAC-Querverlinkung zwischen `/admin/users` und `/admin/role-capabilities` | Bidirektionale Links (User→Rolle, Rolle→User) | Diese Phase (D-04/D-05) | Erstmalig — aufgedeckte Datenmodell-Lücke (Pitfall 1) muss dabei mitgelöst werden |

**Deprecated/outdated:**
- `UserDetailDrawer.tsx`: wird ersatzlos gelöscht (D-01).
- Der `role="tablist"`-Block in `UserDetailContent.tsx:60-85`: wird ersatzlos entfernt (D-02).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Next.js 16 App Router erlaubt `params`/`searchParams` weiterhin synchron ODER als Promise typisiert in einer neuen `[id]`-Route, exakt analog zu einer bereits im Projekt vorhandenen `[versionId]`/`[id]`-Route | Code Examples, „Server-Route unter PlatformAdminGate" | Falls das Projekt bereits vollständig auf `Promise<params>` (Next 15+/16 async APIs) migriert ist und die neue Route das nicht beachtet, gibt es einen Build-/Type-Fehler — Planner sollte vor dem Schreiben der neuen Route eine bestehende `[id]`-Route als Typ-Vorlage gegenlesen (in dieser Session nicht geöffnet) |
| A2 | Die empfohlene „synthetische Zeilen in `matrix.roles`"-Lösung für D-05 ist die vom Planner bevorzugte Variante gegenüber einem separaten Endpoint | Pitfall 1, Standard Stack „Alternatives Considered" | Beide Varianten sind D-05-konform; falls der Planner den separaten Endpoint wählt, ändert sich der Backend-Task-Zuschnitt, aber nicht das Frontend-Ergebnis wesentlich — geringes Risiko |
| A3 | `next` Version `^16.1.6` aus `package.json` ist die tatsächlich installierte/lauffähige Version im Docker-Frontend-Container | Standard Stack | Sehr gering — Version ist lockfile-gepinnt und Projektstandard, keine Server-Feature-Abhängigkeit dieser Phase testet Next-Versionsgrenzen aktiv |

**Falls diese Tabelle nach Planner-Review leer bleiben soll:** A1 sollte durch einen kurzen Blick in eine bestehende `[id]`/`[versionId]`-Route vor Implementierungsbeginn aufgelöst werden (kein Research-Blocker, da beide Next-Typmuster im selben Repo vorkommen könnten — einfache Vorlagen-Kopie löst es).

## Open Questions (RESOLVED)

1. **Soll der Impact-Count auch auf `RoleCapabilityDetail.tsx` (Detail-Panel) erscheinen, nicht nur auf `RoleMasterList.tsx`?**
   - What we know: UI-SPEC sagt „minimum bar is `RoleMasterList`", lässt aber offen, ob auch im Detail-Panel dupliziert wird.
   - What's unclear: Ob doppelte Anzeige (Master-Zeile + Detail-Panel-Header) gewünscht ist oder Redundanz vermieden werden soll.
   - Recommendation: Planner entscheidet — minimal ist nur `RoleMasterList`, das erfüllt D-05 vollständig.
   - **RESOLVED (Plan 111-05):** Impact-Count erscheint ausschließlich in `RoleMasterList`, nicht dupliziert im Detail-Panel — die minimale, D-05-konforme Variante wurde umgesetzt.

2. **Zeigt `RoleMasterList` die 3 synthetischen globalen Rollen VOR, NACH oder GRUPPIERT-GETRENNT von den bestehenden `role_definitions`-Rollen?**
   - What we know: UI-SPEC beschreibt keine explizite Sortierreihenfolge für die neuen Einträge; CONTEXT.md „Claude's Discretion" deckt „Sektions-Reihenfolge" nur für die User-Detailseite ab, nicht explizit für `RoleMasterList`.
   - What's unclear: Visuelle Gruppierung (z. B. eigene Badge-Beschriftung „Globale App-Rolle" vs. bestehende „Aktive App-Rolle"/„Projekt-/Release-Rolle"/„Historische Rolle") — siehe auch Pitfall 1s Hinweis auf ein mögliches neues `role_kind`-Feld.
   - Recommendation: Planner sollte eine eigene vierte Badge-Kategorie „Globale App-Rolle" definieren (nicht „Historische Rolle" wiederverwenden, da das inhaltlich falsch wäre — die 3 globalen Rollen sind aktiv genutzt, nur nicht capability-editierbar in diesem Bildschirm) und sort_order so wählen, dass die 3 globalen Rollen konsistent (z. B. am Anfang) erscheinen.
   - **RESOLVED (Plan 111-01):** Die drei synthetischen globalen Rollen-Zeilen werden `matrix.Roles` vorangestellt (konsistent am Anfang der Liste), mit eigener `role_kind`-Kategorie statt Wiederverwendung von „Historische Rolle".

3. **Next.js 16 `params`/`searchParams`-Typ-Konvention für die neue `[id]`-Route (sync vs. Promise)** — siehe Assumption A1. Sollte vor Task-Ausführung durch einen Blick in eine bestehende `[id]`/`[versionId]`-Route im Projekt geklärt werden.
   - **RESOLVED (Plan 111-02 / PATTERNS.md):** Die Typkonvention wird umgangen, indem `page.tsx` keine `params`/`searchParams`-Props entgegennimmt — stattdessen liest `UserDetailPageClient` (der `'use client'`-Teil) `useParams()`/`useSearchParams()` selbst. Damit entfällt die sync-vs-Promise-Unterscheidung für diese Route vollständig.

## Environment Availability

Diese Phase ist reine Code-Änderung (Frontend TypeScript + Backend Go) ohne neue externe Laufzeitabhängigkeiten. Alle benötigten Werkzeuge sind bereits Teil des etablierten Docker-Compose-Setups.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker (`team4sv30-frontend`) | Live-Verifikation Frontend (Restart nach jedem Edit, kein HMR) | ✓ (laut Projekt-Memory) | — | — |
| Docker (`team4sv30-backend`) | Live-Verifikation Backend nach Go-Änderungen (`docker compose up -d --build`) | ✓ (laut Projekt-Memory) | — | — |
| PostgreSQL (via Docker) | `app_user_global_roles`/`role_definitions`-Aggregat-Queries | ✓ (Projektstandard) | — | — |
| Vitest | Unit-/Komponententests (`npm test` → `vitest run`) | ✓ `frontend/package.json` verifiziert | 3.x | — |

**Missing dependencies with no fallback:** keine.
**Missing dependencies with fallback:** keine — alle benötigten Werkzeuge sind Projektstandard und laut Memory/Codebase-Verifikation vorhanden.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (`frontend/vitest.config.ts`, `jsdom`-Environment via Dateikopf-Kommentar) `[VERIFIED: frontend/package.json + vitest.config.ts]` |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npx vitest run src/app/admin/users --reporter=dot` |
| Full suite command | `cd frontend && npm test` (→ `vitest run`) |

Backend hat keine Go-Test-Infrastruktur-Änderung in dieser Phase außer der neuen `ListCapabilityMatrix()`-Aggregation — bestehende Tabellen-Test-Konventionen (`_test.go` neben Implementierung, `testify`) gelten unverändert, siehe `authz_permissions_test.go`/`admin_capability_handler_test.go` als Vorlage.

### Phase Requirements → Test Map

| Decision | Behavior | Test Type | Automated Command | File Exists? |
|----------|----------|-----------|--------------------|--------------|
| D-01 | `/admin/users/[id]` rendert für gültige `userId`, `PlatformAdminGate` blockt Nicht-Admins | integration (Component) | `npx vitest run src/app/admin/users/[id]/page.test.tsx` | ❌ Wave 0 |
| D-01 | Zurück-Link mit `?from=` restauriert exakte Query-String; ohne `from` fällt auf `/admin/users` zurück | unit (Component) | `npx vitest run src/app/admin/users/[id]/UserDetailPageClient.test.tsx -t "back link"` | ❌ Wave 0 |
| D-02 | Keine `role="tablist"`/`role="tab"`-Elemente mehr im DOM; `Accordion`-Struktur vorhanden | unit (Component, `queryAllByRole('tab')` → leer) | `npx vitest run src/app/admin/users/[id]/UserDetailPageClient.test.tsx -t "no tablist"` | ❌ Wave 0 (ersetzt bestehenden `page.test.tsx`-Test `clicking_row_keeps_table_visible_on_desktop`, der aktuell `getByRole('tab', ...)` erwartet — dieser Test MUSS als Regressionstest umgeschrieben werden, siehe Wave-0-Gap) |
| D-03 | Items 1–4 initial `aria-expanded="true"` + Kind-Komponente gemountet; Items 5–9 initial `aria-expanded="false"`, Kind-Komponente NICHT gemountet | unit (Component) | `npx vitest run src/app/admin/users/[id]/UserDetailPageClient.test.tsx -t "default open sections"` | ❌ Wave 0 |
| D-03 (Lazy-Cache) | Item 5 einmal öffnen → Fetch; schließen; erneut öffnen → KEIN zweiter Fetch (Pitfall 3) | unit (Component, `vi.fn()`-Call-Count) | `npx vitest run src/app/admin/users/[id]/UserDetailPageClient.test.tsx -t "no refetch on reopen"` | ❌ Wave 0 |
| D-04 (auflösbare Rolle) | `granted_roles`-Badge mit `role_code`, der in `listRoleCapabilities()` existiert → Link sichtbar mit korrektem `href` | unit (Component) | `npx vitest run src/app/admin/users/tabs/UserGroupRightsTab.test.tsx -t "resolvable role link"` | ❌ Wave 0 |
| D-04 (historische Rolle) | `granted_roles`-Badge mit `role_code`, der NICHT in der Matrix existiert → Plain-Badge, kein Link | unit (Component) | `npx vitest run src/app/admin/users/tabs/UserGroupRightsTab.test.tsx -t "unresolvable role no link"` | ❌ Wave 0 |
| D-04 (globale Rolle, strukturell immer unresolvable) | `UserGlobalRolesTab`-Badge (`platform_admin`) → IMMER Plain-Badge (Pitfall 1) | unit (Component, Regressionsschutz gegen künftige Fehlannahme) | `npx vitest run src/app/admin/users/tabs/UserGlobalRolesTab.test.tsx -t "global role never links"` | ❌ Wave 0 |
| D-05 (count > 0) | `RoleMasterList` zeigt `N× vergeben` als Link zu `/admin/users?role={code}` für `platform_admin` mit `global_assignment_count: 3` | unit (Component) | `npx vitest run src/app/admin/role-capabilities/RoleMasterList.test.tsx -t "impact count link"` | ❌ Wave 0 (bestehende Datei existiert, Test ist neu) |
| D-05 (count = 0) | `0× vergeben` als `Badge variant="muted"`, KEIN Link | unit (Component) | `npx vitest run src/app/admin/role-capabilities/RoleMasterList.test.tsx -t "zero count no link"` | ❌ Wave 0 |
| D-05 (non-countable) | Gruppen-/Contribution-Rolle (`translator` o.ä., kein `global_assignment_count`-Feld) zeigt `–`, kein Link | unit (Component) | `npx vitest run src/app/admin/role-capabilities/RoleMasterList.test.tsx -t "non-countable dash"` | ❌ Wave 0 |
| D-05 (Backend-Aggregation) | `ListCapabilityMatrix()` liefert korrekten `global_assignment_count` je globaler Rolle (Go-Unit/Integrationstest gegen Testdaten) | integration (Go, testify + Testdatenbank) | `go test ./internal/repository/... -run TestListCapabilityMatrix_GlobalRoleCounts` | ❌ Wave 0 |
| D-06 (URL round-trip) | Filter setzen → URL enthält `q`/`status`/`role`; Seiten-Reload mit vorgegebener URL → Filter-UI zeigt korrekte Werte | unit (Component, `useSearchParams`-Mock) | `npx vitest run src/app/admin/users/AdminUsersClient.test.tsx -t "url filter roundtrip"` | ❌ Wave 0 (neue Testdatei — `AdminUsersClient.tsx` selbst hat noch keine dedizierte `.test.tsx`, nur `page.test.tsx` deckt sie indirekt ab) |
| D-06 (geteilter Deep-Link ohne `from`) | Direkter Aufruf `/admin/users/42` (kein `from`-Param) → Zurück-Link zeigt auf `/admin/users` (kein Query-String) | unit (Component) | `npx vitest run src/app/admin/users/[id]/UserDetailPageClient.test.tsx -t "no from param fallback"` | ❌ Wave 0 |
| D-06 (Impact-Sprung überschreibt bestehenden role-Filter) | Von `/admin/role-capabilities?role=x` (Rollenauswahl) auf Impact-Count-Klick → `/admin/users?role=y` „löscht alte role, setzt neue role, sonst nichts" (UI-SPEC Z. 173) | unit (Component) | `npx vitest run src/app/admin/role-capabilities/RoleMasterList.test.tsx -t "impact jump clears other params"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** gezielter `npx vitest run <geänderte-Testdatei>` (Quick-Run-Kommando oben), keine volle Suite pro Commit nötig.
- **Per wave merge:** `cd frontend && npm test` (volle Suite) + für Backend-Aggregations-Task: `go test ./internal/repository/... ./internal/handlers/...`.
- **Phase gate:** Volle Suite grün (Frontend + Backend) vor `/gsd:verify-work`; zusätzlich Live-UAT auf `:3000` laut Projekt-Memory (`docker restart team4sv30-frontend` + Strg+F5 nach jedem Frontend-Edit; `docker compose up -d --build team4sv30-backend` nach Go-Änderungen) — insbesondere für D-04/D-05, da die RBAC-Verlinkung nur mit echten DB-Daten (echte `app_user_global_roles`-Zuweisungen) sinnvoll geprüft werden kann.

### Wave 0 Gaps

- [ ] `frontend/src/app/admin/users/page.test.tsx` — **muss überarbeitet werden**, nicht nur ergänzt: Die bestehenden Tests `clicking_row_opens_drawer` und `clicking_row_keeps_table_visible_on_desktop` testen exakt das durch D-01/D-02 entfernte Verhalten (Drawer-Öffnen, `role="tab"`-Elemente) — sie werden nach der Umsetzung zwangsläufig rot bzw. inhaltlich falsch und müssen durch äquivalente Tests für die neue Navigation (Link statt Drawer-State) ersetzt werden.
- [ ] `frontend/src/app/admin/users/UserDetailDrawer.test.tsx` — Datei wird mit `UserDetailDrawer.tsx` gelöscht (D-01); als expliziter Lösch-Task im Plan aufnehmen, nicht nur „vergessen".
- [ ] `frontend/src/app/admin/users/[id]/UserDetailPageClient.test.tsx` — neu, deckt D-01/D-02/D-03/D-04 (teilweise) ab.
- [ ] `frontend/src/app/admin/users/AdminUsersClient.test.tsx` — neu (existiert noch nicht als eigene Datei), deckt D-06 ab.
- [ ] `frontend/src/app/admin/role-capabilities/RoleMasterList.test.tsx` — bestehende Datei erweitern um D-05-Impact-Count-Fälle.
- [ ] `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx` — bestehende Datei erweitern um `?role=`-Vorauswahl-Test.
- [ ] Go-Test für `ListCapabilityMatrix()`-Erweiterung (`backend/internal/repository/authz_capability_mutations_test.go` — Datei existiert laut Verzeichnis-Scan noch nicht separat; ggf. in `capability_join_test.go` oder neue Datei).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | nein (unverändert) | Keycloak-basierte Session bleibt unangetastet |
| V3 Session Management | nein (unverändert) | — |
| V4 Access Control | **ja** | `PlatformAdminGate` (Frontend-Route-Gate) + `requirePlatformAdminIdentity` (Backend, bereits auf allen betroffenen Endpunkten vorhanden) — MUSS auch auf der neuen `/admin/users/[id]`-Route greifen, exakt wie auf `/admin/users` und `/admin/role-capabilities` |
| V5 Input Validation | **ja** | URL-Query-Params (`q`/`status`/`role`) werden bereits serverseitig in `adminUsersListQuery` als parametrisierte SQL-Platzhalter ($1/$2/$3) verwendet — kein SQL-Injection-Risiko; `role`-Wert wird nicht gegen eine Whitelist geprüft (offener Freitext-Vergleich `agr.role = $3`), aber die Frontend-`Select`-Optionen sind hartcodiert — unkritisch, da ein manipulierter `role`-Query-Param im schlimmsten Fall 0 Treffer liefert (kein Schaden) |
| V6 Cryptography | nein | — |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Direkter Aufruf von `/admin/users/[id]` ohne vorherige Listen-Navigation, Umgehung des `PlatformAdminGate` durch clientseitiges State-Manipulieren | Elevation of Privilege | Server-Route MUSS `PlatformAdminGate` serverseitig prüfen (nicht nur `AdminUsersClient`-internen State) — bereits etabliertes Muster auf `/admin/role-capabilities`, 1:1 auf `[id]`-Route übertragen |
| IDOR: beliebige `userId` in `/admin/users/[id]` eingeben, um fremde User-Details zu sehen | Information Disclosure | Bereits durch `PlatformAdminGate` (nur Platform-Admins) abgedeckt — kein zusätzlicher Owner-Check nötig, da die Seite ohnehin nur für Admins zugänglich ist (Admin sieht alle User by design) |
| Manipulierter `?role=`-Query-Param mit unbekanntem Code beim Impact-Sprung | Tampering (harmlos) | Bereits durch bestehende leere-Ergebnis-Semantik abgedeckt (`EmptyState` bei 0 Treffern) — kein zusätzlicher Schutz nötig |

## Sources

### Primary (HIGH confidence — Codebase-Verifikation in dieser Session)
- `frontend/src/app/admin/users/AdminUsersClient.tsx` — vollständig gelesen, 395 Zeilen verifiziert
- `frontend/src/app/admin/users/UserDetailContent.tsx` — vollständig gelesen (Tab-Leiste, `activatedTabs`-Muster)
- `frontend/src/app/admin/users/UserDetailDrawer.tsx`, `page.tsx` — vollständig gelesen
- `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx`, `RoleCapabilityDetail.tsx`, `RoleMasterList.tsx`, `page.tsx` — vollständig gelesen (Accordion-Kontrollmuster, Mobile-Drawer-Fallback)
- `frontend/src/components/ui/Accordion.tsx`, `PageHeader.tsx`, `Button.tsx` (Ausschnitt), `Card.tsx`/`Badge.tsx` (Varianten-Grep) — API vollständig gelesen bzw. Varianten verifiziert
- `frontend/src/types/admin-capability.ts`, `frontend/src/types/admin-users.ts` — vollständig gelesen
- `frontend/src/lib/api.ts` (Ausschnitte `listAdminUsersPage`, `listRoleCapabilities`, `grantRoleCapability`, `revokeRoleCapability`) — gelesen
- `frontend/src/app/admin/fansubs/[id]/edit/hooks/useFansubEditMainTab.ts`, `ReadinessTab.tsx` (Suspense/Mock-Muster) — gelesen, als Referenzmuster für D-06 verwendet
- `frontend/src/app/invitations/accept/page.tsx` (Suspense-Gegenbeispiel) — gelesen, zur Abgrenzung „wann ist Suspense nötig"
- `backend/internal/repository/admin_users_queries.go` (Ausschnitt) — `global_role`-Filter-SQL verifiziert
- `backend/internal/handlers/admin_capability_handler.go` — vollständig gelesen
- `backend/internal/repository/authz_capability_mutations.go` — vollständig gelesen (`ListCapabilityMatrix`, `CapabilityMatrixRoleEntry`-Struct)
- `backend/internal/repository/authz_permissions.go` (Ausschnitte `LoadFansubGroupRoles`, `LoadCapabilityRoles`) — gelesen
- `backend/internal/permissions/permissions.go` (Ausschnitte `IsKnownFansubGroupRole`, `IsCapabilityBearingRole`) — gelesen
- `database/migrations/0072_keycloak_app_users_foundation.up.sql` (CHECK-Constraint `app_user_global_roles.role`) — gelesen
- `database/migrations/0085_role_definitions_seed.up.sql`, `0108_capability_registry.up.sql`, `0112_role_model_cleanup.up.sql` — gelesen, Grundlage für Pitfall 1
- `frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx`, `UserGroupRightsTab.tsx` — vollständig gelesen, Grundlage für Pitfall 1
- `frontend/src/app/admin/users/page.test.tsx` — vollständig gelesen, Grundlage für Wave-0-Gap
- `frontend/vitest.config.ts`, `frontend/package.json` (Ausschnitte) — gelesen
- `backend/cmd/server/admin_routes.go` (Ausschnitt) — Routen-Inventar verifiziert
- `.planning/config.json` — `nyquist_validation: true`, kein `security_enforcement`-Key (= aktiviert) verifiziert
- `.planning/ROADMAP.md` §Phase 111, `.planning/REQUIREMENTS.md` (kein Phase-111-Mapping), `.planning/STATE.md` — gelesen

### Secondary (MEDIUM confidence)
— keine (keine externen WebSearch-Quellen für diese rein interne Codebase-Recherche nötig)

### Tertiary (LOW confidence)
— keine

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — keine neuen Pakete, alle Bausteine bereits verifiziert im Repo vorhanden
- Architecture: HIGH — alle Muster (Accordion-Control, URL-State, Server-Route-Gate) aus tatsächlich existierendem, produktivem Repo-Code abgeleitet
- Pitfalls: HIGH (Pitfall 1) — direkt aus Migrationen + Repository-Code verifiziert, keine Spekulation; MEDIUM (Pitfalls 2–5) — logische Konsequenzen aus verifiziertem Code, aber Umsetzungsentscheidung liegt beim Planner

**Research date:** 2026-07-28
**Valid until:** 30 Tage (stabile interne Codebase, keine externen API-Abhängigkeiten mit Versions-Drift-Risiko)
