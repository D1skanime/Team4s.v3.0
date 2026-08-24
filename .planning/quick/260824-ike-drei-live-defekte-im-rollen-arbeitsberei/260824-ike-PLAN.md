---
phase: quick-ike
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: []
files_modified:
  - backend/internal/repository/authz_capability_mutations.go
  - backend/internal/repository/authz_capability_mutations_test.go
  - backend/internal/handlers/admin_capability_handler.go
  - backend/internal/handlers/admin_capability_handler_test.go
  - shared/contracts/admin-capabilities.yaml
  - frontend/src/types/admin-capability.ts
  - frontend/src/app/admin/roles/RoleRail.tsx
  - frontend/src/app/admin/roles/RoleRail.test.tsx
  - frontend/src/app/admin/roles/roles.module.css
  - frontend/src/app/admin/users/resolveRoleLink.ts
  - frontend/src/app/admin/users/resolveRoleLink.test.ts
  - frontend/src/app/admin/users/tabs/GroupRolesSection.tsx
  - frontend/src/app/admin/users/tabs/GroupRolesSection.test.tsx
  - frontend/src/app/admin/roles/RolesClient.tsx
  - frontend/src/app/admin/roles/RolesClient.test.tsx
  - frontend/src/app/admin/role-capabilities/page.tsx
  - frontend/src/app/admin/role-capabilities/page.test.tsx

must_haves:
  truths:
    - "Alle 18 Rollennamen in der /admin/roles-Rail sind ohne Ellipse vollstaendig lesbar, insbesondere die 6 im Befund genannten (Raw-Bereitstellung, Qualitaetspruefung, Plattform-Admin, Content-Admin, Fansub-Leitung, Technik-Admin); Plattform-Admin und Content-Admin sind eindeutig unterscheidbar."
    - "Die Rollenart (global vs. Gruppen-/Kontext-Rolle) bleibt weiterhin erkennbar -- ueber die vorhandenen Gruppenueberschriften 'Globale Rollen'/'Gruppenrollen', nicht mehr ueber ein Pro-Zeile-Badge."
    - "Die Rail zeigt fuer Gruppenrollen mit echten Inhabern (z. B. co_leader) dieselbe Inhaberzahl wie das Detail-Panel nach dem Laden von listRoleHolders() -- kein '-' mehr bei tatsaechlich vorhandenen Inhabern."
    - "Ein Klick auf 'Was darf diese Rolle?' in der Rechte-Sektion eines Benutzers (GroupRolesSection) oeffnet /admin/roles direkt auf dem Standardrechte-Tab fuer die betroffene Rolle, nicht auf dem Inhaber-Tab."
    - "Ein Aufruf von /admin/roles?role=<code> OHNE ?tab= verhaelt sich exakt wie vor diesem Plan (rollenart-abhaengiger Default: global -> Standardrechte, sonst -> Inhaber)."
    - "/admin/role-capabilities leitet einen vorhandenen ?tab=-Parameter zusammen mit ?role= unveraendert an /admin/roles weiter; ohne tab-Parameter bleibt die Weiterleitung byte-identisch zum bisherigen Verhalten."
    - "Die Impact-Vorschau (RoleCapabilityImpactPreviewModal, CAP-09/CAP-10) und der kanonische Rollen-Capability-Editor bleiben unveraendert funktionsfaehig -- keine Aenderung an Mutationslogik, Aktivierungsstatus oder Bestaetigungsfluss."
    - "docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/app/admin --reporter=basic' zeigt ausschliesslich die 5 vorab bekannten roten Testdateien als Fehlschlaege, keine neuen."
  artifacts:
    - path: "backend/internal/repository/authz_capability_mutations.go"
      provides: "CountGroupRoleHolders(ctx) (map[string]int, error) -- eine Bulk-GROUP-BY-Query ueber fansub_group_member_roles, plus GroupHolderCount *int Feld auf CapabilityMatrixRoleEntry"
      contains: "CountGroupRoleHolders"
    - path: "backend/internal/handlers/admin_capability_handler.go"
      provides: "ListCapabilityMatrix ruft CountGroupRoleHolders zusaetzlich zu CountGlobalRoleAssignments auf und setzt GroupHolderCount je regulaerer Gruppenrolle (permissions.IsKnownFansubGroupRole), fail-open bei Query-Fehler"
      contains: "CountGroupRoleHolders"
    - path: "frontend/src/app/admin/roles/RoleRail.tsx"
      provides: "Rollenname ohne Pro-Zeile-Rollenart-Badge; rowCountText faellt fuer Gruppenrollen auf group_holder_count zurueck statt immer '-' zu zeigen"
      contains: "group_holder_count"
    - path: "frontend/src/app/admin/users/resolveRoleLink.ts"
      provides: "resolveRoleLink(roleCode, matrix, tab?) haengt bei gesetztem tab einen &tab=-Query-Parameter an"
      contains: "tab"
    - path: "frontend/src/app/admin/roles/RolesClient.tsx"
      provides: "Deep-Link-Effect liest zusaetzlich ?tab= und ueberschreibt damit einmalig den rollenart-abhaengigen Default, wenn gueltig"
      contains: "searchParams.get('tab')"
  key_links:
    - from: "backend/internal/handlers/admin_capability_handler.go"
      to: "backend/internal/repository/authz_capability_mutations.go"
      via: "h.mutationRepo.CountGroupRoleHolders(...)"
      pattern: "CountGroupRoleHolders"
    - from: "frontend/src/app/admin/roles/RoleRail.tsx"
      to: "frontend/src/types/admin-capability.ts"
      via: "role.group_holder_count Feldzugriff in rowCountText"
      pattern: "group_holder_count"
    - from: "frontend/src/app/admin/users/tabs/GroupRolesSection.tsx"
      to: "frontend/src/app/admin/users/resolveRoleLink.ts"
      via: "resolveRoleLink(role, matrix, 'caps')-Aufruf"
      pattern: "resolveRoleLink\\(role, matrix, 'caps'\\)"
    - from: "frontend/src/app/admin/role-capabilities/page.tsx"
      to: "frontend/src/app/admin/roles/RolesClient.tsx"
      via: "redirect(...) mit durchgereichtem tab-Parameter"
      pattern: "tab="
---

<objective>
Drei unabhaengige Live-Defekte im aus Quick-260824-ek3 hervorgegangenen Rollen-Arbeitsbereich
(`/admin/roles`) beheben, ohne die dort gerade erst zusammengelegte Master-Detail-Struktur, den
kanonischen Capability-Editor (D-10/CAP-09/CAP-10) oder den kanonischen Benutzer-in-Gruppe-Editor
anzutasten:

1. Sechs von 18 Rollennamen in der Rail werden per Ellipse abgeschnitten (u. a. "Plattform-Admin"
   vs. "Content-Admin" praktisch ununterscheidbar) -- Ursache ist ein redundantes Pro-Zeile-Badge
   (roleKindLabel), das Breite kostet, obwohl die Gruppenueberschriften die Rollenart bereits zeigen.
2. Die Rail zeigt fuer Gruppenrollen durchgehend "-" (kein Backend-Feld fuer eine guenstige
   Pro-Zeile-Inhaberzahl existiert bisher), waehrend das Detail-Panel nach dem Laden von
   `listRoleHolders()` fuer dieselbe Rolle eine echte Zahl zeigt -- ein sichtbarer Widerspruch.
   Kleinste Loesung: `CountGlobalRoleAssignments`s bereits im selben Handler etablierte
   Bulk-Query-Muster (GROUP BY in einer Abfrage, kein N+1) fuer `fansub_group_member_roles`
   kopieren.
3. `GroupRolesSection.tsx`s Link "Was darf diese Rolle?" verspricht Rechte, landet aber auf dem
   Inhaber-Tab (dem bisherigen Default ohne expliziten Tab-Parameter) statt auf Standardrechte.

Purpose: Der Rollen-Arbeitsbereich aus 260824-ek3 ist strukturell fertig; diese drei Befunde sind
Politur-Defekte, die die Glaubwuerdigkeit der neuen Ansicht direkt untergraben (unlesbare Namen,
widerspruechliche Zahlen, falsches Linkziel), aber keine Struktur-/Architekturaenderung erfordern.

Output: RoleRail ohne redundantes Pro-Zeile-Badge und mit vollstaendig lesbaren Namen; eine neue
Backend-Bulk-Query fuer Gruppenrollen-Inhaberzahlen (`CountGroupRoleHolders`), additiv im
`RoleEntry`-Vertrag (Go/YAML/TS) als `group_holder_count` gefuehrt; ein `tab`-Query-Parameter, der
`resolveRoleLink()`, `GroupRolesSection.tsx`, `RolesClient.tsx` und die `/admin/role-capabilities`-
Weiterleitung durchgehend beherrschen, ohne den bestehenden rollenart-abhaengigen Default ohne
Parameter zu veraendern.

Aufgabenaufteilung (4 Tasks statt 2-3): Defekt 2 hat einen echten Backend-Anteil (neue Query +
Contract-Erweiterung ueber drei Dateien) UND einen Frontend-Anteil (Verbrauch des neuen Felds) --
beide zusammen in einem Task wuerden > 30% Kontext beanspruchen und zwei fachlich getrennte Schichten
vermischen. Defekt 1 und der Frontend-Anteil von Defekt 2 teilen sich dieselbe Datei (RoleRail.tsx)
und werden deshalb bewusst in einem Task zusammengelegt (Combine-Signal: gleiche Datei, kein
sinnvoller Zwischen-Commit). Defekt 3 ist vollstaendig unabhaengig (andere Dateien, andere Nutzer-
Journey) und bekommt einen eigenen Task. Ein vierter Task deckt die geforderte Voll-Verifikation
(Frontend- + Backend-Tests im Container, Ellipsen-Messung, co_leader-Zahlenabgleich) ab, da die
Aufgabenstellung explizit verlangt, beide Werte im finalen SUMMARY.md zu benennen.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md
@.planning/quick/260824-ek3-rollen-und-capabilities-zu-einem-rollen-/260824-ek3-PLAN.md
@.planning/quick/260824-ek3-rollen-und-capabilities-zu-einem-rollen-/260824-ek3-SUMMARY.md

frontend/src/app/admin/roles/RoleRail.tsx
frontend/src/app/admin/roles/RoleRail.test.tsx
frontend/src/app/admin/roles/roles.module.css
frontend/src/app/admin/roles/RolesClient.tsx
frontend/src/app/admin/roles/RoleDetailPanel.tsx
frontend/src/app/admin/role-capabilities/page.tsx
frontend/src/app/admin/role-capabilities/page.test.tsx
frontend/src/app/admin/users/tabs/GroupRolesSection.tsx
frontend/src/app/admin/users/resolveRoleLink.ts
frontend/src/types/admin-capability.ts
frontend/src/lib/api.ts
backend/internal/handlers/admin_capability_handler.go
backend/internal/handlers/admin_capability_handler_test.go
backend/internal/repository/authz_capability_mutations.go
backend/internal/repository/authz_role_holders_repository.go
backend/internal/repository/authz_role_holders_repository_test.go
backend/internal/testsupport/phase137_postgres.go
shared/contracts/admin-capabilities.yaml
</context>

<interfaces>
<!-- Exakter aktueller Code, den der Executor braucht -- keine weitere Codebase-Exploration noetig. -->

`CapabilityMatrixRoleEntry` (`backend/internal/repository/authz_capability_mutations.go`, Zeilen
34-59) -- `GlobalAssignmentCount *int` ist das exakte Vorbild fuer das neue `GroupHolderCount *int`
Feld (gleiches Nil-Pointer-fuer-"nicht anwendbar"-Muster, `json:"group_holder_count,omitempty"`):

```go
type CapabilityMatrixRoleEntry struct {
	RoleCode              string                        `json:"role_code"`
	LabelDE               string                        `json:"label_de"`
	Actions               []CapabilityMatrixActionState `json:"actions"`
	Assignable            bool                          `json:"assignable"`
	CapabilityEditable    bool                          `json:"capability_editable"`
	Contexts              []string                      `json:"contexts,omitempty"`
	SortOrder             int                           `json:"sort_order"`
	ColorKey              string                        `json:"color_key"`
	IconKey               string                        `json:"icon_key"`
	OperativeCapabilityCount int                         `json:"operative_capability_count"`
	HasOperativeCapabilities bool                        `json:"has_operative_capabilities"`
	GlobalAssignmentCount *int                           `json:"global_assignment_count,omitempty"`
	RoleKind              string                         `json:"role_kind,omitempty"`
}
```

`CountGlobalRoleAssignments` (`authz_capability_mutations.go`, Zeilen 242-272) -- exaktes
Kopiervorlage-Muster fuer `CountGroupRoleHolders`, nur andere Tabelle/Spalte:

```go
func (r *AuthzRepository) CountGlobalRoleAssignments(ctx context.Context) (map[string]int, error) {
	rows, err := r.db.Query(ctx, `
		SELECT role, COUNT(*) AS cnt
		FROM app_user_global_roles
		GROUP BY role
	`)
	// ... exakt gleiches Scan/Sammel-Muster wie im Original
}
```

Fuer `CountGroupRoleHolders` gilt dieselbe Struktur, aber gegen `fansub_group_member_roles`:

```sql
SELECT fgmr.role, COUNT(*) AS cnt
FROM fansub_group_member_roles fgmr
GROUP BY fgmr.role
```

`capabilityMutationRepo`-Interface (`backend/internal/handlers/admin_capability_handler.go`, Zeilen
22-31) -- `CountGroupRoleHolders` als siebte Methode ergaenzen, exakt neben
`CountGlobalRoleAssignments`:

```go
type capabilityMutationRepo interface {
	ListCapabilityMatrix(ctx context.Context) (*repository.CapabilityMatrix, error)
	GrantRoleCapability(ctx context.Context, roleCode, actionCode string) error
	RevokeRoleCapability(ctx context.Context, roleCode, actionCode string) error
	CountRolesWithAction(ctx context.Context, actionCode string) (int64, error)
	LoadRoleCapabilities(ctx context.Context) (map[string][]permissions.Action, error)
	CountGlobalRoleAssignments(ctx context.Context) (map[string]int, error)
	CountGroupRoleHolders(ctx context.Context) (map[string]int, error) // NEU
}
```

`ListCapabilityMatrix`-Handler (`admin_capability_handler.go`, Zeilen 83-126) -- die Stelle, an der
`counts` bereits fail-open geladen und in die synthetischen Zeilen geschrieben wird
(`matrix.Roles = append(syntheticRoles, matrix.Roles...)`, Zeile 123). Der neue Code haengt SICH
DANACH an: `matrix.Roles` iterieren, fuer jede Zeile mit `permissions.IsKnownFansubGroupRole(role.RoleCode)
== true` den Wert aus der neuen Bulk-Map (Default 0 bei fehlendem Key) in `role.GroupHolderCount`
schreiben -- NICHT fuer die drei frisch vorangestellten synthetischen globalen Zeilen (die haben
bereits `GlobalAssignmentCount` und sollen `GroupHolderCount` nie setzen) und NICHT fuer
`role_definitions`-Zeilen ausserhalb des fansub-group-Kontexts (z. B. `encoder`, contribution-only --
`fansub_group_member_roles` enthaelt fuer diese ohnehin nie eine Zeile, ein hartes `0×` waere dort
irrefuehrend, siehe `permissions.IsKnownFansubGroupRole`, bereits importiert im Handler-Package via
`"team4s.v3/backend/internal/permissions"`).

`permissions.IsKnownFansubGroupRole` (`backend/internal/permissions/permissions.go:451`) -- bereits
im Projekt fuer exakt diese Unterscheidung genutzt (`admin_role_holders_handler.go:54`,
`admin_role_assignment_impact_handler.go:101`):

```go
func IsKnownFansubGroupRole(role string) bool
```

`RoleEntry` TS-Typ (`frontend/src/types/admin-capability.ts`, Zeilen 20-52) -- `group_holder_count`
als Geschwisterfeld zu `global_assignment_count` ergaenzen, mit identischem Nullable-Kommentarstil:

```typescript
export interface RoleEntry {
  // ... bestehende Felder unveraendert ...
  global_assignment_count?: number | null;
  /**
   * Anzahl aktiver Zuweisungen aus fansub_group_member_roles -- nur fuer role_definitions-Zeilen
   * gesetzt, die permissions.IsKnownFansubGroupRole erfuellen (echte Gruppenrollen); fuer die drei
   * synthetischen globalen Zeilen und fuer contribution-only-Rollen null/fehlend. Gegenstuecke:
   * backend/internal/repository/authz_capability_mutations.go CapabilityMatrixRoleEntry.GroupHolderCount,
   * shared/contracts/admin-capabilities.yaml RoleEntry.group_holder_count.
   */
  group_holder_count?: number | null;
  role_kind?: 'global_app_role' | string;
}
```

`RoleRail.tsx`s aktuelle `rowCountText` (Zeilen 30-38) -- Datei bereits vollstaendig gelesen, exakter
Ist-Zustand vor der Aenderung:

```typescript
export function rowCountText(role: RoleEntry): string {
  if (role.global_assignment_count == null) return '–'
  return `${role.global_assignment_count}×`
}
```

`RoleRow` (`RoleRail.tsx`, Zeilen 46-63) -- die drei aktuellen Kind-Spans; `roleRowMeta`-Span (Zeile
58, `{roleKindLabel(role)}`) wird ENTFERNT, `roleRowName` und `roleRowCount` bleiben:

```typescript
function RoleRow({ role, isSelected, onSelectRole }: RoleRowProps) {
  return (
    <div role="listitem" key={role.role_code}>
      <Button type="button" variant="ghost" className={styles.roleRow}
        data-role-code={role.role_code} aria-current={isSelected ? 'true' : 'false'}
        onClick={() => onSelectRole(role.role_code)}>
        <span className={styles.roleRowName}>{role.label_de}</span>
        <span className={styles.roleRowMeta}>{roleKindLabel(role)}</span> {/* <- entfernen */}
        <span className={styles.roleRowCount}>{rowCountText(role)}</span>
      </Button>
    </div>
  )
}
```

`resolveRoleLink` (`frontend/src/app/admin/users/resolveRoleLink.ts`) -- Ist-Zustand vor der
Aenderung:

```typescript
export function resolveRoleLink(
  roleCode: string,
  matrix: RoleCapabilityMatrix | null,
): string | null {
  const entry = matrix?.roles.find((r) => r.role_code === roleCode)
  if (!entry) return null
  return `/admin/roles?role=${encodeURIComponent(roleCode)}`
}
```

`GroupRolesSection.tsx`s Aufrufstelle (aktuelle Zeile 38, unveraendert der einzige Aufrufer im
Rechte-Kontext): `const link = resolveRoleLink(role, matrix)` -- wird zu
`resolveRoleLink(role, matrix, 'caps')`.

`RolesClient.tsx`s Deep-Link-Effect (aktuelle Zeilen 98-113) -- Ist-Zustand, `handleSelectRole`
(Zeilen 83-93) setzt den rollenart-abhaengigen Default; NACH diesem Aufruf, VOR dem
`requestAnimationFrame`-Scroll, wird ein optionaler `tab`-Ueberschreib-Schritt ergaenzt:

```typescript
useEffect(() => {
  if (!matrix || appliedUrlRoleRef.current) return
  appliedUrlRoleRef.current = true
  const roleParam = searchParams.get('role')
  if (!roleParam) return
  const exists = matrix.roles.some((r) => r.role_code === roleParam)
  if (!exists) return
  handleSelectRole(roleParam)
  // NEU: expliziter tab-Parameter ueberschreibt den rollenart-abhaengigen Default EINMALIG,
  // nur bei der initialen Deep-Link-Anwendung, exakt wie der role-Parameter selbst.
  const tabParam = searchParams.get('tab')
  if (tabParam === 'holders' || tabParam === 'caps') {
    setActiveTabId(tabParam)
  }
  requestAnimationFrame(() => { /* unveraendert */ })
}, [matrix, searchParams])
```

`role-capabilities/page.tsx` Ist-Zustand (vollstaendig gelesen, 19 Zeilen) -- die
`searchParams`-Prop-Interface und der `encodeURIComponent`-Stil MUESSEN erhalten bleiben (drei
bestehende `page.test.tsx`-Tests pruefen exakte `redirect()`-Aufrufstrings inkl. `%20`-Kodierung
fuer Leerzeichen -- `URLSearchParams.toString()` wuerde stattdessen `+` erzeugen und diese Tests
brechen, deshalb WEITERHIN manuelles `encodeURIComponent` je Parameter verwenden, kein
`URLSearchParams`).
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Backend-Bulk-Query fuer Gruppenrollen-Inhaberzahl + Contract-Erweiterung (Defekt 2, Backend-Haelfte)</name>
  <files>backend/internal/repository/authz_capability_mutations.go, backend/internal/repository/authz_capability_mutations_test.go, backend/internal/handlers/admin_capability_handler.go, backend/internal/handlers/admin_capability_handler_test.go, shared/contracts/admin-capabilities.yaml, frontend/src/types/admin-capability.ts</files>
  <behavior>
    - Test 1 (Repository, echtes Postgres via `testsupport.OpenPhase137Postgres`): zwei
      `fansub_group_member_roles`-Zeilen mit Rolle `co_leader` (verschiedene Mitgliedschaften) und
      eine Zeile mit Rolle `fansub_lead` seeden -> `CountGroupRoleHolders` liefert
      `{"co_leader": 2, "fansub_lead": 1}`; eine Rolle ohne jede Zeile (`raw_provider`) fehlt im
      Ergebnis-Map (kein Zero-Value-Eintrag, analog zu `CountGlobalRoleAssignments`s dokumentiertem
      Verhalten).
    - Test 2 (Handler, `admin_capability_handler_test.go`, mirrort exakt
      `TestListCapabilityMatrixIncludesSyntheticGlobalRoleEntries`): `matrixRoles` enthaelt
      `co_leader` (eine echte fansub-group-Rolle) und `encoder` (contribution-only, NICHT
      `permissions.IsKnownFansubGroupRole`); Stub liefert `groupHolderCounts:
      map[string]int{"co_leader": 3}`. Response-Assertion: `co_leader.group_holder_count == 3`,
      `encoder.group_holder_count == nil` (fehlt/null), die drei synthetischen globalen Zeilen haben
      weiterhin `group_holder_count == nil`.
  </behavior>
  <action>
  In `backend/internal/repository/authz_capability_mutations.go`: `GroupHolderCount *int
  \`json:"group_holder_count,omitempty"\`` als neues Feld auf `CapabilityMatrixRoleEntry` ergaenzen
  (Kommentar im exakten Stil von `GlobalAssignmentCount`s Kommentar, mit Verweis auf die drei
  synchron zu haltenden Gegenstuecke: dieselbe Datei selbst, `admin-capabilities.yaml`,
  `admin-capability.ts`). Neue Methode `CountGroupRoleHolders(ctx context.Context) (map[string]int,
  error)` direkt unterhalb von `CountGlobalRoleAssignments` ergaenzen -- identisches
  Query/Scan/Sammel-Muster, nur `SELECT role, COUNT(*) AS cnt FROM app_user_global_roles GROUP BY
  role` ersetzt durch `SELECT fgmr.role, COUNT(*) AS cnt FROM fansub_group_member_roles fgmr GROUP
  BY fgmr.role`; Doc-Kommentar erklaert, dass dies die "wer besitzt diese Rolle, wie oft?"-Bulk-
  Antwort fuer die Rail ist (D-05-analog fuer Gruppenrollen), waehrend `ListRoleHolders` weiterhin
  die einzige Quelle fuer die vollen Pro-Rolle-Inhaberdetails (Name/Gruppe/Status/Overrides) bleibt
  -- diese neue Methode liefert bewusst NUR Zahlen, keine Zeilen.

  Neue Testdatei `backend/internal/repository/authz_capability_mutations_test.go` anlegen (existiert
  noch nicht) -- `testsupport.OpenPhase137Postgres(t)` + `NewAuthzRepository(pool)` verwenden
  (identisches Setup-Muster wie `authz_role_holders_repository_test.go`s
  `seedPhase138RoleHolderMembership`-Helfer; diesen Helfer wiederverwenden statt eine zweite Kopie zu
  schreiben -- er liegt im selben Package `repository`). Test gemaess `<behavior>` Test 1.

  In `backend/internal/handlers/admin_capability_handler.go`: `CountGroupRoleHolders(ctx
  context.Context) (map[string]int, error)` zur `capabilityMutationRepo`-Interface-Deklaration
  ergaenzen (siehe `<interfaces>`). In `ListCapabilityMatrix`, NACH der bestehenden
  `matrix.Roles = append(syntheticRoles, matrix.Roles...)`-Zeile: `h.mutationRepo.CountGroupRoleHolders(...)`
  aufrufen, fail-open bei Fehler (identisches Log-Then-Empty-Map-Muster wie bei
  `CountGlobalRoleAssignments`, aber eigene Log-Meldung). Danach `matrix.Roles` per Index-Schleife
  durchgehen (nicht `range` mit Wertkopie, da `[]CapabilityMatrixRoleEntry` Werttyp ist und Mutation
  sonst verloren geht) und fuer jede Zeile mit `permissions.IsKnownFansubGroupRole(matrix.Roles[i].RoleCode)`
  den Zaehlwert (Default 0 bei fehlendem Map-Key) in `matrix.Roles[i].GroupHolderCount` schreiben.

  Neuer Test in `admin_capability_handler_test.go` gemaess `<behavior>` Test 2 (eigene Testfunktion
  `TestListCapabilityMatrixIncludesGroupHolderCount`, Stil 1:1 wie
  `TestListCapabilityMatrixIncludesSyntheticGlobalRoleEntries`). `stubCapabilityAuthzRepo` um Feld
  `groupHolderCounts map[string]int` und Methode `CountGroupRoleHolders(_ context.Context)
  (map[string]int, error) { return s.groupHolderCounts, nil }` ergaenzen (identisches Muster wie das
  bestehende `globalRoleCounts`/`CountGlobalRoleAssignments`-Stub-Paar).

  In `shared/contracts/admin-capabilities.yaml`: im `RoleEntry`-Schema (Zeilen ~1287-1320) direkt
  nach `global_assignment_count` ein neues optionales Feld `group_holder_count` ergaenzen (`type:
  integer, nullable: true`, Beschreibung analog zu `global_assignment_count`s Beschreibung, aber fuer
  `fansub_group_member_roles` statt `app_user_global_roles`).

  In `frontend/src/types/admin-capability.ts`: `group_holder_count?: number | null;` gemaess
  `<interfaces>`-Block auf `RoleEntry` ergaenzen (reine Typ-Erweiterung, keine Verhaltensaenderung in
  dieser Datei -- die Konsumlogik folgt in Task 2).
  </action>
  <verify>
    <automated>docker compose exec -e TEAM4S_PHASE137_TEST_DSN=$TEAM4S_PHASE137_TEST_DSN team4sv30-backend go test ./internal/repository/... ./internal/handlers/... -run 'CountGroupRoleHolders|GroupHolderCount' -count=1 -v</automated>
  </verify>
  <done>CountGroupRoleHolders existiert und liefert eine korrekte GROUP-BY-Zaehlung ohne Zero-Value-Eintraege fuer Rollen ohne Zeilen; ListCapabilityMatrix setzt group_holder_count ausschliesslich fuer permissions.IsKnownFansubGroupRole-Rollen, nie fuer die drei synthetischen globalen Zeilen; der YAML-Contract und der TS-Typ fuehren das neue Feld synchron; beide neuen Tests sind gruen, alle bestehenden Tests in beiden Paketen bleiben gruen (go build ./... exits 0).</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: RoleRail -- Rollenname ohne Ellipse (Defekt 1) + echte Gruppenrollen-Inhaberzahl (Defekt 2, Frontend-Haelfte)</name>
  <files>frontend/src/app/admin/roles/RoleRail.tsx, frontend/src/app/admin/roles/RoleRail.test.tsx, frontend/src/app/admin/roles/roles.module.css</files>
  <behavior>
    - Test 1 (Defekt 1, Regression auf bestehenden Test 1/2/3/5 aus RoleRail.test.tsx): unveraendert
      gruen -- Gruppierung, Klickflaeche, aria-current, data-role-code bleiben exakt wie vor diesem
      Task.
    - Test 2 (Defekt 1, neu): fuer eine Rolle wird KEIN Text aus `roleKindLabel(role)` (z. B.
      "Aktive App-Rolle", "Globale App-Rolle") mehr INNERHALB der Rollenzeile selbst gerendert --
      `within(roleRowButton).queryByText(roleKindLabel(role))` liefert `null` fuer alle Zeilen (der
      Text existiert weiterhin als exportierte Funktion, wird aber nicht mehr pro Zeile angezeigt).
    - Test 3 (Defekt 2, ersetzt/erweitert den bestehenden "'–' ohne global_assignment_count"-Test):
      eine Gruppenrolle mit `group_holder_count: 2` (kein `global_assignment_count`) zeigt `2×` in
      der Zeile; eine Gruppenrolle OHNE `group_holder_count` UND ohne `global_assignment_count` zeigt
      weiterhin `–` (Fallback-Verhalten fuer contribution-only/historische Rollen bleibt erhalten);
      eine globale Rolle mit `global_assignment_count` zeigt weiterhin exakt wie bisher `N×` (Vorrang
      vor `group_holder_count`, das bei globalen Rollen ohnehin nie gesetzt ist).
  </behavior>
  <action>
  In `frontend/src/app/admin/roles/RoleRail.tsx`: `rowCountText` erweitern -- zuerst
  `global_assignment_count`, dann `group_holder_count`, sonst `–`:

  ```typescript
  export function rowCountText(role: RoleEntry): string {
    if (role.global_assignment_count != null) return `${role.global_assignment_count}×`
    if (role.group_holder_count != null) return `${role.group_holder_count}×`
    return '–'
  }
  ```

  In `RoleRow`: den `<span className={styles.roleRowMeta}>{roleKindLabel(role)}</span>` KOMPLETT
  entfernen (Defekt 1 -- die Gruppenueberschriften "Globale Rollen"/"Gruppenrollen" zeigen die
  Rollenart bereits, siehe Aufgabenstellung). `roleKindLabel` bleibt als exportierte Funktion
  UNVERAENDERT bestehen (weiterhin von `RoleDetailPanel.tsx` importiert und im Subjekt-Header
  verwendet -- NICHT loeschen, NICHT umbenennen). Die verbleibenden zwei Kind-Spans
  (`roleRowName`, `roleRowCount`) erhalten dadurch automatisch mehr Breite innerhalb des
  bestehenden `display: flex; justify-content: space-between`-Layouts von `.roleRow` -- keine
  weitere CSS-Breitenaenderung an `.roleRowName` noetig (bereits `flex: 1; min-width: 0`).

  In `frontend/src/app/admin/roles/roles.module.css`: die jetzt tote `.roleRowMeta`-Regel (Zeilen
  104-108) vollstaendig entfernen -- keine verwaiste CSS-Regel fuer eine nicht mehr gerenderte Klasse
  zuruecklassen (per `grep -rn roleRowMeta frontend/src` vor dem Loeschen verifizieren, dass keine
  andere Datei diese Klasse referenziert).

  `RoleRail.test.tsx` gemaess `<behavior>` erweitern: den bestehenden Test "zeigt '–' fuer
  global_assignment_count und '–' ohne global_assignment_count" um die neuen
  `group_holder_count`-Faelle ergaenzen (nicht loeschen, erweitern) und einen neuen Test fuer die
  Abwesenheit des `roleKindLabel`-Texts in der Zeile ergaenzen (`within` aus
  `@testing-library/react`, bereits importiert).
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/app/admin/roles/RoleRail.test.tsx --reporter=basic'</automated>
  </verify>
  <done>RoleRow rendert kein roleKindLabel-Badge mehr; rowCountText zeigt group_holder_count als Fallback vor '–'; roleRowMeta-CSS-Regel entfernt, kein toter Selektor; alle RoleRail.test.tsx-Faelle (bestehende + neue) sind gruen.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Deep-Link trifft den richtigen Tab (Defekt 3)</name>
  <files>frontend/src/app/admin/users/resolveRoleLink.ts, frontend/src/app/admin/users/resolveRoleLink.test.ts, frontend/src/app/admin/users/tabs/GroupRolesSection.tsx, frontend/src/app/admin/users/tabs/GroupRolesSection.test.tsx, frontend/src/app/admin/roles/RolesClient.tsx, frontend/src/app/admin/roles/RolesClient.test.tsx, frontend/src/app/admin/role-capabilities/page.tsx, frontend/src/app/admin/role-capabilities/page.test.tsx</files>
  <behavior>
    - Test 1 (`resolveRoleLink.test.ts`, NEU): `resolveRoleLink('co_leader', matrixMitCoLeader)`
      liefert weiterhin exakt `/admin/roles?role=co_leader` (kein Tab-Parameter ohne dritten
      Funktionsparameter -- Rueckwaertskompatibilitaet); `resolveRoleLink('co_leader',
      matrixMitCoLeader, 'caps')` liefert `/admin/roles?role=co_leader&tab=caps`;
      `resolveRoleLink('unbekannt', matrixMitCoLeader, 'caps')` liefert weiterhin `null` (Rolle nicht
      in Matrix aufloesbar, unveraendertes Verhalten).
    - Test 2 (`GroupRolesSection.test.tsx`, NEU): fuer eine Mitgliedschaft mit einer aufloesbaren
      Rolle traegt der "Was darf diese Rolle?"-Button ein `href`, das auf `&tab=caps` endet (nicht
      nur `?role=<code>` ohne Tab).
    - Test 3 (`RolesClient.test.tsx`, ergaenzt): mit `?role=co_leader&tab=caps` gemockt (co_leader
      OHNE `role_kind: 'global_app_role'`, dessen bisheriger Default 'holders' waere) ist nach dem
      initialen Render der Standardrechte-Tab aktiv, nicht Inhaber -- der explizite tab-Parameter
      gewinnt gegen den rollenart-abhaengigen Default. Ein zweiter Fall OHNE `tab`-Parameter (nur
      `?role=co_leader`) bestaetigt, dass der bisherige Default (Inhaber-Tab) unveraendert greift --
      Regressionsschutz fuer die bestehende GAP-05-Zusicherung.
    - Test 4 (`page.test.tsx`, ergaenzt): `RoleCapabilitiesRedirectPage({ searchParams:
      Promise.resolve({ role: 'co_leader', tab: 'caps' }) })` ruft `redirect` mit
      `/admin/roles?role=co_leader&tab=caps` auf; ein Aufruf nur mit `tab` ohne `role` haengt
      ausschliesslich `?tab=caps` an (`/admin/roles?tab=caps`); die drei bestehenden Tests (kein
      Parameter, nur role, role mit Leerzeichen) bleiben unveraendert gruen.
  </behavior>
  <action>
  `frontend/src/app/admin/users/resolveRoleLink.ts`: dritten optionalen Parameter `tab?: 'holders' |
  'caps'` ergaenzen. Bei gesetztem `tab` `&tab=${encodeURIComponent(tab)}` an den bestehenden
  `role=`-Query-String anhaengen (siehe `<interfaces>` fuer den exakten Ist-Zustand -- weiterhin
  manuelles `encodeURIComponent`, kein `URLSearchParams`, fuer konsistente Kodierung mit dem
  Geschwister-Endpunkt `role-capabilities/page.tsx`). Den Datei-Kommentar am Kopf um einen Satz zum
  neuen `tab`-Parameter ergaenzen (bestehenden Nachtrag-Kommentar nicht loeschen, nur erweitern).

  `frontend/src/app/admin/users/tabs/GroupRolesSection.tsx`: den einzigen `resolveRoleLink`-Aufruf
  (aktuelle Zeile 38) zu `resolveRoleLink(role, matrix, 'caps')` aendern -- diese Sektion beantwortet
  ausschliesslich "was darf diese Rolle" (D-22-Kontext, siehe Datei-Kopfkommentar), das Linkziel muss
  daher immer der Standardrechte-Tab sein, nie ein rollenart-abhaengiger Default.

  `frontend/src/app/admin/roles/RolesClient.tsx`: den Deep-Link-`useEffect` (aktuelle Zeilen 98-113)
  exakt gemaess `<interfaces>`-Block um die `tabParam`-Ueberschreib-Zeilen erweitern -- NACH
  `handleSelectRole(roleParam)`, VOR dem `requestAnimationFrame`-Scroll-Block. `handleSelectRole`
  selbst (Zeilen 83-93, der rollenart-abhaengige Default fuer manuelle Klicks) bleibt UNVERAENDERT --
  der `tab`-Parameter greift ausschliesslich in diesem einen Deep-Link-Effect, exakt einmalig
  (`appliedUrlRoleRef`-Gate bereits vorhanden, deckt auch den neuen Code mit ab).

  `frontend/src/app/admin/role-capabilities/page.tsx`: `RoleCapabilitiesRedirectPageProps.searchParams`
  um `tab?: string` erweitern. Query-String-Aufbau auf eine manuelle Teile-Liste umstellen (NICHT
  `URLSearchParams`, siehe `<interfaces>`-Begruendung zur `%20`-vs-`+`-Kodierung): `role` zuerst (falls
  vorhanden) `role=${encodeURIComponent(role)}`, dann `tab` (falls vorhanden)
  `tab=${encodeURIComponent(tab)}`, mit `&` verbunden; bei leerer Liste `/admin/roles` ohne
  Fragezeichen (identisch zum bisherigen Verhalten ohne jeden Parameter).

  Alle vier Testdateien gemaess `<behavior>` ergaenzen/anlegen (`resolveRoleLink.test.ts` und
  `GroupRolesSection.test.tsx` sind neue Dateien; fuer `GroupRolesSection.test.tsx` als Render-Stil-
  Vorlage eine bestehende `tabs/*.test.tsx`-Datei im selben Ordner lesen, z. B.
  `UserGlobalRolesTab.test.tsx`, NICHT veraendern, nur als Muster).
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/app/admin/users/resolveRoleLink.test.ts src/app/admin/users/tabs/GroupRolesSection.test.tsx src/app/admin/roles/RolesClient.test.tsx src/app/admin/role-capabilities/page.test.tsx --reporter=basic'</automated>
  </verify>
  <done>resolveRoleLink haengt bei gesetztem tab-Argument &tab=... an, bleibt ohne dieses Argument byte-identisch zum Ist-Zustand; GroupRolesSection verlinkt immer mit tab=caps; RolesClient uebernimmt einen gueltigen ?tab= einmalig beim Deep-Link, der Default ohne Parameter ist unveraendert; die Weiterleitung reicht tab durch, ohne die drei bestehenden Tests zu brechen; alle vier Testdateien sind gruen.</done>
</task>

<task type="auto">
  <name>Task 4: Vollverifikation -- Frontend- und Backend-Testsuite, Ellipsen-Messung, co_leader-Zahlenabgleich</name>
  <files></files>
  <action>
  Vollstaendige Frontend-Testsuite im Container ausfuehren:
  `docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/app/admin --reporter=basic'`.
  Ergebnis mit dem bekannten roten Set abgleichen (FansubAppMembersSection.test.tsx,
  fansubs/[id]/edit/page.test.tsx, useGroupMembersTab.test.ts, UserContributionsTab.test.tsx --
  ResponsiveImage.config.test.ts liegt ausserhalb von `src/app/admin`, taucht in diesem Lauf nicht
  auf, siehe 260824-ek3-SUMMARY.md-Praezedenzfall). Jede zusaetzliche rote Datei ist ein Regressions-
  Befund und muss vor Abschluss behoben werden -- KEINE der drei Tasks darf eine der fuenf bekannten
  Dateien geaendert haben (per `git log` gegen deren Quelldateien verifizieren, analog zum
  260824-ek3-SUMMARY.md-Praezedenzfall).

  Vollstaendige Backend-Testsuite fuer die in Task 1 geaenderten Pakete im Container ausfuehren. Falls
  `TEAM4S_PHASE137_TEST_DSN` nicht bereits als Shell-Variable gesetzt ist, eine Wegwerf-Testdatenbank
  im laufenden `team4sv30-db`-Container anlegen (Muster aus `138-01-SUMMARY.md`: `CREATE DATABASE
  team4s_phase137_test_<n> OWNER team4s;`, Name MUSS dem Muster `team4s_phase137_test_[a-z0-9]+`
  entsprechen, siehe `phase137_postgres.go`) und die DSN inline per `-e` an `docker compose exec`
  uebergeben -- keine `.env`/Compose-Aenderung, disposable Fixture-DB:
  `docker compose exec -e TEAM4S_PHASE137_TEST_DSN=<dsn> team4sv30-backend go test
  ./internal/repository/... ./internal/handlers/... -count=1 -v`. Alle Tests in beiden Paketen
  muessen gruen sein (keine neuen Fehlschlaege gegenueber dem Stand vor diesem Plan -- vorab
  bekannte, von diesem Plan nicht beruehrte rote Pakete siehe `.planning/STATE.md`
  Blockers/Concerns-Abschnitt zu `internal/handlers`).

  Ellipsen-Status ALLER Rollennamen nach der Aenderung ermitteln und im finalen SUMMARY.md explizit
  benennen (Pflichtangabe laut Aufgabenstellung: ja/nein, welcher Name falls ja). Bevorzugter Weg:
  ein echter Live-Browser-Zugriff auf `http://127.0.0.1:3300/admin/roles` (SSH-Tunnel, siehe
  `CLAUDE.md`) mit demselben `scrollWidth`/`clientWidth`-Mess-Snippet, das den urspruenglichen GAP-04-
  Befund erzeugt hat (`Array.from(document.querySelectorAll('[class*=roleRowName]')).map(el =>
  ({name: el.textContent, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth}))` bei 1440x900),
  ausgewertet fuer jede der 18 (oder aktuell in der DB vorhandenen) Rollen. Falls in dieser Umgebung
  kein Live-Browser-Werkzeug verfuegbar ist: ehrliche technische Herleitung wie im
  260824-ek3-SUMMARY.md-Praezedenzfall (verfuegbare Rail-Breite aus `roles.module.css` minus Padding/
  Gap/Count-Spalte gegen die laengsten `label_de`-Werte aus einer echten
  `SELECT label_de FROM role_definitions`-Abfrage bzw. `globalAppRoleLabels` rechnen) explizit als
  Engineering-Schaetzung kennzeichnen, KEINE Live-Messung vortaeuschen.

  Aktuelle `co_leader`-Inhaberzahl per direkter DB-Abfrage bestimmen (`SELECT COUNT(*) FROM
  fansub_group_member_roles WHERE role = 'co_leader';` gegen die laufende `team4s_v2`-Datenbank) und
  mit dem Wert abgleichen, den die Rail nach diesem Plan fuer `co_leader` anzeigen wuerde
  (`group_holder_count`-Feld aus `GET /api/v1/admin/role-capabilities`, real abgefragt falls ein
  authentifizierter Zugriff moeglich ist, sonst per DB-Abfrage hergeleitet, da beide Wege auf
  derselben Tabelle beruhen). Beide Werte (DB-Query-Ergebnis, angezeigter Rail-Wert) explizit im
  finalen SUMMARY.md nennen (Pflichtangabe laut Aufgabenstellung).

  SUMMARY.md gemaess `$HOME/.claude/get-shit-done/templates/summary.md` schreiben, inkl. der beiden
  oben genannten Pflichtangaben als eigener Abschnitt.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/app/admin --reporter=basic'</automated>
  </verify>
  <done>Frontend-Suite zeigt ausschliesslich das bekannte 4-Dateien-rote-Set (innerhalb von src/app/admin) ohne neue Fehlschlaege; Backend-Suite fuer internal/repository und internal/handlers ist vollstaendig gruen; SUMMARY.md benennt explizit den Ellipsen-Status jedes zuvor betroffenen Namens und die aktuelle co_leader-Inhaberzahl (DB-Wert und Rail-Anzeigewert).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| Admin-Browser -> Backend REST (`/api/v1/admin/role-capabilities`) | Platform-Admin-authentifizierter Request; Response enthaelt aggregierte Zaehlwerte, keine Personendaten |
| Benutzer-Rechte-Tab (GroupRolesSection) -> Rollen-Arbeitsbereich (Client-Navigation) | Client-seitig generierter Link inkl. `tab`-Query-Parameter, ausschliesslich innerhalb derselben authentifizierten Admin-Session |
| `/admin/role-capabilities`-Weiterleitung -> `/admin/roles` | Serverseitiger 307-Redirect, `role`/`tab`-Query-Parameter werden ungeprueft aus der eingehenden URL uebernommen und in die Ziel-URL eingebettet |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-ike-01 | Information Disclosure | `CountGroupRoleHolders`/`GroupHolderCount`-Feld | accept | Nur aggregierte Zaehlwerte pro Rollen-Code, keine Personendaten; Endpunkt bereits vollstaendig hinter `requirePlatformAdminIdentity` (unveraendert) -- identische Sensitivitaet wie das bestehende `global_assignment_count`-Feld. |
| T-ike-02 | Tampering | `tab`-Query-Parameter (`resolveRoleLink`, `RolesClient.tsx`, `role-capabilities/page.tsx`) | mitigate | `RolesClient.tsx` akzeptiert `tab` ausschliesslich gegen eine feste Allowlist (`'holders' \| 'caps'`), jeder andere Wert wird ignoriert (kein `dangerouslySetInnerHTML`, keine dynamische Ausfuehrung); die Weiterleitung schreibt den Wert nur `encodeURIComponent`-kodiert in einen Query-String, nie in HTML/Attribute direkt. |
| T-ike-03 | Tampering / Open Redirect | `/admin/role-capabilities`-Weiterleitung | accept | Zielpfad ist hartkodiert `/admin/roles` (kein aus der Anfrage abgeleiteter Host/Pfad); `role`/`tab` werden nur als Query-Werte angehaengt, koennen also kein externes Redirect-Ziel erzeugen -- unveraendert gegenueber dem bereits akzeptierten Ist-Zustand aus Quick-260824-ek3. |
| T-ike-04 | Denial of Service | `CountGroupRoleHolders`-Bulk-Query | accept | Eine zusaetzliche `GROUP BY`-Aggregation ueber `fansub_group_member_roles` bei jedem `ListCapabilityMatrix`-Aufruf (Tabellengroesse im niedrigen dreistelligen Bereich, indiziert ueber `role`, siehe bestehenden Index in `phase137_postgres.go`) -- vernachlaessigbare zusaetzliche Last, kein N+1. |
| T-ike-SC | Tampering (Supply Chain) | npm/pip/cargo-Installationen | accept | Dieser Plan installiert keine neuen Packages (ausschliesslich Aenderungen an bestehendem Go-/TypeScript-Code); kein Package-Legitimacy-Gate erforderlich. |

</threat_model>

<verification>
- `docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/app/admin --reporter=basic'` zeigt ausschliesslich das vorab bekannte rote Set, keine neuen Fehlschlaege.
- `docker compose exec -e TEAM4S_PHASE137_TEST_DSN=<dsn> team4sv30-backend go test ./internal/repository/... ./internal/handlers/... -count=1 -v` ist vollstaendig gruen.
- `docker compose exec -T team4sv30-backend go build ./...` exits 0.
- Kein Production-File in diesem Plan ueberschreitet 450 Zeilen (per `wc -l` gegen jede in `files_modified` gelistete Nicht-Test-Datei geprueft).
- `grep -rn roleRowMeta frontend/src` zeigt nach Task 2 keinen Treffer mehr (weder CSS-Klasse noch Nutzung).
- SUMMARY.md benennt explizit den Ellipsen-Status jedes der 6 urspruenglich betroffenen Rollennamen und die aktuelle `co_leader`-Inhaberzahl (DB-Wert und Rail-Anzeigewert).
</verification>

<success_criteria>
- Kein Rollenname in der `/admin/roles`-Rail wird mehr per Ellipse gekuerzt (oder, falls doch, ist dies im SUMMARY.md explizit benannt und begruendet).
- Die Rail zeigt fuer Gruppenrollen mit echten Inhabern (insbesondere `co_leader`) dieselbe Zahl wie das Detail-Panel -- kein Widerspruch mehr.
- Der "Was darf diese Rolle?"-Link aus der Benutzer-Rechte-Sektion oeffnet den Standardrechte-Tab, nicht den Inhaber-Tab.
- Kein bestehendes Verhalten (Impact-Vorschau, kanonischer Rollen-Editor, rollenart-abhaengiger Tab-Default ohne `?tab=`, `.railScroll`-Scroll-Strategie, 44px-Zeilenhoehe) wurde veraendert.
- Alle vier Tasks sind atomar committet; Frontend- und Backend-Testsuiten sind gruen (bis auf das vorab bekannte, unveraenderte rote Set).
</success_criteria>

<output>
Create `.planning/quick/260824-ike-drei-live-defekte-im-rollen-arbeitsberei/260824-ike-SUMMARY.md` when done
</output>
