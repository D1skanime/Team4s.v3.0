import type { ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './StatusIcon.module.css'

export type StatusIconTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'
export type StatusIconSize = 'sm' | 'md' | 'lg'

export interface StatusIconProps {
  tone?: StatusIconTone
  size?: StatusIconSize
  icon: ReactNode
  className?: string
}

/**
 * Grundbaustein für tonale Icon-Kreise (neutral/info/success/warning/danger). Konsolidiert die
 * vormals in `ui.module.css` nur innerhalb von `EmptyState`/`ErrorState`/`LoadingState`
 * verfügbaren `.stateIcon`-Tönungen zu einem eigenständigen, überall nutzbaren Baustein. Das
 * übergebene Icon ist rein dekorativ (aria-hidden) — der fachliche Status wird vom Aufrufer über
 * umgebenden Text vermittelt, nicht über dieses Icon allein.
 */
export function StatusIcon({ tone = 'neutral', size = 'md', icon, className }: StatusIconProps) {
  return (
    <div
      aria-hidden="true"
      className={classNames(
        styles.statusIcon,
        tone === 'neutral' && styles.statusIconNeutral,
        tone === 'info' && styles.statusIconInfo,
        tone === 'success' && styles.statusIconSuccess,
        tone === 'warning' && styles.statusIconWarning,
        tone === 'danger' && styles.statusIconDanger,
        size === 'sm' && styles.statusIconSm,
        size === 'lg' && styles.statusIconLg,
        className,
      )}
    >
      {icon}
    </div>
  )
}
