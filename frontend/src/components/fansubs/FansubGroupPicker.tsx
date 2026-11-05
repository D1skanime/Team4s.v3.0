'use client'

import { Avatar, Button, Cluster, Stack, Text } from '@/components/ui'

import styles from './FansubGroupPicker.module.css'

export interface FansubGroupPickerOption {
  id: number
  slug: string
  name: string
  logo_url?: string | null
}

export interface FansubGroupPickerProps {
  options: FansubGroupPickerOption[]
  activeGroupId: number | null
  showAllChip: boolean
  onSelect: (groupId: number | null) => void
}

function resolveLogoUrl(raw?: string | null): string | null {
  const value = (raw || '').trim()
  if (!value) return null
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
    return value
  }
  return `/covers/${value}`
}

export function FansubGroupPicker({ options, activeGroupId, showAllChip, onSelect }: FansubGroupPickerProps) {
  if (options.length === 0) return null

  return (
    <Stack gap="relatedContent" className={styles.wrapper}>
      <Text as="span" variant="eyebrow" tone="onScrim">Fansub-Gruppe</Text>
      <Cluster gap="interactiveChipRow" as="div" role="group" aria-label="Fansub-Gruppe">
        {showAllChip ? (
          <Button
            variant="chipGlass"
            size="sm"
            aria-pressed={activeGroupId === null}
            onClick={() => onSelect(null)}
            className={styles.chip}
          >
            Alle
          </Button>
        ) : null}
        {options.map((option) => {
          const logoURL = resolveLogoUrl(option.logo_url)
          const isActive = activeGroupId === option.id
          return (
            <Button
              key={option.id}
              variant="chipGlass"
              size="sm"
              aria-pressed={isActive}
              onClick={() => onSelect(option.id)}
              className={styles.chip}
              // Kreisform/Zuschnitt des Gruppenlogos kommt jetzt aus dem Avatar-Grundbaustein
              // (Größenstufe "xs", 20px) statt eines lokal zugeschnittenen <Image>-Elements; der
              // Icon-Beschriftungs-Abstand übernimmt Buttons eigene chipGlass-Lücke (--button-gap).
              leftIcon={logoURL ? <Avatar size="xs" src={logoURL} label={option.name} /> : null}
            >
              {option.name}
            </Button>
          )
        })}
      </Cluster>
    </Stack>
  )
}
