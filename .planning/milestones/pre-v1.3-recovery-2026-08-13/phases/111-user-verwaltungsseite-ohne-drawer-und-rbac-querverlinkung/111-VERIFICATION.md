---
phase: 111-user-verwaltungsseite-ohne-drawer-und-rbac-querverlinkung
verified: 2026-07-28T19:32:00Z
status: human_needed
score: 6/6 Decisions verifiziert
overrides_applied: 0
human_verification:
  - test: "Live-Browser-UAT: /admin/users mit Filtern → Zeilenklick → /admin/users/[id] → Zurück-Link stellt exakte Filteransicht wieder her"
    expected: "URL zeigt q/status/role; Detailseite öffnet mit 4 offenen/geladenen Accordion-Sektionen; Zurück-Link führt exakt zur vorherigen gefilterten Liste zurück (inkl. Sonderzeichen wie '+' in der Suche)"
    why_human: "Docker war in allen Ausführungssessions nicht erreichbar; keine Live-Browser-Verifikation der 5 Pläne durchgeführt (dokumentiert in allen 5 SUMMARYs). Der zugehörige CR-01-Bugfix (doppelte Dekodierung) wurde zwar per Code-Review + Unit-Test abgesichert, ein echter End-to-End-Durchlauf im Browser steht noch aus."
  - test: "Live-UAT RBAC-Querverlinkung: User mit Gruppenrolle öffnen → 'Was darf diese Rolle?' klicken → landet auf /admin/role-capabilities mit vorausgewählter Rolle; dort Impact-Count einer globalen Rolle klicken → landet auf /admin/users?role=... mit gefilterter Liste"
    expected: "Beide Sprung-Richtungen funktionieren mit echten Datenbank-Daten (app_user_global_roles/fansub_group_members)"
    why_human: "Unit-/Komponententests decken die Logik ab (resolveRoleLink, Impact-Count-Rendering, ?role=-Vorauswahl), aber kein Docker-Container lief in der Ausführungssession — keine Bestätigung mit echten Backend-Daten."
  - test: "Visuelle Prüfung Accordion-Layout und Impact-Count-Darstellung gegen 111-UI-SPEC.md"
    expected: "Sektionsreihenfolge, Abstände, Chevron-Verhalten, Impact-Count-Badge-Platzierung entsprechen der UI-SPEC"
    why_human: "Layout-/Abstands-/visuelle Qualität ist nicht per grep/Testlauf prüfbar."
---

# Phase 111: User-Verwaltungsseite ohne Drawer und RBAC-Querverlinkung Verification Report

**Phase Goal:** Die User-Verwaltung auf `/admin/users` ohne User-Detail-Drawer neu strukturieren (progressive Offenlegung auf eigener deep-linkbarer Detailseite `/admin/users/[id]`), plus bidirektionale RBAC-Querverlinkung zu `/admin/role-capabilities` (User→Rolle „Was darf diese Rolle?"-Link; Rolle→User „N-mal vergeben"-Impact-Count mit Sprung zur gefilterten User-Liste). Fachliche Trennung zu role-capabilities bleibt; NICHT Phase 94.

**Verified:** 2026-07-28T19:32:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Hinweis zur Coverage-Einheit

Für Phase 111 sind in `.planning/REQUIREMENTS.md` **keine** REQ-IDs gemappt (per Grep bestätigt: kein Treffer für „111"). Konsistent mit der Aufgabenstellung ist die Coverage-Einheit deshalb `D-01`…`D-06` aus `111-CONTEXT.md`. Jede Decision wurde einzeln gegen den tatsächlichen Code geprüft (nicht nur gegen Task-Abschluss/SUMMARY-Behauptungen).

## Goal Achievement

### Observable Truths (D-01 … D-06)

| # | Decision | Status | Evidence |
|---|---------|--------|----------|
| 1 | **D-01** — `/admin/users/[id]` als eigene deep-linkbare Server-Route unter `PlatformAdminGate`; Drawer entfällt ersatzlos | ✓ VERIFIED | `frontend/src/app/admin/users/[id]/page.tsx` existiert, wrapped `UserDetailPageClient` in `<PlatformAdminGate>`, `export const dynamic = 'force-dynamic'`. `UserDetailDrawer.tsx`/`UserDetailContent.tsx`/`UserDetailDrawer.test.tsx` bestätigt gelöscht (`test -f` → nicht vorhanden). `AdminUsersClient.tsx:102-105` navigiert per `router.push(\`/admin/users/${userId}...?from=...\`)` statt Drawer-State zu setzen. Zurück-Link (`ChevronLeft`-Button, `href={backHref}`) in `UserDetailPageClient.tsx:157-161` vorhanden. |
| 2 | **D-02** — Accordion (`@/components/ui`) statt handgebauter `role="tablist"`-Leiste | ✓ VERIFIED | `UserDetailPageClient.tsx` importiert `Accordion` aus `@/components/ui` und rendert `<Accordion items={items} mode="multi" openIds={openIds} onOpenChange={handleOpenChange} keepMountedIds={loadedIds} />`. Grep nach `role="tablist"`/`role="tab"` in `frontend/src/app/admin/users/**` liefert nur einen Treffer in einem Test-Kommentar (`page.test.tsx:140`, beschreibt den *entfernten* Zustand), kein Produktionscode. Test „no tablist" (`UserDetailPageClient.test.tsx`) grün: `queryAllByRole('tab')`/`queryAllByRole('tablist')` leer. Kein `Tabs`-Primitiv auf dieser Route importiert. |
| 3 | **D-03** — Items 1-4 (Übersicht/Globale Rollen/Gruppenmitgliedschaften/Gruppenrechte) initial offen+geladen; Items 5-9 lazy, kein Re-Fetch bei Wiederöffnen | ✓ VERIFIED | `DEFAULT_OPEN_IDS = ['overview','roles','memberships','group-rights']` initialisiert sowohl `openIds` als auch `loadedIds`. `Accordion.tsx` wurde additiv um `keepMountedIds` erweitert (`isMounted = isOpen || keepMountedIds?.has(item.id)`) — Panel bleibt bei geschlossenem Zustand über `hidden`-Attribut im DOM statt zu unmounten (verhindert Re-Fetch, siehe Pitfall 3). Test „default open sections" und „no refetch on reopen" beide grün (bestätigt per Live-Testlauf, s.u.). Additiver, non-breaking Prop (Default `undefined`) — bestehende `Accordion`-Konsumenten (`RoleCapabilityDetail.tsx`) unverändert. |
| 4 | **D-04** — „Was darf diese Rolle?"-Link nur für auflösbare Rollen in `UserGroupRightsTab`; `UserGlobalRolesTab` unangetastet | ✓ VERIFIED | `resolveRoleLink.ts` (reine Lookup-Funktion) existiert und wird in `UserGroupRightsTab.tsx` importiert/verwendet (`resolveRoleLink(role, matrix)` → bedingter `Button href` „Was darf diese Rolle?"). `UserGlobalRolesTab.tsx` vollständig gelesen — kein `resolveRoleLink`/`listRoleCapabilities`-Import, kein Match-Code (Grep bestätigt 0 Treffer). Regressionstest „global role never links" grün. Unauflösbare Rollen bleiben reine `Badge` ohne Link (getestet: „unresolvable role no link"). |
| 5 | **D-05** — Impact-Count „N× vergeben" in `RoleMasterList` gebunden an `global_assignment_count`/`role_kind` (NICHT `assignable`); Backend liefert 3 synthetische globale Rollen-Zeilen | ✓ VERIFIED | Backend: `CapabilityMatrixRoleEntry.GlobalAssignmentCount *int` / `RoleKind string` in `authz_capability_mutations.go`; `CountGlobalRoleAssignments()` aggregiert `app_user_global_roles GROUP BY role`; `admin_capability_handler.go` merged 3 synthetische Zeilen (`globalAppRoleCodes`) mit `role_kind="global_app_role"` vor `matrix.Roles`. Go-Test `TestListCapabilityMatrixIncludesSyntheticGlobalRoleEntries` + Regressionstest grün (`go test ./internal/handlers/... ./internal/repository/...` → ok, cached PASS). Frontend: `renderImpactCount()` in `RoleMasterList.tsx` prüft `role.global_assignment_count == null` (→ „–"), `> 0` (→ klickbarer `Button href="/admin/users?role=..."`), sonst `0× vergeben`-`Badge` — explizit **nicht** über `assignable` (Pitfall 1 vermieden, per Kommentar + Code bestätigt). Alle 4 zugehörigen Tests grün. |
| 6 | **D-06** — Listenfilter URL-getrieben (`useSearchParams`, `useUserListFilters.ts`); `role`→`global_role`-Übersetzung an API-Call-Site; Zurück-Link stellt exakten Query-String wieder her; `?role=`-Vorauswahl auf `RoleCapabilityClient` | ✓ VERIFIED (inkl. CR-01-Fix bestätigt) | `useUserListFilters.ts` synct `q`/`status`/`role` über `useSearchParams()`/`router.replace`; `params.global_role = role \|\| undefined` — Übersetzung erfolgt ausschließlich im zurückgegebenen `params`-Objekt (URL-Key bleibt `role`). `AdminUsersClient.tsx` liest Filter aus dem Hook, kein lokaler Filter-State mehr. **CR-01-Fix verifiziert:** `UserDetailPageClient.tsx:59-60` liest `backHref = fromQuery ? \`/admin/users?${fromQuery}\` : '/admin/users'` — die im Review gefundene doppelte `decodeURIComponent`-Dekodierung ist entfernt (Commit `089dda50`). Neuer Regressionstest „back link roundtrips special characters in search query" existiert und ist grün (Live-Testlauf bestätigt: 6/6 in `UserDetailPageClient.test.tsx`). `RoleCapabilityClient.tsx` liest `?role=` via `useSearchParams`, wählt beim ersten erfolgreichen Matrix-Load automatisch aus (`appliedUrlRoleRef`-Guard, verhindert Re-Trigger nach Mutation-Refresh). Test „wählt Rolle aus ?role=-Query-Param beim Laden vor" grün. |

**Score:** 6/6 Decisions verifiziert (code-seitig)

### Review-Findings-Status (111-REVIEW.md)

| Finding | Schweregrad | Fix-Commit | Verifiziert |
|---|---|---|---|
| CR-01 — doppelte `from`-Dekodierung korrumpiert Suchbegriffe mit `+`/Sonderzeichen | Critical | `089dda50` | ✓ Code geprüft (`?${fromQuery}` statt `decodeURIComponent`), Regressionstest grün |
| WR-01 — keine Validierung der Routen-ID (`NaN`-Requests) | Warning | `8d8ac9e0` | ✓ `isValidUserId`-Guard + `ErrorState`-Fallback in `UserDetailPageClient.tsx:57,95-102` |
| WR-02 — handgebautes natives `<button>` in `RoleMasterList.tsx` (CLAUDE.md-Verstoß) | Warning | `8ef4661e` | ✓ `RoleMasterList.tsx` nutzt jetzt `Button`-Primitive (`import { Button } from '@/components/ui/Button'`, `<Button type="button" variant="ghost" ...>`) statt rohem `<button>` |
| WR-03 — Test-Mock für `useSearchParams` bildet reale Dekodierung nicht nach, maskiert CR-01 | Warning | `f99cd4af` | ✓ Neuer Test „back link roundtrips special characters in search query" simuliert reale Prozentkodierung und ist grün |
| IN-01 — `role_code` ohne `encodeURIComponent` in `RoleMasterList.tsx` | Info | offen | Nicht behoben (Info-Level, bewusst nicht blockierend — `role_code` stammt nur aus fester Menge `platform_admin`/`content_admin`/`user`, kein Sicherheitsrisiko) |
| IN-02 — Debounce-Timer-Cleanup fehlt in `useUserListFilters.ts` | Info | offen | Nicht behoben (Info-Level, praktisch risikoarm laut Review) |

Alle Critical/Warning-Findings aus `111-REVIEW.md` sind durch dedizierte Fix-Commits geschlossen und im aktuellen Code bestätigt. Die beiden verbleibenden Info-Findings sind laut Review selbst nicht blockierend und werden hier nicht als Gap gewertet.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `frontend/src/app/admin/users/[id]/page.tsx` | Server-Route unter `PlatformAdminGate`, `force-dynamic` | ✓ VERIFIED | Existiert, korrekt verdrahtet |
| `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx` | Accordion-Host mit `openIds`/`loadedIds`, Zurück-Link | ✓ VERIFIED | Existiert, 177 Zeilen, alle Pflichtfelder vorhanden |
| `frontend/src/app/admin/users/UserDetailContent.tsx` | Muss gelöscht sein | ✓ VERIFIED | `test -f` → nicht vorhanden |
| `frontend/src/app/admin/users/UserDetailDrawer.tsx` | Muss gelöscht sein | ✓ VERIFIED | `test -f` → nicht vorhanden |
| `frontend/src/app/admin/users/useUserListFilters.ts` | URL-Query-Sync-Hook | ✓ VERIFIED | Existiert, 137 Zeilen, `useMemo`-stabilisiert |
| `frontend/src/app/admin/users/resolveRoleLink.ts` | Lookup-Utility | ✓ VERIFIED | Existiert, reine Funktion, `encodeURIComponent` korrekt genutzt |
| `backend/internal/repository/authz_capability_mutations.go` | `CountGlobalRoleAssignments()` | ✓ VERIFIED | Methode vorhanden, Query gegen `app_user_global_roles` |
| `backend/internal/handlers/admin_capability_handler.go` | Merge-Logik synthetischer Zeilen | ✓ VERIFIED | `globalAppRoleCodes`/`globalAppRoleLabels`, Merge-Loop vorhanden |
| `frontend/src/app/admin/role-capabilities/RoleMasterList.tsx` | Impact-Count-Rendering | ✓ VERIFIED | `renderImpactCount()`, Badge-Label-Kette korrekt |
| `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx` | `?role=`-Vorauswahl | ✓ VERIFIED | `useSearchParams`, `appliedUrlRoleRef`-Guard |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `AdminUsersClient.tsx` | `/admin/users/[id]` | `router.push` mit `from=`-Param | ✓ WIRED | `handleRowNavigate` erzeugt exakten Kontrakt |
| `UserDetailPageClient.tsx` | `/admin/users` (Zurück) | `backHref` aus `searchParams.get('from')` | ✓ WIRED (Bug behoben) | Einfache Dekodierung, kein Double-Decode mehr |
| `UserDetailPageClient.tsx` | `tabs/*.tsx` (9 Komponenten) | `Accordion items[].children` bedingt auf `loadedIds` | ✓ WIRED | Alle 9 Items korrekt verdrahtet |
| `UserGroupRightsTab.tsx` | `/admin/role-capabilities?role=...` | `resolveRoleLink` + `Button href` | ✓ WIRED | Nur bei auflösbarer Rolle |
| `RoleMasterList.tsx` | `/admin/users?role=...` | `Button href`, `global_assignment_count > 0` | ✓ WIRED | Impact-Count-Link korrekt bedingt |
| `RoleCapabilityClient.tsx` | `handleSelectRole` | `useSearchParams().get('role')` beim ersten Matrix-Load | ✓ WIRED | Ref-Guard verhindert Re-Trigger nach Mutation |
| `admin_capability_handler.go ListCapabilityMatrix` | `authz_capability_mutations.go CountGlobalRoleAssignments` | `capabilityMutationRepo`-Interface | ✓ WIRED | Interface erweitert, Aufruf vorhanden |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Backend Build | `cd backend && go build ./...` | Exit 0 | ✓ PASS |
| Backend Tests (Handler+Repository) | `go test ./internal/handlers/... ./internal/repository/...` | `ok` (beide Pakete) | ✓ PASS |
| Frontend Ziel-Testsuite (users + role-capabilities) | `npx vitest run "src/app/admin/users" "src/app/admin/role-capabilities" --reporter=dot` | 11 Testdateien, 47 Tests, alle grün | ✓ PASS |
| CR-01-Regressionstest (Sonderzeichen-Rundreise) | `npx vitest run ".../UserDetailPageClient.test.tsx"` | 6/6 grün inkl. „roundtrips special characters" | ✓ PASS |
| D-05/D-06-Tests (Impact-Count, `?role=`-Vorauswahl) | `npx vitest run RoleMasterList.test.tsx RoleCapabilityClient.test.tsx` | 18/18 grün | ✓ PASS |
| TypeScript-Check (phase-relevante Dateien) | `npx tsc --noEmit` gefiltert auf `admin/users`\|`admin/role-capabilities`\|`admin-capability` | Keine Treffer (kein Fehler) | ✓ PASS |
| Debt-Marker-Scan (`TBD`/`FIXME`/`XXX`) | grep auf allen Phase-111-Dateien | Keine Treffer | ✓ PASS |

### Probe Execution

Keine dedizierten `scripts/*/tests/probe-*.sh`-Dateien für diese Phase gefunden bzw. deklariert — Schritt übersprungen (kein Migrations-/Tooling-Phasentyp).

### Requirements Coverage

Keine REQ-IDs für Phase 111 in `.planning/REQUIREMENTS.md` gemappt (bestätigt per Grep). Coverage-Einheit sind D-01…D-06 (siehe Tabelle oben) — alle 6 verifiziert.

### Anti-Patterns Found

Keine Blocker-Anti-Patterns gefunden. Info-Findings aus dem Code-Review (IN-01, IN-02) bleiben unadressiert, sind aber laut Review-Klassifizierung nicht blockierend und werden hier nicht als Gap gezählt.

### Human Verification Required

#### 1. Live-Browser-UAT: Vollständiger Filter→Detail→Zurück-Kreislauf

**Test:** `/admin/users` mit Suche (inkl. Sonderzeichen wie `+`/E-Mail-Alias), Status- und Rollenfilter befüllen → Zeile anklicken → Detailseite prüfen (4 offene Sektionen, Accordion statt Tabs) → „Zurück zur Liste" klicken.
**Expected:** URL der Liste zeigt `?q=...&status=...&role=...`; Detailseite ist unter `/admin/users/{id}?from=...` erreichbar; Zurück-Link stellt exakt dieselbe gefilterte Ansicht wieder her, auch mit Sonderzeichen in der Suche.
**Why human:** Docker war in allen 5 Ausführungssessions nicht erreichbar (durchgängig dokumentiert in den SUMMARYs); keine Live-Browser-Bestätigung erfolgt. Der zugrunde liegende Bug (CR-01) wurde zwar per Unit-Test abgesichert, ein echter Browser-Durchlauf mit realer URL-Kodierung steht noch aus.

#### 2. Live-UAT bidirektionale RBAC-Querverlinkung mit echten Daten

**Test:** User mit Gruppenrolle öffnen → „Was darf diese Rolle?" klicken → prüfen, dass `/admin/role-capabilities` mit vorausgewählter Rolle lädt. Danach auf `/admin/role-capabilities` den Impact-Count einer globalen Rolle (z. B. „3× vergeben") klicken → prüfen, dass `/admin/users?role=...` mit passend gefilterter Liste lädt.
**Expected:** Beide Sprung-Richtungen funktionieren mit echten `app_user_global_roles`/`fansub_group_members`-Daten aus der Datenbank.
**Why human:** Backend-Query (`CountGlobalRoleAssignments`) und Frontend-Logik sind unit-getestet, aber nie gegen den echten laufenden Stack (Docker) verifiziert worden.

#### 3. Visuelle Prüfung gegen 111-UI-SPEC.md

**Test:** Layout/Abstände/Chevron-Verhalten der Accordion-Sektionen sowie Platzierung des Impact-Count-Badges neben dem Rollen-Auswahl-Button visuell mit UI-SPEC abgleichen.
**Expected:** Entspricht der dokumentierten UI-SPEC (Reihenfolge, Default-States, Badge-Label „Globale App-Rolle").
**Why human:** Visuelle/Layout-Qualität ist nicht per Testlauf/grep prüfbar.

### Gaps Summary

Keine Code-seitigen Gaps gefunden. Alle 6 Decisions (D-01…D-06) sind im Code korrekt implementiert und durch grüne, gezielte Testläufe abgesichert (Backend: `go build`/`go test` grün; Frontend: 47/47 Ziel-Tests grün, inkl. der beiden neuen Review-Fix-Regressionstests). Alle 4 nicht-Info-Findings aus `111-REVIEW.md` (1 Critical, 3 Warning) sind durch eigene Commits behoben und im aktuellen Code verifiziert.

Der Status ist `human_needed` **nicht** wegen fehlender Codequalität, sondern weil in **keiner** der 5 Ausführungssessions ein Live-Browser-Test gegen den laufenden Docker-Stack möglich war (durchgängige Umgebungs-Einschränkung, in allen SUMMARYs dokumentiert). Die beiden zentralen Nutzerflüsse dieser Phase — (a) Filter→Detail→Zurück-Kreislauf und (b) bidirektionale RBAC-Querverlinkung — sind bislang ausschließlich durch Unit-/Komponententests, nicht durch eine echte Browser-Session mit realen Backend-Daten bestätigt. Dies ist gemäß Aufgabenstellung explizit **kein Code-Defekt**, sondern ein offener Punkt für manuelles UAT.

Die 5 vorbestehenden, phasenfremden Testfehlschläge (`ReportModal.test.tsx`, `admin/anime/page.test.tsx`, `publicPageWidthContract.test.ts`, `me/profile/page.test.tsx`, `useAdminAnimeCreateController.test.ts`) wurden bewusst nicht als Gap gewertet — sie liegen außerhalb der `files_modified` aller 5 Pläne dieser Phase und sind in `deferred-items.md` bereits dokumentiert.

---

_Verified: 2026-07-28T19:32:00Z_
_Verifier: Claude (gsd-verifier)_
