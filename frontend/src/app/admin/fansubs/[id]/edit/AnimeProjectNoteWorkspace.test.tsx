// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const getAnimeFansubProjectNoteMock = vi.fn()
const upsertAnimeFansubProjectNoteMock = vi.fn()

vi.mock('@/components/editor', () => ({
  RichTextEditor: () => <textarea />,
  RichTextRenderer: ({ bodyHtml }: { bodyHtml?: string | null }) => (
    <div dangerouslySetInnerHTML={{ __html: bodyHtml ?? '' }} />
  ),
}))

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {},
  getAnimeFansubProjectNote: (...args: unknown[]) => getAnimeFansubProjectNoteMock(...args),
  upsertAnimeFansubProjectNote: (...args: unknown[]) => upsertAnimeFansubProjectNoteMock(...args),
}))

import { AnimeProjectNoteWorkspace } from './AnimeProjectNoteWorkspace'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AnimeProjectNoteWorkspace', () => {
  it('zeigt fehlenden Projekt-Einblick wenn der API-Read null liefert', async () => {
    getAnimeFansubProjectNoteMock.mockResolvedValue(null)

    render(<AnimeProjectNoteWorkspace fansubId={1} animeId={13} expanded canEdit />)

    expect(await screen.findByText('Projekt-Einblick fehlt')).not.toBeNull()
    expect(screen.queryByText('Wird geladen…')).toBeNull()
    expect(getAnimeFansubProjectNoteMock).toHaveBeenCalledWith(1, 13)
  })

  it('blendet Bearbeiten-Aktionen im Read-only-Modus aus', async () => {
    getAnimeFansubProjectNoteMock.mockResolvedValue({
      id: 7,
      animeId: 13,
      fansubGroupId: 1,
      title: '',
      bodyJson: null,
      bodyHtml: '<p>Projekttext sichtbar</p>',
      bodyText: 'Projekttext sichtbar',
      editorType: 'tiptap',
      contentSchemaVersion: 1,
      visibility: 'internal',
      status: 'draft',
      sortOrder: 0,
      createdBy: null,
      updatedBy: null,
      createdAt: '2026-06-29T00:00:00Z',
      updatedAt: '2026-06-29T00:00:00Z',
    })

    render(<AnimeProjectNoteWorkspace fansubId={1} animeId={13} expanded canEdit={false} />)

    expect(await screen.findByText('Projekttext sichtbar')).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Einblick bearbeiten' })).toBeNull()
  })

  it('zeigt bei fehlendem Einblick im Read-only-Modus keinen Hinzufügen-Button', async () => {
    getAnimeFansubProjectNoteMock.mockResolvedValue(null)

    render(<AnimeProjectNoteWorkspace fansubId={1} animeId={13} expanded canEdit={false} />)

    expect(await screen.findByText('Projekt-Einblick fehlt')).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Einblick hinzufügen' })).toBeNull()
  })
})
