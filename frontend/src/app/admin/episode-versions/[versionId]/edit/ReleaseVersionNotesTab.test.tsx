// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { MemberRoleForVersion, ReleaseVersionNote } from '@/types/releaseVersionNotes'

const bulkUpsertReleaseVersionNotesMock = vi.fn()
const getMemberRolesForVersionMock = vi.fn()
const listReleaseVersionNotesMock = vi.fn()

vi.mock('@/components/editor', () => ({
  RichTextEditor: ({
    value,
    onChange,
    placeholder,
    mode,
  }: {
    value: unknown
    onChange: (next: unknown) => void
    placeholder?: string
    mode?: 'longform' | 'shortnote'
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
      {mode === 'shortnote' ? <p>2–5 Sätze reichen</p> : null}
    </div>
  ),
}))

vi.mock('@/lib/api', () => ({
  bulkUpsertReleaseVersionNotes: (...args: unknown[]) => bulkUpsertReleaseVersionNotesMock(...args),
  getMemberRolesForVersion: (...args: unknown[]) => getMemberRolesForVersionMock(...args),
  listReleaseVersionNotes: (...args: unknown[]) => listReleaseVersionNotesMock(...args),
}))

import { ReleaseVersionNotesTab } from './ReleaseVersionNotesTab'

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

function makeRole(overrides: Partial<MemberRoleForVersion> = {}): MemberRoleForVersion {
  return {
    memberId: 10,
    memberName: 'Mira',
    roleId: 3,
    roleName: 'translator',
    roleLabel: 'Übersetzung',
    ...overrides,
  }
}

function makeNote(overrides: Partial<ReleaseVersionNote> = {}): ReleaseVersionNote {
  return {
    id: 91,
    releaseVersionId: 7,
    memberId: 10,
    roleId: 4,
    title: 'Bestehende Notiz',
    bodyMarkdown: 'Schon gespeichert',
    bodyHtml: '<p>Schon gespeichert</p>',
    bodyJson: makeBody('Schon gespeichert'),
    bodyText: 'Schon gespeichert',
    editorType: 'tiptap',
    contentSchemaVersion: 1,
    visibility: 'internal',
    status: 'draft',
    sortOrder: 0,
    createdByUserId: 1,
    updatedByUserId: 1,
    createdAt: '2026-05-11T12:00:00Z',
    updatedAt: null,
    deletedAt: null,
    ...overrides,
  }
}

describe('ReleaseVersionNotesTab', () => {
  it('zeigt den Leerstaat ohne Member-Rollen', async () => {
    getMemberRolesForVersionMock.mockResolvedValue([])
    listReleaseVersionNotesMock.mockResolvedValue([])

    render(<ReleaseVersionNotesTab versionId={7} />)

    expect(await screen.findByText(/keine Mitglieder und Rollen zugeordnet/i)).not.toBeNull()
  })

  it('rendert rollenspezifische Hilfetexte und überspringt leere neue Felder beim Bulk-Save', async () => {
    getMemberRolesForVersionMock.mockResolvedValue([
      makeRole({ roleId: 1, roleName: 'translator', roleLabel: 'Übersetzung' }),
      makeRole({ roleId: 2, roleName: 'editor', roleLabel: 'Editing' }),
    ])
    listReleaseVersionNotesMock.mockResolvedValue([])
    bulkUpsertReleaseVersionNotesMock.mockResolvedValue([
      makeNote({
        id: 201,
        memberId: 10,
        roleId: 1,
        bodyMarkdown: 'Neue Übersetzungsnotiz',
        bodyHtml: '<p>Neue Übersetzungsnotiz</p>',
        bodyJson: makeBody('Neue Übersetzungsnotiz'),
        bodyText: 'Neue Übersetzungsnotiz',
        title: null,
      }),
    ])

    render(<ReleaseVersionNotesTab versionId={7} />)

    const translatorField = await screen.findByPlaceholderText(/dialoge etwas freier übersetzt/i)
    expect(screen.getByText(/was an der Übersetzung dieser Version besonders war/i)).not.toBeNull()

    fireEvent.change(translatorField, { target: { value: 'Neue Übersetzungsnotiz' } })
    fireEvent.click(screen.getByRole('button', { name: /alle notizen speichern/i }))

    await waitFor(() => {
      expect(bulkUpsertReleaseVersionNotesMock).toHaveBeenCalledTimes(1)
    })

    expect(bulkUpsertReleaseVersionNotesMock).toHaveBeenCalledWith(7, {
      notes: [
        {
          id: 0,
          memberId: 10,
          roleId: 1,
          title: null,
          bodyJson: makeBody('Neue Übersetzungsnotiz'),
          visibility: 'internal',
          status: 'draft',
          sortOrder: 0,
        },
      ],
    })
    expect(await screen.findByText(/alle notizen wurden gespeichert/i)).not.toBeNull()
  })

  it('zeigt Konflikt- und Längenhinweise verständlich an', async () => {
    getMemberRolesForVersionMock.mockResolvedValue([
      makeRole({ roleId: 1, roleName: 'translator', roleLabel: 'Übersetzung' }),
    ])
    listReleaseVersionNotesMock.mockResolvedValue([])
    bulkUpsertReleaseVersionNotesMock.mockRejectedValue({ status: 409 })

    render(<ReleaseVersionNotesTab versionId={7} />)

    const translatorField = await screen.findByPlaceholderText(/dialoge etwas freier übersetzt/i)
    fireEvent.change(translatorField, { target: { value: 'x'.repeat(2000) } })

    expect(await screen.findByText(/empfohlene länge überschritten \(2000 zeichen\)/i)).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /alle notizen speichern/i }))

    expect(await screen.findByText(/existiert bereits eine notiz/i)).not.toBeNull()
  })

  it('zeigt fachliche 400-fehler für ungültige mitglied-rollenkontexte an', async () => {
    getMemberRolesForVersionMock.mockResolvedValue([
      makeRole({ roleId: 1, roleName: 'translator', roleLabel: 'Übersetzung' }),
    ])
    listReleaseVersionNotesMock.mockResolvedValue([])
    bulkUpsertReleaseVersionNotesMock.mockRejectedValue({ status: 400 })

    render(<ReleaseVersionNotesTab versionId={7} />)

    const translatorField = await screen.findByPlaceholderText(/dialoge etwas freier übersetzt/i)
    fireEvent.change(translatorField, { target: { value: 'Serverseitig abgelehnt' } })
    fireEvent.click(screen.getByRole('button', { name: /alle notizen speichern/i }))

    expect(await screen.findByText(/mitglied-rollen-zuordnung passt nicht mehr zu dieser release-version/i)).not.toBeNull()
  })

  it('hält mehrere Rollenfelder beim Tippen getrennt', async () => {
    getMemberRolesForVersionMock.mockResolvedValue([
      makeRole({ roleId: 1, roleName: 'editor', roleLabel: 'Editing' }),
      makeRole({ roleId: 2, roleName: 'raw_provider', roleLabel: 'Raw-Bereitstellung' }),
    ])
    listReleaseVersionNotesMock.mockResolvedValue([])

    render(<ReleaseVersionNotesTab versionId={7} />)

    const editorFields = await screen.findAllByRole('textbox')
    fireEvent.change(editorFields[0], { target: { value: 'Nur Editing' } })

    expect((editorFields[0] as HTMLTextAreaElement).value).toContain('Nur Editing')
    expect((editorFields[1] as HTMLTextAreaElement).value).not.toContain('Nur Editing')
  })

  it('shows clear role labels when multiple roles exist', async () => {
    getMemberRolesForVersionMock.mockResolvedValue([
      makeRole({ roleId: 1, roleName: 'editor', roleLabel: 'Editing' }),
      makeRole({ roleId: 2, roleName: 'raw_provider', roleLabel: 'Raw-Bereitstellung' }),
    ])
    listReleaseVersionNotesMock.mockResolvedValue([])

    render(<ReleaseVersionNotesTab versionId={7} />)

    expect(await screen.findByText(/^Editing$/i)).not.toBeNull()
    expect(screen.getByText(/^editor$/i)).not.toBeNull()
    expect(screen.getByText(/^Raw-Bereitstellung$/i)).not.toBeNull()
    expect(screen.getByText(/^raw_provider$/i)).not.toBeNull()
  })
})
