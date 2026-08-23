import { PlatformAdminGate } from '@/components/auth/PlatformAdminGate'

import { ChangesClient } from './ChangesClient'

export const dynamic = 'force-dynamic'

export default function AdminChangesPage() {
  return (
    <PlatformAdminGate>
      <main>
        <ChangesClient />
      </main>
    </PlatformAdminGate>
  )
}
