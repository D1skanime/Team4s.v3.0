// @vitest-environment jsdom

import { createElement, type ImgHTMLAttributes } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

const listFansubGroupMedia = vi.fn()
const patchFansubMediaReview = vi.fn()
const reorderFansubGroupMedia = vi.fn()
const deleteFansubGroupMedia = vi.fn()
const uploadFansubGroupMedia = vi.fn()

vi.mock('next/image', () => ({
  default: ({ alt = '', fill, unoptimized, ...props }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; unoptimized?: boolean }) => {
    void fill
    void unoptimized
    return createElement('img', { alt, ...props })
  },
}))

vi.mock('@/lib/api', () => ({
  listFansubGroupMedia: (...args: unknown[]) => listFansubGroupMedia(...args),
  patchFansubMediaReview: (...args: unknown[]) => patchFansubMediaReview(...args),
  reorderFansubGroupMedia: (...args: unknown[]) => reorderFansubGroupMedia(...args),
  deleteFansubGroupMedia: (...args: unknown[]) => deleteFansubGroupMedia(...args),
  uploadFansubGroupMedia: (...args: unknown[]) => uploadFansubGroupMedia(...args),
  resolveApiUrl: (value: string) => value,
  ApiError: class ApiError extends Error {
    status: number
    code: string | null

    constructor(
      status: number,
      message: string,
      retryAfterSeconds: number | null = null,
      code: string | null = null,
    ) {
      void retryAfterSeconds
      super(message)
      this.status = status
      this.code = code
    }
  },
}))

import { GroupMediaReviewSection } from './GroupMediaReviewSection'
import type { FansubGroupMediaItem } from '@/lib/api'
import type { FansubGroupCapabilities } from '@/types/fansub'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

const fullCapabilities: FansubGroupCapabilities = {
  can_edit_group: true,
  can_edit_group_general: false,
  can_edit_technical_links: false,
  can_edit_founding_history: false,
  can_update_group_links: false,
  can_manage_links: true,
  can_view_members: true,
  can_manage_members: true,
  can_manage_historical_members: true,
  can_manage_historical_roles: true,
  can_link_historical_members: true,
  can_edit_notes: true,
  can_edit_project_timeline: false,
  can_view_invitations: true,
  can_create_invitation: true,
  can_cancel_invitation: true,
  can_view_releases: true,
  can_view_release_media: true,
  can_upload_release_media: true,
  can_edit_release_notes: true,
  can_view_group_media: true,
  can_upload_group_media: true,
  can_update_group_media: true,
  can_update_own_group_media: true,
  can_review_group_media: true,
  can_delete_own_group_media: true,
  can_delete_group_media: true,
  can_reorder_group_media: true,
}

const noMediaCapabilities: FansubGroupCapabilities = {
  ...fullCapabilities,
  can_edit_group: false,
  can_view_group_media: false,
  can_upload_group_media: false,
  can_update_group_media: false,
  can_update_own_group_media: false,
  can_review_group_media: false,
  can_delete_own_group_media: false,
  can_delete_group_media: false,
  can_reorder_group_media: false,
}

function mediaItem(overrides: Partial<FansubGroupMediaItem> = {}): FansubGroupMediaItem {
  const id = overrides.id ?? 101

  return {
    id,
    preview_url: `/media/group/${id}-thumb.jpg`,
    thumbnail_url: `/media/group/${id}-thumb.jpg`,
    original_url: `/media/group/${id}-original.jpg`,
    visibility: 'intern',
    review_status: 'in_pruefung',
    title: `Medium ${id}`,
    description: `Beschreibung ${id}`,
    alt_text: `Alt ${id}`,
    category: 'gallery',
    sort_order: id,
    uploaded_by_display_name: 'Admin',
    created_at: `2026-06-${String((id % 20) + 1).padStart(2, '0')}T12:00:00Z`,
    updated_at: null,
    owner_type: 'fansub_group',
    owner_id: 88,
    owner_consistent: true,
    ...overrides,
  }
}
function renderSection(items: FansubGroupMediaItem[] = [mediaItem()], capabilities: FansubGroupCapabilities = fullCapabilities) {
  listFansubGroupMedia.mockResolvedValue(items)
  return render(<GroupMediaReviewSection fansubId={88} capabilities={capabilities} />)
}

function findSummaryText(expected: string) {
  return screen.findByText((_content, element) => {
    const className = element?.getAttribute('class') ?? ''
    return className.includes('desktopSummary') && (element?.textContent?.includes(expected) ?? false)
  })
}

describe('GroupMediaReviewSection', () => {
  it('rendert nichts, wenn Gruppenmedien-Rechte fehlen', () => {
    const { container } = render(
      <GroupMediaReviewSection fansubId={88} capabilities={noMediaCapabilities} />,
    )

    expect(container.firstChild).toBeNull()
  })

  it('lädt ohne Medien-Leserecht auch bei Mutationsrechten keine Liste', () => {
    const mutationOnlyCapabilities = {
      ...noMediaCapabilities,
      can_upload_group_media: true,
      can_update_group_media: true,
  can_update_own_group_media: true,
      can_reorder_group_media: true,
    }

    const { container } = render(
      <GroupMediaReviewSection fansubId={88} capabilities={mutationOnlyCapabilities} />,
    )

    expect(container.firstChild).toBeNull()
    expect(listFansubGroupMedia).not.toHaveBeenCalled()
  })

  it('zeigt 403 als Berechtigungsfehler statt als Ladefehler', async () => {
    const { ApiError: MockApiError } = await import('@/lib/api')
    listFansubGroupMedia.mockRejectedValue(
      new MockApiError(403, 'keine berechtigung für diese aktion'),
    )

    render(<GroupMediaReviewSection fansubId={88} capabilities={fullCapabilities} />)

    expect(await screen.findByText('Keine Berechtigung')).toBeTruthy()
    expect(
      screen.getByText(
        'Du hast keine Berechtigung für diese Aktion. Bitte wende dich an einen Fansub-Admin.',
      ),
    ).toBeTruthy()
    expect(screen.queryByText('Fehler beim Laden')).toBeNull()
  })

  it('hält Upload kompakt und zeigt die Medienübersicht direkt erreichbar', async () => {
    renderSection([mediaItem({ id: 101, title: 'Galerie Bild' })])

    expect(await screen.findByText('Medien hochladen')).toBeTruthy()
    expect(screen.queryByText('Bilder auswählen oder hier ablegen')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Medien hochladen' }))
    expect(await screen.findByText('Bilder auswählen oder hier ablegen')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Upload schließen' })).toBeTruthy()
    expect(await screen.findByText('Medienübersicht')).toBeTruthy()
    expect(await screen.findByText('Galerie Bild')).toBeTruthy()
    expect(screen.queryByDisplayValue('Galerie Bild')).toBeNull()
  })

  it('skaliert 20 Medien kompakt ohne dauerhaft offene Detailformulare', async () => {
    renderSection(Array.from({ length: 20 }, (_value, index) => mediaItem({ id: index + 1 })))

    expect(await findSummaryText('20 von 20 Medien sichtbar')).toBeTruthy()
    expect((await screen.findAllByRole('button', { name: /bearbeiten$/ })).length).toBe(20)
    expect(screen.queryByDisplayValue('Medium 1')).toBeNull()
    expect(screen.queryByText('Änderungen speichern')).toBeNull()
  })

  it('nutzt Thumbnails in der Übersicht und lädt das Original erst im Detail-Drawer', async () => {
    renderSection([mediaItem({ id: 101, title: 'Vorschaubild' })])

    await screen.findByText('Vorschaubild')
    const overviewImages = screen.getAllByAltText('Alt 101') as HTMLImageElement[]
    expect(overviewImages).toHaveLength(1)
    expect(overviewImages[0].getAttribute('src')).toBe('/media/group/101-thumb.jpg')
    expect(screen.queryByDisplayValue('Vorschaubild')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Vorschaubild öffnen' }))

    expect(await screen.findByDisplayValue('Vorschaubild')).toBeTruthy()
    const openedImages = screen.getAllByAltText('Alt 101') as HTMLImageElement[]
    expect(openedImages.some((image) => image.getAttribute('src') === '/media/group/101-original.jpg')).toBe(true)
  })

  it('rendert bei 100 Treffern zunächst nur die erste kompakte Seite', async () => {
    renderSection(Array.from({ length: 100 }, (_value, index) => mediaItem({ id: index + 1 })))

    expect(await findSummaryText('100 von 100 Medien sichtbar')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /bearbeiten$/ })).toHaveLength(40)
    fireEvent.click(screen.getByRole('button', { name: 'Weitere Medien anzeigen (60)' }))

    expect(screen.getAllByRole('button', { name: /bearbeiten$/ })).toHaveLength(80)
  })

  it('fällt bei fehlendem Thumbnail auf vorhandene Original-URL zurück', async () => {
    renderSection([
      mediaItem({
        id: 101,
        title: 'Altes Medium',
        preview_url: null,
        thumbnail_url: null,
        original_url: '/media/group/101-original.jpg',
      }),
    ])

    await screen.findByText('Altes Medium')
    const overviewImage = screen.getByAltText('Alt 101') as HTMLImageElement
    expect(overviewImage.getAttribute('src')).toBe('/media/group/101-original.jpg')
  })

  it('zeigt bei fehlendem Titel einen fachlichen Fallback statt einer technischen Medium-ID', async () => {
    renderSection([
      mediaItem({
        id: 19,
        title: null,
        alt_text: null,
        category: 'artwork_fanart',
        created_at: '2026-06-25T12:00:00Z',
      }),
    ])

    expect(await screen.findByText('Artwork vom 25.06.2026')).toBeTruthy()
    expect(screen.queryByText('Medium #19')).toBeNull()
    expect(screen.queryByText('Medium / 19')).toBeNull()
  })

  it('zeigt Uploader und Upload-Datum als kompakte Nutzerzeile', async () => {
    renderSection([
      mediaItem({
        id: 101,
        uploaded_by_display_name: 'Aolid',
        created_at: '2026-06-25T12:00:00Z',
      }),
    ])

    expect(await screen.findByText('Hochgeladen von Aolid am 25.06.2026')).toBeTruthy()
    expect(screen.queryByText('Uploader')).toBeNull()
  })

  it('öffnet die Detailbearbeitung nur für ein Medium und speichert dessen Draft', async () => {
    renderSection([
      mediaItem({ id: 101, title: 'Erstes Medium' }),
      mediaItem({ id: 102, title: 'Zweites Medium' }),
    ])
    patchFansubMediaReview.mockResolvedValue(mediaItem({ id: 101 }))

    await screen.findByText('Erstes Medium')
    const firstCard = screen.getByText('Erstes Medium').closest('section')
    expect(firstCard).not.toBeNull()
    fireEvent.click(within(firstCard as HTMLElement).getByRole('button', { name: 'Erstes Medium bearbeiten' }))
    fireEvent.change(await screen.findByDisplayValue('Erstes Medium'), {
      target: { value: 'Geänderter Titel' },
    })
    expect(screen.queryByDisplayValue('101')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Änderungen speichern' }))

    await waitFor(() => {
      expect(patchFansubMediaReview).toHaveBeenCalledWith(
        88,
        101,
        expect.objectContaining({ title: 'Geänderter Titel' }),
        undefined,
      )
    })
    expect(patchFansubMediaReview.mock.calls[0][2]).not.toHaveProperty('sort_order')
    expect(screen.queryByDisplayValue('Zweites Medium')).toBeNull()
  })

  it('speichert die Gruppenmedien-Reihenfolge per Drag & Drop über Medien-IDs', async () => {
    const { container } = renderSection([
      mediaItem({ id: 101, title: 'Erstes Medium', sort_order: 1000 }),
      mediaItem({ id: 102, title: 'Zweites Medium', sort_order: 2000 }),
    ])
    reorderFansubGroupMedia.mockResolvedValue(undefined)

    await screen.findByText('Erstes Medium')
    const dragHandle = screen.getByRole('button', { name: 'Erstes Medium verschieben' })
    const secondCard = screen.getByText('Zweites Medium').closest('section')
    expect(secondCard).not.toBeNull()

    fireEvent.dragStart(dragHandle, {
      dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
    })
    fireEvent.dragOver(secondCard as HTMLElement, {
      dataTransfer: { dropEffect: 'move' },
    })
    fireEvent.drop(secondCard as HTMLElement, {
      dataTransfer: { getData: vi.fn(() => '101') },
    })

    await waitFor(() => {
      expect(reorderFansubGroupMedia).toHaveBeenCalledWith(
        88,
        { mediaIds: [102, 101] },
        undefined,
      )
    })
    const cardTitles = Array.from(container.querySelectorAll('h3')).map((element) => element.textContent)
    expect(cardTitles).toEqual(['Zweites Medium', 'Erstes Medium'])
  })

  it('speichert die Gruppenmedien-Reihenfolge per Touch-Geste über den Verschiebegriff', async () => {
    renderSection([
      mediaItem({ id: 101, title: 'Erstes Medium', sort_order: 1000 }),
      mediaItem({ id: 102, title: 'Zweites Medium', sort_order: 2000 }),
    ])
    reorderFansubGroupMedia.mockResolvedValue(undefined)

    await screen.findByText('Erstes Medium')
    const dragHandle = screen.getByRole('button', { name: 'Erstes Medium verschieben' })
    const secondCard = screen.getByText('Zweites Medium').closest('section')
    expect(secondCard).not.toBeNull()
    dragHandle.setPointerCapture = vi.fn()
    dragHandle.releasePointerCapture = vi.fn()
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => secondCard as Element),
    })

    fireEvent.pointerDown(dragHandle, {
      pointerId: 7,
      pointerType: 'touch',
      clientX: 10,
      clientY: 10,
    })
    fireEvent.pointerMove(dragHandle, {
      pointerId: 7,
      pointerType: 'touch',
      clientX: 22,
      clientY: 22,
    })
    fireEvent.pointerUp(dragHandle, {
      pointerId: 7,
      pointerType: 'touch',
      clientX: 22,
      clientY: 22,
    })

    await waitFor(() => {
      expect(reorderFansubGroupMedia).toHaveBeenCalledWith(
        88,
        { mediaIds: [102, 101] },
        undefined,
      )
    })
  })

  it('ändert den Prüfstatus per Quick-Action ohne andere Mediendaten zu senden', async () => {
    renderSection([mediaItem({ id: 101, title: 'Review Bild', review_status: 'in_pruefung' })])
    patchFansubMediaReview.mockResolvedValue({ message: 'ok' })

    await screen.findByText('Review Bild')
    fireEvent.click(screen.getByRole('button', { name: 'Review Bild freigeben' }))

    await waitFor(() => {
      expect(patchFansubMediaReview).toHaveBeenCalledWith(
        88,
        101,
        { review_status: 'freigegeben' },
        undefined,
      )
    })
    await waitFor(() => {
      expect(screen.getAllByText('Freigegeben').length).toBeGreaterThan(1)
    })
  })

  it('blendet den Freigeben-Button bei bereits freigegebenen Medien aus', async () => {
    renderSection([mediaItem({ id: 101, title: 'Schon frei', review_status: 'freigegeben' })])

    await screen.findByText('Schon frei')

    expect(screen.queryByRole('button', { name: 'Schon frei freigeben' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Schon frei ablehnen' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Schon frei bearbeiten' })).toBeTruthy()
  })

  it('hides review decisions but keeps editing when only group media updates are allowed', async () => {
    renderSection(
      [mediaItem({ id: 101, title: 'Nur bearbeiten', review_status: 'in_pruefung' })],
      { ...fullCapabilities, can_review_group_media: false },
    )

    await screen.findByText('Nur bearbeiten')

    expect(screen.queryByRole('button', { name: 'Nur bearbeiten freigeben' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Nur bearbeiten ablehnen' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Nur bearbeiten bearbeiten' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Nur bearbeiten bearbeiten' }))
    const reviewStatusSelect = screen.getAllByRole('combobox').find((element) => (element as HTMLSelectElement).value === 'in_pruefung')
    expect((reviewStatusSelect as HTMLSelectElement).disabled).toBe(true)
  })

  it('setzt Bulk-Prüfstatus nur für aktuell gefilterte Treffer und leert die Auswahl', async () => {
    renderSection([
      mediaItem({ id: 101, title: 'Galerie Bild', category: 'gallery' }),
      mediaItem({ id: 102, title: 'Forum Bild', category: 'forum' }),
      mediaItem({ id: 103, title: 'Forum Banner', category: 'forum' }),
    ])
    patchFansubMediaReview.mockResolvedValue({ message: 'ok' })

    await screen.findByText('Galerie Bild')
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }))
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'forum' } })
    fireEvent.click(screen.getByRole('button', { name: 'Alle auswählen' }))

    const bulkBar = screen.getByRole('region', { name: 'Bulk-Aktionen für Medienauswahl' })
    expect(within(bulkBar).getByText('2 ausgewählt')).toBeTruthy()
    fireEvent.click(within(bulkBar).getByRole('button', { name: 'Ablehnen' }))

    await waitFor(() => {
      expect(patchFansubMediaReview).toHaveBeenCalledTimes(2)
      expect(patchFansubMediaReview).toHaveBeenCalledWith(
        88,
        102,
        { review_status: 'abgelehnt' },
        undefined,
      )
      expect(patchFansubMediaReview).toHaveBeenCalledWith(
        88,
        103,
        { review_status: 'abgelehnt' },
        undefined,
      )
    })
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'Bulk-Aktionen für Medienauswahl' })).toBeNull()
    })
  })

  it('zeigt die Bulk-Leiste erst ab zwei ausgewählten Medien', async () => {
    renderSection([
      mediaItem({ id: 101, title: 'Galerie Bild' }),
      mediaItem({ id: 102, title: 'Forum Bild' }),
    ])

    await screen.findByText('Galerie Bild')
    fireEvent.click(screen.getByLabelText('Galerie Bild auswählen'))

    expect(screen.queryByRole('region', { name: 'Bulk-Aktionen für Medienauswahl' })).toBeNull()

    fireEvent.click(screen.getByLabelText('Forum Bild auswählen'))

    const bulkBar = screen.getByRole('region', { name: 'Bulk-Aktionen für Medienauswahl' })
    expect(within(bulkBar).getByText('2 ausgewählt')).toBeTruthy()
    expect(within(bulkBar).getByRole('button', { name: 'Abbrechen' })).toBeTruthy()
    expect(within(bulkBar).queryByRole('button', { name: 'Aufheben' })).toBeNull()
  })

  it('filtert die Übersicht nach Kategorie', async () => {
    renderSection([
      mediaItem({ id: 101, title: 'Galerie Bild', category: 'gallery' }),
      mediaItem({ id: 102, title: 'Forum Bild', category: 'forum' }),
    ])

    await screen.findByText('Galerie Bild')
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }))
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'forum' } })

    expect(await screen.findByText('Forum Bild')).toBeTruthy()
    expect(screen.queryByText('Galerie Bild')).toBeNull()
  })

  it('setzt Dateiauswahl und Upload-Kategorie nach erfolgreichem Upload zurück', async () => {
    const { container } = renderSection([])
    uploadFansubGroupMedia.mockResolvedValue({ results: [{ client_file_name: 'test.png', status: 'ready' }] })

    fireEvent.click(await screen.findByRole('button', { name: 'Medien hochladen' }))
    const uploadCategorySelect = screen.getAllByRole('combobox')[0] as HTMLSelectElement
    fireEvent.change(uploadCategorySelect, { target: { value: 'forum' } })
    const fileInput = container.querySelector('input[type="file"]')
    expect(fileInput).not.toBeNull()
    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: [new File(['x'], 'test.png', { type: 'image/png' })] },
    })
    expect(await screen.findByText('test.png')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Hochladen' }))

    await waitFor(() => {
      expect(uploadFansubGroupMedia).toHaveBeenCalledWith(expect.objectContaining({ category: 'forum' }))
    })
    expect(screen.queryByText('test.png')).toBeNull()
    await waitFor(() => expect(screen.queryByText('Bilder auswählen oder hier ablegen')).toBeNull())
  })

  it('entfernt Gruppenmedien erst nach Detail-Danger-Zone und Modal-Bestätigung', async () => {
    renderSection([mediaItem({ id: 101, title: 'Altes Medium' })])
    deleteFansubGroupMedia.mockResolvedValue(undefined)

    expect(screen.queryByRole('button', { name: 'Aus Gruppenmedien entfernen' })).toBeNull()

    await screen.findByText('Altes Medium')
    fireEvent.click(screen.getByRole('button', { name: 'Altes Medium bearbeiten' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Aus Gruppenmedien entfernen' }))

    const dialogTitle = screen.getByText('Medium aus Gruppenmedien entfernen')
    const dialog = dialogTitle.closest('[role="dialog"]')
    expect(dialog).not.toBeNull()
    const modal = dialog as HTMLElement
    expect(within(modal).getByText('Medium aus Gruppenmedien entfernen')).toBeTruthy()
    expect(within(modal).getByText(/Datei und Asset werden nicht endgültig gelöscht/)).toBeTruthy()
    fireEvent.click(within(modal).getByRole('button', { name: 'Aus Gruppenmedien entfernen' }))

    await waitFor(() => {
      expect(deleteFansubGroupMedia).toHaveBeenCalledWith(88, 101)
    })
  })
})

  it('erlaubt Mitgliedern nur Textangaben des eigenen Uploads', async () => {
    const ownMediaCapabilities: FansubGroupCapabilities = {
      ...noMediaCapabilities,
      can_view_group_media: true,
      can_update_own_group_media: true,
    }
    const ownItem = mediaItem({ uploaded_by_current_user: true })
    listFansubGroupMedia.mockResolvedValue([ownItem])

    render(<GroupMediaReviewSection fansubId={88} capabilities={ownMediaCapabilities} />)

    await screen.findByText('Medium 101')
    fireEvent.click(screen.getByLabelText('Medium 101 bearbeiten'))

    const textboxes = screen.getAllByRole('textbox')
    const titleInput = textboxes.find((element) => (element as HTMLInputElement).value === 'Medium 101') as HTMLInputElement
    const altTextInput = textboxes.find((element) => (element as HTMLInputElement).value === 'Alt 101') as HTMLInputElement
    const descriptionInput = textboxes.find((element) => (element as HTMLTextAreaElement).value === 'Beschreibung 101') as HTMLTextAreaElement
    const drawerSelects = screen.getAllByRole('combobox').filter((element) => ['gallery', 'intern', 'in_pruefung'].includes((element as HTMLSelectElement).value))

    expect(titleInput.disabled).toBe(false)
    expect(altTextInput.disabled).toBe(false)
    expect(descriptionInput.disabled).toBe(false)
    expect(drawerSelects).toHaveLength(3)
    drawerSelects.forEach((select) => expect((select as HTMLSelectElement).disabled).toBe(true))

    fireEvent.change(titleInput, { target: { value: 'Mein Bild' } })
    fireEvent.click(screen.getByRole('button', { name: 'Änderungen speichern' }))

    await waitFor(() => {
      expect(patchFansubMediaReview).toHaveBeenCalledWith(88, 101, {
        title: 'Mein Bild',
        description: 'Beschreibung 101',
        alt_text: 'Alt 101',
      }, undefined)
    })
  })
