# Phase 97 UAT-Follow-up: Mitglied hinzufügen - Datums-Picker & Formular-Fixes

**Captured:** 2026-07-01
**Source:** Human UAT after Phase 97 closeout
**Status:** Follow-up Auftrag, not yet implemented as full calendar picker

## Problem

Das Modal "Mitglied hinzufügen" für historische Mitglieder ist funktional näher am Ziel, aber noch nicht UX-stabil genug:

- Datumsfelder dürfen nicht als Freitext oder Browser-native Datumsauswahl wirken.
- Der aktuelle Zwischenstand mit Select-Feldern ist besser als `input type=date`, erfüllt aber noch nicht den gewünschten Team4s-Kalender.
- Speichern muss klar an Anzeigename + mindestens eine Rolle gekoppelt sein.
- Rollen müssen als historische Rollen verstanden werden: ohne Login/Claim keine aktiven App-Rechte.
- "Leeren" und "Entfernen" müssen als echte Aktionen erkennbar sein.
- Mobile darf nichts abschneiden oder quer scrollen.

## Anforderungen

1. **Speichern-Button**
   - Deaktiviert, solange Anzeigename oder mindestens eine Rolle fehlt.
   - Aktiver Zustand klar grün und kontrastreich.
   - Deaktivierter Zustand optisch klar unterscheidbar mit `cursor: not-allowed`.

2. **Rollen-Karte**
   - Rollen bleiben innerhalb der Karte "Frühere Funktionen".
   - Button-Label: "Weitere Rolle hinzufügen".
   - "Entfernen" ist bei genau einer Rolle deaktiviert, ab der zweiten Rolle aktiv und rot/destruktiv.

3. **Eigener Datums-Picker**
   - Kein `input type="date"` und keine OS-/Browser-native Kalenderlogik.
   - Trigger zeigt `TT.MM.JJJJ`, gesetzte Werte ebenfalls `TT.MM.JJJJ`.
   - Tagesansicht mit Monatsgrid Mo-So, Wochenende hervorgehoben, heute gerahmt, Auswahl navy.
   - Monatsansicht als 3x4-Grid.
   - Jahresansicht mit 12 Jahren je Dekade und Dekadennavigation.
   - Auswahlfluss: Jahr -> Monat -> Tag -> schließt und übernimmt Wert.
   - Footer-Aktionen: "Heute" und "Leeren".
   - Mobile und Desktop identisches Verhalten.

4. **Jahresgrenze**
   - Für historische Fansub-Mitglieder fachlich auf Anime-/TV-Kontext begrenzen.
   - Aktueller UAT-Entscheid: Untergrenze 1960, Obergrenze aktuelles Jahr.
   - Falls später gruppenspezifisches Gründungsdatum zuverlässig verfügbar ist, kann die Untergrenze pro Gruppe weiter eingeschränkt werden.

5. **Panel-Positionierung**
   - Beim Öffnen Feld in den sichtbaren Modalbereich scrollen.
   - Wenn unten zu wenig Platz ist, Panel nach oben öffnen.
   - Panel hat `max-height` und eigenen Scroll-Fallback.

6. **Sichtbarkeit**
   - Sichtbarkeit bleibt Dropdown und muss klar als Dropdown erkennbar sein.

## Akzeptanzkriterien

- [ ] Speichern ist nur mit Anzeigename + mindestens einer Rolle aktiv.
- [ ] Rollen-Entfernen ist bei nur einer Rolle deaktiviert und ab zwei Rollen rot/aktiv.
- [ ] Datumsfelder nutzen den Team4s-Kalender-Picker ohne native Date-/Select-UI.
- [ ] Jahr, Monat und Tag können direkt gewählt werden.
- [ ] Picker wird im Modal nicht abgeschnitten.
- [ ] "Leeren" ist klar als Aktion erkennbar und synchronisiert Trigger/Footer.
- [ ] Sichtbarkeit ist eindeutig als Dropdown sichtbar.
- [ ] Mobile <= 390px und Desktop geprüft, ohne Überlappung/Horizontal-Scroll.

## Nicht Teil Dieses Follow-ups

- Keine Backend-/API-Strukturänderung.
- Keine Änderung der Rollen-Zeitraum-Datenstruktur.
- Keine neuen Design-Tokens oder Frameworks.
- Keine Mehrfachauswahl in einer einzelnen Rollenzeile.

