/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'

import { RoleCatalogProvider, type RoleCatalogLoads } from '@/providers/RoleCatalogProvider'
import { GroupHistRoleDialog, type RoleFormFields } from './GroupHistRoleDialog'

vi.mock('@/components/ui', () => ({
  Button: ({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) => <button disabled={disabled}>{children}</button>,
  DatePicker: ({ id, label }: { id: string; label: string }) => <select id={id} aria-label={`${label}: Tag`}><option>Tag</option></select>,
  ErrorState: ({ title, description }: { title: string; description: string }) => <div role="alert">{title}: {description}</div>,
  FormField: ({ label, children }: { label: string; children: React.ReactNode }) => <div><label>{label}</label>{children}</div>,
  Modal: ({ open, children, title }: { open: boolean; children: React.ReactNode; title: string }) => open ? <div role="dialog"><h2>{title}</h2>{children}</div> : null,
  Select: ({ children, value, id, 'aria-label': ariaLabel }: { children: React.ReactNode; value: string; id?: string; 'aria-label'?: string }) => <select id={id} aria-label={ariaLabel} value={value} readOnly>{children}</select>,
  Textarea: ({ id, value }: { id: string; value: string }) => <textarea id={id} value={value} readOnly />,
}))

const roleForm: RoleFormFields = { memberId: '1', roleCode: '', startedDate: '', endedDate: '', note: '' }
const noop = () => {}

function loads(groupHistoryRows: RoleCatalogLoads['group_history']['rows'], error: string | null = null): RoleCatalogLoads {
  return {
    fansub_group: { rows: [], error: null },
    anime_contribution: { rows: [], error: null },
    group_history: { rows: groupHistoryRows, error },
  }
}

function renderDialog(catalogLoads: RoleCatalogLoads, form: RoleFormFields = roleForm) {
  return render(
    <RoleCatalogProvider loads={catalogLoads}>
      <GroupHistRoleDialog
        open
        onClose={noop}
        isEditing={false}
        roleForm={form}
        setRoleForm={noop as never}
        onSubmit={noop}
        isSaving={false}
        error={null}
        members={[]}
        yearMin={2000}
        yearMax={2026}
        historyRoleOptions={[{ code: 'legacy_static', label_de: 'Statischer Altwert', sort_order: 1 }]}
      />
    </RoleCatalogProvider>,
  )
}

describe('GroupHistRoleDialog', () => {
  it('uses only the scoped catalog rows and their order', () => {
    renderDialog(loads([
      { code: 'co_leader', label_de: 'Co-Leitung', contexts: ['group_history'], sort_order: 20 },
      { code: 'founder', label_de: 'Gründung', contexts: ['group_history'], sort_order: 10 },
    ]))

    const options = screen.getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual(['Frühere Funktion wählen', 'Gründung', 'Co-Leitung'])
    expect(screen.queryByText('Statischer Altwert')).toBeNull()
  })

  it('shows karaoke_fx only when the catalog declares group_history', () => {
    renderDialog(loads([{ code: 'karaoke_fx', label_de: 'Karaoke-FX', contexts: ['group_history'], sort_order: 45 }]))
    expect(screen.getByRole('option', { name: 'Karaoke-FX' })).toBeDefined()
  })

  it('keeps an unknown persisted code readable and neutral', () => {
    renderDialog(loads([]), { ...roleForm, roleCode: 'future_scene_role' })
    expect(screen.getByRole('option', { name: 'Future Scene Role' })).toBeDefined()
  })

  it('shows scoped catalog errors without static fallback options', () => {
    renderDialog(loads([], 'catalog_unavailable'))
    expect(screen.getByRole('alert').textContent).toContain('Frühere Funktionen konnten nicht geladen werden')
    expect(screen.queryByText('Statischer Altwert')).toBeNull()
  })
})
