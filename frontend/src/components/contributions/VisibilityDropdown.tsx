'use client'

import { useState } from 'react'

import { patchAnimeContributionVisibility } from '@/lib/api'

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
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
      <select
        value={isPublic ? 'public' : 'internal'}
        onChange={handleChange}
        disabled={loading}
        style={{ fontSize: '0.8rem', padding: '2px 4px' }}
        aria-label="Sichtbarkeit dieser Contribution"
      >
        <option value="public">Öffentlich im Member-Profil</option>
        <option value="internal">Nur intern sichtbar</option>
      </select>
      {loading && <span style={{ fontSize: '0.75rem', color: '#888' }}>Wird gespeichert…</span>}
      {error && <span style={{ fontSize: '0.75rem', color: '#c00' }}>{error}</span>}
    </span>
  )
}
