---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 17
subsystem: ui
tags: [react, nextjs, vitest, wizard, contributions, d-12, prefill]

# Dependency graph
requires:
  - phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
    provides: "D-10-Bugfix und ProposalAnimeOption-Typ (Plan 191-15), fester 3-Schritte-Wizard ohne Hinweisart-Dimension (Plan 191-14)"
provides:
  - "isEligibleForContributions in genau einem wiederverwendbaren Modul (frontend/src/lib/contributionsEligibility.ts), von /me/contributions/page.tsx importiert statt lokal dupliziert"
  - "ProposalForm akzeptiert eine optionale prefill-Prop ({fansubGroupId, fansubGroupName, animeId, animeTitle}), die Schritt 1 komplett überspringt, Zielgruppe/Projekt SYNCHRON ohne Netzwerk-Aufruf aus der Prop auflöst und einen 2-Segment-Fortschrittsbalken + nicht editierbare Kontext-Zeile rendert"
  - "PrefillTargetGroup (ProposalForm.useSubmit.ts) als schmaler {id, name}-Typ, den SubmitTarget.foreignGroup jetzt zusätzlich zu einem vollen FansubGroup akzeptiert"
affects: ["191-18 (neuer 'Fehler melden'-Einstiegspunkt auf öffentlichen Projekt-/Release-Seiten): kann jetzt isEligibleForContributions importieren und ProposalForm mit prefill öffnen, ohne die D-10-Fremdgruppen-Regression zu reproduzieren"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Formular-Vorauswahl über lazy useState-Initializer, die beim ersten Mount einmalig aus einer optionalen Prop ableiten (groupScope/selectedGroupId/selectedAnimeId/step) -- funktioniert nur korrekt, weil der Aufrufer die Komponente conditional mounted (showForm && <ProposalForm/>), nicht über eine open-Prop offen hält; jeder neue Einstieg ist ein frischer Mount mit frischer Ableitung."
    - "Ein als bereits bekannt markierter Formular-Zustand (prefill) schließt die zugehörige Daten-Lade-Maschinerie (loadGroupAnime-Effekt) über einen Guard aus, statt die Maschinerie mit synthetischen Werten zu füttern -- verhindert strukturell, dass ein Netzwerk-Pfad erneut läuft, der die vorausgesetzten Daten (hier: einen Slug) gar nicht hat."

key-files:
  created:
    - frontend/src/lib/contributionsEligibility.ts
    - frontend/src/lib/contributionsEligibility.test.ts
  modified:
    - frontend/src/app/me/contributions/page.tsx
    - frontend/src/components/contributions/ProposalForm.tsx
    - frontend/src/components/contributions/ProposalForm.test.tsx
    - frontend/src/components/contributions/ProposalForm.useSubmit.ts
    - frontend/src/components/contributions/ProposalForm.useSubmit.test.ts

key-decisions:
  - "useProposalFormPrefill.ts wurde NICHT erstellt: ProposalForm.tsx liegt nach der Prefill-Implementierung bei 448 Zeilen (wc -l), also unter dem 450-Zeilen-Gate -- die im Plan vorgesehene Extraktion ist laut Plan-Anweisung nur bei Überschreitung durchzuführen. Die Prefill-Ableitungslogik bleibt deshalb inline in ProposalForm.tsx, kein Platzhalter-File angelegt."
  - "Die Kontext-Zeile (D-12 Contract D4, '14px/400/var(--text-muted)') und die dynamische Segment-Spaltenzahl der Fortschrittsanzeige wurden über Inline-style statt über neue contributions.module.css-Klassen umgesetzt, weil diese Datei bewusst NICHT in der files_modified-Liste des Plans steht -- ein neues CSS-Modul-Class-Paar hätte eine im Plan nicht vorgesehene Datei angefasst. Als Nebeneffekt überschreibt das Inline-style auf .progressSegments zugleich die bereits vorbestehende, stale `grid-template-columns: repeat(4, ...)`-Regel (ein Rest aus einem früheren, 4-Schritte-Wizard-Design, das D-09/Plan 191-14 bereits auf 3 Schritte zurückgebaut hatte, ohne diese CSS-Zeile nachzuziehen) -- ohne die CSS-Datei selbst zu berühren."
  - "PrefillTargetGroup wurde als Pick<FansubGroup, 'id' | 'name'> in ProposalForm.useSubmit.ts definiert (nicht in ProposalForm.tsx), exakt wie im Plan vorgegeben -- gleiche Begründung wie ProposalAnimeOption in Plan 191-15: useSubmit.ts hängt von keiner der beiden anderen Dateien ab und wird von beiden importiert."

requirements-completed: [D-12, D-15]

# Metrics
duration: ~45min
completed: 2026-10-23
---

# Phase 191 Plan 17: Gap-Closure Live-UAT-Nachbesserung (Eligibility-Extraktion + ProposalForm-Prefill) Summary

**`isEligibleForContributions` lebt jetzt in genau einem Modul (`frontend/src/lib/contributionsEligibility.ts`), und `ProposalForm` akzeptiert eine optionale `prefill`-Prop, die Gruppe/Projekt synchron ohne jeden Netzwerk-Aufruf auflöst und Schritt 1 überspringt -- beides legt die Grundlage für den D-12-"Fehler melden"-Einstiegspunkt (Plan 191-18), ohne den D-10-403-Bug erneut einzuführen.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-10-23T20:43:51Z (approx.)
- **Completed:** 2026-10-23T21:05:00Z (approx.)
- **Tasks:** 2 completed (beide als TDD mit separatem RED/GREEN-Commit)
- **Files modified:** 7 (2 neu, 5 geändert)

## Accomplishments

- **Task 1:** `isEligibleForContributions` aus `/me/contributions/page.tsx` nach `frontend/src/lib/contributionsEligibility.ts` extrahiert, byte-identisches Verhalten (Wahrheitstabelle über 4 Testfälle bewiesen). `page.tsx` importiert die Funktion jetzt statt sie lokal zu definieren -- Plan 191-18's neuer "Fehler melden"-Einstiegspunkt kann dieselbe Quelle importieren, ohne eine zweite, lokal duplizierte Kopie zu bauen (D-12-Vorgabe, dieselbe "keine Kopie"-Linie wie D-02 für die Gruppensuche).
- **Task 2:** `ProposalForm` akzeptiert eine neue, optionale `prefill`-Prop (`ProposalFormPrefill`: `{fansubGroupId, fansubGroupName, animeId, animeTitle}`). Bei gesetzter Prop:
  - `step` startet bei `2` (Rolle) statt `1` -- `Step1GroupProject` wird nie gemountet.
  - `groupScope`/`selectedGroupId` werden beim Mount einmalig aus der Prop abgeleitet (`'own'`, wenn `prefill.fansubGroupId` in `ownGroups` vorkommt, sonst `'foreign'`).
  - `selectedAnimeId`/`selectedAnime` werden direkt aus `prefill.animeId`/`prefill.animeTitle` gesetzt -- **kein** `loadGroupAnime`-Aufruf, **kein** `getPublicFansubProfileBySlug`/`getAdminFansubAnime`-Aufruf für diesen Pfad (per Test bewiesen). Das ist der im Plan-Checker explizit verlangte Regressionsschutz: der prefillte Fremdgruppen-Fall darf den D-10-403-Bug (Plan 191-15) nicht über einen fehlenden Slug erneut auslösen.
  - Der Fortschrittsbalken zeigt nur die verbleibenden 2 Segmente (`Rolle`, `Hinweis & Zeitraum`), "Schritt X von Y" zählt relativ dazu (Schritt 2 im internen State ⇒ "Schritt 1 von 2").
  - Eine nicht editierbare Kontext-Zeile ("Du meldest einen Fehler zu {animeTitle} bei {fansubGroupName}.") erscheint am Kopf des Modal-Bodies, 14px/400/`var(--text-muted)`.
  - "Zurück" erscheint erst ab Schritt 3 (nicht schon auf der für diesen Flow ersten sichtbaren Stufe, Schritt 2).
  - `SubmitTarget.foreignGroup` wird für den Submit auf ein schmales `{id, name}`-Objekt (`PrefillTargetGroup`, neuer exportierter Typ in `ProposalForm.useSubmit.ts`) statt eines vollen `FansubGroup` gebaut.
  - Ohne `prefill` ist jedes bestehende Verhalten aus den Plänen 191-14/191-15 byte-identisch (alle 19 Bestandstests in `ProposalForm.test.tsx` unverändert grün).
- **File-Size-Gate ausgeführt:** `ProposalForm.tsx` liegt nach der Änderung bei **448 Zeilen** (`wc -l`), unter dem 450-Zeilen-Cap -- die im Plan vorgesehene `useProposalFormPrefill.ts`-Extraktion war deshalb laut Plan-Anweisung NICHT nötig und wurde nicht durchgeführt.
- Frontend-Container (`team4sv30-frontend`) neu gestartet; `/`, `/me/contributions`, `/fansubs` antworten mit HTTP 200, keine Compile-Fehler im Container-Log.
- Gesamte Frontend-Testsuite (415 Dateien, 3782 Tests) gelaufen: 3774 PASS, 2 FAIL + 1 übersprungene Suite, alle drei vorbestehend und außerhalb dieses Plan-Scopes (siehe "Issues Encountered").

## Task Commits

Jede Task wurde als TDD mit separatem RED/GREEN-Commit committet:

1. **Task 1 RED: failing Test für isEligibleForContributions-Extraktion** - `8ea59e507` (test)
2. **Task 1 GREEN: Eligibility-Prüfung in wiederverwendbares Modul extrahiert** - `4c43b3b09` (feat)
3. **Task 2 RED: failing Tests für ProposalForm prefill-Prop + PrefillTargetGroup** - `e873b80b9` (test)
4. **Task 2 GREEN: ProposalForm prefill-Support, synchrone Auflösung, kein Netzwerk-Aufruf** - `4354623c2` (feat)

## Files Created/Modified

- `frontend/src/lib/contributionsEligibility.ts` - neu: `isEligibleForContributions`, verbatim aus `page.tsx` extrahiert, fachlicher Kommentar erweitert um den D-12-Wiederverwendungszweck
- `frontend/src/lib/contributionsEligibility.test.ts` - neu: 4 Logik-Tests (Wahrheitstabelle)
- `frontend/src/app/me/contributions/page.tsx` - lokale `isEligibleForContributions`-Definition entfernt, Import aus `@/lib/contributionsEligibility`, `MemberProfileData`-Import entfernt (nur noch für die gelöschte lokale Signatur gebraucht)
- `frontend/src/components/contributions/ProposalForm.tsx` - neue `prefill`-Prop (`ProposalFormPrefill`-Typ, exportiert), lazy State-Initialisierung für `step`/`groupScope`/`selectedGroupId`/`selectedAnimeId` aus `prefill`, `activeGroupId`/`activeGroupName`/`selectedAnime` lösen `prefill` zuerst auf, `loadGroupAnime`-Effekt-Guard überspringt bei `prefill` komplett, `visibleSteps`/`progressPosition`/`progressTotal` für den 2-Segment-Fortschrittsbalken, Kontext-Zeile, "Zurück"-Sichtbarkeit `prefill ? step > 2 : step > 1`
- `frontend/src/components/contributions/ProposalForm.test.tsx` - `renderForm`-Helper reicht `prefill` durch, neue Testgruppe "vorausgewählter Einstieg (prefill-Prop, D-12-Vorbereitung)" mit 4 Tests (Schritt-2-Start + 2 Segmente + Kontext-Zeile, kein Zurück-Button, kein Netzwerk-Aufruf + korrekter Fremdgruppen-Submit, korrekte Eigene-Gruppe-Erkennung)
- `frontend/src/components/contributions/ProposalForm.useSubmit.ts` - neuer exportierter Typ `PrefillTargetGroup = Pick<FansubGroup, 'id' | 'name'>` mit Doku-Kommentar, `SubmitTarget.foreignGroup` auf `FansubGroup | PrefillTargetGroup | null` erweitert
- `frontend/src/components/contributions/ProposalForm.useSubmit.test.ts` - neuer Test beweist, dass `submit()` ein `foreignGroup`-Objekt ohne `slug` akzeptiert und korrekt sendet

## Decisions Made

Siehe `key-decisions` im Frontmatter -- insbesondere die bewusste Entscheidung, `useProposalFormPrefill.ts` NICHT anzulegen (File-Size-Gate unterschritten) und die Kontext-Zeile/Segment-Spaltenzahl über Inline-style statt neuer CSS-Klassen umzusetzen (contributions.module.css stand bewusst nicht in `files_modified`).

## Deviations from Plan

None - plan executed exactly as written (inklusive des explizit dokumentierten File-Size-Gates, das hier keinen Split erforderte).

## Issues Encountered

Die projektweite Frontend-Testsuite (`npm --prefix frontend run test`, 415 Dateien/3782 Tests) zeigt 3 Fehlschläge, alle **vorbestehend und außerhalb des Scopes dieses Plans** (keine der drei Dateien ist Teil der `files_modified` dieses Plans):

1. `src/components/profile/badgeArtwork.test.ts` -- erfordert `API_INTERNAL_URL` ("Run the artwork catalog gate in the Linux frontend Compose service"), ein umgebungsabhängiger Gate-Test, der nur innerhalb des Compose-Service läuft, nicht über den lokalen `npm run test`-Befehl.
2. `src/components/ui/ResponsiveImage.config.test.ts` -- `hasRemoteMatch`-Assertion schlägt unabhängig von dieser Änderung fehl (bereits in Plan 191-15-SUMMARY als vorbestehend dokumentiert).
3. `src/app/admin/roles/RoleCapabilityDetail.membershipBaselineDrift.test.ts` -- `ENOENT: /backend/internal/permissions/permissions.go`, ein umgebungsabhängiger Pfadzugriff (bereits in Plan 191-15-SUMMARY als vorbestehend dokumentiert).

Der scope-genaue Verify-Befehl des Plans (`npm --prefix frontend run test -- ProposalForm contributionsEligibility` sowie `npm --prefix frontend run typecheck`) ist vollständig grün, ebenso die gesamte `src/components/contributions`-Familie (11 Dateien, 62 Tests).

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Next Phase Readiness

- Plan 191-18 (neuer "Fehler melden"-Einstiegspunkt auf öffentlichen Projekt-/Release-Seiten, D-12) kann jetzt `isEligibleForContributions` aus `@/lib/contributionsEligibility` importieren und `ProposalForm` mit `prefill={{ fansubGroupId, fansubGroupName, animeId, animeTitle }}` öffnen -- ohne eigene Eligibility-Kopie und ohne den D-10-403-Bug erneut zu reproduzieren (bewiesen: kein `getPublicFansubProfileBySlug`/`getAdminFansubAnime`-Aufruf im prefillten Pfad).
- `ProposalForm.tsx` bleibt bei 448 Zeilen, 2 Zeilen unter dem 450er-Cap -- jede weitere inhaltliche Änderung an dieser Datei (z. B. durch Plan 191-18, falls dort doch noch etwas an `ProposalForm.tsx` selbst geändert werden muss) muss die Zeilenzahl erneut prüfen.
- `npm --prefix frontend run test -- src/components/contributions` (gesamte Komponentenfamilie): 11 Testdateien, 62 Tests, vollständig grün.
- Frontend-Container (`team4sv30-frontend`) läuft nach Neustart fehlerfrei, `/`, `/me/contributions`, `/fansubs` alle HTTP 200.

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Completed: 2026-10-23*

## Self-Check: PASSED

Alle 8 genannten Dateien existieren auf der Festplatte, alle 4 Task-Commit-Hashes
(`8ea59e507`, `4c43b3b09`, `e873b80b9`, `4354623c2`) sind per `git log --oneline --all | grep`
im Git-Verlauf auffindbar.
