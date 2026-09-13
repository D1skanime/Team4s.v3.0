# Phase158: Public Anime Detail — Reparatur

**Status:** Planung; kein Implementierungs- oder Human-UAT-PASS.
**Auftragsquelle:** [vollständiger Nutzerauftrag](158-USER-REQUEST.md).
**Baseline:** 7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85.

## Decisions

### D-01 — Sequenz und bestehende Abnahmen

Es werden genau zwei additive Phasen angelegt: 158 und 159. Phase 159 beginnt erst nach Implementierung und technischer Verifikation von Phase 158. Ohne ausdrückliche Freigabe werden weder produktive Daten noch Testdaten verändert. Es entsteht keine parallele Daten-, Rollen-, Auth-, Medien- oder Routenwelt. Human-UAT 156 GAP-02 und 157-06 Task 4 bleiben offen. Fremde Working-Tree-Änderungen einschließlich frontend/scripts/shot2.mjs bleiben erhalten. Alle Arbeiten laufen im kanonischen Repository /home/d1sk/team4s über Docker/Compose. GSD-Kommandos laufen ausschließlich über ./scripts/gsd-linux.sh.

### D-02 — Lesbarkeit und lokaler Overflow (P158-01/02)

Weiße Episodenkarten behalten ihre Fläche und bekommen das vorhandene dunkle Texttoken am Kartenbesitzer. Contributionüberschrift und Statusbereich verwenden auf der dunklen Seitenfläche das vorhandene helle Token. Nur den dekorativen heroBanner begrenzen. Keine globale Root-Overflow-Regel; Fokusrahmen, Slider und Controls bleiben bedienbar. Kein Redesign.

### D-03 — Session und ehrliche Zustände (P158-03/04)

useAuthSession wiederverwenden; eine aktive Session besitzt Access oder Refresh. Watchliststatus erhält einen eindeutigen Clientbesitzer; den bisherigen Cookie-/SSR-Statuspfad aus der Page entfernen. Status- und Mutationsergebnisse an Anime, stabile tokenfreie Accountidentität und aktuelle Authgeneration binden. Alte Antworten ignorieren oder abbrechen. Fehlt eine stabile Accountidentität in den Metadaten, konservativ eine tokenfreie Authchanged-Generation verwenden. Niemals Tokens als UI-Identität kopieren. Reine Tokenrotation desselben Accounts darf keinen konkurrierenden Status-/Refreshloop erzeugen.

Unbekannter Watchliststatus bedeutet weder vorhanden noch fehlend und erlaubt kein Add/Delete. Statusfehler brauchen Retry; Aktionsfehler bleiben auch bei Custom-Styling sichtbar. Contributions unterscheiden Laden, fachlich leer und Requestfehler.

### D-04 — Strikte ID und echte HTTP404 (P158-05)

Nur vollständig positive dezimale Ganzzahlen mit Number.isSafeInteger akzeptieren; kein parseInt-Präfix. Page und generateMetadata teilen einen request-memoisierten Anime-Lader. Nur echte404 über notFound behandeln; 5xx und Netzwerkfehler nicht als fachliches Fehlen umlabeln. Erfolgsmetadaten verwenden den echten Titel und einen numerischen Canonical ohne Gridquery. Fehler sind noindex und tragen keine Anime1-Metadaten.

Die automatischen Loading-Boundaries app/anime/loading.tsx und app/anime/[id]/loading.tsx ermöglichen frühes Streaming mit HTTP200. Die vorhandene Lade-UI als Komponenten unter Nicht-Konventionsnamen erhalten; automatische Boundaries aus den Detail-Vorfahren herausnehmen. Die Anime-Liste behält ihre bisherige Ladeanzeige über explizite Suspense. Die Detail-Suspense beginnt erst nach strikter ID- und Existenzprüfung. Keine neue URL, kein globaler Proxy und kein htmlLimitedBots-Hack. Ein normaler Browser-Useragent muss tatsächlich404 erhalten. Dies ist eine zwingende, begrenzte Korrektur der benachbarten Routingstruktur.

### D-05 — Wahrheitsgemäße Kennzahlen (P158-06)

7.8 und konstant0Views nicht als reale Werte anzeigen. Ohne autoritative Quelle entfallen diese Kennzahlen. Kein Rating-/View-/Embyprodukt erfinden; das Anime22-Mapping nicht ersetzen.

### D-06 — Pretty-Projektnavigation (P158-07)

Vorhandene Phase155-Linkbuilder und serverautoritative Slugs verwenden. AnimeDetail.slug gezielt aus der vorhandenen Basequery transportieren, falls erforderlich. Kein Gruppenprofil nur zur Linkbildung laden; kein Browser-Slugify. Numerische Compatibility und deren Canonical erhalten. Go, OpenAPI, TypeScript und Tests gemeinsam ändern. Der notwendige kleine Promise-only-Routevertragfix der numerischen GroupStoryPageProps wird in158-01 mit Ursache und Consumerprüfung dokumentiert; daraus entsteht keine globale Typebereinigung.

### D-07 — Relations (P158-08)

Eine schmale, sichtbarkeitsbewusste Anime-Existenzprüfung nach dem vorhandenen Repositorymuster verwenden. GetByID nicht vollständig für eine bloße Prüfung laden. Beibehalten:400 für ungültige ID,404 für unbekannten/deaktivierten Anime,500 bei technischem Fehler und200 mit leerer Liste. Der erfolgreiche Pfad braucht höchstens zwei echte Datenstatements. Keine unbelegte Millisekunden-Zusage.

### D-08 — Technische Gates ohne Datenänderung (P158-09)

Die vollständige Nutzerabnahme aus158-USER-REQUEST.md und158-VALIDATION.md erfüllen. Isolierte Mock-/Fixtureumgebungen verwenden; keine VM-DBwrites und keinen Backendneustart mit Startup-Migration. Build in einer isolierten Containerkopie ausführen, nicht /app/.next überschreiben. Baselinefehler gegen den gesamten158-Ausgangscommit vergleichen.156/157 bleiben menschlich offen.

## Agent's Discretion

Kleinste sichere Dateiextraktionen und vorhandene UI-Fehlerdarstellung wählen; keine neuen Produktregeln. Loading-Komponenten unter Nicht-Konventionsnamen erhalten und lokal neu komponieren.

## Deferred Ideas

F-15 (Owner-/Shell-DTO), Kommentar-Pagination und die dazugehörige Produktentscheidung, umfassende Audio-/Videoänderungen, eine neue Anime-Slugroute, ein Rating-/View-System, eine neue Emby-ID-Heuristik, automatische Credit-Zusammenlegung, pauschale Tabellen-/DTO-/Release-/Segment-/Compatibility-Löschungen, strukturelles Redesign und globale Lint-/Typecheckbereinigung bleiben ausgeschlossen. Falls ein kleiner zwingender Vertragsfix einen dieser Bereiche berührt, müssen Ursache, Consumer und Umfang vor der Änderung dokumentiert werden.

## Requirements

| ID | Anforderung | Audit |
|---|---|---|
| P158-01 | Episodentitel auf weißen Karten und Contributionüberschrift auf dunkler Fläche lesbar; vorhandene globale Tokens. | F01 |
| P158-02 | Hero ohne horizontalen Dokumentoverflow; lokale Begrenzung, Fokus/Slider/Controls erhalten. | F03 |
| P158-03 | Access- oder Refreshsession mit Reaktion nach Mount; ausschließlich zentrale Session-/Refreshseam. | F02 |
| P158-04 | Contributions: Laden/leer/Fehler; Watchlistunknown blockiert Mutationen; Aktionsfehler auch bei Custom-Styling sichtbar. | F12 |
| P158-05 | Vollständig positive sichere Integer-ID; echte Next404; konsistente Metadaten ohne doppelten Animefetch. | F05 technisch |
| P158-06 | Keine erfundene7.8-Bewertung oder0Views; vorhandenes Anime22-/Emby-Mapping unverändert. | F04 Darstellung |
| P158-07 | Gruppenbereich über Pretty-Link aus autoritativen Slugs; gezielter Vertragsfix; numeric Compatibility erhalten. | F06 |
| P158-08 | Relationsprüfung ohne Vollreload; Semantik aktiv/unbekannt/deaktiviert erhalten; höchstens zwei Datenstatements im Erfolgsfall. | F07 |
| P158-09 | Vollständige technische Nutzermatrix, frische Gates und Browser-/HTTP-/Request-/SQLbelege; keine neue Regression; Alt-UAT offen. | Gate |

## GSD-Delta und erhaltene UAT

158/159 waren frei. init progress mit Phase129 ist nachweislich historisch/inkonsistent; nicht129 weiterführen. PROJECT/Milestoneabschluss ist älter als156/157.156GAP02 mit14Prüfpunkten und157Task4 bleiben offen. Ursprüngliche157-Stats-/Releaseanforderungen wurden durch autorisierte157-07/08-Änderungen teilweise ersetzt; keine zweite Releasehistorie oder Statistikbox wiederherstellen. [VERIFIED: GSD-CONTEXT]

## Quellen

- [GSD-Kontext und vollständiges Leseinventar](../../../docs/audits/2026-09-13-public-anime-detail/implementation-preflight/GSD-CONTEXT.md)
- [Frontend-Reparaturen und Routing](../../../docs/audits/2026-09-13-public-anime-detail/implementation-preflight/FRONTEND-REPAIRS.md)
- [Clientzustand und Medien](../../../docs/audits/2026-09-13-public-anime-detail/implementation-preflight/FRONTEND-STATE-MEDIA.md)
- [Backend und Verträge](../../../docs/audits/2026-09-13-public-anime-detail/implementation-preflight/BACKEND-CONTRACTS.md)
- Vollständiger Deep-Audit: docs/audits/2026-09-13-public-anime-detail/{AUDIT,COMPONENTS-AND-CLIENT,REQUESTS-AND-SQL,RUNTIME-VERIFICATION,FOLLOW-UP-PLAN}.md

Aktuelle Quelldateien vor jeder Implementierung vollständig lesen. Die Preflights sind Belege für den recherchierten Stand, kein Ersatz für die Diffprüfung. [VERIFIED: vier Preflightberichte vom13.09.2026]
