---
phase: 30
gathered: 2026-04-30
status: ready_for_planning
---

# Phase 30: Fansub-Releases API-Endpunkte - Kontext

## Ausgangslage

Der aktuelle Code benutzt `fansub_releases` bereits fachlich, aber nur indirekt:

- Episode-Version-Erstellung und -Aenderung erzeugen und aktualisieren Releases ueber `release_versions` und `release_variants`.
- OP/ED-Theme-Assets haengen an einem kanonischen Release-Anker fuer `fansub + anime`.
- Gruppen- und Anime-Statistiken lesen Release-Daten bereits aus der normalisierten Release-Struktur.

Trotzdem fehlt ein expliziter Admin-API-Contract fuer Releases selbst.
Heute muessen Oberflaechen oder Handler Release-Informationen implizit ueber andere Seams entdecken:

- ueber Episode-Version-Endpunkte
- ueber Theme-Asset-Endpunkte
- oder ueber Repository-Helfer wie `GetCanonicalFansubAnimeRelease`

Das macht die Release-Achse fachlich echt, aber transportseitig unsichtbar.

## Wichtige Erkenntnisse aus dem aktuellen Audit

1. `anime_fansub_groups` ist nicht nur DB-Idee, sondern produktiv verdrahtet.
   - Fansub-zu-Anime-Beziehungen laufen bereits ueber echte Handler-, Repository- und Frontend-Pfade.
   - Phase 30 darf diese Tabelle daher als aktive Scope-Achse fuer `fansub + anime` behandeln.

2. `media_assets` ist ebenfalls produktiv verdrahtet.
   - Theme-Assets, Segment-Assets und weitere Media-Flows arbeiten bereits gegen `media_assets`.
   - Release-bezogene Medien muessen diesen bestehenden Media-Seam wiederverwenden.

3. `fansub_group_media` ist aktuell kein aktiver Produktpfad fuer Fansub-Media.
   - Die Tabelle existiert im Schema, ist aber nicht die reale Anbindung fuer das aktuelle Fansub-Admin-Verhalten.
   - Phase 30 darf darum keine Release- oder Fansub-Media-API auf `fansub_group_media` aufbauen.

## Ziel

Phase 30 macht `fansub_releases` als explizite Admin-API sichtbar und nutzbar, ohne das Release-Modell fachlich zu verbiegen.

Das bedeutet:

- Releases werden als lesbare und ansprechbare Admin-Ressource exponiert.
- `fansub + anime` kann einen kanonischen Release-Anker explizit aufloesen, statt ihn nur indirekt aus anderen Endpunkten zu erhalten.
- Release-Metadaten koennen dort gepflegt werden, wo sie fachlich hingehoeren.
- Bestehende Theme-Asset- und Episode-Version-Seams werden darauf abgestimmt, statt weitere implizite Sonderpfade zu pflegen.

## Produktentscheidungen

1. `fansub_releases` ist ein Anker, kein leerer Freitext-Container.
   - Ein Release ist fachlich an Episode, Source und nachgelagerte Versionen/Varianten gebunden.
   - Phase 30 soll deshalb keine nackten Releases ohne sinnvollen Unterbau produktiv machen.

2. Kein neues Media-Modell fuer Releases.
   - Release- oder Theme-nahe Medien bleiben auf `media_assets`.
   - `fansub_group_media` ist fuer diese Phase kein Zielpfad.

3. `anime_fansub_groups` bleibt die Scope-Achse fuer Fansub-Anime-Kontext.
   - Release-Endpunkte duerfen davon ausgehen, dass diese Relation produktiv und kanonisch lesbar ist.

4. Theme-Assets bleiben ein Spezialslice auf einem Release, nicht der Ersatz fuer eine Release-API.
   - `GET /admin/fansubs/:id/anime/:animeId/theme-assets` darf nicht weiter die versteckte Release-Discovery sein.

5. Create/Delete von Releases bleibt bewusst kontrolliert.
   - Release-Erzeugung bleibt an Episode-Version-Create gekoppelt.
   - Release-Loeschung bleibt an das Entfernen der letzten Version/Variante gekoppelt.
   - Phase 30 plant deshalb primär Read/Resolve und gezielte Metadatenpflege, nicht freies Blanko-CRUD.

## Kontextschnitte

### Was Admin nach Phase 30 koennen soll

- fuer eine Fansub-Anime-Kombination den existierenden Release-Anker explizit abfragen
- Releases und ihre wichtigsten Metadaten sichtbar laden
- Release-Kontext fuer Folge-Features wie Theme-Assets oder Release-nahe Pflege nicht mehr indirekt erraten muessen
- Release-Metadaten pflegen, ohne ueber Episode-Version-Workarounds zu gehen

### Was bewusst nicht Teil von Phase 30 ist

- ein neues allgemeines Release-Media-System
- freie Erstellung leerer Releases ohne Episode-/Versionskontext
- ein kompletter Umbau der Episode-Version-UI
- Migration von Fansub-Media auf `fansub_group_media`

## Technische Leitplanken

### Explizite Release-Seams statt impliziter Discovery

Neue Admin-Oberflaechen sollen Release-IDs nicht mehr aus Theme-Asset-Nebenantworten oder anderen Seiteneffekten ziehen muessen.

### Kein doppelter Wahrheitskern

Release-Daten duerfen nicht gleichzeitig

- ueber Episode-Version-Antworten,
- ueber Theme-Asset-Hilfsfelder,
- und ueber einen neuen Release-Contract

mit widerspruechlicher Semantik leben.

### Release-Media bleibt auf bestehendem `media_assets`-Pfad

Wenn Release-nahe Medien sichtbar werden, muessen sie den aktiven Media-Seam nutzen.
Diese Phase baut keine neue Join-Logik auf `fansub_group_media`.

## Erfolgssicht

Wenn Phase 30 fertig ist, muss ich sagen koennen:

> Releases im Fansub-Kontext sind im Admin jetzt eine explizite, verstehbare API-Ressource. Ich muss Release-Anker nicht mehr indirekt aus Theme-Assets oder Episode-Version-Nebeneffekten erraten, und die Planung vertieft weder falsche Media-Seams noch die ungenutzte `fansub_group_media`-Idee.
