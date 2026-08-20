// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { RoleDefinitionContext, RoleDefinitionOption } from '@/types/admin-capability'
import { RoleCatalogProvider, type RoleCatalogLoads, useRoleCatalog } from './RoleCatalogProvider'

const role = (code: string, contexts: RoleDefinitionContext[], sortOrder: number): RoleDefinitionOption => ({
  code, label_de: code === 'karaoke_fx' ? 'Karaoke FX' : code, contexts, sort_order: sortOrder,
  assignable: true, color_key: 'creative', icon_key: 'image', operative_capability_count: 0,
  has_operative_capabilities: false,
})

function CatalogProbe({ context }: { context: RoleDefinitionContext }) {
  const { roles, error } = useRoleCatalog(context)
  return <output data-testid={context} data-error={error ?? ''}>{roles.map((item) => item.code).join(',')}</output>
}

afterEach(cleanup)

describe('RoleCatalogProvider', () => {
  it('normalizes, deduplicates and orders injected and future roles by context', () => {
    const loads: RoleCatalogLoads = {
      fansub_group: { rows: [role('karaoke_fx', ['fansub_group'], 20), role('future_role', ['fansub_group'], 10)], error: null },
      anime_contribution: { rows: [role('karaoke_fx', ['anime_contribution'], 20)], error: null },
      group_history: { rows: [], error: null },
    }
    render(<RoleCatalogProvider loads={loads}><CatalogProbe context="fansub_group" /><CatalogProbe context="anime_contribution" /></RoleCatalogProvider>)
    expect(screen.getByTestId('fansub_group').textContent).toBe('future_role,karaoke_fx')
    expect(screen.getByTestId('anime_contribution').textContent).toBe('karaoke_fx')
  })

  it('exposes a compact context-scoped error without a static fallback', () => {
    const loads: RoleCatalogLoads = {
      fansub_group: { rows: [], error: 'Rollenkatalog konnte nicht geladen werden.' },
      anime_contribution: { rows: [role('future_role', ['anime_contribution'], 1)], error: null },
      group_history: { rows: [], error: null },
    }
    render(<RoleCatalogProvider loads={loads}><CatalogProbe context="fansub_group" /><CatalogProbe context="anime_contribution" /></RoleCatalogProvider>)
    expect(screen.getByTestId('fansub_group').textContent).toBe('')
    expect(screen.getByTestId('fansub_group').dataset.error).toBe('Rollenkatalog konnte nicht geladen werden.')
    expect(screen.getByTestId('anime_contribution').textContent).toBe('future_role')
  })
})
