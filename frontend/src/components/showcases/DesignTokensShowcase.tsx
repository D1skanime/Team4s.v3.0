'use client'

import { useState } from 'react'

import { Card, SectionHeader } from '@/components/ui'
import { extractDesignTokens, groupDesignTokens, isColorLikeValue } from '@/lib/designTokens'
import type { DesignTokenGroup } from '@/lib/designTokens'

import styles from './DesignTokensShowcase.module.css'

/**
 * Liest ALLE in `globals.css` unter `:root` deklarierten CSS-Custom-Properties direkt aus den
 * tatsächlich geladenen Stylesheets der Seite (`document.styleSheets`, nicht aus einer von Hand
 * gepflegten JS-Liste mit abgeschriebenen Hex-/Pixel-Werten) und gruppiert sie automatisch nach
 * Namens-Familie. Ein neu in `globals.css` ergänztes Token erscheint dadurch ohne jede Änderung
 * an dieser Komponente -- `designTokens.test.ts` weist das gegen eine unabhängige Regex-Zählung
 * derselben Datei nach.
 */
function readRootDeclarationsFromDocument(): string {
  const blocks: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      // Cross-Origin-Stylesheets (im Projekt nicht vorhanden) werfen beim Zugriff auf cssRules --
      // defensiv überspringen statt die ganze Seite abstürzen zu lassen.
      continue
    }
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule && rule.selectorText === ':root') {
        blocks.push(rule.cssText)
      }
    }
  }
  return blocks.join('\n')
}

export function DesignTokensShowcase() {
  // Lazy-Initializer statt useEffect: document.styleSheets steht bereits vor dem ersten Rendern
  // zur Verfügung (Storybook/Next.js laden globals.css, bevor React überhaupt mountet) -- ein
  // Effekt mit synchronem setState wäre nur eine unnötige zweite Rendering-Runde.
  const [groups] = useState<DesignTokenGroup[]>(() => {
    if (typeof document === 'undefined') return []
    return groupDesignTokens(extractDesignTokens(readRootDeclarationsFromDocument()))
  })

  const totalTokenCount = groups.reduce((sum, group) => sum + group.tokens.length, 0)

  return (
    <div className={styles.stack} data-token-count={totalTokenCount}>
      <SectionHeader
        eyebrow="Grundlagen"
        title="Design-Tokens"
        description={`${totalTokenCount} CSS-Custom-Properties aus globals.css, automatisch ausgelesen und nach Namens-Familie gruppiert -- keine von Hand gepflegte Liste.`}
      />
      {groups.map((group) => (
        <Card key={group.key} variant="section" title={group.label} description={`${group.tokens.length} Token${group.tokens.length === 1 ? '' : 's'}`}>
          <div className={styles.groupGrid}>
            {group.tokens.map((token) => (
              <div key={token.name} className={styles.tokenRow}>
                {isColorLikeValue(token.value) ? (
                  <span className={styles.tokenSwatch} style={{ background: `var(${token.name})` }} aria-hidden="true" />
                ) : (
                  <span className={styles.tokenSwatchPlaceholder} aria-hidden="true" />
                )}
                <div className={styles.tokenRowDetails}>
                  <code>{token.name}</code>
                  <code>{token.value}</code>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
