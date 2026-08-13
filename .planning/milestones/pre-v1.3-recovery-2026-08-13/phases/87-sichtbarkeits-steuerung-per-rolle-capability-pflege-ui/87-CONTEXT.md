# Phase 87: Sichtbarkeits-Steuerung per Rolle + Capability-Pflege-UI - Context

**Gathered:** 2026-06-18
**Status:** Queued — erst nach Ausführung von Phase 86 planen (`/gsd:plan-phase 87`)
**Source:** Folge-Diskussion zur Capability-Registry (Phase-86-Planung)

<domain>

## Phase Boundary

Macht „über die Rollenverwaltung steuern, **wer was sehen darf**" Realität. Zwei Bausteine auf der Phase-86-Registry:
1. **Enforcement:** gezielte View-Capability-Checks an ausgewählten, heute ungated Lese-Pfaden.
2. **Pflege-UI:** Admin-Oberfläche zum Vergeben/Entziehen von Capabilities pro Rolle (`role_capabilities`) ohne Deploy.

**Voraussetzung:** Phase 86 ist ausgeführt (action_definitions + role_capabilities + permissions.go-Cache existieren). **Nicht im Scope:** neue fachliche Rollen; scoped/feldgranulare Sichtbarkeit über die heutige Action-Granularität hinaus (eigene spätere Phase).

</domain>

<decisions>

## Implementation Decisions (vorläufig — in discuss/plan-phase 87 schärfen)

### Enforcement
- **D-01:** In der Phase wird eine **konkrete Liste** heute ungated Lese-Pfade festgelegt, die künftig vor Auslieferung das zutreffende View-Recht prüfen (über `permissions.Service` `CanFor*` mit `*.view`-Action). Welche Flächen genau — Produktentscheidung beim Discuss-Schritt.
- **D-02:** Die Checks nutzen die Phase-86-Registry (daten-getrieben); keine neuen hartkodierten Rollen-Listen. Neue benötigte Actions werden als Daten (`action_definitions` + `role_capabilities`) angelegt, nicht im Code.
- **D-03:** `platform_admin` bleibt globaler Bypass (sieht alles).

### Pflege-UI
- **D-04:** Eine Admin-UI (nur Plattform-Admin, Gate wie Phase 80) listet alle Rollen mit ihren Capabilities aus `role_capabilities` und erlaubt Vergeben/Entziehen einzelner Capabilities pro Rolle.
- **D-05:** Ausschließlich `@/components/ui`-Primitives; deutscher UI-Text mit korrekten Umlauten; modulare Komponenten (<=450 Zeilen).
- **D-06:** Jede Capability-Änderung ist auditierbar (Audit-Seam wie Phase 80) und wirkt nach Cache-Reload ohne Deploy (Phase-86-Invalidierung nutzen).
- **D-07:** Last-Admin/Lockout-Schutz: kritische Admin-/Sichtbarkeits-Fähigkeit kann nicht global so entzogen werden, dass sich der Betrieb aussperrt (Guard analog Phase 80 Revoke/Disable).

### Contract
- **D-08:** Neue Endpunkte streng über `shared/contracts/*` (OpenAPI) → Backend-Handler → `frontend/src/lib/api.ts` → Frontend-Types; serverseitiges Plattform-Admin-Gate auf jedem neuen Endpunkt.

### Research-Flags
- **R-01:** Inventar aller relevanten Lese-Pfade + Klassifikation gated/ungated; welche sollen gated werden?
- **R-02:** Genaue Cache-Invalidierungs-/Reload-Naht aus Phase 86 (wie wirkt eine `role_capabilities`-Änderung zur Laufzeit?).
- **R-03:** Bestehende Admin-UI-Muster aus Phase 80 (Drawer/Tabs/Tabelle, Audit-Seam, Last-Admin-Guard) als Reuse.

</decisions>

<canonical_refs>

## Canonical References

- `.planning/notes/capability-registry-design.md` — Abschnitt „optionaler Folge-Schritt" (Pflege-UI).
- `.planning/phases/86-daten-getriebene-capability-registry/` — Registry-Fundament (CONTEXT/RESEARCH/PLANs).
- `backend/internal/permissions/permissions.go` — `CanFor*`-Checks + View-Actions.
- Phase-80-Admin-UI: `frontend/src/app/admin/users/` (Drawer/Tabs/Tabelle), Audit-Seam, Last-Admin-Guard (`authz.go` `CountActivePlatformAdmins`).
- `CLAUDE.md`, `AGENTS.md` — UI-Primitive-Pflicht, Contract-Disziplin, Umlaute, 450-Zeilen.

</canonical_refs>

<deferred>

## Deferred Ideas

- Feld-/spaltengranulare Sichtbarkeit über die heutige Action-Granularität hinaus.
- Scoped Capabilities pro konkreter Ressource (nicht nur pro Gruppe/Release-Version).

</deferred>

---

*Phase: 87-sichtbarkeits-steuerung-per-rolle-capability-pflege-ui*
*Context gathered: 2026-06-18 — queued hinter Phase 86*
