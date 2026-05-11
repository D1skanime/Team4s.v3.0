import styles from '../../../admin.module.css'

/**
 * Props der AnimeBrowserPagination-Komponente.
 * Enthalten den aktuellen Seitenstand, ob ein Reset möglich ist,
 * ob nicht wesentliche Aktionen versteckt werden sollen,
 * und die zugehörigen Steuerungs-Callbacks.
 */
interface AnimeBrowserPaginationProps {
  isLoading: boolean
  page: number
  totalPages: number
  canReset: boolean
  hideNonEssential: boolean
  onSearch: () => void
  onReset: () => void
  onPrev: () => void
  onNext: () => void
  onReload: () => void
}

/**
 * Paginierungsleiste des Anime-Browsers.
 * Rendert Suchen-, Reset-, Vor-/Zurück- und Neu-Laden-Schaltflaechen.
 * Im `editing`-Modus werden Paginierung und Neu-Laden ausgeblendet.
 */
export function AnimeBrowserPagination({
  isLoading,
  page,
  totalPages,
  canReset,
  hideNonEssential,
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
      {!hideNonEssential ? (
        <>
          <button className={styles.buttonSecondary} type="button" disabled={isLoading || page <= 1} onClick={onPrev}>
            Vorherige Seite
          </button>
          <button className={styles.buttonSecondary} type="button" disabled={isLoading || page >= totalPages} onClick={onNext}>
            Nächste Seite
          </button>
          <button className={styles.buttonSecondary} type="button" disabled={isLoading} onClick={onReload}>
            Neu laden
          </button>
        </>
      ) : null}
    </div>
  )
}
