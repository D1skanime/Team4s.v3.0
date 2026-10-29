import { Card, SectionHeader } from '@/components/ui'

import styles from './showcases.module.css'

/**
 * Eigenständige Design-Tokens- und Farbfamilien-Vorschau. Diese Komponente ist NEU
 * (vormals nur inline im Seitencode der früheren In-App-Showcase-Route
 * vorhanden) — ohne sie würde die Design-Tokens-Vorschau beim Löschen der alten
 * In-App-Showcase-Route (Task 12) ersatzlos verschwinden. Zeigt die Basis-Token-Familien
 * (Canvas/Card/Accent/Success, Radius/Schatten/Spacing/Typografie) sowie die zusätzlichen
 * Farbfamilien der öffentlichen Profile (Avatar-Kreise, Medien-Kategorie-Tags,
 * Community-Logo-Farben) — alles über CSS-Variablen, keine Inline-Hex-Werte in
 * Produktkomponenten.
 */

const tokenSwatches = [
  { name: 'Canvas', variable: '--surface-canvas', color: '#f6f4ef' },
  { name: 'Card', variable: '--surface-card', color: '#ffffff' },
  { name: 'Accent', variable: '--accent-primary', color: '#2d5fe8' },
  { name: 'Success', variable: '--color-success', color: '#28a745' },
]

const avatarFamily = Array.from({ length: 6 }, (_, index) => ({
  label: `Avatar ${index + 1}`,
  variable: `--avatar-${index + 1}`,
}))

const categoryTagFamily = [
  { label: 'Galerie', key: 'gallery' },
  { label: 'Historie', key: 'history' },
  { label: 'Old-Web', key: 'oldweb' },
  { label: 'Forum', key: 'forum' },
  { label: 'IRC', key: 'irc' },
  { label: 'Event', key: 'event' },
  { label: 'Artwork', key: 'artwork' },
  { label: 'Sonstiges', key: 'other' },
]

const communityLinkFamily = [
  { label: 'Discord', variable: '--link-discord' },
  { label: 'IRC', variable: '--link-irc' },
  { label: 'Twitter/X', variable: '--link-twitter' },
  { label: 'GitHub', variable: '--link-github' },
]

export function DesignTokensShowcase() {
  return (
    <div className={styles.stack}>
      <Card variant="section">
        <SectionHeader
          eyebrow="01"
          title="Design-Tokens-Vorschau"
          description="Die visuelle Basis bleibt ruhig und neutral, mit einem kühleren blau-tealigen Akzent für Primäraktionen und klare Hierarchie."
        />
        <div className={styles.tokenGrid}>
          {tokenSwatches.map((swatch) => (
            <div key={swatch.variable} className={styles.swatch} style={{ background: swatch.color }}>
              <strong>{swatch.name}</strong>
              <code>{swatch.variable}</code>
            </div>
          ))}
        </div>
        <div className={styles.showcaseGrid}>
          <Card variant="flat" title="Radius" description="Harmonische Rundungen statt vieler Zufallswerte.">
            <div className={styles.radiusRow}>
              <div className={styles.radiusSample} style={{ borderRadius: '12px' }}><code>sm</code></div>
              <div className={styles.radiusSample} style={{ borderRadius: '14px' }}><code>md</code></div>
              <div className={styles.radiusSample} style={{ borderRadius: '20px' }}><code>lg</code></div>
            </div>
          </Card>
          <Card variant="flat" title="Schatten" description="Zurückhaltend und nur zur Hierarchie, nicht als 2015-Panel-Effekt.">
            <div className={styles.shadowRow}>
              <div className={styles.shadowSample} style={{ boxShadow: 'var(--shadow-xs)' }}><code>xs</code></div>
              <div className={styles.shadowSample} style={{ boxShadow: 'var(--shadow-sm)' }}><code>sm</code></div>
              <div className={styles.shadowSample} style={{ boxShadow: 'var(--shadow-md)' }}><code>md</code></div>
            </div>
          </Card>
          <Card variant="flat" title="Spacing" description="Abstände werden über Tokens statt über page-lokale Magic Numbers geführt.">
            <div className={styles.spacingRow}>
              <div className={styles.spacingSample}><code>space-3</code></div>
              <div className={styles.spacingSample}><code>space-5</code></div>
              <div className={styles.spacingSample}><code>space-7</code></div>
            </div>
          </Card>
          <Card variant="flat" title="Typografie" description="Klare Hierarchie mit ruhigen Fließtextfarben und kräftigeren Titeln.">
            <div className={styles.stack}>
              <div className={styles.tokenLine}><strong>Titel</strong><code>--text-strong</code></div>
              <div className={styles.tokenLine}><span>Body Copy</span><code>--text-body</code></div>
              <div className={styles.tokenLine}><span>Metatext</span><code>--text-soft / --text-faint</code></div>
            </div>
          </Card>
        </div>
      </Card>

      <Card variant="section">
        <SectionHeader
          eyebrow="01b"
          title="Farbfamilien – öffentliche Profile"
          description="Zusätzliche Token-Familien für die öffentlichen Fansub-Seiten: farbige Avatar-Kreise, Medien-Kategorie-Tags und Community-Logo-Farben. Alle über CSS-Variablen, keine Inline-Hex-Werte in den Komponenten."
        />
        <div className={styles.stack}>
          <div>
            <div className={styles.tokenLine}><strong>Avatar-Kreise</strong><code>--avatar-N-bg / -fg</code></div>
            <div className={styles.colorFamilyGrid}>
              {avatarFamily.map((item) => (
                <span
                  key={item.variable}
                  className={styles.colorChip}
                  style={{ background: `var(${item.variable}-bg)`, color: `var(${item.variable}-fg)` }}
                >
                  {item.label}
                  <code>{item.variable}</code>
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className={styles.tokenLine}><strong>Medien-Kategorie-Tags</strong><code>--tag-KEY-bg / -fg</code></div>
            <div className={styles.colorFamilyGrid}>
              {categoryTagFamily.map((item) => (
                <span
                  key={item.key}
                  className={styles.colorChip}
                  style={{ background: `var(--tag-${item.key}-bg)`, color: `var(--tag-${item.key}-fg)` }}
                >
                  {item.label}
                  <code>{`--tag-${item.key}`}</code>
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className={styles.tokenLine}><strong>Community-Logo-Farben</strong><code>--link-KEY</code></div>
            <div className={styles.colorFamilyGrid}>
              {communityLinkFamily.map((item) => (
                <span key={item.variable} className={styles.colorChip}>
                  <span className={styles.colorDot} style={{ background: `var(${item.variable})` }} />
                  {item.label}
                  <code>{item.variable}</code>
                </span>
              ))}
            </div>
          </div>
          <div className={styles.tokenLine}>
            <span>Weitere Tokens</span>
            <code>--accent-deep · --scrim-strong · --scrim-icon</code>
          </div>
        </div>
      </Card>
    </div>
  )
}
