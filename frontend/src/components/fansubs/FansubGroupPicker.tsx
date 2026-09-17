'use client'

import Image from 'next/image'

import { Button } from '@/components/ui'
import { classNames } from '@/components/ui/classNames'

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
    <div>
      <span className={styles.eyebrowLabel}>Fansub-Gruppe</span>
      <div role="group" aria-label="Fansub-Gruppe" className={styles.chipRow}>
        {showAllChip ? (
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={activeGroupId === null}
            onClick={() => onSelect(null)}
            className={classNames(styles.chip, activeGroupId === null && styles.chipActive)}
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
              variant="ghost"
              size="sm"
              aria-pressed={isActive}
              onClick={() => onSelect(option.id)}
              className={classNames(styles.chip, isActive && styles.chipActive)}
            >
              {logoURL ? (
                <Image src={logoURL} alt="" width={20} height={20} unoptimized className={styles.logo} />
              ) : null}
              {option.name}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
