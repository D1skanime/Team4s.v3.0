import { VerifiedBadge } from '@/components/profile/VerifiedBadge'
import { Badge } from '@/components/ui'

import styles from '../page.module.css'

type ClaimStatus = 'pending' | 'verified' | 'rejected'

type ClaimStatusCardProps = {
  noindex: boolean
  claimStatus?: ClaimStatus | null
  claimMemberNick?: string | null
  disabled: boolean
  onNoindexChange: (noindex: boolean) => Promise<void>
}

function StatusBadge({ status }: { status: ClaimStatus }) {
  if (status === 'verified') return <VerifiedBadge />

  const label = status === 'pending' ? 'Ausstehend' : 'Abgelehnt'
  return <Badge variant={status === 'pending' ? 'warning' : 'danger'}>{label}</Badge>
}

export function ClaimStatusCard({
  noindex,
  claimStatus = null,
  claimMemberNick = null,
  disabled,
  onNoindexChange,
}: ClaimStatusCardProps) {
  const memberName = claimMemberNick?.trim() || 'deinen Member-Eintrag'

  return (
    <div className={styles.claimStatusStack}>
      <fieldset className={styles.radioGroup}>
        <legend>Suchmaschinen-Sichtbarkeit</legend>
        <label className={styles.checkboxControl}>
          <input
            type="checkbox"
            checked={!noindex}
            disabled={disabled}
            onChange={(event) => void onNoindexChange(!event.target.checked)}
          />
          <span>Mein Profil von Suchmaschinen indexieren lassen</span>
        </label>
        <p className={styles.mutedText}>
          Wenn deaktiviert, wird dein Profil mit &quot;noindex,nofollow&quot; markiert.
        </p>
        {claimStatus !== 'verified' ? (
          <p className={styles.mutedText}>
            Die Indexierung kann erst nach einer verifizierten Identität geändert werden.
          </p>
        ) : null}
      </fieldset>

      <fieldset className={styles.radioGroup}>
        <legend>Verifizierter Member-Eintrag</legend>
        {!claimStatus ? (
          <p className={styles.mutedText}>Du bist noch keinem historischen Member-Eintrag zugeordnet.</p>
        ) : (
          <div className={styles.claimStatusBody}>
            <StatusBadge status={claimStatus} />
            {claimStatus === 'pending' ? (
              <p className={styles.mutedText}>Dein Hinweis zu {memberName} wartet auf Prüfung durch die Gruppe.</p>
            ) : null}
            {claimStatus === 'verified' ? (
              <p className={styles.mutedText}>Du bist als {memberName} verifiziert.</p>
            ) : null}
            {claimStatus === 'rejected' ? (
              <p className={styles.mutedText}>Die Zuordnung wurde abgelehnt. Du kannst einen neuen Hinweis senden.</p>
            ) : null}
          </div>
        )}
      </fieldset>
    </div>
  )
}
