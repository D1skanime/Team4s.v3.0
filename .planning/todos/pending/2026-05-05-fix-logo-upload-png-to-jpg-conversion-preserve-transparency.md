---
created: 2026-05-05T10:46:22.753Z
title: Fix logo upload PNG to JPG conversion preserve transparency
area: api
files:
  - backend/internal/handlers/
  - backend/internal/services/media_service.go
---

## Problem

Beim Logo-Upload und beim Crawlen von zulässigen Webseiten wird ein PNG mit Overlay (transparentem Hintergrund) fälschlicherweise in JPG umgewandelt. JPG unterstützt keine Transparenz, wodurch der transparente Hintergrund verloren geht und durch eine Volltonfarbe (meist Weiß oder Schwarz) ersetzt wird.

Das betrifft zwei Eingangswege:
1. Manueller Logo-Upload im Admin-Bereich
2. Automatisches Crawlen/Importieren von Logos von zulässigen Webseiten

Erwartet wird: Die originale Quelldatei (PNG mit Transparenz) bleibt erhalten. Es darf kein Format-Downgrade auf JPG stattfinden, wenn die Quelle ein PNG ist.

## Solution

- Bei Logo-Upload und Crawl-Import das Quellformat beibehalten: wenn PNG rein, dann PNG raus
- MIME-Type der Quelldatei prüfen und als Ausgabeformat verwenden, anstatt pauschal JPG zu erzwingen
- Konvertierungslogik in `media_service.go` oder dem zuständigen Handler überprüfen und anpassen
- Sicherstellen, dass PNG-Logos mit Alphakanal (Transparenz) verlustfrei gespeichert werden
