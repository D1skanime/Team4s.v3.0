import { Badge, Card, EmptyState, SectionHeader } from '@/components/ui'
import type { PublicGroupTheme } from '@/types/groupContributors'

import styles from '../page.module.css'

interface ThemesSectionProps {
  themes: PublicGroupTheme[]
}

const THEME_TYPE_LABELS: Record<string, string> = {
  OP: 'Opening',
  ED: 'Ending',
  MIDDLE: 'Middle',
}

const THEME_TYPE_ORDER = ['OP', 'ED', 'MIDDLE'] as const

function groupByType(themes: PublicGroupTheme[]): Record<string, PublicGroupTheme[]> {
  const grouped: Record<string, PublicGroupTheme[]> = { OP: [], ED: [], MIDDLE: [] }
  for (const theme of themes) {
    const key = theme.type.toUpperCase()
    if (key in grouped) {
      grouped[key].push(theme)
    } else {
      grouped[key] = [theme]
    }
  }
  return grouped
}

export function ThemesSection({ themes }: ThemesSectionProps) {
  const grouped = groupByType(themes)

  return (
    <div id="themes" className={styles.themesSection}>
      <SectionHeader title="OP / ED / Middle" />
      {themes.length === 0 ? (
        <EmptyState
          variant="compact"
          title="Noch keine OP/ED/Middle"
          description="Für dieses Projekt sind noch keine Theme-Einblicke freigegeben."
        />
      ) : (
        <>
          {THEME_TYPE_ORDER.map((type) => {
            const items = grouped[type] ?? []
            if (items.length === 0) return null
            return (
              <div key={type} className={styles.themeGroup}>
                <h3 className={styles.blockTitle}>{THEME_TYPE_LABELS[type]}</h3>
                {items.map((theme) => (
                  <Card key={theme.id} variant="section" className={styles.themeCard}>
                    <div className={styles.themeHeader}>
                      <span className={styles.themeTitle}>{theme.title}</span>
                      <Badge variant="muted">{THEME_TYPE_LABELS[theme.type.toUpperCase()] ?? theme.type}</Badge>
                    </div>
                    {theme.assets.length > 0 && (
                      <div className={styles.assetGrid}>
                        {theme.assets.map((asset) =>
                          asset.thumbnail_url ? (
                            <div key={asset.id} className={styles.assetTile}>
                              <img
                                src={asset.thumbnail_url}
                                alt={`OP-Asset: ${theme.title}`}
                                className={styles.assetThumb}
                              />
                            </div>
                          ) : null,
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
