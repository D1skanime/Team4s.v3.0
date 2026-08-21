// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { MemberRoleForVersion, ReleaseVersionNote } from '@/types/releaseVersionNotes'

const bulkUpsertReleaseVersionNotesMock = vi.fn()
const getMemberRolesForVersionMock = vi.fn()
const getOwnProfileMock = vi.fn()
const listReleaseVersionNotesMock = vi.fn()

const { catalogRoles } = vi.hoisted(() => ({
  catalogRoles: [
    { code: 'typesetter', label_de: 'Typesetting', contexts: ['anime_contribution'], sort_order: 10, color_key: 'technical', icon_key: 'wrench' },
    { code: 'karaoke_fx', label_de: 'Karaoke-FX', contexts: ['anime_contribution'], sort_order: 20, color_key: 'creative', icon_key: 'image' },
    { code: 'encoder', label_de: 'Encoding', contexts: ['anime_contribution'], sort_order: 30, color_key: 'production', icon_key: 'film' },
  ],
}))

vi.mock('@/providers/RoleCatalogProvider', () => ({
  useRoleCatalog: () => ({ roles: catalogRoles, error: null }),
}))

vi.mock('@/components/editor', () => ({
  RichTextEditor: ({
    value,
    onChange,
    placeholder,
    mode,
    toolbarVariant,
    showShortnoteHint = true,
    disabled = false,
  }: {
    value: unknown
    onChange: (next: unknown) => void
    placeholder?: string
    mode?: 'longform' | 'shortnote'
    toolbarVariant?: 'full' | 'minimal'
    showShortnoteHint?: boolean
    disabled?: boolean
  }) => (
    <div data-toolbar-variant={toolbarVariant ?? 'full'}>
      <textarea
        placeholder={placeholder}
        value={typeof value === 'object' && value !== null ? JSON.stringify(value) : ''}
        disabled={disabled}
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
  it('zeigt Notizrollen kataloggesteuert und ohne technische Codes', async () => {
    getMemberRolesForVersionMock.mockResolvedValue([
      makeRole({ roleId: 3, roleCode: 'encoder', roleName: 'encoder', roleLabel: 'Encoding' }),
      makeRole({ roleId: 2, roleCode: 'karaoke_fx', roleName: 'karaoke_fx', roleLabel: 'Karaoke-FX' }),
      makeRole({ roleId: 1, roleCode: 'typesetter', roleName: 'typesetter', roleLabel: 'Typesetting / FX' }),
    ])
    listReleaseVersionNotesMock.mockResolvedValue([])

    const { container } = render(<ReleaseVersionNotesTab versionId={7} />)

    const roleBadges = await waitFor(() => {
      const badges = Array.from(container.querySelectorAll('[data-role-code]'))
      expect(badges).toHaveLength(3)
      return badges
    })
    expect(roleBadges.map((badge) => badge.textContent)).toEqual([
      'Typesetting',
      'Karaoke-FX',
      'Encoding',
    ])
    expect(roleBadges.map((badge) => badge.getAttribute('data-role-code'))).toEqual([
      'technical',
      'creative',
      'production',
    ])
    expect(screen.queryByText('Typesetting / FX')).toBeNull()
    expect(screen.queryByText('typesetter')).toBeNull()
    expect(screen.queryByText('karaoke_fx')).toBeNull()
  })

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

  it('speichert ein einzelnes Rollenfeld und zeigt danach die Ansicht', async () => {
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
          roleCode: 'translator',
          title: null,
          bodyJson: makeBody('Neue Übersetzungsnotiz'),
          sortOrder: 0,
        },
      ],
    })
    expect(await screen.findByText(/neue übersetzungsnotiz/i)).not.toBeNull()
    expect(screen.getByRole('button', { name: /bearbeiten/i })).not.toBeNull()
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
    expect(screen.getByText(/bearbeitest als gruppenleitung/i)).not.toBeNull()
  })


  it('zeigt fremde Coop-Rollen als Nur-Ansicht und speichert sie nicht', async () => {
    getOwnProfileMock.mockResolvedValue({ data: { member_id: 10 } })
    getMemberRolesForVersionMock.mockResolvedValue([
      makeRole({ memberId: 10, memberName: 'Mira', roleId: 1, roleName: 'translator', canEdit: true }),
      makeRole({ memberId: 11, memberName: 'Taro', roleId: 2, roleName: 'editor', roleCode: 'editor', canEdit: false }),
    ])
    listReleaseVersionNotesMock.mockResolvedValue([
      makeNote({
        id: 301,
        memberId: 11,
        roleId: 2,
        bodyJson: makeBody('CSubs Text'),
        bodyText: 'CSubs Text',
        title: null,
      }),
    ])

    render(<ReleaseVersionNotesTab versionId={7} />)

    fireEvent.click(await screen.findByRole('tab', { name: /alle mitglieder/i }))
    fireEvent.click(screen.getByRole('button', { name: /taro/i }))

    expect(screen.getByText(/nur ansicht/i)).not.toBeNull()
    expect(screen.getByText(/csubs text/i)).not.toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button', { name: /^speichern$/i })).toBeNull()
    expect(bulkUpsertReleaseVersionNotesMock).not.toHaveBeenCalled()
  })

  it('öffnet gespeicherte eigene Notizen zuerst als Ansicht und erst per Bearbeiten im Editor', async () => {
    getMemberRolesForVersionMock.mockResolvedValue([
      makeRole({ roleId: 1, roleName: 'translator', roleLabel: 'Übersetzung' }),
    ])
    listReleaseVersionNotesMock.mockResolvedValue([
      makeNote({
        id: 301,
        memberId: 10,
        roleId: 1,
        bodyJson: makeBody('Schon gespeicherter Text'),
        bodyText: 'Schon gespeicherter Text',
        title: null,
      }),
    ])
    bulkUpsertReleaseVersionNotesMock.mockResolvedValue([
      makeNote({
        id: 301,
        memberId: 10,
        roleId: 1,
        bodyJson: makeBody('Aktualisierter Text'),
        bodyText: 'Aktualisierter Text',
        title: null,
      }),
    ])

    render(<ReleaseVersionNotesTab versionId={7} />)

    expect(await screen.findByText(/schon gespeicherter text/i)).not.toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /bearbeiten/i }))
    const editor = await screen.findByPlaceholderText(/noch keine notiz/i)
    fireEvent.change(editor, { target: { value: 'Aktualisierter Text' } })
    fireEvent.click(screen.getByRole('button', { name: /^speichern$/i }))

    await waitFor(() => {
      expect(bulkUpsertReleaseVersionNotesMock).toHaveBeenCalledTimes(1)
    })
    expect(await screen.findByText(/aktualisierter text/i)).not.toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('zeigt den eigenen Pending-Lifecycle mit letzter Aktivität ohne Review- oder Publikationsauswahl', async () => {
    getMemberRolesForVersionMock.mockResolvedValue([
      makeRole({ roleId: 1, roleName: 'translator', roleLabel: 'Übersetzung' }),
    ])
    listReleaseVersionNotesMock.mockResolvedValue([
      makeNote({
        id: 401,
        memberId: 10,
        roleId: 1,
        reviewState: 'pending',
        sourceRevision: 1,
        lastActivityAt: '2026-07-23T18:30:00Z',
      }),
    ])

    render(<ReleaseVersionNotesTab versionId={7} />)

    expect(await screen.findByText('In Prüfung')).not.toBeNull()
    expect(screen.getByText(/letzte aktivität/i)).not.toBeNull()
    expect(screen.queryByLabelText('Sichtbarkeit')).toBeNull()
    expect(screen.queryByLabelText('Status')).toBeNull()
  })

  it('zeigt eine eigene Ablehnung strukturiert und reicht dieselbe Notiz-ID mit Revision erneut ein', async () => {
    getMemberRolesForVersionMock.mockResolvedValue([
      makeRole({ roleId: 1, roleName: 'translator', roleLabel: 'Übersetzung' }),
    ])
    listReleaseVersionNotesMock.mockResolvedValue([
      makeNote({
        id: 402,
        memberId: 10,
        roleId: 1,
        reviewState: 'rejected',
        sourceRevision: 2,
        lastActivityAt: '2026-07-23T19:00:00Z',
        rejectionCategory: 'quality.insufficient',
        rejectionReason: 'Bitte die Terminologie noch einmal vollständig prüfen.',
      }),
    ])
    bulkUpsertReleaseVersionNotesMock.mockResolvedValue([
      makeNote({
        id: 402,
        memberId: 10,
        roleId: 1,
        reviewState: 'pending',
        sourceRevision: 3,
        lastActivityAt: '2026-07-23T19:10:00Z',
        rejectionCategory: null,
        rejectionReason: null,
      }),
    ])

    render(<ReleaseVersionNotesTab versionId={7} />)

    expect(await screen.findByText('Abgelehnt')).not.toBeNull()
    expect(screen.getByText('Qualität unzureichend')).not.toBeNull()
    expect(screen.getByText(/terminologie noch einmal vollständig prüfen/i)).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Bearbeiten' })).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Erneut einreichen' }))

    await waitFor(() => expect(bulkUpsertReleaseVersionNotesMock).toHaveBeenCalledTimes(1))
    expect(bulkUpsertReleaseVersionNotesMock).toHaveBeenCalledWith(7, {
      notes: [{
        id: 402,
        sourceRevision: 2,
        roleCode: 'translator',
        title: 'Bestehende Notiz',
        bodyJson: makeBody('Schon gespeichert'),
        sortOrder: 0,
      }],
    })
    expect(await screen.findByText('In Prüfung')).not.toBeNull()
  })

  it('zeigt bestätigte eigene Notizen öffentlich und ohne Review-Aktion', async () => {
    getMemberRolesForVersionMock.mockResolvedValue([
      makeRole({ roleId: 1, roleName: 'translator', roleLabel: 'Übersetzung' }),
    ])
    listReleaseVersionNotesMock.mockResolvedValue([
      makeNote({
        id: 403,
        memberId: 10,
        roleId: 1,
        visibility: 'public',
        status: 'published',
        reviewState: 'confirmed',
        sourceRevision: 1,
        lastActivityAt: '2026-07-23T19:30:00Z',
      }),
    ])

    render(<ReleaseVersionNotesTab versionId={7} />)

    expect(await screen.findByText('Bestätigt')).not.toBeNull()
    expect(screen.getByText('Öffentlich')).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Erneut einreichen' })).toBeNull()
  })

  it('blendet fremde offene Notizen ohne passende Bearbeitungsfähigkeit aus', async () => {
    getOwnProfileMock.mockResolvedValue({ data: { member_id: 10 } })
    getMemberRolesForVersionMock.mockResolvedValue([
      makeRole({ memberId: 10, roleId: 1, canEdit: true }),
      makeRole({ memberId: 11, memberName: 'Taro', roleId: 2, roleCode: 'editor', roleName: 'editor', canEdit: false }),
    ])
    listReleaseVersionNotesMock.mockResolvedValue([
      makeNote({
        id: 404,
        memberId: 11,
        roleId: 2,
        bodyJson: makeBody('Noch nicht freigegeben'),
        bodyText: 'Noch nicht freigegeben',
        reviewState: 'pending',
        sourceRevision: 1,
        lastActivityAt: '2026-07-23T20:00:00Z',
      }),
    ])

    render(<ReleaseVersionNotesTab versionId={7} />)
    fireEvent.click(await screen.findByRole('tab', { name: /alle mitglieder/i }))
    fireEvent.click(screen.getByRole('button', { name: /taro/i }))

    expect(screen.queryByText('Noch nicht freigegeben')).toBeNull()
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
    expect(await screen.findByText(/editing fertig/i)).not.toBeNull()
    expect(taroRow.getAttribute('aria-expanded')).toBe('true')

    await waitFor(() => {
      expect(taroRow.getAttribute('aria-expanded')).toBe('false')
    }, { timeout: 1500 })
  })
})
