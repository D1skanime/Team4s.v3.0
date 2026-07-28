import { PlatformAdminGate } from '@/components/auth/PlatformAdminGate'

import { UserDetailPageClient } from './UserDetailPageClient'

export const dynamic = 'force-dynamic'

export default function UserDetailPage() {
  return (
    <PlatformAdminGate>
      <main>
        <UserDetailPageClient />
      </main>
    </PlatformAdminGate>
  )
}
