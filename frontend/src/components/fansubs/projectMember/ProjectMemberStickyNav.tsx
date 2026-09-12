'use client'

import { useEffect, useState } from 'react'

import type { ProjectMemberCounts } from '@/types/projectMember'

import styles from './ProjectMemberStickyNav.module.css'

const NAV_ITEMS: { id: string; label: string; key: keyof ProjectMemberCounts }[] = [
  { id: 'texte', label: 'Texte & Notizen', key: 'notes' },
  { id: 'bilder', label: 'Bilder & Medien', key: 'media' },
  { id: 'releases', label: 'Releases', key: 'releases' },
]

// Lokale Sticky-Schnellnavigation (Brief 8, Referenzdesign 157-02, Workstream C): Desktop sticky,
// umbricht auf schmalen Screens statt abzuschneiden (kein overflow-x mehr). Der Aktivzustand
// folgt der aktuell sichtbaren Sektion per IntersectionObserver-Scrollspy; ohne die API (oder vor
// dem ersten Scroll-Ereignis) bleibt der zuletzt geklickte Tab aktiv.
export function ProjectMemberStickyNav({ counts }: { counts: ProjectMemberCounts }) {
  const [activeId, setActiveId] = useState<string>(NAV_ITEMS[0].id)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return

    const ratios = new Map<string, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0)
        })
        let bestId: string | null = null
        let bestRatio = 0
        for (const item of NAV_ITEMS) {
          const ratio = ratios.get(item.id) ?? 0
          if (ratio > bestRatio) {
            bestRatio = ratio
            bestId = item.id
          }
        }
        if (bestId) setActiveId(bestId)
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    )

    NAV_ITEMS.forEach((item) => {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' })
  }

  const handleClick = (id: string) => {
    setActiveId(id)
    scrollToSection(id)
  }

  return (
    <nav className={styles.stickyNav} aria-label="Schnellnavigation">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`${styles.stickyNavItem}${item.id === activeId ? ` ${styles.stickyNavItemActive}` : ''}`}
          onClick={() => handleClick(item.id)}
          aria-label={`Zu ${item.label} springen (${counts[item.key]})`}
        >
          {item.label}
          <span className={styles.stickyNavCount}>· {counts[item.key]}</span>
        </button>
      ))}
    </nav>
  )
}
