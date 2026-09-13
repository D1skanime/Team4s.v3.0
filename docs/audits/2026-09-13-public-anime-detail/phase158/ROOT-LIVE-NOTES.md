# Live-Nachtrag des Orchestrators

Stand: Produktcommit d0ae1f9b, 13.09.2026. Keine Human-UAT-Freigabe.

## Routing-Smoke

Nach 482a13d8 liefern GETs mit normaler Chrome-User-Agent-Kennung auf dem laufenden Linux-Frontend für 1abc, 1.5, 0, -1 und 999999999 jeweils HTTP 404, robots=noindex, keinen Canonical und den allgemeinen Titel Team4s v3.0. Dies ersetzt nicht die Produktionsfixtureprüfung.

## Laufzeitabweichung und Korrektur

Der erste geteilte Browsercheck nach d0ae1f9b zeigte trotz neuem Frontend weiter den numerischen Gruppenlink. Das direkte API-GET enthielt kein slug-Feld. Die geänderten Go-Quellen lagen bereits im Container; Air-Logs um 20:28 und 20:30 UTC zeigten doppelte running-Ereignisse und bind address already in use. /proc/1607/exe verwies auf /app/tmp/air/server (deleted). Dieser alte, verwaiste Prozess hielt Port 8092.

Nur der anhand seines Executablepfades verifizierte alte Childprozess wurde beendet. Ein einzelnes Air-Ereignis wurde über eine temporäre, verhaltenslose Go-Datei mit Inhalt package repository ausgelöst. Der anschließend von Air gestartete Server lieferte id=1 und slug=buddy-complex. Die eigene temporäre Datei wurde wieder entfernt. Container/PID1 blieben bestehen; kein Container-Neustart, Startup-/Migrationsbefehl, Seed oder Datenbankbefehl.

Für spätere Quellensynchronisierung: Änderungen seriell übertragen und anschließend API-Parität und Air-Portbesitzer prüfen. Reine Dateiparität belegt noch keinen erfolgreichen Runtime-Wechsel.

## Geteilter Live-Browser nach Runtime-Abgleich

Codex In-app Browser, Tab 2, anonym, /anime/1, Produktcommit d0ae1f9b. Der bestehende 30-Sekunden-Revalidatecache von getAnimeByID lieferte zunächst noch die alte Antwort; nach Aktualisierung erschien der Pretty-Link auch im Browser.

| Viewport | Dokument-/Bodybreite | Geschlossen | Geöffnet | Scrollversuch rechts |
|---|---:|---|---|---|
| 360 | 345 | PASS | PASS | scrollX=0 |
| 390 | 375 | PASS | PASS | scrollX=0 |
| 767 | 752 | PASS | PASS | scrollX=0 |
| 768 | 753 | PASS | PASS | scrollX=0 |
| 1440 | 1425 | PASS | PASS | scrollX=0 |

Die Differenz von 15 Pixeln ist die vertikale Browser-Scrollbar. Folge 1 Begegnung wurde in jedem Viewport über das sichtbare Control geöffnet und geschlossen. Berechnete Episode-Headerfarbe rgb(28,28,30), Kartenhintergrund rgb(255,255,255). Contributionüberschrift rgb(255,255,255), eigener Hintergrund transparent; nächster deckender Main-Hintergrund rgb(15,15,18). Keine globale Overflow-Änderung. Geometrie über lesende DOM-Abfragen, horizontaler Versuch über Browser-Scrollbedienung.

Sichtbarer Link Zum Gruppenbereich: /fansubs/new-subs/fansubprojekt/buddy-complex. Klick erreicht das Projekt Buddy Complex mit New-Subs und dessen Projektgeschichte. Die separat aufgerufene Compatibility-Route /anime/1/group/1 rendert dasselbe Projekt und enthält canonical=/fansubs/new-subs/fansubprojekt/buddy-complex. Die Pretty-Projektseite selbst besitzt bereits im Ausgangscode kein eigenes generateMetadata; beobachtet wurde daher dort kein self-canonical und der allgemeine Seitentitel. Dies ist keine Änderung dieses Auftrags. Der Anime hat den neuen Titel Buddy Complex | Team4s.

Desktop- und Mobile-Screenshots wurden im geteilten Browser angesehen. Der temporäre Viewport-Override wurde anschließend zurückgesetzt. Kein Login, Formularsubmit oder Watchlist-Schreibzugriff; keine Human-UAT-Freigabe. Persistierte maschinelle Screenshots und weitere Fokus-/Fixturechecks folgen in 158-04.
