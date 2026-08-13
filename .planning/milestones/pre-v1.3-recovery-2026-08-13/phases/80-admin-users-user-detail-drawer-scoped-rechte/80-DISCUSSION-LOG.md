# Phase 80: `/admin/users` + User Detail Drawer (scoped Rechte) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-06
**Phase:** 80-admin-users-user-detail-drawer-scoped-rechte
**Areas discussed:** Editierbarkeits-Scope, Listen-UX, Drawer-Aufbau & Reuse, Konflikte-Definition

---

## Editierbarkeits-Scope (v1)

### Globale Rollen
| Option | Description | Selected |
|--------|-------------|----------|
| Editierbar (vergeben/entziehen) | Plattform-Admin vergibt/entzieht globale Rollen im Drawer, auditiert | ✓ |
| Nur Anzeige (read-only) | Nur Anzeige, Vergabe später | |
| You decide | Claude entscheidet | |

### Accountstatus
| Option | Description | Selected |
|--------|-------------|----------|
| Editierbar (sperren/aktivieren) | Sperren/Reaktivieren mit Audit | ✓ |
| Nur Anzeige (read-only) | Status nur anzeigen | |
| You decide | Claude prüft Statusfeld | |

### Scoped Gruppen-/Release-Rechte
| Option | Description | Selected |
|--------|-------------|----------|
| Nur Anzeige (Edit bleibt im Leader-Workspace) | read-only; Vergabe in /admin/fansubs/[id]/edit | ✓ |
| Editierbar (scoped Grant/Revoke) | direktes Editieren im globalen Drawer | |
| You decide | Claude gemäß Lock I | |

### Streaming-Grants / Spezialrechte
| Option | Description | Selected |
|--------|-------------|----------|
| Ehrlicher Stub (Platzhalter-Tab) | sichtbarer Platzhalter ohne Schreibaktion | ✓ |
| Weglassen | komplett aussparen | |
| You decide | Claude entscheidet | |

**Notes:** Accountstatus-Editierbarkeit (D-02) unter Vorbehalt — Research-Flag R-01: app_users-Statusfeld vs. Keycloak-Hoheit.

---

## Listen-UX `/admin/users`

### Spaltendarstellung
| Option | Description | Selected |
|--------|-------------|----------|
| Schlanke Kernspalten + Rest im Drawer | nur Kernspalten + Badges | |
| Breite Tabelle mit allen Aggregaten | alle Aggregate als Spalten | ✓ |
| You decide | Claude wählt | |

### Such-/Filter-/Sortier-Verhalten
| Option | Description | Selected |
|--------|-------------|----------|
| Suche + Kernfilter (Status, Rolle, Konflikt) | Textsuche + Facetten + Sortierung letzte Aktivität | ✓ |
| Nur Textsuche (v1 minimal) | nur Name/E-Mail | |
| You decide | Claude wählt | |

### Paginierung
| Option | Description | Selected |
|--------|-------------|----------|
| Server-seitige Pagination | Backend liefert Seiten | ✓ |
| Infinite Scroll | clientseitiges Nachladen | |
| You decide | Claude wählt | |

**Notes:** Breite Aggregat-Tabelle + Pagination → Research-Flag R-02 (effiziente Aggregat-Query pro Seite, kein N+1).

---

## Drawer-Aufbau & Reuse

### Grundgerüst
| Option | Description | Selected |
|--------|-------------|----------|
| @/components/ui Drawer + Tabs wiederverwenden | GDS-Primitives | ✓ |
| Dedizierte neue Drawer-Komponente | eigenes Muster | |
| You decide | Claude wählt | |

### Tab-Laden
| Option | Description | Selected |
|--------|-------------|----------|
| Lazy-Load pro Tab | Daten beim Aktivieren | ✓ |
| Alles beim Öffnen laden | ein großer Endpunkt | |
| You decide | Claude wählt | |

### Tab-Tiefe
| Option | Description | Selected |
|--------|-------------|----------|
| Zusammenfassung + Deep-Link | Übersicht + Link in Workspace | |
| Volle Listen/Verwaltung in jedem Tab | vollständige Listen | ✓ |
| You decide | Claude wählt | |

**Notes:** Abgleich mit Lock I → in CONTEXT als D-10 aufgelöst: volle Anzeige-Listen, aber Schreibaktionen nur gemäß Editierbarkeits-Scope; scoped Domains read-only + Deep-Link.

---

## Konflikte-Definition

### Konflikt-Typen (Mehrfachauswahl)
| Option | Description | Selected |
|--------|-------------|----------|
| Offener Claim trotz verknüpftem Profil | member_claims-Inkonsistenz | ✓ |
| Gruppenmitglied ohne Rolle | Mitgliedschaft ohne Rechtebasis | ✓ |
| Medien/Owner ohne gültigen Scope | owner_consistent=false | ✓ |
| Offener Contribution-Dispute | dispute_state='open' | ✓ |

### Signalisierung
| Option | Description | Selected |
|--------|-------------|----------|
| Badge/Icon in Liste + Konflikt-Filter + Detail im Tab | Warn-Badge + Filter + Aufschlüsselung | ✓ |
| Nur im Drawer (keine Listenspalte) | schlanker | |
| You decide | Claude wählt | |

**Notes:** Alle 4 Konflikt-Typen gewählt; Signalisierung konsistent mit Badge-Pattern aus Phase 78/79.

---

## Claude's Discretion

- Exakter Endpunktschnitt pro Tab + OpenAPI-Form (innerhalb Lock K).
- Konkrete Spaltenreihenfolge/Verdichtung der breiten Tabelle.

## Deferred Ideas

- Scoped Gruppen-/Release-Rechte im globalen Drawer editierbar machen — späterer Ausbau (v1 hält Lock I).
- Voll funktionale Streaming-Grants — v1 nur Stub.
- 3 reviewte UI-Todos (profile-hub, contribution-dropdown, credits-ui) — nicht eingefaltet (nicht Phase-80-Scope).
