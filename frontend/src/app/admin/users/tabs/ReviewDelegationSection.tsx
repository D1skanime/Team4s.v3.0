'use client'

import { useEffect, useState } from 'react'

import { ErrorState, SectionHeader, Switch, getErrorStateCopy } from '@/components/ui'
import { getReviewDelegations, mutateReviewDelegation } from '@/lib/api'
import type { ReviewDelegationRow } from '@/types/admin-review-delegation'

const ACTIONS = [
  { action_code: 'review.image.decide', label: 'Medien/Bilder prüfen' },
  { action_code: 'review.text.decide', label: 'Notizen/Texte prüfen' },
  { action_code: 'review.contribution.decide', label: 'Mitwirkungen prüfen' },
] as const

function ineligibleNote(row: ReviewDelegationRow): string | null {
  if (!row.membership_active) return 'Nicht aktiv in dieser Gruppe.'
  if (!row.app_user_active) return 'Konto ist deaktiviert.'
  if (!row.has_verified_claim) return 'Keine verifizierte historische Zuordnung.'
  return null
}

export function ReviewDelegationSection({ fansubGroupId, appUserId }: { fansubGroupId: number; appUserId: number }) {
  const [rows, setRows] = useState<Record<string, ReviewDelegationRow>>({})
  const [loadError, setLoadError] = useState<unknown>(null)
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true
    getReviewDelegations(fansubGroupId, appUserId)
      .then((result) => {
        if (active) setRows(Object.fromEntries(result.map((row) => [row.action_code, row])))
      })
      .catch((error: unknown) => { if (active) setLoadError(error) })
    return () => { active = false }
  }, [fansubGroupId, appUserId])

  async function toggle(row: ReviewDelegationRow) {
    const grant = !row.granted
    setRows((current) => ({ ...current, [row.action_code]: { ...row, granted: grant } }))
    setSaving((current) => new Set(current).add(row.action_code))
    setSaveErrors((current) => ({ ...current, [row.action_code]: '' }))
    try {
      await mutateReviewDelegation(fansubGroupId, appUserId, { action_code: row.action_code, grant })
    } catch {
      setRows((current) => ({ ...current, [row.action_code]: row }))
      setSaveErrors((current) => ({ ...current, [row.action_code]: 'Änderung konnte nicht gespeichert werden. Bitte erneut versuchen.' }))
    } finally {
      setSaving((current) => { const next = new Set(current); next.delete(row.action_code); return next })
    }
  }

  return (
    <div id="review-delegation-section" style={{ marginBottom: 'var(--space-3)' }}>
      <SectionHeader level={3} title="Prüf-/Freigabe-Rechte" description="Eigenständige Delegation für Medien-, Text- und Mitwirkungsprüfung — unabhängig von Rollen und allgemeinen Rechte-Abweichungen." />
      {loadError ? <ErrorState {...getErrorStateCopy(loadError, { defaultDescription: 'Die Prüf-/Freigabe-Rechte konnten nicht geladen werden.' })} /> : (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {ACTIONS.map(({ action_code, label }) => {
            const row = rows[action_code]
            const disabled = !row || saving.has(action_code) || (!row.granted && !row.eligible_for_grant)
            return <div key={action_code} style={{ display: 'grid', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)', alignItems: 'center' }}><span>{label}</span><Switch aria-label={label} checked={row?.granted ?? false} disabled={disabled} onCheckedChange={() => { if (row) void toggle(row) }} /></div>
              {row && !row.granted && !row.eligible_for_grant && <span>{ineligibleNote(row)}</span>}
              {saveErrors[action_code] && <span role="alert">{saveErrors[action_code]}</span>}
            </div>
          })}
        </div>
      )}
    </div>
  )
}