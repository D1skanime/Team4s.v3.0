'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import styles from './AnimeRelations.module.css'

interface AnimeRelation {
  anime_id: number
  title: string
  relation_type: string
  cover_image: string | null
  year: number | null
  type: string
}

interface AnimeRelationsProps {
  relations: AnimeRelation[]
  variant?: 'default' | 'compact'
}

const relationTypeLabels: Record<string, string> = {
  related: 'Related',
  sequel: 'Sequel',
  prequel: 'Prequel',
  alternative: 'Alternative',
  side_story: 'Side Story',
  spin_off: 'Spin-Off',
  summary: 'Summary',
  parent: 'Parent',
  other: 'Other',
}

const animeTypeLabels: Record<string, string> = {
  tv: 'TV',
  movie: 'Movie',
  ova: 'OVA',
  ona: 'ONA',
  special: 'Special',
  music: 'Music',
}

export function AnimeRelations({ relations, variant = 'default' }: AnimeRelationsProps) {
  const sliderRef = useRef<HTMLDivElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [hasOverflow, setHasOverflow] = useState(false)
  const isCompact = variant === 'compact'

  const updateScrollState = () => {
    const slider = sliderRef.current
    if (!slider) return

    const maxScrollLeft = slider.scrollWidth - slider.clientWidth
    const overflow = maxScrollLeft > 8
    setHasOverflow(overflow)
    setCanScrollLeft(overflow && slider.scrollLeft > 8)
    setCanScrollRight(overflow && maxScrollLeft - slider.scrollLeft > 8)
  }

  const scrollByCards = (direction: 'left' | 'right') => {
    const slider = sliderRef.current
    if (!slider) return

    const amount = Math.max(176, Math.floor(slider.clientWidth * 0.85))
    slider.scrollBy({
      left: direction === 'right' ? amount : -amount,
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    const slider = sliderRef.current
    if (!slider || relations.length === 0) return

    const scheduleUpdate = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      animationFrameRef.current = requestAnimationFrame(() => {
        animationFrameRef.current = null
        updateScrollState()
      })
    }

    scheduleUpdate()

    const handleScroll = () => scheduleUpdate()
    const handleResize = () => scheduleUpdate()
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => scheduleUpdate()) : null

    slider.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)
    resizeObserver?.observe(slider)

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      slider.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      resizeObserver?.disconnect()
    }
  }, [relations.length])

  if (!relations || relations.length === 0) {
    return null
  }

  return (
    <section className={`${styles.relationsSection} ${isCompact ? styles.compact : ''}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>Related</h2>
        {hasOverflow && (
          <div className={styles.sliderControls}>
            {canScrollLeft ? (
              <button
                type="button"
                className={styles.navButton}
                onClick={() => scrollByCards('left')}
                aria-label="Related nach links scrollen"
              >
                <ChevronLeft size={18} />
              </button>
            ) : null}
            {canScrollRight ? (
              <button
                type="button"
                className={styles.navButton}
                onClick={() => scrollByCards('right')}
                aria-label="Related nach rechts scrollen"
              >
                <ChevronRight size={18} />
              </button>
            ) : null}
          </div>
        )}
      </div>
      <div className={styles.sliderShell}>
        <div ref={sliderRef} className={styles.slider}>
          {relations.map((rel) => (
            <Link
              key={rel.anime_id}
              href={`/anime/${rel.anime_id}`}
              className={styles.card}
              prefetch={false}
            >
              <div className={styles.cardInner}>
                <div className={styles.cardMedia}>
                  {rel.cover_image ? (
                    <Image
                      src={`/covers/${rel.cover_image}`}
                      alt={rel.title}
                      fill
                      sizes="160px"
                      className={styles.cardImage}
                    />
                  ) : (
                    <div className={styles.cardPlaceholder} />
                  )}
                  <div className={styles.cardGradient} />
                  <span className={styles.cardBadge}>
                    {relationTypeLabels[rel.relation_type] || rel.relation_type}
                  </span>
                </div>
                <div className={styles.cardContent}>
                  <span className={styles.cardTitle}>{rel.title}</span>
                  <div className={styles.cardMeta}>
                    {rel.year && <span className={styles.cardYear}>{rel.year}</span>}
                    <span className={styles.cardType}>
                      {animeTypeLabels[rel.type?.toLowerCase()] || rel.type}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
