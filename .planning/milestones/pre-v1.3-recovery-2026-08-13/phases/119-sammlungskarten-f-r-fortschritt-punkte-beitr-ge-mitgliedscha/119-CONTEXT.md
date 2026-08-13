# Phase 119: Sammlungskarten fuer Fortschritt, Punkte, Beitraege, Mitgliedschaft und besondere Auszeichnungen - Context

**Gathered:** 2026-08-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Die uebrigen Badge-Bereiche des oeffentlichen Memberprofils werden nach dem in Phase 118 etablierten Sammlungskarten-Prinzip strukturiert: Fortschritt, Punkte-Meilensteine, Beitraege, Mitgliedschaft und besondere Auszeichnungen. Die Phase aendert Darstellung und Interaktion der vorhandenen Badges; sie fuehrt keine neuen Buchungs-, Punkte- oder Freischaltregeln ein.

</domain>

<decisions>
## Implementation Decisions

### Aufteilung der Sammlungskarten
- **D-01:** Fortschritt bildet eine Sammlung aus Erste Mitwirkung, 10, 25 und 50 Anime-Projekten.
- **D-02:** Punkte-Meilensteine bilden eine erweiterbare Sammlung aus allen vorhandenen Punktestufen.
- **D-03:** Beitraege bilden drei getrennte Sammlungen: Mitgetragene Projekte, Chronikpflege und Bildarchivpflege; Bronze, Silber und Gold bleiben Stufen ihrer jeweiligen Familie.
- **D-04:** Mitgliedschaft bildet eine Sammlung. Gruendungsmitglied ist die besondere Startstufe vor 5, 7 und 10 Jahren.
- **D-05:** Jede erhaltene besondere Auszeichnung bildet eine eigene einstufige Sammlungskarte ohne kuenstlichen Fortschritt.
- **D-06:** Neue Stufen werden automatisch an die kanonische Sammlung ihrer Familie angehaengt. Ein Badge erscheint auf der Profilseite genau einmal und wird nicht kategorienuebergreifend dupliziert.

### Hauptmotiv und Stufenleiste
- **D-07:** Das grosse Hauptmotiv zeigt standardmaessig die hoechste erreichte Stufe. Ist noch nichts erreicht, zeigt es die erste Stufe ausgegraut als Ziel.
- **D-08:** Eine laufende Serie zeigt aktuellen Wert, naechstes Ziel und verbleibende Menge. Eine abgeschlossene Serie zeigt eine volle Leiste und `Hoechste Stufe erreicht`.
- **D-09:** Alle erreichten Stufen bleiben in voller Farbe sichtbar; nur die hoechste erreichte Stufe traegt `Aktuell`.
- **D-10:** Erreichte kleine Stufen sind als temporaere Grossansicht anklickbar. Der echte Rang behaelt `Aktuell`, die betrachtete Stufe erhaelt `Ausgewaehlt`.
- **D-11:** Lange Stufenleisten bleiben auf Mobile horizontal scrollbar und bringen die aktuelle Stufe automatisch ins Sichtfeld.

### Noch nicht erreichte Badges
- **D-12:** Zukuenftige Stufen zeigen ihr Motiv ausgegraut mit Schloss, sind aber nicht anklickbar.
- **D-13:** Nicht erhaltene besondere Auszeichnungen werden nicht angezeigt. Besitzt ein Mitglied keine besondere Auszeichnung, wird der gesamte Bereich ausgeblendet.

### Aufbau der Profilseite
- **D-14:** Reihenfolge: Rollen, Fortschritt, Punkte-Meilensteine, Beitraege, Mitgliedschaft, besondere Auszeichnungen.
- **D-15:** Jede Kategorie verwendet das globale Karussell. Kategorien mit nur einer Sammlungskarte zeigen eine ruhige Einzelkarte ohne Pfeile oder Positionspunkte.
- **D-16:** `Alle Auszeichnungen in ... anzeigen` oeffnet ein Inline-Raster im jeweiligen Bereich. Mehrere Raster duerfen unabhaengig gleichzeitig geoeffnet bleiben.

### the agent's Discretion
- Exakte Abstaende, responsive Breakpoints und interne Helper-Aufteilung, solange Phase 118, das globale UI-System und die Entscheidungen oben eingehalten werden.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Rollen-Sammlung und globales Karussell
- `.planning/phases/118-rollenfortschritt-als-eigene-card-je-tats-chlich-ausge-bter-/118-CONTEXT.md` — verbindliche Sammlungskarten- und Karussellentscheidungen der direkten Vorphase.
- `.planning/phases/118-rollenfortschritt-als-eigene-card-je-tats-chlich-ausge-bter-/118-UI-SPEC.md` — responsive und visuelle Referenz fuer Sammlungskarten.
- `.planning/quick/260803-be5-rollenbadges-visuell-vereinheitlichen-ka/260803-be5-SUMMARY.md` — korrigierte Center-Logik, 1480-px-Profilbreite und Overflow-UAT.

### UI- und Implementierungsvertrag
- `docs/engineering/implementation-contract.md` — Search-first- und Reuse-Regeln.
- `docs/frontend/ui-system.md` — globales UI-System.
- `docs/agent-guidelines-ui.md` — Screenshot-, Responsive- und Diff-Regeln.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/components/profile/MemberBadgeChain.tsx`: bestehende Kategorien, Badge-Katalog-Merge, Rollen-Sammlung und Alle-anzeigen-Verhalten.
- `frontend/src/components/profile/MemberBadgeChain.module.css`: vierlagige Badge-Grafik, Stufenleiste, Responsive-Regeln und 1480-px-Sektionsflaeche.
- `frontend/src/components/ui/FocalCarousel.tsx`: einziges globales Focal-Carousel fuer Scroll, Touch, Snap, Endzentrierung und Positionsanzeige.
- `frontend/src/lib/memberBadgeLabels.ts`: vorhandene Badge-Familien, Schwellen und Presentations.

### Established Patterns
- Eine Badge-Familie wird als grosse Sammlungskarte mit Hauptmotiv, Stufenleiste und naechstem Ziel dargestellt.
- Die aktive Karussellposition wird aus der physischen Kartenmitte abgeleitet; consumer-lokale Karussellimplementierungen sind nicht erlaubt.
- Erreichte Badges bleiben sichtbar; Freischaltungen bleiben live abgeleitet und erzeugen keinen neuen Buchungspfad.

### Integration Points
- Oeffentliches Memberprofil `/members/[slug]` und dessen bestehende `MemberBadgeChain`-Daten.
- Vorhandene Kategoriegruppen Fortschritt, Punkte-Meilensteine, Beitraege, Mitgliedschaft und besondere Auszeichnungen.
- Bestehendes Inline-Raster hinter `Alle Auszeichnungen in ... anzeigen`.

</code_context>

<specifics>
## Specific Ideas

- Phase 118 ist das Zielbild: grosses Anime-Medaillenmotiv, darunter kleine Sammlung, Fortschritt und ein physisch einrastendes Karussell.
- Die Seite soll nicht jede einzelne Medaille als grosse Karte laden; die Serie ist die grosse Karte.
- Besondere Auszeichnungen wirken als erhaltene Ehrung und nicht als vorhersehbare, gesperrte Zielserie.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 119-Sammlungskarten fuer Fortschritt, Punkte, Beitraege, Mitgliedschaft und besondere Auszeichnungen*
*Context gathered: 2026-08-03*
