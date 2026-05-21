import type { HTMLAttributes, ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './ui.module.css'

export interface ActionBarProps extends HTMLAttributes<HTMLDivElement> {
  leading?: ReactNode
  trailing?: ReactNode
}

export function ActionBar({ leading, trailing, className, children, ...props }: ActionBarProps) {
  return (
    <div {...props} className={classNames(styles.actionBar, className)}>
      <div className={styles.actionBarCluster}>{leading ?? children}</div>
      {trailing ? <div className={styles.actionBarCluster}>{trailing}</div> : null}
    </div>
  )
}
