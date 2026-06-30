# Phase 94: Rollen-/Capability-UX fachlich entwirren und mobil nutzbar machen – Research

**Recherchiert:** 2026-06-30
**Domäne:** Brownfield-Refactor – Rollenkontext-Trennung (Go/Gin + Postgres) + Capability-UX-Umbau (Next.js 16 / React 18, globales UI-System)
**Confidence:** HIGH (alle Befunde aus dem Code dieser Repo verifiziert; keine externen Libraries nötig)

## Summary

Die drei Rollenkontexte (A aktiv, B historisch, C anime_contribution) sind im Datenmodell bereits sauber getrennt; das Problem ist **nicht** das Schema, sondern (1) ein fehlender serverseitiger Assignable-Guard auf den Capability-Mutationen, (2) die `CROSS JOIN`-Vollmatrix, die historische Rollen unkommentiert capability-editierbar darstellt, (3) ein historischer Rollen-Dialog, der die *aktive* Rollenliste `FANSUB_GROUP_ROLE_OPTIONS` benutzt, und (4) zwei stark überlange Mitglieder-Komponenten plus eine Vollmatrix-UI, die bei 390 px nicht bedienbar ist.

Wichtigste Korrektur am beobachteten Ist-Zustand: Der historische Rollen-Dialog in `GroupMembersTab.tsx` (Zeile ~1090) verwendet **bereits das `Select`-Primitiv aus `@/components/ui`**, nicht – wie in 94-CONTEXT vermutet – ein natives `<select>`. D-08 ("native `<select>` ersetzen") ist damit faktisch erfüllt; der reale Defekt ist D-07 (falsche Rollenquelle). Das senkt den UI-Migrationsaufwand für diesen Dialog und verschiebt den Fokus klar auf die *fachliche* Rollenquelle.

**Primäre Empfehlung:** D-03-Quelle = `permissions.IsKnownFansubGroupRole()` (kein Schema-Change). Assignable-Guard für D-05 im **Handler** (`admin_capability_handler.go`), nicht im Repository – das Repository darf laut Code-Konvention nicht vom `permissions`-Paket abhängen. Capability-API um `assignable: boolean` + `contexts: string[]` pro `RoleEntry` erweitern (additive, nicht-brechende Contract-Änderung). Historische Rollenliste über einen neuen schlanken Read-Endpunkt `GET /admin/role-definitions?context=group_history` liefern (DB als Single Source of Truth, keine driftende Frontend-Konstante). Beide Mitglieder-Komponenten und die Capability-UI vor der Änderung in Unterkomponenten splitten.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Begründung |
|------------|-------------|----------------|------------|
| Definition "permission-bearing & assignable" | Backend (`permissions`-Paket) | — | `fansubGroupRoleCatalog` ist die existierende, getestete Wahrheitsquelle (D-03) |
| Assignable-Guard auf Grant/Revoke | Backend Handler | — | Repo darf nicht von `permissions` abhängen; Guard gehört vor die DB-Mutation (D-05) |
| Assignability-/Kontext-Metadaten ausliefern | Backend Repository + Handler | Contract | `ListCapabilityMatrix` reichert `RoleEntry` an (D-04) |
| group_history-Rollenliste | Backend (`role_definitions`) | API | DB ist Seed-Wahrheit; Frontend-Konstante würde driften (D-07) |
| Badge-/Disabled-Ableitung | Frontend | — | rein darstellend aus Backend-Metadaten (D-13) |
| Master-Detail-/Accordion-Layout, Switch | Frontend (`@/components/ui` + neue Primitives) | — | UI-Komposition; keine Server-Logik (D-11/D-12) |
| Mobile-Sheet-Verhalten | Frontend (`Drawer` responsiveSheet / `Modal`) | — | reines CSS/Layout (D-14) |

## Standard Stack

**Diese Phase fügt KEINE externen Pakete hinzu.** Sie arbeitet ausschließlich mit dem vorhandenen Stack (Go 1.25 / Gin / pgx, Next.js 16 / React 18.3 / Vitest 3). Daher entfällt der Package-Legitimacy-Audit (kein `npm install` / `go get`).

### Vorhandene Bausteine (verifiziert im Code)

| Baustein | Ort | Zweck in Phase 94 |
|----------|-----|-------------------|
| `permissions.IsKnownFansubGroupRole(role)` / `FansubGroupRoles()` | `backend/internal/permissions/permissions.go:299-305` | D-03/D-05 Assignable-Wahrheitsquelle [VERIFIED: codebase] |
| `permissions.fansubGroupRoleCatalog` (10 Codes) | `permissions.go:200-211` | Katalog der assignable Rollen [VERIFIED: codebase] |
| `HistGroupMemberRolesRepository.RoleCodeExistsForContext(ctx, code, "group_history")` | `backend/internal/repository/hist_group_member_roles_repository.go:231` | D-07 Server-Validierung historischer Rollen existiert bereits [VERIFIED: codebase] |
| `RoleCapabilityMatrix`/`RoleEntry`/`RoleActionState` | `frontend/src/types/admin-capability.ts` + `shared/contracts/admin-capabilities.yaml` | D-04/D-06 Erweiterungspunkt [VERIFIED: codebase] |
| `Drawer` mit `variant="responsiveSheet"` (Bottom-Sheet < 760 px) | `frontend/src/components/ui/Drawer.tsx` + `ui.module.css:995-1011,1210-1244` | D-12/D-14 Mobile-Container [VERIFIED: codebase] |
| `Badge` (6 Varianten) | `frontend/src/components/ui/Badge.tsx` | D-13 Kontext-Badges [VERIFIED: codebase] |
| `Select`, `Modal`, `Tabs`, `Card`, `FormField`, `Button` | `frontend/src/components/ui/index.ts` | D-08/D-11/D-14 [VERIFIED: codebase] |

### Fehlende Primitives (müssen gebaut werden)

| Bedarf | Status | Empfehlung |
|--------|--------|-----------|
| **Switch / Toggle** (D-12 "klarer Switch pro Capability") | **Existiert NICHT** in `@/components/ui` | Neues Primitiv `Switch.tsx` in `frontend/src/components/ui/` anlegen (ein `<button role="switch" aria-checked>`, ≥44 px Touch-Ziel) ODER bestehenden `Button` als Toggle nutzen. Bevorzugt neues Primitiv, da global wiederverwendbar und CLAUDE.md das globale UI-System fordert. [VERIFIED: codebase – kein Switch in index.ts] |
| **Accordion / List-Row-Collapse** (D-12 Kategorien als Accordions) | **Existiert NICHT** | Neues Primitiv `Accordion.tsx` ODER Komposition aus `Card` + `Button`-Header + State. `Tabs` ist für Kategorie-Gruppierung bei 390 px ungeeignet (horizontale Tab-Leiste → Scroll). [VERIFIED: codebase] |

## Phase Requirements

<phase_requirements>
| ID | Beschreibung | Research-Support |
|----|--------------|------------------|
| AC 1 | Historische Rollen aus `role_definitions`/`group_history` | `RoleCodeExistsForContext`-Seam + neuer Read-Endpunkt (siehe Pattern 4) |
| AC 3 | Historische Rollen in `hist_group_member_roles` | Handler validiert bereits gegen `group_history` (`fansub_hist_group_member_roles_handler.go:199`) |
| AC 4 | Aktive Rollen = `FansubGroupRoles()`, keine historischen | D-01 unverändert; `FansubAppMembersSection` nutzt `FANSUB_GROUP_ROLE_OPTIONS` korrekt |
| AC 5 | Aktiver Dialog ohne historische Rollen | Label-Umbenennung in `FansubAppMembersSection.tsx:501` ("Aufgaben") |
| AC 6 | Capability-UI rollenbasiert/kategorisiert + Metadaten | `ListCapabilityMatrix`-Erweiterung + neue Master-Detail-UI |
| AC 7 | Server-Guard gegen historische Rollen | Guard in `admin_capability_handler.go` Grant/Revoke (Pattern 2) |
| AC 8 | Mobile 390 px ohne H-Scroll | `Drawer` responsiveSheet + Accordion + Switch |
| AC 9 | Sprache klar historisch, Umlaute | D-09; CLAUDE.md Umlaut-Regel |
| AC 10 | Pflicht-Testabdeckung | siehe Validation Architecture |
| AC 11 | Contract+Typen+api.ts+Tests synchron | siehe Pattern 3 / Pitfall 1 |
</phase_requirements>

## Architecture Patterns

### System-Datenfluss (Capability-Guard + Metadaten)

```
[Admin Browser :3000]
   │  GET /api/v1/admin/role-capabilities
   ▼
[admin_capability_handler.ListCapabilityMatrix]  ── requirePlatformAdminIdentity
   │
   ▼
[AuthzRepository.ListCapabilityMatrix]  CROSS JOIN action_definitions × role_definitions
   │   (NEU: assignable + contexts pro RoleEntry anreichern)
   ▼
[CapabilityMatrix DTO]  ──► JSON ──► Frontend leitet Badges/Disabled ab (D-13)

[Admin Browser]
   │  PUT/DELETE /api/v1/admin/role-capabilities/{roleCode}/{actionCode}
   ▼
[Grant/RevokeCapability Handler]
   │  ── requirePlatformAdminIdentity (existiert)
   │  ── NEU: if !permissions.IsKnownFansubGroupRole(roleCode) → 422 role_not_assignable (D-05)
   │  ── Lockout-Guard (existiert, nur Revoke)
   ▼
[AuthzRepository.Grant/RevokeRoleCapability]  ──► role_capabilities ──► ReloadCache

[Hist. Rollen-Dialog]
   │  GET /api/v1/admin/role-definitions?context=group_history   (NEU)
   ▼
[neuer Read-Handler]  ──► role_definitions WHERE 'group_history' = ANY(contexts) ORDER BY sort_order
   ▼
Frontend Select-Optionen (D-07)
```

### Pattern 1: D-03/D-05 Assignable-Quelle = vorhandener Katalog (kein Schema-Change)

**Was:** "permission-bearing & assignable" := `permissions.IsKnownFansubGroupRole(roleCode)`.
**Warum diese Quelle (Vergleich der drei Optionen):**

| Option | Bewertung | Begründung |
|--------|-----------|-----------|
| (a) `fansubGroupRoleCatalog`-Mitgliedschaft | **EMPFOHLEN** | Genau die 10 Codes, die als aktive App-Rolle vergeben werden; bereits exportiert/getestet; deckt die geforderten Negativfälle ab (`founder`/`leader`/`co_leader`/`admin`/`other`/`project_manager` sind NICHT enthalten). Kein Migrations-/Drift-Risiko. [VERIFIED: codebase `permissions.go:200-211`] |
| (b) `role_definitions.contexts` | **VERWORFEN** | Kein sauberer Diskriminator: `fansub_lead` trägt laut Migration 0100 `['group_history']` und nach 0103 zusätzlich `group_history` für alle App-Rollen → Kontext allein unterscheidet nicht assignable von historisch. `project_lead`/`project_manager` tragen mehrere Kontexte. [VERIFIED: codebase Migrationen 0085/0100/0103] |
| (c) Ableitung aus `role_capabilities`-Existenz | **VERWORFEN** | Zirkulär: Eine assignable Rolle ohne aktuell gewährte Capability (z. B. `raw_provider` nach Revoke aller Actions) würde fälschlich als nicht-assignable gelten. |

**fansub_lead-Anomalie:** `fansub_lead` trägt in `role_definitions` nur `group_history` (Migration 0100), ist aber zweifelsfrei eine aktive App-Rolle (in `fansubGroupRoleCatalog` und `roleMatrix`). Das ist genau der Grund, Option (a) statt (b) zu wählen — der Katalog ist korrekt, die `contexts`-Spalte ist es für `fansub_lead` nicht.

### Pattern 2: D-05 Server-Guard im Handler (nicht im Repository)

**Was:** Vor der DB-Mutation in `GrantCapability` und `RevokeCapability` prüfen.
**Wo genau:** `backend/internal/handlers/admin_capability_handler.go`, direkt nach der `roleCode/actionCode`-Leerprüfung (Grant ~Z. 80, Revoke ~Z. 124), VOR dem Lockout-Guard.
**Warum Handler statt Repository:** `authz_capability_mutations.go:52` dokumentiert explizit: *"Das Repository darf nicht vom permissions-Paket abhängen."* Der Handler importiert `permissions` bereits (`admin_capability_handler.go:7`) und nutzt `permissions.IsStandaloneAction`. `IsKnownFansubGroupRole` ist exportiert und nutzbar.

```go
// Source: vorgeschlagenes Muster, analog zum vorhandenen Lockout-Guard (admin_capability_handler.go:138)
if !permissions.IsKnownFansubGroupRole(roleCode) {
    c.JSON(http.StatusUnprocessableEntity, gin.H{
        "error": gin.H{
            "code":    "role_not_assignable",
            "message": "Diese Rolle ist eine historische bzw. nicht-zuweisbare Rolle und kann keine Berechtigungen erhalten.",
        },
    })
    return
}
```

**Fehlercode/Status (D-05 Discretion):** `role_not_assignable`, **HTTP 422** (Unprocessable Entity). 422 passt zur vorhandenen Konvention für semantisch ungültige Eingaben (vgl. `fansub_hist_group_member_roles_handler.go:158,191,206`); 409 ist im Capability-Handler bereits durch `lockout_guard` belegt — `422` vermeidet Statuscode-Kollision. Der Frontend-`ApiError.code` trägt den Code automatisch durch (`parseApiErrorPayload`, `api.ts:854`).

### Pattern 3: D-04/D-06 Capability-API-Erweiterung (additiv, nicht-brechend)

**Was:** `RoleEntry` um `assignable: boolean` und `contexts: string[]` erweitern, damit das Frontend Badges (D-13) und Disabled-Zustand ableiten kann.

Backend (`authz_capability_mutations.go`): `ListCapabilityMatrix`-Query um `rd.contexts` ergänzen; `assignable` im Repo NICHT berechnen (Repo kennt `permissions` nicht) — stattdessen im Handler nach dem Repo-Aufruf anreichern, ODER `assignable` rein im Frontend aus `contexts`+bekanntem Katalog ableiten. **Sauberste Variante:** Handler reichert an, weil dort `permissions.IsKnownFansubGroupRole` verfügbar ist:

```go
// Im Handler nach ListCapabilityMatrix, vor c.JSON:
for i := range matrix.Roles {
    matrix.Roles[i].Assignable = permissions.IsKnownFansubGroupRole(matrix.Roles[i].RoleCode)
}
```

Dazu `CapabilityMatrixRoleEntry` (`authz_capability_mutations.go:30`) um `Assignable bool` + `Contexts []string` erweitern.

**Contract-Diff** (`shared/contracts/admin-capabilities.yaml`, Schema `RoleEntry` ~Z. 208): additive optionale Felder — kein Breaking Change:
```yaml
RoleEntry:
  required: [role_code, label_de, actions]   # assignable bewusst NICHT required → rückwärtskompatibel
  properties:
    assignable: { type: boolean, description: "Ob die Rolle Capabilities erhalten darf (App-Gruppenrolle)" }
    contexts:   { type: array, items: { type: string }, description: "role_definitions.contexts" }
```

**Frontend-Typ** (`frontend/src/types/admin-capability.ts:16`): `assignable?: boolean` + `contexts?: string[]` zu `RoleEntry`.
**api.ts:** `listRoleCapabilities` (Z. 9189) deserialisiert die Matrix bereits generisch — keine Änderung am Fetch nötig, nur Typkonformität.

### Pattern 4: D-07 group_history-Rollenliste (neuer Read-Endpunkt empfohlen)

**Was:** Statt `FANSUB_GROUP_ROLE_OPTIONS` im historischen Dialog eine echte `group_history`-Liste.
**Empfehlung:** Neuer Endpunkt `GET /api/v1/admin/role-definitions?context=group_history`.

| Variante | Bewertung |
|----------|-----------|
| Neuer Read-Endpunkt aus `role_definitions` | **EMPFOHLEN** — DB ist Seed-Wahrheit; keine Drift; spiegelt exakt die `RoleCodeExistsForContext`-Validierung, gegen die der Create-Handler bereits prüft (`:199`). Pflichtrollen (Gründer/in, Gruppenleitung, Co-Leitung, Projektmanagement) sind durch Seed 0085 garantiert vorhanden. |
| Frontend-Konstante `HIST_GROUP_ROLE_OPTIONS` | Nur Fallback — birgt Drift gegen DB-Seed; CONTEXT erlaubt es nur, wenn eindeutig als historisch geführt und seedkonform. |

Der Endpunkt braucht eine neue Repo-Methode (z. B. `ListByContext(ctx, "group_history")`) und einen Read-Handler; das Auth-Gate kann `CanForFansubGroup(... MembersView)` analog zu `ListHistGroupMemberRoles` nutzen, oder `requirePlatformAdminIdentity`. **Achtung Datenrealität:** Wegen Migration 0103 tragen *alle* App-Rollen zusätzlich `group_history`. Ein naives `WHERE 'group_history' = ANY(contexts)` liefert daher AUCH `translator`, `encoder` usw. Für den historischen Dialog ist die fachlich gewünschte Liste die **rein-historischen** Rollen (`founder`, `leader`, `co_leader`, `project_manager`) plus ggf. `project_lead`. Die Liste muss also bewusst kuratiert werden — entweder über eine zusätzliche Bedingung (`NOT IsKnownFansubGroupRole`) oder eine explizite Code-Whitelist. **Das ist ein offener Punkt für die Discuss-/Plan-Phase** (siehe Open Questions).

### Pattern 5: D-11/D-12 Master-Detail Capability-UI

**Desktop:** links Rollenliste (`Card`-Rows mit Kontext-Badge), rechts kategorisierte Capability-Details der gewählten Rolle. Kategorien aus `action_definitions.category`.
**Mobile (390 px):** Rolle wählen → Kategorien als Accordion → pro Capability eine Row mit `Switch` (≥44 px). Keine horizontale Matrix.

**Kategorienamen aktuell befüllt** (Migration 0108 `action_definitions.category`, [VERIFIED: codebase]): `gruppe`, `projekt`, `release`. Das sind nur **drei** Kategorien (lowercase, technisch) — NICHT die fünf fachlichen aus CONTEXT (Fansub-Verwaltung/Mitglieder/Medien/Anime/Administration). Für die UI-Gruppierung (D-11) müssen entweder (a) die Kategorien feiner geseedet/umbenannt werden (Migration) oder (b) ein Frontend-Mapping `category → Anzeigename` definiert werden. Da CONTEXT keine Migration des Rollenmodells will, ist (b) risikoärmer; ein dünnes Display-Mapping mit Umlaut-Labels ("Gruppe", "Projekt", "Release") genügt den AC.

### Anti-Patterns

- **Guard nur im Frontend (Disabled-Switch) verstecken** — D-05 verlangt explizit Server-Block. Disabled allein ist umgehbar.
- **`role_definitions.contexts` als Assignable-Diskriminator** — wegen 0103-Drift falsch (Pattern 1b).
- **`Tabs` für die Kategorie-Gruppierung bei 390 px** — horizontale Tab-Leiste erzwingt H-Scroll → verletzt D-12. Accordion verwenden.
- **Migration des Rollenmodells, um 5 Kategorien zu erzwingen** — außerhalb der Phasengrenze (deferred). Display-Mapping nutzen.

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Stattdessen | Warum |
|---------|--------------------|-------------|-------|
| group_history-Rollenvalidierung serverseitig | neue Validierungslogik | `RoleCodeExistsForContext` (existiert, `:231`) | bereits getestet & im Create-Handler genutzt |
| Assignable-Definition | neue `is_assignable`-Spalte/Migration | `permissions.IsKnownFansubGroupRole` | kein Schema-Change, deckt alle Negativfälle |
| Fehlercode-Durchreichung ins Frontend | manuelles Body-Parsing | `parseApiErrorPayload` / `ApiError.code` (`api.ts:843,367`) | `code` wird bereits durchgereicht (vgl. 409-Handling in `RoleCapabilityClient.tsx:151`) |
| Mobile-Bottom-Sheet | eigenes CSS-Sheet | `Drawer variant="responsiveSheet"` | < 760 px bereits als Bottom-Sheet implementiert (`ui.module.css:1210`) |
| Cache-Reload nach Mutation | manuelles Invalidieren | `permissionSvc.ReloadCache` (existiert in Handler) | atomarer Swap + D-10-Check vorhanden |

**Kerneinsicht:** Fast alle Bausteine existieren. Phase 94 ist überwiegend **Verdrahtung + UX-Komposition**, kein Neubau. Die einzigen echten Neubauten sind: 1 Server-Guard, 1 Read-Endpunkt, additive API-Felder, 2 fehlende UI-Primitives (Switch, Accordion), Komponenten-Splits.

## Runtime State Inventory

Refactor-/Rename-Anteil dieser Phase (Label-Umbenennung "Rollen"→"Aktive Rechte"; Rollenquelle wechseln). Geprüft:

| Kategorie | Befund | Aktion |
|-----------|--------|--------|
| Stored data | Keine Daten werden umbenannt. `role_capabilities`-Zeilen für historische Rollen (`founder` etc.) existieren laut Seed 0108 **nicht** (nur die 10 App-Rollen sind geseedet). Der Guard verhindert nur künftige Fehl-Grants. **Verifiziert:** Seed 0108 enthält keine historischen role_codes. | Keine Daten-Migration nötig. Optional: Verify-Query, dass keine `role_capabilities`-Zeile mit nicht-assignable role_code existiert (Defensive-Check, kein Pflicht-Cleanup). |
| Live service config | Keine externen Services betroffen. | Keine. |
| OS-registered state | Keine. | Keine. |
| Secrets/env vars | Keine. | Keine. |
| Build artifacts | Backend-Routen-Änderung (neuer Read-Endpunkt) erscheint erst nach `docker compose up -d --build team4sv30-backend` (Backend ist Docker :8092). Frontend-Tests gegen Dev-Server :3000. | Nach Backend-Routen-Änderung Rebuild; sonst API-404 trotz korrektem Code. [reference_backend_docker_rebuild] |

## Common Pitfalls

### Pitfall 1: Contract/Typen/api.ts/Tests driften auseinander (D-06/AC 11)
**Was schiefgeht:** Backend-DTO um `assignable` erweitert, aber `admin-capabilities.yaml` und `admin-capability.ts` nicht → stille Inkonsistenz.
**Vermeiden:** Vier Dateien in EINEM Task ändern: `authz_capability_mutations.go` (Struct), `admin-capabilities.yaml` (Schema), `admin-capability.ts` (Interface), `RoleCapabilityClient.test.tsx` (Fixture). Neue Felder additiv/optional halten (`required`-Liste NICHT erweitern) → keine Breaking Changes für Bestands-Consumer.

### Pitfall 2: group_history-Query liefert wegen Migration 0103 zu viele Rollen
**Was schiefgeht:** `WHERE 'group_history' = ANY(contexts)` liefert auch `translator`/`encoder` (durch 0103 mit `group_history` markiert) → historischer Dialog zeigt App-Rollen.
**Vermeiden:** Liste kuratieren — rein-historische Rollen explizit (Whitelist `founder,leader,co_leader,project_manager`) oder `... AND NOT (code = ANY($katalog))`. **Vor Implementierung mit User klären** (Open Question 1).

### Pitfall 3: 450-Zeilen-Limit beim Editieren überschritten
**Was schiefgeht:** Änderungen an `GroupMembersTab.tsx` (1209) / `FansubAppMembersSection.tsx` (1064) vergrößern die ohnehin überlangen Dateien weiter.
**Vermeiden:** Split ZUERST (eigener Task vor inhaltlicher Änderung). Limit ist Einzelfall-Ausnahme, nicht normalisieren [feedback_line_limit_exceptions_narrow].

### Pitfall 4: Guard nur in Grant, nicht in Revoke (oder umgekehrt)
**Was schiefgeht:** Revoke an historischer Rolle bleibt erlaubt → inkonsistent.
**Vermeiden:** Guard in BEIDEN Methoden. Da historische Rollen ohnehin keine `role_capabilities`-Zeilen haben, ist Revoke faktisch No-op — der Guard liefert dennoch den klaren `role_not_assignable`-Fehler statt eines stillen 200.

### Pitfall 5: Switch/Accordion als natives `<button>`/`<input type=checkbox>` gebaut
**Was schiefgeht:** Verstoß gegen CLAUDE.md globales UI-Gebot; ESLint `no-restricted-syntax` warnt.
**Vermeiden:** Neue Primitives unter `frontend/src/components/ui/` anlegen (dort sind native Elemente laut CLAUDE.md-Ausnahme erlaubt) und exportieren; Konsumenten nutzen nur das Primitiv.

## Code Examples

### group_history Read-Query (neue Repo-Methode)
```go
// Source: Muster analog RoleCodeExistsForContext (hist_group_member_roles_repository.go:231)
// Kuratierte Variante (Pitfall 2): nur rein-historische Rollen
const q = `
  SELECT code, label_de, sort_order
  FROM role_definitions
  WHERE 'group_history' = ANY(contexts)
    AND code = ANY($1)          -- explizite Whitelist der Hist-Rollen
  ORDER BY sort_order, code`
```

### Frontend Badge-Ableitung (D-13)
```tsx
// Source: Muster mit vorhandenem Badge-Primitiv (Badge.tsx)
const variant = role.assignable ? 'info' : 'muted'
const label = role.assignable ? 'Aktive App-Rolle' : 'Historische Rolle'
<Badge variant={variant}>{label}</Badge>
```

## State of the Art

| Alt | Neu | Wann | Auswirkung |
|-----|-----|------|-----------|
| `ListCapabilityMatrix` CROSS JOIN zeigt alle Rollen editierbar | Server-Guard + `assignable`-Metadaten | Phase 94 | historische Rollen sicht-/serverseitig nicht editierbar |
| Hist-Dialog nutzt `FANSUB_GROUP_ROLE_OPTIONS` | group_history-Liste aus DB | Phase 94 | fachlich korrekter Rollenkontext |
| Vollmatrix als einzige Bedienung | Master-Detail + mobile Accordion | Phase 94 | 390 px bedienbar |

## Assumptions Log

| # | Annahme | Sektion | Risiko falls falsch |
|---|---------|---------|---------------------|
| A1 | Gewünschte Hist-Dialog-Liste = rein-historische Rollen (founder/leader/co_leader/project_manager), nicht alle `group_history`-markierten | Pattern 4 / Pitfall 2 | Falsche Rollenliste im Dialog → User-Klärung nötig |
| A2 | HTTP 422 + `role_not_assignable` ist der bevorzugte Guard-Status (Discretion in D-05) | Pattern 2 | Reine Konvention; 409 wäre Alternative, kollidiert aber mit `lockout_guard` |
| A3 | Display-Mapping statt Migration für 5 fachliche Kategorien | Pattern 5 | Falls User echte DB-Kategorien will → kleine Migration nötig (aber deferred-nah) |
| A4 | Neuer Read-Endpunkt statt Frontend-Konstante für D-07 | Pattern 4 | Beides von CONTEXT erlaubt; Endpunkt = mehr Backend-Arbeit, weniger Drift |

## Open Questions

1. **Welche Rollen genau im historischen Dialog?** Wegen Migration 0103 tragen alle App-Rollen `group_history`. Fachlich gewollt sind vermutlich nur `founder`, `leader`, `co_leader`, `project_manager` (= CONTEXT-Pflichtliste Gründer/in, Gruppenleitung, Co-Leitung, Projektmanagement). **Empfehlung:** explizite Whitelist; vor Implementierung in Discuss-Phase bestätigen.
2. **Kategorie-Granularität:** Sollen die 3 technischen Kategorien (`gruppe/projekt/release`) für die UI auf die 5 fachlichen CONTEXT-Kategorien gemappt/erweitert werden? Empfehlung: Display-Mapping (keine Migration).
3. **Auth-Gate des neuen role-definitions-Endpunkts:** `requirePlatformAdminIdentity` (wie Capability-Endpunkte) oder `CanForFansubGroup` (wie Hist-Roles-Liste)? Da der Hist-Dialog im Fansub-Edit-Kontext lebt, ist `CanForFansubGroup(... MembersView)` konsistenter.

## Environment Availability

| Dependency | Benötigt von | Verfügbar | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| Docker Compose (Postgres 16, Backend :8092) | neue Route/Backend-Build | ✓ (Projektstandard) | — | — |
| Dev-Server :3000 | Live-UAT Frontend | ✓ | Next.js 16 | — |
| Vitest 3 | Frontend-Tests | ✓ | 3 | — |
| Go testify | Backend-Tests | ✓ | — | — |

Keine fehlenden Abhängigkeiten. Hinweis: Neue Go-Route erscheint erst nach `docker compose up -d --build team4sv30-backend`.

## Validation Architecture

### Test Framework
| Property | Wert |
|----------|------|
| Frontend-Framework | Vitest 3 (jsdom via `// @vitest-environment jsdom`) + @testing-library/react |
| Backend-Framework | Go `testing` + Struct-Stubs (kein Mock-Framework), vgl. `admin_capability_handler_test.go` |
| Frontend Quick-Run | `cd frontend && npx vitest run src/app/admin/role-capabilities` |
| Backend Quick-Run | `cd backend && go test ./internal/handlers/ -run Capability` |
| Full Suite (FE) | `cd frontend && npx vitest run` |
| Full Suite (BE) | `cd backend && go test ./...` |

### Phase Requirements → Test Map
| Req | Verhalten | Typ | Kommando | Datei existiert? |
|-----|-----------|-----|----------|------------------|
| AC 7 / D-05 | Grant an historischer Rolle → 422 `role_not_assignable` | unit (Go) | `go test ./internal/handlers/ -run AssignableGuard` | ❌ Wave 0 — Test neu, Setup-Muster aus `admin_capability_handler_test.go:84` |
| AC 7 / D-05 | Revoke an historischer Rolle → 422 | unit (Go) | dito | ❌ Wave 0 |
| AC 6 / D-04 | `assignable`-Feld in Matrix-Response korrekt (App=true, hist=false) | unit (Go) | `go test ./internal/repository/ -run CapabilityMatrix` o. Handler-Anreicherung | ❌ Wave 0 |
| AC 1/3 / D-07 | group_history-Liste enthält nur Hist-Rollen, nicht FANSUB_GROUP_ROLE_OPTIONS | unit (Go repo) + FE | `go test ./internal/repository/ -run RoleDefinitionsContext` | ❌ Wave 0 |
| AC 6/7 / D-13 | nicht-assignable Rolle disabled + 409/422-Inline-Fehler | unit (FE) | `npx vitest run src/app/admin/role-capabilities` | ⚠️ erweitern (`RoleCapabilityClient.test.tsx` existiert, 409-Pattern vorhanden) |
| AC 4/5 / D-10 | aktiver Dialog ohne historische Rollen, Label "Aktive Rechte" | unit (FE) | `npx vitest run src/app/admin/fansubs` | ❌ Wave 0 (ggf. neue Testdatei nach Split) |

### Sampling Rate
- **Pro Task-Commit:** zugehöriges Quick-Run-Kommando (FE bzw. BE).
- **Pro Wave-Merge:** `go test ./...` + `npx vitest run`.
- **Phase-Gate:** beide Full-Suites grün + `git diff --check` (AC 11) + Lint (`npx eslint` soweit verfügbar) vor `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] Go-Test für Assignable-Guard (Grant + Revoke, 422) — Setup-Muster aus `admin_capability_handler_test.go`
- [ ] Go-Test für `assignable`/`contexts`-Anreicherung in Matrix
- [ ] Go-Test für group_history-Read-Repo-Methode (kuratierte Liste)
- [ ] FE-Test-Erweiterung `RoleCapabilityClient.test.tsx`: Fixture um `assignable` ergänzen, Disabled-/422-Verhalten
- [ ] FE-Test für historischen Rollen-Dialog (group_history-Quelle) und aktiven Dialog-Label — ggf. nach Komponenten-Split neue Dateien

## Security Domain

| ASVS-Kategorie | Gilt | Standard-Control |
|----------------|------|------------------|
| V4 Access Control | ja | `requirePlatformAdminIdentity` (Capability-Endpunkte), `CanForFansubGroup(... MembersManage)` (Hist-Roles); **NEU:** Assignable-Guard als zusätzliche Autorisierungs-Invariante |
| V5 Input Validation | ja | `role_not_assignable`-Guard + `RoleCodeExistsForContext`; role_code als Pfadparameter validieren |
| V7 Error Handling | ja | kontrollierter Fehlercode statt stillem 200/500 (D-05) |

| Threat | STRIDE | Mitigation |
|--------|--------|-----------|
| Privilege Escalation: historischer Rolle Capability geben → App-Rechte | Elevation of Privilege | Server-Guard (D-05) blockiert vor DB-Mutation |
| Frontend-Bypass des Disabled-Switch | Tampering | Guard serverseitig, nicht nur visuell |

## Sources

### Primary (HIGH confidence) — alle aus dieser Codebase verifiziert
- `backend/internal/permissions/permissions.go` (fansubGroupRoleCatalog, FansubGroupRoles, IsKnownFansubGroupRole, roleMatrix)
- `backend/internal/repository/authz_capability_mutations.go` (ListCapabilityMatrix CROSS JOIN, Grant/Revoke, "Repo darf nicht von permissions abhängen")
- `backend/internal/handlers/admin_capability_handler.go` (Grant/Revoke, requirePlatformAdminIdentity, Lockout-Guard, ReloadCache)
- `backend/internal/handlers/fansub_hist_group_member_roles_handler.go` (group_history-Validierung)
- `backend/internal/repository/hist_group_member_roles_repository.go:231` (RoleCodeExistsForContext)
- `backend/cmd/server/admin_routes.go` (Routen role-capabilities + member-roles)
- `database/migrations/0085/0100/0103/0108` (role_definitions, contexts-Drift, action_definitions.category=gruppe/projekt/release, role_capabilities-Seed)
- `shared/contracts/admin-capabilities.yaml` (RoleEntry/RoleActionState/Matrix)
- `frontend/src/types/admin-capability.ts`, `frontend/src/types/fansub.ts`
- `frontend/src/lib/api.ts` (listRoleCapabilities Z.9189, parseApiErrorPayload Z.843, ApiError.code Z.367)
- `frontend/src/app/admin/role-capabilities/*` (Client/Table/Modals/Test)
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx` (Hist-Dialog Z.1089-1103 nutzt Select+FANSUB_GROUP_ROLE_OPTIONS), `FansubAppMembersSection.tsx`
- `frontend/src/components/ui/*` (index.ts, Drawer responsiveSheet, Badge, Modal, Select, Tabs, Card; KEIN Switch/Accordion)

## Metadata

**Confidence-Aufschlüsselung:**
- Standard Stack / Seams: HIGH — alle direkt im Code verifiziert
- Architektur (Guard-Platzierung, API-Erweiterung): HIGH — gestützt durch Code-Konvention + vorhandene Muster
- group_history-Rollenliste: MEDIUM — Mechanik klar, exakte Rollen-Auswahl (Whitelist) ist offene User-Entscheidung (A1/Q1)
- Kategorie-Gruppierung: MEDIUM — technische Kategorien (3) ≠ fachliche (5); Mapping-Entscheidung offen (A3/Q2)

**Research-Datum:** 2026-06-30
**Gültig bis:** Code-gebunden — bei Änderung der genannten Dateien neu prüfen (Richtwert 14 Tage)
