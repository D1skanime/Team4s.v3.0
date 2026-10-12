// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import type {
  ReleaseVersionCapabilities,
  ReleaseVersionMediaItem,
} from '@/types/releaseVersionMedia'

import { ReleaseVersionMediaSection } from './ReleaseVersionMediaSection'
import { CATEGORY_OPTIONS } from './ReleaseVersionMediaSection.helpers'
import type { UseReleaseVersionMediaResult } from './useReleaseVersionMedia'

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

const NativeURL = URL

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.stubGlobal('URL', Object.assign(class extends NativeURL {}, {
    createObjectURL: vi.fn(() => 'blob:test-preview'),
    revokeObjectURL: vi.fn(),
  }))
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
      can_reorder_media: false,
      can_manage_highlights: false,
    },
  })
  // Generic default so patch calls that only care about the resolved shape (source_revision
  // threading) don't need a bespoke mock in every test that triggers an upload.
  api.patchReleaseVersionMediaItem.mockImplementation(async (_versionId: number, mediaId: number, patch: Record<string, unknown>) => ({
    id: mediaId,
    source_revision: (typeof patch.source_revision === 'number' ? patch.source_revision : 0) + 1,
  }))
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
    is_highlight: false,
    highlight_order: null,
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
    can_reorder_media: false,
    can_manage_highlights: false,
  }

  return {
    items: [],
    isLoading: false,
    error: null,
    reload: vi.fn(),
    patchItem: vi.fn().mockResolvedValue(undefined),
    replaceItem: vi.fn().mockResolvedValue(undefined),
    deleteItem: vi.fn().mockResolvedValue(undefined),
    reorderItems: vi.fn().mockResolvedValue(undefined),
    setHighlight: vi.fn().mockResolvedValue(undefined),
    reorderHighlights: vi.fn().mockResolvedValue(undefined),
    patchError: null,
    replaceError: null,
    deleteError: null,
    reorderError: null,
    highlightError: null,
    highlightReorderError: null,
    capabilities: defaultCapabilities,
    capabilitiesError: null,
    ...overrides,
  }
}

function renderSection(mediaState?: UseReleaseVersionMediaResult) {
  return render(
    <ReleaseVersionMediaSection
      versionId={42}
      contextTitle="Episode 001 · SubGroup v1"
      mediaState={mediaState}
    />,
  )
}

/** Renders with the real `useReleaseVersionMedia` hook against the mocked `@/lib/api` module —
 * the upload drawer now owns its own `useUploadQueue` instance and talks to the real upload/patch
 * functions directly, so upload-flow assertions must go through these API mocks instead of an
 * injected `mediaState.startUpload`/`uploadItems` (both removed in 180-05). */
function renderLiveSection() {
  return render(<ReleaseVersionMediaSection versionId={42} />)
}

async function waitForCategoryReady() {
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /^Screenshot \d+$/ }).getAttribute('aria-haspopup')).toBe('dialog')
  })
}

function openUploadSheet() {
  fireEvent.click(screen.getByRole('button', { name: /^Screenshot \d+$/ }))
}

/** Scopes queries to a single queued file's wrapper (title/caption live inside UploadFileRow's own
 * named region; the Weg-1-specific preview radio + remove button are siblings in the outer wrapper
 * this plan's drawer renders around it — see ReleaseVersionMediaUploadDrawer.tsx). */
function uploadRowFor(fileName: string): HTMLElement {
  const region = screen.getByRole('region', { name: fileName })
  const row = region.closest('[data-testid^="upload-row-"]')
  if (!row) throw new Error(`No upload-row wrapper found for ${fileName}`)
  return row as HTMLElement
}

describe('ReleaseVersionMediaSection per-file upload metadata', () => {
  it('uses the editor context as the title when a medium has no own title or caption', () => {
    renderSection(makeMediaState({ items: [makeItem({ title: null, caption: null })] }))

    expect(screen.getByText('Episode 001 · SubGroup v1')).not.toBeNull()
    expect(screen.queryByText(/Asset #/)).toBeNull()
  })

  it('keeps three titles and descriptions separate and chooses exactly one preview', async () => {
    api.uploadReleaseVersionMedia.mockResolvedValue({
      results: ['eins', 'zwei', 'drei'].map((name, index) => ({
        client_file_name: `${name}.png`, status: 'ready', release_version_media_id: 500 + index, source_revision: 1,
      })),
    })
    renderLiveSection()
    await waitForCategoryReady()
    openUploadSheet()
    const files = ['eins.png', 'zwei.png', 'drei.png'].map((name) => new File(['data'], name, { type: 'image/png' }))
    fireEvent.change(screen.getByLabelText('Dateien'), { target: { files } })
    expect(screen.getAllByRole('img')).toHaveLength(3)
    files.forEach((file, index) => {
      const row = within(screen.getByRole('region', { name: file.name }))
      fireEvent.change(row.getByLabelText('Titel'), { target: { value: `Titel ${index + 1}` } })
      fireEvent.change(row.getByLabelText('Beschreibung'), { target: { value: `Text ${index + 1}` } })
    })
    fireEvent.click(within(uploadRowFor('eins.png')).getByRole('radio'))
    fireEvent.click(within(uploadRowFor('zwei.png')).getByRole('radio'))
    expect(screen.getAllByRole('radio').filter((radio) => (radio as HTMLInputElement).checked)).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Upload starten' }))

    await waitFor(() => {
      expect(api.uploadReleaseVersionMedia).toHaveBeenCalledWith(expect.objectContaining({ versionId: 42, category: 'screenshot', files }))
    })
    await waitFor(() => {
      // zwei.png -> release_version_media_id 501, chosen as the preview candidate.
      expect(api.patchReleaseVersionMediaItem).toHaveBeenCalledWith(42, 501, expect.objectContaining({ title: 'Titel 2', caption: 'Text 2' }))
    })
    await waitFor(() => {
      expect(api.patchReleaseVersionMediaItem).toHaveBeenCalledWith(42, 501, expect.objectContaining({ is_preview_candidate: true }))
    })
  })

  it('removes only the selected draft and resets its preview choice without changing another draft', async () => {
    renderLiveSection()
    await waitForCategoryReady()
    openUploadSheet()
    const files = ['eins.png', 'zwei.png'].map((name) => new File(['data'], name, { type: 'image/png' }))
    fireEvent.change(screen.getByLabelText('Dateien'), { target: { files } })
    const secondFields = within(screen.getByRole('region', { name: 'zwei.png' }))
    fireEvent.change(secondFields.getByLabelText('Titel'), { target: { value: 'Bleibt erhalten' } })
    const firstRow = within(uploadRowFor('eins.png'))
    fireEvent.click(firstRow.getByRole('radio'))
    fireEvent.click(firstRow.getByRole('button', { name: 'Aus Auswahl entfernen' }))
    expect(screen.queryByRole('region', { name: 'eins.png' })).toBeNull()
    expect(secondFields.getByLabelText('Titel')).toHaveProperty('value', 'Bleibt erhalten')
    expect(screen.getByRole('radio', { name: 'Keine neue Vorschau' })).toHaveProperty('checked', true)
    expect(api.uploadReleaseVersionMedia).not.toHaveBeenCalled()
  })

  it('keeps retry errors inside the corresponding file row and prevents restarting successful files', async () => {
    api.uploadReleaseVersionMedia
      .mockResolvedValueOnce({
        results: [
          { client_file_name: 'fertig.png', status: 'ready', release_version_media_id: 1, source_revision: 1 },
          { client_file_name: 'fehler.png', status: 'failed', error_code: 'Metadaten fehlgeschlagen' },
        ],
      })
      .mockResolvedValueOnce({
        results: [{ client_file_name: 'fehler.png', status: 'ready', release_version_media_id: 2, source_revision: 1 }],
      })
    renderLiveSection()
    await waitForCategoryReady()
    openUploadSheet()
    const files = [new File(['a'], 'fertig.png', { type: 'image/png' }), new File(['b'], 'fehler.png', { type: 'image/png' })]
    fireEvent.change(screen.getByLabelText('Dateien'), { target: { files } })
    fireEvent.click(screen.getByRole('button', { name: 'Upload starten' }))

    const failed = within(await screen.findByRole('region', { name: 'fehler.png' }))
    expect(failed.getByText('Metadaten fehlgeschlagen')).not.toBeNull()
    fireEvent.click(failed.getByRole('button', { name: 'Erneut versuchen' }))
    expect(screen.getByRole('button', { name: 'Upload starten' })).toHaveProperty('disabled', true)
    expect(screen.queryByRole('button', { name: 'Aus Auswahl entfernen' })).toBeNull()
    await waitFor(() => expect(api.uploadReleaseVersionMedia).toHaveBeenCalledTimes(2))
  })

  it('edits and persists the title independently from the description after upload', async () => {
    const media = makeMediaState({ items: [makeItem({ title: 'Eigener Titel', caption: 'Eigener Text' })] })
    renderSection(media)
    expect(screen.getByText('Eigener Text')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Eigener Titel bearbeiten' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Medium bearbeiten' }))
    expect(dialog.getByLabelText('Titel')).toHaveProperty('value', 'Eigener Titel')
    expect(dialog.getByLabelText('Beschreibung')).toHaveProperty('value', 'Eigener Text')
    fireEvent.change(dialog.getByLabelText('Titel'), { target: { value: 'Neuer Titel' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Speichern' }))
    await waitFor(() => expect(media.patchItem).toHaveBeenCalledWith(1, { title: 'Neuer Titel', caption: 'Eigener Text' }))
  })
})

describe('ReleaseVersionMediaSection direct category upload', () => {
  it.each(CATEGORY_OPTIONS)('opens $label directly and uploads with its category code', async ({ value, label }) => {
    api.uploadReleaseVersionMedia.mockResolvedValue({
      results: [{ client_file_name: 'category.png', status: 'ready', release_version_media_id: 900 }],
    })
    renderLiveSection()
    await waitForCategoryReady()
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: `${label} 0` }))
    const dialog = screen.getByRole('dialog', { name: 'Medien hochladen' })
    expect(within(dialog).getByText(`Kategorie: ${label}`)).not.toBeNull()
    expect(api.uploadReleaseVersionMedia).not.toHaveBeenCalled()
    const file = new File(['demo'], 'category.png', { type: 'image/png' })
    fireEvent.change(within(dialog).getByLabelText('Dateien'), { target: { files: [file] } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Upload starten' }))
    await waitFor(() => {
      expect(api.uploadReleaseVersionMedia).toHaveBeenCalledWith(expect.objectContaining({ versionId: 42, category: value, files: [file] }))
    })
  })

  it('reopens the selected category with a fresh draft after cancelling', async () => {
    renderLiveSection()
    await waitForCategoryReady()
    openUploadSheet()
    fireEvent.change(screen.getByLabelText('Dateien'), { target: { files: [new File(['x'], 'old.png', { type: 'image/png' })] } })
    fireEvent.change(screen.getByLabelText('Beschreibung'), { target: { value: 'Alter Entwurf' } })
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
    openUploadSheet()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByText('old.png')).toBeNull()
    expect(screen.getByRole('button', { name: 'Upload starten' })).toHaveProperty('disabled', true)
    expect(api.uploadReleaseVersionMedia).not.toHaveBeenCalled()
  })

  it('shows all existing media to read-only viewers without category interaction', () => {
    const media = makeMediaState({
      capabilities: { ...makeMediaState().capabilities!, can_upload_media: false },
      items: [makeItem({ category: 'other', caption: 'Vorhandenes Medium', can_update: false, can_delete: false })],
    })
    renderSection(media)
    expect(screen.getByRole('button', { name: 'Sonstiges 1' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Vorhandenes Medium ansehen' })).not.toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('ReleaseVersionMediaSection Phase 90 upload redesign', () => {
  it('keeps full long gallery text in the existing detail drawer without a data request', () => {
    const title = 'Karaoke und Typesetting: ausführliche Dokumentation der letzten Überarbeitung mit mehreren Schildern'
    const caption = 'Diese ausführliche Beschreibung erklärt die Korrekturen an Schildern, Übergängen und Farben. '.repeat(6)
    const media = makeMediaState({ items: [makeItem({ title, caption, last_activity_at: '2026-09-14T12:59:00Z' })] })
    renderSection(media)
    const opener = screen.getByRole('button', { name: `${title} bearbeiten` })
    expect(screen.getByText(title)).not.toBeNull()
    expect(screen.getByText(caption.trim())).not.toBeNull()
    expect(opener.parentElement?.querySelector('time')?.dateTime).toBe('2026-09-14T12:59:00Z')
    fireEvent.click(opener)
    const dialog = within(screen.getByRole('dialog', { name: 'Medium bearbeiten' }))
    expect(dialog.getByLabelText('Titel')).toHaveProperty('value', title)
    expect(dialog.getByLabelText('Beschreibung')).toHaveProperty('value', caption)
    expect(media.reload).not.toHaveBeenCalled()
    expect(media.patchItem).not.toHaveBeenCalled()
  })

  it('keeps all eleven mixed-category cards with only their permitted preview actions', () => {
    const items = Array.from({ length: 11 }, (_, index) => makeItem({
      id: index + 1,
      title: `Medium ${index + 1}`,
      category: index < 3 ? 'screenshot' : index === 3 ? 'typesetting_karaoke' : index < 7 ? 'fun_outtake' : 'other',
      is_preview_candidate: index === 3,
    }))
    const media = makeMediaState({ items })
    renderSection(media)
    expect(screen.getByRole('heading', { name: 'Vorhandene Medien · 11' })).not.toBeNull()
    expect(screen.getAllByRole('button', { name: /Medium \d+ bearbeiten/ })).toHaveLength(11)
    expect(screen.getAllByRole('button', { name: 'Als Vorschau wählen' })).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: 'Vorschau entfernen' })).toHaveLength(1)
    const withoutPreview = screen.getByRole('button', { name: 'Medium 5 bearbeiten' }).parentElement!
    expect(within(withoutPreview).getAllByRole('button')).toHaveLength(1)
    fireEvent.click(within(withoutPreview).getByRole('button'))
    expect(screen.getByRole('dialog', { name: 'Medium bearbeiten' })).not.toBeNull()
    expect(media.patchItem).not.toHaveBeenCalled()
  })

  it('renders one category button group and no category dropdown', () => {
    renderSection(makeMediaState())

    const categories = screen.getByRole('group', { name: 'Medienkategorie' })

    expect(within(categories).getAllByRole('button')).toHaveLength(4)
    expect(within(categories).getByRole('button', { name: /Screenshot 0/i }).getAttribute('aria-pressed')).toBeNull()
    expect(screen.queryByLabelText('Kategorie')).toBeNull()
  })

  it('keeps all four images and their categories visible after every upload action', () => {
    const items = [
      makeItem({ id: 11, title: 'Screenshot A' }),
      makeItem({ id: 12, title: 'Screenshot B' }),
      makeItem({ id: 13, title: 'Screenshot C' }),
      makeItem({ id: 14, category: 'typesetting_karaoke', title: 'Karaoke', is_preview_candidate: true }),
    ]
    const media = makeMediaState({ items })
    renderSection(media)
    expect(screen.getByRole('heading', { name: 'Vorhandene Medien · 4' })).not.toBeNull()
    expect(screen.queryByText('Aktive Kategorie')).toBeNull()
    for (const item of items) {
      const opener = screen.getByRole('button', { name: new RegExp(`${item.title} bearbeiten`) })
      expect(within(opener.parentElement!).getByText(item.category === 'screenshot' ? 'Screenshot' : 'Typesetting / Karaoke')).not.toBeNull()
    }
    const categories = within(screen.getByRole('group', { name: 'Medienkategorie' }))
    for (const option of CATEGORY_OPTIONS) {
      const trigger = categories.getByRole('button', { name: new RegExp(option.label.replaceAll('/', '\\/')) })
      expect(trigger.getAttribute('aria-pressed')).toBeNull()
      fireEvent.click(trigger)
      const dialog = screen.getByRole('dialog', { name: 'Medien hochladen' })
      expect(within(dialog).getByText(`Kategorie: ${option.label}`)).not.toBeNull()
      fireEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }))
      for (const item of items) expect(screen.getByRole('button', { name: new RegExp(`${item.title} bearbeiten`) })).not.toBeNull()
      expect(trigger.getAttribute('aria-pressed')).toBeNull()
    }
    expect(screen.getAllByText('Aktuelles Vorschaubild')).toHaveLength(1)
    expect(media.reload).not.toHaveBeenCalled()
    expect(media.patchItem).not.toHaveBeenCalled()
  })

  it('preserves pending visibility and counts only the visible gallery items', () => {
    renderSection(makeMediaState({ items: [
      makeItem({ id: 11, title: 'Eigene Einreichung', review_state: 'pending', can_update: true }),
      makeItem({ id: 12, title: 'Verborgene Einreichung', review_state: 'pending', can_update: false }),
      makeItem({ id: 13, title: 'Freigegeben', category: 'other', review_state: 'confirmed', can_update: false }),
    ] }))
    expect(screen.getByRole('heading', { name: 'Vorhandene Medien · 2' })).not.toBeNull()
    expect(screen.queryByText('Verborgene Einreichung')).toBeNull()
    expect(screen.getByRole('button', { name: 'Screenshot 1' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Freigegeben ansehen' })).not.toBeNull()
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
    api.uploadReleaseVersionMedia.mockResolvedValue({
      results: [{ client_file_name: 'ready.png', status: 'ready', release_version_media_id: 950, source_revision: 1 }],
    })
    renderLiveSection()
    await waitForCategoryReady()

    openUploadSheet()
    const file = new File(['demo'], 'ready.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Dateien'), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Upload starten' }))

    await waitFor(() => {
      expect(api.uploadReleaseVersionMedia).toHaveBeenCalledWith(expect.objectContaining({ versionId: 42, category: 'screenshot', files: [file] }))
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

    fireEvent.change(within(dialog).getByLabelText('Beschreibung'), { target: { value: 'Neue Beschreibung' } })
    expect(within(dialog).queryByRole('combobox')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))

    await waitFor(() => {
      expect(patchItem).toHaveBeenCalledWith(31, {
        title: null,
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

    fireEvent.change(within(dialog).getByLabelText('Beschreibung'), { target: { value: 'Bitte korrigiert' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Überarbeitung einreichen' }))

    await waitFor(() => {
      expect(patchItem).toHaveBeenCalledWith(62, {
        title: null,
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
          can_reorder_media: false,
          can_manage_highlights: false,
        },
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /Own upload bearbeiten/i }))
    const dialog = await screen.findByRole('dialog', { name: 'Medium bearbeiten' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }))

    const confirmDialog = await screen.findByRole('dialog', { name: 'Dieses Medium aus der Release-Version entfernen?' })
    fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Entfernen' }))

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

    expect(within(dialog).getByLabelText('Beschreibung')).toHaveProperty('disabled', true)
    expect(within(dialog).getByRole('button', { name: 'Speichern' })).toHaveProperty('disabled', true)
    expect(within(dialog).getByRole('button', { name: 'Löschen' })).toHaveProperty('disabled', true)
    expect(patchItem).not.toHaveBeenCalled()
    expect(deleteItem).not.toHaveBeenCalled()
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
    expect(within(rejectedDialog).getByRole('button', { name: 'Neue Datei hier hineinziehen oder antippen' })).not.toBeNull()

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
    expect(within(confirmedDialog).queryByRole('button', { name: 'Neue Datei hier hineinziehen oder antippen' })).toBeNull()
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
    fireEvent.change(within(dialog).getByLabelText('Dateien'), { target: { files: [file] } })

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
    fireEvent.change(within(dialog).getByLabelText('Dateien'), { target: { files: [file] } })
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
  async function openLiveUploadSheetWithFiles(files: File[]) {
    renderLiveSection()
    await waitForCategoryReady()
    openUploadSheet()
    fireEvent.change(screen.getByLabelText('Dateien'), { target: { files } })
  }

  it('shows the error banner and keeps the upload drawer open on a hard upload failure', async () => {
    api.uploadReleaseVersionMedia.mockRejectedValue(new Error('Netzwerkfehler beim Upload.'))
    const file = new File(['data'], 'scene.png', { type: 'image/png' })
    await openLiveUploadSheetWithFiles([file])

    fireEvent.click(screen.getByRole('button', { name: 'Upload starten' }))

    await waitFor(() => {
      // Appears both in the drawer's own error banner and in the one affected file's row —
      // a hard failure marks every in-flight item 'failed' with the same message.
      expect(screen.getAllByText('Netzwerkfehler beim Upload.').length).toBeGreaterThan(0)
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
    expect(within(dialog).getByRole('button', { name: 'Erneut versuchen' })).not.toBeNull()
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
    api.uploadReleaseVersionMedia
      .mockResolvedValueOnce({
        results: [{ client_file_name: 'scene.png', status: 'failed', error_code: 'INVALID_MIME_TYPE' }],
      })
      .mockRejectedValueOnce(new Error('Netzwerkfehler bei erneutem Versuch.'))
    const file = new File(['data'], 'scene.png', { type: 'image/png' })
    await openLiveUploadSheetWithFiles([file])

    fireEvent.click(screen.getByRole('button', { name: 'Upload starten' }))
    await waitFor(() => {
      expect(screen.getByText('INVALID_MIME_TYPE')).not.toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))

    await waitFor(() => {
      expect(screen.getAllByText('Netzwerkfehler bei erneutem Versuch.').length).toBeGreaterThan(0)
    })
  })
})
