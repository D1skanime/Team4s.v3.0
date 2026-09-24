---
phase: quick-260924-ksv
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/admin/anime/[id]/episodes/import/page.tsx
  - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.tsx
  - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.test.tsx
  - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx
  - frontend/src/app/admin/anime/[id]/episodes/import/page.module.css
  - .planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md
autonomous: true
requirements: [GAP-13]

must_haves:
  truths:
    - "Bei einer Episode mit genau einer Datei erscheinen Dateiname und Ordnerpfad rechts neben dem Titelfeld in der Episoden-Headerzeile, nicht mehr dupliziert in der Datei-Zeile darunter."
    - "Bei einer Episode mit mehreren Dateien bleibt die Headerzeile ohne Dateiname/Pfad, und jede Datei-Zeile zeigt weiterhin ihren eigenen Dateinamen/Pfad wie bisher."
    - "Alle anderen Felder, Hinweise, Chips, Range-Buttons und Aktionen bleiben unveraendert in Reihenfolge und Verhalten."
    - "page.tsx waechst nicht weiter und bleibt unter dem 450-Zeilen-Limit; die Episoden-Block-Logik lebt in einer eigenen Komponentendatei."
  artifacts:
    - path: "frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.tsx"
      provides: "Extrahierte Episode-Block-Komponente mit bedingter Datei-Info in der Headerzeile"
      exports: ["EpisodeGroup"]
    - path: "frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.test.tsx"
      provides: "RTL-Tests fuer Ein-Datei- und Mehr-Dateien-Fall (GAP-13)"
    - path: ".planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md"
      provides: "GAP-13 Eintrag, als resolved markiert"
      contains: "GAP-13"
  key_links:
    - from: "frontend/src/app/admin/anime/[id]/episodes/import/page.tsx"
      to: "frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.tsx"
      via: "import { EpisodeGroup } from './EpisodeImportEpisodeGroup'"
      pattern: "EpisodeImportEpisodeGroup"
    - from: "frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.tsx"
      to: "frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx"
      via: "hideFileInfo prop passed when group.rows.length === 1"
      pattern: "hideFileInfo"
---

<objective>
GAP-13 (167-UAT.md): Im Episoden-Import (`/admin/anime/{id}/episodes/import`) sitzt das Titelfeld
"Titel (DE)" oben links in der Episoden-Headerzeile mit viel Leerraum rechts daneben, waehrend
Dateiname und Ordnerpfad erst in der Datei-Zeile darunter erscheinen. Bei Episoden mit genau
einer Datei soll Dateiname/Pfad stattdessen rechts neben das Titelfeld in dieselbe Headerzeile
wandern (Dateiname fett/klein, Pfad gedaempft darunter), ohne Duplikat in der Datei-Zeile. Bei
mehreren Dateien bleibt alles wie bisher.

Purpose: Weniger Leerraum, bessere Uebersicht pro Episode, ohne die bestehende Mehrdatei-Logik zu
veraendern.
Output: Extrahierte `EpisodeGroup`-Komponente mit bedingter Datei-Info-Spalte, angepasste
`EpisodeImportMappingRowCard` (Duplikat-Unterdrueckung), CSS-Erweiterung, zwei rendernde Tests,
abgeschlossener GAP-13-Eintrag in 167-UAT.md, gruene Tests/Typecheck/Lint im Container, Frontend
neu gestartet.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md

@frontend/src/app/admin/anime/[id]/episodes/import/page.tsx
@frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx
@frontend/src/app/admin/anime/[id]/episodes/import/page.module.css
@frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.test.tsx
@.planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md
</context>

<interfaces>
<!-- Current shape of the relevant pieces, extracted from the codebase so no exploration is needed. -->

From `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx` (lines ~364-560, to be extracted):
The `EpisodeGroupProps` interface takes `group: { episodeNumber, title, existingEpisodeId,
fillerType, fillerNote, coveredEpisodes, lastCoveredEpisodeNumber, rows: EpisodeImportMappingRow[] }`
plus callbacks (`onSetTargets`, `onSetRelease`, `onSetSelectedFansubGroups`,
`onAddSelectedFansubGroup`, `onRemoveSelectedFansubGroup`, `onApplyFansubGroupToEpisode`,
`onApplyFansubGroupFromEpisode`, `onSetEpisodeTitle`, `onSkip`, `onApplyRow`, `applyingRowId`,
`onConfirmEpisode`, `onSkipEpisode`) and `hasVisualGap: boolean`. The `EpisodeGroup` function
renders `.episodeGroupHeader` (containing `.episodeGroupMeta` with `#N`, `.episodeTitleBlock` ->
`.episodeTitleEditor` with the `Titel (DE)`-labelled `<textarea className={styles.episodeTitleInput}>`,
badges, covered-episode list; plus `.episodeGroupActions` with "Alle bestaetigen"/"Alle
ueberspringen" buttons) followed by `.mappingList` mapping `group.rows` to
`<EpisodeImportMappingRowCard key={jellyfinSourceKey(row)} episodeNumber={...} row={row} ... />`.
`fillerLabel` is imported from `./episodeImportMapping`. `page.tsx` imports `EpisodeGroup` is used
at line ~252 inside `builder.episodeGroups.map(...)`, and the unmapped-rows block (line ~278-318)
independently renders a bare `.episodeGroup` div with its own header and `.mappingList` -- that
block stays in `page.tsx` and is NOT touched (it has no title field, only "Ohne Episodenzuordnung").

From `EpisodeImportMappingRow.tsx`:
```
interface EpisodeImportMappingRowCardProps {
  episodeNumber: number
  row: EpisodeImportMappingRow
  onSetTargets: (sourceKey: string, rawTargets: string) => void
  onSetRelease: (sourceKey: string, meta: { fansubGroupName?: string; releaseVersion?: string }) => void
  onSetSelectedFansubGroups: (sourceKey: string, fansubGroups: EpisodeImportSelectedFansubGroup[]) => void
  onAddSelectedFansubGroup: (sourceKey: string, fansubGroup: EpisodeImportSelectedFansubGroup) => void
  onRemoveSelectedFansubGroup: (sourceKey: string, fansubGroup: EpisodeImportSelectedFansubGroup) => void
  onApplyFansubGroupToEpisode: (episodeNumber: number, fansubGroups: EpisodeImportSelectedFansubGroup[]) => void
  onApplyFansubGroupFromEpisode: (episodeNumber: number, fansubGroups: EpisodeImportSelectedFansubGroup[]) => void
  onSkip: (sourceKey: string) => void
  onApplyRow?: (sourceKey: string) => void
  isApplyingRow?: boolean
}
```
Body currently always renders, inside `.mappingRowInfo`:
`<strong className={styles.fileName}>{label}</strong>` then
`{row.display_path ? <span className={styles.displayPath}>{row.display_path}</span> : null}`
followed by the multi-episode hint and `suggestion_reason` hint (both must stay, regardless of
the new prop).

Relevant CSS anchors in `page.module.css`: `.episodeGroupMeta` (flex row, `align-items:
flex-start`), `.episodeTitleBlock` (flex column, `flex: 1 1 100%`), `.episodeTitleEditor` (flex
column, `width: min(100%, 820px)`), `.fileName` / `.displayPath` (existing filename/path text
styles used in `.mappingRowInfo`), and the `@media (max-width: 640px)` block that already stacks
`.episodeGroupMeta` to column and widens `.episodeTitleEditor` to 100%.

`EpisodeImportMappingRow.test.tsx` shows the `makeRow(overrides)` fixture pattern and the
`renderRow({ row, ... })` helper wrapping `EpisodeImportMappingRowCard`, plus the `@/lib/api`
mock (`getFansubList`) needed because the group-field child performs a debounced search on
user input (not on mount, so mocking with `vi.fn()` returning a resolved empty list is enough
safety).
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Extract EpisodeGroup into its own component and add the conditional single-file header info (GAP-13)</name>
  <files>frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.tsx, frontend/src/app/admin/anime/[id]/episodes/import/page.tsx, frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx, frontend/src/app/admin/anime/[id]/episodes/import/page.module.css</files>
  <behavior>
    - When `group.rows.length === 1`: the extracted `EpisodeGroup` component renders the single
      row's filename (`row.file_name || row.media_item_id`) and, if present, `row.display_path`
      inside the header row (right of the title editor), and passes `hideFileInfo={true}` to the
      single `EpisodeImportMappingRowCard`, which then must NOT render its own
      `.fileName`/`.displayPath` nodes for that row (other hints stay).
    - When `group.rows.length !== 1` (0, 2, or more): no filename/path appears in the header; each
      row renders with `hideFileInfo` false/undefined and shows its own filename/path exactly as
      before.
  </behavior>
  <action>
    Move the `EpisodeGroupProps` interface and `EpisodeGroup` function (currently inline in
    `page.tsx`, roughly lines 364-560) into a new file `EpisodeImportEpisodeGroup.tsx`. Add `'use
    client'` at the top (matches sibling files `EpisodeImportMappingRow.tsx` and
    `EpisodeImportMappingRowGroupField.tsx`). Bring along the needed imports: `Button` is not used
    here (the "Alle bestaetigen"/"Alle ueberspringen" controls use plain
    `className={styles.microButton}` buttons already, per the read source -- keep them exactly as
    they are, do not swap to a UI primitive since that is unrelated to GAP-13 and out of scope),
    `jellyfinSourceKey` from `@/lib/jellyfinSourceIdentity`, `fillerLabel` from
    `./episodeImportMapping`, `EpisodeImportMappingRowCard` from `./EpisodeImportMappingRow`, the
    `EpisodeImportMappingRow`/`EpisodeImportSelectedFansubGroup` types from
    `@/types/episodeImport`, and `styles` from `./page.module.css`. Export `EpisodeGroup` (named
    export, matching the existing sibling-file convention of named exports for extracted pieces).

    Inside the moved component, compute `const singleFileRow = group.rows.length === 1 ?
    group.rows[0] : null` right before the return. Restructure the header markup: wrap the
    existing `.episodeTitleEditor` `<label>` and a new sibling element in a new
    `<div className={styles.episodeTitleRow}>` container placed as the first child of
    `.episodeTitleBlock` (badges and covered-episode list stay below it, unchanged). When
    `singleFileRow` is set, render as the second child of `.episodeTitleRow`:
    `<div className={styles.episodeSingleFileInfo}><strong
    className={styles.episodeSingleFileInfoName}>{singleFileRow.file_name ||
    singleFileRow.media_item_id}</strong>{singleFileRow.display_path ? <span
    className={styles.episodeSingleFileInfoPath}>{singleFileRow.display_path}</span> :
    null}</div>`. When `group.rows.length !== 1`, render nothing there (no extra DOM node). Pass
    `hideFileInfo={group.rows.length === 1}` as a new prop on every
    `<EpisodeImportMappingRowCard .../>` call in this file's `.mappingList` map (there is exactly
    one such call site here; the separate "Ohne Episodenzuordnung" block that stays in `page.tsx`
    is untouched and must NOT receive this prop change).

    In `page.tsx`: delete the moved interface/function, add `import { EpisodeGroup } from
    './EpisodeImportEpisodeGroup'`, remove now-unused imports if `fillerLabel` or
    `EpisodeImportMappingRowCard`/`jellyfinSourceKey` become unused at the top level (check: the
    "Ohne Episodenzuordnung" block still uses `EpisodeImportMappingRowCard` and
    `jellyfinSourceKey`, so keep those; `fillerLabel` becomes unused in `page.tsx` and its import
    must be removed to avoid an unused-import lint/type error). Verify with `wc -l` that
    `page.tsx` did not grow (it must shrink, since ~195 lines move out).

    In `EpisodeImportMappingRow.tsx`: add `hideFileInfo?: boolean` to
    `EpisodeImportMappingRowCardProps` and destructure it (default falsy when omitted, so the
    unrelated "Ohne Episodenzuordnung" call sites in `page.tsx` that don't pass it keep today's
    behavior unchanged). In the `.mappingRowInfo` block, wrap the existing
    `<strong className={styles.fileName}>{label}</strong>` and the `display_path` span in a
    `{!hideFileInfo ? (...) : null}` guard; the `multiEpisodeHint`/`suggestion_reason` spans stay
    unconditional, exactly as today.

    In `page.module.css`, add (near the existing `.episodeTitleBlock`/`.episodeTitleEditor`
    rules): `.episodeTitleRow` (flex, `align-items: flex-start`, `gap: 16px`, `flex-wrap: wrap`,
    `min-width: 0`) as the new wrapper; give `.episodeTitleEditor` `flex: 1 1 320px` scoped to
    this context (either by nesting the rule under `.episodeTitleRow .episodeTitleEditor` or by
    adding `flex: 1 1 320px` to the existing `.episodeTitleEditor` rule directly -- either is
    acceptable, pick whichever keeps the rule count lower); add `.episodeSingleFileInfo` (flex
    column, `align-items: flex-end`, `text-align: right`, `gap: 2px`, `min-width: 0`, `max-width:
    100%`, `flex: 0 1 auto`); add `.episodeSingleFileInfoName` (reuse the same visual weight as
    the existing `.fileName` rule: `font-size: 13px`, `font-weight: 700`, `color: #17130f`,
    `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`, `max-width: 100%`); add
    `.episodeSingleFileInfoPath` (reuse the same visual weight as `.displayPath`: `font-size:
    11px`, `color: #9b8e82`, `font-family: ui-monospace, monospace`, `overflow: hidden`,
    `text-overflow: ellipsis`, `white-space: nowrap`, `max-width: 100%`). In the existing `@media
    (max-width: 640px)` block, add `.episodeTitleRow { flex-direction: column; align-items:
    stretch; }` and `.episodeSingleFileInfo { align-items: flex-start; text-align: left; }` so the
    filename/path drop back below the title on narrow screens instead of squeezing sideways (the
    `flex-wrap: wrap` on `.episodeTitleRow` already provides a natural reflow above that
    breakpoint too).

    All new/changed JSX text in this task is limited to reusing already-existing data
    (`file_name`, `display_path`) -- no new German prose strings are introduced, so the
    Umlaute-Pflicht has no new surface here; do not touch the pre-existing "Alle ueberspringen"
    label (ASCII substitution bug) since it is unrelated to GAP-13 and out of this task's scope.
  </action>
  <verify>
    <automated>docker compose exec team4sv30-frontend npx tsc --noEmit</automated>
  </verify>
  <done>EpisodeImportEpisodeGroup.tsx exists exporting EpisodeGroup; page.tsx no longer defines
  EpisodeGroup inline and is shorter than before; EpisodeImportMappingRowCard accepts
  hideFileInfo and suppresses fileName/displayPath only when true; page.module.css has the four
  new classes plus the 640px stacking rules; typecheck passes with zero errors.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add rendering tests proving the single-file header move and the multi-file no-op (GAP-13)</name>
  <files>frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.test.tsx</files>
  <behavior>
    - Test 1 ("single file: header shows filename/path, row does not repeat them"): build a
      `group` fixture with exactly one row (reuse the `makeRow`-style fixture shape from
      `EpisodeImportMappingRow.test.tsx`: `file_name: 'GhostFile.S01E01-ShiroiFansub.mkv'`,
      `display_path: 'Anime.TV.Sub/GhostFile'`). Render `<EpisodeGroup group={...} .../>` with all
      required callback props stubbed via `vi.fn()`. Assert
      `screen.getAllByText('GhostFile.S01E01-ShiroiFansub.mkv')` has length 1 (proves no
      duplicate) and that this single match sits inside an element carrying
      `episodeSingleFileInfoName` in its class (via `closest('[class*="episodeSingleFileInfoName"]')`
      not null), and assert `screen.getByText('Anime.TV.Sub/GhostFile')` exists exactly once.
    - Test 2 ("two files: header stays clean, each row keeps its own filename/path"): build a
      `group` fixture with two rows using two distinct `file_name`/`display_path` pairs (e.g.
      `'GhostFile.S01E01-ShiroiFansub.mkv'` / `'Anime.TV.Sub/GhostFile'` and
      `'GhostFile.S01E01-OtherGroup.mkv'` / `'Anime.TV.Sub2/GhostFile'`). Render the same way.
      Assert `container.querySelector('[class*="episodeSingleFileInfo"]')` is null (no header file
      info block at all), and assert both filenames and both paths each appear exactly once via
      `screen.getAllByText(...)` with length 1 for each of the four strings.
  </behavior>
  <action>
    Create `EpisodeImportEpisodeGroup.test.tsx` colocated with the new component, mirroring the
    `@vitest-environment jsdom` header, `render`/`screen` imports from
    `@testing-library/react`, and the `vi.mock('@/lib/api', () => ({ getFansubList: vi.fn() }))`
    plus `mockedGetFansubList.mockResolvedValue({ data: [], meta: { page: 1, per_page: 10, total:
    0, total_pages: 0 } })` setup pattern already used in `EpisodeImportMappingRow.test.tsx` (the
    group field inside each row performs the same debounced lookup and needs the same safety
    mock). Build a small local `makeGroup(overrides)` fixture helper returning the
    `EpisodeGroupProps['group']` shape (`episodeNumber: 1, title: null, existingEpisodeId: null,
    fillerType: null, fillerNote: null, coveredEpisodes: [], lastCoveredEpisodeNumber: 1, rows:
    [...]`), and reuse row fixtures shaped like `EpisodeImportMappingRow.test.tsx`'s `makeRow`
    (status `'suggested'`, unique `media_item_id`/`media_source_id` per row so React keys and
    `jellyfinSourceKey` differ between the two rows in Test 2). Render via `<EpisodeGroup
    group={makeGroup(...)} hasVisualGap={false} onSetTargets={vi.fn()} onSetRelease={vi.fn()}
    onSetSelectedFansubGroups={vi.fn()} onAddSelectedFansubGroup={vi.fn()}
    onRemoveSelectedFansubGroup={vi.fn()} onApplyFansubGroupToEpisode={vi.fn()}
    onApplyFansubGroupFromEpisode={vi.fn()} onSetEpisodeTitle={vi.fn()} onSkip={vi.fn()}
    onApplyRow={vi.fn()} applyingRowId={null} onConfirmEpisode={vi.fn()} onSkipEpisode={vi.fn()}
    />`. Implement both behaviors exactly as specified above; each must actually render the
    component and assert on rendered DOM text/classes per the Teststil rule in CLAUDE.md -- no
    source-file string checks.
  </action>
  <verify>
    <automated>docker compose exec team4sv30-frontend npx vitest run EpisodeImportEpisodeGroup.test.tsx</automated>
  </verify>
  <done>Both tests pass; Test 1 proves zero duplication for the single-file case and the header
  file-info block renders; Test 2 proves the header stays free of filename/path with two files and
  each row keeps showing its own filename/path.</done>
</task>

<task type="auto">
  <name>Task 3: Document GAP-13 in 167-UAT.md as resolved, then verify and restart the frontend container</name>
  <files>.planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md</files>
  <action>
    Append a new gap entry to the `## Gaps` list in
    `.planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md`, directly after the
    existing GAP-12 entry (end of file), following the exact same YAML-list-item structure and
    field order used by GAP-11/GAP-12 (`truth`, `status`, `reason`, `severity`, `root_cause`,
    `artifacts`, `missing`, `resolution`) -- read those two entries first to match indentation and
    line-wrap style exactly. Content: `truth` states GAP-13 verbatim in German using correct
    Umlaute: episode header row shows the title field with a lot of empty space to the right while
    filename/folder path only appear in the per-file row below; the desired behavior is that for
    an episode with exactly one file, filename (bold/small) and folder path (muted, underneath)
    move into the header row to the right of the title, without being duplicated in the per-file
    row below, while episodes with multiple files keep today's behavior unchanged in both the
    header and every per-file row. Set `status: resolved`, `reason` referencing this as a direct
    admin/developer task (not live-UAT), e.g. "Direkter Auftrag des Auftraggebers, 2026-09-24 --
    kein Live-UAT-Fund", `severity: minor` (cosmetic layout improvement). `root_cause`: the
    episode-block header (`EpisodeGroup`, formerly inline in `page.tsx`) only ever rendered the
    title editor, leaving unused horizontal space, while filename/path lived exclusively in
    `EpisodeImportMappingRowCard`'s `.mappingRowInfo` region regardless of how many files an
    episode had. `artifacts`: list
    `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx` (issue: episode header had no
    file-info slot, and the whole `EpisodeGroup` block lived inline, pushing the file close to the
    450-line cap) and
    `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx` (issue:
    filename/path always rendered unconditionally, so a single-file episode could not avoid
    duplication once the header also showed them). `missing`: "Eine aus `page.tsx` ausgelagerte
    Episode-Block-Komponente mit bedingter Datei-Info in der Headerzeile (nur bei genau einer
    Datei) und eine Unterdrueckungs-Moeglichkeit in der Datei-Zeile fuer genau diesen Fall."
    `resolution`: describe what was actually built in Tasks 1-2 (new
    `EpisodeImportEpisodeGroup.tsx` with the `.episodeTitleRow`/`.episodeSingleFileInfo` markup,
    the `hideFileInfo` prop on `EpisodeImportMappingRowCard`, the new CSS classes and 640px
    stacking rule, and the two RTL tests in `EpisodeImportEpisodeGroup.test.tsx`), end with "Siehe
    .planning/quick/260924-ksv-gap-13-dateiname-und-ordner-rechts-neben/260924-ksv-SUMMARY.md."
    matching the closing-sentence convention of GAP-11/GAP-12.

    Then run, in this order, inside the frontend container: `docker compose exec
    team4sv30-frontend npm test`, `docker compose exec team4sv30-frontend npx tsc --noEmit`,
    `docker compose exec team4sv30-frontend npm run lint`. All three must exit 0 with no new
    errors/warnings attributable to this change (pre-existing unrelated warnings elsewhere in the
    repo are not this task's responsibility to fix). If lint or typecheck surface an issue caused
    by Task 1/2's changes, fix it in the relevant file from Task 1/2 and re-run.

    Once all three pass, restart the frontend container with `docker restart team4sv30-frontend`
    and capture the wall-clock start time of that restart command (e.g. via `date -Iseconds`
    immediately before running it) so it can be reported in the plan's SUMMARY.md. Confirm the
    container is back up with `docker compose ps team4sv30-frontend` showing `Up`.
  </action>
  <verify>
    <automated>docker compose exec team4sv30-frontend npm test && docker compose exec team4sv30-frontend npx tsc --noEmit && docker compose exec team4sv30-frontend npm run lint</automated>
  </verify>
  <done>167-UAT.md contains a GAP-13 entry marked status: resolved with the full
  truth/reason/severity/root_cause/artifacts/missing/resolution fields; npm test, tsc --noEmit,
  and npm run lint all exit 0 inside team4sv30-frontend; team4sv30-frontend has been restarted and
  is reported Up, with the restart start timestamp noted in the summary.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Admin browser -> Next.js client component | Admin-only route behind `PlatformAdminGate`; renders already-fetched preview data (`file_name`, `display_path`) as text, no new user input introduced |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick260924ksv-01 | Information Disclosure | `episodeSingleFileInfoName`/`Path` rendering `file_name`/`display_path` | accept | Same values already rendered unconditionally today in `.mappingRowInfo` for every row; this task only relocates them for the single-file case behind the existing admin-only route, no new data surface |
| T-quick260924ksv-02 | Tampering | None -- no new npm/pip/cargo package installs in this task | accept | Package Legitimacy Gate not applicable; no install tasks |
</threat_model>

<verification>
- `docker compose exec team4sv30-frontend npx tsc --noEmit` passes with zero errors.
- `docker compose exec team4sv30-frontend npx vitest run EpisodeImportEpisodeGroup.test.tsx` passes both new tests.
- `docker compose exec team4sv30-frontend npm test`, `npx tsc --noEmit`, and `npm run lint` all exit 0.
- `wc -l` on `page.tsx`, `EpisodeImportEpisodeGroup.tsx`, `EpisodeImportMappingRow.tsx`, and `page.module.css` each stay at or below 450 lines.
- `.planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md` contains a `GAP-13` entry with `status: resolved`.
- `docker compose ps team4sv30-frontend` shows `Up` after the restart.
</verification>

<success_criteria>
- Episodes with exactly one file show filename (bold/small) and folder path (muted, underneath) to the right of the title in the header row, with no duplicate rendering in the per-file row below.
- Episodes with two or more files show no filename/path in the header; every per-file row keeps showing its own filename/path exactly as before.
- No other field, hint, chip, range button, or action changed order or behavior.
- No production file exceeds 450 lines; `page.tsx` did not grow.
- All user-facing German text added by this change uses correct Umlaute (none of the reused strings are new prose, so no new surface risk).
- Only `@/components/ui` primitives and existing global classes are used; no new handcrafted native form controls were introduced.
- Tests/typecheck/lint pass inside `team4sv30-frontend`, and the container was restarted with the start time recorded in the summary.
- Work stayed on `main`; no `git stash` was used; nothing was pushed.
</success_criteria>

<output>
Create `.planning/quick/260924-ksv-gap-13-dateiname-und-ordner-rechts-neben/260924-ksv-SUMMARY.md` when done
</output>
