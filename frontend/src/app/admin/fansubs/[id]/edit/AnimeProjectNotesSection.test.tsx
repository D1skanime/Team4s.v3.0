// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { AnimeFansubProjectNote } from '@/types/fansubNotes'

const getAdminFansubAnimeMock = vi.fn()
const getAnimeFansubProjectNoteMock = vi.fn()
const upsertAnimeFansubProjectNoteMock = vi.fn()

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
}))

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number

    constructor(message: string, status = 500) {
      super(message)
      this.status = status
    }
  },
  getAdminFansubAnime: (...args: unknown[]) => getAdminFansubAnimeMock(...args),
  getAnimeFansubProjectNote: (...args: unknown[]) => getAnimeFansubProjectNoteMock(...args),
  upsertAnimeFansubProjectNote: (...args: unknown[]) => upsertAnimeFansubProjectNoteMock(...args),
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
        authToken="token-1"
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
      expect(getAnimeFansubProjectNoteMock).toHaveBeenCalledWith(5, 22, 'token-1')
      expect(upsertAnimeFansubProjectNoteMock).toHaveBeenCalledWith(
        5,
        22,
        {
          title: 'Neuer Projekttext',
          bodyJson: makeBody('Das war ein besonderes Projekt.'),
          visibility: 'internal',
          status: 'draft',
        },
        'token-1',
      )
    })

    expect(await screen.findByText(/projekttext gespeichert/i)).not.toBeNull()
  })

  it('zeigt den Leerstaat für Gruppen ohne Anime-Zuordnungen', async () => {
    getAdminFansubAnimeMock.mockResolvedValue({ data: [] })

    render(<AnimeProjectNotesSection fansubId={5} authToken="token-2" />)

    expect(await screen.findByText(/diese gruppe hat noch keine anime-zuordnungen/i)).not.toBeNull()
  })
})
