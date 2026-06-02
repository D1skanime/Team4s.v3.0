import { VerifiedBadge } from '@/components/profile/VerifiedBadge'

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
  const color = status === 'pending' ? '#a16207' : '#991b1b'
  const background = status === 'pending' ? 'rgba(254, 240, 138, 0.5)' : 'rgba(254, 226, 226, 0.72)'

  return (
    <span
      style={{
        width: 'fit-content',
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 9px',
        borderRadius: '999px',
        background,
        color,
        fontSize: '0.78rem',
        fontWeight: 800,
      }}
    >
      {label}
    </span>
  )
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
          Wenn deaktiviert, wird dein Profil mit "noindex,nofollow" markiert.
        </p>
        {claimStatus !== 'verified' ? (
          <p className={styles.mutedText}>
            Die Indexierung kann erst nach einem verifizierten Member-Claim geändert werden.
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
              <p className={styles.mutedText}>Dein Claim für {memberName} wartet auf Bestätigung durch den Leader.</p>
            ) : null}
            {claimStatus === 'verified' ? (
              <p className={styles.mutedText}>Du bist als {memberName} verifiziert.</p>
            ) : null}
            {claimStatus === 'rejected' ? (
              <p className={styles.mutedText}>Dein Claim wurde abgelehnt. Du kannst einen neuen Eintrag beanspruchen.</p>
            ) : null}
          </div>
        )}
      </fieldset>
    </div>
  )
}
