import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import styles from './ui.module.css'

export interface ErrorStateProps {
  title: string
  description: string
  action?: ReactNode
}

export function ErrorState({ title, description, action }: ErrorStateProps) {
  return (
    <div className={`${styles.stateCard} ${styles.stateDanger}`}>
      <div className={styles.stateIcon} aria-hidden="true">
        <TriangleAlert size={20} strokeWidth={2} />
      </div>
      <h3 className={styles.stateTitle}>{title}</h3>
      <p className={styles.stateDescription}>{description}</p>
      {action}
    </div>
  )
}
