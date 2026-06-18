import { PlatformAdminGate } from '@/components/auth/PlatformAdminGate'

import RoleCapabilityClient from './RoleCapabilityClient'

/**
 * Admin-Seite: Capability-Verwaltung (Platform-Admin only).
 * Zeigt die Rollen×Actions-Matrix mit Vergabe/Entzugs-Funktionalität.
 */
export default function RoleCapabilitiesPage() {
  return (
    <PlatformAdminGate>
      <RoleCapabilityClient />
    </PlatformAdminGate>
  )
}
