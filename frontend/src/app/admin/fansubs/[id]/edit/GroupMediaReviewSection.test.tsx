// @vitest-environment jsdom

import { createElement, type ImgHTMLAttributes } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

const listFansubGroupMedia = vi.fn()
const patchFansubMediaReview = vi.fn()
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
  vi.clearAllMocks()
})

const fullCapabilities: FansubGroupCapabilities = {
  can_edit_group: true,
  can_manage_links: true,
  can_view_members: true,
  can_manage_members: true,
  can_edit_notes: true,
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
  can_delete_group_media: true,
}

const noMediaCapabilities: FansubGroupCapabilities = {
  ...fullCapabilities,
  can_edit_group: false,
  can_view_group_media: false,
  can_upload_group_media: false,
  can_update_group_media: false,
  can_delete_group_media: false,
}

function mediaItem(overrides: Partial<FansubGroupMediaItem> = {}): FansubGroupMediaItem {
  const id = overrides.id ?? 101

  return {
    id,
    preview_url: `/media/group/${id}.jpg`,
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

function renderSection(items: FansubGroupMediaItem[] = [mediaItem()]) {
  listFansubGroupMedia.mockResolvedValue(items)
  return render(<GroupMediaReviewSection fansubId={88} capabilities={fullCapabilities} />)
}

describe('GroupMediaReviewSection', () => {
  it('rendert nichts, wenn Gruppenmedien-Rechte fehlen', () => {
    const { container } = render(
      <GroupMediaReviewSection fansubId={88} capabilities={noMediaCapabilities} />,
    )

    expect(container.firstChild).toBeNull()
  })

  it('trennt Upload und kompakte Medienübersicht', async () => {
    renderSection([mediaItem({ id: 101, title: 'Galerie Bild' })])

    expect(await screen.findByText('Medien hochladen')).toBeTruthy()
    expect(await screen.findByText('Medienübersicht')).toBeTruthy()
    expect(await screen.findByText('Galerie Bild')).toBeTruthy()
    expect(screen.queryByDisplayValue('Galerie Bild')).toBeNull()
  })

  it('skaliert 20 Medien kompakt ohne dauerhaft offene Detailformulare', async () => {
    renderSection(Array.from({ length: 20 }, (_value, index) => mediaItem({ id: index + 1 })))

    expect(await screen.findByText('20 von 20 Medien sichtbar')).toBeTruthy()
    expect((await screen.findAllByRole('button', { name: 'Bearbeiten' })).length).toBe(20)
    expect(screen.queryByDisplayValue('Medium 1')).toBeNull()
    expect(screen.queryByText('Änderungen speichern')).toBeNull()
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
    fireEvent.click(within(firstCard as HTMLElement).getByRole('button', { name: 'Bearbeiten' }))
    fireEvent.change(await screen.findByDisplayValue('Erstes Medium'), {
      target: { value: 'Geänderter Titel' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Änderungen speichern' }))

    await waitFor(() => {
      expect(patchFansubMediaReview).toHaveBeenCalledWith(
        88,
        101,
        expect.objectContaining({ title: 'Geänderter Titel' }),
        undefined,
      )
    })
    expect(screen.queryByDisplayValue('Zweites Medium')).toBeNull()
  })

  it('filtert die Übersicht nach Kategorie', async () => {
    renderSection([
      mediaItem({ id: 101, title: 'Galerie Bild', category: 'gallery' }),
      mediaItem({ id: 102, title: 'Forum Bild', category: 'forum' }),
    ])

    await screen.findByText('Galerie Bild')
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'forum' } })

    expect(await screen.findByText('Forum Bild')).toBeTruthy()
    expect(screen.queryByText('Galerie Bild')).toBeNull()
  })

  it('setzt Dateiauswahl und Upload-Kategorie nach erfolgreichem Upload zurück', async () => {
    const { container } = renderSection([])
    uploadFansubGroupMedia.mockResolvedValue({ results: [{ client_file_name: 'test.png', status: 'ready' }] })

    await screen.findByText('Medien hochladen')
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
    await waitFor(() => {
      expect((screen.getAllByRole('combobox')[0] as HTMLSelectElement).value).toBe('gallery')
    })
  })

  it('benennt Entfernen als Verwaltungsvorgang', async () => {
    renderSection([mediaItem({ id: 101 })])
    deleteFansubGroupMedia.mockResolvedValue(undefined)

    fireEvent.click(await screen.findByRole('button', { name: 'Aus Verwaltung entfernen' }))

    await waitFor(() => {
      expect(deleteFansubGroupMedia).toHaveBeenCalledWith(88, 101)
    })
  })
})
