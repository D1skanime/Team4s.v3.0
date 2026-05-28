# Phase 55: Sichere TipTap-Persistenz fuer Profilgeschichte - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-28
**Phase:** 55-sichere-tiptap-persistenz-fuer-profilgeschichte
**Areas discussed:** API-Form, Migration, Editor-UX, Sanitizing, Todo-Folding

---

## API-Form

| Option | Description | Selected |
|--------|-------------|----------|
| Plain Text bleibt Quelle | Aktueller Zustand; Rich Text geht beim Speichern verloren. | |
| Rich Text wird Quelle der Wahrheit | TipTap JSON traegt den Editorzustand; Plain Text ist abgeleitet. | x |
| Rich-Text-Objekt oder flache Felder offen lassen | Planner entscheidet Feldform, solange der Contract eindeutig ist. | x |

**User's choice:** Alles, was im Editor geschrieben wird, muss erhalten bleiben. H1-H3, Farben und Tabellen duerfen nach Save nicht verschwinden.
**Notes:** Die technische Feldform ist zweitrangig; entscheidend ist kein Rich-Text-Datenverlust.

---

## Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Schwere Produktionsmigration | Maximale Legacy-Sicherheit fuer echte Produktionsdaten. | |
| Schlanke Testdatenmigration | DB wird vor Produktivgang geloescht; Loesung bleibt sauber, aber nicht ueberdimensioniert. | x |
| Runtime-Fallback | Kann genutzt werden, wenn es die einfache robuste Loesung ist. | x |

**User's choice:** Das Projekt ist noch in der Testphase; am Ende wird vor Prod alles aus der DB geloescht.
**Notes:** Migration soll technisch sauber bleiben, aber keine schwere Produktionsdaten-Rettung planen.

---

## Editor-UX

| Option | Description | Selected |
|--------|-------------|----------|
| Editor bleibt dauerhaft sichtbar | User kann nach Save direkt weiter im Editor schreiben. | |
| Lesemodus nach Save | Gespeicherter Zustand wird gerendert angezeigt; Bearbeiten nur per Button. | x |
| Public-nahe Vorschau | Anzeige soll wie spaetere Public-Profil-Darstellung aussehen. | x |

**User's choice:** Nach Speichern soll ein gespeicherter Zustand sichtbar sein. Bearbeitung startet ueber einen `Bearbeiten`-Button. Ohne Bearbeitung werden keine Editor-Tabs/Toolbar gezeigt.
**Notes:** Der Story-Bereich braucht Lesemodus und Bearbeitungsmodus.

---

## Sanitizing

| Option | Description | Selected |
|--------|-------------|----------|
| Enge Profil-Allowlist | Weniger Features, z. B. ohne Tabellen/Farben. | |
| Voller aktueller Editorumfang | Alles, was aktuell sichtbar ist, muss persistieren und sicher gerendert werden. | x |
| Abgleich UI gegen Backend | Sichtbare Features muessen mit Backend-Allowlist uebereinstimmen. | x |

**User's choice:** Mit allem, was es gibt.
**Notes:** Ziel ist nicht Feature-Reduktion, sondern Contract-Paritaet zwischen UI und Backend.

---

## Todo-Folding

| Option | Description | Selected |
|--------|-------------|----------|
| Cropper in Phase 55 falten | Wuerde Phase 55 verbreitern. | |
| Cropper fuer Phase 56 vormerken | Globaler Cropper bleibt eigener Folge-Slice. | x |
| Profil-Aktivitaet/Contributor-Flows falten | Wuerde neue Contracts ausserhalb Profilgeschichte erzeugen. | |

**User's choice:** Cropper-Todo fuer Phase 56.
**Notes:** Profil-Hub-Aktivitaet und Contributor-Edit/Delete bleiben ebenfalls deferred.

---

## the agent's Discretion

- Exakte API-Feldform fuer Rich-Text-Profilgeschichte, solange der Vertrag eindeutig und contract-aligned ist.
- Exakte schlanke Migrationsstrategie fuer Testdaten.
- Exakte Komponentenaufteilung fuer Story-Lese-/Bearbeitungsmodus.

## Deferred Ideas

- Globaler Cropper-Library-Ersatz als Phase 56.
- Profil-Hub-Aktivitaetsredesign.
- Contributor-eigene Medien/Notizen editieren und loeschen.
