// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import type {
  ReleaseVersionCapabilities,
  ReleaseVersionMediaItem,
} from '@/types/releaseVersionMedia'

import { ReleaseVersionMediaSection } from './ReleaseVersionMediaSection'
import type { UploadQueueItem, UploadRunResult, UseReleaseVersionMediaResult } from './useReleaseVersionMedia'

const api = vi.hoisted(() => ({
  getReleaseVersionMedia: vi.fn(),
  getReleaseVersionCapabilities: vi.fn(),
  patchReleaseVersionMediaItem: vi.fn(),
  deleteReleaseVersionMediaItem: vi.fn(),
  reorderReleaseVersionMedia: vi.fn(),
  uploadReleaseVersionMedia: vi.fn(),
  replaceReleaseVersionMediaFile: vi.fn(),
}))
vi.mock('@/lib/api', () => ({ ApiError: class extends Error {}, ...api }))

const mediaSectionCSS = readFileSync(resolve(process.cwd(), 'src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.module.css'), 'utf8')

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:test-preview'),
    revokeObjectURL: vi.fn(),
  })
  vi.clearAllMocks()
  api.getReleaseVersionMedia.mockResolvedValue({ data: [] })
  api.getReleaseVersionCapabilities.mockResolvedValue({
    data: {
      can_view_media: true,
      can_upload_media: true,
      can_update_media: true,
      can_delete_media: true,
      can_delete_own_media: true,
      can_edit_notes: true,
      can_manage_segments: false,
    },
  })
})

function makeItem(overrides: Partial<ReleaseVersionMediaItem> = {}): ReleaseVersionMediaItem {
  return {
    id: 1,
    release_version_id: 42,
    media_asset_id: 10,
    category: 'screenshot',
    caption: 'Scene A',
    sort_order: 10,
    is_preview_candidate: false,
    visibility: 'intern',
    review_status: 'in_pruefung',
    thumbnail_url: 'https://example.com/thumb.jpg',
    original_url: 'https://example.com/original.png',
    uploaded_by_user_id: 1,
    can_update: true,
    can_delete: true,
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
  const defaultCapabilities: ReleaseVersionCapabilities = {
    can_view_media: true,
    can_upload_media: true,
    can_update_media: true,
    can_delete_media: true,
    can_delete_own_media: true,
    can_edit_notes: true,
    can_manage_segments: false,
  }

  return {
    items: [],
    isLoading: false,
    error: null,
    reload: vi.fn(),
    uploadItems: [],
    startUpload: vi.fn().mockResolvedValue({ allSucceeded: true, items: [] } satisfies UploadRunResult),
    retryUpload: vi.fn().mockResolvedValue({ allSucceeded: true, items: [] } satisfies UploadRunResult),
    clearUploadQueue: vi.fn(),
    patchItem: vi.fn().mockResolvedValue(undefined),
    replaceItem: vi.fn().mockResolvedValue(undefined),
    deleteItem: vi.fn().mockResolvedValue(undefined),
    reorderItems: vi.fn().mockResolvedValue(undefined),
    patchError: null,
    replaceError: null,
    deleteError: null,
    reorderError: null,
    capabilities: defaultCapabilities,
    capabilitiesError: null,
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

function openUploadSheet() {
  fireEvent.click(screen.getByRole('button', { name: /^Hochladen$/ }))
}

describe('ReleaseVersionMediaSection Phase 90 upload redesign', () => {
  it('keeps the media-card opener reset and preview spacing outside the mobile query', () => {
    const css = mediaSectionCSS
    const mobileQuery = css.indexOf('@media (max-width: 760px)')
    expect(css.indexOf('.mediaCardOpen')).toBeGreaterThan(-1)
    expect(css.indexOf('.mediaCardOpen')).toBeLessThan(mobileQuery)
    expect(css.indexOf('.mediaCard > :global(button:last-child)')).toBeLessThan(mobileQuery)
    expect(css).toContain('width: 100%')
    expect(css).toContain('font: inherit')
  })
  it('renders one segmented category control and no category dropdown', () => {
    renderSection(makeMediaState())

    const tablist = screen.getByRole('tablist', { name: 'Medienkategorie' })

    expect(within(tablist).getAllByRole('tab')).toHaveLength(4)
    expect(within(tablist).getByRole('tab', { name: /Screenshot 0/i }).getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByLabelText('Kategorie')).toBeNull()
  })

  it('shows only assets from the active category and switches without reload', () => {
    renderSection(
      makeMediaState({
        items: [
          makeItem({ id: 11, category: 'screenshot', caption: 'Screenshot Asset' }),
          makeItem({ id: 12, category: 'typesetting_karaoke', caption: 'Karaoke Asset' }),
        ],
      }),
    )

    expect(screen.getByRole('button', { name: /Screenshot Asset bearbeiten/i })).not.toBeNull()
    expect(screen.queryByRole('button', { name: /Karaoke Asset bearbeiten/i })).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: /Typesetting \/ Karaoke 1/i }))

    expect(screen.queryByRole('button', { name: /Screenshot Asset bearbeiten/i })).toBeNull()
    expect(screen.getByRole('button', { name: /Karaoke Asset bearbeiten/i })).not.toBeNull()
  })

  it('opens upload as a bottom-sheet without an editable status select', () => {
    renderSection(makeMediaState({ items: [makeItem()] }))

    openUploadSheet()

    const dialog = screen.getByRole('dialog', { name: 'Medien hochladen' })
    expect(within(dialog).getByText('Neue Uploads starten als „In Prüfung“ und werden im Review freigegeben.')).not.toBeNull()
    expect(within(dialog).queryByRole('combobox')).toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Upload starten' })).toHaveProperty('disabled', true)
  })

  it('starts upload with the active category after a file was selected', async () => {
    const startUpload = vi.fn().mockResolvedValue({ allSucceeded: true, items: [] } satisfies UploadRunResult)
    renderSection(makeMediaState({ items: [makeItem()], startUpload }))

    openUploadSheet()
    const file = new File(['demo'], 'ready.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Dateien'), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Upload starten' }))

    await waitFor(() => {
      expect(startUpload).toHaveBeenCalledWith('screenshot', [file], '', false)
    })
    expect((await screen.findByRole('status')).textContent).toContain('Upload abgeschlossen.')
  })

  it('renders compact status chips from existing visibility and review fields', () => {
    renderSection(
      makeMediaState({
        items: [
          makeItem({ id: 21, caption: 'Reviewing', review_status: 'in_pruefung' }),
          makeItem({ id: 22, caption: 'Public', review_status: 'freigegeben', visibility: 'oeffentlich' }),
        ],
      }),
    )

    expect(screen.getByText('Reviewing')).not.toBeNull()
    expect(screen.getByText('In Prüfung')).not.toBeNull()
    expect(screen.getByText('Public')).not.toBeNull()
    expect(screen.getByText('Öffentlich')).not.toBeNull()
  })

  it('öffnet den Editor ohne Review- oder Publikationsauswahl und speichert nur fachliche Felder', async () => {
    const patchItem = vi.fn().mockResolvedValue(undefined)
    renderSection(
      makeMediaState({
        items: [makeItem({ id: 31, caption: 'Edit me' })],
        patchItem,
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /Edit me bearbeiten/i }))
    const dialog = await screen.findByRole('dialog', { name: 'Medium bearbeiten' })

    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Neue Beschreibung' } })
    expect(within(dialog).queryByRole('combobox')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      expect(patchItem).toHaveBeenCalledWith(31, {
        caption: 'Neue Beschreibung',
      })
    })
    expect((await screen.findByRole('status')).textContent).toContain('Änderungen gespeichert.')
  })

  it('zeigt Pending und letzte Aktivität aus dem eigenen Lifecycle', () => {
    renderSection(makeMediaState({
      items: [makeItem({
        id: 61,
        review_state: 'pending',
        source_revision: 1,
        last_activity_at: '2026-07-23T18:30:00Z',
      })],
    }))

    expect(screen.getByText('In Prüfung')).not.toBeNull()
    expect(screen.getByText(/letzte aktivität/i)).not.toBeNull()
  })

  it('zeigt Ablehnungsdetails und reicht dieselbe Medien-ID mit Revision erneut ein', async () => {
    const patchItem = vi.fn().mockResolvedValue(undefined)
    renderSection(makeMediaState({
      items: [makeItem({
        id: 62,
        caption: 'Bitte korrigieren',
        review_state: 'rejected',
        source_revision: 2,
        last_activity_at: '2026-07-23T18:45:00Z',
        rejection_category: 'release_context.wrong',
        rejection_reason: 'Dieses Bild gehört zu einer anderen Release-Version.',
      })],
      patchItem,
    }))

    expect(screen.getByText('Abgelehnt')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Bitte korrigieren bearbeiten/i }))
    const dialog = await screen.findByRole('dialog', { name: 'Medium bearbeiten' })
    expect(within(dialog).getByText('Falscher Release-Kontext')).not.toBeNull()
    expect(within(dialog).getByText(/anderen Release-Version/i)).not.toBeNull()

    expect(within(dialog).getByRole('button', { name: 'Erneut einreichen' })).toHaveProperty('disabled', true)

    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Bitte korrigiert' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Überarbeitung einreichen' }))

    await waitFor(() => {
      expect(patchItem).toHaveBeenCalledWith(62, {
        caption: 'Bitte korrigiert',
        source_revision: 2,
      })
    })
  })

  it('zeigt bestätigte Medien öffentlich und ohne Review-Aktion', async () => {
    renderSection(makeMediaState({
      items: [makeItem({
        id: 63,
        review_state: 'confirmed',
        source_revision: 1,
        last_activity_at: '2026-07-23T19:00:00Z',
        visibility: 'oeffentlich',
        review_status: 'freigegeben',
      })],
    }))

    expect(screen.getByText('Bestätigt')).not.toBeNull()
    expect(screen.getByText('Öffentlich')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Scene A bearbeiten/i }))
    expect(within(await screen.findByRole('dialog')).queryByRole('button', { name: 'Erneut einreichen' })).toBeNull()
  })

  it('blendet fremde offene Medien ohne passende Fähigkeit aus', () => {
    renderSection(makeMediaState({
      items: [makeItem({
        id: 64,
        caption: 'Fremdes Pending',
        review_state: 'pending',
        source_revision: 1,
        last_activity_at: '2026-07-23T19:15:00Z',
        can_update: false,
        can_delete: false,
      })],
      capabilities: { ...makeMediaState().capabilities!, can_update_media: false },
    }))

    expect(screen.queryByText('Fremdes Pending')).toBeNull()
  })

  it('offers a narrow preview action for owned eligible media', async () => {
    const patchItem = vi.fn().mockResolvedValue(undefined)
    renderSection(makeMediaState({ items: [makeItem({ id: 71, can_update: true })], patchItem }))

    fireEvent.click(screen.getByRole('button', { name: 'Als Vorschau wählen' }))

    await waitFor(() => expect(patchItem).toHaveBeenCalledWith(71, { is_preview_candidate: true }))
  })

  it('marks the current preview persistently on its card and exposes the removal action', () => {
    renderSection(makeMediaState({ items: [makeItem({ id: 74, is_preview_candidate: true })] }))

    expect(screen.getByText('Aktuelles Vorschaubild')).not.toBeNull()
    expect(screen.getByRole('button', { name: /Scene A bearbeiten, aktuelles Vorschaubild/i })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Vorschau entfernen' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('hides preview selection for ineligible and readonly media', () => {
    renderSection(makeMediaState({
      items: [
        makeItem({ id: 72, category: 'fun_outtake', can_update: true }),
        makeItem({ id: 73, category: 'screenshot', can_update: false }),
      ],
      capabilities: { ...makeMediaState().capabilities!, can_update_media: false },
    }))
    expect(screen.queryByRole('button', { name: 'Als Vorschau wählen' })).toBeNull()
  })

  it('uses own-delete capability for the delete action without requiring all-delete', async () => {
    const deleteItem = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderSection(
      makeMediaState({
        items: [makeItem({ id: 41, caption: 'Own upload' })],
        deleteItem,
        capabilities: {
          can_view_media: true,
          can_upload_media: true,
          can_update_media: true,
          can_delete_media: false,
          can_delete_own_media: true,
          can_edit_notes: true,
          can_manage_segments: false,
        },
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /Own upload bearbeiten/i }))
    const dialog = await screen.findByRole('dialog', { name: 'Medium bearbeiten' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }))

    await waitFor(() => expect(deleteItem).toHaveBeenCalledWith(41))
  })

  it('keeps coop media visible but disables edit and delete for readonly items', async () => {
    const patchItem = vi.fn().mockResolvedValue(undefined)
    const deleteItem = vi.fn().mockResolvedValue(undefined)

    renderSection(
      makeMediaState({
        items: [makeItem({
          id: 51,
          caption: 'CSubs upload',
          can_update: false,
          can_delete: false,
          review_state: 'confirmed',
          source_revision: 1,
          last_activity_at: '2026-07-23T18:00:00Z',
        })],
        patchItem,
        deleteItem,
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /CSubs upload ansehen/i }))
    const dialog = await screen.findByRole('dialog', { name: 'Medium ansehen' })

    expect(within(dialog).getByRole('textbox')).toHaveProperty('disabled', true)
    expect(within(dialog).getByRole('button', { name: 'Speichern' })).toHaveProperty('disabled', true)
    expect(within(dialog).getByRole('button', { name: 'Löschen' })).toHaveProperty('disabled', true)
    expect(patchItem).not.toHaveBeenCalled()
    expect(deleteItem).not.toHaveBeenCalled()
  })

  it('keeps failed upload retry rows inside the upload sheet', () => {
    renderSection(
      makeMediaState({
        items: [makeItem()],
        uploadItems: [
          makeQueueItem({
            status: 'failed',
            errorMessage: 'INVALID_MIME_TYPE',
          }),
        ],
      }),
    )

    openUploadSheet()

    expect(screen.getByText('INVALID_MIME_TYPE')).not.toBeNull()
    expect(screen.getByRole('button', { name: /retry/i })).not.toBeNull()
  })
})

describe('ReleaseVersionMediaSection Phase 144 replace-file drawer', () => {
  it('zeigt Kategorie-Auswahl und Datei-ersetzen-Kontrolle nur für abgelehnte, editierbare Medien', async () => {
    renderSection(
      makeMediaState({
        items: [makeItem({
          id: 81,
          caption: 'Rejected Item',
          review_state: 'rejected',
          can_update: true,
          rejection_category: 'quality.insufficient',
          rejection_reason: 'Testgrund',
        })],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /Rejected Item bearbeiten/i }))
    const rejectedDialog = await screen.findByRole('dialog', { name: 'Medium bearbeiten' })
    expect(within(rejectedDialog).getByLabelText('Kategorie')).not.toBeNull()
    expect(within(rejectedDialog).getByLabelText('Ersatzdatei')).not.toBeNull()

    cleanup()

    renderSection(
      makeMediaState({
        items: [makeItem({
          id: 82,
          caption: 'Confirmed Item',
          review_state: 'confirmed',
          can_update: true,
        })],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /Confirmed Item bearbeiten/i }))
    const confirmedDialog = await screen.findByRole('dialog', { name: 'Medium bearbeiten' })
    expect(within(confirmedDialog).queryByLabelText('Kategorie')).toBeNull()
    expect(within(confirmedDialog).queryByLabelText('Ersatzdatei')).toBeNull()
  })

  it('primärer Button liest "Erneut einreichen" (deaktiviert) ohne Änderungen und "Überarbeitung einreichen" (aktiv) nach Datei-Auswahl', async () => {
    renderSection(
      makeMediaState({
        items: [makeItem({
          id: 83,
          caption: 'Needs Fix',
          review_state: 'rejected',
          can_update: true,
          rejection_category: 'quality.insufficient',
          rejection_reason: 'Testgrund',
        })],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /Needs Fix bearbeiten/i }))
    const dialog = await screen.findByRole('dialog', { name: 'Medium bearbeiten' })

    expect(within(dialog).getByRole('button', { name: 'Erneut einreichen' })).toHaveProperty('disabled', true)

    const file = new File(['x'], 'replacement.png', { type: 'image/png' })
    fireEvent.change(within(dialog).getByLabelText('Ersatzdatei'), { target: { files: [file] } })

    expect(within(dialog).getByRole('button', { name: 'Überarbeitung einreichen' })).toHaveProperty('disabled', false)
  })

  it('routet Submit mit gestagter Datei zu replaceItem, ohne gestagte Datei (nur Kategorie) zu patchItem', async () => {
    const replaceItem = vi.fn().mockResolvedValue(undefined)
    const patchItem = vi.fn().mockResolvedValue(undefined)
    renderSection(
      makeMediaState({
        items: [makeItem({
          id: 84,
          caption: 'Route Me',
          review_state: 'rejected',
          can_update: true,
          rejection_category: 'quality.insufficient',
          rejection_reason: 'Testgrund',
        })],
        replaceItem,
        patchItem,
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /Route Me bearbeiten/i }))
    const dialog = await screen.findByRole('dialog', { name: 'Medium bearbeiten' })

    const file = new File(['x'], 'replacement.png', { type: 'image/png' })
    fireEvent.change(within(dialog).getByLabelText('Ersatzdatei'), { target: { files: [file] } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Überarbeitung einreichen' }))

    await waitFor(() => {
      expect(replaceItem).toHaveBeenCalledWith(84, expect.objectContaining({ file }))
    })
    expect(patchItem).not.toHaveBeenCalled()

    cleanup()

    const replaceItem2 = vi.fn().mockResolvedValue(undefined)
    const patchItem2 = vi.fn().mockResolvedValue(undefined)
    renderSection(
      makeMediaState({
        items: [makeItem({
          id: 85,
          caption: 'Route Me Category',
          category: 'screenshot',
          review_state: 'rejected',
          can_update: true,
          rejection_category: 'quality.insufficient',
          rejection_reason: 'Testgrund',
        })],
        replaceItem: replaceItem2,
        patchItem: patchItem2,
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /Route Me Category bearbeiten/i }))
    const dialog2 = await screen.findByRole('dialog', { name: 'Medium bearbeiten' })

    fireEvent.change(within(dialog2).getByLabelText('Kategorie'), { target: { value: 'typesetting_karaoke' } })
    fireEvent.click(within(dialog2).getByRole('button', { name: 'Überarbeitung einreichen' }))

    await waitFor(() => {
      expect(patchItem2).toHaveBeenCalledWith(85, expect.objectContaining({ category: 'typesetting_karaoke' }))
    })
    expect(replaceItem2).not.toHaveBeenCalled()
  })
})

describe('ReleaseVersionMediaSection CR-01 upload failure gating (real hook, mocked @/lib/api)', () => {
  function renderLiveSection() {
    return render(
      <ReleaseVersionMediaSection
        versionId={42}
        fansubGroupName="SubGroup"
        releaseVersionLabel="v1"
      />,
    )
  }

  async function openLiveUploadSheetWithFiles(files: File[]) {
    renderLiveSection()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Hochladen$/ })).toHaveProperty('disabled', false)
    })
    openUploadSheet()
    fireEvent.change(screen.getByLabelText('Dateien'), { target: { files } })
  }

  it('shows the error banner and keeps the upload drawer open on a hard upload failure', async () => {
    api.uploadReleaseVersionMedia.mockRejectedValue(new Error('Netzwerkfehler beim Upload.'))
    const file = new File(['data'], 'scene.png', { type: 'image/png' })
    await openLiveUploadSheetWithFiles([file])

    fireEvent.click(screen.getByRole('button', { name: 'Upload starten' }))

    await waitFor(() => {
      expect(screen.getByText('Netzwerkfehler beim Upload.')).not.toBeNull()
    })
    expect(screen.queryByText('Upload abgeschlossen.')).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Medien hochladen' })).not.toBeNull()
  })

  it('keeps the upload drawer open with the failed file and a retry action on HTTP-200 total failure', async () => {
    api.uploadReleaseVersionMedia.mockResolvedValue({
      results: [{ client_file_name: 'scene.png', status: 'failed', error_code: 'INVALID_MIME_TYPE' }],
    })
    const file = new File(['data'], 'scene.png', { type: 'image/png' })
    await openLiveUploadSheetWithFiles([file])

    fireEvent.click(screen.getByRole('button', { name: 'Upload starten' }))

    const dialog = await screen.findByRole('dialog', { name: 'Medien hochladen' })
    await waitFor(() => {
      expect(within(dialog).getByText('INVALID_MIME_TYPE')).not.toBeNull()
    })
    expect(within(dialog).getByRole('button', { name: /retry/i })).not.toBeNull()
    expect(screen.queryByText('Upload abgeschlossen.')).toBeNull()
  })

  it('keeps the upload drawer open with the failed row visible on a partial failure', async () => {
    api.uploadReleaseVersionMedia.mockResolvedValue({
      results: [
        { client_file_name: 'good.png', status: 'ready', release_version_media_id: 501 },
        { client_file_name: 'bad.png', status: 'failed', error_code: 'INVALID_MIME_TYPE' },
      ],
    })
    const goodFile = new File(['good'], 'good.png', { type: 'image/png' })
    const badFile = new File(['bad'], 'bad.png', { type: 'image/png' })
    await openLiveUploadSheetWithFiles([goodFile, badFile])

    fireEvent.click(screen.getByRole('button', { name: 'Upload starten' }))

    const dialog = await screen.findByRole('dialog', { name: 'Medien hochladen' })
    await waitFor(() => {
      expect(within(dialog).getByText('INVALID_MIME_TYPE')).not.toBeNull()
    })
    expect(screen.queryByText('Upload abgeschlossen.')).toBeNull()
  })

  it('still shows the success toast and closes the drawer when every file succeeds', async () => {
    api.uploadReleaseVersionMedia.mockResolvedValue({
      results: [{ client_file_name: 'scene.png', status: 'ready', release_version_media_id: 502 }],
    })
    const file = new File(['data'], 'scene.png', { type: 'image/png' })
    await openLiveUploadSheetWithFiles([file])

    fireEvent.click(screen.getByRole('button', { name: 'Upload starten' }))

    expect((await screen.findByRole('status')).textContent).toContain('Upload abgeschlossen.')
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Medien hochladen' })).toBeNull()
    })
  })

  it('shows a friendly error and never leaves an unhandled rejection when a retry click fails', async () => {
    const retryUpload = vi.fn().mockRejectedValue(new Error('Netzwerkfehler bei erneutem Versuch.'))
    renderSection(
      makeMediaState({
        items: [makeItem()],
        uploadItems: [makeQueueItem({ status: 'failed', errorMessage: 'INVALID_MIME_TYPE' })],
        retryUpload,
      }),
    )

    openUploadSheet()
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => {
      expect(retryUpload).toHaveBeenCalledWith(0)
    })
    await waitFor(() => {
      expect(screen.getByText('Netzwerkfehler bei erneutem Versuch.')).not.toBeNull()
    })
  })
})
