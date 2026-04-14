import type { Metadata } from 'next'
import { ReactNode } from 'react'

import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Team4s v3.0',
  description: 'Anime und Fansub Portal',
}

/** Props fuer das Root-Layout. */
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
      <body>{children}</body>
    </html>
  )
}
