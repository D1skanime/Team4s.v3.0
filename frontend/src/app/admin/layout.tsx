import type { ReactNode } from 'react'

import { AdminMainNav } from '@/components/admin/AdminMainNav'

/**
 * D-01: gemeinsames Layout für den gesamten Admin-Bereich.
 * Rendert die eine persistente Hauptnavigation oberhalb jeder `/admin/*`-Seite.
 * Jede einzelne Seite behält ihre eigene `PlatformAdminGate`-Prüfung für ihren
 * Inhalt — dieses Layout fügt nur die Navigationsleiste hinzu und dupliziert
 * keine Berechtigungsprüfung (vermeidet doppelte Gate-Fehlermeldungen).
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AdminMainNav />
      {children}
    </>
  )
}
