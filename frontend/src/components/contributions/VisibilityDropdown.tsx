'use client'

import { useState } from 'react'

import { Button } from '@/components/ui'
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
      >
        <Button
          type="button"
          size="sm"
          variant={isPublic ? 'primary' : 'subtle'}
          aria-pressed={isPublic}
          disabled={loading}
          onClick={() => void handleChange(true)}
          className={styles.visibilitySegment}
        >
          Profil
        </Button>
        <Button
          type="button"
          size="sm"
          variant={!isPublic ? 'primary' : 'subtle'}
          aria-pressed={!isPublic}
          disabled={loading}
          onClick={() => void handleChange(false)}
          className={styles.visibilitySegment}
        >
          Intern
        </Button>
      </span>
      {loading ? <span className={styles.visibilityStatus}>Wird gespeichert...</span> : null}
      {error ? <span className={styles.visibilityError}>{error}</span> : null}
    </span>
  )
}
