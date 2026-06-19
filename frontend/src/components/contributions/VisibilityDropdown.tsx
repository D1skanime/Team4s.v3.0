'use client'

import { useState } from 'react'

import { Select } from '@/components/ui'
import { patchAnimeContributionVisibility } from '@/lib/api'

import styles from './contributions.module.css'

interface VisibilityDropdownProps {
  contributionId: number
  isPublic: boolean
  onChanged: (isPublic: boolean) => void
}

export function VisibilityDropdown({ contributionId, isPublic, onChanged }: VisibilityDropdownProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextPublic = event.target.value === 'public'
    setLoading(true)
    setError(null)
    try {
      await patchAnimeContributionVisibility(contributionId, nextPublic)
      onChanged(nextPublic)
    } catch {
      setError('Sichtbarkeit konnte nicht gespeichert werden.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <span className={styles.visibilityControl}>
      <Select
        value={isPublic ? 'public' : 'internal'}
        onChange={handleChange}
        disabled={loading}
        aria-label="Sichtbarkeit dieses Eintrags"
      >
        <option value="public">Öffentlich im Member-Profil</option>
        <option value="internal">Nur intern sichtbar</option>
      </Select>
      {loading ? <span className={styles.visibilityStatus}>Wird gespeichert...</span> : null}
      {error ? <span className={styles.visibilityError}>{error}</span> : null}
    </span>
  )
}
