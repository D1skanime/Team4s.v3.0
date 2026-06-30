'use client'

import { useState } from 'react'

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

  async function handleChange(nextPublic: boolean) {
    if (nextPublic === isPublic || loading) return

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
