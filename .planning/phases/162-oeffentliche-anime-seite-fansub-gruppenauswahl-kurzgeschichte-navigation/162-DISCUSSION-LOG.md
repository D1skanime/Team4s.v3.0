# Phase 162: Discussion Log

> **Audit trail only.** Not consumed by downstream agents. Decisions live in `162-CONTEXT.md`.

**Date:** 2026-09-17
**Phase:** 162 – Öffentliche Anime-Seite: Fansub-Gruppenauswahl, Kurzgeschichte und Navigation
**Areas discussed:** URL vs. gespeicherte Wahl, Kurzgeschichte-Quelle, Chips und Episodenliste, Coop-Testdaten und -Anzeige

---

## URL vs. gespeicherte Wahl

| Frage | Optionen | Auswahl |
|---|---|---|
| localStorage-Wahl bei URL-Kontext | Nur URL (empfohlen) / URL vor Speicher | **Nur URL** |
| Historie bei Chip-Klick | push (empfohlen) / replace | **push** |
| URL-Schlüssel | Slug (empfohlen) / ID | **Slug** |

## Kurzgeschichte-Quelle

| Frage | Optionen | Auswahl |
|---|---|---|
| Welcher Text | Erste Geschichte, reiner Text (empfohlen) / Erste Geschichte mit Titel | **Erste Geschichte, reiner Text** |
| Faktenzeile + Platzhalter | weg (empfohlen) / behalten | **weg** |
| „Mehr lesen“-Ziel | `/fansubs/<slug>#geschichte` (empfohlen) / ohne Anker | **mit Anker** |

## Chips und Episodenliste

| Frage | Optionen | Auswahl |
|---|---|---|
| Filtert Wahl die Folgen-Versionen | Ja, wie heute (empfohlen) / Nein, nur Kontext | **Ja** |
| Position | Unter „Episoden (N)“ (empfohlen) / darüber | **Unter „Episoden (N)“** |
| „Zum Projekt“ ohne Pretty-Pfad | Technische Route als Fallback (empfohlen) / ausblenden | **ausblenden** (abweichend von Empfehlung) |

## Coop-Testdaten und -Anzeige

| Frage | Optionen | Auswahl |
|---|---|---|
| Coop-Testdaten | Executor legt an (empfohlen) / Auftraggeber selbst / nur Fixtures | **Auftraggeber selbst** |
| Coop-Kennzeichnung Versionszeile | später (empfohlen) / mit rein | **später** |

## Claude's Discretion
- URL-Update-Mechanismus, Contract-Feldname, Chip-Primitive-Lösung, Chip-Gruppen-Semantik, Overflow-Details, Fallback-Liste bei Episoden-Ladefehler.

## Deferred Ideas
- Coop-Kennzeichnung in der Versionszeile; Merkfunktion letzte Gruppe; `group_type`-Suchfehler.
