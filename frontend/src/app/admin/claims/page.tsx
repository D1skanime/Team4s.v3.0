import { PlatformAdminGate } from '@/components/auth/PlatformAdminGate'

import { ClaimsClient } from './ClaimsClient'

export const dynamic = 'force-dynamic'

export default function AdminClaimsPage() {
  return (
    <PlatformAdminGate>
      <main>
        <ClaimsClient />
      </main>
    </PlatformAdminGate>
  )
}
