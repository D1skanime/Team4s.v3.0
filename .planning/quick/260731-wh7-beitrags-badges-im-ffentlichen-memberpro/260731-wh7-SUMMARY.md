---
phase: quick-260731-wh7
plan: 01
subsystem: public-member-profile
tags: [badges, carousel, artwork, progress, accessibility, openapi, linux-uat]
status: complete
completed: 2026-08-01
---

# Quick 260731-wh7 Summary

Das öffentliche Memberprofil besitzt jetzt eine vollständige, visuell geprüfte Auszeichnungsdarstellung mit großen Anime-Medaillen, serverberechnetem Fortschritt und einem responsiven Focal Carousel.

## Umgesetzt

- Sechs getrennte Karussellgruppen: Fansubrollen, Fortschritt, Punkte-Meilensteine, Beiträge, Mitgliedschaft und besondere Auszeichnungen.
- Rollen-Badges verwenden getrennte Motiv-, Hintergrund-, Nebel- und Metallrahmen-Ebenen sowie gemeinsame Rollenfarb-Tokens.
- Bronze, Silber, Gold und Platin sind visuell unterscheidbar; Bronze ist bewusst kupferfarbener und Platin kühler gefärbt.
- Beitrags-Badges für mitgetragene Projekte, Chronikpflege und Bildarchivpflege verwenden jeweils eigenständige Bronze-, Silber- und Gold-Motive.
- Beitragsfortschritt stammt aus der bestehenden serverseitigen Berechnung und zeigt aktuellen Wert, nächstes Ziel und Restmenge. Gold endet mit „Höchste Stufe erreicht“.
- Fortschritts-, Punkte-, Mitgliedschafts- und Sonderauszeichnungen besitzen eigene Bildserien; 7- und 10-Jahre-Mitgliedschaft werden serverseitig vergeben.
- Nicht relevante Rollen werden im Profil nicht als unerreichbare Schlösser gezeigt.
- Aktuelle Projekte werden initial begrenzt geladen und können seitenweise nachgeladen werden.
- Das gemeinsame `FocalCarousel` unterstützt Buttons, Tastatur, Maus-Drag und Touch-Drag, zentriert die aktive Karte und lässt das letzte Element jeder Gruppe erreichen.
- Bildlose oder gesperrte Sonderauszeichnungen bleiben kompakt; Medaillen mit Artwork behalten ihre große Präsentation.
- Die öffentliche API, Go-Modelle, OpenAPI-Vertrag und TypeScript-Typen wurden zusammen erweitert.

## Bildassets

- Produktionsassets liegen unter `frontend/public/member-achievement-badges/`.
- Eingebunden sind ausschließlich freigegebene Endfassungen und die für das Vier-Ebenen-System benötigten Motive und Rahmen.
- Zwischenentwürfe bleiben außerhalb des Commits.

## Verifikation

- PASS: 75 fokussierte Frontend-Tests für Badge-Kette, Labels, Carousel, Beitragsfortschritt und Projekt-Nachladen.
- PASS: fokussierte Go-Tests für Repository, Badge-Service und Handler.
- PASS: ESLint und `git diff --check` im betroffenen Umfang.
- PASS: Next.js-Produktionsbuild im Linux-Docker-Stack.
- PASS: Live-UAT unter `/members/csubs-leader` auf Desktop, Tablet und Mobile.
- PASS: Kein horizontaler Seiten-Overflow und keine abgeschnittene aktive Karte.
- PASS: Letztes Element aller sechs Karussellgruppen per Navigation erreichbar.
- PASS: Linux-Frontend wurde erfolgreich neu gebaut und läuft im Compose-Stack.
- HINWEIS: Der vollständige Handler-Paketlauf im Backend-Container wird durch einen fremden Release-Review-Vertragstest blockiert, weil `/shared/contracts/openapi.yaml` dort nicht gemountet ist; die betroffenen Profil-, Repository- und Service-Prüfungen sind erfolgreich.

## Architektur und Entscheidungen

- Die vorhandenen Badge-, Profil-, API- und Carousel-Seams wurden erweitert; es wurde kein paralleles Badge-System eingeführt.
- Persistente Zähler und Schwellen bleiben serverseitig; das Frontend erfindet keine eigenen Grenzwerte.
- Das kanonische Entwicklungs- und Laufzeitsystem ist `/home/d1sk/team4s` auf `team4s-linux`; Docker Desktop und WSL unter Windows gehören nicht mehr zum Team4s-Workflow.

## Verbleibende Punkte

- Platin-Stufen für Beitrags-Badges werden erst festgelegt, wenn reale Nutzung zeigt, dass die aktuellen Gold-Schwellen regelmäßig erreicht werden.
- Temporäre Testdaten für die visuelle Badge-Abnahme können nach Abschluss der gesamten Badge-Arbeit separat zurückgesetzt werden.

## Self-Check: PASSED

Implementierung, Verträge, Tests, responsive Darstellung, Linux-Build und Live-Browser-UAT sind abgeschlossen.
