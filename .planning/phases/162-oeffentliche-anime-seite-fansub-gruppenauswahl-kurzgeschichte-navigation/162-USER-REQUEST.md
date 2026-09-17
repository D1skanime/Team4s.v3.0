# Phase 162 – Auftrag des Auftraggebers (wörtlich, 2026-09-17)

> Verbindliche Quelle. Präzisierungen und Auflösungen offener Punkte stehen in `162-CONTEXT.md` (D-01 ff.) und haben bei Widerspruch Vorrang.

## Phase 162 – Öffentliche Anime-Seite: Fansub-Gruppenauswahl, Kurzgeschichte und Navigation

### Ausgangslage

Arbeite auf dem aktuellen Stand des Team4s-Repositories auf der VM.

Betroffene öffentliche Seite: `/anime/[id]`

Auf der öffentlichen Anime-Seite erscheinen aktuell mehrere Elemente mit Fansub-Gruppennamen, deren Funktion für den Benutzer nicht eindeutig ist. Je nach Datenlage existieren beispielsweise:

- Gruppen-Chips / Buttons,
- nochmals auswählbare Gruppenelemente,
- eine gruppenspezifische Fläche,
- ein Button „Gruppenbereich“,
- ein Projekt-Absprung.

Dadurch ist nicht klar: was eine Auswahl ist, was zur Fansub-Gruppe führt, was zum Projekt dieser Gruppe führt, welche Gruppe aktuell aktiv ist.

### Ziel

Der Fansub-Bereich oberhalb der eigentlichen Inhalte soll klar und eindeutig aufgebaut werden. Er soll drei Aufgaben erfüllen:

1. Fansub-Gruppe auswählen
2. bei konkreter Gruppe einen kurzen Einblick in die Gruppe zeigen
3. eindeutig zur Fansub-Gruppe bzw. zum Projekt dieser Gruppe navigieren

Keine mehrfachen Gruppennamen mit unterschiedlichen, unklaren Funktionen.

### 1. Darstellung abhängig von der Anzahl der Gruppen

**Keine Gruppe:** Wenn für den Anime keine öffentliche Fansub-Gruppe vorhanden ist: keinen Gruppenbereich anzeigen, keine leeren Platzhalter anzeigen.

**Genau eine Gruppe:** KEIN „Alle“-Chip, die einzige Gruppe ist automatisch aktiv.

```
Fansub-Gruppe

[ Logo  Bloody-Shadow ]

Bloody-Shadow
[ca. drei Zeilen Geschichte ...]
Mehr lesen →
[ Zur Fansub-Gruppe ] [ Zum Projekt ]
```

Der Benutzer muss die einzige vorhandene Gruppe nicht erst auswählen.

**Zwei oder mehr Gruppen:**

```
Fansub-Gruppe
[ Alle ] [ Logo Bloody-Shadow ] [ Logo FlameHaze-subs ] [...]
```

Standardauswahl: Alle. „Alle“ existiert nur, wenn mindestens zwei Gruppen vorhanden sind.

### 2. Gruppen-Auswahl als moderne Filter-Chips

Kompakte moderne Filter-Chips.

**Logo:** Wenn eine Gruppe ein Logo besitzt: kleines Logo links im Chip, ungefähr 20 px, vorhandene Logoquelle verwenden, keine parallele Logo-Datenstruktur einführen. Wenn kein Logo vorhanden ist: nur Gruppenname anzeigen, kein Dummy-Icon, kein leerer Platzhalter.

**Aktiver Zustand:** Der aktive Chip muss klar erkennbar sein, nicht nur über Farbe. Verwenden: Hintergrund, Rahmen und/oder vorhandene Active-State-Tokens, sichtbaren Keyboard-Fokus. Keinen übertriebenen Primary-CTA-Stil verwenden.

**Responsive:** Desktop: Chips nebeneinander. Mobile: Chips sauber umbrechen. Bevorzugt Wrap statt einer verpflichtenden horizontalen Scrollleiste. Lange Gruppennamen dürfen das Layout nicht sprengen.

### 3. Semantik der Chips

Die Chips dienen ausschließlich der Auswahl des Fansub-Kontexts. Ein Klick auf „Bloody-Shadow“ navigiert NICHT auf die Fansub-Seite, er wählt Bloody-Shadow als aktiven Kontext. Die Navigation erfolgt ausschließlich über eindeutig beschriftete Links / Buttons im gruppenspezifischen Bereich.

### 4. Verhalten bei „Alle“

Wenn bei mehreren Gruppen „Alle“ aktiv ist, gibt es keinen eindeutigen Gruppen-Kontext. Deshalb vollständig ausblenden: Fansub-Geschichte, „Mehr lesen“, „Zur Fansub-Gruppe“, „Zum Projekt“. Die Elemente nicht disabled anzeigen, sondern gar nicht rendern.

### 5. Verhalten bei konkreter Gruppe

Direkt unter den Chips erscheint ein gruppenspezifischer Bereich: Gruppenname, ca. drei Zeilen Geschichte, „Mehr lesen →“, [ Zur Fansub-Gruppe ] [ Zum Projekt ].

### 6. Fansub-Geschichte

Wenn auf dem öffentlichen Fansub-Profil bereits eine Geschichte / Beschreibung gepflegt ist, genau diese bestehende Information verwenden. KEIN zweiter Text speziell für die Anime-Seite. Darstellung: ungefähr drei sichtbare Textzeilen, visuell abschneiden (z. B. line-clamp: 3), danach „Mehr lesen →“ zur öffentlichen Fansub-Seite. Falls ein stabiler öffentlicher Anchor für den Geschichtsbereich existiert, prüfen, ob dieser verwendet werden kann.

**Datenquelle vor Umsetzung prüfen:** welches Feld die Geschichte enthält, ob Plain Text / HTML / Rich Text, welcher Renderer verwendet wird. Keine unsichere HTML-Manipulation. Keine vollständige Editor-Abhängigkeit auf die Anime-Seite ziehen.

### 7. Gruppe ohne Geschichte

Keinen Platzhaltertext wie „Keine Geschichte vorhanden.“. Stattdessen kompakt: Gruppenname, [ Zur Fansub-Gruppe ] [ Zum Projekt ].

### 8. Navigation

**Zur Fansub-Gruppe:** öffentliches Profil der ausgewählten Gruppe. **Zum Projekt:** Projekt der ausgewählten Gruppe für genau den aktuellen Anime. Tatsächliche Routes und Slugs aus dem aktuellen Code ermitteln, keine URL-Konvention aus dem Auftrag blind übernehmen, bestehenden Routing-Contract verwenden.

### 9. Bezeichnung „Gruppenbereich“

Nicht weiterverwenden, wenn damit das öffentliche Fansub-Profil gemeint ist. Explizite Beschriftungen „Zur Fansub-Gruppe“ und „Zum Projekt“.

### 10. Coop

Eine Coop erzeugt keine künstliche neue Gruppe und keinen eigenen „Coop“-Filter. Beispiel Bloody-Shadow + FlameHaze-subs: Auswahl bleibt [ Alle ] [ Bloody-Shadow ] [ FlameHaze-subs ]. Bei aktiver Gruppe jeweils deren Geschichte, deren Fansub-Gruppe, deren Projekt dieses Anime. Bei „Alle“ keiner der gruppenspezifischen Bereiche. Bestehende Mehrgruppen-/Coop-Zuordnung aus dem Datenmodell verwenden, keine neue Coop-Entität.

### 11. URL-Zustand

Bei zwei oder mehr Gruppen soll die ausgewählte konkrete Gruppe im URL-Zustand abbildbar sein (teilbarer Link), sinngemäß `/anime/123?fansub=bloody-shadow`. Vor Umsetzung bestehende Query-Parameter-Konvention, IDs vs. Slugs, vorhandene Patterns prüfen.

Regeln: ohne Parameter bei 2+ Gruppen → „Alle“; gültiger Parameter → Gruppe aktivieren; ungültiger / nicht mehr vorhandener Parameter → sauber auf „Alle“; genau eine Gruppe → automatisch aktiv. Browser Back/Forward muss korrekt funktionieren.

### 12. Sortierung

Prüfen, ob bereits eine fachliche Reihenfolge existiert; bestehende sinnvolle Reihenfolge nicht ohne Grund überschreiben; sonst stabile deterministische Sortierung.

### 13. Datenfluss und Performance

Prüfen, wo Gruppeninformationen, Logo, Geschichte und Projekt-Link/-Slug geladen werden. Ziel: kein N+1, keine zusätzlichen Einzelrequests pro Gruppe, keine vollständigen Fansub-Profile laden. Fehlende Daten: bestehenden Public Contract kleinstmöglich additiv erweitern.

### 14. Accessibility

Keyboard-Bedienung, sichtbarer Fokus, Active State nicht nur über Farbe, sinnvolle Accessible Names, echte Links für Navigationsziele. Filter-Chips und Navigationslinks semantisch sauber trennen.

### 15. Bestehende redundante UI entfernen

Derselbe Gruppenname darf nicht weiterhin mehrfach mit unklarer Funktion erscheinen. Insbesondere prüfen: bisherige Gruppen-Chips, bisherige Auswahlbuttons, „Gruppenbereich“, bestehenden Projektlink, bestehenden gruppenspezifischen Block. Keine alte und neue Lösung parallel.

### 16. Tests (mindestens)

- A. Anime ohne Fansub-Gruppe – kein Gruppenbereich
- B. genau eine Gruppe – kein „Alle“, automatisch aktiv, Geschichte → Preview, beide Navigationsziele
- C. eine Gruppe ohne Geschichte – kein leerer Geschichte-Block, Navigation vorhanden
- D. zwei Gruppen – „Alle“ standardmäßig aktiv, keine gruppenspezifischen Absprünge
- E. Wechsel zu Gruppe A – korrekte Geschichte, Gruppe, Projektziel
- F. Wechsel zu Gruppe B – Daten wechseln
- G. URL mit gültigem Gruppen-Kontext – Auswahl wiederhergestellt
- H. URL mit ungültiger Gruppe – sauberer Fallback
- I. Coop – Gruppen einzeln auswählbar, kein künstlicher Coop-Filter
- J. Gruppe mit Logo – Logo im Chip
- K. Gruppe ohne Logo – sauberer Text-Chip
- L. Mobile – Chips wrappen, kein Layout-Overflow

### 17. Browser-Verifikation

Desktop und Mobile, mindestens mit: 1 Gruppe, 2+ Gruppen, Gruppe mit Logo, Gruppe ohne Logo, Gruppe mit Geschichte, Gruppe ohne Geschichte, Coop-Konstellation.

### Arbeitsweise

1. Aktuellen Code und Datenfluss nachvollziehen. 2. Public Contracts prüfen. 3. Fansub-Profil und Geschichts-Rendering prüfen. 4. Projekt-Routing prüfen. 5. Gruppen-/Logo-Daten prüfen. 6. Kleinste konsistente Lösung planen. 7. Bestehende UI ersetzen statt parallel ergänzen. 8. Tests ergänzen. 9. Browser-Verifikation. Keine unrelated Refactorings.

### Abschlussbericht

Berichten: entfernte/ersetzte UI; 0/1/2+-Logik; Daten für Chips und Geschichte; ob Public Contract erweitert wurde; URL-Gruppenkontext; Ermittlung der beiden Navigationsziele; Coop-Behandlung; Query-/Request-Auswirkungen; Tests; Build/Lint/Typecheck; Desktop-/Mobile-Verifikation; offene Befunde.
