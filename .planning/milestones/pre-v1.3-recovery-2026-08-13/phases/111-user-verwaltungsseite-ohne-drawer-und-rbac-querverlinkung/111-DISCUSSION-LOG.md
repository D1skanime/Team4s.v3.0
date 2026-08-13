# Phase 111: User-Verwaltungsseite ohne Drawer und RBAC-Querverlinkung - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-28
**Phase:** 111-user-verwaltungsseite-ohne-drawer-und-rbac-querverlinkung
**Areas discussed:** Detail-Struktur ohne Drawer, Progressive Offenlegung, RBAC-Link: User → Rolle, Impact-Count + gefilterte User-Ansicht

---

## Detail-Struktur ohne Drawer

| Option | Description | Selected |
|--------|-------------|----------|
| Eigene Route `/admin/users/[id]` | Klick navigiert auf deep-linkbare Detailseite, Zurück-Link zur Liste | ✓ |
| Master-Detail-Split (URL-gesteuert) | Liste bleibt sichtbar, Detail daneben, Auswahl über URL | |
| Inline-Panel für alle Breiten | Heutiges Desktop-Inline-Verhalten auf alle Breiten, Drawer streichen | |

**User's choice:** Eigene Route `/admin/users/[id]` (empfohlen)
**Notes:** Beste Passung zu „direkt navigierbar" und zur gefilterten User-Ansicht; klare URL pro User; Drawer + responsives Dual-Mode entfallen. → D-01

---

## Progressive Offenlegung

| Option | Description | Selected |
|--------|-------------|----------|
| Sektionen mit Lazy-Load | Gestapelte Cards/Sektionen, wichtige offen, schwere als Accordion lazy | ✓ |
| `@/components/ui` `Tabs`-Primitive | Bereiche als echte Tabs über globales Primitive | |
| Hybrid: Kern-Sektionen + Rest in Tabs | Übersicht/Rollen als Sektionen, seltene Bereiche gebündelt in Tabs | |

**User's choice:** Sektionen mit Lazy-Load (empfohlen)
**Notes:** Löst die handgebaute Tab-Leiste ab (UI-System-Pflicht); Card/Accordion aus `@/components/ui`. → D-02

| Option (Priorität) | Description | Selected |
|--------|-------------|----------|
| Übersicht + Globale Rollen | Nur diese beiden sofort offen, Rest lazy | |
| Übersicht + Rollen + Mitgliedschaften + Gruppenrechte | Gesamter Identitäts-/Rechte-Block sofort, Aktivitätsdaten lazy | ✓ |
| Nur Übersicht | Maximal reduziert, auch Rollen eingeklappt | |

**User's choice:** Übersicht + Rollen + Mitgliedschaften + Gruppenrechte
**Notes:** Identitäts-/Rechte-Block auf einen Blick; Claims/Beiträge/Medien/Audit lazy. → D-03

---

## RBAC-Link: User → Rolle

| Option | Description | Selected |
|--------|-------------|----------|
| Alle Rollen mit Capability-Eintrag | Jede in der Matrix auflösbare Rolle (global & gruppen-/projektbezogen) verlinkt | ✓ |
| Nur globale App-Rollen | Nur globale Rollen verlinken, Gruppen-/Projektrollen bleiben Text | |
| Du entscheidest | Claude wählt Abgrenzung beim Planen | |

**User's choice:** Alle Rollen mit Capability-Eintrag (empfohlen)
**Notes:** Konsistente Nachschlagbarkeit; nicht auflösbare/historische Rollen bleiben Text. → D-04

---

## Impact-Count + gefilterte User-Ansicht

| Option (Count-Umfang) | Description | Selected |
|--------|-------------|----------|
| Nur globale Rollenzuweisungen | Count = User mit globaler App-Rolle; passt zum vorhandenen `global_role`-Filter | ✓ |
| Global + Gruppen-/Projektzuweisungen | Alle Kontexte; bräuchte neuen Filter + Backend-Aggregat | |
| Du entscheidest | Claude legt Umfang beim Planen fest | |

**User's choice:** Nur globale Rollenzuweisungen (empfohlen) → D-05

| Option (URL-Filter) | Description | Selected |
|--------|-------------|----------|
| Alle Listenfilter in die URL | Suche, Status, Rolle URL-getrieben; deep-linkbar, Zurück-Link stellt Liste wieder her | ✓ |
| Nur der Rollen-Filter in die URL | Nur `?role=` URL-getrieben, Suche/Status lokal | |
| Du entscheidest | Claude wählt Umfang beim Planen | |

**User's choice:** Alle Listenfilter in die URL (empfohlen) → D-06

---

## Claude's Discretion

- Backend-Lieferung des Impact-Counts (Feld in `listRoleCapabilities` vs. eigenes Aggregat-Endpoint).
- Konkretes Link-Ziel-Format zur Rolle auf `/admin/role-capabilities` (Deep-Link/Anchor/`?role=`).
- Sektions-Reihenfolge, Beschriftungen und visuelle Ausgestaltung im globalen UI-System.
- Umgang mit dem Streaming-Stub-Tab.

## Deferred Ideas

- Impact-Count & Filterung für gruppen-/projektbezogene Rollenzuweisungen.
- Massen-/Bulk-Rollenaktionen auf der gefilterten User-Liste.
- Interne UI-Politur einzelner Tab-Inhalte über D-02 hinaus (separate Todos: contribution-dropdown, credits-ui-konsolidierung, member-profil-ui — alle nicht in Scope).
