/**
 * @vitest-environment jsdom
 *
 * Tests für FansubAppMemberEditorPanel — aktives Editor-Panel.
 * AC-4/AC-5/D-10
 */

import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'

// UI-Primitives mocken
vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick, disabled, loading }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean }) => (
    <button onClick={onClick} disabled={disabled || loading}>{children}</button>
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
}))

import React from 'react'
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

describe('FansubAppMemberEditorPanel', () => {
  it('Test 1: zeigt die Section-Überschrift/Label "Aktive Rechte" statt nur "Rollen"', () => {
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
      />
    )

    const bodyText = document.body.textContent ?? ''
    // Muss "Aktive Rechte" enthalten — entweder im Tab-Label oder im Section-Text
    expect(bodyText).toMatch(/Aktive Rechte/)
    // Darf NICHT nur "Rollen" als reinen Begriff ohne "Aktive" zeigen
    // (der Tab-Zähler "Aktive Rechte · N" enthält "Aktive Rechte")
  })

  it('Test 2: listet ausschließlich aktive App-Rollen aus FANSUB_GROUP_ROLE_OPTIONS; keine historischen Rollen', () => {
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
      />
    )

    const bodyText = document.body.textContent ?? ''

    // Aktive App-Rollen müssen vorhanden sein
    expect(bodyText).toMatch(/Fansub-Lead|Übersetzung|Encoding|Timing/)

    // Historische Rollen dürfen NICHT vorhanden sein
    expect(bodyText).not.toMatch(/Gründer\/in/)
    expect(bodyText).not.toMatch(/Gruppenleitung/)
    expect(bodyText).not.toMatch(/Co-Leitung/)
    expect(bodyText).not.toMatch(/Projektmanagement/)
  })

  it('Test 3: Erklärtexte sprechen von aktiven Rechten/Aufgaben, nicht von historischen Funktionen', () => {
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
      />
    )

    const bodyText = document.body.textContent ?? ''

    // Erklärtexte müssen aktiven Kontext (Rechte/Aufgaben) vermitteln
    const hasActiveContext =
      bodyText.includes('Aktive Rechte') ||
      bodyText.includes('aktive Rechte') ||
      bodyText.includes('aktiven Rechte') ||
      bodyText.includes('Aufgaben & Rechte') ||
      bodyText.includes('ab jetzt')
    expect(hasActiveContext).toBe(true)

    // Kein historischer Begriff
    expect(bodyText).not.toMatch(/[Ff]rühere Funktion/)
    expect(bodyText).not.toMatch(/[Hh]istorisch/)
  })
})
