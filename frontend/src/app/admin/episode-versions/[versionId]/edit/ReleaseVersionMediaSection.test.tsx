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
import type { UploadQueueItem, UseReleaseVersionMediaResult } from './useReleaseVersionMedia'

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
    startUpload: vi.fn().mockResolvedValue(undefined),
    retryUpload: vi.fn().mockResolvedValue(undefined),
    clearUploadQueue: vi.fn(),
    patchItem: vi.fn().mockResolvedValue(undefined),
    deleteItem: vi.fn().mockResolvedValue(undefined),
    reorderItems: vi.fn().mockResolvedValue(undefined),
    patchError: null,
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
    const startUpload = vi.fn().mockResolvedValue(undefined)
    renderSection(makeMediaState({ items: [makeItem()], startUpload }))

    openUploadSheet()
    const file = new File(['demo'], 'ready.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Dateien'), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Upload starten' }))

    await waitFor(() => {
      expect(startUpload).toHaveBeenCalledWith('screenshot', [file], '', false, undefined, undefined)
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

  it('opens edit sheet and maps visible Öffentlich status to the existing API fields', async () => {
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
    fireEvent.change(within(dialog).getByRole('combobox'), { target: { value: 'oeffentlich' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      expect(patchItem).toHaveBeenCalledWith(31, {
        caption: 'Neue Beschreibung',
        visibility: 'oeffentlich',
        review_status: 'freigegeben',
      })
    })
    expect((await screen.findByRole('status')).textContent).toContain('Änderungen gespeichert.')
  })

  it('offers a narrow preview action for owned eligible media', async () => {
    const patchItem = vi.fn().mockResolvedValue(undefined)
    renderSection(makeMediaState({ items: [makeItem({ id: 71, can_update: true })], patchItem }))

    fireEvent.click(screen.getByRole('button', { name: 'Als Vorschau wählen' }))

    await waitFor(() => expect(patchItem).toHaveBeenCalledWith(71, { is_preview_candidate: true }))
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
        items: [makeItem({ id: 51, caption: 'CSubs upload', can_update: false, can_delete: false })],
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
