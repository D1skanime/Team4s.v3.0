# Phase 98 Research: Segmentstream / Kara Playback

## Ausgangslage

Phase 98 plant keine freie Episode-Streaming-Funktion, sondern eine segmentgenaue Playback-Schicht fuer OP/ED/Kara-Segmente. Der Client soll nur eine `theme_segment_id` abspielen koennen. Quelle, Start, Ende und Fallback werden serverseitig aus den gespeicherten Segmentdaten aufgeloest.

Die wichtigsten Produktentscheidungen aus `98-CONTEXT.md` bleiben gueltig:

- Gespielt wird ein gespeichertes Segment, nicht ein frei parametrisierbarer Stream.
- Der Server verwendet immer gespeicherte Start-/Endzeiten.
- Automatisch abgeleitete Clips aus Release/Jellyfin-Quellen sind hart auf 4 Minuten begrenzt.
- Upload-Fallbacks bleiben als bewusst kuratierte Clips erlaubt und verwenden die vorhandene Segment-Asset-Logik. Sie duerfen keine neue Media-Struktur, kein `release_media`-Shortcut und keine Episode-Media-Abkuerzung einfuehren.
- MVP ist nicht HLS-first. Browserfaehige MP4-Clips mit H.264/AAC reichen, solange ASS/Kara-Effekte erhalten werden.
- Rechte sind capability-getrieben auf konkrete App-User und muessen im Rechtemanagement sichtbar vergeben werden koennen. Rollen duerfen hoechstens Defaults seeden; die Runtime darf keine Rollennamen hardcoden.

## Spike-Ergebnis

Der Spike `001-jellyfin-api-segment-encode` hat bestaetigt:

- Jellyfin kann fuer Viper's Creed EP01 die Videodatei per API/Stream liefern.
- Der Jellyfin-Stream unterstuetzt Range Requests.
- Jellyfin liefert zur gleichen Datei eine ASS-Untertitelspur.
- FFmpeg kann aus dem Jellyfin-Stream ein kurzes MP4 mit eingebrannten ASS-Untertiteln und AAC-Audio erzeugen.
- Das Test-MP4 enthielt exakt Video und Audio:
  - Video: H.264, 1280x720, ca. 20 Sekunden
  - Audio: AAC stereo, ca. 20 Sekunden

Damit ist der technische Kern tragfaehig: Team4s kann aus einer ueber Jellyfin erreichbaren Release-Datei serverseitig ein begrenztes Segment rendern, inklusive Audio und Kara/ASS-Effekten.

## Wichtige Einschraenkungen

- Der aktuelle Backend-Container enthaelt noch kein `ffmpeg`/`ffprobe`.
- FFmpeg-Logs duerfen keine Jellyfin-API-Keys oder signierten URLs in normale Logs schreiben.
- Die Datenbank speichert bei Release-Versionen teilweise `hardsub`, waehrend Jellyfin trotzdem eine ASS-Spur meldet. Die Renderlogik darf deshalb nicht allein dem DB-Feld `subtitle_type` vertrauen, sondern muss Jellyfin-MediaStreams pruefen.
- Der aktuelle Admin-Preview-Flow nutzt release-stream plus `startTimeTicks` und stoppt das Ende im Browser. Das ist fuer Public/Segmentstream nicht ausreichend, weil das Ende nicht serverseitig erzwungen wird.
- Der Segment-Upload-Fallback existiert bereits und darf nicht durch eine parallele Upload-/Media-Struktur ersetzt werden.
- Mehrere oder falsche Subtitle-Tracks bleiben ein echtes Risiko. Phase 98 soll automatisch default/forced/erste passende ASS/Sub-Spur waehlen, die Wahl diagnostizieren und keine Track-Picker-UI bauen.

## Relevante bestehende Stellen

- `docs/architecture/db-schema-fansub-domain.md`
  - Release-Version-spezifische Prozessmedien gehoeren nicht direkt an Episoden.
  - Keine parallele Media-Logik erfinden.
- `docs/frontend/streaming-auth-handoff.md`
  - Next-Streaming-Routen duerfen serverseitig Auth-Cookies lesen und Grants anfordern.
  - Normale Browser-UI darf keine Tokens lesen oder eigene Bearer-Header bauen.
- `backend/internal/handlers/admin_content_anime_theme_segments.go`
  - Segment CRUD, Upload/Reuse-Fallbacks, `maxSegmentWindowSeconds = 240`.
  - `requireSegmentManage` verwendet `release_version.segments.manage`.
- `backend/internal/repository/admin_content_anime_themes.go`
  - `theme_segment_playback_sources` wird bereits mit `source_kind`, Release-Variante, Jellyfin-Item, Upload-Asset und Zeitfenster gepflegt.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx`
  - Aktuelle Preview baut `/api/releases/:variantId/stream?startTimeTicks=...`.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx`
  - Segmentformular und Preview-UI.
- `frontend/src/app/api/releases/[id]/stream/route.ts`
  - Bestehendes Pattern fuer serverseitige Next-Streaming-Relays.
- `frontend/src/lib/server/streamRelayAuth.ts`
  - Bestehendes Pattern fuer Grant-Aufloesung mit Refresh-Cookie.
- `backend/internal/permissions/permissions.go`
  - `release_version.segments.manage` existiert bereits.

## Empfohlene Architektur

1. Segment-Render-Cache in der Datenbank
   - Technische Derived-Media-Struktur, nicht `media_assets`.
   - Cache-Key aus Segment-ID, Playback-Source, Start/Ende, Quellenidentitaet und Renderprofil.
   - Statusfelder fuer `queued`, `rendering`, `ready`, `failed`, `stale`.

2. Background-Render-Service
   - Wird beim Erstellen/Aendern von Segmenten oder Playback-Quellen angestossen.
   - Nimmt gespeicherte Zeiten, prueft 4-Minuten-Grenze fuer automatisch abgeleitete Quellen.
   - Probt Jellyfin-MediaStreams, waehlt eine geeignete ASS/Sub-Spur automatisch.
   - Rendert MP4/H.264/AAC mit Audio und optional eingebrannten ASS-Untertiteln.
   - Schreibt nur technische Cache-Dateien in einen Derived-Media-Pfad.

3. Segment-Grant und Segment-Stream
   - Client fordert/benutzt nur Segment-ID.
   - Grant gilt kurz und exakt fuer ein Segment.
   - Stream-Endpunkt liefert vorbereiteten Clip oder Upload-Fallback.
   - Keine freien `start`, `end`, `duration` oder Jellyfin-Parameter am Public/Frontend-Endpunkt.

4. Admin/Leader UI
   - Segment-Editor zeigt Renderstatus.
   - Preview benutzt Segmentstream, nicht release-stream mit Client-Stopp.
   - Fehler und Retry sind sichtbar, aber Upload-Fallback bleibt der bekannte Weg.
   - Segmentverwaltung prueft konkrete App-User-Capabilities. Ein Leader soll ueber Rechtevergabe entscheiden koennen, welche App-User Segmente erstellen, editieren, loeschen, vorbereiten oder Fallbacks hochladen duerfen.

5. Public-Vorbereitung ohne Public-UI
   - Backend/API wird so gebaut, dass spaeter Public-Seiten dieselbe Segment-ID-basierte Schicht nutzen koennen.
   - Public-Produkt-UI wird in dieser Phase nicht gebaut.

## Offene Risiken

- Renderjobs im Backend-Prozess sind fuer den MVP einfacher, aber bei mehreren Instanzen spaeter durch Worker/Queue zu ersetzen.
- Jellyfin-Transcode-/Stream-URLs koennen je nach Server-Konfiguration variieren; die Renderlogik muss Fehler sauber als Segmentstatus ablegen.
- ASS-Kara-Effekte koennen visuell von Player/Renderer abweichen. Der Akzeptanztest muss mindestens ein echtes Viper's-Creed-Segment visuell pruefen.
- Lange Upload-Fallbacks sind bewusst erlaubt; sie duerfen aber nur als Segment-Asset abgespielt werden, nicht als frei zuschneidbarer Episode-Stream.

## Negative Scope / Guardrails

- Kein HLS-MVP, solange MP4/H.264/AAC den Bedarf deckt.
- Keine neue Upload-Tabelle, kein neuer fachlicher Media-Typ und kein Anhängen von Segmentclips an Episoden.
- Kein `release_media` als Ersatz fuer Segment-Fallbacks oder technische Render-Caches.
- Kein On-demand-Encoding beim ersten Play-Klick.
- Kein stiller Fallback auf andere Quellen, wenn die gewaehlte Release-/Jellyfin-Quelle nicht renderbar ist.
- Keine freien Start-/Endparameter am Segmentstream.
- Kein Rollen-Hardcode wie `leader darf immer`; Runtime prueft explizite App-User-Capabilities.
- Keine Subtitle-Track-Picker-UI in Phase 98; automatische Wahl plus Diagnose reicht.
