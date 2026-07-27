# Phase 113: Wiederholbare Leistungs-Badges (Bronze/Silber/Gold) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-27
**Phase:** 113-wiederholbare-leistungs-badges-bronze-silber-gold
**Areas discussed:** „Vollständig dokumentiert" definieren, „Akzeptierte Beiträge" (Chronist) eingrenzen, Bildarchivar-Zählbasis, Anzeige/Gruppierung/Katalog-Codes

---

## Familie 1 — „Vollständig dokumentiert" / mitgetragene Projekte

### Ableitung
| Option | Description | Selected |
|--------|-------------|----------|
| Abgeleitete Bedingung | Automatisch aus vorhandenen Elementen, kein Flag | ✓ |
| Explizites Flag/Status | Manuelles Markieren (neuer Pflegepfad) | |
| Einfacher Schwellenwert | ≥ X dokumentierte Elemente | |

### Vollständigkeits-Elemente (ursprünglich)
| Option | Description | Selected |
|--------|-------------|----------|
| Story + Release + Medien | Kerntrio | ✓ (später verworfen) |
| Zusätzlich OP/ED-Segmente | Strenger | |
| Nur Release + Medien | Ohne Story | |

### Zurechnung zum Member
| Option | Description | Selected |
|--------|-------------|----------|
| Als Mitwirkender beteiligt | Irgendeine Rolle, Projekt vollständig | |
| Eigene Doku-Leistung | Story/Medien selbst beigetragen | |
| Gruppen-Zugehörigkeit | Alle Projekte der Gruppe | |
| **Freitext (Nutzer)** | „wenn er in mindestens einer seiner Rolle zu jedem Release des Projekt was beigetragen hat sei es Upload oder Test" | ✓ |

### Kombination
| Option | Description | Selected |
|--------|-------------|----------|
| A: Beteiligung UND Doku vorhanden | Coverage + Story/Release/Medien | |
| B: Nur durchgängige Beteiligung | Coverage allein genügt | ✓ |

**User's choice:** Projekt zählt, wenn Member zu JEDEM Release in ≥ 1 Rolle beigetragen hat (netto `release_role_work`). Story-/Medien-Pflicht fällt weg.
**Notes:** Story/Medien = Projekt- statt Memberleistung; Coverage trägt „komplett mitgetragen" allein.

---

## Familie 2 — „Chronist" (10/50/150)

### Was zählt als Beitrag
| Option | Description | Selected |
|--------|-------------|----------|
| Projekt-Text-Anerkennungen | `project_text_first_author`-Credits (netto) | |
| Breiter: alle Notiz-/Text-Beiträge | Auch Release-Version-Notizen etc. | ✓ |
| 10/50/150 anpassen | Erst Schwellen überdenken | |

### Bedeutung „akzeptiert"
| Option | Description | Selected |
|--------|-------------|----------|
| Veröffentlicht/aktiv genügt | Kein formaler Review, netto | ✓ |
| Review-/Freigabe-gebunden | Nur mit Accept-Status | |
| Nur bestimmte Notiz-Flächen | Auswahl der Flächen | |

**User's choice:** Alle eigenen, veröffentlicht/aktiven Notiz-/Text-Beiträge (netto), kein Review-Gate.
**Notes:** Flächen + Autor→Member-Zuordnung offen für Research (kein einheitlicher Punkt-Credit vorhanden).

---

## Familie 3 — „Bildarchivar" (10/50/150)

### Zähleinheit
| Option | Description | Selected |
|--------|-------------|----------|
| Distinct Release-Versionen | Version mit ≥ 1 Bild = 1 | |
| Anzahl Bilder gesamt | Jedes Bild zählt | ✓ |

### Gate
| Option | Description | Selected |
|--------|-------------|----------|
| Aktiv/vorhanden genügt | Unabhängig vom Review-Status, netto | ✓ |
| Nur freigegebene/öffentliche | approved/öffentlich | |

**User's choice:** Anzahl beigetragener Bilder gesamt (`release_version_media` via `uploaded_by_user_id`), aktiv/nicht gelöscht, kein Review-Gate.
**Notes:** Überstimmt die ursprüngliche „Bilder zu N Release-Versionen"-Formulierung.

---

## Anzeige, Gruppierung & Katalog

### Platzierung
| Option | Description | Selected |
|--------|-------------|----------|
| Neue Gruppe „Beiträge" | Getrennt von Fortschritt/Rollen | ✓ |
| In bestehende Gruppen einsortieren | Verteilt | |
| Du entscheidest | Claude wählt | |

### Stufen-Anzeige
| Option | Description | Selected |
|--------|-------------|----------|
| Nur höchste erreichte Stufe | Aktueller Rang | ✓ |
| Alle erreichten Stufen | Kette | |

### Sichtbarkeit
| Option | Description | Selected |
|--------|-------------|----------|
| Toggelbar wie bestehende Badges | Gespeicherte Präferenz je Badge | |
| Immer sichtbar wenn erreicht | Kein Toggle | ✓ |

**User's choice:** Neue Gruppe „Beiträge"; nur höchste Stufe je Familie; immer sichtbar (kein Toggle).
**Notes:** Bewusste Abweichung von den persistierten `member_badges` mit Sichtbarkeits-Schalter.

---

## Claude's Discretion

- Badge-Codes/Labels/Icons/Palette (inkl. besserem Label für Familie 1: „mitgetragen/abgeschlossen" statt „dokumentiert").
- Frontend-Ableitung vs. schmaler Backend-Read (drei sind schwerere Aggregationen → vermutlich Backend-Read).
- Konsistenz mit dem in Phase 112 etablierten Derived-Badge-Rendering.

## Deferred Ideas

- Weitere Badge-Kategorien (Events/Saison, Moderation/Review; Einsortieren vorhandener Katalog-Badges).
- Bildarchivar als distinct Release-Versionen (Alternative).
- Review-gebundene Chronist-Zählung (falls später Notiz-Review-Flow).
- Episoden-Granularität statt Release-Versionen.
