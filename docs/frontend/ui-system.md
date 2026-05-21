# Team4s UI-System

## Zweck

Dieses UI-System definiert die globale visuelle und strukturelle Basis für die Team4s Admin- und Plattformoberflächen.

Ziel ist nicht ein Big-Bang-Redesign. Ziel ist eine belastbare, sichtbare und wiederverwendbare Foundation, damit generische UI nicht länger pro Seite neu erfunden wird.

## Grundregel

Generische UI wird zentral gebaut. Fachlogik bleibt in Domain-Komponenten.

Diese Datei ist ab Phase `48A` die verbindliche Referenz für neue generische Team4s-UI. Bevor neue Standard-UI gebaut oder bestehende Standard-UI erweitert wird, muss zuerst diese globale Basis geprüft und bevorzugt verwendet werden.

Erlaubt im UI-System:

- generische Buttons
- generische Cards
- generische Tabellen
- generische Badges
- generische Formularfelder
- generische Header
- generische States
- generische Overlay-Hüllen

Nicht erlaubt im UI-System:

- Anime-/Fansub-/Release-spezifische Regeln
- API-Aufrufe
- Permission-Checks
- Keycloak-Logik
- Query- oder Routing-Logik, die nur für eine Domäne gilt

## Wo Tokens definiert sind

Die kanonische Token-Basis liegt in:

- [globals.css](/C:/Users/admin/Documents/Team4s/frontend/src/styles/globals.css)

Wichtige Token-Gruppen:

- Farben und semantische Flächen
- Textfarben
- Border-Farben
- Statusfarben
- Abstände
- Radien
- Schatten
- Fokus-States
- Control-Höhen
- Z-Index-Werte

Wichtig:

- keine zweite Theme-Welt parallel aufbauen
- bestehende Variablen erweitern oder konsolidieren
- neue semantische Tokens immer erst hier prüfen

## Globale Komponenten

Die generische UI-Schicht liegt in:

- [frontend/src/components/ui](/C:/Users/admin/Documents/Team4s/frontend/src/components/ui)

Aktuell vorbereitet:

- `Button`
- `Card`
- `Badge`
- `Table`
- `Tabs`
- `Drawer`
- `Modal`
- `FormField`
- `Input`
- `Select`
- `Textarea`
- `Toolbar`
- `ActionBar`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `SectionHeader`
- `PageHeader`
- `Pagination`

## Unterstützte Varianten

### Button

- `primary`
- `secondary`
- `ghost`
- `subtle`
- `danger`
- `success`
- Größen `sm`, `md`, `lg`
- `loading`
- `iconOnly`

### Card

- `default`
- `elevated`
- `interactive`
- `compact`
- `section`
- `flat`
- `nested`
- `nestedFlat`

### Badge

- `neutral`
- `success`
- `warning`
- `danger`
- `info`
- `muted`

### Table

- `default`
- `compact`
- `selectable`
- `withActions`
- `TableEmptyState` für leere Zustände

### FormField

- `label`
- `hint`
- `error`
- `required`
- `disabled`

### EmptyState

- default
- compact
- with action

## Playground aufrufen

Die interne UI-System-Referenzseite liegt unter:

- [/dev/ui-system](/C:/Users/admin/Documents/Team4s/frontend/src/app/dev/ui-system/page.tsx)

Sie ist ausschließlich für:

- visuelle Prüfung
- Design-Iteration
- Komponenten-Review
- Kompositions-Review
- spätere Referenzmigrationen

Sie ist ausdrücklich nicht:

- ein Produktfeature
- API-gebunden
- auth-gebunden
- permission-gebunden

## Verbindliche Designentscheidungen aus 48A

### Buttons

- `primary` nutzt die `Cobalt`-Farbfamilie
- `secondary` nutzt die `Slate`-Farbfamilie
- `danger` nutzt die `Wine`-Farbfamilie
- `success` nutzt die `Petrol`-Farbfamilie
- `ghost` und `subtle` bleiben ruhiger als `primary`
- `subtle` ist flach und ohne Verlauf
- `hover` bleibt als subtiler Gradient-Flip
- `active` bleibt als Glow-/Pressed-Zustand

### Cards

- die globale Main-Card-Richtung basiert auf der kühl-bläulichen `D`-Richtung
- `section` bleibt eine sichtbare Hauptfläche
- `nested` ist standardmäßig transparent oder fast transparent
- `nestedFlat` bleibt als ruhige Zwischenstufe für Innenbereiche erlaubt
- Card-in-Card ist zu vermeiden, wenn Spacing oder eine flache Innenebene reicht

### Badges

- Badges bleiben kleiner, präziser und ruhiger als große Status-Pills
- Status-Chips sollen die globale Badge-Sprache verwenden statt Feature-Sonderformen

### Tabellen

- Tabellenhüllen dürfen eine ruhig-warme Oberflächenrichtung nutzen
- Tabellenkopf nutzt keine massive Fläche, sondern eine feine `Wine`-Unterlinie
- primäre Zeilenaktionen sollen als echte Buttons erkennbar sein
- aufklappbare Tabellenzeilen dürfen einen zusätzlichen Disclosure-Pfeil tragen
- lange Release- oder Episodenlisten sollen nicht ungefiltert komplett sichtbar sein, wenn der Bereich dadurch schwer lesbar wird
- für lange Listen ist ein begrenzter Scrollbereich mit sticky Tabellenkopf der bevorzugte Standard
- im UI zuerst inkrementell sichtbar machen, zum Beispiel `5` Einträge initial und weitere beim Scrollen
- dieses Listenverhalten ist Teil des globalen Musters und soll nicht pro Seite anders neu gebaut werden

### Header

- `PageHeader` ist klar stärker als `SectionHeader`
- `SectionHeader` bleibt kompakter und sachlicher

### Drawer

- Drawer bleiben globale Hüllen und bekommen keine eigene Mini-Designsprache für Inhalte
- Tabs im Drawer nutzen die normale globale Button-Größe statt hoher Kachel-Reiter
- `Details`-Bereiche im Drawer sollen kompakte Label/Wert-Informationen zeigen, nicht pseudo-editierbare Readonly-Felder
- redundante Kontext-Cards im Drawer sind zu vermeiden, wenn dieselben Informationen bereits in der Detailstruktur stehen
- Medien-Kategorien im Drawer dürfen als leichte Tabellen-/Key-Value-Struktur erscheinen statt als Mini-Cards
- der Medien-CTA bleibt ein normaler globaler `primary`-Button
- reine Ansichts-Drawer schließen unten mit einer einfachen `Schließen`-Aktion statt mit künstlichen Formular-Actions

### Detailpanel / Timeline

- die geöffnete Detailzeile unter einer Tabelle heißt `Detailpanel`
- ein `Detailpanel` ist keine neue Main Card
- Timeline-Vorschauen sind wiederkehrende UI-Muster und sollen nicht pro Seite neu erfunden werden
- Timeline-Legenden nutzen die globale Badge-Sprache
- Timeline-Segmente dürfen sich an der globalen Button-Farbfamilie orientieren, bleiben aber flacher als normale Buttons
- `Hauptinhalt` ist die durchgehende Grundfläche der Spur
- `OP`, `ED`, `IN` liegen als aufgelegte Segmente auf derselben Timeline-Achse
- für Fansub-Detail-Listen gilt die Hierarchie:
  - `Main Card` für den großen Bereich
  - eigene Anime-Unterkarte je Anime-Eintrag
  - Tabelle innerhalb der Anime-Unterkarte
  - `Detailpanel` innerhalb der aufgeklappten Tabellenzeile
- Anime-Unterkarten dürfen das Poster deutlich über die obere Kante herausragen lassen, wenn der Eintrag dadurch klarer wie ein eigener Medienblock wirkt
- Tabellen in Anime-Unterkarten dürfen bis fast an die innere Card-Kante gezogen werden; unnötige Restabstände rechts und links sollen vermieden werden
- Timeline-Spuren sollen die verfügbare Breite konsequent nutzen, während Text, Legende und Spur-Labels einen kleinen Innenabstand zum Card-Rand behalten
- Release-Listen in Anime-Unterkarten dürfen einen eigenen vertikalen Scrollbereich besitzen
- die Kopfzeile bleibt dabei sticky und die Zeilen sollen direkt an der `Wine`-Unterlinie verschwinden
- bei sehr langen Release-Listen ist inkrementelles Anzeigen der erste Standardansatz; vollständige Server-Pagination ist ein späterer Skalierungsschritt, nicht die Pflicht für jede Seite

## Verbindliche Agent-Regel

Vor neuen generischen Styles gilt immer:

1. Gibt es bereits eine globale UI-Komponente?
2. Gibt es bereits eine passende Variante?
3. Reicht eine kleine Erweiterung der bestehenden globalen Komponente?
4. Ist der neue Fall wirklich domain-spezifisch?

Nur wenn 1 bis 3 mit `nein` und 4 mit `ja` beantwortet wird, darf neuer lokaler Stil für generische Darstellung entstehen.

## Regeln für globale Komponenten

- Globale Komponenten bleiben fachlogikfrei.
- Props beschreiben generische Darstellung und Struktur, nicht Team4s-Domainregeln.
- Varianten müssen begrenzt und bewusst sein.
- Wenn ein neuer Fall mit bestehender Variante lösbar ist, keine neue Variante hinzufügen.
- Wenn eine Komponente nur für ein Fachfeature Sinn ergibt, gehört sie nicht in `src/components/ui`.

## Regeln für lokale Styles

Lokale Styles bleiben erlaubt für:

- fachliche Speziallayouts
- komplexe Domain-Grids
- einmalige Sonderfälle
- hochspezifische Editor-/Media-/Story-Kompositionen

Lokale Styles sind nicht mehr die erste Wahl für:

- Standard-Buttons
- Standard-Cards
- Standard-Badges
- Standard-FormFields
- Standard-Header
- Standard-EmptyStates

Wenn eine Seite nur eine normale Aktion, Card oder Tabelle braucht, soll sie die globale UI-Basis konsumieren.

Wiederkehrende Standardmuster wie Detailpanels, Timeline-Vorschauen, Tabellen-Disclosure-Zeilen oder Status-Chips sollen nach Möglichkeit erst im Playground und dann global vereinheitlicht werden, statt erneut seitenlokal zu driften.

## Do / Don’t für künftige Agents

Do:

- zuerst prüfen, ob bereits eine globale Komponente existiert
- zuerst prüfen, ob eine bestehende Variante reicht
- bestehende Komponenten lieber erweitern als parallel neu bauen
- Fachlogik in Domain-Komponenten lassen
- visuelle Änderungen im Playground gegenprüfen

Don’t:

- keine neuen lokalen Button-Klassen pro Seite
- keine neuen generischen Card-Hüllen in Feature-CSS
- keine API-Logik in `src/components/ui`
- keine Permission-Abfragen in `src/components/ui`
- keine rein geschmacksgetriebenen Variantenfluten
- keine neue Standard-Timeline-/Detailpanel-Optik pro Seite, wenn ein globales Muster bereits existiert

## Wie neue Komponenten ergänzt werden sollen

1. Prüfen, ob das Problem mit vorhandenen Tokens und Komponenten lösbar ist.
2. Prüfen, ob eine bestehende Komponente eine kleine neue Variante braucht.
3. Nur wenn das Problem generisch wiederkehrend ist, eine neue UI-Komponente in `src/components/ui` ergänzen.
4. Den neuen Fall im Playground sichtbar machen.
5. Die neue oder geänderte Komponente hier dokumentieren.

## Wie spätere Seiten migriert werden sollen

Phase `48B` sollte gezielt 2 bis 3 echte Referenzseiten migrieren, nicht die ganze App gleichzeitig.

Empfohlene Reihenfolge:

1. Kleine, risikoarme Admin-Seite mit klaren Standardmustern
2. Profil- oder Detailseite mit Header, FormFields, Cards und Listen
3. Eine komplexere Arbeitsfläche mit Table-/Toolbar-/ActionBar-Kombination

Geeignete Kandidaten:

- `frontend/src/app/admin/page.tsx`
- `frontend/src/app/admin/profile/page.tsx`
- eine begrenzte Teilfläche aus `AnimeEditPage`, `FansubEdit` oder `AnimeBrowser`

## Offene Designfragen

- Wie präsent soll die Orange-Akzentfarbe außerhalb von Primäraktionen sein?
- Soll Pagination später state-basiert, link-basiert oder doppelt verfügbar sein?
- Wann lohnt ein eigenes `Avatar`-Primitive?
- Wann wird ein generisches Dropdown/Popover wirklich notwendig?
- Soll `Breadcrumbs` später in die UI-Schicht ziehen oder im Navigation-Bereich bleiben?
