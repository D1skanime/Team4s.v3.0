# Live-Nachtrag des Orchestrators

Stand: Produktcommit d0ae1f9b, 13.09.2026. Keine Human-UAT-Freigabe.

## Routing-Smoke

Nach 482a13d8 liefern GETs mit normaler Chrome-User-Agent-Kennung auf dem laufenden Linux-Frontend für 1abc, 1.5, 0, -1 und 999999999 jeweils HTTP 404, robots=noindex, keinen Canonical und den allgemeinen Titel Team4s v3.0. Dies ersetzt nicht die Produktionsfixtureprüfung.

## Laufzeitabweichung und Korrektur

Der erste geteilte Browsercheck nach d0ae1f9b zeigte trotz neuem Frontend weiter den numerischen Gruppenlink. Das direkte API-GET enthielt kein slug-Feld. Die geänderten Go-Quellen lagen bereits im Container; Air-Logs um 20:28 und 20:30 UTC zeigten doppelte running-Ereignisse und bind address already in use. /proc/1607/exe verwies auf /app/tmp/air/server (deleted). Dieser alte, verwaiste Prozess hielt Port 8092.

Nur der anhand seines Executablepfades verifizierte alte Childprozess wurde beendet. Ein einzelnes Air-Ereignis wurde über eine temporäre, verhaltenslose Go-Datei mit Inhalt package repository ausgelöst. Der anschließend von Air gestartete Server lieferte id=1 und slug=buddy-complex. Die eigene temporäre Datei wurde wieder entfernt. Container/PID1 blieben bestehen; kein Container-Neustart, Startup-/Migrationsbefehl, Seed oder Datenbankbefehl.

Für spätere Quellensynchronisierung: Änderungen seriell übertragen und anschließend API-Parität und Air-Portbesitzer prüfen. Reine Dateiparität belegt noch keinen erfolgreichen Runtime-Wechsel.
