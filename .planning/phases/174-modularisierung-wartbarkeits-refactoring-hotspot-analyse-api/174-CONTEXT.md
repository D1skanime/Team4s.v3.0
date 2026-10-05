# Phase 174: Modularisierung & Wartbarkeits-Refactoring — Context

**Gathered:** 2026-10-04
**Status:** Ready for planning
**Quelle:** Nutzer-Spezifikation vom 2026-10-04 (vollständig unten in „Originalspezifikation"). Diese Datei ersetzt discuss-phase; alle Entscheidungen sind vom Nutzer vorgegeben (locked).

<domain>
## Phase Boundary

Verhaltenserhaltendes Refactoring. Team4s hat durch Wachstum Großdateien/God-Modules aufgebaut
(u. a. `frontend/src/lib/api.ts` ~11.500 Zeilen/300 KB, `useAdminAnimeCreateController.ts` ~1.500,
`GroupMediaReviewSection.tsx` ~1.400, `admin/fansubs/create/page.tsx` ~1.100+, `fansub_repository.go`
~2.600+, `admin_content_anime_themes.go` ~2.400+, `anime_assets.go` ~1.800+, `FansubEdit.module.css`
~4.500+, `ui.module.css` ~2.000+). Ziel: klarere Verantwortlichkeiten, geringere Kopplung,
beherrschbare Wartbarkeit — NICHT „kleinere Dateien" als Selbstzweck.

Keine neuen Features, keine fachlichen Änderungen, keine UI-Neugestaltung, keine API-Vertragsänderungen,
keine DB-Migrationen (außer bei nachgewiesenem technischem Fehler).
</domain>

<decisions>
## Implementation Decisions (alle locked)

### Grundprinzip
- **D-01:** Behavior-preserving. Unverändert bleiben: API-Routes, JSON-Contracts, Query-Parameter, HTTP-Statuscodes, DB-Schema, Permissions/Effective Rights, UI-Texte, UI-Reihenfolge, Benutzerflows, Feature-Flags, Session-Verhalten, Pagination-Verhalten. Ausnahme nur bei eindeutig nachgewiesenem Bug, der separat dokumentiert wird.
- **D-02:** Aufteilen nur bei objektivem Gewinn an Verständlichkeit/Testbarkeit/Änderbarkeit. „Datei wird kleiner" ist keine ausreichende Begründung. Keine künstliche Fragmentierung (keine 20 Mini-Komponenten mit 5 Zeilen JSX), keine neuen Abstraktionsschichten/Factories/Interfaces ohne konkreten Nutzen, KISS + bestehende Team4s-Konventionen.
- **D-03:** Bestehende Tests dürfen NICHT angepasst werden, nur damit ein Refactoring grün wird. Ausnahme: reine Import-Pfad-Anpassungen, wenn ein Test interne Modulpfade importiert — diese müssen im SUMMARY einzeln begründet werden.
- **D-04:** Nicht-Ziele: neues Design-System, Frontend-/Repository-Neuarchitektur, Microservices, DDD, CQRS, neue State-Management-Library, Fetch-Wechsel, ORM, Routing-Library, neue Testframeworks, CSS-Framework, komplette TS-Typarchitektur, neue Permission-Architektur.

### Welle 1 — Analyse (kein Refactoring)
- **D-05:** Vollständige Hotspot-Analyse VOR jedem Refactoring als eigenes Artefakt (`174-HOTSPOTS.md` o. ä.): größte TS/TSX/Go/CSS-Dateien, große Funktionen/Komponenten/Hooks/Repositories, Dateien mit vielen Exports, Dateien mit vielen fachlichen Verantwortlichkeiten, starke Import-/Dependency-Knoten, Copy/Paste-Strukturen, parallele Implementierungen gleicher Fachlogik.
- **D-06:** Pro Kandidat bewerten: (1) Größe tatsächlich problematisch? (2) mehrere Verantwortlichkeiten? (3) Kopplung? (4) funktionales Risiko? (5) vorhandene Modulgrenzen? (6) absichernde Tests? Priorisierung P1 (hoher Gewinn/geringes Risiko), P2 (sinnvoll, größere Abhängigkeiten), P3 (bewusst nicht anfassen). Ausgangsmessung (Dateigrößen, Exports/Modul, größte Funktionen, Zyklen) wird als Baseline festgehalten.
- **D-07:** Copy/Paste-Prüfung gezielt für: Permission Checks, Rights Resolution, Anime/Release/Media/Fansub-Group-Mapping, API Error Handling, Pagination, Sorting, Date Formatting, Status Mapping, User/Member Representation. Zusammenführen nur bei wirklich identischer Semantik, ähnlich aussehend reicht nicht.

### Welle 2 — `frontend/src/lib/api.ts` (höchste Priorität)
- **D-08:** Aufteilung in fachliche Module unter `frontend/src/lib/api/` (Zielbild client/auth/anime/episodes/fansubs/members/contributions/media/releases/reviews/permissions/projects/history + `admin/…`). Das Zielbild ist nur Orientierung — reale Grenzen aus den bestehenden Exports ableiten.
- **D-09:** Gemeinsame Infrastruktur (API-Client, Fetch-Wrapper, Auth-Header, Error-Handling, Query-Helpers, Base-URL-Logik Server/Browser, gemeinsame Request-/Response-Typen) genau einmal zentral, nie dupliziert.
- **D-10:** Öffentliche Importfläche `@/lib/api` bleibt kompatibel (Barrel `export * from "./api/…"`), damit Aufrufer nicht massenhaft geändert werden. Falls Barrel Zyklen erzeugt: dokumentieren und gezielt migrieren. Vorher prüfen, wie Next.js/Vitest-Mocks (`vi.mock("@/lib/api")`) mit dem Barrel funktionieren — bestehende Test-Mocks müssen ohne inhaltliche Änderung weiter greifen.
- **D-11:** API-Module bleiben unabhängig von UI (keine Imports aus components/hooks/app). Keine neuen Zyklen api ↔ types ↔ hooks ↔ components ↔ utils.
- **D-12:** In kleinen Commits je Domänengruppe (z. B. `refactor(api): split anime and episode API modules`), nach jedem Schritt typecheck + vitest + lint.

### Welle 3 — Frontend-Hotspots (nur P1)
- **D-13:** Controller/Hooks (z. B. `useAdminAnimeCreateController.ts`) nur entlang tatsächlich trennbarer Verantwortlichkeiten aufteilen (Form State, API-Interaktion, Validation, Episoden, Media, Mapping, Submit). Reine Funktionen (Mapping/Validation) bevorzugt zuerst extrahieren — sie sind isoliert testbar.
- **D-14:** Große TSX-Komponenten (z. B. `GroupMediaReviewSection.tsx`, `admin/fansubs/create/page.tsx`) nur in fachlich nachvollziehbare Einheiten (Liste/Item/Aktionen/Dialog/Hook), Komponente bleibt erkennbare fachliche Einheit. Globale UI-Primitives (`@/components/ui`) und Design-Tokens unverändert weiterverwenden; kein neues UI-Markup. Keine Änderung an Render-/Re-Render-Verhalten, Lazy Loading oder Bundle-Verhalten (keine neuen Client-Boundaries `"use client"` an Stellen, die heute Server-Komponenten sind).

### Welle 4 — Backend-Hotspots (nur klar trennbare Bereiche)
- **D-15:** Repositories (z. B. `fansub_repository.go`) nur entlang sauber trennbarer Domänen in mehrere Dateien desselben Packages aufteilen (Groups/Aliases/Links/Members/History/Merge/Search, falls real so trennbar). Gleiche Typen, Konstruktoren, Methodensignaturen, Interfaces — Services/Handler arbeiten unverändert. Keine neue Repository-Abstraktion.
- **D-16:** Handler (z. B. `admin_content_anime_themes.go`, `anime_assets.go`): HTTP-Parsing/Validation/Mapping/Business-Logic/Persistence/Response unterscheiden. Business-Logik in einen Service nur, wenn sie dort sinnvoll hingehört und es bereits passende Service-Muster gibt; keine künstliche Service-Schicht für triviale Request-Verarbeitung.
- **D-17:** N+1/Query-in-Loop-Kontrolle: Kein Refactoring darf Query-Anzahl erhöhen. Besonders: Release Crew, Contributions, Media, Member Profile Projects, Anime Assets, Themes, Episodes, Imports. Bestehende Query-Budgets und Batch-Mechanismen erhalten. Vorgefundene N+1: dokumentieren + reproduzierbarer Nachweis; risikoarm → in 174 beheben, sonst Folgephase vormerken.

### Welle 5 — CSS
- **D-18:** Große CSS-Module (`FansubEdit.module.css`, `ui.module.css`) nur dort trennen, wo im JSX bereits logisch getrennte Komponenten/Features existieren (z. B. Layout/Form/Members/Media/History). Kein „4500 Zeilen → 40 Dateien". Globale Tokens/Variablen wiederverwenden, nichts duplizieren. Visuelle Gleichheit muss nachgewiesen werden (gleiche Klassen-Regeln, gleiche Kaskaden-Reihenfolge; Achtung: CSS-Modul-Aufteilung kann Spezifität/Reihenfolge ändern).

### Tests, Qualität, Performance
- **D-19:** Vor jeder Refactoring-Welle relevante Tests identifizieren. Nach jedem Schritt: Go-Tests (betroffene Pakete), Frontend-Vitest, TypeScript-Check, Lint, Build. Kein großer Block mit Test erst am Ende. Bekannte Vorbestands-Fehler (z. B. fehlende PHASE128-DSN) als Baseline erfassen und nicht als neue Regression werten.
- **D-20:** Unzureichend abgesicherte Bereiche bekommen VOR dem Refactoring Characterization Tests (aktuelles Verhalten festhalten → refactoren → identisch grün). Schwerpunkte: API-Mapping, Rights, Media, Releases, Contributions, Admin Anime, Fansub Edit.
- **D-21:** Performance vorher/nachher für kritische Refactorings: SQL Query Count, API Calls, Render-Verhalten, Bundle Impact, unnötige Re-Renders, Lazy Loading. „Code schöner, App langsamer" ist nicht akzeptabel.

### Git / Working Tree
- **D-22:** Auf `main` (keine Worktrees/Branches, `use_worktrees=false`). Vor Start und vor jedem Commit Working Tree und parallele Läufe prüfen; fremde Änderungen (z. B. aktuell `.planning/sketches/`) nicht anfassen, nie `git add .`/`-A`, nie `git stash`, nur eigene Pfade stagen. Commits logisch je Refactoring-Welle/Domäne, keine Riesen-Commits.

### Abschluss
- **D-23:** Welle 6 Abschlussaudit: erneut messen (größte Dateien, größte Funktionen, Exports/Modul, Tests, Build, Query Counts, Dependency-Zyklen) und vorher/nachher vergleichen. Abschlussbericht `174-REPORT.md` mit: analysierte Hotspots, refactorte Bereiche, bewusst nicht refactorte Bereiche (mit Begründung), alte/neue Dateigrößen, neue Modulstruktur, Tests, Performance, Query Counts, offene technische Schulden, Empfehlungen für Folgephasen.
- **D-24:** Neue/geänderte Produktionsdateien halten die 450-Zeilen-Regel ein, wo die Aufteilung fachlich trägt; wo eine Datei bewusst größer bleibt, im Report begründen (keine stillen neuen Ausnahmen).

### Testen von Admin-Klickabläufen (Nachtrag 2026-10-05, Nutzerentscheidung)
- **D-25 (Prinzip, Nutzer):** Automatische Tests prüfen, ob die Funktion hinter einem Button das tut, was sie soll (richtige API mit richtigen Daten, richtige Zustandsänderung, richtiger Fehlerpfad) — auf Funktions-/Hook-Ebene, ohne Seite zu rendern oder zu klicken. UI-Verhalten (sichtbar, klickbar, Reihenfolge, Darstellung) wird live geprüft.
- **D-25:** Admin-Klickabläufe in der UI (Formulare bedienen, Aliase/Links/Uploads, Speichern, Drag & Drop, Dialoge) werden **live vom Nutzer abgenommen** (Checkliste `174-UAT-CHECKLIST.md`, Abnahme nach Welle 3 und nach Welle 5), nicht durch neue Klick-Simulationstests. Neue automatisierte Tests nur für stabile, deterministische Logik (reine Funktionen, Payload-/Mapping-Verhalten, Repository-Ebene). Bestehende Tests bleiben unverändert und müssen grün bleiben (D-03). Ein neuer Charakterisierungstest, der gegen den unveränderten Code nicht grün oder nicht deterministisch ist, wird nicht aufgenommen, sondern als UAT-Punkt geführt.

### Claude's Discretion
- Konkrete Modulgrenzen, Dateinamen und Reihenfolge innerhalb der Wellen — abgeleitet aus Welle-1-Analyse.
- Welche Kandidaten P1/P2/P3 werden (P2/P3 werden in dieser Phase nicht umgesetzt, nur dokumentiert).
- Werkzeuge für Zyklus-/Größenmessung (z. B. madge/eigene Skripte), solange keine neuen Runtime-Dependencies ins Produkt kommen.
</decisions>

<canonical_refs>
## Canonical References
- `CLAUDE.md` — Konventionen (450-Zeilen-Regel, globale UI-Primitives Pflicht, Umlaute, Arbeiten auf main)
- `frontend/src/lib/api.ts` — Haupt-Hotspot Welle 2
- `frontend/eslint.config.mjs`, `frontend/vitest.config.ts` — Lint/Test-Setup
- `backend/internal/repository/`, `backend/internal/handlers/`, `backend/internal/services/` — Backend-Hotspots
- `shared/contracts/` — darf sich NICHT ändern (D-01)
</canonical_refs>

<code_context>
## Verifikation (Betriebsdetails)
- Frontend: `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run …"` / typecheck / eslint im Container; Prod-Build autoritativ via `docker compose build team4sv30-frontend`.
- Go-Tests: golang:1.25-alpine-Container im Netz `team4s_default`, DSN aus Backend-Container, Test-DB-Namensguard beachten.
- Backend-Änderungen live erst nach `docker compose up -d --build team4sv30-backend`.
</code_context>

<deferred>
## Deferred
- Alle P2/P3-Kandidaten aus der Hotspot-Analyse → im Report als Folgephasen-Empfehlung.
- Größere N+1-Umbauten mit fachlicher Tragweite → eigene Folgephase.
</deferred>

## Wellenstruktur (vom Nutzer vorgegeben)
1. Analyse (kein Refactoring) → Hotspot-Liste, Verantwortlichkeiten, Risiko, Testabdeckung, Modulgrenzen, Priorisierung, Baseline-Messung
2. API-Modularisierung `frontend/src/lib/api.ts`
3. Frontend-Hotspots (nur P1)
4. Backend-Hotspots (nur klar trennbare Repository-/Handler-Bereiche)
5. CSS (nur eindeutig komponenten-/featurebezogen)
6. Abschlussaudit + `174-REPORT.md`

Welle 3–5 hängen inhaltlich von der Welle-1-Priorisierung ab. Pläne für 3–5 müssen ihre Zielkandidaten
aus `174-HOTSPOTS.md` beziehen bzw. die in der Research bereits als P1 belegten Kandidaten konkret benennen.

## Definition of Done (Nutzer)
1. Hotspots systematisch analysiert. 2. api.ts modularisiert oder nachvollziehbar begründet, was zusammenbleibt.
3. Wichtigste P1-Frontend-Hotspots modularisiert. 4. Wichtigste P1-Backend-Hotspots modularisiert.
5. CSS dort getrennt, wo echte Grenzen bestehen. 6. Keine öffentliche API verändert. 7. Keine fachliche
Funktionalität verändert. 8. Keine neuen Dependency-Zyklen. 9. Keine neuen N+1. 10. Bestehende Tests grün.
11. Typecheck, Lint, Build grün. 12. Backend-Suite grün. 13. Characterization Tests für schwach abgesicherte
Bereiche. 14. Query Counts kritischer Bereiche nicht schlechter. 15. Abschlussbericht (siehe D-23).

**Entscheidungsfrage bei jeder Extraktion:** „Wird der Code dadurch tatsächlich leichter verständlich,
testbar und änderbar?" — „Die Datei wird kleiner" reicht nicht.

