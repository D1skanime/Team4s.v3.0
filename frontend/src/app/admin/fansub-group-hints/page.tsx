import { PlatformAdminGate } from '@/components/auth/PlatformAdminGate'

import { FansubGroupHintsAdminClient } from './FansubGroupHintsAdminClient'

export const dynamic = 'force-dynamic'

export default function AdminFansubGroupHintsPage() {
  return (
    <PlatformAdminGate>
      <main>
        <FansubGroupHintsAdminClient />
      </main>
    </PlatformAdminGate>
  )
}
