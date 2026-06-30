'use client'

import { useState } from 'react'

import { patchAnimeContributionVisibility } from '@/lib/api'

import styles from './contributions.module.css'

interface VisibilityDropdownProps {
  contributionId: number
  roleCode?: string
  isPublic: boolean
  onChanged: (isPublic: boolean, contributionId: number) => void
}

export function VisibilityDropdown({ contributionId, roleCode, isPublic, onChanged }: VisibilityDropdownProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(nextPublic: boolean) {
    if (nextPublic === isPublic || loading) return

    setLoading(true)
    setError(null)
    try {
      const response = await patchAnimeContributionVisibility(contributionId, nextPublic, roleCode)
      onChanged(nextPublic, response.contribution_id ?? contributionId)
    } catch {
      setError('Sichtbarkeit konnte nicht gespeichert werden.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <span className={styles.visibilityControl}>
      <span
        className={styles.visibilitySegmented}
        role="group"
        aria-label="Sichtbarkeit dieses Eintrags"
        data-public={isPublic ? 'true' : 'false'}
      >
        <button
          type="button"
          aria-pressed={isPublic}
          disabled={loading}
          onClick={() => void handleChange(true)}
          className={styles.visibilitySegment}
        >
          Profil
        </button>
        <button
          type="button"
          aria-pressed={!isPublic}
          disabled={loading}
          onClick={() => void handleChange(false)}
          className={styles.visibilitySegment}
        >
          Intern
        </button>
      </span>
      {loading ? <span className={styles.visibilityStatus}>Wird gespeichert...</span> : null}
      {error ? <span className={styles.visibilityError}>{error}</span> : null}
    </span>
  )
}
