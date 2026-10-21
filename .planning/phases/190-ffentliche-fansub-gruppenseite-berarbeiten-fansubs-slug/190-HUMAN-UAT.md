---
status: approved
phase: 190-ffentliche-fansub-gruppenseite-berarbeiten-fansubs-slug
source: [190-VERIFICATION.md]
started: 2026-10-21T08:49:00Z
updated: 2026-10-21T15:00:00Z
---

## Current Test

[abgeschlossen — approved]

## Tests

### 1. Kopfbereich ohne Rahmen-Karte, Status nur einmal (D-a, D-d, D-o, D-p)
expected: `/fansubs/new-subs`, `/fansubs/strawhat-subs`, `/fansubs/dragon-subs` zeigen den Kopfbereich
ohne umrahmende Glas-Karte (wie auf der Projektseite); der Status (aktiv/inaktiv/aufgelöst)
erscheint nur noch einmal als Badge, nicht zusätzlich als Klartext in der Meta-Zeile, für alle drei
Status-Werte.
result: passed — vom Nutzer live bei 1440px bestätigt (D-p-Checkpoint). Bannerhöhe wurde dabei
NICHT vorab festgelegt, sondern als eigener Root-Cause-Fix identifiziert (siehe Test 2).

### 2. Banner wie auf der Projektseite (D-b)
expected: Das Gruppenseiten-Banner soll in Größe/Wirkung der Projektseite entsprechen.
result: passed — Root-Cause war keine Container-Breite (beide Seiten bereits byte-identisch
1312px bei 1440px), sondern eine stray `sizes="1200px"`-Prop am Banner-`<ResponsiveImage>`, die
über `next.config.mjs`s `deviceSizes`-Leiter `[640,1080,1480,1920]` (1200 ist kein Breakpoint) zu
einer HTML-Spec-Dichte-Korrektur führte. Nach Entfernen der Prop: Banner rendert bei 1440px
1090,9×200px (vorher 973×178,4px) — vom Nutzer anhand des korrekten, undistorted
Seitenverhältnisses bestätigt.

### 3. Mitglieder-Bezeichnung je Status, Team-Karten, "unbestätigt" (D-c, D-e/D-q, D-f, D-g)
expected: Kennzahl "Releases" statt "Release-Versionen"; Mitglieder-Überschrift zeigt "Mitglieder"
bei aufgelöst/inaktiv, "Aktive Mitglieder" nur bei aktiv; Team-Zitate auf 2–3 Zeilen geklemmt mit
Mehr/Weniger-Umschalter; "unbestätigt" nicht mehr als Badge pro Karte, sondern einmal in der
Abschnittsüberschrift ("Historische Nennungen (unbestätigt)").
result: passed — live auf `new-subs`/`strawhat-subs` bestätigt (beide `aufgelöst`,
zeigen korrekt "Mitglieder" statt "Aktive Mitglieder").

### 4. Einzelnes Projekt als normale Karte (D-h, D-r) — zwei Korrekturrunden
expected: Eine Fansub-Gruppe mit genau einem Projekt zeigt dieses als normale, kleinere,
linksbündige Karte, nicht als riesige zentrierte Karussell-Karte; mehrere Projekte bleiben im
bestehenden Karussell.
result: passed — mit zwei Nachbesserungsrunden während der Live-Prüfung:
(a) `singleItemLayout="grid"`-Prop auf `FocalCarousel` schaltete nur die Zentrier-Optik ab, die
Karte blieb bei 718×404px mit zwei (deaktivierten) Navigationspfeilen — vom Nutzer als "wirkt
weiterhin wie ein Karussell" abgelehnt;
(b) Variante B: `FocalCarousel` wird bei genau einem Projekt komplett umgangen, Karte landet im
bestehenden `.bannerGrid`-Raster (240–320px). Live gemessen: 320×180px bei 1440px (vorher
718×404px), 303×170px bei 375px, keine Pfeile, keine Karussell-Region. Mehrere Projekte
(`strawhat-subs`, 2 Projekte) unverändert bei 718×404px mit Pfeilen bestätigt. Der dafür nicht
mehr benötigte `singleItemLayout`-Prop wurde vollständig zurückgebaut.

### 5. Medien: Titel-Fallback, ein Mehr-anzeigen-Element, Gruppierung (D-i, D-j, D-k) — drei
Korrekturrunden
expected: Keine generischen Medientitel wie "image"; genau ein "Mehr anzeigen"-Mechanismus statt
Überlaufkachel + globalem Button; Medien nach Kategorie gruppiert mit eigener Zwischenüberschrift.
result: passed — mit drei Nachbesserungsrunden:
(a) ursprüngliche Umsetzung (Plan 190-05): globaler "Alle N anzeigen"-Button über alle Kategorien
hinweg, Kategorie-Badge weiterhin pro Kachel — vom Nutzer als "Kategorie-Badge ist jetzt doppelt
zur Überschrift" abgelehnt;
(b) Pro-Kategorie-Paginierung: jede Kategorie begrenzt sich unabhängig auf 6 Kacheln (2 Zeilen à
3) mit eigenem "Mehr anzeigen", Badge entfernt, Raster auf 3 Spalten Desktop (wie Release-Raster);
(c) nach Live-Prüfung auf einem Bildschirm >1440px: Kategorie-Überschriften waren optisch
gleichrangig zur Hauptüberschrift "Medien" (gleiche Größe/Linie) — auf 13px/600/`--text-muted` mit
dünner `--border-subtle`-Linie korrigiert; 3er-Raster ließ ab 1600px eine leere vierte Spalte bei
Kategorien mit <4 Elementen — Eskalation entfernt, jetzt immer exakt 3 gleich breite Spalten. Live
bei 1440px (3×429px) und 1920px (3×464px) nachgemessen: Summe Kachelbreiten+Abstände = exakt
Sektionsbreite, kein Leerraum.

### 6. Geschichte zentriert, Editing-Label, HeroMetrics mobil nebeneinander (D-l, D-t, D-u)
expected: Geschichte-Textblock mittig mit lesbarer Breite, Text darin linksbündig; Rollen-Label
"editor" zeigt "Editing" statt "Edit"; Kennzahlen-Zeile bricht auf Mobil (375px) nicht mehr
einzeln/verwaist um, sondern bleibt nebeneinander in gleich breiten Spalten, erst bei sehr schmalen
Viewports (<340px) gleichmäßiger Umbruch auf zwei Spalten.
result: passed — Geschichte-Zentrierung live bestätigt (symmetrische Außenabstände 155/154px).
"Editing"-Label live auf `strawhat-subs`/Mitglied "founder" bestätigt. HeroMetrics-Fix mit einer
Nachbesserungsrunde: erste Lösung (jede Kennzahl volle eigene Zeile) vom Nutzer als "verbraucht
fast einen halben Bildschirm" abgelehnt; korrigiert auf nebeneinander mit `flex: 1 1 0`, Umbruch
erst unter 340px mit `grid-column: 1 / -1`-Vollbreite für eine ungerade letzte Kennzahl. Alle sechs
Verwendungsstellen (ProjectStats, FansubHeroSection, MemberProfileHero, ProjectMemberHero,
DashboardMetrics, dev/ui-system) live bei 375px und 320px geprüft; `DashboardMetrics` vom Nutzer
als "ok" gewertet (nicht prüfbar ohne Login, gleiche Komponente wie die fünf bestätigten Stellen).

### 7. D-m/D-n/D-s-Regression, Gesamtbild
expected: Abschnittsreihenfolge, Mitglieder-Zählung und Historie-Zeitleiste unverändert;
datenarme Gruppen (`dragon-subs`) zeigen weiterhin keine Empty-State-Platzhalter.
result: passed — `dragon-subs` zeigt korrekt nur Kopf→Projekte (keine Geschichte/Team/
Historie/Medien-Platzhalter); Abschnittsreihenfolge bei allen drei Gruppen Kopf→Geschichte→
Projekte→Team→Historie→Medien bestätigt.

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

Keine offenen Abweichungen. Alle während der drei Live-UAT-Checkpoints (D-p nach Plan 190-02, D-u
nach Plan 190-08, finales Gate nach Plan 190-09) gefundenen Abweichungen wurden noch innerhalb
dieser Phase behoben und erneut live bestätigt (siehe `result`-Felder oben). Zusätzlich wurde nach
der finalen Freigabe ein Deep-Code-Review (`190-REVIEW.md`) über alle 26 Phasen-Dateien
durchgeführt; dessen 5 Warnungs-Befunde (React-Key-Kollision, tote CSS-Klassen, ein vorbestehender
`sortHistory`-Komparator-Bug, fehlendes Error-Logging, eine berührte 458-Zeilen-Datei ohne Split)
sind alle behoben.
