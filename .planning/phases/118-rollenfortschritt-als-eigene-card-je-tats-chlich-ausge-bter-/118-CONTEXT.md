# Phase 118: Rollenfortschritt als eigene Card je Fansubrolle - Context

**Gathered:** 2026-08-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 118 gestaltet die rollenbezogenen Auszeichnungen im öffentlichen Memberprofil neu: Jede tatsächlich ausgeübte, durch mindestens ein öffentlich verdientes Rollen-Badge belegte Fansubrolle erhält eine eigene Fortschritts-Card. Die Card zeigt die höchste erreichte Medaille groß, bewahrt die vollständige sichtbare Entwicklung aus Einstieg, Bronze, Silber, Gold und Platin und erklärt den Weg zur nächsten Stufe. Mehrere Rollen werden über ein responsives Focal-Carousel dargestellt.

Die Phase konsolidiert außerdem die vorhandene Karussellmechanik: Vor der Umsetzung wird inventarisiert, wo `FocalCarousel` und lokale Carousel-/Scroll-/Snap-Logik verwendet werden. Interaktion und Bewegungsverhalten sollen aus einer global wiederverwendbaren Komponente stammen; fachlicher Inhalt und Card-Größe bleiben je Einsatzort flexibel. Keine neuen Badge-Schwellen, Punktequellen, Buchungspfade oder historischen Rangdaten.

</domain>

<decisions>
## Implementation Decisions

### Rollenspezifische Fortschrittsberechnung
- **D-01:** Jede sichtbare Rolle berechnet ihren Fortschritt unabhängig. Fremde oder nicht verdiente Rollen bleiben vollständig ausgeblendet und beeinflussen keinen allgemeinen Auszeichnungsfortschritt.
- **D-02:** Die Leiste zeigt immer den Gesamtwert bis zur nächsten noch nicht erreichten Stufe, nicht einen zurückgesetzten Abschnitt seit der letzten Stufe. Beispiel: `50 von 108 Mitwirkungen`, nicht `(50−12) von (108−12)`.
- **D-03:** Unter der Leiste stehen beide Informationen: aktueller Stand und Restmenge, zum Beispiel `50 von 108 Mitwirkungen · Noch 58 bis Silber`.
- **D-04:** Beim exakten Erreichen einer Schwelle wird die neue Medaille sofort erreicht dargestellt und das Fortschrittsziel wechselt unmittelbar zur nächsten Stufe.

### Rollen-Card und Medaillensammlung
- **D-05:** Die höchste aktuell erreichte Medaille ist das große zentrale Artwork. Direkt darunter steht ein Rang-Chip im Format `Gold · 320+`.
- **D-06:** Darunter bleibt die vollständige Reihe aus fünf echten Badge-Bildern sichtbar: Einstieg, Bronze, Silber, Gold und Platin. Erreichte Stufen sind farbig; zukünftige Stufen sind gedimmt und gesperrt.
- **D-07:** Die groß dargestellte aktuelle Medaille wird in der kleinen Fünferreihe nochmals wiederholt und eindeutig mit `Aktuell` markiert. Gewählte Referenz: Sketch 001, Variante A „Vollständige Sammlung“.
- **D-08:** Auf Mobile bleibt die vollständige Fünferreihe ohne inneres horizontales Scrollen sichtbar. Die große Medaille skaliert auf etwa 240–260 px; die Fortschrittstexte dürfen untereinander umbrechen.

### Globales Focal-Carousel
- **D-09:** Mehrere Rollen liegen als einzelne Cards in einem gemeinsamen horizontalen Rollen-Karussell. Gewählte Referenz: Sketch 002, Variante A „Ein Rollen-Karussell“.
- **D-10:** Die Bewegung ist kontinuierlich: Während Drag, Touch-Swipe, Trackpad- oder Mausradbewegung folgt der Track direkt, die kommende Card wächst stufenlos und die bisherige wird schmaler. Nach dem Loslassen rastet die nächstgelegene Card weich ein.
- **D-11:** Ein kräftiger Swipe oder schneller Maus-Drag darf mit natürlichem Schwung mehrere Cards überspringen. Die Pfeile bleiben ergänzende Navigation, nicht der primäre Bewegungsmodus.
- **D-12:** Das vertikale Mausrad steuert das Karussell, solange der Zeiger darüber liegt. Am Anfang und Ende muss normales Seitenscrollen wieder möglich sein.
- **D-13:** Responsiv abgestuft: Desktop zeigt die aktive Card plus zwei deutlich sichtbare schmale Nachbarn; Tablet zeigt zwei schmalere Randkarten; Mobile zeigt eine fast vollbreite aktive Card plus kleinen Anschnitt der nächsten Card.
- **D-14:** Erste und letzte Card rasten auf jedem Viewport vollständig im Zentrum ein. Der im Sketch gefundene Endpunktfehler ist ausdrücklich als Regressionstest abzudecken; skalierte DOM-Breiten dürfen die Snap-Berechnung nicht verfälschen.
- **D-15:** Bei `prefers-reduced-motion` entfallen langer Schwung und kontinuierliche Skalierung. Es bleibt eine sehr kurze, ruhige Einrastbewegung mit identischem Inhalt.
- **D-16:** Das Karussell ist als eine Tastaturstation erreichbar. Pfeiltasten aktivieren und zentrieren eine ganze Card; die fünf Medaillen erzeugen keine fünf zusätzlichen Tabstopps.
- **D-17:** Orientierung erfolgt über einen kompakten Zähler wie `3 von 11 Rollen`; keine zusätzlichen Positionspunkte.
- **D-18:** Interaktion, Drag/Touch/Mausrad, Momentum, Snap, Skalierung, Endpunktzentrierung, Tastatur und Reduced Motion werden in einer global wiederverwendbaren Carousel-Komponente gepflegt. Inhalt, Card-Abmessungen, Glow und fachliche Beschriftung bleiben über Props/Slots flexibel.
- **D-19:** Vor Änderungen wird ein verbindliches Carousel-Inventar erstellt: alle `FocalCarousel`-Nutzungen, lokale Scroll-/Snap-Implementierungen, bewusst abweichende Navigationskomponenten und sinnvolle Migrationskandidaten. Keine neue parallele Carousel-Logik.

### Sonderzustände
- **D-20:** Vor Bronze ist das verdiente Einstiegs-Badge die große Medaille. Die Leiste zeigt den Weg bis Bronze, zum Beispiel `5 von 12 · Noch 7 bis Bronze`.
- **D-21:** Bei Platin sind alle fünf Medaillen farbig, Platin ist groß und als aktuell markiert. Die volle Leiste bleibt sichtbar und zeigt `510 Mitwirkungen · Höchste Stufe erreicht`.
- **D-22:** Unterschreitet die Netto-Anzahl durch Storno eine Schwelle, erfolgt die Live-Rückstufung sofort. Große Medaille, gesperrte Stufen, Fortschritt und nächstes Ziel werden neu berechnet.
- **D-23:** Fällt eine Rolle auf null bestätigte Mitwirkungen, verschwindet ihre ganze Card. Es gibt keine leere oder vollständig gesperrte Rollen-Card.

### the agent's Discretion
- Exakte responsive Pixelwerte innerhalb der in D-08/D-13 festgelegten visuellen Wirkung.
- Physikparameter für Momentum, Dämpfung und Snap-Dauer, solange D-10 bis D-15 und Barrierefreiheit erfüllt sind.
- Interner Prop-/Hook-Schnitt der globalen Komponente nach Inventar und bestehendem UI-System.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Produkt- und Badge-Entscheidungen
- `.planning/ROADMAP.md` — Phase-118-Grenze und Abhängigkeit vom bestehenden Badge-System.
- `.planning/phases/110-member-badges-ranglisten-ui-und-e2e-abnahme/110-CONTEXT.md` — Rollen-Einstiegs-Badges, Earned-only-Grundsatz und erweiterbarer Auszeichnungscontainer.
- `.planning/phases/112-member-punkt-meilenstein-badges/112-CONTEXT.md` — Rollen-Credit-Basis, Live-Rückstufung und Schwellen 12/108/320/510.
- `.planning/quick/260802-c5f-rollen-auszeichnungen-aus-dem-gesamtfort/260802-c5f-SUMMARY.md` — bereits umgesetzte Trennung der Fansubrollen vom allgemeinen Auszeichnungsfortschritt.

### Gewählte UI-Referenzen
- `.planning/sketches/001-rollenfortschritt-card/index.html` — gewählte Card-Variante A mit großer aktueller Medaille und vollständiger Fünferreihe.
- `.planning/sketches/001-rollenfortschritt-card/README.md` — Designfrage, Varianten und Gewinnerbegründung.
- `.planning/sketches/002-mehrere-rollen-karussell/index.html` — gewählte Mehrrollen-Variante A sowie korrigierte Endpunktzentrierung.
- `.planning/sketches/002-mehrere-rollen-karussell/README.md` — Seitenaufbau und Gewinnerbegründung.

### Projekt- und UI-Regeln
- `AGENTS.md` — korrekte deutsche Umlaute, bestehende UI-Patterns wiederverwenden, Live-Browser-UAT und kleine fokussierte Diffs.
- `docs/engineering/implementation-contract.md` — bestehende Seams inventarisieren und erweitern statt parallele Helfer zu bauen.
- `docs/frontend/ui-system.md` — globale UI-Komponenten und responsiver Komponentenvertrag.
- `docs/agent-guidelines-ui.md` — semantische, responsive und barrierefreie UI-Ausführung.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/components/ui/FocalCarousel.tsx` — bestehende globale Carousel-Seam; primärer Kandidat für die gemeinsame Interaktionslogik.
- `frontend/src/components/ui/FocalCarousel.test.tsx` — bestehende Testbasis für Bewegung, Navigation und Endpunktregressionen.
- `frontend/src/components/profile/MemberBadgeChain.tsx` — bestehende Rollen-Gruppierung, Artwork-Auflösung und Profilintegration.
- `frontend/src/components/profile/memberBadgeLabels.ts` — Rollen-, Stufen-, Badge-Code- und Schwellenpräsentation.
- `frontend/src/components/fansubs/FansubProjectsGrid.tsx` — zweiter bekannter produktiver Nutzer von `FocalCarousel`.

### Established Patterns
- Verdiente Rollen-Badges sind die einzige Quelle sichtbarer Rollen; die vollständige Stufenkette wird erst nach Sichtbarkeitsentscheidung aufgebaut.
- Rollen-Volumen ist eine Live-Projektion aus Netto-Release-Credits; Storno kann Rang und Sichtbarkeit reduzieren.
- Carousel-Inhalt wird fachlich außerhalb der globalen UI-Komponente komponiert.

### Integration Points
- Öffentliche Profilroute `frontend/src/app/members/[slug]/page.tsx` liefert die Badge-Daten an `MemberBadgeChain`.
- `frontend/src/components/ui/index.ts` exportiert die globale UI-Komponente.
- Das Inventar muss mindestens `MemberBadgeChain.tsx`, `FansubProjectsGrid.tsx`, `FocalCarousel.tsx` sowie lokale `scroll-snap`-/`scrollIntoView`-Nutzungen prüfen und fachlich echte Carousels von Abschnittsnavigation oder DatePicker-Scroll unterscheiden.

</code_context>

<specifics>
## Specific Ideas

- Nutzerformulierung: Das Karussell soll sich nicht wie „statisches Durchklicken“ anfühlen, sondern beim Scrollen sichtbar von schmaler Randkarte zur großen aktiven Card übergehen und interaktiv einrasten.
- Nutzeranforderung: Dieselbe Karusselllogik kommt an mehreren Stellen der Seite vor und darf nicht mehrfach neu gebaut werden.
- Live im Mockup gefundener Fehler: Die letzte Card wurde wegen Messung einer transformiert verkleinerten Card nicht zentriert. Endpunktzentrierung ist daher ein ausdrückliches Akzeptanzkriterium.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 118-rollenfortschritt-cards-und-globales-focal-carousel*
*Context gathered: 2026-08-02*
