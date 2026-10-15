# Agent-Richtlinien: UI-Implementierung

Detaillierte Regeln für Agenten bei UI-Aufgaben. Werden nur bei visuellen Implementierungsaufgaben angewendet.

---

## Vor dem Programmieren von UI

Vor der Implementierung einer neuen UI-Oberfläche oder der Bearbeitung einer bestehenden, persistenzgestützten UI:

1. Lies `docs/engineering/implementation-contract.md`.
2. Lies `docs/frontend/ui-system.md`.
3. Prüfe `frontend/src/components/ui` auf bestehende globale Komponenten.
4. Prüfe benachbarte Seiten/Komponenten auf das aktuelle lokale Kompositionsmuster.
5. Ordne jedes API-/DB-gestützte Feld einem semantischen Control zu, bevor Code geschrieben wird.
6. Nutze oder erweitere bestehende globale Komponenten, bevor seitenlokale Styles ergänzt werden.
7. Halte Lade-, Fehler- und Leerzustände auf die bearbeitete bzw. angezeigte Entität begrenzt.
8. Wenn die UI von der API-Response-Form oder dem Status-Verhalten abhängt, lies vor dem Programmieren `docs/api/api-contracts.md` und den zuständigen Frontend-API-Helper.
9. Klassifiziere jede Responsive-Layout-Entscheidung gemäß `docs/frontend/ui-system.md` als entweder Seite/App-Shell oder wiederverwendbar/eingebettet, bevor eine Viewport- oder Container-Query gewählt wird.
10. Halte für jede größere Komposition die minimal tragfähige Geometrie fest — inklusive Spalten, Abstände, Controls, Medien und längstem benötigtem Inhalt. Benenne Übergänge nach Zweck oder Geometrie, niemals nach Gerät.
11. Prüfe den tatsächlichen Flex-, Grid-, Medien- oder Text-Besitzer eines Überlaufs, bevor Wrapping, Clipping oder Scrolling ergänzt wird.
12. Wende die inkrementelle Migrationsgrenze an: Neue UI folgt den Regeln vollständig; angefasste bestehende Komponenten werden nur modernisiert, wenn Responsive-Verhalten im Scope ist oder nachweislich problematisch ist; stabile Legacy-UI wird nicht pauschal migriert.

Erforderliche Feldzuordnung:

| Feldbedeutung | Erforderliche Control-Richtung |
|---------------|----------------------------|
| Jahr | Jahres-Picker oder eingeschränktes Jahres-Control |
| Datum/Datum-Zeit | Datum- oder Datum-Zeit-Control |
| Enum/Status | Select, Segmented Control, Radio-Gruppe oder Badge/Aktions-Muster |
| Boolean | Switch oder Checkbox |
| Relations-ID | Select/Combobox mit lesbaren Labels |
| Medien-Asset | bestehende Medien-Komponente und domänenspezifische Medien-API |
| Zahl | eingeschränktes Zahlen-Input, Stepper, Slider oder Select |
| Freitext | Input oder Textarea nur, wenn der Wert wirklich frei formulierbar ist |

Liefere keine minimalistische Platzhalter-UI für real persistierte Daten aus. Existiert das passende semantische Control nicht, nutze entweder ein bestehendes Projektmuster oder ergänze das kleinste gemeinsame Primitive, das zum globalen UI-System passt.

---

## Responsive Implementierung und Verifikation

Die Implementierung folgt der in `docs/frontend/ui-system.md` definierten Responsive-Zuständigkeit:

- Nutze Mobile-First-Basisstyles.
- Nutze Viewport-Queries nur für Seiten- oder App-Shell-Komposition.
- Richte für wiederverwendbare oder eingebettete Komponenten eine geeignete Containment-Grenze mit `container-type: inline-size` ein und frage die verfügbare Inline-Größe der Komponente ab. Nutze einen zweckbezogenen `container-name`, wenn das die Klarheit verbessert.
- Aktiviere eine größere Komposition erst bei ihrer festgehaltenen minimal tragfähigen Geometrie. Verwende keine Gerätelisten oder universellen Pixel-Breakpoints.
- Schütze schrumpfende Flex-/Grid-Kinder mit `min-width: 0` und potenziell übergroße Medien mit `max-width: 100%`, wo zutreffend.
- Behebe Überlauf lokal an seinem Besitzer. Normiere keinen globalen `overflow-wrap: anywhere`-Workaround.

Für jede geänderte UI muss der Verifikationsnachweis Folgendes abdecken:

1. Eine schmale Größe.
2. Eine mittlere Größe.
3. Die exakte Übergangsgrenze, wenn praktikabel unmittelbar darunter und darüber.
4. Eine breite Größe.
5. Realistische lange deutsche Labels und Texte mit korrekten Umlauten.
6. Browser-Zoom hoch genug, um Reflow-, Überlappungs- und Clipping-Fehler aufzudecken.
7. Eine explizite Assertion oder Live-Prüfung, dass das Dokument keinen horizontalen Überlauf hat.
8. Für wiederverwendbare Komponenten ein verschachteltes oder eingebettetes Rendering, das belegt, dass das Verhalten der Container-Breite folgt und nicht Viewport-Annahmen.

Fokussierte CSS-/Komponententests und Headless-Checks können diesen Nachweis unterstützen. Wenn Nutzerfluss, Navigation, Auffindbarkeit oder Produkt-Passung relevant sind, bleibt die von `AGENTS.md` geforderte Live-Browser-Prüfung verbindlich; Headless-Checks ersetzen sie nicht.

---

## Screenshot-zu-UI-Regeln

Bei der Implementierung anhand eines Screenshots:

1. Behandle den Screenshot als Zielvorgabe, nicht als lose Inspiration.
2. Extrahiere zuerst eine visuelle Design-Spezifikation:
   - Layout
   - Card-Struktur
   - Farben
   - Abstände
   - Typografie
   - Ränder, Radius, Schatten
   - Buttons und Badges
3. Implementiere anschließend gegen diese Spezifikation.
4. Redesigne nicht frei, außer es wird explizit verlangt.
5. Füge keine sichtbaren UI-Elemente hinzu, die im Ziel nicht vorhanden sind, außer sie sind durch bestehende Daten oder Barrierefreiheit erforderlich.
6. Vergleiche das Ergebnis wenn möglich visuell und liste Abweichungen auf.

---

## Formatierungs- und Diff-Regeln

- Halte Diffs klein und fokussiert.
- Führe keine breiten Formatierungs-Befehle auf großen, bereits veränderten Dateien aus, außer es wird explizit verlangt.
- Wenn eine Datei bereits unabhängige Formatierungsänderungen enthält, vermeide `prettier --write` auf der gesamten Datei.
- Bevorzuge gezielte Edits.
- Nimm keine unabhängigen Refactorings mit auf.
- Dokumentiere bestehende unabhängige Warnungen/Fehler separat.
