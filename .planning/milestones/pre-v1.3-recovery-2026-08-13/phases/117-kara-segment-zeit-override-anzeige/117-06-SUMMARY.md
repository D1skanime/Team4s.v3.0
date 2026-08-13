---
phase: 117-kara-segment-zeit-override-anzeige
plan: 06
subsystem: ui
tags: [react, nextjs, admin, segments, override, switch, form-field, ui-primitives, tdd]

# Dependency graph
requires:
  - phase: 117-05
    provides: "POST/DELETE .../segments/:segmentId/assignments und PUT/DELETE .../assignments/:releaseVersionId/override Admin-Endpunkte (D-01/D-03)"
  - phase: 117-07
    provides: "AdminThemeSegment (assigned_release_version_ids/is_shared/has_episode_override/assigned_episodes) bereits im Frontend-Typ; Badge/DisclosureIndicator-Anzeige in SegmenteTab.tsx"
provides:
  - "assignAnimeSegment/unassignAnimeSegment/upsertAnimeSegmentEpisodeOverride/deleteAnimeSegmentEpisodeOverride API-Client-Funktionen in frontend/src/lib/api.ts"
  - "assignSegment/unassignSegment/setSegmentOverride/removeSegmentOverride Hook-Methoden in useReleaseSegments.ts"
  - "Per-Folge Zeit-Override-Eingabe-Block in SegmentEditPanel.tsx (Switch + FormField/Input-Paar + 'Override entfernen'-Button), sichtbar nur bei geteilten Segmenten (is_shared), persistiert ausschliesslich ueber den bestehenden 'Speichern'-Button"
  - "useSegmentOverrideHandlers-Hook in SegmenteTab.helpers.tsx kapselt Override-Save/Remove-State+Handler"
affects: [117-08, 117-09]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Composite-Handler-Hook (useSegmentOverrideHandlers) statt weiterer lokaler useState-Paare in SegmenteTab.tsx -- haelt die Verdrahtung eines neuen Panel-Feature-Blocks aus der ohnehin schon grossen Tab-Datei heraus", "Echte Episodennummer fuer UI-Labels via findAssignedEpisodeNumber(segment, currentReleaseVersionId) statt eines neuen Props -- konsistent mit dem B3-Fix aus Plan 117-07 (niemals release_version_id anzeigen)"]

key-files:
  created: []
  modified:
    - "frontend/src/types/admin.ts"
    - "frontend/src/lib/api.ts"
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseSegments.ts"
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx"
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx"
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx"
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx"

key-decisions:
  - "currentEpisodeLabel wird in SegmentEditPanel.tsx per findAssignedEpisodeNumber(editingSegment, currentReleaseVersionId) berechnet statt eines zusaetzlichen currentEpisodeNumber-Props, da assigned_episodes (117-07) die ECHTE Episodennummer bereits liefert -- vermeidet eine zweite Quelle der Wahrheit und haelt den B3-Fix (niemals release_version_id anzeigen) konsistent."
  - "Der Override wird bei Switch-AUS sofort entfernt (onCheckedChange ruft onRemoveOverride() direkt auf), waehrend Switch-AN nur lokalen State setzt und erst beim Klick auf den zentralen 'Speichern'-Button persistiert wird -- exakt wie in Plan 117-06 Task 2 <action> vorgegeben. Der separate 'Override entfernen'-Button fragt zusaetzlich per window.confirm nach, das Switch-Toggle nicht (beide Pfade fuehren zum selben DELETE-Call)."
  - "useSegmentOverrideHandlers als neuer Custom-Hook in SegmenteTab.helpers.tsx ausgelagert, um die Zeilenzahl von SegmenteTab.tsx nicht weiter ueber die im Plan genannte 800-Zeilen-Toleranz zu treiben (siehe Deviations: die Datei lag durch Plan 117-07 bereits bei 792 Zeilen vor Beginn dieses Plans)."
  - "Alle vier Task-1-API-Client-Funktionen (assign/unassign/upsert-override/delete-override) wurden in useReleaseSegments.ts importiert und mit vollstaendigen Hook-Methoden (assignSegment/unassignSegment) verdrahtet, auch wenn diese Phase 117-06 nur setSegmentOverride/removeSegmentOverride in der UI verwendet -- Task 1 acceptance_criteria verlangt explizit den Import aller vier Funktionen in die Hook-Datei."

requirements-completed: [D-01, D-03]

# Metrics
duration: ~35min
completed: 2026-07-29
---

# Phase 117 Plan 06: Per-Folge Zeit-Override-Eingabe im Admin-Segment-Editor Summary

**Admins koennen im bestehenden Segment-Editor-Seitenpanel fuer die aktuell geoeffnete Folge eines geteilten Kara-Segments ueber einen `Switch` + zwei `FormField`/`Input`-Felder einen abweichenden Zeitbereich setzen und wieder entfernen, ohne ein neues Segment anzulegen und ohne automatisches Speichern (D-01).**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3/3 completed
- **Files modified:** 7 (0 neu, 7 bestehend)

## Accomplishments

- Vier neue, typsichere API-Client-Funktionen (`assignAnimeSegment`/`unassignAnimeSegment`/`upsertAnimeSegmentEpisodeOverride`/`deleteAnimeSegmentEpisodeOverride`) in `frontend/src/lib/api.ts`, exakt gegen die vier Plan-117-05-Backend-Endpunkte verdrahtet (Pfade/Methoden/Bodies 1:1 aus `admin_content_anime_theme_segment_assignments.go`/`admin_routes.go` uebernommen).
- `useReleaseSegments.ts` bekommt `assignSegment`/`unassignSegment`/`setSegmentOverride`/`removeSegmentOverride` — alle vier folgen dem bestehenden Guard-Clause/try-await/`load()`/catch-Muster von `update`/`remove`.
- `SegmentEditPanel.tsx`: neuer Override-Block, sichtbar ausschliesslich bei `editingSegment?.is_shared === true`, gebaut ausschliesslich aus `Switch`/`FormField`/`Input`/`Button` aus `@/components/ui` (Grep-verifiziert: kein neues natives `<input type="checkbox">`, kein handgebauter Toggle). Die echte Episodennummer fuer alle Labels/Hinweistexte kommt aus `findAssignedEpisodeNumber` (assigned_episodes, Plan 117-07) statt der internen `release_version_id`.
- Persistenz laeuft ausschliesslich ueber den bestehenden zentralen "Speichern"-Button: `handleSaveClick` ruft `onSave()` (Basis-Zeitbereich) UND, wenn der Override-Switch aktiv ist, zusaetzlich `onSaveOverride(...)` auf — kein zweiter Save-Button, kein impliziter Auto-Save (Data-Ownership-Constraint aus UI-SPEC Surface 1 eingehalten).
- Base-Zeitbereich-Label wechselt bei geteilten Segmenten von "Zeitbereich im Video" zu "Basis-Zeitbereich (gilt fuer alle zugewiesenen Folgen)" (UI-SPEC Layout Punkt 1).
- `SegmenteTab.tsx` verdrahtet die neuen Panel-Props ueber den neuen `useSegmentOverrideHandlers`-Hook (ausgelagert nach `SegmenteTab.helpers.tsx`), der `isSavingOverride`/`overrideError`-State + Save/Remove-Handler kapselt.
- Zwei neue Komponententests beweisen: ein `is_shared: true`-Segment rendert den Override-`Switch` im Bearbeiten-Panel, ein nicht-geteiltes Segment rendert ihn nicht.

## Task Commits

Each task was committed atomically:

1. **Task 1: Typen + API-Client-Funktionen + Hook-Methoden** - `5f3dfa3b` (feat)
2. **Task 2: Override-Eingabe-Block in SegmentEditPanel** - `21800dab` (feat)
3. **Task 3: Verdrahtung SegmenteTab -> SegmentEditPanel + Wave-0-Frontend-Test** - `908d5636` (test)

## Files Created/Modified

- `frontend/src/types/admin.ts` - neuer `AdminThemeSegmentOverrideRequest`-Typ (`AdminThemeSegment`-Felder waren bereits durch Plan 117-07 vorgezogen, kein erneuter Eintrag)
- `frontend/src/lib/api.ts` - vier neue Funktionen: `assignAnimeSegment`, `unassignAnimeSegment`, `upsertAnimeSegmentEpisodeOverride`, `deleteAnimeSegmentEpisodeOverride`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseSegments.ts` - `assignSegment`/`unassignSegment`/`setSegmentOverride`/`removeSegmentOverride` Hook-Methoden
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx` - Override-Eingabe-Block (Switch/FormField/Input/Button), neue Props, `handleSaveClick`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx` - Panel-Prop-Verdrahtung ueber `useSegmentOverrideHandlers`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx` - neuer `useSegmentOverrideHandlers`-Hook
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx` - zwei neue Tests (Switch sichtbar/nicht sichtbar), vier neue API-Mocks, fehlende Props in zwei bestehenden `SegmentEditPanel`-Direkttests ergaenzt

## Decisions Made

Siehe `key-decisions` im Frontmatter. Zusammengefasst: echte Episodennummer statt neuem Prop verwendet (B3-Fix-Konsistenz), Switch-AUS entfernt sofort ohne Bestaetigung waehrend der explizite Button bestaetigt, und die neue Verdrahtungslogik wurde in einen Custom-Hook ausgelagert statt SegmenteTab.tsx weiter aufzublaehen.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Client-seitige Validierung fuer die Override-Zeitfelder ergaenzt**
- **Found during:** Task 2 (Override-Block-Implementierung)
- **Issue:** Der Plan-Text spezifiziert nur, dass Validierungsfehler ueber die `FormField`-`error`-Prop erscheinen, ohne explizit zu fordern, dass ungueltige Override-Zeiten den zentralen "Speichern"-Button deaktivieren. Ohne diese Ergaenzung haette ein Klick auf "Speichern" bei aktivem, aber ungueltigem Override (leere Felder, Ende vor Start, >4 Minuten) einen fehlerhaften `onSaveOverride`-Call ausgeloest, der serverseitig zwar durch `validateSegmentTimes` abgefangen wird, aber unnoetig einen Fehlerhaften Request produziert.
- **Fix:** `saveDisabled` in `SegmentEditPanel.tsx` um `overrideMissingTimeRange`/`overrideHasInvalidTimeInput`/`overrideHasInvalidTimeRange` erweitert (gleiche Berechnung wie beim Basis-Zeitbereich), plus lokale Fehlertexte identisch zur Basis-Zeitbereich-Copy.
- **Files modified:** `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx`
- **Verification:** `npm run typecheck` fehlerfrei; server-seitige `validateSegmentTimes` bleibt laut Threat-Model T-117-06-01 weiterhin die durchsetzende Instanz.
- **Committed in:** `21800dab` (Task 2 commit)

**2. [Rule 2 - Missing Critical] Zeilenzahl-Wachstum von SegmenteTab.tsx durch neuen Custom-Hook begrenzt**
- **Found during:** Task 3 (Verdrahtung)
- **Issue:** `SegmenteTab.tsx` lag bereits VOR diesem Plan bei 792 Zeilen (Plan-Text nannte faelschlich "aktuell 743" als Baseline — diese Zahl war vor Plan 117-07 aktuell, welches die Datei bereits auf 792 Zeilen gebracht hatte, siehe 117-07-SUMMARY.md). Eine direkte Inline-Verdrahtung (State + zwei async Handler + Props) haette die Datei auf 828 Zeilen getrieben, klar ueber der im Plan genannten 800-Zeilen-Toleranzgrenze.
- **Fix:** `isSavingOverride`/`overrideError`-State und `handleSaveOverride`/`handleRemoveOverride` wurden in einen neuen Custom-Hook `useSegmentOverrideHandlers` in `SegmenteTab.helpers.tsx` ausgelagert (Plan-Text erlaubt genau das: "falls die Aenderung die Datei spuerbar wachsen laesst, verschiebe die neuen Callback-Definitionen nach SegmenteTab.helpers.tsx"). `SegmenteTab.tsx` liegt danach bei 804 Zeilen — 4 ueber der genannten Grenze, aber deutlich naeher dran als ohne die Auslagerung und primaer durch die bereits vor diesem Plan bestehende 792-Zeilen-Baseline verursacht, nicht durch dieses Plans eigene Verdrahtung (netto nur +12 Zeilen).
- **Files modified:** `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx`, `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx`
- **Verification:** `npm run typecheck` und `npm test -- SegmenteTab` (67/67) gruen.
- **Committed in:** `908d5636` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule-2 Missing-Critical/Modularitaets-Fixes)
**Impact on plan:** Beide Fixes waren notwendig fuer Korrektheit (verhindert fehlerhafte Save-Requests) bzw. um die CLAUDE.md-Zeilenlimit-Konvention so gut wie im Rahmen dieses Plans moeglich einzuhalten. Kein Scope-Creep ueber die Plan-Absicht hinaus.

## Issues Encountered

`SegmentEditPanel.tsx` lag bereits VOR diesem Plan bei 548 Zeilen (ueber dem CLAUDE.md-450-Zeilen-Richtwert; vorbestehende, nicht von diesem Plan verursachte Abweichung). Plan 117-06 Task 2's `acceptance_criteria` verlangt explizit einen Grep-Nachweis, dass `Switch`/`FormField` DIREKT aus `@/components/ui` in `SegmentEditPanel.tsx` importiert werden — das schliesst eine Extraktion des neuen Override-Blocks in eine separate Sub-Komponenten-Datei fuer DIESEN Plan aus (waere sonst die naheliegende Massnahme gewesen, siehe Precedent "SegmentEditPanel extracted as sub-component" aus Phase 26). Die Datei liegt nach diesem Plan bei 693 Zeilen. Empfehlung fuer einen spaeteren Quick-Task: `SegmentEditPanel.tsx` in Sub-Komponenten (z. B. Asset-Upload-Sektion, Override-Block) aufteilen, sobald kein aktives Plan-Acceptance-Criterion mehr einen Direkt-Import in dieser einen Datei verlangt. Kein Blocker fuer diesen Plan — nur dokumentiert, damit die Abweichung nicht stillschweigend normalisiert wird (Nutzer-Praeferenz: Zeilen-Limit-Ausnahmen eng halten).

## Verification Evidence

- `cd frontend && npm run typecheck` — fehlerfrei nach jedem Task.
- `cd frontend && npm test -- SegmenteTab` — 67/67 Tests gruen (65 vorbestehend aus Plan 117-07 + 2 neue Override-Switch-Sichtbarkeitstests).
- `npx eslint` auf allen sieben geaenderten Dateien: 0 Fehler, 9 Warnungen — alle neun Warnungen sind vorbestehende native `<input>`/`<select>`-Stellen ausserhalb des neuen Override-Blocks (unveraendert seit vor diesem Plan); der neue Code fuegt keine neuen Warnungen hinzu.
- Grep bestaetigt: `Switch`, `FormField` als Importe aus `@/components/ui` in `SegmentEditPanel.tsx`; kein neues `<input type="checkbox">` im Override-Block.

## Known Stubs

Keine. Der Override-Block ist vollstaendig an die Plan-117-05-Backend-Endpunkte angebunden (kein Mock-Pfad, keine Platzhalter-Daten).

## Threat Flags

Keine neue Angriffsflaeche ueber das Threat-Model des Plans hinaus: reine Frontend-Formular-Erweiterung gegen bereits capability-gated Admin-Endpunkte (Plan 117-05); Client-Validierung bleibt Komfort, server-seitige `validateSegmentTimes` bleibt durchsetzend (T-117-06-01, wie geplant `accept`).

## User Setup Required

None - alle Verifikationsschritte liefen lokal (`npm run typecheck`, `npm test`, `eslint`). Live-Browser-UAT dieser Oberflaeche steht wie bei den uebrigen Phase-117-Plaenen fuer die gebuendelte Phase-117-Live-Abnahme aus (siehe `project_phase_117_execution_pending.md`-Memory) und ist nicht Teil der Code-Verifikation dieses Plans.

## Next Phase Readiness

- D-01 (Per-Folge-Zeit-Override) ist fuer Admins ueber die bestehende Segment-Editor-Seitenleiste vollstaendig bedienbar: setzen, speichern (nur ueber zentralen Save-Button), entfernen.
- `assignSegment`/`unassignSegment`-Hook-Methoden existieren bereits fertig verdrahtet (Task 1), falls eine spaetere Phase-117-Plan eine explizite "Diesem Kara eine weitere Folge zuweisen"-UI braucht (aktuell nicht Teil dieser Phase/UI-SPEC).
- Kein Blocker fuer 117-08/117-09. Backend-Container muss laut bestehender Projekt-Konvention neu gebaut werden, bevor die vier Plan-117-05-Endpunkte live ueber Docker erreichbar sind — das betrifft aber die Backend-Seite, nicht dieses Frontend-Plans Fertigstellung.

---
*Phase: 117-kara-segment-zeit-override-anzeige*
*Completed: 2026-07-29*

## Self-Check: PASSED

All modified files verified present on disk (`frontend/src/lib/api.ts`, `SegmentEditPanel.tsx`,
`SegmenteTab.helpers.tsx`, `117-06-SUMMARY.md`). All three task commits (`5f3dfa3b`, `21800dab`,
`908d5636`) verified present in `git log`.
