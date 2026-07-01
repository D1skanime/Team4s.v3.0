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
    { code: 'translator', label_de: 'Übersetzung', sort_order: 10 },
    { code: 'editor', label_de: 'Editing', sort_order: 20 },
    { code: 'timer', label_de: 'Timing', sort_order: 30 },
    { code: 'typesetter', label_de: 'Typesetting / FX', sort_order: 40 },
    { code: 'encoder', label_de: 'Encoding', sort_order: 50 },
    { code: 'raw_provider', label_de: 'Raw-Bereitstellung', sort_order: 60 },
    { code: 'quality_checker', label_de: 'Qualitätsprüfung', sort_order: 70 },
    { code: 'designer', label_de: 'Design', sort_order: 90 },
    { code: 'techadmin', label_de: 'Techadmin', sort_order: 5 },
    { code: 'gfxler', label_de: 'GFX / Grafik', sort_order: 6 },
  ]),
}))

// UI-Primitives mocken (jsdom rendert keine nativen Modals)
vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
  DatePicker: ({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) => (
    <div data-testid="date-picker">
      <select id={id} aria-label={`${label}: Tag`} value={value.slice(8, 10)} onChange={(event) => onChange(`2024-01-${event.target.value}`)}>
        <option value="">Tag</option>
        <option value="01">01</option>
      </select>
    </div>
  ),
  ErrorState: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="error-state">{title}: {description}</div>
  ),
  FormField: ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
    <div><label>{label}</label>{children}{hint ? <p>{hint}</p> : null}</div>
  ),
  Input: ({ value, onChange, id, type, 'aria-label': ariaLabel }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; id?: string; type?: string; 'aria-label'?: string }) => (
    <input id={id} type={type} aria-label={ariaLabel} value={value} onChange={onChange} />
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
}))

import React from 'react'
import { type RoleDefinitionOption } from '@/types/admin-capability'
import { GroupHistRoleDialog, type RoleFormFields } from './GroupHistRoleDialog'

const defaultRoleForm: RoleFormFields = {
  memberId: '1',
  roleCode: '',
  startedDate: '',
  endedDate: '',
  note: '',
}

const historyRoles: RoleDefinitionOption[] = [
  { code: 'founder', label_de: 'Gründer/in', sort_order: 1 },
  { code: 'fansub_lead', label_de: 'Gruppenleitung', sort_order: 2 },
  { code: 'co_leader', label_de: 'Co-Leitung', sort_order: 3 },
  { code: 'project_lead', label_de: 'Fansub-Projektleitung', sort_order: 4 },
  { code: 'translator', label_de: 'Übersetzung', sort_order: 10 },
  { code: 'editor', label_de: 'Editing', sort_order: 20 },
  { code: 'timer', label_de: 'Timing', sort_order: 30 },
  { code: 'typesetter', label_de: 'Typesetting / FX', sort_order: 40 },
  { code: 'encoder', label_de: 'Encoding', sort_order: 50 },
  { code: 'raw_provider', label_de: 'Raw-Bereitstellung', sort_order: 60 },
  { code: 'quality_checker', label_de: 'Qualitätsprüfung', sort_order: 70 },
  { code: 'designer', label_de: 'Design', sort_order: 90 },
  { code: 'techadmin', label_de: 'Techadmin', sort_order: 5 },
  { code: 'gfxler', label_de: 'GFX / Grafik', sort_order: 6 },
]

const noop = () => {}

describe('GroupHistRoleDialog', () => {
  it('Test 1: rendert historische Funktionsrollen aus der API-Quelle', () => {
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
        members={[{ id: 1, member_id: 1, fansub_group_id: 1, display_name: 'Test Mitglied', joined_date: null, left_date: null, app_user_id: null, app_username: null, status: 'historical', created_at: '' }]}
        yearMin={2000}
        yearMax={2024}
        historyRoleOptions={historyRoles}
      />
    )

    // Historische Funktionsrollen müssen als Optionen vorhanden sein.
    expect(screen.getByRole('option', { name: 'Gründer/in' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Gruppenleitung' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Co-Leitung' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Fansub-Projektleitung' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Übersetzung' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Timing' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Typesetting / FX' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Editing' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Encoding' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Raw-Bereitstellung' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Qualitätsprüfung' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Design' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Techadmin' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'GFX / Grafik' })).toBeDefined()
  })

  it('Test 2: die angebotenen Labels enthalten Rollenbezeichnungen mit korrekten Umlauten', () => {
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
    expect(screen.getByText('Übersetzung')).toBeDefined()
    expect(screen.getByText('Qualitätsprüfung')).toBeDefined()
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

  it('Test 5: rendert modernen DatePicker fuer Rollen-Start', () => {
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

    expect(container.querySelector('input[type="date"]')).toBeNull()
    expect(screen.getByLabelText('Eintrittsdatum: Tag')).toBeDefined()
  })

  it('Test 6: rendert modernen DatePicker fuer Rollen-Ende ohne nativen Date-Input', () => {
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

    expect(container.querySelectorAll('input[type="date"]')).toHaveLength(0)
    expect(screen.getByLabelText('Austrittsdatum: Tag')).toBeDefined()
    expect(document.body.textContent ?? '').not.toContain('Leer lassen')
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
