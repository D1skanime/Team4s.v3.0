// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RoleDefinitionContext, RoleDefinitionOption } from '@/types/admin-capability'

const listRoleDefinitionsMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api', () => ({ listRoleDefinitions: listRoleDefinitionsMock }))
vi.mock('@/components/auth/LocalhostCanonicalRedirect', () => ({ LocalhostCanonicalRedirect: () => <div data-testid="canonical-redirect" /> }))
vi.mock('@/components/auth/AuthSessionSwitchGuard', () => ({ AuthSessionSwitchGuard: () => <div data-testid="auth-guard" /> }))
vi.mock('@/components/layout/AppShellClientWrapper', () => ({ AppShellClientWrapper: ({ children }: { children: ReactNode }) => <main>{children}</main> }))

import { useRoleCatalog } from '@/providers/RoleCatalogProvider'
import RootLayout from './layout'

const role = (code: string, context: RoleDefinitionContext): RoleDefinitionOption => ({
  code, label_de: code === 'karaoke_fx' ? 'Karaoke FX' : code, contexts: [context],
  sort_order: code === 'future_role' ? 5 : 10, assignable: true, color_key: 'creative', icon_key: 'image',
  operative_capability_count: 0, has_operative_capabilities: false,
})

function LeafProbe() {
  const fansub = useRoleCatalog('fansub_group')
  const contributions = useRoleCatalog('anime_contribution')
  const history = useRoleCatalog('group_history')
  return <div data-testid="leaf-probe">{[fansub, contributions, history].flatMap((catalog) => catalog.roles.map((item) => item.code)).join('|')}<span data-testid="fansub-error">{fansub.error ?? ''}</span></div>
}

beforeEach(() => {
  listRoleDefinitionsMock.mockImplementation(async (context: RoleDefinitionContext) => [
    role('karaoke_fx', context), ...(context === 'fansub_group' ? [role('future_role', context)] : []),
  ])
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('app/layout', () => {
  it('loads all public contexts once and mounts one provider for leaf consumers', async () => {
    render(await RootLayout({ children: <LeafProbe /> }))
    expect(listRoleDefinitionsMock).toHaveBeenCalledTimes(3)
    expect(listRoleDefinitionsMock).toHaveBeenNthCalledWith(1, 'fansub_group')
    expect(listRoleDefinitionsMock).toHaveBeenNthCalledWith(2, 'anime_contribution')
    expect(listRoleDefinitionsMock).toHaveBeenNthCalledWith(3, 'group_history')
    expect(screen.getByTestId('leaf-probe').textContent).toContain('future_role|karaoke_fx|karaoke_fx|karaoke_fx')
    expect(screen.getByTestId('auth-guard')).not.toBeNull()
  })

  it('keeps the root renderable when one context fails', async () => {
    listRoleDefinitionsMock.mockImplementation(async (context: RoleDefinitionContext) => {
      if (context === 'fansub_group') throw new Error('offline')
      return [role('karaoke_fx', context)]
    })
    render(await RootLayout({ children: <LeafProbe /> }))
    expect(listRoleDefinitionsMock).toHaveBeenCalledTimes(3)
    expect(screen.getByTestId('fansub-error').textContent).toBe('Rollenkatalog konnte nicht geladen werden.')
    expect(screen.getByTestId('leaf-probe').textContent).toContain('karaoke_fx|karaoke_fx')
  })

  it('keeps a total failure neutral without a static role fallback', async () => {
    listRoleDefinitionsMock.mockRejectedValue(new Error('offline'))
    render(await RootLayout({ children: <LeafProbe /> }))
    expect(listRoleDefinitionsMock).toHaveBeenCalledTimes(3)
    expect(screen.getByTestId('leaf-probe').textContent).not.toContain('karaoke_fx')
    expect(screen.getByTestId('fansub-error').textContent).toBe('Rollenkatalog konnte nicht geladen werden.')
  })
})
