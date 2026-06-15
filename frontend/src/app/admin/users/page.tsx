import { PlatformAdminGate } from '@/components/auth/PlatformAdminGate'

import { AdminUsersClient } from './AdminUsersClient'

export const dynamic = 'force-dynamic'

export default function AdminUsersPage() {
  return (
    <PlatformAdminGate>
      <main>
        <AdminUsersClient />
      </main>
    </PlatformAdminGate>
  )
}
