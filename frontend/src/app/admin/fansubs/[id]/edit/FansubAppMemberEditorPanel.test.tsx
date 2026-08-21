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
  roleOptions: [
    { code: 'translator', label_de: 'Übersetzung', contexts: ['fansub_group'], sort_order: 10, assignable: true, color_key: 'language', icon_key: 'languages', operative_capability_count: 1, has_operative_capabilities: true },
    { code: 'karaoke_fx', label_de: 'Karaoke-FX', contexts: ['fansub_group'], sort_order: 20, assignable: true, color_key: 'creative', icon_key: 'image', operative_capability_count: 0, has_operative_capabilities: false },
  ],
  roleOptionsError: null,
  historicalRoleDrafts: [{ id: 'role-1', roleCode: '', startedDate: '', endedDate: '' }],
  historyRoleOptions: [
    { code: 'founder', label_de: 'Gründung', sort_order: 1 },
    { code: 'quality_checker', label_de: 'Qualitätsprüfung', sort_order: 2 },
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
    expect(screen.getByRole('button', { name: 'Karaoke-FX' })).not.toBeNull()
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
    expect(bodyText).toMatch(/Übersetzung|Karaoke-FX/)
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
    expect(screen.getByText('Gründung')).not.toBeNull()
    expect(screen.getByLabelText('Eintrittsdatum')).not.toBeNull()
    expect(screen.getByLabelText('Austrittsdatum')).not.toBeNull()
  })

  it('zeigt den kompakten Hinweis nur für eine ausgewählte Rolle ohne operative Rechte', () => {
    render(
      <FansubAppMemberEditorPanel
        editorMember={mockMember}
        memberEditorTab="roles"
        setMemberEditorTab={noop}
        memberRoleDraft={['karaoke_fx']}
        mediaPermissionDraft={defaultMediaPermissions}
        isBusy={false}
        onClose={noop}
        onSave={noop}
        onToggleRole={noop}
        onToggleMediaPermission={noop as never}
        {...defaultEditorProps}
      />,
    )
    expect(screen.getByText('Diese Rolle verleiht aktuell keine zusätzlichen Rechte.')).not.toBeNull()
  })
})

describe('FansubAppMemberEditorPanel catalog color presentation', () => {
  it('emits bounded catalog color keys for Typesetting and Karaoke-FX choices', () => {
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
        roleOptions={[
          { ...defaultEditorProps.roleOptions[0], code: 'typesetter', label_de: 'Typesetting', color_key: '#7B3C4E' },
          { ...defaultEditorProps.roleOptions[1], color_key: '#A16207' },
        ]}
      />,
    )

    expect(screen.getByRole('button', { name: 'Typesetting' }).getAttribute('data-color-key')).toBe('#7b3c4e')
    expect(screen.getByRole('button', { name: 'Karaoke-FX' }).getAttribute('data-color-key')).toBe('#a16207')
  })
})

