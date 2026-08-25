import { PlatformAdminGate } from '@/components/auth/PlatformAdminGate'

import { AdminGroupsClient } from './AdminGroupsClient'

export const dynamic = 'force-dynamic'

export default function AdminGroupsPage() {
  return (
    <PlatformAdminGate>
      <main>
        <AdminGroupsClient />
      </main>
    </PlatformAdminGate>
  )
}
