'use client'

import type { ProjectMemberCounts } from '@/types/projectMember'

import styles from './ProjectMemberPage.module.css'

const NAV_ITEMS: { id: string; label: string; key: keyof ProjectMemberCounts }[] = [
  { id: 'texte', label: 'Texte & Notizen', key: 'notes' },
  { id: 'bilder', label: 'Bilder & Medien', key: 'media' },
  { id: 'releases', label: 'Releases', key: 'releases' },
]

// Lokale Sticky-Schnellnavigation (Brief 8). Desktop sticky, Mobile horizontal scrollbar (CSS).
export function ProjectMemberStickyNav({ counts }: { counts: ProjectMemberCounts }) {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <nav className={styles.stickyNav} aria-label="Schnellnavigation">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={styles.stickyNavItem}
          onClick={() => scrollToSection(item.id)}
          aria-label={`Zu ${item.label} springen (${counts[item.key]})`}
        >
          {item.label}
          <span className={styles.stickyNavCount}>· {counts[item.key]}</span>
        </button>
      ))}
    </nav>
  )
}
