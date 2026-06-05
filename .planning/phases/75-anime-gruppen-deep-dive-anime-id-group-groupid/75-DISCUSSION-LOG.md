# Phase 75: Anime-Gruppen-Deep-Dive `/anime/[id]/group/[groupId]` - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-05
**Phase:** 75-anime-gruppen-deep-dive-anime-id-group-groupid
**Areas discussed:** Seitenstruktur/Layout, Mitwirkende & Member, Releases & OP/ED/Middle, Release-Version-Medien

---

## Seitenstruktur / Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Narrative Scroll-Seite (wie Phase 73) | Hauptseite zu kuratierter einspaltiger Erzählung umbauen | ✓ |
| Bestehende Struktur inkrementell erweitern | Hero+Showcase behalten, Abschnitte anhängen | |

| Option (Reihenfolge) | Description | Selected |
|--------|-------------|----------|
| Hero → Story → Releases/Versionen → OP/ED/Middle → Mitwirkende → Medien | Releases vor Menschen | |
| Hero → Story → Mitwirkende → Releases/Versionen → OP/ED/Middle → Medien | Menschen vor Releases | ✓ |

| Option (Releases-Tiefe) | Description | Selected |
|--------|-------------|----------|
| Kuratierte Vorschau + /releases als volle Liste | Subpage bleibt erhalten | ✓ |
| Vollständige Release-Liste in Hauptseite | /releases ggf. auflösen | |

| Option (Sektions-Nav) | Description | Selected |
|--------|-------------|----------|
| Sticky Nav (Desktop) + Chip-Leiste (Mobil) | Sprungmarken wie Phase 73 D-04 | ✓ |
| Nur durchscrollen | Keine Sprungmarken | |
| Du entscheidest | Planner-Entscheid | |

| Option (Empty States) | Description | Selected |
|--------|-------------|----------|
| Abschnitt sichtbar mit Platzhalter | Stabile Anker (Phase 73 D-15) | ✓ |
| Leere Abschnitte ausblenden | Kürzere Seite, instabile Anker | |

**User's choice:** Narrative Scroll-Seite; Reihenfolge mit Menschen vor Releases; kuratierte Vorschau + /releases-Subpage; Sticky-Nav + Chips; Platzhalter bei Empty.
**Notes:** Bewusste Abweichung von Phase 73 — Menschen-Abschnitt vor Releases.

---

## Mitwirkende & Member

| Option | Description | Selected |
|--------|-------------|----------|
| Projektspezifisch (dieser Anime + diese Gruppe) | release_member_roles + anime_contributions scoped | ✓ |
| Ganzer Gruppen-Roster | fansub_group_members, anime-unabhängig | |
| Beides getrennt | Projektbeteiligte + Gruppen-Verweis | |

| Option (Gruppierung) | Description | Selected |
|--------|-------------|----------|
| Zwei getrennte Blöcke (Team + externe Mitwirkende) | Decision 3 sauber (Phase 73 D-07) | ✓ |
| Eine Liste, Rollen als Badges | Kompakter, verwässert Trennung | |

| Option (Granularität) | Description | Selected |
|--------|-------------|----------|
| Aggregiert je Person übers Projekt | Rollen zusammengefasst | ✓ |
| Pro Release-Version aufgeschlüsselt | Detaillierter, länger | |
| Du entscheidest | Planner-Entscheid | |

| Option (Verlinkung) | Description | Selected |
|--------|-------------|----------|
| Geclaimt → /members/[slug], sonst Nennung | Wie Phase 73 D-10 / Phase 74 | ✓ |
| Keine Verlinkung | Nur Namen/Rollen | |

**User's choice:** Projektspezifische Personen; zwei getrennte Blöcke; aggregiert je Person; geclaimt verlinkt.
**Notes:** Auf dieser Route existiert noch kein öffentlicher Read-Seam für projektspezifische Mitwirkende — Researcher/Planner müssen Datenherkunft + Contract klären.

---

## Releases, Versionen & OP/ED/Middle

| Option (Releases-Vorschau) | Description | Selected |
|--------|-------------|----------|
| Kompakte Highlights + Link zu /releases | Wenige Karten | ✓ |
| Versions-/Release-Zusammenfassung (Kennzahlen) | Aggregierte Fakten | |
| Du entscheidest | Planner-Entscheid | |

| Option (OP/ED/Middle) | Description | Selected |
|--------|-------------|----------|
| Dedizierter Themes-Abschnitt | OP/ED/Middle gruppiert, mit Theme-Infos | ✓ |
| Nur Badges/Zähler | Wie heute auf /releases | |

| Option (Themes-Tiefe) | Description | Selected |
|--------|-------------|----------|
| Informativ (Theme-Liste) | Keine Player/Editoren | |
| Mit visuellen Asset-Einblicken | release_theme_assets, falls öffentlich | ✓ |
| Du entscheidest | Planner-Entscheid | |

| Option (Versionen) | Description | Selected |
|--------|-------------|----------|
| Versionen erkennbar ausweisen | Wo Daten vorhanden | ✓ |
| Nur kanonische/aktuelle Version | Mehrfachversionen zusammenfassen | |
| Du entscheidest | Planner-Entscheid | |

**User's choice:** Kompakte Highlights + Link; dedizierter Themes-Abschnitt; mit visuellen Asset-Einblicken (sichtbarkeitsgegated); Versionen ausweisen wo vorhanden.
**Notes:** OP/ED/Middle ist Kern des „Stärkens"; Asset-Einblicke nur sichtbar/freigegeben (Decision 8/G).

---

## Release-Version-Medien

| Option (Darstellung) | Description | Selected |
|--------|-------------|----------|
| Eigener „Release-Einblicke"-Abschnitt (gebündelt) | Galerie, klar beschriftet (Phase 73 D-11) | ✓ |
| Pro Release/Version eingebettet | Kontextnäher, verteilt | |
| Du entscheidest | Planner-Entscheid | |

| Option (Sichtbarkeit) | Description | Selected |
|--------|-------------|----------|
| Nur öffentlich+freigegeben; sonst Platzhalter | Stabile Anker (D-15) | ✓ |
| Nur öffentlich+freigegeben; bei leer ausblenden | Bricht mit Anker-Entscheid | |

**User's choice:** Eigener gebündelter „Release-Einblicke"-Abschnitt; nur öffentlich+freigegeben, sonst Platzhalter.
**Notes:** Quelle getReleaseVersionMedia; Sichtbarkeit folgt Phase-72-Projektion.

---

## Scope-Bestätigung

| Option | Description | Selected |
|--------|-------------|----------|
| Read-only, keine Schreib-/Pflege-Flows | Anzeige über (erweiterte) öffentliche APIs | ✓ |
| Scope-Abweichung | — | |

**User's choice:** Phase 75 bleibt reine öffentliche Read-/Anzeige-Phase; Pflege/Upload erst Phasen 77–79.

## Claude's Discretion

- Komponenten-Aufteilung/CSS-Module-Struktur, Sticky-Nav-Implementierung, Anzahl/Sortierung der Releases-Highlights, Aggregations-Schwellwerte.
- Ob bestehende Helper erweitert oder neue Phase-72-Projektionen konsumiert werden (Lock K).

## Deferred Ideas

- Schreib-/Pflege-/Upload-Flows → Phasen 77/78/79.
- Vollständige Release-Liste in Hauptseite / Auflösung der /releases-Subpage.
- Pro-Release-Version-Rollenaufschlüsselung.
- Migration nativer `<input>`-Elemente der /releases-Subpage auf `@/components/ui`.
