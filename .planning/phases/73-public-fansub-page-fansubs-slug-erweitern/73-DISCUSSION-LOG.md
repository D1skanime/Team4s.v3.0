# Phase 73: Public Fansub Page `/fansubs/[slug]` erweitern - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-04
**Phase:** 73-public-fansub-page-fansubs-slug-erweitern
**Areas discussed:** Layout-Paradigma, Spaltenlayout/Mobile, Mitglieder vs. Mitwirkende, Medien nach Ownership, Leader-Preview & Empty States

---

## Layout-Paradigma

| Option | Description | Selected |
|--------|-------------|----------|
| Kuratierte Scroll-Seite | Vertikale Erzählung in Decision-2-Reihenfolge; Tab-Inhalte zu Abschnitten umbauen | ✓ |
| Tabs beibehalten & anreichern | Bestehende Tab-Struktur belassen, nur erweitern | |
| Hybrid: Hero+Story scrollen, Rest Tabs | Kompromiss aus Erzählung und Reuse | |

**User's choice:** Kuratierte Scroll-Seite
**Notes:** Folgefragen → In-Page-Nav = Sticky Sektions-Nav; Highlights = automatisch abgeleitet (kein Pflege-/Schreib-Feld).

---

## Spaltenlayout / Mobile

| Option | Description | Selected |
|--------|-------------|----------|
| Einspaltige Erzählung | Alles untereinander, zentrierte Lesespalte; Abschnitte intern als Raster erlaubt | ✓ |
| Zweispaltig auf Desktop | Zwei Spalten desktop, kollabiert mobil | |
| Du entscheidest | Planner wählt anhand bestehender Layouts | |

**User's choice:** Einspaltige Erzählung + scrollbare Chip-Leiste (Mobile-Nav)
**Notes:** Ausgelöst durch Nutzer-Rückfrage zum Mockup („ist das eine Split-Seite? wie auf Mobil?"). Klargestellt: das im Mockup gezeigte Zwei-Spalten-Layout war Generator-Artefakt. Außerdem korrigiert: Gruppengeschichte/Story kommt ZUERST (vor Highlights), gemäß Decision 2.

---

## Mitglieder vs. Mitwirkende

| Option | Description | Selected |
|--------|-------------|----------|
| Zwei getrennte Abschnitte | „Team & Mitglieder" oben, separater „Externe Mitwirkende"-Block | ✓ |
| Ein Abschnitt, zwei Spalten/Gruppen | Beide unter einer Überschrift | |
| Du entscheidest | Planner wählt | |
| Historische Nennungen: Eigener Unterbereich + Badge | Gedämpfter Unterbereich, Badge „unbestätigt", geclaimt→Link | ✓ |
| Historische Nennungen: Gleiche Liste, nur Badge | Alle in einer Liste | |

**User's choice:** Option 1 (zwei getrennte Abschnitte) + historische Nennungen gedämpft mit Badge
**Notes:** Nutzer bat um Veranschaulichung → ASCII-Wireframe + (vom Nutzer) generiertes HTML/Bild-Mockup bestätigt. Wichtige Klarstellung im Gespräch: Historische Mitglieder existieren als Datensatz (`hist_*`) BEVOR ein Claim erfolgt; Claim ist separater Schritt. Geclaimt → Link auf `/members/[slug]`, ungeclaimt → nur Name. Gedenken als würdevoller Sonderblock.

---

## Medien nach Ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Getrennte Abschnitte mit festen Labels | Gruppenmedien / Release-Einblicke / Team & Erinnerungen | ✓ |
| Unter-Tabs | Tab-Umschaltung | |
| Galerie mit Filter-Chips | Eine Galerie, Filter | |

**User's choice:** Drei getrennte, beschriftete Bereiche (durch Mockup bestätigt)
**Notes:** Auf Mobil untereinander statt nebeneinander. Respektiert Phase-72-Projektionsfelder (Owner/Kategorie/Sichtbarkeit/Review).

---

## Leader-Preview & Empty States

| Option | Description | Selected |
|--------|-------------|----------|
| Leader-Preview: Erst Phase 77 | Public Preview/Readiness im Leader Workspace (Decision 7) | ✓ |
| Leader-Preview: Leichter Einstieg in 73 | Dezenter Vorschau-Link für eingeloggte Leader | |
| Empty States: Leere Abschnitte ausblenden | Abschnitt inkl. Anker weglassen | |
| Empty States: Platzhalter anzeigen | Abschnitt sichtbar mit Hinweis | ✓ |
| Empty States: Gemischt | Kern-Abschnitte Platzhalter, optionale ausblenden | |

**User's choice:** Leader-Preview → erst Phase 77; Empty States → Platzhalter anzeigen
**Notes:** Hält Sektions-Nav-Anker stabil; saubere Scope-Grenze gegenüber Phase 77.

## Claude's Discretion

- Komponenten-Aufteilung (Refactor `FansubProfileTabs` vs. neue Section-Komponenten),
  CSS-Module, Sticky-Nav-/Chip-Implementierung, konkrete Highlights-Kennzahlen,
  Schwellwerte/Sortierung.
- Direkter Konsum neuer Phase-72-Projektionsfelder vs. Erweiterung bestehender
  API-Helper (unter Lock K).

## Deferred Ideas

- Schreib-Flows im Kontext (historischer) Mitglieder: Beiträge erfassen → Phase 78;
  Member-Medien bereitstellen/Ownership durchsetzen → Phase 79.
- Public Preview + Readiness-Check für Leader → Phase 77.
- Memorial-Setter/Claim-Sperre/Memorial-Verhalten → Phase 74.
- Korrektur-melden / Vorschlags-Flows registrierter User → Phasen 74/76.
- Reviewed-but-not-folded Todos (gehören zu Admin-UI / Phase 74) — siehe CONTEXT.md.
</content>
