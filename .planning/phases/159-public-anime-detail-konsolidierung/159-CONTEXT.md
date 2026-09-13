# Phase159: Public Anime Detail — Konsolidierung

**Status:** Planung; kein Implementierungs- oder Human-UAT-PASS.
**Auftragsquelle:** [vollständiger Nutzerauftrag](159-USER-REQUEST.md).
**Baseline:** Technisch verifizierter158-Abschlusscommit; vor Ausführung frisch eintragen.

## Decisions

### D-01 — Sequenz, Scope und bestehende Abnahmen

Es werden genau zwei additive Phasen angelegt: 158 und 159. Phase 159 beginnt erst nach Implementierung und technischer Verifikation von Phase 158. Ohne ausdrückliche Freigabe werden weder produktive Daten noch Testdaten verändert. Es entsteht keine parallele Daten-, Rollen-, Auth-, Medien- oder Routenwelt. Human-UAT 156 GAP-02 und 157-06 Task 4 bleiben offen. Fremde Working-Tree-Änderungen einschließlich frontend/scripts/shot2.mjs bleiben erhalten. Alle Arbeiten laufen im kanonischen Repository /home/d1sk/team4s über Docker/Compose. GSD-Kommandos laufen ausschließlich über ./scripts/gsd-linux.sh.

### D-02 — Ein Gruppenzustand (P159-01)

FansubVersionBrowser ist der gemeinsame Clientbesitzer; ActiveFansubStory wird ein kontrolliertes Blatt. Die Reihenfolge Story → Filter → Versionen bleibt. Initialauswahl rein aus Props: Primärgruppe oder erste gültige Gruppe. Storage erst nach Mount lesen. Den vorhandenen Key anime:<id>:fansub-filter validieren; blockierter Storage darf die UI nicht brechen. Eine ungültige oder entfernte ID fällt auf die gültige Primärgruppe beziehungsweise erste Gruppe zurück. Nur explizite Benutzerauswahl persistieren.

Multitabs: Das letzte gültige persistierte Event für denselben Anime übernehmen; fremde Keys ignorieren; Clear oder ungültiger Wert führt zum Fallback. Externe Events nicht zurückschreiben. Den200-ms-Poll vollständig entfernen. Ein Gruppenwechsel erzeugt keine neuen fachlichen Datenrequests.

### D-03 — Gridnachbarn (P159-02)

Das Ziel enthält Anime und tatsächliche Gridseite; vorhandene Filter bleiben erhalten. Der Loader liefert ein direkt awaitbares Ergebnis für den ersten Klick. Hover, Focus, Touch und Klick teilen eine InFlight-Promise. Bei Kontextwechsel oder Unmount abbrechen oder alte Erfolge, Fehler und finally ignorieren. Kein initialer Request ohne Gridinteraktion; Retry bei Fehler. AbortSignal additiv durch den vorhandenen getAnimeList-Helper reichen.

### D-04 — Echtes Bildbudget (P159-03)

Alle vier Coververwendungen — Poster, Reflexion, Hero-CSS und Rotatorfallback — beziehen eine begrenzte Displayquelle aus der vorhandenen Anime-Mediennaht. Provider erhalten tatsächlich wirksame width/quality-Parameter. Lokale StaticFS-Dateien werden nicht durch Queryparameter transformiert: den vorhandenen Nextoptimizer/getImageProps oder eine nachgewiesene Mediafilevariante verwenden.

Kein Originalfallback, keine pauschale Hostallowlist und keine Lockerung von dangerouslyAllowLocalIP. Tatsächliche Bytes, Dimensionen und Qualität bei DPR1/2 belegen. Identische URLs teilen.

### D-05 — Begrenztes Manifestsharing (P159-04)

Die vorhandene Map im AnimeMediaProvider erweitern; keine zweite Registry. Die drei Blätter lesen weiterhin Context. Laufende Requests teilen und erst nach Abmeldung des letzten Consumers kontrolliert abbrechen. StrictMode-Reacquire berücksichtigen. Fehler/Aborts dürfen den Cache nicht dauerhaft vergiften; eine alte Rejection darf keinen neuen Eintrag löschen.

TTL plus Reacquire/Focus/Visibility verwenden, kein Intervallpolling. Eine gleiche Antwort behält ihre Objektidentität; ein geändertes Manifest aktualisiert die SPA. Ungenutzte Einträge begrenzt evicten, aktive Referenzen nicht willkürlich abbrechen.

### D-06 — Consumerprüfung zuerst (P159-05)

Für jedes betroffene Feld die tatsächlichen produktiven Consumer dokumentieren. Die fünf bestehenden getGroupedEpisodes-Caller einschließlich Admin, Bulk und Editornachbarn erhalten. Keine pauschale Kürzung. Neutrale Episoden ohne Variante bleiben sichtbar. Consumer-Matrix und isolierte Fixtures entstehen vor jeder riskanten ID-/Projektionsänderung.

### D-07 — Assignment-, ID- und Vertragswahrheit (P159-06)

Segmentfelder auf der öffentlichen Anime-Seite nur bei tatsächlichem Bedarf verwenden. Falls projiziert, theme_segment_assignments statt Range plus Versionlabel lesen. Adminconsumer nicht verlieren. Die Phase156-Subset-/Origin-/Rollenautorität respektieren: sechs Rollen einschließlich QC/editor, encoder ausgeschlossen, Querybudget vier.

fansub_groups in Go/OpenAPI/TS angleichen. Varianten-ID und Releaseversion-ID ausdrücklich benennen. PublicGroupedEpisode.episode_id ist ein verbindliches Go-/OpenAPI-/TypeScript-Feld; gleiche Episodennummern über verschiedene Seiten dürfen nicht zu einer Episode verschmelzen. Streamcompatibility im Default erhalten; explizite Identität additiv einführen und isolierte Kollision nachweisen. Kein Entitlement-Rewrite.

### D-08 — Begrenztes Inventar ohne N+1 (P159-07)

Den bestehenden Episodesendpoint gezielt um eine geeignete öffentliche Projektion/Abrufsemantik erweitern; keine zweite Domainregistry. Backendbericht und Consumer-Matrix bleiben Voraussetzung. Der Planner hat auf ihrer Basis Default24 und Maximum100 festgelegt. Öffentlichen Abruf explizit über projection/limit/cursor aktivieren; bestehende Consumer behalten den Defaultvertrag. Atomare Varianten-/Neutralzeilen begrenzen und vorhandene Cursorprimitive mit Versionierung und Anime-Scope verwenden. Eine Grenze zählt atomare Zeilen und Payload, nicht nur episode_count. Keine unbemerkte Trunkierung; eine notwendige Fortsetzung ist sichtbar und unabhängig vom Gruppenwechsel. Keine Query pro Episode, Variante, Gruppe oder Contributor.

### D-09 — Technische Gates ohne Datenänderung (P159-08)

159-USER-REQUEST.md und159-VALIDATION.md vollständig abbilden. Startcommit ist der technisch verifizierte158-Abschlusscommit, nicht blind der AuditHEAD. Mock-/GET-only-Fixtureumgebung oder ausdrücklich freigegebenes isoliertes Testziel verwenden; keine VM-DBwrites. Runtime-, OpenAPI-, TypeScript-, SQL- und Browser-/Cachebelege gemeinsam führen. Human-UAT156/157 bleibt getrennt offen.

## Agent's Discretion

Technische Defaults aus dem Medienpreflight: Cover zunächst512px, gemessen gegen DPR1/2; Manifest60s Freshness und maximal20 ungenutzte erfüllte LRU-Einträge. Dies sind Engineeringdefaults, keine neue Nutzerproduktentscheidung. Anpassungen brauchen einen Budget-/Qualitätsbeleg. Die öffentliche Abrufgrenze ist nach Backendbericht und Planner auf Default24/Maximum100 festgelegt; vorhandene Cursorprimitive verwenden und atomare Rows/Payload messen.

## Deferred Ideas

F-15 (Owner-/Shell-DTO), Kommentar-Pagination und die dazugehörige Produktentscheidung, umfassende Audio-/Videoänderungen, eine neue Anime-Slugroute, ein Rating-/View-System, eine neue Emby-ID-Heuristik, automatische Credit-Zusammenlegung, pauschale Tabellen-/DTO-/Release-/Segment-/Compatibility-Löschungen, strukturelles Redesign und globale Lint-/Typecheckbereinigung bleiben ausgeschlossen. Falls ein kleiner zwingender Vertragsfix einen dieser Bereiche berührt, müssen Ursache, Consumer und Umfang vor der Änderung dokumentiert werden.

## Requirements

| ID | Anforderung | Audit |
|---|---|---|
| P159-01 | Ein SSR-deterministischer Clientbesitzer für Story/Filter/Versionen; sichere Persistierung/Multitabs; kein Poll oder Wechselrefetch. | F11 |
| P159-02 | Gridnachbarn mit Zielanime und Gridseite; erster asynchroner Klick; Abort/Ignore; kein Initialrequest ohne Interaktion. | F13 |
| P159-03 | Reales Coverbudget mobil/desktop über bestehende Medienmechanismen; lokale und Providerbilder; keine Scheintransformation. | F09 |
| P159-04 | Ein geteilter Manifestrequest; begrenzte Lebensdauer/Größe; Consumerabort, Retry und SPA-Aktualisierung. | F10 |
| P159-05 | Feld-/Consumer-Matrix und isolierte Fixtures vor riskanten Änderungen; neutrale Episodenfallbacks erhalten. | F08/F14 Voraussetzung |
| P159-06 | Assignmentautorität bei Segmentbedarf; fansub_groups-Parität; eindeutige IDs; kontrollierte Streamcompatibility. | F08/F14 |
| P159-07 | Belegte Payload-/Rowgrenze oder passender Abrufmechanismus; keine Query pro Episode/Variante/Gruppe/Contributor. | F08/F14 |
| P159-08 | Volle Matrix für Storage/Multitab/Grid/Media/Cache/Kollision/Assignmentdivergenz und frische Gesamtgates. | Gate |

## GSD-Delta und erhaltene UAT

158/159 waren frei. init progress mit Phase129 ist nachweislich historisch/inkonsistent; nicht129 weiterführen. PROJECT/Milestoneabschluss ist älter als156/157.156GAP02 mit14Prüfpunkten und157Task4 bleiben offen. Ursprüngliche157-Stats-/Releaseanforderungen wurden durch autorisierte157-07/08-Änderungen teilweise ersetzt; keine zweite Releasehistorie oder Statistikbox wiederherstellen. [VERIFIED: GSD-CONTEXT]

## Quellen

- [GSD-Kontext und vollständiges Leseinventar](../../../docs/audits/2026-09-13-public-anime-detail/implementation-preflight/GSD-CONTEXT.md)
- [Frontend-Reparaturen und Routing](../../../docs/audits/2026-09-13-public-anime-detail/implementation-preflight/FRONTEND-REPAIRS.md)
- [Clientzustand und Medien](../../../docs/audits/2026-09-13-public-anime-detail/implementation-preflight/FRONTEND-STATE-MEDIA.md)
- [Backend und Verträge](../../../docs/audits/2026-09-13-public-anime-detail/implementation-preflight/BACKEND-CONTRACTS.md)
- Vollständiger Deep-Audit: docs/audits/2026-09-13-public-anime-detail/{AUDIT,COMPONENTS-AND-CLIENT,REQUESTS-AND-SQL,RUNTIME-VERIFICATION,FOLLOW-UP-PLAN}.md

Aktuelle Quelldateien vor jeder Implementierung vollständig lesen. Die Preflights sind Belege für den recherchierten Stand, kein Ersatz für die Diffprüfung. [VERIFIED: vier Preflightberichte vom13.09.2026]
