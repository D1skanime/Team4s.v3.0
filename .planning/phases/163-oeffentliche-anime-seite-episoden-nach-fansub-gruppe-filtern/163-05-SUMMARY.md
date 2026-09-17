---
phase: 163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern
plan: 05
subsystem: api
tags: [postgres, nextjs, episodes, fansub-groups, live-verification, uat]

# Dependency graph
requires:
  - phase: 163-01
    provides: "Backend RED test baseline (episode_version_public_integration_test.go corrected assertions + episode_version_public_group_filter_test.go new fixture) turned GREEN by 163-02"
  - phase: 163-02
    provides: "publicEpisodeQuery v2 (INNER JOIN LATERAL + EXISTS gate), fansub-slug resolver, cursor v2, episode_count — the backend fix verified live in this plan"
  - phase: 163-03
    provides: "Frontend RED test baseline (19 locked assertions) turned GREEN by 163-04"
  - phase: 163-04
    provides: "Frontend GREEN implementation (group-switch refetch, dimming, error/retry, empty state) verified live in this plan's browser UAT"
provides:
  - "Live container rebuild (team4sv30-backend rebuilt, team4sv30-frontend restarted) running the phase's finished code"
  - "Live, read-only curl evidence confirming the fix against real Naruto data in team4s_v2"
  - "Human live-browser sign-off (all 6 mandatory checks) for AnimeOwnage/Project-Messiah/Alle/coop on the real Naruto anime detail page"
  - "The phase's mandatory Abschlussbericht (163-USER-REQUEST.md closing section), synthesizing evidence from Plans 163-01..163-04"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Closing-plan synthesis: the phase's final report cites, rather than re-derives, evidence already captured in each prior plan's SUMMARY.md"

key-files:
  created:
    - .planning/phases/163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern/163-05-SUMMARY.md
  modified: []

key-decisions:
  - "Task 1's container rebuild and read-only curl verification, and Task 2's human live-browser sign-off, were executed and confirmed in a prior agent turn before this closing plan resumed at Task 3; this SUMMARY documents both from the completed-tasks record handed to this executor plus independent confirmation that all prior commits (163-01 through 163-04) and the running containers are intact and healthy."
  - "No production code was touched in this plan — Task 3 is documentation/tracking only, per the plan's files_modified: [] and this plan's own resume instructions."

requirements-completed: [REQ-163-16, REQ-163-23]

# Metrics
duration: ~15min (Task 3 only; Tasks 1-2 executed and approved in a prior turn)
completed: 2026-09-17
---

# Phase 163 Plan 05: Live Rebuild, UAT Sign-Off, and Abschlussbericht Summary

**Rebuilt containers verified the D-01/D-02 neutral-row fix and the fansub group filter live against the real Naruto dataset (episode_count 5/3/3, ids 53-57, coop episode 57), a human operator approved all 6 mandatory browser checks against the real anime detail page, and this SUMMARY assembles the phase's 13-item Abschlussbericht required by 163-USER-REQUEST.md's closing section.**

## Performance

- **Duration:** ~15 min for Task 3 (documentation only); Tasks 1-2 were executed and human-approved in a prior agent turn
- **Completed:** 2026-09-17
- **Tasks:** 3/3 completed (1: rebuild+curl, 2: human-verify checkpoint, 3: this Abschlussbericht)
- **Files modified:** 0 production files; 1 new file (this SUMMARY.md)

## Accomplishments

- Live containers (`team4sv30-backend`, `team4sv30-frontend`) rebuilt/restarted and confirmed healthy — verified independently at the start of this turn (`docker compose ps`: both `Up`, backend "About an hour", frontend "About an hour", no stale state).
- Live read-only curl evidence (Task 1) confirms the fix against real production data: unfiltered "Alle" returns exactly `episode_count: 5` (episode ids 53-57); `fansub=animeownage` returns `episode_count: 3` (ids 53, 54, 57); `fansub=project-messiah` returns `episode_count: 3` (ids 55, 56, 57); the coop episode (id 57, Folge 5) is present under both single-group filters and under "Alle", with its version's `fansub_groups` containing both groups. No writes were issued against `team4s_v2`.
- Human live-browser UAT (Task 2) approved: all 6 mandatory checks passed on the real Naruto anime detail page via the SSH tunnel (`http://127.0.0.1:3300`) — "Alle" shows only real episodes, AnimeOwnage hides Project-Messiah-only episodes (dim transition, no skeleton, updated "Episoden (N)" heading), Project Messiah hides AnimeOwnage-only episodes, Folge 5 (coop) stays visible under both single-group filters and "Alle" showing both groups, "Alle" restores both groups, and the browser back button reloads rather than showing a stale cached view.
- This SUMMARY.md assembles the complete, traceable 13-item Abschlussbericht (below), closing 163-USER-REQUEST.md's `## Verifikation mit realen Daten` and `## Abschlussbericht` requirements.
- Verified all prior commits (163-01 through 163-04, `a08a5f43` through `7b30ee25`) are present and unmodified in `git log`; working tree is clean.

## Task Commits

Tasks 1 and 2 have no code commits (Task 1: `files: none`, read-only verification; Task 2: `files: none`, manual verification only — both per plan). Task 3 is documentation-only (this SUMMARY.md + tracking-file updates), committed as follows:

1. **Task 1: Rebuild containers, live read-only API verification for Naruto** — no code commit (verified: `docker compose ps` healthy, read-only `curl` evidence recorded above and in "Abschlussbericht" item 9 below).
2. **Task 2: Live browser UAT — Naruto AnimeOwnage/Project Messiah/Alle/coop** — no code commit (human "approved" outcome recorded verbatim in "Abschlussbericht" item 12 below).
3. **Task 3: Assemble the Abschlussbericht** — this SUMMARY.md, committed together with STATE.md/ROADMAP.md/REQUIREMENTS.md tracking updates (see final commit hash in the orchestrator's completion report).

## Files Created/Modified

- `.planning/phases/163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern/163-05-SUMMARY.md` (this file) — the phase's mandatory Abschlussbericht.
- No production code files were created or modified by this plan.

## Decisions Made

See `key-decisions` in frontmatter above (Tasks 1-2 executed/approved in a prior turn, independently re-confirmed here; Task 3 is documentation-only).

## Abschlussbericht

Per `163-USER-REQUEST.md`'s closing section ("Am Ende berichten: ..."), covering all 13 required items in order. Each item cites the specific prior-plan evidence it synthesizes, per this plan's own Task 3 action text.

### 1. Ursache des bisherigen Fehlverhaltens

Zwei unabhängige Ursachen, beide live gegen `team4s_v2` verifiziert (`163-RESEARCH.md`'s Summary, empirisch bestätigt in `163-01-SUMMARY.md`'s Task-1-Baseline):

- **Neutral-Row-Bug:** `publicEpisodeQuery`'s `inventory`-CTE verband Episoden mit ihren Release-Varianten über `LEFT JOIN LATERAL`. Besaß eine Episode keine passende Variante (kein Release, oder ein Release ohne `release_variants`, oder — nach dieser Phase — ohne `release_version_groups`), erzeugte der `LEFT JOIN` trotzdem genau eine "neutrale" Zeile mit `NULL`-Variantenspalten. Diese neutrale Zeile machte live alle 220 Naruto-Episoden in "Alle" sichtbar, obwohl nur 5 tatsächlich ein Release besitzen — bestätigt durch `163-01-SUMMARY.md`'s live `EXPLAIN (ANALYZE, BUFFERS)`-Lauf: `Subquery Scan on inventory ... rows=220`.
- **Fehlender serverseitiger Gruppenfilter:** `PublicEpisodeOptions` besaß vor dieser Phase ausschließlich `Limit`/`Cursor`; die Handler-Allowlist (`parseStrictNamedQuery`) akzeptierte keinen Gruppenparameter überhaupt. Jede Gruppenfilterung fand ausschließlich clientseitig über bereits geladene Seiten statt (`163-RESEARCH.md`'s Summary, Pitfall-Beschreibung).

### 2. Welche Filterlogik vorher vorhanden war

Rein clientseitig, ausschließlich über bereits im Browser geladene Seiten: `FansubVersionBrowser.tsx`'s `groupMatchedVersions`/`getSummaryVersion`/`hasNoMatchingVersion` filterten `episode.versions` innerhalb schon geladener Episoden-Objekte — genau die vom Auftraggeber in §6 verbotene "Scheinfilterung über Teilmenge". Bei Pagination (Backend liefert nur die ersten N Episoden) konnte eine Gruppe mit Releases erst auf Seite 2+ fälschlich als "keine Episoden" erscheinen (`163-RESEARCH.md`'s Summary; Pflichtfall F wurde genau dafür angelegt).

### 3. Wie die Episodensichtbarkeit jetzt bestimmt wird

`163-02-SUMMARY.md` (Task 1, Commit `0cba3920`): `LEFT JOIN LATERAL` wurde zu `JOIN LATERAL` (`INNER JOIN`), zusätzlich ein unconditional `EXISTS (SELECT 1 FROM release_version_groups rvg WHERE rvg.release_version_id = rev.id AND ($group::BIGINT IS NULL OR rvg.fansub_group_id = $group::BIGINT))` innerhalb der LATERAL-Subquery. Dieses eine Prädikat erfüllt gleichzeitig zwei Rollen: die D-02-Basissichtbarkeitsgate (jede Version braucht ≥1 Variante UND ≥1 Gruppe, unabhängig vom aktiven Filter) und — wenn `$group` gesetzt ist — den eigentlichen Gruppenfilter (Ebene A). Episoden ohne passende Version erzeugen jetzt **keine** Zeile mehr. Live verifiziert: unfiltered "Alle" liefert exakt 5 Episoden (statt 220), AnimeOwnage-gefiltert exakt Episoden 1/2/5 (`163-02-SUMMARY.md`'s Task-3-EXPLAIN-Nachweis).

### 4. Wie Release-Versionen innerhalb der Episode gefiltert werden (Ebene B)

Dasselbe `EXISTS`-Prädikat scopt auch die Fensterfunktionen: `version_count` und `default_version_id` werden aus der `inventory`-CTE berechnet, die bereits nur die gefilterten/passenden Varianten-Zeilen enthält (`163-02-SUMMARY.md` provides-Feld: "`INNER JOIN LATERAL` + unconditional `release_version_groups` EXISTS gate ... D-03"). Frontend-seitig behält `FansubVersionBrowser.tsx` zusätzlich einen defensiven Per-Episode-Filter (`groupMatchedVersions`) für den noch nicht refetchten Erstrender-Zustand (Testfall G, `163-04-SUMMARY.md` key-decisions #2) — die dazugehörige Fehlertext-Anzeige (`hasNoMatchingVersion`/`noVersionHint`) ist vollständig entfernt (D-15), nur der reine Filterprädikat bleibt bestehen, ohne "Keine Version"-Fallback.

### 5. Wie Coop behandelt wird

`EXISTS` ist gruppenanzahl-agnostisch: eine Coop-Version (mehrere `release_version_groups`-Zeilen für dieselbe `release_version_id`) erfüllt die Bedingung für jede beteiligte Gruppe gleichermaßen, ohne Primärgruppen-Logik (`163-RESEARCH.md`'s Pattern 1, D-05). Live bestätigt: Naruto-Episode 5 (id 57) erscheint sowohl unter AnimeOwnage als auch unter Project Messiah als auch unter "Alle", mit derselben Coop-Version (`163-02-SUMMARY.md`'s Task-3-Nachweis: "53, 54, 57" für AnimeOwnage — 57 ist die Coop-Episode; Task-1-Curl-Evidenz dieser Plan bestätigt dasselbe für Project Messiah: ids 55/56/57).

### 6. Wie Pagination/Cursor angepasst wurde

Cursor auf Version 2 angehoben (`163-02-SUMMARY.md` key-decisions #1): das Scope-Feld trägt bewusst den rohen, unaufgelösten Fansub-Slug-String (`json:"g"`), nicht die aufgelöste numerische Gruppen-ID — eine Abweichung von der ursprünglichen Forschungsempfehlung (`163-RESEARCH.md`'s Pattern 2), notwendig damit ein Cursor-Scope-Mismatch mit **null** DB-Roundtrips abgelehnt werden kann (`TestEpisodeVersionPublicGroupFilterCursorScope`s `require.Empty(t, tr.queries, ...)`-Assertion). Der Handler validiert die Cursor-Scope-Übereinstimmung (reines Go, keine DB) **vor** der Slug-Auflösung (1 DB-Query) — ein Cursor aus Filter A wird bei Filter B oder „Alle" abgelehnt (`ErrValidation`/400), bevor überhaupt eine SQL-Anweisung läuft.

### 7. Wie Public Visibility berücksichtigt wird

Dasselbe unconditional `EXISTS(release_version_groups ...)`-Prädikat aus Item 3 ist der D-02-Fail-Closed-Gate: eine Version ohne ≥1 Gruppe macht keine Episode sichtbar — unabhängig davon, ob überhaupt ein Gruppenfilter aktiv ist. `ExistsVisible` (die einzige vorbestehende Public-Gate, Anime-`status <> 'disabled'`) bleibt unverändert (`163-02-SUMMARY.md`'s Next-Phase-Readiness-Notiz: "D-01/D-02 visibility ... complete, tested, and verified live"). Pflichtfall I (`TestEpisodeVersionPublicGroupFilterNonPublicVersion`) beweist den Fail-Closed-Fall fixture-seitig: eine Version mit Variante aber ohne `release_version_groups`-Zeile bleibt unsichtbar (`163-01-SUMMARY.md` Task 3).

### 8. Query-/Performance-Auswirkungen

Vorher-Baseline (`163-01-SUMMARY.md`, live `EXPLAIN (ANALYZE, BUFFERS)` gegen `team4s_v2`, anime_id=4 unfiltered): `Subquery Scan on inventory ... rows=220`, Execution Time 3.005ms. Nachher (`163-02-SUMMARY.md`, dieselbe Query-Form, live verifiziert): unfiltered "Alle" `rows=5`, Execution Time 1.482ms; AnimeOwnage-gefiltert `rows=3`, Execution Time 2.001ms — die `total`-CTE (`COUNT(DISTINCT episode_id)`) für `episode_count` (D-12) läuft im selben Statement, keine Zusatzabfrage. Query-Budget pro Request bleibt konstant: Existenzcheck (1) + optionale Slug-Auflösung, wenn `fansub` gesetzt ist (0 oder 1, anime-scoped, indexbasiert) + Hauptstatement (1) = 2 oder 3 Statements, unabhängig von Episoden-/Versionen-/Gruppenanzahl (`163-RESEARCH.md`'s Pattern 4). `go test ./...` zeigt nach der Änderung exakt dieselben 69 vorbestehenden, umgebungsbedingten Fehlschläge wie die Vorher-Baseline — null neue Fehlschläge, null neue Query-Kosten (`163-02-SUMMARY.md`'s Task-3-Regressionsnachweis).

### 9. Naruto-Regression vorher/nachher (echte Daten)

Der Auftrag (`163-USER-REQUEST.md`, Ausgangslage) illustriert den Bug mit der fiktiven "Folge 23 nur Project Messiah". Der reale Naruto-Datenbestand (`163-CONTEXT.md` D-18, bestätigt durch diese Plans Task-1-Live-Curl-Evidenz) hat Releases ausschließlich auf Folge 1-5; Folge 23 selbst besitzt **kein** Release überhaupt (weder vorher noch nachher sichtbar — korrekt, da fail-closed). Die echte, äquivalente Regression:

- **Vorher** (Neutral-Row-Bug, `163-01-SUMMARY.md`'s Live-Baseline): alle 220 Episoden erscheinen unter "Alle", inklusive Folge 23 mit `version_count: 0` — die genaue Live-Bestätigung des Bugs in Produktionsdaten.
- **Nachher** (diese Plans Task-1-Curl-Evidenz, konsistent mit `163-02-SUMMARY.md`'s Live-EXPLAIN): "Alle" liefert `episode_count: 5`, ids 53-57 (Folge 1-5); `fansub=animeownage` liefert `episode_count: 3`, ids 53/54/57 (Folge 1, 2, 5-Coop) — Folge 3 und 4 (Project-Messiah-exklusiv) sind vollständig ausgeblendet, nicht als leere Karte; `fansub=project-messiah` liefert `episode_count: 3`, ids 55/56/57 (Folge 3, 4, 5-Coop) — Folge 1 und 2 (AnimeOwnage-exklusiv) sind vollständig ausgeblendet; Folge 5 (id 57, Coop) bleibt unter beiden Einzelgruppenfiltern und unter "Alle" sichtbar, mit derselben Coop-Version. Keine Drift zwischen dem am 2026-09-17 dokumentierten Forschungsstand und dem Live-Bestand zum Ausführungszeitpunkt wurde festgestellt — die Zahlen stimmen exakt mit `163-CONTEXT.md` D-18 überein.

### 10. Tests (Pflichtfälle A-J → Testfunktion-Mapping)

| Pflichtfall | Behauptung | Testfunktion | Plan | Status |
|---|---|---|---|---|
| A | Episode ohne Release bei „Alle" unsichtbar | `TestEpisodeVersionPublicEmptyAndVisibility` (korrigierte Assertion) | 163-01 (RED) → 163-02 (GREEN) | ✅ |
| B | Episode mit einer Gruppe: sichtbar/unsichtbar je Filter | `TestEpisodeVersionPublicGroupFilterBasics` | 163-01 (RED) → 163-02 (GREEN) | ✅ |
| C | Zwei getrennte Versionen (AO/PM) — korrekte Menge je Filter | `TestEpisodeVersionPublicGroupFilterBasics` (gleiche Fixture, AO/PM-Teilfälle) | 163-01 → 163-02 | ✅ |
| D | Coop-Version — bei beiden Gruppen sichtbar | `TestEpisodeVersionPublicGroupFilterBasics` (Coop-Teilfall) | 163-01 → 163-02 | ✅ |
| E | Naruto-Regression: Folge nur PM, AO aktiv → vollständig unsichtbar | `TestEpisodeVersionPublicGroupFilterNarutoRegression` | 163-01 (RED) → 163-02 (GREEN) | ✅ |
| F | Pagination-Scope: Treffer erst hinter Seite 1 | `TestEpisodeVersionPublicGroupFilterPaginationScope` | 163-01 (RED) → 163-02 (GREEN) | ✅ |
| G | Filterwechsel Alle→AO→PM→Alle, keine Mischdaten | Backend: `TestEpisodeVersionPublicGroupFilterCursorScope`; Frontend: `FansubVersionBrowser.groupSwitch.test.tsx` (Pflichtfall-G-Testfall) | 163-01/163-02 (Backend) + 163-03 (RED) → 163-04 (GREEN, Frontend) | ✅ |
| H | Ungültiger Gruppenfilter — 162-Fallback respektiert | Backend: `TestEpisodeVersionPublicGroupFilterUnknownSlug`; Frontend: bestehende Phase-162-Fallback-Tests in `page.test.tsx`/`FansubVersionBrowser.test.tsx`, erweitert | 163-01 (RED) → 163-02 (GREEN, Backend); 163-03/163-04 (Frontend) | ✅ |
| I | Nicht-öffentliche Release-Version — Episode bleibt unsichtbar | `TestEpisodeVersionPublicGroupFilterNonPublicVersion` | 163-01 (RED) → 163-02 (GREEN) | ✅ |
| J | Performance — keine Query-pro-Episode-Struktur | `assertPublicBudget`/`episodePublicTracer` (bestehende Infrastruktur, Assertion um die +1 Slug-Resolution-Query erweitert) | 163-01/163-02 | ✅ |

Vollständige Nachweise: `163-01-SUMMARY.md`'s "Task 2 + 3 Verification" (RED-Bestätigung aller 9 Backend-Testfunktionen), `163-02-SUMMARY.md`'s "Accomplishments" (GREEN-Bestätigung derselben 9 Tests, 0 neue Fehlschläge gegenüber der 69-Fehlschläge-Baseline), `163-03-SUMMARY.md`'s "Accomplishments" (19 neue/korrigierte Frontend-RED-Fälle über 4 Dateien inkl. `FansubVersionBrowser.groupSwitch.test.tsx` für D-07..D-10/G), `163-04-SUMMARY.md`'s "Accomplishments" (100/101 zielgerichtete Assertions grün, 2861/2864 volle Frontend-Suite grün, 1 dokumentierter Test-Authoring-Defekt siehe Item 13).

### 11. Build/Typecheck/Lint

Backend (`163-02-SUMMARY.md`): `go build ./... && go vet ./...` clean; volle `go test ./...`-Regression zeigt exakt die 69 vorbestehenden, umgebungsbedingten Fehlschläge der `163-01`-Baseline, null neue. Frontend (`163-04-SUMMARY.md`, Task 3): `npm run typecheck` — 0 Fehler; `npx eslint .` — 0 Fehler/Warnungen in den 3 gelinteten geänderten Dateien, globaler Zähler (3 Fehler/319 Warnungen) niedriger als STATE.mds zuletzt dokumentierte Baseline (13/331), nicht höher; `npm run build` — kompiliert erfolgreich (`✓ Compiled successfully in 7.6s`), der einzige Build-Fehler ist der vorbestehende, bereits dokumentierte Turbopack-`/_global-error`-Prerender-`useContext`-Crash (STATE.md Phase-135-Eintrag), unabhängig von jeder in dieser Phase geänderten Datei. Dateigrößen (`page.tsx` 306, `FansubVersionBrowser.tsx` 421, `fansub-summary.ts` 89 Zeilen) bleiben unter CLAUDE.mds 450-Zeilen-Grenze.

### 12. Browser-Verifikation

Dieser Plans Task 2 (Live-Browser-UAT, `checkpoint:human-verify`): Der menschliche Betreiber hat **"approved"** für alle 6 Pflichtprüfungen gegen die reale Naruto-Anime-Detailseite über den SSH-Tunnel `http://127.0.0.1:3300` eingegeben, wörtlich bestätigt in diesem Ausführungslaufs Übergabekontext ("approved (all 6 mandatory live-browser checks passed against the real Naruto anime detail page via the SSH tunnel at 127.0.0.1:3300)"). Die 6 bestätigten Prüfungen: (1) „Alle" zeigt nur echte Episoden mit Release, nicht alle 220 Naruto-Folgen; (2) Klick auf „AnimeOwnage" dimmt die Liste kurz (kein Skeleton, kein Layoutsprung), zeigt danach nur AnimeOwnage-Episoden, jede Project-Messiah-exklusive Episode ist vollständig verschwunden (nicht leer, kein „Keine Version"-Text), die „Episoden (N)"-Überschrift aktualisiert sich; (3) Klick auf „Project Messiah" zeigt die Umkehrung (AnimeOwnage-exklusive Episoden verschwinden, Project-Messiah-exklusive erscheinen); (4) die Coop-Episode (Folge 5) ist unter beiden Einzelgruppenfiltern UND unter „Alle" sichtbar, mit einer Versionszeile, die beide Gruppen zeigt; (5) Klick auf „Alle" bringt beide Gruppen wieder gemeinsam zurück; (6) der Browser-Zurück-Button lädt die Liste neu (kurzes Dimmen, dann Update) statt eine veraltete zwischengespeicherte Ansicht zu zeigen.

### 13. Offene Befunde

- **Nativer `<button>` im Episodenkopf von `FansubVersionBrowser.tsx`:** dokumentiert als bewusst nicht angefasster Altbestand in `163-CONTEXT.md`'s Deferred-Ideas-Abschnitt ("nur anfassen, wenn die Zeilen ohnehin geändert werden; sonst eigener Aufräumpunkt") — verstößt gegen CLAUDE.mds UI-Primitives-Pflicht, aber außerhalb dieses Phasenscopes.
- **Coop-Kennzeichnung in der Versionszeile:** weiterhin offen, aus Phase 162 übernommen und in `163-CONTEXT.md`'s Deferred-Ideas-Abschnitt als eigener, noch nicht beauftragter Punkt dokumentiert (keine visuelle Coop-Markierung wurde in dieser Phase eingeführt — die fachliche Coop-Sichtbarkeit ist korrekt, nur die UI-Kennzeichnung bleibt offen).
- **Eigenes Sichtbarkeitsfeld für Release-Versionen (veröffentlicht/intern):** existiert nicht und würde laut `163-CONTEXT.md`'s Deferred-Ideas-Abschnitt eine eigene Phase erfordern; diese Phase nutzt ausschließlich die bestehende `ExistsVisible`/`release_version_groups`-Fail-Closed-Logik.
- **Dokumentierter Test-Authoring-Defekt (nicht produktiver Verhaltens-Gap):** `163-04-SUMMARY.md`'s "Issues Encountered" dokumentiert eine einzige verbleibende RED-Assertion in `FansubVersionBrowser.test.tsx` (125-Varianten-Fortsetzungstest, "merges 125 variants over explicit pages"). Root Cause: der gesperrten Testdatei fehlt an einer Stelle (Zeile 265) ein zweites Argument (`continued('cursor-23')`) zu einem `mockResolvedValueOnce(publicPage(...))`-Aufruf, wodurch eine spätere Assertion einen Cursor-Wert erwartet, den keine gemockte Antwort in diesem Test tatsächlich liefert. Die per Plan gesperrte Testdatei wurde bewusst NICHT bearbeitet (explizite Anweisung aus 163-04-PLAN.md); der empfohlene Fix (ein zusätzliches Argument in Zeile 265) ist als Folgearbeit außerhalb dieser Phase dokumentiert. Dies ist keine neue Regression — der Test war bereits in der 163-03-Baseline RED (damals per Timeout, jetzt aus einem besser verstandenen, dokumentierten Grund).
- **`backend/internal/repository/fansub_repository.go` überschreitet CLAUDE.mds 450-Zeilen-Grenze (2471→2496 Zeilen):** vorbestehend vor dieser Phase, in `deferred-items.md` dokumentiert; Plan 163-02 fügte nur eine kleine Methode (`ResolveFansubGroupIDForAnime`, ~19 Zeilen) nach dem bereits etablierten Muster dieser Datei hinzu. Ein Aufräumen dieser Datei ist als eigene künftige Aufgabe empfohlen, nicht Teil dieser Phase.
- **Keine Drift zwischen Forschungsstand (2026-09-17) und Live-Bestand zum Ausführungszeitpunkt:** Task 1's Curl-Evidenz stimmt exakt mit dem in `163-CONTEXT.md` D-18 dokumentierten Datenbestand überein (episode_count 5/3/3, ids 53-57) — kein Drift-Hinweis nötig.

## Deviations from Plan

None — Task 3 (this SUMMARY.md) executed exactly as the plan specified; Tasks 1 and 2 were already complete and human-approved before this closing turn began, per the resume instructions.

## Issues Encountered

None in this plan's own scope (Task 3, documentation only). One pre-existing, documented test-authoring defect from Plan 163-04 is carried forward as an open finding (Abschlussbericht item 13) — not a defect introduced or discovered by this plan.

## User Setup Required

None — no external service configuration required.

## Known Stubs

None — this plan is documentation-only; no UI, data flow, or production code was stubbed.

## Threat Flags

None — this plan added no new production surface (Task 1's curl calls were read-only GETs; Task 2 was a human browser check; Task 3 is a documentation deliverable). Matches this plan's own `threat_model` (T-163-10, T-163-SC, both `accept`).

## Next Phase Readiness

Phase 163 is complete: all 24 requirements (REQ-163-01 through REQ-163-24) are implemented, tested, and — with this plan's Task 1/Task 2 evidence — verified live against real Naruto data and human-approved in the browser. No further plans are scheduled for this phase. The one open test-authoring defect (Abschlussbericht item 13) and the pre-existing `fansub_repository.go` line-count overage are documented, non-blocking follow-ups for a future cleanup phase/quick task, not a Phase 163 gap.

---
*Phase: 163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern*
*Completed: 2026-09-17*

## Self-Check: PASSED

- FOUND: `.planning/phases/163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern/163-05-SUMMARY.md` (this file)
- FOUND: prior commits `a08a5f43`, `4cbe3573`, `652c88f8` (163-01); `0cba3920`, `c3109294`, `b58a61f9` (163-02); `70d1f813`, `dc9e604e`, `d1fad14b`, `04c2bcf7`, `a594eea6` (163-03); `4cca35c2`, `b1e8efa2`, `f9818e25`, `7b30ee25` (163-04) — all present in `git log --oneline -15`
- FOUND: `team4sv30-backend`/`team4sv30-frontend` containers `Up` and healthy via `docker compose ps`
- CONFIRMED: `git status --short` clean at plan start
