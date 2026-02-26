import styles from '../../../admin.module.css'

interface AnimeBrowserPaginationProps {
  isLoading: boolean
  page: number
  totalPages: number
  canReset: boolean
  onSearch: () => void
  onReset: () => void
  onPrev: () => void
  onNext: () => void
  onReload: () => void
}

export function AnimeBrowserPagination({
  isLoading,
  page,
  totalPages,
  canReset,
  onSearch,
  onReset,
  onPrev,
  onNext,
  onReload,
}: AnimeBrowserPaginationProps) {
  return (
    <div className={styles.actions}>
      <button className={styles.buttonSecondary} type="button" disabled={isLoading} onClick={onSearch}>
        Suchen
      </button>
      <button className={styles.buttonSecondary} type="button" disabled={isLoading || !canReset} onClick={onReset}>
        Reset
      </button>
      <button className={styles.buttonSecondary} type="button" disabled={isLoading || page <= 1} onClick={onPrev}>
        Vorherige Seite
      </button>
      <button className={styles.buttonSecondary} type="button" disabled={isLoading || page >= totalPages} onClick={onNext}>
        Naechste Seite
      </button>
      <button className={styles.buttonSecondary} type="button" disabled={isLoading} onClick={onReload}>
        Neu laden
      </button>
    </div>
  )
}
