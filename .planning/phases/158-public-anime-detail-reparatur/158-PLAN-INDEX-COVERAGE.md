# Phase 158 — Planindex und vollständige Quellenabdeckung

Status: geplant, nicht implementiert. Baseline: 7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85.

| Plan | Wave | Needs | Creates | Checkpoint |
|---|---:|---|---|---|
|158-01|1|Vorhandene Animequery/Relationsnaht|Autoritativer Slug, schmale Sichtbarkeitsprüfung, Promise-only-Compatibilityvertrag und Tests|keiner|
|158-02|1|Zentrale Session-/API-Infrastruktur|Sessionfähige Watchlist/Kommentare, getrennte Fehlerzustände|keiner|
|158-03|2|158-01 und158-02|Strikte404/Metadata, lokale CSSfixes, Kennzahlenbereinigung, Prettyintegration|keiner|
|158-04|3|158-03|Technische Gesamtverifikation, isolierte Browser-/SQL-/Buildbelege|keine Humanfreigabe erfunden|

use_worktrees=false: alle Plans seriell ausführen, selbst logisch unabhängige Wave1-Plans. Gemeinsame Konfliktdateien: api.ts wird158-02 verändert, page.tsx ausschließlich158-03; OpenAPI/AnimeDetail und der Promise-only-Vertrag der numerischen Compatibilitypage gehören158-01. Contribution-CSS gehört158-02, Episoden-/Page-CSS158-03. Plan158-04 führt erst nach produktiven Plans die Gesamtgates aus. Nächste Phase159 startet nur bei technischer Verifikation158, ohne neue Humanapprovalpause.

## Multi-Source Coverage Audit

| SOURCE | ID | Feature/Requirement | Plan | Status |
|---|---|---|---|---|
|GOAL|158|Sichtbare Fehler, Sessionverhalten, Navigation und Relationskosten korrigieren|01–04|COVERED|
|REQ|P158-01|Episoden- und Contributionkontrast|02,03,04|COVERED|
|REQ|P158-02|Kein Hero-/Dokumentoverflow, lokaler Clip|03,04|COVERED|
|REQ|P158-03|Access/Refresh, Sessionänderung, zentrale Auth|02,04|COVERED|
|REQ|P158-04|Loading/leer/error, Watchlistunknown, Customfehler|02,04|COVERED|
|REQ|P158-05|Strikte positive IDs, echte404, Titel/Canonical/Robots|03,04|COVERED|
|REQ|P158-06|Fake7.8/0Views entfernen, Emby22 unverändert|03,04|COVERED|
|REQ|P158-07|Autoritative Pretty-Projektnavigation, numeric Compatibility|01,03,04|COVERED|
|REQ|P158-08|Relations maximal2Datenstatements und Statussemantik|01,04|COVERED|
|REQ|P158-09|Nutzerfallmatrix, Gates, Belege, Alt-UAT offen|04|COVERED|
|CONTEXT|D-01|Genau2Phasen/Sequenz/Alt-UAT|alle,04 Gate|COVERED|
|CONTEXT|D-02|Lesbarkeit und Overflow|02,03,04|COVERED|
|CONTEXT|D-03|Session und Fehler|02,04|COVERED|
|CONTEXT|D-04|StrikteID/echte404/Loading/Metadata|03,04|COVERED|
|CONTEXT|D-05|Fakekennzahlen/Embygrenze|03,04|COVERED|
|CONTEXT|D-06|Prettyautorität/Contract/numeric|01,03,04|COVERED|
|CONTEXT|D-07|Relations|01,04|COVERED|
|CONTEXT|D-08|Gates/keineDatenwrites|alle,04|COVERED|
|RESEARCH|Relations|CommentRepository.animeExists als passende Analogie; keine Schemaquery|01|COVERED|
|RESEARCH|Slugs|Optionaler vorhandener Anime-Slug, keine Extraquery|01,03|COVERED|
|RESEARCH|Session|Stabile Accountidentität plus Authchanged-Generation bei fehlender Meta; keine lokalen Tokenleser|02|COVERED|
|RESEARCH|Streaming|Automatische Loadinggrenzen fachlich verlagern,404 vor Contentstreaming|03,04|COVERED|
|RESEARCH|Runtime|Kein Backendrestart mit Migration; kein Build im Dev.next|alle,04|COVERED|
|RESEARCH|Baseline|Phasebaseline statt Planbaseline;2CSS-Testfehler/2TS2344/13Lintfehler331Warnings|04|COVERED|
|RESEARCH|UI|Bestehende Tokens/Struktur und tatsächliche Farben/Geometrie|02,03,04|COVERED|

## Verbindliche Abnahmematrix

158-04 prüft360,390,767,768,1440px, jeweils geschlossene/offene Episode; scrollWidth<=Viewport und aktiver Scrollversuch; berechnete Farben und Fokus/Slider. Sessionmatrix: Access,Refresh-only,expiredAccess+gültigerRefresh,keineTokens,Session-/Accountwechsel nach Mount,401,5xx,Netzfehler,bestehenderEintrag. Routingmatrix: gültig,1abc,1.5,0,negative,unsafe,unknown,HTTPstatus/Titel/Canonical/Robots; Pretty-Link und numeric Compatibility. Relationsmatrix: mit/ohne,unknown,disabled,Fehler und echter QueryTracer.

## Ausdrückliche Ausschlüsse

Keine F15-Shellprojektion, Kommentar-Pagination, Audio-/Videoneudefinition, Anime-Slugroute, Rating-/Viewdatenbank, Emby-IDheuristik, Creditfusion, pauschale DTO-/Daten-/Routenlöschung, Redesign oder globale Lint-/Typebereinigung. Phase156 GAP02/156-11Task2 und157-06Task4 bleiben OPEN. Automatisierte technische Abnahme schließt keine menschliche UAT.

Keine Source-Lücke im Planumfang. Die Durchführung und Beweise sind noch offen.
