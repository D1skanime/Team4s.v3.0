// @vitest-environment jsdom

import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { GroupMemberFormModals, type MemberFormFields } from './GroupMemberFormModals'
import type { InlineMemberRoleDraft } from './useGroupMembersTab'
import type { HistFansubGroupMember } from '@/types/fansub'

const existingMembers: HistFansubGroupMember[] = [
  {
    id: 1,
    fansub_group_id: 9,
    member_id: 1,
    display_name: 'Sora',
    joined_date: null,
    left_date: null,
    app_user_id: null,
    app_username: null,
    status: 'confirmed',
    created_at: '2024-01-01T00:00:00Z',
  },
]

function Harness() {
  const [form, setForm] = useState<MemberFormFields>({
    displayName: '',
    joinedDate: '',
    leftDate: '',
    visibility: 'internal',
  })
  const [inlineRoleDrafts, setInlineRoleDrafts] = useState<InlineMemberRoleDraft[]>([
    { id: 'role-1', roleCode: 'translator', startedDate: '', endedDate: '' },
  ])

  return (
    <GroupMemberFormModals
      modalOpen
      editTarget={null}
      form={form}
      setForm={setForm}
      inlineRoleDrafts={inlineRoleDrafts}
      setInlineRoleDrafts={setInlineRoleDrafts}
      historyRoleOptions={[{ code: 'translator', label_de: 'Übersetzung', sort_order: 1 }]}
      existingMembers={existingMembers}
      saving={false}
      modalError={null}
      onClose={() => {}}
      onSave={() => {}}
      yearMin={2000}
      yearMax={2030}
      deleteTarget={null}
      deleting={false}
      deleteError={null}
      onCloseDelete={() => {}}
      onConfirmDelete={() => {}}
      roleDeleteTarget={null}
      roleDeleting={false}
      roleDeleteError={null}
      onCloseRoleDelete={() => {}}
      onConfirmRoleDelete={() => {}}
      roleLabelForCode={(code) => code}
    />
  )
}

describe('GroupMemberFormModals duplicate confirmation reset (render-time state adjust)', () => {
  afterEach(cleanup)

  it('resets duplicate confirmation when the display name changes after confirming', () => {
    render(<Harness />)

    fireEvent.change(screen.getByLabelText('Anzeigename'), { target: { value: 'Sora' } })
    expect(screen.getByText(/existiert bereits/)).toBeDefined()
    const saveButton = screen.getByRole('button', { name: 'Speichern' }) as HTMLButtonElement
    expect(saveButton.disabled).toBe(true)

    fireEvent.click(screen.getByRole('switch', { name: 'Ja, trotzdem als neuen Eintrag anlegen' }))
    expect(saveButton.disabled).toBe(false)

    fireEvent.change(screen.getByLabelText('Anzeigename'), { target: { value: 'Sora2' } })
    expect(screen.queryByText(/existiert bereits/)).toBeNull()

    fireEvent.change(screen.getByLabelText('Anzeigename'), { target: { value: 'Sora' } })
    expect(screen.getByText(/existiert bereits/)).toBeDefined()
    expect(saveButton.disabled).toBe(true)
  })
})
