# Phase 155 — USER REQUEST (verbindlicher Originalauftrag)

Phase 155 – Fansub Project Read-Model & Performance Cleanup

## Arbeitsumgebung

Diese Phase wird vollständig auf der Team4s-Linux-VM geplant und ausgeführt.

Verbindlich:

- Repository, GSD, Tests, Build und Agentenläufe auf Linux (`/home/d1sk/team4s`)
- Windows nur als Kommunikations-/Steuerungsoberfläche
- aktuellen `main`-Stand verwenden, keine Worktrees, keine Feature-Branches
- niemals `git stash` bei offenen Änderungen; Artefakte gezielt per Pfad committen

## Ausgangslage

Die öffentliche Fansubprojektseite ist fachlich bereits gut aufgebaut und soll nicht neu gestaltet
oder neu erfunden werden.

Kanonischer Public-Pfad:

`/fansubs/[groupSlug]/fansubprojekt/[animeSlug]`

Von dort führen die beiden wichtigsten Drill-downs weiter zu:

**Projektbezogener Member**

`/fansubs/[groupSlug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]`

**Einzelnes Release**

`/fansubs/[groupSlug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]`

Die projektbezogene Member-Seite existiert bereits und zeigt unter anderem:

- Texte / Notes dieses Members in diesem Projekt
- von diesem Member hochgeladene Medien
- Release-Beteiligungen / Credits

Diese Struktur ist fachlich gewollt.

---

## Zentrale Produktentscheidung

Ein Klick auf einen Member innerhalb einer Fansubprojektseite führt immer zuerst auf dessen
projektbezogene Member-Seite.

Also:

„Fansubprojekt → Member im Projekt"

und nicht:

„Fansubprojekt → globales Public Member Profile"

Das globale Public-Profil `/members/[memberSlug]` darf von der projektbezogenen Member-Seite aus
zusätzlich erreichbar sein, ist aber nicht das primäre Klickziel aus dem Fansubprojekt.

Diese Regel gilt verbindlich für Phase 155.

---

## Ziel

Die öffentliche Fansubprojektseite soll dieselben sichtbaren Informationen wie heute liefern, aber
technisch deutlich schlanker werden.

Insbesondere:

- kein mehrfaches Laden des vollständigen Public Fansub Profiles
- kein vollständiges Public Profile nur zur Slug-/ID-Auflösung
- keine unnötig großen Release-Abfragen
- keine nicht gerenderten Daten vorladen
- keine Member-Detaildaten auf der Projektübersicht vorladen
- keine überlappenden Release-Projections für denselben Zweck
- schlanke Contributor-Projection
- sauberer Project Resolver
- bounded Query-/Request-Verhalten
- bestehende Project-Member- und Release-Drill-downs erhalten

Phase 155 ist eine Read-Model-, Datenfluss-, API- und Performance-Phase.

Kein UI-Redesign.

---

## 1. P1 – Project Resolver statt vollständigem Public Profile

Aktuell wird auf `/fansubs/[groupSlug]/fansubprojekt/[animeSlug]` das öffentliche Fansubprofil
verwendet, um unter anderem `animeSlug → animeID` beziehungsweise den Projektkontext aufzulösen.

Danach wird innerhalb des eigentlichen Project Loaders das Public Fansub Profile nochmals für
weitere Informationen benötigt.

Das erzeugt unnötig große und teilweise doppelte Read Models.

**Ziel**

Einen gezielten serverseitigen Project Resolver schaffen beziehungsweise eine bestehende passende
Repository-Grenze erweitern.

Mindestens:

`groupSlug + animeSlug` →

- `groupID`
- `animeID`
- Project Identity
- Canonical Slugs / Path

Optional, falls ohne große Zusatzlast sinnvoll:

- Previous Project
- Next Project

Nicht akzeptabel:

- vollständiges Public Fansub Profile nur zur ID-Auflösung
- komplettes Gruppenprofil als Resolver
- Doppelabfrage derselben Profile Projection

---

## 2. P1 – Contributor Projection deutlich verschlanken

Die Fansubprojektseite ist eine Übersicht.

Sie darf pro Member nur die Informationen laden, die sie tatsächlich für die sichtbare
Contributor-Darstellung benötigt.

**Erlaubte Daten auf der Projektseite**

Beispielsweise:

- Member-ID
- Member-Slug
- Nickname
- Avatar / kleines Artwork, falls sichtbar
- projektbezogene Rollen
- optional kleine Aggregate wie Anzahl Releases oder Contributions, aber nur wenn sichtbar und
  günstig verfügbar

**Nicht auf der Projektseite laden**

Insbesondere nicht:

- Texte / Release Notes des Members
- Media-Galerie des Members
- einzelne Media Assets
- vollständige Release-Beteiligungsliste
- komplette Contribution-Historie
- globale Member-Historie
- globale Memberships
- Badges des Gesamtprofils
- Stories des Members
- vollständiges Public Member Profile

Diese Daten gehören ausschließlich auf
`/fansubs/[groupSlug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]` und werden erst geladen,
wenn der Benutzer die Member-Seite tatsächlich öffnet.

**Ziel**

Klare Projection Separation:

*Fansub Project Contributor Summary* — klein, bounded, listenfähig.

*Project Member Detail* — Texte + Medien + Releases + weitere projektspezifische Details.

Keine Vermischung.

---

## 3. Member-Link verbindlich auf Project-Member Route

Jeder klickbare Member innerhalb der Fansubprojektseite soll kanonisch auf folgende Route führen:

`/fansubs/[groupSlug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]`

Nicht direkt auf `/members/[memberSlug]`.

**Prüfen**

- Contributor Cards
- Contributor Lists
- Latest Release Preview, falls dort Members verlinkt werden
- sonstige Member-Nennungen innerhalb des Project-Kontexts

Innerhalb eines Fansubprojekts soll der Benutzer fachlich zuerst im Projekt bleiben.

Das globale Public Member Profile kann auf der Project-Member-Seite als sekundäre Navigation
verlinkt werden.

---

## 4. P1/P2 – Überlappende Release-Datenpfade bereinigen

Aktuell werden Release-Daten auf der Projektseite über mehrere unterschiedliche Wege geladen.

Bekannte Muster:

- große Release-Abfrage mit `per_page: 100`
- Cursor-Abfrage für neuesten Release
- Detail-Abfrage für neuesten Release
- separate Cursor-Abfrage für die Release-Historie

Dadurch wird derselbe fachliche Bereich mehrfach projiziert.

**Zielstruktur**

**A. Latest Release Preview** — gezielte Projection nur für den neuesten sichtbaren Release. Nur die
Felder laden, die der sichtbare Preview tatsächlich benötigt.

**B. Release History** — cursor-basiert und bounded. Nur die Releases laden, die aktuell dargestellt
werden.

**C. Counts / Aggregate** — keine komplette Release-Liste laden, nur um `.length`, Anzahl Releases
oder `hasReleases` zu bestimmen. Stattdessen Count, Metadata, Aggregate Projection oder existierende
Query-Metadaten verwenden.

---

## 5. P2 – `per_page: 100` entfernen oder zwingend begründen

Die Projektseite besitzt bereits eine cursor-basierte Release-Historie.

Daher soll eine zusätzliche initiale Abfrage von bis zu 100 Releases nicht mehr benötigt werden.

**Ziel**

Das Request- und Query-Verhalten darf nicht proportional zur Gesamtanzahl aller Releases wachsen,
wenn die UI nur Latest Release, erste Seite der Historie und Counts benötigt.

Test auch mit großen Projekten.

---

## 6. P2 – Nicht gerenderte Daten nicht laden

Prüfe sämtliche Datenquellen des Project Loaders.

Bekannte Kandidaten:

- Themes
- Release Media
- Flags wie `hasThemes`
- Flags wie `hasMedia`

Wenn kein sichtbarer Consumer existiert:

«No render consumer → no initial fetch.»

Keine vorsorglichen API-Aufrufe für möglicherweise spätere UI-Funktionen.

---

## 7. Bestehende Project-Member-Seite bleibt erhalten

Bestehender Pfad `/fansubs/[groupSlug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]` ist
ausdrücklich nicht neu zu bauen.

Sie soll weiterhin projektbezogen anzeigen können:

- Texte / Notes
- Medien
- Release-Beteiligungen
- Contributions, soweit bereits Bestandteil des bestehenden Contracts

Phase 155 soll lediglich sicherstellen, dass die Projektseite sauber auf diese Detailansicht
verlinkt und deren Daten nicht selbst vorlädt.

---

## 8. Projekt-Member-Daten fachlich getrennt halten

Keine neue Tabelle einführen, nur damit die Projektseite Member-Inhalte schneller darstellen könnte.

Bestehendes Prinzip:

Texte bleiben fachlich am jeweiligen Release / der Release-Version.

Medien bleiben fachlich am jeweiligen Release-/Media-Kontext.

Beteiligungen bleiben an den bestehenden Contribution-/Release-Rollen-Strukturen.

Die Projekt-Member-Seite ist lediglich eine Projection über „Projekt + Member".

Keine Daten duplizieren.

---

## 9. Release Drill-down erhalten

Bestehender Pfad `/fansubs/[groupSlug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]` muss
vollständig funktionieren.

Prüfen:

- Latest Release
- Release History
- Mobile Release Cards
- Desktop Release Rows
- direkte Navigation
- Back Navigation

Die Release-Detailseite selbst wird in einer späteren Phase separat untersucht. Phase 155 soll dort
keinen großen Umbau durchführen.

---

## 10. Bestehende Projekt-UI grundsätzlich behalten

Kein Redesign.

Bestehende Informationsarchitektur grundsätzlich erhalten:

1. Hero
2. Projektgeschichte
3. Mitwirkende
4. neuestes Release
5. Release-Historie
6. Projekt-Navigation / Backlinks

**Produktentscheidung**

Der Bereich „Neuestes Fansub-Release" bleibt bestehen. Frühere Entscheidungen, diesen Block zu
entfernen, nicht automatisch wieder anwenden.

Keine Phase-155-Arbeit darf die Seite in eine rein technische Tabellenansicht umbauen.

---

## 11. Request- und Query-Budget

Vor und nach der Umsetzung messen.

Mindestens dokumentieren:

- Backend Requests beim initialen Project Load
- Repository-/DB-Queries
- Public Profile Requests
- Contributor-bezogene Requests
- Release-bezogene Requests
- initiale JSON-Größe
- TTFB, sofern reproduzierbar
- Verhalten bei vielen Contributors
- Verhalten bei vielen Releases

**Ziel**

Query-/Request-Verhalten soll bounded bleiben.

Insbesondere:

- kein Request pro Member
- kein Request pro Release
- kein Laden vollständiger Member-Details pro Contributor
- kein vollständiges Public Profile zur Slug-Auflösung
- kein komplettes Release-Inventar nur für Counts
- kein doppelter Profil-Load

---

## 12. Contributor-Performance-Test

Explizit einen Testfall mit vielen Mitwirkenden verwenden.

Beispiel:

- 30–50 Contributors
- viele Release-Beteiligungen
- mehrere Notes
- viele Media Uploads pro Member

Die Project Page darf dadurch nicht anfangen, Member-Detaildaten mitzuladen.

Erwartung: Contributor Summary bleibt proportional klein. Member-Detaildaten werden erst auf der
Member-Detailroute geladen.

---

## 13. API-/DTO-Grenzen

Falls die bestehende Contributor API zu groß ist, eine gezielte Summary Projection einführen.

Beispielhaft `ProjectContributorSummary` mit nur den benötigten Feldern.

Keine Wiederverwendung eines großen DTOs nur aus Bequemlichkeit, wenn dadurch unnötige Joins oder
Payload entstehen.

Ebenso für Releases: `LatestReleasePreview` und `ReleaseHistoryItem` dürfen unterschiedliche
Projections besitzen, wenn sie unterschiedliche Anforderungen haben.

Nicht alles in ein riesiges Universal-DTO pressen.

---

## 14. Datenbank / Tabellen

Keine neue Tabelle automatisch einführen.

Zuerst prüfen, ob bestehende Relationen ausreichen.

Relevant sind insbesondere vorhandene Beziehungen zwischen:

- Fansub Group
- Anime
- Fansub Project
- Member
- Contributions
- Releases
- Release Versions
- Release Notes
- Release Member Roles
- Media Assets / Release Version Media

Schemaänderungen nur bei einer echten fachlichen Lücke.

Keine Materialisierung nur wegen bequemer UI-Abfragen, solange vorhandene Indizes/Queries sauber
lösbar sind.

---

## 15. Indizes prüfen

Für neu beziehungsweise häufiger genutzte Resolver- oder Summary-Queries prüfen, ob passende Indizes
vorhanden sind.

Insbesondere für typische Filter wie:

- group slug
- anime slug
- project/group/anime relation
- member + project
- release/project
- uploader/member
- author/member

Keine Indizes blind hinzufügen. Query Plan beziehungsweise vorhandene Nutzung prüfen.

---

## 16. Security und Visibility

Keine neue Security-Phase, aber bestehende Grenzen erhalten.

Public Project Resolver und Contributor Summary dürfen nur öffentliche Informationen liefern.

Prüfen:

- keine internen Rollen/Permissions
- keine versteckten Member-Daten
- keine privaten Texte/Medien
- bestehende Visibility-Filter nicht umgehen
- sauberes Not-found-Verhalten
- Project Member Detail respektiert weiterhin bestehende Visibility-Regeln

---

## 17. Error / Edge Cases

Mindestens testen:

- unbekannter `groupSlug`
- unbekannter `animeSlug`
- Gruppe existiert, Projekt nicht
- Projekt ohne Contributors
- Projekt ohne Releases
- Projekt mit einem Release
- Projekt mit vielen Releases
- Projekt mit vielen Contributors
- Member ohne Texte
- Member ohne Medien
- Member ohne Release-Beteiligungen
- direkte Project-Member URL
- direkte Release URL
- Previous Project am Listenanfang
- Next Project am Listenende
- Reload Pretty URL
- keine Redirect-Schleifen

---

## 18. Tests

**Backend**

Mindestens:

- Project Resolver Tests
- Slug Resolution
- Not-found Semantik
- Contributor Summary Tests
- keine Detaildaten im Summary Contract
- Release Summary / Cursor Tests
- Query-Budget beziehungsweise bounded-query Tests, wo sinnvoll

**Frontend**

Mindestens:

- Project Page Rendering
- Contributor List
- Member-Klick führt auf Project-Member Route
- kein direkter Wechsel zum globalen Member-Profil
- Latest Release Preview
- Release History
- Empty States
- Previous/Next Navigation

Bestehende Project-Member Tests weiterlaufen lassen.

---

## 19. Vorher/Nachher-Dokumentation

Der Abschlussbericht muss konkret zeigen:

**Vorher**

- welche API Calls beim Project Load liefen
- wie oft das Public Fansub Profile geladen wurde
- welche Contributor-Daten geladen wurden
- welche Release-Daten mehrfach geladen wurden
- welche unbenutzten Daten geladen wurden
- ungefähre Payload-/Query-Kosten

**Nachher**

- neuer Resolver Flow
- neue Project Projection
- Contributor Summary Contract
- Latest Release Flow
- Release History Flow
- reduzierte Requests
- reduzierte Queries
- reduzierte Payload
- TTFB-Vergleich, falls sinnvoll messbar

---

## 20. Nicht-Ziele

Phase 155 soll NICHT:

- die Fansubprojektseite visuell neu gestalten
- die Project-Member-Seite neu gestalten
- die Release-Detailseite komplett umbauen
- neue Rollen erfinden
- Member-Texte oder Medien duplizieren
- neue Content-Tabellen nur für Anzeigezwecke einführen
- globale Member-Profile entfernen
- RCA-04 aus Phase 154 erneut untersuchen
- funktionierende Domain-Strukturen ohne belegten Grund ersetzen

---

## Abnahmekriterien

Phase 155 ist erst abgeschlossen, wenn:

- `groupSlug + animeSlug` ohne vollständiges Public Fansub Profile aufgelöst werden können
- kein doppelter Public-Profile-Load im normalen Project-Request mehr vorhanden ist
- Contributor Summary keine Member-Detaildaten lädt
- Member-Klick auf der Projektseite kanonisch auf die Project-Member Route führt
- Texte, Medien und Release-Beteiligungen erst auf der Project-Member-Seite geladen werden
- keine Request-Fan-outs pro Member vorhanden sind
- nicht gerenderte Theme-/Media-Daten nicht mehr initial geladen werden
- `per_page: 100` als versteckte Vollinventar-Abfrage entfernt oder nachweislich nicht mehr benötigt
  wird
- Latest Release und Release History keine unnötigen Daten doppelt beschaffen
- Project-Member-Route weiterhin funktioniert
- Release-Route weiterhin funktioniert
- Empty-/404-Zustände funktionieren
- Query-/Request-Verhalten bounded ist
- Vorher/Nachher-Messung dokumentiert ist
- Tests grün sind
- Working Tree sauber ist

---

## Leitprinzip

Das vorhandene Navigationsmodell bleibt:

„Fansub → Fansubprojekt"

Von dort: „→ Member im Projekt → Texte / Medien / Releases" oder „→ Release → Release-Detail"

Die Projektseite ist eine Übersicht und soll deshalb nur kleine Summary-Projections laden.
Detaildaten werden erst dort geladen, wo sie tatsächlich gebraucht werden.

Keine Daten auf Vorrat laden.
