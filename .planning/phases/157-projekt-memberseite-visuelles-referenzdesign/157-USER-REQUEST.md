# Phase 157 – Projekt-Memberseite visuell auf Referenzdesign umbauen

**Quelle:** Nutzerauftrag vom 2026-09-12, wörtlich übernommen, mit beigefügtem Referenz-Screenshot
(schmaler Viewport, Route `/fansubs/new-subs/fansubprojekt/buddy-complex/mitwirkende/type`).
Verbindliche Auftrags- und Abnahmequelle dieser Phase. Das Referenzbild ist **kein Moodboard,
sondern die visuelle Acceptance-Referenz**.

## Ziel

Die öffentliche Projekt-Memberseite soll visuell und strukturell auf das beigefügte Referenzbild
umgebaut werden.

Die Referenz ist verbindlich für:

- Informationshierarchie
- Reihenfolge der Bereiche
- Kartengrößen
- Abstände
- Typografie-Hierarchie
- Statistikdarstellung
- Beitragsdarstellung
- Medienbereich
- Verhalten bei 0 Releases

Nicht nur „ähnlich" umsetzen. Bestehende Team4s-Komponenten und Design-Tokens verwenden, aber die
dargestellte Informationsarchitektur und Proportionen möglichst exakt übernehmen.

## Ausgangsproblem

Die aktuelle Seite wiederholt bei jedem einzelnen Textbeitrag groß die Rolle des Members, z. B.
„Typesetting".

Das ist redundant, weil die Projektrolle bereits oben im Profilkopf angezeigt wird.

Aktuell wirken die Beiträge deshalb wie einzelne große Karten und die Seite wird unnötig lang.

## 1. Header / Member-Zusammenfassung

Oben weiterhin anzeigen: Avatar, Membername, Verifiziert-Status, „Mitwirkung an [Projekt] ·
[Fansub-Gruppe]", Projektrolle(n) z. B. „Typesetting", Button „Vollständiges Memberprofil",
Button „Zurück zum Projekt".

Layout wie Referenz: Avatar links, Name und Metadaten rechts, Aktionsbuttons darunter nebeneinander
auf Desktop, auf schmalen Screens sauber umbrechen.

Keine fachlichen Daten ändern.

## 2. Statistikbereich kompakter machen

Statt vier großen separaten Karten eine kompakte horizontale Statistikleiste.

Anzeigen: Rollen, Beiträge, Medien, Releases.

Beispiel: `1 Rolle | 12 Beiträge | 2 Medien | 0 Releases`

Mit Icon + Zahl + Label. Auf Mobile darf das sauber umbrechen. Nicht wieder vier große Boxen
untereinander erzeugen.

## 3. Tab-/Jump-Navigation

Direkt darunter kompakte Navigation: „Texte & Notizen · 12", „Bilder & Medien · 2", „Releases · 0".

Aktiver Bereich visuell hervorgehoben. Bestehende Navigation/Anchor-Mechanik wiederverwenden, falls
vorhanden.

## 4. Projekt-Beitragszusammenfassung

Zwischen Navigation und Beiträgen eine kompakte Zusammenfassung anzeigen.

Beispiel: `Typesetting für 13 Folgen · 12 dokumentierte Arbeitsnotizen · 2 Medien`

Diese Information soll dem Nutzer sofort erklären, welchen Umfang die Arbeit dieses Members im
Projekt hatte.

Keine neue Businesslogik erfinden. Nur Werte anzeigen, die aus vorhandenen Daten zuverlässig
ableitbar sind. Falls „13 Folgen" nicht sauber aus vorhandenen Daten berechnet werden kann, diese
Zahl nicht erfinden.

## 5. Texte & Notizen

Dieser Bereich soll am stärksten umgebaut werden.

**Bisher:** Jeder Beitrag hat einen großen farbigen Header „Typesetting". Das ist redundant und soll
entfernt werden.

**Neu:** Jeder Beitrag wird als kompakte Timeline-/Listenzeile dargestellt.

Reihenfolge:

1. Meta-Zeile: `Folge 13 · v1 · 01.09.2026`
2. Titel: `Abschluss`
3. Textvorschau: 2–4 Zeilen
4. optional: `Mehr anzeigen`

Die Rolle wird nicht mehr groß pro Beitrag wiederholt.

Zwischen den Beiträgen dezente Timeline-/Listenoptik wie auf der Referenz. Keine riesigen farbigen
Karten.

## 6. Rolle nur anzeigen, wenn fachlich notwendig

Wenn der Member im Projekt nur eine Rolle hat, die Rolle ausschließlich im Header anzeigen.

Wenn ein Member mehrere Projektrollen hat und eine einzelne Notiz eindeutig einer bestimmten Rolle
zugeordnet ist, darf optional ein kleiner Chip neben der Meta-Zeile erscheinen, z. B.
`Folge 10 · v1 · Typesetting`.

Aber: kein großer Balken, keine Rollenwiederholung ohne Mehrwert, keine Duplizierung rein aus
Stylinggründen.

## 7. Pagination / „Mehr laden"

Aktuell: „Weitere Beiträge laden". Neu möglichst konkret: „Weitere 5 Beiträge anzeigen" oder
entsprechend der tatsächlichen nächsten Anzahl. Links zusätzlich: „5 von 12 angezeigt".

Pagination-/Lazy-Load-Mechanik nicht neu erfinden, bestehende Logik weiterverwenden.

## 8. Bilder & Medien

Bereich visuell wie Referenz. Header: „Bilder & Medien" + Anzahl rechts. Darunter responsive
Galerie. Pro Karte: Bild, Titel, Folge/Version, optional kleine Kategorie wenn fachlich sinnvoll.

Beispiele: „Typesetting-/Karaoke-Beispiel / Folge 1 · v1", „Spaßbild / Outtake / Folge 12 · v1".

Bestehende Lightbox-/Detailfunktion erhalten. Keine neue Medienlogik bauen.

## 9. Releases

Wenn Releases > 0: normalen Release-Bereich anzeigen.

Wenn Releases = 0: nicht eine große leere Sektion erzeugen. Bevorzugt entweder kompakter
Empty-State wie auf Referenz oder, falls mit bestehender UX konsistent, Bereich stark reduziert
darstellen.

Kein „Mitwirkung an Releases 0" plus „Alle 0 angezeigt" als unnötig doppelte Information.

## 10. Informations-Hierarchie

Die Seite soll sich lesen wie: 1. Wer ist diese Person? 2. Welche Rolle hat sie im Projekt?
3. Wie viel hat sie beigetragen? 4. Welche konkreten Beiträge gibt es? 5. Welche Medien hat sie
beigesteuert? 6. Welche Releases sind ihr zugeordnet?

Nicht wie: Datenbankliste aller Objekte, jeweils mit wiederholter Rolle.

## 11. Desktop + Mobile

Referenzbild entspricht einem schmalen Viewport. Die Seite muss zusätzlich auf Desktop sauber
skalieren.

Desktop: Content zentriert, sinnvolle Max-Width, keine endlos breiten Textkarten, Statistik
horizontal, Medien 2–3 Spalten je nach Platz.

Mobile: Buttons stapeln bei Bedarf, Statistik darf 2×2 werden, Textkarten bleiben kompakt, Medien
1–2 Spalten.

Keine horizontale Scrollbar.

## 12. Bestehende Team4s-Designsprache erhalten

Nicht das komplette globale Design neu erfinden. Beibehalten: Team4s Farbwelt, bestehende
Button-Primitives, Badge-Primitives, Border-Radius, Schatten, Typografie, bestehende globale
Abstände soweit sinnvoll.

Die Referenz ist eine Struktur- und Layoutvorgabe, kein Auftrag, neue Design-Tokens einzuführen.

## 13. Keine fachliche Regression

Der Umbau ist primär UI/UX. Unverändert bleiben müssen: Privacy-/Visibility-Regeln,
Member-Slug-Verlinkung, öffentliche/private Beiträge, Release-Zuordnungen, Medien-Sichtbarkeit,
Pagination, vorhandene API-Semantik, Projektkontext, Rollenberechnung.

Keine Backend-Neumodellierung nur für dieses Layout.

## 14. Vor Implementierung

Zuerst tatsächliche Dateien und Komponenten identifizieren. Prüfen: Page-Komponente,
Header-Komponente, Statistikbereich, Notes-Komponente, Media-Komponente, Release-Komponente,
verwendete CSS-Module, vorhandene gemeinsame Cards/Buttons/Badges.

Danach kurze Implementation Map erstellen. Keine große Page-Datei weiter aufblasen. Falls bereits
überlange Datei betroffen ist: zuerst sinnvoll extrahieren.

## 15. Visuelle Acceptance Criteria

Die fertige Seite soll sich beim direkten Vergleich mit der beigefügten Referenz wie dieselbe Seite
anfühlen. Insbesondere:

- kompakter Profilkopf
- kompakte Statistikleiste
- kleine Tab-Navigation
- Beitragszusammenfassung
- keine großen Typesetting-Header pro Notiz
- Meta-Zeile Folge · Version · Datum
- Titel deutlich darunter
- kompakter Notiztext
- Timeline-/Listencharakter
- Medien direkt anschließend
- keine unnötig große leere Release-Fläche
- erheblich weniger vertikale Wiederholung als heute

## 16. Tests

Bestehende Tests anpassen, nicht pauschal löschen. Mindestens prüfen:

- Single-Role-Member → Rolle wird nicht auf jedem Beitrag wiederholt
- Multi-Role-Member → falls beitragsbezogene Rolle vorhanden, kleiner Chip möglich
- 12 Beiträge → Initialmenge + „Weitere … anzeigen" korrekt
- 0 Medien
- mehrere Medien
- 0 Releases
- mehrere Releases
- lange Titel
- langer Beitragstext
- Mobile Layout
- Desktop Layout
- versteckte Inhalte bleiben versteckt

Frontend-Testmatrix vollständig fahren.

## 17. Live-UAT

Nach Umsetzung reale Seite mit dem vorhandenen Member „Type" / Buddy Complex prüfen. Vergleich mit
Referenzbild. Screenshots erstellen für: Header + Statistik, Beiträge, Medien, Releases/Empty-State,
Desktop, schmaler Viewport.

Abweichungen dokumentieren. Nicht nur „funktioniert" bestätigen, sondern visuell gegen die Referenz
prüfen.

## Definition of Done

Fertig ist der Auftrag erst, wenn:

- Rolle nicht mehr redundant auf jedem Beitrag steht
- Beiträge deutlich kompakter geworden sind
- Header und Statistik der Referenzstruktur entsprechen
- Medienbereich der Referenzstruktur entspricht
- Empty-State für Releases bereinigt ist
- Mobile und Desktop sauber funktionieren
- bestehende fachliche Semantik unverändert ist
- keine unnötige Backend-Parallelstruktur entstanden ist
- Tests grün sind
- Live-Screenshots gegen die Referenz geprüft wurden

## Wichtig zur Referenz

Bei Abweichungen soll zuerst geprüft werden, ob bestehende Team4s-Komponenten oder fachliche
Constraints die Abweichung technisch erzwingen. Falls nicht, ist die Referenz möglichst exakt
umzusetzen.

## Rolle der Agenten

Opus: Planung, Implementation, Testanpassung, Live-UAT-Vorbereitung.

Astra danach: unabhängiger visueller Review, fertige Screenshots gegen Referenzbild vergleichen,
Abweichungen priorisiert auflisten, keine stillschweigende Neuinterpretation des Designs.
