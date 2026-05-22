// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { FansubGroupNote, MemberGroupStory } from '@/types/fansubNotes'

const createFansubGroupNoteMock = vi.fn()
const createMemberGroupStoryMock = vi.fn()
const deleteFansubGroupNoteMock = vi.fn()
const deleteMemberGroupStoryMock = vi.fn()
const getMemberGroupStoryContextMock = vi.fn()
const getAuthSessionSnapshotMock = vi.fn()
const getRuntimeDisplayNameMock = vi.fn()
const listFansubGroupNotesMock = vi.fn()
const listMemberGroupStoriesMock = vi.fn()
const updateFansubGroupNoteMock = vi.fn()
const updateMemberGroupStoryMock = vi.fn()

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
  createMemberGroupStory: (...args: unknown[]) => createMemberGroupStoryMock(...args),
  deleteFansubGroupNote: (...args: unknown[]) => deleteFansubGroupNoteMock(...args),
  deleteMemberGroupStory: (...args: unknown[]) => deleteMemberGroupStoryMock(...args),
  getMemberGroupStoryContext: (...args: unknown[]) => getMemberGroupStoryContextMock(...args),
  API_AUTH_SESSION_TOKEN: 'runtime-auth',
  AUTH_SESSION_CHANGED_EVENT: 'team4s:auth-session-changed',
  getAuthSessionSnapshot: (...args: unknown[]) => getAuthSessionSnapshotMock(...args),
  getRuntimeDisplayName: (...args: unknown[]) => getRuntimeDisplayNameMock(...args),
  listFansubGroupNotes: (...args: unknown[]) => listFansubGroupNotesMock(...args),
  listMemberGroupStories: (...args: unknown[]) => listMemberGroupStoriesMock(...args),
  updateFansubGroupNote: (...args: unknown[]) => updateFansubGroupNoteMock(...args),
  updateMemberGroupStory: (...args: unknown[]) => updateMemberGroupStoryMock(...args),
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

function makeStoryContext() {
  return {
    members: [
      { id: 1, nickname: 'LocalAdmin' },
      { id: 23, nickname: 'Mika' },
    ],
    roles: [
      { id: 5, name: 'typesetter', label: 'Typesetting / FX' },
      { id: 8, name: 'editor', label: 'Editing' },
    ],
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

function makeStory(overrides: Partial<MemberGroupStory> = {}): MemberGroupStory {
  return {
    id: 4,
    fansubGroupId: 8,
    memberId: 23,
    roleId: 5,
    title: 'Meine Zeit als Typesetter',
    bodyMarkdown: 'Viele lange Nächte mit Karaoke-FX.',
    bodyHtml: '<p>Viele lange Nächte mit Karaoke-FX.</p>',
    bodyJson: makeGroupBody('Viele lange Nächte mit Karaoke-FX.'),
    bodyText: 'Viele lange Nächte mit Karaoke-FX.',
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
  it('lädt Gruppennotizen und Mitgliedergeschichten parallel', async () => {
    getAuthSessionSnapshotMock.mockReturnValue({ hasAccessToken: true, hasRefreshToken: true, displayName: 'LocalAdmin' })
    getRuntimeDisplayNameMock.mockReturnValue('LocalAdmin')
    listFansubGroupNotesMock.mockResolvedValue([makeGroupNote()])
    listMemberGroupStoriesMock.mockResolvedValue([makeStory()])
    getMemberGroupStoryContextMock.mockResolvedValue(makeStoryContext())

    render(<NotesTab fansubId={8} />)

    expect(await screen.findByText('Wie alles begann')).not.toBeNull()
    expect(await screen.findByText('Meine Zeit als Typesetter')).not.toBeNull()
    expect(screen.getAllByRole('button', { name: /bearbeiten/i }).length).toBeGreaterThan(0)
    expect(listFansubGroupNotesMock).toHaveBeenCalledWith(8)
    expect(listMemberGroupStoriesMock).toHaveBeenCalledWith(8)
    expect(getMemberGroupStoryContextMock).toHaveBeenCalledWith(8)
  })

  it('legt eine neue Gruppennotiz über den bestehenden Save-Flow an', async () => {
    getAuthSessionSnapshotMock.mockReturnValue({ hasAccessToken: true, hasRefreshToken: true, displayName: 'LocalAdmin' })
    getRuntimeDisplayNameMock.mockReturnValue('LocalAdmin')
    listFansubGroupNotesMock.mockResolvedValue([])
    listMemberGroupStoriesMock.mockResolvedValue([])
    getMemberGroupStoryContextMock.mockResolvedValue(makeStoryContext())
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

  it('deaktiviert neue geschichten ohne verfügbare mitglieder', async () => {
    getAuthSessionSnapshotMock.mockReturnValue({ hasAccessToken: true, hasRefreshToken: true, displayName: 'LocalAdmin' })
    getRuntimeDisplayNameMock.mockReturnValue('LocalAdmin')
    listFansubGroupNotesMock.mockResolvedValue([])
    listMemberGroupStoriesMock.mockResolvedValue([])
    getMemberGroupStoryContextMock.mockResolvedValue({ members: [], roles: [] })

    render(<NotesTab fansubId={8} />)

    await screen.findByText(/noch keine mitgliedergeschichten vorhanden/i)
    const addButton = screen.getByRole('button', { name: /neue geschichte hinzufügen/i })
    expect((addButton as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/keine auswählbaren mitglieder vorhanden/i)).not.toBeNull()
    expect(createMemberGroupStoryMock).not.toHaveBeenCalled()
  })

  it('verwendet namen und rollenlisten statt roher ids für neue geschichten', async () => {
    getAuthSessionSnapshotMock.mockReturnValue({ hasAccessToken: true, hasRefreshToken: true, displayName: 'LocalAdmin' })
    getRuntimeDisplayNameMock.mockReturnValue('LocalAdmin')
    listFansubGroupNotesMock.mockResolvedValue([])
    listMemberGroupStoriesMock.mockResolvedValue([])
    getMemberGroupStoryContextMock.mockResolvedValue(makeStoryContext())
    createMemberGroupStoryMock.mockResolvedValue(
      makeStory({
        id: 41,
        memberId: 1,
        roleId: 8,
        title: 'Mein Einstieg',
        bodyMarkdown: 'Hallo Team4s.',
        bodyHtml: '<p>Hallo Team4s.</p>',
        bodyJson: makeGroupBody('Hallo Team4s.'),
        bodyText: 'Hallo Team4s.',
      }),
    )

    render(<NotesTab fansubId={8} />)

    await screen.findByText(/noch keine mitgliedergeschichten vorhanden/i)
    fireEvent.click(screen.getByRole('button', { name: /neue geschichte hinzufügen/i }))

    expect(screen.getByDisplayValue('LocalAdmin')).not.toBeNull()
    fireEvent.change(screen.getByLabelText(/^rolle/i), { target: { value: '8' } })
    fireEvent.change(screen.getByPlaceholderText(/titel der geschichte/i), { target: { value: 'Mein Einstieg' } })
    fireEvent.change(screen.getByPlaceholderText(/geschichte eingeben/i), { target: { value: 'Hallo Team4s.' } })
    fireEvent.click(screen.getAllByRole('button', { name: /^speichern$/i })[0])

    await waitFor(() => {
      expect(createMemberGroupStoryMock).toHaveBeenCalledWith(
        8,
        {
          memberId: 1,
          roleId: 8,
          title: 'Mein Einstieg',
          bodyJson: makeGroupBody('Hallo Team4s.'),
          visibility: 'public',
          status: 'draft',
          sortOrder: 0,
        },
      )
    })
  })

  it('kann neue ungespeicherte gruppennotizen wieder verwerfen', async () => {
    getAuthSessionSnapshotMock.mockReturnValue({ hasAccessToken: true, hasRefreshToken: true, displayName: 'LocalAdmin' })
    getRuntimeDisplayNameMock.mockReturnValue('LocalAdmin')
    listFansubGroupNotesMock.mockResolvedValue([])
    listMemberGroupStoriesMock.mockResolvedValue([])
    getMemberGroupStoryContextMock.mockResolvedValue(makeStoryContext())

    render(<NotesTab fansubId={8} />)

    await screen.findByText(/noch keine gruppennotizen vorhanden/i)
    fireEvent.click(screen.getByRole('button', { name: /neue gruppennotiz hinzufügen/i }))

    expect(screen.getAllByPlaceholderText(/titel der notiz/i)).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /verwerfen/i }))

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/titel der notiz/i)).toBeNull()
    })
  })

  it('sendet bei bestehenden mitgliedergeschichten kein memberId- oder roleId-update mehr', async () => {
    getAuthSessionSnapshotMock.mockReturnValue({ hasAccessToken: true, hasRefreshToken: true, displayName: 'LocalAdmin' })
    getRuntimeDisplayNameMock.mockReturnValue('LocalAdmin')
    listFansubGroupNotesMock.mockResolvedValue([])
    listMemberGroupStoriesMock.mockResolvedValue([makeStory()])
    getMemberGroupStoryContextMock.mockResolvedValue(makeStoryContext())
    updateMemberGroupStoryMock.mockResolvedValue(
      makeStory({
        title: 'Überarbeitete Geschichte',
        bodyMarkdown: 'Neu formuliert.',
        bodyHtml: '<p>Neu formuliert.</p>',
        bodyJson: makeGroupBody('Neu formuliert.'),
        bodyText: 'Neu formuliert.',
      }),
    )

    render(<NotesTab fansubId={8} />)

    await screen.findByText('Meine Zeit als Typesetter')
    fireEvent.click(screen.getByRole('button', { name: /weiter bearbeiten/i }))

    const titleInput = await screen.findByDisplayValue('Meine Zeit als Typesetter')
    const memberSelect = screen.getByDisplayValue('Mika')
    const roleSelect = screen.getByDisplayValue('Typesetting / FX (typesetter)')

    expect((memberSelect as HTMLSelectElement).disabled).toBe(true)
    expect((roleSelect as HTMLSelectElement).disabled).toBe(true)

    fireEvent.change(titleInput, { target: { value: 'Überarbeitete Geschichte' } })
    fireEvent.click(screen.getAllByRole('button', { name: /^speichern$/i })[0])

    await waitFor(() => {
      expect(updateMemberGroupStoryMock).toHaveBeenCalledWith(
        8,
        4,
        {
          title: 'Überarbeitete Geschichte',
          bodyJson: makeGroupBody('Viele lange Nächte mit Karaoke-FX.'),
          visibility: 'public',
          status: 'published',
          sortOrder: 0,
        },
      )
    })
  })
})
