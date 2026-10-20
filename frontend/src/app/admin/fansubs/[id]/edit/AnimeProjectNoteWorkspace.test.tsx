// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { FansubGroupCapabilitiesResponse } from '@/types/fansub'

const getAnimeFansubProjectNoteMock = vi.fn()
const upsertAnimeFansubProjectNoteMock = vi.fn()
const deleteAnimeFansubProjectNoteMock = vi.fn()
const getFansubGroupCapabilitiesMock = vi.fn()

vi.mock('@/components/editor', () => ({
  RichTextEditor: () => <textarea />,
}))

vi.mock('@/components/editor/RichTextRenderer', () => ({
  RichTextRenderer: ({ bodyHtml }: { bodyHtml?: string | null }) => (
    <div dangerouslySetInnerHTML={{ __html: bodyHtml ?? '' }} />
  ),
}))

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {},
  deleteAnimeFansubProjectNote: (...args: unknown[]) => deleteAnimeFansubProjectNoteMock(...args),
  getAnimeFansubProjectNote: (...args: unknown[]) => getAnimeFansubProjectNoteMock(...args),
  upsertAnimeFansubProjectNote: (...args: unknown[]) => upsertAnimeFansubProjectNoteMock(...args),
  getFansubGroupCapabilities: (...args: unknown[]) => getFansubGroupCapabilitiesMock(...args),
}))

import { AnimeProjectNoteWorkspace } from './AnimeProjectNoteWorkspace'

beforeEach(() => {
  // 189-06/D-08: Standardmässig schlägt der neue, zusätzliche Projekt-Capability-Abruf
  // fehl -- effectiveCanEdit fällt dann auf die canEdit-Prop zurück, exakt wie vor diesem
  // Plan. Die bestehenden Tests unten prüfen weiterhin nur die canEdit-Prop und bleiben
  // dadurch unverändert gültig; die neuen Tests ganz unten überschreiben dieses Mock gezielt.
  getFansubGroupCapabilitiesMock.mockRejectedValue(new Error('not mocked in this test'))
})

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

  // 189-06/D-08: neue Tests für den eigenständigen Projekt-Capability-Abruf
  // (exaktes Spiegelbild von AnimeProjectTimelineSection.test.tsx).

  function makeCapabilitiesResponse(
    canEditProjectNotes: boolean,
  ): FansubGroupCapabilitiesResponse {
    return {
      data: {
        can_edit_group: false,
        can_edit_group_general: false,
        can_edit_technical_links: false,
        can_edit_founding_history: false,
        can_update_group_links: false,
        can_manage_links: false,
        can_view_members: false,
        can_manage_members: false,
        can_manage_historical_members: false,
        can_manage_historical_roles: false,
        can_link_historical_members: false,
        can_edit_notes: false,
        can_edit_project_timeline: false,
        can_edit_project_notes: canEditProjectNotes,
        can_view_invitations: false,
        can_create_invitation: false,
        can_cancel_invitation: false,
        can_view_releases: false,
        can_view_release_media: false,
        can_upload_release_media: false,
        can_edit_release_notes: false,
        can_view_group_media: false,
        can_upload_group_media: false,
        can_update_group_media: false,
        can_review_group_media: false,
        can_review_text: false,
        can_update_own_group_media: false,
        can_delete_own_group_media: false,
        can_delete_group_media: false,
        can_reorder_group_media: false,
      },
    }
  }

  it('zeigt die Bearbeiten/Löschen-Steuerelemente, wenn die projektbezogene Capability dies erlaubt, auch bei canEdit=false', async () => {
    getAnimeFansubProjectNoteMock.mockResolvedValue({
      id: 7,
      animeId: 9,
      fansubGroupId: 88,
      title: '',
      bodyJson: null,
      bodyHtml: '<p>Einblick</p>',
      bodyText: 'Einblick',
      editorType: 'tiptap',
      contentSchemaVersion: 1,
      visibility: 'public',
      status: 'published',
      sortOrder: 0,
      createdBy: null,
      updatedBy: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: null,
    })
    getFansubGroupCapabilitiesMock.mockResolvedValue(makeCapabilitiesResponse(true))

    render(
      <AnimeProjectNoteWorkspace fansubId={88} animeId={9} expanded canEdit={false} />,
    )

    await waitFor(() => {
      expect(getFansubGroupCapabilitiesMock).toHaveBeenCalledWith(88, undefined, {
        animeId: 9,
      })
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Einblick bearbeiten' })).not.toBeNull()
    })
    expect(screen.getByRole('button', { name: 'Einblick löschen' })).not.toBeNull()
  })

  it('verbirgt die Steuerelemente bei canEdit=true und einer verweigernden projektbezogenen Capability', async () => {
    getAnimeFansubProjectNoteMock.mockResolvedValue({
      id: 7,
      animeId: 9,
      fansubGroupId: 88,
      title: '',
      bodyJson: null,
      bodyHtml: '<p>Einblick</p>',
      bodyText: 'Einblick',
      editorType: 'tiptap',
      contentSchemaVersion: 1,
      visibility: 'public',
      status: 'published',
      sortOrder: 0,
      createdBy: null,
      updatedBy: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: null,
    })
    getFansubGroupCapabilitiesMock.mockResolvedValue(makeCapabilitiesResponse(false))

    render(
      <AnimeProjectNoteWorkspace fansubId={88} animeId={9} expanded canEdit={true} />,
    )

    await waitFor(() => {
      expect(getFansubGroupCapabilitiesMock).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Einblick bearbeiten' })).toBeNull()
    })
  })

  it('fällt bei fehlgeschlagenem Capability-Abruf auf die canEdit-Prop zurück', async () => {
    getAnimeFansubProjectNoteMock.mockResolvedValue({
      id: 7,
      animeId: 9,
      fansubGroupId: 88,
      title: '',
      bodyJson: null,
      bodyHtml: '<p>Einblick</p>',
      bodyText: 'Einblick',
      editorType: 'tiptap',
      contentSchemaVersion: 1,
      visibility: 'public',
      status: 'published',
      sortOrder: 0,
      createdBy: null,
      updatedBy: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: null,
    })
    getFansubGroupCapabilitiesMock.mockRejectedValue(new Error('network down'))

    render(
      <AnimeProjectNoteWorkspace fansubId={88} animeId={9} expanded canEdit={true} />,
    )

    await waitFor(() => {
      expect(getFansubGroupCapabilitiesMock).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Einblick bearbeiten' })).not.toBeNull()
    })
  })
})
