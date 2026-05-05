---
task_id: 260423mnv
type: execute
autonomous: true
files_modified:
  - frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts
  - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx
  - frontend/src/app/admin/anime/[id]/episodes/import/page.tsx

must_haves:
  truths:
    - "Confirmed rows show a disabled 'Ubernehmen' button while a per-row apply is in progress"
    - "Clicking 'Ubernehmen' on a confirmed row sends exactly that one row to the backend apply endpoint"
    - "After a successful per-row apply, the row disappears from the mapping list"
    - "The global 'Mapping anwenden' button is unaffected and still applies all confirmed rows at once"
  artifacts:
    - path: "frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts"
      provides: "applyRow(mediaItemId) function + applyingRowId state"
      exports: ["applyRow", "applyingRowId"]
    - path: "frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx"
      provides: "Per-row Ubernehmen button (visible only when status === confirmed)"
    - path: "frontend/src/app/admin/anime/[id]/episodes/import/page.tsx"
      provides: "applyRow + applyingRowId prop threading to EpisodeImportMappingRowCard"
  key_links:
    - from: "EpisodeImportMappingRowCard (onApplyRow prop)"
      to: "useEpisodeImportBuilder.applyRow"
      via: "prop drilling through EpisodeGroup and page.tsx"
    - from: "applyRow"
      to: "applyEpisodeImport API call"
      via: "buildEpisodeImportApplyInput with single-row mappings slice"
---

<objective>
Add a per-row "Ubernehmen" button to each confirmed mapping row. Clicking it applies only that single row to the backend, then removes it from the local mappings state. The global apply button remains unchanged.

Purpose: Lets admins incrementally commit individual rows without having to confirm every single row first.
Output: Modified useEpisodeImportBuilder.ts, EpisodeImportMappingRow.tsx, page.tsx.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts
@frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx
@frontend/src/app/admin/anime/[id]/episodes/import/page.tsx
@frontend/src/types/episodeImport.ts

<interfaces>
<!-- Key types and hook surface the executor needs. -->

From useEpisodeImportBuilder.ts — relevant existing state + helpers:
```typescript
// Existing state
const [animeID, ...] // number | null
const [mappings, setMappings] = useState<EpisodeImportMappingRow[]>([])
const [preview, ...] = useState<EpisodeImportPreviewResult | null>(null)
const [authToken] = useState(() => getRuntimeAuthToken())

// Existing apply helper (reuse for per-row apply)
export function buildEpisodeImportApplyInput(
  animeID: number,
  preview: EpisodeImportPreviewResult,
  mappings: EpisodeImportMappingRow[],
): EpisodeImportApplyInput

// API call used by applyMappings — reuse for applyRow
import { applyEpisodeImport } from '@/lib/api'
```

From EpisodeImportMappingRow.tsx — props interface to extend:
```typescript
interface EpisodeImportMappingRowCardProps {
  // ... existing props ...
  onSkip: (mediaItemID: string) => void
  // ADD:
  onApplyRow?: (mediaItemID: string) => void
  isApplyingRow?: boolean   // true when THIS row is mid-flight
}
```

From page.tsx — EpisodeGroupProps to extend:
```typescript
// EpisodeGroup function already receives and forwards onSkip to each EpisodeImportMappingRowCard.
// Same pattern applies to onApplyRow + isApplyingRow.
// Both EpisodeGroup (for grouped rows) and the "unmapped" section (for unmapped rows)
// pass props to EpisodeImportMappingRowCard — both need the new props.
```

From types/episodeImport.ts:
```typescript
export interface EpisodeImportMappingRow {
  media_item_id: string
  status: EpisodeImportMappingStatus  // 'suggested' | 'confirmed' | 'conflict' | 'skipped'
  // ...
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add applyRow to useEpisodeImportBuilder</name>
  <files>frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts</files>
  <action>
    1. Add `applyingRowId` state: `const [applyingRowId, setApplyingRowId] = useState<string | null>(null)`.

    2. Add `applyRow` async function inside the hook (after `applyMappings`):

    ```typescript
    async function applyRow(mediaItemId: string) {
      if (!animeID || !preview) return
      const targetRow = mappings.find((row) => row.media_item_id === mediaItemId)
      if (!targetRow || targetRow.status !== 'confirmed') return

      setApplyingRowId(mediaItemId)
      setErrorMessage(null)
      try {
        await applyEpisodeImport(
          animeID,
          buildEpisodeImportApplyInput(animeID, preview, [targetRow]),
          authToken,
        )
        // Remove the applied row from local state
        setMappings((current) => current.filter((row) => row.media_item_id !== mediaItemId))
      } catch (error) {
        setErrorMessage(formatEpisodeImportError(error, 'Einzelnes Mapping konnte nicht angewendet werden.'))
      } finally {
        setApplyingRowId(null)
      }
    }
    ```

    3. Add `applyingRowId` and `applyRow` to the `UseEpisodeImportBuilderState` interface:
    ```typescript
    applyingRowId: string | null
    applyRow: (mediaItemId: string) => Promise<void>
    ```

    4. Include both in the return object of the hook.

    Note: `buildEpisodeImportApplyInput` already accepts `mappings: EpisodeImportMappingRow[]` — passing `[targetRow]` is valid without any backend change.
  </action>
  <verify>
    TypeScript must compile without errors:
    `cd /c/Users/admin/Documents/Team4s/frontend && npx tsc --noEmit 2>&1 | head -30`
  </verify>
  <done>Hook exports `applyRow(mediaItemId)` and `applyingRowId`, TypeScript clean.</done>
</task>

<task type="auto">
  <name>Task 2: Add "Ubernehmen" button to EpisodeImportMappingRowCard</name>
  <files>frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx</files>
  <action>
    1. Extend `EpisodeImportMappingRowCardProps` with two optional props:
    ```typescript
    onApplyRow?: (mediaItemID: string) => void
    isApplyingRow?: boolean
    ```

    2. Destructure in the function signature.

    3. Add the button in the JSX, directly after (or next to) the existing "Ueberspringen"/"Reaktivieren" button at the bottom of the row. Render it only when `row.status === 'confirmed'` AND `onApplyRow` is provided:

    ```tsx
    {row.status === 'confirmed' && onApplyRow ? (
      <button
        className={styles.microButton}
        type="button"
        disabled={isApplyingRow}
        onClick={() => onApplyRow(row.media_item_id)}
      >
        {isApplyingRow ? 'Wird angewendet...' : 'Ubernehmen'}
      </button>
    ) : null}
    ```

    Use `styles.microButton` — same class already used by the skip/reactivate button, no new CSS needed.
  </action>
  <verify>
    TypeScript must compile without errors:
    `cd /c/Users/admin/Documents/Team4s/frontend && npx tsc --noEmit 2>&1 | head -30`
  </verify>
  <done>Confirmed rows show "Ubernehmen" button. Button is disabled with loading text while `isApplyingRow` is true. Other statuses show nothing.</done>
</task>

<task type="auto">
  <name>Task 3: Thread applyRow props through page.tsx</name>
  <files>frontend/src/app/admin/anime/[id]/episodes/import/page.tsx</files>
  <action>
    1. Destructure `applyRow` and `applyingRowId` from `builder` in `AdminAnimeEpisodeImportPage`.

    2. Extend `EpisodeGroupProps` interface with:
    ```typescript
    onApplyRow: (mediaItemID: string) => void
    applyingRowId: string | null
    ```

    3. In the `EpisodeGroup` function signature, add both props and destructure them.

    4. Inside `EpisodeGroup`, forward to each `EpisodeImportMappingRowCard`:
    ```tsx
    onApplyRow={onApplyRow}
    isApplyingRow={applyingRowId === row.media_item_id}
    ```

    5. In the `AdminAnimeEpisodeImportPage` JSX, pass the new props to `<EpisodeGroup>`:
    ```tsx
    onApplyRow={(id) => void applyRow(id)}
    applyingRowId={builder.applyingRowId}
    ```

    6. In the "Ohne Episodenzuordnung" section (unmapped rows), also pass to each `EpisodeImportMappingRowCard`:
    ```tsx
    onApplyRow={(id) => void applyRow(id)}
    isApplyingRow={builder.applyingRowId === row.media_item_id}
    ```

    The global "Mapping anwenden" button and `builder.canApply` logic are NOT touched.
  </action>
  <verify>
    TypeScript must compile without errors:
    `cd /c/Users/admin/Documents/Team4s/frontend && npx tsc --noEmit 2>&1 | head -30`

    Visual check: Start frontend dev server and open an episode import page with at least one confirmed row. The "Ubernehmen" button should appear next to the skip button.
  </verify>
  <done>
    - TypeScript clean.
    - Confirmed rows in both EpisodeGroup and unmapped section show "Ubernehmen".
    - Clicking the button triggers a single-row apply, row disappears after success.
    - Global apply button unchanged.
  </done>
</task>

</tasks>

<verification>
After all three tasks:

1. `cd /c/Users/admin/Documents/Team4s/frontend && npx tsc --noEmit` — zero errors.
2. Open the episode import page for an anime with a Jellyfin preview loaded.
3. Confirm one row (status becomes "confirmed").
4. "Ubernehmen" button appears on that row only.
5. Click it — button shows "Wird angewendet..." and is disabled.
6. After backend responds, the row is gone from the list.
7. Other rows are unaffected.
8. Global "Mapping anwenden" button still works for all confirmed rows.
</verification>

<success_criteria>
- TypeScript compilation passes with no errors across all three files.
- Per-row apply button visible on confirmed rows, absent on other statuses.
- Single-row apply hits the existing `applyEpisodeImport` endpoint with a one-element mappings array.
- Successful apply removes that row from `mappings` state — no page reload needed.
- Loading state (disabled + text change) prevents double-submit.
- Global apply path (`applyMappings`, `canApply`, the workbench apply button) is unchanged.
</success_criteria>

<output>
No SUMMARY file needed for quick tasks. Report completion inline.
</output>
