import { PlatformAdminGate } from '@/components/auth/PlatformAdminGate'

import RolesClient from './RolesClient'
import styles from './roles.module.css'

export const dynamic = 'force-dynamic'

/**
 * Admin-Seite: Rollen-Arbeitsbereich (D-01/D-07/D-08, Platform-Admin only, Nachtrag
 * 2026-08-24/Quick 260824-ek3): beantwortet an einem Ort sowohl "wer besitzt diese Rolle?"
 * als auch "was darf sie standardmäßig?" -- die vormals getrennte Capability-Verwaltung unter
 * /admin/role-capabilities lebt jetzt als zweiter Tab hier (siehe RolesClient.tsx).
 *
 * Der <main>-Container hält den Inhalt vom fixierten AppShell-Edge-Strip frei (analog zum
 * bisherigen role-capabilities/page.tsx-Muster).
 */
export default function RolesPage() {
  return (
    <PlatformAdminGate>
      <main className={styles.page}>
        <RolesClient />
      </main>
    </PlatformAdminGate>
  )
}
