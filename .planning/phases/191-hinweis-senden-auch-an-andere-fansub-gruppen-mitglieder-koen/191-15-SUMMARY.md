---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 15
subsystem: ui
tags: [react, nextjs, vitest, wizard, contributions, d-10, d-13, d-14, bugfix]

# Dependency graph
requires:
  - phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
    provides: "Fester 3-Schritte-Wizard ohne Hinweisart-Dimension (Plan 191-14)"
provides:
  - "ProposalForm.tsx laedt die Fremdgruppen-Projektliste ueber die oeffentliche, mitgliedschaftsfreie Quelle (getPublicFansubProfileBySlug) statt den admin-gescopten, mitgliedschaftspflichtigen Endpunkt -- behebt den live reproduzierten 403 bei 'Andere Gruppe'"
  - "ProposalAnimeOption (ProposalForm.useSubmit.ts) als schmaler, quellen-neutraler {id,title}-Typ, der AdminFansubAnimeEntry in der gesamten ProposalForm-Dateifamilie ersetzt"
  - "Step1GroupProject zeigt den gewaehlten Fremdgruppennamen nur noch zweifach (Suchergebnis-Zeile + selectionBreadcrumb-Pille), nicht mehr dreifach"
  - ".groupSearchItem im hellen Formular-Muster (Design-Tokens statt Hex-Werte) statt dunklem Text auf dunklem Button-Hintergrund"
affects: ["191-10 Task 2 (Live-Checkpoint, D-16): kann jetzt mit einer echten fremden Gruppe mit oeffentlichen Projekten durchgefuehrt werden, ohne auf den D-10-403-Bug zu laufen"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Formular-interne Datenoptionen (Anime/Projekt-Auswahl) ueber einen schmalen, quellen-neutralen lokalen Typ statt der admin-spezifischen Backend-Antwort-Form abbilden, wenn dieselbe UI-Auswahl aus zwei strukturell unterschiedlichen Endpunkten gefuellt werden kann (hier: admin-gescopt vs. oeffentlich)."

key-files:
  modified:
    - frontend/src/components/contributions/ProposalForm.tsx
    - frontend/src/components/contributions/ProposalForm.steps.tsx
    - frontend/src/components/contributions/ProposalForm.useSubmit.ts
    - frontend/src/components/contributions/contributions.module.css
    - frontend/src/components/contributions/ProposalForm.test.tsx
    - frontend/src/components/contributions/ProposalForm.steps.test.tsx

key-decisions:
  - "ProposalAnimeOption wurde in ProposalForm.useSubmit.ts definiert statt wortwoertlich in ProposalForm.tsx (wie die Plan-Interfaces-Sektion vorschlug) -- useSubmit.ts haengt bereits von keiner der beiden anderen Dateien ab und wird von beiden importiert, das vermeidet einen typseitigen Zirkelimport zwischen ProposalForm.tsx (importiert Step1GroupProject aus .steps.tsx) und .steps.tsx (haette sonst einen Typ aus ProposalForm.tsx re-importieren muessen)."
  - "Der foreignGroup-Prop wurde komplett aus Step1Props/Step1GroupProject entfernt statt nur ungenutzt stehen zu lassen -- nach dem D-13-Fix (Entfernen der 'Ausgewaehlt: {name}'-Zeile) gab es keine verbleibende Verwendung mehr innerhalb der Komponente, ein unbenutzter Pflicht-Prop haette den Typecheck und die Lesbarkeit unnoetig belastet."
  - "contributions.module.css (902 Zeilen, bereits 889 Zeilen vor diesem Plan) wird NICHT gemaess der CLAUDE.md-450-Zeilen-Regel gesplittet, obwohl dieser Plan sie inhaltlich aendert (D-14): die Datei wird von 11 Komponenten derselben Feature-Flaeche importiert, ein CSS-Modul-Split haette CSS-Modul-Scoping-Grenzen quer durch alle 11 Importstellen aufgebrochen -- eine Architekturaenderung weit ausserhalb des D-10/D-13/D-14-Scopes dieses Live-UAT-Nachbesserungsplans (Rule-4-Kategorie, nicht automatisch anwendbar). Projektweite Gegenprobe (wc -l über alle *.module.css) zeigt zudem mehrere, deutlich groessere CSS-Module (bis 2442 Zeilen) ohne jeden Split-Praezedenzfall in DECISIONS.md -- die 450-Zeilen-Regel wird in der gelebten Projektpraxis auf Logikdateien (.go/.ts/.tsx) angewendet, nicht auf CSS-Module. Diese Interpretation wird hier dokumentiert statt stillschweigend uebergangen."

requirements-completed: [D-10, D-13, D-14, D-15]

# Metrics
duration: ~55min
completed: 2026-10-23
---

# Phase 191 Plan 15: Gap-Closure Live-UAT-Nachbesserung (D-10 Projektliste-Bugfix + D-13/D-14 UI-Fixes) Summary

**Schritt 2 des Hinweis-Formulars laedt die Projektliste einer fremden Gruppe jetzt ueber die oeffentliche `/fansub-slugs/:slug/public-profile`-Quelle (kein Mitgliedschafts-Check) statt den admin-gescopten `/admin/fansubs/:id/anime`-Endpunkt, der live reproduzierbar immer mit 403 fehlschlug -- zusammen mit der Entfernung der doppelten "Ausgewaehlt: {name}"-Zeile und einer hellen, lesbaren Suchergebnis-Darstellung.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-10-23T20:20:00Z (approx.)
- **Completed:** 2026-10-23T20:40:00Z (approx.)
- **Tasks:** 2 completed (Task 1 als TDD mit separatem RED/GREEN-Commit, Task 2 direkt)
- **Files modified:** 6

## Accomplishments

- **D-10 (Kern-Bugfix):** `ProposalForm.tsx`s `loadGroupAnime`-Effekt verzweigt jetzt explizit auf `groupScope`. Bei `'own'` ruft er unveraendert `getAdminFansubAnime(activeGroupId)` -- dort besteht tatsaechlich eine Mitgliedschaft, kein Bug zu beheben. Bei `'foreign'` ruft er `getPublicFansubProfileBySlug(foreignGroup.slug)` -- dieselbe oeffentliche, mitgliedschaftsfreie Quelle, die `/fansubs/<slug>` fuer anonyme Besucher bedient -- und mappt `response.data.projects` auf die schmale `ProposalAnimeOption`-Form (`{id, title}`). Behebt exakt den live reproduzierten Fehler: der Absender hat bei einer fremden Gruppe nie die vom Admin-Endpunkt geforderte Mitgliedschaft, der Aufruf schlug deshalb bei JEDER Fremdgruppen-Auswahl mit 403 fehl.
- Ein neuer, quellen-neutraler Typ `ProposalAnimeOption` (`ProposalForm.useSubmit.ts`) ersetzt die bisher admin-spezifische `AdminFansubAnimeEntry` ueberall in der `ProposalForm`-Dateifamilie (`groupAnime`/`selectedAnime`/`animeOptions`-State, `Step1Props`, `SubmitTarget.anime`) -- die UI muss jetzt nicht mehr wissen, aus welcher der zwei Quellen eine Projekt-Option stammt.
- Eine fremde Gruppe ohne oeffentliche Projekte zeigt jetzt die bereits bestehende "Keine Anime/Projekte fuer diese Gruppe"-Leermeldung als legitimen Zustand (statt dem vorherigen Immer-403), getestet.
- **D-13:** die separate `{foreignGroup ? <span>Ausgewaehlt: {foreignGroup.name}</span> : null}`-Zeile in `Step1GroupProject` ist ersatzlos entfernt -- die `selectionBreadcrumb`-Pille direkt darunter zeigt Gruppenname + "Eigene Gruppe"/"Andere Gruppe"-Badge bereits. Der dadurch ungenutzte `foreignGroup`-Prop ist konsequent aus `Step1Props`/dem Aufruf in `ProposalForm.tsx` entfernt (nicht nur auskommentiert).
- **D-14:** `.groupSearchItem` (`contributions.module.css`) ueberschreibt den von `Button variant="secondary"` geerbten dunklen Verlauf-Hintergrund/-Text lokal auf das helle Formular-Muster (Vorbild `EpisodeVersionEditor.module.css:279-295`) -- ausschliesslich Design-Tokens (`--surface-card`, `--border-subtle`, `--text-strong`, `--text-muted`), kein neuer Hex-Wert. `!important` nach demselben, bereits etablierten Override-Muster wie `.disclosureButton` in derselben Datei (Kommentar verweist darauf statt die CSS-Var-Kaskade neu zu erklaeren, D-15).
- Frontend-Container (`team4sv30-frontend`) neu gestartet; `/`, `/me/contributions` und `/fansubs` antworten mit HTTP 200, keine Compile-Fehler im Container-Log.
- Gesamte Frontend-Testsuite (414 Dateien, 3773 Tests) gegen den neuen Stand gelaufen: 3765 PASS, 2 FAIL (beide vorbestehend und ausserhalb dieses Plan-Scopes, siehe "Issues Encountered"), 0 durch diesen Plan verursachte Regressionen.

## Task Commits

Each task was committed atomically (Task 1 als TDD mit separatem RED/GREEN-Commit):

1. **Task 1 RED: failing Test für D-10** - `ed8368f2a` (test)
2. **Task 1 GREEN: D-10 -- Fremdgruppen-Projektliste aus oeffentlicher Quelle** - `1986092d5` (feat)
3. **Task 2: D-13/D-14 -- Gruppenname nur einmal, Suchergebnis hell statt dunkel** - `53a4aa82b` (fix)

## Files Created/Modified

- `frontend/src/components/contributions/ProposalForm.useSubmit.ts` - neuer `ProposalAnimeOption`-Typ, `SubmitTarget.anime` und `buildCorrectionOwnPayload` darauf umgestellt, `AdminFansubAnimeEntry`-Import entfernt
- `frontend/src/components/contributions/ProposalForm.tsx` - `loadGroupAnime` verzweigt auf `groupScope` (own: `getAdminFansubAnime`, foreign: `getPublicFansubProfileBySlug` + Mapping auf `{id,title}`), `foreignGroup` nicht mehr an `Step1GroupProject` durchgereicht
- `frontend/src/components/contributions/ProposalForm.steps.tsx` - `Step1Props`/`groupAnime`/`selectedAnime` auf `ProposalAnimeOption` umgestellt, `foreignGroup`-Prop entfernt, "Ausgewaehlt: {name}"-Zeile entfernt (D-13)
- `frontend/src/components/contributions/contributions.module.css` - `.groupSearchItem`/`strong`/`span` auf das helle, token-basierte Muster umgestellt (D-14)
- `frontend/src/components/contributions/ProposalForm.test.tsx` - neue Testgruppe "Projektliste-Quelle nach groupScope (D-10)": beweist `getPublicFansubProfileBySlug`-Aufruf bei `'foreign'`, Leermeldung bei leerer Projektliste, unveraenderten `getAdminFansubAnime`-Aufruf bei `'own'`
- `frontend/src/components/contributions/ProposalForm.steps.test.tsx` - `foreignGroup`-Prop aus der Testfixture entfernt, neuer Test beweist das Fehlen der "Ausgewaehlt:"-Zeile nach Fremdgruppen-Auswahl (D-13)

## Decisions Made

Siehe `key-decisions` im Frontmatter -- insbesondere die bewusste Entscheidung, `contributions.module.css` trotz 902 Zeilen NICHT zu splitten (Begruendung dort).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/Aufräumen] `foreignGroup`-Prop aus `Step1Props` entfernt statt nur ungenutzt zu lassen**
- **Found during:** Task 2 (D-13-Fix)
- **Issue:** Nach dem Entfernen der "Ausgewaehlt: {name}"-Zeile war der `foreignGroup`-Prop in `Step1GroupProject` komplett ungenutzt -- ein Pflicht-Prop ohne jede Verwendung waere toter Code gewesen und haette bei strikterem Lint/Typecheck als Hinweis auf einen Fehler auffallen koennen.
- **Fix:** `foreignGroup` aus `Step1Props`, der Destrukturierung und dem Aufruf in `ProposalForm.tsx` entfernt.
- **Files modified:** `frontend/src/components/contributions/ProposalForm.steps.tsx`, `frontend/src/components/contributions/ProposalForm.tsx`, `frontend/src/components/contributions/ProposalForm.steps.test.tsx` (Testfixture nachgezogen)
- **Verification:** `npx tsc --noEmit` clean, `npm run test -- src/components/contributions` 11/11 Dateien gruen
- **Committed in:** `53a4aa82b` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1, Aufräumen eines durch den Haupt-Fix ungenutzt gewordenen Props)
**Impact on plan:** Reine Code-Hygiene, keine Verhaltensaenderung, kein Scope-Creep.

## Issues Encountered

Die projektweite Frontend-Testsuite (`npm --prefix frontend run test`, 414 Dateien/3773 Tests) zeigt 2 Fehlschlaege, beide **vorbestehend und ausserhalb des Scopes dieses Plans** (letzter Commit auf beiden Dateien: `7c2e3903d fix(188-05): ...`, lange vor diesem Plan, keine der beiden Dateien ist Teil der `files_modified` dieses Plans):
1. `src/components/ui/ResponsiveImage.config.test.ts` -- `hasRemoteMatch`-Assertion schlaegt unabhaengig von dieser Aenderung fehl (Host-Matching-Konfigurationstest, keine Beruehrung mit `contributions/`).
2. `src/app/admin/roles/RoleCapabilityDetail.membershipBaselineDrift.test.ts` -- `ENOENT: /backend/internal/permissions/permissions.go`, ein umgebungsabhaengiger Pfadzugriff (Anti-Drift-Test liest Go-Quelldateien per absolutem Pfad), nicht reproduzierbar durch diesen rein frontend-seitigen Plan.

Beide Fehlschlaege sind gemaess Scope-Boundary-Regel protokolliert, nicht behoben. Der scope-genaue Verify-Befehl des Plans (`npm --prefix frontend run test -- ProposalForm`) sowie die gesamte `src/components/contributions`-Familie (11 Dateien, 57 Tests) sind vollstaendig gruen.

## User Setup Required

None - keine externe Service-Konfiguration noetig.

## Next Phase Readiness

- Der D-16-Live-Checkpoint aus Plan 191-10 Task 2 kann jetzt durchgefuehrt werden, ohne auf den D-10-403-Bug zu laufen: eine fremde Gruppe mit echten oeffentlichen Projekten laesst sich im Formular vollstaendig bis zum Senden durchlaufen.
- `ProposalForm.tsx`/`.steps.tsx`/`.useSubmit.ts` sind jetzt frei von jedem admin-spezifischen `AdminFansubAnimeEntry`-Bezug -- zukuenftige Aenderungen an der Anime/Projekt-Auswahl koennen durchgaengig auf `ProposalAnimeOption` aufbauen.
- `npm --prefix frontend run test -- src/components/contributions` (gesamte Komponentenfamilie): 11 Testdateien, 57 Tests, vollstaendig gruen.
- Frontend-Container (`team4sv30-frontend`) laeuft nach Neustart fehlerfrei, `/`, `/me/contributions`, `/fansubs` alle HTTP 200.

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Completed: 2026-10-23*

## Self-Check: PASSED

Alle 6 genannten Dateien existieren auf der Festplatte, alle 3 Task-Commit-Hashes
(`ed8368f2a`, `1986092d5`, `53a4aa82b`) sind per `git log --oneline --all | grep` im
Git-Verlauf auffindbar.
