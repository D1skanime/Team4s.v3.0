---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 07
subsystem: ui
tags: [react, nextjs, vitest, wizard, contributions]

requires:
  - phase: 191-02
    provides: "useFansubGroupSearch-Hook (frontend/src/hooks/useFansubGroupSearch.ts) — gemeinsame Fremd-Gruppen-Suche"
  - phase: 191-06
    provides: "frontend/src/types/fansub-group-hints.ts + frontend/src/lib/api/fansub-group-hints.ts (createFansubGroupHint u.a.)"
provides:
  - "ProposalForm.tsx als 4-Schritte-Wizard (Hinweisart/Gruppe/Rolle/Hinweis), der sowohl Korrektur-Hinweis als auch Mitgliedschaftsanfrage abdeckt (D-06)"
  - "ProposalForm.useSubmit.ts: useProposalFormSubmit-Hook + die drei Pure Functions stepsForHintType/buildHintSubmitPayload/errorMessageForHintStatus"
  - "ProposalForm.toggles.tsx (HintTypeToggle/GroupScopeToggle) und ProposalForm.extraSteps.tsx (Step0HintType/StepRoleOptional)"
  - "MyProposalsSection.tsx: A6-Trigger-Button-Fix + fansub_group-Kontext-Rollenquelle fuer das optionale Rollenfeld (D-07)"
affects: [191-08, 191-09, 191-10]

tech-stack:
  added: []
  patterns:
    - "Submit-Dispatch-Hook (useProposalFormSubmit) trennt Wizard-Zustandsmaschine von Backend-Routing — zwei Backend-Tabellen (anime_contributions vs. fansub_group_hints) je nach Hinweisart+Gruppen-Scope, nicht per Parallel-UI"
    - "Pure-Function-Extraktion (stepsForHintType/buildHintSubmitPayload/errorMessageForHintStatus) statt Render-/Klick-Simulation des gesamten Wizards fuer Validierungs-/Payload-Logik (CLAUDE.md-Teststil)"

key-files:
  created:
    - frontend/src/components/contributions/ProposalForm.toggles.tsx
    - frontend/src/components/contributions/ProposalForm.toggles.test.tsx
    - frontend/src/components/contributions/ProposalForm.extraSteps.tsx
    - frontend/src/components/contributions/ProposalForm.extraSteps.test.tsx
    - frontend/src/components/contributions/ProposalForm.useSubmit.ts
    - frontend/src/components/contributions/ProposalForm.useSubmit.test.ts
    - frontend/src/components/contributions/ProposalForm.steps.test.tsx
    - frontend/src/components/contributions/MyProposalsSection.test.tsx
  modified:
    - frontend/src/components/contributions/ProposalForm.tsx
    - frontend/src/components/contributions/ProposalForm.steps.tsx
    - frontend/src/components/contributions/ProposalForm.test.tsx
    - frontend/src/components/contributions/MyProposalsSection.tsx
    - frontend/src/components/contributions/contributions.module.css

key-decisions:
  - "Submit routet nicht nur nach hintType, sondern nach (hintType, groupScope): Korrektur+Eigene-Gruppe bleibt exakt auf createContributionProposal (Plan-Text), aber Korrektur+Andere-Gruppe MUSS auf createFansubGroupHint ausweichen, weil fansub_group_member_id fuer eine fremde Gruppe schlicht nicht existiert und die Datenbank-Ownership-Pruefung fuer createContributionProposal unveraendert bleibt (191-02-SUMMARY.md). Die im Rolle-Schritt gewaehlte Rolle wird fuer diesen Fall als Klartext in die Notiz eingebettet (`Rolle: {label}`), weil fansub_group_hints fuer hint_type='correction' kein Rollenfeld besitzt (Migration 0187, chk_fansub_group_hints_role_scope)."
  - "fansub_group-Kontext-Rollen fuer das optionale D-07-Feld werden in MyProposalsSection.tsx (nicht in ProposalForm.tsx) via useRoleCatalog('fansub_group') aufgeloest und als Prop durchgereicht — folgt dem bereits etablierten Muster der anime_contribution-Rollen in derselben Datei, haelt ProposalForm.tsx provider-frei testbar (keine RoleCatalogProvider-Huelle in Tests noetig) und weicht damit bewusst vom woertlichen Interfaces-Snippet des Plans ab (das den Hook-Aufruf in ProposalForm.tsx selbst vorschlug)."
  - "Drei neue render-basierte Mitgliedschaftsanfrage-Tests (voller Klick-Durchlauf Hinweisart->Gruppensuche->Rolle->Submit) wurden nach erstem Entwurf wieder entfernt, weil sie gegen die explizite Planvorgabe 'kein Render-/Klick-Simulationstest des gesamten Wizards' verstossen haetten. Ersetzt durch: Pure-Function-/Hook-Tests (ProposalForm.useSubmit.test.ts), isolierte Step-Komponententests ohne den Wizard (ProposalForm.steps.test.tsx/.extraSteps.test.tsx) und einen einzigen A6-Smoke-Test auf Wizard-Ebene."
  - "ProposalForm.tsx/.steps.tsx haetten mit allen neuen Feldern die 450-Zeilen-Grenze gerissen (steps.tsx: 452 Zeilen vor der Korrektur) — Step0HintType/StepRoleOptional liegen deshalb von Anfang an in einer eigenen Datei (ProposalForm.extraSteps.tsx) und die Submit-Logik in ProposalForm.useSubmit.ts, statt den Plan-Vorschlag eines nachgelagerten zweiten Splitting-Commits zu befolgen — die Dateien existierten vor diesem Plan nicht, ein 'Umbau-dann-Aenderung'-Commitpaar haette hier keinen eigenstaendigen Sinn ergeben (gleiche Begruendung wie bereits in Plan 191-07 Task 1 fuer ProposalForm.toggles.tsx)."

requirements-completed: [D-02, D-06, D-07, D-08]

duration: ~75min
completed: 2026-10-23
---

# Phase 191 Plan 07: Hinweis-Formular fuer beide Hinweisarten + fremde Gruppen Summary

**ProposalForm.tsx ist jetzt ein 4-Schritte-Wizard, der sowohl Korrektur-Hinweise als auch Mitgliedschaftsanfragen an eigene ODER fremde Fansub-Gruppen abdeckt — Korrektur+Eigene-Gruppe bleibt byte-identisch auf dem Bestands-Endpunkt, jede andere Kombination laeuft ueber den neuen fansub_group_hints-Endpunkt, und der A6-Gating-Bug (Trigger-Button faelschlich an ownGroups.length>0 gebunden) ist behoben.**

## Performance

- **Duration:** ~75 min
- **Tasks:** 3 completed
- **Files modified:** 13 (8 created, 5 modified)

## Accomplishments

- `HintTypeToggle`/`GroupScopeToggle` (`ProposalForm.toggles.tsx`) bilden D-06/D-02 als zwei visuell identische Radiogroup-Umschalter ab, exakt im Darstellungsmuster von `Step2Role`'s `rolePicker` — keine neue CSS-Klasse.
- Der Wizard hat jetzt vier Schritte (`Hinweisart`/`Gruppe`(`& Projekt`)/`Rolle`/`Hinweis`(`& Zeitraum`)); Schritt-Titel und Feld-Sichtbarkeit (Anime-Picker, Von/Bis-Jahr, 90-Tage-Panel) werden ueber die pure Function `stepsForHintType` sowie Boolean-Props (`showYearAndInfoPanel`) berechnet statt hartcodiert.
- Die Gruppenauswahl nutzt bei "Andere Gruppe" den bereits in Plan 191-02 extrahierten `useFansubGroupSearch`-Hook (keine zweite Such-Implementierung); eine Auswahl wird im bestehenden `selectionBreadcrumb` mit `Badge variant="muted"` ("Eigene Gruppe") bzw. `variant="info"` ("Andere Gruppe") gekennzeichnet.
- Die Submit-Logik lebt jetzt in `ProposalForm.useSubmit.ts` (`useProposalFormSubmit`-Hook + drei exportierte Pure Functions). Sie routet nach `(hintType, groupScope)`: Korrektur+Eigene-Gruppe bleibt exakt auf `createContributionProposal` (Regressionstest beweist byte-identisches Payload), jede andere Kombination auf dem neuen, ownership-freien `createFansubGroupHint` — mit korrekter Prioritaet der 409-Fehlerbehandlung (Korrektur-Konflikttext vs. D-04(1)-Doppel-Hinweis-Text), siehe Deviations.
- Das optionale Rollenfeld der Mitgliedschaftsanfrage (`StepRoleOptional`, D-07) bezieht seine Optionen ausschliesslich aus `useRoleCatalog('fansub_group')` (gefiltert auf `assignable`), niemals aus der `anime_contribution`-Rollenliste — `fansub_lead` kann dadurch strukturell nicht im Korrektur-Rollenfeld auftauchen.
- `MyProposalsSection.tsx`: der "Hinweis senden"-Trigger ist nicht mehr an `ownGroups.length > 0` gebunden (A6-Fix) und der zugehoerige Warnhinweis ("Verifizierte Gruppenmitgliedschaft erforderlich.") wurde entfernt, weil kein verbleibender Blockier-Fall existiert.
- Frontend-Container neu gestartet; `/me/contributions` sowie `/` antworten mit HTTP 200, keine Compile-/Runtime-Fehler im Container-Log.

## Task Commits

Each task was committed atomically:

1. **Task 1: HintTypeToggle + GroupScopeToggle** - `0e80b8461` (feat)
2. **Task 2: Hinweisart/Gruppen-Scope/Rollenfeld-Verdrahtung** - `4a41b8da5` (feat)
3. **Task 3: A6-Trigger-Button-Fix** - `b86e5f5ae` (fix)

## Files Created/Modified

- `frontend/src/components/contributions/ProposalForm.toggles.tsx` - HintTypeToggle/GroupScopeToggle (NEU)
- `frontend/src/components/contributions/ProposalForm.toggles.test.tsx` - Logik-/DOM-Tests der Toggles (NEU)
- `frontend/src/components/contributions/ProposalForm.extraSteps.tsx` - Step0HintType/StepRoleOptional (NEU, Split wegen 450-Zeilen-Limit)
- `frontend/src/components/contributions/ProposalForm.extraSteps.test.tsx` - Isolierte Tests dieser beiden Schritte (NEU)
- `frontend/src/components/contributions/ProposalForm.useSubmit.ts` - Submit-Hook + Pure Functions (NEU)
- `frontend/src/components/contributions/ProposalForm.useSubmit.test.ts` - 15 Logik-/Hook-Tests inkl. Korrektur-Regression (NEU)
- `frontend/src/components/contributions/ProposalForm.steps.test.tsx` - Isolierte Tests fuer Step1GroupProject/Step3NoteRange (NEU)
- `frontend/src/components/contributions/ProposalForm.tsx` - 4-Schritte-Wizard, hintType/groupScope/foreignGroup/requestedRoleCode-State
- `frontend/src/components/contributions/ProposalForm.steps.tsx` - Step1GroupProject erweitert (Scope-Toggle, Fremd-Suche, bedingter Anime-Picker), Step3NoteRange mit `showYearAndInfoPanel`
- `frontend/src/components/contributions/ProposalForm.test.tsx` - an den neuen Hinweisart-Schritt angepasst, Mitgliedschafts-Vollsimulationen entfernt (siehe Deviations)
- `frontend/src/components/contributions/MyProposalsSection.tsx` - A6-Fix, fansub_group-Rollenquelle
- `frontend/src/components/contributions/MyProposalsSection.test.tsx` - A6-Regressionstest (NEU)
- `frontend/src/components/contributions/contributions.module.css` - `progressSegments` auf 4 Spalten, neue `foreignGroupSearch`/`groupSearchList`/`groupSearchItem`-Klassen

## Decisions Made

Siehe `key-decisions` im Frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 409-Fehlerpriorität überschrieb den unveränderten Korrektur/Eigene-Gruppe-Pfad**
- **Found during:** Task 2 Verifikation (`npm run test -- ProposalForm.test`)
- **Issue:** Die generische `errorMessageForHintStatus(409)`-Zuordnung (D-04(1)-Text "Du hast dazu bereits einen offenen Hinweis.") griff auch für 409-Fehler aus `createContributionProposal`, obwohl dieser Pfad eine andere, bereits bestehende 409-Bedeutung hat (Rollen-/Projekt-Konflikt in `anime_contributions`). Der bestehende Regressionstest schlug fehl.
- **Fix:** Reihenfolge im `catch`-Block von `useProposalFormSubmit` vertauscht — die Korrektur+Eigene-Gruppe-Sonderbehandlung läuft jetzt VOR der generischen Hint-Status-Zuordnung.
- **Files modified:** `frontend/src/components/contributions/ProposalForm.useSubmit.ts`
- **Verification:** Alle 15 Tests in `ProposalForm.useSubmit.test.ts` sowie der bestehende Konfliktmeldungs-Test in `ProposalForm.test.tsx` grün.
- **Committed in:** `4a41b8da5` (vor dem Commit korrigiert)

**2. [Rule 1 - Bug] Submit-Routing nach hintType allein war für Korrektur an eine fremde Gruppe technisch unmöglich**
- **Found during:** Task 2 Implementierung (Payload-Konstruktion)
- **Issue:** Der Plan-Fließtext beschreibt "Korrektur calls createContributionProposal EXACTLY as today" ohne Qualifizierung nach Gruppen-Scope. `createContributionProposal` braucht aber zwingend `fansub_group_member_id` aus einer `MembershipEntry` — ein per Fremd-Suche gewähltes `FansubGroup`-Objekt hat dieses Feld nicht, und die Backend-Ownership-Prüfung (`MemberBelongsToFansub`, unverändert laut 191-02-SUMMARY.md) würde den Aufruf ohnehin mit 403 ablehnen. D-02 zielt laut Entstehungsgeschichte (Timer bei NewSubs, auch Timer bei RedHeartFansub) aber gerade auf genau diesen Fall ab.
- **Fix:** Submit routet nach `(hintType, groupScope)` statt nach `hintType` allein: Korrektur+Eigene-Gruppe bleibt auf `createContributionProposal`, Korrektur+Andere-Gruppe wechselt auf `createFansubGroupHint` (`hint_type: 'correction'`, `related_anime_id` gesetzt, gewählte Rolle als Klartext in die Notiz eingebettet, da das Zielschema dort kein Rollenfeld kennt).
- **Files modified:** `frontend/src/components/contributions/ProposalForm.useSubmit.ts`
- **Verification:** Dedizierter Hook-Test beweist `createFansubGroupHint` statt `createContributionProposal` für diese Kombination.
- **Committed in:** `4a41b8da5`

**3. [Rule 1 - Bug] Drei render-basierte Mitgliedschaftsanfrage-Tests verstießen gegen die explizite Teststil-Vorgabe**
- **Found during:** Task 2 Verifikation, Review der eigenen Testdatei gegen Guardrail 4
- **Issue:** Ein erster Entwurf von `ProposalForm.test.tsx` enthielt drei neue Tests, die den gesamten Wizard per `fireEvent`-Klicks durch Hinweisart → Gruppensuche → Rollenfeld → Submit simulierten — exakt das vom Orchestrator-Prompt (Guardrail 4) und vom CLAUDE.md-Teststil-Abschnitt ausgeschlossene Muster.
- **Fix:** Entfernt und durch Pure-Function-/Hook-Tests (bereits in `ProposalForm.useSubmit.test.ts` vorhanden), neue isolierte Step-Komponententests (`ProposalForm.steps.test.tsx`, `ProposalForm.extraSteps.test.tsx`) und einen einzigen minimalen A6-Smoke-Test ersetzt.
- **Files modified:** `frontend/src/components/contributions/ProposalForm.test.tsx` (Entfernung), `ProposalForm.steps.test.tsx`/`ProposalForm.extraSteps.test.tsx` (NEU, Ersatz)
- **Verification:** `npm run test -- ProposalForm` weiterhin vollständig grün (47 Tests über 5 Dateien).
- **Committed in:** `4a41b8da5`

---

**Total deviations:** 3 auto-fixed (alle Rule 1 — notwendig, um die im Plan beschriebene Funktionalität ueberhaupt lauffaehig und teststil-konform zu machen; keine Scope-Erweiterung ueber D-02/D-06/D-07 hinaus)
**Impact on plan:** Alle drei Korrekturen betreffen die Submit-Routing-Logik bzw. Teststil-Konformitaet dieses Plans selbst, keine Aenderung an anderen Plaenen/Phasen.

## Offene Frage fuer eine Folge-Phase (kein Blocker fuer diesen Plan)

Der Plan-Fliesstext selbst qualifiziert "Korrektur calls createContributionProposal" nicht nach Gruppen-Scope (siehe Deviation 2). Die hier getroffene Entscheidung (Korrektur+Andere-Gruppe -> `createFansubGroupHint`, Rolle als Notiz-Text eingebettet) ist nach bestem Wissen die einzige technisch moegliche und D-02-konforme Interpretation, wurde aber nicht explizit im 191-UI-SPEC.md/191-CONTEXT.md als Payload-Mapping spezifiziert. Falls ein Leader-Review (Plan 191-08) eine strukturierte Rolle fuer Korrektur-Hinweise an fremde Gruppen erwartet, braucht das Datenmodell (fansub_group_hints) ein zusaetzliches Feld — das ist eine architektonische Entscheidung ausserhalb des Scopes dieses Plans.

## Issues Encountered

None darueber hinaus.

## User Setup Required

None - keine externe Service-Konfiguration noetig.

## Next Phase Readiness

- `createFansubGroupHint` wird jetzt von echtem UI-Code aufgerufen (vorher nur von Plan 191-06 getestet) — Plan 191-08 (Leader-Review) und 191-09 (Plattform-Admin-Liste) koennen auf reale, ueber dieses Formular erzeugte Hinweise pruefen.
- `npm --prefix frontend run test -- ProposalForm`, `npm --prefix frontend run test -- MyProposalsSection` und `npm --prefix frontend run typecheck` sind gruen; die volle Suite (`npm run test`) zeigt ausschliesslich drei vorbestehende, umgebungsbedingte Fehlschlaege (fehlende `API_INTERNAL_URL`/Backend-Go-Quellpfad in dieser Ausfuehrungsumgebung), keine Regression durch diesen Plan.
- Frontend-Container (`team4sv30-frontend`) neu gestartet, `/me/contributions` und `/` antworten mit HTTP 200.
- Die in "Offene Frage" dokumentierte Payload-Luecke (Rolle bei Korrektur+fremde-Gruppe nur als Notiz-Text) sollte Plan 191-08 beim Bau der Leader-Review-Darstellung bekannt sein.

## Self-Check: PASSED

Alle 14 genannten Dateien existieren auf der Festplatte (`[ -f ... ]` je einzeln geprueft) und alle drei Task-Commit-Hashes (`0e80b8461`, `4a41b8da5`, `b86e5f5ae`) sind per `git log --oneline --all | grep` im Git-Verlauf auffindbar.

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Completed: 2026-10-23*
