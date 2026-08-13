# Phase 76: `/me/contributions` Dashboard + registrierte-User-Vorschläge - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-05
**Phase:** 76-me-contributions-dashboard-registrierte-user-vorschl-ge
**Areas discussed:** Dashboard-Layout & Triage, Vorschlagsflows (Umfang & Einstieg), Klärungsaktionen & Korrektur, Filter & Summary-Aggregat

---

## Dashboard-Layout & Triage

### Frage 1 — Grundaufbau der Seite

| Option | Description | Selected |
|--------|-------------|----------|
| Aktions-Dashboard, Inbox oben | Kompaktes aktionsorientiertes Dashboard: Klärungs-Inbox oben, darunter Summary, darunter Listen. Kein Sticky-Nav. | ✓ |
| Scroll + Sticky-Nav (wie 73/74) | Einspaltige Scroll-Seite mit Sticky-Anker-Nav, konsistent zu Public-Seiten. | |
| Tabs | Tab-Leiste (Übersicht / Mitwirkungen / Vorschläge / Klärung). | |

**User's choice:** Aktions-Dashboard, Inbox oben
**Notes:** `/me/contributions` als Arbeits-Surface verstanden, nicht als Präsentations-Profil.

### Frage 2 — Inhalt der Klärungs-Inbox

| Option | Description | Selected |
|--------|-------------|----------|
| Zugeordnet-aber-unbestätigt | Leader-zugeordnete Mitwirkungen ohne confirm/reject. | ✓ |
| Bestrittene (disputed) | Konflikt-/Reviewstatus, laufende Klärung. | ✓ |
| Eigene abgelehnte Vorschläge | Vom Leader abgelehnt, mit Ablehngrund. | ✓ |
| Sichtbarkeits-Entscheidungen offen | Frisch bestätigte ohne Sichtbarkeitswahl. | ✓ |

**User's choice:** Alle vier
**Notes:** Umfassende Inbox — alles, was eine Member-Aktion braucht.

---

## Vorschlagsflows (Umfang & Einstieg)

### Frage 1 — Einstiegsort der Meldeflows

| Option | Description | Selected |
|--------|-------------|----------|
| Hybrid: kontextuell + zentral | Melden kontextuell auf Public-Seiten + zentrale Verwaltung auf /me/contributions. | |
| Nur zentral auf /me/contributions | Ein Melde-Einstieg auf dem Dashboard mit Zielauswahl. | ✓ |
| Nur kontextuell auf Public-Seiten | Melden nur auf Public-Seiten; /me/contributions nur Status. | |

**User's choice:** Nur zentral auf /me/contributions
**Notes:** Bewusste Eingrenzung — keine kontextuellen Melde-Buttons auf Public-Seiten in 76.

### Frage 2 — Welche Meldetypen shippen in 76

| Option | Description | Selected |
|--------|-------------|----------|
| Fehler/Korrektur melden | Allgemeiner Korrektur-Vorschlag mit Zielkontext + Freitext (neu). | ✓ |
| Story vorschlagen | Story-/Beschreibungstext-Vorschlag, review-gebunden (neu). | ✓ |
| Medien vorschlagen | Medium-Vorschlag mit Reviewstatus/Sichtbarkeit (neu, Upload). | ✓ |
| Bestehende integrieren (Contribution + Claim) | ProposalForm + Claim-Einstieg nur in zentralen Einstieg integrieren. | ✓ |

**User's choice:** Alle vier → voller Decision-6-Typensatz
**Notes:** Große Phase; Planner wird voraussichtlich pro Typ/Slice splitten.

### Frage 3 — Konkrete Einstiegs-UX

| Option | Description | Selected |
|--------|-------------|----------|
| Ein 'Vorschlagen/Melden'-Einstieg | Ein Button → Modal/Drawer: Typ → Zielkontext → Feld. | ✓ |
| Eigene Buttons/Karten pro Typ | Sichtbarer Einstieg pro Typ auf dem Dashboard. | |

**User's choice:** Ein unified 'Vorschlagen/Melden'-Einstieg
**Notes:** Aufgeräumtes Dashboard, eine konsistente Oberfläche.

---

## Klärungsaktionen & Korrektur

### Frage 1 — 'Details korrigieren'

| Option | Description | Selected |
|--------|-------------|----------|
| Vorbefüllter Korrektur-Vorschlag | Nutzt die neue Fehler/Korrektur-melden-Mechanik, Ziel = diese Contribution. | ✓ |
| Leichter Freitext am Dispute | Nur Begründung am Konflikt-Eintrag, kein eigener Typ. | |
| Getrennt: Konflikt + separater Vorschlag | Zwei getrennte Aktionen. | |

**User's choice:** Vorbefüllter Korrektur-Vorschlag
**Notes:** EINE Korrektur-Mechanik, konsistent zu Lock H/K.

### Frage 2 — Begründung bei 'Das war ich nicht'

| Option | Description | Selected |
|--------|-------------|----------|
| Optionale Begründung | Kurzer Hinweis mit optionalem Freitext. | |
| Pflicht-Begründung | Begründung erforderlich vor Konfliktsetzung. | ✓ |
| Keine Begründung | Reiner Status-Schritt. | |

**User's choice:** Pflicht-Begründung
**Notes:** Leader muss den Widerspruch immer einordnen können. (reject-Endpoint braucht neuen Member-`reason`.)

---

## Filter & Summary-Aggregat

### Frage 1 — Zusammenspiel Summary & Filter

| Option | Description | Selected |
|--------|-------------|----------|
| Klickbare Stat-Chips = Filter | Summary-Zähler als Chips, Klick filtert die Liste (client-seitig). | ✓ |
| Summary-Anzeige + separate Filterleiste | Stat-Kacheln + eigene Filterleiste. | |
| Du entscheidest | Planner wählt die Form. | |

**User's choice:** Klickbare Stat-Chips = Filter
**Notes:** Eine Mechanik; client-seitig (useMemo), analog Phase 74 D-06.

---

## Claude's Discretion

- Backend-Mechanik der Vorschläge (generische Pipeline vs. pro-Typ) — Lock H/K.
- Datenunterscheidung 'zugeordnet-aber-unbestätigt' vs. 'eigener Vorschlag in Prüfung'.
- Zielkontext-Auswahl-UI pro Typ + Bindung 'Medien vorschlagen' an Decision-8-Matrix.
- Audit-Tabelle/-Mechanik, Komponenten-Split, CSS, Chip-/Filter-UI-Form.

## Deferred Ideas

- Kontextuelle Melde-Buttons auf Public-Seiten → nicht in 76 (D-04).
- Server-seitige Filterung/Pagination → erst bei Volumenbedarf.
- Leader-Review-Abwicklung der neuen Vorschlagstypen → Phase 77/78.

### Todo-Abgleich
- Gefaltet: `2026-06-03-contribution-dropdown-auf-globale-ui-primitives-umstellen.md`
  (Contribution-UI auf Primitives — ohnehin im Pfad/CLAUDE.md-Pflicht). Die
  Diskussions-Auswahl war widersprüchlich ('Keine falten' + zwei Folds); konservativ
  nur dieser Punkt gefaltet.
- Reviewed, nicht gefaltet: `2026-06-03-credits-ui-konsolidierung-und-permission-bruecke.md`
  (Phase 77), `2026-05-28-contributor-owned-media-note-edit-delete.md` (/me/profile),
  `2026-05-28-profile-hub-content-activity-redesign.md` (niedrige Relevanz).
