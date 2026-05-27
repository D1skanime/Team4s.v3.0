'use client'

import AdminProfilePage from '@/app/admin/profile/page'
import { AppShell } from '@/components/layout/AppShell'

export default function MyProfilePage() {
  return (
    <AppShell currentPath="/me/profile">
      <AdminProfilePage />
    </AppShell>
  )
}
