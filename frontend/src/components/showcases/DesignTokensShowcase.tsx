'use client'

import { useState } from 'react'

import { Accordion, Badge, Card, Heading, SectionHeader, Text } from '@/components/ui'
import type { AccordionItemDef } from '@/components/ui'
import {
  classifyToken,
  extractDesignTokens,
  groupDesignTokens,
  isColorLikeValue,
  isVarReference,
  resolveVarReferenceName,
  FOUNDATION_GROUP_KEYS,
} from '@/lib/designTokens'
import type { DesignToken, DesignTokenGroup } from '@/lib/designTokens'
import { storybookDocsPath } from '@/lib/storybookLinks'

import styles from './DesignTokensShowcase.module.css'

/**
 * Liest ALLE in `globals.css` unter `:root` deklarierten CSS-Werte direkt aus den tatsächlich
 * geladenen Stylesheets der Seite (`document.styleSheets`, nicht aus einer von Hand gepflegten
 * JS-Liste mit abgeschriebenen Hex-/Pixel-Werten). Ein neu in `globals.css` ergänzter Wert
 * erscheint dadurch ohne jede Änderung an dieser Komponente -- `designTokens.test.ts` weist das
 * gegen eine unabhängige Regex-Zählung derselben Datei nach.
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

/** Feste Lesefolge der Grundskala-Familien: Farbe, Abstand, Rundung, Schatten,
 *  Schrift -- die vom Menschen vorgegebene fachliche Reihenfolge statt der alphabetischen
 *  Gruppen-Sortierung, die `groupDesignTokens` für die Bausteinwerte-Stufe weiterhin nutzt. */
const FOUNDATION_DISPLAY_ORDER = ['color', 'space', 'radius', 'shadow', 'font']

/** Rendert die tatsächliche Wirkung eines Grundskala-Werts (Farbfläche/Abstands-Balken/
 *  Rundungs-Ecke/Schatten-Muster/Schrift-Beispiel) statt nur Name und Rohwert als Text --
 *  eine sichtbare Vorschau je Grundwert statt reinem Text. */
function FoundationPreview({ groupKey, token }: { groupKey: string; token: DesignToken }) {
  switch (groupKey) {
    case 'color':
      return <span className={styles.colorSwatch} style={{ background: `var(${token.name})` }} aria-hidden="true" />
    case 'space':
      return (
        <span className={styles.spaceBarTrack} aria-hidden="true">
          <span className={styles.spaceBar} style={{ width: `var(${token.name})` }} />
        </span>
      )
    case 'radius':
      return <span className={styles.radiusBox} style={{ borderRadius: `var(${token.name})` }} aria-hidden="true" />
    case 'shadow':
      return (
        <span className={styles.shadowBoxTrack} aria-hidden="true">
          <span className={styles.shadowBox} style={{ boxShadow: `var(${token.name})` }} />
        </span>
      )
    case 'font': {
      const isRawFamily = token.name === '--font-sans' || token.name === '--font-mono'
      return (
        <span
          className={styles.fontSample}
          style={isRawFamily ? { fontFamily: `var(${token.name})` } : { fontSize: `var(${token.name})` }}
          aria-hidden="true"
        >
          Aa
        </span>
      )
    }
    default:
      return null
  }
}

/** Wandelt den Namens-Rest eines Tokens (alles nach dem Familien-Präfix) in eine lesbare,
 *  titelartige Wortfolge um -- z. B. "--space-badge-row" -> "Badge Row". Rein mechanisch aus dem
 *  Token-Namen selbst abgeleitet (keine Token-für-Token-Übersetzungsliste), da die Seite ihre
 *  Zweck-Sätze mangels verfügbarer CSS-Kommentare (siehe Kommentar an `purposeSentenceFor`)
 *  generisch statt aus echten Kommentaren aufbaut. */
function humanizeNameTail(tokenName: string): string {
  return tokenName
    .replace(/^--/, '')
    .split('-')
    .slice(1)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Baut den kurzen deutschen Zweck-Satz für einen Zweck-Wert. `document.styleSheets`s CSSOM
 * entfernt Kommentare beim Parsen -- die echten, in layout.css/effects.css hinterlegten
 * CSS-Kommentare stehen dieser (ausschließlich browserseitig laufenden) Seite dadurch technisch
 * NICHT zur Verfügung, nur der Node-Testwelt, die die Rohdatei liest. Der Satz wird deshalb bewusst
 * generisch aus dem Token-Namen selbst gebaut statt (nicht erreichbare) Kommentare vorzutäuschen.
 */
function purposeSentenceFor(token: DesignToken, groupLabel: string): string {
  return `Eigener Verwendungszweck innerhalb der Gruppe "${groupLabel}": ${humanizeNameTail(token.name)}.`
}

/** Baut den Rückverweis-Text auf den zugrunde liegenden Grundwert (z. B. "-> 12px (--space-3)"),
 *  wenn der Zweck-Wert tatsächlich per `var()` auf ein anderes Token verweist. Zweck-Werte ohne
 *  eine solche Verweiskette (z. B. `--font-weight-heading: 700`) zeigen stattdessen ihren eigenen
 *  Wert -- kein erfundener Rückverweis, wo keiner existiert. */
function backReferenceFor(token: DesignToken, tokensByName: Map<string, DesignToken>): string | null {
  if (!isVarReference(token.value)) return null
  const refName = resolveVarReferenceName(token.value)
  if (!refName) return null
  const refToken = tokensByName.get(refName)
  return refToken ? `-> ${refToken.value} (${refName})` : `-> ${refName}`
}

/** Eine Bausteinwerte-Gruppe (Tier 3): jede Zeile zeigt Name/Wert wie bisher, markiert aber
 *  zusätzlich sichtbar, welche Werte noch fest codiert sind statt einen Zweck-Token zu
 *  referenzieren (reine Markierung -- das Aufräumen bleibt künftige Arbeit). */
function ComponentGroupPanel({ group }: { group: DesignTokenGroup }) {
  return (
    <div className={styles.componentGroupGrid}>
      {group.tokens.map((token) => (
        <div key={token.name} className={styles.componentRow}>
          {isColorLikeValue(token.value) ? (
            <span className={styles.componentSwatch} style={{ background: `var(${token.name})` }} aria-hidden="true" />
          ) : (
            <span className={styles.componentSwatchPlaceholder} aria-hidden="true" />
          )}
          <div className={styles.componentRowDetails}>
            <code>{token.name}</code>
            <code>{token.value}</code>
            {!isVarReference(token.value) ? (
              <span className={styles.literalMarkerRow}>
                <Badge variant="warning">Fest codiert, noch kein Zweck-Token</Badge>
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

export function DesignTokensShowcase() {
  // Lazy-Initializer statt useEffect: document.styleSheets steht bereits vor dem ersten Rendern
  // zur Verfügung (Storybook/Next.js laden globals.css, bevor React überhaupt mountet) -- ein
  // Effekt mit synchronem setState wäre nur eine unnötige zweite Rendering-Runde.
  const [allTokens] = useState<DesignToken[]>(() => {
    if (typeof document === 'undefined') return []
    return extractDesignTokens(readRootDeclarationsFromDocument())
  })

  const groups = groupDesignTokens(allTokens)
  const tokensByName = new Map(allTokens.map((token) => [token.name, token]))

  // Teilt die automatisch gebildeten Namens-Gruppen in die drei Gliederungsstufen auf: jede
  // Gruppe, deren Familie keine Grundskala bildet, gehört VOLLSTÄNDIG zur Bausteinwerte-Stufe;
  // innerhalb einer Grundskala-Familie trennt `classifyToken` zusätzlich Grundwert von Zweck-Wert.
  const foundationGroups: { group: DesignTokenGroup; foundationTokens: DesignToken[] }[] = []
  const purposeEntries: { token: DesignToken; groupLabel: string }[] = []
  const componentGroups: DesignTokenGroup[] = []

  for (const group of groups) {
    if (!FOUNDATION_GROUP_KEYS.includes(group.key)) {
      componentGroups.push(group)
      continue
    }
    const foundationTokens = group.tokens.filter((token) => classifyToken(token, group.key) === 'foundation')
    const purposeTokens = group.tokens.filter((token) => classifyToken(token, group.key) === 'purpose')
    if (foundationTokens.length > 0) {
      foundationGroups.push({ group, foundationTokens })
    }
    for (const token of purposeTokens) {
      purposeEntries.push({ token, groupLabel: group.label })
    }
  }

  const orderedFoundationGroups = [...foundationGroups].sort(
    (a, b) => FOUNDATION_DISPLAY_ORDER.indexOf(a.group.key) - FOUNDATION_DISPLAY_ORDER.indexOf(b.group.key),
  )

  const totalTokenCount = allTokens.length

  const componentAccordionItems: AccordionItemDef[] = componentGroups.map((group) => ({
    id: group.key,
    title: `${group.label} (${group.tokens.length})`,
    children: <ComponentGroupPanel group={group} />,
  }))
  // Jede Bausteinwerte-Gruppe bleibt im DOM gemountet, auch während sie eingeklappt ist (nur
  // visuell per `hidden`-Attribut verborgen) -- sonst würde `Accordion`s Standardverhalten
  // (geschlossene Panels komplett aus dem DOM entfernen) jedes Token in einer eingeklappten
  // Gruppe für den Vollständigkeitsnachweis dieser Seite verschwinden lassen.
  const componentGroupKeepMountedIds = new Set(componentGroups.map((group) => group.key))

  return (
    <div className={styles.page} data-token-count={totalTokenCount}>
      <SectionHeader
        eyebrow="Grundlagen"
        title="Design-Tokens"
        description={`${totalTokenCount} automatisch erkannte Werte des Design-Systems, dreistufig gegliedert in Grundskala, Zweck-Werte und Bausteinwerte -- keine von Hand gepflegte Liste.`}
      />

      <section className={styles.tier} aria-labelledby="design-tokens-tier-foundation">
        <Heading level={3} id="design-tokens-tier-foundation">Grundskala</Heading>
        <Text variant="soft">
          Die rohen Grundwerte selbst -- Farbe, Abstand, Rundung, Schatten und Schrift -- jeweils mit echter Vorschau.
        </Text>
        {orderedFoundationGroups.map(({ group, foundationTokens }) => (
          <Card
            key={group.key}
            variant="section"
            title={group.label}
            description={`${foundationTokens.length} Grundwert${foundationTokens.length === 1 ? '' : 'e'}`}
          >
            <div className={styles.foundationGroupGrid}>
              {foundationTokens.map((token) => (
                <div key={token.name} className={styles.foundationRow}>
                  <FoundationPreview groupKey={group.key} token={token} />
                  <div className={styles.foundationRowDetails}>
                    <code>{token.name}</code>
                    <code>{token.value}</code>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
        <Card variant="section" title="Effekte" className={styles.effectsReferenceCard}>
          <Text variant="soft">
            Unschärfe-, Glas- und Abdunklungs-Wirkungen stehen bereits mit echten Vorher/Nachher-Bildern auf einer
            eigenen Seite -- hier nicht noch einmal nachgebaut.
          </Text>
          <a href={storybookDocsPath('Grundlagen/Effekte')}>Grundlagen/Effekte ansehen</a>
        </Card>
      </section>

      <section className={styles.tier} aria-labelledby="design-tokens-tier-purpose">
        <Heading level={3} id="design-tokens-tier-purpose">Zweck-Werte</Heading>
        <Text variant="soft">
          Jeder Wert hier hat einen eigenen, benannten Verwendungszweck und verweist zurück auf seinen Grundwert.
        </Text>
        <div className={styles.purposeList}>
          {purposeEntries.map(({ token, groupLabel }) => {
            const backRef = backReferenceFor(token, tokensByName)
            return (
              <div key={token.name} className={styles.purposeItem}>
                <code>{token.name}</code>
                <Text variant="small">{purposeSentenceFor(token, groupLabel)}</Text>
                <Text variant="small" className={styles.purposeBackRef}>
                  {backRef ?? `Eigener Wert: ${token.value}`}
                </Text>
              </div>
            )
          })}
        </div>
      </section>

      <section className={styles.tier} aria-labelledby="design-tokens-tier-component">
        <Heading level={3} id="design-tokens-tier-component">Bausteinwerte</Heading>
        <Text variant="soft">
          Nach Baustein gruppiert und eingeklappt. Ein Hinweis-Abzeichen markiert Werte, die noch keinen Zweck-Token
          nutzen -- reine Markierung, keine Korrektur in dieser Phase.
        </Text>
        <Accordion
          items={componentAccordionItems}
          mode="multi"
          keepMountedIds={componentGroupKeepMountedIds}
        />
      </section>
    </div>
  )
}
