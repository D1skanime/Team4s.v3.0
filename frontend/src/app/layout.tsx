import type { Metadata } from 'next'
import { ReactNode } from 'react'

import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Team4s v3.0',
  description: 'Anime und Fansub Portal',
}

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}
