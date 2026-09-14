# Galerie: UI-Spezifikation und Wiederverwendung

## Befund vor Änderung
Das vorhandene Grid nutzt `repeat(auto-fill, minmax(160px, 1fr))`. Karten und ihre Öffner besitzen implizite Gridzeilen, die bei langen Geschwistertexten wachsen. Der generische Selektor `button:last-child` erfasst außerdem Karten ohne Vorschauaktion und versieht deren Öffner mit Aktionsrändern. Es existiert bereits ein 4:3-Wunsch, intrinsische Bilder und gestreckte Gridzeilen setzen ihn aber nicht zuverlässig durch.

## Verbindliche Umsetzung
- Reihenfolge bleibt: Kategorie-Uploadaktionen, Überschrift mit Gesamtanzahl, vollständige Galerie. Keine neuen Uploadaktionen, Requests oder fachlichen Zustände.
- `section` wird benannter Inline-Size-Container. Zwei Spalten bleiben die schmale Basis, auch im schmal eingebetteten Desktopkontext. Drei Spalten erst ab 44rem (3 × 14rem Karten + 2 × 0.75rem Abstand passen); vier ab 59rem (4 × 14rem + 3 × 0.75rem). Maximal vier Spalten. Damit reagieren die Karten auf verfügbare Fläche statt Viewportannahmen.
- Die bestehenden Kategorieaktionen wechseln erst ab ausreichender Breite von zwei zu vier Spalten. Schmale Padding- und Schriftwerte bleiben im Basislayout.
- Karten verwenden vertikales Flexlayout mit oberhalb ausgerichtetem Inhalt. Der Medienrahmen ist ein nicht wachsendes 4:3-Element, das Bild absolut eingepasst (`object-fit: cover`). Vollständige Ansicht bleibt im vorhandenen Drawer.
- Titel maximal zwei, Beschreibung maximal drei Zeilen. Volle Originalstrings bleiben im vorhandenen Titel-/Beschreibungsfeld des Detaildrawers. Kein Datenabschneiden.
- Kategorie, Status, Vorschaubadge und Aktivitätsdatum dürfen lokal umbrechen. Vorschaubadge begrenzt auf Bildbreite. Keine globale Umbruch-/Overflowkorrektur.
- Vorschauaktion erhält eine eigene Klasse und nutzt bestehenden Button in Größe sm. Kompakte Eigenhöhe, `margin-top: auto`, keine implizite gestreckte Gridzeile. Karten ohne Aktion haben keine künstlichen Aktionsabstände.
- Bestehende Tokens, Cardflächen, Badge, Button, Input, Textarea und Drawer werden weitergenutzt; keine neue Primitive oder Farbregistry.

## Prüfplan
Gezielte bestehende Komponententests plus langer Titel/Text im unveränderten Detaildrawer, alle 11 gemischten Medien und Vorschauaktionen nur für berechtigte Kategorien. Browserfixtures bei 390/768/1440 und den Containerübergängen prüfen 2/3/4 Spalten, tatsächliches 4:3, 2/3 Textzeilen, kompakte Aktionen, Umbruch, Root-Overflow sowie schmale Einbettung und Zoom-Äquivalent. Keine Live-Datenschreibvorgänge.

## Ergebnisse
- Komponententest: **38/38 PASS** (`gallery-tests.log`). Zwei gezielte Fälle prüfen lange Originaltexte im vorhandenen Detaildrawer ohne Neuladen und elf gemischte Medien mit genau den erlaubten Vorschauaktionen. Bestehende Upload-, Retry-, Berechtigungs- und Replace-Tests bleiben enthalten. Der ersetzte CSS-Stringtest war auf das fehlerhafte `button:last-child`-Pattern und alte Viewportquery festgelegt; tatsächliche Geometrie wird jetzt im Browser belegt.
- ESLint nur Galerie-TSX/Test: **0 Fehler, 7 bestehende Warnungen** (`gallery-lint.log`), betrifft vorhandenes `persistedItems`-Memo, `<img>`-Verwendung und native Datei-/Checkboxinputs. Diese Seams wurden nicht neu eingeführt. Der Testlauf enthält bereits übliche React-act-Warnungen aus dem vorhandenen internen Hook.
- **10 Browserfälle PASS**, elf Medien je Fall, 110 tatsächliche 4:3-Rahmen; pro Karte maximal zwei Titel-/drei Beschreibungszeilen; Metadaten ohne horizontalen Textüberlauf; kompakte Aktionen. Keine fachlichen Schreibrequests, keine zusätzlichen Medienrequests bei Detailöffnung, keine JS-Fehler. Bestehender fehlender-Bild-Fallback und Readonlyrechte ebenfalls geprüft.
- Screenshots bei 390/768/1440 visuell inspiziert: breite ruhige Reihen, einheitliche Bildflächen, begrenzte Texte, kompakte Buttons; Zweispaltenanordnung im schmalen Layout bleibt. Reihen sind weiterhin gleich hoch; kurze Texte erhalten lediglich den bis zum gemeinsamen Aktionsfuß nötigen Restabstand, Bilder und Buttons wachsen dabei nicht mit.

| Fall | Viewport | Effektiver Container | Spalten | Maximale Aktionshöhe | Status |
|---|---|---|---|---|---|
| 390 | 390×844 | 324 px | 2 | 36.0 px | PASS |
| 768 | 768×1024 | 690 px | 2 | 36.0 px | PASS |
| 1440 | 1440×900 | 1138 px | 4 | 36.0 px | PASS |
| three-below | 1440×900 | 703 px | 2 | 36.0 px | PASS |
| three-at | 1440×900 | 704 px | 3 | 36.0 px | PASS |
| four-below | 1440×900 | 943 px | 3 | 36.0 px | PASS |
| four-at | 1440×900 | 944 px | 4 | 36.0 px | PASS |
| embedded | 1440×900 | 340 px | 2 | 36.0 px | PASS |
| zoom-200 | 1440×900 | 626 px | 2 | 36.0 px | PASS |
| readonly | 768×1024 | 690 px | 2 | — px | PASS |

### Zoom- und UAT-Grenze
`zoom-200` setzt CSS-zoom auf 2 und prüft die Galerie-Reflowgeometrie. Dies ist ausdrücklich kein nativer Browser-Chrome-Zoom. Unter CSS-Zoom emuliert der bestehende globale Fixed-Drawer nicht die native Zoomposition (Schließen liegt außerhalb des Viewports); dieser fachfremde Drawer wurde nicht geändert. Deshalb gilt die Detailinteraktion für die neun ungezoomten Fälle, die vollständigen Texte wurden dort über Tastatur/Tap und das vorhandene Schließen geprüft. Eine echte native Browserzoomprüfung und die angemeldete Live-Sichtprüfung übernimmt der Orchestrator beziehungsweise bleibt Human-UAT; kein UAT-Signoff durch diese Fixtures.

### Unveränderte Grenzen
Keine Upload-/Preview-API, Authlogik, DTOs, Datenbank, Media-Ownership oder Produktrechte geändert. Kein Speichern auf Live-Daten. Typecheck, globaler Lint und Build werden vom Orchestrator gesammelt und seriell ausgeführt. `git diff --check` nach Galerieänderung: PASS.
