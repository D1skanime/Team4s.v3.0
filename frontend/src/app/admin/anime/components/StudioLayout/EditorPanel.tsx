import { ReactNode } from 'react'

import styles from './StudioLayout.module.css'

type StudioState = 'idle' | 'editing' | 'unsaved' | 'saving' | 'saved' | 'error'

interface EditorPanelProps {
  editorMode: 'anime' | 'episode'
  canEditEpisode: boolean
  uiState: StudioState
  hasUnsavedChanges: boolean
  isSaving: boolean
  onEditorModeChange: (mode: 'anime' | 'episode') => void
  onSave: () => void
  children: ReactNode
}

function stateLabel(uiState: StudioState): string {
  switch (uiState) {
    case 'editing':
      return 'Editing'
    case 'unsaved':
      return 'Unsaved Changes'
    case 'saving':
      return 'Saving'
    case 'saved':
      return 'Saved'
    case 'error':
      return 'Error'
    default:
      return 'Idle'
  }
}

function stateClass(uiState: StudioState): string {
  switch (uiState) {
    case 'editing':
      return styles.stateEditing
    case 'unsaved':
      return styles.stateUnsaved
    case 'saving':
      return styles.stateSaving
    case 'saved':
      return styles.stateSaved
    case 'error':
      return styles.stateError
    default:
      return styles.stateIdle
  }
}

export function EditorPanel({
  editorMode,
  canEditEpisode,
  uiState,
  hasUnsavedChanges,
  isSaving,
  onEditorModeChange,
  onSave,
  children,
}: EditorPanelProps) {
  return (
    <div className={styles.editorShell}>
      <header className={styles.editorHeader}>
        <div>
          <h2 className={styles.editorHeaderTitle}>Editor</h2>
          <p className={styles.editorMeta}>Schritt 3-5: Episode waehlen, bearbeiten und speichern.</p>
        </div>
        <div className={styles.editorModeTabs} role="tablist" aria-label="Editor-Modus">
          <button
            type="button"
            role="tab"
            aria-selected={editorMode === 'anime'}
            className={`${styles.editorTab} ${editorMode === 'anime' ? styles.editorTabActive : ''}`}
            onClick={() => onEditorModeChange('anime')}
          >
            Anime
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={editorMode === 'episode'}
            className={`${styles.editorTab} ${editorMode === 'episode' ? styles.editorTabActive : ''}`}
            onClick={() => onEditorModeChange('episode')}
            disabled={!canEditEpisode}
          >
            Episode
          </button>
          <span className={`${styles.statePill} ${stateClass(uiState)}`}>{stateLabel(uiState)}</span>
        </div>
      </header>

      {children}

      <div className={styles.stickySaveWrap}>
        <button type="button" className={styles.stickySave} disabled={!hasUnsavedChanges || isSaving} onClick={onSave}>
          {isSaving ? 'Speichert...' : 'Speichern'}
        </button>
      </div>
      <p className={styles.stickyHint}>Primäre Aktion: Speichern</p>
    </div>
  )
}

