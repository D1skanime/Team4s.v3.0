---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 34
subsystem: ui
tags: [react, tdd, select, d-29, d-33, contributions]

# Dependency graph
requires:
  - phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
    provides: "useProposalFormReleaseOptions-Hook + FansubGroupHint-Typ-Spiegel (Plan 191-33), ensureHintReleaseContext/related_release_version_id-Backend-Contract (Plan 191-32)"
provides:
  - "ProposalReleaseSelect.tsx: einzige, geteilte Markup-Stelle fuer die optionale Release-Auswahl (Ganzes Projekt / einzelnes Release), own+foreign identisch"
  - "ProposalForm.useReleaseSelection.ts: Wrapper-Hook, der die Release-Auswahl bei Projektwechsel zwingend zuruecksetzt"
  - "ProposalForm.useGroupAnime.ts: aus ProposalForm.tsx extrahierte Anime/Projekt-Ladelogik (Zeilenlimit-Vorbereitung)"
  - "Beide Submit-Pfade (own: release_version_id, foreign: related_release_version_id) tragen die Release-Auswahl; 409-Fehlertext unterscheidet release- vs. projektbezogen (D-33)"
affects: [191-35, 191-36]

tech-stack:
  added: []
  patterns:
    - "Zeilenlimit-Kontingenz: vor dem Feature-Commit ein eigener, verhaltensneutraler Umbau-Commit, der betroffene Logik in einen Hook extrahiert (CLAUDE.md-Ablaufvorgabe) -- hier ProposalForm.useGroupAnime.ts vor der Release-Verdrahtung"
    - "Ein animeId/groupId-abhaengiger Lade-Hook (useProposalFormReleaseOptions) setzt seine eigene Auswahl bei Parameterwechsel NICHT automatisch zurueck -- ein duenner Wrapper-Hook (useProposalFormReleaseSelection) erzwingt das explizit per zusaetzlichem useEffect, statt die Reset-Pflicht in die Konsumentenkomponente zu verlagern"

key-files:
  created:
    - frontend/src/components/contributions/ProposalReleaseSelect.tsx
    - frontend/src/components/contributions/ProposalReleaseSelect.test.tsx
    - frontend/src/components/contributions/ProposalForm.useReleaseSelection.ts
    - frontend/src/components/contributions/ProposalForm.useGroupAnime.ts
  modified:
    - frontend/src/components/contributions/ProposalForm.useSubmit.ts
    - frontend/src/components/contributions/ProposalForm.useSubmit.test.ts
    - frontend/src/components/contributions/ProposalForm.steps.tsx
    - frontend/src/components/contributions/ProposalForm.steps.test.tsx
    - frontend/src/components/contributions/ProposalForm.tsx
    - frontend/src/components/contributions/ProposalForm.test.tsx
    - docs/FRONTEND_ARCHITEKTUR.md

key-decisions:
  - "ProposalForm.tsx stand bereits bei 447/450 Zeilen, bevor die Release-Auswahl hinzukam -- statt die Props nur zu einem Objekt zu buendeln (Plan-Kontingenz allein reichte nicht, 471 Zeilen blieben ueber dem Limit), wurde die bestehende Anime/Projekt-Ladelogik in einen eigenen Hook (ProposalForm.useGroupAnime.ts) extrahiert, als separater, verhaltensneutraler Umbau-Commit VOR dem Feature-Commit (CLAUDE.md-Ablaufvorgabe)."
  - "useProposalFormReleaseOptions (Plan 191-33) setzt selectedReleaseVersionId bei einem animeId-Wechsel nicht automatisch zurueck -- ein neuer duenner Wrapper-Hook (useProposalFormReleaseSelection) erzwingt genau das per zusaetzlichem useEffect, damit ProposalForm.tsx selbst keinen weiteren Effekt braucht."
  - "Beim vorausgewaehlten Kontext-Einstieg (prefill, D-12) werden animeId/groupId bewusst auf null gehalten, damit keine ungenutzte Netzwerkanfrage ausgeloest wird -- Schritt 1 (und damit die Release-Auswahl) wird in diesem Pfad nie gemountet; Plan 191-35 verdrahtet dort eine eigene Instanz."

requirements-completed: [D-29, D-33]

# Metrics
duration: ~70min
completed: 2026-10-24
---

# Phase 191 Plan 34: Release-Auswahl im Wizard verdrahtet (D-29/D-33) Summary

**Optionale Release-Select in Schritt 1 des Hinweis-Wizards (own+foreign identisch via `ProposalReleaseSelect`), beide Submit-Pfade tragen die Auswahl, 409-Konfliktmeldung unterscheidet jetzt release- vs. projektbezogen**

## Performance

- **Duration:** ~70 min
- **Tasks:** 2 (TDD: RED -> GREEN je Task, plus ein zusaetzlicher Zeilenlimit-Umbau-Commit zwischen Task 2s RED und GREEN)
- **Files modified:** 11 (4 neu, 7 geändert)

## Accomplishments

- `ProposalReleaseSelect.tsx`: einzige Markup-Stelle fuer die optionale Release-Einschraenkung — "Ganzes Projekt" (Wert `''`) ist immer die erste Option und der Default, waehrend eines Ladevorgangs wird ausschliesslich ein "Wird geladen…"-Platzhalter gerendert (nie eine evtl. veraltete Liste des vorherigen Projekts), `onChange` koerziert einen leeren Wert zu `null`, nie zu `0`/`NaN`.
- `Step1GroupProject` rendert `ProposalReleaseSelect` zwischen dem Anime/Projekt-Feld und der Kontext-Breadcrumb — identisch fuer `groupScope === 'own'` UND `'foreign'`, keine zweite Kopie der Options-/Lade-Markup.
- `ProposalForm.useSubmit.ts`: `SubmitTarget.releaseVersionId` fliesst in `release_version_id` (Eigengruppen-Pfad, bereits seit Phase 67 serverseitig via `GroupParticipatesInReleaseVersion` validiert) bzw. `related_release_version_id` (Fremdgruppen-Pfad, serverseitig validiert durch Plan 191-32s `ensureHintReleaseContext`) — "Ganzes Projekt" sendet in beiden Faellen weiterhin `null`.
- `errorMessageForHintStatus(status, isReleaseScoped)` verzweigt den 409-Fall auf die zwei woertlichen Backend-Strings aus Plan 191-32 ("...diesem Release..." vs. "...diesem Projekt...") — der Live-Aufrufer leitet `isReleaseScoped` direkt aus `target.releaseVersionId != null` ab, kein Hardcode.
- Ein Projektwechsel setzt die Release-Auswahl zwingend auf "Ganzes Projekt" zurueck (`ProposalForm.useReleaseSelection.ts`), damit eine zuvor gewaehlte Release-ID eines anderen Projekts nie stillschweigend an ein neues Projekt weitergereicht wird.
- `ProposalForm.tsx`/`.steps.tsx` bleiben bei 415/413 Zeilen (Limit 450), obwohl `ProposalForm.tsx` schon vor diesem Plan bei 447 Zeilen stand — durch eine vorgeschaltete, rein verhaltensneutrale Extraktion der Anime/Projekt-Ladelogik in `ProposalForm.useGroupAnime.ts` (eigener Umbau-Commit, 19 bestehende Tests unveraendert gruen vor dem Feature-Commit).
- `npx tsc --noEmit` ist clean; `npm run test -- "ProposalForm" "ProposalReleaseSelect"` zeigt 76/76 gruen; die volle Suite im `team4sv30-frontend`-Container zeigt 419/419 Test-Dateien ohne Regression (zwei host-seitige ENOENT/Pfad-Fehlschlaege beim direkten `npm run test` auf dem Host erwiesen sich als reine Host-vs-Container-Pfadartefakte, im Container reproduziert als gruen bestätigt).

## Task Commits

1. **Task 1a: RED — failing tests for release-scoped submit payloads + 409-Mapping** - `0f36af099` (test)
2. **Task 1b: GREEN — SubmitTarget.releaseVersionId, beide Payload-Builder, dynamischer 409-Text** - `2a4dc2ce7` (feat)
3. **Task 2a: RED — failing tests for ProposalReleaseSelect + Wizard-Verdrahtung** - `7170cc722` (test)
4. **Task 2b: Zwischencommit — Anime/Projekt-Ladelogik aus ProposalForm.tsx extrahiert (Zeilenlimit-Vorbereitung, verhaltensneutral)** - `d325e0e89` (refactor)
5. **Task 2c: GREEN — Release-Auswahl in Schritt 1 verdrahtet (own/foreign identisch)** - `15b90539b` (feat)
6. **Doku-Nachzug (D-08)** - `b19e7ea37` (docs)

## Files Created/Modified

- `frontend/src/components/contributions/ProposalReleaseSelect.tsx` — neue, einzige Release-Select-Komponente (FormField + globales Select)
- `frontend/src/components/contributions/ProposalReleaseSelect.test.tsx` — 5 Logik-/Render-Tests (Default, Lade-Placeholder, Werte-Spiegelung, onChange-Koerzierung)
- `frontend/src/components/contributions/ProposalForm.useReleaseSelection.ts` — Wrapper-Hook, erzwingt Reset bei Projektwechsel
- `frontend/src/components/contributions/ProposalForm.useGroupAnime.ts` — aus ProposalForm.tsx extrahierte, unveraenderte Anime/Projekt-Ladelogik
- `frontend/src/components/contributions/ProposalForm.useSubmit.ts` — `releaseVersionId`/`relatedReleaseVersionId`, `errorMessageForHintStatus(status, isReleaseScoped)`
- `frontend/src/components/contributions/ProposalForm.useSubmit.test.ts` — 12 neue/erweiterte Tests fuer Release-Payload + 409-Verzweigung
- `frontend/src/components/contributions/ProposalForm.steps.tsx` — `Step1GroupProject` rendert `ProposalReleaseSelect`
- `frontend/src/components/contributions/ProposalForm.steps.test.tsx` — 3 neue Tests fuer die Release-Auswahl in Step1
- `frontend/src/components/contributions/ProposalForm.tsx` — `useProposalFormReleaseSelection`-Verdrahtung, `releaseSelection.reset()` in `resetAndClose`, `releaseVersionId` im Submit
- `frontend/src/components/contributions/ProposalForm.test.tsx` — Release-Mock ergaenzt, bestehende Payload-Erwartungen um `release_version_id: null` erweitert, 4 neue End-to-End-Tests
- `docs/FRONTEND_ARCHITEKTUR.md` — neue Bausteine im Abschnitt "Hilfsfunktionen und Hooks" dokumentiert (D-08)

## Decisions Made

Siehe `key-decisions` im Frontmatter — insbesondere die vorgeschaltete, verhaltensneutrale Extraktion von `ProposalForm.useGroupAnime.ts`, um das 450-Zeilen-Limit einzuhalten, und der Wrapper-Hook `useProposalFormReleaseSelection` fuer den Projektwechsel-Reset.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `activeGroupId` vor seiner Deklaration verwendet**
- **Found during:** Task 2 (erster Verdrahtungsversuch)
- **Issue:** Der erste Entwurf rief `useProposalFormReleaseOptions({ groupId: activeGroupId ?? null })` auf, bevor `const activeGroupId = ...` im Code stand (TDZ-Fehler bei `const`).
- **Fix:** Hook-Aufruf hinter die `activeGroupId`-Berechnung verschoben.
- **Files modified:** `frontend/src/components/contributions/ProposalForm.tsx` (vor dem finalen Commit korrigiert, kein eigener Commit noetig)
- **Verification:** `npx tsc --noEmit` clean.

**2. [Rule 1 - Bug] Unnoetige Netzwerkanfrage beim vorausgewaehlten Einstieg (prefill)**
- **Found during:** Task 2, Testlauf zeigte act()-Warnungen in den `prefill`-Tests
- **Issue:** `useProposalFormReleaseSelection` wurde auch im `prefill`-Pfad mit echten `animeId`/`groupId` aufgerufen, obwohl Schritt 1 (und damit die Release-Auswahl) dort nie gemountet wird — eine unnoetige `getGroupReleaseListCursor`-Anfrage loeste nach Testende eine act()-Warnung aus.
- **Fix:** `animeId`/`groupId` werden bei `prefill` bewusst auf `null` gehalten (kein Fetch).
- **Files modified:** `frontend/src/components/contributions/ProposalForm.tsx`
- **Verification:** act()-Warnungen in der vollen `ProposalForm.test.tsx`-Suite auf den baseline-Stand (4, pre-existing/unrelated) reduziert, verifiziert gegen einen Baseline-Worktree.

**3. [Rule 3 - Blocking] Zeilenlimit nach erster Verdrahtung überschritten (471/450)**
- **Found during:** Task 2, nach vollstaendiger Inline-Verdrahtung
- **Issue:** `ProposalForm.tsx` erreichte 471 Zeilen; die im Plan vorgesehene Kontingenz (Props als ein destrukturiertes Objekt buendeln) allein reichte nicht aus, um unter 450 zu kommen.
- **Fix:** Die bestehende Anime/Projekt-Ladelogik (Lade-Effekt + zugehoeriger State) wurde in einen neuen, eigenen Hook (`ProposalForm.useGroupAnime.ts`) extrahiert — als separater, verhaltensneutraler Umbau-Commit VOR dem Feature-Commit (CLAUDE.md-Ablaufvorgabe: "Aufteilen zuerst als eigener, reiner Umbau-Commit"). `ProposalForm.tsx` sank dadurch von 447 auf 398 Zeilen vor der Release-Verdrahtung, landete danach bei 415.
- **Files modified:** `frontend/src/components/contributions/ProposalForm.tsx`, `frontend/src/components/contributions/ProposalForm.useGroupAnime.ts` (neu)
- **Verification:** 19 bestehende `ProposalForm`-Tests blieben nach der reinen Extraktion unveraendert gruen (neue, release-bezogene Tests blieben erwartungsgemaess rot bis zum Feature-Commit); `wc -l` beider Dateien nach dem Feature-Commit: 415/413.
- **Committed in:** `d325e0e89` (Umbau), `15b90539b` (Feature)

**4. [Rule 3 - Blocking] act()-Warnungen durch neue Release-Ladung in bestehenden Test-Helfern**
- **Found during:** Task 2, voller Testlauf nach der Verdrahtung
- **Issue:** Der gemeinsame Test-Helfer `chooseGroupAndAnime()` wartete bisher nur auf die Anime-Liste, nicht auf die neue, bei Projektwahl ausgeloeste Release-Ladung — die danach aufgeloeste Mock-Promise aktualisierte den Komponenten-State ausserhalb von `act()` und erzeugte in vielen bestehenden Tests act()-Warnungen (26 statt der 4 baseline-Warnungen).
- **Fix:** `chooseGroupAndAnime()` wartet jetzt zusaetzlich darauf, dass die Release-Auswahl nicht mehr "loading" ist.
- **Files modified:** `frontend/src/components/contributions/ProposalForm.test.tsx`
- **Verification:** act()-Warnungen nach dem Fix wieder bei 4 (identisch zum Baseline-Wert vor diesem Plan, per Baseline-Worktree-Vergleich bestaetigt).
- **Committed in:** `15b90539b`

---

**Total deviations:** 4 auto-fixed (1 Bug/TDZ, 1 Bug/unnoetiger Netzwerkaufruf, 2 Blocker durch das harte Zeilenlimit bzw. die dadurch ausgeloeste Testverschmutzung). Kein Scope-Creep — alle vier waren direkt durch die in diesem Plan vorgenommenen Aenderungen verursacht.
**Impact on plan:** Der Zeilenlimit-Umbau (Punkt 3) fuehrte zu einem zusaetzlichen, vom Plan nicht explizit vorgesehenen Zwischencommit (`d325e0e89`) — inhaltlich aber exakt die vom Plan selbst vorgesehene Eskalationsstufe ("vor jeder weiteren Extraktion") und von CLAUDE.md vorgeschrieben (Umbau-Commit vor Feature-Commit).

## Issues Encountered

Keiner ueber die oben dokumentierten Deviations hinaus. Die RED-Phasen beider Tasks schlugen erwartungsgemaess fehl (fehlendes Modul bzw. fehlende Properties), die GREEN-Implementierungen liefen nach den beschriebenen Korrekturen durch.

## Known Stubs

None — die Release-Auswahl ist vollstaendig funktionsfaehig fuer beide Gruppen-Szenarien und beide Submit-Pfade; kein Platzhalter-Datenfluss.

## User Setup Required

None — keine externe Service-Konfiguration noetig. `docker restart team4sv30-frontend` wurde ausgefuehrt und verifiziert (`GET /` → 200, `GET /me/contributions` → 200 nach Neustart, keine Fehler in den Container-Logs).

## Next Phase Readiness

- Plan 191-35 (D-30, Kontext-Einstiegspunkt auf der Release-Seite) kann `ProposalReleaseSelect` direkt mounten und muss die Options-/Lade-Markup nicht duplizieren; es braucht dort eine eigene `useProposalFormReleaseOptions`-Instanz (analog zu diesem Plan), da `ProposalForm.tsx`s Instanz beim `prefill`-Pfad bewusst inaktiv bleibt (kein Fetch, kein Mount von Step 1).
- Plan 191-36 (Anzeige-Spalten) kann weiterhin unveraendert auf `FansubGroupHint.related_release_label` zugreifen — dieser Plan hat die Lese-Seite nicht veraendert.
- Kein Blocker fuer nachfolgende Plaene.

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Plan: 34*
*Completed: 2026-10-24*

## Self-Check: PASSED

Alle 11 Dateien (4 neu, 7 geändert) und das Doku-Update sind auf der Platte bestätigt; alle
6 Commit-Hashes (`0f36af099`, `2a4dc2ce7`, `7170cc722`, `d325e0e89`, `15b90539b`, `b19e7ea37`)
sind in der Git-Historie bestätigt.
