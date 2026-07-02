/**
 * @vitest-environment jsdom
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'

vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick, disabled, loading }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean }) => (
    <button onClick={onClick} disabled={disabled || loading}>{children}</button>
  ),
  DatePicker: ({ id, value, onChange, disabled }: { id: string; value: string; onChange: (value: string) => void; disabled?: boolean }) => (
    <input id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
  ),
  ErrorState: ({ title, description }: { title: string; description?: string }) => (
    <div role="alert">{title}{description}</div>
  ),
  FormField: ({ children, label, htmlFor }: { children: React.ReactNode; label: string; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{label}{children}</label>
  ),
  Modal: ({ open, children, title, description, footer }: { open: boolean; children: React.ReactNode; title: string; description?: string; footer?: React.ReactNode }) =>
    open ? (
      <div role="dialog" aria-modal="true">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        {children}
        {footer}
      </div>
    ) : null,
  Select: ({ children, value, onChange, disabled, id }: { children: React.ReactNode; value: string; onChange: React.ChangeEventHandler<HTMLSelectElement>; disabled?: boolean; id?: string }) => (
    <select id={id} value={value} onChange={onChange} disabled={disabled}>{children}</select>
  ),
}))

import { type FansubAppMember, type FansubGroupMediaPermissions } from '@/types/fansub'
import { FansubAppMemberEditorPanel } from './FansubAppMemberEditorPanel'

const defaultMediaPermissions: FansubGroupMediaPermissions = {
  can_upload: false,
  can_delete_own: false,
  can_delete_all: false,
  can_reorder: false,
}

const mockMember: FansubAppMember = {
  id: 1,
  fansub_group_id: 1,
  app_user_id: 10,
  status: 'active',
  roles: ['translator'],
  media_permissions: defaultMediaPermissions,
  member: {
    member_id: 1,
    fansub_name: 'TestUser',
  },
  created_at: '',
  updated_at: '',
}

const noop = () => {}
const defaultEditorProps = {
  historicalRoleDrafts: [{ id: 'role-1', roleCode: '', startedDate: '', endedDate: '' }],
  historyRoleOptions: [
    { code: 'founder', label_de: 'Gründer/in', sort_order: 1 },
    { code: 'quality_checker', label_de: 'Qualitätscheck', sort_order: 2 },
  ],
  historyRoleLoadError: null,
  canManageHistoricalRoles: true,
  historicalRoleCount: 0,
  yearMin: 1960,
  yearMax: 2026,
  onAddHistoricalRole: noop,
  onUpdateHistoricalRole: noop,
  onRemoveHistoricalRole: noop,
}

describe('FansubAppMemberEditorPanel', () => {
  it('zeigt aktive Rechte als eigenen Bearbeitungsbereich', () => {
    render(
      <FansubAppMemberEditorPanel
        editorMember={mockMember}
        memberEditorTab="roles"
        setMemberEditorTab={noop}
        memberRoleDraft={['translator']}
        mediaPermissionDraft={defaultMediaPermissions}
        isBusy={false}
        onClose={noop}
        onSave={noop}
        onToggleRole={noop}
        onToggleMediaPermission={noop as never}
        {...defaultEditorProps}
      />,
    )

    expect(document.body.textContent ?? '').toMatch(/Aktive Rolle in der Fansubgruppe/)
    expect(screen.getByRole('heading', { name: 'Leitung' })).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Übersetzung & Text' })).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Technik & Quelle' })).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Gestaltung' })).not.toBeNull()
    expect(screen.getByRole('tab', { name: /Historische Rollen/ })).not.toBeNull()
    expect(screen.queryByLabelText('Rolle 1')).toBeNull()
  })

  it('listet im aktive-Rollen-Panel nur aktive App-Rollen', () => {
    render(
      <FansubAppMemberEditorPanel
        editorMember={mockMember}
        memberEditorTab="roles"
        setMemberEditorTab={noop}
        memberRoleDraft={[]}
        mediaPermissionDraft={defaultMediaPermissions}
        isBusy={false}
        onClose={noop}
        onSave={noop}
        onToggleRole={noop}
        onToggleMediaPermission={noop as never}
        {...defaultEditorProps}
      />,
    )

    const bodyText = document.body.textContent ?? ''
    expect(bodyText).toMatch(/Gruppenleitung|Übersetzung|Encoding|Timing/)
    expect(screen.queryByLabelText('Rolle 1')).toBeNull()
  })

  it('bietet historische Rollen als eigenen Tab mit Datumsfeldern an', () => {
    render(
      <FansubAppMemberEditorPanel
        editorMember={mockMember}
        memberEditorTab="history"
        setMemberEditorTab={noop}
        memberRoleDraft={[]}
        mediaPermissionDraft={defaultMediaPermissions}
        isBusy={false}
        onClose={noop}
        onSave={noop}
        onToggleRole={noop}
        onToggleMediaPermission={noop as never}
        {...defaultEditorProps}
      />,
    )

    expect(screen.getByText(/geben keine aktiven Rechte/)).not.toBeNull()
    expect(screen.getByLabelText('Rolle 1')).not.toBeNull()
    expect(screen.getByText('Gründer/in')).not.toBeNull()
    expect(screen.getByLabelText('Eintrittsdatum')).not.toBeNull()
    expect(screen.getByLabelText('Austrittsdatum')).not.toBeNull()
  })
})
