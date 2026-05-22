// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { FansubGroupNote } from '@/types/fansubNotes'

const createFansubGroupNoteMock = vi.fn()
const deleteFansubGroupNoteMock = vi.fn()
const getAuthSessionSnapshotMock = vi.fn()
const listFansubGroupNotesMock = vi.fn()
const updateFansubGroupNoteMock = vi.fn()

vi.mock('@/components/editor', () => ({
  RichTextEditor: ({
    value,
    onChange,
    placeholder,
    helperText,
  }: {
    value: unknown
    onChange: (next: unknown) => void
    placeholder?: string
    helperText?: string
  }) => (
    <div>
      <textarea
        placeholder={placeholder}
        value={typeof value === 'object' && value !== null ? JSON.stringify(value) : ''}
        onChange={(event) => onChange({
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: event.target.value }] }],
        })}
      />
      {helperText ? <p>{helperText}</p> : null}
    </div>
  ),
  RichTextRenderer: ({ bodyHtml }: { bodyHtml?: string | null }) => (
    <div dangerouslySetInnerHTML={{ __html: bodyHtml || '' }} />
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
  createFansubGroupNote: (...args: unknown[]) => createFansubGroupNoteMock(...args),
  deleteFansubGroupNote: (...args: unknown[]) => deleteFansubGroupNoteMock(...args),
  API_AUTH_SESSION_TOKEN: 'runtime-auth',
  AUTH_SESSION_CHANGED_EVENT: 'team4s:auth-session-changed',
  getAuthSessionSnapshot: (...args: unknown[]) => getAuthSessionSnapshotMock(...args),
  listFansubGroupNotes: (...args: unknown[]) => listFansubGroupNotesMock(...args),
  updateFansubGroupNote: (...args: unknown[]) => updateFansubGroupNoteMock(...args),
}))

import { NotesTab } from './NotesTab'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function makeGroupBody(text: string) {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  }
}

function makeGroupNote(overrides: Partial<FansubGroupNote> = {}): FansubGroupNote {
  return {
    id: 3,
    fansubGroupId: 8,
    title: 'Wie alles begann',
    bodyMarkdown: 'Unsere Gruppe entstand 2008.',
    bodyHtml: '<p>Unsere Gruppe entstand 2008.</p>',
    bodyJson: makeGroupBody('Unsere Gruppe entstand 2008.'),
    bodyText: 'Unsere Gruppe entstand 2008.',
    editorType: 'tiptap',
    contentSchemaVersion: 1,
    visibility: 'public',
    status: 'published',
    sortOrder: 0,
    createdByUserId: 1,
    updatedByUserId: null,
    createdAt: '2026-05-11T12:00:00Z',
    updatedAt: null,
    deletedAt: null,
    ...overrides,
  }
}

describe('NotesTab', () => {
  it('lädt nur Gruppennotizen im Gruppen-Workspace', async () => {
    getAuthSessionSnapshotMock.mockReturnValue({ hasAccessToken: true, hasRefreshToken: true, displayName: 'LocalAdmin' })
    listFansubGroupNotesMock.mockResolvedValue([makeGroupNote()])

    render(<NotesTab fansubId={8} />)

    expect(await screen.findByText('Wie alles begann')).not.toBeNull()
    expect(screen.queryByText('Mitgliedergeschichten')).toBeNull()
    expect(screen.queryByRole('button', { name: /neue geschichte/i })).toBeNull()
    expect(listFansubGroupNotesMock).toHaveBeenCalledWith(8)
  })

  it('legt eine neue Gruppennotiz über den bestehenden Save-Flow an', async () => {
    getAuthSessionSnapshotMock.mockReturnValue({ hasAccessToken: true, hasRefreshToken: true, displayName: 'LocalAdmin' })
    listFansubGroupNotesMock.mockResolvedValue([])
    createFansubGroupNoteMock.mockResolvedValue(
      makeGroupNote({
        id: 77,
        title: 'Unser Stil',
        bodyMarkdown: 'Gut lesbare Untertitel.',
        bodyHtml: '<p>Gut lesbare Untertitel.</p>',
        bodyJson: makeGroupBody('Gut lesbare Untertitel.'),
        bodyText: 'Gut lesbare Untertitel.',
      }),
    )

    render(<NotesTab fansubId={8} />)

    await screen.findByText(/noch keine gruppennotizen vorhanden/i)
    fireEvent.click(screen.getByRole('button', { name: /neue gruppennotiz hinzufügen/i }))

    const titleInputs = screen.getAllByPlaceholderText(/titel der notiz/i)
    const bodyInputs = screen.getAllByPlaceholderText(/notiztext eingeben/i)

    fireEvent.change(titleInputs[0], { target: { value: 'Unser Stil' } })
    fireEvent.change(bodyInputs[0], { target: { value: 'Gut lesbare Untertitel.' } })
    fireEvent.click(screen.getAllByRole('button', { name: /^speichern$/i })[0])

    await waitFor(() => {
      expect(createFansubGroupNoteMock).toHaveBeenCalledWith(
        8,
        {
          title: 'Unser Stil',
          bodyJson: makeGroupBody('Gut lesbare Untertitel.'),
          visibility: 'public',
          status: 'draft',
          sortOrder: 0,
        },
      )
    })

    expect(await screen.findByText('Unser Stil')).not.toBeNull()
    expect(screen.queryByPlaceholderText(/titel der notiz/i)).toBeNull()
  })

  it('kann neue ungespeicherte Gruppennotizen wieder verwerfen', async () => {
    getAuthSessionSnapshotMock.mockReturnValue({ hasAccessToken: true, hasRefreshToken: true, displayName: 'LocalAdmin' })
    listFansubGroupNotesMock.mockResolvedValue([])

    render(<NotesTab fansubId={8} />)

    await screen.findByText(/noch keine gruppennotizen vorhanden/i)
    fireEvent.click(screen.getByRole('button', { name: /neue gruppennotiz hinzufügen/i }))

    expect(screen.getAllByPlaceholderText(/titel der notiz/i)).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /verwerfen/i }))

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/titel der notiz/i)).toBeNull()
    })
  })
})
