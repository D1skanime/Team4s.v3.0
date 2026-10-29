import { X } from 'lucide-react'
import type { Ref } from 'react'

import { IconButton } from './IconButton'
import styles from './DialogHeader.module.css'

export interface DialogHeaderProps {
  title: string
  description?: string
  onClose: () => void
  closeLabel?: string
  /** ID der umschliessenden Dialog-Wurzel fuer aria-labelledby (von Modal/Drawer vorgegeben). */
  titleId: string
  /** Ermoeglicht Modal/Drawer, nach dem Oeffnen weiterhin per Ref auf den Schliessen-Button zu fokussieren. */
  closeButtonRef?: Ref<HTMLButtonElement>
  /** Steuert, welche IconButton-Optik das Schliessen-Kreuz nutzt. */
  variant?: 'default' | 'floating'
  /** Kontextabhaengiges Padding/Border -- Rahmen/Innenabstand bleiben bei Modal/Drawer leicht unterschiedlich. */
  className?: string
}

/**
 * Interne, nicht exportierte Titelzeile fuer Dialog-Flaechen. Modal und Drawer rendern beide
 * exakt diese Komponente statt zweier paralleler, fast identischer JSX-Bloecke -- Titel/
 * Beschreibung links, Schliessen-IconButton rechts. Kein eigenstaendiges Primitiv (daher kein
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
