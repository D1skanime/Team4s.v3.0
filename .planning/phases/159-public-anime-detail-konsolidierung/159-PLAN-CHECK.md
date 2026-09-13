# Phase 159 — Planprüfung

**Status: ISSUES FOUND — 0 BLOCKER, 2 WARNING.** Geschriebene Revision nach Rückmeldung geprüft am13.09.2026. Alle fünf Plans sind ausführbar, sobald Phase158 vollständig implementiert und technisch verifiziert ist. Dieser Bericht selbst öffnet das158-Gate nicht.

## Ergebnis und geschlossene Revision

Die acht Anforderungen und neun Entscheidungen sind konkret auf13Tasks verteilt. Ein echter Crossplan-Vertragsbruch wurde gefunden und vom Planner behoben: Der Cursor unterschied bereits Episoden-IDs, während dem geplanten öffentlichen Episoden-DTO diese Identität fehlte.159-01 liefert nun verbindlich PublicGroupedEpisode.episode_id in Go/OpenAPI/TypeScript;159-03 verwendet sie für Merge, Reactkeys und Expanded-State. Varianten werden nur innerhalb derselben Episode anhand variant_id dedupliziert. Gleiche Episodennummern mit unterschiedlichen IDs bleiben über Cursorseiten getrennt. Der bestehende Admin-Gruppierungsvertrag wird dadurch nicht umgedeutet.

159-RESEARCH enthält jetzt Open Questions (RESOLVED): Default24/Max100, versionierter Animecursor, episode_id, Cover512px und Manifest60s/20ungenutzteEinträge sind entschieden. Die tatsächlichen SQL-/Byte-/DPR-/Cachebelege stehen ausdrücklich noch aus. Das ist keine offene Produktfrage und keine bereits erfolgreiche Messung.

## Structured Issues

```yaml
issues:
  - plan: "159-01"
    dimension: scope_sanity
    severity: warning
    description: "13 Dateien bei drei Tasks überschreiten den nominalen Dateizielbereich. Die Verantwortung ist jedoch zusammenhängend: Consumerfixtures, Public-/Vollprojektion und deren Verträge."
    fix_hint: "Consumer-/Fixturetask vor Änderungen abschließen; SELECT/Scanner/DTO gemeinsam konsistent halten und nach jedem Task fokussiert prüfen. Keine zusätzliche Produktarbeit in diesen Plan aufnehmen; keine weitere Phase erforderlich."
  - plan: "159-03"
    dimension: scope_sanity
    severity: warning
    description: "11 Dateien bei drei Tasks: gemeinsamer Gruppenowner, Publiccursor-/Playintegration und Gridnavigation."
    fix_hint: "Die drei abgegrenzten Aufgaben seriell ausführen. FansubVersionBrowser und api.ts nur innerhalb der zugeordneten Änderungen bearbeiten; keine Medien-/Auth-Umgestaltung hinzufügen."
```

Kein Plan erreicht15Dateien oder fünf Tasks, kein einzelner Task zehn Dateien. Die wenigen zusammenhängenden Verantwortlichkeiten rechtfertigen keinen künstlichen Plan oder eine Phase je Finding. Die zwei Warnungen verhindern die Ausführung nicht.

## Requirement- und Decision-Coverage

| Requirement | Konkrete Aufgaben | Pflichtbelege |
|---|---|---|
|P159-01 / D-02|03 Task1 gemeinsamer Browserowner und kontrollierte Story|Primär/Zweit, sichere Initialprops, Hydration/StrictMode, blockiertes get/set, invalide/entfernte ID, Clear/Fremdkey, echte Multitabs, Animewechsel, null Gruppenwechselfetches|
|P159-02 / D-03|03 Task3 awaitbare Gridnachbarn mit Zielpage und Signaltransport|Drei Pages, vor/zurück über Ränder, erster langsamer Klick, Hover/Focus/Touch-Sharing, stale success/error/finally, Kontextwechsel/Unmount, kein Mountrequest|
|P159-03 / D-04|04 Tasks2–3 bestehender Displayresolver und alle vier Coverconsumer|Provider mit echter Größe; lokale Nextoptimierung;390/1440 und DPR1/2; kalter/warmer Transfer, Maße/MIME/Cache; fehlend/404/500; kein Originalretry oder LocalIP-/Hostfreigabe|
|P159-04 / D-05|04 Task1 vorhandene Manifestmap|Drei Blätter/ein Request, zwei Provider, StrictMode, letzter Consumerabort, TTL/Focus/Reacquire, geänderte SPA-Antwort, gleiche Objektidentität, alte Rejection, Retry,20 inaktive LRUeinträge|
|P159-05 / D-06|01 Task1 Matrix und isolierte Datenfixtures;02 Kollisionsfixture|Fünf direkte Caller und indirekte Admin/Editor/Bulk-Felder, neutrale und gemischte Inventare, Tests vor riskanter Änderung|
|P159-06 / D-07|01 Tasks2–3 Assignment/Pluralgruppen/IDs;02 Streamkette;03 Task2 Playlink|Range-/Assignmentdivergenz; beide SELECT/Scannerpfade; Go/OpenAPI/TS; variant_id und release_version_id; Version10/Variante100 vs fremdeVersion20/Variante10; 401/403/Refresh/Range/Retry und Defaultcompat|
|P159-07 / D-08|01 Publicprojection auf bestehendem Endpoint;03 explizite Fortsetzung|24 Default/100 Maximum atomare Varianten-/Neutralzeilen, limit+1, kein Fanout, gleiche Episodennummern,125Varianten, scoped Cursor, Gesamtcount vor Cursor, keine Lücken/Doppelten, kein N+1|
|P159-08 / D-01/D-09|05 vollständige Browsermatrix und Abschlussgates|Neue159-Baseline am verifizierten158-Endcommit, Tests/Typecheck/Lint/isolierterBuild/diffcheck, aktuelle Request-/SQL-/Medienwerte, Commits/Findings/Dateien/Risiken und offene Human-UAT|

ROADMAP und REQUIREMENTS enthalten alle P159-01 bis P159-08. Jede ID erscheint im Frontmatter mindestens eines Plans und hat eine konkrete Aufgabe. D-01 bis D-09 sind in Taskaktionen abgedeckt. Keine Deferred Idea wird still implementiert. Der begrenzte optionale Streamselector ist mit Ursache, Consumerkette und isolierter Kollision als enger Vertragsfix begründet; kein allgemeiner Entitlement-/Playback-Rewrite.

## Architektur, Verträge und Verifikation

- **Publicinventar:** projection=public ist ausdrücklich Opt-in im bestehenden Episodesendpoint. Vollständige Admin-Defaults bleiben; fünf Caller werden geprüft. Die neue Antwort hat eigenen öffentlichen Gruppentyp mit episode_id, Variante-/Versionsidentität und Pagination. Geplante counts-only-Normalisierung null→[] ist ausdrücklich beschrieben und getestet. Kein pauschales Entfernen von Feldern.
- **Semantik:** id und default_version_id bleiben Variantenaliases; release_version bleibt Label. Segmentfelder werden öffentlich nicht benötigt; der vollständige Admin-/Detailpfad zählt reale theme_segment_assignments statt Range/Label. Keine Veränderung der Origin-/Contributor-/Rollenwahrheit oder persistierter Daten.
- **Pagination:** Eine atomare Zeile je Variante beziehungsweise neutraler Episode, Gruppenaggregation vor LIMIT, totale version_count aus vollständigem Episodenkontext. Kein SSR-Vollseitenloop; explizites Weiterladen unabhängig von Gruppenauswahl. Ein gefilterter leerer Ausschnitt wird nicht als vollständige Leere ausgegeben. Die Grenze gilt für die neue grouped-Projektion, nicht automatisch für den gesamten Anime-Detailfallback oder beliebig lange Textfelder. Tatsächliche JSONbytes werden gemessen.
- **Streamidentität:** Frontend-Playlink→Nextrelay→Grant und Stream→Repository trägt canonical release_version_id plus optionalen variant_id-Selector. SQL bindet beide IDs mit AND; Entitlement/Grantclaim bleibt dieselbe Version. Initialgrant, providedGrant und401-Recovery sind eingeplant. Default ohne Selector bleibt bewusst kompatibel und gegebenenfalls mehrdeutig; kein globales Sicherheitsversprechen darüber.
- **Medien:** Alle vier Coververwendungen teilen eine tatsächlich begrenzte Quelle. Keine fake Querytransformation lokaler Staticfiles, keine manuelle Optimizer-URL, kein Originalfallback und keine Produktions-SSRF-Lockerung.512px ist eine prüfbare Dimensionsentscheidung, keine erfundene KB-Garantie.
- **Cache:** Dieselbe vorhandene Map bleibt Owner; TTL60s und20 ungenutzte erfüllte LRUeinträge. Aktive Referenzen schützen Requests, letzter Abgang abortet mit StrictMode-Reacquire-Schutz. Fehler/Abort löschen nur die eigene Entryidentität. Kein Intervallpoll; Sharing und SPA-Aktualisierung sind beide geprüft geplant.
- **Tiergrenzen:** Untrusted Cursor/IDs validiert der API-/Repositorypfad; fachliche Persistenz bleibt dort. UIselection bleibt Clientzustand, API-/Relayauth bleibt zentral. Keine Securityfähigkeit in einen weniger vertrauenswürdigen Tier verschoben.

## Planstruktur, Abhängigkeiten und Scope

01→02→03→04→05 bildet eine gültige azyklische Kette über Waves1–5.03 nennt zusätzlich01 als explizite Datenabhängigkeit. Alle Referenzen sind vorhanden; Konfliktdateien api.ts,OpenAPI,EpisodeVersionRepository,Page,FansubVersionBrowser werden seriell bearbeitet. Geplante158-Verifikation und158-Harness fehlen vor158-Abschluss erwartungsgemäß; deren echte Existenz/Ergebnis ist Ausführungsvoraussetzung und kein jetzt fälschlich bestandener Check.

Alle13Tasks besitzen Files, Action, Verify und Done. Eigener Lauf des kanonischen GSD-Wrappers verify plan-structure ergab für alle fünf Plans valid:true, keine Strukturfehler. Alle aktuellen Analog-read_first-Dateien existieren. PATTERNS und technische Preflights geben vorhandene Seams vor; keine zweite Query-/Auth-/Medienregistry ist geplant. Research-Resolution ist nach Revision erfüllt.

## Nyquist Compliance

VALIDATION.md vorhanden, nyquist_validation aktiviert. Alle13Tasks besitzen konkrete automatisierte Kommandos; keine Watchflags oder MISSING-Verweise. Neue Tests sollen gemäß execution_rules vor Produktänderung entstehen. Die folgenden Checks sind geplant, nicht durch diese Planprüfung ausgeführt.

| Plan/Task | Wave | Automatisierter Nachweis |
|---|---:|---|
|01/1|1|Go EpisodeVersionPublic Repository/Handler|
|01/2|1|Go EpisodeVersionPublic/ScanEpisodeVersion/ListReleaseVariants|
|01/3|1|Vitest episode-version-contract/api.episode-versions|
|02/1|2|Go StreamIdentity/ReleaseStream|
|02/2|2|Vitest Release-Relay/streamRelayAuth|
|03/1|3|Vitest FansubVersionBrowser/ActiveFansubStory|
|03/2|3|Vitest FansubVersionBrowser/Animepage|
|03/3|3|Vitest AnimeEdgeNavigation/api.anime-list/animeGridContext|
|04/1|4|Vitest AnimeMediaProvider/api.anime-media|
|04/2|4|Vitest animeBackdrops/ResponsiveImage/Config|
|04/3|4|Vitest Pageperformance/MediaProvider/themeVideoAudio|
|05/1|5|verify-anime-detail-phase.sh159 --fixtures|
|05/2|5|verify-anime-detail-phase.sh159 --gates|

Sampling: Wave1 3/3, Wave2 2/2, Wave3 3/3, Wave4 3/3, Wave5 2/2. Schnelle Tasktests werden erst am Ende durch die bewusst vollständigen Browser-/Buildgates ergänzt. Ein übersprungenes DBfixture ist kein SQLbeweis und darf nicht als PASS eingehen.

## Unveränderte Schutzgrenzen

Ausführung ausschließlich auf /home/d1sk/team4s über SSH/Compose. Keine DDL/DML gegen laufende VMdaten, kein Datenreset/Backfill, keine Migration, kein Backendrestart mit Startup-Migration und kein Überschreiben der geteilten Dev.next. Backendtestquellen müssen vor Tests aktuell synchronisiert sein. Fixtures laufen flüchtig und isoliert, SSR gegen GET-only-Fixture-API; Browsermutationen bleiben Mockrequests. Keine neuen Berechtigungsregeln, Rating-/Views-/Embyheuristiken, Anime-Slugroute, Creditfusion, Kommentar-Pagination, strukturelles Redesign oder globale Altfehlerbereinigung.

Human-UAT156 GAP02 und157-06 Task4 bleiben OPEN. Phase159 beginnt nur nach technischem158-PASS; dessen noch offene Human-Abnahmen werden nicht durch Agententests geschlossen. Neue Regressionen werden gegen den gesamten159-Start und den ursprünglichen Auditkontext bewertet, nicht gegen den letzten Einzelplancommit.

## Quellen und Prüfgrenze

Gelesen wurden alle fünf Plans,159-CONTEXT/RESEARCH/VALIDATION/PATTERNS/UI-SPEC und finaler Coverageindex, die Phase159-ROADMAP-/Requirementszuordnung sowie der vollständige Nutzerauftrag. Die vier vollständigen Preflights, AUDIT.md und verbindlichen AGENTS/AI-HANDOFF-/Implementationregeln waren aus der vorausgehenden158-Prüfung geladen. Gezielte bestehende DTO-/Grouped-/Grant-/Stream-/Relay-/Imageconfig-Referenzen dienten der Planbeurteilung. Es wurde keine implementierte Funktionsfähigkeit behauptet und keine Anwendung, Datenbankfixture oder Produkttests ausgeführt.

Nur159-PLAN-CHECK.md durch diesen Checker geschrieben; keine Plans, Produktdateien oder Trackingdateien verändert, kein Commit. Empfehlung: fünf Plans seriell nach positivem158-Ausführungsgate umsetzen, keine weitere Planrevision wegen der beiden Scopehinweise notwendig.

## Geprüfte Planfassungen

| Plan | Tasks | Pfade | Wave | SHA-256 |
|---|---:|---:|---:|---|
|159-01|3|13|1|860b761bda0fb485d0532a0ed8a85200e4ff987e2d894c44093b807a9d3213b1|
|159-02|2|9|2|0c92b101ed6b84bac10b54b95a3c0d5f5d0167ae3d356a454622545110c3b067|
|159-03|3|11|3|ef4854ba73d39e87d8b2577caa018f472033339084db40f21ba9101ea2edb574|
|159-04|3|9|4|cf9290b021b25aef4d08b98e793ce6b886d94711aafec56858f84d4a1a2e91fc|
|159-05|2|6|5|b1ba859e2c7228fb804e5d5de51d193ff8e98621c8566f6b5af93a44ee6ae101|
