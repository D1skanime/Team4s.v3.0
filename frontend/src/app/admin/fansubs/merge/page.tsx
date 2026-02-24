'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getFansubList, mergeFansubsPreview, mergeFansubs, getRuntimeAuthToken } from '@/lib/api'
import { FansubGroup, MergeFansubsResult } from '@/types/fansub'
import styles from '../../admin.module.css'

export default function MergeFansubsPage() {
  const [authToken] = useState(() => getRuntimeAuthToken())
  const [groups, setGroups] = useState<FansubGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [targetID, setTargetID] = useState<number | null>(null)
  const [sourceIDs, setSourceIDs] = useState<Set<number>>(new Set())
  const [preview, setPreview] = useState<MergeFansubsResult | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [merging, setMerging] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadGroups()
  }, [])

  async function loadGroups() {
    try {
      setLoading(true)
      const response = await getFansubList({ per_page: 500 })
      setGroups(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Gruppen')
    } finally {
      setLoading(false)
    }
  }

  async function handlePreview() {
    if (!targetID || sourceIDs.size === 0) return

    try {
      setPreviewLoading(true)
      setError(null)
      const response = await mergeFansubsPreview(
        { target_id: targetID, source_ids: Array.from(sourceIDs) },
        authToken || undefined,
      )
      setPreview(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei der Vorschau')
      setPreview(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleMerge() {
    if (!targetID || sourceIDs.size === 0) return

    const confirmed = window.confirm(
      `Wirklich ${sourceIDs.size} Gruppe(n) in die Zielgruppe zusammenfuehren? Diese Aktion kann nicht rueckgaengig gemacht werden.`,
    )
    if (!confirmed) return

    try {
      setMerging(true)
      setError(null)
      const response = await mergeFansubs(
        { target_id: targetID, source_ids: Array.from(sourceIDs) },
        authToken || undefined,
      )
      setSuccess(
        `Erfolgreich zusammengefuehrt: ${response.data.merged_count} Gruppe(n), ` +
          `${response.data.versions_migrated} Versionen, ${response.data.members_migrated} Mitglieder. ` +
          `Aliases hinzugefuegt: ${response.data.aliases_added.join(', ') || 'keine'}`,
      )
      setPreview(null)
      setSourceIDs(new Set())
      void loadGroups()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Zusammenfuehren')
    } finally {
      setMerging(false)
    }
  }

  function toggleSource(id: number) {
    const newSet = new Set(sourceIDs)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSourceIDs(newSet)
    setPreview(null)
  }

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.slug.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const targetGroup = targetID ? groups.find((g) => g.id === targetID) : null
  const sourceGroups = groups.filter((g) => sourceIDs.has(g.id))

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.panel}>Lade Gruppen...</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <p className={styles.breadcrumb}>
        <Link href="/admin">Admin</Link> | <Link href="/admin/fansubs">Fansub Verwaltung</Link>
      </p>

      <h1>Fansub-Gruppen zusammenfuehren</h1>
      <p>Duplikate oder variante Tags zu einer Gruppe zusammenfuehren.</p>

      {error && <div className={styles.errorBox}>{error}</div>}
      {success && <div className={styles.successBox}>{success}</div>}

      <div className={styles.panel}>
        <h2>1. Zielgruppe waehlen</h2>
        <p>Die Gruppe, in die alle anderen zusammengefuehrt werden.</p>

        <div className={styles.field}>
          <label>Suche</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Name oder Slug..."
          />
        </div>

        <p className={styles.mergeHint}>
          {filteredGroups.length} Ergebnis(se) gefunden
        </p>
        <div className={styles.mergeTableWrap}>
          <table className={`${styles.episodeTable} ${styles.mergeTable}`}>
            <thead>
              <tr className={styles.episodeTableHeader}>
                <th className={styles.mergeColumnCheck}></th>
                <th className={styles.mergeColumnName}>Name</th>
                <th className={styles.mergeColumnSlug}>Slug</th>
                <th className={styles.mergeColumnType}>Typ</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map((g) => (
                <tr
                  key={g.id}
                  className={`${styles.episodeTableRow} ${
                    targetID === g.id
                      ? styles.mergeRowTarget
                      : sourceIDs.has(g.id)
                        ? styles.mergeRowSource
                        : ''
                  }`}
                  onClick={() => {
                    if (!sourceIDs.has(g.id)) {
                      setTargetID(g.id)
                      setPreview(null)
                    }
                  }}
                >
                  <td className={styles.mergeColumnCheck}>
                    <input
                      type="radio"
                      name="target"
                      checked={targetID === g.id}
                      disabled={sourceIDs.has(g.id)}
                      onChange={() => {
                        setTargetID(g.id)
                        setPreview(null)
                      }}
                    />
                  </td>
                  <td className={styles.mergeEllipsis} title={g.name}>
                    {g.name}
                  </td>
                  <td className={styles.mergeEllipsis} title={g.slug}>
                    {g.slug}
                  </td>
                  <td>{g.group_type === 'collaboration' ? 'Kollab.' : 'Gruppe'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {targetGroup && (
          <p className={styles.mergeSummary}>
            <strong>Ziel:</strong> {targetGroup.name} ({targetGroup.slug})
          </p>
        )}
      </div>

      <div className={styles.panel}>
        <h2>2. Quellgruppen waehlen</h2>
        <p>Diese Gruppen werden in die Zielgruppe zusammengefuehrt und danach geloescht.</p>

        <div className={styles.mergeTableWrap}>
          <table className={`${styles.episodeTable} ${styles.mergeTable}`}>
            <thead>
              <tr className={styles.episodeTableHeader}>
                <th className={styles.mergeColumnCheck}></th>
                <th className={styles.mergeColumnName}>Name</th>
                <th>Slug</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups
                .filter((g) => g.id !== targetID)
                .map((g) => (
                  <tr
                    key={g.id}
                    className={`${styles.episodeTableRow} ${sourceIDs.has(g.id) ? styles.mergeRowSource : ''}`}
                    onClick={() => toggleSource(g.id)}
                  >
                    <td className={styles.mergeColumnCheck}>
                      <input type="checkbox" checked={sourceIDs.has(g.id)} onChange={() => toggleSource(g.id)} />
                    </td>
                    <td className={styles.mergeEllipsis} title={g.name}>
                      {g.name}
                    </td>
                    <td className={styles.mergeEllipsis} title={g.slug}>
                      {g.slug}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {sourceGroups.length > 0 && (
          <p className={styles.mergeSummary}>
            <strong>Quellen ({sourceGroups.length}):</strong> {sourceGroups.map((g) => g.name).join(', ')}
          </p>
        )}
      </div>

      <div className={styles.panel}>
        <h2>3. Vorschau und Zusammenfuehren</h2>

        <div className={styles.mergePreviewActions}>
          <button
            className={styles.button}
            onClick={handlePreview}
            disabled={!targetID || sourceIDs.size === 0 || previewLoading}
          >
            {previewLoading ? 'Lade Vorschau...' : 'Vorschau anzeigen'}
          </button>
        </div>

        {preview && (
          <div className={styles.mergePreviewBox}>
            <h3>Vorschau</h3>
            <ul>
              <li>
                <strong>{preview.merged_count}</strong> Gruppe(n) werden geloescht
              </li>
              <li>
                <strong>{preview.versions_migrated}</strong> Episode-Versionen werden migriert
              </li>
              <li>
                <strong>{preview.members_migrated}</strong> Mitglieder werden migriert
              </li>
              <li>
                <strong>{preview.relations_migrated}</strong> Anime-Verknuepfungen werden migriert
              </li>
              <li>
                <strong>Aliases:</strong> {preview.aliases_added.join(', ') || 'keine'}
              </li>
            </ul>

            <button className={styles.button} onClick={handleMerge} disabled={merging}>
              {merging ? 'Fuehre zusammen...' : 'Jetzt zusammenfuehren'}
            </button>
          </div>
        )}
      </div>

      <div className={styles.mergeBackLink}>
        <Link href="/admin/fansubs">Zurueck zur Fansub-Verwaltung</Link>
      </div>
    </div>
  )
}
