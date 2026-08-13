# Phase 111: User-Verwaltungsseite ohne Drawer und RBAC-Querverlinkung - Pattern Map

**Mapped:** 2026-07-28
**Files analyzed:** 11 (neu/geändert/gelöscht, Frontend + Backend)
**Analogs found:** 11 / 11

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/app/admin/users/[id]/page.tsx` (NEU) | route (Server-Component) | request-response | `frontend/src/app/admin/role-capabilities/page.tsx` (Gate-Wrapper) **+** `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` (dynamischer `[id]`-Client-Zugriff via `useParams`) | role-match (Kombination zweier Analoga nötig, siehe Abweichungs-Hinweis unten) |
| `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx` (NEU) | component (Accordion-Host) | CRUD (lazy-load pro Sektion) | `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx` (kontrollierter Accordion-State) **+** `frontend/src/app/admin/users/UserDetailContent.tsx` (bestehendes `activatedTabs`-Lazy-Muster, 1:1 zu migrieren) | exact (State-Migrationspfad ist eindeutig) |
| `frontend/src/app/admin/users/AdminUsersClient.tsx` (ÄNDERN) | component (Listen-Client) | request-response + URL-state | `frontend/src/app/admin/fansubs/[id]/edit/hooks/useFansubEditMainTab.ts` (URL-Sync-Hook-Vorlage) | exact (Hook-Extraktionsmuster identisch übertragbar) |
| `frontend/src/app/admin/users/useUserListFilters.ts` (NEU, bedingt) | hook | request-response | `frontend/src/app/admin/fansubs/[id]/edit/hooks/useFansubEditMainTab.ts` | exact |
| `frontend/src/app/admin/users/UserDetailDrawer.tsx` (LÖSCHEN) | component | — | — | n/a (Löschung, kein Analog nötig) |
| `frontend/src/app/admin/users/UserDetailContent.tsx` (ABLÖSEN) | component | — | Logik wandert nach `UserDetailPageClient.tsx` | n/a |
| `frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx` (ÄNDERN) | component (Tab/Sektion) | CRUD | sich selbst (bestehende Datei, D-04-Link-Ergänzung) — Referenz für Link-Rendering: `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx` (`Button variant="ghost" size="sm"`-Aktions-Zelle) | exact |
| `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx` (ÄNDERN) | component (Tab/Sektion) | CRUD | sich selbst (bestehende Datei, D-04-Link-Ergänzung neben `Badge`) | exact |
| `frontend/src/app/admin/role-capabilities/RoleMasterList.tsx` (ÄNDERN) | component (Master-Liste) | CRUD | sich selbst (bestehende `badgeLabel`-Logik als Vorlage für die neue Impact-Count-`Badge`) | exact |
| `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx` (ÄNDERN) | component (Master-Detail-Host) | request-response + URL-state | `frontend/src/app/admin/fansubs/[id]/edit/hooks/useFansubEditMainTab.ts` (`useSearchParams`-Vorauswahl-Pattern) | role-match |
| `frontend/src/types/admin-capability.ts` (ÄNDERN) | model (Type-Def) | transform | sich selbst (`RoleEntry`-Interface erweitern) | exact |
| `frontend/src/lib/api.ts` (`listRoleCapabilities`, ÄNDERN) | utility (API-Client-Funktion) | request-response | sich selbst (bestehende Funktion, Response-Typ ändert sich automatisch mit `RoleEntry`) | exact |
| `backend/internal/repository/authz_capability_mutations.go` (`ListCapabilityMatrix`, ÄNDERN) | repository | CRUD (Aggregat-Query) | sich selbst (bestehende Funktion als direkte Erweiterungsbasis) | exact |
| `backend/internal/handlers/admin_capability_handler.go` (`ListCapabilityMatrix`-Handler, ÄNDERN) | controller/handler | request-response | sich selbst (bestehender `Assignable`/`CapabilityEditable`-Post-Processing-Block, Z. 80-87) | exact |
| `frontend/src/app/admin/users/AdminUsers.module.css` (ÄNDERN) | config (CSS Module) | — | sich selbst (Entfernen der `desktopDetailPanel`-Klassen) | exact |

---

## Pattern Assignments

### `frontend/src/app/admin/users/[id]/page.tsx` (route, request-response)

**Wichtiger Abweichungs-Befund gegenüber RESEARCH.md Code-Beispiel:** Die Recherche schlug einen Server-Component-Stil vor (`params: { id: string }` als Props-Typ direkt auf der Page-Funktion). Die tatsächlich verifizierte Projekt-Konvention für **jede** bestehende `[id]`/`[versionId]`-Route ist jedoch: eine sehr dünne `page.tsx` (keine typisierten `params`/`searchParams`-Props), die komplett an eine `'use client'`-Komponente delegiert, welche `useParams()` aus `next/navigation` nutzt. Verifiziert an drei unabhängigen Beispielen:
- `frontend/src/app/admin/episode-versions/[versionId]/edit/page.tsx` (5 Zeilen, reines Delegieren)
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` (`useParams<{ id: string }>()`)
- `frontend/src/app/admin/anime/[id]/edit/page.tsx` (`useParams<{ id: string }>()`)

**Empfehlung für den Planner:** `page.tsx` bleibt ein **Server Component** mit `PlatformAdminGate`-Wrapper (Analog `role-capabilities/page.tsx`, da Access-Gate serverseitig greifen muss — Threat-Pattern aus RESEARCH.md), aber die `id`-Extraktion selbst erfolgt NICHT über eine `params`-Prop, sondern die Client-Komponente `UserDetailPageClient.tsx` liest `useParams()` und `useSearchParams()` selbst (analog zu `fansubs/[id]/edit/page.tsx`s `useParams`-Nutzung, nur eine Ebene weiter unten in der Client-Komponente statt in `page.tsx` selbst, weil hier zusätzlich `PlatformAdminGate` server-seitig um die Client-Komponente gelegt werden muss).

**Analog A — Gate-Wrapper** (`frontend/src/app/admin/role-capabilities/page.tsx`, vollständig, 22 Zeilen):
```typescript
import { PlatformAdminGate } from '@/components/auth/PlatformAdminGate'

import RoleCapabilityClient from './RoleCapabilityClient'
import styles from './roleCapabilities.module.css'

export default function RoleCapabilitiesPage() {
  return (
    <PlatformAdminGate>
      <main className={styles.page}>
        <RoleCapabilityClient />
      </main>
    </PlatformAdminGate>
  )
}
```
Auch `frontend/src/app/admin/users/page.tsx` folgt exakt diesem Muster (`export const dynamic = 'force-dynamic'` + `PlatformAdminGate` + `<main>`).

**Analog B — dynamisches Segment via `useParams`** (`frontend/src/app/admin/fansubs/[id]/edit/page.tsx`, vollständig, 25 Zeilen):
```typescript
"use client";
import { useParams } from "next/navigation";
import { readFansubIDFromParams } from "./fansubEditAccess";

export default function AdminFansubEditPage() {
  const params = useParams<{ id: string }>();
  const fansubID = readFansubIDFromParams(params);
  return ( /* ... */ );
}
```

**Konkrete Ziel-Struktur für `[id]/page.tsx`:**
```typescript
import { PlatformAdminGate } from '@/components/auth/PlatformAdminGate'
import { UserDetailPageClient } from './UserDetailPageClient'

export const dynamic = 'force-dynamic'

export default function UserDetailPage() {
  return (
    <PlatformAdminGate>
      <main>
        <UserDetailPageClient />
      </main>
    </PlatformAdminGate>
  )
}
```
`UserDetailPageClient` liest `userId` selbst über `useParams<{ id: string }>()` und `from` über `useSearchParams()` — kein Props-Durchreichen von `page.tsx` nötig (konsistent mit Analog B).

---

### `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx` (component, CRUD/lazy-load)

**Analog 1 — kontrollierter Accordion mit `openIds`/`onOpenChange`** (`frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx:70-73` + `RoleCapabilityDetail.tsx:180-186`):
```typescript
// RoleCapabilityClient.tsx:70
const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())
// ... an RoleCapabilityDetail durchgereicht als openCategories/onOpenCategoriesChange

// RoleCapabilityDetail.tsx:180-186
<Accordion
  items={accordionItems}
  mode="multi"
  openIds={openCategories}
  onOpenChange={onOpenCategoriesChange}
/>
```
`Accordion`-Primitiv-Vertrag (`frontend/src/components/ui/Accordion.tsx:9-28`):
```typescript
export interface AccordionItemDef {
  id: string
  title: ReactNode
  children: ReactNode
}
export interface AccordionProps {
  items: AccordionItemDef[]
  mode?: 'multi' | 'single'
  openIds?: Set<string>
  onOpenChange?: (next: Set<string>) => void
}
```
**Kritisch (Accordion.tsx:85-94):** Ein geschlossenes Panel wird komplett aus dem DOM entfernt (`{isOpen ? <div>{item.children}</div> : null}`) — beim erneuten Öffnen wird `children` neu gemountet. Ohne zusätzliches `loadedIds`-Cache-Set würde jede Tab-Komponente bei jedem Wiederöffnen neu fetchen (Regression ggü. heutigem `activatedTabs`-Verhalten, das nur `display:none` nutzt).

**Analog 2 — bestehendes Lazy-Aktivierungs-Muster, das migriert wird** (`frontend/src/app/admin/users/UserDetailContent.tsx:49-56`, vollständig gelesen):
```typescript
const [activeTab, setActiveTab] = useState<TabId>('overview')
const [activatedTabs, setActivatedTabs] = useState<Set<TabId>>(new Set(['overview']))

function handleTabChange(tabId: TabId) {
  setActiveTab(tabId)
  setActivatedTabs((prev) => new Set([...prev, tabId]))
}
```
Migrations-Ziel (kombiniert `openIds` D-03-Default + `loadedIds`-Cache, siehe RESEARCH.md Pattern 2):
```typescript
const [openIds, setOpenIds] = useState<Set<string>>(
  new Set(['overview', 'roles', 'memberships', 'group-rights'])
)
const [loadedIds, setLoadedIds] = useState<Set<string>>(
  new Set(['overview', 'roles', 'memberships', 'group-rights'])
)
function handleOpenChange(next: Set<string>) {
  setOpenIds(next)
  setLoadedIds((prev) => new Set([...prev, ...next]))
}
```
Alle 9 `AccordionItemDef.children` werden analog zu `UserDetailContent.tsx:87-113` bedingt gerendert: `loadedIds.has(id) ? <TabComponent userId={userId} /> : null` (kein `role="tabpanel"`/`display:none`-Wrapper mehr nötig — `Accordion` übernimmt das Ein-/Ausblenden inkl. `aria-expanded`/`role="region"`).

**Zurück-Link-Header** — Analog `PageHeader`-Nutzung mit `breadcrumbs`-Slot (`frontend/src/components/ui/PageHeader.tsx:5-11`, Props-Interface):
```typescript
export interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  breadcrumbs?: ReactNode
}
```
Einsatz gemäß RESEARCH.md Code-Beispiel (Button mit `href`, `variant="ghost" size="sm"`, `leftIcon`):
```typescript
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
`Button` unterstützt `href` bereits nativ (`frontend/src/components/ui/Button.tsx:26-92`, `href?: string` im Props-Union + `<a>`-Rendering-Zweig).

---

### `frontend/src/app/admin/users/AdminUsersClient.tsx` (component, request-response + URL-state)

**Analog — URL-Query-Sync-Hook** (`frontend/src/app/admin/fansubs/[id]/edit/hooks/useFansubEditMainTab.ts`, vollständig gelesen, 76 Zeilen):
```typescript
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useFansubEditMainTab({ isPlatformAdmin, capabilities }: Args) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mainTabFromQuery = parseMainTab(searchParams.get("tab"));
  const [activeMainTab, setActiveMainTab] = useState<MainTab>(initialMainTab);

  useEffect(() => {
    const nextTab = resolveMainTabForAccess(mainTabFromQuery, isPlatformAdmin, capabilities);
    setActiveMainTab((current) => (current === nextTab ? current : nextTab));
  }, [capabilities, isPlatformAdmin, mainTabFromQuery]);

  const handleMainTabChange = useCallback((tab: MainTab) => {
    if (!canUseMainTab(tab, isPlatformAdmin, capabilities)) return;
    setActiveMainTab(tab);
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    if (tab === "basic") nextSearchParams.delete("tab");
    else nextSearchParams.set("tab", tab);
    const query = nextSearchParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [capabilities, isPlatformAdmin, pathname, router, searchParams]);

  return { activeMainTab, availableMainTabs, handleMainTabChange };
}
```
**Übertragung auf `useUserListFilters`** (empfohlener Extraktions-Hook, RESEARCH.md Pitfall 4 begründet die Auslagerung — Datei ist bereits bei 395 Zeilen): dieselbe `useSearchParams`/`router.replace({scroll:false})`-Struktur, aber für drei Parameter (`q` debounced, `status`/`role` sofort) statt einem `tab`-Parameter. `q` behält den lokalen `useState`-Zwischenwert für den 300ms-Debounce (bereits vorhanden in `AdminUsersClient.tsx:108-114`), nur das Ziel des `setParams`-Aufrufs wird zu `router.replace(...)` statt reinem lokalem `setState`.

**Kein `<Suspense>`-Wrapper nötig:** `/admin/users/page.tsx` hat bereits `export const dynamic = 'force-dynamic'` (verifiziert), analog zu `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` — dieses Repo-Muster verzichtet in diesem Fall konsequent auf `<Suspense>` um `useSearchParams`-Konsumenten.

**Zu entfernender Code (D-01, exakte Zeilen aus der gelesenen Datei):**
- `useDesktopUserDetails()`-Hook (`AdminUsersClient.tsx:59-72`) — komplett entfernen.
- Inline-Desktop-Detail-Panel-Block (`AdminUsersClient.tsx:196-213`, `styles.desktopDetailPanel`/`desktopDetailHeader`/`desktopDetailTitle`/`desktopDetailMeta`).
- `UserDetailDrawer`-Einbindung am Dateiende (`AdminUsersClient.tsx:266-271`).
- Import `UserDetailContent`/`UserDetailDrawer` (`AdminUsersClient.tsx:25-26`).

**Zeilen-Klick → Navigation statt `setSelectedUserId`** (aktuell `AdminUsersClient.tsx:293-300`, `onClick={onClick}` auf `TableRow` mit `cursor: 'pointer'`) wird zu `router.push`/`Link href` gemäß RESEARCH.md Code-Beispiel — das bestehende `TableRow`-Klick-Muster (inkl. `aria-selected`, `style={{ cursor: 'pointer' }}`) bleibt strukturell erhalten, nur das `onClick`-Ziel ändert sich.

**Pitfall 5 — Nebenauftrag im selben Edit-Pass:** natives `<label htmlFor="role-filter" className={styles.roleFilterLabel}>` (`AdminUsersClient.tsx:170-172`) wird durch `FormField label="Globale Rolle" htmlFor="role-filter"` ersetzt. `FormField`-Vertrag (`frontend/src/components/ui/FormField.tsx:5-13`):
```typescript
export interface FormFieldProps {
  label?: string
  htmlFor?: string
  hint?: string
  error?: string
  required?: boolean
  disabled?: boolean
  children: ReactNode
}
```

---

### `frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx` / `UserGroupRightsTab.tsx` (D-04-Link)

**Bestehendes Badge-Rendering, an das der Link angehängt wird:**

`UserGlobalRolesTab.tsx:207-211` (`RolesTable`, Rollen-Zelle):
```typescript
<TableCell>
  <Badge variant="info">{roleLabel(role)}</Badge>
</TableCell>
```
Diese Rollen sind **strukturell nie** in `listRoleCapabilities()` auflösbar (Pitfall 1) — hier bleibt die Badge planmäßig ohne Link (keine Code-Änderung an sich, aber ein expliziter Regressionstest laut RESEARCH.md Test-Map).

`UserGroupRightsTab.tsx:52-58` (`RightsTable`, `granted_roles`-Zelle — **hier** greift D-04 tatsächlich):
```typescript
{r.granted_roles.length === 0 ? (
  <Badge variant="muted">–</Badge>
) : (
  r.granted_roles.map((role) => (
    <Badge key={role} variant="info">{role}</Badge>
  ))
)}
```
Analoges Aktions-Link-Muster in derselben Datei (`UserGroupRightsTab.tsx:76-84`, `Button variant="ghost" size="sm"` als sekundäre Aktion neben Tabellendaten):
```typescript
<Button
  variant="ghost"
  size="sm"
  onClick={() => window.open(`/admin/fansubs/${r.fansub_group_id}/edit`, '_blank')}
>
  Gruppe bearbeiten
</Button>
```
D-04-Umsetzung: statt `window.open` → `Button href="/admin/role-capabilities?role={role}" variant="ghost" size="sm"` (Client-Navigation via `href`, kein `_blank`) neben jeder auflösbaren `role`-`Badge`, per Client-seitigem Matching gegen die per `listRoleCapabilities()` geladene Matrix (Utility `resolveRoleLink`, siehe RESEARCH.md Pattern 3 — kein neuer Analog nötig, reine Lookup-Funktion).

---

### `frontend/src/app/admin/role-capabilities/RoleMasterList.tsx` (D-05 Impact-Count)

**Bestehendes Badge/Kontext-Label-Muster, das die Impact-Count-Badge ergänzt** (vollständig gelesen, 96 Zeilen):
```typescript
// RoleMasterList.tsx:33-41
const isEditable = role.capability_editable !== false
const isAssignable = role.assignable === true
const badgeLabel = !isEditable
  ? 'Historische Rolle'
  : isAssignable
    ? 'Aktive App-Rolle'
    : 'Projekt-/Release-Rolle'

// RoleMasterList.tsx:86-88
<Badge variant={isEditable ? 'info' : 'muted'}>
  {badgeLabel}
</Badge>
```
D-05 fügt eine zweite `Badge` in derselben Card-Row hinzu (nicht in eigener Zeile, laut UI-SPEC Z. 171), gespeist aus dem neuen `role.global_assignment_count`-Feld:
```typescript
{role.global_assignment_count != null ? (
  role.global_assignment_count > 0 ? (
    <Badge variant="info" /* als Link/Button href */>
      {role.global_assignment_count}× vergeben
    </Badge>
  ) : (
    <Badge variant="muted">0× vergeben</Badge>
  )
) : (
  <span title="Nur global vergebene Rollen werden gezählt">–</span>
)}
```
Ziel-Navigation: `/admin/users?role={role_code}` (D-05) — dieselbe `Button href`-Fähigkeit wie beim D-04-Link nutzen, kein neues Navigations-Primitive nötig.

**`RoleEntry`-Typ-Erweiterung** (`frontend/src/types/admin-capability.ts:16-30`, vollständig gelesen):
```typescript
export interface RoleEntry {
  role_code: string;
  label_de: string;
  actions: RoleActionState[];
  assignable?: boolean;
  capability_editable?: boolean;
  contexts?: string[];
  // NEU (D-05): global_assignment_count?: number | null
}
```

---

### `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx` (`?role=`-Vorauswahl)

Bestehender lokaler Auswahl-State (`RoleCapabilityClient.tsx:65-125`, vollständig gelesen):
```typescript
const [selectedRoleCode, setSelectedRoleCode] = useState<string | null>(null)
const [isSheetOpen, setIsSheetOpen] = useState(false)
// ...
function handleSelectRole(roleCode: string) {
  setSelectedRoleCode(roleCode)
  setCapabilityError(null)
  if (isMobile) setIsSheetOpen(true)
}
```
D-05-Erweiterung: `useSearchParams().get('role')` beim Mount (bzw. in einem `useEffect`, sobald `matrix` geladen ist) lesen und — falls der Code in `matrix.roles` existiert — denselben `handleSelectRole`-Pfad aufrufen (identisch zu einem manuellen Klick auf `RoleMasterList`). Analog für das "lies URL, synchronisiere lokalen State"-Muster: `useFansubEditMainTab.ts:39-48` (siehe oben, `useEffect`, das `activeMainTab` aus `searchParams` synchronisiert).

---

### Backend: `authz_capability_mutations.go` — `ListCapabilityMatrix()` (D-05 Aggregat)

Vollständig gelesene Funktion (`backend/internal/repository/authz_capability_mutations.go:61-163`). Kernstruktur der Rollen-Aufbau-Schleife (Zeilen 142-151):
```go
roles := make([]CapabilityMatrixRoleEntry, 0, len(roleOrder))
for _, roleCode := range roleOrder {
    roles = append(roles, CapabilityMatrixRoleEntry{
        RoleCode: roleCode,
        LabelDE:  roleLabels[roleCode],
        Actions:  roleActions[roleCode],
        Contexts: roleContexts[roleCode],
    })
}
```
`CapabilityMatrixRoleEntry`-Struct (Zeilen 30-37, Erweiterungsziel für `GlobalAssignmentCount *int`):
```go
type CapabilityMatrixRoleEntry struct {
    RoleCode           string                        `json:"role_code"`
    LabelDE            string                        `json:"label_de"`
    Actions            []CapabilityMatrixActionState `json:"actions"`
    Assignable         bool                          `json:"assignable"`
    CapabilityEditable bool                          `json:"capability_editable"`
    Contexts           []string                      `json:"contexts,omitempty"`
    // NEU (D-05): GlobalAssignmentCount *int `json:"global_assignment_count,omitempty"`
}
```
**Analog für das benötigte Aggregat** (`backend/internal/repository/admin_users_queries.go:51-54`, LATERAL-JOIN-Muster gegen dieselbe Tabelle `app_user_global_roles`):
```sql
LEFT JOIN LATERAL (
    SELECT ARRAY_AGG(role ORDER BY role) AS roles
    FROM app_user_global_roles WHERE app_user_id = page.id
) roles ON true
```
Für D-05 wird ein `SELECT role, COUNT(*) FROM app_user_global_roles GROUP BY role`-Query separat ausgeführt (kein LATERAL nötig, da nicht pro Zeile korreliert, sondern eine globale Aggregation über genau 3 mögliche Werte) und anschließend im Go-Code — analog zum bestehenden Post-Processing-Muster im Handler — mit drei synthetischen `CapabilityMatrixRoleEntry`-Zeilen (`platform_admin`/`content_admin`/`user`) zusammengeführt.

### Backend: `admin_capability_handler.go` — Handler-Post-Processing-Analog

Bestehendes Post-Processing-Muster nach dem Repository-Call (Zeilen 80-87, vollständig gelesen):
```go
// Assignable  = im Gruppen-Add-Picker zuweisbar (die 6 fansub_group-Rollen).
// CapabilityEditable = Rolle trägt in aktivem Kontext Rechte ...
for i := range matrix.Roles {
    matrix.Roles[i].Assignable = permissions.IsKnownFansubGroupRole(matrix.Roles[i].RoleCode)
    matrix.Roles[i].CapabilityEditable = permissions.IsCapabilityBearingRole(matrix.Roles[i].RoleCode)
}
```
Dieses Muster (Feld-Anreicherung nach dem reinen Repository-Read, im Handler statt im Repository) ist der bevorzugte Ort, falls der Planner sich für eine handler-seitige statt repository-seitige Zusammenführung der synthetischen Zeilen entscheidet — beide Orte sind im Projekt bereits etabliert (Repository für reine SQL-Aggregation, Handler für spätere Feld-Anreicherung).

---

## Shared Patterns

### `PlatformAdminGate` (Server-seitiges Access-Gate)
**Source:** `frontend/src/app/admin/role-capabilities/page.tsx`, `frontend/src/app/admin/users/page.tsx` (beide identisch: `<PlatformAdminGate><main>...</main></PlatformAdminGate>`)
**Apply to:** `frontend/src/app/admin/users/[id]/page.tsx` (NEU) — exakt dasselbe Wrapper-Muster, keine Abwandlung nötig.

### `useSearchParams` + `router.replace(path, { scroll: false })` (URL-State-Sync)
**Source:** `frontend/src/app/admin/fansubs/[id]/edit/hooks/useFansubEditMainTab.ts` (vollständig zitiert oben)
**Apply to:** `AdminUsersClient.tsx`/`useUserListFilters.ts` (D-06), `RoleCapabilityClient.tsx` (`?role=`-Vorauswahl).

### Kontrollierter `Accordion` mit `openIds`/`onOpenChange` + separatem `loadedIds`-Cache
**Source:** `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx` + `RoleCapabilityDetail.tsx` (Struktur), `frontend/src/app/admin/users/UserDetailContent.tsx` (zu migrierendes `activatedTabs`-Cache-Verhalten)
**Apply to:** `UserDetailPageClient.tsx` (D-02/D-03).

### `Button href=` für Cross-Link-Navigation statt `window.open`/`onClick`
**Source:** `frontend/src/components/ui/Button.tsx:26-92` (Prop-Union mit `href?: string`, rendert `<a>`)
**Apply to:** D-04-Link (User→Rolle), D-05-Link (Rolle→User), Zurück-Link (D-01) — alle drei Cross-Link-Fälle dieser Phase nutzen dasselbe Primitiv statt `window.location`/`window.open`.

### Fehler-/Lade-/Leerzustände
**Source:** durchgängig `LoadingState`/`ErrorState`/`EmptyState` aus `@/components/ui`, siehe `UserGlobalRolesTab.tsx:324-328`, `UserGroupRightsTab.tsx:119-128`, `RoleCapabilityClient.tsx:182-188` — identisches Drei-Zustands-Muster (`isLoading` → `LoadingState`, `error` → `ErrorState` mit `ApiError`-Message-Fallback, leere Daten → `EmptyState`).
**Apply to:** Keine neue Sektion in dieser Phase führt einen neuen Ladezustand ein — alle 9 Tab-Komponenten behalten ihr bestehendes Muster unverändert bei.

---

## No Analog Found

Keine — alle Dateien dieser Phase haben einen direkten oder kombinierten Analog im Repository. Die einzige Besonderheit ist die oben dokumentierte Kombination zweier Analoga für `[id]/page.tsx` (Gate-Wrapper + dynamisches Segment), da im Repo bisher keine einzelne Route beide Eigenschaften gleichzeitig zeigt (alle bestehenden `PlatformAdminGate`-Routen sind nicht-dynamisch; alle bestehenden `[id]`-Routen haben kein serverseitiges Gate, da sie clientseitig via `useAuthSession`/eigene Access-Gates absichern).

---

## Metadata

**Analog search scope:** `frontend/src/app/admin/users/**`, `frontend/src/app/admin/role-capabilities/**`, `frontend/src/app/admin/fansubs/[id]/edit/**`, `frontend/src/app/admin/{episode-versions,anime}/[*]/**` (Next.js-16-`[id]`-Typkonvention-Verifikation), `frontend/src/components/ui/**` (Accordion, Button, PageHeader, FormField), `backend/internal/repository/{authz_capability_mutations,admin_users_queries}.go`, `backend/internal/handlers/admin_capability_handler.go`, `backend/cmd/server/admin_routes.go`
**Files scanned:** ~20 (vollständig gelesen, keine Teilscans nötig — alle Dateien unter 400 Zeilen)
**Pattern extraction date:** 2026-07-28
