'use client'

import { useCallback, useEffect, useState } from 'react'

import { EmptyState, ErrorState, LoadingState } from '@/components/ui'
import { ApiError, getAdminUserGlobalRoles } from '@/lib/api'
import type { AdminUserGlobalRolesResponse } from '@/types/admin-users'

interface Props {
  userId: number
}

export function UserGlobalRolesTab({ userId }: Props) {
  const [data, setData] = useState<AdminUserGlobalRolesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const resp = await getAdminUserGlobalRoles(userId)
      setData(resp)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Daten konnten nicht geladen werden. Erneut versuchen.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState title="Fehler" description={error} />
  if (!data || data.roles.length === 0) {
    return <EmptyState title="Keine Rollen" description="Diesem Benutzer sind keine globalen Rollen zugewiesen." />
  }

  return (
    <div>
      <ul>
        {data.roles.map((role) => (
          <li key={role}>{role}</li>
        ))}
      </ul>
    </div>
  )
}
