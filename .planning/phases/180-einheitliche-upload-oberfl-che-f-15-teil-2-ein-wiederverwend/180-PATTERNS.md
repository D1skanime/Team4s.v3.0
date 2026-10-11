# Phase 180: Einheitliche Upload-Oberfläche (F-15 Teil 2) — Pattern Map

**Mapped:** 2026-10-11
**Files analyzed:** 24 (2 new primitives + 1 new hook + their tests/showcase + 7 modified Weg-1/2
files + 10 presentation-only touch points across Weg 3–8 + 2 backend files for D-14 + 1 dead-code
decision file)
**Analogs found:** 24 / 24 (every file has at least a role-match; the two brand-new primitives and
the orchestration hook have direct, line-cited source material to generalize from — this phase is
an extraction/consolidation of existing, fully-read code, not greenfield work)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/components/ui/UploadDropzone.tsx` (new) | component (primitive) | request-response (file-pick trigger, no API) | `ReleaseVersionMediaSection.tsx:271-318` (dropzone+replace dropzone) + `GroupMediaReviewUploadPanel.tsx:74-125` | exact (generalized from 2 near-identical implementations) |
| `frontend/src/components/ui/UploadFileRow.tsx` (new) | component (primitive) | transform (props-in/callbacks-out) | `ReleaseVersionMediaUploadQueue.tsx` (whole file) | exact |
| `frontend/src/components/ui/UploadDropzone.test.tsx` (new) | test | — | `frontend/src/components/ui/Modal.test.tsx` | exact (jsdom + Testing Library pattern) |
| `frontend/src/components/ui/UploadFileRow.test.tsx` (new) | test | — | `frontend/src/components/ui/Modal.test.tsx` | exact |
| `frontend/src/components/ui/index.ts` (modified) | config (barrel export) | — | existing file itself (append 2 lines) | exact |
| `frontend/src/app/dev/ui-system/showcase/UploadPrimitivesShowcase.tsx` (new) | component (showcase) | — | `frontend/src/app/dev/ui-system/showcase/DrawerShowcase.tsx` | exact |
| `frontend/src/app/dev/ui-system/page.tsx` (modified, registration only) | component (route) | — | existing import/registration block, `page.tsx:35-41` | exact |
| `frontend/src/hooks/useUploadQueue.ts` (new) | hook (orchestration) | CRUD (multi-step: upload→patch→retry) | `useReleaseVersionMedia.ts:127-274` (`patchUploadedItem`/`runUpload`/`startUpload`/`retryUpload`) | exact (direct generalization) |
| `frontend/src/hooks/useUploadQueue.helpers.ts` (new) | utility (pure functions) | transform | `ReleaseVersionMediaSection.helpers.tsx:104-147` (`fileKey`, `statusLabel`, `statusClassName`, `isTerminalStatus`) | exact |
| `frontend/src/hooks/useUploadQueue.helpers.test.ts` (new) | test | — | `ReleaseVersionMediaSection.helpers.test.ts` (pure-fn import test) | exact |
| `frontend/src/hooks/useUploadQueue.test.ts` (new) | test (hook) | — | pattern implied by `useReleaseVersionMedia.ts`'s retry branch (no existing dedicated hook test file found; nearest precedent is `useCancellableSlugState.test.ts`) | role-match |
| `ReleaseVersionMediaSection.tsx` (modified, shrink) | controller/component | request-response | itself (826 lines today, split target) | exact (self) |
| `ReleaseVersionMediaUploadDrawer.tsx` (new, extracted) | component | request-response | `ReleaseVersionMediaSection.tsx:71-345` (upload drawer JSX + handlers currently inline) | exact |
| `ReleaseVersionMediaGrid.tsx` (new, extracted) | component | CRUD (render list) | `ReleaseVersionMediaGallery.tsx` (dead code, 383 lines — audit first, see Shared Patterns/D-15 below) | role-match, pending audit |
| `ReleaseVersionMediaEditDrawer.tsx` (new, extracted) | component | request-response | `ReleaseVersionMediaSection.tsx` edit-sheet block (`openEditSheet`, `handleSaveSelectedItem`, lines ~209-217, 348-376) | exact |
| `useReleaseVersionMedia.ts` (modified, shrink) | hook | CRUD | itself (553 lines today; upload-specific slice delegates to `useUploadQueue`) | exact (self) |
| `GroupMediaReviewSection.tsx` (modified) | controller/component | request-response | itself (632 lines; extracts filter/pagination to new hook) | exact (self) |
| `useGroupMediaReviewFilters.ts` (new, extracted) | hook | transform | `GroupMediaReviewSection.tsx` filter/sort/pagination `useMemo` blocks | role-match |
| `GroupMediaReviewUploadPanel.tsx` (rebuilt) | component | request-response | `ReleaseVersionMediaUploadDrawer.tsx` (new, Weg-1 sibling after extraction) and itself (current replace-semantics version to be deleted per D-03) | exact |
| `useGroupMediaReviewActions.ts` (modified) | hook | CRUD | `useReleaseVersionMedia.ts`'s `startUpload`/`retryUpload` (`handleUpload`, lines 158-186, replaced by `useUploadQueue` call) | exact |
| `backend/internal/handlers/fansub_media_upload.go` (modified, D-14) | handler | CRUD | `backend/internal/handlers/admin_content_release_version_media_upload.go` (`rvmFileResult.ReleaseVersionMediaID`) | exact |
| `backend/internal/repository/media_repository.go` (`CreateFansubGroupMediaAsset`, modified) | model/repository | CRUD | `CreateReleaseVersionMediaAsset` (same file, lines 117-143) | exact |
| `backend/internal/handlers/fansub_media_upload_*_test.go` (new/modified test, D-14) | test | — | `fansub_media_review_handler_test.go` (`fansubMediaRepoStub` + `httptest.NewRecorder()` pattern) | exact |
| `frontend/src/lib/api/admin/fansub-media.ts` (modified, D-14 type) | utility (API client types) | transform | `frontend/src/lib/api/releases.ts:197-221` (`release_version_media_id` field on the Weg-1 result type) | exact |
| Weg 3 `MediaUpload.tsx`/`MediaUploadCore.tsx` (presentation-only touch) | component | event-driven (single-slot replace) | `UploadDropzone`/`UploadFileRow` (new primitives, `multiple=false`, `showMetadataFields=false`) | role-match (D-13 visual-only) |
| Weg 4 `AnimeJellyfinAssetUploadControls.tsx` (behavioral touch, D-16) | component | event-driven (two-step upload+PATCH) | `UploadDropzone` with `allowDrop=true` (originally D-16's lone exception, generalized to all 8 ways by D-17) + `MediaUploadCore.tsx`'s native-`<button>` debt as the thing being fixed | role-match (D-13 + D-16/D-17) |
| Weg 5 `SegmenteTab.tsx`/`useSegmentAssetHandlers.ts`/`SegmentEditPanel.tsx` (presentation-only touch) | component | event-driven (video replace) | `UploadDropzone` with `allowDrop=true` (D-17 correction — was `false`), `multiple=false` | role-match (D-13 visual-only + D-17 drag&drop gain) |
| Weg 6 `ReleaseThemeAssetsSection.tsx`/`useReleaseMediaDrawer.ts` (presentation-only touch) | component | event-driven | `UploadDropzone`/`UploadFileRow` with `allowDrop=true` (D-17 correction — was `false`); verify current `multiple`/metadata behavior at plan time per UI-SPEC row 6 | role-match (D-13 visual-only + D-17 drag&drop gain, functionally untouched per D-01) |
| Weg 7 `me/profile/page.tsx` (presentation-only touch) | component | event-driven (self-service, 3 slots) | `UploadDropzone` with `allowDrop=true` (D-17 correction — was `false`), `multiple=false`, `showMetadataFields=false` | role-match (D-13 visual-only + D-17 drag&drop gain) |
| Weg 8 `ReportFormMedia.tsx` (presentation-only touch) | component | event-driven (suggestion workflow) | `UploadDropzone`/`UploadFileRow` (verify current `multiple`/accept behavior at plan time per UI-SPEC row 8) | role-match (D-13 visual-only) |

---

## Pattern Assignments

### `frontend/src/components/ui/UploadDropzone.tsx` (component, request-response)

**Analog:** `ReleaseVersionMediaSection.tsx:271-318` (primary dropzone + the near-identical "replace"
dropzone in the same file) and `GroupMediaReviewUploadPanel.tsx:74-125` (second independent
implementation being replaced).

**Click + keyboard pattern** (`ReleaseVersionMediaSection.tsx:271-281`):
```typescript
function openFilePicker() {
  if (!canChooseFiles) return
  fileInputRef.current?.click()
}

function onDropZoneKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    openFilePicker()
  }
}
```

**Drag&Drop pattern** (`ReleaseVersionMediaSection.tsx:283-288`, the pattern to consolidate — note
`GroupMediaReviewUploadPanel.tsx:87-95` has a near-identical but NOT byte-identical second copy
using `onDragEnter`/`onDragLeave` instead of a single boolean toggle — `UploadDropzone` should
unify on one dragging-state contract, not keep both variants):
```typescript
function onDrop(event: DragEvent<HTMLDivElement>) {
  event.preventDefault()
  setIsDragActive(false)
  if (!canChooseFiles) return
  handleFiles(Array.from(event.dataTransfer.files ?? []))
}
```

**Markup/primitive composition pattern** (`GroupMediaReviewUploadPanel.tsx:74-125` — closest to the
UI-SPEC's required shape: a `role="button"` wrapper, a visually-hidden `<Input type="file">`, an
icon, copy, and a `Button` secondary trigger, all built from `@/components/ui`):
```tsx
<div
  className={classNames(styles.dropZone, isUploadDragging && styles.dropZoneActive)}
  role="button"
  tabIndex={0}
  aria-label="Bilder auswählen oder hier ablegen"
  onClick={() => fileInputRef.current?.click()}
  onKeyDown={(event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      fileInputRef.current?.click()
    }
  }}
  onDragEnter={(event) => { event.preventDefault(); setIsUploadDragging(true) }}
  onDragOver={(event) => event.preventDefault()}
  onDragLeave={(event) => { if (event.currentTarget === event.target) setIsUploadDragging(false) }}
  onDrop={handleUploadDrop}
>
  <Input id="group-media-file-input" ref={fileInputRef} type="file" multiple
    accept="image/png,image/jpeg,image/webp,image/gif" className={styles.fileInput}
    onChange={(event) => handleSelectedFiles(Array.from(event.currentTarget.files ?? []))} />
  <div className={styles.dropZoneIcon} aria-hidden="true"><UploadCloud size={22} /></div>
  <div className={styles.dropZoneCopy}>
    <p className={styles.dropZoneTitle}>Bilder auswählen oder hier ablegen</p>
    <p className={styles.fileHint}>Mehrere Dateien gleichzeitig möglich</p>
  </div>
  <Button type="button" variant="secondary" size="sm" leftIcon={<UploadCloud size={16} />}
    onClick={(event) => { event.stopPropagation(); fileInputRef.current?.click() }}>
    Dateien auswählen
  </Button>
</div>
```
**UI-SPEC required deviations from this analog** (do not carry forward unchanged):
- Copy must change to the locked wording: „Dateien hier hineinziehen oder zum Auswählen klicken."
  (prompt) and „Dateien auswählen" (button) — see `180-UI-SPEC.md` Copywriting Contract.
- `density`/`allowDrop`/`promptLabel`/`dropHintLabel`/`multiFileOnSingleSlotWarning` props must be
  added (none of the two source implementations have them — they are phase-180-new).
- `--radius-lg` token replaces any ad-hoc `calc(var(--radius-md) + 6px)` dropzone-radius hack found
  in `ReleaseVersionMediaSection.module.css`.

**Disabled-state pattern** (`MediaUploadCore.tsx:118-131`, useful because it already has the
`aria-disabled`/`tabIndex={-1}` combination the UI-SPEC's Accessibility Contract requires):
```tsx
<div
  className={dropzoneClassName}
  role="button"
  tabIndex={disabled ? -1 : 0}
  aria-label={dropzoneAriaLabel}
  aria-busy={busy}
  onClick={() => (!disabled && !busy ? inputRef.current?.click() : undefined)}
  aria-disabled={disabled || busy}
>
```

---

### `frontend/src/components/ui/UploadFileRow.tsx` (component, transform)

**Analog:** `ReleaseVersionMediaUploadQueue.tsx` (whole file, 106 lines — already the most-polished
version of this pattern in the codebase per RESEARCH.md's "Don't Hand-Roll" table).

**Full row structure to generalize from** (`ReleaseVersionMediaUploadQueue.tsx:60-100`):
```tsx
<section key={key} className={styles.uploadFileRow} aria-labelledby={nameID}>
  <div className={styles.uploadFilePreview}><FilePreview file={draft.file} /></div>
  <div className={styles.uploadFileFields}>
    <p id={nameID} className={styles.filename}>{draft.file.name}</p>
    <FormField label="Titel" htmlFor={`${nameID}-title`}>
      <Input id={`${nameID}-title`} value={draft.title} maxLength={200} placeholder="Optionaler Bildtitel"
        disabled={locked} onChange={(event) => onChange(key, 'title', event.target.value)} />
    </FormField>
    <FormField label="Beschreibung" htmlFor={`${nameID}-caption`}>
      <Textarea id={`${nameID}-caption`} value={draft.caption} rows={3} placeholder="Beschreibung zu diesem Bild"
        disabled={locked} onChange={(event) => onChange(key, 'caption', event.target.value)} />
    </FormField>
    <div className={styles.uploadFileActions}>
      {!locked ? (
        <Button variant="subtle" size="sm" leftIcon={<Trash2 size={14} aria-hidden="true" />}
          onClick={() => onRemove(key)}>Aus Auswahl entfernen</Button>
      ) : null}
    </div>
    {progress ? (
      <div className={styles.uploadFileStatus} aria-live="polite">
        <span className={`${styles.badge} ${statusClassName(progress.item)}`}>{statusLabel(progress.item)}</span>
        {progress.item.status === 'uploading' ? (
          <progress max={100} value={progress.item.progress} aria-label={`Übertragung: ${draft.file.name}`} />
        ) : null}
        {progress.item.errorMessage ? <p className={styles.errorText}>{progress.item.errorMessage}</p> : null}
        {progress.item.status === 'failed' ? (
          <Button variant="subtle" size="sm" disabled={busy} leftIcon={<RefreshCw size={14} aria-hidden="true" />}
            onClick={() => onRetry(progress.index)}>Erneut versuchen</Button>
        ) : null}
      </div>
    ) : null}
  </div>
</section>
```

**Local preview thumbnail pattern** (`ReleaseVersionMediaUploadQueue.tsx:23-35`):
```tsx
function FilePreview({ file }: { file: File }) {
  const image = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const next = buildLocalPreviewURL(file)
    if (next && image.current) image.current.src = next
    return () => { if (next) URL.revokeObjectURL(next) }
  }, [file])
  return (
    <Image ref={image} src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
      alt={`Vorschau ${file.name}`} width={160} height={160} unoptimized className={styles.localPreviewImage} />
  )
}
```

**UI-SPEC required deviations:**
- Status badges must switch from hand-rolled `.idle`/`.uploading`/`.processing`/`.ready`/`.failed`
  CSS classes to the shared `Badge` primitive (`muted`/`warning`/`warning`/`success`/`danger`
  variants) — this fixes a pre-existing gap where Weg 1 itself did not use the global `Badge` yet.
- `showMetadataFields?: boolean` prop (default `true`) must gate the `Titel`/`Beschreibung`
  `FormField`s entirely off for Weg 3/4/5/7 (see Pitfall 4 in RESEARCH.md) — the analog above always
  renders them, which must not be copied verbatim.
- „Aus Auswahl entfernen" button fires with **no `ConfirmDialog`** (matches `variant="subtle"` +
  immediate removal exactly as in the analog) — do not introduce a confirmation step here.

---

### `frontend/src/hooks/useUploadQueue.ts` (hook, CRUD)

**Analog:** `useReleaseVersionMedia.ts:127-274` — the entire `patchUploadedItem` /
`runUpload` / `startUpload` / `retryUpload` cluster, parametrized behind an adapter instead of
hardcoded `uploadReleaseVersionMedia`/`patchReleaseVersionMediaItem` calls.

**Retry branch — the single most important excerpt in this phase** (`useReleaseVersionMedia.ts:250-269`;
Pitfall 2 in RESEARCH.md explains why Weg 2 cannot use this unmodified until D-14 ships):
```typescript
const retryUpload = useCallback(
  async (fileIndex: number): Promise<UploadRunResult> => {
    const config = lastUploadConfigRef.current
    const queueItem = uploadItems[fileIndex]
    if (!config || config.versionId !== versionId || !queueItem || queueItem.status !== 'failed') {
      return { items: [], allSucceeded: false }
    }
    if (queueItem.resultId === null) return runUpload([fileIndex], [queueItem], config)

    setError(null)
    setUploadItems(current => current.map((item, index) => index === fileIndex
      ? { ...item, status: 'processing', errorMessage: null }
      : item))
    const outcome = await patchUploadedItem(queueItem)
    setUploadItems(current => current.map((item, index) => index === fileIndex ? outcome : item))
    if (outcome.status === 'ready') reload()
    return { items: [outcome], allSucceeded: outcome.status === 'ready' }
  },
  [patchUploadedItem, reload, runUpload, uploadItems, versionId],
)
```

**Per-file upload-result mapping — the exact point where the adapter's `readyResultId` must plug
in** (`useReleaseVersionMedia.ts:191-210`):
```typescript
for (const [position, queueItem] of queue.entries()) {
  const result = response.results[position]
  const targetIndex = queueIndices[position]
  let outcome: UploadQueueItem
  if (result?.status === 'ready' && typeof result.release_version_media_id === 'number') {
    shouldReload = true
    const uploaded: UploadQueueItem = {
      ...queueItem, status: 'processing', progress: 100, errorMessage: null,
      resultId: result.release_version_media_id, sourceRevision: result.source_revision,
    }
    setUploadItems(current => current.map((item, index) => index === targetIndex ? uploaded : item))
    outcome = await patchUploadedItem(uploaded)
  } else {
    outcome = {
      ...queueItem, status: 'failed', progress: 100,
      errorMessage: result?.error_code || 'Upload fehlgeschlagen.', resultId: null,
    }
  }
  outcomes.push(outcome)
  setUploadItems(current => current.map((item, index) => index === targetIndex ? outcome : item))
}
```
This is the exact spot the Weg-2 adapter's `readyResultId(result)` must feed — for Weg 2 that is
`result.fansub_group_media_id` once D-14 ships the backend field, NOT `result.media_asset_id`.

**Error normalization pattern** (`useReleaseVersionMedia.ts:88-96`, copy verbatim into the shared
hook's helpers file):
```typescript
function readUploadError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}
```

**Hook location precedent** (`frontend/src/hooks/useCancellableSlugState.ts` — proves hooks with
API-aware orchestration logic live under `frontend/src/hooks/`, not `components/ui`): the file's
own doc comment establishes the project convention of documenting *why* a stateful pattern looks
the way it does inline — `useUploadQueue.ts` should follow the same comment density, especially
around the `resultId === null` retry branch above, since it is the single highest-risk line in the
whole phase (Pitfall 2).

---

### `frontend/src/hooks/useUploadQueue.helpers.ts` (utility, transform)

**Analog:** `ReleaseVersionMediaSection.helpers.tsx:104-147`.

**Merge function to generalize** (`ReleaseVersionMediaSection.tsx:240-253`, D-03's core deliverable
— Weg 2's current `setSelectedFiles(files.filter(...))` replace-semantics must become this):
```typescript
function handleFiles(nextFiles: File[]) {
  if (!canChooseFiles) return
  setSelectedDrafts((current) => {
    const merged = [...current]
    const seen = new Set(current.map((draft) => fileKey(draft.file)))
    for (const file of nextFiles) {
      const key = fileKey(file)
      if (seen.has(key)) continue
      seen.add(key)
      merged.push({ file, title: '', caption: '' })
    }
    return merged
  })
}
```
Generalize to a pure function: `mergeFileSelection(current: Draft[], incoming: File[], keyFn: (f: File) => string): Draft[]` — exactly as RESEARCH.md's Code Examples section prescribes.

**Pure helpers to copy/generalize verbatim** (`ReleaseVersionMediaSection.helpers.tsx:104-147`):
```typescript
export function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

export function statusLabel(item: UploadQueueItem): string {
  switch (item.status) {
    case 'uploading': return `hochladen... ${item.progress}%`
    case 'processing': return 'verarbeiten...'
    case 'ready': return 'Fertig'
    case 'failed': return 'Fehler'
    default: return 'Bereit'
  }
}

export function isTerminalStatus(status: UploadQueueItem['status']): boolean {
  return status === 'ready' || status === 'failed'
}
```
**UI-SPEC deviation:** `statusClassName` (the CSS-class variant) should NOT be carried forward — the
new shared primitive renders `Badge` variants instead (see Color section of `180-UI-SPEC.md`).
Replace with a `statusBadgeVariant(item): 'muted' | 'warning' | 'success' | 'danger'` helper.

---

### `frontend/src/hooks/useUploadQueue.helpers.test.ts` / `UploadDropzone.test.tsx` / `UploadFileRow.test.tsx` (test)

**Analog for pure-function tests:** `ReleaseVersionMediaSection.helpers.test.ts` (pattern per
RESEARCH.md Code Examples, D-05-compliant — direct function import, no DOM, no mock):
```typescript
import { describe, expect, it } from 'vitest'
import { moveStoryItem } from './ReleaseVersionMediaSection.helpers'

describe('moveStoryItem', () => {
  it('moves an item to every requested position without an off-by-one', () => {
    expect(moveStoryItem(items, 0, 1).map(/* ... */)).toEqual([2, 1, 3])
  })
})
```

**Analog for DOM-interaction component tests:** `frontend/src/components/ui/Modal.test.tsx` (full
file read above) — note the required header comment `// @vitest-environment jsdom` (per-file, not
global, per `frontend/vitest.config.ts` convention) and the `afterEach(() => cleanup())` boilerplate:
```typescript
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => { cleanup() })

describe('Modal', () => {
  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Testmodal"><button type="button">Inhalt</button></Modal>)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
```
For `UploadDropzone.test.tsx`, drive the equivalent assertions with `fireEvent.drop(...)` and
`fireEvent.keyDown(..., { key: 'Enter' })` against `role="button"`, per RESEARCH.md's Validation
Architecture section.

**D-05 hard constraint (explicit, binding project rule — see CLAUDE.md Teststil section and
180-CONTEXT.md D-05):** none of the new test files may read their own `.go`/`.tsx` source via
`os.ReadFile`/`fs.readFileSync` + `strings.includes`/`Contains` to assert behavior. Every assertion
must come from actually invoking the function/component and inspecting its return value or
rendered DOM/response body.

---

### `frontend/src/app/dev/ui-system/showcase/UploadPrimitivesShowcase.tsx` (component, showcase registration)

**Analog:** `frontend/src/app/dev/ui-system/showcase/DrawerShowcase.tsx` (full file read above).

**Registration pattern** (`page.tsx:35-41`, append the new showcase the same way):
```typescript
import { AccordionShowcase } from './showcase/AccordionShowcase'
import { CompositionShowcase } from './showcase/CompositionShowcase'
import { DrawerShowcase } from './showcase/DrawerShowcase'
import { PublicFansubSurfacesShowcase } from './showcase/PublicFansubSurfacesShowcase'
import { PublicReleaseSurfacesShowcase } from './showcase/PublicReleaseSurfacesShowcase'
import { SwitchShowcase } from './showcase/SwitchShowcase'
```
`UploadPrimitivesShowcase` must be a self-contained `'use client'` component taking no required
props (own local `useState` for a demo queue), exactly like `DrawerShowcase`'s `open`/`onClose`
pattern or `SwitchShowcase`'s fully self-contained pattern — check which of the two existing
registration shapes (controlled-from-parent vs. self-contained) fits before wiring it into
`page.tsx`.

---

### `backend/internal/handlers/fansub_media_upload.go` + `backend/internal/repository/media_repository.go` (handler + repository, CRUD, D-14)

**Analog:** `admin_content_release_version_media_upload.go` (response shape) +
`CreateReleaseVersionMediaAsset` (same repository file, lines 117-143) — this is the exact,
line-cited gap D-14 closes.

**Target response struct shape** (`admin_content_release_version_media_upload.go:29-38` — the field
`fansub_group_media_id` must be added to the sibling struct below in the same style, `omitempty`
pointer, analogous name):
```go
type rvmFileResult struct {
	ClientFileName        string `json:"client_file_name"`
	Status                string `json:"status"` // "ready" or "failed"
	MediaAssetID          *int64 `json:"media_asset_id,omitempty"`
	ReleaseVersionMediaID *int64 `json:"release_version_media_id,omitempty"`
	SourceRevision        *int64 `json:"source_revision,omitempty"`
	// ...
}
```

**Current (insufficient) struct to extend** (`fansub_media_upload.go:294-303`):
```go
type fansubGroupMediaFileResult struct {
	ClientFileName string `json:"client_file_name"`
	Status         string `json:"status"`
	MediaAssetID   *int64 `json:"media_asset_id,omitempty"`
	PreviewURL     string `json:"preview_url,omitempty"`
	ThumbnailURL   string `json:"thumbnail_url,omitempty"`
	OriginalURL    string `json:"original_url,omitempty"`
	DisplayURL     string `json:"display_url,omitempty"`
	ErrorCode      string `json:"error_code,omitempty"`
	Message        string `json:"message,omitempty"`
}
```
Add `FansubGroupMediaID *int64 `json:"fansub_group_media_id,omitempty"`` to this struct.

**Repository-level pattern to copy exactly** (`media_repository.go:117-143`, `CreateReleaseVersionMediaAsset`
returns `(int64, error)` via `RETURNING id`):
```go
func (r *MediaRepository) CreateReleaseVersionMediaAsset(
	ctx context.Context, tx pgx.Tx, input ReleaseVersionMediaCreateInput,
) (int64, error) {
	var id int64
	err := tx.QueryRow(ctx, `
		INSERT INTO release_version_media (...)
		VALUES (...)
		RETURNING id
	`, /* params */).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("create release_version_media: %w", err)
	}
	return id, nil
}
```

**What must change — current `CreateFansubGroupMediaAsset` does NOT return the new ID**
(`media_repository.go:994-1008`, this is the exact defect D-14 fixes):
```go
func (r *MediaRepository) CreateFansubGroupMediaAsset(ctx context.Context, tx pgx.Tx, input FansubGroupMediaCreateInput) error {
	// ...
	_, err := tx.Exec(ctx, `
		INSERT INTO fansub_group_media (...)
		VALUES (...)
	`, /* params */)
	if err != nil {
		return fmt.Errorf("create fansub_group_media (...): %w", err)
	}
	return nil
}
```
Change the signature to `(int64, error)`, switch `tx.Exec` → `tx.QueryRow(...).Scan(&id)` with
`RETURNING id` appended, and thread the returned ID through
`processOneFansubGroupMediaFile` into the new `FansubGroupMediaID` field on
`fansubGroupMediaFileResult` (analogous to how `admin_content_release_version_media_upload.go`
already threads `ReleaseVersionMediaID` through its own per-file result builder).

**Call site that currently discards the ID** (`fansub_media_upload.go:511-520`, confirmed by
RESEARCH.md Pitfall 2):
```go
if err := h.mediaRepo.CreateFansubGroupMediaAsset(ctx, tx, repository.FansubGroupMediaCreateInput{
	FansubGroupID:    fansubID,
	MediaAssetID:     mediaAsset.ID,
	Category:         category,
	SortOrder:        sortOrder,
	UploadedByUserID: &uploadedBy,
}); err != nil {
	cleanupGroupMediaFiles()
	return fansubGroupMediaFileResult{ClientFileName: clientName, Status: "failed", ErrorCode: "DB_FAILED", Message: "gruppenmedium konnte nicht erstellt werden"}
}
```
Capture the returned `fansubGroupMediaID` here and set it on the success-path result struct built
further down (`fansub_media_upload.go:538-548`).

---

### `backend/internal/handlers/fansub_media_upload_*_test.go` (test, httptest + fake repo, D-14/D-05)

**Analog:** `fansub_media_review_handler_test.go:1-70` — the project's canonical
`httptest.NewRecorder()` + hand-rolled interface-stub pattern (NOT a mocking library):
```go
import (
	"net/http/httptest"
	// ...
)

type fansubMediaRepoStub struct {
	updateErr      error
	updatedMediaID *int64
	// ...
}

func (s *fansubMediaRepoStub) UpdateFansubMediaReview(ctx context.Context, fansubGroupID, mediaID int64, patch repository.FansubMediaReviewPatch) error {
	if s.updatedMediaID != nil {
		*s.updatedMediaID = mediaID
	}
	return s.updateErr
}
```
Use `httptest.NewRecorder()` + a `gin.Context` built against this stub, assert on
`rec.Code` and `json.Unmarshal(rec.Body.Bytes(), &response)` to confirm
`fansub_group_media_id` is present in the JSON body — this satisfies the CLAUDE.md Teststil rule
("Verhaltens-Assertions ... müssen den geprüften Code tatsächlich AUSFÜHREN — bei Handlern über
`httptest` gegen ein leichtgewichtiges Fake-Repository, mit Prüfung von Statuscode und
Response-Body"). Do NOT write a test that reads the `.go` source file and greps for
`fansub_group_media_id` — that is the explicitly forbidden Altlast pattern this project is actively
moving away from.

---

### Weg 3–8: Presentation-only primitive adoption (D-13)

**No single analog excerpt applies uniformly** — each way keeps its existing fachliche Logik and
only swaps markup. The concrete per-way prop values are already fully specified in
`180-UI-SPEC.md`'s "Per-Way Adaptation Matrix" (reproduced here for traceability, do not
re-derive):

| Weg | File(s) | `multiple` | `allowDrop` | `density` | `showMetadataFields` |
|---|---|---|---|---|---|
| 3 | `MediaUpload.tsx` + `MediaUploadCore.tsx` | `false` | `false` | `compact` | `false` |
| 4 | `AnimeJellyfinAssetUploadControls.tsx` | `false` | `true` (D-16 exception) | `compact` | `false` |
| 5 | `SegmenteTab.tsx`, `useSegmentAssetHandlers.ts`, `SegmentEditPanel.tsx` | `false` | `false` | `compact` | `false` |
| 6 | `ReleaseThemeAssetsSection.tsx`, `useReleaseMediaDrawer.ts` | verify at plan time | `false` | `roomy` | verify at plan time |
| 7 | `me/profile/page.tsx` | `false` | `false` | `compact` | `false` |
| 8 | `ReportFormMedia.tsx` | verify at plan time | `false` | verify at plan time | verify at plan time |

**Weg 3 current dropzone to replace** (`MediaUploadCore.tsx:118-131`, already shown above under
`UploadDropzone`'s disabled-state excerpt) — this file already uses the global `Button` correctly
(lines 185-218) but hand-rolls the dropzone `<div>` itself; the dropzone wrapper is what
`UploadDropzone` replaces, the three `Button`s at the bottom stay as-is.

**Weg 4 current violation to fix as a side effect** (`AnimeJellyfinAssetUploadControls.tsx` has
multiple raw `<button className={styles.button}>` elements at lines 377, 387, 461, 483, 549, 565 —
confirmed via grep, matches UI-SPEC's explicit callout). Replacing the upload trigger area with
`UploadDropzone` (which internally renders the global `Button` for its "Dateien auswählen" action)
fixes this specific instance; the other raw `<button>`s not involved in file-selection are outside
this phase's scope unless directly touched while wiring the dropzone.

**Weg 5 current file input** (`ReleaseThemeAssetsSection.tsx:173`, note this is NOT Weg 5 but Weg 6
— re-verify at plan time per UI-SPEC row 6/8 "verify at plan time" caveat before writing the
migration task):
```tsx
<input type="file" accept="video/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
```
This is a bare native `<input>` with zero dropzone/drag affordance today — per D-17 it still adopts
`UploadDropzone allowDrop={true}` (drag&drop gained, not suppressed), but confirm which
concrete file owns the Segment-Video upload input (Weg 5) vs. the Theme-Asset upload input (Weg 6)
before planning, since both single-file video inputs exist in the codebase and must not be
conflated.

**Weg 7 avatar/background upload trigger** (`me/profile/page.tsx`, avatar input ref pattern at
lines 197, 587-667) — self-service, no capability check (per RESEARCH.md's Security Domain note:
`UploadFileRow`'s retry button must never render here without the page's own gate, but Weg 7 has no
such gate today by design — do not add one as a side effect of this phase).

**Weg 8 suggestion-flow file input** (`ReportFormMedia.tsx:168-172`):
```tsx
<input
  // ...
  accept="image/*,video/mp4,video/webm"
```
Note the mixed image+video accept string — `UploadDropzone`'s `accept` prop must support this
string unchanged; do not narrow it to `image/*` only when wiring Weg 8.

---

## Shared Patterns

### Authentication / Capability Gating
**Source:** Phase 179's capability flags, consumed (not computed) everywhere in this phase per
D-01 ("keine Rechteänderung"). Concrete consumption pattern (`ReleaseVersionMediaSection.tsx:140-146`):
```typescript
const canViewMedia = media.capabilities?.can_view_media ?? false
const canUploadMedia = media.capabilities?.can_upload_media ?? false
const canUpdateMedia = media.capabilities?.can_update_media ?? false
```
**Apply to:** Every page-level component that renders `UploadDropzone`/`UploadFileRow` — the
primitives themselves never check capabilities (per UI-SPEC Security Domain note); the calling
page must pass `disabled={!canUploadMedia || isBusy}` exactly as today.

### Error Handling
**Source:** `useReleaseVersionMedia.ts:88-96` (`readUploadError`) and
`useGroupMediaReviewActions.ts:43-47` (`readErrorMessage`) — two near-identical copies of the same
pattern today; `useUploadQueue.ts` should have exactly one canonical version in
`useUploadQueue.helpers.ts`, and both call sites should eventually import it instead of keeping
their own local copy (D-03's "no duplicate surfaces" spirit extends to this helper).
```typescript
function readUploadError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}
```

### Review-Status Neutrality (Pitfall 5)
**Source:** `useGroupMediaReviewActions.ts:163-170` passes `reviewStatusCode: 'in_review'`
explicitly to `uploadFansubGroupMedia`; Weg 1's `uploadReleaseVersionMedia` call
(`useReleaseVersionMedia.ts:169-180`) passes no such parameter at all.
**Apply to:** `useUploadQueue`'s adapter interface must NOT have a `reviewStatusCode`/
`visibilityCode` field on the shared hook's own options — each way's adapter closure captures its
own per-way constant and bakes it into its own `uploadFiles` implementation, exactly as both
current call sites already do independently. The hook itself stays unaware this distinction
exists.

### Dead-Code Decision Required Before Grid Extraction (D-15)
**File:** `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.tsx`
(383 lines + `.module.css` + `.test.tsx`, confirmed via `grep -rln` to have zero static importers
anywhere in the codebase). Per D-15, the planner/executor must read this file's props-shape against
the current `ReleaseVersionAdminStoryItem`/Kara-segment model before deciding reactivate-vs-delete
— this pattern-map does not pre-judge that decision, but flags it as a precondition for building
`ReleaseVersionMediaGrid.tsx` cleanly (building a second, slightly different grid component next to
a never-deleted dead one would recreate exactly the duplication D-03 is meant to eliminate).

---

## No Analog Found

None. Every file in scope has at least a role-match analog — this phase is explicitly framed by
`180-CONTEXT.md`/`180-RESEARCH.md` as consolidation of fully-read, already-existing code, not
greenfield construction. The two genuinely new files (`UploadDropzone.tsx`, `UploadFileRow.tsx`)
are direct generalizations of 2–3 already-read source files each (see Pattern Assignments above),
and `useUploadQueue.ts` is a direct parametrization of `useReleaseVersionMedia.ts`'s existing
upload-slice functions.

---

## Metadata

**Analog search scope:**
`frontend/src/app/admin/episode-versions/[versionId]/edit/`,
`frontend/src/app/admin/fansubs/[id]/edit/`,
`frontend/src/app/admin/anime/components/AnimeEditPage/`,
`frontend/src/components/admin/`, `frontend/src/components/contributions/`,
`frontend/src/app/me/profile/`, `frontend/src/components/ui/`, `frontend/src/hooks/`,
`frontend/src/app/dev/ui-system/`, `backend/internal/handlers/`, `backend/internal/repository/`.

**Files scanned:** 24 target files fully or targeted-read in this session, plus 8 supporting
analog files (`Modal.tsx`/`.test.tsx`, `Badge.tsx`, `DrawerShowcase.tsx`, `page.tsx`,
`useCancellableSlugState.ts`, `fansub_media_review_handler_test.go`,
`admin_content_release_version_media_upload.go`, `media_repository.go`).

**Pattern extraction date:** 2026-10-11
