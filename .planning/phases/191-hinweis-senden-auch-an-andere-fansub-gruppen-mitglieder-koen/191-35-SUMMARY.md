---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 35
subsystem: ui
tags: [react, tdd, contributions, d-30, release-detail]

# Dependency graph
requires:
  - phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
    provides: "ProposalReleaseSelect/useProposalFormReleaseOptions/useProposalFormReleaseSelection (Plan 191-34), related_release_label-Anzeige (Plan 191-36)"
provides:
  - "ProposalFormPrefill.relatedReleaseVersionId/relatedReleaseLabel: optionale Release-Vorauswahl + lesbares Label fuer den Kontext-Einstieg"
  - "ReportHintEntryPoint reicht relatedReleaseVersionId/relatedReleaseLabel end-to-end optional durch (Rueckwaertskompatibilitaet fuer HeroSection.tsx gewahrt)"
  - "ReleaseDetailHero.tsx uebergibt den echten Projekttitel (animeTitle) statt des Episode-/Release-Titels an ReportHintEntryPoint (D-30-Bugfix)"
  - "releaseDetailPageData.tsx reicht das bereits geladene animeTitle an ReleaseDetailHero durch"
affects: []

tech-stack:
  added: []
  patterns:
    - "Ref-basierter Change-Guard in einem Reset-Effekt: useProposalFormReleaseSelection resettete selectedReleaseVersionId bisher bei JEDEM Effekt-Lauf inkl. Mount -- ein previousAnimeIdRef unterscheidet jetzt 'echte Aenderung' von 'erster Lauf', damit eine per initialReleaseVersionId vorausgewaehlte ID nicht sofort wieder verworfen wird."

key-files:
  created: []
  modified:
    - frontend/src/components/contributions/ProposalForm.tsx
    - frontend/src/components/contributions/ProposalForm.test.tsx
    - frontend/src/components/contributions/ProposalForm.useReleaseSelection.ts
    - frontend/src/components/contributions/ReportHintEntryPoint.tsx
    - frontend/src/components/contributions/ReportHintEntryPoint.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.composition.test.tsx

key-decisions:
  - "Abweichung von Plan 191-34s eigener Next-Phase-Notiz: statt einer ZWEITEN, separaten useProposalFormReleaseOptions-Instanz fuer den Kontext-Einstieg wird der EINE bestehende releaseSelection-Call in ProposalForm.tsx fuer den prefill-Pfad jetzt mit den echten prefill.animeId/prefill.fansubGroupId aufgerufen (statt bewusst null) -- das Plan-191-35-Dokument selbst verlangt explizit 'die existierende useProposalFormReleaseOptions-Instanz', und nur so kann die Options-Liste ueberhaupt echte Eintraege (inkl. der vorausgewaehlten Release-ID) enthalten."
  - "Dieser Entwurfswechsel deckte einen echten Bug im Wrapper-Hook auf: der Reset-Effekt lief bisher bei JEDEM Render inkl. dem allerersten Mount und haette eine via initialReleaseVersionId vorausgewaehlte Release-ID im selben Tick wieder auf null zurueckgesetzt. Ein Ref (previousAnimeIdRef) unterscheidet jetzt 'erster Lauf' von 'echte Aenderung' -- der bestehende Reset-bei-Projektwechsel aus Plan 191-34 bleibt fuer den interaktiven Schritt-1-Flow unveraendert erhalten."

requirements-completed: [D-30]

# Metrics
duration: ~90min
completed: 2026-10-24
---

# Phase 191 Plan 35: Kontext-Einstieg Release-Praeselektion + echter Projekttitel (D-30) Summary

**ReleaseDetailHero reicht ab jetzt den echten Projekttitel statt des Episode-/Release-Titels an "Fehler melden" weiter, zusaetzlich preselektiert und beschriftet es die konkret betrachtete Release -- die Auswahl bleibt dort ueber dieselbe ProposalReleaseSelect-Komponente wie Schritt 1 aenderbar**

## Performance

- **Duration:** ~90 min
- **Tasks:** 2 (TDD: RED -> GREEN je Task)
- **Files modified:** 9

## Accomplishments

- **D-30-Bugfix:** `ReleaseDetailHero.tsx` gab `ReportHintEntryPoint` bisher faelschlich `props.episode_title ?? props.title` als `animeTitle` -- `releaseDetailPageData.tsx` hatte den echten Projekttitel (`animeResponse.data.title`) schon laengst geladen, aber nie durchgereicht. Jetzt wird `animeTitle` als eigene Prop weitergegeben; der alte Ausdruck lebt nur noch als Fallback fuer den Fall, dass die Projekt-Metadaten dieser Seite nicht geladen werden konnten.
- `ReleaseDetailHero.tsx` reicht zusaetzlich `release_version_id` (neu im `Pick`) und ein lesbares Label (`buildRelatedReleaseLabel`: "Episode {Nummer} — {Titel}" optional um " · {Version}" ergaenzt, nie mit dangling " · ") an `ReportHintEntryPoint` durch.
- `ReportHintEntryPoint` bekommt zwei neue, end-to-end optionale Props (`relatedReleaseVersionId`, `relatedReleaseLabel`) und reicht sie unveraendert in `ProposalForm`s `prefill`-Objekt weiter -- `HeroSection.tsx`s bestehender 4-Prop-Aufruf (Projektseite, kein Release im Kontext) kompiliert und verhaelt sich unveraendert.
- `ProposalForm.tsx`: der vorausgefuellte Kontext-Einstieg laedt jetzt echte Release-Optionen aus `prefill.animeId`/`prefill.fansubGroupId` (statt bisher bewusst inaktiv) und rendert `ProposalReleaseSelect` (Plan 191-34) direkt im Kontext-Header -- die Vorauswahl bleibt dort aenderbar, exakt wie in Schritt 1 des interaktiven Flows. Der Kontext-Satz nennt das Release nur, wenn `relatedReleaseLabel` gesetzt ist ("... — Release: {Label}."), sonst byte-identisch zum bisherigen Text.
- **Bugfix (Rule 1):** `useProposalFormReleaseSelection`s Reset-Effekt resettete `selectedReleaseVersionId` bisher bei JEDEM Lauf inkl. des allerersten Mounts -- das haette eine per `initialReleaseVersionId` vorausgewaehlte Release-ID sofort wieder auf `null` zurueckgesetzt, noch bevor sie sichtbar wird. Ein `previousAnimeIdRef` unterscheidet jetzt "erster Lauf" von "echte animeId-Aenderung"; der bestehende Reset-bei-Projektwechsel (Plan 191-34, Schritt 1) bleibt unveraendert.
- `npm run test` (voller Lauf im `team4sv30-frontend`-Container): 418/419 Testdateien gruen, 3856 Tests gruen, 1 Datei uebersprungen (3 `todo`-Tests, vorbestehend, nicht von diesem Plan beruehrt), keine Regression. `npx tsc --noEmit` clean.
- `docker restart team4sv30-frontend` ausgefuehrt und verifiziert: `GET /anime/2/group/26` (Projektseite) und `GET /anime/2/group/26/releases/52` (Release-Seite, reales Live-Beispiel 11eyes/Strawhat Subs) liefern beide `200`, keine Fehler im Container-Log nach dem Neustart.

## Task Commits

1. **Task 1 RED — failing tests fuer Release-Praeselektion im Kontext-Einstieg** - `4053b5bb4` (test)
2. **Task 1 GREEN — ProposalFormPrefill/ReportHintEntryPoint/ProposalReleaseSelect im Kontext-Header verdrahtet** - `9bbee3cd8` (feat)
3. **Task 2 RED — failing tests fuer echten animeTitle + Release-Kontext in ReleaseDetailHero** - `79b92fc31` (test)
4. **Task 2 GREEN — D-30-Bugfix: echter Projekttitel + release_version_id/-Label durchgereicht** - `63f7dc840` (fix)

## Files Created/Modified

- `frontend/src/components/contributions/ProposalForm.tsx` — `ProposalFormPrefill` um `relatedReleaseVersionId`/`relatedReleaseLabel` erweitert; `releaseSelection` laedt im prefill-Pfad jetzt echte Optionen aus `prefill.animeId`/`-fansubGroupId`; `ProposalReleaseSelect` im Kontext-Header gerendert; Kontext-Satz um optionalen Release-Zusatz erweitert
- `frontend/src/components/contributions/ProposalForm.test.tsx` — 3 neue Tests (Rueckwaertskompatibilitaet ohne Release-Label, Preselektion MIT Label, Aenderbarkeit + Submit der neuen Auswahl) plus 2 bestehende synchrone Tests auf `await screen.findByLabelText(...)` umgestellt (act()-Hygiene nach der neuen echten Fetch-Ladung)
- `frontend/src/components/contributions/ProposalForm.useReleaseSelection.ts` — Ref-Guard gegen vorzeitiges Reset beim Mount; `initialReleaseVersionId`-Parameter durchgereicht
- `frontend/src/components/contributions/ReportHintEntryPoint.tsx` — zwei neue optionale Props, unveraendert in `prefill` weitergereicht
- `frontend/src/components/contributions/ReportHintEntryPoint.test.tsx` — 2 neue Tests (Pass-Through mit/ohne die neuen Props)
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx` — `animeTitle`-Prop + `release_version_id` im `Pick`; `buildRelatedReleaseLabel`-Helfer; D-30-Bugfix am `ReportHintEntryPoint`-Aufruf
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.test.tsx` — aufzeichnender `ReportHintEntryPoint`-Mock + 4 neue D-30-Tests (echter Titel, Fallback bei `animeTitle=null`, Label mit/ohne Version)
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.tsx` — `animeTitle={animeTitle}` an `ReleaseDetailHero` ergaenzt (der eigentliche Bugfix-Einzeiler)
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.composition.test.tsx` — Mock + Assertion fuer die neue `animeTitle`-Weitergabe

## Decisions Made

Siehe `key-decisions` im Frontmatter — insbesondere die Abweichung von Plan 191-34s eigener Next-Phase-Vermutung (zweite Hook-Instanz) zugunsten der im PLAN.md dieses Plans explizit verlangten Wiederverwendung der EINEN bestehenden `releaseSelection`-Instanz, und der dadurch aufgedeckte Mount-Reset-Bug im Wrapper-Hook.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `useProposalFormReleaseSelection` resettete eine Vorauswahl sofort beim Mount**
- **Found during:** Task 1, beim Verdrahten von `initialReleaseVersionId` in den vorausgefuellten Pfad
- **Issue:** Der Reset-Effekt (`useEffect(() => { setSelectedReleaseVersionId(null) }, [animeId, ...])`) lief unveraendert bei JEDEM Render inkl. dem allerersten Mount -- mit einem jetzt echten, von Anfang an gesetzten `animeId` (statt bisher `null`) haette das die per `initialReleaseVersionId` vorausgewaehlte Release-ID im selben Tick wieder auf `null` zurueckgesetzt, noch bevor React sie je gerendert haette.
- **Fix:** Ein `previousAnimeIdRef` merkt sich den zuletzt gesehenen `animeId`; der Reset greift nur, wenn sich der Wert tatsaechlich geaendert hat, nicht beim ersten Lauf.
- **Files modified:** `frontend/src/components/contributions/ProposalForm.useReleaseSelection.ts`
- **Verification:** Test "zeigt den Kontext-Satz MIT '— Release:'-Zusatz und preselektiert die Release-Auswahl..." (`ProposalForm.test.tsx`) beweist `select.value === '152'` nach dem Laden; bestehender Reset-bei-Projektwechsel-Test (Plan 191-34) blieb unveraendert gruen.

**2. [Rule 1 - Bug] act()-Warnungen durch die jetzt echte Release-Ladung im prefill-Pfad**
- **Found during:** Task 1, voller Testlauf nach der Verdrahtung
- **Issue:** Drei bestehende, synchrone `it()`-Tests im `prefill`-Describe-Block renderten die Form und asserteten sofort, ohne auf die jetzt tatsaechlich ausgeloeste `getGroupReleaseListCursor`-Ladung zu warten -- die danach aufgeloeste Mock-Promise aktualisierte den Komponenten-State ausserhalb von `act()`.
- **Fix:** Alle drei Tests warten jetzt zusaetzlich auf `screen.findByLabelText('Release (optional)')`, bevor sie fertig sind.
- **Files modified:** `frontend/src/components/contributions/ProposalForm.test.tsx`
- **Verification:** Vollstaendiger `ProposalForm`/`ReportHintEntryPoint`-Testlauf zeigt keine zusaetzlichen act()-Warnungen in den von diesem Plan geaenderten/neuen Tests; die zwei verbleibenden Warnungen stammen aus dem unveraenderten, vorbestehenden D-10-Describe-Block (ausserhalb des Scopes dieses Plans, siehe Scope-Boundary-Regel).

---

**Total deviations:** 2 auto-fixed (beide Rule 1/Bug, direkt durch die in diesem Plan vorgenommene Design-Entscheidung -- echte Fetch-Ladung im prefill-Pfad statt bewusst inaktiv -- verursacht). Kein Scope-Creep.
**Impact on plan:** Keiner der beiden Fixes aenderte das im PLAN.md vorgegebene Verhalten; beide waren notwendige Voraussetzungen, damit die im PLAN.md selbst geforderte Preselektion tatsaechlich funktioniert.

## Issues Encountered

Keine ueber die oben dokumentierten Deviations hinaus. Beide RED-Phasen schlugen erwartungsgemaess fehl (fehlende Props/Felder), beide GREEN-Implementierungen liefen nach den beschriebenen Korrekturen durch.

## Known Stubs

None — die Release-Praeselektion im Kontext-Einstieg ist vollstaendig funktionsfaehig (echte Optionen, echte Vorauswahl, aenderbar, Submit traegt die getroffene Auswahl ueber den bereits in Plan 191-34 verdrahteten Submit-Pfad).

## User Setup Required

None — keine externe Service-Konfiguration noetig. `docker restart team4sv30-frontend` wurde ausgefuehrt und verifiziert (Projektseite `/anime/2/group/26` und Release-Seite `/anime/2/group/26/releases/52`, reale Live-Daten 11eyes/Strawhat Subs, beide `200`, keine Fehler im Container-Log).

## Next Phase Readiness

- D-30 ist vollstaendig geschlossen: echter Projekttitel UND Release-Kontext (Vorauswahl + Label) auf der Release-Seite, Rueckwaertskompatibilitaet fuer die Projektseite (`HeroSection.tsx`) gewahrt, Release-Auswahl bleibt in beiden prefill-Varianten aenderbar.
- Kein Blocker fuer nachfolgende Plaene. Die naechste Gap-Closure-Runde (falls noetig) kann auf der jetzt einheitlichen `releaseSelection`-Verdrahtung (ein Hook-Call fuer beide Pfade: interaktiv UND prefill) aufbauen, ohne eine zweite Instanz einzufuehren.

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Plan: 35*
*Completed: 2026-10-24*

## Self-Check: PASSED

Alle 9 geänderten Dateien sind auf der Platte bestätigt; alle 4 Commit-Hashes
(`4053b5bb4`, `9bbee3cd8`, `79b92fc31`, `63f7dc840`) sind in der Git-Historie bestätigt.
