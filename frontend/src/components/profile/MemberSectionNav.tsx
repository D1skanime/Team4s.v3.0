'use client'

/**
 * MemberSectionNav — Sticky-Anker-Navigation für die Member-Profil-Scroll-Seite (D-01).
 *
 * Desktop: flex-row klebende Nav; Mobil: horizontale Chip-Leiste (overflow-x: auto).
 * Sektions-Reihenfolge nach D-02: Identität → Badges → Geschichte → Mitwirkende.
 * IntersectionObserver rootMargin '-20% 0px -70% 0px' (Phase-73-Paradigma 1:1 adaptiert).
 */

import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui'

import styles from './MemberSectionNav.module.css'

const SECTION_IDS = ['identitaet', 'badges', 'geschichte', 'beitraege'] as const
type SectionId = (typeof SECTION_IDS)[number]

const SECTION_LABELS: Record<SectionId, string> = {
  identitaet: 'Identität',
  badges: 'Badges',
  geschichte: 'Geschichte',
  beitraege: 'Mitwirkende',
}

export function MemberSectionNav() {
  const [activeSection, setActiveSection] = useState<SectionId>(SECTION_IDS[0])
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as SectionId)
            break
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' },
    )

    for (const id of SECTION_IDS) {
      const el = document.getElementById(id)
      if (el) observerRef.current.observe(el)
    }

    return () => observerRef.current?.disconnect()
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
