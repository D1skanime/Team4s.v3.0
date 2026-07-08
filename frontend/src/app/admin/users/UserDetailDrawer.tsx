'use client'

import { Drawer } from '@/components/ui'

import { UserDetailContent } from './UserDetailContent'

interface Props {
  userId: number | null
  onClose: () => void
}

export function UserDetailDrawer({ userId, onClose }: Props) {
  return (
    <Drawer
      open={userId !== null}
      onClose={onClose}
      title="Benutzerdetails"
    >
      {userId !== null ? <UserDetailContent userId={userId} /> : null}
    </Drawer>
  )
}
