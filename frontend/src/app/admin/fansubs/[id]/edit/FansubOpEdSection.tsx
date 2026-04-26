'use client'

import { useEffect, useState } from 'react'

import { getAdminAnimeThemes, getAdminFansubAnime } from '@/lib/api'
import { AdminAnimeTheme, AdminFansubAnimeEntry } from '@/types/admin'

import sharedStyles from '../../../admin.module.css'
import opEdStyles from './FansubOpEdSection.module.css'
import { ReleaseThemeAssetsSection } from './ReleaseThemeAssetsSection'

const styles = { ...sharedStyles, ...opEdStyles }

interface FansubOpEdSectionProps {
  fansubID: number
  authToken: string | null
}

export function FansubOpEdSection({ fansubID, authToken }: FansubOpEdSectionProps) {
  const [animeList, setAnimeList] = useState<AdminFansubAnimeEntry[]>([])
  const [selectedAnimeID, setSelectedAnimeID] = useState<number | null>(null)
  const [themes, setThemes] = useState<AdminAnimeTheme[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authToken) {
      setLoading(false)
      return
    }

    let active = true
    getAdminFansubAnime(fansubID, authToken)
      .then((response) => {
        if (!active) return
        setAnimeList(response.data)
        setSelectedAnimeID(response.data[0]?.id ?? null)
      })
      .catch((nextError) => {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : 'Anime konnten nicht geladen werden.')
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [authToken, fansubID])

  useEffect(() => {
    if (!selectedAnimeID || !authToken) {
      setThemes([])
      return
    }

    getAdminAnimeThemes(selectedAnimeID, authToken)
      .then((response) => setThemes(response.data))
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : 'Themes konnten nicht geladen werden.'))
  }, [authToken, selectedAnimeID])

  return (
    <section className={styles.section}>
      <div>
        <h2 className={styles.title}>OP/ED Videos</h2>
        <p className={styles.fansubEditHint}>Anime auswaehlen, Theme setzen, Video hochladen. Der Release-Eintrag wird bei Bedarf automatisch angelegt.</p>
      </div>

      {loading ? <p className={styles.fansubEditHint}>Lade Anime...</p> : null}
      {error ? <p className={styles.errorBox}>{error}</p> : null}

      <label className={styles.animeSelect}>
        <span>Anime</span>
        <select
          className={styles.select}
          value={selectedAnimeID ?? ''}
          onChange={(event) => setSelectedAnimeID(event.target.value ? Number(event.target.value) : null)}
        >
          <option value="">{animeList.length === 0 ? 'Kein Anime verfuegbar' : 'Anime waehlen'}</option>
          {animeList.map((anime) => (
            <option key={anime.id} value={anime.id}>
              {anime.title}
            </option>
          ))}
        </select>
      </label>

      {selectedAnimeID ? (
        <ReleaseThemeAssetsSection
          fansubID={fansubID}
          animeID={selectedAnimeID}
          authToken={authToken}
          themes={themes}
        />
      ) : null}
    </section>
  )
}
