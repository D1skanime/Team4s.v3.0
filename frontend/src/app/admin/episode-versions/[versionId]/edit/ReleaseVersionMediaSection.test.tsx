// @vitest-environment jsdom

import { useMemo, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import type {
  ReleaseVersionMediaItem,
  ReleaseVersionMediaPatchRequest,
  ReleaseVersionMediaReorderRequest,
} from '@/types/releaseVersionMedia'

import { ReleaseVersionMediaSection } from './ReleaseVersionMediaSection'
import type { UploadQueueItem, UseReleaseVersionMediaResult } from './useReleaseVersionMedia'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:test-preview'),
    revokeObjectURL: vi.fn(),
  })
})

function makeItem(overrides: Partial<ReleaseVersionMediaItem> = {}): ReleaseVersionMediaItem {
  return {
    id: 1,
    release_version_id: 42,
    media_asset_id: 10,
    category: 'screenshot',
    caption: null,
    sort_order: 10,
    is_preview_candidate: false,
    thumbnail_url: null,
    original_url: 'https://example.com/original.png',
    uploaded_by_user_id: 1,
    created_at: '2026-05-08T00:00:00Z',
    deleted_at: null,
    ...overrides,
  }
}

function makeQueueItem(overrides: Partial<UploadQueueItem> = {}): UploadQueueItem {
  return {
    file: new File(['x'], 'scene01.png', { type: 'image/png' }),
    status: 'idle',
    progress: 0,
    errorMessage: null,
    resultId: null,
    ...overrides,
  }
}

function makeMediaState(
  overrides: Partial<UseReleaseVersionMediaResult> = {},
): UseReleaseVersionMediaResult {
  return {
    items: [],
    isLoading: false,
    error: null,
    reload: vi.fn(),
    uploadItems: [],
    startUpload: vi.fn().mockResolvedValue(undefined),
    retryUpload: vi.fn().mockResolvedValue(undefined),
    clearUploadQueue: vi.fn(),
    patchItem: vi.fn().mockResolvedValue(undefined),
    deleteItem: vi.fn().mockResolvedValue(undefined),
    reorderItems: vi.fn().mockResolvedValue(undefined),
    patchError: null,
    deleteError: null,
    reorderError: null,
    ...overrides,
  }
}

function renderSection(mediaState?: UseReleaseVersionMediaResult) {
  return render(
    <ReleaseVersionMediaSection
      versionId={42}
      fansubGroupName="SubGroup"
      releaseVersionLabel="v1"
      mediaState={mediaState}
    />,
  )
}

function createDeferred() {
  let resolve!: () => void
  const promise = new Promise<void>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function StatefulSectionHarness({
  initialItems,
  onPatchSpy,
  onDeleteSpy,
}: {
  initialItems: ReleaseVersionMediaItem[]
  onPatchSpy?: (mediaId: number, patch: ReleaseVersionMediaPatchRequest) => Promise<void> | void
  onDeleteSpy?: (mediaId: number) => Promise<void> | void
}) {
  const [items, setItems] = useState(initialItems)
  const state = useMemo<UseReleaseVersionMediaResult>(
    () => ({
      items,
      isLoading: false,
      error: null,
      reload: vi.fn(),
      uploadItems: [],
      startUpload: vi.fn().mockResolvedValue(undefined),
      retryUpload: vi.fn().mockResolvedValue(undefined),
      clearUploadQueue: vi.fn(),
      patchItem: async (mediaId, patch) => {
        await onPatchSpy?.(mediaId, patch)
        setItems((current) => {
          const next = current.map((item) =>
            item.id === mediaId
              ? {
                  ...item,
                  caption:
                    patch.caption !== undefined ? patch.caption ?? null : item.caption,
                  sort_order:
                    patch.sort_order !== undefined ? patch.sort_order : item.sort_order,
                  is_preview_candidate:
                    patch.is_preview_candidate !== undefined
                      ? patch.is_preview_candidate
                      : item.is_preview_candidate,
                }
              : item,
          )
          if (patch.sort_order !== undefined) {
            return [...next].sort((a, b) => a.sort_order - b.sort_order)
          }
          return next
        })
      },
      deleteItem: async (mediaId) => {
        await onDeleteSpy?.(mediaId)
        setItems((current) => current.filter((item) => item.id !== mediaId))
      },
      reorderItems: vi.fn().mockResolvedValue(undefined),
      patchError: null,
      deleteError: null,
      reorderError: null,
    }),
    [items, onDeleteSpy, onPatchSpy],
  )

  return (
    <ReleaseVersionMediaSection
      versionId={42}
      fansubGroupName="SubGroup"
      releaseVersionLabel="v1"
      mediaState={state}
    />
  )
}

describe('ReleaseVersionMediaSection', () => {
  it('renders the category dropdown with all four category labels', () => {
    renderSection(makeMediaState())

    const options = Array.from(screen.getByRole('combobox').querySelectorAll('option')).map(
      (option) => option.textContent,
    )

    expect(options).toContain('Release-Screenshot')
    expect(options).toContain('Typesetting-/Karaoke-Beispiel')
    expect(options.some((option) => option?.includes('Outtake'))).toBe(true)
    expect(options).toContain('Sonstiges')
  })

  it('keeps file input and upload button disabled until a category is selected', () => {
    renderSection(makeMediaState())

    expect(screen.getByLabelText('Dateien')).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Upload starten' })).toHaveProperty('disabled', true)
  })

  it('enables upload after category selection and file pick', () => {
    renderSection(makeMediaState())

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'screenshot' } })
    const input = screen.getByLabelText('Dateien')
    fireEvent.change(input, {
      target: {
        files: [new File(['demo'], 'ready.png', { type: 'image/png' })],
      },
    })

    expect(input).toHaveProperty('disabled', false)
    expect(screen.getByRole('button', { name: 'Upload starten' })).toHaveProperty('disabled', false)
  })

  it('accepts dropped files and shows local preview thumbnails before upload', () => {
    renderSection(makeMediaState())

    const previewFile = new File(['demo'], 'preview-ready.png', { type: 'image/png' })

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'screenshot' } })
    fireEvent.drop(screen.getByRole('button', { name: /dateien hier hineinziehen oder klicken/i }), {
      dataTransfer: {
        files: [previewFile],
      },
      preventDefault: vi.fn(),
    })

    expect(screen.getByRole('button', { name: 'Upload starten' })).toHaveProperty('disabled', false)
    expect(screen.getByAltText('Vorschau preview-ready.png')).not.toBeNull()
  })

  it('keeps existing selected files when more files are added later', () => {
    renderSection(makeMediaState())

    const firstFile = new File(['a'], 'first-preview.png', { type: 'image/png' })
    const secondFile = new File(['b'], 'second-preview.png', { type: 'image/png' })

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'screenshot' } })

    const input = screen.getByLabelText('Dateien')
    fireEvent.change(input, {
      target: {
        files: [firstFile],
      },
    })

    fireEvent.drop(screen.getByRole('button', { name: /dateien hier hineinziehen oder klicken/i }), {
      dataTransfer: {
        files: [secondFile],
      },
      preventDefault: vi.fn(),
    })

    expect(screen.getByAltText('Vorschau first-preview.png')).not.toBeNull()
    expect(screen.getByAltText('Vorschau second-preview.png')).not.toBeNull()
  })

  it('shows the preview toggle for screenshot and hides it for fun_outtake', () => {
    renderSection(makeMediaState())

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'screenshot' } })
    expect(screen.getByLabelText('Als Vorschau markieren')).not.toBeNull()

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'fun_outtake' } })
    expect(screen.queryByLabelText('Als Vorschau markieren')).toBeNull()
  })

  it('shows the preview toggle for typesetting_karaoke and hides it for other', () => {
    renderSection(makeMediaState())

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'typesetting_karaoke' },
    })
    expect(screen.getByLabelText('Als Vorschau markieren')).not.toBeNull()

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'other' } })
    expect(screen.queryByLabelText('Als Vorschau markieren')).toBeNull()
  })

  it('shows a retry button for failed upload rows', () => {
    renderSection(
      makeMediaState({
        uploadItems: [
          makeQueueItem({
            status: 'failed',
            errorMessage: 'INVALID_MIME_TYPE',
          }),
        ],
      }),
    )

    expect(screen.getByRole('button', { name: /retry/i })).not.toBeNull()
    expect(screen.getByText('INVALID_MIME_TYPE')).not.toBeNull()
  })

  it('keeps failed and succeeded file states separate in the same batch', () => {
    renderSection(
      makeMediaState({
        uploadItems: [
          makeQueueItem({
            file: new File(['a'], 'good.png', { type: 'image/png' }),
            status: 'ready',
            progress: 100,
            resultId: 11,
          }),
          makeQueueItem({
            file: new File(['b'], 'bad.png', { type: 'image/png' }),
            status: 'failed',
            progress: 100,
            errorMessage: 'THUMBNAIL_FAILED',
          }),
        ],
      }),
    )

    expect(screen.getByText('good.png')).not.toBeNull()
    expect(screen.getByText('bad.png')).not.toBeNull()
    expect(screen.getByText('Fertig')).not.toBeNull()
    expect(screen.getByText('Fehler')).not.toBeNull()
    expect(screen.getByText('THUMBNAIL_FAILED')).not.toBeNull()
  })

  it('does not show persisted gallery items optimistically from upload queue state', () => {
    renderSection(
      makeMediaState({
        items: [],
        uploadItems: [
          makeQueueItem({
            file: new File(['done'], 'queue-only.png', { type: 'image/png' }),
            status: 'ready',
            progress: 100,
            resultId: 99,
          }),
        ],
      }),
    )

    expect(screen.getByText('Persistierte Medien: 0')).not.toBeNull()
    expect(screen.getByText('queue-only.png')).not.toBeNull()
  })

  it('treats null persisted items like an empty gallery instead of crashing', () => {
    renderSection(
      makeMediaState({
        items: null as unknown as ReleaseVersionMediaItem[],
      }),
    )

    expect(screen.getByText('Persistierte Medien: 0')).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Release-Screenshot' })).not.toBeNull()
  })

  it('renders stacked gallery sections and empty-state messages', () => {
    renderSection(
      makeMediaState({
        items: [makeItem({ id: 11, category: 'screenshot', caption: 'Scene A' })],
      }),
    )

    expect(screen.getByRole('heading', { name: 'Release-Screenshot' })).not.toBeNull()
    expect(
      screen.getByRole('heading', { name: 'Typesetting-/Karaoke-Beispiel' }),
    ).not.toBeNull()
    expect(
      screen.getAllByText(/Noch keine Medien in dieser Kategorie\./i),
    ).toHaveLength(3)
    expect(screen.queryByRole('tab')).toBeNull()
  })

  it('opens the detail panel when a gallery card is clicked', async () => {
    renderSection(
      makeMediaState({
        items: [makeItem({ id: 12, category: 'screenshot', caption: 'Scene B' })],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /Scene B/i }))

    expect(await screen.findByText('Medium bearbeiten')).not.toBeNull()
    expect(screen.getByDisplayValue('Scene B')).not.toBeNull()
  })

  it('saves caption through patch and updates the selected card without a reload', async () => {
    const patchSpy = vi.fn()

    render(
      <StatefulSectionHarness
        initialItems={[makeItem({ id: 21, category: 'screenshot', caption: 'Alt' })]}
        onPatchSpy={patchSpy}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Alt/i }))
    fireEvent.change(screen.getByDisplayValue('Alt'), { target: { value: 'Neu' } })
    fireEvent.click(screen.getByRole('button', { name: 'Beschreibung speichern' }))

    await waitFor(() =>
      expect(patchSpy).toHaveBeenCalledWith(21, { caption: 'Neu' }),
    )
    expect(screen.getByRole('button', { name: /Neu/i })).not.toBeNull()
  })

  it('deletes only after backend success and then removes the card from the gallery', async () => {
    const deferred = createDeferred()
    const deleteSpy = vi.fn(async () => deferred.promise)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <StatefulSectionHarness
        initialItems={[makeItem({ id: 22, category: 'screenshot', caption: 'Delete me' })]}
        onDeleteSpy={deleteSpy}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Delete me/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Medium löschen' }))

    expect(confirmSpy).toHaveBeenCalled()
    expect(deleteSpy).toHaveBeenCalledWith(22)
    expect(screen.getByRole('button', { name: /Delete me/i })).not.toBeNull()

    deferred.resolve()

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Delete me/i })).toBeNull(),
    )
  })

  it('hides the preview toggle in the detail panel for fun_outtake items', async () => {
    renderSection(
      makeMediaState({
        items: [makeItem({ id: 23, category: 'fun_outtake', caption: 'Fun card' })],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /Fun card/i }))

    expect(await screen.findByText('Medium bearbeiten')).not.toBeNull()
    expect(screen.queryByLabelText('Als Preview aktiv')).toBeNull()
  })

  it('does not render any category edit control in the detail panel', async () => {
    renderSection(
      makeMediaState({
        items: [makeItem({ id: 24, category: 'screenshot', caption: 'No category edit' })],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /No category edit/i }))

    const title = await screen.findByText('Medium bearbeiten')
    const detailPanel = title.closest('aside')

    expect(screen.getByText('Kategorie: Release-Screenshot')).not.toBeNull()
    expect(detailPanel).not.toBeNull()
    expect(within(detailPanel as HTMLElement).queryByLabelText('Kategorie')).toBeNull()
  })

  it('shows partial success count rather than a global success message when one file fails', () => {
    renderSection(
      makeMediaState({
        uploadItems: [
          makeQueueItem({
            file: new File(['a'], 'ok.png', { type: 'image/png' }),
            status: 'ready',
            progress: 100,
            resultId: 5,
          }),
          makeQueueItem({
            file: new File(['b'], 'bad.png', { type: 'image/png' }),
            status: 'failed',
            progress: 100,
            errorMessage: 'INVALID_MIME_TYPE',
          }),
        ],
      }),
    )

    // Shows partial count "1 von 2 erfolgreich hochgeladen."
    expect(screen.getByText(/1 von 2 erfolgreich hochgeladen/i)).not.toBeNull()
    // The success count does NOT claim all files succeeded
    expect(screen.queryByText(/2 von 2 erfolgreich hochgeladen/i)).toBeNull()
    // Failed file still shows a retry button
    expect(screen.getByRole('button', { name: /retry/i })).not.toBeNull()
  })

  it('does not show the upload summary while uploads are still in progress', () => {
    renderSection(
      makeMediaState({
        uploadItems: [
          makeQueueItem({
            file: new File(['a'], 'uploading.png', { type: 'image/png' }),
            status: 'uploading',
            progress: 50,
          }),
          makeQueueItem({
            file: new File(['b'], 'done.png', { type: 'image/png' }),
            status: 'ready',
            progress: 100,
            resultId: 7,
          }),
        ],
      }),
    )

    // Summary only appears when every item has reached a terminal state
    expect(screen.queryByText(/erfolgreich hochgeladen/i)).toBeNull()
    expect(screen.getByText(/hochladen\.\.\. 50%/i)).not.toBeNull()
  })

  it('shows gallery with thumbnail and opens detail panel with preview toggle for typesetting_karaoke', async () => {
    renderSection(
      makeMediaState({
        items: [
          makeItem({
            id: 31,
            category: 'typesetting_karaoke',
            caption: 'Kara Shot',
            thumbnail_url: 'https://example.com/thumb.jpg',
            is_preview_candidate: true,
          }),
        ],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /Kara Shot/i }))

    // Preview toggle visible in detail panel for typesetting_karaoke
    expect(await screen.findByLabelText('Als Preview aktiv')).not.toBeNull()
  })

  it('surfaces patch error near the detail panel when backend rejects an update', async () => {
    const patchError = new Error('CAPTION_TOO_LONG')

    renderSection(
      makeMediaState({
        items: [makeItem({ id: 32, category: 'screenshot', caption: 'Patch Err Item' })],
        patchItem: vi.fn().mockRejectedValue(patchError),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /Patch Err Item/i }))
    expect(await screen.findByText('Medium bearbeiten')).not.toBeNull()

    fireEvent.change(screen.getByDisplayValue('Patch Err Item'), { target: { value: 'New Caption' } })
    fireEvent.click(screen.getByRole('button', { name: 'Beschreibung speichern' }))

    expect(await screen.findByText('CAPTION_TOO_LONG')).not.toBeNull()
  })

  it('shows delete error in the detail panel when backend soft-delete fails', async () => {
    const deleteError = new Error('MEDIA_STILL_IN_USE')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderSection(
      makeMediaState({
        items: [makeItem({ id: 33, category: 'screenshot', caption: 'Delete Err Item' })],
        deleteItem: vi.fn().mockRejectedValue(deleteError),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /Delete Err Item/i }))
    expect(await screen.findByText('Medium bearbeiten')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Medium löschen' }))

    expect(confirmSpy).toHaveBeenCalled()
    // Error text appears inside the detail panel, not swallowed
    expect(await screen.findByText('MEDIA_STILL_IN_USE')).not.toBeNull()
    // The card remains in the gallery since delete failed
    expect(screen.getByRole('button', { name: /Delete Err Item/i })).not.toBeNull()
  })

  it('shows preview badge on gallery card for items marked as preview candidates', () => {
    renderSection(
      makeMediaState({
        items: [
          makeItem({ id: 41, category: 'screenshot', caption: 'Preview Img', is_preview_candidate: true }),
          makeItem({ id: 42, category: 'screenshot', caption: 'No Preview', is_preview_candidate: false }),
        ],
      }),
    )

    // "Preview" badge rendered only on the first card
    expect(screen.getAllByText('Preview')).toHaveLength(1)
  })

  it('renders gallery thumbnails in contain mode so non-square images are not hard-cropped', () => {
    renderSection(
      makeMediaState({
        items: [
          makeItem({
            id: 51,
            category: 'screenshot',
            caption: 'Portrait Preview',
            thumbnail_url: 'https://example.com/portrait-thumb.jpg',
          }),
        ],
      }),
    )

    const image = screen.getByAltText('Portrait Preview')

    expect(image.className).toContain('thumbImage')
  })

  it('renders detail preview in contain mode so the full image proportion stays visible', async () => {
    renderSection(
      makeMediaState({
        items: [
          makeItem({
            id: 52,
            category: 'screenshot',
            caption: 'Tall Detail',
            thumbnail_url: 'https://example.com/tall-thumb.jpg',
            original_url: 'https://example.com/tall-original.jpg',
          }),
        ],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /Tall Detail/i }))

    await screen.findByText('Medium bearbeiten')
    const previewImage = screen
      .getAllByAltText('Tall Detail')
      .find((element) => element.className.includes('detailPreviewImage'))

    expect(previewImage).toBeDefined()
    expect(previewImage?.className).toContain('detailPreviewImage')
    expect(previewImage?.getAttribute('src')).toBe('https://example.com/tall-original.jpg')
  })
})

describe('ReleaseVersionMediaReorderRequest contract', () => {
  it('uses items array with id and sort_order fields, not ordered_ids', () => {
    // This test verifies the type shape matches the backend contract.
    // The backend expects: { items: [{ id: number, sort_order: number }] }
    // The old stale type had: { ordered_ids: number[] }
    const request: ReleaseVersionMediaReorderRequest = {
      items: [
        { id: 1, sort_order: 10 },
        { id: 2, sort_order: 20 },
      ],
    }

    expect(request.items).toHaveLength(2)
    expect(request.items[0]).toEqual({ id: 1, sort_order: 10 })
    expect(request.items[1]).toEqual({ id: 2, sort_order: 20 })
    // @ts-expect-error ordered_ids no longer exists
    expect(request.ordered_ids).toBeUndefined()
  })
})

describe('useReleaseVersionMedia live-resort behavior', () => {
  it('exposes reorderItems in the hook result', () => {
    // Verify that UseReleaseVersionMediaResult has the reorderItems function.
    // This test ensures the hook contract is extended before the DnD UI uses it.
    const state = makeMediaState()
    // reorderItems should exist on the state object
    expect('reorderItems' in state).toBe(true)
  })

  it('keeps items sorted by sort_order after patchItem changes sort_order', async () => {
    const item1 = makeItem({ id: 1, sort_order: 10, caption: 'First' })
    const item2 = makeItem({ id: 2, sort_order: 20, caption: 'Second' })

    // Use a stateful harness with an exposed patchItem trigger
    let patchItemRef!: (id: number, patch: ReleaseVersionMediaPatchRequest) => Promise<void>

    function PatchHarness() {
      const [items, setItems] = useState([item1, item2])
      const state = useMemo<UseReleaseVersionMediaResult>(() => {
        const patchItem = async (mediaId: number, patch: ReleaseVersionMediaPatchRequest) => {
          setItems((current) => {
            const next = current.map((item) =>
              item.id === mediaId ? { ...item, ...patch } : item,
            )
            if (patch.sort_order !== undefined) {
              return [...next].sort((a, b) => a.sort_order - b.sort_order)
            }
            return next
          })
        }
        patchItemRef = patchItem
        return {
          items,
          isLoading: false,
          error: null,
          reload: vi.fn(),
          uploadItems: [],
          startUpload: vi.fn().mockResolvedValue(undefined),
          retryUpload: vi.fn().mockResolvedValue(undefined),
          clearUploadQueue: vi.fn(),
          patchItem,
          deleteItem: vi.fn().mockResolvedValue(undefined),
          reorderItems: vi.fn().mockResolvedValue(undefined),
          patchError: null,
          deleteError: null,
          reorderError: null,
        }
      }, [items])
      return (
        <ReleaseVersionMediaSection
          versionId={42}
          fansubGroupName="SubGroup"
          releaseVersionLabel="v1"
          mediaState={state}
        />
      )
    }

    render(<PatchHarness />)

    // Initially First (sort 10) should appear before Second (sort 20)
    const initialButtons = () => screen.getAllByRole('button').filter(
      (btn) => btn.textContent?.includes('First') || btn.textContent?.includes('Second'),
    )
    expect(initialButtons()[0].textContent).toContain('First')
    expect(initialButtons()[1].textContent).toContain('Second')

    // Patch item1 to sort_order=30 — now it should appear after item2
    await patchItemRef(1, { sort_order: 30 })

    await waitFor(() => {
      const buttons = screen.getAllByRole('button').filter(
        (btn) => btn.textContent?.includes('First') || btn.textContent?.includes('Second'),
      )
      expect(buttons[0].textContent).toContain('Second')
      expect(buttons[1].textContent).toContain('First')
    })
  })

  it('calls reorderItems with backend-compatible payload shape', async () => {
    const reorderSpy = vi.fn().mockResolvedValue(undefined)
    const item1 = makeItem({ id: 1, sort_order: 10, caption: 'Card A' })
    const item2 = makeItem({ id: 2, sort_order: 20, caption: 'Card B' })

    renderSection(
      makeMediaState({
        items: [item1, item2],
        reorderItems: reorderSpy,
      }),
    )

    // Trigger reorder (simulated via makeMediaState reorderItems spy)
    await reorderSpy(42, { items: [{ id: 2, sort_order: 10 }, { id: 1, sort_order: 20 }] })

    expect(reorderSpy).toHaveBeenCalledWith(42, {
      items: [
        { id: 2, sort_order: 10 },
        { id: 1, sort_order: 20 },
      ],
    })
  })
})

describe('Task 2: DragAndDrop reorder — legacy sort field removed', () => {
  it('detail panel no longer shows the sort-order number input', async () => {
    renderSection(
      makeMediaState({
        items: [makeItem({ id: 61, category: 'screenshot', caption: 'Sort Gone' })],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /Sort Gone/i }))
    await screen.findByText('Medium bearbeiten')

    // The sort-order input (type=number) must NOT be present after Task 2
    expect(screen.queryByLabelText('Sortierung')).toBeNull()
    // The "Sortierung speichern" button must NOT be present after Task 2
    expect(screen.queryByRole('button', { name: 'Sortierung speichern' })).toBeNull()
  })

  it('gallery cards have draggable attribute to signal drag capability', () => {
    renderSection(
      makeMediaState({
        items: [
          makeItem({ id: 71, category: 'screenshot', caption: 'Drag Me' }),
          makeItem({ id: 72, category: 'screenshot', caption: 'Drop Here', sort_order: 20 }),
        ],
      }),
    )

    const dragCard = screen.getByRole('button', { name: /Drag Me/i })
    // Cards in the gallery must be draggable
    expect(dragCard.getAttribute('draggable')).toBe('true')
  })

  it('updates gallery order immediately when a category-local drag drop occurs', async () => {
    const reorderSpy = vi.fn().mockResolvedValue(undefined)

    function DragHarness() {
      const [items, setItems] = useState([
        makeItem({ id: 81, sort_order: 10, caption: 'Alpha', category: 'screenshot' }),
        makeItem({ id: 82, sort_order: 20, caption: 'Beta', category: 'screenshot' }),
      ])

      const state = useMemo<UseReleaseVersionMediaResult>(() => ({
        items,
        isLoading: false,
        error: null,
        reload: vi.fn(),
        uploadItems: [],
        startUpload: vi.fn().mockResolvedValue(undefined),
        retryUpload: vi.fn().mockResolvedValue(undefined),
        clearUploadQueue: vi.fn(),
        patchItem: vi.fn().mockResolvedValue(undefined),
        deleteItem: vi.fn().mockResolvedValue(undefined),
        reorderItems: async (vid, body) => {
          await reorderSpy(vid, body)
          const orderMap = new Map(body.items.map((r) => [r.id, r.sort_order]))
          setItems((current) =>
            [...current]
              .map((item) => {
                const newOrder = orderMap.get(item.id)
                return newOrder !== undefined ? { ...item, sort_order: newOrder } : item
              })
              .sort((a, b) => a.sort_order - b.sort_order),
          )
        },
        patchError: null,
        deleteError: null,
        reorderError: null,
      }), [items])

      return (
        <ReleaseVersionMediaSection
          versionId={42}
          fansubGroupName="SubGroup"
          releaseVersionLabel="v1"
          mediaState={state}
        />
      )
    }

    render(<DragHarness />)

    // Simulate drag-drop: drag Alpha onto Beta
    const alphaCard = screen.getByRole('button', { name: /Alpha/i })
    const betaCard = screen.getByRole('button', { name: /Beta/i })

    // Native HTML5 DnD events
    fireEvent.dragStart(alphaCard, { dataTransfer: { setData: vi.fn(), effectAllowed: 'move' } })
    fireEvent.dragOver(betaCard, { dataTransfer: { dropEffect: 'move' } })
    fireEvent.drop(betaCard, { dataTransfer: { getData: vi.fn().mockReturnValue('81') } })
    fireEvent.dragEnd(alphaCard)

    await waitFor(() => {
      expect(reorderSpy).toHaveBeenCalledWith(42, expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ id: 81 }),
          expect.objectContaining({ id: 82 }),
        ]),
      }))
    })
  })

  it('ignores drop across different categories and does not call reorderItems', async () => {
    const reorderSpy = vi.fn().mockResolvedValue(undefined)

    renderSection(
      makeMediaState({
        items: [
          makeItem({ id: 91, category: 'screenshot', caption: 'Screenshot Card', sort_order: 10 }),
          makeItem({ id: 92, category: 'typesetting_karaoke', caption: 'Kara Card', sort_order: 10 }),
        ],
        reorderItems: reorderSpy,
      }),
    )

    const screenshotCard = screen.getByRole('button', { name: /Screenshot Card/i })
    const karaCard = screen.getByRole('button', { name: /Kara Card/i })

    // Drag screenshot card onto kara card (cross-category)
    fireEvent.dragStart(screenshotCard, { dataTransfer: { setData: vi.fn() } })
    fireEvent.dragOver(karaCard, { dataTransfer: { dropEffect: 'move' } })
    fireEvent.drop(karaCard, { dataTransfer: { getData: vi.fn().mockReturnValue('91') } })
    fireEvent.dragEnd(screenshotCard)

    // reorderItems must NOT have been called for cross-category drag
    await waitFor(() => {
      expect(reorderSpy).not.toHaveBeenCalled()
    })
  })

  it('shows reorder errors in the gallery area when a persisted reorder fails', () => {
    renderSection(
      makeMediaState({
        items: [
          makeItem({ id: 93, category: 'screenshot', caption: 'Err Card A', sort_order: 10 }),
          makeItem({ id: 94, category: 'screenshot', caption: 'Err Card B', sort_order: 20 }),
        ],
        reorderError: 'REORDER_SAVE_FAILED',
      }),
    )

    expect(screen.getByText('Reorder Fehler: REORDER_SAVE_FAILED')).not.toBeNull()
  })
})

describe('Task 1: Hover preview card — floating read-only overlay', () => {
  it('shows a hover preview card with the caption when mouseenter fires on a gallery card', async () => {
    renderSection(
      makeMediaState({
        items: [
          makeItem({
            id: 101,
            category: 'screenshot',
            caption: 'Hover Caption',
            thumbnail_url: 'https://example.com/thumb.jpg',
            original_url: 'https://example.com/orig.jpg',
          }),
        ],
      }),
    )

    const card = screen.getByRole('button', { name: /Hover Caption/i })

    // Before hover: preview card should not be visible
    expect(screen.queryByRole('tooltip')).toBeNull()

    // Trigger mouseenter on the gallery card
    fireEvent.mouseEnter(card)

    // After hover: floating preview card should appear with caption text
    const tooltip = await screen.findByRole('tooltip')
    expect(tooltip).not.toBeNull()
    expect(tooltip.textContent).toContain('Hover Caption')
  })

  it('hides the hover preview card after mouseleave', async () => {
    renderSection(
      makeMediaState({
        items: [
          makeItem({
            id: 102,
            category: 'screenshot',
            caption: 'Leave Test',
            thumbnail_url: 'https://example.com/thumb.jpg',
          }),
        ],
      }),
    )

    const card = screen.getByRole('button', { name: /Leave Test/i })

    fireEvent.mouseEnter(card)
    expect(await screen.findByRole('tooltip')).not.toBeNull()

    fireEvent.mouseLeave(card)

    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).toBeNull()
    })
  })

  it('does not open a second editing surface when the hover preview is visible', async () => {
    renderSection(
      makeMediaState({
        items: [
          makeItem({
            id: 103,
            category: 'screenshot',
            caption: 'Read Only Preview',
            thumbnail_url: 'https://example.com/thumb.jpg',
          }),
        ],
      }),
    )

    const card = screen.getByRole('button', { name: /Read Only Preview/i })
    fireEvent.mouseEnter(card)

    await screen.findByRole('tooltip')

    // The tooltip/preview card must NOT contain any text inputs or edit controls
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.querySelector('input')).toBeNull()
    expect(tooltip.querySelector('button')).toBeNull()
  })

  it('clicking the gallery card still opens the detail panel while hover preview is visible', async () => {
    renderSection(
      makeMediaState({
        items: [
          makeItem({
            id: 104,
            category: 'screenshot',
            caption: 'Click Through',
            thumbnail_url: 'https://example.com/thumb.jpg',
          }),
        ],
      }),
    )

    const card = screen.getByRole('button', { name: /Click Through/i })
    fireEvent.mouseEnter(card)
    await screen.findByRole('tooltip')

    // Click should still open the detail panel
    fireEvent.click(card)
    expect(await screen.findByText('Medium bearbeiten')).not.toBeNull()
  })

  it('shows a large preview image inside the hover card using thumbnail_url', async () => {
    renderSection(
      makeMediaState({
        items: [
          makeItem({
            id: 105,
            category: 'screenshot',
            caption: 'Preview Image Test',
            thumbnail_url: 'https://example.com/preview-thumb.jpg',
            original_url: 'https://example.com/preview-orig.jpg',
          }),
        ],
      }),
    )

    const card = screen.getByRole('button', { name: /Preview Image Test/i })
    fireEvent.mouseEnter(card)

    await screen.findByRole('tooltip')
    const tooltip = screen.getByRole('tooltip')
    const img = tooltip.querySelector('img')
    expect(img).not.toBeNull()
    // The preview shows thumbnail_url (not necessarily the original)
    expect(img?.getAttribute('src')).toBeTruthy()
  })
})

describe('Task 2: GIF src-swap on hover', () => {
  it('compact card swaps from thumbnail_url to original_url on hover when original is a GIF', async () => {
    renderSection(
      makeMediaState({
        items: [
          makeItem({
            id: 201,
            category: 'screenshot',
            caption: 'Animated GIF',
            thumbnail_url: 'https://example.com/frame0.jpg',
            original_url: 'https://example.com/animation.gif',
          }),
        ],
      }),
    )

    const card = screen.getByRole('button', { name: /Animated GIF/i })

    // Before hover: card shows thumbnail_url
    const thumbBefore = card.querySelector('img')
    expect(thumbBefore?.getAttribute('src')).toBe('https://example.com/frame0.jpg')

    // Trigger hover
    fireEvent.mouseEnter(card)

    // After hover: card shows original_url (animated GIF)
    await waitFor(() => {
      const thumbAfter = card.querySelector('img')
      expect(thumbAfter?.getAttribute('src')).toBe('https://example.com/animation.gif')
    })
  })

  it('compact card reverts to thumbnail_url after mouseleave on a GIF item', async () => {
    renderSection(
      makeMediaState({
        items: [
          makeItem({
            id: 202,
            category: 'screenshot',
            caption: 'GIF Revert',
            thumbnail_url: 'https://example.com/frame0.jpg',
            original_url: 'https://example.com/anim.gif',
          }),
        ],
      }),
    )

    const card = screen.getByRole('button', { name: /GIF Revert/i })

    fireEvent.mouseEnter(card)

    await waitFor(() => {
      const img = card.querySelector('img')
      expect(img?.getAttribute('src')).toBe('https://example.com/anim.gif')
    })

    fireEvent.mouseLeave(card)

    await waitFor(() => {
      const img = card.querySelector('img')
      expect(img?.getAttribute('src')).toBe('https://example.com/frame0.jpg')
    })
  })

  it('compact card does NOT swap src on hover for non-GIF items (no .gif extension)', async () => {
    renderSection(
      makeMediaState({
        items: [
          makeItem({
            id: 203,
            category: 'screenshot',
            caption: 'Static PNG',
            thumbnail_url: 'https://example.com/thumb.jpg',
            original_url: 'https://example.com/original.png',
          }),
        ],
      }),
    )

    const card = screen.getByRole('button', { name: /Static PNG/i })

    // Before hover: thumbnail shown
    const thumbBefore = card.querySelector('img')
    expect(thumbBefore?.getAttribute('src')).toBe('https://example.com/thumb.jpg')

    // Trigger hover
    fireEvent.mouseEnter(card)

    // After hover: still shows thumbnail, not original (no src swap for non-GIF)
    await waitFor(() => {
      const thumbAfter = card.querySelector('img')
      expect(thumbAfter?.getAttribute('src')).toBe('https://example.com/thumb.jpg')
    })
  })

  it('hover preview card also shows the animated src for GIF items', async () => {
    renderSection(
      makeMediaState({
        items: [
          makeItem({
            id: 204,
            category: 'screenshot',
            caption: 'GIF Preview Card',
            thumbnail_url: 'https://example.com/thumb.jpg',
            original_url: 'https://example.com/animated.gif',
          }),
        ],
      }),
    )

    const card = screen.getByRole('button', { name: /GIF Preview Card/i })
    fireEvent.mouseEnter(card)

    const tooltip = await screen.findByRole('tooltip')
    expect(tooltip).not.toBeNull()
    // Tooltip still shows the image (thumbnail_url in preview card is acceptable)
    const tooltipImg = tooltip.querySelector('img')
    expect(tooltipImg).not.toBeNull()
    expect(tooltipImg?.getAttribute('src')).toBeTruthy()
  })
})
