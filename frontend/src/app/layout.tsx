import type { Metadata } from 'next'
import { ReactNode } from 'react'

import { AuthSessionSwitchGuard } from '@/components/auth/AuthSessionSwitchGuard'
import { LocalhostCanonicalRedirect } from '@/components/auth/LocalhostCanonicalRedirect'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Team4s v3.0',
  description: 'Anime und Fansub Portal',
}

/** Props für das Root-Layout. */
interface RootLayoutProps {
  children: ReactNode
}

/**
 * Wurzel-Layout der Anwendung.
 * Definiert die HTML-Basisstruktur mit globalem Stylesheet und setzt die Sprache auf Deutsch.
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="de">
      <body>
        <LocalhostCanonicalRedirect />
        <AuthSessionSwitchGuard />
        {children}
      </body>
    </html>
  )
}
