# Phase 95: Rollenmodell entwirren - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-30
**Phase:** 95-rollenmodell-entwirren-gruppen-vs-projekt-ebene-techadmin-gf
**Areas discussed:** Übergabe-Lifecycle, Code-Migration, Eigene-Historie-Sichtbarkeit, Neue-Rollen-Rechte + Data-driven

---

## Übergabe-Lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-Vorschlag (Dialog) | Vorausgefüllter Dialog beim Entzug, Admin bestätigt/justiert | |
| Voll automatisch | Beim Entzug automatisch ohne Nachfrage ein „ended"-Eintrag | ✓ |
| Rein manuell | Kein Hook; Admin legt Historie selbst an | |

**User's choice:** Voll automatisch.
**Follow-up — Geltungsbereich:** „Alle Gruppenrollen" vs. „nur Leitungs-/Positions-Rollen" vs. „Du entscheidest" → **Du entscheidest** → Claude-Empfehlung: alle Gruppenrollen (lückenlose Historie, Schema trägt es).

---

## Code-Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Aktive Codes behalten | fansub_lead/project_lead bleiben; leader/project_manager migrieren darauf; Relabel | ✓ |
| Historische Codes behalten | leader/project_manager bleiben, aktive migrieren darauf | |
| Du entscheidest | — | |

**User's choice:** Aktive Codes behalten (fansub_lead, project_lead kanonisch).

---

## Eigene-Historie-Sichtbarkeit

| Option | Description | Selected |
|--------|-------------|----------|
| Member sieht eigene; öffentlich opt-in | Member sieht Historie immer; public via visibility, Default privat | |
| Voll öffentlich als Default | Historie standardmäßig sichtbar | |
| Nur Admin/Leitung | Historie bleibt interne Doku; Member sieht sie nicht | ✓ |

**User's choice:** Nur Admin/Leitung — kein Member-/Public-Surface in dieser Phase.

---

## Neue-Rollen-Rechte + Data-driven

| Option | Description | Selected |
|--------|-------------|----------|
| Sinnvolle Defaults seeden | Techadmin/GFXler mit Default-Capabilities | |
| Leer starten, per UI vergeben | Beide ohne Rechte; Admin vergibt via Matrix | ✓ |
| Du entscheidest | — | |

**User's choice (Default-Rechte):** Leer starten, per UI vergeben.

| Option | Description | Selected |
|--------|-------------|----------|
| Voll data-driven (jetzt) | fansubGroupRoleCatalog aus DB + Frontend-Optionen per API | ✓ |
| Einmalig manuell | Über die 4 Code-Stellen; data-driven später | |
| Du entscheidest | — | |

**User's choice (Data-driven):** Voll data-driven jetzt.

---

## Claude's Discretion

- Geltungsbereich der Auto-Archivierung (D-10) → alle Gruppenrollen.
- Migrationsmechanik der alten Codes, started_year-Ableitung, konkrete Datei-Splits, assignable-Markierung in role_definitions.

## Deferred Ideas

- Backlog 999.1 — Querverlinkung role-capabilities ↔ users.
- Member-/Public-Anzeige historischer Rollen (bewusst ausgeschlossen, D-11).
- Generische UI-Todos (Profile-Hub, Contribution-Primitives, Credits-UI) — nicht eingefaltet.
