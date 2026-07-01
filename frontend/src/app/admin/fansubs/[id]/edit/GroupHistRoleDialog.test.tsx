/**
 * @vitest-environment jsdom
 *
 * Tests für GroupHistRoleDialog — historischer Rollen-Dialog.
 * AC-1/D-07/D-08/D-09
 */

import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// group_history-Rollendaten mocken — kein echter API-Aufruf nötig
vi.mock('@/lib/api', () => ({
  listGroupHistoryRoleDefinitions: vi.fn().mockResolvedValue([
    { code: 'founder', label_de: 'Gründer/in', sort_order: 1 },
    { code: 'fansub_lead', label_de: 'Gruppenleitung', sort_order: 2 },
    { code: 'co_leader', label_de: 'Co-Leitung', sort_order: 3 },
    { code: 'project_lead', label_de: 'Fansub-Projektleitung', sort_order: 4 },
    { code: 'techadmin', label_de: 'Techadmin', sort_order: 5 },
    { code: 'gfxler', label_de: 'GFX / Grafik', sort_order: 6 },
  ]),
}))

// UI-Primitives mocken (jsdom rendert keine nativen Modals)
vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
  ErrorState: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="error-state">{title}: {description}</div>
  ),
  FormField: ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div><label>{label}</label>{children}</div>
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
  Select: ({ children, value, onChange, id, 'aria-label': ariaLabel }: { children: React.ReactNode; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; id?: string; 'aria-label'?: string }) => (
    <select id={id} aria-label={ariaLabel} value={value} onChange={onChange}>
      {children}
    </select>
  ),
  Textarea: ({ value, onChange, placeholder, id, 'aria-label': ariaLabel }: { value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; placeholder?: string; id?: string; 'aria-label'?: string }) => (
    <textarea id={id} aria-label={ariaLabel} value={value} onChange={onChange} placeholder={placeholder} />
  ),
  YearPicker: ({ value, label }: { value: string; label: string }) => (
    <input type="text" aria-label={label} defaultValue={value} />
  ),
}))

import React from 'react'
import { type RoleDefinitionOption } from '@/types/admin-capability'
import { GroupHistRoleDialog, type RoleFormFields } from './GroupHistRoleDialog'

const defaultRoleForm: RoleFormFields = {
  memberId: '1',
  roleCode: '',
  startedYear: '',
  endedYear: '',
  note: '',
}

const historyRoles: RoleDefinitionOption[] = [
  { code: 'founder', label_de: 'Gründer/in', sort_order: 1 },
  { code: 'fansub_lead', label_de: 'Gruppenleitung', sort_order: 2 },
  { code: 'co_leader', label_de: 'Co-Leitung', sort_order: 3 },
  { code: 'project_lead', label_de: 'Fansub-Projektleitung', sort_order: 4 },
  { code: 'techadmin', label_de: 'Techadmin', sort_order: 5 },
  { code: 'gfxler', label_de: 'GFX / Grafik', sort_order: 6 },
]

const noop = () => {}

describe('GroupHistRoleDialog', () => {
  it('Test 1: rendert Optionen aus der group_history-Quelle, nicht aus FANSUB_GROUP_ROLE_OPTIONS', () => {
    render(
      <GroupHistRoleDialog
        open={true}
        onClose={noop}
        isEditing={false}
        roleForm={defaultRoleForm}
        setRoleForm={noop as never}
        onSubmit={noop}
        isSaving={false}
        error={null}
        members={[{ id: 1, member_id: 1, fansub_group_id: 1, display_name: 'Test Mitglied', joined_year: null, left_year: null, app_user_id: null, app_username: null, status: 'historical', created_at: '' }]}
        yearMin={2000}
        yearMax={2024}
        historyRoleOptions={historyRoles}
      />
    )

    // Alle sechs historischen Gruppenrollen müssen als Optionen vorhanden sein (D-04/D-06/D-07)
    expect(screen.getByRole('option', { name: 'Gründer/in' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Gruppenleitung' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Co-Leitung' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Fansub-Projektleitung' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Techadmin' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'GFX / Grafik' })).toBeDefined()

    // Aktive App-Rollen dürfen NICHT vorhanden sein
    expect(screen.queryByRole('option', { name: 'Übersetzung' })).toBeNull()
    expect(screen.queryByRole('option', { name: 'Encoding' })).toBeNull()
  })

  it('Test 2: die angebotenen Labels enthalten alle sechs Gruppenhistorie-Bezeichnungen mit korrekten Umlauten', () => {
    render(
      <GroupHistRoleDialog
        open={true}
        onClose={noop}
        isEditing={false}
        roleForm={defaultRoleForm}
        setRoleForm={noop as never}
        onSubmit={noop}
        isSaving={false}
        error={null}
        members={[]}
        yearMin={2000}
        yearMax={2024}
        historyRoleOptions={historyRoles}
      />
    )

    // Umlautkorrekte Bezeichnungen (ä, ö, ü, ß) müssen erscheinen (D-04/D-05/D-07)
    expect(screen.getByText('Gründer/in')).toBeDefined()
    expect(screen.getByText('Gruppenleitung')).toBeDefined()
    expect(screen.getByText('Co-Leitung')).toBeDefined()
    expect(screen.getByText('Fansub-Projektleitung')).toBeDefined()
    expect(screen.getByText('Techadmin')).toBeDefined()
    expect(screen.getByText('GFX / Grafik')).toBeDefined()
  })

  it('Test 3: verwendet das Select-Primitiv aus @/components/ui (kein natives <select> ohne Primitiv)', () => {
    render(
      <GroupHistRoleDialog
        open={true}
        onClose={noop}
        isEditing={false}
        roleForm={defaultRoleForm}
        setRoleForm={noop as never}
        onSubmit={noop}
        isSaving={false}
        error={null}
        members={[]}
        yearMin={2000}
        yearMax={2024}
        historyRoleOptions={historyRoles}
      />
    )

    // Das Select-Primitiv wird als <select> gerendert (gemockte Version)
    // Es muss genau einen Select für die Rollenauswahl geben
    const roleSelect = screen.getByLabelText('Frühere Funktion auswählen')
    expect(roleSelect).toBeDefined()
    expect(roleSelect.tagName.toLowerCase()).toBe('select')
  })

  it('Test 4: Dialog-Begleittext/Label kennzeichnet den historischen Kontext (frühere Funktion)', () => {
    render(
      <GroupHistRoleDialog
        open={true}
        onClose={noop}
        isEditing={false}
        roleForm={defaultRoleForm}
        setRoleForm={noop as never}
        onSubmit={noop}
        isSaving={false}
        error={null}
        members={[]}
        yearMin={2000}
        yearMax={2024}
        historyRoleOptions={historyRoles}
      />
    )

    // Der Dialog muss historischen Kontext vermitteln — keine aktiven App-Rechte suggerieren
    // Entweder im Titel, der Description oder einem Label
    const dialogText = document.body.textContent ?? ''
    const hasHistoricalContext =
      dialogText.includes('Frühere Funktion') ||
      dialogText.includes('frühere Funktion') ||
      dialogText.includes('historisch') ||
      dialogText.includes('Historische')
    expect(hasHistoricalContext).toBe(true)
  })

  it('Test 5: rendert Input type=date fuer Rollen-Start', () => {
    const { container } = render(
      <GroupHistRoleDialog
        open={true}
        onClose={noop}
        isEditing={false}
        roleForm={defaultRoleForm}
        setRoleForm={noop as never}
        onSubmit={noop}
        isSaving={false}
        error={null}
        members={[]}
        yearMin={2000}
        yearMax={2024}
        historyRoleOptions={historyRoles}
      />
    )

    expect(container.querySelector('input[type="date"]')).not.toBeNull()
  })

  it('Test 6: rendert Input type=date fuer Rollen-Ende mit Hinweis', () => {
    const { container } = render(
      <GroupHistRoleDialog
        open={true}
        onClose={noop}
        isEditing={false}
        roleForm={defaultRoleForm}
        setRoleForm={noop as never}
        onSubmit={noop}
        isSaving={false}
        error={null}
        members={[]}
        yearMin={2000}
        yearMax={2024}
        historyRoleOptions={historyRoles}
      />
    )

    expect(container.querySelectorAll('input[type="date"]')).toHaveLength(2)
    expect(document.body.textContent ?? '').toContain('Leer lassen')
  })

  it('Test 7: enthaelt Rollenauswahl-Select', () => {
    const { container } = render(
      <GroupHistRoleDialog
        open={true}
        onClose={noop}
        isEditing={false}
        roleForm={defaultRoleForm}
        setRoleForm={noop as never}
        onSubmit={noop}
        isSaving={false}
        error={null}
        members={[]}
        yearMin={2000}
        yearMax={2024}
        historyRoleOptions={historyRoles}
      />
    )

    expect(container.querySelector('select')).not.toBeNull()
  })
})
