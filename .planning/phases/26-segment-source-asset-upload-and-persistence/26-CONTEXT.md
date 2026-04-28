---
phase: 26
gathered: 2026-04-27
status: replanned_after_review
---

# Phase 26: Segment Source Asset Upload And Persistence - Kontext

## Ausgangslage nach Review

Phase 25 kann Segmente mit:
- Typ
- Name
- Episodenbereich
- Zeitbereich
- symbolischem `source_type`

speichern.

Die erste Phase-26-Umsetzung hat aber nur Teile davon vorbereitet:
- `source_type/source_ref/source_label` werden noch in `source_jellyfin_item_id` kodiert
- es gibt noch keinen echten Segment-Asset-Upload auf `/admin/anime/:id/segments/:segmentId/asset`
- die vorhandenen `theme-assets`-Routen arbeiten noch auf dem alten Fansub-/Release-Theme-Flow
- Dateien landen noch mit zufälligem Namen im alten Theme-Video-Schema
- Delete räumt Datei und `media_assets` noch nicht deterministisch mit auf

## Ziel

Phase 26 schliesst genau diese Luecke sauber und ohne Legacy-Mischung:
- echte DB-Spalten auf `theme_segments` fuer `source_type/source_ref/source_label`
- eigener Segment-Asset-Upload im Episode-Version-/Segment-Kontext
- deterministischer Team4s-Pfad fuer Segment-Dateien
- Segment referenziert das Asset sauber
- Segment-Asset kann wieder entfernt werden
- Datei und `media_assets` werden dabei mit bereinigt

Playback ist **nicht** Teil dieser Phase.

## Produktentscheidung

Die Datei lebt **nicht** als primaere Wahrheit in Jellyfin, sondern im bestehenden Team4s-Media-System.

Das Segment speichert nur:
- `source_type`
- `source_ref`
- `source_label`

Die eigentliche Datei liegt im Team4s-Storage und wird als normales `media_asset` registriert.

## Feste Entscheidungen fuer diese Replanung

1. Keine weitere Nutzung des alten `theme-assets`-Flows fuer Segment-Dateien.
   - `release_theme_assets` bleibt fuer den bestehenden Theme-Video-Pfad bestehen
   - Segment-Dateien bekommen einen eigenen Upload-/Delete-Pfad

2. `theme_segments` bekommt echte Felder:
   - `source_type`
   - `source_ref`
   - `source_label`
   `source_jellyfin_item_id` bleibt nur fuer Abwaertskompatibilitaet bestehen

3. Deterministischer Segment-Pfad:
   - `segments/anime_{animeId}/group_{groupId}/{version}/{segmentTypeLower}/{sanitizedFilename}`

4. Eigener Media-Kind:
   - `segment_asset`

5. Erlaubte Formate fuer Segment-Dateien:
   - Video: mp4, webm, mkv
   - Audio: mp3, aac, flac, ogg, opus, m4a

6. Groessenlimit:
   - max 150 MB

7. Delete-Semantik:
   - Segment-Referenz leeren
   - Datei von Disk entfernen
   - zugehoeriges `media_assets`-Objekt per `storage_path` mitloeschen

## Kontextschnitte

### Was Admin jetzt koennen soll

Auf `/admin/episode-versions/:id/edit` im Tab `Segmente`:
- Quelle `Datei aus Release-Asset` waehlen
- Segment zuerst speichern
- danach Datei fuer genau dieses Segment hochladen
- hinterlegte Datei sehen
- Datei wieder entfernen

### Was bewusst **nicht** Teil von Phase 26 ist

- Playback im Admin
- Public-Wiedergabe
- freier Jellyfin-Picker
- allgemeine Fansub-Stammdaten-Seite als Upload-Ort
- komplette Fansub-Selbstpflege-Oberflaeche

## Technische Leitplanken

### Keine neue Sondertabellenfamilie

Die bestehende Media-/Asset-Seam soll weiterverwendet werden.
Es geht um Verdrahtung, nicht um ein neues paralleles Asset-System.

### Rechtefaehigkeit fuer spaeter

Der Upload wird jetzt im Admin-Segmentflow gebaut, aber so, dass dieselbe Backend-Seam spaeter fuer gruppenbeschraenkte Fansub-Selbstpflege wiederverwendbar ist.

## Erfolgssicht

Wenn Phase 26 fertig ist, muss ich sagen koennen:

> Ich bearbeite ein Segment, waehle `Datei aus Release-Asset`, lade direkt die passende OP/ED/Insert-Datei hoch, sehe den Dateinamen am Segment, und kann die Datei wieder entfernen. Die Referenz ist sauber in `theme_segments` gespeichert, und Delete raeumt Datei plus `media_assets` mit auf.
