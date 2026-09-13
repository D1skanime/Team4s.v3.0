# Phase 158 — Planprüfung

Status: ISSUES FOUND — 0 BLOCKER, 3 WARNING (Revision 2, 13.09.2026). Ausführung möglich. Geprüft: 158-01 bis 158-04. Ausschließlich statische Planprüfung; keine Implementierung, Anwendungstests oder Human-Abnahme.

## Ergebnis

Der Phasenumfang ist vollständig auf konkrete Tasks verteilt. Beide Blocker der ersten Prüfung sind in der geschriebenen Revision behoben und gezielt erneut geprüft. Es ist keine weitere Planrevision erforderlich; drei nicht blockierende Dateizahl-Hinweise bleiben. Genau vier Plans innerhalb Phase158, keine zusätzliche Phase oder Gap-Unterphase.

| Erledigter Blocker | Verifizierte Revision |
|---|---|
| Fehlende Sessiongeneration bei null/blockierter Meta |158-02 Task1 spezifiziert accountGeneration für vorhandenes AUTH_SESSION_CHANGED_EVENT bei unbekannter Identität; Tasks2/3 binden Ergebnisse daran; Null-/Blocked-Meta-A→B bei gleichen Bools wird getestet. Bekannte Identität bleibt bei Fokus/Rotation stabil.|
| Unzugeordneter Compatibility-Typefix |158-01 Task3 besitzt konkrete numerische page.tsx und page.test.tsx, Promise-only-Änderung, Read-first und Testkommando.158-04 darf nur verifizieren, keine zusätzliche Produktarbeit.|

## Structured Issues

```yaml
issues:
  - plan: "158-01"
    dimension: scope_sanity
    severity: warning
    description: "11 Pfade bei drei Tasks liegen über dem nominellen Dateiziel. Inhaltlich sind sie auf Relationsprüfung, Slugprojektion und die direkt verbundenen Verträge/Tests begrenzt."
    fix_hint: "Die drei Tasks seriell mit gezielten Checks ausführen; keine weitere Produktarbeit hinzufügen. Ein neuer Plan oder eine weitere Phase ist dafür nicht erforderlich."
  - plan: "158-02"
    dimension: scope_sanity
    severity: warning
    description: "12 Pfade bei drei Tasks: zentrale Sessionnaht, Watchlistzustand und Kommentar-/Contributionzustände."
    fix_hint: "Taskweise Tests und scoped Commits; Auth-/Refresh-Infrastruktur nur additiv und ohne weiteren Rework anfassen. Keine Scopeerweiterung."
  - plan: "158-03"
    dimension: scope_sanity
    severity: warning
    description: "14 Pfade bei drei Tasks liegen nahe15; zwei Loading-Renames zählen als je alter und neuer Pfad. Tatsächlich begrenzt auf Route/Metadata, Loadinggrenzen und bestehende Layout-/Linkintegration."
    fix_hint: "Scope in diesen Verantwortlichkeiten halten; keine weiteren Vertragsdateien hinzufügen. Bei echtem Mehrumfang innerhalb der vorhandenen zwei Phasen umverteilen."
```

Die Warnungen disqualifizieren die Ausführung nicht: kein Plan hat fünf Tasks oder15Pfadänderungen, kein einzelner Task zehn Dateien. Keine stillschweigende Kürzung einer Nutzeranforderung ist zur Einhaltung des Umfangs vorgesehen.

## Verifizierte Abdeckung

| Requirement | Konkrete Implementierung | Abschlussbeleg |
|---|---|---|
|P158-01|02 Task3 Contributionfarben;03 Task3 Episodenkartenfarbe|04 Farben und beide Episodenzustände|
|P158-02|03 Task3 lokaler heroBanner-Clip|04 alle fünf Breiten, scrollWidth, scrollX, Fokus/Slider|
|P158-03|02 Tasks1–3 zentrale Access-ODER-Refreshsession|04 Session-/Fehler-/Ownerwechselmatrix|
|P158-04|02 Task2 unknown/present/absent/error;Task3 Contributionszustände|04 401/5xx/Netz/Retry/Customfehler|
|P158-05|03 Tasks1–3 strikteID, Cacheloader, Metadata, Boundaryverlagerung|04 tatsächlicherHTTP404 mit Browser-UA und Requestcounter|
|P158-06|03 Task3 falsche7.8/0Views entfernen, Emby22 erhalten|04 Browser/Regression|
|P158-07|01 Slugprojektion/Vertrag;03 gespeicherteSlugs→Builder|04 Pretty/Canonical/numericCompatibility|
|P158-08|01 Task1 ExistsVisible+bestehendeRelationsquery|IsolierteDB/QueryTracer: Erfolg2, fehlend1, ungültig0|
|P158-09|04 Tasks1–2 volle Matrix, Gates und Bericht|technical_passed nur ohne neue oder offene Pflichtregression|

D-01 bis D-08 sind in Taskaktionen abgedeckt. Kein Task setzt eine Deferred Idea um. Kein unbewiesener SQL-/Latenzgewinn wird als bereits erreicht behauptet.

## Dimensionen

| Dimension | Ergebnis |
|---|---|
|Requirement Coverage|Neun ROADMAP-IDs in mindestens einem Plan; konkrete Tasks vorhanden|
|Task Completeness|Alle11Tasks mit Files/Action/Verify/Done; GSDverify.plan-structure viermal valid:true, geänderte01/02 anschließend erneut valid:true|
|Dependency Correctness|01/02 Wave1→03 Wave2→04 Wave3; acyclic; alle Referenzen gültig; tatsächliche Ausführung ausdrücklich seriell|
|Key Links|Slug Basequery→DTO→Prettybuilder, Session→API→UI, memoizedAnime→Page/Metadata, Fixtureharness→Results/Gate sind geplant|
|Scope Sanity|01/02/03 nicht blockierende Dateizahl-Warnungen; drei kohärente Tasks pro Implementierungsplan;04 zwei Gate-Tasks|
|Verification Derivation|Nutzerbeobachtbare truths; Technical-PASS getrennt vom späteren Human-UAT|
|Context Compliance|D-03-Nullfall vollständig nachgezogen; D-01..08 abgedeckt; Deferred Ideas ausgeschlossen|
|Scope Reduction|Keine stillen v1-/Placeholder-/Deferred-Abkürzungen; Backend5xx nicht als404; fehlerhafter Watchliststatus nicht alsfalse|
|Architectural Tier|ID/Metadata im Frontendserver; Visibility in Repository; Browser nutzt nur zentrale Auth; kein weniger vertrauenswürdiger Securityowner|
|Nyquist|VALIDATION vorhanden;11/11Tasks besitzen automatisierte Verify-Kommandos; keine Watchflags/MISSING-Verweise|
|Cross-plan Data Contracts|01 liefert additiveAnimeSlug;03 konsumiert nach Dependency;02 besitzt Watchlistclient;03 entfernt SSRduplikat; kein inkompatibler Datentransform|
|AGENTS Compliance|SSHkanonisch; Analog-read_first; keine LiveDBwrites/Backendrestarts/Dev.next-Builds; minimaleCSSseams; Altfehler gegen gesamten Phasenstart|
|Research Resolution|Open Questions (RESOLVED) vorhanden, Ausführungsbeweise ausdrücklich noch offen|
|Pattern Compliance|Aufgabenspezifische vorhandene Analoga in read_first; referenzierte Dateien vorhanden; keine neue parallele Auth-/Media-/Routenwelt|

## Nyquist-Taskmap

| Task | Plan | Wave | Automatisierter Nachweis | Status |
|---|---|---|---|---|
|1|01|1|go test Repository/Handler AnimePublicRead/AnimeRelations|geplant|
|2|01|1|go test Repository AnimePublicRead|geplant|
|3|01|1|Vitest anime-detail-contract und numeric group/page|geplant|
|1|02|1|Vitest api.auth-refresh/session-switch/no-token/useAuthSession|geplant|
|2|02|1|Vitest WatchlistAddButton|geplant|
|3|02|1|Vitest CommentForm/AnimeContributionsSection|geplant|
|1|03|2|Vitest animeDetailData/page|geplant|
|2|03|2|Vitest animeDetailData/page; echtesHTTP im Gate|geplant|
|3|03|2|Vitest page/performance/FansubVersionBrowser|geplant|
|1|04|3|verify-anime-detail-phase.sh158 --fixtures|geplant|
|2|04|3|verify-anime-detail-phase.sh158 --gates|geplant|

Sampling: Wave1=6/6, Wave2=3/3, Wave3=2/2 mit automatisiertem Verify. Neue Tests werden laut execution_rules vor Produktänderung erstellt; keine fehlende Wave0-Verknüpfung. Der bewusst vollständige Browser-/Produktionsbuild-Abschluss ist langsam und folgt auf die schnellen Taskchecks; nicht als Ersatz für sie verwenden.

## Schutzgrenzen und Quellen

158-04 lässt Phase159 ausschließlich nach technical_passed zu. Human-UAT156 GAP02 und157-06 Task4 bleiben OPEN. Baseline ist7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85, nicht der letzte Plancommit. Bestehende2CSSGuardfailures/2TS2344/13Lintfehler331Warnings werden getrennt dokumentiert; neue Regressionen sind nicht erlaubt.

Gelesen: AGENTS,AI-HANDOFF, vier Plans, CONTEXT/RESEARCH/VALIDATION/PATTERNS/UI-SPEC/Planindex, relevante ROADMAP-/PROJECT-/Requirementsvorgaben, AUDIT.md und alle vier vollständigen Implementation-Preflights. Gezielte Referenzprüfung der zentralen Sessionmetadaten/-events und Watchlist404-Semantik diente der Planbeurteilung, nicht einer Implementierungsabnahme. GSD-Gates/Thinkingmodels/Fewshotkalibrierung sowie projektspezifischer Implementation-Contract wurden berücksichtigt.

Nur dieses PLAN-CHECK-Dokument durch den Checker geschrieben. Keine Plans oder Produktdateien verändert, keine Commits, keine Tests/Builds/Anwendungsaufrufe ausgeführt.

## Prüffassung und Übergabe

| Plan | Tasks | Pfade | Wave | SHA-256 |
|---|---:|---:|---:|---|
|158-01|3|11|1|b4bbcec8bf6ea4579d5a96191859318c648a1d6fe665f70d370743219d7ab18f|
|158-02|3|12|1|f3e1157a35302f4d6031354f7172a09aa3761dee5139de05346498f2ddc900f6|
|158-03|3|14|2|5a3a4dacf99c0f4e8eac71e2728e95985ec6395a31ca522c4013f9c2720a5c4a|
|158-04|2|6|3|d57f54728cddbff48b15ee92ad0331bf970171177042d1ce40a8ab08b39b53ae|

ROADMAP-Anforderungen: alle P158-01 bis P158-09 in mindestens einem requirements-Frontmatter und konkreter Aufgabe. Zentrale REQUIREMENTS-Registrierung wird parallel vom GSD-Dokumentationsbesitzer abgeschlossen; beim letzten Check noch nicht vorhanden. Diese Trackingkorrektur darf keine156/157-Abnahmen verändern. ROADMAP/CONTEXT/Plans sind bereits vollständig.

Empfehlung:158-01→158-02→158-03→158-04 seriell ausführen.159 ausschließlich nach positivem technischem158-Gate. Dieser Plancheck ist keine erfolgreiche Code-, Test-, Browser-, SQL- oder Human-UAT-Verifikation.
