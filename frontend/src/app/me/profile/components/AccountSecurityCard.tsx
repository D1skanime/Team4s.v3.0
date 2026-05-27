import { ExternalLink } from 'lucide-react'

import { Badge, Button } from '@/components/ui'
import type { MemberProfileData } from '@/types/profile'
import { formatAccountStatusLabel, formatPlatformRoleLabel } from '@/lib/profileLabels'

import styles from '../page.module.css'

type AccountSecurityCardProps = {
  profile: MemberProfileData
  hasOpenedKeycloakAccount: boolean
  isRefreshingAccount: boolean
  onKeycloakAccountClick: () => void
}

export function AccountSecurityCard({
  profile,
  hasOpenedKeycloakAccount,
  isRefreshingAccount,
  onKeycloakAccountClick,
}: AccountSecurityCardProps) {
  return (
    <div className={styles.accountGrid}>
      <div>
        <span>Account-Name</span>
        <strong>{profile.account_display_name || '-'}</strong>
      </div>
      <div>
        <span>E-Mail</span>
        <strong>{profile.email || '-'}</strong>
      </div>
      <div>
        <span>Status</span>
        <strong>{formatAccountStatusLabel(profile.account_status)}</strong>
      </div>
      <div>
        <span>Plattformrollen</span>
        <div className={styles.chipRow}>
          {profile.account_global_roles.length > 0 ? profile.account_global_roles.map((role) => (
            <Badge key={role} variant="muted">{formatPlatformRoleLabel(role)}</Badge>
          )) : <Badge variant="muted">Keine</Badge>}
        </div>
      </div>

      {profile.capabilities.can_open_keycloak_account && profile.keycloak_account_url ? (
        <Button href={profile.keycloak_account_url} target="_blank" rel="noreferrer" variant="secondary" onClick={onKeycloakAccountClick} leftIcon={<ExternalLink size={16} />}>
          Account bei Keycloak öffnen
        </Button>
      ) : (
        <Button variant="subtle" disabled>
          Keycloak-Account nicht verknüpft
        </Button>
      )}

      {hasOpenedKeycloakAccount ? (
        <p className={styles.mutedText}>
          Keycloak wurde in einem neuen Tab geöffnet.
          {isRefreshingAccount ? ' Team4s aktualisiert die Accountdaten...' : ' Beim Zurückkehren aktualisiert Team4s diese read-only Accountdaten.'}
        </p>
      ) : null}
    </div>
  )
}
