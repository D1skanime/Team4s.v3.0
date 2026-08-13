---
phase: 28
gathered: 2026-04-28
status: ready_for_planning
---

# Phase 28: Segment Playback Sources From Jellyfin Runtime - Kontext

## Ausgangslage

Phase 26 und 27 haben zwei wichtige Fundamente geschaffen:

- Segment-Dateien koennen als echte Team4s-Assets hochgeladen und einem Segment zugeordnet werden.
- Eine dedizierte Tabelle `theme_segment_playback_sources` existiert bereits, um aktive Playback-Quellen von reiner Segment-Provenance zu trennen.

Die Produktlogik ist aber noch nicht fertig verdrahtet:

- Der Segment-Editor behandelt Upload-Dateien noch zu stark als Hauptquelle.
- `theme_segment_playback_sources` wird zwar gespiegelt, aber noch nicht sauber auf die aktuell bearbeitete Episode-Version bzw. ihren Jellyfin-Stream aufgeloest.
- Laufzeitgrenzen sollen fachlich von der realen Release-Datei kommen, nicht von AniSearch oder nur manueller Eingabe.

## Ziel

Phase 28 macht Jellyfin bzw. die aktuelle Episode-Version zur **Standard-Playback-Quelle** fuer Segmente.

Das bedeutet:

- Standardfall: Segment spielt aus der aktuellen Episode-Version / deren Jellyfin-Stream.
- Zeitbereich orientiert sich an `release_variants.duration_seconds`, wenn diese Laufzeit bekannt ist.
- Upload-Dateien bleiben erhalten, aber nur als **expliziter Fallback** oder bewusst gewaehlt alternative Playback-Quelle.

## Produktentscheidungen

1. **Jellyfin ist Runtime-Authority, nicht Segment-Authority.**
   - Jellyfin liefert echte Videolaufzeit und Stream-Kontext.
   - Jellyfin definiert **nicht**, was OP/ED fachlich ist.

2. **Segment-Identitaet bleibt bei uns.**
   - Typ, Name, Gruppe, Episodenbereich, Start/Ende bleiben im Segmentmodell.

3. **Playback und Provenance bleiben getrennt.**
   - `source_type/source_ref/source_label` duerfen weiter die Herkunft oder einen expliziten Fallback beschreiben.
   - Die aktive Playback-Aufloesung laeuft ueber `theme_segment_playback_sources`.

4. **Upload ersetzt Standard-Playback nicht stillschweigend.**
   - Wenn ein Upload existiert, wird er nicht automatisch zur Hauptquelle, nur weil er vorhanden ist.
   - Der Operator muss bewusst entscheiden bzw. der Standard muss klar geregelt sein.

5. **Nullable Laufzeit bleibt normal.**
   - `release_variants.duration_seconds` ist hilfreich, aber nicht garantiert befuellt.
   - Wenn keine reale Laufzeit vorhanden ist, muss Segmentbearbeitung weiter moeglich bleiben.

## Feste Entscheidungen fuer diese Phase

1. Standard-Playback ist `episode_version`, wenn die aktuelle bearbeitete Release-Variante aufgeloest werden kann.
2. Upload bleibt als optionaler Fallback erhalten.
3. Backend muss die aktuelle Release-Variante und ihre `duration_seconds` im Segment-Playback-Snapshot real aufloesen.
4. Frontend darf Zeitgrenzen gegen reale Laufzeit clampen, aber Backend muss autoritativ validieren.
5. AniSearch ist fuer diese Phase **nicht** die relevante Laufzeitquelle.

## Kontextschnitte

### Was Admin jetzt koennen soll

Auf `/admin/episode-versions/:id/edit` im Tab `Segmente`:

- Ein Segment anlegen oder bearbeiten, ohne zuerst eine Upload-Datei zu brauchen.
- Verstehen, dass die aktuelle Episode-Version/Jellyfin-Datei die Standard-Quelle ist.
- Wenn eine reale Laufzeit bekannt ist:
  - Segment-Ende nicht darueber hinaus speichern koennen.
- Optional eine hochgeladene Segment-Datei als Fallback bzw. alternative Playback-Quelle behalten.

### Was bewusst nicht Teil von Phase 28 ist

- Vollstaendige Public-Playback-Implementierung
- Transcoding / Hard-Cut-Rendering
- Neue Segment-Bibliothekslogik fuer Identitaet (liegt bereits in Phase 27)
- Allgemeine Jellyfin-Metadaten-Neuplanung

## Technische Leitplanken

### Keine zweite Segment-Payload

Die vorhandenen Segment-DTOs und `theme_segment_playback_sources` sollen erweitert und sauber benutzt werden.
Es soll **kein** paralleles, ad-hoc Frontend-Modell fuer Playback-Aufloesung entstehen.

### Release-Kontext statt Anime-Heuristik

Playback-Aufloesung soll sich an der **aktuell bearbeiteten Release-Variante** orientieren.
Wenn der Editor bereits auf einer konkreten Episode-Version arbeitet, darf die Quelle nicht nur anime-global geraten werden.

### Runtime-Sicherheit auf beiden Ebenen

- Frontend: fruehe UX-Hilfe, Clamping, klare Hinweise
- Backend: echte Validierung gegen `duration_seconds`, wenn vorhanden

## Erfolgssicht

Wenn Phase 28 fertig ist, muss ich sagen koennen:

> Ich kann ein Segment auf einer Episode-Version anlegen, ohne zuerst eine Datei hochzuladen. Standardmaessig bezieht sich das Segment auf den echten Jellyfin-/Episode-Version-Stream dieser Release-Datei. Wenn eine reale Laufzeit bekannt ist, verhindert das System ungueltige Endzeiten. Und falls ich doch eine eigene OP/ED-Datei will, bleibt das als bewusster Fallback moeglich.
