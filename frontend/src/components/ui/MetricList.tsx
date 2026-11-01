import type { ReactNode } from 'react'

import { Button } from './Button'
import { Heading } from './Heading'
import type { HeadingLevel } from './Heading'
import { Text } from './Text'
import { classNames } from './classNames'
import styles from './MetricList.module.css'

export interface MetricListItem {
  label: string
  value: ReactNode
  onActivate?: () => void
  activateLabel?: string
}

export interface MetricListProps {
  items: MetricListItem[]
  ariaLabel: string
  className?: string
  variant?: 'default' | 'inline'
  /** Überschriften-Level für den nicht klickbaren Kennzahlen-Wert (rendert über `Heading
   *  size="hero"`). MUSS zur umgebenden Überschriften-Hierarchie der jeweiligen Seite passen --
   *  ein Level über der zuletzt gerenderten Überschrift --, sonst verletzt es die Axe-Regel
   *  heading-order. Bei `variant="inline"` ohne Wirkung (der Wert rendert dort über Text, nie
   *  über Heading), aber trotzdem Pflicht-Prop, damit kein Aufrufer der Standard-Variante
   *  versehentlich den Default vergisst. */
  valueHeadingLevel: HeadingLevel
  /** 'onDark' hält Beschriftung und Wert auf einem dunklen Hintergrund lesbar (z. B. ein
   *  Foto-Banner mit Scrim, siehe FansubHeroSection) -- reicht Heading/Text tone="onScrim"
   *  durch, WCAG-kontrastgeprüft. Gilt nur für nicht klickbare Kennzahlen; eine klickbare
   *  Kennzahl mit tone="onDark" ist aktuell kein unterstützter Fall (kein realer Verwender). */
  tone?: 'default' | 'onDark'
}

/**
 * Liste von Kennzahlen (Bezeichnung + Wert), wahlweise untereinander-nebeneinander ("default")
 * oder als kompakte, durch Punkte getrennte Reihe ("inline"). Eine Kennzahl kann klickbar sein
 * (z. B. um zu einem passenden Abschnitt der Seite zu springen) -- dann rendert der Wert über
 * `Button` (Größe/Ton über dessen offizielle `size`/`tone`-Optionen) statt `Heading`/`Text`, da
 * deren Elemente nicht gültig in einen Button verschachtelt werden dürfen. Alle `Text`-Ausgaben
 * innerhalb von `<dt>`/`<dd>` nutzen dessen offizielle `as="span"`-Option -- ein `<p>` würde dort
 * einen eigenen Absatz-Außenabstand einbringen und die kompakte Beschriftung-Wert-Zeile stören.
 */
export function MetricList({ items, ariaLabel, className, variant = 'default', valueHeadingLevel, tone = 'default' }: MetricListProps) {
  if (items.length === 0) return null

  const labelTone = tone === 'onDark' ? 'onScrim' : 'default'
  const valueHeadingTone = tone === 'onDark' ? 'onScrim' : 'accent'

  return (
    <dl className={classNames(styles.metricList, variant === 'inline' && styles.metricListInline, className)} aria-label={ariaLabel}>
      {items.map((item) => (
        <div key={item.label} className={styles.metricItem}>
          {variant === 'inline' ? (
            <>
              <dt className={styles.metricInlineLabel}><Text as="span" variant="small" tone={labelTone}>{item.label}</Text></dt>
              <dd>
                {item.onActivate ? (
                  <Button type="button" variant="text" size="prose" tone="strong" onClick={item.onActivate} aria-label={item.activateLabel}>
                    {item.value}<span aria-hidden="true"> {item.label}</span>
                  </Button>
                ) : (
                  <Text as="span" variant="body" tone={labelTone}>{item.value}<span aria-hidden="true"> {item.label}</span></Text>
                )}
              </dd>
            </>
          ) : (
            <>
              <dt><Text as="span" variant="small" tone={labelTone}>{item.label}</Text></dt>
              <dd>
                {item.onActivate ? (
                  <Button type="button" variant="text" size="hero" tone="accent" onClick={item.onActivate} aria-label={item.activateLabel}>
                    {item.value}
                  </Button>
                ) : (
                  <Heading level={valueHeadingLevel} size="hero" tone={valueHeadingTone}>{item.value}</Heading>
                )}
              </dd>
            </>
          )}
        </div>
      ))}
    </dl>
  )
}
