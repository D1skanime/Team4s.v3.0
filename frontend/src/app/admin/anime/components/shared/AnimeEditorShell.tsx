'use client'

import styles from '../../AdminStudio.module.css'
import workspaceStyles from '../AnimeEditPage/AnimeEditWorkspace.module.css'
import type { AnimeEditorShellProps } from '../../types/admin-anime-editor'

export function AnimeEditorShell({ editor, title, subtitle, header, children }: AnimeEditorShellProps) {
  const hasUnsavedChanges = editor.isDirty

  return (
    <div className={workspaceStyles.workspace}>
      {title || subtitle || header ? (
        <section className={styles.headerCard}>
          {title ? <h2 className={styles.pageTitle}>{title}</h2> : null}
          {subtitle ? <p className={styles.pageSubtitle}>{subtitle}</p> : null}
          {header}
        </section>
      ) : null}

      {children}

      <section className={workspaceStyles.saveBar}>
        <div className={workspaceStyles.saveState}>
          <p className={workspaceStyles.saveStateTitle}>{editor.saveStateTitle}</p>
          <p className={workspaceStyles.saveStateMeta}>{editor.saveStateMessage}</p>
        </div>
        <button
          type={editor.submitButtonType}
          form={editor.formID}
          className={`${styles.button} ${styles.buttonPrimary}`}
          disabled={editor.isSubmitting || !hasUnsavedChanges}
          onClick={editor.onSubmit}
        >
          {editor.isSubmitting ? 'Speichert...' : editor.submitLabel}
        </button>
      </section>
    </div>
  )
}
