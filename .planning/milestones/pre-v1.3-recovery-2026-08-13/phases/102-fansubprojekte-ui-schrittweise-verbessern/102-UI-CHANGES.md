---
phase: 102
phase_name: fansubprojekte-ui-schrittweise-verbessern
status: complete
created: 2026-07-16
---

# Phase 102 UI Changes

Diese Datei hält die sichtbaren UI-Änderungen aus Phase 102 als eigenes Inventar fest. Der Zweck ist, später nicht aus Code-Diffs rekonstruieren zu müssen, welche Oberflächen bewusst globalisiert, angepasst oder als spätere Arbeit abgelegt wurden.

## Public Fansub Project Page

- Die öffentliche Fansubprojekt-Detailseite ist weiterhin die fachliche Projektseite für `(Anime, Fansubgruppe)`, aber visuell näher an der öffentlichen Fansubseite ausgerichtet.
- Die pretty route `/fansubs/[slug]/fansubprojekt/[animeSlug]` ist der öffentliche Einstieg; die technische Route `/anime/[id]/group/[groupId]` bleibt kompatibel.
- Der Hero nutzt die öffentliche Fansub-Hero-Logik als Orientierung, ohne die Projektseite zur Fansubprofil-Seite zu machen.
- `Coop mit ...` wird im Hero als eigener Kontext behandelt; mehrere Gruppen werden als klickbare Gruppennamen dargestellt.
- Same-Fansub Navigation wurde als vorheriges/nächstes Projekt auf der Projektseite verankert.
- Der harte Blur-/Banner-Kantenunterschied zwischen Fansubseite und Projektseite wurde in Richtung des public Fansub UI angeglichen.

## Project Sections

- `Geschichte des Fansub-Projekts` bleibt als eigener Projekttext-Block sichtbar.
- `Mitwirkende am Fansub-Projekt` bleibt als projektbezogene Mitglieder-/Rollenfläche sichtbar.
- Mitglieder werden als klickbare Member-Einträge verstanden; sie zeigen nur Rollen, die im konkreten Projekt relevant sind.
- Der Profil-Titel/Satz aus dem Fansubmember-Profil wurde nicht in die Projekt-Mitwirkenden übernommen.
- Die alten page-flow-Flächen wurden entfernt: Abschnittssprungliste, globale Empty Summary, standalone `OP/ED/Middle`, standalone `Medien`, `Neuestes Release`, `Weitere Releases`.

## Public Releases Block

- Der öffentliche Release-Block wurde als `PublicReleaseBlock` aus der UI-dev-Definition in die echte Projektseite übernommen.
- Titel/Copy: `Releases zum Fansub` und `Neuestes Fansub-Release`.
- Das Release-Objekt zeigt Folge, Version und Release-Titel in einer kompakten Zeile.
- Der öffentliche Titel nutzt die bereits definierte Fallback-Regel: Release-Titel, sonst Folgentitel plus Gruppe/Version, ohne rohe Import-Dateinamen.
- Die Count-Anzeigen heißen `Bilder`, `Texte`, `Fansubber`; `4 Beteiligte` wurde bewusst nicht verwendet.
- Redundante Folge-Badges auf dem Bild wurden entfernt.
- Zeit-Badges und die Startzeit `00:00` wurden aus der kompakten Projektlisten-Ansicht entfernt.
- Der Action-Button führt zur vollständigen Release-Ansicht.
- Das einzelne, größere Timeline-Layout wurde als Idee für die spätere Release-Detailseite gesichert, aber nicht als Projektlisten-Layout übernommen.

## Release Timeline In Project List

- Die Timeline wurde als schlanker Strahl behalten, damit auch viele Releases auf einer Seite lesbar bleiben.
- Die Hauptlinie ist stärker sichtbar, aber nicht als dicker weißer Balken ausgeführt.
- Kara-Segmente sind rechteckig, glassiger und liegen direkt auf der Timeline.
- Die Timeline-Farbe zieht subtil durch die Kara-Segmente mit, ohne dass die Segmente selbst den starken Laser-Glow bekommen.
- Kara-Farben wurden von den Badge-Farben getrennt; Rot wurde vermieden, weil es wie ein Fehlerzustand wirkt.
- OP/ED/Insert/Kara-Segmente sind als klickbare Elemente vorbereitet, damit eine spätere Release-Seite direkt Segment-Playback starten kann.
- Mobile bekommt eine eigene `Karas`-Überschrift über den Segmenten, statt horizontal scrollen zu müssen.

## UI Dev System

- Public Fansub Header, Projektekarten/Karussell, Historie/Erfolge, Medien, Release-Segmente und wiederverwendbare kleine Navigationselemente wurden im UI-dev-Kontext als gestaltbare globale Muster verankert.
- `PublicFansubSurfacesShowcase` dokumentiert die public Fansubflächen im UI-System.
- `PublicReleaseSurfacesShowcase` dokumentiert die public Release-Flächen im UI-System.
- `CompositionShowcase` wurde erweitert, damit Fansub-Detail und Release-Kompositionen sichtbar bleiben.
- `/admin/dev/ui-system` wurde als schneller lokaler UI-dev Einstieg ergänzt, damit UI-Iteration nicht jedes Mal Docker-Rebuild braucht.
- `docs/frontend/ui-system.md` wurde entsprechend erweitert.

## Global UI Primitives

- `AccentRule` wurde als wiederverwendbare wine-red Linie in verschiedenen Stärken ergänzt.
- `DisclosureIndicator` wurde als eigenständiges Öffner-/Disclosure-Symbol ergänzt.
- `AdjacentNavigation` wurde für kleine Vorher/Nächste-Navigationen wie Projekt- oder Release-Wechsel ergänzt.
- `Button` und `ui.module.css` wurden erweitert, damit diese Muster global statt seitenlokal nutzbar sind.

## Public Fansub Projects Carousel

- Projektkarten wurden so vorbereitet, dass sie als Karussell und bei vielen Bildern/Einträgen als `Alle anzeigen`/Grid-Denke global weitergeführt werden können.
- Die Phase hält diese UI-Idee fest, baut aber nicht alle zukünftigen Grid-Varianten fertig aus.

## Deferred UI Follow-Ups

- Die dedizierte öffentliche Release-Detailseite ist nicht Teil von Phase 102.
- Dort soll das reichere Timeline-/Playback-Segment wieder aufgenommen werden.
- Diskussion und Umsetzung von Klick-auf-Kara-spielt-Segment bleibt eine spätere Phase.
- Weitere globale UI-System-Feinschliffe sollen in UI-dev zuerst gestaltet und danach in die echten Seiten übernommen werden.

## Verification Links

- Finaler Abschluss: `102-07-SUMMARY.md`
- UAT-Evidenz: `102-UAT-EVIDENCE.md`
- Review: `102-REVIEW.md`
- Learnings: `102-LEARNINGS.md`
