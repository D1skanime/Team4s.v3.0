# Phase159 — Research

**Researched:** 2026-09-13
**Confidence:** HIGH für referenzierte Code-/Dokumentbefunde. Vorgeschlagene Defaults sind keine Messwerte.

<user_constraints>
## User Constraints (from CONTEXT.md)

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

### Agent's Discretion

Technische Defaults aus dem Medienpreflight: Cover zunächst512px, gemessen gegen DPR1/2; Manifest60s Freshness und maximal20 ungenutzte erfüllte LRU-Einträge. Dies sind Engineeringdefaults, keine neue Nutzerproduktentscheidung. Anpassungen brauchen einen Budget-/Qualitätsbeleg. Die öffentliche Abrufgrenze ist nach Backendbericht und Planner auf Default24/Maximum100 festgelegt; vorhandene Cursorprimitive verwenden und atomare Rows/Payload messen.

### Deferred Ideas

F-15 (Owner-/Shell-DTO), Kommentar-Pagination und die dazugehörige Produktentscheidung, umfassende Audio-/Videoänderungen, eine neue Anime-Slugroute, ein Rating-/View-System, eine neue Emby-ID-Heuristik, automatische Credit-Zusammenlegung, pauschale Tabellen-/DTO-/Release-/Segment-/Compatibility-Löschungen, strukturelles Redesign und globale Lint-/Typecheckbereinigung bleiben ausgeschlossen. Falls ein kleiner zwingender Vertragsfix einen dieser Bereiche berührt, müssen Ursache, Consumer und Umfang vor der Änderung dokumentiert werden.
</user_constraints>

<phase_requirements>
## Phase Requirements

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
</phase_requirements>

## Summary

Vorhandene Seams können Gruppenstate, Gridnavigation, Bilder und Manifestcache konsolidieren: FansubVersionBrowser als Auswahlowner, direkt awaitbares Gridresultat, gemeinsame begrenzte Coverquelle und die bestehende begrenzte ManifestMap. Der200-ms-Poll liest Storage, keine API; Manifestsharing funktioniert bereits. [VERIFIED: FRONTEND-STATE-MEDIA]

F08/F14 sind sensitiv gegenüber anderen Consumern. Das grouped Readmodel bedient auch Admin, Bulk und Editor. Die öffentliche Projektion braucht geeignete Grenzen statt pauschaler DTOkürzung. Konkrete Cursor-/IDfestlegungen müssen vor Implementierung aus dem vollständigen Backendbericht übernommen werden. [VERIFIED: BACKEND-CONTRACTS]

## Architectural Responsibility Map

| Fähigkeit | Primärer Owner | Sekundär |
|---|---|---|
|Aktive Gruppe|FansubVersionBrowser|Kontrollierte Story/Filter/Versionsliste|
|Gridnachbarn|AnimeEdgeNavigation|getAnimeList/APIclient|
|Bilddelivery|animeBackdrops/Provider/Nextoptimizer|Vier Coverconsumer|
|Manifest|AnimeMediaProvider|Contextblätter|
|Assignments/IDs/Rowgrenze|Repository/DTO/Vertrag|Öffentliche Clientprojektion|

[VERIFIED: FRONTEND-STATE-MEDIA; BACKEND-CONTRACTS]

## Architecture Patterns und Code Examples

- Zielobjekt { anime, page } und direkt awaitetes Loaderresultat. InFlight-Promise für Hover/Focus/Touch/Klick teilen. AbortSignal bis Fetch reichen; Kontextguard für Erfolg/Fehler/finally. [VERIFIED: FRONTEND-STATE-MEDIA]
- Storage erst nach dem SSR-neutralen Erstzustand lesen. Nur Benutzerauswahl persistieren; externe Tabänderungen nicht zurückschreiben. [VERIFIED: FRONTEND-STATE-MEDIA]
- getImageProps erzeugt echte Optimizerquellen auch für CSSbackground/image-set. Keine handgebaute OptimizerURL und keine Scheinparameter an StaticFS; Providerproxy kann width tatsächlich transformieren. [CITED: https://nextjs.org/docs/app/api-reference/components/image; VERIFIED: FRONTEND-STATE-MEDIA]
- Manifestentry mit Promise, Controller, Ergebnis, Ablaufzeit, letztem Zugriff und Consumerreferenzen. Vor Löschung die Entryidentität prüfen; StrictMode-Reacquire vor Abort berücksichtigen; kein Intervall. [VERIFIED: FRONTEND-STATE-MEDIA, vorgeschlagenes Design auf bestehender Map]

## Consumer-Matrix als Voraussetzung

Feldweise Quelle, Typ, Semantik, alle produktiven Consumer, Sichtbarkeit, IDdomäne, Nullablefallback, Änderungsentscheidung und Testnachweis dokumentieren. Neutrale Episoden, Adminsegmentconsumer, Streamcompatibility und isolierte IDkollision sind Pflicht. Matrix vor jeder Feldentfernung vervollständigen. [VERIFIED: Nutzerauftrag; BACKEND-CONTRACTS]

## Open Questions (RESOLVED)

Die Planungsentscheidung ist aufgelöst: öffentlicher Opt-in über projection/limit/cursor, Default24/Maximum100 atomare Varianten-/Neutralzeilen, versionierter Cursor mit Anime-Scope auf vorhandenen Primitiven. PublicGroupedEpisode.episode_id ist in Go/OpenAPI/TypeScript verbindlich, damit gleiche Episodennummern über verschiedene Seiten getrennt bleiben. Der tatsächliche Helper heißt getGroupedEpisodes und hat fünf direkte produktive Caller. Diese bleiben consumergeprüft erhalten. Cover512px und Manifest60s/20ungenutzteEinträge sind die dokumentierten Engineeringdefaults. Ausstehende Byte-/DPR-/Cache-/Querybelege gehören zum Ausführungsgate und sind keine behaupteten Messwerte. [VERIFIED: Abstimmung Backendbericht/Planner13.09.2026]

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
