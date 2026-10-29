import { X } from 'lucide-react'
import type { Ref } from 'react'

import { IconButton } from './IconButton'
import styles from './DialogHeader.module.css'

export interface DialogHeaderProps {
  title: string
  description?: string
  onClose: () => void
  closeLabel?: string
  /** ID der umschließenden Dialog-Wurzel für aria-labelledby (von Modal/Drawer vorgegeben). */
  titleId: string
  /** Ermöglicht Modal/Drawer, nach dem Öffnen weiterhin per Ref auf den Schließen-Button zu fokussieren. */
  closeButtonRef?: Ref<HTMLButtonElement>
  /** Steuert, welche IconButton-Optik das Schließen-Kreuz nutzt. */
  variant?: 'default' | 'floating'
  /** Kontextabhängiges Padding/Border -- Rahmen/Innenabstand bleiben bei Modal/Drawer leicht unterschiedlich. */
  className?: string
}

/**
 * Interne, nicht exportierte Titelzeile für Dialog-Flächen. Modal und Drawer rendern beide
 * exakt diese Komponente statt zweier paralleler, fast identischer JSX-Blöcke -- Titel/
 * Beschreibung links, Schließen-IconButton rechts. Kein eigenständiges Primitiv (daher kein
 * Export aus index.ts): reine Implementierungsteilung zwischen den beiden Dialog-Bausteinen.
 */
export function DialogHeader({
  title,
  description,
  onClose,
  closeLabel = 'Schließen',
  titleId,
  closeButtonRef,
  variant = 'default',
  className,
}: DialogHeaderProps) {
  return (
    <div className={[styles.dialogHeader, className].filter(Boolean).join(' ')}>
      <div>
        <h3 id={titleId} className={styles.dialogTitle}>
          {title}
        </h3>
        {description ? <p className={styles.dialogDescription}>{description}</p> : null}
      </div>
      <IconButton
        ref={closeButtonRef}
        icon={<X size={18} />}
        aria-label={closeLabel}
        variant={variant}
        onClick={onClose}
      />
    </div>
  )
}
