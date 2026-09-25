# Quick Task 260925-cyu: Episode-Import Vorschau automatisch laden und redundante Quellenkarte entfernen

## Goal

Die Import-Mapping-Seite zeigt nach dem Öffnen direkt eine Vorschau, ohne dieselbe AniSearch-ID und den Season Offset erneut in einer Zwischenkarte konfigurieren zu müssen.

## Plan

1. Den bestehenden Import-Builder nach dem Kontext-Laden automatisch mit der kanonischen AniSearch-ID und dem Haupt-Jellyfin-Ordner die Vorschau laden lassen.
2. Die redundante Quellen-Konfigurationskarte aus page.tsx entfernen; Mehrordner-Auswahl bleibt außerhalb dieser Karte erhalten und lädt bei Wechsel automatisch neu.
3. Die Kontextzeile auf AniSearch ID, Jellyfin-Serien-ID und Ordnerpfad reduzieren und die kleine ID nicht mehr als gleich breite große Karte darstellen.
4. Hook-/Layout-Tests ergänzen oder anpassen und TypeScript sowie relevante Vitest-Tests ausführen.

## Must-Haves

- Öffnen der Import-Mapping-Seite löst genau eine automatische Vorschau für den Standardordner aus.
- Der Benutzer muss nicht erneut „Vorschau laden“ klicken.
- AniSearch-ID und Season Offset werden nicht doppelt als Konfigurationskarte angezeigt.
- Mehrere Jellyfin-Ordner bleiben auswählbar.
- jellyfin:<id> wird nicht zusätzlich zur Jellyfin-Serien-ID angezeigt.
- Keine Änderung an Release-/Fansub-Quellen oder an der späteren server_key-Mehrserver-Architektur.
