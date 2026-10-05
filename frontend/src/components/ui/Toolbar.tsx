import type { HTMLAttributes, ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './Toolbar.module.css'

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  leading?: ReactNode
  trailing?: ReactNode
}

export function Toolbar({ leading, trailing, className, children, ...props }: ToolbarProps) {
  return (
    <div {...props} className={classNames(styles.toolbar, className)}>
      <div className={styles.toolbarCluster}>{leading ?? children}</div>
      {trailing ? <div className={styles.toolbarCluster}>{trailing}</div> : null}
    </div>
  )
}
