// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { MemberRoleForVersion, ReleaseVersionNote } from '@/types/releaseVersionNotes'

const bulkUpsertReleaseVersionNotesMock = vi.fn()
const getMemberRolesForVersionMock = vi.fn()
const getOwnProfileMock = vi.fn()
const listReleaseVersionNotesMock = vi.fn()

vi.mock('@/components/editor', () => ({
  RichTextEditor: ({
    value,
    onChange,
    placeholder,
    mode,
    toolbarVariant,
    showShortnoteHint = true,
  }: {
    value: unknown
    onChange: (next: unknown) => void
    placeholder?: string
    mode?: 'longform' | 'shortnote'
    toolbarVariant?: 'full' | 'minimal'
    showShortnoteHint?: boolean
  }) => (
    <div data-toolbar-variant={toolbarVariant ?? 'full'}>
      <textarea
        placeholder={placeholder}
        value={typeof value === 'object' && value !== null ? JSON.stringify(value) : ''}
        onChange={(event) => onChange({
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: event.target.value }] }],
        })}
      />
      {mode === 'shortnote' && showShortnoteHint ? <p>2-5 Sätze reichen</p> : null}
    </div>
  ),
}))

vi.mock('@/lib/api', () => ({
  bulkUpsertReleaseVersionNotes: (...args: unknown[]) => bulkUpsertReleaseVersionNotesMock(...args),
  getMemberRolesForVersion: (...args: unknown[]) => getMemberRolesForVersionMock(...args),
  getOwnProfile: (...args: unknown[]) => getOwnProfileMock(...args),
  listReleaseVersionNotes: (...args: unknown[]) => listReleaseVersionNotesMock(...args),
}))

import { ReleaseVersionNotesTab } from './ReleaseVersionNotesTab'

beforeEach(() => {
  getOwnProfileMock.mockResolvedValue({ data: { member_id: 10 } })
})

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
  const roleName = overrides.roleName ?? overrides.roleCode ?? 'translator'
  return {
    memberId: 10,
    memberName: 'Mira',
    roleId: 3,
    roleCode: roleName,
    roleName,
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

    expect(await screen.findByText(/keine rollen zugeordnet/i)).not.toBeNull()
  })

  it('rendert eine einzelne einklappbare Hilfe und keine Editor-Hinweise je Rollenblock', async () => {
    getMemberRolesForVersionMock.mockResolvedValue([
      makeRole({ roleId: 1, roleName: 'translator', roleLabel: 'Übersetzung' }),
    ])
    listReleaseVersionNotesMock.mockResolvedValue([])

    const { unmount } = render(<ReleaseVersionNotesTab versionId={7} />)

    const helpToggle = await screen.findByRole('button', { name: /wie schreibe ich eine gute notiz/i })
    expect(helpToggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(helpToggle)
    expect(helpToggle.getAttribute('aria-expanded')).toBe('true')
    expect(await screen.findByText(/beschreibe kurz/i)).not.toBeNull()
    fireEvent.click(helpToggle)
    expect(helpToggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText(/beschreibe kurz/i)).toBeNull()
    fireEvent.click(helpToggle)
    expect(helpToggle.getAttribute('aria-expanded')).toBe('true')
    unmount()
    render(<ReleaseVersionNotesTab versionId={7} />)
    const reloadedHelpToggle = await screen.findByRole('button', { name: /wie schreibe ich eine gute notiz/i })
    expect(reloadedHelpToggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText(/beschreibe kurz/i)).toBeNull()
    expect(screen.queryByText(/2-5 sätze reichen/i)).toBeNull()
    expect(document.querySelector('[data-toolbar-variant="minimal"]')).not.toBeNull()
  })

  it('speichert ein einzelnes Rollenfeld und zeigt kurzes Feedback', async () => {
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
        bodyJson: makeBody('Neue Übersetzungsnotiz'),
        bodyText: 'Neue Übersetzungsnotiz',
        title: null,
      }),
    ])

    render(<ReleaseVersionNotesTab versionId={7} />)

    const translatorField = await screen.findAllByPlaceholderText(/noch keine notiz/i)
    fireEvent.change(translatorField[0], { target: { value: 'Neue Übersetzungsnotiz' } })
    fireEvent.click(screen.getAllByRole('button', { name: /^speichern$/i })[0])

    await waitFor(() => {
      expect(bulkUpsertReleaseVersionNotesMock).toHaveBeenCalledTimes(1)
    })
    expect(bulkUpsertReleaseVersionNotesMock).toHaveBeenCalledWith(7, {
      notes: [
        {
          id: 0,
          memberId: 10,
          roleId: 1,
          roleCode: 'translator',
          title: null,
          bodyJson: makeBody('Neue Übersetzungsnotiz'),
          visibility: 'internal',
          status: 'draft',
          sortOrder: 0,
        },
      ],
    })
    expect(await screen.findByText(/gespeichert/i)).not.toBeNull()
  })

  it('zeigt Mitglieder im Alle-Mitglieder-Tab als Accordion', async () => {
    getOwnProfileMock.mockResolvedValue({ data: { member_id: 10 } })
    getMemberRolesForVersionMock.mockResolvedValue([
      makeRole({ memberId: 10, memberName: 'Mira', roleId: 1, roleName: 'translator' }),
      makeRole({ memberId: 11, memberName: 'Taro', roleId: 2, roleName: 'editor', roleCode: 'editor' }),
    ])
    listReleaseVersionNotesMock.mockResolvedValue([])

    render(<ReleaseVersionNotesTab versionId={7} />)

    fireEvent.click(await screen.findByRole('tab', { name: /alle mitglieder/i }))
    const taroRow = screen.getByRole('button', { name: /taro/i })
    expect(taroRow.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(taroRow)
    expect(taroRow.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText(/bearbeitest als leiter/i)).not.toBeNull()
  })

  it('zeigt Konflikt- und Längenhinweise verständlich an', async () => {
    getMemberRolesForVersionMock.mockResolvedValue([
      makeRole({ roleId: 1, roleName: 'translator', roleLabel: 'Übersetzung' }),
    ])
    listReleaseVersionNotesMock.mockResolvedValue([])
    bulkUpsertReleaseVersionNotesMock.mockRejectedValue({ status: 409 })

    render(<ReleaseVersionNotesTab versionId={7} />)

    const translatorField = await screen.findByPlaceholderText(/noch keine notiz/i)
    fireEvent.change(translatorField, { target: { value: 'x'.repeat(2000) } })

    expect(await screen.findByText(/empfohlene länge überschritten \(2000 zeichen\)/i)).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /^speichern$/i }))

    expect(await screen.findByText(/existiert bereits eine notiz/i)).not.toBeNull()
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

  it('klappt eine Alle-Mitglieder-Zeile nach Abbrechen oder Speichern wieder ein', async () => {
    getOwnProfileMock.mockResolvedValue({ data: { member_id: 10 } })
    getMemberRolesForVersionMock.mockResolvedValue([
      makeRole({ memberId: 10, memberName: 'Mira', roleId: 1, roleName: 'translator' }),
      makeRole({ memberId: 11, memberName: 'Taro', roleId: 2, roleName: 'editor', roleCode: 'editor' }),
    ])
    listReleaseVersionNotesMock.mockResolvedValue([])
    bulkUpsertReleaseVersionNotesMock.mockResolvedValue([
      makeNote({
        id: 202,
        memberId: 11,
        roleId: 2,
        bodyJson: makeBody('Editing fertig'),
        bodyText: 'Editing fertig',
        title: null,
      }),
    ])

    render(<ReleaseVersionNotesTab versionId={7} />)

    fireEvent.click(await screen.findByRole('tab', { name: /alle mitglieder/i }))
    const taroRow = screen.getByRole('button', { name: /taro/i })

    fireEvent.click(taroRow)
    expect(taroRow.getAttribute('aria-expanded')).toBe('true')
    fireEvent.change(await screen.findByPlaceholderText(/noch keine notiz/i), { target: { value: 'Wird verworfen' } })
    fireEvent.click(screen.getByRole('button', { name: /^abbrechen$/i }))
    expect(taroRow.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(taroRow)
    fireEvent.change(await screen.findByPlaceholderText(/noch keine notiz/i), { target: { value: 'Editing fertig' } })
    fireEvent.click(screen.getByRole('button', { name: /^speichern$/i }))

    await waitFor(() => {
      expect(bulkUpsertReleaseVersionNotesMock).toHaveBeenCalledTimes(1)
    })
    expect(await screen.findByText(/gespeichert/i)).not.toBeNull()
    expect(taroRow.getAttribute('aria-expanded')).toBe('true')

    await waitFor(() => {
      expect(taroRow.getAttribute('aria-expanded')).toBe('false')
    }, { timeout: 1500 })
  })
})
