import { contributionRoleDefinitions } from './contributionRoles'
import { useRoleCatalog } from '@/providers/RoleCatalogProvider'
import styles from './FansubEdit.module.css'

interface RoleToggleGroupProps {
  selectedCodes: string[]
  onToggle: (code: string) => void
  ariaLabel: string
}

export function RoleToggleGroup({ selectedCodes, onToggle, ariaLabel }: RoleToggleGroupProps) {
  const { roles } = useRoleCatalog('anime_contribution')
  const roleDefinitions = contributionRoleDefinitions(roles)
  return (
    <div className={styles.contributionRoleToggles} aria-label={ariaLabel}>
      {roleDefinitions.map((role) => {
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
            {role.label_de}
          </button>
        )
      })}
    </div>
  )
}
