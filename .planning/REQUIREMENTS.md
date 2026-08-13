# Requirements: Team4s v1.3 Public Member Profile Hardening

**Defined:** 2026-08-13
**Core Value:** Team4s presents fansub history and collaboration credibly while keeping identity, visibility, ownership, and permissions correct.
**Milestone Goal:** Make the public member profile data-correct, privacy-safe, performant, maintainable, and consistently usable from mobile through widescreen.

## Milestone v1.3 Requirements

### Identität und Routing

- [x] **PMID-01**: Jedes öffentliche Memberprofil besitzt einen eindeutigen, in PostgreSQL gespeicherten Slug.
- [x] **PMID-02**: Eine Änderung des Nicknames verändert den öffentlichen Slug nicht.
- [ ] **PMID-03**: Profilverlinkungen verwenden ausschließlich den kanonischen Slug; numerische und dynamisch erzeugte Fallbacks entfallen.

### Datenschutz und Sichtbarkeit

- [ ] **PMPR-01**: Anonyme Zugriffe können ein verborgenes Profil nicht von einem nicht vorhandenen Profil unterscheiden.
- [ ] **PMPR-02**: Sichtbarkeit und verifizierter Owner-Zugriff werden geprüft, bevor Profildetails geladen werden.
- [ ] **PMPR-03**: Profil, Projekte, Contributions, Medien und weitere Member-Unterressourcen verwenden dieselbe zentrale Zugriffsregel.
- [ ] **PMPR-04**: Der Owner kann ein verborgenes Profil über die zentrale Auth-Refresh-Seam als Vorschau öffnen.
- [ ] **PMPR-05**: Owner- und viewer-spezifische Antworten werden nicht öffentlich gecacht.
- [ ] **PMPR-06**: Interne Mitgliedschaften, Berechtigungen und nicht öffentliche Quellen werden nicht über öffentliche DTOs oder Aggregate offengelegt.

### Datenkorrektheit

- [ ] **PMDA-01**: Status, Memorial-Status, Aktivzeitraum und unvollständige Datumsangaben werden fachlich korrekt und vertrauenswürdig dargestellt.
- [ ] **PMDA-02**: Aktuelle und historische Mitgliedschaften bleiben getrennte Fakten und werden aus ihren kanonischen Tabellen geladen.
- [ ] **PMDA-03**: Contributions und Projekte erscheinen nur, wenn sie bestätigt und für das öffentliche Profil freigegeben sind.
- [ ] **PMDA-04**: Rollen werden mit stabilem Code und öffentlichem Label geliefert; das Frontend leitet Codes nicht aus übersetzten Labels ab.
- [ ] **PMDA-05**: Doppelte Rollen, Projekte, Contributions und Badges werden anhand ihrer fachlichen Identität dedupliziert.
- [ ] **PMDA-06**: Punkte und Badges bleiben serverseitig autoritativ; exakte Fortschritte enthalten ausschließlich öffentlich zulässige Fakten.
- [ ] **PMDA-07**: Release-Texte und Medien erfüllen Sichtbarkeits-, Review-, Ready- und Löschfilter und bleiben release-version-spezifisch verknüpft.
- [ ] **PMDA-08**: Angezeigte Summen stimmen mit den tatsächlich sichtbaren, gefilterten Datensätzen überein.
- [ ] **PMDA-09**: Ungenutzte Legacy-Projektionen und redundante Recent-Daten werden entfernt.
- [ ] **PMDA-10**: Öffentliche Mitgliedschaften zeigen alle freigegebenen Rollen, nicht nur die erste; interne Berechtigungen bleiben verborgen.
- [ ] **PMDA-11**: Aktivitätsfeed, Überschrift, Zähler und Filter verwenden dieselbe Datenbasis; „Mehr anzeigen“ lädt tatsächlich weitere Einträge.

### API- und Contract-Integrität

- [ ] **PMCT-01**: Das öffentliche Profil verwendet einen eigenen minimalen Allowlist-DTO statt interner Edit- oder Owner-Strukturen.
- [ ] **PMCT-02**: Private IDs, Berechtigungen, Originalquellen und nicht freigegebene Medienfelder fehlen nachweislich in öffentlichen Antworten.
- [ ] **PMCT-03**: SQL-Projektion, Go-DTO, Handler, OpenAPI, TypeScript und `api.ts` stimmen vollständig überein.
- [ ] **PMCT-04**: Sichtbar, verborgen, nicht vorhanden und Fehler besitzen dokumentierte, typisierte Antwortpfade.
- [ ] **PMCT-05**: Rollen-, Status- und Badge-Tier-Enums einschließlich Platin sind in allen Vertragsschichten vollständig.
- [ ] **PMCT-06**: Listen besitzen dokumentierte Grenzen, stabile Sortierung und einen ehrlichen Pagination-Vertrag.
- [ ] **PMCT-07**: Ungenutzte Recent-Endpunkte und Felder werden entfernt; verbleibende Unterressourcen erhalten denselben Sichtbarkeits- und Review-Filter.
- [ ] **PMCT-08**: Next.js-PageProps, Route-Parameter, Metadaten und API-Typen entsprechen den realen Framework- und OpenAPI-Verträgen.

### Performance und Auslieferung

- [ ] **PMPF-01**: Die Anzahl der Profilabfragen bleibt unabhängig von der Projektanzahl konstant; N+1-Abfragen entfallen.
- [ ] **PMPF-02**: Das Nachladen von Projekten oder Contributions lädt nicht erneut das vollständige Profil.
- [ ] **PMPF-03**: Initiale und nachgeladene Listen sind fest begrenzt und übertragen keine vom UI ungenutzten Kinddaten.
- [ ] **PMPF-04**: Indizes werden nur nach repräsentativem `EXPLAIN (ANALYZE, BUFFERS)` für beide Testprofile ergänzt.
- [ ] **PMPF-05**: Öffentliche und viewer-spezifische Cache-Klassen bleiben getrennt; Shared Cache wird nur mit Messung und vollständiger Invalidierung eingeführt.
- [ ] **PMPF-06**: Profilbilder und Badges verwenden geeignete Varianten, korrekte `sizes`, reservierte Geometrie und begrenzte Qualität.
- [ ] **PMPF-07**: Query-Anzahl, Payload-Größe, Latenz, Bild-Waterfall und Web-Vitals werden reproduzierbar erfasst und gegen feste Abnahmegrenzen geprüft.
- [ ] **PMPF-08**: Bildquellen werden komprimiert; Asset- und Transferbudgets sind festgelegt und lokale-IP-Bildoptimierung bleibt auf Test und Entwicklung begrenzt.

### Frontend und Codequalität

- [ ] **PMFE-01**: Öffentliches Profil und Owner-Vorschau verwenden dieselbe Profilkomposition und denselben Backend-DTO.
- [ ] **PMFE-02**: Profil-, Owner- und Korrekturaktionen verwenden einen zentralen Request- und Session-Pfad ohne doppelte `getOwnProfile`-Logik.
- [ ] **PMFE-03**: Paging, Carousel und Erweiterungszustände sind sluggebunden, abbrechbar, dedupliziert und gegen veraltete Antworten geschützt.
- [ ] **PMFE-04**: Loading-, Empty-, Hidden-, Missing- und Fehlerzustände werden fachlich getrennt und lokal dargestellt.
- [ ] **PMFE-05**: Wiederholte Badge-Konfiguration, Ableitungen, Formatierung und UI-Kontrollen werden an vorhandenen gemeinsamen Seams konsolidiert.
- [ ] **PMFE-06**: Nicht offensichtliche Privacy-, Aggregations- und Zustandsinvarianten erhalten kurze Zweckkommentare; selbsterklärender JSX-Code wird nicht überkommentiert.
- [ ] **PMFE-07**: Seitentitel und Metadaten beschreiben das konkrete Memberprofil sinnvoll.
- [ ] **PMFE-08**: Lange Inhalte und umfangreiche Auszeichnungen verwenden progressive Offenlegung statt ungebremster Seitenlänge.
- [ ] **PMFE-09**: Relative Datumsanzeigen sind SSR- und Hydration-stabil und hängen während des Renderns nicht unkontrolliert von `Date.now()` ab.
- [ ] **PMFE-10**: Owner-, Vorschau- und Korrekturaktionen arbeiten fail-closed, deduplizieren Profilanfragen und verhindern Request-Races.
- [ ] **PMFE-11**: Top-Rollen, bekannte Gruppen und Summen werden aus dem vollständigen freigegebenen Datensatz berechnet, nicht aus der ersten Projektseite.

### Responsive Darstellung und CSS

- [ ] **PMUI-01**: Das Profil funktioniert mobile-first ohne horizontales Abschneiden oder versteckte Überläufe.
- [ ] **PMUI-02**: Zwischenbreiten und Breitbild nutzen den verfügbaren Raum kompakt, ohne übergroße Karten oder leere Flächen.
- [ ] **PMUI-03**: Wiederverwendbare Profilkomponenten reagieren über Container-Geometrie statt gerätespezifischer Breakpoints.
- [ ] **PMUI-04**: Achievement-, Hero-, Membership- und Seitenlayout-Stile werden in klar verantwortete CSS-Module aufgeteilt.
- [ ] **PMUI-05**: Widersprüchliche und doppelte Selektoren, Breakpoint-Patches und unnötige `!important`-Regeln werden entfernt.
- [ ] **PMUI-06**: Das Layout bleibt bei langen deutschen Texten, 400 % Zoom sowie schmalen, mittleren und breiten Viewports nutzbar.
- [ ] **PMUI-07**: Breite Nachfahrenselektoren, widersprüchliche Layoutregeln, redundante Media Queries und unnötige Resize-Listener werden entfernt.

### Barrierefreiheit

- [ ] **PMA11Y-01**: Überschriften bilden eine semantische, nachvollziehbare Hierarchie.
- [ ] **PMA11Y-02**: Carousel, Paging, Vorschau und aufklappbare Bereiche sind vollständig per Tastatur bedienbar.
- [ ] **PMA11Y-03**: Interaktive Zustände besitzen korrekte Namen, Fokusdarstellung, `aria-expanded`, `aria-controls` und Statusmeldungen.
- [ ] **PMA11Y-04**: Kontrast, Zielgrößen, reduzierte Bewegung und DOM-Reihenfolge erfüllen die festgelegten WCAG-2.2-Kriterien.

### Testdaten und Abnahme

- [ ] **PMQA-01**: `sheppert` und `csubs-leader` werden durch einen versionierten, idempotenten Fixture- und Seed-Vertrag reproduzierbar erzeugt.
- [ ] **PMQA-02**: Das Fixture-Manifest dokumentiert erwartete Identität, Sichtbarkeit, Rollen, Mitgliedschaften, Projekte, Badges, Medien und Inhaltslängen.
- [ ] **PMQA-03**: Migrationen werden auf leerer Datenbank sowie Up und Down geprüft; bestehende synthetische Zeilen werden zurückgesetzt statt migriert.
- [ ] **PMQA-04**: Automatisierte Tests decken anonym, verborgen, Owner, Refresh-only, nicht vorhanden, sparse und dense, Fehler sowie Pagination ab.
- [ ] **PMQA-05**: Live-UAT prüft beide Profile auf Mobile, Zwischenbreite und Breitbild einschließlich Tastatur, Zoom, Bilder und Ladeverhalten.
- [ ] **PMQA-06**: Reset-, Seed- und Medienprüfungen stellen sicher, dass kanonische Ownership und getrackte Badge-Assets unverändert bleiben.
- [ ] **PMQA-07**: Typecheck, Lint, fokussierte Backend- und Frontend-Tests sowie Build sind grün; driftende oder zu schwache Tests werden korrigiert.

## Future Requirements

- Dauerhafte Slug-Aliase und Weiterleitungen, falls eine spätere Produktentscheidung veränderbare Slugs erlaubt.
- Geteilter anonymer Profil-Cache erst nach gemessener Notwendigkeit und dokumentierter vollständiger Invalidierung.
- Personalisierung, Follows, Social-Funktionen, Kommentare oder öffentliches Editieren.
- Zusätzliche Profilinhalte oder neue Badge-Familien außerhalb der bestehenden fachlichen Projektionen.
- Produktionsdaten-Übernahme, Backfills oder Kompatibilitätslogik nur nach ausdrücklicher Freigabe.

## Out of Scope

| Bereich | Begründung |
|---|---|
| Neue Frameworks, ORM-, State-, CSS- oder Komponentenbibliotheken | Der vorhandene Stack deckt die Härtung vollständig ab. |
| Zweites Profil-, Member-, Badge-, Contribution-, Membership- oder Medienmodell | Bestehende kanonische Domänen werden erweitert und konsolidiert. |
| Allgemeines Redesign von Admin-, Fansub-, Anime- oder Release-Seiten | v1.3 bleibt auf das öffentliche Memberprofil und direkt verwendete gemeinsame Seams begrenzt. |
| Infinite Scroll | Begrenzte, explizite Pagination bleibt zugänglich und überprüfbar. |
| Clientseitige Privacy-, Punkte- oder Badge-Wahrheit | Zugriff und fachliche Ableitung bleiben serverseitig autoritativ. |
| Release-Medien an Anime oder Episoden | Release-Version-Medien bleiben an echte `release_version_id` und die kanonischen Medientabellen gebunden. |
| Produktions-Backfills und Legacy-Fallbacks | Aktuelle Zeilen sind synthetische Testdaten und werden reset/reseed behandelt. |
| Spekulatives Shared Caching | Korrekte und gemessene Queries haben Vorrang vor Cache-Komplexität. |

## Traceability

Jede v1.3-Anforderung ist genau einer Roadmap-Phase zugeordnet.

| Requirement | Phase | Status |
|---|---|---|
| PMID-01 | Phase 128 | Complete |
| PMID-02 | Phase 128 | Complete |
| PMID-03 | Phase 128 | Pending |
| PMPR-01 | Phase 128 | Pending |
| PMPR-02 | Phase 128 | Pending |
| PMPR-03 | Phase 128 | Pending |
| PMPR-04 | Phase 128 | Pending |
| PMPR-05 | Phase 128 | Pending |
| PMPR-06 | Phase 129 | Pending |
| PMDA-01 | Phase 129 | Pending |
| PMDA-02 | Phase 129 | Pending |
| PMDA-03 | Phase 129 | Pending |
| PMDA-04 | Phase 129 | Pending |
| PMDA-05 | Phase 129 | Pending |
| PMDA-06 | Phase 129 | Pending |
| PMDA-07 | Phase 129 | Pending |
| PMDA-08 | Phase 129 | Pending |
| PMDA-09 | Phase 129 | Pending |
| PMDA-10 | Phase 129 | Pending |
| PMDA-11 | Phase 129 | Pending |
| PMCT-01 | Phase 130 | Pending |
| PMCT-02 | Phase 130 | Pending |
| PMCT-03 | Phase 130 | Pending |
| PMCT-04 | Phase 130 | Pending |
| PMCT-05 | Phase 130 | Pending |
| PMCT-06 | Phase 131 | Pending |
| PMCT-07 | Phase 130 | Pending |
| PMCT-08 | Phase 130 | Pending |
| PMPF-01 | Phase 131 | Pending |
| PMPF-02 | Phase 131 | Pending |
| PMPF-03 | Phase 131 | Pending |
| PMPF-04 | Phase 131 | Pending |
| PMPF-05 | Phase 131 | Pending |
| PMPF-06 | Phase 133 | Pending |
| PMPF-07 | Phase 131 | Pending |
| PMPF-08 | Phase 133 | Pending |
| PMFE-01 | Phase 132 | Pending |
| PMFE-02 | Phase 132 | Pending |
| PMFE-03 | Phase 132 | Pending |
| PMFE-04 | Phase 132 | Pending |
| PMFE-05 | Phase 132 | Pending |
| PMFE-06 | Phase 132 | Pending |
| PMFE-07 | Phase 132 | Pending |
| PMFE-08 | Phase 132 | Pending |
| PMFE-09 | Phase 132 | Pending |
| PMFE-10 | Phase 132 | Pending |
| PMFE-11 | Phase 132 | Pending |
| PMUI-01 | Phase 133 | Pending |
| PMUI-02 | Phase 133 | Pending |
| PMUI-03 | Phase 133 | Pending |
| PMUI-04 | Phase 133 | Pending |
| PMUI-05 | Phase 133 | Pending |
| PMUI-06 | Phase 133 | Pending |
| PMUI-07 | Phase 133 | Pending |
| PMA11Y-01 | Phase 133 | Pending |
| PMA11Y-02 | Phase 133 | Pending |
| PMA11Y-03 | Phase 133 | Pending |
| PMA11Y-04 | Phase 133 | Pending |
| PMQA-01 | Phase 134 | Pending |
| PMQA-02 | Phase 134 | Pending |
| PMQA-03 | Phase 134 | Pending |
| PMQA-04 | Phase 134 | Pending |
| PMQA-05 | Phase 134 | Pending |
| PMQA-06 | Phase 134 | Pending |
| PMQA-07 | Phase 134 | Pending |

**Coverage:** 65 Anforderungen definiert, 65 eindeutig zugeordnet, 0 verwaist, 0 doppelt, 65 offen.

---
*Last updated: 2026-08-13 after v1.3 roadmap creation*
