import { PlatformAdminGate } from '@/components/auth/PlatformAdminGate'

import RoleCapabilityClient from './RoleCapabilityClient'
import styles from './roleCapabilities.module.css'

/**
 * Admin-Seite: Capability-Verwaltung (Platform-Admin only).
 * Zeigt die Rollen×Actions-Matrix mit Vergabe/Entzugs-Funktionalität.
 *
 * Der <main>-Container hält den Inhalt vom fixierten AppShell-Edge-Strip frei,
 * damit Überschrift und Karten am linken Rand nicht abgeschnitten werden.
 */
export default function RoleCapabilitiesPage() {
  return (
    <PlatformAdminGate>
      <main className={styles.page}>
        <RoleCapabilityClient />
      </main>
    </PlatformAdminGate>
  )
}
