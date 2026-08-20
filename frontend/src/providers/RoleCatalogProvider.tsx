'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'

import { orderForContext } from '@/lib/roleCatalog'
import type { RoleDefinitionContext, RoleDefinitionOption } from '@/types/admin-capability'

export type RoleCatalogLoad = {
  rows: RoleDefinitionOption[]
  error: string | null
}

export type RoleCatalogLoads = Record<RoleDefinitionContext, RoleCatalogLoad>

type RoleCatalogValue = {
  rows: RoleDefinitionOption[]
  errors: Record<RoleDefinitionContext, string | null>
}

const RoleCatalogContext = createContext<RoleCatalogValue | null>(null)

const contexts: RoleDefinitionContext[] = ['fansub_group', 'anime_contribution', 'group_history']

function mergeCatalogLoads(loads: RoleCatalogLoads): RoleDefinitionOption[] {
  const roles = new Map<string, RoleDefinitionOption>()

  for (const context of contexts) {
    for (const row of loads[context].rows) {
      const existing = roles.get(row.code)
      const rowContexts = new Set<RoleDefinitionContext>([
        ...(existing?.contexts ?? []).filter((item): item is RoleDefinitionContext => contexts.includes(item as RoleDefinitionContext)),
        ...(row.contexts ?? []).filter((item): item is RoleDefinitionContext => contexts.includes(item as RoleDefinitionContext)),
        context,
      ])

      roles.set(row.code, {
        ...(existing ?? row),
        contexts: Array.from(rowContexts),
      })
    }
  }

  return Array.from(roles.values())
}

export function RoleCatalogProvider({ children, loads }: { children: ReactNode; loads: RoleCatalogLoads }) {
  const value = useMemo<RoleCatalogValue>(() => ({
    rows: mergeCatalogLoads(loads),
    errors: {
      fansub_group: loads.fansub_group.error,
      anime_contribution: loads.anime_contribution.error,
      group_history: loads.group_history.error,
    },
  }), [loads])

  return <RoleCatalogContext.Provider value={value}>{children}</RoleCatalogContext.Provider>
}

export function useRoleCatalog(context: RoleDefinitionContext): {
  roles: RoleDefinitionOption[]
  error: string | null
} {
  const catalog = useContext(RoleCatalogContext)
  if (!catalog) throw new Error('useRoleCatalog must be used within RoleCatalogProvider')

  return {
    roles: orderForContext(catalog.rows, context),
    error: catalog.errors[context],
  }
}
