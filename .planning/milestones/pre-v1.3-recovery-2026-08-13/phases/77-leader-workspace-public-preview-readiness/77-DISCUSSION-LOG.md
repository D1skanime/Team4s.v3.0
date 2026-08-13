# Phase 77: Leader Workspace – Public Preview & Readiness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-05
**Phase:** 77-leader-workspace-public-preview-readiness
**Areas discussed:** Preview-Darstellung, Readiness-Platzierung, Readiness-Härte, Pflege-Umfang & Gating

---

## Preview-Darstellung

| Option | Description | Selected |
|--------|-------------|----------|
| Inline Phase-73-Sektionen | Section-Komponenten read-only direkt im Workspace gerendert | ✓ |
| Live-iframe der echten Seite | `<iframe>` der echten /fansubs/[slug] | |
| Button/Link nach /fansubs/[slug] | Nur „Vorschau öffnen" in neuem Browser-Tab | |

**User's choice:** Inline Phase-73-Sektionen

| Option | Description | Selected |
|--------|-------------|----------|
| Exakte Besucher-Sicht | Nur öffentlich + freigegeben (Phase-72-Achsen) | ✓ |
| Besucher-Sicht + interne Marker | Wie Besucher-Sicht, plus dezente intern/in-Prüfung-Marker | |
| Du entscheidest | Planner wählt anhand Phase-72-Projektionsfeldern | |

**User's choice:** Exakte Besucher-Sicht
**Notes:** „Was fehlt" gehört in den Readiness-Check, nicht in die Preview (→ D-01, D-02).

---

## Readiness-Platzierung

| Option | Description | Selected |
|--------|-------------|----------|
| Eigener Tab | Neuer Tab bündelt Preview + Checkliste | ✓ |
| Panel auf Grunddaten | Checkliste als Panel oben auf Grunddaten | |
| Immer sichtbares Widget | Klebendes Sidebar-Widget in jedem Tab | |

**User's choice:** Eigener Tab

| Option | Description | Selected |
|--------|-------------|----------|
| Klickbare Sprungmarken | Jeder Punkt verlinkt auf zuständigen Tab/Abschnitt | ✓ |
| Reine Statusanzeige | Nur Ampel/Häkchen-Liste ohne Sprungmarken | |
| Du entscheidest | Sprungmarken nur bei eindeutigem Tab-Ziel | |

**User's choice:** Klickbare Sprungmarken
**Notes:** Nutzt bestehende Tab-Navigation (`?tab=`) (→ D-03, D-04).

---

## Readiness-Härte

| Option | Description | Selected |
|--------|-------------|----------|
| Reiner Leitfaden | Beratend, blockiert nichts; Seite ist ohnehin live | ✓ |
| Weiches Gate mit Hinweis | Warnbanner „nicht reif", aber kein Block | |
| Hartes Gate | Sichtbarkeits-/Publish-Aktion gesperrt (setzt Publish-Toggle voraus) | |

**User's choice:** Reiner Leitfaden

| Option | Description | Selected |
|--------|-------------|----------|
| Nur informative Zähler | Offene Claims/Contributions read-only, zählen nicht gegen „bereit" | ✓ |
| Zählen als „nicht bereit" | Offene Posten setzen Readiness auf unvollständig | |
| Du entscheidest | Solange keine Review-Aktion in Phase 77 entsteht | |

**User's choice:** Nur informative Zähler
**Notes:** Review/Auflösung bleibt Phase 78; kein Publish-Toggle, kein Scope-Zuwachs (→ D-05, D-06).

---

## Pflege-Umfang & Gating

| Option | Description | Selected |
|--------|-------------|----------|
| Nur Reuse/Bündeln | Bestehende Pflege erreichbar machen + gegen Owner-Tabellen verifizieren, keine neuen Felder | ✓ |
| Reuse + Lücken schließen | Überwiegend Reuse, konkrete fehlende Kontextfelder ergänzen | |
| Du entscheidest | Researcher prüft editierbare Owner-Felder, minimale Ergänzungen | |

**User's choice:** Nur Reuse/Bündeln

| Option | Description | Selected |
|--------|-------------|----------|
| Aus bestehenden ableiten | Gating aus vorhandenen FansubGroupCapabilities (kein Contract-Change) | ✓ |
| Neues Capability-Feld | Dediziertes Feld über OpenAPI+Backend+api.ts (Lock K) | |
| Du entscheidest | Planner unter Lock K, bevorzugt Ableitung | |

**User's choice:** Aus bestehenden ableiten
**Notes:** Erfüllt Lock K ohne Contract-Change; Gruppenmitgliedschaft allein genügt nicht (→ D-07, D-08).

---

## Claude's Discretion

- Exakte Tab-Benennung/-Position in `MAIN_TABS`, konkrete Readiness-Kriterienliste/Schwellwerte, Empty-State-Texte, CSS-Modul-Struktur.
- Genaue Capability-Ableitung (Composite vs. einzelne Capability) unter Lock K.
- Direkter Import der Phase-73-Sektionen vs. schlanker Preview-Wrapper, solange read-only Besucher-Sicht gewahrt bleibt.
- Researcher darf eine echte, bereits in einer Owner-Tabelle vorhandene-aber-nicht-editierbare Lücke minimal schließen (ohne Phase-78-Review).

## Deferred Ideas

- Hartes Readiness-Gate / Publish-Toggle (D-05 verworfen) → eigene spätere Phase.
- Besucher-Sicht + interne Marker in der Preview (D-02 verworfen).
- 5 thematisch fremde Todos (Contribution-/Credits-/Member-Profil-UI) reviewed, nicht gefaltet — siehe CONTEXT.md `<deferred>`.
