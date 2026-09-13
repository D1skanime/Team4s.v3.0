# Phase158 — Research

**Researched:** 2026-09-13
**Confidence:** HIGH für referenzierte Code-/Dokumentbefunde. Vorgeschlagene Defaults sind keine Messwerte.

<user_constraints>
## User Constraints (from CONTEXT.md)

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

### Agent's Discretion

Kleinste sichere Dateiextraktionen und vorhandene UI-Fehlerdarstellung wählen; keine neuen Produktregeln. Loading-Komponenten unter Nicht-Konventionsnamen erhalten und lokal neu komponieren.

### Deferred Ideas

F-15 (Owner-/Shell-DTO), Kommentar-Pagination und die dazugehörige Produktentscheidung, umfassende Audio-/Videoänderungen, eine neue Anime-Slugroute, ein Rating-/View-System, eine neue Emby-ID-Heuristik, automatische Credit-Zusammenlegung, pauschale Tabellen-/DTO-/Release-/Segment-/Compatibility-Löschungen, strukturelles Redesign und globale Lint-/Typecheckbereinigung bleiben ausgeschlossen. Falls ein kleiner zwingender Vertragsfix einen dieser Bereiche berührt, müssen Ursache, Consumer und Umfang vor der Änderung dokumentiert werden.
</user_constraints>

<phase_requirements>
## Phase Requirements

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
</phase_requirements>

## Summary

Die sichtbaren Ursachen sind am AuditHEAD belegt: weiße Karten erben weißen Text; die Contributionüberschrift nutzt ein dunkles Token; der dekorative Banner ragt mit Blur/Scale über den Container. Sessionkomponenten prüfen Access nur beim Mount. Die Page verwendet parseInt und einen weichen200-Fehlerzustand. [VERIFIED: FRONTEND-REPAIRS]

Lokale CSSbesitzer korrigieren, zentrale Session verwenden, ehrliche Zustände darstellen und ID/Anime vor der Streaminggrenze prüfen. Backendänderungen bleiben auf schmale Existenzprüfung, Slugprojektion und zugehörige Verträge begrenzt. [VERIFIED: FRONTEND-REPAIRS; BACKEND-CONTRACTS]

## Architectural Responsibility Map

| Fähigkeit | Primärer Owner | Sekundär |
|---|---|---|
|ID/404/Metadaten|Frontendserver vor Suspense|ApiError/AnimeRepository|
|Session/Watchlist|Client mit useAuthSession|Zentraler APIclient/Singleflight|
|Visibility/Relations|AnimeRepository|Relationshandler|
|PrettySlug|Datenbank/Basequery|DTO/Linkbuilder|
|Kontrast/Overflow|Lokaler CSSbesitzer|Globale Tokens|

[VERIFIED: technische Preflights]

## Architecture Patterns und Code Examples

- Page/generateMetadata teilen einen Reactcache-Lader. ID/Existenz vor Detail-Suspense prüfen; vorhandene Loading-UI als Komponenten erhalten und die Liste explizit laden lassen. notFound nach Streamingbeginn kann HTTP200 liefern. [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/not-found; https://nextjs.org/docs/app/api-reference/file-conventions/loading; VERIFIED: FRONTEND-REPAIRS]
- Session: hasAccessToken || hasRefreshToken. Requestresultate an stabile Accountidentität, Authgeneration und Anime binden; unknown darf kein Add/Delete bestimmen. [VERIFIED: FRONTEND-REPAIRS; D-03]
- Schmale Relationsprüfung: SELECT EXISTS (SELECT 1 FROM anime WHERE id = $1 AND status <> 'disabled'); anschließend die vorhandene Relationsquery. [VERIFIED: BACKEND-CONTRACTS]
- AnimeDetail.slug additiv über NULLIF(BTRIM(anime.slug), '') in derselben Basequery; kein ExtraRequest. Im Legacy-Schemabranch absent lassen, statt Slugs zu erraten. [VERIFIED: BACKEND-CONTRACTS]

## Open Questions (RESOLVED)

Die technische404-Entscheidung ist getroffen: strikte ID-/Existenzprüfung vor Detail-Suspense, vorhandene Loading-UI erhalten, Listenseitenanzeige explizit bewahren. Der Browsernachweis steht noch im Ausführungsgate aus; das ist keine offene Produktentscheidung. Der notwendige Promise-only-Routevertragfix der numerischen GroupStoryPageProps ist mit Ursache und Consumerprüfung in158-01 eingeplant. Sessionidentität folgt D-03: stabile tokenfreie Accountidentität, konservative Authgeneration bei fehlenden Metadaten. [VERIFIED: FRONTEND-REPAIRS; Abstimmung Hauptagent/Planner/Checker13.09.2026]

## Standard Stack

Keine neue Library, Installation oder Upgrade geplant. Vorhandene Repositorydeklarationen: React18.3.1, Next^16.1.6, Vitest^3.2.4, Playwright1.55.0, Go1.25.0, Gin1.10.0 und pgx/v5 5.7.1. Dies sind keine Aussagen über neueste Registryversionen. [VERIFIED: FRONTEND-STATE-MEDIA und BACKEND-CONTRACTS, dort package.json/go.mod geprüft]

## Project Constraints (from AGENTS.md)

Es werden genau zwei additive Phasen angelegt: 158 und 159. Phase 159 beginnt erst nach Implementierung und technischer Verifikation von Phase 158. Ohne ausdrückliche Freigabe werden weder produktive Daten noch Testdaten verändert. Es entsteht keine parallele Daten-, Rollen-, Auth-, Medien- oder Routenwelt. Human-UAT 156 GAP-02 und 157-06 Task 4 bleiben offen. Fremde Working-Tree-Änderungen einschließlich frontend/scripts/shot2.mjs bleiben erhalten. Alle Arbeiten laufen im kanonischen Repository /home/d1sk/team4s über Docker/Compose. GSD-Kommandos laufen ausschließlich über ./scripts/gsd-linux.sh.

Vorhandene Seams suchen und Analoga in read_first nennen. DTO, Go, OpenAPI, TypeScript und api.ts gemeinsam pflegen. Keine lokalen Token-/Cookie-/Bearer-/Refreshpfade. Anime und Episoden bleiben neutral; Release-/Version-/Mediaownership bleibt unverändert. Globale Tokens und UIprimitives, korrekte Umlaute und semantische Controls verwenden. Kleine Diffs; keine breite Formatierung oder fremde Änderungen überschreiben. Tests, Typecheck, Lint, Build soweit möglich und git diff --check ausführen; Altfehler belegen. [VERIFIED: AGENTS; AI-HANDOFF; Implementation-Contract-Skill]

## Don't Hand-Roll

| Problem | Vorhandene Naht |
|---|---|
|Session/Refresh|useAuthSession und zentraler APIclient mit Singleflight|
|Prettylinks|fansubProjectRoutes und Phase155-Resolver mit autoritativen Slugs|
|Bilder|animeBackdrops, ResponsiveImage, NextgetImageProps und tatsächliche Providergrößen|
|Manifest|AnimeMediaProvider-Map und Contextconsumer|
|Navigation|animeGridContext-Builder und bestehender Listhelper|
|Segmentcredits|Assignments, Origin-/Subsetprojektion und permissions.SegmentCreditRoleCodes|

[VERIFIED: technische Preflightberichte]

## Runtime State Inventory

| Kategorie | Bestand und Behandlung |
|---|---|
|Gespeicherte Daten|DB/Medien unverändert; vorhandenen Browserkey kontrolliert lesen und validieren; keine Migration|
|Liveconfig|Bestehender Compose-Stack; keine Produktconfigänderung; GET-only-Fixtureinstanz isolieren|
|OSregistrierung|Keine Umbenennung, Installation oder OSänderung geplant; keine globale Inventur behauptet|
|Secrets/Env|API_INTERNAL_URL und Medienkonfiguration erhalten; .env nicht kopieren und Secrets nicht ausgeben|
|Buildartefakte|Geteiltes /app/.next nicht überschreiben; Build in isolierter Containerkopie unter /tmp|

[VERIFIED: FRONTEND-STATE-MEDIA Runtimeinventar/Composeanalyse]

## Environment Availability

LinuxCompose mit Frontend, Backend, PostgreSQL, Redis, Keycloak und Mailpit läuft. Tests/Builds im Container, kein HostNode/GSD. Öffentliches Beispiel: http://127.0.0.1:3300/anime/1. Ein authentifizierter156-Admin-UAT-Pass wird nicht vorausgesetzt oder erfunden. [VERIFIED: docker compose ps; GSD-CONTEXT]

## Common Pitfalls

- Ein Fehler außerhalb des eigenen Plans kann von derselben Phase verursacht sein. Gegen den gesamten Phasenstart vergleichen.152 dokumentiert genau diese Fehlklassifikation. [VERIFIED:152-VERIFICATION]
- Browser-CDP sieht SSR→API-Requests nicht. SQLzahlen aus Quellcode als statisch kennzeichnen; QueryTracer separat einsetzen. [VERIFIED: Audit REQUESTS-AND-SQL]
- Ein DB-SKIP ist kein ausgeführter Fixturebeweis. Alte Live-DB-/Migrationsskripte sind keine neue Autorisierung. [VERIFIED: Nutzerauftrag;156/deferred-items]
- Quelltextsubstring ersetzt keinen Verhaltenstest. Bestehende Sourceguards nur für zulässige Abwesenheits-/Vertragschecks verwenden. [VERIFIED: STATE Phase146; technische Preflights]

## Assumptions Log

Keine neue Produktentscheidung aus Trainingswissen übernommen. Technische Defaults unter „Agent's Discretion“ müssen vor Abschluss gemessen werden. Feld-/Cursorentscheidungen trifft der Backendplan gegen die Consumerbelege, bevor riskante Änderungen ausgeführt werden.

## Validation Architecture

Vitest/jsdom/TestingLibrary, Playwright, Gohttptest und vorhandene Querycounter verwenden. Vollständige Matrix und Gates stehen in der VALIDATION.md dieser Phase. Nyquist ist in .planning/config.json aktiv. Kein Gate ist allein durch diesen Research bestanden. [VERIFIED: .planning/config.json; technische Preflights]

## Security Domain

Securityenforcement ist nicht deaktiviert. Die Threatmatrix in VALIDATION/Plans deckt Session/Refresh-only und alte Ownerzustände, ID/404, Publicvisibility, Medien-SSRF/Allowlists sowie Cache-/Payloadgrenzen ab. Auth, Session, Access und Inputvalidation sind relevant; keine eigene Kryptografie. Es wird keine ASVS-Konformitätszertifizierung behauptet. [VERIFIED: .planning/config.json; AGENTS; Nutzerauftrag]

## Quellen

- [GSD-Kontext und vollständiges Leseinventar](../../../docs/audits/2026-09-13-public-anime-detail/implementation-preflight/GSD-CONTEXT.md)
- [Frontend-Reparaturen und Routing](../../../docs/audits/2026-09-13-public-anime-detail/implementation-preflight/FRONTEND-REPAIRS.md)
- [Clientzustand und Medien](../../../docs/audits/2026-09-13-public-anime-detail/implementation-preflight/FRONTEND-STATE-MEDIA.md)
- [Backend und Verträge](../../../docs/audits/2026-09-13-public-anime-detail/implementation-preflight/BACKEND-CONTRACTS.md)
- Vollständiger Deep-Audit: docs/audits/2026-09-13-public-anime-detail/{AUDIT,COMPONENTS-AND-CLIENT,REQUESTS-AND-SQL,RUNTIME-VERIFICATION,FOLLOW-UP-PLAN}.md

Aktuelle Quelldateien vor jeder Implementierung vollständig lesen. Die Preflights sind Belege für den recherchierten Stand, kein Ersatz für die Diffprüfung. [VERIFIED: vier Preflightberichte vom13.09.2026]
