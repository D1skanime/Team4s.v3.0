'use client'

import { useEffect, useState } from 'react'
import {
  getAdminFansubAnime,
  listAnimeContributions,
  listGroupMembers,
} from '@/lib/api'
import { AdminFansubAnimeEntry } from '@/types/admin'
import { AnimeContribution, HistFansubGroupMember } from '@/types/fansub'

import AnimeContributionModal from './AnimeContributionModal'

type Props = {
  fansubId: number
}

export default function AnimeContributionsTab({ fansubId }: Props) {
  const [animeList, setAnimeList] = useState<AdminFansubAnimeEntry[]>([])
  const [members, setMembers] = useState<HistFansubGroupMember[]>([])
  const [contributionCountByAnimeId, setContributionCountByAnimeId] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAnimeId, setModalAnimeId] = useState<number | null>(null)
  const [modalContributions, setModalContributions] = useState<AnimeContribution[]>([])
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [animeResp, membersResp] = await Promise.all([
          getAdminFansubAnime(fansubId),
          listGroupMembers(fansubId),
        ])
        const animes = animeResp.data ?? []
        if (!cancelled) {
          setAnimeList(animes)
          setMembers(membersResp.members ?? [])
        }

        // Beitragszähler für alle Anime laden
        const counts: Record<number, number> = {}
        await Promise.all(
          animes.map(async (anime) => {
            try {
              const resp = await listAnimeContributions(fansubId, anime.id)
              counts[anime.id] = (resp.contributions ?? []).length
            } catch {
              counts[anime.id] = 0
            }
          })
        )
        if (!cancelled) setContributionCountByAnimeId(counts)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [fansubId])

  async function openModal(animeId: number) {
    setModalLoading(true)
    try {
      const resp = await listAnimeContributions(fansubId, animeId)
      setModalContributions(resp.contributions ?? [])
      setModalAnimeId(animeId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mitwirkende konnten nicht geladen werden.')
      setModalContributions([])
    } finally {
      setModalLoading(false)
    }
  }

  async function handleSaved(animeId: number) {
    try {
      const resp = await listAnimeContributions(fansubId, animeId)
      setContributionCountByAnimeId((prev) => ({
        ...prev,
        [animeId]: (resp.contributions ?? []).length,
      }))
    } catch {
      // kein kritischer Fehler
    }
  }

  const modalAnime = animeList.find((a) => a.id === modalAnimeId)

  return (
    <div style={{ padding: '16px 0' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>
        Anime-Beiträge
      </h2>

      {loading && (
        <p style={{ color: '#6b7280', fontStyle: 'italic' }}>Wird geladen…</p>
      )}

      {!loading && error && (
        <p style={{ color: '#dc2626' }}>{error}</p>
      )}

      {!loading && !error && animeList.length === 0 && (
        <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
          Diese Gruppe hat noch keine Anime-Verknüpfungen.
        </p>
      )}

      {!loading && !error && animeList.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {animeList.map((anime) => {
            const count = contributionCountByAnimeId[anime.id]
            const countLabel =
              count === undefined
                ? '…'
                : count === 0
                ? '(keine Mitwirkenden eingetragen)'
                : `${count} Mitwirkende${count === 1 ? 'r' : ''}`

            return (
              <div
                key={anime.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  background: '#fafafa',
                  gap: 12,
                }}
              >
                <div>
                  <span style={{ fontWeight: 500 }}>{anime.title}</span>
                  <span
                    style={{
                      marginLeft: 10,
                      fontSize: '0.82rem',
                      color: count === 0 ? '#9ca3af' : '#6b7280',
                      fontStyle: count === 0 ? 'italic' : 'normal',
                    }}
                  >
                    {countLabel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openModal(anime.id)}
                  disabled={modalLoading && modalAnimeId === anime.id}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 5,
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Bearbeiten
                </button>
              </div>
            )
          })}
        </div>
      )}

      {modalAnimeId !== null && modalAnime && !modalLoading && (
        <AnimeContributionModal
          fansubId={fansubId}
          animeId={modalAnimeId}
          animeTitle={modalAnime.title}
          members={members}
          existingContributions={modalContributions}
          onClose={() => setModalAnimeId(null)}
          onSaved={() => handleSaved(modalAnimeId)}
        />
      )}
    </div>
  )
}
