# Phase 174 — Plan-Härtung vor Ausführung

**Datum:** 2026-10-04
**Art:** Gezielte Robustheitskorrektur der bestehenden 26 Pläne — keine Neuplanung, keine
Scope-Erweiterung, keine Code-Änderungen am Produkt. Alle Korrekturen wurden gegen den echten
Code in `/home/d1sk/team4s` verifiziert (grep/Read), nicht nur gegen die Pläne selbst.

Geänderte Dateien (21 von 26 Plänen + `174-VALIDATION.md`):
`174-01`, `174-02`, `174-03`, `174-04`, `174-05`, `174-06`, `174-08`, `174-09`, `174-12`, `174-13`,
`174-14`, `174-16`, `174-17`, `174-18`, `174-19`, `174-20`, `174-21`, `174-22`, `174-23`, `174-24`,
`174-VALIDATION.md`. Unverändert, weil keine der 7 Prüfpunkte dort einen Treffer ergab: `174-07`,
`174-10`, `174-11`, `174-15`, `174-25`, `174-26`. `174-HOTSPOTS.md`, `174-CONTEXT.md`,
`174-RESEARCH.md`, `174-PATTERNS.md` wurden nicht angefasst (keine PLAN-Dateien bzw. explizit
außerhalb des Auftragsumfangs).

---

## 1. ApiError / Shared-Types in Welle 2 — Zyklus-Risiko entkräftet, nicht neu gebaut

**Befund (Code-Fakt):** `AdminAnimeAniSearchEditConflictResult`/`AdminAnimeAniSearchCreateConflictResult`
sind heute in `frontend/src/types/admin.ts` definiert — NICHT in `api.ts` und NICHT in irgendeiner
`lib/api/*`-Datei. `types/admin.ts` importiert nur aus `@/types/anime` und `./episodeClassification`,
hat also keine Rückabhängigkeit auf `lib/api/*`. Ein neues neutrales Shared-Types-Modul
(`lib/api/types.ts` o. ä.) war damit nicht nötig — `@/types/admin` ist bereits der neutrale,
zyklusfreie Ort.

**Zusätzlicher Fund:** `frontend/src/lib/api/` existiert bereits heute (vor Phase 174) mit zwei
unabhängigen Dateien (`admin-anime-intake.ts`, `segment-contributors.ts` + Test) — diese importieren
`ApiError`/`apiClientFetch`/`parseApiErrorPayload`/`buildCreateAnimeConflictAwareApiError` bereits
heute aus `@/lib/api`. Das ist live-Beleg dafür, dass "Domänenmodul → Client-Infra" (nie umgekehrt)
hier schon der etablierte, funktionierende Fluss ist, und dass `api.ts` (Datei) + `api/`
(Geschwister-Verzeichnis) bereits ohne TS/Next.js-Kollision koexistieren.

**Korrekturen:**
- `174-02` Task 1: Hinweis ergänzt, dass `lib/api/` bereits 2 Fremd-Dateien enthält (nicht anfassen);
  die Kollisions-Frage ist bereits live bewiesen, der `tsc`-Lauf bestätigt es nur noch für `client.ts`.
- `174-02` Task 2 + `<interfaces>`-Block: `ApiError`/Konflikt-Typen werden explizit aus `@/types/admin`
  importiert (nie aus einer `lib/api/admin/*`-Datei, die zu diesem Zeitpunkt noch gar nicht existiert).
  Neue `must_haves.truths`-Zeile fixiert die Richtung `client.ts → @/types/admin` explizit.
- `174-03` Task 1: Klarstellung, dass "Typen mitnehmen" sich nur auf Typen bezieht, die aktuell in
  `api.ts` selbst stehen — die beiden Konflikt-Typen bleiben in `@/types/admin`, werden NICHT nach
  `admin/anime.ts` verschoben (das würde `client.ts → admin/anime.ts` erzwingen).
- `174-08` Task 2 (Zyklus-Check, Welle-2-Abschluss): expliziter Grep-Check ergänzt, dass `client.ts`
  die beiden Typen nur aus `@/types/admin` importiert und sie nirgends unter `lib/api/*` neu definiert
  werden — die konkrete D-11-Richtungsprüfung, die vorher fehlte.
- `174-08` Task 1 (Export-Diff-Beweis): Grep-Glob um die 5 neuen Canary-Dateien (Punkt 2) und die 2
  bereits bestehenden Fremd-Dateien (`admin-anime-intake.ts`, `segment-contributors.ts`) bereinigt —
  sonst hätte der 371-Export-Abgleich durch meine eigene Canary-Korrektur (Punkt 2) einen falschen
  Mismatch erzeugt.

Öffentliche Typnamen, `ApiError`-Signatur und Laufzeitverhalten bleiben unverändert — reine
Klarstellung der Importrichtung, keine neue Abstraktion.

---

## 2. Vitest-Barrel-Canary — in 4 isolierte Dateien aufgeteilt

**Befund (Code-Fakt, per grep):** Im Repo kommen mindestens 3 unterschiedliche Mock-Strategien gegen
`@/lib/api` vor: (a) echter, ungemockter Import; (b) volles literal-factory `vi.mock('@/lib/api', () =>
({...}))` (Mehrheit, 120+ Dateien); (c) partielles `vi.mock('@/lib/api', async () => { ... vi.importActual
...})` (7 Dateien, z. B. `RolesClient.test.tsx`); (d) `import * as api from '@/lib/api'` + laufzeit-
`vi.spyOn(api, 'fn')` OHNE jeden `vi.mock`-Aufruf (bestätigt in `ReleaseNotesList.test.tsx` und
`ReleaseGallery.test.tsx`) — dieses vierte Muster fehlte im ursprünglichen Plan komplett. Pfad-Varianten
wie `@/lib/api.ts` kommen nicht vor; Sub-Pfad-Mocks existieren (`@/lib/api/segment-contributors`,
`@/lib/api/admin-anime-intake`), betreffen aber bereits bestehende, von Phase 174 unberührte Dateien.

**Problem im Originalplan:** `174-02` Task 3 wollte alle 3 (damals bekannten) Muster in EINER Testdatei
unterbringen — `vi.mock('@/lib/api', ...)` wird pro Datei gehoistet, zwei unterschiedlich geformte
`vi.mock`-Aufrufe für denselben Modulpfad in derselben Datei kollidieren.

**Korrektur:** `174-02` Task 3 komplett neu geschrieben — 4 Dateien statt 1:
`canary.barrel.consumer.ts` (trivialer, nicht-Test-Helfer), `canary.barrel.real.test.ts` (Muster a),
`canary.barrel.literal-mock.test.ts` (Muster b), `canary.barrel.import-actual.test.ts` (Muster c),
`canary.barrel.spyon.test.ts` (Muster d, neu). `files_modified`, `artifacts`, Objective, Threat-Model,
Verification und Success-Criteria entsprechend aktualisiert. Alle 4 Canaries müssen vor dem ersten
Funktions-Move grün sein (Task 3 von `174-02`, vor `174-03`–`174-07`) und bleiben laut `174-08`s
Abschluss-Gate unverändert grün (Full-Suite-Lauf in `174-08` Task 2 deckt sie mit ab).

---

## 3. Negative Grep-Verifikationen — 19 Stellen in 10 Dateien korrigiert

**Muster:** `grep -c "X" datei` (oder `grep -n`) erwartet laut Akzeptanzkriterium 0 Treffer ("returns 0",
"returns nothing"). `grep` liefert bei 0 Treffern aber immer Exit-Code 1 — in einer `&&`-Kette (oder als
alleinstehender Befehl) wird der korrekte Endzustand fälschlich als Fehler gewertet.

Automatisiert über alle 26 Pläne nach `grep -c`, `grep -n ... returns nothing/0`, `wc -l`-Mustern
gesucht und jede Stelle einzeln gegen die zugehörige Akzeptanzkriterien-Prosa geprüft (positiv vs.
negativ). Alle echten Negativ-Fälle wurden auf `! grep -q "..." datei` (harte 0-Erwartung) bzw. auf
`grep -c "..." datei || true; <rest>` (informativ, bei "0 ODER dokumentierter Rest") umgestellt.
Positive Checks (>=1 erwartet) unverändert gelassen — u. a. bewusst NICHT angefasst:
`174-19` Zeile 102 (erwartet exakt 5, positiv) und `174-07` Zeile 95 (zählt alle `^export`-Zeilen,
erwartet implizit >0 — schwache, aber nicht fälschlich-negative Verifikation, siehe "Restrisiken").

| Plan | Task | Zeile(n) | Befund | Fix |
|------|------|----------|--------|-----|
| 174-02 | Task 2 Verify | 139 | `grep -c` erwartet 0 (resolveApiUrl/ApiError/apiClientFetch aus api.ts entfernt) in einer `&&`-Kette | `! grep -q` für den ersten Teil |
| 174-03 | Task 1 Verify | 82 | `grep -cE` erwartet 0 (42 admin-anime-Funktionen aus api.ts entfernt), alleinstehend | `! grep -qE` |
| 174-03 | Task 2 Verify | 101 | wie oben, 20 Episoden/User-Funktionen | `! grep -qE` |
| 174-04 | Task 1 Verify | 82 | wie oben, 48 fansubs/episodes-Funktionen | `! grep -qE` |
| 174-04 | Task 2 Verify | 101 | wie oben, 20 members/projects-Funktionen | `! grep -qE` |
| 174-05 | Task 1 Verify | 82 | wie oben, 34 auth/permissions-Funktionen | `! grep -qE` |
| 174-05 | Task 2 Verify | 101 | wie oben, 30 reviews/history-Funktionen | `! grep -qE` |
| 174-06 | Task 2 Verify | 102 | wie oben, 46 media/assets-Funktionen | `! grep -qE` |
| 174-09 | Task 1 Verify (neu, siehe Punkt 6) | — | neue Negativ-Prüfung "kein neuer Export" | direkt als `! grep -qE` geschrieben |
| 174-12 | Task 2 Verify | 97 | `grep -c` erwartet 0 (keine inline `async function handle/apply/loadMedia` mehr in der Komponente) | `! grep -q` |
| 174-13 | Task 1 Verify | 84 | `grep -n '"use client"'` erwartet 0 Treffer in 2 neuen Dateien | `! grep -q` |
| 174-13 | Task 2 Verify | 103 | wie oben, 2 weitere neue Dateien | `! grep -q` |
| 174-14 | Task (Aliases/Links/Media) Verify | 107 | wie oben, 3 neue Dateien | `! grep -q` |
| 174-16 | Task 1/2/3 Verify | 81, 100, 121 | `grep -n` erwartet 0 (Groups/Links/Aliases-Cluster aus fansub_repository.go entfernt) | `! grep -q`, je Zeile |
| 174-17 | Task 2/3 Verify | 105, 127 | wie oben, Members/AnimeLinks- bzw. Merge-Cluster | `! grep -q`, je Zeile |
| 174-18 | Task 1/2 Verify | 81, 101 | wie oben, Theme-CRUD- bzw. Segment-Library-Cluster | `! grep -q`, je Zeile |
| 174-18 | Task 3 Verify | 122 | `grep -c` erwartet "0 ODER dokumentierter kleiner Rest" (kein hartes 0) | `grep -c ... || true; go build ...` (informativ, kein Gate) |
| 174-19 | Task 1 Verify | 81 | `grep -n` erwartet 0 (Cover/Banner/Logo-Cluster entfernt) | `! grep -q` |
| 174-20 | Task 1/2 Verify | 83, 104 | wie oben, Upload- bzw. List-Handler | `! grep -q`, je Zeile |
| 174-20 | Task 3 Verify | 126 | `grep -c` erwartet "0 ODER dokumentierter Rest" | `grep -c ... || true; go build ...` |

Jede Korrektur wurde gegen den echten Code live getestet (z. B. `! grep -q "...FansubRepository...
ListGroups..." fansub_repository.go` liefert heute korrekt Exit 1, weil die Funktionen noch nicht
verschoben sind — nach dem Split liefert derselbe Befehl Exit 0).

---

## 4. CSS-Baseline vor 174-22/174-23 — verpflichtend statt "falls vorhanden", ohne Wave-Umbau

**Entscheidung:** Baseline-Erfassung NICHT als neuer Task 1 in `174-22` (das hätte wegen des
gemeinsamen Wave 14 mit `174-23` entweder einen Same-Wave-`depends_on` erzwungen — Verstoß gegen
Punkt 7s eigene Regel "kein Plan hängt von einem gleich- oder späteren Wave ab" — oder einen
Wave-Umbau erfordert). Stattdessen: neuer **Task 4 in `174-01`** (Welle 1, "Analyse/Baseline" — passt
inhaltlich zu D-05/D-06s "Ausgangsmessung"), lange vor Wave 14. Keine Wave-Umnummerierung nötig.

**174-01 Task 4 (neu):** Nutzt das bestehende Playwright-Setup (`frontend/scripts/shot.mjs` als
Vorlage, vorher `docker restart team4sv30-frontend` gegen Zombie-Chromium). Erfasst verpflichtend:
Fansub-Edit Desktop (1440×900), Fansub-Edit Mobile (~375px), `/dev/ui-system` Desktop, sowie
Best-Effort Hover/Focus/Disabled-Zustände für Button/Input/Select. Ablage unter
`visual-baseline/before/` + `BASELINE-NOTES.md` (exakte URL/Viewport/Zustands-Trigger-Parameter für
reproduzierbare Nachaufnahme). Eigener Commit.

**174-01 Task 3 (neu, Query-Count — siehe Punkt 5)** wurde vor Task 4 eingefügt; die bestehende
Artefakt-Schreib-/Commit-Aufgabe ist jetzt **Task 5**.

**174-22/174-23:** Je ein Hinweis-Absatz ergänzt, dass die Baseline bereits in `174-01` existiert und
diese Pläne selbst keine Screenshots erzeugen müssen (keine Task-Struktur-Änderung nötig, da sie ohnehin
nichts zur Baseline beitragen mussten).

**174-24:** Umgebaut von 1 auf 2 Tasks. Neuer **Task 1** (automatisiert): nimmt `visual-baseline/after/`
mit IDENTISCHEN Parametern (gleiche Viewports/URLs/Fansub-Group-ID/Zustands-Trigger laut
`BASELINE-NOTES.md`) auf, committed separat. **Task 2** (Human-Check, vormals einziger Task): Vergleich
jetzt explizit paarweise before/after plus Live-Stichprobe — da `pixelmatch`/ähnliches keine bestehende
Dependency ist (geprüft: `frontend/package.json` enthält `playwright`, aber kein `pixelmatch`/`pngjs`/
`@playwright/test`), erfolgt der Vergleich als dokumentierter Seite-an-Seite-Sichtvergleich statt
automatischem Pixel-Diff — keine neue Produkt-Dependency. Der alte Fallback-Satz "if unsure, check out
the pre-174-22 commit in a scratch checkout" wurde entfernt (D-22 verbietet ad-hoc Checkouts ohnehin;
die jetzt verpflichtende Baseline macht ihn überflüssig).

---

## 5. Query-Count-Baseline in 174-01 für Welle 4 — ohne historischen Checkout

**Konkrete Endpunkte ermittelt (live im Code, `backend/cmd/server/main.go` + Handler):**

| D-17-Bereich | Endpoint | Betroffen durch |
|---|---|---|
| Contributions / Member Profile Projects | `GET /api/v1/fansub-slugs/:slug/public-profile` (→ `FansubRepository.GetPublicProfileBySlug`/`listPublicFansubProjects`) | 174-17 |
| Themes | `GET /api/v1/admin/anime/:id/themes` | 174-18 |
| Anime Assets | `GET /api/v1/anime/:id/backdrops` (→ `AnimeAssetRepository.GetResolvedAssets`) | 174-19 |
| Release Crew / Media | `GET /api/v1/admin/release-versions/:versionId/media` | 174-20 |

Episodes und Imports haben keine Überschneidung mit einer Welle-4-berührten Datei — im neuen Task
explizit als "kein Ziel, nicht erfunden" vermerkt statt stillschweigend ausgelassen.

**174-01 Task 3 (neu):** Misst für alle 4 Endpunkte den BEFORE-Query-Count (`pg_stat_statements`, Fallback
auf temporäre, vor Commit zurückgesetzte Logging-Zeile — identisch zur Methode, die `174-21` schon für
AFTER vorsah). Ergebnis als neue Sektion "Welle-4 Endpoint Query-Count Baseline" in `174-HOTSPOTS.md`.

**174-21 (Welle-4-Abschluss):** Task 1 umgeschrieben — liest jetzt direkt `174-HOTSPOTS.md`s BEFORE-Werte,
wiederholt dieselbe Methodik für AFTER, vergleicht direkt. Jede Erwähnung von "isolated comparison run
against code checked out at the pre-174-16 commit" entfernt — kein Git-Checkout/Stash/Worktree mehr im
Plan. `174-VALIDATION.md` entsprechend nachgezogen.

---

## 6. 174-09 — keine Test-only-Exports für die 16 Pure Helpers

**Befund (Code-Fakt):** `grep -n "^export " frontend/src/app/admin/fansubs/create/page.tsx` zeigt: NUR
der default-exportierte `AdminFansubCreatePage` ist exportiert. Alle 15–16 Pure Helpers
(`slugify`, `isValidSlug`, `parseYear`, `toOptional`, `isAbsoluteURL`, `mapGroupToForm`, `mapGroupMedia`,
`legacyLinksFromGroup`, `mapGroupLinks`, `emptyForm`, `createEmptyLink`, `errMessage`,
`formToCreatePayload`, `formToPatchPayload`, `sortAliases`, …) sind modul-privat.

**Zusatzbefund:** `174-14` behandelt diese 16 Helpers explizit als "already extracted, out of scope" —
sie werden in GANZ Phase 174 NIE in ein eigenes internes Modul verschoben (nur die ~872-Zeilen-Komponente
`AdminFansubCreateContent` wird in Hook + Sections gesplittet, die Helpers bleiben unangetastet in
`page.tsx`). Der vom Nutzer skizzierte Bedingungsfall ("Export erst, wenn die Helpers im eigentlichen
Refactoring verschoben werden") tritt in dieser Phase also nie ein.

**Korrektur `174-09` Task 1:** Komplett umgeschrieben von "16 direkte Unit-Tests via Import" zu
"Charakterisierung über die Komponente" — jeder Helper wird indirekt über Render-Output,
Formular-Interaktion oder das an die gemockte API gesendete Payload geprüft (Slug-Autogenerierung inkl.
Umlaut-Fall, Edit-Mode-Vorbelegung via die Mapper, Payload-Form via `formToCreatePayload`,
Validierungsfehlertext via `errMessage`, Alias-Sortierung via `sortAliases`). Neue harte Verify-Zeile:
`! grep -qE "^export (function|const) (slugify|...)\b" page.tsx` — stellt sicher, dass kein neuer Export
hinzukommt. Neue `must_haves.truths`-Zeile dokumentiert die Entscheidung explizit.

**174-14 angepasst:** Verweis auf "the 16 pure-helper unit tests" ersetzt durch "render/interaction/
payload-shape tests that indirectly characterize the 16 pure helpers ... none of which are exported".

---

## 7. Konsistenzcheck über alle 26 Pläne

- **Wave/depends_on:** Alle 26 Pläne durchgescannt (Plan-Nr., Wave, `depends_on`) — kein Plan hängt von
  einem gleich- oder späteren Wave ab (Tabelle geprüft, lückenlos monoton). Meine neuen/verschobenen
  Tasks (174-01 Task 3/4, 174-24 Task 1/2) ändern weder Wave noch `depends_on` von irgendeinem Plan.
- **XML/Tag-Balance:** Alle 26 `*-PLAN.md` auf balancierte `<task>`, `<verify>`, `<automated>`,
  `<read_first>`, `<interfaces>` geprüft. Dabei einen eigenen Fehler sofort gefunden und behoben: beim
  Einfügen von `174-01` Task 3 fehlte initial ein schließendes `</automated>` — korrigiert und erneut
  verifiziert (alle Tags jetzt 1:1 balanciert, keine Fehlalarme übrig außer bekannten Prosa-Erwähnungen
  wie "`<interfaces>` block" in Fließtext, die keine echten Tags sind).
- **YAML-Frontmatter:** Alle 26 Dateien mit `python3 -c "yaml.safe_load(...)"` geparst — valide.
- **VALIDATION-Mapping:** `174-VALIDATION.md` aktualisiert für alle Stellen, die durch Punkt 1/2/4/5
  materiell anders aussehen (174-01: jetzt 5 Tasks statt 3, neue Requirements D-17/D-18/D-21; 174-02:
  "4 isolierte Canaries" statt "ein Canary-Test"; 174-21: Beschreibung jetzt "gegen 174-01s Baseline,
  kein Checkout"; 174-24: jetzt T1/T2 statt nur T1; Wave-0-Bullet für die Canaries; Manual-Only-Zeile für
  D-18 erweitert um die Baseline-Erfassung).
- **D-01..D-24-Zitate:** Stichprobenartig nachverfolgt — alle neuen/geänderten Stellen zitieren
  bestehende Decisions (D-04, D-11, D-17, D-18, D-21, D-22), keine neue Decision erfunden.
- **Keine Scope-Erweiterung:** Keine der Korrekturen führt neue Architektur, neue Abstraktion oder neue
  Produkt-Dependency ein. Die einzigen neuen Artefakte sind reine Planungs-/Mess-/Test-Dateien
  (`174-HOTSPOTS.md`-Erweiterungen, `visual-baseline/`, 4 Canary-Testdateien + 1 Helfer,
  `page.test.tsx`-Inhalt) — exakt im Rahmen dessen, was die betroffenen Pläne ohnehin schon produzieren
  sollten.
- **`gsd-sdk query`-Werkzeuge:** Nicht verfügbar in dieser Session (kein MCP-Tool dafür verbunden);
  Konsistenzprüfung stattdessen per direktem Frontmatter-Parsing (siehe oben) durchgeführt.

---

## Verbleibende bekannte Ausführungsrisiken

1. **174-07 Zeile 95** (`grep -c "^export" frontend/src/lib/api.ts`) ist als automatisierte Verifikation
   schwach: sie zählt alle `^export`-Zeilen (inkl. der gewünschten `export * from`-Barrel-Zeilen) und
   kann daher nie 0 sein — sie beweist NICHT automatisiert, dass keine direkten Funktions-/Interface-
   Definitionen mehr übrig sind, wie es das Akzeptanzkriterium behauptet. Das ist kein "0-Treffer-
   erwartet-aber-Exit-1"-Bug (Punkt 3s Muster), sondern eine zu schwache positive Prüfung. Nicht
   korrigiert, da außerhalb des wörtlichen Scopes von Punkt 3 und eine Verschärfung der Prüf-Regex
   selbst einer kleinen Neuplanung nahekäme; sollte bei Ausführung von 174-07 manuell zusätzlich per
   Sichtprüfung abgesichert werden.
2. **174-09s indirekte Helper-Charakterisierung** kann je nach tatsächlichem Komponentenverhalten nicht
   alle 16 Helfer lückenlos über Render/Interaktion erreichen (z. B. falls ein Helper nur in einem
   Edge-Case-Pfad hängt, der über die UI schwer auszulösen ist). Der Plan verlangt in diesem Fall eine
   explizite Lücken-Dokumentation statt eines Test-only-Exports — das ist beabsichtigt, bedeutet aber,
   dass 100 %-Helfer-Abdeckung beim Ausführen nicht garantiert ist. Für eine künftige Phase, die diese
   Helpers tatsächlich in ein eigenes Modul verschiebt, wären direkte Unit-Tests dann regulär möglich.
3. **Query-Count-Messung (174-01 Task 3 / 174-21)** hängt von der Verfügbarkeit von
   `pg_stat_statements` in der Dev-/Test-DB ab; ist die Extension nicht aktivierbar, muss der
   Fallback (temporäre Logging-Zeile) in BEIDEN Plänen identisch ausgeführt werden, sonst sind
   BEFORE/AFTER nicht vergleichbar — das ist im Plantext explizit verlangt, aber die tatsächliche
   Konsistenz hängt vom Ausführer ab.
4. **Visual-Baseline-Reproduzierbarkeit** hängt an der realen Existenz der in `174-01` Task 4
   verwendeten Fansub-Group-ID zum Zeitpunkt von `174-24` (viele Wellen später). Der Plan verlangt eine
   explizit dokumentierte Ersatz-ID falls die Zeile nicht mehr existiert, garantiert aber keine
   pixel-identische Dateninhalt-Wiederholung, falls sich Beispieldaten im Dev-System zwischenzeitlich
   ändern.
5. Alle übrigen, in den 26 Plänen bereits vor dieser Korrektur vorhandenen Risiken (Blast-Radius-Caps,
   D-04-Grenzen, Characterization-Test-Abdeckung) wurden NICHT erneut geprüft, da außerhalb der 7
   angefragten Punkte — frühere Runden (`aa134c3b`, `0bd3d876`) hatten diese bereits adressiert.

---

## Gesamtaussage

Phase 174 ist nach dieser Korrekturrunde **ohne weitere Neuplanung ausführbar**. Alle 7 angefragten
Punkte wurden faktenbasiert (gegen den echten Code, nicht nur gegen die Pläne) behoben:
Zyklus-Richtung bei den ApiError-Typen ist jetzt explizit verifiziert und abgesichert; die
Vitest-Canary deckt alle 4 im Repo tatsächlich vorkommenden Mock-Muster isoliert ab; alle 19 echten
Negativ-Grep-Bugs in 10 Dateien sind robust umgestellt; die CSS-Baseline ist jetzt verpflichtend, liegt
in Welle 1 (kein Wave-Umbau) und wird in 174-24 paarweise nachgewiesen; die Query-Count-Baseline für
Welle 4 liegt jetzt konkret und checkout-frei vor; 174-09 exportiert nichts mehr nur für Tests; und die
Wave-/Dependency-/YAML-/Tag-Konsistenz über alle 26 Pläne wurde verifiziert. Die unter "Verbleibende
Risiken" genannten Punkte sind Restrisiken der Ausführung selbst (Datenverfügbarkeit, DB-Extension,
Abdeckungstiefe), keine Planungsfehler mehr.


---

## Nachkorrektur (Review durch Orchestrator, 2026-10-04)

- **174-07 Task-Verify:** `grep -c "^export"` war immer grün (Re-Exporte zählen mit) und bewies nicht „nur noch Barrel-Zeilen“. Ersetzt durch Zählung aller `^export`-Zeilen, die KEIN `export * from` sind, mit Erwartung 0 (exit-code-robust).
- **174-01 Task 3 / 174-21:** Falscher Compose-Service (`postgres`) und nicht gesetzte `$POSTGRES_USER/$POSTGRES_DB` korrigiert auf `team4sv30-db`, `-U team4s -d team4s_v2`. `pg_stat_statements` ist installierbar, aber nicht in `shared_preload_libraries` → ohne DB-Neustart unbrauchbar. Feste, in beiden Plänen identische Messmethode ergänzt: temporär `log_statement=all` per `ALTER SYSTEM` + `pg_reload_conf()`, Endpoint einmal aufrufen, Statement-Zeilen im DB-Log zählen (3 Läufe, Minimum), danach immer `ALTER SYSTEM RESET`. Kein Produktcode-Eingriff zur Messung nötig.
- Übrige `grep -c`-Prüfungen ohne `|| true` erwarten ≥1 Treffer (positive Checks) und sind korrekt.

- **Auth 174-21/174-24 (2026-10-05):** In 174-01 wurde mangels Vorgabe das Passwort des KC-Users `admin` per kcadm zurückgesetzt. Beide Pläne verwenden jetzt verbindlich den Test-User `timer`; Passwort-Resets/Rechtevergabe an anderen Usern sind verboten, fehlende Rechte werden als Checkpoint gemeldet.

- **174-14 Task 2b (D-25, 2026-10-05):** Die 16 reinen Helfer werden 1:1 in das routeninterne Modul `adminFansubCreateHelpers.ts` verschoben (gemeinsam genutzt von page, Actions-Hook und Sektionen) und dort direkt per Unit-Test abgesichert (keine Oberfläche, keine Timer, < 5 s). Ersetzt die in 174-09 entfernten instabilen Klick-Tests für Alias-Sortierung, Patch-Payload und Link-Abgleich auf Logik-Ebene.
