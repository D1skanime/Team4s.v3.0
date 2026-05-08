// @vitest-environment jsdom

import { useMemo, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import type {
  ReleaseVersionMediaItem,
  ReleaseVersionMediaPatchRequest,
} from '@/types/releaseVersionMedia'

import { ReleaseVersionMediaSection } from './ReleaseVersionMediaSection'
import type { UploadQueueItem, UseReleaseVersionMediaResult } from './useReleaseVersionMedia'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
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
    patchError: null,
    deleteError: null,
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
        setItems((current) =>
          current.map((item) =>
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
          ),
        )
      },
      deleteItem: async (mediaId) => {
        await onDeleteSpy?.(mediaId)
        setItems((current) => current.filter((item) => item.id !== mediaId))
      },
      patchError: null,
      deleteError: null,
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
    fireEvent.click(screen.getByRole('button', { name: 'Medium loeschen' }))

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
    const patchError = new Error('SORT_ORDER_OUT_OF_RANGE')

    renderSection(
      makeMediaState({
        items: [makeItem({ id: 32, category: 'screenshot', caption: 'Patch Err Item' })],
        patchItem: vi.fn().mockRejectedValue(patchError),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /Patch Err Item/i }))
    expect(await screen.findByText('Medium bearbeiten')).not.toBeNull()

    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: '-99' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sortierung speichern' }))

    expect(await screen.findByText('SORT_ORDER_OUT_OF_RANGE')).not.toBeNull()
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
    fireEvent.click(screen.getByRole('button', { name: 'Medium loeschen' }))

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
})
