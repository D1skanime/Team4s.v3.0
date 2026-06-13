import { ANIME_CONTRIBUTION_ROLES } from './contributionRoles'
import styles from './FansubEdit.module.css'

interface RoleToggleGroupProps {
  selectedCodes: string[]
  onToggle: (code: string) => void
  ariaLabel: string
}

export function RoleToggleGroup({ selectedCodes, onToggle, ariaLabel }: RoleToggleGroupProps) {
  return (
    <div className={styles.contributionRoleToggles} aria-label={ariaLabel}>
      {ANIME_CONTRIBUTION_ROLES.map((role) => {
        const active = selectedCodes.includes(role.code)
        return (
          <button
            key={role.code}
            type="button"
            className={`${styles.contributionRoleToggle} ${
              active ? styles.contributionRoleToggleActive : ''
            }`}
            aria-pressed={active}
            onClick={() => onToggle(role.code)}
          >
            {role.label}
          </button>
        )
      })}
    </div>
  )
}
