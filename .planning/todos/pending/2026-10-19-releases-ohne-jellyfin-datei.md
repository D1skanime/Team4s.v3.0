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
