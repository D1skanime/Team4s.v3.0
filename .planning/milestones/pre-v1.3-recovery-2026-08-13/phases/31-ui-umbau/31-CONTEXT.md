---
phase: 31
gathered: 2026-04-30
status: ready_for_planning
source: UI mockup, Phase 30 follow-through, and product discussion
---

# Phase 31: UI Umbau fuer Fansub-Releases und Theme-Kontext - Kontext

## Ausgangslage

Phase 30 hat `fansub_releases` als explizite Admin-Ressource sichtbar gemacht. Die Fansub-Edit-Seite kann inzwischen Anime und Releases fuer eine Fansubgruppe laden, aber der Workflow ist noch nicht die eigentliche Arbeitsflaeche.

Der aktuelle Schmerzpunkt ist konkret:

- Strawhat (`fansub_groups.id=17`) hat `11eyes` und `11eyes: Pink Phantasmagoria` korrekt in der DB.
- Die Bonus/OVA-Release ist als `release_id=92` und `version_id=92` vorhanden.
- Ohne sichtbare und bedienbare Release-Zeile in der Fansubgruppe kann ein Admin aber keine release-spezifischen Medien pflegen oder spaeter Mitglieder/Rollen auf diese Release mappen.

## Produktentscheidungen

### 1. Kein prominenter `Releases neu laden`-Button

Ein sichtbarer Button `Releases neu laden` hat keinen starken Admin-Use-Case. Daten sollen beim Oeffnen des Tabs und nach relevanten Aktionen automatisch neu geladen werden. Ein kleines technisches Refresh-Icon kann spaeter optional sein, aber ist kein Kernbestandteil von Phase 31.

### 2. Release braucht kein eigenes Logo und Banner

Release-spezifische Logo-/Banner-Pflege ist nicht das Ziel dieser Phase. Logos und Banner gehoeren weiter zu Anime/Fansub/Asset-Kontexten, nicht als Standardfelder an jede Release-Zeile.

### 3. Release-Zeilen werden ausklappbar

Statt eines abstrakten globalen Drawers wird jede Release-Zeile im `Anime & Releases`-Tab aufklappbar. Der ausgeklappte Bereich zeigt die reale Arbeitslage fuer genau diese Release.

### 4. Theme-/Segment-Kontext ist der wichtigste Inhalt im aufgeklappten Release

Im ausgeklappten Release-Bereich sollen grafische Theme-/Segment-Karten erscheinen. Sie zeigen, welche Theme-Segmente vorhanden sind, welche Werte geerbt/admin gesetzt sind, und wo fuer diese konkrete Release noch etwas fehlt.

### 5. Segment-Klick fuehrt in release-spezifische Bearbeitung

Wenn ein Admin ein Segment anklickt, soll eine Bearbeitungsansicht erscheinen, aehnlich den bestehenden Theme-/Release-Theme-Asset-Seiten. Diese Bearbeitung gilt fuer die konkrete Release bzw. Fansub-Release-Version.

### 6. Keine Vermischung von Theme-Assets und generischem Release-Media

OP/ED/Karaoke/Insert sind bereits in anderen Phasen als Theme-/Segment-/Extras-Funktion abgedeckt. Diese gehoeren nicht in generisches `release_media`.

Generisches Release-Prozess-Media ist dagegen:

- Screenshots aus dem Fansub-Prozess
- GIFs
- Tool-Screenshots
- WIP-Bilder
- lustige Bilder waehrend des Release-Prozesses
- Notizen/sonstige Dokumentationsassets

Diese duerfen spaeter ueber `release_media` mit `media_assets` verbunden werden.

## Zielbild

Die Fansub-Edit-Seite wird zur Arbeitsflaeche:

1. Admin oeffnet `/admin/fansubs/17/edit`.
2. Admin klickt den Tab `Anime & Releases`.
3. Admin sieht `11eyes` und `11eyes: Pink Phantasmagoria`.
4. Admin klappt `Release #92` auf.
5. Admin sieht Theme-/Segment-Karten im Kontext dieser Release.
6. Admin klickt eine Karte und bearbeitet release-spezifisch nur das, was noch nicht global/admin gesetzt wurde oder bewusst ueberschrieben werden soll.

## Technische Leitplanken

- Bestehende Phase-30-Endpunkte fuer Fansub-Anime-Releases bleiben die Quelle fuer Release-Identitaet.
- Bestehende Theme-/Segment-Repository- und API-Seams muessen wiederverwendet werden.
- Bestehende `release_theme_assets`-Strecke bleibt fuer Theme-/Segment-Assets relevant.
- Generisches Prozess-Media nutzt `release_media`, `media_assets`, `media_files`.
- `fansub_group_media` bleibt nicht die autoritative Runtime-Strecke.
- Die erste Umsetzung darf Reiter/Tab-Inhalte strukturell vorbereiten, aber die genauen Detailinhalte werden spaeter diskutiert.

## Deferred

- Exakte Inhalte der einzelnen Segment-/Release-Reiter.
- Vollstaendiges Mitglieder-/Rollen-Mapping pro Release.
- Drag-and-drop-Sortierung fuer Prozess-Media.
- Komplette Loesch-/Cleanup-Policy fuer Prozess-Media.
