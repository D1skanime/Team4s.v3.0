'use client'

import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui'

import styles from './FansubSectionNav.module.css'

const SECTION_IDS = [
  'geschichte',
  'hoehepunkte',
  'projekte',
  'erfolge',
  'team',
  'mitwirkende',
  'medien',
  'gruppenleitung',
  'deep-dive',
] as const

type SectionId = (typeof SECTION_IDS)[number]

const SECTION_LABELS: Record<SectionId, string> = {
  geschichte: 'Geschichte',
  hoehepunkte: 'Höhepunkte',
  projekte: 'Projekte',
  erfolge: 'Erfolge',
  team: 'Team',
  mitwirkende: 'Mitwirkende',
  medien: 'Medien',
  gruppenleitung: 'Gruppenleitung',
  'deep-dive': 'Mehr',
}

export function FansubSectionNav(): JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId>('geschichte')
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && SECTION_IDS.includes(entry.target.id as SectionId)) {
            setActiveSection(entry.target.id as SectionId)
            break
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' },
    )

    SECTION_IDS.forEach((id) => {
      const section = document.getElementById(id)
      if (section) {
        observerRef.current?.observe(section)
      }
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  return (
    <nav className={styles.sectionNav} aria-label="Seitennavigation">
      {SECTION_IDS.map((id) => (
        <Button
          key={id}
          variant={activeSection === id ? 'subtle' : 'ghost'}
          size="sm"
          aria-current={activeSection === id ? 'true' : undefined}
          onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
        >
          {SECTION_LABELS[id]}
        </Button>
      ))}
    </nav>
  )
}
