# Phase 159 — Planindex und Quellenabdeckung

Status: geplant. Ausführung erst nach technisch verifizierter Phase158. Baseline ist deren Abschlusscommit; vor159-Ausführung frisch eintragen. Keine neue Humanfreigabe vorausgesetzt, keine bestehende UAT automatisch geschlossen.

| Plan | Wave | Needs | Creates | Checkpoint |
|---|---:|---|---|---|
|159-01|1|158 technisch verifiziert; Consumer-Matrix|Publiccursor, explizite IDs, Assignment-Vollprojektion und Verträge|keiner|
|159-02|2|159-01 Identitäten|Expliziter Variantenselector in bestehender Stream-/Grant-/Relaykette|keiner|
|159-03|3|159-01/02|Ein Gruppenzustand, sichtbare Cursorfortsetzung, eindeutiger Playlink, Gridnachbarn|keiner|
|159-04|4|159-03 wegen gemeinsamer Page/api.ts|Budgetierte Bilder und begrenztes Manifestsharing|keiner|
|159-05|5|159-04 und gesamte vorherige Kette|Technische Gesamtverifikation mit Browser/SQL/Contract/Buildbelegen|kein erfundener Human-Signoff|

Serielle Ausführung wegen use_worktrees=false. Keine gleichzeitigen Bearbeiter für api.ts, OpenAPI, EpisodeVersionRepository, FansubVersionBrowser oder Animepage.159-01 besitzt Public-/Vollvertragsänderungen;159-02 ergänzt ausschließlich den engen Streamvertrag;159-03 verdrahtet konsumierende UI und Gridtransport;159-04 ergänzt den Manifesttransport und Bildquellen. Atomare Commits nach Tests; kein Push.

## Multi-Source Coverage Audit

| SOURCE | ID | Feature/Requirement | Plan | Status |
|---|---|---|---|---|
|GOAL|159|Gemeinsamer Zustand, verlässliche Navigation, begrenzte Medien und belastbare Variantenverträge|01–05|COVERED|
|REQ|P159-01|Ein SSR-deterministischer Gruppenowner, Storage/Multitab, null Wechselrequests|03,05|COVERED|
|REQ|P159-02|Gridziel mit Page, erster Async-Klick, Abort, lazy Interaktion|03,05|COVERED|
|REQ|P159-03|Tatsächliches Coverbudget für alle vier Consumer, Provider/lokal|04,05|COVERED|
|REQ|P159-04|Geteiltes Manifest, TTL/Eviction/Abort/Retry/SPAänderung|04,05|COVERED|
|REQ|P159-05|Vollständige Consumer-Matrix und isolierte Fixtures zuerst, neutrale Fallbacks|01,02,03,05|COVERED|
|REQ|P159-06|Assignmentautorität, fansub_groups-Vertrag, eindeutige IDs, Streamcompat|01,02,03,05|COVERED|
|REQ|P159-07|Begrenzte atomare Rows, sichtbare Fortsetzung, kein N+1|01,03,05|COVERED|
|REQ|P159-08|Vollständige technische Nutzermatrix und frische Gates|05|COVERED|
|CONTEXT|D-01|158 vor159, genau zwei Phasen, Alt-UAT/Scope|alle|COVERED|
|CONTEXT|D-02|Gruppenstate/Persistierung/Multitab|03,05|COVERED|
|CONTEXT|D-03|Gridnachbarn|03,05|COVERED|
|CONTEXT|D-04|Echtes Bildbudget|04,05|COVERED|
|CONTEXT|D-05|Begrenztes Manifestsharing|04,05|COVERED|
|CONTEXT|D-06|Consumerprüfung und neutrale Episoden|01,03,05|COVERED|
|CONTEXT|D-07|Assignment-, ID- und Vertragswahrheit|01,02,03,05|COVERED|
|CONTEXT|D-08|Begrenztes Inventar ohne N+1|01,03,05|COVERED|
|CONTEXT|D-09|Technische Gates ohne Live-Datenänderung|alle,05|COVERED|
|RESEARCH|Backendmatrix|Fünf direkte grouped-Caller, alle Felder/Scanner/Writeantworten erhalten|01|COVERED|
|RESEARCH|Cursor|Vorhandene Default24/Max100, limit+1, eigener Anime-Scope, stabile Atomzeilen mit PublicGroupedEpisode.episode_id|01,03|COVERED|
|RESEARCH|Neutralität|Gemischtes Inventar enthält neutrale Episoden, Default bleibt vollständig|01,03|COVERED|
|RESEARCH|Segment|Kein Publicsegmentjoin; echte Assignments im Voll-DTo|01|COVERED|
|RESEARCH|Identity|id/default_version_id bleiben Variantenaliases; explicit variant_id + release_version_id|01,02,03|COVERED|
|RESEARCH|Collision|Version10/Variante100; fremdeVersion20/Variante10; Source und Entitlement identisch|02,05|COVERED|
|RESEARCH|Groupowner|Bestehender Browser mit kontrolliertem Storyblatt, SSRfirst/StorageafterMount|03|COVERED|
|RESEARCH|Grid|Direkt awaitbares Ergebnis, Zielpage, bestehender API-Signaltransport|03|COVERED|
|RESEARCH|Media|Alle vier Coverstellen,512px-Vorschlag, vorhandener Provider-/Nextoptimizer|04,05|COVERED|
|RESEARCH|Cache|60s TTL,20 inaktive LRUeinträge, Referenzen/StrictMode/identische Objektidentität|04,05|COVERED|
|RESEARCH|Runtime|Container/tmp-Build, GET-only SSRfixtures, isoliertes DSN, kein Backendneustart|05|COVERED|

## Fallmatrix und Grenzen

159-03/05 prüfen Primär-/Zweitgruppe, ungültige/entfernte gespeicherte ID, blockierten Storage, Reload/Hydration, zwei Tabs, Animewechsel, synchronisierte Story/Filter/Versionen und null fachliche Requests beim Gruppenwechsel.

159-03/05 prüfen drei Gridseiten, beide Seitenränder, Vorwärts/Rückwärts, ersten Klick mit verzögerter Antwort, Hover/Focus/Touch, laufende Navigation, stale success/error/finally und null Initialrequest.

159-04/05 prüfen390/1440px und DPR1/2, lokale/externe Quellen, kalten/warmen Cache, fehlende Bilder/404/500, dekodierte Größe und Transferbytes aller Coverconsumer, identische URLs, Manifeständerung in derselben SPA, StrictMode, letzter Consumer, viele Animewechsel und weiterhin genau einen geteilten Manifestrequest.

159-01/02/03/05 prüfen leere Serie, neutrale Episode, gemischtes Inventar, mehrere Gruppen/Varianten/Streams, verschiedene und gleiche IDs, isolierte Kollision, Range-/Assignmentdivergenz, Voll-/Publicvertrag,125 Varianten derselben Episode, gleiche Episodennummern, Cursor-Scope, maximal24/100 atomare Ausgabezeilen und konstante Queryzahl.

Rowlimit ist eine belegte Grenze der neuen Publicgrouped-Projektion; es ist keine erfundene universelle Bytegarantie und begrenzt nicht automatisch die bestehende neutrale Anime-Detailfallbackliste. Tatsächliche Payloadbytes werden gemessen. Kein stilles automatisches Durchlaufen aller Cursorpages.

Der neue explizite Streamselector muss vollständig sicher sein. Die historische Mehrdeutigkeit des ausdrücklich erhaltenen Default-Compatibilitypfads wird als verbleibende Grenze benannt; dessen pauschaler Rewrite ist nicht autorisiert.

## Ausdrückliche Ausschlüsse

F15-Shell-DTO, Kommentar-Pagination/Produktentscheidung, Audio-/Videoneudefinition, Anime-Slugroute, Rating-/Viewsystem, Emby-IDheuristik, Creditfusion, pauschale DTO-/Tabellen-/Daten-/Routenlöschung, Redesign und globale Altfehlerbereinigung. Human-UAT156 GAP02 und157-06 Task4 bleibt OPEN.

Alle vier Quellentypen sind abgedeckt. Durchführung und Beweisführung sind noch offen.
