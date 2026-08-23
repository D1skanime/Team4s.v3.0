import { PlatformAdminGate } from '@/components/auth/PlatformAdminGate'

import RolesClient from './RolesClient'

export const dynamic = 'force-dynamic'

/**
 * Admin-Seite: "Rollen" (D-07, Platform-Admin only).
 * Beantwortet zuerst "wer besitzt diese Rolle?" für gruppenkontextbezogene Rollen;
 * die Standard-Capabilities der Rolle bleiben über einen sekundären Link erreichbar,
 * sind aber bewusst NICHT die erste hier gezeigte Information (D-07).
 */
export default function RolesPage() {
  return (
    <PlatformAdminGate>
      <main>
        <RolesClient />
      </main>
    </PlatformAdminGate>
  )
}
