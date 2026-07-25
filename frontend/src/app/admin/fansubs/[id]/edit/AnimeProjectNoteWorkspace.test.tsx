// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const getAnimeFansubProjectNoteMock = vi.fn()
const upsertAnimeFansubProjectNoteMock = vi.fn()
const deleteAnimeFansubProjectNoteMock = vi.fn()

vi.mock('@/components/editor', () => ({
  RichTextEditor: () => <textarea />,
  RichTextRenderer: ({ bodyHtml }: { bodyHtml?: string | null }) => (
    <div dangerouslySetInnerHTML={{ __html: bodyHtml ?? '' }} />
  ),
}))

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {},
  deleteAnimeFansubProjectNote: (...args: unknown[]) => deleteAnimeFansubProjectNoteMock(...args),
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

  it('speichert den Cockpit-Einblick als öffentlich und veröffentlicht', async () => {
    const existingNote = {
      id: 7,
      animeId: 13,
      fansubGroupId: 1,
      title: '',
      bodyJson: { type: 'doc', content: [{ type: 'paragraph' }] },
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
    }

    getAnimeFansubProjectNoteMock.mockResolvedValue(existingNote)
    upsertAnimeFansubProjectNoteMock.mockResolvedValue({
      ...existingNote,
      visibility: 'public',
      status: 'published',
    })

    render(<AnimeProjectNoteWorkspace fansubId={1} animeId={13} expanded canEdit />)

    fireEvent.click(await screen.findByRole('button', { name: 'Einblick bearbeiten' }))
    fireEvent.click(screen.getByRole('button', { name: 'Einblick speichern' }))

    await waitFor(() => {
      expect(upsertAnimeFansubProjectNoteMock).toHaveBeenCalledWith(1, 13, {
        bodyJson: existingNote.bodyJson,
        visibility: 'public',
        status: 'published',
      })
    })
  })

  it('löscht einen Projekt-Einblick und bietet danach erneutes Anlegen an', async () => {
    getAnimeFansubProjectNoteMock.mockResolvedValue({
      id: 7,
      animeId: 13,
      fansubGroupId: 1,
      title: '',
      bodyJson: { type: 'doc', content: [{ type: 'paragraph' }] },
      bodyHtml: '<p>Projekttext sichtbar</p>',
      bodyText: 'Projekttext sichtbar',
      editorType: 'tiptap',
      contentSchemaVersion: 1,
      visibility: 'public',
      status: 'published',
      sortOrder: 0,
      createdBy: null,
      updatedBy: null,
      createdAt: '2026-06-29T00:00:00Z',
      updatedAt: '2026-06-29T00:00:00Z',
    })
    deleteAnimeFansubProjectNoteMock.mockResolvedValue(undefined)

    render(<AnimeProjectNoteWorkspace fansubId={1} animeId={13} expanded canEdit />)

    fireEvent.click(await screen.findByRole('button', { name: 'Einblick löschen' }))

    await waitFor(() => {
      expect(deleteAnimeFansubProjectNoteMock).toHaveBeenCalledWith(1, 13, 7)
      expect(screen.getByText('Projekt-Einblick fehlt')).not.toBeNull()
      expect(screen.getByRole('button', { name: 'Einblick hinzufügen' })).not.toBeNull()
    })
  })
})
