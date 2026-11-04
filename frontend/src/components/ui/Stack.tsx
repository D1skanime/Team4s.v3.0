import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './Stack.module.css'

/** Space-Token-Werte ('1'..'9'), die 1:1 auf die globalen `--space-N`-Tokens
 *  (`src/styles/tokens/layout.css`) abbilden. Alle Layout-Grundbausteine (Stack/Cluster/
 *  SplitLayout) akzeptieren ausschließlich diese Token-Werte als Abstandsmaß -- niemals einen
 *  rohen Pixelwert. */
export type SpaceToken = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

export interface StackProps extends HTMLAttributes<HTMLElement> {
  /** Abstand zwischen den Kindern, als Space-Token (Standard '3' = var(--space-3)). */
  gap?: SpaceToken
  /** Querachsen-Ausrichtung der Kinder (Standard 'stretch'). */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /** Zu rendernde Element-Art (Standard 'div'). */
  as?: ElementType
  className?: string
  children: ReactNode
}

/**
 * Vertikale Anordnung mehrerer Kinder mit festem, token-basiertem Abstand -- der generische
 * Layout-Grundbaustein für jede Kopf-zu-Fuß-Anordnung dieser Codebasis (z. B. Titelzeile über
 * Beschreibung über Kennzahlen). Setzt bewusst KEINE Fläche/Farbe/Rundung selbst -- diese kommen
 * aus den umschließenden Card-/MediaFrame-Varianten, niemals aus Stack selbst (siehe CLAUDE.md
 * "Frontend-UI": Rundungen/Flächen bleiben bei den dafür vorgesehenen Bausteinen).
 */
export function Stack({
  gap = '3',
  align = 'stretch',
  as: Component = 'div',
  className,
  children,
  style,
  ...props
}: StackProps) {
  return (
    <Component
      {...props}
      style={{ ...style, '--stack-gap': `var(--space-${gap})`, '--stack-align': align } as CSSProperties}
      className={classNames(styles.stack, className)}
    >
      {children}
    </Component>
  )
}
