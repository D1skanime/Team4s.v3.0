'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { AnimeListItem } from '@/types/anime'
import { FansubGroup, FansubMember } from '@/types/fansub'

import styles from './FansubProfileTabs.module.css'

type FansubTabKey = 'overview' | 'members' | 'projects' | 'archive' | 'memories'

interface FansubProfileTabsProps {
  group: FansubGroup
  members: FansubMember[]
  projects: AnimeListItem[]
}

const tabOrder: FansubTabKey[] = ['overview', 'members', 'projects', 'archive', 'memories']

const tabLabel: Record<FansubTabKey, string> = {
  overview: 'Uebersicht',
  members: 'Mitglieder',
  projects: 'Projekte',
  archive: 'Archiv',
  memories: 'Erinnerungen',
}

function normalizeTab(value: string): FansubTabKey {
  const key = value.replace('#', '').trim().toLowerCase()
  if (tabOrder.includes(key as FansubTabKey)) {
    return key as FansubTabKey
  }
  return 'overview'
}

function formatYearRange(sinceYear?: number | null, untilYear?: number | null): string {
  if (sinceYear && untilYear) return `${sinceYear} - ${untilYear}`
  if (sinceYear) return `seit ${sinceYear}`
  if (untilYear) return `bis ${untilYear}`
  return 'Zeitraum unbekannt'
}

type ProjectBucketKey = 'ongoing' | 'completed' | 'archived'

const projectBucketOrder: ProjectBucketKey[] = ['ongoing', 'completed', 'archived']

const projectBucketLabel: Record<ProjectBucketKey, string> = {
  ongoing: 'Laufend',
  completed: 'Abgeschlossen',
  archived: 'Archiviert',
}

function resolveProjectBucket(status: AnimeListItem['status']): ProjectBucketKey {
  if (status === 'ongoing') return 'ongoing'
  if (status === 'done') return 'completed'
  return 'archived'
}

export function FansubProfileTabs({ group, members, projects }: FansubProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<FansubTabKey>(() => {
    if (typeof window === 'undefined') return 'overview'
    return normalizeTab(window.location.hash)
  })

  const membersByRole = useMemo(() => {
    const map = new Map<string, FansubMember[]>()
    for (const member of members) {
      const role = (member.role || 'Unbekannt').trim() || 'Unbekannt'
      const list = map.get(role) || []
      list.push(member)
      map.set(role, list)
    }
    const grouped = Array.from(map.entries()).map(([role, items]) => ({
      role,
      items: [...items].sort((left, right) => {
        const leftYear = left.since_year || Number.MAX_SAFE_INTEGER
        const rightYear = right.since_year || Number.MAX_SAFE_INTEGER
        if (leftYear !== rightYear) return leftYear - rightYear
        return left.handle.localeCompare(right.handle, 'de')
      }),
    }))
    grouped.sort((left, right) => left.role.localeCompare(right.role, 'de'))
    return grouped
  }, [members])

  const projectsByBucket = useMemo(() => {
    const map: Record<ProjectBucketKey, AnimeListItem[]> = {
      ongoing: [],
      completed: [],
      archived: [],
    }

    for (const item of projects) {
      map[resolveProjectBucket(item.status)].push(item)
    }

    for (const bucket of projectBucketOrder) {
      map[bucket].sort((left, right) => left.title.localeCompare(right.title, 'de'))
    }

    return map
  }, [projects])

  function handleTabChange(nextTab: FansubTabKey) {
    setActiveTab(nextTab)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${nextTab}`)
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.tabRow} role="tablist" aria-label="Fansub Profil Tabs">
        {tabOrder.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabChange(tab)}
            className={`${styles.tabButton} ${activeTab === tab ? styles.tabButtonActive : ''}`}
            role="tab"
            id={`fansub-tab-${tab}`}
            aria-selected={activeTab === tab}
            aria-controls={`fansub-panel-${tab}`}
          >
            {tabLabel[tab]}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <div className={styles.panel} role="tabpanel" id="fansub-panel-overview" aria-labelledby="fansub-tab-overview">
          <dl className={styles.metaGrid}>
            <div>
              <dt>Status</dt>
              <dd>{group.status}</dd>
            </div>
            <div>
              <dt>Land</dt>
              <dd>{group.country || 'Unbekannt'}</dd>
            </div>
            <div>
              <dt>Gruendung</dt>
              <dd>{group.founded_year || 'n/a'}</dd>
            </div>
            <div>
              <dt>Aufloesung</dt>
              <dd>{group.dissolved_year || 'aktiv'}</dd>
            </div>
          </dl>
          <p className={styles.bodyText}>{group.description || 'Keine Beschreibung hinterlegt.'}</p>
        </div>
      ) : null}

      {activeTab === 'members' ? (
        <div className={styles.panel} role="tabpanel" id="fansub-panel-members" aria-labelledby="fansub-tab-members">
          {membersByRole.length === 0 ? (
            <p className={styles.empty}>Keine Mitglieder vorhanden.</p>
          ) : (
            membersByRole.map((bucket) => (
              <div key={bucket.role} className={styles.memberGroup}>
                <h3>{bucket.role}</h3>
                <ul>
                  {bucket.items.map((member) => (
                    <li key={member.id}>
                      <strong>{member.handle}</strong> - {formatYearRange(member.since_year, member.until_year)}
                      {member.notes ? ` - ${member.notes}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      ) : null}

      {activeTab === 'projects' ? (
        <div className={styles.panel} role="tabpanel" id="fansub-panel-projects" aria-labelledby="fansub-tab-projects">
          {projects.length === 0 ? <p className={styles.empty}>Keine Projektliste hinterlegt.</p> : null}
          {projectBucketOrder.map((bucket) => {
            const items = projectsByBucket[bucket]
            return (
              <div key={bucket} className={styles.projectGroup}>
                <h3>{projectBucketLabel[bucket]}</h3>
                {items.length === 0 ? (
                  <p className={styles.empty}>Keine Anime-Projekte in dieser Kategorie.</p>
                ) : (
                  <ul className={styles.projectList}>
                    {items.map((item) => (
                      <li key={item.id}>
                        <Link href={`/anime/${item.id}`}>{item.title}</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      ) : null}

      {activeTab === 'archive' ? (
        <div className={styles.panel} role="tabpanel" id="fansub-panel-archive" aria-labelledby="fansub-tab-archive">
          {group.website_url ? (
            <p className={styles.bodyText}>
              Externe Seite:{' '}
              <a href={group.website_url} target="_blank" rel="noreferrer" className={styles.externalLink}>
                {group.website_url}
              </a>
            </p>
          ) : (
            <p className={styles.empty}>Kein Archiv-Link hinterlegt.</p>
          )}
          {group.banner_url ? (
            <Image src={group.banner_url} alt="" className={styles.banner} width={760} height={240} unoptimized />
          ) : (
            <p className={styles.empty}>Keine Archiv-Screenshots vorhanden.</p>
          )}
        </div>
      ) : null}

      {activeTab === 'memories' ? (
        <div className={styles.panel} role="tabpanel" id="fansub-panel-memories" aria-labelledby="fansub-tab-memories">
          {group.history ? (
            <div className={styles.timelineEntry}>
              <p className={styles.timelineDate}>
                {group.founded_year || 'n/a'} - {group.dissolved_year || 'heute'}
              </p>
              <p className={styles.bodyText}>{group.history}</p>
            </div>
          ) : (
            <p className={styles.empty}>Keine Erinnerungen hinterlegt.</p>
          )}
        </div>
      ) : null}
    </section>
  )
}
