import { classNames } from './classNames'
import styles from './ui.module.css'

export interface AccentRuleProps {
  thickness?: 'hairline' | 'thin' | 'medium' | 'strong'
  className?: string
}

export function AccentRule({ thickness = 'thin', className }: AccentRuleProps) {
  return (
    <span
      className={classNames(
        styles.accentRule,
        thickness === 'hairline' && styles.accentRuleHairline,
        thickness === 'medium' && styles.accentRuleMedium,
        thickness === 'strong' && styles.accentRuleStrong,
        className,
      )}
      aria-hidden="true"
    />
  )
}
