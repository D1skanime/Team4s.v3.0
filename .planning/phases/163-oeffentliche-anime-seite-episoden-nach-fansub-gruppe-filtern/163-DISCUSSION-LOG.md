# Phase 163: Öffentliche Anime-Seite: Episoden nach Fansub-Gruppe und vorhandenen Releases filtern - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-17
**Phase:** 163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern
**Areas discussed:** Gruppenwechsel lädt neu, Zahlen: Überschrift + Badge

Nicht gewählt (Claude-Standard in CONTEXT.md): Was heißt „öffentlich“? (D-02), Folge 23 / Testfall + Fallback (D-16, D-18)

---

## Gruppenwechsel lädt neu

| Option | Description | Selected |
|--------|-------------|----------|
| Alte Liste gedimmt | Bisherige Liste bleibt, ausgegraut/nicht klickbar bis neue Daten da | ✓ |
| Skeleton-Platzhalter | Liste sofort durch Platzhalter ersetzt | |
| Alle Gruppen vorab laden | Erste Seite je Gruppe beim Seitenaufruf | |

| Option | Description | Selected |
|--------|-------------|----------|
| Immer neu laden (Zurück/Vor) | Einfach, immer korrekt | ✓ |
| Pro Gruppe merken | Geladene Listen je Gruppe im Seitenbesuch halten | |

| Option | Description | Selected |
|--------|-------------|----------|
| Hinweis + Erneut versuchen | Keine Mischdaten, Chip bleibt auf neuer Gruppe | ✓ |
| Zurück zur vorigen Gruppe | Auswahl/URL springt zurück | |

**User's choice:** jeweils die empfohlene Option.
**Notes:** Löst Phase 162 D-03 („kein neuer Datenabruf beim Gruppenwechsel“) für die Episodenliste ab.

---

## Zahlen: Überschrift + Badge

| Option | Description | Selected |
|--------|-------------|----------|
| Unverändert (220) | Anime-Gesamtzahl bleibt | |
| Gesamt + mit Releases | „Episoden (220)“ + „5 mit Releases“ | |
| Nur Trefferzahl | Überschrift zeigt sichtbare Anzahl; Gesamtzahl am Poster | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Nur Gruppenversionen | Badge zählt nur sichtbare Versionen (Coop zählt mit) | ✓ |
| Immer alle Versionen | Wie heute | |

**User's choice:** Nur Trefferzahl; Nur Gruppenversionen.

---

## Claude's Discretion

- Definition „öffentliche Version“ (Variante + Gruppe, Anime nicht disabled; Episodenstatus kein Gate)
- Naruto-Regression mit Folge 1–5 statt 23 (23 hat im Bestand kein Release), §15-Szenario als Fixture
- Notfall-Liste in page.tsx durch neutralen Fehlerhinweis ersetzen
- SQL-/Cursor-Details, Backendverhalten bei fremdem Slug, Dimm-Mechanik

## Deferred Ideas

- Native `<button>` im Episodenkopf (UI-Primitives-Altlast)
- Coop-Kennzeichnung in der Versionszeile
- Eigenes Sichtbarkeitsfeld für Release-Versionen
