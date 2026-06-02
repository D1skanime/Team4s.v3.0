// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { AnimeFansubProjectNote } from '@/types/fansubNotes'

const getAdminFansubAnimeMock = vi.fn()
const getAnimeFansubProjectNoteMock = vi.fn()
const upsertAnimeFansubProjectNoteMock = vi.fn()
const deleteAnimeFansubProjectNoteMock = vi.fn()

vi.mock('@/components/editor', () => ({
  RichTextEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value: unknown
    onChange: (next: unknown) => void
    placeholder?: string
  }) => (
    <textarea
      placeholder={placeholder}
      value={typeof value === 'object' && value !== null ? JSON.stringify(value) : ''}
      onChange={(event) => onChange({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: event.target.value }] }],
      })}
    />
  ),
  RichTextRenderer: ({ bodyHtml }: { bodyHtml?: string | null }) => (
    <div data-testid="rich-text-renderer" dangerouslySetInnerHTML={{ __html: bodyHtml ?? '' }} />
  ),
}))

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number

    constructor(message: string, status = 500) {
      super(message)
      this.status = status
    }
  },
  deleteAnimeFansubProjectNote: (...args: unknown[]) => deleteAnimeFansubProjectNoteMock(...args),
  getAdminFansubAnime: (...args: unknown[]) => getAdminFansubAnimeMock(...args),
  getAnimeFansubProjectNote: (...args: unknown[]) => getAnimeFansubProjectNoteMock(...args),
  upsertAnimeFansubProjectNote: (...args: unknown[]) => upsertAnimeFansubProjectNoteMock(...args),
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => ({
    authToken: '',
    hasAccessToken: true,
    hasRefreshToken: false,
    displayName: 'Test User',
    isClientInitialized: true,
  }),
}))

import { AnimeProjectNotesSection } from './AnimeProjectNotesSection'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function makeBody(text: string) {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  }
}

function makeProjectNote(overrides: Partial<AnimeFansubProjectNote> = {}): AnimeFansubProjectNote {
  return {
    id: 17,
    animeId: 22,
    fansubGroupId: 5,
    title: 'Projekttext',
    bodyMarkdown: 'Bestehender Projekttext',
    bodyHtml: '<p>Bestehender Projekttext</p>',
    bodyJson: makeBody('Bestehender Projekttext'),
    bodyText: 'Bestehender Projekttext',
    editorType: 'tiptap',
    contentSchemaVersion: 1,
    visibility: 'internal',
    status: 'draft',
    sortOrder: 0,
    createdByUserId: 1,
    updatedByUserId: null,
    createdAt: '2026-05-11T12:00:00Z',
    updatedAt: null,
    deletedAt: null,
    ...overrides,
  }
}

describe('AnimeProjectNotesSection', () => {
  it('verwendet übergebene Anime-Props ohne zusätzlichen Admin-Anime-Load', async () => {
    getAnimeFansubProjectNoteMock.mockResolvedValue(null)
    upsertAnimeFansubProjectNoteMock.mockResolvedValue(
      makeProjectNote({
        title: 'Neuer Projekttext',
        bodyMarkdown: 'Das war ein besonderes Projekt.',
        bodyHtml: '<p>Das war ein besonderes Projekt.</p>',
        bodyJson: makeBody('Das war ein besonderes Projekt.'),
        bodyText: 'Das war ein besonderes Projekt.',
      }),
    )

    render(
      <AnimeProjectNotesSection
        fansubId={5}
        hasAccessToken
        animes={[{ id: 22, title: 'Bleach' }]}
      />,
    )

    expect(getAdminFansubAnimeMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /bleach ausklappen/i }))

    const titleInput = await screen.findByPlaceholderText(/titel des projekttexts/i)
    const bodyInput = screen.getByPlaceholderText(/beschreibe hier das fansubprojekt/i)

    fireEvent.change(titleInput, { target: { value: 'Neuer Projekttext' } })
    fireEvent.change(bodyInput, { target: { value: 'Das war ein besonderes Projekt.' } })
    fireEvent.click(screen.getByRole('button', { name: /^speichern$/i }))

    await waitFor(() => {
      expect(getAnimeFansubProjectNoteMock).toHaveBeenCalledWith(5, 22)
      expect(upsertAnimeFansubProjectNoteMock).toHaveBeenCalledWith(
        5,
        22,
        {
          title: 'Neuer Projekttext',
          bodyJson: makeBody('Das war ein besonderes Projekt.'),
          visibility: 'internal',
          status: 'draft',
        },
      )
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^bearbeiten$/i })).not.toBeNull()
      expect(screen.getByRole('button', { name: /^löschen$/i })).not.toBeNull()
      expect(screen.getByText('Das war ein besonderes Projekt.')).not.toBeNull()
      expect(screen.queryByPlaceholderText(/titel des projekttexts/i)).toBeNull()
    })
  })

  it('zeigt vorhandene Projekttexte zuerst als Vorschau und öffnet den Editor erst über Bearbeiten', async () => {
    getAnimeFansubProjectNoteMock.mockResolvedValue(
      makeProjectNote({
        title: 'Schon gespeichert',
        bodyMarkdown: 'Preview Text',
        bodyHtml: '<p>Preview Text</p>',
        bodyJson: makeBody('Preview Text'),
        bodyText: 'Preview Text',
        visibility: 'public',
        status: 'published',
      }),
    )

    render(
      <AnimeProjectNotesSection
        fansubId={5}
        hasAccessToken
        animes={[{ id: 22, title: 'Bleach' }]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /bleach ausklappen/i }))

    expect(await screen.findByText('Schon gespeichert')).not.toBeNull()
    expect(screen.getByText('Preview Text')).not.toBeNull()
    expect(screen.queryByPlaceholderText(/titel des projekttexts/i)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /^bearbeiten$/i }))

    expect(await screen.findByDisplayValue('Schon gespeichert')).not.toBeNull()
  })

  it('löscht vorhandene Projekttexte und zeigt danach wieder den leeren Editor', async () => {
    getAnimeFansubProjectNoteMock.mockResolvedValue(makeProjectNote())
    deleteAnimeFansubProjectNoteMock.mockResolvedValue(undefined)

    render(
      <AnimeProjectNotesSection
        fansubId={5}
        hasAccessToken
        animes={[{ id: 22, title: 'Bleach' }]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /bleach ausklappen/i }))

    expect(await screen.findByRole('button', { name: /^löschen$/i })).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^löschen$/i }))

    await waitFor(() => {
      expect(deleteAnimeFansubProjectNoteMock).toHaveBeenCalledWith(5, 22, 17)
      expect(screen.getByPlaceholderText(/titel des projekttexts/i)).not.toBeNull()
    })
  })

  it('zeigt den Leerstaat für Gruppen ohne Anime-Zuordnungen', async () => {
    getAdminFansubAnimeMock.mockResolvedValue({ data: [] })

    render(<AnimeProjectNotesSection fansubId={5} hasAccessToken />)

    expect(await screen.findByText(/diese gruppe hat noch keine anime-zuordnungen/i)).not.toBeNull()
  })
})
