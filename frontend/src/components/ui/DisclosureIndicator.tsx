import { ChevronDown, ChevronRight } from 'lucide-react'

import { classNames } from './classNames'
import styles from './ui.module.css'

export interface DisclosureIndicatorProps {
  open?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'plain' | 'button'
  className?: string
}

const iconSizeBySize = {
  sm: 18,
  md: 24,
  lg: 30,
} satisfies Record<NonNullable<DisclosureIndicatorProps['size']>, number>

export function DisclosureIndicator({
  open = false,
  size = 'md',
  variant = 'plain',
  className,
}: DisclosureIndicatorProps) {
  const Icon = open ? ChevronDown : ChevronRight

  return (
    <span
      className={classNames(
        styles.disclosureIndicator,
        size === 'sm' && styles.disclosureIndicatorSm,
        size === 'lg' && styles.disclosureIndicatorLg,
        variant === 'button' && styles.disclosureIndicatorButton,
        className,
      )}
      aria-hidden="true"
    >
      <Icon size={iconSizeBySize[size]} strokeWidth={2.5} />
    </span>
  )
}
