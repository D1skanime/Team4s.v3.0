import { ReactNode } from 'react'

import styles from './StudioLayout.module.css'

interface AdminLayoutProps {
  uiMode: 'navigation' | 'editing'
  browser: ReactNode
  context: ReactNode
  editor: ReactNode
}

export function AdminLayout({ uiMode, browser, context, editor }: AdminLayoutProps) {
  return (
    <div className={`${styles.layoutRoot} ${uiMode === 'editing' ? styles.layoutRootEditing : ''}`}>
      <div className={styles.layoutGrid}>
        <aside className={`${styles.pane} ${styles.browserPane}`}>{browser}</aside>
        <section className={`${styles.pane} ${styles.contextPane}`}>{context}</section>
        <section className={`${styles.pane} ${styles.editorPane}`}>{editor}</section>
      </div>
    </div>
  )
}

