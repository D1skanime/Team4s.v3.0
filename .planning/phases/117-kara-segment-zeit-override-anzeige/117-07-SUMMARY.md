---
phase: 117-kara-segment-zeit-override-anzeige
plan: 07
subsystem: ui
tags: [react, nextjs, admin, segments, badges, disclosure, ui-primitives, tdd]

# Dependency graph
requires:
  - phase: 117-03
    provides: "ListAnimeSegments hydration: AssignedReleaseVersionIDs/IsShared/HasEpisodeOverride/AssignedEpisodes (real episode numbers per assignment, B3-fix)"
provides:
  - "SegmenteTab.tsx Admin-Tabellenzeile zeigt Badge('Geteiltes Segment')/Badge('Zeit hier überschrieben') für geteilte Kara-Segmente"
  - "DisclosureIndicator-gesteuerte Zuweisungsliste (Badge-Chips) mit den ECHTEN Episodennummern je Zuweisung (B3-Fix)"
  - "isCurrentEpisodeAssigned/findAssignedEpisodeNumber/formatAssignmentChipLabel als reine, exportierte Helfer in SegmenteTab.helpers.tsx"
  - "AdminThemeSegment (frontend/src/types/admin.ts) um assigned_release_version_ids/is_shared/has_episode_override/assigned_episodes erweitert (Backend-Spiegel aus Plan 117-03 Task 2, vorgezogen aus Plan 117-06 wegen umgekehrter Ausführungsreihenfolge)"
affects: [117-06, 117-08, 117-09]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Fragment-basiertes Zwei-Zeilen-Tabellenmuster (Hauptzeile + optionale Unterzeile mit colSpan) für DisclosureIndicator-gesteuerte Detailansichten innerhalb einer Table/TableBody-Struktur", "Chip-Variant-Auswahl: aktuelle Release-Version -> info, sonst warning/neutral je nach segmentweitem has_episode_override (dokumentierte Näherung, kein Pro-Zuweisung-Override-Feld vorhanden)"]

key-files:
  created: []
  modified:
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx"
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx"
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx"
    - "frontend/src/types/admin.ts"

key-decisions:
  - "AdminThemeSegment-Typerweiterung (assigned_release_version_ids/is_shared/has_episode_override/assigned_episodes) wurde in DIESEM Plan (117-07) statt in Plan 117-06 vorgenommen, weil 117-06 laut Frontmatter depends_on: [\"117-05\", \"117-07\"] ist -- 117-07 läuft also vor 117-06 und hätte ohne diesen Typ-Vorgriff nicht kompilieren können (Rule 3 -- Blocking Issue). Wenn 117-06 später denselben Type-Block erneut hinzufügen will, ist das ein No-Op/Merge ohne Konflikt, da identische Feldnamen/Typen verwendet wurden (Backend-Spiegel aus 117-03 Task 2)."
  - "Chip-Variant für nicht-aktuelle Zuweisungen nutzt segment.has_episode_override (segmentweit) statt eines Pro-Zuweisung-Override-Felds, da Letzteres im aktuellen AdminThemeSegment-Modell nicht existiert -- exakt wie im Plan-Text als bewusste, dokumentierte Näherung vorgegeben."

patterns-established:
  - "Badge/DisclosureIndicator-Kombination für 'geteilt + Detailliste'-UI-Muster: Badges signalisieren Zustand direkt in der Zeile, DisclosureIndicator+Unterzeile hält die Liste standardmäßig eingeklappt (kein visuelles Rauschen im Normalfall)."

requirements-completed: [D-02, D-03]

# Metrics
duration: ~25min
completed: 2026-07-29
---

# Phase 117 Plan 07: Admin-Sichtbarkeit für geteilte Kara-Segmente (Badges + Zuweisungsliste) Summary

**Admin-Segmenttabelle zeigt geteilte Kara-Segmente jetzt mit `Badge`-Indikatoren ("Geteiltes Segment"/"Zeit hier überschrieben") und einer über `DisclosureIndicator` einsehbaren Zuweisungsliste mit den ECHTEN Episodennummern statt der internen `release_version_id` (B3-Fix).**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2/2 completed
- **Files modified:** 4 (0 neu, 4 bestehend)

## Accomplishments

- Drei neue, reine Helper-Funktionen in `SegmenteTab.helpers.tsx`: `isCurrentEpisodeAssigned`, `findAssignedEpisodeNumber` (reiner Lookup der echten Episodennummer, `null` bei fehlendem Treffer), `formatAssignmentChipLabel` (nimmt zwingend eine Episodennummer als `string` entgegen, keine `release_version_id` — B3-Regression per Grep/Test bewiesen).
- Admin-Segmenttabelle (`SegmenteTab.tsx`) rendert für ein Segment mit `is_shared: true` einen `Badge variant="info"` ("Geteiltes Segment") direkt vor dem bestehenden Episoden-Bereichstext; bei zusätzlich `has_episode_override: true` einen weiteren `Badge variant="warning"` ("Zeit hier überschrieben") — der Standardfall (nicht geteiltes Segment) bleibt visuell exakt unverändert (kein Rauschen).
- Ein `DisclosureIndicator` (`variant="button"`, `size="sm"`, in einen `<button aria-label="Zugewiesene Folgen anzeigen/ausblenden">` gewrappt) öffnet eine Unterzeile (`TableRow`/`TableCell colSpan={6}`) mit einem `Badge`-Chip je zugewiesener Release-Version; Chip-Text kommt aus `formatAssignmentChipLabel(findAssignedEpisodeNumber(...))` — zeigt live bewiesen "Folge 3 · Zeit angepasst" statt einer internen ID wie "Folge 481".
- Die aktuell im Editor geöffnete Release-Version wird per `variant="info"` hervorgehoben, alle übrigen Chips nutzen `warning`/`neutral` je nach segmentweitem `has_episode_override` (dokumentierte Näherung, siehe Decisions).
- `AdminThemeSegment` (`frontend/src/types/admin.ts`) um die vier Backend-gespiegelten Felder erweitert, da Plan 117-06 (ursprünglicher Ort dieser Typerweiterung) laut eigenem `depends_on` erst NACH diesem Plan läuft.

## Task Commits

Jeder Task folgte dem vollständigen RED→GREEN-TDD-Zyklus, entsprechend zwei Commit-Paare:

1. **Task 1 RED: Failing Tests für Zuweisungs-/Chip-Helfer** - `fa9e4348` (test)
2. **Task 1 GREEN: Helper-Implementierung (B3-Fix)** - `fff15ac7` (feat)
3. **Task 2 RED: Failing Tests für Badges/Disclosure in der Tabelle** - `053c2f69` (test)
4. **Task 2 GREEN: Badges + Zuweisungslisten-Disclosure implementiert** - `b9d1bf1e` (feat)

## Files Created/Modified

- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx` - drei neue Helfer (`isCurrentEpisodeAssigned`, `findAssignedEpisodeNumber`, `formatAssignmentChipLabel`)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx` - Badge/DisclosureIndicator-Import, `openAssignmentsFor`-State, Badges + Unterzeile mit Zuweisungs-Chips in der Segment-Tabellenzeile
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx` - 10 neue Unit-Tests für die drei Helfer + 2 neue Komponententests (geteiltes Segment mit Override, nicht-geteiltes Segment ohne Badges)
- `frontend/src/types/admin.ts` - `AdminThemeSegment` um `assigned_release_version_ids`/`is_shared`/`has_episode_override`/`assigned_episodes` erweitert

## Decisions Made

Siehe `key-decisions` im Frontmatter. Zusammengefasst: Die Typerweiterung, die laut Plan-Text eigentlich "aus Plan 117-06 Task 1" kommen sollte, musste vorgezogen werden, weil 117-06 tatsächlich von 117-07 abhängt (nicht umgekehrt) — ohne diese Felder hätte `npm run typecheck` in diesem Plan nicht bestehen können.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] `AdminThemeSegment`-Typfelder fehlten, da Plan 117-06 (ursprünglicher Ort der Typerweiterung) erst nach diesem Plan ausgeführt wird**
- **Found during:** Task 1 (Vorbereitung der Helper-Implementierung, Analyse der Interfaces-Sektion)
- **Issue:** Plan 117-07 `<interfaces>` verweist auf `AssignedReleaseVersionIDs`/`IsShared`/`HasEpisodeOverride`/`AssignedEpisodes` als "Frontend-Typ-Spiegel aus Plan 117-06 Task 1". Plan 117-06 hat aber `depends_on: ["117-05", "117-07"]` — läuft also NACH 117-07. Ohne die Felder in `AdminThemeSegment` hätte weder `npm run typecheck` noch die neuen Helper-Funktionen (die auf `segment.assigned_release_version_ids`/`segment.assigned_episodes` zugreifen) kompiliert.
- **Fix:** `assigned_release_version_ids?: number[]`, `is_shared?: boolean`, `has_episode_override?: boolean`, `assigned_episodes?: { release_version_id: number; episode_number: string }[]` direkt zu `AdminThemeSegment` in `frontend/src/types/admin.ts` hinzugefügt — identische Feldnamen/Typen wie im Backend-Modell (Plan 117-03 Task 2) und wie in Plan 117-06 Task 1 vorgegeben, sodass ein späterer Lauf von Plan 117-06 keinen Konflikt erzeugt.
- **Files modified:** `frontend/src/types/admin.ts`
- **Verification:** `npm run typecheck` fehlerfrei, alle 65 Tests grün.
- **Committed in:** `fa9e4348` (RED-Commit, da die Typerweiterung Voraussetzung für die neuen Testfälle war)

**2. [Rule 1 - Bug] Falsch kodierter Umlaut beim ersten Schreiben des "Zeit hier überschrieben"-Badge-Texts**
- **Found during:** Task 2 (erste GREEN-Testausführung)
- **Issue:** Ein Editor-Tool-Zwischenschritt schrieb den JSX-Text als wörtliches `überschrieben` (Backslash-u-Sequenz als Klartext, kein tatsächlicher ü-Codepoint) statt des Zeichens „ü", wodurch der Test `getByText('Zeit hier überschrieben')` fehlschlug (DOM enthielt „Zeit hier überschrieben").
- **Fix:** Zeile erneut mit dem korrekten UTF-8-Zeichen „ü" geschrieben und per Byte-Inspektion (`xxd`) verifiziert, dass die Datei jetzt die tatsächliche Unicode-Sequenz (0xC3 0xBC) statt der literalen Escape-Zeichenkette enthält.
- **Files modified:** `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx`
- **Verification:** `npm test -- SegmenteTab` grün (65/65), `grep -n 'berschrieben'` zeigt das korrekte Zeichen.
- **Committed in:** `b9d1bf1e`

---

**Total deviations:** 2 auto-fixed (1 Rule 3 Blocking-Fix für vorgezogene Typerweiterung, 1 Rule 1 Encoding-Bug-Fix)
**Impact on plan:** Beide Fixes waren notwendig, damit Typecheck/Tests wie von der Plan-Verifikation gefordert tatsächlich grün sind. Kein Scope-Creep — die Typerweiterung übernimmt exakt die in Plan 117-06 bereits spezifizierten Feldnamen/Typen.

## Issues Encountered

Keine blockierenden Probleme außerhalb der oben dokumentierten Deviations. Ein verwaistes `.git/index.lock` (kein laufender Git-Prozess, ~8 Minuten alt) musste vor dem ersten Commit entfernt werden — konsistent mit der bekannten Eigenschaft dieses Repos, dass mehrere GSD-Läufe denselben Working Tree teilen können.

## Verification Evidence

- `cd frontend && npm run typecheck` — fehlerfrei nach jedem Task.
- `cd frontend && npm test -- SegmenteTab` — 65/65 Tests grün nach Task 2 (inkl. 10 neuer Helper-Unit-Tests + 2 neuer Komponententests + aller 53 vorbestehenden Tests unverändert grün).
- B3-Regression explizit bewiesen: Testfall prüft `screen.queryByText('Folge 481')`/`screen.queryByText('Folge 482')` sind `null`, während `screen.findByText('Folge 3 · Zeit angepasst')`/`getByText('Folge 7 · Zeit angepasst')` die echten Episodennummern zeigen.
- Grep bestätigt `Badge`/`DisclosureIndicator` als Importe aus `@/components/ui` in `SegmenteTab.tsx`; keine neuen nativen `<select>/<input>/<textarea>` eingeführt; einziger neuer `<button>` wrappt den `DisclosureIndicator` (kein eingebauter Click-Handler, plankonform) und trägt `aria-label="Zugewiesene Folgen anzeigen/ausblenden"`.

## Known Stubs

Keine. Die Zuweisungsliste rendert ausschließlich aus bereits durch Plan 117-03 gelieferten, echten Backend-Daten (`assigned_release_version_ids`/`assigned_episodes`) — kein Platzhalter, kein Mock-Pfad im Produktionscode.

## Threat Flags

Keine neue Angriffsfläche: reine Lese-/Darstellungserweiterung auf bereits geladenen Segment-Daten, kein neuer Netzwerk-Aufruf, keine neue npm-Abhängigkeit (siehe Plan-Threat-Model T-117-07-SC).

## User Setup Required

None - alle Verifikationsschritte liefen lokal (`npm run typecheck`, `npm test`).

## Next Phase Readiness

- Plan 117-06 kann direkt fortfahren: die von ihm ursprünglich geplante `AdminThemeSegment`-Typerweiterung existiert bereits (identische Feldnamen/Typen), sodass Task 1 dieses Plans beim Ausführen effektiv ein No-Op auf den Typ-Teil ist und sich auf die API-Client-Funktionen/Hook-Methoden konzentrieren kann.
- Die für Plan 117-06 Task 3 relevante `SegmenteTab.tsx`-Aufrufstelle von `<SegmentEditPanel>` ist durch diesen Plan nicht verändert worden — keine Kollision zu erwarten.
- Kein Blocker für andere Pläne dieser Phase. Live-UAT dieser Oberfläche (Badges/Disclosure im echten Browser) ist noch ausstehend und sollte gemäß Projekt-Konvention gebündelt mit der übrigen Phase-117-Live-Abnahme erfolgen.

---
*Phase: 117-kara-segment-zeit-override-anzeige*
*Completed: 2026-07-29*
