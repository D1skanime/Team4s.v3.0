---
status: testing
phase: 17-anime-create-ux-ui-follow-through
source: [17-01-SUMMARY.md, 17-02-SUMMARY.md, 17-03-SUMMARY.md, 17-04-SUMMARY.md, 17-05-SUMMARY.md]
started: 2026-04-17T09:45:00Z
updated: 2026-04-17T10:10:00Z
---

## Current Test

[testing paused — asset section issue logged, proceeding to diagnosis]

## Tests

### 1. Stepper-Navigation sichtbar
expected: Öffne /admin/anime/create. Direkt unter dem Header erscheint eine horizontale 4-Schritt-Navigation mit den Labels "Anime finden", "Assets", "Details", "Prüfen & Anlegen". Schritt 1 ist aktiv (lila Nummer/Text).
result: pass

### 2. Kein StatusBar mehr im Header
expected: Der Header zeigt nur Titel "Anime erstellen" und den Intro-Text "Schritt für Schritt zum perfekten Ergebnis." — keine farbigen Status-Pills mehr sichtbar.
result: pass

### 3. Vier Sektionen mit Überschriften
expected: Die Seite ist in vier benannte Abschnitte gegliedert mit nummeriertem lila Kreis, Titel und Unterzeile.
result: pass

### 4. Provider-Grid — AniSearch und Jellyfin nebeneinander
expected: In Section 1 erscheinen AniSearch und Jellyfin als zwei Cards nebeneinander. AniSearch-Card trägt "Basisdaten und eindeutige ID".
result: pass

### 5. AniSearch-Copy: temporale Sprache
expected: Status-Bereich zeigt "AniSearch-Status" und Meldung enthält "Wird beim Erstellen übernommen".
result: pass

### 6. Jellyfin-Card mit explizitem Übernehmen-Gate
expected: Jellyfin-Card mit Suchfeld, "Scannen"-Button, grüner Adopt-Bar mit "Jellyfin übernehmen" und "Auswahl verwerfen".
result: pass

### 7. Unified Asset Section (Section 2)
expected: Section 2 zeigt alle Asset-Slots in einer einheitlichen, logischen Karte/Panel. Jeder Slot (Cover, Banner, Logo, Hintergründe, Background-Video) zeigt: Vorschaubild mit korrekter Quelle (Source-Badge direkt am Bild), Bearbeiten-Button (Stift, öffnet Online-Suche oder manuellen Upload), Löschen-Button (Papierkorb, entfernt Asset bzw. markiert Jellyfin-Asset als nicht verwendet). Kein "Jellyfin erneut scannen"-Button in Section 2 (gehört auf Edit-Seite).
result: issue
reported: "Die Asset-Darstellung stimmt nicht mit dem Referenzbild überein. Aktuelle Umsetzung zeigt lose Einzelkarten mit unterschiedlichen Proportionen die alles verzerren. Referenz zeigt eine saubere einheitliche logische Card/Panel. Jeder Slot hat klar beschriftete Quelle, Bearbeiten-Button (Stift) für Online-Suche/Upload, Papierkorb-Button. Jellyfin erneut scannen gehört nicht auf die Create-Seite."
severity: major

### 8. Review Section (Section 4) mit Checkliste
expected: Section 4 zeigt Bereitschafts-Checkliste mit Fehlend-Box.
result: [pending]

### 9. "Anime erstellen"-CTA gesperrt ohne Titel und Cover
expected: Button "Anime erstellen" deaktiviert bis Titel und Cover gesetzt.
result: [pending]

## Summary

total: 9
passed: 6
issues: 1
pending: 2
skipped: 0
blocked: 0

## Gaps

- truth: "Section 2 zeigt alle Asset-Slots in einer einheitlichen logischen Karte/Panel. Jeder Slot hat Source-Badge direkt am Bild, Bearbeiten-Button (Stift) für Online-Suche oder manuellen Upload, Papierkorb-Button zum Löschen bzw. Jellyfin-Asset deaktivieren. Kein 'Jellyfin erneut scannen'-Button in Section 2."
  status: failed
  reason: "User reported: Lose Einzelkarten mit falschen Proportionen (alle 3:4), kein einheitliches Panel. Fehlende Bearbeiten/Papierkorb-Aktionen pro Slot. 'Jellyfin erneut scannen'-Button fälschlicherweise in Section 2 (gehört auf Edit-Seite)."
  severity: major
  test: 7
  artifacts: []
  missing:
    - Einheitliches Asset-Panel statt loser Einzelkarten
    - Korrekte Seitenverhältnisse pro Slot (Cover Portrait, Banner Landscape)
    - Bearbeiten-Button (Stift/Pencil) pro Slot
    - Papierkorb-Button pro Slot
    - Entfernung von "Jellyfin erneut scannen" aus Section 2
