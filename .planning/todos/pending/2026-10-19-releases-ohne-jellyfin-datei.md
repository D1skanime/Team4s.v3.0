---
created: 2026-10-19T00:00:00+00:00
title: Releases ohne Jellyfin-Datei anlegen können (belegt, aber nicht vorhanden)
area: admin-episode-import
files:
  - backend/internal/repository/episode_import_repository_apply.go
  - backend/internal/repository/episode_import_repository_release_helpers.go
  - backend/internal/handlers/admin_episode_import.go
---

## Nutzerwunsch (Auslöser: Phase 187, Antwort auf Frage 8, 2026-10-19)

Admins sollen einen Release (Anime/Episode/Gruppe/Version) anlegen können, bevor die eigentliche
Datei in Jellyfin vorliegt — der Release ist "belegt" (z. B. angekündigt, in Arbeit), aber ohne
Datei-Zuordnung. Landet die Datei später in Jellyfin, muss der Episoden-Import sie dem
BESTEHENDEN Release zuordnen können, statt ein Duplikat anzulegen.

## Pflicht-Anforderung

Der spätere Episoden-Import muss eine Datei an ein vorhandenes dateiloses Release hängen können
(Wiedererkennung über Anime/Episode/Gruppe/Version), **ohne** Medien, Crew oder Notizen zu
verlieren und **ohne** Duplikat anzulegen.

## Zusammenhang mit Phase 187

Phase 187 (`.planning/phases/187-gruppenwechsel-bei-bestehenden-releases-release-versions-rel/187-CONTEXT.md`,
D-12) legt dafür bereits die Grundlage: der neue Gruppenwechsel-Guard sperrt beim Import
ausdrücklich nur das ENTFERNEN/ERSETZEN einer belasteten Gruppe, nicht das Aktualisieren eines
bestehenden Releases mit derselben Gruppe — genau der Fall, der hier gebraucht wird.

Phase 187 prüft außerdem (Prüfauftrag, kein Umbau) als Befund, ob der Import ein bestehendes
Release heute zuverlässig wiedererkennt (gleiches Anime, Episode, Gruppe, Version) statt ein
Duplikat anzulegen. Dieser Befund ist die Grundlage für die Planung dieses Todos.

## Wann

Später, eigenes Feature. Erst nach Phase 187 (inkl. deren Wiedererkennungs-Befund) sinnvoll
planbar.

## Weitere konkrete Blocker (Befund aus Phase 187, Plan 08, Live-UAT-Vorbereitung 2026-10-19)

Bei der Testdaten-Vorbereitung für Plan 08s Live-Checkpoint (zwei dateilose Test-Releases ohne
`release_variants`) sind zwei konkrete, bereits heute bestehende Blocker aufgefallen, die dieses
Feature direkt angehen müsste:

1. **`EpisodeVersionRepository.GetByID`** (`backend/internal/repository/episode_version_repository.go`)
   ist mit `FROM release_variants rv JOIN release_versions rev ON ...` auf `release_variants` als
   Ankertabelle aufgebaut (INNER JOIN). Eine `release_version` ohne jede `release_variants`-Zeile
   liefert dadurch null Zeilen, was der Admin-Editor-Endpunkt
   (`GET /api/v1/admin/episode-versions/:versionId/editor-context`) als `404 "episodenversion nicht
   gefunden"` interpretiert — der Editor ist für ein dateiloses Release also aktuell gar nicht
   erreichbar. Live reproduziert: zwei frisch angelegte Test-`release_versions` ohne
   `release_variants`-Zeile ergaben exakt diesen 404, bis probeweise je eine `release_variants`-Zeile
   ergänzt wurde.
2. **`useEpisodeVersionEditor.ts`s `handleSave`** (Frontend) verlangt vor jedem nicht-reinen-
   Metadaten-Speichern (`!metadataOnly`) zwingend sowohl `media_provider` als auch `media_item_id`
   (`if (!metadataOnly && (!formState.mediaProvider.trim() || !formState.mediaItemID.trim())) { ...
   return }`) — sonst erscheint die Fehlermeldung "Bitte zuerst eine Mediendatei aus dem Ordner
   wählen oder den Advanced-Bereich ausfüllen." und das Speichern (inkl. reiner Gruppenänderungen)
   wird abgebrochen. Ein dateiloses Release hat per Definition noch kein `media_item_id` — auch
   dieser Pfad müsste für "Releases ohne Jellyfin-Datei" eine datei-lose Variante erlauben. Live
   reproduziert: ein Speichern (Gruppe hinzufügen/entfernen) auf einem Test-Release ohne
   `release_streams`/`stream_sources`-Bindung scheiterte clientseitig an genau dieser Prüfung, bis
   probeweise eine `release_streams`/`stream_sources`-Zeile ergänzt wurde.

Beide Befunde sind reine Beobachtungen aus der Testdaten-Vorbereitung, keine Umsetzung — die
eigentliche Lösung (datei-lose Releases erlauben, inkl. Wiedererkennung beim späteren Import) bleibt
Teil der eigentlichen Planung dieses Todos.
