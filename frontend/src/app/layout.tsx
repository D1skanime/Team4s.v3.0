import type { Metadata } from 'next'
import { ReactNode } from 'react'

import { AuthSessionSwitchGuard } from '@/components/auth/AuthSessionSwitchGuard'
import { LocalhostCanonicalRedirect } from '@/components/auth/LocalhostCanonicalRedirect'
import { AppShellClientWrapper } from '@/components/layout/AppShellClientWrapper'
import { listRoleDefinitions } from '@/lib/api'
import { RoleCatalogProvider, type RoleCatalogLoads } from '@/providers/RoleCatalogProvider'
import type { RoleDefinitionContext } from '@/types/admin-capability'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Team4s v3.0',
  description: 'Anime und Fansub Portal',
}

/** Props für das Root-Layout. */
interface RootLayoutProps {
  children: ReactNode
}

const ROLE_CONTEXTS: RoleDefinitionContext[] = [
  'fansub_group',
  'anime_contribution',
  'group_history',
]

async function loadRoleCatalogs(): Promise<RoleCatalogLoads> {
  const loads = await Promise.all(ROLE_CONTEXTS.map(async (context) => {
    try {
      return [context, { rows: await listRoleDefinitions(context), error: null }] as const
    } catch {
      return [context, { rows: [], error: 'catalog_unavailable' }] as const
    }
  }))

  return Object.fromEntries(loads) as RoleCatalogLoads
}

/**
 * Wurzel-Layout der Anwendung.
 * Definiert die HTML-Basisstruktur mit globalem Stylesheet und setzt die Sprache auf Deutsch.
 */
export default async function RootLayout({ children }: RootLayoutProps) {
  const roleCatalogs = await loadRoleCatalogs()

  return (
    <html lang="de">
      <body>
        <LocalhostCanonicalRedirect />
        <AuthSessionSwitchGuard />
        <RoleCatalogProvider loads={roleCatalogs}>
          <AppShellClientWrapper>{children}</AppShellClientWrapper>
        </RoleCatalogProvider>
      </body>
    </html>
  )
}
